/* REQ-003 小程序车辆详情页改造 样稿
   依据：REQ-003-小程序车辆详情页改造需求方案 v2.0（按第二轮变更 R2 改写）；底图取自 SRC-002 详情页参考图（线上现状）。
   本地演示数据与浏览器临时状态，不连接任何接口，不真实拨号。*/
(function () {
  'use strict';

  var state = {
    role: 'agent',        // agent 一级代理商 | agent2 二级代理商 | customer（R3-12 只有一级代理商看登记人）
    source: 'inventory', carId:'inventory-m6',  // inventory | firsthand | special
    noContact: false,     // 模拟统一联系人从未初始化
    marked: false,
    offline: false,       // 模拟车辆已下架（R2-19 标记清零）
    baseCount: 2
  };

  var marks={},refreshFav=function(){};
  function car(){return window.DemoCars.get(state.carId);}

  function $(s) { return document.querySelector(s); }

  function toast(msg) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 1800);
  }

  function count() { return state.baseCount + (state.marked ? 1 : 0); }

  function fabVisible() {
    return state.role === 'agent' && state.source !== 'special_price';
  }

  function render() {
    if (!$('#view-contact')) return;
    var c=car();
    window.DemoCarUI.gallery($('#view-contact .d-legacy-hero'),c,false);
    $('#view-contact .d-real-big').textContent=c.sale;
    $('#view-contact .d-real-lines s').textContent=c.ref;
    $('#view-contact .d-real-lines p:last-child span').textContent=c.sale;
    $('#view-contact .d-real-model-name').textContent=c.name;
    $('#d-blocks').innerHTML=c.blocks.map(function(src){return '<img src="'+src+'" alt="'+c.name+' 实拍">';}).join('');
    refreshFav();

    document.querySelectorAll('#d-role button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.role === state.role);
    });
    document.querySelectorAll('#d-source button').forEach(function (b) {
      b.classList.toggle('on', window.DemoCars.normalize(b.dataset.source) === state.source);
    });
    $('#d-nocontact').checked = state.noContact;
    $('#d-nocontact').closest('label').hidden = state.source !== 'firsthand';

    // 浮动钮：不满足条件时整个移除，不是置灰
    var fab = $('#d-fab');
    fab.hidden = !fabVisible();

    var why = $('#d-why');
    if (state.role === 'customer') {
      why.textContent = 'C 端客户视角：登记人浮动钮不显示，仍可查看车辆和收藏。';
      why.hidden = false;
    } else if (state.role === 'agent2') {
      why.textContent = '二级代理商视角：只有一级代理商能看登记人（R3-12），浮动钮不渲染。';
      why.hidden = false;
    } else if (state.source === 'special_price') {
      why.textContent = '特价车来自 PC 新车管理的商品体系，没有登记人，浮动钮不渲染。';
      why.hidden = false;
    } else {
      why.hidden = true;
    }

    if (!fabVisible()) closeSheet();
    renderSheet();
  }

  function renderSheet() {
    var empty = state.source === 'firsthand' && state.noContact;
    var c = car().contact;

    $('#d-name').textContent = empty ? '暂未配置' : c.name;
    $('#d-from').textContent = empty ? '4S 车源统一联系人' : c.from;

    var tel = $('#d-tel');
    tel.textContent = empty ? '暂未配置' : c.phone;
    tel.classList.toggle('disabled', empty);

    var mk = $('#d-mark');
    mk.classList.toggle('marked', state.marked);
    mk.textContent = state.marked ? '已标记疑似已售' : '疑似已售';
    $('#d-markcount').textContent = state.offline ? '车辆已下架，标记已清零（0 人标记）' : count() + ' 人标记';
    mk.disabled = state.offline;
  }

  // 手机内居中确认框，对应线上 u-modal（seller/index.vue 等多处在用）
  function dConfirm(title, body, onOk) {
    var wrap = $('#d-confirm');
    wrap.hidden = false;
    wrap.innerHTML = '<div class="m-dialog"><h4>' + title + '</h4><div class="m-dialog-body">' + body + '</div>' +
      '<div class="m-dialog-foot"><button id="dc-no">取消</button><button id="dc-ok">确认</button></div></div>';
    var close = function () { wrap.hidden = true; wrap.innerHTML = ''; };
    $('#dc-no').addEventListener('click', close);
    $('#dc-ok').addEventListener('click', function () { close(); onOk(); });
  }

  function openSheet() {
    if (!fabVisible()) return;
    $('#d-sheet').hidden = false;
    renderSheet();
  }
  function closeSheet() { var s = $('#d-sheet'); if (s) s.hidden = true; }

  function selectCar(id){
    var c=window.DemoCars.get(id);if(!c)return;
    state.carId=id;state.source=c.source;state.marked=!!marks[id];state.offline=false;state.baseCount=c.baseCount;
    $('#d-offline').checked=false;closeSheet();render();$('#view-contact .d-screen').scrollTop=0;
  }
  window.__setLegacyCar=selectCar;

  function bind() {
    if (!$('#view-contact')) return;

    $('#d-role').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      state.role = b.dataset.role; render();
    });
    $('#d-source').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var source=window.DemoCars.normalize(b.dataset.source);
      window.DemoCarUI.select(source==='inventory'?'inventory-m6':window.DemoCars.list(source)[0].id);
    });
    $('#d-nocontact').addEventListener('change', function (e) {
      state.noContact = e.target.checked; renderSheet();
    });

    refreshFav=window.DemoCarUI.bindFavorite($('#d-fav'),car);
    $('#d-fab').addEventListener('click', openSheet);
    $('#d-close').addEventListener('click', closeSheet);
    $('#d-mask').addEventListener('click', closeSheet);

    $('#d-tel').addEventListener('click', function () {
      if (this.classList.contains('disabled')) {
        toast('统一联系人暂未配置，拨打不可用');
        return;
      }
      toast('调起系统拨号：' + this.textContent);
    });

    // R2-16：标记与取消都要二次确认；取消只作用于本人那一个
    $('#d-mark').addEventListener('click', function () {
      if (state.marked) {
        dConfirm('是否确认取消？', '取消后只撤销你自己的这一次标记，不影响其他人标记的数量。', function () {
          state.marked = false; marks[state.carId]=false; renderSheet(); toast('已取消标记');
        });
      } else {
        dConfirm('是否确认已售？', '标记后登记人与总部能看到这台车可能已经卖出。你只能取消自己标的，不能取消别人的。', function () {
          state.marked = true; marks[state.carId]=true; renderSheet(); toast('已标记为疑似已售');
        });
      }
    });

    // R2-19：车辆一经下架，标记即清零
    $('#d-offline').addEventListener('change', function (e) {
      state.offline = e.target.checked;
      if (state.offline) { state.marked = false; state.baseCount = 0; }
      else { state.baseCount = state.source === 'firsthand' ? 1 : 2; }
      renderSheet();
      toast(state.offline ? '车辆已下架，疑似已售标记已清零' : '车辆已重新上架，计数从 0 重新累积');
    });

    render();

    // 便于核验时直接截到同一状态
    var q = new URLSearchParams(location.search);
    if (q.get('role') === 'customer') { state.role = 'customer'; render(); }
    if (q.get('src')) { var b = document.querySelector('#d-source button[data-source="' + q.get('src') + '"]'); if (b) b.click(); }
    if(q.get('car')&&window.DemoCars.get(q.get('car')))selectCar(q.get('car'));
    if (q.get('sheet') === '1') { openSheet(); }
    if (q.get('mark') === '1') { state.marked = true; openSheet(); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else { bind(); }
})();
