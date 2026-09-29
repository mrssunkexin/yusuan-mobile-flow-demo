/* REQ-003 v2.4「我的收藏」样稿（R3-11）
   从「我的」页第 5 个入口进入；与详情页底部「收藏」共用 window.__favStore。行样式同车辆列表页一行一台（REQ-008 第 3.6 节）。
   本地数据，不连接接口。元素 id 以 fav- 开头。*/
(function () {
  'use strict';
  var FAV = window.__favStore = window.__favStore || { items: [] };
  if (!FAV.seeded) {
    FAV.seeded = true;
    FAV.items.push({ key: 'car-firsthand', source: 'firsthand', name: '广汽传祺 传祺M6 MAX 2026款 1.5T DCT 尊荣版', sale: '11.XX万', ref: '11.98万', img: 'assets/req-008/list-car-1.png' });
  }
  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function render() {
    var box = $('#fav-list'); if (!box) return;
    box.innerHTML = FAV.items.map(function (c) {
      return '<div class="l8-item" data-source="' + c.source + '">' +
        '<div class="l8-img fit"><img class="l8-pic" src="' + c.img + '" alt="车图"></div>' +
        '<div class="l8-info"><div class="l8-name">' + esc(c.name) + '</div>' +
        '<div class="l8-p1"><span>官方指导价</span><s>' + (c.ref || '暂无') + '</s></div>' +
        '<div class="l8-p2"><span>预蒜价</span><b>' + (c.sale || '暂无') + '</b></div></div></div>';
    }).join('');
    $('#fav-empty').hidden = FAV.items.length > 0;
    $('#fav-more').hidden = FAV.items.length === 0;
  }
  window.__renderFav = render;

  function bind() {
    if (!$('#fav-list')) return;
    $('#fav-list').addEventListener('click', function (e) {
      var it = e.target.closest('.l8-item'); if (!it) return;
      var src = it.dataset.source;
      if (window.__mobileNav) { window.__mobileNav({ view: 'contact2', source: src }); return; }
      window.location.hash = 'contact2';
      setTimeout(function () { var b = document.querySelector('#d2-source [data-source="' + src + '"]'); if (b) b.click(); }, 30);
    });
    var back = $('#fav-back');
    if (back) back.addEventListener('click', function () { if (window.__mobileBack) window.__mobileBack(); });
    window.addEventListener('hashchange', function () { if (location.hash === '#fav') render(); });
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
})();
