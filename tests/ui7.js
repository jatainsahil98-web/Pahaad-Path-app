// 2.0 Phase 7 checks: the voice loop and accessibility. With a stand-in speech recogniser the voice bar shows the
// words as they are heard and the trip they parse to, plans the trip on the final words, lets a chip open the field it
// names, and offers the nearest place names when no destination is heard; the Android app's partial and final
// results drive the same bar. axe finds no WCAG 2.1 A or AA problem on any view, in English or Hindi, light or dark.
const {chromium}=require('playwright');const fs=require('fs');
const F=process.argv[2],AXE=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
const FAKE=()=>{ // plays window.__say: [[text, isFinal], ...] then ends
  class R{constructor(){this.lang='';this.interimResults=false;this.maxAlternatives=1;}
    start(){const say=window.__say||[];let i=0;window.__rec=this;
      const step=()=>{if(i>=say.length){this.onend&&this.onend();return;}const [txt,fin]=say[i++];const alt={transcript:txt,confidence:.9};const res=[alt];res.isFinal=fin;
        this.onresult&&this.onresult({results:[res]});window.__step=step;if(!window.__manual)setTimeout(step,120);};
      setTimeout(step,50);}
    abort(){this.onend&&this.onend();} stop(){}}
  window.SpeechRecognition=R;window.webkitSpeechRecognition=R;};
(async()=>{
 const b=await chromium.launch();
 const page=async(init,q)=>{const c=await b.newContext({viewport:{width:412,height:915}});await c.route(/^https?:\/\//,r=>r.abort());
   const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));await p.addInitScript(init);
   await p.goto('file://'+F+'?scn=monsoon&from=dehradun&to=badrinath'+(q||''));await p.waitForFunction(()=>PP.last&&PP.last.cur);return {p,errs};};

 // 1. browser recogniser: interim words, then the final ones
 const mic=async q=>{if(!await q.evaluate(()=>document.body.classList.contains('searching')))await q.click('#qsum');await q.waitForTimeout(400);await q.click('#b-mic');};
 const {p,errs}=await page(FAKE);
 await p.evaluate(()=>{window.__manual=true;window.__say=[['delhi to',false],['delhi to kedar',false],['delhi to kedarnath tomorrow 6 am',true]];});
 await mic(p);await p.waitForTimeout(150);
 await p.evaluate(()=>window.__step());await p.waitForTimeout(80);
 const i1=await p.evaluate(()=>({open:!document.getElementById('vbar').hidden,live:document.getElementById('vbar').classList.contains('live'),said:document.getElementById('vb-said').textContent}));
 ok(i1.open&&i1.live&&/delhi to kedar/.test(i1.said),'bar shows the words while listening '+JSON.stringify(i1));
 const chips1=await p.evaluate(()=>[...document.querySelectorAll('#vb-chips .vb-chip')].map(x=>x.dataset.vbe));
 ok(chips1.includes('to'),'chips while listening '+chips1);
 await p.evaluate(()=>window.__step());await p.waitForTimeout(200);
 const f=await p.evaluate(()=>({to:PP.st.to,from:PP.st.from,dep:PP.st.dep,h:document.getElementById('vb-h').textContent,chips:[...document.querySelectorAll('#vb-chips .vb-chip')].map(x=>x.dataset.vbe+':'+x.querySelector('b').textContent),focus:document.activeElement&&document.activeElement.id}));
 ok(f.to==='kedarnath'&&f.from==='delhi'&&f.dep===6,'final words plan the trip '+JSON.stringify(f));
 ok(f.h==='Understood'&&f.chips.length===4,'four chips: from, to, date, time '+JSON.stringify(f.chips));
 ok(f.focus==='vb-ok','Done takes the focus');
 await p.screenshot({path:'/tmp/ui7_bar.png'});
 // a chip opens its field
 await p.click('[data-vbe="to"]');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>document.getElementById('vbar').hidden&&document.activeElement.id==='in-to'),'To chip opens the To field');
 await p.keyboard.press('Escape');
 // 2. recovery: no destination heard
 await p.evaluate(()=>{window.__manual=false;window.__say=[['going to badrinat',true]];});
 await mic(p);await p.waitForTimeout(600);
 const near=await p.evaluate(()=>[...document.querySelectorAll('[data-vbto]')].map(x=>x.dataset.vbto));
 ok(near[0]==='badrinath','nearest places offered '+near);
 if(near.length){await p.click('[data-vbto="'+near[0]+'"]');await p.waitForTimeout(300);ok(await p.evaluate(()=>PP.st.to==='badrinath'&&document.getElementById('vbar').hidden),'picking one plans it');}
 ok(!errs.length,'page errors '+errs.join(' | '));

 // 3. the Android app: partial results, then the final ones through PP.onSpeech
 const A=await page(()=>{window.PPAndroid={listen(){window.__listened=1;},canListen(){return true;}};},'&lang=hi');
 await mic(A.p);
 await A.p.evaluate(()=>PP.onSpeechPartial('dehradun se mussoorie'));
 const ap=await A.p.evaluate(()=>({open:!document.getElementById('vbar').hidden,said:document.getElementById('vb-said').textContent,listened:window.__listened}));
 ok(ap.open&&/mussoorie/.test(ap.said)&&ap.listened===1,'Android partial results in the bar '+JSON.stringify(ap));
 await A.p.evaluate(()=>PP.onSpeech(['dehradun se mussoorie kal']));await A.p.waitForTimeout(200);
 const af=await A.p.evaluate(()=>({to:PP.st.to,h:document.getElementById('vb-h').textContent}));
 ok(af.to==='mussoorie'&&af.h==='समझा','Android final words plan the trip, Hindi bar '+JSON.stringify(af));

 // 4. axe on every view
 for(const [view,lang,dark,w,h] of [['trip','en',false,412,915],['trip','hi',true,412,915],['trip','en',true,1280,800],['ops','en',false,1280,800],['ops','hi',true,412,915],['proof','en',false,412,915],['proof','hi',true,1280,800],['transport','en',false,412,915],['transport','hi',true,1280,800]]){
   const c=await b.newContext({viewport:{width:w,height:h},colorScheme:dark?'dark':'light'});await c.route(/^https?:\/\//,r=>r.abort());
   const q=await c.newPage();await q.goto('file://'+F+'?scn=monsoon&from=dehradun&to=badrinath&psec=all&view='+view+(lang==='hi'?'&lang=hi':''));
   await q.waitForFunction(()=>window.PP&&PP.st.series);await q.waitForTimeout(1500);
   if(lang==='hi')await q.evaluate(()=>{const x=document.getElementById('b-hi');if(x.getAttribute('aria-pressed')!=='true')x.click();});
   await q.waitForTimeout(300);await q.addScriptTag({content:AXE});
   const v=await q.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(x=>x.id+' '+x.nodes.slice(0,2).map(n=>n.target.join(' ')).join(',')));
   ok(!v.length,'axe '+view+' '+lang+(dark?' dark ':' light ')+w+': '+v.join(' | '));
   await c.close();
 }
 await b.close();
 if(fails.length){console.log('FAIL\n'+fails.join('\n'));process.exit(1);}
 console.log('all 2.0 phase 7 checks passed');
})().catch(e=>{console.error(e);process.exit(1);});
