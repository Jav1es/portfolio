# DSH 插件安装实录：devflow 0.4.0-dev.9

记录 2026-10-18 在一台 Windows + DSH Desktop 0.2.1-rc.2 上安装 `@zhchxiao123/dsh-devflow-bundle` 的完整过程。

**价值不在"装成功了"，而在踩到的四个坑——其中三个是静默失败**，不查到底会误判为"已装好"。

---

## 结论先行

官方 README 写的一行命令，在这台机器上**走不通**。要装成需要做四件事：

1. 把 `--profile web` 改成 `--profile desktop`
2. 把版本从 `latest`(0.3.0) 换成 `0.4.0-dev.9`
3. 给 **19 个包**逐个做版本豁免（不是 1 个）
4. 手工补 `dsh.profile.bundles` 里那一行（pnpm 非零退出会中断 reconcile）

---

## 坑 1：`--profile web` 不是 Desktop 在跑的 profile

README 给的命令是：

```bash
dsh plugin --profile web add @zhchxiao123/dsh-devflow-bundle
```

但 Desktop 实际启动的是 `desktop` profile。证据是进程命令行：

```
DeepSeek Harness.exe --expose-internals "...\dsh-desktop-host\lib\index.js" `
  "...\app.asar\dsh" `
  C:\Users\<user>\.dsh\profiles\desktop `
  ...
```

`web` 是个只有 `dsh-base` + `dsh-web-app` 的空 profile。装进去**侧边栏不会有任何变化**，因为 Desktop 根本不读它。

**怎么查**：

```powershell
Get-CimInstance Win32_Process -Filter "Name='DeepSeek Harness.exe'" |
  Where-Object { $_.CommandLine -like '*dsh-desktop-host*' } |
  Select-Object -ExpandProperty CommandLine
```

**正确做法**：`--profile desktop`。

---

## 坑 2：`latest` 版本与本宿主不兼容，且失败是静默的

npm `latest` 是 `0.3.0`。它的看板 `lib/client.js` 里有：

```js
require("@deepseek-ai/dsh-client-runtime/client")
```

而宿主 0.2.1-rc.2 的 bundle 里**没有** `dsh-client-runtime` 这个模块 id。扫描 asar 确认：

| 模块 id | 在 asar 中出现次数 |
|---|---|
| `dsh-client-runtime` | **0** |
| `dsh-client-store` | 9 |
| `dsh-client-ui-primitives` | 9 |
| `dsh-tools`（正对照） | 301 |

0 次意味着 0.3.0 的看板加载时会 `ERR_MODULE_NOT_FOUND`。`0.4.0-dev.9` 改成 require `dsh-client-store` + `dsh-client-ui-primitives`，两者宿主都有。

**教训**：看到 `latest` 就直接装是错的。先查它的 client 侧 `require()` 是否都在宿主里存在。

```powershell
# 解包看 client.js 的 require 列表
tar -xzf bundle.tgz -C ./x
Select-String -Path ./x/package/lib/client.js -Pattern 'require\("([^"]+)"\)' -AllMatches
```

---

## 坑 3：版本豁免要给 19 个包，不是 1 个（且被拒时静默）

第一次装完，`dsh plugin add` 报了个非零退出（tree-sitter 的 build script 被忽略），但包确实装进去了。我手工补上 `dsh.profile.bundles` 那一行，重启——**devflow 没起来，但启动日志里一个字都没有**。

真相在 `.plugin-manager/logs/operation-*/pnpm.log` 里：

```
Plugin @zhchxiao123/dsh-devflow-filesystem@0.4.0-dev.9 is incompatible with dsh 0.2.1-rc.2:
  requirements {"@deepseek-ai/dsh-invariants":"0.1.5-rc.2"}.
  ...
  dsh: it stays installed but profile startup denies it until you grant an
  exemption for those exact versions.
```

**bundle 外壳的豁免不等于子包的豁免。** 这个 bundle 挂 17 个独立包，每个包有自己的 peer 声明，各自需要豁免。只豁免外壳，17 个子包全部被拒——而且**拒绝不报错，静默跳过**。

**正确做法**：

```powershell
$pkgs = @('dsh-devflow-filesystem','dsh-devflow-tool','dsh-devflow-guidance',
  'dsh-devflow-worktree','dsh-devflow-command','dsh-devflow-fs-guard',
  'dsh-devflow-spec-filesystem','dsh-devflow-spec-tool','dsh-devflow-spec-sentinel',
  'dsh-devflow-iron-rules','dsh-devflow-artifact-gate','dsh-devflow-agent-gate',
  'dsh-devflow-gates','dsh-devflow-review-gate','dsh-devflow-parent-gate',
  'dsh-devflow-web','dsh-devflow-ui','dsh-devflow','dsh-devflow-spec')

