/* Basera control panel — delivery and structure: cohorts (runs of a course with
   sessions and attendance), course modules, announcements, learning paths.
   Staff have full add / edit / delete; trainers can run their own cohorts. */
(function(A){
  "use strict";
  var esc = A.esc, D = function(){ return A.D; };

  function dt(s){ return s ? A.when(s) : "—"; }
  function toLocalInput(s){ if (!s) return ""; var d = new Date(s); if (isNaN(d.getTime())) return ""; var p = function(n){ return (n < 10 ? "0" : "") + n; }; return d.getFullYear() + "-" + p(d.getMonth()+1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes()); }
  function fromLocalInput(v){ return v ? new Date(v).toISOString() : null; }
  function canWrite(){ return A.isStaffRole(A.me.role); }
  function ownsCohort(k){ return canWrite() || (A.me.role === "trainer" && k.trainer_id === A.me.id); }
  async function guarded(fn, okMsg){ try { await fn(); if (okMsg) A.toast(okMsg); } catch(e){ A.toast(e.message, true); throw e; } }
  var FORMATS = [["live","Live online"],["site","On site"],["self","Self-paced"]].map(function(x){ return { v:x[0], l:x[1] }; });
  var STATUSES = ["draft","scheduled","running","completed","cancelled"].map(function(s){ return { v:s, l:s }; });
  var ATT = ["present","absent","late","excused"].map(function(s){ return { v:s, l:s }; });
  function courseOptions(){ return D().courses.map(function(c){ return { v:c.id, l:A.L(c,"title") + " [" + c.id + "]" }; }); }
  function trainerOptions(){ return [{ v:"", l:"— Unassigned" }].concat(D().profiles.filter(function(p){ return p.role === "trainer" || p.role === "partner" || A.isStaffRole(p.role); }).map(function(p){ return { v:p.id, l:(p.full_name || p.email) + " (" + p.role + ")" }; })); }
  function orgOptions(){ return [{ v:"", l:"— Open to everyone" }].concat(D().orgs.map(function(o){ return { v:o.id, l:o.name }; })); }
  function cohortLabel(k){ var c = D().courseById[k.course_id]; return (k.title || (c ? A.L(c,"title") : k.course_id)) + (k.starts_at ? " — " + A.date(k.starts_at) : ""); }
  function statusPill(s){ return A.pill(s, s === "running" ? "ok" : s === "scheduled" ? "" : s === "cancelled" ? "bad" : "mute"); }

  // ============================================================ Cohorts
  A.views.cohorts = function(){
    var d = D();
    if (A.params.cohort) return cohortDetail(A.params.cohort);
    var seats = A.countBy(d.enrols, "cohort_id");
    var cols = [
      { k:"course", label:"Course", val:function(r){ return A.courseTitle(r.course_id); }, cell:function(r){ return esc(A.courseTitle(r.course_id)) + (r.title ? '<div class="muted" style="font-size:11px">' + esc(r.title) + "</div>" : ""); } },
      { k:"format", label:"Format", cls:"muted" },
      { k:"starts_at", label:"Starts", cls:"num muted", cell:function(r){ return dt(r.starts_at); } },
      { k:"ends_at", label:"Ends", cls:"num muted", cell:function(r){ return dt(r.ends_at); } },
      { k:"trainer", label:"Trainer", val:function(r){ return r.trainer_id ? A.personName(r.trainer_id) : ""; }, cell:function(r){ return r.trainer_id ? esc(A.personName(r.trainer_id)) : '<span class="muted">—</span>'; } },
      { k:"org", label:"Company", cls:"muted", val:function(r){ return A.orgName(r.org_id); }, cell:function(r){ return esc(A.orgName(r.org_id) || "Open"); } },
      { k:"seats", label:"Seats", cls:"num", val:function(r){ return seats[r.id] || 0; }, cell:function(r){ return (seats[r.id] || 0) + (r.capacity ? " / " + r.capacity : ""); } },
      { k:"sessions", label:"Sessions", cls:"num", val:function(r){ return (d.sessionsPerCohort[r.id] || 0); }, cell:function(r){ return String(d.sessionsPerCohort[r.id] || 0); } },
      { k:"status", label:"Status", cell:function(r){ return statusPill(r.status); } },
      { k:"_act", label:"", cls:"act", cell:function(r){ return A.btn("open", r.id, "Open") + (ownsCohort(r) ? A.btn("edit", r.id, "Edit") : "") + (canWrite() ? A.btn("del", r.id, "Delete", "danger") : ""); } }
    ];
    function rows(){
      var st = A.qval("st"), list = st ? d.cohorts.filter(function(k){ return k.status === st; }) : d.cohorts;
      return A.filterRows(list, A.qval("q"), ["title","format","location","status", function(r){ return A.courseTitle(r.course_id); }, function(r){ return A.personName(r.trainer_id); }]);
    }
    function paint(){
      var f = '<select id="st"><option value="">All statuses</option>' + STATUSES.map(function(s){ return '<option value="' + s.v + '">' + s.l + "</option>"; }).join("") + "</select>";
      A.out.innerHTML = A.pageHead("Cohorts", "Scheduled runs of a course: dates, venue, trainer, seats, sessions and attendance.", canWrite() ? '<button class="btn accent" id="add">+ New cohort</button>' : "") +
        A.searchBar("Search course, title, venue, trainer…", true, f) + '<div class="panel">' + A.table("cohorts", cols, rows(), "No cohorts scheduled yet.") + "</div>";
      A.wireCommon(repaint); A.wireSort("cohorts", repaint); A.wireCsv("basera-cohorts.csv", cols, rows); A.keepSelect("st", repaint);
      if (A.el("add")) A.el("add").addEventListener("click", function(){ cohortForm(null); });
      A.actions({ open:function(k){ A.go("cohorts", { cohort:k.id }); }, edit: cohortForm, del: delCohort }, function(id){ return d.cohortById[id]; });
    }
    function repaint(){ var s = A.qval("st"), q = A.qval("q"); paint(); if (A.el("st")) A.el("st").value = s; if (A.el("q")) A.el("q").value = q; }
    paint();
  };

  async function cohortForm(k){
    var d = D();
    await A.form({
      title: k ? "Edit cohort" : "New cohort", submitLabel: k ? "Save" : "Create cohort", wide:true,
      fields:[
        { k:"course_id", label:"Course", type:"select", options: courseOptions(), required:true, half:true },
        { k:"title", label:"Cohort name", hint:"Optional, e.g. March intake or Riyadh group B", half:true },
        { k:"format", label:"Format", type:"select", options:FORMATS, half:true },
        { k:"status", label:"Status", type:"select", options:STATUSES, half:true },
        { k:"starts_at", label:"Starts", type:"datetime-local", half:true },
        { k:"ends_at", label:"Ends", type:"datetime-local", half:true },
        { k:"location", label:"Venue", hint:"Room, building, city — for on-site runs", half:true },
        { k:"meeting_url", label:"Meeting link", hint:"For live online runs", half:true },
        { k:"trainer_id", label:"Trainer", type:"select", options: trainerOptions(), half:true },
        { k:"org_id", label:"Company", type:"select", options: orgOptions(), half:true },
        { k:"capacity", label:"Capacity", type:"number", half:true },
        { k:"notes", label:"Notes", type:"textarea", rows:3 }
      ],
      values: k ? Object.assign({}, k, { starts_at: toLocalInput(k.starts_at), ends_at: toLocalInput(k.ends_at), trainer_id: k.trainer_id || "", org_id: k.org_id || "" }) : { format:"live", status:"scheduled", org_id:"", trainer_id:"" },
      onSubmit: async function(v){
        var body = { course_id:v.course_id, title:v.title || null, format:v.format, status:v.status, starts_at:fromLocalInput(v.starts_at), ends_at:fromLocalInput(v.ends_at),
                     location:v.location || null, meeting_url:v.meeting_url || null, trainer_id:v.trainer_id || null, org_id:v.org_id || null, capacity:v.capacity, notes:v.notes || null };
        if (k) await A.patch("cohorts", "id=eq." + A.q(k.id), body); else await A.insert("cohorts", body);
        await A.reload(); A.toast(k ? "Saved" : "Cohort created");
      }
    });
  }
  async function delCohort(k){
    var n = D().enrols.filter(function(e){ return e.cohort_id === k.id; }).length;
    if (!await A.confirm({ title:"Delete cohort?", text:cohortLabel(k) + " and its sessions and attendance are removed." + (n ? " " + n + " enrolment(s) stay on the course but lose the cohort." : ""), label:"Delete", danger:true })) return;
    await guarded(async function(){ await A.remove("cohorts", "id=eq." + A.q(k.id)); await A.reload(); }, "Cohort deleted");
  }

  function cohortDetail(id){
    var d = D(), k = d.cohortById[id];
    if (!k) { A.out.innerHTML = '<div class="empty">Cohort not found. <a href="#/cohorts">Back</a></div>'; return; }
    var rw = ownsCohort(k);
    var sessions = d.sessions.filter(function(s){ return s.cohort_id === k.id; }).sort(function(a,b){ return (a.starts_at||"").localeCompare(b.starts_at||""); });
    var members = d.enrols.filter(function(e){ return e.cohort_id === k.id; });
    var att = {}; d.attendance.forEach(function(a){ att[a.session_id + "|" + a.user_id] = a; });
    var course = d.courseById[k.course_id];
    var html = A.pageHead(cohortLabel(k), (course ? A.L(course,"title") + " · " : "") + k.format + (k.location ? " · " + k.location : "") + (k.trainer_id ? " · " + A.personName(k.trainer_id) : ""),
      '<a class="btn light" href="#/cohorts">← All cohorts</a>' + (rw ? ' <button class="btn light" id="edit">Edit</button>' : ""));
    html += '<div class="tiles">' + A.tile(k.status, "Status") + A.tile(members.length + (k.capacity ? " / " + k.capacity : ""), "Seats") + A.tile(sessions.length, "Sessions") + A.tile(dt(k.starts_at), "Starts") + A.tile(dt(k.ends_at), "Ends") + "</div>";
    // sessions
    html += '<div class="panel"><h3>Sessions<span class="spacer"></span>' + (rw ? '<button class="btn sm accent" id="addSession">+ Session</button>' : "") + "</h3>";
    html += sessions.length ? '<div class="scroll"><table><thead><tr><th>#</th><th>Title</th><th>Starts</th><th>Ends</th><th class="num">Present</th><th></th></tr></thead><tbody>' + sessions.map(function(s, i){
      var present = members.filter(function(m){ var a = att[s.id + "|" + m.user_id]; return a && (a.status === "present" || a.status === "late"); }).length;
      return '<tr><td class="num">' + (i+1) + "</td><td>" + esc(s.title || "—") + '</td><td class="muted">' + dt(s.starts_at) + '</td><td class="muted">' + dt(s.ends_at) + '</td><td class="num">' + present + " / " + members.length + '</td><td class="act">' + (rw ? A.btn("editS", s.id, "Edit") + A.btn("delS", s.id, "Delete", "danger") : "") + "</td></tr>";
    }).join("") + "</tbody></table></div>" : '<div class="empty">No sessions yet.' + (rw ? " Add the dates this cohort meets." : "") + "</div>";
    html += "</div>";
    // roster + attendance matrix
    html += '<div class="panel"><h3>Roster &amp; attendance<span class="spacer"></span>' + (canWrite() ? '<button class="btn sm accent" id="addMember">+ Add learner</button>' : "") + "</h3>";
    if (!members.length) html += '<div class="empty">Nobody is in this cohort yet.' + (canWrite() ? " Add learners from the course’s enrolments." : "") + "</div>";
    else {
      html += '<div class="scroll"><table><thead><tr><th>Learner</th><th>Company</th><th class="num">Progress</th>' + sessions.map(function(s, i){ return '<th title="' + esc(dt(s.starts_at)) + '">S' + (i+1) + "</th>"; }).join("") + "<th></th></tr></thead><tbody>";
      html += members.map(function(m){
        return "<tr><td>" + esc(A.personName(m.user_id)) + '</td><td class="muted">' + esc(A.orgName(m.org_id) || "—") + '</td><td class="num">' + m.progress_pct + "%</td>" +
          sessions.map(function(s){
            var a = att[s.id + "|" + m.user_id], v = a ? a.status : "";
            return "<td>" + (rw
              ? '<select class="mini keep-rw" data-chg="att" data-key="' + s.id + "|" + m.user_id + '"><option value="">—</option>' + ATT.map(function(o){ return '<option value="' + o.v + '"' + (o.v === v ? " selected" : "") + ">" + o.l + "</option>"; }).join("") + "</select>"
              : (v ? A.pill(v, v === "present" ? "ok" : v === "absent" ? "bad" : "warn") : '<span class="muted">—</span>')) + "</td>";
          }).join("") +
          '<td class="act">' + (canWrite() ? A.btn("removeMember", m.id, "Remove", "danger") : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
    }
    html += "</div>";
    A.out.innerHTML = html;

    if (A.el("edit")) A.el("edit").addEventListener("click", function(){ cohortForm(k); });
    if (A.el("addSession")) A.el("addSession").addEventListener("click", function(){ sessionForm(k, null); });
    if (A.el("addMember")) A.el("addMember").addEventListener("click", function(){ addMember(k); });
    A.actions({
      editS:function(sid){ sessionForm(k, d.sessionById[sid]); },
      delS: async function(sid){ if (!await A.confirm({ title:"Delete session?", text:"Attendance for it is removed too.", label:"Delete", danger:true })) return; await guarded(async function(){ await A.remove("cohort_sessions", "id=eq." + A.q(sid)); await A.reload(); }, "Session deleted"); },
      removeMember: async function(eid){ if (!await A.confirm({ title:"Remove from cohort?", text:"The enrolment stays; only the seat in this cohort is released.", label:"Remove", danger:true })) return; await guarded(async function(){ await A.patch("enrollments", "id=eq." + A.q(eid), { cohort_id:null }); await A.reload(); }, "Removed from cohort"); }
    });
    // attendance selects
    var host = A.out;
    if (host._chg) host.removeEventListener("change", host._chg);
    host._chg = async function(ev){
      var s = ev.target.closest('select[data-chg="att"]'); if (!s) return;
      var parts = s.getAttribute("data-key").split("|"), sid = parts[0], uid = parts[1], v = s.value;
      s.disabled = true;
      try {
        if (!v) await A.remove("attendance", "session_id=eq." + A.q(sid) + "&user_id=eq." + A.q(uid));
        else await A.rest("attendance?on_conflict=session_id,user_id", { method:"POST", headers:{ "Prefer":"resolution=merge-duplicates,return=representation" }, body:{ session_id:sid, user_id:uid, status:v, marked_by:A.me.id } });
        await A.loadAll(true); A.toast("Attendance saved");
      } catch(e){ A.toast(e.message, true); }
      s.disabled = false;
    };
    host.addEventListener("change", host._chg);
  }
  async function sessionForm(k, s){
    await A.form({
      title: s ? "Edit session" : "New session", submitLabel: s ? "Save" : "Add session",
      fields:[
        { k:"title", label:"Title", hint:"Optional, e.g. Day 1 — Foundations" },
        { k:"starts_at", label:"Starts", type:"datetime-local", required:true, half:true },
        { k:"ends_at", label:"Ends", type:"datetime-local", half:true }
      ],
      values: s ? { title:s.title || "", starts_at:toLocalInput(s.starts_at), ends_at:toLocalInput(s.ends_at) } : {},
      onSubmit: async function(v){
        var body = { cohort_id:k.id, title:v.title || null, starts_at:fromLocalInput(v.starts_at), ends_at:fromLocalInput(v.ends_at) };
        if (s) await A.patch("cohort_sessions", "id=eq." + A.q(s.id), body); else await A.insert("cohort_sessions", body);
        await A.reload(); A.toast(s ? "Saved" : "Session added");
      }
    });
  }
  async function addMember(k){
    var d = D();
    var candidates = d.enrols.filter(function(e){ return e.course_id === k.course_id && e.cohort_id !== k.id; });
    var others = d.profiles.filter(function(p){ return !d.enrols.some(function(e){ return e.course_id === k.course_id && e.user_id === p.id; }); });
    await A.form({
      title:"Add a learner to this cohort", submitLabel:"Add",
      intro:"Pick someone already enrolled on the course, or enrol a new person and seat them here in one step.",
      fields:[
        { k:"mode", label:"Who", type:"select", options:[{ v:"enrolled", l:"Someone already enrolled on " + A.courseTitle(k.course_id) }, { v:"new", l:"Enrol a new person on the course" }], value: candidates.length ? "enrolled" : "new" },
        { k:"enrol_id", label:"Enrolment", type:"select", options: candidates.map(function(e){ return { v:e.id, l:A.personName(e.user_id) + (e.cohort_id ? " (in another cohort)" : "") }; }), showIf:function(v){ return v.mode === "enrolled"; }, required:true },
        { k:"user_id", label:"Person", type:"select", options: others.map(function(p){ return { v:p.id, l:(p.full_name || "") + " (" + (p.email || "") + ")" }; }), showIf:function(v){ return v.mode === "new"; }, required:true }
      ],
      onSubmit: async function(v){
        if (k.capacity && d.enrols.filter(function(e){ return e.cohort_id === k.id; }).length >= k.capacity) throw new Error("This cohort is full (" + k.capacity + " seats)");
        if (v.mode === "enrolled") await A.patch("enrollments", "id=eq." + A.q(v.enrol_id), { cohort_id:k.id });
        else await A.insert("enrollments", { user_id:v.user_id, course_id:k.course_id, cohort_id:k.id, assigned_by:A.me.id });
        await A.reload(); A.toast("Added to cohort");
      }
    });
  }

  // ============================================================ Modules
  A.views.modules = function(){
    var d = D();
    var courseId = A.params.course || (d.courses[0] ? d.courses[0].id : "");
    var course = d.courseById[courseId];
    var mods = d.modules.filter(function(m){ return m.course_id === courseId; }).sort(function(a,b){ return a.sort_order - b.sort_order; });
    var lessonsIn = A.countBy(d.lessons.filter(function(l){ return l.course_id === courseId; }), "module_id");
    var unassigned = d.lessons.filter(function(l){ return l.course_id === courseId && !l.module_id; }).length;
    var cols = [
      { k:"sort_order", label:"#", cls:"num" },
      { k:"title", label:"Module", val:function(r){ return A.L(r,"title"); }, cell:function(r){ return esc(A.L(r,"title")); } },
      { k:"lessons", label:"Lessons", cls:"num", val:function(r){ return lessonsIn[r.id] || 0; }, cell:function(r){ return String(lessonsIn[r.id] || 0); } },
      { k:"_act", label:"", cls:"act", cell:function(r){ return canWrite() ? A.btn("edit", r.id, "Edit") + A.btn("del", r.id, "Delete", "danger") : ""; } }
    ];
    var sel = '<select id="course">' + A.selectOptions(d.courses, courseId, function(c){ return A.L(c,"title") + " [" + c.id + "]"; }) + "</select>";
    A.out.innerHTML = A.pageHead("Modules", course ? A.L(course,"title") + " — " + mods.length + " module(s), " + unassigned + " lesson(s) not yet in a module." : "Pick a course.",
        '<a class="btn light" href="#/lessons?course=' + esc(courseId) + '">Lessons</a>' + (canWrite() && course ? ' <button class="btn accent" id="add">+ New module</button>' : "")) +
      '<div class="bar">' + sel + '<div class="spacer"></div><button class="btn light" id="reload">Refresh</button></div>' +
      '<div class="panel">' + A.table("modules", cols, mods, "No modules yet. Lessons show as a flat list until you add some.") + "</div>";
    A.wireCommon(function(){ A.views.modules(); }); A.wireSort("modules", function(){ A.views.modules(); });
    A.el("course").addEventListener("change", function(){ A.go("modules", { course:A.el("course").value }); });
    if (A.el("add")) A.el("add").addEventListener("click", function(){ moduleForm(courseId, null); });
    A.actions({ edit:function(m){ moduleForm(courseId, m); }, del: async function(m){
      if (!await A.confirm({ title:"Delete module?", text:'"' + A.L(m,"title") + '" is removed; its lessons stay on the course, ungrouped.', label:"Delete", danger:true })) return;
      await guarded(async function(){ await A.remove("course_modules", "id=eq." + A.q(m.id)); await A.reload(); }, "Module deleted");
    } }, function(id){ return d.moduleById[id]; });
  };
  async function moduleForm(courseId, m){
    var mods = D().modules.filter(function(x){ return x.course_id === courseId; });
    var next = mods.length ? Math.max.apply(null, mods.map(function(x){ return x.sort_order; })) + 10 : 10;
    await A.form({
      title: m ? "Edit module" : "New module", submitLabel: m ? "Save" : "Create",
      fields:[{ k:"title_en", label:"Title (EN)", required:true, half:true }, { k:"title_ar", label:"Title (AR)", required:true, half:true }, { k:"sort_order", label:"Order", type:"number" }],
      values: m ? Object.assign({}, m) : { sort_order:next },
      onSubmit: async function(v){
        var body = { course_id:courseId, title_en:v.title_en, title_ar:v.title_ar, sort_order:v.sort_order == null ? next : v.sort_order };
        if (m) await A.patch("course_modules", "id=eq." + A.q(m.id), body); else await A.insert("course_modules", body);
        await A.reload(); A.toast(m ? "Saved" : "Module created");
      }
    });
  }

  // ============================================================ Announcements
  A.views.announcements = function(){
    var d = D();
    var cols = [
      { k:"published_at", label:"Published", cls:"num muted", cell:function(r){ return A.date(r.published_at); } },
      { k:"title", label:"Title", val:function(r){ return A.L(r,"title"); }, cell:function(r){ return esc(A.L(r,"title")) + '<div class="muted" style="font-size:11px">' + esc(A.clip(A.L(r,"body"), 90)) + "</div>"; } },
      { k:"audience", label:"Audience", cell:function(r){ return r.audience === "all" ? A.pill("everyone") : r.audience === "org" ? A.pill(A.orgName(r.org_id) || "company", "warn") : A.pill(d.cohortById[r.cohort_id] ? cohortLabel(d.cohortById[r.cohort_id]) : "cohort", "ok"); } },
      { k:"expires_at", label:"Expires", cls:"num muted", cell:function(r){ return r.expires_at ? A.date(r.expires_at) : "—"; } },
      { k:"by", label:"By", cls:"muted", val:function(r){ return A.personName(r.created_by); }, cell:function(r){ return esc(A.personName(r.created_by)); } },
      { k:"_act", label:"", cls:"act", cell:function(r){ var rw = canWrite() || (r.audience === "cohort" && d.cohortById[r.cohort_id] && d.cohortById[r.cohort_id].trainer_id === A.me.id); return rw ? A.btn("edit", r.id, "Edit") + A.btn("del", r.id, "Delete", "danger") : ""; } }
    ];
    function rows(){ return A.filterRows(d.announcements, A.qval("q"), ["title_en","title_ar","body_en","body_ar","audience"]); }
    function paint(){
      A.out.innerHTML = A.pageHead("Announcements", "Shown on the learner dashboard to everyone, one company, or one cohort.", '<button class="btn accent" id="add">+ New announcement</button>') +
        A.searchBar("Search announcements…", true) + '<div class="panel">' + A.table("ann", cols, rows(), "No announcements yet.") + "</div>";
      A.wireCommon(paint); A.wireSort("ann", paint); A.wireCsv("basera-announcements.csv", cols, rows);
      A.el("add").addEventListener("click", function(){ annForm(null); });
      A.actions({ edit: annForm, del: async function(a){ if (!await A.confirm({ title:"Delete announcement?", label:"Delete", danger:true })) return; await guarded(async function(){ await A.remove("announcements", "id=eq." + A.q(a.id)); await A.reload(); }, "Deleted"); } }, function(id){ return d.annById[id]; });
    }
    paint();
  };
  async function annForm(a){
    var d = D(), staff = canWrite();
    var cohortOpts = d.cohorts.filter(function(k){ return staff || k.trainer_id === A.me.id; }).map(function(k){ return { v:k.id, l:cohortLabel(k) }; });
    var audiences = staff ? [{ v:"all", l:"Everyone" }, { v:"org", l:"One company" }, { v:"cohort", l:"One cohort" }] : [{ v:"cohort", l:"One cohort" }];
    await A.form({
      title: a ? "Edit announcement" : "New announcement", submitLabel: a ? "Save" : "Publish", wide:true,
      fields:[
        { k:"title_en", label:"Title (EN)", required:true, half:true }, { k:"title_ar", label:"Title (AR)", required:true, half:true },
        { k:"body_en", label:"Body (EN)", type:"textarea", rows:4 }, { k:"body_ar", label:"Body (AR)", type:"textarea", rows:4 },
        { k:"audience", label:"Audience", type:"select", options:audiences, half:true },
        { k:"org_id", label:"Company", type:"select", options:d.orgs.map(function(o){ return { v:o.id, l:o.name }; }), showIf:function(v){ return v.audience === "org"; }, required:true, half:true },
        { k:"cohort_id", label:"Cohort", type:"select", options:cohortOpts, showIf:function(v){ return v.audience === "cohort"; }, required:true, half:true },
        { k:"published_at", label:"Publish at", type:"datetime-local", half:true }, { k:"expires_at", label:"Expires", type:"datetime-local", hint:"Optional", half:true }
      ],
      values: a ? Object.assign({}, a, { published_at:toLocalInput(a.published_at), expires_at:toLocalInput(a.expires_at), org_id:a.org_id || "", cohort_id:a.cohort_id || "" }) : { audience: staff ? "all" : "cohort", published_at: toLocalInput(new Date().toISOString()) },
      onSubmit: async function(v){
        var body = { title_en:v.title_en, title_ar:v.title_ar, body_en:v.body_en || null, body_ar:v.body_ar || null, audience:v.audience,
                     org_id:v.audience === "org" ? v.org_id : null, cohort_id:v.audience === "cohort" ? v.cohort_id : null,
                     published_at:fromLocalInput(v.published_at) || new Date().toISOString(), expires_at:fromLocalInput(v.expires_at) };
        if (!a) body.created_by = A.me.id;
        if (a) await A.patch("announcements", "id=eq." + A.q(a.id), body); else await A.insert("announcements", body);
        await A.reload(); A.toast(a ? "Saved" : "Published");
      }
    });
  }

  // ============================================================ Learning paths
  A.views.paths = function(){
    var d = D();
    var cols = [
      { k:"sort_order", label:"#", cls:"num" },
      { k:"title", label:"Path", val:function(r){ return A.L(r,"title"); }, cell:function(r){ return esc(A.L(r,"title")) + '<div class="muted" style="font-size:11px">' + esc(r.slug || "") + "</div>"; } },
      { k:"courses", label:"Courses", cls:"wrap", val:function(r){ return (d.pathCourses[r.id] || []).length; }, cell:function(r){ var list = (d.pathCourses[r.id] || []); return list.length ? list.map(function(pc){ return A.pill(A.courseTitle(pc.course_id)); }).join(" ") : '<span class="muted">none yet</span>'; } },
      { k:"is_published", label:"Visible", val:function(r){ return r.is_published ? 1 : 0; }, cell:function(r){ return r.is_published ? A.pill("live","ok") : A.pill("hidden","mute"); } },
      { k:"_act", label:"", cls:"act", cell:function(r){ return A.btn("edit", r.id, "Edit") + A.btn("del", r.id, "Delete", "danger"); } }
    ];
    function rows(){ return A.filterRows(d.paths, A.qval("q"), ["slug","title_en","title_ar","summary_en","summary_ar"]); }
    function paint(){
      A.out.innerHTML = A.pageHead("Learning paths", "Ordered programmes of courses. Published paths appear on the site and in the portal catalogue.", '<button class="btn accent" id="add">+ New path</button>') +
        A.searchBar("Search paths…", true) + '<div class="panel">' + A.table("paths", cols, rows(), "No learning paths yet.") + "</div>";
      A.wireCommon(paint); A.wireSort("paths", paint); A.wireCsv("basera-learning-paths.csv", cols, rows);
      A.el("add").addEventListener("click", function(){ pathForm(null); });
      A.actions({ edit: pathForm, del: async function(p){ if (!await A.confirm({ title:"Delete path?", text:'"' + A.L(p,"title") + '" is removed. Its courses are untouched.', label:"Delete", danger:true })) return; await guarded(async function(){ await A.remove("learning_paths", "id=eq." + A.q(p.id)); await A.reload(); }, "Path deleted"); } }, function(id){ return d.pathById[id]; });
    }
    paint();
  };
  async function pathForm(p){
    var d = D(), inPath = {}; (p ? (d.pathCourses[p.id] || []) : []).forEach(function(pc){ inPath["c_" + pc.course_id] = true; });
    var fields = [
      { k:"title_en", label:"Title (EN)", required:true, half:true }, { k:"title_ar", label:"Title (AR)", required:true, half:true },
      { k:"slug", label:"Slug", hint:"Short id for links, e.g. hr-foundations", half:true, validate:function(v){ return v && !/^[a-z0-9-]{2,40}$/.test(v) ? "Lowercase letters, digits and dashes" : null; } },
      { k:"sort_order", label:"Order", type:"number", half:true },
      { k:"summary_en", label:"Summary (EN)", type:"textarea", rows:3 }, { k:"summary_ar", label:"Summary (AR)", type:"textarea", rows:3 },
      { k:"is_published", label:"Visible on the site and in the catalogue", type:"checkbox" }
    ].concat(d.courses.map(function(c){ return { k:"c_" + c.id, label:A.L(c,"title") + "  [" + c.id + "]", type:"checkbox" }; }));
    await A.form({
      title: p ? "Edit path" : "New learning path", submitLabel: p ? "Save" : "Create", wide:true, intro:"Tick the courses in this path; they are ordered by the course catalogue order.",
      fields:fields, values: p ? Object.assign({}, p, inPath) : { sort_order:(d.paths.length + 1) * 10, is_published:false },
      onSubmit: async function(v){
        var body = { title_en:v.title_en, title_ar:v.title_ar, slug:v.slug || null, sort_order:v.sort_order == null ? 100 : v.sort_order, summary_en:v.summary_en || null, summary_ar:v.summary_ar || null, is_published:!!v.is_published };
        var id = p ? p.id : null;
        if (p) await A.patch("learning_paths", "id=eq." + A.q(p.id), body);
        else { var rows = await A.insert("learning_paths", body); id = rows && rows[0] && rows[0].id; }
        if (!id) throw new Error("Could not read the new path id");
        await A.remove("learning_path_courses", "path_id=eq." + A.q(id));
        var chosen = d.courses.filter(function(c){ return v["c_" + c.id]; });
        if (chosen.length) await A.insert("learning_path_courses", chosen.map(function(c){ return { path_id:id, course_id:c.id, sort_order:c.sort_order }; }));
        await A.reload(); A.toast(p ? "Saved" : "Path created");
      }
    });
  }
})(window.BA);
