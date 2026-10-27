// v0.4 · 聊天机器人 —— 多轮记忆 + 流式打字机 + 退出记账
// 跑法:npm run chat(node 26 原生跑 TS,key 住 .env 不进代码)
import * as readline from 'node:readline/promises';

const KEY = process.env.GLM_API_KEY;
if (!KEY) {
  console.error('没读到 GLM_API_KEY —— 检查 .env');
  process.exit(1);
}

const API = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const PRICE = { in: 4, out: 14 }; // 元 / 百万 token
const messages = [{ role: 'system', content: '你是小c,简洁直接的中文助手。' }];
const usage = { in: 0, out: 0 };

// 发全部历史,流式收回一段完整回复,顺手记账
async function ask(): Promise<string> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: 'glm-4.6', messages, max_tokens: 4096, stream: true }),
  });
  if (!res.ok || !res.body) throw new Error(`API ${res.status}:${await res.text()}`);

  // SSE 分块不讲道理:一个 chunk 可能装半个事件、也可能仨——攒到换行才算拿到一条
  const dec = new TextDecoder();
  let full = '';
  let buf = '';
  for await (const chunk of res.body) {
    buf += dec.decode(chunk);
    for (let nl = buf.indexOf('\n'); nl !== -1; nl = buf.indexOf('\n')) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue; // 空行,跳过
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return full; // 流的终点
      const c = JSON.parse(payload) as {
        choices?: { delta?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      if (c.usage) {
        usage.in += c.usage.prompt_tokens ?? 0; // 账单只挂在最后一个事件
        usage.out += c.usage.completion_tokens ?? 0;
      }
      const delta = c.choices?.[0]?.delta?.content;
      if (delta) {
        full += delta;
        process.stdout.write(delta); // 打字机:来一个词念一个词
      }
    }
  }
  return full; // 没等到 [DONE] 就断流:攒到多少算多少
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log('小c上线(exit 退出)');

while (true) {
  let line: string;
  try {
    line = (await rl.question('你> ')).trim();
  } catch {
    break; // Ctrl-D / 管道 EOF
  }
  if (line === 'exit') break;
  if (!line) continue;

  messages.push({ role: 'user', content: line });
  try {
    process.stdout.write('小c> ');
    messages.push({ role: 'assistant', content: await ask() });
    process.stdout.write('\n\n');
  } catch (e) {
    messages.pop(); // 失败这轮不入账,别留半截对话
    console.error(`出错:${e instanceof Error ? e.message : e}\n`);
  }
}

rl.close();
const cost = (usage.in * PRICE.in + usage.out * PRICE.out) / 1e6;
console.log(`再见。合计输入 ${usage.in} + 输出 ${usage.out} token,约 ¥${cost.toFixed(4)}`);
