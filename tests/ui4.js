// 2.0 Phase 4 checks: the offline map files. A small local web server plays the web site (dist/site plus the
// tiles/tiles.json manifest and two test PMTiles archives made here: a synthetic terrain file and an empty
// OpenStreetMap file), with Range support like GitHub Pages. A second run plays the APK layout (kind xyz: z/x/y folders). The map must find both, draw the OSM layers and the hillshade, tilt into 3D terrain and back, save
// both files for offline, and keep using them from that saved copy when the site stops serving them. No map or font
// server is asked. Opened from a file there is no tiles/ folder, so the built-in base map stays.
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path'),zlib=require('zlib');
const F=process.argv[2],SITE=path.join(path.dirname(F),'site');
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};

/* ---- tiny PNG and PMTiles v3 writers (test data only) ---- */
const CRC=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return b=>{let c=~0;for(const x of b)c=t[(c^x)&255]^(c>>>8);return (~c)>>>0;};})();
function png(w,h,px){ // px(x,y) -> [r,g,b]
  const raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++){raw[y*(w*3+1)]=0;for(let x=0;x<w;x++){const [r,g,b]=px(x,y),i=y*(w*3+1)+1+x*3;raw[i]=r;raw[i+1]=g;raw[i+2]=b;}}
  const chunk=(type,data)=>{const l=Buffer.alloc(4);l.writeUInt32BE(data.length);const td=Buffer.concat([Buffer.from(type),data]);const c=Buffer.alloc(4);c.writeUInt32BE(CRC(td));return Buffer.concat([l,td,c]);};
  const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
const varint=n=>{const o=[];while(n>=128){o.push((n%128)|128);n=Math.floor(n/128);}o.push(n);return o;};
function pmtiles(tiles,{type,minZoom,maxZoom,meta},zxy){ // tiles: [{z,x,y,data}]
  const ents=tiles.map(t=>({id:zxy(t.z,t.x,t.y),data:t.data})).sort((a,b)=>a.id-b.id);
  let off=0;ents.forEach(e=>{e.off=off;e.len=e.data.length;off+=e.len;});
  const d=[...varint(ents.length)];let last=0;ents.forEach(e=>{d.push(...varint(e.id-last));last=e.id;});
  ents.forEach(()=>d.push(...varint(1)));ents.forEach(e=>d.push(...varint(e.len)));
  ents.forEach((e,i)=>d.push(...varint(i>0&&e.off===ents[i-1].off+ents[i-1].len?0:e.off+1)));
  const dir=Buffer.from(d),md=Buffer.from(JSON.stringify(meta||{})),data=Buffer.concat(ents.map(e=>e.data));
  const H=Buffer.alloc(127);H.write('PMTiles',0);H[7]=3;
  const u64=(v,o)=>H.writeBigUInt64LE(BigInt(v),o);
  u64(127,8);u64(dir.length,16);u64(127+dir.length,24);u64(md.length,32);u64(0,40);u64(0,48);
  u64(127+dir.length+md.length,56);u64(data.length,64);u64(ents.length,72);u64(ents.length,80);u64(ents.length,88);
  H[96]=1;H[97]=1;H[98]=1;H[99]=type;H[100]=minZoom;H[101]=maxZoom;
  H.writeInt32LE(77e7,102);H.writeInt32LE(284e6,106);H.writeInt32LE(811e6,110);H.writeInt32LE(315e6,114);H[118]=8;H.writeInt32LE(79e7,119);H.writeInt32LE(30e7,123);
  return Buffer.concat([H,dir,md,data]);
}

