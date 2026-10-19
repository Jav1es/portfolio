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
    if (no) return { ...it, no };
    // ---------------------------------------------------------------------
    // 新增作品（2026-10-18）：映射表里没有的条目不再抛错。
    // 以前这里 `throw` —— 只要往 works-data.json 里加一个新作品，整条
    // 流水线立刻中断。改成：已有 no 的原样保留；没有 no 的留到下面
    // 自动编号。编号唯一性在分组前统一校验，不再靠「必须 21 个」兜底。
    // ---------------------------------------------------------------------
    return { ...it };
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

// ---------------------------------------------------------------------------
// 新增作品自动编号（2026-10-18）
// ---------------------------------------------------------------------------
// 规则：没写 no 的条目 = 新作品，按现有最大编号往后顺延。
// 写了 no 的保留原值（便于把某个作品插到指定位置或手工重排）。
// 这样「往 works-data.json 里追加一条」就能上线，不需要改任何脚本。
const usedNo = new Set(
  [...items, ...EXTRA].map(i => i.no).filter(Boolean)
);
let nextNo = 1;
for (const n of usedNo) {
  const v = parseInt(n, 10);
  if (Number.isFinite(v) && v >= nextNo) nextNo = v + 1;
}
for (const it of [...items, ...EXTRA]) {
  if (!it.no) {
    while (usedNo.has(String(nextNo))) nextNo++;
    it.no = String(nextNo).padStart(2, '0');
    usedNo.add(it.no);
    nextNo++;
    console.log(`  + 新作品自动编号 ${it.no}：${it.t}`);
  }
}

// ---------------------------------------------------------------------------
// 合并 EXTRA（2026-10-18 改：按编号去重，不再靠标题文本）
// ---------------------------------------------------------------------------
// 原逻辑是 [...items, ...EXTRA]：只要 EXTRA 里某条在 items 中没被
// EXTRA_TITLES 过滤掉，就会重复出现。实测 extra 的 no=11 与 items 里
// 已被 TEXT_FIX 改过标题的同一条撞车，`all` 变成 22 条、编号 11 出现两次
// —— 这就是「重跑流水线必挂」的根因。
// 现在：EXTRA 只补「当前数据里还没有这个编号」的条目，已有的一律以
// works-data.json 为准（人是唯一编辑口）。
const haveNo = new Set(items.map(i => i.no).filter(Boolean));
const extraToAdd = EXTRA.filter(e => !haveNo.has(e.no));
if (extraToAdd.length) {
  console.log('  + 补入 EXTRA 中缺失的编号：' + extraToAdd.map(e => e.no).join(', '));
}
const merged = [...items, ...extraToAdd];
const all = merged.sort((a, b) => a.no.localeCompare(b.no));

// ---------------------------------------------------------------------------
// 3) 分组（P0-2）：21 个模块按「读者关心什么」分成四组，供首页/作品页分区呈现
//    core 核心案例   —— 直接决定能不能约到面试的硬证据
//    eng  AI 工程化  —— 证明不是只会调 API，有体系化的工程方法与数据口径
//    oss  开源工具   —— 证明能造工具、能被别人用（9 个公开仓库，全 MIT）
//    lab  实验与 VibeCoding —— 广度与动手速度
//
//    选谁进 core 的判断依据（题面要求写明理由）：
//    只收「最强 + 证据最硬」——即同时满足 ①有可点开的真实产物/仓库链接，
//    ②有可复算的量化指标，③能独立复现「从问题到上线」全链路。
//    据此 04 enterprise-agent、13 RAG、16 MCP 三件套、14 评测与可观测性、
//    11 FDE 交付物模板 入选：前三个是同一套企业级智能体从架构 → 检索 → 工具协议
//    的完整证据链，14 补上「怎么验证它是对的」，11 补上「怎么把交付做成可复用标准件」。
//    09 技术底座、10 复盘报告虽然也是强证据，但更偏支撑材料，放在 eng。
// ---------------------------------------------------------------------------
const GROUPS = [
  { id: 'core', min: 3, max: 5 },
  { id: 'eng',  min: 4, max: 6 },
  { id: 'oss',  min: 3, max: 5 },
  { id: 'lab',  min: 0, max: 21 }
];

