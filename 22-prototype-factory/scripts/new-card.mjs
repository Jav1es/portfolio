#!/usr/bin/env node
/**
 * 新建一张原型卡片
 *
 * 用法：
 *   node scripts/new-card.mjs 04-my-prototype "我的原型"
 *
 * 做三件事：
 *   1. 建 NN-slug/ 目录
 *   2. 从模板生成一个可运行的 index.html 骨架（已满足 AGENTS.md 全部约束）
 *   3. 从模板生成 cards/NN-slug.mjs 断言骨架
 *
 * 生成后跑 `node verify.mjs NN-slug` 应该直接 PASS —— 骨架本身就是合规的，
 * 你只需要往里加功能、加断言。
 */
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const [, , slugArg, nameArg] = process.argv;

if (!slugArg || !nameArg) {
  console.error('用法: node scripts/new-card.mjs <NN-slug> "<卡片名称>"');
  console.error('示例: node scripts/new-card.mjs 04-my-prototype "我的原型"');
  process.exit(1);
}

if (!/^\d{2}-[a-z0-9-]+$/.test(slugArg)) {
  console.error(`slug 格式不对: "${slugArg}"`);
  console.error('要求：两位数字 + 连字符 + 小写字母数字连字符，例如 04-my-prototype');
  process.exit(1);
}

const dir = join(ROOT, slugArg);
if (existsSync(dir)) {
  console.error(`目录已存在: ${slugArg}`);
  process.exit(1);
}

// 检查编号是否重复
const existing = readdirSync(ROOT).filter(n => /^\d{2}-[a-z0-9-]+$/.test(n));
const num = slugArg.slice(0, 2);
const clash = existing.find(n => n.startsWith(num + '-'));
if (clash) {
  console.error(`编号 ${num} 已被 ${clash} 占用`);
  process.exit(1);
}

mkdirSync(dir, { recursive: true });
mkdirSync(join(ROOT, 'cards'), { recursive: true });

