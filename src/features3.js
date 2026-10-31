/* ================= v5: trained risk model with rain memory, daily data pack, offline use for days, report outbox, share the app ================= */
Object.assign(T.en,{
  bt_t:'Checked against every PWD closure',bt_s:'Each hill stretch, each day of {a} to {b}: was it warned? Did PWD report it closed? {c} closures from {r} daily reports.',
  bt_caine:'Caine 1980 threshold',bt_fit:'Fitted to closures ({l}% level)',bt_use:'in use',
  bt_pod:'Closures warned',bt_far:'Warnings with no closure',bt_tss:'Skill (TSS)',bt_lead:'Median warning ahead',
  bt_cau:'At Caution',bt_avo:'At Avoid',bt_ci:'95% range',bt_none:'Not run yet: the backtest runs after the closure collector.',
  bt_kept:'Fitted thresholds are not used: they did not beat Caine by more than its 95% range on held-out days.',
  bt_adopt:'Fitted thresholds are in use: they beat Caine on held-out days by more than its 95% range.',
  v6_why:'{r} mm rain in 24 h. GSI landslide susceptibility {s}. Model v7: the rain threshold corrected for soil moisture, 30-day rain and GSI, checked against PWD closures and NASA landslide records.',in_t:'Checked on other years',in_s:'Monsoons {y}: {n} stretch-days with a landslide reported near the road (NASA landslide catalogues). Neither method was fitted on these years.',in_c:'Caught at Caution',in_cf:'Days at Caution',in_a:'Caught at Avoid',in_af:'Days at Avoid',in_10:'Caught when 1 day in 10 is flagged',in_eng:'Rain threshold (Caine, GSI)',in_note:'These catalogues list only landslides that reached the news or a volunteer, so a day without one is not known to be safe. Compare how many reported landslides each method caught, best at the same share of days flagged.',bt_v6:'Model v6',bt_was:'Current engine:',bt_right:'Caution warnings that were right',bt_v6use:'in use',bt_prec:'Precision',
  bt_v6k:'Model v6 uses: {g}. It plans the trip screen and sends the phone alerts because it beat Caine by more than its 95% range on held-out days. With no data pack (in replays or when offline over 10 days) the app falls back to the Caine threshold.',bt_fitv6:'The fitted thresholds also beat Caine, but model v6 does far better, so v6 is used.',bt_fitoff:'The fitted thresholds beat Caine on this season but warn on too many days, so they are not used.',bt_v6fail:'Model v6 beat Caine on the 2026 PWD season but not on other years, so the app uses the Caine threshold with GSI susceptibility.',bt_v6wait:'Model v6 is waiting for the check on other years; until it passes, the app uses the Caine threshold with GSI susceptibility.',
  g_rain:'rain',g_static:'slope and past landslides',g_peak:'cloudburst intensity',g_soil:'soil moisture',g_season:'92-day rain',g_history:'past PWD closures',g_cold:'freeze-thaw',g_quake:'earthquakes',
  mem_note:'Very heavy rain here {w}: debris may still block the road. Ask locally and check road reports.',mem_1:'yesterday',mem_n:'{n} days ago',
  via_pack:' (from the PahaadPath data pack)',
  age_ok:'Offline. Forecast saved {w} ({a} ago).',age_old:'Offline. Forecast saved {w}, {a} ago. Rain since then is not known: ask locally and check road reports.',
  age_h:'{n} h',age_d:'{n} days',
  en_t:'Risk engine',en_v5:'Trained model v5 (experimental)',en_v4:'Rain threshold v4 (Caine 1980)',
  en_s:'v5 was fitted on {n} landslide days in the NASA catalog (2007 to 2017) with 30 days of rain at each road. Checked year by year it did not catch more landslide days than v4 at the same number of warnings, so v4 is the default.',
  ob_n:'{n} reports waiting for signal',ob_1:'1 report waiting for signal',
  app_apk:'Android app (APK file)',
  app_t:'Share the app with no internet',app_s:'Saves this whole app as one file. Send it by WhatsApp, Bluetooth or a memory card; it opens in any phone browser and works offline.',app_b:'Save or share the app file',app_done:'App file ready'
});
Object.assign(T.hi,{
  bt_t:'PWD की हर बंदी से जाँच',bt_s:'{a} से {b} तक हर पहाड़ी हिस्सा, हर दिन: क्या चेतावनी दी गई? क्या PWD ने उसे बंद बताया? {r} दैनिक रिपोर्टों से {c} बंदियाँ।',
  bt_caine:'Caine 1980 सीमा',bt_fit:'बंदियों से निकाली सीमा ({l}% स्तर)',bt_use:'उपयोग में',
  bt_pod:'जिन बंदियों पर चेतावनी थी',bt_far:'बिना बंदी की चेतावनियाँ',bt_tss:'कौशल (TSS)',bt_lead:'चेतावनी कितने घंटे पहले (मध्य)',
  bt_cau:'सावधानी पर',bt_avo:'बचें पर',bt_ci:'95% दायरा',bt_none:'अभी नहीं चला: बंदी संग्रह के बाद यह जाँच चलती है।',
  bt_kept:'निकाली गई सीमा उपयोग में नहीं: अलग रखे दिनों पर यह Caine से उसके 95% दायरे से अधिक बेहतर नहीं रही।',
  bt_adopt:'निकाली गई सीमा उपयोग में है: अलग रखे दिनों पर यह Caine से उसके 95% दायरे से अधिक बेहतर रही।',
  v6_why:'24 घंटे में {r} मिमी बारिश। GSI भूस्खलन संवेदनशीलता {s}। मॉडल v7: मिट्टी की नमी, 30 दिन की बारिश और GSI से सुधारी गई बारिश सीमा, PWD बंदियों और NASA भूस्खलन रिकॉर्ड से जाँची गई।',in_t:'दूसरे वर्षों पर जाँच',in_s:'मानसून {y}: सड़क के पास दर्ज भूस्खलन वाले {n} हिस्सा-दिन (NASA भूस्खलन सूचियाँ)। दोनों में से कोई भी तरीका इन वर्षों पर नहीं बना।',in_c:'सावधानी पर पकड़े',in_cf:'सावधानी वाले दिन',in_a:'बचें पर पकड़े',in_af:'बचें वाले दिन',in_10:'10 में 1 दिन चेताने पर पकड़े',in_eng:'बारिश सीमा (Caine, GSI)',in_note:'इन सूचियों में केवल वे भूस्खलन हैं जो ख़बरों या स्वयंसेवकों तक पहुँचे, इसलिए बिना भूस्खलन वाला दिन सुरक्षित माना नहीं जा सकता। देखें कि हर तरीके ने कितने दर्ज भूस्खलन पकड़े, ख़ासकर बराबर दिनों पर चेतावनी देने पर।',bt_v6:'मॉडल v6',bt_was:'मौजूदा इंजन:',bt_right:'सही निकलीं सावधानी चेतावनियाँ',bt_v6use:'उपयोग में',bt_prec:'सटीकता',
  bt_v6k:'मॉडल v6 इनका उपयोग करता है: {g}। अलग रखे दिनों पर यह Caine से उसके 95% दायरे से अधिक बेहतर रहा, इसलिए यात्रा योजना और फ़ोन चेतावनियाँ इसी से बनती हैं। डेटा पैक न हो (रीप्ले में या 10 दिन से अधिक ऑफ़लाइन) तो ऐप Caine सीमा पर लौट आता है।',bt_fitv6:'निकाली गई सीमा भी Caine से बेहतर रही, पर मॉडल v6 कहीं बेहतर है, इसलिए v6 उपयोग में है।',bt_fitoff:'निकाली गई सीमा इस सीज़न पर Caine से बेहतर रही पर बहुत अधिक दिनों पर चेताती है, इसलिए उपयोग में नहीं।',bt_v6fail:'मॉडल v6 2026 के PWD सीज़न पर Caine से बेहतर रहा पर दूसरे वर्षों पर नहीं, इसलिए ऐप GSI संवेदनशीलता के साथ Caine सीमा उपयोग करता है।',bt_v6wait:'मॉडल v6 दूसरे वर्षों की जाँच की प्रतीक्षा में है; पास होने तक ऐप GSI संवेदनशीलता के साथ Caine सीमा उपयोग करता है।',
  g_rain:'बारिश',g_static:'ढलान और पुराने भूस्खलन',g_peak:'बादल फटने जैसी तीव्रता',g_soil:'मिट्टी की नमी',g_season:'92 दिन की बारिश',g_history:'PWD की पुरानी बंदियाँ',g_cold:'जमना-पिघलना',g_quake:'भूकंप',
  mem_note:'यहाँ {w} बहुत भारी बारिश हुई: मलबा अब भी सड़क रोक सकता है। स्थानीय लोगों से पूछें और सड़क रिपोर्ट देखें।',mem_1:'कल',mem_n:'{n} दिन पहले',
  via_pack:' (पहाड़ पथ डेटा पैक से)',
  age_ok:'ऑफ़लाइन। पूर्वानुमान {w} सहेजा गया ({a} पहले)।',age_old:'ऑफ़लाइन। पूर्वानुमान {w} सहेजा गया, {a} पहले। उसके बाद की बारिश पता नहीं: स्थानीय लोगों से पूछें और सड़क रिपोर्ट देखें।',
  age_h:'{n} घंटे',age_d:'{n} दिन',
  en_t:'जोखिम इंजन',en_v5:'प्रशिक्षित मॉडल v5 (प्रयोग)',en_v4:'बारिश सीमा v4 (Caine 1980)',
  en_s:'v5 को NASA सूची के {n} भूस्खलन दिनों (2007 से 2017) और हर सड़क पर 30 दिन की बारिश से बनाया गया। यह दिनों को क्रम देता है; यह संभावना नहीं है।',
  ob_n:'{n} रिपोर्ट नेटवर्क का इंतज़ार कर रही हैं',ob_1:'1 रिपोर्ट नेटवर्क का इंतज़ार कर रही है',
  app_apk:'एंड्रॉयड ऐप (APK फ़ाइल)',
  app_t:'बिना इंटरनेट ऐप साझा करें',app_s:'पूरा ऐप एक फ़ाइल में सहेजता है। WhatsApp, ब्लूटूथ या मेमोरी कार्ड से भेजें; यह किसी भी फ़ोन ब्राउज़र में खुलता है और ऑफ़लाइन चलता है।',app_b:'ऐप फ़ाइल सहेजें या भेजें',app_done:'ऐप फ़ाइल तैयार'
});

