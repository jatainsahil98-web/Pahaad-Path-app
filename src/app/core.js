/* PahaadPath core: road network, risk engine, traffic model, planner and trip screens (the Stage 1 prototype).
   The feature files (src/features*.js) are spliced in at the FEATURES_JS marker by the build (vite.config.mjs), so they
   share this scope; data comes from virtual:pp-data. */
(function(){
'use strict';
/* the page as delivered, before any rendering: "share the app" hands this on as a file */
const PRISTINE='<!DOCTYPE html>\n'+document.documentElement.outerHTML;
/* ---------- road network (demo values are marked in the footer) ----------
   Places are towns and junctions on the main roads of Uttarakhand and the approaches from Delhi NCR, western and eastern UP,
   Haryana and Chandigarh. Roads are the links between them. Distances are approximate road kilometres rounded by hand
   (replace with a routing engine's distances in production). Speeds are typical free-flow km/h.
   susc (slope susceptibility class 1-3) and hist (past incident count 0-5) are demo placeholders. Production values come from
   GSI susceptibility maps and the NASA landslide catalog. tw says how strongly holiday crowds load a road (1 = typical NH choke point).
   mult scales the rain of the simulated storm so that the demo weather is not uniform across the hills. */
const PLACES={
 /* [English, Hindi, lat, lon, kind (g outside Uttarakhand, p plains and foothills, h hills), stay (0 = junction, no lodging)] */
 delhi:['Delhi NCR','दिल्ली एनसीआर',28.613,77.209,'g'],
 gurugram:['Gurugram','गुरुग्राम',28.459,77.026,'g'],
 noida:['Noida','नोएडा',28.535,77.391,'g'],
 ghaziabad:['Ghaziabad','गाज़ियाबाद',28.667,77.449,'g'],
 meerut:['Meerut','मेरठ',28.984,77.706,'g'],
 muzaffarnagar:['Muzaffarnagar','मुज़फ़्फ़रनगर',29.470,77.704,'g'],
 saharanpur:['Saharanpur','सहारनपुर',29.968,77.546,'g'],
 najibabad:['Najibabad','नजीबाबाद',29.613,78.343,'g'],
 moradabad:['Moradabad','मुरादाबाद',28.838,78.773,'g'],
 bareilly:['Bareilly','बरेली',28.367,79.430,'g'],
 chandigarh:['Chandigarh','चंडीगढ़',30.733,76.779,'g'],
 paonta:['Paonta Sahib','पांवटा साहिब',30.436,77.624,'g'],
 roorkee:['Roorkee','रुड़की',29.854,77.888,'p'],
 haridwar:['Haridwar','हरिद्वार',29.946,78.164,'p'],
 rishikesh:['Rishikesh','ऋषिकेश',30.087,78.268,'p'],
 dehradun:['Dehradun','देहरादून',30.317,78.032,'p'],
 mohand:['Mohand','मोहंड',30.170,77.870,'p',0],
 vikasnagar:['Vikasnagar','विकासनगर',30.470,77.770,'p'],
 kotdwar:['Kotdwar','कोटद्वार',29.746,78.523,'p'],
 kashipur:['Kashipur','काशीपुर',29.213,78.957,'p'],
 rudrapur:['Rudrapur','रुद्रपुर',28.976,79.400,'p'],
 ramnagar:['Ramnagar (Corbett)','रामनगर (कॉर्बेट)',29.394,79.126,'p'],
 haldwani:['Haldwani','हल्द्वानी',29.222,79.513,'p'],
 kathgodam:['Kathgodam','काठगोदाम',29.268,79.528,'p'],
 mussoorie:['Mussoorie','मसूरी',30.459,78.064,'h'],
 dhanaulti:['Dhanaulti','धनौल्टी',30.417,78.247,'h'],
 chamba:['Chamba','चंबा',30.346,78.395,'h'],
 tehri:['New Tehri','नई टिहरी',30.378,78.433,'h'],
 chakrata:['Chakrata','चकराता',30.703,77.870,'h'],
 devprayag:['Devprayag','देवप्रयाग',30.146,78.598,'h'],
 srinagar:['Srinagar (Garhwal)','श्रीनगर (गढ़वाल)',30.222,78.783,'h'],
 pauri:['Pauri','पौड़ी',30.153,78.782,'h'],
 rudraprayag:['Rudraprayag','रुद्रप्रयाग',30.284,78.981,'h'],
 karnaprayag:['Karnaprayag','कर्णप्रयाग',30.263,79.222,'h'],
 chamoli:['Chamoli (Gopeshwar)','चमोली (गोपेश्वर)',30.401,79.319,'h'],
 joshimath:['Joshimath','जोशीमठ',30.555,79.564,'h'],
 auli:['Auli','औली',30.527,79.571,'h'],
 govindghat:['Govindghat','गोविंदघाट',30.623,79.564,'h'],
 ghangaria:['Ghangaria (Hemkund, Valley of Flowers)','घांघरिया (हेमकुंड, फूलों की घाटी)',30.700,79.600,'h'],
 badrinath:['Badrinath','बद्रीनाथ',30.743,79.494,'h'],
 guptkashi:['Guptkashi','गुप्तकाशी',30.524,79.075,'h'],
 sonprayag:['Sonprayag','सोनप्रयाग',30.625,79.094,'h'],
 gaurikund:['Gaurikund','गौरीकुंड',30.654,79.040,'h'],
 kedarnath:['Kedarnath','केदारनाथ',30.735,79.067,'h'],
 gwaldam:['Gwaldam','ग्वालदम',30.052,79.625,'h'],
 lansdowne:['Lansdowne','लैंसडाउन',29.838,78.684,'h'],
 uttarkashi:['Uttarkashi','उत्तरकाशी',30.727,78.435,'h'],
 bhatwari:['Bhatwari','भटवाड़ी',30.810,78.600,'h'],
 harsil:['Harsil','हर्षिल',31.038,78.745,'h'],
 gangotri:['Gangotri','गंगोत्री',30.995,78.940,'h'],
 purola:['Purola','पुरोला',30.879,78.088,'h'],
 barkot:['Barkot','बड़कोट',30.808,78.206,'h'],
 janki:['Janki Chatti','जानकी चट्टी',30.988,78.440,'h'],
 yamunotri:['Yamunotri','यमुनोत्री',31.013,78.456,'h'],
 bhimtal:['Bhimtal','भीमताल',29.347,79.564,'h'],
 nainital:['Nainital','नैनीताल',29.391,79.456,'h'],
 bhowali:['Bhowali','भोवाली',29.388,79.519,'h'],
 kainchi:['Kainchi Dham','कैंची धाम',29.441,79.514,'h'],
 almora:['Almora','अल्मोड़ा',29.597,79.659,'h'],
 ranikhet:['Ranikhet','रानीखेत',29.644,79.432,'h'],
 kausani:['Kausani','कौसानी',29.843,79.602,'h'],
 bageshwar:['Bageshwar','बागेश्वर',29.838,79.771,'h'],
 pithoragarh:['Pithoragarh','पिथौरागढ़',29.583,80.218,'h'],
 munsiyari:['Munsiyari','मुनस्यारी',30.068,80.238,'h']
};
/* Shrines and trek heads that a vehicle cannot reach: the road ends at "head" and the rest is on foot or by pony. km and typical hours up. */
const FOOT={
 kedarnath:{head:'gaurikund',km:16,h:7},
 yamunotri:{head:'janki',km:6,h:3},
 ghangaria:{head:'govindghat',km:13,h:5}
};
/* Places where return traffic from the hills starts. They give each plains stretch its return-wave offset. */
const HUBS=['haridwar','rishikesh','dehradun','mussoorie','nainital','bhimtal','ramnagar','almora','ranikhet','kainchi'];

const N={},S={},EDGES=[],ADJ={};
Object.keys(PLACES).forEach(id=>{const a=PLACES[id];N[id]={id,en:a[0],hi:a[1],lat:a[2],lon:a[3],k:a[4],stay:a[5]!==0,hub:HUBS.indexOf(id)>=0,foot:FOOT[id]||null};});
function addEdge(a,b,km,kind,susc,hist,v,tw,x){
  x=x||{};
  const plain=kind==='P',A=N[a],B=N[b];
  if(!A||!B)throw new Error('bad edge '+a+'-'+b);
  const e={id:a+'-'+b,a,b,km,plain,susc:plain?0:susc,hist:plain?0:hist,v:v||(plain?50:28),tw:tw==null?.5:tw,
    mult:x.mult!=null?x.mult:(plain?.55:1),spots:x.spots||[],jam:x.jam||null,cd:!!x.cd,
    cLat:(A.lat+B.lat)/2,cLon:(A.lon+B.lon)/2};
  e.h0=km/e.v;EDGES.push(e);S[e.id]=e;(ADJ[a]=ADJ[a]||[]).push(e);(ADJ[b]=ADJ[b]||[]).push(e);
}
const Pl=(a,b,km,v,tw,x)=>addEdge(a,b,km,'P',0,0,v,tw,x);
const Hl=(a,b,km,susc,hist,v,tw,x)=>addEdge(a,b,km,'H',susc,hist,v,tw,x);

/* plains and foothill roads */
Pl('delhi','gurugram',30,35,.4);Pl('delhi','noida',25,35,.4);Pl('delhi','ghaziabad',25,38,.5);Pl('noida','ghaziabad',20,40,.2);
Pl('delhi','meerut',70,70,.9);Pl('ghaziabad','meerut',50,55,.5);
Pl('meerut','muzaffarnagar',55,55,1);Pl('muzaffarnagar','roorkee',52,50,1);Pl('muzaffarnagar','saharanpur',70,55,.5);
Pl('delhi','saharanpur',175,60,.7);Pl('saharanpur','roorkee',38,50,.6);
Pl('roorkee','haridwar',33,40,1.1);Pl('haridwar','rishikesh',24,32,1.3);
Pl('haridwar','dehradun',54,45,.9);Pl('rishikesh','dehradun',43,40,.9);
Pl('saharanpur','mohand',42,50,.8);
Pl('meerut','najibabad',112,50,.6);Pl('najibabad','kotdwar',27,45,.6);
Pl('ghaziabad','moradabad',140,60,.8);Pl('moradabad','kashipur',55,50,.9);Pl('kashipur','rudrapur',55,50,.6);Pl('moradabad','rudrapur',88,55,.9);
Pl('kashipur','ramnagar',35,45,.7);Pl('rudrapur','haldwani',40,50,1);Pl('ramnagar','haldwani',62,40,.6);Pl('bareilly','rudrapur',75,55,.5);
Pl('haldwani','kathgodam',7,30,1.2);
Pl('chandigarh','paonta',115,55,.5);Pl('paonta','dehradun',50,45,.6);Pl('chandigarh','saharanpur',120,55,.4);
Pl('dehradun','vikasnagar',38,45,.4);

/* hill roads */
Hl('mohand','dehradun',25,1,2,38,.8);
Hl('dehradun','mussoorie',35,2,3,24,1.5,{mult:1.2,jam:[{en:'Kempty Road',hi:'केम्प्टी रोड'},{en:'Mall Road',hi:'माल रोड'},{en:'Picture Palace',hi:'पिक्चर पैलेस'},{en:'Landour Bazaar',hi:'लैंडौर बाज़ार'}]});
Hl('mussoorie','dhanaulti',24,2,2,25,.5);Hl('dhanaulti','chamba',28,2,2,25,.4);Hl('chamba','tehri',15,2,2,28,.4);
Hl('vikasnagar','chakrata',52,2,2,25,.25);
Hl('dehradun','purola',115,2,2,28,.45,{mult:1.1,cd:1});
Hl('purola','barkot',35,2,2,28,.4,{mult:1.1,cd:1});
Hl('barkot','janki',40,3,4,25,.3,{mult:1.4,cd:1,spots:[{en:'Silai Band',hi:'सिलाई बैंड',f:.35},{en:'Naukainchi',hi:null,f:.62}]});
Hl('rishikesh','chamba',60,2,2,30,.5,{cd:1,spots:[{en:'Nagni',hi:null,f:.9}]});
Hl('chamba','uttarkashi',100,3,3,30,.4,{mult:1.1,cd:1});
Hl('uttarkashi','bhatwari',29,3,3,28,.3,{mult:1.2,cd:1,spots:[{en:'Bhatwari',hi:'भटवाड़ी',f:.96}]});
Hl('bhatwari','harsil',49,3,3,28,.3,{mult:1.1,cd:1});
Hl('harsil','gangotri',25,3,3,28,.3,{mult:.9,cd:1});
Hl('rishikesh','devprayag',74,3,4,30,.6,{cd:1,spots:[{en:'Totaghati',hi:'तोताघाटी',f:.55}]});
Hl('devprayag','srinagar',34,2,2,30,.5,{cd:1});
Hl('srinagar','rudraprayag',33,2,3,30,.5,{mult:1.1,cd:1,spots:[{en:'Sirobagad',hi:'सिरोबगड़',f:.65}]});
Hl('rudraprayag','karnaprayag',32,2,2,28,.4,{mult:1.2,cd:1});
Hl('karnaprayag','chamoli',32,3,3,28,.35,{mult:1.3,cd:1,spots:[{en:'Nandprayag to Bhanerpani',hi:'नंदप्रयाग से भनेरपानी',f:.35},{en:'Baldouda bridge',hi:'बलदौड़ा पुल',f:.8}]});
Hl('chamoli','joshimath',50,3,4,26,.35,{mult:1.2,cd:1});
Hl('joshimath','govindghat',22,3,4,24,.3,{mult:1.3,cd:1});
Hl('govindghat','badrinath',20,3,5,22,.3,{mult:1.4,cd:1,spots:[{en:'Lambagad to Hanumanchatti',hi:'लामबगड़ से हनुमानचट्टी',f:.35}]});
Hl('joshimath','auli',14,3,3,22,.5,{mult:1.3});
Hl('rudraprayag','guptkashi',40,2,3,28,.4,{mult:1.2,cd:1});
Hl('guptkashi','sonprayag',30,3,4,26,.5,{mult:1.4,cd:1,spots:[{en:'Phata to Doliya Devi',hi:'फाटा से डोलिया देवी',f:.45}]});
Hl('sonprayag','gaurikund',5,3,5,15,.4,{mult:1.5,cd:1,spots:[{en:'Munkatia slide zone',hi:'मुनकटिया',f:.5}]});
Hl('srinagar','pauri',30,2,2,28,.35);Hl('pauri','kotdwar',108,2,2,32,.3);Hl('kotdwar','lansdowne',40,2,2,28,.3);
Hl('karnaprayag','gwaldam',40,2,2,28,.25);Hl('gwaldam','kausani',40,2,2,28,.3);
Hl('kathgodam','bhimtal',12,1,1,30,.8);Hl('bhimtal','nainital',22,1,2,28,.9);Hl('kathgodam','nainital',34,2,3,26,1.5,{mult:1.1});
Hl('kathgodam','bhowali',28,2,2,30,1.2);Hl('bhowali','nainital',11,2,2,24,1.2);
Hl('bhowali','kainchi',9,2,2,20,1.3,{jam:[{en:'Kainchi Dham',hi:'कैंची धाम'}]});
Hl('kainchi','almora',44,2,3,28,.8);Hl('almora','ranikhet',50,2,2,28,.5);Hl('ranikhet','ramnagar',96,2,3,30,.4,{mult:1.1});
Hl('almora','kausani',53,2,2,28,.35);Hl('kausani','bageshwar',40,2,2,28,.3);
Hl('almora','pithoragarh',115,2,3,28,.3,{mult:1.1});Hl('pithoragarh','munsiyari',128,3,4,26,.2,{mult:1.3});

/* ---------- derived: free-flow hours from Delhi, travel direction and wave offsets ----------
   Holiday crowds are a wave: a car that leaves Delhi at 08:00 reaches Haridwar about 4 h later and a hill station about 5 h later.
   offU = free-flow hours from Delhi to the middle of a stretch. offD = hours from the nearest tourist hub beyond the stretch (Rishikesh,
   Mussoorie, Nainital...) to the stretch, which is how long return traffic has been on the road. A stretch therefore sees the wave that
   started at its origin earlier, not the clock-time profile of the origin. Stretches beyond every hub use the local clock for return traffic. */
const HOURS_FROM_DELHI={},SPT_PARENT={};
function deriveOffsets(){
  Object.keys(HOURS_FROM_DELHI).forEach(k=>{delete HOURS_FROM_DELHI[k];delete SPT_PARENT[k];});
  const d=HOURS_FROM_DELHI,done={};d.delhi=0;
  for(;;){
    let u=null,b=Infinity;Object.keys(d).forEach(k=>{if(!done[k]&&d[k]<b){b=d[k];u=k;}});
    if(u===null)break;done[u]=1;
    ADJ[u].forEach(e=>{if(e.virtual)return;const v=e.a===u?e.b:e.a,nd=b+e.h0;if(d[v]==null||nd<d[v]){d[v]=nd;SPT_PARENT[v]=e;}});
  }
  EDGES.forEach(e=>{const ta=d[e.a],tb=d[e.b];e.up=tb>=ta;e.offU=(ta+tb)/2;e.offD=Infinity;});
  HUBS.forEach(h=>{
    let v=h;
    while(v!=='delhi'&&SPT_PARENT[v]){
      const e=SPT_PARENT[v],mid=(d[e.a]+d[e.b])/2,c=d[h]-mid;
      if(c>=0&&c<e.offD)e.offD=c;
      v=e.a===v?e.b:e.a;
    }
  });
  EDGES.forEach(e=>{if(!isFinite(e.offD))e.offD=0;});
}
deriveOffsets();


/* ---------- landslide risk engine ---------- */
/* Caine (1980) global rainfall intensity-duration threshold I = 14.82 * D^-0.39 (mm/h, D in hours),
   expressed as accumulated depth: depth = I*D = 14.82 * D^0.61 */
const CAINE=d=>14.82*Math.pow(d,0.61);
/* rainfall threshold for a stretch: per-zone curves fitted to PWD closures (python/pahaadpath/calibrate.py) when the backtest
   adopted them (they beat Caine on held-out days), Caine otherwise. THRESH is baked in by features3.js. */
function edThr(seg){
  const th=THRESH;if(!th)return CAINE;
  const z=(th.zones&&th.zones[String(seg.susc)])||th.pooled;return d=>z.alpha*Math.pow(d,z.gamma);
}
let THR=1; // threshold multiplier: 1 = Caine as published; the Proof tab varies it to show sensitivity
const IST=5.5*3600e3;
const PAST=72,FUT=384,SERIES_LEN=PAST+FUT; // 3 days of past rain and up to 16 days of forecast, hourly
const MAX_AHEAD=14; // travel dates up to 14 days from today
const DAY_FROM=5,DAY_TO=19; // hill stretches must lie inside this daylight window
const RESUME=6,MIN_REST=6; // after a night halt: resume at 06:00, never less than 6 h of rest
function sumRain(arr,from,to){ // hours relative to the start of the current hour; bin j covers [j-72, j-71)
  let tot=0;const lo=Math.max(from,-PAST),hi=Math.min(to,SERIES_LEN-PAST);
  for(let j=Math.floor(lo);j<hi;j++){const b0=Math.max(lo,j),b1=Math.min(hi,j+1);if(b1>b0)tot+=(arr[j+PAST]||0)*(b1-b0);}
  return tot;
}
function rainAt(arr,a){const j=Math.max(0,Math.min(SERIES_LEN-1,Math.floor(a)+PAST));return arr[j]||0;}
/* Simulated weather. "Heavy-rain day" is a storm around the start of today, a second one tomorrow evening, then a pulse every
   2-3 days of varying strength, so that a different travel date gives a different answer. Not a forecast. */
const PULSES=[[33,3.6,4],[99,2.2,4],[165,7.5,5],[231,1.6,4],[297,6,5],[363,3,4]];
function storm(t){
  if(t<-48)return .2; if(t<-30)return .3; if(t<-12)return 1.6;
  if(t<0)return 3.2+4*Math.exp(-Math.pow((t+5)/3.5,2));
  if(t<5)return 4.2-.8*t;
  let r=t<28?.15:.5;
  PULSES.forEach(p=>{r+=p[1]*Math.exp(-Math.pow((t-p[0])/p[2],2));});
  return r;
}
function simSeries(kind){
  const out={};
  EDGES.forEach((e,idx)=>{
    const a=[];for(let i=0;i<SERIES_LEN;i++){
      const wob=1+.18*Math.sin(i*1.7+idx*2.1);
      a.push(kind==='clear'?Math.max(0,.06*wob*(1+Math.sin(i*.4+idx))):storm(i-PAST)*e.mult*wob);
    }
    out[e.id]=a;
  });
  return out;
}
const TYPEW={landslide:1,washed:1,bridge:1,debris:.7};
/* how long a report keeps its weight: a slide or a washed-out road stays shut far longer than loose debris takes to clear */
const TYPEH={landslide:24,washed:24,bridge:48,debris:8};
function repWeight(list,segId,a,nowMs){
  const rs=list.filter(r=>r.seg===segId).sort((x,y)=>x.ts-y.ts);
  let w=0;const latestClear=rs.filter(r=>r.type==='clear').reduce((m,r)=>Math.max(m,r.ts),0);
  rs.forEach(r=>{
    if(r.type==='clear'||r.ts<latestClear)return;
    const age=(nowMs-r.ts)/3600e3+a;
    const decay=Math.max(0,1-age/(TYPEH[r.type]||6));
    w+=(TYPEW[r.type]*.6+.2*Math.min(r.conf,3))*decay;
  });
  return Math.min(w,1);
}
function segScore(seg,a,c){ // a = arrival time, hours from start of current hour
  if(seg.plain)return{score:0,ratio:0,P6:0,P24:0,P72:0,rw:0,blocked:false};
  const s=c.series[seg.id];
  const P6=sumRain(s,a-6,a),P24=sumRain(s,a-24,a),P72=sumRain(s,a-72,a);
  const f=edThr(seg),ratio=Math.max(P6/f(6),P24/f(24),P72/f(72))/THR;
  const trig=Math.min(ratio,1.5)/1.5;
  const pred=.6*[0,.15,.55,1][seg.susc]+.4*Math.min(seg.hist/5,1);
  const v6=v6Day(seg,a,c); // model v6 (checked against PWD closures) for the day the stretch is driven, from the data pack
  const v5=v6==null&&modelOn()?modelRisk(seg,a,c,P24,P72):null; // trained model (features3.js) when baked in and chosen
  const base=v6!=null?v6/100:v5?v5.base:trig*(.35+.65*pred)+.08*pred;
  const rw=repWeight(c.reports,seg.id,a,c.nowMs);
  let score=Math.round(100*Math.min(1,base+.4*rw));
  const blocked=rw>=.9;if(blocked)score=Math.max(score,85);
  return{score,ratio,P6,P24,P72,rw,blocked,mem:v5?v5.mem:memNote(seg,a,c)};
}
const lvl=s=>s<35?0:s<65?1:2;
const tlvl=c=>c<18?0:c<40?1:2;
const riskPen=s=>s<35?0:s<65?(s-35)/30:1+(s-65)/35*3;

/* ---------- expected-traffic model (calendar-driven) ---------- */
/* Demand = phase intensity x hourly profile for the direction of travel. Load = demand x stretch weight.
   Congestion index ci = 100 (1 - exp(-1.25 load)); delay multiplier = 1 + 2.4 (ci/100)^2, capped at 3.2.
   All coefficients are demo placeholders. They are meant to be calibrated against typical-traffic data
   (Google Routes, TomTom, HERE, Mappls) or Uttarakhand Police vehicle counters; a live provider can be plugged in. */
const g=(h,c,w)=>Math.exp(-Math.pow((h-c)/w,2));
const PH={wd:{m:.12,sh:'mid'},weve:{m:.45,sh:'eve'},sat:{m:.5,sh:'start'},sun:{m:.55,sh:'end'},
 eve:{m:.85,sh:'eve'},start:{m:1,sh:'start'},mid:{m:.55,sh:'mid'},end:{m:1,sh:'end'},after:{m:.45,sh:'after'}};
const SH={
 eve:{up:h=>Math.min(1,.04+.9*g(h,19,3)+.15*g(h,23.5,1.5)),dn:h=>.03},
 start:{up:h=>Math.min(1,.05+Math.max(.95*g(h,8,2.6),.55*g(h,5.2,1.3),.3*g(h,13,3))),dn:h=>.04+.1*g(h,16,4)},
 mid:{up:h=>.04+.35*g(h,10,3.5),dn:h=>.04+.35*g(h,16,4)},
 end:{up:h=>.03+.15*g(h,9,3),dn:h=>Math.min(1,.06+.9*g(h,17.5,3.2)+.35*g(h,22,2))},
 after:{up:h=>.03,dn:h=>.05+.6*g(h,6,2.2)+.1*g(h,15,4)}
};
const dI=(y,m,d)=>Math.floor(Date.UTC(y,m-1,d)/864e5); // civil date as day number
/* Long weekends from the Esquire India 2026 list (Oct to Dec). Dates outside this list use the plain Fri/Sat/Sun pattern. */
const CAL=[
 {en:'Gandhi Jayanti',hi:'गांधी जयंती',s:dI(2026,10,2),e:dI(2026,10,4)},
 {en:'Dussehra',hi:'दशहरा',s:dI(2026,10,17),e:dI(2026,10,20)},
 {en:'Guru Nanak Jayanti',hi:'गुरु नानक जयंती',s:dI(2026,11,21),e:dI(2026,11,24)},
 {en:'Christmas',hi:'क्रिसमस',s:dI(2026,12,25),e:dI(2026,12,27)}
];
function calInfo(idx){
  for(const c of CAL){
    if(idx>=c.s-1&&idx<=c.e+1)return{ph:idx===c.s-1?'eve':idx===c.s?'start':idx===c.e?'end':idx===c.e+1?'after':'mid',ev:c};
  }
  const dow=(idx+4)%7; // 0 = Sunday (day 0 was a Thursday)
  return{ph:dow===5?'weve':dow===6?'sat':dow===0?'sun':'wd',ev:null};
}
let provider=null; // optional live-traffic hook: (segId, 'up'|'dn', ms) -> {ci, dm} or null
function setTrafficProvider(fn){provider=fn;}
function dmOf(ci){return Math.min(3.2,1+2.4*Math.pow(ci/100,2));}
function traffic(seg,dir,ms){
  if(provider){const p=provider(seg.id,dir,ms);if(p&&p.dm)return p;}
  const me=ms-((dir==='up'?seg.offU:seg.offD)||0)*3600e3;
  const idx=dayOf(me),h=((me+IST)%864e5)/3600e3,p=PH[phaseOf(idx).ph];
  const load=p.m*SH[p.sh][dir](h)*seg.tw,ci=100*(1-Math.exp(-1.25*load));
  return{ci,dm:dmOf(ci)};
}

/* ---------- state ---------- */
const st={view:'trip',tiles:null,useOD:true,opsH:0,lang:'en',scn:'live',tday:'cal',from:'delhi',to:'mussoorie',date:'',dateIdx:0,dep:null,pick:null,layer:'risk',tab:'route',
  reports:[],user:[],series:null,nowMs:0,hour0:0,src:'sim',err:'',vfrom:null,vto:null};
const dayOf=ms=>Math.floor((ms+IST)/864e5);
const hourOf=ms=>new Date(ms+IST).getUTCHours();
const dayStartMs=idx=>idx*864e5-IST;
function phaseOf(idx){
  const o=idx-st.dateIdx;
  switch(st.tday){
    case 'normal':return{ph:'wd'};
    case 'weekend':return{ph:o===0?'sat':o===1?'sun':'wd'};
    case 'leve':return{ph:o<=0?'eve':o===1?'start':o===2?'mid':o===3?'end':'after'};
    case 'lstart':return{ph:o<=0?'start':o===1?'mid':o===2?'end':'after'};
    case 'lend':return{ph:o<=0?'end':o===1?'after':'wd'};
    default:return calInfo(idx);
  }
}
function dateStr(idx){const d=new Date(idx*864e5);return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');}
function parseDate(s){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');return m?dI(+m[1],+m[2],+m[3]):null;}
function hod(h,c){return (((c.hour0+h*3600e3)+IST)%864e5)/3600e3;}
function isDark(a,b,c){const x=hod(a,c),y=hod(b,c);return x<DAY_FROM||x>=DAY_TO||y<DAY_FROM||y>=DAY_TO||(b-a)>(DAY_TO-DAY_FROM);}
function resumeAfter(t,c){ // next 06:00 after t, and at least MIN_REST hours of rest
  const ms=c.hour0+t*3600e3;let r=dayOf(ms)*864e5-IST+RESUME*3600e3;if(r<=ms)r+=864e5;
  return Math.max((r-c.hour0)/3600e3,t+MIN_REST);
}

/* ---------- places that are not in the built-in list (snapped to the nearest mapped town) ---------- */
const VN={}; // virtual nodes by id
const NODE=id=>N[id]||VN[id];
const adjOf=id=>ADJ[id]||[];
function clearVirtual(){
  Object.keys(VN).forEach(id=>{
    const e=VN[id].edge;
    [e.a,e.b].forEach(k=>{if(ADJ[k])ADJ[k]=ADJ[k].filter(x=>x!==e);});
    delete S[e.id];delete VN[id];
  });
}
function hav(la1,lo1,la2,lo2){const r=Math.PI/180,dl=(la2-la1)*r,dn=(lo2-lo1)*r,a=Math.sin(dl/2)**2+Math.cos(la1*r)*Math.cos(la2*r)*Math.sin(dn/2)**2;return 12742*Math.asin(Math.sqrt(a));}
function nearestNode(lat,lon){
  let best=null,bd=1e9;
  Object.keys(N).forEach(id=>{if(N[id].foot)return;const d=hav(lat,lon,N[id].lat,N[id].lon);if(d<bd){bd=d;best=id;}});
  return{id:best,km:bd};
}
/* Returns the new node id, or null if the place is too far from any mapped road. */
function addVirtual(vid,name,lat,lon){
  const nn=nearestNode(lat,lon),snap=N[nn.id],hill=snap.k==='h';
  const lim=hill?45:150;if(nn.km>lim)return null;
  const km=Math.max(2,Math.round(nn.km*(hill?1.8:1.3)));
  const v={id:vid,en:name,hi:name,lat,lon,k:snap.k,stay:true,hub:false,foot:null,virtual:true,snap:nn.id,gc:nn.km};
  VN[vid]=v;
  const e={id:vid+'~'+nn.id,a:nn.id,b:vid,km,plain:!hill,susc:hill?2:0,hist:hill?2:0,v:hill?25:50,tw:.3,mult:hill?1:.55,spots:[],jam:null,cd:false,
    cLat:(lat+snap.lat)/2,cLon:(lon+snap.lon)/2,virtual:true};
  e.h0=km/e.v;
  e.up=hav(lat,lon,N.delhi.lat,N.delhi.lon)>=hav(snap.lat,snap.lon,N.delhi.lat,N.delhi.lon);
  const ref=(ADJ[nn.id]||[])[0]||{offU:0,offD:0};
  e.offU=(HOURS_FROM_DELHI[nn.id]||0)+e.h0/2*(e.up?1:-1);e.offD=ref.offD||0;
  v.edge=e;S[e.id]=e;(ADJ[nn.id]=ADJ[nn.id]||[]).push(e);ADJ[vid]=[e];
  if(st.series)st.series[e.id]=st.series[(ADJ[nn.id].find(x=>!x.virtual)||ref).id]||new Array(SERIES_LEN).fill(0);
  return vid;
}

/* ---------- route search and trip simulation ---------- */
function ctx(){return{series:st.series,daily:st.daily,dday0:st.dday0,reports:st.reports.concat(st.user,sharedReports()),nowMs:st.nowMs,hour0:st.hour0,
  v6:(st.src==='live'||st.src==='cache')&&st.v6?st.v6:null};} // v6 day scores from the data pack apply to real forecasts only
function evalEdge(e,rev,start,c){
  const dir=(e.up!==rev)?'up':'dn';
  let tr=traffic(e,dir,c.hour0+(start+e.h0/2)*3600e3);
  let dur=e.h0*tr.dm;
  tr=traffic(e,dir,c.hour0+(start+dur/2)*3600e3);dur=e.h0*tr.dm;
  const rain=rainAt(c.series[e.id],start+dur/2);
  const slow=1+.03*Math.min(rain,10);
  const rainAdd=dur*(1-1/slow);dur*=slow;
  const r=segScore(e,start+dur/2,c);
  return Object.assign({seg:e,rev,from:rev?e.b:e.a,to:rev?e.a:e.b,start,end:start+dur,dur,norm:e.h0,x:dur/e.h0,ci:tr.ci,rain,rainAdd},r);
}
/* time-dependent Dijkstra: cost is drive time, optionally inflated by landslide risk (lambda), with a soft penalty for dark hill roads */
function routeSearch(src,dst,dep,c,mode){
  const best={},arr={},prev={},done={};best[src]=0;arr[src]=dep;
  for(;;){
    let u=null,bu=Infinity;for(const k in best){if(!done[k]&&best[k]<bu){bu=best[k];u=k;}}
    if(u===null||u===dst)break;done[u]=1;
    const adj=adjOf(u);
    for(let i=0;i<adj.length;i++){
      const e=adj[i],rev=e.b===u,v=rev?e.a:e.b;if(done[v])continue;
      let t0=arr[u],extra=0,r=evalEdge(e,rev,t0,c);
      if(!e.plain&&isDark(t0,r.end,c)){
        if(u!==src&&NODE(u).stay){const t1=resumeAfter(t0,c);extra=(t1-t0)*.35;t0=t1;r=evalEdge(e,rev,t0,c);}
        else extra=r.dur*.4;
      }
      let cost=r.dur+extra;
      if(mode.lambda){cost=r.dur*(1+mode.lambda*riskPen(r.score))+extra;if(r.blocked)cost+=mode.lambda*30;}
      if(mode.avoid&&mode.avoid[e.id])cost*=mode.avoid[e.id];
      const nc=bu+cost;
      if(best[v]==null||nc<best[v]){best[v]=nc;arr[v]=r.end;prev[v]={u,e,rev};}
    }
  }
  if(best[dst]==null||dst!==src&&!prev[dst])return null;
  const path=[];let v=dst;while(v!==src){const p=prev[v];path.unshift({e:p.e,rev:p.rev});v=p.u;}
  path.cost=best[dst];path.arrive=arr[dst];
  return path;
}
const fromOf=l=>l.rev?l.e.b:l.e.a;
/* Walks a fixed path from a departure time. Hill stretches must lie inside 05:00-19:00; where one would not, the trip halts for the
   night at the latest town with lodging before it, and resumes at 06:00 (at least 6 h of rest). */
function simulate(path,dep,c,allowHalt){
  const rows=[],halts=[];let t=dep,i=0,dayStart=0,guard=0;
  while(i<path.length&&guard++<200){
    const L=path[i],r=evalEdge(L.e,L.rev,t,c);
    r.dark=!L.e.plain&&isDark(t,r.end,c);
    if(r.dark&&allowHalt&&halts.length<4){
      let j=i;while(j>dayStart&&!(NODE(fromOf(path[j])).stay&&j>dayStart))j--;
      if(j>dayStart){
        const tj=j<rows.length?rows[j].start:t;
        rows.length=j;
        const rt=resumeAfter(tj,c);
        halts.push({at:j,node:fromOf(path[j]),arr:tj,resume:rt});
        t=rt;i=j;dayStart=j;continue;
      }
    }
    rows.push(r);t=r.end;i++;
  }
  return summarize(path,rows,halts,dep);
}
function summarize(path,rows,halts,dep){
  const hill=rows.filter(r=>!r.seg.plain);
  const worst=hill.length?hill.reduce((m,r)=>r.score>m.score?r:m,hill[0]):null;
  const sum=f=>rows.reduce((s,r)=>s+f(r),0);
  const totalH=sum(r=>r.dur),normH=sum(r=>r.norm),km=sum(r=>r.seg.km);
  const tci=totalH?sum(r=>r.ci*r.dur)/totalH:0;
  const slowest=rows.reduce((m,r)=>(r.dur-r.norm)>(m.dur-m.norm)?r:m,rows[0]);
  const score=worst?worst.score:0;
  rows.forEach((r,idx)=>{r.day=1+halts.filter(h=>h.at<=idx).length;});
  let cum=0;rows.forEach(r=>{r.kmStart=cum;cum+=r.seg.km;});
  return{path,rows,halts,dep,end:rows.length?rows[rows.length-1].end:dep,elapsed:rows.length?rows[rows.length-1].end-dep:0,
    totalH,normH,totalKm:km,score,level:lvl(score),worst,hasHill:hill.length>0,hillKm:hill.reduce((s,r)=>s+r.seg.km,0),
    tci,tlevel:tlvl(tci),slowest,rainAdd:sum(r=>r.rainAdd),nightKm:sum(r=>r.dark?r.seg.km:0),
    nodes:rows.length?[rows[0].from].concat(rows.map(r=>r.to)):[]};
}
const keyOf=p=>p.map(l=>l.e.id+(l.rev?'<':'>')).join('|');
/* Candidate routes for one departure: fastest, risk-averse (two strengths) and a deliberately different road. */
function routePlans(src,dst,dep,c){
  if(src===dst)return[];
  const paths=[],seen={};
  const add=p=>{if(!p)return;const k=keyOf(p);if(seen[k])return;seen[k]=1;paths.push(p);};
  [{n:'fast'},{n:'bal',lambda:1.2},{n:'safe',lambda:4}].forEach(m=>add(routeSearch(src,dst,dep,c,m)));
  const base=paths[0];if(!base)return[];
  /* Other real roads: force the route through each town that is not on the base road, keep sensible detours. */
  const onBase=new Set([src,dst]);base.forEach(l=>{onBase.add(l.e.a);onBase.add(l.e.b);});
  const A=NODE(src),B=NODE(dst),direct=hav(A.lat,A.lon,B.lat,B.lon);
  Object.keys(N).forEach(h=>{
    const H=N[h];if(H.foot||onBase.has(h))return;
    if(hav(A.lat,A.lon,H.lat,H.lon)+hav(H.lat,H.lon,B.lat,B.lon)>direct*1.6+60)return;
    const p1=routeSearch(src,h,dep,c,{n:'fast'});if(!p1)return;
    const p2=routeSearch(h,dst,p1.arrive,c,{n:'fast'});if(!p2)return;
    if(p1.cost+p2.cost>base.cost*1.7+1)return;
    const seq=[src];p1.concat(p2).forEach(l=>seq.push(l.rev?l.e.a:l.e.b));
    if(new Set(seq).size!==seq.length)return;
    add(p1.concat(p2));
  });
  let plans=paths.map(p=>simulate(p,dep,c,true));
  const f=plans.reduce((m,p)=>p.elapsed<m.elapsed?p:m,plans[0]);
  plans=plans.filter(p=>p===f||(p.totalKm<=f.totalKm*1.6+30&&p.elapsed<=f.elapsed*2.6+3));
  /* An alternative only helps if it differs where the risk is: drop variants that share (almost) the same hill roads. */
  const eset=(p,hillOnly)=>new Set(p.rows.filter(r=>!hillOnly||!r.seg.plain).map(r=>r.seg.id));
  const jac=(a,b)=>{let i=0;a.forEach(x=>{if(b.has(x))i++;});const u=a.size+b.size-i;return u?i/u:1;};
  const hasHill=plans.some(p=>p.hasHill),kept=[];
  plans.slice().sort((a,b)=>(a===f?-1:b===f?1:0)||a.elapsed-b.elapsed).forEach(p=>{
    if(kept.every(k=>(hasHill?jac(eset(p,true),eset(k,true))<.8:jac(eset(p,false),eset(k,false))<.6)))kept.push(p);
  });
  return kept.slice(0,4);
}
/* Fastest = least elapsed time. Safest = lowest worst-stretch risk (ties broken by time). Recommended = the safest road unless it costs a lot more time. */
function labelPlans(plans){
  if(!plans.length)return[];
  const byTime=plans.slice().sort((a,b)=>a.elapsed-b.elapsed);
  const fast=byTime[0];
  let safe=plans.slice().sort((a,b)=>(a.score-b.score)||(a.elapsed-b.elapsed))[0];
  if(safe!==fast&&safe.score>fast.score-5&&safe.level>=fast.level)safe=fast; /* not meaningfully safer */
  const out=[];
  if(safe===fast){fast.tag=plans.length>1?'best':'only';out.push(fast);}
  else{fast.tag='fast';safe.tag='safe';out.push(fast,safe);}
  byTime.forEach(p=>{if(!p.tag){p.tag='alt';out.push(p);}});
  let rec=fast;
  if(safe!==fast){
    /* recommend the safer road only when the gain is real and the extra time is modest */
    const gain=fast.score-safe.score,extra=safe.elapsed-fast.elapsed;
    if(safe.level<fast.level&&gain>=10&&extra<=Math.max(2,fast.elapsed*.35))rec=safe;
    else if(gain>=20&&extra<=Math.max(1.5,fast.elapsed*.2))rec=safe;
  }
  out.forEach(p=>{p.rec=p===rec;});
  return out.slice(0,4);
}
function slotsFor(path){
  const c=ctx(),out=[];
  for(let k=0;k<24;k++){
    const ms=dayStartMs(st.dateIdx)+k*3600e3,dep=(ms-c.hour0)/3600e3;
    const p=simulate(path,dep,c,true);p.k=k;p.ms=ms;p.past=ms<c.hour0;p.depNight=k>=21||k<4;out.push(p);
  }
  return out;
}
const slotOk=s=>!s.past&&!s.depNight&&s.nightKm===0;
function bestWindow(slots){
  const el=slots.filter(s=>slotOk(s)&&s.score<65);
  if(!el.length)return null;
  const mh=Math.min(...el.map(s=>s.halts.length));
  const rank=s=>Math.max(s.score,s.tci);
  const m=Math.min(...el.filter(s=>s.halts.length===mh).map(rank));
  const ok=slots.map(s=>slotOk(s)&&s.score<65&&s.halts.length===mh&&rank(s)<=m+8);
  let best=null,i=0;
  while(i<24){if(ok[i]){let j=i;while(j+1<24&&ok[j+1])j++;if(!best||(j-i)>(best.b-best.a))best={a:i,b:j};i=j+1;}else i++;}
  if(!best)return null;
  /* a sensible departure inside the window: near-best rank, then closest to 08:00 */
  let pick=-1;
  for(let k=best.a;k<=best.b;k++){if(rank(slots[k])<=m+3&&(pick<0||Math.abs(k-8)<Math.abs(pick-8)))pick=k;}
  if(pick<0)pick=best.a;
  return Object.assign({},best,{score:m,halts:mh,pick});
}

/* ---------- entry rules that apply to a trip ---------- */
const YATRA_NODES=['badrinath','kedarnath','gaurikund','sonprayag','gangotri','yamunotri','janki','govindghat','ghangaria'];
const SHRINE_NODES=['badrinath','kedarnath','gaurikund','sonprayag','gangotri','yamunotri','janki'];
function rulesFor(plan,trip){
  const ns=(plan?plan.nodes:[]).concat(trip?[trip.dst,trip.src]:[]),has=a=>a.some(x=>ns.indexOf(x)>=0);
  const out=[];
  if(has(YATRA_NODES)){out.push('yatra','vehicle');}
  if(has(SHRINE_NODES))out.push('season');
  if(ns.indexOf('mussoorie')>=0)out.push('mus');
  if(plan&&plan.hasHill)out.push('hill');
  if(plan&&plan.rows.some(r=>r.seg.cd))out.push('hours');
  if(ns.indexOf('gangotri')>=0&&trip&&(trip.dst==='gangotri'||trip.src==='gangotri'))out.push('gau');
  if(ns.indexOf('mussoorie')>=0)out.push('jam');
  return out;
}


/* ---------- i18n ---------- */
const T={
 en:{tag:'Hill-road landslide and traffic advisory',
  s_monsoon:'Heavy-rain days (demo)',s_clear:'Clear days (demo)',s_live:'Live forecast',
  lbl_w:'Weather',lbl_t:'Traffic assumption',
  td_cal:'Holiday calendar',rng:' to ',td_normal:'Normal weekday',td_weekend:'Weekend, Sat and Sun',td_leve:'Eve of long weekend',td_lstart:'Long weekend, day 1',td_lend:'Long weekend, last day',
  m_sim:'Simulated weather · ',m_live:'Live rainfall forecast, ',m_cache:'Offline. Last saved forecast from ',m_fail:'No connection and nothing saved. Showing simulated weather.',m_none:'No forecast yet: offline and nothing saved. Landslide risk is not shown. Get a moment of signal to download it (a few KB).',m_old:'Saved forecast is from {w}, more than 10 days old, so landslide risk is not shown. Ask locally and get a moment of signal to update.',
  f_from:'From',f_to:'To',f_date:'Date of travel',f_dep:'Leave at',f_auto:'Best time',swap:'Swap places',ph_place:'Type a town',try_:'Try',
  pl_nf:'“{q}” is not in the built-in list of {n} places.',pl_find:'Search it online',pl_off:'You are offline. Pick a town from the list.',pl_busy:'Searching…',
  pl_none:'No place found for “{q}”.',pl_far:'{name} is too far from the mapped roads (nearest town {n}, {k} km). The map covers Uttarakhand and the roads from Delhi NCR, western UP, Haryana and Chandigarh.',
  pl_snap:'{name}: nearest mapped town is {n}, about {k} km away. The last leg is an estimate.',pl_amb:'Did you mean',pl_same:'Pick two different places.',
  pl_foot:'{p} is reached on foot from {h}: {km} km, about {t}. The trek is not modelled, the drive is.',
  pl_footonly:'Both places are on the same trek. There is no road leg to plan.',
  dow:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],mon:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  cf_sim:'Simulated weather, not a forecast',cf_none:'No current forecast: landslide risk not shown',cf_hi:'Forecast {n} days ahead: high confidence',cf_med:'Forecast {n} days ahead: medium confidence',cf_low:'Forecast {n} days ahead: low confidence, treat it as an outlook',cf_today:'Forecast for today',
  cal_note:'The holiday calendar covers Oct to Dec 2026. Other dates use the plain weekday pattern; change the traffic assumption if you know better.',
  go:'Go',cau:'Caution',avd:'Avoid',road:'Road',trf:'Traffic',
  trf0:'Free-flowing',trf1:'Busy',trf2:'Heavy jams',
  hl0:'Road looks clear for this start time',hl1:'Start early and keep to daylight',hl2:'Do not travel this route now',
  hl_pl:'No hill roads on this trip. Landslide risk is not modelled here.',
  risk:'landslide risk',of100:'/ 100',leave:'Leaving',km:'km',
  listen:'Listen',share:'Share',plan_t:'When to leave',plan_s:'Bars show landslide risk for each start time on this date. The strip below shows traffic. A dot means a night halt is needed. Tap a time.',
  best:'Best window',nowin:'No safe window on this date. Try another day.',
  today:'today',tomorrow:'tomorrow',next_day:'next day',
  late:'Some hill road falls after dark and no town with lodging fits before it. Leave earlier or choose another day.',
  dark:'Not advised (late-night start, dark hills or already passed)',halt_leg:'Night halt needed',
  tabs:{route:'Trip',map:'Map',reports:'Reports',rules:'Rules'},
  rain:'rain',slope:'Slope',low:'Low',med:'Medium',high:'High',rep:'reports',rep1:'report',blocked:'Reported blocked',
  mm24:'mm in 24 h',vs:'vs',hot:'Known trouble spots',
  rtitle:'Report the road',rloc:'Where',rtype:'What you see',send:'Send report',recent:'Recent reports',confirm:'Confirm',
  t_landslide:'Landslide on road',t_debris:'Debris or falling stones',t_washed:'Road washed away',t_bridge:'Bridge damaged',t_clear:'Road is open again',
  rnote:'A report counts for 6 hours. Two or more confirmations mark a stretch as blocked. This prototype keeps reports on this phone only.',
  sample:'sample',you:'you',ago:'ago',min:'min',hr:'h',
  ph_wd:'Normal day',ph_weve:'Friday evening rush',ph_sat:'Saturday outbound rush',ph_sun:'Sunday return rush',
  ph_eve:'Evening before a long weekend',ph_start:'First day of a long weekend',ph_mid:'Middle of a long weekend',ph_end:'Last day of a long weekend, return rush',ph_after:'First working day after a long weekend',
  ro_t:'Roads for this trip',ro_fast:'Fastest',ro_safe:'Lowest risk',ro_best:'Fastest and lowest risk',ro_alt:'Alternative',ro_only:'Only practical road',ro_rec:'Recommended',via:'via',
  ro_none:'No other practical road for this trip in our road map.',ro_vs:'vs fastest',ro_same:'same time',ro_total:'incl. night halt',ro_dark:'dark hill stretch',
  trf_t:'Traffic and drive time',expect:'Driving',normal:'Normal day',elapsed:'Door to door',slowest:'Slowest stretch',arrive:'Arrive about',
  rainadd:'Rain adds about',tipL:'Leave',tipSave:'about {x} less on the road',tipSafe:'a safer road for about the same time',
  trf_note:'Expected traffic comes from the holiday calendar and a demand model. It is not live traffic data.',
  halt_t:'Overnight halt',halt_l:'Day {d}: stop for the night in {p}, arriving about {a}. Leave at {r} next morning.',day:'Day',
  foot_l:'Then {km} km on foot or by pony from {h}, about {t}. The trek is not modelled.',foot_s:'First, {km} km on foot from {p} down to {h}, about {t}. The trek is not modelled.',
  bg_t:'Before you go',usually:'usually',plains:'Plains',plains_note:'Plains: no landslide risk is modelled',darkseg:'after dark',jam:'Jam points',
  req:'Required',chk:'Check',info:'Good to know',trk:'If you trek',
  lay_risk:'Landslide risk',lay_trf:'Traffic',other_rt:'Other roads',
  maplegend:'Positions are real latitude and longitude, roads are straight links between towns, not road geometry. No map tiles, so it loads on weak signal.',
  rules_t:'Entry rules and permits',rules_s:'What a visitor may need on this trip. Tap a source to read it.',rules_none:'No special permits are listed for this trip. The hill-road licence note applies on any hill road.',
  rules_why:'Why they exist: crowds. On 5 June 2025 a visitor died in Mussoorie after his family took over an hour to cover less than 4 km to a medical facility in a jam. Registration and permit caps are meant to manage crowds and traffic.',
  rules_foot:'Rules change often. Confirm on the official portal or with local police before you travel.',src_l:'Source',
  sent:'Report saved',copied:'Summary copied',
  foot:'<b>Advisory only.</b> This is not an official warning. Follow police, BRO and district administration notices on the road. Rainfall trigger: Caine (1980) global threshold. The road network is hand-built from about 60 places and 75 road links with approximate distances. The data line below says which distance, slope and incident values this copy uses. Traffic is a calendar-based estimate with demo coefficients; a live-traffic provider (Google, TomTom, HERE, Mappls) can be plugged in with an API key. Weather beyond a week ahead is an outlook, not a forecast.'},
 hi:{tag:'पहाड़ी सड़कों पर भूस्खलन और ट्रैफ़िक की सलाह',
  s_monsoon:'भारी बारिश के दिन (डेमो)',s_clear:'साफ़ दिन (डेमो)',s_live:'लाइव पूर्वानुमान',
  lbl_w:'मौसम',lbl_t:'ट्रैफ़िक का अनुमान',
  td_cal:'छुट्टियों के कैलेंडर से',rng:' से ',td_normal:'आम कामकाजी दिन',td_weekend:'सप्ताहांत, शनि और रवि',td_leve:'लंबे सप्ताहांत से पहले',td_lstart:'लंबा सप्ताहांत, दिन 1',td_lend:'लंबा सप्ताहांत, आख़िरी दिन',
  m_sim:'नकली मौसम · ',m_live:'लाइव बारिश पूर्वानुमान, ',m_cache:'ऑफ़लाइन। आख़िरी सहेजा पूर्वानुमान: ',m_fail:'नेटवर्क नहीं है और कुछ सहेजा नहीं है। नकली मौसम दिखा रहे हैं।',m_none:'अभी कोई पूर्वानुमान नहीं: ऑफ़लाइन और कुछ सहेजा नहीं। भूस्खलन जोखिम नहीं दिखाया जा रहा। इसे लेने के लिए थोड़ी देर नेटवर्क लें (कुछ KB)।',m_old:'सहेजा पूर्वानुमान {w} का है, 10 दिन से पुराना, इसलिए भूस्खलन जोखिम नहीं दिखाया जा रहा। स्थानीय लोगों से पूछें और अपडेट के लिए थोड़ी देर नेटवर्क लें।',
  f_from:'कहाँ से',f_to:'कहाँ तक',f_date:'यात्रा की तारीख़',f_dep:'कब निकलें',f_auto:'सबसे अच्छा समय',swap:'जगहें बदलें',ph_place:'शहर का नाम लिखें',try_:'आज़माएँ',
  pl_nf:'“{q}” हमारी {n} जगहों की सूची में नहीं है।',pl_find:'ऑनलाइन खोजें',pl_off:'आप ऑफ़लाइन हैं। सूची से कोई शहर चुनें।',pl_busy:'खोज रहे हैं…',
  pl_none:'“{q}” के लिए कोई जगह नहीं मिली।',pl_far:'{name} नक्शे की सड़कों से बहुत दूर है (सबसे पास का शहर {n}, {k} किमी)। नक्शा उत्तराखंड और दिल्ली एनसीआर, पश्चिमी उत्तर प्रदेश, हरियाणा और चंडीगढ़ से आने वाली सड़कों तक है।',
  pl_snap:'{name}: नक्शे में सबसे पास का शहर {n} है, लगभग {k} किमी दूर। आख़िरी हिस्सा अनुमान है।',pl_amb:'क्या आपका मतलब',pl_same:'दो अलग जगहें चुनें।',
  pl_foot:'{p} तक {h} से पैदल जाना होता है: {km} किमी, लगभग {t}। पैदल रास्ते का अनुमान नहीं लगाया गया, सड़क का लगाया गया है।',
  pl_footonly:'दोनों जगहें एक ही पैदल मार्ग पर हैं। सड़क का कोई हिस्सा नहीं है।',
  dow:['रवि','सोम','मंगल','बुध','गुरु','शुक्र','शनि'],mon:['जनवरी','फ़रवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्तूबर','नवंबर','दिसंबर'],
  cf_sim:'नकली मौसम, पूर्वानुमान नहीं',cf_none:'मौजूदा पूर्वानुमान नहीं: भूस्खलन जोखिम नहीं दिखाया गया',cf_hi:'{n} दिन आगे का पूर्वानुमान: भरोसा ज़्यादा',cf_med:'{n} दिन आगे का पूर्वानुमान: भरोसा मध्यम',cf_low:'{n} दिन आगे का पूर्वानुमान: भरोसा कम, इसे मोटा अनुमान मानें',cf_today:'आज का पूर्वानुमान',
  cal_note:'छुट्टियों का कैलेंडर अक्तूबर से दिसंबर 2026 तक है। बाक़ी तारीख़ों के लिए आम सप्ताह का ढर्रा लिया जाता है; बेहतर जानकारी हो तो ट्रैफ़िक का अनुमान बदल लें।',
  go:'चलें',cau:'सावधानी',avd:'टालें',road:'सड़क',trf:'ट्रैफ़िक',
  trf0:'खुला रास्ता',trf1:'व्यस्त',trf2:'भारी जाम',
  hl0:'इस समय रास्ता ठीक दिखता है',hl1:'जल्दी निकलें और दिन में ही चलें',hl2:'अभी इस रास्ते पर यात्रा न करें',
  hl_pl:'इस यात्रा में पहाड़ी सड़क नहीं है। यहाँ भूस्खलन का जोखिम नहीं गिना गया।',
  risk:'भूस्खलन जोखिम',of100:'/ 100',leave:'रवानगी',km:'किमी',
  listen:'सुनें',share:'भेजें',plan_t:'कब निकलें',plan_s:'पट्टियाँ इस तारीख़ पर हर रवानगी समय का भूस्खलन जोखिम दिखाती हैं। नीचे की पट्टी ट्रैफ़िक दिखाती है। बिंदु का मतलब है कि रात का पड़ाव चाहिए। किसी समय को छुएँ।',
  best:'सबसे अच्छा समय',nowin:'इस तारीख़ पर कोई सुरक्षित समय नहीं। कोई और दिन देखें।',
  today:'आज',tomorrow:'कल',next_day:'अगले दिन',
  late:'पहाड़ी सड़क का कुछ हिस्सा अँधेरे में पड़ेगा और उससे पहले रुकने लायक कोई शहर नहीं मिला। जल्दी निकलें या कोई और दिन चुनें।',
  dark:'ठीक नहीं (देर रात की शुरुआत, अँधेरे में पहाड़ या समय निकल चुका)',halt_leg:'रात का पड़ाव चाहिए',
  tabs:{route:'यात्रा',map:'नक्शा',reports:'रिपोर्ट',rules:'नियम'},
  rain:'बारिश',slope:'ढलान',low:'कम',med:'मध्यम',high:'अधिक',rep:'रिपोर्ट',rep1:'रिपोर्ट',blocked:'रास्ता बंद बताया गया',
  mm24:'मिमी, 24 घंटे में',vs:'सीमा',hot:'ख़तरे वाली जगहें',
  rtitle:'सड़क की स्थिति बताएँ',rloc:'कहाँ',rtype:'क्या दिख रहा है',send:'रिपोर्ट भेजें',recent:'हाल की रिपोर्ट',confirm:'पुष्टि करें',
  t_landslide:'सड़क पर भूस्खलन',t_debris:'मलबा या गिरते पत्थर',t_washed:'सड़क बह गई',t_bridge:'पुल क्षतिग्रस्त',t_clear:'रास्ता फिर खुल गया',
  rnote:'रिपोर्ट 6 घंटे तक मानी जाती है। दो या अधिक पुष्टि होने पर हिस्सा बंद माना जाता है। इस प्रोटोटाइप में रिपोर्ट सिर्फ़ इसी फ़ोन में रहती हैं।',
  sample:'नमूना',you:'आप',ago:'पहले',min:'मिनट',hr:'घंटे',
  ph_wd:'आम दिन',ph_weve:'शुक्रवार शाम की भीड़',ph_sat:'शनिवार, जाने वालों की भीड़',ph_sun:'रविवार, लौटने वालों की भीड़',
  ph_eve:'लंबे सप्ताहांत से पहले की शाम',ph_start:'लंबे सप्ताहांत का पहला दिन',ph_mid:'लंबे सप्ताहांत के बीच का दिन',ph_end:'लंबे सप्ताहांत का आख़िरी दिन, लौटने की भीड़',ph_after:'लंबे सप्ताहांत के बाद का पहला कामकाजी दिन',
  ro_t:'इस यात्रा के रास्ते',ro_fast:'सबसे तेज़',ro_safe:'सबसे कम जोखिम',ro_best:'सबसे तेज़ और सबसे कम जोखिम',ro_alt:'दूसरा रास्ता',ro_only:'इकलौता व्यावहारिक रास्ता',ro_rec:'सुझाया गया',via:'होकर',
  ro_none:'इस सफ़र के लिए हमारे सड़क-नक्शे में कोई और व्यावहारिक रास्ता नहीं है।',ro_vs:'सबसे तेज़ के मुक़ाबले',ro_same:'उतना ही समय',ro_dark:'अँधेरे में पहाड़ी हिस्सा',ro_total:'रात के पड़ाव समेत',
  trf_t:'ट्रैफ़िक और सफ़र का समय',expect:'गाड़ी चलाने का समय',normal:'आम दिन में',elapsed:'घर से मंज़िल तक',slowest:'सबसे धीमा हिस्सा',arrive:'पहुँचना लगभग',
  rainadd:'बारिश से करीब',tipL:'निकलें',tipSave:'सड़क पर लगभग {x} कम',tipSafe:'लगभग उतने ही समय में ज़्यादा सुरक्षित सड़क',
  trf_note:'अनुमानित ट्रैफ़िक छुट्टियों के कैलेंडर और माँग के मॉडल से आता है। यह लाइव ट्रैफ़िक डेटा नहीं है।',
  halt_t:'रात का पड़ाव',halt_l:'दिन {d}: रात {p} में रुकें, लगभग {a} पहुँचेंगे। अगली सुबह {r} बजे निकलें।',day:'दिन',
  foot_l:'फिर {h} से {km} किमी पैदल या खच्चर से, लगभग {t}। पैदल रास्ते का अनुमान नहीं लगाया गया।',foot_s:'पहले {p} से {h} तक {km} किमी पैदल उतरना है, लगभग {t}। पैदल रास्ते का अनुमान नहीं लगाया गया।',
  bg_t:'निकलने से पहले',usually:'आम तौर पर',plains:'मैदान',plains_note:'मैदान: भूस्खलन का जोखिम नहीं गिना गया',darkseg:'अँधेरे में',jam:'जाम वाली जगहें',
  req:'ज़रूरी',chk:'जाँच लें',info:'जानने लायक',trk:'ट्रेक पर जाएँ तो',
  lay_risk:'भूस्खलन जोखिम',lay_trf:'ट्रैफ़िक',other_rt:'दूसरी सड़कें',
  maplegend:'स्थान असली अक्षांश और देशांतर पर हैं, सड़कें शहरों को जोड़ने वाली सीधी रेखाएँ हैं, असली सड़क का आकार नहीं। नक्शे की टाइलें नहीं चाहिए, इसलिए कमज़ोर सिग्नल में भी खुलता है।',
  rules_t:'प्रवेश नियम और परमिट',rules_s:'इस यात्रा में आगंतुक को क्या चाहिए हो सकता है। स्रोत पढ़ने के लिए उस पर छुएँ।',rules_none:'इस यात्रा के लिए कोई विशेष परमिट सूचीबद्ध नहीं है। पहाड़ी सड़क पर लाइसेंस वाला नोट हर पहाड़ी सड़क पर लागू होता है।',
  rules_why:'ये नियम भीड़ की वजह से हैं। 5 जून 2025 को मसूरी में जाम के कारण एक पर्यटक के परिवार को 4 किमी से कम दूर अस्पताल पहुँचने में एक घंटे से ज़्यादा लगा और पर्यटक की मृत्यु हो गई। पंजीकरण और परमिट की सीमा भीड़ और ट्रैफ़िक सँभालने के लिए हैं।',
  rules_foot:'नियम अक्सर बदलते हैं। निकलने से पहले आधिकारिक पोर्टल या स्थानीय पुलिस से पुष्टि कर लें।',src_l:'स्रोत',
  sent:'रिपोर्ट सहेजी गई',copied:'सारांश कॉपी हुआ',
  foot:'<b>सिर्फ़ सलाह।</b> यह सरकारी चेतावनी नहीं है। सड़क पर पुलिस, बीआरओ और ज़िला प्रशासन की सूचना मानें। बारिश की सीमा: Caine (1980) की वैश्विक सीमा। सड़कों का नक्शा लगभग 60 जगहों और 75 सड़कों से हाथ से बनाया है और दूरियाँ अनुमानित हैं। नीचे की डेटा पंक्ति बताती है कि इस कॉपी में दूरी, ढलान और घटनाओं के कौन से मान हैं। ट्रैफ़िक कैलेंडर पर आधारित अनुमान है और इसके गुणांक नमूने हैं; API कुंजी मिलने पर लाइव ट्रैफ़िक (Google, TomTom, HERE, Mappls) जोड़ा जा सकता है। एक हफ़्ते से आगे का मौसम पूर्वानुमान नहीं, मोटा अनुमान है।'}
};
/* entry rules: each item cites its sources; text is a summary, not legal advice */
const RULES={
 hill:{tag:'chk',srcs:[['https://www.livelaw.in/amp/consumer-cases/no-compensation-for-mountain-accidents-without-hill-endorsement-on-driving-license-uttarakhand-commission-clears-national-insurance-companys-liability-236352','LiveLaw · State Commission, case A/159/2022, 28 Aug 2023']],
  en:{h:'Hill-road driving endorsement',b:'Hill roads may need a hill endorsement on the driving licence. In 2023 Uttarakhand’s State Consumer Commission rejected an insurance claim for a hill accident because the driver’s licence had no hill endorsement. Ask your RTO or insurer whether your vehicle type needs one.'},
  hi:{h:'पहाड़ी सड़क के लिए लाइसेंस पर हिल एंडोर्समेंट',b:'पहाड़ी सड़कों के लिए ड्राइविंग लाइसेंस पर “हिल एंडोर्समेंट” ज़रूरी हो सकता है। 2023 में उत्तराखंड राज्य उपभोक्ता आयोग ने पहाड़ी दुर्घटना का बीमा दावा इसलिए ख़ारिज किया कि चालक के लाइसेंस पर हिल एंडोर्समेंट नहीं था। अपने आरटीओ या बीमा कंपनी से पूछ लें कि आपके वाहन के लिए यह चाहिए या नहीं।'}},
 yatra:{tag:'req',srcs:[['https://registrationandtouristcare.uk.gov.in/faq.php','Tourist Care Uttarakhand, official FAQ']],
  en:{h:'Char Dham yatra registration',b:'Registration for the Char Dham and Hemkund Sahib yatra is mandatory. You get a QR code. If you travel by your own vehicle, you upload its details. Register on the official Tourist Care Uttarakhand portal before you start.'},
  hi:{h:'चारधाम यात्रा पंजीकरण',b:'चारधाम और हेमकुंड साहिब यात्रा के लिए पंजीकरण अनिवार्य है। पंजीकरण पर क्यूआर कोड मिलता है और अपने वाहन से जा रहे हों तो वाहन का ब्योरा भी अपलोड करना होता है। निकलने से पहले उत्तराखंड के आधिकारिक टूरिस्ट केयर पोर्टल पर पंजीकरण करें।'}},
 vehicle:{tag:'chk',srcs:[['https://cdn.triptotemples.com/news/char-dham/chardham-yatra-new-transport-rules-to-end-long-queues-at-checkposts','Trip to Temples, news report on the 2026 yatra'],['https://www.outlooktraveller.com/amp/story/News/char-dham-yatra-2026-new-rules-registration-and-safety-guidelines-explained','Outlook Traveller, Char Dham Yatra 2026 rules']],
  en:{h:'Vehicle papers and hill endorsement for Char Dham, 2026',b:'Reports on the 2026 yatra describe a Green Card and a per-trip Trip Card for passenger vehicles, checked by officers with handheld devices, a hill endorsement for every driver and limits on very long vehicles on narrow stretches. The papers differ for commercial and private vehicles and the reports are not official, so confirm on the state transport portal before you go.'},
  hi:{h:'चारधाम 2026 के लिए वाहन के काग़ज़ और हिल एंडोर्समेंट',b:'2026 की यात्रा पर आई रिपोर्टें यात्री वाहनों के लिए ग्रीन कार्ड और हर यात्रा का ट्रिप कार्ड बताती हैं, जिसे अधिकारी हाथ के उपकरणों से जाँचते हैं; हर चालक के लिए हिल एंडोर्समेंट; और तंग हिस्सों पर बहुत लंबे वाहनों पर रोक। व्यावसायिक और निजी वाहनों के काग़ज़ अलग हैं और ये रिपोर्टें आधिकारिक नहीं हैं, इसलिए निकलने से पहले राज्य के परिवहन पोर्टल पर पुष्टि कर लें।'}},
 season:{tag:'chk',srcs:[['https://www.newsonair.gov.in/uttarakhand-announces-winter-closing-dates-for-kedarnath-badrinath-gangotri-and-yamunotri-temples/','All India Radio, 2 Oct 2025'],['https://www.newsonair.gov.in/badrinath-temple-portals-to-close-today-concluding-this-years-char-dham-yatra','All India Radio, 25 Nov 2025']],
  en:{h:'The shrines close for winter',b:'Closing dates are announced each year on Vijayadashami. In 2025 Gangotri closed on 22 October, Kedarnath and Yamunotri on 23 October (Bhai Dooj) and Badrinath on 25 November. Expect a similar pattern after Diwali in 2026. Confirm the dates before you plan a trip in late October or November. Snow can also shut the roads beyond.'},
  hi:{h:'धाम सर्दियों में बंद हो जाते हैं',b:'बंद होने की तारीख़ें हर साल विजयादशमी पर घोषित होती हैं। 2025 में गंगोत्री 22 अक्तूबर को, केदारनाथ और यमुनोत्री 23 अक्तूबर (भैया दूज) को और बद्रीनाथ 25 नवंबर को बंद हुए। 2026 में भी दीपावली के बाद ऐसा ही क्रम मानें और अक्तूबर के अंत या नवंबर की यात्रा तय करने से पहले तारीख़ें पक्की कर लें। बर्फ़ से आगे की सड़कें भी बंद हो सकती हैं।'}},
 mus:{tag:'req',srcs:[['https://www.outlooktraveller.com/News/to-visit-mussoorie-this-season-youll-need-to-register-first-heres-why','Outlook Traveller, on the Mussoorie registration from 1 Aug 2025']],
  en:{h:'Mussoorie tourist registration',b:'Since 1 August 2025 visitors register online (vehicle number, passengers, dates, stay) on the Dehradun Smart City portal. It is checked at the Kincraig and Picture Palace entry points. It is free and no cap on visitors was reported. The aim is to manage crowds and traffic. Check that it is still in force before you go.'},
  hi:{h:'मसूरी पर्यटक पंजीकरण',b:'1 अगस्त 2025 से आने वाले पर्यटक देहरादून स्मार्ट सिटी पोर्टल पर ऑनलाइन पंजीकरण करते हैं (वाहन नंबर, यात्री, तारीख़ें, ठहराव)। जाँच किनक्रेग और पिक्चर पैलेस के प्रवेश बिंदुओं पर होती है। यह निःशुल्क है और आगंतुकों की कोई सीमा नहीं बताई गई थी। उद्देश्य भीड़ और ट्रैफ़िक सँभालना है। निकलने से पहले देख लें कि यह अब भी लागू है।'}},
 gau:{tag:'trk',srcs:[['https://www.incredibleindia.gov.in/en/uttarakhand/uttarkashi/gangotri-national-park','Incredible India, Gangotri National Park']],
  en:{h:'Gaumukh trek permit',b:'Permits for the Gaumukh trail are capped at 150 visitors a day. Get them online or at the forest offices in Uttarkashi or Gangotri. A registered guide is required for treks beyond Gaumukh, such as Tapovan or Nelong.'},
  hi:{h:'गौमुख ट्रेक परमिट',b:'गौमुख मार्ग के परमिट रोज़ाना 150 लोगों तक सीमित हैं। ये ऑनलाइन या उत्तरकाशी और गंगोत्री के वन कार्यालयों से मिलते हैं। गौमुख से आगे, जैसे तपोवन या नेलांग, के लिए पंजीकृत गाइड ज़रूरी है।'}},
 hours:{tag:'info',srcs:[['https://www.dailypioneer.com/2022/state-editions/drivers-welcome-extended-time-for-driving-on-mountain-roads.html','Daily Pioneer, 8 May 2022'],['https://www.outlooktraveller.com/amp/story/News/char-dham-yatra-2026-new-rules-registration-and-safety-guidelines-explained','Outlook Traveller, Char Dham Yatra 2026 rules']],
  en:{h:'Night driving on Char Dham roads',b:'Night travel on the Char Dham mountain roads is restricted. A state decision reported in May 2022 widened vehicle movement from the 05:00 to 20:00 window to 04:00 to 22:00. A report on the 2026 yatra says night travel is barred from 22:00 to 04:00 (another report says 20:00 to 05:00). PahaadPath plans hill stretches only between 05:00 and 19:00 because falling rock and sharp bends are harder to see after dark. Check local police notices.'},
  hi:{h:'चारधाम सड़कों पर रात में गाड़ी चलाना',b:'चारधाम की पहाड़ी सड़कों पर रात का सफ़र प्रतिबंधित है। मई 2022 में बताया गया कि राज्य ने वाहनों का समय सुबह 5 से रात 8 बजे से बढ़ाकर सुबह 4 से रात 10 बजे कर दिया; 2026 की यात्रा पर एक रिपोर्ट के अनुसार रात 10 से सुबह 4 बजे तक रात का सफ़र मना है (एक और रिपोर्ट में रात 8 से सुबह 5)। पहाड़ पथ पहाड़ी हिस्से सिर्फ़ सुबह 5 से शाम 7 के बीच रखता है, क्योंकि अँधेरे में गिरते पत्थर और तीखे मोड़ कम दिखते हैं। स्थानीय पुलिस की सूचना देख लें।'}},
 jam:{tag:'info',srcs:[['https://www.amarujala.com/dehradun/mussoorie-crowds-of-tourists-on-the-weekend-city-grapples-with-traffic-jams-all-day-long-2026-03-22','Amar Ujala, 22 Mar 2026']],
  en:{h:'Mussoorie weekend jam points',b:'A report from 22 March 2026 names Landour Bazaar, Mall Road, Picture Palace and Kempty Road as the weekend bottlenecks, with the heaviest queues at Mall Road and Picture Palace.'},
  hi:{h:'मसूरी में सप्ताहांत के जाम वाले बिंदु',b:'22 मार्च 2026 की एक रिपोर्ट में लैंडौर बाज़ार, माल रोड, पिक्चर पैलेस और केम्प्टी रोड को सप्ताहांत के जाम वाले बिंदु बताया गया है। सबसे लंबी कतारें माल रोड और पिक्चर पैलेस पर थीं।'}}
};
const TAGORD={req:0,chk:1,trk:2,info:3};


const t=k=>T[st.lang][k];
const nm=o=>st.lang==='hi'&&o.hi?o.hi:o.en;
const LV=['go','cau','avd'];
const $=id=>document.getElementById(id);
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const pname=id=>{const n=NODE(id);return n?nm(n):id;};
const fill=(s,o)=>s.replace(/\{(\w+)\}/g,(m,k)=>o[k]!=null?o[k]:m);

/* ---------- query string (used by tests and shared links) ---------- */
const q=new URLSearchParams(location.search);
try{if(localStorage.getItem('pp_lang')==='hi')st.lang='hi';}catch(e){} // the phone remembers the language picked last time
if(q.get('lang')==='hi')st.lang='hi';else if(q.get('lang')==='en')st.lang='en';
if(['monsoon','clear','live'].includes(q.get('scn'))||/^rp:\d{4}-\d{2}-\d{2}$/.test(q.get('scn')||''))st.scn=q.get('scn');
if(['trip','ops','proof'].includes(q.get('view')))st.view=q.get('view');
if(q.get('tiles')==='0')st.tiles=false;
if(['cal','normal','weekend','leve','lstart','lend'].includes(q.get('tday')))st.tday=q.get('tday');
if(N[q.get('from')])st.from=q.get('from');
if(N[q.get('to')])st.to=q.get('to');
if(['route','map','reports','rules','safety'].includes(q.get('tab')))st.tab=q.get('tab');
if(q.get('layer')==='traffic')st.layer='traffic';
if(q.get('dep')!=null&&q.get('dep')!==''&&+q.get('dep')>=0&&+q.get('dep')<24)st.dep=+q.get('dep');
if(['fast','safe','alt'].includes(q.get('pick')))st.pick=q.get('pick');
const qDate=parseDate(q.get('date'));

/* ---------- time helpers (IST, independent of device zone) ---------- */
function clock(ms){const d=new Date(ms+IST);return String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0');}
function dowOf(idx){return t('dow')[(idx+4)%7];}
function when(ms){const d=dayOf(ms)-st.dateIdx;return d===0?clock(ms):dowOf(dayOf(ms))+' '+clock(ms);}
function fmtDate(idx){const d=new Date(idx*864e5);return dowOf(idx)+' '+d.getUTCDate()+' '+t('mon')[d.getUTCMonth()];}
function fmtH(h){
  const m=Math.max(1,Math.round(h*60)),hh=Math.floor(m/60),mm=m%60;
  if(st.lang==='hi')return (hh?hh+' घंटे':'')+(hh&&mm?' ':'')+(mm?mm+' मिनट':'');
  return (hh?hh+' h':'')+(hh&&mm?' ':'')+(mm?mm+' min':'');
}
const msOf=h=>st.hour0+h*3600e3;

/* ---------- data loading ---------- */
function setClock(sim){
  if(sim){const d=dayOf(Date.now());st.nowMs=d*864e5-IST+(st.scn==='clear'?7.5:15.5)*3600e3;}else st.nowMs=Date.now();
  st.hour0=Math.floor((st.nowMs+IST)/3600e3)*3600e3-IST;
}
function locKey(e){return e.cLat.toFixed(2)+','+e.cLon.toFixed(2);}
function seriesFromKeys(byKey){
  const out={};EDGES.forEach(e=>{out[e.id]=byKey[locKey(e)];});return out;
}
async function fetchLive(){
  const list=[],seen={};
  EDGES.forEach(e=>{const k=locKey(e);if(!seen[k]){seen[k]=1;list.push(k);}});
  const url='https://api.open-meteo.com/v1/forecast?latitude='+list.map(k=>k.split(',')[0]).join(',')+'&longitude='+list.map(k=>k.split(',')[1]).join(',')+'&hourly=precipitation&past_days=3&forecast_days=16&timezone=Asia%2FKolkata';
  const ctl=new AbortController();const to=setTimeout(()=>ctl.abort(),12000);
  const res=await fetch(url,{signal:ctl.signal});clearTimeout(to);
  if(!res.ok)throw new Error('http '+res.status);
  let js=await res.json();if(!Array.isArray(js))js=[js];
  if(js.length!==list.length)throw new Error('shape');
  const stamp=new Date(st.nowMs+IST).toISOString().slice(0,13)+':00';
  const by={};
  list.forEach((k,i)=>{
    const h=js[i].hourly,idx=h.time.indexOf(stamp);if(idx<0)throw new Error('time index');
    const a=[];for(let j=-PAST;j<FUT;j++){const v=h.precipitation[idx+j];a.push(v==null?0:Math.round(v*10)/10);}
    by[k]=a;
  });
  return by;
}
function attachVirtualSeries(){
  Object.keys(VN).forEach(id=>{const e=VN[id].edge,ref=(ADJ[e.a]||[]).find(x=>!x.virtual);st.series[e.id]=(ref&&st.series[ref.id])||new Array(SERIES_LEN).fill(0);
    if(st.daily)st.daily[e.id]=(ref&&st.daily[ref.id])||null;});
}
async function load(pre){
  st.err='';
  if(st.scn==='live'){
    setClock(false);
    try{
      const w=pre||await fetchWeather();st.series=seriesFromKeys(w.by);st.src='live';st.via=w.via;st.dataTs=w.ts;st.made=w.made||null;setDaily(w.daily,w.day0);if(w.alerts)st.alerts=w.alerts;if(w.closures)st.closures=w.closures;st.r24=w.r24||null;st.v6=w.v6||null;st.v6t=w.v6t||null;
      try{localStorage.setItem('pp_cache2',JSON.stringify({ts:w.ts,made:w.made,by:w.by,daily:w.daily,day0:w.day0,alerts:st.alerts||null,closures:st.closures||null,v6:st.v6||null,v6t:st.v6t||null}));}catch(e){}
    }catch(e){
      let c=null;try{c=JSON.parse(localStorage.getItem('pp_cache2')||'null');}catch(_){}
      /* offline: keep using the last forecast while it still covers the coming days; the header says how old it is */
      if(c&&c.by&&Date.now()-c.ts<CACHE_MAX_H*3600e3&&EDGES.every(e=>c.by[locKey(e)])){
        const shift=Math.round((st.hour0-c.ts)/3600e3),by={};
        Object.keys(c.by).forEach(k=>{by[k]=shift>0?c.by[k].slice(shift).concat(new Array(shift).fill(0)):c.by[k];});
        st.series=seriesFromKeys(by);st.src='cache';st.cacheTs=c.ts;st.cacheMade=c.made||null;st.alerts=c.alerts||null;st.closures=c.closures||null;st.v6=c.v6||null;st.v6t=c.v6t||null;setDaily(c.daily,c.day0);
      }else{
        /* nothing usable saved: say so, and plan roads, time and halts without a landslide score (never demo rain on a real trip) */
        st.src='none';st.err=c&&c.ts?'old':'none';st.cacheTs=c&&c.ts||null;st.cacheMade=c&&c.made||null;
        st.series={};EDGES.forEach(e=>{st.series[e.id]=new Array(SERIES_LEN).fill(0);});setDaily(null);
      }
    }
  }else if(st.scn.startsWith('rp:')){
    const ok=await loadReplayWeather(st.scn.slice(3));if(ok)setReplayDaily(st.scn.slice(3));
    if(!ok){st.scn='monsoon';st.src='sim';st.err='rpfail';setClock(true);st.series=simSeries('monsoon');}
  }else{
    setClock(true);st.series=simSeries(st.scn);st.src='sim';
  }
  if(st.src==='sim'||st.src==='none')setDaily(null);
  attachVirtualSeries();
  st.reports=(st.scn==='monsoon'&&st.src==='sim'?seedReports():[]);
  clampDate();
  render();
}
function seedReports(){
  const n=st.nowMs,m=3600e3;
  return [
    {id:'s1',seg:'rishikesh-devprayag',spot:0,type:'debris',ts:n-.5*m,conf:2,sample:true},
    {id:'s2',seg:'sonprayag-gaurikund',spot:0,type:'landslide',ts:n-1.2*m,conf:3,sample:true},
    {id:'s3',seg:'rishikesh-chamba',spot:0,type:'debris',ts:n-3*m,conf:0,sample:true}
  ];
}
function loadUser(){try{const j=JSON.parse(localStorage.getItem('pp_user')||'[]');st.user=Array.isArray(j)?j.filter(r=>S[r.seg]):[];}catch(e){st.user=[];}}
function saveUser(){try{localStorage.setItem('pp_user',JSON.stringify(st.user.slice(-40)));}catch(e){}}
function clampDate(){
  const today=dayOf(st.nowMs);
  let d=st.dateIdx||qDate||today+1;
  if(!st.dateInit){st.dateInit=1;d=qDate||(st.src==='sim'?today+1:today);} // real weather: plan from today
  const maxA=st.src==='replay'?1:MAX_AHEAD;
  if(st.src==='replay'&&(d<today||d>today+maxA))d=today;
  st.dateIdx=Math.max(today,Math.min(today+maxA,d));st.date=dateStr(st.dateIdx);
}

/* ---------- finding a place ---------- */
const norm=s=>s.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu,'');
function matchPlace(text){
  const x=norm(text);if(!x)return{};
  const ids=Object.keys(N);
  const ex=ids.filter(id=>norm(N[id].en)===x||norm(N[id].hi)===x||norm(N[id].en.split(' (')[0])===x);
  if(ex.length===1)return{ok:1,id:ex[0]};
  const pre=ids.filter(id=>norm(N[id].en).startsWith(x)||norm(N[id].hi).startsWith(x));
  if(pre.length===1)return{ok:1,id:pre[0]};
  if(pre.length>1)return{amb:pre.slice(0,5)};
  const sub=ids.filter(id=>norm(N[id].en).includes(x)||norm(N[id].hi).includes(x));
  if(sub.length===1)return{ok:1,id:sub[0]};
  if(sub.length>1)return{amb:sub.slice(0,5)};
  return{};
}
function dropVirtual(vid){
  const v=VN[vid];if(!v)return;const e=v.edge;
  if(ADJ[e.a])ADJ[e.a]=ADJ[e.a].filter(x=>x!==e);
  delete ADJ[vid];delete S[e.id];if(st.series)delete st.series[e.id];delete VN[vid];
}
function setPlace(which,id){
  const vid=which==='from'?'vf':'vt';
  if(id!==vid)dropVirtual(vid);
  st[which]=id;st.pmsg=null;st.dep=null;st.pick=null;
}
function commitPlace(which,text){
  text=(text||'').trim();if(!text)return;
  const m=matchPlace(text);
  if(m.ok){setPlace(which,m.id);render();return;}
  if(m.amb){st.pmsg={which,k:'amb',list:m.amb,q:text};render();return;}
  st.pmsg={which,k:'nf',q:text};render();
}
async function searchOnline(){
  const pm=st.pmsg;if(!pm)return;const which=pm.which,qq=pm.q;
  st.pmsg={which,k:'busy',q:qq};render();
  try{
    const ctl=new AbortController();const to=setTimeout(()=>ctl.abort(),8000);
    const res=await fetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(qq)+'&count=10&language=en&format=json',{signal:ctl.signal});
    clearTimeout(to);if(!res.ok)throw new Error('http');
    const js=await res.json(),r=(js.results||[]).filter(x=>x.country_code==='IN')[0];
    if(!r){st.pmsg={which,k:'none',q:qq};render();return;}
    const vid=which==='from'?'vf':'vt';dropVirtual(vid);
    const name=r.name+(r.admin1?', '+r.admin1:'');
    if(!addVirtual(vid,name,r.latitude,r.longitude)){
      const nn=nearestNode(r.latitude,r.longitude);
      st.pmsg={which,k:'far',q:qq,name,n:nn.id,km:Math.round(nn.km)};render();return;
    }
    attachVirtualSeries();
    st[which]=vid;st.dep=null;st.pick=null;
    st.pmsg={which,k:'snap',q:name,name,n:VN[vid].snap,km:Math.round(VN[vid].gc),keep:1};
  }catch(e){st.pmsg={which,k:'off',q:qq};}
  render();
}

/* ---------- compute everything the screen needs ---------- */
function resolveTrip(){
  const fa=NODE(st.from),ta=NODE(st.to);
  if(!fa||!ta)return{err:'nf'};
  if(st.from===st.to)return{err:'same'};
  const src=fa.foot?fa.foot.head:st.from,dst=ta.foot?ta.foot.head:st.to;
  if(src===dst)return{err:'footonly'};
  return{src,dst,from:st.from,to:st.to,footFrom:fa.foot,footTo:ta.foot};
}
function refHour(){const today=dayOf(st.nowMs);return st.dateIdx===today?Math.min(23,Math.max(8,hourOf(st.nowMs)+1)):8;}
function pickPlan(plans){return plans.find(p=>p.tag===st.pick)||plans.find(p=>p.rec)||plans[0];}
function compute(){
  const trip=resolveTrip();if(trip.err)return{trip};
  const c=ctx(),dayMs=dayStartMs(st.dateIdx),depH=k=>(dayMs+k*3600e3-c.hour0)/3600e3;
  let k=st.dep!=null?st.dep:refHour();
  let plans=labelPlans(routePlans(trip.src,trip.dst,depH(k),c));
  if(!plans.length)return{trip,plans:[]};
  let sel=pickPlan(plans),slots=slotsFor(sel.path),bw=bestWindow(slots);
  if(st.dep==null&&bw&&bw.pick!==k){
    k=bw.pick;plans=labelPlans(routePlans(trip.src,trip.dst,depH(k),c));
    sel=pickPlan(plans);slots=slotsFor(sel.path);bw=bestWindow(slots);
  }
  return{trip,plans,sel,slots,bw,k,cur:slots[k],rules:rulesFor(slots[k],trip)};
}
function viaText(plan,all){
  const cand=plan.nodes.slice(1,-1).filter(id=>NODE(id).stay&&!NODE(id).virtual);
  const others=(all||[]).filter(p=>p!==plan);
  /* towns that only this road passes through say the most; fill up to three with evenly spaced common ones */
  let pick=others.length?cand.filter(id=>others.every(o=>o.nodes.indexOf(id)<0)).slice(0,2):[];
  const rest=cand.filter(id=>pick.indexOf(id)<0),need=3-pick.length;
  if(need>0&&rest.length)pick=pick.concat(rest.length<=need?rest:Array.from({length:need},(_,i)=>rest[Math.floor((i+.5)*rest.length/need)]));
  return cand.filter(id=>pick.indexOf(id)>=0).map(pname).join(' · ');
}
function windowText(w,slots){
  const a=slots[w.a].ms,b=slots[w.b].ms,s=slots[w.a];
  return clock(a)+(w.b>w.a?t('rng')+clock(b):'')+(st.src==='none'?'':' · '+t('road')+': '+(s.hasHill?t(LV[lvl(s.score)]):t('plains')))+' · '+t('trf')+': '+t('trf'+s.tlevel)+(w.halts?' · '+t('halt_t').toLowerCase():'');
}
function titleOf(M){return pname(M.trip.from)+' → '+pname(M.trip.to);}
function whyText(cur){
  const w=cur.worst;if(!w)return t('hl_pl');
  const seg=w.seg,route=pname(w.from)+' → '+pname(w.to);
  const rain=Math.round(w.P24),lim=Math.round(edThr(seg)(24));
  const slope=['',t('low'),t('med'),t('high')][seg.susc];
  const nRep=ctx().reports.filter(x=>x.seg===seg.id&&x.type!=='clear').length;
  if(w.blocked)return route+': '+t('blocked')+(st.lang==='hi'?'। '+nRep+' '+t('rep')+'।':'. '+nRep+' '+t(nRep===1?'rep1':'rep')+'.');
  const rp=nRep?(st.lang==='hi'?' '+t('rep')+': '+nRep+'।':' '+nRep+' '+t(nRep===1?'rep1':'rep')+'.'):'';
  const day=w.day>1?(st.lang==='hi'?' (दिन '+w.day+')':' (day '+w.day+')'):'';
  const mem=w.mem?' '+fill(t('mem_note'),{w:memWhen(w.mem)}):''; // heavy rain in the last days: debris may still be on the road
  if(v6Day(seg,w.start||0,ctx())!=null)return route+day+': '+fill(t('v6_why'),{r:rain,s:slope})+rp+mem; // model v6 set the score
  if(st.lang==='hi')return route+day+': '+rain+' '+t('mm24')+' ('+t('vs')+' '+lim+' मिमी)। '+t('slope')+': '+slope+'।'+rp+mem;
  return route+day+': '+rain+' '+t('mm24')+' '+t('vs')+' '+lim+' mm trigger. '+t('slope')+': '+slope+'.'+rp+mem;
}
function confText(){
  const lead=st.dateIdx-dayOf(st.nowMs);
  if(st.src==='sim')return t('cf_sim');
  if(st.src==='none')return t('cf_none');
  if(st.src==='replay')return t('cf_rp');
  if(lead<=0)return t('cf_today');
  return fill(t(lead<=2?'cf_hi':lead<=5?'cf_med':'cf_low'),{n:lead});
}

/* ---------- render ---------- */
function render(){
  document.documentElement.lang=st.lang==='hi'?'hi':'en';
  $('b-en').setAttribute('aria-pressed',st.lang==='en');$('b-hi').setAttribute('aria-pressed',st.lang==='hi');
  $('tag').textContent=t('tag');$('lw').textContent=t('lbl_w');$('lt').textContent=t('lbl_t');
  renderScnOptions();
  renderViews();
  const o2=$('tday').options;['td_cal','td_normal','td_weekend','td_leve','td_lstart','td_lend'].forEach((k,i)=>{o2[i].textContent=t(k);});$('tday').value=st.tday;
  $('dot').className='dot'+(st.src==='live'?' live':'');
  $('srcmsg').textContent=st.src==='none'?(st.err==='old'?fill(t('m_old'),{w:fmtDate(dayOf(st.cacheMade||st.cacheTs))}):t('m_none')):st.err==='fail'?t('m_fail'):st.err==='rpfail'?t('m_rpfail'):st.src==='sim'?t('m_sim')+clock(st.nowMs)+' IST':st.src==='live'?t('m_live')+clock(st.made||st.nowMs)+' IST'+viaMsg():st.src==='replay'?fill(t('m_rp'),{d:fmtDate(dayOf(st.nowMs))+' '+new Date(st.nowMs+IST).getUTCFullYear()}):cacheMsg();
  $('foot').innerHTML=footHtml();
  if(st.view!=='trip'){if(st.view==='ops')renderOps();else renderProof();return;}
  renderForm();
  const M=compute();st.M=M;
  if(M.trip.err||!M.plans||!M.plans.length){
    ['verdict','traffic','acts','planner','routes','panel'].forEach(id=>{$(id).innerHTML='';});
    $('tabs').innerHTML='';
    $('routes').innerHTML=M.trip.err?'':'<p class="note pad">'+t('ro_none')+'</p>';
    return;
  }
  const {sel,cur,slots,bw,k}=M,lv=cur.level,depMs=slots[k].ms;
  renderRoutes(M);
  $('verdict').innerHTML='<div class="sign l'+lv+'" role="status"><div class="sign-in">'
    +'<div class="kick">'+esc(t('road'))+'</div>'
    +'<div class="lvl">'+t(LV[lv])+'</div>'
    +'<div class="score"><b>'+(cur.hasHill?cur.score:'n/a')+'</b>'+t('risk')+' '+t('of100')+'</div>'
    +'<div class="hl">'+t(cur.hasHill?'hl'+lv:'hl_pl')+'</div>'
    +'<div class="why">'+esc(cur.hasHill&&lv===0?titleOf(M)+(st.lang==='hi'?'। सबसे ऊँचा जोखिम: ':'. Highest risk: ')+pname(cur.worst.from)+' → '+pname(cur.worst.to)+(st.lang==='hi'?'।':'.'):cur.hasHill?whyText(cur):'')+'</div>'
    +'<div class="meta">'+esc(titleOf(M))+' · ~'+Math.round(cur.totalKm/5)*5+' '+t('km')+' · '+t('leave')+' '+fmtDate(st.dateIdx)+' '+clock(depMs)+'</div>'
    +'</div></div>'
    +(cur.nightKm>0?'<p class="note pad" style="margin-top:8px">'+esc(t('late'))+'</p>':'');
  renderTraffic(M);
  $('acts').innerHTML='<button class="btn" id="a-listen" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/></svg>'+t('listen')+'</button>'
    +'<button class="btn pri" id="a-share" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4"/></svg>'+t('share')+' · WhatsApp</button>'
    +'<button class="btn" id="a-qr" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/></svg>'+t('qr_b')+'</button>';
  renderPlanner(M);
  $('tabs').innerHTML=['route','map','reports','rules','safety'].map(x=>'<button type="button" role="tab" data-t="'+x+'" aria-selected="'+(st.tab===x)+'">'+t('tabs')[x]+'</button>').join('');
  if(st.tab==='route')renderTrip(M);else if(st.tab==='map')renderMap(M);else if(st.tab==='reports')renderReports(M);else if(st.tab==='safety')renderSafety(M);else renderRules(M);
}
const PRESETS=[['delhi','mussoorie'],['delhi','kedarnath'],['delhi','nainital'],['dehradun','badrinath'],['nainital','badrinath'],['haldwani','pithoragarh']];
function renderForm(){
  const pm=st.pmsg;
  const val=which=>pm&&pm.which===which&&pm.q&&pm.k!=='snap'?pm.q:pname(st[which]);
  $('in-from').value=val('from');
  $('in-to').value=val('to');
  $('l-from').textContent=t('f_from');$('l-to').textContent=t('f_to');$('l-date').textContent=t('f_date');$('l-dep').textContent=t('f_dep');
  $('in-from').placeholder=$('in-to').placeholder=t('ph_place');
  $('swap').setAttribute('aria-label',t('swap'));$('swap').title=t('swap');
  const today=dayOf(st.nowMs);
  $('in-date').min=dateStr(today);$('in-date').max=dateStr(today+(st.src==='replay'?1:MAX_AHEAD));$('in-date').value=st.date;
  const dl='<option value="">'+t('f_auto')+'</option>';
  let opts='<option value="auto">'+esc(t('f_auto'))+'</option>';
  for(let h=0;h<24;h++)opts+='<option value="'+h+'">'+String(h).padStart(2,'0')+':00</option>';
  const ds=$('in-dep');ds.innerHTML=opts;ds.value=st.dep==null?'auto':String(st.dep);
  const other=Object.keys(N).map(id=>[id,N[id]]);
  $('places').innerHTML=other.map(([id,n])=>'<option value="'+esc(nm(n))+'" label="'+esc(st.lang==='hi'?n.en:n.hi)+'"></option>').join('');
  const ph=phaseOf(st.dateIdx),ev=ph.ev?' · '+nm(ph.ev):'';
  const calOut=st.tday==='cal'&&(st.dateIdx<dI(2026,10,1)||st.dateIdx>dI(2026,12,31));
  $('dline').innerHTML='<b>'+esc(fmtDate(st.dateIdx))+'</b> · '+esc(t('ph_'+ph.ph)+ev)+'<br><span class="mut">'+esc(confText())+'</span>'+(calOut?'<br><span class="mut">'+esc(t('cal_note'))+'</span>':'');
  let msg='';
  if(pm){
    if(pm.k==='nf')msg=esc(fill(t('pl_nf'),{q:pm.q,n:Object.keys(N).length}))+' <button class="lnk" type="button" data-find="1">'+t('pl_find')+'</button>';
    else if(pm.k==='busy')msg=esc(t('pl_busy'));
    else if(pm.k==='off')msg=esc(t('pl_off'));
    else if(pm.k==='none')msg=esc(fill(t('pl_none'),{q:pm.q}));
    else if(pm.k==='far')msg=esc(fill(t('pl_far'),{name:pm.name,n:pname(pm.n),k:pm.km}));
    else if(pm.k==='snap')msg=esc(fill(t('pl_snap'),{name:pm.name,n:pname(pm.n),k:pm.km}));
    else if(pm.k==='amb')msg=esc(t('pl_amb'))+' '+pm.list.map(id=>'<button class="lnk" type="button" data-pick-place="'+id+'" data-which="'+pm.which+'">'+esc(pname(id))+'</button>').join(' · ')+'?';
  }
  const M0=resolveTrip();
  if(M0.err==='same')msg=(msg?msg+'<br>':'')+esc(t('pl_same'));
  if(M0.err==='footonly')msg=(msg?msg+'<br>':'')+esc(t('pl_footonly'));
  $('pmsg').innerHTML=msg;$('pmsg').hidden=!msg;
  $('presets').innerHTML='<span class="mut">'+t('try_')+'</span>'+PRESETS.map((p,i)=>'<button class="pre" type="button" data-pre="'+i+'">'+esc(pname(p[0])+' → '+pname(p[1]))+'</button>').join('');
}
function optLabel(p){return t(p.tag==='fast'?'ro_fast':p.tag==='safe'?'ro_safe':p.tag==='best'?'ro_best':p.tag==='only'?'ro_only':'ro_alt');}
function renderRoutes(M){
  const f=M.plans.find(p=>p.tag==='fast'||p.tag==='best'||p.tag==='only')||M.plans[0];
  let h='<h3 class="rt-h">'+t('ro_t')+'</h3>';
  h+=M.plans.map(p=>{
    const d=p.elapsed-f.elapsed,dt=p===f?'':(Math.abs(d)<.08?t('ro_same'):(d>0?'+':'−')+fmtH(Math.abs(d)))+' '+t('ro_vs');
    const lv=p.level;
    return '<button class="ro" type="button" data-pickroute="'+p.tag+'" aria-pressed="'+(p===M.sel)+'">'
      +'<span class="ro-top"><b>'+esc(optLabel(p))+'</b>'+(p.rec&&M.plans.length>1?'<i class="rec">'+t('ro_rec')+'</i>':'')+'<span class="ro-t">'+fmtH(p.elapsed)+'</span></span>'
      +'<span class="ro-via">'+esc(viaText(p,M.plans)||titleOf(M))+'</span>'
      +'<span class="ro-m"><span class="pill rk l'+lv+'">'+(p.hasHill?t(LV[lv])+' '+p.score:t('plains'))+'</span><span class="pill l'+p.tlevel+'">'+t('trf'+p.tlevel)+'</span>'
      +'<span class="mut">'+Math.round(p.totalKm)+' '+t('km')+(p.halts.length?' · '+t('ro_total'):'')+(p.nightKm>0?' · '+t('ro_dark'):'')+(dt?' · '+esc(dt):'')+'</span></span></button>';
  }).join('');
  if(M.plans.length===1)h+='<p class="note">'+t('ro_none')+'</p>';
  $('routes').innerHTML=h;
}
function renderTraffic(M){
  const {cur,slots,bw,k,sel}=M,depMs=slots[k].ms;
  const phi=phaseOf(dayOf(depMs));
  const phTxt=t('ph_'+phi.ph)+(phi.ev?' · '+nm(phi.ev):'');
  const extra=cur.totalH-cur.normH,arrMs=msOf(cur.end);
  let h='<div class="trf-h"><h3>'+t('trf_t')+'</h3><span class="pill l'+cur.tlevel+'">'+t('trf'+cur.tlevel)+' '+Math.round(cur.tci)+'</span></div>'
    +'<p class="ph">'+esc(phTxt)+'</p>'
    +'<div class="times"><div class="tm ex"><small>'+t('expect')+'</small><b>'+fmtH(cur.totalH)+'</b><em>'+(extra>=.1?'+'+fmtH(extra):'')+'</em></div>'
    +'<div class="tm"><small>'+t('normal')+'</small><b>'+fmtH(cur.normH)+'</b><em>~'+Math.round(cur.totalKm/5)*5+' '+t('km')+'</em></div></div>'
    +(cur.halts.length?'<p class="ln">'+t('elapsed')+': <b>'+fmtH(cur.elapsed)+'</b></p>':'')
    +'<p class="ln">'+t('arrive')+' <b>'+esc(when(arrMs))+'</b></p>';
  cur.halts.forEach((hl,i)=>{h+='<p class="ln halt"><span class="moon"></span>'+esc(fill(t('halt_l'),{d:i+1,p:pname(hl.node),a:when(msOf(hl.arr)),r:when(msOf(hl.resume))}))+'</p>';});
  if(M.trip.footTo)h+='<p class="ln">'+esc(fill(t('foot_l'),{km:M.trip.footTo.km,h:pname(M.trip.footTo.head),t:fmtH(M.trip.footTo.h)}))+'</p>';
  if(M.trip.footFrom)h+='<p class="ln">'+esc(fill(t('foot_s'),{km:M.trip.footFrom.km,p:pname(M.trip.from),h:pname(M.trip.footFrom.head),t:fmtH(M.trip.footFrom.h*.7)}))+'</p>';
  const sl=cur.slowest;
  if(sl&&sl.dur-sl.norm>=.15)h+='<p class="ln">'+t('slowest')+': <b>'+esc(pname(sl.from)+' → '+pname(sl.to))+'</b> · ×'+sl.x.toFixed(1)+' · '+fmtH(sl.dur)+' / '+sl.seg.km+' '+t('km')+'</p>';
  if(sl&&sl.seg.jam&&sl.x>=1.3)h+='<p class="ln mut">'+t('jam')+': '+sl.seg.jam.map(p=>esc(nm(p))).join(' · ')+'</p>';
  if(cur.rainAdd>=.1)h+='<p class="ln mut">'+(st.lang==='hi'?t('rainadd')+' '+fmtH(cur.rainAdd)+' और लगेंगे।':t('rainadd')+' '+fmtH(cur.rainAdd)+'.')+'</p>';
  if(bw&&(k<bw.a||k>bw.b)){
    const ref=slots[bw.a],saved=cur.totalH-ref.totalH;
    h+='<p class="ln tip">'+t('tipL')+' '+esc(clock(ref.ms))+': '+(saved>=.25?t('tipSave').replace('{x}',fmtH(saved)):t('tipSafe'))+'.</p>';
  }
  const rl=M.rules.slice().sort((a,b)=>TAGORD[RULES[a].tag]-TAGORD[RULES[b].tag]).slice(0,2);
  if(rl.length)h+='<div class="gochips" aria-label="'+esc(t('bg_t'))+'">'+rl.map(x=>'<button class="gc" type="button" data-go="rules"><i class="tg '+RULES[x].tag+'">'+t(RULES[x].tag)+'</i>'+esc(RULES[x][st.lang].h)+'</button>').join('')+'</div>';
  h+='<p class="ln mut">'+t('trf_note')+'</p>';
  $('traffic').innerHTML=h;
}
function renderPlanner(M){
  const {slots,bw,k}=M;
  const W=360,bw_=11,step=15,top=16,h=64,base=top+h,sy=base+16;
  let bars='';
  slots.forEach((s,i)=>{
    const x=i*step+2,bh=Math.max(8,Math.round(h*s.score/100)),y=base-bh,l=s.level,ok=slotOk(s)&&true,sel=i===k;
    bars+='<g class="slot" data-k="'+i+'" role="button" tabindex="0" aria-label="'+esc(clock(s.ms)+' '+(s.hasHill?t(LV[l])+' '+s.score:t('plains'))+', '+t('trf')+' '+t('trf'+s.tlevel)+(s.halts.length?', '+t('halt_t'):''))+'">'
      +'<rect x="'+(x-2)+'" y="'+(top-4)+'" width="15" height="'+(h+8+22)+'" fill="transparent"/>'
      +'<rect x="'+x+'" y="'+y+'" width="'+bw_+'" height="'+bh+'" rx="1.5" fill="var(--'+LV[l]+')" opacity="'+(ok?1:.4)+'"/>'
      +'<rect x="'+x+'" y="'+sy+'" width="'+bw_+'" height="7" rx="2" fill="var(--'+LV[s.tlevel]+')" opacity="'+(ok?1:.4)+'"/>'
      +(s.halts.length&&ok?'<circle cx="'+(x+bw_/2)+'" cy="'+(y-4)+'" r="2.4" fill="var(--ink)"/>':'')
      +(sel?'<rect x="'+(x-1.5)+'" y="'+(y-1.5)+'" width="'+(bw_+3)+'" height="'+(bh+3)+'" rx="2.5" fill="none" stroke="var(--ink)" stroke-width="1.5"/><rect x="'+(x-1.5)+'" y="'+(sy-1.5)+'" width="'+(bw_+3)+'" height="10" rx="3" fill="none" stroke="var(--ink)" stroke-width="1.5"/>':'')
      +'</g>';
    if(i%3===0)bars+='<text x="'+(x+bw_/2)+'" y="'+(base+11)+'" text-anchor="middle">'+String(i).padStart(2,'0')+'</text>';
  });
  let br='';
  if(bw){const x1=bw.a*step+2,x2=bw.b*step+2+bw_;br='<path d="M'+x1+' '+(sy+16)+'v4h'+(x2-x1)+'v-4" fill="none" stroke="var(--ink)" stroke-width="1.6"/>';}
  const guides='<line x1="0" x2="'+W+'" y1="'+(base-h*.35)+'" y2="'+(base-h*.35)+'" stroke="var(--line)" stroke-dasharray="2 3"/><line x1="0" x2="'+W+'" y1="'+(base-h*.65)+'" y2="'+(base-h*.65)+'" stroke="var(--line)" stroke-dasharray="2 3"/>';
  let msg,tagc='n';
  if(bw){msg=esc(windowText(bw,slots));tagc='l'+lvl(bw.score);}else msg=esc(t('nowin'));
  $('planner').innerHTML='<h3>'+t('plan_t')+' · '+esc(fmtDate(st.dateIdx))+'</h3><p class="sub">'+t('plan_s')+'</p>'
    +'<div class="best"><span class="tag '+tagc+'">'+t('best')+'</span><span>'+msg+'</span></div>'
    +'<svg class="chart" viewBox="0 0 '+W+' '+(sy+26)+'" role="group" aria-label="'+esc(t('plan_t'))+'">'+guides+bars+br+'</svg>'
    +'<div class="legend"><span><i style="background:var(--go)"></i>'+t('go')+' / '+t('trf0')+'</span><span><i style="background:var(--cau)"></i>'+t('cau')+' / '+t('trf1')+'</span><span><i style="background:var(--avd)"></i>'+t('avd')+' / '+t('trf2')+'</span><span><i style="background:var(--muted);opacity:.4"></i>'+t('dark')+'</span><span><i style="background:var(--ink);border-radius:50%;width:7px;height:7px"></i>'+t('halt_leg')+'</span></div>';
}
function renderTrip(M){
  const cur=M.cur;let h='';
  if(M.trip.footFrom)h+='<div class="seg ft"><div class="km"><b>↓</b></div><div class="nm">'+esc(fill(t('foot_s'),{km:M.trip.footFrom.km,p:pname(M.trip.from),h:pname(M.trip.footFrom.head),t:fmtH(M.trip.footFrom.h*.7)}))+'</div></div>';
  cur.rows.forEach((r,idx)=>{
    if(idx>0&&r.day!==cur.rows[idx-1].day){
      const hl=cur.halts[r.day-2];
      h+='<div class="nightbar"><span class="moon"></span><b>'+t('halt_t')+' · '+esc(pname(hl.node))+'</b> '+esc(when(msOf(hl.arr))+' → '+when(msOf(hl.resume)))+'</div>';
    }
    const seg=r.seg,l=lvl(r.score),slope=['',t('low'),t('med'),t('high')][seg.susc],tl=tlvl(r.ci);
    const nRep=ctx().reports.filter(x=>x.seg===seg.id&&x.type!=='clear').length;
    const rain=Math.round(r.P24),lim=Math.round(edThr(seg)(24));
    const spots=seg.spots.length?'<div class="sp"><span class="warn-tri"></span>'+seg.spots.map(p=>esc(nm(p))).join(' · ')+'</div>':'';
    const pill=seg.plain?'<span class="pill pl">'+t('plains')+'</span>':'<span class="pill rk l'+l+'">'+(r.blocked?t('blocked'):t(LV[l]))+' '+r.score+'</span>';
    const rs=seg.plain?t('plains_note'):(st.src==='none'?'':t('rain')+' '+rain+'/'+lim+' mm · ')+t('slope')+' '+slope+(nRep?' · '+nRep+' '+t(nRep===1?'rep1':'rep'):'');
    const tr='<div class="tr"><i class="l'+tl+'"></i><span>'+esc(clock(msOf(r.start))+t('rng')+clock(msOf(r.end)))+' · '+t('trf')+' ×'+r.x.toFixed(1)+' · '+fmtH(r.dur)+' ('+t('usually')+' '+fmtH(r.norm)+')'+(r.dark?' · <span class="dk">'+t('darkseg')+'</span>':'')+'</span></div>';
    const jam=seg.jam&&r.x>=1.3?'<div class="sp">'+t('jam')+': '+seg.jam.map(p=>esc(nm(p))).join(' · ')+'</div>':'';
    h+='<div class="seg"><div class="km"><b>'+Math.round(r.kmStart)+'</b>'+t('km')+'</div>'
      +'<div class="nm">'+esc(pname(r.from)+' → '+pname(r.to))+'</div>'+pill
      +'<div class="rs">'+rs+'</div>'+tr+jam+spots+'</div>';
  });
  if(M.trip.footTo)h+='<div class="seg ft"><div class="km"><b>↑</b></div><div class="nm">'+esc(fill(t('foot_l'),{km:M.trip.footTo.km,h:pname(M.trip.footTo.head),t:fmtH(M.trip.footTo.h)}))+'</div></div>';
  $('panel').innerHTML=h;
}
/* Map: real latitude and longitude, fitted to the route. Other roads are drawn faintly for context. */
function renderMap(M){
  const sel=M.sel,tl=st.layer==='traffic',cur=M.cur;
  const nodeIds=[];M.plans.forEach(p=>p.nodes.forEach(id=>{if(nodeIds.indexOf(id)<0)nodeIds.push(id);}));
  if(M.trip.footTo)nodeIds.push(M.trip.to);if(M.trip.footFrom)nodeIds.push(M.trip.from);
  const pts=nodeIds.map(NODE);
  let minLat=Math.min(...pts.map(p=>p.lat)),maxLat=Math.max(...pts.map(p=>p.lat)),minLon=Math.min(...pts.map(p=>p.lon)),maxLon=Math.max(...pts.map(p=>p.lon));
  const lat0=(minLat+maxLat)/2,kx=Math.cos(lat0*Math.PI/180);
  if(maxLat-minLat<.25){const m=(minLat+maxLat)/2;minLat=m-.125;maxLat=m+.125;}
  if((maxLon-minLon)*kx<.25){const m=(minLon+maxLon)/2;minLon=m-.125/kx;maxLon=m+.125/kx;}
  const W=360,padX=40,padY=30,Hmax=430;
  const sc=Math.min((W-2*padX)/((maxLon-minLon)*kx),(Hmax-2*padY)/(maxLat-minLat));
  const w=(maxLon-minLon)*kx*sc,h=(maxLat-minLat)*sc,H=Math.max(210,Math.round(h+2*padY)),ox=(W-w)/2,oy=(H-h)/2;
  const P=(lat,lon)=>[ox+(lon-minLon)*kx*sc,oy+(maxLat-lat)*sc];
  let gs='';
  EDGES.forEach(e=>{const a=P(N[e.a].lat,N[e.a].lon),b=P(N[e.b].lat,N[e.b].lon);gs+='<line x1="'+a[0].toFixed(1)+'" y1="'+a[1].toFixed(1)+'" x2="'+b[0].toFixed(1)+'" y2="'+b[1].toFixed(1)+'" stroke="var(--line)" stroke-width="1.8" stroke-linecap="round"/>';});
  Object.keys(N).forEach(id=>{if(nodeIds.indexOf(id)>=0||N[id].foot)return;const p=P(N[id].lat,N[id].lon);if(p[0]>0&&p[0]<W&&p[1]>0&&p[1]<H)gs+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="1.7" fill="var(--muted)" opacity=".45"/>';});
  let alt='';
  M.plans.forEach(p=>{if(p===sel)return;p.rows.forEach(r=>{const a=P(NODE(r.from).lat,NODE(r.from).lon),b=P(NODE(r.to).lat,NODE(r.to).lon);alt+='<line x1="'+a[0].toFixed(1)+'" y1="'+a[1].toFixed(1)+'" x2="'+b[0].toFixed(1)+'" y2="'+b[1].toFixed(1)+'" stroke="var(--muted)" stroke-width="2.4" stroke-dasharray="4 3" stroke-linecap="round"/>';});});
  let g='';
  cur.rows.forEach(r=>{const a=P(NODE(r.from).lat,NODE(r.from).lon),b=P(NODE(r.to).lat,NODE(r.to).lon),s=r.seg;
    const col=tl?'var(--'+LV[tlvl(r.ci)]+')':s.plain?'var(--muted)':'var(--'+LV[lvl(r.score)]+')';
    g+='<line x1="'+a[0].toFixed(1)+'" y1="'+a[1].toFixed(1)+'" x2="'+b[0].toFixed(1)+'" y2="'+b[1].toFixed(1)+'" stroke="var(--surface)" stroke-width="10" stroke-linecap="round"/>'
      +'<line x1="'+a[0].toFixed(1)+'" y1="'+a[1].toFixed(1)+'" x2="'+b[0].toFixed(1)+'" y2="'+b[1].toFixed(1)+'" stroke="'+col+'" stroke-width="6" stroke-linecap="round"'+(!tl&&s.plain?' opacity=".45"':'')+(!tl&&r.blocked?' stroke-dasharray="1 8"':'')+'/>';});
  if(!tl){
    cur.rows.forEach(r=>{const s=r.seg;if(!s.spots.length||s.virtual)return;const A=N[s.a],B=N[s.b];s.spots.forEach(sp=>{
      const p=P(A.lat+(B.lat-A.lat)*sp.f,A.lon+(B.lon-A.lon)*sp.f);
      g+='<path d="M'+p[0].toFixed(1)+' '+(p[1]-7).toFixed(1)+'l5.5 10h-11z" fill="var(--cau)" stroke="var(--ink)" stroke-width="1" stroke-linejoin="round"/>';});});
    ctx().reports.filter(r=>r.type!=='clear'&&cur.rows.some(x=>x.seg.id===r.seg)).forEach(r=>{const s=S[r.seg],A=N[s.a],B=N[s.b],f=s.spots[r.spot]?s.spots[r.spot].f:.5;
      const p=P(A.lat+(B.lat-A.lat)*f,A.lon+(B.lon-A.lon)*f);
      g+='<circle cx="'+(p[0]+10).toFixed(1)+'" cy="'+(p[1]-10).toFixed(1)+'" r="6.5" fill="var(--avd)" stroke="var(--surface)" stroke-width="1.5"/><text x="'+(p[0]+10).toFixed(1)+'" y="'+(p[1]-7).toFixed(1)+'" text-anchor="middle" style="fill:var(--avd-ink);stroke:none;font-weight:700;font-size:8.5px">!</text>';});
  }
  const placed=[];
  const place=(x,y,txt)=>{
    const wd=txt.length*4.7+4,opts=[[7,3,'start'],[-7,3,'end'],[0,-8,'middle'],[0,15,'middle']];let first=null;
    for(const o of opts){
      const tx=x+o[0],ty=y+o[1],x0=o[2]==='start'?tx:o[2]==='end'?tx-wd:tx-wd/2,box=[x0,ty-8,x0+wd,ty+2];
      if(!first)first=[tx,ty,o[2],box];
      if(box[0]<2||box[2]>W-2||box[1]<2||box[3]>H-2)continue;
      if(placed.every(b=>b[2]<box[0]||b[0]>box[2]||b[3]<box[1]||b[1]>box[3])){placed.push(box);return[tx,ty,o[2]];}
    }
    placed.push(first[3]);return first;
  };
  const ends=[M.trip.from,M.trip.to];
  let circ='',lab='';
  /* ends are labelled first so their names win any collision */
  nodeIds.slice().sort((a,b)=>(ends.indexOf(b)>=0)-(ends.indexOf(a)>=0)).forEach(id=>{
    if(!NODE(id)||(!sel.nodes.includes(id)&&ends.indexOf(id)<0))return;
    const n=NODE(id),p=P(n.lat,n.lon),isEnd=ends.indexOf(id)>=0,L=place(p[0],p[1],pname(id));
    circ+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="'+(isEnd?5:3.8)+'" fill="'+(isEnd?'var(--ink)':'var(--surface)')+'" stroke="var(--ink)" stroke-width="1.8"/>';
    lab+='<text x="'+L[0].toFixed(1)+'" y="'+L[1].toFixed(1)+'" text-anchor="'+L[2]+'"'+(isEnd?' style="font-weight:700"':'')+'>'+esc(pname(id))+'</text>';
  });
  g+=circ+lab;
  cur.halts.forEach((hl,i)=>{const n=NODE(hl.node),p=P(n.lat,n.lon);g+='<g><rect x="'+(p[0]-17).toFixed(1)+'" y="'+(p[1]+7).toFixed(1)+'" width="34" height="11" rx="5.5" fill="var(--ink)"/><text x="'+p[0].toFixed(1)+'" y="'+(p[1]+15.5).toFixed(1)+'" text-anchor="middle" style="fill:var(--bg);stroke:none;font-size:7.5px;font-weight:700">'+esc(t('day')+' '+(i+1))+'</text></g>';});
  const legend=(tl?'<span><i style="background:var(--go)"></i>'+t('trf0')+'</span><span><i style="background:var(--cau)"></i>'+t('trf1')+'</span><span><i style="background:var(--avd)"></i>'+t('trf2')+'</span>'
    :'<span><i style="background:var(--go)"></i>'+t('go')+'</span><span><i style="background:var(--cau)"></i>'+t('cau')+'</span><span><i style="background:var(--avd)"></i>'+t('avd')+'</span><span><i style="background:var(--muted);opacity:.45"></i>'+t('plains')+'</span><span><span class="warn-tri"></span>'+t('hot')+'</span><span><i style="background:var(--avd);border-radius:50%"></i>'+t('rep')+'</span>')
    +(M.plans.length>1?'<span><i style="background:none;border-top:2px dashed var(--muted);height:0;border-radius:0;vertical-align:2px"></i>'+t('other_rt')+'</span>':'');
  $('panel').innerHTML='<div class="tog sm" role="group" aria-label="Map layer"><button type="button" data-ly="risk" aria-pressed="'+!tl+'">'+t('lay_risk')+'</button><button type="button" data-ly="traffic" aria-pressed="'+tl+'">'+t('lay_trf')+'</button></div>'
    +'<svg class="map" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(titleOf(M))+'">'+gs+alt+g+'</svg>'
    +'<div class="legend">'+legend+'</div><p class="mapnote">'+t('maplegend')+'</p>';
}
function renderRules(M){
  const list=M.rules.slice().sort((a,b)=>TAGORD[RULES[a].tag]-TAGORD[RULES[b].tag]);
  $('panel').innerHTML='<h4 class="sec" style="margin-top:0">'+t('rules_t')+' · '+esc(titleOf(M))+'</h4><p class="note" style="margin:0 0 10px">'+t('rules_s')+'</p>'
    +(list.length?list.map(k=>{const R=RULES[k],x=R[st.lang];
      return '<div class="rule"><h4><span>'+esc(x.h)+'</span><span class="tg '+R.tag+'">'+t(R.tag)+'</span></h4><p>'+esc(x.b)+'</p>'
        +'<p class="srcl">'+t('src_l')+': '+R.srcs.map(s=>'<a href="'+esc(s[0])+'" target="_blank" rel="noopener noreferrer">'+esc(s[1])+'</a>').join(' · ')+'</p></div>';}).join(''):'<p class="note">'+t('rules_none')+'</p>')
    +'<p class="note">'+t('rules_why')+'</p><p class="note"><b>'+t('rules_foot')+'</b></p>';
}
function spotOptions(M){
  const o=[],seen={};M.cur.rows.forEach(r=>{const s=r.seg;if(seen[s.id])return;seen[s.id]=1;if(s.plain)return;
    s.spots.forEach((p,i)=>o.push({v:s.id+'|'+i,l:nm(p)+' ('+pname(s.a)+' → '+pname(s.b)+')'}));o.push({v:s.id+'|-1',l:pname(s.a)+' → '+pname(s.b)});});
  return o;
}
function repLabel(r){const s=S[r.seg],sp=s.spots[r.spot];return sp?nm(sp):pname(s.a)+' → '+pname(s.b);}
function ago(ms){const m=Math.max(1,Math.round((st.nowMs-ms)/60000));return m<90?m+' '+t('min'):(m/60).toFixed(m<600?1:0)+' '+t('hr');}
function renderReports(M){
  const ids=M.cur.rows.map(r=>r.seg.id);
  const list=ctx().reports.filter(r=>ids.indexOf(r.seg)>=0).sort((a,b)=>b.ts-a.ts);
  const so=spotOptions(M);
  $('panel').innerHTML=(so.length?'<div class="form"><h4 class="sec" style="margin-top:0">'+t('rtitle')+'</h4>'
    +'<label for="r-loc">'+t('rloc')+'<select id="r-loc">'+so.map(o=>'<option value="'+esc(o.v)+'">'+esc(o.l)+'</option>').join('')+'</select></label>'
    +'<label for="r-type">'+t('rtype')+'<select id="r-type">'+['landslide','debris','washed','bridge','clear'].map(x=>'<option value="'+x+'">'+t('t_'+x)+'</option>').join('')+'</select></label>'
    +'<button class="btn pri" id="r-send" type="button">'+t('send')+'</button><p class="note">'+t('rnote')+'</p></div>':'<p class="note">'+t('plains_note')+'</p>')
    +'<h4 class="sec">'+t('recent')+'</h4>'
    +(list.length?list.map(r=>'<div class="rep"><div class="t">'+esc(t('t_'+r.type))+'</div><button type="button" data-c="'+esc(r.id)+'" aria-label="'+esc(t('confirm'))+'">'+t('confirm')+' · '+r.conf+'</button>'
      +'<div class="m">'+esc(repLabel(r))+' · '+ago(r.ts)+' '+t('ago')+' · '+(r.sample?t('sample'):r.shared?t('sh_from'):t('you'))+'</div></div>').join(''):'<p class="note">'+t('rep_none')+'</p>')
    +shareBox();
}

/* ---------- actions ---------- */
function toast(msg){const e=$('toast');e.textContent=msg;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>{e.hidden=true;},2200);}
function summary(){
  const M=st.M;if(!M||!M.cur)return '';
  const {cur,bw,slots,trip}=M,L=st.lang;
  const nr=st.src==='none',lvW=nr?t('cf_none'):cur.hasHill?t(LV[cur.level]):t('plains'),title=titleOf(M),tl=t('trf'+cur.tlevel);
  const rl=M.rules.filter(k=>RULES[k].tag==='req').map(k=>RULES[k][L].h);
  const dateS=fmtDate(st.dateIdx)+' '+clock(slots[M.k].ms);
  const halt=cur.halts.map((h,i)=>(L==='hi'?'रात का पड़ाव: ':'Night halt: ')+pname(h.node)+' ('+when(msOf(h.arr))+')').join('; ');
  const via=viaText(M.sel,M.plans);
  if(L==='hi')return 'पहाड़ पथ · '+title+' · '+dateS+'\nसड़क: '+lvW+(cur.hasHill&&!nr?' (जोखिम '+cur.score+'/100)':'')+' · ट्रैफ़िक: '+tl+'\nगाड़ी चलाने का अनुमानित समय '+fmtH(cur.totalH)+' (आम दिन में '+fmtH(cur.normH)+')।'+(via?'\nरास्ता: '+via+'।':'')+(halt?'\n'+halt+'।':'')+(bw?'\nसबसे अच्छा समय: '+windowText(bw,slots)+'।':'\n'+t('nowin'))+(rl.length?'\nनिकलने से पहले: '+rl.join(', ')+'।':'')+'\nयह सिर्फ़ सलाह है। सड़क पर पुलिस और प्रशासन की सूचना मानें।';
  return 'PahaadPath · '+title+' · '+dateS+'\nROAD: '+lvW.toUpperCase()+(cur.hasHill&&!nr?' (landslide risk '+cur.score+'/100)':'')+' · TRAFFIC: '+tl.toUpperCase()+'\nExpected driving time '+fmtH(cur.totalH)+' (normal day '+fmtH(cur.normH)+').'+(via?'\nVia '+via+'.':'')+(halt?'\n'+halt+'.':'')+(bw?'\nBest window: '+windowText(bw,slots)+'.':'\n'+t('nowin'))+(rl.length?'\nBefore you go: '+rl.join(', ')+'.':'')+'\nAdvisory only. Follow police and district notices on the road.';
}
function speak(){
  const txt=summary().replace(/\n/g,'. ').replace(/PahaadPath ·|पहाड़ पथ ·/,'').replace(/→/g,st.lang==='hi'?' से ':' to ');
  if(window.PPAndroid&&window.PPAndroid.speak&&window.PPAndroid.speak(txt,st.lang==='hi'?'hi-IN':'en-IN'))return; // the phone's own voice; a WebView has none
  try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(txt);u.lang=st.lang==='hi'?'hi-IN':'en-IN';u.rate=.95;speechSynthesis.speak(u);}catch(e){toast(txt);}
}
function share(){shareTextOut(summary());}
function resetPick(){st.dep=null;st.pick=null;}
document.addEventListener('click',e=>{
  const c=e.target.closest('[data-t],[data-c],[data-go],[data-ly],[data-pickroute],[data-pre],[data-find],[data-pick-place],#swap,#b-en,#b-hi,#a-listen,#a-share,#r-send,.slot');if(!c)return;
  if(c.dataset.t){st.tab=c.dataset.t;render();}
  else if(c.dataset.go){st.tab=c.dataset.go;render();$('tabs').scrollIntoView({block:'start',behavior:'smooth'});}
  else if(c.dataset.ly){st.layer=c.dataset.ly;render();}
  else if(c.dataset.pickroute){st.pick=c.dataset.pickroute;render();}
  else if(c.dataset.pre!=null){const p=PRESETS[+c.dataset.pre];dropVirtual('vf');dropVirtual('vt');st.from=p[0];st.to=p[1];st.pmsg=null;resetPick();render();}
  else if(c.dataset.find){searchOnline();}
  else if(c.dataset.pickPlace){setPlace(c.dataset.which,c.dataset.pickPlace);render();}
  else if(c.id==='swap'){
    const f=st.from,tt=st.to;
    const vf=VN.vf,vt=VN.vt; // swapping with a snapped place: move the virtual node to the other slot
    if(vf||vt){
      const a=vf?{name:vf.en,lat:vf.lat,lon:vf.lon}:null,b=vt?{name:vt.en,lat:vt.lat,lon:vt.lon}:null;
      dropVirtual('vf');dropVirtual('vt');
      let nf=tt,nt=f;
      if(b&&addVirtual('vf',b.name,b.lat,b.lon))nf='vf';
      if(a&&addVirtual('vt',a.name,a.lat,a.lon))nt='vt';
      attachVirtualSeries();st.from=nf;st.to=nt;
    }else{st.from=tt;st.to=f;}
    st.pmsg=null;resetPick();render();
  }
  else if(c.dataset.c){const r=ctx().reports.find(x=>x.id===c.dataset.c);if(r){if(r.shared){confirmShared(r);}else{r.conf++;if(!r.sample){saveUser();shareReport(r,'confirm');}}render();}}
  else if(c.id==='b-en'||c.id==='b-hi'){st.lang=c.id==='b-hi'?'hi':'en';try{localStorage.setItem('pp_lang',st.lang);}catch(e){}render();}
  else if(c.id==='a-listen')speak();
  else if(c.id==='a-share')share();
  else if(c.id==='r-send'){
    const [seg,sp]=$('r-loc').value.split('|');const type=$('r-type').value;
    const r={id:'u'+Date.now(),seg,spot:+sp,type,ts:st.nowMs,conf:0,sample:false};st.user.push(r);saveUser();shareReport(r,'report');toast(t('sent'));render();
  }
  else if(c.classList&&c.classList.contains('slot')){st.dep=+c.dataset.k;render();}
});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.classList&&e.target.classList.contains('slot')){e.preventDefault();st.dep=+e.target.dataset.k;render();}});
$('in-from').addEventListener('change',e=>commitPlace('from',e.target.value));
$('in-to').addEventListener('change',e=>commitPlace('to',e.target.value));
$('in-date').addEventListener('change',e=>{const d=parseDate(e.target.value);if(d!=null){st.dateIdx=d;clampDate();resetPick();}render();});
$('in-dep').addEventListener('change',e=>{st.dep=e.target.value==='auto'?null:+e.target.value;render();});
$('scn').addEventListener('change',e=>{st.scn=e.target.value;st.err='';load();});
/* live mode stays current: refetch the forecast every hour, and as soon as a dropped connection comes back */
let liveWanted=st.scn==='live';
$('scn').addEventListener('change',()=>{liveWanted=st.scn==='live';});
setInterval(()=>{if(liveWanted&&st.src==='live'&&!document.hidden)load();},3600e3);
/* the online event is not enough: a phone app's web view may never fire it, and in the hills the radio often connects before data
   flows. So while the app shows a saved forecast it quietly tries again every few minutes and whenever it comes back to the screen,
   and redraws only when the new forecast has arrived. */
