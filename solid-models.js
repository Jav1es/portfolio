/* ==========================================================================
   solid-models.js — 23 个作品的实体 3D 模型（2026-10-19）
   --------------------------------------------------------------------------
   每个作品用「方块」拼出它的真实技术结构，而不是抽象的线框造型。

   为什么用方块：方块有 6 个实面，每面有法线和光照，
   渲染出来有厚度、明暗、遮挡 —— 这才是视觉上「像 3D」的东西。
   之前的线段几何体无论怎么加粗加深，本质仍是线稿。

   单位约定：模型整体在 x∈[-1.6,1.6]、y∈[-1,1]、z∈[-0.8,0.8] 内
   这样 23 个模型在封面上大小一致。
   ========================================================================== */
(function (global) {
  'use strict';

  var BLUE = [37, 99, 235];
  var CYAN = [14, 116, 144];
  var AMBER = [217, 119, 6];
  var GREEN = [5, 150, 105];
  var VIOLET = [124, 58, 237];
  var LIGHT = [96, 165, 250];

  // 辅助：造一个方块
  function B(x, y, z, w, h, d, color, alpha, glow) {
    return { x: x, y: y, z: z, w: w, h: h, d: d, color: color || null, alpha: alpha == null ? 1 : alpha, glow: glow || 0 };
  }

  // 辅助：一排方块
  function row(n, fn, spanX, y, z, w, h, d, color) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var x = n === 1 ? 0 : -spanX / 2 + (spanX / (n - 1)) * i;
      out.push(fn(x, y, z, w, h, d, color, i, n));
    }
    return out;
  }

  /* ======================================================================
     23 个模型
     ====================================================================== */
  var MODELS = {

    // 01 八个业务域，六个月路线图 → 高低立柱矩阵（高度 = 完成度）
    roadmap: function () {
      var out = [], heights = [0.5, 0.85, 0.65, 1.0, 0.45, 0.75, 0.95, 0.6];
      for (var i = 0; i < 8; i++) {
        var col = i % 4, row2 = Math.floor(i / 4);
        var x = -0.99 + col * 0.66;
        var z = row2 === 0 ? 0.32 : -0.32;
        var hh = heights[i] * 1.1;
        out.push(B(x, -0.75 + hh / 2, z, 0.36, hh, 0.36, i % 3 === 0 ? LIGHT : BLUE));
        // 顶部小盖，强调「里程碑」
        out.push(B(x, -0.75 + hh + 0.06, z, 0.30, 0.10, 0.30, AMBER));
      }
      return out;
    },

    // 02 双层流（AI 先做 / 人只审）→ 上下两层板 + 中间连接柱
    bilayer: function () {
      var out = [];
      // 上层：AI 处理
      for (var i = 0; i < 4; i++) {
        out.push(B(-1.05 + i * 0.70, 0.55, 0, 0.52, 0.26, 0.52, LIGHT));
      }
      // 下层：人工审核
      for (var j = 0; j < 3; j++) {
        out.push(B(-0.85 + j * 0.85, -0.55, 0, 0.60, 0.30, 0.60, BLUE));
      }
      // 中间竖直连接柱
      out.push(B(-1.05, 0, 0, 0.10, 1.0, 0.10, CYAN, 0.95));
      out.push(B(1.05, 0, 0, 0.10, 1.0, 0.10, CYAN, 0.95));
      return out;
    },

    // 03 RPA + AI 审核 → 串行方块 + 异常旁路
    auditflow: function () {
      var out = [];
      var xs = [-1.2, -0.6, 0, 0.6, 1.2];
      for (var i = 0; i < xs.length; i++) {
        out.push(B(xs[i], 0, 0, 0.40, 0.40, 0.40, i === 2 ? AMBER : BLUE));
      }
      // 异常旁路：从第 3 个方块往下绕
      out.push(B(0, -0.62, 0, 0.34, 0.34, 0.34, VIOLET, 0.9));
      out.push(B(0.42, -0.62, 0, 0.30, 0.22, 0.30, VIOLET, 0.75));
      return out;
    },

    // 04 LangGraph 六节点编排 → 中心 + 外环
    agentgraph: function () {
      var out = [];
      out.push(B(0, 0, 0, 0.62, 0.62, 0.62, BLUE));           // 中心
      var n = 6;
      for (var i = 0; i < n; i++) {
        var a = i / n * Math.PI * 2;
        var x = Math.cos(a) * 1.05, z = Math.sin(a) * 0.72, y = Math.sin(a) * 0.30;
        out.push(B(x, y, z, 0.34, 0.34, 0.34, i % 2 ? LIGHT : CYAN));
      }
      return out;
    },

    // 05 BI 看板 → 高低条形柱 + 底座
    dashboard: function () {
      var out = [];
      out.push(B(0, -0.82, 0, 2.7, 0.14, 0.9, CYAN));          // 底座
      var hs = [0.42, 0.72, 0.55, 0.95, 0.38, 0.66];
      for (var i = 0; i < hs.length; i++) {
        out.push(B(-1.1 + i * 0.44, -0.75 + hs[i] / 2, 0, 0.28, hs[i], 0.42, i % 2 ? LIGHT : BLUE));
      }
      return out;
    },

    // 06 流水线 → 沿 X 轴串的方块 + 传送带
    pipeline: function () {
      var out = [];
      out.push(B(0, -0.45, 0, 2.9, 0.12, 0.44, CYAN));         // 传送带
      for (var i = 0; i < 5; i++) {
        out.push(B(-1.2 + i * 0.6, 0.02, 0, 0.38, 0.44, 0.38, i === 2 ? AMBER : BLUE));
      }
      return out;
    },

    // 07 Prompt 三阶段 → 三层嵌套（由小到大）
    triphase: function () {
      var out = [];
      out.push(B(0, 0, 0, 0.52, 0.52, 0.52, AMBER));           // 内层
      out.push(B(0, 0, 0, 1.02, 1.02, 1.02, LIGHT, 0.34));     // 中层（半透明）
      out.push(B(0, 0, 0, 1.52, 1.52, 1.52, BLUE, 0.16));      // 外层（更透明）
      return out;
    },

    // 08 培训 → SOP → 推广 → 金字塔
    pyramid: function () {
      var out = [];
      var sizes = [[2.2, 0.34], [1.5, 0.34], [0.85, 0.34]];
      var y = -0.78;
      for (var i = 0; i < sizes.length; i++) {
        var s = sizes[i][0], hh = sizes[i][1];
        out.push(B(0, y + hh / 2, 0, s, hh, s * 0.72, i === 2 ? AMBER : (i === 1 ? LIGHT : BLUE)));
        y += hh + 0.04;
      }
      return out;
    },

    // 09 服务栈 → 竖直服务层 + 每层方孔（机架感）
    servicestack: function () {
      var out = [];
      for (var i = 0; i < 4; i++) {
        var y = -0.68 + i * 0.44;
        // 左右两块 + 中间留缝 = 机架
        out.push(B(-0.62, y, 0, 1.05, 0.34, 0.9, i % 2 ? LIGHT : BLUE));
        out.push(B(0.62, y, 0, 1.05, 0.34, 0.9, i % 2 ? LIGHT : BLUE));
      }
      // 侧柱
      out.push(B(-1.22, 0, 0, 0.10, 2.0, 0.9, CYAN));
      out.push(B(1.22, 0, 0, 0.10, 2.0, 0.9, CYAN));
      return out;
    },

    // 10 复盘循环 → 环形排布 + 中心
    reviewloop: function () {
      var out = [];
      var n = 7;
      for (var i = 0; i < n; i++) {
        var a = i / n * Math.PI * 2;
        out.push(B(Math.cos(a) * 1.15, Math.sin(a) * 0.78, 0, 0.32, 0.32, 0.32, i % 2 ? LIGHT : BLUE));
      }
      out.push(B(0, 0, 0, 0.44, 0.44, 0.44, AMBER));
      return out;
    },

    // 11 两份标准件 → 并排两份文档（薄板 + 折角）
    twodocs: function () {
      var out = [];
      out.push(B(-0.62, 0, 0.18, 1.05, 1.35, 0.09, LIGHT));
      out.push(B(0.62, 0, -0.18, 1.05, 1.35, 0.09, BLUE));
      // 文档上的「行」
      for (var i = 0; i < 3; i++) {
        out.push(B(-0.62, 0.38 - i * 0.30, 0.24, 0.62, 0.07, 0.03, CYAN, 0.85));
        out.push(B(0.62, 0.38 - i * 0.30, -0.12, 0.62, 0.07, 0.03, CYAN, 0.85));
      }
      return out;
    },

    // 12 MCP 5 工具 → 中心 + 扇形
    toolsfan: function () {
      var out = [];
      out.push(B(0, -0.35, 0, 0.58, 0.58, 0.58, BLUE));
      for (var i = 0; i < 5; i++) {
        var a = -Math.PI * 0.78 + i * (Math.PI * 0.56 / 4);
        var r = 1.15;
        out.push(B(Math.cos(a) * r, -0.35 + Math.sin(a) * r * 0.9, 0, 0.36, 0.36, 0.36, i % 2 ? AMBER : LIGHT));
      }
      return out;
    },

    // 13 知识库树 → 根 + 两层分叉
    tree: function () {
      var out = [];
      out.push(B(0, -0.72, 0, 0.44, 0.44, 0.44, AMBER));        // 根
      for (var i = 0; i < 3; i++) {
        out.push(B(-0.85 + i * 0.85, -0.10, 0, 0.36, 0.36, 0.36, BLUE));
      }
      for (var j = 0; j < 5; j++) {
        out.push(B(-1.10 + j * 0.55, 0.55, 0, 0.26, 0.26, 0.26, LIGHT));
      }
      return out;
    },

    // 14 OTel 观测 → 中心 + 三条探针
    observability: function () {
      var out = [];
      out.push(B(0, 0, 0, 0.66, 0.66, 0.66, BLUE));
      // 三条探针（沿三个方向伸出）
      out.push(B(0, 0.86, 0, 0.16, 0.70, 0.16, CYAN));
      out.push(B(0.80, -0.35, 0, 0.16, 0.16, 0.72, CYAN));
      out.push(B(-0.80, -0.35, 0, 0.16, 0.16, 0.72, CYAN));
      // 探针末端
      out.push(B(0, 1.26, 0, 0.28, 0.28, 0.28, AMBER));
      out.push(B(0.80, -0.35, 0.44, 0.26, 0.26, 0.26, AMBER));
      out.push(B(-0.80, -0.35, 0.44, 0.26, 0.26, 0.26, AMBER));
      return out;
    },

    // 15 三个插件 → 三个立方体绕中心
    plugcluster: function () {
      var out = [];
      var pos = [[-0.95, 0.42], [0.95, 0.42], [0, -0.72]];
      for (var i = 0; i < 3; i++) {
        out.push(B(pos[i][0], pos[i][1], 0, 0.72, 0.72, 0.72, i === 1 ? LIGHT : BLUE));
        // 插件上的「插头」
        out.push(B(pos[i][0], pos[i][1] + 0.44, 0, 0.24, 0.18, 0.24, AMBER));
      }
      out.push(B(0, 0.02, 0, 0.34, 0.34, 0.34, CYAN));
      return out;
    },

    // 16 集群 → 3×3 立方体阵
    cluster: function () {
      var out = [];
      for (var r = 0; r < 3; r++) {
        for (var c = 0; c < 3; c++) {
          out.push(B(-0.85 + c * 0.85, 0.62 - r * 0.62, 0, 0.46, 0.46, 0.46,
            (r + c) % 3 === 0 ? AMBER : ((r + c) % 2 ? LIGHT : BLUE)));
        }
      }
      return out;
    },

    // 17 分层架构 → 堆叠薄板
    layers: function () {
      var out = [];
      for (var i = 0; i < 5; i++) {
        out.push(B(0, -0.72 + i * 0.36, 0, 2.2 - i * 0.14, 0.24, 1.0 - i * 0.06,
          i === 4 ? AMBER : (i % 2 ? LIGHT : BLUE)));
      }
      return out;
    },

    // 18 螺旋演进 → 沿螺旋排布
    helix: function () {
      var out = [];
      var n = 9;
      for (var i = 0; i < n; i++) {
        var t = i / (n - 1);
        var a = t * Math.PI * 2.2;
        out.push(B(Math.cos(a) * 0.82, -0.75 + t * 1.6, Math.sin(a) * 0.62,
          0.30, 0.20, 0.30, i % 3 === 0 ? AMBER : (i % 2 ? LIGHT : BLUE)));
      }
      return out;
    },

    // 19 四件工具 → 2×2 大方块
    toolmatrix: function () {
      var out = [];
      var pos = [[-0.62, 0.52], [0.62, 0.52], [-0.62, -0.52], [0.62, -0.52]];
      for (var i = 0; i < 4; i++) {
        out.push(B(pos[i][0], pos[i][1], 0, 0.92, 0.76, 0.76, i % 2 ? LIGHT : BLUE));
        // 每个工具上的小指示块
        out.push(B(pos[i][0], pos[i][1] + 0.20, 0.42, 0.30, 0.16, 0.06, AMBER));
      }
      return out;
    },

    // 20 评分雷达 → 三层同心（由大到小）
    radar: function () {
      var out = [];
      var sizes = [1.9, 1.30, 0.72];
      for (var i = 0; i < sizes.length; i++) {
        out.push(B(0, -0.30 + i * 0.30, 0, sizes[i], 0.14, sizes[i] * 0.78,
          i === 2 ? AMBER : (i === 1 ? LIGHT : BLUE), 0.92));
      }
      // 中心柱
      out.push(B(0, 0.20, 0, 0.22, 0.75, 0.22, VIOLET));
      return out;
    },

    // 21 MCP 桥接 → 两端 + 桥面
    bridge: function () {
      var out = [];
      out.push(B(-1.15, -0.30, 0, 0.60, 0.90, 0.80, BLUE));      // 左端
      out.push(B(1.15, -0.30, 0, 0.60, 0.90, 0.80, LIGHT));      // 右端
      // 桥面
      for (var i = 0; i < 5; i++) {
        out.push(B(-0.66 + i * 0.33, 0.28, 0, 0.30, 0.12, 0.55, CYAN));
      }
      // 桥墩
      out.push(B(0, -0.12, 0, 0.14, 0.70, 0.14, CYAN, 0.9));
      return out;
    },

    // 22 原型工厂 → 交错齿轮 + 输出
    factory: function () {
      var out = [];
      out.push(B(-0.72, 0.30, 0, 0.95, 0.95, 0.60, BLUE));
      out.push(B(0.62, -0.24, 0.20, 0.78, 0.78, 0.52, LIGHT));
      // 齿轮的「齿」
      for (var i = 0; i < 6; i++) {
        var a = i / 6 * Math.PI * 2;
        out.push(B(-0.72 + Math.cos(a) * 0.56, 0.30 + Math.sin(a) * 0.56, 0,
          0.18, 0.18, 0.52, AMBER));
      }
      // 输出箭头
      out.push(B(1.32, -0.62, 0, 0.42, 0.22, 0.42, GREEN));
      return out;
    },

    // 23 Dify 31 节点工作流 → 之字形长链
    workflow: function () {
      var out = [];
      var n = 7;
      for (var i = 0; i < n; i++) {
        var x = -1.35 + i * 0.45;
        var y = (i % 2 === 0) ? 0.42 : -0.30;
        out.push(B(x, y, 0, 0.30, 0.30, 0.30, i === 3 ? AMBER : (i % 2 ? LIGHT : BLUE)));
      }
      // 分支
      out.push(B(-0.45, 0.82, 0, 0.24, 0.24, 0.24, VIOLET));
      out.push(B(0.45, -0.72, 0, 0.24, 0.24, 0.24, VIOLET));
      // 外框
      out.push(B(0, 1.05, -0.42, 3.0, 0.08, 0.08, CYAN, 0.85));
      out.push(B(0, -1.00, -0.42, 3.0, 0.08, 0.08, CYAN, 0.85));
      return out;
    }
  };

  /* ---------- 按作品编号取模型 ---------- */
  var BY_NO = {
    '01': 'roadmap', '02': 'bilayer', '03': 'auditflow', '04': 'agentgraph',
    '05': 'dashboard', '06': 'pipeline', '07': 'triphase', '08': 'pyramid',
    '09': 'servicestack', '10': 'reviewloop', '11': 'twodocs', '12': 'toolsfan',
    '13': 'tree', '14': 'observability', '15': 'plugcluster', '16': 'cluster',
    '17': 'layers', '18': 'helix', '19': 'toolmatrix', '20': 'radar',
    '21': 'bridge', '22': 'factory', '23': 'workflow'
  };

  function get(kind) {
    var fn = MODELS[kind];
    if (!fn) fn = MODELS.cluster;
    return fn();
  }

  global.SOLID_MODELS = {
    get: get,
    byNo: function (no) { return get(BY_NO[no] || 'cluster'); },
    kinds: Object.keys(MODELS)
  };
})(window);
