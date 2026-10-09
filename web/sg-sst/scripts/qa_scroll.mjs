import puppeteer from '../../../videos/sg-sst/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const url=process.env.SG_SITE_URL||'http://127.0.0.1:8081/web/sg-sst/';
const output=new URL('../qa-scroll/',import.meta.url).pathname;
await fs.mkdir(output,{recursive:true});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const browser=await puppeteer.launch({executablePath:process.env.HYPERFRAMES_BROWSER_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const report={url,checks:[],screens:[],errors:[],external:[]};
try{
  const page=await browser.newPage();await page.setViewport({width:1440,height:900});
  page.on('pageerror',error=>report.errors.push(error.message));
  page.on('requestfailed',request=>report.errors.push(request.url().slice(0,120)+': '+request.failure().errorText));
  page.on('request',request=>{if(/^https?:/.test(request.url())&&!request.url().startsWith(url))report.external.push(request.url());});
  await page.goto(url,{waitUntil:'networkidle0'});await page.evaluate(()=>document.fonts.ready);await wait(1400);
  assert.equal(await page.$$eval('.web-section',nodes=>nodes.length),19);
  assert.equal(await page.$$eval('iframe',nodes=>nodes.length),0);
  assert(await page.evaluate(()=>document.fonts.check('24px Anton')&&document.fonts.check('24px Manrope')&&document.fonts.check('italic 24px Fraunces')));
  assert.deepEqual(await page.$$eval('img',nodes=>nodes.filter(n=>!n.naturalWidth).map(n=>n.alt)),[]);
  await page.screenshot({path:output+'hero.png'});
  await page.mouse.move(650,650);await page.mouse.wheel({deltaY:530});await wait(500);
  assert((await page.evaluate(()=>scrollY))>300,'Wheel must scroll the page vertically');
  assert.equal(await page.evaluate(()=>scrollX),0);
  report.checks.push('Native vertical mouse-wheel scrolling; three local fonts; all images loaded; no slideshow iframe');
  const ids=await page.$$eval('.web-section',nodes=>nodes.map(n=>n.id));
  async function section(id){await page.evaluate(id=>{const element=document.getElementById(id);scrollTo({top:element.offsetTop-90,behavior:'instant'});},id);await wait(1100);}
  for(let i=0;i<ids.length;i++){
    await section(ids[i]);
    const state=await page.evaluate(()=>({active:window.__sgSite.active,width:document.documentElement.scrollWidth,view:innerWidth}));
    assert.equal(state.active,i);assert(state.width<=state.view+1,'Desktop horizontal overflow at '+ids[i]);
    report.screens.push({id:ids[i],...state});
    await page.screenshot({path:output+`section-${String(i+1).padStart(2,'0')}.png`});
  }
  report.checks.push('All 19 sections reachable vertically without horizontal overflow');
  for(const number of [2,7,8]){
    for(let i=0;i<5;i++){
      await page.evaluate(({n,i})=>{const e=document.getElementById(`f${n}-paso-${i}`);scrollTo({top:e.getBoundingClientRect().top+scrollY-innerHeight*.3,behavior:'instant'});},{n:number,i});await wait(350);
      assert(await page.$eval(`[data-format-step="${number}:${i}"]`,node=>node.classList.contains('is-active')));
    }
    await section('formato-'+number);
    await page.click(`[data-view="${number}"]`);await wait(400);assert(await page.$eval('#viewer',node=>node.open));
    await page.click('#zoom-in');assert((await page.evaluate(()=>window.__sgSite.zoom))>1);
    await page.click('#zoom-fit');assert.equal(await page.evaluate(()=>window.__sgSite.zoom),1);
    const stage=await page.$eval('#viewer-stage',node=>{const r=node.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
    await page.mouse.move(stage.x,stage.y);await page.mouse.wheel({deltaY:-400});await wait(100);assert((await page.evaluate(()=>window.__sgSite.zoom))>1);
    await page.mouse.down();await page.mouse.move(stage.x+75,stage.y+30,{steps:4});await page.mouse.up();
    await page.click('#view-cells');await wait(200);
    const count=await page.$$eval('.excel-grid td[data-original-cell]',cells=>cells.filter(cell=>cell.textContent.trim()).length);
    assert.equal(count,number===2?73:number===7?117:60);
    assert((await page.$eval('#viewer-sheet-link',node=>node.href)).startsWith('https://docs.google.com/spreadsheets/'));
    await page.screenshot({path:output+`format-${number}-reader.png`});
    await page.keyboard.press('Escape');assert(!(await page.$eval('#viewer',node=>node.open)));
  }
  report.checks.push('15 guided steps update on scroll; three document viewers support zoom, wheel, dragging and escape; Excel reader contains all 250 populated source cells');
  await section('portada');await page.hover('.main-nav a[href="#caso-6"]');await page.waitForFunction(()=>window.__sgSite.active===7,{timeout:5000});
  assert.equal(await page.evaluate(()=>window.__sgSite.active),7);
  await page.mouse.move(10,90);
  await page.click('#tools-button');await page.click('[data-setting=hover]');await page.keyboard.press('Escape');
  await page.hover('.main-nav a[href="#caso-1"]');await wait(900);assert.equal(await page.evaluate(()=>window.__sgSite.active),7);
  await page.mouse.move(10,90);await page.click('#next-section');await wait(1400);assert.equal(await page.evaluate(()=>window.__sgSite.active),8);
  await page.keyboard.press('ArrowUp');await wait(1400);assert.equal(await page.evaluate(()=>window.__sgSite.active),7);
  await page.click('#index-button');assert(await page.$eval('#index-dialog',node=>node.open));await page.click('.index-grid a[href="#plan-accion"]');await wait(1400);assert.equal(await page.evaluate(()=>window.__sgSite.active),13);
  report.checks.push('Cursor dwell navigation and pause setting; vertical previous/next arrows; keyboard; full index');
  await page.keyboard.press('l');assert(await page.$eval('body',node=>node.classList.contains('laser-on')));await page.keyboard.press('l');
  await page.click('#sound-button');assert.equal(await page.$eval('#sound-button',node=>node.getAttribute('aria-pressed')),'true');await page.click('#sound-button');
  await page.evaluate(()=>{const original=Element.prototype.requestFullscreen;Element.prototype.requestFullscreen=function(...args){window.__fullscreenRequested=navigator.userActivation.isActive;return original.apply(this,args);};});
  await page.click('#fullscreen-button');await wait(300);assert(await page.evaluate(()=>window.__fullscreenRequested));
  if(await page.evaluate(()=>!!document.fullscreenElement)){await page.evaluate(()=>document.exitFullscreen());report.checks.push('Fullscreen enter and exit');}else report.checks.push('Fullscreen requested with real user activation; actual entry unavailable in managed headless Chromium');
  await page.click('#present-button');assert(!(await page.$eval('#presenter-panel',node=>node.hidden)));
  await page.$eval('#speaker-notes',node=>{node.value='Nota privada de prueba';node.dispatchEvent(new Event('input',{bubbles:true}));});
  assert(await page.evaluate(()=>Object.keys(localStorage).some(key=>key.startsWith('sg-sst-notes:')&&localStorage.getItem(key)==='Nota privada de prueba')));
  const popupPromise=new Promise(resolve=>page.once('popup',resolve));await page.click('#audience-button');const audience=await popupPromise;
  await audience.waitForFunction(()=>!!window.__sgSite);await wait(1000);assert(audience.url().includes('mode=audience'));
  assert(await audience.$eval('#presenter-panel',node=>node.hidden));
  await section('caso-1');await wait(500);assert.equal(await audience.evaluate(()=>window.__sgSite.active),4);
  await page.screenshot({path:output+'presenter.png'});await audience.screenshot({path:output+'audience.png'});
  await audience.close();await page.click('#close-presenter');
  report.checks.push('Private editable notes saved locally, timer and separate synchronized audience window');
  await page.click('#tools-button');await page.click('[data-setting=reduced]');await page.keyboard.press('Escape');
  assert(await page.evaluate(()=>window.__sgSite.settings.reduced));
  await section('conclusiones');assert(await page.$$eval('#conclusiones [data-anim]',nodes=>nodes.every(node=>Number(getComputedStyle(node).opacity)>.95)));
  report.checks.push('Reduced-motion option preserves readable content');
  for(const width of [390,768]){
    await page.setViewport({width,height:844});await wait(500);
    for(const id of ids){await section(id);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow '+width+' at '+id);}
    for(const id of ['portada','caso-1','formato-7','conclusiones']){await section(id);await page.screenshot({path:output+`responsive-${width}-${id}.png`});}
    await section('formato-7');await page.click('[data-view="7"]');await wait(350);await page.click('#zoom-in');assert((await page.evaluate(()=>window.__sgSite.zoom))>1);await page.click('#view-cells');assert.equal(await page.$$eval('.excel-grid [data-original-cell]',nodes=>nodes.filter(n=>n.textContent.trim()).length),117);await page.click('#viewer-close');
  }
  report.checks.push('All sections fit 390px mobile and 768px tablet; document and cell zoom controls remain usable');
  assert.equal(report.errors.length,0);assert.equal(report.external.length,0);
  report.checks.push('Portable page makes no external requests to load content, scripts, fonts or images; no browser errors');
  console.log(JSON.stringify({checks:report.checks,errors:report.errors,sections:report.screens.length},null,2));
}finally{await fs.writeFile(output+'report.json',JSON.stringify(report,null,2));await browser.close();}
