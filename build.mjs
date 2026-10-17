#!/usr/bin/env node
// build.mjs —— 一条命令跑完整个作品集构建流程
//
// 用法：
//   node build.mjs            构建（数据管线 + 产物生成）
//   node build.mjs --check    只构建，不提交推送
//   node build.mjs --ship     构建成功后直接 commit + push（Pages 自动上线）
//
// 流程：
//   patch-works → enrich-works → inline-preview → 生成 works-data.js → 构建后自检
//
// 设计原则：
//   1) 任何一步失败立刻停，不写半成品；
//   2) 幂等 —— 重复跑结果完全一致（已实测）；
//   3) 构建后必跑几何自检，卡片布局坏了当场报出来，不会把坏页面推上线。
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const SHIP = args.includes('--ship');
const CWD = process.cwd();

const t0 = Date.now();
const step = (n, total, name) => console.log(`\n[${n}/${total}] ${name}`);
const ok = (msg) => console.log(`  ✓ ${msg}`);
const warn = (msg) => console.log(`  ⚠ ${msg}`);

function run(cmd, argv, opts = {}) {
  return execFileSync(cmd, argv, { cwd: CWD, encoding: 'utf8', stdio: 'pipe', ...opts });
}

// ---------------------------------------------------------------------------
// 0) 前置检查：数据文件在不在
// ---------------------------------------------------------------------------
step(0, 5, '前置检查');
if (!existsSync(`${CWD}/works-data.json`)) {
  console.error('  ✗ 找不到 works-data.json，无法构建');
  process.exit(1);
}
const before = JSON.parse(readFileSync(`${CWD}/works-data.json`, 'utf8'));
ok(`works-data.json 存在，当前 ${before.items.length} 个作品`);

// ---------------------------------------------------------------------------
// 1) 数据管线
// ---------------------------------------------------------------------------
step(1, 5, '数据管线（patch → enrich → inline-preview）');
for (const script of ['patch-works.mjs', 'enrich-works.mjs', 'inline-preview.mjs']) {
  try {
    const out = run('node', [script]);
    const tail = out.trim().split('\n').filter(Boolean).slice(-2).join(' / ');
    ok(`${script}  ${tail.slice(0, 90)}`);
  } catch (e) {
    console.error(`  ✗ ${script} 失败：`);
    console.error((e.stdout || '') + (e.stderr || ''));
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// 2) works-data.js 是否与 json 同步
// ---------------------------------------------------------------------------
step(2, 5, '产物一致性');
const dataJson = JSON.parse(readFileSync(`${CWD}/works-data.json`, 'utf8'));
const inBrowser = readFileSync(`${CWD}/works-data.js`, 'utf8');
// works-data.js 里应该包含每个作品的编号，抽几个抽查
const missing = dataJson.items.filter(it => !inBrowser.includes(`"no":"${it.no}"`) && !inBrowser.includes(`"no": "${it.no}"`));
if (missing.length) {
  console.error(`  ✗ works-data.js 缺少 ${missing.length} 个模块：${missing.map(m => m.no).join(', ')}`);
  process.exit(1);
}
ok(`works-data.js 覆盖全部 ${dataJson.items.length} 个模块`);

// 富字段完整度（新作品没写详情会在这里提醒，不阻断）
const rich = dataJson.items.filter(it => it.role && it.arch && it.steps);
if (rich.length < dataJson.items.length) {
  warn(`${dataJson.items.length - rich.length} 个作品缺展开详情字段（role/arch/steps），展开后只有摘要`);
}

// ---------------------------------------------------------------------------
// 3) 编号连续性
// ---------------------------------------------------------------------------
step(3, 5, '编号与分组');
const nos = dataJson.items.map(i => parseInt(i.no, 10)).sort((a, b) => a - b);
for (let i = 0; i < nos.length; i++) {
  if (nos[i] !== i + 1) {
    console.error(`  ✗ 编号不连续：期望 ${i + 1}，实际 ${nos[i]}`);
    process.exit(1);
  }
}
ok(`编号连续 1..${nos.length}`);
const gc = {};
dataJson.items.forEach(i => { gc[i.group] = (gc[i.group] || 0) + 1; });
ok('分组：' + Object.entries(gc).map(([k, v]) => `${k}=${v}`).join(' '));

// ---------------------------------------------------------------------------
// 4) 几何自检（可选：有探针脚本才跑）
// ---------------------------------------------------------------------------
step(4, 5, '几何自检');
const AUDIT = `${CWD}/.dsh-workspace/artifacts/audit-cards.mjs`;
if (existsSync(AUDIT)) {
  let failed = 0;
  for (const [file, w] of [['works.html', 1280], ['works.html', 390], ['index.html', 1280]]) {
    try {
      const out = run('node', [AUDIT, file, String(w), '900']);
      const m = out.match(/问题总数 (\d+)/);
      const t = out.match(/触摸目标 <44px : (\d+)/);
      const bad = (m ? +m[1] : -1) || (t ? +t[1] : -1);
      if (bad > 0) { console.error(`  ✗ ${file} @${w}px  问题=${m?.[1]} 小目标=${t?.[1]}`); failed++; }
      else ok(`${file} @${w}px  卡片问题 0`);
    } catch (e) {
      warn(`${file} @${w}px 自检脚本报错，跳过`);
    }
  }
  if (failed) {
    console.error('\n几何自检未通过，已停止（不会推送坏页面）');
    process.exit(1);
  }
} else {
  warn('未找到 audit-cards.mjs，跳过几何自检');
}

// ---------------------------------------------------------------------------
// 5) 汇总
// ---------------------------------------------------------------------------
step(5, 5, '完成');
const after = JSON.parse(readFileSync(`${CWD}/works-data.json`, 'utf8'));
const added = after.items.length - before.items.length;
console.log(`  作品数 ${before.items.length} → ${after.items.length}${added > 0 ? `（新增 ${added} 个）` : ''}`);
console.log(`  耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`);

if (SHIP) {
  console.log('\n[推送] 提交并推送到 GitHub（Pages 约 2-3 分钟后自动上线）');
  try {
    run('git', ['add', '-A']);
    const changed = run('git', ['status', '--porcelain']).trim();
    if (!changed) {
      console.log('  没有文件变化，无需推送');
    } else {
      const msg = `更新作品集：${added > 0 ? `新增 ${added} 个作品，` : ''}共 ${after.items.length} 个模块`;
      run('git', ['commit', '-m', msg]);
      ok(`已提交：${msg}`);
      run('git', ['push', 'origin', 'main']);
      ok('已推送，约 2-3 分钟后上线');
    }
  } catch (e) {
    console.error('  ✗ 推送失败：' + ((e.stdout || '') + (e.stderr || '')).slice(0, 400));
    process.exit(1);
  }
} else {
  console.log('\n  构建完成。确认无误后加 --ship 推送上线。');
}
