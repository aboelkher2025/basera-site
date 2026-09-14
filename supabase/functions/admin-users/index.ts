import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Account management for the control panel. The browser can only reach
// auth.users through the service role, so this function holds that key
// and re-checks, on every call, that the caller is staff and is allowed
// to do the specific thing they asked for.
//
// Deploy: Supabase Dashboard -> Edge Functions -> Deploy new function ->
// name "admin-users", paste this file, keep "Verify JWT" on.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const STAFF = new Set(["admin", "super_admin"]);
const ADMIN_LEVEL = new Set(["admin", "super_admin"]);
const ROLES = new Set(["super_admin", "admin", "trainer", "client_admin", "learner", "partner"]);

type Body = {
  action?: string;
  id?: string;
  email?: string;
  password?: string;
  full_name?: string;
  role?: string;
  org_id?: string | null;
  department?: string | null;
  lang?: string;
  redirect_to?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Who is calling? Resolve the bearer token to a user with the anon client.
  const authHeader = req.headers.get("Authorization") ?? "";
  const asUser = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: uerr } = await asUser.auth.getUser();
  if (uerr || !user) return json({ error: "Not signed in" }, 401);

  const sb = createClient(url, service);
  const { data: actor } = await sb.from("profiles").select("id,role,email").eq("id", user.id).single();
  if (!actor || !STAFF.has(actor.role)) return json({ error: "Staff only" }, 403);
  const isSuper = actor.role === "super_admin";

  let body: Body;
  try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }

  const superCount = async () => {
    const { count } = await sb.from("profiles").select("id", { count: "exact", head: true }).eq("role", "super_admin");
    return count ?? 0;
  };
  const target = async (id?: string) => {
    if (!id) return null;
    const { data } = await sb.from("profiles").select("id,role,email,full_name").eq("id", id).single();
    return data;
  };

  switch (body.action) {
    case "create": {
      const email = (body.email ?? "").trim().toLowerCase();
      const role = body.role ?? "learner";
      const full_name = (body.full_name ?? "").trim() || email.split("@")[0];
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Enter a valid email" }, 400);
      if (!ROLES.has(role)) return json({ error: "Unknown role" }, 400);
      if (ADMIN_LEVEL.has(role) && !isSuper) return json({ error: "Only a super admin can create admin accounts" }, 403);

      const meta = { full_name, department: body.department ?? null, lang: body.lang ?? "en" };
      let uid: string;
      if (body.password) {
        if (body.password.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
        const { data, error } = await sb.auth.admin.createUser({
          email, password: body.password, email_confirm: true, user_metadata: meta,
        });
        if (error) return json({ error: error.message }, 400);
        uid = data.user.id;
      } else {
        const { data, error } = await sb.auth.admin.inviteUserByEmail(email, {
          data: meta, redirectTo: body.redirect_to,
        });
        if (error) return json({ error: error.message }, 400);
        uid = data.user.id;
      }
      // The on_auth_user_created trigger has already inserted the profile
      // row as a learner; now apply the role and company the admin chose.
      const { error: perr } = await sb.from("profiles").update({
        role, full_name, org_id: body.org_id || null, department: body.department || null,
      }).eq("id", uid);
      if (perr) return json({ error: perr.message }, 500);
      return json({ ok: true, id: uid, invited: !body.password });
    }

    case "delete": {
      const t = await target(body.id);
      if (!t) return json({ error: "Account not found" }, 404);
      if (t.id === actor.id) return json({ error: "You cannot delete your own account" }, 400);
      if (ADMIN_LEVEL.has(t.role) && !isSuper) return json({ error: "Only a super admin can remove an admin account" }, 403);
      if (t.role === "super_admin" && (await superCount()) <= 1) return json({ error: "Cannot delete the last super admin" }, 400);
      const { error } = await sb.auth.admin.deleteUser(t.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    case "set_password": {
      const t = await target(body.id);
      if (!t) return json({ error: "Account not found" }, 404);
      if (ADMIN_LEVEL.has(t.role) && !isSuper && t.id !== actor.id) {
        return json({ error: "Only a super admin can change an admin's password" }, 403);
      }
      if (!body.password || body.password.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
      const { error } = await sb.auth.admin.updateUserById(t.id, { password: body.password });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    case "reset_email": {
      const t = await target(body.id);
      if (!t || !t.email) return json({ error: "Account not found" }, 404);
      const { error } = await createClient(url, anon).auth.resetPasswordForEmail(t.email, {
        redirectTo: body.redirect_to,
      });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    default:
      return json({ error: "Unknown action" }, 400);
  }
});
