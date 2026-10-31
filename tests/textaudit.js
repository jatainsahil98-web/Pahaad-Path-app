// House style audit of every rendered screen: no em or en dashes, no spaced hyphens, no comma before and/or in lists.
const open=require('./open.js');
(async()=>{
 const res=[];let n=0;
 const qs=[];
 for(const lang of ['en','hi']){
  for(const scn of ['monsoon','clear'])for(const tab of ['route','map','reports','rules','safety'])for(const to of ['mussoorie','kedarnath','gangotri','nainital'])qs.push(`?lang=${lang}&scn=${scn}&tab=${tab}&from=delhi&to=${to}&tiles=0`);
  for(const view of ['ops','proof'])for(const scn of ['monsoon','clear'])qs.push(`?lang=${lang}&view=${view}&scn=${scn}&tiles=0`);
 }
 for(const q of qs){
  const {browser,page}=await open(process.argv[2],q);n++;
  const txt=await page.evaluate(()=>{let s=document.body.innerText;document.querySelectorAll('[placeholder],[aria-label],[title]').forEach(e=>{s+='\n'+(e.getAttribute('placeholder')||'')+'\n'+(e.getAttribute('aria-label')||'')+'\n'+(e.getAttribute('title')||'');});
    const T=window.PP;return s;});
  const hits=[];
  for(const [k,re] of [['em',/—/g],['en',/–/g],['spaced-hyphen',/\S - \S/g],['oxford',/, (and|or|और|या) /g]]){const m=txt.match(re);if(m)hits.push(k+':'+m.length+' '+JSON.stringify(m.slice(0,3)));}
  if(hits.length)res.push(q+': '+hits.join('; '));
  await browser.close();
 }
 console.log(res.length?res.join('\n'):'clean: '+n+' screens');
})();
