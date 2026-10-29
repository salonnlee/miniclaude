// 工具注册表出口 —— 单一事实源住在 site/mc/tools.js(v0.9 后定规):
// 那是一份裸 ESM、零平台依赖,浏览器与 Node 通吃。本文件只做 re-export,
// 让 src/ 侧的 import 路径保持习惯写法。加/改工具去那边,CLI 与网页分身同时生效。
// 例外:平台专属工具住 Node 侧(fs.ts 文件三件 / bash.ts 命令一件),import 之后
// push 进 TOOLS——浏览器端 import 同一个 TOOLS 时不会经过这里,看不见,各长各的胳膊。
// bash 的确认流也在这挂:permissions 判 ask 的命令走 readline 问用户
// (y 允许/n 拒绝/a 本会话总是允许),chat.ts 对此零感知、一行不用改。
export { TOOLS, runTool, validate, getTodos, setToolInterceptor } from '../../site/mc/tools.js';
export { setConfirm } from './bash.ts';
export { setAskOnce } from './agents.ts';
export { registerMcpTools, getMcpStatus } from './mcp.ts';
import { registerFsTools } from './fs.ts';
import { registerBashTools } from './bash.ts';
import { registerAgentTools } from './agents.ts';

registerFsTools();
registerBashTools();
registerAgentTools();
// MCP 外挂(v1.8)不在 import 时自动接:拉子进程要 await(list 问完才有名片),
// 由 chat.ts 启动时显式 await registerMcpTools()——外挂是配置说了算,不是代码说了算
// 子代理/工作流(v1.3)住 agents.ts:execute 里再开一个 agent 循环,
// 「问一轮模型」的腿由 chat.ts 以 setAskOnce 注入(它才有 key 与记账)。
// 确认钩子(ask 档弹 y/n/a)由 chat.ts 挂——必须复用它自己那个 readline:
// 两个 readline 实例抢同一个 stdin 会互吞输入行,全进程只能有一个 stdin 读者。

