/* REQ-004 PC 车源管理样稿
   依据：REQ-004-PC车源管理需求方案 v2.5（2026-10-28 CHG-D065：热销／banner 开关与 10 台上限、车辆编号、车辆位置、所属类型、
   已售人数、总部下架填原因、「不通过」改叫「驳回」）。本地演示数据，不连接接口。
   2026-10-29 特价车重建方案（TASK-042）：车源类型加「特价车」；只有总部在 PC 新增特价车，表单与小程序车源登记相同，
   保存即通过、上架、生成 TG 编号；修改时品牌、车型、型号只读。库存车、一手车源仍不能在 PC 新增或修改。*/
(function () {
  'use strict';

  var DC = window.DemoCars;
  var ORG = window.PcOrgs || { types: [], registrants: [] };
  var DAY = 86400000, NOW = Date.now();
  var PEOPLE_ORG = { '总部': '总部', '张伟': '华东名车行', '张三': '安信汽车', '李四': '德仁二手车', '王五': '天成车业', '赵六': '优选好车', '刘洋': '众诚车行', '周敏': '宏达名车' };
  var LOCATIONS = ['东区', '西区', '南区', '北区', '大北区'];
  var HQ_REASON = '车辆照片与实车不符，请核实后重新上架';
  var SOLD_REASON = '三个用户标记该车辆已售';

  function staffByName(n) { return ORG.registrants.filter(function (s) { return s.name === n; })[0] || null; }
  function staffById(id) { return ORG.registrants.filter(function (s) { return s.id === id; })[0] || null; }
  function typeOf(code) { return ORG.types.filter(function (t) { return t.code === code; })[0] || null; }
  function typeText(code) { var t = typeOf(code); return t ? t.code + ' ' + t.name : ''; }

  /* 车辆清单。mapped：与小程序共用 demo-cars.js 的那台车，车辆编号、热销、banner、车辆位置、标签、置顶都取它；
     其余为同一批实拍车型由其他登记人登记的车（库存车 4 台等待审核／驳回、2 台已下架；一手车源 8 台由其他类型的登记人登记）。 */
  var SPECS = [
    // 库存车：等待审核、驳回的车还没有车辆编号
    { car: 'inventory-m6', price: 109800, days: 0, person: '张三', approve: '等待审核', views: 12 },
    { car: 'inventory-lc76', price: 615000, days: 1, person: '李四', approve: '等待审核', views: 8 },
    { car: 'inventory-g63', price: 2528000, days: 2, person: '王五', approve: '等待审核', views: 21 },
    { car: 'inventory-yuan', price: 79800, days: 4, person: '赵六', approve: '驳回', opinion: '照片不清晰，请补拍车身正面与内饰', views: 9 },
    { car: 'inventory-m6', mapped: true, price: 108000, person: '张伟', views: 126, sold: 1 },
    { car: 'inventory-lc76', mapped: true, price: 618000, person: '张伟', views: 212, sold: 2 },
    { car: 'inventory-g63', mapped: true, price: 2538000, person: '张伟', views: 96 },
    { car: 'inventory-yuan', mapped: true, price: 78800, person: '张伟', views: 138 },
    { car: 'inventory-prado', mapped: true, price: 768000, person: '张伟', views: 176 },
    { car: 'inventory-lc300', mapped: true, price: 818000, person: '张伟', views: 198, sold: 1 },
    { car: 'inventory-prado', no: 'KC00007', price: 762000, days: 26, person: '刘洋', on: false, off: HQ_REASON, offBy: '总部 admin', location: '南区', views: 67 },
    { car: 'inventory-lc76', no: 'KC00008', price: 612000, days: 40, person: '周敏', on: false, off: SOLD_REASON, offBy: '系统', location: '北区', views: 143 },
    // 一手车源：与小程序共用的 5 台（类型 A 的登记人登记）
    { car: 'firsthand-yuan', mapped: true, price: 85800, person: '李明', views: 104 },
    { car: 'firsthand-prado', mapped: true, price: 775000, person: '李明', views: 85, sold: 1 },
    { car: 'firsthand-lc300', mapped: true, price: 825000, person: '张文静', views: 159 },
    { car: 'firsthand-lc76', mapped: true, price: 628000, person: '欧阳明轩', views: 88 },
    { car: 'firsthand-g63', mapped: true, price: 2558000, person: '张文静', views: 59 },
    // 一手车源：其他类型登记人登记、总部已勾 banner 的车（含已下架的，下架的车勾了也不对外显示）
    { car: 'firsthand-yuan', no: 'YB00001', price: 86800, days: 3, person: '王海涛', banner: 9, location: '西区', views: 77 },
    { car: 'firsthand-lc300', no: 'YB00002', price: 829000, days: 8, person: '刘佳', banner: 8, location: '东区', views: 64, sold: 1 },
    { car: 'firsthand-prado', no: 'YC00001', price: 772000, days: 5, person: '吴雅琴', banner: 7, hot: 3, location: '南区', views: 93 },
    { car: 'firsthand-g63', no: 'YD00001', price: 2549000, days: 6, person: '孙立群', banner: 6, location: '大北区', views: 41 },
    { car: 'firsthand-yuan', no: 'YD00002', price: 84800, days: 14, person: '黄晓峰', banner: 5, on: false, off: '售价与实际报价不符，请核实后重新上架', offBy: '总部 admin', location: '北区', views: 52 },
    { car: 'firsthand-lc76', no: 'YE00001', price: 625000, days: 16, person: '马丽华', banner: 4, on: false, off: SOLD_REASON, offBy: '系统', location: '东区', views: 118 },
    { car: 'firsthand-lc300', no: 'YF00001', price: 831000, days: 25, person: '林曼', banner: 3, location: '西区', views: 70 },
    { car: 'firsthand-prado', no: 'YG00001', price: 769000, days: 33, person: '罗文博', banner: 2, on: false, off: '本人下架', offBy: '罗文博', location: '大北区', views: 36 },
    // 一手车源：等待审核、驳回
    { car: 'firsthand-lc300', price: 826000, days: 1, person: '朱天翔', approve: '等待审核', views: 5 },
    { car: 'firsthand-g63', price: 2560000, days: 7, person: '梁秋萍', approve: '驳回', opinion: '实际售价与同款车差距较大，请核实后重新提交', views: 14 },
    // 特价车：总部在 PC 登记，保存即通过并上架；与小程序共用的 7 台，编号、热销、banner、位置、标签都取 demo-cars.js
    { car: 'special_price-m6', mapped: true, price: 106800, person: '总部', views: 342 },
    { car: 'special_price-prado', mapped: true, price: 775800, person: '总部', views: 268 },
    { car: 'special_price-lc300', mapped: true, price: 826800, person: '总部', views: 305 },
    { car: 'special_price-lc76', mapped: true, price: 623800, person: '总部', views: 187 },
    { car: 'special_price-g63', mapped: true, price: 2553000, person: '总部', views: 241 },
    { car: 'special_price-prado-2', mapped: true, price: 763800, person: '总部', views: 129 },
    { car: 'special_price-lc76-2', mapped: true, price: 614800, person: '总部', views: 116 }
  ];
  var SRC_TEXT = { inventory: '库存车', firsthand: '一手车源', special_price: '特价车' };

  function p2(n) { return String(n).padStart(2, '0'); }
  function fmt(d, full) { return (full ? d.getFullYear() + '-' : '') + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()); }
  function ymd(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function nowText() { return fmt(new Date(), true); }

  var rows = SPECS.map(function (s, i) {
    var car = DC.get(s.car), m = car.name.match(/^(\S+)\s+(.+?)\s+(\d{4}款.*)$/);
    var src = SRC_TEXT[car.source], special = src === '特价车';
    var approve = s.approve || '通过';
    var days = s.mapped ? car.days : s.days;
    // 登记时间落在白天 9～18 点；当天登记的不晚于此刻
    var t = new Date(NOW - days * DAY);
    t.setHours(9 + (i * 7) % 10, (i * 13) % 60, 0, 0);
    if (t.getTime() > NOW) t = new Date(NOW - (i + 1) * 9 * 60000);
    var staff = src === '一手车源' ? staffByName(s.person) : null;
    // 特价车保存即通过，通过时间就是登记时间
    var audit = approve === '等待审核' ? null : special ? t : new Date(t.getTime() + Math.min(2 * 3600000, (NOW - t.getTime()) / 2));
    var on = approve === '通过' && s.on !== false;
    var r = {
      id: 'cs-' + (i + 1),
      no: approve === '通过' ? (s.mapped ? car.vehicleNo : s.no) : '',
      srcType: src, special: special,
      hot: s.mapped ? !!car.hot : !!s.hot, hotAt: s.mapped ? (car.hotAt || 0) : (s.hot || 0),
      banner: s.mapped ? !!car.banner : !!s.banner, bannerAt: s.mapped ? (car.bannerAt || 0) : (s.banner || 0),
      location: s.mapped ? car.location : (s.location || car.location),
      labels: car.labels.slice(),
      approve: approve,
      opinion: s.opinion || '',
      auditAt: audit ? fmt(audit, true) : '', auditor: audit ? (special ? '总部' : '总部 admin') : '',
      photos: car.photos.map(function (p) { return p.src; }),
      detailImgs: i % 5 === 4 ? [] : car.photos.map(function (p) { return p.src; }),
      topEnd: null, topOrders: [],
      video: false, videoName: '',   // 实拍素材均无视频，与小程序各页一致
      brand: m[1], model: m[2], variant: m[3], name: m[1] + ' ' + m[2], price: s.price, guide: Math.round(parseFloat(car.ref) * 10000),
      person: s.person, staffId: staff ? staff.id : '', org: staff ? '' : (PEOPLE_ORG[s.person] || ''),
      time: fmt(t, true),
      views: s.views, sold: on ? (s.sold || 0) : 0, on: on,
      offReason: on ? '' : (approve === '通过' ? s.off || '' : ''), offAt: '', offBy: s.offBy || '',
      color: car.colorOut, inner: car.colorIn, remark: car.remark,
      manual: false,
      ops: []
    };
    // 置顶：与小程序同一台车一致（REQ-001 第 2.17 节），每次付款买下的时段从付款时刻或原结束时间起
    if (s.mapped && car.top === 1) { r.topEnd = new Date(NOW + 3 * DAY); r.topOrders = [{ pay: new Date(NOW - 4 * DAY), money: 9.9, days: 7, start: new Date(NOW - 4 * DAY), end: r.topEnd }]; }
    if (s.mapped && car.top === 2) { r.topEnd = new Date(NOW + 9 * DAY); r.topOrders = [{ pay: new Date(NOW - DAY), money: 9.9, days: 7, start: new Date(NOW + 2 * DAY), end: r.topEnd }, { pay: new Date(NOW - 5 * DAY), money: 9.9, days: 7, start: new Date(NOW - 5 * DAY), end: new Date(NOW + 2 * DAY) }]; }
    if (special) r.ops.push({ t: r.time, who: '总部', act: '登记，保存即通过并上架' });
    else if (approve === '通过') r.ops.push({ t: r.auditAt, who: r.auditor, act: '审核通过' });
    if (approve === '驳回') r.ops.push({ t: r.auditAt, who: r.auditor, act: '审核驳回：' + r.opinion });
    if (r.offReason) {
      r.offAt = fmt(new Date(Math.min(NOW - 3600000, audit.getTime() + Math.max(1, days - 1) * DAY)), true);
      r.ops.unshift({ t: r.offAt, who: r.offBy, act: '下架：' + r.offReason });
    }
    return r;
  });
  // 车辆编号序号：每个前缀单独从 00001 排，永不复用（REQ-001 第 1.8 节）
  var SEQ = {};
  DC.all().forEach(function (c) { bump(c.vehicleNo); });
  rows.forEach(function (r) { bump(r.no); });
  function bump(no) { if (!no) return; var k = no.slice(0, 2), n = Number(no.slice(2)); SEQ[k] = Math.max(SEQ[k] || 0, n); }
  function nextNo(r) {
    var staff = staffById(r.staffId), k = r.srcType === '特价车' ? 'TG' : r.srcType === '库存车' ? 'KC' : 'Y' + (staff ? staff.typeCode : 'A');
    SEQ[k] = (SEQ[k] || 0) + 1;
    return k + String(SEQ[k]).padStart(5, '0');
  }

  function rowType(r) { var s = staffById(r.staffId); return s ? s.typeCode : ''; }
  function personText(r) { var s = staffById(r.staffId); return s ? s.name : r.person; }
  // 所属机构：代理商登记的显示代理商经营主体；登记人登记的显示所属类型「代码 名称」
  function orgText(r) { return r.staffId ? typeText(rowType(r)) : r.org; }
  function recentFrom() { return ymd(new Date(NOW - 29 * DAY)); }

  var KEYS = ['code', 'brand', 'model', 'person', 'org', 'stype', 'srctype', 'approve', 'shelf', 'hot', 'banner', 'loc', 'from', 'to'];
  var q = { sort: 'time' };
  KEYS.forEach(function (k) { q[k] = ''; });
  var page = 1, size = 20;

  function $(s) { return document.querySelector(s); }
  function money(n) { return n.toLocaleString('zh-CN') + ' 元'; }   // 详情弹窗用，带单位
  function num(n) { return n.toLocaleString('zh-CN'); }                // 列表用，单位写在表头
  var toastTimer;
  function toast(m, ms) { var e = $('#toast'); if (!e) return; e.textContent = m; e.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { e.classList.remove('show'); }, ms || 1800); }
  function isTop(r) { return !!(r.topEnd && r.topEnd > new Date()); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function noText(r) { return r.no || '—'; }

  function filtered() {
    var list = rows.filter(function (r) {
      // 车辆编号精确查，不区分大小写
      if (q.code && r.no.toUpperCase() !== q.code.toUpperCase()) return false;
      if (q.brand && r.brand !== q.brand) return false;
      if (q.model && r.model !== q.model) return false;
      if (q.person && personText(r).indexOf(q.person) === -1) return false;
      if (q.org && orgText(r).indexOf(q.org) === -1) return false;
      if (q.stype && rowType(r) !== q.stype) return false;
      if (q.srctype && r.srcType !== q.srctype) return false;
      // 审核状态与上下架是两个独立条件，各自筛
      if (q.approve && r.approve !== q.approve) return false;
      if (q.shelf === '在售' && !r.on) return false;
      if (q.shelf === '已下架' && r.on) return false;
      if (q.hot && r.hot !== (q.hot === '是')) return false;
      if (q.banner && r.banner !== (q.banner === '是')) return false;
      if (q.loc && r.location !== q.loc) return false;
      if (q.from && r.time.slice(0, 10) < q.from) return false;
      if (q.to && r.time.slice(0, 10) > q.to) return false;
      return true;
    });
    list.sort(function (a, b) {
      // R2-11 细则4：等待审核排最前，照搬线上 ORDER BY CASE WHEN audit_status = 0 THEN 0 ELSE 1 END
      var pa = a.approve === '等待审核' ? 0 : 1, pb = b.approve === '等待审核' ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (q.sort === 'sold' && b.sold !== a.sold) return b.sold - a.sold;
      if (q.sort === 'views' && b.views !== a.views) return b.views - a.views;
      return a.time < b.time ? 1 : -1;
    });
    return list;
  }

  // 热销、banner 开关（第 5.4 节）：只有审核通过的车能点
  function sw(r, flag) {
    var on = r[flag], ok = r.approve === '通过', label = flag === 'hot' ? '热销' : 'banner';
    return '<button type="button" class="sw' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" aria-label="' + label + '" data-flag="' + flag + '" data-id="' + r.id + '"' +
      (ok ? '' : ' disabled title="审核通过后可设置"') + '><i></i></button>';
  }

  function render() {
    if (!$('#view-stock')) return;
    var list = filtered();
    var stat = { total: list.length, pend: 0, on: 0, off: 0, views: 0 };
    list.forEach(function (r) { if (r.approve === '等待审核') stat.pend++; r.on ? stat.on++ : stat.off++; stat.views += r.views; });
    $('#s-total').textContent = stat.total;
    $('#s-pend').textContent = stat.pend;
    $('#s-on').textContent = stat.on;
    $('#s-off').textContent = stat.off;
    $('#s-views').textContent = stat.views.toLocaleString('zh-CN');

    var maxPage = Math.max(1, Math.ceil(list.length / size));
    if (page > maxPage) page = maxPage;
    var slice = list.slice((page - 1) * size, page * size);

    $('#stock-body').innerHTML = slice.map(function (r, i) {
      return '<tr>' +
        '<td>' + ((page - 1) * size + i + 1) + '</td>' +
        '<td class="cell-id">' + (r.no || '<span class="muted">—</span>') + '</td>' +
        '<td><span class="tag2 ' + (r.special ? 't-sp' : r.srcType === '库存车' ? 't-inv' : 't-4s') + '">' + r.srcType + '</span></td>' +
        '<td>' + sw(r, 'hot') + '</td>' +
        '<td>' + sw(r, 'banner') + '</td>' +
        '<td>' + r.location + '</td>' +
        '<td>' + esc(r.name) + '</td>' +
        '<td>' + num(r.price) + '</td>' +
        '<td>' + esc(personText(r)) + '</td>' +
        '<td>' + esc(orgText(r)) + '</td>' +
        '<td>' + r.time + '</td>' +
        '<td>' + r.views + '</td>' +
        '<td>' + (r.special ? '<span class="muted">—</span>' : r.sold ? '<b class="sold">' + r.sold + ' 人</b>' : '<span class="muted">0</span>') + '</td>' +
        '<td>' + approveChip(r.approve) + '</td>' +
        '<td>' + (r.approve === '通过'
          ? '<span class="status-dot' + (r.on ? ' on' : '') + '">' + (r.on ? '在售' : '已下架') + '</span>'
          : '<span class="muted">—</span>') + '</td>' +
        '<td>' + (isTop(r) ? '<span class="top-until">至 ' + fmt(r.topEnd) + '</span>' : '') + '</td>' +
        '<td><div class="table-actions">' +
        (r.approve === '等待审核'
          ? '<button class="primary" data-act="approve" data-id="' + r.id + '">审核</button>'
          : '<button data-act="detail" data-id="' + r.id + '">查看</button>') +
        (r.approve === '通过'
          ? (r.on ? '<button class="danger" data-act="off" data-id="' + r.id + '">下架</button>'
                  : '<button data-act="on" data-id="' + r.id + '">上架</button>')
          : '') +
        (isTop(r) ? '<button data-act="untop" data-id="' + r.id + '">取消置顶</button>' : '') +
        (r.special ? '<button data-act="edit" data-id="' + r.id + '">修改</button>' : '') +
        '</div></td></tr>';
    }).join('');

    $('#stock-empty').hidden = list.length !== 0;
    var any = KEYS.some(function (k) { return q[k]; });
    $('#stock-empty').textContent = any ? '没有查询到匹配的车辆' : '暂无车源';
    $('#stock-total').textContent = '共 ' + list.length + ' 条';
    $('#stock-page').textContent = page + ' / ' + maxPage;
    $('#stock-prev').disabled = page <= 1;
    $('#stock-next').disabled = page >= maxPage;
  }

  // 状态配色照线上 carSalesRegistration.vue 的 statusMap
  function approveChip(a) {
    var c = a === '等待审核' ? '#999' : a === '通过' ? '#158a36' : '#F5222D';
    return '<span class="ap-chip" style="color:' + c + '">' + a + '</span>';
  }
  // 品牌→车型：每级第一项都是「不限」
  function fillSel(sel, anyText, list, keep) {
    var e = $(sel), old = keep ? e.value : '';
    e.innerHTML = '<option value="">' + anyText + '</option>' +
      list.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('');
    if (old && list.indexOf(old) > -1) e.value = old;
  }
  function uniq(a) { return a.filter(function (x, i) { return x && a.indexOf(x) === i; }); }
  function fillBrand() {
    fillSel('#q-brand', '不限品牌', uniq(rows.map(function (r) { return r.brand; })), true);
    fillModel();
  }
  function fillModel() {
    var b = $('#q-brand').value;
    fillSel('#q-model', '不限车型', uniq(rows.filter(function (r) { return !b || r.brand === b; }).map(function (r) { return r.model; })), true);
  }
  // 所属类型：第一项「全部」，其后「代码 名称」（REQ-004 第 5.1 节 2.1）
  function fillType() {
    var e = $('#q-stype'), old = e.value;
    e.innerHTML = '<option value="">全部</option>' + ORG.types.slice().sort(function (a, b) { return a.code < b.code ? -1 : 1; })
      .map(function (t) { return '<option value="' + t.code + '">' + esc(t.code + ' ' + t.name) + '</option>'; }).join('');
    e.value = old;
  }

  function byId(id) { return rows.filter(function (r) { return r.id === id; })[0]; }
  function closeModal() { $('#modal-root').innerHTML = ''; }

  // 图片缩略图与查看层：查看层盖在详情弹窗之上，关闭后回到原弹窗
  var pvSets = {};
  function thumbs(title, list, r) {
    return '<div class="pic-row">' + list.map(function (src, k) {
      // 车辆照片第一张左上角带「热销」角标（REQ-001 第 1.7 节）
      var tag = (k === 0 && title === '车辆照片' && r && r.hot) ? '<span class="promo-tag promo-hot">热销</span>' : '';
      return '<button type="button" class="pic-thumb img" data-pv="' + title + '" data-pv-i="' + k + '" title="查看' + title + ' ' + (k + 1) + '"><img src="' + src + '" alt="' + title + ' ' + (k + 1) + '">' + tag + '</button>';
    }).join('') + '</div>';
  }
  function openViewer(title, items, start) {
    var index = start, layer = document.createElement('section');
    layer.className = 'reg-image-viewer pc-image-viewer';
    layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true'); layer.setAttribute('aria-label', title + '查看');
    function close() { document.removeEventListener('keydown', onKey, true); layer.remove(); }
    function move(d) { index = Math.max(0, Math.min(items.length - 1, index + d)); draw(); }
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } if (e.key === 'ArrowLeft') move(-1); if (e.key === 'ArrowRight') move(1); }
    function draw() {
      layer.innerHTML = '<header><span>' + title + '</span><button type="button" class="reg-preview-close">关闭</button></header>' +
        '<div class="reg-preview-body"><img src="' + items[index] + '" alt="' + title + (index + 1) + '" draggable="false"></div>' +
        '<footer><button type="button" class="reg-preview-prev"' + (index === 0 ? ' disabled' : '') + '>上一张</button><span>' + (index + 1) + ' / ' + items.length + '</span>' +
        '<button type="button" class="reg-preview-next"' + (index === items.length - 1 ? ' disabled' : '') + '>下一张</button></footer>';
      layer.querySelector('.reg-preview-close').addEventListener('click', close);
      layer.querySelector('.reg-preview-prev').addEventListener('click', function () { move(-1); });
      layer.querySelector('.reg-preview-next').addEventListener('click', function () { move(1); });
    }
    document.body.appendChild(layer); document.addEventListener('keydown', onKey, true); draw();
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-pv]');
    if (!t || !document.getElementById('modal-root').contains(t)) return;
    openViewer(t.dataset.pv, pvSets[t.dataset.pv] || [], Number(t.dataset.pvI));
  });

  function confirmBox(title, body, onOk, okText, okClass) {
    $('#modal-root').innerHTML = '<div class="modal-backdrop"><div class="modal" style="width:min(480px,100%)">' +
      '<div class="modal-header"><h2>' + esc(title) + '</h2><button class="modal-close" id="k-x">×</button></div>' +
      '<div class="modal-body">' + body + '</div>' +
      '<div class="modal-footer"><button class="ghost" id="k-no">取消</button><button class="' + (okClass || 'primary') + '" id="k-yes">' + (okText || '确定') + '</button></div></div></div>';
    $('#k-x').addEventListener('click', closeModal);
    $('#k-no').addEventListener('click', closeModal);
    $('#k-yes').addEventListener('click', function () { if (onOk() !== false) closeModal(); });
  }

  // 总部下架（第 9 节）：确认框内「下架原因」必填，最多 100 字，登记人在小程序看到
  function doOff(r, fromDetail) {
    confirmBox('下架车源',
      '<p style="margin:0">确定下架 <b>' + esc(r.no) + '　' + esc(r.name) + '</b>？</p>' +
      '<p class="muted" style="margin:6px 0 12px;font-size:12.5px">下架后小程序端不再展示，记录与历史保留；该车已售人数清零。</p>' +
      '<label class="form-field">下架原因（必填）<textarea id="k-reason" maxlength="100" rows="3" placeholder="请填写下架原因，登记人会看到"></textarea>' +
      '<span class="field-help" id="k-count" style="justify-self:end">0 / 100</span></label>',
      function () {
        var reason = $('#k-reason').value.trim();
        if (!reason) return false;
        r.on = false;
        r.sold = 0;                 // R2-19 下架即清零
        r.offReason = reason; r.offAt = nowText(); r.offBy = '总部 admin';
        r.ops.unshift({ t: r.offAt, who: '总部 admin', act: '下架：' + reason });
        toast('已下架');
        render();
        if (fromDetail) setTimeout(function () { openDetail(r); });
      }, '确认下架');
    var ok = $('#k-yes'), ta = $('#k-reason');
    ok.disabled = true;
    ta.addEventListener('input', function () { ok.disabled = !ta.value.trim(); $('#k-count').textContent = Array.from(ta.value).length + ' / 100'; });
    ta.focus();
  }

  // R2-14 总部也可以上架；重新上架后下架原因不再显示
  function doOn(r, fromDetail) {
    confirmBox('上架车源',
      '<p style="margin:0">确定上架 <b>' + esc(r.no) + '　' + esc(r.name) + '</b>？<br><br>上架后小程序端恢复展示。' +
      (r.special ? '特价车由总部登记，不走审核。' : '总部只做上下架、不改车辆信息，因此不触发重新审核。') + '</p>',
      function () {
        r.on = true; r.offReason = ''; r.offAt = '';
        r.ops.unshift({ t: nowText(), who: '总部 admin', act: '上架' });
        toast('已上架');
        render();
        if (fromDetail) setTimeout(function () { openDetail(r); });
      });
  }

  // 热销、banner：立即保存，不弹确认；banner 每个列表（库存车、一手车源、特价车分别算）最多 10 台
  function setFlag(r, flag) {
    if (!r || r.approve !== '通过') return false;
    var v = !r[flag];
    if (flag === 'banner' && v) {
      var n = rows.filter(function (x) { return x.srcType === r.srcType && x.banner; }).length;
      if (n >= 10) { toast('每个列表最多 10 台 banner，请先取消其他车的 banner', 2600); return false; }
    }
    r[flag] = v;
    r[flag + 'At'] = v ? Date.now() : 0;     // 打开记 hot_time／banner_time，关掉清空
    toast(flag === 'hot' ? (v ? '已设为热销' : '已取消热销') : (v ? '已设为 banner' : '已取消 banner'));
    render();
    return true;
  }

  // R2-18 审核弹窗：照搬线上售车登记 ApprovalSave 的字段与校验；第一次通过时生成车辆编号
  function openApprove(r) {
    $('#modal-root').innerHTML = '<div class="modal-backdrop"><div class="modal large">' +
      '<div class="modal-header"><h2>审核车源 ' + approveChip(r.approve) + '</h2><button class="modal-close" id="a-x">×</button></div>' +
      '<div class="modal-body">' +
      vehicleDl(r, true) +
      '<h3 class="ops-title">审核</h3>' +
      '<div class="form-grid">' +
      '<label class="form-field"><span>审核结果（必填）</span>' +
      '<span class="seg2" id="a-seg"><button type="button" data-ap="通过" class="on">通过</button><button type="button" data-ap="驳回">驳回</button></span></label>' +
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
      if (pick === '驳回' && !op) { $('#a-err').textContent = '请输入审核意见'; return; }
      r.approve = pick;
      r.opinion = op;
      r.auditAt = nowText();
      r.auditor = '总部 admin';
      if (pick === '通过') {
        if (!r.no) r.no = nextNo(r);
        r.on = true;
        r.ops.unshift({ t: r.auditAt, who: r.auditor, act: '审核通过' });
      } else { r.on = false; r.sold = 0; r.ops.unshift({ t: r.auditAt, who: r.auditor, act: '审核驳回：' + op }); }
      closeModal(); render();
      if (pick === '通过') toast('已通过，车辆编号 ' + r.no + '，车辆已上架', 3200);
      else toast('已驳回，已通知登记人');
    });
  }

  // 车辆信息只读表：详情与审核弹窗共用，字段口径同 REQ-001 第 2.6 节，v2.5 加车辆编号、车辆位置、热销、banner
  function vehicleDl(r, forApprove) {
    // TASK-038：显示真实缩略图，点击放大查看，可前后切换（做法同小程序登记页 TASK-037）
    pvSets = { '车辆照片': r.photos, '详情图片': r.detailImgs };
    var pics = thumbs('车辆照片', r.photos, r);
    var blocks = r.detailImgs.length ? thumbs('详情图片', r.detailImgs) : '<span class="muted">未添加</span>';
    var flags = r.approve === '通过' && !forApprove
      ? function (f) { return '<span class="sw-cell">' + sw(r, f) + '<span>' + (r[f] ? '是' : '否') + '</span></span>'; }
      : function () { return '<span class="muted">审核通过后可设置</span>'; };
    return '<div class="detail-grid two">' +
      '<dt>车辆编号</dt><dd>' + (r.no || '<span class="muted">审核通过后生成</span>') + '</dd>' +
      '<dt>车源类型</dt><dd>' + r.srcType + '</dd>' +
      '<dt>车辆位置</dt><dd>' + r.location + '</dd>' +
      '<dt>标签</dt><dd>' + (r.labels.length ? r.labels.join('、') : '<span class="muted">无</span>') + '</dd>' +
      '<dt>热销</dt><dd>' + flags('hot') + '</dd>' +
      '<dt>banner</dt><dd>' + flags('banner') + '</dd>' +
      '<dt>品牌</dt><dd>' + esc(r.brand) + '</dd>' +
      '<dt>车型</dt><dd>' + esc(r.model + ' ' + r.variant) + '</dd>' +
      '<dt>外观颜色</dt><dd>' + r.color + '</dd>' +
      '<dt>内饰颜色</dt><dd>' + r.inner + '</dd>' +
      '<dt>官方指导价</dt><dd>' + (r.guide ? money(r.guide) : '<span class="muted">暂无</span>') + '</dd>' +
      '<dt>实际售价</dt><dd><b style="color:#b73b3b">' + money(r.price) + '</b></dd>' +
      '<dt>置顶</dt><dd>' + (isTop(r) ? '<span class="top-until">置顶至 ' + fmt(r.topEnd, true) + '</span>' : '未置顶') + '</dd>' +
      '<dt>登记人</dt><dd>' + esc(personText(r)) + '</dd>' +
      '<dt>所属机构</dt><dd>' + esc(orgText(r)) + '</dd>' +
      '<dt>登记时间</dt><dd>' + r.time + '</dd>' +
      '<dt>备注</dt><dd>' + esc(r.remark) + '</dd>' +
      '<dt class="full">车辆照片' + (r.video ? '与视频' : '') + '</dt><dd class="full">' + pics + '</dd>' +
      '<dt class="full">详情图片</dt><dd class="full">' + blocks + '</dd>' +
      '</div>';
  }

  function openDetail(r, keepScroll) {
    $('#modal-root').innerHTML = '<div class="modal-backdrop"><div class="modal large" id="detail-modal">' +
      '<div class="modal-header"><h2>车源详情 ' + approveChip(r.approve) +
      (r.approve === '通过' ? ' <span class="status-dot' + (r.on ? ' on' : '') + '">' + (r.on ? '在售' : '已下架') + '</span>' : '') + '</h2>' +
      '<button class="modal-close" id="k-x2">×</button></div>' +
      '<div class="modal-body">' +
      '<div class="stat-row">' +
      '<div class="stat"><b>' + r.views + '</b><span>查看次数</span></div>' +
      '<div class="stat"><b class="' + (r.sold ? 'sold' : '') + '">' + (r.special ? '—' : (r.sold || 0)) + '</b><span>已售人数</span></div>' +
      '<div class="stat"><b style="font-size:15px">' + r.approve + (r.approve === '通过' ? ' · ' + (r.on ? '在售' : '已下架') : '') + '</b><span>当前状态</span></div>' +
      '<div class="stat"><b style="font-size:15px">' + r.time + '</b><span>登记时间</span></div>' +
      '</div>' +
      (r.approve === '驳回' ? '<div class="danger-box" style="margin-bottom:12px"><strong>审核驳回</strong><div>驳回时间：' + r.auditAt + '　审核人：' + r.auditor + '</div><p style="margin:6px 0 0">驳回原因：' + esc(r.opinion) + '</p></div>' : '') +
      (r.approve === '通过' && !r.on && r.offReason ? '<div class="off-box"><strong>已下架</strong><div>下架时间：' + r.offAt + '　操作人：' + esc(r.offBy) + '</div><p>下架原因：' + esc(r.offReason) + '</p></div>' : '') +
      vehicleDl(r) +
      '<h3 class="ops-title">操作记录</h3>' +
      (r.ops.length ? '<table class="data-table"><thead><tr><th>时间</th><th>操作人</th><th>动作</th></tr></thead><tbody>' +
        r.ops.map(function (o) { return '<tr><td>' + o.t + '</td><td>' + esc(o.who) + '</td><td>' + esc(o.act) + '</td></tr>'; }).join('') +
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
      (r.approve === '等待审核' ? '<button class="primary" id="k-ap">审核</button>' : '') +
      (r.approve === '通过' ? (r.on ? '<button class="danger" id="k-off">下架</button>' : '<button class="primary" id="k-on">上架</button>') : '') +
      (isTop(r) ? '<button class="ghost" id="k-untop">取消置顶</button>' : '') +
      (r.special ? '<button class="ghost" id="k-edit">修改</button>' : '') +
      '</div></div></div>';
    if (keepScroll) $('#detail-modal').scrollTop = keepScroll;

    $('#k-x2').addEventListener('click', closeModal);
    $('#k-back').addEventListener('click', closeModal);
    if ($('#k-ap')) $('#k-ap').addEventListener('click', function () { closeModal(); openApprove(r); });
    if ($('#k-off')) $('#k-off').addEventListener('click', function () { doOff(r, true); });
    if ($('#k-on')) $('#k-on').addEventListener('click', function () { doOn(r, true); });
    if ($('#k-untop')) $('#k-untop').addEventListener('click', function () { doUntop(r, true); });
    if ($('#k-edit')) $('#k-edit').addEventListener('click', function () { openSpForm({ row: r }); });
    $('#detail-modal').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-flag]');
      if (b && setFlag(r, b.dataset.flag)) openDetail(r, $('#detail-modal').scrollTop);
    });
  }

  // R3-01 总部取消置顶（REQ-004 第 6.2 节）：立即恢复正常排序，系统不自动退款
  function doUntop(r, fromDetail) {
    confirmBox('确认取消该车置顶？',
      '<p style="margin:0"><b>' + esc(r.no) + '　' + esc(r.name) + '</b><br><br>取消后立即恢复正常排序，系统不自动退款。</p>',
      function () {
        var now = new Date();
        r.topEnd = now;
        if (r.topOrders[0]) { r.topOrders[0].cancelAt = now; r.topOrders[0].cancelBy = '总部 admin'; }
        toast('已取消置顶');
        render();
        if (fromDetail) setTimeout(function () { openDetail(r); });
      }, '确认取消置顶');
  }

  /* ===== 新增／修改特价车（2026-10-29 特价车重建方案）=====
     只有总部在 PC 录入；流程、字段与小程序车源登记相同：先选品牌，再车型、型号（分燃油车、新能源），带出参考价和颜色；
     找不到可手动登记。保存即通过、上架，生成 TG 编号。修改时品牌、车型、型号只读，其余可改，不改审核状态。 */
  var SP_LABELS = ['库存车', '运损车', '商品车', '包牌包税', '活动车', '可分期', '现车', '全国可上牌', '急售'];
  var DEF_OUT = ['冰川白', '曜石黑', '星河灰'], DEF_IN = ['黑色', '棕色', '米色'];   // 与小程序登记表默认颜色相同
  var MODEL_COLORS = {
    '传祺M6 MAX': [['典雅黑', '珍珠白', '星河灰'], ['黑色 / 朱砂棕', '黑色']],
    '元UP': [['浅绿色', '冰川白', '星河灰'], ['黑色 / 米色', '黑色']],
    '普拉多': [['白色', '黑色', '灰色'], ['黑色', '棕色']],
    '兰德酷路泽': [['白色', '黑色', '灰色'], ['黑色', '棕色']],
    '兰德酷路泽LC76': [['白色', '米色', '灰色'], ['黑色']],
    'G级AMG': [['白色', '黑色', '灰色'], ['黑色', '红色']]
  };
  function uniqList(a) { return a.filter(function (x, i) { return x && a.indexOf(x) === i; }); }
  function splitName(name) { var m = name.match(/^(\S+)\s+(.+?)\s+(\d{4}款.*)$/); return m ? { brand: m[1], model: m[2], variant: m[3] } : null; }
  // 车型目录：燃油车取小程序登记同一份目录（app.js 的 window.CarCatalog），再补上实拍车型；新能源同理
  var CATALOG = (function () {
    var cat = { '燃油车': {}, '新能源': {} };
    function put(en, b, m, v) { var x = cat[en][b] = cat[en][b] || {}; var list = x[m] = x[m] || []; if (!list.some(function (o) { return o.name === v.name; })) list.push(v); }
    var base = window.CarCatalog || {};
    Object.keys(base).forEach(function (b) { Object.keys(base[b]).forEach(function (m) { base[b][m].forEach(function (v) {
      put('燃油车', b, m, { name: v.name, price: v.price, out: DEF_OUT, inn: DEF_IN, photos: (v.photos || []).slice() });
    }); }); });
    DC.all().forEach(function (c) {
      var n = splitName(c.name); if (!n) return;
      var col = MODEL_COLORS[n.model] || [DEF_OUT, DEF_IN];
      put(/\d+KM|纯电|DM-i|增程/.test(c.name) ? '新能源' : '燃油车', n.brand, n.model,
        { name: n.variant, price: Math.round(parseFloat(c.ref) * 10000), out: uniqList([c.colorOut].concat(col[0])), inn: uniqList([c.colorIn].concat(col[1])), photos: c.photos.map(function (p) { return p.src; }) });
    });
    put('新能源', '比亚迪', '秦L', { name: '2025款 DM-i 120KM 超越型', price: 109800, out: DEF_OUT, inn: DEF_IN, photos: [] });
    put('新能源', '特斯拉', 'Model Y', { name: '2025款 后轮驱动版', price: 263500, out: ['珍珠白', '星空灰', '烈焰红'], inn: ['黑色', '黑白'], photos: [] });
    put('新能源', '理想', 'L6', { name: '2025款 Pro', price: 249800, out: ['青山绿', '珠光白', '星辰灰'], inn: ['黑色', '橙色'], photos: [] });
    return cat;
  })();
  function findVariant(brand, model, variant) {
    var hit = null;
    Object.keys(CATALOG).forEach(function (en) { var b = CATALOG[en][brand], list = b && b[model]; (list || []).forEach(function (v) { if (v.name === variant) hit = v; }); });
    return hit;
  }

  var sp = null;   // 当前新增流程的草稿：选车所在页签、已选品牌车型，以及已填内容（重选型号时保留图片、视频和备注）
  function spModal(title, body, foot, cls) {
    $('#modal-root').innerHTML = '<div class="modal-backdrop"><div class="modal large ' + (cls || '') + '" role="dialog" aria-modal="true" aria-label="' + esc(title) + '" id="sp-modal">' +
      '<div class="modal-header"><h2>' + esc(title) + '</h2><button class="modal-close" id="sp-x" aria-label="关闭">×</button></div>' +
      '<div class="modal-body">' + body + '</div><div class="modal-footer">' + foot + '</div></div></div>';
    $('#sp-x').addEventListener('click', closeModal);
  }

  // 第一步：选车。先选品牌，再车型、型号；分「燃油车」「新能源」两个页签
  function openSpPicker(keep) {
    if (!keep) sp = { en: '燃油车', brand: '', model: '', draft: null };
    sp.brand = ''; sp.model = '';
    function draw() {
      var brands = Object.keys(CATALOG[sp.en]), models = sp.brand ? Object.keys(CATALOG[sp.en][sp.brand]) : [],
        vars = sp.brand && sp.model ? CATALOG[sp.en][sp.brand][sp.model] : [];
      $('#sp-pick').innerHTML =
        '<div class="sp-tabs" role="tablist">' + ['燃油车', '新能源'].map(function (en) { return '<button type="button" role="tab" data-en="' + en + '"' + (en === sp.en ? ' class="on" aria-selected="true"' : '') + '>' + en + '</button>'; }).join('') + '</div>' +
        '<div class="sp-cascade">' +
        '<div class="sp-col"><div class="sp-col-h">品牌</div>' + brands.map(function (b) { return '<button type="button" class="sp-item' + (b === sp.brand ? ' on' : '') + '" data-b="' + esc(b) + '"><span>' + esc(b) + '</span><span class="sp-arrow">›</span></button>'; }).join('') + '</div>' +
        '<div class="sp-col"><div class="sp-col-h">车型</div>' + (sp.brand ? models.map(function (m) { return '<button type="button" class="sp-item' + (m === sp.model ? ' on' : '') + '" data-m="' + esc(m) + '"><span>' + esc(m) + '</span><small>' + CATALOG[sp.en][sp.brand][m].length + ' 个型号</small></button>'; }).join('') : '<div class="sp-hint">请先选择品牌</div>') + '</div>' +
        '<div class="sp-col"><div class="sp-col-h">型号</div>' + (sp.model ? vars.map(function (v, i) { return '<button type="button" class="sp-item" data-v="' + i + '"><span>' + esc(v.name) + '</span><small>指导价 ' + num(v.price) + ' 元</small></button>'; }).join('') : '<div class="sp-hint">' + (sp.brand ? '请选择车型' : '') + '</div>') + '</div>' +
        '</div>';
    }
    spModal('新增特价车 · 选择车型', '<div id="sp-pick"></div>',
      '<button type="button" class="sp-manual" id="sp-manual">找不到？手动登记车源</button><button class="ghost" id="sp-cancel">取消</button>', 'sp-modal');
    draw();
    $('#sp-pick').addEventListener('click', function (e) {
      var t = e.target.closest('button'); if (!t) return;
      if (t.dataset.en) { sp.en = t.dataset.en; sp.brand = ''; sp.model = ''; draw(); return; }
      if (t.dataset.b) { sp.brand = t.dataset.b; sp.model = ''; draw(); return; }
      if (t.dataset.m) { sp.model = t.dataset.m; draw(); return; }
      if (t.dataset.v) openSpForm({ pick: { brand: sp.brand, model: sp.model, v: CATALOG[sp.en][sp.brand][sp.model][Number(t.dataset.v)] } });
    });
    $('#sp-cancel').addEventListener('click', closeModal);
    $('#sp-manual').addEventListener('click', function () { openSpForm({ manual: true }); });
  }

  // 方图：不是正方形的照片按中间裁成正方形（与小程序登记同一要求）
  function squareImage(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onerror = rej;
      fr.onload = function () {
        var img = new Image();
        img.onerror = rej;
        img.onload = function () {
          var side = Math.min(img.naturalWidth, img.naturalHeight), out = Math.min(side, 1080), cv = document.createElement('canvas');
          cv.width = cv.height = out;
          cv.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, out, out);
          res(cv.toDataURL('image/jpeg', 0.88));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  function readImage(file) { return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = rej; fr.readAsDataURL(file); }); }

  // 第二步：填写车辆信息。opt.pick 目录选车、opt.manual 手动登记、opt.row 修改已有特价车
  function openSpForm(opt) {
    var r = opt.row || null, manual = r ? !!r.manual : !!opt.manual, pick = opt.pick || null;
    var old = r ? null : (sp && sp.draft);
    var brand = r ? r.brand : pick ? pick.brand : '', model = r ? r.model : pick ? pick.model : '', variant = r ? r.variant : pick ? pick.v.name : '';
    var cv = r ? findVariant(r.brand, r.model, r.variant) : pick ? pick.v : null;
    var d = r ? { ref: r.guide || '', sale: r.price, out: r.color, inn: r.inner, loc: r.location, labels: r.labels.slice(), photos: r.photos.slice(),
                  video: r.video ? { name: r.videoName || '视频', src: r.videoSrc || '' } : null, details: r.detailImgs.slice(), remark: r.remark || '' }
      : { ref: pick ? pick.v.price : '', sale: pick ? pick.v.price : '', out: '', inn: '', loc: old ? old.loc : '', labels: old ? old.labels.slice() : [],
          photos: old && old.photos.length ? old.photos.slice() : (pick ? pick.v.photos.slice() : []), video: old ? old.video : null,
          details: old ? old.details.slice() : [], remark: old ? old.remark : '' };
    var outs = uniqList([d.out].concat(cv ? cv.out : DEF_OUT)), inns = uniqList([d.inn].concat(cv ? cv.inn : DEF_IN));
    var lockCar = !!r || !manual, lockAttr = lockCar ? ' readonly class="read-only"' : '';
    var saleTouched = !!r;
    var title = r ? '修改特价车' : manual ? '新增特价车 · 手动登记车源' : '新增特价车';
    function chips(group, list, picked, multi) {
      return '<div class="chip-select" data-sp-group="' + group + '">' + list.map(function (t) {
        var on = multi ? picked.indexOf(t) > -1 : picked === t;
        return '<button type="button" class="' + (group === 'out' || group === 'inn' ? 'color-choice' : 'chip-choice') + (on ? ' selected' : '') + '" data-val="' + esc(t) + '">' + esc(t) + '</button>';
      }).join('') + '</div>';
    }
    spModal(title,
      '<form id="sp-form" class="form-grid" novalidate autocomplete="off">' +
      '<label class="form-field">品牌<input name="brand" maxlength="50" value="' + esc(brand) + '"' + lockAttr + ' placeholder="请输入品牌"><span class="field-error" data-err="brand"></span></label>' +
      '<label class="form-field">车型<input name="model" maxlength="100" value="' + esc(model) + '"' + lockAttr + ' placeholder="请输入车型"><span class="field-error" data-err="model"></span></label>' +
      '<label class="form-field full">型号<input name="variant" maxlength="150" value="' + esc(variant) + '"' + lockAttr + ' placeholder="请输入型号"><span class="field-error" data-err="variant"></span>' +
      (r ? '<span class="field-help">品牌、车型、型号不能修改；要换车型请重新新增特价车。</span>' : '') + '</label>' +
      '<label class="form-field">参考价（元）<input name="ref" type="number" step="0.01" min="0.01" value="' + d.ref + '"' + (manual ? ' placeholder="选填"' : ' readonly class="read-only"') + '><span class="field-error" data-err="ref"></span></label>' +
      '<label class="form-field">实际售价（元）（必填）<input name="sale" type="number" step="0.01" min="0.01" value="' + d.sale + '" placeholder="请输入实际售价"><span class="field-help" id="sp-wan"></span><span class="field-error" data-err="sale"></span></label>' +
      '<div class="form-field full" data-field="color"><span>外观颜色（必填）</span>' + chips('out', outs, d.out) + '</div>' +
      '<div class="form-field full" data-field="color2"><span>内饰颜色（必填）</span>' + chips('inn', inns, d.inn) + '<span class="field-error" data-err="color"></span></div>' +
      '<div class="form-field full" data-field="loc"><span>车辆位置（必填）</span>' + chips('loc', LOCATIONS, d.loc) + '<span class="field-error" data-err="loc"></span></div>' +
      '<div class="form-field full"><span>标签（选填，可多选）</span>' + chips('labels', SP_LABELS, d.labels, true) + '</div>' +
      '<div class="form-field full" data-field="photos"><span>车辆照片（必填）</span><div class="sp-up" id="sp-photos"></div><span class="field-help">最多 9 张，不是正方形的照片会先裁成正方形；第一张为封面。</span><span class="field-error" data-err="photos"></span></div>' +
      '<div class="form-field full"><span>视频（选填）</span><div class="sp-up" id="sp-video"></div><span class="field-help">可上传 1 个视频。</span></div>' +
      '<div class="form-field full"><span>详情图片（选填）</span><div class="sp-up" id="sp-details"></div><span class="field-help">只能添加图片，最多 9 张，可调整顺序。</span></div>' +
      '<label class="form-field full">备注<textarea name="remark" maxlength="500" placeholder="请输入车辆备注">' + esc(d.remark) + '</textarea><span class="field-help sp-count" id="sp-count">0 / 500</span></label>' +
      '<label class="form-field">登记人<input readonly class="read-only" value="总部"></label>' +
      '<label class="form-field">车源类型<input readonly class="read-only" value="特价车"></label>' +
      '<label class="form-field">车辆编号<input readonly class="read-only" value="' + (r ? esc(r.no) : '保存后生成') + '"></label>' +
      '<label class="form-field">审核状态<input readonly class="read-only" value="' + (r ? esc(r.approve) : '保存即通过并上架') + '"></label>' +
      '</form>',
      '<button class="ghost" id="sp-cancel">取消</button>' + (!r && !manual ? '<button class="ghost" id="sp-reselect">重选型号</button>' : '') + '<button class="primary" id="sp-save">保存</button>',
      'sp-modal');

    var form = $('#sp-form');
    function f(n) { return form.querySelector('[name="' + n + '"]'); }
    function err(k, m) { var e = form.querySelector('[data-err="' + k + '"]'); if (e) e.textContent = m || ''; }
    function count() { $('#sp-count').textContent = Array.from(f('remark').value).length + ' / 500'; }
    // 录真实售价；小程序对外只显示整数万位（REQ-003 第 8.4 节）
    function wan() { var n = Number(f('sale').value); $('#sp-wan').textContent = n > 0 ? '小程序显示「' + Math.floor(n / 10000) + '.XX万」' : '填真实售价，小程序显示为「XX.XX万」'; }
    count(); wan();
    f('remark').addEventListener('input', count);
    f('sale').addEventListener('input', function () { saleTouched = true; err('sale'); wan(); });
    // 手动登记：没改过实际售价时，实际售价跟着参考价走（与小程序手动登记相同）
    if (manual && !r) f('ref').addEventListener('input', function () { if (!saleTouched) { f('sale').value = f('ref').value; wan(); } });
    ['brand', 'model', 'variant', 'ref'].forEach(function (n) { f(n).addEventListener('input', function () { err(n); }); });

    form.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sp-group] button'); if (!b) return;
      var g = b.parentNode.dataset.spGroup, v = b.dataset.val;
      if (g === 'labels') { var i = d.labels.indexOf(v); if (i > -1) d.labels.splice(i, 1); else d.labels.push(v); b.classList.toggle('selected'); return; }
      d[g] = v;
      Array.prototype.forEach.call(b.parentNode.children, function (x) { x.classList.toggle('selected', x === b); });
      if (g === 'loc') err('loc'); else if (d.out && d.inn) err('color');
    });

    function pics(box, list, kind) {
      var max = 9, html = list.map(function (src, i) {
        return '<div class="sp-pic"><img src="' + src + '" alt="' + (kind === 'photos' ? '车辆照片' : '详情图片') + (i + 1) + '">' +
          (kind === 'photos' && i === 0 ? '<span class="sp-cover">封面</span>' : '') +
          '<button type="button" class="sp-del" data-del="' + i + '" aria-label="删除">×</button>' +
          (kind === 'details' && list.length > 1 ? '<span class="sp-move"><button type="button" data-mv="' + i + '" data-d="-1"' + (i === 0 ? ' disabled' : '') + ' aria-label="前移">‹</button><button type="button" data-mv="' + i + '" data-d="1"' + (i === list.length - 1 ? ' disabled' : '') + ' aria-label="后移">›</button></span>' : '') +
          '</div>';
      }).join('');
      if (list.length < max) html += '<label class="sp-add">＋<span>' + (kind === 'photos' ? '上传照片' : '添加图片') + '</span><small>' + list.length + ' / 9</small><input type="file" accept="image/jpeg,image/png" multiple hidden data-up="' + kind + '"></label>';
      box.innerHTML = html;
    }
    function drawVideo() {
      $('#sp-video').innerHTML = d.video
        ? '<div class="sp-pic sp-vid"><span>▶</span><small>' + esc(d.video.name) + '</small><button type="button" class="sp-del" data-delv="1" aria-label="删除视频">×</button></div>'
        : '<label class="sp-add">＋<span>上传视频</span><small>0 / 1</small><input type="file" accept="video/*" hidden data-up="video"></label>';
    }
    function drawAll() { pics($('#sp-photos'), d.photos, 'photos'); pics($('#sp-details'), d.details, 'details'); drawVideo(); }
    drawAll();
    form.addEventListener('click', function (e) {
      var del = e.target.closest('[data-del]'), mv = e.target.closest('[data-mv]');
      if (e.target.closest('[data-delv]')) { d.video = null; drawVideo(); return; }
      if (del) { (del.closest('#sp-photos') ? d.photos : d.details).splice(Number(del.dataset.del), 1); drawAll(); return; }
      if (mv) { var i = Number(mv.dataset.mv), j = i + Number(mv.dataset.d), a = d.details; if (j < 0 || j >= a.length) return; var t = a[i]; a[i] = a[j]; a[j] = t; drawAll(); }
    });
    form.addEventListener('change', function (e) {
      var inp = e.target.closest('[data-up]'); if (!inp) return;
      var kind = inp.dataset.up, files = Array.prototype.slice.call(inp.files); inp.value = '';
      if (!files.length) return;
      if (kind === 'video') { var v = files[0]; d.video = { name: v.name, src: URL.createObjectURL(v) }; drawVideo(); return; }
      var list = kind === 'photos' ? d.photos : d.details, room = 9 - list.length;
      if (files.length > room) toast(kind === 'photos' ? '最多上传9张车辆照片' : '详情图片最多9张');
      var ok = files.slice(0, room).filter(function (x) { if (/^image\/(jpeg|png)$/.test(x.type)) return true; toast('只能上传JPG或PNG图片'); return false; });
      if (!ok.length) return;
      $('#sp-save').disabled = true;
      Promise.all(ok.map(kind === 'photos' ? squareImage : readImage)).then(function (srcs) {
        Array.prototype.push.apply(list, srcs.slice(0, 9 - list.length));
        if (kind === 'photos') err('photos');
        drawAll();
      }).catch(function () { toast('图片读取失败，请重新上传'); }).then(function () { $('#sp-save').disabled = false; });
    });

    $('#sp-cancel').addEventListener('click', function () { sp = null; closeModal(); });
    if ($('#sp-reselect')) $('#sp-reselect').addEventListener('click', function () {
      // 重选后更新参考价、实际售价和颜色；已有图片、视频、位置、标签和备注保留（与小程序「重选型号」相同）
      var keepPhotos = pick && d.photos.join() === pick.v.photos.join() ? [] : d.photos.slice();
      sp.draft = { loc: d.loc, labels: d.labels.slice(), photos: keepPhotos, video: d.video, details: d.details.slice(), remark: f('remark').value };
      openSpPicker(true);
    });

    $('#sp-save').addEventListener('click', function () {
      ['brand', 'model', 'variant', 'ref', 'sale', 'color', 'loc', 'photos'].forEach(function (k) { err(k); });
      var v = { brand: f('brand').value.trim(), model: f('model').value.trim(), variant: f('variant').value.trim() };
      var refText = f('ref').value.trim(), saleText = f('sale').value.trim(), ref = Number(refText), sale = Number(saleText), first = null;
      function bad(k, m, at) { err(k, m); if (!first) first = { el: at || form.querySelector('[data-err="' + k + '"]'), m: m }; }
      if (!v.brand) bad('brand', '请输入品牌');
      if (!v.model) bad('model', '请输入车型');
      if (!v.variant) bad('variant', '请输入型号');
      if (manual && refText && !(ref > 0)) bad('ref', '参考价须大于0');
      if (!saleText) bad('sale', '请输入实际售价');
      else if (!(sale > 0)) bad('sale', '实际售价须大于0');
      if (!d.out || !d.inn) bad('color', '请选择外观颜色和内饰颜色', form.querySelector('[data-field="color"]'));
      if (!d.photos.length) bad('photos', '请至少上传1张车辆照片');
      if (!d.loc) bad('loc', '请选择车辆位置');
      if (first) { first.el.closest('.form-field').scrollIntoView({ block: 'center' }); toast(first.m); return; }
      var now = nowText(), patch = {
        price: Math.round(sale * 100) / 100, guide: manual ? (refText ? ref : null) : (r ? r.guide : pick.v.price),
        color: d.out, inner: d.inn, location: d.loc, labels: d.labels.slice(), photos: d.photos.slice(), detailImgs: d.details.slice(),
        video: !!d.video, videoName: d.video ? d.video.name : '', videoSrc: d.video ? d.video.src : '', remark: f('remark').value.trim()
      };
      if (r) {
        Object.assign(r, patch);
        r.ops.unshift({ t: now, who: '总部', act: '修改车辆信息' });
        closeModal(); render(); toast('保存成功');
        return;
      }
      var row = Object.assign({
        id: 'cs-sp-' + Date.now(), srcType: '特价车', special: true, manual: manual,
        hot: false, hotAt: 0, banner: false, bannerAt: 0, approve: '通过', opinion: '', auditAt: now, auditor: '总部',
        topEnd: null, topOrders: [], brand: v.brand, model: v.model, variant: v.variant, name: v.brand + ' ' + v.model,
        person: '总部', staffId: '', org: '总部', time: now, views: 0, sold: 0, on: true, offReason: '', offAt: '', offBy: '',
        ops: [{ t: now, who: '总部', act: '登记，保存即通过并上架' }]
      }, patch);
      row.no = nextNo(row);
      rows.unshift(row);
      sp = null;
      closeModal(); fillBrand(); page = 1; render(); toast('保存成功，已上架', 2600);
    });
  }

  // 注意：审核状态与上下架的 id 用 pc- 前缀，避开小程序视图里的同名 id
  var FIELDS = { code: 'q-code', brand: 'q-brand', model: 'q-model', person: 'q-person', org: 'q-org', stype: 'q-stype',
    srctype: 'q-srctype', approve: 'pc-approve', shelf: 'pc-shelf', hot: 'q-hot', banner: 'q-banner', loc: 'q-loc',
    from: 'q-from', to: 'q-to' };
  function readQuery() { Object.keys(FIELDS).forEach(function (k) { q[k] = $('#' + FIELDS[k]).value.trim(); }); page = 1; render(); }
  function clearFields() { Object.keys(FIELDS).forEach(function (k) { $('#' + FIELDS[k]).value = ''; }); fillBrand(); }

  // 从「类型维护」「登记人维护」点「近 30 天上传车辆数」跳入：带入所属类型或登记人＋登记时间最近 30 天，自动查询一次（第 5.1 节）
  function openWith(opt) {
    if (!$('#view-stock')) return;
    clearFields(); fillType();
    if (opt.type) $('#q-stype').value = opt.type;
    if (opt.person) $('#q-person').value = opt.person;
    $('#q-from').value = recentFrom(); $('#q-to').value = ymd(new Date(NOW));
    readQuery();
    if (window.showPrototypeView) window.showPrototypeView('stock');
    window.scrollTo(0, 0);
  }
  // 近 30 天上传车辆数：全部状态都算（含等待审核、驳回、已下架）
  function recentCount(f) {
    var from = recentFrom();
    return rows.filter(function (r) {
      if (!r.staffId || r.time.slice(0, 10) < from) return false;
      if (f.staffId) return r.staffId === f.staffId;
      if (f.type) return rowType(r) === f.type;
      return false;
    }).length;
  }
  window.PcStock = { open: openWith, recentCount: recentCount };
  window.dispatchEvent(new Event('pc-stock-ready'));

  function bind() {
    if (!$('#view-stock')) return;

    fillBrand(); fillType();
    $('#q-loc').innerHTML = '<option value="">全部</option>' + LOCATIONS.map(function (x) { return '<option>' + x + '</option>'; }).join('');
    $('#q-brand').addEventListener('change', fillModel);
    $('#q-stype').addEventListener('focus', fillType);

    $('#stock-query').addEventListener('click', readQuery);
    $('#stock-reset').addEventListener('click', function () { clearFields(); readQuery(); });
    $('#q-sort').addEventListener('change', function (e) { q.sort = e.target.value; page = 1; render(); });
    $('#stock-size').addEventListener('change', function (e) { size = Number(e.target.value); page = 1; render(); });
    $('#stock-prev').addEventListener('click', function () { if (page > 1) { page--; render(); } });
    $('#stock-next').addEventListener('click', function () { page++; render(); });

    $('#stock-body').addEventListener('click', function (e) {
      var f = e.target.closest('button[data-flag]');
      if (f) { setFlag(byId(f.dataset.id), f.dataset.flag); return; }
      var btn = e.target.closest('button[data-act]');
      if (!btn) return;
      var r = byId(btn.dataset.id);
      if (btn.dataset.act === 'detail') openDetail(r);
      if (btn.dataset.act === 'approve') openApprove(r);
      if (btn.dataset.act === 'off') doOff(r);
      if (btn.dataset.act === 'on') doOn(r);
      if (btn.dataset.act === 'untop') doUntop(r);
      if (btn.dataset.act === 'edit') openSpForm({ row: r });
    });
    $('#sp-add').addEventListener('click', function () { openSpPicker(); });

    render();

    var p = new URLSearchParams(location.search);
    // 带入查询：?type=A 或 ?person=李明（均为登记时间最近 30 天）
    if (p.get('type') || p.get('person')) openWith({ type: (p.get('type') || '').toUpperCase(), person: p.get('person') || '' });
    // 便于核验时直接截到详情画面
    if (p.get('detail') === '1') { var r0 = filtered().filter(function (x) { return x.on; })[0]; if (r0) openDetail(r0); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
