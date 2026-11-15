/* ---------- ANALYSE DE COURSE : interface ---------- */
let anaCmp=null,ANA=null,anaPoints=null,anaCustom=false,anaTitle=RACE.name,anaMap=null,anaMarker=null,anaLeaflet=null,anaLoading=false,anaHL=null;
const anaView={axis:"d",pace:true,hr:true,ele:true,allMoments:false,selKm:null,calOpen:false};
const ZCOL=["#94a3b8","#22c55e","#f59e0b","#f97316","#ef4444"],ZNAME=["Zone 1 · récupération","Zone 2 · endurance","Zone 3 · tempo","Zone 4 · seuil","Zone 5 · maximale"];
const f1=x=>x.toFixed(1).replace(".",","),esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const mmss=s=>{s=Math.round(s);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");};
const fcmaxSaved=()=>{try{const v=+localStorage.getItem("prepa10kFcmax");return v>=120&&v<=230?v:null;}catch(e){return null;}};
let anaTrim=(()=>{try{const t=JSON.parse(localStorage.getItem("prepa10kTrim"));if(t&&["start","end","full","custom"].includes(t.mode))return t;}catch(e){}return{mode:"start"};})();
const zoneBpmSaved=()=>{try{const v=JSON.parse(localStorage.getItem("prepa10kZoneBpm"));if(Array.isArray(v)&&v.length===4&&v.every((x,i)=>x>=60&&x<=230&&(i===0||x>v[i-1])))return v;}catch(e){}return null;};
const saveTrim=()=>{try{localStorage.setItem("prepa10kTrim",JSON.stringify(anaTrim));}catch(e){}};

/* ---------- aides contextuelles ---------- */
const HELP={
  allure:"Temps moyen pour courir 1 km : durée ÷ distance.",
  distance:"Distance mesurée par GPS. Quand la trace est calée sur ton temps officiel, elle est ramenée à 10 km pour que les splits tombent sur les panneaux.",
  fcmoy:"Moyenne des battements sur la course, pondérée par le temps. Le pourcentage compare à ta FC maximale.",
  fcmax:"Valeur la plus haute enregistrée par le capteur. Ce n'est pas forcément ta FC maximale physiologique.",
  cadence:"Pas par minute. Le fichier ne compte qu'un pied sur deux (convention Strava) : la valeur est doublée.",
  deniv:"Cumul des montées et descentes, après lissage de l'altitude. Indicatif à quelques mètres près.",
  regularite:"Écart-type des allures kilomètre par kilomètre : plus il est bas, plus la course est régulière. Moins de 4 s/km = très régulier.",
  split:"Temps de la 1re moitié / de la 2e moitié du parcours. Une 2e moitié plus rapide s'appelle un split négatif.",
  decouplage:"Compare le rapport allure/FC entre la 1re et la 2e moitié. Sous 3 %, l'endurance a tenu : la FC n'a pas dérivé pour une même allure.",
  zones:"Les zones découpent ta FC en pourcentages de ta FC maximale : 60 / 70 / 80 / 90 %.",
  calage:"Ta montre démarre avant la ligne de départ. Le calage retire cet excédent pour que la durée analysée égale ton temps officiel.",
  moments:"Passages où l'allure s'écarte nettement de ta moyenne : plus de 20 s/km plus lent, ou plus de 15 s/km plus rapide, pendant au moins 10 s."
};
Object.assign(HELP,{
  foulee:"Distance parcourue à chaque pas : vitesse ÷ cadence. Une foulée qui raccourcit sans que la cadence change signale souvent de la fatigue ou un terrain difficile.",
  efficacite:"Mètres parcourus par battement de cœur (vitesse ÷ FC). Plus c'est haut, plus tu avances vite pour un même effort cardiaque.",
  propres:"Kilomètres courus à ± 5 s de ta moyenne : un indicateur simple de régularité.",
  bilanTemps:"Temps perdu dans les ralentissements et gagné dans les accélérations par rapport à ta moyenne, sur les moments clés détectés.",
  montee:"Temps mis par ta FC pour atteindre 90 % de son maximum observé. Plus il est court, plus l'effort a démarré fort.",
  riegel:"Formule de Riegel : T2 = T1 × (D2 ÷ D1)^1,06. Une estimation fiable pour les distances proches, de moins en moins pour le marathon sans préparation spécifique."
});
const hq=k=>`<button class="hq" type="button" data-help="${k}" aria-label="Aide : ${k}">?</button>`;

/* ---------- chargement ---------- */
function initAnalysis(){
  if(ANA||anaLoading){if(ANA)setTimeout(()=>{if(anaMap)anaMap.invalidateSize();},50);return;}
  anaLoading=true;$("#anaRoot").innerHTML=`<div class="card"><div class="mut">Chargement de la trace GPX…</div></div>`;
  fetch(RACE.gpx).then(r=>{if(!r.ok)throw new Error(r.status);return r.text();}).then(t=>{anaPoints=parseGpx(t);if(anaPoints.length<10)throw new Error("trace vide");anaCustom=false;anaTitle=RACE.name;runAnalysis();})
   .catch(()=>{$("#anaRoot").innerHTML=`<div class="card"><b>Impossible de charger la trace.</b><div class="mut" style="margin-top:6px">Vérifie ta connexion, ou charge un fichier GPX avec le bouton ci-dessous.</div>${anaUpload()}</div>`;})
   .finally(()=>{anaLoading=false;});
}
const anaUpload=()=>`<label class="btn" style="display:inline-block;cursor:pointer">Analyser un fichier GPX<input type="file" accept=".gpx,application/gpx+xml,text/xml" id="anaFile" hidden></label>`;
function trimOpts(total){
  if(anaCustom)return anaTrim.mode==="custom"?{trimStart:anaTrim.s||0,trimEnd:anaTrim.e||0}:{};
  const gap=Math.max(0,total-RACE.official);
  if(anaTrim.mode==="end")return{trimStart:0,trimEnd:gap};
  if(anaTrim.mode==="full")return{trimStart:0,trimEnd:0};
  if(anaTrim.mode==="custom")return{trimStart:anaTrim.s||0,trimEnd:anaTrim.e||0};
  return{trimStart:gap,trimEnd:0};
}
function runAnalysis(){
  const total=anaPoints[anaPoints.length-1].t-anaPoints[0].t;
  const o=Object.assign(anaCustom?{}:{official:RACE.official,objective:RACE.objective,distance:RACE.distance},trimOpts(total));
  o.fcmax=fcmaxSaved();o.zoneBpm=zoneBpmSaved();
  ANA=analyzeRun(anaPoints,o);
  if(!ANA){$("#anaRoot").innerHTML=`<div class="card">Trace trop courte pour être analysée.</div>`;return;}
  renderAnalysis();
}

/* ---------- survol partagé graphique / carte ---------- */
let HOV={};
function idxAtX(xs,x){let lo=0,hi=xs.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(xs[m]<=x)lo=m;else hi=m;}return Math.abs(xs[lo]-x)<=Math.abs(xs[hi]-x)?lo:hi;}
const idxAtD=d=>idxAtX(ANA.grid.d,d);
function setHover(i){
  const a=ANA,g=a.grid,c=HOV.c;if(!c||i==null)return;
  const d=g.d[i],x=c.X(c.xs[i]);
  c.xl.setAttribute("x1",x);c.xl.setAttribute("x2",x);c.xl.style.display="";
  if(g.pace[i]!=null&&c.dp){c.dp.setAttribute("cx",x);c.dp.setAttribute("cy",c.Yp(g.pace[i]));c.dp.style.display="";}
  if(g.hr[i]!=null&&c.dh){c.dh.setAttribute("cx",x);c.dh.setAttribute("cy",c.Yh(g.hr[i]));c.dh.style.display="";}
  const tip=c.tip;tip.style.display="block";tip.style.left=Math.max(14,Math.min(86,x/c.W*100))+"%";
  tip.innerHTML=`<b>${f1(d/1000)} km</b> · ${clock(g.t[i])}<br><span style="color:#ff6a2b">●</span> ${g.pace[i]!=null?pace(g.pace[i])+"/km":"—"}`+(g.hr[i]!=null?`<br><span style="color:#ef4444">●</span> ${Math.round(g.hr[i])} bpm`:"")+(g.cad[i]!=null?`<br>cadence ${Math.round(g.cad[i]*a.cad.factor)} pas/min`:"")+(g.ele[i]!=null?`<br>altitude ${Math.round(g.ele[i])} m`:"");
  if(anaMarker){anaMarker.setLatLng([g.lat[i],g.lon[i]]);anaMarker.setStyle({opacity:1,fillOpacity:1});}
}
function clearHover(){const c=HOV.c;if(!c)return;["xl","dp","dh"].forEach(k=>{if(c[k])c[k].style.display="none";});c.tip.style.display="none";if(anaMarker)anaMarker.setStyle({opacity:0,fillOpacity:0});}

