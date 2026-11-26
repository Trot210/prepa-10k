/* ---------- AIDE EXPORT ---------- */
const FIT_HELP=`<details style="margin-top:10px"><summary class="mut" style="cursor:pointer;font-weight:600;font-size:13px">Comment l'installer sur la montre ?</summary><ol class="mut" style="font-size:13px;margin:8px 0 0;padding-left:20px"><li>Branche la montre à ton ordinateur en USB.</li><li>Copie le fichier .fit dans le dossier <b>GARMIN/NewFiles</b> de la montre.</li><li>Éjecte la montre : la séance apparaît dans Course à pied → Entraînements.</li></ol><p class="mut" style="font-size:12.5px;margin:8px 0 0">Teste d'abord avec une seule séance. L'envoi depuis un iPhone n'est pas possible : passe par le Mac ou le PC.</p></details>`;

/* ---------- STATE ---------- */
const KEY="prepa10kHoka2026_v1";
let state={done:{},logs:{},test:"",week:null,target:"43:00",mt:{},moves:{},journal:{},shoes:{}};
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
function toast(m,ms){const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("on"),ms||1800);}
function profile(segs,h,cls){h=h||44;const tot=segs.reduce((a,s)=>a+st(s).t,0),W=1000;let x=0,r="";segs.forEach(s=>{const w=st(s).t/tot*W,hh=Z[s.z].lvl/6*h;r+=`<rect x="${x.toFixed(1)}" y="${(h-hh).toFixed(1)}" width="${Math.max(w-1.2,.8).toFixed(1)}" height="${hh.toFixed(1)}" fill="${Z[s.z].c}"/>`;x+=w;});return`<svg viewBox="0 0 ${W} ${h}" preserveAspectRatio="none" class="prof ${cls||""}">${r}</svg>`;}
function badge(type){const t=T[type];return`<span class="badge" style="background:${t.c}22;color:${t.c};border:1px solid ${t.c}55"><i class="dot" style="background:${t.c}"></i>${t.n}</span>`;}
function racePace(){const t5=parseT(state.test);if(!t5)return{p:258,src:"provisoire"};const pred=t5*2.085;let p=pred<=2580?Math.min(258,Math.round(pred/10)):Math.ceil(pred/10);p=Math.max(250,Math.min(p,320));return{p,src:"test",pred};}
function doneKm(s){const l=state.logs[s.id];return l&&parseFloat(l.dist)>0?parseFloat(l.dist):s.d;}

/* ---------- CYCLE AFFICHÉ (hiver 2026 ou prépa 10 km) ---------- */
const CYC_KEY="prepa10kCycle";
function defaultCycle(){return CYCLES.find(c=>(c.showFrom||c.from)<=TODAY&&TODAY<=c.to)||CYCLES.find(c=>(c.showFrom||c.from)<=TODAY)||CYCLES[CYCLES.length-1];}
let CY=(()=>{try{const id=sessionStorage.getItem(CYC_KEY);return CYCLES.find(c=>c.id===id)||defaultCycle();}catch(e){return defaultCycle();}})();
const PL=()=>CY.plan;
const IS10=()=>CY.id==="10k";
function renderCycBar(){
  const def=defaultCycle();
  document.querySelectorAll("[data-cycbar]").forEach(el=>{
    if(el.dataset.cycbar==="main")el.innerHTML=`<span class="lab">Cycle</span><div class="seg">${CYCLES.map(c=>`<button class="btn ${c.id===CY.id?"on":""}" data-cycle="${c.id}">${c.name}${c===def?"":" · archive"}</button>`).join("")}</div>`;
    else el.innerHTML=CY===def?"":`<div class="note archive"><span>Tu consultes l'archive <b>${CY.name}</b>.</span><button class="btn" data-cycle="${def.id}">Revenir à ${def.name}</button></div>`;
  });
  const rt=document.querySelector('[data-tab="race"]');if(rt)rt.style.display=IS10()?"":"none";
  $("#brandTxt").innerHTML=IS10()?`Objectif 43:00<small>10 km HOKA Paris Centre · archive</small>`:`Hiver 2026<small>Entretien & progression · réf. 42'32</small>`;
}
function setCycle(id){
  const c=CYCLES.find(x=>x.id===id);if(!c||c===CY)return;
  CY=c;try{sessionStorage.setItem(CYC_KEY,id);}catch(e){}
  week=curWeek();renderCycBar();refresh();renderPaces();renderGuide();
  if(!IS10()&&$("#v-race").classList.contains("on"))show("dash");
}
/* étiquette d'une zone : la FC pour les zones pilotées au cœur, l'allure sinon */
const zlab=z=>Z[z].hr?Z[z].fc+" (FC)":zr(z);

