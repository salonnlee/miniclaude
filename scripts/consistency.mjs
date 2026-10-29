#!/usr/bin/env node
/* ============================================================================
   consistency.mjs —— 全库一致性校验(npm run check,pre-commit 自动跑)
   ----------------------------------------------------------------------------
   防的是同一类事故反复发生:版本号、课程进度、口径说辞在多处手写,改了
   一处漏一处。校验思路全部来自 2026-10-27 的全库排查:

     · 版本号单一事实源 = site/content/lessons.js 的 ships——COURSE.html
       里不允许再出现任何手写版本号(章 chip / 里程碑表由渲染器点亮);
     · 课次列表容器必须为空(手写课次行 = 绕开唯一事实源);
     · README「N 家实验室」必须等于 main.js 实际 import 数;
     · chat.ts 行数声明(README / COURSE.html / lessons.js / lab-chat.js)
       必须等于 wc -l src/chat.ts;
     · LEARNER 课程骨架「截至」日期不得早于全表最新完课日;
     · 「下一站」指针在 lessons.js / README / LEARNER 三处必须同指一章;
     · package.json: description 不带版本号(永不过期),version 与 ships
       最新交付对齐;
     · 口径黑名单:「解剖」「壳」——豁免 COURSE-LOG.js(历史记录)与
       AGENTS.md(定规原文),其余入库文本出现即拦。
   ============================================================================ */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const exists = (p) => existsSync(join(ROOT, p));
const fails = [];
const oks = [];
const check = (name, pass, why) => (pass ? oks : fails).push(pass ? name : `${name} —— ${why}`);

// —— 事实源:lessons.js(纯数据 ESM,可安全 import)——
const { LESSONS } = await import('../site/content/lessons.js');
const html = read('site/COURSE.html');
const readme = read('README.md');
const learner = read('LEARNER.md');

// 1. COURSE.html 不允许手写版本号:交付 chip / 里程碑行 / 章头标题 / 静态「更新于」日期
check(
  'COURSE.html 无手写版本号(chip/里程碑由 ships 渲染,更新日期由渲染器推导)',
  !/(交付\s*v\d|class="ver">v\d|更新于 20)/.test(html),
  (html.match(/(交付\s*v\d|class="ver">v\d|更新于 20)[^\n<]{0,20}/) || ['版本号/日期'])[0] + ' —— 版本号与更新日期只能来自 lessons.js'
);
check(
  'COURSE.html 章头标题不带版本号前缀',
  ![...html.matchAll(/<span class="ch-title">([^<]*)<\/span>/g)].some((m) => /^v\d/.test(m[1].trim())),
  'ch-title 以 v 开头:版本号属 lessons.js ships'
);

