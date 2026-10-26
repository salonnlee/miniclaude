/* labs/lab-nn.js —— NN 内功合成台(支线·内功「从旋钮到反向传播」实验室)
   ----------------------------------------------------------------------------
   从 COURSE.html 内嵌 <script> 迁出;A 台 = 2-2-1 九旋钮 XOR 训练台(NN1 下坡循环
   + NN3 反向梯度,NN2 死区种子可复现),B 台 = softmax 试押台(拉分数看 p − y)。
   依赖 labs/shared.js;交互元素在 COURSE.html 的 #nn-lab 区块。 */
(function () {
  var $id = Lab.$id, fmt = Lab.fmt;

  /* A 台:九旋钮 XOR 训练 */
  var DATA = [[0,0,0],[0,1,1],[1,0,1],[1,1,0]];
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function initP(seed){var r=mulberry32(seed),p=[];for(var i=0;i<9;i++)p.push(r()*2-1);return p}
  function fwd(p,x1,x2){var h1=p[0]*x1+p[1]*x2+p[2],h1r=Math.max(0,h1),h2=p[3]*x1+p[4]*x2+p[5],h2r=Math.max(0,h2),pre=p[6]*h1r+p[7]*h2r+p[8],out=1/(1+Math.exp(-pre));return{out:out,h1:h1,h2:h2,h1r:h1r,h2r:h2r}}
  var P,step,hist,LR=0.5,seed=2;
  function avgLoss(){var t=0;for(var i=0;i<4;i++){t+=Math.pow(fwd(P,DATA[i][0],DATA[i][1]).out-DATA[i][2],2)}return t/4}
  function stepOnce(){for(var i=0;i<4;i++){var d=DATA[i],f=fwd(P,d[0],d[1]);var delta=2*(f.out-d[2])*f.out*(1-f.out);var d1=P[6]*delta*(f.h1>0?1:0),d2=P[7]*delta*(f.h2>0?1:0);var g=[d[0]*d1,d[1]*d1,d1,d[0]*d2,d[1]*d2,d2,f.h1r*delta,f.h2r*delta,delta];for(var k=0;k<9;k++)P[k]-=LR*g[k]}step++;hist.push(avgLoss())}
  function render(){
    $id('nnl-step').textContent=step;
    var L=hist[hist.length-1];
    $id('nnl-loss').textContent=fmt(L,5);
    var b=$id('nnl-badge');
    if(L<0.01){b.textContent='🎉 四题通关';b.style.cssText='color:#15803d;border:1px solid rgba(21,128,61,.5)'}
    else if(step>=400&&Math.abs(L-hist[hist.length-201])<1e-6){b.textContent='🧊 卡死区 · 换种子';b.style.cssText='color:#dc2626;border:1px solid rgba(220,38,38,.5)'}
    else{b.textContent='下坡中…';b.style.cssText='color:#6b6b76;border:1px solid #d6d6de'}
    var n=Math.min(hist.length,240),pts=[];
    for(var i=0;i<n;i++){var h=hist[Math.floor(i*(hist.length-1)/Math.max(1,n-1))];var l=Math.max(1e-7,Math.min(1,h));pts.push((10+i/Math.max(1,n-1)*820).toFixed(1)+','+(10+(-Math.log10(l))/6*100).toFixed(1))}
    $id('nnl-curve').innerHTML='<line x1="10" y1="110" x2="830" y2="110" stroke="#d6d6de"/><text x="14" y="104" font-size="9" fill="#6b6b76">纵轴 loss 对数（顶=1 底=1e-7） · 横轴 = step</text><polyline points="'+pts.join(' ')+'" fill="none" stroke="#2563eb" stroke-width="1.8"/>';
    var html='';
    for(var i=0;i<4;i++){var d=DATA[i],f=fwd(P,d[0],d[1]);var ok=(d[2]===1&&f.out>0.9)||(d[2]===0&&f.out<0.1);html+='<div class="nnl-pred"><span>('+d[0]+','+d[1]+')→'+d[2]+'</span><div class="nnl-pbar"><div class="nnl-pfill" style="width:'+(f.out*100).toFixed(1)+'%"></div></div><span>'+fmt(f.out,3)+'</span><span>'+(ok?'✓':'✗')+'</span></div>'}
    $id('nnl-preds').innerHTML=html;
  }
  function reset(){P=initP(seed);step=0;hist=[avgLoss()];render()}
  $id('nnl-seed').onchange=function(){seed=+this.value;reset()};
  $id('nnl-lr').oninput=function(){LR=+this.value;$id('nnl-lrv').textContent=fmt(LR,1)};
  $id('nnl-s1').onclick=function(){stepOnce();render()};
  $id('nnl-s100').onclick=function(){for(var i=0;i<100;i++)stepOnce();render()};
  $id('nnl-all').onclick=function(){for(var i=0;i<8000;i++)stepOnce();render()};
  $id('nnl-re').onclick=reset;
  reset();

  /* B 台:softmax 试押 */
  var zs=[2,1,0.1],ans=2,names=['a','b','c'];
  function smx(z){var m=Math.max.apply(null,z),e=z.map(function(v){return Math.exp(v-m)}),s=e.reduce(function(a,b){return a+b},0);return e.map(function(v){return v/s})}
  function renderS(){
    for(var i=0;i<3;i++)$id('nnl-z'+i+'v').textContent=fmt(zs[i],1);
    var p=smx(zs),html='';
    for(var i=0;i<3;i++){html+='<div class="nnl-pred"><span>'+names[i]+(i===ans?' ← 答案':'')+'</span><div class="nnl-pbar"><div class="nnl-pfill" style="width:'+(p[i]*100).toFixed(1)+'%"></div></div><span>'+fmt(p[i],3)+'</span></div>'}
    $id('nnl-bars').innerHTML=html;
    $id('nnl-xe').textContent=fmt(-Math.log(p[ans]),3);
    var t='';
    for(var i=0;i<3;i++){var g=p[i]-(i===ans?1:0);t+='grad z('+names[i]+')='+(g>=0?'+':'')+fmt(g,3)+'  '}
    $id('nnl-grads').textContent=t+'（p − y：答案格负=往上加，其余正=往下按）';
  }
  for(var k=0;k<3;k++)(function(k){$id('nnl-z'+k).oninput=function(){zs[k]=+this.value;renderS()}})(k);
  Lab.chips(document.querySelectorAll('#nn-lab .nnl-chip'), 'a', function (a) { ans = +a; renderS(); });
  renderS();
})();
