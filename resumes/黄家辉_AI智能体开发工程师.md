# 黄家辉 · AI 智能体开发工程师

> 13501519949 ｜ 1459393754@qq.com ｜ 微信 13501519949 ｜ 广州
> [github.com/Jav1es](https://github.com/Jav1es)（9 个 MIT 开源仓库）｜ [作品集 jav1es.github.io/portfolio](https://jav1es.github.io/portfolio)
> **求职意向：AI 智能体开发工程师 / Agent 工程**　期望城市：广州　期望薪资：面议

---

## 个人简介

能独立扛 Agent 研发全链路：自研并开源 **enterprise-agent 六层智能体架构**（接入 / 编排 / 工具 / 记忆 / 知识 / 推理），基于 LangGraph StateGraph 实现六节点编排（router / planner / retrieve / tool_call / reviewer / respond，含条件分支与工具调用循环），覆盖上下文管理、双视野记忆、工具调用标准化与运行时防护。

**RAG 混合检索 30 题分层评测准确率 @3 达 93.3%**（@1 73.3%）；MCP Server 三件套开源（pytest 35 用例通过）；Locust 阶梯压测 2535 请求 0 失败。Python / FastAPI 服务端与 Redis / PostgreSQL / Docker / K8s 工程化能力扎实。

6 年+ 乙方交付背景（2021.04 至今）（服务企业 100+），懂业务、能落地——技术不脱离真实场景。

---

## 核心能力（对齐 JD）

**● Agent 后端全链路**
LangGraph 六节点编排（含条件分支与工具调用循环）；上下文管理（上下文窗口策略 + 双视野记忆：短期 Redis / 长期 PostgreSQL 事实三元组）；工具调用标准化与运行时防护（重试 / 降级 / 熔断 / 超时）。

**● Python 与服务端生态**
Python 熟练；FastAPI + SSE 流式接口；Pydantic 结构化输出校验；PostgreSQL（含 pgvector）、Redis；多系统 API 集成（ERP / CRM / OA / 钉钉 / 企微）；Docker Compose 与 K8s Helm（双指标 HPA、健康探针、密钥强制 Secret）。

**● RAG · Prompt · 质量评测**
语义边界智能切分（chunk 500 / overlap 50）+ Dense / BM25 混合检索 + RRF 融合 + Cross-Encoder 重排，生成附引用降幻觉；Prompt 模板库 + JSON Schema / 正则校验 + 分层评测集，把 AI 输出从「抽卡」变成可校验、可复现的生产线。

**● 评测与可观测性**
评测集纳入 CI 每次 push 自动回归；OpenTelemetry + Jaeger 全链路 trace，一次会话 8 个 span 贯穿；LLM 延迟分解定位模型侧瓶颈（首 token 占总延迟 61.3%）。

**● AI Native 研发方式**
日常基于 Coding Agent 与自定义 Skill 体系做端到端开发与自动化，实践「AI 先写、人 review」模式；熟悉 Coze / Dify / n8n 工作流落地。

---

## 核心工程亮点

| 指标 | 结果 |
|---|---|
| RAG 检索准确率 | **93.3% @3**（30 题分层评测） |
| 压测表现 | **2535 请求 0 失败**（Locust 阶梯压测，P95 2.6s） |
| 架构层数 | **6 层**自研智能体架构 |
| MCP Server | 三件套开源，**35 用例**通过 |
| 性能定位 | LLM 延迟分解，首 token 占总延迟 61.3% |

---

## 智能体工程主线项目（5 个）

### 04 企业级智能体系统（本地开发工程 · 个人开源）
独立设计开发：六层架构 + LangGraph StateGraph 六节点编排图（router / planner / retrieve / tool_call / reviewer / respond，含条件分支与 tool_call→planner 循环）；上下文管理与记忆（短期 Redis + 长期 PostgreSQL 事实三元组）；FastAPI + SSE 流式接口；Pydantic 结构化输出 + 重试 / 降级 / 熔断中间件。**现场可演示。**
`证明`：《企业级智能体系统开发文档》、运行截图、GitHub 仓库

### 07 Prompt 工程与评测体系（自建 Demo）
AI 输出像抽卡不稳。用结构化 Prompt + JSON Schema 校验 + 评测集做 A/B，把抽卡变成可校验、可复现的生产线。
`证明`：Prompt 模板库、评测集、校验规则

### 09 技术底座与运维证据（自建 Demo）
现场环境受限还得稳。用 Docker Compose 一键起服务，配降级 / 容错 / 熔断和健康检查，让系统在客户现场也跑得住。
`证明`：编排文件、Helm Chart、17 项自动校验

### 13 RAG 知识库 Demo（真实带数据演示）
语义边界智能切分 + Dense / BM25 混合检索 + RRF 融合 + Cross-Encoder 重排，生成附条款引用；30 题分层评测实测 @3 93.3%。**发现 RRF 分数不可作拒答阈值，改用强制带引用验证方案。**
`证明`：RAG 评测报告（含重排对照与幻觉分析）、示例企业制度文档、运行说明

### 14 AI 评测与可观测性（评测集纳入 CI 回归 + OTel/Jaeger 全链路追踪）
评测集纳入 CI 每次 push 自动回归；OpenTelemetry + Jaeger 全链路 trace，一次会话 8 个 span 贯穿。
`证明`：可观测性方案文档、RAG 评测报告、压测基准报告

---

## 工作经历

**广东科友商务集团 / 广州市科运商务信息咨询有限公司**　项目主管（项目申报技术咨询师）　2021.04 – 至今

- **技术咨询与交付**：主导客户项目需求调研、可行性分析与技术方案设计，累计交付政府/企业项目 300+、服务企业 100+（单年高企认定通过 24 家）；沉淀业务知识库雏形与数据监测体系，以数据驱动方案迭代
- **AI 落地实践**：将 Coze + 多维表 AIGC 工作流与「AI 预处理 + 人工审核」机制引入业务，配套 SOP / FAQ 与采纳率反馈闭环

---

## 教育背景

**广东邮电职业技术学院**　计算机应用技术（电子与信息大类 · 大专）　2019.09 – 2022.06
本科（自考）在读，预计 2027 毕业。

---

## 证书与技能关键词

**证书**：计算机中级（计算机技术与软件专业技术资格）、全国计算机应用技术证书、办公自动化应用师
**备考**：信息系统项目管理师（软考高级）、PMP

**技术关键词**：Python · FastAPI · LangGraph · LangChain · RAG · MCP SDK · Redis · PostgreSQL · pgvector · Docker · K8s / Helm · OpenTelemetry · Jaeger · pytest · Coze · Dify · n8n

---

*所有工程指标均来自本地实测可复现（评测报告与压测基准已开源）；客户相关数据一律脱敏。*
