/* DIBISER nube v35 — REST Supabase con acceso autenticado y políticas RLS.
   Nunca usar service_role ni claves secretas aquí. */
(function(){
'use strict';
const K='dibiser_cloud_config',S='dibiser_cloud_session',L='dibiser_private_invite';
let cfg={},session=null,cache=null,cacheTime=0,memberStatus=false,inviteToken='';
try{inviteToken=localStorage.getItem(L)||'';const fromUrl=new URLSearchParams(location.hash.slice(1)).get('acceso');if(fromUrl&&/^[0-9a-f]{64}$/.test(fromUrl)){inviteToken=fromUrl;localStorage.setItem(L,inviteToken);history.replaceState(null,'',location.pathname+location.search);}}catch{}
try{cfg=JSON.parse(localStorage.getItem(K)||'{}');session=JSON.parse(localStorage.getItem(S)||'null');}catch{}
const configured=()=>/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.url||'')&&!!cfg.key;
/* Clave publicable del proyecto, segura para uso web con RLS. Nunca service_role. */
if(!configured()){cfg={url:"https://afkghhioiklvnucwhylz.supabase.co",key:"sb_publishable_cvdWumZ_RPMqhx0n2ahsAw_Ti7CwkHC"};localStorage.setItem(K,JSON.stringify(cfg));}

const linkMode=()=>/^[0-9a-f]{64}$/.test(inviteToken);
async function activatePrivateLink(raw){
 const value=String(raw||'').trim();
 let token=value;
 if(value.includes('#acceso=')){
  try{token=new URLSearchParams(value.split('#')[1]||'').get('acceso')||'';}
  catch{token='';}
 }
 token=token.toLowerCase();
 if(!/^[0-9a-f]{64}$/.test(token))throw Error('Pega el enlace privado completo de DIBISER, no la dirección pública.');
 const old=inviteToken;
 inviteToken=token;
 try{
  const valid=await privateRpc('check',{});
  if(!valid)throw Error('El enlace privado no está autorizado o fue revocado.');
  memberStatus=true;
  cache=null;cacheTime=0;
  localStorage.setItem(L,token);
  return true;
 }catch(error){inviteToken=old;memberStatus=false;throw error;}
}
const connected=()=>configured()&&(linkMode()||!!session?.access_token);
const status=()=>({configured:configured(),connected:connected(),authorized:connected()&&memberStatus,linkMode:linkMode(),email:linkMode()?'Acceso por enlace privado':session?.user?.email||''});
function setup(url,key){
 url=String(url||'').trim().replace(/\/$/,'');key=String(key||'').trim();
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)||!key)throw Error('Introduce URL https://...supabase.co y clave publicable (anon/publishable)');
 cfg={url,key};session=null;cache=null;localStorage.setItem(K,JSON.stringify(cfg));localStorage.removeItem(S);
}
function clear(){session=null;cache=null;memberStatus=false;inviteToken='';localStorage.removeItem(S);localStorage.removeItem(L);}
function headers(auth){return {'apikey':cfg.key,'Content-Type':'application/json',...(auth?{'Authorization':'Bearer '+session.access_token}:{} )};}
async function errorResponse(r){let t=await r.text();try{let j=JSON.parse(t);return j.message||j.msg||j.error_description||j.error||t}catch{return t||'HTTP '+r.status}}
async function refresh(){
 if(!configured()||!session?.refresh_token)throw Error('Inicia sesión en DIBISER nube');
 const r=await fetch(cfg.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:headers(false),body:JSON.stringify({refresh_token:session.refresh_token})});
 if(!r.ok){clear();throw Error('Tu sesión venció. Inicia sesión nuevamente.');}
 session=await r.json();localStorage.setItem(S,JSON.stringify(session));
}
async function privateRpc(name,args){
 if(!linkMode())throw Error('Necesitas un enlace privado de DIBISER.');
 return request('/rest/v1/rpc/dibiser_link_'+name,{method:'POST',body:JSON.stringify({p_token:inviteToken,...args})},true);
}
async function request(path,opt={},noAuth=false){
 if(!configured())throw Error('La base de datos no está configurada');
 if(!noAuth&&!connected())throw Error('Inicia sesión para consultar el historial central');
 if(!noAuth && session.expires_at && Date.now()/1000>session.expires_at-60)await refresh();
 let r;
 try{r=await fetch(cfg.url+path,{...opt,headers:{...headers(!noAuth),...(opt.headers||{})},cache:'no-store'});}
 catch{throw Error('Sin conexión con la base central. No se guardó el movimiento.');}
 if(!r.ok && r.status===401&&!noAuth){await refresh();r=await fetch(cfg.url+path,{...opt,headers:{...headers(true),...(opt.headers||{})},cache:'no-store'});}
 if(!r.ok)throw Error(await errorResponse(r));
 const raw=await r.text();return raw?JSON.parse(raw):null;
}
async function login(email,password){
 if(!configured())throw Error('Configura primero la base de datos');
 const s=await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})},true);
 if(!s.access_token)throw Error('No se recibió sesión');session=s;localStorage.setItem(S,JSON.stringify(s));cache=null;memberStatus=false;return s;
}
async function signup(email,password){
 if(!configured())throw Error('La base central no está configurada');
 const response=await request('/auth/v1/signup',{method:'POST',body:JSON.stringify({email,password})},true);
 return response;
}
async function member(){
 if(!connected())return false;
 if(linkMode()){memberStatus=await privateRpc('check',{});return memberStatus;}
 const rows=await request('/rest/v1/dibiser_team_members?select=user_id&limit=1');
 memberStatus=Array.isArray(rows)&&rows.length>0;
 return memberStatus;
}
function logout(){clear();}
async function all(force=false){
 if(!connected())throw Error('Acceso central no autorizado');
 if(!force&&cache&&Date.now()-cacheTime<8000)return cache.slice();
 let offset=0,records=[];
 while(true){
  const page=linkMode()?await privateRpc('records',{p_offset:offset,p_limit:500}):await request('/rest/v1/dibiser_movements?select=payload&order=updated_at.desc&limit=500&offset='+offset);
  records.push(...(linkMode()?page:page.map(x=>x.payload)));if(page.length<500)break;offset+=500;
 }
 cache=records.sort((a,b)=>String(b.iso).localeCompare(String(a.iso)));cacheTime=Date.now();return cache.slice();
}
async function save(row,manualGuide=null,importing=false){
 const args={p_record:row,p_manual_guia:manualGuide,p_import:importing};
 const result=linkMode()?await privateRpc('save',args):await request('/rest/v1/rpc/dibiser_save_movement',{method:'POST',body:JSON.stringify(args)});
 cache=null;return result;
}
async function update(row,expectedVersion=0){
 const args={p_id:row.id,p_record:row,p_expected_version:expectedVersion};
 const result=linkMode()?await privateRpc('update',args):await request('/rest/v1/rpc/dibiser_update_movement',{method:'POST',body:JSON.stringify(args)});
 cache=null;return result;
}
async function preview(){return linkMode()?privateRpc('preview',{}):request('/rest/v1/rpc/dibiser_preview_guide',{method:'POST',body:'{}'});}
async function catalogItems(){
 return linkMode()?privateRpc('catalogs',{}):request('/rest/v1/dibiser_catalog_items?select=kind,value&limit=10000');
}
async function saveCatalog(kind,value){
 if(!connected())return;
 if(linkMode())return privateRpc('add_catalog',{p_kind:kind,p_value:value});
 await request('/rest/v1/dibiser_catalog_items',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates'},body:JSON.stringify({kind,value})});
}
async function importRows(rows,onProgress){
 if(!connected())throw Error('Inicia sesión');
 let done=0;
 for(const row of rows){await save(row,null,true);done++;if(onProgress)onProgress(done,rows.length);}
 return done;
}
window.DibiserCloud={setup,configured,connected,status,activatePrivateLink,login,signup,member,logout,all,save,update,preview,catalogItems,saveCatalog,importRows};
})();
