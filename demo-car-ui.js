/* 两版详情共用图片轮播和按车辆 ID 收藏；仅浏览器内存。 */
(function(){
  'use strict';
  var D=window.DemoCars, fav=D.createFavorites();
  fav.toggle('firsthand-lc76');
  function changed(){window.dispatchEvent(new Event('demo-favorites-changed'));}
  function bindFavorite(button,getCar){
    function render(){var c=getCar(),on=fav.has(c.id);button.classList.toggle('on',on);button.setAttribute('aria-pressed',String(on));button.querySelector('.d2-fav-t').textContent=on?'已收藏':'收藏';}
    button.addEventListener('click',function(){fav.toggle(getCar().id);changed();var el=document.getElementById('toast');if(el){el.textContent=fav.has(getCar().id)?'已收藏':'已取消收藏';el.classList.add('show');setTimeout(function(){el.classList.remove('show');},1800);}});
    window.addEventListener('demo-favorites-changed',render);return render;
  }
  function gallery(box,car,showCount){
    var index=0,items=car.photos.slice();
    if(car.video)items.push({src:car.video,type:'video'});
    box.innerHTML='<img class="demo-photo" alt=""><video class="demo-video" controls playsinline hidden></video><button type="button" class="demo-prev" aria-label="上一张照片">‹</button><button type="button" class="demo-next" aria-label="下一张照片">›</button><span class="d2-media"></span><span class="d2-video" hidden>▶ 含视频</span>';
    box.querySelector('.d2-video').hidden=!showCount||!car.video;
    var img=box.querySelector('img'),vid=box.querySelector('video'),count=box.querySelector('.d2-media');
    function render(){var p=items[index];vid.pause();vid.hidden=p.type!=='video';img.hidden=p.type==='video';if(p.type==='video')vid.src=p.src;else {img.src=p.src;img.style.objectPosition=p.position||'center';img.alt=car.name+' · 第'+(index+1)+'张实拍';}count.hidden=!showCount||items.length===1;count.textContent=(index+1)+'/'+items.length;box.dataset.carId=car.id;box.dataset.index=index;}
    function move(n){index=(index+n+items.length)%items.length;render();}
    box.querySelector('.demo-prev').hidden=box.querySelector('.demo-next').hidden=items.length<2;
    box.querySelector('.demo-prev').onclick=function(){move(-1);};box.querySelector('.demo-next').onclick=function(){move(1);};
    var x=null;box.onpointerdown=function(e){x=e.clientX;};box.onpointerup=function(e){if(x!==null&&Math.abs(e.clientX-x)>40)move(e.clientX<x?1:-1);x=null;};
    render();
  }
  function select(id){if(window.__setDetailCar)window.__setDetailCar(id);if(window.__setLegacyCar)window.__setLegacyCar(id);}
  function open(id,view){if(!D.get(id))return;view=view||'contact2';select(id);if(window.__mobileNav)window.__mobileNav({view:view,carId:id});else window.location.hash=view;}
  window.DemoCarUI={favorites:fav,bindFavorite:bindFavorite,gallery:gallery,select:select,open:open};
})();
