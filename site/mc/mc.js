/* mc/mc.js —— MiniClaude v0.9 网页对话框
   ----------------------------------------------------------------------------
   右下角气泡唤起的对话面板:流式打字机 + 多会话(localStorage 持久化)
   + token 记账 + Markdown 真排版(markdown-it + highlight.js,流式中实时渲染)
   + 开场问题库随机三问。
   v0.9 起长出 agent 循环(与 src/chat.ts 同款):浏览器端工具注册表(mc/tools.js,
   与 src/tools/ 同一张图纸)→ 模型回 tool_calls → 本地执行喂回 → 循环到它不再要;
   🔧 气泡直播每次工具调用。CLI 长什么能力,这只分身跟着长。
   前端 SSE 解析与 src/chat.ts 逐行同款——攒到换行才算一条事件;
   流式走 POST /api/chat(scripts/serve.mjs 代理,key 只住服务端,tools 字段只透传)。
   system 提示词不进会话存储,发送时现拼——存储里只有真实对话。 */

import mdit from '../vendor/markdown-it.esm.min.mjs'; // 官方浏览器 ESM 整包(v15,vendored 进 site/vendor/)
import hljs from '../vendor/hljs.esm.min.mjs'; // highlight.js(core+8 语言,同上 vendored)
import { QUESTIONS } from './questions.js';
import { TOOLS, runTool } from './tools.js'; // 浏览器端工具柜 + 四道兜底的执行口

var SYSTEM = '你是 MiniClaude,简洁直接的中文助手。';
var PRICE = { in: 4, out: 14 }; // 元 / 百万 token,与 chat.ts 同账本
var LS = 'mc-sessions-v1';

var sessions = [];   // [{id,title,msgs:[{role,content}],usage:{in,out},born}]
var activeId = null;
var busy = false;
var aborter = null;
var autoScroll = true;

/* ================= 存取 ================= */

function load() {
  try {
    var d = JSON.parse(localStorage.getItem(LS));
    if (d && d.sessions && d.sessions.length) return d;
  } catch (e) { /* 坏档当没有 */ }
  return null;
}
function save() {
  try { localStorage.setItem(LS, JSON.stringify({ sessions: sessions, activeId: activeId })); }
  catch (e) { /* 存爆了就算了,当次会话照聊 */ }
}
function cur() { return sessions.find(function (s) { return s.id === activeId; }); }
function newSession() {
  var s = { id: 's' + Date.now(), title: '', msgs: [], usage: { in: 0, out: 0 }, born: Date.now() };
  sessions.unshift(s);
  activeId = s.id;
  return s;
}

/* ================= DOM ================= */

function el(html) {
  var t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstChild;
}

function mount() {
  document.body.append(
    el('<button id="mc-fab" aria-label="打开 MiniClaude">💬</button>'),
    el(
      '<div id="mc-panel" class="dock" role="dialog" aria-label="MiniClaude 对话框">' +
      '  <div class="mc-head">' +
      '    <span class="mc-logo">💬</span><span class="mc-title">MiniClaude</span>' +
      '    <span class="mc-ver">v0.9</span><span class="mc-dot"></span><span class="mc-grow"></span>' +
      '    <button class="mc-ico" id="mc-menu" aria-label="会话列表">☰</button>' +
      '    <button class="mc-ico" id="mc-max" aria-label="满屏 / 浮窗切换">⤢</button>' +
      '    <button class="mc-ico" id="mc-x" aria-label="收起">✕</button>' +
      '  </div>' +
      '  <div id="mc-msgs"></div>' +
      '  <div class="mc-meter"><span id="mc-meter">——</span><span>GLM-4.6</span></div>' +
      '  <div class="mc-input">' +
      '    <textarea id="mc-ta" rows="1" placeholder="给 MiniClaude 发消息…(Enter 发送,Shift+Enter 换行)"></textarea>' +
      '    <button id="mc-send" aria-label="发送">➤</button>' +
      '  </div>' +
      '  <div class="mc-veil"></div>' +
      '  <div id="mc-drawer">' +
      '    <div class="mc-dhead">会话<button class="mc-ico" id="mc-dx" aria-label="关闭列表">✕</button></div>' +
      '    <button class="mc-new">＋ 新对话</button>' +
      '    <div id="mc-list"></div>' +
      '    <div class="mc-dfoot">后续章节的能力面板(工具、文件树…)长在这只面板里</div>' +
      '  </div>' +
      '</div>'
    )
  );
}

var fab, panel, msgs, ta, send, meterEl, drawer, list;

/* ================= 渲染 ================= */

var esc = function (s) {
  return s.replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};
