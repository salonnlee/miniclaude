/* COURSE-page.js —— 课程总表页级行为（与 COURSE.html 同目录，相对路径引入）
   ----------------------------------------------------------------------------
   两段互不相关：
   ① 全景架构图播放器——#arch 区「播放：一次请求的旅程」按钮，十一步点亮：Agent 循环(热词长在层里) + plugin 集装箱；
   ② 锚点滚动联动——URL 的 #锚点 随滚动实时同步(replaceState，不写历史记录),
     刷新即可回到当前区块；滚回顶部自动清掉锚点。
     ③ 右上角快捷导航——hero 滚出视口后浮现，链接与当前区块哈希联动高亮，↑ 回顶部。
     ④ 章节互引跳转——文案里提到别章（如「正是 CH6 的 Bash」）时 CHn 自动变成跳转钮（同章自引不导），
       点了跳过去并浮出「↩ 返回」钮；用户上下滚离落点超过 120px 才算「不回去」，钮隐、交互结束。
     带锚点加载的 cloak 配合逻辑见 COURSE.html 的 head 内联脚本与 COURSE.css 的 html.cloak。 */
(function () {
  var root = document.querySelector('.arch-stack');
  if (!root) return;
  var steps = [
    { a: ['user'], l: [], t: '你输入：「帮我修掉 bug.py 里的报错」' },
    { a: ['ui'], l: ['user-ui'], t: 'UI 把消息塞进对话历史，交给 Agent 循环' },
    { a: ['loop', 'ctx'], l: ['ui-loop'], t: '循环组装完整上下文：全部历史 + system prompt，上下文管理随时记账' },
    { a: ['loop', 'llm'], l: ['loop-llm'], t: '发给 LLM——它是无状态的，每次都带上全部历史' },
    { a: ['llm'], l: ['loop-llm'], t: '模型吐回 tool_use：「我要 Read 一下 bug.py」' },
    { a: ['perm', 'loop'], l: ['loop-tools'], t: '权限系统过问：Read 在允许清单里，放行' },
    { a: ['tools', 'sys'], l: ['tools-sys'], t: '工具层真的去读文件，拿到带行号的内容' },
    { a: ['tools', 'loop'], l: ['loop-tools'], t: 'tool_result 喂回循环——结果是给模型看的，不是给你看的' },
    { a: ['loop', 'llm'], l: ['loop-llm'], t: '带着新结果再问 LLM……循环往复，直到它不再要工具' },
    { a: ['ui', 'user', 'fl-exit'], l: ['ui-loop', 'user-ui'], t: '最终回答流式渲染——这一整套，就是第 3 章的 Agent 循环' },
    { a: ['plugin'], l: [], t: '最底独立一件：📦 Plugin 插件——集装箱（发行单位），把 skill/斜杠命令/hook/MCP 配置打包分发，不新增关系' }
  ];
  var btn = document.getElementById('arch-btn');
  var ic = document.getElementById('arch-btn-ic');
  var btnLabel = document.getElementById('arch-btn-label');
  var caption = document.getElementById('arch-cap');
  var marks = root.querySelectorAll('[data-layer], [data-link]');
  var idx = -1, timer = null;

  function setStep(i) {
    idx = i;
    var s = steps[i];
    marks.forEach(function (m) {
      var on = s.a.indexOf(m.getAttribute('data-layer')) > -1 || s.l.indexOf(m.getAttribute('data-link')) > -1;
      m.classList.toggle('is-active', on);
    });
    caption.textContent = (i + 1) + '/' + steps.length + ' · ' + s.t;
  }
  function setState(state) {
    btnLabel.textContent = state === 'playing' ? '暂停' : state === 'done' ? '重播' : (idx >= 0 ? '继续' : '播放：一次请求的旅程');
    ic.textContent = state === 'playing' ? '⏸' : state === 'done' ? '↻' : '▶';
  }
  btn.addEventListener('click', function () {
    if (timer) { clearInterval(timer); timer = null; setState('idle'); return; }
    if (idx >= steps.length - 1 || idx < 0) setStep(0);
    setState('playing');
    timer = setInterval(function () {
      if (idx >= steps.length - 1) { clearInterval(timer); timer = null; setState('done'); return; }
      setStep(idx + 1);
    }, 2600);
  });
})();

