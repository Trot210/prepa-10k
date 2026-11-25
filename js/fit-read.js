/* ---------- LECTURE D'UNE SORTIE .FIT (Forerunner 55 : GARMIN/Activity) ---------- */
/* Lecteur FIT minimal, sans dépendance : il ne garde que ce dont le site a besoin
   (fichier, séance, tours, points enregistrés). Rien n'est envoyé sur internet. */
const FIT_EPOCH=631065600; // 31/12/1989 en secondes Unix
const FIT_BT=[[1,"u8",0xFF],[1,"s8",0x7F],[1,"u8",0xFF],[2,"s16",0x7FFF],[2,"u16",0xFFFF],[4,"s32",0x7FFFFFFF],[4,"u32",0xFFFFFFFF],[1,"str",0],[4,"f32",null],[8,"f64",null],[1,"u8",0],[2,"u16",0],[4,"u32",0],[1,"u8",0xFF],[8,"s64",null],[8,"u64",null],[8,"u64",null]];
/* champs utiles : numéro de message → { numéro de champ : [nom, échelle, décalage] } */
const FIT_FIELDS={
  0:{0:["type"],4:["timeCreated"]},
  18:{2:["startTime"],5:["sport"],7:["elapsed",1000],8:["timer",1000],9:["distance",100],14:["avgSpeed",1000],124:["avgSpeedE",1000],16:["avgHr"],17:["maxHr"]},
  19:{253:["timestamp"],2:["startTime"],7:["elapsed",1000],8:["timer",1000],9:["distance",100],13:["avgSpeed",1000],110:["avgSpeedE",1000],15:["avgHr"],16:["maxHr"],71:["step"],24:["trigger"]},
  20:{253:["timestamp"],3:["hr"],5:["distance",100],6:["speed",1000],73:["speedE",1000],4:["cadence"]}
};
function readFit(buf){
  const d=new DataView(buf instanceof ArrayBuffer?buf:buf.buffer,buf.byteOffset||0,buf.byteLength);
  if(d.byteLength<14)throw new Error("Fichier trop court");
  const hs=d.getUint8(0),size=d.getUint32(4,true);
  if(String.fromCharCode(d.getUint8(8),d.getUint8(9),d.getUint8(10),d.getUint8(11))!==".FIT")throw new Error("Ce n'est pas un fichier FIT");
  const end=Math.min(hs+size,d.byteLength),defs={},out={0:[],18:[],19:[],20:[]};let p=hs,lastTs=0;
  const val=(bt,off,len,le)=>{
    const t=FIT_BT[bt&0x1F];if(!t)return null;const [sz,kind,inv]=t;if(len<sz)return null;
    let v;switch(kind){
      case"u8":v=d.getUint8(off);break;case"s8":v=d.getInt8(off);break;
      case"u16":v=d.getUint16(off,le);break;case"s16":v=d.getInt16(off,le);break;
      case"u32":v=d.getUint32(off,le);break;case"s32":v=d.getInt32(off,le);break;
      case"f32":v=d.getFloat32(off,le);break;case"f64":v=d.getFloat64(off,le);break;
      default:return null;}
    return v===inv?null:v;
  };
  while(p<end){
    const h=d.getUint8(p++);
    if(h&0x80){ // en-tête à horodatage compressé
      const def=defs[(h>>5)&3];if(!def)throw new Error("Fichier FIT illisible");
      const off=h&0x1F;let ts=(lastTs&~0x1F)+off;if(off<(lastTs&0x1F))ts+=0x20;lastTs=ts;
      const m=readMsg(def,p);p+=def.len;if(m&&def.num===20){m.timestamp=ts;out[20].push(m);}else if(m&&out[def.num])out[def.num].push(m);
      continue;
    }
    if(h&0x40){ // définition
      const local=h&0x0F,dev=h&0x20,le=d.getUint8(p+1)===0,num=d.getUint16(p+2,le),nf=d.getUint8(p+4);p+=5;
      const fields=[];let len=0;for(let i=0;i<nf;i++){fields.push([d.getUint8(p),d.getUint8(p+1),d.getUint8(p+2),len]);len+=d.getUint8(p+1);p+=3;}
      if(dev){const nd=d.getUint8(p++);for(let i=0;i<nd;i++){len+=d.getUint8(p+1);p+=3;}}
      defs[local]={num,le,fields,len};continue;
    }
    const def=defs[h&0x0F];if(!def)throw new Error("Fichier FIT illisible");
    const m=readMsg(def,p);p+=def.len;
    if(m){if(m.timestamp!=null)lastTs=m.timestamp;if(out[def.num])out[def.num].push(m);}
  }
  function readMsg(def,at){
    const spec=FIT_FIELDS[def.num];if(!spec){const ts=def.fields.find(f=>f[0]===253);if(ts){const v=val(ts[2],at+ts[3],ts[1],def.le);if(v!=null)lastTs=v;}return null;}
    const m={};
    def.fields.forEach(([fn,sz,bt,off])=>{const f=spec[fn]||(fn===253?["timestamp"]:null);if(!f)return;let v=val(bt,at+off,sz,def.le);if(v==null)return;if(f[1])v=v/f[1];m[f[0]]=v;});
    if(m.timestamp!=null)lastTs=m.timestamp;
    return m;
  }
  return out;
}

