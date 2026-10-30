(function () {
  'use strict';
  const logic = window.YusuanLogic;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));

  const decisionResults = [
    ['AI-01','确认金额单位、精度、大于0及上限校验规则。'],['AI-02','无预设颜色时允许手工填写。'],
    ['AI-03','重选车型更新车型信息，保留已有照片和备注。'],['AI-04','确认手动参考价与实际售价的单向联动。'],
    ['AI-05','确认图片数量、格式、大小、封面和排序；车型有来源图时先带出，仍可补充。'],['AI-06','确认各字段字符上限。'],
    ['AI-07','搜索品牌、车型、型号、备注，包含匹配；两页签数量随条件变化且搜索词保留。'],['AI-08','确认列表默认排序及同时间排序规则。'],
    ['AI-09','确认刷新、失败重试和返回位置保留。'],['AI-10','确认PC列表分页和排序。'],['AI-11','确认门店重复判断规则。'],
    ['AI-12','确认门店下拉的搜索、两行显示和必须点选。'],['AI-13','确认大陆手机号和18位居民身份证校验。'],
    ['AI-14','确认员工手机号、身份证号唯一，停用记录仍占用。'],['AI-15','新增员工默认启用，保留备注字段。'],
    ['AI-16','不在员工录入中补建门店；需先到4S店信息维护中新增。'],['AI-17','确认未保存离开、结果核对和防重复提交规则。'],
    ['MISS-01','未设置统一联系人时，4S员工仍可登记车辆。'],['MISS-02','联系人离职且未更换时，继续显示原姓名和电话，前台不报错。'],
    ['MISS-03','手机号已属于客户、代理商或总部账号时，不允许新增为4S员工。'],['MISS-04','已下架车辆允许在原记录重新上架，历史保留。'],
    ['MISS-05','员工编辑不放状态字段；只用列表启用／停用按钮并二次确认。'],['CONFLICT-01','4S员工显示“所属4S店”；一级代理商显示“代理商／经营主体”，地址取代理商资料。'],
    ['SRC-01','撤销：现有“运营老师”下拉已使用 /mall/shops/serveUserList，后端返回已填企业微信标识的总部ToM人员。']
  ];

  const confirmedRules = [
    '同一套小程序后台、同一个登记功能', '仅一级代理商和启用4S员工可登记', '按角色保存库存车／一手车源', '4S员工和代理角色固定',
    '参考价、实际售价分别保存', '实际售价默认等于参考价并可改', '沿用品牌→车型→型号及内外颜色', '增加照片、实际售价和备注',
    '手动入口使用相同信息结构', '去掉落户城市和购车意向标签', '登记地址反显只读且不考虑异地停放', '本人列表首次20条并滑到底加载',
    'PC按功能整体分配权限', '身份证完整显示且无逐员工登记开关', '4S店只维护名称、地区、地址', '统一一名总部人员并在员工维护中保存'
  ];

  // REQ-001 v2.11 第 1.7 节：角标只有「热销」，由总部在 PC 勾选，登记人看不到、不能改
  function promoHtml(v){ return v.hot?'<span class="promo-tag promo-hot">热销</span>':''; }
  // v2.11 第 2.6 节：标签固定 9 个，多选、选填；车辆位置单选、必填（替代原「促销标识」）
  const VEHICLE_LABELS=['库存车','运损车','商品车','包牌包税','活动车','可分期','现车','全国可上牌','急售'];
  const VEHICLE_LOCATIONS=['东区','西区','南区','北区','大北区'];
  // 已下架卡片与详情显示最近一次下架原因（v2.11 第 2.13 节）
  const SELF_UNLIST='本人下架';

  const state = {
    ownerId:'demo-u1', vehicleVisible:20,
    q:{brand:'',model:'',variant:'',approve:'',shelf:''},
    notifyOpen:false,
    storeQuery:{ code:'', name:'' }, storePage:1, storePageSize:20,
    employeeQuery:{ name:'', phone:'', store:'', status:'' }, employeePage:1, employeeSort:'',
    currentContactId:'hq-1', currentContactSnapshot:{id:'hq-1',name:'总部人员A',phone:'13900000001'}, selectedVehicle:null, photos:[], preservedNote:''
  };

  // 登记列表、修改与查看共用同车实拍资料；保留原审核状态及分页示例。
  const registrationSeeds=[
    ['inventory-m6',108000],['inventory-lc76',618000],['inventory-g63',2538000],
    ['inventory-yuan',78800],['inventory-prado',768000],['inventory-lc300',818000]
  ].map(([id,salePrice])=>{
    const car=window.DemoCars.get(id), [,brand,model,variant]=car.name.match(/^(\S+)\s+(.+?)\s+(\d{4}款.*)$/);
    return {brand,model,variant,referencePrice:Math.round(parseFloat(car.ref)*10000),salePrice,
      exterior:car.colorOut,interior:car.colorIn,note:car.remark,
      hot:Boolean(car.hot),location:car.location,labels:car.labels.slice(),
      photos:car.photos.map((photo)=>photo.src)};
  });
  // 下架原因各来源各给一例：本人下架、总部在 PC 填写的原因、三个用户标记已售自动下架、上架超过 30 天自动下架（天数为参数，默认 30）
  const UNLIST_REASONS={2:'三个用户标记该车辆已售',39:SELF_UNLIST,40:'车辆照片与实车不符，请核实后重新上架',41:'三个用户标记该车辆已售',42:'上架超过 30 天自动下架'};
  let approvedNo=0;
  const vehicles = Array.from({ length:46 }, (_, index) => {
    const seed=registrationSeeds[index%registrationSeeds.length];
    const approve=index===0?'驳回':index===1?'等待审核':'通过';
    const status=index<3?'已下架':index<39?'在售':'已下架';
    return {...seed,labels:seed.labels.slice(),photos:seed.photos.slice(),
      id:'1789562340117'+String(index*137).padStart(6,'0'), ownerId:index===45?'another-owner':'demo-u1',
      approve,
      // 车辆编号在第一次审核通过时生成（REQ-001 第 1.8 节），未通过的车没有编号
      vehicleNo:approve==='通过'?`KC${String(++approvedNo).padStart(5,'0')}`:'',
      rejectReason:index===0?'照片不清晰，车身正面和内饰都看不清，请补拍后重新提交；实际售价与同款车差距较大，请核实':'',
      rejectedAt:index===0?'2026-09-15 09:20':'',
      status,
      unlistReason:approve==='通过'&&status==='已下架'?(UNLIST_REASONS[index]||SELF_UNLIST):'',
      detailImages:index%5===4?[]:seed.photos.slice(),
      topEnd:index===3?new Date(Date.now()+3*86400000):index===6?new Date(Date.now()+5*86400000+3600000):null,
      sourceType:'库存车',coverUrl:seed.photos[0],ownerName:'周强',storeName:'华东代理门店',
      address:'上海市浦东新区张杨路1188号',
      createdAt:`2026-09-${String(8-Math.floor(index/7)).padStart(2,'0')} 10:00`,updatedAt:'2026-09-08 18:30',
      unlistedAt:index===2||index>=39?'2026-09-08 19:00':''};
  });

  // REQ-005 v1.4：「4S店信息维护」改为「类型维护」。类型＝登记人所属机构，类型代码 A～Z 保存后不能改（车辆编号「Y＋代码」用它）
  const TYPE_CODES='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const REGIONS={'浙江省':{'杭州市':['滨江区','西湖区','余杭区'],'宁波市':['鄞州区','海曙区']},'上海市':{'上海市':['浦东新区','闵行区']},'江苏省':{'南京市':['鼓楼区','玄武区']}};
  // 列表默认按创建时间从新到旧：后建的类型排在前面
  const stores=[
    ['A','杭州滨江汽车销售服务有限公司','浙江省 杭州市 滨江区','江南大道588号A座一层至三层（含展厅、维修车间与交车区）'],
    ['B','杭州余杭顺达汽车贸易有限公司','浙江省 杭州市 余杭区','文一西路1218号'],
    ['C','宁波鄞州恒通汽车销售有限公司','浙江省 宁波市 鄞州区','天童南路699号'],
    ['D','上海浦东嘉诚汽车服务有限公司','上海市 上海市 浦东新区','张杨路1588号'],
    ['E','上海闵行瑞丰汽车贸易有限公司','上海市 上海市 闵行区','沪闵路6088号'],
    ['F','南京鼓楼宏远汽车销售有限公司','江苏省 南京市 鼓楼区','中山北路281号'],
    ['G','杭州西湖金诚汽车销售服务有限公司','浙江省 杭州市 西湖区','文三路477号'],
    ['H','宁波海曙安达汽车贸易有限公司','浙江省 宁波市 海曙区','望春路218号']
  ].map(([code,name,region,address],index)=>({id:`store-${code}`,code,name,region,address,createdAt:index+1})).reverse();

  // 18 位身份证校验位（GB 11643）：前 17 位加权求和取模
  function idCheckChar(body17){const w=[7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2];let s=0;for(let i=0;i<17;i++)s+=Number(body17[i])*w[i];return '10X98765432'[s%11];}
  function validIdCard(value){
    const v=String(value||'').trim().toUpperCase();
    if(!/^\d{17}[\dX]$/.test(v))return false;
    const y=Number(v.slice(6,10)),m=Number(v.slice(10,12)),d=Number(v.slice(12,14)),dt=new Date(y,m-1,d);
    if(y<1900||dt.getFullYear()!==y||dt.getMonth()!==m-1||dt.getDate()!==d||dt>new Date())return false;
    return idCheckChar(v)===v[17];
  }
  const LOGIN_ID={'13800001234':'33010819850807123X','13800005678':'330108198503224567'};
  const AREA={A:'330108',B:'330110',C:'330212',D:'310115',E:'310112',F:'320106',G:'330106'};
  // REQ-006 v1.6：「4S店员工」改称「登记人」，所属改为「所属类型」。李明、陈思远与 REQ-009 登录页的启用／停用账号一致
  const employees=[
    ['李明','A','13800001234','启用'],['欧阳明轩','A','13800001001','启用'],['张文静','A','13800001002','启用'],['陈思远','A','13800005678','停用'],
    ['王海涛','B','13800001004','启用'],['刘佳','B','13800001005','启用'],['周锦程','B','13800001006','停用'],
    ['吴雅琴','C','13800001007','启用'],['郑浩然','C','13800001008','启用'],
    ['孙立群','D','13800001009','启用'],['黄晓峰','D','13800001010','启用'],['徐志强','D','13800001011','启用'],
    ['马丽华','E','13800001012','启用'],['高建国','E','13800001013','停用'],
    ['林曼','F','13800001014','启用'],['朱天翔','F','13800001015','启用'],['何静怡','F','13800001016','启用'],
    ['罗文博','G','13800001017','启用'],['梁秋萍','G','13800001018','启用'],['宋子豪','G','13800001019','启用'],['谢婉清','G','13800001020','停用']
  ].map(([name,typeCode,phone,status],index)=>{
    const body=AREA[typeCode]+(1984+index%12)+String(index%12+1).padStart(2,'0')+String(10+index%18)+String(101+index*7).slice(-3);
    // 李明、陈思远的身份证后六位即 REQ-009 登录页演示的密码 07123X、224567
    const idCard=LOGIN_ID[phone]||body+idCheckChar(body);
    return {id:`employee-${index+1}`,name,phone,idCard,typeCode,status,note:index%3===0?'负责展厅接待与车源登记，工作日在岗。':'',createdAt:21-index};
  });
  function typeByCode(code){return stores.find((item)=>item.code===code);}
  function typeLabel(code){const t=typeByCode(code);return t?`${t.code} ${t.name}`:'';}
  function typesByCode(){return stores.slice().sort((a,b)=>a.code<b.code?-1:1);}
  function typeAddress(t){return t?t.region+' '+t.address:'';}
  // 供 PC 车源管理（req-004-stock.js）读取登记人所属类型
  window.PcOrgs={types:stores,registrants:employees,typeLabel};

  const contacts = [
    { id:'hq-1', name:'总部人员A', phone:'13900000001', wecom:true, active:false },
    { id:'hq-2', name:'总部人员B', phone:'13900000002', wecom:true, active:true }
  ];
  const catalog = {
    奥迪:{ A6L:[{name:'2026款 45 TFSI quattro 尊享动感型',price:459800,photos:[]},{name:'2026款 40 TFSI 豪华型',price:429800,photos:[]}], Q5L:[{name:'2026款 45 TFSI 尊享版',price:488800,photos:[]}] },
    宝马:{ X3:[{name:'2026款 xDrive 30L 尊享型',price:449900,photos:[]}], '5系':[{name:'2026款 530Li 领先型',price:489900,photos:[]}] },
    奔驰:{ GLC:[{name:'2026款 GLC 300 L 动感型',price:478800,photos:[]}], 'E级':[{name:'2026款 E 300 L 豪华型',price:529800,photos:[]}] }
  };
  // 新能源目录（REQ-001 第 2.5 节：车源类别分燃油车、新能源两种目录，选品牌页顶部切换）
  const catalogNev = {
    比亚迪:{ 秦L:[{name:'2025款 DM-i 120KM 超越型',price:109800,photos:[]}] },
    特斯拉:{ 'Model Y':[{name:'2025款 后轮驱动版',price:263500,photos:[]}] },
    理想:{ L6:[{name:'2025款 Pro',price:249800,photos:[]}] }
  };
  const catalogs = { 燃油车:catalog, 新能源:catalogNev };
  let energy = '燃油车';
  // 供 PC 新增特价车（req-004-stock.js）选车读取，与小程序登记同一套车型目录
  window.CarCatalog=catalog;

  function showView(view, syncHash = true) {
    view=logic.normalizeView(view);
    $$('.view').forEach((item) => item.classList.remove('active'));
    $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view===view));
    const target = $(`#view-${view}`);
    if (!target) throw new Error(`页面节点不存在：${view}`);
    target.classList.add('active');
    if (syncHash && window.location.hash !== `#${view}`) {
      history.replaceState(null, '', `#${view}`);
    }
    $('main').focus({ preventScroll: true });
  }
  window.showPrototypeView = showView;
  function toast(message){ const el=$('#toast'); el.textContent=message; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),1800); }
  function renderDecisionResults() {
    if($('#issue-table-body')) $('#issue-table-body').innerHTML=decisionResults.map(([id,result])=>`<tr><td><strong>${id}</strong></td><td>${escapeHtml(result)}</td></tr>`).join('');
    if($('#confirmed-list')) $('#confirmed-list').innerHTML=confirmedRules.map((item,index)=>`<div class="confirmed-item">${String(index+1).padStart(2,'0')} · ${item}</div>`).join('');
  }

  function filteredVehicles() {
    return vehicles.filter((v)=>v.ownerId===state.ownerId)
      .filter((v)=>!state.q.brand||v.brand===state.q.brand)
      .filter((v)=>!state.q.model||v.model===state.q.model)
      .filter((v)=>!state.q.variant||v.variant===state.q.variant)
      // 审核状态与上下架是两个独立字段，各自筛（R2-11：两个维度互不合并）
      .filter((v)=>!state.q.approve||v.approve===state.q.approve)
      .filter((v)=>!state.q.shelf||v.status===state.q.shelf)
      // REQ-001 第 2.2 节：驳回最前，其次等待审核，其余在后；段内按登记时间倒序
      .map((v,i)=>({v,i})).sort((a,b)=>{ const r=(x)=>x.approve==='驳回'?0:x.approve==='等待审核'?1:2; return r(a.v)-r(b.v)||String(b.v.createdAt).localeCompare(String(a.v.createdAt))||a.i-b.i; }).map((x)=>x.v);
  }
  // 2026-10-29 会议：状态水印只留一种——倾斜半透明大字（驳回、等待审核、已下架），在架的不打
  // 2026-10-30 用户：水印放到右侧文字区的空白处，不压车图
  function bodyMark(v){
    if(v.approve==='驳回')return '<span class="body-mark reject" aria-hidden="true">驳回</span>';
    if(v.approve==='等待审核')return '<span class="body-mark review" aria-hidden="true">等待审核</span>';
    if(v.status==='已下架')return '<span class="body-mark off" aria-hidden="true">已下架</span>';
    return '';
  }
  function vehicleCover(vehicle){
    const src=(vehicle.photos||[]).find((item)=>!item.startsWith('data:video'))||vehicle.coverUrl;
    return src?`<img src="${escapeHtml(src)}" alt="${escapeHtml(vehicle.brand+' '+vehicle.model)}实拍">${promoHtml(vehicle)}`:'未添加车辆照片';
  }
  // R3-01 付费置顶：价格与天数取配置 car_source_top_price／car_source_top_days（REQ-001 第 2.17 节）
  const TOP_PRICE=9.9, TOP_DAYS=7;
  function pad2(n){ return String(n).padStart(2,'0'); }
  function fmtTop(d,full){ return (full?`${d.getFullYear()}-`:'')+`${pad2(d.getMonth()+1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
  function isTop(v){ return Boolean(v.topEnd&&v.topEnd>new Date()); }
  function canTop(v){ return v.approve==='通过'&&v.status==='在售'; }
  function openTopSheet(vehicle,onDone){
    const wrap=$('#m-picker'); wrap.hidden=false;
    const on=isTop(vehicle), base=on?vehicle.topEnd:new Date(), until=new Date(base.getTime()+TOP_DAYS*86400000);
    const listName=vehicle.sourceType==='一手车源'?'一手车源':'库存车';
    wrap.innerHTML=`<div class="m-picker top-sheet"><div class="top-sheet-head"><b>置顶这台车</b><button type="button" class="top-x" id="top-x" aria-label="关闭">×</button></div>
      <div class="top-sheet-car">${escapeHtml(vehicle.brand+' '+vehicle.model+' '+vehicle.variant)}</div>
      <div class="top-sheet-desc">在「${listName}」列表中排在最前，首页轮播优先展示</div>
      <div class="top-sheet-price"><strong>${TOP_PRICE}元</strong><span>／${TOP_DAYS}天</span></div>
      <div class="top-sheet-time">${on?`当前置顶至 ${fmtTop(vehicle.topEnd,true)}，续期后至 ${fmtTop(until,true)}`:`付款后立即生效，至 ${fmtTop(until,true)}`}</div>
      <button type="button" class="top-pay" id="top-pay">微信支付 ${TOP_PRICE}元</button></div>`;
    const close=()=>{ wrap.hidden=true; wrap.innerHTML=''; };
    $('#top-x').addEventListener('click',close);
    $('#top-pay').addEventListener('click',()=>{
      const b=$('#top-pay'); if(b.disabled)return; b.disabled=true; b.textContent='支付中';
      setTimeout(()=>{ vehicle.topEnd=until; vehicle.topPayAt=new Date(); close(); mToast(`置顶成功，至 ${fmtTop(until,true)}`); if(onDone)onDone(); },900);
    });
  }
  function statusChip(v){
    if(v.approve==='等待审核')return '<span class="status-chip review">等待审核</span>';
    if(v.approve==='驳回')return '<span class="status-chip reject">驳回</span>';
    return `<span class="status-chip ok">通过</span><span class="status-chip ${v.status==='在售'?'on':'off'}">${v.status}</span>`;
  }
  function rejectedVehicles(){ return vehicles.filter((v)=>v.ownerId===state.ownerId&&v.approve==='驳回'); }
  function renderNotifyBadge(){
    const unread=state.notifyOpen?0:rejectedVehicles().length;
    const badge=$('#notify-badge'); if(!badge)return;
    badge.textContent=unread; badge.hidden=unread===0;
  }
  function renderVehicles(){
    const all=filteredVehicles(),shown=all.slice(0,state.vehicleVisible);
    renderNotifyBadge();
    const hasQuery=state.q.brand||state.q.model||state.q.variant||state.q.approve||state.q.shelf;
    $('#vehicle-list').innerHTML=shown.length?shown.map((vehicle)=>{
      const st=statusChip(vehicle);
      // CHG-D051：原「车辆类型」位置改放标签
      const typeChips=(vehicle.labels||[]).map((t)=>`<span class="type-chip">${escapeHtml(t)}</span>`).join('');
      const rejected=vehicle.approve==='驳回', onSale=vehicle.approve==='通过'&&vehicle.status==='在售';
      // 驳回红字原因、已下架灰字下架原因：放在车图与右侧内容下方，整张卡片通栏，最多两行
      const rej=rejected?`<div class="reject-line">驳回原因：${escapeHtml(vehicle.rejectReason||'')}</div>`:'';
      const off=vehicle.approve==='通过'&&vehicle.status==='已下架'&&vehicle.unlistReason?`<div class="unlist-line">下架原因：${escapeHtml(vehicle.unlistReason)}</div>`:'';
      // R2-10：不设「查看」，点卡片主体即进详情；按钮与价格同一行靠右
      const topBtn=canTop(vehicle)?`<button class="top-btn" data-vehicle-action="top" data-id="${vehicle.id}">${isTop(vehicle)?'续期':'置顶'}</button>`:'';
      const topChip=isTop(vehicle)?`<span class="type-chip top">置顶至 ${fmtTop(vehicle.topEnd)}</span>`:'';
      const acts=vehicle.approve==='通过'
        ? `<button data-vehicle-action="edit" data-id="${vehicle.id}">修改</button>${vehicle.status==='在售'?`<button data-vehicle-action="unlist" data-id="${vehicle.id}">下架</button>`:`<button data-vehicle-action="relist" data-id="${vehicle.id}">重新上架</button>`}`
        : `<button class="${rejected?'edit-big':''}" data-vehicle-action="edit" data-id="${vehicle.id}">修改</button>`;
      // R2-10：卡片只放 6 项——封面（左上角热销角标）、车名、状态、标签、价格、登记时间。不放备注、车源类型、内外颜色
      // R2-10：参考价放左列车图下方（右侧放不下三者并排，且图缩小后左下正好空着）
      const refPrice=`<div class="vehicle-ref">参考价 ${vehicle.referencePrice?`${vehicle.referencePrice.toLocaleString()}元`:'暂无'}</div>`;
      return `<article class="vehicle-card${rejected?' is-reject':''}${onSale?' is-onsale':''}" data-id="${vehicle.id}"><div class="vehicle-side"><div class="vehicle-cover">${vehicleCover(vehicle)}</div>${refPrice}</div><div class="vehicle-body">${bodyMark(vehicle)}<h3>${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)} ${escapeHtml(vehicle.variant)}</h3><div class="chip-row">${st}${topChip}${typeChips}</div><div class="vehicle-time"><span>${vehicle.createdAt}</span>${topBtn}</div><div class="vehicle-foot"><strong class="vehicle-sale${vehicle.salePrice>=1000000?' price-long':''}">${vehicle.salePrice.toLocaleString()}元</strong><div class="vehicle-actions">${acts}</div></div></div>${rej}${off}</article>`;
    }).join(''):`<div class="empty-build"><h2>${hasQuery?'未找到符合条件的车辆':'暂无车辆'}</h2><p>${hasQuery?'请调整查询条件。':'可使用增加车源创建一条记录。'}</p></div>`;
    $('#list-footer').textContent=shown.length<all.length?'向下滚动加载后续记录':'没有更多了';
    $$('[data-vehicle-action]').forEach((button)=>button.addEventListener('click',(event)=>{event.stopPropagation(); const vehicle=vehicles.find((item)=>item.id===button.dataset.id); if(button.dataset.vehicleAction==='view')showVehicleDetail(vehicle); if(button.dataset.vehicleAction==='edit')showVehicleForm({vehicle}); if(button.dataset.vehicleAction==='unlist')confirmUnlist(vehicle); if(button.dataset.vehicleAction==='relist')confirmRelist(vehicle); if(button.dataset.vehicleAction==='top')openTopSheet(vehicle,renderVehicles);}));
    // R2-10：去掉「查看」按钮后，点卡片主体进详情（REQ-001 第 2.2 节「点击主体查看详情」）。
    // 操作按钮已 stopPropagation，点按钮不会同时进详情。
    // v2.11：驳回的卡片点主体不进详情，只能点「修改」
    $$('#vehicle-list .vehicle-card').forEach((card)=>card.addEventListener('click',()=>{
      const vehicle=vehicles.find((item)=>item.id===card.dataset.id); if(vehicle&&vehicle.approve!=='驳回')showVehicleDetail(vehicle);
    }));
  }

  // ===== 小程序形态：页面栈、确认框、提示条（TASK-018）=====
  // 依据线上「售车登记」：列表/新增/详情为三个独立页面，navigateTo 跳转；确认用 u-modal。
  const pageStack=[];
  function pushPage(title,body,footer='',onReady=null){
    pageStack.push({title,body,footer,onReady});
    renderStack();
  }
  function replacePage(title,body,footer='',onReady=null){
    pageStack.pop(); pushPage(title,body,footer,onReady);
  }
  function popPage(){ pageStack.pop(); renderStack(); }
  function clearStack(){ pageStack.length=0; renderStack(); state.photos=[]; state.preservedNote=''; }
  function renderStack(){
    const root=$('#m-stack'); if(!root)return;
    const top=pageStack[pageStack.length-1];
    if(!top){ root.innerHTML=''; return; }
    root.innerHTML=`<section class="m-page" role="region" aria-label="${escapeHtml(top.title)}">
      <div class="m-page-head"><button class="m-page-back" aria-label="返回">‹</button><span>${escapeHtml(top.title)}</span><span></span></div>
      <div class="m-page-body">${top.body}</div>
      ${top.footer?`<div class="m-page-foot">${top.footer}</div>`:''}</section>`;
    $('.m-page-back').addEventListener('click',()=>{ if(pageStack.length>1)popPage(); else clearStack(); });
    if(typeof top.onReady==='function')top.onReady();
  }
  function mDialog(title,bodyHtml,confirmText,onConfirm,cancelText='取消'){
    const wrap=$('#m-dialog'); wrap.hidden=false;
    wrap.innerHTML=`<div class="m-dialog"><h4>${escapeHtml(title)}</h4><div class="m-dialog-body">${bodyHtml}</div><div class="m-dialog-foot"><button id="md-cancel">${escapeHtml(cancelText)}</button><button id="md-ok">${escapeHtml(confirmText)}</button></div></div>`;
    const close=()=>{ wrap.hidden=true; wrap.innerHTML=''; };
    $('#md-cancel').addEventListener('click',close);
    $('#md-ok').addEventListener('click',()=>{ close(); onConfirm(); });
  }
  // 底部滚轮选择器，对应线上 carSalesRegistration.vue 的 u-picker
  function mToast(message){ const el=$('#m-toast'); if(!el)return toast(message); el.textContent=message; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),1800); }

  function openModal(title,body,footer='',large=false){
    $('#modal-root').innerHTML=`<div class="modal-backdrop"><section class="modal ${large?'large':''}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}"><header class="modal-header"><h2>${escapeHtml(title)}</h2><button class="modal-close" aria-label="关闭">×</button></header><div class="modal-body">${body}</div>${footer?`<footer class="modal-footer">${footer}</footer>`:''}</section></div>`;
    $('.modal-close').addEventListener('click',closeModal); $('.modal-backdrop').addEventListener('click',(event)=>{if(event.target===event.currentTarget)closeModal();});
  }
  function closeModal(){ $('#modal-root').innerHTML=''; state.photos=[]; state.preservedNote=''; }
  function wizardProgress(step){ return `<div class="wizard-progress">${[1,2,3,4].map((n)=>`<span class="${n<=step?'done':''}"></span>`).join('')}</div>`; }
  function showBrandStep(replace){
    const cat=catalogs[energy];
    (replace?replacePage:pushPage)('选择品牌',
      `<div class="m-energy" role="tablist">${Object.keys(catalogs).map((k)=>`<button type="button" role="tab" class="${k===energy?'on':''}" aria-selected="${k===energy}" data-energy="${k}">${k}</button>`).join('')}</div>`+
      `<div class="m-card" style="padding:0">${Object.keys(cat).map((brand)=>`<button class="m-choice" data-brand="${brand}"><span><strong>${brand}</strong><br><small>${Object.keys(cat[brand]).length}个车型</small></span><span class="m-arrow">›</span></button>`).join('')}</div>`,
      `<button class="ghost" id="manual-vehicle">找不到？手动登记车源</button>`,
      ()=>{ $$('[data-energy]').forEach((b)=>b.addEventListener('click',()=>{ if(b.dataset.energy===energy)return; energy=b.dataset.energy; showBrandStep(true); }));
            $$('[data-brand]').forEach((b)=>b.addEventListener('click',()=>showModelStep(b.dataset.brand)));
            $('#manual-vehicle').addEventListener('click',()=>showVehicleForm({manual:true})); });
  }
  function showModelStep(brand){
    pushPage(brand,
      `<div class="m-card" style="padding:0">${Object.keys(catalogs[energy][brand]).map((model)=>`<button class="m-choice" data-model="${escapeHtml(model)}"><span><strong>${escapeHtml(model)}</strong><br><small>${catalogs[energy][brand][model].length}个型号</small></span><span class="m-arrow">›</span></button>`).join('')}</div>`,
      '',
      ()=>{ $$('[data-model]').forEach((b)=>b.addEventListener('click',()=>showVariantStep(brand,b.dataset.model))); });
  }
  function showVariantStep(brand,model){
    pushPage(`${brand} ${model}`,
      `<div class="m-card" style="padding:0">${catalogs[energy][brand][model].map((variant,index)=>`<button class="m-choice" data-variant-index="${index}"><span><strong>${escapeHtml(variant.name)}</strong><br><small>指导价 ${variant.price.toLocaleString()}元</small></span><span class="m-arrow">›</span></button>`).join('')}</div>`,
      '',
      ()=>{ $$('[data-variant-index]').forEach((b)=>b.addEventListener('click',()=>showVehicleForm({selection:{brand,model,variant:catalogs[energy][brand][model][Number(b.dataset.variantIndex)]}}))); });
  }

  // 从「车源登记登录」进入（登记人，原4S员工）时按登记人显示；从代理商后台进入为一级代理商
  function currentRole(){ return document.querySelector('#view-inventory.is-staff4s')?'4S店员工':'一级代理商'; }
  function showVehicleForm({selection=null,manual=false,vehicle=null}){
    const role=vehicle?(vehicle.sourceType==='一手车源'?'4S店员工':'一级代理商'):currentRole(), sourceType=logic.sourceTypeForRole(role), isManual=manual||Boolean(vehicle&&vehicle.manual);
    const brand=vehicle?.brand||selection?.brand||'',model=vehicle?.model||selection?.model||'',variantName=vehicle?.variant||selection?.variant?.name||'';
    const reference=vehicle?.referencePrice??selection?.variant?.price??'',sale=vehicle?.salePrice??selection?.variant?.price??'';
    const returnToDetail=Boolean(vehicle&&pageStack.at(-1)?.title==='车辆详情');
    if(vehicle)state.photos=(vehicle.photos||[]).slice();
    let sourcePhotos=selection?(selection.variant.photos||[]).slice():[];
    // REQ-001 v2.11：登记人显示「所属类型」，内容为「代码 名称」；登记地址取所属类型的地址
    const staffType=typeByCode('A');
    const storeName=role==='4S店员工'?typeLabel('A'):'华东代理商';
    const organizationLabel=role==='4S店员工'?'所属类型':'代理商／经营主体';
    const address=role==='4S店员工'?staffType.region.replace(/ /g,'')+staffType.address:'上海市浦东新区张杨路1188号';
    // v2.11：修改页品牌、车型、型号一律只读（目录登记、手动登记都一样），要换车型须重新登记
    const lockCar=Boolean(vehicle)||!isManual, lockAttr=lockCar?'readonly class="read-only"':'';
    const rejectBox=vehicle&&vehicle.approve==='驳回'
      ? `<div class="reject-box"><strong>该车已被驳回</strong><div class="reject-time">驳回时间：${escapeHtml(vehicle.rejectedAt||'')}</div><p>${escapeHtml(vehicle.rejectReason||'')}</p><small>修改后提交，将重新进入等待审核。</small></div>` : '';
    pushPage(vehicle?'修改车源':isManual?'手动登记车源':'车源登记',`
      ${rejectBox}
      <form id="vehicle-form" class="form-grid" style="margin-top:14px">
        <label class="form-field">品牌<input name="brand" value="${escapeHtml(brand)}" ${lockAttr} maxlength="50" required></label>
        <label class="form-field">车型<input name="model" value="${escapeHtml(model)}" ${lockAttr} maxlength="100" required></label>
        <label class="form-field full">型号<input name="variant" value="${escapeHtml(variantName)}" ${lockAttr} maxlength="150" required></label>
        <label class="form-field">参考价（元）<input name="reference" type="number" step="0.01" min="0.01" value="${reference}" ${isManual?'':'readonly class="read-only"'}></label>
        <label class="form-field">实际售价（元）<input name="sale" type="number" step="0.01" min="0.01" value="${sale}" required></label>
        <div class="form-field full"><span>外观颜色（必填）</span><div class="color-options" data-color-group="exterior">${[...new Set([vehicle?.exterior,'冰川白','曜石黑','星河灰'].filter(Boolean))].map((color)=>`<button type="button" class="color-choice ${vehicle?.exterior===color?'selected':''}" data-color="${color}">${color}</button>`).join('')}</div></div>
        <div class="form-field full"><span>内饰颜色（必填）</span><div class="color-options" data-color-group="interior">${[...new Set([vehicle?.interior,'黑色','棕色','米色'].filter(Boolean))].map((color)=>`<button type="button" class="color-choice ${vehicle?.interior===color?'selected':''}" data-color="${color}">${color}</button>`).join('')}</div></div>
        <div class="form-field full"><span>车辆照片（必填）与视频</span><div class="photo-area"><input id="vehicle-photos" type="file" accept="image/jpeg,image/png,video/*" multiple><div class="field-help">照片最多 9 张，不是正方形的照片会先裁成正方形；可上传 1 个视频。</div><div id="photo-thumbs" class="photo-thumbs"></div></div></div>
        <div class="form-field full" id="location-field"><span>车辆位置（必填）</span><div class="chip-select" data-chip-group="location">${VEHICLE_LOCATIONS.map((t)=>`<button type="button" class="chip-choice ${vehicle?.location===t?'selected':''}" data-val="${t}">${t}</button>`).join('')}</div><div class="field-error" id="location-error"></div></div>
        <div class="form-field full"><span>标签（选填，可多选）</span><div class="chip-select" data-chip-group="labels">${VEHICLE_LABELS.map((t)=>`<button type="button" class="chip-choice ${(vehicle?.labels||[]).includes(t)?'selected':''}" data-val="${t}">${t}</button>`).join('')}</div></div>
        <label class="form-field full">备注<textarea name="note" maxlength="500" placeholder="请输入车辆备注">${escapeHtml(vehicle?.note??state.preservedNote??'')}</textarea><span class="field-help">最多500字。</span></label>
        <div class="form-field full"><span>详情图片（选填）</span><div id="detail-blocks" class="detail-pics"></div><div class="detail-tools"><label class="ghost detail-add">＋ 添加图片<input id="add-detail-image" type="file" accept="image/jpeg,image/png" multiple hidden></label></div><span class="field-help">只能添加图片，最多 9 张，可调整顺序。</span></div>
        <label class="form-field">登记人<input readonly class="read-only" value="${role==='4S店员工'?'员工·李明':'代理商·周强'}"></label>
        <label class="form-field">登录手机号<input readonly class="read-only" value="${role==='4S店员工'?'13800001234':'18686636658'}"></label>
        <label class="form-field${role==='4S店员工'?' full':''}">${organizationLabel}<input readonly class="read-only" value="${escapeHtml(storeName)}"></label>
        <label class="form-field full">登记地址<textarea readonly class="read-only">${escapeHtml(address)}</textarea></label>
        <label class="form-field">车源类型<input readonly class="read-only" value="${sourceType||'无登记资格'}"></label>
        <label class="form-field">审核状态<input readonly class="read-only" value="${vehicle?escapeHtml(vehicle.approve):'提交后进入等待审核'}"></label>
        <input type="hidden" name="exterior" value="${escapeHtml(vehicle?.exterior||'')}"><input type="hidden" name="interior" value="${escapeHtml(vehicle?.interior||'')}">
        <div id="vehicle-error" class="field-error form-field full"></div>
      </form>`,
      `<button class="ghost" id="cancel-vehicle-form">取消</button>${!isManual&&!vehicle?'<button class="ghost" id="reselect-vehicle">重选型号</button>':''}<button class="primary" id="save-vehicle">${vehicle?'保存修改':'保存登记'}</button>`,
      ()=>bindVehicleForm());
    function bindVehicleForm(){
    // 上传选图后自动裁剪；表单不设单独的待裁剪入口。
    const renderPhotos=()=>{
      $('#photo-thumbs').innerHTML=state.photos.map((src,index)=>src.startsWith('data:video')?'<div class="vehicle-cover photo-thumb sq">视频</div>':`<button type="button" class="reg-photo-button" data-photo-preview="${index}" aria-label="查看车辆照片${index+1}"><img class="photo-thumb sq" src="${escapeHtml(src)}" alt="车辆照片${index+1}"></button>`).join('');
      $$('[data-photo-preview]').forEach((button)=>button.addEventListener('click',()=>{
        const src=state.photos[Number(button.dataset.photoPreview)], images=state.photos.filter((item)=>!item.startsWith('data:video'));
        openRegistrationImages(images,images.indexOf(src),'车辆照片');
      }));
    };
    renderPhotos();
    if(sourcePhotos.length){
      const incoming=sourcePhotos; sourcePhotos=[];
      openCropper(incoming.map((src)=>({src})),(out)=>{ state.photos=logic.mergeVehiclePhotos(state.photos,out); renderPhotos(); });
    }
    state.formLocation=vehicle?.location||''; state.formLabels=(vehicle?.labels||[]).slice();
    state.formDetail=(vehicle?.detailImages||[]).slice();
    // R3-07：详情只放图片，不能写文字；可上移、下移、移除；不裁切
    const renderDetail=()=>{
      const n=state.formDetail.length;
      $('#detail-blocks').innerHTML=n?state.formDetail.map((src,i)=>`<div class="detail-pic"><button type="button" class="reg-photo-button" data-detail-preview="${i}" aria-label="查看详情图片${i+1}"><img src="${escapeHtml(src)}" alt="详情图片${i+1}"></button><div class="detail-pic-tools">
        <button type="button" class="detail-mini" data-detail-up="${i}" ${i===0?'disabled':''} aria-label="上移">↑</button>
        <button type="button" class="detail-mini" data-detail-down="${i}" ${i===n-1?'disabled':''} aria-label="下移">↓</button>
        <button type="button" class="detail-mini del" data-detail-remove="${i}" aria-label="移除">移除</button></div></div>`).join('')
        :'<div class="detail-empty">还没有图片。</div>';
      $$('[data-detail-preview]').forEach((button)=>button.addEventListener('click',()=>openRegistrationImages(state.formDetail,Number(button.dataset.detailPreview),'详情图片')));
      $$('[data-detail-remove]').forEach((b)=>b.addEventListener('click',()=>{state.formDetail.splice(Number(b.dataset.detailRemove),1);renderDetail();}));
      $$('[data-detail-up]').forEach((b)=>b.addEventListener('click',()=>{ const i=Number(b.dataset.detailUp); if(i<=0)return; const arr=state.formDetail; [arr[i-1],arr[i]]=[arr[i],arr[i-1]]; renderDetail(); }));
      $$('[data-detail-down]').forEach((b)=>b.addEventListener('click',()=>{ const i=Number(b.dataset.detailDown); const arr=state.formDetail; if(i>=arr.length-1)return; [arr[i+1],arr[i]]=[arr[i],arr[i+1]]; renderDetail(); }));
    };
    renderDetail();
    $('#add-detail-image').addEventListener('change',async(event)=>{
      const files=[...event.target.files];event.target.value='';
      const available=9-state.formDetail.length;
      if(files.length>available)mToast('详情图片最多9张');
      // v2.11 第 2.8 节：超过 10MB 自动压缩后上传，不提示、不拒绝
      const picked=files.slice(0,available).filter((file)=>{
        if(!['image/jpeg','image/png'].includes(file.type)){mToast('详情只能添加JPG或PNG图片');return false;}
        return true;
      });
      if(!picked.length)return;
      const saveButton=$('#save-vehicle');saveButton.disabled=true;
      try{
        const images=await Promise.all(picked.map((file)=>new Promise((resolve,reject)=>{
          const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);
        })));
        state.formDetail.push(...images.slice(0,9-state.formDetail.length));renderDetail();
      }catch(error){mToast('图片读取失败，请重新添加');}
      finally{saveButton.disabled=false;}
    });
    $$('.chip-choice').forEach((button)=>button.addEventListener('click',()=>{
      const group=button.closest('[data-chip-group]').dataset.chipGroup, val=button.dataset.val;
      if(group==='location'){ state.formLocation=val; $$('.chip-choice',button.closest('[data-chip-group]')).forEach((b)=>b.classList.toggle('selected',b===button)); $('#location-error').textContent=''; return; }
      const bag=state.formLabels, at=bag.indexOf(val);
      if(at>-1){bag.splice(at,1);button.classList.remove('selected');}else{bag.push(val);button.classList.add('selected');}
    }));
    $$('.color-choice').forEach((button)=>button.addEventListener('click',()=>{ const group=button.closest('[data-color-group]'); $$('.color-choice',group).forEach((item)=>item.classList.remove('selected')); button.classList.add('selected'); $(`[name="${group.dataset.colorGroup}"]`).value=button.dataset.color; }));
    $('#vehicle-photos').addEventListener('change',(event)=>{
      const picked=[...event.target.files]; event.target.value='';
      const room=Math.max(0,9-state.photos.length); if(picked.filter((f)=>!f.type.startsWith('video')).length>room)mToast('最多上传9张车辆照片');
      const files=picked.slice(0,room);   // v2.11：超过 10MB 自动压缩后上传，不再拒绝
      Promise.all(files.map((file)=>new Promise((res)=>{ const r=new FileReader(); r.onload=()=>res({src:r.result,video:file.type.startsWith('video')}); r.readAsDataURL(file); }))).then((items)=>{
        items.filter((it)=>it.video).forEach((it)=>state.photos.push(it.src));
        const imgs=items.filter((it)=>!it.video);
        if(!imgs.length){renderPhotos();return;}
        openCropper(imgs,(out)=>{ out.forEach((src)=>state.photos.push(src)); renderPhotos(); });
      });
    });
    if(isManual){ const referenceInput=$('[name="reference"]'),saleInput=$('[name="sale"]'); let saleTouched=Boolean(sale); saleInput.addEventListener('input',()=>saleTouched=true); referenceInput.addEventListener('input',()=>{if(!saleTouched)saleInput.value=referenceInput.value;}); }
    $('#cancel-vehicle-form').addEventListener('click',()=>returnToDetail?popPage():clearStack());
    if($('#reselect-vehicle'))$('#reselect-vehicle').addEventListener('click',()=>{
      const note=$('[name="note"]').value;
      mDialog('重新选择型号','重选后将更新参考价、实际售价和颜色；已有图片和备注保留。','继续选择',()=>{state.preservedNote=note;clearStack();showBrandStep();});
    });
    $('#save-vehicle').addEventListener('click',()=>saveVehicleForm(vehicle,{role,sourceType,storeName,address,isManual,returnToDetail}));
    }
  }

  function saveVehicleForm(vehicle,meta){
    const form=$('#vehicle-form'), data=new FormData(form), error=$('#vehicle-error'); error.textContent='';
    if(!form.reportValidity())return;
    if(!data.get('exterior')||!data.get('interior')){error.textContent='请选择外观颜色和内饰颜色';return;}
    if(!state.photos.length){error.textContent='请至少上传1张车辆照片';return;}
    if(!state.formLocation){ $('#location-error').textContent='请选择车辆位置'; $('#location-field').scrollIntoView({block:'center'}); mToast('请选择车辆位置'); return; }
    const decision=logic.registrationDecision({role:meta.role,contactId:state.currentContactId});
    if(!decision.allowed){error.textContent=decision.reason;return;}
    const next={brand:data.get('brand').trim(),model:data.get('model').trim(),variant:data.get('variant').trim(),
      referencePrice:data.get('reference')?Number(data.get('reference')):null,salePrice:Number(data.get('sale')),
      exterior:data.get('exterior'),interior:data.get('interior'),note:data.get('note').trim(),
      location:state.formLocation,labels:state.formLabels.slice(),
      detailImages:state.formDetail.slice(),
      photos:state.photos.slice()};
    if(vehicle){
      // R2-11：值比对判定是否重审，不以「点了保存」为依据
      const changed=Object.keys(next).some((k)=>JSON.stringify(next[k])!==JSON.stringify(vehicle[k]));
      Object.assign(vehicle,next,{updatedAt:'2026-09-13 20:30'});
      if(changed){ Object.assign(vehicle,{approve:'等待审核',status:'已下架',rejectReason:'',rejectedAt:'',unlistReason:''});
        mToast('信息已修改，重新进入等待审核'); }
      else mToast('未作任何修改，审核状态不变');
    } else {
      vehicles.unshift({id:'1789562340117'+String(vehicles.length*137).padStart(6,'0'),ownerId:state.ownerId,...next,
        approve:'等待审核',vehicleNo:'',hot:false,unlistReason:'',rejectReason:'',rejectedAt:'',status:'已下架',sourceType:meta.sourceType,
        ownerName:meta.role==='4S店员工'?'员工·李明':'代理商·周强',storeName:meta.storeName,address:meta.address,
        createdAt:'2026-09-13 20:30',updatedAt:'2026-09-13 20:30',unlistedAt:'',manual:meta.isManual});
      mToast('已提交，等待审核');
    }
    clearStack(); state.vehicleVisible=20; renderVehicles();
    if(vehicle&&meta.returnToDetail)showVehicleDetail(vehicle);
  }

  // R3-08 车辆照片裁成正方形（REQ-001 第 2.8.1 节）：固定正方形框，拖动图片、双指缩放选择保留区域。
  // items: [{src}]，逐张裁；done(out) 返回裁好的正方形图（取消的那张不在 out 里）。已是正方形的直接通过。
  function openCropper(items,done){
    const out=[]; let idx=0;
    const host=$('#m-stack').parentElement;
    const layer=document.createElement('div'); layer.className='crop-layer'; host.appendChild(layer);
    const finish=()=>{ layer.remove(); done(out); };
    const next=()=>{
      if(idx>=items.length)return finish();
      const img=new Image(); img.onload=()=>{
        if(img.naturalWidth===img.naturalHeight){ out.push(items[idx].src); idx++; return next(); }
        show(img);
      }; img.src=items[idx].src;
    };
    const show=(img)=>{
      const total=items.length;
      layer.innerHTML=`<div class="crop-top">${total>1?`<span class="crop-count">第 ${idx+1}／${total} 张</span>`:''}<span>拖动图片，选择要保留的区域</span></div>
        <div class="crop-stage"><img class="crop-img" src="${img.src}" alt="" draggable="false"><div class="crop-box"><i></i><i></i><i></i><i></i></div></div>
        <div class="crop-foot"><button type="button" id="crop-cancel">取消</button><button type="button" class="ok" id="crop-ok">确定</button></div>`;
      const stage=$('.crop-stage',layer), el=$('.crop-img',layer), box=$('.crop-box',layer);
      const W=stage.clientWidth, H=stage.clientHeight, side=W-32, bx=(W-side)/2, by=(H-side)/2;
      Object.assign(box.style,{left:bx+'px',top:by+'px',width:side+'px',height:side+'px'});
      const minScale=side/Math.min(img.naturalWidth,img.naturalHeight);
      let scale=minScale, x=bx+(side-img.naturalWidth*scale)/2, y=by+(side-img.naturalHeight*scale)/2;
      const clamp=()=>{ const w=img.naturalWidth*scale,h=img.naturalHeight*scale; x=Math.min(bx,Math.max(bx+side-w,x)); y=Math.min(by,Math.max(by+side-h,y)); };
      const paint=()=>{ clamp(); Object.assign(el.style,{width:img.naturalWidth*scale+'px',height:img.naturalHeight*scale+'px',transform:`translate(${x}px,${y}px)`}); };
      paint();
      const pts=new Map(); let last=null, lastDist=0;
      stage.addEventListener('pointerdown',(e)=>{ stage.setPointerCapture(e.pointerId); pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); last={x:e.clientX,y:e.clientY}; if(pts.size===2){const [a,b]=[...pts.values()]; lastDist=Math.hypot(a.x-b.x,a.y-b.y);} });
      stage.addEventListener('pointermove',(e)=>{ if(!pts.has(e.pointerId))return; pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
        if(pts.size===2){ const [a,b]=[...pts.values()], d=Math.hypot(a.x-b.x,a.y-b.y); if(lastDist){ const cx=bx+side/2, cy=by+side/2, k=Math.max(minScale,Math.min(minScale*4,scale*d/lastDist))/scale; x=cx-(cx-x)*k; y=cy-(cy-y)*k; scale*=k; } lastDist=d; }
        else if(last){ x+=e.clientX-last.x; y+=e.clientY-last.y; last={x:e.clientX,y:e.clientY}; }
        paint(); });
      const up=(e)=>{ pts.delete(e.pointerId); lastDist=0; const r=[...pts.values()][0]; last=r?{...r}:null; };
      stage.addEventListener('pointerup',up); stage.addEventListener('pointercancel',up);
      stage.addEventListener('wheel',(e)=>{ e.preventDefault(); const cx=bx+side/2, cy=by+side/2, k=Math.max(minScale,Math.min(minScale*4,scale*(e.deltaY<0?1.08:0.93)))/scale; x=cx-(cx-x)*k; y=cy-(cy-y)*k; scale*=k; paint(); },{passive:false});
      $('#crop-cancel',layer).addEventListener('click',()=>{ idx++; next(); });
      $('#crop-ok',layer).addEventListener('click',()=>{
        const srcSide=side/scale, sx=(bx-x)/scale, sy=(by-y)/scale, outSide=Math.min(1080,Math.round(srcSide));
        const c=document.createElement('canvas'); c.width=c.height=outSide;
        c.getContext('2d').drawImage(img,sx,sy,srcSide,srcSide,0,0,outSide,outSide);
        out.push(c.toDataURL('image/jpeg',0.9)); idx++; next();
      });
    };
    next();
  }

  // 预览层不重建底下的页面，关闭后保留输入、图片顺序及滚动位置。
  function openRegistrationImages(images,start=0,title='详情图片'){
    const items=images.slice();if(!items.length)return;
    let index=Math.max(0,Math.min(start,items.length-1));
    const host=$('#m-stack').parentElement, origin=document.activeElement;
    const layer=document.createElement('section');layer.className='reg-image-viewer';
    layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-label',title+'预览');
    host.appendChild(layer);
    const fit=()=>{const box=host.getBoundingClientRect(),scale=box.height/host.offsetHeight||1;layer.style.top=Math.max(0,-box.top)/scale+'px';layer.style.bottom=Math.max(0,box.bottom-window.innerHeight)/scale+'px';};
    const close=()=>{document.removeEventListener('keydown',onKey);window.removeEventListener('resize',fit);window.removeEventListener('scroll',fit,true);layer.remove();if(origin?.isConnected)origin.focus({preventScroll:true});};
    const move=(delta)=>{index=Math.max(0,Math.min(items.length-1,index+delta));draw();};
    const onKey=(event)=>{if(event.key==='Escape')close();if(event.key==='ArrowLeft')move(-1);if(event.key==='ArrowRight')move(1);};
    const draw=()=>{
      layer.innerHTML=`<header><span>${escapeHtml(title)}</span><button type="button" class="reg-preview-close" aria-label="关闭图片预览">关闭</button></header>
        <div class="reg-preview-body"><img src="${escapeHtml(items[index])}" alt="${escapeHtml(title)}${index+1}" draggable="false"></div>
        <footer><button type="button" class="reg-preview-prev" ${index===0?'disabled':''}>上一张</button><span aria-live="polite">${index+1} / ${items.length}</span><button type="button" class="reg-preview-next" ${index===items.length-1?'disabled':''}>下一张</button></footer>`;
      $('.reg-preview-close',layer).addEventListener('click',close);
      $('.reg-preview-prev',layer).addEventListener('click',()=>move(-1));
      $('.reg-preview-next',layer).addEventListener('click',()=>move(1));
      $('.reg-preview-close',layer).focus({preventScroll:true});
      let startX=null;
      const body=$('.reg-preview-body',layer);
      body.addEventListener('touchstart',(event)=>{startX=event.touches[0].clientX;},{passive:true});
      body.addEventListener('touchend',(event)=>{if(startX===null)return;const dx=event.changedTouches[0].clientX-startX;startX=null;if(Math.abs(dx)>40)move(dx<0?1:-1);},{passive:true});
    };
    document.addEventListener('keydown',onKey);window.addEventListener('resize',fit);window.addEventListener('scroll',fit,true);fit();draw();
  }

  function showVehicleDetail(vehicle){
    const organizationLabel=vehicle.sourceType==='一手车源'?'所属类型':'代理商／经营主体';
    // v2.11：「车辆主键 ID」改为「车辆编号」（审核通过前显示「审核通过后生成」）；已下架显示下架原因；「促销标识」改为「车辆位置」
    const offReason=vehicle.approve==='通过'&&vehicle.status==='已下架'&&vehicle.unlistReason;
    const rows=[['审核状态',vehicle.approve],...(vehicle.approve==='驳回'?[['驳回时间',vehicle.rejectedAt],['驳回原因',vehicle.rejectReason]]:[]),...(vehicle.approve==='通过'?[['上下架',vehicle.status]]:[]),...(offReason?[['下架原因',vehicle.unlistReason]]:[]),['车源类型',vehicle.sourceType],['车辆编号',vehicle.vehicleNo||'审核通过后生成'],['车辆位置',vehicle.location||'暂无'],['标签',(vehicle.labels||[]).join('、')||'无'],['置顶',isTop(vehicle)?`置顶至 ${fmtTop(vehicle.topEnd,true)}`:'未置顶'],['品牌／车型／型号',`${vehicle.brand} ${vehicle.model} ${vehicle.variant}`],['参考价',vehicle.referencePrice?`${vehicle.referencePrice.toLocaleString()}元`:'暂无参考价'],['实际售价',`${vehicle.salePrice.toLocaleString()}元`],['外观／内饰颜色',`${vehicle.exterior}／${vehicle.interior}`],['备注',vehicle.note||'暂无备注'],['车辆照片',(vehicle.photos||[]).filter((src)=>!src.startsWith('data:video')).length+' 张'],['详情图片',(vehicle.detailImages||[]).length?`${vehicle.detailImages.length} 张`:'未添加'],['登记人',vehicle.ownerName],[organizationLabel,vehicle.storeName],['登记地址',vehicle.address],['首次登记时间',vehicle.createdAt],['最后修改时间',vehicle.updatedAt],...(vehicle.unlistedAt?[['下架时间',vehicle.unlistedAt]]:[]),...(vehicle.relistedAt?[['最后上架时间',vehicle.relistedAt]]:[])];
    pushPage('车辆详情',
      `<div class="m-card"><dl class="detail-grid">${rows.map(([key,value])=>{const images=key==='详情图片'?(vehicle.detailImages||[]):key==='车辆照片'?(vehicle.photos||[]).filter((src)=>!src.startsWith('data:video')):null;return `<dt>${key}</dt><dd>${images?(images.length?`<button type="button" class="reg-image-link" data-view-images="${key}">查看${key}（${images.length}张）</button>`:'未添加'):escapeHtml(value)}</dd>`;}).join('')}</dl></div>`,
      `<button class="primary" id="detail-edit">修改</button>${vehicle.approve!=='通过'?'':vehicle.status==='在售'?'<button class="ghost" id="detail-unlist">下架</button>':'<button class="ghost" id="detail-relist">重新上架</button>'}${canTop(vehicle)?`<button class="ghost top-ghost" id="detail-top">${isTop(vehicle)?'续期':'置顶'}</button>`:''}`,
      ()=>{ $$('[data-view-images]').forEach((button)=>button.addEventListener('click',()=>openRegistrationImages(button.dataset.viewImages==='详情图片'?(vehicle.detailImages||[]):(vehicle.photos||[]).filter((src)=>!src.startsWith('data:video')),0,button.dataset.viewImages)));
            $('#detail-edit').addEventListener('click',()=>showVehicleForm({vehicle}));
            if($('#detail-unlist'))$('#detail-unlist').addEventListener('click',()=>confirmUnlist(vehicle));
            if($('#detail-relist'))$('#detail-relist').addEventListener('click',()=>confirmRelist(vehicle));
            if($('#detail-top'))$('#detail-top').addEventListener('click',()=>openTopSheet(vehicle,()=>{ popPage(); showVehicleDetail(vehicle); renderVehicles(); })); });
  }
  function confirmUnlist(vehicle){
    mDialog('确认下架该车辆？',`${escapeHtml(vehicle.brand+' '+vehicle.model+' '+vehicle.variant)}<br>${escapeHtml(vehicle.vehicleNo)}<br>下架后将停止对外展示。`,'确认下架',()=>{
      Object.assign(vehicle,{status:'已下架',unlistedAt:'2026-09-13 20:35',unlistReason:SELF_UNLIST}); clearStack(); renderVehicles(); mToast('车辆已下架');
    });
  }
  function confirmRelist(vehicle){
    mDialog('确认重新上架？','在原车辆记录上重新上架，原登记及下架历史保留。未改任何信息不重审。','确认上架',()=>{
      const updated=logic.relistVehicle([vehicle],vehicle.id,'2026-09-13 10:00')[0];
      Object.assign(vehicle,updated,{unlistReason:''}); clearStack(); renderVehicles(); mToast('车辆已重新上架');
    });
  }

  // ---- REQ-005 v1.4 类型维护 ----
  // 近 30 天上传车辆数取自 PC 车源管理的同一份车辆（含等待审核、驳回、已下架），点击带条件跳过去
  function recentCount(filter){return window.PcStock?window.PcStock.recentCount(filter):0;}
  function staffCount(code){return employees.filter((item)=>item.typeCode===code).length;}
  function numLink(n,attr){return n?`<button type="button" class="num-link" ${attr}>${n}</button>`:'<span class="num-zero">0</span>';}
  function filteredStores(){const q=state.storeQuery;return stores.filter((store)=>(!q.code||store.code===q.code)&&store.name.toLowerCase().includes(q.name.toLowerCase()));}
  function fillTypeCodeFilter(){const sel=$('#store-code-filter');if(!sel)return;const old=sel.value;sel.innerHTML='<option value="">全部</option>'+stores.map((s)=>s.code).sort().map((c)=>`<option>${c}</option>`).join('');sel.value=stores.some((s)=>s.code===old)?old:'';}
  function renderStores(){
    const all=filteredStores(),totalPages=Math.max(1,Math.ceil(all.length/state.storePageSize)); if(state.storePage>totalPages)state.storePage=totalPages;
    const rows=all.slice((state.storePage-1)*state.storePageSize,state.storePage*state.storePageSize);
    $('#store-table-body').innerHTML=rows.map((store)=>`<tr><td><b class="type-code">${store.code}</b></td><td><div class="truncate-two" title="${escapeHtml(store.name)}">${escapeHtml(store.name)}</div></td><td>${numLink(staffCount(store.code),`data-type-staff="${store.code}" title="查看该类型的登记人"`)}</td><td>${numLink(recentCount({type:store.code}),`data-type-cars="${store.code}" title="查看近 30 天上传的车辆"`)}</td><td>${store.region}</td><td><div class="truncate-two" title="${escapeHtml(store.address)}">${escapeHtml(store.address)}</div></td><td><div class="table-actions"><button data-store-view="${store.id}">查看</button><button data-store-edit="${store.id}">修改</button></div></td></tr>`).join('');
    $('#store-empty').hidden=rows.length>0; $('#store-empty').textContent=state.storeQuery.code||state.storeQuery.name?'未找到匹配的类型':'暂无类型'; $('#store-total').textContent=`共 ${all.length} 条`; $('#store-page').textContent=`${state.storePage} / ${totalPages}`; $('#store-prev').disabled=state.storePage<=1; $('#store-next').disabled=state.storePage>=totalPages;
    $$('[data-store-view]').forEach((button)=>button.addEventListener('click',()=>showStoreDetail(stores.find((item)=>item.id===button.dataset.storeView)))); $$('[data-store-edit]').forEach((button)=>button.addEventListener('click',()=>showStoreForm(stores.find((item)=>item.id===button.dataset.storeEdit))));
    $$('[data-type-staff]').forEach((button)=>button.addEventListener('click',()=>openEmployeesByType(button.dataset.typeStaff)));
    $$('[data-type-cars]').forEach((button)=>button.addEventListener('click',()=>{if(window.PcStock)window.PcStock.open({type:button.dataset.typeCars});}));
    fillTypeCodeFilter(); populateStoreOptions();
  }
  function showStoreDetail(store){ openModal('查看类型',`<dl class="detail-grid"><dt>类型代码</dt><dd>${store.code}</dd><dt>类型名称</dt><dd>${escapeHtml(store.name)}</dd><dt>省市区县</dt><dd>${store.region}</dd><dt>详细地址</dt><dd>${escapeHtml(store.address)}</dd></dl>`,`<button class="ghost" id="store-close">关闭</button><button class="primary" id="store-to-edit">修改</button>`); $('#store-close').addEventListener('click',closeModal); $('#store-to-edit').addEventListener('click',()=>showStoreForm(store)); }
  function regionOptions(list,value){return '<option value="">请选择</option>'+list.map((x)=>`<option ${x===value?'selected':''}>${x}</option>`).join('');}
  function showStoreForm(store=null,onReturn=null){
    const free=TYPE_CODES.filter((c)=>!stores.some((s)=>s.code===c));
    if(!store&&!free.length){toast('类型代码已用完');return;}
    const parts=(store?.region||'').split(' ');
    const codeField=store
      ? `<label class="form-field">类型代码<input value="${store.code}" readonly class="read-only"><span class="field-help">类型代码保存后不能修改</span></label>`
      : `<label class="form-field">类型代码<select name="code" required>${'<option value="">请选择</option>'+free.map((c)=>`<option>${c}</option>`).join('')}</select><span class="field-help">已被其他类型使用的字母不显示；保存后不能修改</span></label>`;
    openModal(store?'修改类型':'新增类型',`<form id="store-form" class="form-grid">${codeField}<label class="form-field">类型名称<input name="name" maxlength="100" value="${escapeHtml(store?.name||'')}" placeholder="请输入类型名称" required></label><label class="form-field">省<select name="province" required>${regionOptions(Object.keys(REGIONS),parts[0])}</select></label><label class="form-field">市<select name="city" required>${regionOptions(Object.keys(REGIONS[parts[0]]||{}),parts[1])}</select></label><label class="form-field">区县<select name="district" required>${regionOptions((REGIONS[parts[0]]||{})[parts[1]]||[],parts[2])}</select></label><label class="form-field full">详细地址<input name="address" maxlength="200" value="${escapeHtml(store?.address||'')}" placeholder="请输入道路、门牌等详细地址" required></label><div class="source-mark form-field full">已确认：名称＋地区＋详细地址完全一致时拦截；同名不同地址允许。</div><div id="store-error" class="field-error form-field full"></div></form>`,`<button class="ghost" id="store-form-cancel">取消</button><button class="primary" id="store-form-save">保存</button>`);
    const prov=$('[name="province"]'),city=$('[name="city"]'),dist=$('[name="district"]');
    prov.addEventListener('change',()=>{city.innerHTML=regionOptions(Object.keys(REGIONS[prov.value]||{}));dist.innerHTML=regionOptions([]);});
    city.addEventListener('change',()=>{dist.innerHTML=regionOptions((REGIONS[prov.value]||{})[city.value]||[]);});
    $('#store-form-cancel').addEventListener('click',()=>{if(onReturn)onReturn(null);else closeModal();}); $('#store-form-save').addEventListener('click',()=>{const form=$('#store-form');if(!form.reportValidity())return;const data=new FormData(form),candidate={name:data.get('name').trim(),region:`${data.get('province')} ${data.get('city')} ${data.get('district')}`,address:data.get('address').trim()};if(!candidate.name){$('#store-error').textContent='请输入类型名称';return;}const duplicate=stores.some((item)=>item.id!==store?.id&&item.name===candidate.name&&item.region===candidate.region&&item.address===candidate.address);if(duplicate){$('#store-error').textContent='该类型已存在，请使用已有记录';return;}let savedStore=store;if(store)Object.assign(store,candidate);else{const code=data.get('code');if(stores.some((item)=>item.code===code)){$('#store-error').textContent='该类型代码已被使用，请重新选择';return;}savedStore={id:`store-${code}`,code,...candidate,createdAt:Date.now()};stores.unshift(savedStore);state.storePage=1;}renderStores();renderEmployees();toast(store?'类型信息已更新':'类型新增成功');if(onReturn)onReturn(savedStore);else closeModal();});
  }
  // ---- REQ-006 v1.6 登记人维护 ----
  function populateStoreOptions(){ const list=$('#employee-store-options'); if(list) list.innerHTML=typesByCode().map((store)=>`<option value="${escapeHtml(typeLabel(store.code))}">${store.region}</option>`).join(''); }
  function staffRecent(employee){return recentCount({staffId:employee.id});}
  function filteredEmployees(){const q=state.employeeQuery;const list=employees.filter((employee)=>employee.name.includes(q.name)&&employee.phone.includes(q.phone)&&(!q.store||typeLabel(employee.typeCode)===q.store)&&(!q.status||employee.status===q.status));if(state.employeeSort)list.sort((a,b)=>(staffRecent(a)-staffRecent(b))*(state.employeeSort==='asc'?1:-1));return list;}
  function renderEmployees(){
    const all=filteredEmployees(),pageSize=20,totalPages=Math.max(1,Math.ceil(all.length/pageSize));if(state.employeePage>totalPages)state.employeePage=totalPages;const rows=all.slice((state.employeePage-1)*pageSize,state.employeePage*pageSize);
    $('#employee-table-body').innerHTML=rows.map((employee)=>`<tr><td>${escapeHtml(employee.name)}</td><td>${employee.phone}</td><td><div class="truncate-two" title="${escapeHtml(typeLabel(employee.typeCode))}">${escapeHtml(typeLabel(employee.typeCode))}</div></td><td>${numLink(staffRecent(employee),`data-employee-cars="${employee.id}" title="查看近 30 天上传的车辆"`)}</td><td><span class="status-dot ${employee.status==='启用'?'on':''}">${employee.status}</span></td><td>${escapeHtml(logic.remarkPreview(employee.note))}</td><td><div class="table-actions"><button data-employee-view="${employee.id}">查看</button><button data-employee-edit="${employee.id}">修改</button><button class="${employee.status==='启用'?'danger':''}" data-employee-toggle="${employee.id}">${employee.status==='启用'?'停用':'启用'}</button></div></td></tr>`).join('');
    $('#employee-empty').hidden=rows.length>0;$('#employee-empty').textContent=Object.values(state.employeeQuery).some(Boolean)?'未找到符合条件的登记人，请调整查询条件':'暂无登记人，请先新增登记人';$('#employee-total').textContent=`共 ${all.length} 条`;$('#employee-page').textContent=`${state.employeePage} / ${totalPages}`;$('#employee-prev').disabled=state.employeePage<=1;$('#employee-next').disabled=state.employeePage>=totalPages;
    const sortBtn=$('#employee-sort');if(sortBtn){sortBtn.querySelector('i').textContent=state.employeeSort==='desc'?'↓':state.employeeSort==='asc'?'↑':'↕';sortBtn.title=state.employeeSort==='desc'?'当前：多的在前，点击改为少的在前':state.employeeSort==='asc'?'当前：少的在前，点击恢复默认排序':'点击按近 30 天上传车辆数从多到少排序';}
    $$('[data-employee-view]').forEach((button)=>button.addEventListener('click',()=>showEmployeeDetail(employees.find((item)=>item.id===button.dataset.employeeView))));$$('[data-employee-edit]').forEach((button)=>button.addEventListener('click',()=>showEmployeeForm(employees.find((item)=>item.id===button.dataset.employeeEdit))));$$('[data-employee-toggle]').forEach((button)=>button.addEventListener('click',()=>confirmEmployeeToggle(employees.find((item)=>item.id===button.dataset.employeeToggle))));
    $$('[data-employee-cars]').forEach((button)=>button.addEventListener('click',()=>{const e=employees.find((item)=>item.id===button.dataset.employeeCars);if(window.PcStock&&e)window.PcStock.open({person:e.name});}));
    populateStoreOptions();
  }
  // 类型维护点「登记人数」：带入所属类型并自动查询
  function openEmployeesByType(code){
    $('#employee-name').value='';$('#employee-phone').value='';$('#employee-status').value='';$('#employee-store-filter').value=typeLabel(code);
    state.employeeQuery={name:'',phone:'',store:typeLabel(code),status:''};state.employeePage=1;renderEmployees();showView('employees');
  }
  function showEmployeeDetail(employee){const store=typeByCode(employee.typeCode);openModal('登记人详情',`<dl class="detail-grid"><dt>登记人姓名</dt><dd>${escapeHtml(employee.name)}</dd><dt>手机号</dt><dd>${employee.phone}</dd><dt>身份证号</dt><dd>${employee.idCard}</dd><dt>所属类型</dt><dd>${escapeHtml(typeLabel(employee.typeCode))}</dd><dt>类型地址</dt><dd>${escapeHtml(typeAddress(store))}</dd><dt>账号状态</dt><dd>${employee.status}</dd><dt>备注</dt><dd>${escapeHtml(employee.note||'暂无备注')}</dd></dl>`,`<button class="ghost" id="employee-detail-close">关闭</button><button class="primary" id="employee-detail-edit">修改</button>`);$('#employee-detail-close').addEventListener('click',closeModal);$('#employee-detail-edit').addEventListener('click',()=>showEmployeeForm(employee));}
  function showEmployeeForm(employee=null){
    const store=employee?typeByCode(employee.typeCode):null;
    const values={name:employee?.name??'',phone:employee?.phone??'',idCard:employee?.idCard??'',note:employee?.note??''};
    openModal(employee?'修改登记人':'新增登记人',`<form id="employee-form" class="form-grid"><div class="source-mark form-field full">新增登记人默认启用。启用／停用只在登记人列表操作并二次确认。</div><label class="form-field">登记人姓名<input name="name" maxlength="50" value="${escapeHtml(values.name)}" placeholder="请输入登记人姓名" required></label><label class="form-field">手机号<input name="phone" value="${values.phone}" pattern="1[3-9][0-9]{9}" placeholder="请输入11位手机号" required></label><label class="form-field">身份证号<input name="idCard" value="${values.idCard}" pattern="[0-9]{17}[0-9Xx]" placeholder="请输入18位身份证号" required></label><label class="form-field">所属类型<input name="store" list="form-store-options" value="${escapeHtml(store?typeLabel(store.code):'')}" placeholder="输入代码或名称搜索并选择" required><datalist id="form-store-options">${typesByCode().map((item)=>`<option value="${escapeHtml(typeLabel(item.code))}">${item.region}</option>`).join('')}</datalist></label><label class="form-field full">类型地址<textarea id="employee-store-address" readonly class="read-only">${escapeHtml(typeAddress(store))}</textarea></label><label class="form-field full">备注<textarea name="note" maxlength="500">${escapeHtml(values.note)}</textarea></label><div class="field-help form-field full">若类型尚未配置，请先到“类型维护”新增，再返回本页选择。</div><div id="employee-error" class="field-error form-field full"></div></form>`,`<button class="ghost" id="employee-form-cancel">取消</button><button class="primary" id="employee-form-save">保存</button>`,true);
    const storeInput=$('[name="store"]');
    const pick=()=>stores.find((item)=>typeLabel(item.code)===storeInput.value.trim());
    storeInput.addEventListener('change',()=>{$('#employee-store-address').value=typeAddress(pick());});
    $('#employee-form-cancel').addEventListener('click',closeModal);
    $('#employee-form-save').addEventListener('click',()=>{const form=$('#employee-form');if(!form.reportValidity())return;const data=new FormData(form),chosen=pick();if(!chosen){$('#employee-error').textContent='请选择所属类型';return;}if(!validIdCard(data.get('idCard'))){$('#employee-error').textContent='请输入正确的18位身份证号';return;}const phoneDecision=logic.employeePhoneDecision({usedByOtherRole:data.get('phone')==='13800009999'});if(!phoneDecision.allowed){$('#employee-error').textContent='该手机号已属于其他账号，不能新增为登记人';return;}const others=employees.filter((item)=>item.id!==employee?.id);if(others.some((item)=>item.phone===data.get('phone'))){$('#employee-error').textContent='该手机号已关联登记人，请查询已有登记人';return;}if(others.some((item)=>item.idCard.toUpperCase()===data.get('idCard').toUpperCase())){$('#employee-error').textContent='该身份证号已关联登记人，请核对';return;}const update={name:data.get('name').trim(),phone:data.get('phone'),idCard:data.get('idCard').toUpperCase(),typeCode:chosen.code,status:employee?.status||'启用',note:data.get('note').trim()};if(employee)Object.assign(employee,update);else employees.unshift({id:`employee-${Date.now()}`,...update,createdAt:Date.now()});closeModal();state.employeePage=1;renderEmployees();renderStores();toast(employee?'登记人信息已更新':'登记人新增成功');});
  }
  function confirmEmployeeToggle(employee){const target=employee.status==='启用'?'停用':'启用';openModal(`确认${target}登记人`,`${target==='停用'?`<div class="danger-box">确认停用 ${escapeHtml(employee.name)}（${employee.phone}）？<br>停用后登记人不能登录，已登记车辆保持当前状态。</div>`:`<p>确认启用 ${escapeHtml(employee.name)}（${employee.phone}）？</p>`}`,`<button class="ghost" id="toggle-cancel">取消</button><button class="primary" id="toggle-confirm">确认${target}</button>`);$('#toggle-cancel').addEventListener('click',closeModal);$('#toggle-confirm').addEventListener('click',()=>{employee.status=target;closeModal();renderEmployees();toast(`登记人已${target}`);});}

  // ---- REQ-006 第 2.10 节 批量导入：模板下载、上传 .xlsx、逐行校验，全部通过才导入 ----
  const IMPORT_HEAD=['姓名','手机号','身份证号','类型代码','备注'],IMPORT_MAX=500;
  const CRC_TABLE=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
  function crc32(bytes){let c=0xFFFFFFFF;for(let i=0;i<bytes.length;i++)c=CRC_TABLE[(c^bytes[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
  function zipStore(files){
    const enc=new TextEncoder(),parts=[],central=[];let offset=0;
    files.forEach(([path,text])=>{const name=enc.encode(path),data=enc.encode(text),crc=crc32(data);
      const lh=new DataView(new ArrayBuffer(30));lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0x0800,true);lh.setUint16(12,0x21,true);lh.setUint32(14,crc,true);lh.setUint32(18,data.length,true);lh.setUint32(22,data.length,true);lh.setUint16(26,name.length,true);
      parts.push(new Uint8Array(lh.buffer),name,data);
      const ch=new DataView(new ArrayBuffer(46));ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(8,0x0800,true);ch.setUint16(14,0x21,true);ch.setUint32(16,crc,true);ch.setUint32(20,data.length,true);ch.setUint32(24,data.length,true);ch.setUint16(28,name.length,true);ch.setUint32(42,offset,true);
      central.push(new Uint8Array(ch.buffer),name);offset+=30+name.length+data.length;});
    const size=central.reduce((s,p)=>s+p.length,0),end=new DataView(new ArrayBuffer(22));end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,size,true);end.setUint32(16,offset,true);
    return new Blob([...parts,...central,new Uint8Array(end.buffer)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  function xmlEsc(s){return String(s).replace(/[&<>"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function buildXlsx(rows){
    const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main',col=(i)=>String.fromCharCode(65+i);
    const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS}"><cols>${[12,16,22,10,30].map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" style="1" customWidth="1"/>`).join('')}</cols><sheetData>${rows.map((r,ri)=>`<row r="${ri+1}">${r.map((v,ci)=>`<c r="${col(ci)}${ri+1}" t="inlineStr" s="${ri?1:2}"><is><t>${xmlEsc(v)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;
    return zipStore([
      ['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
      ['_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="登记人" sheetId="1" r:id="rId1"/></sheets></workbook>`],
      ['xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
      ['xl/styles.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${NS}"><fonts count="2"><font><sz val="11"/><name val="宋体"/></font><font><b/><sz val="11"/><name val="宋体"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="49" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="常规" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
      ['xl/worksheets/sheet1.xml',sheet]
    ]);
  }
  function templateBlob(){const body='33010619900101123';return buildXlsx([IMPORT_HEAD,['示例：王小明','13912345678',body+idCheckChar(body),'A','此行为填写示例，导入时自动跳过']]);}
  function downloadTemplate(){const url=URL.createObjectURL(templateBlob()),a=document.createElement('a');a.href=url;a.download='登记人导入模板.xlsx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  // 读取 .xlsx：解 zip（存储或 deflate），取第一张表的单元格文字
  async function readXlsx(file){
    const buf=new Uint8Array(await file.arrayBuffer()),dv=new DataView(buf.buffer),dec=new TextDecoder();
    let eocd=-1;for(let i=buf.length-22;i>=Math.max(0,buf.length-66000);i--){if(dv.getUint32(i,true)===0x06054b50){eocd=i;break;}}
    if(eocd<0)throw new Error('not zip');
    const count=dv.getUint16(eocd+10,true),entries={};let p=dv.getUint32(eocd+16,true);
    for(let k=0;k<count;k++){if(dv.getUint32(p,true)!==0x02014b50)throw new Error('bad zip');const method=dv.getUint16(p+10,true),csize=dv.getUint32(p+20,true),nlen=dv.getUint16(p+28,true),xlen=dv.getUint16(p+30,true),clen=dv.getUint16(p+32,true),loc=dv.getUint32(p+42,true);entries[dec.decode(buf.subarray(p+46,p+46+nlen))]={method,csize,loc};p+=46+nlen+xlen+clen;}
    async function text(name){const e=entries[name];if(!e)return null;const start=e.loc+30+dv.getUint16(e.loc+26,true)+dv.getUint16(e.loc+28,true),raw=buf.subarray(start,start+e.csize);if(e.method===0)return dec.decode(raw);if(e.method!==8)throw new Error('method');return dec.decode(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());}
    const sheetName=Object.keys(entries).filter((n)=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
    if(!sheetName)throw new Error('no sheet');
    const parse=(s)=>new DOMParser().parseFromString(s,'application/xml'),tags=(node,name)=>[...node.getElementsByTagNameNS('*',name)];
    const ssText=await text('xl/sharedStrings.xml'),shared=ssText?tags(parse(ssText),'si').map((si)=>tags(si,'t').map((t)=>t.textContent).join('')):[];
    const rows=[];
    tags(parse(await text(sheetName)),'row').forEach((row)=>{const r=Number(row.getAttribute('r'));const cells=[];tags(row,'c').forEach((c)=>{const ref=c.getAttribute('r')||'',ci=ref.replace(/\d+/g,'').split('').reduce((s,ch)=>s*26+ch.charCodeAt(0)-64,0)-1,t=c.getAttribute('t'),v=tags(c,'v')[0];let val='';if(t==='s')val=shared[Number(v?.textContent)]||'';else if(t==='inlineStr')val=tags(c,'t').map((x)=>x.textContent).join('');else val=v?v.textContent:'';if(ci>=0)cells[ci]=val;});rows.push({r,cells});});
    return rows;
  }
  function validateImport(rows){
    const head=(rows.find((x)=>x.r===1)||{cells:[]}).cells.map((v)=>String(v||'').trim());
    if(IMPORT_HEAD.some((h,i)=>head[i]!==h))return {format:true};
    const data=rows.filter((x)=>x.r>1).map((x)=>({r:x.r,v:IMPORT_HEAD.map((_,i)=>String(x.cells[i]??'').trim())})).filter((x)=>x.v.some(Boolean)&&!x.v[0].startsWith('示例'));
    if(data.length>IMPORT_MAX)return {tooMany:true};
    const errors=[],seenPhone={},seenId={};
    data.forEach(({r,v})=>{const [name,phone,id,codeRaw,note]=v,code=codeRaw.toUpperCase(),idc=id.toUpperCase(),msg=[];
      if(!name)msg.push('请填写姓名');else if(Array.from(name).length>50)msg.push('姓名不能超过50字');
      if(!/^1[3-9]\d{9}$/.test(phone))msg.push('请输入正确的11位手机号');
      else if(phone==='13800009999')msg.push('该手机号已属于其他账号，不能新增为登记人');
      else if(employees.some((e)=>e.phone===phone))msg.push('该手机号已关联登记人');
      else if(seenPhone[phone])msg.push(`手机号与第 ${seenPhone[phone]} 行重复`);
      if(!validIdCard(idc))msg.push('请输入正确的18位身份证号');
      else if(employees.some((e)=>e.idCard.toUpperCase()===idc))msg.push('该身份证号已关联登记人');
      else if(seenId[idc])msg.push(`身份证号与第 ${seenId[idc]} 行重复`);
      if(!code)msg.push('请填写类型代码');else if(!typeByCode(code))msg.push(`类型代码「${code}」不存在`);
      if(Array.from(note).length>500)msg.push('备注不能超过500字');
      if(/^1[3-9]\d{9}$/.test(phone)&&!seenPhone[phone])seenPhone[phone]=r;if(validIdCard(idc)&&!seenId[idc])seenId[idc]=r;
      if(msg.length)errors.push({row:r,message:msg.join('；')});});
    return {data,errors};
  }
  function showImport(){
    openModal('批量导入登记人',`<div class="import-box"><div class="import-step"><b>1</b><div><strong>下载模板</strong><p>按表头填写：姓名、手机号、身份证号、类型代码、备注。第二行为填写示例，导入时自动跳过；类型代码填类型维护里的字母。</p><button type="button" class="ghost" id="import-template">下载模板</button></div></div><div class="import-step"><b>2</b><div><strong>上传文件</strong><p>只支持 .xlsx，单次最多 ${IMPORT_MAX} 人。全部校验通过才导入，导入的登记人默认启用；有任何一行不通过，一条都不导入。</p><label class="ghost import-pick">选择文件<input type="file" id="import-file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden></label><span id="import-file-name" class="field-help">未选择文件</span></div></div><div id="import-result" aria-live="polite"></div></div>`,`<button class="ghost" id="import-close">关闭</button>`);
    $('#import-close').addEventListener('click',closeModal);
    $('#import-template').addEventListener('click',downloadTemplate);
    $('#import-file').addEventListener('change',async (event)=>{
      const file=event.target.files[0],box=$('#import-result');if(!file)return;
      $('#import-file-name').textContent=file.name;event.target.value='';
      const fail=(text)=>{box.innerHTML=`<div class="import-result bad"><strong>${escapeHtml(text)}</strong></div>`;};
      if(!/\.xlsx$/i.test(file.name))return fail('请上传模板格式的 .xlsx 文件');
      box.innerHTML='<div class="import-result">正在校验…</div>';
      let result;try{result=validateImport(await readXlsx(file));}catch(error){return fail('请上传模板格式的 .xlsx 文件');}
      if(result.format)return fail('请上传模板格式的 .xlsx 文件');
      if(result.tooMany)return fail(`单次最多导入 ${IMPORT_MAX} 人，请分批导入`);
      if(!result.data.length)return fail('文件中没有可导入的登记人，请按模板填写后重新上传');
      if(result.errors.length){box.innerHTML=`<div class="import-result bad"><strong>校验未通过，共 ${result.errors.length} 行有误，本次未导入任何登记人</strong><p>请修改文件后重新上传。</p><ul>${result.errors.map((e)=>`<li>第 ${e.row} 行：${escapeHtml(e.message)}</li>`).join('')}</ul></div>`;return;}
      const now=Date.now();
      result.data.slice().reverse().forEach(({v},i)=>employees.unshift({id:`employee-${now}-${i}`,name:v[0],phone:v[1],idCard:v[2].toUpperCase(),typeCode:v[3].toUpperCase(),status:'启用',note:v[4],createdAt:now+i}));
      closeModal();state.employeePage=1;renderEmployees();renderStores();toast(`成功导入 ${result.data.length} 人`);
    });
  }

  function showContactSetting(){
    const available=contacts.filter((item)=>item.active&&item.wecom);
    const current=logic.resolveSavedContact(state.currentContactSnapshot,available);
    const departedOption=current?.departed?`<option value="" selected disabled>${current.name} · ${current.phone} · 已离职</option>`:'';
    openModal('4S车源联系人设置',`<p>此设置统一用于全部4S车源，更换后历史车辆和新登记车辆均使用最新联系人。</p><div class="source-mark">候选沿用现有“运营老师”名单：/mall/shops/serveUserList，使用已填写企业微信标识的总部ToM人员。</div><form id="contact-form" class="form-grid" style="margin-top:14px"><label class="form-field full">总部联系人<select name="contact"><option value="">请选择总部联系人</option>${departedOption}${available.map((item)=>`<option value="${item.id}" ${item.id===state.currentContactId?'selected':''}>${item.name} · ${item.phone}</option>`).join('')}</select><span class="field-help">原联系人离职后，未主动更换前继续显示已保存的姓名和电话，页面不报错。</span></label><label class="form-field full">联系电话<input id="contact-phone" readonly class="read-only" value="${current?.phone||'请先选择联系人'}"></label></form>`,`<button class="ghost" id="contact-cancel">取消</button><button class="primary" id="contact-save">保存</button>`);
    const select=$('[name="contact"]');
    select.addEventListener('change',()=>{$('#contact-phone').value=available.find((item)=>item.id===select.value)?.phone||current?.phone||'请先选择联系人';});
    $('#contact-cancel').addEventListener('click',closeModal);
    $('#contact-save').addEventListener('click',()=>{if(!select.value){toast('请选择新的总部联系人');return;}const chosen=available.find((item)=>item.id===select.value);state.currentContactId=chosen.id;state.currentContactSnapshot={id:chosen.id,name:chosen.name,phone:chosen.phone};closeModal();renderEmployees();toast('车源联系人已更新');});
  }

  function registerWebMcp(){const context=document.modelContext;if(!context?.registerTool)return;try{context.registerTool({name:'read_requirement_decisions',title:'读取需求决策结果',description:'读取本地原型中24项原问题的最终处理结果。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(){return decisionResults.map(([id,result])=>({id,result}));}});context.registerTool({name:'navigate_prototype_view',title:'打开原型功能',description:'在当前本地原型中打开核验总览、库存车、4S店、员工维护或REQ-002首页改造视图。',inputSchema:{type:'object',properties:{view:{type:'string',enum:['overview','inventory','stores','employees','home002','notice','contact','stock']}},required:['view'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute({view}){const safeView=logic.normalizeView(view);showView(safeView);return{view:safeView};}});}catch(error){console.info('WebMCP not registered',error);}}

  $$('.nav-item').forEach((button)=>button.addEventListener('click',()=>showView(button.dataset.view)));
  // 2026-10-29 PC 商铺管理：一级代理商商铺编辑页节选，开关点击切换；「是否可登记车源」默认关闭
  const setSw=(button,on)=>{ button.classList.toggle('on',on); button.setAttribute('aria-checked',String(on)); };
  $$('#view-shop .sw').forEach((button)=>{ button.dataset.saved=String(button.classList.contains('on')); button.addEventListener('click',()=>setSw(button,!button.classList.contains('on'))); });
  // 确定：记住当前开关；取消：回到上次保存的状态
  if($('#shop-save'))$('#shop-save').addEventListener('click',()=>{ $$('#view-shop .sw').forEach((b)=>{ b.dataset.saved=String(b.classList.contains('on')); }); toast('保存成功'); });
  if($('#shop-cancel'))$('#shop-cancel').addEventListener('click',()=>$$('#view-shop .sw').forEach((b)=>setSw(b,b.dataset.saved==='true')));
  $$('[data-go]').forEach((button)=>button.addEventListener('click',()=>showView(button.dataset.go)));
  window.addEventListener('hashchange',()=>{const view=window.location.hash.slice(1); if(view) showView(view,false);});
  // ---- 查询区（R2-07／R2-08）----
  // 品牌→车系→车型合为一个入口，逐级钻取；类型、审核状态、上下架各为一个下拉。
  // 依据用户 2026-09-13：「不存在车系独立车型存在的」「你不需要分开 3 个字段」「这是手机屏幕，很小，不要占位太大」。
  const APPROVE_OPTIONS=[{label:'全部',value:''},{label:'等待审核',value:'等待审核'},{label:'通过',value:'通过'},{label:'驳回',value:'驳回'}];
  const SHELF_OPTIONS=[{label:'全部',value:''},{label:'在售',value:'在售'},{label:'已下架',value:'已下架'}];

  function ownVehicles(){ return vehicles.filter((v)=>v.ownerId===state.ownerId); }
  function brandsOf(){ return [...new Set(ownVehicles().map((v)=>v.brand))]; }
  function modelsOf(b){ return [...new Set(ownVehicles().filter((v)=>v.brand===b).map((v)=>v.model))]; }
  function variantsOf(b,m){ return [...new Set(ownVehicles().filter((v)=>v.brand===b&&v.model===m).map((v)=>v.variant))]; }

  // 品牌车型两列面板：左列品牌，右列车系；选中车系后右列切到车型，面包屑可回退
  function openCarPicker(){
    const wrap=$('#m-picker'); wrap.hidden=false;
    let pb=state.q.brand, pm=state.q.model, pv=state.q.variant, level=pm?'variant':'model';
    const draw=()=>{
      // 车系挂在品牌下，未选品牌时右列不列车系（用户 2026-09-13 指出「不限品牌就可以选车型吗」）
      const brands=brandsOf();
      const rightList=pb?(level==='model'?modelsOf(pb):variantsOf(pb,pm)):[];
      const rightAny=level==='model'?'不限车系':'不限车型';
      wrap.innerHTML=`<div class="m-picker">
        <div class="m-picker-head"><button id="mp-clear">清空</button><span>品牌车型</span><button class="ok" id="mp-ok">确定</button></div>
        ${level==='variant'?`<div class="m-cascade-crumb"><button id="mp-back">‹ 返回车系</button>　已选：${escapeHtml(pb)} / ${escapeHtml(pm)}</div>`:''}
        <div class="m-cascade">
          <div class="m-cascade-col left"><button class="m-cascade-item any ${!pb?'on':''}" data-cb="">不限品牌</button>${brands.map((b)=>`<button class="m-cascade-item ${b===pb?'on':''}" data-cb="${escapeHtml(b)}">${escapeHtml(b)}</button>`).join('')}</div>
          <div class="m-cascade-col right">${!pb?'<div class="m-cascade-hint">当前为「不限品牌」。<br>车系、车型挂在品牌下，先在左边选一个品牌才能继续往下选。</div>':`<button class="m-cascade-item any ${((level==='model'&&!pm)||(level==='variant'&&!pv))?'on':''}" data-cr="">${rightAny}</button>${rightList.map((x)=>`<button class="m-cascade-item ${((level==='model'&&x===pm)||(level==='variant'&&x===pv))?'on':''}" data-cr="${escapeHtml(x)}">${escapeHtml(x)}</button>`).join('')}`}</div>
        </div></div>`;
      $$('[data-cb]').forEach((b)=>b.addEventListener('click',()=>{ pb=b.dataset.cb; pm=''; pv=''; level='model'; draw(); }));
      $$('[data-cr]').forEach((b)=>b.addEventListener('click',()=>{
        const val=b.dataset.cr;
        if(level==='model'){
          pm=val; pv='';
          if(val)level='variant';           // 选了具体车系才进车型这一级
        } else {
          pv=val;                            // 「不限车型」即 pv=''
        }
        draw();
      }));
      if($('#mp-back'))$('#mp-back').addEventListener('click',()=>{ level='model'; pv=''; draw(); });
      $('#mp-clear').addEventListener('click',()=>{ pb=''; pm=''; pv=''; level='model'; close(); apply('','',''); });
      $('#mp-ok').addEventListener('click',()=>{ close(); apply(pb,pm,pv); });
    };
    const close=()=>{ wrap.hidden=true; wrap.innerHTML=''; };
    const apply=(b,m,v)=>{ state.q.brand=b; state.q.model=m; state.q.variant=v; applyQuery(); };
    draw();
  }

  // CHG-D051：车辆类型查询条件已取消，原多选下拉去掉

  function openSinglePicker(title,options,current,onPick){
    const wrap=$('#m-picker'); wrap.hidden=false;
    let picked=current;
    wrap.innerHTML=`<div class="m-picker"><div class="m-picker-head"><button id="mp-cancel">取消</button><span>${escapeHtml(title)}</span><button class="ok" id="mp-ok">确定</button></div>
      <div class="m-picker-list">${options.map((o)=>`<button class="m-picker-item ${o.value===current?'on':''}" data-mp="${o.value}">${escapeHtml(o.label)}</button>`).join('')}</div></div>`;
    const close=()=>{ wrap.hidden=true; wrap.innerHTML=''; };
    $$('[data-mp]').forEach((b)=>b.addEventListener('click',()=>{ picked=b.dataset.mp; $$('[data-mp]').forEach((x)=>x.classList.remove('on')); b.classList.add('on'); }));
    $('#mp-cancel').addEventListener('click',close);
    $('#mp-ok').addEventListener('click',()=>{ close(); onPick(picked); });
  }

  function setBtn(id,label,active){
    const b=$(id); b.innerHTML=`${escapeHtml(label)}<i></i>`; b.classList.toggle('on',active);
  }
  // R2-10：筛选栏文字用短名（品牌／类型／审核／上下架），选中后显示所选值
  function syncQueryLabels(){
    const q=state.q;
    const carLabel=q.variant?q.variant:q.model?`${q.brand} ${q.model}`:q.brand?q.brand:'品牌';
    setBtn('#q-car',carLabel,Boolean(q.brand));
    setBtn('#q-approve',q.approve||'审核',Boolean(q.approve));
    setBtn('#q-shelf',q.shelf||'上下架',Boolean(q.shelf));
  }
  // R2-10：任一条件变化即从第 1 页重新加载，不用点查询
  function applyQuery(){ syncQueryLabels(); state.vehicleVisible=20; renderVehicles(); $('#vehicle-list').scrollTop=0; }
  $('#q-car').addEventListener('click',openCarPicker);
  $('#q-approve').addEventListener('click',()=>openSinglePicker('审核状态',APPROVE_OPTIONS,state.q.approve,(v)=>{state.q.approve=v;applyQuery();}));
  $('#q-shelf').addEventListener('click',()=>openSinglePicker('上下架',SHELF_OPTIONS,state.q.shelf,(v)=>{state.q.shelf=v;applyQuery();}));
  // ---- 驳回通知入口（R2-11 细则 2）----
  // 入口页「车源登记」→ 滚到右边的车源登记页（样稿内的示意跳转）
  const entryBtn=$('#entry-car-source');
  if(entryBtn) entryBtn.addEventListener('click',()=>{
    const stage=document.querySelector('#view-inventory .mobile-stage:not(.entry-stage)');
    if(stage){ stage.scrollIntoView({behavior:'smooth',block:'center'}); stage.classList.add('flash'); setTimeout(()=>stage.classList.remove('flash'),1200); }
  });
  // REQ-009 v1.3：4S 员工退出（确认后清空登录信息，回到「我的」）
  const logoutBtn=$('#inv-logout');
  if(logoutBtn) logoutBtn.addEventListener('click',()=>mDialog('确定退出登录？','','确定',()=>{
    $('#view-inventory').classList.remove('is-staff4s');
    if(window.__mobileNav) window.__mobileNav({view:'user'});
  }));
  $('#notify-entry').addEventListener('click',()=>{
    const list=rejectedVehicles(); state.notifyOpen=true; renderNotifyBadge();
    pushPage('驳回通知', list.length
      ? `<ul class="notify-list">${list.map((v)=>`<li data-notify="${v.id}"><div class="notify-time">${escapeHtml(v.rejectedAt)}</div><div class="notify-car">${escapeHtml(v.brand+' '+v.model+' '+v.variant)}</div><div class="notify-link">请查看详细信息 ›</div></li>`).join('')}</ul><p class="notify-tip">点任意一条，直接进入该车的修改页；完整审核意见显示在修改页顶部。</p>`
      : '<div class="empty-build"><h2>暂无驳回通知</h2><p>被驳回的车也可以在查询区选「驳回」直接筛出。</p></div>',
      '',
      ()=>{ $$('[data-notify]').forEach((li)=>li.addEventListener('click',()=>{
              const v=vehicles.find((x)=>x.id===li.dataset.notify); clearStack(); showVehicleForm({vehicle:v});
            })); });
  });
  $('#vehicle-list').addEventListener('scroll',(event)=>{const el=event.currentTarget;if(el.scrollTop+el.clientHeight>=el.scrollHeight-30){const total=filteredVehicles().length;if(state.vehicleVisible<total){state.vehicleVisible+=20;renderVehicles();}}});$('#add-vehicle').addEventListener('click',()=>{state.photos=[];state.preservedNote='';showBrandStep();});
  $('#query-store').addEventListener('click',()=>{state.storeQuery={code:$('#store-code-filter')?.value||'',name:$('#store-search').value.trim()};state.storePage=1;renderStores();});$('#reset-store').addEventListener('click',()=>{$('#store-search').value='';if($('#store-code-filter'))$('#store-code-filter').value='';state.storeQuery={code:'',name:''};state.storePage=1;renderStores();});$('#add-store').addEventListener('click',()=>showStoreForm());$('#store-page-size').addEventListener('change',(event)=>{state.storePageSize=Number(event.target.value);state.storePage=1;renderStores();});$('#store-prev').addEventListener('click',()=>{state.storePage--;renderStores();});$('#store-next').addEventListener('click',()=>{state.storePage++;renderStores();});
  $('#query-employee').addEventListener('click',()=>{const typeText=$('#employee-store-filter').value.trim();if(typeText&&!stores.some((item)=>typeLabel(item.code)===typeText)){toast('请选定类型或清空类型筛选');return;}state.employeeQuery={name:$('#employee-name').value.trim(),phone:$('#employee-phone').value.trim(),store:typeText,status:$('#employee-status').value};state.employeePage=1;renderEmployees();});$('#reset-employee').addEventListener('click',()=>{$('#employee-name').value='';$('#employee-phone').value='';$('#employee-store-filter').value='';$('#employee-status').value='';state.employeeQuery={name:'',phone:'',store:'',status:''};state.employeePage=1;renderEmployees();});$('#employee-prev').addEventListener('click',()=>{state.employeePage--;renderEmployees();});$('#employee-next').addEventListener('click',()=>{state.employeePage++;renderEmployees();});$('#add-employee').addEventListener('click',()=>showEmployeeForm());$('#contact-setting').addEventListener('click',showContactSetting);
  if($('#import-employee'))$('#import-employee').addEventListener('click',showImport);
  if($('#employee-sort'))$('#employee-sort').addEventListener('click',()=>{state.employeeSort=state.employeeSort===''?'desc':state.employeeSort==='desc'?'asc':'';state.employeePage=1;renderEmployees();});
  // 车源管理的车辆数据加载完成后刷新两页的「近 30 天上传车辆数」
  window.addEventListener('pc-stock-ready',()=>{renderStores();renderEmployees();});
  syncQueryLabels();renderDecisionResults();renderVehicles();renderStores();renderEmployees();registerWebMcp();
  if (window.location.hash) {
    showView(window.location.hash.slice(1), false);
  }
})();

/* 右侧说明「隐藏文字」开关：给所有 .side-info 自动注入，样稿共用 */
(function(){
  function inject(box){
    if(box.querySelector('.notes-toggle')) return;
    var b=document.createElement('button');
    b.type='button'; b.className='notes-toggle'; b.textContent='隐藏文字';
    b.addEventListener('click',function(){
      var on=box.classList.toggle('collapsed');
      b.textContent=on?'显示文字':'隐藏文字';
    });
    box.insertBefore(b,box.firstChild);
  }
  function run(){ document.querySelectorAll('.side-info').forEach(inject); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
})();