/* ---------- graphique principal : allure, FC, altitude ---------- */
const isMajor=m=>Math.abs(m.delta)>=22&&m.dur>=25;
function mainChart(a){
  const nw=innerWidth<620,fs=nw?15:11,g=a.grid,ax=anaView.axis,xs=ax==="t"?g.t:g.d,Xm=ax==="t"?a.time:a.dist;
  const W=nw?480:920,H=nw?380:340,L=nw?48:54,R=a.hasHr&&anaView.hr?(nw?42:54):16,Tp=16,B=nw?36:32,iw=W-L-R,ih=H-Tp-B;
  const pv=g.pace.filter(x=>x!=null),pmin=Math.floor((quantile(pv,.02)-8)/15)*15,pmax=Math.ceil((quantile(pv,.98)+8)/15)*15;
  const hv=a.hasHr?g.hr.filter(x=>x!=null):[],hmin=hv.length?Math.floor((Math.min(...hv)-4)/10)*10:0,hmax=hv.length?Math.ceil((Math.max(...hv)+2)/10)*10:1;
  const X=v=>L+v/Xm*iw,Yp=p=>Tp+(Math.min(pmax,Math.max(pmin,p))-pmin)/(pmax-pmin)*ih,Yh=h=>Tp+ih-(h-hmin)/(hmax-hmin)*ih;
  const ev=a.hasEle?g.ele.map((e,i,arr)=>e==null?null:mean(arr.slice(Math.max(0,i-2),i+3).filter(x=>x!=null))):[];
  const evv=ev.filter(x=>x!=null),emin=evv.length?Math.min(...evv):0,emax=evv.length?Math.max(...evv):1,Ye=e=>Tp+ih-(e-emin)/Math.max(emax-emin,8)*ih*0.22;
  let s="";
  if(anaView.pace)for(let p=pmin;p<=pmax;p+=(nw?30:15))s+=`<line x1="${L}" x2="${W-R}" y1="${Yp(p)}" y2="${Yp(p)}" stroke="#1d2734"/><text x="${L-6}" y="${Yp(p)+fs/3}" fill="#ff9a66" font-size="${fs}" text-anchor="end">${pace(p)}</text>`;
  if(hv.length&&anaView.hr)for(let h=hmin;h<=hmax;h+=(nw?20:10))s+=`<text x="${W-R+6}" y="${Yh(h)+fs/3}" fill="#f08a8a" font-size="${fs}">${h}</text>`;
  const step=ax==="t"?(nw?600:300):1000,nTick=Math.floor(Xm/step);
  for(let k=0;k<=nTick;k++){const v=k*step,lab=ax==="t"?Math.round(v/60)+"'":k;s+=`<line x1="${X(v)}" x2="${X(v)}" y1="${Tp}" y2="${Tp+ih}" stroke="#1d2734" stroke-dasharray="2 4"/>`+((!nw||ax==="t"||k%2===0)?`<text x="${X(v)}" y="${H-10}" fill="#8b9bb0" font-size="${fs}" text-anchor="middle">${lab}</text>`:"");}
  s+=`<text x="${W-R}" y="${H-10}" fill="#5f6f84" font-size="${fs-1}" text-anchor="end">${ax==="t"?"min":"km"}</text>`;
  if(anaView.selKm){const sp=a.splits[anaView.selKm-1];if(sp){const v0=ax==="t"?sp.t0:(anaView.selKm-1)*1000,v1=ax==="t"?sp.t1:(anaView.selKm-1)*1000+sp.len;s+=`<rect x="${X(v0)}" y="${Tp}" width="${X(v1)-X(v0)}" height="${ih}" fill="rgba(255,255,255,.09)" stroke="rgba(255,255,255,.3)"/>`;}}
  if(evv.length&&anaView.ele){let d=`M${X(xs[0])},${Tp+ih}`;ev.forEach((e,i)=>{if(e!=null)d+=`L${X(xs[i])},${Ye(e)}`;});d+=`L${X(xs[xs.length-1])},${Tp+ih}Z`;s+=`<path d="${d}" fill="rgba(139,155,176,.16)" stroke="rgba(139,155,176,.45)"/>`;}
  const path=(ys,Y)=>{let d="",pen=false;ys.forEach((v,i)=>{if(v==null){pen=false;return;}d+=(pen?"L":"M")+X(xs[i]).toFixed(1)+","+Y(v).toFixed(1);pen=true;});return d;};
  if(hv.length&&anaView.hr)s+=`<path d="${path(g.hr,Yh)}" fill="none" stroke="#ef4444" stroke-width="${nw?3:2}" stroke-linejoin="round"/>`;
  if(anaView.pace)s+=`<path d="${path(g.pace,Yp)}" fill="none" stroke="#ff6a2b" stroke-width="${nw?3.4:2.4}" stroke-linejoin="round"/>`;
  s+=`<line id="xl" y1="${Tp}" y2="${Tp+ih}" stroke="#e8eef6" stroke-opacity=".6" style="display:none"/>`;
  if(anaView.pace)s+=`<circle id="dp" r="${nw?7:5}" fill="#ff6a2b" stroke="#fff" stroke-width="2" style="display:none"/>`;
  if(hv.length&&anaView.hr)s+=`<circle id="dh" r="${nw?7:5}" fill="#ef4444" stroke="#fff" stroke-width="2" style="display:none"/>`;
  s+=`<rect id="hit" x="${L}" y="${Tp}" width="${iw}" height="${ih}" fill="transparent" style="touch-action:pan-y"/>`;
  if(anaView.pace)a.moments.forEach((m,i)=>{if(!anaView.allMoments&&!isMajor(m))return;const mi=Math.round((m.i0+m.i1)/2),x=X(xs[mi]),y=Yp(g.pace[mi]||a.avgPace);
    s+=`<g data-mom="${i}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="${nw?9:7}" fill="${m.kind==="slow"?"#ef4444":"#a3e635"}" stroke="#0a0d12" stroke-width="2"/><text x="${x}" y="${y+(nw?4:3.4)}" font-size="${nw?11:9}" font-weight="900" fill="#0a0d12" text-anchor="middle">${m.kind==="slow"?"▼":"▲"}</text></g>`;});
  return{html:`<div class="chartbox" id="mainBox"><svg viewBox="0 0 ${W} ${H}" class="achart">${s}</svg><div class="tip"></div></div>`,c:{W,L,iw,X,Yp,Yh,xs,Xm}};
}
function bindMain(c){
  const box=$("#mainBox"),svg=box.querySelector("svg");
  HOV.c=Object.assign(c,{tip:box.querySelector(".tip"),xl:svg.querySelector("#xl"),dp:svg.querySelector("#dp"),dh:svg.querySelector("#dh")});
  const mv=e=>{const r=svg.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*c.W,v=Math.max(0,Math.min(c.Xm,(x-c.L)/c.iw*c.Xm));setHover(idxAtX(c.xs,v));};
  const hit=svg.querySelector("#hit");hit.addEventListener("pointermove",mv);hit.addEventListener("pointerdown",mv);hit.addEventListener("pointerleave",clearHover);
}
function renderChart(){
  const ch=mainChart(ANA);$("#chartHost").innerHTML=ch.html;bindMain(ch.c);
  document.querySelectorAll("[data-anaaxis]").forEach(b=>b.classList.toggle("on",b.dataset.anaaxis===anaView.axis));
}

