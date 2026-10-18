/**
 * 卡片断言：极简番茄钟
 *
 * 对应需求：
 *   1. 25 分钟倒计时
 *   2. 开始 / 暂停 / 重置
 *   3. 环形进度动画
 *   4. 完成时用 Web Audio 播放提示音（不依赖音频文件）
 *
 * 注意第 4 点：只验证「AudioContext 可创建」是无效验证——那证明不了归零时真的响。
 * 真正的验证在 runCompletion：把 WORK_SECONDS 改小做临时副本，跑完整条完成路径。
 */
export default {
  name: '极简番茄钟',

  async run(page, assert) {
    // --- 1. 初始 25 分钟 ---
    const t0 = (await page.textContent('#time') || '').trim();
    assert('初始 25:00', t0 === '25:00', `实际 ${t0}`);

    // --- 3. 环形进度元素 ---
    const ringOk = await page.evaluate(() => {
      const r = document.getElementById('ring');
      if (!r) return { ok: false, why: '找不到 #ring' };
      const cs = getComputedStyle(r);
      const dash = parseFloat(cs.strokeDasharray);
      return { ok: dash > 100, why: `strokeDasharray=${cs.strokeDasharray}` };
    });
    assert('环形进度元素已就绪', ringOk.ok, ringOk.why);

    // --- 2a. 开始 ---
    await page.click('#startBtn');
    await page.waitForTimeout(2400);
    const t1 = (await page.textContent('#time') || '').trim();
    assert('开始后倒计时递减', t1 !== '25:00', `2.4s 后为 ${t1}`);

    // --- 3b. 进度随倒计时变化 ---
    const offset = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.getElementById('ring')).strokeDashoffset));
    assert('环形进度随倒计时变化', offset > 0, `strokeDashoffset=${offset}`);

    // --- 2b. 暂停 ---
    await page.click('#startBtn');
    const p1 = (await page.textContent('#time') || '').trim();
    await page.waitForTimeout(1600);
    const p2 = (await page.textContent('#time') || '').trim();
    assert('暂停后倒计时停止', p1 === p2, `${p1} -> ${p2}`);

    // --- 2c. 重置 ---
    await page.click('#resetBtn');
    await page.waitForTimeout(250);
    const t2 = (await page.textContent('#time') || '').trim();
    assert('重置回到 25:00', t2 === '25:00', `实际 ${t2}`);

    // 重置后计时器确实被清理（不会偷偷继续走）
    await page.waitForTimeout(1600);
    const t3 = (await page.textContent('#time') || '').trim();
    assert('重置后计时器已清理', t3 === '25:00', `重置 1.6s 后变成 ${t3}`);

    // --- 4. 提示音不依赖音频文件 ---
    const src = await page.evaluate(() => document.documentElement.outerHTML);
    const usesOsc = /createOscillator/.test(src);
    const noAudioTag = !/<audio[\s>]/i.test(src);
    const noAudioFile = !/\.(mp3|wav|ogg|m4a|aac|flac)["']/i.test(src);
    assert('提示音用振荡器合成', usesOsc, '源码里没有 createOscillator');
    assert('不依赖任何音频文件', noAudioTag && noAudioFile,
      `audio标签=${!noAudioTag} 音频文件引用=${!noAudioFile}`);

    // --- 软性：动效 ---
    const hasMotion = await page.evaluate(() => {
      const b = document.getElementById('startBtn');
      const cs = getComputedStyle(b);
      return cs.transitionDuration !== '0s' || cs.animationName !== 'none';
    });
    assert('按钮有过渡反馈', hasMotion === true, 'transitionDuration 为 0s 且无 animation');
  },

  /**
   * 完成路径：把 WORK_SECONDS 改成 2 秒做临时副本，真实跑完
   * 「倒计时归零 → 播放提示音 → 切休息阶段」整条主路径。
   * 只改临时副本，不动交付文件。
   */
  async runCompletion(htmlPath, assert, browser) {
    const { mkdtempSync, writeFileSync, readFileSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { pathToFileURL } = await import('node:url');

    const raw = readFileSync(htmlPath, 'utf8');
    const patched = raw.replace(/var WORK_SECONDS\s*=\s*25\s*\*\s*60;/, 'var WORK_SECONDS = 2;');
    if (patched === raw) {
      assert('完成路径可注入短时长', false, '未匹配到 WORK_SECONDS 常量，无法验证完成路径');
      return;
    }

    const dir = mkdtempSync(join(tmpdir(), 'pomo-'));
    const tmpHtml = join(dir, 'index.html');
    writeFileSync(tmpHtml, patched, 'utf8');

    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

    // 在页面脚本执行前挂钩振荡器，统计真实调用次数
    await page.addInitScript(() => {
      window.__oscCalls = 0;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        const orig = AC.prototype.createOscillator;
        AC.prototype.createOscillator = function (...a) {
          window.__oscCalls++;
          return orig.apply(this, a);
        };
      }
    });

    await page.goto(pathToFileURL(tmpHtml).href, { waitUntil: 'load' });
    await page.waitForTimeout(200);
    await page.click('#startBtn');
    await page.waitForTimeout(3400);

    const s = await page.evaluate(() => ({
      osc: window.__oscCalls,
      mode: document.getElementById('modeTag').textContent.trim(),
      bodyCls: document.body.className,
      dots: document.querySelectorAll('.dot.filled').length
    }));

    assert('完成时真的播放提示音', s.osc >= 3, `振荡器仅调用 ${s.osc} 次`);
    assert('完成后切到休息阶段', s.mode === '休息', `当前阶段 ${s.mode}`);
    assert('完成后背景与轮次更新', s.bodyCls === 'mode-break' && s.dots >= 1,
      `bodyClass="${s.bodyCls}" 已填轮次=${s.dots}`);
    assert('完成路径无报错', errs.length === 0, errs.slice(0, 2).join(' | '));

    await ctx.close();
    rmSync(dir, { recursive: true, force: true });
  }
};
