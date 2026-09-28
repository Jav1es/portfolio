---
# 黄家辉 · AI 数字化落地作品集
> 从「会规划」到「能落地、可演示、可量化、可复用」
[![在线访问](https://img.shields.io/badge/🌐_在线作品集-jav1es.github.io/portfolio-2563eb?style=for-the-badge)](https://jav1es.github.io/portfolio/)
[![GitHub Pages](https://img.shields.io/badge/Deployed-GitHub_Pages-059669?style=for-the-badge&logo=github)](https://jav1es.github.io/portfolio/)
[![License](https://img.shields.io/badge/License-MIT-64748b?style=for-the-badge)](./LICENSE)
---
## 👋 关于我
**黄家辉** · 6 年企业科技服务与项目全流程经验 · 广州 · 计算机应用技术 · 信息系统项目管理师（软考高级）
目标岗位：**AI 项目经理 / AI 工作流落地工程师 / AI 智能体开发工程师 / FDE 前线部署工程师**
我擅长把 AI 从「概念」落到「业务现场」——从需求诊断、方案设计、端到端交付到现场培训，全程打通最后一公里。本作品集是一份完整的**证据链**，每一项都可追溯、可验证、可演示。
---
## 🎯 核心亮点
| 维度 | 内容 |
|---|---|
| **真实项目** | 高新技术企业认定现场交付（单年最高通过 24 家、最快 1 周交付）、白云科技信息化总体规划、300+ 政府/企业项目可研立项 |
| **工程落地** | 自建企业级智能体系统 enterprise-agent（六层架构 + LangGraph + RAG + 双视野记忆 + Docker/K8s） |
| **开源贡献** | 3 个可独立复用的 MCP Server（企业工具 / 作品集查询 / RAG 知识库），共 35 项 pytest 测试通过 |
| **数据驱动** | 每个项目都有前后对比量化数据，ROI 测算、人天节省、准确率提升均标注口径 |
| **FDE 能力** | 完整的 FDE 能力映射表 + 2 则实战故事（业务型 + 工程型） |
---
## 📚 作品集模块（13 个）
点击卡片可展开查看完整详情。每个模块包含：业务痛点、我的角色、方案架构、工具栈、实施步骤、关键难点、量化测算、可复用资产、证明链接与复盘。
| # | 模块 | 类型 |
|---|---|---|
| 01 | AI 工具体系 0-1 搭建规划包 | 📐 方案规划 |
| 02 | AI 工作流落地标杆 A：企业智能问答与申报文档 AIGC | 🔧 自建 Demo |
| 03 | AI 工作流落地标杆 B：财务 / 行政 / 外贸跟单 | ✅ 已交付 |
| 04 | 企业级智能体系统（本地开发工程 enterprise-agent） | ✅ 已交付 |
| 05 | 业务数据库与数据监测报告（SQL 报表 + BI/ChatBI） | ✅ 已交付 |
| 06 | RAG 知识库 Demo（enterprise-agent 真实带数据演示） | 🔧 自建 Demo |
| 07 | AI 评测与可观测性（评测集纳入 CI 回归 + OTel/Jaeger 全链路追踪） | 🔧 自建 Demo |
| 08 | 办公流程自动化（Open Claw + Python 脚本） | 🔧 自建 Demo |
| 09 | Prompt 工程与评测体系 | 🔧 自建 Demo |
| 10 | 培训 / SOP / 推广运营包 | ✅ 已交付 |
| 11 | 技术底座与运维证据 | 🔧 自建 Demo |
| 12 | 项目复盘与量化数据报告 | ✅ 已交付 |
| 13 | 企业级智能体 MCP Server 三件套（开源） | ✅ 已交付 |
> 模块 13 对应三个独立开源的 MCP Server，仓库地址：[github.com/Jav1es/enterprise-agents/tree/main/mcp](https://github.com/Jav1es/enterprise-agents/tree/main/mcp)
---
## 🧭 如何使用本作品集
**如果你是面试官 / HR：**
1. 直接打开 [在线作品集](https://jav1es.github.io/portfolio/)
2. 顶部导航栏可快速跳转到「FDE 前线部署」「现场演示」「作品集模块」等章节
3. 点击任意模块卡片可展开详细内容，包含可验证的证明链接
4. 特别推荐关注：**FDE 能力映射**、**模块 04（企业级智能体系统）**、**模块 13（MCP Server 三件套）**
**如果你想本地查看：**
```bash
git clone https://github.com/Jav1es/portfolio.git
cd portfolio
# 用浏览器打开 index.html 即可
```
---
## 🛠 技术栈与实现
- **前端**：纯静态 HTML + CSS + 原生 JavaScript，零框架依赖，加载快
- **Markdown 渲染**：marked.js 实现 .md 文件优雅展示（弹模态框）
- **部署**：GitHub Pages（Deploy from a branch, main / root）
- **数据**：所有作品集内容以 JS 数组形式内嵌于 `index.html`，便于维护
- **附件**：PDF / DOCX / XLSX / PNG / SVG / MD 等原始材料按模块分文件夹归档
---
## 📁 仓库结构
```
portfolio/
├── index.html                 # 作品集主页面（含所有模块数据）
├── 01-ai-toolkit/             # 模块 01 附件
├── 02-ecommerce-ai/           # 模块 02 附件
├── 03-finance-admin-trade-ai/ # 模块 03 附件
├── 04-enterprise-agent/       # 模块 04 附件（含 enterprise-agents 子目录）
├── 05-bi-chatbi/              # 模块 05 附件
├── 06-rpa/                    # 模块 06 附件
├── 07-prompt-engineering/     # 模块 07 附件
├── 08-training-sop/           # 模块 08 附件
├── 09-tech-ops/               # 模块 09 附件
├── 10-retro-reports/          # 模块 10 附件
├── 11-fde-templates/          # 模块 11 附件（FDE 交付物模板）
└── README.md                  # 本文件
```
---
## 📢 诚信说明
- **真实项**：企业级智能体系统 enterprise-agent、白云科技规划方案、高企认定 / 项目申报交付、自建项目信息数据库与《项目监测报告》均为本人真实经历。
- **口径说明**：凡成效类数字均标注为「测算模型 / 示例口径」，实际以落地数据为准。
- **脱敏处理**：部分客户名称与年度数据已做脱敏，面试时可提供更详细版本。
---
## 📬 联系我
- **在线作品集**：[https://jav1es.github.io/portfolio/](https://jav1es.github.io/portfolio/)
- **GitHub**：[@Jav1es](https://github.com/Jav1es)
- **联系方式**：面试时提供
---
<p align="center">
  <i>本作品集持续更新中，欢迎交流与指正。</i>
</p>
---
