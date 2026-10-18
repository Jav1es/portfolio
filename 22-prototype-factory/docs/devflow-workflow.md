# devflow 流水线实操

记录用 `@zhchxiao123/dsh-devflow` 0.4.0-dev.9 跑完 3 张卡片的实际过程。

---

## 它是什么，不是什么

**是**：一套任务卡状态机 + 权威 journal + 浏览器看板。卡片从 `draft` 走到 `done`，每一步都落盘可追溯。

**不是**：一个自动跑流水线的引擎。卡片流转必须由人（或 Agent）显式调用工具推进。

这一点最容易误解。看 `dsh-devflow-web` 的写操作表就清楚了：

```js
const WRITES = {
  "archive-done": ...,
  archive: ...,
  // 没有 transition，没有 create
};
```

README 明说「store 的写操作——`transition`、`create`、`claim`、`attachArtifact`、`archiveDone`——一个都不投影」。浏览器看板**只读**。

所以"跑流水线"的实际含义是：**你（或 Agent）按状态机手动推进，journal 记录过程**。

---

## 合法流转路径

```
draft → designing → ready → developing → reviewing → testing → done
                                    ↕           ↕         ↕
                                designing    developing  designing
```

从 `lib/index.js` 的 `FLOW` 常量：

```js
const FLOW = {
  draft:      ["designing"],
  designing:  ["ready"],
  ready:      ["developing"],
  developing: ["reviewing", "designing"],
  reviewing:  ["testing", "developing", "designing"],
  testing:    ["done", "developing", "designing"],
  done:       []
};
```

**关键点**：

- `draft` **不能**直接到 `ready`，必须先过 `designing`
- 回退边是刻意设计的：`reviewing`/`testing` 发现实现有问题退回 `developing`，发现设计有问题退回 `designing`。README 解释了为什么需要第二条——否则"设计返工"会记成一次不存在的评审
- `done` 是终点，没有出边

---

## 完整操作序列

每张卡片 6 次流转。`expectedRevision` 是乐观并发令牌，每次流转后 +1。

```js
// 建卡（落在 draft，rev 1）
devflow_create({ title, body, slug })

// 1. draft → designing
devflow_transition({ id, to: 'designing', expectedRevision: 1, reason: '需求明确' })

// 2. designing → ready
devflow_transition({ id, to: 'ready', expectedRevision: 2, reason: '设计确定' })

// 3. ready → developing（用 take 而不是 transition，它会取独占租约）
devflow_take({ id, expectedRevision: 3 })

// 4. developing → reviewing
devflow_transition({ id, to: 'reviewing', expectedRevision: 4, reason: '实现完成 + 自检结果' })

// 5. reviewing → testing
devflow_transition({ id, to: 'testing', expectedRevision: 5, reason: '审查通过' })

// 6. testing → done
devflow_transition({ id, to: 'done', expectedRevision: 6, reason: '测试通过' })
```

`reason` 会进 journal。**写具体内容**，不要写"推进"——半年后回看时，那行 reason 是唯一能告诉你当时为什么动的东西。

---

## 存储位置：一个容易踩的坑

卡片存在 `<会话启动时的 cwd>/.devflow/tasks/`，**不是**你中途 `cd` 过去的目录。

这次的实际结果：

- 会话启动时 cwd 是 `D:\Documents\deepseek-harness\default-workspace`
- 我中途 `working_directory` 切到 `prototype-factory`
- 卡片落在了 `default-workspace\.devflow\tasks\`

这不是 bug。devflow 的 `root` 配置**故意留空**，让"每个调用方自己的 workspace 解析它"，这样一个 host 能服务多个项目。但代价是：**root 在会话生命周期内是固定的**。

**验证**：

```powershell
Get-ChildItem "<会话cwd>\.devflow\tasks" -Directory | Select-Object Name
```

**如果想让卡片落在特定项目下**：在项目目录里启动会话，或在 profile 的 `cordis.patch.yml` 里显式 pin 一个 root：

```yaml
- id: devflow
  config:
    root: D:/path/to/project/.devflow
