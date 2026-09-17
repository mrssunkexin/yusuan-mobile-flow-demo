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

  // 车辆类型＝现有商品分类（R2-04），后台可配，此处为演示取值
  const VEHICLE_TYPES=['运损车','包牌包税','新能源','平行进口','库存尾款车'];
  // 标签＝与 PC 新车登记同一套商品标签（R2-12），此处为演示取值
  const VEHICLE_LABELS=['现车','可分期','支持置换','全国可上牌','一手车主'];

  const state = {
    ownerId:'demo-u1', vehicleVisible:20,
    q:{brand:'',model:'',variant:'',types:[],approve:'',shelf:''},
    notifyOpen:false,
    storeQuery:'', storePage:1, storePageSize:20,
    employeeQuery:{ name:'', phone:'', store:'', status:'' }, employeePage:1,
    currentContactId:'hq-1', currentContactSnapshot:{id:'hq-1',name:'总部人员A',phone:'13900000001'}, selectedVehicle:null, photos:[], preservedNote:''
  };

  // R2-10：左侧放真实车辆照片（登记时上传的第一张）。演示用样稿现有纯车图，轮换取用
  // 只用列表页那组（原图约 1.7~1.86:1），按 4:3 框裁切后两侧各切 11~14%，车身完整。
  // 首页轮播那组 car-a~e 更宽（超过 2:1），塞进 4:3 框要切掉四成，认不出车，不用。
  const STORE_NAMES=['杭州滨江4S店','宁波鄞州4S店','温州龙湾4S店','绍兴柯桥4S店','嘉兴南湖4S店','金华婺城4S店','台州椒江4S店','湖州吴兴4S店','丽水莲都4S店','衢州柯城4S店'];
  const STAFF_NAMES=['李明','王海涛','张文静','陈思远','刘佳','周锦程','吴雅琴','郑浩然','孙立群','黄晓峰','徐志强','马丽华','高建国','林曼','朱天翔','何静怡','罗文博','梁秋萍','宋子豪','谢婉清'];
  const DEMO_CAR_PHOTOS=['assets/req-008/list-car-1.png','assets/req-008/list-car-2.png','assets/req-008/list-car-3.png','assets/req-008/list-car-4.png'];
  const vehicles = Array.from({ length:46 }, (_, index) => ({
    id:String(1789562340117000000 + index * 137), ownerId:index===45?'another-owner':'demo-u1',
    brand:index%3===0?'奥迪':index%3===1?'宝马':'奔驰', model:index%3===0?'A6L':index%3===1?'X3':'GLC',
    variant:index%2===0?'2026款 长名称 45 TFSI quattro 尊享动感型':'2026款 标准版',
    note:index%4===0?'车况良好，无重大事故，可安排到店验车。':'',
    // R2-10：不通过、未审核各一条，其余通过（排序会把不通过排最前，见 REQ-001 第 2.2 节）
    approve:index===0?'不通过':index===1?'未审核':'通过',
    rejectReason:index===0?'照片不清晰，请补拍车身正面与内饰':'',
    rejectedAt:index===0?'2026-09-15 09:20':'',
    status:index<2?'已下架':index<39?'在售':'已下架',
    types:index%3===0?['运损车']:index%3===1?['包牌包税']:['新能源','包牌包税'],
    labels:index%2?['现车','可分期']:['支持置换'],
    recommend:index%7===0, detailBlocks:index%5===0?[{type:'text',value:'车况良好，无重大事故，可安排到店验车。'}]:[],
    // 同一个登记人只会有一种车源类型：demo-u1 是一级代理商，全部为「库存车」（REQ-001 第 1.2、1.5 节）
    sourceType:'库存车', coverUrl:DEMO_CAR_PHOTOS[index%DEMO_CAR_PHOTOS.length], referencePrice:index%5===0?null:300000+index*1000,
    salePrice:280000+index*800, exterior:index%2?'曜石黑':'冰川白', interior:index%2?'黑色':'棕色',
    ownerName:'周强', storeName:'华东代理门店',
    address:'上海市浦东新区张杨路1188号',
    createdAt:`2026-09-${String(8-Math.floor(index/7)).padStart(2,'0')} 10:00`, updatedAt:'2026-09-08 18:30',
    unlistedAt:index>=39?'2026-09-08 19:00':'', photos:[]
  }));

  const stores = Array.from({ length:23 }, (_, index) => ({
    id:`store-${index+1}`,
    name:index===0?'杭州滨江汽车销售服务有限公司旗舰交付中心':STORE_NAMES[index%STORE_NAMES.length],
    region:index===0?'浙江省 杭州市 滨江区':index%2?'浙江省 杭州市 滨江区':'上海市 上海市 浦东新区',
    address:index===0?'滨江区江南大道588号A座一层至三层（含展厅、维修车间与交车区，地址较长用于检验表格换行与全文展示）':`解放路${100+index}号`,
    createdAt:23-index
  }));

  const employees = Array.from({ length:22 }, (_, index) => ({
    id:`employee-${index+1}`, name:index===0?'欧阳明轩':STAFF_NAMES[index%STAFF_NAMES.length],
    phone:`1380000${String(1000+index).slice(-4)}`, idCard:`00000019900101${String(1000+index).slice(-4)}`,
    storeId:stores[index%stores.length].id, status:index%5===0?'停用':'启用', note:index%3===0?'负责展厅接待与车源登记，工作日在岗。':'', createdAt:22-index
  }));

  const contacts = [
    { id:'hq-1', name:'总部人员A', phone:'13900000001', wecom:true, active:false },
    { id:'hq-2', name:'总部人员B', phone:'13900000002', wecom:true, active:true }
  ];
  const catalog = {
    奥迪:{ A6L:[{name:'2026款 45 TFSI quattro 尊享动感型',price:459800,photos:['catalog:a6l-1','catalog:a6l-2']},{name:'2026款 40 TFSI 豪华型',price:429800,photos:['catalog:a6l-3']}], Q5L:[{name:'2026款 45 TFSI 尊享版',price:488800,photos:['catalog:q5l-1']}] },
    宝马:{ X3:[{name:'2026款 xDrive 30L 尊享型',price:449900,photos:['catalog:x3-1','catalog:x3-2']}], '5系':[{name:'2026款 530Li 领先型',price:489900,photos:['catalog:530li-1']}] },
    奔驰:{ GLC:[{name:'2026款 GLC 300 L 动感型',price:478800,photos:['catalog:glc-1']}], 'E级':[{name:'2026款 E 300 L 豪华型',price:529800,photos:['catalog:e300l-1']}] }
  };

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
      .filter((v)=>!state.q.types.length||state.q.types.some((t)=>(v.types||[]).includes(t)))
      // 审核状态与上下架是两个独立字段，各自筛（R2-11：两个维度互不合并）
      .filter((v)=>!state.q.approve||v.approve===state.q.approve)
      .filter((v)=>!state.q.shelf||v.status===state.q.shelf);
  }
  function vehicleCover(vehicle){
    if(vehicle.photos?.[0]?.startsWith('data:')) return `<img src="${vehicle.photos[0]}" alt="车辆照片">`;
    return vehicle.coverUrl?`<img src="${vehicle.coverUrl}" alt="车辆照片">`:'车辆照片<br>占位';
  }
  function statusChip(v){
    if(v.approve==='未审核')return '<span class="status-chip review">未审核</span>';
    if(v.approve==='不通过')return '<span class="status-chip reject">不通过</span>';
    return `<span class="status-chip ok">通过</span><span class="status-chip ${v.status==='在售'?'on':'off'}">${v.status}</span>`;
  }
  function rejectedVehicles(){ return vehicles.filter((v)=>v.ownerId===state.ownerId&&v.approve==='不通过'); }
  function renderNotifyBadge(){
    const unread=state.notifyOpen?0:rejectedVehicles().length;
    const badge=$('#notify-badge'); if(!badge)return;
    badge.textContent=unread; badge.hidden=unread===0;
  }
  function renderVehicles(){
    const all=filteredVehicles(),shown=all.slice(0,state.vehicleVisible);
    renderNotifyBadge();
    const hasQuery=state.q.brand||state.q.model||state.q.variant||state.q.types.length||state.q.approve||state.q.shelf;
    $('#vehicle-list').innerHTML=shown.length?shown.map((vehicle)=>{
      const st=statusChip(vehicle);
      const typeChips=(vehicle.types||[]).map((t)=>`<span class="type-chip">${escapeHtml(t)}</span>`).join('');
      const rej=vehicle.approve==='不通过'?`<div class="reject-line">驳回原因：${escapeHtml((vehicle.rejectReason||'').split('，')[0])}…</div>`:'';
      // R2-10：不设「查看」，点卡片主体即进详情；按钮与价格同一行靠右
      const acts=vehicle.approve==='通过'
        ? `<button data-vehicle-action="edit" data-id="${vehicle.id}">修改</button>${vehicle.status==='在售'?`<button data-vehicle-action="unlist" data-id="${vehicle.id}">下架</button>`:`<button data-vehicle-action="relist" data-id="${vehicle.id}">重新上架</button>`}`
        : `<button data-vehicle-action="edit" data-id="${vehicle.id}">修改</button>`;
      // R2-10：卡片只放 6 项——封面、车名、状态、车辆类型、价格、登记时间。不放备注、车源类型、内外颜色
      // R2-10：参考价放左列车图下方（右侧放不下三者并排，且图缩小后左下正好空着）
      const refPrice=`<div class="vehicle-ref">参考价 ${vehicle.referencePrice?`${vehicle.referencePrice.toLocaleString()}元`:'暂无'}</div>`;
      return `<article class="vehicle-card" data-id="${vehicle.id}"><div class="vehicle-side"><div class="vehicle-cover">${vehicleCover(vehicle)}</div>${refPrice}</div><div class="vehicle-body"><h3>${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)} ${escapeHtml(vehicle.variant)}</h3><div class="chip-row">${st}${vehicle.recommend?'<span class="type-chip rec">推荐</span>':''}${typeChips}</div>${rej}<div class="vehicle-time">${vehicle.createdAt}</div><div class="vehicle-foot"><strong class="vehicle-sale">${vehicle.salePrice.toLocaleString()}元</strong><div class="vehicle-actions">${acts}</div></div></div></article>`;
    }).join(''):`<div class="empty-build"><h2>${hasQuery?'未找到符合条件的车辆':'暂无车辆'}</h2><p>${hasQuery?'请调整查询条件。':'可使用增加车源创建一条记录。'}</p></div>`;
    $('#list-footer').textContent=shown.length<all.length?'向下滚动加载后续记录':'没有更多了';
    $$('[data-vehicle-action]').forEach((button)=>button.addEventListener('click',(event)=>{event.stopPropagation(); const vehicle=vehicles.find((item)=>item.id===button.dataset.id); if(button.dataset.vehicleAction==='view')showVehicleDetail(vehicle); if(button.dataset.vehicleAction==='edit')showVehicleForm({vehicle}); if(button.dataset.vehicleAction==='unlist')confirmUnlist(vehicle); if(button.dataset.vehicleAction==='relist')confirmRelist(vehicle);}));
    // R2-10：去掉「查看」按钮后，点卡片主体进详情（REQ-001 第 2.2 节「点击主体查看详情」）。
    // 操作按钮已 stopPropagation，点按钮不会同时进详情。
    $$('#vehicle-list .vehicle-card').forEach((card)=>card.addEventListener('click',()=>{
      const vehicle=vehicles.find((item)=>item.id===card.dataset.id); if(vehicle)showVehicleDetail(vehicle);
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
  function showBrandStep(){
    pushPage('选择品牌',
      `<div class="m-card" style="padding:0">${Object.keys(catalog).map((brand)=>`<button class="m-choice" data-brand="${brand}"><span><strong>${brand}</strong><br><small>常规／新能源目录</small></span><span class="m-arrow">›</span></button>`).join('')}</div>`,
      `<button class="ghost" id="manual-vehicle">找不到？手动登记</button>`,
      ()=>{ $$('[data-brand]').forEach((b)=>b.addEventListener('click',()=>showModelStep(b.dataset.brand)));
            $('#manual-vehicle').addEventListener('click',()=>showVehicleForm({manual:true})); });
  }
  function showModelStep(brand){
    pushPage(brand,
      `<div class="m-card" style="padding:0">${Object.keys(catalog[brand]).map((model)=>`<button class="m-choice" data-model="${escapeHtml(model)}"><span><strong>${escapeHtml(model)}</strong><br><small>${catalog[brand][model].length}个型号</small></span><span class="m-arrow">›</span></button>`).join('')}</div>`,
      '',
      ()=>{ $$('[data-model]').forEach((b)=>b.addEventListener('click',()=>showVariantStep(brand,b.dataset.model))); });
  }
  function showVariantStep(brand,model){
    pushPage(`${brand} ${model}`,
      `<div class="m-card" style="padding:0">${catalog[brand][model].map((variant,index)=>`<button class="m-choice" data-variant-index="${index}"><span><strong>${escapeHtml(variant.name)}</strong><br><small>指导价 ${variant.price.toLocaleString()}元</small></span><span class="m-arrow">›</span></button>`).join('')}</div>`,
      '',
      ()=>{ $$('[data-variant-index]').forEach((b)=>b.addEventListener('click',()=>showVehicleForm({selection:{brand,model,variant:catalog[brand][model][Number(b.dataset.variantIndex)]}}))); });
  }

  function currentRole(){ return '一级代理商'; }
  function showVehicleForm({selection=null,manual=false,vehicle=null}){
    const role=currentRole(), sourceType=logic.sourceTypeForRole(role), isManual=manual||Boolean(vehicle&&vehicle.manual);
    const brand=vehicle?.brand||selection?.brand||'',model=vehicle?.model||selection?.model||'',variantName=vehicle?.variant||selection?.variant?.name||'';
    const reference=vehicle?.referencePrice??selection?.variant?.price??'',sale=vehicle?.salePrice??selection?.variant?.price??'';
    if(vehicle)state.photos=vehicle.photos?.length?vehicle.photos.slice():['demo-existing'];
    else if(selection)state.photos=logic.mergeVehiclePhotos(state.photos,selection.variant.photos||[]);
    const storeName=role==='4S店员工'?'杭州滨江4S店':'华东代理商';
    const organizationLabel=role==='4S店员工'?'所属4S店':'代理商／经营主体';
    const address=role==='4S店员工'?'浙江省杭州市滨江区江南大道588号':'上海市浦东新区张杨路1188号';
    const rejectBox=vehicle&&vehicle.approve==='不通过'
      ? `<div class="reject-box"><strong>该车已被驳回</strong><div class="reject-time">驳回时间：${escapeHtml(vehicle.rejectedAt||'')}</div><p>${escapeHtml(vehicle.rejectReason||'')}</p><small>修改后提交，将重新进入未审核。</small></div>` : '';
    pushPage(vehicle?'修改车源':isManual?'手动登记车源':'车源登记',`
      ${rejectBox}
      <form id="vehicle-form" class="form-grid" style="margin-top:14px">
        <label class="form-field">品牌<input name="brand" value="${escapeHtml(brand)}" ${isManual?'':'readonly class="read-only"'} maxlength="50" required></label>
        <label class="form-field">车型<input name="model" value="${escapeHtml(model)}" ${isManual?'':'readonly class="read-only"'} maxlength="100" required></label>
        <label class="form-field full">型号<input name="variant" value="${escapeHtml(variantName)}" ${isManual?'':'readonly class="read-only"'} maxlength="150" required></label>
        <label class="form-field">参考价（元）<input name="reference" type="number" step="0.01" min="0.01" value="${reference}" ${isManual?'':'readonly class="read-only"'}></label>
        <label class="form-field">实际售价（元）<input name="sale" type="number" step="0.01" min="0.01" value="${sale}" required></label>
        <div class="form-field full"><span>外观颜色（必填）</span><div class="color-options" data-color-group="exterior">${['冰川白','曜石黑','星河灰'].map((color)=>`<button type="button" class="color-choice ${vehicle?.exterior===color?'selected':''}" data-color="${color}">${color}</button>`).join('')}</div></div>
        <div class="form-field full"><span>内饰颜色（必填）</span><div class="color-options" data-color-group="interior">${['黑色','棕色','米色'].map((color)=>`<button type="button" class="color-choice ${vehicle?.interior===color?'selected':''}" data-color="${color}">${color}</button>`).join('')}</div></div>
        <div class="form-field full"><span>车辆照片（必填）与视频</span><div class="photo-area"><input id="vehicle-photos" type="file" accept="image/jpeg,image/png,video/*" multiple><div class="field-help">照片最多 9 张，单张不超过 10MB；可上传 1 个视频。</div><div id="photo-thumbs" class="photo-thumbs"></div></div></div>
        <div class="form-field full"><span>车辆类型（必填，可多选）</span><div class="chip-select" data-chip-group="types">${VEHICLE_TYPES.map((t)=>`<button type="button" class="chip-choice ${(vehicle?.types||[]).includes(t)?'selected':''}" data-val="${t}">${t}</button>`).join('')}</div></div>
        <div class="form-field full"><span>标签（可多选）</span><div class="chip-select" data-chip-group="labels">${VEHICLE_LABELS.map((t)=>`<button type="button" class="chip-choice ${(vehicle?.labels||[]).includes(t)?'selected':''}" data-val="${t}">${t}</button>`).join('')}</div></div>
        <label class="form-field full">备注<textarea name="note" maxlength="500" placeholder="请输入车辆备注">${escapeHtml(vehicle?.note??state.preservedNote??'')}</textarea><span class="field-help">最多500字。</span></label>
        <div class="form-field full"><span>车辆详情（选填）</span><div id="detail-blocks" class="detail-blocks"></div><div class="detail-tools"><button type="button" class="ghost" id="add-detail-text">＋ 添加文字段落</button><button type="button" class="ghost" id="add-detail-image">＋ 添加图片</button></div></div>
        <label class="form-field full recommend-field"><span>推荐</span><input type="checkbox" name="recommend" ${vehicle?.recommend?'checked':''}></label>
        <label class="form-field">登记人<input readonly class="read-only" value="${role==='4S店员工'?'员工·李明':'代理商·周强'}"></label>
        <label class="form-field">${organizationLabel}<input readonly class="read-only" value="${escapeHtml(storeName)}"></label>
        <label class="form-field full">登记地址<textarea readonly class="read-only">${escapeHtml(address)}</textarea></label>
        <label class="form-field">车源类型<input readonly class="read-only" value="${sourceType||'无登记资格'}"></label>
        <label class="form-field">审核状态<input readonly class="read-only" value="${vehicle?escapeHtml(vehicle.approve):'提交后进入未审核'}"></label>
        <input type="hidden" name="exterior" value="${escapeHtml(vehicle?.exterior||'')}"><input type="hidden" name="interior" value="${escapeHtml(vehicle?.interior||'')}">
        <div id="vehicle-error" class="field-error form-field full"></div>
      </form>`,
      `<button class="ghost" id="cancel-vehicle-form">取消</button>${!isManual&&!vehicle?'<button class="ghost" id="reselect-vehicle">重选型号</button>':''}<button class="primary" id="save-vehicle">${vehicle?'保存修改':'保存登记'}</button>`,
      ()=>bindVehicleForm());
    function bindVehicleForm(){
    const renderPhotos=()=>{ $('#photo-thumbs').innerHTML=state.photos.map((src,index)=>src==='demo-existing'?'<div class="vehicle-cover photo-thumb">已有照片</div>':src.startsWith('catalog:')?`<div class="vehicle-cover photo-thumb">车型来源图<br>${index+1}</div>`:`<img class="photo-thumb" src="${src}" alt="本地预览${index+1}">`).join(''); };
    renderPhotos();
    state.formTypes=(vehicle?.types||[]).slice(); state.formLabels=(vehicle?.labels||[]).slice();
    state.formDetail=(vehicle?.detailBlocks||[]).slice();
    const renderDetail=()=>{
      const n=state.formDetail.length;
      const tools=(i)=>`<div class="detail-tool-col">
        <button type="button" class="detail-mini" data-detail-up="${i}" ${i===0?'disabled':''} aria-label="上移">↑</button>
        <button type="button" class="detail-mini" data-detail-down="${i}" ${i===n-1?'disabled':''} aria-label="下移">↓</button>
        <button type="button" class="detail-mini del" data-detail-remove="${i}" aria-label="移除">移除</button>
      </div>`;
      $('#detail-blocks').innerHTML=n?state.formDetail.map((b,i)=>b.type==='text'
        ? `<div class="detail-block"><textarea data-detail-index="${i}" maxlength="500" placeholder="请输入这一段文字">${escapeHtml(b.value)}</textarea>${tools(i)}</div>`
        : `<div class="detail-block"><div class="detail-image">图片段落</div>${tools(i)}</div>`).join('')
        :'<div class="detail-empty">还没有内容，可添加文字段落或图片。</div>';
      $$('[data-detail-remove]').forEach((b)=>b.addEventListener('click',()=>{state.formDetail.splice(Number(b.dataset.detailRemove),1);renderDetail();}));
      $$('[data-detail-up]').forEach((b)=>b.addEventListener('click',()=>{
        const i=Number(b.dataset.detailUp); if(i<=0)return;
        const arr=state.formDetail; [arr[i-1],arr[i]]=[arr[i],arr[i-1]]; renderDetail();
      }));
      $$('[data-detail-down]').forEach((b)=>b.addEventListener('click',()=>{
        const i=Number(b.dataset.detailDown); const arr=state.formDetail; if(i>=arr.length-1)return;
        [arr[i+1],arr[i]]=[arr[i],arr[i+1]]; renderDetail();
      }));
      $$('[data-detail-index]').forEach((t)=>t.addEventListener('input',()=>{state.formDetail[Number(t.dataset.detailIndex)].value=t.value;}));
    };
    renderDetail();
    $('#add-detail-text').addEventListener('click',()=>{state.formDetail.push({type:'text',value:''});renderDetail();});
    $('#add-detail-image').addEventListener('click',()=>{state.formDetail.push({type:'image',value:'demo'});renderDetail();});
    $$('.chip-choice').forEach((button)=>button.addEventListener('click',()=>{
      const group=button.closest('[data-chip-group]').dataset.chipGroup;
      const bag=group==='types'?state.formTypes:state.formLabels;
      const val=button.dataset.val, at=bag.indexOf(val);
      if(at>-1){bag.splice(at,1);button.classList.remove('selected');}else{bag.push(val);button.classList.add('selected');}
    }));
    $$('.color-choice').forEach((button)=>button.addEventListener('click',()=>{ const group=button.closest('[data-color-group]'); $$('.color-choice',group).forEach((item)=>item.classList.remove('selected')); button.classList.add('selected'); $(`[name="${group.dataset.colorGroup}"]`).value=button.dataset.color; }));
    $('#vehicle-photos').addEventListener('change',(event)=>{ const files=[...event.target.files].slice(0,Math.max(0,9-state.photos.length)); files.forEach((file)=>{ if(file.size>10*1024*1024){toast('单张图片不能超过10MB');return;} const reader=new FileReader();reader.onload=()=>{state.photos.push(reader.result);renderPhotos();};reader.readAsDataURL(file); }); });
    if(isManual){ const referenceInput=$('[name="reference"]'),saleInput=$('[name="sale"]'); let saleTouched=Boolean(sale); saleInput.addEventListener('input',()=>saleTouched=true); referenceInput.addEventListener('input',()=>{if(!saleTouched)saleInput.value=referenceInput.value;}); }
    $('#cancel-vehicle-form').addEventListener('click',clearStack);
    if($('#reselect-vehicle'))$('#reselect-vehicle').addEventListener('click',()=>{
      const note=$('[name="note"]').value;
      mDialog('重新选择型号','重选后将更新参考价、实际售价和颜色；已有图片和备注保留。','继续选择',()=>{state.preservedNote=note;clearStack();showBrandStep();});
    });
    $('#save-vehicle').addEventListener('click',()=>saveVehicleForm(vehicle,{role,sourceType,storeName,address,isManual}));
    }
  }

  function saveVehicleForm(vehicle,meta){
    const form=$('#vehicle-form'), data=new FormData(form), error=$('#vehicle-error'); error.textContent='';
    if(!form.reportValidity())return;
    if(!data.get('exterior')||!data.get('interior')){error.textContent='请选择外观颜色和内饰颜色';return;}
    if(!state.photos.length){error.textContent='请至少上传1张车辆照片';return;}
    if(!state.formTypes.length){error.textContent='请至少选择一个车辆类型';return;}
    const decision=logic.registrationDecision({role:meta.role,contactId:state.currentContactId});
    if(!decision.allowed){error.textContent=decision.reason;return;}
    const next={brand:data.get('brand').trim(),model:data.get('model').trim(),variant:data.get('variant').trim(),
      referencePrice:data.get('reference')?Number(data.get('reference')):null,salePrice:Number(data.get('sale')),
      exterior:data.get('exterior'),interior:data.get('interior'),note:data.get('note').trim(),
      types:state.formTypes.slice(),labels:state.formLabels.slice(),
      detailBlocks:state.formDetail.slice(),recommend:Boolean(data.get('recommend')),
      photos:state.photos.filter((item)=>item!=='demo-existing')};
    if(vehicle){
      // R2-11：值比对判定是否重审，不以「点了保存」为依据
      const changed=Object.keys(next).some((k)=>JSON.stringify(next[k])!==JSON.stringify(vehicle[k]));
      Object.assign(vehicle,next,{updatedAt:'2026-09-13 20:30'});
      if(changed){ Object.assign(vehicle,{approve:'未审核',status:'已下架',rejectReason:'',rejectedAt:''});
        mToast('信息已修改，重新进入未审核'); }
      else mToast('未作任何修改，审核状态不变');
    } else {
      vehicles.unshift({id:String(1789562340117000000 + vehicles.length * 137),ownerId:state.ownerId,...next,
        approve:'未审核',rejectReason:'',rejectedAt:'',status:'已下架',sourceType:meta.sourceType,
        ownerName:meta.role==='4S店员工'?'员工·李明':'代理商·周强',storeName:meta.storeName,address:meta.address,
        createdAt:'2026-09-13 20:30',updatedAt:'2026-09-13 20:30',unlistedAt:'',manual:meta.isManual});
      mToast('已提交，等未审核');
    }
    clearStack(); state.vehicleVisible=20; renderVehicles();
  }

  function showVehicleDetail(vehicle){
    const organizationLabel=vehicle.sourceType==='一手车源'?'所属4S店':'代理商／经营主体';
    const rows=[['审核状态',vehicle.approve],...(vehicle.approve==='不通过'?[['驳回时间',vehicle.rejectedAt],['驳回原因',vehicle.rejectReason]]:[]),...(vehicle.approve==='通过'?[['上下架',vehicle.status]]:[]),['车源类型',vehicle.sourceType],['车辆主键 ID',vehicle.id],['车辆类型',(vehicle.types||[]).join('、')||'未选'],['标签',(vehicle.labels||[]).join('、')||'无'],['推荐',vehicle.recommend?'开':'关'],['品牌／车型／型号',`${vehicle.brand} ${vehicle.model} ${vehicle.variant}`],['参考价',vehicle.referencePrice?`${vehicle.referencePrice.toLocaleString()}元`:'暂无参考价'],['实际售价',`${vehicle.salePrice.toLocaleString()}元`],['外观／内饰颜色',`${vehicle.exterior}／${vehicle.interior}`],['备注',vehicle.note||'暂无备注'],['车辆详情',(vehicle.detailBlocks||[]).length?`${vehicle.detailBlocks.length} 个图文段落`:'未填写'],['登记人',vehicle.ownerName],[organizationLabel,vehicle.storeName],['登记地址',vehicle.address],['首次登记时间',vehicle.createdAt],['最后修改时间',vehicle.updatedAt],...(vehicle.unlistedAt?[['下架时间',vehicle.unlistedAt]]:[]),...(vehicle.relistedAt?[['最后上架时间',vehicle.relistedAt]]:[])];
    pushPage('车辆详情',
      `<div class="m-card"><dl class="detail-grid">${rows.map(([key,value])=>`<dt>${key}</dt><dd>${escapeHtml(value)}</dd>`).join('')}</dl></div>`,
      `<button class="primary" id="detail-edit">修改</button>${vehicle.approve!=='通过'?'':vehicle.status==='在售'?'<button class="ghost" id="detail-unlist">下架</button>':'<button class="ghost" id="detail-relist">重新上架</button>'}`,
      ()=>{ $('#detail-edit').addEventListener('click',()=>showVehicleForm({vehicle}));
            if($('#detail-unlist'))$('#detail-unlist').addEventListener('click',()=>confirmUnlist(vehicle));
            if($('#detail-relist'))$('#detail-relist').addEventListener('click',()=>confirmRelist(vehicle)); });
  }
  function confirmUnlist(vehicle){
    mDialog('确认下架该车辆？',`${escapeHtml(vehicle.brand+' '+vehicle.model+' '+vehicle.variant)}<br>${vehicle.id}<br>下架后将停止对外展示。`,'确认下架',()=>{
      Object.assign(vehicle,{status:'已下架',unlistedAt:'2026-09-13 20:35'}); clearStack(); renderVehicles(); mToast('车辆已下架');
    });
  }
  function confirmRelist(vehicle){
    mDialog('确认重新上架？','在原车辆记录上重新上架，原登记及下架历史保留。未改任何信息不重审。','确认上架',()=>{
      const updated=logic.relistVehicle([vehicle],vehicle.id,'2026-09-13 10:00')[0];
      Object.assign(vehicle,updated); clearStack(); renderVehicles(); mToast('车辆已重新上架');
    });
  }

  function filteredStores(){ return stores.filter((store)=>store.name.toLowerCase().includes(state.storeQuery.toLowerCase())); }
  function renderStores(){
    const all=filteredStores(),totalPages=Math.max(1,Math.ceil(all.length/state.storePageSize)); if(state.storePage>totalPages)state.storePage=totalPages;
    const rows=all.slice((state.storePage-1)*state.storePageSize,state.storePage*state.storePageSize); $('#store-table-body').innerHTML=rows.map((store)=>`<tr><td><div class="truncate-two" title="${escapeHtml(store.name)}">${escapeHtml(store.name)}</div></td><td>${store.region}</td><td><div class="truncate-two" title="${escapeHtml(store.address)}">${escapeHtml(store.address)}</div></td><td><div class="table-actions"><button data-store-view="${store.id}">查看</button><button data-store-edit="${store.id}">修改</button></div></td></tr>`).join('');
    $('#store-empty').hidden=rows.length>0; $('#store-empty').textContent=state.storeQuery?'未找到匹配的4S店':'暂无4S店信息'; $('#store-total').textContent=`共 ${all.length} 条`; $('#store-page').textContent=`${state.storePage} / ${totalPages}`; $('#store-prev').disabled=state.storePage<=1; $('#store-next').disabled=state.storePage>=totalPages;
    $$('[data-store-view]').forEach((button)=>button.addEventListener('click',()=>showStoreDetail(stores.find((item)=>item.id===button.dataset.storeView)))); $$('[data-store-edit]').forEach((button)=>button.addEventListener('click',()=>showStoreForm(stores.find((item)=>item.id===button.dataset.storeEdit)))); populateStoreOptions();
  }
  function showStoreDetail(store){ openModal('查看4S店',`<dl class="detail-grid"><dt>4S店名称</dt><dd>${escapeHtml(store.name)}</dd><dt>省市区县</dt><dd>${store.region}</dd><dt>详细地址</dt><dd>${escapeHtml(store.address)}</dd></dl>`,`<button class="ghost" id="store-close">关闭</button><button class="primary" id="store-to-edit">修改</button>`); $('#store-close').addEventListener('click',closeModal); $('#store-to-edit').addEventListener('click',()=>showStoreForm(store)); }
  function showStoreForm(store=null,onReturn=null){
    const parts=(store?.region||'').split(' '); openModal(store?'修改4S店':'新增4S店',`<form id="store-form" class="form-grid"><label class="form-field full">4S店名称<input name="name" maxlength="100" value="${escapeHtml(store?.name||'')}" placeholder="请输入4S店名称" required></label><label class="form-field">省<select name="province" required><option value="">请选择</option><option ${parts[0]==='浙江省'?'selected':''}>浙江省</option><option ${parts[0]==='上海市'?'selected':''}>上海市</option></select></label><label class="form-field">市<select name="city" required><option value="">请选择</option><option ${parts[1]==='杭州市'?'selected':''}>杭州市</option><option ${parts[1]==='上海市'?'selected':''}>上海市</option></select></label><label class="form-field">区县<select name="district" required><option value="">请选择</option><option ${parts[2]==='滨江区'?'selected':''}>滨江区</option><option ${parts[2]==='浦东新区'?'selected':''}>浦东新区</option></select></label><label class="form-field full">详细地址<input name="address" maxlength="200" value="${escapeHtml(store?.address||'')}" placeholder="请输入道路、门牌等详细地址" required></label><div class="source-mark form-field full">已确认：名称＋地区＋详细地址完全一致时拦截；同名不同地址允许。</div><div id="store-error" class="field-error form-field full"></div></form>`,`<button class="ghost" id="store-form-cancel">取消</button><button class="primary" id="store-form-save">保存</button>`);
    $('#store-form-cancel').addEventListener('click',()=>{if(onReturn)onReturn(null);else closeModal();}); $('#store-form-save').addEventListener('click',()=>{const form=$('#store-form');if(!form.reportValidity())return;const data=new FormData(form),candidate={name:data.get('name').trim(),region:`${data.get('province')} ${data.get('city')} ${data.get('district')}`,address:data.get('address').trim()};const duplicate=stores.some((item)=>item.id!==store?.id&&item.name===candidate.name&&item.region===candidate.region&&item.address===candidate.address);if(duplicate){$('#store-error').textContent='该4S店已存在，请使用已有记录';return;}let savedStore=store;if(store)Object.assign(store,candidate);else{savedStore={id:`store-${Date.now()}`,...candidate,createdAt:Date.now()};stores.unshift(savedStore);}state.storePage=1;renderStores();renderEmployees();toast(store?'4S店信息已更新':'4S店新增成功');if(onReturn)onReturn(savedStore);else closeModal();});
  }

  function storeById(id){return stores.find((item)=>item.id===id);}
  function populateStoreOptions(){ $('#employee-store-options').innerHTML=stores.map((store)=>`<option value="${escapeHtml(store.name)}">${store.region}</option>`).join(''); }
  function filteredEmployees(){const q=state.employeeQuery;return employees.filter((employee)=>employee.name.includes(q.name)&&employee.phone.includes(q.phone)&&(!q.store||storeById(employee.storeId)?.name===q.store)&&(!q.status||employee.status===q.status));}
  function renderEmployees(){
    const all=filteredEmployees(),pageSize=20,totalPages=Math.max(1,Math.ceil(all.length/pageSize));if(state.employeePage>totalPages)state.employeePage=totalPages;const rows=all.slice((state.employeePage-1)*pageSize,state.employeePage*pageSize);
    $('#employee-table-body').innerHTML=rows.map((employee)=>`<tr><td>${escapeHtml(employee.name)}</td><td>${employee.phone}</td><td><div class="truncate-two" title="${escapeHtml(storeById(employee.storeId)?.name)}">${escapeHtml(storeById(employee.storeId)?.name)}</div></td><td><span class="status-dot ${employee.status==='启用'?'on':''}">${employee.status}</span></td><td>${escapeHtml(logic.remarkPreview(employee.note))}</td><td><div class="table-actions"><button data-employee-view="${employee.id}">查看</button><button data-employee-edit="${employee.id}">修改</button><button class="${employee.status==='启用'?'danger':''}" data-employee-toggle="${employee.id}">${employee.status==='启用'?'停用':'启用'}</button></div></td></tr>`).join('');
    $('#employee-empty').hidden=rows.length>0;$('#employee-empty').textContent=Object.values(state.employeeQuery).some(Boolean)?'未找到符合条件的员工，请调整查询条件':'暂无4S店员工，请先新增员工';$('#employee-total').textContent=`共 ${all.length} 条`;$('#employee-page').textContent=`${state.employeePage} / ${totalPages}`;$('#employee-prev').disabled=state.employeePage<=1;$('#employee-next').disabled=state.employeePage>=totalPages;
    $$('[data-employee-view]').forEach((button)=>button.addEventListener('click',()=>showEmployeeDetail(employees.find((item)=>item.id===button.dataset.employeeView))));$$('[data-employee-edit]').forEach((button)=>button.addEventListener('click',()=>showEmployeeForm(employees.find((item)=>item.id===button.dataset.employeeEdit))));$$('[data-employee-toggle]').forEach((button)=>button.addEventListener('click',()=>confirmEmployeeToggle(employees.find((item)=>item.id===button.dataset.employeeToggle))));
    populateStoreOptions();
  }
  function showEmployeeDetail(employee){const store=storeById(employee.storeId);openModal('员工详情',`<dl class="detail-grid"><dt>员工姓名</dt><dd>${escapeHtml(employee.name)}</dd><dt>手机号</dt><dd>${employee.phone}</dd><dt>身份证号</dt><dd>${employee.idCard}</dd><dt>所属4S店</dt><dd>${escapeHtml(store.name)}</dd><dt>门店地址</dt><dd>${store.region}${escapeHtml(store.address)}</dd><dt>账号状态</dt><dd>${employee.status}</dd><dt>备注</dt><dd>${escapeHtml(employee.note||'暂无备注')}</dd></dl>`,`<button class="ghost" id="employee-detail-close">关闭</button><button class="primary" id="employee-detail-edit">修改</button>`);$('#employee-detail-close').addEventListener('click',closeModal);$('#employee-detail-edit').addEventListener('click',()=>showEmployeeForm(employee));}
  function showEmployeeForm(employee=null){
    const store=employee?storeById(employee.storeId):null;
    const values={name:employee?.name??'',phone:employee?.phone??'',idCard:employee?.idCard??'',note:employee?.note??''};
    openModal(employee?'修改4S店员工':'新增4S店员工',`<form id="employee-form" class="form-grid"><div class="source-mark form-field full">新增员工默认启用。启用／停用只在员工列表操作并二次确认。</div><label class="form-field">员工姓名<input name="name" maxlength="50" value="${escapeHtml(values.name)}" placeholder="请输入员工姓名" required></label><label class="form-field">手机号<input name="phone" value="${values.phone}" pattern="1[3-9][0-9]{9}" placeholder="请输入11位手机号" required></label><label class="form-field">身份证号<input name="idCard" value="${values.idCard}" pattern="[0-9]{17}[0-9Xx]" placeholder="请输入18位身份证号" required></label><label class="form-field">所属4S店<input name="store" list="form-store-options" value="${escapeHtml(store?.name||'')}" placeholder="输入店名搜索并选择" required><datalist id="form-store-options">${stores.map((item)=>`<option value="${escapeHtml(item.name)}">${item.region}</option>`).join('')}</datalist></label><label class="form-field full">门店地址<textarea id="employee-store-address" readonly class="read-only">${store?store.region+store.address:''}</textarea></label><label class="form-field full">备注<textarea name="note" maxlength="500">${escapeHtml(values.note)}</textarea></label><div class="field-help form-field full">若门店尚未配置，请先到“4S店信息维护”新增，再返回本页选择。</div><div id="employee-error" class="field-error form-field full"></div></form>`,`<button class="ghost" id="employee-form-cancel">取消</button><button class="primary" id="employee-form-save">保存</button>`,true);
    const storeInput=$('[name="store"]');
    storeInput.addEventListener('change',()=>{const chosen=stores.find((item)=>item.name===storeInput.value);$('#employee-store-address').value=chosen?chosen.region+chosen.address:'';});
    $('#employee-form-cancel').addEventListener('click',closeModal);
    $('#employee-form-save').addEventListener('click',()=>{const form=$('#employee-form');if(!form.reportValidity())return;const data=new FormData(form),chosen=stores.find((item)=>item.name===data.get('store'));if(!chosen){$('#employee-error').textContent='请选择所属4S店';return;}const phoneDecision=logic.employeePhoneDecision({usedByOtherRole:data.get('phone')==='13800009999'});if(!phoneDecision.allowed){$('#employee-error').textContent=phoneDecision.reason;return;}const duplicate=employees.some((item)=>item.id!==employee?.id&&(item.phone===data.get('phone')||item.idCard.toUpperCase()===data.get('idCard').toUpperCase()));if(duplicate){$('#employee-error').textContent='手机号或身份证号已关联4S店员工';return;}const update={name:data.get('name').trim(),phone:data.get('phone'),idCard:data.get('idCard').toUpperCase(),storeId:chosen.id,status:employee?.status||'启用',note:data.get('note').trim()};if(employee)Object.assign(employee,update);else employees.unshift({id:`employee-${Date.now()}`,...update,createdAt:Date.now()});closeModal();state.employeePage=1;renderEmployees();toast(employee?'员工信息已更新':'员工新增成功');});
  }
  function confirmEmployeeToggle(employee){const target=employee.status==='启用'?'停用':'启用';openModal(`确认${target}员工`,`${target==='停用'?`<div class="danger-box">确认停用 ${escapeHtml(employee.name)}（${employee.phone}）？<br>停用后员工不能登录，已登记车辆保持当前状态。</div>`:`<p>确认启用 ${escapeHtml(employee.name)}（${employee.phone}）？</p>`}`,`<button class="ghost" id="toggle-cancel">取消</button><button class="primary" id="toggle-confirm">确认${target}</button>`);$('#toggle-cancel').addEventListener('click',closeModal);$('#toggle-confirm').addEventListener('click',()=>{employee.status=target;closeModal();renderEmployees();toast(`员工已${target}`);});}

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

  $$('.nav-item').forEach((button)=>button.addEventListener('click',()=>showView(button.dataset.view)));$$('[data-go]').forEach((button)=>button.addEventListener('click',()=>showView(button.dataset.go)));
  window.addEventListener('hashchange',()=>{const view=window.location.hash.slice(1); if(view) showView(view,false);});
  // ---- 查询区（R2-07／R2-08）----
  // 品牌→车系→车型合为一个入口，逐级钻取；类型、审核状态、上下架各为一个下拉。
  // 依据用户 2026-09-13：「不存在车系独立车型存在的」「你不需要分开 3 个字段」「这是手机屏幕，很小，不要占位太大」。
  const APPROVE_OPTIONS=[{label:'全部',value:''},{label:'未审核',value:'未审核'},{label:'通过',value:'通过'},{label:'不通过',value:'不通过'}];
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

  // 多选下拉（车辆类型）
  function openTypePicker(){
    const wrap=$('#m-picker'); wrap.hidden=false;
    let picked=state.q.types.slice();
    const draw=()=>{
      wrap.innerHTML=`<div class="m-picker"><div class="m-picker-head"><button id="mp-clear">清空</button><span>车辆类型（可多选）</span><button class="ok" id="mp-ok">确定</button></div>
        <div class="m-picker-list">${VEHICLE_TYPES.map((t)=>`<button class="m-picker-item ${picked.includes(t)?'on':''}" data-mt="${t}">${t}</button>`).join('')}</div></div>`;
      $$('[data-mt]').forEach((b)=>b.addEventListener('click',()=>{
        const v=b.dataset.mt,at=picked.indexOf(v); if(at>-1)picked.splice(at,1); else picked.push(v); draw();
      }));
      $('#mp-clear').addEventListener('click',()=>{ picked=[]; close(); state.q.types=[]; applyQuery(); });
      $('#mp-ok').addEventListener('click',()=>{ close(); state.q.types=picked.slice(); applyQuery(); });
    };
    const close=()=>{ wrap.hidden=true; wrap.innerHTML=''; };
    draw();
  }

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
    setBtn('#q-type',q.types.length===1?q.types[0]:q.types.length?`类型(${q.types.length})`:'类型',q.types.length>0);
    setBtn('#q-approve',q.approve||'审核',Boolean(q.approve));
    setBtn('#q-shelf',q.shelf||'上下架',Boolean(q.shelf));
  }
  // R2-10：任一条件变化即从第 1 页重新加载，不用点查询
  function applyQuery(){ syncQueryLabels(); state.vehicleVisible=20; renderVehicles(); $('#vehicle-list').scrollTop=0; }
  $('#q-car').addEventListener('click',openCarPicker);
  $('#q-type').addEventListener('click',openTypePicker);
  $('#q-approve').addEventListener('click',()=>openSinglePicker('审核状态',APPROVE_OPTIONS,state.q.approve,(v)=>{state.q.approve=v;applyQuery();}));
  $('#q-shelf').addEventListener('click',()=>openSinglePicker('上下架',SHELF_OPTIONS,state.q.shelf,(v)=>{state.q.shelf=v;applyQuery();}));
  // ---- 驳回通知入口（R2-11 细则 2）----
  // 入口页「车源登记」→ 滚到右边的车源登记页（样稿内的示意跳转）
  const entryBtn=$('#entry-car-source');
  if(entryBtn) entryBtn.addEventListener('click',()=>{
    const stage=document.querySelector('#view-inventory .mobile-stage:not(.entry-stage)');
    if(stage){ stage.scrollIntoView({behavior:'smooth',block:'center'}); stage.classList.add('flash'); setTimeout(()=>stage.classList.remove('flash'),1200); }
  });
  $('#notify-entry').addEventListener('click',()=>{
    const list=rejectedVehicles(); state.notifyOpen=true; renderNotifyBadge();
    pushPage('驳回通知', list.length
      ? `<ul class="notify-list">${list.map((v)=>`<li data-notify="${v.id}"><div class="notify-time">${escapeHtml(v.rejectedAt)}</div><div class="notify-car">${escapeHtml(v.brand+' '+v.model+' '+v.variant)}</div><div class="notify-link">请查看详细信息 ›</div></li>`).join('')}</ul><p class="notify-tip">点任意一条，直接进入该车的修改页；完整审核意见显示在修改页顶部。</p>`
      : '<div class="empty-build"><h2>暂无驳回通知</h2><p>被驳回的车也可以在查询区选「不通过」直接筛出。</p></div>',
      '',
      ()=>{ $$('[data-notify]').forEach((li)=>li.addEventListener('click',()=>{
              const v=vehicles.find((x)=>x.id===li.dataset.notify); clearStack(); showVehicleForm({vehicle:v});
            })); });
  });
  $('#vehicle-list').addEventListener('scroll',(event)=>{const el=event.currentTarget;if(el.scrollTop+el.clientHeight>=el.scrollHeight-30){const total=filteredVehicles().length;if(state.vehicleVisible<total){state.vehicleVisible+=20;renderVehicles();}}});$('#add-vehicle').addEventListener('click',()=>{state.photos=[];state.preservedNote='';showBrandStep();});
  $('#query-store').addEventListener('click',()=>{state.storeQuery=$('#store-search').value.trim();state.storePage=1;renderStores();});$('#reset-store').addEventListener('click',()=>{$('#store-search').value='';state.storeQuery='';state.storePage=1;renderStores();});$('#add-store').addEventListener('click',()=>showStoreForm());$('#store-page-size').addEventListener('change',(event)=>{state.storePageSize=Number(event.target.value);state.storePage=1;renderStores();});$('#store-prev').addEventListener('click',()=>{state.storePage--;renderStores();});$('#store-next').addEventListener('click',()=>{state.storePage++;renderStores();});
  $('#query-employee').addEventListener('click',()=>{state.employeeQuery={name:$('#employee-name').value.trim(),phone:$('#employee-phone').value.trim(),store:$('#employee-store-filter').value.trim(),status:$('#employee-status').value};state.employeePage=1;renderEmployees();});$('#reset-employee').addEventListener('click',()=>{$('#employee-name').value='';$('#employee-phone').value='';$('#employee-store-filter').value='';$('#employee-status').value='';state.employeeQuery={name:'',phone:'',store:'',status:''};state.employeePage=1;renderEmployees();});$('#employee-prev').addEventListener('click',()=>{state.employeePage--;renderEmployees();});$('#employee-next').addEventListener('click',()=>{state.employeePage++;renderEmployees();});$('#add-employee').addEventListener('click',()=>showEmployeeForm());$('#contact-setting').addEventListener('click',showContactSetting);
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
