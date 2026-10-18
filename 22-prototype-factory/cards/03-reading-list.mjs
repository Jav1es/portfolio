/**
 * 卡片断言：个人阅读清单
 *
 * 对应需求：
 *   1. 添加书名/作者
 *   2. 状态切换（想读 / 在读 / 已读）
 *   3. 按状态筛选
 *   4. localStorage 持久化
 *
 * 额外覆盖边界：XSS 转义、空书名拒绝、损坏存储容错、超长书名不溢出。
 */
export default {
  name: '个人阅读清单',

  async run(page, assert) {
    const KEY = 'reading-list-v1';

    // 从干净状态开始
    await page.evaluate(k => localStorage.removeItem(k), KEY);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(350);

    // --- 内联 mock ---
    const initial = await page.locator('.book').count();
    assert('内联 mock 数据渲染', initial > 0, `初始 ${initial} 本`);

    // --- 1. 添加 ---
    await page.fill('#titleInput', '测试书 A');
    await page.fill('#authorInput', '测试作者');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(400);

    const afterAdd = await page.locator('.book').count();
    assert('添加书名/作者生效', afterAdd === initial + 1, `${initial} -> ${afterAdd}`);

    const authorShown = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.book-author')).some(x => x.textContent.includes('测试作者')));
    assert('作者正确显示', authorShown, '列表里找不到"测试作者"');

    // --- 2. 状态切换 ---
    const findBook = () => page.evaluate(() => {
      const li = Array.from(document.querySelectorAll('.book'))
        .find(x => (x.querySelector('.book-title')?.textContent || '').includes('测试书 A'));
      return li ? li.querySelector('.status-btn').textContent.trim() : null;
    });

    const s0 = await findBook();
    assert('新书默认「想读」', s0 === '想读', `实际 ${s0}`);

    await page.evaluate(() => {
      const li = Array.from(document.querySelectorAll('.book'))
        .find(x => (x.querySelector('.book-title')?.textContent || '').includes('测试书 A'));
      li.querySelector('.status-btn').click();
    });
    await page.waitForTimeout(300);
    const s1 = await findBook();

    await page.evaluate(() => {
      const li = Array.from(document.querySelectorAll('.book'))
        .find(x => (x.querySelector('.book-title')?.textContent || '').includes('测试书 A'));
      li.querySelector('.status-btn').click();
    });
    await page.waitForTimeout(300);
    const s2 = await findBook();

    assert('状态循环 想读→在读→已读',
      s0 === '想读' && s1 === '在读' && s2 === '已读',
      `${s0} → ${s1} → ${s2}`);

    // --- 3. 筛选 ---
    await page.click('.chip[data-filter="done"]');
    await page.waitForTimeout(300);
    const doneFilter = await page.evaluate(() => {
      const books = Array.from(document.querySelectorAll('.book'));
      return {
        n: books.length,
        allDone: books.every(b => b.classList.contains('st-done'))
      };
    });
    assert('按状态筛选（已读）', doneFilter.n > 0 && doneFilter.allDone,
      `已读 ${doneFilter.n} 本，全部标记为已读=${doneFilter.allDone}`);

    await page.click('.chip[data-filter="all"]');
    await page.waitForTimeout(300);

    // 计数与列表一致
    const consistency = await page.evaluate(() => {
      const num = id => Number(document.getElementById(id).textContent.trim());
      return {
        total: num('sTotal'), want: num('sWant'), reading: num('sReading'), done: num('sDone'),
        actual: document.querySelectorAll('.book').length
      };
    });
    assert('计数与列表一致',
      consistency.total === consistency.actual &&
      consistency.want + consistency.reading + consistency.done === consistency.actual,
      `total=${consistency.total} 实际=${consistency.actual} 三态和=${consistency.want + consistency.reading + consistency.done}`);

    // --- 4. localStorage 持久化 ---
    const stored = await page.evaluate(k => {
      const raw = localStorage.getItem(k);
      if (!raw) return null;
      try { const a = JSON.parse(raw); return Array.isArray(a) ? a.length : null; } catch { return 'bad-json'; }
    }, KEY);
    assert('localStorage 已写入', typeof stored === 'number' && stored > 0, `存了 ${stored} 条`);

    const beforeReload = await page.locator('.book').count();
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(450);
    const afterReload = await page.locator('.book').count();
    assert('刷新后数据仍在', afterReload === beforeReload, `${beforeReload} -> ${afterReload}`);

    const stillThere = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.book-title')).some(x => x.textContent.includes('测试书 A')));
    assert('刷新后新增的书仍存在', stillThere, '刷新后找不到"测试书 A"');

    // --- 删除 ---
    const beforeDel = await page.locator('.book').count();
    await page.evaluate(() => {
      const li = Array.from(document.querySelectorAll('.book'))
        .find(x => (x.querySelector('.book-title')?.textContent || '').includes('测试书 A'));
      if (li) li.querySelector('.del').click();
    });
    await page.waitForTimeout(500);
    const afterDel = await page.locator('.book').count();
    assert('删除生效', afterDel === beforeDel - 1, `${beforeDel} -> ${afterDel}`);

    // --- 边界：XSS 转义 ---
    await page.fill('#titleInput', '<img src=x onerror=window.__XSS__=1>');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(450);
    const xss = await page.evaluate(() => ({
      flag: window.__XSS__ || 0,
      imgs: document.querySelectorAll('.book img').length
    }));
    assert('书名中的 HTML 已转义', xss.flag === 0 && xss.imgs === 0,
      `注入执行=${xss.flag} 生成img标签=${xss.imgs}`);

    // --- 边界：空书名 ---
    const beforeEmpty = await page.locator('.book').count();
    await page.fill('#titleInput', '   ');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(400);
    const afterEmpty = await page.locator('.book').count();
    assert('空书名被拒绝', afterEmpty === beforeEmpty, `列表从 ${beforeEmpty} 变成 ${afterEmpty}`);

    // --- 边界：损坏的 localStorage ---
    await page.evaluate(k => localStorage.setItem(k, '{{{bad json'), KEY);
    const errsBefore = [];
    page.on('pageerror', e => errsBefore.push(e.message));
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(450);
    const recovered = await page.locator('.book').count();
    assert('损坏存储可容错恢复', recovered > 0 && errsBefore.length === 0,
      `渲染 ${recovered} 本，报错 ${errsBefore.length} 条`);

    // --- 边界：超长书名不撑破布局 ---
    await page.fill('#titleInput', 'A'.repeat(200));
    await page.click('button[type="submit"]');
    await page.waitForTimeout(400);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(350);
    const longOk = await page.evaluate(() => {
      const de = document.documentElement;
      return de.scrollWidth <= de.clientWidth + 1;
    });
    assert('超长书名不产生横向滚动', longOk, '200 字符书名导致溢出');

    // --- 软性：动效 ---
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(250);
    const hasMotion = await page.evaluate(() => {
      const b = document.querySelector('.book');
      if (!b) return false;
      const cs = getComputedStyle(b);
      return cs.transitionDuration !== '0s' || cs.animationName !== 'none';
    });
    assert('列表项有过渡或动画', hasMotion === true, '既无 transition 也无 animation');
  }
};
