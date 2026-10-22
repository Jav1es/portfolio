// build-resume-pdf.mjs —— 用 CDP Page.printToPDF 生成四份 PDF 简历
//
// 为什么用浏览器打印而不是「让用户自己按 Ctrl+P」：
//   HR 转化路径上的唯一硬断点就是「下载简历」落到打印对话框而不是文件。
//
// 用法：node build-resume-pdf.mjs
// 产物：resume-harness.pdf / resume-fde.pdf / resume-ai-agent.pdf / resume-design.pdf
//
// ⚠️ 2026-10-22 实测记录（Edge 155.0.4283.62，这台机器）：
//   · `--headless=new --print-to-pdf` **完全失效**：退出码 0、不产出文件、
//     连 stderr 都没有。用 `data:text/html,<h1>Hi</h1>` 这种最简页面也不产出，
//     所以不是页面渲染慢。`--headless=old` 同样失效。
//   · 走 CDP（--remote-debugging-port + Page.printToPDF）则完全正常 ——
//     这套路径本会话的验证脚本一直在用，稳定。
//   · profile 必须在 %TEMP%（纯 ASCII 无空格）。放项目目录
//     （D:\Jav1e Flies\00-工作区\...）会 Command failed。
//   · 每条用独立 profile + 独立端口，跑完 kill 整棵进程树
//     （只 kill 主进程会留下几十个 renderer 子进程，越积越多）。
import { existsSync, statSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const EDGE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

const ROOT = process.cwd();

const TARGETS = [
  { ver: 'harness', out: 'resume-harness.pdf' },
  { ver: 'fde', out: 'resume-fde.pdf' },
  { ver: 'agent', out: 'resume-ai-agent.pdf' },
  { ver: 'design', out: 'resume-design.pdf' },
];

const edge = EDGE_CANDIDATES.find(p => existsSync(p));
if (!edge) {
  console.error('找不到 Edge，尝试过：\n  ' + EDGE_CANDIDATES.join('\n  '));
  process.exit(1);
}

const pageUri = pathToFileURL(resolve(ROOT, 'resume.html')).href;

/** 起 Edge + CDP，渲染一版简历并打印成 PDF。返回字节数。 */
async function printOne(ver, outPath) {
  if (existsSync(outPath)) rmSync(outPath);
  const prof = resolve(tmpdir(), 'dsh-pdf-' + ver + '-' + Date.now());
  mkdirSync(prof, { recursive: true });
  const port = 9100 + Math.floor(Math.random() * 800);
  const uri = pageUri + '?ver=' + ver;

  const child = spawn(edge, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--hide-scrollbars',
    // 简历是 A4 单页布局，视口按 A4 比例给
    '--window-size=1240,1754',
    '--force-prefers-no-reduced-motion',
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + prof,
    uri,
  ], { stdio: 'ignore', windowsHide: true });

  let ok = false;
  let bytes = 0;

  try {
    // 等 CDP 起来
    let page = null;
    for (let i = 0; i < 200; i++) {
      try {
        const r = await fetch('http://127.0.0.1:' + port + '/json/list');
        const j = await r.json();
        page = j.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
        if (page) break;
      } catch { }
      await sleep(200);
    }
    if (!page) throw new Error('CDP 未就绪');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = () => rej(new Error('WS 连接失败'));
      setTimeout(() => rej(new Error('WS 超时')), 15000);
    });

    let id = 0;
    const pend = new Map();
    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    };
    const send = (method, params = {}) => {
      const i = ++id;
      ws.send(JSON.stringify({ id: i, method, params }));
      return new Promise(r => pend.set(i, r));
    };

    await send('Page.enable');
    // 等页面渲染完（resume.js 会异步填内容）
    for (let i = 0; i < 40; i++) {
      const r = await send('Runtime.evaluate', {
        expression: "document.querySelectorAll('.resume-switch button').length + ':' + (document.getElementById('resume-root')||{innerHTML:''}).innerHTML.length",
        returnByValue: true,
      });
      const v = String(r.result?.result?.value || '');
      const [btns, len] = v.split(':').map(Number);
      if (btns >= 4 && len > 2000) break;
      await sleep(300);
    }

    const pdf = await send('Page.printToPDF', {
      printBackground: true,
      preferCSSPageSize: true,   // 让 resume.css 的 @page 生效
      marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
    });

    const b64 = pdf.result?.data;
    if (!b64) throw new Error('printToPDF 无数据');
    const buf = Buffer.from(b64, 'base64');
    writeFileSync(outPath, buf);
    bytes = buf.length;
    ok = true;

    ws.close();
  } catch (e) {
    console.error(`  [${ver}] ${e.message}`);
  } finally {
    // 必须杀整棵进程树：只杀主进程会留下 renderer 子进程，越积越多
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      } else {
        child.kill('SIGKILL');
      }
    } catch { }
    await sleep(600);
    try { rmSync(prof, { recursive: true, force: true }); } catch { }
  }

  return ok ? bytes : 0;
}

let failed = 0;
for (const t of TARGETS) {
  const out = resolve(ROOT, t.out);
  const size = await printOne(t.ver, out);

  if (!size) {
    console.error(`  [${t.ver}] FAIL 未产出 ${t.out}`);
    failed++;
    continue;
  }
  // 一个只有骨架的 PDF 通常 < 5KB，说明 JS 没渲染完就打印了
  const good = size > 5000;
  console.log(`  [${t.ver}] ${good ? 'OK  ' : 'WARN'} ${t.out}  ${size} bytes${good ? '' : '  (<5KB，可能 JS 未渲染完)'}`);
  if (!good) failed++;
}

console.log('');
console.log(failed === 0 ? '4 份 PDF 均生成成功。' : `有 ${failed} 项异常，请检查。`);
process.exit(failed === 0 ? 0 : 1);