/* ---------- barres des splits ---------- */
function splitsChart(a){
  const nw=innerWidth<620,sp=a.splits,W=nw?480:920,H=nw?300:260,L=6,R=6,Tp=30,B=nw?40:34,iw=W-L-R,ih=H-Tp-B,full=a.fullSplits.map(s=>s.pace);
  const lo=Math.min(...full)-8,hi=Math.max(...full)+12,Y=p=>Tp+(p-lo)/(hi-lo)*ih,bw=iw/sp.length,avg=a.avgPace;let s="";
  sp.forEach((x,i)=>{
    const col=x.pace<=avg-2?"#a3e635":x.pace>=avg+3?"#ff6a2b":"#ffb020",top=Y(x.pace),bx=L+i*bw+bw*.14,w=bw*.72,sel=anaView.selKm===x.km;
    s+=`<g data-kmrow="${x.km}" style="cursor:pointer"><rect x="${bx}" y="${top}" width="${w}" height="${Tp+ih-top}" rx="6" fill="${col}" fill-opacity="${sel?1:.85}" ${sel?'stroke="#fff" stroke-width="2.5"':""}><title>Km ${x.km} · ${pace(x.pace)}/km</title></rect>`;
    s+=`<text x="${bx+w/2}" y="${top-7}" fill="#e8eef6" font-size="${nw?14:13}" font-weight="800" text-anchor="middle">${pace(x.pace)}</text><text x="${bx+w/2}" y="${H-12}" fill="#8b9bb0" font-size="${nw?13:12}" font-weight="700" text-anchor="middle">${x.full?(nw?x.km:"km "+x.km):Math.round(x.len)+" m"}</text></g>`;
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
function mapHighlight(i0,i1,color,fit){
  if(!anaMap||!anaHL)return;const g=ANA.grid;anaHL.clearLayers();if(i0==null)return;
  const pts=[];for(let i=i0;i<=i1;i++)pts.push([g.lat[i],g.lon[i]]);
  L.polyline(pts,{color:color||"#fff",weight:9,opacity:.95,lineCap:"round"}).addTo(anaHL);
  if(fit)anaMap.fitBounds(L.latLngBounds(pts),{padding:[40,40],maxZoom:16});
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
    RP.base=L.layerGroup().addTo(anaMap);
    for(let i=1;i<g.d.length;i++)L.polyline([[g.lat[i-1],g.lon[i-1]],[g.lat[i],g.lon[i]]],{color:paceColor(g.pace[i]||a.avgPace,lo,hi),weight:5,opacity:.95,lineCap:"round"}).addTo(RP.base);
    anaMap.fitBounds(L.latLngBounds(g.lat.map((la,i)=>[la,g.lon[i]])),{padding:[24,24]});
    anaHL=L.layerGroup().addTo(anaMap);
    const pin=(i,txt,cls)=>L.marker([g.lat[i],g.lon[i]],{icon:L.divIcon({className:"",html:`<div class="kmpin ${cls||""}">${txt}</div>`,iconSize:[24,24],iconAnchor:[12,12]}),interactive:false}).addTo(anaMap);
    kmIndices(a).forEach(([km,i])=>pin(i,km));pin(0,"D","se");pin(g.d.length-1,"A","se");
    a.moments.forEach((m,i)=>{if(!isMajor(m))return;const mi=Math.round((m.i0+m.i1)/2);L.circleMarker([g.lat[mi],g.lon[mi]],{radius:7,color:"#0a0d12",weight:2,fillColor:m.kind==="slow"?"#ef4444":"#a3e635",fillOpacity:1}).addTo(anaMap).on("click",()=>focusMoment(i,true));});
    anaMarker=L.circleMarker([g.lat[0],g.lon[0]],{radius:8,color:"#fff",weight:2,fillColor:"#ff6a2b",fillOpacity:0,opacity:0,interactive:false}).addTo(anaMap);
    anaMap.on("mousemove",e=>{let best=0,bd=1e9;for(let i=0;i<g.lat.length;i++){const dx=g.lat[i]-e.latlng.lat,dy=(g.lon[i]-e.latlng.lng)*0.66,dd=dx*dx+dy*dy;if(dd<bd){bd=dd;best=i;}}setHover(best);});
    anaMap.on("mouseout",clearHover);
    rpInit(lo,hi);
    if(anaView.selKm)selectKm(anaView.selKm,true);
  });
}

/* ---------- moments clés et sélection d'un kilomètre ---------- */
function focusMoment(i,fromMap){
  const a=ANA,m=a.moments[i];if(!m)return;
  setHover(Math.round((m.i0+m.i1)/2));mapHighlight(m.i0,m.i1,m.kind==="slow"?"#ef4444":"#a3e635",true);
  document.querySelectorAll(".mom").forEach(e=>e.classList.toggle("sel",+e.dataset.mom===i));
  momStart(i);
  if(!fromMap)$("#ana-map").scrollIntoView({behavior:"smooth",block:"start"});
}
function selectKm(k,silent){
  const a=ANA;anaView.selKm=silent?k:(anaView.selKm===k?null:k);
  renderChart();
  document.querySelectorAll("tr[data-kmrow]").forEach(e=>e.classList.toggle("sel",+e.dataset.kmrow===anaView.selKm));
  const sp=anaView.selKm&&a.splits[anaView.selKm-1];
  if(sp){const i0=idxAtD((anaView.selKm-1)*1000),i1=idxAtD((anaView.selKm-1)*1000+sp.len);mapHighlight(i0,i1,"#ffffff",!silent);}else mapHighlight(null);
  const n=$("#kmSelInfo");if(n)n.textContent=sp?`Km ${sp.km} sélectionné sur le graphique et la carte · touche-le à nouveau pour le désélectionner.`:"Touche un kilomètre (barre ou ligne du tableau) pour le voir sur le graphique et la carte.";
}
function momentsHtml(a){
  const all=a.moments.map((m,i)=>({m,i})),list=all.filter(x=>anaView.allMoments||isMajor(x.m));
  if(!all.length)return`<div class="mut">Aucun écart marqué : ton allure est restée dans une plage étroite de bout en bout.</div>`;
  const rows=list.map(({m,i})=>{
    const slow=m.kind==="slow";
    return`<button type="button" class="mom" data-mom="${i}"><span class="momi" style="background:${slow?"#ef4444":"#a3e635"}">${slow?"▼":"▲"}</span><span class="momt"><b>${slow?"Ralentissement":"Accélération"}</b> · km ${f1(m.d0/1000)} → ${f1(m.d1/1000)} · ${Math.round(m.dur)} s<br><span class="mut">${pace(m.pace)}/km (${m.delta>0?"+":"−"}${Math.abs(Math.round(m.delta))} s/km vs ta moyenne)${m.hr!=null?` · FC ${Math.round(m.hr)} bpm`:""}${m.nearTurn?` · <span style="color:#ffb020">virage à proximité</span>`:""}</span></span></button>`;}).join("");
  const hidden=all.length-list.length;
  return`<div class="momgrid">${rows}</div><div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">${hidden>0||anaView.allMoments?`<button class="btn" data-allmom>${anaView.allMoments?"Afficher seulement les principaux":`Afficher les ${all.length} moments`}</button>`:""}<span class="mut" style="font-size:12.5px">La cause d'un écart n'est pas dans le fichier : « virage à proximité » signale un changement de cap de plus de 60° à cet endroit. Touche un moment pour le voir sur la carte.</span></div>`;
}

/* ---------- calage ---------- */
function calageCard(a){
  const SM=Math.min(300,Math.floor(a.total/6)),ok=a.windowOk,win=a.time,off=RACE.official;
  const m=anaCustom?(anaTrim.mode==="custom"?"custom":"full"):anaTrim.mode;
  const stat=anaCustom?`Durée retenue ${clock(win)} · ${(a.rawDist/1000).toFixed(2).replace(".",",")} km GPS`:ok?`<span style="color:var(--ok)">✓ durée retenue ${clock(win)} = temps officiel</span>`:`<span style="color:#ffb020">⚠ durée retenue ${clock(win)}, soit ${win>off?"+":"−"}${Math.abs(Math.round(win-off))} s par rapport au temps officiel (${clock(off)})</span>`;
  return`<details class="card calage" id="ana-calage" ${anaView.calOpen?"open":""}><summary><b>Calage de la trace</b> ${hq("calage")}<span class="calsum">${stat}</span></summary>
   <div style="margin-top:12px">${anaCustom?"":`<div class="seg"><button class="btn ${m==="start"?"on":""}" data-trimmode="start">Début retiré</button><button class="btn ${m==="end"?"on":""}" data-trimmode="end">Fin retirée</button><button class="btn ${m==="full"?"on":""}" data-trimmode="full">Trace complète</button><button class="btn ${m==="custom"?"on":""}" data-trimmode="custom">Personnalisé</button></div>`}
   <div class="grid g2" style="margin-top:14px"><div class="fld"><label>Début retiré : <b id="trSv">${Math.round(a.trimmed)} s</b> <span class="mut" id="trSd">≈ ${Math.round(lerp(a.rawT,a.rawD,a.trimmed))} m</span></label><input type="range" id="trimS" min="0" max="${SM}" value="${Math.min(SM,Math.round(a.trimmed))}"></div>
   <div class="fld"><label>Fin retirée : <b id="trEv">${Math.round(a.trimmedEnd)} s</b> <span class="mut" id="trEd">≈ ${Math.round(a.fullDist-lerp(a.rawT,a.rawD,a.total-a.trimmedEnd))} m</span></label><input type="range" id="trimE" min="0" max="${SM}" value="${Math.min(SM,Math.round(a.trimmedEnd))}"></div></div>
   <p class="mut" style="font-size:12.5px;margin:10px 0 0">${anaCustom?"Retire le début ou la fin de la trace si ta montre tournait avant le départ ou après l'arrivée.":`Ta trace dure ${clock(a.total)} pour un temps officiel de ${clock(off)} : l'écart vient d'une minute enregistrée avant la ligne de départ (ou après l'arrivée). « Début retiré » suppose que tu as lancé la montre avant la ligne, « Fin retirée » que tu l'as arrêtée après l'arrivée. Choisis ce qui correspond à ce que tu as fait, ou règle les curseurs à la main. Les splits changent selon ce choix.`}</p></div></details>`;
}

/* ---------- page ---------- */
const kpi=(lab,val,sub,help)=>`<div class="card kpi"><div class="lab">${lab}${help?" "+hq(help):""}</div><div class="val">${val}</div><div class="sub">${sub||""}</div></div>`;
function renderAnalysis(){
  rpStop();momStop(true);
  const a=ANA,rep=buildReport(a,{pace,clock,km,previous:anaCustom?null:RACE.previous,official:anaCustom?null:RACE.official}),h=a.hr,el=a.ele,ca=a.cad;
  const dObj=a.objective?a.objective-(anaCustom?a.time:RACE.official):null;
  anaMarker=null;anaHL=null;
  const chart=mainChart(a);
  const calChip=anaCustom?`<span class="chip">${esc(anaTitle)}</span>`:`<span class="chip">${a.trimmed||a.trimmedEnd?`Calée : ${a.trimmed?clock(a.trimmed)+" en moins au début":""}${a.trimmed&&a.trimmedEnd?" · ":""}${a.trimmedEnd?clock(a.trimmedEnd)+" en moins à la fin":""}`:"Trace complète (non calée)"}</span>`;
  const head=`<div class="card heroMain" id="ana-resume" style="border-color:#3a2a1f"><div class="eyebrow">${anaCustom?"Analyse d'une trace":"Dimanche 15 novembre 2026"}</div><div style="display:flex;gap:18px;align-items:flex-end;flex-wrap:wrap;position:relative;z-index:1"><div><h2 style="margin:6px 0 0;font-size:22px">${esc(anaTitle)}</h2><div class="big">${clock(anaCustom?a.time:RACE.official)}<span>${anaCustom?"temps de la trace":"temps officiel"}</span></div></div>${dObj!=null?`<div class="stat" style="margin-bottom:8px;border-color:${dObj>=0?"#a3e63566":"#ef444466"}"><div class="l">vs objectif ${clock(a.objective)}</div><div class="v" style="color:${dObj>=0?"var(--ok)":"#ef4444"}">${dObj>=0?"−":"+"}${Math.abs(Math.round(dObj))} s</div></div>`:""}</div><div class="mut" style="position:relative;z-index:1;margin-top:6px">${esc(rep.resume)}</div><div class="chips">${calChip}<span class="chip">${a.points} points GPS</span>${h?`<span class="chip">FC <b>présente</b></span>`:`<span class="chip">FC <b>absente</b></span>`}${ca?`<span class="chip">Cadence <b>présente</b></span>`:""}</div>
   <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;position:relative;z-index:1">${anaCustom?`<button class="btn" data-anareset>← Revenir à ma course</button>`:""}${anaUpload()}</div></div>`;
  const nav=`<nav class="ananav" id="ananav">${[["ana-resume","Résumé"],["ana-graph","Graphique"],["ana-moments","Moments"],["ana-map","Carte"],["ana-splits","Splits"],...(h?[["ana-fc","FC"]]:[]),["ana-adv","Avancé"],["ana-proj","Projections"],["ana-cmp","Comparer"],["ana-bilan","Bilan"],["ana-share","Partager"],["ana-journal","Journal"],["ana-data","Données"]].map(([id,l])=>`<a href="#${id}" data-nav="${id}">${l}</a>`).join("")}</nav>`;
  const kp=`<div class="grid g4" style="margin-top:14px">${kpi("Allure moyenne",pace(a.avgPace)+"/km",anaCustom?"":`objectif ${pace(a.objective/10)}/km`,"allure")}${kpi("Distance",(a.dist/1000).toFixed(2).replace(".",",")+" km",a.scaled?`GPS ${(a.rawDist/1000).toFixed(2).replace(".",",")} km · calée sur 10 km`:"mesurée par GPS","distance")}${h?kpi("FC moyenne",Math.round(h.avg)+" bpm",`${h.pctMax.toFixed(0)} % de la FC max${h.fcmaxObserved?" observée":""}`,"fcmoy"):kpi("FC","—","absente du fichier")}${h?kpi("FC maximale",h.max+" bpm",`min ${h.min} bpm`,"fcmax"):kpi("FC maximale","—","")}${ca?kpi("Cadence moyenne",Math.round(ca.avg)+" pas/min",ca.factor===2?"valeur du fichier × 2":"valeur du fichier","cadence"):kpi("Cadence","—","absente du fichier")}${el?kpi("Dénivelé",`+${Math.round(el.gain)} / −${Math.round(el.loss)} m`,`altitude ${Math.round(el.min)}–${Math.round(el.max)} m`,"deniv"):kpi("Dénivelé","—","absent")}${kpi("Régularité",f1(a.variability.sd)+" s/km","écart-type des km · écart max "+Math.round(a.variability.range)+" s","regularite")}${kpi("Split",`${clock(a.split.first)} / ${clock(a.split.second)}`,a.split.diff>=0?`+${Math.round(a.split.diff)} s en 2e moitié`:`−${Math.round(-a.split.diff)} s en 2e moitié`,"split")}</div>`;
  const tools=`<div class="ctools"><div class="seg"><button class="btn ${anaView.axis==="d"?"on":""}" data-anaaxis="d">Distance</button><button class="btn ${anaView.axis==="t"?"on":""}" data-anaaxis="t">Temps</button></div><label class="chk"><input type="checkbox" data-anaser="pace" ${anaView.pace?"checked":""}><i class="dot" style="background:#ff6a2b"></i>Allure</label>${h?`<label class="chk"><input type="checkbox" data-anaser="hr" ${anaView.hr?"checked":""}><i class="dot" style="background:#ef4444"></i>FC</label>`:""}${el?`<label class="chk"><input type="checkbox" data-anaser="ele" ${anaView.ele?"checked":""}><i class="dot" style="background:#8b9bb0"></i>Altitude</label>`:""}</div>`;
  const main=`<h2 id="ana-graph">Allure et fréquence cardiaque</h2><div class="card">${tools}<div id="chartHost">${chart.html}</div><div class="mut" style="font-size:12.5px;margin-top:8px">Survole (ou touche) le graphique : la position apparaît sur la carte. Les pastilles ▼ ▲ sont les moments clés ci-dessous.</div></div>`;
  const mom=`<h2 id="ana-moments">Moments clés ${hq("moments")}</h2><div class="card">${momentsHtml(a)}</div>`;
  const map=`<h2 id="ana-map">Parcours</h2><div class="card"><div id="anaMap" class="mapbox"></div><div class="legend" style="margin-top:10px"><span><i class="dot" style="background:hsl(130,82%,52%)"></i>plus rapide</span><span><i class="dot" style="background:hsl(68,82%,52%)"></i></span><span><i class="dot" style="background:hsl(5,82%,52%)"></i>plus lent</span><span class="mut" style="margin-left:auto">couleur = allure · numéros = kilomètres · D départ · A arrivée</span></div><div class="momhud" id="momHud" hidden></div>${replayPanel(a)}</div>`;
  const planCols=a.plan?`<th>Plan</th><th>Écart</th><th>Cumul</th>`:"";
  const rows=a.splits.map((s,i)=>{const pl=a.plan&&a.plan[i],fast=s.pace<=a.avgPace-2,slow=s.pace>=a.avgPace+3,col=fast?"#a3e635":slow?"#ff6a2b":"#ffb020",sym=fast?"▲":slow?"▼":"●";
    return`<tr data-kmrow="${s.km}" class="${anaView.selKm===s.km?"sel":""}" style="cursor:pointer"><td class="num"><span style="color:${col};margin-right:6px" title="${fast?"plus rapide que ta moyenne":slow?"plus lent":"dans la moyenne"}">${sym}</span>${s.full?s.km:f1(s.len/1000)+" km"}</td><td class="num">${mmss(s.time)}</td><td class="num"><b>${pace(s.pace)}</b></td>${pl?`<td class="num mut">${pace(pl.plan)}</td><td class="num" style="color:${pl.delta<=0?"var(--ok)":"#ff8a5c"}">${pl.delta>0?"+":""}${Math.round(pl.delta)} s</td><td class="num mut">${pl.cumDelta>0?"+":""}${Math.round(pl.cumDelta)} s</td>`:(a.plan?"<td></td><td></td><td></td>":"")}<td class="num">${s.hr!=null?Math.round(s.hr):"—"}</td><td class="num">${s.hrMax!=null?s.hrMax:"—"}</td><td class="num">${s.cad!=null?Math.round(s.cad):"—"}</td><td class="num">${a.hasEle?`+${Math.round(s.gain)} / −${Math.round(s.loss)}`:"—"}</td></tr>`;}).join("");
  const spl=`<h2 id="ana-splits">Splits au kilomètre</h2><div class="card"><div class="legend" style="margin-bottom:6px"><span style="color:#a3e635">▲ plus rapide que ta moyenne</span><span style="color:#ffb020">● dans la moyenne</span><span style="color:#ff6a2b">▼ plus lent</span>${a.plan?`<span><i class="dot" style="background:#fff"></i>tiret : allure prévue au plan</span>`:""}<span><i class="dot" style="background:#a855f7"></i>pointillé : allure moyenne</span></div>${splitsChart(a)}<div class="mut" id="kmSelInfo" style="font-size:12.5px;margin:6px 0 4px">Touche un kilomètre (barre ou ligne du tableau) pour le voir sur le graphique et la carte.</div><div class="tscroll" style="margin-top:6px"><table class="stickycol"><tr><th>Km</th><th>Temps</th><th>Allure</th>${planCols}<th>FC moy</th><th>FC max</th><th>Cad.</th><th>D+ / D−</th></tr>${rows}</table></div>${a.plan?`<p class="mut" style="font-size:12.5px;margin:10px 0 0">Plan = stratégie de ton programme pour ${clock(a.objective)} : km 1 à +2 s, allure stable, relance au km 9, accélération finale. Écart négatif = plus rapide que prévu.</p>`:""}</div>`;
  const zrows=h?h.zones.map((z,i)=>{const lo=i===0?0:h.bounds[i-1],hi=i===4?h.fcmax:h.bounds[i];return`<div class="zrow"><span class="zn"><i class="dot" style="background:${ZCOL[i]}"></i>${ZNAME[i]}<small class="mut"> ${i===0?"< "+hi:i===4?"≥ "+lo:lo+"–"+hi} bpm</small></span><div class="bar" style="height:12px"><i style="width:${z.pct*100}%;background:${ZCOL[i]}"></i></div><span class="num">${mmss(z.s)}</span><b class="num" style="width:44px;text-align:right">${Math.round(z.pct*100)} %</b></div>`;}).reverse().join(""):"";
  const zon=h?`<h2 id="ana-fc">Zones de fréquence cardiaque ${hq("zones")}</h2><div class="card"><div class="grid g2"><div>${zrows}</div><div><div class="note"><b>Lecture de l'effort</b> ${hq("decouplage")}<br>${rep.effort.slice(0,2).map(esc).join("<br>")}</div><div style="margin-top:12px"><label class="mut" style="font-size:12px;font-weight:700">FC maximale utilisée pour les zones</label><div class="calcIn" style="margin-top:6px"><input id="fcmaxIn" inputmode="numeric" value="${Math.round(h.fcmax)}" style="width:100px;font-size:16px"><button class="btn" data-fcmax>Appliquer</button>${h.fcmaxObserved?"":`<button class="btn" data-fcmaxreset>Revenir au maximum observé</button>`}</div><p class="mut" style="font-size:12.5px;margin:8px 0 0">${h.fcmaxObserved?"Par défaut : la FC maximale observée sur cette trace. Si ta vraie FC max est plus haute, les zones se décalent vers le bas.":"Valeur saisie par toi."} ${h.custom?"Les seuils des zones sont ceux que tu as saisis ci-dessous.":"Zones : 60 / 70 / 80 / 90 % de la FC max."}</p></div>
   <details style="margin-top:12px"><summary class="mut" style="cursor:pointer;font-weight:700;font-size:13px">Utiliser les zones de ma montre Garmin</summary><p class="mut" style="font-size:12.5px;margin:8px 0">Dans Garmin Connect, ouvre tes zones de FC et saisis la FC où commence chaque zone.</p><div class="calcIn">${[2,3,4,5].map((z,k)=>`<label class="mut" style="font-size:12px;font-weight:700">Z${z} dès<br><input data-zbpm="${k}" inputmode="numeric" value="${h.bounds[k]}" style="width:78px;font-size:16px"></label>`).join("")}</div><div style="display:flex;gap:8px;margin-top:10px"><button class="btn" data-zonebpm>Appliquer</button>${h.custom?`<button class="btn" data-zonebpmreset>Revenir aux pourcentages</button>`:""}</div></details></div></div></div>`:"";
  const bst=a.bests.length?`<h2>Meilleurs passages</h2><div class="grid g3">${a.bests.map(b=>kpi("Meilleur "+(b.L/1000)+" km glissant",b.L===1000?mmss(b.time):clock(b.time),`${pace(b.pace)}/km · du km ${f1(b.from/1000)} au km ${f1(b.to/1000)}`)).join("")}</div>`:"";
  const li=arr=>arr.length?`<ul>${arr.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:`<div class="mut">Rien de marquant dans les données.</div>`;
  const bil=`<h2 id="ana-bilan">Bilan de course</h2><div class="grid g2"><div class="card prose" style="border-top:3px solid var(--ok)"><h3>Points forts</h3>${li(rep.forts)}</div><div class="card prose" style="border-top:3px solid #ff6a2b"><h3>Points faibles</h3>${li(rep.faibles)}</div><div class="card prose" style="border-top:3px solid #a855f7"><h3>Gestion de l'effort</h3>${li(rep.effort)}</div><div class="card prose" style="border-top:3px solid #06b6d4"><h3>Axes d'amélioration</h3>${li(rep.axes)}</div></div><p class="mut" style="font-size:12.5px;margin:10px 0 0">Ce bilan est généré à partir des mesures ci-dessus ; les pistes sont indicatives, pas un plan d'entraînement.</p>`;
  const q=a.quality,tick=(ok,w)=>ok?`<span style="color:var(--ok)">✓</span>`:w?`<span style="color:#ffb020">~</span>`:`<span style="color:#ef4444">✗</span>`;
  const qrows=[
    [tick(q.gaps===0,q.gaps<4),"GPS",`${q.samples} points, un toutes les ${Math.round(q.dtMedian)} s (maximum ${Math.round(q.dtMax)} s)${q.gaps?`, ${q.gaps} coupure(s)`:", aucune coupure"}. Entre les immeubles, le GPS dérive : les allures instantanées sont lissées sur 40 s.`],
    [anaCustom?tick(false,true):tick(a.windowOk,false),"Calage",anaCustom?"Pas de temps officiel connu pour cette trace.":(a.windowOk?`Durée retenue ${clock(a.time)} = temps officiel ${clock(RACE.official)}, ${(a.rawDist/1000).toFixed(3).replace(".",",")} km GPS.`:`Durée retenue ${clock(a.time)} ≠ temps officiel ${clock(RACE.official)} : les splits sont indicatifs.`)],
    ...(a.scaled?[[tick(true),"Distance",`${(a.rawDist/1000).toFixed(3).replace(".",",")} km mesurés, ramenés à 10,00 km pour les splits (écart de ${Math.abs((a.dist/a.rawDist-1)*100).toFixed(2).replace(".",",")} %).`]]:[]),
    ...(h?[[tick(q.hrCoverage>.98&&q.hrJumps===0,q.hrCoverage>.9),"Fréquence cardiaque",`${Math.round(q.hrCoverage*100)} % des points, ${q.hrJumps} saut(s) brutal(s) de plus de 12 bpm. ${h.fcmaxObserved?"La FC maximale réelle n'est pas dans le fichier : les zones utilisent le maximum observé.":"FC maximale saisie par toi."}`]]:[[tick(false,false),"Fréquence cardiaque","Absente du fichier."]]),
    ...(ca?[[tick(false,true),"Cadence",ca.factor===2?"Le fichier compte un pied sur deux (convention Strava) : valeur doublée, hypothèse à vérifier.":"Valeur du fichier."]]:[]),
    ...(el?[[tick(q.eleJumps===0,true),"Altitude","Issue du fichier, lissée : indicative à quelques mètres près."]]:[])
  ].map(r=>`<div class="qrow"><span class="qi">${r[0]}</span><span class="qn">${r[1]}</span><span class="mut">${r[2]}</span></div>`).join("");
  const lim=`<h2 id="ana-data">Fiabilité des données</h2><div class="card"><div class="qgrid">${qrows}</div><p class="mut" style="font-size:12.5px;margin:12px 0 0"><b>Absent du fichier</b> : puissance, température et météo, temps de contact au sol et oscillation, temps officiels intermédiaires, classement.</p></div>`;
  $("#anaRoot").innerHTML=head+nav+kp+calageCard(a)+main+mom+map+spl+zon+bst+advancedHtml(a)+projectionsHtml(a)+compareHtml(a)+bil+shareHtml(a)+journalHtml(a)+lim;
  bindMain(chart.c);drawMap(a);anaNavInit();drawSharePreview();rpRender();
}

/* ---------- navigation interne ---------- */
/* hauteur de l'en-tête du site quand il reste collé en haut (0 sur téléphone où il défile) */
function hdrOffset(){const h=document.querySelector(".top");return h&&getComputedStyle(h).position==="sticky"?h.offsetHeight:0;}
function anaNavInit(){
  document.documentElement.style.setProperty("--hdr",hdrOffset()+"px");
  anaNavActive();
}
function anaNavActive(){
  const nav=$("#ananav");if(!nav||!$("#v-analysis").classList.contains("on"))return;
  const off=hdrOffset()+70;let cur=null;
  nav.querySelectorAll("a").forEach(a=>{const e=document.getElementById(a.dataset.nav);if(e&&e.getBoundingClientRect().top<=off)cur=a;});
  nav.querySelectorAll("a").forEach(a=>a.classList.toggle("on",a===cur));
  if(cur&&nav.scrollWidth>nav.clientWidth)nav.scrollLeft=cur.offsetLeft-20;
}
window.addEventListener("scroll",()=>{if(ANA)anaNavActive();},{passive:true});

/* ---------- événements ---------- */
let helpPop=null;
function closeHelp(){if(helpPop){helpPop.remove();helpPop=null;}}
document.addEventListener("click",e=>{
  const hb=e.target.closest(".hq");
  if(hb){e.preventDefault();const same=helpPop&&helpPop.dataset.k===hb.dataset.help;closeHelp();if(same)return;
    helpPop=document.createElement("div");helpPop.className="hqpop";helpPop.dataset.k=hb.dataset.help;helpPop.textContent=HELP[hb.dataset.help]||"";document.body.appendChild(helpPop);
    const r=hb.getBoundingClientRect(),w=Math.min(280,innerWidth-24);helpPop.style.width=w+"px";helpPop.style.left=Math.max(12,Math.min(innerWidth-w-12,r.left-w/2+10))+"px";helpPop.style.top=(r.bottom+8)+"px";return;}
  if(helpPop&&!e.target.closest(".hqpop"))closeHelp();
  const el=e.target.closest("[data-momplay],[data-momclose],[data-rp],[data-sharedl],[data-sharesend],[data-jadd],[data-jdel],[data-jcmp],[data-zonebpm],[data-zonebpmreset],[data-cmpclear],[data-anareset],[data-fcmax],[data-fcmaxreset],[data-anaaxis],[data-kmrow],[data-mom],[data-allmom],[data-trimmode],[data-nav]");if(!el)return;
  if(el.hasAttribute("data-momplay")){if(MOM.i!=null)momStart(MOM.i);return;}
  if(el.hasAttribute("data-momclose")){momStop(true);mapHighlight(null);clearHover();document.querySelectorAll(".mom.sel").forEach(x=>x.classList.remove("sel"));return;}
  if(el.dataset.rp){rpAction(el);return;}
  if(el.hasAttribute("data-sharedl")){shareCanvas(ANA).toBlob(b=>{if(b){saveBlob(b,"course-10k.png");toast("Image téléchargée");}},"image/png");}
  else if(el.hasAttribute("data-sharesend")){shareNative();}
  else if(el.hasAttribute("data-jadd")){journalAdd();}
  else if(el.dataset.jdel){if(confirm("Retirer cette course du journal ?"))journalDel(el.dataset.jdel);}
  else if(el.dataset.jcmp){journalCompare(el.dataset.jcmp);}
  else if(el.hasAttribute("data-zonebpm")){const v=[...document.querySelectorAll("[data-zbpm]")].map(i=>+i.value);if(!v.every((x,i)=>x>=60&&x<=230&&(i===0||x>v[i-1]))){toast("Seuils croissants entre 60 et 230 bpm");return;}try{localStorage.setItem("prepa10kZoneBpm",JSON.stringify(v));}catch(x){}runAnalysis();}
  else if(el.hasAttribute("data-zonebpmreset")){try{localStorage.removeItem("prepa10kZoneBpm");}catch(x){}runAnalysis();}
  else if(el.hasAttribute("data-cmpclear")){anaCmp=null;renderAnalysis();document.getElementById("ana-cmp").scrollIntoView({block:"start"});}
  else if(el.hasAttribute("data-anareset")){anaCustom=false;anaTitle=RACE.name;anaPoints=null;ANA=null;initAnalysis();}
  else if(el.hasAttribute("data-fcmax")){const v=+$("#fcmaxIn").value;if(!(v>=120&&v<=230)){toast("FC max entre 120 et 230");return;}try{localStorage.setItem("prepa10kFcmax",v);}catch(x){}runAnalysis();}
  else if(el.hasAttribute("data-fcmaxreset")){try{localStorage.removeItem("prepa10kFcmax");}catch(x){}runAnalysis();}
  else if(el.dataset.anaaxis){anaView.axis=el.dataset.anaaxis;renderChart();}
  else if(el.dataset.kmrow){selectKm(+el.dataset.kmrow);}
  else if(el.dataset.mom!==undefined){focusMoment(+el.dataset.mom);}
  else if(el.hasAttribute("data-allmom")){anaView.allMoments=!anaView.allMoments;renderAnalysis();document.getElementById("ana-moments").scrollIntoView({block:"start"});}
  else if(el.dataset.trimmode){const m=el.dataset.trimmode;anaTrim.mode=m;if(m==="custom"){anaTrim.s=Math.round(ANA.trimmed);anaTrim.e=Math.round(ANA.trimmedEnd);}saveTrim();anaView.calOpen=true;runAnalysis();}
  else if(el.dataset.nav){e.preventDefault();const t=document.getElementById(el.dataset.nav);if(t)t.scrollIntoView({behavior:"smooth",block:"start"});}
});
window.addEventListener("resize",()=>{closeHelp();if(ANA)anaNavInit();});
document.addEventListener("toggle",e=>{if(e.target.id==="ana-calage")anaView.calOpen=e.target.open;},true);
document.addEventListener("input",e=>{
  if(!ANA||(e.target.id!=="trimS"&&e.target.id!=="trimE"))return;
  const s=+$("#trimS").value,en=+$("#trimE").value;
  $("#trSv").textContent=s+" s";$("#trEv").textContent=en+" s";
  $("#trSd").textContent="≈ "+Math.round(lerp(ANA.rawT,ANA.rawD,s))+" m";$("#trEd").textContent="≈ "+Math.round(ANA.fullDist-lerp(ANA.rawT,ANA.rawD,ANA.total-en))+" m";
});
document.addEventListener("change",e=>{
  if(ANA&&(e.target.id==="trimS"||e.target.id==="trimE")){anaTrim={mode:"custom",s:+$("#trimS").value,e:+$("#trimE").value};if(!anaCustom)saveTrim();anaView.calOpen=true;runAnalysis();return;}
  if(e.target.dataset&&e.target.dataset.anaser){anaView[e.target.dataset.anaser]=e.target.checked;renderChart();return;}
  if(e.target.id==="cmpFile"){const f=e.target.files[0];if(!f||!ANA)return;
    f.text().then(t=>{const p=parseGpx(t);if(p.length<10){toast("Fichier GPX non reconnu");return;}const b=analyzeRun(p,{fcmax:fcmaxSaved(),zoneBpm:zoneBpmSaved()});if(!b){toast("Trace trop courte");return;}anaCmp={name:f.name.replace(/\.gpx$/i,""),a:b};renderAnalysis();document.getElementById("ana-cmp").scrollIntoView({block:"start"});toast("Comparaison prête");}).catch(()=>toast("Lecture impossible"));
    e.target.value="";return;}
  if(e.target.id!=="anaFile")return;const f=e.target.files[0];if(!f)return;
  f.text().then(t=>{const p=parseGpx(t);if(p.length<10){toast("Fichier GPX non reconnu");return;}anaPoints=p;anaCustom=true;anaTitle=f.name.replace(/\.gpx$/i,"");anaTrim={mode:"full"};runAnalysis();toast("Trace analysée");}).catch(()=>toast("Lecture impossible"));
  e.target.value="";
});
let anaNarrow=innerWidth<620;
window.addEventListener("resize",()=>{const n=innerWidth<620;if(n!==anaNarrow){anaNarrow=n;if(ANA&&$("#v-analysis").classList.contains("on"))renderAnalysis();}});

/* ---------- LOT 2 : indicateurs avancés, graphiques complémentaires, projections, comparaison ---------- */
function miniBars(vals,labels,o){
  o=o||{};const W=480,H=o.h||230,L=8,R=8,Tp=30,B=32,iw=W-L-R,ih=H-Tp-B,n=vals.length;
  const mn=Math.min(...vals),mx=Math.max(...vals),span=(mx-mn)||1,lo=o.lo!=null?o.lo:mn-span*.6,hi=o.hi!=null?o.hi:mx+span*.2;
  const Y=v=>Tp+ih-(Math.max(lo,Math.min(hi,v))-lo)/(hi-lo)*ih,bw=iw/n,fmt=o.fmt||(v=>v);let s="";
  vals.forEach((v,i)=>{const col=(o.colors&&o.colors[i])||o.color||"#ffb020",x=L+i*bw+bw*.14,w=bw*.72,y=Y(v);
    s+=`<rect x="${x}" y="${y}" width="${w}" height="${Math.max(1,Tp+ih-y)}" rx="5" fill="${col}" fill-opacity=".9"/><text x="${x+w/2}" y="${y-7}" fill="#e8eef6" font-size="${o.vfs||14}" font-weight="800" text-anchor="middle">${fmt(v)}</text><text x="${x+w/2}" y="${H-10}" fill="#8b9bb0" font-size="14" font-weight="700" text-anchor="middle">${labels[i]}</text>`;});
  if(o.ref!=null)s+=`<line x1="${L}" x2="${W-R}" y1="${Y(o.ref)}" y2="${Y(o.ref)}" stroke="#a855f7" stroke-dasharray="1 5" stroke-width="2"/>`;
  return`<svg viewBox="0 0 ${W} ${H}" class="achart">${s}</svg>`;
}
function stackedZones(a){
  const sp=a.fullSplits.filter(x=>x.zt),W=480,H=250,L=8,R=8,Tp=10,B=32,iw=W-L-R,ih=H-Tp-B,bw=iw/sp.length;let s="";
  sp.forEach((x,i)=>{const tot=x.zt.reduce((p,q)=>p+q,0)||1;let y=Tp+ih;x.zt.forEach((t,z)=>{const hgt=t/tot*ih;if(hgt<0.5)return;y-=hgt;s+=`<rect x="${L+i*bw+bw*.14}" y="${y}" width="${bw*.72}" height="${hgt}" fill="${ZCOL[z]}"><title>Km ${x.km} · zone ${z+1} · ${Math.round(t)} s</title></rect>`;});
    s+=`<text x="${L+i*bw+bw/2}" y="${H-10}" fill="#8b9bb0" font-size="14" font-weight="700" text-anchor="middle">${x.km}</text>`;});
  return`<svg viewBox="0 0 ${W} ${H}" class="achart">${s}</svg>`;
}
function scatterChart(a){
  const pts=a.adv.scatter,W=480,H=270,L=44,R=12,Tp=12,B=36,iw=W-L-R,ih=H-Tp-B;
  const ps=pts.map(x=>x.p),hs=pts.map(x=>x.hr),pmin=Math.floor((quantile(ps,.02)-4)/15)*15,pmax=Math.ceil((quantile(ps,.98)+4)/15)*15,hmin=Math.floor(Math.min(...hs)/10)*10,hmax=Math.ceil(Math.max(...hs)/10)*10;
  const X=p=>L+(pmax-Math.min(pmax,Math.max(pmin,p)))/(pmax-pmin)*iw,Y=h=>Tp+ih-(h-hmin)/(hmax-hmin)*ih;let s="";
  for(let h=hmin;h<=hmax;h+=10)s+=`<line x1="${L}" x2="${W-R}" y1="${Y(h)}" y2="${Y(h)}" stroke="#1d2734"/><text x="${L-6}" y="${Y(h)+5}" fill="#f08a8a" font-size="14" text-anchor="end">${h}</text>`;
  for(let p=pmin;p<=pmax;p+=15)s+=`<text x="${X(p)}" y="${H-12}" fill="#ff9a66" font-size="14" text-anchor="middle">${pace(p)}</text>`;
  pts.forEach(x=>{s+=`<circle cx="${X(x.p).toFixed(1)}" cy="${Y(x.hr).toFixed(1)}" r="4" fill="hsl(${Math.round(210-190*x.d/a.dist)},85%,58%)" fill-opacity=".75"/>`;});
  return`<svg viewBox="0 0 ${W} ${H}" class="achart">${s}</svg>`;
}
function advancedHtml(a){
  const ad=a.adv,sp=a.fullSplits,n=sp.length,fm=(x,d)=>x.toFixed(d).replace(".",","),kms=sp.map(x=>x.km);
  const cards=[
    ad.stride!=null?kpi("Foulée moyenne",fm(ad.stride,2)+" m",`de ${fm(ad.strideMin,2)} à ${fm(ad.strideMax,2)} m selon les km`,"foulee"):"",
    ad.eff!=null?kpi("Efficacité",fm(ad.eff,2)+" m/battement","plus haut = plus économique","efficacite"):"",
    kpi("Km réguliers",`${ad.clean} / ${n}`,"à ± 5 s de ta moyenne","propres"),
    kpi("À-coups",`−${Math.round(ad.lost)} s / +${Math.round(ad.won)} s`,"perdu dans les ralentissements / gagné dans les accélérations","bilanTemps"),
    ad.t90!=null?kpi("Montée de la FC",Math.round(ad.t90)+" s","pour atteindre 90 % du maximum","montee"):"",
    ad.hr0!=null?kpi("FC au début analysé",Math.round(ad.hr0)+" bpm",a.trimmed?"à la ligne de départ (trace calée)":"au début de la trace"):""
  ].join("");
  const card=(t,cap,svg)=>`<div class="card cc"><h3>${t}</h3><div class="mut" style="font-size:12.5px;margin:-4px 0 6px">${cap}</div>${svg}</div>`;
  const g=[];
  if(a.plan){const av=a.plan.map(x=>-x.cumDelta),mxI=av.indexOf(Math.max(...av));g.push(card("Avance cumulée sur ton plan",`Avance maximale de ${Math.round(Math.max(...av))} s au km ${mxI+1} ; ${av[av.length-1]>=0?"avance":"retard"} de ${Math.abs(Math.round(av[av.length-1]))} s à l'arrivée (positif = en avance).`,miniBars(av,kms,{lo:Math.min(0,...av)-2,hi:Math.max(...av)+8,color:"#a3e635",colors:av.map(v=>v>=0?"#a3e635":"#ef4444"),fmt:v=>(v>0?"+":"")+Math.round(v)})));}
  const tot=ad.hist.reduce((x,b)=>x+b.sec,0),near=ad.hist.filter(b=>Math.abs(b.lo+5-a.avgPace)<=10).reduce((x,b)=>x+b.sec,0);
  g.push(card("Répartition des allures",`${Math.round(near/tot*100)} % du temps à moins de 10 s/km de ta moyenne (${pace(a.avgPace)}).`,miniBars(ad.hist.map(b=>b.sec/tot*100),ad.hist.map(b=>pace(b.lo)),{lo:0,fmt:v=>Math.round(v)+"%",color:"#ff6a2b",colors:ad.hist.map(b=>Math.abs(b.lo+5-a.avgPace)<=5?"#ffb020":"#ff6a2b"),vfs:12})));
  if(a.hasCad){const c=sp.map(x=>x.cad);g.push(card("Cadence par kilomètre",`De ${Math.round(Math.min(...c))} à ${Math.round(Math.max(...c))} pas/min : ${c[0]-c[n-1]>=4?"elle diminue au fil de la course":"elle reste stable"}.`,miniBars(c,kms,{fmt:v=>Math.round(v),color:"#06b6d4"})));
    const st=sp.map(x=>x.stride),mnI=st.indexOf(Math.min(...st));g.push(card("Longueur de foulée par kilomètre",`Foulée la plus courte au km ${mnI+1} (${fm(st[mnI],2)} m), la plus longue au km ${st.indexOf(Math.max(...st))+1} (${fm(Math.max(...st),2)} m).`,miniBars(st,kms,{fmt:v=>fm(v,2),color:"#8b5cf6",vfs:12,ref:ad.stride})));}
  if(a.hasHr){const e=sp.map(x=>x.eff),mnE=e.indexOf(Math.min(...e));g.push(card("Efficacité par kilomètre (m par battement)",`Plus basse au km ${mnE+1} (${fm(e[mnE],2)}), meilleure au km ${e.indexOf(Math.max(...e))+1} (${fm(Math.max(...e),2)}). Le km 1 est biaisé par la montée de la FC.`,miniBars(e,kms,{fmt:v=>fm(v,2),color:"#22c55e",vfs:12,ref:ad.eff})));
    g.push(card("FC par zones et par kilomètre",`${Math.round(a.hr.zones[4].pct*100)} % du temps en zone 5, ${Math.round(a.hr.zones[3].pct*100)} % en zone 4. Couleurs : zone 1 (gris) à zone 5 (rouge).`,stackedZones(a)));
    g.push(card("Nuage allure / fréquence cardiaque",`Chaque point = 10 s de course, du début (bleu) à la fin (orange). Les points à droite sont les passages rapides.`,scatterChart(a)));}
  return`<h2 id="ana-adv">Indicateurs avancés</h2><div class="grid g3">${cards}</div><div class="chartgrid" style="margin-top:14px">${g.join("")}</div>`;
}
function projectionsHtml(a){
  const T0=anaCustom?a.time:RACE.official,dKm=anaCustom?a.dist/1000:10;
  const pr=predictTimes(T0,dKm).filter(x=>Math.abs(x.D-dKm)>0.05),fmtT=t=>{const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=Math.round(t%60);return h?`${h}h${String(m).padStart(2,"0")}'${String(s).padStart(2,"0")}`:`${m}'${String(s).padStart(2,"0")}`;};
  const rows=pr.map(x=>`<tr><td><b>${x.l}</b></td><td class="num">${fmtT(x.t)}</td><td class="num mut">${pace(x.t/x.D)}/km</td></tr>`).join("");
  const showTr=dKm>9.5&&dKm<10.5,p10=T0/dKm,tp=showTr?trainingPaces(p10):[];
  const trRows=tp.map(z=>`<tr><td><b>${z.n}</b></td><td class="num mut">${Z[z.z].r}</td><td class="num">${pace(z.lo)} – ${pace(z.hi)}</td></tr>`).join("");
  return`<h2 id="ana-proj">Projections et allures ${hq("riegel")}</h2><div class="grid g2"><div class="card"><h3>Ce que ce chrono laisse espérer</h3><div class="tscroll"><table><tr><th>Distance</th><th>Projection</th><th>Allure</th></tr>${rows}</table></div><p class="mut" style="font-size:12.5px;margin:10px 0 0">Estimation de Riegel à partir de ${fmtT(T0)} sur ${f1(dKm)} km. Valable à préparation égale : le marathon exige une préparation spécifique, ne prends cette valeur que comme repère.</p></div>
  ${showTr?`<div class="card"><h3>Tes allures d'entraînement mises à jour</h3><div class="tscroll"><table><tr><th>Zone</th><th>Ancien plan</th><th>Recalculée</th></tr>${trRows}</table></div><p class="mut" style="font-size:12.5px;margin:10px 0 0">Mêmes proportions que ton programme (calé sur 4'18/km au 10 km), appliquées à ton allure réelle de ${pace(p10)}/km. À réévaluer avec un test avant ta prochaine préparation.</p></div>`:`<div class="card"><h3>Allures d'entraînement</h3><div class="mut">Disponibles pour une course de 10 km uniquement.</div></div>`}</div>`;
}
function compareHtml(a){
  const head=`<h2 id="ana-cmp">Comparer avec une autre trace</h2>`;
  if(!anaCmp)return head+`<div class="card"><div class="mut">Charge un autre fichier GPX (une course précédente ou une sortie d'entraînement) pour comparer indicateurs, allure sur la distance et splits côte à côte.</div><label class="btn" style="display:inline-block;cursor:pointer;margin-top:12px">Choisir une trace GPX<input type="file" id="cmpFile" accept=".gpx,application/gpx+xml,text/xml" hidden></label></div>`;
  const b=anaCmp.a,fm=(x,d)=>x.toFixed(d).replace(".",","),dif=(x,y,f,u,lowerBetter)=>{const d=x-y,ad=Math.abs(d),body=f===pace?Math.round(ad)+" s/km":(f===clock&&ad<120?Math.round(ad)+" s":f(ad)+u);return`<td class="num" style="color:${Math.abs(d)<0.5?"var(--mut)":((d<0)===lowerBetter?"var(--ok)":"#ff8a5c")}">${Math.abs(d)<0.5?"=":(d>0?"+":"−")+body}</td>`;};
  const row=(l,va,vb,f,u,lb)=>`<tr><td><b>${l}</b></td><td class="num">${f(va)}${u}</td><td class="num">${f(vb)}${u}</td>${lb==null?"<td></td>":dif(va,vb,f,u,lb)}</tr>`;
  const tbl=[row("Temps",a.time,b.time,clock,"",null),row("Distance",a.dist/1000,b.dist/1000,x=>fm(x,2)," km",null),row("Allure moyenne",a.avgPace,b.avgPace,pace,"/km",true),
    ...(a.hr&&b.hr?[row("FC moyenne",a.hr.avg,b.hr.avg,x=>Math.round(x)," bpm",true),row("FC max",a.hr.max,b.hr.max,x=>Math.round(x)," bpm",null)]:[]),
    ...(a.cad&&b.cad?[row("Cadence",a.cad.avg,b.cad.avg,x=>Math.round(x)," pas/min",null)]:[]),
    row("Régularité (écart-type)",a.variability.sd,b.variability.sd,x=>fm(x,1)," s/km",true),
    ...(a.ele&&b.ele?[row("Dénivelé +",a.ele.gain,b.ele.gain,x=>Math.round(x)," m",null)]:[])].join("");
  const n=Math.min(a.fullSplits.length,b.fullSplits.length),srows=[];for(let i=0;i<n;i++){const x=a.fullSplits[i].pace,y=b.fullSplits[i].pace;srows.push(`<tr><td class="num">${i+1}</td><td class="num">${pace(x)}</td><td class="num">${pace(y)}</td><td class="num" style="color:${x<=y?"var(--ok)":"#ff8a5c"}">${x-y>0?"+":"−"}${Math.abs(Math.round(x-y))} s</td></tr>`);}
  const W=480,H=260,L=44,R=10,Tp=12,B=34,iw=W-L-R,ih=H-Tp-B,Dm=Math.max(a.dist,b.dist),all=[...a.grid.pace,...b.grid.pace].filter(x=>x!=null),pmin=Math.floor((quantile(all,.02)-6)/15)*15,pmax=Math.ceil((quantile(all,.98)+6)/15)*15;
  const X=d=>L+d/Dm*iw,Y=p=>Tp+(Math.min(pmax,Math.max(pmin,p))-pmin)/(pmax-pmin)*ih;let sv="";
  for(let p=pmin;p<=pmax;p+=15)sv+=`<line x1="${L}" x2="${W-R}" y1="${Y(p)}" y2="${Y(p)}" stroke="#1d2734"/><text x="${L-6}" y="${Y(p)+5}" fill="#8b9bb0" font-size="14" text-anchor="end">${pace(p)}</text>`;
  for(let k=0;k<=Math.floor(Dm/1000);k+=2)sv+=`<text x="${X(k*1000)}" y="${H-10}" fill="#8b9bb0" font-size="14" text-anchor="middle">${k}</text>`;
  const path=gr=>{let d="",pen=false;gr.pace.forEach((p,i)=>{if(p==null){pen=false;return;}d+=(pen?"L":"M")+X(gr.d[i]).toFixed(1)+","+Y(p).toFixed(1);pen=true;});return d;};
  sv+=`<path d="${path(b.grid)}" fill="none" stroke="#06b6d4" stroke-width="3"/><path d="${path(a.grid)}" fill="none" stroke="#ff6a2b" stroke-width="3"/>`;
  return head+`<div class="card"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px"><span class="chip"><i class="dot" style="background:#ff6a2b"></i>${esc(anaCustom?anaTitle:RACE.name)}</span><span class="chip"><i class="dot" style="background:#06b6d4"></i>${esc(anaCmp.name)}</span><button class="btn" data-cmpclear style="margin-left:auto">Retirer la comparaison</button></div>
   <div class="grid g2"><div class="tscroll"><table><tr><th></th><th>Cette course</th><th>${esc(anaCmp.name)}</th><th>Écart</th></tr>${tbl}</table></div><div><svg viewBox="0 0 ${W} ${H}" class="achart">${sv}</svg><div class="mut" style="font-size:12.5px">Allure en fonction de la distance (km). L'autre trace est analysée en entier, sans calage.</div></div></div>
   ${n?`<h3 style="margin:16px 0 6px">Splits kilomètre par kilomètre</h3><div class="tscroll"><table><tr><th>Km</th><th>Cette course</th><th>${esc(anaCmp.name)}</th><th>Écart</th></tr>${srows.join("")}</table></div>`:""}</div>`;
}

/* ---------- LOT 3 : image de partage ---------- */
function shareCanvas(a){
  const W=1080,H=1350,c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
  const bg=x.createLinearGradient(0,0,W,H);bg.addColorStop(0,"#0a0d12");bg.addColorStop(1,"#1a1109");x.fillStyle=bg;x.fillRect(0,0,W,H);
  const gl=x.createRadialGradient(W*.88,60,10,W*.88,60,560);gl.addColorStop(0,"rgba(255,106,43,.38)");gl.addColorStop(1,"rgba(255,106,43,0)");x.fillStyle=gl;x.fillRect(0,0,W,H);
  const rr=(px,py,w,h,r)=>{x.beginPath();x.moveTo(px+r,py);x.arcTo(px+w,py,px+w,py+h,r);x.arcTo(px+w,py+h,px,py+h,r);x.arcTo(px,py+h,px,py,r);x.arcTo(px,py,px+w,py,r);x.closePath();};
  const F="system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
  const lg=x.createLinearGradient(60,60,140,140);lg.addColorStop(0,"#ff6a2b");lg.addColorStop(1,"#ffb020");rr(60,60,84,84,24);x.fillStyle=lg;x.fill();
  x.fillStyle="#1a0c04";x.font=`900 34px ${F}`;x.textAlign="center";x.fillText("10K",102,114);
  x.textAlign="left";x.fillStyle="#e8eef6";x.font=`800 46px ${F}`;x.fillText(anaCustom?anaTitle:RACE.name,166,96);
  x.fillStyle="#8b9bb0";x.font=`600 30px ${F}`;x.fillText(new Date(a.startTs).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}),166,138);
  const official=anaCustom?a.time:RACE.official;
  x.fillStyle="#ffb020";x.font=`800 30px ${F}`;x.fillText(anaCustom?"TEMPS DE LA TRACE":"TEMPS OFFICIEL",60,260);
  x.fillStyle="#fff";x.font=`900 210px ${F}`;x.fillText(clock(official),52,440);
  const dObj=a.objective?a.objective-official:null;
  x.font=`700 34px ${F}`;x.fillStyle=dObj!=null&&dObj>=0?"#a3e635":"#8b9bb0";
  x.fillText(dObj!=null?(dObj>=0?`Objectif ${clock(a.objective)} battu de ${Math.round(dObj)} s`:`Objectif ${clock(a.objective)} manqué de ${Math.round(-dObj)} s`):`${(a.dist/1000).toFixed(2).replace(".",",")} km`,60,500);
  // tracé
  const g=a.grid,bx=60,by=540,bw=960,bh=520,lat0=mean(g.lat),cs=Math.cos(lat0*Math.PI/180),xs=g.lon.map(v=>v*cs),ys=g.lat;
  const minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys),k=Math.min((bw-80)/(maxx-minx),(bh-80)/(maxy-miny)),ox=bx+(bw-(maxx-minx)*k)/2,oy=by+(bh-(maxy-miny)*k)/2;
  const P=i=>[ox+(xs[i]-minx)*k,by+bh-(oy-by)-(ys[i]-miny)*k];
  rr(bx,by,bw,bh,28);x.fillStyle="rgba(255,255,255,.04)";x.fill();x.strokeStyle="rgba(255,255,255,.08)";x.lineWidth=2;x.stroke();
  const pv=g.pace.filter(v=>v!=null),lo=quantile(pv,.1),hi=quantile(pv,.9);x.lineCap="round";x.lineWidth=9;
  for(let i=1;i<g.d.length;i++){const p=P(i-1),q=P(i);x.strokeStyle=paceColor(g.pace[i]||a.avgPace,lo,hi);x.beginPath();x.moveTo(p[0],p[1]);x.lineTo(q[0],q[1]);x.stroke();}
  kmIndices(a).forEach(([km,i])=>{const p=P(i);x.beginPath();x.arc(p[0],p[1],17,0,7);x.fillStyle="#0a0d12";x.fill();x.lineWidth=3;x.strokeStyle="#ff6a2b";x.stroke();x.fillStyle="#fff";x.font=`800 19px ${F}`;x.textAlign="center";x.fillText(km,p[0],p[1]+7);});
  [[0,"D"],[g.d.length-1,"A"]].forEach(([i,t])=>{const p=P(i);x.beginPath();x.arc(p[0],p[1],20,0,7);x.fillStyle="#ff6a2b";x.fill();x.lineWidth=3;x.strokeStyle="#fff";x.stroke();x.fillStyle="#1a0c04";x.font=`900 20px ${F}`;x.fillText(t,p[0],p[1]+7);});
  // indicateurs
  const kp=[["ALLURE",pace(a.avgPace)+"/km"],[a.hr?"FC MOYENNE":"DISTANCE",a.hr?Math.round(a.hr.avg)+" bpm":(a.dist/1000).toFixed(2).replace(".",",")+" km"],[a.cad?"CADENCE":"RÉGULARITÉ",a.cad?Math.round(a.cad.avg)+" pas/min":f1(a.variability.sd)+" s/km"],[a.ele?"DÉNIVELÉ":"SPLIT",a.ele?"+"+Math.round(a.ele.gain)+" m":clock(a.split.first)+" / "+clock(a.split.second)]];
  const tw=(W-120-3*18)/4;
  kp.forEach(([l,v],i)=>{const px=60+i*(tw+18);rr(px,1100,tw,150,22);x.fillStyle="rgba(255,255,255,.06)";x.fill();x.strokeStyle="rgba(255,255,255,.1)";x.lineWidth=2;x.stroke();x.textAlign="left";x.fillStyle="#8b9bb0";x.font=`700 21px ${F}`;x.fillText(l,px+22,1146);x.fillStyle="#fff";x.font=`900 ${v.length>9?34:42}px ${F}`;x.fillText(v,px+22,1210);});
  x.textAlign="left";x.fillStyle="#5f6f84";x.font=`600 26px ${F}`;x.fillText("Allure : vert = rapide, rouge = lent · Prépa 10K",60,1306);
  return c;
}
function drawSharePreview(){
  const el=$("#shareImg");if(!el||!ANA)return;
  try{el.src=shareCanvas(ANA).toDataURL("image/png");}catch(e){el.alt="Aperçu indisponible";}
}
function shareHtml(a){
  return`<h2 id="ana-share">Image de partage</h2><div class="card"><div class="grid g2" style="align-items:center"><div><img id="shareImg" alt="Aperçu de l'image de partage" style="width:100%;max-width:340px;border-radius:16px;border:1px solid var(--line);display:block;margin:0 auto"></div><div><p class="mut" style="margin-top:0">Une image 1080 × 1350 de ta course (temps, tracé coloré par allure, indicateurs) à poster sur tes réseaux ou à garder.</p><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn pri" data-sharedl>⬇ Télécharger l'image</button>${navigator.canShare?`<button class="btn" data-sharesend>↗ Partager…</button>`:""}</div><p class="mut" style="font-size:12.5px;margin:12px 0 0">L'image est générée sur ton appareil : rien n'est envoyé nulle part. Elle contient le tracé GPS de ta course.</p></div></div></div>`;
}
function shareNative(){
  shareCanvas(ANA).toBlob(b=>{if(!b)return;const f=new File([b],"course-10k.png",{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[f]}))navigator.share({files:[f],title:anaTitle}).catch(()=>{});else{saveBlob(b,"course-10k.png");toast("Partage indisponible : image téléchargée");}},"image/png");
}

