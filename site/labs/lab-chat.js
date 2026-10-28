/* labs/lab-chat.js —— CH2 实验室:chat.ts 透视台
   ----------------------------------------------------------------------------
   A 台:src/chat.ts 全文八段,点击段落 → 透视卡交代它干什么、数据什么形状
        (透视卡机制同 CH1 素颜相见台,升格为整份代码可透视——代码分析标配)。
   B 台:SSE 缓冲实验——同一段流两种到达方式(整包 vs 劈成碎片),
        逐字进缓冲区、见换行切事件,亲眼看半截 JSON 为什么不能解析。
   C 台:真机连线——POST /api/chat(scripts/serve.mjs 流式代理,key 只住服务端),
        前端解析与 src/chat.ts 逐行同款;右侧直播原始 SSE,思考草稿在流里可见。 */
import { $id } from './shared.js';

/* ================= A · 代码透视(段落与透视卡) ================= */

/* 卡列跟随:幕折叠的 ::details-content 会劫持 sticky/fixed 的包含块(实测 fixed 钉到伪元素顶),
   只剩绝对定位可靠——position:absolute 挂在网格上,滚动时重算 top */
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
    /* 只有「网格比视口高、代码列比卡高」时才钉;其余时候各回各位 */
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

/* 八段代码与 src/chat.ts 逐字一致(v1.3 子代理与工作流,183 行) */
var SEGS = [
  {
    id: 'gear',
    tag: '① 装备区',
    code: "// v1.3 · agent 循环 + 上下文管理 + 子代理 —— 聊天 + 工具调用 + 记忆不再无限长(压缩) + 缓存记账 + 循环里再开循环\n" +
      "// 跑法:npm run chat(node 26 原生跑 TS,key 住 .env 不进代码)\n" +
      "import * as readline from 'node:readline/promises';\n" +
      "import { TOOLS, validate, setConfirm, setAskOnce } from './tools/index.ts';\n" +
      "import { buildSystemPrompt, shouldCompact, compactHistory, COMPACT_AT, type Msg, type ToolCall, type ApiToolCall } from './context.ts';\n" +
      "\n" +
      "const KEY = process.env.GLM_API_KEY;\n" +
      "if (!KEY) {\n" +
      "  console.error('没读到 GLM_API_KEY —— 检查 .env');\n" +
      "  process.exit(1);\n" +
      "}\n" +
      "\n" +
      "const API = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';\n" +
      "const PRICE = { in: 4, out: 14 }; // 元 / 百万 token\n" +
      "const usage = { in: 0, out: 0, cached: 0, lastPrompt: 0 };\n",
    card: ['装备区:开战前的五样东西',
      '工具从哪来?从 <b>注册表</b>——tools/index.ts 统一出口:tools/ 目录一件一个文件,统一的 <b>Tool</b> 形状(名字/说明书/参数表/execute)住在 types.ts,加工具 = 加文件 + 注册表添一行,主循环一行不用改(Claude Code 上百个工具背后就是这么一张表)。<b>KEY</b>——从环境变量来(.env),不写死在代码里;<b>API</b> 换厂商就是换域名;<b>PRICE</b> 价目表(输入 4 元、输出 14 元,每百万 token);<b>usage</b> 从 0 记账——v1.2 多了两栏:<b>cached</b>(缓存命中的 token,约五折计)和 <b>lastPrompt</b>(当前上下文水位,压缩器看它)。v1.3 再挂一个钩子 <b>setAskOnce</b>:子代理「问一轮模型」的腿,由这里递进去(附加章讲)。']
  },
  {
    id: 'types',
    tag: '② 记忆与形状',
    code: "// 消息数组就是记忆:system/user/assistant/tool 四种角色,tool 消息必须绑 tool_call_id\n" +
      "// v1.2 形状与拼装搬进 context.ts:system prompt 不再是裸一句人设,而是人设+环境快照+CLAUDE.md\n" +
      "const messages: Msg[] = [{ role: 'system', content: buildSystemPrompt() }];\n",
    card: ['记忆:形状搬走,拼装升级',
      '四种角色(system/user/assistant/tool)的形状定义 v1.2 搬进了 <b>context.ts</b>——上下文的账本和记账的笔住一处。messages 初始化那一行也换了血:不再是裸一句人设,而是 <b>buildSystemPrompt()</b> 拼出来的三段——人设 + 环境快照(工作目录/会话始于) + CLAUDE.md 项目记忆。关键在「快照」二字:环境信息取启动那一刻定格,整会话一字不改——前缀缓存从第一个字开始匹配,system prompt 改一个字、缓存全部作废。']
  },
  {
    id: 'req',
    tag: '③ ask·发请求',
    code: "// 发全部历史,流式收回「这一轮发生了什么」(说话了还是要工具了),顺手记账。\n" +
      "// v1.3 泛化两参:hist 默认主对话的 messages,allow 收窄工具柜——\n" +
      "// 子代理借同一扇门问模型,只是拎自己的历史、逛缩水的柜台\n" +
      "async function ask(hist: Msg[] = messages, allow?: string[]): Promise<{ text: string; toolCalls: ToolCall[] }> {\n" +
      "  const res = await fetch(API, {\n" +
      "    method: 'POST',\n" +
      "    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },\n" +
      "    body: JSON.stringify({\n" +
      "      model: 'glm-4.6', messages: hist,\n" +
      "      max_tokens: 4096,\n" +
      "      stream: true,\n" +
      "      tools: (allow ? TOOLS.filter(t => allow.includes(t.name)) : TOOLS).map(t => ({\n" +
      "        type: 'function' as const,\n" +
      "        function: { name: t.name, description: t.description, parameters: t.parameters },\n" +
      "      })),\n" +
      "    }),\n" +
      "  });\n" +
      "  if (!res.ok || !res.body) throw new Error(`API ${res.status}:${await res.text()}`);\n" +
      "\n",
    card: ['ask·说明书随行一起寄',
      '比 v0.4 多一个 <b>tools</b> 字段:把工具柜每层的三张标签(name/description/parameters)随消息一起寄出去——模型「知道有工具可调」全靠这一眼。坑在形状:OpenAI 口径要<b>套一层 function 壳</b>(type:“function” 包着本体),拍扁直接发,回你 tools[0].function 不能为空(真机踩过)。返回值也从「一段话」变成 <b>Turn</b>:这一轮它说了什么、要了哪些工具,两头都收。v1.3 把它泛化成两参:<b>hist</b> 默认还是主对话的 messages、<b>allow</b> 收窄工具柜——子代理借同一扇门问模型(附加章)。']
  },
  {
    id: 'sse',
    tag: '④ ask·拆流攒申请',
    code: "  // SSE 分块不讲道理:一个 chunk 可能装半个事件、也可能仨——攒到换行才算拿到一条\n" +
      "  const dec = new TextDecoder();\n" +
      "  let text = '';\n" +
      "  const toolAcc: (ToolCall | undefined)[] = []; // 流式下 arguments 按 index 分片挤出来,攒!\n" +
      "  let buf = '';\n" +
      "  for await (const chunk of res.body) {\n" +
      "    buf += dec.decode(chunk);\n" +
      "    for (let nl = buf.indexOf('\\n'); nl !== -1; nl = buf.indexOf('\\n')) {\n" +
      "      const line = buf.slice(0, nl).trim();\n" +
      "      buf = buf.slice(nl + 1);\n" +
      "      if (!line.startsWith('data:')) continue; // 空行,跳过\n" +
      "      const payload = line.slice(5).trim();\n" +
      "      if (payload === '[DONE]') return done(text, toolAcc); // 流的终点\n" +
      "      const c = JSON.parse(payload) as {\n" +
      "        choices?: {\n" +
      "          delta?: {\n" +
      "            content?: string;\n" +
      "            tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[];\n" +
      "          };\n" +
      "        }[];\n" +
      "        usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };\n" +
      "      };\n" +
      "      if (c.usage) {\n" +
      "        usage.in += c.usage.prompt_tokens ?? 0; // 账单只挂在最后一个事件\n" +
      "        usage.out += c.usage.completion_tokens ?? 0;\n" +
      "        usage.cached += c.usage.prompt_tokens_details?.cached_tokens ?? 0; // 前缀缓存命中:命中部分约五折计费\n" +
      "        usage.lastPrompt = c.usage.prompt_tokens ?? usage.lastPrompt; // 当前上下文水位,压缩看它\n" +
      "      }\n" +
      "      const d = c.choices?.[0]?.delta;\n" +
      "      if (d?.content) {\n" +
      "        text += d.content;\n" +
      "        process.stdout.write(d.content); // 打字机:来一个词念一个词\n" +
      "      }\n" +
      "      for (const tc of d?.tool_calls ?? []) {\n" +
      "        const slot = (toolAcc[tc.index] ??= { id: '', name: '', args: '' });\n" +
      "        if (tc.id) slot.id = tc.id; // id 整块只来一次;name/arguments 是增量\n" +
      "        if (tc.function?.name) slot.name += tc.function.name;\n" +
      "        if (tc.function?.arguments) slot.args += tc.function.arguments;\n" +
      "      }\n" +
      "    }\n" +
      "  }\n" +
      "  return done(text, toolAcc); // 没等到 [DONE] 就断流:攒到多少算多少\n" +
      "}\n",
    card: ['拆流:老三样之外,工具申请也要攒',
      '攒→切→解析还是 v0.4 那三步(下方 B 台亲手玩),新活是 <b>toolAcc</b>:流式下模型回的工具调用不是整块,是按 <b>index</b> 开槽、name 和 arguments 一片一片挤出来的——所以逐片 <b>+=</b> 拼,id 却是整块赋值(只来一次)。v1.2 记账多了两笔:<b>cached_tokens</b> 藏在 prompt_tokens_details 里——前缀缓存命中了多少,一目了然;lastPrompt 记下当前水位,出了这个循环压缩器就要看它。',
      'sse']
  },
  {
    id: 'plain',
    tag: '⑤ askPlain·素请求',
    code: "// 素请求:不带 tools、直接收整段文本——压缩器要的就是它(总结历史不需要工具)\n" +
      "async function askPlain(msgs: Msg[]): Promise<string> {\n" +
      "  const res = await fetch(API, {\n" +
      "    method: 'POST',\n" +
      "    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },\n" +
      "    body: JSON.stringify({ model: 'glm-4.6', messages: msgs, max_tokens: 4096, stream: false }),\n" +
      "  });\n" +
      "  if (!res.ok) throw new Error(`API ${res.status}:${await res.text()}`);\n" +
      "  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };\n" +
      "  const text = data.choices?.[0]?.message?.content ?? '';\n" +
      "  if (text) process.stdout.write(text); // 压缩摘要当场亮出来,压了什么看得见\n" +
      "  return text;\n" +
      "}\n",
    card: ['askPlain·压缩器的腿',
      'v1.2 新增:不带 tools、不流式、发什么收什么的一段素请求。为什么单独造?因为<b>压缩历史这个活不需要工具</b>——总结对话是纯语言任务,给模型递工具清单反而引它分心。ask() 与 askPlain() 一浓一淡:前者是 agent 的嘴(带说明书、流式、攒申请),后者是干活的腿(轻装、整块收)。依赖注入的思路:context.ts 的压缩器收一个 askPlain 参数,由 chat.ts 注入——context.ts 只管记忆的账,不碰 key 与网络。']
  },
  {
    id: 'run',
    tag: '⑥ 工具执行',
    code: "function done(text: string, acc: (ToolCall | undefined)[]): { text: string; toolCalls: ToolCall[] } {\n" +
      "  return { text, toolCalls: acc.filter((c): c is ToolCall => !!c?.name) };\n" +
      "}\n" +
      "\n" +
      "// 执行一个工具调用:名字没见过、参数不是合法 JSON、校验不过、执行抛错——\n" +
      "// 都当结果喂回而不是崩溃,模型看着错误自己改(CH4 的头号秘密)\n" +
      "async function run(call: ToolCall): Promise<string> {\n" +
      "  const tool = TOOLS.find(t => t.name === call.name);\n" +
      "  if (!tool) return `未知工具:${call.name}`;\n" +
      "  try {\n" +
      "    const args = JSON.parse(call.args || '{}');\n" +
      "    const errs = validate(args, tool.parameters); // 说明书不只发给模型看,还反过来约束进门的参数\n" +
      "    if (errs.length) return `参数校验不过:${errs.join(';')}`;\n" +
      "    return await tool.execute(args);\n" +
      "  } catch (e) {\n" +
      "    return `工具执行出错:${e instanceof Error ? e.message : e}`;\n" +
      "  }\n" +
      "}\n",
    card: ['run·执行在代码,错误当结果',
      '执行权在谁手里?在 <b>你的代码</b>——模型只递申请单,execute 是柜子里你写的函数。四道兜底一个不崩:名字没见过、arguments 不是合法 JSON、<b>参数校验不过</b>(说明书不只发给模型看,还反过来约束进门的参数——validate.ts 手写的迷你 JSON Schema 校验器)、执行抛异常——统统<b>当字符串结果喂回去</b>,让模型看着错误自己改(它真会:参数写错一次,下一轮它自己修)。agent 鲁棒性的头号秘密。done() 是收尾小工:把攒的槽位滤成清单。']
  },
  {
    id: 'loop',
    tag: '⑦ agent 主循环',
    code: "const rl = readline.createInterface({ input: process.stdin, output: process.stdout });\n" +
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
      "setAskOnce((msgs, allow) => ask(msgs, allow));\n" +
      "console.log('小c上线(exit 退出)');\n" +
      "\n" +
      "while (true) {\n" +
      "  let line: string;\n" +
      "  try {\n" +
      "    line = (await rl.question('你> ')).trim();\n" +
      "  } catch {\n" +
      "    break; // Ctrl-D / 管道 EOF\n" +
      "  }\n" +
      "  if (line === 'exit') break;\n" +
      "  if (!line) continue;\n" +
      "\n" +
      "  messages.push({ role: 'user', content: line });\n" +
      "  const rollback = messages.length - 1; // 失败回滚到这轮 user 消息之前\n" +
      "  try {\n" +
      "    while (true) { // agent 循环:ask 一轮 → 执行它要的工具 → 再 ask,直到它不再要\n" +
      "      process.stdout.write('小c> ');\n" +
      "      const { text, toolCalls } = await ask();\n" +
      "      if (toolCalls.length === 0) { // 退出条件 = 这一轮没有 tool_calls,它只想说话\n" +
      "        messages.push({ role: 'assistant', content: text });\n" +
      "        break;\n" +
      "      }\n" +
      "      // 它要了工具:先把它「开口要」这条原样入史,再逐个执行、逐条喂回\n" +
      "      messages.push({\n" +
      "        role: 'assistant',\n" +
      "        content: text,\n" +
      "        tool_calls: toolCalls.map(c => ({\n" +
      "          id: c.id, type: 'function' as const,\n" +
      "          function: { name: c.name, arguments: c.args },\n" +
      "        })),\n" +
      "      });\n" +
      "      for (const c of toolCalls) {\n" +
      "        const result = await run(c);\n" +
      "        messages.push({ role: 'tool', tool_call_id: c.id, content: result });\n" +
      "        console.log(`\\n  🔧 ${c.name}(${c.args}) → ${result}`); // 动作要亮出来\n" +
      "      }\n" +
      "    }\n" +
      "    process.stdout.write('\\n\\n');\n" +
      "    // 上下文水位:超线就把老历史压成摘要(水位看的是最后一次请求的 prompt token,\n" +
      "    // 而不是消息条数——token 才是要花钱的那个单位)\n" +
      "    if (shouldCompact(usage.lastPrompt)) {\n" +
      "      console.log(`  🗜 上下文 ${usage.lastPrompt} token 超过水位 ${COMPACT_AT},压缩老历史…`);\n" +
      "      if (await compactHistory(messages, askPlain)) console.log('  🗜 已压缩:老历史换摘要,尾部原文保留');\n" +
      "    }\n" +
      "  } catch (e) {\n" +
      "    messages.length = rollback; // 失败这轮不入账,别留半截对话\n" +
      "    console.error(`出错:${e instanceof Error ? e.message : e}\\n`);\n" +
      "  }\n" +
      "}\n",
    card: ['双层循环:外圈读人,内圈跑 agent,出口看水位',
      'v0.8 套的 <b>agent 循环</b>:ask 一轮 → 它要工具就执行、喂回、再 ask,直到某轮 <b>toolCalls 为空</b>(考点 1:退出条件 = 它不再要,不是调够 N 次)。动作要亮出来——🔧 一行让人看得见「它决定了什么」。回滚记 <b>rollback 深度</b>一刀切平——失败这轮彻底不入账。v1.1 循环门口挂了 <b>确认流</b>(ask 档命令借这个 rl 问 y/n/a)。v1.2 循环出口多了一环 <b>压缩触发</b>:每轮收尾看 lastPrompt 水位,超线就把老历史交给压缩器换摘要——水位看 token 不看消息条数,token 才是要花钱的那个单位。v1.3 确认流下面再挂一条 <b>setAskOnce</b>(子代理的腿):execute 里再开的那套循环,借同一个 ask 问模型、token 进同一本账(附加章)。']
  },
  {
    id: 'bill',
    tag: '⑧ 记账收尾',
    code: "rl.close();\n" +
      "// 缓存命中的 token 约五折计费(智谱上下文缓存),折算进总账看真便宜\n" +
      "const cost = ((usage.in - usage.cached) * PRICE.in + usage.cached * PRICE.in * 0.5 + usage.out * PRICE.out) / 1e6;\n" +
      "console.log(`再见。输入 ${usage.in}(缓存命中 ${usage.cached},五折计)+ 输出 ${usage.out} token,约 ¥${cost.toFixed(4)}`);\n",
    card: ['记账:退出时把账算了——缓存命中五折',
      '每轮 ask() 顺手记账,退出时一条公式结账——v1.2 的公式长了半截:<code>(输入−命中)×4 + 命中×4×0.5 + 输出×14 ÷ 100万</code>。前缀缓存命中的 token 约五折计费,同一段 system prompt 与老历史每轮原样重发,<b>第二轮起就该在 cached_tokens 里涨起来</b>——这正是 CH7 的落点:省钱的功夫不在少发,在「发一样的」。',
      'bill']
  }
];
/* 迷你高亮:一次正则分词(注释/字符串/关键字/数字),避免「注释里的引号」互相污染 */
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
      /* 卡不完全在视口里(含只裁一半)就把它居中到眼前——手算 scrollTo,
         scrollIntoView 在个别嵌入环境/平滑滚动状态下会静默失灵 */
      var r = exp.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight) {
        window.scrollTo(0, scrollY + r.top - (innerHeight - r.height) / 2);
      }
      pinSync(); /* 卡高随段落变,钉住的位置要重算 */
    });
  });
  box.firstChild.click(); /* 默认展开第一段 */
  /* 代码面板展开/收起开关:限高模式下 macOS 滚动条默认隐形,看着像截断 */
  var fold = $id('cx-fold');
  if (fold) fold.addEventListener('click', function () {
    var full = $id('cx-code').classList.toggle('full');
    fold.classList.toggle('on', full);
    fold.textContent = full ? '⤡ 收起' : '⤢ 展开全部';
    pinSync(); /* 代码列高变了,跟随模式可能要开关 */
  });
})();

