/* ================= v10: app shell. Map-first layout like a navigation app: the route map fills the screen, the trip
   search slides down from the top bar, results sit in a sheet that drags between peek, half and full (a side panel on
   wide screens), quick actions float over the map, and the views live in a bottom bar. Every id the rest of the app
   renders into is unchanged; this file only places them and adds the map, the sheet and the motion. ================= */
Object.assign(T.en,{
  v6_line:'Next 24 h, model checked against PWD closures. Worst: {s}',sh_go:'Show route',sh_edit:'Change trip',sh_layer:'Risk or traffic colours',sh_fit:'Show the whole route',sh_where:'Where am I on this trip?',
  sh_sos:'SOS',sh_sheet:'Drag to see more or less',sh_conds:'Forecast and traffic settings',sh_map:'Route map',
  nav_trip:'Plan',nav_ops:'Control room',nav_proof:'Proof'
});
Object.assign(T.hi,{
  v6_line:'अगले 24 घंटे, PWD बंदियों से जाँचा मॉडल। सबसे जोखिम: {s}',sh_go:'रास्ता दिखाएँ',sh_edit:'यात्रा बदलें',sh_layer:'जोखिम या ट्रैफ़िक के रंग',sh_fit:'पूरा रास्ता दिखाएँ',sh_where:'इस यात्रा में मैं कहाँ हूँ?',
  sh_sos:'SOS',sh_sheet:'और या कम देखने के लिए खींचें',sh_conds:'पूर्वानुमान और ट्रैफ़िक की सेटिंग',sh_map:'रास्ते का नक्शा',
  nav_trip:'योजना',nav_ops:'कंट्रोल रूम',nav_proof:'प्रमाण'
});

const wideScreen=()=>window.matchMedia('(min-width: 900px)').matches;
const calm=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- bottom bar: the three views with icons ---------- */
const NAV_IC={
  trip:'<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
  ops:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M7 12l3-3 3 2 4-4"/>',
  proof:'<path d="M9 12l2 2 4-4"/><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3z"/>'
};
renderViews=function(){
  $('views').innerHTML=['trip','ops','proof'].map(v=>'<button type="button" data-view="'+v+'" aria-pressed="'+(st.view===v)+'">'
    +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+NAV_IC[v]+'</svg>'
    +'<span>'+t('nav_'+v)+'</span></button>').join('');
  $('v-trip').hidden=st.view!=='trip';$('v-ops').hidden=st.view!=='ops';$('v-proof').hidden=st.view!=='proof';
  $('app').classList.toggle('wide',st.view!=='trip');
  document.body.dataset.ppView=st.view; // not data-view: the app's click handler treats any [data-view] as a view button
  if(st.view!=='ops')stopPlay();
};

/* ---------- search panel (the trip form) ---------- */
function searchOpen(){return document.body.classList.contains('searching');}
function openSearch(){
  document.body.classList.add('searching');$('scrim').hidden=false;$('qsum').setAttribute('aria-expanded','true');
  setTimeout(()=>{const i=$('in-to');if(i&&!calm())i.focus({preventScroll:true});},calm()?0:280);
}
function closeSearch(){
  if(!searchOpen())return false;
  document.body.classList.remove('searching');$('qsum').setAttribute('aria-expanded','false');
  if(!condsOpen())$('scrim').hidden=true;
  const a=document.activeElement;if(a&&$('search').contains(a))a.blur();
  return true;
}
function condsOpen(){return !$('conds').hidden;}
function toggleConds(on){
  const o=on==null?!condsOpen():on;$('conds').hidden=!o;$('srcchip').setAttribute('aria-expanded',String(o));
  $('scrim').hidden=!(o||searchOpen());return true;
}
function qsumHtml(){
  const M=st.M;if(!M||!M.trip)return '';
  const dep=st.dep!=null?String(st.dep).padStart(2,'0')+':00':(st.lang==='hi'?'सबसे अच्छा समय':'best time');
  return '<b>'+esc(pname(M.trip.from))+' <i aria-hidden="true">→</i> '+esc(pname(M.trip.to))+'</b><span>'+esc(fmtDate(st.dateIdx)+' · '+dep)+'</span>';
}

/* ---------- the sheet: peek shows the verdict, half the routes, full everything ---------- */
const SNAPS=['peek','half','full'];
function snapPx(s){
  const vh=window.innerHeight,top=$('app').querySelector('.topbar').getBoundingClientRect().bottom,nav=$('views').offsetHeight;
  const room=vh-top-nav-8;
  if(s==='full')return room;
  if(s==='half')return Math.min(room,Math.round(vh*.5));
  const v=$('verdict');return Math.min(room,Math.max(132,(v?v.offsetHeight:0)+44));
}
function setSnap(s,quiet){
  const sh=$('v-trip');if(wideScreen()){document.documentElement.style.removeProperty('--sheet-h');sh.dataset.snap='full';return;}
  sh.dataset.snap=s;document.body.dataset.snap=s;document.documentElement.style.setProperty('--sheet-h',snapPx(s)+'px');
  $('grab').setAttribute('aria-label',t('sh_sheet'));
  if(!quiet)setTimeout(()=>bgFit(true),calm()?0:420);
}
function nextSnap(dir){const i=SNAPS.indexOf($('v-trip').dataset.snap);return SNAPS.at(Math.max(0,Math.min(2,i+dir)));}
(function sheetDrag(){
  const sh=$('v-trip'),grab=$('grab');let y0=0,h0=0,drag=false,moved=false,t0=0;
  const down=e=>{if(wideScreen())return;drag=true;moved=false;y0=e.clientY;h0=sh.getBoundingClientRect().height;t0=performance.now();sh.classList.add('dragging');grab.setPointerCapture&&grab.setPointerCapture(e.pointerId);};
  const move=e=>{if(!drag)return;const dy=y0-e.clientY;if(Math.abs(dy)>4)moved=true;
    document.documentElement.style.setProperty('--sheet-h',Math.max(96,Math.min(snapPx('full'),h0+dy))+'px');};
  const up=e=>{if(!drag)return;drag=false;sh.classList.remove('dragging');
    if(!moved){setSnap(sh.dataset.snap==='full'?'half':nextSnap(1));return;}
    const h=sh.getBoundingClientRect().height,v=(y0-e.clientY)/Math.max(1,performance.now()-t0); // a flick decides by its direction
    let s=SNAPS.reduce((b,x)=>Math.abs(snapPx(x)-h)<Math.abs(snapPx(b)-h)?x:b,'half');
    if(Math.abs(v)>.6)s=nextSnap(v>0?1:-1);
    setSnap(s);};
  grab.addEventListener('pointerdown',down);window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);
  grab.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSnap(sh.dataset.snap==='full'?'peek':nextSnap(1));}
    else if(e.key==='ArrowUp'){e.preventDefault();setSnap(nextSnap(1));}else if(e.key==='ArrowDown'){e.preventDefault();setSnap(nextSnap(-1));}});
  // typing inside the sheet needs room: open it fully
  sh.addEventListener('focusin',e=>{if(!wideScreen()&&e.target.matches('input,select,textarea')&&sh.dataset.snap!=='full')setSnap('full',true);});
  window.addEventListener('resize',()=>{setSnap(sh.dataset.snap,true);if(BG.map)BG.map.invalidateSize();});
})();

