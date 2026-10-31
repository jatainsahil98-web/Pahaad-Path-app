// v4.1 tests: shared reports between two "phones", NASA catalog history (baked), threshold sensitivity, road profile. Mocked web replies.
const {chromium}=require('playwright');
const F=process.argv[2];const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
const store=[];
function hourly(start,end,fn){const t=[],v=[];let d=new Date(start+'T00:00:00Z');const e=new Date(end+'T23:00:00Z');while(d<=e){t.push(d.toISOString().slice(0,16));v.push(fn(t.length-1));d=new Date(d.getTime()+3600e3);}return{t,v};}
async function mock(ctx){
 await ctx.route(/^https?:\/\//,async r=>{
  const u=new URL(r.request().url());
  if(u.host==='ntfy.sh'){
   if(r.request().method()==='POST'){store.push({id:String(store.length),time:Date.now()/1000|0,event:'message',topic:'x',message:r.request().postData()});return r.fulfill({status:200,body:'{}'});}
   if(u.pathname.endsWith('/json'))return r.fulfill({status:200,contentType:'application/x-ndjson',body:store.map(x=>JSON.stringify(x)).join('\n')+'\n'});
   return r.abort();}
  if(/archive-api/.test(u.host)){const lats=u.searchParams.get('latitude').split(','),lons=u.searchParams.get('longitude').split(','),hv=u.searchParams.get('hourly'),s=u.searchParams.get('start_date'),e=u.searchParams.get('end_date');
   const wetDay=s==='2025-08-17'||s==='2026-07-06';
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(lats.map((la,i)=>{const wet=wetDay&&+la>30.6&&+lons[i]<78.9;const h=hourly(s,e,j=>j>=60&&j<90?(wet?9:.3):.05);return{hourly:{time:h.t,[hv]:h.v}};}))});}
  if(u.host==='api.open-meteo.com'&&u.pathname==='/v1/elevation'){const la=u.searchParams.get('latitude').split(',').map(Number);return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({elevation:la.map((a,i)=>500+3000*Math.max(0,a-29.5)+50*Math.sin(i))})});}
  return r.abort();
 });
}
(async()=>{
 const b=await chromium.launch();
 const A=await b.newContext({viewport:{width:420,height:900}}),B=await b.newContext({viewport:{width:420,height:900}});
 await mock(A);await mock(B);
 for(const c of [A,B])await c.addInitScript(()=>{window.__shTest=1;window.__pfAuto=1;window.__fastSleep=true;});
 const errs=[];
 const pa=await A.newPage(),pb=await B.newPage();[pa,pb].forEach(p=>p.on('pageerror',e=>errs.push(String(e))));
 const q='?scn=monsoon&from=delhi&to=kedarnath&tab=reports&tiles=0';
 await pa.goto('file://'+F+q);await pb.goto('file://'+F+q);
 for(const p of [pa,pb])await p.waitForFunction(()=>PP.last&&PP.last.cur);
 // phone A reports a landslide on the first hill stretch it can
 await pa.selectOption('#r-type','landslide');await pa.click('#r-send');await pa.waitForTimeout(300);
 ok(store.length===1,'A posted '+store.length);
 await pb.evaluate(()=>PP.shPoll());await pb.waitForTimeout(900);
 const sh=await pb.evaluate(()=>PP.sharedReports().map(r=>[r.seg,r.type,r.conf]));
 ok(sh.length===1&&sh[0][1]==='landslide','B sees A report '+JSON.stringify(sh));
 const btn=await pb.$('[data-c^="sh_"]');ok(!!btn,'confirm button on B');if(btn)await btn.click();await pb.waitForTimeout(300);
 await pa.evaluate(()=>PP.shPoll());await pa.waitForTimeout(900);
 const mine=await pa.evaluate(()=>PP.st.user.map(r=>r.conf));ok(mine[0]===1,'A sees confirm '+mine);
 const st=await pb.textContent('#sh-st');ok(/1 reports from other phones/.test(st),'status '+st);
 // control room on B lists it
 await pb.click('[data-view="ops"]');const opsTxt=await pb.textContent('#v-ops');ok(/other phone/.test(opsTxt)||/Landslide on road/.test(opsTxt),'ops shows shared report');
 // road profile on A
 await pa.click('[data-t="route"]');await pa.waitForFunction(()=>document.querySelector('#pf svg'),null,{timeout:8000});
 const pf=await pa.textContent('#pf');ok(/Highest point/.test(pf),'profile '+pf.slice(0,80));
 // NASA catalog history (baked in) + tuning on B
 await pb.click('[data-view="proof"]');
 await pb.waitForFunction(()=>/Incident history: 44 of 44/.test(document.getElementById('od-msg')?.textContent||''),null,{timeout:30000});
 const hist=await pb.evaluate(()=>({pts:PP.OD.events.length,src:PP.S['rishikesh-devprayag'].hiSrc,top:Object.entries(PP.OD.hist).sort((a,b)=>b[1].n-a[1].n)[0]}));
 ok(hist.pts>100&&hist.src==='nasa'&&hist.top[1].n>0,'hist '+JSON.stringify(hist));console.log('nasa:',JSON.stringify(hist));
 for(const ev of [0,2]){await pb.selectOption('#pr-ev',String(ev));await pb.selectOption('#pr-src','archive');await pb.click('#pr-run');await pb.waitForFunction(()=>/Done/.test(document.getElementById('pr-msg')?.textContent||''),null,{timeout:20000});}
 const tn=await pb.evaluate(()=>{const d=PP.tuneData();return d&&d.rows.map(r=>[r.k,Math.round(r.hit*100),Math.round((r.fa||0)*100)]);});
 ok(tn&&tn.length===13,'tune rows');console.log('tuning (mock):',JSON.stringify(tn));
 ok(await pb.isVisible('svg.tn'),'tune chart visible');
 ok(errs.length===0,'errors '+errs.join(' | '));
 await pb.screenshot({path:'/tmp/claude-0/-home-claude/2a3aa1e7-b8e0-5c85-a4dd-2b54ce28234a/scratchpad/shots/proof2.png',fullPage:true});
 await pa.screenshot({path:'/tmp/claude-0/-home-claude/2a3aa1e7-b8e0-5c85-a4dd-2b54ce28234a/scratchpad/shots/trip2.png',fullPage:true});
 console.log(fails.length?'FAIL\n'+fails.join('\n'):'all v4.1 checks passed');await b.close();
})();
