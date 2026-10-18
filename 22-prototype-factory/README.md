# 原型工厂

一套把「一句话需求」变成「可交付、可自检、可复现」的静态原型流水线。

**核心主张**：原型的验收不该靠肉眼。每张卡片在交付前必须通过一组机器断言，断言本身也要被反向验证过——否则「全 PASS」只是脚本永远 PASS。

---

## 它解决什么问题

做原型最常见的三个坑：

| 坑 | 表现 | 这里的解法 |
|---|---|---|
| **验收靠目测** | 「看着挺好的」上线后 375px 横向滚动 | 用真实浏览器在 375px 逐元素检测溢出，指出具体是哪个元素 |
| **断言是空转的** | 脚本永远 PASS，因为断言写得太松 | 每条断言先做反向对照：故意注入缺陷，确认脚本会 FAIL |
| **环境不可复现** | 「我这儿能跑」，换台机器就挂 | 零依赖：只要一个 Chromium 内核浏览器 + Node，无构建步骤 |

---

## 快速开始

```bash
# 1. 跑全部原型的断言
node verify.mjs

# 2. 只跑某一张
node verify.mjs 01-ai-nav

# 3. 机器可读输出（接入 CI 用）
node verify.mjs --json
```

退出码 `0` 表示全部通过，非 `0` 表示有失败——可直接用于 CI 门禁。

**环境要求**：Node ≥ 18、一个 Chromium 内核浏览器（默认找 Edge）、`playwright-core`。
脚本会自动探测 `playwright-core` 的位置；找不到时改 `verify.mjs` 顶部的 `PW_CANDIDATES`。

---

## 目录约定

```
prototype-factory/
├── AGENTS.md                  # 项目级约束（写原型前必读）
├── verify.mjs                 # 断言引擎：只负责「怎么测」
├── cards/
│   ├── 01-ai-nav.mjs          # 每张卡的专属断言：负责「测什么」
│   ├── 02-pomodoro.mjs
│   └── 03-reading-list.mjs
├── 01-ai-nav/index.html       # 原型本体，一个目录一个 index.html
├── 02-pomodoro/index.html
└── 03-reading-list/index.html
```

**规则**：`NN-slug/` 目录名决定一切。引擎按这个模式自动发现卡片，并去找同名的 `cards/NN-slug.mjs`。新增原型 = 新建一个目录 + 写一个断言文件，**不用改引擎**。

---

## 新增一张原型

### 第 1 步：写原型

```bash
mkdir 04-my-prototype
# 在 04-my-prototype/index.html 里写单文件原型
```

必须遵守 `AGENTS.md` 的约束：单文件、CSS/JS 内联、375px 无横向滚动、交互有可见反馈、不做后端、数据用内联 mock。

### 第 2 步：写断言

```js
// cards/04-my-prototype.mjs
export default {
  name: '我的原型',

  async run(page, assert) {
    // assert(描述, 布尔结果, 失败时的原因)
    const count = await page.locator('.item').count();
    assert('渲染 5 个条目', count === 5, `实际 ${count} 个`);

    await page.click('#submit');
    await page.waitForTimeout(300);
    assert('提交后新增一条', await page.locator('.item').count() === 6, '没有新增');
  }
};
```

### 第 3 步：跑断言

```bash
node verify.mjs 04-my-prototype
```

通用断言（单文件、内联、无报错、375px）自动会跑，你只需要写这张卡特有的交互。

---

## 写断言的纪律

这是整套东西里最容易做砸的部分。

### 1. 断言要测「行为」，不是「存在」

```js
// ✗ 无效：元素存在不代表功能可用
assert('有进度环', await page.locator('#ring').count() === 1);

// ✓ 有效：功能真的发生了
const before = await page.evaluate(() => getComputedStyle(document.getElementById('ring')).strokeDashoffset);
await page.waitForTimeout(2000);
const after = await page.evaluate(() => getComputedStyle(document.getElementById('ring')).strokeDashoffset);
assert('进度环随倒计时变化', before !== after, `始终是 ${before}`);
```

### 2. 断言要测「终点」，不是「能力可用」

番茄钟的提示音，最初只验证了 `AudioContext` 能创建——**这什么都没证明**。真正的验证是把 `WORK_SECONDS` 改成 2 秒跑完整条路径，统计振荡器被调用了几次：

```js
await page.addInitScript(() => {
  window.__oscCalls = 0;
  const AC = window.AudioContext || window.webkitAudioContext;
  const orig = AC.prototype.createOscillator;
  AC.prototype.createOscillator = function (...a) {
    window.__oscCalls++;
    return orig.apply(this, a);
  };
});
// ... 跑完倒计时 ...
assert('完成时真的播放提示音', oscCalls >= 3, `振荡器仅调用 ${oscCalls} 次`);
```

### 3. 每条断言都要做反向对照

写完断言后，**故意把页面改坏**，确认脚本会 FAIL：

