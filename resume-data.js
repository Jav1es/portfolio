/* ==========================================================================
   resume-data.js — 简历与主页共用的唯一数据源
   改这一份，主页与 /resume 两边同步。
   口径纪律（2026-10-15 用户更新裁决）：
     · 工作年限统一写「6 年+」，配「2021.04 至今」兜底；**必须与
       「AI 工程实践 27 个月」成对出现**（禁止单独写「6 年 AI」）
     · 开源 = 9 个公开仓库，全部 MIT；统一写「3 个含 CI 门禁」（2026-10-16 实测：仅 3 个仓库接入 Actions），
       **禁止再用「全绿」式表述**（用户已裁决）
     · 成效类数字标注口径（实测 / 测算模型 / 示例口径）
     · 客户名称与具体年度数据一律脱敏
   ========================================================================== */
window.__RESUME__ = {
  // ---- 基本身份 ----
  name: 'Jav1es · 黄家辉',
  title: '企业级 AI Agent 开发工程师 / FDE',
  summary: '6 年+ 企业科技服务（2021.04 至今），主导 300+ 项目、服务 100+ 企业（项目申报口径）。AI 工程实践 27 个月：把 AI Agent 从 Demo 做到生产——RAG 检索 93.3% @3，OTel/Jaeger 全链路可观测，9 个公开开源仓库、3 个含 CI 门禁。',

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
  //    （93.3% @3 / 9 个 MIT 仓库 / 35 pytest 用例），不再逐项复制这份列表；
  //    但两边**共用的数字必须一致** —— 改这里的 93.3% 或 9，首页那行要一起改。
  metrics: [
    { v: '6 年+',   k: '企业科技服务' },
    { v: '27 个月', k: 'AI 工程实践' },
    { v: '300+',    k: '主导项目' },
    { v: '100+',    k: '服务企业' },
    { v: '93.3%',   k: 'RAG 准确率 @3' },
    { v: '9',       k: '公开开源仓库（MIT）' }
  ],

  // ---- 技能矩阵：按能力域分组，不堆关键词 ----
  skills: [
    {
      group: 'AI Agent 开发',
      items: ['六层智能体架构', 'LangGraph 五阶段编排', '工具调用与运行时防护',
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
    total: 9,
    mit: 9,
    note: '9 个公开仓库（全部 MIT 许可），覆盖 MCP 协议桥接、宿主插件、运维工具链、离线 PWA 与检索规程',
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
        '主导企业级智能体系统建设，采用六层架构集成 RAG、工具调用与 MCP，基于 LangGraph StateGraph 实现 Router → Planner → Skill → Tool → Reviewer 五阶段编排，RAG 检索准确率达 93.3% @3（30 题分层评测）。',
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
    }
  ]
};
