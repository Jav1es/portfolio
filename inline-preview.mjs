// inline-preview.mjs —— 生成独立的预览数据文件（懒加载，不进首屏）
// 用法：node inline-preview.mjs（在 enrich-works.mjs 之后运行，幂等）
//
// 为什么独立文件而不是内联进 works-data：
//   首屏只需要标题/摘要/链接，全文预览是按需的。
//   内联会让 works-data.js 从 26KB 涨到 180KB+，拖慢首屏。
// 为什么不用 fetch 读原文件：
//   file:// 协议下浏览器用 CORS 拦掉本地 fetch，站内预览会失败。
//   独立 JS 文件用 <script> 引入则不受此限制（file:// 下脚本照样加载）。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const data = JSON.parse(readFileSync('works-data.json', 'utf8'));

const PREVIEW_LIMIT = 8000;   // 每文件预览字符上限
const PREVIEWABLE = /\.(md|json|py|txt)$/i;

// 1) 产出预览数据（独立文件，按需加载）
const previews = {};
for (const it of data.items) {
  const list = [];
  for (const l of (it.links || [])) {
    const p = l.split('|');
    if (p.length !== 2) continue;
    const [label, href] = p;
    if (!href.startsWith('./') || !PREVIEWABLE.test(href)) continue;

    const file = href.slice(2).replace(/\//g, '\\');
    if (!existsSync(file)) continue;

    const raw = readFileSync(file, 'utf8');
    list.push({
      label,
      file: href.slice(2),
      ext: (href.match(/\.([a-z0-9]+)$/i) || [])[1] || '',
      body: raw.length > PREVIEW_LIMIT ? raw.slice(0, PREVIEW_LIMIT) : raw,
      truncated: raw.length > PREVIEW_LIMIT,
      fullLength: raw.length
    });
  }
  if (list.length) previews[it.no] = list;
}

writeFileSync('works-previews.js',
  '// 由 inline-preview.mjs 生成：作品证明文件的站内预览内容（懒加载）\n' +
  'window.__WORKS_PREVIEWS__ = ' + JSON.stringify(previews) + ';\n', 'utf8');

// 2) works-data 里只留「该模块有哪几个可预览文件」的索引，不带正文
for (const it of data.items) {
  delete it.previews;
}

writeFileSync('works-data.json', JSON.stringify(data, null, 2), 'utf8');
writeFileSync('works-data.js',
  '// 由 extract + patch + enrich + inline-preview 生成，请勿手改。\n' +
  'window.__WORKS_DATA__ = ' + JSON.stringify(data) + ';\n', 'utf8');

// 预览索引单独出一个小文件（几 KB），供 works.js 判断哪些链接带「预览」按钮
const index = {};
for (const no of Object.keys(previews)) {
  index[no] = previews[no].map(p => ({ file: p.file, ext: p.ext }));
}
writeFileSync('works-previews-index.js',
  '// 由 inline-preview.mjs 生成：哪些模块有可预览文件（小体积，随首屏同步引入）\n' +
  'window.__WORKS_PREVIEW_INDEX__ = ' + JSON.stringify(index) + ';\n', 'utf8');

console.log('预览文件数：%d，覆盖模块 %d 个',
  Object.values(previews).reduce((n, l) => n + l.length, 0),
  Object.keys(previews).length);
console.log('首屏数据 works-data.js %d B / 索引 %d B / 正文(懒加载) %d B',
  readFileSync('works-data.js').length,
  readFileSync('works-previews-index.js').length,
  readFileSync('works-previews.js').length);
