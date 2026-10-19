/* ==========================================================================
   solid-init.js — 封面实体 3D 初始化（2026-10-19）
   --------------------------------------------------------------------------
   把封面上的线框 canvas 换成实体方块模型。
   与旧版并存：data-solid="true" 的走实体，其余仍走 GLASS3D 线框。
   ========================================================================== */
(function (global) {
  'use strict';

  var reduce = global.matchMedia &&
    global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initOne(canvas) {
    if (canvas.__solid || !global.SOLID3D || !global.SOLID_MODELS) return null;

    var kind = canvas.getAttribute('data-solid-model') || canvas.getAttribute('data-3d') || 'cluster';
    var boxes = global.SOLID_MODELS.get(kind);
    if (!boxes || !boxes.length) return null;

    var sc = new global.SOLID3D.Scene(canvas, {
      scale: parseFloat(canvas.getAttribute('data-solid-scale')) || 1,
      tilt: parseFloat(canvas.getAttribute('data-tilt')) || 0.30,
      speed: parseFloat(canvas.getAttribute('data-speed')) || 0.00016,
      stretchX: parseFloat(canvas.getAttribute('data-stretch-x')) || 1,
      palette: { base: [37, 99, 235], light: [96, 165, 250], dark: [29, 78, 216] }
    });

    sc.setBoxes(boxes);
    canvas.__solid = sc;

    /* 2026-10-19：卡片刚插入 DOM 时尺寸可能还是 0，
       等布局稳定后要补一次 resize + 重绘。
       ResizeObserver 比 setTimeout 可靠（不依赖猜测的延迟）。 */
    if (global.ResizeObserver) {
      if (canvas.__ro) canvas.__ro.disconnect();
      var ro = new ResizeObserver(function () {
        if (sc.resize() && !sc.raf) sc.drawStatic();
      });
      ro.observe(canvas);
      canvas.__ro = ro;
    }

    // 大画布用正常帧率，小画布限帧
    var cw = canvas.getBoundingClientRect().width;
    if (cw > 0 && cw <= 110) sc.minFrameMs = 33;

    if (reduce) {
      sc.drawStatic();
      return sc;
    }

    // 尺寸可能还没就绪：先试画一帧，尺寸到了会由 ResizeObserver 补
    if (sc.pendingSize) {
      global.requestAnimationFrame(function () {
        if (!sc.raf) sc.drawStatic();
      });
    }
    sc.start();
    return sc;
  }

  /* ---------- 懒初始化：进入视口才跑 ---------- */
  function init(root) {
    var nodes = (root || document).querySelectorAll('canvas[data-solid="true"]');
    if (!nodes.length) return;

    var vh = global.innerHeight || 800;
    var immediate = [], deferred = [];

    Array.prototype.forEach.call(nodes, function (el) {
      if (el.__solid || el.__queued) return;
      var r = el.getBoundingClientRect();
      if (r.bottom > -60 && r.top < vh + 60) immediate.push(el);
      else deferred.push(el);
    });

    immediate.forEach(initOne);

    if (!deferred.length) return;
    if (!global.IntersectionObserver) {
      deferred.forEach(initOne);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var el = e.target;
        if (e.isIntersecting) {
          if (!el.__solid) initOne(el);
          el.__solid && el.__solid.start();
        } else if (el.__solid) {
          el.__solid.stop();
        }
      });
    }, { rootMargin: '160px 0px' });

    deferred.forEach(function (el) { io.observe(el); });
  }

  // 页面隐藏时暂停
  document.addEventListener('visibilitychange', function () {
    var list = document.querySelectorAll('canvas[data-solid="true"]');
    Array.prototype.forEach.call(list, function (c) {
      if (!c.__solid) return;
      if (document.hidden) c.__solid.stop();
      else if (!reduce) c.__solid.start();
    });
  });

  global.SOLID_INIT = { init: init, initOne: initOne };
})(window);
