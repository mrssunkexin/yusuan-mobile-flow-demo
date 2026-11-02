// TASK-043 第 3 步「流程图表」：①车源状态流转图 ②角色权限表 ③页面跳转图
// 每条边、每行权限都带规则总表编号（R001-xx 等，见 02-任务记录/TASK-043-开发前多维核对/需求规则总表.md），鼠标悬停看出处。
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- 规则出处速查（悬停提示用；全文见需求规则总表） ----------
  const RULES = {
    'R001-01': '登记人＝总部已开通的一级代理商、启用的登记人（DEC TASK-003）',
    'R001-02': '角色决定车源类型：一级代理商→库存车、登记人→一手车源、总部 PC→特价车（DEC-010）',
    'R001-03': '代理商登记由总部在 PC 商铺管理开关逐个开通（用户 2026-10-29）',
    'R001-04': '开关默认关、关闭后入口隐藏不能新登记修改、已登记车不受影响（我方细节·推断）',
    'R001-05': '车辆编号 TG／KC／Y＋类型代码，第一次审核通过生成，永不复用（用户 2026-10-28）',
    'R001-12': '流转表：提交→等待审核；通过→上架；驳回→下架；修改→等待审核；未改直接上架不重审（R2 附录 B）',
    'R001-13': '重审判定用值比对；置顶不参与（R2 附录 B）',
    'R001-14': '在售车被修改后立刻从前台消失（R2-11 细则 1）',
    'R001-15': '不设审核时限（R2-11 细则 4）',
    'R001-16': '本人只能操作自己登记的车（DEC TASK-003）',
    'R001-17': '登记人停用后不能登录；已登记车保持状态（DEC TASK-003）',
    'R001-18': '热销、banner 由总部在 PC 勾，登记人看不到不能改（SRC-003 1-00）',
    'R001-19': 'banner 每个列表最多 10 台（用户 2026-10-28）',
    'R001-21': '特价车只由总部在 PC 录入，保存即通过上架生成 TG（用户 2026-10-29）',
    'R001-22': '特价车：30 天自动下架同样生效、已售不弹、不能置顶、banner 单独计数（特价车重建方案）',
    'R001-26': '每步独立页面 navigateTo，不用弹窗（线上做法）',
    'R001-27': '登记人没有后台首页，登录后直接进车源登记页（用户 2026-09-15）',
    'R001-56': '保存→等待审核＋下架→「已提交，等待审核」进详情（R2-11）',
    'R001-57': '本人车辆详情按状态给按钮（用户 2026-10-28）',
    'R001-58': '修改时品牌车型型号只读（用户 2026-10-28）',
    'R001-59': '下架、重新上架只对「通过」的车（R2-13）',
    'R001-60': '下架原因四种：本人下架／PC 填写／三个用户标记已售／上架超过 N 天（SRC-003 2-02）',
    'R001-61': '上架满 N 天自动下架，默认 30，总部可改；置顶未到期顺延（SRC-005 02；用户 2026-10-30）',
    'R001-62': '每小时检查一次；重新上架后重新计天（我方细节·推断）',
    'R001-63': '任何下架已售计数清零（R2-19）',
    'R001-64': '驳回通知铃铛角标；点条目直接进修改页（用户 2026-09-13）',
    'R001-66': '使用中失去资格：403→清登录态、switchTab 到「我的」（用户 2026-09-17）',
    'R001-67': '付费置顶：本人、在售车；总部可取消不退款；下架或重审期间不停不退（R3-01）',
    'R001-75': '可配置项 11 个，总部改（§3.16）',
    'R002-03': '首页三卡点任意位置进该入口列表页，带入口类型（R2-02）',
    'R002-12': '三个圆形入口改为特价车、库存车、一手车源，带 sourceType 进列表（SRC-003 1-00）',
    'R002-16': '首页请求需登录态（commodityPage 实测 401 口径）',
    'R003-01': '车源详情走新接口；旧特价车（无 sourceType）照旧 commodityDetail（用户 2026-10-29）',
    'R003-10': '「登记人」浮钮只对一级代理商显示，C 端、二级、商家不渲染（R3-12）',
    'R003-12': '收藏：C 端与代理商都可，一人一车一条（R3-11）',
    'R003-13': '「我的」第 5 个入口「我的收藏」，只显示当前对外可见的车（R3-11）',
    'R003-18': '一级代理商拨号成功后回本页弹「车源是否已售」；本人选过「是」不再弹；特价车不弹（SRC-003 2-02）',
    'R003-19': '同一用户同一车只算一次；满 3 个不同用户自动下架（用户 2026-10-28）',
    'R003-20': '下架即清零，重新上架可再被弹（R2-19）',
    'R003-21': '已下架、等待审核、驳回的车经旧链接打开提示「车辆不可查看」（用户 2026-09-13）',
    'R003-22': '浏览线索沿用 saveBrowseClues，bizId＝车源 id（用户 2026-09-13）',
    'R003-23': '询底价线索必须写车辆名称（用户 2026-10-28）',
    'R003-24': '浏览记录进详情带 sourceType（REQ-003 §7.4）',
    'R003-30': '已售确认校验：非一级「只有一级代理商可以确认」、特价车「该车辆不需要确认」',
    'R003-31': '分享路径追加 sourceType；旧特价车分享不改（REQ-003 §8.7）',
    'R004-01': '车源管理：总部查看、审核、上下架三类车；只能新增修改特价车（R2-17）',
    'R004-03': '顶部「新增特价车」唯一新增入口（SRC-006 00）',
    'R004-05': '从类型维护、登记人维护点数字跳入，带条件＋最近 30 天（用户 2026-10-28）',
    'R004-06': '等待审核一律置顶排序（R2-11 细则 4）',
    'R004-09': '操作列：等待审核「审核」否则「查看」；按上下架给「下架／上架」；置顶中「取消置顶」；特价车「修改」（R2-18）',
    'R004-10': '热销：通过的车都可点；banner：只有在售车，下架自动取消（REQ-004 §5.4 v2.9，用户「P33 可以」）',
    'R004-11': 'PC 详情弹窗不显示售车人联系方式（用户 2026-09-11）',
    'R004-13': '审核弹窗：通过→上架＋生成编号；驳回→下架＋通知，意见必填（用户 2026-09-13）',
    'R004-14': '取消置顶只在置顶中出现，不退款；总部不能给车置顶（用户 2026-09-29）',
    'R004-15': '新增特价车：燃油／新能源→品牌→车型→型号，保存即通过上架生成 TG（特价车重建方案）',
    'R004-16': '修改特价车不触发审核、不改上下架编号热销 banner（特价车重建方案）',
    'R004-21': '总部下架原因必填 ≤100 字；总部也可上架不重审（用户 2026-10-28；R2-14）',
    'R004-27': '权限跟菜单走，不设独立角色（用户 2026-09-12）',
    'R005-01': '「4S店信息维护」改为「类型维护」（SRC-003 2-05）',
    'R005-04': '类型列表登记人数→跳登记人维护；近 30 天上传数→跳车源管理（SRC-005 02）',
    'R005-09': '类型维护不提供删除（§3.0 放行）',
    'R006-04': '登记人列表近 30 天上传数点击跳车源管理带登记人＋30 天（SRC-005 03）',
    'R006-05': '登记人新增默认启用；停用后不能登录、已登记车保持（24 项决策 MISS-05）',
    'R006-08': '统一车源联系人：登记人维护列表顶部按钮弹窗（DEC TASK-003）',
    'R006-11': '批量导入 .xlsx，全部通过才导入（SRC-003 1-01）',
    'R007-01': '公告只有文案、排序、启停；纯文案（用户 2026-09-11）',
    'R008-04': '列表只显示 audit_status=1 且 shelf_status=1 的车（用户 2026-09-13）',
    'R008-08': '选品牌页「不限」后加「其他品牌」，返回带 sourceType（R2-08）',
    'R008-14': '进详情 shopDetail?id&sourceType（方案第三节）',
    'R009-01': '商户登录页「登录」下加「车源登记登录」按钮（R2-23、R3-02）',
    'R009-02': '车源登记登录页新页 staffLogin：手机号＋身份证后六位（R3-05）',
    'R009-04': '登录成功 redirectTo 车源登记页；返回键回商户登录页（用户 2026-09-15）',
    'R009-05': '「我的→管理后台」有 token 按 isStaff4s 进登记页，无 token 进商户登录（user.vue toSeller 现状）',
    'R009-06': '车源登记页顶栏「退出」只对登记人；确定后清 token 回「我的」（用户 2026-10-25、10-28）',
    'R009-07': '停用登记人登录提示「账号已停用，请联系总部管理员」（REQ-006 §2.7）',
    'R009-08': '用错登录页互相提示（登记人用验证码／代理商用车源登记登录）（R3-02 连带）',
    'R009-09': '密码＝身份证后六位（R2-25）',
    'R010-01': '线索卡片有手机号才显示「拨号」（R2-26）',
    'R010-04': '「联系车源」只对一级代理商，浏览／底价线索（SRC-003 2-07；用户「二级代理商看不到」）',
    'R010-08': 'PC 不加拨号、不记拨号次数（REQ-010 §2）',
    'P-10': '用户 2026-11-02：编号与统计按车辆登记时的归属类型',
    'P-15': '用户 2026-11-02：「本人不能确认已售，本人可以下架」',
    'P-33': '用户 2026-11-02：「P33 可以」下架自动取消 banner，名额只算在售车',
    '§1.5': 'REQ-001 §1.5：等待审核与驳回时上下架锁死为下架，登记人与总部均不可操作',
    '§2.14.2': 'REQ-001 §2.14.2：保存时逐字段比对，任一不同即置回等待审核',
    '§2.15.1': 'REQ-001 §2.15.1 v2.15：驳回置 reject_read=0，打开通知列表置 1',
    '§3.5': 'REQ-001 §3.5 v2.15：审核通过自动上架只记「审核通过」一条',
    '§6.3': 'REQ-003 §6.3 v2.15：登记人本人不记、不弹、不计数',
    '§5.4': 'REQ-004 §5.4 v2.9：banner 只有在售车能点，下架自动取消；名额只算在售',
    'REQ-005': 'REQ-005 类型维护全篇（总部 PC）',
    'REQ-006': 'REQ-006 登记人维护全篇（总部 PC）',
    'REQ-007': 'REQ-007 公告配置全篇（总部 PC）',
    '登记人看车': '登记人账号只用于车源登记登录；看车用的是普通小程序身份，和 C 端用户一样（用户 2026-11-02 认可此写法）',
    '搜索': '搜 REQ-001 全文「取消置顶」4 处（第 144、747、876、1374 行），只写总部可取消，没写本人能否取消'
  };
  const ruleTitle = (ids) => ids.map((id) => `${id}：${RULES[id] || '见需求规则总表'}`).join('\n');
  const ruleHtml = (ids) => ids.map((id) => `<span class="fc-rule" title="${esc(RULES[id] || '见需求规则总表')}">${esc(id)}</span>`).join(' ');

  // ---------- ① 车源状态流转 ----------
  const STATE_EDGES = [
    { id: 'E01', from: '登记提交', to: '等待审核', who: '登记人／一级代理商', trig: '登记表保存', res: '等待审核＋下架；提示「已提交，等待审核」进详情；此时没有车辆编号', rules: ['R001-12', 'R001-56', 'R001-02'], v: '查证' },
    { id: 'E02', from: '总部保存特价车', to: '在售', who: '总部（PC 车源管理）', trig: '新增特价车保存', res: '直接通过＋上架、生成 TG 编号，不走审核；提示「保存成功，已上架」', rules: ['R001-21', 'R004-15'], v: '查证' },
    { id: 'E03', from: '等待审核', to: '在售', who: '总部（PC 审核弹窗）', trig: '审核「通过」', res: '通过＋上架；第一次通过生成 KC／Y＋类型代码编号（按车辆登记时的归属类型）；操作记录只记「审核通过」一条', rules: ['R001-12', 'R001-05', 'R004-13', 'P-10', '§3.5'], v: '查证' },
    { id: 'E04', from: '等待审核', to: '驳回', who: '总部（PC 审核弹窗）', trig: '审核「驳回」，意见必填', res: '驳回＋下架；登记人铃铛未读＋1；卡片变「修改」大按钮并显示驳回原因', rules: ['R001-12', 'R004-13', 'R001-64', '§2.15.1'], v: '查证' },
    { id: 'E05', from: '驳回', to: '等待审核', who: '本人（登记人／一级代理商）', trig: '修改表保存', res: '回到等待审核；品牌、车型、型号只读不能改', rules: ['R001-12', 'R001-58', 'R001-16'], v: '查证' },
    { id: 'E06', from: '在售', to: '等待审核', who: '本人', trig: '修改表保存，且值比对有任一字段不同', res: '回到等待审核、立刻从前台消失；已售计数清零；这次下架不显示下架原因。例外：总部修改特价车不回审、状态不变', rules: ['R001-12', 'R001-13', 'R001-14', 'R001-60', 'R001-63', 'R004-16'], v: '查证' },
    { id: 'E07', from: '在售', to: '已下架', who: '本人', trig: '卡片／详情「下架」，二次确认（含车辆编号）', res: '下架原因「本人下架」', rules: ['R001-59', 'R001-60'], v: '查证' },
    { id: 'E08', from: '在售', to: '已下架', who: '总部（PC 列表或详情）', trig: '「下架」，原因必填 ≤100 字', res: '下架原因＝总部填写的文字，登记人在卡片与详情看到；特价车同样', rules: ['R004-21', 'R001-60'], v: '查证' },
    { id: 'E09', from: '在售', to: '已下架', who: '系统（第 3 个不同一级代理商确认时）', trig: '一级代理商（非本人）拨号后在详情页选「是」，累计 3 个不同用户', res: '下架原因「三个用户标记该车辆已售」；操作人「系统」；特价车不计、不弹', rules: ['R003-18', 'R003-19', 'R001-22', 'P-15'], v: '查证' },
    { id: 'E10', from: '在售', to: '已下架', who: '系统（定时检查）', trig: '从最近一次上架起满 N 天（参数默认 30，总部可改）', res: '下架原因「上架超过 N 天自动下架」；置顶未到期的顺延到置顶结束再下架；每小时检查一次（检查频率为我方细节）', rules: ['R001-61', 'R001-62', 'R001-22'], v: '查证' },
    { id: 'E11', from: '已下架', to: '在售', who: '本人或总部', trig: '「重新上架」／「上架」，二次确认；未改任何信息', res: '直接上架不重审；编号不变；从新的上架时间重新计 N 天；已售从 0 起', rules: ['R001-12', 'R001-59', 'R001-62', 'R004-21'], v: '查证' },
    { id: 'E12', from: '已下架', to: '等待审核', who: '本人', trig: '修改表保存，且值比对有任一字段不同', res: '保存时就置回等待审核（不是等到点上架才回审）；通过后再上架', rules: ['§2.14.2', 'R001-12'], v: '查证' }
  ];
  const STATE_SIDE = [
    { k: '进入「已下架」时一并发生（E07～E10 都适用）', v: '已售计数清零；banner 自动取消、名额只算在售车；热销勾选保留但不对外显示；付费置顶不停不退、到期自动恢复', rules: ['R001-63', '§5.4', 'P-33', 'R004-10', 'R001-67'] },
    { k: '等待审核、驳回时', v: '上下架锁死为下架，登记人与总部都不能上下架；对外一律不可见；旧链接打开提示「车辆不可查看」', rules: ['§1.5', 'R003-21'] },
    { k: '车辆编号', v: '库存车／一手车源第一次审核通过时生成，特价车保存时生成；之后修改、下架、重审都不变，不复用', rules: ['R001-05', 'P-10'] },
    { k: '付费置顶（只有库存车、一手车源）', v: '本人只能给在售车买；下架、重审期间不停不退；总部可取消、不退款；总部取消后如已满 N 天由下一次检查下架', rules: ['R001-67', 'R004-14', 'R001-61', 'R001-22'] },
    { k: '登记人停用／代理商开关关闭／代理商商铺停用', v: '已登记车保持原状态，继续按本图流转，到期由 E10 自动下架；总部仍可在 PC 管理', rules: ['R001-17', 'R001-04', 'R006-05'] }
  ];
  const SCENARIOS = [
    { name: '场景一：一级代理商登记库存车 → 驳回 → 修改 → 通过上架 → 3 人标记已售下架 → 重新上架', steps: [
      ['一级代理商在车源登记页保存一台库存车', 'E01', 'A'],
      ['总部在 PC 审核弹窗选「驳回」并填意见', 'E04', 'D'],
      ['代理商点驳回卡片的大「修改」按钮，改完保存', 'E05', 'A'],
      ['总部审核「通过」，生成 KC 编号，车出现在库存车列表', 'E03', 'B'],
      ['三个不同的一级代理商先后拨号、回到详情页选「是」', 'E09', 'C'],
      ['代理商（或总部）点「重新上架」，没改信息，不重审，重新计 30 天', 'E11', 'B']
    ] },
    { name: '场景二：总部新增特价车 → 满 30 天自动下架 → 总部上架', steps: [
      ['总部在车源管理「新增特价车」保存，生成 TG 编号，直接在售', 'E02', 'B'],
      ['上架满 30 天，系统自动下架，原因「上架超过 N 天自动下架」', 'E10', 'C'],
      ['总部在 PC 点「上架」，二次确认，不重审', 'E11', 'B']
    ] },
    { name: '场景三：在售一手车源被登记人改价 → 回审 → 通过', steps: [
      ['登记人修改实际售价并保存，值比对有变化', 'E06', 'A'],
      ['车立刻从列表、首页、收藏列表消失，已售计数清零', 'E06', 'A'],
      ['总部审核「通过」，编号不变，重新上架', 'E03', 'B']
    ] }
  ];

  // 手绘 SVG：节点坐标固定（画布 1100×560）
  const SN = {
    A: { x: 330, y: 60, w: 200, h: 72, t: '等待审核', s: '审核＝等待审核 · 下架 · 不对外显示' },
    B: { x: 700, y: 60, w: 200, h: 72, t: '在售', s: '审核＝通过 · 上架 · 列表／首页／详情可见', cls: 'live' },
    D: { x: 330, y: 430, w: 200, h: 72, t: '驳回', s: '审核＝驳回 · 下架 · 显示驳回原因、通知角标', cls: 'rej' },
    C: { x: 700, y: 430, w: 200, h: 72, t: '已下架', s: '审核＝通过 · 下架 · 显示下架原因', cls: 'off' }
  };
  const SP = {
    reg: { x: 40, y: 60, w: 220, h: 72, t: '登记提交', s: '登记人／一级代理商 · 小程序' },
    sp: { x: 40, y: 230, w: 220, h: 72, t: '总部保存特价车', s: '总部 · PC 车源管理' }
  };
  // 每条边的路径与编号圆点位置
  const SE = {
    E01: { d: 'M260,96 H330', lx: 295, ly: 96 },
    E02: { d: 'M260,266 H740 V132', lx: 500, ly: 266 },
    E03: { d: 'M530,84 H700', lx: 615, ly: 84 },
    E06: { d: 'M700,110 H530', lx: 615, ly: 110 },
    E04: { d: 'M400,132 V430', lx: 400, ly: 281 },
    E05: { d: 'M460,430 V132', lx: 460, ly: 281 },
    E07: { d: 'M840,132 V430', lx: 840, ly: 240 },
    E08: { d: 'M840,132 V430', lx: 840, ly: 282 },
    E09: { d: 'M840,132 V430', lx: 840, ly: 324 },
    E10: { d: 'M840,132 V430', lx: 840, ly: 366 },
    E11: { d: 'M790,430 V132', lx: 790, ly: 380 },
    E12: { d: 'M720,430 V330 H500 V132', lx: 610, ly: 330 }
  };

  function renderState(root) {
    const defs = '<defs><marker id="fc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#595959"/></marker><marker id="fc-arrow-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#1890ff"/></marker></defs>';
    const node = (k, n, pill) => `<g class="fc-sn ${pill ? 'pill' : ''} ${n.cls || ''}" data-node="${k}"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${pill ? 36 : 8}"/><text class="fc-sn-t" x="${n.x + n.w / 2}" y="${n.y + 30}" text-anchor="middle">${esc(n.t)}</text><text class="fc-sn-s" x="${n.x + n.w / 2}" y="${n.y + 52}" text-anchor="middle">${esc(n.s)}</text></g>`;
    const edge = (e) => {
      const p = SE[e.id];
      return `<g class="fc-se" data-edge="${e.id}"><title>${esc(e.id)} ${esc(e.from)} → ${esc(e.to)}｜${esc(e.who)}｜${esc(e.trig)}\n依据 ${esc(ruleTitle(e.rules))}</title><path d="${p.d}" marker-end="url(#fc-arrow)"/><circle cx="${p.lx}" cy="${p.ly}" r="11"/><text x="${p.lx}" y="${p.ly + 4}" text-anchor="middle">${e.id.slice(1)}</text></g>`;
    };
    // E07～E10 共用一条线，只画一次线、四个编号
    const sharedLine = '<g class="fc-se fc-se-shared" data-edge="E07 E08 E09 E10"><path d="M840,132 V430" marker-end="url(#fc-arrow)"/></g>';
    const edgesHtml = STATE_EDGES.map((e) => (['E07', 'E08', 'E09', 'E10'].includes(e.id) ? edge(e).replace(/<path[^>]*\/>/, '') : edge(e))).join('');
    const notes = `<text class="fc-sv-note" x="40" y="340">两个维度：审核（等待审核／通过／驳回）× 上下架。</text><text class="fc-sv-note" x="40" y="362">只有「通过」才可能上架；特价车保存即通过。</text><text class="fc-sv-note" x="40" y="400">右侧一条线四个编号：7 本人下架 · 8 总部下架 · 9 三人已售 · 10 满 N 天</text><text class="fc-sv-note" x="40" y="422">点下方场景步骤，图上对应的边会亮。</text>`;
    const svg = `<svg class="fc-svg" viewBox="0 0 1100 560" role="img" aria-label="车源状态流转图">${defs}${sharedLine}${edgesHtml}${Object.entries(SP).map(([k, n]) => node(k, n, true)).join('')}${Object.entries(SN).map(([k, n]) => node(k, n, false)).join('')}${notes}</svg>`;
    const table = `<table class="fc-table"><thead><tr><th>编号</th><th>从 → 到</th><th>谁 · 怎么触发</th><th>结果</th><th>依据</th><th>核</th></tr></thead><tbody>${STATE_EDGES.map((e) => `<tr data-edge-row="${e.id}"><td><b>${e.id}</b></td><td>${esc(e.from)} → ${esc(e.to)}</td><td><b>${esc(e.who)}</b><br>${esc(e.trig)}</td><td>${esc(e.res)}</td><td>${ruleHtml(e.rules)}</td><td><span class="fc-v ${e.v === '查证' ? 'ok' : 'inf'}">${e.v}</span></td></tr>`).join('')}</tbody></table>`;
    const side = `<div class="fc-cards">${STATE_SIDE.map((s) => `<div class="fc-card"><b>${esc(s.k)}</b><p>${esc(s.v)}</p><div>${ruleHtml(s.rules)}</div></div>`).join('')}</div>`;
    const scen = `<div class="fc-scen">${SCENARIOS.map((s, i) => `<div class="fc-scen-one"><h4>${esc(s.name)}</h4><ol>${s.steps.map((st) => `<li><button type="button" class="fc-step" data-edge="${st[1]}" data-state="${st[2]}">${esc(st[0])}<small>${st[1]} → ${esc(SN[st[2]].t)}</small></button></li>`).join('')}</ol></div>`).join('')}</div>`;
    root.innerHTML = `<div class="fc-state-wrap"><div class="fc-svg-box">${svg}</div><h3>每条边的规则</h3>${table}<h3>随状态一起变的东西</h3>${side}<h3>拿真实场景走一遍（点步骤，图上亮边）</h3>${scen}</div>`;
    root.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.fc-step');
      if (!btn) return;
      root.querySelectorAll('.fc-step.on').forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      const id = btn.dataset.edge;
      root.querySelectorAll('.fc-se, .fc-sn, [data-edge-row]').forEach((el) => el.classList.remove('on'));
      root.querySelectorAll(`.fc-se[data-edge~="${id}"]`).forEach((el) => el.classList.add('on'));
      const row = root.querySelector(`[data-edge-row="${id}"]`);
      if (row) row.classList.add('on');
      const n = root.querySelector(`.fc-sn[data-node="${btn.dataset.state}"]`);
      if (n) n.classList.add('on');
    });
  }

  // ---------- ② 角色权限表 ----------
  const ROLES = [
    { k: 'hq', t: '总部', s: 'PC 后台' },
    { k: 'l1', t: '一级代理商', s: '小程序 · 库存车登记人' },
    { k: 'reg', t: '登记人', s: '小程序 · 一手车源' },
    { k: 'l2', t: '二级代理商／商家', s: '小程序 ToB' },
    { k: 'c', t: 'C 端用户', s: '小程序客户' },
    { k: 'sys', t: '系统', s: '定时／自动' }
  ];
  const Y = (n) => ({ t: 'y', n: n || '' });
  const N = (n) => ({ t: 'n', n: n || '' });
  const NA = (n) => ({ t: 'na', n: n || '' });
  const PERM = [
    { g: '车源登记与维护', rows: [
      { op: '登记库存车', hq: N('PC 不登记库存车'), l1: Y('需总部在商铺管理开通「是否可登记车源」'), reg: N(), l2: N(), c: N(), sys: NA(), rules: ['R001-01', 'R001-02', 'R001-03'], v: '查证' },
      { op: '登记一手车源', hq: N(), l1: N(), reg: Y('编号 Y＋登记时所属类型代码'), l2: N(), c: N(), sys: NA(), rules: ['R001-02', 'R001-05', 'P-10'], v: '查证' },
      { op: '新增特价车', hq: Y('保存即通过上架、生成 TG'), l1: N('小程序无入口'), reg: N('小程序无入口'), l2: N(), c: N(), sys: NA(), rules: ['R001-21', 'R004-03'], v: '查证' },
      { op: '修改车辆信息', hq: Y('只能改特价车；不触发审核'), l1: Y('只改自己登记的车；品牌车型型号只读；有变化回等待审核'), reg: Y('同一级代理商'), l2: N(), c: N(), sys: NA(), rules: ['R004-01', 'R004-16', 'R001-16', 'R001-58', 'R001-13'], v: '查证' },
      { op: '审核通过／驳回', hq: Y('驳回意见必填'), l1: N(), reg: N(), l2: N(), c: N(), sys: N('不自动审核、不设时限'), rules: ['R004-13', 'R001-15'], v: '查证' },
      { op: '下架', hq: Y('原因必填 ≤100 字，登记人可见'), l1: Y('自己的、已通过的车'), reg: Y('自己的、已通过的车'), l2: N(), c: N(), sys: Y('3 人确认已售；上架满 N 天'), rules: ['R004-21', 'R001-59', 'R003-19', 'R001-61'], v: '查证' },
      { op: '重新上架', hq: Y('已通过且已下架的车，不重审'), l1: Y('自己的车，未改信息不重审'), reg: Y('同一级代理商'), l2: N(), c: N(), sys: N('到期不自动上架'), rules: ['R004-21', 'R001-59', 'R001-12'], v: '查证' },
      { op: '付费置顶／续期', hq: N('总部不能给车置顶'), l1: Y('自己在售的库存车'), reg: Y('自己在售的一手车源'), l2: N(), c: N(), sys: Y('到期自动恢复排序'), rules: ['R001-67', 'R004-14', 'R001-22'], v: '查证' },
      { op: '取消置顶', hq: Y('只在置顶中出现；不退款'), l1: N('需求只写总部可取消，没写本人取消'), reg: N('同左'), l2: N(), c: N(), sys: N(), rules: ['R004-14', 'R001-67', '搜索'], v: '推断' },
      { op: '勾热销／banner', hq: Y('热销：通过的车；banner：只有在售车，每列表 10 台'), l1: N('看不到、不能改'), reg: N('看不到、不能改'), l2: N(), c: N(), sys: Y('车下架时自动取消 banner'), rules: ['R004-10', 'R001-18', 'R001-19', '§5.4'], v: '查证' },
      { op: '看车辆的状态、编号、下架原因、已售人数、查看次数', hq: Y('三类车全部，车源管理列表与详情'), l1: Y('只看自己登记的；无已售人数、查看次数'), reg: Y('同一级代理商'), l2: N(), c: N(), sys: NA(), rules: ['R004-01', 'R001-16', 'R001-57'], v: '查证' },
      { op: '收驳回通知（铃铛角标）', hq: NA(), l1: Y('只发驳回不发通过'), reg: Y('同左'), l2: N(), c: N(), sys: NA(), rules: ['R001-64'], v: '查证' },
      { op: '车源登记页「退出」按钮', hq: NA(), l1: N('用后台首页现有退出'), reg: Y('确定后清 token 回「我的」'), l2: N(), c: N(), sys: NA(), rules: ['R009-06'], v: '查证' }
    ] },
    { g: '对外浏览（小程序首页三卡、列表、详情）', rows: [
      { op: '浏览在售车（首页三卡／三个圆形入口／列表／详情）', hq: NA('PC 用车源管理看'), l1: Y('需登录'), reg: Y('需登录'), l2: Y('需登录'), c: Y('需登录'), sys: NA(), rules: ['R008-04', 'R002-16', 'R002-12', '登记人看车'], v: '查证' },
      { op: '看「登记人」浮钮、拨打登记人电话', hq: N('PC 详情不显示联系方式'), l1: Y('库存车、一手车源、特价车都有；本人也显示'), reg: N(), l2: N('不渲染'), c: N('不渲染'), sys: NA(), rules: ['R003-10', 'R004-11'], v: '查证' },
      { op: '确认「车源是否已售」', hq: N(), l1: Y('库存车／一手车源、非本人、一人一车一次；特价车不弹'), reg: N('本人不弹不计；非本人的车不是一级代理商'), l2: N('「只有一级代理商可以确认」'), c: N(), sys: Y('满 3 人自动下架'), rules: ['R003-18', 'R003-19', 'R003-30', '§6.3', 'P-15'], v: '查证' },
      { op: '收藏／取消收藏，看「我的收藏」', hq: N(), l1: Y(), reg: Y('以 C 端身份'), l2: Y(), c: Y(), sys: NA(), rules: ['R003-12', 'R003-13'], v: '查证' },
      { op: '产生浏览线索、询底价线索', hq: NA(), l1: Y('自己店的车不记'), reg: Y(), l2: Y(), c: Y(), sys: NA(), rules: ['R003-22', 'R003-23'], v: '查证' }
    ] },
    { g: '线索页（代理商／商家后台「销售线索」）', rows: [
      { op: '线索卡片「拨号」', hq: N('PC 不加拨号'), l1: Y('有手机号的卡片'), reg: N('没有后台首页'), l2: Y('有手机号的卡片'), c: N(), sys: NA(), rules: ['R010-01', 'R010-08', 'R001-27'], v: '查证' },
      { op: '线索卡片「联系车源」', hq: N(), l1: Y('浏览／底价线索；拨完不弹已售确认'), reg: N(), l2: N('二级代理商看不到'), c: N(), sys: NA(), rules: ['R010-04'], v: '查证' }
    ] },
    { g: 'PC 维护', rows: [
      { op: '类型维护（新增／修改，不能删）', hq: Y(), l1: N(), reg: N(), l2: N(), c: N(), sys: NA(), rules: ['R005-01', 'R005-09', 'REQ-005'], v: '查证' },
      { op: '登记人维护（新增／修改／启停／批量导入）', hq: Y(), l1: N(), reg: N(), l2: N(), c: N(), sys: NA(), rules: ['R006-05', 'R006-11', 'REQ-006'], v: '查证' },
      { op: '设置统一车源联系人', hq: Y('登记人维护列表顶部按钮'), l1: N(), reg: N(), l2: N(), c: N(), sys: NA(), rules: ['R006-08'], v: '查证' },
      { op: '公告配置', hq: Y(), l1: N(), reg: N(), l2: N(), c: N(), sys: NA(), rules: ['R007-01', 'REQ-007'], v: '查证' },
      { op: '开通代理商「是否可登记车源」', hq: Y('商铺管理，只对一级代理'), l1: N(), reg: N(), l2: N(), c: N(), sys: NA(), rules: ['R001-03'], v: '查证' },
      { op: '改自动下架天数、置顶价格等配置项', hq: Y('配置管理，上线必须初始化'), l1: N(), reg: N(), l2: N(), c: N(), sys: NA(), rules: ['R001-61', 'R001-75'], v: '查证' }
    ] },
    { g: '登录', rows: [
      { op: '车源登记登录（手机号＋身份证后六位）', hq: NA(), l1: N('提示「代理商、商家请返回上一页，用手机号验证码登录」'), reg: Y(), l2: N('同左'), c: NA(), sys: NA(), rules: ['R009-02', 'R009-09', 'R009-08'], v: '查证' },
      { op: '商户验证码登录', hq: NA(), l1: Y(), reg: N('提示「登记人请点击下方【车源登记登录】」'), l2: Y(), c: NA(), sys: NA(), rules: ['R009-08', 'R009-01'], v: '查证' },
      { op: '停用后登录', hq: NA(), l1: N('代理商启停由原功能处理'), reg: N('「账号已停用，请联系总部管理员」'), l2: N(), c: NA(), sys: NA(), rules: ['R009-07', 'R006-05'], v: '查证' }
    ] }
  ];
  function renderPerm(root) {
    const sym = { y: '✓', n: '✗', na: '—' };
    const head = `<thead><tr><th class="fc-op">操作</th>${ROLES.map((r) => `<th><b>${esc(r.t)}</b><small>${esc(r.s)}</small></th>`).join('')}<th>依据</th><th>核</th></tr></thead>`;
    const body = PERM.map((g) => `<tr class="fc-group"><td colspan="${ROLES.length + 3}">${esc(g.g)}</td></tr>${g.rows.map((row) => `<tr><td class="fc-op">${esc(row.op)}</td>${ROLES.map((r) => { const c = row[r.k]; return `<td class="fc-cell ${c.t}"><span class="fc-sym">${sym[c.t]}</span>${c.n ? `<small>${esc(c.n)}</small>` : ''}</td>`; }).join('')}<td class="fc-rules">${ruleHtml(row.rules)}</td><td><span class="fc-v ${row.v === '查证' ? 'ok' : 'inf'}">${row.v}</span></td></tr>`).join('')}`).join('');
    root.innerHTML = `<p class="fc-hint">✓ 能　✗ 不能　— 这个角色没有这个场景。格子里的小字是限定条件；「依据」列的编号悬停看出处。三类车不同的地方写在格子里。</p><div class="fc-perm-wrap"><table class="fc-table fc-perm">${head}<tbody>${body}</tbody></table></div>`;
  }

  // ---------- ③ 页面跳转图 ----------
  const COLW = 186, ROWH = 84, NODEW = 160, NODEH = 60, LANE_PAD = 44;
  const LANES = [
    { k: 'c', t: '小程序 · C 端浏览', rows: 3 },
    { k: 'b', t: '小程序 · 登录与车源登记（代理商／登记人后台）', rows: 3 },
    { k: 'p', t: 'PC · 总部后台', rows: 5 }
  ];
  const PN = [
    // 小程序 C 端
    { id: 'c_home', lane: 'c', col: 0, row: 0, t: '首页', s: 'pages/index · 三卡＋三个圆形入口' },
    { id: 'c_list', lane: 'c', col: 1, row: 0, t: '车辆列表页', s: 'shop/list?sourceType · 在售车' },
    { id: 'c_brand', lane: 'c', col: 1, row: 1, t: '选品牌页', s: 'chooseCar · 含「其他品牌」' },
    { id: 'c_detail', lane: 'c', col: 2, row: 0, t: '详情页', s: 'shopDetail?id&sourceType' },
    { id: 'c_old', lane: 'c', col: 2, row: 1, t: '旧特价车详情', s: 'commodityDetail · 链接无 sourceType' },
    { id: 'c_contact', lane: 'c', col: 3, row: 0, t: '「登记人」弹窗 → 拨号', s: '只一级代理商' },
    { id: 'c_sold', lane: 'c', col: 4, row: 0, t: '「车源是否已售」弹窗', s: '回到详情 onShow 弹' },
    { id: 'c_share', lane: 'c', col: 3, row: 1, t: '分享链接／转发卡片', s: '路径带 sourceType' },
    { id: 'c_user', lane: 'c', col: 0, row: 2, t: '我的', s: 'pages/user' },
    { id: 'c_fav', lane: 'c', col: 1, row: 2, t: '我的收藏', s: 'user/favorite 新页' },
    { id: 'c_hist', lane: 'c', col: 2, row: 2, t: '浏览记录', s: 'historyToDetail 带 sourceType' },
    // 小程序 ToB
    { id: 'b_user', lane: 'b', col: 0, row: 0, t: '我的 →「管理后台」', s: 'user.vue toSeller' },
    { id: 'b_login', lane: 'b', col: 1, row: 0, t: '商户登录页', s: 'sellerLogin · 验证码' },
    { id: 'b_staff', lane: 'b', col: 1, row: 1, t: '车源登记登录页', s: 'staffLogin 新页 · 手机号＋身份证后六位' },
    { id: 'b_home', lane: 'b', col: 2, row: 0, t: '代理商后台首页', s: 'seller/index · 入口按开关显示' },
    { id: 'b_clue', lane: 'b', col: 2, row: 1, t: '销售线索页', s: 'clueList · 拨号／联系车源' },
    { id: 'b_reg', lane: 'b', col: 3, row: 0, t: '车源登记页', s: '本人车源列表 · 铃铛 · 退出（登记人）' },
    { id: 'b_brand', lane: 'b', col: 4, row: 0, t: '选择品牌', s: '燃油车／新能源页签' },
    { id: 'b_model', lane: 'b', col: 5, row: 0, t: '选择车型', s: '标题＝品牌' },
    { id: 'b_spec', lane: 'b', col: 6, row: 0, t: '选择型号', s: '列型号与指导价' },
    { id: 'b_form', lane: 'b', col: 7, row: 0, t: '登记表单', s: '保存→等待审核' },
    { id: 'b_manual', lane: 'b', col: 5, row: 1, t: '手动登记表单', s: '选品牌页底部入口' },
    { id: 'b_detail', lane: 'b', col: 4, row: 1, t: '车辆详情（本人）', s: '按状态给按钮' },
    { id: 'b_edit', lane: 'b', col: 3, row: 1, t: '修改表单', s: '品牌车型型号只读' },
    { id: 'b_notice', lane: 'b', col: 3, row: 2, t: '驳回通知列表', s: '点条目进修改表单' },
    { id: 'b_top', lane: 'b', col: 4, row: 2, t: '置顶支付', s: '微信支付 · 在售车' },
    // PC
    { id: 'p_menu', lane: 'p', col: 0, row: 0, t: 'PC 后台菜单', s: '权限跟菜单走' },
    { id: 'p_stock', lane: 'p', col: 1, row: 0, t: '车源管理', s: '三类车 · 列表＋统计条' },
    { id: 'p_audit', lane: 'p', col: 2, row: 0, t: '审核弹窗', s: '通过／驳回' },
    { id: 'p_view', lane: 'p', col: 2, row: 1, t: '详情弹窗', s: '两列 · 可下架／上架' },
    { id: 'p_spadd', lane: 'p', col: 3, row: 0, t: '新增特价车', s: '选车 → 表单弹窗' },
    { id: 'p_spedit', lane: 'p', col: 3, row: 1, t: '修改特价车', s: '不触发审核' },
    { id: 'p_off', lane: 'p', col: 4, row: 0, t: '下架确认', s: '原因必填 ≤100 字' },
    { id: 'p_on', lane: 'p', col: 4, row: 1, t: '上架确认', s: '不重审' },
    { id: 'p_untop', lane: 'p', col: 5, row: 0, t: '取消置顶确认', s: '不退款' },
    { id: 'p_stores', lane: 'p', col: 1, row: 2, t: '类型维护', s: '登记人数 · 近 30 天上传数可点' },
    { id: 'p_staff', lane: 'p', col: 1, row: 3, t: '登记人维护', s: '近 30 天上传数可点' },
    { id: 'p_contact', lane: 'p', col: 2, row: 3, t: '统一联系人弹窗', s: '运营老师名单' },
    { id: 'p_import', lane: 'p', col: 3, row: 3, t: '批量导入弹窗', s: '.xlsx ≤500 行' },
    { id: 'p_notice', lane: 'p', col: 1, row: 4, t: '公告配置', s: '文案／排序／启停' },
    { id: 'p_shop', lane: 'p', col: 2, row: 4, t: '商铺管理 · 编辑', s: '「是否可登记车源」开关' }
  ];
  const PE = [
    { id: 'J01', f: 'c_home', t: 'c_list', l: '点三张卡任意位置／三个圆形入口，带 sourceType；不进详情', rules: ['R002-03', 'R002-12'], v: '查证' },
    { id: 'J02', f: 'c_list', t: 'c_brand', l: '点品牌筛选；返回带 sourceType，不带 id', rules: ['R008-08'], v: '查证' },
    { id: 'J03', f: 'c_list', t: 'c_detail', l: '点格子，shopDetail?id&sourceType', rules: ['R008-14'], v: '查证' },
    { id: 'J04', f: 'c_detail', t: 'c_contact', l: '一级代理商点「登记人」浮钮', rules: ['R003-10'], v: '查证' },
    { id: 'J05', f: 'c_contact', t: 'c_sold', l: '拨号成功、回到详情 onShow 弹；本人、已选过「是」、特价车不弹', rules: ['R003-18', '§6.3'], v: '查证' },
    { id: 'J06', f: 'c_share', t: 'c_detail', l: '分享路径带 sourceType 打开车源详情', rules: ['R003-31'], v: '查证' },
    { id: 'J07', f: 'c_share', t: 'c_old', l: '链接无 sourceType（旧特价车、旧链接）照旧打开商品详情', rules: ['R003-01'], v: '查证' },
    { id: 'J08', f: 'c_user', t: 'c_fav', l: '第 5 个圆形入口「我的收藏」', rules: ['R003-13'], v: '查证' },
    { id: 'J09', f: 'c_fav', t: 'c_detail', l: '点一台进详情；只列当前对外可见的车', rules: ['R003-13'], v: '查证' },
    { id: 'J10', f: 'c_user', t: 'c_hist', l: '浏览记录（现有）', rules: ['R003-24'], v: '查证' },
    { id: 'J11', f: 'c_hist', t: 'c_detail', l: 'historyToDetail 带 sourceType；已下架的车提示「车辆不可查看」', rules: ['R003-24', 'R003-21'], v: '查证' },
    { id: 'J12', f: 'b_user', t: 'b_login', l: '本地无 sellerToken 或刷新失败 → 商户登录页', rules: ['R009-05'], v: '查证' },
    { id: 'J13', f: 'b_user', t: 'b_home', l: '有 token 且不是登记人 → 后台首页（现状）', rules: ['R009-05'], v: '查证' },
    { id: 'J14', f: 'b_user', t: 'b_reg', l: '有 token 且 isStaff4s=1 → 直接进车源登记页', rules: ['R009-05', 'R001-27'], v: '查证' },
    { id: 'J15', f: 'b_login', t: 'b_home', l: '代理商／商家验证码登录成功；登记人用这里会提示去「车源登记登录」', rules: ['R009-08'], v: '查证' },
    { id: 'J16', f: 'b_login', t: 'b_staff', l: '「登录」下方的「车源登记登录」按钮', rules: ['R009-01'], v: '查证' },
    { id: 'J17', f: 'b_staff', t: 'b_reg', l: '登录成功 redirectTo 车源登记页；返回键回商户登录页；代理商用这里会被提示返回', rules: ['R009-04', 'R009-08'], v: '查证' },
    { id: 'J18', f: 'b_home', t: 'b_reg', l: '「车源登记」入口；只有总部开通开关的一级代理商才显示', rules: ['R001-01', 'R001-03'], v: '查证' },
    { id: 'J19', f: 'b_home', t: 'b_clue', l: '「线索管理」→ 销售线索（现有）', rules: ['R010-01'], v: '查证' },
    { id: 'J20', f: 'b_reg', t: 'b_brand', l: '「增加车源」', rules: ['R001-26'], v: '查证' },
    { id: 'J21', f: 'b_brand', t: 'b_model', l: '选品牌', rules: ['R001-26'], v: '查证' },
    { id: 'J22', f: 'b_model', t: 'b_spec', l: '选车型', rules: ['R001-26'], v: '查证' },
    { id: 'J23', f: 'b_spec', t: 'b_form', l: '选型号，带出参考价、颜色', rules: ['R001-26'], v: '查证' },
    { id: 'J24', f: 'b_brand', t: 'b_manual', l: '底部固定「找不到？手动登记车源」', rules: ['R001-26'], v: '查证' },
    { id: 'J25', f: 'b_form', t: 'b_detail', l: '保存→「已提交，等待审核」进详情（手动登记同）', rules: ['R001-56'], v: '查证' },
    { id: 'J26', f: 'b_reg', t: 'b_detail', l: '卡片「查看」；驳回卡片不进详情', rules: ['R001-57', 'R001-26'], v: '查证' },
    { id: 'J27', f: 'b_reg', t: 'b_edit', l: '卡片「修改」／驳回卡片大「修改」按钮', rules: ['R001-26', 'R001-58'], v: '查证' },
    { id: 'J28', f: 'b_detail', t: 'b_edit', l: '详情「修改」', rules: ['R001-57'], v: '查证' },
    { id: 'J29', f: 'b_reg', t: 'b_notice', l: '右上角铃铛（未读驳回数）', rules: ['R001-64'], v: '查证' },
    { id: 'J30', f: 'b_notice', t: 'b_edit', l: '点通知条目直接进该车修改表单', rules: ['R001-64'], v: '查证' },
    { id: 'J31', f: 'b_reg', t: 'b_top', l: '在售车「置顶／续期」→ 微信支付', rules: ['R001-67'], v: '查证' },
    { id: 'J32', f: 'b_reg', t: 'b_user', l: '登记人「退出」确定 → switchTab「我的」；使用中失去资格 403 同样回「我的」', rules: ['R009-06', 'R001-66'], v: '查证' },
    { id: 'J33', f: 'p_menu', t: 'p_stock', l: '菜单「车源管理」', rules: ['R004-01', 'R004-27'], v: '查证' },
    { id: 'J34', f: 'p_stock', t: 'p_audit', l: '等待审核的行「审核」', rules: ['R004-09', 'R004-13'], v: '查证' },
    { id: 'J35', f: 'p_stock', t: 'p_view', l: '其余行「查看」', rules: ['R004-09', 'R004-11'], v: '查证' },
    { id: 'J36', f: 'p_stock', t: 'p_spadd', l: '顶部「新增特价车」', rules: ['R004-03', 'R004-15'], v: '查证' },
    { id: 'J37', f: 'p_stock', t: 'p_spedit', l: '特价车行「修改」（已下架也能改，我方细节）', rules: ['R004-16'], v: '查证' },
    { id: 'J38', f: 'p_stock', t: 'p_off', l: '在售行「下架」', rules: ['R004-21'], v: '查证' },
    { id: 'J39', f: 'p_stock', t: 'p_on', l: '已下架行「上架」', rules: ['R004-21'], v: '查证' },
    { id: 'J40', f: 'p_view', t: 'p_off', l: '详情里也可下架／上架', rules: ['R004-21'], v: '查证' },
    { id: 'J41', f: 'p_stock', t: 'p_untop', l: '置顶中的行「取消置顶」', rules: ['R004-14', 'R004-09'], v: '查证' },
    { id: 'J42', f: 'p_menu', t: 'p_stores', l: '菜单「类型维护」', rules: ['R005-01'], v: '查证' },
    { id: 'J43', f: 'p_menu', t: 'p_staff', l: '菜单「登记人维护」', rules: ['R006-05'], v: '查证' },
    { id: 'J44', f: 'p_menu', t: 'p_notice', l: '菜单「公告配置」', rules: ['R007-01'], v: '查证' },
    { id: 'J45', f: 'p_menu', t: 'p_shop', l: '菜单「商铺管理」（现有页，加开关）', rules: ['R001-03'], v: '查证' },
    { id: 'J46', f: 'p_stores', t: 'p_staff', l: '点「登记人数」→ 登记人维护，带类型', rules: ['R005-04'], v: '查证' },
    { id: 'J47', f: 'p_stores', t: 'p_stock', l: '点「近 30 天上传车辆数」→ 车源管理，带类型＋最近 30 天', rules: ['R005-04', 'R004-05'], v: '查证' },
    { id: 'J48', f: 'p_staff', t: 'p_stock', l: '点「近 30 天上传车辆数」→ 车源管理，带登记人＋最近 30 天', rules: ['R006-04', 'R004-05'], v: '查证' },
    { id: 'J49', f: 'p_staff', t: 'p_contact', l: '顶部「车源联系人设置」', rules: ['R006-08'], v: '查证' },
    { id: 'J50', f: 'p_staff', t: 'p_import', l: '顶部「批量导入」', rules: ['R006-11'], v: '查证' },
    // 跨端数据流（虚线）
    { id: 'J51', f: 'p_shop', t: 'b_home', l: '开关开通后，小程序后台首页才显示「车源登记」入口', rules: ['R001-03'], v: '查证', dash: true },
    { id: 'J52', f: 'p_audit', t: 'b_notice', l: '驳回 → 登记人铃铛未读＋1', rules: ['R001-64', '§2.15.1'], v: '查证', dash: true },
    { id: 'J53', f: 'p_audit', t: 'c_list', l: '审核通过＝上架 → 出现在对应入口列表、首页三卡', rules: ['R001-12', 'R008-04'], v: '查证', dash: true },
    { id: 'J54', f: 'c_sold', t: 'p_stock', l: '已售人数显示在车源管理；满 3 人自动下架', rules: ['R003-19'], v: '查证', dash: true }
  ];

  function renderPages(root) {
    const laneTops = {};
    let y = 0;
    const lanesHtml = LANES.map((ln) => {
      laneTops[ln.k] = y;
      const h = LANE_PAD + ln.rows * ROWH;
      const nodes = PN.filter((n) => n.lane === ln.k).map((n) => `<div class="fc-pn" id="fc-pn-${n.id}" style="left:${48 + n.col * COLW}px;top:${LANE_PAD + n.row * ROWH}px;width:${NODEW}px;height:${NODEH}px"><b>${esc(n.t)}</b><small>${esc(n.s)}</small></div>`).join('');
      const html = `<div class="fc-lane fc-lane-${ln.k}" style="top:${y}px;height:${h}px"><div class="fc-lane-t">${esc(ln.t)}</div>${nodes}</div>`;
      y += h + 18;
      return html;
    }).join('');
    const totalH = y;
    const maxCol = Math.max(...PN.map((n) => n.col)) + 1;
    const totalW = 48 + maxCol * COLW + 20;
    const table = `<table class="fc-table"><thead><tr><th>编号</th><th>从 → 到</th><th>怎么跳 · 条件</th><th>依据</th><th>核</th></tr></thead><tbody>${PE.map((e) => { const f = PN.find((n) => n.id === e.f), t = PN.find((n) => n.id === e.t); return `<tr data-edge-row="${e.id}"><td><b>${e.id}</b>${e.dash ? '<small> 数据流</small>' : ''}</td><td>${esc(f.t)} → ${esc(t.t)}</td><td>${esc(e.l)}</td><td>${ruleHtml(e.rules)}</td><td><span class="fc-v ${e.v === '查证' ? 'ok' : 'inf'}">${e.v}</span></td></tr>`; }).join('')}</tbody></table>`;
    root.innerHTML = `<p class="fc-hint">实线＝页面跳转，虚线＝跨端数据流（一端的操作在另一端看到结果）。线上的数字对应下表编号；悬停线或编号看说明。横向滚动看全部。</p><div class="fc-map-scroll"><div class="fc-map" style="height:${totalH}px;width:${totalW}px">${lanesHtml}<svg class="fc-map-svg" width="${totalW}" height="${totalH}"></svg></div></div><h3>每条线的说明</h3>${table}`;
    const draw = () => drawPageEdges(root);
    draw();
    window.addEventListener('resize', draw);
    root.__fcDraw = draw;
    root.addEventListener('mouseover', (ev) => {
      const g = ev.target.closest('.fc-pe');
      if (!g) return;
      root.querySelectorAll('[data-edge-row].on').forEach((r) => r.classList.remove('on'));
      const row = root.querySelector(`[data-edge-row="${g.dataset.edge}"]`);
      if (row) row.classList.add('on');
    });
  }

  function drawPageEdges(root) {
    const map = $('.fc-map', root);
    const svg = $('.fc-map-svg', root);
    if (!map || !svg) return;
    const base = map.getBoundingClientRect();
    if (!base.width) return; // 视图未显示时不画
    const box = {};
    PN.forEach((n) => {
      const r = $(`#fc-pn-${n.id}`, root).getBoundingClientRect();
      box[n.id] = { l: r.left - base.left, t: r.top - base.top, r: r.right - base.left, b: r.bottom - base.top, cx: r.left - base.left + r.width / 2, cy: r.top - base.top + r.height / 2 };
    });
    // 第一遍：决定走法与端口所在边
    const plans = PE.map((e) => {
      const s = box[e.f], t = box[e.t];
      const dx = t.cx - s.cx, dy = t.cy - s.cy;
      let kind, ss, ts;
      if (Math.abs(dy) < 20) { // 同一行
        if (Math.abs(dx) <= COLW + 5) { kind = 'h'; ss = dx > 0 ? 'r' : 'l'; ts = dx > 0 ? 'l' : 'r'; }
        else { kind = 'u'; ss = 'b'; ts = 'b'; }
      } else if (Math.abs(dx) < 20) { // 同一列
        if (Math.abs(dy) <= ROWH + 5) { kind = 'v'; ss = dy > 0 ? 'b' : 't'; ts = dy > 0 ? 't' : 'b'; }
        else { kind = 'side'; ss = 'r'; ts = 'r'; }
      } else if (Math.abs(dx) <= COLW + 5) { kind = 'elbow'; ss = dx > 0 ? 'r' : 'l'; ts = dx > 0 ? 'l' : 'r'; }
      else { kind = 'chan'; ss = dx > 0 ? 'r' : 'l'; ts = dy > 0 ? 't' : 'b'; }
      return { e, s, t, kind, ss, ts };
    });
    // 端口分配：同一节点同一边上的多条线均匀分布
    const ports = {}; // key node|side -> [{plan, end:'s'|'t', sort}]
    plans.forEach((p) => {
      const add = (node, side, end, other) => { const k = `${node}|${side}`; (ports[k] = ports[k] || []).push({ p, end, sort: side === 'l' || side === 'r' ? other.cy : other.cx }); };
      add(p.e.f, p.ss, 's', p.t);
      add(p.e.t, p.ts, 't', p.s);
    });
    Object.entries(ports).forEach(([k, list]) => {
      const [node, side] = k.split('|');
      const b = box[node];
      list.sort((a, c) => a.sort - c.sort);
      const n = list.length;
      list.forEach((item, i) => {
        const frac = (i + 1) / (n + 1);
        let x, y;
        if (side === 'l') { x = b.l; y = b.t + 10 + (b.b - b.t - 20) * frac; }
        else if (side === 'r') { x = b.r; y = b.t + 10 + (b.b - b.t - 20) * frac; }
        else if (side === 't') { y = b.t; x = b.l + 12 + (b.r - b.l - 24) * frac; }
        else { y = b.b; x = b.l + 12 + (b.r - b.l - 24) * frac; }
        item.p[item.end === 's' ? 'sp' : 'tp'] = { x, y };
      });
    });
    // 第二遍：画路径
    const out = ['<defs><marker id="fc-parrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#595959"/></marker></defs>'];
    const items = plans.map((p, idx) => {
      const { sp, tp, kind, s, t, e } = p;
      let d, lx, ly, axis;
      const gap = 14 + (idx % 3) * 4; // 轻微错开，避免同一通道重叠
      if (kind === 'h') { d = `M${sp.x},${sp.y} L${tp.x},${tp.y}`; lx = (sp.x + tp.x) / 2; ly = sp.y; axis = 'x'; }
      else if (kind === 'v') { d = `M${sp.x},${sp.y} L${tp.x},${tp.y}`; lx = sp.x; ly = (sp.y + tp.y) / 2; axis = 'y'; }
      else if (kind === 'elbow') { const mx = (sp.x + tp.x) / 2; d = `M${sp.x},${sp.y} H${mx} V${tp.y} H${tp.x}`; lx = mx; ly = (sp.y + tp.y) / 2; axis = 'y'; }
      else if (kind === 'u') { const cy = Math.max(s.b, t.b) + gap; d = `M${sp.x},${sp.y} V${cy} H${tp.x} V${tp.y}`; lx = (sp.x + tp.x) / 2; ly = cy; axis = 'x'; }
      else if (kind === 'side') { const x = Math.max(s.r, t.r) + gap; d = `M${sp.x},${sp.y} H${x} V${tp.y} H${tp.x}`; lx = x; ly = (sp.y + tp.y) / 2; axis = 'y'; }
      else { // chan：先横到源节点旁的列缝，竖到目标行上方／下方的行缝，再横到目标，竖进目标
        const x1 = p.ss === 'r' ? s.r + gap : s.l - gap;
        const cy = p.ts === 't' ? t.t - gap : t.b + gap;
        d = `M${sp.x},${sp.y} H${x1} V${cy} H${tp.x} V${tp.y}`; lx = (x1 + tp.x) / 2; ly = cy; axis = 'x';
      }
      return { e, d, lx, ly, axis };
    });
    // 编号圆点互相叠住时，沿自己所在线段错开
    for (let pass = 0; pass < 6; pass++) {
      let moved = false;
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        if (Math.hypot(a.lx - b.lx, a.ly - b.ly) < 20) { if (b.axis === 'x') b.lx += 22; else b.ly += 22; moved = true; }
      }
      if (!moved) break;
    }
    items.forEach(({ e, d, lx, ly }) => {
      const num = e.id.replace(/^J0?/, '');
      out.push(`<g class="fc-pe ${e.dash ? 'dash' : ''}" data-edge="${e.id}"><title>${esc(e.id)}：${esc(e.l)}\n依据 ${esc(ruleTitle(e.rules))}</title><path d="${d}" marker-end="url(#fc-parrow)"/><circle cx="${lx}" cy="${ly}" r="9"/><text x="${lx}" y="${ly + 3.5}" text-anchor="middle">${num}</text></g>`);
    });
    svg.innerHTML = out.join('');
  }

  // ---------- 统计与装配 ----------
  function stats() {
    const items = [...STATE_EDGES, ...PERM.flatMap((g) => g.rows), ...PE];
    const total = items.length, inf = items.filter((i) => i.v === '推断').length, dec = items.filter((i) => i.v === '定').length;
    return { total, ok: total - inf - dec, inf, dec, e: STATE_EDGES.length, p: PERM.reduce((n, g) => n + g.rows.length, 0), j: PE.length };
  }

  function init() {
    const view = $('#view-flow043');
    if (!view) return;
    const st = stats();
    $('#fc-stat').textContent = `共 ${st.total} 条 · 已查证 ${st.ok} · 推断 ${st.inf} · 需你定 ${st.dec}`;
    $('#fc-intro').innerHTML = `三张图共 <b>${st.total}</b> 条（状态流转 ${st.e} 条边、角色权限 ${st.p} 行、页面跳转 ${st.j} 条线）；已查证 <b>${st.ok}</b> 条、推断 <b>${st.inf}</b> 条（权限表「取消置顶」一行：需求只写总部可取消，本人能否取消没写，按不能画）、需你定 <b>${st.dec}</b> 条。每条都标了规则总表编号，悬停编号看出处原话。`;
    renderState($('#fc-state'));
    renderPerm($('#fc-perm'));
    renderPages($('#fc-pages'));
    const tabs = view.querySelectorAll('.fc-tab');
    tabs.forEach((b) => b.addEventListener('click', () => {
      tabs.forEach((x) => x.classList.toggle('active', x === b));
      view.querySelectorAll('.fc-panel').forEach((p) => p.classList.toggle('active', p.id === b.dataset.panel));
      if (b.dataset.panel === 'fc-pages') setTimeout(() => $('#fc-pages').__fcDraw && $('#fc-pages').__fcDraw(), 0);
    }));
    // 视图切到本页时再画一次（隐藏时拿不到坐标）
    new MutationObserver(() => { if (view.classList.contains('active')) setTimeout(() => $('#fc-pages').__fcDraw && $('#fc-pages').__fcDraw(), 0); }).observe(view, { attributes: true, attributeFilter: ['class'] });
  }
  if (typeof window !== 'undefined') window.FC043 = { RULES, STATE_EDGES, STATE_SIDE, SCENARIOS, ROLES, PERM, PN, PE, LANES };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
