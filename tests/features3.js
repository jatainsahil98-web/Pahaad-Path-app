// v5 checks: data pack, offline use of an old forecast, report outbox, share the app, and the trained model matching Python.
const {chromium}=require('playwright');
const fs=require('fs'),os=require('os'),path=require('path');
const F=process.argv[2];
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
const istHour=ms=>new Date(Math.floor((ms+5.5*3600e3)/3600e3)*3600e3).toISOString().slice(0,13)+':00';
(async()=>{
 const b=await chromium.launch();
 // 1. data pack: one file replaces the weather API, and the model gets 31 days of daily rain from it
 {
  const ctx=await b.newContext();const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  let om=0,packs=0;
  await ctx.route(/^https?:\/\//,async r=>{const u=new URL(r.request().url());
   if(u.host==='raw.githubusercontent.com'&&u.pathname.endsWith('/datapack/pack.json')){packs++;
    const keys=await p.evaluate(()=>[...new Set(PP.EDGES.filter(e=>!e.virtual).map(e=>e.cLat.toFixed(2)+','+e.cLon.toFixed(2)))]).catch(()=>null);
    if(!keys)return r.abort();
    const hourly={},daily={};keys.forEach((k,i)=>{hourly[k]=Array.from({length:456},(_,j)=>j>60&&j<80?120:0);daily[k]=Array.from({length:47},(_,j)=>j===28?1800:0);});
    const now=Date.now(),d0=new Date(now+5.5*3600e3-31*864e5).toISOString().slice(0,10);
    return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({v:1,hour0:istHour(now-2*3600e3),day0:d0,hourly,daily})});}
   if(u.host==='api.open-meteo.com')om++;
   return r.abort();});
  await p.goto('file://'+F+'?tiles=0');await p.waitForFunction(()=>window.PP&&PP.st.series);
  om=0;await p.evaluate(()=>{PP.st.scn='live';return PP.load();});
  const s=await p.evaluate(()=>({src:PP.st.src,via:PP.st.via,msg:document.getElementById('srcmsg').textContent,daily:!!PP.st.daily,
   r:PP.st.series['rishikesh-devprayag'].slice(58,64)}));
  ok(s.src==='live'&&s.via==='pack','pack used '+JSON.stringify(s));
  ok(/data pack/.test(s.msg),'header names the pack: '+s.msg);
  ok(s.daily,'daily rain from pack');
  ok(s.r[0]===0&&s.r[1]===12,'pack hours shifted by 2 h and scaled to mm: '+s.r);
  ok(om===0,'no weather API call when the pack is fresh, got '+om);
  ok(!errs.length,'page errors '+errs);
  console.log('pack:',JSON.stringify(s));
  await ctx.close();
 }
 // 2. offline for 3 days: the saved forecast is still used, and the header says how old it is
 {
  const ctx=await b.newContext();const p=await ctx.newPage();
  await ctx.route(/^https?:\/\//,r=>r.abort());
  await p.goto('file://'+F+'?tiles=0');await p.waitForFunction(()=>window.PP&&PP.st.series);
  await p.evaluate(()=>{const by={};PP.EDGES.forEach(e=>{by[e.cLat.toFixed(2)+','+e.cLon.toFixed(2)]=new Array(456).fill(.5);});
   const ts=Math.floor((Date.now()-3*864e5)/3600e3)*3600e3;localStorage.setItem('pp_cache2',JSON.stringify({ts,by}));PP.st.scn='live';});
  await p.evaluate(()=>PP.load());
  const s=await p.evaluate(()=>({src:PP.st.src,msg:document.getElementById('srcmsg').textContent,plans:!!(PP.last&&PP.last.plans&&PP.last.plans.length)}));
  ok(s.src==='cache','old forecast used offline: '+s.src);
  ok(/3 days ago/.test(s.msg)&&/not known/.test(s.msg),'age warning: '+s.msg);
  ok(s.plans,'trip still planned offline');
  console.log('offline:',s.msg);
  await ctx.close();
 }
 // 3. a report made with no signal waits in the outbox and goes out when the connection returns
 {
  const ctx=await b.newContext();const p=await ctx.newPage();let online=false,posted=[];
  await ctx.route(/^https?:\/\//,async r=>{const u=new URL(r.request().url());
   if(online&&u.host==='ntfy.sh'&&r.request().method()==='POST'){posted.push(JSON.parse(r.request().postData()));return r.fulfill({status:200,body:'{}'});}
   return r.abort();});
  await p.addInitScript(()=>{window.__shTest=true;});
  await p.goto('file://'+F+'?tiles=0&scn=monsoon');await p.waitForFunction(()=>window.PP&&PP.st.series);
  await p.evaluate(()=>{PP.st.tab='reports';PP.render();});
  await p.waitForSelector('#r-send');await p.click('#r-send');
  await p.waitForTimeout(300);
  const q1=await p.evaluate(()=>JSON.parse(localStorage.getItem('pp_outbox')||'[]').length);
  ok(q1===1,'report queued offline, outbox '+q1);
  online=true;await p.evaluate(()=>window.dispatchEvent(new Event('online')));
  await p.waitForFunction(()=>JSON.parse(localStorage.getItem('pp_outbox')||'[]').length===0,null,{timeout:8000}).catch(()=>{});
  const q2=await p.evaluate(()=>JSON.parse(localStorage.getItem('pp_outbox')||'[]').length);
  ok(q2===0&&posted.length===1&&posted[0].k==='report','outbox flushed: left '+q2+', posted '+posted.length);
  // 4. share the app: the file handed on is the whole app as delivered
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:8000}),p.click('#a-app')]);
  const fp=await dl.path(),html=fs.readFileSync(fp,'utf8'),orig=fs.readFileSync(F,'utf8');
  ok(html.startsWith('<!DOCTYPE html>')&&html.length>orig.length*.95&&html.includes('<div class="app" id="app">'),'shared app file '+html.length+' vs '+orig.length);
  // the file handed on runs as the app by itself (opened from disk, no network)
  const cp=path.join(os.tmpdir(),'pp-shared-'+Date.now()+'.html');fs.writeFileSync(cp,html);
  const p2=await ctx.newPage();const e2=[];p2.on('pageerror',e=>e2.push(String(e)));
  await p2.goto('file://'+cp+'?scn=monsoon&tiles=0&from=delhi&to=nainital');
  const runs=await p2.waitForFunction(()=>window.PP&&PP.last&&PP.last.cur,null,{timeout:15000}).then(()=>true,()=>false);
  ok(runs&&!e2.length,'shared file runs '+e2.join('|'));await p2.close();fs.rmSync(cp);
  console.log('outbox and share: ok');
  await ctx.close();
 }
 // 4b. inside the phone app the online event may never fire: the app still leaves the saved forecast once data flows again,
 // and it remembers the language picked last time
 {
  const ctx=await b.newContext();await ctx.clock.install();const p=await ctx.newPage();let net=false;
  await ctx.route(/^https?:\/\//,async r=>{const u=new URL(r.request().url());
   if(net&&u.host==='raw.githubusercontent.com'&&u.pathname.endsWith('/datapack/pack.json')){
    const keys=await p.evaluate(()=>[...new Set(PP.EDGES.filter(e=>!e.virtual).map(e=>e.cLat.toFixed(2)+','+e.cLon.toFixed(2)))]);
    const hourly={},daily={};keys.forEach(k=>{hourly[k]=new Array(456).fill(0);daily[k]=new Array(47).fill(0);});
    return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({v:1,hour0:istHour(Date.now()),day0:new Date(Date.now()+5.5*3600e3-31*864e5).toISOString().slice(0,10),hourly,daily})});}
   return r.abort();});
  await p.goto('file://'+F+'?tiles=0');await p.waitForFunction(()=>window.PP&&PP.st.series);
  await p.evaluate(()=>{const by={};PP.EDGES.forEach(e=>{by[e.cLat.toFixed(2)+','+e.cLon.toFixed(2)]=new Array(456).fill(.5);});
   localStorage.setItem('pp_cache2',JSON.stringify({ts:Math.floor((Date.now()-5*3600e3)/3600e3)*3600e3,by}));PP.st.scn='live';});
  await p.evaluate(()=>PP.load());
  const s1=await p.evaluate(()=>PP.st.src);
  net=true;await p.clock.runFor(5*60e3+1000);await p.waitForFunction(()=>PP.st.src==='live',null,{timeout:8000}).catch(()=>{});
  const s2=await p.evaluate(()=>({src:PP.st.src,via:PP.st.via}));
  ok(s1==='cache'&&s2.src==='live'&&s2.via==='pack','back to the live forecast without an online event: '+s1+' then '+JSON.stringify(s2));
  await p.click('#b-hi');await p.reload();await p.waitForFunction(()=>window.PP&&PP.st.series);
  const lang=await p.evaluate(()=>PP.st.lang);ok(lang==='hi','language kept after reopening: '+lang);
  console.log('reconnect without event and language memory: ok');
  await ctx.close();
 }
 // 5. the app's copy of the trained model gives the scores Python gave
 {
  const ctx=await b.newContext();const p=await ctx.newPage();await ctx.route(/^https?:\/\//,r=>r.abort());
  await p.goto('file://'+F+'?tiles=0');await p.waitForFunction(()=>window.PP&&PP.st.series);
  const m=await p.evaluate(()=>PP.modelCheck());
  if(m===null)console.log('model: not baked into this build');
  else{ok(m.n>=10&&m.bad.length===0,'model parity '+JSON.stringify(m));console.log('model parity:',m.n,'checks');
   const e=await p.evaluate(()=>{const d=PP.st.engine;PP.st.engine='v5';PP.render();const ok5=!!(PP.last&&PP.last.plans&&PP.last.plans.length);PP.st.engine=d;PP.render();return{d,ok5};});
   ok(e.d==='v4'&&e.ok5,'v4 is the default and v5 plans trips '+JSON.stringify(e));}
  await ctx.close();
 }
 await b.close();
 if(fails.length){console.log('FAIL\n'+fails.join('\n'));process.exit(1);}
 console.log('all v5 checks passed');
})();