// 2. 课次列表容器必须为空(渲染器填,手写 = 绕开事实源)
const nonEmptyLists = [...html.matchAll(/<ul[^>]*data-lessons="[^"]*"[^>]*>([\s\S]*?)<\/ul>/g)]
  .filter((m) => m[1].trim() !== '');
check('COURSE.html 课次容器全部为空', nonEmptyLists.length === 0,
  `${nonEmptyLists.length} 个 ul[data-lessons] 里有手写内容`);

// 3. ships 的 at 必须有对应占位(chip 无处挂 = 静默丢失)
const ships = LESSONS.ships || [];
const placeholders = [...html.matchAll(/data-ship="([^"]+)"/g)].map((m) => m[1]);
const missingAt = ships.filter((s) => s.at && !placeholders.includes(s.at));
check('ships.at 与 data-ship 占位一一对应', missingAt.length === 0,
  `ships 挂 ${missingAt.map((s) => s.at).join('/')} 但 COURSE.html 无对应 data-ship 占位`);

// 4. 实验室家数:main.js import 数 = README 所有「N 家实验室」
const mainjs = read('site/main.js');
const labCount = (mainjs.match(/import '\.\/labs\/lab-[^']*\.js'/g) || []).length;
const labFiles = readdirSync(join(ROOT, 'site/labs')).filter((f) => /^lab-.*\.js$/.test(f)).length;
const readmeCounts = [...readme.matchAll(/([一二三四五六七八九十\d]+)\s*家实验室/g)].map((m) => m[1]);
const zhNum = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const parseNum = (s) => (/^\d+$/.test(s) ? +s : zhNum[s] ?? 0);
check('README 实验室家数 = main.js import 数 = labs/ 文件数',
  readmeCounts.length > 0 && readmeCounts.every((c) => parseNum(c) === labCount) && labCount === labFiles,
  `README 说 ${readmeCounts.join('/')} 家,main.js import ${labCount} 家,labs/ 有 ${labFiles} 个 lab-*.js`);

// 5. chat.ts 行数声明 = 实际行数(与 wc -l 口径一致:末尾换行不另计一行)
const rawLines = read('src/chat.ts').split('\n');
const chatLines = rawLines[rawLines.length - 1] === '' ? rawLines.length - 1 : rawLines.length;
const lineClaims = [
  ['README.md', readme], ['site/COURSE.html', html],
  ['site/content/lessons.js', read('site/content/lessons.js')],
  ['site/labs/lab-chat.js', read('site/labs/lab-chat.js')],
].flatMap(([f, t]) => [...t.matchAll(/(\d+)\s*行/g)]
  .filter((m) => /chat\.ts|代码可点|逐字一致|真代码/.test(t.slice(Math.max(0, m.index - 60), m.index + 20)))
  .map((m) => [f, +m[1]]));
check('chat.ts 行数声明与实际一致(现为 ' + chatLines + ' 行)',
  lineClaims.length > 0 && lineClaims.every(([, n]) => n === chatLines),
  lineClaims.filter(([, n]) => n !== chatLines).map(([f, n]) => `${f} 写 ${n} 行`).join('; '));

// 6. LEARNER 骨架「截至」日期 ≥ 全表最新完课日
const allDone = Object.values(LESSONS.lists).flatMap((l) => l.groups.flat())
  .filter((it) => it.done).map((it) => it.done.slice(0, 10)).sort();
const lastDone = allDone[allDone.length - 1];
const asOf = (learner.match(/课程骨架\(截至\s*(\d{4}-\d{2}-\d{2})\)/) || [])[1];
check(`LEARNER 骨架截至日期 ≥ 最新完课日(${lastDone})`,
  !!asOf && asOf >= lastDone,
  asOf ? `LEARNER 停在 ${asOf},已有 ${lastDone} 的完课` : 'LEARNER「课程骨架(截至 …)」日期缺失');

// 7. 「下一站」三处同指:lessons.js mark 的章号 = README/LEARNER 提及
const nextCodes = Object.values(LESSONS.lists).flatMap((l) => l.groups.flat())
  .filter((it) => it.mark && it.mark.includes('下一站') && it.code).map((it) => it.code);
const nextCh = nextCodes.map((c) => c.match(/^(CH\d+)/)?.[1]).filter(Boolean);
const badNext = [];
[[readme, 'README.md'], [learner, 'LEARNER.md'], [read('site/content/cards.js'), 'cards.js']].forEach(([t, f]) => {
  [...t.matchAll(/下一站/g)].forEach((m) => {
    const near = t.slice(Math.max(0, m.index - 20), m.index + 30);
    const chs = [...near.matchAll(/CH\d+/g)].map((x) => x[0]);
    if (chs.length && !chs.some((c) => nextCh.includes(c))) badNext.push(`${f}:「下一站」附近指向 ${chs.join('/')},事实源是 ${nextCh.join('/') || '(无)'}`);
  });
});
check('「下一站」指针与 lessons.js 一致' + (nextCh.length ? `(${nextCh.join('/')})` : ''),
  badNext.length === 0, badNext.join('; '));

// 8. package.json:description 无版本号;version 对齐 ships 最新交付(不管挂不挂章)
const pkg = JSON.parse(read('package.json'));
const latestVer = [...ships].reverse().find((s) => s.ver)?.ver;
check('package.json description 不含版本号', !/v\d+\.\d/.test(pkg.description), 'description 里的版本号会过期,写能力不写版本');
check('package.json version 对齐 ships 最新交付' + (latestVer ? `(${latestVer})` : ''),
  latestVer ? pkg.version.startsWith(latestVer.slice(1) + '.') : true,
  `version ${pkg.version} ≠ ships 最新 ${latestVer}`);

// 9. 配套资产:main.js 挂载的产品对话框若带样式文件,必须真的被页面引用(v0.5 曾漏挂 mc.css)
if (exists('site/mc/mc.js') && exists('site/mc/mc.css')) {
  check('mc/mc.css 已被 COURSE.html 引用', html.includes('mc/mc.css'),
    'mc.css 存在但页面没有 <link> 引它——气泡会漂在文档流里');
}

// 10. 口径黑名单:「解剖」「壳」(豁免:COURSE-LOG.js 历史记录、AGENTS.md 定规原文、本脚本——检测规则自身须引用这些词)
const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT }).toString().trim().split('\n')
  .filter((f) => /\.(md|js|mjs|html|css|ts)$/.test(f) && !/^(site\/COURSE-LOG\.js|AGENTS\.md|scripts\/consistency\.mjs)$/.test(f));
const banned = [];
tracked.forEach((f) => {
  if (!exists(f)) return; // 索引里的文件已被删但未 stage 时,跳过而不是炸(pre-commit 在 stage 后跑,此处兜底)
  const t = read(f);
  /解剖/.test(t) && banned.push(`${f}:「解剖」(全站口径用「透视」)`);
  // 「壳」只拦代称用法(带引号/agent 前缀);「卡壳」「神经元之壳」等正常词语放行
  /(「壳」|『壳』|“壳”|agent\s*壳)/.test(t) && banned.push(`${f}:「壳」代称(已弃用,直说 agent 程序)`);
});
check('口径黑名单(解剖/壳)零残留', banned.length === 0, banned.join('; '));

