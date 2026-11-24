/* ---------- CYCLE 2 : ENTRETIEN & PROGRESSION (16 nov. → 31 déc. 2026) ---------- */
/* Allures recalculées sur le 10 km HOKA (42'32, 4'15/km). Le facile se pilote à la FC
   (zones Garmin de Lucien : Z1 99–117, Z2 118–137, Z3 138–157, Z4 158–176, Z5 > 176),
   avec un plafond EF de 138 bpm. Le dur se pilote à l'allure.
   hr:[min,max] = cible FC exportée vers la montre ; p = allure indicative servant à estimer la distance. */
Object.assign(Z,{
  R:{n:"Récupération",c:"#94a3b8",lvl:1.2,p:405,hr:[100,128],r:"≈ 6'30 – 7'00 (indicatif)",fc:"≤ 128 bpm",gz:"Zone 1 – bas de zone 2",rpe:"2",feel:"Très facile, respiration nasale possible",use:"Footings de récupération, début d'échauffement"},
  E:{n:"Endurance fondamentale",c:"#22c55e",lvl:2,p:375,hr:[100,138],r:"≈ 6'00 – 6'30 (indicatif)",fc:"≤ 138 bpm",gz:"Zone 2 (plafond 138)",rpe:"3",feel:"Conversation complète, sans effort",use:"Base aérobie, échauffements, ~75 % du temps total"},
  AA:{n:"Endurance active",c:"#14b8a6",lvl:2.7,p:300,hr:[139,157],r:"≈ 4'45 – 5'20 (indicatif)",fc:"139 – 157 bpm",gz:"Zone 3",rpe:"5 – 6",feel:"Soutenu mais facile à contrôler, phrases possibles",use:"Fins de sorties longues progressives, alternances"},
  SE:{n:"Seuil",c:"#f59e0b",lvl:3.4,p:270,r:"4'27 – 4'32",fc:"≈ 168 – 178 bpm",gz:"Haut de zone 4",rpe:"7",feel:"« Confortablement dur », phrases courtes",use:"Blocs de 6 à 12 min, 2000 m"},
  AK:{n:"Allure 10 km",c:"#a855f7",lvl:4.2,p:255,r:"4'13 – 4'17",fc:"> 176 bpm",gz:"Zone 5",rpe:"8",feel:"Dur mais régulier, quelques mots seulement",use:"Ton allure du 15 novembre, en blocs courts"},
  A5:{n:"Allure 5 km / VMA longue",c:"#f97316",lvl:5,p:245,r:"4'02 – 4'07",fc:"zone 5",gz:"Zone 5",rpe:"8 – 9",feel:"Très dur, plus de parole possible",use:"800 à 1200 m, test 5 km"},
  VM:{n:"Vitesse / VMA courte",c:"#ef4444",lvl:6,p:232,r:"3'45 – 3'55",fc:"non pertinent",gz:"—",rpe:"9",feel:"Rapide mais relâché, pas un sprint",use:"200 à 400 m, 30-30, lignes droites"}
});
Object.assign(T,{long:{n:"Sortie longue",c:"#3b82f6"},fart:{n:"Variation d'allure",c:"#ec4899"}});
const GARMIN_ZONES=[["Zone 1","99 – 117"],["Zone 2","118 – 137"],["Zone 3","138 – 157"],["Zone 4","158 – 176"],["Zone 5","> 176"]];

const EF=t=>S("E",{t}),RC=t=>S("R",{t});
const TROT=o=>S("R",Object.assign({hr:null},o));           // trot entre fractions et retour au calme : pas de cible (le cœur n'a pas le temps de redescendre)
const LD=n=>rep(n,S("VM",{d:80,p:225}),S("W",{t:45}),true); // lignes droites de 80 m, retour en marchant
const WU_STD=()=>({txt:["20' en EF, FC ≤ 138 bpm","5' de gammes : montées de genoux, talons-fesses, pas chassés","3 lignes droites de 80 m relâchées, retour en marchant"],segs:[EF(1200),S("W",{t:300}),...LD(3)]});
const CD_TROT=m=>({txt:[m+"' de trot lent, sans cible de FC"],segs:[TROT({t:m*60})]});
/* VMA : estimée sur le 42'32 (10 km ≈ 91–92 % de VMA), puis mesurée par le test demi-Cooper du 1er décembre.
   Les séances de fractionné (vma:v=>…) sont écrites en % de VMA et se recalent sur la valeur mesurée. */
