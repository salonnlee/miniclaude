/* labs/lab-chat.js —— CH2 实验室:chat.ts 透视台
   ----------------------------------------------------------------------------
   A 台:src/chat.ts 全文五段,点击段落 → 透视卡交代它干什么、数据什么形状
        (透视卡机制同 CH1 素颜相见台,升格为整份代码可透视——代码分析标配)。
   B 台:SSE 缓冲实验——同一段流两种到达方式(整包 vs 劈成碎片),
        逐字进缓冲区、见换行切事件,亲眼看半截 JSON 为什么不能解析。
   C 台:真机连线——POST /api/chat(scripts/serve.mjs 流式代理,key 只住服务端),
        前端解析与 src/chat.ts 逐行同款;右侧直播原始 SSE,思考草稿在流里可见。 */
import { $id } from './shared.js';

/* ================= A · 代码透视(段落与透视卡) ================= */

/* 卡列跟随:幕折叠的 ::details-content 会劫持 sticky/fixed 的包含块(实测 fixed 钉到伪元素顶),
   只剩绝对定位可靠——position:absolute 挂在网格上,滚动时重算 top */
var pinSync = function () {};
(function pin() {
  var grid = document.querySelector('#chat-lab .cx-grid');
  var card = grid.querySelector('.lab-box:last-child');
  var code = grid.querySelector('.lab-box:first-child');
  function sync() {
    var wide = matchMedia('(min-width:900px)').matches;
    var vh = innerHeight;
    var gr = grid.getBoundingClientRect();
    var cardH = card.offsetHeight;
    /* 只有「网格比视口高、代码列比卡高」时才钉;其余时候各回各位 */
    var need = wide && gr.height > vh && code.offsetHeight > cardH;
    if (!need || gr.top > 12 || gr.bottom < 0) {
      card.classList.remove('cx-stick');
      card.style.width = card.style.left = card.style.top = '';
      return;
    }
    var gridTop = gr.top + scrollY; /* 网格顶的文档坐标 */
    var top = scrollY - gridTop + 12; /* 钉在视口顶 12px 处(网格坐标系) */
    top = Math.min(top, grid.offsetHeight - cardH - 12); /* 网格快滚完时跟着往上滑 */
    card.classList.add('cx-stick');
    card.style.width = code.offsetWidth + 'px';
    card.style.left = (code.getBoundingClientRect().right + 16 - gr.left) + 'px';
    card.style.top = Math.max(0, top) + 'px';
  }
  pinSync = sync;
  addEventListener('scroll', sync, { passive: true });
  addEventListener('resize', sync);
})();

