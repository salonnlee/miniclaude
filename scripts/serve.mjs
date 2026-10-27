// 课程表服务器(Hono):静态根 site/,/ 直达 COURSE.html
// npm run course → http://127.0.0.1:8080
// 后续 API 路由(如 CH2 流式代理)从这里挂:app.get('/api/...', ...)
import { exec } from 'node:child_process';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';

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
