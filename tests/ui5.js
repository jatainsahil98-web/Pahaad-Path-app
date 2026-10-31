// 2.0 Phase 5 checks: motion and map emphasis. The route has a glow and Avoid stretches carry hazard tape; tapping a
// stretch in the list flies the map to it and rings it; town pillars (fuel and hospitals mapped within 3 km) wait for
// 3D; the map shimmers only until it is drawn; with reduced motion the buttons do not animate.
const {chromium}=require('playwright');
const F=process.argv[2];
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
(async()=>{
 const b=await chromium.launch();
 const open=async(opts)=>{const c=await b.newContext(Object.assign({viewport:{width:412,height:915}},opts||{}));await c.route(/^https?:\/\//,r=>r.abort());
   const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
   await p.goto('file://'+F+'?scn=monsoon&from=delhi&to=kedarnath');
   await p.waitForFunction(()=>window.PP&&PP.last&&PP.last.cur&&PP.glMap&&PP.glMap()&&PP.glMap().loaded()&&PP.mapLines('bgmap')>0,null,{timeout:20000});
   await p.waitForTimeout(1200);return {c,p,errs};};
 const {p,errs}=await open();
 const a=await p.evaluate(async()=>{const m=PP.glMap(),d=await m.getSource('route').getData(),pl=await m.getSource('pillars').getData();
   return {halo:!!m.getLayer('route-halo'),hazard:!!m.getLayer('route-hazard'),stripe:m.hasImage('pp-stripe'),avd:d.features.filter(f=>f.properties.lvl===2&&!f.properties.plain).length,
     pillars:pl.features.length,kinds:[...new Set(pl.features.map(f=>f.properties.kind))].join(','),pvis:m.getLayoutProperty('pillars','visibility'),ready:document.getElementById('bgmap').classList.contains('pp-ready')};});
 ok(a.halo&&a.hazard&&a.stripe,'glow and hazard tape layers '+JSON.stringify(a));
 ok(a.pillars>0&&a.pvis==='none','pillars made, hidden until 3D '+JSON.stringify(a));
 ok(a.ready,'shimmer ends once the map is drawn');
 // the stretch list: tap one, the map flies there and rings it
 await p.evaluate(()=>{const b=[...document.querySelectorAll('#v-trip button')].find(x=>/Stretches/.test(x.textContent));if(b)b.click();});
 await p.waitForTimeout(500);
 const n=await p.evaluate(()=>document.querySelectorAll('#v-trip .seg:not(.ft)').length);
 ok(n>2,'stretch list shown '+n);
 if(n>2){
   const z0=await p.evaluate(()=>PP.glMap().getZoom());
   await p.evaluate(()=>document.querySelectorAll('#v-trip .seg:not(.ft)')[2].scrollIntoView());
   await p.click('#v-trip .seg:not(.ft) >> nth=2');await p.waitForTimeout(1800);
   const f=await p.evaluate(async()=>{const m=PP.glMap(),sel=await m.getSource('sel').getData(),r=PP.last.cur.rows[2],c=m.getCenter(),g=sel.features[0];
     let w=180,s=90,e=-180,n=-90;(g?g.geometry.coordinates:[]).forEach(([x,y])=>{w=Math.min(w,x);e=Math.max(e,x);s=Math.min(s,y);n=Math.max(n,y);});
     return {n:sel.features.length,id:g&&g.properties.id,want:r.seg.id,zoom:m.getZoom(),inView:m.getBounds().contains([(w+e)/2,(s+n)/2]),picked:document.querySelectorAll('#v-trip .seg.picked').length};});
   ok(f.n===1&&f.id===f.want&&f.inView&&f.picked===1,'list tap rings the stretch and brings it into view '+JSON.stringify(f));
   ok(f.zoom>z0,'and zooms in '+JSON.stringify({z0,z:f.zoom}));
 }
 await p.screenshot({path:'/tmp/ui5_pick.png'});
 ok(!errs.length,'page errors '+errs.join(' | '));
 // reduced motion: no button animation
 const R=await open({reducedMotion:'reduce'});
 const rm=await R.p.evaluate(()=>{const f=document.querySelector('#fab-layer');const cs=getComputedStyle(f);return {anim:cs.animationName,tr:cs.transitionDuration};});
 ok(rm.anim==='none'&&/^0s/.test(rm.tr),'reduced motion: buttons still '+JSON.stringify(rm));
 ok(!R.errs.length,'reduced motion page errors '+R.errs.join(' | '));
 await b.close();
 if(fails.length){console.log('FAIL\n'+fails.join('\n'));process.exit(1);}
 console.log('all 2.0 phase 5 checks passed');
})().catch(e=>{console.error(e);process.exit(1);});