const VMA_EST=15.4;                                    // km/h
const vp=(v,pct)=>3600/(v*pct/100);                    // allure (s/km) à pct % de la VMA v
const fm=s=>{s=Math.round(s);return Math.floor(s/60)+"'"+String(s%60).padStart(2,"0");};
const ft=s=>{s=Math.round(s);return s<60?s+'"':fm(s);};
const VS=(z,v,lo,hi,o)=>{const a=vp(v,lo),b=vp(v,hi);return S(z,Object.assign({p:Math.round((a+b)/2),pr:[Math.round(a),Math.round(b)]},o));};
const VT=(d,v,lo,hi)=>{const m=(vp(v,lo)+vp(v,hi))/2;return d+" m en "+ft(m*d/1000)+" ("+fm(m)+"/km)";};
const EF_TIP="Au-dessus de 138 bpm, ralentis, et marche quelques secondes si besoin. L'allure n'a aucune importance : c'est la FC qui fixe l'intensité.";

const PLAN_H=[
{n:1,mon:"2026-11-16",phase:"Récupération post-10 km",short:"Aucune intensité",
 goal:"Éliminer la fatigue du 10 km du 15 novembre, couru à 95 % de ta FC max. Tout se court à la FC, sans aucune allure imposée. Ton mollet passe avant tout.",
 sessions:[
 {id:"h1a",date:"2026-11-17",type:"recup",title:"Footing de déblocage",short:"25' très faciles, FC ≤ 128 bpm",
  goal:"Régénération : relancer la circulation pour réparer les fibres musculaires, sans créer de nouveau stress.",
  why:"Deux jours après un 10 km couru à fond, les muscles sont encore marqués. Un footing très lent récupère mieux que le repos complet, à condition de rester sous 128 bpm, même si l'allure te paraît ridiculement lente.",
  wu:{txt:["5' de marche active"],segs:[S("W",{t:300})]},
  main:{txt:["25' en récupération, FC ≤ 128 bpm (zone 1 – bas de zone 2)","Terrain souple si possible (parc, Bois de Vincennes)"],segs:[RC(1500)]},
  cd:{txt:["5' de marche","Mobilité des chevilles et des mollets (hors chrono)"],segs:[S("W",{t:300})]},
  tips:["Si la FC dépasse 128 bpm, marche quelques secondes : c'est normal et voulu.","Au moindre signe au mollet (douleur ≥ 3/10), arrête et marche."],
  tired:"Courbatures marquées : 30' de marche ou de vélo, ou repos complet. Aucune conséquence sur la suite."},
 {id:"h1b",date:"2026-11-19",type:"ef",title:"EF + lignes droites",short:"30' sous 138 bpm et 4 accélérations relâchées",
  goal:"Relancer la base aérobie et la coordination de la foulée.",
  why:"L'EF sous 138 bpm développe les capillaires et les mitochondries sans fatiguer. Les lignes droites de 80 m sont trop courtes pour produire du lactate : elles réveillent la foulée sans entamer la récupération.",
  wu:{txt:["10' de trot, FC ≤ 128 bpm"],segs:[RC(600)]},
  main:{txt:["30' en endurance fondamentale, FC ≤ 138 bpm","4 lignes droites de 80 m relâchées (≈ 90 % de ta vitesse max, pas un sprint), retour en marchant (45\")"],segs:[EF(1800),...LD(4)]},
  cd:{txt:["5' de trot lent"],segs:[RC(300)]},
  tips:[EF_TIP,"Lignes droites seulement si le mollet ne tire pas du tout.","Cherche la fréquence plutôt que l'amplitude, sans modifier volontairement ta foulée."],
  tired:"35' en EF sans les lignes droites."},
 {id:"h1c",date:"2026-11-22",type:"long",title:"Sortie EF",short:"45' en aisance, FC ≤ 138 bpm",
  goal:"Reprendre du volume en douceur : la sortie longue de la semaine, sans aucune intensité.",
  why:"Une semaine après la course, l'objectif est de retrouver le plaisir de courir et de relancer l'endurance. La FC sous 138 bpm garantit que la sortie reste une séance de récupération active.",
  wu:{txt:["10' de trot, FC ≤ 128 bpm"],segs:[RC(600)]},
  main:{txt:["35' en EF, FC ≤ 138 bpm","6 lignes droites de 80 m, retour en marchant"],segs:[EF(2100),...LD(6)]},
  cd:{txt:["5' de trot lent"],segs:[RC(300)]},
  tips:[EF_TIP,"Choisis un parcours plat : en côte, la FC monte vite au-dessus de 138."],
  tired:"40' en EF, sans les lignes droites."}
 ]},
{n:2,mon:"2026-11-23",phase:"Reprise de la qualité",short:"Fartlek et premier seuil",
 goal:"Retrouver les allures rapides sans brutalité : un fartlek varié mardi, un seuil court dimanche. Tout le reste en EF sous 138 bpm.",
 sessions:[
 {id:"h2a",date:"2026-11-24",type:"fart",title:"Fartlek pyramidal 1-2-3-2-1",short:"Toutes les allures dans une séance continue",
  goal:"Réactiver la VO₂max, l'allure 10 km et le seuil dans une seule séance, avec des récupérations courtes en trot.",
  why:"Le fartlek pyramidal fait passer d'une allure à l'autre sans arrêt complet. Chaque bloc est court, donc la reprise reste douce, mais toutes les sensations sont rappelées. Plus le bloc est long, plus il est lent.",
  wu:WU_STD(),
  main:{txt:["1' à 4'02 – 4'07/km, puis 30\" de trot","2' à 4'13 – 4'17/km, puis 1' de trot","3' à 4'27 – 4'32/km, puis 1'30 de trot","2' à 4'13 – 4'17/km, puis 1' de trot","1' à 4'02 – 4'07/km"],
   segs:[S("A5",{t:60}),TROT({t:30}),S("AK",{t:120}),TROT({t:60}),S("SE",{t:180}),TROT({t:90}),S("AK",{t:120}),TROT({t:60}),S("A5",{t:60})]},
  cd:CD_TROT(10),
  tips:["Ce n'est pas un test : chaque bloc doit rester maîtrisé.","Les récupérations se font en trot, sans cible de FC : le cœur n'a pas le temps de redescendre sous 138."],
  tired:"Seulement la montée : 1' – 2' – 3', puis le retour au calme."},
 {id:"h2b",date:"2026-11-26",type:"ef",title:"Endurance fondamentale",short:"35' sous 138 bpm + 5 lignes droites",
  goal:"Récupérer du mardi et entretenir la base aérobie.",
  why:"C'est la séance que l'on gâche le plus souvent en la courant trop vite. Sous 138 bpm, elle prépare le dimanche au lieu de le compromettre.",
  wu:{txt:["10' de trot, FC ≤ 128 bpm"],segs:[RC(600)]},
  main:{txt:["35' en EF, FC ≤ 138 bpm","5 lignes droites de 80 m, retour en marchant"],segs:[EF(2100),...LD(5)]},
  cd:{txt:["5' de trot lent"],segs:[RC(300)]},
  tips:[EF_TIP],
  tired:"30' en EF, sans les lignes droites."},
 {id:"h2c",date:"2026-11-29",type:"long",cp:1,title:"Sortie longue avec seuil 3 × 6'",short:"Premier seuil du cycle · point de contrôle 1",
  goal:"Seuil lactique : retrouver l'intensité « confortablement dure », encadrée par de l'endurance fondamentale.",
  why:"Ton nouveau seuil (4'27 – 4'32) découle de ton 42'32. Trois blocs de 6' suffisent pour le réactiver sans fatigue excessive, et les 15' d'EF qui suivent entretiennent l'endurance.",
  wu:{txt:["20' en EF, FC ≤ 138 bpm"],segs:[EF(1200)]},
  main:{txt:["3 × 6' au seuil à 4'27 – 4'32/km","Récupération : 2' de trot après chaque bloc","Puis 15' en EF, FC ≤ 138 bpm (ralentis autant qu'il faut pour que le cœur redescende)"],segs:[...rep(3,S("SE",{t:360}),TROT({t:120}),true),EF(900)]},
  cd:{txt:["5' de trot lent"],segs:[RC(300)]},
  tips:["Le seuil est « confortablement dur » : tu peux dire une phrase courte.","Ne descends pas sous 4'25 : plus vite, ce n'est plus du seuil."],
  cpTxt:"Note la FC moyenne et la FC de fin du 3e bloc. Repère : 3e bloc à 4'27 – 4'32 qui finit sous 178 bpm = seuil intact, le cycle continue comme prévu. FC au-dessus de 180 ou allure qui glisse vers 4'40 = récupération incomplète : en semaine 3, fais 2 séries au lieu de 3 mardi et retire le dernier tiers de la sortie progressive.",
  tired:"2 × 6' au lieu de 3, à la même allure. On réduit le volume, jamais l'allure."}
 ]},
{n:3,mon:"2026-11-30",phase:"Développement · vitesse",short:"Semaine chargée",
 goal:"Première semaine chargée : test VMA sur piste mardi, pour caler toutes les séances de fractionné de décembre, puis sortie longue progressive pilotée à la FC dimanche.",
 sessions:[
 {id:"h3a",date:"2026-12-01",type:"test",vmaTest:true,title:"Test VMA : demi-Cooper",short:"Piste · 6' au maximum, la distance donne ta VMA",
  goal:"Mesurer ta vitesse maximale aérobie (VMA) : la vitesse à partir de laquelle ta consommation d'oxygène plafonne. C'est la référence de toutes les séances de fractionné.",
  why:"Le demi-Cooper (6' à la vitesse la plus élevée possible, de façon régulière) se fait seul, sur une piste, avec ta montre. 6 minutes correspondent à la durée qu'un coureur entraîné tient à sa VMA : ta vitesse moyenne est donc ta VMA, et le calcul est direct (distance en mètres ÷ 100 = VMA en km/h). Un test à paliers comme le VAMEVAL est un peu plus rigoureux, mais il demande une bande sonore, des plots tous les 20 m et quelqu'un pour noter. Le Cooper de 12' sous-estime la VMA, et un calcul à partir du 10 km dépend de ton endurance : c'est justement ce que le test va séparer.",
  wu:{txt:["20' en EF, FC ≤ 138 bpm","5' de gammes : montées de genoux, talons-fesses, pas chassés","3 accélérations progressives de 80 m, retour en marchant","3' de trot, puis place-toi sur la ligne"],segs:[EF(1200),S("W",{t:300}),...LD(3),TROT({t:180})]},
  main:{txt:["6' à la vitesse la plus élevée que tu peux tenir régulièrement","Départ à 1'33 – 1'35 au 400 m (≈ 3'53/km), regarde le chrono à chaque tour","Dernière minute : accélère si tu as de la réserve","À 6'00, la montre vibre : arrête-toi et repère ta position au 10 m près. Distance = tours complets × 400 m + la fin du dernier tour"],segs:[S("VM",{t:360,p:234,pr:null})]},
  cd:{txt:["3' de marche","12' de trot très lent, sans cible de FC"],segs:[S("W",{t:180}),TROT({t:720})]},
  tips:["Piste de 400 m, couloir 1, et bouton tour à chaque passage de la ligne : le GPS est trop imprécis sur piste pour un test.","Avant de partir, repère les marques tous les 100 m à partir de ta ligne de départ : c'est ce qui rend la mesure précise.","La régularité fait le résultat : un départ trop rapide coûte plus de mètres en fin de test qu'il n'en fait gagner au début.","Conditions : pas de séance dure dans les 48 h, pas de repas copieux dans les 3 h, et pas de test par grand vent.","Note aussi la FC maximale affichée à la fin : elle permet de vérifier tes zones Garmin.","Entre la distance dans l'onglet Allures & test : ta VMA et tes allures sont calculées, et les fractionnés des 8, 15 et 22 décembre se recalent automatiquement."],
  tired:"Jambes lourdes ou mal dormi : ne fais pas le test, il sous-estimerait ta VMA. Cours l'EF du jeudi aujourd'hui et déplace le test au jeudi 3 décembre."},
 {id:"h3b",date:"2026-12-03",type:"ef",title:"Endurance fondamentale",short:"40' sous 138 bpm + 6 lignes droites",
  goal:"Récupération active et volume aérobie.",
  why:"Entre deux séances de la semaine la plus dense jusqu'ici, l'EF consolide sans fatiguer.",
  wu:{txt:["10' de trot, FC ≤ 128 bpm"],segs:[RC(600)]},
  main:{txt:["40' en EF, FC ≤ 138 bpm","6 lignes droites de 80 m, retour en marchant"],segs:[EF(2400),...LD(6)]},
  cd:{txt:["5' de trot lent"],segs:[RC(300)]},
  tips:[EF_TIP],
  tired:"35' en EF, sans les lignes droites."},
 {id:"h3c",date:"2026-12-06",type:"long",title:"Sortie longue progressive en 3 tiers",short:"Pilotée à la FC, de l'EF au haut de la zone 3",
  goal:"Endurance aérobie et capacité à accélérer en fin de sortie, sans jamais atteindre le seuil.",
  why:"Chaque tiers monte d'un cran de FC. Le dernier se court en haut de zone 3, juste sous le seuil : c'est l'intensité qui développe l'endurance aérobie sans coûter autant qu'une séance de qualité.",
  wu:{txt:["10' de trot, FC ≤ 128 bpm"],segs:[RC(600)]},
  main:{txt:["30' en EF, FC ≤ 138 bpm","20' en endurance active basse, FC 139 – 150 bpm","10' en endurance active haute, FC 150 – 157 bpm (≈ 4'45 – 4'55/km)"],segs:[EF(1800),S("AA",{t:1200,hr:[139,150],p:315}),S("AA",{t:600,hr:[150,157],p:292})]},
  cd:CD_TROT(5),
  tips:["Si la FC dépasse 157 bpm dans le dernier tiers, ralentis : on reste sous le seuil.","La progression vient de la FC, pas de l'allure : un jour de vent, tu iras moins vite pour la même FC, et c'est correct."],
  tired:"Supprime le dernier tiers : 30' en EF + 20' à 139 – 150 bpm."}
 ]},
{n:4,mon:"2026-12-07",phase:"Développement · seuil",short:"Semaine la plus chargée",
 goal:"Pic de charge du cycle : fractionné long à double allure mardi, 6 km au seuil dimanche. Le jeudi reste une EF pure.",
 sessions:[
 {id:"h4a",date:"2026-12-08",type:"frac",title:"4 × 1200 m à double allure",short:"Piste · 800 m à allure 5 km, puis 400 m plus vite",
  goal:"Puissance aérobie et capacité à changer de rythme alors que la fatigue est déjà là, comme dans une fin de 10 km.",
  why:"Accélérer sur les 400 derniers mètres de chaque répétition apprend à relancer en état de fatigue. C'est ce qui t'a permis de finir en 4'11 au km 10 le 15 novembre : on l'entretient.",
  wu:WU_STD(),
  vma:v=>({txt:[`4 × 1200 m : ${VT(800,v,93.5,95)}, puis sans pause ${VT(400,v,97.5,99)}`,"Récupération : 2'30 de trot"],
   segs:[1,2,3,4].flatMap(i=>[VS("A5",v,93.5,95,{d:800}),VS("VM",v,97.5,99,{d:400}),...(i<4?[TROT({t:150})]:[])])}),
  cd:CD_TROT(10),
  tips:["Contrôle au tour : 1'39 sur les deux premiers tours, 1'35 sur le dernier.","Le changement d'allure doit être net, mais sans sprint."],
  tired:"3 répétitions au lieu de 4."},
 {id:"h4b",date:"2026-12-10",type:"ef",title:"EF pure",short:"50' sous 138 bpm, sans accélération",
  goal:"Absorber la charge de la semaine en entretenant l'endurance.",
  why:"Entre les deux séances les plus exigeantes du cycle, aucune accélération : uniquement du volume facile.",
  wu:{txt:["5' de trot, FC ≤ 128 bpm"],segs:[RC(300)]},
  main:{txt:["50' en EF, FC ≤ 138 bpm"],segs:[EF(3000)]},
  cd:{txt:["5' de trot lent"],segs:[RC(300)]},
  tips:[EF_TIP],
  tired:"40' en EF."},
 {id:"h4c",date:"2026-12-13",type:"long",cp:2,title:"Sortie longue avec 3 × 2000 m au seuil",short:"6 km au seuil · point de contrôle 2",
  goal:"Seuil lactique : environ 27 minutes cumulées au seuil, la séance qui maintient le mieux ton niveau sur 10 km.",
  why:"Le seuil est la qualité qui se perd le plus vite sans entretien, et celle qui porte le plus ton 10 km. Trois blocs de 2000 m à allure constante, encadrés par de l'EF, en font une vraie sortie longue de qualité.",
  wu:{txt:["20' en EF, FC ≤ 138 bpm"],segs:[EF(1200)]},
  main:{txt:["3 × 2000 m en 9'00 (4'27 – 4'32/km)","Récupération : 2'30 de trot après chaque bloc","Puis 15' en EF, FC ≤ 138 bpm"],segs:[...rep(3,S("SE",{d:2000}),TROT({t:150}),true),EF(900)]},
  cd:{txt:["5' de trot lent"],segs:[RC(300)]},
  tips:["Garde la même allure sur les 3 blocs. S'il le faut, réduis le nombre de blocs, jamais l'allure.","Parcours plat (berges de Seine, canal) pour une allure fiable."],
  cpTxt:"Note l'allure et la FC moyennes de chaque bloc. Repère : 3 blocs à 4'27 – 4'32, FC sous 178 bpm et dérive de 5 bpm maximum entre le 1er et le 3e = seuil maintenu, voire en progrès. 3e bloc qui glisse vers 4'38 ou FC au-dessus de 180 = fatigue : garde la semaine 5 telle quelle, et remplace la pyramide de la semaine 6 par 2 × 2000 m au seuil.",
  tired:"2 × 2000 m + 10' d'EF."}
 ]},
{n:5,mon:"2026-12-14",phase:"Assimilation",short:"Volume −25 %",
 goal:"Semaine allégée : on garde un peu de vitesse et on coupe le volume. C'est pendant ces semaines que le corps assimile le travail des deux précédentes.",
 sessions:[
 {id:"h5a",date:"2026-12-15",type:"frac",title:"30-30 en 2 séries",short:"VMA courte, volume réduit",
  goal:"Garder la vitesse sans ajouter de fatigue.",
  why:"Le 30-30 sollicite la VO₂max avec très peu de fatigue musculaire : idéal pour une semaine allégée, qui réduit le volume mais pas l'intensité.",
  wu:WU_STD(),
  vma:v=>({txt:[`2 séries de 6 × (30" vite à ${fm(vp(v,104))} – ${fm(vp(v,101.6))}/km, soit ≈ ${Math.round(v*1.03/3.6*30/5)*5} m, puis 30" de trot)`,"3' de trot entre les séries"],
   segs:[...rep(6,VS("VM",v,101.6,104,{t:30}),TROT({t:30})),TROT({t:180}),...rep(6,VS("VM",v,101.6,104,{t:30}),TROT({t:30}))]}),
  cd:CD_TROT(10),
  tips:["Sur 30\", l'allure de la montre réagit avec retard : fie-toi à la sensation (vite et relâché), la distance d'environ 130 m sert de repère.","Peut se faire sur route plate ou en parc."],
  tired:"Une seule série de 6."},
 {id:"h5b",date:"2026-12-17",type:"ef",title:"Endurance fondamentale",short:"35' sous 138 bpm",
  goal:"Récupération active.",
  why:"Volume réduit : une EF courte suffit pour entretenir.",
  wu:{txt:["5' de trot, FC ≤ 128 bpm"],segs:[RC(300)]},
  main:{txt:["35' en EF, FC ≤ 138 bpm"],segs:[EF(2100)]},
  cd:{txt:["5' de trot lent"],segs:[RC(300)]},
  tips:[EF_TIP],
  tired:"Repos, ou 30' très faciles."},
 {id:"h5c",date:"2026-12-20",type:"long",title:"La ligne 174 en EF",short:"La Défense → Saint-Ouen RER · 9 km, seulement la FC",
  gpx:{href:"data/bus174-la-defense-saint-ouen.gpx",label:"Tracé de la ligne 174 (.gpx)",km:9.0},
  goal:"Courir sans contrainte : endurance aérobie et plaisir, sur le trajet du bus 174.",
  why:"Pas d'allure, pas de chrono : uniquement la FC sous 138 bpm. Les 9 km de la ligne correspondent presque exactement aux 55' d'EF prévues dans cette semaine allégée, sans ajouter de volume. Le sens La Défense → Saint-Ouen met la seule descente au début, pendant l'échauffement ; dans l'autre sens, la montée finale vers La Défense ferait passer la FC au-dessus de 138.",
  wu:{txt:["Départ de l'arrêt La Défense : 5' de trot, FC ≤ 128 bpm, en descendant vers le Pont de Neuilly"],segs:[RC(300)]},
  main:{txt:["Le reste de la ligne en EF, FC ≤ 138 bpm, allure libre : Neuilly, Levallois, Clichy, jusqu'à Saint-Ouen RER (≈ 50')","6 lignes droites de 80 m, relâchées, une fois arrivé à Saint-Ouen"],segs:[EF(3000),...LD(6)]},
  cd:{txt:["5' de trot lent"],segs:[RC(300)]},
  tips:[EF_TIP,"Aux feux, arrête-toi simplement, sans mettre la montre en pause : la FC redescend, c'est très bien.","La Forerunner 55 n'affiche pas de tracé : garde le GPX sur le téléphone, ou suis les 27 arrêts du 174, qui jalonnent tout le parcours.","Pars vers 9 h 30 – 10 h : il fait jour et les grands axes de Levallois et Clichy sont calmes le dimanche matin. Retour possible en 174, ou en RER C / métro 14 depuis Saint-Ouen."],
  tired:"45' en EF."}
 ]},
{n:6,mon:"2026-12-21",phase:"Développement · fêtes",short:"Charge modérée, souple",
 goal:"Dernier bloc de travail avant le bilan. Les séances peuvent glisser d'un jour selon les fêtes : garde seulement 48 h entre deux séances dures.",
 sessions:[
 {id:"h6a",date:"2026-12-22",type:"frac",title:"Pyramide 400-800-1200, descente plus rapide",short:"Piste · finir plus vite qu'on a commencé",
  goal:"VMA et seuil haut. La descente se court 2 à 3 s/km plus vite que la montée, pour apprendre à finir fort.",
  why:"La montée habitue à tenir des fractions de plus en plus longues, la descente plus rapide travaille la capacité à accélérer en fatigue. 4,8 km de travail au total, la dose d'une semaine chargée.",
  wu:WU_STD(),
  vma:v=>({txt:[`Montée : ${VT(400,v,98.5,100.5)} · ${VT(800,v,95.5,97)} · ${VT(1200,v,93.5,95)}`,`Descente : ${VT(1200,v,94.3,95.7)} · ${VT(800,v,96.7,98.3)} · ${VT(400,v,100,101.7)}`,"Récupération en trot : 1' · 1'30 · 2' · 2' · 1'30"],
   segs:[VS("VM",v,98.5,100.5,{d:400}),TROT({t:60}),VS("A5",v,95.5,97,{d:800}),TROT({t:90}),VS("A5",v,93.5,95,{d:1200}),TROT({t:120}),VS("A5",v,94.3,95.7,{d:1200}),TROT({t:120}),VS("A5",v,96.7,98.3,{d:800}),TROT({t:90}),VS("VM",v,100,101.7,{d:400})]}),
  cd:CD_TROT(10),
  tips:["Le 1200 m de la montée est le piège : 1'39 – 1'40 au tour, pas plus vite.","Si la descente devient impossible à tenir, cours-la à l'allure de la montée."],
  tired:"Supprime le 1200 m de la descente."},
 {id:"h6b",date:"2026-12-24",type:"ef",title:"EF avant le réveillon",short:"45' sous 138 bpm + 4 lignes droites",
  goal:"Entretien aérobie et récupération du mardi.",
  why:"Une EF courue tôt dans la journée laisse le reste du 24 décembre libre, sans fatigue.",
  wu:{txt:["5' de trot, FC ≤ 128 bpm"],segs:[RC(300)]},
  main:{txt:["40' en EF, FC ≤ 138 bpm","4 lignes droites de 80 m, retour en marchant"],segs:[EF(2400),...LD(4)]},
  cd:{txt:["5' de trot lent"],segs:[RC(300)]},
  tips:[EF_TIP,"Peut être avancée au mercredi 23."],
  tired:"30' en EF."},
 {id:"h6c",date:"2026-12-27",type:"long",title:"Sortie longue en alternance d'allures",short:"3 × (5' soutenu / 5' souple) au milieu d'une sortie EF",
  goal:"Endurance aérobie et capacité à relancer, deux jours après Noël.",
  why:"Alterner 5' soutenus et 5' souples, sans arrêt, apprend à récupérer en courant. Le cœur n'a pas le temps de redescendre sous 138 pendant les phases souples : elles se pilotent donc à l'allure, pas à la FC.",
  wu:{txt:["25' en EF, FC ≤ 138 bpm"],segs:[EF(1500)]},
  main:{txt:["3 × (5' à 4'40 – 4'45/km, puis 5' souple à 5'30 – 5'45/km), sans arrêt","Puis 10' en EF, FC ≤ 138 bpm"],segs:[...rep(3,S("AA",{t:300,p:283,pr:PR("4'45","4'40")}),S("E",{t:300,p:338,pr:PR("5'45","5'30")})),EF(600)]},
  cd:{txt:["5' de trot lent"],segs:[RC(300)]},
  tips:["Les phases soutenues restent sous le seuil : si la FC dépasse 170, ralentis de 5 s/km.","Digestion des fêtes : si tu te sens lourd, remplace l'alternance par 60' d'EF."],
  tired:"2 alternances au lieu de 3."}
 ]},
{n:7,mon:"2026-12-28",phase:"Bilan de fin d'année",short:"Allégée + test 5 km",
 goal:"Arriver frais au test du 31 décembre, qui mesure ton niveau au 1er janvier.",
 sessions:[
 {id:"h7a",date:"2026-12-29",type:"ef",title:"Activation",short:"30' sous 138 bpm + 4 × 1' à allure 5 km",
  goal:"Garder le tonus avant le test, sans fatigue.",
  why:"Quatre minutes cumulées à allure 5 km suffisent à rappeler les sensations deux jours avant le test.",
  wu:{txt:["5' de trot, FC ≤ 128 bpm"],segs:[RC(300)]},
  main:{txt:["30' en EF, FC ≤ 138 bpm","4 × 1' à 4'02 – 4'07/km, récupération 1' de trot"],segs:[EF(1800),...rep(4,S("A5",{t:60}),TROT({t:60}))]},
  cd:CD_TROT(5),
  tips:["Aucune séance « pour se rassurer » en plus."],
  tired:"30' en EF, sans les accélérations."},
 {id:"h7b",date:"2026-12-31",type:"test",cp:3,title:"Test 5 km de fin d'année",short:"Mesurer ton niveau · point de contrôle 3",
  goal:"Mesurer ton niveau au 1er janvier et vérifier que les acquis de la prépa 10 km sont conservés.",
  why:"Ton 42'32 équivaut à environ 20'24 sur 5 km (coefficient 2,085). Le test dit si tu as maintenu ce niveau, si tu l'as dépassé ou si les fêtes ont laissé une trace. Terrain plat obligatoire : piste (12,5 tours) ou boucle plate mesurée.",
  wu:{txt:["20' en EF, FC ≤ 138 bpm","5' de gammes","4 accélérations de 100 m, dont les 2 dernières à allure 5 km"],segs:[EF(1200),S("W",{t:300}),...rep(4,S("VM",{d:100,p:235}),S("W",{t:45}),true)]},
  main:{txt:["5 km à fond mais réguliers","Km 1 à 3 : 4'04 – 4'06/km, sans t'emballer","Km 4 et 5 : accélère si tu as de la réserve"],segs:[S("A5",{d:3000,p:245,pr:PR("4'06","4'04")}),S("A5",{d:2000,p:243,pr:null})]},
  cd:CD_TROT(15),
  tips:["Conditions de course : chaussures de compétition, petit-déjeuner habituel.","Entre ton chrono dans « Mon ressenti » (champ durée) : le tableau de bord affiche le verdict.","Si une course de 5 km a lieu près de chez toi ce jour-là, elle peut remplacer le test."],
  cpTxt:"Lecture du chrono, par rapport à ton 42'32 (≈ 20'24 sur 5 km). 20'15 ou moins : progression. 20'16 à 20'45 : niveau maintenu, objectif rempli. Au-delà de 20'45 : légère baisse, normale avec les fêtes et rattrapable en 2 à 3 semaines.",
  tired:"Malade ou très fatigué : reporte le test au 2 ou 3 janvier, et fais 30' d'EF à la place."}
 ]}
];

