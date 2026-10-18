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

  global.GLASS3D = {
    Scene: Scene,
    cube: cube,
    octa: octa,
    sphere: sphere,
    lattice: lattice,
    cluster: cluster,
    rotY: rotY, rotX: rotX, rotZ: rotZ
  };
})(window);
