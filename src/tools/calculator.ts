import type { Tool } from './types.ts';

// 安全求值器:eval 认的是「任意 JavaScript」,这里只认数字、+-*/()、空白。
// 两步:tokenizer 切块(不认识的字符当场报错)→ 递归下降按文法算。
// 恶意输入不是「被拦下」,是在这套文法里根本无法表达
function evaluate(src: string): number {
  const tokens: (number | string)[] = [];
  for (let i = 0; i < src.length;) {
    const c = src[i];
    if (c === ' ') { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const n = Number(src.slice(i, j));
      if (Number.isNaN(n)) throw new Error(`数字不合法:${src.slice(i, j)}`); // 如 1.2.3
      tokens.push(n); i = j; continue;
    }
    if ('+-*/()'.includes(c)) { tokens.push(c); i++; continue; }
    throw new Error(`不认识的字符:「${c}」`); // 字母、分号、等号……eval 的嘴在这里缝死
  }
  let p = 0;
  const peek = () => tokens[p] as string | number | undefined;
  const eat = () => tokens[p++];
  // 文法(乘加优先级就藏在层数里):expr → term (+- term)* ; term → factor (*/ factor)* ; factor → 数字 | (expr) | -factor
  const expr = (): number => {
    let v = term();
    while (peek() === '+' || peek() === '-') { const op = eat(); v = op === '+' ? v + term() : v - term(); }
    return v;
  };
  const term = (): number => {
    let v = factor();
    while (peek() === '*' || peek() === '/') { const op = eat(); v = op === '*' ? v * factor() : v / factor(); }
    return v;
  };
  const factor = (): number => {
    const t = eat();
    if (t === undefined) throw new Error('算式提前结束');
    if (t === '(') { const v = expr(); if (eat() !== ')') throw new Error('括号没配对'); return v; }
    if (t === '-') return -factor(); // 负号按「取反」处理,所以 3*-2 也认
    if (typeof t === 'number') return t;
    throw new Error(`不该出现「${t}」`);
  };
  const v = expr();
  if (p !== tokens.length) throw new Error(`多余的「${tokens[p]}」`); // 如 1+2 3
  return v;
}

export const calculator: Tool = {
  name: 'calculator',
  description: '四则计算器，需要精确计算时使用',
  parameters: {
    type: 'object',
    properties: { expr: { type: 'string', description: '算式，如 2+3*4' } },
    required: ['expr'],
  },
  async execute(args) {
    return `${args.expr} = ${evaluate(String(args.expr))}`;
  },
};
