# 原型工厂 · 归档说明

这是「原型工厂」方法论与断言引擎的**作品集归档副本**，原始工作目录在本地 `prototype-factory/`。

## 目录

```
22-prototype-factory/
├── README.md                        # 方法论全文（从这里开始读）
├── verify.mjs                       # 断言引擎
├── cards/                           # 各卡片的专属断言
│   ├── 01-ai-nav.mjs
│   ├── 02-pomodoro.mjs
│   └── 03-reading-list.mjs
├── docs/
│   ├── devflow-workflow.md          # devflow 流水线实操
│   └── dsh-plugin-install-notes.md  # 插件安装 4 个坑
├── scripts/
│   ├── new-card.mjs                 # 脚手架：新建卡片
│   └── add-portfolio-item.mjs       # 向本作品集追加条目
├── templates/
│   └── card-spec.template.mjs       # 断言模板
└── demos/                           # 三个原型的可运行副本
    ├── 01-ai-nav/index.html
    ├── 02-pomodoro/index.html
    └── 03-reading-list/index.html
```

## 想直接看效果

`demos/` 下三个 `index.html` 双击即可打开，无任何外部依赖：

- **01-ai-nav** — 6 个工具卡片、搜索过滤、深浅色切换
- **02-pomodoro** — 25 分钟倒计时、环形进度、Web Audio 合成提示音
- **03-reading-list** — 增删改、三态切换、按状态筛选、localStorage 持久化

## 想跑断言

归档副本里 `verify.mjs` 的目录约定与原始工作目录一致（`NN-slug/index.html` + `cards/NN-slug.mjs`），但 `demos/` 多了一层，所以需要把 demos 内容提上来，或改 `discoverCards()` 的扫描根。

完整可跑的环境在原始工作目录。归档副本的价值是**方法论与代码可读**，不是开箱即跑。

跑法（在原始工作目录）：

```bash
node verify.mjs              # 全部卡片
node verify.mjs 01-ai-nav    # 单张
node verify.mjs --json       # 机器可读
```

## 这套东西的核心主张

**原型的验收不该靠肉眼，断言本身也不该被信任——除非它先被证伪过。**

`README.md` 里记了三次「断言其实在空转」的实例，以及每次是怎么发现的。这是整个项目里最值得看的部分。
