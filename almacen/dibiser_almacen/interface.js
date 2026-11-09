// Etiquetas accesibles y navegación consistente en teclado y pantalla táctil.
document.querySelectorAll('.field').forEach(field=>{const label=field.querySelector('label'),input=field.querySelector('input:not([type=file]),select,textarea');if(label&&input?.id)label.htmlFor=input.id});
document.querySelectorAll('.add').forEach(b=>b.setAttribute('aria-label','Agregar a catálogo: '+b.closest('.field').querySelector('label').textContent.replace('*','').trim()));
const groups=[['tipo','Movimiento y fecha'],['clientes','Vehículo y operación'],['guia','Documentación y autorización'],['openCamera','Evidencias y observaciones']];
for(const[id,label]of groups){const field=$(id).closest('.field');const title=document.createElement('h3');title.className='section-heading';title.textContent=label;field.before(title)}
function navState(){document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-current',b.classList.contains('active')?'page':'false'))}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',navState));navState();
document.querySelectorAll('.scroll').forEach(el=>{el.tabIndex=0;el.setAttribute('role','region');el.setAttribute('aria-label','Tabla de registros, desplazamiento horizontal')});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.menu').forEach(el=>el.classList.add('hidden'));if(!$('cameraModal').classList.contains('hidden')){closeCamera();$('openCamera').focus()}}});
// Evita que el foco abandone la cámara mientras está abierta.
$('cameraModal').addEventListener('keydown',e=>{if(e.key!=='Tab')return;const items=[...$('cameraModal').querySelectorAll('button:not(:disabled)')],first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault()}else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault()}});
$('openCamera').addEventListener('click',()=>$('closeCamera').focus());
$('closeCamera').addEventListener('click',()=>$('openCamera').focus());
