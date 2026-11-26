/* ---------- SORTIES IMPORTÉES, CHARGE ET FORME, CHAUSSURES ---------- */
const escH=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
/* Les sorties sont rangées dans le suivi de la séance (state.logs[id].act) ; une sortie hors plan
   est rangée sous une clé « x-AAAAMMJJ-HHMM ». Tout reste dans le navigateur (et la synchro). */
const GZ=[117,137,157,176];                       // bornes hautes des zones Garmin de Lucien
const gzone=h=>h<=GZ[0]?0:h<=GZ[1]?1:h<=GZ[2]?2:h<=GZ[3]?3:4;
const GZC=["#94a3b8","#22c55e","#14b8a6","#f59e0b","#ef4444"];
const RPE_DEF={recup:2,ef:3,long:4,fart:6,seuil:6,frac:7,spec:7,test:8,race:9};
const pace1=(t,d)=>d>0?pace(Math.round(t/d*1000)):"—";
const clk=t=>clock(t).replace("h",":").replace("'",":");

/* ----- analyse d'une sortie par rapport à la séance prévue ----- */
function analyzeAct(sum,s){
  const steps=s?workoutSteps(s):[],recs=sum._recs;
  const inRange=(a,b,lo,hi)=>{let tin=0,tot=0;recs.forEach(([t,h,dt])=>{if(t<a||t>=b||h==null)return;tot+=dt;if(h>=lo&&h<=hi)tin+=dt;});return tot?tin/tot:null;};
  const laps=sum.laps.map((l,i)=>{
    const st=l.step!=null&&steps[l.step]&&!steps[l.step].repeat?steps[l.step]:null;
    const tg=st?(st.pace?{p:st.pace}:st.hr?{h:st.hr}:null):null;
    const lp=l.d>0?l.t/l.d*1000:null;let ok=null,pin=null;
    if(tg&&tg.p&&lp)ok=lp<=tg.p[0]+3&&lp>=tg.p[1]-3;
    if(tg&&tg.h&&l.st!=null&&l.end!=null){pin=inRange(l.st,l.end,tg.h[0],tg.h[1]);ok=pin==null?null:pin>=.8;}
    return{n:st?st.name:"Tour "+(i+1),t:l.t,d:l.d,hr:l.hr,tg,ok,pin:pin==null?null:Math.round(pin*100)};
  });
  // temps dans la cible de FC : sur les étapes pilotées à la FC, sinon sur toute la sortie (plafond EF)
  let inT=null;const hrL=sum.laps.map((l,i)=>[l,laps[i]]).filter(([l,x])=>x.tg&&x.tg.h&&l.st!=null);
  if(hrL.length){let a=0,b=0;hrL.forEach(([l,x])=>{recs.forEach(([t,h,dt])=>{if(t<l.st||t>=l.end||h==null)return;b+=dt;if(h>=x.tg.h[0]&&h<=x.tg.h[1])a+=dt;});});
    if(b)inT={pct:Math.round(a/b*100),lab:"du temps facile dans la cible de FC"};}
  else{const cap=s?efCap(s):138;if(cap){const r=inRange(0,1e9,0,cap);if(r!=null)inT={pct:Math.round(r*100),cap,lab:`du temps sous ${cap} bpm`};}}
  const z=[0,0,0,0,0];recs.forEach(([t,h,dt])=>{if(h!=null)z[gzone(h)]+=dt;});
  return{start:sum.start,date:sum.date,dur:sum.dur,dist:sum.dist,hrAvg:sum.hrAvg,hrMax:sum.hrMax,hr15:sum.hr15,km:sum.km,laps,inT,z:z.map(Math.round)};
}