```bash
# 注入横向溢出 + console 报错
sed -i 's|</style>|.card{min-width:900px!important}</style>|' 01-ai-nav/index.html
sed -i 's|</body>|<script>console.error("INJECTED")</script></body>|' 01-ai-nav/index.html

node verify.mjs 01-ai-nav
# 期望输出：
#   ✗ 打开无 console 报错  ← INJECTED
#   ✗ 375px 无横向滚动  ← scrollWidth=914 > clientWidth=375; 溢出元素: article.card(right=914)
```

如果注入缺陷后仍然 PASS，说明这条断言是空转的，必须重写。

> **这条纪律救过一次。** 做脚手架验证时注入了 `min-width:900px`，结果「375px 无横向滚动」仍然 PASS。
> 查下去发现两个叠加的原因：
>
> 1. **`overflow-x: hidden` 让 `scrollWidth` 恒等于 `clientWidth`** —— 内容被裁掉了，但宽度量不出来；
> 2. **检查跑在空列表状态** —— 那时页面上根本没有列表项，注入的样式无从显现。
>
> 修复办法：① 增加「解除裁剪后重量」的检测（现在「内容未被裁剪」是独立断言）；
> ② 响应式检查跑两遍——初始状态一次，交互产生真实内容后再一次。
>
> 这类缺陷最阴险：页面「看起来没横向滚动」，实际右侧内容消失且点不到。

### 4. 别用「测试自己实现」的方式验证

```js
// ✗ 循环论证：用被测代码自己的状态判断自己对不对
const ok = await page.evaluate(() => document.getElementById('time').textContent === '25:00');

// ✓ 交叉验证：用独立的测量手段
const realElapsed = Date.now() - startTime;
const shownRemaining = parseTime(await page.textContent('#time'));
assert('计时精度', Math.abs((25*60 - shownRemaining) - realElapsed/1000) < 1.5, ...);
```

---

## 断言分层

引擎跑三类断言，失败都算硬性不通过：

| 层 | 断言 | 谁负责 |
|---|---|---|
| **通用** | 单文件、CSS/JS 内联、无 console 报错、375px 无横向滚动、375px 内容未被裁剪、主要按钮可点击 | 引擎自动 |
| **交互** | 需求里列的每个交互点 | `cards/*.mjs` 的 `run()` |
| **主路径** | 需要跑完整流程才能验证的（如倒计时归零） | `cards/*.mjs` 的 `runCompletion()` |

`runCompletion` 是可选的。它接收 `(htmlPath, assert, browser)`，可以自己造临时副本、自己开浏览器上下文。

**响应式检查跑两遍**：初始状态一次，交互产生真实内容后再一次。因为空列表状态下，针对列表项的布局缺陷根本不会显现——这是实测踩出来的。

---

## 已验证的三个原型

| 原型 | 断言数 | 关键验证点 |
|---|---|---|
| AI 工具导航 | 24 | 渐变文字真实渲染（`background-clip:text` 的常见坑）、搜索大小写与中文、主题持久化 |
| 极简番茄钟 | 24 | 计时精度、重置后计时器清理、**完成路径真实响铃**（振荡器调用计数） |
| 个人阅读清单 | 26 | 状态三态循环、计数与列表一致、XSS 转义、损坏存储容错、超长书名不溢出 |

合计 **74 项断言**，全部在 Edge 155（Chromium 155）上实测通过。

> 断言数按 `node verify.mjs` 的实际输出计。每张卡都含 6 项通用断言
> （单文件 / 内联 / 无 console 报错 / 375px 三项）与 1 项「交互后仍无报错」，
> 其余为卡片专属交互断言。375px 三项会跑**两遍**（初始 + 内容填充后），
> 因为空列表状态下针对列表项的布局缺陷不会显现。


---

## 已知边界

- **只测 Chromium 内核**。Safari / Firefox 的差异（`webkitTextFillColor`、`AudioContext` 构造时机）未覆盖。
- **不做视觉回归**。断言验证行为与布局约束，不比对像素。
- **不做性能测量**。首屏时间、内存占用不在范围内。
- **`runCompletion` 依赖源码里的常量名**。如果原型把 `WORK_SECONDS` 改名，注入会失败并显式报错（不会静默跳过）。
- **`playwright-core` 路径是硬编码候选列表**。换机器需要改 `PW_CANDIDATES`。

---

## 为什么不用现成的测试框架

试过 Playwright Test，三个原因放弃：

1. **它要 `playwright`（带浏览器下载），不是 `playwright-core`**。本机已有 Edge，没必要再下一个 300MB 的 Chromium。
2. **它的 fixture 模型对「一张卡片一组断言」这种线性流程是过度设计**。这里只需要一个循环。
3. **它把断言散在 `test()` 块里，不利于「一张卡一个文件」的组织**。这里一个 `cards/*.mjs` 就是一张卡的全部断言，好读好改。

代价是少了并行、重试、报告生成。当前规模（个位数原型）不需要这些。
