/* ==========================================================================
   orbit-init.js — 作品轨道环：初始化与交互（2026-10-19）
   --------------------------------------------------------------------------
   替代之前的「鲸鱼」模块。用户说鲸鱼「太丑太草率」。
   鲸鱼是有机曲线造型，手写参数方程很难做可信；环形是几何造型，干净可控。

   交互：
     · 悬停某个作品块 → 高亮 + 画布上方显示标题
     · 点击 → 跳到该作品详情
     · 拖拽 → 旋转
     · 重置按钮 → 回正
   ========================================================================== */
(function (global) {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  var GROUP_LABEL = {
    core: '核心案例', eng: 'AI 工程化', oss: '开源工具', lab: '实验与工具链'
  };
  var GROUP_ORDER = ['core', 'eng', 'oss', 'lab'];

  function pickWorks() {
    var DATA = global.__WORKS_DATA__ || global.WORKS_DATA;
    var list = (DATA && (DATA.items || DATA.works)) || [];
    if (!list.length) return [];

    return list.slice().sort(function (a, b) {
      var ia = GROUP_ORDER.indexOf(a.group), ib = GROUP_ORDER.indexOf(b.group);
      if (ia < 0) ia = 99; if (ib < 0) ib = 99;
      if (ia !== ib) return ia - ib;
      return String(a.no).localeCompare(String(b.no));
    }).map(function (w) {
      return {
        no: w.no,
        t: w.t || w.title || '',
        group: w.group,
        groupName: GROUP_LABEL[w.group] || w.group || '',
        url: w.url || ('./works.html#' + (w.no || ''))
      };
    });
  }

  function init(root) {
    var canvas = root.querySelector('#orbit-canvas');
    if (!canvas || canvas.__orbit) return null;
    canvas.__orbit = true;

    var works = pickWorks();
    if (!works.length) return null;

    var reduce = global.matchMedia &&
      global.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* 2026-10-20：改用 SKETCH3D。
       原来是 SOLID3D，但切封面到素描风格时把 solid-3d.js 移除了，
       导致这里报 undefined —— 整个轨道环空白。
       现在和封面共用同一套素描渲染器，风格天然统一。 */
    if (!global.SKETCH3D || !global.ORBIT3D) return null;

    var built = global.ORBIT3D.buildScene(works);
    var sc = new global.SKETCH3D.Scene(canvas, {
      geo: { v: [], e: [] },
      rotY: -0.52,
      tilt: 0.38,          // 俯视角略平，减少底部裁切
      speed: 0.00011,
      fitGoal: 0.74,        // 轨道环是宽扁结构，留白要比封面多
      grid: false,
      nodes: false,        // 192 个方块画节点会太乱
      hidden: true
    });
    sc.setShapes(built.shapes);   // 2026-10-20：改用 setShapes（八面体 + 弧线）

    // 方块索引 → 作品（只有「作品块」有对应，环体小方块没有）
    var idxToNode = {};
    built.nodes.forEach(function (n) {
      var i = built.shapes.indexOf(n.shape);
      if (i >= 0) idxToNode[i] = n;
    });

    canvas.__orbitScene = sc;
    canvas.__orbitNodes = built.nodes;

    /* ---------- 标签层 ---------- */
    var tip = root.querySelector('.orbit-tip');

    function showTip(node, mx, my) {
      if (!tip || !node) return;
      tip.innerHTML = '<b>' + esc(node.work.t) + '</b><span>' +
        esc(node.work.groupName) + ' · 模块 ' + esc(node.work.no) + '</span>';
      tip.hidden = false;
      var r = canvas.getBoundingClientRect();
      var tx = mx - r.left, ty = my - r.top;
      // 不让气泡出界
      var tw = tip.offsetWidth, th = tip.offsetHeight;
      tx = Math.max(6, Math.min(r.width - tw - 6, tx - tw / 2));
      ty = Math.max(6, ty - th - 14);
      tip.style.transform = 'translate(' + Math.round(tx) + 'px,' + Math.round(ty) + 'px)';
    }
    function hideTip() { if (tip) tip.hidden = true; }

    function esc(s) {
      return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /* ---------- 悬停 ---------- */
    canvas.addEventListener('mousemove', function (e) {
      var r = canvas.getBoundingClientRect();
      var mx = e.clientX - r.left, my = e.clientY - r.top;
      var hit = sc.hitTest(mx, my);
      var node = idxToNode[hit] || null;

      var newHl = node ? hit : -1;
      if (newHl !== sc.highlight) {
        sc.highlight = newHl;
        canvas.style.cursor = node ? 'pointer' : 'default';
        if (reduce) sc.drawStatic();
      }
      if (node) showTip(node, e.clientX, e.clientY);
      else hideTip();
    });

    canvas.addEventListener('mouseleave', function () {
      sc.highlight = -1;
      canvas.style.cursor = 'default';
      hideTip();
      if (reduce) sc.drawStatic();
    });

    /* ---------- 点击跳转 ---------- */
    canvas.addEventListener('click', function (e) {
      var r = canvas.getBoundingClientRect();
      var hit = sc.hitTest(e.clientX - r.left, e.clientY - r.top);
      var node = idxToNode[hit];
      if (node && node.work.url) global.location.href = node.work.url;
    });

    /* ---------- 滚轮缩放（2026-10-20） ----------
       用户要求：支持滚轮滑动放大缩小。

       细节：
         · preventDefault 阻止页面跟着滚（否则缩放时页面乱跳）
         · passive: false 才能 preventDefault
         · 缩放步长用指数：factor = exp(-deltaY * 0.0015)
           这样快滚慢滚的手感一致，不会「滚一下跳太多」
         · 触控板双指缩放会发 ctrlKey=true 的 wheel 事件，单独处理
         · 缩放到边界时不阻止页面滚动（让用户能继续往下滚） */
    canvas.addEventListener('wheel', function (e) {
      var delta = e.deltaY;
      // 不同浏览器/设备的 deltaY 量级差异很大，归一化
      if (e.deltaMode === 1) delta *= 16;        // 行模式
      else if (e.deltaMode === 2) delta *= 100;  // 页模式

      var factor = Math.exp(-delta * 0.0016);
      var before = sc.zoom;
      var after = sc.zoomBy(factor);

      // 到边界了就不拦页面滚动，否则用户会「卡住」
      var atLimit = (after === sc.minZoom && factor < 1) || (after === sc.maxZoom && factor > 1);
      if (!atLimit) e.preventDefault();

      if (after !== before) {
        updateZoomUI();
        if (reduce) sc.drawStatic();
      }
    }, { passive: false });

    /* ---------- 缩放 UI ---------- */
    var zoomVal = root.querySelector('.orbit-zoom__val');
    var zoomIn = root.querySelector('.orbit-zoom__in');
    var zoomOut = root.querySelector('.orbit-zoom__out');

    function updateZoomUI() {
      if (zoomVal) zoomVal.textContent = Math.round(sc.zoom * 100) + '%';
      if (zoomIn) zoomIn.disabled = sc.zoom >= sc.maxZoom - 0.001;
      if (zoomOut) zoomOut.disabled = sc.zoom <= sc.minZoom + 0.001;
    }
    updateZoomUI();

    function doZoom(f) {
      sc.zoomBy(f);
      updateZoomUI();
      if (reduce) sc.drawStatic();
    }
    if (zoomIn) zoomIn.addEventListener('click', function () { doZoom(1.22); });
    if (zoomOut) zoomOut.addEventListener('click', function () { doZoom(1 / 1.22); });

    /* ---------- 拖拽旋转 ---------- */
    var dragging = false, lastX = 0, lastY = 0, moved = 0;
    canvas.addEventListener('pointerdown', function (e) {
      dragging = true; moved = 0;
      lastX = e.clientX; lastY = e.clientY;
      sc.autoSpin = false;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      sc.userRotY += dx * 0.007;
      sc.userRotX = Math.max(-0.55, Math.min(0.85, sc.userRotX + dy * 0.005));
      lastX = e.clientX; lastY = e.clientY;
      if (reduce) sc.drawStatic();
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      global.setTimeout(function () { sc.autoSpin = true; }, 2600);
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', endDrag);

    /* ---------- 键盘 ---------- */
    canvas.addEventListener('keydown', function (e) {
      var step = 0.10;
      if (e.key === 'ArrowLeft') sc.userRotY -= step;
      else if (e.key === 'ArrowRight') sc.userRotY += step;
      else if (e.key === 'ArrowUp') sc.userRotX = Math.max(-0.55, sc.userRotX - step);
      else if (e.key === 'ArrowDown') sc.userRotX = Math.min(0.85, sc.userRotX + step);
      else return;
      e.preventDefault();
      sc.autoSpin = false;
      if (reduce) sc.drawStatic();
    });

    /* ---------- 重置 ---------- */
    var resetBtn = root.querySelector('.orbit-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        // 2026-10-20：重置同时回正缩放
        sc.resetView();
        updateZoomUI();
        if (reduce) sc.drawStatic();
      });
    }

    /* ---------- 尺寸 ---------- */
    if (global.ResizeObserver) {
      var ro = new ResizeObserver(function () {
        if (sc.resize() && !sc.raf) sc.drawStatic();
      });
      ro.observe(canvas);
    }

    /* ---------- 启动 ---------- */
    if (reduce) sc.drawStatic();
    else {
      if (sc.pendingSize) {
        global.requestAnimationFrame(function () { if (!sc.raf) sc.drawStatic(); });
      }
      sc.start();
    }

    return sc;
  }

  ready(function () {
    var root = document.getElementById('orbit');
    if (!root) return;

    if (!('IntersectionObserver' in global)) { init(root); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { init(root); io.disconnect(); }
      });
    }, { rootMargin: '300px 0px' });
    io.observe(root);
  });

  global.ORBIT_INIT = { init: init };
})(window);