/* ----- import ----- */
let IMP=[];
function actLogs(){return Object.entries(state.logs||{}).filter(([k,l])=>l&&l.act).map(([k,l])=>({k,l,s:ALL.find(x=>x.id===k)||null}));}
function importFiles(files){
  const arr=[...files];if(!arr.length)return;
  Promise.all(arr.map(f=>f.arrayBuffer().then(b=>{try{return{f,sum:summarizeFit(readFit(b))};}catch(e){return{f,err:e.message};}}))).then(res=>{
    IMP=res;const known=new Set(actLogs().map(x=>x.l.act.start));
    const cand=d=>ALL.filter(s=>Math.abs((D(sdate(s))-D(d))/864e5)<=3).sort((a,b)=>Math.abs(D(sdate(a))-D(d))-Math.abs(D(sdate(b))-D(d)));
    $("#moreBody").innerHTML=`<div class="grab"></div><div class="eyebrow" style="color:#4ade80">Importer des sorties</div><div class="qsTitle">${res.length} fichier${res.length>1?"s":""}</div>
     ${res.map((r,i)=>{if(r.err)return`<div class="impRow"><b>${escH(r.f.name)}</b><div class="mut" style="color:#f59e0b">${escH(r.err)}</div></div>`;
       const a=r.sum,dup=known.has(a.start),c=cand(a.date),def=dup?"skip":(c.find(s=>sdate(s)===a.date&&!(state.logs[s.id]||{}).act)||c.find(s=>!state.done[s.id]&&!(state.logs[s.id]||{}).act)||{id:"free"}).id;
       return`<div class="impRow"><b>${fdate(a.date,{weekday:"long",day:"numeric",month:"short"})} · ${new Date(a.start).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</b><div class="mut">${clk(a.dur)} · ${km(a.dist/1000)} km${a.hrAvg?" · FC "+a.hrAvg:""}${dup?' · <span style="color:#f59e0b">déjà importée</span>':""}</div>
        <select data-imp="${i}">${c.map(s=>`<option value="${s.id}" ${s.id===def?"selected":""}>${fdate(sdate(s),{weekday:"short",day:"numeric",month:"short"})} · ${s.title}${state.done[s.id]?" (validée)":""}</option>`).join("")}<option value="free" ${def==="free"?"selected":""}>Sortie hors plan</option><option value="skip" ${def==="skip"?"selected":""}>Ne pas importer</option></select></div>`;}).join("")}
     <button class="btn ok qSave" data-impgo>Importer</button><button class="btn" style="width:100%;margin-top:8px" data-moreclose>Annuler</button>`;
    $("#more").classList.add("on");document.body.style.overflow="hidden";
  });
}
function importGo(){
  let n=0;
  document.querySelectorAll("#moreBody [data-imp]").forEach(sel=>{
    const r=IMP[+sel.dataset.imp],v=sel.value;if(!r||r.err||v==="skip")return;
    const s=v==="free"?null:ALL.find(x=>x.id===v),act=analyzeAct(r.sum,s);act.file=r.f.name;
    const key=s?s.id:"x-"+r.sum.date.replace(/-/g,"")+"-"+new Date(r.sum.start).toTimeString().slice(0,5).replace(":","");
    const old=state.logs[key]||{};
    state.logs[key]=Object.assign({},old,{dur:clk(act.dur),dist:String(Math.round(act.dist/10)/100),fc:act.hrAvg?String(act.hrAvg):old.fc||"",act},!old.shoe&&defShoe()?{shoe:defShoe()}:{});
    delete state.logs[key].skip;
    if(s)state.done[s.id]=true;n++;
  });
  closeMore();save();refresh();renderActs();
  toast(n?`${n} sortie${n>1?"s":""} importée${n>1?"s":""} · note ton ressenti`:"Rien d'importé",3000);
}

/* ----- affichage d'une sortie ----- */
function hrChart(a,cap){
  const v=a.hr15,W=600,H=150,n=v.length;if(n<4)return"";
  const vals=v.filter(x=>x>0),lo=Math.min(95,...vals),hi=Math.max(cap?cap+15:150,...vals)+3;
  const y=h=>H-8-(h-lo)/(hi-lo)*(H-20),x=i=>i/(n-1)*W;
  let path="";v.forEach((h,i)=>{if(h>0)path+=(path&&v[i-1]>0?"L":"M")+x(i).toFixed(1)+" "+y(h).toFixed(1);});
  const cy=cap?y(cap):null;
  return`<svg viewBox="0 0 ${W} ${H}" class="hrc" preserveAspectRatio="none">${cap?`<defs><clipPath id="ca"><rect x="0" y="0" width="${W}" height="${cy}"/></clipPath><clipPath id="cb"><rect x="0" y="${cy}" width="${W}" height="${H}"/></clipPath></defs><line x1="0" x2="${W}" y1="${cy}" y2="${cy}" stroke="#ff3b5c" stroke-dasharray="6 5" stroke-width="1.5" vector-effect="non-scaling-stroke"/><path d="${path}" fill="none" stroke="#22c55e" stroke-width="2" vector-effect="non-scaling-stroke" clip-path="url(#cb)"/><path d="${path}" fill="none" stroke="#ff3b5c" stroke-width="2.4" vector-effect="non-scaling-stroke" clip-path="url(#ca)"/>`:`<path d="${path}" fill="none" stroke="#f59e0b" stroke-width="2" vector-effect="non-scaling-stroke"/>`}</svg><div class="hrcAx"><span>0'</span>${cap?`<span style="color:#ff6b84">— ${cap} bpm</span>`:""}<span>${Math.round(a.dur/60)}'</span></div>`;
}
function actBlock(a,s){
  const cap=s?efCap(s):138,l=s?state.logs[s.id]||{}:{};
  const row=(k,p,r,ok)=>`<div class="cmpR"><span class="mut">${k}</span><span>${p}</span><b${ok===false?' style="color:#f59e0b"':ok?' style="color:#4ade80"':""}>${r}</b></div>`;
  const cmp=s?`<div class="cmp"><div class="cmpR cmpH"><span></span><span>Prévu</span><span>Réalisé</span></div>${row("Durée",dur(s.t),clk(a.dur))}${row("Distance",km(s.d)+" km",km(a.dist/1000)+" km")}${row("FC moyenne",cap?"≤ "+cap:"—",a.hrAvg||"—",cap&&a.hrAvg?a.hrAvg<=cap:null)}</div>`:"";
  const inT=a.inT?`<div class="inT"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><b>Fréquence cardiaque</b><span><b style="font-size:20px;color:${a.inT.pct>=85?"#4ade80":a.inT.pct>=65?"#f59e0b":"#ff6b84"}">${a.inT.pct} %</b> <span class="mut" style="font-size:12.5px">${a.inT.lab}</span></span></div><div class="inBar"><i style="width:${a.inT.pct}%"></i></div></div>`:`<b>Fréquence cardiaque</b>`;
  const zt=a.z.reduce((x,y)=>x+y,0)||1;
  const zones=`<div class="zBar">${a.z.map((t,i)=>t?`<i style="width:${t/zt*100}%;background:${GZC[i]}" title="Zone ${i+1}"></i>`:"").join("")}</div><div class="zLeg">${a.z.map((t,i)=>t?`<span><i style="background:${GZC[i]}"></i>Z${i+1} ${Math.round(t/60)}'</span>`:"").join("")}</div>`;
  const tgL=a.laps.filter(x=>x.tg);
  const laps=tgL.length?`<details class="sec fold"${tgL.some(x=>x.tg.p)?" open":""}><summary>Étapes de la séance · ${tgL.filter(x=>x.ok).length} / ${tgL.filter(x=>x.ok!=null).length} dans la cible</summary><div class="lapT"><div class="lapR lapH"><span title="Étape de la séance enregistrée par la montre">Étape</span><span title="Durée de l'étape">Durée</span><span title="Allure moyenne au kilomètre ; distance parcourue pour les étapes de moins de 200 m">Allure</span><span title="Fréquence cardiaque moyenne de l'étape">FC moy.</span><span title="Ce que prévoyait la séance">Cible</span><span></span></div>${a.laps.map(x=>`<div class="lapR"><span>${escH(x.n)}</span><span>${clk(x.t)}</span><span>${x.d>=200?pace1(x.t,x.d):x.d+" m"}</span><span>${x.hr||""}</span><span class="mut">${x.tg?x.tg.p?pace(x.tg.p[1])+"–"+pace(x.tg.p[0]):(x.pin!=null?x.pin+" % ":"")+"≤ "+x.tg.h[1]:""}</span><b>${x.ok==null?"":x.ok?'<span style="color:#4ade80">✓</span>':'<span style="color:#f59e0b">⚠</span>'}</b></div>`).join("")}</div>
   <div class="lapLeg"><span><b>Allure</b> temps moyen au km (min/km) ; distance parcourue pour les étapes courtes</span><span><b>FC moy.</b> fréquence cardiaque moyenne, en bpm</span><span><b>Cible</b> plage d'allure prévue, ou part du temps sous le plafond de FC</span><span><b style="color:#4ade80">✓</b> dans la cible <b style="color:#f59e0b;margin-left:6px">⚠</b> hors cible · sans symbole : étape libre (trot, marche, lignes droites)</span></div></details>`:"";
  const kms=a.km.length?`<details class="sec fold"><summary>Kilomètres · ${a.km.length}</summary><div class="lapLeg" style="margin:0 0 8px"><span><b>N°</b> du kilomètre · <b>allure</b> (min/km) · <b>FC</b> moyenne</span></div><div class="kmL">${a.km.map((k,i)=>`<span><b>${i+1}</b> ${pace(k[0])}${k[1]?` · ${k[1]}`:""}</span>`).join("")}</div></details>`:"";
  let tip="";
  if(a.inT&&cap&&a.inT.pct<85)tip=`<div class="note warn" style="margin-top:10px;font-size:13.5px">${100-a.inT.pct} % du temps facile au-dessus de la cible. Sur la prochaine EF, ralentis dès que la montre vibre, et marche 20" en côte si besoin.</div>`;
  else if(tgL.some(x=>x.tg.p&&x.ok===false))tip=`<div class="note warn" style="margin-top:10px;font-size:13.5px">Certaines fractions sont hors de la plage d'allure. Plus rapide que prévu : garde de la marge pour les dernières ; plus lent : vérifie la fatigue de la semaine.</div>`;
  return`<div class="sec act"><h4>Sortie importée · ${escH(a.file||"montre")}</h4>${cmp}<div class="card2b">${inT}${hrChart(a,cap)}${zones}</div>${tip}${laps}${kms}</div>`;
}
function openAct(k){
  const l=state.logs[k];if(!l||!l.act)return;
  $("#panel").style.setProperty("--tc","#06b6d4");
  $("#panel").innerHTML=`<div class="phd"><button class="close" data-close>×</button><span class="badge" style="background:#06b6d422;color:#06b6d4;border:1px solid #06b6d455">Sortie hors plan</span><h2>${fdate(l.act.date,{weekday:"long",day:"numeric",month:"long"})}</h2><div class="stats"><div class="stat"><div class="l">Durée</div><div class="v">${clk(l.act.dur)}</div></div><div class="stat"><div class="l">Distance</div><div class="v">${km(l.act.dist/1000)} km</div></div><div class="stat"><div class="l">FC moy.</div><div class="v">${l.act.hrAvg||"—"}</div></div></div></div>
   <div class="pbd">${actBlock(l.act,null)}<div class="sec"><button class="btn" data-actdel="${k}">Supprimer cette sortie</button></div></div>`;
  $("#ov").classList.add("on");document.body.style.overflow="hidden";
}

/* ----- charge d'entraînement : durée (min) × ressenti (méthode sRPE) ----- */
function loadItems(){
  const out=[];
  Object.entries(state.logs||{}).forEach(([k,l])=>{
    const s=ALL.find(x=>x.id===k);
    if(s&&!state.done[k])return;if(!s&&!(l&&l.act))return;
    const date=s?sdate(s):l.act.date,min=(l.act?l.act.dur:parseT(l.dur)||s.t)/60;
    const rpe=+l.rpe||(s?RPE_DEF[s.type]||4:4);out.push({date,load:Math.round(min*rpe),est:!+l.rpe});
  });
  ALL.forEach(s=>{if(state.done[s.id]&&!state.logs[s.id])out.push({date:sdate(s),load:Math.round(s.t/60*(RPE_DEF[s.type]||4)),est:true});});
  return out;
}
function chargeCard(){
  const items=loadItems().filter(x=>x.date<=TODAY);
  if(!items.length)return`<div class="card"><b>Charge et forme</b><div class="mut" style="margin-top:6px">Valide tes séances (avec ton ressenti) pour voir ta charge d'entraînement semaine par semaine.</div></div>`;
  const mon=ds=>{const d=D(ds),w=(d.getDay()+6)%7;d.setDate(d.getDate()-w);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
  const wk={};items.forEach(x=>{const m=mon(x.date);wk[m]=(wk[m]||0)+x.load;});
  const cur=mon(TODAY),weeks=[];for(let i=7;i>=0;i--)weeks.push(addDays(cur,-7*i));
  const first=Object.keys(wk).sort()[0],ws=weeks.filter(m=>m>=first);
  const vals=ws.map(m=>wk[m]||0),mx=Math.max(...vals,1);
  // forme = fraîcheur : charge chronique (42 j) − charge aiguë (7 j), moyennes exponentielles
  const day={};items.forEach(x=>{day[x.date]=(day[x.date]||0)+x.load;});
  let atl=0,ctl=0;const tsb={};for(let d=first;d<=TODAY;d=addDays(d,1)){const l=day[d]||0;atl+=(l-atl)/7;ctl+=(l-ctl)/42;if(ws.includes(mon(d)))tsb[mon(d)]=ctl-atl;}
  const tv=ws.map(m=>tsb[m]||0),tmax=Math.max(...tv.map(Math.abs),1);
  const W=340,bw=Math.min(40,W/ws.length-10);
  const bars=ws.map((m,i)=>{const h=vals[i]/mx*92,x=10+i*(W-20)/ws.length+((W-20)/ws.length-bw)/2;return`<rect x="${x}" y="${108-h}" width="${bw}" height="${h}" rx="5" fill="${m===cur?"#ff6a2b":"#3b82f6"}"/><text x="${x+bw/2}" y="${104-h}" fill="#e8eef6" font-size="10.5" font-weight="800" text-anchor="middle">${vals[i]||""}</text><text x="${x+bw/2}" y="124" fill="#8b9bb0" font-size="10" font-weight="700" text-anchor="middle">${fdate(m,{day:"numeric",month:"short"}).replace(".","")}</text>`;}).join("");
  const pts=ws.map((m,i)=>[10+i*(W-20)/ws.length+(W-20)/ws.length/2,60-tv[i]/tmax*40]);
  const line=pts.length>1?`<path d="${pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ")}" fill="none" stroke="#4ade80" stroke-width="2.2"/>${pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#4ade80"/>`).join("")}`:"";
  const last7=items.filter(x=>x.date>addDays(TODAY,-7)).reduce((a,x)=>a+x.load,0);
  const prev=[1,2,3].map(k=>items.filter(x=>x.date<=addDays(TODAY,-7*k)&&x.date>addDays(TODAY,-7*(k+1))).reduce((a,x)=>a+x.load,0)).filter(v=>v>0);
  const avg=prev.length?prev.reduce((a,b)=>a+b,0)/prev.length:0,ratio=avg?last7/avg:null;
  const note=ratio==null?`<div class="mut" style="font-size:13px;margin-top:8px">L'alerte de surcharge s'active après 2 semaines de données.</div>`
    :ratio>1.3?`<div class="note warn" style="margin-top:10px;font-size:13.5px">7 derniers jours : <b>+${Math.round((ratio-1)*100)} %</b> par rapport à ta moyenne. Charge en forte hausse : dors bien, garde l'EF vraiment facile, et écoute ton mollet.</div>`
    :ratio<.7?`<div class="mut" style="font-size:13px;margin-top:8px">7 derniers jours : ${Math.round((1-ratio)*100)} % sous ta moyenne. Normal en semaine allégée ou après un imprévu.</div>`
    :`<div class="mut" style="font-size:13px;margin-top:8px">7 derniers jours : charge stable par rapport à ta moyenne (${ratio>=1?"+":""}${Math.round((ratio-1)*100)} %).</div>`;
  return`<div class="card"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap"><b>Charge et forme</b><span class="mut" style="font-size:12px">charge = minutes × ressenti</span></div>
   <svg viewBox="0 0 ${W} 130" width="100%" class="chgSvg" style="display:block;margin-top:8px">${bars}${line}</svg>
   <div class="zLeg" style="margin-top:2px"><span><i style="background:#3b82f6"></i>charge de la semaine</span><span><i style="background:#4ade80;height:3px"></i>fraîcheur (plus haut = plus reposé)</span></div>${note}
   ${items.some(x=>x.est)?`<div class="mut" style="font-size:12px;margin-top:6px">Ressenti non noté : valeur estimée d'après le type de séance.</div>`:""}</div>`;
}