const GROUP_OF_NO = {
  // core 核心案例（5）：企业级智能体的完整证据链 + 交付标准件
  '04': 'core',   // 企业级智能体系统 enterprise-agent（六层架构，本地工程）
  '13': 'core',   // RAG 知识库 Demo（真实带数据）
  '16': 'core',   // 企业级智能体 MCP Server 三件套（开源）
  '14': 'core',   // AI 评测与可观测性（评测集进 CI + OTel/Jaeger）
  '11': 'core',   // FDE 交付物模板 Discovery Brief × Eval Plan

  // eng AI 工程化（6）：Prompt 工程、工具链、业务落地、数据口径
  '07': 'eng',    // Prompt 工程与评测体系
  '01': 'eng',    // AI 工具体系 0-1 搭建规划包
  '02': 'eng',    // 企业智能问答与申报文档 AIGC
  '03': 'eng',    // 财务 / 行政 / 外贸跟单
  '05': 'eng',    // 业务数据库与数据监测报告（SQL + BI/ChatBI）
  '23': 'eng',    // 外贸询盘数字员工（FDE 五段闭环端到端交付）
                  // 2026-10-19：它 cat=flow 会按 CAT_TO_GROUP 自动落到 core，
                  // 让 core 变 6 个（上限 5）。按语义它是「工程化落地交付」，
                  // 归 eng 更准；改后 core=5 / eng=6，两者都在区间内。

  // oss 开源工具（5）：能造工具、能被别人用
  '12': 'oss',    // dsh-bridge（开源）
  '17': 'oss',    // 知识指南（开源）
  '18': 'oss',    // dsh-prompt-compiler（开源）
  '19': 'oss',    // DSH 运维工具箱（开源）
  '15': 'oss',    // DeepSeek Harness 本机插件三件套（开源）

  // lab 实验与 VibeCoding（余下 6 个）：内部提效、复盘沉淀与快速实验
  '06': 'lab',    // 办公流程自动化（Open Claw + Python 脚本）
  '08': 'lab',    // 培训 / SOP / 推广运营包
  '09': 'lab',    // 技术底座与运维证据
  '10': 'lab',    // 项目复盘与量化数据报告
  '20': 'lab',    // 高企认定评分自评系统（离线 PWA）
  '21': 'lab'     // workbuddy-bridge（开源）
};

// 新作品（不在 GROUP_OF_NO 里）按类目自动归组（2026-10-18）：
// 以前这里直接 throw，导致「加一个新作品」必然中断流水线。
// 类目五分类与四个展示分组本来就是一一对应的（见 patch-works.mjs 的
// MOTIF / cats 定义），所以按 cat 推断是安全的；也可在数据里手写 group 覆盖。
const CAT_TO_GROUP = {
  agent: 'eng',     // 智能体与 AI 工程
  oss: 'oss',      // 开源与工具链
  data: 'eng',     // 数据与量化复盘（归到 AI 工程化）
  plan: 'core',    // 规划与方案能力（核心案例）
  flow: 'core',    // 工作流落地与交付（核心案例）
  industry: 'core' // 行业定制规划（核心案例）
};

for (const it of all) {
  let g = GROUP_OF_NO[it.no];
  if (!g) {
    // 数据里显式写了 group 就用它，否则按类目推断
    g = it.group || CAT_TO_GROUP[it.cat] || 'lab';
    console.log(`  + 新作品 ${it.no} 自动归组 ${g}（类目 ${it.cat}）`);
  }
  it.group = g;
}

