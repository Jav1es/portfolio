// extract-works.mjs —— 从 legacy-singlepage.html 抽取 18 个模块为 works-data.json
// 用法：node extract-works.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('legacy-singlepage.html', 'utf8');

// 截取 const ITEMS = [ ... ]; 之间的数组源码
const start = html.indexOf('const ITEMS = [');
const arrStart = html.indexOf('[', start);
const arrEnd = html.indexOf('\n];', arrStart);
const src = html.slice(arrStart, arrEnd + 2);

// 在沙盒里 eval 出真实数组（数据是纯字面量，安全可控）
const ITEMS = new Function('return ' + src)();

// 六类定义
const cstart = html.indexOf('const CATS = [');
const cEnd = html.indexOf('\n];', cstart);
const CATS = new Function('return ' + html.slice(cstart, cEnd + 2).replace('const CATS = ', ''))();

// 按页面需要抽取字段（去掉 steps/hard/retro 等超长字段，另存到详情页数据）
const slim = ITEMS.map((it, i) => ({
  no: String(i + 1).padStart(2, '0'),
  t: it.t,
  cat: it.cat,
  star: !!it.star,
  status: it.status || '',
  jd: it.jd || '',
  pitch: it.pitch || '',
  highlights: it.highlights || [],
  tags: (it.tools || []).slice(0, 5),
  links: it.links || [],
  shot: it.shot || it.archImg || '',
  metric: (it.metrics || [])[0] || ''
}));

// 仅 slim（首页总览 + 岗位页卡片用），体积可控
const payload = {
  cats: CATS.map(c => ({ id: c.id, no: c.no, name: c.name, icon: c.icon, desc: c.desc, star: c.star, pick: c.pick })),
  items: slim
};

writeFileSync('works-data.json', JSON.stringify(payload, null, 2), 'utf8');

// 同时输出 JS 版：file:// 直接双击打开时 fetch 会被 CORS 拦掉，故内联数据
writeFileSync('works-data.js',
  '// 由 extract-works.mjs 自动生成，请勿手改。\n' +
  'window.__WORKS_DATA__ = ' + JSON.stringify(payload) + ';\n', 'utf8');

console.log('OK cats=%d items=%d', CATS.length, slim.length);
console.log('roles:', JSON.stringify(
  slim.reduce((acc, s) => (acc[s.cat] = (acc[s.cat] || 0) + 1, acc), {})));
console.log('shots:', slim.filter(s => s.shot).map(s => s.no).join(',') || '(none)');
