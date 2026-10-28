// 课程表服务器(Hono):静态根 site/,/ 直达 COURSE.html
// npm run course → http://127.0.0.1:8080
import { exec } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { connect } from 'node:net';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';

try { process.loadEnvFile(); } catch {} // .env 有就读(没配 key 也能起服务看课)

const PORT = Number(process.env.PORT) || 8080;

// 端口占用检查:能连通就说明有人占着,问一句要不要杀
const portBusy = (port) =>
  new Promise((resolve) => {
    const sock = connect(port, '127.0.0.1');
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('error', () => resolve(false));
  });

if (await portBusy(PORT)) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ans = (await rl.question(`端口 ${PORT} 已被占用,杀掉占用进程并重启?(y/N) `)).trim().toLowerCase();
  rl.close();
  if (ans === 'y' || ans === 'yes') {
    await new Promise((resolve, reject) =>
      exec(`lsof -ti tcp:${PORT} | xargs kill -9`, (err) => (err ? reject(err) : resolve())));
    await new Promise((r) => setTimeout(r, 300)); // 等端口真正释放
  } else {
    console.log('那就不动了,退出。');
    process.exit(0);
  }
}

const app = new Hono();

// 守卫:拦目录穿越与点文件。必须在 serveStatic 之前——
// URL 解析层会把 /../.env 归一化成 /.env,归一化之后才校验就晚了(2026-10-27 实测踩过)
app.use('*', async (c, next) => {
  const seg = c.req.path.split('/').filter(Boolean);
  if (seg.includes('..') || seg.some((s) => s.startsWith('.'))) {
    return c.text('forbidden', 403);
  }
  return next();
});

// 流式代理:浏览器 → 这里 → 智谱,key 只住服务端,永远不进前端代码。
// tools 字段(v0.9)只透传不执行——那是浏览器端注册表的说明书,执行权在客户端
app.post('/api/chat', async (c) => {
  const key = process.env.GLM_API_KEY;
  if (!key) return c.json({ error: '服务器没读到 GLM_API_KEY(项目根 .env 配一下)' }, 500);
  const { messages, tools } = await c.req.json();
  const body = { model: 'glm-4.6', messages, max_tokens: 4096, stream: true };
  if (Array.isArray(tools) && tools.length) body.tools = tools;
  const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) return c.text(await res.text(), res.status || 502);
  return new Response(res.body, { // 上游 SSE 原样透传,别攒——攒了就不是流式了
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
});

// 静态资源一律禁缓存:浏览器会把旧 labs.css/lab-chat.js 钉在缓存里,
// URL 上的 ?b= 只破得了 HTML 自己、破不了 import 的模块和 <link> 的 CSS,改完刷新「看着没变」(2026-10-27 实测踩过)
const noStore = (_path, c) => c.header('Cache-Control', 'no-store');
app.get('/', serveStatic({ path: './site/COURSE.html', onFound: noStore }));
app.use('*', serveStatic({ root: './site', onFound: noStore }));

// 自动开浏览器(NO_OPEN=1 跳过,端口被占等场景用)
const openBrowser = (url) => {
  if (process.env.NO_OPEN === '1') return;
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${cmd} ${url}`);
};

serve({ fetch: app.fetch, port: PORT }, () => {
  const url = `http://127.0.0.1:${PORT}/`;
  console.log(`课程表已开张:${url}`);
  openBrowser(url);
});