/* 五段代码与 src/chat.ts 逐字一致(精简版 v0.4,81 行) */
var SEGS = [
  {
    id: 'gear',
    tag: '① 装备区',
    code: "const KEY = process.env.GLM_API_KEY;\n" +
      "if (!KEY) {\n" +
      "  console.error('没读到 GLM_API_KEY —— 检查 .env');\n" +
      "  process.exit(1);\n" +
      "}\n" +
      "\n" +
      "const API = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';\n" +
      "const PRICE = { in: 4, out: 14 }; // 元 / 百万 token\n" +
      "const messages = [{ role: 'system', content: '你是小c,简洁直接的中文助手。' }];\n" +
      "const usage = { in: 0, out: 0 };",
    card: ['装备区:开战前的五样东西',
      '<b>KEY</b>——钥匙从环境变量来(.env 文件),不写死在代码里:进了 git 等于把家门钥匙发到朋友圈。' +
      '<b>API</b>——端点地址,换厂商就是换个域名,形状不变(CH1 见过)。<b>PRICE</b>——价目表,' +
      '智谱按百万 token 计价:输入 4 元、输出 14 元。<b>messages</b>——对话账本,出生自带一条 system 立人设,' +
      '后面每轮往里长。<b>usage</b>——本会话的账,从 0 记起。']
  },
  {
    id: 'req',
    tag: '② ask·发请求',
    code: "async function ask(): Promise<string> {\n" +
      "  const res = await fetch(API, {\n" +
      "    method: 'POST',\n" +
      "    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },\n" +
      "    body: JSON.stringify({ model: 'glm-4.6', messages, max_tokens: 4096, stream: true }),\n" +
      "  });\n" +
      "  if (!res.ok || !res.body) throw new Error(`API ${res.status}:${await res.text()}`);",
    card: ['ask·把整个账本寄出去',
      '一次 POST 寄四样:<b>model</b> 点型号;<b>messages</b> 是整个数组——CH1 实测过,' +
      '「记忆」不是服务器存了什么,是每次把全部历史<b>原样重寄</b>,聊得越久寄得越厚;' +
      '<b>max_tokens: 4096</b>——glm-4.6 是思考型,先打草稿再说话,给小了草稿吃光预算、正文一个字不出;' +
      '<b>stream: true</b> 一个字之差,回复从「一整封信」变成「一个词一个词往外蹦」——下一段代码就接这个蹦法。']
  },
  {
    id: 'sse',
    tag: '③ ask·SSE 拆流',
    code: "  // SSE 分块不讲道理:一个 chunk 可能装半个事件、也可能仨——攒到换行才算拿到一条\n" +
      "  const dec = new TextDecoder();\n" +
      "  let full = '';\n" +
      "  let buf = '';\n" +
      "  for await (const chunk of res.body) {\n" +
      "    buf += dec.decode(chunk);\n" +
      "    for (let nl = buf.indexOf('\\n'); nl !== -1; nl = buf.indexOf('\\n')) {\n" +
      "      const line = buf.slice(0, nl).trim();\n" +
      "      buf = buf.slice(nl + 1);\n" +
      "      if (!line.startsWith('data:')) continue; // 空行,跳过\n" +
      "      const payload = line.slice(5).trim();\n" +
      "      if (payload === '[DONE]') return full; // 流的终点\n" +
      "      const c = JSON.parse(payload);\n" +
      "      if (c.usage) {\n" +
      "        usage.in += c.usage.prompt_tokens ?? 0; // 账单只挂在最后一个事件\n" +
      "        usage.out += c.usage.completion_tokens ?? 0;\n" +
      "      }\n" +
      "      const delta = c.choices?.[0]?.delta?.content;\n" +
      "      if (delta) {\n" +
      "        full += delta;\n" +
      "        process.stdout.write(delta); // 打字机:来一个词念一个词\n" +
      "      }\n" +
      "    }\n" +
      "  }\n" +
      "  return full; // 没等到 [DONE] 就断流:攒到多少算多少\n" +
      "}",
    card: ['ask·拆流:攒 → 切 → 解析',
      '网络分块(chunk)不讲道理——一个 chunk 可能装半个事件,也可能仨事件挤一块,' +
      '直接对 chunk 做 JSON.parse 当场噎死。所以三步:<b>攒</b>——chunk 解码后先拼进 buf 缓冲区;' +
      '<b>切</b>——见到换行才算一条完整事件,切出来;<b>解析</b>——剥掉 data: 前缀,[DONE] 是流的终点,' +
      '其余 JSON.parse。<b>delta.content</b> 来一个词念一个词(write 不换行,打字机就是它),' +
      'full 同时攒整段——屏幕上是流的,账本里是整的。账单 usage 只挂在流的<b>最后一个</b>事件上,顺手捡走。',
      'sse']
  },
  {
    id: 'loop',
    tag: '④ 主循环',
    code: "const rl = readline.createInterface({ input: process.stdin, output: process.stdout });\n" +
      "console.log('小c上线(exit 退出)');\n" +
      "\n" +
      "while (true) {\n" +
      "  let line: string;\n" +
      "  try {\n" +
      "    line = (await rl.question('你> ')).trim();\n" +
      "  } catch {\n" +
      "    break; // Ctrl-D / 管道 EOF\n" +
      "  }\n" +
      "  if (line === 'exit') break;\n" +
      "  if (!line) continue;\n" +
      "\n" +
      "  messages.push({ role: 'user', content: line });\n" +
      "  try {\n" +
      "    process.stdout.write('小c> ');\n" +
      "    messages.push({ role: 'assistant', content: await ask() });\n" +
      "    process.stdout.write('\\n\\n');\n" +
      "  } catch (e) {\n" +
      "    messages.pop(); // 失败这轮不入账,别留半截对话\n" +
      "    console.error(`出错:${e instanceof Error ? e.message : e}\\n`);\n" +
      "  }\n" +
      "}",
    card: ['主循环:一问一答的账本纪律',
      '循环体干四件事:读一行(question 顺带打「你> 」提示符)→ push 进账本当 user → ' +
      '<b>await ask()</b> 拿整段回复 push 成 assistant → 回到下一轮。两处纪律:' +
      'Ctrl-D / 管道 EOF 直接收工;ask() 抛错时 <b>messages.pop()</b> 把刚 push 的 user 撤回——' +
      '失败这轮不入账,不然账本里躺着一条没人回答的提问,下次整个寄出去,模型会以为自己在自言自语。']
  },
  {
    id: 'bill',
    tag: '⑤ 记账收尾',
    code: "rl.close();\n" +
      "const cost = (usage.in * PRICE.in + usage.out * PRICE.out) / 1e6;\n" +
      "console.log(`再见。合计输入 ${usage.in} + 输出 ${usage.out} token,约 ¥${cost.toFixed(4)}`);",
    card: ['记账:退出时把账算了',
      '每轮 ask() 顺手把 usage 加进会话账。退出时一条公式结账:' +
      '<code>cost =(输入×4 + 输出×14)÷ 100 万</code>。CH2 实测那场:输入 75 + 输出 232 token ≈ ¥0.0035——' +
      '跟大模型聊天,一杯奶茶钱够聊几万轮。贵不在单价,在<b>历史越滚越厚</b>:每一轮都重寄全部前文,' +
      '聊到第一千轮,第一句话还在按 token 交钱。']
  }
];

