/**
 * 卡片断言：AI 工具导航
 *
 * 对应需求：
 *   1. Hero 标题 + 副标题
 *   2. 6 个工具卡片（图标 + 名称 + 一句话描述）
 *   3. 搜索框过滤（含无匹配空态）
 *   4. 深色/浅色切换（背景色实际变化 + localStorage 持久化）
 */
export default {
  name: 'AI 工具导航',

  async run(page, assert) {
    // --- 1. Hero ---
    const h1 = (await page.locator('h1').first().textContent() || '').trim();
    assert('Hero 标题存在', h1.length > 0, `"${h1}"`);

    // 渐变文字常见坑：background-clip:text + text-fill-color:transparent 若渐变未生效会整块不可见
    const heroPaint = await page.evaluate(() => {
      const h = document.querySelector('h1');
      const cs = getComputedStyle(h);
      return {
        bgImage: cs.backgroundImage,
        bgClip: cs.webkitBackgroundClip || cs.backgroundClip,
        fill: cs.webkitTextFillColor
      };
    });
    const gradientOk = heroPaint.bgImage !== 'none' && heroPaint.bgClip === 'text';
    assert('Hero 渐变文字真实渲染', gradientOk,
      `backgroundImage=${heroPaint.bgImage.slice(0, 40)} clip=${heroPaint.bgClip}`);

    // --- 2. 6 个工具卡片 ---
    const counts = await page.evaluate(() => ({
      card: document.querySelectorAll('.card').length,
      icon: document.querySelectorAll('.card .card-icon').length,
      name: document.querySelectorAll('.card .card-name').length,
      desc: document.querySelectorAll('.card .card-desc').length
    }));
    assert('6 个工具卡片', counts.card === 6, `实际 ${counts.card} 个`);
    assert('每张卡含图标/名称/描述',
      counts.icon === 6 && counts.name === 6 && counts.desc === 6,
      `icon=${counts.icon} name=${counts.name} desc=${counts.desc}`);

    // --- 3. 搜索过滤 ---
    await page.fill('#search', 'Code');
    await page.waitForTimeout(220);
    const filtered = await page.locator('.card').count();
    assert('搜索过滤生效', filtered > 0 && filtered < 6, `输入 "Code" 后剩 ${filtered} 个`);

    await page.click('#clear');
    await page.waitForTimeout(220);
    const restored = await page.locator('.card').count();
    assert('清空搜索恢复全部', restored === 6, `恢复后 ${restored} 个`);

    // 大小写不敏感
    await page.fill('#search', 'code');
    await page.waitForTimeout(200);
    const lower = await page.locator('.card').count();
    assert('搜索大小写不敏感', lower === filtered, `大写 ${filtered} 个 vs 小写 ${lower} 个`);

    // 中文匹配
    await page.fill('#search', '写作');
    await page.waitForTimeout(200);
    const cn = await page.locator('.card').count();
    assert('搜索支持中文', cn > 0, `搜"写作"得 ${cn} 个`);

    // 无匹配空态
    await page.fill('#search', 'zzzzzz');
    await page.waitForTimeout(220);
    const empty = await page.locator('.empty').count();
    assert('无匹配显示空态', empty === 1, `empty=${empty}`);

    await page.fill('#search', '');
    await page.waitForTimeout(200);

    // --- 4. 主题切换 ---
    const t0 = await page.getAttribute('html', 'data-theme');
    const bg0 = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    await page.click('#themeBtn');
    await page.waitForTimeout(420);

    const t1 = await page.getAttribute('html', 'data-theme');
    const bg1 = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    assert('主题切换改变 data-theme', t0 !== t1, `${t0} -> ${t1}`);
    assert('主题切换背景色真实变化', bg0 !== bg1, `${bg0} -> ${bg1}`);

    const saved = await page.evaluate(() => localStorage.getItem('ai-nav-theme'));
    assert('主题写入 localStorage', saved === 'dark' || saved === 'light', `存的是 ${saved}`);

    // 刷新后主题保持
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(450);
    const afterReload = await page.getAttribute('html', 'data-theme');
    assert('刷新后主题保持', afterReload === t1, `${t1} -> ${afterReload}`);

    // --- 软性：动效存在 ---
    const hasMotion = await page.evaluate(() => {
      const c = document.querySelector('.card');
      const cs = getComputedStyle(c);
      return cs.transitionDuration !== '0s' || cs.animationName !== 'none';
    });
    assert('卡片有过渡或动画', hasMotion === true, '既无 transition 也无 animation');
  }
};
