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
  // 供各业务文件里真实的返回箭头调用，取代原来弹提示的假返回
  window.__mobileBack = back;

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

  // 「我的」页：登录入口与底部导航（截图上叠透明按钮，图片本身不变）
  function bindUserPage() {
    var login = document.getElementById('mu-login');
    if (login) login.addEventListener('click', function () { goto('login009', {}); });
    var admin = document.getElementById('mu-admin');
    if (admin) admin.addEventListener('click', function () { goto('login009', {}); });
    var tabHome = document.getElementById('mu-tab-home');
    if (tabHome) tabHome.addEventListener('click', function () { goto('home002', {}); });
    // 「我要比价」等其余按钮不在本次范围，不绑定，保持点了没反应
  }

  // 代理商后台首页的格子：「车源登记」进登记列表，「线索管理」进销售线索，
  // 「返回主页」「退出后台」回「我的」；车源登记页顶部「‹」按来路返回
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
    var phHome = document.getElementById('ph-home');
    if (phHome) phHome.addEventListener('click', function () { goto('user', {}); });
    var phLogout = document.getElementById('ph-logout');
    if (phLogout) phLogout.addEventListener('click', function () { goto('user', {}); });
    var invBack = document.getElementById('inv-back');
    if (invBack) invBack.addEventListener('click', back);
  }

  // 车辆列表页格子点击 → 车源详情（特价车沿用现状商品详情，不在本次范围，保留原提示）；
  // 列表页、详情页左上角返回箭头 → 回上一页
  function bindListClick() {
    var list = document.getElementById('l8-list');
    if (list) list.addEventListener('click', function (e) {
      var it = e.target.closest('.l8-item');
      if (!it) return;
      if (it.dataset.src === 'special_price') return; // 保留原有提示，不跳转
      e.stopImmediatePropagation();
      goto('contact2', { source: it.dataset.src });
    }, true);
    var l8Back = document.getElementById('l8-top-back');
    if (l8Back) l8Back.addEventListener('click', back);
    var d2Back = document.getElementById('d2-back');
    if (d2Back) d2Back.addEventListener('click', back);
  }

  // C 端首页（iframe，同源）：隐藏样稿自带的评审工具条／说明栏，手机内容按屏宽等比缩放；
  // 三个入口卡片点击 → 车辆列表页
  function bindHomeFrame() {
    var frame = document.getElementById('home002-frame');
    if (!frame) return;
    function wire() {
      var doc = frame.contentDocument;
      if (!doc) return;
      var style = doc.createElement('style');
      style.textContent = '.toolbar{display:none!important}#notes-box{display:none!important}' +
        '.layout{display:block!important}.wrap{padding:0!important;margin:0!important;max-width:none!important}' +
        '.left-col{position:static!important;width:100%!important}';
      doc.head.appendChild(style);
      // 整体缩小到 80%：手机壳（.phone）连同内部滚动区、公告栏、底部导航一起变矮，
      // 一屏就能看全，不需要外层页面再多滚一截，避免内层能滚、外层还要再滚一点
      // 这种嵌套滚动在 iOS 上经常卡住交接不过去的问题。用 zoom 不用 transform：
      // zoom 是真的按比例改变布局大小，.phone 内部绝对定位的公告栏、底部导航
      // 仍然按缩小后的尺寸正确摆放，不会错位。
      var ZOOM = 0.8;
      doc.documentElement.style.zoom = ZOOM;
      frame.style.width = Math.round(390 * ZOOM) + 'px';
      frame.style.height = Math.round(844 * ZOOM) + 'px';
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
      // 底部导航「我的」是图片，右三分之一叠一个透明按钮，图片本身不动
      var tabbar = doc.querySelector('.tabbar');
      if (tabbar && !tabbar.querySelector('.mf-user-hot')) {
        // .tabbar 自身已是 position:fixed（现状样式），本来就是有效的定位上下文，不用再改它的定位方式
        var hot = doc.createElement('button');
        hot.type = 'button';
        hot.className = 'mf-user-hot';
        hot.style.cssText = 'position:absolute;right:0;top:0;width:33%;height:100%;background:transparent;border:0;';
        hot.addEventListener('click', function (e) { e.stopImmediatePropagation(); goto('user', {}); });
        tabbar.appendChild(hot);
      }
    }
    if (frame.contentDocument && frame.contentDocument.readyState === 'complete') wire();
    frame.addEventListener('load', wire);
  }

  // 不再监听样稿自己上报的高度——iframe 固定 390×844（CSS 里定），公告栏、底部导航、
  // 内部滚动区都是照这个固定尺寸算的，跟着内容动态改高度反而会和上报时机对不上，见记录。

  function boot() {
    bindUserPage();
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
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
