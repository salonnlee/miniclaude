/* ============================================================================
   COURSE-render.js —— 课次渲染器(配 content/lessons.js)
   ----------------------------------------------------------------------------
职责只有四件:
  · 把 content/lessons.js 的课次行填进 HTML 里的空容器 <ul data-lessons="key">;
  · 由 lessons.ships 点亮章交付 chip(foot-chip ver)与里程碑表——版本号单一事实源,
    HTML 里只放空占位;
   · 由数据推导幕头/章头徽章(🔥 进行中 / ✅ 完课·日期 / 未开始,拼图区:已拼上)
     与幕的折叠态(进行中展开,其余折叠;data 里 open 可强制覆写);
   · 页头「更新于」= 全表最新完课日期(data 的 updated 可手动覆写)。
   新增/修改课次只动 content/lessons.js,本文件与 COURSE.html 都不用碰。
   ============================================================================ */
import { LESSONS as L } from './content/lessons.js';
import { CARDS as C } from './content/cards.js';
(function () {

  // —— 行模板(改空格前先想清楚:这里与原手写 HTML 逐字对齐) ——
  function lessonLi(it) {
    if (it.label) return '<li><b>' + it.label + '</b> ' + it.text + '</li>';
    var h = '<li><b>' + it.code + '</b>' + (it.name ? ' ' + it.name : '');
    if (it.done) h += (it.noGap ? '' : ' ') + '✅ <span class="done-date">' + it.done + '</span>';
    else if (it.mark) h += ' ' + it.mark;
    if (it.tail) h += ' ' + it.tail;
    return h + '</li>';
  }

  // —— 填行组:同名容器按页面出现顺序 = groups 的组序 ——
  var byKey = {};
  Array.prototype.forEach.call(document.querySelectorAll('ul[data-lessons]'), function (ul) {
    var k = ul.getAttribute('data-lessons');
    (byKey[k] = byKey[k] || []).push(ul);
  });
  Object.keys(L.lists).forEach(function (k) {
    var uls = byKey[k] || [];
    L.lists[k].groups.forEach(function (group, i) {
      if (uls[i]) uls[i].innerHTML = group.map(lessonLi).join('');
    });
  });

  // —— 状态推导:done 全勾=完课 / 有勾有未勾=进行中 / 全未勾或无课次=未开始 ——
  function itemsOf(cfg) {
    var keys = [].concat(cfg.from);
    var out = [];
    keys.forEach(function (k) {
      var def = L.lists[k];
      if (!def) return;
      def.groups.forEach(function (g) {
        g.forEach(function (it) {
          if (!it.label && (!cfg.only || it.code === cfg.only)) out.push(it);
        });
      });
    });
    return out;
  }
  function statusOf(cfg) {
    var done = 0, todo = 0, last = '';
    itemsOf(cfg).forEach(function (it) {
      if (it.done) { done++; if (it.done.slice(0, 10) > last) last = it.done.slice(0, 10); }
      else todo++;
    });
    if (done === 0) return 'todo';
    return todo === 0 ? 'done' : 'doing';
  }
  function badgeHtml(cfg) {
    var st = statusOf(cfg);
    if (st === 'done') return '<span class="badge st-done">' + (cfg.sem === 'puzzle' ? '已拼上' : '✅ 完课 · ' + lastDone(cfg)) + '</span>';
    if (st === 'doing') return '<span class="badge st-doing">🔥 进行中</span>';
    return '<span class="badge">未开始</span>';
  }
  function lastDone(cfg) {
    var last = '';
    itemsOf(cfg).forEach(function (it) {
      if (it.done && it.done.slice(0, 10) > last) last = it.done.slice(0, 10);
    });
    return last;
  }

  // —— 填内容卡(全景卡/书单/T1 长文):content/cards.js → 空占位
  //     必须先于徽章替换:T1 正文里带着 ch:tf1 的徽章锚点,注入后才轮得到徽章逻辑找它 ——
  Array.prototype.forEach.call(document.querySelectorAll('details.ch-recap[data-card]'), function (d) {
    var c = C[d.getAttribute('data-card')];
    if (!c) return;
    d.innerHTML = '<summary><span class="ch-lab-arrow">▶</span>' + c.title +
      '</summary><div class="ch-lab-body">' + c.body + '</div>';
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-card-body]'), function (el) {
    var c = C[el.getAttribute('data-card-body')];
    if (c) el.innerHTML = c.body;
  });

  // —— mermaid 流程图懒渲染:卡 body 里的 <pre class="mermaid"> 在所在卡首次
  //     展开时才动态加载 vendor/mermaid.umd.min.js(3.4MB 自包含,不进首屏)就地渲染;
  //     主题钉课程表配色(蓝 #066fd1 代码侧 / 橙 #f76707 模型侧由 classDef 分色) ——
  Array.prototype.forEach.call(document.querySelectorAll('.mermaid'), function (el) {
    var host = el.closest('details');
    var render = function () {
      var s = document.createElement('script');
      s.src = 'vendor/mermaid.umd.min.js';
      s.onload = function () {
        window.mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
            primaryColor: '#f8f9fc', primaryBorderColor: '#066fd1', primaryTextColor: '#262626',
            lineColor: '#667382', fontSize: '13px',
            fontFamily: '-apple-system,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif'
          },
          /* htmlLabels:false → 纯 SVG <text> 标签:foreignObject 里的 HTML 标签
             会被页面全局 CSS(宽度/overflow 约束)裁字,SVG 文本不受牵连 */
          flowchart: { curve: 'basis', htmlLabels: false, padding: 12 }
        });
        window.mermaid.run({ nodes: [el] });
      };
      document.head.appendChild(s);
    };
    if (host && !host.open) {
      host.addEventListener('toggle', function once() {
        host.removeEventListener('toggle', once);
        render();
      }, { once: true });
    } else render();
  });

  // —— 章头徽章:<span data-badge="ch:key"></span> ——
  Object.keys(L.chBadges || {}).forEach(function (k) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-badge="ch:' + k + '"]'), function (el) {
      el.outerHTML = badgeHtml(L.chBadges[k]);
    });
  });

  // —— 幕:徽章 + 折叠态 ——
  Object.keys(L.acts || {}).forEach(function (k) {
    var act = document.querySelector('[data-act="' + k + '"]');
    if (!act) return;
    var cfg = L.acts[k];
    var b = act.querySelector('.act-head .badge');
    if (b) b.outerHTML = badgeHtml(cfg);
    if (typeof cfg.open === 'boolean') act.open = cfg.open;
    else act.open = statusOf(cfg) === 'doing';
  });

  // —— 版本交付 chip + 里程碑表(lessons.ships):HTML 只放空占位,
  //    已交付的章 chip 填 chip 文本,未交付的占位整个移除——版本号永不手写 ——
  var ships = L.ships || [];
  Array.prototype.forEach.call(document.querySelectorAll('[data-ship]'), function (el) {
    var s = null;
    ships.forEach(function (t) { if (t.at === el.getAttribute('data-ship')) s = t; });
    if (s && s.chip) el.textContent = s.chip;
    else if (el.parentNode) el.parentNode.removeChild(el);
  });
  var mileBody = document.querySelector('[data-milestones]');
  if (mileBody) {
    mileBody.innerHTML = ships.map(function (s) {
      return '<tr><td class="ver">' + (s.ver || '—') + '</td><td>' + s.what +
        '</td><td class="range">' + s.range + '</td></tr>';
    }).join('');
  }

  // —— 页头「更新于」:全表最新完课日期(updated 可手动覆写) ——
  var upd = document.getElementById('hero-updated');
  if (upd) {
    var d = L.updated || '';
    if (!d) {
      Object.keys(L.lists).forEach(function (k) {
        var t = lastDone({ from: k });
        if (t > d) d = t;
      });
    }
    if (d) upd.textContent = '更新于 ' + d;
  }
})();
