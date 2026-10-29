/* mc/mc.js —— MiniClaude v0.10 网页对话框(htm+Preact 岛屿版)
   ----------------------------------------------------------------------------
   右下角气泡唤起的对话面板：流式打字机 + 多会话（localStorage 持久化）
   + token 记账 + Markdown 真排版（markdown-it + highlight.js，流式中实时渲染）
   + 开场问题库随机三问 + agent 循环(🔧 工具气泡直播)。
   v0.10 换脸不换心：SSE 解析/存档/工具柜/api 形状/CSS 类名全不动，
   只把「状态怎么存、DOM 怎么画」从模块级 var + 手动 innerHTML 换成
   htm+Preact 组件树(vendor/htm-preact-standalone.mjs，零构建 ESM)——
   · 状态仍是模块级裸变量，mutation 改完调 bump() 触发重渲(bump 自带
     rAF 合帧，一帧最多渲一次，v0.9 手写的 pending 旗子退役)；
   · 临时层 live[]：流中占位/执行中工具/错误条——没入 msgs 的都住这里，
     收尾(commit/drop/fail)与入账同一个同步块，不存在中间帧；
   · bot 气泡的 md.render 结果按文本缓存成稳定对象，Preact 见同引用
     直接跳过——重渲时只有流中气泡在真重排(与 v0.9 每帧 innerHTML 同成本)；
   · 文本插值 htm 默认转义，v0.9 的 esc() 退役；富 HTML 只走
     dangerouslySetInnerHTML(内容全部出自 md.render，html:false 已挡 XSS)。
   流式走 POST /api/chat(scripts/serve.mjs 代理，key 只住服务端，tools 字段只透传)。
   system 提示词不进会话存储，发送时现拼——存储里只有真实对话。 */

import { html, render, useState, useEffect, useRef } from '../vendor/htm-preact-standalone.mjs';
import mdit from '../vendor/markdown-it.esm.min.mjs'; // 官方浏览器 ESM 整包（v15,vendored 进 site/vendor/）
import hljs from '../vendor/hljs.esm.min.mjs'; // highlight.js(core+8 语言，同上 vendored)
import { QUESTIONS } from './questions.js';
import { TOOLS, runTool } from './tools.js'; // 浏览器端工具柜 + 四道兜底的执行口

var SYSTEM = '你是 MiniClaude，简洁直接的中文助手。';
var PRICE = { in: 4, out: 14 }; // 元 / 百万 token，与 chat.ts 同账本
var LS = 'mc-sessions-v1';

var sessions = [];   // [{id,title,msgs:[{role,content}],usage:{in,out},born}]
var activeId = null;
var busy = false;
var aborter = null;
var autoScroll = true;
var ui = { open: false, drawer: false, max: false };
var live = []; // 临时层：{k:'stream',text} | {k:'tool',name,args} | {k:'err'|'note',text}

/* ================= 存取(与 v0.9 逐字同款) ================= */

function load() {
  try {
    var d = JSON.parse(localStorage.getItem(LS));
    if (d && d.sessions && d.sessions.length) return d;
  } catch (e) { /* 坏档当没有 */ }
  return null;
}
function save() {
  try { localStorage.setItem(LS, JSON.stringify({ sessions: sessions, activeId: activeId })); }
  catch (e) { /* 存爆了就算了，当次会话照聊 */ }
}
function cur() { return sessions.find(function (s) { return s.id === activeId; }); }
function newSession() {
  var s = { id: 's' + Date.now(), title: '', msgs: [], usage: { in: 0, out: 0 }, born: Date.now() };
  sessions.unshift(s);
  activeId = s.id;
  return s;
}

/* ================= 重渲调度 =================
   App 起身时把 setState 递出来给 bump；流式 delta 一秒几十个，rAF 合帧。 */
var rerender = null;
var framePending = false;
function bump() {
  if (!rerender || framePending) return;
  framePending = true;
  requestAnimationFrame(function () { framePending = false; rerender(); });
}

/* ================= Markdown =================
   html:false——模型输出的原始 HTML 一律按文字显示；breaks:true 单换行即换行；
   linkify 裸网址成链；highlight 交给 hljs，不认识的语言落回 markdown-it 转义。
   richObj 缓存的是稳定对象：Preact 见同引用跳过 innerHTML 重设。 */
