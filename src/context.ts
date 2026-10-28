// v1.2 · 上下文管理器 —— system prompt 拼装 + CLAUDE.md 项目记忆 + 自动压缩(compaction)
// 消息的形状也搬来这里:上下文的账本,记账的笔就该和账本住一处。
import { existsSync, readFileSync } from 'node:fs';

export type ToolCall = { id: string; name: string; args: string };
export type ApiToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } };
export type Msg =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string; tool_calls?: ApiToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

// ---- system prompt 拼装 ------------------------------------------------
// 铁律:整个会话一字不改——前缀缓存从第一个字开始匹配,改一个字、后面全作废。
// 所以环境信息取「会话启动那一刻」的快照定格,绝不能每轮现取。
const PERSONA = '你是小c,简洁直接的中文助手。';

// CLAUDE.md = 跨会话记忆:messages 进程一退就没了,规矩得住文件里(启动读一次,整会话不变)
function readProjectMemory(): string {
  if (!existsSync('CLAUDE.md')) return '';
  const md = readFileSync('CLAUDE.md', 'utf8').trim();
  return md ? `\n\n# 项目记忆(来自 CLAUDE.md)\n${md}` : '';
}

export function buildSystemPrompt(): string {
  const env = `# 环境\n工作目录:${process.cwd()}\n会话始于:${new Date().toLocaleString('zh-CN')}`;
  return `${PERSONA}\n\n${env}${readProjectMemory()}`;
}

// ---- 压缩器 -------------------------------------------------------------
// 水位:最近一次请求的 prompt token 超过它就压(可用环境变量调低,低水位验收用)
export const COMPACT_AT = Number(process.env.COMPACT_AT) || 80_000;
export function shouldCompact(lastPromptTokens: number): boolean {
  return lastPromptTokens > COMPACT_AT;
}

// 压缩提示词 = 分寸感本身:丢什么、留什么全在这段话里,想调就在自己代码里调
// (真实 Claude Code 这段话内置在产品里、改不了;自己造轮子的红利就是它摊在桌面上)
export const COMPACT_PROMPT = `请把以上对话压缩成一段摘要,供后续对话继续使用。必须保留:
1. 用户提过的重要约束与偏好
2. 关键决策、改过或建过的文件、执行过的命令及其结果
3. 还没做完的事
丢弃:已解决且不再相关的报错、重复的工具输出、寒暄。
直接输出摘要正文,不要开场白。`;

// 把老历史换成一条摘要 + 保留尾部最近 keep 条原文。
// askPlain 由 chat.ts 注入(它才有 key 与 fetch),这里不碰网络细节。
export async function compactHistory(
  messages: Msg[],
  askPlain: (msgs: Msg[]) => Promise<string>,
  keep = 8,
): Promise<boolean> {
  // 尾部先粗切 keep 条,再推进到非 tool 边界——tool 消息离了它绑定的 assistant 记录就不合法
  let cut = Math.max(1, messages.length - keep);
  while (cut < messages.length && messages[cut].role === 'tool') cut++;
  if (cut <= 1) return false; // 老历史不到一条,没什么可压
  const summary = (await askPlain([...messages.slice(0, cut), { role: 'user', content: COMPACT_PROMPT }])).trim();
  if (!summary) return false; // 摘要没拿到,宁可不压也不能清空记忆
  const kept = messages.slice(cut);
  messages.length = 1; // system 不动:人设与项目记忆是永久前缀
  messages.push({ role: 'user', content: `[之前对话的摘要]\n${summary}` }, ...kept);
  return true;
}
