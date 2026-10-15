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

    var list = Array.prototype.slice.call(targets);

    function show(el, delay) {
      el.style.transitionDelay = delay + 'ms';
      el.classList.add('is-revealed');
      el.classList.remove('reveal-armed');
    }

    if (reduceMotion || !global.IntersectionObserver) {
      list.forEach(function (el) { show(el, 0); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        show(entry.target, 0);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '150px 0px', threshold: 0.01 });

    // 只给"还没进视口"的元素加隐藏态；视口内的立即可见，避免首屏空白
    list.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var inView = r.top < global.innerHeight + 150 && r.bottom > -150;
      if (!inView) el.classList.add('reveal-armed');
      io.observe(el);
    });

    // 兜底：3 秒后仍未显示的强制显示，任何异常路径都不留空白
    setTimeout(function () {
      list.forEach(function (el) {
        if (!el.classList.contains('is-revealed')) {
          el.style.transitionDelay = '0ms';
          show(el, 0);
          io.unobserve(el);
        }
      });
    }, 3000);
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

  /* ---------------------------------------------------------- 滚动视差
     背景层随滚动缓慢位移，制造"往深处走"的纵深。
     用 rAF 节流 + 只写 transform，避免 scroll 事件里直接改样式导致掉帧。 */
  function bindParallax() {
    if (reduceMotion) return;
    var layers = document.querySelectorAll('[data-parallax]');
    if (!layers.length) return;

    var ticking = false;
    function update() {
      var y = global.scrollY || 0;
      Array.prototype.forEach.call(layers, function (el) {
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.1;
        el.style.transform = 'translate3d(0,' + (y * speed).toFixed(1) + 'px,0)';
      });
      ticking = false;
    }
    global.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
  }

  /* --------------------------------------------------- 文字逐字/分段揭示
     给 .sec-tag、.kicker 之类的标签加一条扫光，强化科技感。
     用 CSS 伪元素 + overflow:hidden，不触碰 JS 逐字切分（性能与可读性都更好）。 */
  function bindSweep() {
    if (reduceMotion) return;
    var tags = document.querySelectorAll('.sec-tag:not(.swept)');
    if (!tags.length || !global.IntersectionObserver) return;

    Array.prototype.forEach.call(tags, function (el) {
      el.classList.add('swept');
    });
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
      bindParallax();
      bindSweep();
    }
  };
})(window);