var md = mdit({
  html: false,
  breaks: true,
  linkify: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try { return hljs.highlight(str, { language: lang }).value; } catch (e) { /* 高亮炸了就落回转义 */ }
    }
    return ''; // 空串 = markdown-it 自己转义
  },
});
var richCache = new Map();
function richObj(text) {
  var o = richCache.get(text);
  if (!o) { o = { __html: md.render(text) }; richCache.set(text, o); }
  return o;
}
var CURSOR = '<span class="mc-cur"></span>'; // 拼在渲染结果尾部 = v0.9 的 append 保活光标

/* ================= 流式请求(解析与 chat.ts 同款)=================
   请求带 tools(浏览器注册表的说明书)，响应多解析一路 tool_calls 分片——
   按 index 开槽、name/arguments 一片片挤出来，攒到 [DONE] 才算收齐申请清单 */
async function ask(history, onDelta, signal) {
  var res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'system', content: SYSTEM }].concat(history),
      tools: TOOLS.map(function (t) {
        return { type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } };
      }),
    }),
    signal: signal,
  });
  if (!res.ok || !res.body) throw new Error('API ' + res.status + ':' + (await res.text()).slice(0, 120));

  var dec = new TextDecoder();
  var full = '', buf = '', uIn = 0, uOut = 0;
  var toolAcc = []; // 流式下 arguments 按 index 分片挤出来，攒！
  for await (var chunk of res.body) {
    buf += dec.decode(chunk);
    for (var nl = buf.indexOf('\n'); nl !== -1; nl = buf.indexOf('\n')) {
      var line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue; // 空行，跳过
      var payload = line.slice(5).trim();
      if (payload === '[DONE]') return doneAsk(full, toolAcc, uIn, uOut);
      var c = JSON.parse(payload);
      if (c.usage) { uIn = c.usage.prompt_tokens ?? 0; uOut = c.usage.completion_tokens ?? 0; } // 账单只挂最后一个事件
      var d = c.choices && c.choices[0] && c.choices[0].delta;
      if (!d) continue;
      if (d.content) { full += d.content; onDelta(full); }
      (d.tool_calls || []).forEach(function (tc) {
        var slot = toolAcc[tc.index] || (toolAcc[tc.index] = { id: '', name: '', args: '' });
        if (tc.id) slot.id = tc.id; // id 整块只来一次；name/arguments 是增量
        if (tc.function && tc.function.name) slot.name += tc.function.name;
        if (tc.function && tc.function.arguments) slot.args += tc.function.arguments;
      });
    }
  }
  return doneAsk(full, toolAcc, uIn, uOut); // 断流：攒到多少算多少
}
function doneAsk(full, toolAcc, uIn, uOut) {
  var calls = toolAcc.filter(function (c) { return c && c.name; });
  return { full: full, toolCalls: calls, usage: { in: uIn, out: uOut } };
}

/* ================= 临时层(v0.9 botStreaming/toolBubble 的状态化转写)=================
   收尾动作与「内容入 msgs」在同一个同步块里完成，bump 只在 rAF 才真渲——
   不存在「占位已撤、正主未上」的中间帧。 */
function liveDrop(it) { var i = live.indexOf(it); if (i !== -1) live.splice(i, 1); }
function liveSwap(a, b) { var i = live.indexOf(a); if (i !== -1) live[i] = b; }

function startStream() {
  var it = { k: 'stream', text: '' };
  live.push(it);
  bump();
  return {
    get text() { return it.text; },
    get exists() { return live.indexOf(it) !== -1; },
    update: function (t) { it.text = t; bump(); },
    commit: function () { liveDrop(it); bump(); }, // 内容已入 msgs，committed 气泡接管
    drop: function () { liveDrop(it); bump(); },   // 纯开口要工具，不留空占位
    fail: function (msg, note) { liveSwap(it, { k: note ? 'note' : 'err', text: msg }); bump(); },
  };
}
function startTool(name, args) {
  var it = { k: 'tool', name: name, args: args };
  live.push(it);
  bump();
  return it;
}

/* ================= 发送(agent 循环与 v0.9 同款) ================= */

