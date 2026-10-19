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
      ctx.lineWidth = 0.7 + near * 1.5;
      ctx.globalAlpha = 0.42 + near * 0.58;

      // 白色衬底描边：深色封面上蓝线会糊掉，先描一层白再描蓝，
      // 相当于给线框加「描边高光」，深浅底都能看清（成本很低，
      // 只在卡片小图标上开，首屏大图不开）。
      if (this.underlay) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, .85)';
        ctx.lineWidth = (0.7 + near * 1.5) + 1.6;
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
    rotY: rotY, rotX: rotX, rotZ: rotZ
  };
})(window);
