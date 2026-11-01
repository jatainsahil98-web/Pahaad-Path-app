// "Why" line: every Caution or Avoid stretch says in plain words why it has its colour (rain against its slide trigger,
// wet ground, slope, mapped landslides, road reports), in English and Hindi, in the stretch list and the map popup.
// It explains the score and must never change it.
const {chromium}=require('playwright');
const F=process.argv[2];
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
(async()=>{
 const b=await chromium.launch();
 const open=async(q,w,h)=>{
   const c=await b.newContext({viewport:{width:w||412,height:h||915}});await c.route(/^https?:\/\//,r=>r.abort());
   const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
   await p.goto('file://'+F+'?tiles=0&from=dehradun&to=badrinath&'+q);
   await p.waitForFunction(()=>window.PP&&PP.last&&PP.last.cur&&PP.why);
   return {p,errs};
 };

 // 1. heavy-rain demo, English: risky stretches carry reasons, safe ones a calm reason, plains none
 const A=await open('scn=monsoon');
 const a=await A.p.evaluate(()=>{const lv=s=>s<35?0:s<65?1:2;
   return PP.last.cur.rows.map(r=>({plain:!!r.seg.plain,l:lv(r.score),score:r.score,why:PP.why(r)}));});
 const risky=a.filter(r=>!r.plain&&r.l>=1);
 ok(risky.length>0,'the monsoon demo has Caution or Avoid stretches '+JSON.stringify(a.map(r=>r.l)));
 ok(risky.every(r=>r.why.length>=1&&r.why.length<=3),'each risky stretch has 1 to 3 reasons '+JSON.stringify(risky));
 ok(risky.some(r=>r.why.some(w=>/rain/i.test(w))),'rain is named as a reason on a heavy-rain day '+JSON.stringify(risky.map(r=>r.why)));
 ok(a.filter(r=>r.plain).every(r=>r.why.length===0),'plains stretches give no reason');
 ok(a.every(r=>r.why.every(w=>!/undefined|NaN|\{/.test(w))),'no unfilled text '+JSON.stringify(a.map(r=>r.why)));
 // the stretch list shows it for risky stretches only
 const list=await A.p.evaluate(()=>[...document.querySelectorAll('#panel .seg:not(.ft)')].map(s=>({risk:!!s.querySelector('.pill.rk.l1,.pill.rk.l2'),why:(s.querySelector('.why')||{}).textContent||''})));
 ok(list.length>0&&list.filter(x=>x.risk).every(x=>/^Why:/.test(x.why)),'risky rows in the list show "Why:" '+JSON.stringify(list).slice(0,400));
 ok(list.filter(x=>!x.risk).every(x=>!x.why),'green and plains rows stay uncluttered');
 // the score is unchanged by the explanation: same scores before and after asking why
 const again=await A.p.evaluate(()=>PP.last.cur.rows.map(r=>r.score));
 ok(JSON.stringify(again)===JSON.stringify(a.map(r=>r.score)),'scores unchanged');
 // the map popup carries the line
 await A.p.waitForFunction(()=>PP.glMap&&PP.glMap()&&PP.glMap().loaded()&&PP.mapLines('bgmap')>0,null,{timeout:15000});await A.p.waitForTimeout(1500);
 const pt=await A.p.evaluate(()=>{const map=PP.glMap(),fs=map.queryRenderedFeatures({layers:['route-line']}).filter(x=>!x.properties.plain&&x.properties.lvl>=1);
   const f=fs[0];if(!f)return null;const c=f.geometry.coordinates,mid=Array.isArray(c[0][0])?c[0][Math.floor(c[0].length/2)]:c[Math.floor(c.length/2)],p=map.project(mid),r=map.getCanvas().getBoundingClientRect();return {x:r.left+p.x,y:r.top+p.y};});
 ok(!!pt,'a risky stretch is on the map');
 if(pt){await A.p.mouse.click(pt.x,pt.y);await A.p.waitForTimeout(400);
   const pop=await A.p.evaluate(()=>{const e=document.querySelector('.maplibregl-popup-content .why');return e?e.textContent:'';});
   ok(/^Why:/.test(pop),'popup shows the why line '+pop);}
 ok(!A.errs.length,'no page errors (monsoon) '+A.errs.join(' | '));

 // 2. Hindi
 const H=await open('scn=monsoon&lang=hi');
 const h=await H.p.evaluate(()=>{const lv=s=>s<35?0:s<65?1:2;return PP.last.cur.rows.filter(r=>!r.seg.plain&&lv(r.score)>=1).map(r=>PP.why(r));});
 ok(h.length&&h.every(w=>w.length&&w.every(x=>/[ऀ-ॿ]/.test(x))),'Hindi reasons are in Hindi '+JSON.stringify(h));
 const hl=await H.p.evaluate(()=>((document.querySelector('#panel .seg:not(.ft) .why')||{}).textContent||''));
 ok(/^क्यों:/.test(hl),'Hindi list line starts "क्यों:" '+hl);
 ok(!H.errs.length,'no page errors (Hindi) '+H.errs.join(' | '));

 // 3. clear days: no rain reasons, and green stretches stay calm
 const C=await open('scn=clear');
 const c=await C.p.evaluate(()=>PP.last.cur.rows.filter(r=>!r.seg.plain).map(r=>PP.why(r)));
 ok(c.every(w=>!w.some(x=>/Heavy rain|slide trigger/.test(x))),'no heavy-rain reason on clear days '+JSON.stringify(c));
 ok(!C.errs.length,'no page errors (clear) '+C.errs.join(' | '));

 await b.close();
 if(fails.length){console.error(fails.join('\n'));process.exit(1);}
 console.log('all why-line checks passed');
})().catch(e=>{console.error(e);process.exit(1);});
