# 黄家辉 · VibeCoding / VibeEngineering 工程师

> 13501519949 ｜ 1459393754@qq.com ｜ 微信 13501519949 ｜ 广州
> [github.com/Jav1es](https://github.com/Jav1es)（9 个 MIT 开源仓库）｜ [作品集 jav1es.github.io/portfolio](https://jav1es.github.io/portfolio)
> **求职意向：VibeCoding / VibeEngineering 工程师 / AI 应用工程**　期望城市：广州　期望薪资：面议

---

## 个人简介

用自然语言驱动编码，把想法在几小时内变成能跑、能演示、能交付的东西。**9 个 MIT 开源仓库**全部由我独立完成——从 MCP 协议桥接、宿主插件、运维工具链，到零依赖离线 PWA，每个都带 README、测试与可运行截图。

我的工作方式：**先跑通再优化**——用 AI 快速验证方向，跑通后把原型沉淀成有测试、有文档、可复现的工程件；而不是停在 demo 阶段。同时把重复动作封装成 Skill 与自动化流水线，让下一次更快。

6 年+ 企业服务经验（2021.04 至今）让我知道做出来的东西要有人真用——所以我做工具时会先想「谁在什么场景下会用到它」。

---

## 核心能力（对齐 VibeEngineering）

**● 自然语言驱动的端到端交付**
从需求描述到可用产品的全流程：AI 辅助编码 → 快速原型 → 实机验证 → 重构为可维护代码 → 补齐测试与文档。不做「跑一次就坏」的 demo。

**● 原生 Web 与视觉实现**
HTML5 / CSS3 / 原生 JavaScript（无框架依赖）：3D 透视背景、滚动动效、响应式布局、可访问性（a11y）与性能优化。作品集站点即本人自建，首屏 3G 估算 1.6s、零外部 CDN 资源。

**● 协议与集成**
MCP（Model Context Protocol）工具定义与桥接层实现；跨应用 Agent 编排（让上级 Agent 自主决定何时把任务下放给本机能力）；REST / Webhook 集成。

**● 工具链与工程化**
Node.js ESM / Python 双栈；GitHub Actions CI；pytest / vitest 测试；Service Worker 离线缓存与 PWA；PowerShell 自动化脚本；npm 包发布。

**● 把流程变成 Skill**
把重复的工作方法固化成可复用的 Skill 与自动化流水线（如简历 JD 适配流程、静态站交付自检流程），让同类任务第二次做只需几分钟。

---

## 开源与工具链主线项目（8 个 · 全部 MIT）

### 12 dsh-bridge：让 Marvis 调用本机 DeepSeek Harness
两个 AI 助手各干各的，能力接不起来。我写了一个 MCP Server 把本机 DSH 接进 Marvis：先出派工单、再按建议调技能与工具，零依赖、可复现。
`指标`：3 个 MCP 工具（零依赖手写协议）｜241×77 技能 × MCP 工具本地检索｜10 秒派工单生成耗时
`证明`：[GitHub](https://github.com/Jav1es/dsh-bridge)

### 15 DeepSeek Harness 本机插件三件套
AI 助手天天用，但工具链缺什么就得等官方排期。我直接读了宿主插件的源码与打包格式，自己写了三个插件补上空白：消息推手机、文件能预览、待办与推理过程看得见。
`指标`：3 个自研 DSH 插件｜100% 离线可跑 · 零云依赖｜MIT 开源
`证明`：[GitHub](https://github.com/Jav1es/dsh-local-plugins)

### 16 企业级智能体 MCP Server 三件套
把 3 个可独立复用的 MCP Server 开源到 GitHub：工具调度、作品集检索、RAG 知识问答，各带测试与文档。
`指标`：3 个 MCP Server 开源｜35 pytest 用例全通过｜100% 用例通过率
`证明`：[enterprise-agents](https://github.com/Jav1es/enterprise-agents)

### 17 知识指南：把「先检索再作答」写成可复用的规程
把「不检索就不作答、强制标来源、未命中先做正对照」写成纯 Markdown、零依赖的 Skill 规程，让 AI 回答有据可查。
`证明`：[GitHub](https://github.com/Jav1es/dsh-knowledge-guide) ｜ 站内可预览 SKILL.md 全文

### 18 dsh-prompt-compiler：可编程的 prompt 编译层
把粗糙草稿编译成结构化 prompt（analyze → elicit → compile 三阶段），做成 DSH 插件，含竞品审计与逐 bug 的 CHANGELOG。
`证明`：[GitHub](https://github.com/Jav1es/dsh-prompt-compiler) ｜ 运行截图

### 19 DSH 运维工具箱：升级自检 / 插件兼容预检 / 生态全量调研
写了一套 PowerShell 工具链，解决「升级前不知道会不会崩」的问题：依赖检查、版本年龄校验、安装后基线比对。
`证明`：[GitHub](https://github.com/Jav1es/dsh-toolkit)

### 20 高企认定评分自评系统（离线 PWA）
把高企认定的评分规则做成能离线跑的自评工具：六步实时算分、雷达图诊断、整改建议直出，数据只留在浏览器里，不上传不联网。
`指标`：6 步实时算分｜8 条一票否决预检｜0 依赖零安装零后端
`架构`：规则与界面彻底分离——policy.json 承载全部政策，rule-engine.js（28.9KB）纯函数式计算，app.js（31.9KB）管流程与渲染。改政策只需改 JSON。
`证明`：[在线体验](https://jav1es.github.io/portfolio/hitech-self-assessment/) ｜ 使用说明 ｜ 评分规则

### 21 workbuddy-bridge：让 Marvis 调用本机 WorkBuddy
dsh-bridge 的同构延伸：把本机 WorkBuddy 封装成 MCP 桥接层，让两个桌面 Agent 之间形成可编排的协作链路。
`证明`：[GitHub](https://github.com/Jav1es/workbuddy-bridge)

---

## 自建站点：作品集（本人设计并实现）

`jav1es.github.io/portfolio` —— 纯 HTML5 + CSS3 + 原生 JS，无任何 UI 框架。

- **3D 视觉**：SpaceX 式透视网格地面（`perspective` + `rotateX`）、漂移光斑、卡片跟随鼠标的立体倾斜
- **数据驱动**：21 个作品模块由 JSON 数据 + 渲染层生成，一处维护全站同步
- **零图片依赖**：每个模块的示意图都是内联 SVG（6 种几何母题按类目自动分配）
- **站内文件预览**：14 个证明文件可直接在网页里读，不必跳转下载
- **性能**：首屏 107KB，3G 估算 1.61s；生效的 `blur` / `backdrop-filter` 均为 0
- **可访问性**：标题层级无跳级、图片全有 alt、键盘可完整遍历、`prefers-reduced-motion` 全降级

---

## 工作经历

**广东科友商务集团 / 广州市科运商务信息咨询有限公司**　项目主管（项目申报技术咨询师）　2021.04 – 至今

- 主导客户项目需求调研、可行性分析与技术方案设计，累计交付项目 300+、服务企业 100+
- 把重复的文档与审核流程做成自动化脚本与 Skill，把 AI 工作流引入实际业务
- 面向客户与内部团队做系统操作培训，跟踪采纳率

---

## 教育背景

**广东邮电职业技术学院**　计算机应用技术（电子与信息大类 · 大专）　2019.09 – 2022.06
参与云计算服务器搭建、JavaScript 网页设计、局域网搭建与安全等实训。本科（自考）在读，预计 2027 毕业。

---

## 技能关键词

**语言与运行时**：JavaScript（ESM）· Node.js · Python · HTML5 · CSS3 · PowerShell
**前端与视觉**：原生 DOM · CSS Grid / Flex · 3D Transform · 响应式 · 可访问性 · SVG
**协议与集成**：MCP · REST · Webhook · Service Worker / PWA
**工具链**：GitHub Actions · pytest · vitest · npm · Docker
**AI 工程**：Prompt 工程 · RAG · Agent 编排 · LangGraph · Coze · Dify · n8n

---

*所有开源项目均可直接访问仓库查看源码与测试；站点与工具的性能数字为实测值。*
