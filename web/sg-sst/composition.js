(() => {
  const data = JSON.parse(document.getElementById('deck-data').textContent);
  const scenes = [...document.querySelectorAll('.scene-frame')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = -1, live = document.documentElement.hasAttribute('data-deck-live');
  let cursorNavigation = true, motionReduced = reduced, hoverTimer = null, hoverNode = null;
  const tell = (type, extra={}) => parent.postMessage({type,...extra}, location.origin === 'null' ? '*' : location.origin);
  window.__timelines = window.__timelines || {};
  for (const [i, scene] of scenes.entries()) {
    const tl = gsap.timeline({paused:true});
    tl.fromTo(scene.querySelectorAll('[data-anim]'), {opacity:0,y:28}, {opacity:1,y:0,duration:.65,stagger:.055,ease:'power3.out'},0);
    tl.to({}, {duration:10},0);
    window.__timelines[scene.dataset.compositionId] = tl;
  }
  function selectStep(scene, time) {
    const number=Number(scene.querySelector('[data-format]')?.dataset.format);
    if (!number) return;
    const start=Number(scene.dataset.start);
    const step=Math.max(0,Math.min(4,Math.floor((time-start-.8+.0001)/.8)));
    const guide=scene.querySelector('.guide-card');
    if (guide.dataset.activeStep===String(step)) return;
    guide.dataset.activeStep=String(step);
    const info=data.formats[number].steps[step];
    guide.querySelector('.step-count').textContent=`${String(step+1).padStart(2,'0')} / 05`;
    guide.querySelectorAll('[data-step]').forEach((button,i)=>{
      button.classList.toggle('is-active',i===step);
      button.setAttribute('aria-pressed',String(i===step));
    });
    const out=guide.querySelector('.step-readout');
    out.replaceChildren();
    const h=document.createElement('h2');h.textContent=info.title;out.append(h);
    const fields=document.createElement('div');fields.className='step-fields';
    for(const [label,value] of info.fields){
      const f=document.createElement('div');f.className='step-field';
      const l=document.createElement('span');l.textContent=label;
      const v=document.createElement('strong');v.textContent=value;
      f.append(l,v);fields.append(f);
    }
    out.append(fields);const why=document.createElement('p');why.className='step-why';why.textContent=info.why;out.append(why);
    if(live&&!motionReduced&&document.visibilityState==='visible')gsap.fromTo(out,{opacity:.2,y:12},{opacity:1,y:0,duration:.4,ease:'power2.out',overwrite:true});
  }
  function update(time) {
    const index=Math.min(scenes.length-1,Math.max(0,Math.floor(time/10)));
    for(const [i,scene] of scenes.entries()) {
      const shown=i===index;
      scene.classList.toggle('is-active',shown);
      scene.setAttribute('aria-hidden',String(!shown));
      scene.inert=!shown;
      if(shown)window.__timelines[scene.dataset.compositionId].seek(Math.max(0,Math.min(10,time-i*10)),false);
    }
    selectStep(scenes[index],time);
    if(active!==index){
      clearHover();active=index;
      document.body.classList.remove('theme-orange','theme-navy','theme-cream');
      document.body.classList.add('theme-'+data.slides[index].theme);
      scenes[index].querySelector('.scene-inner').scrollTop=0;
      const content=scenes[index].querySelector('.scene-content');
      if(live&&!motionReduced&&document.visibilityState==='visible')gsap.fromTo(content,{opacity:0,y:28},{opacity:1,y:0,duration:.65,ease:'power3.out',overwrite:true});
      else gsap.set(content,{opacity:1,y:0});
      tell('sg-state',{index,theme:data.slides[index].theme,title:data.slides[index].title});
    }
  }
  const root=gsap.timeline({paused:true,onUpdate:()=>update(root.time())});
  root.to({}, {duration:scenes.length*10});
  window.__timelines.root=root;
  update(0);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden'){
      const targets=scenes[active].querySelectorAll('.scene-content,.step-readout');
      gsap.killTweensOf(targets);gsap.set(targets,{opacity:1,y:0});
    }
  });
  function bootstrap(){
    parent.postMessage({source:'hf-preview',type:'timeline',durationInFrames:scenes.length*10*30,scenes:data.slides.map((s,i)=>({id:s.id,start:i*10,duration:10}))},location.origin==='null'?'*':location.origin);
  }
  bootstrap();addEventListener('load',bootstrap,{once:true});
  function clearHover(){clearTimeout(hoverTimer);hoverNode?.classList.remove('dwelling');hoverNode=null;}
  function hover(node, action, event){
    if(!cursorNavigation||event?.pointerType==='touch'||viewer.open)return;
    clearHover();hoverNode=node;node.classList.add('dwelling');
    hoverTimer=setTimeout(()=>{clearHover();action();},700);
  }
  for(const button of document.querySelectorAll('[data-goto]')){
    const goto=()=>tell('sg-goto',{index:Number(button.dataset.goto)});
    button.addEventListener('click',goto);
    if(button.hasAttribute('data-hover-nav'))button.addEventListener('pointerenter',e=>hover(button,goto,e));
    button.addEventListener('pointerleave',clearHover);
  }
  for(const button of document.querySelectorAll('[data-step]')){
    const go=()=>tell('sg-fragment',{index:Number(button.dataset.step)});
    button.addEventListener('click',go);button.addEventListener('pointerenter',e=>hover(button,go,e));button.addEventListener('pointerleave',clearHover);
  }
  const viewer=document.getElementById('viewer'), stage=document.getElementById('viewer-stage'), world=document.getElementById('viewer-world');
  let zoom=1, fit=1, panX=0,panY=0, dragging=null, viewerFormat=null, viewerImage=null, viewerTitle='',returnFocus=null;
  function transform(){world.style.transform=`translate(calc(-50% + ${panX}px),calc(-50% + ${panY}px)) scale(${fit*zoom})`;document.getElementById('zoom-level').textContent=Math.round(zoom*100)+'%';}
  function fitView(){
    const width=world.offsetWidth,height=world.offsetHeight;
    if(!width||!height)return;
    fit=Math.min((stage.clientWidth-70)/width,(stage.clientHeight-55)/height);zoom=1;panX=panY=0;transform();
  }
  function setZoom(value,point=null){
    const next=Math.min(8,Math.max(1,value));
    if(point){const rect=stage.getBoundingClientRect();const x=point.x-rect.left-rect.width/2,y=point.y-rect.top-rect.height/2;panX=x-(x-panX)*(next/zoom);panY=y-(y-panY)*(next/zoom);}
    zoom=next;transform();
  }
  function excelTable(number){
    const sheet=data.workbooks[number];
    const table=document.createElement('table');table.className='excel-grid';table.setAttribute('aria-label','Vista de lectura del Excel Formato '+number);
    const merged=new Map(),covered=new Set();
    for(const [r1,c1,r2,c2] of sheet.merges){merged.set(`${r1}:${c1}`,{r:r2-r1+1,c:c2-c1+1});for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++)if(r!==r1||c!==c1)covered.add(`${r}:${c}`);}
    const byCell=new Map(Object.values(sheet.cells).map(c=>[`${c.row}:${c.col}`,c]));
    const header=table.insertRow();const corner=header.insertCell();corner.className='row-head';
    for(let c=1;c<=sheet.cols;c++){const cell=header.insertCell();cell.className='col-head';cell.textContent=String.fromCharCode(64+c);}
    for(let r=1;r<=sheet.rows;r++){
      const row=table.insertRow();const head=row.insertCell();head.className='row-head';head.textContent=r;
      for(let c=1;c<=sheet.cols;c++){
        if(covered.has(`${r}:${c}`))continue;
        const cell=row.insertCell();const m=merged.get(`${r}:${c}`);if(m){cell.rowSpan=m.r;cell.colSpan=m.c;}
        const original=byCell.get(`${r}:${c}`);
        if(original){cell.textContent=original.value;if(original.bold)cell.classList.add('original-bold');if(original.fill&&original.fill!=='#000000')cell.style.backgroundColor=original.fill;}
      }
    }
    return table;
  }
  function imageView(){
    world.replaceChildren();const img=document.createElement('img');img.src=data.images[viewerImage];img.alt=viewerTitle;img.draggable=false;
    img.onload=()=>{img.style.width=img.naturalWidth+'px';img.style.height=img.naturalHeight+'px';fitView();};world.append(img);
    document.getElementById('view-original').classList.add('is-active');document.getElementById('view-cells').classList.remove('is-active');
  }
  function cellsView(){if(!viewerFormat)return;world.replaceChildren(excelTable(viewerFormat));fitView();document.getElementById('view-original').classList.remove('is-active');document.getElementById('view-cells').classList.add('is-active');}
  function openViewer(image,title,number=null){
    clearHover();viewerImage=image;viewerTitle=title;viewerFormat=number;returnFocus=document.activeElement;
    document.getElementById('viewer-title').textContent=title;
    document.getElementById('viewer-tabs').hidden=!number;
    const sheet=document.getElementById('viewer-sheet-link');sheet.hidden=!number;if(number)sheet.href=data.formats[number].link;
    viewer.showModal();tell('sg-overlay',{open:true});imageView();
    document.getElementById('viewer-close').focus({preventScroll:true});
  }
  function closeViewer(){viewer.close();}
  viewer.addEventListener('close',()=>{tell('sg-overlay',{open:false});returnFocus?.focus({preventScroll:true});});
  document.getElementById('viewer-close').addEventListener('click',closeViewer);
  document.getElementById('view-original').addEventListener('click',imageView);
  document.getElementById('view-cells').addEventListener('click',cellsView);
  document.getElementById('zoom-in').addEventListener('click',()=>setZoom(zoom*1.35));
  document.getElementById('zoom-out').addEventListener('click',()=>setZoom(zoom/1.35));
  document.getElementById('zoom-fit').addEventListener('click',fitView);
  for(const button of document.querySelectorAll('[data-image]'))button.addEventListener('click',()=>openViewer(button.dataset.image,button.dataset.title));
  for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{const n=Number(button.dataset.view);openViewer(data.formats[n].image,'Formato '+n+' · '+data.formats[n].name,n);});
  stage.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom*Math.exp(-e.deltaY*.0018),{x:e.clientX,y:e.clientY});},{passive:false});
  stage.addEventListener('dblclick',e=>setZoom(zoom===1?2:1,{x:e.clientX,y:e.clientY}));
  stage.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging={x:e.clientX,y:e.clientY,panX,panY};stage.setPointerCapture(e.pointerId);stage.classList.add('dragging');});
  stage.addEventListener('pointermove',e=>{if(!dragging)return;panX=dragging.panX+e.clientX-dragging.x;panY=dragging.panY+e.clientY-dragging.y;transform();});
  for(const event of ['pointerup','pointercancel'])stage.addEventListener(event,()=>{dragging=null;stage.classList.remove('dragging');});
  new ResizeObserver(()=>{if(viewer.open)fitView();}).observe(stage);
  const laser=document.getElementById('laser');
  document.addEventListener('pointermove',e=>{laser.style.left=e.clientX+'px';laser.style.top=e.clientY+'px';});
  document.addEventListener('pointerleave',()=>{laser.style.left='-100px';laser.style.top='-100px';});
  window.addEventListener('keydown',e=>{
    if(viewer.open){
      if(e.key==='Escape'){e.preventDefault();closeViewer();}
      if(e.key==='+'||e.key==='='){e.preventDefault();setZoom(zoom*1.35);}
      if(e.key==='-'){e.preventDefault();setZoom(zoom/1.35);}
      e.stopImmediatePropagation();
      return;
    }
    if(e.key.toLowerCase()==='l'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();e.stopImmediatePropagation();tell('sg-toggle-laser');}
  },true);
  let swipe=null;
  document.addEventListener('pointerdown',e=>{if(!viewer.open&&e.pointerType==='touch'&&!e.target.closest('button,a,input'))swipe={x:e.clientX,y:e.clientY};});
  document.addEventListener('pointerup',e=>{if(!swipe)return;const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;swipe=null;if(Math.abs(dx)>90&&Math.abs(dy)<50)tell('sg-nav',{direction:dx<0?'next':'prev'});});
  window.addEventListener('message',e=>{
    if(e.source!==parent)return;
    if(e.data?.type==='sg-settings'){
      cursorNavigation=e.data.cursor;motionReduced=e.data.reduced||reduced;
      document.body.classList.toggle('laser-on',e.data.laser);
      document.body.classList.toggle('motion-reduced',motionReduced);clearHover();
    }
    if(e.data?.type==='sg-seek')root.seek(e.data.time,false);
  });
  window.__sgDeck={get active(){return active;},get zoom(){return zoom;},fitView,update};
})();