/* ---------- trained model (python/pahaadpath/model.py writes data/model/model_v5.json; the build bakes it in) ---------- */
const MODEL=/*__MODEL__*/null;
/* backtest against every PWD closure collected (python/pahaadpath/backtest.py, data/model/backtest.json) and the fitted
   thresholds the engine uses, null unless the backtest adopted them (data/model/thresholds.json) */
const BACKTEST=/*__BACKTEST__*/null;
const THRESH=/*__THRESH__*/null;
/* the engine and model v6 on other years' dated landslides (NASA catalogues), data/model/independent.json */
const INDEP=/*__INDEP__*/null;
const V7=/*__V7__*/null;
/* daily rain for the 30 days before each replayed closure day (ERA5), so the Proof tab can use the model's rain memory */
const RP_DAILY=/*__RP_DAILY__*/null;
const CACHE_MAX_H=10*24; // a saved forecast is used offline for up to 10 days, with its age on screen
/* v4 stays the default: on the 2007 to 2017 check (data/model/REPORT.md) the trained model did not beat it at the same alarm rate */
st.engine=MODEL?lsGet('pp_engine','v4'):'v4';
/* model v6 day score (0-100) for a hill stretch driven at hour a, or null: the data pack carries today and 7 days ahead */
function v6Day(seg,a,c){
  const V=c&&c.v6;if(!V||seg.plain||seg.virtual)return null;
  const row=V.by[seg.id];if(!row)return null;
  const d0=parseDate(V.day0);if(d0==null)return null;
  const i=dayOf(c.hour0+a*3600e3)-d0;
  return i>=0&&i<row.length&&row[i]!=null?row[i]:null;
}
/* Control room: model v6 day score for today per stretch, whether it is in use or still on trial */
function v6Today(id){
  if(st.src!=='live'&&st.src!=='cache')return null;
  const V=st.v6||st.v6t;if(!V||!V.by[id])return null;
  const d0=parseDate(V.day0);if(d0==null)return null;
  const i=dayOf(st.nowMs)-d0,v=V.by[id][i];
  return v==null?null:{v,used:!!st.v6};
}
function modelOn(){return !!MODEL&&st.engine==='v5';}
/* must match features() in python/pahaadpath/dataset.py and score() in model.py */
function modelFeatures(r1,r3,a7,a30,slope,n){return[Math.log1p(r1),Math.log1p(r3),Math.log1p(a7),Math.log1p(a30),((slope==null?34:slope)-34)/5,Math.log1p(n)];}
function modelLogit(x){let z=MODEL.intercept;for(let i=0;i<x.length;i++)z+=MODEL.coef[i]*x[i];return z;}
function modelScore(z){
  const b=MODEL.bands;let s;
  if(z<b.zc)s=34*Math.min(1,Math.max(0,(z-b.z0)/(b.zc-b.z0)));
  else if(z<b.za)s=35+29*(z-b.zc)/(b.za-b.zc);
  else s=65+35*Math.min(1,(z-b.za)/b.zspan);
  return Math.floor(s+.5);
}
function modelCheck(){
  if(!MODEL)return null;const bad=[];
  (MODEL.checks||[]).forEach(c=>{const s=modelScore(modelLogit(modelFeatures.apply(null,c.in)));if(s!==c.score)bad.push([c.in,c.score,s]);});
  return{n:(MODEL.checks||[]).length,bad};
}
function setDaily(byKey,day0){
  if(!byKey){st.daily=null;st.dday0=null;return;}
  const out={};EDGES.forEach(e=>{out[e.id]=byKey[locKey(e)]||null;});
  st.daily=out;st.dday0=typeof day0==='number'?day0:parseDate(day0);
}
function setReplayDaily(date){const r=RP_DAILY&&RP_DAILY[date];if(r)setDaily(r.by,r.start);else setDaily(null);}
function dsum(arr,from,to){let t=0;for(let j=Math.max(0,from);j<=to&&j<arr.length;j++)t+=arr[j]||0;return t;}
/* rain memory: the latest of the last MEM days whose own rain put the stretch at Avoid (debris and wet slopes linger) */
function memDays(e,arr,i){
  const n=MODEL.hist[e.id]||0,sl=slopeOf(e),M=MODEL.memory_days||0;
  for(let k=1;k<=M;k++){const j=i-k;if(j<0||j>=arr.length)continue;
    const z=modelLogit(modelFeatures(arr[j]||0,dsum(arr,j-2,j),dsum(arr,j-9,j-3),dsum(arr,j-30,j-10),sl,n));
    if(modelScore(z)>=65)return k;}
  return 0;
}
/* rain memory for the v4 engine: a note only (the band is not raised), because on the 2007 to 2017 check raising it added
   about as many false warnings as caught landslide days. Same daily-rain test as the Python check: v4 at Avoid on that day's rain. */
