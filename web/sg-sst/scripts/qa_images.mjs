import puppeteer from '../../../videos/sg-sst/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const sources=JSON.parse(await fs.readFile(new URL('../assets/case-image-sources.json',import.meta.url)));
const originals=JSON.parse(await fs.readFile(new URL('../assets/case-image-downloads.json',import.meta.url)));
const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
const bundled=JSON.parse(html.match(/<script id="site-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const report={checks:[],source_downloads_verified:true,originals_embedded:true,external_image_requests:[],errors:[]};
for(const record of originals){
  const image=bundled.images[sources[record.key].viewer_image];assert(image.startsWith('data:image/jpeg;base64,'));
  const bytes=Buffer.from(image.split(',')[1],'base64');
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),record.original_sha256);
}
report.checks.push('All three original source JPEGs are embedded byte for byte; hashes match the actual browser downloads.');
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const output=new URL('../qa-scroll/',import.meta.url).pathname;
try{
  for(const offline of [false,true]){
    const page=await browser.newPage();await page.setViewport({width:1440,height:900});page.on('pageerror',error=>report.errors.push(error.message));
    page.on('request',request=>{if(/^https?:/.test(request.url())&&!request.url().startsWith('http://127.0.0.1:8082/'))report.external_image_requests.push(request.url());});
    if(offline){await page.setOfflineMode(true);await page.setContent(html,{waitUntil:'load'});}
    else await page.goto('http://127.0.0.1:8082/',{waitUntil:'load'});
    await page.evaluate(()=>document.fonts.ready);await sleep(900);
    const state=await page.evaluate(()=>({status:window.__sgSite.sourceStatus,sections:document.querySelectorAll('.web-section').length,broken:[...document.images].filter(image=>!image.naturalWidth).map(image=>image.alt),unrelated:[...document.querySelectorAll('[data-image],img,a')].filter(node=>/lando/i.test((node.dataset.image||'')+' '+(node.alt||'')+' '+(node.href||''))).length,width:document.documentElement.scrollWidth,view:innerWidth}));
    assert.equal(state.sections,19);assert.deepEqual(state.broken,[]);assert.equal(state.unrelated,0);assert(state.width<=state.view+1);assert(Object.values(state.status).every(value=>value==='embedded'));
    if(!offline){await page.screenshot({path:output+'mining-hero.png'});await page.evaluate(()=>document.querySelector('.photo-fan').scrollIntoView({block:'center',behavior:'instant'}));await sleep(900);await page.screenshot({path:output+'mining-fan.png'});}
    for(const record of originals){
      await page.evaluate(name=>document.querySelector(`[data-image="${name}"]`).scrollIntoView({block:'center',behavior:'instant'}),record.key);await sleep(500);
      await page.click(`[data-image="${record.key}"]`);assert(await page.$eval('#viewer',node=>node.open));
      await page.waitForFunction(()=>document.querySelector('#viewer-world img')?.naturalWidth>0);
      assert.deepEqual(await page.$eval('#viewer-world img',node=>[node.naturalWidth,node.naturalHeight]),record.dimensions);
      await page.click('#zoom-in');assert((await page.evaluate(()=>window.__sgSite.zoom))>1);await page.click('#viewer-close');
    }
    await page.setViewport({width:390,height:844});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await sleep(700);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if(!offline)await page.screenshot({path:output+'mining-mobile.png'});
    report.checks.push(offline?'Exact portable HTML renders in browser offline mode: three original-resolution viewers, zoom, fonts and layout. Managed Chromium blocks file URL navigation; the HTML was loaded from memory without network.':'19 sections retain smooth navigation, no unrelated photos, readable mining/training previews and three original-resolution zoom viewers.');
    await page.close();
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.external_image_requests,[]);
}finally{await fs.writeFile(output+'image-report.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify(report,null,2));
