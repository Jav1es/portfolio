/* ==========================================================================
   whale-3d-init.js — 作品生命周期鲸鱼：初始化与交互（2026-10-19）
   --------------------------------------------------------------------------
   · 从 works-data.js 读 23 个作品，按分组映射到鲸鱼身体（头=核心交付，尾=实验）
   · 鼠标悬停显示作品名 + 分组；点击跳转对应详情
   · 支持触摸、方向键旋转、重置
   · IntersectionObserver 懒初始化（进入视口才创建 Scene，不拖慢首屏）
   · prefers-reduced-motion：只画一帧静态图，不跑循环
   ========================================================================== */
(function (global) {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  // 分组 → 在鲸鱼上的位置（头 → 尾）
  // core 是核心交付，放头部；lab 是实验探索，放尾部
  var GROUP_ORDER = ['core', 'eng', 'oss', 'lab'];
  var GROUP_LABEL = {
    core: '核心案例',
    eng: 'AI 工程化',
    oss: '开源工具',
    lab: '实验与工具链'
  };

  function pickWorks() {
    // works-data.js 导出的全局是 window.__WORKS_DATA__（下划线包裹）
    var DATA = global.__WORKS_DATA__ || global.WORKS_DATA;
    var list = (DATA && (DATA.items || DATA.works)) || [];
    if (!list.length) return [];

    // 按分组排序：core → eng → oss → lab，让鲸鱼头尾对应「成熟 → 实验」
    var sorted = list.slice().sort(function (a, b) {
      var ia = GROUP_ORDER.indexOf(a.group);
      var ib = GROUP_ORDER.indexOf(b.group);
      if (ia < 0) ia = 99;
      if (ib < 0) ib = 99;
      if (ia !== ib) return ia - ib;
      return String(a.no).localeCompare(String(b.no));
    });

    return sorted.map(function (w) {
      return {
        no: w.no,
        t: w.t || w.title || '',
        group: GROUP_LABEL[w.group] || w.group || '',
        url: w.url || ('./works.html#' + (w.no || '')),
        raw: w
      };
    });
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function init(root) {
    var canvas = root.querySelector('#whale-canvas');
    if (!canvas) return null;
    if (canvas.__whaleInit) return null;
    canvas.__whaleInit = true;

    var works = pickWorks();
    if (!works.length) {
      // 数据没就绪：显示降级提示，不留空白画布
      var tip = root.querySelector('.whale-fallback');
      if (tip) tip.hidden = false;
      return null;
    }

    var reduce = global.matchMedia &&
      global.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var points = global.WHALE3D.buildWhalePoints(works);
    var sc = new global.WHALE3D.Scene(canvas, { points: points });

    /* ---------- 尺寸 ---------- */
    var ro = null;
    if (global.ResizeObserver) {
      ro = new ResizeObserver(function () {
        sc.resize();
        if (reduce) sc.draw();
      });
      ro.observe(canvas);
    }

    /* ---------- 悬停 ---------- */
    function localPos(e) {
      var r = canvas.getBoundingClientRect();
      var cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      var cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
      return { x: cx, y: cy };
    }

    canvas.addEventListener('mousemove', function (e) {
      var p = localPos(e);
      var hit = sc.hitTest(p.x, p.y);
      if (hit !== sc.hoverIdx) {
        sc.hoverIdx = hit;
        canvas.style.cursor = (typeof hit === 'object' && hit) ? 'pointer' : 'default';
        if (reduce) sc.draw();
      }
    });

    canvas.addEventListener('mouseleave', function () {
      if (sc.hoverIdx !== -1) {
        sc.hoverIdx = -1;
        canvas.style.cursor = 'default';
        if (reduce) sc.draw();
      }
    });

    /* ---------- 点击跳转 ---------- */
    canvas.addEventListener('click', function (e) {
      var p = localPos(e);
      var hit = sc.hitTest(p.x, p.y);
      if (hit && hit.url) global.location.href = hit.url;
    });

    /* ---------- 拖拽旋转 ---------- */
    var dragging = false, lastX = 0, lastY = 0;
    canvas.addEventListener('pointerdown', function (e) {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      sc.autoSpin = false;
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      sc.rotY += (e.clientX - lastX) * 0.007;
      sc.rotX += (e.clientY - lastY) * 0.005;
      sc.rotX = Math.max(-0.9, Math.min(0.9, sc.rotX));
      lastX = e.clientX; lastY = e.clientY;
      if (reduce) sc.draw();
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      // 松手 2.5 秒后恢复自转
      global.setTimeout(function () { sc.autoSpin = true; }, 2500);
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', endDrag);

    /* ---------- 键盘 ---------- */
    canvas.addEventListener('keydown', function (e) {
      var step = 0.09;
      if (e.key === 'ArrowLeft') { sc.rotY -= step; sc.autoSpin = false; }
      else if (e.key === 'ArrowRight') { sc.rotY += step; sc.autoSpin = false; }
      else if (e.key === 'ArrowUp') { sc.rotX = Math.max(-0.9, sc.rotX - step); sc.autoSpin = false; }
      else if (e.key === 'ArrowDown') { sc.rotX = Math.min(0.9, sc.rotX + step); sc.autoSpin = false; }
      else return;
      e.preventDefault();
      if (reduce) sc.draw();
    });

    /* ---------- 重置 ---------- */
    var resetBtn = root.querySelector('.whale-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        sc.rotY = -0.42;
        sc.rotX = 0.26;
        sc.autoSpin = true;
        if (reduce) sc.draw();
      });
    }

    /* ---------- 启动 ---------- */
    if (reduce) {
      sc.draw();
    } else {
      sc.start();
    }

    // 挂到 canvas 上：便于调试与外部验证（也方便将来做「跳到某个作品」的 API）
    canvas.__whaleScene = sc;

    return sc;
  }

  /* ---------- 懒初始化：进入视口附近才创建 ---------- */
  ready(function () {
    var root = document.getElementById('whale');
    if (!root) return;

    if (!('IntersectionObserver' in global)) {
      init(root);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          init(root);
          io.disconnect();
        }
      });
    }, { rootMargin: '320px 0px' });

    io.observe(root);
  });

  global.WHALE3D = global.WHALE3D || {};
  global.WHALE3D.init = init;
})(window);
