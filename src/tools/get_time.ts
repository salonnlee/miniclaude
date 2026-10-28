import type { Tool } from './types.ts';

export const getTime: Tool = {
  name: 'get_time',
  description: '获取当前时间。凡涉及「现在几点/今天日期」的问题必须调用。',
  parameters: { type: 'object', properties: {} },
  async execute() {
    return new Date().toLocaleString('zh-CN');
  },
};
