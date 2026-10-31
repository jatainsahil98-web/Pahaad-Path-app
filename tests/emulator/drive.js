// Drives the real signed APK on an Android emulator: real taps, real network on and off, real permission dialogs.
// The page is read over the WebView DevTools socket (the emulator image is userdebug, so every WebView is debuggable).
// Writes out/results.json, out/*.png (screencap of the whole phone), out/console.txt. Never posts to the public report channel.
const {execSync}=require('child_process');
const fs=require('fs');
const OUT=process.argv[2]||'out';fs.mkdirSync(OUT,{recursive:true});
const PKG='org.pahaadpath.app',ACT=PKG+'/.MainActivity';
const R={steps:[]};const CON=[];
const sh=(c,o={})=>{try{return execSync(c,{encoding:'utf8',timeout:o.t||60000,stdio:['ignore','pipe','pipe']}).trim();}catch(e){return 'ERR '+(e.stdout||'')+(e.stderr||e.message);}};
const adb=c=>sh('adb shell '+JSON.stringify(c));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let n=0;const shot=name=>{const f=String(++n).padStart(2,'0')+'_'+name+'.png';sh('adb exec-out screencap -p > '+OUT+'/'+f);return f;};
const T0=Date.now(),DEADLINE=T0+62*60e3;
const step=async(name,fn,ms=300000)=>{const s={name,t:new Date().toISOString()};R.steps.push(s);console.log('== '+name);
  if(Date.now()>DEADLINE){s.error='skipped: out of time';return;}
  try{Object.assign(s,await withTimeout(Promise.resolve().then(fn),ms,name)||{});}catch(e){try{s.failShot=shot('fail');}catch(_){}s.error=String(e&&e.stack||e).slice(0,1500);console.log('  ERROR '+s.error);}
  fs.writeFileSync(OUT+'/results.json',JSON.stringify(R,null,1));console.log('  '+JSON.stringify(s).slice(0,900));};
const resumed=()=>{const m=adb('dumpsys activity activities | grep -E "mResumedActivity|topResumedActivity" | head -1');return(m.match(/u0 ([^ }]+)/)||[])[1]||m;};
// UI tree of whatever is on screen (permission dialogs, other apps)
const ui=()=>{adb('uiautomator dump /sdcard/u.xml >/dev/null 2>&1');const x=adb('cat /sdcard/u.xml');
  return [...x.matchAll(/<node [^>]*?text="([^"]*)"[^>]*?content-desc="([^"]*)"[^>]*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g)].map(m=>({t:m[1]||m[2],x:(+m[3]+ +m[5])>>1,y:(+m[4]+ +m[6])>>1})).filter(o=>o.t);};
const uiTap=async re=>{for(let i=0;i<6;i++){const o=ui().find(o=>re.test(o.t));if(o){adb('input tap '+o.x+' '+o.y);await sleep(800);return o.t;}await sleep(700);}return null;};
const uiTexts=()=>ui().map(o=>o.t);

// a small DevTools client straight to the page target (a full browser client hangs on the WebView's limited browser endpoint)
const WS=require('ws');const http=require('http');
const getJSON=(u,t=5000)=>new Promise((res,rej)=>{const r=http.get(u,x=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>{try{res(JSON.parse(d));}catch(e){rej(e);}});});
  r.on('error',rej);r.setTimeout(t,()=>r.destroy(new Error('timeout '+u)));});
