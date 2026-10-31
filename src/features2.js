/* ================= v4.1: shared road reports, NASA landslide history, threshold sensitivity, road profile ================= */
Object.assign(T.en,{
  sh_t:'Share reports with other phones',sh_s:'Reports go to a public test channel (ntfy.sh) so every phone running PahaadPath and the control room see them within seconds. Only the stretch, the type of problem and a random device code are sent. A production version would use an authenticated server.',
  sh_on:'Shared channel connected · {n} reports from other phones in the last 48 hours',sh_off:'Sharing is off. Reports stay on this phone.',sh_wait:'Connecting to the shared channel…',sh_err:'Shared channel not reachable. Reports stay on this phone for now.',sh_from:'other phone',
  rep_none:'No reports.',
  od_st_h:'Incident history: {hi} of {h} hill stretches from the NASA catalog.',
  ft_hist_o:'{n} incident counts from the NASA landslide catalog',
  tn_t:'How sensitive is the trigger?',tn_s:'Recomputes the replay with the rain trigger scaled from 0.4 to 1.6 times Caine (1980). A lower trigger catches more named closures but also flags more stretches on dry days. Only a few days are replayed, so read this as an illustration, not a fitted threshold.',
  tn_hit:'Named closures caught',tn_fa:'Hill stretches at Avoid on dry control days',tn_un:'Avoid with no named closure',tn_x:'Trigger as a multiple of Caine (1980)',tn_now:'app uses 1.0',tn_need:'Run the replay with recorded rain for at least one closure day to see this.',
  pf_t:'Road profile',pf_s:'Height along the road from the Copernicus 90 m elevation model, coloured by landslide risk.',pf_load:'Load road profile',pf_busy:'Loading heights…',pf_off:'Needs a connection the first time.',pf_max:'Highest point {m} m near {p}',pf_climb:'Total climb about {m} m'
});
Object.assign(T.hi,{
  sh_t:'दूसरे फ़ोनों के साथ रिपोर्ट साझा करें',sh_s:'रिपोर्ट एक सार्वजनिक परीक्षण चैनल (ntfy.sh) पर जाती हैं, ताकि पहाड़ पथ चलाने वाला हर फ़ोन और कंट्रोल रूम उन्हें कुछ सेकंड में देख सके। सिर्फ़ सड़क का हिस्सा, समस्या का प्रकार और एक बेतरतीब डिवाइस कोड भेजा जाता है। असली संस्करण में प्रमाणित सर्वर होगा।',
  sh_on:'साझा चैनल जुड़ा है · पिछले 48 घंटे में दूसरे फ़ोनों से {n} रिपोर्ट',sh_off:'साझा करना बंद है। रिपोर्ट इसी फ़ोन में रहती हैं।',sh_wait:'साझा चैनल से जुड़ रहे हैं…',sh_err:'साझा चैनल नहीं मिला। अभी रिपोर्ट इसी फ़ोन में रहेंगी।',sh_from:'दूसरा फ़ोन',
  rep_none:'कोई रिपोर्ट नहीं।',
  od_st_h:'पुरानी घटनाएँ: {h} में से {hi} पहाड़ी हिस्से NASA सूची से।',
  ft_hist_o:'{n} हिस्सों की घटनाएँ NASA भूस्खलन सूची से',
  tn_t:'बारिश की सीमा कितनी संवेदनशील है?',tn_s:'बारिश की सीमा को Caine (1980) के 0.4 से 1.6 गुना तक बदलकर जाँच दोबारा चलाई जाती है। सीमा नीची होने पर ज़्यादा बंद सड़कें पकड़ी जाती हैं, पर सूखे दिनों में भी ज़्यादा हिस्से चिह्नित होते हैं। सिर्फ़ कुछ दिन जाँचे गए हैं, इसलिए इसे उदाहरण मानें, तय की गई सीमा नहीं।',
  tn_hit:'पकड़ी गई बंद सड़कें',tn_fa:'सूखे नियंत्रण दिनों में "टालें" वाले पहाड़ी हिस्से',tn_un:'बिना ख़बर वाली जगह पर टालें',tn_x:'सीमा, Caine (1980) के गुणज में',tn_now:'ऐप 1.0 लेता है',tn_need:'इसे देखने के लिए कम से कम एक बंद सड़कों वाले दिन की दर्ज बारिश से जाँच चलाएँ।',
  pf_t:'सड़क की ऊँचाई',pf_s:'Copernicus 90 मीटर ऊँचाई मॉडल से रास्ते की ऊँचाई, भूस्खलन जोखिम के रंग में।',pf_load:'सड़क की ऊँचाई देखें',pf_busy:'ऊँचाई ला रहे हैं…',pf_off:'पहली बार नेटवर्क चाहिए।',pf_max:'सबसे ऊँची जगह {m} मीटर, {p} के पास',pf_climb:'कुल चढ़ाई लगभग {m} मीटर'
});

