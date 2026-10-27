// 课程表服务器(Hono):静态根 site/,/ 直达 COURSE.html
// npm run course → http://127.0.0.1:8080
import { exec } from 'node:child_process';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';

try { process.loadEnvFile(); } catch {} // .env 有就读(没配 key 也能起服务看课)

const PORT = Number(process.env.PORT) || 8080;

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

// 流式代理:浏览器 → 这里 → 智谱,key 只住服务端,永远不进前端代码
app.post('/api/chat', async (c) => {
  const key = process.env.GLM_API_KEY;
  if (!key) return c.json({ error: '服务器没读到 GLM_API_KEY(项目根 .env 配一下)' }, 500);
  const { messages } = await c.req.json();
  const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'glm-4.6', messages, max_tokens: 4096, stream: true }),
  });
  if (!res.ok || !res.body) return c.text(await res.text(), res.status || 502);
  return new Response(res.body, { // 上游 SSE 原样透传,别攒——攒了就不是流式了
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
});

app.get('/', serveStatic({ path: './site/COURSE.html' }));
app.use('*', serveStatic({ root: './site' }));

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
