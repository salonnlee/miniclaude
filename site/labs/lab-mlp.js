/* labs/lab-mlp.js —— P0.4 MLP 调音台（序章实验室 · minigpt v0.1 真前向）
   ----------------------------------------------------------------------------
   参数来自 labs/mlp-params.js(MLPLM 训练后导出，dev 1.9777):
   前向同款三查一拼→W1 搅拌→tanh→W2 表决，浏览器里现场真算——
   分布不是示意，是 12,739 个参数此刻的输出；
   temperature / top-k 旋钮与 minigpt sample.py 同构：
   logits ÷ T → 榜外 −∞ → softmax → 抽签，参数与考卷 loss 一概不动。
   依赖 labs/shared.js、labs/mlp-params.js。 */
import { $id as $ } from './shared.js';
import { MLP } from './mlp-params.js';
(function () {
  var V = MLP.vocab.length, BLK = MLP.meta.block;
  var fmt = function (s) { return s === '\n' ? '⏎' : (s === ' ' ? '␣' : s); };
  var STOI = {}; MLP.vocab.forEach(function (c, i) { STOI[c] = i; });

  // —— 真前向：窗口(3 字符下标)→ 67 个 logits，与 models.py 逐步同款 ——
  function forward(ctxIdx) {
    var h = [], i, j;
    for (i = 0; i < BLK * MLP.meta.dim; i++) {          // 三查一拼：C[t]+C[h]+C[e] 拼成 48
      var c = Math.floor(i / MLP.meta.dim), d = i % MLP.meta.dim;
      h.push(MLP.C[ctxIdx[c]][d]);
    }
    var h1 = new Array(MLP.meta.hidden);
    for (i = 0; i < MLP.meta.hidden; i++) {             // W1 搅拌 + tanh 折弯
      var s = MLP.b1[i];
      for (j = 0; j < h.length; j++) s += h[j] * MLP.W1[j][i];
      h1[i] = Math.tanh(s);
    }
    var logits = new Array(V);
    for (i = 0; i < V; i++) {                           // W2 表决
      var s2 = MLP.b2[i];
      for (j = 0; j < MLP.meta.hidden; j++) s2 += h1[j] * MLP.W2[j][i];
      logits[i] = s2;
    }
    return logits;
  }
  function adj(logits) {                                // 旋钮：÷T → top-k 清场 → softmax
    var T = +$('mlp-temp').value, K = +$('mlp-topk').value, lg = logits.slice(), i;
    if (K > 0) {
      var srt = lg.slice().sort(function (a, b) { return b - a; });
      for (i = 0; i < V; i++) if (lg[i] < srt[K - 1]) lg[i] = -Infinity;
    }
    var mx = Math.max.apply(null, lg), e = new Array(V), s = 0;
    for (i = 0; i < V; i++) { e[i] = lg[i] === -Infinity || T <= 0 ? 0 : Math.exp((lg[i] - mx) / T); s += e[i]; }
    if (s === 0) { var mi = 0; for (i = 1; i < V; i++) if (logits[i] > logits[mi]) mi = i; e[mi] = 1; return e; } // T=0 → 贪心
    for (i = 0; i < V; i++) e[i] /= s;
    return e;
  }

  var seedText = '\n\n\n', out = '', timer = null, last = -1;
  var elOut = $('mlp-out'), elSteps = $('mlp-steps'), elLast = $('mlp-last'), elWin = $('mlp-win');

  function ctx() {                                       // 不足 3 字时前面垫换行（与 data.py 垫法同款）
    var s = out.slice(-BLK);
    while (s.length < BLK) s = '\n' + s;
    return s;
  }
  function stepTo(j) { last = j; out += MLP.vocab[j]; render(); }
  function step() {                                     // 一字：前向→旋钮→抽签
    var ctxIdx = [], cs = ctx();
    for (var i = 0; i < BLK; i++) ctxIdx.push(STOI[cs[i]]);
    var p = adj(forward(ctxIdx)), r = Math.random(), acc = 0;
    for (var j = 0; j < V; j++) { acc += p[j]; if (r < acc) { stepTo(j); return; } }
    stepTo(V - 1);
  }
  function render() {
    var cs = ctx(), ctxIdx = [];
    for (var i = 0; i < BLK; i++) ctxIdx.push(STOI[cs[i]]);
    var logits = forward(ctxIdx), p = adj(logits), mi = 0, k;
    for (k = 1; k < V; k++) if (p[k] > p[mi]) mi = k;
    elWin.textContent = cs.slice(-BLK).split('').map(fmt).join(' ');
    elSteps.textContent = '第 ' + out.length + ' 字';
    elLast.textContent = '上次：' + (last < 0 ? '—' : fmt(MLP.vocab[last]));
    var srt = p.map(function (v, j) { return [j, v]; }).sort(function (a, b) { return b[1] - a[1]; });
    var top = srt.filter(function (x) { return x[1] > 0.0005; }).slice(0, 8), html = '';
    for (k = 0; k < top.length; k++) {
      var j = top[k][0], pc = top[k][1] * 100;
      html += '<div class="brow' + (j === mi ? ' ismax' : '') + '" data-j="' + j + '" title="点它 = 接管下一个字"><code>' + fmt(MLP.vocab[j]) + '</code>' +
        '<div class="bbar"><i style="width:' + Math.max(pc, 0.5).toFixed(1) + '%"></i></div>' +
        '<span>' + pc.toFixed(1) + '%</span>' +
        '<b class="bmax">' + (j === mi ? '🎯' : '') + '</b></div>';
    }
    $('mlp-rows').innerHTML = html;
    // 完整 67 柱
    var html2 = '';
    for (k = 0; k < V; k++) {
      var pc2 = p[k] * 100;
      html2 += '<div class="bg-col' + (k === mi ? ' is-max' : '') + (k === last ? ' is-pick' : '') +
        '" data-j="' + k + '" title="' + fmt(MLP.vocab[k]) + ' 调后 ' + pc2.toFixed(1) + '% · 原始 ' + (logits[k] >= 0 ? '' : '') + logits[k].toFixed(2) + ' 分 · 点它 = 接管"' + (pc2 === 0 ? ' style="opacity:.35"' : '') + '>' +
        '<i style="height:' + Math.max(pc2 * 0.76, 2).toFixed(1) + 'px"></i><em>' + fmt(MLP.vocab[k]) + '</em></div>';
    }
    $('mlp-spec').innerHTML = html2;
    elOut.textContent = out.slice(-120).split('').map(fmt).join('');
    var T = +$('mlp-temp').value, K = +$('mlp-topk').value;
    $('mlp-knob').textContent = (T === 1 && K === 0)
      ? '模型本色（T=1，不限签）'
      : '旋钮生效：T=' + T.toFixed(1) + (K ? ' · 前 ' + K + ' 名' : '') + '(参数没动，抽签变了)';
  }
  function stopAuto() {
    if (timer) { clearInterval(timer); timer = null; $('mlp-auto').textContent = '▶ 自动接龙'; $('mlp-auto').classList.remove('is-on'); }
  }
  ['mlp-tab-top', 'mlp-tab-all'].forEach(function (id) {
    $(id).onclick = function () {
      $('mlp-tab-top').classList.toggle('is-on', id === 'mlp-tab-top');
      $('mlp-tab-all').classList.toggle('is-on', id === 'mlp-tab-all');
      $('mlp-rows').hidden = id !== 'mlp-tab-top';
      $('mlp-spec').hidden = id !== 'mlp-tab-all';
    };
  });
  $('mlp-rows').addEventListener('click', function (e) {
    var row = e.target.closest('.brow');
    if (row) { stopAuto(); stepTo(+row.getAttribute('data-j')); }
  });
  $('mlp-spec').addEventListener('click', function (e) {
    var col = e.target.closest('.bg-col');
    if (col) { stopAuto(); stepTo(+col.getAttribute('data-j')); }
  });
  $('mlp-step').onclick = function () { stopAuto(); step(); };
  $('mlp-auto').onclick = function () {
    if (timer) { stopAuto(); return; }
    step();
    timer = setInterval(step, +$('mlp-speed').value);
    $('mlp-auto').textContent = '⏸ 暂停';
    $('mlp-auto').classList.add('is-on');
  };
  $('mlp-speed').onchange = function () { if (timer) { stopAuto(); $('mlp-auto').onclick(); } };
  $('mlp-reset').onclick = function () { stopAuto(); out = ''; last = -1; render(); };
  $('mlp-temp').oninput = function () { $('mlp-tempv').textContent = (+this.value).toFixed(1); render(); };
  $('mlp-topk').onchange = function () { render(); };
  ['mlp-preset-t02','mlp-preset-t09','mlp-preset-k10','mlp-preset-t15'].forEach(function (id) {
    $(id).onclick = function () {
      var set = function (tid, kid, tv, kv) {
        var t = $(tid); t.value = tv; $('mlp-tempv').textContent = tv.toFixed(1);
        var k = $(kid); k.value = kv;
        t.dispatchEvent(new Event('input')); k.dispatchEvent(new Event('change'));
      };
      if (id === 'mlp-preset-t02') set('mlp-temp','mlp-topk',0.2,0);
      if (id === 'mlp-preset-t09') set('mlp-temp','mlp-topk',0.9,0);
      if (id === 'mlp-preset-k10') set('mlp-temp','mlp-topk',0.9,10);
      if (id === 'mlp-preset-t15') set('mlp-temp','mlp-topk',1.5,0);
      Array.prototype.forEach.call(document.querySelectorAll('.mlp-presets button'), function (b) { b.classList.remove('is-on'); });
      this.classList.add('is-on');
    };
  });
  render();
})();
