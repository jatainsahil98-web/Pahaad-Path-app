/* ================= v8: stabilise. SOS by SMS and 112, back button, trip kept across restarts, location that never hangs,
   native share, copy, files and speech inside the Android app, and hand-off to Google Maps or Mappls on the safer route ================= */
Object.assign(T.en,{
  sos_t:'SOS',sos_s:'Call 112 first if anyone is hurt. SMS often gets through where mobile data does not.',
  sos_call:'Call 112',sos_sms:'SMS my location',sos_wa:'WhatsApp',sos_to:'Send SMS to',
  sos_wait:'Finding your position…',sos_got:'Location found (about {m} m).',sos_none:'No location yet. The SMS will name the nearest town on your trip.',
  sos_msg0:'SOS. I need help on a hill road near {p}. No GPS fix yet.',sos_trip:' Trip: {r}.',
  loc_off:'Location is switched off on this phone. Turn it on in the phone settings and try again.',
  no_app:'No app on this phone can open this.',wa_none:'WhatsApp is not installed. The message is copied; paste it in any app.',
  dl_ok:'Saved: {f}',dl_err:'Could not save the file.',
  nav_t:'Navigate on this route',nav_s:'Opens your navigation app with towns on this route as stops, so it does not switch to a riskier road. Via {v}.',
  nav_g:'Google Maps',nav_m:'Mappls',nav_off:'No mobile data now. Navigation apps need a map of this area downloaded beforehand.',
  mic_err:'Voice input did not work. Type the trip instead.'
});
Object.assign(T.hi,{
  sos_t:'SOS',sos_s:'किसी को चोट लगी हो तो पहले 112 पर फ़ोन करें। जहाँ मोबाइल डेटा नहीं चलता, वहाँ अक्सर SMS चला जाता है।',
  sos_call:'112 पर फ़ोन करें',sos_sms:'मेरी जगह SMS करें',sos_wa:'WhatsApp',sos_to:'SMS इस नंबर पर',
  sos_wait:'आपकी जगह ढूँढ रहे हैं…',sos_got:'जगह मिल गई (लगभग {m} मीटर सटीक)।',sos_none:'अभी जगह नहीं मिली। SMS में यात्रा का सबसे पास का शहर लिखा जाएगा।',
  sos_msg0:'SOS। {p} के पास पहाड़ी सड़क पर मदद चाहिए। अभी GPS से जगह नहीं मिली।',sos_trip:' यात्रा: {r}।',
  loc_off:'इस फ़ोन में लोकेशन बंद है। फ़ोन की सेटिंग में इसे चालू करके फिर कोशिश करें।',
  no_app:'इस फ़ोन में इसे खोलने वाला कोई ऐप नहीं है।',wa_none:'WhatsApp इंस्टॉल नहीं है। संदेश कॉपी हो गया है; किसी भी ऐप में चिपकाएँ।',
  dl_ok:'सहेजा गया: {f}',dl_err:'फ़ाइल सहेजी नहीं जा सकी।',
  nav_t:'इसी रास्ते पर नेविगेशन',nav_s:'आपका नेविगेशन ऐप इस रास्ते के शहरों को पड़ाव बनाकर खुलता है, ताकि वह ज़्यादा जोखिम वाली सड़क पर न जाए। {v} होकर।',
  nav_g:'Google Maps',nav_m:'Mappls',nav_off:'अभी मोबाइल डेटा नहीं है। नेविगेशन ऐप के लिए इस इलाक़े का नक्शा पहले से डाउनलोड होना चाहिए।',
  mic_err:'आवाज़ से नहीं हो पाया। यात्रा लिखकर बताएँ।'
});

/* ---------- Android bridge (absent on the website) ---------- */
const AND=window.PPAndroid||null;
const andHas=m=>!!(AND&&typeof AND[m]==='function');
window.ppNoApp=()=>toast(t('no_app'));

/* WhatsApp: the app itself inside Android (wa.me would open a browser), wa.me on the web; copy the text when neither works */
function waOpen(text){
  if(andHas('openWhatsApp')){if(!AND.openWhatsApp(text)){copyText(text);toast(t('wa_none'));}return;}
  const w=window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener');if(!w)copyText(text);
}
/* the phone's own share sheet: Android app, or the browser's Web Share; WhatsApp link otherwise */
function shareTextOut(text){
  if(andHas('shareText')){AND.shareText(text);return;}
  if(navigator.share){navigator.share({text}).catch(()=>{});return;}
  waOpen(text);
}