/* ---------- background route map ---------- */
const BG={map:null,g:null,key:'',ids:'',bounds:null,tiles:null};
function stoneIcon(n,end){
  const code=esc((n.en||'').replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase());
  return L.divIcon({className:'stone-ic',iconSize:[34,44],iconAnchor:[17,42],
    html:'<div class="stone'+(end?' end':'')+'"><i></i><b>'+code+'</b></div>'});
}
const HALT_IC='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor"/></svg>';
function bgEnsure(){
  const want=tilesOn();
  if(BG.map&&BG.tiles===want)return true;
  const o=makeMap('bgmap',{zoomControl:false,attributionControl:true,scrollWheelZoom:true,preferCanvas:true});if(!o)return false;
  BG.map=o.map;BG.tiles=want;BG.g=L.layerGroup().addTo(BG.map);BG.key='';BG.ids='';BG.svg=L.svg({padding:.6});
  BG.map.on('popupopen',()=>{if(!wideScreen()&&$('v-trip').dataset.snap==='full')setSnap('half',true);});
  return true;
}
function bgPad(){
  if(wideScreen()){const w=$('v-trip').getBoundingClientRect().right;return {tl:[w+24,96],br:[72,32]};}
  const top=$('app').querySelector('.topbar').getBoundingClientRect().bottom+12,h=$('v-trip').getBoundingClientRect().height+$('views').offsetHeight;
  return {tl:[24,top],br:[64,Math.min(h+16,window.innerHeight*.7)]};
}
function bgFit(soft){
  if(!BG.map||!BG.bounds||st.view!=='trip')return;
  BG.map.invalidateSize();const p=bgPad();
  BG.map.fitBounds(BG.bounds,{paddingTopLeft:p.tl,paddingBottomRight:p.br,animate:!calm()&&!!soft,maxZoom:11});
}
/* the route draws itself from start to end when it changes: the one orchestrated motion on the map */
function drawOn(paths){
  if(calm())return;
  let at=0;const total=paths.reduce((s,p)=>s+p.len,0)||1;
  paths.forEach(p=>{const el=p.layer.getElement&&p.layer.getElement();if(!el)return;
    const len=el.getTotalLength?el.getTotalLength():0;if(!len)return;
    const d=900*p.len/total;
    el.style.strokeDasharray=len+' '+len;el.style.strokeDashoffset=String(len);el.getBoundingClientRect();
    el.style.transition='stroke-dashoffset '+d.toFixed(0)+'ms linear '+at.toFixed(0)+'ms';el.style.strokeDashoffset='0';
    setTimeout(()=>{el.style.strokeDasharray='';el.style.transition='';},at+d+60);
    at+=d;});
}
/* GSI-mapped landslides within 1 km of the route's hill stretches (dark = active), cached per stretch */
const GSI_NEAR=new Map();
function gsiRenderer(){ // its own pane above the route lines, below the pins
  if(!BG.gsiR){if(!BG.map.getPane('gsi')){const pn=BG.map.createPane('gsi');pn.style.zIndex=450;pn.style.pointerEvents='none';const vis=()=>{pn.style.display=BG.map.getZoom()>=10?'':'none';};BG.map.on('zoomend',vis);vis();}BG.gsiR=L.canvas({pane:'gsi',padding:.5});}
  return BG.gsiR;
}
function gsiNear(rows){
  const out=[];rows.forEach(r=>{const s=r.seg;if(s.plain||s.virtual)return;
    if(!GSI_NEAR.has(s.id)){const g=geomOf(s);GSI_NEAR.set(s.id,GSI.pts.filter(p=>distToLine(p[0],p[1],g)<=1));}
    GSI_NEAR.get(s.id).forEach(p=>out.push(p));});
  return out;
}
setTimeout(()=>{if(window.PP)window.PP.gsiNear=rows=>GSI&&GSI.pts?gsiNear(rows):null;}); // for the tests
function drawBg(M){
  if(st.view!=='trip'||!HAS_L||!M||!M.cur)return;
  if(!bgEnsure())return;
  const tl=st.layer==='traffic',cur=M.cur;
  const ids=cur.rows.map(r=>r.seg.id+(r.rev?'r':'')).join(',');
  const key=ids+'|'+st.layer+'|'+cur.rows.map(r=>tl?tlvl(r.ci):r.score).join(',')+'|'+M.plans.length+'|'+st.lang;
  if(key===BG.key)return;
  const fresh=ids!==BG.ids;BG.key=key;BG.ids=ids;BG.g.clearLayers();
  const g=BG.g,bounds=[],paths=[];
  EDGES.forEach(e=>{if(e.virtual)return;L.polyline(geomOf(e),{color:cssv('--muted'),weight:1.5,opacity:.28,interactive:false}).addTo(g);});
  M.plans.forEach(p=>{if(p===M.sel)return;p.rows.forEach(r=>{L.polyline(pathOf(r.seg,r.rev),{color:cssv('--ink'),weight:3,opacity:.35,dashArray:'6 7',interactive:false}).addTo(g);});});
  cur.rows.forEach(r=>{
    const s=r.seg,ll=pathOf(s,r.rev);ll.forEach(p=>bounds.push(p));
    const col=tl?cssv('--'+LV[tlvl(r.ci)]):s.plain?cssv('--muted'):cssv('--'+LV[lvl(r.score)]);
    const opt={renderer:BG.svg};if(!tl&&r.blocked)opt.dashArray='2 10';
    const casing=L.polyline(ll,{color:cssv('--surface'),weight:10,opacity:.95,interactive:false,renderer:BG.svg,lineCap:'round'}).addTo(g);
    const line=L.polyline(ll,Object.assign({color:col,weight:6,opacity:1,lineCap:'round',className:'pp-route'},opt)).addTo(g).bindPopup(stretchPopup(r));
    paths.push({layer:casing,len:s.km||1},{layer:line,len:s.km||1});
  });
  if(!tl&&GSI&&GSI.pts)gsiNear(cur.rows).forEach(p=>{L.circleMarker([p[0],p[1]],{radius:3.2,weight:1,color:'#fff',fillColor:p[2]?'#7a3b0c':'#b07a45',fillOpacity:.95,interactive:false,renderer:gsiRenderer()}).addTo(g);});
  if(!tl)cur.rows.forEach(r=>{const s=r.seg;if(s.virtual)return;s.spots.forEach(sp=>{const p=along(geomOf(s),sp.f);
    L.marker([p.lat,p.lon],{icon:divIcon(TRI,'',[18,16]),keyboard:false}).bindTooltip(esc(nm(sp))).addTo(g);});});
  cur.halts.forEach(h=>{const n=NODE(h.node);if(!n)return;
    L.marker([n.lat,n.lon],{icon:divIcon(HALT_IC,'lf-halt',[22,22]),keyboard:false}).bindTooltip(esc(t('sf_halts')+': '+pname(h.node))).addTo(g);});
  const a=NODE(M.trip.from),b=NODE(M.trip.to);
  if(a)L.marker([a.lat,a.lon],{icon:stoneIcon(a,false),keyboard:false,zIndexOffset:900}).bindTooltip(esc(pname(M.trip.from))).addTo(g);
  if(b)L.marker([b.lat,b.lon],{icon:stoneIcon(b,true),keyboard:false,zIndexOffset:1000}).bindTooltip(esc(pname(M.trip.to))).addTo(g);
  BG.bounds=bounds.length?L.latLngBounds(bounds):null;
  if(fresh){bgFit(false);requestAnimationFrame(()=>drawOn(paths));}
}

