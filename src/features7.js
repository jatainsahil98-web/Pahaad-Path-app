/* ================= v2: Transport, public transport for the planned trip (replaces Proof in the bottom bar) ================= */
/* There is no live timetable feed for Uttarakhand's buses or shared jeeps, so this screen tells people which services run on
   their route, where they start, how to choose between them and where to book; times are general guidance, never a
   timetable. Official booking sites only (fake Kedarnath helicopter sites are a known scam). */
Object.assign(T.en,{
  nav_transport:'Transport',
  tr_t:'Getting there by bus, train or shared jeep',tr_none:'Plan a trip first: Transport shows the services for that route.',tr_plan:'Plan a trip',
  tr_for:'{a} → {b}',tr_risk:'Landslide risk on this route is {l} on the day you chose ({s}). Buses and jeeps on that stretch may be held or cancelled: ask at the stand before you set off.',
  tr_closed:'PWD reports a road closed on this route today. Services may not run through until it opens.',
  tr_train:'Train to {r}',tr_train_s:'The nearest railway station for this route. From the station, continue by bus or shared jeep from the bus stand.',tr_train_b:'Book trains (IRCTC)',
  tr_train_none:'No railway station on or near this route: start by bus from {r}.',
  tr_utc:'Uttarakhand Roadways (UTC)',tr_utc_s:'Government buses from Delhi, Dehradun, Haridwar, Rishikesh and Haldwani to the main hill towns. Book seats online for long routes; hill routes are often bought at the counter.',tr_utc_b:'Book on UTC',
  tr_gmou:'GMOU buses (Garhwal)',tr_gmou_s:'The Garhwal Motor Owners Union runs most buses into the Garhwal hills (Badrinath, Kedarnath, Gangotri, Yamunotri routes), mainly from Rishikesh, Haridwar and Dehradun. Hill buses leave early, mostly between 4 and 7 in the morning.',tr_gmou_b:'GMOU timings and booking',
  tr_kmou:'KMOU buses (Kumaon)',tr_kmou_s:'The Kumaon Motor Owners Union runs buses into the Kumaon hills (Nainital, Almora, Pithoragarh, Bageshwar, Munsiyari) from Haldwani, Kathgodam and Ramnagar. Tickets at the KMOU counters at those bus stands.',
  tr_pvt:'Private buses',tr_pvt_s:'Private operators also run between the plains and the main hill towns. Compare times and seats on a booking site.',tr_pvt_b:'Compare on redBus',
  tr_jeep:'Shared jeeps and taxis',tr_jeep_s:'Shared jeeps (Sumo, Max) leave from stands in {h} when full and reach villages buses do not. Faster than the bus, a little dearer; a private taxi costs the most and leaves when you want. Agree the fare before you start.',
  tr_heli:'Helicopter to Kedarnath',tr_heli_s:'Seasonal shuttles from Phata, Sersi and Guptkashi. Book only on the official IRCTC Heli Yatra site: other sites selling Kedarnath helicopter tickets are often fake. Flights stop in bad weather.',tr_heli_b:'IRCTC Heli Yatra (official)',
  tr_reg:'Char Dham registration',tr_reg_s:'Pilgrims to Kedarnath, Badrinath, Gangotri and Yamunotri must register with the Uttarakhand government before travelling.',tr_reg_b:'Register (official)',
  tr_how:'How to choose',tr_how_l:['Bus: cheapest and safest in rain; few departures, mostly early morning; no night service on hill roads.','Shared jeep: more departures and smaller towns; leaves when full; keep luggage light.','Private taxi: your own time and stops; most expensive; pick a driver who knows the hill road.','Train: only to the foothills; plan the road part to start early so the hill stretch is done in daylight.','Helicopter: Kedarnath season only; weather decides; book only on the official site.','In heavy rain or after a landslide warning, buses are held at the base towns: wait for the road to open rather than switching to a taxi that pushes on.'],
  tr_note:'Times are general guidance, not a timetable. Confirm at the bus stand or with the operator.',tr_open:'Opens the official site'
});
Object.assign(T.hi,{
  nav_transport:'परिवहन',
  tr_t:'बस, ट्रेन या साझा जीप से कैसे पहुँचें',tr_none:'पहले यात्रा की योजना बनाएँ: परिवहन उसी रास्ते की सेवाएँ दिखाता है।',tr_plan:'यात्रा की योजना बनाएँ',
  tr_for:'{a} → {b}',tr_risk:'चुने गए दिन इस रास्ते पर भूस्खलन जोखिम {l} है ({s})। उस हिस्से पर बसें और जीप रोकी या रद्द की जा सकती हैं: निकलने से पहले स्टैंड पर पूछें।',
  tr_closed:'PWD के अनुसार आज इस रास्ते पर एक सड़क बंद है। खुलने तक सेवाएँ आगे नहीं जा सकतीं।',
  tr_train:'{r} तक ट्रेन',tr_train_s:'इस रास्ते का सबसे नज़दीकी रेलवे स्टेशन। स्टेशन से आगे बस अड्डे से बस या साझा जीप लें।',tr_train_b:'ट्रेन बुक करें (IRCTC)',
  tr_train_none:'इस रास्ते पर या पास कोई रेलवे स्टेशन नहीं: {r} से बस से शुरू करें।',
  tr_utc:'उत्तराखंड रोडवेज़ (UTC)',tr_utc_s:'दिल्ली, देहरादून, हरिद्वार, ऋषिकेश और हल्द्वानी से मुख्य पहाड़ी शहरों तक सरकारी बसें। लंबे रास्तों की सीट ऑनलाइन बुक करें; पहाड़ी रास्तों के टिकट अक्सर काउंटर पर मिलते हैं।',tr_utc_b:'UTC पर बुक करें',
  tr_gmou:'GMOU बसें (गढ़वाल)',tr_gmou_s:'गढ़वाल मोटर ओनर्स यूनियन गढ़वाल की पहाड़ियों (बद्रीनाथ, केदारनाथ, गंगोत्री, यमुनोत्री मार्ग) की ज़्यादातर बसें चलाती है, मुख्यतः ऋषिकेश, हरिद्वार और देहरादून से। पहाड़ी बसें जल्दी निकलती हैं, ज़्यादातर सुबह 4 से 7 बजे के बीच।',tr_gmou_b:'GMOU समय और बुकिंग',
  tr_kmou:'KMOU बसें (कुमाऊँ)',tr_kmou_s:'कुमाऊँ मोटर ओनर्स यूनियन हल्द्वानी, काठगोदाम और रामनगर से कुमाऊँ की पहाड़ियों (नैनीताल, अल्मोड़ा, पिथौरागढ़, बागेश्वर, मुनस्यारी) तक बसें चलाती है। टिकट इन बस अड्डों के KMOU काउंटर पर।',
  tr_pvt:'निजी बसें',tr_pvt_s:'मैदान से मुख्य पहाड़ी शहरों तक निजी बसें भी चलती हैं। बुकिंग साइट पर समय और सीटें मिलाएँ।',tr_pvt_b:'redBus पर देखें',
  tr_jeep:'साझा जीप और टैक्सी',tr_jeep_s:'साझा जीप (सूमो, मैक्स) {h} के स्टैंड से भरने पर निकलती हैं और उन गाँवों तक जाती हैं जहाँ बस नहीं जाती। बस से तेज़, थोड़ी महँगी; निजी टैक्सी सबसे महँगी पर आपके समय पर चलती है। चलने से पहले किराया तय कर लें।',
  tr_heli:'केदारनाथ के लिए हेलिकॉप्टर',tr_heli_s:'फाटा, सेरसी और गुप्तकाशी से मौसमी उड़ानें। केवल IRCTC हेली यात्रा की आधिकारिक साइट पर बुक करें: केदारनाथ हेलिकॉप्टर टिकट बेचने वाली दूसरी साइटें अक्सर नकली होती हैं। ख़राब मौसम में उड़ानें रुक जाती हैं।',tr_heli_b:'IRCTC हेली यात्रा (आधिकारिक)',
  tr_reg:'चार धाम पंजीकरण',tr_reg_s:'केदारनाथ, बद्रीनाथ, गंगोत्री और यमुनोत्री जाने वाले यात्रियों को यात्रा से पहले उत्तराखंड सरकार के पास पंजीकरण कराना होता है।',tr_reg_b:'पंजीकरण करें (आधिकारिक)',
  tr_how:'कैसे चुनें',tr_how_l:['बस: सबसे सस्ती और बारिश में सबसे सुरक्षित; कम समय, ज़्यादातर सुबह जल्दी; पहाड़ी सड़कों पर रात की सेवा नहीं।','साझा जीप: ज़्यादा समय और छोटे शहर; भरने पर निकलती है; सामान हल्का रखें।','निजी टैक्सी: अपने समय और ठहराव; सबसे महँगी; पहाड़ी सड़क जानने वाला चालक चुनें।','ट्रेन: केवल तलहटी तक; सड़क वाला हिस्सा जल्दी शुरू करें ताकि पहाड़ी हिस्सा दिन में पूरा हो।','हेलिकॉप्टर: केवल केदारनाथ के मौसम में; मौसम तय करता है; केवल आधिकारिक साइट पर बुक करें।','भारी बारिश या भूस्खलन चेतावनी के बाद बसें नीचे के शहरों में रोकी जाती हैं: आगे बढ़ने वाली टैक्सी लेने के बजाय सड़क खुलने का इंतज़ार करें।'],
  tr_note:'समय सामान्य जानकारी है, समय-सारणी नहीं। बस अड्डे पर या संचालक से पुष्टि करें।',tr_open:'आधिकारिक साइट खुलती है'
});
const TR_LINKS={
  irctc:'https://www.irctc.co.in/',utc:'https://utconline.uk.gov.in/',gmou:'https://gmou.org/',redbus:'https://www.redbus.in/online-booking/utc',
  heli:'https://www.heliyatra.irctc.co.in/',reg:'https://registrationandtouristcare.uk.gov.in/'
};
const TR_RAIL=['dehradun','haridwar','rishikesh','kotdwar','ramnagar','kathgodam','haldwani']; // stations on the network's towns
const TR_KUMAON=new Set(['haldwani','kathgodam','nainital','bhimtal','bhowali','kainchi','almora','ranikhet','ramnagar','kausani','bageshwar','pithoragarh','munsiyari','rudrapur','kashipur','gwaldam']);
const TR_DHAM=new Set(['kedarnath','gaurikund','badrinath','gangotri','yamunotri','janki']);
const TR_HELI=new Set(['kedarnath','gaurikund','sonprayag','guptkashi']);
function trLink(k,label){return '<a class="btn" href="'+TR_LINKS[k]+'" target="_blank" rel="noopener noreferrer" title="'+esc(t('tr_open'))+'">'+esc(label)+' ↗</a>';}
function trCard(title,body,acts){return '<div class="card tr"><h3>'+esc(title)+'</h3><p>'+esc(body)+'</p>'+(acts?'<div class="acts in">'+acts+'</div>':'')+'</div>';}
function renderTransport(){
  let el=$('v-transport');
  if(!el){el=document.createElement('section');el.id='v-transport';el.className=$('v-ops').className;el.hidden=true;$('v-ops').after(el);}
  el.hidden=false;
  const M=st.M;
  if(!M||!M.cur||!M.trip){el.innerHTML='<div class="ops-h"><h2>'+t('tr_t')+'</h2></div><div class="card"><p>'+t('tr_none')+'</p><div class="acts in"><button class="btn pri" type="button" data-view="trip">'+t('tr_plan')+'</button></div></div>';return;}
  const nodes=M.cur.nodes||[M.trip.from,M.trip.to],a=M.trip.from,b=M.trip.to;
  const kumaon=nodes.filter(id=>TR_KUMAON.has(id)).length>nodes.length/2;
  // railhead: the last station along the route (closest to the hills), else the station nearest the start
  const onRoute=nodes.filter(id=>TR_RAIL.includes(id));
  let rail=onRoute.length?onRoute[onRoute.length-1]:null;
  if(!rail){const A=NODE(a);if(A){let bd=1e9;TR_RAIL.forEach(id=>{const n=NODE(id);if(!n)return;const d=Math.hypot(n.lat-A.lat,n.lon-A.lon);if(d<bd){bd=d;rail=id;}});}}
  const hub=onRoute.length?onRoute[onRoute.length-1]:a;
  const hill=nodes.some(id=>{const n=NODE(id);return n&&n.k==='h';})||M.cur.rows.some(r=>!r.seg.plain);
  const sc=M.cur.score|0,l=lvl(sc);
  let h='<div class="ops-h"><h2>'+t('tr_t')+'</h2><p class="sub">'+esc(fill(t('tr_for'),{a:pname(a),b:pname(b)}))+'</p></div>';
  if(st.src!=='none'&&hill&&l>=1)h+='<div class="card tr-warn l'+l+'"><p>'+esc(fill(t('tr_risk'),{l:t(LV[l]),s:sc}))+'</p></div>';
  const closed=(st.closures&&Array.isArray(st.closures.roads))?st.closures.roads.some(r=>(r.links||[]).some(id=>M.cur.rows.some(x=>x.seg.id===id))):false;
  if(closed)h+='<div class="card tr-warn l2"><p>'+esc(t('tr_closed'))+'</p></div>';
  h+='<div class="tr-grid">';
  if(rail&&rail!==b)h+=trCard(fill(t('tr_train'),{r:pname(rail)}),t('tr_train_s'),trLink('irctc',t('tr_train_b')));
  else h+=trCard(fill(t('tr_train'),{r:'—'}),fill(t('tr_train_none'),{r:pname(hub)}),'');
  h+=trCard(t('tr_utc'),t('tr_utc_s'),trLink('utc',t('tr_utc_b')));
  if(hill)h+=kumaon?trCard(t('tr_kmou'),t('tr_kmou_s'),''):trCard(t('tr_gmou'),t('tr_gmou_s'),trLink('gmou',t('tr_gmou_b')));
  h+=trCard(t('tr_pvt'),t('tr_pvt_s'),trLink('redbus',t('tr_pvt_b')));
  if(hill)h+=trCard(t('tr_jeep'),fill(t('tr_jeep_s'),{h:pname(hub)}),'');
  if(TR_HELI.has(b)||nodes.some(id=>id==='kedarnath'))h+=trCard(t('tr_heli'),t('tr_heli_s'),trLink('heli',t('tr_heli_b')));
  if(TR_DHAM.has(b))h+=trCard(t('tr_reg'),t('tr_reg_s'),trLink('reg',t('tr_reg_b')));
  h+='</div><div class="card"><h3>'+t('tr_how')+'</h3><ul class="ul">'+t('tr_how_l').map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><p class="note">'+t('tr_note')+'</p></div>';
  el.innerHTML=h;
}