/* ----- écran « Mes sorties » (onglet Analyse) ----- */
let actSel=null;
const wideActs=()=>matchMedia("(min-width:1100px)").matches;
function actPane(k){
  const l=state.logs[k];if(!l||!l.act)return`<div class="mut">Sélectionne une sortie dans la liste.</div>`;
  const s=ALL.find(x=>x.id===k)||null;
  return`<div class="paneHd"><div><div class="eyebrow" style="color:${s?T[s.type].c:"#06b6d4"}">${fdate(l.act.date,{weekday:"long",day:"numeric",month:"long"})}</div><div class="paneT">${s?s.title:"Sortie hors plan"}</div></div>
   <div style="display:flex;gap:8px;flex-wrap:wrap">${s?`<button class="btn" data-open="${k}">Fiche complète</button><button class="btn ${l.rpe?"":"ok"}" data-finish="${k}">${l.rpe?"Modifier":"Noter le ressenti"}</button>`:`<button class="btn" data-actdel="${k}">Supprimer</button>`}</div></div>
   ${actBlock(l.act,s)}`;
}
function renderActs(){
  const el=$("#actsRoot");if(!el)return;
  const list=actLogs().sort((a,b)=>b.l.act.start.localeCompare(a.l.act.start)),wide=wideActs();
  if(wide&&list.length&&!list.some(x=>x.k===actSel))actSel=list[0].k;
  const row=({k,l,s})=>`<div class="wlRow${wide&&k===actSel?" sel":""}" ${wide?`data-actsel="${k}"`:s?`data-open="${k}"`:`data-act="${k}"`}><span class="wlIc" style="background:${s?T[s.type].c:"#06b6d4"}">${l.act.inT?(l.act.inT.pct>=85?"✓":"!"):"·"}</span><div style="flex:1;min-width:0"><div class="wlT">${s?s.title:"Sortie hors plan"}</div><div class="mut" style="font-size:12.5px">${fdate(l.act.date,{weekday:"short",day:"numeric",month:"short"})} · ${clk(l.act.dur)} · ${km(l.act.dist/1000)} km${l.act.hrAvg?" · FC "+l.act.hrAvg:""}${l.act.inT?" · "+l.act.inT.pct+" % en cible":""}${l.rpe?"":' · <span style="color:#f59e0b">ressenti à noter</span>'}</div></div><span class="mut">›</span></div>`;
  const head=`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div><b style="font-size:17px">Mes sorties</b><div class="mut" style="font-size:13px">${isTouch()?"Importe depuis le Mac (montre branchée), ou depuis Fichiers si tu y as copié les sorties.":"Branche la montre : les sorties sont dans GARMIN/Activity (fichiers .fit). Tu peux aussi les glisser ici."}</div></div><label class="btn ok" style="cursor:pointer">⌚ Importer des sorties<input type="file" accept=".fit,.FIT" multiple hidden id="actFile"></label></div>`;
  const items=list.length?list.slice(0,wide?30:12).map(row).join(""):`<div class="mut" style="margin-top:10px;font-size:13.5px">Aucune sortie importée pour l'instant.</div>`;
  el.innerHTML=wide&&list.length
    ?`<div class="card actsCard">${head}<div class="actsSplit"><div class="actsList">${items}</div><div class="actsPane" id="actPane">${actPane(actSel)}</div></div></div>${chargeCard()}`
    :`<div class="card actsCard">${head}${list.length?`<div style="margin-top:10px">${items}</div>`:items}</div>${chargeCard()}`;
  $("#actFile").onchange=e=>{importFiles(e.target.files);e.target.value="";};
}
/* glisser des fichiers .fit sur la page Analyse (ordinateur) */
document.addEventListener("dragover",e=>{if(curView&&curView()==="analysis"&&e.dataTransfer&&[...e.dataTransfer.types].includes("Files")){e.preventDefault();document.body.classList.add("fitdrop");}});
document.addEventListener("dragleave",e=>{if(!e.relatedTarget)document.body.classList.remove("fitdrop");});
document.addEventListener("drop",e=>{document.body.classList.remove("fitdrop");if(curView&&curView()==="analysis"&&e.dataTransfer&&e.dataTransfer.files.length){e.preventDefault();importFiles([...e.dataTransfer.files].filter(f=>/\.fit$/i.test(f.name)));}});

