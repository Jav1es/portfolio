/**
 * 原型工厂 —— 通用断言引擎
 *
 * 这个文件只做「怎么测」，不管「测什么」。每张卡片的专属交互断言写在
 * cards/<slug>.mjs 里，由它自己导出 run(page, assert)。
 *
 * 通用断言（每张卡片都会跑）：
 *   1. 目录下只有单个 index.html
 *   2. CSS/JS 全部内联，无外链资源
 *   3. 打开无 console 报错 / pageerror
 *   4. 375px 宽度下无横向滚动（逐元素定位溢出源）
 *   5. 375px 下主要按钮可点击（elementFromPoint 命中检测）
 *   6. 交互跑完后仍无新增报错
 *
 * 用法:
 *   node verify.mjs                跑全部卡片
 *   node verify.mjs 01-ai-nav      只跑指定卡片
 *   node verify.mjs --json         只输出机器可读结果
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { existsSync, readdirSync, statSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ---------- 定位浏览器 ---------- */

/**
 * 按平台常见安装路径找 Chromium 内核浏览器，也接受环境变量覆盖。
 * 换机器时不需要改代码。
 */
function findBrowser() {
  const fromEnv = process.env.PROTOTYPE_FACTORY_BROWSER;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const candidates = [
    // Windows
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge'
  ];
  return candidates.find(p => existsSync(p)) || null;
}

const BROWSER_PATH = findBrowser();
if (!BROWSER_PATH) {
  console.error('找不到 Chromium 内核浏览器。');
  console.error('请设置环境变量 PROTOTYPE_FACTORY_BROWSER 指向浏览器可执行文件。');
  process.exit(1);
}

/* ---------- 定位 playwright-core ---------- */

/**
 * playwright-core 可能装在：本目录、DSH profile、全局 node_modules。
 * 用模块解析优先，找不到再退回已知位置，避免硬编码用户名。
 */
async function loadPlaywright() {
  // 1) 标准模块解析（在项目里 npm i playwright-core 的情况）
  try {
    const mod = await import('playwright-core');
    const c = mod.chromium || (mod.default && mod.default.chromium);
    if (c) return c;
  } catch { /* 继续找 */ }

  // 2) 从 DSH_HOME / 用户目录推导（不写死用户名）
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const dshHome = process.env.DSH_HOME || (home ? join(home, '.dsh') : '');
  const guesses = [];
  if (dshHome) {
    guesses.push(join(dshHome, 'profiles', 'desktop', 'node_modules', 'playwright-core', 'index.mjs'));
    guesses.push(join(dshHome, 'profiles', 'desktop', 'node_modules', 'playwright-core', 'index.js'));
  }
  if (home) {
    guesses.push(join(home, 'node_modules', 'playwright-core', 'index.mjs'));
  }
  guesses.push(join(__dirname, 'node_modules', 'playwright-core', 'index.mjs'));

  for (const p of guesses) {
    if (!existsSync(p)) continue;
    try {
      const mod = await import(pathToFileURL(p).href);
      const c = mod.chromium || (mod.default && mod.default.chromium);
      if (c) return c;
    } catch { /* 试下一个 */ }
  }
  return null;
}

const chromium = await loadPlaywright();
if (!chromium) {
  console.error('找不到 playwright-core。');
  console.error('请执行 npm i -D playwright-core，或确认它已装在 DSH profile 下。');
  process.exit(1);
}

/* ---------- 发现卡片 ---------- */

/**
 * 扫描目录下形如 `NN-slug` 且含 index.html 的子目录。
 * @returns {Array<{slug: string, dir: string, html: string}>}
 */
function discoverCards() {
  return readdirSync(__dirname)
    .filter(name => {
      if (!/^\d{2}-[a-z0-9-]+$/.test(name)) return false;
      const full = join(__dirname, name);
      return statSync(full).isDirectory() && existsSync(join(full, 'index.html'));
    })
    .sort()
    .map(name => ({
      slug: name,
      dir: join(__dirname, name),
      html: join(__dirname, name, 'index.html')
    }));
}

/* ---------- 通用断言 ---------- */

