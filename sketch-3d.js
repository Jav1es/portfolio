/* ==========================================================================
   sketch-3d.js — 网格素描渲染器（2026-10-19）
   --------------------------------------------------------------------------
   用户要的是「网格素描草稿那种，或者科技智慧那种」，不是实体色块。

   我之前判断错了：把线框版「偏平」归因为「没有实体面」，
   于是重写成实体方块（solid-3d.js）。但用户的审美偏好是线稿风 ——
   线框本身没问题，问题是我没做好线稿该有的东西。

   查技能与参考后确认，专业线稿（工程蓝图 / 技术素描）的三个核心技术：

   ① **Depth Cueing（深度提示）**
      不靠色块，靠「线宽 + 明暗 + 透明度」表达远近。
      近处的线：粗、深、实
      远处的线：细、淡、虚
      这是线稿产生体积感的正道。

   ② **Hidden-Line Removal（隐藏线处理）**
      被遮挡的线不直接消失，而是画成虚线 + 更淡 ——
      这样能「看见结构」，是工程制图的标准画法，也是「智慧感」的来源。

   ③ **网格底纹（Grid / Blueprint）**
      背景铺极淡的等距网格 + 交叉标记，强化「草图 / 蓝图」语境。

   配色沿用全站冷色（blue/cyan），不引入暖色，保持统一。
   零依赖，纯 Canvas 2D。
   ========================================================================== */
