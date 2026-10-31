/* ================= v10: app shell. Map-first layout like a navigation app: the route map fills the screen, the trip
   search slides down from the top bar, results sit in a sheet that drags between peek, half and full (a side panel on
   wide screens), quick actions float over the map, and the views live in a bottom bar. Every id the rest of the app
   renders into is unchanged; this file only places them and adds the map, the sheet and the motion. ================= */
Object.assign(T.en,{
  sh_go:'Show route',sh_edit:'Change trip',sh_layer:'Risk or traffic colours',sh_fit:'Show the whole route',sh_where:'Where am I on this trip?',
  sh_sos:'SOS',sh_sheet:'Drag to see more or less',sh_conds:'Forecast and traffic settings',sh_map:'Route map',
  nav_trip:'Plan',nav_ops:'Control room',nav_proof:'Proof'
});
Object.assign(T.hi,{
  sh_go:'रास्ता दिखाएँ',sh_edit:'यात्रा बदलें',sh_layer:'जोखिम या ट्रैफ़िक के रंग',sh_fit:'पूरा रास्ता दिखाएँ',sh_where:'इस यात्रा में मैं कहाँ हूँ?',
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
  const tripV=st.view==='trip';if(!tripV){closeSearch();if(condsOpen())toggleConds(false);}$('bgmap').hidden=!tripV;$('fabs').hidden=$('fabs-top').hidden=!tripV||!(st.M&&st.M.cur);
  document.documentElement.style.setProperty('--topbar-h',Math.round($('app').querySelector('.topbar').getBoundingClientRect().height)+'px');
  if(tripV){const sh=$('v-trip');if(!document.documentElement.style.getPropertyValue('--sheet-h'))setSnap(sh.dataset.snap||'half',true);drawBg(st.M);}
};
document.addEventListener('click',e=>{
  const c=e.target.closest('#qsum,#search-go,#scrim,#srcchip,#fab-layer,#fab-fit,#fab-where,#fab-sos,[data-pre]');if(!c)return;
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
}
const renderBase11=render;
render=function(){renderBase11();secPaint();};
document.addEventListener('click',e=>{
  const c=e.target.closest('#tabs [data-sec],#tabs [data-t]');if(!c)return;
  if(c.dataset.sec){SEC=c.dataset.sec;st.tab='route';render();}
  else SEC=null; // the app's own handler sets st.tab and redraws
  const si=$('sheet-in');if(si){const top=$('tabs').offsetTop-8;if(si.scrollTop>top)si.scrollTo({top,behavior:calm()?'auto':'smooth'});}
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
