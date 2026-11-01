// Routes inside Uttarakhand stay on the foothills road: Dehradun, Haridwar or Roorkee to Kotdwar, Ramnagar, Haldwani or
// Nainital go by Haridwar, Najibabad and Kashipur (NH 34 and NH 734), not round through Meerut, Ghaziabad and Moradabad.
const {chromium}=require('playwright');
const F=process.argv[2];
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
(async()=>{
 const b=await chromium.launch();const c=await b.newContext();await c.route(/^https?:\/\//,r=>r.abort());const p=await c.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(String(e)));
 await p.goto('file://'+F+'?tiles=0&scn=clear&from=dehradun&to=nainital');
 await p.waitForFunction(()=>window.PP&&PP.last&&PP.last.cur);
 const r=await p.evaluate(()=>{
   const OUT=new Set(['delhi','gurugram','noida','ghaziabad','meerut','muzaffarnagar','moradabad','bareilly','chandigarh','rampur']);
   const path=(a,z)=>{const ps=PP.routePlans(a,z,0,PP.ctx());if(!ps.length)return null;const p=ps[0];
     return {nodes:[a,...p.rows.map(r=>r.rev?r.seg.a:r.seg.b)],km:Math.round(p.rows.reduce((s,r)=>s+r.seg.km,0))};};
   const trips={};[['dehradun','nainital'],['haridwar','haldwani'],['roorkee','kotdwar'],['rishikesh','almora'],['nainital','dehradun']].forEach(([a,z])=>{trips[a+'>'+z]=path(a,z);});
   // every pair of Uttarakhand towns reachable by road
   const UK=Object.keys(PP.N).filter(id=>!OUT.has(id)&&!['saharanpur','paonta','najibabad','mohand'].includes(id)&&!PP.N[id].foot);
   const out=[];let n=0;
   for(const a of UK)for(const z of UK){if(a===z)continue;const q=path(a,z);if(!q)continue;n++;if(q.nodes.some(x=>OUT.has(x)))out.push(a+'>'+z+': '+q.nodes.join(' '));}
   return {trips,n,out,OUT:[...OUT]};});
 const via=(t,x)=>t&&t.nodes.includes(x);
 const dn=r.trips['dehradun>nainital'];
 ok(dn&&dn.km<400&&via(dn,'najibabad')&&via(dn,'kashipur')&&!dn.nodes.some(x=>r.OUT.includes(x)),'Dehradun to Nainital by the foothills road '+JSON.stringify(dn));
 const rk=r.trips['roorkee>kotdwar'];ok(rk&&rk.km<150&&via(rk,'najibabad'),'Roorkee to Kotdwar '+JSON.stringify(rk));
 const hh=r.trips['haridwar>haldwani'];ok(hh&&hh.km<300&&!hh.nodes.some(x=>r.OUT.includes(x)),'Haridwar to Haldwani '+JSON.stringify(hh));
 const nd=r.trips['nainital>dehradun'];ok(nd&&nd.km<400&&!nd.nodes.some(x=>r.OUT.includes(x)),'and back '+JSON.stringify(nd));
 ok(r.n>1500,'pairs checked '+r.n);
 ok(r.out.length===0,'no trip inside Uttarakhand goes through Delhi NCR, Meerut or Moradabad: '+r.out.length+' do, e.g. '+r.out.slice(0,3).join(' | '));
 ok(!errs.length,'no page errors '+errs.join(' | '));
 await b.close();
 if(fails.length){console.error(fails.join('\n'));process.exit(1);}
 console.log('all route checks passed ('+r.n+' Uttarakhand pairs)');
})().catch(e=>{console.error(e);process.exit(1);});
