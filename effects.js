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
  function bindReveal(root, opts) {
    var scope = root || document;
    var fresh = opts && opts.fresh === true;
    var targets = scope.querySelectorAll('.w-card, .entry-card, .strength-grid li, .duty-list li');
    if (!targets.length) return;

    var list = Array.prototype.slice.call(targets);

    // 若所有目标的尺寸都是 0，说明此刻浏览器还没完成布局
    //（卡片 HTML 刚被 innerHTML 写入，同一次任务里读 rect 会拿到 0）。
    // 这时不做任何 armed 判断，等下一帧重来 —— 否则 inView 全部误判为
    // 「不在视口」，而 show() 又没被调用，卡片会停在隐藏态。
    var laidOut = list.some(function (el) {
      var r = el.getBoundingClientRect();
      return r.width > 0 || r.height > 0;
    });
    if (!laidOut) {
      global.requestAnimationFrame(function () { bindReveal(scope); });
      return;
    }

    function show(el, delay) {
      el.style.transitionDelay = delay + 'ms';
      el.classList.add('is-revealed');
      el.classList.remove('reveal-armed');
    }

    // 同批进入视口的卡片按索引错开出现（2026-10-19 用户要求「给每个作品集
    // 做一个小动画」）。原来 show(el, 0) 固定 0 延迟，一屏 6 张同时淡入，
    // 看起来是「整块闪现」而不是「一张张铺开」。
    // 上限 6 张：再多后面的要等太久，反而像加载卡住。
    function showBatch(els) {
      els.forEach(function (el, i) {
        show(el, Math.min(i, 6) * 55);
      });
    }

    if (reduceMotion || !global.IntersectionObserver) {
      list.forEach(function (el) { show(el, 0); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      var hit = [];
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        hit.push(entry.target);
        io.unobserve(entry.target);
      });
      // 同批进入视口的卡片一起交错，形成「一排排铺开」的节奏
      if (hit.length) showBatch(hit);
    }, { rootMargin: '150px 0px', threshold: 0.01 });

    // 只给"还没进视口"的元素加隐藏态；视口内的立即可见，避免首屏空白
    list.forEach(function (el) {
      // fresh 模式：这些元素是「渲染后新出现的」，可能已被上一轮
      // bindReveal 误判为「在视口内」而提前显示。先复位再重新判断，
      // 否则入场动画永远不会播（2026-10-19 实测：首页 6 张精选卡
      // 在 bootEffects() 那次调用里被当成视口内元素，直接 is-revealed）。
      if (fresh && !el.classList.contains('reveal-armed')) {
        el.classList.remove('is-revealed');
      }
      var r = el.getBoundingClientRect();
      var inView = r.top < global.innerHeight + 150 && r.bottom > -150;
      if (!inView) el.classList.add('reveal-armed');
      io.observe(el);
    });

    // 兜底：3 秒后把「已经滚到视口里却还没显示」的元素强制显示，
    // 防止 observer 异常导致内容永久空白。
    // ⚠️ 不能无条件 show 全部 —— 远在视口外的卡片也会被补播，
    // 用户滚下去时动画早已结束，等于白做（2026-10-19 实测：首页 6 张
    // 精选卡在 3 秒时被全部补显示，滚动时看不到任何入场效果）。
    setTimeout(function () {
      list.forEach(function (el) {
        if (el.classList.contains('is-revealed')) return;
        var r = el.getBoundingClientRect();
        var reallyInView = r.top < global.innerHeight && r.bottom > 0;
        if (reallyInView) {
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