// Opens each view offline, reports page errors, saves screenshots.
const {chromium}=require('playwright');
const F=process.argv[2],OUT=process.argv[3]||'/tmp/claude-0/-home-claude/2a3aa1e7-b8e0-5c85-a4dd-2b54ce28234a/scratchpad/shots';
require('fs').mkdirSync(OUT,{recursive:true});
(async()=>{
 const b=await chromium.launch();
 const cases=[['trip','?from=delhi&to=kedarnath&tiles=0',390],['map','?from=delhi&to=kedarnath&tab=map&tiles=0',390],['safety','?from=delhi&to=kedarnath&tab=safety',390],
  ['ops','?view=ops&tiles=0',1280],['proof','?view=proof&tiles=0',1280],['ops_hi','?view=ops&lang=hi&tiles=0',1280],['map_hi','?lang=hi&from=delhi&to=nainital&tab=map&tiles=0',390]];
 for(const [n,qs,w] of cases){
  const p=await b.newPage({viewport:{width:w,height:900}});
  const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text());});
  await p.route(/^https?:\/\//,r=>r.abort());
  await p.goto('file://'+F+qs);await p.waitForFunction(()=>window.PP&&PP.st.series);await p.waitForTimeout(400);
  await p.screenshot({path:OUT+'/'+n+'.png',fullPage:true});
  console.log(n,errs.length?errs.slice(0,5).join(' | '):'ok');await p.close();
 }
 await b.close();
})();
