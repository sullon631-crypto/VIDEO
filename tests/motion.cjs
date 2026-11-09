// Run with Node and Playwright installed. Serve almacen/dibiser_almacen at APP_URL.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const url=process.env.APP_URL||'http://127.0.0.1:8001';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'America/Lima',recordVideo:{dir:'/workspace/artifacts/motion-video',size:{width:390,height:844}}});
 const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(url);await p.waitForTimeout(650);
 assert.equal(await p.getByText('Fotografía de evidencia (máximo 1)',{exact:true}).count(),1);
 // Interrupt view transitions faster than they can finish, then verify only one view remains.
 await p.evaluate(async()=>{for(const id of ['report','catalogs','form','history','report','form']){show(id);await new Promise(r=>setTimeout(r,40))}});
 await p.waitForTimeout(350);
 assert.deepEqual(await p.evaluate(()=>[...document.querySelectorAll('.page-stage>section:not(.hidden)')].map(e=>e.id)),['form']);
 assert.equal(await p.locator('.motion-leaving').count(),0);
 // Keyboard selection is immediate and leaves no delayed entrance.
 await p.locator('[data-tab=history]').focus();await p.keyboard.press('Enter');
 await p.waitForTimeout(80);
 assert.equal(await p.locator('#history').evaluate(e=>e.getAnimations().length),0);
 await p.locator('[data-tab=form]').click();
 // Open/close catalog options through keyboard; focused options must survive blur.
 await p.locator('#clientes').focus();await p.keyboard.press('ArrowDown');await p.keyboard.press('Enter');
 assert.ok((await p.locator('#clientes').inputValue()).length>0);
 await p.keyboard.press('Escape');
 await p.waitForTimeout(80);
 assert.equal(await p.locator('#clientes').getAttribute('aria-expanded'),'false');
 // Capture once, stop stream, refuse a second native upload, then remove and retake.
 await p.locator('#openCamera').click();await p.waitForFunction(()=>$('cameraVideo').videoWidth>0);
 await p.locator('#capturePhoto').click();await p.waitForTimeout(320);
 assert.equal(await p.locator('#preview img').count(),1);assert.equal(await p.locator('#openCamera').isDisabled(),true);
 assert.equal(await p.evaluate(()=>cameraStream===null),true);
 const photo=await p.evaluate(()=>photoData[0]);const file={name:'evidence.jpg',mimeType:'image/jpeg',buffer:Buffer.from(photo.split(',')[1],'base64')};
 await p.locator('#cameraFallback').setInputFiles(file);assert.equal(await p.evaluate(()=>photoData.length),1);
 await p.locator('#preview button').click();await p.waitForTimeout(300);assert.equal(await p.locator('#openCamera').isEnabled(),true);
 await p.locator('#cameraFallback').setInputFiles(file);await p.waitForFunction(()=>photoData.length===1&&!photoProcessing);
 // Save exactly one image, even if the form is submitted twice before IndexedDB completes.
 await p.evaluate(()=>{addCatalog('conductores','PRUEBA MOTION');for(const[k,v]of Object.entries({clientes:catalogs.clientes[0],conductores:'PRUEBA MOTION',placas:catalogs.placas[0],materiales:catalogs.materiales[0],cantidad:'12.5'}))$(k).value=v;$('movementForm').requestSubmit();$('movementForm').requestSubmit()});
 await p.waitForFunction(()=>$('msg').textContent.includes('Guardado'));
 assert.equal(await p.evaluate(async()=>(await all()).length),1);assert.equal(await p.evaluate(async()=>(await all())[0].fotos.length),1);
 // A late camera permission response must never keep the camera on after close.
 await p.evaluate(()=>{window.originalMedia=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);window.lateStream=null;navigator.mediaDevices.getUserMedia=async opts=>{const s=await originalMedia(opts);window.lateStream=s;await new Promise(r=>setTimeout(r,500));return s}});
 await p.locator('#openCamera').click();await p.locator('#closeCamera').click();await p.waitForTimeout(700);
 assert.equal(await p.evaluate(()=>lateStream.getTracks().every(t=>t.readyState==='ended')),true);
 // Status animation follows actual pending work and cleans up after completion.
 await p.evaluate(()=>{window.pendingTask=AppMotion.task($('report'),()=>new Promise(r=>setTimeout(r,400)))});
 assert.equal(await p.locator('#report').getAttribute('aria-busy'),'true');await p.evaluate(()=>pendingTask);assert.equal(await p.locator('#report').getAttribute('aria-busy'),null);
 await p.emulateMedia({reducedMotion:'reduce'});await p.locator('[data-tab=report]').click();await p.waitForTimeout(80);
 assert.equal(await p.locator('#report').evaluate(e=>e.getAnimations().length),0);
 for(const width of [390,768,1366]){await p.setViewportSize({width,height:844});for(const tab of ['form','report','history','catalogs']){await p.locator(`[data-tab=${tab}]`).click();await p.waitForTimeout(50);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true)}}
 await p.emulateMedia({reducedMotion:'no-preference'});await p.setViewportSize({width:390,height:844});await p.locator('[data-tab=form]').click();await p.waitForTimeout(350);await p.screenshot({path:'/workspace/artifacts/motion-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: interruptions, keyboard, single photo, duplicate save, late permission, loading, reduced motion, responsive layouts; no JS errors.');
 await context.close();await browser.close();
})().catch(err=>{console.error(err);process.exit(1)});