/**
 * 375px 横向溢出检查。
 *
 * 两种失败模式都要抓：
 *   A. 真的能横向滚动（scrollWidth > clientWidth）
 *   B. 被 `overflow-x: hidden` 裁掉了 —— 这时 scrollWidth 恒等于 clientWidth，
 *      元素 getBoundingClientRect 也被裁剪，靠宽度判断查不出来，
 *      但内容实际被截断（用户看不到、也点不到）。
 *
 * B 是最阴险的一种：页面"看起来没横向滚动"，实际右侧内容消失。
 * 检测办法是临时解除裁剪再测量，测完还原。
 */
async function checkNoHScroll(page, assert, opts = {}) {
  const tag = opts.phase ? `（${opts.phase}）` : '';
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(450);

  const r = await page.evaluate(() => {
    const de = document.documentElement;
    const clientW = de.clientWidth;

    // --- A. 直接量 ---
    const scrollW = Math.max(de.scrollWidth, document.body.scrollWidth);
    const scrolls = scrollW > clientW + 1;

    // --- B. 解除裁剪后重量 ---
    // 记录被改过的元素，测完还原，避免影响后续断言
    const touched = [];
    const clippers = [de, document.body, ...document.querySelectorAll('*')];
    for (const el of clippers) {
      const cs = getComputedStyle(el);
      if (cs.overflowX === 'hidden' || cs.overflowX === 'clip') {
        touched.push([el, el.style.overflowX]);
        el.style.setProperty('overflow-x', 'visible', 'important');
      }
    }

    // 重量：先看整页，再看逐个元素
    const unclippedScrollW = Math.max(de.scrollWidth, document.body.scrollWidth);
    const offenders = [];
    for (const el of document.querySelectorAll('*')) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.right > clientW + 1) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: typeof el.className === 'string' ? el.className.slice(0, 36) : '',
          right: Math.round(rect.right)
        });
      }
    }

    // 还原
    for (const [el, prev] of touched) {
      if (prev) el.style.setProperty('overflow-x', prev);
      else el.style.removeProperty('overflow-x');
    }

    return {
      clientW, scrollW, unclippedScrollW,
      scrolls,
      clipped: unclippedScrollW > clientW + 1,
      clippedBy: touched.length,
      offenders: offenders.slice(0, 4)
    };
  });

  // 情况 A：能滚
  assert(`375px 无横向滚动${tag}`, !r.scrolls,
    r.scrolls
      ? `scrollWidth=${r.scrollW} > clientWidth=${r.clientW}; ` +
        r.offenders.map(o => `${o.tag}.${o.cls}(right=${o.right})`).join(', ')
      : '');

  // 情况 B：被裁剪（scrollWidth 查不出来的那种）
  assert(`375px 内容未被裁剪${tag}`, !r.clipped,
    r.clipped
      ? `有 ${r.clippedBy} 处 overflow-x:hidden 掩盖了溢出，` +
        `解除裁剪后宽度 ${r.unclippedScrollW} > ${r.clientW}; ` +
        r.offenders.map(o => `${o.tag}.${o.cls}(right=${o.right})`).join(', ')
      : '');
}

/**
 * 375px 下主要按钮可点击性：取第一个可见按钮，用 elementFromPoint 判断是否被遮挡。
 */
async function checkButtonClickable(page, assert, opts = {}) {
  const tag = opts.phase ? `（${opts.phase}）` : '';
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(300);

  const r = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
      .filter(b => b.offsetParent !== null && getComputedStyle(b).display !== 'none');
    if (!btns.length) return { ok: false, reason: '页面上没有可见按钮' };

    const b = btns[0];
    const rect = b.getBoundingClientRect();
    const el = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    const hit = el && (el === b || b.contains(el) || el.closest('button') === b);

    return {
      ok: hit && rect.width >= 24 && rect.height >= 24,
      reason: hit
        ? `${Math.round(rect.width)}x${Math.round(rect.height)}px`
        : '按钮被其他元素遮挡'
    };
  });

  assert(`375px 主要按钮可点击${tag}`, r.ok, r.reason);
}

/* ---------- 单卡执行 ---------- */

/**
 * 跑一张卡片的全部断言。
 * @param card - discoverCards() 返回的条目
 * @param browser - 已启动的浏览器实例
 * @returns 断言结果与元信息
 */
