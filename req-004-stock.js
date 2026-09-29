/* REQ-004 PC 车源管理样稿
   依据：REQ-004-PC车源管理需求方案 v2.0（按第二轮变更 R2 改写）。本地演示数据，不连接接口。*/
(function () {
  'use strict';

  var BRANDS = [
    ['宝马', '530Li', 428000, 469000], ['丰田', '凯美瑞', 198000, 239000], ['奥迪', 'Q5L', 368000, 429000],
    ['奔驰', 'C260L', 315000, 358000], ['比亚迪', '汉DM', 228000, 259000], ['理想', 'L7', 339800, 379800],
    ['大众', '途观L', 186000, 229000], ['本田', '雅阁', 209000, 239800], ['特斯拉', 'Model Y', 263900, 288900],
    ['别克', '昂科威', 168000, 219000], ['坦克', '500', 335000, 369000], ['长安', '启源A07', 129900, 165900]
  ];
  var PEOPLE = ['张三', '李四', '王五', '赵六', '陈婷', '刘洋', '周敏', '吴刚', '孙丽', '高远', '郑凯', '许静'];
  var ORGS = ['华东名车行', '安信汽车', '德仁二手车', '天成车业', '优选好车', '新能源体验店',
    '众诚车行', '诚新二手车', '未来出行', '宏达名车', '杭州滨江4S店', '上海浦东4S店'];
  var CITY = [['浙江省', '杭州市', '余杭区'], ['江苏省', '南京市', '鼓楼区'], ['广东省', '深圳市', '南山区'],
    ['上海市', '上海市', '浦东新区'], ['北京市', '北京市', '朝阳区'], ['四川省', '成都市', '高新区']];

  function D(days) { return new Date(Date.now() + days * 86400000); }
  var rows = BRANDS.map(function (b, i) {
    var is4s = i >= 10;
    return {
      id: '18' + String(1517386574692651010 + i * 7919).slice(2),
      srcType: is4s ? '一手车源' : '库存车',
      // R2-04 车辆类型＝商品分类，可多选
      vtypes: [['运损车'], ['包牌包税'], ['新能源', '包牌包税'], ['运损车', '库存尾款车'], ['新能源'],
               ['平行进口'], ['包牌包税'], ['运损车'], ['新能源'], ['库存尾款车'], ['包牌包税'], ['运损车']][i],
      labels: i % 2 ? ['现车', '可分期'] : ['支持置换'],
      // R2-11 审核状态与上下架两个维度
      approve: i < 3 ? '未审核' : i === 3 ? '不通过' : '通过',
      opinion: i === 3 ? '照片不清晰，请补拍车身正面与内饰' : '',
      auditAt: i === 3 ? '2026-09-12 09:20' : (i >= 4 ? '2026-09-11 15:30' : ''),
      auditor: i === 3 ? '总部 admin' : (i >= 4 ? '总部 admin' : ''),
      // R3-07 详情只放图片；R3-01 去掉推荐，演示两台置顶中的车（结束时间按打开页面的时刻往后算）
      detailPics: i % 5 === 0 ? 2 : 0,
      topEnd: i === 5 ? new Date(Date.now() + 3 * 86400000) : i === 8 ? new Date(Date.now() + 9 * 86400000) : null,
      // 每次付款买下的时段：未置顶时从付款时刻起，续期时从原结束时间起（REQ-001 第 2.17、3.20 节）
      topOrders: i === 5 ? [{ pay: D(-4), money: 9.9, days: 7, start: D(-4), end: D(3) }]
        : i === 8 ? [{ pay: D(-1), money: 9.9, days: 7, start: D(2), end: D(9) }, { pay: D(-5), money: 9.9, days: 7, start: D(-5), end: D(2) }] : [],
      video: i % 4 === 0,
      brand: b[0], model: b[1], name: b[0] + ' ' + b[1], price: b[2], guide: b[3],
      person: PEOPLE[i], org: is4s ? ORGS[10 + (i - 10)] : ORGS[i],
      city: CITY[i % 6],
      time: '2026-09-' + String(11 - (i % 9)).padStart(2, '0') + ' 1' + (i % 9) + ':2' + (i % 6),
      views: [126, 85, 212, 96, 138, 176, 67, 104, 198, 59, 143, 88][i],
      sold: [0, 0, 3, 1, 0, 0, 2, 0, 5, 0, 1, 0][i],
      on: [false, false, false, false, true, true, false, true, true, false, true, true][i],
      color: ['黑色', '白色', '灰色'][i % 3], inner: ['米色', '黑色'][i % 2],
      remark: i % 3 === 0 ? '个人一手，原版原漆，支持检测' : '暂无备注',
      ops: []
    };
  });

  var q = { code: '', brand: '', model: '', person: '', org: '', srctype: '', approve: '', shelf: '', vtype: '', prov: '', city: '', dist: '', from: '', to: '', sort: 'time' };
  var page = 1, size = 20;

  function $(s) { return document.querySelector(s); }
  function money(n) { return n.toLocaleString('zh-CN') + ' 元'; }   // 详情弹窗用，带单位
  function num(n) { return n.toLocaleString('zh-CN'); }                // 列表用，单位写在表头
  function toast(m) { var e = $('#toast'); if (!e) return; e.textContent = m; e.classList.add('show'); setTimeout(function () { e.classList.remove('show'); }, 1800); }
  function cityText(c) { return c[0] === c[1] ? c[1] + ' ' + c[2] : c.join(' '); }
  function p2(n) { return String(n).padStart(2, '0'); }
  function fmt(d, full) { return (full ? d.getFullYear() + '-' : '') + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()); }
  function isTop(r) { return !!(r.topEnd && r.topEnd > new Date()); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function filtered() {
    var list = rows.filter(function (r) {
      if (q.code && r.id.indexOf(q.code) === -1) return false;
      if (q.brand && r.brand.indexOf(q.brand) === -1) return false;
      if (q.model && r.model.indexOf(q.model) === -1) return false;
      if (q.person && r.person.indexOf(q.person) === -1) return false;
      if (q.org && r.org.indexOf(q.org) === -1) return false;
      if (q.srctype && r.srcType !== q.srctype) return false;
      // 审核状态与上下架是两个独立条件，各自筛
      if (q.approve && r.approve !== q.approve) return false;
      if (q.shelf === '在售' && !r.on) return false;
      if (q.shelf === '已下架' && r.on) return false;
      // 车辆类型单选，该车带有即命中（一台车可有多个类型）
      if (q.vtype && r.vtypes.indexOf(q.vtype) === -1) return false;
      if (q.prov && r.city[0] !== q.prov) return false;
      if (q.city && r.city[1] !== q.city) return false;
      if (q.dist && r.city[2] !== q.dist) return false;
      if (q.from && r.time.slice(0, 10) < q.from) return false;
      if (q.to && r.time.slice(0, 10) > q.to) return false;
      return true;
    });
    list.sort(function (a, b) {
      // R2-11 细则4：未审核排最前，照搬线上 ORDER BY CASE WHEN audit_status = 0 THEN 0 ELSE 1 END
      var pa = a.approve === '未审核' ? 0 : 1, pb = b.approve === '未审核' ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (q.sort === 'sold') return b.sold - a.sold;
      if (q.sort === 'views') return b.views - a.views;
      return a.time < b.time ? 1 : -1;
    });
    return list;
  }

  function render() {
    if (!$('#view-stock')) return;
    var list = filtered();
    var stat = { total: list.length, pend: 0, on: 0, off: 0, views: 0 };
    list.forEach(function (r) { if (r.approve === '未审核') stat.pend++; r.on ? stat.on++ : stat.off++; stat.views += r.views; });
    $('#s-total').textContent = stat.total;
    $('#s-pend').textContent = stat.pend;
    $('#s-on').textContent = stat.on;
    $('#s-off').textContent = stat.off;
    $('#s-views').textContent = stat.views.toLocaleString('zh-CN');

    var maxPage = Math.max(1, Math.ceil(list.length / size));
    if (page > maxPage) page = maxPage;
    var slice = list.slice((page - 1) * size, page * size);

    $('#stock-body').innerHTML = slice.map(function (r, i) {
      return '<tr' + (r.sold >= 3 ? ' class="row-warn"' : '') + '>' +
        '<td>' + ((page - 1) * size + i + 1) + '</td>' +
        '<td class="cell-id">' + r.id + '</td>' +
        '<td><span class="tag2 ' + (r.srcType === '库存车' ? 't-inv' : 't-4s') + '">' + r.srcType + '</span></td>' +
        '<td>' + r.vtypes.map(function (t) { return '<span class="tag2">' + t + '</span>'; }).join(' ') + '</td>' +
        '<td>' + esc(r.name) + '</td>' +
        '<td>' + num(r.price) + '</td>' +
        '<td>' + r.person + '</td>' +
        '<td>' + esc(r.org) + '</td>' +
        '<td>' + cityText(r.city) + '</td>' +
        '<td>' + r.time + '</td>' +
        '<td>' + r.views + '</td>' +
        '<td>' + (r.sold ? '<b class="sold">' + r.sold + ' 人</b>' : '<span class="muted">—</span>') + '</td>' +
        '<td>' + approveChip(r.approve) + '</td>' +
        '<td>' + (r.approve === '通过'
          ? '<span class="status-dot' + (r.on ? ' on' : '') + '">' + (r.on ? '在售' : '已下架') + '</span>'
          : '<span class="muted">—</span>') + '</td>' +
        '<td>' + (isTop(r) ? '<span class="top-until">至 ' + fmt(r.topEnd) + '</span>' : '') + '</td>' +
        '<td><div class="table-actions">' +
        (r.approve === '未审核'
          ? '<button class="primary" data-act="approve" data-id="' + r.id + '">审核</button>'
          : '<button data-act="detail" data-id="' + r.id + '">查看</button>') +
        (r.approve === '通过'
          ? (r.on ? '<button class="danger" data-act="off" data-id="' + r.id + '">下架</button>'
                  : '<button data-act="on" data-id="' + r.id + '">上架</button>')
          : '') +
        (isTop(r) ? '<button data-act="untop" data-id="' + r.id + '">取消置顶</button>' : '') +
        '</div></td></tr>';
    }).join('');

    $('#stock-empty').hidden = list.length !== 0;
    var any = ['code', 'brand', 'model', 'person', 'org', 'srctype', 'approve', 'shelf', 'vtype', 'prov', 'city', 'dist', 'from', 'to'].some(function (k) { return q[k]; });
    $('#stock-empty').textContent = any ? '没有查询到匹配的车辆' : '暂无车源';
    $('#stock-total').textContent = '共 ' + list.length + ' 条';
    $('#stock-page').textContent = page + ' / ' + maxPage;
    $('#stock-prev').disabled = page <= 1;
    $('#stock-next').disabled = page >= maxPage;
  }

  // 状态配色照线上 carSalesRegistration.vue 的 statusMap
  function approveChip(a) {
    var c = a === '未审核' ? '#999' : a === '通过' ? '#158a36' : '#F5222D';
    return '<span class="ap-chip" style="color:' + c + '">' + a + '</span>';
  }
  // 品牌→车型、省→市→区县：每级第一项都是「不限」
  function fillSel(sel, anyText, list, keep) {
    var e = $(sel), old = keep ? e.value : '';
    e.innerHTML = '<option value="">' + anyText + '</option>' +
      list.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('');
    if (old && list.indexOf(old) > -1) e.value = old;
  }
  function uniq(a) { return a.filter(function (x, i) { return x && a.indexOf(x) === i; }); }
  function fillBrand() {
    fillSel('#q-brand', '不限品牌', uniq(rows.map(function (r) { return r.brand; })));
    fillModel();
  }
  function fillModel() {
    var b = $('#q-brand').value;
    fillSel('#q-model', '不限车型', uniq(rows.filter(function (r) { return !b || r.brand === b; }).map(function (r) { return r.model; })), true);
  }
  function fillProv() {
    fillSel('#q-prov', '不限省', uniq(rows.map(function (r) { return r.city[0]; })));
    fillCity();
  }
  function fillCity() {
    var p = $('#q-prov').value;
    fillSel('#q-city', '不限市', uniq(rows.filter(function (r) { return !p || r.city[0] === p; }).map(function (r) { return r.city[1]; })), true);
    fillDist();
  }
  function fillDist() {
    var p = $('#q-prov').value, c = $('#q-city').value;
    fillSel('#q-dist', '不限区县', uniq(rows.filter(function (r) {
      return (!p || r.city[0] === p) && (!c || r.city[1] === c);
    }).map(function (r) { return r.city[2]; })), true);
  }

  function byId(id) { return rows.filter(function (r) { return r.id === id; })[0]; }
  function closeModal() { $('#modal-root').innerHTML = ''; }

  function confirmBox(title, body, onOk, okText) {
    $('#modal-root').innerHTML = '<div class="modal-backdrop"><div class="modal" style="width:min(480px,100%)">' +
      '<div class="modal-header"><h2>' + esc(title) + '</h2><button class="modal-close" id="k-x">×</button></div>' +
      '<div class="modal-body"><p style="margin:0">' + body + '</p></div>' +
      '<div class="modal-footer"><button class="ghost" id="k-no">取消</button><button class="primary" id="k-yes">' + (okText || '确定') + '</button></div></div></div>';
    $('#k-x').addEventListener('click', closeModal);
    $('#k-no').addEventListener('click', closeModal);
    $('#k-yes').addEventListener('click', function () { closeModal(); onOk(); });
  }

  function doOff(r, fromDetail) {
    confirmBox('下架车源',
      '确定下架 <b>' + r.id + '　' + esc(r.name) + '</b>？<br><br>下架后小程序端不再展示，记录、主键与历史保留。<br><b>该车的「疑似已售」标记将清零</b>（R2-19）。',
      function () {
        r.on = false;
        r.sold = 0;                 // R2-19 下架即清零
        r.ops.unshift({ t: '2026-09-13 23:10', who: '总部 admin', act: '下架' });
        toast('已下架，疑似已售标记已清零');
        render();
        if (fromDetail) openDetail(r);
      });
  }

  // R2-14 总部也可以上架
  function doOn(r, fromDetail) {
    confirmBox('上架车源',
      '确定上架 <b>' + r.id + '　' + esc(r.name) + '</b>？<br><br>上架后小程序端恢复展示。总部只做上下架、不改车辆信息，因此不触发重新审核。',
      function () {
        r.on = true;
        r.ops.unshift({ t: '2026-09-13 23:12', who: '总部 admin', act: '上架' });
        toast('已上架');
        render();
        if (fromDetail) openDetail(r);
      });
  }

  // R2-18 审核弹窗：照搬线上售车登记 ApprovalSave 的字段与校验
  function openApprove(r) {
    $('#modal-root').innerHTML = '<div class="modal-backdrop"><div class="modal large">' +
      '<div class="modal-header"><h2>审核车源 ' + approveChip(r.approve) + '</h2><button class="modal-close" id="a-x">×</button></div>' +
      '<div class="modal-body">' +
      vehicleDl(r) +
      '<h3 class="ops-title">审核</h3>' +
      '<div class="form-grid">' +
      '<label class="form-field"><span>审核结果（必填）</span>' +
      '<span class="seg2" id="a-seg"><button type="button" data-ap="通过" class="on">通过</button><button type="button" data-ap="不通过">驳回</button></span></label>' +
      '<label class="form-field full"><span>审核意见</span><textarea id="a-op" maxlength="256" placeholder="选「驳回」时必填，最多 256 字"></textarea></label>' +
      '<div class="field-error form-field full" id="a-err"></div>' +
      '</div></div>' +
      '<div class="modal-footer"><button class="ghost" id="a-cancel">取消</button><button class="primary" id="a-ok">提交审核</button></div>' +
      '</div></div>';
    var pick = '通过';
    Array.prototype.forEach.call(document.querySelectorAll('[data-ap]'), function (b) {
      b.addEventListener('click', function () {
        pick = b.dataset.ap;
        Array.prototype.forEach.call(document.querySelectorAll('[data-ap]'), function (x) { x.classList.remove('on'); });
        b.classList.add('on');
      });
    });
    $('#a-x').addEventListener('click', closeModal);
    $('#a-cancel').addEventListener('click', closeModal);
    $('#a-ok').addEventListener('click', function () {
      var op = $('#a-op').value.trim();
      if (pick === '不通过' && !op) { $('#a-err').textContent = '请输入审核意见'; return; }
      r.approve = pick;
      r.opinion = op;
      r.auditAt = '2026-09-13 23:20';
      r.auditor = '总部 admin';
      if (pick === '通过') { r.on = true; r.ops.unshift({ t: r.auditAt, who: r.auditor, act: '审核通过' }); }
      else { r.on = false; r.sold = 0; r.ops.unshift({ t: r.auditAt, who: r.auditor, act: '审核驳回：' + op }); }
      closeModal(); render();
      toast(pick === '通过' ? '已通过，车辆已上架' : '已驳回，已通知登记人');
    });
  }

  // 车辆信息只读表：详情与审核弹窗共用，字段口径同 REQ-001 第 2.6 节 18 项，R2 新增五项不得缺
  function vehicleDl(r) {
    var pics = '<div class="pic-row">' +
      [1, 2, 3].map(function (i) { return '<span class="pic-thumb">图 ' + i + '</span>'; }).join('') +
      (r.video ? '<span class="pic-thumb vid">▶ 视频</span>' : '') + '</div>';
    var blocks = r.detailPics
      ? '<div class="pic-row">' + Array.apply(null, Array(r.detailPics)).map(function (x, k) { return '<span class="pic-thumb">详情图 ' + (k + 1) + '</span>'; }).join('') + '</div>'
      : '<span class="muted">未添加</span>';
    return '<div class="detail-grid two">' +
      '<dt>车辆 ID</dt><dd>' + r.id + '</dd>' +
      '<dt>车源类型</dt><dd>' + r.srcType + '</dd>' +
      '<dt>车辆类型</dt><dd>' + (r.vtypes.length ? r.vtypes.join('、') : '<span class="muted">未选</span>') + '</dd>' +
      '<dt>标签</dt><dd>' + (r.labels.length ? r.labels.join('、') : '<span class="muted">无</span>') + '</dd>' +
      '<dt>品牌</dt><dd>' + esc(r.brand) + '</dd>' +
      '<dt>车型</dt><dd>' + esc(r.model) + '</dd>' +
      '<dt>外观颜色</dt><dd>' + r.color + '</dd>' +
      '<dt>内饰颜色</dt><dd>' + r.inner + '</dd>' +
      '<dt>官方指导价</dt><dd>' + money(r.guide) + '</dd>' +
      '<dt>实际售价</dt><dd><b style="color:#b73b3b">' + money(r.price) + '</b></dd>' +
      '<dt>车辆所在地</dt><dd>' + r.city.join(' ') + '</dd>' +
      '<dt>置顶</dt><dd>' + (isTop(r) ? '<span class="top-until">置顶至 ' + fmt(r.topEnd, true) + '</span>' : '未置顶') + '</dd>' +
      '<dt>登记人</dt><dd>' + r.person + '</dd>' +
      '<dt>所属机构</dt><dd>' + esc(r.org) + '</dd>' +
      '<dt>登记时间</dt><dd>' + r.time + '</dd>' +
      '<dt>备注</dt><dd>' + esc(r.remark) + '</dd>' +
      '<dt class="full">车辆照片' + (r.video ? '与视频' : '') + '</dt><dd class="full">' + pics + '</dd>' +
      '<dt class="full">详情图片</dt><dd class="full">' + blocks + '</dd>' +
      '</div>';
  }

  function openDetail(r) {
    $('#modal-root').innerHTML = '<div class="modal-backdrop"><div class="modal large" id="detail-modal">' +
      '<div class="modal-header"><h2>车源详情 ' + approveChip(r.approve) +
      (r.approve === '通过' ? ' <span class="status-dot' + (r.on ? ' on' : '') + '">' + (r.on ? '在售' : '已下架') + '</span>' : '') + '</h2>' +
      '<button class="modal-close" id="k-x2">×</button></div>' +
      '<div class="modal-body">' +
      '<div class="stat-row">' +
      '<div class="stat"><b>' + r.views + '</b><span>查看次数</span></div>' +
      '<div class="stat"><b class="' + (r.sold ? 'sold' : '') + '">' + (r.sold || 0) + '</b><span>疑似已售标记</span></div>' +
      '<div class="stat"><b style="font-size:15px">' + r.approve + (r.approve === '通过' ? ' · ' + (r.on ? '在售' : '已下架') : '') + '</b><span>当前状态</span></div>' +
      '<div class="stat"><b style="font-size:15px">' + r.time + '</b><span>登记时间</span></div>' +
      '</div>' +
      vehicleDl(r) +
      (r.approve === '不通过' ? '<div class="danger-box"><strong>审核不通过</strong><div>驳回时间：' + r.auditAt + '　审核人：' + r.auditor + '</div><p style="margin:6px 0 0">' + esc(r.opinion) + '</p></div>' : '') +
      '<h3 class="ops-title">操作记录</h3>' +
      (r.ops.length ? '<table class="data-table"><thead><tr><th>时间</th><th>操作人</th><th>动作</th></tr></thead><tbody>' +
        r.ops.map(function (o) { return '<tr><td>' + o.t + '</td><td>' + o.who + '</td><td>' + o.act + '</td></tr>'; }).join('') +
        '</tbody></table>'
        : '<p class="muted" style="margin:6px 0 0">暂无上架／下架记录。浏览线索不在这里，去线索管理页面看。</p>') +
      '<h3 class="ops-title">置顶记录</h3>' +
      (r.topOrders.length ? '<table class="data-table"><thead><tr><th>付款时间</th><th>金额</th><th>天数</th><th>本次时段</th><th>状态</th></tr></thead><tbody>' +
        r.topOrders.map(function (o) {
          return '<tr><td>' + fmt(o.pay, true) + '</td><td>' + o.money + ' 元</td><td>' + o.days + '</td><td>' + fmt(o.start, true) + ' 至 ' + fmt(o.end, true) + '</td><td>' +
            (o.cancelAt ? '已取消（' + o.cancelBy + '，' + fmt(o.cancelAt, true) + '）' : '已支付') + '</td></tr>';
        }).join('') + '</tbody></table>'
        : '<p class="muted" style="margin:6px 0 0">无</p>') +
      '</div>' +
      '<div class="modal-footer"><button class="ghost" id="k-back">关闭</button>' +
      (r.approve === '未审核' ? '<button class="primary" id="k-ap">审核</button>' : '') +
      (r.approve === '通过' ? (r.on ? '<button class="danger" id="k-off">下架</button>' : '<button class="primary" id="k-on">上架</button>') : '') +
      (isTop(r) ? '<button class="ghost" id="k-untop">取消置顶</button>' : '') +
      '</div></div></div>';

    $('#k-x2').addEventListener('click', closeModal);
    $('#k-back').addEventListener('click', closeModal);
    if ($('#k-ap')) $('#k-ap').addEventListener('click', function () { closeModal(); openApprove(r); });
    if ($('#k-off')) $('#k-off').addEventListener('click', function () { doOff(r, true); });
    if ($('#k-on')) $('#k-on').addEventListener('click', function () { doOn(r, true); });
    if ($('#k-untop')) $('#k-untop').addEventListener('click', function () { doUntop(r, true); });
  }

  // R3-01 总部取消置顶（REQ-004 第 6.2 节）：立即恢复正常排序，系统不自动退款
  function doUntop(r, fromDetail) {
    confirmBox('确认取消该车置顶？',
      '<b>' + r.id + '　' + esc(r.name) + '</b><br><br>取消后立即恢复正常排序，系统不自动退款。',
      function () {
        var now = new Date();
        r.topEnd = now;
        if (r.topOrders[0]) { r.topOrders[0].cancelAt = now; r.topOrders[0].cancelBy = '总部 admin'; }
        toast('已取消置顶');
        render();
        if (fromDetail) openDetail(r);
      }, '确认取消置顶');
  }

  function bind() {
    if (!$('#view-stock')) return;

    // 注意：审核状态与上下架的 id 用 pc- 前缀，避开小程序视图里的同名 id
    var FIELDS = { code: 'q-code', brand: 'q-brand', model: 'q-model', person: 'q-person',
      org: 'q-org', srctype: 'q-srctype', approve: 'pc-approve', shelf: 'pc-shelf', vtype: 'q-vtype',
      prov: 'q-prov', city: 'q-city', dist: 'q-dist', from: 'q-from', to: 'q-to' };

    fillBrand(); fillProv();
    $('#q-brand').addEventListener('change', fillModel);
    $('#q-prov').addEventListener('change', fillCity);
    $('#q-city').addEventListener('change', fillDist);

    $('#stock-query').addEventListener('click', function () {
      Object.keys(FIELDS).forEach(function (k) { q[k] = $('#' + FIELDS[k]).value.trim(); });
      page = 1; render();
    });
    $('#stock-reset').addEventListener('click', function () {
      Object.keys(FIELDS).forEach(function (k) { $('#' + FIELDS[k]).value = ''; q[k] = ''; });
      fillBrand(); fillProv();
      page = 1; render();
    });
    $('#q-sort').addEventListener('change', function (e) { q.sort = e.target.value; page = 1; render(); });
    $('#stock-size').addEventListener('change', function (e) { size = Number(e.target.value); page = 1; render(); });
    $('#stock-prev').addEventListener('click', function () { if (page > 1) { page--; render(); } });
    $('#stock-next').addEventListener('click', function () { page++; render(); });

    $('#stock-body').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-act]');
      if (!btn) return;
      var r = byId(btn.dataset.id);
      if (btn.dataset.act === 'detail') openDetail(r);
      if (btn.dataset.act === 'approve') openApprove(r);
      if (btn.dataset.act === 'off') doOff(r);
      if (btn.dataset.act === 'on') doOn(r);
      if (btn.dataset.act === 'untop') doUntop(r);
    });

    render();

    // 便于核验时直接截到详情画面
    var p = new URLSearchParams(location.search);
    if (p.get('detail') === '1') { var r0 = filtered().filter(function (x) { return x.on; })[0]; if (r0) openDetail(r0); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
