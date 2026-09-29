/* 各页面共用的本地演示车辆；素材出处见 assets/demo-cars/sources.json。
   售价/指导价及车源属性为排版演示，不代表真实报价或在售车。 */
(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DemoCars=api;})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  var A='assets/demo-cars/';
  function photos(files){return files.map(function(x){return {src:A+x,position:x.indexOf('prado-')===0?'50% 100%':(x==='lc300-black-1.jpg'?'50% 80%':'50% 50%')};});}
  var MODELS={
    m6:{name:'广汽传祺 传祺M6 MAX 2026款 1.5T DCT 尊荣版',brand:'广汽传祺',ref:'11.98万',colorOut:'典雅黑',colorIn:'黑色 / 朱砂棕',photos:photos(['m6-showroom-2.jpg','m6-showroom-1.jpg','m6-showroom-3.jpg']),remark:'1.5T发动机，7挡双离合，七座布局；黑色车身。'},
    yuan:{name:'比亚迪 元UP 2027款 飞驰版 401KM 活力型',brand:'比亚迪',ref:'8.98万',colorOut:'浅绿色',colorIn:'黑色 / 米色',photos:photos(['yuan-2.jpg','yuan-1.jpg','yuan-5.jpg']),remark:'纯电动车，401KM续航版本，五座布局。'},
    prado:{name:'丰田 普拉多 2025款 2.8T 柴油 真皮雷测高配 方灯 中东版',brand:'丰田',ref:'79.80万',colorOut:'白色',colorIn:'黑色',photos:photos(['prado-1.jpg','prado-2.jpg','prado-3.jpg']),remark:'2.8T柴油发动机，8挡自动变速箱，方灯，真皮座椅。'},
    lc300:{name:'丰田 兰德酷路泽 2024款 4000 GXR 八气 20轮 真皮版',brand:'丰田',ref:'88.00万',colorOut:'黑色',colorIn:'米色',photos:photos(['lc300-black-1.jpg','lc300-black-2.jpg','lc300-black-8.jpg','lc300-black-4.jpg']),remark:'4.0L汽油发动机，20英寸轮毂，八气囊，米色真皮座椅。'},
    lc76:{name:'丰田 兰德酷路泽LC76 2025款 2.8T 柴油 LX-Z 自动挡',brand:'丰田',ref:'65.80万',colorOut:'黑色',colorIn:'黑色',photos:photos(['lc76-2.jpg','lc76-1.jpg','lc76-5.jpg']),remark:'2.8T柴油发动机，自动变速箱，四轮驱动，五座布局。'},
    g63:{name:'奔驰 G级AMG 2026款 AMG G 63',brand:'奔驰',ref:'259.55万',colorOut:'灰色',colorIn:'黑色',photos:photos(['g63-2.jpg','g63-1.jpg','g63-5.jpg']),remark:'4.0T V8发动机，9挡自动变速箱，五座布局。'}
  };
  var labels={special_price:'特价车',firsthand:'一手车源',inventory:'库存车'};
  var records=[];
  function add(source,key,sale,days,cats,extra){
    var m=MODELS[key],id=source+'-'+key+(extra&&extra.suffix||'');
    records.push(Object.assign({},m,{id:id,source:source,srcLabel:labels[source],sale:sale,days:days,cats:cats,vtypes:cats,chip:key==='m6'?'10万–15万':'',video:null,img:m.photos[0].src,position:m.photos[0].position,blocks:m.photos.map(function(p){return p.src;}),region:source==='firsthand'?'江苏省 南京市':'广东省 广州市',labels:['现车','支持置换'],contact:source==='firsthand'?{name:'李静',phone:'138 0000 5678',from:'4S 车源统一联系人'}:{name:'张伟',phone:'138 0000 1234',from:'车源登记人'},baseCount:source==='firsthand'?1:2},extra||{}));
  }
  add('special_price','m6','10.XX万',0,['运损车']);
  add('special_price','prado','77.XX万',1,['运损车']);
  add('special_price','lc300','82.XX万',3,['包牌包税']);
  add('special_price','lc76','62.XX万',12,['包牌包税']);
  add('special_price','g63','255.XX万',30,[]);
  add('special_price','prado','76.XX万',99,[],{suffix:'-2'});
  add('special_price','lc76','61.XX万',120,['包牌包税'],{suffix:'-2'});
  add('firsthand','yuan','8.XX万',0,['包牌包税']);
  add('firsthand','prado','77.XX万',2,[]);
  add('firsthand','lc300','82.XX万',11,['运损车']);
  add('firsthand','lc76','62.XX万',20,['运损车'],{top:2});
  add('firsthand','g63','255.XX万',45,[]);
  add('inventory','m6','10.XX万',0,['运损车']);
  add('inventory','lc76','61.XX万',0,['运损车']);
  add('inventory','g63','253.XX万',5,[]);
  add('inventory','yuan','7.XX万',9,[],{manual:1,brand:''});
  add('inventory','prado','76.XX万',19,['运损车','包牌包税']);
  add('inventory','lc300','81.XX万',21,[],{top:1});
  function normalize(source){return source==='special'?'special_price':source;}
  function get(id){return records.find(function(c){return c.id===id;})||null;}
  function list(source){return records.filter(function(c){return c.source===normalize(source);}).sort(function(a,b){return (a.top?0:1)-(b.top?0:1)||(a.top&&b.top?a.top-b.top:0)||a.days-b.days;});}
  function createFavorites(){var ids=[];return {has:function(id){return ids.indexOf(id)>=0;},toggle:function(id){if(!get(id))return false;var i=ids.indexOf(id);if(i>=0)ids.splice(i,1);else ids.unshift(id);return i<0;},items:function(){return ids.map(get);}};}
  return {get:get,list:list,home:function(s){return list(s).slice(0,5);},normalize:normalize,createFavorites:createFavorites,all:function(){return records.slice();}};
});
