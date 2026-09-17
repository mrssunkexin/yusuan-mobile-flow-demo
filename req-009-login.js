/* REQ-009 小程序 4S 店登录 样稿
   依据：REQ-009 v1.0；页面照线上「商户登录」页（00-原始需求/登录页.PNG、mall-portal-itu/pages/seller/sellerLogin.vue）。
   本地演示数据，不连接接口。元素 id 统一以 l9- 开头。*/
(function () {
  'use strict';

  var A9 = 'assets/req-009/', A8 = 'assets/req-008/';
  // 演示员工表（itu_staff_4s）：手机号 → 状态、身份证号（后六位即密码）
  var STAFF = {
    '13800001234': { status: 1, idCard: '11010519900307123X' },
    '13800005678': { status: 0, idCard: '320102198811224567' }
  };
  var state = { page: 'merchant', busy: false, requests: 0 };
  var toastTimer = null;

  function $(id) { return document.getElementById(id); }

  function top(title, backId) {
    return '<div class="l9-top"><img class="l9-status" src="' + A9 + 'nav-status.png?v=1" alt="状态栏">' +
      '<div class="l8-navrow"><img class="l8-back" id="' + backId + '" src="' + A8 + 'nav-back.png?v=2" alt="返回">' +
      '<span class="l8-title">' + title + '</span>' +
      '<img class="l8-capsule" src="' + A8 + 'nav-capsule.png?v=2" alt="胶囊按钮"></div></div>';
  }

  function head(hello) {
    return '<img class="l9-banner" src="' + A9 + 'banner.png?v=1" alt="轮播图">' +
      '<div class="l9-logo"><img src="' + A9 + 'logo.png?v=1" alt="logo"></div>' +
      '<div class="l9-hello">HELLO&emsp;' + hello + '</div>';
  }

  function item(inputHtml, icon, extra) {
    return '<div class="l9-item">' + inputHtml + (extra || '') +
      '<img class="l9-ico" src="' + A9 + icon + '?v=1" alt=""></div>';
  }

  function render() {
    var phone = $('l9-phone');
    if (!phone) return;
    phone.innerHTML =
      // 商户登录（现状页面，只加一个按钮）
      '<div class="l9-page" id="l9-p-merchant">' + top('商户登录', 'l9-m-back') +
        '<div class="l9-screen">' + head('欢迎登录商户后台') +
          '<div class="l9-form">' +
            item('<input id="l9-m-mobile" type="text" placeholder="请输入手机号">', 'icon-tel.png', '<span class="l9-send" id="l9-m-send">发送验证码</span>') +
            item('<input id="l9-m-code" type="text" maxlength="6" placeholder="请输入验证码">', 'icon-lock.png') +
          '</div>' +
          '<div class="l9-login" id="l9-m-login">登录</div>' +
          '<div class="l9-entry" id="l9-m-entry">4S店登录</div>' +
          '<div class="l9-copy">Copyright ©2022 预蒜版权所有</div>' +
        '</div></div>' +
      // 4S 店登录（新页面）
      '<div class="l9-page" id="l9-p-staff" hidden>' + top('4S店登录', 'l9-s-back') +
        '<div class="l9-screen">' + head('欢迎登录4S店后台') +
          '<div class="l9-form">' +
            item('<input id="l9-s-mobile" type="tel" maxlength="11" placeholder="请输入手机号">', 'icon-tel.png') +
            item('<input id="l9-s-pwd" type="password" maxlength="6" placeholder="请输入密码">', 'icon-lock.png') +
          '</div>' +
          '<div class="l9-login" id="l9-s-login">登录</div>' +
          '<div class="l9-copy">Copyright ©2022 预蒜版权所有</div>' +
        '</div></div>' +
      '<div class="l9-loading" id="l9-loading" hidden><div>登录中</div></div>' +
      '<div class="l9-toast" id="l9-toast" hidden></div>';
    bind();
  }

  function toast(text) {
    var t = $('l9-toast');
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2200);
  }

  function go(page) {
    state.page = page;
    ['merchant', 'staff'].forEach(function (p) { $('l9-p-' + p).hidden = p !== page; });
    $('l9-toast').hidden = true;
    if (page === 'staff') { $('l9-s-mobile').value = ''; $('l9-s-pwd').value = ''; }
  }

  function merchantLogin() {
    var m = $('l9-m-mobile').value.trim();
    if (!m) return toast('请输入手机号');
    if (!$('l9-m-code').value) return toast('请输入手机验证码');
    if (STAFF[m]) return toast('4S店员工请点击下方【4S店登录】');
    // 手机端整体流程演示：非4S号码视为代理商验证码登录成功，进代理商后台首页（入口页）
    if (window.__mobileNav) { window.__mobileNav({ view: 'inventory', mode: 'entry' }); return; }
    toast('验证码登录流程不变');
  }

  function staffLogin() {
    if (state.busy) return;
    var m = $('l9-s-mobile').value.trim();
    var pw = $('l9-s-pwd').value;
    if (!m) return toast('请输入手机号');
    if (!/^1\d{10}$/.test(m)) return toast('请输入正确的11位手机号');
    if (!pw) return toast('请输入密码');
    pw = pw.toUpperCase();
    if (!/^\d{5}[\dX]$/.test(pw)) return toast('请输入6位密码');
    state.busy = true;
    state.requests += 1;
    $('l9-loading').hidden = false;
    setTimeout(function () {
      $('l9-loading').hidden = true;
      state.busy = false;
      var s = STAFF[m];
      if (!s) return toast('该手机号未开通4S店账号，请联系总部管理员');
      if (s.status !== 1) return toast('账号已停用，请联系总部管理员');
      if (s.idCard.slice(-6) !== pw) return toast('密码错误');
      // redirectTo 车源登记页：4S 员工登录后不经过后台首页，直接进车源登记页（REQ-009 第 3.4 节）
      go('merchant');
      if (window.__mobileNav) { window.__mobileNav({ view: 'inventory', mode: 'list' }); return; }
      window.location.hash = 'inventory';
      setTimeout(function () {
        var stage = document.querySelector('#view-inventory .mobile-stage');
        if (!stage) return;
        // 窄屏时左侧导航变成顶部吸顶条，滚动要让开它，车源登记页标题才不会被挡住
        var nav = document.querySelector('.side-nav'), cover = 0;
        if (nav) {
          var r = nav.getBoundingClientRect(), p = getComputedStyle(nav).position;
          if ((p === 'sticky' || p === 'fixed') && r.width > window.innerWidth / 2) cover = r.height;
        }
        window.scrollTo(0, Math.max(0, stage.getBoundingClientRect().top + window.scrollY - cover - 8));
      }, 60);
    }, 700);
  }

  function fill(mobile, pwd) {
    if (state.page !== 'staff') go('staff');
    $('l9-s-mobile').value = mobile;
    $('l9-s-pwd').value = pwd;
  }

  function bind() {
    $('l9-m-back').addEventListener('click', function () {
      if (window.__mobileBack) window.__mobileBack(); else toast('返回「我的」');
    });
    $('l9-m-send').addEventListener('click', function () { toast('验证码已发送'); });
    $('l9-m-login').addEventListener('click', merchantLogin);
    $('l9-m-entry').addEventListener('click', function () { go('staff'); });
    $('l9-s-back').addEventListener('click', function () { go('merchant'); });
    $('l9-s-login').addEventListener('click', staffLogin);

    var mark = $('l9-mark');
    if (mark) mark.addEventListener('change', function () { $('l9-m-entry').classList.toggle('mark', mark.checked); });
    var fills = document.querySelectorAll('#view-login009 [data-fill]');
    Array.prototype.forEach.call(fills, function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-fill').split('|');
        fill(v[0], v[1]);
      });
    });
    var reset = $('l9-reset');
    if (reset) reset.addEventListener('click', function () { go('merchant'); });
  }

  window.__l9 = { state: state, go: go };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
