/* ==========================================================================
   solid-3d.js — 实体方块渲染器（2026-10-19）
   --------------------------------------------------------------------------
   为什么重写：
     之前的 GLASS3D 几何体全是「线段集合」（顶点 + 棱），只画描边不画面。
     视觉评估连续 3 轮都说「像 CAD 线框草图 / 偏平 / 没有体积」——
     这是渲染方式的物理限制，不是调色或加粗能解决的。
     纯线条在浅色底上永远没有体积感。

   这一版换成**实体网格**：
     · 每个物体由若干「方块」组成（中心 + 三轴尺寸）
     · 每个方块有 6 个面，每面 4 个顶点
     · 面法线 × 光照方向 = 明暗，直接填充实色
     · 画家算法按深度排序，正确处理遮挡
     · 顶面/正面/侧面亮度不同 —— 这是等距立体图的经典做法

   结果：真正有厚度、有明暗、有遮挡的 3D，而不是线框。
   零依赖，纯 Canvas 2D。
   ========================================================================== */
(function (global) {
  'use strict';

  /* ---------- 向量工具 ---------- */
  function rotY(p, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
  }
  function rotX(p, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
  }

  /* ---------- 方块 → 6 个面 ---------- */
  // box: { x, y, z, w, h, d, color?, alpha? }
  // 坐标：x 向右、y 向上、z 向外
  function boxFaces(b) {
    var hw = b.w / 2, hh = b.h / 2, hd = b.d / 2;
    var x = b.x, y = b.y, z = b.z;

    // 8 个角
    var v = [
      { x: x - hw, y: y - hh, z: z - hd }, // 0
      { x: x + hw, y: y - hh, z: z - hd }, // 1
      { x: x + hw, y: y + hh, z: z - hd }, // 2
      { x: x - hw, y: y + hh, z: z - hd }, // 3
      { x: x - hw, y: y - hh, z: z + hd }, // 4
      { x: x + hw, y: y - hh, z: z + hd }, // 5
      { x: x + hw, y: y + hh, z: z + hd }, // 6
      { x: x - hw, y: y + hh, z: z + hd }  // 7
    ];

    // 6 个面（顶点顺序保证法线朝外）
    return {
      v: v,
      faces: [
        { i: [4, 5, 6, 7], n: { x: 0, y: 0, z: 1 } },   // 前
        { i: [1, 0, 3, 2], n: { x: 0, y: 0, z: -1 } },  // 后
        { i: [3, 2, 6, 7], n: { x: 0, y: 1, z: 0 } },   // 上
        { i: [0, 1, 5, 4], n: { x: 0, y: -1, z: 0 } },  // 下
        { i: [1, 2, 6, 5], n: { x: 1, y: 0, z: 0 } },   // 右
        { i: [0, 3, 7, 4], n: { x: -1, y: 0, z: 0 } }   // 左
      ],
      color: b.color || null,
      alpha: b.alpha == null ? 1 : b.alpha,
      // 面亮度微调：让同一朝向的面有一致观感
      glow: b.glow || 0
    };
  }

  /* ---------- 场景 ---------- */
  function SolidScene(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts || {};
    this.boxes = [];
    this.rotY = 0;
    this.rotX = 0;
    this.speed = this.opts.speed == null ? 0.00016 : this.opts.speed;
    this.baseRotX = this.opts.tilt == null ? 0.32 : this.opts.tilt;
    this.baseRotY = this.opts.rotY == null ? -0.52 : this.opts.rotY;
    this.scale = this.opts.scale || 1;
    this.stretchX = this.opts.stretchX || 1;
    this.fov = this.opts.fov || 900;
    this.palette = this.opts.palette || { base: [37, 99, 235], light: [96, 165, 250], dark: [29, 78, 216] };
    this.raf = 0;
    this.lastT = 0;
    this.minFrameMs = this.opts.minFrameMs || 0;
    this.dpr = Math.min(global.devicePixelRatio || 1, 2);

    /* 2026-10-19：交互支持（作品轨道环用）。
       highlight 是当前高亮的方块索引，-1 表示无。
       userRotY / userRotX 是用户拖拽产生的额外角度，叠加在自动旋转上。 */
    /* 2026-10-19：轨道环线。
       orbits: [{ radius, y, color, alpha, width }]
       在方块之前画细椭圆，让「轨道」这个结构一眼可辨。 */
    this.orbits = this.opts.orbits || null;

    this.highlight = -1;
    this.userRotY = 0;
    this.userRotX = 0;
    this.autoSpin = true;
    this._lastPts = null;        // 上一帧的投影结果，供 hitTest 用

    this.resize();
  }

  SolidScene.prototype.resize = function () {
    var c = this.canvas;
    var r = c.getBoundingClientRect();
    var w = Math.round(r.width);
    var h = Math.round(r.height);

    /* 2026-10-19：卡片刚插入 DOM 时 getBoundingClientRect 可能返回 0，
       这时若把 canvas.width 设成 1，之后就一直是错的（实测填充率 1.6%）。
       所以尺寸无效时标记 pending，等 draw 或 ResizeObserver 再补。 */
    if (w < 2 || h < 2) {
      this.pendingSize = true;
      return false;
    }
    this.pendingSize = false;

    if (c.width !== Math.round(w * this.dpr)) c.width = Math.round(w * this.dpr);
    if (c.height !== Math.round(h * this.dpr)) c.height = Math.round(h * this.dpr);
    this.w = w;
    this.h = h;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.boxes && this.boxes.length) this.autoFit(this._goal);
    return true;
  };

  SolidScene.prototype.setBoxes = function (boxes) {
    this.boxes = boxes.map(function (b, i) {
      var f = boxFaces(b);
      f.__index = i;
      return f;
    });
    this.autoFit();
    return this;
  };

  /* 命中测试：返回被点中的方块索引。
     用上一帧投影后的屏幕多边形做点内判定，从近到远取第一个。 */
  SolidScene.prototype.hitTest = function (mx, my) {
    var pts = this._lastPts;
    if (!pts) return -1;

    // 收集每个方块的屏幕包围盒（用 8 个顶点）
    var cands = [];
    for (var i = 0; i < pts.length; i++) {
      var box = pts[i];
      if (!box || !box.length) continue;
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, z = 0;
      for (var j = 0; j < box.length; j++) {
        var p = box[j];
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
        z += p.z;
      }
      z /= box.length;
      if (mx >= minX && mx <= maxX && my >= minY && my <= maxY) {
        // 用包围盒面积估算「精确度」，面积小的优先（避免大块抢走小块的点击）
        cands.push({ i: i, z: z, area: (maxX - minX) * (maxY - minY) });
      }
    }
    if (!cands.length) return -1;

    // 先按深度：近的优先；同深度按面积：小的优先
    cands.sort(function (a, b) {
      if (Math.abs(a.z - b.z) > 0.15) return b.z - a.z;
      return a.area - b.area;
    });
    return cands[0].i;
  };

  /* 2026-10-19：自动适配缩放。
     各模型的自然尺寸差异很大（薄板 vs 长链 vs 方阵），
     固定 scale 会让一部分模型过小、另一部分溢出。
     这里量出模型的真实包围盒，反推一个正好占目标比例的 scale。 */
  SolidScene.prototype.autoFit = function (target) {
    var goal = target == null ? 0.72 : target;
    if (!this.boxes.length) return;

    // 在「无缩放」下量包围盒（scale 设 1，stretchX 设 1）
    var saveScale = this.scale, saveStretch = this.stretchX;
    this.scale = 1;
    this.stretchX = 1;

    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    var self = this;
    this.boxes.forEach(function (bx) {
      bx.v.forEach(function (v) {
        var p = self.project(v, self.baseRotY);
        // 相对画布中心的偏移
        var dx = p.x - self.w / 2;
        var dy = p.y - self.h / 2;
        if (dx < minX) minX = dx; if (dx > maxX) maxX = dx;
        if (dy < minY) minY = dy; if (dy > maxY) maxY = dy;
      });
    });

    var spanX = maxX - minX;
    var spanY = maxY - minY;

    this.scale = saveScale;
    this.stretchX = saveStretch;

    if (spanX <= 0 || spanY <= 0) return;

    // 要占短边的 goal 比例，宽高都不能超
    var wantX = this.w * goal;
    var wantY = this.h * goal;
    var kX = wantX / spanX;
    var kY = wantY / spanY;
    var k = Math.min(kX, kY);

    // 基准 base（scale=1 时）已经含了画布尺寸，这里直接乘系数
    this.scale = saveScale * k;

    return { spanX: spanX, spanY: spanY, k: k };
  };

  /* ---------- 投影 ---------- */
  SolidScene.prototype.project = function (p, ang) {
    var q = rotY(p, ang);
    q = rotX(q, this.baseRotX + this.userRotX);

    // 透视
    var d = this.fov / (this.fov + q.z * 1.0);

    /* 2026-10-19 修缩放 bug。
       原写法 Math.min(w,h)/300 在 200×120 上只给 0.4，
       模型坐标 ±1.6 投影后总共才 1.28px，全挤在中心一点（填充率 0%）。
       改成按「模型要占画布的比例」算：
       模型归一化范围约 ±1.6（直径 3.2），要占 78% 的短边 → 短边*0.78/3.2。
       这样与画布尺寸无关，任何尺寸下模型都占同样比例。 */
    var base = Math.min(this.w, this.h) * 0.78 / 3.2 * this.scale;

    return {
      x: this.w / 2 + q.x * d * base * this.stretchX,
      y: this.h / 2 - q.y * d * base,     // 屏幕 y 向下，模型 y 向上
      z: q.z,
      d: d
    };
  };

  /* ---------- 绘制 ---------- */
  SolidScene.prototype.draw = function (t) {
    // 尺寸无效（卡片刚插入还没布局）就先补一次
    if (this.pendingSize || !this.w || this.w < 2) {
      if (!this.resize()) return;
    }

    var ctx = this.ctx, w = this.w, h = this.h;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);

    /* 2026-10-19：先画轨道环线（在方块之下）。
       评估「三条环靠方块位置暗示，没有独立轮廓，外环容易看断」。
       这里用投影实时采样画椭圆，旋转时跟着变形，永远与方块对齐。 */
    if (this.orbits && this.orbits.length) {
      this._drawOrbits(t);
    }

    var ang = this.baseRotY + this.userRotY + (this.autoSpin ? t * this.speed : 0);

    // 光源：左上前方
    var Lx = -0.42, Ly = 0.74, Lz = 0.52;
    var ll = Math.sqrt(Lx * Lx + Ly * Ly + Lz * Lz);
    Lx /= ll; Ly /= ll; Lz /= ll;

    var self = this;
    var pal = this.palette;

    // 收集所有面
    var all = [];

    this.boxes.forEach(function (bx) {
      // 旋转整个方块
      var pv = bx.v.map(function (v) { return self.project(v, ang); });

      // 方块中心深度（用于整体排序）
      var cz = 0;
      pv.forEach(function (p) { cz += p.z; });
      cz /= pv.length;

      bx.faces.forEach(function (f) {
        var pts = f.i.map(function (i) { return pv[i]; });
        // 面法线转到视线空间
        var n = rotX(rotY(f.n, ang), self.baseRotX);

        // 背面剔除：法线朝后且不透明时跳过
        if (bx.alpha >= 0.98 && n.z < -0.08) return;

        // Lambert：0.34 环境 + 0.66 漫反射
        var lam = n.x * Lx + n.y * Ly + n.z * Lz;
        if (lam < 0) lam = 0;
        var shade = 0.34 + lam * 0.66;

        // 面深度
        var fz = 0;
        pts.forEach(function (p) { fz += p.z; });
        fz /= pts.length;

        all.push({
          pts: pts,
          z: fz,
          shade: shade,
          color: bx.color || pal.base,
          alpha: bx.alpha,
          glow: bx.glow,
          bi: bx.__index            // 方块索引，供高亮判断
        });
      });
    });

    // 记录投影结果供 hitTest（每帧更新）
    this._lastPts = this.boxes.map(function (bx) {
      return bx.v.map(function (v) { return self.project(v, ang); });
    });

    // 画家算法：远的先画
    all.sort(function (a, b) { return b.z - a.z; });

    for (var i = 0; i < all.length; i++) {
      var f = all[i];
      var c = f.color;
      var r = Math.round(c[0] * f.shade);
      var g = Math.round(c[1] * f.shade);
      var b = Math.round(c[2] * f.shade);
      // 高光：正对光源的面提亮
      if (f.shade > 0.88) {
        r = Math.min(255, r + 26);
        g = Math.min(255, g + 26);
        b = Math.min(255, b + 26);
      }

      // 高亮：整体提亮
      if (this.highlight >= 0 && f.bi === this.highlight) {
        r = Math.min(255, r + 55);
        g = Math.min(255, g + 55);
        b = Math.min(255, b + 55);
      }

      ctx.globalAlpha = f.alpha;
      ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.beginPath();
      ctx.moveTo(f.pts[0].x, f.pts[0].y);
      for (var k = 1; k < f.pts.length; k++) ctx.lineTo(f.pts[k].x, f.pts[k].y);
      ctx.closePath();
      ctx.fill();

      // 细描边：让相邻面之间有条缝，边界更清楚（等距图的关键）
      if (f.alpha > 0.9) {
        ctx.globalAlpha = f.alpha * 0.55;
        ctx.strokeStyle = 'rgba(255,255,255,.85)';
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };

  /* 画轨道环线：沿圆周采样，投影后连成闭合曲线 */
  SolidScene.prototype._drawOrbits = function (t) {
    var ctx = this.ctx;
    var ang = this.baseRotY + this.userRotY + (this.autoSpin ? t * this.speed : 0);
    var SEG = 96;

    for (var oi = 0; oi < this.orbits.length; oi++) {
      var orb = this.orbits[oi];
      var r = orb.radius;
      var y = orb.y || 0;

      ctx.beginPath();
      for (var i = 0; i <= SEG; i++) {
        var a = i / SEG * Math.PI * 2;
        var p = this.project({ x: Math.cos(a) * r, y: y, z: Math.sin(a) * r }, ang);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();

      var col = orb.color || [14, 116, 144];
      ctx.globalAlpha = orb.alpha == null ? 0.30 : orb.alpha;
      ctx.strokeStyle = 'rgb(' + col[0] + ',' + col[1] + ',' + col[2] + ')';
      ctx.lineWidth = orb.width == null ? 1.3 : orb.width;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  SolidScene.prototype.tick = function (now) {
    if (this.minFrameMs && now - this.lastT < this.minFrameMs) {
      this.raf = global.requestAnimationFrame(this.tick.bind(this));
      return;
    }
    this.lastT = now;
    this.draw(now);
    this.raf = global.requestAnimationFrame(this.tick.bind(this));
  };

  SolidScene.prototype.start = function () {
    if (this.raf) return;
    this.lastT = 0;
    this.raf = global.requestAnimationFrame(this.tick.bind(this));
  };

  SolidScene.prototype.stop = function () {
    if (this.raf) { global.cancelAnimationFrame(this.raf); this.raf = 0; }
  };

  SolidScene.prototype.drawStatic = function () {
    this.draw(2600);
  };

  global.SOLID3D = { Scene: SolidScene, boxFaces: boxFaces };
})(window);
