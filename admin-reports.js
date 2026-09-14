/* Basera control panel — reports. Each report is computed from the tables
   already loaded, so it is always consistent with what the other views show. */
(function(A){
  "use strict";
  var esc = A.esc;
  var pct = function(v){ return v == null ? "—" : Math.round(v) + "%"; };
  var num = function(v){ return v == null ? "—" : A.num(v); };
  function avg(list){ var v = list.filter(function(x){ return x != null; }); return v.length ? Math.round(v.reduce(function(s,x){ return s + Number(x); },0) / v.length) : null; }
  function lastMonths(n){ var out = [], d = new Date(); d.setDate(1); for (var i = n-1; i >= 0; i--) { var x = new Date(d.getFullYear(), d.getMonth()-i, 1); out.push(x.toISOString().slice(0,7)); } return out; }
  function pctCol(k, label){ return { k:k, label:label, cls:"num", cell:function(r){ return pct(r[k]); }, raw:function(r){ return r[k]; } }; }
  function numCol(k, label){ return { k:k, label:label, cls:"num", cell:function(r){ return num(r[k]); } }; }
  function progCol(k, label){ return { k:k, label:label, cell:function(r){ return r[k] == null ? '<span class="muted">—</span>' : A.progressCell(r[k]); }, raw:function(r){ return r[k]; } }; }

  A.REPORTS = [
    {
      id:"course_performance", title:"Course performance", desc:"Enrolments, completion rate, average score and certificates, per course.",
      build:function(D){
        return {
          cols:[{ k:"title", label:"Course" }, { k:"domain", label:"Domain", cls:"muted" }, { k:"level", label:"Level", cls:"muted" }, numCol("lessons","Lessons"), numCol("enrols","Enrolments"), numCol("active","Active"), numCol("completed","Completed"), pctCol("rate","Completion"), progCol("avg_progress","Avg progress"), pctCol("avg_score","Avg score"), numCol("certs","Certificates"), { k:"trainer", label:"Trainer", cls:"muted" }],
          rows: D.courses.map(function(c){
            var en = D.enrols.filter(function(e){ return e.course_id === c.id; }), done = en.filter(function(e){ return e.status === "completed"; });
            return { title:A.L(c,"title"), domain:c.domain, level:c.level, lessons:D.lessonsPerCourse[c.id] || 0, enrols:en.length, active:en.length - done.length, completed:done.length,
                     rate: en.length ? A.pct(done.length, en.length) : null, avg_progress: en.length ? avg(en.map(function(e){ return e.progress_pct; })) : null,
                     avg_score: avg(en.map(function(e){ return e.score; })), certs: D.certs.filter(function(x){ return x.course_id === c.id && x.is_valid; }).length, trainer: c.trainer_id ? A.personName(c.trainer_id) : "" };
          })
        };
      }
    },
    {
      id:"company_progress", title:"Company progress", desc:"How each client company is doing: members, enrolments, completion and certificates.",
      build:function(D){
        var groups = D.orgs.map(function(o){ return { id:o.id, name:o.name, type:o.type }; }).concat([{ id:null, name:"No company", type:"" }]);
        return {
          cols:[{ k:"name", label:"Company" }, { k:"type", label:"Type", cls:"muted" }, numCol("members","Members"), numCol("leads","Company leads"), numCol("enrols","Enrolments"), numCol("completed","Completed"), pctCol("rate","Completion"), progCol("avg_progress","Avg progress"), numCol("certs","Certificates"), { k:"last", label:"Last activity", cls:"muted" }],
          rows: groups.map(function(g){
            var members = D.profiles.filter(function(p){ return (p.org_id || null) === g.id; }), ids = {}; members.forEach(function(p){ ids[p.id] = 1; });
            var en = D.enrols.filter(function(e){ return ids[e.user_id]; }), done = en.filter(function(e){ return e.status === "completed"; });
            var enIds = {}; en.forEach(function(e){ enIds[e.id] = 1; });
            var last = D.progress.filter(function(p){ return enIds[p.enrollment_id]; }).map(function(p){ return p.completed_at; }).sort().pop();
            return { name:g.name, type:g.type, members:members.length, leads:members.filter(function(p){ return p.role === "client_admin"; }).length, enrols:en.length, completed:done.length,
                     rate: en.length ? A.pct(done.length, en.length) : null, avg_progress: en.length ? avg(en.map(function(e){ return e.progress_pct; })) : null,
                     certs: D.certs.filter(function(c){ return c.user_id && ids[c.user_id] && c.is_valid; }).length, last: last ? A.date(last) : "" };
          }).filter(function(r){ return r.members || r.name !== "No company"; })
        };
      }
    },
    {
      id:"learner_activity", title:"Learner activity", desc:"Every account with its enrolments, completions, average progress and last activity.",
      build:function(D){
        return {
          cols:[{ k:"name", label:"Name" }, { k:"email", label:"Email", cls:"muted" }, { k:"role", label:"Type", cell:function(r){ return A.rolePill(r.role); }, raw:function(r){ return r.role; } }, { k:"company", label:"Company", cls:"muted" }, numCol("enrols","Enrolments"), numCol("completed","Completed"), progCol("avg_progress","Avg progress"), pctCol("avg_score","Avg score"), numCol("certs","Certificates"), { k:"last", label:"Last activity", cls:"muted" }, { k:"joined", label:"Joined", cls:"muted" }],
          rows: D.profiles.map(function(p){
            var en = D.enrols.filter(function(e){ return e.user_id === p.id; }), done = en.filter(function(e){ return e.status === "completed"; });
            var enIds = {}; en.forEach(function(e){ enIds[e.id] = 1; });
            var last = D.progress.filter(function(x){ return enIds[x.enrollment_id]; }).map(function(x){ return x.completed_at; }).sort().pop();
            return { name:p.full_name || "", email:p.email || "", role:p.role, company:A.orgName(p.org_id), enrols:en.length, completed:done.length,
                     avg_progress: en.length ? avg(en.map(function(e){ return e.progress_pct; })) : null, avg_score: avg(en.map(function(e){ return e.score; })),
                     certs: D.certs.filter(function(c){ return c.user_id === p.id && c.is_valid; }).length, last: last ? A.date(last) : "", joined: A.date(p.created_at) };
          })
        };
      }
    },
    {
      id:"monthly", title:"Monthly activity", desc:"Sign-ups, enrolments, completions, certificates and leads for each of the last 12 months.",
      build:function(D){
        function m(rows, key){ var o = {}; rows.forEach(function(r){ var k = A.month(r[key]); if (k) o[k] = (o[k]||0)+1; }); return o; }
        var su = m(D.profiles,"created_at"), en = m(D.enrols,"enrolled_at"), co = m(D.enrols.filter(function(e){ return e.completed_at; }),"completed_at"), ce = m(D.certs,"issued_on"), le = m(D.leads,"created_at"), lp = m(D.progress,"completed_at");
        return {
          cols:[{ k:"month", label:"Month" }, numCol("signups","Sign-ups"), numCol("enrols","Enrolments"), numCol("lessons","Lessons completed"), numCol("completed","Courses completed"), numCol("certs","Certificates"), numCol("leads","Leads")],
          rows: lastMonths(12).map(function(mo){ return { month:mo, signups:su[mo]||0, enrols:en[mo]||0, lessons:lp[mo]||0, completed:co[mo]||0, certs:ce[mo]||0, leads:le[mo]||0 }; })
        };
      }
    },
    {
      id:"lead_funnel", title:"Lead funnel", desc:"Where enquiries stand, and how many convert.",
      build:function(D){
        var total = D.leads.length, c = A.countBy(D.leads, "status");
        return {
          cols:[{ k:"status", label:"Stage" }, numCol("count","Leads"), pctCol("share","Share of all"), { k:"latest", label:"Most recent", cls:"muted" }],
          rows: ["new","contacted","qualified","won","lost"].map(function(s){
            var latest = D.leads.filter(function(l){ return l.status === s; }).map(function(l){ return l.created_at; }).sort().pop();
            return { status:s, count:c[s]||0, share: total ? A.pct(c[s]||0, total) : null, latest: latest ? A.date(latest) : "" };
          })
        };
      }
    },
    {
      id:"lead_sources", title:"Lead sources", desc:"Which channels the enquiries come from, and their win rate.",
      build:function(D){
        var by = {}; D.leads.forEach(function(l){ var s = l.source || "unknown"; (by[s] = by[s] || []).push(l); });
        return {
          cols:[{ k:"source", label:"Source" }, numCol("count","Leads"), numCol("won","Won"), numCol("lost","Lost"), pctCol("win","Win rate"), { k:"latest", label:"Most recent", cls:"muted" }],
          rows: Object.keys(by).map(function(s){ var L = by[s], w = L.filter(function(l){ return l.status === "won"; }).length, lo = L.filter(function(l){ return l.status === "lost"; }).length;
            return { source:s, count:L.length, won:w, lost:lo, win:(w+lo) ? A.pct(w, w+lo) : null, latest:A.date(L.map(function(l){ return l.created_at; }).sort().pop()) }; }).sort(function(a,b){ return b.count - a.count; })
        };
      }
    },
    {
      id:"certificates_by_course", title:"Certificates by course", desc:"Issued, valid and revoked certificates per course, with average score.",
      build:function(D){
        return {
          cols:[{ k:"title", label:"Course" }, numCol("issued","Issued"), numCol("valid","Valid"), numCol("revoked","Revoked"), pctCol("avg_score","Avg score"), { k:"first", label:"First issued", cls:"muted" }, { k:"last", label:"Last issued", cls:"muted" }],
          rows: D.courses.map(function(c){ var L = D.certs.filter(function(x){ return x.course_id === c.id; }), dates = L.map(function(x){ return x.issued_on; }).sort();
            return { title:A.L(c,"title"), issued:L.length, valid:L.filter(function(x){ return x.is_valid; }).length, revoked:L.filter(function(x){ return !x.is_valid; }).length, avg_score:avg(L.map(function(x){ return x.score; })), first: dates.length ? A.date(dates[0]) : "", last: dates.length ? A.date(dates[dates.length-1]) : "" }; })
            .filter(function(r){ return r.issued; })
        };
      }
    },
    {
      id:"trainer_load", title:"Trainer load", desc:"Courses assigned to each trainer, with their learners and completion rate.",
      build:function(D){
        var trainers = D.profiles.filter(function(p){ return p.role === "trainer" || p.role === "partner" || D.courses.some(function(c){ return c.trainer_id === p.id; }); });
        return {
          cols:[{ k:"name", label:"Trainer" }, { k:"email", label:"Email", cls:"muted" }, numCol("courses","Courses"), numCol("enrols","Learners"), numCol("completed","Completed"), pctCol("rate","Completion"), pctCol("avg_score","Avg score"), { k:"list", label:"Assigned courses", cls:"wrap muted" }],
          rows: trainers.map(function(p){ var cs = D.courses.filter(function(c){ return c.trainer_id === p.id; }), ids = {}; cs.forEach(function(c){ ids[c.id] = 1; });
            var en = D.enrols.filter(function(e){ return ids[e.course_id]; }), done = en.filter(function(e){ return e.status === "completed"; });
            return { name:p.full_name || "", email:p.email || "", courses:cs.length, enrols:en.length, completed:done.length, rate: en.length ? A.pct(done.length, en.length) : null, avg_score:avg(en.map(function(e){ return e.score; })), list:cs.map(function(c){ return A.L(c,"title"); }).join(", ") }; })
        };
      }
    },
    {
      id:"lesson_completion", title:"Lesson completion", desc:"Per lesson: how many enrolled learners have completed it, and quiz pass rates.",
      build:function(D){
        return {
          cols:[{ k:"course", label:"Course" }, numCol("order","#"), { k:"lesson", label:"Lesson" }, { k:"kind", label:"Kind", cls:"muted" }, numCol("enrolled","Enrolled"), numCol("completed","Completed"), pctCol("rate","Completion"), pctCol("avg_score","Avg quiz score"), pctCol("pass","Pass rate")],
          rows: D.lessons.map(function(l){ var en = D.enrolsPerCourse[l.course_id] || 0, P = D.progress.filter(function(p){ return p.lesson_id === l.id; }), scores = P.map(function(p){ return p.score; }).filter(function(s){ return s != null; });
            return { course:A.courseTitle(l.course_id), order:l.sort_order, lesson:A.L(l,"title"), kind:l.kind, enrolled:en, completed:P.length, rate: en ? A.pct(P.length, en) : null,
                     avg_score: l.kind === "quiz" ? avg(scores) : null, pass: l.kind === "quiz" && scores.length ? A.pct(scores.filter(function(s){ return s >= 70; }).length, scores.length) : null }; })
        };
      }
    },
    {
      id:"revenue_potential", title:"Catalogue value", desc:"Enrolments valued at list price, per course. Indicative only — the platform does not record payments.",
      build:function(D){
        return {
          cols:[{ k:"title", label:"Course" }, numCol("price","List price (SAR)"), numCol("enrols","Enrolments"), numCol("value","Enrolments × price (SAR)"), numCol("completed","Completed"), numCol("completed_value","Completed × price (SAR)")],
          rows: D.courses.map(function(c){ var en = D.enrolsPerCourse[c.id] || 0, done = D.enrols.filter(function(e){ return e.course_id === c.id && e.status === "completed"; }).length;
            return { title:A.L(c,"title"), price:c.price_sar, enrols:en, value:en * c.price_sar, completed:done, completed_value:done * c.price_sar }; }).sort(function(a,b){ return b.value - a.value; })
        };
      }
    }
  ];

  A.views.reports = function(){
    var D = A.D, cur = A.params.report || A.REPORTS[0].id;
    var rep = A.REPORTS.filter(function(r){ return r.id === cur; })[0] || A.REPORTS[0];
    var built = rep.build(D);
    function rows(){ return A.filterRows(built.rows, A.qval("q"), built.cols.map(function(c){ return function(r){ return c.raw ? c.raw(r) : r[c.k]; }; })); }
    function paint(){
      var cards = '<div class="cards">' + A.REPORTS.map(function(r){ return '<button class="card' + (r.id === rep.id ? " sel" : "") + '" data-rep="' + r.id + '"><b>' + esc(r.title) + "</b><span>" + esc(r.desc) + "</span></button>"; }).join("") + "</div>";
      A.out.innerHTML = A.pageHead("Reports", "Computed live from the data behind the other views. Every report exports to CSV.") + cards +
        '<div class="panel"><h3>' + esc(rep.title) + '<span class="spacer"></span><span class="muted" style="text-transform:none;letter-spacing:0;font-weight:500">' + built.rows.length + " rows</span></h3>" +
        '<div class="pad" style="padding-bottom:0">' + A.searchBar("Filter rows…", true) + "</div>" + A.table("rep_" + rep.id, built.cols, rows(), "Nothing to report yet.") + "</div>";
      A.wireCommon(paint); A.wireSort("rep_" + rep.id, paint); A.wireCsv("basera-report-" + rep.id + ".csv", built.cols, rows);
      Array.prototype.forEach.call(A.out.querySelectorAll("[data-rep]"), function(b){ b.addEventListener("click", function(){ A.go("reports", { report:b.getAttribute("data-rep") }); }); });
    }
    paint();
  };
})(window.BA);