async function sendMsg() {
  var t = TA.current;
  var text = t.value.trim();
  if (!text || busy) return;
  openPanel();
  autoScroll = true;
  live.length = 0; // 上一轮错误条/残留清场
  var s = cur();
  if (s.msgs.length === 0 && !s.title) s.title = text.slice(0, 18);
  s.msgs.push({ role: 'user', content: text }); // 含刚 push 的这条 user 一起寄——v0.8 曾照 chat.ts 抄了个 slice(0,-1)，把唯一的话切没了
  t.value = ''; fit();
  var stream = startStream();
  setBusy(true);
  aborter = new AbortController();
  var rollback = s.msgs.length - 1; // 失败回滚到这轮 user 消息之前（与 chat.ts 同款）
  bump();
  try {
    while (true) { // agent 循环：ask 一轮 → 执行它要的工具 → 再 ask，直到它不再要
      var r = await ask(
        s.msgs,
        function (txt) { stream.update(txt); },
        aborter.signal
      );
      s.usage.in += r.usage.in;
      s.usage.out += r.usage.out;
      if (!r.toolCalls.length) { // 退出条件 = 这一轮没有 tool_calls，它只想说话
        if (r.full) { s.msgs.push({ role: 'assistant', content: r.full }); stream.commit(); }
        else { s.msgs.length = rollback; stream.fail('空回复', false); }
        break;
      }
      // 它要了工具：先把它「开口要」这条原样入史，再逐个执行、逐条喂回
      s.msgs.push({
        role: 'assistant',
        content: r.full,
        tool_calls: r.toolCalls.map(function (c) {
          return { id: c.id, type: 'function', function: { name: c.name, arguments: c.args } };
        }),
      });
      if (r.full) stream.commit();
      else stream.drop();
      for (var i = 0; i < r.toolCalls.length; i++) {
        var c = r.toolCalls[i];
        var tw = startTool(c.name, c.args);
        var out = await runTool(c); // 执行在浏览器本地，四道兜底全当结果
        s.msgs.push({ role: 'tool', tool_call_id: c.id, content: out.res });
        liveDrop(tw); // 结果已入账，committed 工具气泡接管占位
        bump();
      }
      stream = startStream(); // 喂回完毕，新开一轮占位
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      // 主动停止：半截回复照入账，与 chat.ts「断流攒到多少算多少」同语义；
      // 已完成的工具调用与喂回也保留——那是真花过钱的动作
      if (stream.text) { s.msgs.push({ role: 'assistant', content: stream.text }); stream.commit(); }
      else if (stream.exists) stream.fail('已停止——还没等到第一个字，这轮没入账', true);
      /* else：纯占位已被撤，什么都不留 */
    } else {
      s.msgs.length = rollback; // 失败这轮不入账，别留半截对话
      stream.fail('出错：' + (e instanceof Error ? e.message : String(e)) + '(这轮没入账，重发一次)', false);
    }
  } finally {
    setBusy(false);
    save(); bump();
  }
}

function setBusy(b) { busy = b; bump(); fit(); }

/* ================= 组件 ================= */

function UserBubble(props) { return html`<div class="mc-m mc-user">${props.text}</div>`; }
function BotBubble(props) { return html`<div class="mc-m mc-bot" dangerouslySetInnerHTML=${richObj(props.text)} />`; }
/* 流中气泡不进缓存：每帧新对象 = 每帧重排一次，与 v0.9 手写 innerHTML 同成本 */
function StreamBubble(props) {
  return html`<div class="mc-m mc-bot" dangerouslySetInnerHTML=${{ __html: md.render(props.text) + CURSOR }} />`;
}
function ToolBubble(props) {
  return html`<div class=${'mc-m mc-tool' + (props.bad ? ' err' : '')}>
    <div class="mc-tool-call">🔧 <code>${props.name + '(' + props.args + ')'}</code></div>
    <div class="mc-tool-res">${props.res == null ? '…' : (props.bad ? '⚠ ' : '') + props.res}</div>
  </div>`;
}

function pick3() {
  var pool = QUESTIONS.slice(), out = [];
  for (var i = 0; i < 3; i++) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}
