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

 // 1. engine: Caine (1980) unless the backtest adopted fitted thresholds (data/model/thresholds.json), then the stretch's zone curve
 const fs=require('fs'),path=require('path');let TH=null;try{TH=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','model','thresholds.json'),'utf8')).adopted;}catch(e){}
 let V6ON=false;try{V6ON=!!JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','model','model_v6.json'),'utf8')).adopted;}catch(e){}
 if(V6ON)TH=null; // v6 plans the trip; the rain-threshold fallback stays on Caine
 const eng=await p.evaluate(()=>PP.EDGES.filter(x=>!x.plain&&!x.virtual).map(e=>{const f=PP.edThr(e);return{susc:e.susc,v:[6,24,72].map(d=>f(d)),c:[6,24,72].map(d=>PP.CAINE(d))};}));
 const want=(x,d)=>{if(!TH)return x.c[[6,24,72].indexOf(d)];const z=(TH.zones&&TH.zones[String(x.susc)])||TH.pooled;return z.alpha*Math.pow(d,z.gamma);};
 ok(eng.every(x=>[6,24,72].every((d,i)=>Math.abs(x.v[i]-want(x,d))<1e-6*Math.max(1,want(x,d)))),'engine thresholds match '+(TH?'the adopted fit':'Caine'));

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
 await p.evaluate(()=>{PP.st.view='proof';PP.render();});await p.waitForTimeout(400);
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
 // 7. trip screen plans with model v6 day scores when the data pack carries them (live forecasts only)
 const t6=await p.evaluate(()=>{const S=PP.st,keep={src:S.src,v6:S.v6};const d=new Date(Date.now()+5.5*3600e3).toISOString().slice(0,10);
   const by={};PP.EDGES.forEach(e=>{if(!e.plain&&!e.virtual)by[e.id]=[12,12,12,12,12,12,12,12];});
   // the last stretch into the destination, which every route must use (a high score on an earlier stretch can now send
   // the trip by the Kotdwar road instead, which is right but would take that stretch off the route)
   const id=PP.last.cur.rows.filter(r=>!r.seg.plain&&!r.seg.virtual).pop().seg.id;by[id]=[88,88,88,88,88,88,88,88];
   S.v6={by,day0:d,model:'v6: test'};S.src='live';PP.render();
   const rows=PP.last.cur.rows.filter(r=>!r.seg.plain&&!r.seg.virtual).map(r=>[r.seg.id,r.score]);const why=document.getElementById('verdict').innerText;
   S.src=keep.src;S.v6=keep.v6;PP.render();return{rows,id,why};});
 const hit=t6.rows.find(r=>r[0]===t6.id),rest=t6.rows.filter(r=>r[0]!==t6.id);
 ok(hit&&hit[1]>=88&&rest.every(r=>r[1]>=12&&r[1]<35),'v6 drives the trip scores '+JSON.stringify(t6.rows.slice(0,5)));
 ok(/checked against PWD closures/.test(t6.why),'verdict says v6 set the score');
 // 8. Control room: model v6 column for today, labelled on trial when it is not in use
 const oc=await p.evaluate(()=>{const S=PP.st,keep={src:S.src,v6:S.v6,v6t:S.v6t,view:S.view};const d=new Date(Date.now()+5.5*3600e3).toISOString().slice(0,10);
   const by={};PP.EDGES.forEach(e=>{if(!e.plain&&!e.virtual)by[e.id]=[70,10,10,10,10,10,10,10];});
   S.v6=null;S.v6t={by,day0:d,model:'v6: test'};S.src='live';S.view='ops';PP.render();
   const h=document.querySelector('#v-ops .v6h'),cells=[...document.querySelectorAll('#v-ops .gc.v6')].map(x=>x.textContent);
   const out={title:h&&h.title,n:cells.length,first:cells[0]};S.src=keep.src;S.v6=keep.v6;S.v6t=keep.v6t;S.view=keep.view;PP.render();return out;});
 ok(oc.n>=40&&oc.first==='70'&&/trial/.test(oc.title||''),'Control room v6 column '+JSON.stringify(oc));
 // 9. Transport (v2) replaces Proof in the bottom bar: services for the trip, official booking links only
 const tr=await p.evaluate(()=>{PP.st.view='trip';PP.render();const nav=[...document.querySelectorAll('#views button')].map(b=>b.dataset.view);
   document.querySelector('[data-view="transport"]').click();
   const el=document.getElementById('v-transport');return{nav,vis:el&&!el.hidden,h:[...el.querySelectorAll('h3')].map(x=>x.textContent),
     links:[...el.querySelectorAll('a')].map(a=>new URL(a.href).host)};});
 ok(JSON.stringify(tr.nav)==='["trip","ops","transport"]','bottom bar '+JSON.stringify(tr.nav));
 ok(tr.vis&&tr.h.some(x=>/Train to/.test(x))&&tr.h.some(x=>/Roadways/.test(x))&&tr.h.some(x=>/How to choose/.test(x)),'transport cards '+JSON.stringify(tr.h));
 ok(tr.links.length>=3&&tr.links.every(h=>/(irctc\.co\.in|uk\.gov\.in|gmou\.org|redbus\.in)$/.test(h)),'transport links '+JSON.stringify(tr.links));
 await p.evaluate(()=>{PP.st.view='trip';PP.render();});
 ok(!errs.length,'page errors '+errs.join(' | '));
 await b.close();
 if(fails.length){console.error('FAIL\n'+fails.join('\n'));process.exit(1);}
 console.log('all v11 checks passed');
})().catch(e=>{console.error(e);process.exit(1);});
