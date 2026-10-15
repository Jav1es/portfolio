// patch-works.mjs —— 在 works-data.json 基础上：
//   1) 按「本地目录 / GitHub 仓库」的真实归属重排模块编号
//   2) 补入 3 个此前遗漏的真实作品：11 FDE 交付物模板、19 高企自评 PWA、20 workbuddy-bridge
//   3) 为每个模块分配示意图编号（cover 字段），供 works.js 渲染 SVG 示意图
// 用法：node patch-works.mjs   （在 extract-works.mjs 之后运行）
import { readFileSync, writeFileSync } from 'node:fs';

const data = JSON.parse(readFileSync('works-data.json', 'utf8'));

// ---------------------------------------------------------------------------
// 1) 真实归属映射：旧模块标题 -> 真实编号（对齐本地目录 / GitHub 仓库）
//    本地目录实证：
//      01-ai-toolkit 02-ecommerce-ai 03-finance-admin-trade-ai
//      04-enterprise-agent 05-bi-chatbi 06-rpa 07-prompt-engineering
//      08-training-sop 09-tech-ops 10-retro-reports 11-fde-templates
//      12-dsh-bridge 15-dsh-plugins 17-knowledge-guide
//    GitHub 实证：enterprise-agents / dsh-bridge / dsh-local-plugins
//                   dsh-toolkit / dsh-knowledge-guide / dsh-prompt-compiler / workbuddy-bridge
// 编号规则（有本地目录的严格对齐目录号，无目录的填入剩余空位，保证 01..21 连续无缺口）：
//      目录实证 → 01 规划包 / 02 问答AIGC / 03 财务外贸 / 04 enterprise-agent / 05 业务库
//                  06 办公自动化 / 07 Prompt / 08 培训SOP / 09 技术底座 / 10 复盘
//                  11 fde-templates / 12 dsh-bridge / 15 dsh-plugins / 17 知识指南 / 18 prompt-compiler
//      无独立目录 → 13 RAG Demo、14 评测可观测性、16 MCP三件套、19 运维工具箱、
//                  20 高企自评 PWA、21 workbuddy-bridge（均以 GitHub 仓库为准）
const TITLE_TO_NO = {
  'AI 工具体系 0-1 搭建规划包':                              '01',
  'AI 工作流落地标杆 A：企业智能问答与申报文档 AIGC':            '02',
  'AI 工作流落地标杆 B：财务 / 行政 / 外贸跟单':                 '03',
  '企业级智能体系统（本地开发工程 enterprise-agent）':           '04',
  '业务数据库与数据监测报告（SQL 报表 + BI/ChatBI）':          '05',
  '办公流程自动化（Open Claw + Python 脚本）':                 '06',
  'Prompt 工程与评测体系':                                     '07',
  '培训 / SOP / 推广运营包':                                  '08',
  '技术底座与运维证据':                                      '09',
  '项目复盘与量化数据报告':                                   '10',
  'FDE 交付物模板：Discovery Brief × Eval Plan':               '11',
  'dsh-bridge：让 Marvis 调用本机 DeepSeek Harness（开源）':     '12',
  'RAG 知识库 Demo（enterprise-agent 真实带数据演示）':        '13',
  'AI 评测与可观测性（评测集纳入 CI 回归 + OTel/Jaeger 全链路追踪）': '14',
  'DeepSeek Harness 本机插件三件套（开源）':                    '15',
  '企业级智能体 MCP Server 三件套（开源）':                     '16',
  '知识指南：把「先检索再作答」写成可复用的规程（开源）':         '17',
  'dsh-prompt-compiler：可编程的 prompt 编译层（DSH 插件，开源）': '18',
  'DSH 运维工具箱：升级自检 / 插件兼容预检 / 生态全量调研（开源）': '19',
  '高企认定评分自评系统（离线 PWA）':                           '20',
  'workbuddy-bridge：让 Marvis 调用本机 WorkBuddy':             '21'
};

// 重编号并按新编号排序（幂等：EXTRA 补入过的模块若再次运行需跳过）
const EXTRA_TITLES = new Set([
  'FDE 交付物模板：Discovery Brief × Eval Plan',
  '高企认定评分自评系统（离线 PWA）',
  'workbuddy-bridge：让 Marvis 调用本机 WorkBuddy'
]);

const items = data.items
  .filter(it => !EXTRA_TITLES.has(it.t))
  .map(it => {
    const no = TITLE_TO_NO[it.t];
    if (!no) throw new Error('未在映射表中的模块：' + it.t);
    return { ...it, no };
  });

