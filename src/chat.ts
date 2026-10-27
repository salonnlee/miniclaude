// v0.1 · 聊天机器人 —— CH2 实践主战场
// 跑法:npm run chat(node 26 原生跑 TS,--env-file 读 .env,零运行时依赖)
// 本文件是脚手架占位:下一步在这里长出「非流式最小循环」

const KEY = process.env.GLM_API_KEY;
if (!KEY) {
  console.error('没读到 GLM_API_KEY —— 检查 .env 文件在不在、里面有没有这一行');
  process.exit(1);
}
console.log('key 已就位(当然,不会打印它)。下一步:非流式最小循环。');