/* ---------- CYCLES ---------- */
const CYCLES=[
  {id:"hiver",name:"Hiver 2026",full:"Entretien & progression",from:"2026-11-16",to:"2026-12-31",showFrom:"2026-11-15",lastMove:"2026-12-31",plan:PLAN_H,zones:["R","E","AA","SE","AK","A5","VM"]},
  {id:"10k",name:"Prépa 10 km",full:"10 km HOKA Paris Centre",from:"2026-10-19",to:"2026-11-15",lastMove:"2026-11-14",plan:PLAN,zones:["Z1","Z2","Z3","Z4","Z5","Z6"]}
];
PLAN_H.forEach(w=>w.sessions.forEach(s=>{if(s.vma)s.main=s.vma(VMA_EST);}));
CYCLES.forEach(c=>{c.all=finalize(c.plan,c.id);c.main=c.all.filter(s=>!s.opt);});

/* VMA mesurée (distance du demi-Cooper, en m, dans state.logs.vma.d) → recalage des fractionnés */
function vmaMeasured(){const l=typeof state!=="undefined"&&state.logs&&state.logs.vma,d=l&&+l.d;return d>=1100&&d<=2200?d/100:null;}
let VMA_CUR=VMA_EST;
function applyVMA(){
  const v=vmaMeasured()||VMA_EST;if(v===VMA_CUR)return;VMA_CUR=v;
  CYCLES[0].all.forEach(s=>{if(s.vma){s.main=s.vma(v);calcSess(s);}});
  Z.VM.r=v===VMA_EST?"3'45 – 3'55":fm(vp(v,105))+" – "+fm(vp(v,100));
}
const ALL=CYCLES.flatMap(c=>c.all);
const cycleOf=s=>CYCLES.find(c=>c.id===s.cy);