/* ---------- shared road reports over a public ntfy.sh topic (no account, works from any browser) ---------- */
const SH_URL='https://ntfy.sh/pahaadpath-uk-road-reports-v1';
const DEV=lsGet('pp_dev',null)||(()=>{const d=Math.random().toString(36).slice(2,10);lsSet('pp_dev',d);return d;})();
st.share=lsGet('pp_share',true);
const SHR={reps:{},conf:{},status:'off',es:null,poll:null,dirty:false};
const SH_TYPES=['landslide','debris','washed','bridge','clear'];
/* a report can matter for up to 48 h (a bridge, see TYPEH), so shared reports are kept that long; the engine decays each by its type */
const SH_KEEP=48*3600e3;
function shIngest(txt){
  let m;try{m=JSON.parse(txt);}catch(e){return false;}
  const now=Date.now();
  if(!m||m.v!==1||typeof m.rid!=='string'||m.rid.length>40||typeof m.dev!=='string'||m.dev.length>20||typeof m.rt!=='number'||m.rt<now-SH_KEEP||m.rt>now+3e5)return false;
  if(m.k==='report'){if(!S[m.seg]||S[m.seg].virtual||SH_TYPES.indexOf(m.type)<0)return false;
    const sp=S[m.seg].spots[m.spot]?+m.spot:-1;if(SHR.reps[m.rid])return false;SHR.reps[m.rid]={rid:m.rid,seg:m.seg,spot:sp,type:m.type,dev:m.dev,rt:m.rt};return true;}
  if(m.k==='confirm'){const c=SHR.conf[m.rid]=SHR.conf[m.rid]||{};if(c[m.dev])return false;c[m.dev]=1;return true;}
  return false;
}
/* other phones' reports in the engine's format; time is kept as real age so the simulated clock does not distort it */
function sharedReports(){
  if(!st.share)return[];
  const now=Date.now(),out=[],remote=rid=>Object.keys(SHR.conf[rid]||{}).filter(d=>d!==DEV&&(!SHR.reps[rid]||d!==SHR.reps[rid].dev)).length;
  (st.user||[]).forEach(r=>{const n=remote(r.id);if(n>(r.rconf||0)){r.conf+=n-(r.rconf||0);r.rconf=n;}});
  Object.values(SHR.reps).forEach(r=>{if(r.dev===DEV||now-r.rt>SH_KEEP||!S[r.seg])return;
    out.push({id:'sh_'+r.rid,rid:r.rid,seg:r.seg,spot:r.spot,type:r.type,ts:st.nowMs-(now-r.rt),conf:remote(r.rid),shared:true,mine:!!(SHR.conf[r.rid]||{})[DEV]});});
  return out;
}
/* reports wait in an outbox on the phone until there is signal, then go out in order (or in one request to a sync server) */
const SYNC_URL=(new URLSearchParams(location.search).get('sync')||lsGet('pp_sync','')).replace(/\/$/,'');
if(SYNC_URL)lsSet('pp_sync',SYNC_URL);
let OUTBOX=lsGet('pp_outbox',[]);if(!Array.isArray(OUTBOX))OUTBOX=[];
/* nothing in the outbox is dropped for age: a report made deep in a valley goes out whenever signal returns, with the time it was made */
function saveOutbox(){if(OUTBOX.length>200)OUTBOX=OUTBOX.slice(-200);lsSet('pp_outbox',OUTBOX);}
async function shPost(m){
  if(!st.share)return;
  OUTBOX.push(Object.assign({v:1,dev:DEV,rt:Date.now()},m));saveOutbox();shFlush();
}
let flushing=false;
async function shFlush(){
  if(flushing||!OUTBOX.length||navigator.onLine===false)return;flushing=true;
  try{
    if(SYNC_URL){
      const res=await fetch(SYNC_URL+'/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({msgs:OUTBOX})});
      if(!res.ok)throw new Error(res.status);const js=await res.json();OUTBOX=[];saveOutbox();
      let ch=false;(js.msgs||[]).forEach(m=>{if(shIngest(JSON.stringify(m)))ch=true;});SHR.status='on';if(ch)shChanged();
    }else{
      while(OUTBOX.length){const res=await fetch(SH_URL,{method:'POST',body:JSON.stringify(OUTBOX[0])});if(!res.ok)throw new Error(res.status);OUTBOX.shift();saveOutbox();}
    }
  }catch(e){SHR.status='err';}finally{flushing=false;}
}
function shareReport(r,kind){if(kind==='report')shPost({k:'report',rid:r.id,seg:r.seg,spot:r.spot,type:r.type});else shPost({k:'confirm',rid:r.id});}
function confirmShared(r){const c=SHR.conf[r.rid]=SHR.conf[r.rid]||{};if(c[DEV])return;c[DEV]=1;shPost({k:'confirm',rid:r.rid});}
function shChanged(){
  if(SHR.t)return;
  SHR.t=setTimeout(()=>{SHR.t=null;opsCache=null;
    const a=document.activeElement;if(a&&(a.tagName==='INPUT'||a.tagName==='SELECT')&&a.id!=='sh-use')return; // do not redraw under a typing finger
    if(st.view!=='proof')render();},600);
}
async function shPoll(){
  try{shFlush();const res=await fetch(SYNC_URL?SYNC_URL+'/reports':SH_URL+'/json?poll=1&since=48h');if(!res.ok)throw new Error(res.status);
    const txt=await res.text();let ch=false;
    if(SYNC_URL)(JSON.parse(txt).msgs||[]).forEach(m=>{if(shIngest(JSON.stringify(m)))ch=true;});
    else txt.split('\n').forEach(l=>{if(!l.trim())return;try{const o=JSON.parse(l);if(o.event==='message'&&shIngest(o.message))ch=true;}catch(e){}});
    SHR.status='on';if(ch)shChanged();else if(st.view==='trip'&&st.tab==='reports'){const b=$('sh-st');if(b)b.textContent=shStatusText();}
  }catch(e){SHR.status='err';}
}
function shStart(){
  shStop();if(!st.share||navigator.onLine===false)return;
  SHR.status='wait';shPoll();
  if(!SYNC_URL)try{SHR.es=new EventSource(SH_URL+'/sse');SHR.es.onmessage=e=>{try{const o=JSON.parse(e.data);if(o.event==='message'&&shIngest(o.message)){SHR.status='on';shChanged();}}catch(_){}};
    SHR.es.onerror=()=>{};}catch(e){}
  SHR.poll=setInterval(()=>{if(!document.hidden)shPoll();},45000);
}
function shStop(){if(SHR.es){try{SHR.es.close();}catch(e){}SHR.es=null;}if(SHR.poll){clearInterval(SHR.poll);SHR.poll=null;}}
function shStatusText(){
  if(!st.share)return t('sh_off');
  const n=Object.values(SHR.reps).filter(r=>r.dev!==DEV&&Date.now()-r.rt<SH_KEEP).length;
  return (SHR.status==='on'?fill(t('sh_on'),{n}):SHR.status==='err'?t('sh_err'):t('sh_wait'))+(OUTBOX.length?' · '+(OUTBOX.length===1?t('ob_1'):fill(t('ob_n'),{n:OUTBOX.length})):'');
}
function shareBox(){
  return '<div class="card shbox"><label class="chk"><input type="checkbox" id="sh-use"'+(st.share?' checked':'')+'> '+t('sh_t')+'</label>'
    +'<p class="note" id="sh-st">'+esc(shStatusText())+'</p><p class="note">'+t('sh_s')+'</p></div>';
}
document.addEventListener('change',e=>{if(e.target.id==='sh-use'){st.share=e.target.checked;lsSet('pp_share',st.share);if(st.share)shStart();else shStop();render();}});
window.addEventListener('online',()=>{if(st.share)shStart();});
if(/^https?:/.test(location.protocol)||window.__shTest)setTimeout(shStart,800);

/* ---------- incident history: distance from a catalogue event to a road line (km) ---------- */
function distToLine(lat,lon,g){
  const kx=111.32*Math.cos(lat*Math.PI/180),ky=110.57;let best=1e9;
  for(let i=1;i<g.length;i++){const ax=(g[i-1][1]-lon)*kx,ay=(g[i-1][0]-lat)*ky,bx=(g[i][1]-lon)*kx,by=(g[i][0]-lat)*ky;
    const dx=bx-ax,dy=by-ay,L2=dx*dx+dy*dy,u=L2?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/L2)):0,x=ax+u*dx,y=ay+u*dy;best=Math.min(best,Math.hypot(x,y));}
  return best;
}
/* ---------- threshold sensitivity from the stored recorded-rain replays ---------- */
const TN_K=[.4,.5,.6,.7,.8,.9,1,1.1,1.2,1.3,1.4,1.5,1.6];
let tnCache=null;
function tuneData(){
  const runs=GT.events.map(ev=>({ev,rec:RP.series[ev.id+'/archive']})).filter(x=>x.rec);
  if(!runs.some(x=>!x.ev.control))return null;
  const key=runs.map(x=>x.ev.id).join(',')+'|'+st.useOD+'|'+odVer;
  if(tnCache&&tnCache.key===key)return tnCache;
  const rows=TN_K.map(k=>{THR=k;let hit=0,named=0,un=0,unN=0,fa=0,faN=0;
    runs.forEach(({ev,rec})=>{const r=scoreDay(ev.date,rec),m=rpMetrics(ev,r);if(ev.control){fa+=m.avoidTotal;faN+=m.links;}else{hit+=m.hit;named+=m.named;un+=m.avoidUnnamed;unN+=m.links-m.named;}});
    return{k,hit:named?hit/named:0,un:unN?un/unN:0,fa:faN?fa/faN:null};});
  THR=1;tnCache={key,rows,days:runs.length};return tnCache;
}
function tuneCard(){
  const D=tuneData();
  if(!D)return '<div class="card"><h3>'+t('tn_t')+'</h3><p class="note">'+t('tn_need')+'</p></div>';
  const W=560,H=230,l=44,r=12,tp=14,b=40,X=k=>l+(k-.4)/1.2*(W-l-r),Y=v=>tp+(1-v)*(H-tp-b);
  const line=(f,col,dash)=>'<path d="'+D.rows.map((p,i)=>(i?'L':'M')+X(p.k).toFixed(1)+' '+Y(f(p)).toFixed(1)).join('')+'" fill="none" stroke="'+col+'" stroke-width="2.4"'+(dash?' stroke-dasharray="5 4"':'')+'/>'+D.rows.map(p=>'<circle cx="'+X(p.k).toFixed(1)+'" cy="'+Y(f(p)).toFixed(1)+'" r="2.6" fill="'+col+'"><title>'+p.k.toFixed(1)+': '+Math.round(100*f(p))+'%</title></circle>').join('');
  let g='';[0,.25,.5,.75,1].forEach(v=>{g+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(l-6)+'" y="'+(Y(v)+3)+'" text-anchor="end">'+Math.round(v*100)+'%</text>';});
  TN_K.forEach(k=>{if(Math.round(k*10)%2===0)g+='<text x="'+X(k)+'" y="'+(H-b+14)+'" text-anchor="middle">'+k.toFixed(1)+'</text>';});
  g+='<line x1="'+X(1)+'" x2="'+X(1)+'" y1="'+tp+'" y2="'+(H-b)+'" stroke="var(--ink)" stroke-dasharray="2 3"/><text x="'+(X(1)+4)+'" y="'+(tp+10)+'">'+esc(t('tn_now'))+'</text>';
  g+='<text x="'+((l+W-r)/2)+'" y="'+(H-6)+'" text-anchor="middle">'+esc(t('tn_x'))+'</text>';
  const hasFa=D.rows.some(p=>p.fa!=null);
  return '<div class="card"><h3>'+t('tn_t')+'</h3><p class="sub">'+t('tn_s')+'</p><svg class="chart tn" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(t('tn_t'))+'">'+g
    +line(p=>p.hit,cssv('--go'))+line(p=>p.un,cssv('--cau'),true)+(hasFa?line(p=>p.fa||0,cssv('--avd')):'')+'</svg>'
    +'<div class="legend"><span><i style="background:var(--go)"></i>'+t('tn_hit')+'</span><span><i style="background:var(--cau)"></i>'+t('tn_un')+'</span>'+(hasFa?'<span><i style="background:var(--avd)"></i>'+t('tn_fa')+'</span>':'')+'</div></div>';
}

