/* REQ-003 车辆详情页 · 含车辆信息（已采用；v2.11：车辆编号、车辆位置、特价车浮钮、一键拨号后确认已售；2026-10-29：上传时间、特价车显示车辆信息区）
   与「车辆详情页改造」样稿并列，原样稿不动，用于对比详情页要不要增加车辆信息。
   本地演示数据，不连接接口，不真实拨号。本页元素 id 统一以 d2- 开头，避免与其他样稿重名。*/
(function () {
  'use strict';

  var state = { role: 'agent', source: 'inventory', carId:'inventory-m6' };
  var refreshFav=function(){};

  function $(s) { return document.querySelector(s); }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function toast(msg) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 1800);
  }

  function car() { return window.DemoCars.get(state.carId); }

  function render() {
    document.querySelectorAll('#d2-role button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.role === state.role);
    });
    document.querySelectorAll('#d2-source button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.source === state.source);
    });

    var c = car();
    window.DemoCarUI.gallery(document.querySelector('#view-contact2 .d2-swiper'),c,c.source!=='special_price');
    // 2026-10-29：特价车也显示车辆信息区，与库存车、一手车源同一结构
    document.querySelector('#view-contact2 .d2-info').hidden=false;
    $('#d2-big').textContent = c.sale;
    $('#d2-ref').textContent = c.ref;
    $('#d2-sale').textContent = c.sale;
    $('#d2-name').textContent = c.name;
    // 三类车的车辆编号都放在车辆信息区第一行，第二行上传时间（最后一次上架日期）；车名下面不再单独显示编号
    var special = c.source === 'special_price';
    $('#d2-src').textContent = c.srcLabel;
    $('#d2-vno-row').hidden = !c.vehicleNo;
    $('#d2-vno').textContent = c.vehicleNo || '';
    $('#d2-up-row').hidden = !c.listedAt;
    $('#d2-uptime').textContent = c.listedAt || '';
    $('#d2-color-out').textContent = c.colorOut || '暂无';
    $('#d2-color-in').textContent = c.colorIn || '暂无';
    $('#d2-location').textContent = c.location || '暂无';
    $('#d2-labels').innerHTML = c.labels.length ? c.labels.map(function (l) {
      return '<span class="d2-label">' + esc(l) + '</span>';
    }).join('') : '<p class="d2-remark">暂无</p>';
    $('#d2-remark').textContent = c.remark;
    $('#d2-blocks').innerHTML = c.blocks.map(function (src) {
      return '<img src="' + esc(src) + '" alt="车辆详情图片">';
    }).join('');

    // R3-12：浮钮只给一级代理商；二级代理商、C 端客户整个不渲染。v2.11 起特价车也显示
    $('#d2-fab').hidden = state.role !== 'agent';
    document.querySelector('#view-contact2 .d-phone').classList.toggle('is-special', special);
    refreshFav();
    if ($('#d2-fab').hidden) closeSheet();
    renderSheet();
  }

  function renderSheet() {
    var c = car();
    $('#d2-c-name').textContent = c.contact.name;
    $('#d2-c-from').textContent = c.contact.from;
    $('#d2-c-tel').textContent = c.contact.phone;
  }

  function dial() {
    window.DemoCarUI.dial({ car: car(), wrap: $('#d2-confirm'), currentId: function () { return state.carId; } });
  }

  function openSheet() {
    if (state.role !== 'agent') return;
    $('#d2-sheet').hidden = false;
    renderSheet();
  }
  function closeSheet() { var s = $('#d2-sheet'); if (s) s.hidden = true; }

  function selectCar(id) {
    var c=window.DemoCars.get(id);if(!c)return;
    state.carId=id;state.source=c.source;closeSheet();var cf=$('#d2-confirm');cf.hidden=true;cf.innerHTML='';render();
    document.querySelector('#view-contact2 .d-screen').scrollTop=0;
  }
  window.__setDetailCar=selectCar;

  function bind() {
    if (!$('#view-contact2')) return;

    $('#d2-role').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      state.role = b.dataset.role; render();
    });
    $('#d2-source').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var source=b.dataset.source; window.DemoCarUI.select(source==='inventory'?'inventory-m6':window.DemoCars.list(source)[0].id);
    });
    $('#d2-fab').addEventListener('click', openSheet);
    refreshFav=window.DemoCarUI.bindFavorite($('#d2-fav'),car);
    $('#d2-close').addEventListener('click', closeSheet);
    $('#d2-mask').addEventListener('click', closeSheet);
    // v2.11：手机号与「一键拨号」都直接拨；拨完回到本页弹「车源是否已售？」（特价车不弹）
    $('#d2-c-tel').addEventListener('click', dial);
    $('#d2-dial').addEventListener('click', dial);

    render();

    // 便于核验时直接打开到同一状态
    var q = new URLSearchParams(location.search);
    if (q.get('d2role') === 'customer') { state.role = 'customer'; render(); }
    if (q.get('d2src')) { var rows=window.DemoCars.list(q.get('d2src')); if(rows.length)selectCar(rows[0].id); }
    if(q.get('car')&&window.DemoCars.get(q.get('car')))selectCar(q.get('car'));
    if (q.get('d2sheet') === '1') { openSheet(); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else { bind(); }
})();