const withTimeout=(p,ms,what)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout '+ms+' ms: '+what)),ms))]);
let page=null,pageErrs=[];
function cdp(url){
  return new Promise((res,rej)=>{
    const ws=new WS(url,{perMessageDeflate:false});let id=0;const wait={};
    const c={ws,closed:false,send(method,params={},ms=30000){const i=++id;ws.send(JSON.stringify({id:i,method,params}));
      return withTimeout(new Promise((ok,no)=>{wait[i]={ok,no};}),ms,method);}};
    ws.on('message',d=>{const m=JSON.parse(d);
      if(m.id&&wait[m.id]){const w=wait[m.id];delete wait[m.id];m.error?w.no(new Error(m.error.message)):w.ok(m.result);return;}
      if(m.method==='Runtime.consoleAPICalled')CON.push(new Date().toISOString().slice(11,19)+' '+m.params.type+' '+m.params.args.map(a=>a.value!==undefined?String(a.value):(a.description||a.type)).join(' '));
      if(m.method==='Runtime.exceptionThrown'){const e=m.params.exceptionDetails;const t=(e.exception&&e.exception.description)||e.text;pageErrs.push(t);CON.push('PAGEERROR '+t);}});
    ws.on('open',()=>res(c));ws.on('error',e=>{c.closed=true;rej(e);});ws.on('close',()=>{c.closed=true;Object.values(wait).forEach(w=>w.no(new Error('socket closed')));});
  });
}
function makePage(c){
  const evaluate=async(f,...a)=>{const r=await c.send('Runtime.evaluate',{expression:'('+f.toString()+')(...'+JSON.stringify(a)+')',awaitPromise:true,returnByValue:true},45000);
    if(r.exceptionDetails)throw new Error('page: '+((r.exceptionDetails.exception&&r.exceptionDetails.exception.description)||r.exceptionDetails.text));return r.result.value;};
  return {c,evaluate,
    async waitForFunction(f,o={}){const end=Date.now()+(o.timeout||30000);let last;
      for(;;){try{if(await evaluate(f))return true;}catch(e){last=e;}if(Date.now()>end)throw new Error('waitForFunction timeout '+(last?last.message:''));await sleep(500);}},
    url(){return this._url||'';}};
}
async function connect(){
  if(page){try{page.c.ws.terminate();}catch(e){}page=null;}
  let last='';
  for(let i=0;i<60;i++){
    const pid=adb('pidof '+PKG);
    const socks=adb('cat /proc/net/unix | grep -o "webview_devtools_remote_[0-9]*" | sort -u');
    const sock=(socks.split('\n').find(s=>s.endsWith('_'+pid))||'');
    last='pid '+pid+' sockets '+socks.replace(/\n/g,' ');
    if(pid&&!pid.startsWith('ERR')&&sock){
      sh('adb forward --remove-all');sh('adb forward tcp:9222 localabstract:'+sock);
      try{const list=await getJSON('http://127.0.0.1:9222/json/list');const tg=list.find(t=>t.type==='page'&&/appassets/.test(t.url))||list.find(t=>t.type==='page');
        last+=' targets '+list.map(t=>t.type+':'+t.url).join(' ');
        if(tg&&tg.webSocketDebuggerUrl){const c=await withTimeout(cdp(tg.webSocketDebuggerUrl),10000,'ws open');await c.send('Runtime.enable');
          page=makePage(c);page._url=tg.url;
          await page.waitForFunction(()=>window.PP&&PP.st&&PP.st.series,{timeout:90000});return true;}}catch(e){last+=' error '+e.message;}
    }
    if(i%10===9)console.log('  connect: '+last.slice(0,400));
    await sleep(1000);
  }
  throw new Error('no WebView devtools: '+last.slice(0,600));
}
async function launch(fresh){
  if(fresh)adb('pm clear '+PKG);
  adb('am force-stop '+PKG);await sleep(500);
  adb('am start -W -n '+ACT);await connect();await sleep(1500);
}
const ev=(f,...a)=>page.evaluate(f,...a);
// a real finger tap on an element of the page: CSS box to screen pixels through the WebView's place on screen
let wvTop=null;
async function tap(sel){
  const r=await ev(s=>{const e=typeof s==='string'?document.querySelector(s):null;if(!e)return null;e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();
    return {x:b.left+b.width/2,y:b.top+b.height/2,dpr:devicePixelRatio,w:b.width,h:b.height};},sel);
  if(!r||!r.w)throw new Error('not on screen: '+sel);
  if(wvTop===null){const d=adb('dumpsys window | grep -E "mStableInsets|statusBars" | head -3');const st=adb('wm size');wvTop=0;
    // WebView fills the activity below the status bar: read its bounds from the UI tree
    adb('uiautomator dump /sdcard/u.xml >/dev/null 2>&1');const x=adb('cat /sdcard/u.xml');const m=x.match(/class="android\.webkit\.WebView"[^>]*bounds="\[(\d+),(\d+)\]/);wvTop=m?+m[2]:0;R.wvTop=wvTop;R.wm=st;}
  await sleep(250);
  adb('input tap '+Math.round(r.x*r.dpr)+' '+Math.round(r.y*r.dpr+wvTop));await sleep(900);
}
const state=()=>ev(()=>({src:PP.st.src,lang:PP.st.lang,from:PP.st.from,to:PP.st.to,view:PP.st.view,tab:PP.st.tab,scn:PP.st.scn,err:PP.st.err,
  srcmsg:(document.getElementById('srcmsg')||{}).textContent,online:navigator.onLine,
  outbox:JSON.parse(localStorage.getItem('pp_outbox')||'[]').length,modal:!(document.getElementById('modal')||{}).hidden&&!!document.querySelector('#modal:not([hidden])'),
  overflowX:document.scrollingElement.scrollWidth-innerWidth,vw:innerWidth,ua:navigator.userAgent}));
const text=sel=>ev(s=>(document.querySelector(s)||{}).innerText||'',sel);
const closeModal=async()=>{if(await ev(()=>!!document.querySelector('#modal:not([hidden]) #modal-x')))await tap('#modal-x');};
const backToApp=async()=>{for(let i=0;i<4&&!resumed().includes(PKG);i++){adb('input keyevent 4');await sleep(1200);}if(!resumed().includes(PKG)){adb('am start -n '+ACT);await sleep(2000);}};
const style=s=>[/—/,/–/,/\S - \S/,/, (and|or|और|या) /].filter(re=>re.test(s)).map(String);
// English words left on a Hindi screen (place names, units and brand names allowed)
const latin=async()=>ev(()=>{const allow=/^(PahaadPath|PWD|IMD|SMS|GPS|km|h|min|NH|SH|MDR|BRO|ODR|OSM|QR|PDF|APK|ntfy|Open|Meteo|NASA|DEM|ERA5|AUC|USDMA|SDRF|SEOC|ISRO|Copernicus|OpenStreetMap|WhatsApp|Bluetooth|Android|EN|ID|OK|am|pm|AM|PM|v\d|UTC|IST|GMT)$/;
  const words=(document.body.innerText.match(/[A-Za-z][A-Za-z']{2,}/g)||[]);const names=new Set();try{PP.NODES&&Object.values(PP.NODES).forEach(x=>(x.name||'').split(/\W+/).forEach(w=>names.add(w)));}catch(e){}
  const bad={};words.forEach(w=>{if(!allow.test(w)&&!names.has(w))bad[w]=(bad[w]||0)+1;});return Object.entries(bad).sort((a,b)=>b[1]-a[1]).slice(0,60);});
const GUARD=`(()=>{if(window.__guard)return;window.__guard=1;window.__posted=[];const f=window.fetch;
  window.fetch=function(u,o){const url=String(u&&u.url||u);if(/ntfy\\.sh/.test(url)&&o&&String(o.method).toUpperCase()==='POST'){window.__posted.push({url,body:o.body,at:Date.now(),online:navigator.onLine});
    return navigator.onLine?Promise.resolve(new Response('{}',{status:200})):Promise.reject(new TypeError('Failed to fetch'));}return f.apply(this,arguments);};})()`;
const installNtfyGuard=()=>page.c.send('Runtime.evaluate',{expression:GUARD});
const airplane=on=>{adb('cmd connectivity airplane-mode '+(on?'enable':'disable'));if(on){adb('svc wifi disable');adb('svc data disable');}else{adb('svc wifi enable');adb('svc data enable');}};

(async()=>{
 sh('adb root');await sleep(3000);sh('adb wait-for-device');
 R.device={model:adb('getprop ro.product.model'),sdk:adb('getprop ro.build.version.sdk'),type:adb('getprop ro.build.type'),webview:adb('dumpsys package com.google.android.webview | grep versionName | head -1')+adb('dumpsys webviewupdate | grep -i "current webview package" | head -1'),
  size:adb('wm size'),density:adb('wm density')};
 R.pkg=adb('dumpsys package '+PKG+' | grep -E "versionCode|versionName|targetSdk" | head -3');
 R.perms=adb('dumpsys package '+PKG+' | grep -A12 "runtime permissions" | head -14');

 await step('fresh install, first open with real network',async()=>{
  await launch(true);
  await page.waitForFunction(()=>PP.st.src&&PP.st.src!=='sim'||PP.st.scn!=='live',{timeout:60000}).catch(()=>{});await sleep(4000);
  const s=await state();
  const pack=await ev(()=>{const c=JSON.parse(localStorage.getItem('pp_cache2')||'null');return c&&{ts:c.ts,made:c.made,keys:Object.keys(c.by||{}).length,daily:!!c.daily,alerts:c.alerts&&c.alerts.length,closures:c.closures&&{date:c.closures.date,slot:c.closures.slot,total:c.closures.total,roads:(c.closures.roads||[]).length}};});
  const via=await ev(()=>PP.st.via||null);
  return {state:s,pack,via,shot:shot('first_open_en')};
 });
 await step('plan Dehradun to Badrinath by typing',async()=>{
  for(const [sel,v] of [['#in-from','Dehradun'],['#in-to','Badrinath']]){await tap(sel);await ev(s=>{const e=document.querySelector(s);e.select();},sel);adb('input keyevent 67');adb('input text '+v);await sleep(600);adb('input keyevent 66');await sleep(1200);}
  adb('input keyevent 111');await sleep(500);
  const s=await state();const verdict=await text('#verdict');const closures=await ev(()=>{const c=document.getElementById('closures');return c&&!c.hidden?c.innerText:null;});
  return {state:s,verdict,closures,keyboardUp:adb('dumpsys input_method | grep mInputShown | head -1'),shot:shot('trip_dehradun_badrinath')};
 });
 const tabs=['route','map','reports','rules','safety'];
 for(const lang of ['en','hi']){
  await step('language '+lang+': every tab and view',async()=>{
   await tap(lang==='en'?'#b-en':'#b-hi');const out={tabs:{}};
   for(const t of tabs){await ev(()=>scrollTo(0,0));await tap('[data-t="'+t+'"]');await sleep(800);
    const tx=await text('#panel');out.tabs[t]={len:tx.length,style:style(tx),overflowX:(await state()).overflowX,shot:shot(lang+'_tab_'+t)};
    if(lang==='hi')out.tabs[t].latin=await latin();}
   for(const v of ['ops','proof','trip']){const has=await ev(v=>!!document.querySelector('[data-view="'+v+'"]'),v);if(!has){out['view_'+v]='no button';continue;}
    await ev(()=>scrollTo(0,0));await tap('[data-view="'+v+'"]');await sleep(1500);
    out['view_'+v]={style:style(await text('body')),overflowX:(await state()).overflowX,shot:v==='trip'?null:shot(lang+'_view_'+v)};if(lang==='hi'&&v!=='trip')out['view_'+v].latin=await latin();}
   out.headerStyle=style(await text('header')+await text('.src'));
   return out;
  });
 }
 await step('language remembered after the app is closed',async()=>{
  const before=(await state()).lang;await launch(false);const after=(await state()).lang;return {before,after,shot:shot('reopen_lang')};
 });
 await step('back to English',async()=>{await tap('#b-en');return {lang:(await state()).lang};});

 // where am I: on the Rishikesh to Devprayag road. First answer the Android dialog with Approximate (Android 12+ offers it).
 adb('emu geo fix 78.5986 30.1462')||sh('adb emu geo fix 78.5986 30.1462');sh('adb emu geo fix 78.5986 30.1462');
 await step('where am I, location dialog answered with Approximate',async()=>{
  await ev(()=>{PP.st.tab='route';PP.render();});await tap('#a-where');await sleep(1500);
  const dlg=uiTexts();const s1=shot('where_dialog');
  const a=await uiTap(/^Approximate$/i);const b=await uiTap(/While using the app|Only this time/i);await sleep(4000);
  const body=await text('#modal-body');const p=adb('dumpsys package '+PKG+' | grep -E "LOCATION" | head -4');
  return {dialog:dlg,tapped:[a,b],granted:p,body,shot:s1,shot2:shot('where_after_approx')};
 });
 await step('where am I again with approximate already granted',async()=>{
  await closeModal();await tap('#a-where');await sleep(5000);return {dialog:uiTexts().slice(0,12),body:await text('#modal-body'),shot:shot('where_approx_second')};
 });
 await step('where am I with precise location',async()=>{
  await closeModal();adb('pm grant '+PKG+' android.permission.ACCESS_FINE_LOCATION');await launch(false);
  await tap('#a-where');await sleep(5000);const d=uiTexts();if(d.some(t=>/While using|Only this time/.test(t)))await uiTap(/While using the app/i);await sleep(3000);
  return {body:await text('#modal-body'),shot:shot('where_precise')};
 });
 await step('where am I when location is refused',async()=>{
  await closeModal();adb('pm revoke '+PKG+' android.permission.ACCESS_FINE_LOCATION');adb('pm revoke '+PKG+' android.permission.ACCESS_COARSE_LOCATION');await launch(false);
  await tap('#a-where');await sleep(1500);const d=uiTexts();const t=await uiTap(/Don.t allow|Deny/i);await sleep(3000);
  return {dialog:d.slice(0,10),tapped:t,body:await text('#modal-body'),shot:shot('where_denied')};
 });
 await step('where am I with location switched off in Android settings',async()=>{
  await closeModal();adb('pm grant '+PKG+' android.permission.ACCESS_FINE_LOCATION');adb('cmd location set-location-enabled false');await launch(false);
  await tap('#a-where');await sleep(12000);const body=await text('#modal-body');const sc=shot('where_location_off');adb('cmd location set-location-enabled true');return {body,shot:sc};
 });
 sh('adb emu geo fix 78.5986 30.1462');

 await step('tell family: SMS with the plan',async()=>{
  await closeModal();await launch(false);await tap('#a-fam');await tap('#fm-num');adb('input text 9876543210');await sleep(500);await ev(()=>document.activeElement&&document.activeElement.blur());await sleep(800);
  const prev=await text('#fm-prev');const s1=shot('family_modal');
  const href0=await ev(()=>document.querySelector('[data-fm="plan"]').getAttribute('href'));
  await tap('[data-fm="plan"]');await sleep(3000);const app=resumed();const smsUi=uiTexts().slice(0,30);const s2=shot('family_sms_app');
  await backToApp();await connect().catch(()=>{});
  return {preview:prev,hrefBefore:href0,resumed:app,smsUi,shot:s1,shot2:s2,style:style(prev)};
 });
 await step('tell family: "I am stuck" with location',async()=>{
  await closeModal().catch(()=>{});await tap('#a-fam');await tap('[data-fm="stuck"]');await sleep(6000);const app=resumed();const smsUi=uiTexts().slice(0,30);const s=shot('family_stuck');
  await backToApp();await connect().catch(()=>{});return {resumed:app,smsUi,shot:s};
 });
 await step('tell family with no number typed',async()=>{
  await closeModal().catch(()=>{});await ev(()=>localStorage.removeItem('pp_fam'));await tap('#a-fam');await ev(()=>{const e=document.getElementById('fm-num');e.value='';});
  await tap('[data-fm="ok"]');await sleep(800);const toast=await text('#toast');return {resumed:resumed(),toast,shot:shot('family_no_number')};
 });
 await step('back button with a window open',async()=>{
  await closeModal().catch(()=>{});await tap('#a-fam');await sleep(500);const open=await ev(()=>!!document.querySelector('#modal:not([hidden])'));adb('input keyevent 4');await sleep(1500);
  const top=resumed();let s=null;if(top.includes(PKG)){s=await state().catch(()=>null);}const sc=shot('back_button');await backToApp();await connect().catch(()=>{});return {modalOpenBeforeBack:open,resumedAfterBack:top,state:s,shot:sc};
 });
 await step('back button on a tab other than the trip',async()=>{
  await ev(()=>{PP.st.tab='safety';PP.render();});adb('input keyevent 4');await sleep(1500);const top=resumed();await backToApp();await connect().catch(()=>{});return {resumedAfterBack:top};
 });
 await step('save trip and my trips list',async()=>{
  await launch(false);await tap('#a-save');await sleep(800);const mt=await text('#mytrips');return {saved:await ev(()=>localStorage.getItem('pp_trips')),mytrips:mt,shot:shot('my_trips')};
 });
 await step('share buttons: WhatsApp advice, share, listen, QR, copy',async()=>{
  const out={};
  for(const sel of ['#adv-wa','#a-share','#a-listen','#a-qr','#adv-copy']){
   const has=await ev(s=>!!document.querySelector(s),sel);if(!has){out[sel]='not on screen';continue;}
   await tap(sel);await sleep(2500);const top=resumed();out[sel]={resumed:top,ui:uiTexts().slice(0,15),toast:await text('#toast').catch(()=>null),url:await ev(()=>location.href).catch(e=>String(e)),shot:shot('btn_'+sel.slice(1))};
   if(!top.includes(PKG)){await backToApp();await connect().catch(()=>{});}else{await closeModal().catch(()=>{});}
   out[sel].speaking=await ev(()=>window.speechSynthesis?{speaking:speechSynthesis.speaking,voices:speechSynthesis.getVoices().length}:'no speechSynthesis').catch(()=>null);
  }
  out.clip=adb('cmd clipboard get-primary-clip 2>/dev/null | head -c 300');
  out.navigator=await ev(()=>({share:!!navigator.share,clipboard:!!navigator.clipboard,speech:!!window.speechSynthesis,sr:!!(window.SpeechRecognition||window.webkitSpeechRecognition)}));
  return out;
 });
 await step('share the app file (APK) from the safety tab',async()=>{
  await ev(()=>{PP.st.tab='safety';PP.render();});const has=await ev(()=>!!document.getElementById('a-app'));
  if(!has){await ev(()=>{PP.st.tab='rules';PP.render();});}
  const where=await ev(()=>PP.st.tab);if(!(await ev(()=>!!document.getElementById('a-app'))))return {found:false};
  await tap('#a-app');await sleep(3000);const top=resumed();const u=uiTexts().slice(0,20);const s=shot('share_app_chooser');await backToApp();await connect().catch(()=>{});return {tab:where,resumed:top,ui:u,shot:s};
 });
 await step('SOS button',async()=>{
  await ev(()=>{PP.st.tab='safety';PP.render();});if(!(await ev(()=>!!document.getElementById('a-sos'))))return {found:false};
  await tap('#a-sos');await sleep(3000);const top=resumed();const u=uiTexts().slice(0,20);const s=shot('sos');await backToApp();await connect().catch(()=>{});return {resumed:top,ui:u,shot:s};
 });
 await step('voice question (mic button)',async()=>{
  await ev(()=>{PP.st.tab='route';PP.render();scrollTo(0,0);});await tap('#b-mic');await sleep(2500);const u=uiTexts().slice(0,15);const t=await text('#toast');const s=shot('mic');adb('input keyevent 4');await sleep(800);
  if(!resumed().includes(PKG))await backToApp();await connect().catch(()=>{});return {ui:u,toast:t,shot:s,resumed:resumed()};
 });
 await step('typed question box in English and Hinglish',async()=>{
  const out={};
  for(const q of ['dehradun to kedarnath tomorrow morning','rishikesh se joshimath kal']){
   await ev(()=>scrollTo(0,0));await tap('#in-ask');await ev(()=>{document.getElementById('in-ask').value='';});adb('input text '+JSON.stringify(q.replace(/ /g,'%s')));adb('input keyevent 66');await sleep(1500);
   out[q]=await ev(()=>({from:PP.st.from,to:PP.st.to,date:PP.st.date,dep:PP.st.dep}));}
  out.hindiTyped=await ev(()=>{const e=document.getElementById('in-to');e.value='बद्रीनाथ';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));
   e.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return new Promise(r=>setTimeout(()=>r({to:PP.st.to,val:e.value}),800));});
  adb('input keyevent 111');return Object.assign(out,{shot:shot('ask_box')});
 });
 await step('downloads inside the app (proof and open data exports)',async()=>{
  const out={};adb('rm -rf /sdcard/Download/*');
  await ev(()=>scrollTo(0,0));await tap('[data-view="proof"]');await sleep(1500);
  for(const sel of ['#pr-dl','#od-exp']){if(!(await ev(s=>!!document.querySelector(s),sel))){out[sel]='not on screen';continue;}await tap(sel);await sleep(2500);out[sel]={resumed:resumed(),ui:uiTexts().slice(0,10)};}
  out.downloadsFolder=adb('ls -la /sdcard/Download/');out.shot=shot('downloads');
  await ev(()=>scrollTo(0,0));await tap('[data-view="trip"]');return out;
 });
 await step('turn the phone sideways',async()=>{
  const before=await state();adb('settings put system accelerometer_rotation 0');adb('settings put system user_rotation 1');await sleep(3000);
  await connect().catch(()=>{});const mid=await state();const s=shot('landscape');adb('settings put system user_rotation 0');await sleep(2500);await connect().catch(()=>{});
  return {before:[before.from,before.to,before.tab],landscape:[mid.from,mid.to,mid.tab,mid.overflowX,mid.vw],shot:s};
 });
 await step('app killed in the background, then reopened',async()=>{
  await ev(()=>{PP.st.tab='reports';PP.render();});const before=await state();adb('input keyevent 3');await sleep(1500);adb('am kill '+PKG);await sleep(1000);
  adb('am start -W -n '+ACT);await connect();await sleep(1500);const after=await state();return {before:[before.from,before.to,before.tab],after:[after.from,after.to,after.tab],shot:shot('after_kill')};
 });
 await step('large text (font size 130 percent)',async()=>{
  adb('settings put system font_scale 1.3');await launch(false);const s=await state();const sc=shot('font_130');
  const clipped=await ev(()=>[...document.querySelectorAll('button,.btn,.pill,.rk')].filter(e=>e.offsetParent&&e.scrollWidth>e.clientWidth+2).map(e=>e.id||e.className+':'+e.innerText.slice(0,20)).slice(0,15));
  adb('settings put system font_scale 1.0');return {overflowX:s.overflowX,clipped,shot:sc};
 });
 await step('dark mode phone',async()=>{adb('cmd uimode night yes');await launch(false);const s=shot('dark');const bg=await ev(()=>getComputedStyle(document.body).backgroundColor);adb('cmd uimode night no');return {bg,shot:s};});


 // ---------- more online checks ----------
 await step('copy link in the QR window',async()=>{
  await launch(false);await ev(()=>{PP.st.tab='route';PP.render();});await tap('#a-qr');await sleep(800);const link=await text('#modal-body');
  await tap('#a-copyl');await sleep(1200);const toast=await text('#toast');
  const direct=await ev(()=>navigator.clipboard.writeText('pp-test').then(()=>'ok',e=>String(e)));
  const sc=shot('copy_link');await closeModal();return {link:link.slice(0,300),toast:toast.slice(0,200),writeText:direct,shot:sc};
 });
 await step('control room advisory: copy and WhatsApp',async()=>{
  await ev(()=>scrollTo(0,0));await tap('[data-view="ops"]');await sleep(1500);const out={};
  await tap('#adv-copy');await sleep(1200);out.copyToast=(await text('#toast')).slice(0,200);out.shot=shot('adv_copy');
  await tap('#adv-wa');await sleep(2500);out.waResumed=resumed();out.waShot=shot('adv_wa');
  if(!out.waResumed.includes(PKG)){await backToApp();await connect().catch(()=>{});}
  await ev(()=>scrollTo(0,0));await tap('[data-view="trip"]');return out;
 });
 await step('helpline number tap opens the dialer',async()=>{
  await ev(()=>{PP.st.tab='safety';PP.render();});const href=await ev(()=>{const a=document.querySelector('a.help');return a&&a.getAttribute('href');});
  await tap('a.help');await sleep(2500);const top=resumed();const u=uiTexts().slice(0,12);const sc=shot('helpline');await backToApp();await connect().catch(()=>{});return {href,resumed:top,ui:u,shot:sc};
 });
 await step('voice input error',async()=>{
  return {sr:await ev(()=>new Promise(r=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return r('no SpeechRecognition');
   const x=new SR();const ev=[];x.onstart=()=>ev.push('start');x.onaudiostart=()=>ev.push('audiostart');x.onerror=e=>ev.push('error:'+e.error);x.onend=()=>{ev.push('end');r(ev);};
   try{x.start();}catch(e){r('throws '+e);}setTimeout(()=>r(ev.concat('no end after 8 s')),8000);})),ui:uiTexts().slice(0,8)};
 });
 await step('file pickers: load results file, load open data file',async()=>{
  await ev(()=>scrollTo(0,0));await tap('[data-view="proof"]');await sleep(1500);const out={};
  for(const sel of ['#pr-ul','#od-imp']){if(!(await ev(s=>!!document.querySelector(s),sel))){out[sel]='not on screen';continue;}
   await tap(sel);await sleep(2500);out[sel]={resumed:resumed(),ui:uiTexts().slice(0,8)};if(!out[sel].resumed.includes(PKG)){await backToApp();await connect().catch(()=>{});}}
  out.shot=shot('file_picker');await ev(()=>scrollTo(0,0));await tap('[data-view="trip"]');return out;
 });
 await step('open a saved trip, swap from and to',async()=>{
  await ev(()=>{PP.st.from='haridwar';PP.st.to='kedarnath';PP.st.tab='route';PP.render();});const has=await ev(()=>!!document.querySelector('[data-mt-open="0"]'));
  if(has)await tap('[data-mt-open="0"]');const a=await ev(()=>[PP.st.from,PP.st.to]);await ev(()=>scrollTo(0,0));await tap('#swap');await sleep(600);const b=await ev(()=>[PP.st.from,PP.st.to]);
  return {savedTripButton:has,afterOpen:a,afterSwap:b};
 });
 await step('shared report channel status with signal',async()=>{
  await ev(()=>{PP.st.tab='reports';PP.render();});await sleep(20000);return {status:await text('#sh-st'),shot:shot('share_status_online')};
 });
 await step('date picker',async()=>{
  await ev(()=>{PP.st.tab='route';PP.render();scrollTo(0,0);});await tap('#in-date');await sleep(1500);const u=uiTexts().slice(0,12);const sc=shot('date_picker');adb('input keyevent 4');await sleep(800);
  if(!resumed().includes(PKG))await backToApp();return {ui:u,shot:sc};
 });
 await step('English words left on Hindi screens (in context)',async()=>{
  await tap('#b-hi');const out={};
  for(const v of ['proof','ops']){await ev(()=>scrollTo(0,0));await tap('[data-view="'+v+'"]');await sleep(1200);
   out[v]=await ev(v=>{const t=document.getElementById('v-'+v).innerText.split('\n');return t.filter(l=>/[A-Za-z]{4,}/.test(l)&&/[\u0900-\u097F]/.test(l)||/^[^\u0900-\u097F]*[a-z]{4,}[^\u0900-\u097F]*$/.test(l)).slice(0,25);},v);}
  for(const tb of ['rules','safety','reports']){await ev(()=>scrollTo(0,0));await tap('[data-view="trip"]');await ev(tb=>{PP.st.tab=tb;PP.render();},tb);
   out[tb]=await ev(()=>document.getElementById('panel').innerText.split('\n').filter(l=>/[a-z]{4,}/.test(l)).slice(0,25));}
  await tap('#b-en');return out;
 });
 // ---------- offline ----------
 await step('flight mode, reopen the app',async()=>{
  airplane(true);await sleep(4000);await launch(false);await sleep(8000);const s=await state();
  const closures=await ev(()=>{const c=document.getElementById('closures');return c&&!c.hidden?c.innerText.slice(0,400):null;});
  const alerts=await ev(()=>{const c=document.getElementById('alerts');return c&&!c.hidden?c.innerText.slice(0,300):null;});
  return {state:s,verdict:await text('#verdict'),closures,alerts,net:adb('dumpsys connectivity | grep -i "Active default network" | head -1'),shot:shot('offline_trip')};
 });
 await step('offline: plan another trip and where am I',async()=>{
  await ev(()=>{PP.st.from='haridwar';PP.st.to='kedarnath';PP.render();});await sleep(800);const v=await text('#verdict');
  await tap('#a-where');await sleep(6000);const w=await text('#modal-body');const sc=shot('offline_where');await closeModal();
  return {verdict:v,where:w,shot:sc};
 });
 await step('offline: road report goes to the waiting queue',async()=>{
  await installNtfyGuard();
  await ev(()=>{PP.st.tab='reports';PP.render();scrollTo(0,0);});await sleep(600);
  const opts=await ev(()=>[...document.querySelectorAll('#r-loc option')].slice(0,3).map(o=>o.value+'='+o.textContent));
  await tap('#r-send');await sleep(1500);const s=await state();const panel=await text('#panel');const st2=await ev(()=>document.getElementById('sh-st')?document.getElementById('sh-st').innerText:null);
  return {options:opts,outbox:s.outbox,shareStatus:st2,panelStart:panel.slice(0,600),posted:await ev(()=>window.__posted),shot:shot('offline_report_queued')};
 });
 await step('offline: Hindi screens',async()=>{
  await tap('#b-hi');await sleep(800);const m=(await state()).srcmsg;const p=await text('#panel');const sc=shot('offline_hi_reports');await tap('#b-en');return {srcmsg:m,panel:p.slice(0,500),style:style(m+p),shot:sc};
 });

 await step('offline: map tab with the offline map',async()=>{
  await ev(()=>{PP.st.from='dehradun';PP.st.to='badrinath';PP.st.tab='map';PP.render();scrollTo(0,0);});await sleep(1500);
  const has=await ev(()=>!!document.querySelector('[data-tiles="0"]'));if(has)await tap('[data-tiles="0"]');await sleep(2000);
  await ev(()=>{const m=document.getElementById('lmap');m&&m.scrollIntoView({block:'center'});});await sleep(800);return {offlineMapButton:has,shot:shot('offline_map')};
 });
 await step('offline: closure and alert cards (sample data put in the saved forecast)',async()=>{
  const saved=await ev(()=>localStorage.getItem('pp_cache2'));
  await ev(()=>{const c=JSON.parse(localStorage.getItem('pp_cache2'));const istDay=ms=>new Date(ms+5.5*3600e3).toISOString().slice(0,10);const today=istDay(Date.now()-4*3600e3);
   c.alerts=[{t:'TEST SAMPLE: Thunderstorm with lightning likely over Chamoli, Rudraprayag in next 3 hours.',by:'IMD Dehradun',at:new Date(Date.now()-2*3600e3).toISOString().slice(0,19)+'Z'}];
   c.closures={date:today,slot:'morning',url:'https://example.org/sample.pdf',total:3,dist:{dehradun:'Dehradun',rishikesh:'Dehradun',devprayag:'Tehri',srinagar:'Pauri',rudraprayag:'Rudraprayag',karnaprayag:'Chamoli',chamoli:'Chamoli',joshimath:'Chamoli',govindghat:'Chamoli',badrinath:'Chamoli'},
    per:{Chamoli:2,Pithoragarh:1},roads:[{n:'Jyotirmath Malari motor road (test sample)',id:1,ag:'BRO',ty:'SH',d:'Chamoli',km:'12',c:today+'T07:10',e:today+'T18:00',near:['joshimath']},
    {n:'Nandprayag Ghat motor road (test sample)',id:2,ag:'PWD',ty:'MDR',d:'Chamoli',km:'1,3',c:today+'T06:42'}]};
   localStorage.setItem('pp_cache2',JSON.stringify(c));});
  await page.c.send('Page.reload',{});await sleep(2500);await page.waitForFunction(()=>window.PP&&PP.st&&PP.st.series,{timeout:60000});
  await ev(()=>{PP.st.from='dehradun';PP.st.to='badrinath';PP.st.tab='route';PP.render();});await sleep(1000);
  const out={src:(await state()).src};
  for(const lang of ['en','hi']){await tap(lang==='en'?'#b-en':'#b-hi');await sleep(600);
   out[lang]={alerts:await ev(()=>{const c=document.getElementById('alerts');return c&&!c.hidden?c.innerText:null;}),closures:await ev(()=>{const c=document.getElementById('closures');return c&&!c.hidden?c.innerText:null;})};
   await ev(()=>{const c=document.getElementById('closures')||document.getElementById('alerts');c&&c.scrollIntoView({block:'start'});});await sleep(500);out[lang].shot=shot('offline_cards_'+lang);
   out[lang].style=style((out[lang].alerts||'')+(out[lang].closures||''));}
  await tap('#b-en');await ev(s=>localStorage.setItem('pp_cache2',s),saved);return out;
 });
 await step('signal back: queue sends and forecast refreshes (no reopen)',async()=>{
  await installNtfyGuard();const t0=Date.now();airplane(false);const log=[];
  for(let i=0;i<38;i++){await sleep(10000);const s=await state().catch(e=>({e:String(e)}));const p=await ev(()=>window.__posted.length).catch(()=>-1);
   log.push([Math.round((Date.now()-t0)/1000),s.src,s.online,s.outbox,p,(s.srcmsg||'').slice(0,80)]);if(s.outbox===0&&s.src==='live'&&i>2)break;}
  return {log,posted:await ev(()=>window.__posted).catch(()=>null),shot:shot('back_online')};
 },480000);
 await step('offline: report queued, app reopened later with signal',async()=>{
  airplane(true);await sleep(4000);
  await page.c.send('Page.enable');await page.c.send('Page.addScriptToEvaluateOnNewDocument',{source:GUARD});
  await page.c.send('Page.reload',{});await sleep(2500);await page.waitForFunction(()=>window.PP&&PP.st&&PP.st.series,{timeout:60000});
  // the guard must be in place before the page's own scripts run, or a queued report would reach the public channel
  if(!(await ev(()=>!!window.__guard&&Array.isArray(window.__posted))))throw new Error('guard not active after reload, stopping before signal');
  await ev(()=>{PP.st.tab='reports';PP.render();scrollTo(0,0);});await sleep(500);await tap('#r-send');await sleep(1000);
  const before=(await state()).outbox;airplane(false);await sleep(6000);
  await page.c.send('Page.reload',{});await sleep(2500);await page.waitForFunction(()=>window.PP&&PP.st&&PP.st.series,{timeout:60000});
  let log=[];for(let i=0;i<9;i++){await sleep(5000);const s=await state();const p=await ev(()=>(window.__posted||[]).length);log.push([i*5+5,s.src,s.outbox,p]);if(s.outbox===0&&p>0)break;}
  const guarded=await ev(()=>!!window.__guard);airplane(true);await sleep(3000);
  return {queuedBefore:before,guarded,log,shot:shot('reopen_with_signal')};
 });

 // ---------- days pass with no signal ----------
 const clock=async days=>{adb('settings put global auto_time 0');const t=Math.floor(Date.now()/1000)+days*86400;adb('date @'+t);await sleep(500);return adb('date');};
 for(const d of [2,11]){
  await step('flight mode, phone clock '+d+' days later, reopen',async()=>{
   airplane(true);await sleep(3000);const now=await clock(d);await launch(false);await sleep(6000);
   const s=await state();return {deviceDate:now,state:s,verdict:await text('#verdict'),pills:await ev(()=>[...document.querySelectorAll('.rk')].filter(x=>x.offsetParent).length),reports:await ev(()=>PP.st.reports.length),shot:shot('offline_'+d+'_days')};
  });
 }
 await step('clock back to now, signal back',async()=>{
  // anything still queued would go to the public channel once the app opens online: note it, then empty the queue first
  const left=await ev(()=>JSON.parse(localStorage.getItem('pp_outbox')||'[]').length);R.outboxLeftBeforeLastOnline=left;
  await ev(()=>localStorage.setItem('pp_outbox','[]'));adb('am force-stop '+PKG);
  adb('settings put global auto_time 1');adb('date @'+Math.floor(Date.now()/1000));airplane(false);await sleep(8000);
  await launch(false);await installNtfyGuard();await sleep(5000);return {state:await state(),date:adb('date')};});

 R.pageErrors=pageErrs;
 fs.writeFileSync(OUT+'/console.txt',CON.join('\n'));
 fs.writeFileSync(OUT+'/results.json',JSON.stringify(R,null,1));
 try{page&&page.c.ws.terminate();}catch(e){}
 console.log('done');process.exit(0);
})().catch(e=>{console.log('FATAL '+e.stack);R.fatal=String(e.stack);fs.writeFileSync(OUT+'/results.json',JSON.stringify(R,null,1));fs.writeFileSync(OUT+'/console.txt',CON.join('\n'));process.exit(0);});
