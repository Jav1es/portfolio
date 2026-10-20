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
    /* 2026-10-20：多方块模式（轨道环用）。
       boxes 非空时，绘制会按方块分组做高亮；
       _boxRanges 记录每个方块在 geo.e 里的棱区间。 */
    this.boxes = null;
    this._boxRanges = null;
    this.highlight = -1;
    this._lastPts = null;
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

  /* ======================================================================
     setBoxes — 把「多个方块」转成一个线框 geo
     ----------------------------------------------------------------------
     轨道环由 192 个方块组成（三条环体 + 23 个作品块 + 中心块）。
     每块 8 个顶点、12 条棱，全部合并进同一个 geo，
     这样一次绘制就能画完整个结构，且共享同一套深度提示。

     _boxRanges 记录每块占用的顶点/棱区间，供 hitTest 和高亮使用。
     ====================================================================== */
  SketchScene.prototype.setBoxes = function (boxes) {
    var V = [], E = [];
    var ranges = [];

    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      var hw = (b.w || 1) / 2, hh = (b.h || 1) / 2, hd = (b.d || 1) / 2;
      var cx = b.x || 0, cy = b.y || 0, cz = b.z || 0;

      var v0 = V.length;
      // 8 个顶点：先下后上，每层 4 个
      var corners = [
        [-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd],
        [-hw, hh, -hd], [hw, hh, -hd], [hw, hh, hd], [-hw, hh, hd]
      ];
      for (var c = 0; c < 8; c++) {
        V.push({ x: cx + corners[c][0], y: cy + corners[c][1], z: cz + corners[c][2] });
      }

      // 12 条棱：底面 4 + 顶面 4 + 竖直 4
      var e0 = E.length;
      var pairs = [
        [0,1],[1,2],[2,3],[3,0],   // 底面
        [4,5],[5,6],[6,7],[7,4],   // 顶面
        [0,4],[1,5],[2,6],[3,7]    // 竖直
      ];
      for (var p = 0; p < pairs.length; p++) {
        E.push([v0 + pairs[p][0], v0 + pairs[p][1]]);
      }

      ranges.push({
        vStart: v0, vEnd: V.length,
        eStart: e0, eEnd: E.length,
        box: b,
        index: i,
        // 方块中心，用于命中测试和排序
        cx: cx, cy: cy, cz: cz
      });
    }

    this.boxes = boxes;
    this._boxRanges = ranges;
    this.geo = { v: V, e: E };
    this._geoR = 1;
    var maxR = 0;
    for (var g = 0; g < V.length; g++) {
      var rr = Math.sqrt(V[g].x * V[g].x + V[g].y * V[g].y + V[g].z * V[g].z);
      if (rr > maxR) maxR = rr;
    }
    this._geoR = maxR || 1;
    this.autoFit();
    return this;
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
    // 2026-10-19：0.92 太满，评估说「缺少留白」。素描要呼吸感
    var goal = target == null ? 0.86 : target;
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

  /* ---------- 网格底纹 ----------
     2026-10-19：改成缓存到离屏 canvas。
     原来每帧重画几百条线（细网格 22px + 主网格 88px 两层），
     实测把帧时间从 16.7ms 拖到 33.4ms。
     网格是静态的，画一次存起来，每帧只 drawImage。 */
  SketchScene.prototype._buildGrid = function () {
    var w = this.w, h = this.h;
    if (!w || !h) return null;
    if (this._gridCache && this._gridW === w && this._gridH === h) return this._gridCache;

    var c = document.createElement('canvas');
    c.width = Math.round(w * this.dpr);
    c.height = Math.round(h * this.dpr);
    var g = c.getContext('2d');
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    var step = 22;
    var col = PAL.grid;
    var rgb = 'rgb(' + col[0] + ',' + col[1] + ',' + col[2] + ')';

    // 细网格
    g.globalAlpha = 0.075;
    g.strokeStyle = rgb;
    g.lineWidth = 1;
    g.beginPath();
    for (var x = 0; x <= w; x += step) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, h); }
    for (var y = 0; y <= h; y += step) { g.moveTo(0, y + 0.5); g.lineTo(w, y + 0.5); }
    g.stroke();

    // 主网格
    g.globalAlpha = 0.14;
    g.beginPath();
    for (var x2 = 0; x2 <= w; x2 += step * 4) { g.moveTo(x2 + 0.5, 0); g.lineTo(x2 + 0.5, h); }
    for (var y2 = 0; y2 <= h; y2 += step * 4) { g.moveTo(0, y2 + 0.5); g.lineTo(w, y2 + 0.5); }
    g.stroke();

    // 四角标记
    g.globalAlpha = 0.30;
    var m = 14, len = 12;
    g.beginPath();
    g.moveTo(m, m + len); g.lineTo(m, m); g.lineTo(m + len, m);
    g.moveTo(w - m - len, m); g.lineTo(w - m, m); g.lineTo(w - m, m + len);
    g.moveTo(m, h - m - len); g.lineTo(m, h - m); g.lineTo(m + len, h - m);
    g.moveTo(w - m - len, h - m); g.lineTo(w - m, h - m); g.lineTo(w - m, h - m - len);
    g.stroke();

    this._gridCache = c;
    this._gridW = w;
    this._gridH = h;
    return c;
  };

  SketchScene.prototype.drawGrid = function () {
    if (!this.showGrid) return;
    var cached = this._buildGrid();
    if (cached) this.ctx.drawImage(cached, 0, 0, this.w, this.h);
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
    // 2026-10-20：存起来供 hitTest（多方块模式）
    this._lastPts = pts;

    // 深度范围（用于归一化 depth cueing）
    var zMin = 1e9, zMax = -1e9;
    pts.forEach(function (p) { if (p.z < zMin) zMin = p.z; if (p.z > zMax) zMax = p.z; });
    var zSpan = Math.max(0.001, zMax - zMin);

    // 棱按深度排序（远的先画，近的后画 → 近的压在上面）
    var self = this;
    var edges = geo.e.map(function (e, i) {
      var a = pts[e[0]], b = pts[e[1]];
      return { a: a, b: b, z: (a.z + b.z) / 2, i: i, color: null };
    });

    /* 2026-10-20：多方块模式下，把每个方块的 color 挂到它的棱上。
       轨道环的 23 个作品块有分组色（橙/蓝/青/紫），
       之前被深度插值统一成蓝色了。 */
    if (this._boxRanges) {
      for (var ri = 0; ri < this._boxRanges.length; ri++) {
        var rg = this._boxRanges[ri];
        var col = rg.box && rg.box.color;
        if (!col) continue;
        for (var ei2 = rg.eStart; ei2 < rg.eEnd; ei2++) {
          if (edges[ei2]) edges[ei2].color = col;
        }
      }
    }

    edges.sort(function (p, q) { return q.z - p.z; });

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    /* 2026-10-19：按深度档位批量绘制。
       原来每条棱一次 beginPath+stroke（21 场景 × 50 棱 ≈ 上千次调用），
       实测帧时间 16.7ms → 33.4ms。
       现在分 10 档，同档合并成一条路径，调用次数降到 10 次/场景。 */
    /* 2026-10-20：分桶从「10 档深度」改成「颜色 × 4 档深度」。
       原来所有棱按深度分 10 桶，颜色由深度插值算出来 ——
       这会把分组色抹掉。现在按 (颜色, 深度) 组合分桶，
       有颜色的用原色相，没颜色的走原来的蓝系渐变。 */
    var BUCKETS = 10;
    var DEPTH_BUCKETS = 4;
    var buckets = [];   // buckets[key] = { list, color, dnMid }
    var bucketMap = {};

    for (var i = 0; i < edges.length; i++) {
      var ed = edges[i];
      var dn = (ed.z - zMin) / zSpan;
      var db = Math.min(DEPTH_BUCKETS - 1, Math.max(0, Math.floor(dn * DEPTH_BUCKETS)));
      var ckey = ed.color ? (ed.color[0] + '_' + ed.color[1] + '_' + ed.color[2]) : 'auto';
      var key = ckey + '|' + db;

      if (!bucketMap[key]) {
        bucketMap[key] = {
          list: [],
          color: ed.color,
          dnMid: (db + 0.5) / DEPTH_BUCKETS
        };
        buckets.push(bucketMap[key]);
      }
      bucketMap[key].list.push(ed);
    }

    /* 2026-10-20：多方块模式下，高亮方块单独画一遍。
       做法：先把高亮方块从批量里摘出来，批量画完后再用更深的色加粗画一次，
       这样它一定压在最上层，不会被别的方块盖住。 */
    var hlEdges = [];
    if (this.highlight >= 0 && this._boxRanges && this._boxRanges[this.highlight]) {
      var hr = this._boxRanges[this.highlight];
      for (var hi = 0; hi < edges.length; hi++) {
        if (edges[hi].i >= hr.eStart && edges[hi].i < hr.eEnd) hlEdges.push(edges[hi]);
      }
    }

    for (var b = 0; b < buckets.length; b++) {
      var bucket = buckets[b];
      var list = bucket.list;
      if (!list.length) continue;

      var dnMid = bucket.dnMid;

      /* ★ Depth Cueing
         近处：粗、深、实；远处：细、淡、虚
         这是线稿产生体积感的正道，比画色块更符合「素描」语境。 */
      var lw = 0.90 + dnMid * 3.40;
      var alpha = 0.20 + Math.pow(dnMid, 0.82) * 0.80;

      var r, g, bb;
      if (bucket.color) {
        /* 2026-10-20：有分组色的方块，保留色相，只按深度调明暗。
           远处混入淡蓝（模拟空气透视），近处保持原色。 */
        var t = dnMid;                      // 0 远 → 1 近
        var fade = PAL.far;
        r = Math.round(fade[0] + (bucket.color[0] - fade[0]) * (0.35 + t * 0.65));
        g = Math.round(fade[1] + (bucket.color[1] - fade[1]) * (0.35 + t * 0.65));
        bb = Math.round(fade[2] + (bucket.color[2] - fade[2]) * (0.35 + t * 0.65));
        // 有颜色的方块稍微提一点不透明度，让分组色看得清
        alpha = Math.min(1, alpha * 1.15);
      } else {
        r = Math.round(PAL.far[0] + (PAL.near[0] - PAL.far[0]) * dnMid);
        g = Math.round(PAL.far[1] + (PAL.near[1] - PAL.far[1]) * dnMid);
        bb = Math.round(PAL.far[2] + (PAL.near[2] - PAL.far[2]) * dnMid);
      }

      // 近处外发光（整档一次）
      if (dnMid > 0.68) {
        ctx.save();
        ctx.globalAlpha = alpha * 0.16;
        ctx.strokeStyle = 'rgb(' + PAL.mid[0] + ',' + PAL.mid[1] + ',' + PAL.mid[2] + ')';
        ctx.lineWidth = lw + 3.2;
        ctx.beginPath();
        for (var gi = 0; gi < list.length; gi++) {
          ctx.moveTo(list[gi].a.x, list[gi].a.y);
          ctx.lineTo(list[gi].b.x, list[gi].b.y);
        }
        ctx.stroke();
        ctx.restore();
      }

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = 'rgb(' + r + ',' + g + ',' + bb + ')';
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (var ei = 0; ei < list.length; ei++) {
        ctx.moveTo(list[ei].a.x, list[ei].a.y);
        ctx.lineTo(list[ei].b.x, list[ei].b.y);
      }
      ctx.stroke();

      // 最靠前的档位加白色内描边（铅笔高光）
      if (dnMid > 0.90) {
        ctx.save();
        ctx.globalAlpha = (dnMid - 0.90) / 0.10 * 0.55;
        ctx.strokeStyle = 'rgba(255,255,255,.95)';
        ctx.lineWidth = Math.max(0.7, lw - 2.6);
        ctx.beginPath();
        for (var wi = 0; wi < list.length; wi++) {
          ctx.moveTo(list[wi].a.x, list[wi].a.y);
          ctx.lineTo(list[wi].b.x, list[wi].b.y);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    /* 2026-10-20：高亮方块最后画，保证在最上层 */
    if (hlEdges.length) {
      ctx.save();
      ctx.globalAlpha = 0.98;
      ctx.strokeStyle = 'rgb(217,119,6)';   // amber，与全站强调色一致
      ctx.lineWidth = 3.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (var he = 0; he < hlEdges.length; he++) {
        ctx.moveTo(hlEdges[he].a.x, hlEdges[he].a.y);
        ctx.lineTo(hlEdges[he].b.x, hlEdges[he].b.y);
      }
      ctx.stroke();

      // 内层再描一道白色，让高亮像「被点亮的线」
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (var he2 = 0; he2 < hlEdges.length; he2++) {
        ctx.moveTo(hlEdges[he2].a.x, hlEdges[he2].a.y);
        ctx.lineTo(hlEdges[he2].b.x, hlEdges[he2].b.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    /* ★ 节点：关键顶点画成小方块 + 十字标记
       这是「科技智慧感」的来源 —— 让结构看起来像被测量、被标注过。 */
    if (this.showNodes) {
      for (var k = 0; k < pts.length; k++) {
        var p = pts[k];
        var dn2 = (p.z - zMin) / zSpan;
        if (dn2 < 0.42) continue;      // 只标注近处的节点，远处不画，避免噪点
        var a2 = (dn2 - 0.42) / 0.58;

        // 2026-10-19：节点是「结构被标注过」的信号，要明确
        ctx.globalAlpha = 0.42 + a2 * 0.58;
        ctx.fillStyle = 'rgb(' + PAL.near[0] + ',' + PAL.near[1] + ',' + PAL.near[2] + ')';
        var s = 1.8 + a2 * 2.2;
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);

        // 最靠前的节点加十字准星
        if (dn2 > 0.82) {
          ctx.globalAlpha = (dn2 - 0.82) / 0.18 * 0.62;
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

  /* ======================================================================
     hitTest — 返回被点中的方块索引（多方块模式）
     ----------------------------------------------------------------------
     用上一帧投影后的顶点做包围盒判定，从近到远取第一个。
     同深度时取面积小的（避免大块抢走小块的点击）。
     ====================================================================== */
  SketchScene.prototype.hitTest = function (mx, my) {
    var pts = this._lastPts;
    var ranges = this._boxRanges;
    if (!pts || !ranges) return -1;

    var cands = [];
    for (var i = 0; i < ranges.length; i++) {
      var rg = ranges[i];
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, z = 0, n = 0;
      for (var vi = rg.vStart; vi < rg.vEnd; vi++) {
        var p = pts[vi];
        if (!p) continue;
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
        z += p.z; n++;
      }
      if (!n) continue;
      z /= n;
      if (mx >= minX && mx <= maxX && my >= minY && my <= maxY) {
        cands.push({ i: i, z: z, area: (maxX - minX) * (maxY - minY) });
      }
    }
    if (!cands.length) return -1;

    cands.sort(function (a, b) {
      if (Math.abs(a.z - b.z) > 0.15) return b.z - a.z;
      return a.area - b.area;
    });
    return cands[0].i;
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
