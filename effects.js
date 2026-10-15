/* ==========================================================================
   effects.js — 3D 与滚动交互（纯原生 JS，无框架、无依赖）
   提供：
     1) bindTilt()    卡片跟随鼠标 3D 倾斜 + 高光跟随
     2) bindReveal()  元素进入视口时的淡入上移
     3) bindCounters() 统计数字滚动到位
     4) bindScrollProgress() 顶部阅读进度条
   全部在 prefers-reduced-motion: reduce 或无 IntersectionObserver 时静默降级。
   ========================================================================== */
(function (global) {
  'use strict';

  var reduceMotion = global.matchMedia
    ? global.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  // 触摸设备不做倾斜（没有指针悬停语义，且易与滚动冲突）
  var coarsePointer = global.matchMedia
    ? global.matchMedia('(hover: none)').matches
    : false;

  /* ---------------------------------------------------------------- 3D 倾斜 */
  function bindTilt(root) {
    if (reduceMotion || coarsePointer) return;

    var maxTilt = 7; // 最大倾角（度）
    var cards = (root || document).querySelectorAll('.tilt');

    Array.prototype.forEach.call(cards, function (card) {
      // 键盘聚焦时不倾斜，保持稳定的可读状态
      function reset() {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
        card.classList.remove('is-tilting');
      }

      card.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;   // 0..1
        var py = (e.clientY - r.top) / r.height;   // 0..1

        card.classList.add('is-tilting');
        card.style.setProperty('--ry', ((px - 0.5) * maxTilt * 2).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((0.5 - py) * maxTilt * 2).toFixed(2) + 'deg');
        card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      });

      card.addEventListener('pointerleave', reset);
      card.addEventListener('blur', reset, true);
    });
  }

  /* ------------------------------------------------------------ 进场动画 */
  function bindReveal(root) {
    var scope = root || document;
    var targets = scope.querySelectorAll('.w-card, .entry-card, .strength-grid li, .duty-list li');
    if (!targets.length) return;

    function show(el, i) {
      el.style.transitionDelay = Math.min(i * 40, 240) + 'ms';
      el.classList.add('is-revealed');
    }

    // 无 IntersectionObserver：直接全部显示（内容永不可被动画锁死）
    if (reduceMotion || !global.IntersectionObserver) {
      Array.prototype.forEach.call(targets, function (el, i) { show(el, i); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        show(entry.target, 0);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });

    // 兜底：2.5 秒后仍未显示的（无头浏览器 / IO 未回调等），强制显示
    setTimeout(function () {
      Array.prototype.forEach.call(targets, function (el) {
        if (!el.classList.contains('is-revealed')) {
          el.style.transitionDelay = '0ms';
          el.classList.add('is-revealed');
          io.unobserve(el);
        }
      });
    }, 2500);
  }

  /* ------------------------------------------------------------ 数字滚动 */
  function bindCounters(root) {
    var scope = root || document;
    var nums = scope.querySelectorAll('[data-count]');
    if (!nums.length) return;

    // 动画起点就是最终值，未触发时显示也正确；reduce-motion 直接跳过
    if (reduceMotion || !global.IntersectionObserver) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var target = parseFloat(el.getAttribute('data-count') || '0');
        var dec = (el.getAttribute('data-count').split('.')[1] || '').replace(/\D/g, '').length;
        var suffix = el.getAttribute('data-suffix') || '';
        var start = performance.now();
        var dur = 900;

        function step(now) {
          var p = Math.min((now - start) / dur, 1);
          // easeOutCubic
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = (target * eased).toFixed(dec) + suffix;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    }, { threshold: 0.4 });

    Array.prototype.forEach.call(nums, function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------- 阅读进度条 */
  function bindScrollProgress() {
    var bar = document.querySelector('[data-progress]');
    if (!bar) return;

    function update() {
      var h = document.documentElement.scrollHeight - global.innerHeight;
      var p = h > 0 ? (global.scrollY / h) * 100 : 0;
      bar.style.width = Math.min(100, Math.max(0, p)) + '%';
    }
    global.addEventListener('scroll', update, { passive: true });
    global.addEventListener('resize', update);
    update();
  }

  global.EFFECTS = {
    bindTilt: bindTilt,
    bindReveal: bindReveal,
    bindCounters: bindCounters,
    bindScrollProgress: bindScrollProgress,
    init: function (root) {
      bindTilt(root);
      bindReveal(root);
      bindCounters(root);
      bindScrollProgress();
    }
  };
})(window);