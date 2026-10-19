/* ==========================================================================
   sketch-init.js — 封面网格素描初始化（2026-10-19）
   --------------------------------------------------------------------------
   封面从实体方块（SOLID3D）切回线框（SKETCH3D）。
   用户明确偏好「网格素描草稿 / 科技智慧」的风格，不要实体色块。

   复用 glass-3d.js 里已有的 23 个线框几何体（每个作品一套），
   只是渲染方式换成带深度提示的素描风格。
   ========================================================================== */
(function (global) {
  'use strict';

  var reduce = global.matchMedia &&
    global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 模型名 → 几何体构造函数（与 glass-3d.js 的导出对应）
  function makeGeo(kind) {
    if (!global.GLASS3D) return null;
    var G = global.GLASS3D;
    switch (kind) {
      case 'roadmap': return G.roadmap(46);
      case 'bilayer': return G.bilayer(50);
      case 'auditflow': return G.auditflow(52);
      case 'agentgraph': return G.agentgraph(46);
      case 'dashboard': return G.dashboard(50);
      case 'pipeline': return G.pipeline(58, 4);
      case 'triphase': return G.triphase(46);
      case 'pyramid': return G.pyramid(50);
      case 'servicestack': return G.servicestack(48);
      case 'reviewloop': return G.extrude(G.reviewloop(42), 16);
      case 'twodocs': return G.twodocs(52);
      case 'toolsfan': return G.extrude(G.toolsfan(42), 16);
      case 'tree': return G.extrude(G.tree(42), 18);
      case 'observability': return G.extrude(G.observability(40), 16);
      case 'plugcluster': return G.plugcluster(50);
      case 'cluster': return G.cluster(58);
      case 'layers': return G.layers(52, 4);
      case 'helix': return G.helix(56, 2);
      case 'toolmatrix': return G.toolmatrix(42);
      case 'radar': return G.extrude(G.radar(46), 11);
      case 'bridge': return G.extrude(G.bridge(44), 15);
      case 'factory': return G.extrude(G.factory(40), 16);
      case 'workflow': return G.extrude(G.workflow(38), 14);
      case 'cube': default: return G.cube(96);
    }
  }

  function initOne(canvas) {
    if (canvas.__sketch || !global.SKETCH3D) return null;

    var kind = canvas.getAttribute('data-sketch-model') || canvas.getAttribute('data-3d') || 'cluster';
    var geo = makeGeo(kind);
    if (!geo || !geo.v.length) return null;

    var sc = new global.SKETCH3D.Scene(canvas, {
      geo: geo,
      rotY: -0.52,
      tilt: 0.32,
      speed: parseFloat(canvas.getAttribute('data-speed')) || 0.00016,
      grid: true,
      nodes: true,
      hidden: true
    });

    canvas.__sketch = sc;

    if (global.ResizeObserver) {
      if (canvas.__ro) canvas.__ro.disconnect();
      var ro = new ResizeObserver(function () {
        if (sc.resize()) sc.autoFit();
        if (!sc.raf) sc.drawStatic();
      });
      ro.observe(canvas);
      canvas.__ro = ro;
    }

    var cw = canvas.getBoundingClientRect().width;
    if (cw > 0 && cw <= 110) sc.minFrameMs = 33;

    if (reduce) { sc.drawStatic(); return sc; }

    if (sc.pendingSize) {
      global.requestAnimationFrame(function () {
        if (sc.resize()) sc.autoFit();
        if (!sc.raf) sc.drawStatic();
      });
    }
    sc.start();
    return sc;
  }

  function init(root) {
    var nodes = (root || document).querySelectorAll('canvas[data-sketch="true"]');
    if (!nodes.length) return;

    var vh = global.innerHeight || 800;
    var immediate = [], deferred = [];

    Array.prototype.forEach.call(nodes, function (el) {
      if (el.__sketch) return;
      var r = el.getBoundingClientRect();
      if (r.bottom > -60 && r.top < vh + 60) immediate.push(el);
      else deferred.push(el);
    });

    immediate.forEach(initOne);

    if (!deferred.length) return;
    if (!global.IntersectionObserver) { deferred.forEach(initOne); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var el = e.target;
        if (e.isIntersecting) {
          if (!el.__sketch) initOne(el);
          el.__sketch && el.__sketch.start();
        } else if (el.__sketch) {
          el.__sketch.stop();
        }
      });
    }, { rootMargin: '160px 0px' });

    deferred.forEach(function (el) { io.observe(el); });
  }

  document.addEventListener('visibilitychange', function () {
    document.querySelectorAll('canvas[data-sketch="true"]').forEach(function (c) {
      if (!c.__sketch) return;
      if (document.hidden) c.__sketch.stop();
      else if (!reduce) c.__sketch.start();
    });
  });

  global.SKETCH_INIT = { init: init, initOne: initOne, makeGeo: makeGeo };
})(window);