const MEM_NOTE_DAYS=7;
function memNote(e,a,c){
  const arr=c.daily&&c.daily[e.id];if(e.plain||!arr||c.dday0==null)return 0;
  const i=dayOf(c.hour0+a*3600e3)-c.dday0;let m=MEMO.get(arr);if(!m){m={};MEMO.set(arr,m);}
  const k='v4|'+e.id+'|'+i+'|'+odVer;if(m[k]!=null)return m[k];
  const pred=.6*[0,.15,.55,1][e.susc]+.4*Math.min(e.hist/5,1);let out=0;
  for(let d=1;d<=MEM_NOTE_DAYS;d++){const j=i-d;if(j<0||j>=arr.length)continue;
    const f=edThr(e),trig=Math.min(Math.max((arr[j]||0)/f(24),dsum(arr,j-2,j)/f(72)),1.5)/1.5;
    if(Math.round(100*Math.min(1,trig*(.35+.65*pred)+.08*pred))>=65){out=d;break;}}
  return m[k]=out;
}
function memWhen(n){return n===1?t('mem_1'):fill(t('mem_n'),{n});}
function slopeOf(e){const s=st.useOD&&OD.slope[e.id];return s?s.p75:null;}
const MEMO=new WeakMap();
function modelRisk(e,a,c,P24,P72){
  const arr=c.daily&&c.daily[e.id],D=dayOf(c.hour0+a*3600e3);
  let a7=0,a30=0,mem=0;
  if(arr&&c.dday0!=null){
    const i=D-c.dday0;let m=MEMO.get(arr);if(!m){m={};MEMO.set(arr,m);}
    const k=e.id+'|'+i+'|'+odVer;
    if(!m[k])m[k]=[dsum(arr,i-9,i-3),dsum(arr,i-30,i-10),memDays(e,arr,i)];
    [a7,a30,mem]=m[k];
  }
  let s=modelScore(modelLogit(modelFeatures(P24,P72,a7,a30,slopeOf(e),MODEL.hist[e.id]||0)));
  if(mem)s=Math.max(s,35);
  return{base:s/100,mem};
}