// 12. 工具柜单一事实源(v0.9 后定规,CH5/CH6/附加章/CH9.3 四次放宽平台专属例外):
//     平台无关的实现只许住 site/mc/tools.js 一处——改一处,CLI 与网页分身同时生效;
//     src/tools/ 允许 index.ts(出口)+ fs.ts/bash.ts/permissions.ts/agents.ts/mcp.ts(Node 专属,push 进 TOOLS 注册)
{
  const allow = ['src/tools/index.ts', 'src/tools/fs.ts', 'src/tools/bash.ts', 'src/tools/permissions.ts', 'src/tools/agents.ts', 'src/tools/mcp.ts'];
  const srcTools = execFileSync('git', ['ls-files', 'src/tools'], { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);
  const badSrc = srcTools.filter((f) => !allow.includes(f));
  const reexportOk = srcTools.includes('src/tools/index.ts') && read('src/tools/index.ts').includes('site/mc/tools.js');
  const fsOk = !srcTools.includes('src/tools/fs.ts')
    || (read('src/tools/fs.ts').includes("from '../../site/mc/tools.js'") && read('src/tools/index.ts').includes('registerFsTools'));
  const bashOk = !srcTools.includes('src/tools/bash.ts')
    || (read('src/tools/bash.ts').includes("from './permissions.ts'") && read('src/tools/index.ts').includes('registerBashTools'));
  const agentsOk = !srcTools.includes('src/tools/agents.ts')
    || (read('src/tools/agents.ts').includes("from '../../site/mc/tools.js'") && read('src/tools/index.ts').includes('registerAgentTools'));
  const mcpOk = !srcTools.includes('src/tools/mcp.ts')
    || (read('src/tools/mcp.ts').includes("from '../../site/mc/tools.js'") && read('src/tools/index.ts').includes('registerMcpTools'));
  check('工具柜单一事实源(共享实现在 site/mc/tools.js;src/tools 只许出口+fs/bash/permissions/agents/mcp 例外)',
    badSrc.length === 0 && reexportOk && fsOk && bashOk && agentsOk && mcpOk && read('site/mc/mc.js').includes("from './tools.js'"),
    [badSrc.length ? `src/tools/ 里混入实现文件:${badSrc.join(', ')}(挪去 site/mc/tools.js;平台专属住 fs.ts/bash.ts/agents.ts/mcp.ts)` : '',
     reexportOk ? '' : 'src/tools/index.ts 必须 re-export site/mc/tools.js',
     fsOk ? '' : 'fs.ts 必须 import 底座 TOOLS 并由 index.ts 调 registerFsTools() 注册',
     bashOk ? '' : 'bash.ts 必须 import permissions.ts 并由 index.ts 调 registerBashTools() 注册',
     agentsOk ? '' : 'agents.ts 必须 import 底座 TOOLS 并由 index.ts 调 registerAgentTools() 注册',
     mcpOk ? '' : 'mcp.ts 必须 import 底座 TOOLS 并由 index.ts 出口 registerMcpTools'].filter(Boolean).join('; '));
}

// 14. 课次行 done 备注瘦身(2026-10-29 定规,commit 34a0486):日期＋一句短语,
//     细节只归 COURSE-LOG 一处——超长即拦,防「修过的问题再犯」
{
  const LIMIT = 80; // 字符(含日期),短语体例见 CH9.1/CH9.2
  const fat = Object.values(LESSONS.lists).flatMap((l) => l.groups.flat())
    .filter((it) => it.done && it.done.length > LIMIT)
    .map((it) => `${it.code || it.label}:done ${it.done.length} 字`);
  check(`课次行 done 备注均 ≤ ${LIMIT} 字(细节归 COURSE-LOG)`, fat.length === 0,
    fat.join('; ') + ' —— 压成一句短语,复盘细节写进 COURSE-LOG.js 当天条目');
}

// 15. 幕统计完整性(2026-10-29 定规,act-m5 误报完课事故):幕徽章只数带 code 的
//     课次行(label 行被 itemsOf 滤掉)——act 引用的章若零课次行,整章从幕统计里
//     静默消失,幕可能提前亮「完课」。防再犯:act 引用的每章至少一条课次行
{
  const chKeys = new Set(Object.values(LESSONS.acts || {}).flatMap((a) => [].concat(a.from)));
  const empty = [...chKeys].filter((k) => {
    const items = (LESSONS.lists[k]?.groups || []).flat().filter((it) => !it.label);
    return items.length === 0;
  });
  check('act 引用的每章至少一条课次行(零课次行 = 整章从幕统计静默消失)',
    empty.length === 0,
    empty.map((k) => `lists.${k} 没有带 code 的课次行——幕徽章数不到它`).join('; '));
}

// —— 汇总 ——
oks.forEach((n) => console.log('  ✓ ' + n));
if (fails.length) {
  console.error('');
  fails.forEach((n) => console.error('  ✗ ' + n));
  console.error('\n一致性校验未通过:' + fails.length + ' 项。版本/进度只改 site/content/lessons.js,文档按交付同步清单走。');
  process.exit(1);
}
console.log('\n一致性校验全绿:' + oks.length + ' 项');
