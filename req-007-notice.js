/* REQ-007 PC 端公告配置样稿
   依据：REQ-007-PC端公告配置需求方案 v1.0
   本地演示数据与浏览器临时状态，不连接任何接口。*/
(function () {
  'use strict';

  var MAX_TEXT = 40;
  var MAX_COUNT = 999;

  var seed = [
    '尾号 9989 正在查看 2024 款 丰田 赛那 2.5 混动尊享版',
    '尾号 8822 正在查看 2026 款 380TSI 四驱巡游版',
    '尾号 3170 正在查看 2025 款 本田 雅阁 260TURBO 智享版',
    '尾号 6045 正在查看 2024 款 坦克 500 Hi4-T',
    '尾号 2288 正在查看 2026 款 长安 启源 A07 550 优享型',
    '尾号 7761 正在查看 2025 款 比亚迪 汉 EV 长续航版',
    '本周已有 126 位车主通过预蒜完成提车',
    '全国 1000 余家线下交车中心均可交付',
    '尾号 5130 正在查看 2025 款 奥迪 A6L 45 TFSI 尊享动感型',
    '尾号 4417 正在查看 2024 款 宝马 X3 标准版',
    '尾号 9002 正在查看 2026 款 奔驰 GLC 260 L',
    '新能源专区已上新 38 款现车，支持全国交付'
  ];

  var rows = seed.map(function (text, i) {
    return {
      id: 'N' + String(i + 1).padStart(3, '0'),
      text: text,
      sort: (i + 1) * 10,
      enabled: i !== 6 && i !== 11,
      created: '2026-09-' + String(2 + (i % 8)).padStart(2, '0') + ' 10:0' + (i % 10),
      updated: '2026-09-' + String(2 + (i % 8)).padStart(2, '0') + ' 10:0' + (i % 10)
    };
  });

  var query = { text: '', status: '' };
  var page = 1;
  var pageSize = 20;
  var seq = rows.length;

  function $(sel) { return document.querySelector(sel); }
  function toast(msg) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 1800);
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function chars(s) { return Array.from(String(s)).length; }

  // 排序值升序，相同则按创建时间先后
  function sorted() {
    return rows.slice().sort(function (a, b) {
      if (a.sort !== b.sort) return a.sort - b.sort;
      return a.created < b.created ? -1 : a.created > b.created ? 1 : 0;
    });
  }

  function filtered() {
    return sorted().filter(function (r) {
      if (query.text && r.text.indexOf(query.text) === -1) return false;
      if (query.status === '启用' && !r.enabled) return false;
      if (query.status === '停用' && r.enabled) return false;
      return true;
    });
  }

  function render() {
    var list = filtered();
    var total = list.length;
    var maxPage = Math.max(1, Math.ceil(total / pageSize));
    if (page > maxPage) page = maxPage;
    var slice = list.slice((page - 1) * pageSize, page * pageSize);

    $('#notice-count').textContent = '已配置 ' + rows.length + ' / ' + MAX_COUNT + ' 条';

    var addBtn = $('#notice-add');
    var full = rows.length >= MAX_COUNT;
    addBtn.disabled = full;
    addBtn.title = full ? '公告数量已达上限 ' + MAX_COUNT + ' 条，请先删除或停用不再使用的公告' : '';

    $('#notice-table-body').innerHTML = slice.map(function (r) {
      return '<tr>' +
        '<td>' + esc(r.text) + '</td>' +
        '<td>' + r.sort + '</td>' +
        '<td><span class="status-dot' + (r.enabled ? ' on' : '') + '">' + (r.enabled ? '启用' : '停用') + '</span></td>' +
        '<td>' + r.updated + '</td>' +
        '<td><div class="table-actions">' +
        '<button data-act="edit" data-id="' + r.id + '">编辑</button>' +
        '<button data-act="toggle" data-id="' + r.id + '">' + (r.enabled ? '停用' : '启用') + '</button>' +
        '<button class="danger" data-act="del" data-id="' + r.id + '">删除</button>' +
        '</div></td></tr>';
    }).join('');

    var empty = $('#notice-empty');
    empty.hidden = total !== 0;
    empty.textContent = (query.text || query.status) ? '没有查询到匹配的公告' : '暂无公告';

    $('#notice-total').textContent = '共 ' + total + ' 条';
    $('#notice-page').textContent = page + ' / ' + maxPage;
    $('#notice-prev').disabled = page <= 1;
    $('#notice-next').disabled = page >= maxPage;
  }

  function closeModal() { $('#modal-root').innerHTML = ''; }

  function openForm(row) {
    var isEdit = !!row;
    var text = isEdit ? row.text : '';
    var sort = isEdit ? row.sort : (rows.reduce(function (m, r) { return Math.max(m, r.sort); }, 0) + 10);

    $('#modal-root').innerHTML =
      '<div class="modal-backdrop" id="nt-backdrop"><div class="modal"><div class="modal-header">' +
      '<h2>' + (isEdit ? '编辑公告' : '新增公告') + '</h2>' +
      '<button class="modal-close" id="nt-x">×</button></div>' +
      '<div class="modal-body"><div class="form-grid">' +
      '<label class="form-field full">公告文案<textarea id="nt-text" maxlength="' + MAX_TEXT + '" placeholder="请输入公告文案">' + esc(text) + '</textarea>' +
      '<span class="field-help" id="nt-count"></span><span class="field-error" id="nt-text-err" hidden></span></label>' +
      '<label class="form-field">排序值<input id="nt-sort" value="' + sort + '">' +
      '<span class="field-help">0—9999 的整数，数值小的排在前</span><span class="field-error" id="nt-sort-err" hidden></span></label>' +
      '<div class="form-field"><span class="field-help">新增默认启用；启用／停用在列表上操作，表单里没有状态字段。</span></div>' +
      '</div></div>' +
      '<div class="modal-footer"><button class="ghost" id="nt-cancel">取消</button><button class="primary" id="nt-save">保存</button></div>' +
      '</div></div>';

    var ta = $('#nt-text');
    function count() {
      var n = chars(ta.value);
      var c = $('#nt-count');
      c.textContent = n + ' / ' + MAX_TEXT;
      c.style.color = n >= MAX_TEXT ? '#b73b3b' : '';
    }
    count();
    ta.addEventListener('input', count);
    $('#nt-x').addEventListener('click', closeModal);
    $('#nt-cancel').addEventListener('click', closeModal);

    $('#nt-save').addEventListener('click', function () {
      var v = ta.value.trim();
      var sv = $('#nt-sort').value.trim();
      var te = $('#nt-text-err');
      var se = $('#nt-sort-err');
      te.hidden = true; se.hidden = true;

      if (!v) { te.textContent = '请输入公告文案'; te.hidden = false; return; }
      if (!/^\d+$/.test(sv) || Number(sv) > 9999) {
        se.textContent = '排序值请填 0—9999 的整数'; se.hidden = false; return;
      }
      var now = '2026-09-11 18:30';
      if (isEdit) {
        row.text = v; row.sort = Number(sv); row.updated = now;
        toast('已保存');
      } else {
        seq += 1;
        rows.push({ id: 'N' + String(seq).padStart(3, '0'), text: v, sort: Number(sv), enabled: true, created: now, updated: now });
        toast('已新增');
      }
      closeModal();
      render();
    });
  }

  function confirmBox(title, body, onOk) {
    $('#modal-root').innerHTML =
      '<div class="modal-backdrop"><div class="modal" style="width:min(460px,100%)"><div class="modal-header">' +
      '<h2>' + esc(title) + '</h2><button class="modal-close" id="nt-x2">×</button></div>' +
      '<div class="modal-body"><p style="margin:0">' + body + '</p></div>' +
      '<div class="modal-footer"><button class="ghost" id="nt-no">取消</button><button class="primary" id="nt-yes">确定</button></div>' +
      '</div></div>';
    $('#nt-x2').addEventListener('click', closeModal);
    $('#nt-no').addEventListener('click', closeModal);
    $('#nt-yes').addEventListener('click', function () { closeModal(); onOk(); });
  }

  function byId(id) { return rows.filter(function (r) { return r.id === id; })[0]; }

  function bind() {
    if (!$('#view-notice')) return;

    $('#notice-add').addEventListener('click', function () {
      if (rows.length >= MAX_COUNT) { toast('公告数量已达上限 ' + MAX_COUNT + ' 条'); return; }
      openForm(null);
    });
    $('#notice-query').addEventListener('click', function () {
      query.text = $('#notice-search').value.trim();
      query.status = $('#notice-status').value;
      page = 1;
      render();
    });
    $('#notice-reset').addEventListener('click', function () {
      $('#notice-search').value = '';
      $('#notice-status').value = '';
      query = { text: '', status: '' };
      page = 1;
      render();
    });
    $('#notice-page-size').addEventListener('change', function (e) {
      pageSize = Number(e.target.value); page = 1; render();
    });
    $('#notice-prev').addEventListener('click', function () { if (page > 1) { page -= 1; render(); } });
    $('#notice-next').addEventListener('click', function () { page += 1; render(); });

    $('#notice-table-body').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-act]');
      if (!btn) return;
      var row = byId(btn.dataset.id);
      if (!row) return;
      var act = btn.dataset.act;

      if (act === 'edit') { openForm(row); return; }

      if (act === 'toggle') {
        confirmBox(row.enabled ? '停用公告' : '启用公告',
          (row.enabled ? '停用后小程序首页不再滚动这条公告，记录保留，可再次启用。' : '启用后小程序首页会按排序值滚动这条公告。') +
          '<br><br><b>' + esc(row.text) + '</b>',
          function () {
            row.enabled = !row.enabled;
            row.updated = '2026-09-11 18:30';
            toast(row.enabled ? '已启用' : '已停用');
            render();
          });
        return;
      }

      if (act === 'del') {
        var head = Array.from(row.text).slice(0, 20).join('');
        confirmBox('删除公告',
          '确定删除「' + esc(head) + (chars(row.text) > 20 ? '…' : '') + '」？<br><br>公告是纯文案，删除后不可恢复，不影响其他公告的排序值。',
          function () {
            rows = rows.filter(function (r) { return r.id !== row.id; });
            toast('已删除');
            render();
          });
      }
    });

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
