// 工具注册表出口 —— 单一事实源住在 site/mc/tools.js(v0.9 后定规):
// 那是一份裸 ESM、零平台依赖,浏览器与 Node 通吃。本文件只做 re-export,
// 让 src/ 侧的 import 路径保持习惯写法。加/改工具去那边,CLI 与网页分身同时生效。
// 例外:平台专属工具住 Node 侧(fs.ts 文件三件),import 之后 push 进 TOOLS——
// 浏览器端 import 同一个 TOOLS 时不会经过这里,所以看不见这三件,各长各的胳膊。
export { TOOLS, runTool, validate } from '../../site/mc/tools.js';
import { registerFsTools } from './fs.ts';
registerFsTools();
