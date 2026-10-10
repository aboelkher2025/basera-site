(function(){
  "use strict";

  // ============================================================
  // Config — same project as index.html. The anon key is public
  // by design; row-level security is what protects the data.
  // ============================================================
  var SB_URL = "https://brlhihishoilxyslwubj.supabase.co";
  var SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJybGhpaGlzaG9pbHh5c2x3dWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMDYyNzEsImV4cCI6MjEwNDg4MjI3MX0.xOcmd_ANs4wN7S5Cy7tTl5-St-iX73q_Ro5wRydaH4I";
  var PASS_MARK = 70;   // percent needed to clear a quiz lesson

  // ============================================================
  // Translations
  // ============================================================
  var T = {
    en: {
      brand:"Basera", nav_dash:"My learning", nav_cat:"Catalogue", nav_certs:"Certificates",
      sign_out:"Sign out", back_site:"Back to the main site",
      foot:"Basera (بصيرة) — corporate training and learning platform, Saudi Arabia.",

      si_title:"Sign in", su_title:"Create an account",
      sp_title:"Set your password", sp_sub:"Choose the password you will use to sign in.", sp_btn:"Save password", sp_done:"Password saved. Welcome.",
      si_kicker:"Learning portal", si_sub:"Your courses, progress and certificates in one place.",
      f_email:"Work email", f_pass:"Password", f_name:"Full name",
      f_dept:"Department", f_join:"Company join code", f_join_hint:"Optional — links your account to your employer.",
      f_pass_hint:"At least 8 characters.",
      do_signin:"Sign in", do_signup:"Create account",
      no_account:"No account yet?", have_account:"Already have an account?",
      err_creds:"Email or password is not correct.",
      err_generic:"Something went wrong. Please try again.",
      err_fields:"Please fill in every required field.",
      err_pass_short:"Password must be at least 8 characters.",
      check_email:"Account created. Check your email to confirm it, then sign in.",

      nav_account:"Account", nav_panel:"Control panel",
      su_sub:"It takes a minute. You can enrol in a course straight afterwards.",
      sec_you:"About you", sec_sign:"How you sign in", sec_org:"Your company",
      sec_org_hint:"Leave this empty if you are signing up on your own.",
      optional:"Optional",
      f_pass2:"Confirm password", f_show:"Show", f_hide:"Hide",
      err_name:"Enter your full name.",
      err_email:"Enter a valid email address.",
      err_pass_match:"The two passwords do not match.",

      acc_title:"Account", acc_sub:"Your details and how you sign in.",
      acc_details:"Your details", acc_security:"Password",
      acc_type:"Account type", acc_company:"Company", acc_email_ro:"Sign-in email",
      acc_email_hint:"Contact Basera if you need this changed.",
      f_lang:"Preferred language",
      acc_save:"Save changes", acc_saved:"Saved.",
      f_pass_new:"New password", acc_pass_btn:"Update password",
      acc_pass_done:"Password updated.",
      acc_panel_p:"Your account can open the control panel.",
      acc_open_panel:"Open the control panel",
      role_super_admin:"Super admin", role_admin:"Admin", role_trainer:"Trainer",
      role_client_admin:"Company lead", role_learner:"Learner", role_partner:"Partner",

      dash_title:"My learning", dash_sub:"Pick up where you left off.",
      st_active:"In progress", st_done:"Completed", st_certs:"Certificates",
      no_courses:"You are not enrolled yet",
      no_courses_p:"Browse the catalogue and enrol in your first course.",
      browse:"Browse the catalogue",
      cat_title:"Catalogue", cat_sub:"Every published Basera course.",
      paths_title:"Learning paths", paths_sub:"Programmes that take you from one role to the next, one course at a time.", path_courses:"courses",
      next_session:"Next session", sessions:"Sessions", upcoming:"Upcoming sessions", no_sessions:"No sessions scheduled", announcements:"Announcements", ungrouped:"Other lessons", venue:"Venue", join_link:"Join online", trainer:"Trainer", expires:"Valid until", expired:"Expired", revoked:"Revoked", sp_confirm:"Confirm password", err_pass_match:"The two passwords do not match.", cat_search:"Search courses by title, skill or keyword", cat_none:"No course matches that. Try another word.",
      resume:"Continue", start:"Start", enrol:"Enrol", enrolled:"Enrolled", view:"Open",
      enrolling:"Enrolling…",
      complete_label:"complete",
      certs_title:"Certificates", certs_sub:"Issued automatically when you finish a course.",
      no_certs:"No certificates yet",
      no_certs_p:"Finish a course with a certificate to earn your first one.",
      issued:"Issued", score:"Score", holder:"Awarded to",
      lessons:"Lessons", lesson:"Lesson", of:"of",
      mark_done:"Mark as complete", done:"Completed", next:"Next", prev:"Previous",
      back_course:"Back to the course", back_dash:"Back to my learning",
      q_check:"Check answers", q_retry:"Try again", q_pass:"Passed", q_score:"You scored",
      q_need:"You need {n}% to clear this lesson.",
      q_pick:"Answer every question first.",
      course_done:"Course complete",
      course_done_p:"Your certificate has been issued — it is on your certificates page.",
      loading:"Loading…",
      not_found:"That page does not exist.",
      lv_b:"Beginner", lv_i:"Intermediate", lv_a:"Advanced",
      fm_live:"Live online", fm_self:"Self-paced", fm_site:"On site",
      hrs:"hrs", sar:"SAR", cert:"Certificate", min:"min"
    },
    ar: {
      brand:"بصيرة", nav_dash:"تعلّمي", nav_cat:"الدورات", nav_certs:"الشهادات",
      sign_out:"تسجيل الخروج", back_site:"العودة للموقع",
      foot:"بصيرة — تدريب الشركات ومنصة تعلّم، المملكة العربية السعودية.",

      si_title:"تسجيل الدخول", su_title:"إنشاء حساب",
      sp_title:"عيّن كلمة المرور", sp_sub:"اختر كلمة المرور التي ستستخدمها لتسجيل الدخول.", sp_btn:"حفظ كلمة المرور", sp_done:"تم حفظ كلمة المرور. أهلاً بك.",
      si_kicker:"منصة التعلّم", si_sub:"دوراتك وتقدمك وشهاداتك في مكان واحد.",
      f_email:"البريد الإلكتروني", f_pass:"كلمة المرور", f_name:"الاسم الكامل",
      f_dept:"الإدارة", f_join:"رمز انضمام الشركة", f_join_hint:"اختياري — يربط حسابك بجهة عملك.",
      f_pass_hint:"٨ أحرف على الأقل.",
      do_signin:"دخول", do_signup:"إنشاء الحساب",
      no_account:"ليس لديك حساب؟", have_account:"لديك حساب بالفعل؟",
      err_creds:"البريد الإلكتروني أو كلمة المرور غير صحيحة.",
      err_generic:"حدث خطأ. حاول مرة أخرى.",
      err_fields:"يرجى تعبئة جميع الحقول المطلوبة.",
      err_pass_short:"كلمة المرور يجب أن تكون ٨ أحرف على الأقل.",
      check_email:"تم إنشاء الحساب. تحقق من بريدك لتأكيده ثم سجّل الدخول.",

      nav_account:"حسابي", nav_panel:"لوحة التحكم",
      su_sub:"لن يستغرق سوى دقيقة، ويمكنك التسجيل في دورة بعدها مباشرة.",
      sec_you:"بياناتك", sec_sign:"بيانات الدخول", sec_org:"جهة عملك",
      sec_org_hint:"اتركه فارغاً إذا كنت تسجّل بصفتك الشخصية.",
      optional:"اختياري",
      f_pass2:"تأكيد كلمة المرور", f_show:"إظهار", f_hide:"إخفاء",
      err_name:"أدخل اسمك الكامل.",
      err_email:"أدخل بريداً إلكترونياً صحيحاً.",
      err_pass_match:"كلمتا المرور غير متطابقتين.",

      acc_title:"حسابي", acc_sub:"بياناتك وطريقة دخولك.",
      acc_details:"بياناتك", acc_security:"كلمة المرور",
      acc_type:"نوع الحساب", acc_company:"الشركة", acc_email_ro:"بريد الدخول",
      acc_email_hint:"تواصل مع بصيرة إذا احتجت تغييره.",
      f_lang:"اللغة المفضلة",
      acc_save:"حفظ التغييرات", acc_saved:"تم الحفظ.",
      f_pass_new:"كلمة المرور الجديدة", acc_pass_btn:"تحديث كلمة المرور",
      acc_pass_done:"تم تحديث كلمة المرور.",
      acc_panel_p:"يمكن لحسابك فتح لوحة التحكم.",
      acc_open_panel:"افتح لوحة التحكم",
      role_super_admin:"مدير عام", role_admin:"مشرف", role_trainer:"مدرب",
      role_client_admin:"مسؤول الشركة", role_learner:"متدرب", role_partner:"شريك",

      dash_title:"تعلّمي", dash_sub:"أكمل من حيث توقفت.",
      st_active:"قيد التقدم", st_done:"مكتملة", st_certs:"الشهادات",
      no_courses:"لم تسجّل في أي دورة بعد",
      no_courses_p:"تصفح الدورات وسجّل في أول دورة لك.",
      browse:"تصفح الدورات",
      cat_title:"الدورات", cat_sub:"جميع دورات بصيرة المنشورة.",
      paths_title:"المسارات التعليمية", paths_sub:"برامج تنقلك من دور إلى الذي يليه، دورة بعد دورة.", path_courses:"دورات",
      next_session:"الجلسة القادمة", sessions:"الجلسات", upcoming:"الجلسات القادمة", no_sessions:"لا جلسات مجدولة", announcements:"الإعلانات", ungrouped:"دروس أخرى", venue:"المكان", join_link:"انضم عبر الإنترنت", trainer:"المدرب", expires:"صالحة حتى", expired:"منتهية", revoked:"ملغاة", sp_confirm:"تأكيد كلمة المرور", err_pass_match:"كلمتا المرور غير متطابقتين.", cat_search:"ابحث بالعنوان أو المهارة أو الكلمة المفتاحية", cat_none:"لا توجد دورة مطابقة. جرّب كلمة أخرى.",
      resume:"متابعة", start:"ابدأ", enrol:"سجّل", enrolled:"مسجَّل", view:"افتح",
      enrolling:"جارٍ التسجيل…",
      complete_label:"مكتمل",
      certs_title:"الشهادات", certs_sub:"تصدر تلقائياً عند إكمال الدورة.",
      no_certs:"لا توجد شهادات بعد",
      no_certs_p:"أكمل دورة تمنح شهادة لتحصل على أول شهادة.",
      issued:"تاريخ الإصدار", score:"الدرجة", holder:"ممنوحة إلى",
      lessons:"الدروس", lesson:"الدرس", of:"من",
      mark_done:"تحديد كمكتمل", done:"مكتمل", next:"التالي", prev:"السابق",
      back_course:"العودة للدورة", back_dash:"العودة لتعلّمي",
      q_check:"تحقق من الإجابات", q_retry:"حاول مرة أخرى", q_pass:"ناجح", q_score:"درجتك",
      q_need:"تحتاج {n}٪ لاجتياز هذا الدرس.",
      q_pick:"أجب عن جميع الأسئلة أولاً.",
      course_done:"اكتملت الدورة",
      course_done_p:"تم إصدار شهادتك — تجدها في صفحة الشهادات.",
      loading:"جارٍ التحميل…",
      not_found:"هذه الصفحة غير موجودة.",
      lv_b:"مبتدئ", lv_i:"متوسط", lv_a:"متقدم",
      fm_live:"أونلاين مباشر", fm_self:"ذاتي", fm_site:"في الموقع",
      hrs:"ساعة", sar:"ريال", cert:"شهادة", min:"دقيقة"
    }
  };

  var CUR = localStorage.getItem("basera_lang") || "en";
  function t(k){ return (T[CUR] && T[CUR][k]) || T.en[k] || k; }

  function setLang(lang){
    CUR = lang;
    localStorage.setItem("basera_lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach(function(el){
      var v = T[lang][el.dataset.i18n];
      if (v !== undefined) el.textContent = v;
    });
    document.querySelectorAll(".lang button").forEach(function(b){
      b.classList.toggle("active", b.dataset.lang === lang);
    });
    render();
  }

  // ============================================================
  // Small helpers
  // ============================================================
  function esc(s){
    return String(s == null ? "" : s)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }
  function L(row, field){                    // localised column picker
    return row[field + "_" + CUR] || row[field + "_en"] || "";
  }
  function paras(text){
    return String(text || "").split(/\n{2,}/).filter(Boolean)
      .map(function(p){ return "<p>" + esc(p).replace(/\n/g,"<br>") + "</p>"; }).join("");
  }
  function initials(name){
    var parts = String(name || "?").trim().split(/\s+/);
    return ((parts[0] || "?")[0] + (parts.length > 1 ? parts[parts.length-1][0] : "")).toUpperCase();
  }
  function el(id){ return document.getElementById(id); }

  // ============================================================
  // Session — stored locally, refreshed when the token expires
  // ============================================================
  var SESSION_KEY = "basera_session";
  var session = null;
  try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch(e){ session = null; }

  function saveSession(s){
    session = s;
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  }
  function signedIn(){ return !!(session && session.access_token); }

  function authHeaders(){
    var h = { "apikey": SB_KEY, "Content-Type": "application/json" };
    h["Authorization"] = "Bearer " + (signedIn() ? session.access_token : SB_KEY);
    return h;
  }

  async function refreshSession(){
    if (!session || !session.refresh_token) return false;
    var r = await fetch(SB_URL + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { "apikey": SB_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    if (!r.ok) { saveSession(null); return false; }
    saveSession(await r.json());
    return true;
  }

  // REST call with one automatic retry after a token refresh.
  async function rest(path, opts, retried){
    opts = opts || {};
    var r = await fetch(SB_URL + "/rest/v1/" + path, {
      method: opts.method || "GET",
      headers: Object.assign(authHeaders(), opts.headers || {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    if (r.status === 401 && !retried && session) {
      if (await refreshSession()) return rest(path, opts, true);
      saveSession(null);
      location.hash = "#/signin";
      throw new Error("signed out");
    }
    if (!r.ok) {
      var detail = await r.text().catch(function(){ return ""; });
      throw new Error("REST " + r.status + " " + detail);
    }
    if (r.status === 204) return null;
    return r.json().catch(function(){ return null; });
  }

  async function auth(endpoint, body){
    var r = await fetch(SB_URL + "/auth/v1/" + endpoint, {
      method: "POST",
      headers: { "apikey": SB_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    var data = await r.json().catch(function(){ return {}; });
    if (!r.ok) {
      var e = new Error(data.error_description || data.msg || data.message || "auth error");
      e.status = r.status;
      throw e;
    }
    return data;
  }

  // ============================================================
  // Data access
  // ============================================================
  // Account types with at least one section in the control panel. Kept in
  // step with A.ROUTES in admin.js — a learner or partner has nothing to
  // manage, so the link is not offered to them.
  var PANEL_ROLES = ["super_admin", "admin", "trainer", "client_admin"];
  function roleLabel(role){
    var k = "role_" + String(role || "");
    var s = t(k);
    return s === k ? (role || "—") : s;
  }

  var cache = { profile:null, courses:null };

  function getProfile(){
    if (cache.profile) return Promise.resolve(cache.profile);
    return rest("profiles?select=id,full_name,email,role,org_id,department,lang&limit=1")
      .then(function(rows){ cache.profile = (rows && rows[0]) || null; return cache.profile; });
  }
  function getCourses(){
    if (cache.courses) return Promise.resolve(cache.courses);
    return rest("courses?select=id,title_en,title_ar,summary_en,summary_ar,domain,level,format,hours,price_sar,has_certificate&is_published=eq.true&order=sort_order")
      .then(function(rows){ cache.courses = rows || []; return cache.courses; });
  }
  function getEnrollments(){
    return rest("enrollments?select=id,course_id,cohort_id,org_id,status,progress_pct,score,enrolled_at,completed_at&order=enrolled_at.desc");
  }
  function getLessons(courseId){
    return rest("lessons?select=id,course_id,title_en,title_ar,kind,body_en,body_ar,media_url,duration_min,quiz,sort_order&course_id=eq." +
      encodeURIComponent(courseId) + "&order=sort_order");
  }
  function getProgress(enrollmentId){
    return rest("lesson_progress?select=lesson_id,score,completed_at&enrollment_id=eq." + encodeURIComponent(enrollmentId));
  }
  function getModules(courseId){
    return rest("course_modules?select=*&course_id=eq." + encodeURIComponent(courseId) + "&order=sort_order").catch(function(){ return []; });
  }
  function getCohorts(){
    return rest("cohorts?select=*&order=starts_at.asc.nullslast").catch(function(){ return []; });
  }
  function getSessions(){
    return rest("cohort_sessions?select=*&order=starts_at.asc").catch(function(){ return []; });
  }
  function getAnnouncements(){
    return rest("announcements?select=*&order=published_at.desc&limit=10").catch(function(){ return []; });
  }
  function getPaths(){
    return Promise.all([
      rest("learning_paths?select=*&is_published=eq.true&order=sort_order").catch(function(){ return []; }),
      rest("learning_path_courses?select=*&order=sort_order").catch(function(){ return []; })
    ]);
  }
  function getCertificates(){
    return rest("certificates?select=code,holder_name,course_id,issued_on,score,is_valid,valid_until&order=issued_on.desc");
  }
  function enrol(courseId){
    return rest("enrollments", {
      method: "POST",
      headers: { "Prefer": "return=representation" },
      body: { user_id: session.user.id, course_id: courseId }
    });
  }
  // Composite primary key (enrollment_id, lesson_id) — upsert so a
  // retaken quiz updates the score instead of failing on conflict.
  function markComplete(enrollmentId, lessonId, score){
    return rest("lesson_progress", {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
      body: { enrollment_id: enrollmentId, lesson_id: lessonId, score: (score == null ? null : score) }
    });
  }

  // ============================================================
  // Chrome
  // ============================================================
  function paintChrome(){
    var nav = el("nav"), who = el("who"), menuBtn = el("menuBtn");
    nav.hidden = !signedIn();
    who.hidden = !signedIn();
    menuBtn.hidden = !signedIn();
    if (signedIn()) {
      var name = (cache.profile && cache.profile.full_name) ||
                 (session.user && session.user.email) || "?";
      el("avatar").textContent = initials(name);
      el("avatar").title = name;
    }
    // The control panel is only offered to account types that have
    // something to manage there; the panel re-checks this itself, and
    // RLS decides what they can actually see once inside.
    var panel = el("panelLink");
    if (panel) panel.hidden = !(signedIn() && cache.profile && PANEL_ROLES.indexOf(cache.profile.role) >= 0);
    var route = (location.hash || "").split("/")[1] || "";
    document.querySelectorAll("[data-nav]").forEach(function(a){
      a.classList.toggle("on", a.dataset.nav === route);
    });
  }

  // ============================================================
  // Views
  // ============================================================
  var view = el("view");
  function show(html){
    // A view that started before the session was cleared must not paint over
    // the sign-in form that the hash change already drew.
    if (!signedIn() && html.indexOf('id="authForm"') === -1) return;
    view.innerHTML = html; paintChrome();
  }
  function busy(){ view.innerHTML = '<div class="loading"><span class="spin"></span></div>'; }

  // ---------- Auth ----------
  function viewAuth(mode){
    var isUp = mode === "signup";
    show(
      '<div class="form">' +
        '<div class="page-head" style="text-align:center">' +
          '<div class="kicker">' + esc(t("si_kicker")) + '</div>' +
          '<h1>' + esc(isUp ? t("su_title") : t("si_title")) + '</h1>' +
          '<p>' + esc(isUp ? t("su_sub") : t("si_sub")) + '</p>' +
        '</div>' +
        '<div id="authMsg"></div>' +
        '<form id="authForm" novalidate>' +
          (isUp
            ? group(t("sec_you"),
                field("name",  t("f_name"),  "text",  "", true) +
                field("email", t("f_email"), "email", "", true) +
                field("dept",  t("f_dept"),  "text",  "", false)) +
              group(t("sec_sign"),
                field("pass",  t("f_pass"),  "password", t("f_pass_hint"), true, "new-password") +
                field("pass2", t("f_pass2"), "password", "", true, "new-password")) +
              group(t("sec_org"),
                field("join", t("f_join"), "text", t("sec_org_hint"), false))
            : field("email", t("f_email"), "email", "", true) +
              field("pass",  t("f_pass"),  "password", "", true)) +
          '<button class="btn btn-primary" style="width:100%;margin-top:6px" type="submit" id="authBtn">' +
            esc(isUp ? t("do_signup") : t("do_signin")) +
          '</button>' +
        '</form>' +
        '<p style="text-align:center;margin-top:16px;font-size:.9rem;color:var(--ink-2)">' +
          esc(isUp ? t("have_account") : t("no_account")) + ' ' +
          '<a href="#/' + (isUp ? "signin" : "signup") + '" style="color:var(--petrol);font-weight:500;text-decoration:underline">' +
            esc(isUp ? t("do_signin") : t("do_signup")) +
          '</a>' +
        '</p>' +
      '</div>'
    );

    el("authForm").addEventListener("submit", function(ev){
      ev.preventDefault();
      submitAuth(isUp);
    });
  }

  // A titled block of related fields. Sign-up is long enough that one flat
  // column of inputs reads as a wall; grouping says what each part is for.
  function group(title, inner){
    return '<fieldset class="fgroup"><legend>' + esc(title) + '</legend>' + inner + '</fieldset>';
  }

  function field(id, label, type, hint, required, autocomplete){
    var ac = autocomplete ||
      (type === "password" ? "current-password" : (id === "email" ? "email" : (id === "name" ? "name" : "off")));
    return '<div class="field" data-field="' + id + '">' +
      '<label for="f_' + id + '">' + esc(label) +
        (required ? "" : ' <span class="optional">' + esc(t("optional")) + '</span>') + '</label>' +
      '<input id="f_' + id + '" type="' + type + '" autocomplete="' + ac + '">' +
      (hint ? '<div class="hint">' + esc(hint) + '</div>' : "") +
      '<div class="ferr" hidden></div>' +
    '</div>';
  }

  // Errors sit under the field they belong to. The banner above the form is
  // kept for what the server says, which belongs to no single field.
  function fieldErr(id, msg){
    var w = document.querySelector('[data-field="' + id + '"] .ferr');
    if (!w) return;
    w.textContent = msg || "";
    w.hidden = !msg;
    var input = el("f_" + id);
    if (input) input.classList.toggle("bad", !!msg);
    var _in = el("f_" + id), _er = _in && _in.parentNode.querySelector(".ferr");
    if (_er) { _er.setAttribute("role", "alert"); _er.id = _er.id || ("err_" + id); if (_in) _in.setAttribute("aria-describedby", _er.id); }
  }
  function clearErrors(){
    Array.prototype.forEach.call(document.querySelectorAll(".ferr"), function(w){
      w.hidden = true; w.textContent = "";
    });
    Array.prototype.forEach.call(document.querySelectorAll(".field input"), function(i){
      i.classList.remove("bad");
    });
    var m = el("authMsg"); if (m) m.innerHTML = "";
  }
  function validEmail(s){ return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s); }

  function authMsg(text, kind){
    el("authMsg").innerHTML = '<div class="note ' + (kind || "") + '">' + esc(text) + '</div>';
  }

  // Invitation and password-reset links land here with the session in the URL.
  function viewSetPassword(){
    show(
      '<div class="form">' +
        '<div class="page-head" style="text-align:center">' +
          '<div class="kicker">' + esc(t("si_kicker")) + '</div>' +
          '<h1>' + esc(t("sp_title")) + '</h1>' +
          '<p>' + esc(t("sp_sub")) + '</p>' +
        '</div>' +
        '<div id="authMsg"></div>' +
        '<form id="authForm" novalidate>' +
          field("pass", t("f_pass"), "password", t("f_pass_hint"), true) +
          field("pass2", t("sp_confirm"), "password", "", true) +
          '<button class="btn btn-primary" style="width:100%;margin-top:6px" type="submit" id="authBtn">' + esc(t("sp_btn")) + '</button>' +
        '</form>' +
      '</div>');
    el("f_pass").setAttribute("autocomplete", "new-password");
    if (el("f_pass2")) el("f_pass2").setAttribute("autocomplete", "new-password");
    el("authForm").addEventListener("submit", async function(ev){
      ev.preventDefault();
      var pass = el("f_pass").value || "";
      if (pass.length < 8) return authMsg(t("err_pass_short"), "bad");
      if (el("f_pass2") && el("f_pass2").value !== pass) return authMsg(t("err_pass_match"), "bad");
      var btn = el("authBtn"); btn.disabled = true;
      try {
        var r = await fetch(SB_URL + "/auth/v1/user", {
          method: "PUT", headers: authHeaders(), body: JSON.stringify({ password: pass })
        });
        var data = await r.json().catch(function(){ return {}; });
        if (!r.ok) throw new Error(data.error_description || data.msg || data.message || "Could not save password");
        authMsg(t("sp_done"), "ok");
        setTimeout(function(){ location.hash = "#/dashboard"; }, 700);
      } catch (err) {
        authMsg(err.message, "bad"); btn.disabled = false;
      }
    });
  }

  // Supabase puts the tokens of an invite / recovery / magic link in the
  // URL fragment. Capture them into the session and go set a password.
  function captureAuthRedirect(){
    var h = location.hash || "";
    if (h.indexOf("access_token=") === -1) return false;
    var p = {};
    h.replace(/^#/, "").split("&").forEach(function(kv){
      var i = kv.indexOf("="); if (i > 0) p[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1));
    });
    if (!p.access_token) return false;
    saveSession({ access_token: p.access_token, refresh_token: p.refresh_token || null, token_type: p.token_type || "bearer", expires_in: Number(p.expires_in) || 3600 });
    cache.profile = null;
    var needsPassword = p.type === "invite" || p.type === "recovery" || p.type === "magiclink" || p.type === "signup";
    history.replaceState(null, "", location.pathname + (needsPassword ? "#/setpassword" : "#/dashboard"));
    return true;
  }

  async function submitAuth(isUp){
    var btn = el("authBtn");
    var email = (el("f_email").value || "").trim();
    var pass  = el("f_pass").value || "";
    var name  = isUp ? (el("f_name").value || "").trim() : "";

    clearErrors();
    var firstBad = null;
    function bad(id, msg){ fieldErr(id, msg); if (!firstBad) firstBad = id; }

    if (isUp && !name) bad("name", t("err_name"));
    if (!email) bad("email", t("err_fields"));
    else if (!validEmail(email)) bad("email", t("err_email"));
    if (!pass) bad("pass", t("err_fields"));
    else if (isUp && pass.length < 8) bad("pass", t("err_pass_short"));
    if (isUp && pass && (el("f_pass2").value || "") !== pass) bad("pass2", t("err_pass_match"));

    if (firstBad) {
      var f = el("f_" + firstBad);
      if (f) f.focus();
      return;
    }

    btn.disabled = true;
    var original = btn.textContent;
    btn.innerHTML = '<span class="spin"></span>';

    try {
      var data;
      if (isUp) {
        var meta = { full_name: name, lang: CUR };
        var dept = (el("f_dept").value || "").trim();
        var join = (el("f_join").value || "").trim();
        if (dept) meta.department = dept;
        if (join) meta.join_code = join.toUpperCase();
        data = await auth("signup", { email: email, password: pass, data: meta });
        // With email confirmation on, signup returns a user but no token.
        if (!data.access_token) {
          btn.disabled = false; btn.textContent = original;
          return authMsg(t("check_email"), "ok");
        }
      } else {
        data = await auth("token?grant_type=password", { email: email, password: pass });
      }
      saveSession(data);
      cache.profile = null;
      await getProfile().catch(function(){});
      location.hash = "#/dashboard";
    } catch (err) {
      btn.disabled = false; btn.textContent = original;
      var msg = String(err.message || "");
      authMsg(/invalid|credential|grant/i.test(msg) ? t("err_creds") : (msg || t("err_generic")), "bad");
    }
  }

  // ---------- Dashboard ----------
  async function viewDashboard(){
    busy();
    var res = await Promise.all([getEnrollments(), getCourses(), getCertificates(), getAnnouncements(), getCohorts(), getSessions()]);
    var enrs = res[0] || [], courses = res[1] || [], certs = res[2] || [], anns = res[3] || [], cohorts = res[4] || [], sessions = res[5] || [];
    var byId = {};
    courses.forEach(function(c){ byId[c.id] = c; });

    var active = enrs.filter(function(e){ return e.status !== "completed"; });
    var done   = enrs.filter(function(e){ return e.status === "completed"; });

    var body;
    if (!enrs.length) {
      body = '<div class="empty">' +
        '<h3>' + esc(t("no_courses")) + '</h3>' +
        '<p style="margin-bottom:18px">' + esc(t("no_courses_p")) + '</p>' +
        '<a class="btn btn-primary" href="#/catalogue">' + esc(t("browse")) + '</a>' +
      '</div>';
    } else {
      body = '<div class="grid g3">' + enrs.map(function(e){
        var c = byId[e.course_id];
        if (!c) return "";
        var pct = e.progress_pct || 0;
        return '<article class="card">' +
          '<div class="meta"><span>' + esc(t("lv_" + c.level)) + '</span><span>' + esc(t("fm_" + c.format)) + '</span></div>' +
          '<h3>' + esc(L(c, "title")) + '</h3>' +
          '<div class="prog-row">' +
            '<div class="prog' + (pct >= 100 ? " done" : "") + '"><i style="width:' + pct + '%"></i></div>' +
            '<span>' + pct + '% ' + esc(t("complete_label")) + '</span>' +
          '</div>' +
          '<div class="foot">' +
            '<a class="btn btn-dark btn-sm" href="#/course/' + encodeURIComponent(c.id) + '">' +
              esc(pct > 0 ? t("resume") : t("start")) +
            '</a>' +
          '</div>' +
        '</article>';
      }).join("") + '</div>';
    }

    var myCohorts = {}; enrs.forEach(function(e){ if (e.cohort_id) myCohorts[e.cohort_id] = e; });
    var now = Date.now();
    var upcoming = sessions.filter(function(s){ return myCohorts[s.cohort_id] && new Date(s.starts_at).getTime() >= now; }).slice(0, 4);
    var side = "";
    if (anns.length) side += '<div class="panel-list"><h4>' + esc(t("announcements")) + '</h4>' + anns.slice(0, 5).map(function(a){
      return '<div class="ann"><b>' + esc(L(a, "title")) + '</b>' + (L(a, "body") ? '<p>' + esc(L(a, "body")) + '</p>' : "") + '<small>' + esc(fmtDate(a.published_at)) + '</small></div>';
    }).join("") + '</div>';
    if (upcoming.length) side += '<div class="panel-list"><h4>' + esc(t("upcoming")) + '</h4>' + upcoming.map(function(s){
      var k = cohorts.filter(function(x){ return x.id === s.cohort_id; })[0] || {};
      return '<div class="ann"><b>' + esc(fmtDate(s.starts_at)) + '</b><p>' + esc(L(byId[k.course_id] || {}, "title") || "") + (s.title ? " · " + esc(s.title) : "") + (k.location ? " · " + esc(k.location) : "") + '</p></div>';
    }).join("") + '</div>';
    show(
      '<div class="page-head"><h1>' + esc(t("dash_title")) + '</h1><p>' + esc(t("dash_sub")) + '</p></div>' +
      '<div class="grid g3" style="margin-bottom:28px">' +
        stat(active.length, t("st_active")) +
        stat(done.length, t("st_done")) +
        stat(certs.length, t("st_certs")) +
      '</div>' + (side ? '<div class="dash-split"><div>' + body + '</div><aside>' + side + '</aside></div>' : body)
    );
  }
  function stat(n, label){
    return '<div class="stat"><div class="n">' + n + '</div><div class="l">' + esc(label) + '</div></div>';
  }

  // ---------- Catalogue ----------
  async function viewCatalogue(){
    busy();
    var res = await Promise.all([getCourses(), getEnrollments(), getPaths()]);
    var courses = res[0] || [], enrs = res[1] || [], paths = (res[2] && res[2][0]) || [], pathRows = (res[2] && res[2][1]) || [];
    var mine = {};
    enrs.forEach(function(e){ mine[e.course_id] = e; });
    var byCourse = {}; courses.forEach(function(c){ byCourse[c.id] = c; });
    function pathsBlock(){
      if (!paths.length) return "";
      return '<div class="page-head" style="margin-top:8px"><div class="kicker">' + esc(t("paths_title")) + '</div><p>' + esc(t("paths_sub")) + '</p></div>' +
        '<div class="grid g2" style="margin-bottom:34px">' + paths.map(function(p){
          var cs = pathRows.filter(function(r){ return r.path_id === p.id; }).map(function(r){ return byCourse[r.course_id]; }).filter(Boolean);
          var doneN = cs.filter(function(c){ return mine[c.id] && mine[c.id].status === "completed"; }).length;
          return '<article class="card path"><h3>' + esc(L(p, "title")) + '</h3>' + (L(p, "summary") ? '<p>' + esc(L(p, "summary")) + '</p>' : "") +
            '<ol class="path-steps">' + cs.map(function(c){ var e = mine[c.id]; return '<li class="' + (e && e.status === "completed" ? "done" : e ? "active" : "") + '"><a href="#/course/' + encodeURIComponent(c.id) + '">' + esc(L(c, "title")) + '</a></li>'; }).join("") + '</ol>' +
            '<div class="prog-row"><div class="prog' + (cs.length && doneN === cs.length ? " done" : "") + '"><i style="width:' + (cs.length ? Math.round(doneN * 100 / cs.length) : 0) + '%"></i></div><span>' + doneN + ' / ' + cs.length + ' ' + esc(t("path_courses")) + '</span></div></article>';
        }).join("") + '</div>';
    }

    function card(c){
      var e = mine[c.id];
      return '<article class="card">' +
        '<div class="meta">' +
          '<span>' + esc(t("lv_" + c.level)) + '</span>' +
          '<span>' + esc(t("fm_" + c.format)) + '</span>' +
          '<span>' + c.hours + " " + esc(t("hrs")) + '</span>' +
          (c.has_certificate ? '<span>' + esc(t("cert")) + '</span>' : "") +
        '</div>' +
        '<h3>' + esc(L(c, "title")) + '</h3>' +
        '<p>' + esc(L(c, "summary")) + '</p>' +
        '<div class="foot">' +
          (e
            ? '<a class="btn btn-ghost btn-sm" href="#/course/' + encodeURIComponent(c.id) + '">' + esc(t("view")) + '</a>'
            : '<button class="btn btn-primary btn-sm" data-enrol="' + esc(c.id) + '">' + esc(t("enrol")) + '</button>') +
        '</div>' +
      '</article>';
    }
    function matches(c, term){
      if (!term) return true;
      var hay = [c.title_en, c.title_ar, c.summary_en, c.summary_ar, c.keywords, c.domain].join(" ").toLowerCase();
      return hay.indexOf(term) !== -1;
    }
    function grid(term){
      var list = courses.filter(function(c){ return matches(c, term); });
      return list.length
        ? '<div class="grid g3">' + list.map(card).join("") + '</div>'
        : '<div class="empty"><h3>' + esc(t("cat_none")) + '</h3></div>';
    }

    show(
      '<div class="page-head"><h1>' + esc(t("cat_title")) + '</h1><p>' + esc(t("cat_sub")) + '</p></div>' +
      pathsBlock() +
      '<div class="cat-search"><input type="search" id="catSearch" placeholder="' + esc(t("cat_search")) + '" aria-label="' + esc(t("cat_search")) + '"></div>' +
      '<div id="catGrid">' + grid("") + '</div>'
    );

    function wireEnrol(){
      view.querySelectorAll("[data-enrol]").forEach(function(btn){
        btn.addEventListener("click", async function(){
          btn.disabled = true;
          btn.textContent = t("enrolling");
          try {
            await enrol(btn.dataset.enrol);
            location.hash = "#/course/" + encodeURIComponent(btn.dataset.enrol);
          } catch (err) {
            btn.disabled = false;
            btn.textContent = t("enrol");
            alert(t("err_generic"));
          }
        });
      });
    }
    wireEnrol();
    el("catSearch").addEventListener("input", function(){
      el("catGrid").innerHTML = grid(el("catSearch").value.trim().toLowerCase());
      wireEnrol();
    });
  }

  // ---------- Course ----------
  async function viewCourse(courseId){
    busy();
    var res = await Promise.all([getCourses(), getEnrollments(), getLessons(courseId), getModules(courseId), getCohorts(), getSessions()]);
    var courses = res[0] || [], enrs = res[1] || [], lessons = res[2] || [], modules = res[3] || [], cohorts = res[4] || [], sessions = res[5] || [];
    var course = courses.filter(function(c){ return c.id === courseId; })[0];
    if (!course) return show('<div class="empty"><h3>' + esc(t("not_found")) + '</h3></div>');

    var e = enrs.filter(function(x){ return x.course_id === courseId; })[0];
    if (!e) {                                   // not enrolled — enrol, then reload
      try { var created = await enrol(courseId); e = created && created[0]; }
      catch (err) { return show('<div class="empty"><h3>' + esc(t("err_generic")) + '</h3></div>'); }
    }

    var prog = await getProgress(e.id) || [];
    var doneSet = {};
    prog.forEach(function(p){ doneSet[p.lesson_id] = true; });
    var pct = e.progress_pct || 0;

    show(
      '<div class="page-head">' +
        '<div class="kicker"><a href="#/dashboard" style="text-decoration:underline">' + esc(t("back_dash")) + '</a></div>' +
        '<h1>' + esc(L(course, "title")) + '</h1>' +
        '<p>' + esc(L(course, "summary")) + '</p>' +
      '</div>' +
      (pct >= 100
        ? '<div class="note ok"><b>' + esc(t("course_done")) + '.</b> ' + esc(t("course_done_p")) + '</div>'
        : '') +
      '<div class="prog-row" style="margin-bottom:26px;max-width:460px">' +
        '<div class="prog' + (pct >= 100 ? " done" : "") + '"><i style="width:' + pct + '%"></i></div>' +
        '<span>' + pct + '% ' + esc(t("complete_label")) + '</span>' +
      '</div>' +
      sessionBlock(e, cohorts, sessions) +
      '<div class="toc" style="max-width:640px;position:static">' +
        '<h4>' + esc(t("lessons")) + ' · ' + lessons.length + '</h4>' +
        outline(courseId, lessons, modules, doneSet) +
      '</div>'
    );
  }

  // Lessons grouped by module, in module order; ungrouped lessons last.
  function outline(courseId, lessons, modules, doneSet){
    var groups = modules.slice().sort(function(a,b){ return a.sort_order - b.sort_order; }).map(function(m){ return { title: L(m, "title"), items: lessons.filter(function(l){ return l.module_id === m.id; }) }; });
    var rest_ = lessons.filter(function(l){ return !l.module_id || !modules.some(function(m){ return m.id === l.module_id; }); });
    if (rest_.length) groups.push({ title: groups.length ? t("ungrouped") : "", items: rest_ });
    var n = 0;
    return groups.map(function(g){
      var done = g.items.filter(function(l){ return doneSet[l.id]; }).length;
      return (g.title ? '<div class="toc-group"><span>' + esc(g.title) + '</span><span>' + done + " / " + g.items.length + '</span></div>' : "") +
        g.items.map(function(l){
          n++;
          return '<a href="#/lesson/' + encodeURIComponent(courseId) + '/' + encodeURIComponent(l.id) + '">' +
            '<span class="tick' + (doneSet[l.id] ? " done" : "") + '">' + (doneSet[l.id] ? "✓" : "") + '</span>' +
            '<span style="flex:1">' + esc(L(l, "title")) +
              '<span style="display:block;color:var(--ink-2);font-size:.8rem">' + n + " " + esc(t("of")) + " " + lessons.length + " · " +
                (l.kind === "quiz" ? esc(t("q_check")) : (l.duration_min + " " + esc(t("min")))) + '</span></span></a>';
        }).join("");
    }).join("");
  }
  // The cohort this enrolment sits in, with its next session.
  function sessionBlock(e, cohorts, sessions){
    var k = e && e.cohort_id ? cohorts.filter(function(x){ return x.id === e.cohort_id; })[0] : null;
    if (!k) return "";
    var now = Date.now();
    var mine = sessions.filter(function(s){ return s.cohort_id === k.id; });
    var next = mine.filter(function(s){ return new Date(s.starts_at).getTime() >= now; })[0];
    return '<div class="session-card">' +
      '<div class="kicker">' + esc(k.title || t("sessions")) + '</div>' +
      '<div class="session-row"><b>' + esc(t("next_session")) + '</b><span>' + (next ? esc(fmtDate(next.starts_at)) + (next.title ? " · " + esc(next.title) : "") : esc(t("no_sessions"))) + '</span></div>' +
      (k.location ? '<div class="session-row"><b>' + esc(t("venue")) + '</b><span>' + esc(k.location) + '</span></div>' : "") +
      (k.meeting_url ? '<a class="btn btn-primary btn-sm" href="' + esc(k.meeting_url) + '" target="_blank" rel="noopener">' + esc(t("join_link")) + '</a>' : "") +
    '</div>';
  }
  function fmtDate(s){
    var d = new Date(s); if (isNaN(d.getTime())) return "";
    try { return d.toLocaleString(CUR === "ar" ? "ar-SA" : "en-GB", { weekday:"short", day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }); } catch(e){ return d.toISOString().slice(0,16).replace("T"," "); }
  }

  // ---------- Lesson ----------
  async function viewLesson(courseId, lessonId){
    busy();
    var res = await Promise.all([getCourses(), getEnrollments(), getLessons(courseId)]);
    var courses = res[0] || [], enrs = res[1] || [], lessons = res[2] || [];
    var course = courses.filter(function(c){ return c.id === courseId; })[0];
    var e = enrs.filter(function(x){ return x.course_id === courseId; })[0];
    var idx = lessons.map(function(l){ return l.id; }).indexOf(lessonId);
    if (!course || !e || idx < 0) return show('<div class="empty"><h3>' + esc(t("not_found")) + '</h3></div>');

    var lesson = lessons[idx];
    var prog = await getProgress(e.id) || [];
    var doneSet = {};
    prog.forEach(function(p){ doneSet[p.lesson_id] = true; });

    var toc = '<div class="toc">' +
      '<h4>' + esc(L(course, "title")) + '</h4>' +
      lessons.map(function(l){
        return '<a class="' + (l.id === lessonId ? "on" : "") + '" href="#/lesson/' +
            encodeURIComponent(courseId) + '/' + encodeURIComponent(l.id) + '">' +
          '<span class="tick' + (doneSet[l.id] ? " done" : "") + '">' + (doneSet[l.id] ? "✓" : "") + '</span>' +
          '<span style="flex:1">' + esc(L(l, "title")) + '</span>' +
        '</a>';
      }).join("") +
    '</div>';

    var main =
      '<div class="kicker">' +
        esc(t("lesson")) + " " + (idx + 1) + " " + esc(t("of")) + " " + lessons.length +
        ' · <a href="#/course/' + encodeURIComponent(courseId) + '" style="text-decoration:underline">' +
          esc(t("back_course")) + '</a>' +
      '</div>' +
      '<h1 style="font-size:1.6rem;font-weight:600;margin-bottom:18px">' + esc(L(lesson, "title")) + '</h1>' +
      '<div id="lessonMain"></div>';

    show('<div class="split">' + toc + '<div>' + main + '</div></div>');

    var host = el("lessonMain");
    if (lesson.kind === "quiz") renderQuiz(host, lesson, e, lessons, idx, doneSet);
    else renderText(host, lesson, e, lessons, idx, doneSet);
  }

  function navRow(lessons, idx, courseId){
    var prev = idx > 0 ? lessons[idx-1] : null;
    var next = idx < lessons.length - 1 ? lessons[idx+1] : null;
    return '<div class="lesson-nav">' +
      (prev
        ? '<a class="btn btn-ghost btn-sm" href="#/lesson/' + encodeURIComponent(courseId) + '/' + encodeURIComponent(prev.id) + '">← ' + esc(t("prev")) + '</a>'
        : '<span></span>') +
      (next
        ? '<a class="btn btn-ghost btn-sm" href="#/lesson/' + encodeURIComponent(courseId) + '/' + encodeURIComponent(next.id) + '">' + esc(t("next")) + ' →</a>'
        : '<a class="btn btn-ghost btn-sm" href="#/course/' + encodeURIComponent(courseId) + '">' + esc(t("back_course")) + '</a>') +
    '</div>';
  }

  function renderText(host, lesson, enrollment, lessons, idx, doneSet){
    var isDone = !!doneSet[lesson.id];
    host.innerHTML =
      (lesson.media_url && lesson.kind === "video"
        ? '<div style="margin-bottom:20px"><video controls style="width:100%;border-radius:var(--radius)" src="' + esc(lesson.media_url) + '"></video></div>'
        : "") +
      (lesson.media_url && lesson.kind === "pdf"
        ? '<p style="margin-bottom:18px"><a class="btn btn-ghost btn-sm" href="' + esc(lesson.media_url) + '" target="_blank" rel="noopener">PDF ↗</a></p>'
        : "") +
      '<div class="lesson-body">' + paras(L(lesson, "body")) + '</div>' +
      '<div style="margin-top:28px">' +
        '<button class="btn ' + (isDone ? "btn-ghost" : "btn-primary") + '" id="doneBtn"' + (isDone ? " disabled" : "") + '>' +
          (isDone ? "✓ " + esc(t("done")) : esc(t("mark_done"))) +
        '</button>' +
      '</div>' +
      navRow(lessons, idx, lesson.course_id);

    if (!isDone) {
      el("doneBtn").addEventListener("click", async function(){
        var b = el("doneBtn");
        b.disabled = true;
        b.innerHTML = '<span class="spin"></span>';
        try {
          await markComplete(enrollment.id, lesson.id, null);
          render();                       // re-read so ticks and % refresh
        } catch (err) {
          b.disabled = false;
          b.textContent = t("mark_done");
          alert(t("err_generic"));
        }
      });
    }
  }

  function renderQuiz(host, lesson, enrollment, lessons, idx, doneSet){
    var qs = Array.isArray(lesson.quiz) ? lesson.quiz : [];
    var isDone = !!doneSet[lesson.id];

    host.innerHTML =
      '<div id="quizMsg"></div>' +
      '<form id="quizForm">' +
        qs.map(function(q, qi){
          var opts = q["options_" + CUR] || q.options_en || [];
          return '<div class="q" data-q="' + qi + '">' +
            '<h4>' + (qi + 1) + '. ' + esc(q["q_" + CUR] || q.q_en) + '</h4>' +
            opts.map(function(o, oi){
              return '<label class="opt" data-opt="' + oi + '">' +
                '<input type="radio" name="q' + qi + '" value="' + oi + '">' +
                '<span>' + esc(o) + '</span>' +
              '</label>';
            }).join("") +
          '</div>';
        }).join("") +
        '<button class="btn btn-primary" type="submit" id="quizBtn">' +
          esc(isDone ? t("q_retry") : t("q_check")) +
        '</button>' +
      '</form>' +
      navRow(lessons, idx, lesson.course_id);

    el("quizForm").addEventListener("submit", async function(ev){
      ev.preventDefault();
      var answers = [], missing = false;
      qs.forEach(function(q, qi){
        var picked = host.querySelector('input[name="q' + qi + '"]:checked');
        if (!picked) missing = true;
        answers.push(picked ? parseInt(picked.value, 10) : -1);
      });
      if (missing) {
        el("quizMsg").innerHTML = '<div class="note bad">' + esc(t("q_pick")) + '</div>';
        return;
      }

      var right = 0;
      qs.forEach(function(q, qi){
        var block = host.querySelector('[data-q="' + qi + '"]');
        var correct = q.answer;
        if (answers[qi] === correct) right++;
        block.querySelectorAll(".opt").forEach(function(o){
          var oi = parseInt(o.dataset.opt, 10);
          o.classList.remove("right","wrong");
          if (oi === correct) o.classList.add("right");
          else if (oi === answers[qi]) o.classList.add("wrong");
        });
      });

      var score = Math.round((right / qs.length) * 100);
      var passed = score >= PASS_MARK;

      el("quizMsg").innerHTML =
        '<div class="note ' + (passed ? "ok" : "bad") + '">' +
          '<b>' + esc(t("q_score")) + " " + score + '%</b>' +
          (passed ? " — " + esc(t("q_pass")) + "." : " — " + esc(t("q_need").replace("{n}", PASS_MARK))) +
        '</div>';
      window.scrollTo({ top: 0, behavior: "smooth" });

      if (passed) {
        var b = el("quizBtn");
        b.disabled = true;
        b.innerHTML = '<span class="spin"></span>';
        try {
          await markComplete(enrollment.id, lesson.id, score);
          setTimeout(render, 700);        // let the reader see the result first
        } catch (err) {
          b.disabled = false;
          b.textContent = t("q_check");
          alert(t("err_generic"));
        }
      } else {
        el("quizBtn").textContent = t("q_retry");
      }
    });
  }

  // ---------- Certificates ----------
  async function viewCertificates(){
    busy();
    var res = await Promise.all([getCertificates(), getCourses()]);
    var certs = res[0] || [], courses = res[1] || [];
    var byId = {};
    courses.forEach(function(c){ byId[c.id] = c; });

    show(
      '<div class="page-head"><h1>' + esc(t("certs_title")) + '</h1><p>' + esc(t("certs_sub")) + '</p></div>' +
      (certs.length
        ? '<div class="grid g2">' + certs.map(function(c){
            var course = byId[c.course_id];
            return '<div class="cert">' +
              '<div class="kicker">' + esc(t("cert")) +
                (c.is_valid === false ? ' · ' + esc(t("revoked")) : (c.valid_until ? ' · ' + (new Date(c.valid_until) < new Date() ? esc(t("expired")) : esc(t("expires")) + " " + esc(c.valid_until)) : "")) +
              '</div>' +
              '<div class="code">' + esc(c.code) + '</div>' +
              '<h3>' + esc(course ? L(course, "title") : c.course_id) + '</h3>' +
              '<p style="font-size:.9rem;color:var(--ink-2)">' + esc(t("holder")) + ": " + esc(c.holder_name) + '</p>' +
              '<p style="font-size:.9rem;color:var(--ink-2)">' + esc(t("issued")) + ": " + esc(c.issued_on) +
                (c.score != null ? " · " + esc(t("score")) + ": " + c.score + "%" : "") + '</p>' +
            '</div>';
          }).join("") + '</div>'
        : '<div class="empty">' +
            '<h3>' + esc(t("no_certs")) + '</h3>' +
            '<p style="margin-bottom:18px">' + esc(t("no_certs_p")) + '</p>' +
            '<a class="btn btn-primary" href="#/catalogue">' + esc(t("browse")) + '</a>' +
          '</div>')
    );
  }

  // ---------- Account ----------
  function accMsg(text, kind){
    var w = el("accMsg");
    if (w) w.innerHTML = '<div class="note ' + (kind || "") + '">' + esc(text) + '</div>';
  }

  async function viewAccount(){
    busy();
    var p = (await getProfile()) || {};
    // Only staff and company leads can read organizations under RLS, so a
    // plain learner simply gets nothing back and the row is left out.
    var company = "";
    if (p.org_id) {
      try {
        var rows = await rest("organizations?select=name&id=eq." + encodeURIComponent(p.org_id));
        company = (rows && rows[0] && rows[0].name) || "";
      } catch (e) { company = ""; }
    }

    function ro(label, value, hint){
      return '<div class="ro"><span>' + esc(label) + '</span><b>' + esc(value || "—") + '</b>' +
             (hint ? '<div class="hint">' + esc(hint) + '</div>' : "") + '</div>';
    }

    show(
      '<div class="form">' +
        '<div class="page-head">' +
          '<h1>' + esc(t("acc_title")) + '</h1>' +
          '<p>' + esc(t("acc_sub")) + '</p>' +
        '</div>' +
        '<div id="accMsg"></div>' +
        '<form id="accForm" novalidate>' +
          group(t("acc_details"),
            field("fullname", t("f_name"), "text", "", true, "name") +
            field("department", t("f_dept"), "text", "", false) +
            '<div class="field"><label for="f_lang">' + esc(t("f_lang")) + '</label>' +
              '<select id="f_lang"><option value="en">English</option><option value="ar">العربية</option></select>' +
            '</div>' +
            ro(t("acc_email_ro"), p.email, t("acc_email_hint")) +
            ro(t("acc_type"), roleLabel(p.role)) +
            (company ? ro(t("acc_company"), company) : "")) +
          '<button class="btn btn-primary" style="width:100%" type="submit" id="accBtn">' + esc(t("acc_save")) + '</button>' +
        '</form>' +
        '<form id="pwForm" novalidate style="margin-top:26px">' +
          group(t("acc_security"),
            field("npass",  t("f_pass_new"), "password", t("f_pass_hint"), true, "new-password") +
            field("npass2", t("f_pass2"),    "password", "", true, "new-password")) +
          '<button class="btn" style="width:100%" type="submit" id="pwBtn">' + esc(t("acc_pass_btn")) + '</button>' +
        '</form>' +
        (PANEL_ROLES.indexOf(p.role) >= 0
          ? '<div class="note" style="margin-top:26px">' + esc(t("acc_panel_p")) + ' ' +
            '<a href="admin.html" style="color:var(--petrol);font-weight:500;text-decoration:underline">' +
              esc(t("acc_open_panel")) + '</a></div>'
          : "") +
      '</div>'
    );

    el("f_fullname").value   = p.full_name  || "";
    el("f_department").value = p.department || "";
    el("f_lang").value       = (p.lang === "ar" ? "ar" : "en");

    el("accForm").addEventListener("submit", async function(ev){
      ev.preventDefault();
      clearErrors();
      var nm = (el("f_fullname").value || "").trim();
      if (!nm) { fieldErr("fullname", t("err_name")); el("f_fullname").focus(); return; }
      var btn = el("accBtn"); btn.disabled = true;
      try {
        var lang = el("f_lang").value === "ar" ? "ar" : "en";
        var changedLang = lang !== CUR;
        await rest("profiles?id=eq." + encodeURIComponent(p.id), {
          method: "PATCH",
          headers: { "Prefer": "return=representation" },
          body: {
            full_name: nm,
            department: (el("f_department").value || "").trim() || null,
            lang: lang
          }
        });
        cache.profile = null;
        await getProfile().catch(function(){});
        if (changedLang) {
          // Repaint the whole screen so the new language applies everywhere,
          // not just to the header labels.
          setLang(lang);
          await viewAccount();
        }
        accMsg(t("acc_saved"), "ok");
        paintChrome();
      } catch (err) {
        accMsg(err.message || t("err_generic"), "bad");
      }
      var b2 = el("accBtn"); if (b2) b2.disabled = false;
    });

    el("pwForm").addEventListener("submit", async function(ev){
      ev.preventDefault();
      clearErrors();
      var a = el("f_npass").value || "", b = el("f_npass2").value || "";
      if (a.length < 8) { fieldErr("npass", t("err_pass_short")); el("f_npass").focus(); return; }
      if (a !== b) { fieldErr("npass2", t("err_pass_match")); el("f_npass2").focus(); return; }
      var btn = el("pwBtn"); btn.disabled = true;
      try {
        var r = await fetch(SB_URL + "/auth/v1/user", {
          method: "PUT", headers: authHeaders(), body: JSON.stringify({ password: a })
        });
        var data = await r.json().catch(function(){ return {}; });
        if (!r.ok) throw new Error(data.error_description || data.msg || data.message || t("err_generic"));
        el("f_npass").value = ""; el("f_npass2").value = "";
        accMsg(t("acc_pass_done"), "ok");
      } catch (err) {
        accMsg(err.message || t("err_generic"), "bad");
      }
      btn.disabled = false;
    });
  }

  // ============================================================
  // Router
  // ============================================================
  async function render(){
    var parts = (location.hash || "").replace(/^#\/?/, "").split("/").map(decodeURIComponent);
    var route = parts[0] || "";

    if (!signedIn()) {
      if (route !== "signup") route = "signin";
      return route === "signup" ? viewAuth("signup") : viewAuth("signin");
    }
    if (route === "setpassword") return viewSetPassword();
    if (route === "signin" || route === "signup" || route === "") {
      location.hash = "#/dashboard";
      return;
    }

    try {
      await getProfile().catch(function(){});
      if (route === "dashboard")         await viewDashboard();
      else if (route === "catalogue")    await viewCatalogue();
      else if (route === "certificates") await viewCertificates();
      else if (route === "account")      await viewAccount();
      else if (route === "course")       await viewCourse(parts[1]);
      else if (route === "lesson")       await viewLesson(parts[1], parts[2]);
      else show('<div class="empty"><h3>' + esc(t("not_found")) + '</h3></div>');
    } catch (err) {
      if (String(err.message) !== "signed out") {
        show('<div class="empty"><h3>' + esc(t("err_generic")) + '</h3>' +
             '<p style="font-size:.82rem;margin-top:8px">' + esc(err.message) + '</p></div>');
      }
    }
  }

  // ============================================================
  // Wiring
  // ============================================================
  document.querySelectorAll(".lang button").forEach(function(b){
    b.addEventListener("click", function(){ setLang(b.dataset.lang); });
  });
  el("signOut").addEventListener("click", function(){
    saveSession(null);
    cache.profile = null;
    location.hash = "#/signin";
    render();
  });
  el("menuBtn").addEventListener("click", function(){ el("nav").classList.toggle("open"); });
  view.addEventListener("click", function(ev){
    var a = ev.target.closest && ev.target.closest("a[href^='#/']");
    if (a) el("nav").classList.remove("open");
  });
  window.addEventListener("hashchange", function(){
    el("nav").classList.remove("open");
    // An invite or reset link followed while the portal is already open
    // only changes the fragment, so catch it here as well as at boot.
    captureAuthRedirect();
    render();
  });

  // Boot: pick up an invite / reset link if there is one, apply saved language, then route.
  captureAuthRedirect();
  document.documentElement.lang = CUR;
  document.documentElement.dir = CUR === "ar" ? "rtl" : "ltr";
  setLang(CUR);
})();
