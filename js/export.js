/* ---------- EXPORT : séances FIT (montre Garmin), ZIP, calendrier ICS ---------- */
/* Aucun serveur, aucun compte Garmin : tout est généré dans le navigateur. */

const ascii=s=>String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’‘]/g,"'").replace(/[–—]/g,"-").replace(/×/g,"x").replace(/[^\x20-\x7e]/g,"");
const ZSHORT={W:"Marche",Z1:"Recup",Z2:"EF",Z3:"Seuil",Z4:"Allure 10K",Z5:"Allure 5K",Z6:"Vitesse"};

/* Allure cible d'un segment : [allure lente, allure rapide] en s/km, ou null (cible libre).
   Ordre : plage exacte du plan (seg.pr) > zone du plan (tableau « Tes zones »). Aucun élargissement. */
function paceRange(seg,s){
  if(seg.z==="W")return null;
  if(seg.pr!==undefined)return seg.pr;
  if(seg.z==="Z6"&&((seg.d!=null&&seg.d<=200)||(seg.t!=null&&seg.t<=30)))return null; // lignes droites : le GPS n'est pas fiable
  if(seg.z==="Z4"&&s.race){const rp=racePace();if(rp.src==="test")return[rp.p+2,rp.p-2];}
  const m=Z[seg.z].r&&Z[seg.z].r.match(/(\d+)'(\d{2})[^\d]+(\d+)'(\d{2})/);
  if(!m)return null;
  const a=+m[1]*60+ +m[2],b=+m[3]*60+ +m[4];
  return[Math.max(a,b),Math.min(a,b)];
}

/* Regroupe les segments aplatis par rep() en blocs « répéter N fois ». */
function foldSegs(segs){
  const out=[];
  for(let i=0;i<segs.length;){
    const x=segs[i];
    if(x.g==null){out.push({seg:x});i++;continue;}
    const items=[];while(i<segs.length&&segs[i].g===x.g){items.push(segs[i]);i++;}
    const n=x.gn,w=items[0],r=items[1]&&items[1].gi===0?items[1]:null;
    const closing=!r||items.length===2*n;            // la dernière récupération existe-t-elle ?
    const count=closing?n:n-1;
    if(count>=2){out.push({rep:count,body:r?[w,r]:[w]});if(!closing)out.push({seg:w});}
    else items.forEach(y=>out.push({seg:y}));
  }
  return out;
}

/* Liste d'étapes prêtes à encoder pour une séance. */
function workoutSteps(s){
  const hard=s.main.segs.some(x=>["Z3","Z4","Z5","Z6"].includes(x.z));
  const out=[];
  const mk=(seg,kind,role)=>{
    let it;
    if(kind==="wu")it=role==null?2:(role===0?0:4);
    else if(kind==="cd")it=3;
    else if(["Z3","Z4","Z5","Z6"].includes(seg.z))it=5;
    else it=hard&&(seg.z==="Z1"||seg.z==="W")?4:0;
    const pr=paceRange(seg,s);
    const dur=seg.d!=null?{type:1,val:Math.round(seg.d*100)}:{type:0,val:Math.round(seg.t*1000)};
    const lab=seg.d!=null?(seg.d>=1000?(seg.d/1000)+"km":seg.d+"m"):(seg.t>=60?(seg.t%60?Math.floor(seg.t/60)+"'"+String(seg.t%60).padStart(2,"0"):seg.t/60+"min"):seg.t+"s");
    return{name:ascii(ZSHORT[seg.z]+" "+lab).slice(0,15),dur,pace:pr,it};
  };
  const phase=(segs,kind)=>{
    foldSegs(segs).forEach(nd=>{
      if(nd.rep){const from=out.length;nd.body.forEach((b,i)=>out.push(mk(b,kind,i)));out.push({repeat:true,from,n:nd.rep});}
      else out.push(mk(nd.seg,kind,null));
    });
  };
  phase(s.wu.segs,"wu");phase(s.main.segs,"main");phase(s.cd.segs,"cd");
  return out;
}

