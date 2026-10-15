# HANDOFF — 个人作品集多页站（portfolio-publish）

> 工作目录：`D:\Jav1e Flies\00-工作区\portfolio-publish`
> 最新提交：`680e876`（前 4 点已完成并通过截图验收）
> 待办：**第 5 点「部署到线上 https://jav1es.github.io/portfolio/」未做**

## 用户最后 5 点需求（状态）

| # | 需求 | 状态 |
|---|---|---|
| 1 | 浏览掉帧明显 → 优化性能 | ✅ 已消除 blur / backdrop-filter 掉帧源 |
| 2 | 更 SpaceX 的黑白高对比 | ✅ 中性色改近黑白、网格线改近黑、硬边阴影 |
| 3 | 更多动画效果 | ✅ 扫光/脉冲/渐变流光/滚动视差 |
| 4 | 三个岗位页底下不显示作品，只有作品模块 | ✅ 修好 + 删掉跨岗位跳转按钮 |
| 5 | **更新到线上作品集** | ❌ **未做，需新会话继续** |

## 第 5 点：部署怎么做

线上站 `https://jav1es.github.io/portfolio/` 由 **`Jav1es/portfolio` 仓库**的 GitHub Pages 服务
（`homepage` 字段已确认指向该 URL，`has_pages: true`）。

**关键事实**：
- 当前工作区是**独立 git 仓库**，不是 `Jav1es/portfolio` 的克隆。
- 线上版现在是**旧的单页版**（147KB `legacy-singlepage.html` 的内容），本地已把该文件恢复保存为 `legacy-singlepage.html`。
- 本地新增了多页版：`index.html` / `fde.html` / `ai-agent.html` / `vibe-engineer.html` / `about.html`
  + `styles.css` / `menu.js` / `works.js` / `works-data.js` / `effects.js`。

**部署方案（需先问用户确认）**：
1. 确认远端仓库地址与推送方式（`git remote -v` 当前应为空，需用户提供 `Jav1es/portfolio` 的 push 权限）。
2. 决定是否**整仓替换**（多页版直接成为 `portfolio` 仓库内容）还是**放进子目录**（保留旧单页在根）。
3. GitHub Pages 需仓库 Settings → Pages → Source 指向对应分支。
4. 注意旧站有 `hitech-self-assessment/` 子目录（本地有同名目录，内容一致），部署时别覆盖丢失。
5. 本地链接 87 条全部是相对路径（`./01-ai-toolkit/xxx.md` 等），
   **这些依赖文件当前不在本工作区**（它们是上级目录的兄弟项目），
   部署前必须确认：要么把那些目录一起推上去，要么把链接改成 GitHub 仓库地址。
   ⚠️ 这是部署的最大风险点——线上版如果缺这些文件，全部证明链接 404。

## 技术栈与约束（必须遵守）

- 纯 HTML5 + CSS3 + 原生 JS，**禁** Bootstrap/Tailwind 等框架，**禁**外部 CDN 字体。
- 主色 ≤ 3 种：`--blue #2563eb` / `--cyan #0e7490` / `--amber #d97706`。
- 字体 ≤ 2 种：Inter + 系统无衬线栈（`--font`）。
- 禁自动播放音视频；禁要求登录/提交表单。
- 每图必须有 `alt`（SVG 用 `role="img"` + `aria-label`）。
- 首页 3G 加载 ≤ 3s（当前估算 1.61s）。
- 岗位页不得出现无关技术栈描述。

## 文件结构

```
index.html         首页（姓名 / ≤120字简介 / 4 优势 / 3 入口 / 21 瓦片 + 筛选器）
fde.html           FDE 前线部署工程师（8 模块）
ai-agent.html      AI 智能体开发工程师（5 模块）
vibe-engineer.html VibeCoding/VibeEngineering（8 模块）
about.html         关于我（六大能力类目 / 时间线）
styles.css         共享样式（背景层 / 3D / 动画 / 响应式）
menu.js            汉堡菜单折叠
effects.js         3D 倾斜 / 进场 / 数字滚动 / 进度条 / 视差
works.js           渲染层（ROLES / MOTIFS SVG / cardHTML / tileHTML / bindFilter / bindExpand）
works-data.json    数据源（由脚本生成，勿手改）
works-data.js      同上内联版（供 file:// 双击打开绕过 CORS）
extract-works.mjs  从 legacy-singlepage.html 抽取 18 模块 → works-data.json
patch-works.mjs    重编号 + 补 3 新模块 + 分配 motif（幂等）
legacy-singlepage.html  旧单页版备份（147KB，线上就是它）
```

## 数据与编号（已对齐真实目录/GitHub）

21 个模块，编号 01–21 连续无缺口，14 个有本地目录的与目录号 100% 对齐：

```
fde   = 01 02 03 05 06 08 10 11      (8 个)
agent = 04 07 09 13 14              (5 个)
vibe  = 12 15 16 17 18 19 20 21     (8 个)
```

GitHub `Jav1es` 公开仓库 8 个（全 MIT）：portfolio / enterprise-agents(2★, Python) /
dsh-prompt-compiler / dsh-bridge / workbuddy-bridge / dsh-knowledge-guide /
dsh-toolkit / dsh-local-plugins。`workbuddy-bridge` 与 `hitech-self-assessment`
是上一轮补进作品集的（此前旧单页没有）。

## 已验证的坑（别再踩）

1. **`vision_html_screenshot` 同名文件走缓存** → 改 CSS 后必须 `Copy-Item` 到 `.verify/` 临时名再截图，验完删沙盒。
2. **脚本注入必须校验 `<script>` 开闭配对** → 上轮多插一个开标签，四个岗位页 JS 全废，
   页面看着正常（标题/导航都在），只有作品区空白，肉眼极难发现。
3. **不要用纯 CSS `opacity:0` 做进场初始态** → IO 不回调就整页空白。已改为
   `.reveal-armed` 由 JS 按需加 + 3 秒兜底。
4. **`backdrop-filter` / `filter: blur()` 是滚动掉帧主因** → 已全删。
5. **PowerShell 管道里 `$_.Length` 会被自动变量 `$Length` 干扰** → 用 `$_.Count` 或先赋值。
6. **PowerShell 比较 `'01'` 会被转成 int 1** → 必须 `[string]` 强转再比。
7. 无头截图环境里 `IntersectionObserver` 回调不可靠 → 同步探针要写在渲染回调内部，
   别用 `window.load + setTimeout`。

## 验收基线（`680e876` 时）

- FDE 8 卡 / AI Agent 5 卡 / Vibe 8 卡 / 首页 21 瓦片，四页截图全部正常渲染
- 本地引用 87 条零死链
- 首屏 102KB，3G 估算 1.61s
- 实际生效的 `blur` / `backdrop-filter` 均为 0
- 五页 `<script>` 开闭配对正确
