import puppeteer from '../../../videos/sg-sst/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const sources=JSON.parse(await fs.readFile(new URL('../assets/case-image-sources.json',import.meta.url)));
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const output=new URL('../qa-scroll/',import.meta.url).pathname;
const report={checks:[],source_downloads_verified:false,source_download_limitation:'Source domains return proxy CONNECT 403. Success loading is verified with intercepted image fixtures, not the actual remote photos.',errors:[]};
try{
  for(const success of [false,true]){
    const page=await browser.newPage();await page.setViewport({width:1440,height:900});page.on('pageerror',error=>report.errors.push(error.message));
    const plantUrl='https://www.horizonteminero.com/wp-content/uploads/qa-plant-fixture.webp';
    const imageUrls=new Map([[sources['chinalco-mine'].url,'hero'],[sources['extinguisher-course'].url,'training'],[plantUrl,'company']]);
    await page.setRequestInterception(true);
    page.on('request',async request=>{
      if(request.url()===sources['chinalco-plant'].endpoint){
        if(!success)return request.abort();
        return request.respond({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:JSON.stringify([{_embedded:{'wp:featuredmedia':[{source_url:plantUrl}]}}])});
      }
      if(imageUrls.has(request.url())){
        if(!success)return request.abort();
        return request.respond({status:200,contentType:'image/webp',body:await fs.readFile(new URL('../assets/'+imageUrls.get(request.url())+'.webp',import.meta.url))});
      }
      await request.continue();
    });
    await page.goto('http://127.0.0.1:8082/',{waitUntil:'networkidle0'});await page.evaluate(()=>document.fonts.ready);await sleep(1200);
    const state=await page.evaluate(()=>({status:window.__sgSite.sourceStatus,sections:document.querySelectorAll('.web-section').length,broken:[...document.images].filter(image=>!image.naturalWidth).map(image=>image.alt),unrelated:[...document.querySelectorAll('[data-image],img,a')].filter(node=>/lando/i.test((node.dataset.image||'')+' '+(node.alt||'')+' '+(node.href||''))).length,width:document.documentElement.scrollWidth,view:innerWidth}));
    assert.equal(state.sections,19);assert.deepEqual(state.broken,[]);assert.equal(state.unrelated,0);assert(state.width<=state.view+1);
    assert(Object.values(state.status).every(value=>value===(success?'source':'fallback')));
    if(!success){await page.screenshot({path:output+'mining-hero.png'});await page.evaluate(()=>document.querySelector('.photo-fan').scrollIntoView({block:'center',behavior:'instant'}));await sleep(900);await page.screenshot({path:output+'mining-fan.png'});}
    for(const name of Object.keys(sources)){
      await page.evaluate(name=>document.querySelector(`[data-image="${name}"]`).scrollIntoView({block:'center',behavior:'instant'}),name);await sleep(500);
      await page.click(`[data-image="${name}"]`);await sleep(150);assert(await page.$eval('#viewer',node=>node.open));
      if(success)assert.equal(await page.$eval('#viewer-world img',node=>node.src),name==='chinalco-plant'?plantUrl:sources[name].url);
      await page.click('#zoom-in');assert((await page.evaluate(()=>window.__sgSite.zoom))>1);await page.click('#viewer-close');
    }
    await page.setViewport({width:390,height:844});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await sleep(700);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if(!success)await page.screenshot({path:output+'mining-mobile.png'});
    report.checks.push(success?'Three supplied source routes load and update hero/cards/viewer in the intercepted success scenario.':'All unrelated photos removed; embedded mining/training fallback is readable and zoomable when source requests fail.');
    await page.close();
  }
  assert.equal(report.errors.length,0);
  report.checks.push('19 sections retained; three replacement-image viewers support zoom; desktop/mobile layout has no horizontal overflow; no JavaScript errors.');
}finally{await fs.writeFile(output+'image-report.json',JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify(report,null,2));
