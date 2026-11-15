/* ---------- ANALYSE DE COURSE : interface ---------- */
let ANA=null,anaPoints=null,anaCustom=false,anaTitle=RACE.name,anaAlign=true,anaMap=null,anaMarker=null,anaLeaflet=null,anaLoading=false;
const ZCOL=["#94a3b8","#22c55e","#f59e0b","#f97316","#ef4444"],ZNAME=["Zone 1 · récupération","Zone 2 · endurance","Zone 3 · tempo","Zone 4 · seuil","Zone 5 · maximale"];
const f1=x=>x.toFixed(1).replace(".",","),esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const mmss=s=>{s=Math.round(s);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");};
const fcmaxSaved=()=>{try{const v=+localStorage.getItem("prepa10kFcmax");return v>=120&&v<=230?v:null;}catch(e){return null;}};

function initAnalysis(){
  if(ANA||anaLoading){if(ANA)setTimeout(()=>{if(anaMap)anaMap.invalidateSize();},50);return;}
  anaLoading=true;$("#anaRoot").innerHTML=`<div class="card"><div class="mut">Chargement de la trace GPX…</div></div>`;
  fetch(RACE.gpx).then(r=>{if(!r.ok)throw new Error(r.status);return r.text();}).then(t=>{anaPoints=parseGpx(t);if(anaPoints.length<10)throw new Error("trace vide");anaCustom=false;anaTitle=RACE.name;runAnalysis();})
   .catch(()=>{$("#anaRoot").innerHTML=`<div class="card"><b>Impossible de charger la trace.</b><div class="mut" style="margin-top:6px">Vérifie ta connexion, ou charge un fichier GPX avec le bouton ci-dessous.</div>${anaUpload()}</div>`;})
   .finally(()=>{anaLoading=false;});
}
const anaUpload=()=>`<label class="btn" style="display:inline-block;margin-top:10px;cursor:pointer">Analyser un fichier GPX<input type="file" accept=".gpx,application/gpx+xml,text/xml" id="anaFile" hidden></label>`;
function runAnalysis(){
  const o=anaCustom?{align:false}:{official:RACE.official,objective:RACE.objective,distance:RACE.distance,align:anaAlign};
  o.fcmax=fcmaxSaved();
  ANA=analyzeRun(anaPoints,o);
  if(!ANA){$("#anaRoot").innerHTML=`<div class="card">Trace trop courte pour être analysée.</div>`;return;}
  renderAnalysis();
}

/* ---------- survol partagé graphique / carte ---------- */
let HOV={};
function idxAtD(d){const g=ANA.grid.d;let lo=0,hi=g.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(g[m]<=d)lo=m;else hi=m;}return Math.abs(g[lo]-d)<=Math.abs(g[hi]-d)?lo:hi;}
function setHover(i){
  const a=ANA,g=a.grid,c=HOV.c;if(!c||i==null){return;}
  const d=g.d[i],x=c.X(d);
  c.xl.setAttribute("x1",x);c.xl.setAttribute("x2",x);c.xl.style.display="";
  if(g.pace[i]!=null){c.dp.setAttribute("cx",x);c.dp.setAttribute("cy",c.Yp(g.pace[i]));c.dp.style.display="";}
  if(g.hr[i]!=null){c.dh.setAttribute("cx",x);c.dh.setAttribute("cy",c.Yh(g.hr[i]));c.dh.style.display="";}
  const tip=c.tip;tip.style.display="block";tip.style.left=Math.max(14,Math.min(86,x/c.W*100))+"%";
  tip.innerHTML=`<b>${f1(d/1000)} km</b> · ${clock(g.t[i])}<br><span style="color:#ff6a2b">●</span> ${g.pace[i]!=null?pace(g.pace[i])+"/km":"—"}`+(g.hr[i]!=null?`<br><span style="color:#ef4444">●</span> ${Math.round(g.hr[i])} bpm`:"")+(g.cad[i]!=null?`<br>cadence ${Math.round(g.cad[i]*a.cad.factor)} pas/min`:"")+(g.ele[i]!=null?`<br>altitude ${Math.round(g.ele[i])} m`:"");
  if(anaMarker)anaMarker.setLatLng([g.lat[i],g.lon[i]]);
  if(HOV.mapPin)HOV.mapPin(i);
}
function clearHover(){const c=HOV.c;if(!c)return;["xl","dp","dh"].forEach(k=>c[k].style.display="none");c.tip.style.display="none";}

