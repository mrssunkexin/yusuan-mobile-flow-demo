/* REQ-003 车辆详情页 · 含车辆信息（另一版样稿）
   与「车辆详情页改造」样稿并列，原样稿不动，用于对比详情页要不要增加车辆信息。
   本地演示数据，不连接接口，不真实拨号。本页元素 id 统一以 d2- 开头，避免与其他样稿重名。*/
(function () {
  'use strict';

  var state = { role: 'agent', source: 'inventory', carId:'inventory-m6', marked: false };
  var marks={};
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
    document.querySelector('#view-contact2 .d2-info').hidden=c.source==='special_price';
    $('#d2-big').textContent = c.sale;
    $('#d2-ref').textContent = c.ref;
    $('#d2-sale').textContent = c.sale;
    $('#d2-name').textContent = c.name;
    $('#d2-src').textContent = c.srcLabel;
    $('#d2-color-out').textContent = c.colorOut;
    $('#d2-color-in').textContent = c.colorIn;
    $('#d2-vtypes').textContent = c.vtypes.join('、') || '普通车';
    $('#d2-region').textContent = c.region;
    $('#d2-labels').innerHTML = c.labels.map(function (l) {
      return '<span class="d2-label">' + esc(l) + '</span>';
    }).join('');
    $('#d2-remark').textContent = c.remark;
    $('#d2-blocks').innerHTML = c.blocks.map(function (src) {
      return '<img src="' + esc(src) + '" alt="车辆详情图片">';
    }).join('');

    // R3-12：浮钮只给一级代理商；二级代理商、C 端客户整个不渲染
    $('#d2-fab').hidden = state.role !== 'agent' || c.source === 'special_price';
    refreshFav();
    if ($('#d2-fab').hidden) closeSheet();
    renderSheet();
  }

  function renderSheet() {
    var c = car();
    $('#d2-c-name').textContent = c.contact.name;
    $('#d2-c-from').textContent = c.contact.from;
    $('#d2-c-tel').textContent = c.contact.phone;
    var mk = $('#d2-mark');
    mk.classList.toggle('marked', state.marked);
    mk.textContent = state.marked ? '已标记疑似已售' : '疑似已售';
    $('#d2-markcount').textContent = (c.baseCount + (state.marked ? 1 : 0)) + ' 人标记';
  }

  // 手机内居中确认框，对应线上 u-modal
  function confirmBox(title, onOk) {
    var wrap = $('#d2-confirm');
    wrap.hidden = false;
    wrap.innerHTML = '<div class="m-dialog"><h4>' + title + '</h4>' +
      '<div class="m-dialog-foot"><button id="d2-dc-no">取消</button><button id="d2-dc-ok">确认</button></div></div>';
    var close = function () { wrap.hidden = true; wrap.innerHTML = ''; };
    $('#d2-dc-no').addEventListener('click', close);
    $('#d2-dc-ok').addEventListener('click', function () { close(); onOk(); });
  }

  function openSheet() {
    if (state.role !== 'agent' || state.source === 'special_price') return;
    $('#d2-sheet').hidden = false;
    renderSheet();
  }
  function closeSheet() { var s = $('#d2-sheet'); if (s) s.hidden = true; }

  function selectCar(id) {
    var c=window.DemoCars.get(id);if(!c)return;
    state.carId=id;state.source=c.source;state.marked=!!marks[id];closeSheet();render();
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
    $('#d2-c-tel').addEventListener('click', function () {
      toast('调起系统拨号：' + this.textContent);
    });
    $('#d2-mark').addEventListener('click', function () {
      if (state.marked) {
        confirmBox('是否确认取消？', function () { state.marked = false; marks[state.carId]=false; renderSheet(); toast('已取消标记'); });
      } else {
        confirmBox('是否确认已售？', function () { state.marked = true; marks[state.carId]=true; renderSheet(); toast('已标记为疑似已售'); });
      }
    });

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
