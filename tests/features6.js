// v8 checks: SOS by SMS and 112, back button, trip kept across restarts, location that never hangs, Android bridge use,
// shared links that work on another phone, and hand-off to Google Maps or Mappls on the chosen route.
const {chromium}=require('playwright');
const F=process.argv[2];
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);};
(async()=>{
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:412,height:900},geolocation:{latitude:30.1462,longitude:78.5986},permissions:['geolocation']});
 await ctx.route(/^https?:\/\//,r=>r.abort());
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
 const open=async(qs)=>{await p.goto('file://'+F+(qs||''));await p.waitForFunction(()=>window.PP&&PP.last&&PP.last.cur);};

 // 1. SOS: a 112 call link, then an SMS with the GPS position to the saved number; WhatsApp is only an extra button
 await open('?scn=monsoon&tiles=0&from=haridwar&to=kedarnath&tab=safety');
 await p.evaluate(()=>localStorage.setItem('pp_fam',JSON.stringify('9876543210')));
 await p.click('#a-sos');
 ok(await p.getAttribute('#sos-call','href')==='tel:112','sos call 112');
 await p.waitForFunction(()=>/maps\.google\.com\/\?q=30\.146/.test(document.getElementById('sos-prev').textContent),null,{timeout:10000});
 const sms=await p.evaluate(()=>{const a=document.getElementById('sos-sms');a.addEventListener('click',e=>e.preventDefault(),{once:false});a.click();return a.getAttribute('href');});
 ok(/^sms:9876543210\?body=SOS/.test(sms)&&sms.includes(encodeURIComponent('30.14620,78.59860')),'sos sms '+sms);
 ok(!/wa\.me/.test(await p.innerHTML('#modal-body')),'sos has no wa.me link');
 // no number typed: the SMS button asks for one
 await p.evaluate(()=>{localStorage.removeItem('pp_fam');document.getElementById('fm-num').value='';});
 await p.click('#sos-sms');ok(/phone number/i.test(await p.textContent('#toast')),'sos needs a number');

 // 2. back: closes the window, then the tab, then the view; false when there is nothing left
 const back=await p.evaluate(()=>{const o=[];o.push([PP.back(),document.getElementById('modal').hidden]);
  o.push([PP.back(),PP.st.tab]);PP.st.view='proof';PP.render();o.push([PP.back(),PP.st.view]);o.push(PP.back());return o;});
 ok(back[0][0]===true&&back[0][1]===true,'back closes modal '+JSON.stringify(back));
 ok(back[1][0]===true&&back[1][1]==='route','back to route tab');
 ok(back[2][0]===true&&back[2][1]==='trip','back to trip view');
 ok(back[3]===false,'back at the start leaves the app');

 // 3. the trip survives a restart with no link; a shared link still wins
 await p.evaluate(()=>{PP.st.from='rishikesh';PP.st.to='badrinath';PP.st.tab='rules';PP.st.dep=7;PP.render();});
 await p.goto('file://'+F+'?tiles=0&scn=monsoon');await p.waitForFunction(()=>PP.last&&PP.last.cur);
 // ?scn is not a trip field, so the saved trip comes back
 const kept=await p.evaluate(()=>[PP.st.from,PP.st.to,PP.st.tab,PP.st.dep]);
 ok(JSON.stringify(kept)==='["rishikesh","badrinath","rules",7]','trip kept '+JSON.stringify(kept));
 await open('?scn=monsoon&tiles=0&from=delhi&to=nainital');
 ok(await p.evaluate(()=>PP.st.from+'-'+PP.st.to)==='delhi-nainital','link wins over saved trip');

 // 4. location: a GPS error falls back to the coarse fix; a dead provider ends in an error, never an endless wait
 const loc=await p.evaluate(async()=>{window.__fastSleep=true;const real=navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);const o={};
  navigator.geolocation.getCurrentPosition=(s,f,opt)=>opt.enableHighAccuracy?setTimeout(()=>f({code:3}),10):real(s,f,opt);
  o.coarse=await new Promise(r=>PP.locate(x=>r(x.lat.toFixed(3)),e=>r('fail '+e)));
  navigator.geolocation.getCurrentPosition=()=>{}; // never answers, like a WebView with location switched off
  const t0=Date.now();o.hang=await new Promise(r=>PP.locate(()=>r('ok'),e=>r(e)));o.ms=Date.now()-t0;
  navigator.geolocation.getCurrentPosition=(s,f)=>f({code:1});o.denied=await new Promise(r=>PP.locate(()=>r('ok'),e=>r(e)));
  window.PPAndroid={locationEnabled:()=>false};o.off=await new Promise(r=>PP.locate(()=>r('ok'),e=>r(e)));delete window.PPAndroid;
  navigator.geolocation.getCurrentPosition=real;return o;});
 ok(loc.coarse==='30.146','coarse fallback '+JSON.stringify(loc));
 ok(loc.hang==='timeout'&&loc.ms<3000,'no endless wait');
 ok(loc.denied==='denied'&&loc.off==='off','denied and off');

 // 5. a shared link from the Android app or a saved file points at the public site
 const u=await p.evaluate(()=>PP.shareUrl());
 ok(u.startsWith('https://jatainsahil98-web.github.io/Pahaad-Path-app/?from=delhi&to=nainital'),'share url '+u);

 // 6. navigation hand-off: origin, destination and up to 3 towns of the chosen route as stops
 await open('?scn=monsoon&tiles=0&from=dehradun&to=badrinath');
 const nav=await p.evaluate(()=>({g:document.getElementById('nav-g').href,m:document.getElementById('nav-m').href,s:PP.navStops(PP.last),nodes:PP.last.cur.nodes}));
 const via=nav.s.via.map(n=>n.lat.toFixed(5)+','+n.lon.toFixed(5));
 ok(nav.s.via.length>=1&&nav.s.via.length<=3,'via count '+nav.s.via.length);
 ok(/^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&origin=[\d.]+,[\d.]+&destination=[\d.]+,[\d.]+&waypoints=.+&travelmode=driving$/.test(nav.g),'google url '+nav.g);
 ok(via.every(v=>nav.g.includes(encodeURIComponent(v).replace(/%2C/g,'%2C'))||decodeURIComponent(nav.g).includes(v)),'google via towns');
 ok(nav.m.startsWith('https://mappls.com/direction?places=')&&decodeURIComponent(nav.m.split('places=')[1]).split(';').length===nav.s.via.length+2,'mappls url '+nav.m);
 await p.evaluate(()=>{PP.st.tab='map';PP.render();});ok(await p.isHidden('#navbox'),'nav only on the route tab');

 // 7. Android bridge: share, WhatsApp, copy, download and speech go through PPAndroid when it is there
 const calls=[];await p.exposeFunction('__call',(m,a)=>{calls.push([m,a]);});
 await p.addInitScript(()=>{window.PPAndroid={};for(const m of ['shareText','copy','shareApp','stopSpeaking'])window.PPAndroid[m]=(...a)=>{window.__call(m,a);};
  window.PPAndroid.openWhatsApp=t=>{window.__call('openWhatsApp',[t]);return false;};
  window.PPAndroid.saveFile=(n,m,t)=>{window.__call('saveFile',[n,m,t.length]);return 'Download/PahaadPath/'+n;};
  window.PPAndroid.speak=(t,l)=>{window.__call('speak',[l]);return true;};
  window.PPAndroid.locationEnabled=()=>true;window.PPAndroid.canListen=()=>true;
  window.PPAndroid.listen=l=>{window.__call('listen',[l]);setTimeout(()=>PP.onSpeech(['xyz','rishikesh se joshimath kal'],null),20);};});
 await open('?scn=monsoon&tiles=0&from=delhi&to=mussoorie');
 await p.click('#a-share');await p.click('#a-listen');
 await p.click('#a-qr');await p.click('#a-copyl');await p.keyboard.press('Escape');
 await p.evaluate(()=>{PP.st.lang='hi';PP.render();});await p.click('#b-mic');
 await p.waitForFunction(()=>PP.st.from==='rishikesh'&&PP.st.to==='joshimath');
 await p.evaluate(()=>{PP.st.lang='en';PP.st.view='ops';PP.render();});await p.click('#adv-wa');
 await p.waitForTimeout(100);
 const names=calls.map(c=>c[0]);
 ok(names.includes('shareText'),'android share sheet '+names);
 ok(calls.some(c=>c[0]==='speak'&&c[1][0]==='en-IN'),'android voice');
 ok(names.includes('copy'),'android copy');
 ok(calls.some(c=>c[0]==='listen'&&c[1][0]==='hi-IN'),'android listen in hindi');
 ok(names.includes('openWhatsApp')&&/WhatsApp is not installed/.test(await p.textContent('#toast')),'whatsapp missing falls back to copy');
 ok((await p.evaluate(()=>PP.shareUrl())).startsWith('https://jatainsahil98-web.github.io/Pahaad-Path-app/'),'share url in app');

 ok(!errs.length,'page errors '+errs.join(' | '));
 await b.close();
 if(fails.length){console.log('FAIL\n'+fails.join('\n'));process.exit(1);}
 console.log('all v8 checks passed');
})().catch(e=>{console.error(e);process.exit(1);});
