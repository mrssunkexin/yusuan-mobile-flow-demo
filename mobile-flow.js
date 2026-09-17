/* 手机端整体流程演示 —— 只做「点了去哪」的跳转串联，不改任何业务规则、字段与页面内容。
   业务文件（app.js、req-00x-*.js）保持不动；本文件通过已暴露的 window.showPrototypeView
   和各业务文件里已加的 window.__mobileNav 钩子完成跳转，钩子不存在时（例如仍打开旧的
   index.html 评审工具）各业务文件按原有行为执行，不受影响。 */
(function () {
  'use strict';
  document.documentElement.classList.add('mobile-app');
  document.body.classList.add('mobile-app');

  var stack = [];

  function realShow(view) {
    if (window.showPrototypeView) window.showPrototypeView(view);
  }

  function setInventoryMode(mode) {
    var el = document.getElementById('view-inventory');
    if (!el) return;
    el.classList.toggle('mf-mode-list', mode === 'list');
  }

  function click(sel) {
    var el = document.querySelector(sel);
    if (el) el.click();
  }

  function afterShow(view, opts) {
    opts = opts || {};
    if (view === 'inventory') {
      setInventoryMode(opts.mode === 'list' ? 'list' : 'entry');
      if (opts.mode === 'list') {
        setTimeout(function () {
          var stage = document.querySelector('#view-inventory .mobile-stage:not(.entry-stage)');
          if (stage) stage.scrollIntoView({ block: 'start' });
        }, 30);
      }
    }
    if (view === 'list008' && opts.entry) {
      setTimeout(function () { click('#l8-entry [data-entry="' + opts.entry + '"]'); }, 30);
    }
    if (view === 'contact2') {
      var source = opts.source === 'firsthand' ? 'firsthand' : 'inventory';
      setTimeout(function () {
        click('#d2-source [data-source="' + source + '"]');
        click('#d2-role [data-role="agent"]');
      }, 30);
    }
    window.scrollTo(0, 0);
    updateBar(view);
  }

  function goto(view, opts) {
    stack.push({ view: view, opts: opts });
    realShow(view);
    afterShow(view, opts);
  }

  function back() {
    if (stack.length <= 1) return;
    stack.pop();
    var top = stack[stack.length - 1];
    realShow(top.view);
    afterShow(top.view, top.opts);
  }

  window.__mobileNav = function (action) {
    if (!action || !action.view) return;
    goto(action.view, action);
  };

  var VIEW_LABEL = {
    home002: 'C端首页', list008: '车辆列表', contact2: '车辆详情', inventory: '车源登记／代理商后台',
    login009: '商户登录／4S店登录', clue010: '销售线索'
  };

  function updateBar(view) {
    var t = document.getElementById('mf-title');
    if (t) t.textContent = VIEW_LABEL[view] || view;
    var b = document.getElementById('mf-back');
    if (b) b.disabled = stack.length <= 1;
  }

  function buildBar() {
    var bar = document.createElement('div');
    bar.id = 'mf-bar';
    bar.innerHTML =
      '<button type="button" id="mf-back">‹ 返回</button>' +
      '<span class="mf-title" id="mf-title"></span>' +
      '<button type="button" data-go="home002">C端首页</button>' +
      '<button type="button" data-go="login009">登录</button>' +
      '<button type="button" data-go="clue010">线索</button>';
    document.body.insertBefore(bar, document.body.firstChild);
    bar.querySelector('#mf-back').addEventListener('click', back);
    bar.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { goto(b.dataset.go, {}); });
    });
  }

  // 登录页默认预填一个可用账号，点登录即可（不用手输）。l9-phone 在页面一加载就已渲染，
  // 不需要等视图切换，直接填，避免自动化连续点击时出现的时序竞争。
  function prefillLogin() {
    var sm = document.getElementById('l9-s-mobile'), sp = document.getElementById('l9-s-pwd');
    if (sm) sm.value = '13800001234';
    if (sp) sp.value = '07123X';
    var mm = document.getElementById('l9-m-mobile'), mc = document.getElementById('l9-m-code');
    if (mm) mm.value = '13600001111';
    if (mc) mc.value = '123456';
  }

  // 代理商后台首页的格子：「车源登记」进登记列表，「线索管理」进销售线索
  function bindClueEntry() {
    var b = document.getElementById('entry-clue');
    if (b) b.addEventListener('click', function (e) {
      e.stopImmediatePropagation();
      goto('clue010', {});
    }, true);
    var back10 = document.getElementById('l10-back');
    if (back10) back10.addEventListener('click', function (e) {
      e.stopImmediatePropagation();
      goto('inventory', { mode: 'entry' });
    }, true);
    var carSrc = document.getElementById('entry-car-source');
    if (carSrc) carSrc.addEventListener('click', function () {
      // 只切换显示模式；app.js 自带的滚动高亮效果一并保留，互不冲突
      goto('inventory', { mode: 'list' });
    });
  }

  // 车辆列表页格子点击 → 车源详情（特价车沿用现状商品详情，不在本次范围，保留原提示）
  function bindListClick() {
    var list = document.getElementById('l8-list');
    if (!list) return;
    list.addEventListener('click', function (e) {
      var it = e.target.closest('.l8-item');
      if (!it) return;
      if (it.dataset.src === 'special_price') return; // 保留原有提示，不跳转
      e.stopImmediatePropagation();
      goto('contact2', { source: it.dataset.src });
    }, true);
  }

  // C 端首页（iframe，同源）：隐藏样稿自带的评审工具条／说明栏，手机内容按屏宽等比缩放；
  // 三个入口卡片点击 → 车辆列表页
  function bindHomeFrame() {
    var frame = document.getElementById('home002-frame');
    if (!frame) return;
    function fitPhone(doc) {
      var phone = doc.querySelector('.phone');
      var stage = doc.querySelector('.stage') || (phone && phone.parentElement);
      if (!phone || !stage) return;
      var avail = frame.clientWidth || window.innerWidth;
      var natural = phone.classList.contains('small') ? 375 : 390;
      var scale = Math.min(1, avail / natural);
      phone.style.transform = 'scale(' + scale + ')';
      phone.style.transformOrigin = 'top center';
      stage.style.height = (844 * scale) + 'px';
      stage.style.display = 'flex';
      stage.style.justifyContent = 'center';
    }
    function wire() {
      var doc = frame.contentDocument;
      if (!doc) return;
      var style = doc.createElement('style');
      style.textContent = '.toolbar{display:none!important}#notes-box{display:none!important}' +
        '.layout{display:block!important}.wrap{padding:0!important;margin:0!important;max-width:none!important}' +
        '.left-col{position:static!important;width:100%!important}';
      doc.head.appendChild(style);
      fitPhone(doc);
      window.addEventListener('resize', function () { fitPhone(doc); });
      doc.querySelectorAll('.op-card').forEach(function (card) {
        card.addEventListener('click', function (e) {
          var entry = card.getAttribute('data-entry');
          if (!entry) {
            var carousel = card.querySelector('[data-entry]');
            entry = carousel ? carousel.getAttribute('data-entry') : null;
          }
          if (!entry) return;
          e.stopImmediatePropagation();
          goto('list008', { entry: entry });
        }, true);
      });
    }
    if (frame.contentDocument && frame.contentDocument.readyState === 'complete') wire();
    frame.addEventListener('load', wire);
  }

  // REQ-002 样稿按自身高度撑开 iframe（原 index.html 里的同一段逻辑）
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'req002-height') return;
    var frame = document.getElementById('home002-frame');
    if (frame) frame.style.height = e.data.height + 'px';
  });

  function boot() {
    buildBar();
    bindClueEntry();
    bindListClick();
    bindHomeFrame();
    prefillLogin();
    // 切到 4S 店登录页时，业务代码会清空手机号密码框（换个人重填的现状逻辑），
    // 这里补一次预填，不改业务清空这一行为本身
    var toStaff = document.getElementById('l9-m-entry');
    if (toStaff) toStaff.addEventListener('click', function () { setTimeout(prefillLogin, 0); });
    // 真实用户打开小程序，第一屏是 C 端首页
    stack = [{ view: 'home002', opts: {} }];
    realShow('home002');
    updateBar('home002');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
