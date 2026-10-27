/* mc/mc.js —— MiniClaude v0.6 网页对话框
   ----------------------------------------------------------------------------
   右下角气泡唤起的对话面板:流式打字机 + 多会话(localStorage 持久化)
   + token 记账 + Markdown 真排版(markdown-it)+ 开场问题库随机三问。
   前端 SSE 解析与 src/chat.ts 逐行同款——攒到换行才算一条事件;
   流式走 POST /api/chat(scripts/serve.mjs 代理,key 只住服务端)。
   system 提示词不进会话存储,发送时现拼——存储里只有真实对话。
   后续章节的功能面板(工具、文件树……)都长在这只面板里。 */

import mdit from '../vendor/markdown-it.esm.min.mjs'; // 官方浏览器 ESM 整包(v15,vendored 进 site/vendor/)
import { QUESTIONS } from './questions.js';

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
      '    <span class="mc-ver">v0.6</span><span class="mc-dot"></span><span class="mc-grow"></span>' +
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
   breaks:true 单换行即换行(聊天手感);linkify 裸网址自动成链。 */
var md = mdit({ html: false, breaks: true, linkify: true });
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
    '  <h4>MiniClaude v0.6</h4>' +
    '  <p>铸剑线的网页分身——多轮记忆 + 流式打字机 + token 记账,<br>回复按完整 Markdown 排版,CH3 起在这里长工具。</p>' +
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

/* 切会话 / 首开:全量重绘 */
function renderMsgs() {
  msgs.innerHTML = '';
  var s = cur();
  if (!s || !s.msgs.length) { hello(); return; }
  s.msgs.forEach(function (m) {
    bubble(m.role, m.role === 'user' ? esc(m.content) : rich(m.content));
  });
  stick();
}

/* 流式中的 assistant 占位:纯 textContent 追加(天然防注入),完成后再换 rich 渲染 */
function botStreaming() {
  var m = el('<div class="mc-m mc-bot"><span class="mc-txt"></span><span class="mc-cur"></span></div>');
  msgs.append(m);
  stick();
  return {
    node: m,
    text: '',
    update: function (t) { this.text = t; m.querySelector('.mc-txt').textContent = t; stick(); },
    done: function (t) { m.querySelector('.mc-cur').remove(); m.innerHTML = rich(t); stick(); },
    fail: function (msg, note) {
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

/* ================= 流式请求(解析与 chat.ts 同款)================= */

async function ask(history, onDelta, signal) {
  var res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'system', content: SYSTEM }].concat(history) }),
    signal: signal,
  });
  if (!res.ok || !res.body) throw new Error('API ' + res.status + ':' + (await res.text()).slice(0, 120));

  var dec = new TextDecoder();
  var full = '', buf = '', uIn = 0, uOut = 0;
  for await (var chunk of res.body) {
    buf += dec.decode(chunk);
    for (var nl = buf.indexOf('\n'); nl !== -1; nl = buf.indexOf('\n')) {
      var line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue; // 空行,跳过
      var payload = line.slice(5).trim();
      if (payload === '[DONE]') return { full: full, usage: { in: uIn, out: uOut } };
      var c = JSON.parse(payload);
      if (c.usage) { uIn = c.usage.prompt_tokens ?? 0; uOut = c.usage.completion_tokens ?? 0; } // 账单只挂最后一个事件
      var d = c.choices && c.choices[0] && c.choices[0].delta && c.choices[0].delta.content;
      if (d) { full += d; onDelta(full); }
    }
  }
  return { full: full, usage: { in: uIn, out: uOut } }; // 断流:攒到多少算多少
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
  try {
    var r = await ask(
      s.msgs, // 含刚 push 的这条 user——上一版照 chat.ts 抄了个 slice(0,-1),把唯一的话切没了,上游 1214
      function (t) { node.update(t); },
      aborter.signal
    );
    if (r.full) { s.msgs.push({ role: 'assistant', content: r.full }); node.done(r.full); }
    else { s.msgs.pop(); node.fail('空回复'); }
    s.usage.in += r.usage.in;
    s.usage.out += r.usage.out;
  } catch (e) {
    if (e.name === 'AbortError') {
      // 主动停止:半截回复照入账,与 chat.ts「断流攒到多少算多少」同语义
      if (node.text) { s.msgs.push({ role: 'assistant', content: node.text }); node.done(node.text); }
      else node.fail('已停止——还没等到第一个字,这轮没入账', true);
    } else {
      s.msgs.pop(); // 失败这轮不入账,别留半截对话
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