(function () {
  var secs = ['arch', 'acts', 'tf', 'mc', 'backlog', 'miles', 'pact', 'log']
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  var ticking = false;

  // 带锚点加载（见 head 的 cloak）：接管滚动恢复，自己瞬时跳到目标区块，再显示页面
  var cloak = document.documentElement.classList.contains('cloak');
  if (cloak) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    var target = document.getElementById(location.hash.slice(1));
    if (target) window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY);
    document.documentElement.classList.remove('cloak');
  }

  // 平滑滚动只在用户首次交互（点击/按键）后才启用：加载期的锚点定位、滚动恢复
  // 全部保持瞬时——load 一到就开 smooth 的话，浏览器随后的恢复滚动会带着动画滑，照样闪
  function armSmooth() {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      document.documentElement.style.scrollBehavior = 'smooth';
  }
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, armSmooth, { once: true, passive: true });
  });

  function currentHash() {
    // 滚到文档底部时直接选最后一个区块（末尾剩余空间可能不足以让它的顶边过线）
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2)
      return '#' + secs[secs.length - 1].id;
    var line = window.scrollY + Math.min(window.innerHeight * 0.35, 300); // 视口 35% 处的"阅读线"
    var cur = '';
    for (var i = 0; i < secs.length; i++) {
      if (secs[i].getBoundingClientRect().top + window.scrollY <= line) cur = '#' + secs[i].id;
      else break;
    }
    return cur;
  }
  // 右上角快捷导航：hero 滚出视口后浮现，当前区块高亮（哈希来自 currentHash，与 URL 锚点同源）
  var fly = document.getElementById('fly-nav');
  var flyLinks = fly ? fly.querySelectorAll('a[href^="#"]') : [];
  function syncFly(h) {
    if (!fly) return;
    fly.classList.toggle('is-on', window.scrollY > document.querySelector('.hero').offsetHeight);
    var cur = h && h !== '#' ? h.slice(1) : '';
    flyLinks.forEach(function (a) {
      a.classList.toggle('is-cur', a.getAttribute('href') === '#' + cur);
    });
  }
  if (fly) fly.querySelector('.fly-top').addEventListener('click', function (e) {
    e.preventDefault();
    window.scrollTo({ top: 0 });
  });

  function sync() {
    ticking = false;
    var h = currentHash();
    syncFly(h);
    if (h === window.location.hash) return;
    history.replaceState(null, '', h || window.location.pathname + window.location.search);
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(sync); }
  }, { passive: true });
  window.addEventListener('load', sync);
  sync();
})();