function Hello(props) {
  var st = useState(pick3); // 纯 UI 状态：真 useState，骰子换批就地重抽
  // htm 坑：void 元素必须自闭合 <br/>——裸 <br> 被当普通开标签等配对，模板整个退化成原始数组
  return html`<div class="mc-hello">
    <h4>MiniClaude v0.10</h4>
    <p>铸剑线的网页分身——多轮记忆 + 流式打字机 + token 记账 + Markdown 排版，<br/>已长出 agent 循环：🔧 调工具（get_time / calculator）、自己决定要不要、要不要再来一轮。</p>
    <div class="mc-chips">
      ${st[0].map(function (q) { return html`<button class="mc-chip" onClick=${function () { props.onPick(q); }}>${q}</button>`; })}
      <button class="mc-chip dice" onClick=${function () { st[1](pick3()); }}>🎲 换一批</button>
    </div>
  </div>`;
}

/* committed 消息回放：tool 消息按 tool_call_id 回前面 assistant 的 tool_calls
   里找名字与参数，重放出同款 🔧 气泡(与 v0.9 renderMsgs 同款) */
function toolFailText(content) {
  return content.charAt(0) === '⚠' || /^(未知工具|参数校验不过|工具执行出错)/.test(content);
}
function committedItems(s) {
  var out = [];
  s.msgs.forEach(function (m, i) {
    if (m.role === 'tool') {
      var call = null;
      for (var k = i - 1; k >= 0 && !call; k--) {
        var a = s.msgs[k];
        if (a.role === 'assistant' && a.tool_calls) {
          a.tool_calls.forEach(function (tc) { if (tc.id === m.tool_call_id) call = tc; });
        }
      }
      out.push(ToolBubble({
        name: call ? call.function.name : '?',
        args: call ? call.function.arguments : '',
        res: m.content,
        bad: toolFailText(m.content),
      }));
      return;
    }
    if (m.role === 'assistant' && m.tool_calls && !m.content) return; // 纯开口要工具，不占气泡
    out.push(m.role === 'user' ? UserBubble({ text: m.content }) : BotBubble({ text: m.content }));
  });
  return out;
}
function liveItems() {
  return live.map(function (it) {
    if (it.k === 'stream') return StreamBubble({ text: it.text });
    if (it.k === 'tool') return ToolBubble({ name: it.name, args: it.args, res: null, bad: false });
    return html`<div class=${it.k === 'err' ? 'mc-err' : 'mc-note'}>${it.text}</div>`;
  });
}

function DrawerItem(props) {
  var s = props.s;
  var first = s.msgs.find(function (m) { return m.role === 'user'; });
  var sub = s.msgs.length
    ? (first ? first.content : '').slice(0, 24) || s.msgs.length + ' 条消息'
    : '还没开聊';
  return html`<div class=${'mc-item' + (s.id === activeId ? ' on' : '')} onClick=${props.onOpen}>
    <div class="mi-body"><div class="mi-title">${s.title || '新对话'}</div><div class="mi-sub">${sub}</div></div>
    <button class="mi-del" aria-label="删除会话" onClick=${function (ev) { ev.stopPropagation(); props.onDel(); }}>✕</button>
  </div>`;
}

function meterText() {
  var s = cur();
  if (!s || (!s.usage.in && !s.usage.out)) return '——';
  var cost = (s.usage.in * PRICE.in + s.usage.out * PRICE.out) / 1e6;
  return '输入 ' + s.usage.in + ' + 输出 ' + s.usage.out + ' token · ¥' + cost.toFixed(4);
}

/* ================= 面板行为 ================= */

var TA = { current: null }, SEND = { current: null }, BOX = { current: null }; // useRef 的站位：App 起身时换真 ref
function nearBottom(el) { return el.scrollHeight - el.scrollTop - el.clientHeight < 60; }
function stick(el) { if (autoScroll && el) el.scrollTop = el.scrollHeight; }

function openPanel() {
  ui.open = true;
  autoScroll = true;
  bump();
  setTimeout(function () { TA.current && TA.current.focus(); }, 50);
}
function fit() {
  var t = TA.current, b = SEND.current;
  if (!t) return;
  t.style.height = 'auto';
  t.style.height = Math.min(t.scrollHeight, 132) + 'px';
  if (b) b.disabled = busy ? false : !t.value.trim(); // busy 时是停止钮，永远可点
}
function switchTo(id) {
  if (id === activeId) { ui.drawer = false; bump(); return; }
  if (busy && aborter) aborter.abort(); // 切走先停流，半截已入账
  activeId = id;
  autoScroll = true;
  live.length = 0;
  save(); bump();
  ui.drawer = false;
  bump();
}
function delSession(id) {
  sessions = sessions.filter(function (x) { return x.id !== id; });
  if (activeId === id) {
    if (busy && aborter) aborter.abort();
    activeId = null;
    if (!sessions.length) newSession();
    else activeId = sessions[0].id;
    live.length = 0;
  }
  save(); bump();
}
function createSession() {
  if (busy && aborter) aborter.abort();
  newSession();
  live.length = 0;
  save(); bump();
  ui.drawer = false;
  bump();
  setTimeout(function () { TA.current && TA.current.focus(); }, 50);
}

