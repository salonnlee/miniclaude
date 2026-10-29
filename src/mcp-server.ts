// mcp-server.ts —— mini MCP server · 天气台(v1.8,CH9.3 实践件)
// ----------------------------------------------------------------------------
// MCP 换掉的不是工具,是 execute 住哪、怎么被调到(CH4 加餐卡的决策树落点):
// 这份 server 是一个独立进程,execute 全住这边,宿主只拿到名片
// (name/description/parameters)寄给模型——模型从头到尾不知道有「进程」这回事。
// 协议是我们搓的 mini 版,与真 MCP 同思想:stdio 上每行一个 JSON,
//   请求 { id, method: 'list' | 'call', params }
//   回应 { id, result } 或 { id, error }——id 是对号入座的手牌。
// 跑法:独立可跑(node src/mcp-server.ts 直接挂住等输入),也被宿主经
// .mcp.json 拉起。数据是演示数据——教学件不连真天气 API。

import * as readline from 'node:readline';

// execute 搬了家,名片还长在原地:跟注册表里的工具同一份形状
const WEATHER: Record<string, { cond: string; temp: number }> = {
  北京: { cond: '晴', temp: 22 },
  上海: { cond: '多云', temp: 24 },
  广州: { cond: '阵雨', temp: 28 },
};

const CARDS = [
  {
    name: 'get_weather',
    description: '查某城市今天的天气(演示数据)。凡被问到天气必须调用。',
    parameters: {
      type: 'object',
      properties: { city: { type: 'string', description: '城市名,如 北京' } },
      required: ['city'],
    },
  },
  {
    name: 'list_cities',
    description: '列出能查天气的城市名单。',
    parameters: { type: 'object', properties: {} },
  },
];

// 分发:宿主递来的 call 在这里落地——这就是搬了家的 execute
function dispatch(name: string, args: Record<string, unknown>): string {
  if (name === 'get_weather') {
    const w = WEATHER[String(args.city)];
    return w ? `${args.city} 今天 ${w.cond},${w.temp}℃(演示数据)` : `查不到「${args.city}」,可用城市调 list_cities 看`;
  }
  if (name === 'list_cities') return '可查:' + Object.keys(WEATHER).join('、') + '(演示数据)';
  throw new Error(`未知工具:${name}`);
}

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  if (!line.trim()) return;
  let req: { id?: number; method?: string; params?: { name?: string; args?: Record<string, unknown> } };
  try {
    req = JSON.parse(line);
  } catch {
    console.log(JSON.stringify({ id: null, error: '不是合法 JSON:' + line.slice(0, 50) }));
    return;
  }
  const id = req.id ?? null; // 对号入座的手牌:宿主拿它认领自己的请求
  try {
    if (req.method === 'list') console.log(JSON.stringify({ id, result: CARDS }));
    else if (req.method === 'call') console.log(JSON.stringify({ id, result: dispatch(req.params!.name!, req.params!.args ?? {}) }));
    else console.log(JSON.stringify({ id, error: `未知方法:${req.method}` }));
  } catch (e) {
    console.log(JSON.stringify({ id, error: e instanceof Error ? e.message : String(e) }));
  }
});
