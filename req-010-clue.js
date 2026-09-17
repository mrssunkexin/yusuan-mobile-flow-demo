/* REQ-010 小程序线索一键拨号 样稿
   依据：REQ-010 v1.0；页面照线上「销售线索」页（用户 2026-09-15 截图、mall-portal-itu/pages/seller/clueList.vue）。
   本地演示数据，不真实拨号。元素 id 统一以 l10- 开头。*/
(function () {
  'use strict';

  var A9 = 'assets/req-009/', A8 = 'assets/req-008/';
  var TYPES = [
    { label: '浏览线索', value: 'browse_clues', cls: 'w0' },
    { label: '销售线索', value: 'reserve_price', cls: 'w0' },
    { label: '9.9元查车线索', value: 'car_search_clues', cls: 'w1' }
  ];
  // 与截图一致的两条销售线索（top_price、reserve_price 都显示为「销售线索」）
  var DATA = [
    { id: 1, category: 'reserve_price', time: '2026-09-06 16:40:12', rows: [['线索地', '吉林省长春市南关区康宇路'], ['手机号', '18686636658'], ['兴趣车辆', '2026款传祺M8 HEV 至尊版（运损车）'], ['归属店铺', '孙可鑫']] },
    { id: 2, category: 'reserve_price', time: '2026-09-06 16:39:53', rows: [['手机号', '18686636658'], ['兴趣车辆', '无'], ['归属店铺', '孙可鑫'], ['来源', '每日特价']] }
  ];
  var state = { os: 'ios', filter: '', noPhone: false, pending: '' };
  var toastTimer = null;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function phoneOf(item) {
    if (state.noPhone && item.id === 2) return '';
    var r = item.rows.filter(function (x) { return x[0] === '手机号'; })[0];
    return r ? r[1] : '';
  }

  function render() {
    var phone = $('l10-phone');
    if (!phone) return;
    phone.innerHTML =
      '<div class="l9-top"><img class="l9-status" src="' + A9 + 'nav-status.png?v=1" alt="状态栏">' +
        '<div class="l8-navrow"><img class="l8-back" id="l10-back" src="' + A8 + 'nav-back.png?v=2" alt="返回">' +
        '<span class="l8-title">销售线索</span><img class="l8-capsule" src="' + A8 + 'nav-capsule.png?v=2" alt="胶囊按钮"></div></div>' +
      '<div class="l10-screen">' +
        '<div class="l10-select"><span class="l10-level" id="l10-level">本级线索<i></i></span>' +
          '<span class="l10-chips">' + TYPES.map(function (t) {
            return '<span class="l10-chip ' + t.cls + '" data-type="' + t.value + '">' + t.label + '</span>';
          }).join('') + '</span></div>' +
        '<div class="l10-total" id="l10-total"></div>' +
        '<div class="l10-list" id="l10-list"></div>' +
        '<div class="l10-empty" id="l10-empty" hidden><div class="l8-empty-ico"></div>暂无数据</div>' +
        '<div class="l10-more" id="l10-more">没有更多数据了</div>' +
      '</div>' +
      '<div class="l10-alert-wrap" id="l10-alert" hidden><div class="l10-alert"><div class="l10-alert-t" id="l10-alert-t"></div>' +
        '<div class="l10-alert-b"><span id="l10-alert-cancel">取消</span><span class="ok" id="l10-alert-ok">呼叫</span></div></div></div>' +
      '<div class="l10-sheet-wrap" id="l10-sheet" hidden><div class="l10-sheet"><div class="l10-sheet-i" id="l10-sheet-num"></div>' +
        '<div class="l10-sheet-i" id="l10-sheet-call">呼叫</div><div class="l10-sheet-gap"></div><div class="l10-sheet-i" id="l10-sheet-cancel">取消</div></div></div>' +
      '<div class="l9-toast" id="l10-toast" hidden></div>';
    bind();
    renderList();
  }

  function renderList() {
    var list = DATA.filter(function (d) { return !state.filter || d.category === state.filter; });
    $('l10-total').textContent = '已获线索数量:' + list.length + '条';
    $('l10-empty').hidden = list.length > 0;
    $('l10-more').hidden = list.length === 0;
    $('l10-list').innerHTML = list.map(function (d) {
      var p = phoneOf(d);
      var rows = d.rows.map(function (r) {
        var val = r[0] === '手机号' ? '<span class="l10-tel" data-tel="' + esc(p) + '">' + esc(p) + '</span>' : esc(r[1]);
        return '<div class="l10-row"><span class="l">' + r[0] + '</span><span class="r">' + val + '</span></div>';
      }).join('');
      // 拨号键放在现有卡片范围内右下角（绝对定位），卡片不加高；有拨号键时最后一行右侧留白
      var dial = p.trim() ? '<span class="l10-dial" data-tel="' + esc(p) + '"><i class="l10-ico" aria-hidden="true"></i>拨号</span>' : '';
      return '<div class="l10-item' + (dial ? ' has-dial' : '') + '" data-id="' + d.id + '"><div class="l10-head"><span class="l10-tag">销售线索</span><span class="l10-time">' + d.time + '</span></div>' +
        '<div class="l10-info">' + rows + '</div>' + dial + '</div>';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('#l10-phone .l10-chip'), function (c) {
      c.classList.toggle('current', c.getAttribute('data-type') === state.filter);
    });
    var mark = $('l10-mark');
    Array.prototype.forEach.call(document.querySelectorAll('#l10-list .l10-dial'), function (b) {
      b.classList.toggle('mark', !!(mark && mark.checked));
    });
  }

  function toast(text) {
    var t = $('l10-toast');
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2200);
  }

  // 现有 call()：苹果直接 makePhoneCall（系统确认）；其他手机先 showActionSheet「号码／呼叫」
  function call(tel) {
    state.pending = tel;
    if (state.os === 'ios') {
      $('l10-alert-t').textContent = tel;
      $('l10-alert').hidden = false;
    } else {
      $('l10-sheet-num').textContent = tel;
      $('l10-sheet').hidden = false;
    }
  }

  function dialed() {
    $('l10-alert').hidden = true;
    $('l10-sheet').hidden = true;
    toast('调起系统拨号：' + state.pending);
  }

  function closeAll() {
    $('l10-alert').hidden = true;
    $('l10-sheet').hidden = true;
  }

  function bind() {
    $('l10-back').addEventListener('click', function () { toast('返回后台首页'); });
    $('l10-level').addEventListener('click', function () { toast('本级／下级线索切换不变'); });
    Array.prototype.forEach.call(document.querySelectorAll('#l10-phone .l10-chip'), function (c) {
      c.addEventListener('click', function () {
        var v = c.getAttribute('data-type');
        state.filter = state.filter === v ? '' : v;
        renderList();
      });
    });
    $('l10-list').addEventListener('click', function (e) {
      var btn = e.target.closest('.l10-dial, .l10-tel');
      if (btn) { e.stopPropagation(); if (btn.getAttribute('data-tel')) call(btn.getAttribute('data-tel')); return; }
    });
    $('l10-alert-cancel').addEventListener('click', closeAll);
    $('l10-alert-ok').addEventListener('click', dialed);
    $('l10-sheet-call').addEventListener('click', dialed);
    $('l10-sheet-cancel').addEventListener('click', closeAll);
    $('l10-sheet').addEventListener('click', function (e) { if (e.target === $('l10-sheet')) closeAll(); });

    Array.prototype.forEach.call(document.querySelectorAll('#l10-os button'), function (b) {
      b.addEventListener('click', function () {
        state.os = b.getAttribute('data-os');
        Array.prototype.forEach.call(document.querySelectorAll('#l10-os button'), function (x) { x.classList.toggle('on', x === b); });
        closeAll();
      });
    });
    var np = $('l10-nophone');
    if (np) np.addEventListener('change', function () { state.noPhone = np.checked; renderList(); });
    var mark = $('l10-mark');
    if (mark) mark.addEventListener('change', renderList);
  }

  window.__l10 = { state: state };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
