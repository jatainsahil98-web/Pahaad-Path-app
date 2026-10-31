// 2.0 Phase 1 checks: the fonts are bundled (no request to a font server), the four faces load, Hindi gets its type rules,
// wide screens get one side rail on every view with the trip panel beside it, phones keep the bottom bar, and text
// contrast on the trip view passes WCAG AA (axe-core) in light and dark, English and Hindi.
const {chromium}=require('playwright');
const fs=require('fs');
const F=process.argv[2];
const AXE=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
(async()=>{
 const b=await chromium.launch();
 const open=async(w,h,q,opt)=>{
   const c=await b.newContext(Object.assign({viewport:{width:w,height:h}},opt||{}));const hosts=new Set();
   await c.route(/^https?:\/\//,r=>{hosts.add(new URL(r.request().url()).host);r.abort();});
   const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
   await p.goto('file://'+F+'?scn=monsoon&tiles=0&from=dehradun&to=badrinath'+(q||''));
   await p.waitForFunction(()=>window.PP&&PP.last&&PP.last.cur);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);
   return {c,p,hosts,errs};
 };

 // 1. fonts: bundled, loaded, no font server asked
 const A=await open(1280,800,'&lang=hi');
 const f=await A.p.evaluate(async()=>{
   await Promise.all(['800 16px Archivo','16px "Noto Sans"','16px "Noto Sans Devanagari"','400 13px "JetBrains Mono"'].map(s=>document.fonts.load(s,s.includes('Devanagari')?'चलें':'Go')));
   const st={};document.fonts.forEach(x=>{st[x.family.replace(/"/g,'')+' '+x.weight]=x.status;});
   const css=[...document.querySelectorAll('link[href],style')].map(n=>n.href||'').join(' ');
   return {st,css,lang:document.documentElement.lang,lh:getComputedStyle(document.body).lineHeight,fs:getComputedStyle(document.body).fontSize};
 });
 ['Archivo 100 900','Noto Sans 100 900','Noto Sans Devanagari 100 900','JetBrains Mono 400','JetBrains Mono 500'].forEach(k=>ok(f.st[k],'font face missing: '+k+' '+JSON.stringify(f.st)));
 ['Archivo 100 900','Noto Sans Devanagari 100 900'].forEach(k=>ok(f.st[k]==='loaded','font not loaded: '+k+' '+f.st[k]));
 ok(!/fonts\.(googleapis|gstatic)/.test(f.css),'link to a font server left in the page');
 ok(![...A.hosts].some(h=>/font/.test(h)),'asked a font server: '+[...A.hosts].join(','));
 ok(f.lang==='hi'&&parseFloat(f.lh)/parseFloat(f.fs)>=1.59,'Hindi line height '+JSON.stringify(f));

 // 2. wide: one rail on the left on every view, trip panel beside it, map behind the rest
 for(const v of ['trip','ops','proof']){
   if(v!=='trip'){await A.p.click('#views [data-view="'+v+'"]');await A.p.waitForTimeout(300);}
   const r=await A.p.evaluate(()=>{const g=id=>document.getElementById(id).getBoundingClientRect();
     const n=g('views'),s=g('v-trip'),t=document.querySelector('.topbar').getBoundingClientRect(),bt=[...document.querySelectorAll('#views button')].map(x=>x.getBoundingClientRect());
     return {nl:n.left,nw:n.width,nh:n.height,vh:innerHeight,sl:s.left,sr:s.right,tl:t.left,col:bt.every((x,i)=>!i||x.top>bt[i-1].top),minH:Math.min(...bt.map(x=>x.height)),sh:document.getElementById('v-trip').hidden};});
   ok(r.nl===0&&r.nw<=96&&r.nh>=r.vh-1&&r.col&&r.minH>=48,v+': rail '+JSON.stringify(r));
   ok(r.tl>=r.nw-1,v+': top bar starts after the rail '+JSON.stringify(r));
   if(v==='trip')ok(r.sl>=r.nw-1&&r.sr<=520,'trip panel beside the rail '+JSON.stringify(r));
 }
 ok(!A.errs.length,'wide page errors '+A.errs.join(' | '));
 await A.c.close();

 // 3. phone and tablet portrait: bottom bar as before
 for(const [w,h] of [[412,915],[800,1280]]){
   const P=await open(w,h);
   const r=await P.p.evaluate(()=>{const n=document.getElementById('views').getBoundingClientRect();return {top:n.top,bottom:n.bottom,w:n.width,vh:innerHeight,vw:innerWidth};});
   ok(Math.abs(r.bottom-r.vh)<2&&r.w>=r.vw-1,w+'px: bottom bar '+JSON.stringify(r));
   ok(!P.errs.length,w+'px page errors '+P.errs.join(' | '));
   await P.c.close();
 }

 // 4. text contrast (WCAG AA) on the trip view: light and dark, English and Hindi, phone and wide
 for(const [w,h,dark,lang] of [[412,915,false,'en'],[412,915,true,'hi'],[1280,800,false,'hi'],[1280,800,true,'en']]){
   const P=await open(w,h,'&lang='+lang,{colorScheme:dark?'dark':'light'});
   await P.p.addScriptTag({content:AXE});
   const v=await P.p.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'rule',values:['color-contrast']},resultTypes:['violations']});
     return r.violations.flatMap(x=>x.nodes.map(n=>n.target.join(' ')+' '+(n.any[0]&&n.any[0].message||'').slice(0,90)));});
   ok(!v.length,'contrast '+w+' '+(dark?'dark':'light')+' '+lang+': '+v.slice(0,8).join(' || '));
   await P.c.close();
 }

 await b.close();
 if(fails.length){console.log('FAIL\n'+fails.join('\n'));process.exit(1);}
 console.log('all 2.0 phase 1 checks passed');
})().catch(e=>{console.error(e);process.exit(1);});