/* ---------- weather: the data pack first (one small file), then Open-Meteo directly ---------- */
const PACK_URL='https://raw.githubusercontent.com/jatainsahil98-web/Pahaad-Path-app/datapack/pack.json';
const PACK_FRESH_H=6;
const APK_URL='https://github.com/jatainsahil98-web/Pahaad-Path-app/releases/latest/download/PahaadPath.apk';
const SITE_URL='https://jatainsahil98-web.github.io/Pahaad-Path-app/';
const siteHosted=()=>/^https?:$/.test(location.protocol)&&location.hostname!=='appassets.androidplatform.net';
async function fetchPack(){
  const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),10000);
  try{
    const res=await fetch(PACK_URL,{signal:ctl.signal,cache:'no-store'});if(!res.ok)throw new Error('pack '+res.status);
    const p=await res.json();if(p.v!==1)throw new Error('pack version');
    const h0=Date.parse(p.hour0+':00+05:30'),shift=Math.round((st.hour0-h0)/3600e3);
    if(!(shift>=0&&shift<=PACK_FRESH_H))throw new Error('pack too old');
    const by={},daily={};
    Object.keys(p.hourly).forEach(k=>{const a=p.hourly[k].map(v=>v/10);by[k]=a.slice(shift).concat(new Array(shift).fill(0));});
    Object.keys(p.daily).forEach(k=>{daily[k]=p.daily[k].map(v=>v/10);});
    if(!EDGES.every(e=>e.virtual||by[locKey(e)]))throw new Error('pack places');
    const made=Date.parse(p.made);
    return{by,daily,day0:p.day0,ts:st.hour0,made:made>0&&made<=Date.now()?made:h0,via:'pack',alerts:Array.isArray(p.alerts)?p.alerts:null,v6:p.v6&&p.v6.by&&p.v6.day0?{by:p.v6.by,day0:p.v6.day0,model:p.v6.model}:null,v6t:p.v6_trial&&p.v6_trial.by&&p.v6_trial.day0?{by:p.v6_trial.by,day0:p.v6_trial.day0,model:p.v6_trial.model}:null,r24:p.risk24&&/^v6/.test(p.risk24_model||'')?{by:p.risk24,model:p.risk24_model,made:made>0?made:h0}:null,closures:p.closures&&Array.isArray(p.closures.roads)?p.closures:null}; // made: when the pack's forecast was fetched, shown as its age
  }finally{clearTimeout(to);}
}
async function fetchDaily(){
  const list=[...new Set(EDGES.filter(e=>!e.virtual).map(locKey))];
  const url='https://api.open-meteo.com/v1/forecast?latitude='+list.map(k=>k.split(',')[0]).join(',')+'&longitude='+list.map(k=>k.split(',')[1]).join(',')+'&daily=precipitation_sum&past_days=31&forecast_days=16&timezone=Asia%2FKolkata';
  const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),12000);
  try{
    const res=await fetch(url,{signal:ctl.signal});if(!res.ok)throw new Error('http '+res.status);
    let js=await res.json();if(!Array.isArray(js))js=[js];if(js.length!==list.length)throw new Error('shape');
    const by={};list.forEach((k,i)=>{by[k]=js[i].daily.precipitation_sum.map(v=>v==null?0:Math.round(v*10)/10);});
    return{by,day0:js[0].daily.time[0]};
  }finally{clearTimeout(to);}
}
async function fetchWeather(){
  try{return await fetchPack();}catch(e){}
  const by=await fetchLive();
  let d=null;try{d=await fetchDaily();}catch(e){} // without it the model runs without rain memory
  return{by,daily:d&&d.by,day0:d&&d.day0,ts:st.hour0,via:'api'};
}
function viaMsg(){return st.via==='pack'?t('via_pack'):'';}
function ageText(ms){const h=Math.max(0,Math.round((Date.now()-ms)/3600e3));return h<48?fill(t('age_h'),{n:h}):fill(t('age_d'),{n:Math.round(h/24)});}
function cacheMsg(){const ts=st.cacheMade||st.cacheTs||st.nowMs,old=Date.now()-ts>36*3600e3;
  return fill(t(old?'age_old':'age_ok'),{w:fmtDate(dayOf(ts))+' '+clock(ts)+' IST',a:ageText(ts)});}

