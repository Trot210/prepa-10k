/* ---------- ANALYSE DE COURSE : calculs (aucune donnée inventée) ---------- */
/* Tout est calculé à partir de la trace GPX : temps, position, altitude, FC, cadence si présentes. */

const RACE={
  name:"10 km HOKA Paris Centre",date:"2026-11-15",
  official:2552,        // temps officiel 42:32 (résultat fourni)
  objective:2580,       // objectif du plan : 43:00
  previous:2786,        // dernier 10 km avant la prépa : 46:26
  distance:10000,
  gpx:"data/10k-hoka-2026.gpx"
};

function parseGpx(text){
  const pts=[],re=/<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/g;let m;
  while((m=re.exec(text))){
    const a=m[1],b=m[2],la=a.match(/lat="([^"]+)"/),lo=a.match(/lon="([^"]+)"/),tm=b.match(/<time>([^<]+)<\/time>/);
    if(!la||!lo||!tm)continue;
    const el=b.match(/<ele>([^<]+)<\/ele>/),hr=b.match(/<(?:\w+:)?hr>(\d+)</),cad=b.match(/<(?:\w+:)?cad>(\d+)</);
    const t=Date.parse(tm[1])/1000;if(isNaN(t))continue;
    pts.push({lat:+la[1],lon:+lo[1],t,ele:el?+el[1]:null,hr:hr?+hr[1]:null,cad:cad?+cad[1]:null});
  }
  return pts;
}

const haversine=(a,b)=>{
  const R=6371008.8,p1=a.lat*Math.PI/180,p2=b.lat*Math.PI/180,dl=(b.lon-a.lon)*Math.PI/180,dp=p2-p1;
  return 2*R*Math.asin(Math.sqrt(Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2));
};
/* interpolation linéaire de ys en x, xs croissant */
function lerp(xs,ys,x){
  const n=xs.length;if(x<=xs[0])return ys[0];if(x>=xs[n-1])return ys[n-1];
  let lo=0,hi=n-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(xs[mid]<=x)lo=mid;else hi=mid;}
  const f=(x-xs[lo])/((xs[hi]-xs[lo])||1);return ys[lo]+f*(ys[hi]-ys[lo]);
}
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const median=a=>{if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const pstdev=a=>{if(a.length<2)return 0;const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)));};
const quantile=(a,q)=>{const s=a.slice().sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.max(0,Math.round(q*(s.length-1))))];};

/* dénivelé positif/négatif avec lissage et seuil (évite de cumuler le bruit de l'altitude) */
function elevGainLoss(e,thr){
  thr=thr||1.5;if(e.length<2)return{gain:0,loss:0};
  const s=e.map((_,i)=>mean(e.slice(Math.max(0,i-1),i+2)));let up=0,dn=0,ref=s[0];
  s.forEach(v=>{if(v-ref>=thr){up+=v-ref;ref=v;}else if(ref-v>=thr){dn+=ref-v;ref=v;}});
  return{gain:up,loss:dn};
}

const ZONE_BOUNDS=[0.6,0.7,0.8,0.9];   // zones 1 à 5, en % de la FC max

/**
 * raw : points du GPX. opt : {official, objective, distance, align, fcmax}
 * Si align est vrai et que la trace dure plus que le temps officiel, l'excédent est retiré AU DÉBUT
 * (le chrono officiel démarre à la ligne, pas au coup de pistolet). C'est une hypothèse, signalée dans l'interface.
 */
