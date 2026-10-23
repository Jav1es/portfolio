/* ==========================================================================
   resume.js — 简历渲染与交互（纯原生 JS）
   数据来自 resume-data.js（与主页同源，改一处两边同步）
   两个版本：
     agent — 突出智能体、RAG、评测、可观测性、MCP
     fde   — 突出 300+ 项目、100+ 企业、需求发现、交付、客户成功
   ========================================================================== */
(function () {
  'use strict';

  var D = window.__RESUME__;
  if (!D) return;

  var esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  // 站内相对链接 vs 外链，分别处理（打印时只展开外链 URL）
  function link(a) {
    var ext = /^https?:/i.test(a.url);
    return '<a href="' + esc(a.url) + '"' +
      (ext ? ' target="_blank" rel="noopener"' : '') + '>' + esc(a.label) + '</a>';
  }

  // ---- 两个版本各自的差异化文案与项目取舍 --------------------------------
  // 2026-10-22：从 2 版扩到 4 版，对应四个求职方向。
  // 每版差异化的东西只有五样：title / summary / projectNos / skillOrder / metrics。
  // 其余（经历、教育、开源、证书）四版共用 —— 那是同一份事实，不该有四个真源。
  var VERSIONS = {
    harness: {
      title: 'Agent Harness 工程师 / AI Agent 开发',
      summary: '6 年+ 企业科技服务（2021.04 至今），AI 工程实践 27 个月。做 AI Agent 的可控层：模型只产出「提案」，能不能执行由确定性校验、权限白名单、自愈回喂与熔断共同决定。自建 Harness-Agent-Core 五层可控层，50 次复杂多步骤测试任务中断率 32% 降至 2% 以下，597 个测试 + 82 个变异体全部被杀死。技术上能自己动手，遇到底层问题不需要层层转手。',
      projectNos: ['24', '19', '18', '15'],
      projectCount: 4,
      // Harness 版：运行时与编排优先，交付方法退到最后
      skillOrder: ['AI Agent 开发', '工程化与部署', '评测与可观测性', 'RAG 与检索', 'FDE 交付与项目管理', '前端与工具链'],
      metrics: [
        { v: '32% → <2%', k: '多步骤任务中断率' },
        { v: '597 / 82', k: '测试数 / 变异体全杀' },
        { v: '−80%', k: '错误修正耗时' }
      ]
    },
    fde: {
      title: 'FDE 前线部署工程师 / 解决方案交付',
      summary: '6 年+ 乙方交付一线经验（2021.04 至今），累计主导政府/企业项目 300+、服务企业 100+（项目申报口径），单年最高通过国家级高新技术企业认定 24 家，曾 1 周内完成从签单到申报的交付。近 27 个月把这套方法迁移到 AI Agent 工程。习惯的工作方式是：进客户现场用 Discovery Brief 把模糊诉求翻译成可验证范围，现场把方案跑通，用 Eval Plan 定义验收口径，培训到一线会用为止。技术上能自己动手，遇到底层问题不需要层层转手。广州 · 接受长期出差/驻场。',
      projectNos: ['11', '23', '04', '13'],
      projectCount: 4,
      skillOrder: ['FDE 交付与项目管理', 'AI Agent 开发', 'RAG 与检索', '评测与可观测性', '工程化与部署', '前端与工具链'],
      metrics: [
        { v: '300+', k: '主导项目（申报口径）' },
        { v: '100+', k: '服务企业（申报口径）' },
        { v: '24 家', k: '单年高企认定通过' }
      ]
    },
    agent: {
      title: 'AI Agent 开发工程师',
      summary: '6 年+ 企业科技服务（2021.04 至今），AI 工程实践 27 个月。把 AI Agent 从 Demo 做到能评测、可观测、可演示——RAG 检索 93.3% @3（30 题分层评测），OTel/Jaeger 全链路可观测（一次会话 7 个 span），11 个公开开源仓库、11 个含 CI 门禁。',
      projectNos: ['04', '13', '16', '14'],
      projectCount: 4,
      skillOrder: ['AI Agent 开发', 'RAG 与检索', '评测与可观测性', '工程化与部署', 'FDE 交付与项目管理', '前端与工具链'],
      metrics: [
        { v: '93.3%', k: 'RAG 准确率 @3' },
        { v: '7 span', k: '全链路可观测' },
        { v: '35', k: 'pytest 用例全过' }
      ]
    },
    design: {
      title: 'Design / Product Engineer',
      summary: '6 年+ 企业科技服务（2021.04 至今），AI 工程实践 27 个月。设计与实现一体：不给交接单、不等排期，自己判断什么值得做、自己设计、自己写代码上线、对最终效果负责。作品集站本身即产物——零第三方运行时依赖（不用 Three.js / CDN / 框架），25 个 3D 封面全部手写 Canvas，构建自带 5 阶段 10 项回归自检，实测 449 帧零掉帧。',
      projectNos: ['25', '22', '20', '18'],
      projectCount: 4,
      skillOrder: ['前端与工具链', 'AI Agent 开发', '工程化与部署', '评测与可观测性', 'RAG 与检索', 'FDE 交付与项目管理'],
      metrics: [
        { v: '0', k: '第三方运行时依赖' },
        { v: '25 个', k: '手写 3D 封面' },
        { v: '0 / 449', k: '滚动掉帧' }
      ]
    }
  };

  var current = 'harness';

  function projectByNo(no) {
    for (var i = 0; i < D.projects.length; i++) {
      if (D.projects[i].no === no) return D.projects[i];
    }
    return null;
  }

  function skillsSorted(order) {
    var out = [];
    order.forEach(function (g) {
      for (var i = 0; i < D.skills.length; i++) {
        if (D.skills[i].group === g) { out.push(D.skills[i]); return; }
      }
    });
    return out;
  }

  // ------------------------------------------------------------------ 渲染
  function render(verKey) {
    var V = VERSIONS[verKey] || VERSIONS.harness;
    var C = D.contact;

    // 1) 头部
    var html = '' +
      '<header class="rv-head">' +
        '<div class="rv-name">' + esc(D.name) + '</div>' +
        '<div class="rv-title">' + esc(V.title) + '</div>' +
        '<div class="rv-contact">' +
          '<span>' + esc(C.city) + '</span>' +
          '<span><a href="mailto:' + esc(C.email) + '">' + esc(C.email) + '</a></span>' +
          '<span>' + esc(C.phone) + '</span>' +
          '<span>微信 ' + esc(C.wechat) + '</span>' +
          '<span><a href="' + esc(C.github) + '" target="_blank" rel="noopener">github.com/Jav1es</a></span>' +
          '<span><a href="' + esc(C.site) + '" target="_blank" rel="noopener">jav1es.github.io/portfolio</a></span>' +
        '</div>' +
      '</header>';

    // 2) 一句话摘要
    html += '<p class="rv-summary">' + esc(V.summary) + '</p>';

    // 3) 核心指标
    // 2026-10-22：改成按版本取，不再固定用 D.metrics 的 6 个。
    // 简历第一屏只有 3 秒，6 个数字平铺等于没重点；
    // 每个方向关心的问题也不同（Harness 关心稳定性，Design 关心实现质量）。
    var metrics = V.metrics || D.metrics.slice(0, 3);
    html += '<div class="rv-metrics">';
    metrics.forEach(function (m) {
      html += '<div><b>' + esc(m.v) + '</b><span>' + esc(m.k) + '</span></div>';
    });
    html += '</div>';

    // 4) 技能矩阵
    html += '<section class="rv-sec"><h2>技能矩阵</h2><dl class="rv-skills">';
    skillsSorted(V.skillOrder).forEach(function (s) {
      html += '<div class="rv-skill-row"><dt>' + esc(s.group) + '</dt>' +
              '<dd>' + s.items.map(esc).join(' · ') + '</dd></div>';
    });
    html += '</dl></section>';

    // 5) 经历时间线
    html += '<section class="rv-sec"><h2>工作经历</h2>';
    D.experience.forEach(function (e) {
      html += '<div class="rv-exp">' +
        '<div class="rv-exp-head"><b>' + esc(e.company) + '</b>' +
        '<time>' + esc(e.period) + '</time></div>' +
        '<div class="rv-exp-role">' + esc(e.role) + '</div>' +
        '<ul>' + e.points.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' +
        '</div>';
    });
    html += '</section>';

    // 6) 精选项目（XYZ 写法）
    html += '<section class="rv-sec"><h2>精选项目</h2>';
    V.projectNos.slice(0, V.projectCount).forEach(function (no) {
      var p = projectByNo(no);
      if (!p) return;
      html += '<div class="rv-proj">' +
        '<div class="rv-proj-head"><b>' + esc(p.name) + '</b>' +
        '<span>' + esc(p.role) + '</span></div>' +
        '<ul>' + p.bullets.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' +
        '<div class="rv-proj-tags">技术栈：' + p.tags.map(esc).join(' · ') + '</div>' +
        (p.links && p.links.length
          ? '<div class="rv-proj-links">' + p.links.map(link).join('') + '</div>'
          : '') +
        '</div>';
    });
    html += '</section>';

    // 7) 开源与影响力
    var O = D.opensource;
    html += '<section class="rv-sec"><h2>开源与影响力</h2>' +
      '<p class="rv-cert"><b>' + O.total + ' 个公开仓库（' + O.mit + ' 个 MIT）</b>——' + esc(O.note) + '。</p>' +
      '<div class="rv-oss">';
    O.repos.forEach(function (r) {
      html += '<div><b>' + esc(r.name) + '</b> <em>' + esc(r.lang) + '</em><br>' + esc(r.desc) + '</div>';
    });
    html += '</div></section>';

    // 7.5) 关键指标与验证方式（数据来自 D.evidence；无该字段则整节省略）
    // 目的：正文里的数字散落在各处，招聘方分不清实测/示例口径。这节把来源摊开。
    if (D.evidence && D.evidence.rows && D.evidence.rows.length) {
      html += '<section class="rv-sec"><h2>关键指标与验证方式</h2>' +
        '<p class="rv-cert">' + esc(D.evidence.note) + '。</p>' +
        '<div class="rv-evidence">';
      D.evidence.rows.forEach(function (r) {
        html += '<div class="rv-ev-row"><b>' + esc(r.k) + '</b>' +
          '<span class="rv-ev-v">' + esc(r.v) + '</span>' +
          '<span class="rv-ev-how">' + esc(r.how) + '</span></div>';
      });
      html += '</div></section>';
    }

    // 7.6) 合作方式与边界（数据来自 D.engagement；无该字段则整节省略）
    // 招聘方最常问「怎么合作」和「你不做什么」；写清边界比堆能力更可信。
    if (D.engagement && D.engagement.items && D.engagement.items.length) {
      html += '<section class="rv-sec"><h2>合作方式与边界</h2>' +
        '<p class="rv-cert">' + esc(D.engagement.note) + '。</p>' +
        '<div class="rv-engage">';
      D.engagement.items.forEach(function (it) {
        html += '<div class="rv-eng-row"><b>' + esc(it.k) + '</b>' +
          '<span>' + esc(it.v) + '</span></div>';
      });
      html += '</div></section>';
    }

    // 8) 教育 / 证书
    html += '<section class="rv-sec"><h2>教育背景</h2>';
    D.education.forEach(function (e) {
      html += '<div class="rv-edu"><time>' + esc(e.period) + '</time>' +
        '<b>' + esc(e.school) + '</b> <span>' + esc(e.major) + '</span>' +
        (e.note ? '<br><span>' + esc(e.note) + '</span>' : '') + '</div>';
    });
    html += '</section>';

    html += '<section class="rv-sec"><h2>证书</h2><p class="rv-cert">' +
      '<b>已取得：</b>' + D.certificates.held.map(esc).join('、') + '<br>' +
      '<b>备考中：</b>' + D.certificates.preparing.map(esc).join('、') +
      '</p></section>';

    // 底注
    // 「更新于」放在底注之前、作为独立一行：四版简历共用同一份数据源（D），
    // 所以各版显示同一个日期，不会出现一份新一份旧。
    //
    // ⚠️ 2026-10-23：把「更新于 + 底注」包进 .rv-endnote 容器。
    // 原因：fde 版内容最长，实测这两个块合计 37px 却被挤到第 4 页，
    // 等于为了 37px 元信息多印一整页。包成一块后，它们作为整体跟随
    // 证书节，不再单独触发分页。
    html += '<div class="rv-endnote">';
    if (D.updated) {
      html += '<p class="rv-updated">更新于 ' + esc(D.updated) + '</p>';
    }
    html += '<p class="rv-foot">成效类数字均已标注口径（实测 / 测算模型 / 示例口径）；' +
      '客户名称与年度数据一律脱敏。本页可直接下载 PDF，或按 Ctrl / Cmd + P 打印。</p>';
    html += '</div>';

    document.getElementById('resume-root').innerHTML = html;
    document.title = '黄家辉 · 简历 | ' + V.title;
  }

  // ------------------------------------------------------------- 版本切换
  // 两份 PDF 是真实文件，由 tools/build-resume-pdf.mjs 用 Edge 无头打印
  // resume.html?ver=agent / ?ver=fde 生成。切换版本时必须同步换 href，
  // 否则会出现「界面显示 FDE 版、点下载却拿到 AI Agent 版」的错配。
  var PDF_BY_VER = {
    harness: { href: './resume-harness.pdf', label: '下载 PDF 简历（Agent Harness 版）' },
    fde:     { href: './resume-fde.pdf',     label: '下载 PDF 简历（FDE 版）' },
    agent:   { href: './resume-ai-agent.pdf', label: '下载 PDF 简历（AI Agent 版）' },
    design:  { href: './resume-design.pdf',  label: '下载 PDF 简历（Design / Product 版）' }
  };

  function syncDownload(v) {
    var a = document.getElementById('btn-download');
    if (!a) return;
    var p = PDF_BY_VER[v] || PDF_BY_VER.harness;
    a.setAttribute('href', p.href);
    a.setAttribute('download', '');
    a.textContent = p.label;
  }

  function setVersion(v) {
    current = v;
    render(v);
    syncDownload(v);
    document.querySelectorAll('.resume-switch button').forEach(function (b) {
      var on = b.getAttribute('data-ver') === v;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  document.querySelectorAll('.resume-switch button').forEach(function (b) {
    b.addEventListener('click', function () { setVersion(b.getAttribute('data-ver')); });
  });

  // ------------------------------------------------------- 打印为 PDF（兜底）
  // 主路径已是真实 PDF 下载；这里保留浏览器打印作为兜底，文案明确写「打印」。
  document.getElementById('btn-print').addEventListener('click', function () {
    window.print();
  });

  // --------------------------------------------------- 返回作品集（兜底）
  // 正常情况 <a href> 直接跳转即可；这里加一层 JS 兜底，
  // 防止某些环境下 sticky 元素被遮挡导致点击不生效。
  var back = document.querySelector('.resume-bar__back');
  if (back) {
    back.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;   // 保留新窗口打开
      e.preventDefault();
      window.location.href = back.getAttribute('href') || './index.html';
    });
  }

  // 键盘：Ctrl/Cmd + P 走原生打印即可，无需额外处理。
  // 支持 ?ver=harness / fde / agent / design —— 生成 PDF 的无头打印靠它选定版本。
  // 2026-10-22：从两版扩到四版，默认版也改成 harness（与 HTML 的 is-active 一致）。
  var initial = 'harness';
  var m = /[?&]ver=(harness|fde|agent|design)(?:&|$)/.exec(window.location.search);
  if (m) initial = m[1];
  setVersion(initial);
})();
