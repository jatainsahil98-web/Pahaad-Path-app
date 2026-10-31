// 2.0 Phase 3 checks: the control room and proof maps run on MapLibre from the single file with no network. The control
// room draws every hill stretch, the hour slider recolours them without a rebuild, a tap on a grid row flies to that
// stretch and opens its popup; the proof map draws the replay with a cross on each closed road; dark mode repaints;
// no map asks a tile server; without WebGL both maps fall back to Leaflet.
const {chromium}=require('playwright');
const F=process.argv[2];
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
(async()=>{
 const run=async(args,w,h,q)=>{
   const b=await chromium.launch({args:args||[]});const c=await b.newContext({viewport:{width:w,height:h}});
   const hosts=new Set();await c.route(/^https?:\/\//,r=>{hosts.add(new URL(r.request().url()).host);r.abort();});
   const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
   await p.goto('file://'+F+'?scn=monsoon'+(q||''));
   await p.waitForFunction(()=>window.PP&&PP.st.series);
   return {b,p,errs,hosts};
 };
 const loaded=id=>`PP.glMaps&&PP.glMaps('${id}')&&PP.glMaps('${id}').map.loaded()`;

 // 1. control room, tablet landscape
 const A=await run([],1280,800,'&view=ops');
 await A.p.waitForFunction(loaded('omap'),null,{timeout:15000});await A.p.waitForTimeout(800);
 const a=await A.p.evaluate(async()=>{const gl=PP.glMaps('omap'),d=await gl.map.getSource('route').getData(),D=PP.opsData(),h=PP.st.opsH|0;
   const want=D.rows.map(r=>PP.lvl(r.sc[h])).join(''),got=d.features.map(f=>f.properties.lvl).join('');
   const r=document.querySelector('#omap').getBoundingClientRect();
   return {canvas:!!document.querySelector('#omap canvas.maplibregl-canvas'),leaflet:!!document.querySelector('#omap.leaflet-container'),lines:PP.mapLines('omap'),rows:D.rows.length,match:want===got,h:r.height,w:r.width,
     towns:(await gl.map.getSource('towns').getData()).features.length};});
 ok(a.canvas&&!a.leaflet,'control room map is MapLibre '+JSON.stringify(a));
 ok(a.lines>40&&a.lines===a.rows,'every hill stretch drawn '+JSON.stringify(a));
 ok(a.match,'line colours follow the hour');
 ok(a.h>300&&a.w>300&&a.towns>5,'map size and towns '+JSON.stringify(a));
 // slider: a later hour recolours the same map
 const s=await A.p.evaluate(async()=>{const gl=PP.glMaps('omap'),m0=gl.map,D=PP.opsData();
   let h=0;for(let k=1;k<72;k++){if(D.rows.some(r=>PP.lvl(r.sc[k])!==PP.lvl(r.sc[0]))){h=k;break;}}
   const el=document.querySelector('#ops-h');el.value=h;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
   await new Promise(r=>setTimeout(r,300));
   const d=await PP.glMaps('omap').map.getSource('route').getData();
   return {h,st:PP.st.opsH,same:PP.glMaps('omap').map===m0,match:D.rows.map(r=>PP.lvl(r.sc[h])).join('')===d.features.map(f=>f.properties.lvl).join('')};});
 ok(s.st===s.h&&s.same&&s.match,'slider recolours without a rebuild '+JSON.stringify(s));
 // a grid row flies to its stretch and opens the popup
 const z0=await A.p.evaluate(()=>PP.glMaps('omap').map.getZoom());
 const id=await A.p.evaluate(()=>PP.opsData().rows[0].e.id);
 await A.p.click('[data-oz="'+id+'"]');await A.p.waitForTimeout(1400);
 const z=await A.p.evaluate(()=>({zoom:PP.glMaps('omap').map.getZoom(),pop:(document.querySelector('#omap .maplibregl-popup')||{}).textContent||''}));
 ok(z.zoom>z0+.5&&/\/100/.test(z.pop),'grid row zooms and opens the popup '+JSON.stringify({z0,z}));
 // dark mode repaints without errors
 await A.p.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));await A.p.waitForTimeout(1200);
 ok(await A.p.evaluate(()=>PP.glMaps('omap').map.loaded()&&PP.mapLines('omap')>40),'dark mode keeps the lines');
 await A.p.screenshot({path:'/tmp/ui3_ops.png'});
 ok(!A.errs.length,'control room page errors '+A.errs.join(' | '));
 ok(![...A.hosts].some(h=>/tile|openstreetmap|protomaps|maptiler|mapbox|carto/.test(h)),'no tile server asked: '+[...A.hosts].join(','));
 await A.b.close();

 // 2. proof replay map, phone
 const P=await run([],412,915,'&view=proof&psec=all');
 await P.p.waitForFunction(loaded('pmap'),null,{timeout:15000});await P.p.waitForTimeout(600);
 const pr=await P.p.evaluate(async()=>{const gl=PP.glMaps('pmap');
   return {lines:PP.mapLines('pmap'),cross:(await gl.map.getSource('cross').getData()).features.length,canvas:!!document.querySelector('#pmap canvas.maplibregl-canvas')};});
 ok(pr.canvas&&pr.lines>10&&pr.cross>0,'proof map with closures '+JSON.stringify(pr));
 ok(!P.errs.length,'proof page errors '+P.errs.join(' | '));
 await P.b.close();

 // 3. no WebGL: Leaflet draws both
 const N=await run(['--disable-webgl','--disable-3d-apis'],1280,800,'&view=ops');
 await N.p.waitForFunction(()=>PP.mapLines('omap')>40,null,{timeout:15000});
 ok(await N.p.evaluate(()=>!!document.querySelector('#omap.leaflet-container')),'control room falls back to Leaflet');
 ok(!N.errs.length,'fallback page errors '+N.errs.join(' | '));
 await N.b.close();

 if(fails.length){console.log('FAIL\n'+fails.join('\n'));process.exit(1);}
 console.log('all 2.0 phase 3 checks passed');
})().catch(e=>{console.error(e);process.exit(1);});