function analyzeRun(raw,opt){
  opt=Object.assign({official:null,objective:null,distance:null,align:true,fcmax:null,plan:null},opt||{});
  if(!raw||raw.length<10)return null;
  const t0=raw[0].t,T=raw.map(p=>p.t-t0),D=[0];
  for(let i=1;i<raw.length;i++)D.push(D[i-1]+haversine(raw[i-1],raw[i]));
  const total=T[T.length-1];
  const trimmed=opt.align&&opt.official&&total>opt.official+5?total-opt.official:0;
  const tS=trimmed,tE=total,dS=lerp(T,D,tS),rawDist=lerp(T,D,tE)-dS;
  const scaled=!!(opt.align&&opt.distance&&trimmed&&Math.abs(opt.distance/rawDist-1)<0.03);
  const sc=scaled?opt.distance/rawDist:1,dist=rawDist*sc;
  const dAt=t=>(lerp(T,D,Math.min(tE,Math.max(tS,t)))-dS)*sc;                 // distance (m) depuis le début de fenêtre
  const tAtD=x=>{const target=x/sc+dS;return lerp(D,T,Math.min(D[D.length-1],Math.max(0,target)));}; // temps (s de trace) à la distance x
  const hasHr=raw.some(p=>p.hr!=null),hasCad=raw.some(p=>p.cad!=null),hasEle=raw.some(p=>p.ele!=null);
  const series=k=>raw.map(p=>p[k]);
  const hrS=hasHr?series("hr"):null,cadS=hasCad?series("cad"):null,eleS=hasEle?series("ele"):null,latS=series("lat"),lonS=series("lon");
  // grille régulière de 5 s
  const STEP=5,g={t:[],d:[],pace:[],hr:[],cad:[],ele:[],lat:[],lon:[]};
  const nG=Math.floor((tE-tS)/STEP);
  for(let k=0;k<=nG;k++){
    const t=k===nG?tE:tS+k*STEP;
    g.t.push(t-tS);g.d.push(dAt(t));
    g.hr.push(hasHr?lerp(T,hrS,t):null);g.cad.push(hasCad?lerp(T,cadS,t):null);g.ele.push(hasEle?lerp(T,eleS,t):null);
    g.lat.push(lerp(T,latS,t));g.lon.push(lerp(T,lonS,t));
    const a=Math.max(tS,t-20),b=Math.min(tE,t+20),v=(dAt(b)-dAt(a))/((b-a)||1);
    g.pace.push(v>0.8?1000/v:null);
  }
  if(g.d[g.d.length-1]<dist-0.5){g.t.push(tE-tS);g.d.push(dist);}
  const cadFactor=hasCad&&median(cadS)<125?2:1;
  // splits kilométriques
  const splits=[],nFull=Math.floor(dist/1000+1e-9),rest=dist-nFull*1000;
  const edges=[];for(let i=0;i<=nFull;i++)edges.push(i*1000);if(rest>=100)edges.push(dist);
  const rawHr=(a,b)=>{const o=[];for(let i=0;i<raw.length;i++)if(T[i]>=a&&T[i]<=b&&raw[i].hr!=null)o.push(raw[i].hr);return o;};
  const inRange=(arr,a,b)=>{const out=[];for(let i=0;i<g.t.length;i++){const t=g.t[i]+tS;if(t>=a&&t<=b&&arr[i]!=null)out.push(arr[i]);}return out;};
  for(let i=1;i<edges.length;i++){
    const ta=tAtD(edges[i-1]),tb=tAtD(edges[i]),len=edges[i]-edges[i-1],time=tb-ta;
    const hrs=hasHr?inRange(g.hr,ta,tb):[],cads=hasCad?inRange(g.cad,ta,tb):[];
    const es=hasEle?inRange(g.ele,ta,tb):[],gl=es.length>1?elevGainLoss(es,1):{gain:0,loss:0};
    splits.push({km:i,len,t0:ta-tS,t1:tb-tS,time,pace:time/len*1000,hr:hrs.length?mean(hrs):null,hrMax:hrs.length?Math.max(...rawHr(ta,tb)):null,
      cad:cads.length?mean(cads)*cadFactor:null,gain:gl.gain,loss:gl.loss,full:len>=999});
  }
  const fullSp=splits.filter(s=>s.full),pacesKm=fullSp.map(s=>s.pace);
  // moitiés (en distance)
  const half=dist/2,tHalf=tAtD(half)-tS,time=tE-tS;
  const h1=tHalf,h2=time-tHalf;
  // fréquence cardiaque, zones, découplage
  let hr=null;
  if(hasHr){
    const hs=g.hr.filter(x=>x!=null),rh=rawHr(tS,tE),maxObs=Math.max(...rh),fcmax=opt.fcmax||maxObs,zt=[0,0,0,0,0];
    hs.forEach(h=>{const r=h/fcmax;let z=0;while(z<4&&r>=ZONE_BOUNDS[z])z++;zt[z]+=STEP;});
    const tot=zt.reduce((a,b)=>a+b,0),hA=[],hB=[];
    g.hr.forEach((h,i)=>{if(h==null)return;(g.t[i]<=tHalf?hA:hB).push(h);});
    const ef1=(half/h1)/mean(hA),ef2=((dist-half)/h2)/mean(hB);
    hr={avg:mean(hs),max:maxObs,min:Math.min(...rh),fcmax,fcmaxObserved:!opt.fcmax,zones:zt.map(s=>({s,pct:s/tot})),
        avgFirst:mean(hA),avgSecond:mean(hB),decoupling:(ef1-ef2)/ef1*100,pctMax:mean(hs)/fcmax*100};
  }
  // meilleurs passages (fenêtre glissante en distance)
  const bests=[];
  [1000,2000,5000].forEach(L=>{
    if(dist<L+50)return;let best=null;
    for(let x=0;x<=dist-L;x+=10){const dt=tAtD(x+L)-tAtD(x);if(!best||dt<best.time)best={L,time:dt,from:x,to:x+L};}
    if(best){best.pace=best.time/L*1000;bests.push(best);}
  });
  // dénivelé
  const ele=hasEle?(()=>{const es=g.ele.filter(x=>x!=null),gl=elevGainLoss(es),sm=es;return{...gl,min:Math.min(...sm),max:Math.max(...sm)};})():null;
  const cad=hasCad?{avg:mean(inRange(g.cad,tS,tE))*cadFactor,factor:cadFactor}:null;
  // comparaison au plan (stratégie du site : km 1 à +2 s, km 9 à −1 s, km 10 à −3 s)
  let plan=null;
  if(opt.objective&&Math.abs(dist-10000)<50&&fullSp.length===10){
    const p=(opt.objective+2)/10,pl=fullSp.map((_,i)=>i===0?p+2:i===8?p-1:i===9?p-3:p);let cp=0,ca=0;
    plan=fullSp.map((s,i)=>{cp+=pl[i];ca+=s.time;return{km:s.km,plan:pl[i],delta:s.time-pl[i],cumDelta:ca-cp};});
  }
  return{
    points:raw.length,trimmed,scaled,rawDist,dist,time,total,fullDist:D[D.length-1],
    timeOfficial:opt.official&&trimmed?opt.official:time,
    avgPace:time/dist*1000,splits,fullSplits:fullSp,
    split:{first:h1,second:h2,diff:Math.round(h2)-Math.round(h1),pct:(Math.round(h2)-Math.round(h1))/time*100},
    variability:{sd:pstdev(pacesKm),range:pacesKm.length?Math.max(...pacesKm)-Math.min(...pacesKm):0,fast:fullSp.length?fullSp.reduce((a,b)=>b.pace<a.pace?b:a):null,slow:fullSp.length?fullSp.reduce((a,b)=>b.pace>a.pace?b:a):null},
    hr,cad,ele,bests,plan,grid:g,hasHr,hasCad,hasEle,objective:opt.objective
  };
}