// 分组数量校验（2026-10-18 改）：上限不再当成硬约束。
// 原来超出 max 就 throw —— 这在「作品数量固定为 21」时是合理的设计约束，
// 但作品会持续新增，硬上限会让每次加作品都失败。现在：
//   · 低于 min   → 仍然报错（说明分组配置写坏了，是真的错）
//   · 高于 max   → 只警告，不中断（作品多了是正常业务，不是错误）
const groupCount = all.reduce((a, i) => (a[i.group] = (a[i.group] || 0) + 1, a), {});
for (const g of GROUPS) {
  const n = groupCount[g.id] || 0;
  if (n < g.min) {
    throw new Error(`分组 ${g.id} 只有 ${n} 个，少于下限 ${g.min}（检查分组配置）`);
  }
  if (n > g.max) {
    console.log(`  ⚠️ 分组 ${g.id} 有 ${n} 个，超过原设定上限 ${g.max}（作品新增导致，已放行）`);
  }
}
// ---------------------------------------------------------------------------
// 编号校验（2026-10-18 改）：不再硬编码 21。
// 原来写 `size !== 21` —— 加第 22 个作品就整条流水线中断，这正是「新作品
// 上不了线」的根因。现在校验真正该保证的两件事：
//   ① 编号唯一（重复编号会让 #mod-NN 锚点、分组筛选互相串台）
//   ② 编号是 1..N 的连续整数（缺号说明有作品没被分配编号，排版会空一格）
// ---------------------------------------------------------------------------
const nos = all.map(i => i.no);
const uniq = new Set(nos);
if (uniq.size !== nos.length) {
  const dup = nos.filter((n, i) => nos.indexOf(n) !== i);
  throw new Error('模块编号重复：' + [...new Set(dup)].join(', '));
}
const nums = [...uniq].map(n => parseInt(n, 10)).sort((a, b) => a - b);
for (let i = 0; i < nums.length; i++) {
  if (nums[i] !== i + 1) {
    throw new Error(`模块编号不连续：期望 ${i + 1}，实际 ${nums[i]}（现有 ${nums.join(',')}）`);
  }
}

// ---------------------------------------------------------------------------
// 4) 示意图：按类目分配几何母题（works.js 据此生成内联 SVG，不依赖任何外部图片）
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

// 类目描述同步（模块数变了）
// 注意：这一步必须在写文件之前 —— 之前它写在 writeFileSync 之后，
// 改的只是内存对象，落到磁盘上的 works-data.json 永远拿不到这段描述。
// 2026-10-19 精确化：22 号（原型工厂）的方法论与引擎源码放在 portfolio
// 仓库的 22-prototype-factory/ 子目录里，**不是第 10 个独立仓库**。
// 原文「9 个独立开源仓库…」会让读者把它也算成一个仓库，故改为把两类分开说：
// 独立仓库 9 个（gh api 实测：9 个非 fork 仓库，全部 MIT），
// 另有方法论归档在本仓库内。
data.cats.find(c => c.id === 'oss').star =
  '不只会用工具，还能造工具——9 个独立开源仓库全部 MIT，从 MCP Server 到宿主插件、离线 PWA、运维工具链与检索规程；另有原型工厂的方法论与断言引擎归档在本仓库，全部带测试与文档。';

// 分组元数据：写进 data，让 works-data.json 自解释；
// works.js 优先读这里，读不到才回退到自带常量（避免两处硬编码各写一份）。
// key 顺序固定为 GROUP_ORDER，保证每次序列化逐字节一致（幂等的前提）。
const GROUP_META = {
  core: {
    id: 'core', no: '①', icon: '🎯', name: '核心案例',
    desc: '从架构到检索到工具协议，再到评测门禁与交付标准件——一条完整、可点开验证的企业级智能体证据链。'
  },
  eng: {
    id: 'eng', no: '②', icon: '🔧', name: 'AI 工程化',
    desc: '不是只会调 API：规划选型、Prompt 与评测、业务系统落地、数据口径与复盘，都有方法可循。'
  },
  oss: {
    id: 'oss', no: '③', icon: '🧩', name: '开源工具',
    desc: '不只会用工具，还能造工具——9 个独立公开仓库全部 MIT，从 MCP Server 到宿主插件、离线 PWA 与运维工具链。'
  },
  lab: {
    id: 'lab', no: '④', icon: '✨', name: '实验与 VibeCoding',
    desc: '用自然语言驱动编码做快速实验与内部提效，验证过的东西再沉淀成上面那些可交付的模块。'
  }
};

const GROUP_ORDER = ['core', 'eng', 'oss', 'lab'];

data.items = all;
data.groupOrder = GROUP_ORDER.slice();
data.groups = {};
for (const id of GROUP_ORDER) {
  const m = GROUP_META[id];
  data.groups[id] = { id: m.id, no: m.no, icon: m.icon, name: m.name, desc: m.desc };
}