/* ---------- index.html 骨架 ---------- */

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${nameArg}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    min-height: 100vh;
    background: #14161c;
    color: #eceff4;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
    line-height: 1.6;
    overflow-x: hidden;
    padding: 32px 18px;
  }
  .wrap { max-width: 640px; margin: 0 auto; }

  h1 { font-size: clamp(20px, 5vw, 26px); font-weight: 700; margin-bottom: 6px; }
  .lede { font-size: 13px; color: #8b93a7; margin-bottom: 22px; }

  input[type="text"] {
    width: 100%;
    background: #1b1f28; color: #eceff4;
    border: 1px solid #2a2f3a; border-radius: 9px;
    padding: 10px 12px; font-size: 14px; font-family: inherit;
    transition: border-color .2s, box-shadow .2s;
  }
  input[type="text"]::placeholder { color: #6b7385; }
  input[type="text"]:focus {
    outline: none; border-color: #7c9cff;
    box-shadow: 0 0 0 3px rgba(124,156,255,.14);
  }

  .row { display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; }
  .row input { flex: 1 1 160px; min-width: 0; }

  button {
    font-family: inherit; font-size: 14px; font-weight: 550;
    border-radius: 9px; border: 1px solid #2a2f3a;
    padding: 10px 18px; cursor: pointer;
    background: #1b1f28; color: #eceff4;
    transition: background-color .18s, border-color .18s, transform .1s;
    white-space: nowrap;
  }
  button:hover { background: #232936; border-color: #3d4557; }
  button:active { transform: scale(.97); }
  button.primary { background: #7c9cff; border-color: #7c9cff; color: #0d1017; }
  button.primary:hover { background: #93adff; border-color: #93adff; }

  ul.list { list-style: none; display: flex; flex-direction: column; gap: 9px; }
  .item {
    background: #1b1f28; border: 1px solid #2a2f3a;
    border-radius: 10px; padding: 13px 15px;
    display: flex; align-items: center; gap: 10px;
    transition: border-color .2s, transform .2s;
    animation: slideIn .3s cubic-bezier(.2,.8,.2,1) both;
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .item:hover { border-color: #7c9cff; transform: translateX(2px); }
  .item-text { flex: 1; min-width: 0; word-break: break-word; font-size: 14px; }
  .del {
    width: 26px; height: 26px; padding: 0; flex: none;
    border: none; background: transparent; color: #6b7385;
    border-radius: 7px; font-size: 15px; line-height: 1;
    display: grid; place-items: center;
    transition: background-color .18s, color .18s;
  }
  .del:hover { background: rgba(194,80,80,.12); color: #e06c6c; }

  .empty {
    text-align: center; padding: 44px 20px;
    color: #6b7385; font-size: 13.5px;
    border: 1px dashed #2a2f3a; border-radius: 10px;
  }

  @media (max-width: 480px) {
    body { padding: 24px 14px; }
    .row input { flex: 1 1 100%; }
    .row button { width: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: .01ms !important; transition-duration: .01ms !important; }
  }
</style>
</head>
<body>
<div class="wrap">
  <h1>${nameArg}</h1>
  <p class="lede">改我：一句话说明这个原型做什么。</p>

  <form class="row" id="form" autocomplete="off">
    <input type="text" id="input" placeholder="输入内容" aria-label="输入内容" maxlength="120">
    <button type="submit" class="primary">添加</button>
  </form>

  <ul class="list" id="list" aria-live="polite"></ul>
</div>

<script>
(function () {
  "use strict";

  var STORAGE_KEY = "${slugArg}-v1";
  var listEl = document.getElementById("list");
  var form = document.getElementById("form");
  var input = document.getElementById("input");
  var items = [];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        items = parsed.filter(function (x) { return typeof x === "string" && x; });
      }
    } catch (e) { items = []; }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (e) {}
  }

  function render() {
    if (!items.length) {
      listEl.innerHTML = '<li><div class="empty">还没有内容，先添加一条吧</div></li>';
      return;
    }
    listEl.innerHTML = items.map(function (t, i) {
      return '<li class="item">' +
        '<span class="item-text">' + esc(t) + '</span>' +
        '<button type="button" class="del" data-i="' + i + '" aria-label="删除">×</button>' +
        '</li>';
    }).join("");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = input.value.trim();
    if (!v) { input.focus(); return; }
    items.unshift(v);
    save();
    render();
    input.value = "";
    input.focus();
  });

  listEl.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-i]");
    if (!btn) return;
    items.splice(Number(btn.getAttribute("data-i")), 1);
    save();
    render();
  });

  load();
  render();
})();
</script>
</body>
</html>
`;

writeFileSync(join(dir, 'index.html'), html, 'utf8');

/* ---------- cards/NN-slug.mjs ---------- */

const spec = `/**
 * 卡片断言：${nameArg}
 *
 * 对应需求：
 *   1. 添加内容
 *   2. 删除内容
 *   3. localStorage 持久化
 *   4. 空输入拒绝
 */
export default {
  name: '${nameArg}',

  async run(page, assert) {
    const KEY = '${slugArg}-v1';

    // 干净起点
    await page.evaluate(k => localStorage.removeItem(k), KEY);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(350);

    // --- 1. 添加 ---
    const before = await page.locator('.item').count();
    await page.fill('#input', '测试条目 A');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(350);

    const after = await page.locator('.item').count();
    assert('添加内容生效', after === before + 1, \`\${before} -> \${after}\`);

    const shown = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.item-text')).some(x => x.textContent.includes('测试条目 A')));
    assert('新内容正确显示', shown, '列表里找不到"测试条目 A"');

    // --- 2. 持久化 ---
    const stored = await page.evaluate(k => localStorage.getItem(k), KEY);
    assert('写入 localStorage', stored !== null, 'storage 为空');

    const beforeReload = await page.locator('.item').count();
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(450);
    const afterReload = await page.locator('.item').count();
    assert('刷新后数据仍在', afterReload === beforeReload, \`\${beforeReload} -> \${afterReload}\`);

    // --- 3. 删除 ---
    const beforeDel = await page.locator('.item').count();
    await page.click('.item .del');
    await page.waitForTimeout(350);
    const afterDel = await page.locator('.item').count();
    assert('删除生效', afterDel === beforeDel - 1, \`\${beforeDel} -> \${afterDel}\`);

    // --- 4. 空输入 ---
    const beforeEmpty = await page.locator('.item').count();
    await page.fill('#input', '   ');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(300);
    const afterEmpty = await page.locator('.item').count();
    assert('空输入被拒绝', afterEmpty === beforeEmpty, \`\${beforeEmpty} -> \${afterEmpty}\`);

    // --- 5. XSS 转义 ---
    await page.fill('#input', '<img src=x onerror=window.__XSS__=1>');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(400);
    const xss = await page.evaluate(() => ({
      flag: window.__XSS__ || 0,
      injected: document.querySelectorAll('.item img').length
    }));
    assert('用户输入已转义', xss.flag === 0 && xss.injected === 0,
      \`注入执行=\${xss.flag} 生成标签=\${xss.injected}\`);

    // --- 6. 软性：动效 ---
    const hasMotion = await page.evaluate(() => {
      const el = document.querySelector('.item');
      if (!el) return false;
      const cs = getComputedStyle(el);
      return cs.transitionDuration !== '0s' || cs.animationName !== 'none';
    });
    assert('有过渡或动画', hasMotion, '既无 transition 也无 animation');
  }
};
`;

writeFileSync(join(ROOT, 'cards', `${slugArg}.mjs`), spec, 'utf8');

console.log(`✓ 已创建 ${slugArg}/index.html`);
console.log(`✓ 已创建 cards/${slugArg}.mjs`);
console.log('');
console.log('下一步：');
console.log(`  1. 改 ${slugArg}/index.html 实现真实需求`);
console.log(`  2. 改 cards/${slugArg}.mjs 写对应断言`);
console.log(`  3. node verify.mjs ${slugArg}`);
console.log('');
console.log('记得做反向对照：故意改坏页面，确认断言会 FAIL。');
