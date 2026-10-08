import puppeteer from '../../../videos/sg-sst/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const browser=await puppeteer.launch({executablePath:process.env.HYPERFRAMES_BROWSER_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const report={screens:[],checks:[],errors:[],external:[]};
const url=process.env.SG_SITE_URL||'http://127.0.0.1:8080/web/sg-sst/';
await fs.mkdir('qa',{recursive:true});
try {
  const page=await browser.newPage();await page.setViewport({width:1440,height:900});
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('requestfailed',r=>report.errors.push(r.url().slice(0,150)+': '+r.failure().errorText));
  page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(url))report.external.push(r.url());});
  await page.goto(url,{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>!!document.querySelector('#deck').controller);
  await page.waitForFunction(()=>!document.querySelector('#loading'));
  const frame=page.frames().find(f=>f!==page.mainFrame());
  // Puppeteer does not include the player shadow-tree scale in iframe click boxes.
  async function frameClick(selector) {
    await frame.$eval(selector,e=>e.scrollIntoView({block:'nearest',inline:'nearest'}));
    const inner=await frame.$eval(selector,e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}});
    const outer=await page.evaluate(()=>{const r=document.querySelector('#player').iframeElement.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width}});
    const width=await frame.evaluate(()=>innerWidth);
    await page.mouse.click(outer.x+inner.x*outer.width/width,outer.y+inner.y*outer.width/width);
  }
  await frame.evaluate(()=>document.fonts.ready);
  for(let i=0;i<19;i++) {
    await page.evaluate(i=>document.querySelector('#deck').controller.goToSlide(i),i);
    await sleep(750);
    const state=await frame.evaluate(()=>{
      const scene=document.querySelector('.scene-frame.is-active'),inner=scene.querySelector('.scene-inner');
      return {active:window.__sgDeck.active,id:scene.dataset.compositionId,canvas:[innerWidth,innerHeight],overflow:inner.scrollHeight-inner.clientHeight,missingImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.alt),visible:scene.getBoundingClientRect().height,font:document.fonts.check('20px Anton')};
    });
    assert.equal(state.active,i,`Scene ${i} must be active`);
    assert.equal(state.missingImages.length,0);
    assert(state.font);report.screens.push(state);
    await page.screenshot({path:`qa/slide-${String(i+1).padStart(2,'0')}.png`});
  }
  report.checks.push('All 19 screens, original images and Anton loaded');
  for(const [slide,number] of [[6,2],[9,7],[12,8]]) {
    await page.evaluate(i=>document.querySelector('#deck').controller.goToSlide(i),slide);await sleep(750);
    for(let step=0;step<5;step++){
      await frameClick(`.scene-frame.is-active [data-step="${step}"]`);await sleep(480);
      assert.equal(await frame.$eval('.scene-frame.is-active .guide-card',e=>e.dataset.activeStep),String(step));
      const overflow=await frame.$eval('.scene-frame.is-active .scene-inner',e=>e.scrollHeight-e.clientHeight);
      report.checks.push(`Format ${number}, step ${step+1}, overflow ${overflow}`);
    }
    await frameClick(`.scene-frame.is-active [data-view="${number}"]`);await sleep(300);
    assert(await frame.$eval('#viewer',e=>e.open));
    await frameClick('#zoom-in');assert((await frame.evaluate(()=>window.__sgDeck.zoom))>1);
    await frameClick('#zoom-fit');assert.equal(await frame.evaluate(()=>window.__sgDeck.zoom),1);
    await frameClick('#view-cells');
    const count=await frame.$$eval('.excel-grid td',cells=>cells.filter(c=>c.textContent.trim()&&!c.className.includes('head')).length);
    assert.equal(count,number===2?73:number===7?117:60,`All nonempty Excel cells in format ${number}`);
    assert((await frame.$eval('#viewer-sheet-link',e=>e.href)).startsWith('https://docs.google.com/spreadsheets/'));
    await page.screenshot({path:`qa/format-${number}-cells.png`});
    await frameClick('#viewer-close');await sleep(100);
    assert(!(await frame.$eval('#viewer',e=>e.open)));
  }
  report.checks.push('Three original document viewers: zoom, fit, Excel merges and 250 original nonempty cells');
  await page.evaluate(()=>document.querySelector('#deck').controller.goToSlide(0));await sleep(100);
  await page.hover('.chapter-nav [data-jump="7"]');await sleep(850);
  assert.equal(await frame.evaluate(()=>window.__sgDeck.active),7);
  await page.click('#cursor-button');
  await page.hover('.chapter-nav [data-jump="10"]');await sleep(850);
  assert.equal(await frame.evaluate(()=>window.__sgDeck.active),7);
  await page.click('#cursor-button');
  await page.mouse.move(10,90);
  await page.evaluate(()=>document.querySelector('#deck').focus());await page.keyboard.press('ArrowRight');await sleep(700);
  assert.equal(await frame.evaluate(()=>window.__sgDeck.active),8);
  await page.keyboard.press('ArrowLeft');await sleep(700);assert.equal(await frame.evaluate(()=>window.__sgDeck.active),7);
  report.checks.push('Cursor dwell navigation, pause option, previous and next keyboard');
  await page.evaluate(()=>{const request=Element.prototype.requestFullscreen;Element.prototype.requestFullscreen=function(...args){window.__fullscreenRequested=navigator.userActivation.isActive;return request.apply(this,args)}});
  await page.click('[data-hf-fullscreen]');await sleep(500);
  assert(await page.evaluate(()=>window.__fullscreenRequested));
  if(await page.evaluate(()=>!!document.fullscreenElement)){
    await page.evaluate(()=>document.exitFullscreen());report.checks.push('Native fullscreen enter and exit');
  }else report.checks.push('Native fullscreen control requests with user activation; managed headless Chromium leaves fullscreen pending even for a minimal document (actual entry unverified)');
  await sleep(200);
  await page.click('#open-index');assert(await page.$eval('#index-dialog',e=>e.open));
  await page.click('#scene-index [data-jump="13"]');await sleep(700);assert.equal(await frame.evaluate(()=>window.__sgDeck.active),13);
  await page.keyboard.press('l');await sleep(100);assert(await frame.$eval('body',e=>e.classList.contains('laser-on')));
  await frame.evaluate(()=>{document.body.tabIndex=0;document.body.focus()});await page.keyboard.press('l');await sleep(100);assert(!(await frame.$eval('body',e=>e.classList.contains('laser-on'))));
  report.checks.push('Index navigation and laser shortcut from parent and frame');
  const popupPromise=new Promise(resolve=>page.once('popup',resolve));
  await page.click('[data-hf-present]');const audience=await popupPromise;
  await audience.waitForFunction(()=>!!document.querySelector('#deck').controller);
  await audience.waitForFunction(()=>!document.querySelector('#loading'));
  assert(audience.url().includes('mode=audience'));
  assert(await page.$('[data-hf-presenter-notes]'));
  await page.$eval('[data-hf-presenter-notes]',e=>{e.value='Nota de prueba guardada';e.dispatchEvent(new Event('input',{bubbles:true}));});
  assert(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('hf-slideshow:presenter-notes:')&&localStorage.getItem(k)==='Nota de prueba guardada')));
  await page.evaluate(()=>document.querySelector('#deck').controller.goToSlide(6));await sleep(900);
  const audienceFrame=audience.frames().find(f=>f!==audience.mainFrame());
  assert.equal(await audienceFrame.evaluate(()=>window.__sgDeck.active),6);
  await frameClick('.scene-frame.is-active [data-step="3"]');await sleep(650);
  assert.equal(await audienceFrame.$eval('.scene-frame.is-active .guide-card',e=>e.dataset.activeStep),'3');
  assert(await frame.$$eval('.scene-frame.is-active [data-anim]',nodes=>nodes.every(n=>Number(getComputedStyle(n).opacity)>.95)),'Presenter content remains visible in background window');
  assert(await audienceFrame.$$eval('.scene-frame.is-active [data-anim]',nodes=>nodes.every(n=>Number(getComputedStyle(n).opacity)>.95)),'Audience content remains visible');
  await page.screenshot({path:'qa/presenter.png'});await audience.screenshot({path:'qa/audience.png'});
  assert(!(await audience.$('[data-hf-presenter-notes]')));
  report.checks.push('Native presenter, editable persistent private notes and synchronized audience fragments');
  await audience.close();await page.close();
  const mobile=await browser.newPage();await mobile.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1});
  await mobile.goto(url,{waitUntil:'networkidle0'});await mobile.waitForFunction(()=>!!document.querySelector('#deck').controller&&!document.querySelector('#loading'));
  const mf=mobile.frames().find(f=>f!==mobile.mainFrame());
  assert.deepEqual(await mf.evaluate(()=>[innerWidth,innerHeight]),[600,1100]);
  for(const i of [0,6,9,12,13,18]){
    await mobile.evaluate(i=>document.querySelector('#deck').controller.goToSlide(i),i);await sleep(650);
    assert.equal(await mf.evaluate(()=>window.__sgDeck.active),i);
    assert.equal(await mf.$eval('.scene-frame.is-active .scene-inner',e=>e.scrollWidth>e.clientWidth),false);
    await mobile.screenshot({path:`qa/mobile-${i}.png`});
  }
  report.checks.push('Touch viewport 390×844: narrow canvas, six dense screens and no horizontal overflow');
  await mobile.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await mobile.reload({waitUntil:'networkidle0'});await sleep(1000);
  assert(await mobile.$eval('[data-setting="reduced"]',e=>e.checked));
  report.checks.push('Reduced motion follows operating system preference');
  console.log(JSON.stringify(report,null,2));
} finally {
  await fs.writeFile('qa/report.json',JSON.stringify(report,null,2));
  await browser.close();
}
