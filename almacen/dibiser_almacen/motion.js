/* DIBISER motion: CSS/WAAPI, progressive enhancement, no remote dependencies. */
const AppMotion=(()=>{
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const curve='cubic-bezier(0.23, 1, 0.32, 1)';
 const runs=new WeakMap(),busyCounts=new WeakMap(),seen=new WeakSet();
 const active=new Set();let keyboard=false,observer,noticeTimer;
 function instant(){return reduce.matches||keyboard||!Element.prototype.animate}
 function cancel(el){const run=runs.get(el);if(run){run.cancel();active.delete(run);runs.delete(el)}}
 function play(el,frames,duration=240,delay=0){
  if(!el)return Promise.resolve();cancel(el);
  if(instant())return Promise.resolve();
  const run=el.animate(frames,{duration,delay,easing:curve,fill:'both'});runs.set(el,run);active.add(run);
  return run.finished.catch(()=>{}).finally(()=>{active.delete(run);if(runs.get(el)===run){runs.delete(el);run.cancel()}});
 }
 const states=new WeakMap();
 function show(el,kind='panel'){
  const wasHidden=el.classList.contains('hidden')||el.inert;
  states.set(el,{});cancel(el);el.classList.remove('hidden','motion-leaving');el.inert=false;
  if(!wasHidden)return;
  if(kind==='modal'){
   play(el,[{opacity:0},{opacity:1}],240);
   play(el.querySelector('.camera-panel'),[{transform:'translateY(12px) scale(.97)'},{transform:'none'}],280);
  }else play(el,[{opacity:.15,transform:kind==='menu'?'translateY(-4px) scale(.98)':'translateY(10px)'},{opacity:1,transform:'none'}],kind==='menu'?200:240);
 }
 async function hide(el){
  if(el.classList.contains('hidden')||el.inert)return;
  const token={};states.set(el,token);el.inert=true;
  // Capture the in-flight opacity before cancelling to allow quick reversals.
  const opacity=getComputedStyle(el).opacity;cancel(el);
  await play(el,[{opacity},{opacity:0}],200);
  if(states.get(el)!==token)return;
  el.classList.add('hidden');el.classList.remove('motion-leaving');el.inert=false;
 }
 function switchPage(target){
  if(!target.classList.contains('hidden')&&!target.inert)return;
  const stage=target.parentElement;stage.style.minHeight=Math.min(stage.offsetHeight,innerHeight*.7)+'px';
  for(const section of stage.querySelectorAll(':scope > section')){
   if(section===target)continue;
   if(!section.classList.contains('hidden')){section.classList.add('motion-leaving');hide(section)}
  }
  show(target);observe(target);
  // Do not leave a tall empty stage when moving from the form to a short report.
  const current=target;setTimeout(()=>{if(!current.classList.contains('hidden')&&!current.inert)stage.style.minHeight=''},260);
  const tabs=document.querySelector('.tabs');if(tabs.getBoundingClientRect().bottom<0)tabs.scrollIntoView({block:'start',behavior:'instant'});
 }
 function busy(el){
  busyCounts.set(el,(busyCounts.get(el)||0)+1);el.classList.add('is-busy');el.setAttribute('aria-busy','true');let done=false;
  return()=>{if(done)return;done=true;const left=(busyCounts.get(el)||1)-1;busyCounts.set(el,left);if(!left){el.classList.remove('is-busy');el.removeAttribute('aria-busy')}};
 }
 const yieldPaint=()=>new Promise(resolve=>setTimeout(resolve,20));
 async function task(el,fn){const finish=busy(el);try{await yieldPaint();return await fn()}finally{finish()}}
 function notify(message){const el=document.getElementById('appFeedback');clearTimeout(noticeTimer);el.textContent=message;show(el);noticeTimer=setTimeout(()=>hide(el),6500)}
 function error(err){notify('No se pudieron cargar los datos. Intenta de nuevo. '+(err?.message||''))}
 function reveal(root){const items=root.querySelectorAll('.photo-evidence, .photo img, .card');items.forEach((el,i)=>{if(seen.has(el))return;seen.add(el);play(el,[{opacity:.3,transform:'translateY(8px) scale(.98)'},{opacity:1,transform:'none'}],240,Math.min(i,2)*40)})}
 function observe(root){if(!observer)return;root.querySelectorAll('.section-heading, .printphotos img, #totalsByMaterial, #catalogs h3').forEach(el=>{if(!seen.has(el))observer.observe(el)})}
 function init(){
  document.addEventListener('pointerdown',()=>{keyboard=false;document.documentElement.classList.remove('keyboard-motion')},true);
  document.addEventListener('keydown',()=>{keyboard=true;document.documentElement.classList.add('keyboard-motion');for(const run of active)run.finish()},true);
  reduce.addEventListener('change',()=>{if(reduce.matches)for(const run of active)run.finish()});
  document.querySelectorAll('.section-heading').forEach(el=>{const r=el.getBoundingClientRect();if(r.top<innerHeight&&r.bottom>0)seen.add(el)});
  if('IntersectionObserver' in window){observer=new IntersectionObserver(entries=>{let i=0;for(const e of entries){if(!e.isIntersecting||e.target.closest('.hidden,.motion-leaving'))continue;observer.unobserve(e.target);if(seen.has(e.target))continue;seen.add(e.target);play(e.target,[{opacity:.45,transform:'translateY(8px)'},{opacity:1,transform:'none'}],240,Math.min(i++,2)*40)}},{threshold:.15});observe(document)}
  // One entrance per container; the header, navigation and current view overlap.
  [document.querySelector('.top'),document.querySelector('.tabs'),document.getElementById('form')].forEach((el,i)=>{
   play(el,[{opacity:.25,transform:`translateY(${[8,6,12][i]}px) scale(${i===2?.99:1})`},{opacity:1,transform:'none'}],[400,320,400][i],[0,60,100][i]);
  });
  // Existing live regions provide feedback without focus-stealing alert dialogs.
  for(const id of ['msg','pdfStatus','appFeedback']){
   const el=document.getElementById(id);new MutationObserver(()=>{if(el.textContent.trim()){play(el,[{opacity:.2,transform:'translateY(5px)'},{opacity:1,transform:'none'}],240)}}).observe(el,{childList:true,characterData:true,subtree:true});
  }
  for(const id of ['detail','reportPhotos']){const el=document.getElementById(id);new MutationObserver(()=>{reveal(el);observe(el)}).observe(el,{childList:true})}
  const logo=document.querySelector('.top img');logo.classList.add('brand-depth');
  // The existing flat mark gets perspective, not a fabricated 3D asset.
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  logo.addEventListener('pointermove',e=>{if(instant()||!fine.matches)return;cancel(logo);const r=logo.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;logo.style.transform=`perspective(500px) rotateX(${-y*8}deg) rotateY(${x*8}deg) translateZ(6px)`});
  logo.addEventListener('pointerleave',()=>{logo.style.transform=''});
  // The logo settles with the header, with no continuous rotation while working.
  play(logo,[{transform:'perspective(500px) rotateY(-12deg) rotateX(6deg)'},{transform:'perspective(500px) rotateY(0deg) rotateX(0deg)'}],500);
 }
 async function remove(el){await play(el,[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.97)'}],200)}
 return{init,show,hide,switchPage,play,reveal,busy,task,notify,error,yieldPaint,remove};
})();
