// v11 checks: Phase 2. Saved trips are handed to the Android background check with their hill stretches, the engine
// uses Caine unless fitted thresholds were adopted, and the Proof tab shows the season backtest.
const {chromium}=require('playwright');
const F=process.argv[2];
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:1280,height:800}});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 await ctx.addInitScript(()=>{window.__watch=[];window.PPAndroid={setWatch:(j,l)=>window.__watch.push([JSON.parse(j),l]),info:()=>'{}'};});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
 await p.goto('file://'+F+'?scn=monsoon&tiles=0&from=dehradun&to=badrinath');
 await p.waitForFunction(()=>PP.last&&PP.last.cur);await p.waitForTimeout(400);

 // 1. engine: no adopted thresholds in this build, so every stretch uses Caine (1980)
 const eng=await p.evaluate(()=>{const e=PP.EDGES.find(x=>!x.plain);const f=PP.edThr(e);return [f(6),f(24),f(72)].map((v,i)=>Math.abs(v-PP.CAINE([6,24,72][i]))<1e-9);});
 ok(eng.every(Boolean),'Caine when nothing adopted '+eng);

 // 2. saving a trip hands it to the background check with the hill stretches of the chosen road
 await p.evaluate(()=>document.getElementById('a-save').click());await p.waitForTimeout(300);
 const w=await p.evaluate(()=>({calls:window.__watch,hill:PP.last.sel.path.filter(l=>!l.e.plain).map(l=>l.e.id)}));
 const last=w.calls[w.calls.length-1];
 ok(last&&last[0].length===1,'one watched trip '+JSON.stringify(last));
 if(last&&last[0][0]){const x=last[0][0];
   ok(JSON.stringify(x.links)===JSON.stringify(w.hill)&&x.links.length>2,'watched stretches '+JSON.stringify(x.links));
   ok(/Dehradun/.test(x.title)&&/Badrinath/.test(x.title)&&x.hi&&x.until>Date.now(),'watch title and end '+JSON.stringify(x));
   ok(last[1]==='en','language passed');}
 const n=w.calls.length;await p.evaluate(()=>PP.render());await p.waitForTimeout(200);
 ok(await p.evaluate(n=>window.__watch.length===n,n),'no repeat call when nothing changed');
 await p.evaluate(()=>document.getElementById('a-save').click());await p.waitForTimeout(200); // saving again keeps one
 ok(await p.evaluate(()=>{const c=window.__watch;return c[c.length-1][0].length===1;}),'still one watched trip');

 // 3. Proof tab: the backtest card
 await p.evaluate(()=>document.querySelector('[data-view="proof"]').click());await p.waitForTimeout(400);
 const pr=await p.evaluate(()=>document.getElementById('v-proof').textContent);
 ok(/Checked against every PWD closure/.test(pr),'backtest card on Proof');

 // 4. Proof in three sections; replay keeps its map when opened
 for(const k of ['replay','method','season']){await p.evaluate(k=>document.querySelector('[data-psec="'+k+'"]').click(),k);await p.waitForTimeout(250);
   const vis=await p.evaluate(()=>[...document.querySelectorAll('[data-psec-body]')].filter(x=>!x.hidden).map(x=>x.dataset.psecBody));
   ok(JSON.stringify(vis)===JSON.stringify([k]),'proof section '+k+' '+vis);}
 // 5. GSI: every hill stretch carries the GSI rating, and mapped landslides are found along a hill route
 const g=await p.evaluate(()=>({n:PP.EDGES.filter(e=>!e.plain&&!e.virtual&&e.gsi&&e.gsi.cls).length,hill:PP.EDGES.filter(e=>!e.plain&&!e.virtual).length,near:(PP.gsiNear(PP.last.cur.rows)||[]).length}));
 ok(g.n===g.hill&&g.near>50,'GSI data '+JSON.stringify(g));
 // 6. model v6 risk from the data pack: the route's worst stretch for the next 24 h, only on live forecasts
 await p.evaluate(()=>document.querySelector('[data-view="trip"]').click());await p.waitForTimeout(300);
 const v6=await p.evaluate(()=>{const by={};PP.EDGES.forEach(e=>{if(!e.plain)by[e.id]=[10,0,0];});const id=PP.last.cur.rows.find(r=>!r.seg.plain).seg.id;by[id]=[71,2,6];
   PP.st.r24={by,model:'v6: test'};const src=PP.st.src;PP.render();const off=document.getElementById('v6line').hidden;
   PP.st.src='live';PP.render();const el=document.getElementById('v6line');const out={off,on:!el.hidden,txt:el.innerText};PP.st.src=src;PP.st.r24=null;PP.render();return out;});
 ok(v6.off&&v6.on&&/Avoid 71/.test(v6.txt),'v6 line '+JSON.stringify(v6));
 ok(!errs.length,'page errors '+errs.join(' | '));
 await b.close();
 if(fails.length){console.error('FAIL\n'+fails.join('\n'));process.exit(1);}
 console.log('all v11 checks passed');
})().catch(e=>{console.error(e);process.exit(1);});
