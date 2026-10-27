// v0.3 · 聊天机器人 —— CH2 实践第 3 步:流式 SSE
// 跑法:npm run chat(node 26 原生跑 TS,--env-file 读 .env,零运行时依赖)
// 循环:读一行 → 连同全部历史发请求 → 打字机式打印回复 → 回复入历史。
// 「记忆」仍是那个 messages 数组,变的只是回复怎么到屏幕上:
// 非流式是等整封信寄到再读,流式是对方写一个词就念一个词。
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const KEY = process.env.GLM_API_KEY;
if (!KEY) {
  console.error('没读到 GLM_API_KEY —— 检查 .env 文件在不在、里面有没有这一行');
  process.exit(1);
}

// 对话历史:整场对话的唯一状态。system 定人设,user/assistant 轮流长进来
const messages: Array<{ role: string; content: string }> = [
  { role: 'system', content: '你是小c,一个简洁、直接的中文助手。' },
];

const API = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

async function ask(history: Array<{ role: string; content: string }>) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: 'glm-4.6',
      messages: history,
      max_tokens: 4096, // GLM-4.6 是思考型,给少了会被思考吃光导致空回复
      stream: true,
    }),
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}:${await res.text()}`);
  }
  if (!res.body) throw new Error('响应没有 body');

  // SSE 协议:服务器把事件一行行推,每行「data: {json}」,流结尾是「data: [DONE]」。
  // 但网络分块(chunk)不守规矩——一个 chunk 可能半个事件、也可能仨事件,
  // 所以先攒缓冲区,见到换行才算拿到一条完整事件
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue; // 注释行/空行,跳过
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return full;
      const delta = (JSON.parse(payload) as {
        choices?: Array<{ delta?: { content?: string } }>;
      }).choices?.[0]?.delta?.content;
      if (delta) {
        full += delta;
        process.stdout.write(delta); // 打字机:来一个词念一个词
      }
    }
  }
  return full; // 服务器没发 [DONE] 就断流,手上攒了多少算多少
}

const rl = readline.createInterface({ input, output });
console.log('小c上线(exit 或 Ctrl-C 退出)');

while (true) {
  let line: string;
  try {
    line = (await rl.question('你> ')).trim();
  } catch {
    break; // stdin 关了(Ctrl-D / 管道 EOF),按退出处理
  }
  if (!line) continue;
  if (line === 'exit') break;

  messages.push({ role: 'user', content: line });
  try {
    process.stdout.write('小c> ');
    const reply = await ask(messages);
    messages.push({ role: 'assistant', content: reply });
    process.stdout.write('\n\n');
  } catch (e) {
    console.error(`出错:${e instanceof Error ? e.message : e}\n`);
    messages.pop(); // 失败这轮不入账,历史别留半截对话
  }
}

rl.close();
console.log('再见。');