/* ================= App ================= */

function App() {
  var setV = useState(0)[1];
  var ta = useRef(null), send = useRef(null), box = useRef(null);
  TA = ta; SEND = send; BOX = box;
  rerender = function () { setV(function (v) { return v + 1; }); };

  useEffect(function () { stick(box.current); }); // 每次渲染后贴底：流中一帧一跟，与 v0.9 各处手调 stick 等价

  var s = cur();
  var cls = (ui.max ? 'max' : 'dock') + (ui.open ? ' open' : '') + (ui.drawer ? ' drawer' : '') + (busy ? ' busy' : '');
  return html`
    <button id="mc-fab" aria-label="打开 MiniClaude" onClick=${openPanel}>💬</button>
    <div id="mc-panel" class=${cls} role="dialog" aria-label="MiniClaude 对话框">
      <div class="mc-head">
        <span class="mc-logo">💬</span><span class="mc-title">MiniClaude</span>
        <span class="mc-ver">v0.10</span><span class="mc-dot"></span><span class="mc-grow"></span>
        <button class="mc-ico" id="mc-menu" aria-label="会话列表" onClick=${function () { ui.drawer = !ui.drawer; bump(); }}>☰</button>
        <button class="mc-ico" id="mc-max" aria-label=${ui.max ? '回到浮窗' : '满屏'} onClick=${function () { ui.max = !ui.max; bump(); }}>${ui.max ? '⤡' : '⤢'}</button>
        <button class="mc-ico" id="mc-x" aria-label="收起" onClick=${function () { ui.open = false; ui.drawer = false; bump(); }}>✕</button>
      </div>
      <div id="mc-msgs" ref=${box} onScroll=${function (ev) { autoScroll = nearBottom(ev.currentTarget); }}>
        ${!s || (!s.msgs.length && !live.length)
          ? html`<${Hello} onPick=${function (q) { TA.current.value = q; fit(); TA.current.focus(); }} />`
          : [committedItems(s), liveItems()]}
      </div>
      <div class="mc-meter"><span id="mc-meter">${meterText()}</span><span>GLM-4.6</span></div>
      <div class="mc-input">
        <textarea id="mc-ta" rows="1" ref=${ta} placeholder="给 MiniClaude 发消息…（Enter 发送，Shift+Enter 换行）"
          onInput=${fit}
          onKeyDown=${function (ev) { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); sendMsg(); } }}></textarea>
        <button id="mc-send" ref=${send} class=${busy ? 'stop' : ''} aria-label=${busy ? '停止' : '发送'}
          onClick=${function () { if (busy && aborter) aborter.abort(); else sendMsg(); }}>${busy ? '⏹' : '➤'}</button>
      </div>
      <div class="mc-veil" onClick=${function () { ui.drawer = false; bump(); }}></div>
      <div id="mc-drawer">
        <div class="mc-dhead">会话<button class="mc-ico" id="mc-dx" aria-label="关闭列表" onClick=${function () { ui.drawer = false; bump(); }}>✕</button></div>
        <button class="mc-new" onClick=${createSession}>＋ 新对话</button>
        <div id="mc-list">
          ${sessions.map(function (it) {
            return html`<${DrawerItem} key=${it.id} s=${it}
              onOpen=${function () { switchTo(it.id); }}
              onDel=${function () { delSession(it.id); }} />`;
          })}
        </div>
        <div class="mc-dfoot">后续章节的能力面板（工具、文件树…）长在这只面板里</div>
      </div>
    </div>`;
}

/* ================= 起身 ================= */

var d = load();
if (d) { sessions = d.sessions; activeId = d.activeId && cur() ? d.activeId : sessions[0].id; }
else newSession();

var root = document.createElement('div');
document.body.append(root);
render(html`<${App} />`, root);