/* ================= B · SSE 缓冲实验 ================= */

/* 一段三词回复的完整 SSE 流(形状照真机缩样:delta×3 → 账单 → 终点) */
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
  $id('cx-bill').textContent = '账单:还没收到';
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

/* runMode('whole'|'shred'):把 B_TEXT 按 chunk 喂进缓冲区,逐字演同一段解析逻辑 */
function runMode(mode) {
  bReset();
  /* [\s\S] 而不是 .:正则的点号不吃换行符,用 . 会把 \n 全丢在切碎的路上 */
  var chunks = mode === 'whole' ? [B_TEXT] : B_TEXT.match(/[\s\S]{1,9}/g) || [];
  var ci = 0, pos = 0, buf = '';
  var chunk = $id('cx-chunk');
  chunk.textContent = '共 ' + chunks.length + ' 个 chunk' + (mode === 'shred' ? '(每 9 字符一段,JSON 劈得稀碎)' : '(一次全到)');
  chunk.classList.add('hot');

  function drawBuf() {
    var shown = buf.replace(/\n/g, '⏎\n');
    /* 切出来的部分已移出 buf——留在 buf 里的全是「半截,还不能解析」 */
    $id('cx-buf').innerHTML = shown ? '<span class="cx-pend">' + shown + '</span>' : '(空——全切成事件了)';
  }
  drawBuf();

  function drain() {
    /* 与 src/chat.ts 同款:见换行就切一条 */
    var nl = buf.indexOf('\n');
    while (nl !== -1) {
      var line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line.indexOf('data:') === 0) {
        var payload = line.slice(5).trim();
        if (payload === '[DONE]') { bAddEvt('done', line + ' → 流的终点,收工'); return true; }
        var c;
        try { c = JSON.parse(payload); } catch (e) { bAddEvt('done', '解析失败:' + e.message); return true; }
        if (c.usage) {
          $id('cx-bill').textContent = '账单:输入 ' + c.usage.prompt_tokens + ' + 输出 ' + c.usage.completion_tokens + ' token(挂在最后一个带内容的事件上)';
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

var cMsgs = [{ role: 'system', content: '你是小c,简洁直接的中文助手。' }];
var cUsage = { in: 0, out: 0 };
var cBusy = false;

function cAcc() {
  $id('cx-acc').textContent = '账本:' + cMsgs.length + ' 条(1 system + ' + (cMsgs.length - 1) + ' 轮)· 累计 ' + (cUsage.in + cUsage.out) + ' token';
  var cost = (cUsage.in * 4 + cUsage.out * 14) / 1e6;
  $id('cx-acc2').textContent = '账单:¥' + cost.toFixed(4) + '(输入 ' + cUsage.in + ' ×4 + 输出 ' + cUsage.out + ' ×14,每百万 token)';
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
  cRaw('done', '→ POST /api/chat(messages ' + cMsgs.length + ' 条,整本重寄)');
  try {
    var res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: cMsgs })
    });
    if (!res.ok || !res.body) throw new Error('API ' + res.status + ':' + (await res.text()).slice(0, 120));
    /* ↓ 与 src/chat.ts 逐行同款:攒 → 切 → 解析 */
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
        if (d.reasoning_content) cRaw('think', 'data: {…reasoning_content:"' + String(d.reasoning_content).slice(0, 18) + '"…} → 思考草稿,chat.ts 不理');
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