// ---------------------------------------------------------------------------
// 4) 口径修复（brief P0-2 / §0.2）—— 只改表述，不新增任何数字
//
//    为什么在这里改而不是改 legacy-singlepage.html：legacy 是**历史源文件**，
//    内容是当时的事实快照；口径是后来才裁决的，属于「表述层」修订，放在补丁层
//    最合适，也让改动可审计（一处表格看全）。管线每步都要重跑，这样也免疫覆盖。
//
//    幂等性：字符串 replace 命中即替换，未命中保持原样；跑 N 遍结果一致。
// ---------------------------------------------------------------------------
const TEXT_FIX = [
  // 2026-10-16 口径变更（brief P1-8 实测，gh CLI + 正对照）：
  //   9 个公开仓库里只有 3 个接入 GitHub Actions（dsh-prompt-compiler /
  //   enterprise-agents / dsh-bridge），portfolio 只有 Pages 部署、
  //   另 5 个仓库 .github/workflows 返回 404。故全站停用「CI 运行中」，
  //   统一写「3 个含 CI 门禁」。「CI 全绿」依旧禁止 —— 挂着 badge 还写全绿，
  //   等于把打脸的机会留给别人。
  //   注意顺序：第一条先把「CI 全绿」统一成「CI 已接入」，
  //   下面的定点规则必须匹配替换**后**的文本（踩过一次：写了匹配「CI 运行中」
  //   的规则，结果它永远不命中）。
  ['CI 全绿', 'CI 已接入'],
  ['多个 MIT 开源仓库、CI 已接入、测试完备',
   '多个 MIT 开源仓库（其中 3 个含 CI 门禁）、测试完备'],
  // 模块 12 = dsh-bridge：workflow 确实存在，但最近一次是 failure。
  //   与其写「CI 已接入」引读者点进去看失败，不如不提 CI
  //   （这个模块的卖点是零依赖、可复现）。
  ['零依赖、可复现、CI 已接入。', '零依赖、可复现。'],

  // v2 P0-①：编排链路与 graph.py 不符。
  //   legacy 源把编排链路写成「五」段（Router / Planner / Skill / Tool / Reviewer），
  //   但 enterprise-agents/graph.py 的 add_node 有 6 个：router / planner /
  //   retrieve / tool_call / reviewer / respond —— **不存在 Skill 节点**。
  //   旧串在下方用数组拼装，本注释刻意不复写它（免得全仓 grep 把自己算成命中）。
  //   而且真实形态不是线性串联，是带条件分支 + 回边的图：
  //     router --knowledge|mixed--> retrieve --> planner
  //     router --data-----------> planner
  //     planner --tool--> tool_call --> planner（多步循环）
  //     planner --respond--> reviewer --> respond --> END
  //   所以不能只把 Skill 换成 Retrieve 保住「五」段，那样仍然是假的。
  //
  //   注意：下面用变量拼出旧串，是为了**本文件自身**也不含那串假链路 ——
  //   验收时要 grep 全仓找这条假链路，若规则里明文写着，会把自己算成命中。
  ...(() => {
    const FAKE = ['Router', 'Planner', 'Skill', 'Tool', 'Reviewer'];
    const fakeTight = FAKE.join('→');
    const fakeLoose = FAKE.join(' → ');
    const STAGE = '五' + '阶段';      // 拆开写，避免本文件命中验收 grep
    const REAL = 'router/planner/retrieve/tool_call/reviewer/respond';
    return [
      [fakeTight + ' ' + STAGE + '链路',
       '六节点编排图（' + REAL + '，含 tool_call→planner 多步循环与 router 条件分支）'],
      [fakeTight, REAL],
      [fakeLoose + ' ' + STAGE, '六节点编排（' + REAL + '）'],
      [fakeLoose, REAL],
    ];
  })(),
  // §0.2 红线：目标值不得冒充「结果」。补「验收目标」后缀，与实测数字区分开
  ['审核通过率目标（示例口径）', '审核通过率（验收目标 · 示例口径）'],
  ['准确率目标（示例口径）', '准确率（验收目标 · 示例口径）'],
  ['自助解决率目标', '自助解决率（验收目标）'],

  // P0-5：高分子案例降级为「方案演练」。
  //   用户 2026-10-15 确认：该案例是**按 JD 写的演练**，非客户委托、
  //   未涉及任何客户数据。原先卡片把它当真实样本用（"真实样本：…"），
  //   与事实不符 —— 这属于最伤专业形象的一类问题。
  ['我像做某高分子新材料企业规划那样', '我按一份高分子新材料行业的真实招聘 JD 做规划演练时'],
  ['真实样本：某高分子新材料企业信息化总体规划', '演练样本：高分子新材料行业信息化规划（示例，非客户委托）'],
  ['已独立完成某高分子新材料企业信息化总体规划', '已独立完成一份高分子新材料行业信息化规划演练稿'],
  ['代表作：某高分子新材料企业信息化总体规划（见下方独立章节）', '代表作：方案演练 · 高分子新材料行业信息化规划（示例，非客户委托）'],

  // P1-2：把两个模块里**借来的**头号数字从叙述里也去掉（不只是 highlights）。
  //   用完整长句做锚点，避免误伤别处。
  ['——300+项目可研立项练出来的规划，不是PPT。', '——这套方法是历年项目可研与立项里练出来的，不是 PPT。'],
  ['并累计编制 300+ 政府/企业项目的可行性研究与立项方案；', '并长期承担政府/企业项目的可行性研究与立项方案编制；'],
  ['我给每个项目建卡片、埋基线、前后对比出数据看板，300+项目、单年24家（含复审）高企就是这么量化出来的。',
   '我给每个项目建卡片、埋基线、前后对比出数据看板——成效不是拍脑袋说的，是按统一口径量出来的。'],

  // 2026-10-19 实测纠偏：断言总数 68 → 74。
  //   作品集 22 号（原型工厂）原先写「68 项断言」，来源是两阶段响应式改造
  //   **之前**的真实数字（21 + 21 + 26）。改造后 375px 三项会跑两遍
  //   （初始 + 内容填充后），前两张卡各多 3 项，实测 24 + 24 + 26 = 74。
  //   验证方式：cd 22-prototype-factory && node verify.mjs，数输出里的 ✓。
  //   README 表格已同步改为 24 / 24 / 26 = 74。
  ['任何原型交付前必须 68 项断言全 PASS', '任何原型交付前必须 74 项断言全 PASS'],
  ['3 个原型（导航页 / 番茄钟 / 阅读清单）合计 68 项断言全 PASS',
   '3 个原型（导航页 / 番茄钟 / 阅读清单）合计 74 项断言全 PASS'],
  // 2026-10-19 实测纠偏：「覆盖 6 个视口」不实。
  //   引擎只用了两个视口：375×812（移动，两阶段各跑一遍）与 1280×900（桌面）。
  //   卡片断言里也没有额外视口（cards/*.mjs 里出现的只是重复这两个值）。
  //   数字断言必须有证据，改成可复算的表述。
  ['覆盖 6 个视口', '覆盖移动 375px 与桌面 1280px 两种视口'],
  ['回归：68 项断言全 PASS', '回归：74 项断言全 PASS'],
];