/* Résumé exploitable d'une sortie : durée, distance, FC, tours, km, série de FC (pas de 15 s). */
function summarizeFit(raw){
  const fid=raw[0][0]||{},ses=raw[18][0],recs=raw[20].filter(r=>r.timestamp!=null);
  if(fid.type!=null&&fid.type!==4)throw new Error(fid.type===5?"C'est un fichier de séance (montre), pas une sortie enregistrée":"Ce fichier n'est pas une sortie enregistrée");
  if(!recs.length&&!ses)throw new Error("Aucune donnée de course dans ce fichier");
  const t0=(ses&&ses.startTime)||recs[0].timestamp,unix=t=>(t+FIT_EPOCH)*1000;
  const start=new Date(unix(t0));
  const hrs=recs.filter(r=>r.hr>30&&r.hr<240);
  const timer=ses&&ses.timer||(recs.length?recs[recs.length-1].timestamp-t0:0);
  const dist=ses&&ses.distance||(recs.length?Math.max(...recs.map(r=>r.distance||0)):0);
  const avgHr=ses&&ses.avgHr||(hrs.length?Math.round(hrs.reduce((a,r)=>a+r.hr,0)/hrs.length):null);
  const maxHr=ses&&ses.maxHr||(hrs.length?Math.max(...hrs.map(r=>r.hr)):null);
  // série de FC au pas de 15 s (dernière valeur connue), pour le graphique
  const hr15=[];if(hrs.length){let j=0;const T=recs[recs.length-1].timestamp-t0;for(let t=0;t<=T;t+=15){while(j+1<hrs.length&&hrs[j+1].timestamp-t0<=t)j++;hr15.push(hrs[j].timestamp-t0<=t+15?hrs[j].hr:0);}}
  // temps par point (borné à 10 s pour ne pas compter les pauses)
  const dt=i=>i+1<recs.length?Math.min(10,Math.max(0,recs[i+1].timestamp-recs[i].timestamp)):1;
  // kilomètres
  const km=[];let next=1000,prevT=t0,hrS=0,hrN=0;
  recs.forEach((r,i)=>{if(r.hr>30){hrS+=r.hr;hrN++;}if(r.distance!=null&&r.distance>=next){km.push([Math.round(r.timestamp-prevT),hrN?Math.round(hrS/hrN):null]);prevT=r.timestamp;next+=1000;hrS=0;hrN=0;}});
  const laps=raw[19].map(l=>({st:l.startTime!=null?l.startTime-t0:null,end:l.timestamp!=null?l.timestamp-t0:null,t:Math.round(l.timer||l.elapsed||0),d:Math.round(l.distance||0),hr:l.avgHr||null,step:l.step!=null?l.step:null,trig:l.trigger}));
  return{start:start.toISOString(),date:start.getFullYear()+"-"+String(start.getMonth()+1).padStart(2,"0")+"-"+String(start.getDate()).padStart(2,"0"),
    dur:Math.round(timer),dist:Math.round(dist),hrAvg:avgHr?Math.round(avgHr):null,hrMax:maxHr||null,hr15,km,laps,
    _recs:recs.map((r,i)=>[r.timestamp-t0,r.hr>30?r.hr:null,dt(i)])};
}