async function runCard(card, browser) {
  const results = [];
  const assert = (label, pass, detail) => results.push({ label, pass: !!pass, detail: detail || '' });

  // 载入卡片自定义断言（可选）
  let spec = null;
  const specPath = join(__dirname, 'cards', `${card.slug}.mjs`);
  if (existsSync(specPath)) {
    try {
      spec = (await import(pathToFileURL(specPath).href)).default;
    } catch (e) {
      assert('加载卡片断言脚本', false, e.message);
    }
  }

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));

  await page.goto(pathToFileURL(card.html).href, { waitUntil: 'load' });
  await page.waitForTimeout(700);

  // 1. 单文件
  const files = readdirSync(card.dir).filter(f => statSync(join(card.dir, f)).isFile());
  assert('单文件 index.html', files.length === 1 && files[0] === 'index.html',
    files.join(', '));

  // 2. 内联
  const html = await page.evaluate(() => document.documentElement.outerHTML);
  const extCss = /<link[^>]+rel=["']stylesheet["'][^>]*>/i.test(html);
  const extJs = /<script[^>]+src=["'][^"']+["'][^>]*>/i.test(html);
  assert('CSS/JS 全内联', !extCss && !extJs, `外链CSS=${extCss} 外链JS=${extJs}`);

  // 3. 无报错
  assert('打开无 console 报错', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

  // 4-5. 响应式（首次：初始状态）
  await checkNoHScroll(page, assert);
  await checkButtonClickable(page, assert);

  // 6. 卡片专属交互
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(250);
  if (spec && typeof spec.run === 'function') {
    try {
      await spec.run(page, assert);
    } catch (e) {
      assert('卡片交互断言执行', false, e.message);
    }
  } else {
    assert('卡片交互断言', false, `缺少 cards/${card.slug}.mjs`);
  }

  // 7. 交互后无新增报错
  assert('交互后仍无 console 报错', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

  // 8. 响应式复检：交互后页面已有真实内容，此时的溢出才代表用户实际看到的
  //    （初始为空列表时，针对列表项的布局缺陷根本不会显现）
  await checkNoHScroll(page, assert, { phase: '内容填充后' });
  await checkButtonClickable(page, assert, { phase: '内容填充后' });

  await ctx.close();

  // 8. 卡片若有额外主路径（如番茄钟完成路径），单独开上下文
  if (spec && typeof spec.runCompletion === 'function') {
    try {
      await spec.runCompletion(card.html, assert, browser);
    } catch (e) {
      assert('完成路径断言执行', false, e.message);
    }
  }

  return {
    slug: card.slug,
    name: (spec && spec.name) || basename(card.slug),
    results,
    pass: results.every(r => r.pass)
  };
}

/* ---------- 主流程 ---------- */

const argv = process.argv.slice(2);
const jsonOnly = argv.includes('--json');
const only = argv.find(a => !a.startsWith('--'));

const cards = discoverCards().filter(c => !only || c.slug === only || c.slug.startsWith(only));
if (!cards.length) {
  console.error(only ? `找不到卡片: ${only}` : '当前目录下没有 NN-slug/index.html 形式的原型');
  process.exit(1);
}

let browser;
try {
  browser = await chromium.launch({ executablePath: BROWSER_PATH, headless: true });
} catch (e) {
  console.error('启动浏览器失败：' + e.message);
  process.exit(1);
}

const report = [];
for (const card of cards) report.push(await runCard(card, browser));
await browser.close();

/* ---------- 输出 ---------- */

const summary = report.map(r => ({
  card: r.name,
  slug: r.slug,
  pass: r.pass,
  total: r.results.length,
  failed: r.results.filter(x => !x.pass).map(x => `${x.label}: ${x.detail}`)
}));

if (jsonOnly) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log('\n' + '='.repeat(70));
  for (const r of report) {
    console.log(`\n【${r.name}】 ${r.pass ? 'PASS' : 'FAIL'}  (${r.results.length} 项)`);
    for (const x of r.results) {
      console.log(`  ${x.pass ? '✓' : '✗'} ${x.label}${x.pass ? '' : '  ← ' + x.detail}`);
    }
  }
  console.log('\n' + '='.repeat(70));
  const failed = report.filter(r => !r.pass);
  console.log(`\n汇总：${report.length - failed.length}/${report.length} 张卡片硬性断言全 PASS`);
  if (failed.length) console.log('FAIL：' + failed.map(f => f.name).join(', '));
  console.log('\nJSON:' + JSON.stringify(summary.map(s => ({ card: s.card, pass: s.pass, failed: s.failed }))));
}

process.exitCode = report.every(r => r.pass) ? 0 : 1;
