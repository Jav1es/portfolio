# dsh-local-plugins

三个自建的 **DeepSeek Harness（DSH）** 本机插件源码。

> **为什么有这个仓库**：这三个插件原先只以 `link:` 方式被 DSH profile 引用，
> 源码散落在本机 `D:\Documents\deepseek-harness\` 下，**没有任何版本控制**——
> 磁盘上一份，坏了就永久丢失。此仓库把它们纳入 Git 与异地备份。

## 插件清单

| 插件 | 类型 | 作用 |
|---|---|---|
| [`dsh-serverchan-notify`](./dsh-serverchan-notify) | host | 把每条助手回复（或仅需确认的回复）经 [Server酱](https://sctapi.ftqq.com) 推送到微信 |
| [`dsh-sidebar-preview`](./dsh-sidebar-preview) | web | 为 better-sidebar 编辑器注册**图片 + PDF** 预览器 |
| [`dsh-workpanel`](./dsh-workpanel) | web | 原生右侧栏标签页：**Todo 面板** + **Thinking（推理）面板** |
| [`dsh-prompt-compiler`](https://github.com/Jav1es/dsh-prompt-compiler) | host + web | **可编程的 prompt 编译层**：把粗糙 draft 编译成结构化 prompt（诊断→澄清→合成）；既是人用的 UI 按钮，也是其他插件/Agent 可 inject 的 `promptCompiler` 服务 |

三个插件均为 MIT 许可，`version: 0.1.0`。

## 安装

这些插件按 **DSH bundle** 约定编写（`package.json` 里的 `dsh.bundle.patch` 指向 `cordis.patch.yml`），
以 `link:` 方式挂进 profile：

```jsonc
// ~/.dsh/profiles/<profile>/package.json
{
  "dependencies": {
    "dsh-serverchan-notify": "link:/path/to/dsh-local-plugins/dsh-serverchan-notify",
    "dsh-sidebar-preview":   "link:/path/to/dsh-local-plugins/dsh-sidebar-preview",
    "dsh-workpanel":         "link:/path/to/dsh-local-plugins/dsh-workpanel"
  },
  "dsh": {
    "profile": {
      "bundles": ["dsh-serverchan-notify", "dsh-sidebar-preview", "dsh-workpanel"]
    }
  }
}
```

然后在 profile 的 `cordis.patch.yml` 里按插件所需填配置。

## 配置

### dsh-serverchan-notify

需要一个 Server酱 SendKey（形如 `SCT...`）。

> ⚠️ **SendKey 是凭据，不要写进本仓库。** 插件默认从本机配置文件读取，
> 本仓库 `.gitignore` 已排除 `notify-config.json` / `serverchan-notify.json`。
> 未配置时插件**静默停用出站推送**，不会报错。

### dsh-sidebar-preview / dsh-workpanel

开箱即用。`dsh-sidebar-preview` 依赖 `dsh-better-sidebar >= 0.6.0`。

## 环境要求

- Node.js `>= 20`
- 一个可加载 bundle 的 DSH 安装

## dsh-prompt-compiler

独立的 **DeepSeek Harness 插件**（已发布到 npm 与 GitHub），定位是「**可编程的 prompt 编译层**」：

- **服务人**：composer 工具栏「✨ 编译」按钮 → LLM 诊断 draft 完整度 → 交互式澄清问题 → 合成 Task / Constraints / Output Format / Acceptance Criteria 四段结构化 prompt → 采用并回填输入框（不自动发送）。
- **服务其他插件与 Agent**（差异化核心）：通过宿主 `ctx.promptCompiler` 服务 + `prompt_compile` 工具暴露，其他插件 `inject:['promptCompiler']` 即可在代码里调用编译能力。
- 三阶段：诊断分析 → 交互式澄清 → 结构化合成；LLM 缺失时安全降级为规则实现（agentless 不抛错）。

> ⚠️ 不宣称「首创交互式澄清」——社区已有 `yaoshuo530/dsh-prompt-enhancer`（5★）实现完整链路。本插件的增量在「可编程服务层」（让 Agent/插件也能调编译）与 LLM 诊断评分。

### 安装

```bash
# 从 Git
dsh plugin --profile desktop add git+https://github.com/Jav1es/dsh-prompt-compiler.git
# 或从 npm
dsh plugin --profile desktop add npm:dsh-prompt-compiler
```

安装后重启 DSH 即生效。源码与文档：<https://github.com/Jav1es/dsh-prompt-compiler>

## 许可

MIT