/* ---------- LOT 3 : journal des courses (synchronisé avec le reste du suivi) ---------- */
const entryDate=ts=>new Date(ts).toISOString().slice(0,10);
function entryFrom(a,name){
  const curve=[];for(let d=0;d<=a.dist;d+=100){const i=idxAtD(d),p=a.grid.pace[i];curve.push(p==null?null:Math.round(p));}
  const slug=String(name).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,30)||"course";
  return{id:entryDate(a.startTs)+"-"+slug,name,ts:a.startTs,time:Math.round(a.time),dist:Math.round(a.dist),avgPace:+a.avgPace.toFixed(1),hrAvg:a.hr?Math.round(a.hr.avg):null,hrMax:a.hr?a.hr.max:null,cad:a.cad?Math.round(a.cad.avg):null,gain:a.ele?Math.round(a.ele.gain):null,sd:+a.variability.sd.toFixed(2),splits:a.fullSplits.map(x=>+x.pace.toFixed(1)),curve};
}
function entryToCmp(e){
  const curve=e.curve.map((p,i)=>({p,d:i*100}));
  return{time:e.time,dist:e.dist,avgPace:e.avgPace,hr:e.hrAvg!=null?{avg:e.hrAvg,max:e.hrMax}:null,cad:e.cad!=null?{avg:e.cad}:null,ele:e.gain!=null?{gain:e.gain}:null,variability:{sd:e.sd},
    fullSplits:e.splits.map(p=>({pace:p})),grid:{pace:curve.map(x=>x.p),d:curve.map(x=>x.d)}};
}
function journalHtml(a){
  const J=state.journal||{},list=Object.values(J).sort((x,y)=>y.ts-x.ts);
  const rows=list.map(e=>`<div class="jrow"><div><b>${esc(e.name)}</b><div class="mut" style="font-size:12.5px">${new Date(e.ts).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})} · ${(e.dist/1000).toFixed(2).replace(".",",")} km · ${clock(e.time)} · ${pace(e.avgPace)}/km${e.hrAvg?` · FC ${e.hrAvg}`:""}</div></div><div class="jbtn"><button class="btn" data-jcmp="${esc(e.id)}">Comparer</button><button class="btn" data-jdel="${esc(e.id)}" aria-label="Retirer du journal">✕</button></div></div>`).join("");
  const cur=entryFrom(a,anaCustom?anaTitle:RACE.name),has=!!J[cur.id];
  return`<h2 id="ana-journal">Journal des courses</h2><div class="card"><div class="mut" style="margin-top:0">Garde un résumé de tes courses (temps, allure, FC, splits) pour les comparer plus tard. Seul le résumé est enregistré, pas le fichier GPX. ${typeof syncCode==="function"&&syncCode()?"Le journal est synchronisé avec tes autres appareils.":"Il reste sur cet appareil tant que la synchronisation n'est pas activée."}</div>
   <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:12px 0"><input id="jname" value="${esc(cur.name)}" style="flex:1;min-width:180px;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:9px 11px;color:inherit" aria-label="Nom de la course"><button class="btn pri" data-jadd>${has?"Mettre à jour dans le journal":"+ Ajouter cette course au journal"}</button></div>
   ${rows||`<div class="mut">Aucune course enregistrée pour l'instant.</div>`}</div>`;
}
function journalAdd(){
  const name=($("#jname").value||"").trim()||anaTitle,e=entryFrom(ANA,name);
  state.journal=state.journal||{};state.journal[e.id]=e;save();toast("Course ajoutée au journal");renderAnalysis();document.getElementById("ana-journal").scrollIntoView({block:"start"});
}
function journalDel(id){if(state.journal)delete state.journal[id];save();renderAnalysis();document.getElementById("ana-journal").scrollIntoView({block:"start"});}
function journalCompare(id){const e=(state.journal||{})[id];if(!e)return;anaCmp={name:e.name,a:entryToCmp(e)};renderAnalysis();document.getElementById("ana-cmp").scrollIntoView({block:"start"});}