/* ---------- graphique principal : allure, FC, altitude ---------- */
function mainChart(a){
  const nw=innerWidth<620,fs=nw?15:11,g=a.grid,W=nw?480:920,H=nw?380:340,L=nw?48:54,R=a.hasHr?(nw?42:54):16,Tp=16,B=nw?36:32,iw=W-L-R,ih=H-Tp-B,Dm=a.dist;
  const pv=g.pace.filter(x=>x!=null),pmin=Math.floor((quantile(pv,.02)-8)/15)*15,pmax=Math.ceil((quantile(pv,.98)+8)/15)*15;
  const hv=a.hasHr?g.hr.filter(x=>x!=null):[],hmin=hv.length?Math.floor((Math.min(...hv)-4)/10)*10:0,hmax=hv.length?Math.ceil((Math.max(...hv)+2)/10)*10:1;
  const X=d=>L+d/Dm*iw,Yp=p=>Tp+(Math.min(pmax,Math.max(pmin,p))-pmin)/(pmax-pmin)*ih,Yh=h=>Tp+ih-(h-hmin)/(hmax-hmin)*ih;
  const ev=a.hasEle?g.ele.map((e,i,arr)=>e==null?null:mean(arr.slice(Math.max(0,i-2),i+3).filter(x=>x!=null))):[];
  const evv=ev.filter(x=>x!=null),emin=evv.length?Math.min(...evv):0,emax=evv.length?Math.max(...evv):1,Ye=e=>Tp+ih-(e-emin)/Math.max(emax-emin,8)*ih*0.22;
  let s="";
  for(let p=pmin;p<=pmax;p+=(nw?30:15))s+=`<line x1="${L}" x2="${W-R}" y1="${Yp(p)}" y2="${Yp(p)}" stroke="#1d2734"/><text x="${L-6}" y="${Yp(p)+fs/3}" fill="#ff9a66" font-size="${fs}" text-anchor="end">${pace(p)}</text>`;
  if(hv.length)for(let h=hmin;h<=hmax;h+=(nw?20:10))s+=`<text x="${W-R+6}" y="${Yh(h)+fs/3}" fill="#f08a8a" font-size="${fs}">${h}</text>`;
  for(let k=0;k<=Math.floor(Dm/1000);k++)s+=`<line x1="${X(k*1000)}" x2="${X(k*1000)}" y1="${Tp}" y2="${Tp+ih}" stroke="#1d2734" stroke-dasharray="2 4"/>`+((!nw||k%2===0)?`<text x="${X(k*1000)}" y="${H-10}" fill="#8b9bb0" font-size="${fs}" text-anchor="middle">${k}</text>`:"");
  s+=`<text x="${W-R}" y="${H-10}" fill="#5f6f84" font-size="${fs-1}" text-anchor="end">km</text>`;
  if(evv.length){let d=`M${X(g.d[0])},${Tp+ih}`;ev.forEach((e,i)=>{if(e!=null)d+=`L${X(g.d[i])},${Ye(e)}`;});d+=`L${X(g.d[g.d.length-1])},${Tp+ih}Z`;s+=`<path d="${d}" fill="rgba(139,155,176,.16)" stroke="rgba(139,155,176,.45)"/>`;}
  const path=(ys,Y)=>{let d="",pen=false;ys.forEach((v,i)=>{if(v==null){pen=false;return;}d+=(pen?"L":"M")+X(g.d[i]).toFixed(1)+","+Y(v).toFixed(1);pen=true;});return d;};
  if(hv.length)s+=`<path d="${path(g.hr,Yh)}" fill="none" stroke="#ef4444" stroke-width="${nw?3:2}" stroke-linejoin="round"/>`;
  s+=`<path d="${path(g.pace,Yp)}" fill="none" stroke="#ff6a2b" stroke-width="${nw?3.4:2.4}" stroke-linejoin="round"/>`;
  s+=`<line id="xl" y1="${Tp}" y2="${Tp+ih}" stroke="#e8eef6" stroke-opacity=".6" style="display:none"/><circle id="dp" r="${nw?7:5}" fill="#ff6a2b" stroke="#fff" stroke-width="2" style="display:none"/><circle id="dh" r="${nw?7:5}" fill="#ef4444" stroke="#fff" stroke-width="2" style="display:none"/>`;
  s+=`<rect id="hit" x="${L}" y="${Tp}" width="${iw}" height="${ih}" fill="transparent" style="touch-action:pan-y"/>`;
  return{html:`<div class="chartbox" id="mainBox"><svg viewBox="0 0 ${W} ${H}" class="achart">${s}</svg><div class="tip"></div></div>`,c:{W,L,iw,X,Yp,Yh,Dm}};
}
function bindMain(c){
  const box=$("#mainBox"),svg=box.querySelector("svg");
  HOV.c=Object.assign(c,{tip:box.querySelector(".tip"),xl:svg.querySelector("#xl"),dp:svg.querySelector("#dp"),dh:svg.querySelector("#dh")});
  const mv=e=>{const r=svg.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*c.W,d=Math.max(0,Math.min(c.Dm,(x-c.L)/c.iw*c.Dm));setHover(idxAtD(d));};
  const hit=svg.querySelector("#hit");hit.addEventListener("pointermove",mv);hit.addEventListener("pointerdown",mv);hit.addEventListener("pointerleave",()=>{clearHover();if(anaMarker&&HOV.mapOut)HOV.mapOut();});
}