/* ---------- DATES, TEXTES ET ZONES QUI DÉPENDENT DU SUIVI ---------- */
const RACE_DAY="2026-11-15";
const mv=s=>state.moves&&state.moves[s.id]?` <span class="badge" style="border:1px solid #3a4a60;color:var(--mut);text-transform:none;margin-left:4px">déplacée</span>`:"";
/* textes d'une phase : l'allure de course est remplacée par celle du test 5 km quand il est saisi */
function lines(s,b){
  const rp=racePace();if(!s.race||rp.src!=="test")return b.txt;
  return b.txt.map(x=>x.replace("(4'18 ou celle fixée par le test)","("+pace(rp.p)+"/km, fixée par ton test)").replace("≈ 21'28 pour 43'","≈ "+clock(rp.p*5-2)+" pour "+clock(rp.p*10-2)).replace(/4'18/g,pace(rp.p)));
}
function zr(z){const rp=racePace();return z==="Z4"&&rp.src==="test"?pace(rp.p-2)+" – "+pace(rp.p+2):Z[z].r;}
function moveSession(id,date,noOpen){
  const s=ALL.find(x=>x.id===id);state.moves=state.moves||{};
  const c=s&&cycleOf(s);
  if(!s||!date||date<TODAY||date>c.lastMove){toast(c&&c.id==="10k"?"Choisis une date entre aujourd'hui et la veille de la course":"Choisis une date entre aujourd'hui et le "+fdate(c?c.lastMove:TODAY,{day:"numeric",month:"long"}));return;}
  const others=c.all.filter(x=>x.id!==id&&!state.done[x.id]);
  const same=others.find(x=>sdate(x)===date);
  const near=s.hard&&others.find(x=>x.hard&&Math.abs((D(sdate(x))-D(date))/864e5)<=1);
  const msg=same?`« ${same.title} » est déjà prévue ce jour-là.`:near?`« ${near.title} » (séance intense) est prévue ${sdate(near)===date?"le même jour":"la veille ou le lendemain"} : le plan évite deux séances dures consécutives.`:"";
  if(msg&&!confirm(msg+"\nDéplacer quand même ?"))return;
  if(date===s.date)delete state.moves[id];else state.moves[id]=date;
  save();refresh();if(!noOpen)openS(id);toast("Séance déplacée au "+fdate(date,{weekday:"long",day:"numeric",month:"long"}));
}
function unmoveSession(id){if(state.moves)delete state.moves[id];save();refresh();openS(id);toast("Date d'origine rétablie");}

/* ---------- DASHBOARD ---------- */
/* chrono du test 5 km du 31 décembre, saisi dans le champ « durée » de la séance */
function testH(){const l=state.logs.h7b,t=l&&parseT(l.dur);return t&&t>=900&&t<=1800?t:null;}
function testVerdict(t){return t<=1215?["Progression","#22c55e"]:t<=1245?["Niveau maintenu","#a855f7"]:["Légère baisse, rattrapable","#f59e0b"];}
/* ---------- BILAN DE SEMAINE ---------- */
function weekStats(w){
  const ms=w.sessions.filter(s=>!s.opt),done=ms.filter(s=>state.done[s.id]);
  const efL=done.filter(s=>efCap(s)&&+((state.logs[s.id]||{}).fc)>0),rp=done.map(s=>+((state.logs[s.id]||{}).rpe)).filter(x=>x>0);
  return{ms,done,kmPlan:ms.reduce((a,s)=>a+s.d,0),kmDone:done.reduce((a,s)=>a+doneKm(s),0),efLogged:efL.length,efOk:efL.filter(s=>+state.logs[s.id].fc<=efCap(s)).length,
    rpe:rp.length?(rp.reduce((a,b)=>a+b,0)/rp.length).toFixed(1).replace(".",","):"",missed:ms.filter(s=>!state.done[s.id]&&!(state.logs[s.id]||{}).skip&&sdate(s)<TODAY)};
}
function bilanCard(w){
  const b=weekStats(w),all=b.done.length===b.ms.length,efBad=b.efLogged&&b.efOk<b.efLogged;
  const verdict=all&&!efBad?["Semaine réussie 👍","Toutes les séances faites"+(b.efLogged?", et l'EF est restée sous 138 bpm.":"."),"#4ade80"]
    :!b.done.length?["Semaine blanche","Pas de rattrapage : reprends le plan normalement, sans doubler les séances.","#f59e0b"]
    :efBad?["Attention à l'EF",`${b.efLogged-b.efOk} sortie${b.efLogged-b.efOk>1?"s":""} facile${b.efLogged-b.efOk>1?"s":""} au-dessus de 138 bpm : ralentis, quitte à marcher en côte.`,"#f59e0b"]
    :["Semaine correcte",`${b.ms.length-b.done.length} séance${b.ms.length-b.done.length>1?"s":""} non faite${b.ms.length-b.done.length>1?"s":""} : pas de rattrapage, la suite du plan en tient compte.`,"#a855f7"];
  const mini=(l,v,s)=>`<div class="mini"><div class="lab">${l}</div><div class="v">${v}</div>${s?`<div class="s">${s}</div>`:""}</div>`;
  return`<div class="card bilan"><div class="eyebrow" style="color:${verdict[2]}">Bilan de la semaine ${w.n} · ${w.phase}</div><div class="bTitle">${verdict[0]}</div><div class="mut">${verdict[1]}</div>
   <div class="minis" style="margin-top:12px">${mini("Séances",b.done.length+" / "+b.ms.length)}${mini("Volume",km(b.kmDone)+" km","prévu "+km(b.kmPlan))}${mini("EF ≤ 138",b.efLogged?b.efOk+" / "+b.efLogged:"—",b.efLogged?"":"FC non notée")}${mini("Ressenti moyen",b.rpe?b.rpe+" / 10":"—")}</div></div>`;
}
/* ---------- PROGRESSION ---------- */
function progressionCard(){
  const vm=vmaMeasured(),t5=testH(),base10=t5?t5*2.085:2552,riegel=(t,d1,d2)=>t*Math.pow(d2/d1,1.06);
  const row=(d,l,v,s,c)=>`<div class="pRow"><div class="pDate">${d}</div><div style="flex:1;min-width:0"><div class="pLab">${l}</div>${s?`<div class="mut" style="font-size:12.5px">${s}</div>`:""}</div><div class="pVal"${c?` style="color:${c}"`:""}>${v}</div></div>`;
  return`<div class="card progression"><div class="wlHead" style="padding-top:0">Progression</div>
   ${row("avant","10 km Adidas","46'26","4'39/km")}
   ${row("avant","Semi-marathon","1h40'37","4'46/km")}
   ${row("15 nov.","10 km HOKA","42'32","record · −3'54 · 4'15/km","#4ade80")}
   ${row("1er déc.","Test VMA (demi-Cooper)",vm?kmh(vm)+" km/h":"à venir",vm?state.logs.vma.d+" m en 6'":"")}
   ${row("31 déc.","Test 5 km",t5?clock(t5):"à venir",t5?testVerdict(t5)[0]:"objectif ≤ 20'15",t5?testVerdict(t5)[1]:"")}
   <div class="pPred">Estimations ${t5?"d'après ton test 5 km":"d'après ton 42'32"} (formule de Riegel) : 5 km ≈ <b>${clock(t5||base10/2.085)}</b> · 10 km ≈ <b>${clock(base10)}</b> · semi ≈ <b>${clock(riegel(base10,10,21.0975))}</b></div></div>`;
}
/* ---------- AUJOURD'HUI ---------- */
const isTouch=()=>matchMedia("(pointer:coarse)").matches;
const addDays=(ds,n)=>{const d=D(ds);d.setDate(d.getDate()+n);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
/* plafond de FC d'une séance facile (EF, récupération, sortie longue en EF) ; null pour les autres */
function efCap(s){
  if(s.hard)return null;
  const z=s.main.segs.filter(x=>x.z!=="W"&&!isStride(x));
  if(!z.length||!z.every(x=>(x.z==="E"||x.z==="R")&&x.hr!==null))return null;
  return Math.max(...z.map(x=>(x.hr||Z[x.z].hr)[1]));
}
function efStats(){
  const xs=CY.main.filter(s=>efCap(s)&&state.done[s.id]&&+((state.logs[s.id]||{}).fc)>0);
  return {logged:xs.length,ok:xs.filter(s=>+state.logs[s.id].fc<=efCap(s)).length};
}
function relDay(ds){return ds===TODAY?"Aujourd'hui":ds===addDays(TODAY,1)?"Demain":ds===addDays(TODAY,-1)?"Hier":fdate(ds,{weekday:"long",day:"numeric",month:"short"});}
function renderToday(){
  const MAIN=CY.main,P=PL(),cw=curWeek(),w=P[cw-1],skipped=s=>!!(state.logs[s.id]||{}).skip,open=s=>!state.done[s.id]&&!skipped(s);
  const nx=MAIN.find(s=>sdate(s)===TODAY&&open(s))||MAIN.filter(s=>open(s)&&sdate(s)>TODAY).sort((a,b)=>sdate(a).localeCompare(sdate(b)))[0];
  const pend=MAIN.filter(s=>open(s)&&sdate(s)<TODAY&&sdate(s)>=addDays(TODAY,-7)).sort((a,b)=>sdate(a).localeCompare(sdate(b)));
  const mini=(l,v,s,c)=>`<div class="mini"><div class="lab">${l}</div><div class="v"${c?` style="color:${c}"`:""}>${v}</div>${s?`<div class="s">${s}</div>`:""}</div>`;
  let h="";
  let L="",Rt="";
  if(pend.length)h+=`<div class="note warn todo">${pend.map(s=>`<div class="todoRow"><div><b>À valider</b> · ${s.title}<div class="mut" style="font-size:12.5px">${relDay(sdate(s))}</div></div><div class="todoBtns"><button class="btn" data-skip="${s.id}">Pas faite</button><button class="btn ok" data-finish="${s.id}">Terminer</button></div></div>`).join("")}</div>`;
  if(nx){const cap=efCap(nx),isT=sdate(nx)===TODAY,tc=T[nx.type].c;
    h+=`<div class="card todayCard" style="--tc:${tc}"><div class="eyebrow" style="color:${tc}">${isT?"Aujourd'hui":"Prochaine séance · "+relDay(sdate(nx))}</div>
     <div class="tTitle">${nx.title}</div><div class="mut">${nx.short}</div>
     <div class="tMeta"><span>⏱ ${dur(nx.t)}</span><span>📍 ≈ ${km(nx.d)} km</span>${cap?`<span style="color:#4ade80">❤️ ≤ ${cap}</span>`:nx.cp?`<span class="cpTag">CP${nx.cp}</span>`:""}</div>
     ${profile(nx.segs)}
     ${nx.tips&&nx.tips[0]?`<div class="tTip">💡 ${nx.tips[0]}</div>`:""}
     <div class="tBtns"><button class="btn" data-open="${nx.id}">Détail</button><button class="btn" data-watch="${nx.id}">⌚ Montre</button><button class="btn ok" data-finish="${nx.id}">✓ Terminer</button></div></div>`;}
  else h+=`<div class="card"><b>${MAIN.every(s=>state.done[s.id])?"Toutes les séances sont validées. Bravo !":"Plus aucune séance à venir dans ce cycle."}</b></div>`;
  const ms=w.sessions.filter(s=>!s.opt),dn=ms.filter(s=>state.done[s.id]),wkKm=ms.reduce((a,s)=>a+s.d,0),dKm=dn.reduce((a,s)=>a+doneKm(s),0);
  const ef=efStats(),vm=vmaMeasured();
  L+=h;h="";
  if(cw>1&&TODAY<=addDays(w.mon,2))Rt+=bilanCard(P[cw-2]);
  Rt+=`<div class="minis">${mini("Semaine "+cw+" / "+P.length,dn.length+" / "+ms.length+" faites",w.phase)}${mini("Volume semaine",km(dKm)+" / "+km(wkKm)+" km","réalisé / prévu")}${mini("EF ≤ 138 bpm",ef.logged?ef.ok+" / "+ef.logged:"—",ef.logged?(ef.ok===ef.logged?"toutes respectées":"au-dessus du plafond : ralentis"):"note ta FC moyenne",ef.logged?(ef.ok===ef.logged?"#4ade80":"#f59e0b"):"")}${mini("VMA",(vm?"":"≈ ")+kmh(vm||VMA_EST)+" km/h",vm?"mesurée au test":"estimée · test le 1er déc.")}</div>`;
  const icon=s=>state.done[s.id]?["✓","#a3e635","Faite"]:skipped(s)?["–","#3a4a60","Non faite"]:sdate(s)<TODAY?["!","#f59e0b","À valider"]:s===nx?["→","#4ade80",isTouch()?"Prochaine":"Prochaine séance"]:["","#2a3646",""];
  L+=`<div class="card weekList"><div class="wlHead">Cette semaine</div>${w.sessions.slice().sort((a,b)=>sdate(a).localeCompare(sdate(b))).map(s=>{const [ic,c,lab]=icon(s);return`<div class="wlRow" data-open="${s.id}"><span class="wlIc" style="background:${c}">${ic}</span><div style="flex:1;min-width:0"><div class="wlT">${s.title}</div><div class="mut" style="font-size:12.5px">${relDay(sdate(s))} · ${dur(s.t)}${lab?` · ${lab}`:""}</div></div><span class="mut">›</span></div>`;}).join("")}</div>`;
  Rt+=`<div class="dOnly">${chargeCard()}</div>`+progressionCard();
  $("#today").innerHTML=`<div class="tdL">${L}</div><div class="tdR">${Rt}</div>`;
}
function renderDash(){
  const MAIN=CY.main,P=PL(),now=new Date();
  const doneN=MAIN.filter(s=>state.done[s.id]).length;
  const totKm=MAIN.reduce((a,s)=>a+s.d,0),totT=MAIN.reduce((a,s)=>a+s.t,0);
  const dKm=CY.all.filter(s=>state.done[s.id]).reduce((a,s)=>a+doneKm(s),0);
  const cw=curWeek();
  let chip0;
  if(IS10()){
    const days=Math.ceil((new Date("2026-11-15T09:30:00")-now)/864e5);
    $("#heroEye").textContent="Dim. 15 novembre 2026 · départ 9h30 · Rivoli → Opéra";
    $("#heroBig").innerHTML="43:00<span>sur 10 km</span>";
    $("#heroSub").innerHTML=`Allure cible <b style="color:var(--text)">4'18/km</b> · 4 semaines · 12 séances · mardi / jeudi / dimanche`;
    chip0=days>0?`<span class="chip">⏱ <b>J-${days}</b></span>`:days>-1?`<span class="chip">🏁 <b>C'est le jour J</b></span>`:`<span class="chip">🏁 Course terminée · 42'32</span>`;
  }else{
    const days=Math.ceil((new Date(CY.to+"T23:59:00")-now)/864e5);
    $("#heroEye").textContent="16 novembre → 31 décembre 2026 · après le 10 km HOKA";
    $("#heroBig").innerHTML="42:32<span>ta référence</span>";
    $("#heroSub").innerHTML=`Facile à la FC <b style="color:var(--text)">≤ 138 bpm</b>, qualité à l'allure · ${P.length} semaines · ${MAIN.length} séances · mardi / jeudi / dimanche`;
    chip0=TODAY<CY.from?`<span class="chip">🌱 Début le <b>lundi 16 nov.</b></span>`:days>0?`<span class="chip">⏳ <b>${days} jours</b> jusqu'au 31 déc.</span>`:`<span class="chip">✅ Cycle terminé</span>`;
  }
  $("#heroChips").innerHTML=chip0+`<span class="chip">Semaine <b>${cw}</b> / ${P.length} · ${P[cw-1].phase}</span><span class="chip">${km(totKm)} km · ${dur(totT)} au programme</span>`;
  const pct=doneN/MAIN.length,R=52,C=2*Math.PI*R;
  $("#ring").innerHTML=`<defs><linearGradient id="rg" x1="0" x2="1"><stop offset="0" stop-color="#ff6a2b"/><stop offset="1" stop-color="#ffb020"/></linearGradient></defs><circle cx="60" cy="60" r="${R}" fill="none" stroke="#1d2734" stroke-width="12"/><circle cx="60" cy="60" r="${R}" fill="none" stroke="url(#rg)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-pct)}" transform="rotate(-90 60 60)" style="transition:stroke-dashoffset .6s"/><text x="60" y="58" text-anchor="middle" fill="#e8eef6" font-size="26" font-weight="900">${Math.round(pct*100)}%</text><text x="60" y="76" text-anchor="middle" fill="#8b9bb0" font-size="11" font-weight="600">du plan</text>`;
  $("#kDone").textContent=doneN+" / "+MAIN.length;
  $("#kKm").textContent=km(dKm)+" km";
  $("#kKmSub").textContent="sur "+km(totKm)+" km prévus (estimation)";
  const kp=(l,v,s,st)=>`<div class="card kpi"><div class="lab">${l}</div><div class="val"${st||""}>${v}</div><div class="sub">${s}</div></div>`;
  if(IS10()){
    const rp=racePace();
    $("#kpiRow").innerHTML=kp("Dernier 10 km","46'26","10 km Adidas · 4'39/km")+kp("Équivalent semi","≈ 45'35","1h40'37 converti (Riegel)")+kp("Écart à combler","−3'26","−7,4 % vs 46'26 · −20 s/km")+kp("Allure de course",pace(rp.p),rp.src==="test"?"d'après ton test 5 km · ≈ "+clock(rp.p*10-2):"provisoire · fixée au test du 8 nov.");
  }else{
    const t=testH(),v=t&&testVerdict(t);
    $("#kpiRow").innerHTML=kp("Référence 10 km","42'32","15 nov. · 4'15/km")+(()=>{const vm=vmaMeasured();return kp("VMA",vm?kmh(vm)+" km/h":"≈ "+kmh(VMA_EST)+" km/h",vm?"test demi-Cooper · "+state.logs.vma.d+" m en 6'":"estimée sur ton 10 km · test le 1er déc.");})()+kp("Plafond EF","≤ 138 bpm","zone 2 Garmin : 118 – 137")+kp("Test du 31 déc.",t?clock(t):"à venir",t?v[0]:"≈ 20'24 attendu · ≤ 20'15 progrès",t?` style="color:${v[1]}"`:"");
  }
  // next session
  const nx=MAIN.filter(s=>!state.done[s.id]&&sdate(s)>=TODAY).sort((a,b)=>sdate(a).localeCompare(sdate(b)))[0]||MAIN.find(s=>!state.done[s.id]&&sdate(s)>=TODAY);
  $("#nextBox").innerHTML=nx?`<div class="note goal" style="--tc:${T[nx.type].c}"><div class="next"><div><div class="mut" style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">Prochaine séance · ${fdate(sdate(nx))}</div><div style="font-weight:800;font-size:16px;margin:2px 0">${nx.title}</div><div class="meta"><span><b>${dur(nx.t)}</b></span><span><b>${km(nx.d)} km</b></span></div></div><button class="btn pri" data-open="${nx.id}">Voir</button></div></div>`:`<div class="note">${doneN===MAIN.length?"Toutes les séances sont cochées. Bravo !":"Plus aucune séance à venir dans ce cycle."}</div>`;
  // phases
  $("#phTitle").textContent=IS10()?"Les 4 phases":`Les ${P.length} semaines`;
  $("#phases").innerHTML=P.map(w=>{const ms=w.sessions.filter(s=>!s.opt),dn=ms.filter(s=>state.done[s.id]).length;return`<button class="phase ${w.n===cw?"cur":""}" data-week="${w.n}"><div class="wk">S${w.n} · ${fdate(w.mon,{day:"numeric",month:"short"})}</div><div class="nm">${w.phase}</div><div class="bar"><i style="width:${dn/ms.length*100}%"></i></div><div class="mut" style="font-size:12px;margin-top:6px">${dn}/${ms.length} séances · ${km(ms.reduce((a,s)=>a+s.d,0))} km</div></button>`;}).join("");
  const h=!IS10();
  $("#today").style.display=h?"":"none";document.querySelector("#v-dash .hero").style.display=h?"none":"";$("#kpiRow").style.display=h?"none":"";$("#phTitle").style.display=h?"none":"";$("#phases").style.display=h?"none":"";
  if(h)renderToday();
  renderVol();renderZones();renderReal();
}
function renderVol(){
  const P=PL(),N=P.length;
  const data=P.map(w=>{const ms=w.sessions.filter(s=>!s.opt);return{n:w.n,p:ms.reduce((a,s)=>a+s.d,0),t:ms.reduce((a,s)=>a+s.t,0),d:w.sessions.filter(s=>state.done[s.id]).reduce((a,s)=>a+doneKm(s),0)};});
  const mx=Math.max(...data.map(x=>Math.max(x.p,x.d)))*1.15,W=420,H=N>4?214:200,base=H-(N>4?38:24),pad=28,bw=Math.min(58,(W-pad*2)/N*.72),gap=N>1?(W-pad*2-bw*N)/(N-1):0;
  let g="";[0,10,20,30,40].forEach(v=>{if(v>mx)return;const y=base-(v/mx)*(base-26);g+=`<line x1="${pad-6}" x2="${W}" y1="${y}" y2="${y}" stroke="#1d2734"/><text x="${pad-10}" y="${y+4}" fill="#5f6f84" font-size="10" text-anchor="end">${v}</text>`;});
  data.forEach((x,i)=>{const X=pad+i*(bw+gap),hp=(x.p/mx)*(base-26),hd=(Math.min(x.d,mx)/mx)*(base-26),cx=X+bw/2;
    g+=`<rect x="${X}" y="${base-hp}" width="${bw}" height="${hp}" rx="${N>4?6:8}" fill="rgba(255,255,255,.03)" stroke="#3a4a60" stroke-dasharray="4 3"/>`;
    if(x.d>0)g+=`<rect x="${X+4}" y="${base-hd}" width="${bw-8}" height="${hd}" rx="5" fill="url(#vg)"/>`;
    g+=`<text x="${cx}" y="${base-hp-8}" fill="#e8eef6" font-size="${N>4?11:12}" font-weight="800" text-anchor="middle">${N>4?Math.round(x.p):km(x.p)}</text>`;
    g+=N>4?`<text x="${cx}" y="${base+16}" fill="#8b9bb0" font-size="11" font-weight="800" text-anchor="middle">S${x.n}</text><text x="${cx}" y="${base+30}" fill="#5f6f84" font-size="10" font-weight="600" text-anchor="middle">${dur(x.t)}</text>`:`<text x="${cx}" y="${H-6}" fill="#8b9bb0" font-size="11" font-weight="700" text-anchor="middle">S${x.n} · ${dur(x.t)}</text>`;});
  $("#volChart").innerHTML=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block"><defs><linearGradient id="vg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff6a2b"/><stop offset="1" stop-color="#ffb020"/></linearGradient></defs>${g}</svg>`;
}
function renderZones(){
  const tz={};CY.main.forEach(s=>s.segs.forEach(x=>{if(x.z==="W")return;tz[x.z]=(tz[x.z]||0)+st(x).t;}));
  const tot=Object.values(tz).reduce((a,b)=>a+b,0),order=CY.zones;
  const easy=order.slice(0,2).reduce((a,z)=>a+(tz[z]||0),0)/tot;
  $("#zoneChart").innerHTML=`<div style="display:flex;height:22px;border-radius:8px;overflow:hidden;gap:2px">${order.map(z=>`<div title="${Z[z].n}" style="flex:${tz[z]||0};background:${Z[z].c}"></div>`).join("")}</div>
  <div style="margin-top:14px;display:grid;gap:7px">${order.map(z=>`<div style="display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;font-size:13.5px"><span><i class="dot" style="background:${Z[z].c};margin-right:8px"></i>${Z[z].n}${Z[z].hr?` <span class="mut" style="font-size:12px">${Z[z].fc}</span>`:""}</span><span class="mut">${dur(tz[z]||0)}</span><b style="width:42px;text-align:right">${Math.round((tz[z]||0)/tot*100)}%</b></div>`).join("")}</div>
  <div class="note" style="margin-top:14px;font-size:13.5px"><b>${Math.round(easy*100)} % du temps en intensité facile${IS10()?"":" (sous 138 bpm)"}.</b> C'est voulu : l'essentiel du gain vient des séances dures, à condition que tout le reste soit réellement facile.</div>`;
}
function renderReal(){
  $("#realTitle").textContent=IS10()?"Projection honnête":"Le cycle en bref";
  if(!IS10()){
    const cps=CY.main.filter(s=>s.cp);
    $("#realism").innerHTML=`<div class="grid g2"><div class="prose"><p><b>Objectif : arriver au 1er janvier avec au moins ton niveau du 15 novembre</b>, en gardant le plaisir de courir.</p>
    <ul><li><b>3 séances par semaine</b> : mardi qualité (fractionné, fartlek), jeudi EF, dimanche sortie longue, parfois avec du seuil.</li>
    <li><b>Charge en vagues</b> : S1 récupération, S2 à S4 montée progressive, S5 allégée, S6 charge modérée pendant les fêtes, S7 bilan.</li>
    <li><b>Le facile se pilote à la FC</b> : plafond de 138 bpm (tes zones Garmin) pour la récupération, l'EF et les parties faciles des sorties longues. Les fichiers de la montre contiennent cette cible.</li>
    <li><b>Le dur se pilote à l'allure</b>, recalculée sur ton 42'32 : seuil 4'27 – 4'32, allure 5 km 4'02 – 4'07.</li></ul></div>
    <div><div class="mut" style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Points de contrôle</div>
    ${cps.map(s=>{const l=state.logs[s.id]||{},dn=state.done[s.id];return`<div class="note" style="margin-bottom:8px;cursor:pointer" data-open="${s.id}"><span class="cpTag">CP${s.cp}</span> <b>${fdate(sdate(s),{weekday:"short",day:"numeric",month:"short"})} · ${s.title}</b><div class="mut" style="font-size:12.5px;margin-top:4px">${dn?"✓ Réalisée"+(l.fc?" · FC moy. "+l.fc:"")+(l.rpe?" · RPE "+l.rpe:""):"À venir"}${s.id==="h7b"&&testH()?" · "+clock(testH())+" : "+testVerdict(testH())[0]:""}</div></div>`;}).join("")}
    <p class="mut" style="font-size:12.5px">Note ta FC et ton RPE dans chaque fiche : c'est ce qui permet d'ajuster la suite plutôt qu'au feeling.</p></div></div>`;
    return;
  }
  const rows=[["≤ 43'00","Objectif atteint",25,"#a855f7"],["43'01 – 43'59","Proche, record net",40,"#22c55e"],["44'00 – 45'00","Progression solide",28,"#f59e0b"],["> 45'00","Jour sans",7,"#94a3b8"]];
  $("#realism").innerHTML=`<div class="grid g2"><div class="prose"><p><b>43' est ambitieux mais crédible.</b> Ta projection centrale aujourd'hui se situe vers <b>43'45 – 44'30</b>. Le scénario 43' demande que le bloc se passe bien et que le test 5 km du 8 novembre descende sous 20'35.</p>
  <p><b>Ce qui joue pour toi</b></p><ul><li>Ton semi d'aujourd'hui vaut déjà ≈ 45'35 sur 10 km, alors que tu étais en fin de prépa longue.</li><li>VO₂max estimée à 51 : le moteur est là (les montres sont souvent optimistes, mais l'écart avec tes chronos indique une marge).</li><li>Un parcours plat et un affûtage pensé pour arriver frais.</li></ul>
  <p><b>Ce qui joue contre</b></p><ul><li>Seulement 4 semaines, dont une de récupération.</li><li>Ton seuil observé en séance (4'35 à FC 178) est encore loin d'une allure 4'18 tenue 43 minutes.</li><li>Un gain de 20 s/km sur ta dernière référence 10 km.</li></ul></div>
  <div><div class="mut" style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Scénarios estimés si le plan est suivi</div><div class="scen">${rows.map(r=>`<div class="scrow"><b>${r[0]}</b><div class="bar" style="height:12px"><i style="width:${r[2]*2.4}%;background:${r[3]}"></i></div><span class="mut">~${r[2]} %</span></div><div class="mut" style="font-size:12px;margin:-4px 0 4px">${r[1]}</div>`).join("")}</div>
  <p class="mut" style="font-size:12.5px">Estimation à affiner : chaque point de contrôle (25 oct., 1er nov., 8 nov.) donne une information plus fiable que cette projection.</p></div></div>`;
}

/* ---------- PLAN VIEW ---------- */
const CALS={recup:"Réc",fart:"Fart",spec:"Spé",race:"10K"};
const SHORT={recup:"Récup",ef:"EF",long:"SL",frac:"Frac",fart:"Fartlek",seuil:"Seuil",spec:"Spé",test:"Test",race:"Course"};
function curWeek(){let n=1;PL().forEach(w=>{if(w.mon<=TODAY)n=w.n;});return n;}
let week=curWeek();
let planMode=(()=>{try{return sessionStorage.getItem("prepa10kPlanMode")||"week";}catch(e){return"week";}})();
function renderCal(){
  const P=PL(),dn=["lun","mar","mer","jeu","ven","sam","dim"];
  let h=`<div class="calG"><div class="calH"></div>${dn.map(d=>`<div class="calH">${d}</div>`).join("")}`;
  P.forEach(w=>{h+=`<div class="calW">S${w.n}</div>`;for(let i=0;i<7;i++){const ds=addDays(w.mon,i),s=CY.all.find(x=>sdate(x)===ds),dnS=s&&state.done[s.id],sk=s&&(state.logs[s.id]||{}).skip,miss=s&&!dnS&&!sk&&ds<TODAY,out=ds<CY.from||ds>CY.to;
    const drag=s&&!dnS&&ds>=TODAY&&ds<=cycleOf(s).lastMove&&!isTouch();
    h+=`<div class="calD ${ds===TODAY?"today":""} ${miss?"miss":""} ${out?"out":""}" data-cday="${ds}" ${s?`data-open="${s.id}"`:""}><span class="cdn">${+ds.slice(8)}</span>${s?`<span class="tl" ${drag?`draggable="true" data-drag="${s.id}"`:""} style="background:${T[s.type].c}">${CALS[s.type]||SHORT[s.type]||T[s.type].n}</span><span class="cT">${s.title}</span><span class="cDu">${dur(s.t)}</span>${dnS?'<span class="cOk">✓</span>':sk?'<span class="cSk">–</span>':s.cp?`<span class="cpMini">CP${s.cp}</span>`:""}`:""}</div>`;}});
  $("#calGrid").innerHTML=h+`</div><div class="mut" style="font-size:12.5px;margin-top:10px">${isTouch()?"Touche une séance pour l'ouvrir. Pour la déplacer : fiche → Déplacer la séance.":"Glisse une séance à venir sur un autre jour pour la déplacer (deux séances dures ne peuvent pas se suivre)."}</div>`;
}
function renderPlan(){
  document.querySelectorAll("[data-pmode]").forEach(b=>b.classList.toggle("on",b.dataset.pmode===planMode));
  const cal=planMode==="cycle";["#weekNav","#weekHead","#strip","#sessGrid"].forEach(s=>{$(s).style.display=cal?"none":"";});$("#calGrid").style.display=cal?"":"none";
  if(cal)renderCal();
  const P=PL(),w=P[week-1];
  $("#weekNav").innerHTML=`<button class="wbtn arrow" data-wnav="-1" ${week===1?"disabled":""}>←</button>`+P.map(x=>`<button class="wbtn ${x.n===week?"on":""}" data-week="${x.n}">S${x.n}</button>`).join("")+`<button class="wbtn arrow" data-wnav="1" ${week===P.length?"disabled":""}>→</button><span class="mut" style="margin-left:6px;font-weight:600;font-size:14px">${fdate(w.mon,{day:"numeric",month:"long"})} – ${fdate((()=>{const d=D(w.mon);d.setDate(d.getDate()+6);const e=d.toISOString().slice(0,10);return e>CY.to?CY.to:e;})(),{day:"numeric",month:"long"})}</span>`;
  const ms=w.sessions.filter(s=>!s.opt),dn=ms.filter(s=>state.done[s.id]).length,wkKm=ms.reduce((a,s)=>a+s.d,0),wkT=ms.reduce((a,s)=>a+s.t,0);
  const maxKm=Math.max(...P.map(x=>x.sessions.filter(s=>!s.opt).reduce((a,s)=>a+s.d,0)));
  const ws=weekStats(w),past=w.mon<=TODAY;
  $("#weekHead").innerHTML=`<div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap"><div style="flex:1;min-width:240px"><div class="eyebrow">Semaine ${w.n} · ${w.short}</div><h2 style="margin:4px 0 6px">${w.phase}</h2><div class="mut">${w.goal}</div></div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-start"><div class="stat"><div class="l">Distance</div><div class="v">${km(wkKm)} km</div></div><div class="stat"><div class="l">Durée</div><div class="v">${dur(wkT)}</div></div><div class="stat"><div class="l">Faites</div><div class="v">${dn} / ${ms.length}</div></div><div class="stat" style="min-width:120px"><div class="l">Charge relative</div><div class="bar" style="margin-top:8px"><i style="width:${wkKm/maxKm*100}%"></i></div></div></div></div>${past&&ws.done.length?`<div class="wkBilan">Réalisé : <b>${km(ws.kmDone)} km</b> sur ${km(ws.kmPlan)}${ws.efLogged?` · EF sous ${CY.id==="hiver"?"138":"le plafond"} : <b>${ws.efOk} / ${ws.efLogged}</b>`:""}${ws.rpe?` · ressenti moyen <b>${ws.rpe}</b> / 10`:""}${ws.missed.length?` · <span style="color:#f59e0b">${ws.missed.length} à valider</span>`:""}</div>`:""}`;
  // strip
  let strip="";for(let i=0;i<7;i++){const d=new Date(D(w.mon));d.setDate(d.getDate()+i);const ds=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");const s=w.sessions.find(x=>sdate(x)===ds);
    strip+=`<div class="day ${s?"has":""} ${ds===TODAY?"today":""} ${s&&state.done[s.id]?"done":""} ${s&&!state.done[s.id]&&!(state.logs[s.id]||{}).skip&&ds<TODAY?"miss":""}" ${s?`data-open="${s.id}"`:""} style="${s?`border-color:${T[s.type].c}66;background:${T[s.type].c}10`:""}"><div class="dn">${d.toLocaleDateString("fr-FR",{weekday:"short"}).replace(".","")}</div><div class="dd">${d.getDate()}</div>${s?`<span class="tl" style="background:${T[s.type].c}">${SHORT[s.type]||T[s.type].n.split(" ")[0]}</span>${s.cp?`<span class="cpMini">CP${s.cp}</span>`:""}${(state.logs[s.id]||{}).skip?`<span class="dt" style="display:block">non faite</span>`:!state.done[s.id]&&ds<TODAY?`<span class="missMini">à valider</span>`:`<div class="dt">${dur(s.t)}</div>`}`:`<div class="dt">Repos</div>`}</div>`;}
  $("#strip").innerHTML=strip;
  $("#sessGrid").innerHTML=w.sessions.slice().sort((a,b)=>sdate(a).localeCompare(sdate(b))).map(card).join("");
  $("#legendTypes").innerHTML=Object.values(T).map(t=>`<span><i class="dot" style="background:${t.c}"></i>${t.n}</span>`).join("")+`<span style="margin-left:auto"><span class="cpTag">CP</span>&nbsp;point de contrôle</span>`;
}
function card(s){const dn=!!state.done[s.id];return`<div class="card sess ${dn?"done":""} ${s.opt?"opt":""}" style="--tc:${T[s.type].c}">
  <div class="hd"><span class="date">${fdate(sdate(s))}${mv(s)}</span>${s.cp?`<span class="cpTag">CP${s.cp}</span>`:s.opt?`<span class="badge" style="border:1px dashed #3a4a60;color:var(--mut)">optionnel</span>`:""}</div>
  <div>${badge(s.type)}</div><h3>${s.title}</h3><div class="mut" style="font-size:13.5px;margin-top:-4px">${s.short}</div>
  ${profile(s.segs)}
  <div class="meta"><span>⏱ <b>${dur(s.t)}</b></span><span>📍 <b>${km(s.d)} km</b></span>${state.logs[s.id]&&state.logs[s.id].rpe?`<span>RPE <b>${state.logs[s.id].rpe}</b></span>`:""}</div>
  <div class="ft">${dn?`<button class="btn doneTag" data-finish="${s.id}">✓ Réalisée</button>`:`<button class="btn ok" data-finish="${s.id}">Terminer</button>`}<button class="btn" data-open="${s.id}">Détail →</button></div></div>`;}

/* ---------- MODAL ---------- */
function phaseBlock(name,b,col,s){const t=b.segs.reduce((a,x)=>a+st(x).t,0),d=b.segs.reduce((a,x)=>a+st(x).d,0)/1000;return`<div class="step" style="--sc:${col}"><div class="sn">${name}<span>${dur(t)} · ${km(d)} km</span></div><ul>${lines(s,b).map(x=>`<li>${x}</li>`).join("")}</ul></div>`;}
function openS(id,o){
  const s=ALL.find(x=>x.id===id);if(!s)return;const t=T[s.type],l=state.logs[id]||{},dn=!!state.done[id],rp=racePace();
  const mainCol=Z[s.main.segs.reduce((a,x)=>Z[x.z].lvl>Z[a.z].lvl?x:a).z].c;
  const zs=[...new Set(s.segs.map(x=>x.z))].filter(z=>z!=="W");
  $("#panel").style.setProperty("--tc",t.c);
  $("#panel").innerHTML=`<div class="phd"><button class="close" data-close>×</button><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${badge(s.type)}${s.cp?`<span class="cpTag">Point de contrôle ${s.cp}</span>`:""}${s.opt?`<span class="badge" style="border:1px dashed #3a4a60;color:var(--mut)">optionnel</span>`:""}</div>
   <h2>${s.title}</h2><div class="mut capf">${fdate(sdate(s),{weekday:"long",day:"numeric",month:"long"})} · semaine ${s.wk}${state.moves&&state.moves[s.id]?` · <span>prévue le ${fdate(s.date,{day:"numeric",month:"short"})}</span>`:""}</div>
   <div class="stats"><div class="stat"><div class="l">Durée</div><div class="v">${dur(s.t)}</div></div><div class="stat"><div class="l">Distance</div><div class="v">${km(s.d)} km</div></div>${s.race?`<div class="stat"><div class="l">Allure course</div><div class="v">${pace(rp.p)}/km</div></div>`:""}</div>
   <div style="margin-top:14px">${profile(s.segs,90,"profBig")}</div>
   <div class="legend" style="margin-top:8px">${zs.map(z=>`<span><i class="dot" style="background:${Z[z].c}"></i>${Z[z].n} · ${zlab(z)}</span>`).join("")}</div></div>
  <div class="pbd">
   <div class="note goal"><b>Objectif physiologique</b><br>${s.goal}</div>
   <div class="sec"><h4>Déroulé</h4><div class="steps">${phaseBlock("Échauffement",s.wu,"#22c55e",s)}${phaseBlock("Corps de séance",s.main,mainCol,s)}${phaseBlock("Retour au calme",s.cd,"#94a3b8",s)}</div></div>
   ${s.race&&rp.src==="test"?`<div class="note cp">Ton test 5 km fixe l'allure de course à <b>${pace(rp.p)}/km</b>  : les consignes de cette séance sont déjà mises à jour.</div>`:""}
   <div class="sec"><h4>Consignes</h4><ul style="margin:0;padding-left:18px">${s.tips.map(x=>`<li style="margin:4px 0">${x}</li>`).join("")}</ul></div>
   ${s.cpTxt?`<div class="sec"><div class="note cp"><b>Point de contrôle ${s.cp}</b><br>${s.cpTxt}${s.cp===3?`<div style="margin-top:10px"><button class="btn pri" data-gotest>Ouvrir le calculateur</button></div>`:""}</div></div>`:""}
   ${s.vmaTest?`<div class="sec"><div class="note cp"><b>Après le test</b><br>${vmaMeasured()?`Résultat enregistré : <b>${state.logs.vma.d} m</b>, soit une VMA de <b>${kmh(vmaMeasured())} km/h</b>. Les fractionnés des 8, 15 et 22 décembre sont recalés dessus.`:`Entre la distance parcourue en 6' : ta VMA et tes allures sont calculées, et les fractionnés des 8, 15 et 22 décembre se recalent automatiquement.`}<div style="margin-top:10px"><button class="btn pri" data-gotest="vma">${vmaMeasured()?"Voir mes allures VMA":"Entrer mon résultat"}</button></div></div></div>`:""}
   ${logSummary(s)}
   <details class="sec fold"><summary>Pourquoi cette séance</summary><div>${s.why}</div></details>
   <details class="sec fold"><summary>Fatigue ou séance raccourcie</summary><div class="note warn">${s.tired}</div></details>
   ${(s.id==="w4c"||dn||cycleOf(s).lastMove<TODAY)?"":`<details class="sec fold"><summary>Déplacer la séance</summary><div class="note"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><input type="date" id="mvDate" value="${sdate(s)<TODAY?TODAY:sdate(s)}" min="${TODAY}" max="${cycleOf(s).lastMove}" style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:8px 10px;color:inherit"><button class="btn pri" data-move="${id}">Déplacer</button>${state.moves&&state.moves[id]?`<button class="btn" data-unmove="${id}">Date prévue (${fdate(s.date,{day:"numeric",month:"short"})})</button>`:""}</div><div class="mut" style="font-size:12.5px;margin-top:8px">Le calendrier (.ics) et les fichiers de la montre suivent la nouvelle date. Évite deux séances intenses de suite.</div></div></details>`}
   <details class="sec fold"${isTouch()&&!s.gpx?"":" open"}><summary>${s.gpx?"Sur ma montre · tracé GPX":"Sur ma montre"}</summary><div class="note">${isTouch()?`<div><b>À préparer depuis le Mac.</b> La Forerunner 55 se charge par câble : sur le Mac, ouvre cette séance, télécharge le fichier (ou le zip de la semaine dans Programme), puis copie-le dans <b>GARMIN/NewFiles</b>.</div>`:`<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="btn pri" data-fit="${id}">⌚ Télécharger la séance (.fit)</button><span class="mut" style="font-size:13px">Forerunner 55 · ${s.cy==="10k"?"allures":"cibles FC et allures"} et répétitions incluses</span></div>`}${s.gpx?`<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:10px"><a class="btn" href="${s.gpx.href}" download>🗺 ${s.gpx.label}</a><span class="mut" style="font-size:13px">${km(s.gpx.km)} km · à ouvrir sur le téléphone (Plans, Komoot…) · © contributeurs OpenStreetMap</span></div>`:""}${FIT_HELP}</div></details>
  </div>
  <div class="pact">${isTouch()?"":`<button class="btn" data-fit="${id}">⌚ Montre (.fit)</button>`}<button class="btn ${dn?"doneTag":"ok"}" data-finish="${id}">${dn?"✓ Réalisée · modifier":"✓ Terminer la séance"}</button></div>`;
  $("#ov").classList.add("on");document.body.style.overflow="hidden";
  if(!(o&&o.noPush)&&location.hash!=="#seance/"+id){navPush("#seance/"+id);sheetPushed=true;}
}
/* résumé de ce qui a été noté pour une séance */
function logSummary(s){
  const l=state.logs[s.id]||{},dn=!!state.done[s.id];
  if(l.skip&&!dn)return`<div class="sec"><div class="note">Marquée comme <b>non faite</b>. Pas de rattrapage : reprends le plan normalement. <button class="btn" style="margin-top:8px" data-unskip="${s.id}">Remettre à faire</button></div></div>`;
  if(!dn&&!l.dur&&!l.fc&&!l.rpe)return"";
  if(l.act)return actBlock(l.act,s)+(l.rpe||l.note?`<div class="sec"><div class="stats" style="margin-top:0">${l.rpe?`<div class="stat"><div class="l">Ressenti</div><div class="v">${l.rpe} / 10</div></div>`:""}${l.shoe&&(state.shoes||{})[l.shoe]?`<div class="stat"><div class="l">Chaussures</div><div class="v" style="font-size:14px">${escH(state.shoes[l.shoe].name)}</div></div>`:""}</div>${l.note?`<div class="mut" style="margin-top:8px;white-space:pre-line">${escH(l.note)}</div>`:""}</div>`:`<div class="sec"><div class="note warn">Ressenti à noter : touche « Réalisée · modifier » en bas.</div></div>`);
  const cap=efCap(s),fc=+l.fc,it=(k,v)=>v?`<div class="stat"><div class="l">${k}</div><div class="v">${v}</div></div>`:"";
  return`<div class="sec"><h4>${dn?"Réalisée":"Notée"}</h4><div class="stats" style="margin-top:0">${it("Durée",l.dur?clock(parseT(l.dur)).replace("'"," min ").replace(/ min 00$/," min"):"")}${it("Distance",l.dist?km(+l.dist)+" km":"")}${it("FC moy.",fc?fc+(cap?(fc<=cap?' <span style="color:#4ade80">✓</span>':' <span style="color:#f59e0b">⚠</span>'):""):"")}${it("Ressenti",l.rpe?l.rpe+" / 10":"")}</div>${l.note?`<div class="mut" style="margin-top:8px;white-space:pre-line">${escH(l.note)}</div>`:""}</div>`;
}
/* ---------- TERMINER LA SÉANCE ---------- */
let qsAt=0; // ouverture du panneau : un double toucher sur « Terminer » ne doit pas valider la séance
function openQS(id){
  const s=ALL.find(x=>x.id===id);if(!s)return;const l=state.logs[id]||{},dn=!!state.done[id],cap=efCap(s),test5=s.id==="h7b";
  const durV=l.dur||(test5?"":clock(s.t).replace("h",":").replace("'",":")),distV=l.dist?String(l.dist).replace(".",","):km(s.d);
  $("#qsBody").innerHTML=`<div class="grab"></div>
   <div class="eyebrow" style="color:#4ade80">${dn?"Modifier la séance":"Terminer la séance"} · ${relDay(sdate(s))}</div>
   <div class="qsTitle">${s.title}</div>
   <div class="qsGrid">
    <div class="fld"><label>${test5?"Chrono du 5 km (mm:ss)":"Durée (h:mm:ss)"}</label><input id="qDur" value="${durV}" ${test5?'placeholder="20:24"':""}></div>
    <div class="fld"><label>Distance (km)</label><input id="qDist" inputmode="decimal" value="${distV}"></div>
    <div class="fld"><label>FC moyenne${cap?` · plafond ${cap}`:""}</label><input id="qFc" inputmode="numeric" placeholder="bpm" value="${l.fc||""}"><div id="qFcHint" class="qHint"></div></div>
    ${s.vmaTest?`<div class="fld"><label>Distance en 6' (m)</label><input id="qVma" inputmode="numeric" placeholder="1550" value="${(state.logs.vma||{}).d||""}"></div>`:""}
   </div>
   <div class="qLab">Effort ressenti</div>
   <div class="rpe">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button class="btn ${String(l.rpe)===String(n)?"on":""}" data-rpe="${n}">${n}</button>`).join("")}</div>
   <div class="rpeLeg"><span>très facile</span><span>maximal</span></div>
   ${shoesList().some(x=>!x.ret)?`<div class="fld" style="margin-top:12px"><label class="qLab" style="margin:0 0 6px;display:block">Chaussures</label><select id="qShoe">${shoesList().filter(x=>!x.ret||x.id===l.shoe).map(x=>`<option value="${x.id}" ${(l.shoe||defShoe())===x.id?"selected":""}>${escH(x.name)}</option>`).join("")}<option value="none" ${l.shoe==="none"?"selected":""}>Aucune</option></select></div>`:""}
   <details class="qNote"${l.note?" open":""}><summary>Ajouter une note</summary><textarea id="qNote" rows="2" placeholder="Sensations, allures des blocs, météo…">${l.note||""}</textarea></details>
   <button class="btn ok qSave" data-qsave="${id}">${dn?"Mettre à jour":"Enregistrer"}</button>
   <div class="qFoot"><button class="btn" data-qsclose>Annuler</button>${dn?`<button class="btn" data-undo="${id}">Marquer comme non faite</button>`:""}</div>`;
  const fc=$("#qFc"),hint=()=>{const v=+fc.value;$("#qFcHint").innerHTML=!cap||!v?"":v<=cap?`<span style="color:#4ade80">✓ sous ${cap}</span>`:`<span style="color:#f59e0b">⚠ au-dessus de ${cap}</span>`;};
  fc.oninput=hint;hint();
  $("#qs").classList.add("on");document.body.style.overflow="hidden";qsAt=Date.now();
}
function closeQS(){$("#qs").classList.remove("on");if(!$("#ov").classList.contains("on"))document.body.style.overflow="";}
function saveQS(id){
  const s=ALL.find(x=>x.id===id),cap=efCap(s),old=state.logs[id]||{};
  const durV=$("#qDur").value.trim();
  if(durV&&!parseT(durV)){toast("Durée attendue au format 55:00 ou 1:04:00",3000);return;}
  const rb=document.querySelector("#qs [data-rpe].on"),fcV=$("#qFc").value.trim();
  if(s.vmaTest&&$("#qVma").value.trim()){const d=Math.round(+$("#qVma").value.replace(/\s/g,""));if(!(d>=1100&&d<=2200)){toast("Distance en 6' attendue entre 1100 et 2200 m",3000);return;}state.logs.vma={d:String(d),date:TODAY};applyVMA();}
  const shSel=$("#qShoe");state.logs[id]=Object.assign({},old,{dist:$("#qDist").value.replace(",",".").trim(),dur:durV,fc:fcV,rpe:rb?rb.dataset.rpe:(old.rpe||""),note:$("#qNote").value,shoe:shSel?shSel.value:(old.shoe||defShoe())});delete state.logs[id].skip;
  state.done[id]=true;save();refresh();if(s.vmaTest)renderPaces();closeQS();if($("#ov").classList.contains("on"))openS(id);
  const v=+fcV;toast(cap&&v?(v<=cap?`Séance validée 💪 · EF respectée (≤ ${cap})`:`Séance validée · FC au-dessus de ${cap} : ralentis la prochaine fois`):"Séance validée 💪",cap&&v?3500:2000);
}
function closeS(o){
  const was=$("#ov").classList.contains("on");$("#ov").classList.remove("on");document.body.style.overflow="";
  if(!was||(o&&o.noPush)||!location.hash.startsWith("#seance/"))return;
  if(sheetPushed){sheetPushed=false;popIgnore=true;history.back();}else{try{history.replaceState(null,"","#"+curView());}catch(e){}}
}

/* ---------- PACES ---------- */
const kmh=v=>v.toFixed(1).replace(".",",");
const V10=36000/2552; // vitesse du 10 km HOKA (42'32), km/h
function renderVMA(){
  const vm=vmaMeasured(),v=vm||VMA_EST,l=state.logs.vma||{};
  const rng=(lo,hi,d)=>{const a=vp(v,hi)*d/1000,b=vp(v,lo)*d/1000;return d===1000?fm(a)+" – "+fm(b):ft(a)+" – "+ft(b);};
  const rows=[["Seuil",85,88,"le plan garde 4'27 – 4'32, tiré de ton 10 km"],["VMA longue · 800 à 1200 m",93,97,"4 × 1200 m, pyramide"],["VMA · 400 m",98,101,"400 m de la pyramide"],["VMA courte · 200 m, 30-30",101.5,105,"30-30, 200 m"]];
  const p10=Math.round(V10/v*1000)/10;
  const coh=!vm?"":p10>93.5?`<div class="note warn" style="margin-top:12px"><b>Résultat à confirmer.</b> Ton 10 km aurait été couru à ${String(p10).replace(".",",")} % de cette VMA, au-dessus des 88 – 92 % habituels : le test a probablement sous-estimé ta VMA (départ trop rapide, fatigue, vent). Refais-le reposé avant de t'y fier ; en attendant, les séances sont recalées sur cette valeur.</div>`
    :p10<88?`<div class="note goal" style="--tc:#22c55e;margin-top:12px"><b>Ta vitesse est en avance sur ton endurance.</b> Ton 10 km n'utilise que ${String(p10).replace(".",",")} % de ta VMA (norme : 88 – 92 %). Ta marge de progression la plus rapide est au seuil et en sortie longue : c'est pour ça que les allures de seuil restent calées sur ton 10 km.</div>`
    :`<div class="note goal" style="--tc:#22c55e;margin-top:12px"><b>Résultat cohérent.</b> Ton 10 km correspond à ${String(p10).replace(".",",")} % de ta VMA, dans la norme de 88 à 92 %. Les deux mesures se confirment.</div>`;
  $("#vmaBox").innerHTML=`<h3>Test VMA : demi-Cooper ${vm?"":`<span class="cpTag" style="margin-left:6px">mar. 1er déc.</span>`}</h3>
   <p class="mut" style="margin-top:0">6' à la vitesse la plus élevée possible sur piste, de façon régulière. <b style="color:var(--text)">VMA (km/h) = distance (m) ÷ 100</b>. Protocole complet dans la séance du 1er décembre.</p>
   <div class="calcIn"><input id="vmaIn" inputmode="numeric" placeholder="1550" value="${l.d||""}" aria-label="Distance parcourue en 6 minutes, en mètres"><span class="mut" style="font-weight:600">m en 6'</span><button class="btn pri" id="vmaBtn">Calculer</button>${vm?`<button class="btn" id="vmaClr">Effacer</button>`:""}</div>
   <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:baseline;margin-top:16px"><div><div class="res">${vm?"":"≈ "}${kmh(v)} km/h</div><div class="mut" style="font-size:13px">${vm?"VMA mesurée":"VMA estimée sur ton 42'32, à confirmer par le test"} · ${fm(vp(v,100))}/km · 400 m en ${ft(vp(v,100)*.4)}</div></div></div>
   ${coh}
   <div class="tscroll" style="margin-top:14px"><table class="ztab"><tr><th>Zone</th><th>% VMA</th><th>Allure /km</th><th>400 m</th><th>200 m</th><th>Dans le plan</th></tr>${rows.map(([n,lo,hi,u])=>`<tr><td><b>${n}</b></td><td class="num" data-l="% VMA">${String(lo).replace(".",",")} – ${hi} %</td><td class="num" data-l="Allure /km"><b>${rng(lo,hi,1000)}</b></td><td class="num" data-l="400 m">${rng(lo,hi,400)}</td><td class="num" data-l="200 m">${rng(lo,hi,200)}</td><td class="mut wide">${u}</td></tr>`).join("")}</table></div>
   <p class="mut" style="font-size:12.5px;margin:10px 0 0">${vm?"Les fractionnés des 8, 15 et 22 décembre (4 × 1200 m, 30-30, pyramide) sont recalés sur cette VMA.":"Dès que tu entres ton résultat, les fractionnés des 8, 15 et 22 décembre (4 × 1200 m, 30-30, pyramide) se recalent dessus."} L'endurance fondamentale ne figure pas ici : elle reste pilotée à la FC (≤ 138 bpm), jamais à un pourcentage de VMA. Le seuil, l'allure 10 km et le test 5 km restent calés sur ton 42'32 : une allure tirée d'une vraie course est plus fiable qu'un pourcentage de VMA pour ces efforts longs.</p>`;
  $("#vmaBtn").onclick=()=>{const d=Math.round(+String($("#vmaIn").value).replace(/\s/g,"").replace(",","."));if(!(d>=1100&&d<=2200)){toast("Distance attendue entre 1100 et 2200 m");return;}state.logs.vma={d:String(d),date:TODAY};save();applyVMA();renderPaces();refresh();toast("VMA : "+kmh(d/100)+" km/h · séances recalées");};
  $("#vmaIn").onkeydown=e=>{if(e.key==="Enter")$("#vmaBtn").click();};
  if(vm)$("#vmaClr").onclick=()=>{if(!confirm("Effacer le résultat du test VMA ? Les séances reviennent aux allures estimées."))return;delete state.logs.vma;save();applyVMA();renderPaces();refresh();};
}
function renderPaces(){
  const h=!IS10();
  $("#pacesProse10k").style.display=h?"none":"";$("#pacesProseH").style.display=h?"":"none";$("#paces10k").style.display=h?"none":"";$("#vmaBox").style.display=h?"":"none";if(h)renderVMA();
  if(h){
    $("#pacesProseH").innerHTML=`<h3>La logique des intensités</h3><p><b>Le facile se pilote à la FC, le dur à l'allure.</b> Récupération, endurance fondamentale et parties faciles des sorties longues : <b>plafond de 138 bpm</b>, quelle que soit l'allure. Fractionnés, fartlek et seuil : à l'allure, car sur des efforts de quelques minutes la FC réagit trop lentement pour guider l'effort.</p>
    <p>Les allures de qualité sont recalculées sur ton 10 km du 15 novembre (<b>42'32, 4'15/km</b>) : seuil 4'27 – 4'32, allure 10 km 4'13 – 4'17, allure 5 km 4'02 – 4'07, VMA courte ${Z.VM.r}${vmaMeasured()?" (recalée sur ton test VMA)":""}.</p>
    <p>Les allures indiquées pour l'EF et la récupération ne servent qu'à <b>estimer les distances</b>. Si tu cours plus lentement que prévu sous 138 bpm, c'est normal, et c'est exactement le but.</p>
    <div class="kpi" style="margin-top:12px"><div class="lab">Tes zones Garmin (bpm)</div></div><div class="gzones">${GARMIN_ZONES.map(g=>`<div><span>${g[0]}</span><b>${g[1].replace(/ – /,"–")}</b></div>`).join("")}</div>`;
    $("#zoneTable").innerHTML=`<tr><th>Zone</th><th>FC</th><th>Zone Garmin</th><th>Allure</th><th>RPE</th><th>Sensation</th><th>Usage</th></tr>`+CY.zones.map(z=>`<tr><td><span style="display:inline-flex;gap:8px;align-items:center;font-weight:700"><i class="dot" style="background:${Z[z].c}"></i>${Z[z].n}</span></td><td class="num" data-l="FC">${Z[z].hr?`<b>${Z[z].fc}</b>`:Z[z].fc}</td><td class="mut" data-l="Zone Garmin">${Z[z].gz}</td><td class="num" data-l="Allure">${Z[z].hr?`<span class="mut">${Z[z].r}</span>`:`<b>${Z[z].r}</b>`}</td><td class="num" data-l="RPE">${Z[z].rpe}</td><td class="wide">${Z[z].feel}</td><td class="mut wide">${Z[z].use}</td></tr>`).join("");
    $("#zoneNote").innerHTML="En gras : la référence de chaque zone. FC pour la récupération, l'EF et l'endurance active ; allure pour le seuil et au-delà. Les FC de seuil et d'allure 10 km sont des repères observés sur ton 10 km (FC moyenne 180, max 189) et sur ton tempo d'octobre (4'35 à 178).";
  }else{
  $("#zoneNote").innerHTML="%FCmax indicatifs, seulement si tu connais ta vraie FCmax (pas la formule 220 − âge). Pour l'EF, le test de la conversation prime sur la montre. Sur les fractions de moins de 2 min, la FC n'a pas le temps de monter : fie-toi à l'allure.";
  $("#zoneTable").innerHTML=`<tr><th>Zone</th><th>Allure</th><th>%FCmax</th><th>RPE</th><th>Sensation</th><th>Usage</th></tr>`+["Z1","Z2","Z3","Z4","Z5","Z6"].map(z=>`<tr><td><span style="display:inline-flex;gap:8px;align-items:center;font-weight:700"><i class="dot" style="background:${Z[z].c}"></i>${Z[z].n}</span></td><td class="num" data-l="Allure">${zr(z)}</td><td class="num" data-l="%FCmax">${Z[z].fc}</td><td class="num" data-l="RPE">${Z[z].rpe}</td><td class="wide">${Z[z].feel}</td><td class="mut wide">${Z[z].use}</td></tr>`).join("");
  }
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
  const gh=[
  ["La structure de chaque semaine",`<p>Trois séances, trois rôles, au moins 48 h entre deux séances dures :</p><ul><li><b>Mardi : qualité</b>. Fractionné court ou long, fartlek, pyramides. Une séance différente chaque semaine.</li><li><b>Jeudi : EF</b>, toujours sous 138 bpm. Elle sert à récupérer du mardi et à préparer le dimanche.</li><li><b>Dimanche : sortie longue</b>, pure EF ou avec un travail inséré (seuil, progressif, alternance).</li></ul><p>S1 récupération, S2 à S4 montée progressive, S5 allégée (−25 %), S6 charge modérée, S7 bilan avec le test du 31 décembre.</p>`],
  ["Piloter l'EF à la fréquence cardiaque",`<ul><li><b>Plafond : 138 bpm.</b> Au-dessus, ralentis. Si ça ne suffit pas, marche 20 à 30 secondes : c'est normal, surtout en côte.</li><li><b>Les 10 premières minutes</b>, la FC monte lentement : reste sous 128 bpm pendant l'échauffement.</li><li><b>La dérive cardiaque</b> est normale en fin de sortie longue : ton allure va baisser pour la même FC. Ne la combats pas.</li><li><b>Chaleur, fatigue, stress, manque de sommeil</b> font monter la FC : ce jour-là, tu cours plus lentement, et c'est la bonne intensité.</li><li><b>Capteur au poignet</b> : par temps froid, il peut afficher des valeurs aberrantes au début. Serre le bracelet, et en cas de doute fie-toi au test de la conversation.</li><li><b>Pourquoi c'est crucial</b> : une EF courue en zone 3 devient une séance d'endurance active. Elle fatigue sans développer la base aérobie, et fait rater les séances de qualité.</li></ul>`],
  ["Sur la montre",`<ul><li>Les fichiers .fit contiennent une <b>cible de FC</b> pour l'échauffement, l'EF, la récupération et les sorties progressives : la montre vibre si tu dépasses le plafond.</li><li>Le <b>trot entre les fractions</b> et le retour au calme n'ont pas de cible : le cœur n'a pas le temps de redescendre, la montre sonnerait sans arrêt.</li><li>Fractionnés, fartlek et seuil gardent une <b>cible d'allure</b>. Sur piste, fais des tours manuels.</li><li>Les lignes droites n'ont pas de cible : sur 80 m, le GPS n'est pas fiable.</li></ul>`],
  ["Séance manquée, fêtes, imprévus",`<ul><li><b>Mardi manqué</b> : décale-le au mercredi. Le jeudi devient 30' d'EF, le dimanche reste inchangé.</li><li><b>Jeudi manqué</b> : ne le rattrape pas.</li><li><b>Dimanche manqué</b> : fais-le le lundi, en EF pure si le mardi suit.</li><li><b>Pendant les fêtes</b>, déplace les séances librement dans la semaine, avec 48 h entre deux séances dures.</li><li><b>Plus de 5 jours d'arrêt</b> : reprends par 2 EF, puis la séance prévue avec un tiers de répétitions en moins.</li><li><b>Jamais deux séances dures deux jours de suite.</b></li></ul>`],
  ["Fatigue et mollet : les signaux",`<div class="tscroll"><table><tr><th>Signal</th><th>Réponse</th></tr><tr><td>FC au-dessus de 138 à une allure qui passait sous 138 les semaines précédentes</td><td>Fatigue accumulée : la qualité suivante perd 1/3 des répétitions</td></tr><tr><td>FC au repos +7 bpm, échauffement pénible</td><td>Remplace la qualité par 30' d'EF</td></tr><tr><td>Mollet qui tire (≥ 3/10) ou douleur qui augmente en courant</td><td>Arrête. 2 à 3 jours sans courir, kiné si ça persiste</td></tr><tr><td>Rhume léger (au-dessus du cou)</td><td>EF possible, pas de qualité</td></tr><tr><td>Fièvre, poitrine, courbatures générales</td><td>Repos complet</td></tr></table></div><p style="margin-top:10px"><b>Mollet</b> : ne modifie pas ta foulée d'un coup, c'est ce qui l'a irrité le 1er novembre. Pour la cadence, vise 175 à 180 pas/min sur les lignes droites, sans forcer.</p>`],
  ["Les 3 points de contrôle",`<ul><li><b>CP1 · dim. 29 nov. · Seuil 3 × 6'</b> : le seuil est-il intact après la course ? FC de fin du 3e bloc sous 178.</li><li><b>CP2 · dim. 13 déc. · 3 × 2000 m au seuil</b> : allure constante, dérive de 5 bpm maximum.</li><li><b>CP3 · jeu. 31 déc. · Test 5 km</b> : 20'15 ou moins = progression, jusqu'à 20'45 = niveau maintenu.</li></ul><p>Entre le chrono du test dans le champ « durée » de la séance : le tableau de bord affiche le verdict.</p>`],
  ["Renforcement (conseillé)",`<p>2 × 15' par semaine, après la séance du jeudi et celle du dimanche :</p><ul><li><b>Mollets</b> : montées sur pointes de pied, descente lente sur 3 secondes, 3 × 12 par jambe (sur une marche).</li><li><b>Gainage</b> : planche face et côtés, 3 × 30 à 45".</li><li><b>Fentes avant</b> : 3 × 10 par jambe.</li><li><b>Pont fessier</b> sur une jambe : 3 × 10.</li></ul><p class="mut">Le renforcement des mollets est la meilleure prévention contre une récidive.</p>`]
  ];
  $("#guideGrid").innerHTML=(IS10()?g:gh).map(x=>`<div class="card prose"><h3>${x[0]}</h3>${x[1]}</div>`).join("");
}

/* ---------- EVENTS ---------- */
const VIEWS=["dash","plan","paces","race","analysis","guide"];
const curView=()=>{const v=document.querySelector(".view.on");return v?v.id.slice(2):"dash";};
let popIgnore=false,pendingHash=null,sheetPushed=false;
function navPush(h){if(location.hash===h)return;if(popIgnore){pendingHash=h;return;}try{history.pushState(null,"",h);}catch(e){}}
function show(tab,o){
  if(tab==="race"&&!IS10())tab="dash";
  setTimeout(()=>{if(tab==="race")fitBand();if(tab==="analysis"){renderActs();if(typeof initAnalysis==="function")initAnalysis();else addEventListener("load",()=>initAnalysis(),{once:true});}},0);
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("on",b.dataset.tab===tab));
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("on",v.id==="v-"+tab));
  document.querySelectorAll("#bnav [data-bn]").forEach(b=>b.classList.toggle("on",b.dataset.bn===(["dash","plan","analysis"].includes(tab)?tab:"more")));
  window.scrollTo(0,0);
  if(!(o&&o.noPush))navPush("#"+tab);
}
function route(){
  const [a,b]=location.hash.slice(1).split("/");
  if($("#qs").classList.contains("on"))closeQS();if($("#more").classList.contains("on"))closeMore();
  if(a==="seance"&&b){const s=ALL.find(x=>x.id===b);if(s){if(s.cy!==CY.id)setCycle(s.cy);openS(b,{noPush:true});sheetPushed=false;return;}}
  if($("#ov").classList.contains("on"))closeS({noPush:true});
  const v=VIEWS.includes(a)?a:"dash";if(v!==curView())show(v,{noPush:true});
}
window.addEventListener("popstate",()=>{if(popIgnore){popIgnore=false;if(pendingHash){const h=pendingHash;pendingHash=null;if(h!==location.hash)try{history.pushState(null,"",h);}catch(e){}}return;}route();});
const narrow=()=>matchMedia("(max-width:700px)").matches;
function openMore(){
  const def=defaultCycle(),it=(attr,ic,l,s)=>`<button class="moreIt" ${attr}><span class="mIc">${ic}</span><span style="flex:1;text-align:left"><b>${l}</b>${s?`<span class="mut">${s}</span>`:""}</span><span class="mut">›</span></button>`;
  $("#moreBody").innerHTML=`<div class="grab"></div>
   ${narrow()?it('data-tab="paces"',"⏱","Allures & test","zones FC, VMA, allures")+it('data-tab="guide"',"📖","Guide","piloter l'EF, montre, imprévus"):""}
   ${IS10()?it('data-tab="race"',"🏁","Course","plan de passage, bracelet"):""}
   ${CYCLES.filter(c=>c!==CY).map(c=>it(`data-cycle="${c.id}"`,"🗂",c===def?"Revenir à "+c.name:"Voir l'archive "+c.name,c.full)).join("")}
   ${it("data-shoes","👟","Chaussures","kilométrage de tes paires")}
   ${it("data-gofoot","🔄","Synchro et sauvegarde","appareils, export, import")}
   ${narrow()?"":`<div class="mut" style="font-size:12.5px;margin:6px 2px 0">${KEYS_HELP}</div>`}
   <button class="btn" style="width:100%;margin-top:10px" data-moreclose>Fermer</button>`;
  $("#more").classList.add("on");document.body.style.overflow="hidden";
}
function closeMore(){$("#more").classList.remove("on");if(!$("#ov").classList.contains("on")&&!$("#qs").classList.contains("on"))document.body.style.overflow="";}
matchMedia("(min-width:1100px)").addEventListener("change",()=>{if(curView()==="analysis")renderActs();});
function refresh(){applyVMA();renderDash();renderPlan();if(curView()==="analysis")renderActs();}
document.addEventListener("click",e=>{
  const el=e.target.closest("[data-actsel],[data-act],[data-impgo],[data-shoe],[data-shoes],[data-actdel],[data-skip],[data-unskip],[data-pmode],[data-bn],[data-moreclose],[data-gofoot],[data-finish],[data-watch],[data-qsclose],[data-qsave],[data-rpe],[data-undo],[data-tab],[data-cycle],[data-week],[data-wnav],[data-open],[data-close],[data-toggle],[data-savelog],[data-gotest],[data-bandtheme],[data-move],[data-unmove],[data-big],[data-bigclose],[data-print],[data-usetgt],[data-sync],[data-fit],[data-zipfit],[data-ics],[data-bkexp],[data-bkimp],[data-bkpaste]");
  if(e.target===$("#ov")){closeS();return;}
  if(e.target===$("#qs")){closeQS();return;}
  if(e.target===$("#more")){closeMore();return;}
  if(el&&el.closest("#more")&&!el.matches("[data-gofoot],[data-shoe],[data-impgo],[data-shoes]"))closeMore();
  if(!el)return;
  if(el.closest("#qs")&&Date.now()-qsAt<600)return;
  if(el.dataset.act){openAct(el.dataset.act);return;}
  if(el.dataset.actsel){actSel=el.dataset.actsel;document.querySelectorAll("#actsRoot .wlRow").forEach(x=>x.classList.toggle("sel",x.dataset.actsel===actSel));$("#actPane").innerHTML=actPane(actSel);$("#actPane").scrollTop=0;return;}
  if(el.hasAttribute("data-impgo")){importGo();return;}
  if(el.dataset.shoe){shoeAction(el.dataset.shoe);return;}
  if(el.hasAttribute("data-shoes")){setTimeout(openShoes,0);return;}
  if(el.dataset.actdel){if(confirm("Supprimer cette sortie importée ?")){delete state.logs[el.dataset.actdel];if(actSel===el.dataset.actdel)actSel=null;save();closeS();refresh();renderActs();}return;}
  if(el.dataset.skip){const id=el.dataset.skip;state.logs[id]=Object.assign({},state.logs[id]||{},{skip:true});save();refresh();toast("Pas de rattrapage : reprends le plan normalement, sans doubler la séance suivante.",4200);return;}
  if(el.dataset.unskip){const id=el.dataset.unskip;if(state.logs[id])delete state.logs[id].skip;save();refresh();openS(id);return;}
  if(el.dataset.pmode){planMode=el.dataset.pmode;try{sessionStorage.setItem("prepa10kPlanMode",planMode);}catch(e){}renderPlan();return;}
  if(el.dataset.bn){if(el.dataset.bn==="more")openMore();else show(el.dataset.bn);return;}
  if(el.hasAttribute("data-moreclose"))return;
  if(el.hasAttribute("data-gofoot")){closeMore();$("footer").scrollIntoView({behavior:"smooth"});return;}
  if(el.dataset.finish){openQS(el.dataset.finish);}
  else if(el.dataset.watch){if(isTouch())toast("Fichier montre : à télécharger depuis le Mac, puis à copier dans GARMIN/NewFiles",4200);else exportFit(el.dataset.watch);}
  else if(el.hasAttribute("data-qsclose")){closeQS();}
  else if(el.dataset.rpe){document.querySelectorAll("#qs [data-rpe]").forEach(b=>b.classList.toggle("on",b===el));}
  else if(el.dataset.qsave){saveQS(el.dataset.qsave);}
  else if(el.dataset.undo){const id=el.dataset.undo;delete state.done[id];save();refresh();closeQS();if($("#ov").classList.contains("on"))openS(id);toast("Séance remise à faire");}
  else if(el.dataset.tab){show(el.dataset.tab);}
  else if(el.dataset.week){week=+el.dataset.week;renderPlan();show("plan");}
  else if(el.dataset.wnav){week=Math.min(PL().length,Math.max(1,week+ +el.dataset.wnav));renderPlan();}
  else if(el.dataset.cycle){setCycle(el.dataset.cycle);}
  else if(el.dataset.open){openS(el.dataset.open);}
  else if(el.hasAttribute("data-close")){closeS();}
  else if(el.dataset.toggle){const id=el.dataset.toggle;state.done[id]=!state.done[id];if(!state.done[id])delete state.done[id];save();refresh();openS(id);toast(state.done[id]?"Séance validée 💪":"Séance décochée");}
  else if(el.dataset.savelog){const id=el.dataset.savelog,r=$("#lRpe");const was=!!state.done[id];state.logs[id]={dist:$("#lDist").value.replace(",",".").trim(),dur:$("#lDur").value.trim(),fc:$("#lFc").value.trim(),rpe:(r.dataset.touched||(state.logs[id]&&state.logs[id].rpe))?r.value:"",note:$("#lNote").value};state.done[id]=true;save();refresh();openS(id);toast(was?"Ressenti mis à jour":"Séance validée 💪");}
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
  else if(el.hasAttribute("data-gotest")){const vm=el.dataset.gotest==="vma";closeS();if(vm&&IS10())setCycle("hiver");show("paces");setTimeout(()=>{const f=$(vm?"#vmaIn":"#t5");f.scrollIntoView({block:"center"});f.focus();},300);}
});
/* glisser-déposer dans le calendrier (ordinateur) */
document.addEventListener("dragstart",e=>{const d=e.target.closest&&e.target.closest("[data-drag]");if(d){e.dataTransfer.setData("text/plain",d.dataset.drag);e.dataTransfer.effectAllowed="move";}});
document.addEventListener("dragover",e=>{const c=e.target.closest&&e.target.closest("[data-cday]");if(c){e.preventDefault();document.querySelectorAll(".calD.over").forEach(x=>x!==c&&x.classList.remove("over"));c.classList.add("over");}});
document.addEventListener("drop",e=>{const c=e.target.closest&&e.target.closest("[data-cday]");document.querySelectorAll(".calD.over").forEach(x=>x.classList.remove("over"));if(!c)return;e.preventDefault();const id=e.dataTransfer.getData("text/plain");if(id)moveSession(id,c.dataset.cday,true);});
document.addEventListener("change",e=>{const c=e.target.closest("[data-check]");if(!c)return;const id=c.dataset.check;if(c.checked)state.done[id]=true;else delete state.done[id];save();refresh();toast(c.checked?"Séance validée 💪":"Séance décochée");});
/* Analyse sur ordinateur : sommaire latéral construit à partir de la barre de navigation de l'analyse */
function buildAnaSide(){
  const side=$("#anaSide"),nav=$("#ananav");if(!side)return;
  if(!nav){side.innerHTML="";return;}
  side.innerHTML=`<div class="sideHd">Sections</div>`+[...nav.querySelectorAll("a")].map(a=>`<a href="#" data-nav="${a.dataset.nav}">${a.textContent}</a>`).join("");
  sideActive();
}
function sideActive(){
  const side=$("#anaSide");if(!side||!side.children.length||curView()!=="analysis")return;
  const off=(document.querySelector(".top").offsetHeight||0)+90;let cur=null;
  side.querySelectorAll("a").forEach(a=>{const e=document.getElementById(a.dataset.nav);if(e&&e.getBoundingClientRect().top<=off)cur=a;});
  side.querySelectorAll("a").forEach(a=>a.classList.toggle("on",a===(cur||side.querySelector("a"))));
}
new MutationObserver(buildAnaSide).observe($("#anaRoot"),{childList:true});
window.addEventListener("scroll",sideActive,{passive:true});
/* raccourcis clavier (ordinateur) */
const KEYS_HELP="Raccourcis : 1 Aujourd'hui · 2 Plan · 3 Analyse · 4 Allures · ← → semaine · T terminer la séance · M menu Plus · Échap fermer";
document.addEventListener("keydown",e=>{
  if(e.metaKey||e.ctrlKey||e.altKey||e.defaultPrevented)return;
  const tg=(e.target&&e.target.tagName)||"";if(/^(INPUT|TEXTAREA|SELECT)$/.test(tg)||(e.target&&e.target.isContentEditable))return;
  const modal=$("#ov").classList.contains("on")||$("#qs").classList.contains("on")||$("#more").classList.contains("on")||$("#bigOv").classList.contains("on");
  if(modal)return;
  const k=e.key;
  if(k==="1"){show("dash");}else if(k==="2"){show("plan");}else if(k==="3"){show("analysis");}else if(k==="4"){show("paces");}
  else if((k==="ArrowLeft"||k==="ArrowRight")&&curView()==="plan"&&planMode==="week"){week=Math.min(PL().length,Math.max(1,week+(k==="ArrowRight"?1:-1)));renderPlan();}
  else if(k==="t"||k==="T"){const b=document.querySelector("#today .todayCard [data-finish]");if(b)openQS(b.dataset.finish);else return;}
  else if(k==="m"||k==="M"){openMore();}
  else if(k==="?"){toast(KEYS_HELP,5000);}
  else return;
  e.preventDefault();
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if($("#more").classList.contains("on"))closeMore();else if($("#qs").classList.contains("on"))closeQS();else{closeS();bigClose();}}});
window.addEventListener("afterprint",()=>document.body.classList.remove("printband"));
$("#calcBtn").onclick=()=>{const v=$("#t5").value;if(!parseT(v)||parseT(v)<900||parseT(v)>2400){toast("Format attendu : 20:45");return;}state.test=v;save();renderPaces();renderDash();toast("Allure de course mise à jour");};
$("#t5").addEventListener("keydown",e=>{if(e.key==="Enter")$("#calcBtn").click();});
$("#calcClr").onclick=()=>{state.test="";$("#t5").value="";save();renderPaces();renderDash();};
$("#tgtBtn").onclick=()=>setTarget($("#tgt").value);
$("#tgt2Btn").onclick=()=>setTarget($("#tgt2").value);
$("#tgt2").addEventListener("keydown",e=>{if(e.key==="Enter")$("#tgt2Btn").click();});
$("#tgt").addEventListener("keydown",e=>{if(e.key==="Enter")$("#tgtBtn").click();});
$("#resetBtn").onclick=()=>{if(confirm(syncCode()?"Effacer toutes les séances cochées, ressentis et le test, sur tous tes appareils synchronisés ?":"Effacer toutes les séances cochées, ressentis et le test ?")){state={done:{},logs:{},test:"",week:null,target:"43:00",moves:{},journal:{}};save();week=curWeek();renderPaces();refresh();toast("Suivi réinitialisé");}};

$("#fitHelpPlan").innerHTML=FIT_HELP;
$("#bkFile").addEventListener("change",e=>{const f=e.target.files[0];if(!f)return;f.text().then(importBackup);e.target.value="";});
/* Mise à jour automatique : l'app vérifie s'il existe une nouvelle version à chaque retour au premier plan
   (iPhone : l'app de l'écran d'accueil reste souvent en mémoire sans se recharger), puis se recharge d'elle-même
   dès que la nouvelle version a pris la main, sauf si une fiche ou un champ est en cours d'utilisation. */
if("serviceWorker" in navigator&&location.protocol.startsWith("http")){
  const hadCtrl=!!navigator.serviceWorker.controller;let reloading=false;
  navigator.serviceWorker.register("sw.js").then(reg=>{
    const check=()=>reg.update().catch(()=>{});
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")check();});
    setInterval(check,30*60*1000);
  }).catch(()=>{});
  navigator.serviceWorker.addEventListener("controllerchange",()=>{
    if(!hadCtrl||reloading)return;reloading=true;
    const busy=()=>$("#ov").classList.contains("on")||$("#bigOv").classList.contains("on")||/^(INPUT|TEXTAREA)$/.test((document.activeElement||{}).tagName||"");
    const go=()=>{if(busy()){setTimeout(go,2000);return;}location.reload();};
    go();
  });
}
/* typographie : ne jamais couper « 138 bpm », « ≤ 138 », « 4'27 – 4'32 » ou « 3 × 6' » en fin de ligne */
const NB=" ";
function nbspText(t){return t
  .replace(/(\d['’"]?) (?=(?:bpm|km|min|m|s|h|%|jours?|semaines?|séances?)(?![\p{L}]))/gu,"$1"+NB)
  .replace(/(\d['’"]?) ([×–\-]) (?=\d)/g,"$1"+NB+"$2"+NB)
  .replace(/([≤≥≈×~]) (?=\d)/g,"$1"+NB);}
function nbspTree(root){
  if(root.nodeType===3){const v=nbspText(root.data);if(v!==root.data)root.data=v;return;}
  if(root.nodeType!==1||/^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(root.nodeName))return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentNode&&/^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode.nodeName)?2:1});
  for(let n=w.nextNode();n;n=w.nextNode()){const v=nbspText(n.data);if(v!==n.data)n.data=v;}}
new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(nbspTree))).observe(document.body,{childList:true,subtree:true});

applyVMA();renderCycBar();renderDash();renderPlan();renderPaces();renderGuide();
if(location.hash.length>1)route();else try{history.replaceState(null,"","#dash");}catch(e){}
nbspTree(document.body);
syncInit();
