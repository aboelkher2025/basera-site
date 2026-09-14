/* Basera control panel — Database: a generic browser over every table the
   API exposes. Schema comes from PostgREST's OpenAPI document, so a table
   added later shows up here without any change to this file. Rows can be
   inserted, edited as JSON and deleted; RLS still applies to every call. */
(function(A){
  "use strict";
  var esc = A.esc, PAGE = 100;
  var schema = null;

  async function loadSchema(){
    if (schema) return schema;
    var doc = await A.rest("");
    var defs = doc && doc.definitions ? doc.definitions : {};
    schema = {};
    Object.keys(defs).sort().forEach(function(name){
      var d = defs[name], cols = [], pk = [];
      Object.keys(d.properties || {}).forEach(function(c){
        var p = d.properties[c];
        var isPk = /<pk\/>/.test(p.description || "");
        if (isPk) pk.push(c);
        cols.push({ name:c, type:p.type || "", format:p.format || "", pk:isPk, required:(d.required || []).indexOf(c) >= 0, hasDefault: /default/i.test(p.description || "") || !!p.default, fk:/<fk /.test(p.description || "") });
      });
      schema[name] = { name:name, cols:cols, pk:pk.length ? pk : (d.properties && d.properties.id ? ["id"] : []) };
    });
    return schema;
  }
  function pkFilter(t, row){ return t.pk.map(function(k){ return k + "=eq." + A.q(row[k]); }).join("&"); }
  function cell(v){
    if (v == null) return '<span class="muted">null</span>';
    if (typeof v === "object") return esc(A.clip(JSON.stringify(v), 60));
    if (typeof v === "boolean") return v ? A.pill("true","ok") : A.pill("false","mute");
    return esc(A.clip(String(v), 60));
  }

  A.views.database = function(){
    var table = A.params.table || "", offset = Number(A.params.offset || 0) || 0;
    A.out.innerHTML = A.pageHead("Database", "Every table the API exposes, straight from the schema. Edits go through the same row-level security as everything else.") + '<div class="loading"><span class="spin"></span></div>';
    loadSchema().then(paint).catch(function(e){ A.out.innerHTML = '<div class="err">' + esc(e.message) + "</div>"; });

    async function paint(S){
      var names = Object.keys(S);
      if (!table || !S[table]) table = names[0] || "";
      var t = S[table], rows = [], err = null;
      if (t) {
        var order = t.pk.length ? "&order=" + t.pk[0] + ".asc" : "";
        try { rows = (await A.rest(table + "?select=*&limit=" + PAGE + "&offset=" + offset + order)) || []; }
        catch(e){ err = e.message; }
      }
      var list = '<div class="dblist">' + names.map(function(n){ return '<a href="#/database?table=' + n + '"' + (n === table ? ' class="sel"' : "") + ">" + esc(n) + "</a>"; }).join("") + "</div>";
      var main = "";
      if (t) {
        var head = t.cols.map(function(c){ return "<th" + (c.pk ? ' title="primary key"' : "") + ">" + esc(c.name) + (c.pk ? " •" : "") + "</th>"; }).join("");
        var body = rows.map(function(r, i){
          return "<tr>" + t.cols.map(function(c){ return '<td class="cell" title="' + esc(r[c.name] == null ? "" : (typeof r[c.name] === "object" ? JSON.stringify(r[c.name]) : String(r[c.name]))) + '">' + cell(r[c.name]) + "</td>"; }).join("") +
                 '<td class="act">' + (t.pk.length ? A.btn("edit", i, "Edit") + A.btn("del", i, "Delete", "danger") : A.btn("view", i, "View")) + "</td></tr>";
        }).join("");
        main = '<div class="panel"><h3>' + esc(table) + '<span class="muted" style="text-transform:none;letter-spacing:0;font-weight:500">' + t.cols.length + " columns · key: " + (t.pk.join(", ") || "none") + '</span><span class="spacer"></span>' +
          '<button class="btn sm light" id="cols">Columns</button><button class="btn sm light" id="csv">Export page</button><button class="btn sm accent" id="ins">+ Insert row</button></h3>' +
          (err ? '<div class="err" style="margin:14px">' + esc(err) + "</div>" : "") +
          '<div class="scroll"><table><thead><tr>' + head + "<th></th></tr></thead><tbody>" + (body || '<tr><td colspan="' + (t.cols.length + 1) + '" class="empty">No rows' + (offset ? " on this page" : "") + ".</td></tr>") + "</tbody></table></div>" +
          '<div class="pager"><span>rows ' + (offset + 1) + "–" + (offset + rows.length) + "</span>" +
          '<button class="btn sm light" id="prev"' + (offset ? "" : " disabled") + '>← Prev</button><button class="btn sm light" id="next"' + (rows.length < PAGE ? " disabled" : "") + ">Next →</button></div></div>";
      } else main = '<div class="empty">No tables are exposed to this account.</div>';
      A.out.innerHTML = A.pageHead("Database", "Every table the API exposes, straight from the schema. Edits go through the same row-level security as everything else.") + '<div class="dbwrap">' + list + "<div>" + main + "</div></div>";
      if (!t) return;
      A.el("prev").addEventListener("click", function(){ A.go("database", { table:table, offset:Math.max(0, offset - PAGE) }); });
      A.el("next").addEventListener("click", function(){ A.go("database", { table:table, offset:offset + PAGE }); });
      A.el("cols").addEventListener("click", function(){ A.showJson(table + " columns", t.cols); });
      A.el("csv").addEventListener("click", function(){ A.download(table + "-page" + (offset / PAGE + 1) + ".csv", A.csv(t.cols.map(function(c){ return { k:c.name, label:c.name, raw:function(r){ var v = r[c.name]; return v != null && typeof v === "object" ? JSON.stringify(v) : v; } }; }), rows)); });
      A.el("ins").addEventListener("click", function(){ rowForm(t, null); });
      A.actions({
        view:function(i){ A.showJson(table + " row", rows[i]); },
        edit:function(i){ rowForm(t, rows[i]); },
        del: async function(i){
          var r = rows[i];
          if (!await A.confirm({ title:"Delete row from " + table + "?", text:t.pk.map(function(k){ return k + " = " + r[k]; }).join(", "), sub:"Foreign keys decide what else goes with it.", label:"Delete", danger:true })) return;
          try { await A.remove(table, pkFilter(t, r)); A.toast("Row deleted"); await A.loadAll(true); A.render(); }
          catch(e){ A.toast(e.message, true); }
        }
      }, function(k){ return Number(k); });
    }
    async function rowForm(t, row){
      var template = {};
      if (!row) t.cols.forEach(function(c){ if (!(c.pk && c.hasDefault) && !/created_at|updated_at/.test(c.name)) template[c.name] = c.type === "boolean" ? false : c.type === "integer" || c.type === "number" ? 0 : c.type === "array" ? [] : null; });
      await A.form({
        title: row ? "Edit row in " + table : "Insert row into " + table, submitLabel: row ? "Save" : "Insert", wide:true,
        intro: row ? "Primary-key columns are used to find the row; change them and you move it." : "Leave out columns that have defaults (ids, timestamps). Foreign keys must point at existing rows.",
        fields:[{ k:"json", label:"Row (JSON)", type:"json", rows:18, required:true, value: row || template, validate:function(v){ return v && typeof v === "object" && !Array.isArray(v) ? null : "Must be a JSON object"; } }],
        onSubmit: async function(v){
          if (row) await A.patch(table, pkFilter(t, row), v.json); else await A.insert(table, v.json);
          A.toast(row ? "Row saved" : "Row inserted"); await A.loadAll(true); A.render();
        }
      });
    }
  };
})(window.BA);
