/* ==========================================================================
   作品运行逻辑演示（2026-10-19）
   --------------------------------------------------------------------------
   三个演示，各自对应一个真实作品的实际运行机制。数据全部取自作品里已公开的
   真实数字，不编造：

   1. Agent 工具调用链路 → 作品 04（六层架构 / LangGraph 编排 / 调用可追溯）
   2. RAG 检索流程       → 作品 13（30 题分层评测，检索准确率 93.3% = 28/30）
   3. 验收回归变绿       → 作品 23（52 条样本，六轮回归 88% → 100%）

   每个演示都是「点一下跑一遍」，把内部步骤逐步点亮，最后给结论。
   不是装饰动画：失败分支是真的会走到（RAG 演示里 30 题中故意留 2 题失败，
   这正是 93.3% 而不是 100% 的原因）。
   ========================================================================== */
(function (global) {
  'use strict';

  var reduceMotion = global.matchMedia &&
    global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 统一的时间控制：减少动效时把等待压到极短，逻辑照跑
  function wait(ms) {
    return new Promise(function (r) {
      setTimeout(r, reduceMotion ? Math.min(ms, 40) : ms);
    });
  }

  /* ======================================================================
     演示 1：Agent 工具调用链路（作品 04）
     ====================================================================== */
  var AGENT_STEPS = [
    { id: 'intent', label: '意图识别', ok: '识别为「查订单状态 + 改收货地址」' },
    { id: 'plan', label: '任务拆解', ok: '拆成 2 个子任务，决定并行调用' },
    { id: 'select', label: '工具选择', ok: 'order.query / order.update_address' },
    { id: 'call', label: '调用企业系统', ok: '两次调用，各带 trace_id' },
    { id: 'verify', label: '结果校验', ok: '地址格式 + 权限双重校验通过' },
    { id: 'reply', label: '组装回复', ok: '返回新地址与预计送达时间' }
  ];

  function runAgent(root, mode) {
    var flow = root.querySelector('.lab-flow');
    var result = root.querySelector('.lab-result');
    var btn = root.querySelector('.lab-run');
    var failBtn = root.querySelector('.lab-run-fail');
    flow.innerHTML = AGENT_STEPS.map(function (s, i) {
      return '<div class="lab-step" data-i="' + i + '">' +
        '<span class="dot">' + (i + 1) + '</span>' +
        '<span class="lbl">' + s.label + '</span>' +
        '<span class="msg">待执行</span></div>';
    }).join('');
    result.className = 'lab-result';
    result.textContent = '准备就绪，点击「跑一遍」开始。';
    btn.disabled = true;
    if (failBtn) failBtn.disabled = true;

    var steps = flow.querySelectorAll('.lab-step');
    // 2026-10-19 修：原来每次都固定在第 4 步失败，用户点了三次都是失败，
    // 看不出「这个流程本来是能跑通的」。改成默认跑成功链路，
    // 失败分支由单独的「看失败分支」按钮触发 —— 想展示 fail-closed 随时能看，
    // 但第一印象是「它能跑通」。
    var failAt = (mode === 'fail') ? 3 : -1;

    (async function () {
      for (var i = 0; i < AGENT_STEPS.length; i++) {
        var el = steps[i];
        el.classList.add('is-run');
        el.querySelector('.msg').textContent = '执行中…';
        await wait(520);

        // 失败分支：展示 fail-closed —— 调用超时，不猜、不重试，直接转人工
        if (i === failAt) {
          el.classList.remove('is-run');
          el.classList.add('is-fail');
          el.querySelector('.msg').textContent = '超时 3s → fail-closed';
          result.className = 'lab-result fail';
          result.textContent = '调用超时 → 按设计 fail-closed：不重试、不猜测，直接转人工并记录 trace。' +
            '（这正是作品 04 的核心主张：宁可失败也不编造。）';
          btn.disabled = false;
          if (failBtn) failBtn.disabled = false;
          return;
        }

        el.classList.remove('is-run');
        el.classList.add('is-ok');
        el.querySelector('.msg').textContent = AGENT_STEPS[i].ok;
      }
      result.className = 'lab-result ok';
      result.textContent = '链路完成：6 步全部留痕，每次工具调用都可追溯到 trace_id。';
      btn.disabled = false;
      if (failBtn) failBtn.disabled = false;
    })();
  }

  /* ======================================================================
     演示 2：RAG 检索流程（作品 13）
     30 题分层评测，检索准确率 93.3% = 28/30
     ====================================================================== */
  var RAG_STEPS = [
    { label: '问题切分', ok: '拆成检索意图 + 约束条件' },
    { label: '向量检索', ok: 'top-k=8 召回候选片段' },
    { label: '重排', ok: '按相关度重排，取 top-3' },
    { label: '命中判定', ok: '答案是否落在召回片段内' }
  ];

  function runRag(root) {
    var flow = root.querySelector('.lab-flow');
    var result = root.querySelector('.lab-result');
    var btn = root.querySelector('.lab-run');
    flow.innerHTML = RAG_STEPS.map(function (s, i) {
      return '<div class="lab-step" data-i="' + i + '">' +
        '<span class="dot">' + (i + 1) + '</span>' +
        '<span class="lbl">' + s.label + '</span>' +
        '<span class="msg">待执行</span></div>';
    }).join('');
    result.className = 'lab-result';
    result.textContent = '30 道题逐题跑一遍，统计检索命中率。';
    btn.disabled = true;

    var steps = flow.querySelectorAll('.lab-step');

    (async function () {
      // 先把 4 个步骤点亮（展示流程）
      for (var i = 0; i < RAG_STEPS.length; i++) {
        steps[i].classList.add('is-run');
        steps[i].querySelector('.msg').textContent = '执行中…';
        await wait(340);
        steps[i].classList.remove('is-run');
        steps[i].classList.add('is-ok');
        steps[i].querySelector('.msg').textContent = RAG_STEPS[i].ok;
      }

      // 再逐题跑 30 题：28 通过、2 失败（这就是 93.3%）
      result.className = 'lab-result';
      result.textContent = '开始逐题评测 0/30 …';
      var grid = root.querySelector('.lab-grid');
      grid.innerHTML = '';
      var cells = [];
      for (var k = 0; k < 30; k++) {
        var c = document.createElement('div');
        c.className = 'lab-cell';
        grid.appendChild(c);
        cells.push(c);
      }

      // 失败题号：第 11 和第 24 题（真实报告里失败的两类是「跨文档推理」和「时效性问题」）
      var failIdx = [10, 23];
      var failReason = {
        10: '跨文档推理：答案要跨两份文档拼接，召回只取到一份',
        23: '时效性问题：知识库里的政策版本过期，召回的是旧版'
      };
      var pass = 0, fail = 0;
      var tip = root.querySelector('.lab-tip');

      // 悬停看某题为什么失败
      grid.addEventListener('mouseover', function (e) {
        var t = e.target;
        if (!t.classList || !t.classList.contains('lab-cell') || !tip) return;
        var n = Array.prototype.indexOf.call(grid.children, t);
        if (n < 0) return;
        tip.textContent = '第 ' + (n + 1) + ' 题：' +
          (failIdx.indexOf(n) >= 0 ? '✗ ' + failReason[n] : '✓ 命中');
      });
      grid.addEventListener('mouseleave', function () {
        if (tip) tip.textContent = '把鼠标移到格子上可以看每道题的结果。';
      });

      for (var q = 0; q < 30; q++) {
        var isFail = failIdx.indexOf(q) >= 0;
        cells[q].classList.add(isFail ? 'fail' : 'pass');
        if (isFail) fail++; else pass++;
        result.textContent = '逐题评测 ' + (q + 1) + '/30 … 通过 ' + pass + ' · 失败 ' + fail;
        await wait(60);
      }

      var rate = (pass / 30 * 100).toFixed(1);
      result.className = 'lab-result ok';
      result.textContent = '结果：' + pass + '/30 命中，准确率 ' + rate + '%。' +
        '失败的 2 题是「跨文档推理」和「时效性问题」——不是检索没召回，而是召回了但答案不在片段里。';
      btn.disabled = false;
    })();
  }

  /* ======================================================================
     演示 3：验收回归变绿（作品 23）
     52 条样本，六轮回归 88.5% → 100%
     真实轮次：88.5% → 90.4% → 94.2% → 96.2% → 98.1% → 100%
     ====================================================================== */
  var ROUNDS = [
    { pct: 88.5, fail: 6, note: '首轮：6 条失败，集中在报价档位与转人工边界' },
    { pct: 90.4, fail: 5, note: '第 2 轮：修好报价取档，剩 5 条' },
    { pct: 94.2, fail: 3, note: '第 3 轮：修好转人工阈值，剩 3 条' },
    { pct: 96.2, fail: 2, note: '第 4 轮：修好知识库分级，剩 2 条' },
    { pct: 98.1, fail: 1, note: '第 5 轮：修好 docstring 正则误伤，剩 1 条' },
    { pct: 100, fail: 0, note: '第 6 轮：全绿 52/52' }
  ];

  // 52 条样本的分组与名称（按验收集的实际结构：A1-A6 六个行为组）
  var SAMPLE_GROUPS = [
    { id: 'A1', name: '意图识别', n: 10 },
    { id: 'A2', name: '知识库检索', n: 9 },
    { id: 'A3', name: '报价生成', n: 8 },
    { id: 'A4', name: '规则兜底', n: 8 },
    { id: 'A5', name: '校验 V1-V9', n: 9 },
    { id: 'A6', name: '终态路由', n: 8 }
  ];

  // 展开成 52 条，带编号与组名
  var SAMPLES = (function () {
    var out = [];
    SAMPLE_GROUPS.forEach(function (g) {
      for (var i = 0; i < g.n; i++) {
        out.push({ id: g.id + '-' + (i + 1), group: g.name, idx: out.length });
      }
    });
    return out;
  })();

  function runRegression(root) {
    var result = root.querySelector('.lab-result');
    var btn = root.querySelector('.lab-run');
    var grid = root.querySelector('.lab-grid');
    var flow = root.querySelector('.lab-flow');
    var tip = root.querySelector('.lab-tip');

    grid.innerHTML = '';
    var cells = [];
    for (var k = 0; k < 52; k++) {
      var c = document.createElement('div');
      c.className = 'lab-cell';
      c.setAttribute('role', 'img');
      c.setAttribute('aria-label', '样本 ' + SAMPLES[k].id + '（' + SAMPLES[k].group + '）');
      // 悬停查看样本详情 —— 让方块不只是装饰
      c.dataset.sample = SAMPLES[k].id + ' · ' + SAMPLES[k].group;
      grid.appendChild(c);
      cells.push(c);
    }
    flow.innerHTML = '';
    result.className = 'lab-result';
    result.textContent = '52 条验收样本，跑六轮回归。';
    btn.disabled = true;

    // 事件委托：悬停/聚焦时在提示条显示是第几条、属于哪组
    function showTip(e) {
      var t = e.target;
      if (!t.classList || !t.classList.contains('lab-cell')) return;
      if (!tip) return;
      var state = t.classList.contains('fail') ? '本轮失败'
        : t.classList.contains('pass') ? '本轮通过' : '未执行';
      tip.textContent = t.dataset.sample + ' — ' + state;
    }
    grid.addEventListener('mouseover', showTip);
    grid.addEventListener('focusin', showTip);
    grid.addEventListener('mouseleave', function () {
      if (tip) tip.textContent = '把鼠标移到方块上可以看是哪一条样本。';
    });

    (async function () {
      for (var r = 0; r < ROUNDS.length; r++) {
        var round = ROUNDS[r];
        var passCount = 52 - round.fail;

        // 重置
        for (var i = 0; i < 52; i++) {
          cells[i].className = 'lab-cell';
        }
        await wait(120);

        // 逐格点亮
        for (var j = 0; j < 52; j++) {
          var isFail = j >= passCount;
          cells[j].classList.add(isFail ? 'fail' : 'pass');
          if (j % 4 === 0) await wait(12);
        }

        // 每轮用中性色（琥珀）而不是红色 —— 前几轮不是「失败」，是「正在修」
        var row = document.createElement('div');
        row.className = 'lab-step ' + (round.fail === 0 ? 'is-ok' : 'is-warn');
        row.innerHTML = '<span class="dot">' + (r + 1) + '</span>' +
          '<span class="lbl">第 ' + (r + 1) + ' 轮 · ' + round.pct + '%</span>' +
          '<span class="msg">失败 ' + round.fail + ' 条</span>';
        flow.appendChild(row);

        result.className = 'lab-result ' + (round.fail === 0 ? 'ok' : '');
        result.textContent = round.note;
        await wait(760);
      }
      result.className = 'lab-result ok';
      result.textContent = '六轮走完：88.5% → 100%。' +
        '每一轮的失败都定位到了机制层根因，而不是「调 Prompt 试试」。';
      btn.disabled = false;
    })();
  }

  /* ======================================================================
     装配
     ====================================================================== */
  var RUNNERS = { agent: runAgent, rag: runRag, regression: runRegression };

  function init(root) {
    var tabs = root.querySelectorAll('.lab-tab');
    var panels = root.querySelectorAll('.lab-panel');
    if (!tabs.length) return;

    function select(id) {
      Array.prototype.forEach.call(tabs, function (t) {
        t.setAttribute('aria-selected', t.dataset.lab === id ? 'true' : 'false');
      });
      Array.prototype.forEach.call(panels, function (p) {
        if (p.dataset.lab === id) p.removeAttribute('hidden');
        else p.setAttribute('hidden', '');
      });
    }

    Array.prototype.forEach.call(tabs, function (t) {
      t.addEventListener('click', function () { select(t.dataset.lab); });
      // 键盘左右切换（可访问性）
      t.addEventListener('keydown', function (e) {
        var list = Array.prototype.slice.call(tabs);
        var i = list.indexOf(t);
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          var next = e.key === 'ArrowRight' ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
          list[next].focus();
          select(list[next].dataset.lab);
        }
      });
    });

    Array.prototype.forEach.call(panels, function (p) {
      var btn = p.querySelector('.lab-run');
      var runner = RUNNERS[p.dataset.lab];
      if (btn && runner) {
        btn.addEventListener('click', function () { runner(p); });
      }
      // Agent 演示的失败分支：单独按钮触发，不影响默认的成功链路
      var failBtn = p.querySelector('.lab-run-fail');
      if (failBtn && runner) {
        failBtn.addEventListener('click', function () { runner(p, 'fail'); });
      }
    });

    select(tabs[0].dataset.lab);
  }

  global.WORKLAB = { init: init };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(document); });
  } else {
    init(document);
  }
})(window);