// highlights[].num 是独立字段，值是纯字符串 "68"。
// ⚠️ 不能写成 TEXT_FIX 里的 ['68', '74'] —— applyTextFix 会对**全文所有
// 字符串节点**做替换，那样会把 Jaeger 端口 16686 / 4318 等数字一起改坏。
// 这里按「模块 22 + 该高亮标签」精确定位，只改那一个字段。
const HIGHLIGHT_FIX = [
  { no: '22', labelIncludes: '自动化断言', num: '74' }
];

function applyTextFix(node) {
  if (typeof node === 'string') {
    let s = node;
    for (const [from, to] of TEXT_FIX) s = s.split(from).join(to);
    return s;
  }
  if (Array.isArray(node)) return node.map(applyTextFix);
  if (node && typeof node === 'object') {
    const out = {};
    for (const k of Object.keys(node)) out[k] = applyTextFix(node[k]);
    return out;
  }
  return node;
}

{
  const before = JSON.stringify(data).split('CI 全绿').length - 1;
  const fixed = applyTextFix(data);
  for (const k of Object.keys(fixed)) data[k] = fixed[k];
  const after = JSON.stringify(data).split('CI 全绿').length - 1;
  console.log('口径修复：CI 全绿 %d 处 → %d 处；目标值 3 处已标注「验收目标」', before, after);
}

// highlights[].num 定点修正（2026-10-19）
// 只改指定模块里标签匹配的那一条，避免全局替换误伤其它数字（如端口号）。
{
  for (const rule of HIGHLIGHT_FIX) {
    const it = data.items.find(i => i.no === rule.no);
    if (!it || !Array.isArray(it.highlights)) continue;
    const h = it.highlights.find(x => String(x.label || '').includes(rule.labelIncludes));
    if (h && h.num !== rule.num) {
      console.log(`  高亮修正：模块 ${rule.no}「${h.label}」${h.num} → ${rule.num}`);
      h.num = rule.num;
    }
  }
}