/* 迷你高亮:一次正则分词(注释/字符串/关键字/数字),避免「注释里的引号」互相污染 */
function hl(src) {
  var esc = function (s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  var re = /(\/\/[^\n]*)|('(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`|"(?:[^"\\\n]|\\.)*")|\b(const|let|var|async|await|function|return|if|else|for|while|try|catch|throw|new|import|from|break|continue|of|in|as)\b|\b(\d[\d_]*(?:\.\d+)?)\b/g;
  var out = '', m, last = 0, piece;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    if (m[1]) piece = '<i class="cx-c">' + esc(m[1]) + '</i>';
    else if (m[2]) piece = '<i class="cx-s">' + esc(m[2]) + '</i>';
    else if (m[3]) piece = '<i class="cx-k">' + esc(m[3]) + '</i>';
    else piece = '<i class="cx-n">' + esc(m[4]) + '</i>';
    out += piece;
    last = m.index + m[0].length;
  }
  return out + esc(src.slice(last));
}

(function mountCode() {
  var box = $id('cx-code');
  var exp = $id('cx-exp');
  var on = null;
  SEGS.forEach(function (s) {
    var div = document.createElement('div');
    div.className = 'cx-seg';
    div.setAttribute('data-s', s.id);
    div.innerHTML = '<span class="cx-tag">' + s.tag + '</span>' + hl(s.code);
    box.appendChild(div);
    div.addEventListener('click', function () {
      if (on) on.classList.remove('on');
      on = div;
      div.classList.add('on');
      var html = '<h4>' + s.card[0] + '</h4><div>' + s.card[1] + '</div>';
      if (s.card[2] === 'sse') {
        html += '<span class="lab-mini cx-go" id="cx-tob">▶ 到 B 台看缓冲实验(劈成碎片版)</span>';
      }
      exp.innerHTML = html;
      var go = $id('cx-tob');
      if (go) go.addEventListener('click', function () {
        runMode('shred');
        $id('cx-chunk').scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      /* 卡不完全在视口里(含只裁一半)就把它居中到眼前——手算 scrollTo,
         scrollIntoView 在个别嵌入环境/平滑滚动状态下会静默失灵 */
      var r = exp.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight) {
        window.scrollTo(0, scrollY + r.top - (innerHeight - r.height) / 2);
      }
      pinSync(); /* 卡高随段落变,钉住的位置要重算 */
    });
  });
  box.firstChild.click(); /* 默认展开第一段 */
  /* 代码面板展开/收起开关:限高模式下 macOS 滚动条默认隐形,看着像截断 */
  var fold = $id('cx-fold');
  if (fold) fold.addEventListener('click', function () {
    var full = $id('cx-code').classList.toggle('full');
    fold.classList.toggle('on', full);
    fold.textContent = full ? '⤡ 收起' : '⤢ 展开全部';
    pinSync(); /* 代码列高变了,跟随模式可能要开关 */
  });
})();

/* ================= B · SSE 缓冲实验 ================= */

/* 一段三词回复的完整 SSE 流(形状照真机缩样:delta×3 → 账单 → 终点) */
var B_EVENTS = [
  '{"choices":[{"delta":{"content":"你"}}]}',
  '{"choices":[{"delta":{"content":"好"}}]}',
  '{"choices":[{"delta":{"content":"！"}}]}',
  '{"choices":[{"delta":{}}],"usage":{"prompt_tokens":17,"completion_tokens":3}}',
  '[DONE]'
];
var B_TEXT = B_EVENTS.map(function (e) { return 'data: ' + e; }).join('\n\n') + '\n\n';

var bTimer = null;

function bReset() {
  clearInterval(bTimer);
  $id('cx-buf').innerHTML = '';
  $id('cx-evts').innerHTML = '';
  $id('cx-type').textContent = '';
  $id('cx-bill').textContent = '账单:还没收到';
  $id('cx-chunk').classList.remove('hot');
}

function bAddEvt(kind, text) {
  var el = document.createElement('div');
  el.className = 'cx-evt evt-' + kind;
  el.textContent = text;
  var list = $id('cx-evts');
  list.appendChild(el);
  list.scrollTop = list.scrollHeight;
}

/* runMode('whole'|'shred'):把 B_TEXT 按 chunk 喂进缓冲区,逐字演同一段解析逻辑 */
function runMode(mode) {
  bReset();
  /* [\s\S] 而不是 .:正则的点号不吃换行符,用 . 会把 \n 全丢在切碎的路上 */
  var chunks = mode === 'whole' ? [B_TEXT] : B_TEXT.match(/[\s\S]{1,9}/g) || [];
  var ci = 0, pos = 0, buf = '';
  var chunk = $id('cx-chunk');
  chunk.textContent = '共 ' + chunks.length + ' 个 chunk' + (mode === 'shred' ? '(每 9 字符一段,JSON 劈得稀碎)' : '(一次全到)');
  chunk.classList.add('hot');

  function drawBuf() {
    var shown = buf.replace(/\n/g, '⏎\n');
    /* 切出来的部分已移出 buf——留在 buf 里的全是「半截,还不能解析」 */
    $id('cx-buf').innerHTML = shown ? '<span class="cx-pend">' + shown + '</span>' : '(空——全切成事件了)';
  }
  drawBuf();

  function drain() {
    /* 与 src/chat.ts 同款:见换行就切一条 */
    var nl = buf.indexOf('\n');
    while (nl !== -1) {
      var line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line.indexOf('data:') === 0) {
        var payload = line.slice(5).trim();
        if (payload === '[DONE]') { bAddEvt('done', line + ' → 流的终点,收工'); return true; }
        var c;
        try { c = JSON.parse(payload); } catch (e) { bAddEvt('done', '解析失败:' + e.message); return true; }
        if (c.usage) {
          $id('cx-bill').textContent = '账单:输入 ' + c.usage.prompt_tokens + ' + 输出 ' + c.usage.completion_tokens + ' token(挂在最后一个带内容的事件上)';
          bAddEvt('usage', line);
        }
        var d = c.choices && c.choices[0] && c.choices[0].delta && c.choices[0].delta.content;
        if (d) {
          $id('cx-type').textContent += d;
          bAddEvt('delta', line);
        }
      }
      nl = buf.indexOf('\n');
    }
    drawBuf();
    return false;
  }

  bTimer = setInterval(function () {
    if (ci >= chunks.length) { clearInterval(bTimer); chunk.classList.remove('hot'); chunk.textContent += ' · 完'; return; }
    buf += chunks[ci].charAt(pos++);
    if (pos >= chunks[ci].length) { ci++; pos = 0; }
    if (drain()) { clearInterval(bTimer); chunk.classList.remove('hot'); chunk.textContent += ' · 完'; }
  }, 26);
}

(function mountB() {
  var modes = document.querySelectorAll('#chat-lab .cx-mode');
  Array.prototype.forEach.call(modes, function (el) {
    el.addEventListener('click', function () {
      Array.prototype.forEach.call(modes, function (m) { m.classList.remove('on'); });
      el.classList.add('on');
      runMode(el.getAttribute('data-k'));
    });
  });
})();

/* ================= C · 真机连线(解析与 src/chat.ts 同款) ================= */

var cMsgs = [{ role: 'system', content: '你是小c,简洁直接的中文助手。' }];
var cUsage = { in: 0, out: 0 };
var cBusy = false;

function cAcc() {
  $id('cx-acc').textContent = '账本:' + cMsgs.length + ' 条(1 system + ' + (cMsgs.length - 1) + ' 轮)· 累计 ' + (cUsage.in + cUsage.out) + ' token';
  var cost = (cUsage.in * 4 + cUsage.out * 14) / 1e6;
  $id('cx-acc2').textContent = '账单:¥' + cost.toFixed(4) + '(输入 ' + cUsage.in + ' ×4 + 输出 ' + cUsage.out + ' ×14,每百万 token)';
}

function cRaw(kind, text) {
  var list = $id('cx-raw');
  if (list.firstChild && list.firstChild.nodeType === 3) list.innerHTML = '';
  var el = document.createElement('div');
  el.className = 'cx-evt evt-' + kind;
  el.textContent = text;
  list.appendChild(el);
  while (list.children.length > 14) list.removeChild(list.firstChild);
  list.scrollTop = list.scrollHeight;
}

async function cSend() {
  var input = $id('cx-in');
  var text = input.value.trim();
  if (!text || cBusy) return;
  cBusy = true;
  $id('cx-send').classList.add('busy');
  input.value = '';
  input.disabled = true;
  cMsgs.push({ role: 'user', content: text });
  $id('cx-live').textContent = '';
  $id('cx-raw').innerHTML = '';
  cRaw('done', '→ POST /api/chat(messages ' + cMsgs.length + ' 条,整本重寄)');
  try {
    var res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: cMsgs })
    });
    if (!res.ok || !res.body) throw new Error('API ' + res.status + ':' + (await res.text()).slice(0, 120));
    /* ↓ 与 src/chat.ts 逐行同款:攒 → 切 → 解析 */
    var dec = new TextDecoder();
    var full = '';
    var buf = '';
    for await (var chunk of res.body) {
      buf += dec.decode(chunk);
      for (var nl = buf.indexOf('\n'); nl !== -1; nl = buf.indexOf('\n')) {
        var line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (line.indexOf('data:') !== 0) continue;
        var payload = line.slice(5).trim();
        if (payload === '[DONE]') {
          cRaw('done', 'data: [DONE] → 流的终点');
          break;
        }
        var c;
        try { c = JSON.parse(payload); } catch (e) { continue; }
        var ch = c.choices && c.choices[0];
        var d = ch && ch.delta || {};
        if (d.reasoning_content) cRaw('think', 'data: {…reasoning_content:"' + String(d.reasoning_content).slice(0, 18) + '"…} → 思考草稿,chat.ts 不理');
        if (d.content) {
          full += d.content;
          $id('cx-live').textContent = full;
          cRaw('delta', 'data: {…content:"' + d.content + '"}');
        }
        if (c.usage) {
          cUsage.in += c.usage.prompt_tokens || 0;
          cUsage.out += c.usage.completion_tokens || 0;
          cRaw('usage', 'data: {…usage:' + c.usage.prompt_tokens + '+' + c.usage.completion_tokens + '} → 账单');
          cAcc();
        }
      }
    }
    cMsgs.push({ role: 'assistant', content: full });
    cAcc();
  } catch (e) {
    cRaw('done', '✕ ' + (e && e.message ? e.message : e));
    cMsgs.pop(); /* 失败这轮不入账——与 src/chat.ts 同一条纪律 */
  }
  cBusy = false;
  $id('cx-send').classList.remove('busy');
  input.disabled = false;
  input.focus();
}

(function mountC() {
  $id('cx-send').addEventListener('click', cSend);
  $id('cx-in').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') cSend();
  });
  cAcc();
})();
