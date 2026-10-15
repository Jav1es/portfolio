// enrich-works.mjs —— 给 3 个新增模块补上展开详情所需的富字段
// 用法：node enrich-works.mjs（在 patch-works.mjs 之后运行，幂等）
import { readFileSync, writeFileSync } from 'node:fs';

const data = JSON.parse(readFileSync('works-data.json', 'utf8'));

// 每个模块的完整作品情况：role(我负责什么) / arch(架构) / pain(痛点)
// steps(实施步骤) / hard(难点取舍) / retro(复盘)
const ENRICH = {
  '11': {
    role: '两份模板的编写者：从客户现场访谈提纲、缺口清单、交付范围定义，到评测集设计、门禁阈值与监控指标，全部由我搭建并在真实客户项目上验证。',
    arch: 'Discovery Brief 按「业务现状 → 痛点归类 → 可验证范围 → 验收口径」四段式组织；Eval Plan 按「评测集分层 → 指标定义 → 门禁阈值 → 回归触发条件 → 监控看板」五段式组织。两份都以可勾选清单形式落地，客户与内部团队能对齐同一份口径。',
    pain: '过去每次进客户现场都重新凭经验判断，交付范围靠口头约定；上线后没有可验证的验收标准，出了问题说不清是谁的责任。',
    steps: [
      '梳理历年客户访谈记录，归纳出高频诊断问题与缺口类型',
      '按四段式结构固化 Discovery Brief，把口头经验变成可复用清单',
      '参照企业级评测实践设计 Eval Plan 的评测集分层与门禁机制',
      '在真实客户项目上试跑，根据反馈修订两轮',
      '沉淀为团队标准件，新项目开箱即用'
    ],
    hard: '难点在于「既要足够具体能直接填，又要足够通用能适配不同行业」。解法是把行业差异部分做成可替换的占位块，把共性诊断逻辑固化在骨架里。',
    retro: '模板最大的价值不是省时间，而是把「我以为客户需要」变成「客户确认过需要」。后续可以补一版按行业预设的字段库。'
  },
  '20': {
    role: '独立设计与实现：从政策口径解读、规则引擎抽象，到六步交互流程、雷达图可视化与 Service Worker 离线缓存，全部由我一人完成。',
    arch: '规则与界面彻底分离：rules/policy.json 承载全部评分政策（10.7KB），rule-engine.js（28.9KB）只做纯函数式计算不碰 DOM，app.js（31.9KB）管六步流程与渲染。改政策只需改 JSON，不动代码。',
    pain: '高企认定的评分细则散落在政策文件里，人工对照算分容易漏项、算错；市面上工具要么收费要么要上传企业敏感数据。',
    steps: [
      '逐条解读高企认定评分标准，把四大指标与一票否决项抽象成 JSON 规则',
      '实现纯函数规则引擎：任何输入变化即时重算，无副作用',
      '搭六步向导流程，右侧面板实时显示分数与雷达图',
      '加 8 条一票否决预检，不满足直接提示不予认定',
      '用 Service Worker 做离线缓存，装成桌面图标可当原生应用用'
    ],
    hard: '难点是「保守总分」口径：判定是否达标必须取各评分项政策区间的下界之和，不能取中值或上值。规则引擎里对每个档位都显式存了下界，避免用户误判。',
    retro: '这个项目验证了「规则外置」的思路——政策变了我只需要更新 JSON。下一步可以支持自定义规则包，让同一套引擎适配其他评级体系。'
  },
  '21': {
    role: '设计并实现整套 MCP 桥接协议：工具定义、参数 schema、调用转发与结果回传，以及与 dsh-bridge 对齐的接入方式。',
    arch: '沿用 dsh-bridge 的双接入设计：Skill（声明式能力描述）+ MCP Server（标准化工具协议）。上级 Agent 通过 MCP 发现工具并自主决定何时下放任务，桥接层负责进程管理、超时与结果序列化。',
    pain: '桌面 AI 助手之间是孤岛——Marvis 想用本机 WorkBuddy 的能力时，只能靠人工复制粘贴中转。',
    steps: [
      '分析 dsh-bridge 已验证的桥接模型，确认可复用的部分',
      '定义 MCP 工具 schema：任务下发、状态查询、结果回传',
      '实现进程生命周期管理与超时保护',
      '与 Marvis 侧 Skill 定义对接，验证端到端调用',
      '补齐 README 与使用说明'
    ],
    hard: '与 dsh-bridge 共享同一套设计但目标宿主不同，难点在于保持协议一致的同时不引入硬编码依赖，让两个桥可以独立部署。',
    retro: '两座桥（dsh-bridge / workbuddy-bridge）验证了「上级 Agent 自主决定何时下放」这套模式是通的。后续可以考虑把桥接层抽象成通用框架。'
  }
};

let filled = 0;
for (const it of data.items) {
  const e = ENRICH[it.no];
  if (!e) continue;
  // 幂等：已有内容的字段不覆盖（允许后续人工修订保留）
  if (it.role && it.arch && it.steps && it.steps.length) { continue; }
  Object.assign(it, e);
  filled++;
}

writeFileSync('works-data.json', JSON.stringify(data, null, 2), 'utf8');
writeFileSync('works-data.js',
  '// 由 extract-works.mjs + patch-works.mjs + enrich-works.mjs 生成，请勿手改。\n' +
  'window.__WORKS_DATA__ = ' + JSON.stringify(data) + ';\n', 'utf8');

console.log('补富字段模块数：%d', filled);
for (const f of ['role', 'arch', 'pain', 'steps', 'hard', 'retro']) {
  const n = data.items.filter(i => i[f] && (!Array.isArray(i[f]) || i[f].length)).length;
  console.log('  %s: %d / %d', f, n, data.items.length);
}
