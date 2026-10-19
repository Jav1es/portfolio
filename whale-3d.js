/* ==========================================================================
   whale-3d.js — 作品全生命周期 3D 互动模型（2026-10-19）
   --------------------------------------------------------------------------
   用户要求：「单独一个 3D 模型没什么感觉，改成可交互作品全生命周期互动的
   3D 模型，把 23 个作品也放进去，做成一个点组成的圆或者半圆或者鲸鱼。」

   设计：一条由 23 个光点组成的鲸鱼（鲸鱼 = 从 Demo 到落地的完整生命周期，
   头在游、尾在摆，尾部是「实验」、头部是「核心交付」）。
   每个点 = 一个作品，点击/悬停显示标题与分组，点进去直达该作品。

   为什么用鲸鱼而不是圆：
     · 圆只是排列，不承载「生命周期」的语义
     · 鲸鱼有明确的方向性（头 → 尾），正好映射「成熟交付 → 实验探索」
     · 鲸鱼是已知的、好认的轮廓，23 个点散布其上仍有整体感

   技术：纯 Canvas 2D + 手写透视投影，零依赖（与全站一致）。
   ========================================================================== */
(function (global) {
  'use strict';

  /* ---------- 鲸鱼轮廓：用参数曲线生成骨架点 ---------- */
  // 返回 23 个点，沿鲸鱼身体分布（头 5 → 身 13 → 尾 5）
  /* ---------- 鲸鱼剪影：上下两条边界曲线 ---------- */
  // 用分段控制点画座头鲸侧影（头在右，尾在左）。
  // backY = 背线（上边界），bellyY = 腹线（下边界），两者在头尾交汇。
  function whaleProfile(t) {
    // t: 0 = 吻部（最右）, 1 = 尾柄末端（最左）
    var x = 1.36 - t * 2.60;

    /* 背线：三条连续曲线叠加，全程无突变。
       ① 基础轮廓：从头 0.14 缓降到尾 0.02（整体越往尾越细）
       ② 头部隆起：吻部略抬，让头钝而饱满
       ③ 背鳍：高斯型隆起，中心 t=0.37，宽约 0.10，高 0.30
          高斯保证顶部圆滑、两侧对称下降，不会出现方头或悬崖。 */
    var base = 0.15 - Math.pow(t, 1.1) * 0.11;
    var headLift = Math.exp(-Math.pow((t - 0.10) / 0.22, 2)) * 0.09;
    // 高斯宽度 0.075 → 0.115：原来太窄，两侧下降过陡（t=0.45 骤降 0.171），
    // 看起来像「方头背鳍」。加宽后是自然的三角隆起。
    var dorsal = Math.exp(-Math.pow((t - 0.36) / 0.115, 2)) * 0.26;
    var back = base + headLift + dorsal;

    /* 腹线：鲸鱼的大下巴是最特征的部分。
       ① 下颌：从吻部 -0.13 快速鼓到 -0.46，用平滑的 s 曲线
       ② 腹部：中段最厚，略微下垂
       ③ 尾部：平滑收拢到 -0.05
       全程用连续函数，不用 pow 硬收，避免「尖凸」。 */
    var jaw = -0.13 - (1 - Math.exp(-Math.pow(t / 0.20, 2))) * 0.33;
    var bellySag = Math.exp(-Math.pow((t - 0.34) / 0.26, 2)) * 0.06;
    // 尾部收拢用平滑幂函数，末端保留 0.06 厚度（尾柄不是零厚）
    var tailRise = Math.pow(Math.max(0, t - 0.52) / 0.48, 1.7) * 0.40;
    var belly = jaw - bellySag + tailRise;

    return { x: x, back: back, belly: belly };
  }

  /* ---------- 23 个点：沿鲸鱼剪影边界 + 体内分布 ---------- */
  // 轮廓点（背线 + 腹线）承载作品，让点阵本身勾出鲸鱼形状。
  function whaleSpine(n) {
    var pts = [];
    // 背线分配 12 个点，腹线分配 11 个点 —— 加起来 23
    var backN = 12, bellyN = n - backN;

    for (var i = 0; i < backN; i++) {
      var t = i / (backN - 1) * 0.94;         // 背线从头到尾柄
      var p = whaleProfile(t);
      pts.push({ x: p.x, y: p.back, z: 0, r: 0.1, t: t, edge: 'back' });
    }
    for (var j = 0; j < bellyN; j++) {
      // 腹线从尾柄往头走（反向），让点的顺序仍保持「头 → 尾」
      var t2 = 0.94 - j / (bellyN - 1) * 0.90;
      var p2 = whaleProfile(t2);
      pts.push({ x: p2.x, y: p2.belly, z: 0, r: 0.1, t: t2, edge: 'belly' });
    }
    return pts;
  }

  /* ---------- 生成 23 个作品点（螺旋分布在鲸鱼表面） ---------- */
  function buildWhalePoints(works) {
    var n = works.length;
    var spine = whaleSpine(n);
    var out = [];

    for (var i = 0; i < n; i++) {
      var s = spine[i];
      out.push({
        x: s.x,
        y: s.y,
        // 轻微 Z 抖动，让旋转时有层次，但不破坏剪影
        z: (s.edge === 'back' ? 1 : -1) * 0.06,
        work: works[i],
        t: s.t,
        edge: s.edge,
        // 越靠头越亮（成熟交付），越靠尾越淡（实验）
        heat: 1 - s.t * 0.5
      });
    }
    return out;
  }

  /* ---------- 尾鳍：额外的装饰点（不承载作品） ---------- */
  function tailFin() {
    var fin = [];
    var tip = whaleProfile(1);
    var midY = (tip.back + tip.belly) / 2;
    // 2026-10-19：鲸尾不是「尖叉」，而是两片宽厚圆润的尾叶。
    // 每片尾叶用一条外凸的弧线描述，末端圆钝。
    for (var i = 0; i <= 14; i++) {
      var t = i / 14;
      // 外凸弧度：先向外张，末端收圆
      var spread = Math.sin(t * Math.PI * 0.92) * 0.52 + t * 0.10;
      fin.push({
        x: tip.x - t * 0.56,
        y: midY + spread,
        z: 0,
        size: 1.05 - t * 0.28
      });
      fin.push({
        x: tip.x - t * 0.56,
        y: midY - spread,
        z: 0,
        size: 1.05 - t * 0.28
      });
    }
    return fin;
  }

  /* ---------- 场景 ---------- */
  function WhaleScene(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts || {};
    this.points = this.opts.points || [];
    this.fins = tailFin();
    this.rotY = -0.42;
    this.rotX = 0.26;
    this.autoSpin = true;
    this.hoverIdx = -1;
    this.dpr = Math.min(global.devicePixelRatio || 1, 2);
    this.raf = 0;
    this.lastT = 0;
    this.minFrameMs = 1000 / 40;   // 40fps 足够，省电
    this.resize();
  }

  WhaleScene.prototype.resize = function () {
    var c = this.canvas;
    var r = c.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width));
    var h = Math.max(1, Math.round(r.height));
    c.width = w * this.dpr;
    c.height = h * this.dpr;
    this.w = w;
    this.h = h;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  WhaleScene.prototype.project = function (p) {
    // 旋转 Y
    var cy = Math.cos(this.rotY), sy = Math.sin(this.rotY);
    var x1 = p.x * cy + p.z * sy;
    var z1 = -p.x * sy + p.z * cy;
    // 旋转 X
    var cx = Math.cos(this.rotX), sx = Math.sin(this.rotX);
    var y2 = p.y * cx - z1 * sx;
    var z2 = p.y * sx + z1 * cx;

    var fov = 3.6;
    var persp = fov / (fov + z2);
    var scale = Math.min(this.w / 3.2, this.h / 1.7);
    return {
      x: this.w / 2 + x1 * scale * persp,
      y: this.h / 2 + y2 * scale * persp,
      z: z2,
      k: persp
    };
  };

  WhaleScene.prototype.draw = function () {
    var ctx = this.ctx;
    var w = this.w, h = this.h;
    ctx.clearRect(0, 0, w, h);

    // 背景：极淡的径向光，让鲸鱼浮起来
    var bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.62);
    bg.addColorStop(0, 'rgba(239, 246, 255, .85)');
    bg.addColorStop(1, 'rgba(248, 250, 252, 0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    var self = this;
    var pts = this.points.map(function (p) { return { p: p, s: self.project(p) }; });
    pts.sort(function (a, b) { return b.s.z - a.s.z; });   // 远的先画

    // 尾鳍装饰点
    this.fins.forEach(function (f) {
      var s = self.project(f);
      ctx.globalAlpha = 0.30 * s.k;
      ctx.fillStyle = 'rgba(100, 116, 139, .9)';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.1 * s.k * (f.size || 1), 0, Math.PI * 2);
      ctx.fill();
    });

    // ---- 鲸鱼剪影：用 profile 采样成闭合路径并填充 ----
    // 2026-10-19：原来把 23 个点按顺序连成折线，但点分布在背线和腹线上，
    // 顺序连接得到的是「走过去再走回来」的锯齿，不成剪影。
    // 改成独立采样轮廓，点只作为发光节点叠在上面。
    var SEG = 48;
    var backPath = [], bellyPath = [];
    for (var si = 0; si <= SEG; si++) {
      var st = si / SEG * 0.94;
      var sp2 = whaleProfile(st);
      backPath.push(self.project({ x: sp2.x, y: sp2.back, z: 0 }));
      bellyPath.push(self.project({ x: sp2.x, y: sp2.belly, z: 0 }));
    }

    // 填充：背线正向 + 腹线反向
    ctx.globalAlpha = 0.20;
    ctx.fillStyle = 'rgba(37, 99, 235, 1)';
    ctx.beginPath();
    ctx.moveTo(backPath[0].x, backPath[0].y);
    for (var bi = 1; bi < backPath.length; bi++) ctx.lineTo(backPath[bi].x, backPath[bi].y);
    for (var vi = bellyPath.length - 1; vi >= 0; vi--) ctx.lineTo(bellyPath[vi].x, bellyPath[vi].y);
    ctx.closePath();
    ctx.fill();

    // 描边：背线 + 腹线
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = 'rgba(29, 78, 216, .88)';
    ctx.lineWidth = 2.0;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(backPath[0].x, backPath[0].y);
    for (var bj = 1; bj < backPath.length; bj++) ctx.lineTo(backPath[bj].x, backPath[bj].y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bellyPath[0].x, bellyPath[0].y);
    for (var vj = 1; vj < bellyPath.length; vj++) ctx.lineTo(bellyPath[vj].x, bellyPath[vj].y);
    ctx.stroke();

    // 头部的嘴线：一条短横线，鲸鱼的识别特征之一
    var mouth = self.project({ x: whaleProfile(0).x, y: (whaleProfile(0).back + whaleProfile(0).belly) / 2, z: 0 });
    var mouth2 = self.project({ x: whaleProfile(0.14).x, y: whaleProfile(0.14).belly * 0.55, z: 0 });
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(mouth.x, mouth.y);
    ctx.lineTo(mouth2.x, mouth2.y);
    ctx.stroke();

    /* ---- 鲸鱼的三个识别特征（2026-10-19）----
       视觉评估指出：只靠身体轮廓只能到「像鲸鱼 7/10」，
       加嘴线 / 胸鳍 / 呼吸孔后能到 8.5。这三样是鲸类最典型的外形特征。 */

    // ① 嘴线：从吻部沿下颌向后走一条浅弧（鲸鱼最典型的识别特征）
    ctx.globalAlpha = 0.82;
    ctx.strokeStyle = 'rgba(15, 23, 42, .92)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (var mi = 0; mi <= 10; mi++) {
      var mt = mi / 10 * 0.30;
      var mp = whaleProfile(mt);
      // 嘴线走在背线与腹线之间偏下 1/3 处，随头部弧度自然下弯
      var my = mp.belly + (mp.back - mp.belly) * (0.30 + mt * 0.5);
      var mpr = self.project({ x: mp.x, y: my, z: 0.3 });
      if (mi === 0) ctx.moveTo(mpr.x, mpr.y); else ctx.lineTo(mpr.x, mpr.y);
    }
    ctx.stroke();

    // ② 呼吸孔：头顶偏后一个小弧（把「鱼/海豚」拉成「鲸鱼」）
    var bh = whaleProfile(0.19);
    var bhP = self.project({ x: bh.x, y: bh.back - 0.012, z: 0.4 });
    ctx.globalAlpha = 0.80;
    ctx.strokeStyle = 'rgba(15, 23, 42, .85)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(bhP.x, bhP.y, 5.2 * bhP.k, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();

    // ③ 胸鳍：头后方腹部的一小片叶形（明确是鲸类，不是抽象鱼形）
    // 胸鳍：从腹部伸出的叶片，有面积才看得出是「鳍」而不是一条线
    var fl = whaleProfile(0.30);
    var flRootA = self.project({ x: fl.x + 0.10, y: fl.belly + 0.02, z: 0.2 });
    var flRootB = self.project({ x: fl.x - 0.10, y: fl.belly + 0.02, z: 0.2 });
    var flTip = self.project({ x: fl.x - 0.34, y: fl.belly - 0.40, z: 0.2 });
    var flMid = self.project({ x: fl.x + 0.06, y: fl.belly - 0.20, z: 0.2 });
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = 'rgba(37, 99, 235, .30)';
    ctx.strokeStyle = 'rgba(29, 78, 216, .85)';
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(flRootA.x, flRootA.y);
    ctx.quadraticCurveTo(flMid.x, flMid.y, flTip.x, flTip.y);
    ctx.quadraticCurveTo(flMid.x * 0.4 + flTip.x * 0.6, flMid.y, flRootB.x, flRootB.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 眼睛
    var eye = self.project({ x: whaleProfile(0.10).x, y: whaleProfile(0.10).back * 0.55, z: 0.5 });
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(eye.x, eye.y, 3.6 * eye.k, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eye.x - 0.8, eye.y - 0.8, 1.0 * eye.k, 0, Math.PI * 2);
    ctx.fill();

    // 尾鳍连线
    ctx.globalAlpha = 0.70;
    ctx.strokeStyle = 'rgba(14, 116, 144, .85)';
    ctx.lineWidth = 2.2;
    var tipP = whaleProfile(1);
    var tTip = self.project({ x: tipP.x, y: (tipP.back + tipP.belly) / 2, z: 0 });
    // 尾叶轮廓：两段外凸弧线（鲸尾是圆润的两片，不是尖叉）
    var midY2 = (tipP.back + tipP.belly) / 2;
    ctx.beginPath();
    for (var fi = 0; fi <= 14; fi++) {
      var ft = fi / 14;
      var fspread = Math.sin(ft * Math.PI * 0.92) * 0.52 + ft * 0.10;
      var fp = self.project({ x: tipP.x - ft * 0.56, y: midY2 + fspread, z: 0 });
      if (fi === 0) ctx.moveTo(fp.x, fp.y); else ctx.lineTo(fp.x, fp.y);
    }
    ctx.stroke();
    ctx.beginPath();
    for (var fj = 0; fj <= 14; fj++) {
      var gt = fj / 14;
      var gspread = Math.sin(gt * Math.PI * 0.92) * 0.52 + gt * 0.10;
      var gp = self.project({ x: tipP.x - gt * 0.56, y: midY2 - gspread, z: 0 });
      if (fj === 0) ctx.moveTo(gp.x, gp.y); else ctx.lineTo(gp.x, gp.y);
    }
    ctx.stroke();

    // 作品点
    for (var j = 0; j < pts.length; j++) {
      var item = pts[j];
      var sp = item.s;
      var wp = item.p;
      var isHover = (wp.work === self.hoverIdx);

      var near = Math.max(0.35, Math.min(1, sp.k));
      var baseR = (wp.work === self.hoverIdx ? 7.2 : 4.6) * near;

      // 外发光
      ctx.globalAlpha = 0.20 * near * wp.heat;
      ctx.fillStyle = 'rgba(37, 99, 235, 1)';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, baseR * 2.6, 0, Math.PI * 2);
      ctx.fill();

      // 主体
      ctx.globalAlpha = 0.55 + 0.45 * near;
      var g = ctx.createRadialGradient(sp.x - baseR * 0.3, sp.y - baseR * 0.3, 0, sp.x, sp.y, baseR);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.45, '#60a5fa');
      g.addColorStop(1, '#1d4ed8');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, baseR, 0, Math.PI * 2);
      ctx.fill();

      // 白边
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = 'rgba(255, 255, 255, .95)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 悬停时显示标签
      if (isHover) {
        self.drawLabel(sp, wp.work);
      }
    }
    ctx.globalAlpha = 1;
  };

  WhaleScene.prototype.drawLabel = function (sp, work) {
    var ctx = this.ctx;
    var text = (work && (work.t || work.title)) || '';
    var sub = (work && work.group) || '';
    if (!text) return;

    ctx.font = '600 13px -apple-system, "Microsoft YaHei", sans-serif';
    var tw = ctx.measureText(text).width;
    ctx.font = '400 11px -apple-system, "Microsoft YaHei", sans-serif';
    var sw = ctx.measureText(sub).width;
    var boxW = Math.max(tw, sw) + 22;
    var boxH = 42;

    var bx = sp.x - boxW / 2;
    var by = sp.y - boxH - 14;
    // 出界时翻到下方
    if (by < 4) by = sp.y + 14;
    if (bx < 4) bx = 4;
    if (bx + boxW > this.w - 4) bx = this.w - boxW - 4;

    ctx.globalAlpha = 0.97;
    ctx.fillStyle = 'rgba(255, 255, 255, .98)';
    ctx.strokeStyle = 'rgba(37, 99, 235, .30)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, boxW, boxH, 9);
    else ctx.rect(bx, by, boxW, boxH);
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 13px -apple-system, "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(text.length > 22 ? text.slice(0, 21) + '…' : text, bx + boxW / 2, by + 7);
    ctx.fillStyle = '#64748b';
    ctx.font = '400 11px -apple-system, "Microsoft YaHei", sans-serif';
    ctx.fillText(sub, bx + boxW / 2, by + 24);
  };

  WhaleScene.prototype.hitTest = function (mx, my) {
    var best = -1, bestD = 26 * 26;
    for (var i = 0; i < this.points.length; i++) {
      var s = this.project(this.points[i]);
      var dx = s.x - mx, dy = s.y - my;
      var d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = this.points[i].work; }
    }
    return best;
  };

  WhaleScene.prototype.tick = function (now) {
    if (now - this.lastT < this.minFrameMs) {
      this.raf = global.requestAnimationFrame(this.tick.bind(this));
      return;
    }
    this.lastT = now;
    if (this.autoSpin && this.hoverIdx === -1) this.rotY += 0.0016;
    this.draw();
    this.raf = global.requestAnimationFrame(this.tick.bind(this));
  };

  WhaleScene.prototype.start = function () {
    if (this.raf) return;
    this.lastT = 0;
    this.raf = global.requestAnimationFrame(this.tick.bind(this));
  };

  WhaleScene.prototype.stop = function () {
    if (this.raf) { global.cancelAnimationFrame(this.raf); this.raf = 0; }
  };

  global.WHALE3D = {
    buildWhalePoints: buildWhalePoints,
    Scene: WhaleScene
  };
})(window);
