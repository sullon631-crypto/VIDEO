/* DIBISER v51 — copia local + sincronización central protegida por enlace privado.
   Nunca borra ni sustituye movimientos originales del almacén local. */
(function(){
'use strict';
const cloud=window.DibiserCloud;
const el=id=>document.getElementById(id);
let busy=false,scheduled=false,lastError='',synced=0,conflicts=0;
const setStatus=s=>{if(el('sharedStatus'))el('sharedStatus').textContent=s;};
let wasAuthorized=false;
function updateAccessLayout(authorized){
 if(authorized)wasAuthorized=true;
 // Un corte temporal de internet no debe volver a ocupar la pantalla con el panel.
 const compact=!!authorized||wasAuthorized&&!!cloud.connected();
 el('sharedPanel').classList.toggle('hidden',compact);
 el('localStorageNotice').classList.toggle('hidden',compact);
 el('sharedRefresh').classList.toggle('hidden',!compact);
}
async function storeRows(name){
 const db=await dbp;
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(name,'readonly'),req=tx.objectStore(name).getAll();
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
async function cacheShared(rows){
 if(!rows.length)return;
 const db=await dbp;
 await new Promise((resolve,reject)=>{
  const tx=db.transaction('shared_cache','readwrite'),store=tx.objectStore('shared_cache');
  for(const row of rows)if(row?.id&&row?.iso)store.put(row);
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 });
}
async function acknowledge(id,originalStamp){
 const db=await dbp;
 await new Promise((resolve,reject)=>{
  const tx=db.transaction('pending_sync','readwrite'),store=tx.objectStore('pending_sync');
  const get=store.get(id);
  get.onsuccess=()=>{
   // Si otra edición se guardó durante la subida, no borrar la nueva tarea pendiente.
   if(get.result&&get.result.changedAt===originalStamp)store.delete(id);
  };
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 });
}
async function refresh(){
 if(busy)return;
 busy=true;lastError='';conflicts=0;synced=0;
 try{
  const local=await allLocal();
  if(!cloud.connected()){
   updateAccessLayout(false);
   setStatus('Solo historial local: '+local.length+' movimientos. Para ver los de otros celulares, conecta este dispositivo con el enlace privado.');
   el('sharedAccess').classList.remove('hidden');
   return;
  }
  let verified=cloud.status().authorized;
  if(!verified)verified=await cloud.member();
  if(!verified){wasAuthorized=false;updateAccessLayout(false);setStatus('El enlace no está autorizado. Los '+local.length+' movimientos locales se mantienen intactos.');el('sharedAccess').classList.remove('hidden');return;}
  updateAccessLayout(true);
  el('sharedAccess').classList.add('hidden');
  window.DibiserCatalogs?.sync?.().catch(err=>console.warn('Catálogo sin sincronizar:',err.message));
  const rows=await cloud.all(true),remoteById=new Map(rows.map(x=>[x.id,x]));
  const pending=await storeRows('pending_sync'),pendingById=new Map(pending.map(x=>[x.id,x]));
  setStatus('Conectado. Revisando '+local.length+' registros de este dispositivo y '+rows.length+' centrales...');
  for(const row of local){
   if(!row?.id||!row?.iso)continue;
   const remote=remoteById.get(row.id),task=pendingById.get(row.id);
   // Nunca revivir un movimiento previamente eliminado en otro dispositivo.
   if(remote?.deletedAt&&!row.deletedAt){if(task)await acknowledge(row.id,task.changedAt);continue;}
   try{
    if(!remote){
     // Los movimientos antiguos también se recuperan, con la misma clave ID.
     const result=await cloud.save(row,null,true);
     if(result?.id!==row.id)throw Error('La nube no confirmó el código de movimiento');
     remoteById.set(result.id,result);synced++;
     if(task)await acknowledge(row.id,task.changedAt);
    }else if(task){
     const base=Number(task.baseVersion)||0,actual=Number(remote.editVersion)||0;
     if((Number(row.editVersion)||0)>base&&actual===base){
      const result=await cloud.update(row,actual);
      if(result?.id!==row.id)throw Error('La nube no confirmó la corrección');
      remoteById.set(result.id,result);synced++;
      await acknowledge(row.id,task.changedAt);
     }else if(actual===(Number(row.editVersion)||0)){
      // Confirmar que realmente son los mismos datos antes de retirar la tarea.
      // La guía puede cambiar por conflicto de correlativo, sin alterar el movimiento.
      const comparable=record=>{
       const copy={...record};
       for(const k of ['guia','guiaOriginal','editVersion','editedAt','editedBy'])delete copy[k];
       return JSON.stringify(Object.entries(copy).sort(([a],[b])=>a.localeCompare(b)));
      };
      if(comparable(row)===comparable(remote))await acknowledge(row.id,task.changedAt);
      else conflicts++;
     }else{conflicts++;}
    }else if((Number(row.editVersion)||0)>(Number(remote.editVersion)||0)){
     // Ediciones realizadas antes de instalar la sincronización. Solo enviar si
     // el servidor aún está en la versión inicial, evitando pisar ediciones ajenas.
     if((Number(remote.editVersion)||0)===0&&!(remote.editedAt)){
      const result=await cloud.update(row,0);
      remoteById.set(result.id,result);synced++;
     }else{conflicts++;}
    }
   }catch(err){conflicts++;lastError=err.message;}
  }
  let latest;
  try{latest=await cloud.all(true);}catch(err){latest=[...remoteById.values()];lastError=err.message;}
  try{await cacheShared(latest);
   window.DibiserCatalogs?.ingestHistory?.(latest);
  }catch(err){lastError='La copia de consultas en este dispositivo no pudo completarse: '+err.message;}
  const remains=(await storeRows('pending_sync')).length;
  const allRows=await all();
  setStatus('Historial central: '+latest.length+' movimientos · visibles aquí: '+allRows.length+' · pendientes: '+remains+
   (conflicts?' · revisar '+conflicts+' posibles conflictos':'')+
   (lastError?' · '+lastError:'')+
   '. Actualización automática activa.');
  if(!el('history').classList.contains('hidden'))await renderHistory();
  if(!el('report').classList.contains('hidden'))await renderReport();
 }catch(err){
  lastError=err.message;
  setStatus('Sin conexión central: '+err.message+'. Los registros locales se conservan; se reintentará automáticamente.');
 }finally{busy=false;}
}
function kick(){
 if(scheduled)return;
 scheduled=true;
 Promise.resolve().then(async()=>{scheduled=false;await refresh();}).catch(err=>setStatus('Sincronización pendiente: '+err.message));
}
el('sharedConnect').onclick=async()=>{
 const input=el('sharedLink'),button=el('sharedConnect');if(button.disabled)return;button.disabled=true;
 try{
  await cloud.activatePrivateLink(input.value);
  input.value='';
  setStatus('Acceso validado. Recuperando y comparando movimientos...');
  await refresh();
 }catch(err){setStatus('No se pudo conectar: '+err.message+'. Los registros del celular están seguros.');alert(err.message)}
 finally{button.disabled=false;}
};
el('sharedRefresh').onclick=kick;
window.DibiserSync={kick,refresh};
window.addEventListener('online',kick);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)kick();});
setInterval(()=>{if(!document.hidden)kick();},7000);
kick();
})();