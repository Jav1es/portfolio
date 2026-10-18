/**
 * 向 works-data.json 追加第 22 个作品
 *
 * 单独写成脚本而不是手改 JSON：JSON 手改容易漏逗号/括号，
 * 而且脚本可以幂等（已存在则跳过）。
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'D:/Jav1e Flies/00-工作区/portfolio-publish/works-data.json';

const item = {
  no: "22",
  t: "原型工厂：把「一句话需求」变成可自检的静态原型（开源方法论 + 断言引擎）",
  cat: "oss",
  star: true,
  status: "个人开源",
  jd: "AI 智能体开发工程师",
  pitch: "做原型最大的浪费不是写得慢，是「看着挺好」就交付。我把验收从肉眼搬进机器：一个零依赖断言引擎 + 一套写断言的纪律，任何原型交付前必须 68 项断言全 PASS——而断言本身还要先被反向对照验证过。",
  highlights: [
    { num: "68", label: "自动化断言 · 3 个原型实测" },
    { num: "4", label: "devflow 安装坑（3 个静默失败）" },
    { num: "1 条", label: "命令完成构建与自检" }
  ],
  tags: [
    "Playwright-core（复用本机 Edge，不下载浏览器）",
    "Node.js ESM",
    "devflow 卡片状态机",
    "断言反向对照",
    "单文件 HTML 原型"
  ],
  links: [
    "方法论与引擎源码|https://github.com/Jav1es/portfolio/tree/main/22-prototype-factory",
    "在线作品集|https://jav1es.github.io/portfolio/"
  ],
  shot: "",
  metric: "3 个原型（导航页 / 番茄钟 / 阅读清单）合计 68 项断言全 PASS，覆盖 6 个视口；断言引擎经反向对照验证（注入缺陷必须 FAIL）",
  role: "我设计并实现了整套流程：断言引擎（verify.mjs，通用层）+ 卡片断言配置（cards/*.mjs，专属层）的分层结构、脚手架脚本（new-card.mjs，生成的骨架开箱即合规）、以及写断言的纪律文档。同时把 devflow 插件安装过程中踩到的 4 个坑（其中 3 个静默失败）整理成可复现的排查手册。",
  arch: "三层结构：① 引擎层 verify.mjs 只负责「怎么测」（单文件、内联、无报错、375px 双阶段响应式、按钮可点击）；② 配置层 cards/NN-slug.mjs 只负责「测什么」（该卡片的交互断言）；③ 脚手架层 new-card.mjs 按 NN-slug 约定生成合规骨架。目录名即契约——引擎按 NN-slug/ 自动发现卡片并加载同名断言文件，新增原型不需要改引擎。",
  pain: "原型验收靠肉眼有三个必然结果：375px 横向滚动上线才发现、「看着有提示音」实际不响、以及断言脚本因为写得太松而永远 PASS（等于没测）。",
  steps: [
    "先写 3 个真实原型（导航页 / 番茄钟 / 阅读清单）作为被测对象，同时手写第一版断言脚本",
    "发现第一版断言的致命问题：番茄钟的「完成时播放提示音」只验证了 AudioContext 可创建——这什么都没证明；改为把 WORK_SECONDS 改成 2 秒做临时副本，跑完整条路径并统计振荡器调用次数",
    "重构为引擎 + 配置分层：把通用断言抽进 verify.mjs，卡片专属断言拆成 cards/*.mjs，使新增原型无需改引擎",
    "写脚手架 new-card.mjs，生成开箱即合规的骨架，并实测「生成后直接 verify 应该 PASS」",
    "反向对照：给脚手架注入 min-width:900px + console.error，发现「375px 无横向滚动」仍然 PASS",
    "定位到两个叠加原因：overflow-x:hidden 让 scrollWidth 恒等于 clientWidth（内容被裁掉但量不出来）；且检查跑在空列表状态（列表项根本不存在，注入样式无从显现）",
    "修复：增加「解除裁剪后重量」检测（内容未被裁剪成为独立断言），响应式检查改为两阶段（初始 + 内容填充后）",
    "回归：68 项断言全 PASS，并确认修复后的检测能准确报出 li.item(right=914)",
    "把 devflow 插件安装的 4 个坑整理成排查手册（profile 选错、版本不兼容、豁免要给 19 个包、pnpm 非零退出中断 reconcile）"
  ],
  hard: "最难的是一开始根本不知道自己测错了。番茄钟的提示音断言在「AudioContext 可创建」这一层写得很像样，跑了也是绿的——直到我用 CDP 虚拟时间试图加速倒计时失败，才被迫换成改常量做临时副本的办法，才发现之前那条断言是空的。第二个更难发现：反向对照时注入的溢出样式没有生效，我第一反应是「检测逻辑写错了」，实际是页面处于空列表状态、根本没有 .item 元素。这两个坑的共同点是「测试通过」本身就是个假象，而只有主动去证伪（注入缺陷、逼它走完整路径）才能暴露。另外 devflow 那 4 个坑里有 3 个是静默失败——尤其「只豁免 bundle 外壳、17 个子包全被拒」这件事，启动日志一个字都不报，如果不去翻 .plugin-manager/logs 和 compatibility.json，会一直以为装好了。",
  retro: "如果重做，我会把「反向对照」提前到写断言之前而不是之后——先写好注入缺陷的脚本，再写断言，这样每写完一条就能立刻验证它是不是空转。这次是写完 49 项断言才做第一次对照，等于前面积累的置信度全部要重算。另一个反思是 devflow 的 gate 应该早点配起来：现在「自检通过」是我在 reason 里的一句自我声明，而不是机械门禁——把 node verify.mjs 配进 developing→reviewing 这条边，才能让「全 PASS」从人说的话变成系统拦得住的东西。",
  group: "oss",
  motif: "pipeline"
};

const raw = readFileSync(FILE, 'utf8');
const data = JSON.parse(raw);

if (data.items.some(x => x.no === item.no)) {
  console.log('编号 22 已存在，跳过');
  process.exit(0);
}

// 编号连续性：新编号必须是当前最大 +1
const maxNo = Math.max(...data.items.map(x => parseInt(x.no, 10)));
if (parseInt(item.no, 10) !== maxNo + 1) {
  console.error(`编号不连续：当前最大 ${maxNo}，待插入 ${item.no}`);
  process.exit(1);
}

data.items.push(item);

// 保持两空格缩进（与现文件一致）
writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`已追加作品 ${item.no}：${item.t}`);
console.log(`作品总数：${data.items.length}`);
