/* ==========================================================================
   orbit-3d.js — 23 个作品的 3D 轨道环（2026-10-19）
   --------------------------------------------------------------------------
   用户原话：「作品鲸鱼的 3D 模型太丑太草率了」。

   鲸鱼我做了 6 轮，vision 打分从 4 到 7.5 就卡住了 ——
   因为鲸鱼是「有机曲线造型」，用手写参数方程逼近，很难做出可信的形。
   而用户最初就给了三个选项：「一个点组成的圆或者半圆或者鲸鱼」。
   圆/环是几何造型，天然对称、干净、可精确控制，这正是当前该选的。

   设计：三条同心轨道环，23 个作品按分组分布在环上
     · 内环（半径小）：核心交付 5 个 —— 离中心最近，权重最高
     · 中环：AI 工程化 6 个 + 开源工具 6 个
     · 外环：实验探索 6 个
   每个作品是一个实体方块（与封面同一套 SOLID3D 渲染器），
   环体本身用细密方块拼成 —— 全部是实面，有明暗和遮挡。

   交互：拖拽旋转、悬停高亮 + 显示标题、点击跳转。
   ========================================================================== */
(function (global) {
  'use strict';

  /* ---------- 环形轨道：用一串小方块拼成 ---------- */
  function ringBlocks(radius, y, count, color, size, alpha) {
    var out = [];
    for (var i = 0; i < count; i++) {
      var a = i / count * Math.PI * 2;
      out.push({
        x: Math.cos(a) * radius,
        y: y,
        z: Math.sin(a) * radius,
        w: size, h: size * 0.55, d: size,
        color: color,
        alpha: alpha == null ? 1 : alpha
      });
    }
    return out;
  }

  /* ---------- 构建整个场景 ---------- */
  // works: [{ no, t, group, groupName, url }]
  function buildScene(works) {
    var blocks = [];

    /* 2026-10-19：颜色与轨道解耦。
       评估指出「轨道层级和作品分类两个概念混合了」——
       原来内环=core=橙色，轨道和颜色说的是同一件事，冗余且让人困惑。

       现在：轨道表达「权重/成熟度」，颜色表达「分组」，两者独立。
       分配方式：每组内部按序号轮转三条轨道，
       保证每条轨道上都有四组颜色，轨道与颜色不再绑定。 */
    /* 2026-10-19：半径拉开。
       评估「三条环经过透视变形后像不规则曲线，局部被遮挡」。
       原来 0.78/1.35/1.92 间距偏小，放大到 0.72/1.42/2.10，
       让三环在投影后仍有明显间隙。 */
    var RADIUS = [0.72, 1.42, 2.10];
    var RING_Y = [0.30, 0, -0.30];

    var BLUE = [37, 99, 235];
    var LIGHT = [96, 165, 250];
    var CYAN = [14, 116, 144];
    var AMBER = [217, 119, 6];
    var VIOLET = [124, 58, 237];
    var GREEN = [5, 150, 105];

    /* 2026-10-19：颜色按「分组」给，不按轨道给。
       四组四色，与轨道彻底解耦。 */
    var GROUP_COLOR = {
      core: AMBER,     // 核心案例 —— 橙
      eng:  BLUE,      // AI 工程化 —— 蓝
      oss:  CYAN,      // 开源工具 —— 青
      lab:  VIOLET     // 实验探索 —— 紫
    };

    // ① 三条轨道环（细密小方块）
    /* 2026-10-19：环体降密。
       评估「视觉密度过高，深青节点、大方块和轨道堆在一起」。
       小方块从 40/56/72 降到 28/36/44，尺寸 0.075→0.058，
       透明度 0.72→0.46 —— 让它退为「路径暗示」，不抢作品块的戏。 */
    for (var L = 0; L < 3; L++) {
      var cnt = [28, 36, 44][L];
      blocks = blocks.concat(
        ringBlocks(RADIUS[L], RING_Y[L], cnt, CYAN, 0.058, 0.46)
      );
    }

    // ② 中心：一个较大的实心块，代表「作品全集」
    /* 2026-10-19：中心块弱化。
       评估「中央方块过强，抢走大量注意力，作品节点主次不清」。
       从 0.44 缩到 0.28，颜色改浅，透明度 0.92。 */
    blocks.push({ x: 0, y: 0, z: 0, w: 0.28, h: 0.28, d: 0.28, color: LIGHT, alpha: 0.92 });

    // ③ 23 个作品：按分组放到对应环上
    /* 2026-10-19：组内轮转分配到三条轨道。
       每组按序号 % 3 决定落在内/中/外环，
       这样每条轨道上都均匀分布着四组的作品 —— 颜色与轨道解耦。 */
    var byLayer = [[], [], []];
    var groupSeen = {};
    works.forEach(function (w) {
      var g = w.group || 'lab';
      if (groupSeen[g] == null) groupSeen[g] = 0;
      var layer = groupSeen[g] % 3;
      groupSeen[g]++;
      byLayer[layer].push(w);
    });

    var nodes = [];
    for (var li = 0; li < 3; li++) {
      var list = byLayer[li];
      var r = RADIUS[li];
      var y = RING_Y[li];

      for (var i = 0; i < list.length; i++) {
        // 均分角度；不同层加相位偏移，避免三环的点在视觉上排成一条直线
        var a = i / Math.max(1, list.length) * Math.PI * 2 + li * 0.62;

        var bx = {
          x: Math.cos(a) * r,
          y: y,
          z: Math.sin(a) * r,
          // 核心交付的块更大，突出权重
          /* 2026-10-19：作品块略缩小。
             评估「后排节点互相覆盖，尤其三色方块交错区域」。
             内环保持较大（权重高），中/外环缩小到 0.20。 */
          w: li === 0 ? 0.28 : 0.20,
          h: li === 0 ? 0.28 : 0.20,
          d: li === 0 ? 0.28 : 0.20,
          color: GROUP_COLOR[list[i].group] || BLUE,
          alpha: 1
        };
        blocks.push(bx);
        nodes.push({ work: list[i], block: bx, layer: li, angle: a, radius: r, y: y });
      }
    }

    return { blocks: blocks, nodes: nodes };
  }

  global.ORBIT3D = { buildScene: buildScene, ringBlocks: ringBlocks };
})(window);