/* ---------- engine choice, shown in the footer ---------- */
function engineHtml(){
  if(!MODEL)return '';
  return '<div class="card"><b>'+t('en_t')+'</b><br><label class="chk"><input type="radio" name="eng" value="v5"'+(st.engine==='v5'?' checked':'')+'> '+t('en_v5')+'</label>'
    +'<label class="chk"><input type="radio" name="eng" value="v4"'+(st.engine==='v4'?' checked':'')+'> '+t('en_v4')+'</label>'
    +'<p class="note">'+esc(fill(t('en_s'),{n:MODEL.data.positives}))+'</p></div>';
}
document.addEventListener('change',e=>{if(e.target.name==='eng'){st.engine=e.target.value;lsSet('pp_engine',st.engine);opsCache=null;render();}});

/* ---------- share the app itself: one file that works with no signal ---------- */
function shareAppHtml(){
  return '<div class="card"><b>'+t('app_t')+'</b><p class="note">'+t('app_s')+'</p><button class="btn pri" id="a-app" type="button">'+t('app_b')+'</button>'
    +(window.PPAndroid?'':' <a class="btn" href="'+APK_URL+'" rel="noopener">'+t('app_apk')+'</a>')+'</div>';
}
async function shareApp(){
  if(window.PPAndroid){window.PPAndroid.shareApp();return;} // inside the Android app: share the APK itself
  const blob=new Blob([PRISTINE],{type:'text/html'}),name='PahaadPath.html';
  try{
    const f=new File([blob],name,{type:'text/html'});
    if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:'PahaadPath'});return;}
  }catch(e){if(e&&e.name==='AbortError')return;}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},4000);toast(t('app_done'));
}
document.addEventListener('click',e=>{if(e.target.closest('#a-app'))shareApp();});

