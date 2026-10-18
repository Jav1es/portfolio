/* ==========================================================================
   works.js — 作品数据渲染层（纯原生 JS，无框架、无构建、无外部依赖）
   数据来源：works-data.json / works-data.js（由 extract-works.mjs + patch-works.mjs 生成）
   首页总览 + 三个岗位页共用同一套数据，保证编号一致、可交叉锚点跳转。
   ========================================================================== */
(function (global) {
  'use strict';

  // ==========================================================================
  // 岗位定义：模块按岗位归属（编号对齐真实目录/仓库，见 patch-works.mjs）
  //
  // ⚠️ owns 是**兜底列表**，运行时以每条的 jd 字段为准自动派生（见下方
  //    resolveOwns）。原因：owns 是手写编号，新增作品时必然漏（2026-10-19
  //    实测 22 号作品加入后，三个岗位的 owns 合计 21 个，22 号无人认领，
  //    按岗位筛选时会直接消失）。改由 jd 派生后，新作品只要填对 jd 就自动归位。
  // ==========================================================================
  var ROLES = {
    fde: {
      key: 'fde',
      page: 'fde.html',
      name: 'FDE 前线部署工程师',
      short: 'FDE',
      icon: '🚧',
      desc: '贴近业务现场做需求发现、方案落地与交付验收，对项目结果全流程负责。',
      // 规划 / 工作流 / 数据
      owns: ['01', '02', '03', '05', '06', '08', '10', '11']
    },
    agent: {
      key: 'agent',
      page: 'ai-agent.html',
      name: 'AI 智能体开发工程师',
      short: 'AI Agent',
      icon: '🤖',
      desc: '独立设计并交付企业级智能体：六层架构、RAG、工具调用、评测与可观测性。',
      owns: ['04', '07', '09', '13', '14']
    },
    vibe: {
      key: 'vibe',
      page: 'vibe-engineer.html',
      name: 'VibeCoding / VibeEngineering 工程师',
      short: 'Vibe',
      icon: '✨',
      desc: '用自然语言驱动编码，做创意编码、交互体验与视觉实验，并把实验沉淀成可交付代码。',
      owns: ['12', '15', '16', '17', '18', '19', '20', '21']
    }
  };

  // 模块 → 所属岗位，供首页瓦片交叉跳转
  // 必须定义在 resolveOwns 之前：resolveOwns 会调 rebuildModuleRole()，
  // 而 var 声明的 MODULE_ROLE 若不先执行，函数内赋值会落到全局而非闭包。
  var MODULE_ROLE = {};
  function rebuildModuleRole() {
    MODULE_ROLE = {};
    Object.keys(ROLES).forEach(function (k) {
      ROLES[k].owns.forEach(function (no) { MODULE_ROLE[no] = k; });
    });
  }
  rebuildModuleRole();

  // 岗位归属：以 ROLES[].owns 为准，只把「没被任何岗位认领」的新作品补进去。
  //
  // ⚠️ 不能用 jd 做权威来源 —— jd 是展示文案，写法很杂
  //    （「AI 项目经理」「FDE / AI 项目经理」「所有岗位（数据量化是共同底座）」
  //    甚至一个作品同时挂多个岗位）。2026-10-19 试过按 jd 严格匹配，结果
  //    12/15/16/17/18 的 jd 都是「AI 智能体开发工程师」，被从 vibe 抢到 agent，
  //    三个岗位的既有归属全乱。所以 jd 只用来给**新作品**兜底。
  var JD_HINTS = [
    { role: 'vibe',  re: /VibeCoding|VibeEngineering/i },
    { role: 'agent', re: /智能体开发工程师/ },
    { role: 'fde',   re: /FDE|前线部署|项目经理/ }
  ];
  function resolveOwns(items) {
    var claimed = {};
    Object.keys(ROLES).forEach(function (k) {
      ROLES[k].owns.forEach(function (no) { claimed[no] = k; });
    });
    var added = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (claimed[it.no]) continue;           // 已有归属，尊重人工配置
      var rk = null;
      for (var j = 0; j < JD_HINTS.length; j++) {
        if (JD_HINTS[j].re.test(it.jd || '')) { rk = JD_HINTS[j].role; break; }
      }
      if (!rk) rk = 'vibe';                   // 兜底：归到最宽的那个岗位
      ROLES[rk].owns.push(it.no);
      claimed[it.no] = rk;
      added.push(it.no + '→' + rk);
    }
    if (added.length) {
      console.log('[WORKS] 新作品自动归岗：' + added.join(' '));
      rebuildModuleRole();
    }
    return ROLES;
  }

  var CATS = [
    { id: 'plan',     no: '①', icon: '📐', name: '规划与方案'       },
    { id: 'flow',     no: '②', icon: '🔧', name: '工作流落地'       },
    { id: 'agent',    no: '③', icon: '🤖', name: '智能体与 AI 工程' },
    { id: 'data',     no: '④', icon: '📊', name: '数据与量化复盘'   },
    { id: 'oss',      no: '⑤', icon: '🧩', name: '开源与工具链'     },
    { id: 'industry', no: '⑥', icon: '🏭', name: '行业定制规划'     }
  ];

  var CAT_MAP = {};
  CATS.forEach(function (c) { CAT_MAP[c.id] = c; });

  // ==========================================================================
  // 数据加载：优先内联数据（file:// 双击打开时 fetch 会被 CORS 拦截）
  // ==========================================================================
  var DATA = global.__WORKS_DATA__ || null;

  function loadData(cb) {
    // 数据到手后先按 jd 重算岗位归属，再交给调用方 ——
    // 这样 5 个页面都不用各自调 resolveOwns，也不会漏。
    function hand(data) {
      try { resolveOwns(data.items || []); } catch (e) { /* 归属算不出来不影响渲染 */ }
      cb(data);
    }
    if (DATA) return hand(DATA);
    fetch('./works-data.json')
      .then(function (r) { return r.json(); })
      .then(hand)
      .catch(function () {
        var el = document.getElementById('works-root');
        if (el) {
          el.innerHTML = '<p class="works-error">作品数据加载失败：请通过本地 HTTP 服务打开' +
            '（如 <code>python -m http.server</code>），或确认 <code>works-data.js</code> 与本页在同一目录。</p>';
        }
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
  // md / json / py 附加「预览」按钮：可在站内直接看内容，不必跳转或下载
  // 预览内容来自 works-previews.js（独立懒加载），不用 fetch ——
  // file:// 协议下浏览器会拦掉本地 fetch，但 <script> 引入的 JS 不受限。
  function previewBtn(it, label, href) {
    var clean = href.replace(/^\.\//, '');
    var idx = pvIndexOf(it.no, clean);
    if (idx < 0) return '';
    return '<button class="w-preview" type="button" data-preview="' + esc(it.no) + ':' + idx + '" ' +
      'aria-expanded="false" aria-label="在网页中预览 ' + esc(label) + '">预览</button>';
  }

  // 预览索引里查该文件的下标；索引来自 works-previews-index.js（小体积）
  function pvIndexOf(no, file) {
    var idx = global.__WORKS_PREVIEW_INDEX__ || {};
    var list = idx[no] || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].file === file) return i;
    }
    return -1;
  }

  function renderLink(it, label, href) {
    if (isLocal(href)) {
      return '<span class="w-link"><a href="' + esc(href.replace(/^\.\//, '')) + '">' +
        esc(label) + '</a>' + previewBtn(it, label, href) + '</span>';
    }
    return '<span class="w-link"><a href="' + esc(href) + '" target="_blank" rel="noopener">' +
      esc(label) + ' ↗</a></span>';
  }

  /* ------------------------------------------------------------ 文件预览 */
  // 正文来自 works-previews.js（128KB）：首次点击预览时才动态注入，不进首屏。
  // 为什么不用 fetch 读原文件：file:// 协议下浏览器会 CORS 拦掉本地 fetch，
  // 而动态插入的 <script> 在 file:// 下照样能加载。
  var pvLoading = false, pvQueue = [];

  function loadPreviews(done) {
    if (global.__WORKS_PREVIEWS__) return done(true);
    pvQueue.push(done);
    if (pvLoading) return;
    pvLoading = true;
    var s = document.createElement('script');
    s.src = './works-previews.js';
    s.onload = function () {
      pvLoading = false;
      pvQueue.splice(0).forEach(function (cb) { cb(true); });
    };
    s.onerror = function () {
      pvLoading = false;
      pvQueue.splice(0).forEach(function (cb) { cb(false); });
    };
    document.head.appendChild(s);
  }

  function bindPreview(root) {
    var scope = root || document;
    scope.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.w-preview') : null;
      if (!btn) return;
      var box = btn.closest('.w-card').querySelector('.w-preview-box');
      if (!box) return;

      // 再点一次 = 收起
      if (btn.getAttribute('aria-expanded') === 'true') {
        btn.setAttribute('aria-expanded', 'false');
        btn.textContent = '预览';
        box.hidden = true;
        return;
      }
      btn.setAttribute('aria-expanded', 'true');
      btn.textContent = '收起';
      box.hidden = false;
      if (box.getAttribute('data-loaded') === '1') return;

      var parts = btn.getAttribute('data-preview').split(':');  // "模块号:索引"
      var idx = parseInt(parts[1], 10);
      box.innerHTML = '<p class="w-pv-loading">正在载入预览内容…</p>';

      loadPreviews(function (ok) {
        var all = (global.__WORKS_PREVIEWS__ || {})[parts[0]] || [];
        var pv = all[idx];

        if (!ok || !pv) {
          box.innerHTML = '<p class="w-pv-loading">预览内容载入失败，' +
            '请点左侧链接直接查看原文。</p>';
          box.setAttribute('data-loaded', '0');
          return;
        }

        var head = '<div class="w-pv-head"><span class="w-pv-name">' + esc(pv.file) + '</span>' +
          '<span class="w-pv-meta">' + pv.fullLength.toLocaleString() + ' 字符' +
          (pv.truncated ? ' · 预览前 ' + pv.body.length.toLocaleString() + ' 字符' : '') +
          '</span></div>';

        box.innerHTML = head + '<pre class="w-pv-pre"><code>' + esc(pv.body) + '</code></pre>';

        if (pv.truncated) {
          box.innerHTML += '<p class="w-pv-foot">以上为前 ' + pv.body.length.toLocaleString() +
            ' 字符预览。查看全文请点左侧「' + esc(pv.label) + '」链接。</p>';
        }
        box.setAttribute('data-loaded', '1');
      });
    });
  }

  function statusBadge(it) {
    if (!it.status) return '';
    var cls = /开源/.test(it.status) ? 'is-oss' : (/交付|真实/.test(it.status) ? 'is-done' : 'is-demo');
    return '<span class="w-badge ' + cls + '">' + esc(it.status) + '</span>';
  }

  function catOf(it) { return CAT_MAP[it.cat] || { icon: '📁', name: '其他' }; }

  function rolePageOf(it) {
    var r = ROLES[MODULE_ROLE[it.no]];
    return r ? r.page : 'fde.html';
  }

  // ==========================================================================
  // 内联 SVG 示意图：按类目生成几何母题，无需任何外部图片资源
  // （保证离线可用、首屏零图片请求，且每张都有语义化 <title>/aria-label>）
  // ==========================================================================
  var W = 400, H = 225; // 16:9

  var MOTIFS = {
    // ① 规划：阶段路线图（节点 + 连接线 + 里程碑）
    roadmap: function (id, hue) {
      var pts = [[38, 168], [104, 128], [170, 150], [236, 96], [302, 118], [368, 62]];
      var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' ');
      var dots = pts.map(function (p, i) {
        return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i === pts.length - 1 ? 8 : 5) + '" fill="' + (i === pts.length - 1 ? hue : '#94a3b8') + '"/>';
      }).join('');
      var bars = pts.map(function (p, i) {
        return '<rect x="' + (p[0] - 13) + '" y="' + (p[1] + 16) + '" width="26" height="3" rx="1.5" fill="#cbd5e1"/>';
      }).join('');
      return '<path d="' + d + '" stroke="' + hue + '" stroke-width="2" fill="none" stroke-dasharray="5 4"/>' + dots + bars;
    },
    // ② 工作流：管道（输入 → 处理 → 审核 → 输出）
    pipeline: function (id, hue) {
      var boxes = [[26, 78], [118, 78], [210, 78], [302, 78]];
      var rects = boxes.map(function (b, i) {
        return '<rect x="' + b[0] + '" y="' + b[1] + '" width="72" height="68" rx="10" fill="' +
          (i === 2 ? hue : '#e2e8f0') + '" opacity="' + (i === 2 ? '.16' : '1') + '"/>' +
          '<rect x="' + (b[0] + 14) + '" y="' + (b[1] + 22) + '" width="44" height="4" rx="2" fill="' +
          (i === 2 ? hue : '#94a3b8') + '"/>' +
          '<rect x="' + (b[0] + 14) + '" y="' + (b[1] + 36) + '" width="30" height="4" rx="2" fill="#cbd5e1"/>';
      }).join('');
      var arrows = [0, 1, 2].map(function (i) {
        return '<path d="M' + (boxes[i][0] + 76) + ' 112 L' + (boxes[i + 1][0] - 12) + ' 112" stroke="' + hue +
          '" stroke-width="2" marker-end="url(#ar' + id + ')"/>';
      }).join('');
      return '<defs><marker id="ar' + id + '" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">' +
        '<path d="M0 0 L7 3.5 L0 7 z" fill="' + hue + '"/></marker></defs>' + rects + arrows;
    },
    // ③ 智能体：神经网络节点图
    neural: function (id, hue) {
      var layers = [[54, 4], [140, 5], [226, 5], [312, 4], [372, 2]];
      var nodes = [], edges = [];
      layers.forEach(function (col, li) {
        var gap = 150 / (col.length + 1);
        col.forEach(function (_, ni) {
          var x = col[0], y = 38 + gap * (ni + 1);
          nodes.push('<circle cx="' + x + '" cy="' + y + '" r="5.5" fill="' + (li === 3 ? hue : '#94a3b8') + '"/>');
          if (li < layers.length - 1) {
            var nextGap = 150 / (layers[li + 1].length + 1);
            layers[li + 1].forEach(function (_, mi) {
              var nx = layers[li + 1][0], ny = 38 + nextGap * (mi + 1);
              edges.push('<line x1="' + x + '" y1="' + y + '" x2="' + nx + '" y2="' + ny +
                '" stroke="#cbd5e1" stroke-width="1" opacity=".65"/>');
            });
          }
        });
      });
      return edges.join('') + nodes.join('');
    },
    // ④ 数据：柱状 + 折线趋势
    metrics: function (id, hue) {
      var hs = [38, 62, 46, 84, 58, 100, 74];
      var bw = 26, gap = 18, x0 = 40;
      var bars = hs.map(function (h, i) {
        return '<rect x="' + (x0 + i * (bw + gap)) + '" y="' + (170 - h) + '" width="' + bw +
          '" height="' + h + '" rx="5" fill="' + (i === 5 ? hue : '#cbd5e1') + '"/>';
      }).join('');
      var pts = hs.map(function (h, i) { return (x0 + i * (bw + gap) + bw / 2) + ' ' + (170 - h - 12); });
      var path = pts.map(function (p, i) { return (i ? 'L' : 'M') + p; }).join(' ');
      return '<line x1="30" y1="172" x2="372" y2="172" stroke="#e2e8f0" stroke-width="1.5"/>' + bars +
        '<path d="' + path + '" stroke="' + hue + '" stroke-width="2" fill="none" stroke-linejoin="round"/>' +
        pts.map(function (p) {
          var xy = p.split(' ');
          return '<circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="3" fill="' + hue + '"/>';
        }).join('');
    },
    // ⑤ 开源：终端窗口（命令行 + 输出）
    terminal: function (id, hue) {
      // [x, y, 行宽, 颜色]
      var lines = [
        [56, 84,  128, hue],
        [56, 100, 108, '#4ade80'],
        [56, 116, 132, '#4ade80'],
        [56, 132, 92,  '#4ade80'],
        [56, 154, 118, '#94a3b8'],
        [56, 172, 74,  hue]
      ];
      return '<rect x="30" y="42" width="340" height="146" rx="12" fill="#0f172a"/>' +
        '<rect x="30" y="42" width="340" height="26" rx="12" fill="#1e293b"/>' +
        '<rect x="30" y="60" width="340" height="8" fill="#1e293b"/>' +
        '<circle cx="48" cy="55" r="4" fill="#ef4444"/><circle cx="64" cy="55" r="4" fill="#f59e0b"/>' +
        '<circle cx="80" cy="55" r="4" fill="#22c55e"/>' +
        lines.map(function (l) {
          return '<rect x="' + l[0] + '" y="' + l[1] + '" width="' + l[2] +
            '" height="7" rx="3.5" fill="' + l[3] + '"/>';
        }).join('') +
        '<rect x="136" y="168" width="8" height="12" fill="' + hue + '"/>';
    },
    // ⑥ 行业：蓝图网格
    grid: function (id, hue) {
      var cells = '';
      for (var r = 0; r < 3; r++) {
        for (var c = 0; c < 5; c++) {
          var on = (r * 5 + c) % 4 === 0 || (r === 1 && c === 2);
          cells += '<rect x="' + (46 + c * 62) + '" y="' + (66 + r * 40) + '" width="52" height="30" rx="6" fill="' +
            (on ? hue : '#e2e8f0') + '" opacity="' + (on ? '.18' : '1') + '"/>';
        }
      }
      return cells + '<line x1="46" y1="196" x2="356" y2="196" stroke="#cbd5e1" stroke-width="1.5"/>';
    }
  };

  // 每种母题配一个主色（仍属 ≤3 主色体系内的蓝/青两族 + 中性）
  var MOTIF_HUE = {
    roadmap: '#2563eb', pipeline: '#0e7490', neural: '#2563eb',
    metrics: '#0e7490', terminal: '#2563eb', grid: '#0e7490'
  };

  function coverSVG(it) {
    var motif = (MOTIFS[it.motif] || MOTIFS.grid)('c' + it.no, MOTIF_HUE[it.motif] || '#2563eb');
    return '<svg class="w-cover" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
      esc(it.t + ' 的示意图：' + it.pitch.slice(0, 46) + '…') + '" preserveAspectRatio="xMidYMid meet">' +
      '<rect width="' + W + '" height="' + H + '" fill="#f8fafc"/>' +
      '<g>' + motif + '</g>' +
      '</svg>';
  }

  // ==========================================================================
  // 分组定义（P0-2）
  // 元数据权威来源是 works-data.json 的 data.groups / data.groupOrder
  // （由 patch-works.mjs 写入，保证数据侧自解释）；这里只是 fallback ——
  // data 里读不到时才用，避免同一份文案在两个文件里各硬编码一份。
  // ==========================================================================
  var GROUPS_FALLBACK = {
    core: { id: 'core', no: '①', icon: '🎯', name: '核心案例', desc: '' },
    eng:  { id: 'eng',  no: '②', icon: '🔧', name: 'AI 工程化', desc: '' },
    oss:  { id: 'oss',  no: '③', icon: '🧩', name: '开源工具', desc: '' },
    lab:  { id: 'lab',  no: '④', icon: '✨', name: '实验与 VibeCoding', desc: '' }
  };
  var GROUP_ORDER_FALLBACK = ['core', 'eng', 'oss', 'lab'];

  // 延迟求值：works-data.js 与 works.js 的加载顺序不保证，取用时再读 DATA。
  function groupsTable() { return (DATA && DATA.groups) || GROUPS_FALLBACK; }
  function groupOrder() { return (DATA && DATA.groupOrder) || GROUP_ORDER_FALLBACK; }

  // 模块 → 群组：以 item.group 为准；缺失时按编号段兜底（保证分组永远有值）。
  function groupOf(it) {
    if (it && it.group) return it.group;
    var n = parseInt(it && it.no, 10);
    if (n >= 4 && n <= 16 && [4, 11, 13, 14, 16].indexOf(n) >= 0) return 'core';
    if ([1, 2, 3, 5, 7].indexOf(n) >= 0) return 'eng';
    if ([12, 15, 17, 18, 19].indexOf(n) >= 0) return 'oss';
    return 'lab';
  }

  function groupMeta(id) { return groupsTable()[id] || GROUPS_FALLBACK[id] || { id: id, no: '', icon: '📁', name: id, desc: '' }; }

  // ==========================================================================
  // 渲染：作品卡片（列表页用）
  // 六段结构：① 标题 ② 角色·职责 ③ 问题 ④ 方案 ⑤ 结果 ⑥ 链接
  // ==========================================================================
  var TAG_MAX = 5;   // 标签最多显示 5 个，超出折叠为 +N

  function cardHTML(it, opts) {
    opts = opts || {};
    // showStar 默认 true（works.html 的完整目录里保留「代表作」标记），
    // 首页与三个岗位页都是精选视图，那里 5/6 张卡都带星、等于没有区分度，
    // 由调用方传 { showStar: false } 关掉。见 v2 P2-④。
    var showStar = opts.showStar !== false;
    var c = catOf(it);

    // ---- ⑤ 结果：量化指标（保留 .w-hl 数字块） ----
    var hl = (it.highlights || []).map(function (h) {
      return '<div class="w-hl"><b>' + esc(h.num) + '</b><span>' + esc(h.label) + '</span></div>';
    }).join('');

    // ---- 标签：最多 TAG_MAX 个，超出显示 +N；被留下的都带 title 承载全文 ----
    var allTags = it.tags || [];
    var shown = allTags.slice(0, TAG_MAX);
    var rest = allTags.slice(TAG_MAX);
    var tags = shown.map(function (t) {
      return '<span class="w-tag" title="' + esc(t) + '">' + esc(t) + '</span>';
    }).join('') + (rest.length
      ? '<span class="w-tag w-tag-more" title="' + esc(rest.join('、')) + '">+' + rest.length + '</span>'
      : '');

    var links = (it.links || []).map(function (l) {
      var p = l.split('|');
      return p.length === 2 ? renderLink(it, p[0], p[1]) : '';
    }).join('');

    // 有真实截图用截图，否则用内联 SVG 示意图（保证每张都有语义化描述）
    var cover = it.shot
      ? '<div class="w-thumb"><img src="' + esc(it.shot.replace(/^\.\//, '')) + '" alt="' +
        esc(it.t + ' 的运行截图：' + (it.metric || it.pitch.slice(0, 40))) + '" loading="lazy"></div>'
      : '<div class="w-thumb">' +
          '<span class="w-cover-tag">' + esc(c.icon) + ' MODULE ' + esc(it.no) + '</span>' +
          coverSVG(it) +
        '</div>';

    // ---- ② 角色·职责（不写死工作年限：全局口径归属 resume-data.js / 首页 hero，
    //         21 张卡片各写一遍会变成 21 个将来必定不一致的真源） ----
    var roleText = it.role ? String(it.role) : '';
    var roleShort = roleText.length > 120 ? roleText.slice(0, 120) + '…' : roleText;
    var meta = (it.jd || roleShort)
      ? '<p class="w-meta">' +
          (it.jd ? '<span class="w-meta-jd">' + esc(it.jd) + '</span>' : '') +
          (roleShort ? '<span class="w-meta-role" title="' + esc(roleText) + '">' + esc(roleShort) + '</span>' : '') +
        '</p>'
      : '';

    // ---- ③④⑤ 三段：问题 / 方案 / 结果 ----
    function seg(key, body) {
      if (!body) return '';
      return '<div class="w-seg"><b class="w-seg-k">' + esc(key) + '</b>' +
        '<div class="w-seg-v">' + body + '</div></div>';
    }
    var segs =
      seg('问题', it.pain ? '<p>' + esc(it.pain) + '</p>' : '') +
      seg('方案', it.arch ? '<p>' + esc(it.arch) + '</p>' : '') +
      seg('结果', hl || (it.metric ? '<p>' + esc(it.metric) + '</p>' : ''));

    // ---- 边界（brief §5.3 新增的第 5 行）：说明哪些是参考实现、哪些没接真实系统 ----
    // 只在数据里有 boundary 时渲染 —— 没标注的模块不硬凑，避免又变成编造。
    var boundary = it.boundary
      ? '<p class="w-boundary"><b class="w-boundary-k">边界</b>' + esc(it.boundary) + '</p>'
      : '';

    // ---- 可展开详情：完整作品情况（一行一个字段，横向铺满） ----
    var detail = '';
    if (it.role || it.arch || it.pain || (it.steps && it.steps.length) || it.hard || it.retro) {
      function row(label, val) {
        if (!val) return '';
        return '<div class="d-row"><span class="d-label">' + esc(label) + '</span>' +
               '<span class="d-val">' + esc(val) + '</span></div>';
      }
      var rows = row('我负责什么', it.role) +
                 row('解决的痛点', it.pain) +
                 row('架构 / 方案', it.arch);
      if (it.steps && it.steps.length) {
        rows += '<div class="d-row"><span class="d-label">实施步骤</span><ol class="d-steps">' +
          it.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') +
          '</ol></div>';
      }
      rows += row('难点与取舍', it.hard) +
              row('复盘', it.retro) +
              row('量化口径', it.metric);

      detail = '<div class="w-more" hidden>' + rows +
        '<div class="w-preview-box" hidden></div>' +
        (links ? '<div class="w-links is-all">' + links + '</div>' : '') +
        '</div>';
    }

    // 注意：不加 .tilt —— 3D 倾斜会让长文本重新光栅化导致模糊（见 styles.css 说明）。
    // 作品卡片改用 2D 微动（封面 scale + 阴影抬升）保持文字锐利。
    // .w-body 是 flex 列，⑥ 链接区靠 margin-top:auto 贴底 —— 等高由 CSS 完成，不用固定高度。
    return '' +
      '<article class="w-card" id="mod-' + esc(it.no) + '" data-cat="' + esc(it.cat) + '" data-group="' + esc(groupOf(it)) + '" data-role="' + esc(MODULE_ROLE[it.no] || '') + '">' +
        cover +
        // 「展开详情」放卡片右上角：与封面左上角的 MODULE 标签左右呼应，
        // 不再挤占底部链接行。绝对定位锚到 .w-card（position:relative）。
        (detail ? '<button class="w-expand" type="button" aria-expanded="false">展开详情</button>' : '') +
        '<div class="w-body">' +
          '<div class="w-top">' +
            '<span class="w-no">' + esc(it.no) + '</span>' +
            '<span class="w-cat">' + esc(c.icon) + ' ' + esc(c.name) + '</span>' +
            statusBadge(it) +
            // v2 P2-④：裸 ★ 语义不清（21 个模块里 15 个带星，首页 6 张卡里 5 张带星，
            // 光看图标没人知道它代表什么）。改为带上可见文字标签，含义自明；
            // title 保留完整解释给鼠标用户与读屏用户。
            (it.star && showStar ? '<span class="w-star" title="代表作：本人认定最能说明能力的模块">★ 代表作</span>' : '') +
          '</div>' +
          '<h3 class="w-title">' + esc(it.t) + '</h3>' +
          '<p class="w-pitch">' + esc(it.pitch) + '</p>' +
          meta +
          segs +
          boundary +
          (tags ? '<div class="w-tags">' + tags + '</div>' : '') +
          '<div class="w-foot">' +
            '<a class="w-go" href="' + esc(rolePageOf(it)) + '#mod-' + esc(it.no) + '">在' +
              esc(ROLES[MODULE_ROLE[it.no]] ? ROLES[MODULE_ROLE[it.no]].short : '岗位页') + '查看 →</a>' +
          '</div>' +
          detail +
        '</div>' +
      '</article>';
  }

  // ==========================================================================
  // 渲染：分组区块（P0-2）
  // 纯函数：只返回 HTML 字符串，不碰 DOM（挂载点由调用方决定）。
  // opts:
  //   collapsed  整组包进 <details>（首页「核心案例铺开 + 其余折叠」用），默认 false
  //   starOnly   只保留 star 的模块（首页「3 个最强」用），默认 false
  //   limit      最多渲染几张卡片（在 starOnly 之后生效），默认不限
  //   countTotal 计数徽标是否显示该组真实总数而非本次渲染数（被 starOnly/limit
  //              截断时，避免组标题谎报「3 个模块」）
  // ==========================================================================
  function groupSectionHTML(groupId, items, opts) {
    opts = opts || {};
    var meta = groupMeta(groupId);
    var all = (items || []).filter(function (it) { return groupOf(it) === groupId; });
    if (!all.length) return '';

    var list = opts.starOnly ? all.filter(function (it) { return it.star; }) : all.slice();
    if (opts.limit > 0) list = list.slice(0, opts.limit);
    if (!list.length) return '';

    var total = (opts.countTotal === false ? list.length : all.length);
    var count = total + ' 个模块' + (total !== list.length ? '（本区展示 ' + list.length + ' 个）' : '');
    var head = '<div class="works-group-head">' +
        '<p class="kicker">' + esc(meta.no) + ' ' + esc(meta.name) + '</p>' +
        '<h2>' + esc(meta.name) + '</h2>' +
        (meta.desc ? '<p>' + esc(meta.desc) + '</p>' : '') +
        '<span class="works-group-count">' + esc(count) + '</span>' +
      '</div>';
    // 组内容器用双类名：复用 .w-grid 的网格样式，同时让分组网格可被 .w-cards
    // 单独选中 —— 否则 .w-grid 批量选择器会把 4 个分组网格和首页总网格混在一起。
    // 注意：传给 cardHTML 的必须是「卡片自己的 opts」，不能是分组级 opts ——
    // 否则 starOnly/limit/collapsed 这些分组参数会渗进卡片渲染（且嵌套时不可预测）。
    var cardOpts = opts.cardOpts || {};
    var grid = '<div class="w-grid w-cards">' +
      list.map(function (it) { return cardHTML(it, cardOpts); }).join('') +
      '</div>';

    if (opts.collapsed) {
      return '<details class="works-group works-group-fold" id="group-' + esc(groupId) +
        '" data-group="' + esc(groupId) + '">' +
        '<summary class="works-group-summary">' + head + '</summary>' + grid + '</details>';
    }
    return '<section class="works-group" id="group-' + esc(groupId) +
      '" data-group="' + esc(groupId) + '">' + head + grid + '</section>';
  }

  // 按 GROUP_ORDER 依次产出全部分组，一次拼成字符串后由调用方整体挂载。
  // opts.only            只渲染指定的组 id 数组（默认全部，顺序取 data.groupOrder）
  // opts.collapsedGroups 需要折叠的组 id 数组
  // opts.collapsed       true = 全部折叠（与 only 可同时用，不是二选一）
  // opts.starOnly/limit       对「每个」组生效
  // opts.coreStarOnly/coreLimit 只对 core 组生效（其余组不受影响）
  //
  // 首页「3 个最强铺开 + 其余折叠」的推荐调用（一次成型）：
  //   WORKS.renderGrouped(root, data.items, {
  //     collapsedGroups: ['eng', 'oss', 'lab'],
  //     coreNos: ['04', '13', '16']      // 或 coreStarOnly:true + coreLimit:3
  //   })
  // coreNos 直接按编号指定首屏那 3 个，最精确、不依赖 star 标记。
  function groupedHTML(items, opts) {
    opts = opts || {};
    var order = opts.only || groupOrder();
    var folded = opts.collapsedGroups || [];
    return order.map(function (id) {
      var mine = (items || []).filter(function (it) { return groupOf(it) === id; });
      var isCore = id === 'core';
      // 三档互斥：coreNos（按编号点名） > starOnly/limit > 不截断。
      // 注意 core 专属项与全局项要分开判断，否则 coreLimit 会泄漏到其它组。
      var nos = isCore ? opts.coreNos : null;
      var starOnly = (opts.starOnly === true) || (isCore && opts.coreStarOnly === true);
      var limit = opts.limit > 0 ? opts.limit : (isCore && opts.coreLimit > 0 ? opts.coreLimit : 0);
      if (nos && nos.length) {
        mine = nos.map(function (no) {
          return (items || []).filter(function (it) { return it.no === no; })[0];
        }).filter(Boolean);
        starOnly = false;
        limit = 0;
      }
      // 被截断的组：计数徽标显示真实总数，避免标题谎报
      var truncated = !!(nos && nos.length) || starOnly || limit > 0;
      return groupSectionHTML(id, mine, {
        collapsed: folded.indexOf(id) >= 0 || opts.collapsed === true,
        starOnly: starOnly,
        limit: limit,
        countTotal: truncated ? true : opts.countTotal
      });
    }).join('');
  }

  function renderGrouped(rootEl, items, opts) {
    if (!rootEl) return '';
    var html = groupedHTML(items || (DATA ? DATA.items : []), opts);
    rootEl.innerHTML = html;   // 一次性写入，避免逐组 append 触发多次重排
    return html;
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
        '<span class="w-tile-t">' + esc(it.t) + '</span>' +
        '<span class="w-tile-role">' + esc(ROLES[rk] ? ROLES[rk].short : c.icon) + '</span>' +
      '</a>';
  }

  // ==========================================================================
  // 渲染：岗位页的模块清单
  // ==========================================================================
  function listByRole(items, roleKey, opts) {
    var mine = items.filter(function (it) { return MODULE_ROLE[it.no] === roleKey; });
    if (!mine.length) return '<p class="works-empty">暂无归属模块。</p>';
    return mine.map(function (it) { return cardHTML(it, opts); }).join('');
  }

  // ==========================================================================
  // 渲染：按编号点名（brief P1-1 首页「精选 6 个」用）
  // 与 listByRole 的区别：**顺序由调用方给的 nos 决定**，不是数据里的原始顺序。
  // 首页要保证「最强的 3 个排在最前」，所以顺序必须可控。
  // ==========================================================================
  function pickHTML(items, nos, opts) {
    var byNo = {};
    items.forEach(function (it) { byNo[String(it.no)] = it; });
    var picked = (nos || []).map(function (n) { return byNo[String(n)]; })
                            .filter(function (x) { return !!x; });
    if (!picked.length) return '<p class="works-empty">暂无精选模块。</p>';
    return picked.map(function (it) { return cardHTML(it, opts); }).join('');
  }

  // ==========================================================================
  // 渲染：首页统计条
  // ==========================================================================
  function statHTML(items) {
    var n = items ? items.length : (DATA ? DATA.items.length : 21);
    // 初始就写真实值：无 JS / 动画未触发时也能正确显示；
    // effects.js 命中视口后会先归零再滚动。
    function stat(v, suffix, label) {
      return '<div class="w-stat"><b data-count="' + v + '" data-suffix="' + suffix + '">' +
        v + suffix + '</b><span>' + label + '</span></div>';
    }
    return '' +
      '<div class="w-stats">' +
        stat('300', '+', '项目可研 / 立项') +
        stat('100', '+', '服务企业客户') +
        stat(String(n), '', '深度作品模块') +
        stat('93.3', '%', 'RAG 检索准确率 @3') +
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
  // 渲染：模块分布可视化（纯 CSS 条形，无图表库、无 canvas）
  // 目的：让「21 个模块怎么分布」一眼可见，而不是让读者自己数。
  // ==========================================================================
  function vizHTML(items) {
    var list = items || (DATA ? DATA.items : []);
    var total = list.length || 1;

    function row(label, n) {
      var pct = Math.round(n / total * 1000) / 10;
      return '<li class="viz-row">' +
        '<span class="viz-k">' + esc(label) + '</span>' +
        '<span class="viz-track"><i class="viz-fill" style="width:' + pct + '%"></i></span>' +
        '<span class="viz-v">' + n + '</span>' +
      '</li>';
    }

    // 维度一：四个组（按性质）
    var byGroup = groupOrder().map(function (id) {
      var n = list.filter(function (it) { return groupOf(it) === id; }).length;
      return n ? row(groupMeta(id).name, n) : '';
    }).join('');

    // 维度二：三个岗位方向
    var byRole = Object.keys(ROLES).map(function (rk) {
      var n = list.filter(function (it) { return MODULE_ROLE[it.no] === rk; }).length;
      return n ? row(ROLES[rk].short, n) : '';
    }).join('');

    return '<div class="works-viz">' +
        '<div class="viz-block">' +
          '<p class="viz-title">按性质分四组</p>' +
          '<ul class="viz-bars">' + byGroup + '</ul>' +
        '</div>' +
        '<div class="viz-block">' +
          '<p class="viz-title">按岗位方向</p>' +
          '<ul class="viz-bars">' + byRole + '</ul>' +
        '</div>' +
      '</div>' +
      '<p class="viz-note">共 ' + total + ' 个模块，条形长度按占比绘制</p>';
  }

  // ==========================================================================
  // 交互：分组筛选（P2-8）
  // 与 bindFilter 的区别：bindFilter 是「隐藏瓦片」，本函数是「重渲染分组」——
  // 因为分组区里 core 组默认只铺 3 个、其余组折叠，单纯 hidden 无法表达筛选结果。
  // ==========================================================================
  function bindGroupFilter(filterRoot, groupsRoot, items, baseOpts) {
    if (!filterRoot || !groupsRoot) return;
    var buttons = filterRoot.querySelectorAll('[data-filter]');
    if (!buttons.length) return;
    var list = items || (DATA ? DATA.items : []);
    baseOpts = baseOpts || {};

    function apply(key) {
      var sub = (key === 'all') ? list : list.filter(function (it) {
        return MODULE_ROLE[it.no] === key;
      });

      var opts = {};
      if (key === 'all') {
        // 只有「全部」视图做首屏截断与折叠；筛选后必须完整展开，
        // 否则用户点了 FDE 却仍只看到 3 个、其余被折叠，等于筛选没生效。
        opts.coreNos = baseOpts.coreNos;
        opts.collapsedGroups = baseOpts.collapsedGroups;
      }
      // 只渲染非空组：否则筛选后会出现没有卡片的空白区块
      opts.only = groupOrder().filter(function (id) {
        return sub.some(function (it) { return groupOf(it) === id; });
      });

      groupsRoot.innerHTML = sub.length
        ? groupedHTML(sub, opts)
        : '<p class="works-empty">该方向暂无归属模块。</p>';

      buttons.forEach(function (b) {
        var on = b.getAttribute('data-filter') === key;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      var cnt = filterRoot.querySelector('[data-filter-count]');
      if (cnt) cnt.textContent = sub.length + ' / ' + list.length + ' 个模块';
    }

    buttons.forEach(function (b) {
      b.addEventListener('click', function () { apply(b.getAttribute('data-filter')); });
    });
    apply('all');   // 初始渲染与按钮状态由同一处产出，避免两套逻辑漂移
  }

  // ==========================================================================
  // 交互：卡片展开 / 收起
  // ==========================================================================
  function bindExpand(root) {
    var scope = root || document;
    scope.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.w-expand') : null;
      if (!btn) return;
      var card = btn.closest('.w-card');
      var more = card ? card.querySelector('.w-more') : null;
      if (!more) return;
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      btn.textContent = open ? '展开详情' : '收起';
      more.hidden = open;
      // 展开时让卡片横跨整行：详情才有宽幅可并排两栏，不至于竖向拉长
      card.classList.toggle('is-expanded', !open);
      if (!open) {
        card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  // ==========================================================================
  // 对外 API
  // ==========================================================================
  global.WORKS = {
    // resolveOwns 用 items 重算每个岗位的 owns（以 jd 为准），
    // 调用方拿到数据后应调一次，否则新增作品不会出现在岗位页/岗位筛选里。
    resolveOwns: resolveOwns,
    ROLES: ROLES,
    CATS: CATS,
    CAT_MAP: CAT_MAP,
    MODULE_ROLE: MODULE_ROLE,
    GROUPS: GROUPS_FALLBACK,
    GROUP_ORDER: GROUP_ORDER_FALLBACK,
    groupOf: groupOf,
    groupMeta: groupMeta,
    groupSectionHTML: groupSectionHTML,
    groupedHTML: groupedHTML,
    renderGrouped: renderGrouped,
    vizHTML: vizHTML,
    bindGroupFilter: bindGroupFilter,
    loadData: loadData,
    cardHTML: cardHTML,
    tileHTML: tileHTML,
    listByRole: listByRole,
    pickHTML: pickHTML,
    statHTML: statHTML,
    bindFilter: bindFilter,
    bindExpand: bindExpand,
    bindPreview: bindPreview,
    esc: esc
  };
})(window);