/* ----- encodeur FIT minimal (fichier « workout ») ----- */
const CRC_T=[0x0000,0xCC01,0xD801,0x1400,0xF001,0x3C00,0x2800,0xE401,0xA001,0x6C00,0x7800,0xB401,0x5000,0x9C01,0x8801,0x4400];
function fitCrc(bytes,crc){crc=crc||0;for(const b of bytes){let t=CRC_T[crc&0xF];crc=(crc>>4)&0x0FFF;crc=crc^t^CRC_T[b&0xF];t=CRC_T[crc&0xF];crc=(crc>>4)&0x0FFF;crc=crc^t^CRC_T[(b>>4)&0xF];}return crc;}
function fitWorkout(s){
  const steps=workoutSteps(s),b=[];
  const u8=v=>b.push(v&255),u16=v=>{u8(v);u8(v>>8);},u32=v=>{u16(v&0xFFFF);u16(Math.floor(v/65536)&0xFFFF);};
  const str=(t,n)=>{for(let i=0;i<n;i++)u8(i<t.length?t.charCodeAt(i):0);};
  const def=(local,msg,fields)=>{u8(0x40|local);u8(0);u8(0);u16(msg);u8(fields.length);fields.forEach(f=>{u8(f[0]);u8(f[1]);u8(f[2]);});};
  const wname=ascii(`${s.date.slice(8)}/${s.date.slice(5,7)} ${s.title}`).slice(0,39);
  const created=Math.floor(Date.now()/1000)-631065600;
  // file_id
  def(0,0,[[0,1,0x00],[1,2,0x84],[2,2,0x84],[3,4,0x8C],[4,4,0x86]]);
  u8(0);u8(5);u16(255);u16(0);u32(1+Math.floor(Math.random()*0xFFFFFFFD));u32(created); // numéro de série aléatoire : chaque export est un entraînement distinct pour la montre
  // workout
  def(1,26,[[4,1,0x00],[5,4,0x8C],[6,2,0x84],[8,40,0x07]]);
  u8(1);u8(1);u32(0);u16(steps.length);str(wname,40);
  // workout_step
  def(2,27,[[254,2,0x84],[0,16,0x07],[1,1,0x00],[2,4,0x86],[3,1,0x00],[4,4,0x86],[5,4,0x86],[6,4,0x86],[7,1,0x00]]);
  steps.forEach((x,i)=>{
    u8(2);u16(i);
    if(x.repeat){str("",16);u8(6);u32(x.from);u8(2);u32(x.n);u32(0);u32(0);u8(0);}
    else if(x.pace){str(x.name,16);u8(x.dur.type);u32(x.dur.val);u8(0);u32(0);u32(Math.floor(1e6/x.pace[0]));u32(Math.floor(1e6/x.pace[1]));u8(x.it);}
    else{str(x.name,16);u8(x.dur.type);u32(x.dur.val);u8(2);u32(0);u32(0);u32(0);u8(x.it);}
  });
  const hdr=[];const h8=v=>hdr.push(v&255),h16=v=>{h8(v);h8(v>>8);},h32=v=>{h16(v&0xFFFF);h16(Math.floor(v/65536));};
  h8(14);h8(0x20);h16(2132);h32(b.length);[0x2E,0x46,0x49,0x54].forEach(h8);h16(fitCrc(hdr));
  const file=new Uint8Array(14+b.length+2);file.set(hdr,0);file.set(b,14);
  const c=fitCrc(b);file[14+b.length]=c&255;file[15+b.length]=c>>8;
  return file;
}

