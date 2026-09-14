/* Basera control panel — views: dashboard, accounts, companies, courses,
   lessons, enrolments, progress, certificates, leads, coach. */
(function(A){
  "use strict";
  var esc = A.esc, D = function(){ return A.D; };

  // ------------------------------------------------------------
  // Charts — plain SVG, one hue per chart, hover tooltip, table view.
  // ------------------------------------------------------------
  function niceMax(m){
    if (m <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(m))), f = m / p;
    var n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return n * p;
  }
  function tableView(items, fmt){
    return '<details class="tbl"><summary>View as table</summary><table><thead><tr><th>Label</th><th class="num">Value</th></tr></thead><tbody>' +
      items.map(function(i){ return "<tr><td>" + esc(i.label) + '</td><td class="num">' + esc(fmt(i.value)) + "</td></tr>"; }).join("") +
      "</tbody></table></details>";
  }
  function hoverWire(host, items, fmt){
    var tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true; host.appendChild(tip);
    host.addEventListener("mousemove", function(e){
      var t = e.target.closest("[data-i]");
      if (!t) { tip.hidden = true; return; }
      var it = items[Number(t.getAttribute("data-i"))];
      tip.innerHTML = "<b>" + esc(it.label) + "</b>" + esc(fmt(it.value)) + (it.extra ? '<br><span style="opacity:.75">' + esc(it.extra) + "</span>" : "");
      var r = host.getBoundingClientRect();
      tip.style.left = (e.clientX - r.left) + "px"; tip.style.top = (e.clientY - r.top - 8) + "px";
      tip.hidden = false;
      Array.prototype.forEach.call(host.querySelectorAll("rect.m.on"), function(x){ x.classList.remove("on"); });
      var m = host.querySelector('rect.m[data-i="' + t.getAttribute("data-i") + '"]'); if (m) m.classList.add("on");
    });
    host.addEventListener("mouseleave", function(){ tip.hidden = true; Array.prototype.forEach.call(host.querySelectorAll("rect.m.on"), function(x){ x.classList.remove("on"); }); });
  }
  A.chart = {
    columns: function(host, cfg){
      var items = cfg.items, fmt = cfg.fmt || A.num, color = cfg.color || "var(--chart-1)";
      if (!items.length) { host.innerHTML = '<div class="empty">No data yet.</div>'; return; }
      var W = 600, H = 220, L = 38, R = 8, T = 16, B = 30, n = items.length;
      var max = niceMax(Math.max.apply(null, items.map(function(i){ return i.value; })));
      var iw = (W - L - R) / n, bw = Math.max(4, iw * 0.62);
      var maxIdx = 0; items.forEach(function(i, k){ if (i.value > items[maxIdx].value) maxIdx = k; });
      var s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(cfg.label || "") + '">';
      [0, .5, 1].forEach(function(g){
        var y = T + (H - T - B) * (1 - g);
        s += '<line class="' + (g === 0 ? "ax" : "gl") + '" x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/>';
        s += '<text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + esc(fmt(max * g)) + "</text>";
      });
      items.forEach(function(it, k){
        var x = L + iw * k + (iw - bw) / 2, h = (H - T - B) * (it.value / max), y = H - B - h;
        s += '<rect class="hit" data-i="' + k + '" x="' + (L + iw * k) + '" y="' + T + '" width="' + iw + '" height="' + (H - T - B) + '"/>';
        if (it.value > 0) s += '<rect class="m" data-i="' + k + '" x="' + x + '" y="' + y + '" width="' + bw + '" height="' + h + '" rx="3" fill="' + color + '"/>';
        if (k === maxIdx && it.value > 0) s += '<text class="v" x="' + (x + bw / 2) + '" y="' + (y - 5) + '" text-anchor="middle">' + esc(fmt(it.value)) + "</text>";
        var lbl = n > 14 && k % 2 ? "" : it.label;
        s += '<text x="' + (x + bw / 2) + '" y="' + (H - B + 16) + '" text-anchor="middle">' + esc(lbl) + "</text>";
      });
      s += "</svg>";
      host.innerHTML = '<div class="chart">' + s + "</div>" + tableView(items, fmt);
      hoverWire(host.querySelector(".chart"), items, fmt);
    },
    hbars: function(host, cfg){
      var items = cfg.items, fmt = cfg.fmt || A.num, color = cfg.color || "var(--chart-1)";
      if (!items.length) { host.innerHTML = '<div class="empty">No data yet.</div>'; return; }
      var W = 600, rowH = 26, L = 190, R = 60, T = 6, n = items.length, H = T + n * rowH + 6;
      var max = cfg.max || niceMax(Math.max.apply(null, items.map(function(i){ return i.value; })));
      var s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(cfg.label || "") + '">';
      s += '<line class="ax" x1="' + L + '" x2="' + L + '" y1="' + T + '" y2="' + (H - 6) + '"/>';
      items.forEach(function(it, k){
        var y = T + k * rowH, w = (W - L - R) * (it.value / max), bh = rowH - 8;
        s += '<rect class="hit" data-i="' + k + '" x="0" y="' + y + '" width="' + W + '" height="' + rowH + '"/>';
        s += '<text x="' + (L - 8) + '" y="' + (y + rowH / 2 + 4) + '" text-anchor="end">' + esc(A.clip(it.label, 30)) + "</text>";
        if (it.value > 0) s += '<rect class="m" data-i="' + k + '" x="' + L + '" y="' + (y + 4) + '" width="' + Math.max(2, w) + '" height="' + bh + '" rx="3" fill="' + color + '"/>';
        s += '<text class="v" x="' + (L + Math.max(2, w) + 6) + '" y="' + (y + rowH / 2 + 4) + '">' + esc(fmt(it.value)) + "</text>";
      });
      s += "</svg>";
      host.innerHTML = '<div class="chart">' + s + "</div>" + tableView(items, fmt);
      hoverWire(host.querySelector(".chart"), items, fmt);
    }
  };
  function lastMonths(n){
    var out = [], d = new Date(); d.setDate(1);
    for (var i = n - 1; i >= 0; i--) { var x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(x.toISOString().slice(0,7)); }
    return out;
  }
  function byMonth(rows, key, months){
    var m = {}; rows.forEach(function(r){ var k = A.month(r[key]); if (k) m[k] = (m[k]||0)+1; });
    return months.map(function(mo){ return { label: mo.slice(5) + "/" + mo.slice(2,4), value: m[mo] || 0, extra: mo }; });
  }
  var pctFmt = function(v){ return Math.round(v) + "%"; };

  // Delegated <select> changes, same pattern as A.actions.
  function changes(map, lookup){
    var host = A.out;
    if (host._chg) host.removeEventListener("change", host._chg);
    host._chg = function(ev){
      var s = ev.target.closest("[data-chg]"); if (!s || !host.contains(s)) return;
      var fn = map[s.getAttribute("data-chg")]; if (fn) fn(lookup ? lookup(s.getAttribute("data-key")) : s.getAttribute("data-key"), s);
    };
    host.addEventListener("change", host._chg);
  }
  function miniSelect(chg, key, options, value){
    return '<select class="mini" data-chg="' + chg + '" data-key="' + esc(key) + '">' + options.map(function(o){
      return '<option value="' + esc(o.v) + '"' + (String(o.v) === String(value) ? " selected" : "") + ">" + esc(o.l) + "</option>";
    }).join("") + "</select>";
  }
  async function guarded(fn, okMsg){
    try { await fn(); if (okMsg) A.toast(okMsg); }
    catch(e){ A.toast(e.message, true); throw e; }
  }
  function roleOptions(includeAdmin){
    return A.ROLES.filter(function(r){ return includeAdmin || !A.isStaffRole(r.id); }).map(function(r){ return { v:r.id, l:r.label }; });
  }
  function orgOptions(){ return [{ v:"", l:"— No company" }].concat(D().orgs.map(function(o){ return { v:o.id, l:o.name }; })); }
  function personOptions(filter){
    return D().profiles.filter(filter || function(){ return true; }).map(function(p){ return { v:p.id, l:(p.full_name || "") + " (" + (p.email || "") + ")" }; });
  }
  function courseOptions(filter){
    return D().courses.filter(filter || function(){ return true; }).map(function(c){ return { v:c.id, l:A.L(c,"title") + " [" + c.id + "]" }; });
  }
  var DOMAINS = [["hr","HR"],["lead","Leadership"],["sales","Sales"],["data","Data"],["auto","Automation"],["fin","Finance"]].map(function(x){ return { v:x[0], l:x[1] }; });
  var LEVELS  = [["b","Beginner"],["i","Intermediate"],["a","Advanced"]].map(function(x){ return { v:x[0], l:x[1] }; });
  var FORMATS = [["live","Live online"],["self","Self-paced"],["site","On site"]].map(function(x){ return { v:x[0], l:x[1] }; });
  var LEAD_STATUSES = ["new","contacted","qualified","won","lost"].map(function(s){ return { v:s, l:s }; });
  var KINDS = ["text","video","pdf","quiz"].map(function(s){ return { v:s, l:s }; });
  var QUIZ_TEMPLATE = [{ q_en:"Question?", q_ar:"سؤال؟", options_en:["Option A","Option B","Option C"], options_ar:["الخيار أ","الخيار ب","الخيار ج"], answer:0 }];
  function validateQuiz(q){
    if (q == null) return "Quiz lessons need at least one question";
    if (!Array.isArray(q) || !q.length) return "Quiz must be a JSON array with at least one question";
    for (var i = 0; i < q.length; i++) {
      var x = q[i];
      if (!x || typeof x.q_en !== "string" || !Array.isArray(x.options_en) || x.options_en.length < 2) return "Question " + (i+1) + ": needs q_en and at least two options_en";
      if (typeof x.answer !== "number" || x.answer < 0 || x.answer >= x.options_en.length) return "Question " + (i+1) + ": answer must be an option index (0-based)";
      if (x.options_ar && x.options_ar.length !== x.options_en.length) return "Question " + (i+1) + ": options_ar must match options_en in length";
    }
    return null;
  }

  // ------------------------------------------------------------
  // Dashboard
  // ------------------------------------------------------------
  A.views.dashboard = function(){
    var d = D(), out = A.out;
    var completed = d.enrols.filter(function(e){ return e.status === "completed"; }).length;
    var active = d.enrols.length - completed;
    var avg = d.enrols.length ? Math.round(d.enrols.reduce(function(s,e){ return s + (Number(e.progress_pct)||0); },0) / d.enrols.length) : 0;
    var validCerts = d.certs.filter(function(c){ return c.is_valid; }).length;
    var newLeads = d.leads.filter(function(l){ return l.status === "new"; }).length;
    var staff = (d.roleCounts.admin||0) + (d.roleCounts.super_admin||0);

    var html = A.pageHead("Dashboard", "Everything on the platform, as of right now.");
    html += '<div id="setup"></div>';
    html += '<div class="tiles">' +
      A.tile(d.profiles.length, "Accounts", true) + A.tile(d.roleCounts.learner||0, "Learners") + A.tile(staff, "Staff") +
      A.tile(d.roleCounts.trainer||0, "Trainers") + A.tile(d.orgs.length, "Companies") + A.tile(d.courses.length, "Courses") +
      A.tile(d.lessons.length, "Lessons") + A.tile(d.enrols.length, "Enrolments") + A.tile(active, "In progress") +
      A.tile(completed, "Completed") + A.tile(avg + "%", "Avg progress") + A.tile(validCerts, "Certificates") +
      A.tile(d.leads.length, "Leads") + A.tile(newLeads, "New leads") + A.tile(d.logs.length, "Coach chats") + "</div>";
    html += '<div class="grid2">' +
      '<div class="panel"><h3>New accounts by month</h3><div class="pad" id="c1"></div></div>' +
      '<div class="panel"><h3>Enrolments by month</h3><div class="pad" id="c2"></div></div>' +
      '<div class="panel"><h3>Completion rate by course</h3><div class="pad" id="c3"></div></div>' +
      '<div class="panel"><h3>Lead funnel</h3><div class="pad" id="c4"></div></div>' +
      '<div class="panel"><h3>Learners by company</h3><div class="pad" id="c5"></div></div>' +
      '<div class="panel"><h3>Enrolment status</h3><div class="pad" id="c6"></div></div>' +
      "</div>";
    var recent = d.profiles.slice(0, 8);
    html += '<div class="panel"><h3>Newest accounts</h3>' + (recent.length ? '<div class="scroll"><table><tbody>' + recent.map(function(p){
      return "<tr><td>" + esc(p.full_name || "—") + '</td><td class="muted">' + esc(p.email || "") + "</td><td>" + A.rolePill(p.role) + '</td><td class="muted">' + esc(A.orgName(p.org_id) || "—") + '</td><td class="num muted">' + A.date(p.created_at) + "</td></tr>";
    }).join("") + "</tbody></table></div>" : '<div class="empty">No one has signed up yet.</div>') + "</div>";
    var done = d.enrols.filter(function(e){ return e.completed_at; }).slice(0, 8);
    html += '<div class="panel"><h3>Recent completions</h3>' + (done.length ? '<div class="scroll"><table><tbody>' + done.map(function(e){
      return "<tr><td>" + esc(A.personName(e.user_id)) + "</td><td>" + esc(A.courseTitle(e.course_id)) + '</td><td class="num">' + (e.score == null ? "—" : e.score + "%") + '</td><td class="num muted">' + A.date(e.completed_at) + "</td></tr>";
    }).join("") + "</tbody></table></div>" : '<div class="empty">No completions yet.</div>') + "</div>";
    out.innerHTML = html;

    var months = lastMonths(12);
    A.chart.columns(A.el("c1"), { items: byMonth(d.profiles, "created_at", months), label:"New accounts by month" });
    A.chart.columns(A.el("c2"), { items: byMonth(d.enrols, "enrolled_at", months), label:"Enrolments by month" });
    var top = d.courses.map(function(c){
      var n = d.enrolsPerCourse[c.id] || 0, k = d.enrols.filter(function(e){ return e.course_id === c.id && e.status === "completed"; }).length;
      return { label: A.L(c,"title"), value: A.pct(k, n), extra: k + " of " + n + " enrolments", n: n };
    }).filter(function(x){ return x.n > 0; }).sort(function(a,b){ return b.n - a.n; }).slice(0, 10);
    A.chart.hbars(A.el("c3"), { items: top, fmt: pctFmt, max: 100, label:"Completion rate by course" });
    var lc = A.countBy(d.leads, "status");
    A.chart.hbars(A.el("c4"), { items: ["new","contacted","qualified","won","lost"].map(function(s){ return { label:s, value: lc[s] || 0 }; }), color:"var(--chart-2)", label:"Lead funnel" });
    var orgs = d.orgs.map(function(o){ return { label:o.name, value: d.membersPerOrg[o.id] || 0 }; }).sort(function(a,b){ return b.value - a.value; }).slice(0, 8);
    var noOrg = d.profiles.filter(function(p){ return !p.org_id; }).length; if (noOrg) orgs.push({ label:"No company", value:noOrg });
    A.chart.hbars(A.el("c5"), { items: orgs, label:"Learners by company" });
    A.chart.hbars(A.el("c6"), { items: [{ label:"Active", value:active }, { label:"Completed", value:completed }], label:"Enrolment status" });
    checkSetup();
  };
  async function checkSetup(){
    var host = A.el("setup"); if (!host) return;
    var notes = [];
    try { await A.rest("rpc/is_super", { method:"POST", body:{} }); }
    catch(e){ if (e.status === 404) notes.push("The database migration for super admin, trainer and the account guards has not been applied yet. Roles beyond admin / company lead / learner will be rejected until it is."); }
    try { var r = await fetch(A.SB_URL + "/functions/v1/admin-users", { method:"OPTIONS" }); if (!r.ok) throw new Error(); }
    catch(e){ notes.push("The admin-users function is not deployed. Creating and deleting accounts from this panel needs it; editing roles and details still works."); }
    if (notes.length && A.el("setup")) A.el("setup").innerHTML = '<div class="note"><b>Setup pending.</b> ' + notes.map(esc).join(" ") + "</div>";
  }

  // ------------------------------------------------------------
  // Accounts
  // ------------------------------------------------------------
  A.views.accounts = function(){
    var d = D(), me = A.me;
    var canAdmin = A.isSuper();
    var cols = [
      { k:"full_name", label:"Name", val:function(r){ return r.full_name || ""; }, cell:function(r){ return esc(r.full_name || "—") + (r.id === me.id ? ' <span class="pill super">you</span>' : ""); } },
      { k:"email", label:"Email", cls:"muted", cell:function(r){ return esc(r.email || "—"); } },
      { k:"role", label:"Type", cell:function(r){ return A.rolePill(r.role); } },
      { k:"org", label:"Company", val:function(r){ return A.orgName(r.org_id); }, cell:function(r){ return esc(A.orgName(r.org_id) || "—"); } },
      { k:"department", label:"Department", cls:"muted", cell:function(r){ return esc(r.department || "—"); } },
      { k:"enrols", label:"Enrolments", cls:"num", val:function(r){ return d.enrolsPerUser[r.id] || 0; }, cell:function(r){ return String(d.enrolsPerUser[r.id] || 0); } },
      { k:"lang", label:"Lang", cls:"muted" },
      { k:"created_at", label:"Joined", cls:"num muted", cell:function(r){ return A.date(r.created_at); } },
      { k:"_act", label:"", cls:"act", cell:function(r){
          var s = A.btn("edit", r.id, "Edit") + A.btn("pw", r.id, "Password");
          if (r.id !== me.id && (canAdmin || !A.isStaffRole(r.role))) s += A.btn("del", r.id, "Delete", "danger");
          return s; } }
    ];
    function rows(){
      var list = d.profiles, role = A.qval("role") || A.params.role || "", org = A.qval("org");
      if (role) list = list.filter(function(p){ return p.role === role; });
      if (org) list = list.filter(function(p){ return org === "none" ? !p.org_id : p.org_id === org; });
      return A.filterRows(list, A.qval("q"), ["full_name","email","role","department", function(r){ return A.orgName(r.org_id); }]);
    }
    function paint(){
      var roleSel = '<select id="role">' + A.selectOptions([{ id:"", label:"All types" }].concat(A.ROLES), A.params.role || "", function(r){ return r.label; }) + "</select>";
      var orgSel = '<select id="org"><option value="">All companies</option><option value="none">No company</option>' + d.orgs.map(function(o){ return '<option value="' + esc(o.id) + '">' + esc(o.name) + "</option>"; }).join("") + "</select>";
      A.out.innerHTML = A.pageHead("Accounts", d.profiles.length + " accounts across " + A.ROLES.length + " types.", '<button class="btn accent" id="add">+ New account</button>') +
        A.searchBar("Search name, email, department, company…", true, roleSel + orgSel) +
        '<div class="panel">' + A.table("accounts", cols, rows(), "No accounts match.") + "</div>";
      A.wireCommon(repaint); A.wireSort("accounts", repaint); A.wireCsv("basera-accounts.csv", cols, rows);
      A.keepSelect("role", function(){ A.params.role = A.qval("role"); repaint(); });
      A.keepSelect("org", repaint);
      A.el("add").addEventListener("click", createAccount);
      A.actions({ edit: editAccount, pw: passwordDialog, del: deleteAccount }, function(k){ return d.profById[k]; });
    }
    function repaint(){ var r = A.qval("role"), o = A.qval("org"), q = A.qval("q"); paint(); if (A.el("role")) A.el("role").value = r; if (A.el("org")) A.el("org").value = o; if (A.el("q")) A.el("q").value = q; }
    paint();
    if (A.el("role")) A.el("role").value = A.params.role || "";

    async function createAccount(){
      await A.form({
        title:"New account", submitLabel:"Create account",
        intro:"With a password the account is ready immediately. Without one, an invitation email is sent and the person sets their own.",
        fields:[
          { k:"full_name", label:"Full name", required:true, half:true },
          { k:"email", label:"Email", type:"email", required:true, half:true, autocomplete:"off" },
          { k:"role", label:"Account type", type:"select", options: roleOptions(canAdmin), value:"learner", half:true },
          { k:"org_id", label:"Company", type:"select", options: orgOptions(), half:true },
          { k:"department", label:"Department", half:true },
          { k:"lang", label:"Language", type:"select", options:[{ v:"en", l:"English" },{ v:"ar", l:"Arabic" }], half:true },
          { k:"password", label:"Initial password", type:"password", autocomplete:"new-password", hint:"Optional. Leave empty to send an invitation email instead. Minimum 8 characters.", validate:function(v){ return v && v.length < 8 ? "At least 8 characters" : null; } }
        ],
        onSubmit: async function(v){
          v.action = "create"; v.redirect_to = A.PORTAL_URL;
          var r = await A.fn("admin-users", v);
          A.toast(r.invited ? "Invitation sent to " + v.email : "Account created");
          await A.reload();
        }
      });
    }
    async function editAccount(p){
      var roleLocked = !canAdmin && (A.isStaffRole(p.role)) || p.id === me.id;
      var fields = [
        { k:"full_name", label:"Full name", required:true },
        { k:"email", label:"Email", type:"email", hint:"Changing the sign-in email is done from Supabase Auth; this only updates the profile." },
        roleLocked ? { k:"role_ro", label:"Account type", type:"text", value: A.roleById[p.role] ? A.roleById[p.role].label : p.role, hint: p.id === me.id ? "You cannot change your own type here." : "Only a super admin can change admin accounts." }
                   : { k:"role", label:"Account type", type:"select", options: roleOptions(canAdmin) },
        { k:"org_id", label:"Company", type:"select", options: orgOptions() },
        { k:"department", label:"Department", half:true },
        { k:"lang", label:"Language", type:"select", options:[{ v:"en", l:"English" },{ v:"ar", l:"Arabic" }], half:true }
      ];
      await A.form({
        title:"Edit " + (p.full_name || p.email), fields: fields, values: { full_name:p.full_name, email:p.email, role:p.role, org_id:p.org_id || "", department:p.department || "", lang:p.lang || "en" },
        onSubmit: async function(v){
          var body = { full_name:v.full_name, email:v.email, org_id:v.org_id || null, department:v.department || null, lang:v.lang };
          if (!roleLocked) body.role = v.role;
          await A.patch("profiles", "id=eq." + A.q(p.id), body);
          await A.reload(); A.toast("Saved");
        }
      });
    }
    async function passwordDialog(p){
      await A.form({
        title:"Password for " + (p.full_name || p.email), submitLabel:"Apply",
        fields:[
          { k:"method", label:"How", type:"select", options:[{ v:"email", l:"Send a password-reset email" },{ v:"set", l:"Set a temporary password now" }], value:"email" },
          { k:"password", label:"Temporary password", type:"password", autocomplete:"new-password", showIf:function(v){ return v.method === "set"; }, required:true, hint:"Tell the person to change it after signing in. Minimum 8 characters.", validate:function(v){ return v && v.length < 8 ? "At least 8 characters" : null; } }
        ],
        onSubmit: async function(v){
          if (v.method === "email") { await A.fn("admin-users", { action:"reset_email", id:p.id, redirect_to: A.PORTAL_URL }); A.toast("Reset email sent to " + p.email); }
          else { await A.fn("admin-users", { action:"set_password", id:p.id, password:v.password }); A.toast("Password updated"); }
        }
      });
    }
    async function deleteAccount(p){
      if (!await A.confirm({ title:"Delete account?", text:(p.full_name || p.email) + " will be removed, together with their enrolments and progress.", sub:"Certificates they earned stay on record with no owner.", label:"Delete account", danger:true })) return;
      await guarded(async function(){ await A.fn("admin-users", { action:"delete", id:p.id }); await A.reload(); }, "Account deleted");
    }
  };

  // ------------------------------------------------------------
  // Companies
  // ------------------------------------------------------------
  A.views.companies = function(){
    var d = D();
    var enrolsPerOrg = A.countBy(d.enrols, "org_id");
    var cols = [
      { k:"name", label:"Company" },
      { k:"type", label:"Type", cell:function(r){ return A.pill(r.type, r.type === "platform" ? "warn" : ""); } },
      { k:"join_code", label:"Join code", cls:"mono", cell:function(r){ return esc(r.join_code || "—"); } },
      { k:"members", label:"Members", cls:"num", val:function(r){ return d.membersPerOrg[r.id] || 0; }, cell:function(r){ return String(d.membersPerOrg[r.id] || 0); } },
      { k:"leads", label:"Company leads", cls:"num", val:function(r){ return d.profiles.filter(function(p){ return p.org_id === r.id && p.role === "client_admin"; }).length; }, cell:function(r){ return String(d.profiles.filter(function(p){ return p.org_id === r.id && p.role === "client_admin"; }).length); } },
      { k:"enrols", label:"Enrolments", cls:"num", val:function(r){ return enrolsPerOrg[r.id] || 0; }, cell:function(r){ return String(enrolsPerOrg[r.id] || 0); } },
      { k:"created_at", label:"Created", cls:"num muted", cell:function(r){ return A.date(r.created_at); } },
      { k:"_act", label:"", cls:"act", cell:function(r){ return A.btn("members", r.id, "Members") + A.btn("edit", r.id, "Edit") + A.btn("del", r.id, "Delete", "danger"); } }
    ];
    function rows(){ return A.filterRows(d.orgs, A.qval("q"), ["name","type","join_code"]); }
    function paint(){
      A.out.innerHTML = A.pageHead("Companies", "Client organizations. A learner joins one with its code at sign-up, or you assign them from Accounts.", '<button class="btn accent" id="add">+ New company</button>') +
        A.searchBar("Search name, type, join code…", true) + '<div class="panel">' + A.table("orgs", cols, rows(), "No companies yet.") + "</div>";
      A.wireCommon(paint); A.wireSort("orgs", paint); A.wireCsv("basera-companies.csv", cols, rows);
      A.el("add").addEventListener("click", function(){ orgForm(null); });
      A.actions({ edit: orgForm, del: delOrg, members: function(o){ A.go("accounts", { org:o.id }); } }, function(k){ return d.orgById[k]; });
    }
    paint();
    async function orgForm(o){
      await A.form({
        title: o ? "Edit " + o.name : "New company", submitLabel: o ? "Save" : "Create",
        fields:[
          { k:"name", label:"Name", required:true },
          { k:"type", label:"Type", type:"select", options:[{ v:"client", l:"Client" },{ v:"partner", l:"Partner" },{ v:"platform", l:"Platform (Basera)" }], half:true },
          { k:"join_code", label:"Join code", half:true, hint:"Letters and digits. People enter this at sign-up.", validate:function(v){ return v && !/^[A-Z0-9]{3,20}$/i.test(v) ? "3–20 letters or digits" : null; } }
        ],
        values: o ? { name:o.name, type:o.type, join_code:o.join_code || "" } : { type:"client", join_code:A.code(6) },
        onSubmit: async function(v){
          var body = { name:v.name.trim(), type:v.type, join_code: v.join_code ? v.join_code.toUpperCase() : null };
          if (o) await A.patch("organizations", "id=eq." + A.q(o.id), body); else await A.insert("organizations", body);
          await A.reload(); A.toast(o ? "Saved" : "Company created");
        }
      });
    }
    async function delOrg(o){
      var n = d.membersPerOrg[o.id] || 0;
      if (!await A.confirm({ title:"Delete " + o.name + "?", text: n ? n + " account(s) are linked to it. They keep their accounts but lose the company link." : "No accounts are linked to it.", label:"Delete company", danger:true })) return;
      await guarded(async function(){ await A.remove("organizations", "id=eq." + A.q(o.id)); await A.reload(); }, "Company deleted");
    }
  };

  // ------------------------------------------------------------
  // Courses
  // ------------------------------------------------------------
  A.views.courses = function(){
    var d = D();
    var trainers = d.profiles.filter(function(p){ return p.role === "trainer" || p.role === "partner"; });
    var cols = [
      { k:"title", label:"Course", val:function(r){ return A.L(r,"title"); }, cell:function(r){ return esc(A.L(r,"title")) + '<div class="muted" style="font-size:11px">' + esc(r.id) + "</div>"; } },
      { k:"domain", label:"Domain", cls:"muted" }, { k:"level", label:"Level", cls:"muted" }, { k:"format", label:"Format", cls:"muted" },
      { k:"hours", label:"Hours", cls:"num" },
      { k:"price_sar", label:"SAR", cls:"num", cell:function(r){ return A.num(r.price_sar); } },
      { k:"lessons", label:"Lessons", cls:"num", val:function(r){ return d.lessonsPerCourse[r.id] || 0; }, cell:function(r){ return String(d.lessonsPerCourse[r.id] || 0); } },
      { k:"enrols", label:"Enrolments", cls:"num", val:function(r){ return d.enrolsPerCourse[r.id] || 0; }, cell:function(r){ return String(d.enrolsPerCourse[r.id] || 0); } },
      { k:"trainer", label:"Trainer", val:function(r){ return r.trainer_id ? A.personName(r.trainer_id) : ""; }, cell:function(r){ return r.trainer_id ? esc(A.personName(r.trainer_id)) : '<span class="muted">—</span>'; } },
      { k:"has_certificate", label:"Cert", val:function(r){ return r.has_certificate ? 1 : 0; }, cell:function(r){ return r.has_certificate ? A.pill("yes","ok") : A.pill("no","mute"); } },
      { k:"is_published", label:"Visible", val:function(r){ return r.is_published ? 1 : 0; }, cell:function(r){ return miniSelect("pub", r.id, [{ v:"1", l:"live" },{ v:"0", l:"hidden" }], r.is_published ? "1" : "0"); } },
      { k:"_act", label:"", cls:"act", cell:function(r){ return A.btn("lessons", r.id, "Lessons") + A.btn("edit", r.id, "Edit") + A.btn("del", r.id, "Delete", "danger"); } }
    ];
    function rows(){ return A.filterRows(d.courses, A.qval("q"), ["id","domain","level","format","keywords", function(r){ return A.L(r,"title"); }]); }
    function paint(){
      A.out.innerHTML = A.pageHead("Courses", "The catalogue. Hidden courses disappear from the public site and the learner catalogue.", '<button class="btn accent" id="add">+ New course</button>') +
        A.searchBar("Search title, id, domain, keywords…", true) + '<div class="panel">' + A.table("courses", cols, rows(), "No courses.") + "</div>";
      A.wireCommon(paint); A.wireSort("courses", paint); A.wireCsv("basera-courses.csv", cols, rows);
      A.el("add").addEventListener("click", function(){ courseForm(null); });
      A.actions({ edit: courseForm, del: delCourse, lessons: function(c){ A.go("lessons", { course:c.id }); } }, function(k){ return d.courseById[k]; });
      changes({ pub: async function(c, sel){
        var next = sel.value === "1"; sel.disabled = true;
        try { await A.patch("courses", "id=eq." + A.q(c.id), { is_published:next }); c.is_published = next; A.toast(next ? "Course is live" : "Course hidden"); }
        catch(e){ sel.value = c.is_published ? "1" : "0"; A.toast(e.message, true); }
        sel.disabled = false;
      } }, function(k){ return d.courseById[k]; });
    }
    paint();
    async function courseForm(c){
      var fields = [
        c ? null : { k:"id", label:"Course id", required:true, hint:"Short slug, e.g. hr-201. Cannot be changed later.", validate:function(v){ return /^[a-z0-9][a-z0-9-]{1,30}$/.test(v) ? (d.courseById[v] ? "That id already exists" : null) : "Lowercase letters, digits and dashes"; } },
        { k:"title_en", label:"Title (EN)", required:true, half:true }, { k:"title_ar", label:"Title (AR)", required:true, half:true },
        { k:"summary_en", label:"Summary (EN)", type:"textarea", rows:3, required:true }, { k:"summary_ar", label:"Summary (AR)", type:"textarea", rows:3, required:true },
        { k:"domain", label:"Domain", type:"select", options:DOMAINS, half:true }, { k:"level", label:"Level", type:"select", options:LEVELS, half:true },
        { k:"format", label:"Format", type:"select", options:FORMATS, half:true }, { k:"hours", label:"Hours", type:"number", required:true, half:true },
        { k:"price_sar", label:"Price (SAR)", type:"number", required:true, half:true }, { k:"sort_order", label:"Sort order", type:"number", half:true },
        { k:"trainer_id", label:"Trainer", type:"select", options:[{ v:"", l:"— Unassigned" }].concat(trainers.map(function(p){ return { v:p.id, l:(p.full_name || p.email) }; })), hint: trainers.length ? "" : "Create an account with type Trainer to assign one." },
        { k:"keywords", label:"Keywords", hint:"Space-separated, used by search and the career coach." },
        { k:"has_certificate", label:"Issues a certificate on completion", type:"checkbox" },
        { k:"is_published", label:"Visible on the public site", type:"checkbox" }
      ].filter(Boolean);
      await A.form({
        title: c ? "Edit " + A.L(c,"title") : "New course", submitLabel: c ? "Save" : "Create course", wide:true, fields:fields,
        values: c ? Object.assign({}, c, { trainer_id:c.trainer_id || "" }) : { domain:"hr", level:"b", format:"live", hours:8, price_sar:0, sort_order:(d.courses.length + 1) * 10, has_certificate:true, is_published:false, keywords:"" },
        onSubmit: async function(v){
          var body = { title_en:v.title_en, title_ar:v.title_ar, summary_en:v.summary_en, summary_ar:v.summary_ar, domain:v.domain, level:v.level, format:v.format,
                       hours:v.hours, price_sar:v.price_sar, sort_order:v.sort_order == null ? 0 : v.sort_order, keywords:v.keywords || "", has_certificate:!!v.has_certificate, is_published:!!v.is_published };
          if ("trainer_id" in v) body.trainer_id = v.trainer_id || null;
          try {
            if (c) await A.patch("courses", "id=eq." + A.q(c.id), body); else { body.id = v.id; await A.insert("courses", body); }
          } catch(e){
            if (/trainer_id/.test(e.message)) { delete body.trainer_id; if (c) await A.patch("courses", "id=eq." + A.q(c.id), body); else await A.insert("courses", body); A.toast("Saved without trainer: the migration adding trainers is not applied yet", true); }
            else throw e;
          }
          await A.reload(); A.toast(c ? "Saved" : "Course created");
        }
      });
    }
    async function delCourse(c){
      var n = d.enrolsPerCourse[c.id] || 0, l = d.lessonsPerCourse[c.id] || 0;
      if (!await A.confirm({ title:"Delete " + A.L(c,"title") + "?", text:"This removes its " + l + " lesson(s) and " + n + " enrolment(s), including all progress. Certificates already issued stay on record.", sub:"If you just want it off the site, set it to hidden instead.", label:"Delete course", danger:true })) return;
      await guarded(async function(){ await A.remove("courses", "id=eq." + A.q(c.id)); await A.reload(); }, "Course deleted");
    }
  };

  // ------------------------------------------------------------
  // Lessons
  // ------------------------------------------------------------
  A.views.lessons = function(){
    var d = D();
    var courseId = A.params.course || (d.courses[0] ? d.courses[0].id : "");
    var cols = [
      { k:"sort_order", label:"#", cls:"num" },
      { k:"title", label:"Lesson", val:function(r){ return A.L(r,"title"); }, cell:function(r){ return esc(A.L(r,"title")); } },
      { k:"kind", label:"Kind", cell:function(r){ return A.pill(r.kind, r.kind === "quiz" ? "warn" : ""); } },
      { k:"duration_min", label:"Min", cls:"num" },
      { k:"q", label:"Questions", cls:"num", val:function(r){ return Array.isArray(r.quiz) ? r.quiz.length : 0; }, cell:function(r){ return Array.isArray(r.quiz) ? String(r.quiz.length) : '<span class="muted">—</span>'; } },
      { k:"done", label:"Completions", cls:"num", val:function(r){ return d.progress.filter(function(p){ return p.lesson_id === r.id; }).length; }, cell:function(r){ return String(d.progress.filter(function(p){ return p.lesson_id === r.id; }).length); } },
      { k:"_act", label:"", cls:"act", cell:function(r){ return A.btn("edit", r.id, "Edit") + A.btn("del", r.id, "Delete", "danger"); } }
    ];
    function rows(){ return A.filterRows(d.lessons.filter(function(l){ return l.course_id === courseId; }), A.qval("q"), ["kind", function(r){ return A.L(r,"title"); }]); }
    function paint(){
      var sel = '<select id="course">' + A.selectOptions(d.courses, courseId, function(c){ return A.L(c,"title") + " [" + c.id + "]"; }) + "</select>";
      var c = d.courseById[courseId];
      A.out.innerHTML = A.pageHead("Lessons", c ? A.L(c,"title") + " — " + (d.lessonsPerCourse[courseId] || 0) + " lessons in order." : "Pick a course.", '<button class="btn accent" id="add"' + (c ? "" : " disabled") + ">+ New lesson</button>") +
        A.searchBar("Search lessons…", true, sel) + '<div class="panel">' + A.table("lessons", cols, rows(), "This course has no lessons yet.") + "</div>";
      A.wireCommon(paint); A.wireSort("lessons", paint); A.wireCsv("basera-lessons-" + courseId + ".csv", cols, rows);
      A.el("course").addEventListener("change", function(){ A.go("lessons", { course:A.el("course").value }); });
      A.el("add").addEventListener("click", function(){ lessonForm(null); });
      A.actions({ edit: lessonForm, del: delLesson }, function(k){ return d.lessonById[k]; });
    }
    paint();
    async function lessonForm(l){
      var mine = d.lessons.filter(function(x){ return x.course_id === courseId; });
      var nextSort = mine.length ? Math.max.apply(null, mine.map(function(x){ return x.sort_order || 0; })) + 10 : 10;
      await A.form({
        title: l ? "Edit lesson" : "New lesson", submitLabel: l ? "Save" : "Create lesson", wide:true,
        fields:[
          { k:"title_en", label:"Title (EN)", required:true, half:true }, { k:"title_ar", label:"Title (AR)", required:true, half:true },
          { k:"kind", label:"Kind", type:"select", options:KINDS, half:true }, { k:"sort_order", label:"Order", type:"number", half:true },
          { k:"duration_min", label:"Duration (minutes)", type:"number", required:true, half:true },
          { k:"media_url", label:"Media URL", showIf:function(v){ return v.kind === "video" || v.kind === "pdf"; }, hint:"Video embed link or PDF URL.", half:true },
          { k:"body_en", label:"Body (EN)", type:"textarea", rows:6, hint:"Blank line between paragraphs.", showIf:function(v){ return v.kind !== "quiz"; } },
          { k:"body_ar", label:"Body (AR)", type:"textarea", rows:6, showIf:function(v){ return v.kind !== "quiz"; } },
          { k:"quiz", label:"Quiz (JSON)", type:"json", rows:12, showIf:function(v){ return v.kind === "quiz"; }, hint:'Array of { q_en, q_ar, options_en[], options_ar[], answer } where answer is the 0-based index of the correct option. Pass mark is 70%.', validate:function(v, all){ return all.kind === "quiz" ? validateQuiz(v) : null; } }
        ],
        values: l ? Object.assign({}, l) : { kind:"text", sort_order:nextSort, duration_min:15, quiz:QUIZ_TEMPLATE },
        onSubmit: async function(v){
          var body = { course_id:courseId, title_en:v.title_en, title_ar:v.title_ar, kind:v.kind, sort_order:v.sort_order == null ? nextSort : v.sort_order, duration_min:v.duration_min,
                       media_url:v.media_url || null, body_en:v.kind === "quiz" ? null : (v.body_en || null), body_ar:v.kind === "quiz" ? null : (v.body_ar || null), quiz:v.kind === "quiz" ? v.quiz : null };
          if (l) await A.patch("lessons", "id=eq." + A.q(l.id), body); else await A.insert("lessons", body);
          await A.reload(); A.toast(l ? "Saved" : "Lesson created");
        }
      });
    }
    async function delLesson(l){
      var n = d.progress.filter(function(p){ return p.lesson_id === l.id; }).length;
      if (!await A.confirm({ title:"Delete lesson?", text:'"' + A.L(l,"title") + '" will be removed' + (n ? ", and " + n + " completion record(s) with it. Enrolment progress is recalculated." : "."), label:"Delete lesson", danger:true })) return;
      await guarded(async function(){ await A.remove("lessons", "id=eq." + A.q(l.id)); await A.reload(); }, "Lesson deleted");
    }
  };

  // ------------------------------------------------------------
  // Enrolments
  // ------------------------------------------------------------
  A.views.enrolments = function(){
    var d = D();
    var cols = [
      { k:"learner", label:"Learner", val:function(r){ return A.personName(r.user_id); }, cell:function(r){ return esc(A.personName(r.user_id)); } },
      { k:"course", label:"Course", val:function(r){ return A.courseTitle(r.course_id); }, cell:function(r){ return esc(A.courseTitle(r.course_id)); } },
      { k:"org", label:"Company", cls:"muted", val:function(r){ return A.orgName(r.org_id); }, cell:function(r){ return esc(A.orgName(r.org_id) || "—"); } },
      { k:"status", label:"Status", cell:function(r){ return A.statusPill(r.status); } },
      { k:"progress_pct", label:"Progress", val:function(r){ return Number(r.progress_pct) || 0; }, cell:function(r){ return A.progressCell(r.progress_pct); } },
      { k:"score", label:"Score", cls:"num", val:function(r){ return r.score == null ? -1 : r.score; }, cell:function(r){ return r.score == null ? '<span class="muted">—</span>' : r.score + "%"; } },
      { k:"enrolled_at", label:"Enrolled", cls:"num muted", cell:function(r){ return A.date(r.enrolled_at); } },
      { k:"completed_at", label:"Completed", cls:"num muted", cell:function(r){ return A.date(r.completed_at); } },
      { k:"_act", label:"", cls:"act", cell:function(r){ return A.btn("prog", r.id, "Progress") + A.btn("reset", r.id, "Reset") + A.btn("del", r.id, "Remove", "danger"); } }
    ];
    function rows(){
      var list = d.enrols, st = A.qval("st"), co = A.qval("co"), og = A.qval("og");
      if (st) list = list.filter(function(e){ return e.status === st; });
      if (co) list = list.filter(function(e){ return e.course_id === co; });
      if (og) list = list.filter(function(e){ return og === "none" ? !e.org_id : e.org_id === og; });
      return A.filterRows(list, A.qval("q"), [function(r){ return A.personName(r.user_id); }, function(r){ return A.courseTitle(r.course_id); }, "status"]);
    }
    function paint(){
      var f = '<select id="st"><option value="">All statuses</option><option value="active">Active</option><option value="completed">Completed</option></select>' +
              '<select id="co"><option value="">All courses</option>' + d.courses.map(function(c){ return '<option value="' + esc(c.id) + '">' + esc(A.L(c,"title")) + "</option>"; }).join("") + "</select>" +
              '<select id="og"><option value="">All companies</option><option value="none">No company</option>' + d.orgs.map(function(o){ return '<option value="' + esc(o.id) + '">' + esc(o.name) + "</option>"; }).join("") + "</select>";
      A.out.innerHTML = A.pageHead("Enrolments", "Progress, status and completion are computed by the database as lessons are completed.", '<button class="btn accent" id="add">+ Enrol someone</button>') +
        A.searchBar("Search learner or course…", true, f) + '<div class="panel">' + A.table("enrols", cols, rows(), "No enrolments match.") + "</div>";
      A.wireCommon(repaint); A.wireSort("enrols", repaint); A.wireCsv("basera-enrolments.csv", cols, rows);
      ["st","co","og"].forEach(function(id){ A.keepSelect(id, repaint); });
      A.el("add").addEventListener("click", addEnrol);
      A.actions({ prog:function(e){ A.go("progress", { enrol:e.id }); }, reset: resetProgress, del: delEnrol }, function(k){ return d.enrolById[k]; });
    }
    function repaint(){ var s = { st:A.qval("st"), co:A.qval("co"), og:A.qval("og"), q:A.qval("q") }; paint(); Object.keys(s).forEach(function(k){ if (A.el(k)) A.el(k).value = s[k]; }); }
    paint();
    async function addEnrol(){
      await A.form({
        title:"Enrol someone", submitLabel:"Enrol",
        fields:[
          { k:"user_id", label:"Learner", type:"select", options: personOptions(), required:true },
          { k:"course_id", label:"Course", type:"select", options: courseOptions(), required:true }
        ],
        onSubmit: async function(v){
          if (d.enrols.some(function(e){ return e.user_id === v.user_id && e.course_id === v.course_id; })) throw new Error("Already enrolled in that course");
          await A.insert("enrollments", { user_id:v.user_id, course_id:v.course_id, assigned_by:A.me.id });
          await A.reload(); A.toast("Enrolled");
        }
      });
    }
    async function resetProgress(e){
      var n = d.progressPerEnrol[e.id] || 0;
      if (!n) { A.toast("No progress to reset"); return; }
      if (!await A.confirm({ title:"Reset progress?", text:A.personName(e.user_id) + " goes back to 0% on " + A.courseTitle(e.course_id) + ". " + n + " completion record(s) are removed.", sub:"A certificate already issued is not withdrawn; revoke it from Certificates if needed.", label:"Reset", danger:true })) return;
      await guarded(async function(){ await A.remove("lesson_progress", "enrollment_id=eq." + A.q(e.id)); await A.reload(); }, "Progress reset");
    }
    async function delEnrol(e){
      if (!await A.confirm({ title:"Remove enrolment?", text:A.personName(e.user_id) + " is removed from " + A.courseTitle(e.course_id) + ", with all progress.", label:"Remove", danger:true })) return;
      await guarded(async function(){ await A.remove("enrollments", "id=eq." + A.q(e.id)); await A.reload(); }, "Enrolment removed");
    }
  };

  // ------------------------------------------------------------
  // Progress
  // ------------------------------------------------------------
  A.views.progress = function(){
    var d = D();
    var enrolId = A.params.enrol || "";
    var e = d.enrolById[enrolId];
    function paint(){
      var sel = '<select id="en"><option value="">Pick an enrolment…</option>' + d.enrols.map(function(x){
        return '<option value="' + esc(x.id) + '"' + (x.id === enrolId ? " selected" : "") + ">" + esc(A.personName(x.user_id) + " — " + A.courseTitle(x.course_id) + " (" + x.progress_pct + "%)") + "</option>";
      }).join("") + "</select>";
      var html = A.pageHead("Progress", "Lesson-by-lesson record. Marking or unmarking a lesson recalculates the enrolment.") + '<div class="bar">' + sel + '<div class="spacer"></div>' + (e ? '<button class="btn danger" id="resetall">Reset all</button>' : "") + '<button class="btn light" id="reload">Refresh</button></div>';
      if (e) {
        var lessons = d.lessons.filter(function(l){ return l.course_id === e.course_id; });
        var doneBy = {}; d.progress.filter(function(p){ return p.enrollment_id === e.id; }).forEach(function(p){ doneBy[p.lesson_id] = p; });
        html += '<div class="tiles">' + A.tile(A.personName(e.user_id), "Learner", true) + A.tile(A.courseTitle(e.course_id), "Course") + A.tile(e.progress_pct + "%", "Progress") + A.tile(e.status, "Status") + A.tile(e.score == null ? "—" : e.score + "%", "Avg score") + "</div>";
        html += '<div class="panel"><div class="scroll"><table><thead><tr><th>#</th><th>Lesson</th><th>Kind</th><th>Done</th><th class="num">Score</th><th>Completed</th><th></th></tr></thead><tbody>' +
          (lessons.length ? lessons.map(function(l){
            var p = doneBy[l.id];
            return "<tr><td class=\"num\">" + esc(l.sort_order) + "</td><td>" + esc(A.L(l,"title")) + "</td><td>" + A.pill(l.kind, l.kind === "quiz" ? "warn" : "") + "</td><td>" + (p ? A.pill("done","ok") : A.pill("not yet","mute")) +
              '</td><td class="num">' + (p && p.score != null ? p.score + "%" : "—") + '</td><td class="muted">' + (p ? A.when(p.completed_at) : "—") + '</td><td class="act">' +
              (p ? A.btn("unmark", l.id, "Unmark", "danger") : A.btn("mark", l.id, "Mark complete")) + "</td></tr>";
          }).join("") : '<tr><td colspan="7" class="empty">This course has no lessons.</td></tr>') + "</tbody></table></div></div>";
      }
      var recent = d.progress.slice(0, 200);
      html += '<div class="panel"><h3>Latest activity across the platform</h3>' + (recent.length ? '<div class="scroll"><table><thead><tr><th>When</th><th>Learner</th><th>Course</th><th>Lesson</th><th class="num">Score</th></tr></thead><tbody>' + recent.map(function(p){
        var en = d.enrolById[p.enrollment_id] || {};
        return '<tr><td class="muted">' + A.when(p.completed_at) + "</td><td>" + esc(A.personName(en.user_id)) + "</td><td>" + esc(A.courseTitle(en.course_id)) + "</td><td>" + esc(A.lessonTitle(p.lesson_id)) + '</td><td class="num">' + (p.score == null ? "—" : p.score + "%") + "</td></tr>";
      }).join("") + "</tbody></table></div>" : '<div class="empty">No lessons have been completed yet.</div>') + "</div>";
      A.out.innerHTML = html;
      A.wireCommon(paint);
      A.el("en").addEventListener("change", function(){ A.go("progress", { enrol:A.el("en").value }); });
      if (e) {
        A.el("resetall").addEventListener("click", async function(){
          if (!await A.confirm({ title:"Reset all progress?", text:"All completion records for this enrolment are removed and it returns to 0%.", label:"Reset", danger:true })) return;
          await guarded(async function(){ await A.remove("lesson_progress", "enrollment_id=eq." + A.q(e.id)); await A.reload(); }, "Progress reset");
        });
        A.actions({
          mark: async function(lessonId){ await guarded(async function(){ await A.insert("lesson_progress", { enrollment_id:e.id, lesson_id:lessonId, score:null }); await A.reload(); }, "Marked complete"); },
          unmark: async function(lessonId){ await guarded(async function(){ await A.remove("lesson_progress", "enrollment_id=eq." + A.q(e.id) + "&lesson_id=eq." + A.q(lessonId)); await A.reload(); }, "Unmarked"); }
        });
      }
    }
    paint();
  };

  // ------------------------------------------------------------
  // Certificates
  // ------------------------------------------------------------
  A.views.certificates = function(){
    var d = D();
    var cols = [
      { k:"code", label:"Code", cls:"mono" }, { k:"holder_name", label:"Holder" },
      { k:"course", label:"Course", val:function(r){ return A.courseTitle(r.course_id); }, cell:function(r){ return esc(A.courseTitle(r.course_id)); } },
      { k:"score", label:"Score", cls:"num", val:function(r){ return r.score == null ? -1 : r.score; }, cell:function(r){ return r.score == null ? '<span class="muted">—</span>' : r.score + "%"; } },
      { k:"issued_on", label:"Issued", cls:"num muted", cell:function(r){ return A.date(r.issued_on); } },
      { k:"is_valid", label:"Status", val:function(r){ return r.is_valid ? 1 : 0; }, cell:function(r){ return miniSelect("valid", r.code, [{ v:"1", l:"valid" },{ v:"0", l:"revoked" }], r.is_valid ? "1" : "0"); } },
      { k:"_act", label:"", cls:"act", cell:function(r){ return A.btn("verify", r.code, "Verify link") + A.btn("del", r.code, "Delete", "danger"); } }
    ];
    var byCode = {}; d.certs.forEach(function(c){ byCode[c.code] = c; });
    function rows(){ return A.filterRows(d.certs, A.qval("q"), ["code","holder_name", function(r){ return A.courseTitle(r.course_id); }]); }
    function paint(){
      A.out.innerHTML = A.pageHead("Certificates", "Issued automatically at 100% completion on courses that carry one. You can also issue one by hand.", '<button class="btn accent" id="add">+ Issue certificate</button>') +
        A.searchBar("Search code, holder, course…", true) + '<div class="panel">' + A.table("certs", cols, rows(), "No certificates issued yet.") + "</div>";
      A.wireCommon(paint); A.wireSort("certs", paint); A.wireCsv("basera-certificates.csv", cols, rows);
      A.el("add").addEventListener("click", issue);
      A.actions({ del: delCert, verify:function(c){ var u = location.href.replace(/admin\.html.*$/, "index.html#verify=" + encodeURIComponent(c.code)); navigator.clipboard && navigator.clipboard.writeText(u); A.toast("Verification link copied: " + u); } }, function(k){ return byCode[k]; });
      changes({ valid: async function(c, sel){
        var next = sel.value === "1";
        if (!next && !await A.confirm({ title:"Revoke " + c.code + "?", text:"Public verification will report it as not valid.", label:"Revoke", danger:true })) { sel.value = "1"; return; }
        sel.disabled = true;
        try { await A.patch("certificates", "code=eq." + A.q(c.code), { is_valid:next }); c.is_valid = next; A.toast(next ? "Certificate restored" : "Certificate revoked"); }
        catch(e){ sel.value = c.is_valid ? "1" : "0"; A.toast(e.message, true); }
        sel.disabled = false;
      } }, function(k){ return byCode[k]; });
    }
    paint();
    function newCode(){ var c; do { c = "BSR-" + new Date().getFullYear() + "-" + String(Math.floor(10000 + Math.random() * 90000)); } while (byCode[c]); return c; }
    async function issue(){
      await A.form({
        title:"Issue a certificate", submitLabel:"Issue",
        fields:[
          { k:"user_id", label:"Account", type:"select", options:[{ v:"", l:"— Not linked to an account" }].concat(personOptions()), hint:"Optional. Linking lets the learner see it in their portal." },
          { k:"holder_name", label:"Name printed on the certificate", required:true },
          { k:"course_id", label:"Course", type:"select", options: courseOptions(), required:true },
          { k:"score", label:"Score %", type:"number", half:true }, { k:"issued_on", label:"Issued on", type:"date", required:true, half:true },
          { k:"code", label:"Code", required:true, hint:"Must be unique.", validate:function(v){ return byCode[v] ? "That code is already used" : null; } }
        ],
        values:{ issued_on:new Date().toISOString().slice(0,10), code:newCode() },
        onSubmit: async function(v){
          var body = { code:v.code.trim().toUpperCase(), holder_name:v.holder_name.trim(), course_id:v.course_id, issued_on:v.issued_on, score:v.score, user_id:v.user_id || null, is_valid:true };
          await A.insert("certificates", body); await A.reload(); A.toast("Certificate issued");
        }
      });
    }
    async function delCert(c){
      if (!await A.confirm({ title:"Delete " + c.code + "?", text:"It disappears from verification entirely. To keep a record but mark it invalid, revoke it instead.", label:"Delete", danger:true })) return;
      await guarded(async function(){ await A.remove("certificates", "code=eq." + A.q(c.code)); await A.reload(); }, "Certificate deleted");
    }
  };

  // ------------------------------------------------------------
  // Leads
  // ------------------------------------------------------------
  A.views.leads = function(){
    var d = D(), byId = {}; d.leads.forEach(function(l){ byId[l.id] = l; });
    var cols = [
      { k:"created_at", label:"Received", cls:"num muted", cell:function(r){ return A.date(r.created_at); } },
      { k:"name", label:"Name" }, { k:"company", label:"Company", cls:"muted", cell:function(r){ return esc(r.company || "—"); } },
      { k:"email", label:"Email", cls:"muted", cell:function(r){ return '<a href="mailto:' + esc(r.email) + '">' + esc(r.email) + "</a>"; } },
      { k:"interest", label:"Interest", cls:"muted", cell:function(r){ return esc(r.interest || "—"); } },
      { k:"message", label:"Message", cls:"wrap muted", cell:function(r){ return esc(A.clip(r.message, 140)) || "—"; } },
      { k:"source", label:"Source", cls:"muted", cell:function(r){ return esc(r.source || "—"); } },
      { k:"status", label:"Status", cell:function(r){ return miniSelect("status", r.id, LEAD_STATUSES, r.status); } },
      { k:"_act", label:"", cls:"act", cell:function(r){ return A.btn("view", r.id, "Open") + A.btn("del", r.id, "Delete", "danger"); } }
    ];
    function rows(){ var st = A.qval("st"), list = st ? d.leads.filter(function(l){ return l.status === st; }) : d.leads; return A.filterRows(list, A.qval("q"), ["name","company","email","interest","message","source","status"]); }
    function paint(){
      var f = '<select id="st"><option value="">All statuses</option>' + LEAD_STATUSES.map(function(s){ return '<option value="' + s.v + '">' + s.l + "</option>"; }).join("") + "</select>";
      A.out.innerHTML = A.pageHead("Leads", "Enquiries from the contact form, plus any you add by hand.", '<button class="btn accent" id="add">+ Add lead</button>') +
        A.searchBar("Search name, company, email, message…", true, f) + '<div class="panel">' + A.table("leads", cols, rows(), "No enquiries yet.") + "</div>";
      A.wireCommon(repaint); A.wireSort("leads", repaint); A.wireCsv("basera-leads.csv", cols, rows);
      A.keepSelect("st", repaint);
      A.el("add").addEventListener("click", addLead);
      A.actions({ view:function(l){ A.showJson("Lead from " + l.name, l); }, del: delLead }, function(k){ return byId[k]; });
      changes({ status: async function(l, sel){
        var prev = l.status; sel.disabled = true;
        try { await A.patch("leads", "id=eq." + A.q(l.id), { status:sel.value }); l.status = sel.value; A.toast("Lead marked " + sel.value); }
        catch(e){ sel.value = prev; A.toast(/qualified/.test(sel.value) && /check/.test(e.message) ? "The database does not accept 'qualified' until the migration is applied" : e.message, true); }
        sel.disabled = false;
      } }, function(k){ return byId[k]; });
    }
    function repaint(){ var s = A.qval("st"), q = A.qval("q"); paint(); if (A.el("st")) A.el("st").value = s; if (A.el("q")) A.el("q").value = q; }
    paint();
    async function addLead(){
      await A.form({ title:"Add a lead", submitLabel:"Add",
        fields:[{ k:"name", label:"Name", required:true, half:true }, { k:"company", label:"Company", half:true }, { k:"email", label:"Email", type:"email", required:true, half:true },
                { k:"interest", label:"Interest", half:true }, { k:"message", label:"Notes", type:"textarea", rows:3 }, { k:"source", label:"Source", value:"manual", half:true },
                { k:"status", label:"Status", type:"select", options:LEAD_STATUSES, value:"new", half:true }],
        onSubmit: async function(v){ await A.insert("leads", { name:v.name, company:v.company || null, email:v.email, interest:v.interest || null, message:v.message || null, source:v.source || "manual", status:v.status }); await A.reload(); A.toast("Lead added"); }
      });
    }
    async function delLead(l){
      if (!await A.confirm({ title:"Delete lead?", text:l.name + " (" + l.email + ") is removed.", label:"Delete", danger:true })) return;
      await guarded(async function(){ await A.remove("leads", "id=eq." + A.q(l.id)); await A.reload(); }, "Lead deleted");
    }
  };

  // ------------------------------------------------------------
  // Career coach logs
  // ------------------------------------------------------------
  A.views.coach = function(){
    var d = D(), byId = {}; d.logs.forEach(function(l){ byId[l.id] = l; });
    var cols = [
      { k:"created_at", label:"When", cls:"num muted", cell:function(r){ return A.when(r.created_at); } },
      { k:"lang", label:"Lang", cls:"muted", cell:function(r){ return esc(r.lang || "—"); } },
      { k:"user_message", label:"Question", cls:"wrap", cell:function(r){ return esc(A.clip(r.user_message, 180)); } },
      { k:"reply", label:"Answer", cls:"wrap muted", cell:function(r){ return r.reply ? esc(A.clip(r.reply, 200)) : A.pill("no reply","bad"); } },
      { k:"course_ids", label:"Suggested", cls:"muted", val:function(r){ return (r.course_ids || []).length; }, cell:function(r){ var ids = r.course_ids || []; return ids.length ? ids.map(function(i){ return A.pill(i); }).join(" ") : "—"; } },
      { k:"_act", label:"", cls:"act", cell:function(r){ return A.btn("view", r.id, "Open") + A.btn("del", r.id, "Delete", "danger"); } }
    ];
    function rows(){ return A.filterRows(d.logs, A.qval("q"), ["user_message","reply","lang"]); }
    function paint(){
      A.out.innerHTML = A.pageHead("Career coach", "The " + d.logs.length + " most recent conversations on the public site.") +
        A.searchBar("Search questions and answers…", true) + '<div class="panel">' + A.table("logs", cols, rows(), "No one has used the coach yet.") + "</div>";
      A.wireCommon(paint); A.wireSort("logs", paint); A.wireCsv("basera-coach-logs.csv", cols, rows);
      A.actions({ view:function(l){ A.showJson("Coach conversation", l); }, del: async function(l){
        if (!await A.confirm({ title:"Delete this log?", label:"Delete", danger:true })) return;
        await guarded(async function(){ await A.remove("coach_logs", "id=eq." + A.q(l.id)); await A.reload(); }, "Deleted");
      } }, function(k){ return byId[k]; });
    }
    paint();
  };
})(window.BA);
