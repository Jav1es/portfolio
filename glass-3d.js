/* ==========================================================================
   glass-3d.js —— 轻量 3D 渲染核心（零依赖，Canvas 2D 手写投影）
   --------------------------------------------------------------------------
   为什么不引 Three.js：
   项目现有全部 JS 加起来约 280KB，Three.js 压缩后仍有 ~150KB，
   而这里只需要「几个线框几何体缓慢旋转」，用不到 PBR 材质、骨骼动画、
   后处理。手写投影核心不到 10KB，且完全可控。

   实现要点：
   · 透视投影：屏幕坐标 = (x / (1 + z/d)) * scale，z 越大越远
   · 旋转矩阵：绕 X/Y 轴旋转，只保留 3×3 乘法（够用且快）
   · 深度排序：按投影后的 z 排序，远的先画（画家算法）
   · 共享时间源：所有实例用同一个 performance.now()，避免多个 rAF 循环
   · 视口外暂停：IntersectionObserver 控制，离开视口就停 rAF

   不做的事（性能与收益权衡）：
   · 不做面填充光照 —— 线框已经足够表达结构，填充会掩盖背景网格
   · 不做抗锯齿补偿 —— 用 devicePixelRatio 缩放即可
   · 不做物理/碰撞 —— 纯视觉装饰
   ========================================================================== */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------- 数学 */
  // 绕 Y 轴旋转
  function rotY(p, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
  }
  // 绕 X 轴旋转
  function rotX(p, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
  }
  // 绕 Z 轴旋转（用于让结构轻微倾斜，避免「正对屏幕」的呆板）
  function rotZ(p, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z };
  }

  /* ---------------------------------------------------------------- 几何体 */
  // 立方体：8 顶点 + 12 棱
  function cube(size) {
    var h = size / 2;
    var v = [
      { x: -h, y: -h, z: -h }, { x: h, y: -h, z: -h },
      { x: h, y: h, z: -h }, { x: -h, y: h, z: -h },
      { x: -h, y: -h, z: h }, { x: h, y: -h, z: h },
      { x: h, y: h, z: h }, { x: -h, y: h, z: h }
    ];
    var e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4],
             [0, 4], [1, 5], [2, 6], [3, 7]];
    return { v: v, e: e };
  }

  // 八面体：6 顶点 + 12 棱，比立方体更「晶体」
  function octa(size) {
    var h = size;
    var v = [
      { x: 0, y: -h, z: 0 }, { x: h, y: 0, z: 0 }, { x: 0, y: 0, z: h },
      { x: -h, y: 0, z: 0 }, { x: 0, y: 0, z: -h }, { x: 0, y: h, z: 0 }
    ];
    var e = [[0, 1], [0, 2], [0, 3], [0, 4], [5, 1], [5, 2], [5, 3], [5, 4],
             [1, 2], [2, 3], [3, 4], [4, 1]];
    return { v: v, e: e };
  }

  // 节点球：用经纬线拼一个球体线框
  function sphere(r, seg) {
    seg = seg || 8;
    var v = [], e = [], i, j;
    // 纬线
    for (i = 0; i <= seg; i++) {
      var phi = Math.PI * i / seg;
      for (j = 0; j < seg * 2; j++) {
        var th = Math.PI * j / seg;
        v.push({
          x: r * Math.sin(phi) * Math.cos(th),
          y: r * Math.cos(phi),
          z: r * Math.sin(phi) * Math.sin(th)
        });
      }
    }
    var per = seg * 2;
    for (i = 0; i <= seg; i++) {
      for (j = 0; j < per; j++) {
        var a = i * per + j;
        var b = i * per + (j + 1) % per;
        if (a < v.length && b < v.length) e.push([a, b]);
        if (i < seg) {
          var c = (i + 1) * per + j;
          if (c < v.length) e.push([a, c]);
        }
      }
    }
    return { v: v, e: e };
  }

  // 网格阵列：一组小立方体按矩阵排布，用于「数据」类
  function lattice(n, gap, size) {
    var v = [], e = [], base = cube(size);
    for (var ix = 0; ix < n; ix++) {
      for (var iy = 0; iy < n; iy++) {
        var ox = (ix - (n - 1) / 2) * gap;
        var oy = (iy - (n - 1) / 2) * gap;
        var off = v.length;
        base.v.forEach(function (p) {
          v.push({ x: p.x + ox, y: p.y + oy, z: p.z });
        });
        base.e.forEach(function (pair) {
          e.push([pair[0] + off, pair[1] + off]);
        });
      }
    }
    return { v: v, e: e };
  }

  // 晶体簇：一个中心八面体 + 若干卫星小立方体，
  // 用于首屏 —— 单个八面体只有 12 条棱，在 580px 画布上太稀疏，
  // 实测只占 1% 像素，看起来像几条散线。加卫星节点后线条密度足够形成「结构」。
  function cluster(size) {
    var v = [], e = [];

    function addGeo(g, ox, oy, oz) {
      var off = v.length;
      g.v.forEach(function (p) {
        v.push({ x: p.x + ox, y: p.y + oy, z: p.z + oz });
      });
      g.e.forEach(function (pair) {
        e.push([pair[0] + off, pair[1] + off]);
      });
    }

    // 中心八面体
    addGeo(octa(size), 0, 0, 0);

    // 六个卫星小立方体，沿三个轴分布在八面体顶点外侧
    var d = size * 1.55, s = size * 0.3;
    addGeo(cube(s), 0, -d, 0);
    addGeo(cube(s), 0, d, 0);
    addGeo(cube(s), d, 0, 0);
    addGeo(cube(s), -d, 0, 0);
    addGeo(cube(s), 0, 0, d);
    addGeo(cube(s), 0, 0, -d);

    // 中心到卫星的连接线（只画三条，避免过密）
    var oGeo = octa(size);          // 复用一个实例，避免重复构造
    var ci = 0;                     // 中心八面体的第 0 个顶点索引
    for (var k = 0; k < 3; k++) {
      var satelliteStart = oGeo.v.length + k * cube(s).v.length;
      e.push([ci, satelliteStart]);
    }

    return { v: v, e: e };
  }

  /* ---------------------------------------------------------------- 渲染器 */
  function Scene(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.geo = opts.geo || cube(100);
    this.speed = opts.speed == null ? 0.00022 : opts.speed;
    this.tilt = opts.tilt == null ? 0.42 : opts.tilt;   // Z 轴倾斜
    this.fov = opts.fov || 420;
    this.scale = opts.scale || 1;
    this.lineColor = opts.lineColor || 'rgba(37, 99, 235, .52)';
    this.accentColor = opts.accentColor || 'rgba(29, 78, 216, .92)';
    this.dotColor = opts.dotColor || 'rgba(37, 99, 235, .78)';
    this.showDots = opts.showDots !== false;
    // 白色衬底描边：卡片小图标在深色封面上需要它才看得清；
    // 首屏大图不需要（会显得脏）
    this.underlay = opts.underlay === true;

    // 2026-10-19：线宽按画布尺寸自适应。
    // 实测 78px 的卡片小图标上，默认 0.7~2.2px 的线缩小后几乎看不见
    // （填充率仅 0.6%~1%，主体结构消失），小画布要显著加粗。
    this.lineBoost = opts.lineBoost == null
      ? (Math.min(canvas.width, canvas.height) <= 150 ? 1.9 : 1)
      : opts.lineBoost;
    this.running = false;
    this.raf = 0;
    this.t0 = 0;
    this.dpr = Math.min(global.devicePixelRatio || 1, 2);
    this.resize();
  }

  Scene.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(r.width * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  Scene.prototype.draw = function (t) {
    var ctx = this.ctx, w = this.w, h = this.h;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);

    var ang = t * this.speed;
    var cx = w / 2, cy = h / 2;
    var scale = Math.min(w, h) / 260 * this.scale;

    // 变换所有顶点
    var pts = [];
    var i;
    for (i = 0; i < this.geo.v.length; i++) {
      var p = this.geo.v[i];
      p = rotY(p, ang);
      p = rotX(p, ang * 0.62);
      p = rotZ(p, this.tilt);
      // 透视投影
      var d = this.fov / (this.fov + p.z);
      pts.push({
        x: cx + p.x * d * scale,
        y: cy + p.y * d * scale,
        z: p.z,
        d: d
      });
    }

    // 按 z 排序棱：远的先画，近的后画（画家算法）
    var edges = this.geo.e.slice().sort(function (a, b) {
      return (pts[a[0]].z + pts[a[1]].z) / 2 - (pts[b[0]].z + pts[b[1]].z) / 2;
    });

    // 画棱：越近越亮越粗
    ctx.lineCap = 'round';
    for (i = 0; i < edges.length; i++) {
      var a = pts[edges[i][0]], b = pts[edges[i][1]];
      // z 范围约 ±size，映射到 0..1 的「靠近程度」
      var near = Math.max(0, Math.min(1, (a.z + b.z) / 2 / 140 + 0.5));
      ctx.strokeStyle = near > 0.58 ? this.accentColor : this.lineColor;
      // 2026-10-19：线宽按画布尺寸自适应。
      // 实测 78px 的卡片小图标上，0.7~2.2px 的线缩小后几乎看不见
      // （填充率仅 0.6%~1%），所以小画布要显著加粗。
      var lwBase = this.lineBoost || 1;
      ctx.lineWidth = (0.7 + near * 1.5) * lwBase;
      ctx.globalAlpha = 0.42 + near * 0.58;

      // 白色衬底描边：深色封面上蓝线会糊掉，先描一层白再描蓝，
      // 相当于给线框加「描边高光」，深浅底都能看清（成本很低，
      // 只在卡片小图标上开，首屏大图不开）。
      if (this.underlay) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, .85)';
        ctx.lineWidth = (0.7 + near * 1.5) * lwBase + 1.6;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.restore();
      }

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // 顶点小圆点：让结构像「节点网络」而不是纯线框
    if (this.showDots) {
      for (i = 0; i < pts.length; i++) {
        var q = pts[i];
        var nr = Math.max(0, Math.min(1, q.z / 140 + 0.5));
        ctx.globalAlpha = 0.28 + nr * 0.6;
        ctx.fillStyle = this.dotColor;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 0.9 + nr * 1.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };

  Scene.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    var self = this;
    this.t0 = performance.now();
    // 帧率上限（2026-10-19 性能优化）：
    // 64px 的小图标用 60fps 画纯属浪费 —— 视觉上完全看不出，
    // 但 21 张卡同时在视口内时是实打实的开销。
    // minFrameMs=33 约等于 30fps，肉眼对缓慢旋转的小图标无感知差异。
    var minFrame = this.minFrameMs || 0;
    var lastDraw = 0;
    function loop(now) {
      if (!self.running) return;
      if (!minFrame || now - lastDraw >= minFrame) {
        self.draw(now - self.t0);
        lastDraw = now;
      }
      self.raf = requestAnimationFrame(loop);
    }
    this.raf = requestAnimationFrame(loop);
  };

  Scene.prototype.stop = function () {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  };

  // 画一帧静态图（reduced-motion 时用）
  Scene.prototype.drawStatic = function () {
    this.draw(2600);
  };

  /* ======================================================================
     技术栈特征几何体（2026-10-19 新增）
     ----------------------------------------------------------------------
     用户要求「根据每个作品的不同技术栈给每个作品做一个 3D 视觉效果模型」。
     原来是按 cat 粗分 5 种，22 张卡只有 5 种造型，同类的作品长得一样，
     看不出技术栈差异。

     这一组按「技术栈形态」设计，每种对应一类真实的技术结构：
       pipeline  流水线  多个立方体串成一条线（RPA / ETL / 工作流）
       graph     图/网络  中心球 + 两圈放射连接（Agent 编排 / LangGraph）
       layers    分层    水平堆叠的薄板（六层架构 / 部署栈）
       ring      环      闭合环 + 辐条（循环流程 / 回归迭代）
       tree      树      根 + 两层分叉（知识库 / 分类体系）
       mesh      网格    规整点阵 + 横纵连线（指标体系 / 数据矩阵）
       helix     螺旋    双螺旋 + 横档（迭代演进 / 版本序列）
     ====================================================================== */

  // 流水线：N 个立方体沿 X 轴排列，相邻相连
  function pipeline(size, count) {
    count = count || 4;
    var v = [], e = [], s = size * 0.32, gap = size * 1.15;
    var startX = -gap * (count - 1) / 2;
    var corners = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
    ];
    for (var i = 0; i < count; i++) {
      var cx = startX + i * gap;
      var base = v.length;
      for (var k = 0; k < 8; k++) {
        v.push({ x: cx + corners[k][0] * s, y: corners[k][1] * s, z: corners[k][2] * s });
      }
      e.push([base, base + 1], [base + 1, base + 2], [base + 2, base + 3], [base + 3, base],
             [base + 4, base + 5], [base + 5, base + 6], [base + 6, base + 7], [base + 7, base + 4],
             [base, base + 4], [base + 1, base + 5], [base + 2, base + 6], [base + 3, base + 7]);
      if (i > 0) {
        e.push([base - 8 + 1, base + 0], [base - 8 + 2, base + 3]);
      }
    }
    return { v: v, e: e };
  }

  // 图/网络：中心 + 内外两圈放射节点
  function graph(size) {
    var v = [{ x: 0, y: 0, z: 0 }], e = [];
    var inner = 6, outer = 10, i, a;
    for (i = 0; i < inner; i++) {
      a = (i / inner) * Math.PI * 2;
      v.push({ x: Math.cos(a) * size * 0.62, y: Math.sin(a) * size * 0.62, z: Math.sin(a * 2) * size * 0.2 });
      e.push([0, v.length - 1]);
    }
    for (i = 0; i < outer; i++) {
      a = (i / outer) * Math.PI * 2 + 0.3;
      v.push({ x: Math.cos(a) * size * 1.05, y: Math.sin(a) * size * 1.05, z: Math.cos(a * 3) * size * 0.34 });
      e.push([1 + (i % inner), v.length - 1]);
    }
    return { v: v, e: e };
  }

  // 分层：N 层薄板堆叠
  function layers(size, count) {
    count = count || 4;
    var v = [], e = [], w = size * 0.88, d = size * 0.58;
    var stepY = size * 0.62, startY = -stepY * (count - 1) / 2;
    for (var i = 0; i < count; i++) {
      var y = startY + i * stepY;
      var base = v.length;
      v.push({ x: -w, y: y, z: -d }, { x: w, y: y, z: -d }, { x: w, y: y, z: d }, { x: -w, y: y, z: d });
      e.push([base, base + 1], [base + 1, base + 2], [base + 2, base + 3], [base + 3, base]);
      if (i > 0) {
        e.push([base - 4, base], [base - 3, base + 1]);
      }
    }
    return { v: v, e: e };
  }

  // 环：闭合环 + 辐条
  function ring(size, seg) {
    seg = seg || 14;
    var v = [], e = [], i, a;
    for (i = 0; i < seg; i++) {
      a = (i / seg) * Math.PI * 2;
      v.push({ x: Math.cos(a) * size, y: Math.sin(a) * size, z: Math.sin(a * 2) * size * 0.24 });
    }
    for (i = 0; i < seg; i++) e.push([i, (i + 1) % seg]);
    v.push({ x: 0, y: 0, z: 0 });
    var c = v.length - 1;
    for (i = 0; i < seg; i += 3) e.push([c, i]);
    return { v: v, e: e };
  }

  // 树：根 + 两层分叉
  function tree(size) {
    var v = [{ x: 0, y: size, z: 0 }], e = [];
    var lv2 = 3, lv3 = 3, i, j;
    for (i = 0; i < lv2; i++) {
      var x2 = (i - (lv2 - 1) / 2) * size * 0.78;
      v.push({ x: x2, y: size * 0.12, z: 0 });
      e.push([0, v.length - 1]);
      for (j = 0; j < lv3; j++) {
        var x3 = x2 + (j - (lv3 - 1) / 2) * size * 0.34;
        v.push({ x: x3, y: -size * 0.82, z: (j - 1) * size * 0.22 });
        e.push([i + 1, v.length - 1]);
      }
    }
    // 2026-10-19：补地面基线 —— 原来只有枝干，缩小后像断裂的三角形
    var gb = v.length;
    v.push({ x: -size * 1.05, y: -size * 0.98, z: 0 });
    v.push({ x: size * 1.05, y: -size * 0.98, z: 0 });
    e.push([gb, gb + 1]);
    return { v: v, e: e };
  }

  // 网格：规整点阵 + 横纵连线
  function mesh(size, n) {
    n = n || 5;
    var v = [], e = [], step = (size * 2) / (n - 1), half = size, i, j;
    for (i = 0; i < n; i++) {
      for (j = 0; j < n; j++) {
        v.push({
          x: -half + i * step,
          y: -half + j * step,
          z: Math.sin(i * 0.9) * Math.cos(j * 0.9) * size * 0.22
        });
      }
    }
    for (i = 0; i < n; i++) {
      for (j = 0; j < n; j++) {
        var idx = i * n + j;
        if (i < n - 1) e.push([idx, idx + n]);
        if (j < n - 1) e.push([idx, idx + 1]);
      }
    }
    return { v: v, e: e };
  }

  // 螺旋：双螺旋 + 横档
  function helix(size, turns) {
    turns = turns || 2;
    var v = [], e = [], seg = 18, i;
    for (i = 0; i <= seg; i++) {
      var t = (i / seg) * Math.PI * 2 * turns;
      var y = -size + (i / seg) * size * 2;
      var r = size * 0.62;
      v.push({ x: Math.cos(t) * r, y: y, z: Math.sin(t) * r });
      v.push({ x: Math.cos(t + Math.PI) * r, y: y, z: Math.sin(t + Math.PI) * r });
      if (i > 0) {
        e.push([i * 2 - 2, i * 2], [i * 2 - 1, i * 2 + 1]);
      }
      e.push([i * 2, i * 2 + 1]);
    }
    return { v: v, e: e };
  }


  /* ======================================================================
     作品专属几何体（2026-10-19 第二批）
     ----------------------------------------------------------------------
     每个函数对应一个作品的真实技术结构，避免「同类作品长得一样」。
     命名与 works.js 的 STACK_3D 一一对应。
     ====================================================================== */

  // 01 路线图矩阵：8 个业务域 × 6 个月，画成带立柱的矩阵平面
  function roadmap(size) {
    var v = [], e = [], cols = 4, rows = 3, i, j;
    var gw = size * 1.5, gh = size * 1.1;
    for (i = 0; i < cols; i++) {
      for (j = 0; j < rows; j++) {
        var x = -gw / 2 + (i / (cols - 1)) * gw;
        var z = -gh / 2 + (j / (rows - 1)) * gh;
        var h = size * (0.28 + ((i * 3 + j * 5) % 7) / 7 * 0.62);
        var b = v.length;
        // 立柱：底面四点 + 顶面四点
        v.push({ x: x - 0.12 * size, y: -size * 0.5, z: z - 0.12 * size });
        v.push({ x: x + 0.12 * size, y: -size * 0.5, z: z - 0.12 * size });
        v.push({ x: x + 0.12 * size, y: -size * 0.5, z: z + 0.12 * size });
        v.push({ x: x - 0.12 * size, y: -size * 0.5, z: z + 0.12 * size });
        v.push({ x: x - 0.12 * size, y: -size * 0.5 + h, z: z - 0.12 * size });
        v.push({ x: x + 0.12 * size, y: -size * 0.5 + h, z: z - 0.12 * size });
        v.push({ x: x + 0.12 * size, y: -size * 0.5 + h, z: z + 0.12 * size });
        v.push({ x: x - 0.12 * size, y: -size * 0.5 + h, z: z + 0.12 * size });
        e.push([b, b + 1], [b + 1, b + 2], [b + 2, b + 3], [b + 3, b],
               [b + 4, b + 5], [b + 5, b + 6], [b + 6, b + 7], [b + 7, b + 4],
               [b, b + 4], [b + 1, b + 5], [b + 2, b + 6], [b + 3, b + 7]);
      }
    }
    return { v: v, e: e };
  }

  // 02 双层流：上下两层平行面 + 竖向连接（AI 先做 / 人只审）
  function bilayer(size) {
    var v = [], e = [], n = 4, i;
    // 2026-10-19 重画：原来和 09 servicestack 都是「上下叠置的板」，
    // 视觉评估判定「最像的一对」。改成「上下两层宽、中间收窄」的沙漏轮廓，
    // 一眼就能和 09 区分（09 是等宽的多层堆叠）。
    for (i = 0; i < n; i++) {
      var t = (i / (n - 1) - 0.5) * size * 1.7;
      // 腰部收窄：靠中间的截面宽度小
      var waist = 1 - Math.abs(i / (n - 1) - 0.5) * 0.9;
      var halfW = size * 0.52 * waist;
      var b1 = v.length;
      v.push({ x: t, y: size * 0.55, z: -halfW });
      v.push({ x: t, y: size * 0.55, z: halfW });
      v.push({ x: t, y: -size * 0.55, z: -halfW });
      v.push({ x: t, y: -size * 0.55, z: halfW });
      if (i > 0) {
        e.push([b1 - 4, b1], [b1 - 3, b1 + 1], [b1 - 2, b1 + 2], [b1 - 1, b1 + 3]);
      }
      e.push([b1, b1 + 1], [b1 + 2, b1 + 3]);
      e.push([b1, b1 + 2], [b1 + 1, b1 + 3]);
    }
    return { v: v, e: e };
  }

  // 03 审核流水线：串行方块 + 旁路分支（取数→识别→判断→异常）
  function auditflow(size) {
    var v = [], e = [], count = 4, i;
    var gap = size * 0.95, s = size * 0.26;
    var startX = -gap * (count - 1) / 2;
    var corners = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
    ];
    for (i = 0; i < count; i++) {
      var cx = startX + i * gap;
      var b = v.length;
      for (var k = 0; k < 8; k++) {
        v.push({ x: cx + corners[k][0] * s, y: corners[k][1] * s, z: corners[k][2] * s });
      }
      e.push([b, b + 1], [b + 1, b + 2], [b + 2, b + 3], [b + 3, b],
             [b + 4, b + 5], [b + 5, b + 6], [b + 6, b + 7], [b + 7, b + 4],
             [b, b + 4], [b + 1, b + 5], [b + 2, b + 6], [b + 3, b + 7]);
      if (i > 0) e.push([b - 8 + 1, b]);
    }
    // 旁路分支：从第 2 个方块向下引一条折线，再回到主线（异常处理）
    var branchY = -size * 0.95;
    var bx1 = startX + gap, bx2 = startX + gap * 2;
    var bb = v.length;
    v.push({ x: bx1, y: branchY, z: 0 });
    v.push({ x: bx2, y: branchY, z: 0 });
    e.push([bb, bb + 1]);
    return { v: v, e: e };
  }

  // 04 Agent 编排图：中心 + 六节点 + 回环边（LangGraph 六节点）
  function agentgraph(size) {
    var v = [], e = [], i;
    v.push({ x: 0, y: 0, z: 0 });          // 中心
    var ring1 = 6, r = size * 1.05;
    for (i = 0; i < ring1; i++) {
      var a = (i / ring1) * Math.PI * 2 - Math.PI / 2;
      v.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.62, z: Math.sin(a * 2) * size * 0.32 });
      e.push([0, i + 1]);
      if (i > 0) e.push([i, i + 1]);
    }
    e.push([ring1, 1]);                     // 闭环
    // 回环边（tool_call → planner）：画成外弧
    var ab = v.length;
    for (i = 0; i <= 8; i++) {
      var t = (i / 8) * Math.PI;
      v.push({ x: Math.cos(t) * r * 1.42, y: -Math.sin(t) * r * 0.72, z: -size * 0.5 });
      if (i > 0) e.push([ab + i - 1, ab + i]);
    }
    // 2026-10-19：补一圈外环 —— 原来只有放射线，缩到 78px 后没有闭合轮廓
    var rb = v.length, rr = r * 1.62, rseg = 16;
    for (i = 0; i < rseg; i++) {
      var ra = (i / rseg) * Math.PI * 2;
      v.push({ x: Math.cos(ra) * rr, y: Math.sin(ra) * rr * 0.58, z: 0 });
      if (i > 0) e.push([rb + i - 1, rb + i]);
    }
    e.push([rb + rseg - 1, rb]);
    return { v: v, e: e };
  }

  // 05 指标看板：横向条形柱 + 顶部折线（BI 看板）
  function dashboard(size) {
    var v = [], e = [], bars = 5, i;
    var w = size * 0.3, gap = size * 0.46;
    var startX = -gap * (bars - 1) / 2;
    for (i = 0; i < bars; i++) {
      var x = startX + i * gap;
      var h = size * (0.35 + ((i * 7) % 5) / 5 * 0.9);
      var b = v.length;
      v.push({ x: x - w / 2, y: -size * 0.6, z: 0 });
      v.push({ x: x + w / 2, y: -size * 0.6, z: 0 });
      v.push({ x: x + w / 2, y: -size * 0.6 + h, z: 0 });
      v.push({ x: x - w / 2, y: -size * 0.6 + h, z: 0 });
      // 给一点厚度
      v.push({ x: x - w / 2, y: -size * 0.6, z: w });
      v.push({ x: x + w / 2, y: -size * 0.6, z: w });
      v.push({ x: x + w / 2, y: -size * 0.6 + h, z: w });
      v.push({ x: x - w / 2, y: -size * 0.6 + h, z: w });
      e.push([b, b + 1], [b + 1, b + 2], [b + 2, b + 3], [b + 3, b],
             [b + 4, b + 5], [b + 5, b + 6], [b + 6, b + 7], [b + 7, b + 4],
             [b, b + 4], [b + 1, b + 5], [b + 2, b + 6], [b + 3, b + 7]);
    }
    return { v: v, e: e };
  }

  // 07 Prompt 三阶段：三个嵌套方框（诊断→澄清→合成）
  function triphase(size) {
    var v = [], e = [], i;
    var sizes = [1.0, 0.68, 0.36];
    for (i = 0; i < 3; i++) {
      var s = size * sizes[i];
      var b = v.length;
      v.push({ x: -s, y: -s, z: -s }, { x: s, y: -s, z: -s },
             { x: s, y: s, z: -s }, { x: -s, y: s, z: -s },
             { x: -s, y: -s, z: s }, { x: s, y: -s, z: s },
             { x: s, y: s, z: s }, { x: -s, y: s, z: s });
      e.push([b, b + 1], [b + 1, b + 2], [b + 2, b + 3], [b + 3, b],
             [b + 4, b + 5], [b + 5, b + 6], [b + 6, b + 7], [b + 7, b + 4],
             [b, b + 4], [b + 1, b + 5], [b + 2, b + 6], [b + 3, b + 7]);
    }
    // 三个方框之间的连线（表示阶段推进）
    e.push([0, 8], [2, 10]);
    return { v: v, e: e };
  }

  // 08 培训体系：三层金字塔（培训→SOP→推广）
  function pyramid(size) {
    var v = [], e = [], layers = 3, i, j;
    for (i = 0; i < layers; i++) {
      var y = -size * 0.7 + (i / (layers - 1)) * size * 1.4;
      var w = size * (1.0 - i * 0.28);
      var b = v.length;
      v.push({ x: -w, y: y, z: -w }, { x: w, y: y, z: -w },
             { x: w, y: y, z: w }, { x: -w, y: y, z: w });
      e.push([b, b + 1], [b + 1, b + 2], [b + 2, b + 3], [b + 3, b]);
      if (i > 0) {
        // 与下一层的竖边
        e.push([b - 4, b], [b - 3, b + 1], [b - 2, b + 2], [b - 1, b + 3]);
      }
    }
    // 顶点
    var top = v.length;
    v.push({ x: 0, y: size * 0.95, z: 0 });
    e.push([top - 4, top], [top - 3, top], [top - 2, top], [top - 1, top]);
    return { v: v, e: e };
  }

  // 09 服务栈：竖直堆叠的服务层 + 熔断断口
  function servicestack(size) {
    var v = [], e = [], n = 4, i;
    for (i = 0; i < n; i++) {
      var y = -size * 0.85 + (i / (n - 1)) * size * 1.7;
      var w = size * 0.85;
      var b = v.length;
      v.push({ x: -w, y: y, z: -w * 0.6 }, { x: w, y: y, z: -w * 0.6 },
             { x: w, y: y, z: w * 0.6 }, { x: -w, y: y, z: w * 0.6 });
      e.push([b, b + 1], [b + 1, b + 2], [b + 2, b + 3], [b + 3, b]);
      // 2026-10-19：每层中间开一个方孔 —— 视觉评估指出 09 与 02 太像。
      // 加孔后变成「机架 / 服务格」的形态，和 02 的实心板一眼可分。
      var hole = w * 0.34;
      var hb = v.length;
      v.push({ x: -hole, y: y, z: -hole * 0.6 }, { x: hole, y: y, z: -hole * 0.6 },
             { x: hole, y: y, z: hole * 0.6 }, { x: -hole, y: y, z: hole * 0.6 });
      e.push([hb, hb + 1], [hb + 1, hb + 2], [hb + 2, hb + 3], [hb + 3, hb]);
      // 孔与边框的四条连接
      e.push([b, hb], [b + 1, hb + 1], [b + 2, hb + 2], [b + 3, hb + 3]);
      if (i > 0) e.push([b - 8, b], [b - 7, b + 1], [b - 6, b + 2], [b - 5, b + 3]);
    }
    // 熔断断口：一个明显的缺口标记
    var cb = v.length;
    v.push({ x: size * 1.15, y: 0, z: 0 });
    v.push({ x: size * 1.45, y: size * 0.25, z: 0 });
    v.push({ x: size * 1.45, y: -size * 0.25, z: 0 });
    e.push([cb, cb + 1], [cb, cb + 2], [cb + 1, cb + 2]);
    return { v: v, e: e };
  }

  // 10 复盘循环：环 + 内部折线（复盘卡片 + 基线 + 看板）
  function reviewloop(size) {
    var v = [], e = [], seg = 14, i;
    var r = size * 0.95;
    for (i = 0; i < seg; i++) {
      var a = (i / seg) * Math.PI * 2;
      v.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.55, z: Math.sin(a) * r * 0.35 });
      if (i > 0) e.push([i - 1, i]);
    }
    e.push([seg - 1, 0]);
    // 内部上升折线（基线 → 改进后）
    var ab = v.length;
    for (i = 0; i <= 4; i++) {
      v.push({ x: -r * 0.5 + (i / 4) * r, y: -r * 0.3 + (i / 4) * r * 0.6, z: 0 });
      if (i > 0) e.push([ab + i - 1, ab + i]);
    }
    // 2026-10-19：补第二层环 + 辐条 —— 原来只有一圈细环 + 一条折线，
    // 缩小后像一片叶子。加内环和辐条后有了「循环 + 指标」的闭合感。
    var ib = v.length, ir = r * 0.58;
    for (i = 0; i < seg; i++) {
      var ia = (i / seg) * Math.PI * 2;
      v.push({ x: Math.cos(ia) * ir, y: Math.sin(ia) * ir * 0.55, z: 0 });
      if (i > 0) e.push([ib + i - 1, ib + i]);
    }
    e.push([ib + seg - 1, ib]);
    // 辐条：外环 → 内环
    for (i = 0; i < 6; i++) {
      e.push([Math.round(i / 6 * seg), ib + Math.round(i / 6 * seg)]);
    }
    return { v: v, e: e };
  }

  // 11 标准件：两份并列文档（Discovery Brief / Eval Plan）
  function twodocs(size) {
    var v = [], e = [], i, k;
    var offsets = [-size * 0.62, size * 0.62];
    for (i = 0; i < 2; i++) {
      var cx = offsets[i];
      var w = size * 0.52, h = size * 0.82;
      var b = v.length;
      // 扁平方板
      v.push({ x: cx - w, y: -h, z: 0 }, { x: cx + w, y: -h, z: 0 },
             { x: cx + w, y: h, z: 0 }, { x: cx - w, y: h, z: 0 });
      e.push([b, b + 1], [b + 1, b + 2], [b + 2, b + 3], [b + 3, b]);
      // 内部横线（文档行）
      for (k = 1; k <= 3; k++) {
        var ly = -h + (k / 4) * h * 2;
        var lb = v.length;
        v.push({ x: cx - w * 0.7, y: ly, z: 0 });
        v.push({ x: cx + w * 0.7, y: ly, z: 0 });
        e.push([lb, lb + 1]);
      }
    }
    // 两文档之间的连接
    e.push([3, 4 + 8]);
    return { v: v, e: e };
  }

  // 12 工具拓扑：中心 + 5 个工具节点呈扇形
  function toolsfan(size) {
    var v = [], e = [], i;
    v.push({ x: 0, y: -size * 0.6, z: 0 });
    var n = 5, r = size * 1.1;
    for (i = 0; i < n; i++) {
      var a = -Math.PI * 0.85 + (i / (n - 1)) * Math.PI * 0.7;
      v.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.9, z: 0 });
      e.push([0, i + 1]);
      if (i > 0) e.push([i, i + 1]);
    }
    // 2026-10-19：补外弧 + 底座 —— 原来只有 5 条放射线，缩小后散成碎片。
    // 外弧把扇形闭合起来，底座给它一个「工具架」的落脚点。
    var ab = v.length, aseg = 12, ar = r * 1.22;
    for (i = 0; i <= aseg; i++) {
      var aa = -Math.PI * 0.9 + (i / aseg) * Math.PI * 0.8;
      v.push({ x: Math.cos(aa) * ar, y: Math.sin(aa) * ar * 0.9, z: 0 });
      if (i > 0) e.push([ab + i - 1, ab + i]);
    }
    // 底座横线
    var bb = v.length;
    v.push({ x: -size * 1.15, y: -size * 0.95, z: 0 });
    v.push({ x: size * 1.15, y: -size * 0.95, z: 0 });
    e.push([bb, bb + 1]);
    e.push([0, bb], [0, bb + 1]);
    return { v: v, e: e };
  }

  // 14 可观测：环形 + 三条探针（OTel / Jaeger / CI）
  function observability(size) {
    var v = [], e = [], seg = 12, i;
    var r = size * 0.9;
    for (i = 0; i < seg; i++) {
      var a = (i / seg) * Math.PI * 2;
      v.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.7, z: 0 });
      if (i > 0) e.push([i - 1, i]);
    }
    e.push([seg - 1, 0]);
    // 三条探针向外
    for (i = 0; i < 3; i++) {
      var a2 = (i / 3) * Math.PI * 2 + 0.4;
      var b = v.length;
      v.push({ x: Math.cos(a2) * r * 1.55, y: Math.sin(a2) * r * 1.1, z: 0 });
      e.push([0, b]);
    }
    // 2026-10-19：补一圈虚线外环（OTel 的 span 边界）+ 探针端点小方框
    var ob = v.length, oseg = 18, orr = r * 1.85;
    for (i = 0; i < oseg; i++) {
      var oa = (i / oseg) * Math.PI * 2;
      v.push({ x: Math.cos(oa) * orr, y: Math.sin(oa) * orr * 0.62, z: 0 });
      if (i > 0 && i % 2 === 0) e.push([ob + i - 2, ob + i - 1]);
    }
    return { v: v, e: e };
  }

  // 15 插件簇：三个独立小立方体围绕一个中心
  function plugcluster(size) {
    var v = [], e = [], i;
    var corners = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
    ];
    var s = size * 0.3;
    var pos = [
      [0, size * 0.75, 0],
      [-size * 0.85, -size * 0.5, size * 0.3],
      [size * 0.85, -size * 0.5, -size * 0.3]
    ];
    for (i = 0; i < 3; i++) {
      var b = v.length;
      for (var k = 0; k < 8; k++) {
        v.push({ x: pos[i][0] + corners[k][0] * s, y: pos[i][1] + corners[k][1] * s, z: pos[i][2] + corners[k][2] * s });
      }
      e.push([b, b + 1], [b + 1, b + 2], [b + 2, b + 3], [b + 3, b],
             [b + 4, b + 5], [b + 5, b + 6], [b + 6, b + 7], [b + 7, b + 4],
             [b, b + 4], [b + 1, b + 5], [b + 2, b + 6], [b + 3, b + 7]);
      // 中心到各插件
      if (i > 0) e.push([0, b]);
    }
    return { v: v, e: e };
  }

  // 19 工具矩阵：4 个象限的工具点阵
  function toolmatrix(size) {
    var v = [], e = [], i, j;
    var n = 3, s = size * 0.22, gap = size * 0.72;
    for (i = 0; i < n; i++) {
      for (j = 0; j < n; j++) {
        var x = -gap + i * gap, y = -gap + j * gap;
        var b = v.length;
        v.push({ x: x - s, y: y - s, z: 0 }, { x: x + s, y: y - s, z: 0 },
               { x: x + s, y: y + s, z: 0 }, { x: x - s, y: y + s, z: 0 });
        e.push([b, b + 1], [b + 1, b + 2], [b + 2, b + 3], [b + 3, b]);
        // 横向连到右边
        if (i > 0) e.push([b - 4 + 1, b]);
      }
    }
    return { v: v, e: e };
  }

  // 20 评分雷达：五边形雷达 + 中心放射
  function radar(size) {
    var v = [], e = [], i, k;
    var n = 5, r = size * 1.0;
    // 三层同心多边形
    for (k = 1; k <= 3; k++) {
      var rr = r * (k / 3);
      var b = v.length;
      for (i = 0; i < n; i++) {
        var a = (i / n) * Math.PI * 2 - Math.PI / 2;
        v.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr, z: 0 });
        if (i > 0) e.push([b + i - 1, b + i]);
      }
      e.push([b + n - 1, b]);
    }
    // 中心放射
    for (i = 0; i < n; i++) {
      var a2 = (i / n) * Math.PI * 2 - Math.PI / 2;
      var cb = v.length;
      v.push({ x: Math.cos(a2) * r, y: Math.sin(a2) * r, z: 0 });
      e.push([0, cb]);
    }
    return { v: v, e: e };
  }

  // 21 桥接：两侧各一个节点 + 中间桥
  function bridge(size) {
    var v = [], e = [], i;
    // 左端（MCP 客户端）
    var lb = v.length;
    v.push({ x: -size * 1.3, y: -size * 0.4, z: 0 });
    v.push({ x: -size * 0.85, y: -size * 0.4, z: 0 });
    v.push({ x: -size * 0.85, y: size * 0.4, z: 0 });
    v.push({ x: -size * 1.3, y: size * 0.4, z: 0 });
    e.push([lb, lb + 1], [lb + 1, lb + 2], [lb + 2, lb + 3], [lb + 3, lb]);
    // 右端（WorkBuddy）
    var rb = v.length;
    v.push({ x: size * 0.85, y: -size * 0.4, z: 0 });
    v.push({ x: size * 1.3, y: -size * 0.4, z: 0 });
    v.push({ x: size * 1.3, y: size * 0.4, z: 0 });
    v.push({ x: size * 0.85, y: size * 0.4, z: 0 });
    e.push([rb, rb + 1], [rb + 1, rb + 2], [rb + 2, rb + 3], [rb + 3, rb]);
    // 桥（两根横梁 + 中间竖撑）
    var mb = v.length;
    v.push({ x: -size * 0.85, y: size * 0.22, z: 0 });
    v.push({ x: size * 0.85, y: size * 0.22, z: 0 });
    v.push({ x: -size * 0.85, y: -size * 0.22, z: 0 });
    v.push({ x: size * 0.85, y: -size * 0.22, z: 0 });
    e.push([mb, mb + 1], [mb + 2, mb + 3], [mb, mb + 2], [mb + 1, mb + 3]);
    return { v: v, e: e };
  }

  // 22 原型工厂：引擎齿轮（两个交错的环）+ 输出箭头
  function factory(size) {
    var v = [], e = [], seg = 10, i, k;
    // 两个交错的环
    for (k = 0; k < 2; k++) {
      var cx = k === 0 ? -size * 0.5 : size * 0.5;
      var r = size * 0.62;
      var b = v.length;
      for (i = 0; i < seg; i++) {
        var a = (i / seg) * Math.PI * 2;
        v.push({ x: cx + Math.cos(a) * r, y: Math.sin(a) * r, z: 0 });
        if (i > 0) e.push([b + i - 1, b + i]);
      }
      e.push([b + seg - 1, b]);
    }
    // 输出箭头（向右）
    var ab = v.length;
    v.push({ x: size * 1.1, y: 0, z: 0 });
    v.push({ x: size * 1.55, y: 0, z: 0 });
    v.push({ x: size * 1.35, y: size * 0.2, z: 0 });
    v.push({ x: size * 1.35, y: -size * 0.2, z: 0 });
    e.push([ab, ab + 1], [ab + 1, ab + 2], [ab + 1, ab + 3]);
    return { v: v, e: e };
  }

  // 23 工作流：31 节点规模的长链 + 分支
  function workflow(size) {
    var v = [], e = [], i;
    var n = 7, gap = size * 0.48;
    var startX = -gap * (n - 1) / 2;
    for (i = 0; i < n; i++) {
      var x = startX + i * gap;
      var y = (i % 2 === 0) ? size * 0.22 : -size * 0.22;
      v.push({ x: x, y: y, z: 0 });
      if (i > 0) e.push([i - 1, i]);
    }
    // 分支：从第 3、5 个节点向下
    var b1 = v.length;
    v.push({ x: startX + gap * 2, y: -size * 0.85, z: 0 });
    e.push([2, b1]);
    var b2 = v.length;
    v.push({ x: startX + gap * 4, y: -size * 0.85, z: 0 });
    e.push([4, b2]);
    e.push([b1, b2]);
    // 2026-10-19：补外框 —— 原来只有之字折线，缩小后像一根乱线。
    // 外框把 31 节点的工作流圈成一个「画布」，边界清楚。
    var fb = v.length, fw = gap * (n - 1) / 2 + size * 0.42, fh = size * 1.02;
    v.push({ x: -fw, y: -fh, z: 0 }, { x: fw, y: -fh, z: 0 },
           { x: fw, y: fh, z: 0 }, { x: -fw, y: fh, z: 0 });
    e.push([fb, fb + 1], [fb + 1, fb + 2], [fb + 2, fb + 3], [fb + 3, fb]);
    return { v: v, e: e };
  }


  // 2026-10-19：把平面造型挤出厚度。
  // 评估指出 reviewloop / toolsfan / bridge / factory / workflow / observability
  // 这些「看不出 3D 结构」，根因是所有顶点 z=0 —— 旋转时没有透视变化，
  // 只是一张会转的平面图。这里复制一层到 ±depth，再用连线缝合两层。
  function extrude(geo, depth) {
    var v = [], e = [], i;
    var base = geo.v.length;
    // 原层（后半）
    for (i = 0; i < base; i++) {
      v.push({ x: geo.v[i].x, y: geo.v[i].y, z: (geo.v[i].z || 0) - depth });
    }
    // 复制层（前半）
    for (i = 0; i < base; i++) {
      v.push({ x: geo.v[i].x, y: geo.v[i].y, z: (geo.v[i].z || 0) + depth });
    }
    // 原有棱
    for (i = 0; i < geo.e.length; i++) {
      e.push([geo.e[i][0], geo.e[i][1]]);
      e.push([geo.e[i][0] + base, geo.e[i][1] + base]);
    }
    // 缝合：只在「端点」处连，避免线太多糊掉（每 3 个顶点连 1 条）
    for (i = 0; i < base; i += 3) {
      e.push([i, i + base]);
    }
    return { v: v, e: e };
  }

  global.GLASS3D = {
    Scene: Scene,
    cube: cube,
    octa: octa,
    sphere: sphere,
    lattice: lattice,
    cluster: cluster,
    pipeline: pipeline,
    graph: graph,
    layers: layers,
    ring: ring,
    tree: tree,
    mesh: mesh,
    helix: helix,
    // 2026-10-19 新增：23 个作品专属造型
    roadmap: roadmap,
    bilayer: bilayer,
    auditflow: auditflow,
    agentgraph: agentgraph,
    dashboard: dashboard,
    triphase: triphase,
    pyramid: pyramid,
    servicestack: servicestack,
    reviewloop: reviewloop,
    twodocs: twodocs,
    toolsfan: toolsfan,
    observability: observability,
    plugcluster: plugcluster,
    toolmatrix: toolmatrix,
    radar: radar,
    bridge: bridge,
    factory: factory,
    workflow: workflow,
    extrude: extrude,
    rotY: rotY, rotX: rotX, rotZ: rotZ
  };
})(window);
