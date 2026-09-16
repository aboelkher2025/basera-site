/* Basera motion engine — generated, video-like backgrounds drawn on canvas.
   Usage: <div class="bg" data-motion="aurora" data-tone="dark"></div>
   Presets: aurora, waves, particles, grid, orbit, topo.
   Each canvas only animates while on screen, caps device pixel ratio,
   and draws a single still frame when the user prefers reduced motion. */
window.Motion = (function(){
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  var TAU = Math.PI * 2;

  var TONES = {
    dark:  { base:"#0B2A2E", a:"12,143,163", b:"233,162,59", c:"90,170,180", line:"251,250,246", glow:.42 },
    petrol:{ base:"#10373C", a:"12,143,163", b:"233,162,59", c:"90,170,180", line:"251,250,246", glow:.38 },
    light: { base:"#FBFAF6", a:"12,143,163", b:"233,162,59", c:"16,55,60",    line:"16,55,60",   glow:.16 },
    mint:  { base:"#E4EDE8", a:"12,143,163", b:"233,162,59", c:"16,55,60",    line:"16,55,60",   glow:.18 }
  };
  function rgba(c, a){ return "rgba(" + c + "," + a + ")"; }
  function rnd(seed){ // deterministic-ish per element so reloads look the same
    var s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return function(){ s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
  }

  // ---------------------------------------------------------------
  var presets = {
    // Slow-drifting light fields, the "video" look for hero and CTA.
    aurora: {
      init: function(S){
        var r = S.rnd, n = 6; S.blobs = [];
        for (var i = 0; i < n; i++) S.blobs.push({
          x: r(), y: r(), rx: .35 + r() * .35, ry: .25 + r() * .3,
          sx: .06 + r() * .05, sy: .05 + r() * .05, px: r() * TAU, py: r() * TAU,
          col: i % 3 === 0 ? S.tone.b : (i % 3 === 1 ? S.tone.a : S.tone.c), al: (i % 3 === 0 ? .55 : .75) * S.tone.glow
        });
      },
      draw: function(ctx, w, h, t, S){
        ctx.fillStyle = S.tone.base; ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = S.dark ? "lighter" : "source-over";
        S.blobs.forEach(function(b){
          var x = (b.x + .18 * Math.sin(t * b.sx + b.px)) * w, y = (b.y + .14 * Math.cos(t * b.sy + b.py)) * h;
          var R = Math.max(w, h) * b.rx * (1 + .08 * Math.sin(t * .2 + b.px));
          var g = ctx.createRadialGradient(x, y, 0, x, y, R);
          g.addColorStop(0, rgba(b.col, b.al)); g.addColorStop(.55, rgba(b.col, b.al * .35)); g.addColorStop(1, rgba(b.col, 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, R, R * b.ry / b.rx, 0, 0, TAU); ctx.fill();
        });
        ctx.globalCompositeOperation = "source-over";
        // fine grain so gradients don't band
        if (!S.grain) S.grain = makeGrain(ctx, 140);
        ctx.globalAlpha = S.dark ? .06 : .04; ctx.fillStyle = S.grain; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
      }
    },
    // Layered sine waves rolling slowly, for calmer content sections.
    waves: {
      init: function(S){
        var r = S.rnd; S.layers = [];
        for (var i = 0; i < 4; i++) S.layers.push({ amp: .035 + i * .012, freq: 1.2 + i * .5, speed: .25 + i * .12, off: r() * TAU, y: .55 + i * .11, col: i % 2 ? S.tone.a : S.tone.b, al: (S.dark ? .22 : .12) - i * .02 });
      },
      draw: function(ctx, w, h, t, S){
        ctx.fillStyle = S.tone.base; ctx.fillRect(0, 0, w, h);
        S.layers.forEach(function(L){
          ctx.beginPath(); ctx.moveTo(0, h);
          for (var x = 0; x <= w; x += 8) {
            var y = h * L.y + Math.sin(x / w * TAU * L.freq + t * L.speed + L.off) * h * L.amp + Math.sin(x / w * TAU * L.freq * 2.3 - t * L.speed * .7) * h * L.amp * .35;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(w, h); ctx.closePath();
          var g = ctx.createLinearGradient(0, h * .4, 0, h); g.addColorStop(0, rgba(L.col, L.al)); g.addColorStop(1, rgba(L.col, 0));
          ctx.fillStyle = g; ctx.fill();
        });
      }
    },
    // Slow dust rising, occasionally linked — depth without noise.
    particles: {
      init: function(S){
        var r = S.rnd, n = S.dark ? 70 : 50; S.p = [];
        for (var i = 0; i < n; i++) S.p.push({ x: r(), y: r(), z: .3 + r() * .7, vy: .01 + r() * .02, sway: r() * TAU, sp: .3 + r() * .5, col: i % 5 === 0 ? S.tone.b : S.tone.c });
      },
      draw: function(ctx, w, h, t, S){
        ctx.fillStyle = S.tone.base; ctx.fillRect(0, 0, w, h);
        var pts = S.p, base = S.dark ? .9 : .35;
        pts.forEach(function(p){
          p.y -= p.vy * .004 * p.z; if (p.y < -.05) { p.y = 1.05; p.x = S.rnd(); }
          var x = (p.x + .02 * Math.sin(t * p.sp + p.sway)) * w, y = p.y * h;
          p._x = x; p._y = y;
          ctx.beginPath(); ctx.arc(x, y, 1.2 + p.z * 1.8, 0, TAU); ctx.fillStyle = rgba(p.col, base * (.25 + p.z * .5)); ctx.fill();
        });
        ctx.lineWidth = 1;
        for (var i = 0; i < pts.length; i++) for (var j = i + 1; j < pts.length; j++) {
          var dx = pts[i]._x - pts[j]._x, dy = pts[i]._y - pts[j]._y, d = dx * dx + dy * dy;
          if (d < 9000) { ctx.strokeStyle = rgba(S.tone.line, (S.dark ? .12 : .08) * (1 - d / 9000)); ctx.beginPath(); ctx.moveTo(pts[i]._x, pts[i]._y); ctx.lineTo(pts[j]._x, pts[j]._y); ctx.stroke(); }
        }
      }
    },
    // Perspective floor grid gliding forward with a sweeping light band.
    grid: {
      init: function(S){ S.h0 = .42; },
      draw: function(ctx, w, h, t, S){
        ctx.fillStyle = S.tone.base; ctx.fillRect(0, 0, w, h);
        var hz = h * S.h0, cx = w / 2, lineCol = S.tone.line, al = S.dark ? .13 : .1;
        ctx.lineWidth = 1;
        for (var i = -14; i <= 14; i++) {
          ctx.strokeStyle = rgba(lineCol, al * (1 - Math.abs(i) / 16));
          ctx.beginPath(); ctx.moveTo(cx + i * 40, hz); ctx.lineTo(cx + i * w * .18, h); ctx.stroke();
        }
        var phase = (t * .35) % 1;
        for (var k = 0; k < 14; k++) {
          var z = ((k + phase) / 14); var y = hz + (h - hz) * z * z;
          ctx.strokeStyle = rgba(lineCol, al * z); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
        var band = hz + (h - hz) * (.5 + .5 * Math.sin(t * .5)) ;
        var g = ctx.createLinearGradient(0, band - 90, 0, band + 90); g.addColorStop(0, rgba(S.tone.a, 0)); g.addColorStop(.5, rgba(S.tone.a, S.dark ? .22 : .12)); g.addColorStop(1, rgba(S.tone.a, 0));
        ctx.fillStyle = g; ctx.fillRect(0, band - 90, w, 180);
        var sky = ctx.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, rgba(S.tone.b, S.dark ? .14 : .08)); sky.addColorStop(1, rgba(S.tone.b, 0));
        ctx.fillStyle = sky; ctx.fillRect(0, 0, w, hz);
      }
    },
    // Rotating rings with nodes, echoing the learning journey.
    orbit: {
      init: function(S){ var r = S.rnd; S.rings = [0, 1, 2, 3].map(function(i){ return { r: .18 + i * .13, tilt: .35 + r() * .2, speed: (i % 2 ? -1 : 1) * (.08 + r() * .06), nodes: 2 + i, off: r() * TAU }; }); },
      draw: function(ctx, w, h, t, S){
        ctx.fillStyle = S.tone.base; ctx.fillRect(0, 0, w, h);
        var cx = w * .72, cy = h * .5, R = Math.min(w, h);
        ctx.lineWidth = 1;
        S.rings.forEach(function(g, i){
          var rr = R * g.r;
          ctx.strokeStyle = rgba(S.tone.line, S.dark ? .16 : .12); ctx.beginPath(); ctx.ellipse(cx, cy, rr, rr * g.tilt, 0, 0, TAU); ctx.stroke();
          for (var n = 0; n < g.nodes; n++) {
            var a = t * g.speed + g.off + n * TAU / g.nodes, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * g.tilt, front = Math.sin(a) > 0;
            ctx.beginPath(); ctx.arc(x, y, front ? 4 : 2.5, 0, TAU); ctx.fillStyle = rgba(n === 0 ? S.tone.b : S.tone.a, front ? .95 : .45); ctx.fill();
            if (front) { var hl = ctx.createRadialGradient(x, y, 0, x, y, 26); hl.addColorStop(0, rgba(n === 0 ? S.tone.b : S.tone.a, .25)); hl.addColorStop(1, rgba(S.tone.a, 0)); ctx.fillStyle = hl; ctx.beginPath(); ctx.arc(x, y, 26, 0, TAU); ctx.fill(); }
          }
        });
        var g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * .6); g2.addColorStop(0, rgba(S.tone.a, S.dark ? .18 : .08)); g2.addColorStop(1, rgba(S.tone.a, 0));
        ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);
      }
    },
    // Breathing contour lines, like a map of terrain.
    topo: {
      init: function(S){ S.n = 9; S.cx = .3 + S.rnd() * .4; S.cy = .5; },
      draw: function(ctx, w, h, t, S){
        ctx.fillStyle = S.tone.base; ctx.fillRect(0, 0, w, h);
        var cx = w * S.cx, cy = h * S.cy, maxR = Math.max(w, h) * .75; ctx.lineWidth = 1.2;
        for (var i = 1; i <= S.n; i++) {
          var R = maxR * i / S.n; ctx.strokeStyle = rgba(i % 3 === 0 ? S.tone.b : S.tone.line, (S.dark ? .2 : .13) * (1 - i / (S.n + 2)));
          ctx.beginPath();
          for (var a = 0; a <= TAU + .01; a += .05) {
            var rr = R * (1 + .07 * Math.sin(3 * a + t * .3 + i) + .045 * Math.sin(5 * a - t * .22 + i * .7) + .03 * Math.sin(8 * a + t * .15));
            var x = cx + Math.cos(a) * rr * 1.25, y = cy + Math.sin(a) * rr * .8;
            if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath(); ctx.stroke();
        }
      }
    }
  };

  function makeGrain(ctx, size){
    var c = document.createElement("canvas"); c.width = c.height = size; var g = c.getContext("2d"), img = g.createImageData(size, size), d = img.data;
    for (var i = 0; i < d.length; i += 4) { var v = 128 + (Math.random() * 60 - 30); d[i] = d[i+1] = d[i+2] = v; d[i+3] = 255; }
    g.putImageData(img, 0, 0); return ctx.createPattern(c, "repeat");
  }

  // ---------------------------------------------------------------
  var mounted = [];
  function mount(el){
    var name = el.getAttribute("data-motion"), preset = presets[name]; if (!preset || el._motion) return;
    var toneName = el.getAttribute("data-tone") || "dark", tone = TONES[toneName] || TONES.dark;
    var canvas = document.createElement("canvas"); canvas.setAttribute("aria-hidden", "true"); el.appendChild(canvas);
    var ctx = canvas.getContext("2d", { alpha: false });
    var S = { tone: tone, dark: toneName === "dark" || toneName === "petrol", rnd: rnd((name.length * 7919 + toneName.length * 131 + mounted.length * 977) | 0), speed: Number(el.getAttribute("data-speed") || 1) };
    var w = 0, h = 0, visible = false, raf = 0, t0 = performance.now();
    function resize(){
      var r = el.getBoundingClientRect(); w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * DPR); canvas.height = Math.round(h * DPR); canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); S.grain = null;
      if (reduce || !visible) frame(true);
    }
    function frame(once){
      var t = (performance.now() - t0) / 1000 * S.speed;
      preset.draw(ctx, w, h, reduce ? 3 : t, S);
      if (!once && visible && !reduce && !document.hidden) raf = requestAnimationFrame(function(){ frame(false); });
    }
    function start(){ if (raf) return; raf = requestAnimationFrame(function(){ raf = 0; frame(false); }); }
    function stop(){ if (raf) cancelAnimationFrame(raf); raf = 0; }
    preset.init(S); resize();
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ visible = e.isIntersecting; if (visible) { if (!reduce) start(); } else stop(); }); }, { rootMargin: "80px" });
    io.observe(el);
    var ro = window.ResizeObserver ? new ResizeObserver(resize) : null; if (ro) ro.observe(el); else window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", function(){ if (!document.hidden && visible && !reduce) start(); });
    el._motion = { resize: resize, stop: stop };
    mounted.push(el);
  }
  function mountAll(root){ Array.prototype.forEach.call((root || document).querySelectorAll("[data-motion]"), mount); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function(){ mountAll(); }); else mountAll();
  return { mount: mount, mountAll: mountAll, presets: presets, reduced: reduce };
})();
