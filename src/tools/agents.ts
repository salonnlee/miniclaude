// agents.ts —— 子代理与工作流(Node 侧专属,第二幕附加章 v1.3)
// ----------------------------------------------------------------------------
// 工具柜里唯一一件「execute 里再开一个 agent 循环」的工具。别的工具执行的是
// 普通函数(读文件、跑命令),这两件的 execute 里再起一套 while:自己的
// messages、自己的工具柜、循环到不再要工具——循环里再开循环。
// 对主对话的模型来说它们毫无特殊:吐一段 {name, arguments} 申请,收回一段
// 结果文本。全景图把 workflow/subagent 画在⑤执行环节进门,画的就是这个。
//
// 子代理买的是上下文隔离:中间过程(读了哪些文件、想过什么)全留在子会话,
// 只有最后一段结论回主对话——脏活不塞爆主上下文。
// 工作流买的是控制流:步骤计划写死在调用参数里,按序派兵、上一步产出传
// 下一步——谁来派、什么时候派由代码说了算,不劳主对话一轮轮盯。

import { TOOLS, runTool } from '../../site/mc/tools.js';
import type { Msg, ToolCall } from '../context.ts';

// 子代理的工具柜:只读三件。干活够用、闯祸没门——没有 bash/edit_file,
// 也没有 agent 自己:孩子不能再生孩子,嵌套一层封顶
const SUB_TOOLS = ['get_time', 'calculator', 'read_file'];

// 「问一轮模型」的腿:chat.ts 注入(它才有 key、流式解析与记账),
// 与 bash.ts 的 setConfirm 同款钩子——本文件不碰网络
let askOnce: ((msgs: Msg[], allow: string[]) => Promise<{ text: string; toolCalls: ToolCall[] }>) | null = null;
export function setAskOnce(fn: (msgs: Msg[], allow: string[]) => Promise<{ text: string; toolCalls: ToolCall[] }>) {
  askOnce = fn;
}

// 子代理:自己的 messages 从零攒起,主循环的袖珍版——出口同样看
// 「这一轮没有 tool_calls」,只是跑完只带最后一段话回家
export async function runSubagent(goal: string): Promise<string> {
  if (!askOnce) return '子代理没腿:askOnce 未挂上';
  const msgs: Msg[] = [
    { role: 'system', content: '你是被派出的子代理,独立完成一项自包含的小任务。只干交代的事,结论一段话交回,不要寒暄。' },
    { role: 'user', content: goal },
  ];
  console.log(`\n  🤖 子代理开工:${goal.split('\n')[0].slice(0, 30)}…`);
  while (true) {
    const { text, toolCalls } = await askOnce(msgs, SUB_TOOLS);
    if (toolCalls.length === 0) return text; // 只要结论:中间过程全部丢弃,这就是上下文隔离
    msgs.push({
      role: 'assistant',
      content: text,
      tool_calls: toolCalls.map(c => ({
        id: c.id, type: 'function' as const,
        function: { name: c.name, arguments: c.args },
      })),
    });
    for (const c of toolCalls) {
      const { res } = await runTool({ name: c.name, args: c.args }); // 注册表的统一执行口,四道兜底一样不少
      msgs.push({ role: 'tool', tool_call_id: c.id, content: res });
      console.log(`    🔧 ${c.name}(${c.args})`);
    }
  }
}

// 工作流:一份写死的步骤计划,按序派子代理,上一步产出传给下一步。
// for 循环与传参在代码手里、不在模型手里——这是它与「让模型临场一步步调
// agent 工具」的根本差别:计划是参数,执行是宿主
export async function runWorkflow(steps: string[]): Promise<string> {
  let carry = '';
  for (let i = 0; i < steps.length; i++) {
    console.log(`\n  🧩 工作流 第 ${i + 1}/${steps.length} 步`);
    const back = i ? `\n\n(上一步的产出,接着用)\n${carry}` : '';
    carry = await runSubagent(`${steps[i]}${back}`);
  }
  return carry;
}

const agentTool = {
  name: 'agent',
  description:
    '派出一个子代理独立完成一项自包含的子任务(如搜索多个文件、梳理某块代码)。' +
    '它有自己的上下文,干完只交回一段结论,中间过程不占主对话——适合量大、要看细节的杂活',
  parameters: {
    type: 'object',
    properties: {
      goal: { type: 'string', description: '交给子代理的任务,必须自包含(它看不到你们的对话)' },
    },
    required: ['goal'],
  },
  async execute(args: { goal: string }) {
    return runSubagent(args.goal);
  },
};

const workflowTool = {
  name: 'workflow',
  description:
    '按一份写死的步骤计划依次派子代理:步骤按序执行,上一步产出自动传给下一步,只交回最后一步的结论。' +
    '适合结构固定的多步任务;需要临场判断的活用 agent 单派',
  parameters: {
    type: 'object',
    properties: {
      steps: { type: 'array', items: { type: 'string' }, description: '依次执行的步骤,每步一段自包含的任务描述' },
    },
    required: ['steps'],
  },
  async execute(args: { steps: string[] }) {
    if (!Array.isArray(args.steps) || !args.steps.length) return 'steps 要是非空数组';
    return runWorkflow(args.steps.map(String));
  },
};

// 动态注册:与 fs.ts/bash.ts 同款,push 进共享 TOOLS——浏览器端看不见这两件
export function registerAgentTools() {
  for (const t of [agentTool, workflowTool]) {
    if (!TOOLS.some((x) => x.name === t.name)) TOOLS.push(t);
  }
}
