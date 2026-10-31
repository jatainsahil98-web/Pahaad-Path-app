// v7 checks: PWD road closure report from the data pack, shown on trips through the districts it covers, kept offline, dropped when old.
const {chromium}=require('playwright');
const F=process.argv[2];
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
const style=s=>[/—/,/–/,/\S - \S/,/, (and|or|और|या) /].filter(re=>re.test(s)).map(String);
const istHour=ms=>new Date(Math.floor((ms+5.5*3600e3)/3600e3)*3600e3).toISOString().slice(0,13)+':00';
const istDay=ms=>new Date(ms+5.5*3600e3).toISOString().slice(0,10);
(async()=>{
 const b=await chromium.launch();
 const run=async(closures,check)=>{
  const c2=await b.newContext({viewport:{width:412,height:900}});const q=await c2.newPage();let net=true;const errs=[];q.on('pageerror',e=>errs.push(String(e)));
  await c2.route(/^https?:\/\//,async r=>{const u=new URL(r.request().url());
   if(net&&u.host==='raw.githubusercontent.com'&&u.pathname.endsWith('/pack.json')){
    const keys=await q.evaluate(()=>[...new Set(PP.EDGES.filter(e=>!e.virtual).map(e=>e.cLat.toFixed(2)+','+e.cLon.toFixed(2)))]);
    const hourly={},daily={};keys.forEach(k=>{hourly[k]=new Array(456).fill(0);daily[k]=new Array(47).fill(0);});
    return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({v:1,hour0:istHour(Date.now()),day0:istDay(Date.now()-31*864e5),hourly,daily,closures})});}
   return r.abort();});
  await q.goto('file://'+F+'?tiles=0&from=dehradun&to=badrinath');await q.waitForFunction(()=>window.PP&&PP.st.series);
  await q.evaluate(()=>{PP.st.scn='live';return PP.load();});
  await check(q,()=>{net=false;});
  ok(!errs.length,'page errors '+errs);
  await c2.close();
 };
 // a report of this morning: two roads in Chamoli (one names Joshimath, on the way to Badrinath), one in Pithoragarh (not on the trip)
 const dist={dehradun:'Dehradun',rishikesh:'Dehradun',devprayag:'Tehri',srinagar:'Pauri',rudraprayag:'Rudraprayag',karnaprayag:'Chamoli',chamoli:'Chamoli',joshimath:'Chamoli',govindghat:'Chamoli',badrinath:'Chamoli',pithoragarh:'Pithoragarh'};
 const today=istDay(Date.now()-4*3600e3);
 const rep={date:today,slot:'morning',url:'https://cdnbbsr.s3waas.gov.in/x/r.pdf',total:3,dist,per:{Chamoli:2,Pithoragarh:1},roads:[
  {n:'Jyotirmath Malari motor road',id:1,ag:'BRO',ty:'SH',d:'Chamoli',km:'12',c:today+'T07:10',e:today+'T18:00',near:['joshimath']},
  {n:'Nandprayag Ghat Sutol Kanol motor road',id:2,ag:'PWD',ty:'MDR',d:'Chamoli',km:'1,3',c:today+'T06:42'},
  {n:'Tawaghat Sobla motor road',id:3,ag:'BRO',ty:'SH',d:'Pithoragarh',km:'1',c:today+'T07:10'}]};
 await run(rep,async(q,off)=>{
  const c1=await q.innerText('#closures');
  ok(/Roads reported closed \(PWD Uttarakhand\)/.test(c1)&&/2 roads closed in districts on this trip \(Chamoli 2\)/.test(c1),'closures card: '+c1);
  ok(/Closed roads that name a town on your route/.test(c1)&&/Jyotirmath Malari motor road/.test(c1)&&/expected to open/.test(c1),'named road first: '+c1);
  ok(/Main roads closed in these districts/.test(c1)&&/Nandprayag/.test(c1)&&!/Tawaghat/.test(c1),'other district roads left out: '+c1);
  ok(/Full report \(PDF\)/.test(c1),'link to the report');
  for(const lang of ['en','hi']){await q.click(lang==='en'?'#b-en':'#b-hi');const bad=style(await q.innerText('#closures'));ok(!bad.length,'house style '+lang+' '+bad);}
  ok(/बंद सड़कें/.test(await q.innerText('#closures'))&&/चमोली 2/.test(await q.innerText('#closures')),'hindi card');
  await q.click('#b-en');
  // offline: the saved forecast brings the report back
  off();await q.reload();await q.waitForFunction(()=>window.PP&&PP.st.series);await q.evaluate(()=>{PP.st.scn='live';return PP.load();});
  const c2=await q.evaluate(()=>({src:PP.st.src,txt:document.getElementById('closures').innerText}));
  ok(c2.src==='cache'&&/Jyotirmath/.test(c2.txt),'closures offline '+JSON.stringify(c2));
  // a trip through none of the report's districts shows nothing
  await q.evaluate(()=>{PP.st.from='delhi';PP.st.to='nainital';PP.render();});
  ok(await q.evaluate(()=>document.getElementById('closures').hidden),'no card off the districts');
 });
 // a long report is cut short in the pack, but the counts per district stay whole
 await run(Object.assign({},rep,{per:{Chamoli:40}}),async q=>{
  ok(/40 roads closed in districts on this trip \(Chamoli 40\)/.test(await q.innerText('#closures')),'counts from per');
 });
 // a report from three days ago is not shown
 await run(Object.assign({},rep,{date:istDay(Date.now()-3*864e5)}),async q=>{
  ok(await q.evaluate(()=>document.getElementById('closures').hidden),'old report hidden');
 });
 // no report in the pack (out of season): nothing shown, nothing breaks
 await run(undefined,async q=>{
  ok(await q.evaluate(()=>document.getElementById('closures').hidden&&PP.st.src==='live'),'no report, no card');
 });
 await b.close();
 if(fails.length){console.log('FAIL\n'+fails.join('\n'));process.exit(1);}
 console.log('all v7 checks passed');
})();
