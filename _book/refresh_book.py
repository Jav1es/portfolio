"""书稿订正 + 补章：模块数 14→17、RAG 数字订正、客户脱敏、失效副本链接改 GitHub。

用法：python _book/refresh_book.py
"""
from __future__ import annotations

import io
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BOOK = Path(__file__).resolve().parent
HTML = BOOK / "portfolio-book.html"
BUILD = BOOK / "build_book.py"

NEW_CHAPTERS = """
<!-- ================= 模块 15 ================= -->
<div class="chapter" id="m15">
  <h1 class="chap"><span class="no">15</span>DeepSeek Harness 本机插件三件套（开源） <span class="st st-ok">个人开源</span></h1>
  <p class="chap-lead">对应 JD：AI 智能体开发工程师 / 平台工程</p>

  <div class="hl">
    <div class="q"><div class="num">3个</div><div class="lb">自研 DSH 插件</div></div>
    <div class="q"><div class="num">100%</div><div class="lb">离线可跑 · 零云依赖</div></div>
    <div class="q"><div class="num">MIT</div><div class="lb">开源许可</div></div>
  </div>

  <p class="pitch">AI 助手天天用，但工具链缺什么就得等官方排期。我直接读了宿主插件的源码与打包格式，自己写了三个插件补上空白：消息推手机、文件能预览、待办与推理过程看得见。</p>

  <div class="field"><span class="k">业务痛点：</span><span class="v">日常重度使用 DeepSeek Harness，但官方生态里缺三样东西：长任务跑完人不在电脑前就不知道结果；侧边栏点开图片和 PDF 只能看文件名；待办清单与模型的推理过程藏在会话流里，没有独立面板可看。这些不是「不会用」，而是工具本身没有。</span></div>
  <div class="field"><span class="k">我的角色：</span><span class="v">我独立完成了三个插件的设计、实现与打包。做法是先逆向宿主：读 app.asar 里的插件加载器与已有插件源码，确认插件的注册点（工具注册、侧边栏文件查看器注册、面板插槽）与 bundle 打包约定，再用 ESM 写实现、按约定挂载。全过程不需要官方 SDK，也不依赖任何云端服务。</span></div>

  <h2>方案架构</h2>
  <p>宿主 DeepSeek Harness → profile 的 bundles 清单加载插件 → 插件通过 package.json 的 dsh.bundle.patch 声明配置层 → cordis.patch.yml 注入注册点。三个插件分别是：host 侧插件（监听助手回复事件 → 经 Server酱 HTTP 接口推送到微信）、web 侧插件 A（向 better-sidebar 注册图片/PDF 文件查看器）、web 侧插件 B（注册右侧栏 Todo 面板与 Thinking 面板两个标签页）。</p>

  <h2>工具栈</h2>
  <p><span class="tool">Node.js ESM</span><span class="tool">零运行时依赖</span><span class="tool">DSH 插件 API</span><span class="tool">Cordis bundle</span><span class="tool">React</span><span class="tool">app.asar 逆向</span></p>

  <h2>实施步骤</h2>
  <ol>
    <li>逆向宿主：解包 app.asar，读插件加载器与 dsh-tool-todo 等已有插件</li>
    <li>确认注册点签名：工具注册、betterSidebar.registerFileViewer、右侧栏面板插槽</li>
    <li>按 bundle 约定搭建骨架：package.json 声明 dsh.bundle.patch，cordis.patch.yml 声明配置</li>
    <li>实现消息推送插件：未配置密钥时静默停用，不报错</li>
    <li>实现文件预览插件：注册图片与 PDF 查看器</li>
    <li>实现面板插件：Todo 面板读待办投影，Thinking 面板展示推理流</li>
    <li>凭据卫生：密钥只从本机配置读取，代码里默认为空串</li>
    <li>纳入版本控制并开源：抽独立仓库、补 README 与 MIT、推送前跑凭据扫描</li>
  </ol>

  <h2>关键难点与解决</h2>
  <p>难点在于没有任何官方文档可查，全部要靠读源码反推。最典型的是插件加载时机与注册点的签名——写错了不会报错，只是「没反应」，只能靠对照已有插件的写法逐个比对。另外消息推送插件踩到凭据卫生的坑：密钥如果写进代码就会随仓库泄露，所以设计成默认空值 + 本机配置文件读取，未配置时静默降级。</p>

  <h2>量化测算</h2>
  <table class="mt">
    <tr><td>自研 DSH 插件</td><td>3 个，全部 MIT 开源</td></tr>
    <tr><td>运行时依赖</td><td>零，仅用 Node 内置模块与宿主 API</td></tr>
    <tr><td>推送密钥</td><td>默认空值，未配置时静默停用（0 泄露风险）</td></tr>
    <tr><td>凭据扫描</td><td>全仓库 14 个文件，命中 0 处真实密钥</td></tr>
  </table>

  <h2>可复用资产</h2>
  <div class="chips"><span class="chip">dsh-serverchan-notify</span><span class="chip">dsh-sidebar-preview</span><span class="chip">dsh-workpanel</span><span class="chip">仓库 README</span><span class="chip">MIT 许可</span></div>

  <h2>证明链接</h2>
  <div class="links"><span class="link-item url">github.com/Jav1es/dsh-local-plugins</span></div>

  <h2>复盘</h2>
  <p>如果重做，我会先把「宿主怎么加载插件」写成一页笔记再动手——中途有两次因为注册点签名理解错了，代码不报错但功能不生效。另外这三个插件一开始直接写在插件目录里、完全没进版本控制，等于单点存放；直到做资产盘点才发现，这也是我现在坚持「凡自产先入库」的原因。</p>
</div>

<!-- ================= 模块 16 ================= -->
<div class="chapter" id="m16">
  <h1 class="chap"><span class="no">16</span>DSH 运维工具箱：升级自检 / 插件兼容预检 / 生态全量调研（开源） <span class="st st-ok">个人开源</span></h1>
  <p class="chap-lead">对应 JD：AI 智能体开发工程师 / 平台工程</p>

  <div class="hl">
    <div class="q"><div class="num">4382</div><div class="lb">插件目录全量调研</div></div>
    <div class="q"><div class="num">3</div><div class="lb">工具与文档组件</div></div>
    <div class="q"><div class="num">MIT</div><div class="lb">开源许可</div></div>
  </div>

  <p class="pitch">一次升级把已装插件静默打废，排查半天。我干脆把「升级自检、装前兼容预检、缺失能力补丁」做成可跑的脚本与文档开源出来——这类坑不该靠人肉记。</p>

  <div class="field"><span class="k">业务痛点：</span><span class="v">DSH 桌面端自动升级后，已装插件会因 peer 依赖精确 pin 与运行时失配而「看着装上了、功能却不生效」；社区工具的兼容性口径与宿主真实安装门不一致（前者偏乐观），照着它选型会踩坑。另外生态里缺少的能力只能自己补，而补丁一升级就被覆盖。</span></div>
  <div class="field"><span class="k">我的角色：</span><span class="v">我独立完成了工具链的设计、实现与文档化：把升级自检、插件兼容性预检、缺失能力补丁固化成可重复执行的脚本；对社区插件目录做全量兼容性调研并写出选型报告；所有机器相关路径改为环境变量或按当前用户推导，脚本对锚点做唯一性检查，绝不静默改错。</span></div>

  <h2>方案架构</h2>
  <p>三个组件各自独立可跑：dsh-maintenance（比对桌面运行时与全局 CLI 版本、核验 peer 兼容性，退出码 0/1/3 可做门禁，含 cost-meter 官方余额的账号登录态补丁与 app.asar 只读探针）；compat-check（纯 PowerShell 实现 semver 判定，判定候选插件 peer 与 engines）；ecosystem-survey（对 4382 条社区插件目录做全量兼容性判定与选型分析）。</p>

  <h2>工具栈</h2>
  <p><span class="tool">PowerShell 5.1+</span><span class="tool">Node.js</span><span class="tool">semver 自实现</span><span class="tool">app.asar 逆向</span><span class="tool">MCP stdio</span></p>

  <h2>实施步骤</h2>
  <ol>
    <li>复盘真实事故：桌面端 rc.1 升到 rc.2，某插件 peer 是精确 pin 被拒绝加载</li>
    <li>实现升级自检脚本，退出码三分档，对已知假阳性单独说明</li>
    <li>实现兼容性预检工具：纯 PowerShell 写 semver 判定，对照 node-semver 验证</li>
    <li>定位 cost-meter 余额为空的根因：只实现了 API Key 取数路径，本机是账号登录态</li>
    <li>写补丁增加账号 token 回退分支，令牌只在签发来源与目标 origin 一致时返回</li>
    <li>补幂等打补丁 / 回滚 / 端到端验证三个脚本，结构一变就 FATAL 退出</li>
    <li>做 4382 条插件目录全量调研，区分「社区口径」与「宿主真实安装门」</li>
    <li>脱敏后开源：机器路径改为环境变量，实跑验证没有改坏</li>
  </ol>

  <h2>关键难点与解决</h2>
  <p>难点有三处。一是口径不一致——社区市场工具判定「兼容」的 481 个包，按宿主真实安装门其实是会被拒的，所以必须自己有一把尺子并把两套口径都写清楚。二是补丁的健壮性——插件升级会覆盖源码，补丁必须幂等、必须对锚点做唯一性检查。三是脱敏——脚本原本写死了本机用户名路径，开源前必须全部改为环境变量，改完还要逐个实跑验证。</p>

  <h2>量化测算</h2>
  <table class="mt">
    <tr><td>插件目录调研</td><td>4382 条：2253 条有 npm 包可探测，2129 条无 npm 包</td></tr>
    <tr><td>兼容性判定</td><td>可安装 604 / 未声明版本可放行 918 / 被明确阻断 731</td></tr>
    <tr><td>口径偏差发现</td><td>社区市场判「兼容」但被宿主真实安装门阻断的达 481 条</td></tr>
    <tr><td>升级自检退出码</td><td>0 通过 / 1 不兼容 / 3 无法核实（不得当通过）</td></tr>
    <tr><td>凭据扫描</td><td>全仓库 14 个文件命中 0 处真实密钥</td></tr>
  </table>

  <h2>可复用资产</h2>
  <div class="chips"><span class="chip">升级后自检脚本</span><span class="chip">DSH 维护手册</span><span class="chip">插件兼容性预检工具</span><span class="chip">cost-meter 补丁（三脚本）</span><span class="chip">app.asar 只读探针</span><span class="chip">生态选型报告 + xlsx</span></div>

  <h2>证明链接</h2>
  <div class="links"><span class="link-item url">github.com/Jav1es/dsh-toolkit</span></div>

  <h2>复盘</h2>
  <p>如果重做，我会把「升级自检」挂到桌面端升级流程里自动触发，而不是靠人记得跑——这次事故的本质就是「没有门禁」。另外我一开始直接采信了社区市场工具的兼容性判定，直到实测发现它的口径比宿主真实安装门宽松得多，才回头按宿主规则重算；这 481 条的差值就是「不自己验证口径」的代价。</p>
</div>

<!-- ================= 模块 17 ================= -->
<div class="chapter" id="m17">
  <h1 class="chap"><span class="no">17</span>知识指南：把「先检索再作答」写成可复用的规程（开源） <span class="st st-ok">个人开源</span></h1>
  <p class="chap-lead">对应 JD：AI 智能体开发工程师</p>

  <div class="hl">
    <div class="q"><div class="num">1</div><div class="lb">可复用检索规程</div></div>
    <div class="q"><div class="num">100%</div><div class="lb">零云依赖 · 纯 Markdown</div></div>
    <div class="q"><div class="num">MIT</div><div class="lb">开源许可</div></div>
  </div>

  <p class="pitch">AI 助手最大的坑不是答不好，是凭记忆编。这个 skill 把「先检索再作答、强制标来源、置信度标注、未命中先做正对照」写成一条条可执行的规程，让答案可验证、让「查不到」变可信。</p>

  <div class="field"><span class="k">业务痛点：</span><span class="v">DSH 里没有自动上下文检索——除了 AGENTS.md，一切知识都得主动调工具才会进上下文。同一类问题在不同会话里会得到不同答案：有时认真检索、有时凭训练记忆直接编。更麻烦的是「查不到」本身不可信——检索通道故障和内容真的不存在，两种情况都表现为搜不到，一旦分不清就会把「没查」误当成「没有」，写进对外材料就是事故。</span></div>
  <div class="field"><span class="k">我的角色：</span><span class="v">我独立完成了规程的设计、落地与验证。先把「DSH 到底有没有自动检索」这件事查实（结论是没有），再把散落的检索经验收敛成有路由、有格式、有红线、有坑位清单的规程；然后用三道真实工作题做能力测试（新会话、无上下文提示），验证纪律是真的被执行、而不是只写在文件里。</span></div>

  <h2>方案架构</h2>
  <p>规程分三步：① 问题类型判别——本地事实 / 外部现状 / 深度调研 / 推理写作，本地优先于联网；② 检索路由——本地走文件与 TiddlyWiki（长期记忆），外部走 AnySearch，垂直库优先（学术 / 代码 / 工商 / 财报 / 专利 / 法律 / 安全）；③ 回答格式——结论先行，每个关键事实标来源，末尾标证据强度（高 / 中 / 低）。载体是单文件 SKILL.md，按 frontmatter 的 name + description 自动路由装载。</p>

  <h2>工具栈</h2>
  <p><span class="tool">纯 Markdown</span><span class="tool">无构建无依赖</span><span class="tool">DSH skill 机制</span><span class="tool">AnySearch</span><span class="tool">TiddlyWiki</span></p>

  <h2>实施步骤</h2>
  <ol>
    <li>查实前提：确认 DSH 除 AGENTS.md 外没有自动上下文检索</li>
    <li>勘测本机 knowledge 库实况：18 张表但 0 篇文档、插件未安装，据此排除依赖它的方案</li>
    <li>设计问题类型判别表，并写死例外（纯概念解释、纯代码任务、就聊聊）</li>
    <li>设计检索路由：本地文件 + TiddlyWiki 双路，外部走 AnySearch；本地优先于联网</li>
    <li>写回答格式与强制规则：来源标注、禁止臆造、不足就说不足、时效性标注</li>
    <li>写正对照纪律：任何「不存在 / 没有」的结论，必须先验证检索通道本身有效</li>
    <li>沉淀本机坑位清单：双实例崩溃、web seam 无兜底链、换模型代价、误切昂贵档位</li>
    <li>能力测试：新开会话不加提示跑三道真实工作题，验证纪律真实执行</li>
    <li>按 frontmatter 白名单校准 name 与 description——缺一即静默失效，装完实调验收</li>
    <li>脱敏后开源：去掉机器特定路径，扫凭据，MIT 许可</li>
  </ol>

  <h2>关键难点与解决</h2>
  <p>难点不在写字，在三处判断。一是「什么时候不该检索」——把规则写成「凡事必查」会导致大量无意义的调用，比不检索更糟，所以必须写死例外并给出判据。二是「查不到」这件事的可信度：检索通道故障与内容不存在在表面上完全一样，如果不强制做正对照，就会把「我没查到」写成「它不存在」，这类错误一旦进入对外材料就是硬伤。三是诚实披露——本机知识库是空的，如果按常规叙事写成「知识库 / RAG」就是吹牛，所以明确走文件 + TiddlyWiki + AnySearch 三路。</p>

  <h2>量化测算</h2>
  <table class="mt">
    <tr><td>规程规模</td><td>单文件 SKILL.md，正文 95 行，零构建零依赖</td></tr>
    <tr><td>检索三步闭环</td><td>问题类型判别 → 检索路由 → 回答格式（来源 + 置信度）</td></tr>
    <tr><td>外部检索通道</td><td>AnySearch，7 类垂直库</td></tr>
    <tr><td>正对照纪律</td><td>1 条：任何「不存在」结论强制先验证通道有效性</td></tr>
    <tr><td>能力测试</td><td>新会话不加提示跑 3 道真实工作题，纪律真实执行</td></tr>
  </table>

  <h2>可复用资产</h2>
  <div class="chips"><span class="chip">SKILL.md 规程全文</span><span class="chip">本机坑位清单</span><span class="chip">成本纪律三条</span><span class="chip">README（含诚实披露）</span><span class="chip">MIT 许可</span></div>

  <h2>证明链接</h2>
  <div class="links"><span class="link-item url">github.com/Jav1es/dsh-knowledge-guide</span></div>

  <h2>复盘</h2>
  <p>如果重做，我会把「本地知识路由表」从 SKILL.md 里抽成独立文件单独维护——现在它和规程写在一起，改了纪律、路由表却要跟着改，两边耦合容易各自漂移。另外这一条规程的价值恰恰在于它「没什么技术含量」：真正的难点一直是逼自己在每个会话里都老实执行，而这恰恰是最容易偷懒的地方——把它固化成 skill 至少让偷懒变成了显式的偏离，而不是无声的省略。</p>
</div>
"""


