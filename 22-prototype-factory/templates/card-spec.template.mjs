/**
 * 卡片断言模板
 *
 * 复制到 cards/<NN-slug>.mjs 后按需修改。
 *
 * 写断言的三条纪律（详见 README.md）：
 *   1. 测「行为」不测「存在」——元素在 ≠ 功能可用
 *   2. 测「终点」不测「能力」——AudioContext 能建 ≠ 提示音响了
 *   3. 每条断言都要反向对照——注入缺陷后必须 FAIL
 */
export default {
  // 显示在看板与报告里的名字
  name: '卡片名称',

  /**
   * 主断言。page 是 playwright 的 Page，assert 是 (label, pass, detail) => void。
   *
   * 通用断言（单文件 / 内联 / 无报错 / 375px）引擎已经跑了，这里只写这张卡特有的。
   */
  async run(page, assert) {
    // ---- 静态渲染 ----
    // 断言「渲染出了什么」，带上实际值方便失败时定位
    const itemCount = await page.locator('.item').count();
    assert('渲染 5 个条目', itemCount === 5, `实际 ${itemCount} 个`);

    // ---- 交互：点一下，验证状态真的变了 ----
    await page.click('#someButton');
    await page.waitForTimeout(300);   // 给动画/状态更新留时间

    const after = await page.evaluate(() => {
      // 在页面上下文里读取真实状态，不要只看 DOM 存在与否
      return {
        text: document.querySelector('#output')?.textContent.trim(),
        cls: document.querySelector('#panel')?.className
      };
    });
    assert('点击后输出更新', after.text === '期望值', `实际 "${after.text}"`);

    // ---- 持久化（如果用了 localStorage）----
    const stored = await page.evaluate(() => localStorage.getItem('my-key'));
    assert('写入 localStorage', stored !== null, 'storage 为空');

    // 刷新后还在才算真持久化
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    const persisted = await page.evaluate(() => localStorage.getItem('my-key'));
    assert('刷新后仍保留', persisted === stored, `${stored} -> ${persisted}`);

    // ---- 边界 ----
    // 空输入
    await page.fill('#input', '   ');
    await page.click('#submit');
    await page.waitForTimeout(300);
    assert('空输入被拒绝', await page.locator('.item').count() === itemCount, '空输入被接受了');

    // XSS（如果渲染用户输入）
    await page.fill('#input', '<img src=x onerror=window.__XSS__=1>');
    await page.click('#submit');
    await page.waitForTimeout(400);
    const xss = await page.evaluate(() => ({
      flag: window.__XSS__ || 0,
      injected: document.querySelectorAll('.item img').length
    }));
    assert('用户输入已转义', xss.flag === 0 && xss.injected === 0,
      `注入执行=${xss.flag} 生成标签=${xss.injected}`);

    // ---- 软性：动效存在 ----
    const hasMotion = await page.evaluate(() => {
      const el = document.querySelector('.item');
      if (!el) return false;
      const cs = getComputedStyle(el);
      return cs.transitionDuration !== '0s' || cs.animationName !== 'none';
    });
    assert('有过渡或动画', hasMotion, '既无 transition 也无 animation');
  }

  /**
   * 可选：需要跑完整主路径才能验证的断言。
   *
   * 典型场景：倒计时归零才响铃、表单提交后才发请求、动画结束后才切状态。
   * 这类不能用「元素存在」或「函数可调用」代替。
   *
   * 参数：
   *   htmlPath - 交付文件路径
   *   assert   - 同 run
   *   browser  - 浏览器实例，可自己开 context
   *
   * 注意：如果要改源码里的常量（如缩短倒计时），**必须做临时副本**，
   * 不能动交付文件。见 cards/02-pomodoro.mjs 的 runCompletion 实现。
   */
  // async runCompletion(htmlPath, assert, browser) {
  //   const { mkdtempSync, writeFileSync, readFileSync, rmSync } = await import('node:fs');
  //   const { tmpdir } = await import('node:os');
  //   const { join } = await import('node:path');
  //   const { pathToFileURL } = await import('node:url');
  //
  //   const raw = readFileSync(htmlPath, 'utf8');
  //   const patched = raw.replace(/var DURATION = 60;/, 'var DURATION = 2;');
  //   if (patched === raw) {
  //     assert('可注入短时长', false, '未匹配到 DURATION 常量');
  //     return;
  //   }
  //
  //   const dir = mkdtempSync(join(tmpdir(), 'proto-'));
  //   const tmpHtml = join(dir, 'index.html');
  //   writeFileSync(tmpHtml, patched, 'utf8');
  //
  //   const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  //   const page = await ctx.newPage();
  //   await page.goto(pathToFileURL(tmpHtml).href, { waitUntil: 'load' });
  //   // ... 跑完整路径并断言 ...
  //
  //   await ctx.close();
  //   rmSync(dir, { recursive: true, force: true });
  // }
};
