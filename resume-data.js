/* ==========================================================================
   resume-data.js — 简历与主页共用的唯一数据源
   改这一份，主页与 /resume 两边同步。
   口径纪律（2026-10-15 用户更新裁决，2026-10-22 复核）：
     · 工作年限统一写「6 年+」，配「2021.04 至今」兜底；**必须与
       「AI 工程实践 27 个月」成对出现**（禁止单独写「6 年 AI」）
     · 开源 = 11 个公开仓库（全部 MIT）；统一写「11 个含 CI 门禁」
       （2026-10-22 实测：GitHub API 逐个查 .github/workflows，11/11 命中）。
       **范围**：排除作品集站点自身（portfolio）与无 LICENSE 的仓库
       （Agents-Anywhere）——没有许可证的公开仓库不叫开源，叫 source-available。
       仍**禁止「全绿」式表述**（用户已裁决）：只说「含 CI 门禁」，不承诺每次运行都通过。
     · 成效类数字标注口径（实测 / 测算模型 / 示例口径）
     · 客户名称与具体年度数据一律脱敏
   ========================================================================== */
window.__RESUME__ = {
  // ---- 基本身份 ----
  name: 'Jav1es · 黄家辉',
  title: '企业级 AI Agent 开发工程师 / FDE',
  // 简历最后更新时间。它是「这份材料本身的时间戳」，不是经历数字，
  // 随每次实质性改版同步更新（v2 整改：2026-10-17）。
  updated: '2026-10-22',
  summary: '6 年+ 企业科技服务（2021.04 至今），主导 300+ 项目、服务 100+ 企业（项目申报口径）。AI 工程实践 27 个月：把 AI Agent 从 Demo 做到能评测、可观测、可演示——RAG 检索 93.3% @3，OTel/Jaeger 全链路可观测，11 个公开开源仓库、11 个含 CI 门禁。',

  // ---- 联系方式 ----
  contact: {
    city: '广州',
    email: '1459393754@qq.com',
    phone: '13501519949',
    wechat: '13501519949',
    github: 'https://github.com/Jav1es',
    site: 'https://jav1es.github.io/portfolio/'
  },

  // ---- 核心指标（简历页用）----
  // ⚠️ 与首页的关系（brief P2-1 之后已变化）：
  //    首页首屏的 `.hero-nums` 一行只保留 3 个「可点开验证」的指标
  //    （93.3% @3 / 11 个 MIT 仓库 / 35 pytest 用例），不再逐项复制这份列表；
  //    但两边**共用的数字必须一致** —— 改这里的 93.3% 或 11，首页那行要一起改。
  metrics: [
    { v: '6 年+',   k: '企业科技服务' },
    { v: '27 个月', k: 'AI 工程实践' },
    { v: '300+',    k: '主导项目' },
    { v: '100+',    k: '服务企业' },
    { v: '93.3%',   k: 'RAG 准确率 @3' },
    { v: '11',      k: '公开开源仓库（MIT）' }
  ],

  // ---- 技能矩阵：按能力域分组，不堆关键词 ----
  skills: [
    {
      group: 'AI Agent 开发',
      items: ['六层智能体架构', 'LangGraph 六节点编排', '工具调用与运行时防护',
              '双视野记忆（Redis / PostgreSQL）', 'MCP 协议与 Server 实现', 'FastAPI + SSE 流式接口']
    },
    {
      group: 'RAG 与检索',
      items: ['语义边界切分', 'Dense / BM25 混合检索', 'RRF 融合', 'Cross-Encoder 重排',
              '附引用降幻觉', '30 题分层评测（@3 93.3%）']
    },
    {
      group: '评测与可观测性',
      items: ['评测集纳入 CI 回归', 'OpenTelemetry 埋点', 'Jaeger 全链路追踪',
              'LLM 延迟分解', 'Locust 阶梯压测', 'Prompt 模板库 + Schema 校验']
    },
    {
      group: '工程化与部署',
      items: ['Python / FastAPI', 'Docker Compose', 'K8s Helm（HPA / 探针 / Secret）',
              'Redis / PostgreSQL / pgvector', 'GitHub Actions CI', 'pytest / vitest']
    },
    {
      group: 'FDE 交付与项目管理',
      items: ['客户现场需求发现', 'Discovery Brief 范围定义', 'Eval Plan 验收口径',
              'RACI 与里程碑管理', 'SOP 与客户培训', '项目信息数据库与监测报告']
    },
    {
      group: '前端与工具链',
      items: ['HTML5 / CSS3 / 原生 JS', '响应式与可访问性（a11y）', '3D 视觉与动效',
              'Node.js ESM', 'Service Worker / PWA', 'PowerShell 自动化']
    }
  ],

  // ---- 经历时间线 ----
  experience: [
    {
      company: '广东科友商务集团 / 广州市科运商务信息咨询有限公司',
      role: '项目主管（项目申报技术咨询师）',
      period: '2021.04 – 至今',
      points: [
        '主导客户项目全生命周期：需求调研、痛点诊断与可行性分析，输出《合作可行性分析报告》并制定实施技术路线；累计交付政府/企业项目 300+、服务企业 100+。',
        '主导技术方案设计与交付材料编制，组织合规性自查并跟进审批；单年最高通过国家级高新技术企业认定 24 家、单年通过项目 60+，曾 1 周内完成从签单到申报的交付。',
        '搭建项目信息数据库（业务知识库雏形），输出《项目监测报告》，以数据驱动方案迭代与管理决策。',
        '将 Coze + 多维表 AIGC 工作流与「AI 预处理 + 人工审核」机制引入业务，配套 SOP / FAQ 与采纳率反馈闭环。',
        '面向客户与内部团队开展政策解读、系统操作培训与现场实施指导。'
      ]
    }
  ],

  education: [
    {
      school: '广东邮电职业技术学院',
      major: '计算机应用技术（电子与信息大类 · 大专）',
      period: '2019.09 – 2022.06',
      note: '本科（自考）在读，预计 2027 毕业。'
    }
  ],

  certificates: {
    held: ['计算机中级（计算机技术与软件专业技术资格）', '全国计算机应用技术证书', '办公自动化应用师'],
    preparing: ['信息系统项目管理师（软考高级）', 'PMP']
  },

  // ---- 开源 ----
  opensource: {
    total: 11,
    mit: 11,
    note: '11 个公开仓库（全部 MIT 许可，11 个含 CI 门禁），覆盖 MCP 协议桥接、宿主插件、运维工具链、离线 PWA 与检索规程',
    repos: [
      { name: 'enterprise-agents', desc: '企业级智能体系统：六层架构 + RAG 混合检索（30 题评测 93.3%@3）+ Helm + 压测', lang: 'Python' },
      { name: 'dsh-bridge', desc: '让腾讯 Marvis 调用本机 DeepSeek Harness：Skill + MCP 两种接入', lang: 'JavaScript' },
      { name: 'dsh-local-plugins', desc: '三个自建 DSH 本机插件：微信推送 / 图片与 PDF 预览 / Todo 与 Thinking 面板', lang: 'JavaScript' },
      { name: 'dsh-prompt-compiler', desc: '可编程 prompt 编译层：把粗糙草稿编译成结构化 prompt（analyze→elicit→compile）', lang: 'JavaScript' },
      { name: 'dsh-toolkit', desc: 'DSH 运维工具箱：升级自检 + 插件兼容预检 + 生态全量调研', lang: 'PowerShell' },
      { name: 'dsh-knowledge-guide', desc: '检索路由与回答规程 skill：先检索再作答、强制标来源、未命中先做正对照', lang: 'Markdown' },
      { name: 'workbuddy-bridge', desc: '让 Marvis 把本机 WorkBuddy 当子 Agent 调用的 MCP 桥接层', lang: 'JavaScript' },
      { name: 'dsh-skills', desc: '可复用 Agent Skills 集合：知识检索规程 / 简历 JD 适配 / 静态站搭建', lang: 'Markdown' }
    ]
  },

  // ---- 简历页用的精选项目（3-4 个，XYZ 写法） ----
  // 与 works-data 的 21 个模块同源，这里只挑最强的几个做定向叙事
  projects: [
    {
      no: '04',
      name: '企业级智能体系统（enterprise-agent）',
      role: '独立设计与开发',
      bullets: [
        '主导企业级智能体系统建设，采用六层架构集成 RAG、工具调用与 MCP，基于 LangGraph StateGraph 实现六节点编排（router / planner / retrieve / tool_call / reviewer / respond，含 tool_call → planner 多步工具调用循环与 router 条件分支），RAG 检索准确率达 93.3% @3（30 题分层评测）。',
        '建立评测集并纳入 CI 每次 push 自动回归，结合 OpenTelemetry + Jaeger 全链路追踪（一次会话 7 个 span：root · router · planner · retrieve · tool_call · reviewer · respond），将 Agent 稳定性问题的定位时间从小时级降到分钟级。',
        '完成服务端工程化：FastAPI + SSE 流式接口、Pydantic 结构化输出、重试/降级/熔断中间件；Docker Compose 一键起全栈，K8s Helm 配双指标 HPA 与健康探针。'
      ],
      tags: ['LangGraph', 'RAG', 'MCP', 'FastAPI', 'Redis', 'PostgreSQL', 'K8s'],
      links: [
        { label: 'GitHub', url: 'https://github.com/Jav1es/enterprise-agents' },
        { label: '案例详情', url: './ai-agent.html#mod-04' }
      ]
    },
    {
      no: '13',
      name: 'RAG 知识库与检索质量评测',
      role: '独立设计与开发',
      bullets: [
        '针对企业知识问答的检索准确率问题，实现语义边界智能切分（chunk 500 / overlap 50）+ Dense / BM25 混合检索 + RRF 融合 + Cross-Encoder 重排，生成结果强制附条款引用以降低幻觉。',
        '建立 30 题分层评测集实测检索准确率 @3 达 93.3%（@1 73.3%），并沉淀为可复现的评测报告（含重排对照与幻觉分析）。',
        '在评测中发现 RRF 融合分数不可直接用作拒答阈值，改用「强制带引用验证」方案，避免低置信回答被误放行。'
      ],
      tags: ['RAG', '混合检索', 'RRF', 'Cross-Encoder', '评测集'],
      links: [
        { label: '评测报告', url: 'https://github.com/Jav1es/enterprise-agents' },
        { label: '案例详情', url: './ai-agent.html#mod-13' }
      ]
    },
    {
      no: '16',
      name: 'MCP Server 三件套（开源）',
      role: '独立设计与开发',
      bullets: [
        '把 3 个可独立复用的 MCP Server 开源到 GitHub（工具调度 / 作品集检索 / RAG 知识问答），实现标准化的工具发现与函数调用，接入 ERP / CRM / OA / 钉钉 / 企微等多系统。',
        '配套 pytest 35 个用例全部通过，本地可一键运行，附完整 README 与使用文档。',
        '沉淀为可复用的开源资产，使后续项目接入新系统时无需重复实现工具协议层。'
      ],
      tags: ['MCP', '工具调用', 'pytest', '开源'],
      links: [
        { label: 'GitHub', url: 'https://github.com/Jav1es/enterprise-agents' },
        { label: '案例详情', url: './ai-agent.html#mod-16' }
      ]
    },
    {
      no: '11',
      name: 'FDE 交付物模板：Discovery Brief × Eval Plan',
      role: '独立编写（自编模板与演练稿，非客户委托交付）',
      bullets: [
        '面对客户现场交付范围靠口头约定、上线后无验收标准的问题，把「进客户门 → 诊断缺口 → 形成可验证交付范围」与「上线前怎么验证、上线后怎么监控」沉淀成两份标准件。',
        'Discovery Brief 按「业务现状 → 痛点归类 → 可验证范围 → 验收口径」四段式组织；Eval Plan 按「评测集分层 → 指标定义 → 门禁阈值 → 回归触发 → 监控看板」五段式组织。',
        '以脱敏台账为输入做演练并据此修订模板结构，沉淀为可复用标准件，把「我以为客户需要」变成「客户确认过需要」。**当前为演练稿，待客户现场核验**（文件自身状态亦为「草稿」）。'
      ],
      tags: ['FDE', '需求发现', '验收口径', 'SOP'],
      links: [
        { label: '模板全文', url: './fde.html#mod-11' },
        { label: '案例详情', url: './fde.html#mod-11' }
      ]
    },
    {
      // 2026-10-22：Harness 方向的旗舰项目（简历 harness 版首选）
      no: '24',
      name: 'Harness-Agent-Core：Agent 的可控执行层',
      role: '独立设计与开发（自建参考实现，非客户生产交付）',
      bullets: [
        '针对「直接调大模型做多步骤任务，失败率约三成」的问题（幻觉被当事实、工具越权、格式漂移、死循环烧 Token、出错后无法定位），做了一层代码级 Harness：模型只产出「提案」，能不能执行由白名单、确定性校验、自愈回喂与熔断共同决定。',
        '五层结构：L1 工具编排与上下文隔离（MCP 白名单 + 权限边界）→ L2 确定性硬约束守卫（Schema / 业务规则 / Linter，全部纯函数）→ L3 自愈反馈循环（error_stack 结构化回喂 + do_not_change 边界）→ L4 熔断与人工介入网关（max_retries = 3，超限 Webhook 审批）→ L5 全链路可观测与 CI 门禁。',
        '在 50 次复杂多步骤测试中，任务中断率由 32% 降至 2% 以下，错误修正平均耗时缩短 80%；597 个自动化测试覆盖 Python 3.11 / 3.12，82 个变异体全部被杀死。作品集实验口径，非客户项目、非第三方基准。'
      ],
      tags: ['Harness Engineering', 'LangGraph', 'MCP', 'CI/CD Gate'],
      links: [
        { label: 'GitHub', url: 'https://github.com/Jav1es/Harness-Agent-Core' },
        { label: '案例详情', url: './harness-agent-core.html' }
      ]
    },
    {
      // Harness 向：运维工具箱（升级自检 / 插件兼容预检）
      no: '19',
      name: 'DSH 运维工具箱：升级自检与兼容预检',
      role: '独立设计与开发（开源）',
      bullets: [
        '针对宿主升级后插件静默失效、排查要翻终端日志的问题，做了一套运维工具箱：升级前预检插件兼容性、升级后自检关键能力是否还在、并把生态调研做成可重跑的脚本。',
        '把「哪些插件会随版本升级失效」从靠记忆变成可验证的检查项，减少升级后的返工与回退。',
        '开源在 GitHub（MIT），可作为同类宿主工具链的参考实现。'
      ],
      tags: ['PowerShell', '插件兼容预检', '升级自检', '开源'],
      links: [
        { label: 'GitHub', url: 'https://github.com/Jav1es/dsh-toolkit' },
        { label: '案例详情', url: './works.html#mod-19' }
      ]
    },
    {
      // Harness 向：上下文编译层
      no: '18',
      name: 'dsh-prompt-compiler：可编程的 prompt 编译层',
      role: '独立设计与开发（开源）',
      bullets: [
        '针对「粗糙草稿直接喂给模型，输出质量全靠运气」的问题，做了一层可编程的 prompt 编译：analyze（识别缺口）→ elicit（补问关键约束）→ compile（生成结构化 prompt）→ render（渲染成可执行形式）。',
        '把「怎么问」这件事从个人经验沉淀成可复用的流程，减少来回返工。',
        '作为 DSH 插件开源，提供 MCP 工具与 Skill 两种接入方式。'
      ],
      tags: ['prompt 编译', '上下文工程', 'DSH 插件', '开源'],
      links: [
        { label: 'GitHub', url: 'https://github.com/Jav1es/dsh-prompt-compiler' },
        { label: '案例详情', url: './works.html#mod-18' }
      ]
    },
    {
      // Harness 向：插件生命周期
      no: '15',
      name: 'DeepSeek Harness 本机插件三件套',
      role: '独立设计与开发（开源）',
      bullets: [
        '针对宿主能力不够用、但又不方便改宿主本身的问题，做了三个可独立装载的本机插件：微信推送、图片与 PDF 预览、Todo 与 Thinking 面板。',
        '每个插件独立生命周期：可单独启用/禁用、失败不影响其他插件、升级时不连带崩。',
        '开源在 GitHub（MIT），三个插件覆盖通知、预览、任务管理三类常见扩展点。'
      ],
      tags: ['插件架构', '生命周期管理', 'DSH 插件', '开源'],
      links: [
        { label: 'GitHub', url: 'https://github.com/Jav1es/dsh-local-plugins' },
        { label: '案例详情', url: './works.html#mod-15' }
      ]
    },
    {
      // Design 向：断言引擎
      no: '22',
      name: '原型工厂：可自检的静态原型与断言引擎',
      role: '独立设计与开发（开源）',
      bullets: [
        '针对「原型做得快但没法验证对不对」的问题，做了一套可自检的静态原型工具：生成页面的同时产出断言，改完能自动验证结构、链接、无障碍标记是否还成立。',
        '把「看起来对」变成「跑起来验证过」，减少交付前的返工。',
        '开源在 GitHub（MIT）。'
      ],
      tags: ['静态原型', '断言引擎', '无障碍', '开源'],
      links: [
        { label: 'GitHub', url: 'https://github.com/Jav1es' },
        { label: '案例详情', url: './works.html#mod-22' }
      ]
    },
    {
      // Design 向：离线 PWA
      no: '20',
      name: '高企认定评分自评系统（离线 PWA）',
      role: '独立设计与开发（个人开源）',
      bullets: [
        '把高企认定的评分规则做成一个能离线跑的自评工具：六步实时算分、雷达图诊断、整改建议直出。',
        '数据只留在浏览器里，不上传不联网——这是产品决策，不是技术限制。',
        '零依赖实现，PWA 可安装，弱网/断网环境下仍可用。'
      ],
      tags: ['原生 JS', '规则引擎', 'PWA', '离线可用'],
      links: [
        { label: '在线体验', url: 'https://jav1es.github.io/portfolio/hitech-self-assessment/' },
        { label: '案例详情', url: './works.html#mod-20' }
      ]
    },
    {
      // Design 向：作品集站本身（简历 design 版首选）
      no: '25',
      name: '作品集站本身：零依赖 + 24 个手写 3D 封面',
      role: '独立完成全部设计与实现（个人项目，已上线）',
      bullets: [
        '作为 Design Engineer 求职者，作品集站本身就是第一个被审视的作品：如果它用 Three.js 堆特效、用框架套壳，恰恰证明不了「能自己写」。所以第一版就定死约束——零第三方运行时依赖，连 package.json 都不要。',
        '24 个作品封面全部程序化生成：手写 Canvas 线框渲染器（33.3 KB），含 12 角度 autoFit 防裁切、点/边/桶三层对象池避免 GC 抖动、帧预算调度（视口内最多 4 个并发）。没有一张位图素材。',
        '构建自带 5 阶段 10 项回归自检（编号连续 / 卡片布局 1280 与 390 两档 / 几何自检），任一不过就 fail；无障碍覆盖键盘可达、aria 标注、prefers-reduced-motion 全量降级。实测 449 帧 0 掉帧。'
      ],
      tags: ['Canvas 2D', '零依赖', '原生 JS', '无障碍'],
      links: [
        { label: '在线访问', url: 'https://jav1es.github.io/portfolio/' },
        { label: '源码', url: 'https://github.com/Jav1es/portfolio' }
      ]
    }
  ]
};
