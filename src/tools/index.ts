// 统一注册表 —— 工具柜的唯一出口:加工具 = 加一个文件 + 这里添一行,
// chat.ts 主循环零改动(Claude Code 上百个工具背后就是这么一张表)
import { calculator } from './calculator.ts';
import { getTime } from './get_time.ts';
import type { Tool } from './types.ts';

export const TOOLS: Tool[] = [getTime, calculator];
