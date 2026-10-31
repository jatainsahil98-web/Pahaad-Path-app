/* ================= v7: roads PWD reports closed (SRMD report, morning and evening in the monsoon), carried in the data pack ================= */
Object.assign(T.en,{
  cl_t:'Roads reported closed (PWD Uttarakhand)',
  cl_s:'PWD {slot} report of {d}: {n} roads closed in districts on this trip ({list}). The report names closed roads, not the spot, so PahaadPath does not mark its own stretches closed. Most are village roads. Call 1070 or the district control room 1077 before you set out.',
  cl_none:'PWD {slot} report of {d}: no closed road in the districts on this trip.',
  cl_near:'Closed roads that name a town on your route',cl_main:'Main roads closed in these districts',
  cl_row:'{dist}, {ty}. Closed since {c}{e}.',cl_e:', expected to open {e}',cl_pdf:'Full report (PDF)',
  cl_morning:'morning',cl_evening:'evening',
  cl_ty:{NH:'national highway',SH:'state highway',MDR:'district road',ODR:'district road',VR:'village road',LVR:'village road',OR:'road'}
});
Object.assign(T.hi,{
  cl_t:'बंद सड़कें (लोक निर्माण विभाग उत्तराखंड)',
  cl_s:'लोक निर्माण विभाग की {d} की {slot} रिपोर्ट: इस यात्रा के ज़िलों ({list}) में {n} सड़कें बंद। रिपोर्ट बंद सड़क का नाम बताती है, जगह नहीं, इसलिए पहाड़ पथ अपने हिस्सों को बंद नहीं दिखाता। ज़्यादातर गाँव की सड़कें हैं। निकलने से पहले 1070 या ज़िला नियंत्रण कक्ष 1077 पर फ़ोन करें।',
  cl_none:'लोक निर्माण विभाग की {d} की {slot} रिपोर्ट: इस यात्रा के ज़िलों में कोई सड़क बंद नहीं।',
  cl_near:'बंद सड़कें जिनके नाम में आपके रास्ते का शहर है',cl_main:'इन ज़िलों में बंद मुख्य सड़कें',
  cl_row:'{dist}, {ty}। {c} से बंद{e}।',cl_e:', खुलने का अनुमान {e}',cl_pdf:'पूरी रिपोर्ट (PDF)',
  cl_morning:'सुबह की',cl_evening:'शाम की',
  cl_ty:{NH:'राष्ट्रीय राजमार्ग',SH:'राज्य मार्ग',MDR:'ज़िला सड़क',ODR:'ज़िला सड़क',VR:'गाँव की सड़क',LVR:'गाँव की सड़क',OR:'सड़क'}
});
const CL_KEEP_H=36,CL_SLOT_H={morning:10,evening:17}; // same as python/pahaadpath/closures.py
const CL_DIST_HI={Almora:'अल्मोड़ा',Bageshwar:'बागेश्वर',Chamoli:'चमोली',Champawat:'चंपावत',Dehradun:'देहरादून',Haridwar:'हरिद्वार',Nainital:'नैनीताल',
  Pauri:'पौड़ी',Pithoragarh:'पिथौरागढ़',Rudraprayag:'रुद्रप्रयाग',Tehri:'टिहरी','Udham Singh Nagar':'ऊधम सिंह नगर',Uttarkashi:'उत्तरकाशी'};
const clDist=d=>st.lang==='hi'&&CL_DIST_HI[d]?CL_DIST_HI[d]:d;
function clTime(s){
  if(!s)return '';const ms=Date.parse(s.length>10?s+':00+05:30':s+'T12:00:00+05:30');if(!(ms>0))return s;
  const o={day:'numeric',month:'short',timeZone:'Asia/Kolkata'};if(s.length>10)Object.assign(o,{hour:'2-digit',minute:'2-digit',hour12:false});
  return new Date(ms).toLocaleString(st.lang==='hi'?'hi-IN':'en-IN',o);
}
function clFresh(){
  const c=st.closures;if(!c||!Array.isArray(c.roads)||!c.date)return null;
  const at=Date.parse(c.date+'T'+String(CL_SLOT_H[c.slot]||12).padStart(2,'0')+':00:00+05:30');
  return at>0&&Date.now()-at<CL_KEEP_H*3600e3&&at-Date.now()<12*3600e3?c:null;
}
function closuresHtml(M){
  const c=clFresh();if(!c||!M||!M.cur||(st.src!=='live'&&st.src!=='cache'))return '';
  const towns=tripTowns(M.cur).map(x=>x.id),dist=c.dist||{};
  const ds=[...new Set(towns.map(id=>dist[id]).filter(Boolean))];if(!ds.length)return '';
  const inD=c.roads.filter(r=>ds.includes(r.d)),slot=t('cl_'+c.slot)||c.slot,d=clTime(c.date);
  let h='<h3>'+t('cl_t')+'</h3>';
  if(!inD.length&&!ds.some(x=>c.per&&c.per[x]))return h+'<p class="note">'+esc(fill(t('cl_none'),{slot,d}))+'</p>';
  const cnt=x=>c.per&&c.per[x]!=null?c.per[x]:inD.filter(r=>r.d===x).length; // per: counted before the pack cut the list short
  const per=ds.filter(cnt).map(x=>clDist(x)+' '+cnt(x)),n=ds.reduce((s,x)=>s+cnt(x),0);
  h+='<p class="note">'+esc(fill(t('cl_s'),{slot,d,n,list:per.join(', ')}))+'</p>';
  const near=inD.filter(r=>(r.near||[]).some(id=>towns.includes(id)));
  const main=inD.filter(r=>!near.includes(r)&&['NH','SH','MDR'].includes(r.ty));
  const row=r=>'<div class="al"><p><b>'+esc(r.n)+'</b></p><p class="note">'+esc(fill(t('cl_row'),{dist:clDist(r.d),ty:t('cl_ty')[r.ty]||r.ty,c:clTime(r.c),e:r.e?fill(t('cl_e'),{e:clTime(r.e)}):''}))+'</p></div>';
  if(near.length)h+='<h4 class="sec">'+t('cl_near')+'</h4>'+near.slice(0,5).map(row).join('');
  if(main.length)h+='<h4 class="sec">'+t('cl_main')+'</h4>'+main.slice(0,5).map(row).join('');
  if(/^https:\/\//.test(c.url||''))h+='<p class="note"><a href="'+esc(c.url)+'" target="_blank" rel="noopener noreferrer">'+t('cl_pdf')+'</a></p>';
  return h;
}
const renderV6=render;
render=function(){
  renderV6();
  let box=$('closures');
  if(!box){box=document.createElement('section');box.id='closures';box.className='card';$('routes').before(box);}
  const h=st.view==='trip'?closuresHtml(st.M):'';box.innerHTML=h;box.hidden=!h;
};