/* markdown-it 真排版(v0.6):表格/列表/标题/链接/引用全认,替掉旧版手写 rich() 的三个正则。
   html:false——模型输出的原始 HTML 一律按文字显示,防线语义与旧版「先转义」一脉相承;
   breaks:true 单换行即换行(聊天手感);linkify 裸网址自动成链;
   highlight(v0.7):围栏代码块按语言交给 highlight.js,不认识的语言返回空串落回转义。 */
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
function rich(text) { return md.render(text); }

function bubble(role, html) {
  var m = el('<div class="mc-m ' + (role === 'user' ? 'mc-user' : 'mc-bot') + '"></div>');
  m.innerHTML = html;
  msgs.append(m);
  return m;
}

/* 问题库随机抽 3 条不重复;🎲 换一批 = 当场重抽 */
function pick3() {
  var pool = QUESTIONS.slice(), out = [];
  for (var i = 0; i < 3; i++) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

function hello() {
  msgs.append(el(
    '<div class="mc-hello">' +
    '  <h4>MiniClaude v0.9</h4>' +
    '  <p>铸剑线的网页分身——多轮记忆 + 流式打字机 + token 记账 + Markdown 排版,<br>已长出 agent 循环:🔧 调工具(get_time / calculator)、自己决定要不要、要不要再来一轮。</p>' +
    '  <div class="mc-chips"></div>' +
    '</div>'
  ));
  drawChips();
}

function drawChips() {
  var box = msgs.querySelector('.mc-chips');
  if (!box) return; // 已开聊,hello 被撤了
  box.innerHTML = '';
  pick3().forEach(function (q) {
    var c = el('<button class="mc-chip"></button>');
    c.textContent = q;
    c.onclick = function () { openPanel(); ta.value = q; ta.focus(); fit(); };
    box.append(c);
  });
  var dice = el('<button class="mc-chip dice">🎲 换一批</button>');
  dice.onclick = drawChips;
  box.append(dice);
}

/* 切会话 / 首开:全量重绘。tool 消息按 tool_call_id 回前面 assistant 的
   tool_calls 里找名字与参数,重放出同款 🔧 气泡 */
function renderMsgs() {
  msgs.innerHTML = '';
  var s = cur();
  if (!s || !s.msgs.length) { hello(); return; }
  s.msgs.forEach(function (m, i) {
    if (m.role === 'tool') {
      var call = null;
      for (var k = i - 1; k >= 0 && !call; k--) {
        var a = s.msgs[k];
        if (a.role === 'assistant' && a.tool_calls) {
          a.tool_calls.forEach(function (tc) { if (tc.id === m.tool_call_id) call = tc; });
        }
      }
      var tb = toolBubble(call ? call.function.name : '?', call ? call.function.arguments : '');
      m.content.charAt(0) === '⚠' || /^(未知工具|参数校验不过|工具执行出错)/.test(m.content)
        ? tb.fail(m.content) : tb.done(m.content);
      return;
    }
    if (m.role === 'assistant' && m.tool_calls && !m.content) return; // 纯开口要工具,不占气泡
    bubble(m.role, m.role === 'user' ? esc(m.content) : rich(m.content));
  });
  stick();
}

/* 流式中的 assistant 占位:v0.7 起每个增量都过 md.render 实时排版——rAF 节流,
   一帧最多渲一次;光标节点常驻内容尾部,done/fail 置 finished 让迟到的帧不再覆写 */
function botStreaming() {
  var m = el('<div class="mc-m mc-bot"></div>');
  var cur = el('<span class="mc-cur"></span>');
  m.append(cur);
  msgs.append(m);
  stick();
  var pending = false;
  return {
    node: m,
    text: '',
    finished: false,
    update: function (t) {
      this.text = t;
      if (pending || this.finished) return;
      var self = this;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        if (self.finished || !m.isConnected) return;
        m.innerHTML = md.render(self.text);
        m.append(cur);
        stick();
      });
    },
    done: function (t) {
      this.finished = true;
      m.innerHTML = md.render(t);
      stick();
    },
    fail: function (msg, note) {
      this.finished = true;
      var e = el('<div class="' + (note ? 'mc-note' : 'mc-err') + '">' + esc(msg) + '</div>');
      m.replaceWith(e);
    },
  };
}

function renderDrawer() {
  list.innerHTML = '';
  sessions.forEach(function (s) {
    var it = el(
      '<div class="mc-item' + (s.id === activeId ? ' on' : '') + '">' +
      '  <div class="mi-body"><div class="mi-title"></div><div class="mi-sub"></div></div>' +
      '  <button class="mi-del" aria-label="删除会话">✕</button>' +
      '</div>'
    );
    var first = s.msgs.find(function (m) { return m.role === 'user'; });
    it.querySelector('.mi-title').textContent = s.title || '新对话';
    it.querySelector('.mi-sub').textContent = s.msgs.length
      ? (first ? first.content : '') .slice(0, 24) || (s.msgs.length + ' 条消息')
      : '还没开聊';
    it.onclick = function () { switchTo(s.id); };
    it.querySelector('.mi-del').onclick = function (ev) {
      ev.stopPropagation();
      sessions = sessions.filter(function (x) { return x.id !== s.id; });
      if (activeId === s.id) { if (busy) aborter.abort(); activeId = null; if (!sessions.length) newSession(); else activeId = sessions[0].id; renderMsgs(); }
      save(); renderDrawer(); renderMeter();
    };
    list.append(it);
  });
}

