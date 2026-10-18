/* ==========================================================================
   glass-3d-init.js —— 把 3D 场景挂到页面元素上
   --------------------------------------------------------------------------
   职责分离：glass-3d.js 只做几何与绘制，这里负责
   · 找元素、建 Scene
   · IntersectionObserver 控制启停（视口外不烧 CPU）
   · prefers-reduced-motion 降级（画一帧静态图，不跑循环）
   · 页面隐藏（切标签页）时暂停

   为什么不在页面里直接写：
   5 个页面都要用，集中在初始化脚本里避免复制粘贴。
   ========================================================================== */
(function (global) {
  'use strict';

  if (!global.GLASS3D) return;

  var reduceMotion = global.matchMedia
    ? global.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  var scenes = [];

  // 几何体工厂：按 data-3d 属性选择
  // 2026-10-19 性能调优：sphere(62,7) 有 112 顶点 / 210 棱，是其他几何体的 3-6 倍，
  // 在 64px 小图标上完全看不出区别却要画 210 条线。
  // 降到 sphere(62,5) → 60 顶点 / 110 棱，视觉上仍是一个球。
  function makeGeo(kind) {
    switch (kind) {
      case 'octa': return GLASS3D.octa(64);
      case 'sphere': return GLASS3D.sphere(62, 5);
      case 'lattice': return GLASS3D.lattice(2, 46, 26);
      case 'cluster': return GLASS3D.cluster(58);
      case 'cube': default: return GLASS3D.cube(96);
    }
  }

  function initOne(el) {
    var canvas = el.tagName === 'CANVAS' ? el : el.querySelector('canvas');
    if (!canvas) return null;

    var kind = el.getAttribute('data-3d') || 'cube';
    var sc = new GLASS3D.Scene(canvas, {
      geo: makeGeo(kind),
      speed: parseFloat(el.getAttribute('data-speed')) || 0.00022,
      tilt: parseFloat(el.getAttribute('data-tilt')) || 0.42,
      scale: parseFloat(el.getAttribute('data-scale')) || 1,
      showDots: el.getAttribute('data-dots') !== 'false',
      // 卡片小图标开白色衬底，深色封面上才看得清
      underlay: el.getAttribute('data-underlay') === 'true'
    });

    // 小图标限帧：canvas 尺寸 ≤80px 时按 30fps 绘制。
    // 64px 的缓慢旋转图形，30fps 与 60fps 肉眼无差别，
    // 但 21 张卡同时在视口内时能省一半绘制开销。
    var cw = canvas.getBoundingClientRect().width;
    if (cw > 0 && cw <= 80) sc.minFrameMs = 33;

    scenes.push(sc);

    // reduced-motion：只画一帧，不启动循环
    if (reduceMotion) {
      sc.drawStatic();
      return sc;
    }

    if (!global.IntersectionObserver) {
      sc.start();
      return sc;
    }

    // 视口内才跑 rAF，离开立即停 —— 22 张卡的页面尤其需要
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) sc.start();
        else sc.stop();
      });
    }, { rootMargin: '120px 0px', threshold: 0 });

    io.observe(canvas);

    // 尺寸变化时重算画布（卡片展开、窗口缩放都会触发）
    if (global.ResizeObserver) {
      var ro = new ResizeObserver(function () {
        sc.resize();
        if (!sc.running && reduceMotion) sc.drawStatic();
      });
      ro.observe(canvas);
    }

    return sc;
  }

  function init(root) {
    var nodes = (root || document).querySelectorAll('[data-3d]');
    if (!nodes.length) return;
    Array.prototype.forEach.call(nodes, function (el) {
      if (el.__glass3d) return;          // 幂等：重复调用不重复创建
      el.__glass3d = initOne(el) || true;
    });
  }

  // 切到后台标签页时全部暂停，回来再恢复（省电、省 CPU）
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      scenes.forEach(function (s) { s.stop(); });
    } else if (!reduceMotion) {
      // 恢复时只重启仍在视口内的
      scenes.forEach(function (s) {
        var r = s.canvas.getBoundingClientRect();
        if (r.bottom > -120 && r.top < global.innerHeight + 120) s.start();
      });
    }
  });

  global.GLASS3D_INIT = { init: init, scenes: scenes };

  /* ==========================================================================
     交互式 3D 技术栈展示区（2026-10-19）
     --------------------------------------------------------------------------
     独立于上面的自动轮播：这里允许用户拖拽旋转，所以需要
     · 拖拽改变旋转角度（记录 dragX / dragY 偏移）
     · 键盘方向键微调（可访问性要求：鼠标不是唯一入口）
     · 重置按钮回到初始视角
     · 惯性：松手后继续缓慢滑行一小段，手感更自然

     语义化节点（视觉评估指出「抽象几何看不懂代表什么」）：
     用一组带名字的节点代替纯几何体 —— 每个节点是一个技术域，
     中心是 Agent 编排，外围是它依赖的东西。节点名直接画在 canvas 上，
     跟着旋转一起动，保持空间感。
     ========================================================================== */

  // 技术栈节点：x/y/z 是空间位置，label 是显示名，main 标记核心节点
  // 2026-10-19 调优：外围节点半径从 ~80 拉到 ~105，拉开间距避免标签打架
  // tone 是按类别分的克制冷色，用于区分「模型 / 数据 / 评测 / 部署 / 工具」
  var TECH_NODES = [
    { label: 'Agent 编排', x: 0, y: 0, z: 0, main: true, tone: '#1d4ed8' },
    { label: '大模型', x: 104, y: -62, z: 34, tone: '#2563eb' },
    { label: 'RAG / 知识库', x: -108, y: -52, z: 40, tone: '#7c3aed' },
    { label: '工具链 / MCP', x: 84, y: 70, z: -46, tone: '#0891b2' },
    { label: '评测与断言', x: -92, y: 74, z: -38, tone: '#059669' },
    { label: '数据管线', x: 8, y: -112, z: -62, tone: '#7c3aed' },
    { label: '部署与观测', x: -14, y: 118, z: 54, tone: '#d97706' }
  ];

  // 连线：从中心（0）连到每个外围节点
  var TECH_EDGES = [];
  for (var ni = 1; ni < TECH_NODES.length; ni++) TECH_EDGES.push([0, ni]);

  function initInteractive() {
    var canvas = document.getElementById('tech3d-canvas');
    if (!canvas || canvas.__interactive) return;
    canvas.__interactive = true;

    var resetBtn = document.getElementById('tech3d-reset');

    // 拖拽状态
    var dragging = false;
    var lastX = 0, lastY = 0;
    var rotX = 0, rotY = 0;          // 用户拖拽产生的额外角度
    var velX = 0, velY = 0;          // 惯性速度
    var baseTilt = 0.42;
    var autoRotate = true;           // 用户操作后暂停自动旋转
    var autoRotateTimer = 0;
    var hoverIdx = -1;               // 当前悬停的节点索引（-1 = 无）
    var mouseX = -9999, mouseY = -9999;
    var lastPts = [];                // 上一帧投影结果，供命中测试用

    var sc = new GLASS3D.Scene(canvas, {
      geo: { v: [], e: [] },          // 几何体由节点自己生成
      speed: 0,
      tilt: 0,
      scale: parseFloat(canvas.getAttribute('data-scale')) || 1.5,
      showDots: false
    });

    // 完整重写 draw：画节点 + 连线 + 标签
    sc.draw = function (t) {
      var ctx = sc.ctx, w = sc.w, h = sc.h;
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);

      // 惯性衰减
      if (!dragging) {
        rotY += velY;
        rotX += velX;
        velY *= 0.93;
        velX *= 0.93;
        if (Math.abs(velY) < 0.0005) velY = 0;
        if (Math.abs(velX) < 0.0005) velX = 0;
        // 停止操作 2.5 秒后恢复极慢自转
        if (autoRotate) rotY += 0.0016;
      }

      var ang = rotY;
      var cx = w / 2, cy = h / 2;
      // 舞台比首屏大，缩放系数单独算
      var scale = Math.min(w / 620, h / 460) * (sc.scale / 1.5);

      // 投影所有节点
      var pts = [];
      for (var i = 0; i < TECH_NODES.length; i++) {
        var n = TECH_NODES[i];
        var p = { x: n.x, y: n.y, z: n.z };
        p = GLASS3D.rotY(p, ang);
        p = GLASS3D.rotX(p, ang * 0.55 + rotX);
        p = GLASS3D.rotZ(p, baseTilt);
        var d = sc.fov / (sc.fov + p.z);
        pts.push({
          x: cx + p.x * d * scale,
          y: cy + p.y * d * scale,
          z: p.z,
          d: d,
          node: n
        });
      }

      // 连线：远的先画
      var edges = TECH_EDGES.slice().sort(function (a, b) {
        return (pts[a[0]].z + pts[a[1]].z) / 2 - (pts[b[0]].z + pts[b[1]].z) / 2;
      });

      // 命中测试：找鼠标最近且在半径内的节点（供悬停高亮用）
      lastPts = pts;
      hoverIdx = -1;
      if (mouseX > -9000) {
        var bestD = 34 * 34;         // 命中半径 34px，够宽容
        for (var hi = 0; hi < pts.length; hi++) {
          var hdx = pts[hi].x - mouseX, hdy = pts[hi].y - mouseY;
          var dd = hdx * hdx + hdy * hdy;
          if (dd < bestD) { bestD = dd; hoverIdx = hi; }
        }
      }

      ctx.lineCap = 'round';
      for (i = 0; i < edges.length; i++) {
        var a = pts[edges[i][0]], b = pts[edges[i][1]];
        var near = Math.max(0, Math.min(1, (a.z + b.z) / 2 / 120 + 0.5));
        // 悬停时：与该节点相连的线高亮，其余压暗
        var connected = hoverIdx >= 0 &&
          (edges[i][0] === hoverIdx || edges[i][1] === hoverIdx);
        if (hoverIdx >= 0 && !connected) {
          ctx.strokeStyle = 'rgba(148, 163, 184, .30)';
          ctx.lineWidth = 0.9;
          ctx.globalAlpha = 0.5;
        } else if (connected) {
          ctx.strokeStyle = pts[hoverIdx].node.tone || '#1d4ed8';
          ctx.lineWidth = 2.8;
          ctx.globalAlpha = 1;
        } else {
          ctx.strokeStyle = near > 0.55
            ? 'rgba(29, 78, 216, .72)'
            : 'rgba(37, 99, 235, .40)';
          ctx.lineWidth = 1.2 + near * 1.8;
          ctx.globalAlpha = 0.65 + near * 0.35;
        }
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // 节点：按 z 从远到近画（近的盖住远的）
      var order = pts.map(function (_, idx) { return idx; }).sort(function (a, b) {
        return pts[b].z - pts[a].z;
      });

      for (var k = 0; k < order.length; k++) {
        var idx = order[k];
        var q = pts[idx];
        var nd = q.node;
        var nr = Math.max(0, Math.min(1, q.z / 120 + 0.5));   // 0 远 1 近
        var isHover = (idx === hoverIdx);
        var rBase = (nd.main ? 7.5 : 4.6) * (0.72 + nr * 0.5);
        var r = isHover ? rBase * 1.55 : rBase;

        // 外圈光晕：核心节点始终有；悬停节点临时放大
        if (nd.main || isHover) {
          var g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, r * 4.2);
          var glow = nd.tone || '#2563eb';
          g.addColorStop(0, isHover ? 'rgba(37, 99, 235, .42)' : 'rgba(37, 99, 235, .30)');
          g.addColorStop(1, 'rgba(37, 99, 235, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(q.x, q.y, r * 4.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // 节点本体：用 tone 区分类别（模型蓝 / 数据紫 / 工具青 / 评测绿 / 部署橙）
        ctx.globalAlpha = 0.55 + nr * 0.45;
        ctx.fillStyle = isHover
          ? (nd.tone || '#2563eb')
          : (nr > 0.55 ? (nd.tone || '#2563eb') : '#93b4f0');
        ctx.beginPath();
        ctx.arc(q.x, q.y, r, 0, Math.PI * 2);
        ctx.fill();

        // 白边：让节点从背景里跳出来
        ctx.strokeStyle = 'rgba(255, 255, 255, .9)';
        ctx.lineWidth = isHover ? 2 : 1.2;
        ctx.stroke();

        // 标签
        ctx.globalAlpha = 0.78 + nr * 0.22;
        ctx.font = (nd.main ? '700 ' : '600 ') + (nd.main ? 16 : 14) + 'px ' +
          '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // 标签底：一层更实的白，保证压在网格和连线上也读得清
        var tw = ctx.measureText(nd.label).width;
        var ty = q.y + r + 6;
        var lh = nd.main ? 19 : 17;
        var padX = 6, padY = 3;
        ctx.globalAlpha = (0.72 + nr * 0.28);
        ctx.fillStyle = 'rgba(255, 255, 255, .92)';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(q.x - tw / 2 - padX, ty - padY, tw + padX * 2, lh + padY * 2, 5);
        } else {
          ctx.rect(q.x - tw / 2 - padX, ty - padY, tw + padX * 2, lh + padY * 2);
        }
        ctx.fill();

        // 文字：颜色加深（评估指出外围标签偏浅）
        ctx.globalAlpha = 0.88 + nr * 0.12;
        ctx.fillStyle = nd.main ? '#0b1220' : '#1e293b';
        ctx.fillText(nd.label, q.x, ty);
      }
      ctx.globalAlpha = 1;
    };

    scenes.push(sc);

    // ---- 拖拽 ----
    function down(e) {
      dragging = true;
      canvas.classList.add('is-dragging');
      var pt = e.touches ? e.touches[0] : e;
      lastX = pt.clientX; lastY = pt.clientY;
      velX = velY = 0;
    }
    function move(e) {
      if (!dragging) return;
      var pt = e.touches ? e.touches[0] : e;
      var dx = pt.clientX - lastX;
      var dy = pt.clientY - lastY;
      lastX = pt.clientX; lastY = pt.clientY;
      rotY += dx * 0.006;
      rotX += dy * 0.004;
      // 记录速度用于松手后的惯性
      velY = dx * 0.006 * 0.35;
      velX = dy * 0.004 * 0.35;
      if (e.cancelable && e.touches) e.preventDefault();
    }
    function up() {
      dragging = false;
      canvas.classList.remove('is-dragging');
      // 松手后暂停自动旋转 2.5 秒，让用户看清自己转到的角度
      autoRotate = false;
      clearTimeout(autoRotateTimer);
      autoRotateTimer = setTimeout(function () { autoRotate = true; }, 2500);
    }

    canvas.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    canvas.addEventListener('touchstart', down, { passive: true });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', up);

    // ---- 悬停检测：记录鼠标在 canvas 内的坐标 ----
    canvas.addEventListener('mousemove', function (e) {
      var r = canvas.getBoundingClientRect();
      mouseX = e.clientX - r.left;
      mouseY = e.clientY - r.top;
    });
    canvas.addEventListener('mouseleave', function () {
      mouseX = -9999; mouseY = -9999;
      hoverIdx = -1;
    });

    // ---- 键盘（可访问性：不用鼠标也能转） ----
    canvas.addEventListener('keydown', function (e) {
      var step = 0.16;
      var handled = true;
      autoRotate = false;
      clearTimeout(autoRotateTimer);
      autoRotateTimer = setTimeout(function () { autoRotate = true; }, 2500);
      switch (e.key) {
        case 'ArrowLeft': rotY -= step; break;
        case 'ArrowRight': rotY += step; break;
        case 'ArrowUp': rotX -= step; break;
        case 'ArrowDown': rotX += step; break;
        case 'Home': rotX = 0; rotY = 0; break;
        default: handled = false;
      }
      if (handled) e.preventDefault();
    });

    // ---- 重置 ----
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        rotX = 0; rotY = 0; velX = 0; velY = 0;
        canvas.focus();
      });
    }

    // 尺寸变化重算
    if (global.ResizeObserver) {
      new ResizeObserver(function () { sc.resize(); }).observe(canvas);
    }

    // 懒启动：滚到附近才开 rAF
    if (!reduceMotion && global.IntersectionObserver) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) sc.start();
          else sc.stop();
        });
      }, { rootMargin: '200px 0px' });
      io.observe(canvas);
    } else if (reduceMotion) {
      sc.draw(0);
    } else {
      sc.start();
    }
  }

  // 首屏之外才初始化：用 IntersectionObserver 观察整个区块
  function lazyInitInteractive() {
    var stage = document.querySelector('.tech3d-stage');
    if (!stage) return;
    if (!global.IntersectionObserver) { initInteractive(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        initInteractive();
        io.disconnect();
      });
    }, { rootMargin: '300px 0px' });
    io.observe(stage);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init(document);
      lazyInitInteractive();
    });
  } else {
    init(document);
    lazyInitInteractive();
  }
})(window);
