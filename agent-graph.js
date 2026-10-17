/* agent-graph.js —— 首屏 Agent 编排链路（v3 任务一）
   数据来源：enterprise-agents/.../orchestration/graph.py::_build_graph()（已实读 L66–92）
   节点坐标/文案/代码位置是一组同源数据，用数组描述、一次渲染。
   无逐帧 JS 计算：动效全部由 CSS 驱动，JS 只做「点击 → 展开面板」。 */
(function () {
  'use strict';

  var root = document.getElementById('agent-graph');
  if (!root) return;

  // 节点表。x/y 是节点左上角在 460×300 viewBox 中的坐标（按钮 104×40）。
  // 布局是三列 + 一条回环：16 / 178 / 340，最右 444 < 460，不溢出。
  var NODES = [
    {
      id: 'router', x: 16, y: 56, cls: 'ag-n--router',
      name: 'router',
      role: '意图分流',
      code: 'graph.py · add_node("router") / _route_decision()',
      span: 'agent.node.router',
      io: '入：用户 query、会话上下文\n出：knowledge / data / mixed 三选一'
    },
    {
      id: 'retrieve', x: 178, y: 8, cls: 'ag-n--retrieve',
      name: 'retrieve',
      role: 'RAG 检索（带引用）',
      code: 'graph.py · add_node("retrieve", retrieve_node + retriever)',
      span: 'agent.node.retrieve',
      io: '入：query\n出：带引用编号的检索片段，汇入 planner'
    },
    {
      id: 'planner', x: 178, y: 108, cls: 'ag-n--planner',
      name: 'planner',
      role: '规划与工具决策',
      code: 'graph.py · add_node("planner") / _should_call_tool()',
      span: 'agent.node.planner',
      io: '入：检索结果或原始 query\n出：tool（要调工具）/ respond（直接交审）'
    },
    {
      id: 'tool_call', x: 178, y: 214, cls: 'ag-n--tool',
      name: 'tool_call',
      role: '执行工具',
      code: 'graph.py · add_node("tool_call") / add_edge("tool_call", "planner")',
      span: 'agent.node.tool_call',
      io: '入：planner 产出的 intermediate_steps\n出：执行结果回环到 planner（多步调用）'
    },
    {
      id: 'reviewer', x: 340, y: 8, cls: 'ag-n--reviewer',
      name: 'reviewer',
      role: '质量审查',
      code: 'graph.py · add_node("reviewer")',
      span: 'agent.node.reviewer',
      io: '入：planner 的草稿答案\n出：审查后的答案，交给 respond'
    },
    {
      id: 'respond', x: 340, y: 108, cls: 'ag-n--respond',
      name: 'respond',
      role: '生成最终回答',
      code: 'graph.py · add_node("respond", respond_node + llm) / add_edge("respond", END)',
      span: 'agent.node.respond',
      io: '入：审查后的答案\n出：最终回答，链路结束'
    }
  ];

  var host = root.querySelector('.ag-nodes');
  var panel = root.querySelector('.agent-graph__panel');
  if (!host || !panel) return;

  // 用绝对定位的 <button> 而不是 SVG <rect>：SVG 图形不可聚焦、不被读屏识别为按钮。
  var html = '';
  for (var i = 0; i < NODES.length; i++) {
    var n = NODES[i];
    html += '<button type="button" class="ag-node ' + n.cls + '"' +
      ' data-node="' + n.id + '"' +
      ' style="left:' + n.x + 'px;top:' + n.y + 'px"' +
      ' aria-expanded="false"' +
      ' aria-controls="agent-graph-panel"' +
      ' aria-label="' + n.name + ' 节点（' + n.role + '），点击查看说明">' +
      '<span class="ag-node__name">' + n.name + '</span>' +
      '<span class="ag-node__role">' + n.role + '</span>' +
      '</button>';
  }
  host.innerHTML = html;

  var buttons = host.querySelectorAll('.ag-node');
  var current = null;   // 当前展开的按钮，用于 Esc 后把焦点还回去

  function byId(id) {
    for (var i = 0; i < NODES.length; i++) if (NODES[i].id === id) return NODES[i];
    return null;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function close() {
    if (!current) return;
    current.setAttribute('aria-expanded', 'false');
    panel.hidden = true;
    panel.innerHTML = '';
    var back = current;
    current = null;
    // Esc 关闭后焦点必须回到触发它的按钮（v3 §2.2 硬性要求）。
    // 窄屏下节点可能被折叠容器隐藏，此时 focus() 会静默失败 —— 先确认
    // 它仍然可见可聚焦，再回位；不可见就把焦点交给折叠按钮，避免焦点丢失。
    try {
      if (back.offsetParent !== null || back.getClientRects().length) {
        back.focus();
      } else {
        var tg = root.querySelector('.agent-graph__toggle');
        if (tg && tg.offsetParent !== null) tg.focus();
      }
    } catch (e) { /* 旧浏览器忽略 */ }
  }

  function open(btn) {
    var n = byId(btn.getAttribute('data-node'));
    if (!n) return;
    if (current === btn) { close(); return; }
    if (current) current.setAttribute('aria-expanded', 'false');
    current = btn;
    btn.setAttribute('aria-expanded', 'true');

    panel.innerHTML =
      '<div class="ag-panel__head">' +
        '<span class="ag-panel__name">' + esc(n.name) + '</span>' +
        '<span class="ag-panel__role">' + esc(n.role) + '</span>' +
        '<button type="button" class="ag-panel__close" aria-label="关闭说明">✕</button>' +
      '</div>' +
      '<dl class="ag-panel__dl">' +
        '<dt>代码位置</dt><dd><code>' + esc(n.code) + '</code></dd>' +
        '<dt>追踪 span</dt><dd><code>' + esc(n.span) + '</code></dd>' +
        '<dt>输入 / 输出</dt><dd>' + esc(n.io).replace(/\n/g, '<br>') + '</dd>' +
      '</dl>';
    panel.hidden = false;

    var closeBtn = panel.querySelector('.ag-panel__close');
    if (closeBtn) closeBtn.addEventListener('click', close);
  }

  for (var j = 0; j < buttons.length; j++) {
    buttons[j].addEventListener('click', function () { open(this); });
  }

  // Esc 关闭；在面板内也生效（焦点可能落在关闭按钮上）
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Escape' || e.keyCode === 27) && current) {
      e.preventDefault();
      close();
    }
  });

  // 窄屏可折叠：< 1024px 时链路收成一行按钮，点开展开（v3 §2.5）
  var toggle = root.querySelector('.agent-graph__toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var openNow = root.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', openNow ? 'true' : 'false');
      toggle.textContent = openNow ? '收起 Agent 链路' : '查看 Agent 链路';
    });
  }
})();