def main() -> None:
    html = HTML.read_text(encoding="utf-8")
    before = html

    # ---- 1. 模块数 14 → 17 ----
    html = html.replace("作品集模块（14 个）", "作品集模块（17 个）")
    html = html.replace("14 个可追溯证据模块", "17 个可追溯证据模块")
    html = html.replace("14项", "17项")
    html = html.replace("第五章 · 作品集模块（14 个）", "第五章 · 作品集模块（17 个）")

    # ---- 2. RAG 数字订正 ----
    html = html.replace("83.3% 检索准确率@3（真实评测） · 5/6 引用来源准确 · 40 条示例制度文档",
                        "93.3% 检索准确率@3（30 题分层评测） · 73.3%@1 · 40 条示例制度文档")
    html = html.replace("<b>83.3%</b> RAG 检索准确率", "<b>93.3%</b> RAG 检索准确率")
    html = html.replace("检索准确率@3（真实评测）", "检索准确率@3（30 题评测）")
    # 高亮卡：数字与标签是两个元素，需按组合替换
    html = html.replace(
        '<div class="num">83.3%</div><div class="lb">检索准确率@3（30 题评测）</div>',
        '<div class="num">93.3%</div><div class="lb">检索准确率@3（30 题评测）</div>')
    html = html.replace(
        '<div class="num">5/6</div><div class="lb">引用来源准确（真实）</div>',
        '<div class="num">28/30</div><div class="lb">引用来源准确（真实）</div>')
    html = html.replace("@3：83.3%（5/6，真实评测）", "@3：93.3%（28/30，30 题分层评测）")
    html = html.replace("83.3%（5/6，引用即 Top-K 命中片段）", "93.3%（28/30，引用精确到《第X条》）")
    html = html.replace("检索准确率 83.3%", "检索准确率 93.3%")
    html = html.replace("检索准确率 83.3%、拒答率 16.7%、引用来源准确率 83.3%",
                        "检索准确率 93.3%（28/30）、拒答率 6.7%、引用来源准确率 93.3%")
    html = html.replace("检索准确率 83.3% / 拒答率 16.7% / 引用准确率 83.3%",
                        "检索准确率 93.3% / 拒答率 6.7% / 引用准确率 93.3%")
    html = html.replace("top_k=3：检索准确率 83.3%、拒答率 16.7%、引用来源准确率 83.3%",
                        "top_k=3（30 题）：检索准确率 93.3%、拒答率 6.7%、引用来源准确率 93.3%")
    # 组合替换后可能残留的碎片：统一兜底
    html = html.replace("拒答率 16.7% / 引用准确率 83.3%", "拒答率 6.7% / 引用准确率 93.3%")
    html = html.replace("拒答率 16.7%、引用来源准确率 83.3%", "拒答率 6.7%、引用来源准确率 93.3%")
    html = html.replace(
        "下一步我会扩大评测样本量、把检索准确率从当前 83.3%（Top-3，检索降级模式）进一步用 Cross-Encoder 重排与查询改写拉高，并补上端到端多轮对话的自动化评测。",
        "后续我已把评测集从 6 题扩到 30 题分层（@3 准确率 93.3%），实跑 Cross-Encoder 重排对照后发现当前规模下增量为 0——因为混合检索已把答案放进 Top-3，而重排只能重排不能召回；据此改为可开关并写明启用条件，同时发现 RRF 分数不可用作拒答阈值（答得上与答不上的题分数完全重叠），改用强制带条款引用来防幻觉。")

    # ---- 3. 客户脱敏 ----
    html = html.replace("行业定制规划能力 · 白云科技样本", "行业定制规划能力 · 行业定制样本")
    html = html.replace("第六章 · 行业定制规划能力 · 白云科技样本", "第六章 · 行业定制规划能力 · 行业定制样本")
    html = html.replace("第六章 白云科技", "第六章 行业定制样本")
    html = html.replace("《白云科技信息化总体规划与数字化转型方案（含 AI 赋能）》",
                        "某高分子新材料上市企业 · 信息化总体规划与数字化转型方案（含 AI 赋能）")
    html = html.replace("《白云科技信息化总体规划与数字化转型方案》", "某高分子新材料企业信息化总体规划")
    html = html.replace("《白云科技信息化总体规划》", "某高分子新材料企业信息化总体规划")
    html = html.replace("白云科技信息化总体规划与数字化转型方案", "某高分子新材料企业信息化总体规划")
    html = html.replace("《白云科技规划》", "某高分子新材料企业规划")
    html = html.replace("白云科技规划方案", "某高分子新材料企业规划方案")
    html = html.replace("白云科技规划书", "某高分子新材料企业规划书")
    html = html.replace(
        "面向广州白云科技股份有限公司（建筑密封胶 / 高分子新材料研发制造领军企业、国标起草单位、国家知识产权示范企业）",
        "面向某高分子新材料上市企业（建筑密封胶行业，国标起草单位，客户名称已脱敏）")
    html = html.replace("白云科技样本", "行业定制样本")

    # ---- 4. 失效的站内副本链接 → GitHub ----
    html = html.replace("./04-enterprise-agent/enterprise-agents/examples/rag_demo/RAG_Eval_Report.md",
                        "github.com/Jav1es/enterprise-agents（examples/rag_demo）")

    # ---- 4b. 模块 04 补入本次新增的压测 / 部署 / 延迟证据 ----
    old_mt = "<h2>量化测算</h2>"
    if '阶梯压测' not in html:
        add = (
            "<h2>工程化与容量基线（本次新增）</h2>\n"
            "  <p>补齐了此前只有文档描述、没有可验证产物的部分。三项均为本机实测：</p>\n"
            "  <table class=\"mt\">\n"
            "    <tr><td>K8s 部署</td><td>完整 Helm Chart（values + 7 模板 + 双指标 HPA CPU 70%/内存 80% + /health 双探针 + 非 root 加固 + 密钥强制走 Secret，缺 Secret 直接拒绝渲染）；helm lint 通过 + 17 项自动校验全过</td></tr>\n"
            "    <tr><td>容量基线</td><td>Locust 阶梯压测 10/20/50/100 并发，合计 2535 次请求 0 失败；吞吐饱和拐点落在 50→100 并发之间（增幅由 +101.3% 骤降到 +39.8%），单实例舒适区约 50 并发 / 28 req/s</td></tr>\n"
            "    <tr><td>延迟分解</td><td>真实 LLM 调用 5 次采样，首 token 中位 789.6 ms、占总延迟 61.3%，据此判定瓶颈在模型侧而非编排代码；SSE 流式把响应头前置到 11 ms，让用户无需等待首 token</td></tr>\n"
            "  </table>\n  "
        )
        # 只插到模块 04 内的第一处「量化测算」之前
        idx = html.find('<div class="chapter" id="m04">')
        if idx != -1:
            j = html.find(old_mt, idx)
            if j != -1:
                html = html[:j] + add + html[j:]

    # ---- 5. 插入模块 15/16/17 ----
    if 'id="m15"' not in html:
        marker = '<!-- ================= 第六章 白云科技 ================= -->'
        if marker not in html:
            marker = '<!-- ================= 第六章 行业定制样本 ================= -->'
        if marker in html:
            html = html.replace(marker, NEW_CHAPTERS.strip() + "\n\n" + marker)
        else:
            print("FATAL: 未找到第六章注释锚点", file=sys.stderr)
            sys.exit(2)

    # ---- 5b. 目录补 m15/16/17 三条 ----
    m14_toc = '<a class="t" href="#m14">dsh-bridge：让 Marvis 调用本机 DSH（开源）</a>' \
              '<span class="dots"></span><span class="pg"></span></li>'
    if m14_toc in html and 'href="#m15"' not in html:
        extra = (
            m14_toc
            + '\n  <li class="l2"><a class="t" href="#m15">DeepSeek Harness 本机插件三件套（开源）</a><span class="dots"></span><span class="pg"></span></li>'
            + '\n  <li class="l2"><a class="t" href="#m16">DSH 运维工具箱：升级自检 / 插件兼容预检 / 生态全量调研（开源）</a><span class="dots"></span><span class="pg"></span></li>'
            + '\n  <li class="l2"><a class="t" href="#m17">知识指南：把「先检索再作答」写成可复用的规程（开源）</a><span class="dots"></span><span class="pg"></span></li>'
        )
        html = html.replace(m14_toc, extra, 1)

    HTML.write_text(html, encoding="utf-8")

    # ---- 6. build_book.py：修 BOOK_DIR 路径 + 补新章节 ----
    b = BUILD.read_text(encoding="utf-8")
    b = b.replace('BOOK_DIR = Path(r"D:\\Jav1e Flies\\portfolio-publish\\_book")',
                  f'BOOK_DIR = Path(r"{BOOK}")')
    b = b.replace('("ch5", "第五章 · 作品集模块（14 个）", "作品集模块"),',
                  '("ch5", "第五章 · 作品集模块（17 个）", "作品集模块"),')
    b = b.replace('    ("m14", "模块 14 · dsh-bridge（开源）", "模块 14"),',
                  '    ("m14", "模块 14 · dsh-bridge（开源）", "模块 14"),\n'
                  '    ("m15", "模块 15 · DSH 本机插件三件套（开源）", "模块 15"),\n'
                  '    ("m16", "模块 16 · DSH 运维工具箱（开源）", "模块 16"),\n'
                  '    ("m17", "模块 17 · 知识指南检索规程（开源）", "模块 17"),')
    b = b.replace('    "ch5": "第五章 · 作品集模块（14 个）",',
                  '    "ch5": "第五章 · 作品集模块（17 个）",')
    b = b.replace('    "m14": "dsh-bridge：让 Marvis 调用本机 DSH（开源）",',
                  '    "m14": "dsh-bridge：让 Marvis 调用本机 DSH（开源）",\n'
                  '    "m15": "DeepSeek Harness 本机插件三件套（开源）",\n'
                  '    "m16": "DSH 运维工具箱：升级自检 / 插件兼容预检 / 生态全量调研（开源）",\n'
                  '    "m17": "知识指南：把「先检索再作答」写成可复用的规程（开源）",')
    b = b.replace('    "ch6": "第六章 · 行业定制规划能力 · 白云科技样本",',
                  '    "ch6": "第六章 · 行业定制规划能力 · 行业定制样本",')
    # ⚠️ CHAPTERS 里的 ch6 同时提供「书签文本」与「页眉标签」，
    # TOC_TEXT 改了不等于页眉改了 —— 漏这里会让 PDF 每页页眉仍印旧名。
    b = b.replace('("ch6", "第六章 · 行业定制规划能力 · 白云科技样本", "白云科技样本"),',
                  '("ch6", "第六章 · 行业定制规划能力 · 行业定制样本", "行业定制样本"),')
    b = b.replace('"白云科技样本"),', '"行业定制样本"),')
    b = b.replace('    b = b.replace(\'        "ch6": "体系化思维 + 行业理解 + 信息化蓝图",\',\n'
                  '                  \'        "ch6": "体系化思维 + 行业理解 + 信息化蓝图",\')\n', '')
    b = b.replace('        "m14": "零依赖、可复现、CI 全绿",',
                  '        "m14": "零依赖、可复现、CI 全绿",\n'
                  '        "m15": "工具链缺什么就得等官方排期",\n'
                  '        "m16": "一次升级把已装插件静默打废",\n'
                  '        "m17": "最大的坑不是答不好，是凭记忆编",')
    b = b.replace('        "ch6": "体系化思维 + 行业理解 + 信息化蓝图",',
                  '        "ch6": "体系化思维 + 行业理解 + 信息化蓝图",')
    b = b.replace('        "ch6": "体系化思维 + 行业理解 + 信息化蓝图",\n'
                  '                  \'        "ch6": "体系化思维 + 行业理解 + 信息化蓝图",\')\n', '')
    BUILD.write_text(b, encoding="utf-8")

    changed = html != before
    print(f"HTML 已更新：{'是' if changed else '无变化'}（{len(before)} → {len(html)} 字符）")
    print(f"build_book.py 已更新（BOOK_DIR + 章节表 + 特征串）")

    # 复核
    t = html
    checks = [
        ("模块数 17", "（17 个）" in t),
        ("hero 17项", "17项" in t),
        ("无 83.3", "83.3" not in t),
        ("无 白云", "白云" not in t),
        ("有 m15", 'id="m15"' in t),
        ("有 m16", 'id="m16"' in t),
        ("有 m17", 'id="m17"' in t),
        ("有 93.3%", "93.3%" in t),
        ("TOC 有 m15", 'href="#m15"' in t),
        ("TOC 有 m16", 'href="#m16"' in t),
        ("TOC 有 m17", 'href="#m17"' in t),
        ("有压测数据", "2535" in t),
        ("有TTFT", "789.6" in t),
    ]
    print("\n复核：")
    ok = True
    for name, good in checks:
        print(f"  {'OK  ' if good else 'FAIL'}  {name}")
        ok = ok and good
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()