/* ---------- REDIFFUSION DE LA COURSE (animation du tracé, synchronisée sur le temps réel) ---------- */
const RP={t:0,playing:false,speed:10,follow:false,raf:null,last:0,ready:false,base:null,trail:null,tip:null,mk:null,halo:null,pf:null,trailN:0,dim:false,lo:0,hi:0};
const RP_SPEEDS=[1,5,10,30,60];
function replayPanel(a){
  return`<div class="rp" id="rpBox"><div class="rphud"><div class="rptile"><span>Chrono</span><b id="rpT">0:00</b></div><div class="rptile"><span>Distance</span><b id="rpD">0,00</b><small>km</small></div><div class="rptile"><span>Allure</span><b id="rpP">—</b><small>/km</small></div>${a.hasHr?`<div class="rptile"><span>Fréquence</span><b id="rpH">—</b><small>bpm</small></div>`:`<div class="rptile"><span>Km</span><b id="rpK">1</b></div>`}</div>
  <input type="range" id="rpSlider" class="rpslider" min="0" max="1000" value="0" aria-label="Position dans la course">
  <div class="rpctl"><button class="btn pri" data-rp="play" id="rpPlay">▶ Lecture</button><button class="btn" data-rp="reset">⏮ Début</button><div class="seg" id="rpSpeed">${RP_SPEEDS.map(v=>`<button class="btn ${v===RP.speed?"on":""}" data-rp="speed" data-v="${v}">×${v}</button>`).join("")}</div><button class="btn" data-rp="follow" id="rpFollow">🎯 Suivre</button></div>
  <div class="mut" id="rpMsg" style="font-size:12.5px;margin-top:8px">Rediffusion de ta course : ×1 = temps réel (${clock(a.time)}), ×10 la rejoue en ${mmss(a.time/10)}.</div></div>`;
}
function rpInit(lo,hi){
  const g=ANA.grid;RP.lo=lo;RP.hi=hi;
  const f=g.pace.slice();let last=null;for(let i=0;i<f.length;i++){if(f[i]==null)f[i]=last;else last=f[i];}
  for(let i=f.length-1;i>=0;i--){if(f[i]==null)f[i]=f[i+1];else break;}
  RP.pf=f;RP.trail=L.layerGroup().addTo(anaMap);RP.trailN=0;RP.dim=false;
  RP.tip=L.polyline([],{weight:6,opacity:1,color:"#fff",lineCap:"round"}).addTo(anaMap);
  RP.halo=L.circleMarker([g.lat[0],g.lon[0]],{radius:17,stroke:false,fillColor:"#ff6a2b",fillOpacity:.28,interactive:false}).addTo(anaMap);
  RP.mk=L.circleMarker([g.lat[0],g.lon[0]],{radius:8,color:"#fff",weight:3,fillColor:"#ff6a2b",fillOpacity:1,interactive:false}).addTo(anaMap);
  RP.ready=true;rpRender();
}
function rpStop(){if(RP.raf)cancelAnimationFrame(RP.raf);Object.assign(RP,{raf:null,playing:false,t:0,ready:false,base:null,trail:null,tip:null,mk:null,halo:null,trailN:0,dim:false,follow:false});}
const idxByT=t=>{const g=ANA.grid.t;let lo=0,hi=g.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(g[m]<=t)lo=m;else hi=m;}return t>=g[hi]?hi:lo;};
function rpRender(){
  const a=ANA;if(!a||!$("#rpBox"))return;
  const g=a.grid,T=a.time,t=Math.max(0,Math.min(T,RP.t)),d=lerp(g.t,g.d,t);
  $("#rpT").textContent=mmss(t);$("#rpD").textContent=(d/1000).toFixed(2).replace(".",",");
  const p=RP.pf?lerp(g.t,RP.pf,t):null;$("#rpP").textContent=p?pace(p):"—";
  const hr=a.hasHr?lerp(g.t,g.hr,t):null;if(a.hasHr)$("#rpH").textContent=Math.round(hr);else if($("#rpK"))$("#rpK").textContent=Math.min(Math.floor(d/1000)+1,Math.ceil(a.dist/1000));
  $("#rpSlider").value=Math.round(t/T*1000);
  const done=Math.floor(d/1000+1e-6),sp=a.fullSplits[done-1],finished=t>=T;
  $("#rpMsg").textContent=finished?`Arrivée : ${mmss(T)} · ${(a.dist/1000).toFixed(2).replace(".",",")} km · ${pace(a.avgPace)}/km de moyenne.`:t===0?`Rediffusion de ta course : ×1 = temps réel (${clock(T)}), ×${RP.speed} la rejoue en ${mmss(T/RP.speed)}.`:`Km ${Math.min(done+1,a.fullSplits.length)} en cours`+(sp?` · dernier km ${done} : ${pace(sp.pace)}`:"")+` · lecture ×${RP.speed}`;
  const btn=$("#rpPlay");btn.textContent=RP.playing?"⏸ Pause":(finished?"↻ Rejouer":(t>0?"▶ Reprendre":"▶ Lecture"));
  // curseur du graphique
  const c=HOV.c;if(c){const x=c.X(c.xs===g.t?t:d);c.xl.setAttribute("x1",x);c.xl.setAttribute("x2",x);c.xl.style.display="";if(p){c.dp.setAttribute("cx",x);c.dp.setAttribute("cy",c.Yp(p));c.dp.style.display="";}if(hr!=null){c.dh.setAttribute("cx",x);c.dh.setAttribute("cy",c.Yh(hr));c.dh.style.display="";}}
  if(!RP.ready||!anaMap)return;
  const ll=[lerp(g.t,g.lat,t),lerp(g.t,g.lon,t)],started=t>0;
  if(started!==RP.dim){RP.dim=started;RP.base.eachLayer(l=>l.setStyle({opacity:started?.22:.95}));}
  const i0=idxByT(t);
  if(i0<RP.trailN||!started){RP.trail.clearLayers();RP.trailN=0;}
  for(let k=RP.trailN+1;k<=i0;k++)L.polyline([[g.lat[k-1],g.lon[k-1]],[g.lat[k],g.lon[k]]],{color:paceColor(g.pace[k]||a.avgPace,RP.lo,RP.hi),weight:6,opacity:1,lineCap:"round"}).addTo(RP.trail);
  RP.trailN=Math.max(started?i0:0,0);
  RP.tip.setLatLngs(started?[[g.lat[i0],g.lon[i0]],ll]:[]);
  RP.mk.setLatLng(ll);RP.halo.setLatLng(ll);
  if(RP.follow)anaMap.panTo(ll,{animate:false});
}
function rpLoop(now){
  if(!RP.playing)return;
  if(!$("#v-analysis").classList.contains("on")){RP.playing=false;rpRender();return;}
  const dt=Math.min(0.1,(now-RP.last)/1000);RP.last=now;
  RP.t+=dt*RP.speed;
  if(RP.t>=ANA.time){RP.t=ANA.time;RP.playing=false;}
  rpRender();
  if(RP.playing)RP.raf=requestAnimationFrame(rpLoop);
}
function rpAction(el){
  const a=el.dataset.rp;
  if(!RP.ready&&a!=="speed"){toast("Carte en cours de chargement");return;}
  if(a==="play"){
    momStop(true);
    if(RP.playing){RP.playing=false;}
    else{if(RP.t>=ANA.time)RP.t=0;RP.playing=true;RP.last=performance.now();RP.raf=requestAnimationFrame(rpLoop);}
    rpRender();
  }else if(a==="reset"){RP.playing=false;RP.t=0;rpRender();if(anaMap&&RP.follow)rpFollow(false);}
  else if(a==="speed"){RP.speed=+el.dataset.v;document.querySelectorAll("[data-rp=speed]").forEach(b=>b.classList.toggle("on",+b.dataset.v===RP.speed));rpRender();}
  else if(a==="follow"){rpFollow(!RP.follow);}
}
function rpFollow(on){
  RP.follow=on;const b=$("#rpFollow");if(b)b.classList.toggle("on",on);
  if(!anaMap)return;
  if(on){const g=ANA.grid;anaMap.setView([lerp(g.t,g.lat,RP.t),lerp(g.t,g.lon,RP.t)],16,{animate:false});}
  else anaMap.fitBounds(L.latLngBounds(ANA.grid.lat.map((la,i)=>[la,ANA.grid.lon[i]])),{padding:[24,24]});
}
document.addEventListener("input",e=>{
  if(e.target.id!=="rpSlider"||!ANA)return;
  RP.t=e.target.value/1000*ANA.time;rpRender();
});

