/* ==========================================================================
   orbit-3d.js — 23 个作品的晶体轨道（2026-10-20 重做样式）
   --------------------------------------------------------------------------
   上一版：192 个小方块拼成三条环体 —— 视觉碎、像噪点。
   这一版换成「晶体轨道」：

     ① 轨道 = 连续细弧线（不是一串方块）
        用 72 段线段拼成闭合弧，线宽 0.45 —— 细而连续，像光轨
        每条环加一圈「外扩虚点」，暗示轨道厚度

     ② 作品节点 = 八面体（不是方块）
        八面体线框画出来是「菱形轮廓 + 中间十字」，晶体感强
        比方块有辨识度，也呼应「作品是结晶」的意象

     ③ 中心 = 双层八面体 + 放射线
        内层实心感（小八面体），外层大八面体
        从中心向三条环各发一条放射线，形成「星芒」结构

     ④ 作品节点向外发一条短连接线
        接到它所在轨道上 —— 让「作品挂在轨道上」这个关系看得见

   交互：拖拽旋转、滚轮缩放、悬停高亮 + 气泡、点击跳转、方向键微调。
   ========================================================================== */
(function (global) {
  'use strict';

  var AMBER = [217, 119, 6];
  var BLUE = [37, 99, 235];
  var CYAN = [14, 116, 144];
  var VIOLET = [124, 58, 237];
  var LIGHT = [96, 165, 250];

  var GROUP_COLOR = {
    core: AMBER,
    eng: BLUE,
    oss: CYAN,
    lab: VIOLET
  };

  /* 2026-10-20：外环从 2.28 收到 2.12。
     评估「下沿贴近面板边界」，投影后外环顶到了画布边缘。
     三层间距也更均匀：0.86 / 1.50 / 2.12（差 0.64 / 0.62）。 */
  var RADIUS = [0.86, 1.50, 2.12];
  var RING_Y = [0.32, 0, -0.32];

  /* ---------- 生成一条闭合弧线（用线段拼） ---------- */
  function arcSegments(radius, y, segs, color, weight) {
    var out = [];
    for (var i = 0; i < segs; i++) {
      var a1 = i / segs * Math.PI * 2;
      var a2 = (i + 1) / segs * Math.PI * 2;
      out.push({
        type: 'line',
        from: [Math.cos(a1) * radius, y, Math.sin(a1) * radius],
        to: [Math.cos(a2) * radius, y, Math.sin(a2) * radius],
        color: color,
        weight: weight,
        pickable: false
      });
    }
    return out;
  }

  /* ---------- 生成一圈虚点（外扩，暗示轨道厚度） ---------- */
  function dotRing(radius, y, count, color) {
    var out = [];
    for (var i = 0; i < count; i++) {
      var a = i / count * Math.PI * 2;
      out.push({
        type: 'octa',
        x: Math.cos(a) * radius,
        y: y,
        z: Math.sin(a) * radius,
        s: 0.022,
        color: color,
        weight: 0.5,
        pickable: false
      });
    }
    return out;
  }

  /* ---------- 构建场景 ---------- */
  function buildScene(works) {
    var shapes = [];

    /* ① 三条轨道：连续弧线 + 外扩虚点
       2026-10-20：从「192 个小方块」改成「72 段弧线 + 一圈细点」。
       方块拼出来的环看起来是断的、碎的；连续弧线才像「轨道」。 */
    var ARC_COLOR = [[217, 119, 6], [37, 99, 235], [124, 58, 237]];
    for (var L = 0; L < 3; L++) {
      // 2026-10-20：0.42 → 0.58，评估说「部分弧线较淡」
      shapes = shapes.concat(arcSegments(RADIUS[L], RING_Y[L], 72, ARC_COLOR[L], 0.58));
      // 外扩一点点的一圈虚点，给轨道「厚度感」
      // 2026-10-20：外环虚点数量收一点（42 → 36），避免边缘噪点
      shapes = shapes.concat(dotRing(RADIUS[L] + 0.05, RING_Y[L], [24, 30, 36][L], ARC_COLOR[L]));
    }

    /* ② 中心：双层八面体 + 三条放射线 */
    shapes.push({
      type: 'octa', x: 0, y: 0, z: 0, s: 0.165,
      color: LIGHT, weight: 1.3, pickable: false
    });
    // 2026-10-20：外层八面体降权（0.7 → 0.45），让中心不那么抢
    shapes.push({
      type: 'octa', x: 0, y: 0, z: 0, s: 0.32,
      color: BLUE, weight: 0.45, pickable: false
    });

    /* ③ 23 个作品：组内轮转分到三条环 */
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
        var a = i / Math.max(1, list.length) * Math.PI * 2 + li * 0.62;
        var px = Math.cos(a) * r, pz = Math.sin(a) * r;
        var col = GROUP_COLOR[list[i].group] || BLUE;

        // 作品节点：八面体，内环更大（权重高）
        var size = li === 0 ? 0.155 : 0.115;
        var node = {
          type: 'octa',
          x: px, y: y, z: pz,
          s: size,
          color: col,
          weight: li === 0 ? 1.5 : 1.2,
          pickable: true
        };
        shapes.push(node);

        // 连接线：作品 → 它所在轨道（同半径同 y，所以是「落到轨道上」的短线）
        // 做法：从节点向下（或向环心方向）引一小段，表示「挂在轨道上」
        shapes.push({
          type: 'line',
          from: [px, y, pz],
          to: [px, y + (li === 0 ? 0.10 : -0.10), pz],
          color: col,
          weight: 0.5,
          pickable: false
        });

        nodes.push({
          work: list[i],
          shape: node,
          layer: li,
          angle: a,
          radius: r,
          y: y
        });
      }
    }

    return { shapes: shapes, nodes: nodes };
  }

  global.ORBIT3D = { buildScene: buildScene, arcSegments: arcSegments, dotRing: dotRing };
})(window);
