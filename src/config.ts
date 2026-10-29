// v1.9 · 配置层 —— 用户级 ~/.miniclaude.json + 项目级 .miniclaude.json,后者赢
// ----------------------------------------------------------------------------
// 玩具变产品的第一刀:写在代码里的常数(用哪个模型、哪些命令免检)搬进文件——
// 换模型不该改代码。两层语义:用户级跟着人走(这台机器的口味),项目级跟着
// 仓库走(这个项目要更严的名单)。合并规矩:标量一层层 ??(项目级覆盖),
// 数组一律拼接——内置安全底线不由配置清空,配置只能往上加码。
// 读不到/读坏了都当没有:配置是外挂不是器官,坏配置不该带崩对话。

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface MiniConfig {
  model: string;        // 主模型:agent 循环的嘴
  compactModel: string; // 压缩用的模型:总结老历史用不上旗舰脑力,可指便宜款
  fallback: string[];   // 降级链:主模型挂了(429/5xx/不存在)按序换人,链走完才认输
  permissions: { deny: string[]; allow: string[] }; // 追加进 CH6 三扇门(内置名单仍在)
  hooks: { preToolUse: string[]; postToolUse: string[] }; // shell 命令,exit 2 = 拦(hooks.ts)
}

const DEFAULTS = { model: 'glm-4.6', compactModel: 'glm-4.6', fallback: ['glm-4.5-air'] };

type FileCfg = Partial<Omit<MiniConfig, 'permissions' | 'hooks'>> & {
  permissions?: { deny?: string[]; allow?: string[] };
  hooks?: { preToolUse?: string[]; postToolUse?: string[] };
};

function load(p: string): FileCfg {
  if (!existsSync(p)) return {};
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return {}; }
}

const user = load(join(homedir(), '.miniclaude.json'));
const proj = load('.miniclaude.json');

// 启动读一次定格:整个会话同一份——配置换来换去会拆前缀缓存的台(CH7 红线)
export const config: MiniConfig = {
  model: proj.model ?? user.model ?? DEFAULTS.model,
  compactModel: proj.compactModel ?? user.compactModel ?? DEFAULTS.compactModel,
  fallback: [...(user.fallback ?? []), ...(proj.fallback ?? [])],
  permissions: {
    deny: [...(user.permissions?.deny ?? []), ...(proj.permissions?.deny ?? [])],
    allow: [...(user.permissions?.allow ?? []), ...(proj.permissions?.allow ?? [])],
  },
  hooks: {
    preToolUse: [...(user.hooks?.preToolUse ?? []), ...(proj.hooks?.preToolUse ?? [])],
    postToolUse: [...(user.hooks?.postToolUse ?? []), ...(proj.hooks?.postToolUse ?? [])],
  },
};