const offlineNow=()=>liveWanted&&(st.src==='cache'||st.src==='none'||st.src==='sim'&&st.err==='fail');
function retryLive(){
  if(!offlineNow()||document.hidden||navigator.onLine===false)return;
  const a=document.activeElement;if(a&&(a.tagName==='INPUT'||a.tagName==='SELECT'))return; // do not redraw under a typing finger
  const was=[st.nowMs,st.hour0];setClock(false); // the pack is lined up with the real clock
  fetchWeather().then(w=>{if(offlineNow()){st.scn='live';load(w);}},()=>{[st.nowMs,st.hour0]=was;});
}
setInterval(retryLive,5*60e3);
document.addEventListener('visibilitychange',retryLive);
window.addEventListener('online',()=>{if(liveWanted&&st.src!=='live'){st.scn='live';load();}});
$('tday').addEventListener('change',e=>{st.tday=e.target.value;render();});

/*__FEATURES_JS__*/
window.PP={S,N,EDGES,ADJ,VN,PLACES,HOURS_FROM_DELHI,CAINE,edThr,segScore,evalEdge,routeSearch,routePlans,labelPlans,simulate,slotsFor,bestWindow,rulesFor,
  st,ctx,lvl,tlvl,phaseOf,calInfo,CAL,dayOf,dI,dateStr,setTrafficProvider,addVirtual,dropVirtual,nearestNode,compute,render,matchPlace,commitPlace,load,clampDate,hav,
  fetchLive,parseAsk,setThr:x=>{THR=x;},shPoll,tuneData,sharedReports,applyAsk,opsData,applyOpenData,get OD(){return OD;},get RP(){return RP;},get last(){return st.M;},modelCheck,get MODEL(){return MODEL;},back:goBack,onSpeech,mapLines,googleNavUrl,mapplsNavUrl,navStops,shareUrl,locate};
loadUser();load();

})();