/* ----- chaussures ----- */
function shoesList(){return Object.entries(state.shoes||{}).map(([id,x])=>Object.assign({id},x));}
function defShoe(){const d=shoesList().find(x=>x.def&&!x.ret);return d?d.id:"";}
function shoeKm(id){const sh=(state.shoes||{})[id];if(!sh)return 0;return(+sh.km0||0)+Object.entries(state.logs||{}).reduce((a,[k,l])=>a+(l&&l.shoe===id&&(state.done[k]||l.act)?(+l.dist||0):0),0);}
function openShoes(){
  const L=shoesList();
  $("#moreBody").innerHTML=`<div class="grab"></div><div class="eyebrow" style="color:#4ade80">Chaussures</div><div class="qsTitle">Kilométrage</div>
   ${L.length?L.map(x=>{const k=shoeKm(x.id),c=k>=800?"#ff6b84":k>=600?"#f59e0b":"#4ade80";return`<div class="impRow"${x.ret?' style="opacity:.55"':""}><div style="display:flex;justify-content:space-between;gap:10px"><b>${escH(x.name)}${x.def&&!x.ret?' <span class="cpTag">par défaut</span>':""}${x.ret?" · retirée":""}</b><b style="color:${c}">${Math.round(k)} km</b></div><div class="inBar" style="margin:6px 0;background:#232e3c"><i style="width:${Math.min(100,k/8)}%;background:${c}"></i></div><div class="mut" style="font-size:12.5px">${k>=800?"Fin de vie : remplace-la pour ménager tes mollets.":k>=600?"Commence à t'en chercher une nouvelle (600 à 800 km).":"Une paire dure en général 600 à 800 km."}</div>
     <div style="display:flex;gap:8px;margin-top:8px">${x.ret?`<button class="btn" data-shoe="unret:${x.id}">Remettre en service</button>`:`${x.def?"":`<button class="btn" data-shoe="def:${x.id}">Par défaut</button>`}<button class="btn" data-shoe="ret:${x.id}">Retirer</button>`}</div></div>`;}).join(""):`<div class="mut" style="margin-bottom:10px">Ajoute ta paire actuelle : chaque séance validée lui ajoute sa distance.</div>`}
   <div class="qsGrid" style="margin-top:6px"><div class="fld"><label>Nom</label><input id="shName" placeholder="Hoka Mach 6"></div><div class="fld"><label>Km déjà faits</label><input id="shKm" inputmode="numeric" placeholder="0"></div></div>
   <button class="btn ok qSave" data-shoe="add">Ajouter la paire</button><button class="btn" style="width:100%;margin-top:8px" data-moreclose>Fermer</button>`;
  $("#more").classList.add("on");document.body.style.overflow="hidden";
}
function shoeAction(a){
  state.shoes=state.shoes||{};const [op,id]=a.split(":");
  if(op==="add"){const name=$("#shName").value.trim();if(!name){toast("Donne un nom à la paire");return;}const nid="sh"+Date.now().toString(36);const first=!shoesList().some(x=>!x.ret);state.shoes[nid]={name,km0:String(+($("#shKm").value||0)||0),since:TODAY,def:first};}
  else if(op==="def"){shoesList().forEach(x=>{state.shoes[x.id]=Object.assign({},state.shoes[x.id],{def:x.id===id});});}
  else if(op==="ret"){state.shoes[id]=Object.assign({},state.shoes[id],{ret:true,def:false});}
  else if(op==="unret"){state.shoes[id]=Object.assign({},state.shoes[id],{ret:false});}
  save();openShoes();
}
