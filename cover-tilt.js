/* ==========================================================================
   cover-tilt.js — 封面 3D 倾斜（2026-10-19）
   --------------------------------------------------------------------------
   用户：「既然是 3D 模型就应该让封面变成 3D 的」。

   让每张作品封面按鼠标位置整体倾斜，形成真实透视。
   各层靠 CSS 的 translateZ 自动产生视差，JS 只负责写两个角度变量。

   性能：
     · 只在卡片上监听，且用 rAF 合并事件（mousemove 触发极频繁）
     · 指针离开立即回正
     · 触屏设备（pointer: coarse）完全不启用
     · prefers-reduced-motion 不启用
   ========================================================================== */
(function (global) {
  'use strict';

  var MAX_TILT = 7;        // 最大倾斜角度（度）。超过 10 会明显变形。
  var reduce = global.matchMedia &&
    global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = global.matchMedia &&
    global.matchMedia('(pointer: coarse)').matches;

  if (reduce || coarse) return;

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function attach(card) {
    if (card.__tiltBound) return;
    card.__tiltBound = true;

    var thumb = card.querySelector('.w-thumb');
    if (!thumb) return;

    var pending = false;
    var lastX = 0, lastY = 0;

    function apply() {
      pending = false;
      var r = thumb.getBoundingClientRect();
      if (!r.width || !r.height) return;
      // 归一化到 -1..1
      var nx = (lastX - r.left) / r.width * 2 - 1;
      var ny = (lastY - r.top) / r.height * 2 - 1;
      nx = Math.max(-1, Math.min(1, nx));
      ny = Math.max(-1, Math.min(1, ny));
      // 鼠标往右 → 卡片右侧后仰（rotateY 为负）
      thumb.style.setProperty('--tilt-y', (nx * MAX_TILT).toFixed(2) + 'deg');
      thumb.style.setProperty('--tilt-x', (-ny * MAX_TILT * 0.62).toFixed(2) + 'deg');
    }

    card.addEventListener('mousemove', function (e) {
      lastX = e.clientX;
      lastY = e.clientY;
      if (pending) return;
      pending = true;
      global.requestAnimationFrame(apply);
    }, { passive: true });

    card.addEventListener('mouseleave', function () {
      thumb.style.setProperty('--tilt-y', '0deg');
      thumb.style.setProperty('--tilt-x', '0deg');
    }, { passive: true });

    // 键盘聚焦时也给一点倾斜，让键盘用户感知到这张卡是「可交互的立体物」
    card.addEventListener('focusin', function () {
      thumb.style.setProperty('--tilt-y', '-2.5deg');
      thumb.style.setProperty('--tilt-x', '1.5deg');
    });
    card.addEventListener('focusout', function () {
      thumb.style.setProperty('--tilt-y', '0deg');
      thumb.style.setProperty('--tilt-x', '0deg');
    });
  }

  function scan(root) {
    (root || document).querySelectorAll('.w-card').forEach(attach);
  }

  /* 卡片是 works.js 动态插入的，DOMContentLoaded 时还不存在。
     所以除了首扫，还要监听后续插入。
     MutationObserver 比「手动调用 scan()」更稳：不依赖渲染顺序，
     也不用改 works.js —— 将来谁插入 .w-card 都会自动绑上。 */
  ready(function () {
    scan(document);

    if (!global.MutationObserver) return;

    var mo = new MutationObserver(function (records) {
      var found = false;
      for (var i = 0; i < records.length && !found; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType !== 1) continue;
          if (n.classList && n.classList.contains('w-card')) { found = true; break; }
          if (n.querySelector && n.querySelector('.w-card')) { found = true; break; }
        }
      }
      if (found) scan(document);
    });

    mo.observe(document.body, { childList: true, subtree: true });
  });

  // 也保留手动入口，方便调试或特殊场景
  global.COVER_TILT = { scan: scan };
})(window);
