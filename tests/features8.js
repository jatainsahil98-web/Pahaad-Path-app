// v10 checks: the app shell. Map behind everything, trip search that slides down, a sheet that snaps and drags,
// floating actions, back button order, kilometre-stone pins, and the side-panel layout on wide screens.
const {chromium}=require('playwright');
const F=process.argv[2];
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
(async()=>{
 const b=await chromium.launch();
 const phone=await b.newContext({viewport:{width:412,height:915},hasTouch:true,isMobile:true});
 await phone.route(/^https?:\/\//,r=>r.abort());
 const p=await phone.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
 await p.goto('file://'+F+'?scn=monsoon&tiles=0&from=dehradun&to=badrinath');
 await p.waitForFunction(()=>PP.last&&PP.last.cur);await p.waitForTimeout(600);
 const h=()=>p.evaluate(()=>Math.round(document.getElementById('v-trip').getBoundingClientRect().height));

 // 1. the map: whole route drawn, start and end as kilometre stones with the place codes
 const map=await p.evaluate(()=>({stones:[...document.querySelectorAll('#bgmap .stone b')].map(x=>x.textContent),
   lines:PP.mapLines('bgmap'),rows:PP.last.cur.rows.length,top:document.elementFromPoint(200,250).closest('#bgmap')!=null}));
 ok(JSON.stringify(map.stones)==='["DEH","BAD"]','stones '+JSON.stringify(map.stones));
 ok(map.lines===map.rows&&map.rows>3&&map.top,'route on the map '+JSON.stringify(map));

 // 2. the sheet snaps: peek < half < full, by keyboard and by dragging the handle
 const half=await h();
 await p.focus('#grab');await p.keyboard.press('ArrowDown');await p.waitForTimeout(600);const peek=await h();
 await p.keyboard.press('ArrowUp');await p.keyboard.press('ArrowUp');await p.waitForTimeout(600);const full=await h();
 ok(peek<half&&half<full,'snaps '+[peek,half,full]);
 const g=await p.locator('#grab').boundingBox();
 await p.mouse.move(g.x+g.width/2,g.y+10);await p.mouse.down();await p.mouse.move(g.x+g.width/2,g.y+500,{steps:8});await p.mouse.up();await p.waitForTimeout(700);
 const dragged=await p.evaluate(()=>document.getElementById('v-trip').dataset.snap);
 ok(dragged==='peek'||dragged==='half','drag down from full '+dragged);
 const fab=await p.evaluate(()=>{const s=document.getElementById('fab-sos').getBoundingClientRect(),t=document.getElementById('v-trip').getBoundingClientRect();return s.bottom<=t.top;});
 ok(fab,'SOS button sits above the sheet');

 // 3. search: opens from the summary, a new destination closes it and redraws the route; back closes it first
 await p.click('#qsum');await p.waitForTimeout(450);
 ok(await p.evaluate(()=>document.body.classList.contains('searching')&&!document.getElementById('scrim').hidden),'search open');
 await p.fill('#in-to','Kedarnath');await p.press('#in-to','Enter');await p.waitForTimeout(700);
 const after=await p.evaluate(()=>({to:PP.st.to,open:document.body.classList.contains('searching'),sum:document.getElementById('qsum').textContent,stones:[...document.querySelectorAll('#bgmap .stone b')].map(x=>x.textContent)}));
 ok(after.to==='kedarnath'&&!after.open&&/Kedarnath/.test(after.sum)&&after.stones[1]==='KED','search applied '+JSON.stringify(after));
 await p.click('#qsum');await p.waitForTimeout(300);
 await p.evaluate(()=>{PP.st.tab='rules';PP.render();});
 const back=await p.evaluate(()=>{const o=[];o.push([PP.back(),document.body.classList.contains('searching')]);
   document.getElementById('grab').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));document.getElementById('grab').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));
   o.push([PP.back(),document.getElementById('v-trip').dataset.snap]);o.push([PP.back(),PP.st.tab]);return o;});
 ok(back[0][0]&&!back[0][1],'back closes search '+JSON.stringify(back));
 ok(back[1][0]&&back[1][1]==='half','back shrinks a full sheet');
 ok(back[2][0]&&back[2][1]==='route','then back to the route tab');

 // 4. floating actions: traffic colours, where am I, SOS
 await p.click('#fab-layer');ok(await p.evaluate(()=>PP.st.layer)==='traffic','layer button');await p.click('#fab-layer');
 await p.click('#fab-sos');ok(await p.isVisible('#sos-call'),'SOS from the map');await p.keyboard.press('Escape');
 await p.click('#fab-where');ok(await p.isVisible('#wh-out'),'where am I from the map');await p.keyboard.press('Escape');

 // 5. settings under the status line; views in the bottom bar, the map only on the trip view
 await p.click('#srcchip');ok(await p.isVisible('#scn'),'forecast settings open');await p.click('#scrim');ok(await p.isHidden('#conds'),'settings close');
 await p.click('#views [data-view="ops"]');await p.waitForTimeout(300);
 ok(await p.isHidden('#bgmap')&&await p.isHidden('#fab-sos')&&await p.isVisible('#v-ops'),'control room hides the map');
 await p.click('#views [data-view="trip"]');await p.waitForTimeout(300);ok(await p.isVisible('#bgmap'),'map back on the trip view');
 // 5b. one section at a time: overview first, then when to leave, then a tab; the key figures stay on top
 await p.goto('file://'+F+'?scn=monsoon&tiles=0&from=delhi&to=kedarnath');await p.waitForFunction(()=>PP.last&&PP.last.cur);
 const sec=async()=>p.evaluate(()=>({sec:document.getElementById('v-trip').dataset.sec,planner:getComputedStyle(document.getElementById('planner')).display,
   routes:getComputedStyle(document.getElementById('over-wrap')).display,panel:getComputedStyle(document.getElementById('panel')).display,k:document.querySelectorAll('#kstats .kt').length}));
 const s0=await sec();ok(s0.sec==='over'&&s0.planner==='none'&&s0.routes!=='none'&&s0.panel==='none'&&s0.k===4,'overview '+JSON.stringify(s0));
 await p.click('#tabs [data-sec="when"]');const s1=await sec();ok(s1.sec==='when'&&s1.planner!=='none'&&s1.routes==='none','when to leave '+JSON.stringify(s1));
 await p.click('#tabs [data-t="rules"]');const s2=await sec();ok(s2.sec==='rules'&&s2.panel!=='none'&&s2.planner==='none','rules '+JSON.stringify(s2));
 ok(await p.evaluate(()=>PP.back()&&PP.st.tab==='route'&&document.getElementById('v-trip').dataset.sec==='over'),'back to overview');
 ok(await p.evaluate(()=>document.body.getAttribute('data-view')===null),'no data-view on body (it would redraw on every tap)');

 ok(!errs.length,'phone page errors '+errs.join(' | '));
 await phone.close();

 // 6. wide screen: search and results in a side panel, map beside it, no handle
 const wide=await b.newContext({viewport:{width:1366,height:820}});await wide.route(/^https?:\/\//,r=>r.abort());
 const w=await wide.newPage();const e2=[];w.on('pageerror',e=>e2.push(String(e)));
 await w.goto('file://'+F+'?scn=monsoon&tiles=0&from=delhi&to=nainital');await w.waitForFunction(()=>PP.last&&PP.last.cur);await w.waitForTimeout(500);
 const lay=await w.evaluate(()=>{const r=id=>document.getElementById(id).getBoundingClientRect();
   return {search:r('search').right,sheet:r('v-trip').right,sheetTop:r('v-trip').top,searchBottom:r('search').bottom,grab:getComputedStyle(document.getElementById('grab')).display,map:r('bgmap').width};});
 ok(lay.search<=520&&lay.sheet<=520&&lay.grab==='none'&&lay.map>1300&&lay.searchBottom<=lay.sheetTop,'side panel '+JSON.stringify(lay));
 ok(!e2.length,'wide page errors '+e2.join(' | '));

 // 7. dark phone setting gives the dark skin
 const dark=await b.newContext({viewport:{width:412,height:915},colorScheme:'dark'});await dark.route(/^https?:\/\//,r=>r.abort());
 const d=await dark.newPage();await d.goto('file://'+F+'?scn=monsoon&tiles=0');await d.waitForFunction(()=>PP.last&&PP.last.cur);
 ok(await d.evaluate(()=>getComputedStyle(document.getElementById('v-trip')).backgroundColor)==='rgb(13, 24, 20)','dark sheet');

 await b.close();
 if(fails.filter(Boolean).length){console.log('FAIL\n'+fails.filter(Boolean).join('\n'));process.exit(1);}
 console.log('all v10 checks passed');
})().catch(e=>{console.error(e);process.exit(1);});