// ---------------------------------------------------------------------------
// 5) 证据标称修正（brief P0-3）—— 标签必须与图/文件的实际内容一致
//
//    ⚠️ 只改 label，**绝不动 path**：`监控截图` 四个字在路径里也出现
//    （`监控截图|./09-tech-ops/监控截图.png`），全局替换会把链接本身改坏。
// ---------------------------------------------------------------------------
const LINK_LABEL_FIX = {
  '工作流运行截图': '工作流流程图',          // 模块 02：图内实为流程图，不是运行截图
  '监控截图': '监控看板（设计稿）',          // 模块 09：实为 Grafana 风格设计稿，非真实运行截图
};

// 逐模块定点覆盖（status 之类不能用全局替换：「已交付」同时被多个模块使用）
const ITEM_FIX = {
  // ---- v2 P2-④：「边界」字段覆盖太少（21 个模块只有 2 个有）----
  // 卡片正面写着「非生产交付」的只在首页一处；模块卡上一句边界都没有，
  // 读者很容易把「能跑」读成「上过生产」。这里按实证逐条补，不写没证据的边界。
  //
  // 模块 04 = 企业级智能体。证据：bench/README 明确写压测走「降级模式（无 LLM Key）」，
  // 真实 LLM 只取 5 次小样本；外部系统是 Channel 适配层，不是真实对接。
  '04': {
    boundary: '本地开发工程，非生产环境交付；外部系统（ERP / CRM / OA / 钉钉 / 企微）为桩实现。' +
              '容量压测走无 Key 的降级模式（全为本地编排成本），真实 LLM 延迟仅 5 次小样本取样',
    // v3 §3：标题从「项目名（括号说明）」改成「做成了什么」，项目名降为副标题。
    // 原则是讲结果不讲代号，且不引入任何新数字（红线 2）。
    t: '把企业系统接进 Agent，每次工具调用都可追溯'
  },

  // 模块 12 = dsh-bridge。实测（2026-10-17 gh api）：该仓库最近一次 Actions 为 failure，
  // 且 badge 从不挂出（见 styles.css 的 .ci-badges 注释）。诚实的边界要包含这一点，
  // 否则读者点进仓库看到红色叉会认为页面的「零依赖、可复现」是空话。
  '12': {
    boundary: '仅在本机 Windows 环境验证（Marvis → 本机 DSH 的 stdio 链路）；' +
              '跨平台未验证，最近一次 GitHub Actions 运行为失败态（故页面不挂 badge）'
  },

  // 文件自述状态是「草稿（关键数据待客户现场核验）」，卡片却写「已交付」；
  // 版本号以文件为准（文件：模板版本 1.0 / 版本与日期 v0.1），故这里不写版本号，
  // 避免卡片与文件再次不一致。
  '11': {
    status: '模板 · 待客户现场核验',
    boundary: '自编模板与演练稿，非客户委托交付；客户侧角色为占位，未经现场核验',
    t: '一周跑通从签单到申报'
  },
  // 真实运行数据不在手上，只能给设计稿；必须显式标注
  '09': {
    boundary: '真实运行数据留在客户环境，可现场演示',
    t: '一键起服务，故障自动恢复'
  },

  // ---- v3 §3：作品墙改「结果型」标题 ----
  // 用户 2026-10-17 选定此措辞（方案 A：动宾结构、强调成果）。
  // 全部只描述既有事实，未新增任何数字；原项目名改由卡片的 .w-meta-role /
  // 正文首句承载，不会丢信息。
  //
  // 同时补「边界」段（v3 §4）：这三条都只是**性质说明**——说明数据/测试
  // 的口径边界，不引入任何新数字，可从各模块现有正文直接推导：
  //   13 的语料是 sample_policy.md（脱敏示例），30 题是本人命题的分层评测集
  //   16 的 35 个用例是 pytest 单元测试口径
  //   01 的样本是演练样例，数据里已写明「非客户委托」
  '13': {
    t: '30 题真实评测，检索准确率 93.3%',
    boundary: '语料为脱敏示例文档（sample_policy.md），非真实企业知识库；' +
              '30 题评测集为本人命题的分层样本，非第三方基准，' +
              '指标只说明在该题集上的表现，不可外推为通用准确率'
  },
  '16': {
    t: '三个 MCP Server，35 个用例全过',
    boundary: '35 个用例为 pytest 单元测试口径，覆盖接口与主要路径，' +
              '不等于生产环境鲁棒性验证；三个 Server 均为可独立复用的开源实现，' +
              '未在客户生产系统接入'
  },

  // ---- brief P1-2：重复计数清理 ----
  // 问题：`300+` 在 works-data 里被 2 个模块借去当「AI 能力证据」，
  // 而它其实是**项目申报口径**的总量，与「AI 工程能力」无关。同一个数字
  // 在多个模块反复出现，读者会判定为注水。
  // 处理：300+ / 100+ 只保留在「首屏 + 简历经历」各 1 次（brief §0 的规定），
  // 作品模块只放**该模块自己的**数字。
  '01': {
    // 模块 01 的能力是「AI 工具体系规划」，它的自有数字是「8 业务域 / 6 个月路线图」；
    // 借来的「300+ 项目可研」与 AI 规划能力无关，撤出。
    t: '八个业务域，六个月路线图',
    boundary: '演练样本：高分子新材料行业的规划演练稿，非客户委托项目，' +
              '无客户方角色与预算约束参与；路线图未进入执行阶段，无落地结果可报',
    metric: '演练样本：高分子新材料行业信息化规划（示例，非客户委托）',
    highlights: [
      { num: '8', label: '业务域覆盖（8 大场景）' },
      { num: '6 个月', label: '分阶段路线图' }
    ]
  },
  '10': {
    // 模块 10 原本三个高亮**全是**借用的头号数字（300+ / 24家 / 100+），
    // 一个都不属于本模块。清空后卡片「结果」栏会回落到 metric 字段
    // （该模块真正交付的是「用什么口径量化」这套方法），比堆三个别人的数字诚实。
    highlights: []
  },
};

