// Instalación PWA y disponibilidad sin conexión.
(function(){
 const box=document.getElementById('installBox'),help=document.getElementById('installHelp');
 const install=document.getElementById('installBtn');
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const standalone=window.matchMedia('(display-mode: standalone)').matches || navigator.standalone===true;
 const secure=window.isSecureContext && location.protocol!=='file:';
 let deferred=null;
 if(standalone){box.hidden=true;}
 else if(!secure){help.textContent='Para instalarla, primero publícala en una dirección HTTPS. Abrir index.html directamente no permite instalarla.';}
 else if(ios){help.textContent='En iPhone/iPad: abre en Safari, pulsa Compartir y selecciona «Añadir a pantalla de inicio».';}
 else {help.textContent='En laptop usa Chrome o Edge; en Android usa Chrome. Elige «Instalar aplicación» en el menú del navegador.';}
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;install.classList.remove('hidden');help.textContent='La aplicación está lista para instalarse en este dispositivo.';});
 install.addEventListener('click',async()=>{if(!deferred){alert('Abre el menú de Chrome (⋮) y elige «Instalar aplicación» o «Añadir a pantalla principal».');return;}const prompt=deferred;deferred=null;install.classList.add('hidden');await prompt.prompt();});
 document.getElementById('installInfoBtn').addEventListener('click',()=>alert(!secure?'Primero aloja todos los archivos en un sitio HTTPS, por ejemplo GitHub Pages. Abrir el HTML desde archivos locales no instala la PWA.':ios?'iPhone/iPad: abre el sitio en Safari > botón Compartir > Añadir a pantalla de inicio > Añadir.': 'Laptop: abre en Chrome o Edge y usa el icono Instalar de la barra de direcciones. Android: Chrome > menú ⋮ > Instalar aplicación. También puedes usar el botón Instalar si aparece.'));
 document.getElementById('installDismiss').addEventListener('click',()=>{box.hidden=true;});
 window.addEventListener('appinstalled',()=>{box.hidden=true;deferred=null;});
 if('serviceWorker' in navigator && secure){window.addEventListener('load',async()=>{try{const reg=await navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'});await reg.update();}catch(err){console.warn('No se pudo actualizar modo sin conexión:',err)}});}
})();
