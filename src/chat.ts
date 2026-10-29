// v1.8 · 斜杠命令表 + mini MCP —— / 开头先查表:命中展开执行、未命中原样放行
// (模型不认识斜杠);.mcp.json 里的 server 拉起子进程,名片注册进 TOOLS
// 跑法:npm run chat(node 26 原生跑 TS,key 住 .env 不进代码)
import * as readline from 'node:readline/promises';
import { TOOLS, validate, setConfirm, setAskOnce, getTodos, registerMcpTools, getMcpStatus } from './tools/index.ts';
import { buildSystemPrompt, shouldCompact, compactHistory, COMPACT_AT, type Msg, type ToolCall, type ApiToolCall } from './context.ts';
import * as ui from './ui.ts';

const KEY = process.env.GLM_API_KEY;
if (!KEY) {
  console.error('没读到 GLM_API_KEY —— 检查 .env');
  process.exit(1);
}

const API = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const PRICE = { in: 4, out: 14 }; // 元 / 百万 token
const usage = { in: 0, out: 0, cached: 0, lastPrompt: 0 };

// 消息数组就是记忆:system/user/assistant/tool 四种角色,tool 消息必须绑 tool_call_id
// v1.2 形状与拼装搬进 context.ts:system prompt 不再是裸一句人设,而是人设+环境快照+CLAUDE.md
const messages: Msg[] = [{ role: 'system', content: buildSystemPrompt() }];

// 发全部历史,流式收回「这一轮发生了什么」(说话了还是要工具了),顺手记账。
// v1.3 泛化两参:hist 默认主对话的 messages,allow 收窄工具柜——
// 子代理借同一扇门问模型,只是拎自己的历史、逛缩水的柜台
// v1.4 再加 opts:signal 把 Esc 的 AbortController 递进 fetch(飞行中的请求
// 从这被掐断);onText 把打字机交给调用方——主对话传流式上屏,子代理不传
type AskOpts = { signal?: AbortSignal; onText?: (s: string) => void };
async function ask(hist: Msg[] = messages, allow?: string[], opts: AskOpts = {}): Promise<{ text: string; toolCalls: ToolCall[] }> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: 'glm-4.6', messages: hist,
      max_tokens: 4096,
      stream: true,
      tools: (allow ? TOOLS.filter(t => allow.includes(t.name)) : TOOLS).map(t => ({
        type: 'function' as const,
        function: { name: t.name, description: t.description, parameters: t.parameters },
      })),
    }),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) throw new Error(`API ${res.status}:${await res.text()}`);

  // SSE 分块不讲道理:一个 chunk 可能装半个事件、也可能仨——攒到换行才算拿到一条
  const dec = new TextDecoder();
  let text = '';
  const toolAcc: (ToolCall | undefined)[] = []; // 流式下 arguments 按 index 分片挤出来,攒!
  let buf = '';
  for await (const chunk of res.body) {
    buf += dec.decode(chunk);
    for (let nl = buf.indexOf('\n'); nl !== -1; nl = buf.indexOf('\n')) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue; // 空行,跳过
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return done(text, toolAcc); // 流的终点
      const c = JSON.parse(payload) as {
        choices?: {
          delta?: {
            content?: string;
            tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[];
          };
        }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };
      };
      if (c.usage) {
        usage.in += c.usage.prompt_tokens ?? 0; // 账单只挂在最后一个事件
        usage.out += c.usage.completion_tokens ?? 0;
        usage.cached += c.usage.prompt_tokens_details?.cached_tokens ?? 0; // 前缀缓存命中:命中部分约五折计费
        usage.lastPrompt = c.usage.prompt_tokens ?? usage.lastPrompt; // 当前上下文水位,压缩看它
      }
      const d = c.choices?.[0]?.delta;
      if (d?.content) {
        text += d.content;
        opts.onText?.(d.content); // 打字机:来一个词念一个词(脸面归调用方管)
      }
      for (const tc of d?.tool_calls ?? []) {
        const slot = (toolAcc[tc.index] ??= { id: '', name: '', args: '' });
        if (tc.id) slot.id = tc.id; // id 整块只来一次;name/arguments 是增量
        if (tc.function?.name) slot.name += tc.function.name;
        if (tc.function?.arguments) slot.args += tc.function.arguments;
      }
    }
  }
  return done(text, toolAcc); // 没等到 [DONE] 就断流:攒到多少算多少
}

