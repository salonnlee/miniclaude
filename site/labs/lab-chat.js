/* labs/lab-chat.js —— CH2 实验室：chat.ts 透视台
   ----------------------------------------------------------------------------
   A 台：src/chat.ts 全文八段，点击段落 → 透视卡交代它干什么、数据什么形状
        (透视卡机制同 CH1 素颜相见台，升格为整份代码可透视——代码分析标配)。
   B 台：SSE 缓冲实验——同一段流两种到达方式(整包 vs 劈成碎片),
        逐字进缓冲区、见换行切事件，亲眼看半截 JSON 为什么不能解析。
   C 台：真机连线——POST /api/chat(scripts/serve.mjs 流式代理，key 只住服务端),
        前端解析与 src/chat.ts 逐行同款；右侧直播原始 SSE，思考草稿在流里可见。 */
import { $id } from './shared.js';

/* ================= A · 代码透视(段落与透视卡) ================= */

/* 卡列跟随：幕折叠的 ::details-content 会劫持 sticky/fixed 的包含块(实测 fixed 钉到伪元素顶),
   只剩绝对定位可靠——position:absolute 挂在网格上，滚动时重算 top */
var pinSync = function () {};
(function pin() {
  var grid = document.querySelector('#chat-lab .cx-grid');
  var card = grid.querySelector('.lab-box:last-child');
  var code = grid.querySelector('.lab-box:first-child');
  function sync() {
    var wide = matchMedia('(min-width:900px)').matches;
    var vh = innerHeight;
    var gr = grid.getBoundingClientRect();
    var cardH = card.offsetHeight;
    /* 只有「网格比视口高、代码列比卡高」时才钉；其余时候各回各位 */
    var need = wide && gr.height > vh && code.offsetHeight > cardH;
    if (!need || gr.top > 12 || gr.bottom < 0) {
      card.classList.remove('cx-stick');
      card.style.width = card.style.left = card.style.top = '';
      return;
    }
    var gridTop = gr.top + scrollY; /* 网格顶的文档坐标 */
    var top = scrollY - gridTop + 12; /* 钉在视口顶 12px 处(网格坐标系) */
    top = Math.min(top, grid.offsetHeight - cardH - 12); /* 网格快滚完时跟着往上滑 */
    card.classList.add('cx-stick');
    card.style.width = code.offsetWidth + 'px';
    card.style.left = (code.getBoundingClientRect().right + 16 - gr.left) + 'px';
    card.style.top = Math.max(0, top) + 'px';
  }
  pinSync = sync;
  addEventListener('scroll', sync, { passive: true });
  addEventListener('resize', sync);
})();