/* ④ 章节互引跳转：正文提到 CHn → 可点跳到该章；返回钮随跳转出现，用户一动就隐 */
(function () {
  // 章号 → 章块（article.chapter）；正文 CHn 互引只在课次行与卡片文案里链接化，
  // 章号本身（.ch-no）、行首课号（<b>）、代码与实验室正文不动
  var chapters = {};
  document.querySelectorAll('article.chapter').forEach(function (ch) {
    var no = ch.querySelector('.ch-no');
    if (no) chapters[no.textContent.trim()] = ch;
  });
  var SKIP = { CODE: 1, B: 1, A: 1, SUMMARY: 1, SCRIPT: 1, STYLE: 1 };
  var walker = document.createTreeWalker(
    document.querySelector('.sec-wrap, body') || document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function (n) {
        var p = n.parentElement;
        if (!p || SKIP[p.tagName]) return NodeFilter.FILTER_REJECT;
        if (p.closest('.ch-no, .act-no, .badge, .ch-lab, .mile, #fly-nav, #mc')) return NodeFilter.FILTER_REJECT;
        if (!/CH([1-9]|10)\b/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  function linkify(node) {
    var home = node.parentElement.closest('article.chapter');
    var homeNo = home && home.querySelector('.ch-no');
    homeNo = homeNo ? homeNo.textContent.trim() : '';
    var frag = document.createDocumentFragment();
    var re = /CH([1-9]|10)(?![\w.\d])/g, last = 0, m;
    while ((m = re.exec(node.nodeValue))) {
      if (!chapters['CH' + m[1]]) continue;
      if (homeNo === 'CH' + m[1]) continue; // 本小节引自己，不导航
      frag.appendChild(document.createTextNode(node.nodeValue.slice(last, m.index)));
      var a = document.createElement('a');
      a.className = 'ch-ref';
      a.href = 'javascript:void(0)';
      a.dataset.to = 'CH' + m[1];
      a.textContent = m[0];
      frag.appendChild(a);
      last = m.index + m[0].length;
    }
    frag.appendChild(document.createTextNode(node.nodeValue.slice(last)));
    node.parentNode.replaceChild(frag, node);
  }

  var nodes = [], n;
  while ((n = walker.nextNode())) nodes.push(n);
  nodes.forEach(linkify);

  // 返回钮：跳转后出现；只在用户上下滚动离锚点超过阈值后隐（点击/按键不算「不回去」）
  var back = document.createElement('button');
  back.className = 'ref-back';
  back.type = 'button';
  document.body.appendChild(back);
  var from = null, baseY = null;

  function openUp(el) {
    for (var d = el.closest('details'); d; d = d.parentElement && d.parentElement.closest('details'))
      d.open = true;
  }
  var settle = null; // 落点上方懒加载图片撑高版面会把目标推走，落定后再校一次位
  function snap(el) {
    // 用户首动后全局 scroll-behavior 会变 smooth，互引跳转必须瞬跳——
    // 平滑滚动是动画，基点记在动画前、落点在动画后，一偏就误杀返回钮
    var de = document.documentElement, prev = de.style.scrollBehavior;
    de.style.scrollBehavior = 'auto';
    el.scrollIntoView({ block: 'start' });
    de.style.scrollBehavior = prev;
    if (from) baseY = window.scrollY; // scroll 事件异步派发，同步记基点不会误杀跳转自身
  }
  function jumpTo(el) {
    openUp(el);
    snap(el); // 瞬跳：展开幕会改布局，平滑滚动易被打断停在半路
    clearTimeout(settle);
    settle = setTimeout(function () {
      settle = null;
      snap(el);
    }, 350);
  }
  function dismiss() { clearTimeout(settle); settle = null; back.classList.remove('is-on'); from = null; baseY = null; disarm(); }
  function onScroll() {
    if (!from || baseY === null) return;
    if (Math.abs(window.scrollY - baseY) > 120) dismiss(); // 上下滚离落点超过 120px 才算「不回去」
  }
  function arm() { window.addEventListener('scroll', onScroll, { passive: true }); }
  function disarm() { window.removeEventListener('scroll', onScroll, { passive: true }); }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('.ch-ref');
    if (!a) return;
    e.preventDefault();
    var target = chapters[a.dataset.to];
    if (!target) return;
    var src = a.closest('article.chapter') || a.closest('[data-card-body]') || a.closest('details.act');
    var srcNo = src && src.querySelector('.ch-no');
    from = {
      el: src || target,
      label: srcNo ? srcNo.textContent.trim() : '原处'
    };
    jumpTo(target);
    back.textContent = '↩ 返回 ' + from.label;
    back.classList.add('is-on');
    arm();
  });

  back.addEventListener('click', function () {
    if (!from) return;
    var el = from.el;
    dismiss(); // 先收摊再跳，免得 dismiss 掐掉校位定时器
    jumpTo(el);
  });
})();
