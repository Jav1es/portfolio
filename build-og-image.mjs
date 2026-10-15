// build-og-image.mjs —— 生成社交分享图 og-image.jpg（1200x630）
//
// 为什么要有这个脚本：P1-7 的问题不是「图丑」，而是**图会悄悄过期** ——
// 上一版还写着「5 年+ / 300+ / 95+ / 14 个模块」，而站点早已是
// 「6 年+ / 27 个月 / 100+ / 21 个模块」。没有可复现的生成方式，
// 口径一变图就失同步，而且没人会发现（它在聊天软件预览里，不在页面上）。
// 所以这里把「数据 → 图」固化成一条能重跑的命令。
//
// 用法：node build-og-image.mjs
// 输出：og-image.jpg（站点根目录）
//
// 口径来源：与 resume-data.js 的 metrics 保持一致（6 年+ / 27 个月 /
// 93.3% @3 / 9 个 MIT 仓库）。改口径时**同时**改这里与 resume-data.js。
import { spawn } from 'node:child_process';
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync, statSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';

const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find(p => existsSync(p));
if (!EDGE) { console.error('找不到 Edge'); process.exit(1); }

const ROOT = process.cwd();
const ARCH_SVG = join(ROOT, '04-enterprise-agent', 'enterprise-agents', 'assets', 'architecture.svg');
if (!existsSync(ARCH_SVG)) { console.error('缺少架构图：' + ARCH_SVG); process.exit(1); }

const WORK = join(tmpdir(), 'og-build-' + Date.now());
mkdirSync(WORK, { recursive: true });
copyFileSync(ARCH_SVG, join(WORK, 'og-arch.svg'));

// ------------------------------------------------------------------ 版式
const HTML = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><style>
* { margin:0; padding:0; box-sizing:border-box; }
html,body { width:1200px; height:630px; overflow:hidden; }
body { font-family:"Inter","PingFang SC","Microsoft YaHei","Segoe UI",system-ui,sans-serif;
       background:linear-gradient(155deg,#fff 0%,#f7f9fd 46%,#eef3fb 100%); color:#0f172a; position:relative; }
.bar { position:absolute; inset:0 0 auto 0; height:7px;
       background:linear-gradient(90deg,#2563eb,#0e7490 55%,#22d3ee); }
.grid { position:absolute; inset:0; opacity:.5;
  background-image:linear-gradient(to right,rgba(37,99,235,.055) 1px,transparent 1px),
                   linear-gradient(to bottom,rgba(37,99,235,.055) 1px,transparent 1px);
  background-size:34px 34px; }
.wrap { position:relative; height:100%; padding:26px 56px 74px; display:flex; align-items:center; }
.left { width:610px; flex:none; }
.name { font-size:68px; font-weight:800; letter-spacing:-1.8px; line-height:1.04; }
.name .dot { color:#2563eb; }
.role { margin-top:14px; font-size:28px; font-weight:700; color:#2563eb; letter-spacing:-.3px; }
.lede { margin-top:16px; font-size:17px; line-height:1.62; color:#475569; max-width:582px; }
.lede b { color:#0f172a; }
.nums { margin-top:28px; display:flex; gap:11px; }
.num { background:rgba(255,255,255,.92); border:1px solid #e2e8f0; border-radius:13px; padding:12px 16px 13px;
       box-shadow:0 6px 18px rgba(15,23,42,.055); }
.num b { display:block; font-size:28px; font-weight:800; color:#2563eb; letter-spacing:-.7px;
         line-height:1.12; font-variant-numeric:tabular-nums; }
.num span { display:block; margin-top:3px; font-size:12px; font-weight:600; color:#64748b; }
.foot { position:absolute; left:56px; bottom:34px; display:flex; align-items:center; gap:10px;
        font-size:15px; color:#475569; }
.foot .live { width:9px; height:9px; border-radius:50%; background:#22c55e; }
.foot code { font-family:inherit; font-weight:700; color:#2563eb; }
.right { flex:1; display:flex; align-items:center; justify-content:flex-end; }
.shot { width:468px; background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:16px;
        box-shadow:0 20px 46px rgba(15,23,42,.13); }
.shot img { display:block; width:100%; height:auto; border-radius:8px; }
.shot .cap { margin-top:11px; font-size:12.5px; color:#64748b; text-align:center; }
</style></head><body>
  <div class="bar"></div><div class="grid"></div>
  <div class="wrap">
    <div class="left">
      <div class="name">黄家辉<span class="dot">.</span></div>
      <div class="role">企业级 AI Agent 开发工程师 / FDE</div>
      <p class="lede"><b>6 年+ 企业科技服务</b>（2021.04 至今），AI 工程实践 <b>27 个月</b>：
        把 AI Agent 从 Demo 做到能评测、能观测、能落地。</p>
      <div class="nums">
        <div class="num"><b>6 年+</b><span>企业科技服务</span></div>
        <div class="num"><b>27 个月</b><span>AI 工程实践</span></div>
        <div class="num"><b>93.3%</b><span>RAG 准确率 @3</span></div>
        <div class="num"><b>9</b><span>MIT 开源仓库</span></div>
      </div>
    </div>
    <div class="right">
      <div class="shot">
        <img src="./og-arch.svg" alt="enterprise-agent 六层架构图">
        <div class="cap">enterprise-agent 六层架构（已开源）</div>
      </div>
    </div>
  </div>
  <div class="foot"><span class="live"></span><span>每个数字都可点开验证</span>
    <code>jav1es.github.io/portfolio</code></div>
</body></html>`;

const pagePath = join(WORK, 'og-build.html');
writeFileSync(pagePath, HTML, 'utf8');

const pngPath = join(WORK, 'og.png');
// ⚠️ 本机 Edge 常驻进程会让 headless 报 "Multiple targets are not supported"
//    并挂到超时 —— 必须独立 user-data-dir（同 _book/build_book.py:121-123）。
const uri = 'file:///' + pagePath.replace(/\\/g, '/').replace(/ /g, '%20');
execFileSync(EDGE, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  '--force-device-scale-factor=1', '--virtual-time-budget=6000',
  '--user-data-dir=' + join(WORK, 'profile'),
  '--window-size=1200,630',
  '--screenshot=' + pngPath,
  uri,
], { stdio: 'ignore', timeout: 120000 });

if (!existsSync(pngPath)) { console.error('Edge 未产出 PNG'); process.exit(1); }

// PNG → JPG（brief 要求 ≤300KB；Node 无内置 JPEG 编码，交给 PIL）
const outPath = join(ROOT, 'og-image.jpg');
const py = `
from PIL import Image
import os
im = Image.open(r"${pngPath}").convert("RGB")
for q in (92, 88, 84, 80, 76):
    im.save(r"${outPath}", "JPEG", quality=q, optimize=True, progressive=True)
    if os.path.getsize(r"${outPath}") <= 300*1024:
        break
print(os.path.getsize(r"${outPath}"))
`;
try {
  const size = execFileSync('python', ['-c', py], { encoding: 'utf8', timeout: 60000 }).trim();
  console.log(`OK  og-image.jpg  ${size} bytes  (1200x630)`);
} catch (e) {
  console.error('JPG 转换失败（需要 Python + Pillow）：' + e.message);
  process.exit(1);
}
try { rmSync(WORK, { recursive: true, force: true }); } catch { /* 忽略 */ }