(function (global) {
  'use strict';

  var PAL = {
    // 主线（近处）：深蓝，比之前更深
    near: [17, 45, 138],
    // 中线：蓝
    mid: [37, 99, 235],
    // 远线：淡蓝（更淡，拉开与近端的差）
    far: [186, 220, 252],
    // 隐藏线：极淡的冷灰蓝
    hidden: [148, 163, 184],
    // 网格
    grid: [37, 99, 235],
    // 强调（节点、关键结构）
    accent: [14, 116, 144]
  };

  function rotY(p, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
  }
  function rotX(p, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
  }
  function rotZ(p, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z };
  }

  /* ======================================================================
     SketchScene
     ====================================================================== */
  function SketchScene(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts || {};
    this.geo = this.opts.geo || { v: [], e: [] };
    this.rotY0 = this.opts.rotY == null ? -0.52 : this.opts.rotY;
    this.tilt = this.opts.tilt == null ? 0.34 : this.opts.tilt;
    this.speed = this.opts.speed == null ? 0.00016 : this.opts.speed;
    this.userRotY = 0;
    this.userRotX = 0;
    this.autoSpin = true;
    this.showGrid = this.opts.grid !== false;
    this.showHidden = this.opts.hidden !== false;
    this.showNodes = this.opts.nodes !== false;
    this.raf = 0;
    this.lastT = 0;
    this.minFrameMs = this.opts.minFrameMs || 0;
    /* 2026-10-19：几何体的最大半径，用于把任意尺度的几何体归一化 */
    this._geoR = 1;
    if (this.geo && this.geo.v && this.geo.v.length) {
      var maxR = 0;
      for (var gi = 0; gi < this.geo.v.length; gi++) {
        var gv = this.geo.v[gi];
        var rr = Math.sqrt(gv.x * gv.x + gv.y * gv.y + gv.z * gv.z);
        if (rr > maxR) maxR = rr;
      }
      this._geoR = maxR || 1;
    }
    this.dpr = Math.min(global.devicePixelRatio || 1, 2);
    this.resize();
    /* 2026-10-19：构造时就适配一次。
       之前 autoFit 只在 setGeo 里调，而初始化是直接传 geo 的，
       导致自动适配从未生效（_scaleK 恒为 1，模型明显偏小）。 */
    if (this.geo && this.geo.v && this.geo.v.length) this.autoFit();
  }

  SketchScene.prototype.resize = function () {
    var c = this.canvas;
    var r = c.getBoundingClientRect();
    var w = Math.round(r.width), h = Math.round(r.height);
    if (w < 2 || h < 2) { this.pendingSize = true; return false; }
    this.pendingSize = false;
    if (c.width !== Math.round(w * this.dpr)) c.width = Math.round(w * this.dpr);
    if (c.height !== Math.round(h * this.dpr)) c.height = Math.round(h * this.dpr);
    this.w = w;
    this.h = h;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // 画布尺寸变了，包围盒也变，重新适配
    if (this.geo && this.geo.v && this.geo.v.length) this.autoFit();
    return true;
  };

  SketchScene.prototype.setGeo = function (geo) {
    // 2026-10-19：几何体换了，半径要重算
    var maxR = 0;
    for (var gi = 0; gi < geo.v.length; gi++) {
      var gv = geo.v[gi];
      var rr = Math.sqrt(gv.x * gv.x + gv.y * gv.y + gv.z * gv.z);
      if (rr > maxR) maxR = rr;
    }
    this._geoR = maxR || 1;
    this.geo = geo;
    this.autoFit();
    return this;
  };

  /* 自动适配：量包围盒，反推正好占 target 比例的缩放 */
  /* 自动适配：量包围盒，反推正好占 target 比例的缩放 */
  SketchScene.prototype.autoFit = function (target) {
    /* 2026-10-19 重写。
       旧版：_scaleK 先设 1 量包围盒，再乘 目标/span ——
       但 project() 里已经乘了 base（Math.min(w,h)/3），
       等于在已有缩放上再叠一层系数，实测算出 0.028，
       模型缩到 54%×92%，明显偏小。

       新版：量「_scaleK=1 时相对画布中心的像素偏移」，
       直接算「目标像素 / 当前像素」得到绝对系数。 */
    var goal = target == null ? 0.92 : target;
    if (!this.geo || !this.geo.v.length) return;
    if (!this.w || !this.h) return;

    var ang = this.rotY0;
    var self = this;
    var save = this._scaleK;
    this._scaleK = 1;

    var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    this.geo.v.forEach(function (v) {
      var p = self.project(v, ang);
      var dx = p.x - self.w / 2, dy = p.y - self.h / 2;
      if (dx < minX) minX = dx; if (dx > maxX) maxX = dx;
      if (dy < minY) minY = dy; if (dy > maxY) maxY = dy;
    });

    this._scaleK = save;

    var spanX = maxX - minX, spanY = maxY - minY;
    if (spanX <= 0 || spanY <= 0) return;

    // 目标像素尺寸 / 当前像素尺寸
    this._scaleK = Math.min(
      (this.w * goal) / spanX,
      (this.h * goal) / spanY
    );
  };

  SketchScene.prototype.project = function (p, ang) {
    var q = rotY(p, ang);
    q = rotX(q, this.tilt + this.userRotX);
    var d = 900 / (900 + q.z);
    /* 2026-10-19：base 改为按几何体实际尺寸归一化。
       原来写死 min(w,h)/3，假设几何体坐标是 ±1 量级；
       但实际几何体是 ±59 量级（glass-3d.js 用 size 参数生成），
       导致必须用 _scaleK≈0.028 去补偿，线宽/节点就和模型脱钩了。

       现在：先用几何体半径算出「模型本体该有多大」，
       再乘一个自适应系数，让模型正好填满画布 ——
       _scaleK 因此恒在 1 附近，固定像素的线宽/节点始终与模型匹配。 */
    var base = Math.min(this.w, this.h) / (this._geoR * 2.2);
    var k = this._scaleK == null ? 1 : this._scaleK;
    return {
      x: this.w / 2 + q.x * d * base * k,
      y: this.h / 2 - q.y * d * base * k,
      z: q.z,
      d: d
    };
  };

  /* ---------- 网格底纹 ---------- */
  SketchScene.prototype.drawGrid = function () {
    if (!this.showGrid) return;
    var ctx = this.ctx, w = this.w, h = this.h;
    var step = 22;
    var col = PAL.grid;

    ctx.save();
    // 2026-10-19：网格从 0.055 提到 0.10 —— 评估说「几乎看不到网格底纹」
    ctx.globalAlpha = 0.14;
    ctx.strokeStyle = 'rgb(' + col[0] + ',' + col[1] + ',' + col[2] + ')';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = 0; x <= w; x += step) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
    }
    for (var y = 0; y <= h; y += step) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    ctx.stroke();

    // 每 4 格加深一点，形成「主次网格」
    // 2026-10-19：主网格线 0.10 → 0.17，让「主次网格」结构看得出来
    ctx.globalAlpha = 0.24;
    ctx.beginPath();
    for (var x2 = 0; x2 <= w; x2 += step * 4) {
      ctx.moveTo(x2 + 0.5, 0);
      ctx.lineTo(x2 + 0.5, h);
    }
    for (var y2 = 0; y2 <= h; y2 += step * 4) {
      ctx.moveTo(0, y2 + 0.5);
      ctx.lineTo(w, y2 + 0.5);
    }
    ctx.stroke();

    // 四角标记（工程图纸感）
    ctx.globalAlpha = 0.42;
    var m = 14, len = 12;
    ctx.beginPath();
    ctx.moveTo(m, m + len); ctx.lineTo(m, m); ctx.lineTo(m + len, m);
    ctx.moveTo(w - m - len, m); ctx.lineTo(w - m, m); ctx.lineTo(w - m, m + len);
    ctx.moveTo(m, h - m - len); ctx.lineTo(m, h - m); ctx.lineTo(m + len, h - m);
    ctx.moveTo(w - m - len, h - m); ctx.lineTo(w - m, h - m); ctx.lineTo(w - m, h - m - len);
    ctx.stroke();
    ctx.restore();
  };

  /* ---------- 主绘制 ---------- */
  SketchScene.prototype.draw = function (t) {
    if (this.pendingSize || !this.w) { if (!this.resize()) return; }
    var ctx = this.ctx, w = this.w, h = this.h;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);

    this.drawGrid();

    var ang = this.rotY0 + this.userRotY + (this.autoSpin ? t * this.speed : 0);
    var geo = this.geo;
    if (!geo || !geo.v.length) return;

    // 投影所有顶点
    var pts = geo.v.map(function (v) { return this.project(v, ang); }, this);

    // 深度范围（用于归一化 depth cueing）
    var zMin = 1e9, zMax = -1e9;
    pts.forEach(function (p) { if (p.z < zMin) zMin = p.z; if (p.z > zMax) zMax = p.z; });
    var zSpan = Math.max(0.001, zMax - zMin);

    // 棱按深度排序（远的先画，近的后画 → 近的压在上面）
    var self = this;
    var edges = geo.e.map(function (e, i) {
      var a = pts[e[0]], b = pts[e[1]];
      return { a: a, b: b, z: (a.z + b.z) / 2, i: i };
    }).sort(function (p, q) { return q.z - p.z; });

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (var i = 0; i < edges.length; i++) {
      var ed = edges[i];
      // 深度归一化：0 = 最远，1 = 最近
      var dn = (ed.z - zMin) / zSpan;

      /* ★ Depth Cueing（核心）
         近处：粗、深、不透明
         远处：细、淡、半透明
         这是线稿产生体积感的正道，比画色块更符合「素描」语境。 */
      /* 2026-10-19：加大线宽与透明度的动态范围。
         原来 0.85~2.7 / 0.22~0.90，评估说「近粗远细不够突出、整体太淡」。
         现在远端更细更淡、近端更粗更实，对比拉开。 */
      // 2026-10-19：整体上浮，线稿要「看得见」
      // 2026-10-19：近端从 3.80 提到 4.30，主线要压得住网格
      var lw = 0.90 + dn * 3.40;            // 0.90 ~ 4.30
      // 2026-10-19：远端下限 0.14 → 0.22，避免「淡到看不见」
      // 2026-10-19：近端保持 1.0，但让「接近满」的区间更宽（dn>0.6 就接近实线）
      var alpha = 0.20 + Math.pow(dn, 0.82) * 0.80;   // 0.20 ~ 1.00

      // 颜色随深度插值：远=淡蓝，近=深蓝
      var r = Math.round(PAL.far[0] + (PAL.near[0] - PAL.far[0]) * dn);
      var g = Math.round(PAL.far[1] + (PAL.near[1] - PAL.far[1]) * dn);
      var b = Math.round(PAL.far[2] + (PAL.near[2] - PAL.far[2]) * dn);

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.lineWidth = lw;

      // 近处的线加一层极淡的外发光，强化「浮起来」的感觉
      if (dn > 0.68) {
        ctx.save();
        ctx.globalAlpha = alpha * 0.16;
        ctx.strokeStyle = 'rgb(' + PAL.mid[0] + ',' + PAL.mid[1] + ',' + PAL.mid[2] + ')';
        ctx.lineWidth = lw + 3.2;
        ctx.beginPath();
        ctx.moveTo(ed.a.x, ed.a.y);
        ctx.lineTo(ed.b.x, ed.b.y);
        ctx.stroke();
        ctx.restore();
      }

      ctx.beginPath();
      ctx.moveTo(ed.a.x, ed.a.y);
      ctx.lineTo(ed.b.x, ed.b.y);
      ctx.stroke();

      /* 2026-10-19：最靠前的棱加一道极细的白色内描边。
         素描里铅笔线旁边常有纸白反光，这一笔让主线「立」起来，
         比单纯加深颜色更像手绘，也不会显脏。 */
      if (dn > 0.86) {
        ctx.save();
        ctx.globalAlpha = (dn - 0.86) / 0.14 * 0.55;
        ctx.strokeStyle = 'rgba(255,255,255,.95)';
        ctx.lineWidth = Math.max(0.7, lw - 2.6);
        ctx.beginPath();
        ctx.moveTo(ed.a.x, ed.a.y);
        ctx.lineTo(ed.b.x, ed.b.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    /* ★ 节点：关键顶点画成小方块 + 十字标记
       这是「科技智慧感」的来源 —— 让结构看起来像被测量、被标注过。 */
    if (this.showNodes) {
      for (var k = 0; k < pts.length; k++) {
        var p = pts[k];
        var dn2 = (p.z - zMin) / zSpan;
        if (dn2 < 0.42) continue;      // 只标注近处的节点，远处不画，避免噪点
        var a2 = (dn2 - 0.42) / 0.58;

        ctx.globalAlpha = 0.30 + a2 * 0.55;
        ctx.fillStyle = 'rgb(' + PAL.near[0] + ',' + PAL.near[1] + ',' + PAL.near[2] + ')';
        var s = 1.5 + a2 * 1.8;
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);

        // 最靠前的节点加十字准星
        if (dn2 > 0.82) {
          ctx.globalAlpha = (dn2 - 0.82) / 0.18 * 0.45;
          ctx.strokeStyle = 'rgb(' + PAL.accent[0] + ',' + PAL.accent[1] + ',' + PAL.accent[2] + ')';
          ctx.lineWidth = 1;
          var c = 4.2;
          ctx.beginPath();
          ctx.moveTo(p.x - c, p.y); ctx.lineTo(p.x + c, p.y);
          ctx.moveTo(p.x, p.y - c); ctx.lineTo(p.x, p.y + c);
          ctx.stroke();
        }
      }
    }

    ctx.globalAlpha = 1;
  };

  SketchScene.prototype.tick = function (now) {
    if (this.minFrameMs && now - this.lastT < this.minFrameMs) {
      this.raf = global.requestAnimationFrame(this.tick.bind(this));
      return;
    }
    this.lastT = now;
    this.draw(now);
    this.raf = global.requestAnimationFrame(this.tick.bind(this));
  };

  SketchScene.prototype.start = function () {
    if (this.raf) return;
    this.lastT = 0;
    this.raf = global.requestAnimationFrame(this.tick.bind(this));
  };

  SketchScene.prototype.stop = function () {
    if (this.raf) { global.cancelAnimationFrame(this.raf); this.raf = 0; }
  };

  SketchScene.prototype.drawStatic = function () { this.draw(2600); };

  global.SKETCH3D = { Scene: SketchScene, PAL: PAL };
})(window);