// 素请求:不带 tools、直接收整段文本——压缩器要的就是它(总结历史不需要工具)
async function askPlain(msgs: Msg[]): Promise<string> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: 'glm-4.6', messages: msgs, max_tokens: 4096, stream: false }),
  });
  if (!res.ok) throw new Error(`API ${res.status}:${await res.text()}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content ?? '';
  if (text) process.stdout.write(text); // 压缩摘要当场亮出来,压了什么看得见
  return text;
}

function done(text: string, acc: (ToolCall | undefined)[]): { text: string; toolCalls: ToolCall[] } {
  return { text, toolCalls: acc.filter((c): c is ToolCall => !!c?.name) };
}

// 执行一个工具调用:名字没见过、参数不是合法 JSON、校验不过、执行抛错——
// 都当结果喂回而不是崩溃,模型看着错误自己改(CH4 的头号秘密)
async function run(call: ToolCall): Promise<string> {
  const tool = TOOLS.find(t => t.name === call.name);
  if (!tool) return `未知工具:${call.name}`;
  try {
    const args = JSON.parse(call.args || '{}');
    const errs = validate(args, tool.parameters); // 说明书不只发给模型看,还反过来约束进门的参数
    if (errs.length) return `参数校验不过:${errs.join(';')}`;
    return await tool.execute(args);
  } catch (e) {
    return `工具执行出错:${e instanceof Error ? e.message : e}`;
  }
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
// Ctrl-D / 管道断流:pending 的 question 不会自己醒——用 close 事件替它喊一声,
// 输了 race 就走下面的 catch 收摊结账(否则进程带着未决 await 裸退,账单不结)
const eof = new Promise<never>((_, rej) => rl.on('close', () => rej(new Error('stdin 关了'))));
eof.catch(() => {}); // 挂上才不是未处理拒绝:启动期(如等 MCP list 时)stdin 就关,race 还没跑起来
// ask 档命令的确认流:必须复用同一个 rl——两个 readline 抢 stdin 会互吞输入行
setConfirm(async (cmd) => {
  try {
    const ans = (await rl.question(`  ⚠️ 命令确认:${cmd}\n  允许?(y=允许 n=拒绝 a=本会话总是允许) `)).trim().toLowerCase();
    return ans === 'a' ? 'a' : ans === 'y' ? 'y' : 'n'; // 含糊的输入一律当拒绝,安全侧倒
  } catch {
    return 'n'; // EOF / 管道断流:没人点头 = 不放行
  }
});
// 子代理的腿(v1.3):复用同一个 ask——子会话的 token 自动记进总账,
// 收窄的工具柜在 ask 里过滤;两套循环跑在同一个进程里
// (不传 onText:子会话的过程不刷屏,结论走工具卡回家)
setAskOnce((msgs, allow) => ask(msgs, allow));
await registerMcpTools(); // 外挂按 .mcp.json 接入:名片进柜子,execute 留在子进程(CH9.3)
ui.say(`${ui.c.bold('小c上线')}${ui.c.dim('(exit 退出 · 回答途中按 Esc 打断 · /help 看命令表)')}`);

// 一回合的 agent 循环:ask 一轮 → 执行它要的工具 → 再 ask,直到它不再要。
// allow 收窄柜台——计划模式借这扇门只留只读工具,会改世界的一概不发(v1.7)
async function agentLoop(allow?: string[], signal?: AbortSignal): Promise<void> {
  while (true) {
    ui.think('小c在想…');
    const { text, toolCalls } = await ask(messages, allow, { signal, onText: ui.stream });
    if (toolCalls.length === 0) { // 退出条件 = 这一轮没有 tool_calls,它只想说话
      ui.commit(ui.md(text)); // 两段式:流完把裸文本擦起重排(粗体/行内码/码块)
      messages.push({ role: 'assistant', content: text });
      return;
    }
    if (text) ui.commit(ui.md(text)); // 它边说旁白边要工具:旁白先落定,再亮动作
    else ui.end(); // 纯要工具没说话:收掉转圈,直接进动作
    messages.push({
      role: 'assistant',
      content: text,
      tool_calls: toolCalls.map(c => ({
        id: c.id, type: 'function' as const,
        function: { name: c.name, arguments: c.args },
      })),
    });
    for (const c of toolCalls) {
      ui.status(`${ui.c.cyan('⏺')} ${c.name} ${ui.c.dim(c.args.length > 50 ? c.args.slice(0, 50) + '…' : c.args || '{}')}`);
      const result = await run(c);
      messages.push({ role: 'tool', tool_call_id: c.id, content: result });
      ui.say(ui.toolCard(c.name, c.args, result)); // 动作要亮出来:diff 行在这里上色
    }
    if (signal?.aborted) { // 打断检查点:整批工具结果已入账,不再发下一轮
      messages.push({ role: 'user', content: '(用户按 Esc 打断了这一轮,先停,等下一句)' });
      ui.say(ui.c.yellow('⏹ 已打断——工具结果已入账,等下一句'));
      return;
    }
  }
}

// 计划模式的只读柜台:能看不能改——不是叮嘱它别改,是物理上没有改的把手
const READ_ONLY = ['read_file', 'get_time', 'calculator'];

// 上下文水位超线就压老历史:/plan 与普通回合共用,抽成一个函数各喊一声
async function maybeCompact(): Promise<void> {
  if (!shouldCompact(usage.lastPrompt)) return;
  ui.say(`  🗜 上下文 ${usage.lastPrompt} token 超过水位 ${COMPACT_AT},压缩老历史…`);
  if (await compactHistory(messages, askPlain)) ui.say('  🗜 已压缩:老历史换摘要,尾部原文保留');
}

// 斜杠命令表(v1.8):客户端拦下查表——命中就展开执行,未命中原样放行当普通
// 说话。模型自始至终没见过斜杠:它收到的只是展开后的普通 user 消息
const COMMANDS: Record<string, { desc: string; run: (rest: string) => Promise<void> | void }> = {
  '/plan': {
    desc: '计划模式:先只读调研出分步计划,你批准才动手',
    async run(task) {
      if (!task) { ui.say(ui.c.yellow('用法:/plan <任务>')); return; }
      const ac = new AbortController();
      const offEsc = ui.onEsc(() => ac.abort());
      const rollback = messages.length;
      try {
        ui.say(`${ui.c.cyan('⏸ 计划模式')}${ui.c.dim('(只调研不改文件,计划出来你批准才动手)')}`);
        messages.push({ role: 'user', content: `(计划模式)${task}\n只调研、不要修改任何文件;想清楚后给出分步执行计划,到此为止,不要动手。` });
        await agentLoop(READ_ONLY, ac.signal); // 只读柜台逛到它交出计划为止
        const ans = (await rl.question(`${ui.c.bold('  批准这份计划并执行?(y/n) ')}`)).trim().toLowerCase();
        if (ans === 'y') {
          messages.push({ role: 'user', content: '(计划已批准。请先用 TodoWrite 立清单,再按计划执行,逐步更新状态。)' });
          await agentLoop(undefined, ac.signal); // 全量柜台开工,清单跟着记
        } else {
          ui.say(ui.c.yellow('已驳回——计划阶段只读,未做任何修改。'));
        }
      } catch (e) {
        messages.length = rollback;
        if (ac.signal.aborted) ui.say(ui.c.yellow('⏹ 已打断——这轮不入账'));
        else ui.say(ui.c.red(`出错:${e instanceof Error ? e.message : e}`));
      } finally {
        offEsc();
        const rlBuf = rl as unknown as { line: string; cursor: number };
        rlBuf.line = ''; rlBuf.cursor = 0;
        ui.end();
      }
      await maybeCompact();
    },
  },
  '/help': {
    desc: '列出全部命令',
    run() {
      ui.say([ui.c.bold('命令表:'), ...Object.entries(COMMANDS).map(([k, v]) => `  ${ui.c.cyan(k)}  ${ui.c.dim(v.desc)}`)].join('\n'));
    },
  },
  '/mcp': {
    desc: '查看已接入的 MCP server 与外挂工具',
    run() {
      const st = getMcpStatus();
      ui.say(st.length
        ? [ui.c.bold('已接入的 MCP server:'), ...st.map((s) => `  ${ui.c.cyan(s.server)} → ${s.tools.join(', ')}(execute 住在子进程)`)].join('\n')
        : '未接入任何 MCP server(.mcp.json 未配置或没拉起)');
    },
  },
};

while (true) {
  let line: string;
  try {
    line = (await Promise.race([rl.question('你> '), eof])).trim();
  } catch {
    break; // Ctrl-D / 管道 EOF
  }
  if (line === 'exit') break;
  if (!line) continue;

  // 斜杠先查表:命中展开执行(整轮都归命令管,走完 continue)、未命中放行——
  // 「/xxx 是什么」这类话原样发给模型,它看到的只是个普通词
  if (line.startsWith('/')) {
    const [name, ...rest] = line.split(/\s+/);
    const cmd = COMMANDS[name];
    if (cmd) { await cmd.run(rest.join(' ')); continue; }
  }

  // 清单快照(v1.7):宿主手里的真账每轮拍一张,捎在 user 消息尾——不靠历史里
  // 那条 tool 消息活着,压缩把老历史糊成摘要也糊不掉当前进度;追加在尾部,
  // 前面的缓存照吃
  const todos = getTodos();
  if (todos.length) {
    const mark: Record<string, string> = { pending: '☐', in_progress: '▸', done: '☑' };
    line += '\n\n(当前任务清单:\n' + todos.map((t, i) => `${mark[t.status]} ${i + 1}. ${t.content}`).join('\n') + ')';
  }
  messages.push({ role: 'user', content: line });
  const rollback = messages.length - 1; // 失败回滚到这轮 user 消息之前
  // Esc = 本轮的撤销键:ui.onEsc 在 raw 模式接住按键,一按就掐 abort。
  // 竞态处理在循环里:流中被 fetch 直接断;工具批跑完看旗子(一整批
  // tool 结果都在,历史才合法——半批 assistant 要了俩只回了一个 = API 400);
  // 断完给模型一句交代,别让它对着空气猜
  const ac = new AbortController();
  const offEsc = ui.onEsc(() => ac.abort());
  try {
    await agentLoop(undefined, ac.signal);
    // 上下文水位:超线就把老历史压成摘要(水位看的是最后一次请求的 prompt token,
    // 而不是消息条数——token 才是要花钱的那个单位)
    await maybeCompact();
  } catch (e) {
    messages.length = rollback; // 失败这轮不入账,别留半截对话
    if (ac.signal.aborted) ui.say(ui.c.yellow('⏹ 已打断——这轮不入账')); // 流中被掐断:半句话不进记忆
    else ui.say(ui.c.red(`出错:${e instanceof Error ? e.message : e}`));
  } finally {
    offEsc(); // 按键还给终端:raw 模式只在回合内接管
    // 回合里手滑打的字没进对话,却落进了 rl 的行缓冲(它一直在听 stdin)——
    // 清掉别带进下一问。真 Claude Code 会把流式中打的字排队成下一条消息,
    // 排队是宿主循环上的器官,留给以后
    const rlBuf = rl as unknown as { line: string; cursor: number };
    rlBuf.line = ''; rlBuf.cursor = 0;
    ui.end();
  }
}

rl.close();
// 缓存命中的 token 约五折计费(智谱上下文缓存),折算进总账看真便宜
const cost = ((usage.in - usage.cached) * PRICE.in + usage.cached * PRICE.in * 0.5 + usage.out * PRICE.out) / 1e6;
console.log(`再见。输入 ${usage.in}(缓存命中 ${usage.cached},五折计)+ 输出 ${usage.out} token,约 ¥${cost.toFixed(4)}`);
