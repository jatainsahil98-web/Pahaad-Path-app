// v6 checks: saved trips are re-scored, family SMS text, where am I from GPS with no data, fuel cost, house style of the new screens.
const {chromium}=require('playwright');
const F=process.argv[2];
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
const style=s=>[/—/,/–/,/\S - \S/,/, (and|or|और|या) /].filter(re=>re.test(s)).map(String);
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:412,height:900},permissions:['geolocation'],geolocation:{latitude:30.1462,longitude:78.5986}});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
 await p.goto('file://'+F+'?tiles=0&scn=monsoon&from=dehradun&to=badrinath');await p.waitForFunction(()=>window.PP&&PP.st.series);
 // 1. save a trip, then pretend it was safer when saved: the list must say the risk went up
 await p.click('#a-save');
 const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('pp_trips')));
 ok(saved.length===1&&saved[0].to==='badrinath'&&typeof saved[0].score==='number','trip saved '+JSON.stringify(saved));
 await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('pp_trips'));s[0].level=0;s[0].score=1;localStorage.setItem('pp_trips',JSON.stringify(s));});
 await p.reload();await p.waitForFunction(()=>window.PP&&PP.st.series);
 const now=await p.evaluate(()=>PP.st.M.cur.level);
 const mt=await p.innerText('#mytrips');
 ok(now>0&&/Risk went up/.test(mt),'risk change shown: level '+now+' | '+mt);
 // the screen's own trip is not disturbed by checking saved trips
 await p.evaluate(()=>{PP.st.from='delhi';PP.st.to='nainital';PP.render();});
 const t2=await p.evaluate(()=>[PP.st.from,PP.st.to,PP.st.M.trip.to]);
 ok(t2.join()==='delhi,nainital,nainital','screen trip kept '+t2);
 await p.click('[data-mt-open="0"]');
 ok(await p.evaluate(()=>PP.st.to)==='badrinath','open a saved trip');
 // 2. family SMS: the plan goes in the body, to the typed number
 await p.click('#a-fam');await p.fill('#fm-num','98765 43210');
 const href=await p.evaluate(()=>{const a=document.querySelector('[data-fm="plan"]');a.addEventListener('click',e=>e.preventDefault());a.click();return decodeURIComponent(a.href);});
 ok(/^sms:9876543210\?body=PahaadPath trip: Dehradun → Badrinath\. Leaving /.test(href)&&/Road risk: /.test(href),'sms link '+href);
 ok(href.length<400,'sms short enough '+href.length);
 await p.click('#modal-x');
 // 3. where am I: a point on the Rishikesh to Devprayag road, no network
 await p.click('#fab-where');await p.waitForFunction(()=>!/Finding/.test(document.getElementById('modal-body').innerText),null,{timeout:8000});
 const wh=await p.innerText('#modal-body');
 ok(/On .+ → .+/.test(wh)&&/km left to Badrinath/.test(wh)&&/Landslide risk here now/.test(wh),'where am I: '+wh);
 await p.click('#modal-x');
 // 4. fuel from the user's numbers
 await p.click('#tabs [data-t="route"]');await p.fill('#fu-mil','10');await p.fill('#fu-pr','100');
 const km=await p.evaluate(()=>Math.round(PP.st.M.cur.totalKm)),fu=await p.innerText('#fu-out');
 ok(fu.includes('about ₹'+(Math.round(km/10*100/50)*50).toLocaleString('en-IN')),'fuel '+fu+' for '+km+' km');
 // 4b. roadside stops, when the OpenStreetMap file is baked in: listed per town on the Safety tab
 await p.evaluate(()=>{PP.st.tab='safety';PP.render();});
 const sf=await p.innerText('#panel');
 if(require('fs').existsSync(require('path').join(__dirname,'..','data','osm_stops.json')))ok(/Fuel, hospitals and mechanics on this route/.test(sf)&&/Badrinath: /.test(sf),'stops on the safety tab');
 await p.evaluate(()=>{PP.st.tab='route';PP.render();});
 // 5. house style on the new screens, both languages
 for(const lang of ['en','hi']){
  await p.click(lang==='en'?'#b-en':'#b-hi');
  let txt=await p.innerText('body');
  await p.click('#a-fam');txt+=await p.innerText('#modal-body')+await p.evaluate(()=>document.querySelector('[data-fm="plan"]').href);await p.click('#modal-x');
  await p.click('#a-where');await p.waitForTimeout(800);txt+=await p.innerText('#modal-body');await p.click('#modal-x');
  await p.evaluate(()=>{PP.st.tab='safety';PP.render();});txt+=await p.innerText('#panel');await p.evaluate(()=>{PP.st.tab='route';PP.render();});
  const bad=style(decodeURIComponent(txt));ok(!bad.length,'house style '+lang+' '+bad);
 }
 ok(!errs.length,'page errors '+errs);
 // 6. official alerts ride in the data pack and still show offline from the saved forecast
 {
  const c2=await b.newContext({viewport:{width:412,height:900}});const q=await c2.newPage();let net=true;
  const istHour=ms=>new Date(Math.floor((ms+5.5*3600e3)/3600e3)*3600e3).toISOString().slice(0,13)+':00';
  await c2.route(/^https?:\/\//,async r=>{const u=new URL(r.request().url());
   if(net&&u.host==='raw.githubusercontent.com'&&u.pathname.endsWith('/pack.json')){
    const keys=await q.evaluate(()=>[...new Set(PP.EDGES.filter(e=>!e.virtual).map(e=>e.cLat.toFixed(2)+','+e.cLon.toFixed(2)))]);
    const hourly={},daily={};keys.forEach(k=>{hourly[k]=new Array(456).fill(0);daily[k]=new Array(47).fill(0);});
    const at=new Date(Date.now()-2*3600e3).toISOString().slice(0,19)+'Z',old=new Date(Date.now()-60*3600e3).toISOString().slice(0,19)+'Z';
    return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({v:1,hour0:istHour(Date.now()),day0:new Date(Date.now()+5.5*3600e3-31*864e5).toISOString().slice(0,10),hourly,daily,
     alerts:[{t:'Thunderstorm with lightning likely over Chamoli, Rudraprayag in next 3 hours.',by:'IMD Dehradun',at},{t:'Too old to show',by:'IMD Dehradun',at:old}]})});}
   return r.abort();});
  await q.goto('file://'+F+'?tiles=0');await q.waitForFunction(()=>window.PP&&PP.st.series);
  await q.evaluate(()=>{PP.st.scn='live';return PP.load();});
  const a1=await q.innerText('#alerts');
  ok(/Official alerts for Uttarakhand/.test(a1)&&/Chamoli/.test(a1)&&/IMD Dehradun · 2 h ago/.test(a1)&&!/Too old/.test(a1),'alerts from the pack: '+a1);
  net=false;await q.reload();await q.waitForFunction(()=>window.PP&&PP.st.series);await q.evaluate(()=>{PP.st.scn='live';return PP.load();});
  const a2=await q.evaluate(()=>({src:PP.st.src,txt:document.getElementById('alerts').innerText}));
  ok(a2.src==='cache'&&/Chamoli/.test(a2.txt),'alerts offline from the saved forecast '+JSON.stringify(a2));
  await c2.close();
 }
 // 7. back after 10+ days offline: no demo rain and no sample reports on a real trip; say the forecast is too old, still plan the roads
 for(const age of [11,null]){
  const c3=await b.newContext();await c3.route(/^https?:\/\//,r=>r.abort());const q=await c3.newPage();const e3=[];q.on('pageerror',e=>e3.push(String(e)));
  await q.goto('file://'+F+'?tiles=0&from=dehradun&to=badrinath');await q.waitForFunction(()=>window.PP&&PP.st.series);
  await q.evaluate(age=>{if(age){const by={};PP.EDGES.forEach(e=>{by[e.cLat.toFixed(2)+','+e.cLon.toFixed(2)]=new Array(456).fill(9);});
   localStorage.setItem('pp_cache2',JSON.stringify({ts:Date.now()-age*864e5,by}));}PP.st.scn='live';return PP.load();},age);
  await q.evaluate(()=>{PP.st.view='trip';PP.render();});
  const r=await q.evaluate(()=>({src:PP.st.src,msg:document.getElementById('srcmsg').textContent,reps:PP.st.reports.length,
   rain:Math.max(...Object.values(PP.st.series).map(a=>Math.max(...a))),plans:!!(PP.last&&PP.last.plans&&PP.last.plans.length),
   norisk:document.body.classList.contains('norisk'),pills:[...document.querySelectorAll('.rk')].filter(x=>x.offsetParent).length,
   verdict:document.getElementById('verdict').innerText}));
  ok(r.src==='none'&&r.reps===0&&r.rain===0,'no demo rain or sample reports after '+age+' days: '+JSON.stringify(r));
  ok(age?/more than 10 days old/.test(r.msg):/nothing saved/.test(r.msg),'too old message: '+r.msg);
  ok(r.plans&&r.norisk&&r.pills===0&&/landslide risk not shown/.test(r.verdict),'trip planned, risk hidden: '+JSON.stringify(r));
  ok(!style(r.msg+r.verdict).length,'house style of the no forecast text');
  ok(!e3.length,'page errors with no forecast '+e3);
  await c3.close();
 }
 // 8. a report queued 20 h ago in a valley is not dropped: it goes out with the time it was made, and a 20 h old report from another phone is taken in
 {
  const c4=await b.newContext();let posted=[],online=false;const rt=Date.now()-20*3600e3;
  const other={v:1,k:'report',rid:'x1',dev:'other1',rt,seg:'rishikesh-devprayag',spot:0,type:'bridge'};
  await c4.route(/^https?:\/\//,async r=>{const u=new URL(r.request().url());
   if(online&&u.host==='ntfy.sh'&&r.request().method()==='POST'){posted.push(JSON.parse(r.request().postData()));return r.fulfill({status:200,body:'{}'});}
   if(u.host==='ntfy.sh'&&u.pathname.endsWith('/json'))return r.fulfill({status:200,body:JSON.stringify({event:'message',message:JSON.stringify(other)})+'\n'});
   return r.abort();});
  await c4.addInitScript(rt=>{window.__shTest=true;if(!localStorage.getItem('pp_t8')){localStorage.setItem('pp_t8','1');
   localStorage.setItem('pp_outbox',JSON.stringify([{v:1,dev:'me1',rt,k:'report',rid:'q1',seg:'rishikesh-devprayag',spot:0,type:'landslide'}]));}},rt);
  const q=await c4.newPage();await q.goto('file://'+F+'?tiles=0&scn=monsoon');await q.waitForFunction(()=>window.PP&&PP.st.series);
  await q.evaluate(()=>{PP.st.tab='reports';PP.render();});await q.waitForSelector('#r-send');await q.click('#r-send');await q.waitForTimeout(300);
  const n1=await q.evaluate(()=>JSON.parse(localStorage.getItem('pp_outbox')||'[]').length);
  ok(n1===2,'old report still queued after a new one, outbox '+n1);
  online=true;await q.evaluate(()=>window.dispatchEvent(new Event('online')));
  await q.waitForFunction(()=>JSON.parse(localStorage.getItem('pp_outbox')||'[]').length===0,null,{timeout:8000}).catch(()=>{});
  ok(posted.length===2&&posted[0].rid==='q1'&&posted[0].rt===rt,'old queued report sent with its time: '+JSON.stringify(posted));
  await q.waitForFunction(()=>PP.sharedReports().some(r=>r.rid==='x1'),null,{timeout:8000}).catch(()=>{});
  ok(await q.evaluate(()=>PP.sharedReports().some(r=>r.rid==='x1')),'20 h old shared report taken in');
  await c4.close();
 }
 await b.close();
 if(fails.length){console.log('FAIL\n'+fails.join('\n'));process.exit(1);}
 console.log('all v6 checks passed');
})();
