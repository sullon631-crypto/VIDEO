(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const data = JSON.parse($('site-data').textContent);
  const sections = [...document.querySelectorAll('.web-section')];
  const audience = new URLSearchParams(location.search).get('mode') === 'audience';
  const settings = {hover:true,laser:false,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};
  let active = 0, sound = false, hoverTimer, hoverNode, toastTimer, animations;
  let pointerX=-1, pointerY=-1;
  let presenter = false, clockStart = 0, scrollFrame = false, lastSync = 0;
  let channel;
  try { channel = new BroadcastChannel('sg-sst-vertical:' + location.pathname); } catch (_) {}
  document.body.classList.toggle('audience', audience);
  const chime = new Audio('assets/click-soft.mp3'); chime.volume = .16;
  const dots = [...document.querySelectorAll('[data-section-dot]')];
  const indexLinks = [...document.querySelectorAll('[data-index-link]')];
  const dialogs = [...document.querySelectorAll('dialog')];
  const viewer = $('viewer'), stage = $('viewer-stage'), world = $('viewer-world');
  const progress = $('scroll-progress');
  function notify(message) {
    $('toast').textContent = message; $('toast').classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3200);
  }
  function sync(message) { if (presenter && !audience) channel?.postMessage(message); }
  function currentPosition() {
    const section = sections[active];
    return {type:'position',id:section.id,relative:(scrollY - section.offsetTop)/section.offsetHeight};
  }
  function clearHover() {
    clearTimeout(hoverTimer); hoverNode?.classList.remove('dwelling'); hoverNode = null;
  }
  function dwell(node, action, event) {
    if (!settings.hover || event.pointerType !== 'mouse' || viewer.open) return;
    // Scrolling a link under a stationary cursor must not interrupt the reading route.
    if(Math.abs(event.clientX-pointerX)<1&&Math.abs(event.clientY-pointerY)<1)return;
    clearHover(); hoverNode = node; node.classList.add('dwelling');
    hoverTimer = setTimeout(() => { clearHover(); action(); }, 700);
  }
  function playChime() {
    if (!sound || document.visibilityState !== 'visible' || audience) return;
    chime.currentTime = 0; chime.play().catch(() => {});
  }
  function showNotes() {
    const item = data.sections[active];
    $('notes-title').textContent = item.title;
    $('notes-next-title').textContent = data.sections[active+1]?.title || 'Fin de la presentación';
    let saved;
    try { saved = localStorage.getItem('sg-sst-notes:' + item.id); } catch (_) {}
    $('speaker-notes').value = saved ?? item.notes;
  }
  function setActive(index) {
    if (active !== index) playChime();
    active = index;
    $('current-section').textContent = String(index+1).padStart(2,'0');
    $('current-title').textContent = data.sections[index].title;
    dots.forEach((node,i) => { node.classList.toggle('is-active',i===index); if(i===index)node.setAttribute('aria-current','location');else node.removeAttribute('aria-current'); });
    indexLinks.forEach((node,i) => { if(i===index)node.setAttribute('aria-current','location');else node.removeAttribute('aria-current'); });
    $('previous-section').disabled = index === 0;
    $('next-section').disabled = index === sections.length-1;
    showNotes();
  }
  function updateScroll() {
    scrollFrame = false;
    const marker = scrollY + innerHeight * .38;
    let next = 0;
    for (let i=0;i<sections.length;i++) if(sections[i].offsetTop <= marker) next=i;
    if(next !== active)setActive(next);
    const pct=Math.min(100,Math.max(0,scrollY/(document.documentElement.scrollHeight-innerHeight)*100));
    progress.firstElementChild.style.transform=`scaleX(${pct/100})`;
    progress.setAttribute('aria-valuenow',String(Math.round(pct)));
    document.querySelectorAll('.format-scroll').forEach(format => {
      const steps=[...format.querySelectorAll('.reading-step')];
      let index=0; for(let i=0;i<steps.length;i++)if(steps[i].getBoundingClientRect().top < innerHeight*.5)index=i;
      format.querySelectorAll('[data-format-step]').forEach((node,i)=>{
        node.classList.toggle('is-active',i===index);
        if(i===index)node.setAttribute('aria-current','step');else node.removeAttribute('aria-current');
      });
    });
    if(performance.now()-lastSync>80){lastSync=performance.now();sync(currentPosition());}
  }
  addEventListener('scroll',()=>{clearHover();if(!scrollFrame){scrollFrame=true;requestAnimationFrame(updateScroll);}},{passive:true});
  addEventListener('wheel',clearHover,{passive:true});
  function goTo(target) {
    clearHover();
    if (!target) return;
    dialogs.forEach(dialog => { if(dialog.open)dialog.close(); });
    const top = target.getBoundingClientRect().top + scrollY - 105;
    scrollTo({top:Math.max(0,top),behavior:settings.reduced?'instant':'smooth'});
  }
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    const target = document.getElementById(link.getAttribute('href').slice(1));
    if(!target)return;
    link.addEventListener('click',event=>{event.preventDefault();goTo(target);history.replaceState(null,'','#'+target.id);});
    if(link.closest('.main-nav,.index-grid,.section-dots,.format-route')){
      link.addEventListener('pointerenter',event=>dwell(link,()=>goTo(target),event));
      link.addEventListener('pointerleave',clearHover);
    }
  });
  document.querySelectorAll('[data-goto]').forEach(button=>{
    const go=()=>goTo(sections[Number(button.dataset.goto)]);
    button.addEventListener('click',go);
    if(button.hasAttribute('data-hover-nav'))button.addEventListener('pointerenter',event=>dwell(button,go,event));
    button.addEventListener('pointerleave',clearHover);
  });
  $('previous-section').addEventListener('click',()=>goTo(sections[Math.max(0,active-1)]));
  $('next-section').addEventListener('click',()=>goTo(sections[Math.min(sections.length-1,active+1)]));
  let modalFocus;
  function openDialog(dialog) { clearHover();modalFocus=document.activeElement;dialog.showModal();document.body.classList.add('modal-open'); }
  dialogs.forEach(dialog=>{
    dialog.addEventListener('close',()=>{
      if(!dialogs.some(item=>item.open))document.body.classList.remove('modal-open');
      modalFocus?.focus({preventScroll:true});clearHover();
    });
    dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();}});
  });
  document.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
  $('index-button').addEventListener('click',()=>openDialog($('index-dialog')));
  $('tools-button').addEventListener('click',()=>openDialog($('tools-dialog')));
  $('sound-button').addEventListener('click',()=>{
    sound=!sound;
    $('sound-button').setAttribute('aria-pressed',String(sound));
    $('sound-button').setAttribute('aria-label',sound?'Silenciar sonido':'Activar sonido');
    if(sound)playChime();notify(sound?'Sonido suave al entrar en un apartado.':'Sonido desactivado.');
  });
  async function fullscreen() {
    try {
      if(document.fullscreenElement)await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (_) { notify('Puedes usar F11 para poner el navegador en pantalla completa.'); }
  }
  $('fullscreen-button').addEventListener('click',fullscreen);
  document.addEventListener('fullscreenchange',()=>{
    $('fullscreen-button').setAttribute('aria-pressed',String(!!document.fullscreenElement));
    $('fullscreen-button').setAttribute('aria-label',document.fullscreenElement?'Salir de pantalla completa (F)':'Pantalla completa (F)');
  });
  function togglePresenter() {
    if(audience)return;
    const position=currentPosition();
    presenter=!presenter; $('presenter-panel').hidden=!presenter;
    document.body.classList.toggle('presenting',presenter);
    $('present-button').setAttribute('aria-pressed',String(presenter));
    if(presenter){if(!clockStart)clockStart=Date.now();showNotes();}
    requestAnimationFrame(()=>{
      const target=document.getElementById(position.id);
      scrollTo({top:target.offsetTop+position.relative*target.offsetHeight,behavior:'instant'});
      ScrollTrigger.refresh();updateScroll();
    });
  }
  $('present-button').addEventListener('click',togglePresenter);
  $('close-presenter').addEventListener('click',togglePresenter);
  $('speaker-notes').addEventListener('input',()=>{
    try{localStorage.setItem('sg-sst-notes:'+data.sections[active].id,$('speaker-notes').value);}catch(_){}
  });
  setInterval(()=>{if(!clockStart)return;const secs=Math.floor((Date.now()-clockStart)/1000);$('presenter-clock').textContent=String(Math.floor(secs/60)).padStart(2,'0')+':'+String(secs%60).padStart(2,'0');},1000);
  $('audience-button').addEventListener('click',()=>{
    const url=new URL(location.href);url.searchParams.set('mode','audience');
    const popup=window.open(url,'sg-sst-audience','width=1440,height=900');
    if(!popup)notify('Permite las ventanas emergentes para abrir la vista del público.');
  });
  function createAnimations() {
    animations?.revert();document.body.classList.toggle('motion-reduced',settings.reduced);
    if(settings.reduced)return;
    animations=gsap.context(()=>{
      gsap.from('.hero-line',{y:55,opacity:0,duration:1.05,stagger:.13,ease:'power3.out'});
      gsap.from('.hero-person',{opacity:0,duration:1.2,ease:'power2.out',delay:.2});
      gsap.from('.hero-ticket',{y:45,opacity:0,duration:.9,delay:.45,ease:'power3.out'});
      document.querySelectorAll('[data-anim]').forEach(node=>{
        gsap.from(node,{y:42,opacity:0,duration:.85,ease:'power3.out',scrollTrigger:{trigger:node,start:'top 90%',once:true}});
      });
      gsap.to('.hero-person',{y:85,rotation:3,scale:1.05,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1}});
      const spread=innerWidth<620?74:innerWidth<1180?130:165;
      const fan=gsap.timeline({scrollTrigger:{trigger:'.photo-fan',start:'top 95%',end:'center 45%',scrub:1}});
      fan.fromTo('.fan-left',{x:-20,rotation:-3},{x:-spread,rotation:-14,ease:'none'},0);
      fan.fromTo('.fan-right',{x:20,rotation:3},{x:spread,rotation:14,ease:'none'},0);
      fan.fromTo('.fan-center',{y:10},{y:innerWidth<620?-20:-35,ease:'none'},0);
    });
  }
  gsap.registerPlugin(ScrollTrigger);
  document.querySelectorAll('[data-setting]').forEach(input=>{
    input.checked=settings[input.dataset.setting];
    input.addEventListener('change',()=>{
      settings[input.dataset.setting]=input.checked;clearHover();
      document.body.classList.toggle('laser-on',settings.laser);
      if(input.dataset.setting==='reduced')createAnimations();
    });
  });
  // Evidence viewer: originals stay complete; the Excel reader preserves every populated cell and merge.
  let zoom=1, fit=1, panX=0, panY=0, viewerFormat=null, viewerImage=null, viewerTitle='', cellMode=false;
  const pointers=new Map();let gesture=null;
  function broadcastViewer() {sync({type:'viewer',open:viewer.open,image:viewerImage,title:viewerTitle,number:viewerFormat,cells:cellMode,zoom,x:panX/stage.clientWidth,y:panY/stage.clientHeight});}
  function transform(broadcast=true) {
    world.style.transform=`translate(calc(-50% + ${panX}px),calc(-50% + ${panY}px)) scale(${fit*zoom})`;
    $('zoom-level').textContent=Math.round(zoom*100)+'%';if(broadcast)broadcastViewer();
  }
  function fitView() {
    if(!world.offsetWidth||!world.offsetHeight)return;
    fit=Math.min((stage.clientWidth-36)/world.offsetWidth,(stage.clientHeight-36)/world.offsetHeight);
    zoom=1;panX=panY=0;transform();
  }
  function setZoom(value,point=null) {
    const next=Math.min(10,Math.max(1,value));
    if(point){const rect=stage.getBoundingClientRect();const x=point.x-rect.left-rect.width/2,y=point.y-rect.top-rect.height/2;panX=x-(x-panX)*(next/zoom);panY=y-(y-panY)*(next/zoom);}
    zoom=next;transform();
  }
  function excelTable(number) {
    const sheet=data.workbooks[number],table=document.createElement('table');table.className='excel-grid';table.setAttribute('aria-label','Lectura completa del Excel Formato '+number);
    const merged=new Map(),covered=new Set();
    for(const [r1,c1,r2,c2] of sheet.merges){merged.set(`${r1}:${c1}`,{r:r2-r1+1,c:c2-c1+1});for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++)if(r!==r1||c!==c1)covered.add(`${r}:${c}`);}
    const cells=new Map(Object.values(sheet.cells).map(cell=>[`${cell.row}:${cell.col}`,cell]));
    const header=table.insertRow();header.insertCell().className='row-head';
    for(let c=1;c<=sheet.cols;c++){const cell=header.insertCell();cell.className='col-head';cell.textContent=String.fromCharCode(64+c);}
    for(let r=1;r<=sheet.rows;r++){
      const row=table.insertRow(),head=row.insertCell();head.className='row-head';head.textContent=r;
      for(let c=1;c<=sheet.cols;c++){
        if(covered.has(`${r}:${c}`))continue;
        const cell=row.insertCell(),merge=merged.get(`${r}:${c}`);if(merge){cell.rowSpan=merge.r;cell.colSpan=merge.c;}
        const original=cells.get(`${r}:${c}`);
        if(original){cell.textContent=original.value;cell.dataset.originalCell=original.row+':'+original.col;if(original.bold)cell.classList.add('original-bold');if(original.fill&&original.fill!=='#000000')cell.style.backgroundColor=original.fill;}
      }
    }
    return table;
  }
  function imageView() {
    cellMode=false;world.replaceChildren();const img=document.createElement('img');img.src=data.images[viewerImage];img.alt=viewerTitle;img.draggable=false;
    img.onload=()=>{img.style.width=img.naturalWidth+'px';img.style.height=img.naturalHeight+'px';fitView();};world.append(img);
    $('view-original').classList.add('is-active');$('view-cells').classList.remove('is-active');
  }
  function cellsView() {
    if(!viewerFormat)return;cellMode=true;world.replaceChildren(excelTable(viewerFormat));fitView();
    $('view-original').classList.remove('is-active');$('view-cells').classList.add('is-active');
  }
  function openViewer(image,title,number=null) {
    viewerImage=image;viewerTitle=title;viewerFormat=number;
    $('viewer-title').textContent=title;$('viewer-tabs').hidden=!number;
    const sheet=$('viewer-sheet-link');sheet.hidden=!number;if(number)sheet.href=data.formats[number].link;
    if(!viewer.open)openDialog(viewer);imageView();$('viewer-close').focus({preventScroll:true});
    broadcastViewer();
  }
  viewer.addEventListener('close',()=>{pointers.clear();gesture=null;broadcastViewer();});
  $('viewer-close').addEventListener('click',()=>viewer.close());
  $('view-original').addEventListener('click',imageView);$('view-cells').addEventListener('click',cellsView);
  $('zoom-in').addEventListener('click',()=>setZoom(zoom*1.35));$('zoom-out').addEventListener('click',()=>setZoom(zoom/1.35));$('zoom-fit').addEventListener('click',fitView);
  document.querySelectorAll('[data-image]').forEach(button=>button.addEventListener('click',()=>{
    const number=Object.keys(data.formats).find(key=>data.formats[key].image===button.dataset.image);
    openViewer(button.dataset.image,button.dataset.title,number?Number(number):null);
  }));
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{
    const n=Number(button.dataset.view);openViewer(data.formats[n].image,'Formato '+n+' · '+data.formats[n].name,n);
  }));
  stage.addEventListener('wheel',event=>{event.preventDefault();setZoom(zoom*Math.exp(-event.deltaY*.0018),{x:event.clientX,y:event.clientY});},{passive:false});
  stage.addEventListener('dblclick',event=>setZoom(zoom===1?2:1,{x:event.clientX,y:event.clientY}));
  function resetGesture() {
    const points=[...pointers.values()];
    if(points.length===1)gesture={type:'drag',point:points[0],panX,panY};
    else if(points.length>=2)gesture={type:'pinch',distance:Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y),zoom};
    else gesture=null;
  }
  stage.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse'&&event.button!==0)return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});stage.setPointerCapture(event.pointerId);stage.classList.add('dragging');resetGesture();
  });
  stage.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId))return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    const points=[...pointers.values()];
    if(gesture?.type==='drag'){panX=gesture.panX+points[0].x-gesture.point.x;panY=gesture.panY+points[0].y-gesture.point.y;transform();}
    else if(gesture?.type==='pinch'&&points.length>=2){const d=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);setZoom(gesture.zoom*d/gesture.distance);}
  });
  for(const type of ['pointerup','pointercancel'])stage.addEventListener(type,event=>{pointers.delete(event.pointerId);resetGesture();if(!pointers.size)stage.classList.remove('dragging');});
  new ResizeObserver(()=>{if(viewer.open)fitView();}).observe(stage);
  const cursor=$('image-cursor'),laser=$('laser');
  document.addEventListener('pointermove',event=>{
    pointerX=event.clientX;pointerY=event.clientY;
    cursor.style.left=laser.style.left=event.clientX+'px';cursor.style.top=laser.style.top=event.clientY+'px';
    document.body.classList.toggle('image-hover',event.pointerType==='mouse'&&!!event.target.closest('.evidence')&&!viewer.open);
  });
  document.addEventListener('pointerleave',()=>{document.body.classList.remove('image-hover');laser.style.left='-100px';});
  addEventListener('keydown',event=>{
    if(event.ctrlKey||event.metaKey||event.altKey||event.target.closest('input,textarea,[contenteditable=true]'))return;
    if(viewer.open){if(['+','='].includes(event.key)){event.preventDefault();setZoom(zoom*1.35);}if(event.key==='-'){event.preventDefault();setZoom(zoom/1.35);}return;}
    if(dialogs.some(dialog=>dialog.open))return;
    if(event.key==='ArrowDown'){event.preventDefault();goTo(sections[Math.min(sections.length-1,active+1)]);}
    if(event.key==='ArrowUp'){event.preventDefault();goTo(sections[Math.max(0,active-1)]);}
    const key=event.key.toLowerCase();
    if(key==='f'){event.preventDefault();fullscreen();}
    if(key==='p'){event.preventDefault();togglePresenter();}
    if(key==='i'){event.preventDefault();openDialog($('index-dialog'));}
    if(key==='l'){settings.laser=!settings.laser;document.body.classList.toggle('laser-on',settings.laser);document.querySelector('[data-setting=laser]').checked=settings.laser;notify(settings.laser?'Puntero activado.':'Puntero desactivado.');}
    if(event.key==='Escape'&&presenter)togglePresenter();
  });
  channel?.addEventListener('message',event=>{
    const message=event.data;
    if(!audience){if(message.type==='audience-ready'&&presenter){sync(currentPosition());broadcastViewer();}return;}
    if(message.type==='position'){
      const section=document.getElementById(message.id);
      if(section){document.documentElement.style.scrollBehavior='auto';scrollTo({top:section.offsetTop+message.relative*section.offsetHeight,behavior:'instant'});updateScroll();}
    }
    if(message.type==='viewer'){
      if(!message.open){if(viewer.open)viewer.close();return;}
      if(!viewer.open||viewerImage!==message.image)openViewer(message.image,message.title,message.number);
      if(message.cells!==cellMode){if(message.cells)cellsView();else imageView();}
      zoom=message.zoom;panX=message.x*stage.clientWidth;panY=message.y*stage.clientHeight;transform(false);
    }
  });
  setActive(0);createAnimations();updateScroll();
  document.fonts.ready.then(()=>ScrollTrigger.refresh());
  addEventListener('load',()=>{
    ScrollTrigger.refresh();
    if(location.hash&&!audience){const target=document.getElementById(location.hash.slice(1));if(target)goTo(target);}
    if(audience)channel?.postMessage({type:'audience-ready'});
  });
  let resizeTimer;
  addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{createAnimations();ScrollTrigger.refresh();updateScroll();},250);});
  window.__sgSite={get active(){return active;},get zoom(){return zoom;},get settings(){return {...settings};}};
})();