/* ---------- MOMENTS CLÉS : suivre le moment sur la carte ---------- */
const MOM={raf:null,playing:false,i:null,t:0,t0:0,t1:0,speed:1,last:0,mk:null,line:null};
function momStop(clear){
  if(MOM.raf)cancelAnimationFrame(MOM.raf);MOM.raf=null;MOM.playing=false;
  if(clear){
    try{if(anaMap){if(MOM.mk)anaMap.removeLayer(MOM.mk);if(MOM.line)anaMap.removeLayer(MOM.line);}}catch(e){}
    MOM.mk=null;MOM.line=null;MOM.i=null;const h=$("#momHud");if(h){h.hidden=true;h.innerHTML="";}
  }
}
function momStart(i){
  const a=ANA,m=a.moments[i],g=a.grid;if(!m)return;
  if(RP.playing){RP.playing=false;rpRender();}
  momStop(true);
  MOM.i=i;MOM.t0=Math.max(0,g.t[m.i0]-10);MOM.t1=Math.min(a.time,g.t[Math.min(g.t.length-1,m.i1)]+15);MOM.t=MOM.t0;
  MOM.speed=Math.max(1,(MOM.t1-MOM.t0)/9);                       // le moment se déroule en 9 s environ
  const slow=m.kind==="slow",col=slow?"#ef4444":"#a3e635";
  const h=$("#momHud");
  if(h){h.hidden=false;h.innerHTML=`<div class="mh"><span class="momi" style="background:${col}">${slow?"▼":"▲"}</span><b>${slow?"Ralentissement":"Accélération"}</b><span class="mut">km ${f1(m.d0/1000)} → ${f1(m.d1/1000)} · ${Math.round(m.dur)} s · ${pace(m.pace)}/km${m.nearTurn?" · virage à proximité":""}</span><span style="margin-left:auto;display:flex;gap:8px"><button class="btn" data-momplay>↻ Rejouer</button><button class="btn" data-momclose aria-label="Fermer">✕</button></span></div><div class="mhs"><span>Chrono<b id="mmT">—</b></span><span>Distance<b id="mmD">—</b></span><span>Allure<b id="mmP">—</b></span>${a.hasHr?`<span>FC<b id="mmH">—</b></span>`:""}</div><div id="momChart" class="momchart"></div>`;momChartBuild(m);}
  if(anaMap&&window.L){
    MOM.mk=L.circleMarker([g.lat[m.i0],g.lon[m.i0]],{radius:10,color:"#fff",weight:3,fillColor:col,fillOpacity:1,interactive:false}).addTo(anaMap);
    MOM.line=L.polyline([],{color:col,weight:9,opacity:1,lineCap:"round"}).addTo(anaMap);
  }
  MOM.playing=true;MOM.last=performance.now();MOM.raf=requestAnimationFrame(momLoop);momRender();
}
function momRender(){
  const a=ANA,g=a.grid,t=MOM.t,m=a.moments[MOM.i];if(!m)return;
  const ll=[lerp(g.t,g.lat,t),lerp(g.t,g.lon,t)],pf=RP.pf||g.pace.map(p=>p==null?a.avgPace:p),set=(id,v)=>{const e=$(id);if(e)e.textContent=v;};
  set("#mmT",mmss(t));set("#mmD",(lerp(g.t,g.d,t)/1000).toFixed(2).replace(".",",")+" km");set("#mmP",pace(lerp(g.t,pf,t))+"/km");if(a.hasHr)set("#mmH",Math.round(lerp(g.t,g.hr,t))+" bpm");
  if(MOM.mk){MOM.mk.setLatLng(ll);const i0=idxByT(MOM.t0),i1=idxByT(t),pts=[];for(let k=i0;k<=i1;k++)pts.push([g.lat[k],g.lon[k]]);pts.push(ll);MOM.line.setLatLngs(pts);}
  momChartCursor(t,lerp(g.t,pf,t),a.hasHr?lerp(g.t,g.hr,t):null);
  setHover(idxByT(t));if(anaMarker)anaMarker.setStyle({opacity:0,fillOpacity:0});
}
function momLoop(now){
  if(!MOM.playing)return;
  if(!$("#v-analysis").classList.contains("on")){MOM.playing=false;return;}
  const dt=Math.min(0.1,(now-MOM.last)/1000);MOM.last=now;MOM.t+=dt*MOM.speed;
  if(MOM.t>=MOM.t1){MOM.t=MOM.t1;MOM.playing=false;}
  momRender();
  if(MOM.playing)MOM.raf=requestAnimationFrame(momLoop);
}

