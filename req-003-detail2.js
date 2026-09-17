/* REQ-003 车辆详情页 · 含车辆信息（另一版样稿）
   与「车辆详情页改造」样稿并列，原样稿不动，用于对比详情页要不要增加车辆信息。
   本地演示数据，不连接接口，不真实拨号。本页元素 id 统一以 d2- 开头，避免与其他样稿重名。*/
(function () {
  'use strict';

  var CARS = {
    inventory: {
      name: '广汽传祺 传祺M6 MAX 2026款 1.5T DCT 尊荣版',
      sale: '10.XX万', ref: '11.98万', srcLabel: '库存车',
      colorOut: '珍珠白', colorIn: '曜石黑', vtypes: ['运损车'], region: '广东省 广州市',
      labels: ['现车', '可分期', '支持置换'],
      remark: '左后门运输中有轻微划痕，已原厂修复，不影响使用；手续齐全，可当天提车。',
      media: 6, video: true,
      blocks: [
        { t: 'text', v: '2026 年 8 月出厂，未上牌，里程为运输里程。' },
        { t: 'img', v: 'assets/req-003/detail-car-front.png?v=1' },
        { t: 'text', v: '车头格栅与大灯完好，两把钥匙、随车工具、说明书齐全。' }
      ],
      contact: { name: '张伟', phone: '138 0000 1234', from: '车源登记人' },
      baseCount: 2
    },
    firsthand: {
      name: '广汽传祺 传祺M6 MAX 2026款 1.5T DCT 尊荣版',
      sale: '11.XX万', ref: '11.98万', srcLabel: '一手车源',
      colorOut: '星河灰', colorIn: '云岩棕', vtypes: ['包牌包税'], region: '江苏省 南京市',
      labels: ['现车', '全国可上牌'],
      remark: '4S 店现车，价格含购置税与上牌费用。',
      media: 4, video: false,
      blocks: [
        { t: 'text', v: '4S 店展厅现车，可到店看车试驾。' },
        { t: 'img', v: 'assets/req-003/detail-car-front.png?v=1' }
      ],
      contact: { name: '李静', phone: '138 0000 5678', from: '4S 车源统一联系人' },
      baseCount: 1
    }
  };

  var state = { role: 'agent', source: 'inventory', marked: false };

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

  function car() { return CARS[state.source]; }

  function render() {
    document.querySelectorAll('#d2-role button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.role === state.role);
    });
    document.querySelectorAll('#d2-source button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.source === state.source);
    });

    var c = car();
    $('#d2-media').textContent = '1/' + c.media;
    $('#d2-video').hidden = !c.video;
    $('#d2-big').textContent = c.sale;
    $('#d2-ref').textContent = c.ref;
    $('#d2-sale').textContent = c.sale;
    $('#d2-name').textContent = c.name;
    $('#d2-src').textContent = c.srcLabel;
    $('#d2-color-out').textContent = c.colorOut;
    $('#d2-color-in').textContent = c.colorIn;
    $('#d2-vtypes').textContent = c.vtypes.join('、');
    $('#d2-region').textContent = c.region;
    $('#d2-labels').innerHTML = c.labels.map(function (l) {
      return '<span class="d2-label">' + esc(l) + '</span>';
    }).join('');
    $('#d2-remark').textContent = c.remark;
    $('#d2-blocks').innerHTML = c.blocks.map(function (b) {
      return b.t === 'text' ? '<p>' + esc(b.v) + '</p>' : '<img src="' + esc(b.v) + '" alt="车辆详情图片">';
    }).join('');

    // 浮钮只给代理商；C 端客户整个不渲染
    $('#d2-fab').hidden = state.role !== 'agent';
    if (state.role !== 'agent') closeSheet();
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
    if (state.role !== 'agent') return;
    $('#d2-sheet').hidden = false;
    renderSheet();
  }
  function closeSheet() { var s = $('#d2-sheet'); if (s) s.hidden = true; }

  function bind() {
    if (!$('#view-contact2')) return;

    $('#d2-role').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      state.role = b.dataset.role; render();
    });
    $('#d2-source').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      state.source = b.dataset.source; state.marked = false; render();
    });
    $('#d2-fab').addEventListener('click', openSheet);
    $('#d2-close').addEventListener('click', closeSheet);
    $('#d2-mask').addEventListener('click', closeSheet);
    $('#d2-c-tel').addEventListener('click', function () {
      toast('调起系统拨号：' + this.textContent);
    });
    $('#d2-mark').addEventListener('click', function () {
      if (state.marked) {
        confirmBox('是否确认取消？', function () { state.marked = false; renderSheet(); toast('已取消标记'); });
      } else {
        confirmBox('是否确认已售？', function () { state.marked = true; renderSheet(); toast('已标记为疑似已售'); });
      }
    });

    render();

    // 便于核验时直接打开到同一状态
    var q = new URLSearchParams(location.search);
    if (q.get('d2role') === 'customer') { state.role = 'customer'; render(); }
    if (q.get('d2src') === 'firsthand') { state.source = 'firsthand'; render(); }
    if (q.get('d2sheet') === '1') { openSheet(); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else { bind(); }
})();
