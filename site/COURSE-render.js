/* ============================================================================
   COURSE-render.js —— 课次渲染器(配 content/lessons.js)
   ----------------------------------------------------------------------------
   职责只有三件:
   · 把 content/lessons.js 的课次行填进 HTML 里的空容器 <ul data-lessons="key">;
   · 由数据推导幕头/章头徽章(🔥 进行中 / ✅ 完课·日期 / 未开始,拼图区:已拼上)
     与幕的折叠态(进行中展开,其余折叠;data 里 open 可强制覆写);
   · 页头「更新于」= 全表最新完课日期(data 的 updated 可手动覆写)。
   新增/修改课次只动 content/lessons.js,本文件与 COURSE.html 都不用碰。
   ============================================================================ */
(function () {
  var L = window.LESSONS;
  if (!L) return;

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
  var C = window.CARDS || {};
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
