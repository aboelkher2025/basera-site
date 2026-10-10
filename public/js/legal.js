/* Legal pages: bilingual toggle that follows the same stored choice as the site,
   and contact details from config.js. */
(function(){
  var KEY = "basera_lang";
  function apply(lang){
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-l]").forEach(function(el){ el.hidden = el.getAttribute("data-l") !== lang; });
    document.querySelectorAll(".lang button").forEach(function(b){ b.classList.toggle("active", b.getAttribute("data-lang") === lang); });
    try { localStorage.setItem(KEY, lang); } catch(e){}
  }
  var saved = "en";
  try { saved = localStorage.getItem(KEY) === "ar" ? "ar" : "en"; } catch(e){}
  apply(saved);
  document.querySelectorAll(".lang button").forEach(function(b){
    b.addEventListener("click", function(){ apply(b.getAttribute("data-lang")); });
  });
  var c = window.BASERA_CONFIG || {};
  ["contactEmail", "contactEmailAr"].forEach(function(id){
    var a = document.getElementById(id);
    if (a && c.contactEmail) { a.textContent = c.contactEmail; a.href = "mailto:" + c.contactEmail; }
  });
})();
