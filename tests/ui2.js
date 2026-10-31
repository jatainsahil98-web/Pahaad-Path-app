// 2.0 Phase 2 checks: the trip map runs on MapLibre (WebGL) from the single file with no network, draws every stretch
// of the route with the kilometre stones, hazard spots and GSI dots, switches to the traffic gradient, opens the stretch
// popup on a tap, fits the route above the sheet, and falls back to the Leaflet map when WebGL is missing.
const {chromium}=require('playwright');
const F=process.argv[2];
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
(async()=>{
 const run=async(args,w,h,q)=>{
   const b=await chromium.launch({args:args||[]});const c=await b.newContext({viewport:{width:w,height:h}});
   const hosts=new Set();await c.route(/^https?:\/\//,r=>{hosts.add(new URL(r.request().url()).host);r.abort();});
   const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
   await p.goto('file://'+F+'?scn=monsoon&tiles=0&from=dehradun&to=badrinath'+(q||''));
   await p.waitForFunction(()=>window.PP&&PP.last&&PP.last.cur);
   return {b,p,errs,hosts};
 };

 // 1. phone: MapLibre draws the route
 const A=await run([],412,915);
 await A.p.waitForFunction(()=>PP.glMap&&PP.glMap()&&PP.glMap().loaded()&&PP.mapLines('bgmap')>0,null,{timeout:15000});await A.p.waitForTimeout(1500);
 const m=await A.p.evaluate(()=>{const map=PP.glMap(),q=l=>map.queryRenderedFeatures({layers:[l]}).length;
   const el=document.getElementById('bgmap').getBoundingClientRect();
   return {gl:!!document.querySelector('#bgmap canvas.maplibregl-canvas'),leaflet:!!document.querySelector('#bgmap.leaflet-container'),lines:PP.mapLines('bgmap'),rows:PP.last.cur.rows.length,
     drawn:q('route-line'),spots:q('spots'),stones:[...document.querySelectorAll('#bgmap .stone b')].map(x=>x.textContent),h:el.height,vh:innerHeight,
     layers:map.getStyle().layers.length,zoom:map.getZoom()};});
 ok(m.gl&&!m.leaflet,'MapLibre canvas, no Leaflet '+JSON.stringify(m));
 ok(m.lines===m.rows&&m.rows>3&&m.drawn>0,'every stretch on the map '+JSON.stringify(m));
 ok(JSON.stringify(m.stones)==='["DEH","BAD"]','stones '+JSON.stringify(m.stones));
 ok(m.spots>0,'hazard spots drawn');
 ok(m.h>=m.vh-1,'map fills the screen behind everything '+JSON.stringify(m));
 ok(m.layers<=26,'layer budget '+m.layers); // built-in base map; Phase 3 added 3 card-map layers, Phase 5 the glow, ring, hazard tape and pillars
 // the route sits above the sheet: its bounds project into the visible map area
 const fit=await A.p.evaluate(()=>{const map=PP.glMap(),sh=document.getElementById('v-trip').getBoundingClientRect().top,top=document.querySelector('.topbar').getBoundingClientRect().bottom;
   const pts=PP.last.cur.rows.flatMap(r=>[r.seg]).length;const st=document.querySelectorAll('#bgmap .stone');
   return [...st].map(s=>{const r=s.getBoundingClientRect();return {t:r.top,b:r.bottom,l:r.left,r:r.right};}).concat([{sh,top,vw:innerWidth}]);});
 const lim=fit.pop();ok(fit.every(r=>r.t>=lim.top-2&&r.b<=lim.sh+2&&r.l>=0&&r.r<=lim.vw),'stones between top bar and sheet '+JSON.stringify(fit)+' '+JSON.stringify(lim));
 // a tap on a stretch opens its popup (the same text as before)
 const pt=await A.p.evaluate(()=>{const map=PP.glMap(),f=map.queryRenderedFeatures({layers:['route-line']}).find(x=>!x.properties.plain)||map.queryRenderedFeatures({layers:['route-line']})[0];
   const c=f.geometry.coordinates,mid=Array.isArray(c[0][0])?c[0][Math.floor(c[0].length/2)]:c[Math.floor(c.length/2)],p=map.project(mid),r=map.getCanvas().getBoundingClientRect();return {x:r.left+p.x,y:r.top+p.y};});
 await A.p.mouse.click(pt.x,pt.y);await A.p.waitForTimeout(400);
 const pop=await A.p.evaluate(()=>{const e=document.querySelector('.maplibregl-popup-content');return e?e.textContent:'';});
 ok(/→/.test(pop)&&/km/.test(pop),'stretch popup '+pop.slice(0,120));
 // traffic: the gradient line shows, the risk line hides; and back
 await A.p.click('#fab-layer');await A.p.waitForTimeout(500);
 const tr=await A.p.evaluate(()=>{const map=PP.glMap();return {trf:map.getLayoutProperty('route-trf','visibility'),risk:map.getLayoutProperty('route-line','visibility'),grad:JSON.stringify(map.getPaintProperty('route-trf','line-gradient')||'').slice(0,80),n:map.queryRenderedFeatures({layers:['route-trf']}).length};});
 ok(tr.trf==='visible'&&tr.risk==='none'&&/line-progress/.test(tr.grad)&&tr.n>0,'traffic gradient '+JSON.stringify(tr));
 await A.p.click('#fab-layer');await A.p.waitForTimeout(300);
 ok(await A.p.evaluate(()=>PP.glMap().getLayoutProperty('route-line','visibility'))==='visible','back to risk colours');
 // a new trip replaces the data without a new map
 const before=await A.p.evaluate(()=>{window.__m=PP.glMap();return PP.mapLines('bgmap');});
 await A.p.evaluate(()=>{PP.setTrip?PP.setTrip('delhi','nainital'):null;});
 await A.p.goto('file://'+F+'?scn=monsoon&tiles=0&from=delhi&to=nainital');await A.p.waitForFunction(()=>window.PP&&PP.last&&PP.last.cur&&PP.glMap&&PP.glMap());await A.p.waitForTimeout(800);
 ok(await A.p.evaluate(()=>PP.mapLines('bgmap')===PP.last.cur.rows.length),'second trip drawn');
 ok(![...A.hosts].some(h=>/tile|openstreetmap|protomaps|maptiler|mapbox|carto/.test(h)),'no tile server asked: '+[...A.hosts].join(','));
 ok(!A.errs.length,'page errors '+A.errs.join(' | '));
 await A.b.close();

 // 2. wide screen: same map beside the panel
 const W=await run([],1280,800);
 await W.p.waitForFunction(()=>PP.glMap&&PP.glMap()&&PP.glMap().loaded()&&PP.mapLines('bgmap')>0,null,{timeout:15000});await W.p.waitForTimeout(1200);
 const wl=await W.p.evaluate(()=>{const panel=document.getElementById('v-trip').getBoundingClientRect().right;return [...document.querySelectorAll('#bgmap .stone')].map(s=>s.getBoundingClientRect().left>=panel-2);});
 ok(wl.length===2&&wl.every(Boolean),'wide: stones right of the panel '+JSON.stringify(wl));
 ok(!W.errs.length,'wide page errors '+W.errs.join(' | '));
 await W.b.close();

 // tablet portrait: the whole route sits between the top bar and the sheet once the map has loaded
 const T=await run([],800,1280);
 await T.p.waitForFunction(()=>PP.glMap&&PP.glMap()&&PP.glMap().loaded()&&PP.mapLines('bgmap')>0,null,{timeout:15000});await T.p.waitForTimeout(1500);
 const tp=await T.p.evaluate(()=>{const m=PP.glMap();const ys=[];m.querySourceFeatures('route').forEach(f=>{const c=f.geometry.coordinates;(Array.isArray(c[0][0])?c.flat():c).forEach(q=>ys.push(m.project(q).y));});
   return {min:Math.min(...ys),max:Math.max(...ys),top:document.querySelector('.topbar').getBoundingClientRect().bottom,sheet:document.getElementById('v-trip').getBoundingClientRect().top};});
 ok(tp.min>=tp.top&&tp.max<=tp.sheet,'portrait: route above the sheet '+JSON.stringify(tp));
 await T.b.close();

 // 3. no WebGL: the Leaflet map as before
 const N=await run(['--disable-webgl','--disable-3d-apis'],412,915);
 await N.p.waitForTimeout(800);
 const n=await N.p.evaluate(()=>({leaflet:!!document.querySelector('#bgmap.leaflet-container'),gl:!!document.querySelector('#bgmap canvas.maplibregl-canvas'),lines:PP.mapLines('bgmap'),rows:PP.last.cur.rows.length,stones:document.querySelectorAll('#bgmap .stone').length}));
 ok(n.leaflet&&!n.gl&&n.lines===n.rows&&n.stones===2,'Leaflet fallback '+JSON.stringify(n));
 ok(!N.errs.length,'fallback page errors '+N.errs.join(' | '));
 await N.b.close();
 // and a link can ask for the simple map
 const G=await run([],412,915,'&gl=0');await G.p.waitForTimeout(600);
 ok(await G.p.evaluate(()=>!!document.querySelector('#bgmap.leaflet-container')),'?gl=0 gives the Leaflet map');
 await G.b.close();

 if(fails.length){console.log('FAIL\n'+fails.join('\n'));process.exit(1);}
 console.log('all 2.0 phase 2 checks passed');
})().catch(e=>{console.error(e);process.exit(1);});
