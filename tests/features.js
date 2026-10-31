// Feature tests with mocked Open-Meteo archive/previous-runs, OSRM and elevation replies (no real network).
const {chromium}=require('playwright');
const F=process.argv[2];
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
function hourly(start,end,fn){const t=[],v=[];let d=new Date(start+'T00:00:00Z');const e=new Date(end+'T23:00:00Z');while(d<=e){t.push(d.toISOString().slice(0,16));v.push(fn(t.length-1));d=new Date(d.getTime()+3600e3);}return{t,v};}
(async()=>{
 const b=await chromium.launch();
 const p=await b.newPage({viewport:{width:1280,height:900}});
 const errs=[];p.on('pageerror',e=>errs.push(String(e)));
 let calls={om:0,osrm:0,el:0};
 await p.route(/^https?:\/\//,async r=>{
  const u=new URL(r.request().url());
  if(/archive-api|previous-runs-api/.test(u.host)){calls.om++;if(calls.om===1)return r.fulfill({status:429,contentType:'application/json',body:'{"error":true}'}); // first reply rate-limited: the replay must wait and retry
   const lats=u.searchParams.get('latitude').split(','),lons=u.searchParams.get('longitude').split(','),hv=u.searchParams.get('hourly');
   const s=u.searchParams.get('start_date'),e=u.searchParams.get('end_date');
   const out=lats.map((la,i)=>{const wet=+la>30.6&&+lons[i]<78.9; // north-west Garhwal gets a storm on day 4
     const h=hourly(s,e,j=>j>=60&&j<90?(wet?9:.4):(j===100?null:.1));return{latitude:+la,longitude:+lons[i],hourly:{time:h.t,[hv]:h.v}};});
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(out)});}
  if(u.host==='router.project-osrm.org'){calls.osrm++;
   const m=/driving\/([\d.]+),([\d.]+);([\d.]+),([\d.]+)/.exec(u.pathname),[x1,y1,x2,y2]=m.slice(1).map(Number);
   const km=Math.hypot((x2-x1)*96,(y2-y1)*111)*1.45;const g=[0,.25,.5,.75,1].map(f=>[x1+(x2-x1)*f+.01*Math.sin(f*6),y1+(y2-y1)*f]);
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({code:'Ok',routes:[{distance:km*1000,duration:km*90,geometry:{type:'LineString',coordinates:g}}]})});}
  if(u.host==='api.open-meteo.com'&&u.pathname==='/v1/elevation'){calls.el++;if(calls.el===2)return r.fulfill({status:429,contentType:'application/json',body:'{"error":true}'}); // one rate-limit reply: the builder must wait and retry
   const la=u.searchParams.get('latitude').split(',').map(Number),lo=u.searchParams.get('longitude').split(',').map(Number);
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({elevation:la.map((a,i)=>1500+900*Math.sin(a*300)*Math.cos(lo[i]*300))})});}
  return r.abort();
 });
 await p.addInitScript(()=>{window.__sleep=1;window.__fastSleep=true;});
 await p.goto('file://'+F+'?view=proof&psec=all&tiles=0');await p.waitForFunction(()=>window.PP&&PP.st.series);
 // 1. run one replay
 await p.click('#pr-run');await p.waitForFunction(()=>document.querySelector('#pmap')&&localStorage.getItem('pp_proof'),null,{timeout:20000}); // baked results draw the map before the run ends
 const k1=await p.evaluate(()=>[...document.querySelectorAll('.kp b')].map(x=>x.textContent));
 ok(k1.length>=3,'proof kpis '+k1);
 const st1=await p.evaluate(()=>JSON.parse(localStorage.getItem('pp_proof')));
 ok(Object.keys(st1.results).length>=1,'stored result');
 const r=Object.values(st1.results).sort((a,b)=>(b.ranAt||'').localeCompare(a.ranAt||''))[0]; // newest run (a build may carry baked results)ok(r.rows.length===44,'44 rows');ok(r.nulls>0,'nulls counted');
 ok(r.metrics.named===5,'named links 5, got '+r.metrics.named);
 console.log('replay 20 Aug (mock):',JSON.stringify(r.metrics));
 // 2. plan a trip on the recorded day
 await p.click('[data-rpplan]');await p.waitForFunction(()=>PP.st.src==='replay'&&PP.last&&PP.last.cur,null,{timeout:10000});
 const tr=await p.evaluate(()=>({src:PP.st.src,scn:PP.st.scn,score:PP.last.cur.score,to:PP.st.to,msg:document.getElementById('srcmsg').textContent,date:PP.st.date}));
 ok(tr.src==='replay'&&tr.date==='2025-08-20','replay trip '+JSON.stringify(tr));console.log('trip on recorded day:',JSON.stringify(tr));
 // 3. control room on recorded day
 await p.click('[data-view="ops"]');await p.waitForFunction(()=>PP.mapLines('omap')>40);
 const adv=await p.textContent('#adv');ok(/recorded on the day/.test(adv),'advisory basis');
 await p.click('#ops-play');await p.waitForTimeout(800);await p.click('#ops-play');
 const h=await p.evaluate(()=>PP.st.opsH);ok(h>0,'play advanced '+h);
 // 4. open data builder (sleep shortened)
 await p.click('[data-view="proof"]');
 await p.evaluate(()=>{window.__fastSleep=true;});
 await p.click('#od-roads');await p.waitForFunction(()=>/Roads: 75 of 75/.test(document.getElementById('od-msg')?.textContent||''),null,{timeout:150000});
 await p.click('#od-slope');await p.waitForFunction(()=>/Slope: 44 of 44/.test(document.getElementById('od-msg')?.textContent||''),null,{timeout:60000});
 const od=await p.evaluate(()=>{const e=PP.S['rishikesh-devprayag'];return{km:e.km,km0:e.km0,src:e.kmSrc,susc:e.susc,sl:e.slSrc,foot:document.getElementById('foot').textContent};});
 console.log('open data:',JSON.stringify(od).slice(0,300),'calls',JSON.stringify(calls));
 ok(od.src==='osrm'&&od.sl==='dem','open data applied');
 // 5. matrix still sound after open data
 const m=await p.evaluate(()=>{PP.st.view='trip';PP.st.scn='monsoon';return 1;});
 await p.goto('file://'+F+'?scn=monsoon&from=delhi&to=badrinath&tab=map&tiles=0');await p.waitForFunction(()=>PP.last&&PP.last.cur);
 const mp=await p.evaluate(()=>({lines:PP.mapLines('lmap'),canvas:!!document.querySelector('#lmap canvas'),od:PP.S['rishikesh-devprayag'].kmSrc}));ok(mp.lines>3&&mp.canvas&&mp.od==='osrm','map with osrm geom '+JSON.stringify(mp));
 // 6. sentence parsing
 const asks=await p.evaluate(()=>{const o={};for(const s of ['Delhi to Kedarnath tomorrow 6 am','dilli se mussoorie kal subah 7 baje','दिल्ली से नैनीताल परसों','Badrinath from Dehradun on saturday','haldwani to munsiyari 2 nov 5 pm']){o[s]=(()=>{const x=PP.parseAsk(s);return [x.from,x.to,x.date!=null?PP.dateStr(x.date):null,x.dep].join(' ');})();}return o;});
 console.log(JSON.stringify(asks,null,1));
 ok(asks['Delhi to Kedarnath tomorrow 6 am'].startsWith('delhi kedarnath')&&/ 6$/.test(asks['Delhi to Kedarnath tomorrow 6 am']),'ask1');
 ok(asks['dilli se mussoorie kal subah 7 baje'].startsWith('delhi mussoorie')&&/ 7$/.test(asks['dilli se mussoorie kal subah 7 baje']),'ask2');
 ok(asks['दिल्ली से नैनीताल परसों'].startsWith('delhi nainital'),'ask3');
 ok(asks['Badrinath from Dehradun on saturday'].startsWith('dehradun badrinath'),'ask4');
 ok(/^haldwani munsiyari \d{4}-11-02 17$/.test(asks['haldwani to munsiyari 2 nov 5 pm']),'ask5');
 // 7. QR modal
 await p.click('#a-qr');ok(await p.isVisible('svg.qr'),'qr');
 ok(errs.length===0,'page errors '+errs.join('|'));
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'all feature checks passed');
 await b.close();
})();
