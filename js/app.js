/* ---------- AIDE EXPORT ---------- */
const FIT_HELP=`<details style="margin-top:10px"><summary class="mut" style="cursor:pointer;font-weight:600;font-size:13px">Comment l'installer sur la montre ?</summary><ol class="mut" style="font-size:13px;margin:8px 0 0;padding-left:20px"><li>Branche la montre à ton ordinateur en USB.</li><li>Copie le fichier .fit dans le dossier <b>GARMIN/NewFiles</b> de la montre.</li><li>Éjecte la montre : la séance apparaît dans Course à pied → Entraînements.</li></ol><p class="mut" style="font-size:12.5px;margin:8px 0 0">Teste d'abord avec une seule séance. L'envoi depuis un iPhone n'est pas possible : passe par le Mac ou le PC.</p></details>`;

/* ---------- STATE ---------- */
const KEY="prepa10kHoka2026_v1";
let state={done:{},logs:{},test:"",week:null,target:"43:00",mt:{},moves:{}};
try{const raw=localStorage.getItem(KEY);if(raw)state=Object.assign(state,JSON.parse(raw));}catch(e){}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}}
stampInit();
function save(){stamp();persist();syncSoon();}

/* ---------- UTILS ---------- */
const $=s=>document.querySelector(s);
const pace=s=>{s=Math.round(s);return Math.floor(s/60)+"'"+String(s%60).padStart(2,"0");};
const clock=s=>{s=Math.round(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return(h?h+"h"+String(m).padStart(2,"0")+"'":m+"'")+String(x).padStart(2,"0");};
const dur=s=>{const m=Math.round(s/60);return m>=60?Math.floor(m/60)+"h"+String(m%60).padStart(2,"0"):m+" min";};
const km=n=>n.toFixed(1).replace(".",",");
const D=s=>new Date(s+"T12:00:00");
const fdate=(s,o)=>D(s).toLocaleDateString("fr-FR",o||{weekday:"long",day:"numeric",month:"short"});
function parseT(v){if(!v)return null;v=String(v).trim().replace(/[’'h]/g,":").replace(/"/g,"");const p=v.split(":").map(Number);if(p.some(isNaN))return null;if(p.length===2)return p[0]*60+p[1];if(p.length===3)return p[0]*3600+p[1]*60+p[2];if(p.length===1)return p[0]*60;return null;}
function todayStr(){const n=new Date();return n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0")+"-"+String(n.getDate()).padStart(2,"0");}
const TODAY=todayStr();
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("on"),1800);}
function profile(segs,h,cls){h=h||44;const tot=segs.reduce((a,s)=>a+st(s).t,0),W=1000;let x=0,r="";segs.forEach(s=>{const w=st(s).t/tot*W,hh=Z[s.z].lvl/6*h;r+=`<rect x="${x.toFixed(1)}" y="${(h-hh).toFixed(1)}" width="${Math.max(w-1.2,.8).toFixed(1)}" height="${hh.toFixed(1)}" fill="${Z[s.z].c}"/>`;x+=w;});return`<svg viewBox="0 0 ${W} ${h}" preserveAspectRatio="none" class="prof ${cls||""}">${r}</svg>`;}
function badge(type){const t=T[type];return`<span class="badge" style="background:${t.c}22;color:${t.c};border:1px solid ${t.c}55"><i class="dot" style="background:${t.c}"></i>${t.n}</span>`;}
function racePace(){const t5=parseT(state.test);if(!t5)return{p:258,src:"provisoire"};const pred=t5*2.085;let p=pred<=2580?Math.min(258,Math.round(pred/10)):Math.ceil(pred/10);p=Math.max(250,Math.min(p,320));return{p,src:"test",pred};}
function doneKm(s){const l=state.logs[s.id];return l&&parseFloat(l.dist)>0?parseFloat(l.dist):s.d;}

/* ---------- DATES, TEXTES ET ZONES QUI DÉPENDENT DU SUIVI ---------- */
const RACE_DAY="2026-11-15",LAST_MOVE="2026-11-14";
const HARD=new Set(["frac","spec","seuil","test","race"]);
const mv=s=>state.moves&&state.moves[s.id]?` <span class="badge" style="border:1px solid #3a4a60;color:var(--mut);text-transform:none;margin-left:4px">déplacée</span>`:"";
/* textes d'une phase : l'allure de course est remplacée par celle du test 5 km quand il est saisi */
function lines(s,b){
  const rp=racePace();if(!s.race||rp.src!=="test")return b.txt;
  return b.txt.map(x=>x.replace("(4'18 ou celle fixée par le test)","("+pace(rp.p)+"/km, fixée par ton test)").replace("≈ 21'28 pour 43'","≈ "+clock(rp.p*5-2)+" pour "+clock(rp.p*10-2)).replace(/4'18/g,pace(rp.p)));
}
function zr(z){const rp=racePace();return z==="Z4"&&rp.src==="test"?pace(rp.p-2)+" – "+pace(rp.p+2):Z[z].r;}
function moveSession(id,date){
  const s=ALL.find(x=>x.id===id);state.moves=state.moves||{};
  if(!s||!date||date<TODAY||date>LAST_MOVE){toast("Choisis une date entre aujourd'hui et la veille de la course");return;}
  const others=ALL.filter(x=>x.id!==id&&!state.done[x.id]);
  const same=others.find(x=>sdate(x)===date);
  const near=HARD.has(s.type)&&others.find(x=>HARD.has(x.type)&&Math.abs((D(sdate(x))-D(date))/864e5)<=1);
  const msg=same?`« ${same.title} » est déjà prévue ce jour-là.`:near?`« ${near.title} » (séance intense) est prévue ${sdate(near)===date?"le même jour":"la veille ou le lendemain"} : le plan évite deux séances dures consécutives.`:"";
  if(msg&&!confirm(msg+"\nDéplacer quand même ?"))return;
  if(date===s.date)delete state.moves[id];else state.moves[id]=date;
  save();refresh();openS(id);toast("Séance déplacée au "+fdate(date,{weekday:"long",day:"numeric",month:"long"}));
}
function unmoveSession(id){if(state.moves)delete state.moves[id];save();refresh();openS(id);toast("Date d'origine rétablie");}

/* ---------- DASHBOARD ---------- */
function renderDash(){
  const race=new Date("2026-11-15T09:30:00"),now=new Date();
  const days=Math.ceil((race-now)/864e5);
  const doneN=MAIN.filter(s=>state.done[s.id]).length;
  const totKm=MAIN.reduce((a,s)=>a+s.d,0),totT=MAIN.reduce((a,s)=>a+s.t,0);
  const dKm=ALL.filter(s=>state.done[s.id]).reduce((a,s)=>a+doneKm(s),0);
  const cw=curWeek();
  $("#heroChips").innerHTML=(days>0?`<span class="chip">⏱ <b>J-${days}</b></span>`:days>-1?`<span class="chip">🏁 <b>C'est le jour J</b></span>`:`<span class="chip">🏁 Course terminée</span>`)+
   `<span class="chip">Semaine <b>${cw}</b> / 4 · ${PLAN[cw-1].phase}</span><span class="chip">${km(totKm)} km · ${dur(totT)} au programme</span>`;
  const pct=doneN/MAIN.length,R=52,C=2*Math.PI*R;
  $("#ring").innerHTML=`<defs><linearGradient id="rg" x1="0" x2="1"><stop offset="0" stop-color="#ff6a2b"/><stop offset="1" stop-color="#ffb020"/></linearGradient></defs><circle cx="60" cy="60" r="${R}" fill="none" stroke="#1d2734" stroke-width="12"/><circle cx="60" cy="60" r="${R}" fill="none" stroke="url(#rg)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-pct)}" transform="rotate(-90 60 60)" style="transition:stroke-dashoffset .6s"/><text x="60" y="58" text-anchor="middle" fill="#e8eef6" font-size="26" font-weight="900">${Math.round(pct*100)}%</text><text x="60" y="76" text-anchor="middle" fill="#8b9bb0" font-size="11" font-weight="600">du plan</text>`;
  $("#kDone").textContent=doneN+" / "+MAIN.length;
  $("#kKm").textContent=km(dKm)+" km";
  $("#kKmSub").textContent="sur "+km(totKm)+" km prévus";
  const rp=racePace();
  $("#kRace").textContent=pace(rp.p);
  $("#kRaceSub").textContent=rp.src==="test"?"d'après ton test 5 km · ≈ "+clock(rp.p*10-2):"provisoire · fixée au test du 8 nov.";
  // next session
  const nx=MAIN.filter(s=>!state.done[s.id]&&sdate(s)>=TODAY).sort((a,b)=>sdate(a).localeCompare(sdate(b)))[0]||MAIN.find(s=>!state.done[s.id]);
  $("#nextBox").innerHTML=nx?`<div class="note goal" style="--tc:${T[nx.type].c}"><div class="next"><div><div class="mut" style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">Prochaine séance · ${fdate(sdate(nx))}</div><div style="font-weight:800;font-size:16px;margin:2px 0">${nx.title}</div><div class="meta"><span><b>${dur(nx.t)}</b></span><span><b>${km(nx.d)} km</b></span></div></div><button class="btn pri" data-open="${nx.id}">Voir</button></div></div>`:`<div class="note">Toutes les séances sont cochées. Bravo !</div>`;
  // phases
  $("#phases").innerHTML=PLAN.map(w=>{const ms=w.sessions.filter(s=>!s.opt),dn=ms.filter(s=>state.done[s.id]).length;return`<button class="phase ${w.n===cw?"cur":""}" data-week="${w.n}"><div class="wk">S${w.n} · ${fdate(w.mon,{day:"numeric",month:"short"})}</div><div class="nm">${w.phase}</div><div class="bar"><i style="width:${dn/ms.length*100}%"></i></div><div class="mut" style="font-size:12px;margin-top:6px">${dn}/${ms.length} séances · ${km(ms.reduce((a,s)=>a+s.d,0))} km</div></button>`;}).join("");
  renderVol();renderZones();renderReal();
}
function renderVol(){
  const data=PLAN.map(w=>{const ms=w.sessions.filter(s=>!s.opt);return{n:w.n,p:ms.reduce((a,s)=>a+s.d,0),t:ms.reduce((a,s)=>a+s.t,0),d:w.sessions.filter(s=>state.done[s.id]).reduce((a,s)=>a+doneKm(s),0)};});
  const mx=Math.max(...data.map(x=>Math.max(x.p,x.d)))*1.15,W=420,H=200,pad=28,bw=58,gap=(W-pad*2-bw*4)/3;
  let g="";[0,10,20,30,40].forEach(v=>{if(v>mx)return;const y=H-24-(v/mx)*(H-50);g+=`<line x1="${pad-6}" x2="${W}" y1="${y}" y2="${y}" stroke="#1d2734"/><text x="${pad-10}" y="${y+4}" fill="#5f6f84" font-size="10" text-anchor="end">${v}</text>`;});
  data.forEach((x,i)=>{const X=pad+i*(bw+gap),hp=(x.p/mx)*(H-50),hd=(Math.min(x.d,mx)/mx)*(H-50),base=H-24;
    g+=`<rect x="${X}" y="${base-hp}" width="${bw}" height="${hp}" rx="8" fill="rgba(255,255,255,.03)" stroke="#3a4a60" stroke-dasharray="4 3"/>`;
    if(x.d>0)g+=`<rect x="${X+5}" y="${base-hd}" width="${bw-10}" height="${hd}" rx="6" fill="url(#vg)"/>`;
    g+=`<text x="${X+bw/2}" y="${base-hp-8}" fill="#e8eef6" font-size="12" font-weight="800" text-anchor="middle">${km(x.p)}</text><text x="${X+bw/2}" y="${H-6}" fill="#8b9bb0" font-size="11" font-weight="700" text-anchor="middle">S${x.n} · ${dur(x.t)}</text>`;});
  $("#volChart").innerHTML=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block"><defs><linearGradient id="vg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff6a2b"/><stop offset="1" stop-color="#ffb020"/></linearGradient></defs>${g}</svg>`;
}
function renderZones(){
  const tz={};MAIN.forEach(s=>s.segs.forEach(x=>{if(x.z==="W")return;tz[x.z]=(tz[x.z]||0)+st(x).t;}));
  const tot=Object.values(tz).reduce((a,b)=>a+b,0),order=["Z1","Z2","Z3","Z4","Z5","Z6"];
  const easy=((tz.Z1||0)+(tz.Z2||0))/tot;
  $("#zoneChart").innerHTML=`<div style="display:flex;height:22px;border-radius:8px;overflow:hidden;gap:2px">${order.map(z=>`<div title="${Z[z].n}" style="flex:${tz[z]||0};background:${Z[z].c}"></div>`).join("")}</div>
  <div style="margin-top:14px;display:grid;gap:7px">${order.map(z=>`<div style="display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;font-size:13.5px"><span><i class="dot" style="background:${Z[z].c};margin-right:8px"></i>${Z[z].n}</span><span class="mut">${dur(tz[z]||0)}</span><b style="width:42px;text-align:right">${Math.round((tz[z]||0)/tot*100)}%</b></div>`).join("")}</div>
  <div class="note" style="margin-top:14px;font-size:13.5px"><b>${Math.round(easy*100)} % du temps en intensité facile.</b> C'est voulu : l'essentiel du gain vient des séances dures, à condition que tout le reste soit réellement facile.</div>`;
}
function renderReal(){
  const rows=[["≤ 43'00","Objectif atteint",25,"#a855f7"],["43'01 – 43'59","Proche, record net",40,"#22c55e"],["44'00 – 45'00","Progression solide",28,"#f59e0b"],["> 45'00","Jour sans",7,"#94a3b8"]];
  $("#realism").innerHTML=`<div class="grid g2"><div class="prose"><p><b>43' est ambitieux mais crédible.</b> Ta projection centrale aujourd'hui se situe vers <b>43'45 – 44'30</b>. Le scénario 43' demande que le bloc se passe bien et que le test 5 km du 8 novembre descende sous 20'35.</p>
  <p><b>Ce qui joue pour toi</b></p><ul><li>Ton semi d'aujourd'hui vaut déjà ≈ 45'35 sur 10 km, alors que tu étais en fin de prépa longue.</li><li>VO₂max estimée à 51 : le moteur est là (les montres sont souvent optimistes, mais l'écart avec tes chronos indique une marge).</li><li>Un parcours plat et un affûtage pensé pour arriver frais.</li></ul>
  <p><b>Ce qui joue contre</b></p><ul><li>Seulement 4 semaines, dont une de récupération.</li><li>Ton seuil observé en séance (4'35 à FC 178) est encore loin d'une allure 4'18 tenue 43 minutes.</li><li>Un gain de 20 s/km sur ta dernière référence 10 km.</li></ul></div>
  <div><div class="mut" style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Scénarios estimés si le plan est suivi</div><div class="scen">${rows.map(r=>`<div class="scrow"><b>${r[0]}</b><div class="bar" style="height:12px"><i style="width:${r[2]*2.4}%;background:${r[3]}"></i></div><span class="mut">~${r[2]} %</span></div><div class="mut" style="font-size:12px;margin:-4px 0 4px">${r[1]}</div>`).join("")}</div>
  <p class="mut" style="font-size:12.5px">Estimation à affiner : chaque point de contrôle (25 oct., 1er nov., 8 nov.) donne une information plus fiable que cette projection.</p></div></div>`;
}

/* ---------- PLAN VIEW ---------- */
function curWeek(){if(TODAY<PLAN[1].mon)return 1;if(TODAY<PLAN[2].mon)return 2;if(TODAY<PLAN[3].mon)return 3;return 4;}
let week=state.week||curWeek();
function renderPlan(){
  const w=PLAN[week-1];
  $("#weekNav").innerHTML=`<button class="wbtn arrow" data-wnav="-1" ${week===1?"disabled":""}>←</button>`+PLAN.map(x=>`<button class="wbtn ${x.n===week?"on":""}" data-week="${x.n}">S${x.n}</button>`).join("")+`<button class="wbtn arrow" data-wnav="1" ${week===4?"disabled":""}>→</button><span class="mut" style="margin-left:6px;font-weight:600;font-size:14px">${fdate(w.mon,{day:"numeric",month:"long"})} – ${fdate(w.sessions[w.sessions.length-1].date,{day:"numeric",month:"long"})}</span>`;
  const ms=w.sessions.filter(s=>!s.opt),dn=ms.filter(s=>state.done[s.id]).length,wkKm=ms.reduce((a,s)=>a+s.d,0),wkT=ms.reduce((a,s)=>a+s.t,0);
  const maxKm=Math.max(...PLAN.map(x=>x.sessions.filter(s=>!s.opt).reduce((a,s)=>a+s.d,0)));
  $("#weekHead").innerHTML=`<div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap"><div style="flex:1;min-width:240px"><div class="eyebrow">Semaine ${w.n} · ${w.short}</div><h2 style="margin:4px 0 6px">${w.phase}</h2><div class="mut">${w.goal}</div></div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-start"><div class="stat"><div class="l">Distance</div><div class="v">${km(wkKm)} km</div></div><div class="stat"><div class="l">Durée</div><div class="v">${dur(wkT)}</div></div><div class="stat"><div class="l">Faites</div><div class="v">${dn} / ${ms.length}</div></div><div class="stat" style="min-width:120px"><div class="l">Charge relative</div><div class="bar" style="margin-top:8px"><i style="width:${wkKm/maxKm*100}%"></i></div></div></div></div>`;
  // strip
  let strip="";for(let i=0;i<7;i++){const d=new Date(D(w.mon));d.setDate(d.getDate()+i);const ds=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");const s=w.sessions.find(x=>sdate(x)===ds);
    strip+=`<div class="day ${s?"has":""} ${ds===TODAY?"today":""} ${s&&state.done[s.id]?"done":""}" ${s?`data-open="${s.id}"`:""} style="${s?`border-color:${T[s.type].c}66;background:${T[s.type].c}10`:""}"><div class="dn">${d.toLocaleDateString("fr-FR",{weekday:"short"}).replace(".","")}</div><div class="dd">${d.getDate()}</div>${s?`<i class="dot" style="background:${T[s.type].c}"></i><div class="dt">${s.opt?"Option":T[s.type].n.split(" ")[0]}</div>`:`<div class="dt">Repos</div>`}</div>`;}
  $("#strip").innerHTML=strip;
  $("#sessGrid").innerHTML=w.sessions.slice().sort((a,b)=>sdate(a).localeCompare(sdate(b))).map(card).join("");
  $("#legendTypes").innerHTML=Object.values(T).map(t=>`<span><i class="dot" style="background:${t.c}"></i>${t.n}</span>`).join("")+`<span style="margin-left:auto"><span class="cpTag">CP</span>&nbsp;point de contrôle</span>`;
}
function card(s){const dn=!!state.done[s.id];return`<div class="card sess ${dn?"done":""} ${s.opt?"opt":""}" style="--tc:${T[s.type].c}">
  <div class="hd"><span class="date">${fdate(sdate(s))}${mv(s)}</span>${s.cp?`<span class="cpTag">CP${s.cp}</span>`:s.opt?`<span class="badge" style="border:1px dashed #3a4a60;color:var(--mut)">optionnel</span>`:""}</div>
  <div>${badge(s.type)}</div><h3>${s.title}</h3><div class="mut" style="font-size:13.5px;margin-top:-4px">${s.short}</div>
  ${profile(s.segs)}
  <div class="meta"><span>⏱ <b>${dur(s.t)}</b></span><span>📍 <b>${km(s.d)} km</b></span>${state.logs[s.id]&&state.logs[s.id].rpe?`<span>RPE <b>${state.logs[s.id].rpe}</b></span>`:""}</div>
  <div class="ft"><label class="check"><input type="checkbox" data-check="${s.id}" ${dn?"checked":""}><span class="box"></span>${dn?"Réalisée":"À faire"}</label><button class="btn" data-open="${s.id}">Détail →</button></div></div>`;}

/* ---------- MODAL ---------- */
function phaseBlock(name,b,col,s){const t=b.segs.reduce((a,x)=>a+st(x).t,0),d=b.segs.reduce((a,x)=>a+st(x).d,0)/1000;return`<div class="step" style="--sc:${col}"><div class="sn">${name}<span>${dur(t)} · ${km(d)} km</span></div><ul>${lines(s,b).map(x=>`<li>${x}</li>`).join("")}</ul></div>`;}
function openS(id){
  const s=ALL.find(x=>x.id===id);if(!s)return;const t=T[s.type],l=state.logs[id]||{},dn=!!state.done[id],rp=racePace();
  const mainCol=Z[s.main.segs.reduce((a,x)=>Z[x.z].lvl>Z[a.z].lvl?x:a).z].c;
  const zs=[...new Set(s.segs.map(x=>x.z))].filter(z=>z!=="W");
  $("#panel").style.setProperty("--tc",t.c);
  $("#panel").innerHTML=`<div class="phd"><button class="close" data-close>×</button><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${badge(s.type)}${s.cp?`<span class="cpTag">Point de contrôle ${s.cp}</span>`:""}${s.opt?`<span class="badge" style="border:1px dashed #3a4a60;color:var(--mut)">optionnel</span>`:""}</div>
   <h2>${s.title}</h2><div class="mut" style="text-transform:capitalize">${fdate(sdate(s),{weekday:"long",day:"numeric",month:"long"})} · semaine ${s.wk}${state.moves&&state.moves[s.id]?` · <span style="text-transform:none">prévue le ${fdate(s.date,{day:"numeric",month:"short"})}</span>`:""}</div>
   <div class="stats"><div class="stat"><div class="l">Durée</div><div class="v">${dur(s.t)}</div></div><div class="stat"><div class="l">Distance</div><div class="v">${km(s.d)} km</div></div>${s.race?`<div class="stat"><div class="l">Allure course</div><div class="v">${pace(rp.p)}/km</div></div>`:""}</div>
   <div style="margin-top:14px">${profile(s.segs,90,"profBig")}</div>
   <div class="legend" style="margin-top:8px">${zs.map(z=>`<span><i class="dot" style="background:${Z[z].c}"></i>${Z[z].n} · ${zr(z)}</span>`).join("")}</div></div>
  <div class="pbd">
   <div class="note goal"><b>Objectif physiologique</b><br>${s.goal}</div>
   <div class="sec"><h4>Déroulé</h4><div class="steps">${phaseBlock("Échauffement",s.wu,"#22c55e",s)}${phaseBlock("Corps de séance",s.main,mainCol,s)}${phaseBlock("Retour au calme",s.cd,"#94a3b8",s)}</div></div>
   ${s.race&&rp.src==="test"?`<div class="note cp">Ton test 5 km fixe l'allure de course à <b>${pace(rp.p)}/km</b>  : les consignes de cette séance sont déjà mises à jour.</div>`:""}
   <div class="sec"><h4>Pourquoi cette séance</h4><div>${s.why}</div></div>
   <div class="sec"><h4>Consignes</h4><ul style="margin:0;padding-left:18px">${s.tips.map(x=>`<li style="margin:4px 0">${x}</li>`).join("")}</ul></div>
   ${s.cpTxt?`<div class="sec"><div class="note cp"><b>Point de contrôle ${s.cp}</b><br>${s.cpTxt}${s.cp===3?`<div style="margin-top:10px"><button class="btn pri" data-gotest>Ouvrir le calculateur</button></div>`:""}</div></div>`:""}
   <div class="sec"><div class="note warn"><b>Fatigue ou séance raccourcie</b><br>${s.tired}</div></div>
   ${(s.id==="w4c"||dn)?"":`<div class="sec"><h4>Déplacer la séance</h4><div class="note"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><input type="date" id="mvDate" value="${sdate(s)<TODAY?TODAY:sdate(s)}" min="${TODAY}" max="${LAST_MOVE}" style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:8px 10px;color:inherit"><button class="btn pri" data-move="${id}">Déplacer</button>${state.moves&&state.moves[id]?`<button class="btn" data-unmove="${id}">Date prévue (${fdate(s.date,{day:"numeric",month:"short"})})</button>`:""}</div><div class="mut" style="font-size:12.5px;margin-top:8px">Le calendrier (.ics) et les fichiers de la montre suivent la nouvelle date. Évite deux séances intenses de suite.</div></div></div>`}
   <div class="sec"><h4>Sur ma montre</h4><div class="note"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="btn pri" data-fit="${id}">⌚ Télécharger la séance (.fit)</button><span class="mut" style="font-size:13px">Forerunner 55 · allures et répétitions incluses</span></div>${FIT_HELP}</div></div>
   <div class="sec"><h4>Mon ressenti</h4><div class="form">
    <div class="fld"><label>Distance réelle (km)</label><input id="lDist" inputmode="decimal" value="${l.dist||""}" placeholder="${km(s.d)}"></div>
    <div class="fld"><label>Durée (h:mm:ss)</label><input id="lDur" value="${l.dur||""}" placeholder="${clock(s.t).replace("'",":")}"></div>
    <div class="fld"><label>FC moyenne</label><input id="lFc" inputmode="numeric" value="${l.fc||""}" placeholder="bpm"></div>
    <div class="fld full"><label>Effort ressenti (RPE) : <b id="rpeV">${l.rpe||"–"}</b> / 10</label><input type="range" id="lRpe" min="1" max="10" value="${l.rpe||5}"></div>
    <div class="fld full"><label>Notes (allures des blocs, sensations, météo…)</label><textarea id="lNote" rows="3">${l.note||""}</textarea></div></div>
    <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap"><button class="btn pri" data-savelog="${id}">Enregistrer le ressenti</button><button class="btn ${dn?"":"ok"}" data-toggle="${id}">${dn?"Marquer comme non faite":"✓ Marquer comme réalisée"}</button></div></div>
  </div>`;
  $("#ov").classList.add("on");document.body.style.overflow="hidden";
  const r=$("#lRpe");r.oninput=()=>{$("#rpeV").textContent=r.value;r.dataset.touched=1;};
}
function closeS(){$("#ov").classList.remove("on");document.body.style.overflow="";}

/* ---------- PACES ---------- */
function renderPaces(){
  $("#zoneTable").innerHTML=`<tr><th>Zone</th><th>Allure</th><th>%FCmax</th><th>RPE</th><th>Sensation</th><th>Usage</th></tr>`+["Z1","Z2","Z3","Z4","Z5","Z6"].map(z=>`<tr><td><span style="display:inline-flex;gap:8px;align-items:center;font-weight:700"><i class="dot" style="background:${Z[z].c}"></i>${Z[z].n}</span></td><td class="num">${zr(z)}</td><td class="num">${Z[z].fc}</td><td class="num">${Z[z].rpe}</td><td>${Z[z].feel}</td><td class="mut">${Z[z].use}</td></tr>`).join("");
  $("#t5").value=state.test||"";$("#tgt").value=state.target||"43:00";
  renderCalc();renderSplits();
}
function renderCalc(){
  const t5=parseT(state.test);if(!t5){$("#calcOut").innerHTML=`<div class="note mut">Repères : <b style="color:var(--text)">20'35</b> → 43'00 · <b style="color:var(--text)">21'05</b> → 44'00 · <b style="color:var(--text)">21'35</b> → 45'00</div>`;return;}
  const pred=t5*2.085,rp=racePace();let plan,col;
  if(pred<=2580){plan="Plan A : objectif 43' validé";col="#a855f7";}else if(pred<=2640){plan="Plan B : très proche de 43'";col="#22c55e";}else if(pred<=2700){plan="Plan C : record solide";col="#f59e0b";}else{plan="Plan D : record personnel";col="#94a3b8";}
  $("#calcOut").innerHTML=`<div class="grid g3"><div class="stat"><div class="l">Test 5 km</div><div class="res">${clock(t5)}</div><div class="mut">${pace(t5/5)}/km</div></div><div class="stat"><div class="l">10 km projeté</div><div class="res">${clock(pred)}</div><div class="mut">${pace(pred/10)}/km</div></div><div class="stat" style="border-color:${col}88"><div class="l">Allure de course</div><div class="res" style="color:${col}">${pace(rp.p)}/km</div><div class="mut">≈ ${clock(rp.p*10-2)}</div></div></div>
  <div class="note" style="margin-top:12px;border-color:${col}66"><b style="color:${col}">${plan}.</b> ${pred<=2580?"Pars à 4'18 comme prévu, avec un premier kilomètre en 4'20.":"Pars à "+pace(rp.p)+"/km. Si tu te sens bien au 6e km, accélère de 2 à 3 s/km jusqu'à l'arrivée : c'est la seule façon raisonnable d'aller chercher plus."} Les séances de la semaine 4 utilisent maintenant cette allure.</div>`;
}
function splitList(){
  const tgt=parseT(state.target)||2580,p=(tgt+2)/10,ks=[];let cum=0;
  for(let i=1;i<=10;i++){const k=i===1?p+2:i===9?p-1:i===10?p-3:p;cum+=k;ks.push({i,k,cum});}
  return{tgt,p,ks};
}
function renderSplits(){
  const{ks}=splitList();
  const h=ks.map(k=>`<div class="km" style="${k.i===5||k.i===10?"border-color:#ff6a2b88":""}"><div class="k">KM ${k.i}</div><div class="p">${pace(k.k)}</div><div class="c">${clock(k.cum)}</div></div>`).join("");
  $("#splits").innerHTML=h;$("#splits2").innerHTML=h;
  $("#tgt").value=state.target||"43:00";
  renderRace();
}

/* ---------- BRACELET D'ALLURE ---------- */
const bandTheme=()=>{try{return localStorage.getItem("prepa10kBand")==="dark"?"dark":"light";}catch(e){return"light";}};
function bandHTML(theme,d,withLogo){
  const{tgt,p,ks}=d;
  return`<div class="pband ${theme}"><div class="pb-head"><div class="pb-logo">10K</div>${withLogo?`<img class="pb-hoka" alt="">`:""}<div class="pb-title"><b>10 km HOKA Paris Centre</b><span>Dimanche 15 novembre 2026 · départ 9h30</span></div><div class="pb-goal"><span>Objectif</span><b>${clock(tgt)}</b></div><div class="pb-goal"><span>Allure</span><b>${pace(p)}/km</b></div></div>
  <div class="pb-grid">${ks.map(k=>`<div class="pb-c ${k.i===5||k.i===10?"key":""}"><i>KM ${k.i}</i><b>${clock(k.cum)}</b><em>${pace(k.k)}</em></div>`).join("")}</div>
  <div class="pb-foot"><span>Gros : temps de passage · petit : allure du km (/km)</span><span>Km 1 retenu · km 2-8 régulier · relance km 9 · tout donner km 10</span></div></div>`;
}
function fitBand(){
  const w=$("#bandPrev"),inner=w&&w.querySelector(".pband");
  if(!inner||!w.clientWidth)return;
  const sc=Math.min(1,w.clientWidth/inner.offsetWidth);
  inner.style.transformOrigin="0 0";inner.style.transform=`scale(${sc})`;
  w.querySelector(".bandfit").style.height=inner.offsetHeight*sc+"px";
}
window.addEventListener("resize",fitBand);
/* logo HOKA facultatif : déposer assets/logo-hoka.png dans le dossier du site */
function printBand(){
  const im=new Image(),go=ok=>{
    document.querySelectorAll("#band .pb-hoka").forEach(e=>{if(ok){e.src=im.src;e.style.display="block";}else e.style.display="none";});
    document.body.classList.add("printband");setTimeout(()=>window.print(),80);
  };
  im.onload=()=>go(true);im.onerror=()=>go(false);im.src="assets/logo-hoka.png";
}

/* ---------- COURSE : mode plein écran et bracelet ---------- */
let wake=null;
function renderRace(){
  const{tgt,p,ks}=splitList(),rp=racePace(),sug=rp.src==="test"?clock(rp.p*10-2):null;
  $("#tgt2").value=state.target||"43:00";
  $("#raceHead").innerHTML=`<div class="eyebrow">Dim. 15 novembre · départ 9h30 · Rivoli → Opéra</div><div class="big" style="font-size:48px">${clock(tgt)}<span>${pace(p)}/km</span></div>`;
  $("#raceHint").innerHTML=sug?(Math.abs(tgt-parseT(sug))>1?`<div class="note cp">D'après ton test 5 km : <b>${sug}</b> (${pace(rp.p)}/km). <button class="btn" data-usetgt="${sug}" style="margin-left:6px">Utiliser ce temps</button></div>`:`<div class="note cp">Temps aligné sur ton test 5 km (${pace(rp.p)}/km).</div>`):`<div class="note mut">Ton test du 8 novembre fixera l'allure de course. En attendant, l'objectif de 43:00 sert de base.</div>`;
  $("#bigBody").innerHTML=`<div class="eyebrow">10 km HOKA Paris Centre</div><div style="font-size:34px;font-weight:900;margin:4px 0 10px">${clock(tgt)} · ${pace(p)}/km</div>`+ks.map(k=>`<div class="bigrow ${k.i===5||k.i===10?"key":""}"><span class="k">KM ${k.i}</span><span class="p">${pace(k.k)}</span><span class="c">${clock(k.cum)}</span></div>`).join("")+`<p class="mut" style="font-size:14px;margin-top:14px">Départ 2 s plus lent, allure stable du km 2 au km 8, puis accélération. Tours manuels à chaque panneau.</p>`;
  const bh=(withLogo)=>bandHTML(bandTheme(),{tgt,p,ks},withLogo);
  $("#band").innerHTML=bh(true)+bh(true);
  $("#bandPrev").innerHTML=`<div class="bandfit">${bh(false)}</div>`;
  document.querySelectorAll("[data-bandtheme]").forEach(b=>b.classList.toggle("on",b.dataset.bandtheme===bandTheme()));
  fitBand();
}
async function bigOpen(){$("#bigOv").classList.add("on");document.body.style.overflow="hidden";try{if(navigator.wakeLock)wake=await navigator.wakeLock.request("screen");}catch(e){}}
function bigClose(){$("#bigOv").classList.remove("on");document.body.style.overflow="";try{if(wake)wake.release();}catch(e){}wake=null;}
function setTarget(v){const t=parseT(v);if(!t||t<1800||t>3600){toast("Format attendu : 43:00");return;}state.target=v;save();renderSplits();toast("Temps visé mis à jour");}

/* ---------- GUIDE ---------- */
function renderGuide(){
  const g=[
  ["La structure de chaque semaine",`<p>Trois séances, trois rôles, au moins 48 h entre chaque :</p><ul><li><b>Mardi : qualité sur piste</b> (VMA courte, fractionné long, rappel d'allure). La séance la plus intense.</li><li><b>Jeudi : facile</b>. Elle sert à récupérer du mardi et à préparer le dimanche. C'est la séance que l'on gâche le plus souvent en la courant trop vite.</li><li><b>Dimanche : spécifique</b> (seuil, allure 10 km, test, course). Le stimulus le plus proche de l'objectif.</li></ul><p>Semaine 1 = assimilation du semi, semaine 2 = pic de charge, semaine 3 = volume en baisse et test, semaine 4 = affûtage (−40 % de volume, intensité conservée).</p>`],
  ["Respecter l'endurance fondamentale",`<ul><li><b>Le test de la conversation</b> : tu dois pouvoir parler en phrases complètes. Si tu ne peux dire que quelques mots, ce n'est plus de l'EF.</li><li><b>La fourchette 5'30 – 5'50 est un plafond</b>, pas un objectif. Vent, fatigue, chaleur : ralentis jusqu'à 6'00 sans culpabiliser.</li><li><b>Dérive cardiaque</b> : si ta FC grimpe de plus de 8 à 10 bpm à allure constante, ralentis.</li><li><b>Pourquoi c'est crucial</b> : une EF courue trop vite ajoute une fatigue invisible qui fait rater les séances du mardi et du dimanche, celles qui te font progresser.</li><li><b>Cadence</b> : vise 170 pas/min et plus, même lentement. Des petits pas fréquents valent mieux que de grandes foulées.</li></ul>`],
  ["Séance manquée",`<ul><li><b>Mardi manqué</b> : décale-le au mercredi. Le jeudi devient 30' d'EF ou repos, le dimanche reste inchangé.</li><li><b>Jeudi manqué</b> : ne le rattrape pas.</li><li><b>Dimanche manqué (S1, S2)</b> : fais-le le lundi, le mardi suivant devient une EF de 40'.</li><li><b>Test du 8 nov. manqué</b> : lundi 9 au plus tard. Sinon, fixe ton allure sur le point de contrôle 2.</li><li><b>Semaine 4</b> : on ne rattrape rien. Mieux vaut arriver frais que prêt sur le papier.</li><li><b>Jamais deux séances dures deux jours de suite.</b></li><li><b>Plus de 5 jours d'arrêt</b> (maladie) : reprends par une EF, puis vise 4'22 – 4'25 le jour J.</li></ul>`],
  ["Fatigue : les signaux et quoi faire",`<div class="tscroll"><table><tr><th>Signal</th><th>Réponse</th></tr><tr><td>Jambes lourdes, sommeil moyen</td><td>Séance maintenue, retire 1/3 des répétitions</td></tr><tr><td>FC au repos +7 bpm, EF qui semble dure, échauffement pénible</td><td>Remplace la qualité par 30' d'EF</td></tr><tr><td>Douleur localisée qui augmente en courant</td><td>Arrête. 2 à 3 jours de repos, kiné si ça persiste</td></tr><tr><td>Rhume léger (au-dessus du cou)</td><td>EF possible, pas de qualité</td></tr><tr><td>Fièvre, poitrine, courbatures générales</td><td>Repos complet</td></tr></table></div><p style="margin-top:10px"><b>Règle d'or</b> : on réduit le volume, jamais l'allure de plus de 5 s/km. Un fractionné couru trop lentement ne travaille plus la bonne filière.</p>`],
  ["Les 3 points de contrôle",`<ul><li><b>CP1 · dim. 25 oct. · Seuil 3 × 8'</b> : la récupération du semi est-elle terminée ? Compare la FC du 3e bloc avec ton tempo du 1er octobre.</li><li><b>CP2 · dim. 1er nov. · 3 × 2 km à 4'18</b> : l'allure cible est-elle tenable ? RPE et dérive de FC sur le 3e bloc.</li><li><b>CP3 · dim. 8 nov. · Test 5 km</b> : la décision. Le calculateur fixe ton allure de course.</li></ul><p>Note ton ressenti dans chaque fiche (FC, RPE, notes) : c'est ce qui rend les ajustements fiables plutôt qu'au feeling.</p>`],
  ["Jour J : la check-list",`<ul><li><b>Samedi</b> : repas du soir riche en glucides et connu, coucher habituel, matériel prêt (dossard, épingles, chaussures testées).</li><li><b>6h30</b> : petit-déjeuner habituel, 3 h avant le départ.</li><li><b>8h45</b> : arrivée vers la place du Palais-Royal, consigne.</li><li><b>8h55</b> : échauffement de 15' (voir la fiche de course).</li><li><b>9h20</b> : dans le sas, garde une couche jetable si le temps est froid.</li><li><b>En course</b> : tours manuels aux panneaux, premier kilomètre retenu, la course commence au 7e.</li></ul>`]
  ];
  $("#guideGrid").innerHTML=g.map(x=>`<div class="card prose"><h3>${x[0]}</h3>${x[1]}</div>`).join("");
}

/* ---------- EVENTS ---------- */
function show(tab){setTimeout(()=>{if(tab==="race")fitBand();},0);document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("on",b.dataset.tab===tab));document.querySelectorAll(".view").forEach(v=>v.classList.toggle("on",v.id==="v-"+tab));window.scrollTo({top:0,behavior:"smooth"});}
function refresh(){renderDash();renderPlan();}
document.addEventListener("click",e=>{
  const el=e.target.closest("[data-tab],[data-week],[data-wnav],[data-open],[data-close],[data-toggle],[data-savelog],[data-gotest],[data-bandtheme],[data-move],[data-unmove],[data-big],[data-bigclose],[data-print],[data-usetgt],[data-sync],[data-fit],[data-zipfit],[data-ics],[data-bkexp],[data-bkimp],[data-bkpaste]");
  if(e.target===$("#ov")){closeS();return;}
  if(!el)return;
  if(el.dataset.tab){show(el.dataset.tab);}
  else if(el.dataset.week){week=+el.dataset.week;state.week=week;save();renderPlan();show("plan");}
  else if(el.dataset.wnav){week=Math.min(4,Math.max(1,week+ +el.dataset.wnav));state.week=week;save();renderPlan();}
  else if(el.dataset.open){openS(el.dataset.open);}
  else if(el.hasAttribute("data-close")){closeS();}
  else if(el.dataset.toggle){const id=el.dataset.toggle;state.done[id]=!state.done[id];if(!state.done[id])delete state.done[id];save();refresh();openS(id);toast(state.done[id]?"Séance validée 💪":"Séance décochée");}
  else if(el.dataset.savelog){const id=el.dataset.savelog,r=$("#lRpe");state.logs[id]={dist:$("#lDist").value.replace(",",".").trim(),dur:$("#lDur").value.trim(),fc:$("#lFc").value.trim(),rpe:(r.dataset.touched||(state.logs[id]&&state.logs[id].rpe))?r.value:"",note:$("#lNote").value};save();refresh();toast("Ressenti enregistré");}
  else if(el.dataset.sync){const a=el.dataset.sync;if(a==="new")syncEnable(syncGenCode());else if(a==="join")syncFromText(prompt("Colle le code ou le lien de synchronisation :"));else if(a==="now")syncNow(true);else if(a==="link")syncCopyLink();else if(a==="off"&&confirm("Désactiver la synchronisation sur cet appareil ? Tes données restent ici."))syncDisable();}
  else if(el.dataset.move){moveSession(el.dataset.move,$("#mvDate").value);}
  else if(el.dataset.unmove){unmoveSession(el.dataset.unmove);}
  else if(el.hasAttribute("data-big")){bigOpen();}
  else if(el.hasAttribute("data-bigclose")){bigClose();}
  else if(el.hasAttribute("data-print")){printBand();}
  else if(el.dataset.bandtheme){try{localStorage.setItem("prepa10kBand",el.dataset.bandtheme);}catch(e){}renderRace();}
  else if(el.dataset.usetgt){setTarget(el.dataset.usetgt);}
  else if(el.dataset.fit){exportFit(el.dataset.fit);}
  else if(el.hasAttribute("data-zipfit")){exportZip();}
  else if(el.hasAttribute("data-ics")){exportIcs();}
  else if(el.hasAttribute("data-bkexp")){exportBackup();}
  else if(el.hasAttribute("data-bkimp")){$("#bkFile").click();}
  else if(el.hasAttribute("data-bkpaste")){const t=prompt("Colle ici le contenu de ta sauvegarde :");if(t)importBackup(t);}
  else if(el.hasAttribute("data-gotest")){closeS();show("paces");setTimeout(()=>$("#t5").focus(),300);}
});
document.addEventListener("change",e=>{const c=e.target.closest("[data-check]");if(!c)return;const id=c.dataset.check;if(c.checked)state.done[id]=true;else delete state.done[id];save();refresh();toast(c.checked?"Séance validée 💪":"Séance décochée");});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeS();bigClose();}});
window.addEventListener("afterprint",()=>document.body.classList.remove("printband"));
$("#calcBtn").onclick=()=>{const v=$("#t5").value;if(!parseT(v)||parseT(v)<900||parseT(v)>2400){toast("Format attendu : 20:45");return;}state.test=v;save();renderPaces();renderDash();toast("Allure de course mise à jour");};
$("#t5").addEventListener("keydown",e=>{if(e.key==="Enter")$("#calcBtn").click();});
$("#calcClr").onclick=()=>{state.test="";$("#t5").value="";save();renderPaces();renderDash();};
$("#tgtBtn").onclick=()=>setTarget($("#tgt").value);
$("#tgt2Btn").onclick=()=>setTarget($("#tgt2").value);
$("#tgt2").addEventListener("keydown",e=>{if(e.key==="Enter")$("#tgt2Btn").click();});
$("#tgt").addEventListener("keydown",e=>{if(e.key==="Enter")$("#tgtBtn").click();});
$("#resetBtn").onclick=()=>{if(confirm(syncCode()?"Effacer toutes les séances cochées, ressentis et le test, sur tous tes appareils synchronisés ?":"Effacer toutes les séances cochées, ressentis et le test ?")){state={done:{},logs:{},test:"",week:null,target:"43:00",moves:{}};save();week=curWeek();renderPaces();refresh();toast("Suivi réinitialisé");}};

$("#fitHelpPlan").innerHTML=FIT_HELP;
$("#bkFile").addEventListener("change",e=>{const f=e.target.files[0];if(!f)return;f.text().then(importBackup);e.target.value="";});
if("serviceWorker" in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("sw.js").catch(()=>{});
renderDash();renderPlan();renderPaces();renderGuide();
syncInit();
