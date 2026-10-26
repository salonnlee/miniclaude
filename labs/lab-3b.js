/* labs/lab-3b.js —— 观影三台(支线·观影 3B1–3B4 实验室)
   ----------------------------------------------------------------------------
   从 COURSE.html 内嵌 <script> 迁出;A = 神经元打分台(3B1,权重×输入 + 偏置门槛),
   B = loss 山小球场(3B2,负梯度下山 + SGD 噪声),C = 链式法则对表台(3B3/3B4,
   连乘 vs 数值梯度)。依赖 labs/shared.js;交互元素在 COURSE.html 的 #lab3b 区块。 */
(function () {
  var $id = Lab.$id, fmt = Lab.fmt;

  /* A 台 */
  var N = 10, X = [], W = [], b0 = 0;
  function mesh(el, arr, editable) {
    el.innerHTML = '';
    for (var i = 0; i < N * N; i++) {
      (function (i) {
        var d = document.createElement('div');
        d.className = 'l3-cell';
        d.onclick = function () {
          if (editable) { arr[i] = ((arr[i] + 2) % 3) - 1; } else { arr[i] = 1 - arr[i]; }
          renderA();
        };
        el.appendChild(d);
      })(i);
    }
    el._cells = el.children;
  }
  function paint() {
    var xc = $id('l3-xmesh')._cells, wc = $id('l3-wmesh')._cells;
    for (var i = 0; i < N * N; i++) {
      xc[i].style.background = X[i] ? 'rgba(38,38,38,.85)' : '#e6e7e9';
      wc[i].style.background = W[i] > 0 ? 'rgba(214,57,57,.8)' : (W[i] < 0 ? 'rgba(6,111,209,.8)' : '#f8f9fc');
    }
  }
  function renderA() {
    var s = 0;
    for (var i = 0; i < N * N; i++) s += W[i] * X[i];
    var h = s + b0, a = 1 / (1 + Math.exp(-h));
    $id('l3-sum').textContent = fmt(h, 2);
    $id('l3-act').textContent = fmt(a, 3);
    $id('l3-fill').style.width = (a * 100).toFixed(1) + '%';
    paint();
  }
  function presetX(kind) {
    X = [];
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var v = 0;
      if (kind === 'spot') v = (r < 3 && c < 3) ? 1 : 0;
      if (kind === 'vline') v = (c === 6 || c === 7) ? 1 : 0;
      if (kind === 'hline') v = (r === 2 || r === 3) ? 1 : 0;
      if (kind === 'all') v = 1;
      X.push(v);
    }
    renderA();
  }
  function presetW(kind) {
    W = [];
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var v = 0;
      if (kind === 'v') v = c < 5 ? -1 : 1;
      if (kind === 'spot') v = (r < 3 && c < 3) ? 1 : 0;
      W.push(v);
    }
    renderA();
  }
  mesh($id('l3-xmesh'), X, false);
  mesh($id('l3-wmesh'), W, true);
  Lab.chips(document.querySelectorAll('#lab3b [data-x]'), 'x', presetX);
  Lab.chips(document.querySelectorAll('#lab3b [data-w]'), 'w', presetW);
  $id('l3-b').oninput = function () { b0 = +this.value; $id('l3-bv').textContent = fmt(b0, 1); renderA(); };
  presetX('vline'); presetW('v');

  /* B 台 */
  var WMIN = -2, WMAX = 6, LRb = 0.3, sgd = false, wb, stepb, trail;
  function Cf(w) { return 0.5 * (w - 2.2) * (w - 2.2) + 0.15; }
  function dC(w) { return 1.0 * (w - 2.2); }
  function px(w) { return 20 + (w - WMIN) / (WMAX - WMIN) * 800; }
  function py(c) { return 130 - c / 12 * 115; }
  function resetB() { wb = -1.6; stepb = 0; trail = [wb]; renderB(); }
  function stepBall() {
    var g = dC(wb);
    if (sgd) g *= 1 + (Math.random() - 0.5);
    wb = Math.max(WMIN + 0.05, Math.min(WMAX - 0.05, wb - LRb * g));
    stepb++; trail.push(wb);
  }
  function renderB() {
    $id('l3-step').textContent = stepb;
    $id('l3-wv').textContent = fmt(wb, 3);
    $id('l3-cv').textContent = fmt(Cf(wb), 4);
    var pts = [];
    for (var w = WMIN; w <= WMAX + 0.01; w += 0.05) pts.push(px(w).toFixed(1) + ',' + py(Cf(w)).toFixed(1));
    var tp = '';
    for (var i = 0; i < trail.length; i++) tp += '<circle cx="' + px(trail[i]).toFixed(1) + '" cy="' + py(Cf(trail[i])).toFixed(1) + '" r="2" fill="rgba(247,103,7,.55)"/>';
    $id('l3-hill').innerHTML = '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#066fd1" stroke-width="1.8"/>' + tp +
      '<circle cx="' + px(wb).toFixed(1) + '" cy="' + py(Cf(wb)).toFixed(1) + '" r="7" fill="#f76707"/>' +
      '<text x="24" y="20" font-size="10" fill="#667382">loss 山 C(w) · 谷底在 w=2.2 · 小球沿 −梯度 走</text>';
  }
  $id('l3-lr').oninput = function () { LRb = +this.value; $id('l3-lrv').textContent = fmt(LRb, 2); };
  $id('l3-sgd').onclick = function () { sgd = !sgd; this.classList.toggle('on', sgd); };
  $id('l3-s1').onclick = function () { stepBall(); renderB(); };
  $id('l3-s20').onclick = function () { for (var i = 0; i < 20; i++) stepBall(); renderB(); };
  $id('l3-re').onclick = resetB;
  resetB();

  /* C 台 */
  function renderC() {
    var x = +$id('l3-x').value;
    $id('l3-xv').textContent = fmt(x, 1);
    var a = 3 * x, sq = a * a, C = sq + 2;
    $id('l3-fwd').innerHTML =
      card('x', fmt(x, 1)) + arw() + card('a = 3x', fmt(a, 1)) + arw() + card('b = a²', fmt(sq, 1)) + arw() + card('C = b+2', fmt(C, 1));
    var d1 = 1, da = 2 * a, dx = 3, mul = d1 * da * dx;
    $id('l3-bwd').innerHTML =
      card('dC/db = 1', fmt(d1, 0)) + arw(true) + card('db/da = 2a', fmt(da, 1)) + arw(true) + card('da/dx = 3', fmt(dx, 0)) + arw(true) + card('连乘 dC/dx', fmt(mul, 1));
    var eps = 1e-5, num = ((3 * (x + eps)) * (3 * (x + eps)) + 2 - C) / eps;
    $id('l3-chainmul').textContent = fmt(mul, 1);
    $id('l3-numg').textContent = fmt(num, 1);
    $id('l3-ok').textContent = Math.abs(num - mul) < 0.01 ? '✓' : '✗';
  }
  function card(t, v) { return '<div class="l3-card"><b>' + t + '</b>' + v + '</div>'; }
  function arw(back) { return '<span class="l3-arrow">' + (back ? '←' : '→') + '</span>'; }
  $id('l3-x').oninput = renderC;
  renderC();
})();
