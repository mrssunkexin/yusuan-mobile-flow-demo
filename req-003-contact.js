/* REQ-003 小程序车辆详情页改造 样稿
   依据：REQ-003-小程序车辆详情页改造需求方案 v2.0（按第二轮变更 R2 改写），v2.11 去掉疑似已售、改为一键拨号后确认已售；底图取自 SRC-002 详情页参考图（线上现状）。
   本地演示数据与浏览器临时状态，不连接任何接口，不真实拨号。*/
(function () {
  'use strict';

  var state = {
    role: 'agent',        // agent 一级代理商 | agent2 二级代理商 | customer（R3-12 只有一级代理商看登记人）
    source: 'inventory', carId:'inventory-m6',  // inventory | firsthand | special
    noContact: false      // 模拟统一联系人从未初始化
  };

  var refreshFav=function(){};
  function car(){return window.DemoCars.get(state.carId);}

  function $(s) { return document.querySelector(s); }

  function toast(msg) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 1800);
  }

  // R3-12 只有一级代理商；v2.11 起特价车也显示（联系人为总部统一联系人）
  function fabVisible() {
    return state.role === 'agent';
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

    $('#d-dial').disabled = empty;
  }

  // 一键拨号与点手机号相同；拨完回到本页弹「车源是否已售？」（REQ-003 第 6 节，特价车不弹）
  function dial() {
    if ($('#d-tel').classList.contains('disabled')) {
      toast('统一联系人暂未配置，拨打不可用');
      return;
    }
    window.DemoCarUI.dial({ car: car(), wrap: $('#d-confirm'), currentId: function () { return state.carId; } });
  }

  function openSheet() {
    if (!fabVisible()) return;
    $('#d-sheet').hidden = false;
    renderSheet();
  }
  function closeSheet() { var s = $('#d-sheet'); if (s) s.hidden = true; }

  function selectCar(id){
    var c=window.DemoCars.get(id);if(!c)return;
    state.carId=id;state.source=c.source;
    var cf=$('#d-confirm');cf.hidden=true;cf.innerHTML='';closeSheet();render();$('#view-contact .d-screen').scrollTop=0;
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

    $('#d-tel').addEventListener('click', dial);
    $('#d-dial').addEventListener('click', dial);

    render();

    // 便于核验时直接截到同一状态
    var q = new URLSearchParams(location.search);
    if (q.get('role') === 'customer') { state.role = 'customer'; render(); }
    if (q.get('src')) { var b = document.querySelector('#d-source button[data-source="' + q.get('src') + '"]'); if (b) b.click(); }
    if(q.get('car')&&window.DemoCars.get(q.get('car')))selectCar(q.get('car'));
    if (q.get('sheet') === '1') { openSheet(); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else { bind(); }
})();
