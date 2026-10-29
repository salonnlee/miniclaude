// permissions.ts —— 安全闸门:deny / ask / allow 三扇门(CH6)
// ----------------------------------------------------------------------------
// 教条先立:提示词不是安全边界——模型会被文件里埋的话骗(prompt injection),
// 所以闸门必须长在 execute 这一层:确定性的代码,模型够不着、改不了。
// 规则形状三种(和真 Claude Code 的 Bash(git status:*) 同款语义):
//   'git status'   精确匹配,只放这一条
//   'git status:*' 前缀匹配——整词边界:'git status'/'git status --short' 放,
//                  'git statusx' 不放;'git:*' 能吞 git push,粒度要到子命令
//   '*| sh*'       包含匹配——管道进 shell 这类埋在句子中间的坏东西
// 判定顺序:先 deny 后 allow,全不中 → ask(用户点头才算)。
// v1.9 名单不再只住在代码里:config.ts 合并的用户级/项目级 deny/allow 追加在
// 内置名单后面——内置是底线(配置清不掉),配置往上加码(自己放行自己的 git push)。

import { config } from '../config.ts';

export type Decision = { action: 'allow' | 'deny' | 'ask'; rule?: string };

// 默认 deny:不改名单就拦——管道进 shell(远程代码执行)、灭门级 rm。
// 'rm -rf /' 用包含匹配:绝对路径任意深(/Users/x、/etc 全算),宁拦错不放过
const DENY = [
  '*| sh*', '*|sh*', '*| bash*', '*|bash*', '*| zsh*', '*|zsh*',
  '*rm -rf /*', 'rm -rf ~:*', '*rm -rf ~*',
];

// 默认 allow:纯只读——每问一次 y 都是体验税,白名单免检
const ALLOW = [
  'git status:*', 'git diff:*', 'git log:*',
  'ls:*', 'pwd', 'node --version', 'git status',
];

// 运行时白名单:「本会话总是允许」往这记(只记整条命令,不自动放宽前缀——
// 用户点头的是这一条,不是它的全家)
const sessionAllow: string[] = [];

function match(cmd: string, pattern: string): boolean {
  if (pattern.startsWith('*') && pattern.endsWith('*')) return cmd.includes(pattern.slice(1, -1));
  if (pattern.endsWith(':*')) {
    const base = pattern.slice(0, -2); // 整词边界:base 或 base+空格开头,防 statusx 混进 status
    return cmd === base || cmd.startsWith(base + ' ');
  }
  return cmd === pattern;
}

export function decide(cmd: string): Decision {
  const c = cmd.trim();
  const deny = [...DENY, ...config.permissions.deny];
  const allow = [...sessionAllow, ...ALLOW, ...config.permissions.allow];
  for (const p of deny) if (match(c, p)) return { action: 'deny', rule: p };
  for (const p of allow) if (match(c, p)) return { action: 'allow', rule: p };
  return { action: 'ask' };
}

// 「本会话总是允许」的落点:只放行逐字相同的那条
export function rememberAllow(cmd: string) {
  if (!sessionAllow.includes(cmd)) sessionAllow.push(cmd);
}
