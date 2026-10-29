/* mc/tools.js —— 工具柜 · 单一事实源(v0.9 后定规)
   ----------------------------------------------------------------------------
   全项目的工具只此一份:裸 ESM、零平台依赖(只用 Date 和纯计算),
   浏览器(mc.js)与 Node(src/tools/index.ts re-export 给 chat.ts)都 import 这里。
   教学演进改这一处,CLI 与网页分身同时生效——不是约定,是 import 的保证。
   Tool 形状:name/description/parameters 发给模型,execute 留在本地。
   新工具 = 本文件加一个定义 + TOOLS 数组添一行,两端的壳一行不用动。 */

var getTime = {
  name: 'get_time',
  description: '获取当前时间。凡涉及「现在几点/今天日期」的问题必须调用。',
  parameters: { type: 'object', properties: {} },
  async execute() {
    return new Date().toLocaleString('zh-CN');
  },
};

/* —— 以下两段与 src/tools/validate.ts、calculator.ts 逐段同款 —— */

// 迷你 JSON Schema 校验器:只认说明书用到的子集;错误收数组,空 = 通过
export function validate(v, schema, path) {
  path = path || 'args';
  var t = schema.type;
  if (t === 'object') {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return [path + ' 应是对象'];
    var errs = [];
    (schema.required || []).forEach(function (k) {
      if (!(k in v)) errs.push('缺必填参数 ' + path + '.' + k);
    });
    Object.keys(schema.properties || {}).forEach(function (k) {
      if (k in v) errs = errs.concat(validate(v[k], schema.properties[k], path + '.' + k));
    });
    return errs;
  }
  var ok =
    t === 'string' ? typeof v === 'string' :
    t === 'number' ? typeof v === 'number' :
    t === 'boolean' ? typeof v === 'boolean' :
    t === 'array' ? Array.isArray(v) : true;
  return ok ? [] : [path + ' 应是 ' + t + ',来的不是'];
}

// 安全求值器:tokenizer + 递归下降,只认数字、+-*/()、空白——恶意输入无法表达
function evaluate(src) {
  var tokens = [];
  for (var i = 0; i < src.length;) {
    var c = src[i];
    if (c === ' ') { i++; continue; }
    if (/[0-9.]/.test(c)) {
      var j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      var n = Number(src.slice(i, j));
      if (Number.isNaN(n)) throw new Error('数字不合法:' + src.slice(i, j));
      tokens.push(n); i = j; continue;
    }
    if ('+-*/()'.indexOf(c) !== -1) { tokens.push(c); i++; continue; }
    throw new Error('不认识的字符:「' + c + '」');
  }
  var p = 0;
  var peek = function () { return tokens[p]; };
  var eat = function () { return tokens[p++]; };
  var expr = function () {
    var v = term();
    while (peek() === '+' || peek() === '-') { var op = eat(); v = op === '+' ? v + term() : v - term(); }
    return v;
  };
  var term = function () {
    var v = factor();
    while (peek() === '*' || peek() === '/') { var op2 = eat(); v = op2 === '*' ? v * factor() : v / factor(); }
    return v;
  };
  var factor = function () {
    var t = eat();
    if (t === undefined) throw new Error('算式提前结束');
    if (t === '(') { var v = expr(); if (eat() !== ')') throw new Error('括号没配对'); return v; }
    if (t === '-') return -factor();
    if (typeof t === 'number') return t;
    throw new Error('不该出现「' + t + '」');
  };
  var v = expr();
  if (p !== tokens.length) throw new Error('多余的「' + tokens[p] + '」');
  return v;
}

var calculator = {
  name: 'calculator',
  description: '四则计算器，需要精确计算时使用',
  parameters: {
    type: 'object',
    properties: { expr: { type: 'string', description: '算式，如 2+3*4' } },
    required: ['expr'],
  },
  async execute(args) {
    return args.expr + ' = ' + evaluate(String(args.expr));
  },
};

// ---- TodoWrite:任务外部化(v1.6)---------------------------------------------
// 长任务的计划不住在模型的脑子里(上下文会糊),住在这块白板上。
// 每次整份重写而不是 add/update:宿主不记「上次写到哪」,清单永远只有一份、不会漂移。
var TODOS = [];

var todoWrite = {
  name: 'TodoWrite',
  description:
    '写/更新任务清单。接手多步任务时先立清单,每完成一步就重写整份清单更新状态。' +
    'todos 传完整数组(不是增量),status 只认 pending / in_progress / done。',
  parameters: {
    type: 'object',
    properties: {
      todos: {
        type: 'array',
        description: '完整的任务清单,每项 { content, status }',
      },
    },
    required: ['todos'],
  },
  async execute(args) {
    if (!Array.isArray(args.todos)) return 'todos 应是数组';
    for (var i = 0; i < args.todos.length; i++) {
      var it = args.todos[i];
      if (!it || typeof it.content !== 'string' || !it.content.trim())
        return '第 ' + (i + 1) + ' 项缺 content';
      if (['pending', 'in_progress', 'done'].indexOf(it.status) < 0)
        return '第 ' + (i + 1) + ' 项 status 只认 pending/in_progress/done';
    }
    TODOS = args.todos.map(function (it) {
      return { content: it.content, status: it.status };
    });
    if (!TODOS.length) return '清单已清空';
    var doneN = TODOS.filter(function (t) { return t.status === 'done'; }).length;
    var mark = { pending: '☐', in_progress: '▸', done: '☑' };
    return (
      '清单已记 [' + doneN + '/' + TODOS.length + ' 完成]\n' +
      TODOS.map(function (t, i) {
        return mark[t.status] + ' ' + (i + 1) + '. ' + t.content + ' (' + t.status + ')';
      }).join('\n')
    );
  },
};

// 统一注册表:CLI 端加工具时这里跟着添一行,对话框的能力面就同步长
/** @typedef {{name:string,description:string,parameters:object,execute:(args:any)=>Promise<string>}} Tool Tool 形状:前三件发给模型,execute 留在本地 */
/** @type {Tool[]} */
export var TOOLS = [getTime, calculator, todoWrite];

// 执行一个工具调用:名字没见过、参数不是 JSON、校验不过、执行抛错——都当结果喂回
export async function runTool(call) {
  var tool = null;
  for (var i = 0; i < TOOLS.length; i++) if (TOOLS[i].name === call.name) tool = TOOLS[i];
  if (!tool) return { ok: false, res: '未知工具:' + call.name };
  try {
    var args = JSON.parse(call.args || '{}');
    var errs = validate(args, tool.parameters);
    if (errs.length) return { ok: false, res: '参数校验不过:' + errs.join(';') };
    return { ok: true, res: await tool.execute(args) };
  } catch (e) {
    return { ok: false, res: '工具执行出错:' + (e && e.message ? e.message : e) };
  }
}