/* ---------- bilan rédigé à partir des mesures (chaque phrase s'appuie sur un chiffre calculé) ---------- */
function buildReport(a,ctx){
  const P=ctx.pace,C=ctx.clock,K=ctx.km,out={resume:"",forts:[],faibles:[],effort:[],axes:[]};
  const sd=a.variability.sd,sp=a.fullSplits,first=sp[0],last=sp[sp.length-1];
  const T0=ctx.official||a.time,timeTxt=C(T0);
  const diffObj=a.objective?a.objective-T0:null;
  out.resume=`${timeTxt} à ${P(a.avgPace)}/km`+(diffObj!=null?(diffObj>=0?` : objectif de ${C(a.objective)} atteint avec ${Math.round(diffObj)} s d'avance.`:` : objectif de ${C(a.objective)} manqué de ${Math.round(-diffObj)} s.`):".");
  if(diffObj!=null&&diffObj>=0)out.forts.push(`Objectif battu de ${Math.round(diffObj)} s (${P(a.avgPace)}/km au lieu de ${P(a.objective/10)}/km visés).`);
  if(ctx.previous&&T0<ctx.previous+1)out.forts.push(`${C(ctx.previous-T0)} de moins que ton dernier 10 km (${C(ctx.previous)}), soit −${((ctx.previous-T0)/ctx.previous*100).toFixed(1).replace(".",",")} %.`);
  if(sp.length>=5){
    const cls=sd<=4?"très régulière":sd<=8?"régulière":"irrégulière";
    (sd<=8?out.forts:out.faibles).push(`Allure ${cls} : écart-type de ${sd.toFixed(1).replace(".",",")} s/km entre les kilomètres, de ${P(a.variability.fast.pace)} (km ${a.variability.fast.km}) à ${P(a.variability.slow.pace)} (km ${a.variability.slow.km}).`);
    const s=a.split;out.forts.push(Math.abs(s.pct)<=1?`Course presque parfaitement équilibrée : 1re moitié ${C(s.first)}, 2e moitié ${C(s.second)} (${s.diff>=0?"+":"−"}${Math.abs(Math.round(s.diff))} s).`:(s.diff<0?`Split négatif : la 2e moitié est ${Math.round(-s.diff)} s plus rapide.`:`Split positif de ${Math.round(s.diff)} s (${s.pct.toFixed(1).replace(".",",")} %).`));
    if(last.pace<=a.variability.fast.pace+2)out.forts.push(`Finale forte : le km ${last.km} (${P(last.pace)}) est parmi les plus rapides de la course.`);
  }
  if(a.plan){
    const d1=a.plan[0].delta;
    if(d1<-3)out.faibles.push(`Départ plus rapide que prévu : km 1 en ${P(first.pace)}, ${Math.round(-d1)} s sous le plan (qui prévoyait ${P(a.plan[0].plan)}). L'allure est restée stable ensuite, mais c'est le point de vigilance classique du 10 km.`);
    else if(d1>3)out.faibles.push(`Départ plus lent que prévu : km 1 en ${P(first.pace)}, ${Math.round(d1)} s au-dessus du plan.`);
    else out.forts.push(`Départ conforme au plan : km 1 en ${P(first.pace)} (plan : ${P(a.plan[0].plan)}).`);
  }
  const slow=a.variability.slow;
  if(slow&&sp.length>=5&&slow.pace-a.avgPace>=4)out.faibles.push(`Km ${slow.km} : ${P(slow.pace)}, soit ${Math.round(slow.pace-a.avgPace)} s de plus que ta moyenne`+(a.hasEle?` (dénivelé du kilomètre dans le fichier : +${Math.round(slow.gain)} m / −${Math.round(slow.loss)} m).`:"."));
  if(a.cad&&sp[0].cad!=null&&last.cad!=null){
    const drop=sp[0].cad-mean(sp.slice(-5).map(s=>s.cad));
    if(drop>=4)out.faibles.push(`Cadence en baisse au fil de la course : ${Math.round(sp[0].cad)} pas/min au km 1, ${Math.round(mean(sp.slice(-5).map(s=>s.cad)))} sur les 5 derniers km.`);
    else out.forts.push(`Cadence stable : ${Math.round(a.cad.avg)} pas/min en moyenne, sans baisse notable.`);
  }
  if(a.hr){
    const h=a.hr,z5=h.zones[4].pct*100,z4=h.zones[3].pct*100;
    out.effort.push(`FC moyenne ${Math.round(h.avg)} bpm (${h.pctMax.toFixed(0)} % de ${h.fcmaxObserved?"la FC maximale observée":"ta FC max"} ${Math.round(h.fcmax)}), maximum ${h.max} bpm.`);
    out.effort.push(`${z5.toFixed(0)} % du temps en zone 5 et ${z4.toFixed(0)} % en zone 4 : un effort soutenu proche du maximum, typique d'un 10 km couru à fond.`+(h.fcmaxObserved?" Les zones sont calculées sur la FC maximale observée ici ; renseigne ta vraie FC max pour les affiner.":""));
    const dec=h.decoupling;
    out.effort.push(Math.abs(dec)<=3?`Découplage allure/FC de ${dec.toFixed(1).replace(".",",")} % : l'endurance a tenu, la FC n'a pas dérivé pour une allure stable.`:(dec>3?`Découplage allure/FC de ${dec.toFixed(1).replace(".",",")} % : la FC a davantage monté, ou l'allure baissé, en 2e moitié.`:`Découplage de ${dec.toFixed(1).replace(".",",")} % : meilleure efficacité en 2e moitié.`));
    const lastHr=sp[sp.length-1].hrMax;
    out.effort.push(lastHr>=h.max-1?`FC maximale (${h.max} bpm) atteinte dans le dernier kilomètre : signe d'un effort final à fond.`:`FC maximale (${h.max} bpm) atteinte avant le dernier kilomètre.`);
    const mid=sp.slice(7,9);
    if(mid.length===2&&mean(sp.slice(2,7).map(s=>s.hr))-mean(mid.map(s=>s.hr))>=3)out.effort.push(`FC plus basse de ${Math.round(mean(sp.slice(2,7).map(s=>s.hr))-mean(mid.map(s=>s.hr)))} bpm aux km 8-9 pour une allure inchangée : ces données seules ne disent pas pourquoi (terrain, vent, relâchement).`);
  }else out.effort.push("Fréquence cardiaque absente du fichier : l'analyse de l'effort se limite à l'allure.");
  // pistes
  if(a.plan&&a.plan[0].delta<-3)out.axes.push(`Caler le 1er kilomètre sur l'allure prévue (+2 s) : tu es parti ${Math.round(-a.plan[0].delta)} s trop vite sans le payer ici, mais sur une course plus dure cela se paie au 7e-9e km.`);
  if(slow&&slow.pace-a.avgPace>=4)out.axes.push(`Travailler la régularité en milieu de course (le km ${slow.km} a perdu ${Math.round(slow.pace-a.avgPace)} s) : des blocs à allure cible continue en séance spécifique.`);
  let tgt=Math.floor((T0-1)/60)*60;if(T0-tgt<15)tgt-=60;
  out.axes.push(`Prochain palier : passer sous ${C(tgt)} demande de gagner environ ${Math.round(T0-tgt)} s, soit ≈ ${((T0-tgt)/(a.dist/1000)).toFixed(1).replace(".",",")} s/km à régularité égale.`);
  if(a.hr)out.axes.push(`Mesure ta vraie FC maximale (test ou course) : les zones et la lecture de l'effort deviendront précises.`);
  out.axes.push(`Refais un test 5 km ou une séance au seuil pour recalibrer tes allures d'entraînement : ton niveau a changé (${P(a.avgPace)}/km tenus sur 10 km).`);
  return out;
}

if(typeof module!=="undefined")module.exports={parseGpx,analyzeRun,buildReport,RACE,haversine,lerp};
