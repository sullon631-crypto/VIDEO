(() => {
  const manifest=JSON.parse(document.getElementById('manifest').textContent);
  const deck=document.getElementById('deck'),player=document.getElementById('player');
  for(const link of document.querySelectorAll('a[download]'))link.href=location.href.split('?')[0].split('#')[0];
  const settings={cursor:true,laser:false,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches};
  const indexDialog=document.getElementById('index-dialog'), toolsDialog=document.getElementById('tools-dialog');
  let overlayOpen=false,hoverTimer=null,hoverNode=null,lastIndex=0,controllerBound=false;
  const pending=[],tabs=[];
  const cue=new Audio(document.getElementById('click-audio').textContent);cue.preload='auto';cue.volume=.13;cue.muted=true;
  function send(type,extra={}){player.iframeElement?.contentWindow?.postMessage({type,...extra},location.origin==='null'?'*':location.origin);}
  function clearHover(){clearTimeout(hoverTimer);hoverNode?.classList.remove('dwelling');hoverNode=null;}
  function go(index){clearHover();if(!deck.controller){pending.push(index);return;}deck.controller.backToMain();deck.controller.goToSlide(index);if(indexDialog.open)indexDialog.close();deck.focus({preventScroll:true});}
  function hover(node,action,event){if(!settings.cursor||overlayOpen||toolsDialog.open||event?.pointerType==='touch')return;clearHover();hoverNode=node;node.classList.add('dwelling');hoverTimer=setTimeout(()=>{clearHover();action();},700);}
  for(const button of document.querySelectorAll('[data-jump]')){
    const action=()=>go(Number(button.dataset.jump));button.addEventListener('click',action);button.addEventListener('pointerenter',e=>hover(button,action,e));button.addEventListener('pointerleave',clearHover);
  }
  function applySettings(){
    send('sg-settings',settings);
    for(const input of document.querySelectorAll('[data-setting]'))input.checked=settings[input.dataset.setting];
    document.getElementById('cursor-status').textContent=settings.cursor?'ACTIVO':'PAUSADO';
    document.getElementById('cursor-button').setAttribute('aria-pressed',String(settings.cursor));
  }
  for(const input of document.querySelectorAll('[data-setting]'))input.addEventListener('change',()=>{settings[input.dataset.setting]=input.checked;applySettings();clearHover();});
  document.getElementById('cursor-button').addEventListener('click',()=>{settings.cursor=!settings.cursor;applySettings();});
  document.getElementById('open-index').addEventListener('click',()=>{clearHover();indexDialog.showModal();});
  document.getElementById('open-tools').addEventListener('click',()=>{clearHover();toolsDialog.showModal();});
  document.getElementById('restart').addEventListener('click',()=>{toolsDialog.close();go(0);});
  for(const b of document.querySelectorAll('[data-close-dialog]'))b.addEventListener('click',()=>b.closest('dialog').close());
  for(const dialog of [indexDialog,toolsDialog]){dialog.addEventListener('close',()=>{clearHover();deck.focus({preventScroll:true});});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});}
  function paintState(index){
    lastIndex=index;
    document.getElementById('progress-fill').style.width=((index+1)/manifest.slides.length*100)+'%';
    document.getElementById('progress').setAttribute('aria-valuenow',String(index+1));
    document.getElementById('scene-label').textContent=String(index+1).padStart(2,'0')+' / '+manifest.slides.length;
    document.querySelectorAll('#scene-index [data-jump]').forEach(b=>b.classList.toggle('is-active',Number(b.dataset.jump)===index));
    const ranges=[0,2,4,7,10,14];let chapter=0;ranges.forEach((n,i)=>{if(index>=n)chapter=i;});
    document.querySelectorAll('.chapter-nav button').forEach((b,i)=>b.classList.toggle('is-active',chapter===i));
  }
  window.addEventListener('message',e=>{
    if(e.source!==player.iframeElement?.contentWindow)return;
    const d=e.data;if(!d||typeof d.type!=='string')return;
    if(d.type==='sg-goto'&&Number.isInteger(d.index)&&d.index>=0&&d.index<manifest.slides.length)go(d.index);
    if(d.type==='sg-nav'&&!overlayOpen)deck.controller?.[d.direction==='next'?'next':'prev']();
    if(d.type==='sg-fragment'&&deck.controller&&Number.isInteger(d.index)){
      const c=deck.controller;if(d.index>=0&&d.index<c.currentSlide.fragments.length)c.resumeSlide(c.position.slideIndex,d.index);
    }
    if(d.type==='sg-state'&&Number.isInteger(d.index)){paintState(d.index);applySettings();}
    if(d.type==='sg-overlay')overlayOpen=!!d.open;
    if(d.type==='sg-toggle-laser'){settings.laser=!settings.laser;applySettings();}
  });
  function translateChrome(){
    const labels={'[data-hf-next]':'Siguiente','[data-hf-prev]':'Anterior','[data-hf-present]':'Modo expositor · notas privadas (P)','[data-hf-fullscreen]':document.fullscreenElement?'Salir de pantalla completa (F)':'Pantalla completa (F)','[data-hf-mute]':deck.muted?'Activar sonido':'Silenciar sonido'};
    for(const [selector,text] of Object.entries(labels)){const b=deck.querySelector(selector);if(b&&b.getAttribute('aria-label')!==text){b.setAttribute('aria-label',text);b.setAttribute('title',text);b.setAttribute('data-hf-tooltip',text);}}
    const notes=deck.querySelector('[data-hf-presenter-notes]');if(notes){notes.setAttribute('aria-label','Notas privadas del expositor');notes.setAttribute('placeholder','Escribe tus notas para esta pantalla');}
    const translations={'Elapsed':'Tiempo','Slide':'Pantalla','Next':'Siguiente','UP NEXT':'A CONTINUACIÓN','Up next':'A continuación'};
    for(const node of deck.querySelectorAll('[data-hf-presenter] div'))if(!node.children.length&&translations[node.textContent])node.textContent=translations[node.textContent];
  }
  new MutationObserver(translateChrome).observe(deck,{childList:true,subtree:true});
  deck.addEventListener('hf-sound',e=>{cue.muted=e.detail.muted;});
  window.addEventListener('pointerdown',()=>{cue.play().then(()=>{cue.pause();cue.currentTime=0;}).catch(()=>{});},{once:true,capture:true});
  function controllerChange(){
    if(!deck.controller)return;paintState(deck.controller.position.slideIndex);clearHover();applySettings();
    if(!cue.muted&&deck.resolveMode()!=='audience'){cue.currentTime=0;cue.play().catch(()=>{});}
  }
  const bindTimer=setInterval(()=>{
    if(!deck.controller)return;
    controllerBound=true;clearInterval(bindTimer);
    if(!deck.muted)deck.toggleMute();deck.controller.onChange(controllerChange);
    while(pending.length)go(pending.shift());controllerChange();
    document.getElementById('loading').classList.add('ready');
    setTimeout(()=>document.getElementById('loading').remove(),500);deck.focus({preventScroll:true});
  },70);
  setTimeout(()=>{if(!controllerBound){document.getElementById('error-surface').hidden=false;document.getElementById('loading')?.remove();}},15000);
  window.addEventListener('keydown',e=>{
    if(indexDialog.open||toolsDialog.open||overlayOpen){if(e.key==='ArrowLeft'||e.key==='ArrowRight'||e.key===' '||e.key.toLowerCase()==='p'){e.stopImmediatePropagation();}return;}
    if(e.key.toLowerCase()==='l'&&!e.ctrlKey&&!e.metaKey){settings.laser=!settings.laser;applySettings();e.preventDefault();}
    if(e.key.toLowerCase()==='i'&&!e.ctrlKey&&!e.metaKey){indexDialog.showModal();e.preventDefault();}
  },true);
  let source=JSON.parse(document.getElementById('composition-source').textContent);
  source=source.replace('<html lang="es">','<html lang="es" data-deck-live>');
  if(matchMedia('(max-width:700px)').matches){source=source.replaceAll('data-width="1920"','data-width="600"').replaceAll('data-height="1080"','data-height="1100"');player.setAttribute('width','600');player.setAttribute('height','1100');}
  player.setAttribute('srcdoc',source);
  paintState(0);
})();