// ---------------------------------------------------------------------------
// 2) 补入 3 个真实但此前遗漏的作品
// ---------------------------------------------------------------------------
const EXTRA = [
  {
    no: '11',
    t: 'FDE 交付物模板：Discovery Brief × Eval Plan',
    cat: 'flow',
    star: true,
    status: '已交付',
    jd: 'FDE 前线部署工程师',
    pitch: '把「进客户门 → 诊断缺口 → 形成可验证交付范围」与「上线前怎么验证、上线后怎么监控」沉淀成两份标准件，任何新客户都能直接套用。',
    highlights: [
      { num: '2 份', label: '可复用标准件' },
      { num: '1 周', label: '签单到申报交付最快记录' },
      { num: '60+', label: '单年通过项目数' }
    ],
    tags: ['Discovery Brief', 'Eval Plan', 'SOP 模板', '评测门禁'],
    links: [
      'Discovery Brief 客户发现简报|./11-fde-templates/DiscoveryBrief_高企认定客户发现简报.md',
      'Eval Plan 工程评测计划|./11-fde-templates/EvalPlan_enterprise-agent评测计划.md'
    ],
    shot: '',
    metric: '两份全文可直接阅读，数据取自真实客户台账并已脱敏'
  },
  {
    no: '20',
    t: '高企认定评分自评系统（离线 PWA）',
    cat: 'oss',
    star: true,
    status: '个人开源',
    jd: 'VibeCoding / VibeEngineering 工程师',
    pitch: '把高企认定的评分规则做成一个能离线跑的自评工具：六步实时算分、雷达图诊断、整改建议直出，数据只留在浏览器里，不上传不联网。',
    highlights: [
      { num: '6 步', label: '实时算分' },
      { num: '8 条', label: '一票否决预检' },
      { num: '0 依赖', label: '零安装零后端' }
    ],
    tags: ['原生 JS', '规则引擎', 'PWA', '离线可用', '数据不出端'],
    links: [
      '在线体验|https://jav1es.github.io/portfolio/hitech-self-assessment/',
      '使用说明|./hitech-self-assessment/使用说明.md',
      '评分规则（policy.json）|./hitech-self-assessment/rules/policy.json'
    ],
    shot: '',
    metric: 'rule-engine.js 28.9KB 规则引擎 + app.js 31.9KB 六步流程，Service Worker 离线缓存'
  },
  {
    no: '21',
    t: 'workbuddy-bridge：让 Marvis 调用本机 WorkBuddy',
    cat: 'oss',
    star: false,
    status: '个人开源',
    jd: 'VibeCoding / VibeEngineering 工程师',
    pitch: 'dsh-bridge 的同构延伸：把本机 WorkBuddy 封装成 MCP 桥接层，让腾讯 Marvis 能把它当子 Agent 调用，两个桌面 Agent 之间形成可编排的协作链路。',
    highlights: [
      { num: 'MCP', label: '标准协议桥接' },
      { num: '子 Agent', label: '可被上级编排' }
    ],
    tags: ['MCP Server', '桥接层', '跨应用编排', 'Windows'],
    links: [
      'GitHub 仓库：workbuddy-bridge|https://github.com/Jav1es/workbuddy-bridge',
      '同源项目：dsh-bridge|https://github.com/Jav1es/dsh-bridge'
    ],
    shot: '',
    metric: '与 dsh-bridge 同一套设计：Skill + MCP 两种接入，上级 Agent 自主决定何时下放'
  }
];

const all = [...items, ...EXTRA].sort((a, b) => a.no.localeCompare(b.no));

// ---------------------------------------------------------------------------
// 3) 示意图：按类目分配几何母题（works.js 据此生成内联 SVG，不依赖任何外部图片）
// ---------------------------------------------------------------------------
const MOTIF = {
  plan:     'roadmap',   // 路线图 / 步骤链
  flow:     'pipeline',  // 流程管道
  agent:    'neural',    // 节点网络
  data:     'metrics',   // 数据柱状 / 折线
  oss:      'terminal',  // 终端 / 代码
  industry: 'grid'       // 蓝图网格
};

for (const it of all) {
  it.motif = MOTIF[it.cat] || 'grid';
  if (it.legacyNo) delete it.legacyNo;
}

data.items = all;
writeFileSync('works-data.json', JSON.stringify(data, null, 2), 'utf8');
writeFileSync('works-data.js',
  '// 由 extract-works.mjs + patch-works.mjs 生成，请勿手改。\n' +
  'window.__WORKS_DATA__ = ' + JSON.stringify(data) + ';\n', 'utf8');

// 类目描述同步（模块数变了）
data.cats.find(c => c.id === 'oss').star =
  '不只会用工具，还能造工具——9 个独立开源仓库，从 MCP Server 到宿主插件、离线 PWA、运维工具链与检索规程，全部带测试与文档。';

console.log('模块总数：%d', all.length);
console.log('编号：%s', all.map(i => i.no).join(' '));
console.log('分类：%s', JSON.stringify(all.reduce((a, i) => (a[i.cat] = (a[i.cat] || 0) + 1, a), {})));
console.log('本地目录引用：%d 条', all.flatMap(i => i.links).filter(l => /\.\/\d\d-/.test(l)).length);