/* mini-graphique zoomé sur le moment : allure et FC, avec un curseur qui avance en même temps que le point sur la carte */
function momChartBuild(m){
  const a=ANA,g=a.grid,host=$("#momChart");MOM.ch=null;if(!host)return;
  const pf=RP.pf||g.pace.map(p=>p==null?a.avgPace:p),i0=idxByT(MOM.t0),i1=idxByT(MOM.t1);
  const ks=[];for(let k=i0;k<=i1;k++)ks.push(k);
  const W=480,H=170,L=44,R=a.hasHr?40:12,Tp=14,B=26,iw=W-L-R,ih=H-Tp-B,span=(MOM.t1-MOM.t0)||1;
  const pv=ks.map(k=>pf[k]),pmin=Math.floor((Math.min(...pv,a.avgPace)-6)/10)*10,pmax=Math.ceil((Math.max(...pv,a.avgPace)+6)/10)*10;
  const hv=a.hasHr?ks.map(k=>g.hr[k]):[],hmin=hv.length?Math.floor(Math.min(...hv)-3):0,hmax=hv.length?Math.ceil(Math.max(...hv)+3):1;
  const X=t=>L+(t-MOM.t0)/span*iw,Yp=p=>Tp+(Math.min(pmax,Math.max(pmin,p))-pmin)/(pmax-pmin)*ih,Yh=h=>Tp+ih-(h-hmin)/(hmax-hmin||1)*ih;
  const col=m.kind==="slow"?"#ef4444":"#a3e635",xa=X(g.t[m.i0]),xb=X(Math.min(MOM.t1,g.t[m.i1]+5));
  let sv=`<rect x="${xa}" y="${Tp}" width="${Math.max(2,xb-xa)}" height="${ih}" fill="${col}" fill-opacity=".14"/>`;
  for(let p=pmin;p<=pmax;p+=10)sv+=`<line x1="${L}" x2="${W-R}" y1="${Yp(p)}" y2="${Yp(p)}" stroke="#1d2734"/><text x="${L-6}" y="${Yp(p)+5}" fill="#ff9a66" font-size="13" text-anchor="end">${pace(p)}</text>`;
  sv+=`<line x1="${L}" x2="${W-R}" y1="${Yp(a.avgPace)}" y2="${Yp(a.avgPace)}" stroke="#a855f7" stroke-dasharray="2 5" stroke-width="2"/>`;
  const path=(ys,Y)=>ks.map((k,j)=>(j?"L":"M")+X(g.t[k]).toFixed(1)+","+Y(ys[j]).toFixed(1)).join("");
  if(hv.length)sv+=`<path d="${path(hv,Yh)}" fill="none" stroke="#ef4444" stroke-width="2"/>`;
  sv+=`<path d="${path(pv,Yp)}" fill="none" stroke="#ff6a2b" stroke-width="3" stroke-linejoin="round"/>`;
  sv+=`<text x="${L}" y="${H-7}" fill="#8b9bb0" font-size="13">${mmss(MOM.t0)}</text><text x="${W-R}" y="${H-7}" fill="#8b9bb0" font-size="13" text-anchor="end">${mmss(MOM.t1)}</text>`;
  sv+=`<line id="mcL" y1="${Tp}" y2="${Tp+ih}" x1="${L}" x2="${L}" stroke="#fff" stroke-width="2.5"/><circle id="mcP" r="6" cx="${L}" cy="${Yp(pv[0])}" fill="#ff6a2b" stroke="#fff" stroke-width="2.5"/>`;
  if(hv.length)sv+=`<circle id="mcH" r="5" cx="${L}" cy="${Yh(hv[0])}" fill="#ef4444" stroke="#fff" stroke-width="2"/>`;
  host.innerHTML=`<svg viewBox="0 0 ${W} ${H}" class="achart">${sv}</svg><div class="mut" style="font-size:12px">Zoom sur le moment : allure (orange), FC (rouge), allure moyenne (pointillé violet). La zone colorée est le moment détecté.</div>`;
  MOM.ch={X,Yp,Yh};
}
function momChartCursor(t,p,hr){
  const c=MOM.ch;if(!c)return;const x=c.X(t),L=$("#mcL"),P=$("#mcP"),H=$("#mcH");
  if(L){L.setAttribute("x1",x);L.setAttribute("x2",x);}
  if(P&&p!=null){P.setAttribute("cx",x);P.setAttribute("cy",c.Yp(p));}
  if(H&&hr!=null){H.setAttribute("cx",x);H.setAttribute("cy",c.Yh(hr));}
}
