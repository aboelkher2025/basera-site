// Users & access — the platform owner's page for deciding who gets in
// and what they see. Super admin only; the route list in admin.js keeps
// everyone else off it, and the role guard in the database rejects the
// write even if someone got here another way.
//
// Access is decided by account type. Changing someone's type here is
// the whole of "customising their access": the top nav on every page is
// built from the same A.ROUTES table shown in the matrix below, so what
// you tick here is exactly what they will see when they sign in.
(function(){
  "use strict";
  var A = window.BA;
  var esc = A.esc;

  function D(){ return A.D; }

  A.views.access = function(){
    var d = D(), me = A.me;

    function rows(){
      var list = d.profiles.slice();
      var role = A.params.role || "";
      if (role) list = list.filter(function(p){ return p.role === role; });
      return A.filterRows(list, A.qval("q"), ["full_name", "email", "role", "department"]);
    }

    // What each account type can open, straight from the route table so
    // this can never drift from the real nav.
    function matrix(){
      var head = "<th>Section</th>" + A.ROLES.map(function(r){
        return '<th title="' + esc(r.desc) + '">' + esc(r.label) + "</th>";
      }).join("");
      var body = A.ROUTES.map(function(rt){
        return "<tr><td><b>" + esc(rt.label) + "</b> <span class=\"muted\">" + esc(rt.group) + "</span></td>" +
          A.ROLES.map(function(r){
            var ok = rt.roles.indexOf(r.id) >= 0;
            return '<td class="mid">' + (ok ? '<span class="yes">●</span>' : '<span class="no">–</span>') + "</td>";
          }).join("") + "</tr>";
      }).join("");
      return '<h3 class="sec">What each account type can open</h3>' +
        '<p class="sub">Read-only. Move a person between types below to change what they see.</p>' +
        '<div class="scroll"><table class="matrix"><thead><tr>' + head + "</tr></thead><tbody>" + body + "</tbody></table></div>";
    }

    function paint(){
      var list = rows();
      var cols = [
        { k:"full_name", label:"Name", cell:function(p){
            return "<b>" + esc(p.full_name || "—") + "</b>" + (p.id === me.id ? ' <span class="muted">(you)</span>' : "");
          } },
        { k:"email", label:"Email" },
        { k:"role", label:"Account type", cell:function(p){ return A.rolePill(p.role); } },
        { k:"org_id", label:"Company", val:function(p){ return A.orgName(p.org_id); },
          cell:function(p){ return esc(A.orgName(p.org_id) || "—"); } },
        { k:"sections", label:"Sections", val:function(p){ return A.routesFor(p.role).length; },
          cell:function(p){
            var n = A.routesFor(p.role).length;
            return n ? '<span class="muted">' + n + " page" + (n === 1 ? "" : "s") + "</span>"
                     : '<span class="muted">portal only</span>';
          } },
        { k:"_act", label:"", cell:function(p){
            // The last super admin must keep their access, and you cannot
            // demote yourself out of this page by accident.
            var lastSuper = p.role === "super_admin" &&
              d.profiles.filter(function(x){ return x.role === "super_admin"; }).length <= 1;
            if (p.id === me.id) return '<span class="muted">your own account</span>';
            if (lastSuper) return '<span class="muted">last super admin</span>';
            return '<select class="rolepick" data-id="' + esc(p.id) + '">' +
              A.selectOptions(A.ROLES, p.role, function(r){ return r.label; }) + "</select>";
          } }
      ];

      A.out.innerHTML =
        A.pageHead("Users & access",
          d.profiles.length + " accounts. Set what someone can reach by changing their account type.",
          '<button class="btn accent" id="add">+ New account</button>') +
        A.roleStrip(A.params.role || "", function(id){ return "#/access?role=" + id; }) +
        A.searchBar("Search name, email, department…", true, "") +
        A.table("access", cols, list, "No accounts match.") +
        matrix();

      A.wireCommon(paint);
      A.wireSort("access", paint);
      A.wireCsv("basera-access.csv", cols, rows);

      var add = A.el("add");
      if (add) add.addEventListener("click", function(){ A.go("accounts"); });

      Array.prototype.forEach.call(A.out.querySelectorAll("select.rolepick"), function(sel){
        sel.addEventListener("change", async function(){
          var id = sel.getAttribute("data-id");
          var p = d.profById[id];
          var next = sel.value;
          var was = p ? p.role : "";
          sel.disabled = true;
          try {
            await A.patch("profiles", "id=eq." + A.q(id), { role: next });
            A.toast((p && (p.full_name || p.email) ? (p.full_name || p.email) : "Account") +
                    " is now " + (A.roleById[next] ? A.roleById[next].label : next));
            await A.reload();
          } catch(e){
            sel.value = was;
            sel.disabled = false;
            A.toast(e.message || "Could not change the account type", true);
          }
        });
      });
    }

    paint();
  };
})();
