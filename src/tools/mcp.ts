// mcp.ts —— mini MCP 宿主侧(v1.8,Node 专属,与 fs.ts 同款 push 注册)
// ----------------------------------------------------------------------------
// 读 .mcp.json 拉起 server 子进程,问一句 list 把名片拿回来——
// 名片原样 push 进 TOOLS(execute 搬了家,注册表看不出区别:
// 对模型、对 runTool,外挂工具与本地工具零区别),execute 则是
// 往子进程写一行 {method:'call'} 等一行回音。参数校验照旧在宿主这关:
// 说明书一份合同两头用,坏参数别浪费一趟跨进程。
// 为什么不住 site/mc/tools.js:child_process 是 Node 的事,浏览器端
// import TOOLS 时不会经过这里——网页分身看不见外挂,各长各的胳膊。

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { TOOLS, validate } from '../../site/mc/tools.js';

interface Card { name: string; description: string; parameters: object }
interface Pending { resolve: (v: unknown) => void; reject: (e: Error) => void }

const STATUS: { server: string; tools: string[] }[] = [];
export function getMcpStatus() { return STATUS.slice(); }

export async function registerMcpTools(): Promise<void> {
  let cfg: { mcpServers?: Record<string, { command: string; args?: string[] }> };
  try {
    cfg = JSON.parse(readFileSync('.mcp.json', 'utf8'));
  } catch {
    return; // 没配置就不接,一个不报——MCP 是外挂不是器官
  }
  for (const [name, srv] of Object.entries(cfg.mcpServers ?? {})) {
    // stdio 三管道:stdin/stdout 走协议,stderr 直接透给终端(server 崩了看得见)
    const child = spawn(srv.command, srv.args ?? [], { stdio: ['pipe', 'pipe', 'inherit'] });
    const pending = new Map<number, Pending>();
    let nextId = 1;
    let buf = '';
    child.stdout.on('data', (d: Buffer) => {
      buf += d.toString();
      for (let nl = buf.indexOf('\n'); nl !== -1; nl = buf.indexOf('\n')) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        const res = JSON.parse(line) as { id: number; result?: unknown; error?: string };
        const p = pending.get(res.id);
        if (!p) continue;
        pending.delete(res.id);
        res.error === undefined ? p.resolve(res.result) : p.reject(new Error(res.error));
      }
    });
    const send = (method: 'list' | 'call', params: object): Promise<unknown> =>
      new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        child.stdin.write(JSON.stringify({ id, method, params }) + '\n');
      });

    const cards = (await send('list', {})) as Card[];
    for (const card of cards) {
      TOOLS.push({
        ...card,
        async execute(args: Record<string, unknown>) {
          const errs = validate(args, card.parameters);
          if (errs.length) return `参数校验不过:${errs.join(';')}`;
          try {
            const r = await send('call', { name: card.name, args });
            return typeof r === 'string' ? r : JSON.stringify(r);
          } catch (e) {
            return `MCP 出错(${name} server):${e instanceof Error ? e.message : e}`; // 错误当结果喂回,老规矩
          }
        },
      });
    }
    STATUS.push({ server: name, tools: cards.map((c) => c.name) });
  }
}