```

---

## journal 结构

每张卡一个目录，两个文件：

```
.devflow/tasks/0001-ai-nav/
├── card.md          # frontmatter + Markdown 正文（投影，可重建）
└── journal.jsonl    # 追加式权威历史
```

`journal.jsonl` 每行一条记录：

```json
{"type":"created","at":"2026-10-18T15:14:02.123Z", ...}
{"type":"transition","at":"2026-10-18T15:14:56.456Z","from":"draft","to":"designing", ...}
```

**`card.md` 是投影，`journal.jsonl` 才是权威。** README 说得很清楚：frontmatter 里的 `stage`/`stageRevision` 漂移时"告警并被 journal 覆盖"。

所以：

- 想改卡片状态 → 用工具，不要手改 `card.md`
- 想查真实历史 → 读 `journal.jsonl`
- `card.md` 丢了不致命，下一次流转会重新物化（但 title 归 frontmatter 所有，不可恢复）

---

## 四道 gate 默认是关的

bundle 挂载时，四道 gate 的状态：

| Gate | 默认 | 为什么 |
|---|---|---|
| `devflow-artifact-gate` | **disabled** | 空的 artifact 规格集什么都拦不住，而"哪种产物守哪条边"是项目决策 |
| `devflow-agent-gate` | **disabled** | 每次检查都花模型预算，且必需的 `reportDir` 没有可辩护的默认值 |
| `devflow-gates` | **disabled** | 空 gate 集不否决任何东西，而"哪条命令守哪条边"是项目决策 |
| `devflow-parent-gate` | enabled | 无需配置——规则是关系本身，不是设置 |
| `devflow-review-gate` | enabled | 同上 |

**这意味着**：默认状态下，`developing → reviewing` 不会自动跑测试，`reviewing → testing` 不会自动做代码审查。**流转是否合法只看状态机，不看质量。**

如果你想让 gate 真的拦东西，得自己配：

```yaml
- id: devflow-gates
  disabled: false
  config:
    edges:
      'developing->reviewing': ['node verify.mjs']
    approvals: ['reviewing->testing']
```

这时 `developing → reviewing` 会先跑 `node verify.mjs`，失败就拒绝流转。**这才是把断言引擎接进流水线的正确方式**。

---

## 与断言引擎的接法

当前状态：断言是**手动跑的**，结果写进 `reason`。

```js
devflow_transition({
  id: '0002-pomodoro',
  to: 'reviewing',
  expectedRevision: 4,
  reason: '实现完成：02-pomodoro/index.html。自检 20 项全 PASS，含完成路径真实测'
});
```

更严谨的做法是配 `devflow-gates`，让 gate 自己跑：

```yaml
- id: devflow-gates
  disabled: false
  config:
    edges:
      'developing->reviewing': ['node verify.mjs']
      'testing->done': ['node verify.mjs']
```

这样"自检通过"从一句自我声明变成一道机械门禁。**本次没配**——因为 bundle 默认关闭，开启需要改 profile 配置并重启，属于另一个决策。

---

## 看板

浏览器访问 `<host>/devflow/api/list`（POST，带会话）或侧边栏的 devflow 入口。

看板**只读**。移动卡片、归档、接管租约走 `/devflow` 斜杠命令或模型工具。

`/devflow` 子命令：

| 命令 | 作用 |
|---|---|
| `/devflow` | 看板 |
| `/devflow show <id>` | 单卡详情 |
| `/devflow move <id> <stage> [reason]` | 移动（无旁路，gate 照常裁决） |
| `/devflow takeover <id>` | 强制接管租约 |
| `/devflow archive` | 归档所有 done 卡 |

---

## 实测数据

三张卡片，各 7 条 journal（1 创建 + 6 流转）：

| 卡片 | 用时 | 断言数 |
|---|---|---|
| 0001-ai-nav | 2.7 min | 20 |
| 0002-pomodoro | 7.4 min | 20 |
| 0003-reading-list | 9.3 min | 22 |

用时来自 journal 首末条时间戳差值。

**耗时差异的原因**：番茄钟和阅读清单各踩了一个真实的坑。番茄钟的"完成时响铃"最初只验证了 `AudioContext` 可创建，属于无效验证，返工重测；阅读清单做了 XSS / 损坏存储 / 超长书名三类边界检查。**这两段时间花得值**——第一个坑如果不返工，交付的就是一个"看起来有提示音但可能不响"的原型。