foreach ($n in $pkgs) {
  dsh plugin --profile desktop allow-version "@zhchxiao123/$n@0.4.0-dev.9" `
    --dsh-version 0.2.1-rc.2 --accept-risk
}
```

**验证豁免是否齐了**：

```powershell
$j = Get-Content "$env:USERPROFILE\.dsh\profiles\desktop\compatibility.json" -Raw | ConvertFrom-Json
($j.PSObject.Properties | Where-Object { $_.Name -like '*devflow*' }).Count
# 应该是 19（17 个子包 + bundle + spec 核心）
```

### 豁免的合理性判断

闸门拦的是 `@deepseek-ai/dsh-invariants@0.1.5-rc.2` 这个 peer。查证：

- 宿主 306 个 `@deepseek-ai` 包里**没有** `dsh-invariants` 这个包目录
- 但 asar 里有 **24 处** `ctx.invariants.register(...)` —— 说明 `invariants` 是**服务名**，由宿主提供，不是独立包
- devflow 的 17 个入口**全是主入口**（`lib/index.js`），主入口的运行时 import 只有 `cordis` / `schemastery` / `dsh-tools`
- 那些 `inject = ['invariants']` 的 companion 在 `lib/invariant.js`，bundle patch 一个都没挂

**结论**：这个 peer 是**元数据层面的不匹配**，不是运行时必需的依赖。豁免合理。

但这只是我的判断——`--accept-risk` 字面写着 data loss，最终要不要豁免是人的决定。

---

## 坑 4：pnpm 非零退出会中断 reconcile

`dsh plugin add` 的流程是：pnpm 装包 → 读每个包的 `dsh.bundle` 声明 → 往 `dsh.profile.bundles` 追加。

这次 pnpm 因为 tree-sitter 的 `IGNORED_BUILDS` 返回了 1，**reconcile 那一步没执行**。结果是：

- `node_modules/@zhchxiao123/` 下 20 个包都在 ✓
- `package.json` 的 `dependencies` 写入了 ✓
- `package.json` 的 `dsh.profile.bundles` **没有那一行** ✗

**怎么发现**：

```powershell
(Get-Content "$env:USERPROFILE\.dsh\profiles\desktop\package.json" -Raw | ConvertFrom-Json).dsh.profile.bundles
# 看有没有 @zhchxiao123/dsh-devflow-bundle
```

**怎么补**：在 `dsh.profile.bundles` 数组末尾加一行 `"@zhchxiao123/dsh-devflow-bundle"`。

> 注意：`Packages: +30 -6` 里的 `-6` 是 lockfile 结构重排，不是删包。用 `Compare-Object` 对比新旧 lockfile 确认没有包被移除。

---

## 验证清单

装完重启后，按顺序验证：

| # | 检查 | 命令 | 通过标准 |
|---|---|---|---|
| 1 | bundle 已登记 | 读 `package.json` 的 `dsh.profile.bundles` | 含 `@zhchxiao123/dsh-devflow-bundle` |
| 2 | 豁免齐全 | 数 `compatibility.json` 里 devflow 条目 | 19 条 |
| 3 | 组合树正确 | `dsh --profile headless --patch <bundle的patch> --dump-config` | 出现 17 行 `id: devflow*` |
| 4 | 路由已挂 | `POST /devflow/api/list` | 返回 401（要认证）而非 404/405 |
| 5 | 工具可用 | 调 `devflow_list` | 返回卡片列表或 "No devflow cards." |
| 6 | 红线未碰 | 数 `node_modules/@deepseek-ai` 实体 | 与安装前一致（本机基线 6 个） |

第 4 步的 401 是关键信号：401 说明路由存在、只是要认证；404/405 说明根本没挂上。

---

## 回退方案

装之前存快照，装之后留回退脚本：

```powershell
# 装前
$snap = "$env:USERPROFILE\.dsh\profiles\desktop\snapshots\$(Get-Date -f yyyy-MM-dd)\pre-devflow"
New-Item -ItemType Directory -Force -Path $snap | Out-Null
foreach ($f in @('package.json','cordis.patch.yml','pnpm-lock.yaml','pnpm-workspace.yaml','compatibility.json')) {
  Copy-Item "$env:USERPROFILE\.dsh\profiles\desktop\$f" "$snap\$f" -EA SilentlyContinue
}
```

回退时还原这五个文件 + 删 `node_modules/@zhchxiao123` + `dsh plugin --profile desktop install`。

---

## 一句话总结

**装插件不是"跑一条命令"，是"跑命令 + 查日志 + 数豁免 + 验路由"。** 这次四个坑里有三个不报错——如果不主动去查 `.plugin-manager/logs/` 和 `compatibility.json`，会一直以为装好了。
