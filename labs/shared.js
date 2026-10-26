/* labs/shared.js —— 实验室共用小工具
   ----------------------------------------------------------------------------
   引入约定:COURSE.html 页尾先引本文件,再引各 lab-*.js(相对路径,同目录 labs/)。
   命名空间 window.Lab:
   · $id(id)      —— document.getElementById 简写,四家实验室原各自抄过一份;
   · fmt(v, n)    —— toFixed 包装,不传 n 默认 2 位;
   · chips(…​)    —— 芯片组互斥开关:点击高亮 .on 并回调 data 属性值,
                     返回 { sync(value) } 供程序侧反选(如 3B7 setPreset('blur'))。
                     list 传元素集合,attr 是 data- 属性名('k' 对应 data-k)。 */
window.Lab = {
  $id: function (id) { return document.getElementById(id); },

  fmt: function (v, n) { return v.toFixed(n == null ? 2 : n); },

  chips: function (list, attr, onSelect) {
    var els = Array.prototype.slice.call(list);
    function sync(value) {
      els.forEach(function (el) {
        el.classList.toggle('on', el.getAttribute('data-' + attr) === value);
      });
    }
    els.forEach(function (el) {
      el.addEventListener('click', function () {
        var v = el.getAttribute('data-' + attr);
        sync(v);
        if (onSelect) onSelect(v);
      });
    });
    return { sync: sync };
  }
};