/* ---------- wiring ---------- */
const renderBaseShell=render;
render=function(){
  renderBaseShell();
  const qh=qsumHtml();if($('qsum').innerHTML!==qh)$('qsum').innerHTML=qh; // only when it changed: a redraw mid-tap would lose the tap$('qsum').setAttribute('aria-label',t('sh_edit'));
  $('search-go').textContent=t('sh_go');
  $('srcchip').setAttribute('aria-label',t('sh_conds'));$('bgmap').setAttribute('aria-label',t('sh_map'));
  [['fab-layer','sh_layer'],['fab-fit','sh_fit'],['fab-where','sh_where'],['fab-sos','sh_sos']].forEach(([id,k])=>{$(id).setAttribute('aria-label',t(k));$(id).title=t(k);});
  $('fab-layer').classList.toggle('on',st.layer==='traffic');
  if($('fab-3d')){$('fab-3d').setAttribute('aria-label',t('sh_3d'));$('fab-3d').title=t('sh_3d');$('fab-3d').hidden=!(TL&&TL.dem&&BG.gl);$('fab-3d').classList.toggle('on',!!(BG.gl&&BG.gl.is3d()));}
  if($('fab-save')){$('fab-save').setAttribute('aria-label',t('sh_save'));$('fab-save').title=t('sh_save');$('fab-save').hidden=!(TL&&TL.web&&!TL.saved);}
  const tripV=st.view==='trip';if(!tripV){closeSearch();if(condsOpen())toggleConds(false);}$('bgmap').hidden=!tripV;$('fabs').hidden=$('fabs-top').hidden=!tripV||!(st.M&&st.M.cur);
  document.documentElement.style.setProperty('--topbar-h',Math.round($('app').querySelector('.topbar').getBoundingClientRect().height)+'px');
  if(tripV){const sh=$('v-trip');if(!document.documentElement.style.getPropertyValue('--sheet-h'))setSnap(sh.dataset.snap||'half',true);drawBg(st.M);}
};
document.addEventListener('click',e=>{
  const c=e.target.closest('#qsum,#search-go,#scrim,#srcchip,#fab-layer,#fab-fit,#fab-where,#fab-sos,#fab-3d,#fab-save,[data-pre]');if(!c)return;
  if(c.id==='fab-3d'){if(BG.gl){BG.gl.view3d(!BG.gl.is3d());c.classList.toggle('on',BG.gl.is3d());}return;}
  if(c.id==='fab-save'){saveTiles();return;}
  if(c.id==='qsum')openSearch();
  else if(c.id==='search-go'){closeSearch();setSnap('half');}
  else if(c.id==='scrim'){closeSearch();toggleConds(false);}
  else if(c.id==='srcchip')toggleConds();
  else if(c.id==='fab-layer'){st.layer=st.layer==='traffic'?'risk':'traffic';render();}
  else if(c.id==='fab-fit')bgFit(true);
  else if(c.id==='fab-where')showWhere();
  else if(c.id==='fab-sos')sos();
  else if(c.dataset.pre!=null&&searchOpen())setTimeout(()=>{closeSearch();setSnap('half');},120); // a suggested trip: show it at once
});
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&searchOpen()&&(e.target.id==='in-to'||e.target.id==='in-from'||e.target.id==='in-ask'))setTimeout(()=>{closeSearch();setSnap('half');},60);
  if(e.key==='Escape'){if(closeSearch())e.stopPropagation();else if(condsOpen())toggleConds(false);}
});
/* back: close the search or the settings first, then shrink a full sheet, then what PP.back did before */
const goBackBase=goBack;
goBack=function(){
  if(!$('modal').hidden)return goBackBase();
  if(closeSearch())return true;
  if(condsOpen())return toggleConds(false);
  if(st.view==='trip'&&!wideScreen()&&$('v-trip').dataset.snap==='full'){setSnap('half');return true;}
  return goBackBase();
};
/* a trip typed or spoken in the search panel: show it at once */
const applyAskBase=applyAsk;
applyAsk=function(x){const r=applyAskBase(x);if(r&&searchOpen())setTimeout(()=>{closeSearch();setSnap('half');},150);return r;};
/* the map tab is the background map now; a saved "map" tab opens the route tab instead (a link with tab=map still works) */
if(st.tab==='map'&&q.get('tab')!=='map')st.tab='route';

/* ================= v11: less scrolling. A short summary stays on top (verdict, key figures, section switcher) and one
   section shows at a time: Overview (route choices, traffic, actions), Stretches, When to leave, Rules, Safety, Reports.
   Built for the Galaxy Tab in landscape (side panel) and portrait (sheet), and the same on phones. ================= */
Object.assign(T.en,{
  sec_over:'Overview',sec_when:'When to leave',k_drive:'Driving',k_dist:'Distance',k_halt:'Night halt',k_leave:'Best start',k_none:'None needed',k_nowin:'No safe window'
});
Object.assign(T.hi,{
  sec_over:'सार',sec_when:'कब निकलें',k_drive:'गाड़ी चलाने का समय',k_dist:'दूरी',k_halt:'रात का पड़ाव',k_leave:'निकलने का समय',k_none:'ज़रूरत नहीं',k_nowin:'कोई सुरक्षित समय नहीं'
});
T.en.tabs=Object.assign({},T.en.tabs,{route:'Stretches'});T.hi.tabs=Object.assign({},T.hi.tabs,{route:'हिस्से'});
let SEC=['route','map','reports','rules','safety'].includes(q.get('tab'))?null:'over'; // a link that names a tab opens that tab
const secNow=()=>st.tab!=='route'?st.tab:(SEC||'route');
const K_IC={
  drive:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  dist:'<path d="M4 19c4-1 3-6 8-7s5-6 8-7"/><circle cx="4" cy="19" r="1.6"/><circle cx="20" cy="5" r="1.6"/>',
  halt:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  leave:'<path d="M3 12h13M12 7l5 5-5 5"/><path d="M20 5v14"/>'
};
function kstatsHtml(M){
  if(!M||!M.cur)return '';
  const cur=M.cur,bw=M.bw,sl=M.slots;
  const tile=(k,v,sub)=>'<div class="kt"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+K_IC[k]+'</svg>'
    +'<small>'+esc(t('k_'+k))+'</small><b>'+esc(v)+'</b>'+(sub?'<em>'+esc(sub)+'</em>':'')+'</div>';
  const leave=bw&&sl?clock(sl[bw.a].ms)+(bw.b>bw.a?t('rng')+clock(sl[bw.b].ms):''):t('k_nowin');
  return tile('drive',fmtH(cur.totalH))+tile('dist','~'+Math.round(cur.totalKm)+' '+t('km'))
    +tile('halt',cur.halts.length?pname(cur.halts[0].node):t('k_none'),cur.halts.length?when(msOf(cur.halts[0].arr)):'')+tile('leave',leave);
}
/* model v6 (checked against PWD closures, run in CI on the data pack): worst stretch of this route in the next 24 h */
function v6Html(M){
  const R=st.r24;if(!R||st.src!=='live'||!M||!M.cur)return '';
  let w=null;M.cur.rows.forEach(r=>{const x=R.by[r.seg.id];if(x&&(!w||x[0]>w.x[0]))w={x,seg:r.seg};});
  if(!w)return '';
  const b=w.x[1];
  return '<div class="v6 l'+b+'"><b>'+t(LV[b])+' '+w.x[0]+'</b><span>'+esc(fill(t('v6_line'),{s:segName(w.seg)}))+'</span></div>';
}
function secPaint(){
  const tabs=$('tabs'),sh=$('v-trip');if(!tabs||!st.M||!st.M.cur){if(sh)sh.dataset.sec='none';return;}
  const now=secNow();sh.dataset.sec=now;
  if(!tabs.querySelector('[data-sec]')){
    tabs.insertAdjacentHTML('afterbegin','<button type="button" role="tab" data-sec="over">'+esc(t('sec_over'))+'</button>');
    const r=tabs.querySelector('[data-t="route"]');if(r)r.insertAdjacentHTML('afterend','<button type="button" role="tab" data-sec="when">'+esc(t('sec_when'))+'</button>');
  }
  tabs.querySelectorAll('button').forEach(b=>{const id=b.dataset.sec||b.dataset.t;b.setAttribute('aria-selected',String(id===now));});
  const sel=tabs.querySelector('[aria-selected="true"]');if(sel&&sel.scrollIntoView&&tabs.scrollWidth>tabs.clientWidth)tabs.scrollLeft=sel.offsetLeft-tabs.clientWidth/2+sel.offsetWidth/2;
  if(!$('over-wrap')){const w=document.createElement('div');w.id='over-wrap';w.className='over-wrap';$('routes').before(w);w.append($('routes'),$('traffic'));}
  let k=$('kstats');if(!k){k=document.createElement('div');k.id='kstats';k.className='kstats';$('verdict').after(k);}
  const kh=kstatsHtml(st.M);if(k.innerHTML!==kh)k.innerHTML=kh;
  let v=$('v6line');if(!v){v=document.createElement('div');v.id='v6line';k.after(v);}
  const vh=v6Html(st.M);if(v.innerHTML!==vh)v.innerHTML=vh;v.hidden=!vh;
}
const renderBase11=render;
render=function(){renderBase11();secPaint();};
document.addEventListener('click',e=>{
  const c=e.target.closest('#tabs [data-sec],#tabs [data-t]');if(!c)return;
  if(c.dataset.sec){SEC=c.dataset.sec;st.tab='route';render();}
  else SEC=null; // the app's own handler sets st.tab and redraws
  // bring the section row to the top of the panel so the section that opens is in view (on phones it sits low in the sheet)
  const si=$('sheet-in');if(si)requestAnimationFrame(()=>{const tb=$('tabs');if(!tb)return;const top=Math.max(0,si.scrollTop+tb.getBoundingClientRect().top-si.getBoundingClientRect().top-4);si.scrollTo({top,behavior:calm()?'auto':'smooth'});});
  if(!wideScreen()&&$('v-trip').dataset.snap==='peek')setSnap('half');
},true); // capture: runs before the app's own tab handler redraws the tab row
/* back steps out of a section to the overview before anything else of the trip */
const goBackBase11=goBack;
goBack=function(){
  if(!$('modal').hidden||searchOpen()||condsOpen())return goBackBase11();
  if(st.view==='trip'&&st.tab==='route'&&SEC!=='over'){SEC='over';render();return true;}
  const fromTab=st.view==='trip'&&st.tab!=='route',r=goBackBase11();
  if(r&&fromTab&&st.tab==='route'){SEC='over';render();} // stepping back out of a tab lands on the overview
  return r;
};