/* ----- ZIP (stockage sans compression) ----- */
const CRC32_T=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t.push(c>>>0);}return t;})();
function crc32(d){let c=0xFFFFFFFF;for(let i=0;i<d.length;i++)c=CRC32_T[(c^d[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
function zipStore(files){
  const now=new Date(),dd=((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate(),dt=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1);
  const buf=n=>({a:new Uint8Array(n),p:0}),w=(o,sz,x)=>{for(let i=0;i<sz;i++)o.a[o.p++]=(x>>>(8*i))&255;};
  const parts=[],cen=[];let off=0;
  files.forEach(f=>{
    const nm=new TextEncoder().encode(f.name),crc=crc32(f.data),sz=f.data.length;
    const o=buf(30+nm.length);
    w(o,4,0x04034b50);w(o,2,20);w(o,2,0);w(o,2,0);w(o,2,dt);w(o,2,dd);w(o,4,crc);w(o,4,sz);w(o,4,sz);w(o,2,nm.length);w(o,2,0);o.a.set(nm,30);
    parts.push(o.a,f.data);
    const c=buf(46+nm.length);
    w(c,4,0x02014b50);w(c,2,20);w(c,2,20);w(c,2,0);w(c,2,0);w(c,2,dt);w(c,2,dd);w(c,4,crc);w(c,4,sz);w(c,4,sz);w(c,2,nm.length);w(c,2,0);w(c,2,0);w(c,2,0);w(c,2,0);w(c,4,0);w(c,4,off);c.a.set(nm,46);
    cen.push(c.a);off+=o.a.length+sz;
  });
  const e=buf(22);
  w(e,4,0x06054b50);w(e,2,0);w(e,2,0);w(e,2,files.length);w(e,2,files.length);w(e,4,cen.reduce((a,x)=>a+x.length,0));w(e,4,off);w(e,2,0);
  return new Blob([...parts,...cen,e.a],{type:"application/zip"});
}

/* ----- ICS ----- */
function icsFold(l){const o=[];while(l.length>72){o.push(l.slice(0,72));l=" "+l.slice(72);}o.push(l);return o.join("\r\n");}
const icsEsc=t=>String(t).replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n");
function icsAll(){
  const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Prepa 10K HOKA//FR","CALSCALE:GREGORIAN","X-WR-CALNAME:Prépa 10K HOKA"];
  const stamp=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");
  const ymd=d=>d.replace(/-/g,"");
  ALL.forEach(s=>{
    const nxt=new Date(D(s.date));nxt.setDate(nxt.getDate()+1);
    const nd=nxt.getFullYear()+String(nxt.getMonth()+1).padStart(2,"0")+String(nxt.getDate()).padStart(2,"0");
    const body=[`${T[s.type].n} · ${dur(s.t)} · ${km(s.d)} km`,"",s.goal,"","Échauffement : "+s.wu.txt.join(" ; "),"Corps de séance : "+s.main.txt.join(" ; "),"Retour au calme : "+s.cd.txt.join(" ; ")].join("\n");
    L.push("BEGIN:VEVENT",`UID:${s.id}@prepa10k.local`,`DTSTAMP:${stamp}`);
    if(s.id==="w4c")L.push("DTSTART:20261115T093000","DTEND:20261115T104500");
    else L.push(`DTSTART;VALUE=DATE:${ymd(s.date)}`,`DTEND;VALUE=DATE:${nd}`);
    L.push(icsFold("SUMMARY:"+icsEsc("🏃 "+s.title+(s.opt?" (optionnel)":""))),icsFold("DESCRIPTION:"+icsEsc(body)),"END:VEVENT");
  });
  L.push("END:VCALENDAR");
  return new Blob([L.join("\r\n")],{type:"text/calendar;charset=utf-8"});
}

/* ----- téléchargement ----- */
function saveBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}
const fitName=s=>s.date.slice(5).replace("-","")+"_"+s.id+"_"+Math.random().toString(36).slice(2,5)+".fit";
function exportFit(id){const s=ALL.find(x=>x.id===id);if(!s)return;saveBlob(new Blob([fitWorkout(s)],{type:"application/octet-stream"}),fitName(s));toast("Séance exportée (.fit)");}
function exportZip(){
  const list=ALL.filter(s=>!state.done[s.id]&&s.date>=TODAY);
  if(!list.length){toast("Aucune séance à venir");return;}
  saveBlob(zipStore(list.map(s=>({name:fitName(s),data:fitWorkout(s)}))),"seances-garmin.zip");
  toast(list.length+" séances exportées");
}
function exportIcs(){saveBlob(icsAll(),"prepa-10k.ics");toast("Calendrier exporté");}

/* ----- sauvegarde du suivi ----- */
function exportBackup(){saveBlob(new Blob([JSON.stringify({app:"prepa10k",v:1,state},null,1)],{type:"application/json"}),"suivi-prepa-10k.json");toast("Sauvegarde téléchargée");}
function importBackup(text){
  try{
    const o=JSON.parse(text),st=o&&o.state?o.state:o;
    if(!st||typeof st!=="object"||typeof st.done!=="object"||typeof st.logs!=="object")throw 0;
    state=Object.assign({done:{},logs:{},test:"",week:null,target:"43:00"},st);
    save();week=curWeek();renderPaces();refresh();toast("Suivi importé");
  }catch(e){toast("Fichier non reconnu");}
}
