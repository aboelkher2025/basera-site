import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Basera career coach, answered by OpenRouter.
//
// Secret required: OPENROUTER_API_KEY (Dashboard -> Edge Functions -> Secrets).
// Optional: COACH_MODELS, a comma-separated override for the fallback chain.
//
// Only zero-cost models are ever used. Every id must end in ":free" - anything
// else is dropped before the call, so a typo or a paid id in COACH_MODELS can
// never quietly start spending. Free models rate-limit hard, so the chain is
// tried in order and the first usable answer wins.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// General chat models, strongest first. Domain-specific (finance, health),
// code and classifier models are deliberately left out.
const DEFAULT_MODELS = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "thinkingmachines/inkling:free",
  "nvidia/nemotron-3.5-lightning:free",
];

const freeOnly = (ids: string[]) => ids.map((m) => m.trim()).filter((m) => m.endsWith(":free"));

const models = (() => {
  const override = Deno.env.get("COACH_MODELS");
  const list = override ? freeOnly(override.split(",")) : freeOnly(DEFAULT_MODELS);
  return list.length ? list : freeOnly(DEFAULT_MODELS);
})();

// Small models wrap JSON in prose, code fences or <think> blocks. Pull the
// first balanced object out rather than trusting the whole string.
function extractJson(text: string): string | null {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/```(?:json)?/g, "");
  const start = cleaned.indexOf("{");
  if (start === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return cleaned.slice(start, i + 1);
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) return json({ error: "OPENROUTER_API_KEY not set" }, 500);

  let body: { messages?: { role: string; content: string }[]; lang?: string };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const messages = (body.messages ?? []).slice(-10);
  if (!messages.length) return json({ error: "no messages" }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: courses, error } = await sb
    .from("courses")
    .select("id,title_en,title_ar,level,domain,hours,price_sar,summary_en,keywords")
    .eq("is_published", true)
    .order("sort_order");
  if (error) return json({ error: error.message }, 500);

  const system = `You are Basera's (بصيرة) career coach for professionals in Saudi Arabia and the Gulf.
Recommend ONLY courses from this catalogue: ${JSON.stringify(courses)}.
Reply in the user's language (Arabic or English). Be warm, specific and short (under 120 words). Ask one clarifying question if the goal is unclear.
Never give legal, medical or financial advice. Return ONLY JSON, no markdown, no explanation before or after: {"reply": "...", "course_ids": ["id", ...]} with 1-3 ids ordered by fit, or [] if you are asking a question.`;

  const chat = [{ role: "system", content: system }, ...messages];

  let raw = "";
  let used = "";
  let lastStatus = 0;
  let lastDetail = "";

  for (const model of models) {
    let r: Response;
    try {
      r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://basera.sa",
          "X-Title": "Basera career coach",
        },
        body: JSON.stringify({ model, messages: chat, max_tokens: 800, temperature: 0.4 }),
      });
    } catch (e) {
      lastStatus = 0;
      lastDetail = String(e);
      continue;
    }

    if (!r.ok) {
      lastStatus = r.status;
      lastDetail = (await r.text()).slice(0, 300);
      // 429 rate limit, 402 out of free quota, 5xx upstream busy: try the next one.
      if (r.status === 429 || r.status === 402 || r.status >= 500) continue;
      // 400/401/403 are our fault, not the model's - stop and report.
      break;
    }

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    if (typeof text === "string" && text.trim()) {
      raw = text.trim();
      used = model;
      break;
    }
    lastStatus = 200;
    lastDetail = "empty completion";
  }

  if (!raw) {
    return json({ error: `openrouter unavailable (${lastStatus})`, detail: lastDetail }, 502);
  }

  let out: { reply: string; course_ids: string[] };
  const candidate = extractJson(raw);
  try {
    out = candidate ? JSON.parse(candidate) : { reply: raw, course_ids: [] };
  } catch {
    out = { reply: raw, course_ids: [] };
  }
  if (typeof out.reply !== "string" || !out.reply.trim()) out.reply = raw;

  const valid = new Set((courses ?? []).map((c: { id: string }) => c.id));
  out.course_ids = (Array.isArray(out.course_ids) ? out.course_ids : [])
    .filter((id) => typeof id === "string" && valid.has(id))
    .slice(0, 3);

  const last = messages[messages.length - 1];
  await sb.from("coach_logs").insert({
    user_message: last.content,
    reply: out.reply,
    course_ids: out.course_ids,
    lang: body.lang ?? null,
  });

  return json({ ...out, model: used });
});
