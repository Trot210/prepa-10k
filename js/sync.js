/* ---------- SYNCHRO ENTRE APPAREILS ---------- */
/* Pas de compte : un code secret (32 caractères) identifie ton suivi côté Supabase.
   Chaque modification est horodatée (state.mt) et la fusion garde la plus récente. */

const SYNC_KEY="prepa10kSyncCode";
let lastFlat=null,syncBusy=false,syncAgain=false,syncTimer=null,syncInfo="";

const syncCfgOk=()=>typeof SYNC_CFG!=="undefined"&&!!SYNC_CFG.url&&!!SYNC_CFG.key;
function syncCode(){try{return localStorage.getItem(SYNC_KEY)||"";}catch(e){return"";}}

/* Vue « à plat » du suivi : une entrée par séance cochée, par ressenti, plus test et objectif. */
function flat(s){
  const o={};
  Object.keys(s.done||{}).forEach(k=>{if(s.done[k])o["d."+k]="1";});
  Object.keys(s.logs||{}).forEach(k=>{o["l."+k]=JSON.stringify(s.logs[k]);});
  o.test=s.test||"";o.target=s.target||"43:00";
  return o;
}
const sig=s=>JSON.stringify([Object.entries(flat(s)).sort(),Object.entries(s.mt||{}).sort()]);
const shared=s=>({done:s.done,logs:s.logs,test:s.test,target:s.target,mt:s.mt||{}});

/* Horodate ce qui a changé depuis la dernière sauvegarde (appelé par save()). */
function stampInit(){lastFlat=flat(state);}
function stamp(){
  const cur=flat(state),prev=lastFlat||{},now=Date.now();
  state.mt=state.mt||{};
  new Set([...Object.keys(cur),...Object.keys(prev)]).forEach(k=>{if(cur[k]!==prev[k])state.mt[k]=now;});
  lastFlat=cur;
}

/* Fusion : pour chaque élément, la modification la plus récente gagne (suppression comprise). */
function mergeStates(a,b){
  const fa=flat(a),fb=flat(b),ma=a.mt||{},mb=b.mt||{};
  const out={done:{},logs:{},test:"",target:"43:00",mt:{},week:a.week};
  new Set([...Object.keys(fa),...Object.keys(fb),...Object.keys(ma),...Object.keys(mb)]).forEach(k=>{
    const ta=k in ma?ma[k]:(k in fa?0:-1),tb=k in mb?mb[k]:(k in fb?0:-1);
    const f=ta>=tb?fa:fb,t=Math.max(ta,tb);
    if(t>0)out.mt[k]=t;
    if(!(k in f))return;
    if(k.startsWith("d."))out.done[k.slice(2)]=true;
    else if(k.startsWith("l."))out.logs[k.slice(2)]=JSON.parse(f[k]);
    else out[k]=f[k];
  });
  return out;
}

async function rpc(fn,args){
  const h={"Content-Type":"application/json",apikey:SYNC_CFG.key};
  if(!SYNC_CFG.key.startsWith("sb_"))h.Authorization="Bearer "+SYNC_CFG.key;
  const r=await fetch(SYNC_CFG.url.replace(/\/$/,"")+"/rest/v1/rpc/"+fn,{method:"POST",headers:h,body:JSON.stringify(args)});
  if(!r.ok)throw new Error("HTTP "+r.status);
  const t=await r.text();return t?JSON.parse(t):null;
}

async function syncNow(manual){
  if(!syncCfgOk()||!syncCode())return;
  if(syncBusy){syncAgain=true;return;}
  syncBusy=true;
  try{
    const code=syncCode(),remote=(await rpc("sync_get",{p_id:code}))||{};
    const before=sig(state),merged=mergeStates(state,remote);
    state=merged;lastFlat=flat(state);persist();
    if(sig(merged)!==sig(remote))await rpc("sync_put",{p_id:code,p_data:shared(merged)});
    syncInfo="Synchronisé à "+new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
    if(sig(merged)!==before){renderPaces();refresh();}
    if(manual)toast("Synchronisation terminée");
  }catch(e){
    syncInfo="Hors ligne : nouvel essai automatique";
    if(manual)toast("Synchronisation impossible");
  }finally{
    syncBusy=false;renderSync();
    if(syncAgain){syncAgain=false;syncSoon();}
  }
}
function syncSoon(){if(!syncCode()||!syncCfgOk())return;clearTimeout(syncTimer);syncTimer=setTimeout(()=>syncNow(),1500);}

/* ----- activation ----- */
function syncGenCode(){const a=new Uint8Array(24);crypto.getRandomValues(a);return btoa(String.fromCharCode(...a)).replace(/\+/g,"-").replace(/\//g,"_");}
const syncLink=()=>location.origin+location.pathname+"#sync="+syncCode();
function syncEnable(code){try{localStorage.setItem(SYNC_KEY,code);}catch(e){}renderSync();syncNow(true);}
function syncDisable(){try{localStorage.removeItem(SYNC_KEY);}catch(e){}syncInfo="";renderSync();toast("Synchronisation désactivée sur cet appareil");}
function syncFromText(t){const m=String(t||"").match(/([A-Za-z0-9_-]{32,})\s*$/);if(!m){toast("Code non reconnu");return;}syncEnable(m[1]);}
function syncCopyLink(){
  const l=syncLink();
  (navigator.clipboard?navigator.clipboard.writeText(l):Promise.reject()).then(()=>toast("Lien copié : garde-le privé"),()=>prompt("Copie ce lien (garde-le privé) :",l));
}

function renderSync(){
  const el=document.getElementById("syncBox");if(!el)return;
  if(!syncCfgOk()){el.innerHTML="";return;}
  const on=!!syncCode();
  el.innerHTML=`<div class="card" style="max-width:520px;margin:0 auto 14px;text-align:left"><div style="font-weight:800;color:var(--text);margin-bottom:4px">Synchroniser mes appareils</div>`+(on
    ?`<div style="margin-bottom:10px">Active sur cet appareil · ${syncInfo||"en attente"}</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-sync="now">Synchroniser</button><button class="btn pri" data-sync="link">Lien pour un autre appareil</button><button class="btn" data-sync="off">Désactiver</button></div><div style="margin-top:8px;font-size:12px">Le lien donne accès à ton suivi : ne le partage pas.</div>`
    :`<div style="margin-bottom:10px">Retrouve tes séances cochées et tes ressentis sur le téléphone, le Mac et le PC.</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" data-sync="new">Activer sur cet appareil</button><button class="btn" data-sync="join">J'ai déjà un code</button></div>`)+`</div>`;
}

function syncInit(){
  const m=location.hash.match(/sync=([A-Za-z0-9_-]{32,})/);
  if(m&&syncCfgOk()){try{localStorage.setItem(SYNC_KEY,m[1]);}catch(e){}history.replaceState(null,"",location.pathname+location.search);}
  renderSync();syncNow();
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)syncNow();});
  window.addEventListener("online",()=>syncNow());
  setInterval(syncNow,120000);
}
