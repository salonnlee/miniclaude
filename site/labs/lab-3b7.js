/* labs/lab-3b7.js —— 卷积三台（支线·观影 3B7 实验室）
   ----------------------------------------------------------------------------
   从 COURSE.html 内嵌 <script> 迁出；A = 骰子滑动台(和的分布：翻转·滑动·乘加),
   B = 滤镜像机(32×32 程序绘猫 × 四核，B 台算法与全景卡图二实算源同款),
   C = 大数乘法台（拆位→乘法表→对角线收账→进位清洗，收在 BigInt 对表）。
   依赖 labs/shared.js；交互元素在 COURSE.html 的 #lab3b7 区块。
   验收钩子：控制台 window.L7FAST = true 走快速时序（无头截图验收用）。 */
import { $id, chips } from './shared.js';
(function () {
  var FAST = function () { return !!window.L7FAST; };
  function st(fn, ms) { setTimeout(fn, FAST() ? 16 : ms); }

  /* ================= A 骰子滑动台 ================= */
  var SLOT = 36, TRACK_SLOTS = 16, visited = {};
  (function buildA() {
    var track = $id('l7a-track');
    track.style.width = (TRACK_SLOTS * SLOT - 4) + 'px';
    var A = $id('l7a-rowA'), B = $id('l7a-rowB');
    A.style.position = 'absolute'; A.style.top = '6px'; A.className = 'l7a-rowA';
    for (var i = 0; i < 6; i++) {
      var c = document.createElement('div');
      c.className = 'l7a-chip'; c.textContent = i + 1;
      c.style.left = (5 + i) * SLOT + 'px';
      A.appendChild(c);
    }
    for (var j = 0; j < 6; j++) {
      var d = document.createElement('div');
      d.className = 'l7a-chip'; d.textContent = 6 - j;
      B.appendChild(d);
    }
    var g = $id('l7a-g6'), k;
    var hd = document.createElement('div'); hd.className = 'l7a-c hd'; hd.textContent = 'a╲b'; g.appendChild(hd);
    for (k = 1; k <= 6; k++) { var h = document.createElement('div'); h.className = 'l7a-c hd'; h.textContent = k; g.appendChild(h); }
    for (var a = 1; a <= 6; a++) {
      var rh = document.createElement('div'); rh.className = 'l7a-c hd'; rh.textContent = a; g.appendChild(rh);
      for (var b = 1; b <= 6; b++) {
        var cc = document.createElement('div');
        cc.className = 'l7a-c'; cc.textContent = a + b; cc.setAttribute('data-s', a + b);
        g.appendChild(cc);
      }
    }
    var bars = $id('l7a-bars');
    for (var t = 2; t <= 12; t++) {
      var col = document.createElement('div'); col.className = 'l7a-bar';
      col.innerHTML = '<em></em><i style="height:0"></i><b>' + t + '</b>';
      bars.appendChild(col);
    }
    $id('l7a-t').addEventListener('input', renderA);
    $id('l7a-scan').addEventListener('click', autoScan);
    $id('l7a-reset').addEventListener('click', function () { visited = {}; renderA(); });
    renderA();
  })();
  function pairsOf(t) { var r = []; for (var a = 1; a <= 6; a++) { var b = t - a; if (b >= 1 && b <= 6) r.push([a, b]); } return r; }
  function renderA() {
    var t = +$id('l7a-t').value;
    $id('l7a-tv').textContent = t;
    var ps = pairsOf(t);
    $id('l7a-pl').textContent = ps.map(function (p) { return '(' + p[0] + ',' + p[1] + ')'; }).join('');
    $id('l7a-n').textContent = ps.length;
    $id('l7a-p').textContent = ps.length + '/36 ≈ ' + (ps.length / 36).toFixed(3);
    $id('l7a-rowB').style.left = ((t - 2) * SLOT) + 'px';
    var aCh = $id('l7a-rowA').children, bCh = $id('l7a-rowB').children, i;
    for (i = 0; i < 6; i++) {
      var a = i + 1, b = t - a;
      aCh[i].className = 'l7a-chip' + (b >= 1 && b <= 6 ? ' hit' : '');
    }
    for (i = 0; i < 6; i++) {
      var bb = 6 - i, aa = t - bb;
      bCh[i].className = 'l7a-chip' + (aa >= 1 && aa <= 6 ? ' hit' : '');
    }
    var cells = $id('l7a-g6').children;
    for (i = 0; i < cells.length; i++) {
      var c = cells[i];
      if (c.getAttribute('data-s')) c.className = 'l7a-c' + (+c.getAttribute('data-s') === t ? ' dg' : '');
    }
    visited[t] = true;
    var cols = $id('l7a-bars').children;
    for (i = 0; i < cols.length; i++) {
      var tt = i + 2, n = pairsOf(tt).length, col = cols[i];
      col.className = 'l7a-bar' + (tt === t ? ' on' : '');
      col.querySelector('i').style.height = (visited[tt] ? n / 36 * 88 : 0) + 'px';
      col.querySelector('em').textContent = tt === t ? n + '/36' : '';
    }
  }
  function autoScan() {
    var btn = $id('l7a-scan'), t = 2, timer;
    btn.disabled = true; btn.style.opacity = .5;
    $id('l7a-t').value = t; renderA();
    timer = setInterval(function () {
      t++;
      if (t > 12) { clearInterval(timer); btn.disabled = false; btn.style.opacity = 1; return; }
      $id('l7a-t').value = t; renderA();
    }, FAST() ? 60 : 420);
  }

  /* ================= B 滤镜像机 ================= */
  var KB = 32, KS = 8, IMG = new Float32Array(KB * KB), OUT = null, KER = null, KERD = null;
  var PRESETS = {
    blur: { name: '模糊', k: [1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9], d: ['1/9', '1/9', '1/9', '1/9', '1/9', '1/9', '1/9', '1/9', '1/9'] },
    sharp: { name: '锐化', k: [0, -1, 0, -1, 5, -1, 0, -1, 0], d: ['0', '-1', '0', '-1', '5', '-1', '0', '-1', '0'] },
    edge: { name: '勾边', k: [0, 1, 0, 1, -4, 1, 0, 1, 0], d: ['0', '1', '0', '1', '-4', '1', '0', '1', '0'] },
    ident: { name: '恒等', k: [0, 0, 0, 0, 1, 0, 0, 0, 0], d: ['0', '0', '0', '0', '1', '0', '0', '0', '0'] }
  };
  var cin, cout, ctxIn, ctxOut, selCell = null, kernChips;
  function buildImg() {
    IMG.fill(0.92);
    var x, y;
    for (y = 0; y < KB; y++) for (x = 0; x < KB; x++) {                          /* 猫头椭圆 */
      var dx = (x - 15.5) / 9.5, dy = (y - 18) / 8.5;
      if (dx * dx + dy * dy <= 1) IMG[y * KB + x] = 0.15;
    }
    function ear(x1, x2, tip) {                                                 /* 三角耳 */
      for (var yy = tip[1]; yy <= 14; yy++) {
        var lo = x1 + (tip[0] - x1) * (yy - 14) / (tip[1] - 14);
        var hi = x2 + (tip[0] - x2) * (yy - 14) / (tip[1] - 14);
        for (var xx = Math.round(lo); xx <= Math.round(hi); xx++) IMG[yy * KB + xx] = 0.15;
      }
    }
    ear(7, 12, [9, 3]); ear(19, 24, [22, 3]);
    [12, 15, 18].forEach(function (sx) { for (y = 11; y <= 15; y++) for (x = sx; x <= sx + 1; x++) IMG[y * KB + x] = 0.42; });  /* 额头条纹 */
    for (y = 17; y <= 19; y++) { IMG[y * KB + 11] = 0.92; IMG[y * KB + 12] = 0.92; IMG[y * KB + 19] = 0.92; IMG[y * KB + 20] = 0.92; }  /* 亮眼睛 */
    for (y = 21; y <= 22; y++) { IMG[y * KB + 15] = 0.92; IMG[y * KB + 16] = 0.92; }            /* 亮鼻头 */
    [20, 22].forEach(function (wy) { for (x = 1; x <= 5; x++) IMG[wy * KB + x] = 0.42; for (x = 26; x <= 30; x++) IMG[wy * KB + x] = 0.42; });  /* 胡须 */
  }
  function paintArr(ctx, arr, marker, msize) {
    var i;
    for (var y = 0; y < KB; y++) for (var x = 0; x < KB; x++) {
      var v = arr ? Math.max(0, Math.min(1, arr[y * KB + x])) : 0.94;
      var g = Math.round(v * 255);
      ctx.fillStyle = 'rgb(' + g + ',' + g + ',' + g + ')';
      ctx.fillRect(x * KS, y * KS, KS, KS);
    }
    if (!arr) {
      ctx.fillStyle = '#8a8a94'; ctx.font = '12px ui-monospace,Menlo,monospace';
      ctx.fillText('▶ 扫描 / ⚡ 瞬时算', 52, 132);
    }
    if (marker) {
      ctx.strokeStyle = '#f76707'; ctx.lineWidth = 2.5;
      ctx.strokeRect(marker[0] * KS + 1.25, marker[1] * KS + 1.25, msize * KS - 2.5, msize * KS - 2.5);
    }
  }
  function convolve(k) {
    var out = new Float32Array(KB * KB);
    for (var y = 0; y < KB; y++) for (var x = 0; x < KB; x++) {
      var s = 0;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        var yy = Math.min(KB - 1, Math.max(0, y + dy)), xx = Math.min(KB - 1, Math.max(0, x + dx));
        s += k[(dy + 1) * 3 + (dx + 1)] * IMG[yy * KB + xx];
      }
      out[y * KB + x] = s;
    }
    return out;
  }
  function setPreset(key) {
    KER = PRESETS[key].k.slice(); KERD = PRESETS[key].d.slice();
    OUT = null; selCell = null;
    kernChips.sync(key); /* 程序侧反选(初始化/重选核时高亮同步) */
    var kd = $id('l7b-kern'); kd.innerHTML = '';
    for (var j = 0; j < 9; j++) { var c = document.createElement('div'); c.className = 'l7b-k'; c.textContent = KERD[j]; kd.appendChild(c); }
    var sum = 0; for (var s = 0; s < 9; s++) sum += KER[s];
    var v = Math.abs(sum - 1) < .01 ? '核加和 = 1 · 整体明暗不变（模糊只是揉，锐化白边黑边互补）'
      : Math.abs(sum) < .01 ? '核加和 = 0 · 平整区一律归零，只剩变化（勾边的秘密）'
      : '核加和 = ' + sum.toFixed(2);
    $id('l7b-sum').textContent = v;
    paintArr(ctxIn, IMG, null, 0); paintArr(ctxOut, null, null, 0);
    $id('l7b-insp').innerHTML = '<span class="lab-stat">先扫一遍或瞬时算，再点图上任意一格。</span>';
  }
  function refreshPaint() {
    paintArr(ctxIn, IMG, selCell ? [selCell[0] - 1, selCell[1] - 1] : null, 3);
    if (OUT) paintArr(ctxOut, OUT, selCell, 1);
    else paintArr(ctxOut, null, null, 0);
  }
  function inspect(x, y) {
    selCell = [x, y];
    refreshPaint();
    if (!OUT) return;
    var patch = [], prod = [], s = 0, i = 0;
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      var yy = Math.min(KB - 1, Math.max(0, y + dy)), xx = Math.min(KB - 1, Math.max(0, x + dx));
      var p = IMG[yy * KB + xx];
      patch.push(p.toFixed(2)); prod.push((p * KER[i]).toFixed(2)); s += p * KER[i]; i++;
    }
    var cell = 'rgb(' + Math.round(Math.max(0, Math.min(1, OUT[y * KB + x])) * 255) + ')';
    var html = '<div><div class="l7a-cap" style="margin:0 0 4px;text-align:center">窗口 (' + x + ',' + y + ')</div><div class="l7b-t3">' + patch.map(function (v) { return '<span>' + v + '</span>'; }).join('') + '</div></div>'
      + '<div class="l7b-op">×</div>'
      + '<div><div class="l7a-cap" style="margin:0 0 4px;text-align:center">核</div><div class="l7b-t3 k">' + KERD.map(function (v) { return '<span>' + v + '</span>'; }).join('') + '</div></div>'
      + '<div class="l7b-op">=</div>'
      + '<div><div class="l7a-cap" style="margin:0 0 4px;text-align:center">乘积</div><div class="l7b-t3">' + prod.map(function (v) { return '<span>' + v + '</span>'; }).join('') + '</div></div>'
      + '<div class="lab-stat" style="line-height:1.9">Σ = ' + s.toFixed(2) + ' → 截回 [0,1] = ' + Math.max(0, Math.min(1, OUT[y * KB + x])).toFixed(2)
      + '<br><span style="display:inline-block;width:13px;height:13px;border-radius:3px;border:1px solid #e6e7e9;vertical-align:-2px;background:' + cell + '"></span> 输出亮度</div>';
    $id('l7b-insp').innerHTML = html;
  }
  function scanOutput(instant) {
    OUT = convolve(KER);
    if (instant) { refreshPaint(); inspect(16, 10); return; }
    var btn = $id('l7b-scan'), idx = 0;
    btn.disabled = true; btn.style.opacity = .5;
    paintArr(ctxOut, null, null, 0);
    var blank = new Float32Array(KB * KB); blank.fill(NaN);
    var timer = setInterval(function () {
      for (var q = 0; q < 5 && idx < KB * KB; q++, idx++) {
        var x = idx % KB, y = (idx / KB) | 0;
        var v = Math.max(0, Math.min(1, OUT[y * KB + x]));
        var g = Math.round(v * 255);
        ctxOut.fillStyle = 'rgb(' + g + ',' + g + ',' + g + ')';
        ctxOut.fillRect(x * KS, y * KS, KS, KS);
        paintArr(ctxIn, IMG, [x - 1, y - 1], 3);
      }
      if (idx >= KB * KB) {
        clearInterval(timer);
        btn.disabled = false; btn.style.opacity = 1;
        inspect(16, 10);
      }
    }, FAST() ? 8 : 14);
  }
  (function buildB() {
    cin = $id('l7b-cin'); cout = $id('l7b-cout');
    ctxIn = cin.getContext('2d'); ctxOut = cout.getContext('2d');
    buildImg();
    kernChips = chips(document.querySelectorAll('#lab3b7 .lab-mini'), 'k', setPreset);
    $id('l7b-scan').addEventListener('click', function () { if (KER) scanOutput(false); });
    $id('l7b-inst').addEventListener('click', function () { if (KER) scanOutput(true); });
    cin.addEventListener('click', function (e) {
      if (!OUT) return;
      var r = cin.getBoundingClientRect();
      inspect(Math.floor((e.clientX - r.left) / r.width * KB), Math.floor((e.clientY - r.top) / r.height * KB));
    });
    cout.addEventListener('click', function (e) {
      if (!OUT) return;
      var r = cout.getBoundingClientRect();
      inspect(Math.floor((e.clientX - r.left) / r.width * KB), Math.floor((e.clientY - r.top) / r.height * KB));
    });
    setPreset('blur');
  })();

  /* ================= C 大数乘法台 ================= */
  var SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  function sup(n) { return String(n).split('').map(function (d) { return SUP[+d]; }).join(''); }
  function polyLine(str, ds) {
    var terms = [];
    for (var i = 0; i < ds.length; i++) terms.push(ds[i] + '·x' + sup(i));
    return '<div class="l7-poly">' + str + ' → 低位在前 [' + ds.join(',') + '] → ' + terms.join(' + ') + ' <span style="color:#667382">(x=10)</span></div>';
  }
  function stag(txt) { return '<div class="l7-stag">' + txt + '</div>'; }
  var runSeq = 0;
  function runC() {
    var seq = ++runSeq;
    var A = String($id('l7-ca').value).replace(/\D/g, '').replace(/^0+/, '') || '0';
    var B = String($id('l7-cb').value).replace(/\D/g, '').replace(/^0+/, '') || '0';
    if (A.length > 8) A = A.slice(0, 8);
    if (B.length > 8) B = B.slice(0, 8);
    $id('l7-ca').value = A; $id('l7-cb').value = B;
    var a = A.split('').reverse().map(Number), b = B.split('').reverse().map(Number);
    var n = a.length, m = b.length, K = n + m - 1;
    ['l7-s1', 'l7-s2', 'l7-s3', 'l7-s4'].forEach(function (id) { $id(id).className = 'l7-stage'; $id(id).innerHTML = ''; });
    $id('l7-cchk').innerHTML = '流水线启动…';

    /* ① 拆位 */
    st(function () {
      if (seq !== runSeq) return;
      $id('l7-s1').innerHTML = stag('① 拆位——数字 = 「x 取 10」的多项式，系数低位在前')
        + polyLine(A, a) + polyLine(B, b);
      $id('l7-s1').className = 'l7-stage on';
    }, 150);

    /* ② 乘法表 */
    st(function () {
      if (seq !== runSeq) return;
      var html = stag('② 乘法表——格 = 行数字 × 列数字；同一条对角线（右上→左下）上，指数和 k 相同，一会儿按 k 收账');
      var tab = document.createElement('div');
      tab.className = 'l7-ctab';
      tab.style.gridTemplateColumns = 'repeat(' + (m + 1) + ',40px)';
      var corner = document.createElement('div'); corner.className = 'l7-tc hd'; corner.textContent = 'A╲B'; tab.appendChild(corner);
      var cells = [], c, r, i2, j2;
      for (c = m - 1; c >= 0; c--) { var h = document.createElement('div'); h.className = 'l7-tc hd'; h.textContent = b[c]; tab.appendChild(h); }
      for (r = n - 1; r >= 0; r--) {
        var rh = document.createElement('div'); rh.className = 'l7-tc hd'; rh.textContent = a[r]; tab.appendChild(rh);
        for (c = m - 1; c >= 0; c--) {
          var tc = document.createElement('div');
          tc.className = 'l7-tc';
          tc.textContent = a[r] * b[c];
          var i = n - 1 - r, j = m - 1 - c, k = i + j;
          tc.setAttribute('data-k', k);
          tab.appendChild(tc); cells.push(tc);
        }
      }
      $id('l7-s2').innerHTML = html;
      $id('l7-s2').appendChild(tab);
      $id('l7-s2').className = 'l7-stage on';
      cells.forEach(function (tc2, q) { st(function () { if (seq === runSeq) tc2.classList.add('on'); }, 150 + q * (FAST() ? 1 : 24)); });
      /* ③ 对角线收账 */
      var raw = [];
      for (var k2 = 0; k2 < K; k2++) {
        var kk = k2;
        raw.push(computeRaw(a, b, kk));
        st(function () {
          if (seq !== runSeq) return;
          var cur = kk;
          cells.forEach(function (tc3) {
            var kk3 = +tc3.getAttribute('data-k');
            tc3.classList.toggle('cur', kk3 === cur);
            if (kk3 < cur) tc3.classList.add('dk' + (kk3 % 6));
          });
        }, 150 + cells.length * (FAST() ? 1 : 24) + 240 + kk * (FAST() ? 1 : 330));
      }
      st(function () {
        if (seq !== runSeq) return;
        cells.forEach(function (tc4) { tc4.classList.remove('cur'); tc4.classList.add('dk' + (+tc4.getAttribute('data-k') % 6)); });
        var cards = raw.map(function (rw, k3) {
          return '<div class="l7-cd" id="l7cd' + k3 + '"><b>c' + sup(k3) + '</b> = ' + rw.terms.join(' + ') + ' = ' + rw.sum + '</div>';
        }).join('');
        $id('l7-s3').innerHTML = stag('③ 对角线收账——每条对角线一次乘加，乘积的系数（还没进位）就位') + '<div class="l7-cds">' + cards + '</div>';
        $id('l7-s3').className = 'l7-stage on';
        raw.forEach(function (rw2, k4) { st(function () { if (seq === runSeq) $id('l7cd' + k4).classList.add('on'); }, k4 * (FAST() ? 1 : 120)); });
      }, 150 + cells.length * (FAST() ? 1 : 24) + 240 + K * (FAST() ? 1 : 330));

      /* ④ 进位清洗 + 验算 */
      st(function () {
        if (seq !== runSeq) return;
        var carry = 0, rows = [], digits = [];
        for (var k5 = 0; k5 < K; k5++) {
          var tot = raw[k5].sum + carry;
          var dg = tot % 10, nc = (tot - dg) / 10;
          rows.push('<tr id="l7cr' + k5 + '"><td>k=' + k5 + '</td><td>' + raw[k5].sum + '</td><td>+' + carry + '</td><td><b>' + dg + '</b></td><td>' + nc + '</td></tr>');
          digits.push(dg); carry = nc;
        }
        while (carry > 0) { digits.push(carry % 10); carry = (carry - carry % 10) / 10; }
        $id('l7-s4').innerHTML = stag('④ 进位清洗——卷积出的系数可以 ≥ 10，按位把多出来的往前进，再当 x=10 读回')
          + '<table class="l7-ct"><thead><tr><th>位 k</th><th>对角线和 cₖ</th><th>+上一位进位</th><th>本位写</th><th>向上进</th></tr></thead><tbody>'
          + rows.join('') + '</tbody></table><div class="l7-cres" id="l7-cres"></div>';
        $id('l7-s4').className = 'l7-stage on';
        rows.forEach(function (rw3, k6) { st(function () { if (seq === runSeq) $id('l7cr' + k6).className = 'on'; }, k6 * (FAST() ? 1 : 130)); });
        var finalDelay = K * (FAST() ? 1 : 130);
        st(function () {
          if (seq !== runSeq) return;
          var ds2 = digits.slice().reverse();
          while (ds2.length > 1 && ds2[0] === 0) ds2.shift();
          var str = ds2.join(''), pretty = str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
          $id('l7-cres').textContent = A + ' × ' + B + ' = ' + pretty;
          var truth = (BigInt(A) * BigInt(B)).toString();
          $id('l7-cchk').innerHTML = '卷积路线：' + pretty + '<br>BigInt 直乘：' + truth.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
            + (str === truth ? ' <span style="color:#2b8a3e;font-weight:700">✓ 一致</span>' : ' <span style="color:#f76707;font-weight:700">✗ 不一致</span>');
        }, finalDelay + 200);
      }, 150 + cells.length * (FAST() ? 1 : 24) + 240 + K * (FAST() ? 1 : 330) + K * (FAST() ? 1 : 120) + 250);
    }, 400);
  }
  function computeRaw(a, b, k) {
    var terms = [], sum = 0;
    for (var i = 0; i < a.length; i++) {
      var j = k - i;
      if (j >= 0 && j < b.length) { terms.push(a[i] + '×' + b[j]); sum += a[i] * b[j]; }
    }
    return { terms: terms, sum: sum };
  }
  (function buildC() {
    $id('l7-crun').addEventListener('click', runC);
    $id('l7-cre').addEventListener('click', function () {
      runSeq++;
      ['l7-s1', 'l7-s2', 'l7-s3', 'l7-s4'].forEach(function (id) { $id(id).className = 'l7-stage'; $id(id).innerHTML = ''; });
      $id('l7-cchk').innerHTML = '最多各 8 位；非数字自动清洗。';
    });
  })();
})();