/* ---------- barres des splits ---------- */
function splitsChart(a){
  const nw=innerWidth<620,sp=a.splits,W=nw?480:920,H=nw?300:260,L=6,R=6,Tp=30,B=nw?40:34,iw=W-L-R,ih=H-Tp-B,full=a.fullSplits.map(s=>s.pace);
  const lo=Math.min(...full)-8,hi=Math.max(...full)+12,Y=p=>Tp+(p-lo)/(hi-lo)*ih,bw=iw/sp.length;
  const avg=a.avgPace;let s="";
  sp.forEach((x,i)=>{
    const col=x.pace<=avg-2?"#a3e635":x.pace>=avg+3?"#ff6a2b":"#ffb020",top=Y(x.pace),bx=L+i*bw+bw*.14,w=bw*.72;
    s+=`<rect x="${bx}" y="${top}" width="${w}" height="${Tp+ih-top}" rx="6" fill="${col}" fill-opacity=".9"><title>Km ${x.km} · ${pace(x.pace)}/km</title></rect>`;
    s+=`<text x="${bx+w/2}" y="${top-7}" fill="#e8eef6" font-size="${nw?14:13}" font-weight="800" text-anchor="middle">${pace(x.pace)}</text><text x="${bx+w/2}" y="${H-12}" fill="#8b9bb0" font-size="${nw?13:12}" font-weight="700" text-anchor="middle">${x.full?(nw?x.km:"km "+x.km):Math.round(x.len)+" m"}</text>`;
    if(a.plan&&a.plan[i])s+=`<line x1="${bx-3}" x2="${bx+w+3}" y1="${Y(a.plan[i].plan)}" y2="${Y(a.plan[i].plan)}" stroke="#fff" stroke-width="${nw?3:2}" stroke-dasharray="4 3"/>`;
  });
  s+=`<line x1="${L}" x2="${W-R}" y1="${Y(avg)}" y2="${Y(avg)}" stroke="#a855f7" stroke-opacity=".8" stroke-dasharray="1 5" stroke-width="2"/>`;
  return`<svg viewBox="0 0 ${W} ${H}" class="achart">${s}</svg>`;
}

