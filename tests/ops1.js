// R6.1 checks: the app tells the UI about data sync ('pp:sync') and the report outbox ('pp:outbox') through window events.
const {chromium}=require('playwright');
const F=process.argv[2];
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
const istHour=ms=>new Date(Math.floor((ms+5.5*3600e3)/3600e3)*3600e3).toISOString().slice(0,13)+':00';
(async()=>{
 const b=await chromium.launch();
 // 1. sync: a fresh data pack gives start, pack, done; with no network and nothing saved, start then error
 {
  const ctx=await b.newContext();const p=await ctx.newPage();let net=true;
  await ctx.route(/^https?:\/\//,async r=>{const u=new URL(r.request().url());
   if(net&&u.host==='raw.githubusercontent.com'&&u.pathname.endsWith('/datapack/pack.json')){
    const keys=await p.evaluate(()=>[...new Set(PP.EDGES.filter(e=>!e.virtual).map(e=>e.cLat.toFixed(2)+','+e.cLon.toFixed(2)))]).catch(()=>null);
    if(!keys)return r.abort();
    const hourly={},daily={};keys.forEach(k=>{hourly[k]=new Array(456).fill(0);daily[k]=new Array(47).fill(0);});
    const now=Date.now();
    return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({v:1,made:new Date(now-3600e3).toISOString(),hour0:istHour(now-3600e3),
      day0:new Date(now+5.5*3600e3-31*864e5).toISOString().slice(0,10),hourly,daily})});}
   return r.abort();});
  await p.goto('file://'+F+'?tiles=0');await p.waitForFunction(()=>window.PP&&PP.st.series);
  const ev=await p.evaluate(async()=>{const got=[];const f=e=>got.push(e.detail);window.addEventListener('pp:sync',f);
    PP.st.scn='live';await PP.load();window.removeEventListener('pp:sync',f);return got;});
  ok(JSON.stringify(ev.map(e=>e.phase))==='["start","pack","done"]','sync phases '+JSON.stringify(ev));
  ok(ev[1]&&ev[1].source==='pack'&&typeof ev[1].made==='number'&&ev[2].source==='pack'&&ev[2].made===ev[1].made,'sync pack detail '+JSON.stringify(ev));
  ok(ev.every(e=>['phase','made','source'].every(k=>k in e)),'sync detail keys');
  net=false;
  const ev2=await p.evaluate(async()=>{localStorage.removeItem('pp_cache2');const got=[];const f=e=>got.push(e.detail);window.addEventListener('pp:sync',f);
    await PP.load();window.removeEventListener('pp:sync',f);return got;});
  ok(ev2.length>=2&&ev2[0].phase==='start'&&ev2[ev2.length-1].phase==='error'&&ev2[ev2.length-1].made===null,'sync error '+JSON.stringify(ev2));
  await ctx.close();
 }
 // 2. outbox: a report made offline counts as waiting; going online fires sending, then sent with nothing waiting
 {
  const ctx=await b.newContext();const p=await ctx.newPage();let online=false;
  await ctx.route(/^https?:\/\//,async r=>{const u=new URL(r.request().url());
   if(online&&u.host==='ntfy.sh'&&r.request().method()==='POST')return r.fulfill({status:200,body:'{}'});
   return r.abort();});
  await p.addInitScript(()=>{window.__shTest=true;window.__ob=[];window.addEventListener('pp:outbox',e=>window.__ob.push(e.detail));});
  await p.goto('file://'+F+'?tiles=0&scn=monsoon');await p.waitForFunction(()=>window.PP&&PP.st.series);
  await p.evaluate(()=>{PP.st.tab='reports';PP.render();});
  await p.waitForSelector('#r-send');await p.click('#r-send');await p.waitForTimeout(300);
  const a=await p.evaluate(()=>window.__ob.slice());
  ok(a.some(d=>d.waiting===1&&d.sending===false),'outbox waiting 1 '+JSON.stringify(a));
  online=true;await p.evaluate(()=>{window.__ob=[];window.dispatchEvent(new Event('online'));});
  await p.waitForFunction(()=>window.__ob.some(d=>d.sending===false&&d.waiting===0),null,{timeout:8000}).catch(()=>{});
  const c=await p.evaluate(()=>window.__ob.slice());
  ok(c.length&&c[0].sending===true&&c[0].total===1&&c[0].sent===0,'outbox send starts '+JSON.stringify(c));
  const last=c[c.length-1];
  ok(last&&last.sending===false&&last.waiting===0&&last.sent===1&&last.total===1,'outbox send ends '+JSON.stringify(c));
  ok(c.every(d=>['waiting','sending','sent','total'].every(k=>k in d)),'outbox detail keys');
  await ctx.close();
 }
 await b.close();
 if(fails.length){console.error('FAIL\n'+fails.join('\n'));process.exit(1);}
 console.log('all R6.1 event checks passed');
})().catch(e=>{console.error(e);process.exit(1);});