/* ================= 2.0 Phase 2: the background trip map on MapLibre (WebGL, src/map/ppmap.js). The app builds GeoJSON
   from the trip and hands it over; the map keeps its layers and only swaps data, so a redraw never rebuilds it. Without
   WebGL (or with ?gl=0) the Leaflet map above stays in charge. ================= */
const GL=!!(window.PPMap&&window.PPMap.supported());
const cssd=(n,d)=>getComputedStyle(document.documentElement).getPropertyValue(n).trim()||d;
let glDirty=true,glC=null;
function glColors(){ // read once per theme change, not on every render
  if(!glDirty&&glC)return glC;glDirty=false;
  glC={land:cssd('--map-land',cssd('--bg','#EDEFE8')),water:cssd('--map-water','#5B8DB8'),muted:cssv('--muted'),ink:cssv('--ink'),surface:cssv('--surface'),
    go:cssv('--go'),cau:cssv('--cau'),avd:cssv('--avd'),goEdge:cssd('--go-edge','#0F4D2F'),cauEdge:cssd('--cau-edge','#8A6400'),avdEdge:cssd('--avd-edge','#7D1F14')};
  glC.dark=(h=>{const m=/^#?([0-9a-f]{6})$/i.exec(h);if(!m)return false;const n=parseInt(m[1],16);return ((n>>16)*.299+((n>>8)&255)*.587+(n&255)*.114)<110;})(glC.surface);
  return glC;
}
if(GL){
  const dirty=()=>{glDirty=true;if(BG.gl){BG.gl.theme(glColors());BG.key='';render();}};
  try{window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',dirty);}catch(e){}
  new MutationObserver(dirty).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
}
const lnglat=g=>g.map(p=>[p[1],p[0]]);
const pt=(lat,lon,props)=>({type:'Feature',properties:props||{},geometry:{type:'Point',coordinates:[lon,lat]}});
const line=(ll,props)=>({type:'Feature',properties:props||{},geometry:{type:'LineString',coordinates:lnglat(ll)}});
function glEnsure(){
  if(BG.gl)return true;
  const el=$('bgmap');if(!el)return false;
  try{
    BG.gl=window.PPMap.create(el,{colors:glColors(),basemap:BASEMAP,attribution:'Natural Earth',tiles:TL||{},onload:()=>bgFit(false),onpopup:()=>{if(!wideScreen()&&$('v-trip').dataset.snap==='full')setSnap('half',true);}});
  }catch(e){BG.gl=null;BG.glFail=true;return false;}
  LM.bgmap={gl:BG.gl}; // PP.mapLines counts its stretches
  if(window.PP)window.PP.glMap=()=>BG.gl&&BG.gl.map; // for the tests
  if(window.ResizeObserver)new ResizeObserver(()=>{if(!BG.gl)return;BG.gl.resize();if(BG.needFit)bgFit(false);}).observe(el);
  BG.gl.set('net',EDGES.filter(e=>!e.virtual).map(e=>line(geomOf(e))));
  el.classList.add('gl');
  return true;
}
function trafficStops(rows){ // fractions of the joined route's length where each stretch starts and ends, with its colour
  const segs=rows.map(r=>{const g=pathOf(r.seg,r.rev);let d=0;for(let i=1;i<g.length;i++)d+=hav(g[i-1][0],g[i-1][1],g[i][0],g[i][1]);return {d,c:cssv('--'+LV[tlvl(r.ci)])};});
  const tot=segs.reduce((s,x)=>s+x.d,0)||1;let at=0;
  return segs.map(x=>{const a=at/tot;at+=x.d;return [a,at/tot,x.c];});
}
const drawBgLeaflet=drawBg;
drawBg=function(M){
  if(!GL||BG.glFail)return drawBgLeaflet(M);
  if(st.view!=='trip'||!M||!M.cur)return;
  if(!glEnsure())return drawBgLeaflet(M);
  const tl=st.layer==='traffic',cur=M.cur,gl=BG.gl;
  const ids=cur.rows.map(r=>r.seg.id+(r.rev?'r':'')).join(',');
  const key=ids+'|'+st.layer+'|'+cur.rows.map(r=>tl?tlvl(r.ci):r.score+(r.blocked?'b':'')).join(',')+'|'+M.plans.length+'|'+st.lang+'|'+cur.halts.map(h=>h.node).join(',')+'|'+ctx().reports.length;
  if(key===BG.key)return;
  const fresh=ids!==BG.ids;BG.key=key;BG.ids=ids;
  gl.mode(tl?'traffic':'risk');
  const alts=[];M.plans.forEach(p=>{if(p===M.sel)return;p.rows.forEach(r=>alts.push(line(pathOf(r.seg,r.rev))));});
  gl.set('alts',alts);
  let w=180,s=90,e=-180,n=-90;
  const route=cur.rows.map(r=>{const sg=r.seg,ll=pathOf(sg,r.rev);ll.forEach(p=>{s=Math.min(s,p[0]);n=Math.max(n,p[0]);w=Math.min(w,p[1]);e=Math.max(e,p[1]);});
    return line(ll,{id:sg.id,lvl:sg.plain?0:lvl(r.score),plain:!!sg.plain,blocked:!tl&&!!r.blocked,len:sg.km||1,pop:stretchPopup(r)});});
  if(fresh)gl.drawOn('route',route);else gl.set('route',route);
  const joined=[];cur.rows.forEach(r=>{const ll=pathOf(r.seg,r.rev);(joined.length?ll.slice(1):ll).forEach(p=>joined.push(p));});
  gl.set('route-trf',joined.length>1?[line(joined)]:[]);gl.setTraffic(trafficStops(cur.rows));
  gl.set('gsi',GSI&&GSI.pts?gsiNear(cur.rows).map(p=>pt(p[0],p[1],{active:!!p[2]})):[]);
  const spots=[];cur.rows.forEach(r=>{const sg=r.seg;if(sg.virtual)return;sg.spots.forEach(sp=>{const p=along(geomOf(sg),sp.f);spots.push(pt(p.lat,p.lon,{pop:'<b>'+esc(nm(sp))+'</b>'}));});});
  gl.set('spots',spots);
  gl.set('reports',ctx().reports.filter(x=>x.type!=='clear'&&cur.rows.some(r=>r.seg.id===x.seg)).map(x=>{const sg=S[x.seg];if(!sg)return null;
    const f=sg.spots[x.spot]?sg.spots[x.spot].f:.5,p=along(geomOf(sg),f);return pt(p.lat,p.lon,{pop:esc(t('t_'+x.type)+' · '+ago(x.ts)+' '+t('ago'))});}).filter(Boolean));
  gl.set('halts',cur.halts.map(h=>{const nd=NODE(h.node);return nd?pt(nd.lat,nd.lon,{pop:esc(t('sf_halts')+': '+pname(h.node))}):null;}).filter(Boolean));
  const a=NODE(M.trip.from),b=NODE(M.trip.to),code=nd=>esc((nd.en||'').replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase());
  gl.markers('stones',[a&&{lngLat:[a.lon,a.lat],className:'stone-ic',title:pname(M.trip.from),html:'<div class="stone"><i></i><b>'+code(a)+'</b></div>',z:1},
    b&&{lngLat:[b.lon,b.lat],className:'stone-ic',title:pname(M.trip.to),html:'<div class="stone end"><i></i><b>'+code(b)+'</b></div>',z:2}].filter(Boolean));
  [a,b].forEach(nd=>{if(nd){s=Math.min(s,nd.lat);n=Math.max(n,nd.lat);w=Math.min(w,nd.lon);e=Math.max(e,nd.lon);}});
  BG.gbounds=w<=e?[[w,s],[e,n]]:null;
  gl.set('pillars',glPillars(M));
  if(fresh){gl.closePopup();bgFit(false);}
};
const bgFitLeaflet=bgFit;
bgFit=function(soft){
  if(!BG.gl)return bgFitLeaflet(soft);
  if(!BG.gbounds||st.view!=='trip')return;
  const p=bgPad(); // extra room for the stones (34 by 42 px, drawn above their point)
  BG.needFit=BG.gl.fit(BG.gbounds,{left:p.tl[0]+20,top:p.tl[1]+40,right:p.br[0]+20,bottom:p.br[1]},soft)===false;
};

/* ================= 2.0 Phase 3: the control room and proof maps on MapLibre too. Same adapter as the trip map; each
   card map is made once per render of its view and the hour slider only swaps the line data (no rebuild per hour).
   Without WebGL the Leaflet code in features.js draws them as before. ================= */
function boundsOf(lls){let w=180,s=90,e=-180,n=-90;lls.forEach(ll=>ll.forEach(p=>{s=Math.min(s,p[0]);n=Math.max(n,p[0]);w=Math.min(w,p[1]);e=Math.max(e,p[1]);}));return w<=e?[[w,s],[e,n]]:null;}
function glCard(id,bounds){
  const el=$(id);if(!el)return null;
  killMap(id);
  let gl;
  try{gl=window.PPMap.create(el,{colors:glColors(),basemap:BASEMAP,attribution:'Natural Earth',tiles:TL||{},scrollZoom:false,zoomControl:true,bounds:bounds||undefined,
    onload:()=>{if(bounds)gl.fit(bounds,{top:16,bottom:16,left:16,right:16});}});}catch(e){return null;}
  el.classList.add('gl');
  LM[id]={gl,map:gl.map};
  if(window.PP&&!window.PP.glMaps)window.PP.glMaps=k=>LM[k]&&LM[k].gl; // for the tests
  if(window.ResizeObserver){let w0=0;new ResizeObserver(()=>{const w=el.clientWidth;if(w===w0||!el.isConnected)return;w0=w;gl.resize();if(bounds)gl.fit(bounds,{top:16,bottom:16,left:16,right:16});}).observe(el);}
  return gl;
}
function glOps(D){
  const b=boundsOf(D.rows.map(r=>geomOf(r.e)));
  const gl=glCard('omap',b);if(!gl)return false;
  gl.set('net',EDGES.filter(e=>!e.virtual&&e.plain).map(e=>line(geomOf(e))));
  gl.set('reports',ctx().reports.filter(x=>x.type!=='clear'&&S[x.seg]).map(x=>{const sg=S[x.seg],f=sg.spots[x.spot]?sg.spots[x.spot].f:.5,p=along(geomOf(sg),f);return pt(p.lat,p.lon,{pop:esc(t('t_'+x.type))});}));
  gl.set('events',OD.events&&OD.events.length&&st.useOD?OD.events.map(p=>pt(p[0],p[1])):[]);
  gl.set('towns',Object.keys(N).filter(id=>{const n=N[id];return n.k==='h'&&!n.foot&&n.stay;}).map(id=>pt(N[id].lat,N[id].lon,{pop:'<b>'+esc(nm(N[id]))+'</b>'})));
  LM.omap.rows=D.rows;
  return true;
}
function opsPop(r,h){const s=r.sc[h],l=lvl(s),x=r.rr[h];
  return '<b>'+esc(segName(r.e))+'</b><br>'+esc(hourLabel(h)+' · '+t(LV[l])+' '+s+'/100 · '+t('rain')+' '+Math.round(x.P24)+'/'+Math.round(edThr(r.e)(24))+' mm'+(x.rw?' · '+t('rep'):''));}
function glOpsHour(D,h){
  const o=LM.omap;if(!o||!o.gl)return;
  o.gl.set('route',D.rows.map(r=>line(geomOf(r.e),{id:r.e.id,lvl:lvl(r.sc[h]),plain:false,pop:opsPop(r,h)})));
}
function glOpsZoom(id){
  const o=LM.omap,e=S[id];if(!o||!o.gl||!e)return;
  const g=geomOf(e),b=boundsOf([g]),r=(o.rows||[]).find(x=>x.e.id===id);
  o.gl.fit(b,{top:40,bottom:40,left:40,right:40},true);
  if(r){const m=along(g,.5);o.gl.popup([m.lon,m.lat],opsPop(r,st.opsH|0));}
}
function glProof(R,ev){
  const closed={};ev.closures.forEach(c=>{(closed[c.link]=closed[c.link]||[]).push(c.place);});
  const rows=R.rows.filter(r=>S[r.id]),b=boundsOf(rows.map(r=>geomOf(S[r.id])));
  const gl=glCard('pmap',b);if(!gl)return false;
  gl.set('route',rows.map(r=>{const e=S[r.id];return line(geomOf(e),{id:r.id,lvl:r.band,plain:false,
    pop:'<b>'+esc(segName(e))+'</b><br>'+esc(t(LV[r.band])+' '+r.score+' · '+String(r.hour).padStart(2,'0')+':00 · 24 h '+r.P24+' mm')});}));
  gl.set('cross',rows.filter(r=>closed[r.id]).map(r=>{const p=along(geomOf(S[r.id]),.5);return pt(p.lat,p.lon,{pop:esc(closed[r.id].join('; '))});}));
  return true;
}
if(GL){ // a theme change repaints the card maps too
  const re=()=>{['omap','pmap'].forEach(id=>{const o=LM[id];if(o&&o.gl&&o.gl.map.getContainer().isConnected)o.gl.theme(glColors());});};
  try{window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>setTimeout(re));}catch(e){}
  new MutationObserver(()=>setTimeout(re)).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
}

/* ================= 2.0 Phase 4: offline map files (src/map/ppmap.js reads them). On the web site they sit in tiles/
   next to the page and "Save map for offline" keeps whole copies in the browser (the service worker answers the map's
   Range requests from that copy); in the Android app they ship inside the APK. A copy opened from a file has no tiles/
   folder, so it keeps the built-in simple base map. ================= */
Object.assign(T.en,{sh_3d:'3D terrain',sh_save:'Save map for offline',sv_busy:'Saving the map: {p}%',sv_done:'Map saved. It now works with no signal.',sv_err:'Could not save the map ({e})',sv_space:'Not enough space on this phone for the map'});
Object.assign(T.hi,{sh_3d:'3D पहाड़',sh_save:'नक्शा ऑफ़लाइन के लिए सहेजें',sv_busy:'नक्शा सहेजा जा रहा है: {p}%',sv_done:'नक्शा सहेज लिया। अब बिना सिग्नल भी चलेगा।',sv_err:'नक्शा सहेजा नहीं जा सका ({e})',sv_space:'इस फ़ोन में नक्शे के लिए जगह कम है'});
let TL=null; // {base, dem, files, manifest, web, saved} once the manifest is read
const TILE_ROOT=/^https?:$/.test(location.protocol)?location.href.replace(/[?#].*$/,'').replace(/[^/]*$/,''):null;
const TILE_CACHE='pp-tiles';
function tilesFound(t){
  TL=t;
  if(BG.gl)BG.gl.tiles(t);
  ['omap','pmap'].forEach(id=>{const o=LM[id];if(o&&o.gl)o.gl.tiles(t);});
  if(st.M)render();
}
async function tilesSaved(){
  try{if(!window.caches||!TL||!TL.files.length)return false;const c=await caches.open(TILE_CACHE);for(const u of TL.files)if(!await c.match(u))return false;return true;}catch(e){return false;}
}
if(GL&&TILE_ROOT){
  window.PPMap.loadTiles(TILE_ROOT).then(async t=>{
    if(!t)return;
    t.web=!window.PPAndroid&&t.files.length>0; // the APK carries its tiles; only the web site offers to save them
    TL=t;t.saved=await tilesSaved();tilesFound(t);
  });
}
let saving=false;
async function saveTiles(){
  if(saving||!TL||!window.caches)return;
  saving=true;
  const files=TL.files.slice();
  try{
    if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
    const c=await caches.open(TILE_CACHE);
    const sizes=[],bodies=[];let got=0,total=0;
    const rs=await Promise.all(files.map(u=>fetch(u,{cache:'no-store'})));
    rs.forEach(r=>{if(!r.ok)throw new Error('HTTP '+r.status);const n=+r.headers.get('content-length')||0;sizes.push(n);total+=n;});
    if(navigator.storage&&navigator.storage.estimate){const e=await navigator.storage.estimate();if(e.quota&&e.usage!=null&&e.quota-e.usage<total*1.1){toast(t('sv_space'));saving=false;return;}}
    let last=-1;
    for(let i=0;i<rs.length;i++){
      const rd=rs[i].body.getReader(),parts=[];
      for(;;){const {done,value}=await rd.read();if(done)break;parts.push(value);got+=value.length;
        const p=total?Math.floor(got*100/total):0;if(p!==last&&p%5===0){last=p;toast(fill(t('sv_busy'),{p}));}}
      bodies.push(new Blob(parts));
    }
    await c.add(new Request(TL.manifest,{cache:'no-cache'})); // the manifest too, so a reload with no signal finds the files
    for(let i=0;i<files.length;i++)await c.put(files[i],new Response(bodies[i],{headers:{'Content-Type':'application/octet-stream','Content-Length':String(bodies[i].size)}}));
    TL.saved=true;toast(t('sv_done'));render();
  }catch(e){toast(fill(t('sv_err'),{e:String(e&&e.name==='QuotaExceededError'?t('sv_space'):(e.message||e))}));}
  saving=false;
}

/* ================= 2.0 Phase 5: motion. The map side (glow under the route, hazard tape on Avoid stretches, a ring on
   the picked stretch, 3D pillars) is in src/map/ppmap.js; here: the pillars' data, tapping a stretch in the list flies
   the map to it, and the sheet and buttons get their small movements (src/shell.css). Reduced motion turns all of it
   into plain cuts. ================= */
Object.assign(T.en,{pl_halt:'Night halt',pl_fuel:'Fuel, mapped within 3 km: {n}',pl_hosp:'Hospitals, mapped within 3 km: {n}'});
Object.assign(T.hi,{pl_halt:'रात का पड़ाव',pl_fuel:'पेट्रोल पंप, 3 किमी के भीतर दर्ज: {n}',pl_hosp:'अस्पताल, 3 किमी के भीतर दर्ज: {n}'});
function glPillars(M){
  const out=[],sq=(lat,lon,dx,kind,h,pop)=>{const r=.0032,c=Math.cos(lat*Math.PI/180),x=lon+dx*r*2.6/c;
    out.push({type:'Feature',properties:{kind,h,b:0,pop},geometry:{type:'Polygon',coordinates:[[[x-r/c,lat-r],[x+r/c,lat-r],[x+r/c,lat+r],[x-r/c,lat+r],[x-r/c,lat-r]]]}});};
  if(!M||!M.cur)return out;
  M.cur.halts.forEach(h=>{const n=NODE(h.node);if(n)sq(n.lat,n.lon,0,'halt',2600,esc(t('pl_halt')+': '+pname(h.node)));});
  if(typeof tripTowns==='function'&&typeof stopsAt==='function')tripTowns(M.cur).forEach(x=>{const n=NODE(x.id),s=stopsAt(x.id);if(!n||!s)return;
    [['fuel',-1],['hosp',1]].forEach(([k,dx])=>{const c=s[k]&&s[k][0];if(c)sq(n.lat,n.lon,dx,k,Math.min(2400,600+c*300),esc(pname(x.id)+': '+fill(t('pl_'+k),{n:c})));});});
  return out;
}
document.addEventListener('click',e=>{
  const sg=e.target.closest('#v-trip .seg:not(.ft)');if(!sg||!BG.gl||!st.M||!st.M.cur)return;
  const all=[...document.querySelectorAll('#v-trip .seg:not(.ft)')],i=all.indexOf(sg),r=st.M.cur.rows[i];if(!r)return;
  if(!wideScreen()&&$('v-trip').dataset.snap==='full')setSnap('half',true);
  setTimeout(()=>{const p=bgPad();BG.gl.focus(r.seg.id,{left:p.tl[0]+20,top:p.tl[1]+40,right:p.br[0]+20,bottom:p.br[1]});},wideScreen()?0:320);
  all.forEach(x=>x.classList.toggle('picked',x===sg));
});

/* ================= 2.0 Phase 6: offline UX. The status line says how fresh the forecast is (live, saved under 12 h,
   12 h to 3 days, older; simulated and replayed weather carry a DEMO DATA badge); a thin bar runs under the top bar
   while a forecast is fetched (pp:sync from core.js); reports waiting for a signal show as a chip with a count
   (pp:outbox from features2.js); and one toast says when a sync or a send finished. ================= */
Object.assign(T.en,{ob_wait1:'1 report waiting for signal',ob_waitn:'{n} reports waiting for signal',ob_send:'Sending reports: {i} of {n}',ob_sent1:'Your report was sent',ob_sentn:'{n} reports sent',
  sy_done:'Forecast updated, {t} IST',sy_err:'Could not update the forecast. Using the last saved one.',demo_b:'DEMO DATA',fr_live:'live',fr_fresh:'saved under 12 h ago',fr_aging:'saved 12 h to 3 days ago',fr_old:'more than 3 days old',fr_demo:'demo data, not a forecast'});
Object.assign(T.hi,{ob_wait1:'1 रिपोर्ट सिग्नल की राह में',ob_waitn:'{n} रिपोर्ट सिग्नल की राह में',ob_send:'रिपोर्ट भेजी जा रही हैं: {n} में से {i}',ob_sent1:'आपकी रिपोर्ट भेज दी गई',ob_sentn:'{n} रिपोर्ट भेज दी गईं',
  sy_done:'पूर्वानुमान अपडेट हुआ, {t} IST',sy_err:'पूर्वानुमान अपडेट नहीं हुआ। आख़िरी सहेजा पूर्वानुमान चल रहा है।',demo_b:'डेमो डेटा',fr_live:'लाइव',fr_fresh:'12 घंटे के भीतर सहेजा',fr_aging:'12 घंटे से 3 दिन पहले सहेजा',fr_old:'3 दिन से पुराना',fr_demo:'डेमो डेटा, पूर्वानुमान नहीं'});
function dataAge(){
  if(st.src==='sim'||st.src==='replay'||(st.scn&&st.scn.startsWith('rp:')))return 'demo';
  if(st.src==='none')return 'old';
  const ts=st.src==='live'?(st.made||st.dataTs):(st.cacheMade||st.cacheTs);
  const h=ts?(Date.now()-ts)/3600e3:1e9;
  if(st.src==='live'&&h<6)return 'live';
  return h<12?'fresh':h<72?'aging':'old';
}
let SY={busy:false,afterOnline:false},OB={waiting:0,sending:false,sent:0,total:0,shown:0};
function ppStatus(){
  const a=dataAge(),c=$('srcchip');if(!c)return;
  c.dataset.age=a;
  $('dot').className='dot '+a+(a==='live'?' live':'');
  const d=$('demob');d.hidden=a!=='demo';d.textContent=t('demo_b');
  c.dataset.ageText=t('fr_'+a);
  const ob=$('obchip');
  if(OB.sending&&OB.total){ob.hidden=false;ob.className='obchip busy';ob.textContent=fill(t('ob_send'),{i:Math.min(OB.total,OB.sent+1),n:OB.total});}
  else if(OB.waiting){ob.hidden=false;ob.className='obchip';ob.innerHTML='<b>'+OB.waiting+'</b>'+esc(OB.waiting===1?t('ob_wait1'):fill(t('ob_waitn'),{n:OB.waiting}));}
  else ob.hidden=true;
  $('syncbar').hidden=!SY.busy;
}
const renderBaseP6=render;
render=function(){renderBaseP6();ppStatus();};
window.addEventListener('online',()=>{SY.afterOnline=true;});
window.addEventListener('pp:sync',e=>{const d=e.detail||{};
  if(d.phase==='start'){SY.busy=true;}
  else if(d.phase==='done'||d.phase==='error'){SY.busy=false;
    if(SY.afterOnline){SY.afterOnline=false;toast(d.phase==='done'&&d.source!=='saved'?fill(t('sy_done'),{t:clock(d.made||Date.now())}):t('sy_err'));}}
  ppStatus();});
window.addEventListener('pp:outbox',e=>{const d=e.detail||{},was=OB.sending;
  OB=Object.assign(OB,{waiting:d.waiting|0,sending:!!d.sending,sent:d.sent|0,total:d.total|0});
  if(was&&!OB.sending&&OB.sent>0&&OB.shown!==OB.sent+'/'+OB.total){OB.shown=OB.sent+'/'+OB.total;toast(OB.sent===1?t('ob_sent1'):fill(t('ob_sentn'),{n:OB.sent}));}
  ppStatus();});
document.addEventListener('click',e=>{if(e.target.closest('#obchip')){st.view='trip';st.tab='reports';SEC=null;render();}});

/* ================= 2.0 Phase 7: the voice loop. A bar shows the words as they are heard (the browser's interim
   results, or the Android app's partial results through PP.onSpeechPartial), the trip they parse to as chips (From,
   To, Date, Time; tap one to change it), and when no destination is found, the nearest place names to pick from.
   A spoken trip is still planned as soon as the final words arrive, as before; the bar says what was understood. ========== */
Object.assign(T.en,{vb_listen:'Listening…',vb_heard:'Understood',vb_none:'No destination heard. Did you mean:',vb_again:'Speak again',vb_done:'Done',vb_close:'Close',
  vb_from:'From',vb_to:'To',vb_date:'Date',vb_time:'Time',vb_edit:'Tap to change',vb_tryp:'Try saying: Delhi to Kedarnath tomorrow 6 am',vb_err:'Could not hear that. Check the microphone and try again.'});
Object.assign(T.hi,{vb_listen:'सुन रहे हैं…',vb_heard:'समझा',vb_none:'मंज़िल सुनाई नहीं दी। क्या आपका मतलब था:',vb_again:'फिर से बोलें',vb_done:'ठीक है',vb_close:'बंद करें',
  vb_from:'कहाँ से',vb_to:'कहाँ तक',vb_date:'तारीख़',vb_time:'समय',vb_edit:'बदलने के लिए छुएँ',vb_tryp:'ऐसे बोलें: दिल्ली से केदारनाथ कल सुबह 6 बजे',vb_err:'सुनाई नहीं दिया। माइक जाँचें और फिर कोशिश करें।'});
const VB={on:false,said:'',final:false,timer:0,rec:null};
function lev(a,b){if(a===b)return 0;const m=a.length,n=b.length;if(!m||!n)return m||n;let p=Array.from({length:n+1},(_,j)=>j);
  for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c;}return p[n];}
/* places whose name is closest to any word (or word pair) heard: for "kedarnat" or "badrinat" or a half-heard name */
function nearPlaces(text,k){
  const words=String(text||'').toLowerCase().replace(/[.,!?।]/g,' ').split(/\s+/).filter(w=>w.length>=3);
  const grams=words.concat(words.slice(1).map((w,i)=>words[i]+' '+w));
  const best={};
  Object.keys(N).forEach(id=>{const n=N[id];if(n.virtual||n.foot)return;
    [n.en.split(' (')[0].toLowerCase(),n.hi].filter(Boolean).forEach(name=>{grams.forEach(g=>{const d=lev(g,name)/Math.max(name.length,g.length);if(d<=.42&&(best[id]==null||d<best[id]))best[id]=d;});});});
  return Object.keys(best).sort((a,b)=>best[a]-best[b]).slice(0,k||3);
}
function vbChip(kind,label,val){return '<button type="button" class="vb-chip" data-vbe="'+kind+'" aria-label="'+esc(label+': '+val+'. '+t('vb_edit'))+'"><small>'+esc(label)+'</small><b>'+esc(val)+'</b></button>';}
function vbDraw(){
  const said=VB.said,a=said?parseAsk(said):{};
  $('vb-h').textContent=VB.final?t('vb_heard'):t('vb_listen');
  $('vbar').classList.toggle('live',!VB.final);
  $('vb-said').textContent=said?'“'+said+'”':t('vb_tryp');
  let ch='';
  if(a.from||(VB.final&&a.to))ch+=vbChip('from',t('vb_from'),pname(a.from||st.from));
  if(a.to)ch+=vbChip('to',t('vb_to'),pname(a.to));
  if(a.date!=null||(VB.final&&a.to))ch+=vbChip('date',t('vb_date'),fmtDate(a.date!=null?a.date:st.dateIdx));
  if(a.dep!=null)ch+=vbChip('time',t('vb_time'),String(a.dep).padStart(2,'0')+':00');
  if(VB.final&&!a.to){const near=nearPlaces(said);ch='<p class="vb-none">'+esc(t('vb_none'))+'</p>'+near.map(id=>'<button type="button" class="vb-chip near" data-vbto="'+id+'"><b>'+esc(pname(id))+'</b></button>').join('');}
  $('vb-chips').innerHTML=ch;
  $('vb-acts').innerHTML=VB.final?'<button class="btn" type="button" id="vb-again">'+esc(t('vb_again'))+'</button><button class="btn pri" type="button" id="vb-ok">'+esc(t('vb_done'))+'</button>':'';
  $('vb-x').setAttribute('aria-label',t('vb_close'));$('vb-x').title=t('vb_close');
}
function vbOpen(){clearTimeout(VB.timer);VB.on=true;VB.final=false;VB.said='';$('vbar').hidden=false;vbDraw();}
function vbClose(){clearTimeout(VB.timer);VB.on=false;$('vbar').hidden=true;if(VB.rec){try{VB.rec.abort();}catch(e){}VB.rec=null;}$('b-mic').classList.remove('on');}
function vbPartial(text){if(!VB.on)vbOpen();VB.said=String(text||'');VB.final=false;vbDraw();}
function vbFinal(text){if(!VB.on)vbOpen();VB.said=String(text||'');VB.final=true;vbDraw();
  $('toast').hidden=true; // the bar already says what was understood
  const ok=$('vb-ok')||$('vb-again');if(ok&&!('ontouchstart' in window))ok.focus();}
/* the browser's own recogniser, with interim results */
function vlisten(){
  if(!SR)return;
  if(VB.rec){vbClose();return;}
  const r=new SR();r.lang=st.lang==='hi'?'hi-IN':'en-IN';r.interimResults=true;r.maxAlternatives=3;r.continuous=false;VB.rec=r;
  $('b-mic').classList.add('on');vbOpen();
  let done=false;
  r.onresult=e=>{let txt='',fin=false;for(let i=0;i<e.results.length;i++){txt+=e.results[i][0].transcript;if(e.results[i].isFinal)fin=true;}
    if(!fin){vbPartial(txt);return;}
    done=true;const alts=[...e.results[e.results.length-1]].map(x=>x.transcript);
    const best=alts.find(x=>{const a=parseAsk(x);return a.to;})||txt;
    $('in-ask').value=best;if(parseAsk(best).to)applyAsk(best);vbFinal(best);};
  r.onerror=e=>{done=true;if(e&&e.error!=='aborted'){VB.final=true;VB.said='';vbDraw();$('vb-said').textContent=t('vb_err');}};
  r.onend=()=>{VB.rec=null;$('b-mic').classList.remove('on');if(!done&&VB.on){VB.final=true;vbDraw();}};
  try{r.start();}catch(e){VB.rec=null;$('b-mic').classList.remove('on');}
}
if(!nativeListen&&SR){$('b-mic').removeEventListener('click',listen);$('b-mic').addEventListener('click',vlisten);}
if(nativeListen)$('b-mic').addEventListener('click',()=>vbOpen()); // features6 starts the phone's recogniser
/* Android: the final words come through PP.onSpeech (features6 plans the trip); show them in the bar too */
const onSpeechBase=onSpeech;
onSpeech=function(alts,err){
  onSpeechBase(alts,err);
  if(!alts||!alts.length){if(VB.on){VB.final=true;VB.said='';vbDraw();$('vb-said').textContent=t('vb_err');}return;}
  vbFinal($('in-ask').value||alts[0]);
};
document.addEventListener('click',e=>{
  const c=e.target.closest('#vb-x,#vb-ok,#vb-again,[data-vbe],[data-vbto]');if(!c)return;
  if(c.id==='vb-x'||c.id==='vb-ok'){vbClose();return;}
  if(c.id==='vb-again'){vbClose();$('b-mic').click();return;}
  if(c.dataset.vbto){vbClose();const said=VB.said;st.to=c.dataset.vbto;const a=parseAsk(said);if(a.from&&a.from!==st.to)st.from=a.from;st.pmsg=null;st.pick=null;render();toast(fill(t('ask_ok'),{x:pname(st.from)+' → '+pname(st.to)}));return;}
  const k=c.dataset.vbe,f={from:'in-from',to:'in-to',date:'in-date',time:'in-dep'}[k];
  vbClose();openSearch();setTimeout(()=>{const el=$(f);if(el){el.focus();if(el.select&&el.type==='text')el.select();}},260);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&VB.on)vbClose();});
queueMicrotask(()=>{if(window.PP)window.PP.onSpeechPartial=vbPartial;});

/* ================= 2.0 Phase 7: accessibility. Every view passes axe (WCAG 2.1 A and AA): the search fields keep their
   labels when the search was never opened, the status line's name starts with what it shows, and wide tables or the
   advisory text that scroll sideways can be reached and scrolled with the keyboard. ================= */
function a11yPass(){
  if(!$('l-from').textContent){$('l-from').textContent=t('f_from');$('l-to').textContent=t('f_to');$('l-date').textContent=t('f_date');$('l-dep').textContent=t('f_dep');}
  [['b-mic','ask_mic'],['swap','swap']].forEach(([id,k])=>{const b=$(id);if(b&&!b.getAttribute('aria-label')){b.setAttribute('aria-label',t(k));b.title=t(k);}});
  const ask=$('in-ask');if(ask)ask.setAttribute('aria-label',t('ask_mic'));
  const c=$('srcchip');if(c){c.removeAttribute('aria-label'); // its name is what it shows, then (for screen readers only) how fresh and what it opens
    let v=$('srcvh');if(!v){v=document.createElement('span');v.id='srcvh';v.className='vh';c.appendChild(v);}
    v.textContent=' · '+(c.dataset.ageText||'')+' · '+t('sh_conds');}
  document.querySelectorAll('#v-ops .wrap,#v-proof .wrap,#v-trip .wrap,#adv').forEach(el=>{
    if(el.tabIndex>=0)return;
    el.tabIndex=0;el.setAttribute('role','region');
    const h=el.closest('.card')&&el.closest('.card').querySelector('h3');el.setAttribute('aria-label',h?h.textContent:t('sh_conds'));
  });
}
const renderBaseP7=render;
render=function(){renderBaseP7();a11yPass();};
if(window.MutationObserver){let q=0;const mo=new MutationObserver(()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;a11yPass();});});
  ['v-ops','v-proof','v-trip'].forEach(id=>{const el=$(id);if(el)mo.observe(el,{childList:true,subtree:false});});}