/* ---------- carte ---------- */
const paceColor=(p,lo,hi)=>{const t=Math.max(0,Math.min(1,(p-lo)/((hi-lo)||1)));return`hsl(${Math.round(130-125*t)},82%,52%)`;};
function kmIndices(a){const out=[];for(let k=1;k<=Math.floor(a.dist/1000);k++)out.push([k,idxAtD(k*1000)]);return out;}
function loadLeaflet(){
  if(window.L)return Promise.resolve(true);if(anaLeaflet)return anaLeaflet;
  anaLeaflet=new Promise(res=>{
    const css=document.createElement("link");css.rel="stylesheet";css.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";document.head.appendChild(css);
    const sc=document.createElement("script");sc.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";sc.onload=()=>res(!!window.L);sc.onerror=()=>res(false);document.head.appendChild(sc);
    setTimeout(()=>res(!!window.L),8000);
  });
  return anaLeaflet;
}
function mapSchema(a){
  const g=a.grid,W=920,H=380,pad=24,lat0=mean(g.lat),cos=Math.cos(lat0*Math.PI/180);
  const xs=g.lon.map(v=>v*cos),ys=g.lat,minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);
  const k=Math.min((W-2*pad)/(maxx-minx),(H-2*pad)/(maxy-miny)),ox=(W-(maxx-minx)*k)/2,oy=(H-(maxy-miny)*k)/2;
  const P=i=>[ox+(xs[i]-minx)*k,H-oy-(ys[i]-miny)*k],pv=g.pace.filter(x=>x!=null),lo=quantile(pv,.1),hi=quantile(pv,.9);
  let s="";for(let i=1;i<g.d.length;i++){const[p,q]=[P(i-1),P(i)];s+=`<line x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${q[0].toFixed(1)}" y2="${q[1].toFixed(1)}" stroke="${paceColor(g.pace[i]||a.avgPace,lo,hi)}" stroke-width="5" stroke-linecap="round"/>`;}
  kmIndices(a).forEach(([km,i])=>{const[x,y]=P(i);s+=`<circle cx="${x}" cy="${y}" r="11" fill="#0a0d12" stroke="#ff6a2b" stroke-width="2"/><text x="${x}" y="${y+4}" fill="#fff" font-size="11" font-weight="800" text-anchor="middle">${km}</text>`;});
  return`<svg viewBox="0 0 ${W} ${H}" class="achart" style="background:#0d1218;border-radius:14px">${s}</svg>`;
}
function drawMap(a){
  const el=$("#anaMap");if(!el)return;
  loadLeaflet().then(ok=>{
    if(!$("#anaMap"))return;
    if(!ok){el.outerHTML=`<div id="anaMap">${mapSchema(a)}<div class="mut" style="font-size:12.5px;margin-top:6px">Fond de carte indisponible (hors ligne) : schéma du tracé.</div></div>`;return;}
    const g=a.grid;if(anaMap){anaMap.remove();anaMap=null;}
    anaMap=L.map("anaMap",{scrollWheelZoom:false,dragging:!L.Browser.mobile,tap:false});
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap contributors"}).addTo(anaMap);
    const pv=g.pace.filter(x=>x!=null),lo=quantile(pv,.1),hi=quantile(pv,.9);
    for(let i=1;i<g.d.length;i++)L.polyline([[g.lat[i-1],g.lon[i-1]],[g.lat[i],g.lon[i]]],{color:paceColor(g.pace[i]||a.avgPace,lo,hi),weight:5,opacity:.95,lineCap:"round"}).addTo(anaMap);
    anaMap.fitBounds(L.latLngBounds(g.lat.map((la,i)=>[la,g.lon[i]])),{padding:[24,24]});
    const pin=(i,txt,cls)=>L.marker([g.lat[i],g.lon[i]],{icon:L.divIcon({className:"",html:`<div class="kmpin ${cls||""}">${txt}</div>`,iconSize:[24,24],iconAnchor:[12,12]}),interactive:false}).addTo(anaMap);
    kmIndices(a).forEach(([km,i])=>pin(i,km));pin(0,"D","se");pin(g.d.length-1,"A","se");
    anaMarker=L.circleMarker([g.lat[0],g.lon[0]],{radius:8,color:"#fff",weight:2,fillColor:"#ff6a2b",fillOpacity:1,opacity:0}).addTo(anaMap);anaMarker.setStyle({opacity:0,fillOpacity:0});
    HOV.mapPin=()=>anaMarker.setStyle({opacity:1,fillOpacity:1});HOV.mapOut=()=>anaMarker.setStyle({opacity:0,fillOpacity:0});
    anaMap.on("mousemove",e=>{let best=0,bd=1e9;for(let i=0;i<g.lat.length;i+=1){const dx=(g.lat[i]-e.latlng.lat),dy=(g.lon[i]-e.latlng.lng)*0.66,dd=dx*dx+dy*dy;if(dd<bd){bd=dd;best=i;}}setHover(best);});
    anaMap.on("mouseout",()=>{clearHover();HOV.mapOut();});
  });
}

