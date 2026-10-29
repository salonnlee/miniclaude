#!/usr/bin/env node
// scripts/eval.mjs —— evals runner(CH10:给不确定的 agent 写测试的路数)
// ----------------------------------------------------------------------------
// agent 的输出是概率的——同一句话这轮这么说、下轮那么说,断言嘴型必挂。
// 可断言的是确定物:轨迹(MC_TRACE 落盘的 {tool,args,result})、世界(工作区
// 被改成什么样)、底线(不该发生的没发生)。一场 = 干净工作区里拉起 chat.ts
// 喂一条任务、等提示符再现、发 exit、翻轨迹对世界。场景住 evals/index.mjs。
// 用法:npm run eval(全跑)/ npm run eval -- --only 注入(按名筛)
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY = (fs.readFileSync(path.join(ROOT, '.env'), 'utf8').match(/^GLM_API_KEY=(.*)$/m) || [])[1]?.trim();
if (!KEY) { console.error('没读到 GLM_API_KEY(.env)——evals 要真模型'); process.exit(1); }

const SCENARIOS = (await import('../evals/index.mjs')).default;
const onlyArg = process.argv.indexOf('--only');
const list = onlyArg > 0 ? SCENARIOS.filter((s) => s.name.includes(process.argv[onlyArg + 1]) || s.id === process.argv[onlyArg + 1]) : SCENARIOS;
if (!list.length) { console.error('没匹配到场景'); process.exit(1); }

// 跑一场:喂任务等回提示符(driver v2 的功课:等提示符再现,不数秒——
// GLM 想多久想多久,固定 sleep 跟不上)。ask 档确认流一律答 n:
// 测试不替用户点头,安全侧倒(CH6 同款纪律)
function runScenario(sc) {
  return new Promise((resolve) => {
    const cwd = path.join(ROOT, 'scratch', 'eval', sc.id);
    fs.rmSync(cwd, { recursive: true, force: true }); // 每次重铺:世界状态是断言对象,不能带上一场的残渣
    fs.mkdirSync(cwd, { recursive: true });
    for (const [f, c] of Object.entries(sc.files ?? {})) fs.writeFileSync(path.join(cwd, f), c);
    const tracePath = path.join(cwd, '.trace.jsonl');
    const p = spawn(process.execPath, [path.join(ROOT, 'src', 'chat.ts')], {
      cwd,
      env: { ...process.env, GLM_API_KEY: KEY, MC_TRACE: tracePath },
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    let buf = '';
    p.stdout.on('data', (d) => { buf += d.toString(); process.stdout.write(d); });
    const send = (s) => p.stdin.write(s + '\n');
    const settle = (r) => { clearTimeout(timer); clearInterval(confWatch); clearInterval(waiter); try { p.kill('SIGKILL'); } catch {} resolve({ ...r, buf, tracePath }); };
    const timer = setTimeout(() => settle({ error: '整场超时(240s)' }), 240_000);
    const waitFor = (pred, ms) => new Promise((res, rej) => {
      const t0 = Date.now();
      const tick = () => {
        const i = pred();
        if (i !== -1) return res(i);
        if (Date.now() - t0 > ms) return rej(new Error('等回应超时'));
        waiter = setTimeout(tick, 150);
      };
      waiter = setTimeout(tick, 150);
    });
    let waiter = null;
    let answeredConf = 0;
    const confWatch = setInterval(() => {
      const n = (buf.match(/允许\?\(y=/g) || []).length;
      if (n > answeredConf) { answeredConf = n; send('n'); }
    }, 200);
    (async () => {
      await waitFor(() => buf.indexOf('你> ')); // 启动落座
      send(sc.task);
      const mark = buf.length;
      await waitFor(() => buf.indexOf('你> ', mark)); // 干完活了(提示符再现)
      send('exit');
      await new Promise((r) => p.once('exit', r));
      settle({});
    })().catch((e) => settle({ error: e.message }));
  });
}

let failed = 0;
for (const sc of list) {
  console.log(`\n▶ ${sc.name}`);
  const r = await runScenario(sc);
  const trace = fs.existsSync(r.tracePath)
    ? fs.readFileSync(r.tracePath, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
    : [];
  const errs = [];
  if (r.error) errs.push(`进程:${r.error}`);
  const ok = (cond, msg) => { if (!cond) errs.push(msg); };
  try { sc.check({ cwd: path.join(ROOT, 'scratch', 'eval', sc.id), trace, output: r.buf }, ok, fs, path); }
  catch (e) { errs.push(`场景执行异常:${e.message}`); }
  if (errs.length) { failed++; console.log(`  ✗ ${sc.name}:${errs.join(' | ')}`); }
  else console.log(`  ✓ ${sc.name}`);
}
console.log(`\nevals:${list.length - failed}/${list.length} 过`);
process.exit(failed ? 1 : 0);