/* ---------- Proof: the season backtest (data/model/backtest.json) ---------- */
/* model v7 (data/model/v7.json): learned from several monsoons; shown with how it compares with the engine */
function v7Card(){
  const V=V7;if(!V||!V.check)return '';
  const p=v=>v==null?'—':Math.round(v*100)+'%',c=V.check,k=V.model&&V.model.kind||'stack',m=c[k]||{},e=c.engine||{};
  const row=(n,x)=>'<tr><th>'+esc(n)+'</th><td>'+p((x.nasa||{})['10'])+'</td><td>'+p((x.nasa||{})['25'])+'</td><td>'+p((x.pwd||{})['10'])+'</td><td>'+p((x.pwd||{})['25'])+'</td></tr>';
  return '<div class="card"><h3>'+t('v7_t')+(V.adopted?' <span class="pill l0">'+t('bt_v6use')+'</span>':'')+'</h3><p class="sub">'+t('v7_s')+'</p>'
    +'<div class="wrap"><table class="tb"><tr><th></th><th>'+t('v7_n10')+'</th><th>'+t('v7_n25')+'</th><th>'+t('v7_p10')+'</th><th>'+t('v7_p25')+'</th></tr>'
    +row(t('in_eng'),e)+row(t('v7_m'),m)+'</table></div><p class="note">'+t(V.owner_choice?'v7_owner':V.adopted?'v7_auto':'v7_off')+'</p></div>';
}
function indepCard(){
  const I=INDEP;if(!I||!I.engine)return '';
  const p=v=>v==null?'—':Math.round(v*100)+'%';
  const row=(name,m)=>m?'<tr><th>'+esc(name)+'</th><td>'+p(m.caution.pod)+'</td><td>'+p(m.caution.alarm_rate)+'</td><td>'+p(m.avoid.pod)+'</td><td>'+p(m.avoid.alarm_rate)+'</td><td>'+p(m.pod_at_10pct)+'</td></tr>':'';
  return '<div class="card"><h3>'+t('in_t')+'</h3><p class="sub">'+esc(fill(t('in_s'),{y:(I.seasons||[]).join(', '),n:I.events}))+'</p>'
    +'<div class="wrap"><table class="tb"><tr><th></th><th>'+t('in_c')+'</th><th>'+t('in_cf')+'</th><th>'+t('in_a')+'</th><th>'+t('in_af')+'</th><th>'+t('in_10')+'</th></tr>'
    +row(t('in_eng'),I.engine)+row(t('bt_v6'),I.v6)+'</table></div><p class="note">'+t('in_note')+'</p></div>';
}
function btCard(){
  const B=BACKTEST;
  if(!B||!B.caine)return '<div class="card"><h3>'+t('bt_t')+'</h3><p class="note">'+t('bt_none')+'</p></div>';
  const p=v=>v==null?'—':Math.round(v*100)+'%',f2=v=>v==null?'—':v.toFixed(2);
  const col=(name,m,on)=>'<tr><th>'+esc(name)+(on?' <span class="pill l0">'+t('bt_use')+'</span>':'')+'</th>'
    +['caution','avoid'].map(k=>'<td>'+p(m[k].pod)+'</td><td>'+p(m[k].far)+'</td><td>'+f2(m[k].tss)+'</td>').join('')+'</tr>';
  const c=B.caine,ci=c.ci_tss_caution,V6=B.v6&&B.v6.v6?B.v6:null,V6USE=!!(V6&&B.v6.adopted&&INDEP&&INDEP.v6_ok),V6T=!!(B.v6&&B.v6.adopted),FITUSE=!!(B.adopted&&!V6T);
  let h='<div class="card"><h3>'+t('bt_t')+'</h3><p class="sub">'+esc(fill(t('bt_s'),{a:B.season?B.season[0]:'',b:B.season?B.season[1]:'',c:B.closures,r:B.reports}))+'</p>'
    +(V6USE?'<div class="kpis"><div class="kp l0"><small>'+t('bt_pod')+' · v6</small><b>'+p(V6.v6.caution.pod)+'</b><em>'+t('bt_was')+' '+p(c.caution.pod)+'</em></div>'
      +'<div class="kp l0"><small>'+t('bt_right')+' · v6</small><b>'+p(V6.v6.caution.far==null?null:1-V6.v6.caution.far)+'</b><em>'+t('bt_was')+' '+p(c.caution.far==null?null:1-c.caution.far)+'</em></div>'
      +'<div class="kp"><small>'+t('bt_tss')+' · v6</small><b>'+f2(V6.v6.caution.tss)+'</b><em>'+t('bt_was')+' '+f2(c.caution.tss)+'</em></div>'
    :'<div class="kpis"><div class="kp l1"><small>'+t('bt_pod')+'</small><b>'+p(c.caution.pod)+'</b><em>'+t('bt_cau')+'</em></div>'
    +'<div class="kp"><small>'+t('bt_tss')+'</small><b>'+f2(c.caution.tss)+'</b><em>'+(ci?t('bt_ci')+' '+f2(ci[0])+t('rng')+f2(ci[1]):'&nbsp;')+'</em></div>')
    +(V6USE?'':'<div class="kp"><small>'+t('bt_lead')+'</small><b>'+(c.lead_median_h==null?'—':Math.round(c.lead_median_h)+' h')+'</b><em>&nbsp;</em></div>')+'</div>'
    +'<div class="wrap"><table class="tb"><tr><th></th><th colspan="3">'+t('bt_cau')+'</th><th colspan="3">'+t('bt_avo')+'</th></tr>'
    +'<tr><th></th>'+[0,1].map(()=>'<th>'+t('bt_pod')+'</th><th>'+t('bt_far')+'</th><th>TSS</th>').join('')+'</tr>'
    +col(t('bt_caine'),c,!V6USE&&!FITUSE)+(B.fit?col(fill(t('bt_fit'),{l:B.fit.level}),B.fit.metrics,FITUSE):'')
    +(V6?col(t('bt_v6'),V6.v6,false).replace('</th>',(V6USE?' <span class="pill l0">'+t('bt_v6use')+'</span>':'')+'</th>'):'')+'</table></div>'
    +'<p class="note">'+esc(B.fit?t(B.adopted?(V6T?(V6USE?'bt_fitv6':'bt_fitoff'):'bt_adopt'):'bt_kept'):(B.note||''))+'</p>'
    +(V6?'<p class="note">'+esc(V6T&&!V6USE?t(INDEP&&INDEP.v6_ok===false?'bt_v6fail':'bt_v6wait'):fill(t('bt_v6k'),{g:(V6.chosen||[]).map(g=>t('g_'+g)).join(', ')}))+'</p>':'')+'</div>';
  return h;
}