/* ---------- SOS: call 112, or SMS the position from the phone itself; WhatsApp only as an extra ---------- */
let sosPos=null,sosBusy=false;
function sosBody(){
  const M=st.M,trip=M&&M.cur?fill(t('sos_trip'),{r:titleOf(M)}):'';
  if(sosPos&&sosPos.lat!=null)return fill(t('sf_sos_msg'),{u:'https://maps.google.com/?q='+sosPos.lat.toFixed(5)+','+sosPos.lon.toFixed(5),a:Math.round(sosPos.acc)})+trip;
  const near=M&&M.cur?pname(M.trip.from):'';
  return fill(t('sos_msg0'),{p:near})+trip;
}
function sosStatus(){return sosBusy?t('sos_wait'):sosPos&&sosPos.lat!=null?fill(t('sos_got'),{m:Math.round(sosPos.acc)}):t('sos_none');}
function sosPaint(){const a=$('sos-st'),b=$('sos-prev');if(a)a.textContent=sosStatus();if(b)b.textContent=sosBody();}
function sos(){
  sosPos=null;sosBusy=true;
  openModal('<h3>'+t('sos_t')+'</h3><p class="note">'+t('sos_s')+'</p>'
    +'<div class="acts in"><a class="btn pri sos" id="sos-call" href="tel:112">'+t('sos_call')+'</a></div>'
    +'<label class="lbl" for="fm-num">'+t('sos_to')+'</label><input id="fm-num" class="inp" type="tel" inputmode="tel" autocomplete="tel" value="'+esc(lsGet('pp_fam',''))+'">'
    +'<p class="note" id="sos-st" role="status">'+esc(sosStatus())+'</p><p class="mono" id="sos-prev">'+esc(sosBody())+'</p>'
    +'<div class="acts in"><a class="btn pri" id="sos-sms" href="#">'+t('sos_sms')+'</a><button class="btn" id="sos-wa" type="button">'+t('sos_wa')+'</button></div>');
  locate(p=>{sosBusy=false;sosPos=p;sosPaint();},err=>{sosBusy=false;sosPos=null;sosPaint();if(err==='off')toast(t('loc_off'));});

}
document.addEventListener('click',e=>{
  const c=e.target.closest('#sos-sms,#sos-wa');if(!c)return;
  if(c.id==='sos-sms'){const num=famNum();if(!num){e.preventDefault();toast(t('fm_need'));return;}c.href=smsHref(num,sosBody());}
  else waOpen(sosBody());
});

/* ---------- back button: close a window, then go back to the trip, then to the route tab; only then leave the app ---------- */
function goBack(){
  if(!$('modal').hidden){closeModal();return true;}
  if(st.view!=='trip'){st.view='trip';render();window.scrollTo(0,0);return true;}
  if(st.tab!=='route'){st.tab='route';render();return true;}
  return false;
}
/* the website gets the same behaviour from the browser's back button */
if(!AND&&window.history&&history.pushState){
  try{history.replaceState({pp:0},'');history.pushState({pp:1},'');}catch(e){}
  window.addEventListener('popstate',()=>{if(goBack()){try{history.pushState({pp:1},'');}catch(e){}}else history.back();});
}

/* ---------- keep the trip when the phone closes the app in the background ---------- */
const LAST_KEYS=['from','to','dep','tab','view','pick'];
function saveLast(){
  if(st.src==='replay'||String(st.scn).startsWith('rp:'))return;
  if(!N[st.from]||!N[st.to]||N[st.from].virtual||N[st.to].virtual)return;
  const o={date:st.dateIdx};LAST_KEYS.forEach(k=>{o[k]=st[k];});lsSet('pp_last',o);
}
(function restoreLast(){
  if(['from','to','date','view','tab','dep','pick'].some(k=>q.get(k)!=null))return; // a shared link wins
  const o=lsGet('pp_last',null);if(!o||typeof o!=='object')return;
  if(N[o.from]&&N[o.to]&&o.from!==o.to){st.from=o.from;st.to=o.to;}
  if(['route','map','reports','rules','safety'].includes(o.tab))st.tab=o.tab;
  if(['trip','ops','proof'].includes(o.view))st.view=o.view;
  if(o.dep==null||(o.dep>=0&&o.dep<24))st.dep=o.dep==null?null:+o.dep;
  if(['fast','safe','alt'].includes(o.pick))st.pick=o.pick;
  if(+o.date>0){st.dateIdx=+o.date;st.dateInit=1;} // clampDate() still keeps it between today and the last forecast day
})();
const renderBase8=render;
render=function(){renderBase8();saveLast();navBox();};

