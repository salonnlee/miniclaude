// ui.ts —— 终端脸面(v1.4,CH8:内核不动换张脸)
// ----------------------------------------------------------------------------
// 为什么要有这个文件:chat.ts 从 v0.4 起的脸是根「水管」——console.log 只进
// 不出,提示符、流式正文、工具日志互相插队,想打断只能 Ctrl-C 杀整个进程。
// 终端其实是一块字符网格:ANSI 转义能让光标上移、整行擦掉、给字上色——
// 这就是换脸的全部底牌。真 Claude Code 用 Ink(React 渲染终端):状态一变
// 整帧重画,重画的心智负担交给框架。这里手搓同款思想的小轮子:
// 一行「状态行」钉在最新一行随事件重画;正文流完就地擦起重排。

import { emitKeypressEvents } from 'node:readline';

const E = '\x1b[';
const TTY = process.stdout.isTTY;

// 上色:管道里没有终端,转义码只会污染日志——非 TTY 一律原样返回
export const c = {
  dim: (s: string) => (TTY ? E + '2m' + s + E + '0m' : s),
  bold: (s: string) => (TTY ? E + '1m' + s + E + '0m' : s),
  red: (s: string) => (TTY ? E + '31m' + s + E + '0m' : s),
  green: (s: string) => (TTY ? E + '32m' + s + E + '0m' : s),
  yellow: (s: string) => (TTY ? E + '33m' + s + E + '0m' : s),
  cyan: (s: string) => (TTY ? E + '36m' + s + E + '0m' : s),
};

// ---- 行数计算:重排的命根子 ------------------------------------------------
// 终端按「格」换行,一个中文字占两格——按字符数数行会数少,数少一行,
// 重排就擦不干净,上一条消息缺一块。够用版的宽字符判定:
function wide(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0;
  return (
    (cp >= 0x1100 && cp <= 0x115f) || // 谚文
    (cp >= 0x2e80 && cp <= 0xa4cf) || // CJK 部首~彝文
    (cp >= 0xac00 && cp <= 0xd7a3) || // 谚文音节
    (cp >= 0xf900 && cp <= 0xfaff) || // CJK 兼容
    (cp >= 0xfe30 && cp <= 0xfe4f) ||
    (cp >= 0xff00 && cp <= 0xff60) || // 全角标点
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1faff) // emoji
  );
}
// 这段文字在 cols 格宽的终端里占几行(含自动折行)
export function textRows(s: string, cols: number): number {
  let rows = 1, col = 0;
  for (const ch of s) {
    if (ch === '\n') { rows++; col = 0; continue; }
    const w = wide(ch) ? 2 : 1;
    if (col + w > cols) { rows++; col = 0; } // 放不下就折行
    col += w;
  }
  return rows;
}

// ---- 状态行:钉在最新一行的一行字,随时整行重画 ----------------------------
// 竞态老窝:转圈的计时器和流式正文都想写终端。规矩只有一条——
// 谁先占住状态行,谁就被记在 statusText 里;别的输出要来,先让路再画回来
let spinTimer: ReturnType<typeof setInterval> | null = null;
let statusText = ''; // 当前状态行内容(空 = 没占用)
let streamed = ''; // 这段流式正文攒的原文(commit 按它算要擦几行)

function clearLine() { if (TTY) process.stdout.write(E + '2K\r'); }
function drawStatus() { if (TTY && statusText) process.stdout.write(E + '2K\r' + statusText); }
function stopSpin() { if (spinTimer) { clearInterval(spinTimer); spinTimer = null; } }

// 打一行「永久」内容:让开状态行,打完把状态行画回来
export function say(line: string) {
  stopSpin();
  clearLine();
  process.stdout.write(line + '\n');
  drawStatus();
}

// 转圈:「小c在想…」一秒十帧的小动画,第一个字到达就停
export function think(label: string) {
  if (!TTY) return;
  const frames = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';
  let i = 0;
  stopSpin();
  spinTimer = setInterval(() => {
    statusText = c.cyan(frames[i++ % frames.length]) + ' ' + label;
    drawStatus();
  }, 90);
}

// 静态状态行(工具运行中亮动作)
export function status(label: string) {
  stopSpin();
  statusText = label;
  drawStatus();
}

// 流式正文:原文直出,来一个词念一个词(不挑终端,管道里也照打)
export function stream(text: string) {
  if (spinTimer || statusText) { stopSpin(); clearLine(); statusText = ''; } // 接管状态行
  streamed += text;
  process.stdout.write(text);
}