/* ---------- road profile: heights along the chosen road from the DEM (one request per road, cached) ---------- */
const PF=lsGet('pp_prof',{});let pfBusy=null;
const pfKey=M=>M.cur.rows.map(r=>r.seg.id+(r.rev?'<':'>')).join('|')+(st.useOD?'o':'');
function routeLine(M){const pts=[];M.cur.rows.forEach(r=>{const g=pathOf(r.seg,r.rev);g.forEach((p,i)=>{if(i||!pts.length)pts.push([p[0],p[1],r]);else pts.push([p[0],p[1],r]);});});return pts;}
function samplesOf(M,n){
  const L=routeLine(M),cum=[0];for(let i=1;i<L.length;i++)cum.push(cum[i-1]+hav(L[i-1][0],L[i-1][1],L[i][0],L[i][1]));
  const tot=cum[cum.length-1],out=[];let j=1;
  for(let k=0;k<n;k++){const want=tot*k/(n-1);while(j<L.length-1&&cum[j]<want)j++;const a=L[j-1],b=L[j],sg=(cum[j]-cum[j-1])||1e-9,u=Math.max(0,Math.min(1,(want-cum[j-1])/sg));
    out.push({lat:a[0]+(b[0]-a[0])*u,lon:a[1]+(b[1]-a[1])*u,km:want,row:b[2]});}
  return{pts:out,tot};
}
async function loadProfile(M){
  const key=pfKey(M);if(PF[key]||pfBusy)return;
  pfBusy=key;drawProfile(M);
  try{const s=samplesOf(M,100);const url=ELEV+'?latitude='+s.pts.map(p=>p.lat.toFixed(4)).join(',')+'&longitude='+s.pts.map(p=>p.lon.toFixed(4)).join(',');
    const res=await fetch(url);if(!res.ok)throw new Error(res.status);const js=await res.json();if(!js.elevation||js.elevation.length!==100)throw new Error('shape');
    PF[key]={z:js.elevation.map(Math.round),tot:+s.tot.toFixed(1)};const ks=Object.keys(PF);if(ks.length>30)delete PF[ks[0]];lsSet('pp_prof',PF);
  }catch(e){PF['err:'+key]=1;}
  pfBusy=null;if(st.M&&pfKey(st.M)===key&&st.tab==='route'&&st.view==='trip')drawProfile(st.M);
}
function drawProfile(M){
  const el=$('pf');if(!el)return;const key=pfKey(M),P=PF[key];
  if(!P){el.innerHTML='<h3>'+t('pf_t')+'</h3><p class="note">'+(pfBusy===key?t('pf_busy'):PF['err:'+key]||navigator.onLine===false?t('pf_off'):'')+'</p>'+(pfBusy===key?'':'<button class="btn sm" type="button" id="pf-load">'+t('pf_load')+'</button>');return;}
  const s=samplesOf(M,100),z=P.z,W=360,H=130,l=34,r=6,tp=10,b=22,zmax=Math.max(...z),zmin=Math.min(...z),span=Math.max(200,zmax-zmin);
  const X=km=>l+km/s.tot*(W-l-r),Y=v=>tp+(1-(v-zmin)/span)*(H-tp-b);
  let areas='';for(let i=1;i<z.length;i++){const row=s.pts[i].row,col=row.seg.plain?cssv('--muted'):cssv('--'+LV[lvl(row.score)]);
    areas+='<path d="M'+X(s.pts[i-1].km).toFixed(1)+' '+Y(z[i-1]).toFixed(1)+'L'+X(s.pts[i].km).toFixed(1)+' '+Y(z[i]).toFixed(1)+'L'+X(s.pts[i].km).toFixed(1)+' '+(H-b)+'L'+X(s.pts[i-1].km).toFixed(1)+' '+(H-b)+'Z" fill="'+col+'" opacity="'+(row.seg.plain?.35:.8)+'"/>';}
  const top=z.indexOf(zmax),near=nearestNode(s.pts[top].lat,s.pts[top].lon);
  let climb=0;for(let i=1;i<z.length;i++)if(z[i]>z[i-1])climb+=z[i]-z[i-1];
  let ax='';[zmin,zmin+span/2,zmin+span].forEach(v=>{ax+='<text x="'+(l-4)+'" y="'+(Y(v)+3)+'" text-anchor="end">'+Math.round(v)+'</text>';});
  [0,.25,.5,.75,1].forEach(f=>{ax+='<text x="'+X(s.tot*f)+'" y="'+(H-8)+'" text-anchor="middle">'+Math.round(s.tot*f)+' '+t('km')+'</text>';});
  el.innerHTML='<h3>'+t('pf_t')+'</h3><p class="sub">'+t('pf_s')+'</p><svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(t('pf_t'))+'">'+areas
    +'<polyline points="'+z.map((v,i)=>X(s.pts[i].km).toFixed(1)+','+Y(v).toFixed(1)).join(' ')+'" fill="none" stroke="var(--ink)" stroke-width="1.2"/>'+ax+'</svg>'
    +'<p class="note">'+esc(fill(t('pf_max'),{m:zmax,p:pname(near.id)})+' · '+fill(t('pf_climb'),{m:Math.round(climb/50)*50}))+'</p>';
}
const renderTripBase=renderTrip;
renderTrip=function(M){
  renderTripBase(M);
  $('panel').insertAdjacentHTML('afterbegin','<div class="card pf" id="pf"></div>');
  drawProfile(M);
  if(!PF[pfKey(M)]&&!PF['err:'+pfKey(M)]&&navigator.onLine!==false&&(/^https?:/.test(location.protocol)||window.__pfAuto))loadProfile(M);
};
document.addEventListener('click',e=>{if(e.target.closest('#pf-load')&&st.M){delete PF['err:'+pfKey(st.M)];loadProfile(st.M);}});
