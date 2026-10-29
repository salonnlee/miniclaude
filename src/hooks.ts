// v1.9 · hooks —— 工具调用前后的用户钩子(真 Claude Code 的 PreToolUse/PostToolUse 同款思想)
// ----------------------------------------------------------------------------
// 钩子是普通 shell 命令,配置说了算(config.hooks);宿主把现场用环境变量递过去:
// MC_TOOL(工具名)/ MC_ARGS(参数 JSON)/ MC_RESULT(结果,仅 postToolUse 有)。
// 判定学真 CC:exit 0 放行;exit 2 = 拦,stdout 末行当理由;其他非零 = 钩子自己
// 出错,不拦(钩子崩了不能连累工具),黄牌亮一句。
// 与 CH6 闸门分层:闸门住在 bash 工具的 execute 里,只管「命令」这一类;钩子挂在
// 共享 runTool 执行口,所有工具(含子代理要的、含 MCP 外挂的)都过这道——
// 「保护 .env 不被 write_file 碰」这种事闸门帮不上忙,钩子可以。

import { spawnSync } from 'node:child_process';
import { config } from './config.ts';

export type HookEvent = 'preToolUse' | 'postToolUse';

// pre 的 blocked = 这一次调用不执行,理由当结果喂回模型(它看着改);
// post 的 blocked 只剩黄牌的意义——执行已经发生,拦的是「下一次」
export function runHooks(event: HookEvent, tool: string, args: unknown, result = ''): { blocked?: string; warn?: string } {
  for (const cmd of config.hooks[event]) {
    const r = spawnSync('bash', ['-c', cmd], {
      env: { ...process.env, MC_TOOL: tool, MC_ARGS: JSON.stringify(args), MC_RESULT: result.slice(0, 8192) }, // read_file 一口气十几万字符,环境变量塞不下也没人看得了
      encoding: 'utf8',
      timeout: 10_000,
    });
    if (r.status === 2) {
      const why = (r.stdout || '').trim().split('\n').pop() || '(钩子没给理由)';
      return { blocked: `钩子拦下了 ${tool}:${why}` };
    }
    if (r.status === null) return { warn: `钩子超时(>10s,${cmd.slice(0, 40)}…)——未拦截` };
    if (r.status !== 0) return { warn: `钩子自身出错(exit ${r.status}):${String(r.stderr).trim().split('\n').pop() ?? ''}——未拦截` };
  }
  return {};
}
