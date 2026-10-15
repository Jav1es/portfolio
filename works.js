/* ==========================================================================
   works.js — 作品数据渲染层（纯原生 JS，无框架、无构建）
   数据来源：works-data.json（由 extract-works.mjs 从 legacy-singlepage.html 抽取）
   三个岗位页 + 首页总览共用同一套数据，保证编号一致、可交叉引用。
   ========================================================================== */
(function (global) {
  'use strict';

  // ==========================================================================
  // 岗位定义：18 个模块按岗位归属
  // ==========================================================================
  var ROLES = {
    fde: {
      key: 'fde',
      page: 'fde.html',
      name: 'FDE 前线部署工程师',
      short: 'FDE',
      icon: '🚧',
      desc: '贴近业务现场做需求发现、方案落地与交付验收，对项目结果全流程负责。',
      // 模块归属：规划 / 工作流 / 数据 / 行业定制
      owns: ['01', '02', '03', '05', '08', '10', '12']
    },
    agent: {
      key: 'agent',
      page: 'ai-agent.html',
      name: 'AI 智能体开发工程师',
      short: 'AI Agent',
      icon: '🤖',
      desc: '独立设计并交付企业级智能体：六层架构、RAG、工具调用、评测与可观测性。',
      owns: ['04', '06', '07', '09', '11']
    },
    vibe: {
      key: 'vibe',
      page: 'vibe-engineer.html',
      name: 'VibeCoding / VibeEngineering 工程师',
      short: 'Vibe',
      icon: '✨',
      desc: '用自然语言驱动编码，做创意编码、交互体验与视觉实验，并把实验沉淀成可交付代码。',
      owns: ['13', '14', '15', '16', '17', '18']
    }
  };

  // 首页总览：模块 → 所属岗位页，供卡片跳转
  var MODULE_ROLE = {};
  Object.keys(ROLES).forEach(function (k) {
    ROLES[k].owns.forEach(function (no) { MODULE_ROLE[no] = k; });
  });

  var CATS = [
    { id: 'plan',     no: '①', icon: '📐', name: '规划与方案',     role: 'fde'   },
    { id: 'flow',     no: '②', icon: '🔧', name: '工作流落地',     role: 'fde'   },
    { id: 'data',     no: '④', icon: '📊', name: '数据与复盘',     role: 'fde'   },
    { id: 'industry', no: '⑥', icon: '🏭', name: '行业定制规划',   role: 'fde'   },
    { id: 'agent',    no: '③', icon: '🤖', name: '智能体与 AI 工程', role: 'agent' },
    { id: 'oss',      no: '⑤', icon: '🧩', name: '开源与工具链',   role: 'vibe'  }
  ];

  var CAT_MAP = {};
  CATS.forEach(function (c) { CAT_MAP[c.id] = c; });

  // ==========================================================================
  // 数据加载：优先内联数据（避免 file:// 下 fetch 被 CORS 拦截）
  // ==========================================================================
  var DATA = global.__WORKS_DATA__ || null;

  function loadData(cb) {
    if (DATA) return cb(DATA);
    fetch('./works-data.json')
      .then(function (r) { return r.json(); })
      .then(cb)
      .catch(function () {
        var el = document.getElementById('works-root');
        if (el) el.innerHTML = '<p class="works-error">作品数据加载失败：请通过本地 HTTP 服务打开（如 <code>python -m http.server</code>），或直接双击 index.html 使用内联数据版本。</p>';
      });
  }

  // ==========================================================================
  // 工具
  // ==========================================================================
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function isLocal(href) { return !/^https?:\/\//i.test(href); }

  // 链接：本地相对路径去掉 "./"；外链加 target/rel
  function renderLink(label, href) {
    if (isLocal(href)) {
      return '<a href="' + esc(href.replace(/^\.\//, '')) + '">' + esc(label) + '</a>';
    }
    return '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(label) + ' ↗</a>';
  }

  function statusBadge(it) {
    if (!it.status) return '';
    var cls = /开源/.test(it.status) ? 'is-oss' : (/交付|真实/.test(it.status) ? 'is-done' : 'is-demo');
    return '<span class="w-badge ' + cls + '">' + esc(it.status) + '</span>';
  }

  function catOf(it) { return CAT_MAP[it.cat] || { icon: '📁', name: '其他', role: 'fde' }; }

  function rolePageOf(it) {
    var r = ROLES[MODULE_ROLE[it.no] || catOf(it).role];
    return r ? r.page : 'fde.html';
  }

  // ==========================================================================
  // 渲染：作品卡片（列表页用）
  // ==========================================================================
  function cardHTML(it, opts) {
    opts = opts || {};
    var c = catOf(it);
    var hl = (it.highlights || []).map(function (h) {
      return '<div class="w-hl"><b>' + esc(h.num) + '</b><span>' + esc(h.label) + '</span></div>';
    }).join('');

    var links = (it.links || []).slice(0, opts.maxLinks || 3).map(function (l) {
      var p = l.split('|');
      return p.length === 2 ? renderLink(p[0], p[1]) : '';
    }).join('');

    var tags = (it.tags || []).map(function (t) {
      return '<span class="w-tag">' + esc(t) + '</span>';
    }).join('');

    var thumb = it.shot
      ? '<div class="w-thumb"><img src="' + esc(it.shot.replace(/^\.\//, '')) + '" alt="' +
        esc(it.t + ' 的项目截图：' + (it.metric || it.pitch.slice(0, 40))) +
        '" loading="lazy"></div>'
      : '';

    return '' +
      '<article class="w-card" id="mod-' + esc(it.no) + '" data-cat="' + esc(it.cat) + '" data-role="' + esc(MODULE_ROLE[it.no] || '') + '">' +
        thumb +
        '<div class="w-body">' +
          '<div class="w-top">' +
            '<span class="w-no">' + esc(it.no) + '</span>' +
            '<span class="w-cat">' + esc(c.icon) + ' ' + esc(c.name) + '</span>' +
            statusBadge(it) +
            (it.star ? '<span class="w-star" title="代表作">★</span>' : '') +
          '</div>' +
          '<h3 class="w-title">' + esc(it.t) + '</h3>' +
          '<p class="w-pitch">' + esc(it.pitch) + '</p>' +
          (hl ? '<div class="w-hls">' + hl + '</div>' : '') +
          (tags ? '<div class="w-tags">' + tags + '</div>' : '') +
          (links ? '<div class="w-links">' + links + '</div>' : '') +
        '</div>' +
      '</article>';
  }

  // ==========================================================================
  // 渲染：紧凑条目（首页总览用）
  // ==========================================================================
  function tileHTML(it) {
    var c = catOf(it);
    var rk = MODULE_ROLE[it.no];
    return '' +
      '<a class="w-tile" href="' + esc(rolePageOf(it)) + '#mod-' + esc(it.no) + '" data-cat="' + esc(it.cat) + '" data-role="' + esc(rk || '') + '">' +
        '<span class="w-tile-no">' + esc(it.no) + '</span>' +
        '<span class="w-tile-cat">' + esc(c.icon) + '</span>' +
        '<span class="w-tile-t">' + esc(it.t) + '</span>' +
        '<span class="w-tile-role">' + esc(ROLES[rk] ? ROLES[rk].short : '') + '</span>' +
      '</a>';
  }

  // ==========================================================================
  // 渲染：岗位页的模块清单
  // ==========================================================================
  function listByRole(items, roleKey, opts) {
    var role = ROLES[roleKey];
    var mine = items.filter(function (it) {
      return MODULE_ROLE[it.no] === roleKey;
    });
    if (!mine.length) return '<p class="works-empty">暂无归属模块。</p>';

    return mine.map(function (it) {
      return cardHTML(it, opts);
    }).join('');
  }

  // ==========================================================================
  // 渲染：首页统计条
  // ==========================================================================
  function statHTML() {
    return '' +
      '<div class="w-stats">' +
        '<div class="w-stat"><b>300+</b><span>项目可研 / 立项</span></div>' +
        '<div class="w-stat"><b>100+</b><span>服务企业客户</span></div>' +
        '<div class="w-stat"><b>18</b><span>深度作品模块</span></div>' +
        '<div class="w-stat"><b>93.3%</b><span>RAG 检索准确率 @3</span></div>' +
      '</div>';
  }

  // ==========================================================================
  // 筛选器（首页总览用）
  // ==========================================================================
  function bindFilter(filterRoot, tilesRoot) {
    if (!filterRoot || !tilesRoot) return;
    var buttons = filterRoot.querySelectorAll('[data-filter]');
    var tiles = tilesRoot.querySelectorAll('[data-cat]');
    if (!buttons.length || !tiles.length) return;

    function apply(key) {
      tiles.forEach(function (t) {
        var show = key === 'all' || t.getAttribute('data-cat') === key ||
                   t.getAttribute('data-role') === key;
        t.hidden = !show;
      });
      buttons.forEach(function (b) {
        var on = b.getAttribute('data-filter') === key;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      var cnt = filterRoot.querySelector('[data-filter-count]');
      if (cnt) {
        var n = tilesRoot.querySelectorAll('[data-cat]:not([hidden])').length;
        cnt.textContent = n + ' / ' + tiles.length + ' 个模块';
      }
    }

    buttons.forEach(function (b) {
      b.addEventListener('click', function () { apply(b.getAttribute('data-filter')); });
    });
    apply('all');
  }

  // ==========================================================================
  // 对外 API
  // ==========================================================================
  global.WORKS = {
    ROLES: ROLES,
    CATS: CATS,
    CAT_MAP: CAT_MAP,
    MODULE_ROLE: MODULE_ROLE,
    loadData: loadData,
    cardHTML: cardHTML,
    tileHTML: tileHTML,
    listByRole: listByRole,
    statHTML: statHTML,
    bindFilter: bindFilter,
    esc: esc
  };
})(window);
