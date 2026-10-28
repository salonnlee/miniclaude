// 工具注册表出口 —— 单一事实源住在 site/mc/tools.js(v0.9 后定规):
// 那是一份裸 ESM、零平台依赖,浏览器与 Node 通吃。本文件只做 re-export,
// 让 src/ 侧的 import 路径保持习惯写法。加/改工具去那边,CLI 与网页分身同时生效。
export { TOOLS, runTool, validate } from '../../site/mc/tools.js';