(async()=>{
 const {zxyToTileId}=await import('pmtiles');
 // terrain: a ridge of hills (Terrarium: height = R*256 + G + B/256 - 32768), z5 to z7 over the state
 const tiles=[];
 const lon2x=(lon,z)=>Math.floor((lon+180)/360*2**z),lat2y=(lat,z)=>Math.floor((1-Math.log(Math.tan(lat*Math.PI/180)+1/Math.cos(lat*Math.PI/180))/Math.PI)/2*2**z);
 for(let z=5;z<=7;z++)for(let x=lon2x(77,z);x<=lon2x(81.1,z);x++)for(let y=lat2y(31.5,z);y<=lat2y(28.4,z);y++)
   tiles.push({z,x,y,data:png(64,64,(i,j)=>{const gx=(x*64+i)/(64*2**z),gy=(y*64+j)/(64*2**z);const h=Math.max(0,3000+2500*Math.sin(gx*900)*Math.cos(gy*700))+32768;return [Math.floor(h/256),Math.floor(h)%256,0];})});
 const DEM=pmtiles(tiles,{type:2,minZoom:5,maxZoom:7},zxyToTileId);
 const OSM=pmtiles([],{type:1,minZoom:0,maxZoom:13,meta:{vector_layers:[{id:'earth'},{id:'water'},{id:'roads'}]}},zxyToTileId);
 let serveTiles=true,tileHits=0,kind='pmtiles';
 const manifest=k=>{const pm=k==='pmtiles',B=[76.6,28.3,81.2,31.5];return {basemap:{url:pm?'tiles/basemap.pmtiles':'tiles/basemap/{z}/{x}/{y}.pbf',kind:k,minzoom:0,maxzoom:14,bounds:B,attribution:'© OpenStreetMap contributors'},
   terrain:{url:pm?'tiles/terrain.pmtiles':'tiles/terrain/{z}/{x}/{y}.png',kind:k,encoding:'terrarium',minzoom:5,maxzoom:7,bounds:B,attribution:'Copernicus DEM GLO-90 © ESA/DLR'},built:'2026-10-31'};};
 const srv=http.createServer((req,res)=>{
   const u=decodeURIComponent(req.url.split('?')[0]);
   if(u.startsWith('/tiles/')){
     tileHits++;
     if(u==='/tiles/tiles.json'){if(!serveTiles){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify(manifest(kind)));}
     if(kind==='xyz'){const m=/^\/tiles\/terrain\/(\d+)\/(\d+)\/(\d+)\.png$/.exec(u),tl=m&&tiles.find(t=>t.z==m[1]&&t.x==m[2]&&t.y==m[3]);
       if(!tl){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':'image/png'});return res.end(tl.data);}
     const buf=u==='/tiles/terrain.pmtiles'?DEM:u==='/tiles/basemap.pmtiles'?OSM:null;
     if(!buf||!serveTiles){res.writeHead(404);return res.end();}
     const m=/bytes=(\d+)-(\d*)/.exec(req.headers.range||'');
     if(!m){res.writeHead(200,{'Content-Length':buf.length,'Accept-Ranges':'bytes'});return res.end(buf);}
     const a=+m[1],b=m[2]?Math.min(+m[2],buf.length-1):buf.length-1;
     res.writeHead(206,{'Content-Range':`bytes ${a}-${b}/${buf.length}`,'Content-Length':b-a+1,'Accept-Ranges':'bytes'});return res.end(buf.subarray(a,b+1));
   }
   const f=path.join(SITE,u==='/'?'index.html':u);
   if(!f.startsWith(SITE)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end();}
   res.writeHead(200,{'Content-Type':/\.js$/.test(f)?'text/javascript':/\.html$/.test(f)?'text/html':'application/octet-stream'});res.end(fs.readFileSync(f));
 });
 await new Promise(r=>srv.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+srv.address().port+'/';

 const b=await chromium.launch();const c=await b.newContext({viewport:{width:412,height:915}});
 const hosts=new Set();await c.route(/^https?:\/\//,r=>{const h=new URL(r.request().url()).host;if(h.startsWith('127.0.0.1'))return r.continue();hosts.add(h);r.abort();});
 const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
 const q='?scn=monsoon&from=dehradun&to=badrinath';
 const open=async()=>{await p.goto(base+q);await p.waitForFunction(()=>window.PP&&PP.last&&PP.last.cur&&PP.glMap&&PP.glMap()&&(PP.glMap().getStyle()||{sources:{}}).sources.dem&&PP.glMap().loaded(),null,{timeout:20000});await p.waitForTimeout(800);};
 await open();
 const s=await p.evaluate(()=>{const m=PP.glMap(),st=m.getStyle();return {pm:!!st.sources.pm,dem:!!st.sources.dem,hill:!!m.getLayer('hillshade'),osm:st.layers.filter(l=>l.source==='pm').length,
   brivers:m.getLayoutProperty('b-rivers','visibility'),lines:PP.mapLines('bgmap'),rows:PP.last.cur.rows.length,b3:!document.getElementById('fab-3d').hidden,bs:!document.getElementById('fab-save').hidden,
   attrib:(document.querySelector('#bgmap .maplibregl-ctrl-attrib')||{}).textContent||''};});
 ok(s.pm&&s.dem&&s.hill&&s.osm>20,'OSM layers and hillshade from the offline files '+JSON.stringify(s));
 ok(s.brivers==='none','built-in rivers hidden under the OSM ones');
 ok(s.lines===s.rows,'route still drawn over the new base map');
 ok(s.b3&&s.bs,'3D and save buttons shown '+JSON.stringify(s));
 ok(/OpenStreetMap/.test(s.attrib),'OpenStreetMap credited');
 // 3D terrain and back
 await p.click('#fab-3d');await p.waitForTimeout(1500);
 const d3=await p.evaluate(()=>{const m=PP.glMap();return {pitch:m.getPitch(),terrain:!!m.getTerrain(),on:document.getElementById('fab-3d').classList.contains('on')};});
 ok(d3.pitch>40&&d3.terrain&&d3.on,'3D terrain on '+JSON.stringify(d3));
 await p.screenshot({path:'/tmp/ui4_3d.png'});
 await p.click('#fab-3d');await p.waitForTimeout(1500);
 const d2=await p.evaluate(()=>{const m=PP.glMap();return {pitch:m.getPitch(),terrain:!!m.getTerrain()};});
 ok(d2.pitch<1&&!d2.terrain,'flat again '+JSON.stringify(d2));
 // save for offline (needs the service worker in control)
 await p.waitForFunction(()=>navigator.serviceWorker&&navigator.serviceWorker.controller,null,{timeout:15000}).catch(()=>{});
 if(!await p.evaluate(()=>!!navigator.serviceWorker.controller)){await open();}
 await p.click('#fab-save');
 await p.waitForFunction(()=>!document.getElementById('toast').hidden&&/saved/i.test(document.getElementById('toast').textContent),null,{timeout:20000});
 ok(await p.evaluate(async()=>{const c=await caches.open('pp-tiles');return (await c.keys()).length===3;}),'both files and the manifest saved');
 ok(await p.evaluate(()=>document.getElementById('fab-save').hidden),'save button gone once saved');
 // the site stops serving the files: the saved copy answers
 serveTiles=false;tileHits=0;
 await open();
 const off=await p.evaluate(()=>({pm:!!PP.glMap().getStyle().sources.pm,hill:!!PP.glMap().getLayer('hillshade')}));
 ok(off.pm&&off.hill,'saved copy used when the site has no files '+JSON.stringify(off)+' hits '+tileHits);
 await p.waitForTimeout(1500);
 ok(await p.evaluate(()=>PP.glMap().loaded()),'map finishes loading from the saved copy');
 ok(!errs.length,'page errors '+errs.join(' | '));
 ok(![...hosts].some(h=>/tile|openstreetmap|protomaps|maptiler|mapbox|carto|amazonaws|fonts\./.test(h)),'no map or font server asked: '+[...hosts].join(','));
 await b.close();

 // the APK layout: z/x/y folders, no save button (the app carries them)
 kind='xyz';serveTiles=true;
 const b3=await chromium.launch();const c3=await b3.newContext({viewport:{width:412,height:915},serviceWorkers:'block'});
 await c3.route(/^https?:\/\//,r=>new URL(r.request().url()).host.startsWith('127.0.0.1')?r.continue():r.abort());
 const p3=await c3.newPage();const e3=[];p3.on('pageerror',e=>e3.push(String(e)));
 await p3.addInitScript(()=>{window.PPAndroid={};}); // what the Android wrapper adds
 await p3.goto(base+q);
 await p3.waitForFunction(()=>window.PP&&PP.glMap&&PP.glMap()&&(PP.glMap().getStyle()||{sources:{}}).sources.dem&&PP.glMap().loaded(),null,{timeout:20000});
 await p3.click('#fab-3d');await p3.waitForTimeout(1800);
 const x=await p3.evaluate(()=>{const m=PP.glMap(),st=m.getStyle();return {tiles:(st.sources.dem.tiles||[])[0]||'',terrain:!!m.getTerrain(),save:document.getElementById('fab-save').hidden};});
 ok(/\/tiles\/terrain\/\{z\}\/\{x\}\/\{y\}\.png$/.test(x.tiles)&&x.terrain&&x.save,'APK folders drive the terrain, no save button '+JSON.stringify(x));
 ok(!e3.filter(e=>!/PPAndroid/.test(e)).length,'APK layout page errors '+e3.join(' | '));
 await b3.close();srv.close();

 // a copy opened from a file: no tiles folder, built-in map
 const b2=await chromium.launch();const p2=await b2.newPage({viewport:{width:412,height:915}});
 await p2.goto('file://'+F+q);await p2.waitForFunction(()=>PP.glMap&&PP.glMap()&&PP.glMap().loaded(),null,{timeout:20000});await p2.waitForTimeout(500);
 const fl=await p2.evaluate(()=>({pm:!!PP.glMap().getStyle().sources.pm,b3:!document.getElementById('fab-3d').hidden}));
 ok(!fl.pm&&!fl.b3,'file copy keeps the built-in map '+JSON.stringify(fl));
 await b2.close();

 if(fails.length){console.log('FAIL\n'+fails.join('\n'));process.exit(1);}
 console.log('all 2.0 phase 4 checks passed');
})().catch(e=>{console.error(e);process.exit(1);});
