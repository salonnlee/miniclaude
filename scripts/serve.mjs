// 课程表静态服务器:跑在仓库根目录,COURSE.html 及其相对路径引用全部照常工作
// npm run course → http://127.0.0.1:8080
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    // 防目录穿越 + 防泄密:WHATWG URL 会把 /../.env 归一化成 /.env,
    // 所以先在原始 path 上拦 ..,再校验最终路径仍在仓库根内
    const rawPath = decodeURIComponent(url.pathname);
    const segments = rawPath.split('/').filter(Boolean);
    if (segments.includes('..') || segments.some((s) => s.startsWith('.'))) {
      res.writeHead(403).end('forbidden');
      return;
    }
    const file = normalize(join(ROOT, rawPath));
    if (!file.startsWith(ROOT + '/')) {
      res.writeHead(403).end('forbidden');
      return;
    }
    let path = file;
    if (rawPath.endsWith('/')) path = join(file, 'index.html');
    const body = await readFile(path); // 不存在则抛错进 catch
    res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(PORT, () => {
  console.log(`课程表已开张:http://127.0.0.1:${PORT}/COURSE.html`);
});