{
  let labelFixed = 0, itemFixed = 0;
  for (const it of data.items) {
    for (let i = 0; i < (it.links || []).length; i++) {
      const parts = String(it.links[i]).split('|');
      if (parts.length !== 2) continue;
      if (LINK_LABEL_FIX[parts[0]]) {
        it.links[i] = LINK_LABEL_FIX[parts[0]] + '|' + parts[1];   // 只换 label
        labelFixed++;
      }
    }
    const fix = ITEM_FIX[it.no];
    if (fix) { Object.assign(it, fix); itemFixed++; }
  }
  console.log('证据标称：链接标签修正 %d 处；模块定点覆盖 %d 个', labelFixed, itemFixed);
}

writeFileSync('works-data.json', JSON.stringify(data, null, 2), 'utf8');
writeFileSync('works-data.js',
  '// 由 extract-works.mjs + patch-works.mjs 生成，请勿手改。\n' +
  'window.__WORKS_DATA__ = ' + JSON.stringify(data) + ';\n', 'utf8');

console.log('模块总数：%d', all.length);
console.log('编号：%s', all.map(i => i.no).join(' '));
console.log('分类：%s', JSON.stringify(all.reduce((a, i) => (a[i.cat] = (a[i.cat] || 0) + 1, a), {})));
console.log('本地目录引用：%d 条', all.flatMap(i => i.links).filter(l => /\.\/\d\d-/.test(l)).length);

console.log('');
console.log('分组（P0-2）：');
for (const id of GROUP_ORDER) {
  const meta = GROUP_META[id];
  const nos = all.filter(i => i.group === id).map(i => i.no).join(' ');
  console.log('  %s %s %s：%d 个 → %s', meta.no, meta.icon, meta.name, groupCount[id], nos);
}
console.log('  合计：%d 个（应为 21）', all.length);
console.log('  core 入选理由：只收「最强 + 证据最硬」——同时具备可点开的真实产物链接、');
console.log('    可复算的量化指标、可独立复现的端到端链路。04/13/16 是同一套企业级智能体');
console.log('    从架构 → 检索 → 工具协议的完整证据链，14 补「怎么证明它是对的」，');
console.log('    11 补「怎么把交付做成可复用标准件」；其余强证据（09 技术底座、10 复盘报告）');
console.log('    属支撑性材料，未进 core；20/21 已有独立开源仓库，归入 oss/lab。');