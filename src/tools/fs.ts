// fs.ts —— 文件读写三件(Node 侧专属,CH5)
// ----------------------------------------------------------------------------
// 为什么不住 site/mc/tools.js:浏览器碰不了文件系统,平台事实。
// 底座(get_time/calculator)两端共享,这三件只有 CLI 有——
// 注册方式 = import TOOLS 后 push,runTool 遍历的是数组本身,照常认。
// 三条铁律全在里面:截断(防上下文炸弹)、二进制检测(乱码 token 一个不花)、
// Edit 用精确字符串替换(行号会过期,文件内容不会说谎)。

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { TOOLS } from '../../site/mc/tools.js';

const MAX_LINES = 2000; // 读文件默认上限——超了说明该搜索,不该通读

// 门口第一道:路径钉死在项目根之内,../ 溜出去的一律拒绝(CH5 先立此存照,CH6 讲透)
function safePath(p: string): string {
  const root = process.cwd();
  const abs = path.resolve(root, p);
  if (abs !== root && !abs.startsWith(root + path.sep)) throw new Error(`路径越界:${p}(只许碰 ${root} 之内)`);
  return abs;
}

// 二进制检测:文件头魔数(PNG 的 \x89PNG、gzip 的 \x1f\x8b…)或任意 \0 字节
function isBinary(buf: Buffer): boolean {
  const head = buf.subarray(0, 4).toString('latin1');
  if (head.startsWith('\x89PNG') || head.startsWith('GIF8') || head.startsWith('%PDF')) return true;
  return buf.includes(0);
}

const readFileTool = {
  name: 'read_file',
  description: '读取文本文件,返回带行号的全文。默认最多 2000 行;path 相对项目根。',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: '文件路径,如 src/chat.ts' },
      offset: { type: 'number', description: '从第几行开始(1 起,可选)' },
      limit: { type: 'number', description: '最多读几行(可选,默认 2000)' },
    },
    required: ['path'],
  },
  async execute(args: { path: string; offset?: number; limit?: number }) {
    const abs = safePath(args.path);
    const buf = await fs.readFile(abs).catch((e: NodeJS.ErrnoException) => {
      throw new Error(`读不到 ${args.path}:${e.code === 'ENOENT' ? '文件不存在' : e.message}`);
    });
    if (isBinary(buf)) return `二进制文件(${buf.length} 字节),拒绝阅读——看不了也改不了`;
    const lines = buf.toString('utf8').split('\n');
    const offset = Math.max(1, args.offset ?? 1);
    const limit = Math.min(args.limit ?? MAX_LINES, MAX_LINES);
    const picked = lines.slice(offset - 1, offset - 1 + limit);
    if (!picked.length) return `第 ${offset} 行起没有内容,全文共 ${lines.length} 行`;
    const body = picked.map((l, i) => `${offset + i}→ ${l}`).join('\n');
    const more = offset - 1 + limit < lines.length ? `\n(还有 ${lines.length - (offset - 1 + limit)} 行没读)` : '';
    return `${args.path} 第 ${offset}–${offset - 1 + picked.length} 行 / 共 ${lines.length} 行\n${body}${more}`;
  },
};

const writeFileTool = {
  name: 'write_file',
  description: '创建或整体覆盖一个文本文件(改局部用 edit_file)。父目录不存在会自动建。',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: '文件路径,相对项目根' },
      content: { type: 'string', description: '完整文件内容' },
    },
    required: ['path', 'content'],
  },
  async execute(args: { path: string; content: string }) {
    const abs = safePath(args.path);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, args.content, 'utf8');
    const n = args.content.split('\n').length;
    return `已写入 ${args.path}(${n} 行,${Buffer.byteLength(args.content)} 字节)`;
  },
};

const editFileTool = {
  name: 'edit_file',
  description: '精确字符串替换:在文件里找到 old_string 恰好一处,换成 new_string。不唯一就多带几行上下文;禁止用行号——行号会过期。',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: '文件路径,相对项目根' },
      old_string: { type: 'string', description: '要被替换的原文(必须与文件内容逐字一致)' },
      new_string: { type: 'string', description: '替换后的新文本(与 old_string 相同 = 删除)' },
    },
    required: ['path', 'old_string', 'new_string'],
  },
  async execute(args: { path: string; old_string: string; new_string: string }) {
    const abs = safePath(args.path);
    const src = await fs.readFile(abs, 'utf8').catch(() => {
      throw new Error(`读不到 ${args.path}:文件不存在`);
    });
    const first = src.indexOf(args.old_string);
    if (first === -1) {
      throw new Error(`old_string 在 ${args.path} 里没找到——文件可能已被改动,重新 read_file 对准原文再试`);
    }
    if (src.indexOf(args.old_string, first + 1) !== -1) {
      throw new Error(`old_string 在 ${args.path} 里出现不止一处——多带几行上下文让它唯一`);
    }
    await fs.writeFile(abs, src.slice(0, first) + args.new_string + src.slice(first + args.old_string.length), 'utf8');
    // diff 不用事后猜:精确替换天然知道改了哪几行。-/+ 前缀给终端上色用
    // (ui.toolCard 见前缀染色),模型也顺带看见自己改了什么——两头受益
    const lineNo = src.slice(0, first).split('\n').length;
    const mark = (ls: string[], sign: string) => (ls.length <= 8
      ? ls.map((l, i) => `${sign} ${lineNo + i}│ ${l}`)
      : [...ls.slice(0, 6).map((l, i) => `${sign} ${lineNo + i}│ ${l}`), `${sign} …(共 ${ls.length} 行)`]
    ).join('\n');
    const diff = [mark(args.old_string.split('\n'), '-'), mark(args.new_string.split('\n'), '+')].join('\n');
    return `已替换 ${args.path}:${lineNo} 的 1 处(${args.old_string.length} 字符 → ${args.new_string.length} 字符)\n${diff}`;
  },
};

// 动态注册:CLI 启动时 push 进共享注册表,浏览器端看不见这三件
export function registerFsTools() {
  for (const t of [readFileTool, writeFileTool, editFileTool]) {
    if (!TOOLS.some((x) => x.name === t.name)) TOOLS.push(t);
  }
}
