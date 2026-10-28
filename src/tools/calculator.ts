import type { Tool } from './types.ts';

export const calculator: Tool = {
  name: 'calculator',
  description: '四则计算器，需要精确计算时使用',
  parameters: {
    type: 'object',
    properties: { expr: { type: 'string', description: '算式，如 2+3*4' } },
    required: ['expr'],
  },
  async execute(args) {
    return `${args.expr} = ${eval(String(args.expr))}`; // 玩具版,求值安全第 4 章再谈
  },
};