function renderMeter() {
  var s = cur();
  if (!s || (!s.usage.in && !s.usage.out)) { meterEl.textContent = '——'; return; }
  var cost = (s.usage.in * PRICE.in + s.usage.out * PRICE.out) / 1e6;
  meterEl.textContent = '输入 ' + s.usage.in + ' + 输出 ' + s.usage.out + ' token · ¥' + cost.toFixed(4);
}

/* 滚动:贴底才跟随,用户上翻就别打扰 */
function nearBottom() { return msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 60; }
function stick() { if (autoScroll) msgs.scrollTop = msgs.scrollHeight; }

/* ================= 流式请求(解析与 chat.ts 同款)=================
   v0.9:请求带 tools(浏览器注册表的说明书),响应多解析一路 tool_calls 分片——
   按 index 开槽、name/arguments 一片片挤出来,攒到 [DONE] 才算收齐申请清单 */
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
  var toolAcc = []; // 流式下 arguments 按 index 分片挤出来,攒!
  for await (var chunk of res.body) {
    buf += dec.decode(chunk);
    for (var nl = buf.indexOf('\n'); nl !== -1; nl = buf.indexOf('\n')) {
      var line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue; // 空行,跳过
      var payload = line.slice(5).trim();
      if (payload === '[DONE]') return doneAsk(full, toolAcc, uIn, uOut);
      var c = JSON.parse(payload);
      if (c.usage) { uIn = c.usage.prompt_tokens ?? 0; uOut = c.usage.completion_tokens ?? 0; } // 账单只挂最后一个事件
      var d = c.choices && c.choices[0] && c.choices[0].delta;
      if (!d) continue;
      if (d.content) { full += d.content; onDelta(full); }
      (d.tool_calls || []).forEach(function (tc) {
        var slot = toolAcc[tc.index] || (toolAcc[tc.index] = { id: '', name: '', args: '' });
        if (tc.id) slot.id = tc.id; // id 整块只来一次;name/arguments 是增量
        if (tc.function && tc.function.name) slot.name += tc.function.name;
        if (tc.function && tc.function.arguments) slot.args += tc.function.arguments;
      });
    }
  }
  return doneAsk(full, toolAcc, uIn, uOut); // 断流:攒到多少算多少
}
function doneAsk(full, toolAcc, uIn, uOut) {
  var calls = toolAcc.filter(function (c) { return c && c.name; });
  return { full: full, toolCalls: calls, usage: { in: uIn, out: uOut } };
}

/* 🔧 工具气泡:调用一行 + 结果一行,失败染红 */
function toolBubble(name, args) {
  var t = el(
    '<div class="mc-m mc-tool"><div class="mc-tool-call">🔧 <code></code></div>' +
    '<div class="mc-tool-res">…</div></div>'
  );
  t.querySelector('code').textContent = name + '(' + args + ')';
  msgs.append(t);
  stick();
  return {
    done: function (res) { t.querySelector('.mc-tool-res').textContent = res; },
    fail: function (err) {
      var r = t.querySelector('.mc-tool-res');
      r.textContent = '⚠ ' + err;
      t.classList.add('err');
    },
  };
}

function setBusy(b) {
  busy = b;
  panel.classList.toggle('busy', b);
  send.classList.toggle('stop', b);
  send.textContent = b ? '⏹' : '➤';
  send.setAttribute('aria-label', b ? '停止' : '发送');
  send.disabled = !b && !ta.value.trim();
}