// 两段式重排:流的时候裸文本(** 记号看得见),流完把这块擦掉、换成排版版
// 再写一遍——网页对话框 v0.6→v0.7 走过的同一条路,搬进终端。
// 擦几行必须按终端宽度算(见 textRows);滚出屏幕的部分擦不着——这正是
// Ink 要整帧管理布局的理由,我们一屏之内玩得起,超了就保留原文
export function commit(rendered: string) {
  const raw = streamed;
  streamed = '';
  statusText = '';
  stopSpin();
  if (!TTY) { if (raw) process.stdout.write('\n'); return; } // 管道擦不动,原文即正文
  if (!raw) { process.stdout.write(rendered + '\n'); return; }
  // 列宽行高可能报 0(pty 伪造终端的坑):0 就当 80×24 用
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;
  const used = textRows(raw, cols) - (raw.endsWith('\n') ? 1 : 0); // 视觉占用行数
  if (used >= rows - 2) { process.stdout.write('\n' + c.dim('(正文超出一屏,保留流式原文不重排)') + '\n'); return; }
  // 光标回到区域顶:结尾带换行,光标已在区域下一行;不带,光标还在最后一行
  const up = raw.endsWith('\n') ? used : used - 1;
  process.stdout.write((up > 0 ? E + up + 'A' : '') + E + 'J'); // 上移到顶,往下全清
  process.stdout.write(rendered + '\n');
}

// 收摊:状态行让位,光标回到干净行首(每回合结束必调)
export function end() {
  stopSpin();
  statusText = '';
  if (TTY) clearLine();
}

// ---- Esc 打断:raw 模式接管按键 --------------------------------------------
// 平时终端替你处理按键(行缓冲、Ctrl-C 发信号);raw 模式把一切都交给你——
// 连 Ctrl-C 都不再是信号,得自己伺候。Esc 的字节 \x1b 是方向键的前缀,
// 交给 readline 的 keypress 解析最稳:单发的 \x1b 才叫 escape
export function onEsc(cb: () => void): () => void {
  const stdin = process.stdin;
  if (!stdin.isTTY) return () => { }; // 管道没按键可接,空函数
  stdin.setRawMode(true);
  emitKeypressEvents(stdin);
  const onKey = (_ch: string, key?: { name?: string; ctrl?: boolean }) => {
    if (key?.name === 'escape') cb();
    if (key?.ctrl && key?.name === 'c') { restore(); process.stdout.write('\n'); process.exit(130); }
  };
  stdin.on('keypress', onKey);
  function restore() {
    stdin.off('keypress', onKey);
    stdin.setRawMode(false);
  }
  return restore;
}
// 进程退场要还终端:raw 忘了关,用户的终端就按什么都上屏
process.on('exit', () => {
  if (process.stdin.isTTY && process.stdin.isRaw) process.stdin.setRawMode(false);
});

// ---- 终端排版 markdown(迷你版) -------------------------------------------
// 覆盖模型最常吐的形态:标题/粗体/行内码/围栏码块/列表。表格原样保留——
// 终端里画表格是另一门手艺,不贪
export function md(src: string): string {
  const out: string[] = [];
  let fence = false;
  for (const line of src.split('\n')) {
    if (line.trimStart().startsWith('```')) {
      fence = !fence;
      out.push(fence ? c.dim('┌──') : c.dim('└──'));
      continue;
    }
    if (fence) { out.push(c.dim('│ ') + line); continue; }
    const h = line.match(/^#{1,6}\s+(.*)$/);
    if (h) { out.push(c.bold(c.cyan(h[1]))); continue; }
    const li = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (li) { out.push(li[1] + '• ' + inline(li[2])); continue; }
    out.push(inline(line));
  }
  return out.join('\n');
}
// 行内:链接只留文字;行内码先包走,防码里的 ** 被当粗体
function inline(line: string): string {
  const codes: string[] = [];
  let s = line.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  s = s.replace(/`([^`]+)`/g, (_, x: string) => '\x00' + String(codes.push(x) - 1) + '\x00');
  s = s.replace(/\*\*([^*]+)\*\*/g, (_, x: string) => c.bold(x));
  s = s.replace(/\x00(\d+)\x00/g, (_, i: string) => c.cyan(codes[+i]));
  return s;
}

// ---- 工具动作卡:⏺ 一行亮动作,结果压暗展示 ---------------------------------
// 结果行按前缀上色:+ 绿 − 红(edit_file 的 diff),其余压暗;超过 14 行折叠,
// 全文反正已进模型那边的 tool 消息
export function toolCard(name: string, args: string, result: string): string {
  const a = args.length > 60 ? args.slice(0, 60) + '…' : args;
  const lines = result.split('\n');
  const shown = lines.slice(0, 14);
  const body = shown.map((l) =>
    l.startsWith('+') ? c.green('  ' + l) :
    l.startsWith('-') ? c.red('  ' + l) :
    c.dim('  ' + l)
  ).join('\n');
  const more = lines.length > shown.length ? `\n  ${c.dim(`…(共 ${lines.length} 行,全文已进对话)`)}` : '';
  return `${c.cyan('⏺ ' + name)}${c.dim('(' + a + ')')}\n${body}${more}`;
}
