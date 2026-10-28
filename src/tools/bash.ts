// bash.ts —— 命令执行工具(Node 侧专属,CH6)
// ----------------------------------------------------------------------------
// agent 最危险的一件:文件工具碰字节,这件碰整台机器。所以和 fs.ts 不同,
// 它的 execute 里先过 permissions 三扇门(deny/ask/allow),ask 的命令必须
// 用户亲眼看到、亲口点头——钩子由 index.ts 挂(readline),chat.ts 零感知。
// 工程三坑的解法全在内:超时强杀(默认 120s,可调 1s–120s)、输出截断(30KB,
// 超了提示重定向到文件再 read_file——CH5 的经济学在这章复用)、退出码如实报。
// 后台任务(不杀、记 PID、回头查)留 CH8 终端手感,这章不贪。

import { spawn } from 'node:child_process';
import { TOOLS } from '../../site/mc/tools.js';
import { decide, rememberAllow } from './permissions.ts';

const MAX_OUT = 30 * 1024; // 输出上限:30KB,超了就是上下文炸弹
const DEFAULT_TIMEOUT = 120_000;

// 确认钩子:ask 档的命令走这里问用户,返回 'y'(允许)/'n'(拒绝)/'a'(本会话总是允许)
let confirm: ((cmd: string) => Promise<'y' | 'n' | 'a'>) | null = null;
export function setConfirm(fn: (cmd: string) => Promise<'y' | 'n' | 'a'>) {
  confirm = fn;
}

function runShell(cmd: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn('bash', ['-c', cmd], { cwd: process.cwd() });
    let out = '';
    let overflow = false;
    const take = (d: Buffer) => {
      if (out.length >= MAX_OUT) { overflow = true; return; } // 超了就丢弃,不无限攒
      out += d.toString('utf8');
      if (out.length > MAX_OUT) { out = out.slice(0, MAX_OUT); overflow = true; }
    };
    child.stdout.on('data', take);
    child.stderr.on('data', take); // stderr 也是线索,合流一起报
    let killed = false;
    const timer = setTimeout(() => { killed = true; child.kill('SIGKILL'); }, timeoutMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      const head = `退出码 ${killed ? `${code}·超时 ${timeoutMs / 1000}s 已强杀` : code}`;
      const tail = overflow ? `\n(输出超 ${MAX_OUT / 1024}KB 已截断——想看全文:命令加重定向进文件,再 read_file)` : '';
      resolve(`${head}\n${out || '(无输出)'}${tail}`);
    });
  });
}

const bashTool = {
  name: 'bash',
  description:
    '执行一条 shell 命令并返回输出(含退出码)。只读命令(git status/ls 等)免确认;' +
    '其余会弹确认等用户点头;改系统级状态的命令优先想有没有更安全的替代。长任务注意 120s 超时。',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string', description: '要执行的完整命令' },
      timeout_ms: { type: 'number', description: '超时毫秒数(可选,默认 120000,上限 120000)' },
    },
    required: ['command'],
  },
  async execute(args: { command: string; timeout_ms?: number }) {
    const cmd = args.command;
    const gate = decide(cmd);
    if (gate.action === 'deny') {
      return `已拒绝执行(安全黑名单:${gate.rule})。这条不改商量——换一条不碰系统的路子,或把要做的事拆成文件操作`;
    }
    if (gate.action === 'ask') {
      if (!confirm) return '需要用户确认但确认通道没挂上,默认拒绝';
      const ans = await confirm(cmd);
      if (ans === 'n') return '用户拒绝了这条命令。别原样重试——换思路,或向用户解释为什么需要它';
      if (ans === 'a') rememberAllow(cmd); // 本会话内逐字相同的这条免检
    }
    const timeout = Math.min(Math.max(args.timeout_ms ?? DEFAULT_TIMEOUT, 1000), DEFAULT_TIMEOUT);
    return runShell(cmd, timeout);
  },
};

// 动态注册:和 fs.ts 同款,push 进共享 TOOLS——浏览器端 import 底座时看不见这件
export function registerBashTools() {
  if (!TOOLS.some((x) => x.name === bashTool.name)) TOOLS.push(bashTool);
}