/* ---------- page ---------- */
const kpi=(lab,val,sub)=>`<div class="card kpi"><div class="lab">${lab}</div><div class="val">${val}</div><div class="sub">${sub||""}</div></div>`;
function renderAnalysis(){
  const a=ANA,rep=buildReport(a,{pace,clock,km,previous:anaCustom?null:RACE.previous,official:anaCustom?null:RACE.official}),h=a.hr,el=a.ele,ca=a.cad;
  const dObj=a.objective?a.objective-(anaCustom?a.time:RACE.official):null;
  const chart=mainChart(a);
  const ch=anaCustom?`<span class="chip">Trace complète · ${esc(anaTitle)}</span>`:`<span class="chip">${a.trimmed?`Trace calée sur le temps officiel`:`Trace complète (non calée)`}</span>`;
  const head=`<div class="card heroMain" style="border-color:#3a2a1f"><div class="eyebrow">${anaCustom?"Analyse d'une trace":"Dimanche 15 novembre 2026"}</div><div style="display:flex;gap:18px;align-items:flex-end;flex-wrap:wrap;position:relative;z-index:1"><div><h2 style="margin:6px 0 0;font-size:22px">${esc(anaTitle)}</h2><div class="big">${clock(anaCustom?a.time:RACE.official)}<span>${anaCustom?"temps de la trace":"temps officiel"}</span></div></div>${dObj!=null?`<div class="stat" style="margin-bottom:8px;border-color:${dObj>=0?"#a3e63566":"#ef444466"}"><div class="l">vs objectif ${clock(a.objective)}</div><div class="v" style="color:${dObj>=0?"var(--ok)":"#ef4444"}">${dObj>=0?"−":"+"}${Math.abs(Math.round(dObj))} s</div></div>`:""}</div><div class="mut" style="position:relative;z-index:1;margin-top:6px">${esc(rep.resume)}${!anaCustom&&!a.trimmed?` Analyse sur la trace complète (${clock(a.total)}), non calée.`:""}</div><div class="chips">${ch}<span class="chip">${a.points} points GPS</span>${h?`<span class="chip">FC <b>présente</b></span>`:`<span class="chip">FC <b>absente</b></span>`}${ca?`<span class="chip">Cadence <b>présente</b></span>`:""}</div>
   <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;position:relative;z-index:1">${!anaCustom?`<div class="seg"><button class="btn ${anaAlign?"on":""}" data-anaalign="1">Calée sur ${clock(RACE.official)}</button><button class="btn ${anaAlign?"":"on"}" data-anaalign="0">Trace complète</button></div>`:`<button class="btn" data-anareset>← Revenir à ma course</button>`}${anaUpload()}</div></div>`;
  const kp=`<div class="grid g4" style="margin-top:14px">${kpi("Allure moyenne",pace(a.avgPace)+"/km",anaCustom?"":`objectif ${pace(a.objective/10)}/km`)}${kpi("Distance",(a.dist/1000).toFixed(2).replace(".",",")+" km",a.scaled?`GPS ${(a.rawDist/1000).toFixed(2).replace(".",",")} km · calée sur 10 km`:"mesurée par GPS")}${h?kpi("FC moyenne",Math.round(h.avg)+" bpm",`${h.pctMax.toFixed(0)} % de la FC max${h.fcmaxObserved?" observée":""}`):kpi("FC","—","absente du fichier")}${h?kpi("FC maximale",h.max+" bpm",`min ${h.min} bpm`):kpi("FC maximale","—","")}${ca?kpi("Cadence moyenne",Math.round(ca.avg)+" pas/min",ca.factor===2?"valeur du fichier × 2":"valeur du fichier"):kpi("Cadence","—","absente du fichier")}${el?kpi("Dénivelé",`+${Math.round(el.gain)} / −${Math.round(el.loss)} m`,`altitude ${Math.round(el.min)}–${Math.round(el.max)} m`):kpi("Dénivelé","—","absent")}${kpi("Régularité",f1(a.variability.sd)+" s/km","écart-type des km · écart max "+Math.round(a.variability.range)+" s")}${kpi("Split",`${clock(a.split.first)} / ${clock(a.split.second)}`,a.split.diff>=0?`+${Math.round(a.split.diff)} s en 2e moitié`:`−${Math.round(-a.split.diff)} s en 2e moitié`)}</div>`;
  const main=`<h2>Allure et fréquence cardiaque</h2><div class="card"><div class="legend" style="margin-bottom:8px"><span><i class="dot" style="background:#ff6a2b"></i>Allure (min/km)</span>${h?`<span><i class="dot" style="background:#ef4444"></i>Fréquence cardiaque (bpm)</span>`:""}${el?`<span><i class="dot" style="background:#8b9bb0"></i>Altitude</span>`:""}<span class="mut" style="margin-left:auto">Survole le graphique : la position apparaît sur la carte</span></div>${chart.html}</div>`;
  const map=`<h2>Parcours</h2><div class="card"><div id="anaMap" class="mapbox"></div><div class="legend" style="margin-top:10px"><span><i class="dot" style="background:hsl(130,82%,52%)"></i>plus rapide</span><span><i class="dot" style="background:hsl(68,82%,52%)"></i></span><span><i class="dot" style="background:hsl(5,82%,52%)"></i>plus lent</span><span class="mut" style="margin-left:auto">couleur = allure · numéros = kilomètres · D départ · A arrivée</span></div></div>`;
  const planCols=a.plan?`<th>Plan</th><th>Écart</th><th>Cumul</th>`:"";
  const rows=a.splits.map((s,i)=>{const pl=a.plan&&a.plan[i];const col=s.pace<=a.avgPace-2?"#a3e635":s.pace>=a.avgPace+3?"#ff6a2b":"#ffb020";
    return`<tr><td class="num"><i class="dot" style="background:${col};margin-right:8px"></i>${s.full?s.km:f1(s.len/1000)+" km"}</td><td class="num">${s.full?mmss(s.time):mmss(s.time)}</td><td class="num"><b>${pace(s.pace)}</b></td>${pl?`<td class="num mut">${pace(pl.plan)}</td><td class="num" style="color:${pl.delta<=0?"var(--ok)":"#ff8a5c"}">${pl.delta>0?"+":""}${Math.round(pl.delta)} s</td><td class="num mut">${pl.cumDelta>0?"+":""}${Math.round(pl.cumDelta)} s</td>`:(a.plan?"<td></td><td></td><td></td>":"")}<td class="num">${s.hr!=null?Math.round(s.hr):"—"}</td><td class="num">${s.hrMax!=null?s.hrMax:"—"}</td><td class="num">${s.cad!=null?Math.round(s.cad):"—"}</td><td class="num">${a.hasEle?`+${Math.round(s.gain)} / −${Math.round(s.loss)}`:"—"}</td></tr>`;}).join("");
  const spl=`<h2>Splits au kilomètre</h2><div class="card"><div class="legend" style="margin-bottom:6px"><span><i class="dot" style="background:#a3e635"></i>plus rapide que ta moyenne</span><span><i class="dot" style="background:#ffb020"></i>dans la moyenne</span><span><i class="dot" style="background:#ff6a2b"></i>plus lent</span>${a.plan?`<span><i class="dot" style="background:#fff"></i>tiret : allure prévue au plan</span>`:""}<span><i class="dot" style="background:#a855f7"></i>pointillé : allure moyenne</span></div>${splitsChart(a)}<div class="tscroll" style="margin-top:10px"><table><tr><th>Km</th><th>Temps</th><th>Allure</th>${planCols}<th>FC moy</th><th>FC max</th><th>Cad.</th><th>D+ / D−</th></tr>${rows}</table></div>${a.plan?`<p class="mut" style="font-size:12.5px;margin:10px 0 0">Plan = stratégie de ton programme pour ${clock(a.objective)} : km 1 à +2 s, allure stable, relance au km 9, accélération finale. Écart négatif = plus rapide que prévu.</p>`:""}</div>`;
  const zrows=h?h.zones.map((z,i)=>{const lo=i===0?0:Math.round(h.fcmax*ZONE_BOUNDS[i-1]),hi=i===4?h.fcmax:Math.round(h.fcmax*ZONE_BOUNDS[i]);return`<div class="zrow"><span class="zn"><i class="dot" style="background:${ZCOL[i]}"></i>${ZNAME[i]}<small class="mut"> ${i===0?"< "+hi:i===4?"≥ "+lo:lo+"–"+hi} bpm</small></span><div class="bar" style="height:12px"><i style="width:${z.pct*100}%;background:${ZCOL[i]}"></i></div><span class="num">${mmss(z.s)}</span><b class="num" style="width:44px;text-align:right">${Math.round(z.pct*100)} %</b></div>`;}).reverse().join(""):"";
  const zon=h?`<h2>Zones de fréquence cardiaque</h2><div class="card"><div class="grid g2"><div>${zrows}</div><div><div class="note"><b>Lecture de l'effort</b><br>${rep.effort.slice(0,2).map(esc).join("<br>")}</div><div style="margin-top:12px"><label class="mut" style="font-size:12px;font-weight:700">FC maximale utilisée pour les zones</label><div class="calcIn" style="margin-top:6px"><input id="fcmaxIn" inputmode="numeric" value="${Math.round(h.fcmax)}" style="width:100px;font-size:16px"><button class="btn" data-fcmax>Appliquer</button>${h.fcmaxObserved?"":`<button class="btn" data-fcmaxreset>Revenir au maximum observé</button>`}</div><p class="mut" style="font-size:12.5px;margin:8px 0 0">${h.fcmaxObserved?"Par défaut : la FC maximale observée sur cette trace. Si ta vraie FC max est plus haute, les zones se décalent vers le bas.":"Valeur saisie par toi."} Zones : 60 / 70 / 80 / 90 % de la FC max.</p></div></div></div></div>`:"";
  const bst=a.bests.length?`<h2>Meilleurs passages</h2><div class="grid g3">${a.bests.map(b=>kpi("Meilleur "+(b.L/1000)+" km glissant",b.L===1000?mmss(b.time):clock(b.time),`${pace(b.pace)}/km · du km ${f1(b.from/1000)} au km ${f1(b.to/1000)}`)).join("")}</div>`:"";
  const li=arr=>arr.length?`<ul>${arr.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:`<div class="mut">Rien de marquant dans les données.</div>`;
  const bil=`<h2>Bilan de course</h2><div class="grid g2"><div class="card prose" style="border-top:3px solid var(--ok)"><h3>Points forts</h3>${li(rep.forts)}</div><div class="card prose" style="border-top:3px solid #ff6a2b"><h3>Points faibles</h3>${li(rep.faibles)}</div><div class="card prose" style="border-top:3px solid #a855f7"><h3>Gestion de l'effort</h3>${li(rep.effort)}</div><div class="card prose" style="border-top:3px solid #06b6d4"><h3>Axes d'amélioration</h3>${li(rep.axes)}</div></div><p class="mut" style="font-size:12.5px;margin:10px 0 0">Ce bilan est généré à partir des mesures ci-dessus ; les pistes sont indicatives, pas un plan d'entraînement.</p>`;
  const lim=`<h2>Données et limites</h2><div class="card prose"><ul>
   <li><b>Source</b> : fichier GPX (${a.points} points, un point toutes les 1 à 7 s). Rien n'est inventé : tout est calculé à partir du fichier.</li>
   ${anaCustom?"":a.trimmed?`<li><b>Calage</b> : la trace complète dure ${clock(a.total)} (${(a.fullDist/1000).toFixed(2).replace(".",",")} km GPS) contre ${clock(RACE.official)} au temps officiel. J'ai retiré ${clock(a.trimmed)} au début de la trace (${Math.round(a.fullDist-a.rawDist)} m), supposées avant la ligne de départ, entre le coup de pistolet et la ligne. Il reste ${(a.rawDist/1000).toFixed(2).replace(".",",")} km GPS pour ${clock(RACE.official)}, très proche des 10 km officiels, ce qui conforte l'hypothèse. Le bouton « Trace complète » montre la trace non retouchée.</li>`:`<li><b>Calage</b> : trace complète non retouchée (${clock(a.total)}, ${(a.fullDist/1000).toFixed(2).replace(".",",")} km GPS). Ton temps officiel est ${clock(RACE.official)} : l'écart vient sans doute de la minute entre le coup de pistolet et la ligne de départ.</li>`}
   ${a.scaled?`<li><b>Distance</b> : ${(a.rawDist/1000).toFixed(3).replace(".",",")} km mesurés par GPS, ramenés à 10,00 km pour les splits (écart de ${Math.abs((a.dist/a.rawDist-1)*100).toFixed(2).replace(".",",")} %).</li>`:""}
   ${h?`<li><b>Fréquence cardiaque</b> : mesurée par ton capteur. ${h.fcmaxObserved?"La FC maximale réelle n'est pas dans le fichier : les zones utilisent le maximum observé.":""}</li>`:`<li><b>Fréquence cardiaque</b> : absente du fichier, aucune analyse cardiaque n'est affichée.</li>`}
   ${ca?`<li><b>Cadence</b> : ${ca.factor===2?"le fichier stocke un pied sur deux (convention Strava) : j'ai doublé la valeur pour obtenir des pas par minute":"valeur du fichier"}.</li>`:""}
   ${el?`<li><b>Altitude</b> : issue du fichier, lissée ; les dénivelés sont indicatifs à quelques mètres près.</li>`:""}
   <li><b>Absent du fichier</b> : puissance, température et météo, temps de contact au sol et oscillation, temps officiels intermédiaires, classement.</li>
   <li><b>Précision GPS</b> : entre les immeubles du centre de Paris, le GPS dérive. Les allures instantanées sont lissées sur 40 s ; les splits sont plus fiables que les valeurs ponctuelles.</li></ul></div>`;
  $("#anaRoot").innerHTML=head+kp+main+map+spl+zon+bst+bil+lim;
  bindMain(chart.c);HOV.mapPin=null;HOV.mapOut=null;anaMarker=null;
  drawMap(a);
}

document.addEventListener("click",e=>{
  const el=e.target.closest("[data-anaalign],[data-anareset],[data-fcmax],[data-fcmaxreset]");if(!el)return;
  if(el.dataset.anaalign!==undefined){anaAlign=el.dataset.anaalign==="1";runAnalysis();}
  else if(el.hasAttribute("data-anareset")){anaCustom=false;anaTitle=RACE.name;anaPoints=null;ANA=null;initAnalysis();}
  else if(el.hasAttribute("data-fcmax")){const v=+$("#fcmaxIn").value;if(!(v>=120&&v<=230)){toast("FC max entre 120 et 230");return;}try{localStorage.setItem("prepa10kFcmax",v);}catch(x){}runAnalysis();}
  else if(el.hasAttribute("data-fcmaxreset")){try{localStorage.removeItem("prepa10kFcmax");}catch(x){}runAnalysis();}
});
document.addEventListener("change",e=>{
  if(e.target.id!=="anaFile")return;const f=e.target.files[0];if(!f)return;
  f.text().then(t=>{const p=parseGpx(t);if(p.length<10){toast("Fichier GPX non reconnu");return;}anaPoints=p;anaCustom=true;anaTitle=f.name.replace(/\.gpx$/i,"");runAnalysis();toast("Trace analysée");}).catch(()=>toast("Lecture impossible"));
  e.target.value="";
});

let anaNarrow=innerWidth<620;
window.addEventListener("resize",()=>{const n=innerWidth<620;if(n!==anaNarrow){anaNarrow=n;if(ANA&&$("#v-analysis").classList.contains("on"))renderAnalysis();}});
