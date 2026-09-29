/* REQ-008 小程序车辆列表页改造 样稿
   依据：REQ-008 v1.6；页面结构与尺寸照线上「我要寻车」列表页（00-原始需求/车辆列表页.PNG、mall-portal-itu/pages/shop/list.vue）。
   本地演示数据，不连接接口。元素 id 统一以 l8- 开头。上传天数按浏览器今天的日期实时计算。*/
(function () {
  'use strict';

  var A8 = 'assets/req-008/', A2 = 'assets/req-002/';
  var TITLES = { special_price: '特价车', firsthand: '一手车源', inventory: '库存车' };
  var PRICES = ['全部', '10万–15万', '15万–20万', '20万–30万'];
  var CATS = ['运损车', '包牌包税'];
  // 特价车：品牌来自现有商品品牌列表；车源：车型目录品牌＋最前面「其他品牌」
  var BRANDS = [['B', ['奔驰', '比亚迪']], ['C', ['长安']], ['F', ['丰田']], ['G', ['广汽传祺']], ['H', ['红旗']]];

  // R3-09：固定一行一台车，去掉列表／宫格切换
  var state = { entry: 'special_price', kw: '', brand: '', otherBrand: false, price: '全部', cats: [], draftCats: [], empty: false };

  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(msg) { var el = $('#toast'); if (!el) return; el.textContent = msg; el.classList.add('show'); setTimeout(function () { el.classList.remove('show'); }, 2000); }

  // 上传天数：只比日期；0 当天上传；1～99 汉字；≥100 阿拉伯数字（REQ-008 第 3.4 节）
  function cn(n) {
    var d = '零一二三四五六七八九';
    if (n === 2) return '两';            // 单独的 2 读作「两」：上传两天
    if (n < 10) return d[n];
    if (n === 10) return '十';
    if (n < 20) return '十' + d[n - 10];
    return d[Math.floor(n / 10)] + '十' + (n % 10 ? d[n % 10] : '');
  }
  function daysText(n) {
    if (n === null || n === undefined || n < 0) return '';
    if (n === 0) return '当天上传';
    return n < 100 ? '上传' + cn(n) + '天' : '上传' + n + '天';
  }
  window.__l8DaysText = daysText;   // 供核验调用

  function list() {
    if (state.empty) return [];
    return window.DemoCars.list(state.entry).filter(function (c) {
      if (state.kw && c.name.indexOf(state.kw) < 0) return false;
      if (state.otherBrand && !c.manual) return false;
      if (state.brand && c.brand !== state.brand) return false;
      if (state.price !== '全部' && c.chip !== state.price) return false;
      if (state.cats.length && !state.cats.some(function (k) { return c.cats.indexOf(k) >= 0; })) return false;
      return true;
    }).sort(function (a, b) {
      // R3-01：付费置顶的车排最前，多台之间按最近一次付款时间（top 越小越近）；其余按上架时间
      if ((a.top ? 0 : 1) !== (b.top ? 0 : 1)) return (a.top ? 0 : 1) - (b.top ? 0 : 1);
      if (a.top && b.top) return a.top - b.top;
      return a.days - b.days;
    });
  }

  function render() {
    document.querySelectorAll('#l8-entry button').forEach(function (b) { b.classList.toggle('on', b.dataset.entry === state.entry); });
    $('#l8-title').textContent = TITLES[state.entry];
    $('#l8-f-brand .t').textContent = state.otherBrand ? '其他品牌' : (state.brand || '全部');
    var cat = $('#l8-f-cat');
    cat.querySelector('.t').textContent = state.cats.length === 0 ? '类别' : (state.cats.length === 1 ? state.cats[0] : '类别(' + state.cats.length + ')');
    cat.classList.toggle('on', state.cats.length > 0);
    var box = $('#l8-list');
    box.classList.remove('grid'); box.classList.add('one');
    var rows = list();
    box.innerHTML = rows.map(function (c) {
      // 三类示例照片均按正方形取景，数据按具体车辆 ID 进入详情
      return '<div class="l8-item" data-src="' + state.entry + '" data-car-id="' + c.id + '">' +
        '<div class="l8-img' + (state.entry === 'special_price' ? ' fit' : '') + '"><img class="l8-pic" src="' + c.img + '" alt="' + esc(c.name) + '" style="object-position:' + c.position + '">' +
        (c.video ? '<span class="l8-video">▶</span>' : '') + '</div>' +
        '<div class="l8-info"><div class="l8-name">' + esc(c.name) + '</div>' +
        (c.chip ? '<div class="l8-chip">' + c.chip + '</div>' : '') +
        '<div class="l8-p1"><span>官方指导价</span><s>' + (c.ref || '暂无') + '</s></div>' +
        '<div class="l8-p2"><span>预蒜价</span><b>' + (c.sale || '暂无') + '</b></div>' +
        '<div class="l8-days">' + daysText(c.days) + '</div></div></div>';
    }).join('');
    $('#l8-emptybox').hidden = rows.length > 0;
    $('#l8-more').hidden = rows.length === 0;
  }

  function sheet(id, show) { $(id).hidden = !show; }

  function renderBrandPage() {
    var car = state.entry !== 'special_price';
    var html = '<div class="l8-bgroup"><div class="l8-bcell" data-all="1">不限</div>' +
      (car ? '<div class="l8-bcell other" data-other="1">其他品牌</div>' : '') + '</div>';
    html += BRANDS.map(function (g) {
      return '<div class="l8-anchor">' + g[0] + '</div><div class="l8-bgroup">' +
        g[1].map(function (b) { return '<div class="l8-bcell" data-brand="' + b + '">' + b + '</div>'; }).join('') + '</div>';
    }).join('');
    $('#l8-brand-list').innerHTML = html;
  }

  function renderCatSheet() {
    $('#l8-cat-opts').innerHTML = CATS.map(function (k) {
      return '<button type="button" class="l8-cat' + (state.draftCats.indexOf(k) >= 0 ? ' on' : '') + '" data-cat="' + k + '">' + k + '</button>';
    }).join('');
  }

  function bind() {
    if (!$('#view-list008')) return;

    $('#l8-entry').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      // 从首页卡片进入时清空上次筛选（REQ-008 第 3.1 节）
      state.entry = b.dataset.entry; state.kw = ''; state.brand = ''; state.otherBrand = false; state.price = '全部'; state.cats = [];
      $('#l8-kw').value = '';
      render();
    });
    $('#l8-empty').addEventListener('change', function (e) { state.empty = e.target.checked; render(); });
    $('#l8-search').addEventListener('click', function () { state.kw = $('#l8-kw').value.trim(); render(); });

    // 品牌：进入选品牌页；车源入口最前面有「其他品牌」
    $('#l8-f-brand').addEventListener('click', function () { renderBrandPage(); sheet('#l8-brand-page', true); });
    $('#l8-brand-back').addEventListener('click', function () { sheet('#l8-brand-page', false); });
    $('#l8-brand-list').addEventListener('click', function (e) {
      var c = e.target.closest('.l8-bcell'); if (!c) return;
      state.otherBrand = !!c.dataset.other; state.brand = (c.dataset.other || c.dataset.all) ? '' : c.dataset.brand;
      sheet('#l8-brand-page', false); render();
    });

    // 价格：沿用现有底部滚轮（样稿用列表示意）
    $('#l8-f-price').addEventListener('click', function () {
      $('#l8-price-opts').innerHTML = PRICES.map(function (p) { return '<div class="l8-popt' + (p === state.price ? ' on' : '') + '" data-p="' + p + '">' + p + '</div>'; }).join('');
      $('#l8-f-price').classList.add('on'); sheet('#l8-price-sheet', true);
    });
    $('#l8-price-opts').addEventListener('click', function (e) {
      var o = e.target.closest('.l8-popt'); if (!o) return;
      document.querySelectorAll('#l8-price-opts .l8-popt').forEach(function (x) { x.classList.toggle('on', x === o); });
    });
    function closePrice() { $('#l8-f-price').classList.remove('on'); sheet('#l8-price-sheet', false); }
    $('#l8-price-cancel').addEventListener('click', closePrice);
    $('#l8-price-mask').addEventListener('click', closePrice);
    $('#l8-price-ok').addEventListener('click', function () {
      var o = $('#l8-price-opts .l8-popt.on'); state.price = o ? o.dataset.p : '全部'; closePrice(); render();
    });

    // 类别：底部多选面板，点「确定」才生效
    $('#l8-f-cat').addEventListener('click', function () { state.draftCats = state.cats.slice(); renderCatSheet(); sheet('#l8-cat-sheet', true); });
    $('#l8-cat-opts').addEventListener('click', function (e) {
      var b = e.target.closest('.l8-cat'); if (!b) return;
      var k = b.dataset.cat, i = state.draftCats.indexOf(k);
      if (i >= 0) state.draftCats.splice(i, 1); else state.draftCats.push(k);
      renderCatSheet();
    });
    $('#l8-cat-reset').addEventListener('click', function () { state.draftCats = []; renderCatSheet(); });
    $('#l8-cat-ok').addEventListener('click', function () { state.cats = state.draftCats.slice(); sheet('#l8-cat-sheet', false); render(); });
    $('#l8-cat-mask').addEventListener('click', function () { sheet('#l8-cat-sheet', false); });

    $('#l8-list').addEventListener('click', function (e) {
      var it = e.target.closest('.l8-item'); if (!it) return;
      window.DemoCarUI.open(it.dataset.carId);
    });

    render();

    // 便于核验时直接打开到同一状态
    var q = new URLSearchParams(location.search);
    if (q.get('l8entry') && TITLES[q.get('l8entry')]) { state.entry = q.get('l8entry'); render(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
})();
