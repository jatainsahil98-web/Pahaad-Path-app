const open=require('./open.js');
const file=process.argv[2];
(async()=>{
 const out={};
 for(const scn of ['monsoon','clear']){
  const {browser,page,errs}=await open(file,'?scn='+scn);
  const r=await page.evaluate(()=>{
   const P=window.PP,st=P.st,fails=[];let plans=0,slots=0,trips=0;
   let seed=12345;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
   const ids=Object.keys(P.N);
   const today=P.dayOf(st.nowMs);
   // 1. connectivity over all road towns (foot-only shrines excluded)
   const towns=ids.filter(i=>!P.N[i].foot);let pairs=0,conn=0;
   const c0=P.ctx();
   for(let i=0;i<towns.length;i++)for(let j=i+1;j<towns.length;j++){pairs++;if(P.routeSearch(towns[i],towns[j],8,c0,{n:'fast'}))conn++;else fails.push('noconn '+towns[i]+' '+towns[j]);}
   // 2. random trips through the same compute() the screen uses
   for(let n=0;n<240;n++){
    let a=ids[Math.floor(rnd()*ids.length)],b=ids[Math.floor(rnd()*ids.length)];
    if(a===b){n--;continue;}
    st.from=a;st.to=b;st.dateIdx=today+Math.floor(rnd()*15);st.dep=rnd()<.5?null:Math.floor(rnd()*24);st.pick=null;
    st.tday=['cal','normal','weekend','leve','lstart','lend'][Math.floor(rnd()*6)];
    let M;try{M=P.compute();}catch(e){fails.push('throw '+a+'>'+b+' '+e);continue;}
    if(M.trip.err){if(M.trip.err!=='footonly')fails.push('trip err '+a+'>'+b+' '+M.trip.err);continue;}
    trips++;
    const tag=a+'>'+b+' d'+(st.dateIdx-today)+' '+st.tday+' dep'+st.dep;
    if(!M.plans||!M.plans.length){fails.push('noplan '+tag);continue;}
    plans+=M.plans.length;
    if(M.plans.filter(p=>p.rec).length!==1)fails.push('rec!=1 '+tag);
    M.plans.forEach(p=>{
     if(!(p.rows.length===p.path.length))fails.push('rows '+tag);
     if(!(p.score>=0&&p.score<=100))fails.push('score '+tag);
     if(!isFinite(p.elapsed)||p.elapsed<p.totalH-1e-6)fails.push('elapsed '+tag);
     if(p.totalH<p.normH-1e-6)fails.push('faster than free flow '+tag);
     p.halts.forEach(h=>{if(h.resume-h.arr<6-1e-6)fails.push('rest<6h '+tag);});
     for(let i=1;i<p.rows.length;i++)if(p.rows[i].start<p.rows[i-1].end-1e-6)fails.push('overlap '+tag);
     if(p.level!==P.lvl(p.score))fails.push('level '+tag);
    });
    if(M.slots.length!==24)fails.push('slots '+tag);
    slots+=M.slots.length;
    M.slots.forEach(s=>{if(!isFinite(s.elapsed)||s.elapsed<=0)fails.push('slot time '+tag);});
    if(M.bw&&(M.bw.pick<M.bw.a||M.bw.pick>M.bw.b))fails.push('bw pick '+tag);
    // a recommended departure that the app shows must not drive hill roads in the dark
    if(M.bw&&M.slots[M.bw.pick].nightKm>0)fails.push('bw night '+tag);
    if(!Array.isArray(M.rules))fails.push('rules '+tag);
   }
   return {pairs,conn,trips,plans,slots,fails:fails.slice(0,40),nfail:fails.length};
  });
  r.pageErrors=errs;out[scn]=r;await browser.close();
 }
 console.log(JSON.stringify(out,null,1));
})();
