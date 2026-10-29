// bash.ts —— 命令执行工具(Node 侧专属,CH6;后台任务 CH8.2)
// ----------------------------------------------------------------------------
// agent 最危险的一件:文件工具碰字节,这件碰整台机器。所以和 fs.ts 不同,
// 它的 execute 里先过 permissions 三扇门(deny/ask/allow),ask 的命令必须
// 用户亲眼看到、亲口点头——钩子由 index.ts 挂(readline),chat.ts 零感知。
// 工程三坑的解法全在内:超时强杀(默认 120s,可调 1s–120s)、输出截断(30KB,
// 超了提示重定向到文件再 read_file——CH5 的经济学在这章复用)、退出码如实报。
// 前台护栏管的是「堵住对话」的风险;后台任务(v1.5)不堵对话,护栏换一副:
// 启动即回(PID 记账)、输出落盘(.bg/ 日志)、回头查(bash_check)——闸门照过。

import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { TOOLS } from '../../site/mc/tools.js';
import { decide, rememberAllow } from './permissions.ts';

const MAX_OUT = 30 * 1024; // 输出上限:30KB,超了就是上下文炸弹
const DEFAULT_TIMEOUT = 120_000;

// ---- 后台任务(v1.5) --------------------------------------------------------
// 记账是会话级的(住内存,宿主重启就没了);日志是持久的(.bg/ 文件,
// read_file 随时可读)。exit 事件除了记退出码,还顺手把僵尸进程收了——
// 不监听 exit,退出的孩子会挂成僵尸,kill(pid,0) 探活还探得「活着」
type Job = { pid: number; cmd: string; log: string; started: string; exited: string | null };
const JOBS: Job[] = [];
let bgSeq = 0;

function runBackground(cmd: string): string {
  fs.mkdirSync('.bg', { recursive: true });
  const log = path.join('.bg', `job${++bgSeq}.log`);
  const fd = fs.openSync(log, 'a'); // 日志文件先开好,孩子的 stdout/stderr 直接往里流
  const child = spawn('bash', ['-c', cmd], {
    cwd: process.cwd(),
    detached: true, // 新进程组+新会话:不吃宿主进程组的信号,宿主退了它也活着
    stdio: ['ignore', fd, fd], // stdin 不理;两头输出合流进同一个日志
  });
  fs.closeSync(fd); // 子进程持有自己的 fd 副本,这边关掉不漏
  const job: Job = { pid: child.pid!, cmd, log, started: new Date().toLocaleTimeString('zh-CN'), exited: null };
  JOBS.push(job);
  child.on('exit', (code, signal) => { job.exited = signal ? `被信号 ${signal} 终止` : `退出码 ${code ?? 0}`; });
  child.unref(); // 事件循环不再等它:宿主该退就退,孩子托孤给系统接着跑
  return `后台任务已启动:PID ${job.pid},日志 ${log}。用 bash_check 查进展;全量日志可用 read_file 读`;
}

function jobStatus(j: Job): string {
  if (j.exited) return j.exited;
  try { process.kill(j.pid, 0); return '运行中'; } // 0 信号只探活不真打
  catch { return '已退出(退出码没记到——事件循环那会儿不在)'; }
}

function tailLog(log: string, n: number): string {
  try {
    const lines = fs.readFileSync(log, 'utf8').split('\n');
    return lines.slice(-n).join('\n').trim() || '(日志还没有内容)';
  } catch {
    return '(日志文件读不到)';
  }
}
// ---- 后台任务收工 ----------------------------------------------------------

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
    '其余会弹确认等用户点头;改系统级状态的命令优先想有没有更安全的替代。前台长任务注意 120s 超时;' +
    '不打算等的活(监控/长构建/watcher)传 background:true 扔后台,立即返回 PID 与日志路径',
  parameters: {
    type: 'object',
    properties: {
      command: { type: 'string', description: '要执行的完整命令' },
      timeout_ms: { type: 'number', description: '超时毫秒数(可选,默认 120000,上限 120000;仅前台)' },
      background: { type: 'boolean', description: 'true = 后台执行:不等待、不超时,立即返回 PID 与日志路径,回头用 bash_check 查(可选)' },
    },
    required: ['command'],
  },
  async execute(args: { command: string; timeout_ms?: number; background?: boolean }) {
    const cmd = args.command;
    const gate = decide(cmd); // 闸门照过——后台不是法外之地,deny/ask/allow 同一套
    if (gate.action === 'deny') {
      return `已拒绝执行(安全黑名单:${gate.rule})。这条不改商量——换一条不碰系统的路子,或把要做的事拆成文件操作`;
    }
    if (gate.action === 'ask') {
      if (!confirm) return '需要用户确认但确认通道没挂上,默认拒绝';
      const ans = await confirm(cmd);
      if (ans === 'n') return '用户拒绝了这条命令。别原样重试——换思路,或向用户解释为什么需要它';
      if (ans === 'a') rememberAllow(cmd); // 本会话内逐字相同的这条免检
    }
    if (args.background) return runBackground(cmd); // 护栏换副:不堵对话,落盘+回头查
    const timeout = Math.min(Math.max(args.timeout_ms ?? DEFAULT_TIMEOUT, 1000), DEFAULT_TIMEOUT);
    return runShell(cmd, timeout);
  },
};

// 回头查:后台任务的另一半。不传 pid = 列出本会话全部;传 pid = 报这一个
const bashCheckTool = {
  name: 'bash_check',
  description:
    '查后台任务(bash background:true 启动的那些):不传 pid 列出本会话全部后台任务;' +
    '传 pid 报这一个的运行状态、退出码与日志尾部。全量日志在 .bg/ 目录,可用 read_file 读取',
  parameters: {
    type: 'object',
    properties: {
      pid: { type: 'number', description: '要查的后台任务 PID(可选;不传 = 列出全部)' },
      lines: { type: 'number', description: '日志尾部取几行(可选,默认 15)' },
    },
  },
  async execute(args: { pid?: number; lines?: number }) {
    if (args.pid === undefined) {
      if (!JOBS.length) return '本会话还没有后台任务(bash 传 background:true 启动)';
      return JOBS.map((j) => `PID ${j.pid} · ${jobStatus(j)} · ${j.started} 起 · ${j.cmd.slice(0, 50)} · 日志 ${j.log}`).join('\n');
    }
    const j = JOBS.find((x) => x.pid === args.pid);
    if (!j) return `没找到 PID ${args.pid} 的后台任务——记账是会话级的,宿主重启后只剩 .bg/ 里的日志文件`;
    const lines = Math.min(Math.max(args.lines ?? 15, 1), 100);
    return `PID ${j.pid} · ${jobStatus(j)} · ${j.started} 起\n命令:${j.cmd}\n日志尾部(${lines} 行):\n${tailLog(j.log, lines)}`;
  },
};

// 动态注册:和 fs.ts 同款,push 进共享 TOOLS——浏览器端 import 底座时看不见这两件
export function registerBashTools() {
  for (const t of [bashTool, bashCheckTool]) {
    if (!TOOLS.some((x) => x.name === t.name)) TOOLS.push(t);
  }
}
