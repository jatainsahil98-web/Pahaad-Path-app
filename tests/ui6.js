// 2.0 Phase 6 checks: offline UX. The status line names how fresh the forecast is (live, saved under 12 h, 12 h to
// 3 days, older) and simulated weather carries a DEMO DATA badge; a bar runs under the top bar during a sync; reports
// waiting for a signal show as a chip with a count; one toast when a send or a sync after reconnecting finishes.
const {chromium}=require('playwright');
const F=process.argv[2];
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
(async()=>{
 const b=await chromium.launch();const c=await b.newContext({viewport:{width:412,height:915}});await c.route(/^https?:\/\//,r=>r.abort());
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
 await p.goto('file://'+F+'?scn=monsoon&from=dehradun&to=badrinath');await p.waitForFunction(()=>PP.last&&PP.last.cur);
 const s0=await p.evaluate(()=>({age:document.getElementById('srcchip').dataset.age,demo:!document.getElementById('demob').hidden,txt:document.getElementById('demob').textContent}));
 ok(s0.age==='demo'&&s0.demo&&s0.txt==='DEMO DATA','simulated weather carries the DEMO DATA badge '+JSON.stringify(s0));
 const ages=await p.evaluate(()=>{const out={};[['fresh',2],['aging',20],['old',100]].forEach(([k,h])=>{PP.st.src='cache';PP.st.cacheMade=Date.now()-h*3600e3;PP.st.cacheTs=PP.st.cacheMade;PP.render();
   out[k]={age:document.getElementById('srcchip').dataset.age,demo:!document.getElementById('demob').hidden,dot:document.getElementById('dot').className};});
   PP.st.src='live';PP.st.made=Date.now()-3600e3;PP.render();out.live={age:document.getElementById('srcchip').dataset.age,dot:document.getElementById('dot').className};return out;});
 ok(ages.fresh.age==='fresh'&&ages.aging.age==='aging'&&ages.old.age==='old'&&ages.live.age==='live'&&!ages.fresh.demo,'freshness states '+JSON.stringify(ages));
 ok(/live/.test(ages.live.dot)&&/old/.test(ages.old.dot),'dot follows the state');
 // sync bar, and one toast for a sync that follows getting the signal back
 const sy=await p.evaluate(async()=>{const bar=()=>!document.getElementById('syncbar').hidden;window.dispatchEvent(new Event('online'));
   window.dispatchEvent(new CustomEvent('pp:sync',{detail:{phase:'start',source:'pack'}}));const on=bar();
   window.dispatchEvent(new CustomEvent('pp:sync',{detail:{phase:'done',made:Date.now(),source:'pack'}}));
   const t=document.getElementById('toast');return {on,off:!bar(),toast:!t.hidden&&t.textContent};});
 ok(sy.on&&sy.off&&/Forecast updated/.test(sy.toast||''),'sync bar and its toast '+JSON.stringify(sy));
 // outbox chip, sending, one toast when done
 const ob=await p.evaluate(async()=>{const ev=d=>window.dispatchEvent(new CustomEvent('pp:outbox',{detail:d})),chip=()=>{const x=document.getElementById('obchip');return x.hidden?'':x.textContent;};
   document.getElementById('toast').hidden=true;
   ev({waiting:2,sending:false,sent:0,total:0});const w=chip();
   ev({waiting:2,sending:true,sent:0,total:2});const s=chip();
   ev({waiting:0,sending:false,sent:2,total:2});const t=document.getElementById('toast'),t1=!t.hidden&&t.textContent;
   t.hidden=true;ev({waiting:0,sending:false,sent:2,total:2});const again=!t.hidden;
   return {w,s,gone:chip()==='',t1,again};});
 ok(/^2.*2 reports waiting/.test(ob.w)&&/Sending reports: 1 of 2/.test(ob.s)&&ob.gone,'outbox chip '+JSON.stringify(ob));
 ok(/2 reports sent/.test(ob.t1||'')&&!ob.again,'one toast when the send ends '+JSON.stringify(ob));
 // Hindi
 await p.click('#b-hi');await p.waitForTimeout(300);
 const hi=await p.evaluate(()=>{window.dispatchEvent(new CustomEvent('pp:outbox',{detail:{waiting:1,sending:false,sent:0,total:0}}));PP.st.src='sim';PP.render();
   const ch=document.getElementById('obchip').getBoundingClientRect();return {chip:document.getElementById('obchip').textContent,demo:document.getElementById('demob').textContent,right:ch.right};});
 ok(/सिग्नल/.test(hi.chip)&&hi.demo==='डेमो डेटा'&&hi.right<=412,'Hindi chip and badge '+JSON.stringify(hi));
 await p.screenshot({path:'/tmp/ui6_hi.png'});
 ok(!errs.length,'page errors '+errs.join(' | '));
 await b.close();
 if(fails.length){console.log('FAIL\n'+fails.join('\n'));process.exit(1);}
 console.log('all 2.0 phase 6 checks passed');
})().catch(e=>{console.error(e);process.exit(1);});