/* 八段代码与 src/chat.ts 逐字一致(v1.9 企业化收尾,398 行) */
var SEGS = [
  {
    id: 'gear',
    tag: '① 装备区',
    code: "// v1.9 · 企业化收尾 —— 配置(config.ts)、降级链、hooks、成本遥测、工具轨迹\n" +
      "// (v1.8:斜杠命令表 + mini MCP;/ 开头先查表,命中展开执行、未命中原样放行)\n" +
      "// 跑法:npm run chat(node 26 原生跑 TS,key 住 .env 不进代码)\n" +
      "import * as readline from 'node:readline/promises';\n" +
      "import * as fs from 'node:fs';\n" +
      "import { TOOLS, runTool, setConfirm, setAskOnce, setToolInterceptor, getTodos, registerMcpTools, getMcpStatus } from './tools/index.ts';\n" +
      "import { buildSystemPrompt, shouldCompact, compactHistory, COMPACT_AT, type Msg, type ToolCall, type ApiToolCall } from './context.ts';\n" +
      "import { config } from './config.ts';\n" +
      "import { runHooks } from './hooks.ts';\n" +
      "import * as ui from './ui.ts';\n" +
      "\n" +
      "// .env 自己吃(v1.9):发布成 npm 包后没有 scripts 帮你挂 --env-file 旗子,钥匙的\n" +
      "// 加载搬进自己代码。环境变量优先——CI/容器里注入的 key 不被文件盖掉\n" +
      "(function loadDotEnv() {\n" +
      "  if (process.env.GLM_API_KEY) return;\n" +
      "  try {\n" +
      "    const kv = fs.readFileSync('.env', 'utf8').match(/^GLM_API_KEY=(.*)$/m);\n" +
      "    if (kv) process.env.GLM_API_KEY = kv[1].trim();\n" +
      "  } catch { /* 没有 .env:靠环境变量,再没有下面会喊 */ }\n" +
      "})();\n" +
      "\n" +
      "const KEY = process.env.GLM_API_KEY;\n" +
      "if (!KEY) {\n" +
      "  console.error('没读到 GLM_API_KEY —— 检查 .env');\n" +
      "  process.exit(1);\n" +
      "}\n" +
      "\n" +
      "const API = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';\n" +
      "const PRICE = { in: 4, out: 14 }; // 元 / 百万 token\n" +
      "const usage = { in: 0, out: 0, cached: 0, lastPrompt: 0, models: {} as Record<string, number> }; // models:每个模型问了几轮——遥测知道钱花在谁身上\n" +
      "\n",
    card: ['装备区:开战前的六样东西',
      '工具从哪来?从 <b>注册表</b>——tools/index.ts 统一出口:tools/ 目录一件一个文件,统一的 <b>Tool</b> 形状(名字/说明书/参数表/execute)住在 types.ts,加工具 = 加文件 + 注册表添一行,主循环一行不用改(Claude Code 上百个工具背后就是这么一张表)。<b>KEY</b>——从环境变量来(.env),不写死在代码里;<b>API</b> 换厂商就是换域名;<b>PRICE</b> 价目表(输入 4 元、输出 14 元,每百万 token);<b>usage</b> 从 0 记账——v1.2 多了两栏:<b>cached</b>(缓存命中的 token,约五折计)和 <b>lastPrompt</b>(当前上下文水位,压缩器看它)。v1.3 挂钩子 <b>setAskOnce</b>:子代理「问一轮模型」的腿(附加章讲)。v1.4 装备区多一件:<b>ui.ts</b>——脸面独立成文件,状态行/流式重排/工具卡/Esc 全住那边,chat.ts 换脸不动心。v1.9 再添一件:<b>config.ts</b>——模型/降级链/名单/钩子搬进配置文件(用户级 ~/.miniclaude.json,项目级 .miniclaude.json,标量后者赢、数组只加码),换模型不改代码;usage 多一栏 <b>models</b>:每个模型问了几轮——遥测知道钱花在谁身上。']
  },
  {
    id: 'types',
    tag: '② 记忆与形状',
    code: "// 消息数组就是记忆:system/user/assistant/tool 四种角色,tool 消息必须绑 tool_call_id\n" +
      "// v1.2 形状与拼装搬进 context.ts:system prompt 不再是裸一句人设,而是人设+环境快照+CLAUDE.md\n" +
      "const messages: Msg[] = [{ role: 'system', content: buildSystemPrompt() }];\n" +
      "\n",
    card: ['记忆:形状搬走,拼装升级',
      '四种角色(system/user/assistant/tool)的形状定义 v1.2 搬进了 <b>context.ts</b>——上下文的账本和记账的笔住一处。messages 初始化那一行也换了血:不再是裸一句人设,而是 <b>buildSystemPrompt()</b> 拼出来的三段——人设 + 环境快照(工作目录/会话始于) + CLAUDE.md 项目记忆。关键在「快照」二字:环境信息取启动那一刻定格,整会话一字不改——前缀缓存从第一个字开始匹配,system prompt 改一个字、缓存全部作废。']
  },
  {
    id: 'req',
    tag: '③ ask·发请求',
    code: "// 发全部历史,流式收回「这一轮发生了什么」(说话了还是要工具了),顺手记账。\n" +
      "// v1.9 外面套一层降级链:主模型挂了(429/5xx/模型不存在)按 config.fallback\n" +
      "// 换人再问,链走完才认输——真产品在这之外还有指数退避重试,教学版取「换人」。\n" +
      "// v1.3 泛化两参:hist 默认主对话的 messages,allow 收窄工具柜——\n" +
      "// 子代理借同一扇门问模型,只是拎自己的历史、逛缩水的柜台\n" +
      "// v1.4 再加 opts:signal 把 Esc 的 AbortController 递进 fetch(飞行中的请求\n" +
      "// 从这被掐断);onText 把打字机交给调用方——主对话传流式上屏,子代理不传\n" +
      "type AskOpts = { signal?: AbortSignal; onText?: (s: string) => void };\n" +
      "async function ask(hist: Msg[] = messages, allow?: string[], opts: AskOpts = {}): Promise<{ text: string; toolCalls: ToolCall[] }> {\n" +
      "  const chain = [config.model, ...config.fallback];\n" +
      "  for (let i = 0; ; i++) {\n" +
      "    try {\n" +
      "      return await askOnce(chain[i], hist, allow, opts);\n" +
      "    } catch (e) {\n" +
      "      const next = chain[i + 1];\n" +
      "      // 三种情况不降级直接抛:用户主动掐的(Esc);字已经吐给脸面了(重试会把\n" +
      "      // 半句再说一遍,宁可报错);链走完了\n" +
      "      if (opts.signal?.aborted || (e as { spoke?: boolean }).spoke || !next) throw e;\n" +
      "      const brief = e instanceof Error ? e.message.split('\\n')[0].slice(0, 80) : String(e);\n" +
      "      ui.say(ui.c.yellow(`  ⚠️ ${chain[i]} 出错(${brief}),降级换 ${next} 重试`));\n" +
      "    }\n" +
      "  }\n" +
      "}\n" +
      "\n" +
      "async function askOnce(model: string, hist: Msg[], allow: string[] | undefined, opts: AskOpts): Promise<{ text: string; toolCalls: ToolCall[] }> {\n" +
      "  let spoke = false; // 有没有向脸面吐过字——降级链看它定夺(吐过就不换人重试)\n" +
      "  const onText = opts.onText ? (s: string) => { spoke = true; opts.onText?.(s); } : undefined;\n" +
      "  try {\n" +
      "    const res = await fetch(API, {\n" +
      "      method: 'POST',\n" +
      "      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },\n" +
      "      body: JSON.stringify({\n" +
      "        model, messages: hist,\n" +
      "        max_tokens: 4096,\n" +
      "        stream: true,\n" +
      "        tools: (allow ? TOOLS.filter(t => allow.includes(t.name)) : TOOLS).map(t => ({\n" +
      "          type: 'function' as const,\n" +
      "          function: { name: t.name, description: t.description, parameters: t.parameters },\n" +
      "        })),\n" +
      "      }),\n" +
      "      signal: opts.signal,\n" +
      "    });\n" +
      "    if (!res.ok || !res.body) throw new Error(`API ${res.status}:${await res.text()}`);\n" +
      "    usage.models[model] = (usage.models[model] ?? 0) + 1; // 请求进门才上账:被拒之门外的不上\n" +
      "\n",
    card: ['ask·说明书随行,外面套降级链',
      '<b>tools</b> 字段把工具柜每层的三张标签(name/description/parameters)随消息一起寄出去——模型「知道有工具可调」全靠这一眼。坑在形状:OpenAI 口径要<b>套一层 function 壳</b>(type:"function" 包着本体),拍扁直接发,回你 tools[0].function 不能为空(真机踩过)。v1.4 的 <b>opts</b> 两件:<b>signal</b> 把 Esc 的 AbortController 递进 fetch——飞行中的请求从这被掐断;<b>onText</b> 把打字机交给调用方——主对话传流式上屏,子代理不传(过程不刷屏,结论走工具卡回家)。v1.9 外面套<b>降级链</b>:主模型挂了(429/5xx/名字写错)按 config.fallback 换人重问,链走完才认输——产品不能因为一座机房抖一下就死。换人的判定有三不换:用户 Esc 掐的、字已吐给脸面的、链走完的。']
  },
  {
    id: 'sse',
    tag: '④ ask·拆流攒申请',
    code: "    // SSE 分块不讲道理:一个 chunk 可能装半个事件、也可能仨——攒到换行才算拿到一条\n" +
      "    const dec = new TextDecoder();\n" +
      "    let text = '';\n" +
      "    const toolAcc: (ToolCall | undefined)[] = []; // 流式下 arguments 按 index 分片挤出来,攒!\n" +
      "    let buf = '';\n" +
      "    for await (const chunk of res.body) {\n" +
      "      buf += dec.decode(chunk);\n" +
      "      for (let nl = buf.indexOf('\\n'); nl !== -1; nl = buf.indexOf('\\n')) {\n" +
      "        const line = buf.slice(0, nl).trim();\n" +
      "        buf = buf.slice(nl + 1);\n" +
      "        if (!line.startsWith('data:')) continue; // 空行,跳过\n" +
      "        const payload = line.slice(5).trim();\n" +
      "        if (payload === '[DONE]') return done(text, toolAcc); // 流的终点\n" +
      "        const c = JSON.parse(payload) as {\n" +
      "          choices?: {\n" +
      "            delta?: {\n" +
      "              content?: string;\n" +
      "              tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[];\n" +
      "            };\n" +
      "          }[];\n" +
      "          usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };\n" +
      "        };\n" +
      "        if (c.usage) {\n" +
      "          usage.in += c.usage.prompt_tokens ?? 0; // 账单只挂在最后一个事件\n" +
      "          usage.out += c.usage.completion_tokens ?? 0;\n" +
      "          usage.cached += c.usage.prompt_tokens_details?.cached_tokens ?? 0; // 前缀缓存命中:命中部分约五折计费\n" +
      "          usage.lastPrompt = c.usage.prompt_tokens ?? usage.lastPrompt; // 当前上下文水位,压缩看它\n" +
      "        }\n" +
      "        const d = c.choices?.[0]?.delta;\n" +
      "        if (d?.content) {\n" +
      "          text += d.content;\n" +
      "          onText?.(d.content); // 打字机:来一个词念一个词(脸面归调用方管)\n" +
      "        }\n" +
      "        for (const tc of d?.tool_calls ?? []) {\n" +
      "          const slot = (toolAcc[tc.index] ??= { id: '', name: '', args: '' });\n" +
      "          if (tc.id) slot.id = tc.id; // id 整块只来一次;name/arguments 是增量\n" +
      "          if (tc.function?.name) slot.name += tc.function.name;\n" +
      "          if (tc.function?.arguments) slot.args += tc.function.arguments;\n" +
      "        }\n" +
      "      }\n" +
      "    }\n" +
      "    return done(text, toolAcc); // 没等到 [DONE] 就断流:攒到多少算多少\n" +
      "  } catch (e) {\n" +
      "    (e as { spoke?: boolean }).spoke = spoke; // 把「吐没吐过字」捎给降级链\n" +
      "    throw e;\n" +
      "  }\n" +
      "}\n" +
      "\n",
    card: ['拆流:老三样之外,工具申请也要攒',
      '攒→切→解析还是 v0.4 那三步(下方 B 台亲手玩),新活是 <b>toolAcc</b>:流式下模型回的工具调用不是整块,是按 <b>index</b> 开槽、name 和 arguments 一片一片挤出来的——所以逐片 <b>+=</b> 拼,id 却是整块赋值(只来一次)。v1.2 记账多了两笔:<b>cached_tokens</b> 藏在 prompt_tokens_details 里——前缀缓存命中了多少,一目了然;lastPrompt 记下当前水位,出了这个循环压缩器就要看它。v1.9 的 <b>spoke</b> 旗子:字已吐给脸面就不降级重试——重试会把半句再说一遍,宁可报错;出错时把旗子捎在异常上,降级链看它定夺。',
      'sse']
  },
  {
    id: 'plain',
    tag: '⑤ askPlain·素请求',
    code: "// 素请求:不带 tools、直接收整段文本——压缩器要的就是它(总结历史不需要工具)。\n" +
      "// v1.9 路由:压缩用 config.compactModel——总结老历史是后台活,用不上旗舰脑力,\n" +
      "// 同一条生产线不同岗位派不同的人(CH10 多模型路由的落点)\n" +
      "async function askPlain(msgs: Msg[]): Promise<string> {\n" +
      "  const res = await fetch(API, {\n" +
      "    method: 'POST',\n" +
      "    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },\n" +
      "    body: JSON.stringify({ model: config.compactModel, messages: msgs, max_tokens: 4096, stream: false }),\n" +
      "  });\n" +
      "  if (!res.ok) throw new Error(`API ${res.status}:${await res.text()}`);\n" +
      "  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };\n" +
      "  const text = data.choices?.[0]?.message?.content ?? '';\n" +
      "  if (text) process.stdout.write(text); // 压缩摘要当场亮出来,压了什么看得见\n" +
      "  return text;\n" +
      "}\n" +
      "\n",
    card: ['askPlain·压缩器的腿,派便宜款',
      'v1.2 新增:不带 tools、不流式、发什么收什么的一段素请求。为什么单独造?因为<b>压缩历史这个活不需要工具</b>——总结对话是纯语言任务,给模型递工具清单反而引它分心。ask() 与 askPlain() 一浓一淡:前者是 agent 的嘴(带说明书、流式、攒申请),后者是干活的腿(轻装、整块收)。依赖注入的思路:context.ts 的压缩器收一个 askPlain 参数,由 chat.ts 注入——context.ts 只管记忆的账,不碰 key 与网络。v1.9 给它上了<b>路由</b>:压缩改用 config.compactModel——总结老历史是后台活,用不上旗舰脑力,派便宜款;同一条生产线,不同岗位派不同的人。']
  },
  {
    id: 'run',
    tag: '⑥ 执行口·钩子接线',
    code: "function done(text: string, acc: (ToolCall | undefined)[]): { text: string; toolCalls: ToolCall[] } {\n" +
      "  return { text, toolCalls: acc.filter((c): c is ToolCall => !!c?.name) };\n" +
      "}\n" +
      "\n" +
      "// 执行口 v1.9 收归共享 runTool:主循环与子代理(agents.ts)走同一扇门,四道兜底\n" +
      "// (名字没见过/参数不是 JSON/校验不过/执行抛错——都当结果喂回,模型看着错误\n" +
      "// 自己改,CH4 的头号秘密)只此一份;钩子与轨迹挂在门上,一处挂全卡位\n" +
      "\n" +
      "// 工具轨迹:MC_TRACE 指向一个文件时,每次工具调用(含被钩子拦下的)追加一行\n" +
      "// {tool,args,result} JSON——evals 的眼睛:不猜模型说了什么,看它动了什么\n" +
      "function trace(tool: string, args: unknown, result: string): void {\n" +
      "  if (!process.env.MC_TRACE) return;\n" +
      "  try { fs.appendFileSync(process.env.MC_TRACE, JSON.stringify({ tool, args, result }) + '\\n'); } catch { /* 轨迹写不进不能带崩对话 */ }\n" +
      "}\n" +
      "\n" +
      "// 一条公式结账:缓存命中的 token 约五折计费(智谱前缀缓存)——\n" +
      "// /cost、退出小结、遥测落盘三处共用,公式只写一遍\n" +
      "function costOf(u: typeof usage): number {\n" +
      "  return ((u.in - u.cached) * PRICE.in + u.cached * PRICE.in * 0.5 + u.out * PRICE.out) / 1e6;\n" +
      "}\n" +
      "\n" +
      "// 成本遥测:每场一行 JSON 落 .miniclaude/usage.jsonl——账本不再进程一退就没,\n" +
      "// /cost 随时翻旧账;记不上(只读目录之类)也不带崩告别\n" +
      "function logUsage(): void {\n" +
      "  try {\n" +
      "    fs.mkdirSync('.miniclaude', { recursive: true });\n" +
      "    fs.appendFileSync('.miniclaude/usage.jsonl', JSON.stringify({ at: new Date().toISOString(), ...usage, cost: +costOf(usage).toFixed(6) }) + '\\n');\n" +
      "  } catch { /* 遥测是外挂不是器官 */ }\n" +
      "}\n" +
      "\n" +
      "function readUsageLog(): { cost?: number }[] {\n" +
      "  try {\n" +
      "    return fs.readFileSync('.miniclaude/usage.jsonl', 'utf8').trim().split('\\n').filter(Boolean).map((l) => JSON.parse(l));\n" +
      "  } catch { return []; } // 还没记过账 = 空表\n" +
      "}\n" +
      "\n" +
      "const rl = readline.createInterface({ input: process.stdin, output: process.stdout });\n" +
      "// Ctrl-D / 管道断流:pending 的 question 不会自己醒——用 close 事件替它喊一声,\n" +
      "// 输了 race 就走下面的 catch 收摊结账(否则进程带着未决 await 裸退,账单不结)\n" +
      "const eof = new Promise<never>((_, rej) => rl.on('close', () => rej(new Error('stdin 关了'))));\n" +
      "eof.catch(() => {}); // 挂上才不是未处理拒绝:启动期(如等 MCP list 时)stdin 就关,race 还没跑起来\n" +
      "// ask 档命令的确认流:必须复用同一个 rl——两个 readline 抢 stdin 会互吞输入行\n" +
      "setConfirm(async (cmd) => {\n" +
      "  try {\n" +
      "    const ans = (await rl.question(`  ⚠️ 命令确认:${cmd}\\n  允许?(y=允许 n=拒绝 a=本会话总是允许) `)).trim().toLowerCase();\n" +
      "    return ans === 'a' ? 'a' : ans === 'y' ? 'y' : 'n'; // 含糊的输入一律当拒绝,安全侧倒\n" +
      "  } catch {\n" +
      "    return 'n'; // EOF / 管道断流:没人点头 = 不放行\n" +
      "  }\n" +
      "});\n" +
      "// 子代理的腿(v1.3):复用同一个 ask——子会话的 token 自动记进总账,\n" +
      "// 收窄的工具柜在 ask 里过滤;两套循环跑在同一个进程里\n" +
      "// (不传 onText:子会话的过程不刷屏,结论走工具卡回家)\n" +
      "setAskOnce((msgs, allow) => ask(msgs, allow));\n" +
      "// 工具拦截口(v1.9):钩子(hooks.ts,配置说了算)+ 轨迹(MC_TRACE,evals 的眼睛)。\n" +
      "// 挂在共享 runTool 上——主循环与子代理同一条执行口,一处挂全卡位;网页分身\n" +
      "// 不挂它,行为分毫不变(与 setConfirm 同款的依赖注入)\n" +
      "setToolInterceptor(async (call: ToolCall, phase: 'pre' | 'post', result?: string): Promise<string | void> => {\n" +
      "  let args: unknown;\n" +
      "  try { args = JSON.parse(call.args || '{}'); } catch { args = {}; }\n" +
      "  if (phase === 'pre') {\n" +
      "    const v = runHooks('preToolUse', call.name, args);\n" +
      "    if (v.blocked) { trace(call.name, args, v.blocked); return v.blocked; } // 拦下的话当结果喂回,轨迹里也看得见\n" +
      "    if (v.warn) ui.say(ui.c.yellow(`  ⚠️ ${v.warn}`));\n" +
      "    return;\n" +
      "  }\n" +
      "  const v = runHooks('postToolUse', call.name, args, result ?? '');\n" +
      "  if (v.blocked || v.warn) ui.say(ui.c.yellow(`  ⚠️ ${v.blocked ?? v.warn}(执行已发生,拦的只能是下一次)`));\n" +
      "  trace(call.name, args, result ?? '');\n" +
      "});\n" +
      "await registerMcpTools(); // 外挂按 .mcp.json 接入:名片进柜子,execute 留在子进程(CH9.3)\n" +
      "ui.say(`${ui.c.bold('小c上线')}${ui.c.dim('(exit 退出 · 回答途中按 Esc 打断 · /help 看命令表)')}`);\n" +
      "\n",
    card: ['执行口收归一处,钩子挂在门上',
      'v1.9 的头一刀:本地 run() 退役,主循环与子代理(agents.ts)全走共享 <b>runTool</b>——四道兜底(名字没见过/参数不是 JSON/校验不过/执行抛错,统统当结果喂回让模型自己改,CH4 的头号秘密)只此一份。<b>setToolInterceptor</b> 把钩子与轨迹挂上这扇门:<b>pre</b> 档钩子(hooks.ts,配置说了算,exit 2 = 拦)拦下的理由当结果喂回;<b>post</b> 档只剩黄牌——执行已发生,拦的只能是下一次。<b>trace</b>:MC_TRACE 指向文件时每次调用落一行 JSON——evals 的眼睛,不猜模型说了什么,看它动了什么。<b>costOf/logUsage</b>:一条公式三处共用(/cost、退出小结、遥测落盘);每场一行 JSON 进 .miniclaude/usage.jsonl,进程退了账还在。确认流 setConfirm 复用同一个 rl——两个 readline 抢 stdin 会互吞输入行(CH6 的坑)。']
  },
  {
    id: 'loop',
    tag: '⑦ agent 主循环',
    code: "// 一回合的 agent 循环:ask 一轮 → 执行它要的工具 → 再 ask,直到它不再要。\n" +
      "// allow 收窄柜台——计划模式借这扇门只留只读工具,会改世界的一概不发(v1.7)\n" +
      "async function agentLoop(allow?: string[], signal?: AbortSignal): Promise<void> {\n" +
      "  while (true) {\n" +
      "    ui.think('小c在想…');\n" +
      "    const { text, toolCalls } = await ask(messages, allow, { signal, onText: ui.stream });\n" +
      "    if (toolCalls.length === 0) { // 退出条件 = 这一轮没有 tool_calls,它只想说话\n" +
      "      ui.commit(ui.md(text)); // 两段式:流完把裸文本擦起重排(粗体/行内码/码块)\n" +
      "      messages.push({ role: 'assistant', content: text });\n" +
      "      return;\n" +
      "    }\n" +
      "    if (text) ui.commit(ui.md(text)); // 它边说旁白边要工具:旁白先落定,再亮动作\n" +
      "    else ui.end(); // 纯要工具没说话:收掉转圈,直接进动作\n" +
      "    messages.push({\n" +
      "      role: 'assistant',\n" +
      "      content: text,\n" +
      "      tool_calls: toolCalls.map(c => ({\n" +
      "        id: c.id, type: 'function' as const,\n" +
      "        function: { name: c.name, arguments: c.args },\n" +
      "      })),\n" +
      "    });\n" +
      "    for (const c of toolCalls) {\n" +
      "      ui.status(`${ui.c.cyan('⏺')} ${c.name} ${ui.c.dim(c.args.length > 50 ? c.args.slice(0, 50) + '…' : c.args || '{}')}`);\n" +
      "      const { res: result } = await runTool(c); // 统一执行口:四道兜底+钩子+轨迹都在这扇门里\n" +
      "      messages.push({ role: 'tool', tool_call_id: c.id, content: result });\n" +
      "      ui.say(ui.toolCard(c.name, c.args, result)); // 动作要亮出来:diff 行在这里上色\n" +
      "    }\n" +
      "    if (signal?.aborted) { // 打断检查点:整批工具结果已入账,不再发下一轮\n" +
      "      messages.push({ role: 'user', content: '(用户按 Esc 打断了这一轮,先停,等下一句)' });\n" +
      "      ui.say(ui.c.yellow('⏹ 已打断——工具结果已入账,等下一句'));\n" +
      "      return;\n" +
      "    }\n" +
      "  }\n" +
      "}\n" +
      "\n" +
      "// 计划模式的只读柜台:能看不能改——不是叮嘱它别改,是物理上没有改的把手\n" +
      "const READ_ONLY = ['read_file', 'get_time', 'calculator'];\n" +
      "\n" +
      "// 上下文水位超线就压老历史:/plan 与普通回合共用,抽成一个函数各喊一声\n" +
      "async function maybeCompact(): Promise<void> {\n" +
      "  if (!shouldCompact(usage.lastPrompt)) return;\n" +
      "  ui.say(`  🗜 上下文 ${usage.lastPrompt} token 超过水位 ${COMPACT_AT},压缩老历史…`);\n" +
      "  if (await compactHistory(messages, askPlain)) ui.say('  🗜 已压缩:老历史换摘要,尾部原文保留');\n" +
      "}\n" +
      "\n" +
      "// 斜杠命令表(v1.8):客户端拦下查表——命中就展开执行,未命中原样放行当普通\n" +
      "// 说话。模型自始至终没见过斜杠:它收到的只是展开后的普通 user 消息\n" +
      "const COMMANDS: Record<string, { desc: string; run: (rest: string) => Promise<void> | void }> = {\n" +
      "  '/plan': {\n" +
      "    desc: '计划模式:先只读调研出分步计划,你批准才动手',\n" +
      "    async run(task) {\n" +
      "      if (!task) { ui.say(ui.c.yellow('用法:/plan <任务>')); return; }\n" +
      "      const ac = new AbortController();\n" +
      "      const offEsc = ui.onEsc(() => ac.abort());\n" +
      "      const rollback = messages.length;\n" +
      "      try {\n" +
      "        ui.say(`${ui.c.cyan('⏸ 计划模式')}${ui.c.dim('(只调研不改文件,计划出来你批准才动手)')}`);\n" +
      "        messages.push({ role: 'user', content: `(计划模式)${task}\\n只调研、不要修改任何文件;想清楚后给出分步执行计划,到此为止,不要动手。` });\n" +
      "        await agentLoop(READ_ONLY, ac.signal); // 只读柜台逛到它交出计划为止\n" +
      "        const ans = (await rl.question(`${ui.c.bold('  批准这份计划并执行?(y/n) ')}`)).trim().toLowerCase();\n" +
      "        if (ans === 'y') {\n" +
      "          messages.push({ role: 'user', content: '(计划已批准。请先用 TodoWrite 立清单,再按计划执行,逐步更新状态。)' });\n" +
      "          await agentLoop(undefined, ac.signal); // 全量柜台开工,清单跟着记\n" +
      "        } else {\n" +
      "          ui.say(ui.c.yellow('已驳回——计划阶段只读,未做任何修改。'));\n" +
      "        }\n" +
      "      } catch (e) {\n" +
      "        messages.length = rollback;\n" +
      "        if (ac.signal.aborted) ui.say(ui.c.yellow('⏹ 已打断——这轮不入账'));\n" +
      "        else ui.say(ui.c.red(`出错:${e instanceof Error ? e.message : e}`));\n" +
      "      } finally {\n" +
      "        offEsc();\n" +
      "        const rlBuf = rl as unknown as { line: string; cursor: number };\n" +
      "        rlBuf.line = ''; rlBuf.cursor = 0;\n" +
      "        ui.end();\n" +
      "      }\n" +
      "      await maybeCompact();\n" +
      "    },\n" +
      "  },\n" +
      "  '/help': {\n" +
      "    desc: '列出全部命令',\n" +
      "    run() {\n" +
      "      ui.say([ui.c.bold('命令表:'), ...Object.entries(COMMANDS).map(([k, v]) => `  ${ui.c.cyan(k)}  ${ui.c.dim(v.desc)}`)].join('\\n'));\n" +
      "    },\n" +
      "  },\n" +
      "  '/mcp': {\n" +
      "    desc: '查看已接入的 MCP server 与外挂工具',\n" +
      "    run() {\n" +
      "      const st = getMcpStatus();\n" +
      "      ui.say(st.length\n" +
      "        ? [ui.c.bold('已接入的 MCP server:'), ...st.map((s) => `  ${ui.c.cyan(s.server)} → ${s.tools.join(', ')}(execute 住在子进程)`)].join('\\n')\n" +
      "        : '未接入任何 MCP server(.mcp.json 未配置或没拉起)');\n" +
      "    },\n" +
      "  },\n" +
      "  '/cost': {\n" +
      "    desc: '看账:本场明细 + 历场累计(账本在 .miniclaude/usage.jsonl)',\n" +
      "    run() {\n" +
      "      const lines = readUsageLog();\n" +
      "      const total = lines.reduce((s, l) => s + (l.cost ?? 0), 0);\n" +
      "      const models = Object.entries(usage.models).map(([m, n]) => `${m}×${n}`).join(' · ') || '(还没问过模型)';\n" +
      "      ui.say([\n" +
      "        `${ui.c.bold('本场:')}${ui.c.dim(`输入 ${usage.in}(缓存命中 ${usage.cached},五折计)+ 输出 ${usage.out} token ≈ ¥${costOf(usage).toFixed(4)}`)}`,\n" +
      "        `  模型用量:${models}`,\n" +
      "        `  历场:${lines.length} 场累计 ≈ ¥${total.toFixed(4)}${lines.length ? ui.c.dim('(本场退出时会再记一行)') : ''}`,\n" +
      "      ].join('\\n'));\n" +
      "    },\n" +
      "  },\n" +
      "  '/config': {\n" +
      "    desc: '看生效配置:模型/降级链/名单/钩子(默认 ← ~/.miniclaude.json ← .miniclaude.json)',\n" +
      "    run() {\n" +
      "      const p = config.permissions;\n" +
      "      const h = config.hooks;\n" +
      "      ui.say([\n" +
      "        ui.c.bold('生效配置(项目级覆盖用户级,数组只能加码):'),\n" +
      "        `  主模型 ${ui.c.cyan(config.model)} · 压缩用 ${ui.c.cyan(config.compactModel)}${config.compactModel === config.model ? '' : '(后台活派便宜款)'}`,\n" +
      "        `  降级链 ${[config.model, ...config.fallback].join(' → ')}${config.fallback.length ? '' : '(空:主模型挂了不换人)'}`,\n" +
      "        `  名单追加 deny ${p.deny.length} 条 · allow ${p.allow.length} 条(内置名单另算,见 permissions.ts)`,\n" +
      "        `  钩子 preToolUse ${h.preToolUse.length} 条 · postToolUse ${h.postToolUse.length} 条(配置写在 .miniclaude.json)`,\n" +
      "      ].join('\\n'));\n" +
      "    },\n" +
      "  },\n" +
      "};\n" +
      "\n" +
      "while (true) {\n" +
      "  let line: string;\n" +
      "  try {\n" +
      "    line = (await Promise.race([rl.question('你> '), eof])).trim();\n" +
      "  } catch {\n" +
      "    break; // Ctrl-D / 管道 EOF\n" +
      "  }\n" +
      "  if (line === 'exit') break;\n" +
      "  if (!line) continue;\n" +
      "\n" +
      "  // 斜杠先查表:命中展开执行(整轮都归命令管,走完 continue)、未命中放行——\n" +
      "  // 「/xxx 是什么」这类话原样发给模型,它看到的只是个普通词\n" +
      "  if (line.startsWith('/')) {\n" +
      "    const [name, ...rest] = line.split(/\\s+/);\n" +
      "    const cmd = COMMANDS[name];\n" +
      "    if (cmd) { await cmd.run(rest.join(' ')); continue; }\n" +
      "  }\n" +
      "\n" +
      "  // 清单快照(v1.7):宿主手里的真账每轮拍一张,捎在 user 消息尾——不靠历史里\n" +
      "  // 那条 tool 消息活着,压缩把老历史糊成摘要也糊不掉当前进度;追加在尾部,\n" +
      "  // 前面的缓存照吃\n" +
      "  const todos = getTodos();\n" +
      "  if (todos.length) {\n" +
      "    const mark: Record<string, string> = { pending: '☐', in_progress: '▸', done: '☑' };\n" +
      "    line += '\\n\\n(当前任务清单:\\n' + todos.map((t, i) => `${mark[t.status]} ${i + 1}. ${t.content}`).join('\\n') + ')';\n" +
      "  }\n" +
      "  messages.push({ role: 'user', content: line });\n" +
      "  const rollback = messages.length - 1; // 失败回滚到这轮 user 消息之前\n" +
      "  // Esc = 本轮的撤销键:ui.onEsc 在 raw 模式接住按键,一按就掐 abort。\n" +
      "  // 竞态处理在循环里:流中被 fetch 直接断;工具批跑完看旗子(一整批\n" +
      "  // tool 结果都在,历史才合法——半批 assistant 要了俩只回了一个 = API 400);\n" +
      "  // 断完给模型一句交代,别让它对着空气猜\n" +
      "  const ac = new AbortController();\n" +
      "  const offEsc = ui.onEsc(() => ac.abort());\n" +
      "  try {\n" +
      "    await agentLoop(undefined, ac.signal);\n" +
      "    // 上下文水位:超线就把老历史压成摘要(水位看的是最后一次请求的 prompt token,\n" +
      "    // 而不是消息条数——token 才是要花钱的那个单位)\n" +
      "    await maybeCompact();\n" +
      "  } catch (e) {\n" +
      "    messages.length = rollback; // 失败这轮不入账,别留半截对话\n" +
      "    if (ac.signal.aborted) ui.say(ui.c.yellow('⏹ 已打断——这轮不入账')); // 流中被掐断:半句话不进记忆\n" +
      "    else ui.say(ui.c.red(`出错:${e instanceof Error ? e.message : e}`));\n" +
      "  } finally {\n" +
      "    offEsc(); // 按键还给终端:raw 模式只在回合内接管\n" +
      "    // 回合里手滑打的字没进对话,却落进了 rl 的行缓冲(它一直在听 stdin)——\n" +
      "    // 清掉别带进下一问。真 Claude Code 会把流式中打的字排队成下一条消息,\n" +
      "    // 排队是宿主循环上的器官,留给以后\n" +
      "    const rlBuf = rl as unknown as { line: string; cursor: number };\n" +
      "    rlBuf.line = ''; rlBuf.cursor = 0;\n" +
      "    ui.end();\n" +
      "  }\n" +
      "}\n" +
      "\n",
    card: ['双层循环:外圈读人,内圈跑 agent,Esc 是撤销键',
      '<b>agent 循环</b>本体没变:ask 一轮 → 它要工具就执行、喂回、再 ask,直到某轮 <b>toolCalls 为空</b>(考点:退出条件 = 它不再要,不是调够 N 次)。v1.4 换的全是脸:转圈 <b>ui.think</b> 第一个字到达即停;流完 <b>ui.commit</b>把裸文本擦起重排(两段式,网页对话框 v0.7 同款);工具跑前亮 <b>ui.status</b>、跑完打 ⏺ <b>工具卡</b>(edit_file 的 diff 行在这里红绿上色)。<b>Esc 打断</b>三处竞态:流中被 signal 直接掐断,这轮不入账(半句话不进记忆);工具批跑完看旗子——一整批 tool 结果都在历史才合法,assistant 要了俩只回一个 = API 400;打断完给模型一句 <b>user 注记</b>,别让它对着空气猜(真 Claude Code 同款)。v1.7 循环体抽成 <b>agentLoop(allow)</b> 函数,/plan 借它逛只读柜台;v1.8 外圈进门先查<b>斜杠命令表</b>(命中展开执行、未命中原样放行——模型自始至终没见过斜杠),压缩触发抽成 <b>maybeCompact</b> 两处共用;启动时 <b>await registerMcpTools()</b> 把 .mcp.json 里的 server 拉起——名片注册进 TOOLS,execute 住在子进程(CH9.3:tool → MCP,搬家名片不变)。v1.9 执行口换成 <b>runTool</b>(钩子与轨迹全住在那扇门里),命令表添 <b>/cost</b>(看账:本场明细+历场累计)与 <b>/config</b>(看生效配置:模型/降级链/名单/钩子)。']
  },
  {
    id: 'bill',
    tag: '⑧ 记账收尾',
    code: "rl.close();\n" +
      "// 缓存命中的 token 约五折计费(智谱上下文缓存),折算进总账看真便宜\n" +
      "logUsage(); // 遥测先行:告别的话还没说,账已经落了盘(/cost 与历场累计靠它)\n" +
      "console.log(`再见。输入 ${usage.in}(缓存命中 ${usage.cached},五折计)+ 输出 ${usage.out} token,约 ¥${costOf(usage).toFixed(4)}`);\n",
    card: ['记账:退出时把账算了——缓存命中五折,账本落盘',
      '每轮 ask() 顺手记账,退出时一条公式结账——v1.2 的公式长了半截:<code>(输入−命中)×4 + 命中×4×0.5 + 输出×14 ÷ 100万</code>。前缀缓存命中的 token 约五折计费,同一段 system prompt 与老历史每轮原样重发,<b>第二轮起就该在 cached_tokens 里涨起来</b>——这正是 CH7 的落点:省钱的功夫不在少发,在「发一样的」。v1.9 告别前先 <b>logUsage()</b>:每场一行 JSON 落 .miniclaude/usage.jsonl——账本不再进程一退就没,/cost 翻旧账、历场累计全靠它。',
      'bill']
  }
];
/* 迷你高亮：一次正则分词（注释/字符串/关键字/数字），避免「注释里的引号」互相污染 */
function hl(src) {
  var esc = function (s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  var re = /(\/\/[^\n]*)|('(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`|"(?:[^"\\\n]|\\.)*")|\b(const|let|var|async|await|function|return|if|else|for|while|try|catch|throw|new|import|from|break|continue|of|in|as|export|type|interface)\b|\b(\d[\d_]*(?:\.\d+)?)\b/g;
  var out = '', m, last = 0, piece;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    if (m[1]) piece = '<i class="cx-c">' + esc(m[1]) + '</i>';
    else if (m[2]) piece = '<i class="cx-s">' + esc(m[2]) + '</i>';
    else if (m[3]) piece = '<i class="cx-k">' + esc(m[3]) + '</i>';
    else piece = '<i class="cx-n">' + esc(m[4]) + '</i>';
    out += piece;
    last = m.index + m[0].length;
  }
  return out + esc(src.slice(last));
}

(function mountCode() {
  var box = $id('cx-code');
  var exp = $id('cx-exp');
  var on = null;
  SEGS.forEach(function (s) {
    var div = document.createElement('div');
    div.className = 'cx-seg';
    div.setAttribute('data-s', s.id);
    div.innerHTML = '<span class="cx-tag">' + s.tag + '</span>' + hl(s.code);
    box.appendChild(div);
    div.addEventListener('click', function () {
      if (on) on.classList.remove('on');
      on = div;
      div.classList.add('on');
      var html = '<h4>' + s.card[0] + '</h4><div>' + s.card[1] + '</div>';
      if (s.card[2] === 'sse') {
        html += '<span class="lab-mini cx-go" id="cx-tob">▶ 到 B 台看缓冲实验(劈成碎片版)</span>';
      }
      exp.innerHTML = html;
      var go = $id('cx-tob');
      if (go) go.addEventListener('click', function () {
        runMode('shred');
        $id('cx-chunk').scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      /* 卡不完全在视口里（含只裁一半）就把它居中到眼前——手算 scrollTo,
         scrollIntoView 在个别嵌入环境/平滑滚动状态下会静默失灵 */
      var r = exp.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight) {
        window.scrollTo(0, scrollY + r.top - (innerHeight - r.height) / 2);
      }
      pinSync(); /* 卡高随段落变，钉住的位置要重算 */
    });
  });
  box.firstChild.click(); /* 默认展开第一段 */
  /* 代码面板展开/收起开关：限高模式下 macOS 滚动条默认隐形，看着像截断 */
  var fold = $id('cx-fold');
  if (fold) fold.addEventListener('click', function () {
    var full = $id('cx-code').classList.toggle('full');
    fold.classList.toggle('on', full);
    fold.textContent = full ? '⤡ 收起' : '⤢ 展开全部';
    pinSync(); /* 代码列高变了，跟随模式可能要开关 */
  });
})();

/* ================= B · SSE 缓冲实验 ================= */

/* 一段三词回复的完整 SSE 流(形状照真机缩样：delta×3 → 账单 → 终点) */
var B_EVENTS = [
  '{"choices":[{"delta":{"content":"你"}}]}',
  '{"choices":[{"delta":{"content":"好"}}]}',
  '{"choices":[{"delta":{"content":"！"}}]}',
  '{"choices":[{"delta":{}}],"usage":{"prompt_tokens":17,"completion_tokens":3}}',
  '[DONE]'
];
var B_TEXT = B_EVENTS.map(function (e) { return 'data: ' + e; }).join('\n\n') + '\n\n';

var bTimer = null;

function bReset() {
  clearInterval(bTimer);
  $id('cx-buf').innerHTML = '';
  $id('cx-evts').innerHTML = '';
  $id('cx-type').textContent = '';
  $id('cx-bill').textContent = '账单：还没收到';
  $id('cx-chunk').classList.remove('hot');
}

function bAddEvt(kind, text) {
  var el = document.createElement('div');
  el.className = 'cx-evt evt-' + kind;
  el.textContent = text;
  var list = $id('cx-evts');
  list.appendChild(el);
  list.scrollTop = list.scrollHeight;
}

/* runMode('whole'|'shred')：把 B_TEXT 按 chunk 喂进缓冲区，逐字演同一段解析逻辑 */
function runMode(mode) {
  bReset();
  /* [\s\S] 而不是 .：正则的点号不吃换行符，用 . 会把 \n 全丢在切碎的路上 */
  var chunks = mode === 'whole' ? [B_TEXT] : B_TEXT.match(/[\s\S]{1,9}/g) || [];
  var ci = 0, pos = 0, buf = '';
  var chunk = $id('cx-chunk');
  chunk.textContent = '共 ' + chunks.length + ' 个 chunk' + (mode === 'shred' ? '(每 9 字符一段，JSON 劈得稀碎)' : '(一次全到)');
  chunk.classList.add('hot');

  function drawBuf() {
    var shown = buf.replace(/\n/g, '⏎\n');
    /* 切出来的部分已移出 buf——留在 buf 里的全是「半截，还不能解析」 */
    $id('cx-buf').innerHTML = shown ? '<span class="cx-pend">' + shown + '</span>' : '(空——全切成事件了)';
  }
  drawBuf();

  function drain() {
    /* 与 src/chat.ts 同款：见换行就切一条 */
    var nl = buf.indexOf('\n');
    while (nl !== -1) {
      var line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line.indexOf('data:') === 0) {
        var payload = line.slice(5).trim();
        if (payload === '[DONE]') { bAddEvt('done', line + ' → 流的终点，收工'); return true; }
        var c;
        try { c = JSON.parse(payload); } catch (e) { bAddEvt('done', '解析失败：' + e.message); return true; }
        if (c.usage) {
          $id('cx-bill').textContent = '账单：输入 ' + c.usage.prompt_tokens + ' + 输出 ' + c.usage.completion_tokens + ' token(挂在最后一个带内容的事件上)';
          bAddEvt('usage', line);
        }
        var d = c.choices && c.choices[0] && c.choices[0].delta && c.choices[0].delta.content;
        if (d) {
          $id('cx-type').textContent += d;
          bAddEvt('delta', line);
        }
      }
      nl = buf.indexOf('\n');
    }
    drawBuf();
    return false;
  }

  bTimer = setInterval(function () {
    if (ci >= chunks.length) { clearInterval(bTimer); chunk.classList.remove('hot'); chunk.textContent += ' · 完'; return; }
    buf += chunks[ci].charAt(pos++);
    if (pos >= chunks[ci].length) { ci++; pos = 0; }
    if (drain()) { clearInterval(bTimer); chunk.classList.remove('hot'); chunk.textContent += ' · 完'; }
  }, 26);
}

(function mountB() {
  var modes = document.querySelectorAll('#chat-lab .cx-mode');
  Array.prototype.forEach.call(modes, function (el) {
    el.addEventListener('click', function () {
      Array.prototype.forEach.call(modes, function (m) { m.classList.remove('on'); });
      el.classList.add('on');
      runMode(el.getAttribute('data-k'));
    });
  });
})();

/* ================= C · 真机连线(解析与 src/chat.ts 同款) ================= */

var cMsgs = [{ role: 'system', content: '你是小c，简洁直接的中文助手。' }];
var cUsage = { in: 0, out: 0 };
var cBusy = false;

function cAcc() {
  $id('cx-acc').textContent = '账本：' + cMsgs.length + ' 条（1 system + ' + (cMsgs.length - 1) + ' 轮）· 累计 ' + (cUsage.in + cUsage.out) + ' token';
  var cost = (cUsage.in * 4 + cUsage.out * 14) / 1e6;
  $id('cx-acc2').textContent = '账单：¥' + cost.toFixed(4) + '(输入 ' + cUsage.in + ' ×4 + 输出 ' + cUsage.out + ' ×14，每百万 token)';
}

function cRaw(kind, text) {
  var list = $id('cx-raw');
  if (list.firstChild && list.firstChild.nodeType === 3) list.innerHTML = '';
  var el = document.createElement('div');
  el.className = 'cx-evt evt-' + kind;
  el.textContent = text;
  list.appendChild(el);
  while (list.children.length > 14) list.removeChild(list.firstChild);
  list.scrollTop = list.scrollHeight;
}

async function cSend() {
  var input = $id('cx-in');
  var text = input.value.trim();
  if (!text || cBusy) return;
  cBusy = true;
  $id('cx-send').classList.add('busy');
  input.value = '';
  input.disabled = true;
  cMsgs.push({ role: 'user', content: text });
  $id('cx-live').textContent = '';
  $id('cx-raw').innerHTML = '';
  cRaw('done', '→ POST /api/chat(messages ' + cMsgs.length + ' 条，整本重寄)');
  try {
    var res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: cMsgs })
    });
    if (!res.ok || !res.body) throw new Error('API ' + res.status + ':' + (await res.text()).slice(0, 120));
    /* ↓ 与 src/chat.ts 逐行同款：攒 → 切 → 解析 */
    var dec = new TextDecoder();
    var full = '';
    var buf = '';
    for await (var chunk of res.body) {
      buf += dec.decode(chunk);
      for (var nl = buf.indexOf('\n'); nl !== -1; nl = buf.indexOf('\n')) {
        var line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (line.indexOf('data:') !== 0) continue;
        var payload = line.slice(5).trim();
        if (payload === '[DONE]') {
          cRaw('done', 'data: [DONE] → 流的终点');
          break;
        }
        var c;
        try { c = JSON.parse(payload); } catch (e) { continue; }
        var ch = c.choices && c.choices[0];
        var d = ch && ch.delta || {};
        if (d.reasoning_content) cRaw('think', 'data: {…reasoning_content:"' + String(d.reasoning_content).slice(0, 18) + '"…} → 思考草稿，chat.ts 不理');
        if (d.content) {
          full += d.content;
          $id('cx-live').textContent = full;
          cRaw('delta', 'data: {…content:"' + d.content + '"}');
        }
        if (c.usage) {
          cUsage.in += c.usage.prompt_tokens || 0;
          cUsage.out += c.usage.completion_tokens || 0;
          cRaw('usage', 'data: {…usage:' + c.usage.prompt_tokens + '+' + c.usage.completion_tokens + '} → 账单');
          cAcc();
        }
      }
    }
    cMsgs.push({ role: 'assistant', content: full });
    cAcc();
  } catch (e) {
    cRaw('done', '✕ ' + (e && e.message ? e.message : e));
    cMsgs.pop(); /* 失败这轮不入账——与 src/chat.ts 同一条纪律 */
  }
  cBusy = false;
  $id('cx-send').classList.remove('busy');
  input.disabled = false;
  input.focus();
}

(function mountC() {
  $id('cx-send').addEventListener('click', cSend);
  $id('cx-in').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') cSend();
  });
  cAcc();
})();
