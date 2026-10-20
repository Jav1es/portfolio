// build-resume-pdf.mjs —— 用 Edge 无头打印生成两份真实 PDF 简历
//
// 为什么用无头打印而不是「让用户自己按 Ctrl+P」：
//   brief P0-1 —— HR 转化路径上的唯一硬断点就是「下载简历」落到打印对话框而不是文件。
//
// 用法：node build-resume-pdf.mjs
// 产物：resume-ai-agent.pdf / resume-fde.pdf（站点根目录，随 Pages 发布）
//
// ⚠️ 本机 Edge 有常驻进程，headless 必须用**独立 user-data-dir** 隔离，
//    否则报 "Multiple targets are not supported in headless mode" 并挂到超时。
//    这条坑的原始记录在已删除的 _book/build_book.py:121-123；
//    现行可用调用见本文件下方 execFileSync(EDGE, [...]) 段。
import { existsSync, statSync, rmSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const EDGE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

const ROOT = process.cwd();
const PROFILE_DIR = resolve(ROOT, '.dsh-workspace', 'artifacts', 'edge-pdf-profile');

const TARGETS = [
  { ver: 'agent', out: 'resume-ai-agent.pdf' },
  { ver: 'fde', out: 'resume-fde.pdf' },
];

const edge = EDGE_CANDIDATES.find(p => existsSync(p));
if (!edge) {
  console.error('找不到 Edge，尝试过：\n  ' + EDGE_CANDIDATES.join('\n  '));
  process.exit(1);
}

mkdirSync(PROFILE_DIR, { recursive: true });

// file:// URI，空格必须转义（仓库路径含空格）
const pageUri = 'file:///' + resolve(ROOT, 'resume.html').replace(/\\/g, '/').replace(/ /g, '%20');

let failed = 0;
for (const t of TARGETS) {
  const out = resolve(ROOT, t.out);
  if (existsSync(out)) rmSync(out);
  const uri = pageUri + '?ver=' + t.ver;
  try {
    execFileSync(edge, [
      '--headless=new',
      '--disable-gpu',
      '--no-pdf-header-footer',
      '--no-margins',
      '--user-data-dir=' + PROFILE_DIR,
      '--virtual-time-budget=20000',
      '--print-to-pdf=' + out,
      uri,
    ], { stdio: 'ignore', timeout: 180000 });
  } catch (e) {
    console.error(`  [${t.ver}] Edge 退出异常：${e.message}`);
  }
  if (!existsSync(out)) {
    console.error(`  [${t.ver}] FAIL 未产出 ${t.out}`);
    failed++;
    continue;
  }
  const size = statSync(out).size;
  // 一个只有骨架的 PDF 通常 < 5KB，说明 JS 没渲染完就打印了
  const ok = size > 5000;
  console.log(`  [${t.ver}] ${ok ? 'OK  ' : 'WARN'} ${t.out}  ${size} bytes${ok ? '' : '  (<5KB，可能 JS 未渲染完)'}`);
  if (!ok) failed++;
}

console.log('');
console.log(failed === 0 ? '两份 PDF 均生成成功。' : `有 ${failed} 项异常，请检查。`);
process.exit(failed === 0 ? 0 : 1);