async function sendMsg() {
  var text = ta.value.trim();
  if (!text || busy) return;
  openPanel();
  autoScroll = true;
  var s = cur();
  if (s.msgs.length === 0 && !s.title) { s.title = text.slice(0, 18); renderDrawer(); }
  var helloEl = msgs.querySelector('.mc-hello');
  if (helloEl) helloEl.remove();
  s.msgs.push({ role: 'user', content: text });
  bubble('user', esc(text));
  ta.value = ''; fit();
  var node = botStreaming();
  setBusy(true);
  aborter = new AbortController();
  var rollback = s.msgs.length - 1; // 失败回滚到这轮 user 消息之前(与 chat.ts 同款)
  try {
    while (true) { // agent 循环:ask 一轮 → 执行它要的工具 → 再 ask,直到它不再要
      var r = await ask(
        s.msgs, // 含刚 push 的这条 user——上一版照 chat.ts 抄了个 slice(0,-1),把唯一的话切没了,上游 1214
        function (t) { node.update(t); },
        aborter.signal
      );
      s.usage.in += r.usage.in;
      s.usage.out += r.usage.out;
      if (!r.toolCalls.length) { // 退出条件 = 这一轮没有 tool_calls,它只想说话
        if (r.full) { s.msgs.push({ role: 'assistant', content: r.full }); node.done(r.full); }
        else { s.msgs.length = rollback; node.fail('空回复'); }
        break;
      }
      // 它要了工具:先把它「开口要」这条原样入史,再逐个执行、逐条喂回
      s.msgs.push({
        role: 'assistant',
        content: r.full,
        tool_calls: r.toolCalls.map(function (c) {
          return { id: c.id, type: 'function', function: { name: c.name, arguments: c.args } };
        }),
      });
      if (r.full) node.done(r.full);
      else node.node.remove(); // 纯开口要工具,不留空占位
      for (var i = 0; i < r.toolCalls.length; i++) {
        var c = r.toolCalls[i];
        var tb = toolBubble(c.name, c.args);
        var out = await runTool(c); // 执行在浏览器本地,四道兜底全当结果
        out.ok ? tb.done(out.res) : tb.fail(out.res);
        s.msgs.push({ role: 'tool', tool_call_id: c.id, content: out.res });
      }
      node = botStreaming(); // 喂回完毕,新开一轮占位
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      // 主动停止:半截回复照入账,与 chat.ts「断流攒到多少算多少」同语义;
      // 已完成的工具调用与喂回也保留——那是真花过钱的动作
      if (node.text) { s.msgs.push({ role: 'assistant', content: node.text }); node.done(node.text); }
      else if (!node.node.isConnected) { /* 纯占位已被撤 */ }
      else node.fail('已停止——还没等到第一个字,这轮没入账', true);
    } else {
      s.msgs.length = rollback; // 失败这轮不入账,别留半截对话
      node.fail('出错:' + (e instanceof Error ? e.message : String(e)) + '(这轮没入账,重发一次)');
    }
  } finally {
    setBusy(false);
    save(); renderMeter(); renderDrawer();
  }
}

/* ================= 面板行为 ================= */

function openPanel() { panel.classList.add('open'); autoScroll = true; stick(); setTimeout(function () { ta.focus(); }, 50); }
function fit() {
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 132) + 'px';
  send.disabled = busy ? false : !ta.value.trim();
}
function switchTo(id) {
  if (id === activeId) { panel.classList.remove('drawer'); return; }
  if (busy) aborter.abort(); // 切走先停流,半截已入账
  activeId = id;
  autoScroll = true;
  save(); renderMsgs(); renderDrawer(); renderMeter();
  panel.classList.remove('drawer');
}

function wire() {
  fab.onclick = openPanel;
  panel.querySelector('#mc-x').onclick = function () { panel.classList.remove('open', 'drawer'); };
  panel.querySelector('#mc-menu').onclick = function () { panel.classList.toggle('drawer'); renderDrawer(); };
  panel.querySelector('#mc-dx').onclick = function () { panel.classList.remove('drawer'); };
  panel.querySelector('.mc-veil').onclick = function () { panel.classList.remove('drawer'); };
  panel.querySelector('#mc-max').onclick = function () {
    panel.classList.toggle('max');
    panel.classList.toggle('dock');
    this.textContent = panel.classList.contains('max') ? '⤡' : '⤢';
    this.setAttribute('aria-label', panel.classList.contains('max') ? '回到浮窗' : '满屏');
  };
  drawer.querySelector('.mc-new').onclick = function () {
    if (busy) aborter.abort();
    newSession(); save();
    renderMsgs(); renderDrawer(); renderMeter();
    panel.classList.remove('drawer');
    setTimeout(function () { ta.focus(); }, 50);
  };
  send.onclick = function () { if (busy) aborter.abort(); else sendMsg(); };
  ta.addEventListener('input', fit);
  ta.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); sendMsg(); }
  });
  msgs.addEventListener('scroll', function () { autoScroll = nearBottom(); });
}

/* ================= 起身 ================= */

var d = load();
if (d) { sessions = d.sessions; activeId = d.activeId && cur() ? d.activeId : sessions[0].id; }
else newSession();

mount();
fab = document.getElementById('mc-fab');
panel = document.getElementById('mc-panel');
msgs = document.getElementById('mc-msgs');
ta = document.getElementById('mc-ta');
send = document.getElementById('mc-send');
meterEl = document.getElementById('mc-meter');
drawer = document.getElementById('mc-drawer');
list = document.getElementById('mc-list');
wire();
renderMsgs();
renderDrawer();
renderMeter();
