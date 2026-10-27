// v0.2 · 聊天机器人 —— CH2 实践第 2 步:非流式最小循环
// 跑法:npm run chat(node 26 原生跑 TS,--env-file 读 .env,零运行时依赖)
// 循环:读一行 → 连同全部历史发请求 → 打印回复 → 回复入历史。多轮的「记忆」就是这个数组。
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
      stream: false,
    }),
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}:${await res.text()}`);
  }
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0].message.content;
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
    const reply = await ask(messages);
    messages.push({ role: 'assistant', content: reply });
    console.log(`小c> ${reply}\n`);
  } catch (e) {
    console.error(`出错:${e instanceof Error ? e.message : e}\n`);
    messages.pop(); // 失败这轮不入账,历史别留半截对话
  }
}

rl.close();
console.log('再见。');
