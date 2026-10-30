/* 各页面共用的本地演示车辆；素材出处见 assets/demo-cars/sources.json。
   售价/指导价及车源属性为排版演示，不代表真实报价或在售车。
   2026-10-28：促销标识取消，改为总部勾选的 hot（热销）、banner；加车辆编号 vehicleNo、车辆位置 location，标签换成会上定的 9 个。
   2026-10-29：加上传时间 listedAt（最后一次上架日期）；特价车也是上架满 30 天自动下架，在架的特价车上传天数都在 30 天以内。 */
(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DemoCars=api;})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  var A='assets/demo-cars/';
  // 显示框为正方形时的取景位置，按每张照片车头所在一侧调整，原图不裁
  var POS={'cm-m6-1.jpg':'78% 50%','cm-m6-2.jpg':'45% 50%','cm-yuan-1.jpg':'18% 50%','cm-yuan-2.jpg':'45% 50%','cm-prado-1.jpg':'12% 50%','cm-prado-2.jpg':'45% 50%','cm-lc300-1.jpg':'8% 50%','cm-lc300-2.jpg':'50% 50%','cm-lc76-1.jpg':'35% 50%','cm-lc76-2.jpg':'60% 50%','cm-g63-1.jpg':'85% 50%','cm-g63-2.jpg':'18% 50%'};
  function photos(files){return files.map(function(x){return {src:A+x,position:POS[x]||'50% 50%'};});}
  var MODELS={
    m6:{name:'广汽传祺 传祺M6 MAX 2026款 1.5T DCT 尊荣版',brand:'广汽传祺',ref:'11.98万',colorOut:'典雅黑',colorIn:'黑色 / 朱砂棕',photos:photos(['cm-m6-1.jpg','cm-m6-2.jpg']),remark:'1.5T发动机，7挡双离合，七座布局；黑色车身。'},
    yuan:{name:'比亚迪 元UP 2027款 飞驰版 401KM 活力型',brand:'比亚迪',ref:'8.98万',colorOut:'浅绿色',colorIn:'黑色 / 米色',photos:photos(['cm-yuan-1.jpg','cm-yuan-2.jpg']),remark:'纯电动车，401KM续航版本，五座布局。'},
    prado:{name:'丰田 普拉多 2024款 2.8T 柴油 VX 方灯',brand:'丰田',ref:'79.80万',colorOut:'白色',colorIn:'黑色',photos:photos(['cm-prado-1.jpg','cm-prado-2.jpg']),remark:'2.8T柴油发动机，8挡自动变速箱，方灯；白色车身。'},
    lc300:{name:'丰田 兰德酷路泽 2021款 3.5T 汽油 LC300',brand:'丰田',ref:'88.00万',colorOut:'白色',colorIn:'黑色',photos:photos(['cm-lc300-1.jpg','cm-lc300-2.jpg']),remark:'3.5T双涡轮V6汽油发动机，10挡自动变速箱；白色车身。'},
    lc76:{name:'丰田 兰德酷路泽LC76 2024款 2.8T 柴油 AX 自动挡',brand:'丰田',ref:'65.80万',colorOut:'白色',colorIn:'黑色',photos:photos(['cm-lc76-1.jpg','cm-lc76-2.jpg']),remark:'2.8T柴油发动机，6挡自动变速箱，四轮驱动，五座布局；白色车身。'},
    g63:{name:'奔驰 G级AMG 2025款 AMG G 63',brand:'奔驰',ref:'259.55万',colorOut:'白色',colorIn:'黑色',photos:photos(['cm-g63-1.jpg','cm-g63-2.jpg']),remark:'4.0T V8发动机，9挡自动变速箱，五座布局；白色车身。'}
  };
  var labels={special_price:'特价车',firsthand:'一手车源',inventory:'库存车'};
  // 联系人（REQ-003 第 5.2 节）：库存车为登记的代理商；一手车源、特价车为总部统一联系人
  var HQ={name:'李静',phone:'138 0000 5678'};
  var CONTACT={inventory:{name:'张伟',phone:'138 0000 1234',from:'车源登记人'},firsthand:{name:HQ.name,phone:HQ.phone,from:'4S 车源统一联系人'},special_price:{name:HQ.name,phone:HQ.phone,from:'总部统一联系人'}};
  // 车辆编号（REQ-001 第 1.8 节）：特价车 TG、库存车 KC、一手车源 Y＋机构代码
  var PREFIX={special_price:'TG',inventory:'KC',firsthand:'YA'},SEQ={};
  var records=[];
  // 上传时间（REQ-003 详情车辆信息区）：该车最后一次上架的日期 YYYY-MM-DD，与列表「上传N天」同一口径（今天往前推 days 天）
  function p2(n){return String(n).padStart(2,'0');}
  function listedAt(days){var d=new Date(Date.now()-days*86400000);return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());}
  // labels：会上定的 9 个标签里勾选的（REQ-001 第 2.6 节）；extra.hot／banner 为总部在 PC 勾的「热销」「banner」，hotAt／bannerAt 越大表示勾得越晚
  function add(source,key,sale,days,location,tags,extra){
    var m=MODELS[key],id=source+'-'+key+(extra&&extra.suffix||'');
    SEQ[source]=(SEQ[source]||0)+1;
    records.push(Object.assign({},m,{id:id,source:source,srcLabel:labels[source],sale:sale,days:days,cats:tags,chip:key==='m6'?'10万–15万':'',video:null,img:m.photos[0].src,position:m.photos[0].position,blocks:m.photos.map(function(p){return p.src;}),location:location,labels:tags,listedAt:listedAt(days),vehicleNo:PREFIX[source]+String(SEQ[source]).padStart(5,'0'),contact:CONTACT[source],hot:false,banner:false},extra||{}));
  }
  add('special_price','m6','10.XX万',0,'东区',['现车','包牌包税','全国可上牌'],{hot:true,hotAt:2,banner:true,bannerAt:3});
  add('special_price','prado','77.XX万',1,'北区',['现车','可分期'],{banner:true,bannerAt:1});
  add('special_price','lc300','82.XX万',3,'大北区',['包牌包税','活动车'],{hot:true,hotAt:1,banner:true,bannerAt:2});
  add('special_price','lc76','62.XX万',12,'西区',['包牌包税','急售']);
  add('special_price','g63','255.XX万',29,'南区',['现车']);
  add('special_price','prado','76.XX万',22,'东区',['活动车'],{suffix:'-2'});
  add('special_price','lc76','61.XX万',27,'北区',['包牌包税'],{suffix:'-2'});
  add('firsthand','yuan','8.XX万',0,'东区',['现车','可分期'],{banner:true,bannerAt:2});
  add('firsthand','prado','77.XX万',2,'南区',['商品车','全国可上牌'],{hot:true,hotAt:1});
  add('firsthand','lc300','82.XX万',11,'西区',['运损车','急售'],{banner:true,bannerAt:1});
  add('firsthand','lc76','62.XX万',20,'北区',['运损车','现车'],{top:2});
  add('firsthand','g63','255.XX万',28,'大北区',['现车']);
  add('inventory','m6','10.XX万',0,'东区',['库存车','现车','可分期']);
  add('inventory','lc76','61.XX万',0,'西区',['运损车','库存车'],{hot:true,hotAt:1});
  add('inventory','g63','253.XX万',5,'南区',['库存车','全国可上牌']);
  add('inventory','yuan','7.XX万',9,'北区',[],{manual:1,brand:''});
  add('inventory','prado','76.XX万',19,'大北区',['运损车','包牌包税']);
  add('inventory','lc300','81.XX万',21,'东区',['现车','可分期','运损车','包牌包税','全国可上牌','急售'],{top:1,hot:true,hotAt:2});
  // 角标只有「热销」（REQ-001 第 1.7 节）。promo／promoText 保留给 PC 车源管理页读取，只会是 hot 或 none
  records.forEach(function(c){ c.promo=c.hot?'hot':'none'; c.promoText=c.hot?'热销':''; });
  function promoHtml(c){return c&&c.hot?'<span class="promo-tag promo-hot">热销</span>':'';}
  function normalize(source){return source==='special'?'special_price':source;}
  function get(id){return records.find(function(c){return c.id===id;})||null;}
  // 排序（REQ-008 第 3.3 节）：付费置顶最前（top 越小付款越近），其次热销（后勾的在前），其余按上架时间从新到旧
  function list(source){return records.filter(function(c){return c.source===normalize(source);}).sort(function(a,b){return (a.top?0:1)-(b.top?0:1)||(a.top&&b.top?a.top-b.top:0)||(a.hot?0:1)-(b.hot?0:1)||(a.hot&&b.hot?(b.hotAt||0)-(a.hotAt||0):0)||a.days-b.days;});}
  // 列表顶部横幅：本列表内勾了 banner 的车，后勾的在前；10 台上限在 PC 勾选时控制，这里不截取（REQ-008 第 3.7 节）
  function banners(source){return records.filter(function(c){return c.source===normalize(source)&&c.banner;}).sort(function(a,b){return (b.bannerAt||0)-(a.bannerAt||0);});}
  function createFavorites(){var ids=[];return {has:function(id){return ids.indexOf(id)>=0;},toggle:function(id){if(!get(id))return false;var i=ids.indexOf(id);if(i>=0)ids.splice(i,1);else ids.unshift(id);return i<0;},items:function(){return ids.map(get);}};}
  return {get:get,list:list,banners:banners,promoHtml:promoHtml,home:function(s){return list(s).slice(0,5);},normalize:normalize,createFavorites:createFavorites,all:function(){return records.slice();}};
});
