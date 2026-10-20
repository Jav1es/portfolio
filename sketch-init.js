/* ==========================================================================
   sketch-init.js — 封面网格素描初始化（2026-10-19）
   --------------------------------------------------------------------------
   封面从实体方块（SOLID3D）切回线框（SKETCH3D）。
   用户明确偏好「网格素描草稿 / 科技智慧」的风格，不要实体色块。

   复用 glass-3d.js 里已有的 23 个线框几何体（每个作品一套），
   只是渲染方式换成带深度提示的素描风格。
   ========================================================================== */
(function (global) {
  'use strict';

  var reduce = global.matchMedia &&
    global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 模型名 → 几何体构造函数（与 glass-3d.js 的导出对应）
  function makeGeo(kind) {
    if (!global.GLASS3D) return null;
    var G = global.GLASS3D;
    switch (kind) {
      case 'roadmap': return G.roadmap(46);
      case 'bilayer': return G.bilayer(50);
      case 'auditflow': return G.auditflow(52);
      case 'agentgraph': return G.agentgraph(46);
      case 'dashboard': return G.dashboard(50);
      case 'pipeline': return G.pipeline(58, 4);
      case 'triphase': return G.triphase(46);
      case 'pyramid': return G.pyramid(50);
      case 'servicestack': return G.servicestack(48);
      case 'reviewloop': return G.extrude(G.reviewloop(42), 16);
      case 'twodocs': return G.twodocs(52);
      case 'toolsfan': return G.extrude(G.toolsfan(42), 16);
      case 'tree': return G.extrude(G.tree(42), 18);
      case 'observability': return G.extrude(G.observability(40), 16);
      case 'plugcluster': return G.plugcluster(50);
      case 'cluster': return G.cluster(58);
      case 'layers': return G.layers(52, 4);
      case 'helix': return G.helix(56, 2);
      case 'toolmatrix': return G.toolmatrix(42);
      case 'radar': return G.extrude(G.radar(46), 11);
      case 'bridge': return G.extrude(G.bridge(44), 15);
      case 'factory': return G.extrude(G.factory(40), 16);
      case 'workflow': return G.extrude(G.workflow(38), 14);
      case 'cube': default: return G.cube(96);
    }
  }

  function initOne(canvas) {
    if (canvas.__sketch || !global.SKETCH3D) return null;

    var kind = canvas.getAttribute('data-sketch-model') || canvas.getAttribute('data-3d') || 'cluster';
    var geo = makeGeo(kind);
    if (!geo || !geo.v.length) return null;

    var sc = new global.SKETCH3D.Scene(canvas, {
      geo: geo,
      rotY: -0.52,
      tilt: 0.32,
      speed: parseFloat(canvas.getAttribute('data-speed')) || 0.00016,
      grid: true,
      nodes: true,
      hidden: true
    });

    canvas.__sketch = sc;

    if (global.ResizeObserver) {
      if (canvas.__ro) canvas.__ro.disconnect();
      var ro = new ResizeObserver(function () {
        if (sc.resize()) sc.autoFit();
        if (!sc.raf) sc.drawStatic();
      });
      ro.observe(canvas);
      canvas.__ro = ro;
    }

    var cw = canvas.getBoundingClientRect().width;
    if (cw > 0 && cw <= 110) sc.minFrameMs = 33;

    if (reduce) { sc.drawStatic(); return sc; }

    if (sc.pendingSize) {
      global.requestAnimationFrame(function () {
        if (sc.resize()) sc.autoFit();
        if (!sc.raf) sc.drawStatic();
      });
    }
    sc.start();
    return sc;
  }

  function init(root) {
    var nodes = (root || document).querySelectorAll('canvas[data-sketch="true"]');
    if (!nodes.length) return;

    var vh = global.innerHeight || 800;
    var immediate = [], deferred = [];

    Array.prototype.forEach.call(nodes, function (el) {
      if (el.__sketch) return;
      var r = el.getBoundingClientRect();
      if (r.bottom > -60 && r.top < vh + 60) immediate.push(el);
      else deferred.push(el);
    });

    immediate.forEach(initOne);

    /* 2026-10-20：空闲时预建剩余场景（解决「加载慢」）。
       原来只有滚到视口才 initOne，快速滚动时新卡片会先空白一两帧。
       实测 makeGeo 只要 0.01ms、单帧绘制 0.065ms，预建成本极低，
       所以干脆在空闲时全部建好，只是不启动动画。 */
    function prebuild() {
      var i = 0;
      function chunk() {
        var t0 = Date.now();
        var built = 0;
        /* 每批最多建 3 个，或最多花 8ms —— 别让预建本身卡住滚动。
           注意用独立的 built 计数，不能用 i % 3 判断：
           i 可能因跳过已初始化的元素而连续自增，导致 break 条件错乱。 */
        while (i < deferred.length && built < 3 && Date.now() - t0 < 8) {
          var el = deferred[i++];
          if (el && !el.__sketch) { initOne(el); built++; }
        }
        if (i < deferred.length) {
          if (global.requestIdleCallback) {
            global.requestIdleCallback(chunk, { timeout: 400 });
          } else {
            setTimeout(chunk, 60);
          }
        }
      }
      if (global.requestIdleCallback) {
        global.requestIdleCallback(chunk, { timeout: 600 });
      } else {
        setTimeout(chunk, 120);
      }
    }

    if (!deferred.length) return;
    if (!global.IntersectionObserver) { deferred.forEach(initOne); return; }

    /* 2026-10-20：rootMargin 160px → 80px。
       works.html 卡片高约 220px，160px 意味着视口外 1.6 排都在跑动画。
       80px 只预加载半排，滚动时视觉上仍然连续，但并发场景少一半。 */
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var el = e.target;
        if (e.isIntersecting) {
          if (!el.__sketch) initOne(el);
          el.__sketch && el.__sketch.start();
          el.__inView = true;
        } else if (el.__sketch) {
          el.__sketch.stop();
          el.__inView = false;
        }
      });
      enforceBudget();
    }, { rootMargin: '80px 0px' });

    /* 2026-10-20：并发上限。
       快速滚动时可能十几个场景同时进入触发区。
       限制同时跑动画的场景数，超出的先停掉（保留最后一帧），
       等有位置了再启动 —— 视口内的优先。 */
    var MAX_RUNNING = 4;

    function enforceBudget() {
      var running = [];
      var waiting = [];
      Array.prototype.forEach.call(nodes, function (el) {
        if (!el.__sketch) return;
        if (el.__sketch.raf) running.push(el);
        else if (el.__inView) waiting.push(el);
      });

      // 超预算：从「离视口最远」的开始停
      if (running.length > MAX_RUNNING) {
        running.sort(function (a, b) {
          return Math.abs(a.getBoundingClientRect().top) - Math.abs(b.getBoundingClientRect().top);
        });
        // 前 MAX_RUNNING 个保留（离视口最近），后面的停掉
        for (var i = MAX_RUNNING; i < running.length; i++) {
          running[i].__sketch.stop();
        }
        running.length = MAX_RUNNING;
      }

      // 有余额就启动等待中的
      var room = MAX_RUNNING - running.length;
      if (room > 0 && waiting.length) {
        waiting.sort(function (a, b) {
          return Math.abs(a.getBoundingClientRect().top) - Math.abs(b.getBoundingClientRect().top);
        });
        for (var j = 0; j < Math.min(room, waiting.length); j++) {
          waiting[j].__sketch.start();
        }
      }
    }

    deferred.forEach(function (el) { io.observe(el); });

    // 2026-10-20：先挂上 observer（保证视口内的立刻能用），
    // 再在空闲时把剩下的预建好
    prebuild();
  }

  /* 2026-10-20：修「切回标签页全部重启」。
     原来是切回来就对所有 canvas 调 start()，不管在不在视口内 ——
     用户从别的标签切回来，21 个场景瞬间全跑起来，立刻卡一下。
     现在只重启「当前真的在视口内」的那些。 */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      document.querySelectorAll('canvas[data-sketch="true"]').forEach(function (c) {
        if (c.__sketch) c.__sketch.stop();
      });
      return;
    }
    if (reduce) return;

    var vh = global.innerHeight || 800;
    var revived = 0;
    document.querySelectorAll('canvas[data-sketch="true"]').forEach(function (c) {
      if (!c.__sketch || revived >= 4) return;
      var r = c.getBoundingClientRect();
      // 只在视口内（含 80px 预加载）才重启，且不超过并发上限
      if (r.bottom > -80 && r.top < vh + 80) {
        c.__sketch.start();
        revived++;
      }
    });
  });

  global.SKETCH_INIT = { init: init, initOne: initOne, makeGeo: makeGeo };
})(window);
