/* Basera control panel — core: session, REST, data, shell, modal/forms, tables.
   Views live in admin-views.js, reports in admin-reports.js, the table browser
   in admin-db.js. Everything runs with the signed-in user's own token, so
   row-level security decides what comes back; the page only decides what to show. */
window.BA = (function(){
  "use strict";

  var SB_URL = "https://brlhihishoilxyslwubj.supabase.co";
  var SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJybGhpaGlzaG9pbHh5c2x3dWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMDYyNzEsImV4cCI6MjEwNDg4MjI3MX0.xOcmd_ANs4wN7S5Cy7tTl5-St-iX73q_Ro5wRydaH4I";
  var SESSION_KEY = "basera_session";      // shared with learn.html
  var LANG_KEY    = "basera_admin_lang";
  var LOG_LIMIT   = 500;
  var PORTAL_URL  = location.href.replace(/admin\.html.*$/, "learn.html");

  var A = {};
  A.SB_URL = SB_URL;
  A.PORTAL_URL = PORTAL_URL;

  // ------------------------------------------------------------
  // Account types. Order here is the order of the strip in the top bar.
  // ------------------------------------------------------------
  var I = {
    crown:   '<path d="M3 17l2-10 5 5 2-7 2 7 5-5 2 10z"/><path d="M5 21h14"/>',
    shield:  '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    board:   '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8M8 12l3-3 2 2 3-4"/>',
    case_:   '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M3 12h18"/>',
    cap:     '<path d="M2 9l10-4 10 4-10 4z"/><path d="M6 11v4c0 1.5 3 3 6 3s6-1.5 6-3v-4M22 9v5"/>',
    link:    '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
    building:'<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/>'
  };
  A.icon = function(name){ return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (I[name] || "") + "</svg>"; };
  A.ROLES = [
    { id:"super_admin",  label:"Super admin",  icon:"crown",  pill:"super", desc:"Platform owner. Everything, including admin accounts." },
    { id:"admin",        label:"Admin",        icon:"shield", pill:"warn",  desc:"Basera staff. Everything except managing admins." },
    { id:"trainer",      label:"Trainer",      icon:"board",  pill:"",      desc:"Sees the courses assigned to them and their learners' progress." },
    { id:"client_admin", label:"Company lead", icon:"case_",  pill:"",      desc:"Manages their own company's learners." },
    { id:"learner",      label:"Learner",      icon:"cap",    pill:"mute",  desc:"Enrols, learns, earns certificates." },
    { id:"partner",      label:"Partner",      icon:"link",   pill:"mute",  desc:"External partner account." }
  ];
  A.roleById = {};
  A.ROLES.forEach(function(r){ A.roleById[r.id] = r; });
  A.STAFF = ["admin", "super_admin"];
  A.isStaffRole = function(r){ return A.STAFF.indexOf(r) >= 0; };
  A.isSuper = function(){ return !!(A.me && A.me.role === "super_admin"); };

  // ------------------------------------------------------------
  // Small helpers
  // ------------------------------------------------------------
  A.el  = function(id){ return document.getElementById(id); };
  A.esc = function(s){
    return String(s == null ? "" : s)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  };
  A.L = function(row, base){
    if (!row) return "";
    return row[base + "_" + A.CLANG] || row[base + "_en"] || row[base + "_ar"] || "";
  };
  A.date = function(s){
    if (!s) return "—";
    var d = new Date(s); if (isNaN(d.getTime())) return "—";
    return d.toISOString().slice(0,10);
  };
  A.when = function(s){
    if (!s) return "—";
    var d = new Date(s); if (isNaN(d.getTime())) return "—";
    return d.toISOString().slice(0,16).replace("T"," ");
  };
  A.month = function(s){ var d = new Date(s); return isNaN(d.getTime()) ? "" : d.toISOString().slice(0,7); };
  A.clip = function(s, n){ s = String(s == null ? "" : s); return s.length > n ? s.slice(0, n-1) + "…" : s; };
  A.num = function(n){ return Number(n || 0).toLocaleString("en-US"); };
  A.pct = function(a, b){ return b ? Math.round(a * 100 / b) : 0; };
  A.toast = function(msg, bad){
    var t = document.createElement("div");
    t.className = "toast" + (bad ? " bad" : "");
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function(){ t.remove(); }, bad ? 5000 : 2200);
  };
  A.code = function(len){
    var s = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", o = "";
    for (var i = 0; i < (len || 6); i++) o += s[Math.floor(Math.random() * s.length)];
    return o;
  };

  // ------------------------------------------------------------
  // Session + REST — mirrors learn.html so a sign-in carries across
  // ------------------------------------------------------------
  A.session = null;
  try { A.session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch(e){ A.session = null; }
  A.CLANG = localStorage.getItem(LANG_KEY) || "en";
  A.me = null;
  A.D = {};
  A.out = null;
  A.params = {};
  var sortState = {};

  function saveSession(s){
    A.session = s;
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  }
  function signedIn(){ return !!(A.session && A.session.access_token); }
  function authHeaders(){
    return {
      "apikey": SB_KEY,
      "Content-Type": "application/json",
      "Authorization": "Bearer " + (signedIn() ? A.session.access_token : SB_KEY)
    };
  }
  async function refreshSession(){
    if (!A.session || !A.session.refresh_token) return false;
    var r = await fetch(SB_URL + "/auth/v1/token?grant_type=refresh_token", {
      method:"POST", headers:{ "apikey":SB_KEY, "Content-Type":"application/json" },
      body: JSON.stringify({ refresh_token: A.session.refresh_token })
    });
    if (!r.ok) { saveSession(null); return false; }
    saveSession(await r.json());
    return true;
  }
  A.rest = async function(path, opts, retried){
    opts = opts || {};
    var r = await fetch(SB_URL + "/rest/v1/" + path, {
      method: opts.method || "GET",
      headers: Object.assign(authHeaders(), opts.headers || {}),
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
    });
    if (r.status === 401 && !retried && A.session) {
      if (await refreshSession()) return A.rest(path, opts, true);
      saveSession(null); A.render();
      throw new Error("Signed out");
    }
    if (!r.ok) {
      var detail = await r.text().catch(function(){ return ""; });
      var msg = detail;
      try { var j = JSON.parse(detail); msg = j.message || j.error || j.hint || detail; } catch(e){}
      var err = new Error(msg || ("HTTP " + r.status)); err.status = r.status; throw err;
    }
    if (r.status === 204) return null;
    return r.json().catch(function(){ return null; });
  };
  // Writes that should hand the row back.
  A.insert = function(table, body){ return A.rest(table, { method:"POST", headers:{ "Prefer":"return=representation" }, body: body }); };
  A.patch  = function(table, filter, body){ return A.rest(table + "?" + filter, { method:"PATCH", headers:{ "Prefer":"return=representation" }, body: body }); };
  A.remove = function(table, filter){ return A.rest(table + "?" + filter, { method:"DELETE" }); };
  A.q = encodeURIComponent;

  // Edge function call with the user's token.
  A.fn = async function(name, body){
    var r = await fetch(SB_URL + "/functions/v1/" + name, {
      method:"POST", headers: authHeaders(), body: JSON.stringify(body || {})
    });
    var data = await r.json().catch(function(){ return {}; });
    if (!r.ok) {
      var e = new Error(data.error || data.message || ("Function error " + r.status));
      e.status = r.status; throw e;
    }
    return data;
  };
  async function authCall(endpoint, body){
    var r = await fetch(SB_URL + "/auth/v1/" + endpoint, {
      method:"POST", headers:{ "apikey":SB_KEY, "Content-Type":"application/json" }, body: JSON.stringify(body)
    });
    var data = await r.json().catch(function(){ return {}; });
    if (!r.ok) throw new Error(data.error_description || data.msg || data.message || "Sign-in failed");
    return data;
  }
  function userId(){
    try {
      var p = A.session.access_token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/");
      var json = decodeURIComponent(atob(p).split("").map(function(c){
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(""));
      return JSON.parse(json).sub;
    } catch(e){ return ""; }
  }

  // ------------------------------------------------------------
  // Data — every table fetched flat and joined here. Small data,
  // and it avoids depending on PostgREST embedding.
  // ------------------------------------------------------------
  A.loadAll = async function(force){
    var D = A.D;
    if (D.loaded && !force) return;
    var r = await Promise.all([
      A.rest("profiles?select=*&order=created_at.desc"),
      A.rest("organizations?select=*&order=created_at.desc"),
      A.rest("courses?select=*&order=sort_order.asc"),
      A.rest("lessons?select=*&order=course_id.asc,sort_order.asc"),
      A.rest("enrollments?select=*&order=enrolled_at.desc"),
      A.rest("certificates?select=*&order=created_at.desc"),
      A.rest("leads?select=*&order=created_at.desc"),
      A.rest("coach_logs?select=*&order=created_at.desc&limit=" + LOG_LIMIT),
      A.rest("lesson_progress?select=*&order=completed_at.desc")
    ]);
    D.profiles = r[0] || []; D.orgs = r[1] || []; D.courses = r[2] || []; D.lessons = r[3] || [];
    D.enrols = r[4] || []; D.certs = r[5] || []; D.leads = r[6] || []; D.logs = r[7] || []; D.progress = r[8] || [];
    A.reindex();
    D.loaded = true;
  };
  A.reindex = function(){
    var D = A.D;
    D.orgById = index(D.orgs, "id"); D.courseById = index(D.courses, "id");
    D.profById = index(D.profiles, "id"); D.lessonById = index(D.lessons, "id");
    D.enrolById = index(D.enrols, "id");
    D.lessonsPerCourse = countBy(D.lessons, "course_id");
    D.enrolsPerCourse = countBy(D.enrols, "course_id");
    D.enrolsPerUser = countBy(D.enrols, "user_id");
    D.membersPerOrg = countBy(D.profiles, "org_id");
    D.progressPerEnrol = countBy(D.progress, "enrollment_id");
    D.roleCounts = countBy(D.profiles, "role");
  };
  function index(rows, key){ var m = {}; (rows||[]).forEach(function(r){ m[r[key]] = r; }); return m; }
  function countBy(rows, key){ var m = {}; (rows||[]).forEach(function(r){ var k = r[key]; if (k == null) return; m[k] = (m[k]||0)+1; }); return m; }
  A.countBy = countBy;
  A.personName = function(id){ var p = A.D.profById[id]; return p ? (p.full_name || p.email || String(id).slice(0,8)) : "—"; };
  A.courseTitle = function(id){ var c = A.D.courseById[id]; return c ? A.L(c, "title") : (id || "—"); };
  A.orgName = function(id){ var o = id && A.D.orgById[id]; return o ? o.name : ""; };
  A.lessonTitle = function(id){ var l = A.D.lessonById[id]; return l ? A.L(l, "title") : "—"; };
  A.reload = async function(){ await A.loadAll(true); A.render(); };

  // ------------------------------------------------------------
  // Tables: sortable, searchable, CSV, delegated row actions
  // ------------------------------------------------------------
  A.table = function(view, cols, rows, emptyMsg){
    var st = sortState[view];
    if (st) {
      var col = cols.filter(function(c){ return c.k === st.k; })[0];
      if (col) rows = rows.slice().sort(function(a,b){
        var x = col.val ? col.val(a) : a[col.k], y = col.val ? col.val(b) : b[col.k];
        if (x == null) x = ""; if (y == null) y = "";
        if (typeof x === "number" && typeof y === "number") return st.dir * (x - y);
        return st.dir * String(x).localeCompare(String(y), undefined, { numeric:true });
      });
    }
    if (!rows.length) return '<div class="empty">' + A.esc(emptyMsg || "Nothing here yet.") + "</div>";
    var head = cols.map(function(c){
      if (c.k === "_act") return "<th></th>";
      var arr = (st && st.k === c.k) ? (st.dir > 0 ? " ▲" : " ▼") : "";
      return '<th data-sort="' + A.esc(c.k) + '">' + A.esc(c.label) + '<span class="arr">' + arr + "</span></th>";
    }).join("");
    var body = rows.map(function(r){
      return "<tr>" + cols.map(function(c){
        return '<td class="' + (c.cls || "") + '">' + (c.cell ? c.cell(r) : A.esc(r[c.k])) + "</td>";
      }).join("") + "</tr>";
    }).join("");
    return '<div class="scroll"><table><thead><tr>' + head + "</tr></thead><tbody>" + body + "</tbody></table></div>";
  };
  A.wireSort = function(view, rerender){
    Array.prototype.forEach.call(A.out.querySelectorAll("th[data-sort]"), function(th){
      th.addEventListener("click", function(){
        var k = th.getAttribute("data-sort"), st = sortState[view];
        sortState[view] = (st && st.k === k) ? { k:k, dir:-st.dir } : { k:k, dir:1 };
        rerender();
      });
    });
  };
  // One delegated click handler per view render. Buttons carry
  // data-act and data-key; lookup(key) resolves the row.
  A.actions = function(map, lookup){
    var host = A.out;
    if (host._act) host.removeEventListener("click", host._act);
    host._act = function(ev){
      var b = ev.target.closest("[data-act]");
      if (!b || !host.contains(b)) return;
      var fn = map[b.getAttribute("data-act")];
      if (!fn) return;
      ev.preventDefault();
      fn(lookup ? lookup(b.getAttribute("data-key")) : b.getAttribute("data-key"), b);
    };
    host.addEventListener("click", host._act);
  };
  A.btn = function(act, key, label, cls){
    return '<button class="btn sm ' + (cls || "light") + '" data-act="' + act + '" data-key="' + A.esc(key) + '">' + A.esc(label) + "</button>";
  };
  A.csv = function(cols, rows){
    function cell(v){ v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g,'""') + '"' : v; }
    var use = cols.filter(function(c){ return c.k !== "_act"; });
    var lines = [use.map(function(c){ return cell(c.label); }).join(",")];
    rows.forEach(function(r){ lines.push(use.map(function(c){ return cell(c.val ? c.val(r) : (c.raw ? c.raw(r) : r[c.k])); }).join(",")); });
    return lines.join("\r\n");
  };
  A.download = function(name, text, type){
    var blob = new Blob(["﻿" + text], { type: type || "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
  };
  A.wireCsv = function(name, cols, rowsFn){
    var b = A.el("csv"); if (b) b.addEventListener("click", function(){ A.download(name, A.csv(cols, rowsFn())); });
  };
  A.filterRows = function(rows, q, fields){
    q = (q || "").trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(function(r){
      return fields.some(function(f){
        var v = typeof f === "function" ? f(r) : r[f];
        return String(v == null ? "" : v).toLowerCase().indexOf(q) !== -1;
      });
    });
  };
  A.pageHead = function(title, sub, right){
    return '<div class="bar" style="margin-bottom:6px"><div><h1>' + A.esc(title) + '</h1><p class="sub" style="margin:0">' + A.esc(sub) + "</p></div>" +
           '<div class="spacer"></div>' + (right || "") + "</div><div style=\"height:12px\"></div>";
  };
  A.searchBar = function(placeholder, withCsv, extraHtml){
    return '<div class="bar"><input type="search" id="q" placeholder="' + A.esc(placeholder) + '">' + (extraHtml || "") +
      '<div class="spacer"></div>' + (withCsv ? '<button class="btn light" id="csv">Export CSV</button>' : "") +
      '<button class="btn light" id="reload">Refresh</button></div>';
  };
  A.wireCommon = function(rerender){
    var q = A.el("q");
    if (q) q.addEventListener("input", function(){
      var v = q.value, pos = q.selectionStart;
      rerender();
      var q2 = A.el("q");
      if (q2) { q2.value = v; q2.focus(); try { q2.setSelectionRange(pos,pos); } catch(e){} }
    });
    var rl = A.el("reload");
    if (rl) rl.addEventListener("click", async function(){
      rl.disabled = true; rl.textContent = "Refreshing…";
      try { await A.reload(); A.toast("Refreshed"); }
      catch(e){ A.toast(e.message, true); rl.disabled = false; rl.textContent = "Refresh"; }
    });
  };
  A.qval = function(id){ var e = A.el(id); return e ? e.value : ""; };
  A.keepSelect = function(id, rerender){
    var s = A.el(id); if (!s) return;
    s.addEventListener("change", function(){ var v = s.value; rerender(); var s2 = A.el(id); if (s2) s2.value = v; });
  };

  // ------------------------------------------------------------
  // Display bits
  // ------------------------------------------------------------
  A.pill = function(text, cls){ return '<span class="pill ' + (cls || "") + '">' + A.esc(text) + "</span>"; };
  A.rolePill = function(role){ var m = A.roleById[role]; return A.pill(m ? m.label : role, m ? m.pill : "mute"); };
  A.statusPill = function(s){ return A.pill(s || "—", s === "completed" ? "ok" : s === "active" ? "" : "mute"); };
  A.progressCell = function(pct){
    var p = Math.max(0, Math.min(100, Number(pct) || 0));
    return '<div class="prog"><div class="track"><div class="fill' + (p >= 100 ? " done" : "") + '" style="width:' + p + '%"></div></div><b>' + p + "%</b></div>";
  };
  A.tile = function(n, label, accent){
    return '<div class="tile' + (accent ? " accent" : "") + '"><b>' + A.esc(n) + "</b><span>" + A.esc(label) + "</span></div>";
  };
  A.selectOptions = function(list, value, labelFn, valueFn, blank){
    var o = blank != null ? '<option value="">' + A.esc(blank) + "</option>" : "";
    list.forEach(function(x){
      var v = valueFn ? valueFn(x) : x.id;
      o += '<option value="' + A.esc(v) + '"' + (String(v) === String(value) ? " selected" : "") + ">" + A.esc(labelFn ? labelFn(x) : x.label) + "</option>";
    });
    return o;
  };

  // ------------------------------------------------------------
  // Modal, forms, confirm
  // ------------------------------------------------------------
  function openModal(html, wide){
    var ov = document.createElement("div");
    ov.className = "overlay";
    ov.innerHTML = '<div class="modal' + (wide ? " wide" : "") + '" role="dialog" aria-modal="true">' + html + "</div>";
    document.body.appendChild(ov);
    function close(){ ov.remove(); document.removeEventListener("keydown", esc); }
    function esc(e){ if (e.key === "Escape") { close(); if (ov._cancel) ov._cancel(); } }
    document.addEventListener("keydown", esc);
    ov.addEventListener("click", function(e){ if (e.target === ov) { close(); if (ov._cancel) ov._cancel(); } });
    ov.close = close;
    return ov;
  }
  // fields: { k, label, type, options:[{v,l}], required, hint, placeholder, value, rows, half, showIf(values) }
  // types: text email password number date textarea select checkbox json
  A.form = function(cfg){
    return new Promise(function(resolve){
      var values = Object.assign({}, cfg.values || {});
      var fieldsHtml = "";
      var half = false;
      cfg.fields.forEach(function(f){
        var v = values[f.k];
        var id = "ff_" + f.k;
        var req = f.required ? " <i>*</i>" : "";
        var inner = "";
        if (f.type === "select") {
          inner = '<select id="' + id + '">' + (f.options || []).map(function(o){
            return '<option value="' + A.esc(o.v) + '"' + (String(o.v) === String(v == null ? "" : v) ? " selected" : "") + ">" + A.esc(o.l) + "</option>";
          }).join("") + "</select>";
        } else if (f.type === "textarea" || f.type === "json") {
          var txt = f.type === "json" ? (v == null ? "" : (typeof v === "string" ? v : JSON.stringify(v, null, 2))) : (v == null ? "" : v);
          inner = '<textarea id="' + id + '" class="' + (f.type === "json" ? "code" : "") + '" rows="' + (f.rows || 4) + '" placeholder="' + A.esc(f.placeholder || "") + '">' + A.esc(txt) + "</textarea>";
        } else if (f.type === "checkbox") {
          inner = '<input type="checkbox" id="' + id + '"' + (v ? " checked" : "") + ">";
        } else {
          inner = '<input type="' + (f.type || "text") + '" id="' + id + '" value="' + A.esc(v == null ? "" : v) + '" placeholder="' + A.esc(f.placeholder || "") + '"' +
                  (f.type === "number" ? ' step="' + (f.step || 1) + '"' : "") + (f.autocomplete ? ' autocomplete="' + f.autocomplete + '"' : "") + ">";
        }
        var block = f.type === "checkbox"
          ? '<div class="f check" data-f="' + f.k + '">' + inner + '<label for="' + id + '">' + A.esc(f.label) + "</label>" + (f.hint ? '<div class="hint">' + A.esc(f.hint) + "</div>" : "") + "</div>"
          : '<div class="f" data-f="' + f.k + '"><label for="' + id + '">' + A.esc(f.label) + req + "</label>" + inner + (f.hint ? '<div class="hint">' + A.esc(f.hint) + "</div>" : "") + '<div class="ferr" hidden></div></div>';
        if (f.half && !half) { fieldsHtml += '<div class="frow">' + block; half = true; }
        else if (f.half && half) { fieldsHtml += block + "</div>"; half = false; }
        else { if (half) { fieldsHtml += "</div>"; half = false; } fieldsHtml += block; }
      });
      if (half) fieldsHtml += "</div>";

      var ov = openModal(
        "<header><h2>" + A.esc(cfg.title) + '</h2><button class="x" type="button" aria-label="Close">&times;</button></header>' +
        '<form class="body" id="mf">' + (cfg.intro ? '<p class="muted" style="margin:0 0 14px">' + A.esc(cfg.intro) + "</p>" : "") +
        '<div class="err" id="mferr" hidden></div>' + fieldsHtml + "</form>" +
        '<footer><button class="btn light" type="button" id="mfcancel">Cancel</button>' +
        '<button class="btn ' + (cfg.danger ? "danger" : "") + '" type="submit" form="mf" id="mfok">' + A.esc(cfg.submitLabel || "Save") + "</button></footer>",
        cfg.wide);
      ov._cancel = function(){ resolve(null); };
      ov.querySelector(".x").addEventListener("click", function(){ ov.close(); resolve(null); });
      ov.querySelector("#mfcancel").addEventListener("click", function(){ ov.close(); resolve(null); });

      function read(){
        var out = {};
        cfg.fields.forEach(function(f){
          var e = ov.querySelector("#ff_" + f.k); if (!e) return;
          if (f.type === "checkbox") out[f.k] = !!e.checked;
          else if (f.type === "number") out[f.k] = e.value === "" ? null : Number(e.value);
          else if (f.type === "json") out[f.k] = e.value;
          else out[f.k] = e.value;
        });
        return out;
      }
      function applyShowIf(){
        var vals = read();
        cfg.fields.forEach(function(f){
          if (!f.showIf) return;
          var el = ov.querySelector('[data-f="' + f.k + '"]'); if (el) el.hidden = !f.showIf(vals);
        });
      }
      applyShowIf();
      ov.querySelector("#mf").addEventListener("change", applyShowIf);
      ov.querySelector("#mf").addEventListener("input", applyShowIf);

      var first = ov.querySelector("input:not([type=checkbox]),select,textarea");
      if (first) setTimeout(function(){ first.focus(); }, 30);

      ov.querySelector("#mf").addEventListener("submit", async function(ev){
        ev.preventDefault();
        var vals = read(), bad = false;
        cfg.fields.forEach(function(f){
          var fe = ov.querySelector('[data-f="' + f.k + '"] .ferr'); if (fe) { fe.hidden = true; fe.textContent = ""; }
          var hidden = f.showIf && !f.showIf(vals);
          if (hidden) return;
          var v = vals[f.k];
          if (f.required && (v == null || v === "" || (f.type === "checkbox" && !v))) { bad = true; if (fe) { fe.hidden = false; fe.textContent = "Required"; } }
          if (f.type === "json" && v && v.trim()) {
            try { vals[f.k] = JSON.parse(v); } catch(e){ bad = true; if (fe) { fe.hidden = false; fe.textContent = "Not valid JSON: " + e.message; } }
          } else if (f.type === "json") vals[f.k] = null;
          if (!bad && f.validate) { var m = f.validate(vals[f.k], vals); if (m) { bad = true; if (fe) { fe.hidden = false; fe.textContent = m; } } }
        });
        if (bad) return;
        var ok = ov.querySelector("#mfok"), er = ov.querySelector("#mferr");
        ok.disabled = true; er.hidden = true;
        try {
          if (cfg.onSubmit) await cfg.onSubmit(vals);
          ov.close(); resolve(vals);
        } catch(e){
          er.hidden = false; er.textContent = e.message || String(e); ok.disabled = false;
        }
      });
    });
  };
  A.confirm = function(cfg){
    return new Promise(function(resolve){
      var ov = openModal(
        "<header><h2>" + A.esc(cfg.title || "Are you sure?") + "</h2></header>" +
        '<div class="body confirm"><p>' + A.esc(cfg.text || "") + "</p>" + (cfg.sub ? '<p class="sub muted">' + A.esc(cfg.sub) + "</p>" : "") + "</div>" +
        '<footer><button class="btn light" id="cno">Cancel</button><button class="btn ' + (cfg.danger ? "danger" : "") + '" id="cyes">' + A.esc(cfg.label || "Confirm") + "</button></footer>");
      ov._cancel = function(){ resolve(false); };
      ov.querySelector("#cno").addEventListener("click", function(){ ov.close(); resolve(false); });
      ov.querySelector("#cyes").addEventListener("click", function(){ ov.close(); resolve(true); });
      setTimeout(function(){ ov.querySelector("#cyes").focus(); }, 30);
    });
  };
  A.showJson = function(title, obj){
    openModal("<header><h2>" + A.esc(title) + '</h2><button class="x" type="button">&times;</button></header>' +
      '<div class="body"><pre style="margin:0;white-space:pre-wrap;font-size:12px">' + A.esc(JSON.stringify(obj, null, 2)) + "</pre></div>", true)
      .querySelector(".x").addEventListener("click", function(e){ e.target.closest(".overlay").remove(); });
  };

  // ------------------------------------------------------------
  // Gate, shell, router
  // ------------------------------------------------------------
  var root, who, outBtn, langBtn, pagesNav;
  function viewSignIn(msg){
    chrome(false);
    root.innerHTML =
      '<div class="gate"><div class="card"><h2>Control panel</h2><p>Sign in to see the pages your account can open.</p>' +
      (msg ? '<div class="err">' + A.esc(msg) + "</div>" : "") +
      '<form id="f"><label for="e">Email</label><input id="e" type="email" autocomplete="username" required>' +
      '<label for="p">Password</label><input id="p" type="password" autocomplete="current-password" required>' +
      '<button class="btn" type="submit" id="go">Sign in</button></form>' +
      '<div class="foot">Learners use <a href="learn.html">the portal</a>.</div></div></div>';
    A.el("f").addEventListener("submit", async function(ev){
      ev.preventDefault();
      var go = A.el("go"); go.disabled = true; go.textContent = "Signing in…";
      try {
        saveSession(await authCall("token?grant_type=password", { email: A.el("e").value.trim(), password: A.el("p").value }));
        A.me = null; A.D = {};
        await A.render();
      } catch(err){ viewSignIn(err.message || "Sign-in failed"); }
    });
  }
  // Reached only by an account type with no sections at all (learner,
  // partner). Everyone else lands on their own first page instead.
  function viewNoAccess(role){
    chrome(true);
    var m = A.roleById[role];
    root.innerHTML =
      '<div class="gate"><div class="card"><h2>Nothing to manage here</h2>' +
      "<p>You are signed in as <b>" + A.esc(m ? m.label : role || "unknown") + "</b>, which has no management pages. " +
      "Your learning lives in the portal.</p>" +
      '<a class="btn" href="learn.html">Go to the learning portal</a>' +
      '<div class="foot"><button class="linkish" id="so">Sign out</button></div></div></div>';
    A.el("so").addEventListener("click", A.signOut);
  }
  A.signOut = function(){ saveSession(null); A.me = null; A.D = {}; A.render(); };

  // Every section names the account types that may open it. The top nav
  // and the route guard are both built from this list, so a role cannot
  // reach a page by typing its hash. RLS still decides what the page can
  // actually read once it is open — this only controls what is offered.
  var STAFF_ONLY = ["super_admin", "admin"];
  A.ROUTES = [
    { id:"dashboard",    label:"Dashboard",     group:"Platform",  roles:STAFF_ONLY },
    { id:"reports",      label:"Reports",       group:"Platform",  roles:STAFF_ONLY },
    { id:"access",       label:"Users & access",group:"People",    roles:["super_admin"] },
    { id:"accounts",     label:"Accounts",      group:"People",    roles:STAFF_ONLY, count:function(D){ return D.profiles.length; } },
    { id:"companies",    label:"Companies",     group:"People",    roles:["super_admin","admin","client_admin"], count:function(D){ return D.orgs.length; } },
    { id:"courses",      label:"Courses",       group:"Catalogue", roles:["super_admin","admin","trainer"], count:function(D){ return D.courses.length; } },
    { id:"lessons",      label:"Lessons",       group:"Catalogue", roles:["super_admin","admin","trainer"], count:function(D){ return D.lessons.length; } },
    { id:"enrolments",   label:"Enrolments",    group:"Learning",  roles:["super_admin","admin","trainer","client_admin"], count:function(D){ return D.enrols.length; } },
    { id:"progress",     label:"Progress",      group:"Learning",  roles:["super_admin","admin","trainer","client_admin"], count:function(D){ return D.progress.length; } },
    { id:"certificates", label:"Certificates",  group:"Learning",  roles:["super_admin","admin","client_admin"], count:function(D){ return D.certs.length; } },
    { id:"leads",        label:"Leads",         group:"Marketing", roles:STAFF_ONLY, count:function(D){ return D.leads.length; } },
    { id:"coach",        label:"Career coach",  group:"Marketing", roles:STAFF_ONLY, count:function(D){ return D.logs.length; } },
    { id:"database",     label:"Database",      group:"System",    roles:STAFF_ONLY }
  ];
  A.routeById = {};
  A.ROUTES.forEach(function(r){ A.routeById[r.id] = r; });
  A.routesFor = function(role){
    return A.ROUTES.filter(function(r){ return r.roles.indexOf(role) >= 0; });
  };
  A.allowedRoutes = function(){ return A.routesFor(A.me && A.me.role); };
  A.views = {};
  A.go = function(id, params){
    var qs = params ? "?" + Object.keys(params).map(function(k){ return k + "=" + encodeURIComponent(params[k]); }).join("&") : "";
    location.hash = "#/" + id + qs;
  };
  function current(){
    var h = (location.hash || "").replace(/^#\/?/, "");
    var parts = h.split("?"), id = parts[0];
    A.params = {};
    (parts[1] || "").split("&").forEach(function(kv){ if (!kv) return; var p = kv.split("="); A.params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ""); });
    // Only ever resolve to a section this account may open, so a stale or
    // hand-typed hash falls back to their first page instead of erroring.
    var allowed = A.allowedRoutes();
    return allowed.filter(function(r){ return r.id === id; })[0] || allowed[0] || null;
  }
  function shell(){
    root.innerHTML = '<div class="shell"><main id="main"></main></div>';
  }
  // The page nav lives in the top bar and lists exactly the sections this
  // account may open — "as per my account", nothing more.
  function topNav(route){
    var html = "";
    A.allowedRoutes().forEach(function(r){
      var n = r.count ? r.count(A.D) : null;
      html += '<a href="#/' + r.id + '"' + (route && r.id === route.id ? ' class="sel"' : "") +
              ' title="' + A.esc(r.group) + '">' + A.esc(r.label) +
              (n === null ? "" : '<b class="n">' + n + "</b>") + "</a>";
    });
    html += '<span class="sep"></span>' +
            '<a href="learn.html" class="out">Portal</a>' +
            '<a href="index.html" class="out">Site</a>';
    pagesNav.innerHTML = html;
  }
  // Account-type chips with live counts. Used by the Accounts and
  // Users &amp; access pages now that the top bar carries the page nav.
  A.roleStrip = function(selRole, hrefFor){
    var D = A.D, html = '<div class="roles">';
    A.ROLES.forEach(function(r){
      var n = D.roleCounts ? (D.roleCounts[r.id] || 0) : 0;
      var cls = "rchip" + (A.me && A.me.role === r.id ? " me" : "") + (selRole === r.id ? " sel" : "");
      var href = hrefFor ? hrefFor(r.id) : ("#/accounts?role=" + r.id);
      html += '<a class="' + cls + '" href="' + A.esc(href) + '" title="' + A.esc(r.label + " — " + r.desc) + '">' +
              A.icon(r.icon) + "<b>" + n + "</b><span>" + A.esc(r.label) + "</span></a>";
    });
    return html + "</div>";
  };
  function chrome(showOut){
    var m = A.me && A.roleById[A.me.role];
    who.innerHTML = A.me
      ? A.esc(A.me.email || "") + (m ? ' <span class="whorole">' + A.esc(m.label) + "</span>" : "")
      : "";
    outBtn.hidden = !showOut;
    langBtn.classList.toggle("on", A.CLANG === "ar");
    langBtn.textContent = A.CLANG === "en" ? "عربي" : "EN";
    if (!showOut) pagesNav.innerHTML = "";
  }

  A.render = async function(){
    A.out = root;
    if (!signedIn()) { A.me = null; viewSignIn(); return; }
    root.innerHTML = '<div class="loading"><span class="spin"></span></div>';
    try {
      if (!A.me) {
        var rows = await A.rest("profiles?select=*&id=eq." + A.q(userId()));
        A.me = (rows || [])[0] || null;
      }
    } catch(e){
      chrome(false);
      root.innerHTML = '<div class="gate"><div class="card"><h2>Could not load your profile</h2><div class="err">' + A.esc(e.message) + '</div><button class="btn" id="so">Sign out</button></div></div>';
      A.el("so").addEventListener("click", A.signOut);
      return;
    }
    if (!A.me) { viewSignIn("No profile row found for this account."); return; }
    if (!A.allowedRoutes().length) { viewNoAccess(A.me.role); return; }
    chrome(true);
    // Trainers and company leads read the shared views but cannot write to
    // them — RLS would reject it — so the actions are not offered at all.
    document.body.classList.toggle("readonly", !A.isStaffRole(A.me.role));
    try { await A.loadAll(false); }
    catch(e){ root.innerHTML = '<div class="gate"><div class="err">' + A.esc(e.message) + "</div></div>"; return; }
    var route = current();
    shell();
    topNav(route);
    A.out = A.el("main");
    var fn = A.views[route.id];
    if (fn) { try { fn(); } catch(e){ A.out.innerHTML = '<div class="err">' + A.esc(e.stack || e.message) + "</div>"; } }
    else A.out.innerHTML = '<div class="empty">No view registered for ' + A.esc(route.id) + "</div>";
  };

  A.start = function(){
    root = A.el("root"); who = A.el("who"); outBtn = A.el("outBtn"); langBtn = A.el("langBtn"); pagesNav = A.el("pages");
    outBtn.addEventListener("click", A.signOut);
    langBtn.addEventListener("click", function(){
      A.CLANG = A.CLANG === "en" ? "ar" : "en";
      localStorage.setItem(LANG_KEY, A.CLANG);
      A.render();
    });
    window.addEventListener("hashchange", A.render);
    A.render();
  };
  return A;
})();