/* ---------- hand-off to a navigation app, keeping PahaadPath's route ---------- */
const ll5=n=>n.lat.toFixed(5)+','+n.lon.toFixed(5);
function navStops(M){
  const ids=M.cur.nodes.filter(id=>{const n=NODE(id);return n&&n.lat!=null;});
  if(ids.length<2)return null;
  const from=NODE(ids[0]),to=NODE(ids.at(-1)),mid=ids.slice(1,-1).filter(id=>!NODE(id).virtual);
  const via=[];if(mid.length){const k=Math.min(3,mid.length);for(let i=1;i<=k;i++)via.push(NODE(mid.at(Math.round(i*(mid.length+1)/(k+1))-1)));}
  return {from,to,via:via.filter((v,i,a)=>a.indexOf(v)===i)};
}
function googleNavUrl(s){
  return 'https://www.google.com/maps/dir/?api=1&origin='+ll5(s.from)+'&destination='+ll5(s.to)
    +(s.via.length?'&waypoints='+encodeURIComponent(s.via.map(ll5).join('|')):'')+'&travelmode=driving';
}
function mapplsNavUrl(s){
  return 'https://mappls.com/direction?places='+[s.from,...s.via,s.to].map(n=>encodeURIComponent(ll5(n)+','+n.en)).join(';');
}
function navBox(){
  let box=$('navbox');
  const M=st.M,show=st.view==='trip'&&st.tab==='route'&&M&&M.cur&&st.src!=='replay';
  const s=show?navStops(M):null;
  if(!s){if(box)box.hidden=true;return;}
  if(!box){box=document.createElement('div');box.id='navbox';box.className='navbox';$('acts').after(box);}
  box.hidden=false;
  box.innerHTML='<p class="note"><b>'+t('nav_t')+'.</b> '+esc(fill(t('nav_s'),{v:s.via.length?s.via.map(n=>nm(n)).join(', '):pname(M.trip.to)}))+'</p>'
    +'<div class="acts in"><a class="btn" id="nav-g" href="'+esc(googleNavUrl(s))+'" target="_blank" rel="noopener">'+t('nav_g')+'</a>'
    +'<a class="btn" id="nav-m" href="'+esc(mapplsNavUrl(s))+'" target="_blank" rel="noopener">'+t('nav_m')+'</a></div>';
}
document.addEventListener('click',e=>{if(e.target.closest('#nav-g,#nav-m')&&navigator.onLine===false)toast(t('nav_off'));});

/* ---------- speech inside the Android app: the phone's own recogniser and voice (the WebView has neither) ---------- */
const nativeListen=andHas('listen')&&(!andHas('canListen')||AND.canListen());
function onSpeech(alts,err){
  $('b-mic').classList.remove('on');
  if(!alts||!alts.length){if(err!=null)toast(t('mic_err'));return;}
  const best=alts.find(x=>{const a=parseAsk(x);return a.from||a.to;})||alts[0];
  $('in-ask').value=best;applyAsk(best);
}
if(nativeListen){
  $('b-mic').removeEventListener('click',listen);
  $('b-mic').addEventListener('click',()=>{$('b-mic').classList.add('on');toast(t('ask_listen'));AND.listen(st.lang==='hi'?'hi-IN':'en-IN');});
}
const renderFormBase8=renderForm;
renderForm=function(){renderFormBase8();if(nativeListen)$('b-mic').hidden=false;};

/* test hook: how many stretches a Leaflet map draws (the canvas renderer leaves no SVG paths to count) */
function mapLines(id){const o=LM[id];if(!o)return 0;if(o.gl)return o.gl.count();let n=0;o.map.eachLayer(l=>{if(l instanceof L.Polyline&&l.options.interactive!==false)n++;});return n;}
