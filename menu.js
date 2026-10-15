/* ==========================================================================
   menu.js — 汉堡菜单折叠逻辑（视口 <600px 生效）
   纯原生 JavaScript，无第三方依赖。
   行为：
   - 点击汉堡按钮展开 / 收起全部导航链接
   - 同步 aria-expanded / aria-hidden
   - 点击菜单外、Esc、窗口放大到 ≥600px 时自动复位收起
   ========================================================================== */
(function () {
  'use strict';

  var BREAKPOINT = 600; // 与 styles.css 中的 599.98px 断点对应

  function initNav() {
    var toggle = document.querySelector('[data-nav-toggle]');
    var links = document.getElementById('nav-links');
    if (!toggle || !links) return;

    function setOpen(open) {
      links.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      links.setAttribute('aria-hidden', String(!open));
    }

    function isOpen() {
      return toggle.getAttribute('aria-expanded') === 'true';
    }

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!isOpen());
    });

    // 点击导航区域以外 → 收起
    document.addEventListener('click', function (e) {
      if (!isOpen()) return;
      if (links.contains(e.target) || toggle.contains(e.target)) return;
      setOpen(false);
    });

    // Esc → 收起并把焦点还给按钮
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });

    // 视口放大到 ≥600px（横向导航）→ 复位收起，避免残留展开态
    function syncToViewport() {
      if (window.innerWidth >= BREAKPOINT) setOpen(false);
    }
    window.addEventListener('resize', syncToViewport);
    window.addEventListener('orientationchange', syncToViewport);

    // 初始状态
    setOpen(false);
    syncToViewport();
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(initNav);
})();
