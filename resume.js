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
  var VERSIONS = {
    agent: {
      title: '企业级 AI Agent 开发工程师',
      summary: D.summary,
      // 项目顺序：智能体 → RAG → MCP → FDE 模板；FDE 那条放最后且精简
      projectNos: ['04', '13', '16', '11'],
      projectCount: 4,
      // 技能域顺序：技术能力优先
      skillOrder: ['AI Agent 开发', 'RAG 与检索', '评测与可观测性', '工程化与部署', 'FDE 交付与项目管理', '前端与工具链']
    },
    fde: {
      title: 'FDE 前线部署工程师 / 解决方案交付',
      summary: '5 年+ 乙方交付一线经验，累计主导政府/企业项目 300+、服务企业 100+，单年最高通过国家级高新技术企业认定 24 家，曾 1 周内完成从签单到申报的交付。习惯的工作方式是：进客户现场用 Discovery Brief 把模糊诉求翻译成可验证范围，现场把方案跑通，用 Eval Plan 定义验收口径，培训到一线会用为止。技术上能自己动手，遇到底层问题不需要层层转手。',
      // FDE 版：交付类项目优先，技术项目作为支撑能力
      projectNos: ['11', '04', '13', '16'],
      projectCount: 4,
      skillOrder: ['FDE 交付与项目管理', 'AI Agent 开发', 'RAG 与检索', '评测与可观测性', '工程化与部署', '前端与工具链']
    }
  };

  var current = 'agent';

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
    var V = VERSIONS[verKey] || VERSIONS.agent;
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
    html += '<div class="rv-metrics">';
    D.metrics.forEach(function (m) {
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
    html += '<p class="rv-foot">成效类数字均已标注口径（实测 / 测算模型 / 示例口径）；' +
      '客户名称与年度数据一律脱敏。本页支持浏览器打印为 PDF（Ctrl / Cmd + P）。</p>';

    document.getElementById('resume-root').innerHTML = html;
    document.title = '黄家辉 · 简历 | ' + V.title;
  }

  // ------------------------------------------------------------- 版本切换
  function setVersion(v) {
    current = v;
    render(v);
    document.querySelectorAll('.resume-switch button').forEach(function (b) {
      var on = b.getAttribute('data-ver') === v;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  document.querySelectorAll('.resume-switch button').forEach(function (b) {
    b.addEventListener('click', function () { setVersion(b.getAttribute('data-ver')); });
  });

  // ------------------------------------------------------------- 下载 PDF
  // 纯静态站无法真正生成 PDF，走浏览器打印（用户在打印对话框里选「另存为 PDF」）
  document.getElementById('btn-print').addEventListener('click', function () {
    window.print();
  });

  // 键盘：Ctrl/Cmd + P 走原生打印即可，无需额外处理
  setVersion('agent');
})();
