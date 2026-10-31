// v9 checks against a real report API (server/): two phones, signed reports, a report made offline, an official clearing it.
const {chromium}=require('playwright');
const {spawn,execFileSync}=require('child_process');
const fs=require('fs'),os=require('os'),path=require('path'),http=require('http');
const F=process.argv[2];
const ROOT=path.resolve(__dirname,'..');
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
const PORT=18000+Math.floor(Math.random()*1000);
const API='http://127.0.0.1:'+PORT;
const get=u=>new Promise((res,rej)=>http.get(API+u,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{res(JSON.parse(d));}catch(e){rej(e);}});}).on('error',rej));
const post=(u,h)=>new Promise((res,rej)=>{const r=http.request(API+u,{method:'POST',headers:h||{}},x=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>res({code:x.statusCode,body:d}));});r.on('error',rej);r.end();});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(f,ms=15000)=>{const t0=Date.now();for(;;){const v=await f();if(v)return v;if(Date.now()-t0>ms)return null;await sleep(200);}};
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ppapi-'));const db='sqlite:///'+path.join(dir,'r.sqlite3');
 const env=Object.assign({},process.env,{PYTHONPATH:path.join(ROOT,'python')+path.delimiter+path.join(ROOT,'server'),PP_DATABASE_URL:db,PP_ALLOW_ORIGINS:'null'});
 execFileSync('python3',['-m','pahaadpath_api','add-officer','--name','SDRF Rudraprayag','--role','district_officer','--db',db],{env,cwd:ROOT});
 const tok=execFileSync('python3',['-m','pahaadpath_api','add-officer','--name','Traffic Police','--role','district_officer','--db',db],{env,cwd:ROOT}).toString().trim();
 const srv=spawn('python3',['-m','uvicorn','pahaadpath_api.main:app','--host','127.0.0.1','--port',String(PORT),'--log-level','warning'],{env,cwd:ROOT,stdio:['ignore','inherit','inherit']});
 try{
  for(let i=0;i<60;i++){try{await get('/health');break;}catch(e){await sleep(250);}}
  const b=await chromium.launch();
  const phone=async name=>{
   const c=await b.newContext({viewport:{width:412,height:900}});
   await c.addInitScript(()=>{window.__shTest=true;});
   await c.route(/^https?:\/\//,r=>{const u=new URL(r.request().url());return u.host==='127.0.0.1:'+PORT?r.continue():r.abort();});
   const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(name+': '+e));p.ctx=c;
   await p.goto('file://'+F+'?scn=monsoon&tiles=0&from=rishikesh&to=badrinath&tab=reports&api='+encodeURIComponent(API));
   await p.waitForFunction(()=>PP.last&&PP.last.cur);return p;
  };
  const A=await phone('A'),B=await phone('B');

  // A reports a landslide; the server stores it only because A's signature checks out
  await A.selectOption('#r-loc',{index:1});await A.selectOption('#r-type','landslide');await A.click('#r-send');
  await until(async()=>(await get('/v1/reports')).msgs.length>0);
  let v=await get('/v1/reports');
  ok(v.msgs.length===1&&v.msgs[0].v===2&&v.msgs[0].dev.length===43&&!v.msgs[0].sig,'server holds one signed report '+JSON.stringify(v.msgs));
  const rid=v.msgs[0].rid,seg=v.msgs[0].seg;
  ok(v.status[seg]&&v.status[seg].blocked===false,'one phone does not block a stretch');
  const keyOk=await A.evaluate(()=>indexedDB.databases?indexedDB.databases().then(d=>d.some(x=>x.name==='pahaadpath')):true);
  ok(keyOk,'device key kept in IndexedDB');

  // B sees it as a shared report and confirms it: two devices, so the server marks the stretch blocked
  await B.evaluate(()=>PP.shPoll());
  await B.waitForFunction(r=>PP.sharedReports().some(x=>x.rid===r),rid,{timeout:10000});
  ok(/Report server connected/.test(await B.evaluate(()=>{PP.render();return document.getElementById('sh-st').textContent;})),'status names the report server');
  await B.evaluate(r=>{PP.render();const x=PP.sharedReports().find(y=>y.rid===r);document.querySelector('[data-c="'+x.id+'"]').click();},rid);
  await until(async()=>(await get('/v1/reports')).msgs.some(m=>m.k==='confirm'));
  v=await get('/v1/reports');ok(v.status[seg].blocked===true,'two phones block the stretch');

  // A, with no signal, reports again; the signed report waits and goes out when the signal returns
  await A.ctx.setOffline(true);
  await A.evaluate(()=>{PP.st.tab='reports';PP.render();});
  await A.selectOption('#r-loc',{index:2});await A.selectOption('#r-type','debris');await A.click('#r-send');
  const queued=await until(()=>A.evaluate(()=>{const o=JSON.parse(localStorage.getItem('pp_outbox')||'[]');return o.length?o:null;}))||[];
  ok(queued.length===1&&queued[0].sig&&queued[0].v===2,'offline report signed and queued');
  await sleep(1500);await A.ctx.setOffline(false);await A.evaluate(()=>window.dispatchEvent(new Event('online')));
  await until(async()=>(await get('/v1/reports')).msgs.filter(m=>m.k==='report').length===2);
  v=await get('/v1/reports');ok(v.msgs.filter(m=>m.k==='report').length===2,'queued report arrived');

  // a forged message (B's text with A's device id) is refused by the server and never reaches phones
  const r=await A.evaluate(async api=>{
   const res=await fetch(api+'/v1/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({msgs:[{v:2,k:'report',rid:'forged',dev:'A'.repeat(43),rt:Date.now(),seg:'rishikesh-devprayag',spot:-1,type:'bridge',sig:'x'.repeat(86)}]})});return res.json();},API);
  ok(r.rejected&&r.rejected.forged==='unknown device','forged report refused '+JSON.stringify(r.rejected));

  // an official clears A's first report: phones drop it from the risk
  const cl=await post('/v1/reports/'+rid+'/verify?ok=false',{Authorization:'Bearer '+tok});ok(cl.code===200,'official clear '+cl.code);
  await B.evaluate(()=>PP.shPoll());
  await B.waitForFunction(r=>!PP.sharedReports().some(x=>x.rid===r),rid,{timeout:10000});
  v=await get('/v1/reports');ok(v.status[seg].blocked===false&&v.status[seg].cleared===true,'cleared on the server');

  [A,B].forEach(p=>ok(!p.errs.length,'page errors '+p.errs.join(' | ')));
  await b.close();
 }finally{srv.kill();}
 if(fails.length){console.log('FAIL\n'+fails.join('\n'));process.exit(1);}
 console.log('all v9 checks passed');
})().catch(e=>{console.error(e);process.exit(1);});
