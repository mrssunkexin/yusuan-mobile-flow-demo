/* REQ-003 v2.7「我的收藏」样稿（R3-11）
   从「我的」页第 5 个入口进入；与两版详情共用 DemoCarUI.favorites。行样式同车辆列表页一行一台（REQ-008 第 3.6 节）。
   本地数据，不连接接口。元素 id 以 fav- 开头。*/
(function () {
  'use strict';
  var FAV=window.DemoCarUI.favorites;
  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function render() {
    var box = $('#fav-list'); if (!box) return;
    box.innerHTML = FAV.items().map(function (c) {
      return '<div class="l8-item" data-source="' + c.source + '" data-car-id="' + c.id + '">' +
        '<div class="l8-img fit"><img class="l8-pic" src="' + c.img + '" style="object-position:' + c.position + '" alt="' + esc(c.name) + '"></div>' +
        '<div class="l8-info"><div class="l8-name">' + esc(c.name) + '</div>' +
        '<div class="l8-p1"><span>官方指导价</span><s>' + (c.ref || '暂无') + '</s></div>' +
        '<div class="l8-p2"><span>预蒜价</span><b>' + (c.sale || '暂无') + '</b></div></div></div>';
    }).join('');
    $('#fav-empty').hidden = FAV.items().length > 0;
    $('#fav-more').hidden = FAV.items().length === 0;
  }
  window.__renderFav = render;
  window.addEventListener('demo-favorites-changed',render);

  function bind() {
    if (!$('#fav-list')) return;
    $('#fav-list').addEventListener('click', function (e) {
      var it = e.target.closest('.l8-item'); if (!it) return;
      window.DemoCarUI.open(it.dataset.carId);
    });
    var back = $('#fav-back');
    if (back) back.addEventListener('click', function () { if (window.__mobileBack) window.__mobileBack(); });
    window.addEventListener('hashchange', function () { if (location.hash === '#fav') render(); });
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
})();
