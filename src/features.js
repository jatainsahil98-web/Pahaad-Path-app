/* ================= v4 features: views, real map, control room, proof, open data, safety, voice entry ================= */
const TX={
 en:{v_trip:'Plan trip',v_ops:'Control room',v_proof:'Proof',
  s_rp:'Recorded rain, {d} (real)',m_rp:'Replaying recorded rain for {d} · real weather, past day',m_rpfail:'Could not load recorded rain (offline and not saved). Showing simulated weather.',cf_rp:'Recorded rain from a past closure day, not a forecast',
  qr_b:'QR',qr_t:'Scan to open this trip',qr_local:'This copy is opened from a file, so a QR code would not work on another phone. Host the folder (for example on GitHub Pages) and the QR code will carry the trip link.',copy_l:'Copy link',
  tabs_safety:'Safety',
  map_tiles:'Street map (online)',map_off:'Offline map',map_note_od:'Road shapes from OpenStreetMap via OSRM where fetched; other roads are straight links between towns.',map_note:'Roads are straight links between towns. Offline layers: Natural Earth rivers, roads and state lines. With a connection the street map comes from OpenStreetMap.',
  pp_km:'km',pp_src_osrm:'distance from OSRM',pp_src_hand:'distance hand-entered',pp_sl_dem:'slope from DEM',pp_sl_gsi:'GSI landslide susceptibility',gsi_line:'GSI: {h}% of the road has High susceptibility within 100 m, {n} mapped landslides within 1 km',gsi_pts:'GSI-mapped landslide',pp_sl_demo:'slope demo value',
  // control room
  ops_t:'Control room',ops_s:'For the disaster management authority, police and tour operators: every hill stretch, the next 72 hours. Decision support only.',
  ops_at:'Showing',ops_play:'Play',ops_pause:'Pause',ops_now:'Now',
  k_avd:'Avoid',k_cau:'Caution',k_go:'Go',k_rep:'Road reports',k_worst:'Highest risk',k_of:'of {n} hill stretches',
  grid_t:'Risk by stretch, next 72 hours',grid_s:'Each cell is the highest score in a 6 hour block. Tap a cell to move the map to that time. Tap a stretch to zoom to it.',
  adv_t:'Advisory draft',adv_s:'Text an officer can review, edit and send. It is not an official order.',
  adv_head:'PahaadPath decision support draft, {d}. Not an official order. Review before issuing.',
  adv_avd:'Avoid travel on these stretches:',adv_none:'No stretch reaches Avoid in the next 24 hours.',adv_cau:'{n} more stretches are at Caution. Keep hill driving to daylight, 05:00 to 19:00.',
  adv_basis:'Basis: rain {w} against the Caine (1980) threshold, slope class, incident history and road reports.',adv_sim:'simulated for a demo',adv_live:'forecast from Open-Meteo',adv_rp:'recorded on the day',
  adv_copy:'Copy',adv_wa:'Send on WhatsApp',
  jam_t:'Expected jams, next 24 hours',jam_s:'From the holiday calendar and demand model, not live traffic.',
  rep_t:'Road reports',rep_none:'No reports.',
  // proof
  pr_t:'Does the model catch real closures?',
  pr_s:'Pick a day when hill roads closed. PahaadPath fetches the rain that actually fell or the forecast issued 1 or 2 days before and runs the same risk engine the app uses. Avoid stretches are then compared with closures named in the news.',
  pr_day:'Day',pr_src:'Rain source',pr_run:'Run',pr_all:'Run every day and source',pr_dl:'Download results',pr_ul:'Load results file',pr_plan:'Plan a trip on this day',
  pr_archive:'Recorded rain (reanalysis)',pr_prev1:'Forecast issued 1 day before',pr_prev2:'Forecast issued 2 days before',
  pr_none:'Not run yet. This needs an internet connection the first time; results are then kept on this device and can be saved as a file.',
  pr_busy:'Fetching rain for {d} ({s})…',pr_done:'Done.',
  pr_board:'Scoreboard',pr_b_day:'Day',pr_b_src:'Rain',pr_b_hit:'Named closures caught (Avoid)',pr_b_cau:'Caution or worse',pr_b_fa:'Avoid elsewhere',pr_b_sl:'Slope · incidents',
  pr_hit:'Named closures caught (Avoid)',pr_cau:'Caution or worse on named closures',pr_fa:'Avoid with no named closure',pr_fac:'Avoid on a dry control day (false alarms)',pr_miss:'Rain values missing',
  pr_tbl:'Stretch,Named closure,Peak score,Band,At (IST),6 h mm,24 h mm,72 h mm,Rain ÷ trigger,Slope class',
  pr_read:'How to read this',v6_col_u:'Model v6, today (in use)',v6_col_t:'Model v6, today (on trial, not used for trips)',pr_t2:'How well does it work?',pr_s2:'PahaadPath checked against real road closures. The season check uses every PWD closure report; replay re-runs single closure days from the news.',ps_season:'Season check',ps_replay:'Replay a day',ps_method:'Method and data',
  pr_r1:'Caught means the stretch scored Avoid (65 or more) at some hour from 00:00 to 23:00 IST on that day.',
  pr_r2:'News counts (about 150 roads on 20 Aug 2025, 195 on 9 Jul 2026) include many small link roads that are not on our map, so Avoid elsewhere is an upper bound on false alarms, not a false alarm ratio.',
  pr_r3:'Control days are dry season days. Any Avoid there is a false alarm.',
  pr_r4:'Recorded rain is gridded reanalysis at the middle of each stretch. The forecast sources test real warning lead time.',
  pr_src_l:'Closures from',
  // open data
  od_t:'Replace demo values with open data',od_s:'Runs in this browser. Road distance and shape come from OSRM on OpenStreetMap data. Terrain slope beside each hill road comes from the Copernicus 90 m elevation model through the Open-Meteo elevation API. Results stay on this device.',
  od_roads:'Fetch road distances and shapes',od_slope:'Compute terrain slope',od_use:'Use open data in the engine',od_exp:'Save open data file',od_imp:'Load open data file',od_clear:'Forget open data',
  od_st:'Roads: {r} of {n} fetched ({b} flagged). Slope: {s} of {h} hill stretches.',od_busy:'Working: {i} of {n}…',pr_learn:'What the real data run showed',pr_l1:'Dry control days: no stretch reached Avoid on either day, with recorded rain or with forecasts.',pr_l2:'9 Jul 2026 on recorded rain with open data (DEM slope, NASA incident history): 3 of the 4 closed stretches were Caution or worse and 1 was Avoid. 3 other stretches were also Avoid.',pr_l3:'Forecasts issued 1 or 2 days before saw far less rain than fell. At most 1 closed stretch reached Caution. Forecast rain is the weak link.',pr_l4:'20 Aug 2025: no closed stretch was caught. Rain in the 3 days before was modest (at most 44 mm on a closed stretch) and the roads were still blocked by debris from earlier storms (the Dharali flood was on 5 Aug). A rain trigger cannot see old debris, which is why shared road reports matter.',pr_wait:'Free weather API limit reached. Waiting a minute, then going on…',od_wait:'Free API limit reached. Waiting a minute, then going on ({i} of {n})…',od_err:'Stopped: {e}',
  od_tbl:'Stretch,Hand km,OSRM km,Check,Demo slope,DEM slope (75th pct),New class,Demo incidents,NASA landslides near the road 2007 to 2017 → class',
  od_flag:'differs a lot, kept hand value',od_ok:'ok',
  // safety
  sf_t:'Safety kit',sf_help:'Helplines',sf_112:'Emergency: police, fire, ambulance, disaster',sf_1070:'Uttarakhand State Emergency Operation Centre',sf_1077:'District Emergency Operation Centre (add the district code from outside)',sf_1364:'Tourist Care Uttarakhand, yatra helpline',
  sf_src:'Numbers from the Uttarakhand disaster management authority site and the Tourist Care Uttarakhand portal. Check them before you travel.',
  sf_sos:'Send my location (SOS)',sf_sos_s:'Call 112 or send your location by SMS. SMS often gets through where mobile data does not.',sf_sos_msg:'SOS. I need help on a hill road. My location: {u} (accuracy about {a} m).',sf_noloc:'Location is not available. Call 112 and say the nearest town or kilometre stone.',
  sf_halts:'Towns with lodging on this road',sf_stuck:'If a landslide blocks the road',
  sf_tips:['Stop well back from the debris. Do not try to cross a fresh slide or walk under a slope that is still moving.','Turn back to the last town with lodging if the road may stay shut for hours.','In heavy rain keep away from streams, culverts and the valley side of the road.','Tell the district control room on 1077 or call 112 with the place name or kilometre stone.','Keep fuel above half, carry water, warm clothes, a torch, medicines and some cash.'],
  sf_tipnote:'General safety advice, not an official instruction.',
  // voice
  ask_ph:'Type or say your trip, for example: Delhi to Kedarnath tomorrow 6 am',ask_mic:'Speak your trip',ask_ok:'Understood: {x}',ask_no:'Could not find two places. Try: Delhi to Mussoorie on Saturday.',ask_listen:'Listening…',
  // footer
  ft_data:'Data in this copy',ft_km_h:'road distances hand-entered',ft_km_o:'{n} road distances from OSRM (OpenStreetMap)',ft_sl_d:'slope classes are demo values',ft_sl_o:'{n} slope classes from the Copernicus DEM',ft_hist:'incident history is a demo value',
  ft_cred:'Open data and code: OpenStreetMap contributors (ODbL), OSRM, Open-Meteo (CC BY 4.0), Copernicus GLO-90 DEM, NASA Global Landslide Catalog, Natural Earth (public domain), Leaflet (BSD 2-Clause), qrcode-generator (MIT).'
 },
 hi:{v_trip:'यात्रा',v_ops:'कंट्रोल रूम',v_proof:'जाँच',
  s_rp:'दर्ज बारिश, {d} (असली)',m_rp:'{d} की दर्ज बारिश दोबारा चल रही है · असली मौसम, बीता दिन',m_rpfail:'दर्ज बारिश नहीं मिल सकी (ऑफ़लाइन और सहेजी नहीं)। नकली मौसम दिखा रहे हैं।',cf_rp:'बीते दिन की दर्ज बारिश, पूर्वानुमान नहीं',
  qr_b:'QR',qr_t:'यह यात्रा खोलने के लिए स्कैन करें',qr_local:'यह कॉपी फ़ाइल से खुली है, इसलिए दूसरे फ़ोन पर QR काम नहीं करेगा। फ़ोल्डर को होस्ट करें (जैसे GitHub Pages पर), फिर QR में यात्रा का लिंक होगा।',copy_l:'लिंक कॉपी करें',
  tabs_safety:'सुरक्षा',
  map_tiles:'सड़क नक्शा (ऑनलाइन)',map_off:'ऑफ़लाइन नक्शा',map_note_od:'जहाँ लिया गया, वहाँ सड़क का आकार OSRM से OpenStreetMap का है; बाक़ी सड़कें शहरों के बीच सीधी रेखाएँ हैं।',map_note:'सड़कें शहरों के बीच सीधी रेखाएँ हैं। ऑफ़लाइन परतें: Natural Earth की नदियाँ, सड़कें और राज्य सीमाएँ। नेटवर्क हो तो सड़क नक्शा OpenStreetMap से आता है।',
  pp_km:'किमी',pp_src_osrm:'दूरी OSRM से',pp_src_hand:'दूरी हाथ से दर्ज',pp_sl_dem:'ढलान DEM से',pp_sl_gsi:'GSI भूस्खलन संवेदनशीलता',gsi_line:'GSI: सड़क के {h}% हिस्से के 100 मी भीतर उच्च संवेदनशीलता, 1 किमी में {n} दर्ज भूस्खलन',gsi_pts:'GSI द्वारा दर्ज भूस्खलन',pp_sl_demo:'ढलान नमूना मान',
  ops_t:'कंट्रोल रूम',ops_s:'आपदा प्रबंधन प्राधिकरण, पुलिस और टूर ऑपरेटरों के लिए: हर पहाड़ी हिस्सा, अगले 72 घंटे। सिर्फ़ फ़ैसले में मदद के लिए।',
  ops_at:'समय',ops_play:'चलाएँ',ops_pause:'रोकें',ops_now:'अभी',
  k_avd:'टालें',k_cau:'सावधानी',k_go:'चलें',k_rep:'सड़क रिपोर्ट',k_worst:'सबसे ज़्यादा जोखिम',k_of:'{n} पहाड़ी हिस्सों में से',
  grid_t:'हिस्सेवार जोखिम, अगले 72 घंटे',grid_s:'हर खाना 6 घंटे का सबसे ऊँचा स्कोर है। खाने को छूकर नक्शे का समय बदलें। हिस्से को छूकर उस पर ज़ूम करें।',
  adv_t:'सलाह का मसौदा',adv_s:'अधिकारी इसे देखकर, बदलकर भेज सकते हैं। यह सरकारी आदेश नहीं है।',
  adv_head:'पहाड़ पथ निर्णय सहायता मसौदा, {d}। यह सरकारी आदेश नहीं है। जारी करने से पहले जाँच लें।',
  adv_avd:'इन हिस्सों पर यात्रा टालें:',adv_none:'अगले 24 घंटे में कोई हिस्सा "टालें" तक नहीं पहुँचता।',adv_cau:'{n} और हिस्से सावधानी में हैं। पहाड़ी सड़क पर सिर्फ़ दिन में, सुबह 5 से शाम 7 बजे तक चलें।',
  adv_basis:'आधार: बारिश ({w}) बनाम Caine (1980) सीमा, ढलान, पुरानी घटनाएँ और सड़क रिपोर्ट।',adv_sim:'डेमो के लिए नकली',adv_live:'Open-Meteo का पूर्वानुमान',adv_rp:'उस दिन दर्ज',
  adv_copy:'कॉपी करें',adv_wa:'WhatsApp पर भेजें',
  jam_t:'अगले 24 घंटे में अनुमानित जाम',jam_s:'छुट्टियों के कैलेंडर और माँग के मॉडल से, लाइव ट्रैफ़िक नहीं।',
  rep_t:'सड़क रिपोर्ट',rep_none:'कोई रिपोर्ट नहीं।',
  pr_t:'क्या मॉडल असली बंद सड़कें पकड़ता है?',
  pr_s:'वह दिन चुनें जब पहाड़ी सड़कें बंद हुई थीं। पहाड़ पथ उस दिन असल में गिरी बारिश या 1 से 2 दिन पहले जारी पूर्वानुमान लेकर वही जोखिम इंजन चलाता है जो ऐप में है। फिर "टालें" वाले हिस्सों की तुलना ख़बरों में बताई बंद सड़कों से होती है।',
  pr_day:'दिन',pr_src:'बारिश का स्रोत',pr_run:'चलाएँ',pr_all:'हर दिन और स्रोत चलाएँ',pr_dl:'नतीजे डाउनलोड करें',pr_ul:'नतीजों की फ़ाइल लोड करें',pr_plan:'इस दिन की यात्रा देखें',
  pr_archive:'दर्ज बारिश (रीएनालिसिस)',pr_prev1:'1 दिन पहले का पूर्वानुमान',pr_prev2:'2 दिन पहले का पूर्वानुमान',
  pr_none:'अभी नहीं चलाया गया। पहली बार इंटरनेट चाहिए; फिर नतीजे इसी डिवाइस पर रहते हैं और फ़ाइल में सहेजे जा सकते हैं।',
  pr_busy:'{d} की बारिश ला रहे हैं ({s})…',pr_done:'हो गया।',
  pr_board:'स्कोरबोर्ड',pr_b_day:'दिन',pr_b_src:'बारिश',pr_b_hit:'पकड़ी गई बंद सड़कें (टालें)',pr_b_cau:'सावधानी या ज़्यादा',pr_b_fa:'बाक़ी जगह टालें',pr_b_sl:'ढलान · घटनाएँ',
  pr_hit:'पकड़ी गई बंद सड़कें (टालें)',pr_cau:'बंद सड़कों पर सावधानी या ज़्यादा',pr_fa:'बिना ख़बर वाली जगह पर टालें',pr_fac:'सूखे नियंत्रण दिन पर टालें (झूठी चेतावनी)',pr_miss:'बारिश के छूटे मान',
  pr_tbl:'हिस्सा,ख़बर में बंद,सबसे ऊँचा स्कोर,स्तर,समय (IST),6 घंटे मिमी,24 घंटे मिमी,72 घंटे मिमी,बारिश ÷ सीमा,ढलान वर्ग',
  pr_read:'इसे कैसे पढ़ें',v6_col_u:'मॉडल v6, आज (उपयोग में)',v6_col_t:'मॉडल v6, आज (परीक्षण में, यात्राओं के लिए नहीं)',pr_t2:'यह कितना सही है?',pr_s2:'PahaadPath की असली सड़क बंदियों से जाँच। सीज़न जाँच PWD की हर बंदी रिपोर्ट से होती है; रीप्ले ख़बरों में आए बंदी वाले एक-एक दिन को दोबारा चलाता है।',ps_season:'सीज़न जाँच',ps_replay:'एक दिन रीप्ले',ps_method:'तरीका और डेटा',
  pr_r1:'पकड़ी गई का मतलब है कि उस दिन 00:00 से 23:00 IST के बीच किसी घंटे हिस्से का स्कोर "टालें" (65 या ज़्यादा) रहा।',
  pr_r2:'ख़बरों की गिनती (20 अगस्त 2025 को लगभग 150, 9 जुलाई 2026 को 195 सड़कें) में बहुत सी छोटी सड़कें हैं जो हमारे नक्शे में नहीं हैं, इसलिए "बाक़ी जगह टालें" झूठी चेतावनी की ऊपरी सीमा है, अनुपात नहीं।',
  pr_r3:'नियंत्रण दिन सूखे मौसम के दिन हैं। वहाँ हर "टालें" झूठी चेतावनी है।',
  pr_r4:'दर्ज बारिश हर हिस्से के बीच के बिंदु पर ग्रिड रीएनालिसिस है। पूर्वानुमान वाले स्रोत असली चेतावनी समय जाँचते हैं।',
  pr_src_l:'बंद सड़कों का स्रोत',
  od_t:'नमूना मानों की जगह खुला डेटा',od_s:'इसी ब्राउज़र में चलता है। सड़क की दूरी और आकार OpenStreetMap डेटा पर OSRM से। हर पहाड़ी सड़क के आसपास की ढलान Copernicus 90 मीटर ऊँचाई मॉडल से, Open-Meteo elevation API के ज़रिए। नतीजे इसी डिवाइस पर रहते हैं।',
  od_roads:'सड़क की दूरी और आकार लाएँ',od_slope:'ढलान निकालें',od_use:'इंजन में खुला डेटा इस्तेमाल करें',od_exp:'खुले डेटा की फ़ाइल सहेजें',od_imp:'खुले डेटा की फ़ाइल लोड करें',od_clear:'खुला डेटा हटाएँ',
  od_st:'सड़कें: {n} में से {r} मिलीं ({b} संदिग्ध)। ढलान: {h} में से {s} पहाड़ी हिस्से।',od_busy:'चल रहा है: {n} में से {i}…',pr_learn:'असली डेटा की जाँच में क्या दिखा',pr_l1:'सूखे नियंत्रण दिन: किसी भी दिन कोई हिस्सा टालें तक नहीं पहुँचा, न दर्ज बारिश से न पूर्वानुमान से।',pr_l2:'9 जुलाई 2026, दर्ज बारिश और खुले डेटा (DEM ढलान, NASA घटना इतिहास) के साथ: बंद 4 में से 3 हिस्से सावधानी या उससे ऊपर थे और 1 टालें था। 3 और हिस्से भी टालें थे।',pr_l3:'1 या 2 दिन पहले के पूर्वानुमान में असल से बहुत कम बारिश थी। ज़्यादा से ज़्यादा 1 बंद हिस्सा सावधानी तक पहुँचा। पूर्वानुमान की बारिश सबसे कमज़ोर कड़ी है।',pr_l4:'20 अगस्त 2025: कोई बंद हिस्सा नहीं पकड़ा गया। पिछले 3 दिनों की बारिश कम थी (किसी बंद हिस्से पर ज़्यादा से ज़्यादा 44 मिमी) और सड़कें पहले के तूफ़ानों के मलबे से बंद थीं (धराली की बाढ़ 5 अगस्त को आई थी)। बारिश का पैमाना पुराना मलबा नहीं देख सकता, इसीलिए साझा सड़क रिपोर्ट ज़रूरी हैं।',pr_wait:'मुफ़्त मौसम API की सीमा पूरी हुई। एक मिनट रुककर आगे बढ़ेंगे…',od_wait:'मुफ़्त API की सीमा पूरी हुई। एक मिनट रुककर आगे बढ़ेंगे ({n} में से {i})…',od_err:'रुका: {e}',
  od_tbl:'हिस्सा,हाथ से किमी,OSRM किमी,जाँच,नमूना ढलान,DEM ढलान (75वाँ प्रतिशतक),नया वर्ग,नमूना घटनाएँ,सड़क के पास NASA भूस्खलन 2007 से 2017 → वर्ग',
  od_flag:'बहुत अलग, हाथ वाला मान रखा',od_ok:'ठीक',
  sf_t:'सुरक्षा किट',sf_help:'हेल्पलाइन',sf_112:'आपातकाल: पुलिस, फ़ायर, एंबुलेंस, आपदा',sf_1070:'उत्तराखंड राज्य आपातकालीन संचालन केंद्र',sf_1077:'ज़िला आपातकालीन संचालन केंद्र (ज़िले के बाहर से ज़िले का कोड लगाएँ)',sf_1364:'टूरिस्ट केयर उत्तराखंड, यात्रा हेल्पलाइन',
  sf_src:'नंबर उत्तराखंड आपदा प्रबंधन प्राधिकरण की साइट और टूरिस्ट केयर उत्तराखंड पोर्टल से। यात्रा से पहले जाँच लें।',
  sf_sos:'मेरी लोकेशन भेजें (SOS)',sf_sos_s:'112 पर फ़ोन करें या अपनी जगह SMS से भेजें। जहाँ मोबाइल डेटा नहीं चलता, वहाँ अक्सर SMS चला जाता है।',sf_sos_msg:'SOS। पहाड़ी सड़क पर मदद चाहिए। मेरी लोकेशन: {u} (लगभग {a} मीटर सटीक)।',sf_noloc:'लोकेशन नहीं मिली। 112 पर कॉल करें और पास का शहर या किलोमीटर पत्थर बताएँ।',
  sf_halts:'इस रास्ते पर ठहरने लायक शहर',sf_stuck:'भूस्खलन से रास्ता बंद हो तो',
  sf_tips:['मलबे से काफ़ी पीछे रुकें। ताज़ा भूस्खलन पार करने या खिसकती ढलान के नीचे से चलने की कोशिश न करें।','अगर रास्ता घंटों बंद रह सकता है तो ठहरने लायक पिछले शहर लौट जाएँ।','तेज़ बारिश में नालों, पुलियों और सड़क के घाटी वाले किनारे से दूर रहें।','ज़िला कंट्रोल रूम को 1077 पर बताएँ या 112 पर जगह का नाम या किलोमीटर पत्थर बताएँ।','टंकी आधी से ऊपर रखें; पानी, गर्म कपड़े, टॉर्च, दवाएँ और कुछ नक़द साथ रखें।'],
  sf_tipnote:'आम सुरक्षा सलाह, सरकारी निर्देश नहीं।',
  ask_ph:'अपनी यात्रा लिखें या बोलें, जैसे: दिल्ली से केदारनाथ कल सुबह 6 बजे',ask_mic:'यात्रा बोलें',ask_ok:'समझ गए: {x}',ask_no:'दो जगहें नहीं मिलीं। ऐसे बोलें: दिल्ली से मसूरी शनिवार को।',ask_listen:'सुन रहे हैं…',
  ft_data:'इस कॉपी का डेटा',ft_km_h:'सड़क की दूरियाँ हाथ से दर्ज',ft_km_o:'{n} सड़कों की दूरी OSRM (OpenStreetMap) से',ft_sl_d:'ढलान वर्ग नमूना मान हैं',ft_sl_o:'{n} ढलान वर्ग Copernicus DEM से',ft_hist:'पुरानी घटनाओं के मान नमूने हैं',
  ft_cred:'खुला डेटा और कोड: OpenStreetMap योगदानकर्ता (ODbL), OSRM, Open-Meteo (CC BY 4.0), Copernicus GLO-90 DEM, NASA Global Landslide Catalog, Natural Earth (सार्वजनिक), Leaflet (BSD 2-Clause), qrcode-generator (MIT)।'
 }
};
Object.assign(T.en,TX.en);Object.assign(T.hi,TX.hi);
T.en.tabs.safety=TX.en.tabs_safety;T.hi.tabs.safety=TX.hi.tabs_safety;

const BASEMAP=/*__BASEMAP__*/{rivers:[],roads:[],borders:[],lakes:[]};
const GT=/*__GT__*/{events:[]};
const HAS_L=typeof L!=='undefined';
const cssv=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888';
const lsGet=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}};
const sleep=ms=>new Promise(r=>setTimeout(r,window.__fastSleep?1:ms)); // tests shorten the waits
function download(name,obj){
  if(window.PPAndroid&&window.PPAndroid.saveFile){const w=window.PPAndroid.saveFile(name,'application/json',JSON.stringify(obj,null,1));toast(w?fill(t('dl_ok'),{f:w}):t('dl_err'));return;} // a WebView ignores <a download>
  const b=new Blob([JSON.stringify(obj,null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}
function pickFile(cb){const i=document.createElement('input');i.type='file';i.accept='application/json,.json';i.onchange=()=>{const f=i.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{cb(JSON.parse(r.result));}catch(e){toast(String(e.message||e));}};r.readAsText(f);};i.click();}
const segName=e=>pname(e.a)+' → '+pname(e.b);

/* ---------- open data: real road km and shape (OSRM) and terrain slope (Copernicus DEM) ---------- */
const OD_BAKED=/*__OPEN_DATA__*/null;
/* NASA Global Landslide Catalog (2007 to 2017), events in and around Uttarakhand located to 10 km or better: [lat, lon, accuracy km, year, deaths] */
const GLC=/*__GLC__*/null;
/* GSI landslide susceptibility (NLSM 1:50,000) along each hill road and GSI-mapped landslides near the roads, read from the
   National Geoscience Data Repository (data/gsi_uttarakhand.json). use = the backtest found the engine no worse with the GSI
   class than with the DEM slope class, so the GSI class drives the engine; otherwise it is shown but slope drives it. */
const GSI=/*__GSI__*/null;
/* Slope class from the 75th percentile side slope. Cut-offs near the terciles of the 44 hill stretches (30.7 and 36.9 degrees on the real data run),
   rounded to 31 and 37, give classes of 15, 16 and 13 stretches. The earlier 22 and 30 put 32 of 44 in the top class, so slope stopped telling roads apart. */
const SL_CUT=[31,37],slopeClass=d=>d<SL_CUT[0]?1:d<SL_CUT[1]?2:3;
const HIST_KM=3,histClass=n=>n===0?0:n===1?1:n<=3?2:n<=6?3:n<=10?4:5;
let odVer=0;
EDGES.forEach(e=>{e.km0=e.km;e.susc0=e.susc;e.hist0=e.hist;});
let OD=lsGet('pp_od',null)||OD_BAKED||{km:{},geom:{},slope:{},meta:{}};
['km','geom','slope','meta','hist'].forEach(k=>{OD[k]=OD[k]||{};});
st.useOD=lsGet('pp_od_use',true);
/* incident history: an event counts for a stretch when the road passes within its location accuracy (at least 3 km) */
function catalogHist(){
  if(!GLC)return;
  OD.events=GLC;OD.hist={};
  EDGES.filter(e=>!e.plain&&!e.virtual).forEach(e=>{const g=geomOf(e);const n=GLC.filter(p=>distToLine(p[0],p[1],g)<=Math.max(HIST_KM,p[2])).length;OD.hist[e.id]={n,cls:histClass(n)};});
  OD.meta.hist={source:'NASA Global Landslide Catalog export (data.nasa.gov, open data), events 2007 to 2017',method:'events located to 10 km or better whose accuracy circle (at least 3 km) reaches the road; 0, 1, 2 to 3, 4 to 6, 7 to 10, more than 10 map to classes 0 to 5',points:GLC.length};
}
function applyOpenData(){
  catalogHist();odVer++;
  EDGES.forEach(e=>{
    const k=st.useOD&&OD.km[e.id];
    e.km=k&&k.ok?Math.round(k.km):e.km0;e.h0=e.km/e.v;e.kmSrc=k&&k.ok?'osrm':'hand';
    const sl=st.useOD&&!e.plain&&OD.slope[e.id];
    if(!e.plain){e.susc=sl?slopeClass(sl.p75):e.susc0;e.slSrc=sl?'dem':'demo';e.gsi=GSI&&GSI.st[e.id]||null;
      if(GSI&&GSI.use&&e.gsi&&e.gsi.cls){e.susc=e.gsi.cls;e.slSrc='gsi';}const hh=st.useOD&&OD.hist[e.id];e.hist=hh?hh.cls:e.hist0;e.hiSrc=hh?'nasa':'demo';}
  });
  deriveOffsets();
}
applyOpenData();
function saveOD(){lsSet('pp_od',OD);}
function odCounts(){
  const n=EDGES.length,r=EDGES.filter(e=>OD.km[e.id]).length,b=EDGES.filter(e=>OD.km[e.id]&&!OD.km[e.id].ok).length;
  const hill=EDGES.filter(e=>!e.plain),s=hill.filter(e=>OD.slope[e.id]).length;
  const hi=hill.filter(e=>OD.hist[e.id]).length;
  return{n,r,b,h:hill.length,s,hi,hiUsed:st.useOD?hi:0,kmUsed:st.useOD?EDGES.filter(e=>OD.km[e.id]&&OD.km[e.id].ok).length:0,slUsed:st.useOD?s:0};
}
function geomOf(e){
  if(st.useOD&&OD.geom[e.id]&&OD.km[e.id]&&OD.km[e.id].ok)return OD.geom[e.id];
  const A=NODE(e.a),B=NODE(e.b);return[[A.lat,A.lon],[B.lat,B.lon]];
}
/* point at fraction f of a polyline, with the local direction */
function along(g,f){
  const L=[0];for(let i=1;i<g.length;i++)L.push(L[i-1]+hav(g[i-1][0],g[i-1][1],g[i][0],g[i][1]));
  const tot=L[L.length-1]||1e-9,want=f*tot;let i=1;while(i<g.length-1&&L[i]<want)i++;
  const a=g[i-1],b=g[i],seg=(L[i]-L[i-1])||1e-9,u=Math.max(0,Math.min(1,(want-L[i-1])/seg));
  return{lat:a[0]+(b[0]-a[0])*u,lon:a[1]+(b[1]-a[1])*u,dlat:b[0]-a[0],dlon:b[1]-a[1]};
}
const OSRM='https://router.project-osrm.org/route/v1/driving/';
const ELEV='https://api.open-meteo.com/v1/elevation';
let odBusy=null;
async function buildRoads(prog){
  const list=EDGES.filter(e=>!e.virtual);
  for(let i=0;i<list.length;i++){
    const e=list[i],A=N[e.a],B=N[e.b];prog(i,list.length);
    if(OD.km[e.id]&&OD.km[e.id].src==='osrm')continue;
    const url=OSRM+A.lon.toFixed(4)+','+A.lat.toFixed(4)+';'+B.lon.toFixed(4)+','+B.lat.toFixed(4)+'?overview=simplified&geometries=geojson';
    const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),15000);
    const res=await fetch(url,{signal:ctl.signal});clearTimeout(to);
    if(!res.ok)throw new Error('OSRM '+res.status);
    const js=await res.json();if(js.code!=='Ok'||!js.routes||!js.routes[0])throw new Error('OSRM '+(js.code||'no route'));
    const r=js.routes[0],km=r.distance/1000,ratio=km/e.km0;
    OD.km[e.id]={km:+km.toFixed(1),min:Math.round(r.duration/60),ratio:+ratio.toFixed(2),ok:ratio>=.6&&ratio<=1.8,src:'osrm'};
    OD.geom[e.id]=r.geometry.coordinates.map(p=>[+p[1].toFixed(4),+p[0].toFixed(4)]);
    OD.meta.roads={at:new Date().toISOString(),source:'router.project-osrm.org (OpenStreetMap data, ODbL)'};
    saveOD();
    await sleep(1100); // public OSRM demo server: at most one request a second
  }
  prog(list.length,list.length);
}
/* Terrain slope beside the road: at 16 points along each hill stretch, elevation on the road and 180 m to either side.
   Slope = steeper of the two side gradients. The 75th percentile over the stretch sets the class:
   The class comes from SL_CUT above. */
/* Open-Meteo's free tier counts each location as a call (600 a minute): on 429, wait out the minute and retry */
async function omFetch(url,onWait){
  for(let tries=0;;tries++){const res=await fetch(url);if(res.status!==429||tries>=4)return res;if(onWait)onWait();await sleep(65000);}
}
const SL_D=180,SL_N=16;
async function buildSlope(prog){
  const hill=EDGES.filter(e=>!e.plain&&!e.virtual),pts=[];
  hill.forEach(e=>{const g=geomOf(e);for(let k=0;k<SL_N;k++){
    const p=along(g,(k+.5)/SL_N),m=111320,cl=Math.cos(p.lat*Math.PI/180);
    let vx=p.dlon*cl,vy=p.dlat;const vl=Math.hypot(vx,vy)||1;vx/=vl;vy/=vl; // unit direction (east, north)
    const nx=-vy,ny=vx,dLat=ny*SL_D/m,dLon=nx*SL_D/(m*cl);
    pts.push({e:e.id,k,s:0,lat:p.lat,lon:p.lon},{e:e.id,k,s:1,lat:p.lat+dLat,lon:p.lon+dLon},{e:e.id,k,s:-1,lat:p.lat-dLat,lon:p.lon-dLon});
  }});
  for(let i=0;i<pts.length;i+=100){
    prog(i,pts.length);
    const ch=pts.slice(i,i+100);
    const url=ELEV+'?latitude='+ch.map(p=>p.lat.toFixed(5)).join(',')+'&longitude='+ch.map(p=>p.lon.toFixed(5)).join(',');
    const res=await omFetch(url,()=>prog(i,pts.length,true));
    if(!res.ok)throw new Error('elevation '+res.status);
    const js=await res.json();if(!js.elevation||js.elevation.length!==ch.length)throw new Error('elevation reply shape');
    ch.forEach((p,j)=>{p.z=js.elevation[j];});
    await sleep(11000); // about 550 points a minute, under the free limit of 600 calls a minute
  }
  const by={};pts.forEach(p=>{((by[p.e]=by[p.e]||{})[p.k]=by[p.e][p.k]||{})[p.s]=p.z;});
  hill.forEach(e=>{
    const sl=Object.values(by[e.id]).map(o=>Math.atan(Math.max(Math.abs(o[1]-o[0]),Math.abs(o[0]-o[-1]))/SL_D)*180/Math.PI).sort((a,b)=>a-b);
    const p75=sl[Math.floor(sl.length*.75)],mean=sl.reduce((a,b)=>a+b,0)/sl.length;
    OD.slope[e.id]={p75:+p75.toFixed(1),mean:+mean.toFixed(1),cls:slopeClass(p75),geom:st.useOD&&OD.geom[e.id]?'osrm':'straight'};
  });
  OD.meta.slope={at:new Date().toISOString(),source:'Copernicus GLO-90 DEM via api.open-meteo.com/v1/elevation',method:'75th percentile of side slope at 180 m, 16 points'};
  saveOD();prog(pts.length,pts.length);
}

/* ---------- views ---------- */
function renderViews(){
  $('views').innerHTML=['trip','ops','proof'].map(v=>'<button type="button" data-view="'+v+'" aria-pressed="'+(st.view===v)+'">'+t('v_'+v)+'</button>').join('');
  $('v-trip').hidden=st.view!=='trip';$('v-ops').hidden=st.view!=='ops';$('v-proof').hidden=st.view!=='proof';
  $('app').classList.toggle('wide',st.view!=='trip');
  if(st.view!=='ops')stopPlay();
}
function renderScnOptions(){
  const ids=['live','monsoon','clear'].concat(GT.events.filter(e=>!e.control).map(e=>'rp:'+e.date));
  const lab=id=>id.startsWith('rp:')?fill(t('s_rp'),{d:rpLabel(id.slice(3))}):t('s_'+id);
  $('scn').innerHTML=ids.map(id=>'<option value="'+id+'">'+esc(lab(id))+'</option>').join('');
  $('scn').value=st.scn;
}
const rpLabel=d=>{const i=parseDate(d),x=new Date(i*864e5);return x.getUTCDate()+' '+t('mon')[x.getUTCMonth()]+' '+x.getUTCFullYear();};
function footHtml(){
  const c=odCounts();
  const data=[c.kmUsed?fill(t('ft_km_o'),{n:c.kmUsed}):t('ft_km_h'),c.slUsed?fill(t('ft_sl_o'),{n:c.slUsed}):t('ft_sl_d'),c.hiUsed?fill(t('ft_hist_o'),{n:c.hiUsed}):t('ft_hist')].join(' · ');
  return engineHtml()+shareAppHtml()+t('foot')+'<br><br><b>'+t('ft_data')+':</b> '+esc(data)+'<br>'+esc(t('ft_cred'))+'<br><br>PahaadPath · SAARTHI’26';
}

/* ---------- Leaflet helpers ---------- */
let LM={};
function killMap(id){if(LM[id]){try{LM[id].map.remove();}catch(e){}delete LM[id];}}
/* 2.0 (decision D3): the online OpenStreetMap raster tiles are gone; every map draws from data inside the app (and, from
   Phase 4, the offline map files), so no map ever asks a tile server and a copy opened from a file looks the same */
function tilesOn(){return false;}
function makeMap(id,opts){
  killMap(id);
  const el=$(id);if(!el||!HAS_L)return null;
  const map=L.map(el,Object.assign({zoomControl:true,attributionControl:true,scrollWheelZoom:false,preferCanvas:true},opts||{}));
  const o={map,tileErr:0};LM[id]=o;
  const vec=L.layerGroup();
  BASEMAP.lakes.forEach(l=>L.polygon(l.map(p=>[p[1],p[0]]),{color:'#5B8DB8',weight:.8,fillColor:'#5B8DB8',fillOpacity:.25,interactive:false}).addTo(vec));
  BASEMAP.rivers.forEach(l=>L.polyline(l.map(p=>[p[1],p[0]]),{color:'#5B8DB8',weight:1.3,opacity:.7,interactive:false}).addTo(vec));
  BASEMAP.roads.forEach(l=>L.polyline(l.map(p=>[p[1],p[0]]),{color:cssv('--muted'),weight:1,opacity:.35,interactive:false}).addTo(vec));
  BASEMAP.borders.forEach(l=>L.polyline(l.map(p=>[p[1],p[0]]),{color:cssv('--muted'),weight:1,opacity:.6,dashArray:'5 4',interactive:false}).addTo(vec));
  if(tilesOn()){
    const tl=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:17,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'});
    tl.on('tileerror',()=>{o.tileErr++;if(o.tileErr===4){map.removeLayer(tl);vec.addTo(map);el.classList.remove('tiles');}});
    tl.addTo(map);el.classList.add('tiles');
  }else{vec.addTo(map);map.attributionControl.addAttribution('Natural Earth');}
  return o;
}
function pathOf(e,rev){const g=geomOf(e);return rev?g.slice().reverse():g;}
function casedLine(group,ll,color,w,extra){
  L.polyline(ll,{color:cssv('--surface'),weight:w+4,opacity:.9,interactive:false}).addTo(group);
  return L.polyline(ll,Object.assign({color,weight:w,opacity:1,lineCap:'round'},extra||{})).addTo(group);
}
function divIcon(html,cls,size){return L.divIcon({html,className:'lf-ic '+(cls||''),iconSize:size||[18,18],iconAnchor:[(size||[18,18])[0]/2,(size||[18,18])[1]/2]});}
const TRI='<svg viewBox="0 0 20 18" width="18" height="16"><path d="M10 1l9 16H1z" fill="#F2B705" stroke="#14221C" stroke-width="1.5" stroke-linejoin="round"/></svg>';
function stretchPopup(r){
  const s=r.seg,slope=['',t('low'),t('med'),t('high')][s.susc];
  return '<b>'+esc(pname(r.from)+' → '+pname(r.to))+'</b><br>'
    +(s.plain?esc(t('plains_note')):esc(t(LV[lvl(r.score)])+' '+r.score+'/100 · '+t('rain')+' '+Math.round(r.P24)+'/'+Math.round(edThr(s)(24))+' mm · '+t('slope')+' '+slope+' ('+t(s.slSrc==='gsi'?'pp_sl_gsi':s.slSrc==='dem'?'pp_sl_dem':'pp_sl_demo')+')'+(s.gsi?' · '+fill(t('gsi_line'),{h:Math.round(s.gsi.high100*100),n:s.gsi.ls1k}):'')))
    +'<br>'+esc(clock(msOf(r.start))+t('rng')+clock(msOf(r.end))+' · '+t('trf')+' ×'+r.x.toFixed(1)+' · '+s.km+' '+t('km')+' ('+t(s.kmSrc==='osrm'?'pp_src_osrm':'pp_src_hand')+')');
}
/* trip map: replaces the schematic SVG map; falls back to it if Leaflet is missing */
const renderMapSvg=renderMap;
renderMap=function(M){
  if(!HAS_L)return renderMapSvg(M);
  const tl=st.layer==='traffic',on=tilesOn();
  $('panel').innerHTML='<div class="maprow"><div class="tog sm" role="group" aria-label="Map layer"><button type="button" data-ly="risk" aria-pressed="'+!tl+'">'+t('lay_risk')+'</button><button type="button" data-ly="traffic" aria-pressed="'+tl+'">'+t('lay_trf')+'</button></div>'
    +'<div class="tog sm" role="group" aria-label="Base map" hidden><button type="button" data-tiles="1" aria-pressed="'+on+'">'+t('map_tiles')+'</button><button type="button" data-tiles="0" aria-pressed="'+!on+'">'+t('map_off')+'</button></div></div>'
    +'<div id="lmap" class="lmap" role="region" aria-label="'+esc(titleOf(M))+'"></div><div class="legend" id="lmap-leg"></div><p class="mapnote">'+t(odCounts().kmUsed?'map_note_od':'map_note')+'</p>';
  const o=makeMap('lmap');if(!o)return;
  const map=o.map,g=L.layerGroup().addTo(map),sel=M.sel,cur=M.cur,bounds=[];
  EDGES.forEach(e=>{if(e.virtual)return;L.polyline(geomOf(e),{color:cssv('--muted'),weight:2,opacity:.3,interactive:false}).addTo(g);});
  M.plans.forEach(p=>{if(p===sel)return;p.rows.forEach(r=>{L.polyline(pathOf(r.seg,r.rev),{color:cssv('--ink'),weight:3,opacity:.45,dashArray:'6 6',interactive:false}).addTo(g);});});
  cur.rows.forEach(r=>{
    const s=r.seg,ll=pathOf(s,r.rev);ll.forEach(p=>bounds.push(p));
    const col=tl?cssv('--'+LV[tlvl(r.ci)]):s.plain?cssv('--muted'):cssv('--'+LV[lvl(r.score)]);
    casedLine(g,ll,col,6,!tl&&r.blocked?{dashArray:'2 10'}:null).bindPopup(stretchPopup(r));
  });
  if(!tl){
    cur.rows.forEach(r=>{const s=r.seg;if(s.virtual)return;s.spots.forEach(sp=>{const p=along(geomOf(s),sp.f);L.marker([p.lat,p.lon],{icon:divIcon(TRI,'',[18,16]),keyboard:false}).bindTooltip(esc(nm(sp))).addTo(g);});});
    ctx().reports.filter(x=>x.type!=='clear'&&cur.rows.some(r=>r.seg.id===x.seg)).forEach(x=>{const s=S[x.seg];if(!s)return;const f=s.spots[x.spot]?s.spots[x.spot].f:.5,p=along(geomOf(s),f);
      L.marker([p.lat,p.lon],{icon:divIcon('!','lf-rep',[16,16]),zIndexOffset:500}).bindTooltip(esc(t('t_'+x.type)+' · '+ago(x.ts)+' '+t('ago'))).addTo(g);});
  }
  const ends=[M.trip.from,M.trip.to];
  sel.nodes.concat(ends).filter((v,i,a)=>a.indexOf(v)===i).forEach(id=>{const n=NODE(id);if(!n)return;const isEnd=ends.indexOf(id)>=0;bounds.push([n.lat,n.lon]);
    L.circleMarker([n.lat,n.lon],{radius:isEnd?6:4,color:cssv('--ink'),weight:2,fillColor:isEnd?cssv('--ink'):cssv('--surface'),fillOpacity:1}).bindTooltip(esc(pname(id)),{permanent:isEnd,direction:'right',className:'tlab'+(isEnd?' end':'')}).addTo(g);});
  cur.halts.forEach((h,i)=>{const n=NODE(h.node);L.marker([n.lat,n.lon],{icon:divIcon(esc(t('day')+' '+(i+1)),'lf-day',[44,16]),zIndexOffset:800}).addTo(g);});
  if(bounds.length)map.fitBounds(bounds,{padding:[24,24],maxZoom:11});
  $('lmap-leg').innerHTML=(tl?'<span><i style="background:var(--go)"></i>'+t('trf0')+'</span><span><i style="background:var(--cau)"></i>'+t('trf1')+'</span><span><i style="background:var(--avd)"></i>'+t('trf2')+'</span>'
    :'<span><i style="background:var(--go)"></i>'+t('go')+'</span><span><i style="background:var(--cau)"></i>'+t('cau')+'</span><span><i style="background:var(--avd)"></i>'+t('avd')+'</span><span><i style="background:var(--muted);opacity:.45"></i>'+t('plains')+'</span><span><span class="warn-tri"></span>'+t('hot')+'</span><span><i style="background:var(--avd);border-radius:50%"></i>'+t('rep')+'</span>')
    +(M.plans.length>1?'<span><i style="background:none;border-top:2px dashed var(--ink);height:0;border-radius:0;vertical-align:2px"></i>'+t('other_rt')+'</span>':'');
};

/* ---------- control room ---------- */
const OPS_H=72;let opsCache=null,playT=null;
function opsData(){
  const c=ctx(),key=[st.series&&st.series.__id,c.reports.length,c.reports.map(r=>r.conf).join(''),st.useOD,st.lang].join('|');
  if(opsCache&&opsCache.key===key&&opsCache.series===st.series)return opsCache;
  const hill=EDGES.filter(e=>!e.plain&&!e.virtual);
  const rows=hill.map(e=>{const sc=[],rr=[];for(let a=0;a<OPS_H;a++){const r=segScore(e,a,c);sc.push(r.score);rr.push(r);}
    const peak=Math.max(...sc);return{e,sc,rr,peak,peakAt:sc.indexOf(peak)};});
  rows.sort((x,y)=>y.peak-x.peak||y.sc[0]-x.sc[0]);
  /* traffic: busiest stretches in the next 24 h by the calendar model, both directions */
  const jams=EDGES.filter(e=>!e.virtual).map(e=>{let b={ci:0};for(let a=0;a<24;a++)['up','dn'].forEach(d=>{const x=traffic(e,d,c.hour0+a*3600e3);if(x.ci>b.ci)b={ci:x.ci,dm:x.dm,a,d};});return Object.assign({e},b);})
    .sort((x,y)=>y.ci-x.ci).slice(0,6);
  opsCache={key,series:st.series,rows,jams,c};return opsCache;
}
function hourLabel(a){const ms=st.hour0+a*3600e3,d=dayOf(ms)-dayOf(st.nowMs);return (d===0?'':dowOf(dayOf(ms))+' ')+clock(ms);}
function advisoryText(D){
  const L_=st.lang,lines=[];
  lines.push(fill(t('adv_head'),{d:fmtDate(dayOf(st.nowMs))+' '+clock(st.nowMs)+' IST'}));
  const av=D.rows.filter(r=>r.sc.slice(0,24).some(x=>x>=65));
  if(av.length){lines.push(t('adv_avd'));av.forEach(r=>{const a=r.sc.findIndex(x=>x>=65),b=23-r.sc.slice(0,24).reverse().findIndex(x=>x>=65);
    lines.push('• '+segName(r.e)+(r.e.spots.length?' ('+r.e.spots.map(nm).join(', ').replace(/, ([^,]*)$/,L_==='hi'?' और $1':' and $1')+')':'')+': '+hourLabel(a)+t('rng')+hourLabel(b+1)+' · '+(L_==='hi'?'स्कोर ':'score ')+Math.max(...r.sc.slice(0,24)));});}
  else lines.push(t('adv_none'));
  const nc=D.rows.filter(r=>!r.sc.slice(0,24).some(x=>x>=65)&&r.sc.slice(0,24).some(x=>x>=35)).length;
  if(nc)lines.push(fill(t('adv_cau'),{n:nc}));
  lines.push(fill(t('adv_basis'),{w:t(st.src==='sim'?'adv_sim':st.src==='replay'?'adv_rp':'adv_live')}));
  return lines.join('\n');
}
function renderOps(){
  const D=opsData(),h=Math.max(0,Math.min(OPS_H-1,st.opsH|0));
  const blocks=[];for(let b=0;b<OPS_H/6;b++)blocks.push(b);
  const v6c=D.rows.some(r=>v6Today(r.e.id)),v6u=v6c&&!!st.v6; // model v6 today, in use or on trial
  let grid='<div class="grid'+(v6c?' v6c':'')+'" role="table"><div class="gr gh" role="row"><span class="gn" role="columnheader"></span>'+blocks.map(b=>'<span role="columnheader">'+esc(hourLabel(b*6))+'</span>').join('')
    +(v6c?'<span role="columnheader" class="v6h" title="'+esc(t(v6u?'v6_col_u':'v6_col_t'))+'">v6</span>':'')+'</div>';
  D.rows.forEach(r=>{grid+='<div class="gr" role="row"><button class="gn" type="button" data-oz="'+r.e.id+'" role="rowheader">'+esc(segName(r.e))+'</button>'
    +blocks.map(b=>{const m=Math.max(...r.sc.slice(b*6,b*6+6));return '<button type="button" class="gc l'+lvl(m)+(h>=b*6&&h<b*6+6?' on':'')+'" data-oh="'+(b*6)+'" title="'+esc(segName(r.e)+' · '+hourLabel(b*6)+' · '+m)+'">'+m+'</button>';}).join('')
    +(v6c?(x=>'<span class="gc v6 l'+(x?lvl(x.v):0)+'" title="'+esc(segName(r.e)+' · '+t(v6u?'v6_col_u':'v6_col_t'))+'">'+(x?x.v:'')+'</span>')(v6Today(r.e.id)):'')+'</div>';});
  grid+='</div>';
  const reps=ctx().reports.slice().sort((a,b)=>b.ts-a.ts);
  $('v-ops').innerHTML='<div class="ops-h"><h2>'+t('ops_t')+'</h2><p class="sub">'+t('ops_s')+'</p></div>'
    +'<div class="kpis" id="ops-k"></div>'
    +'<div class="ops-g"><div class="ops-map card"><div class="slider"><button class="btn sm" id="ops-play" type="button">'+t(playT?'ops_pause':'ops_play')+'</button>'
      +'<input type="range" id="ops-h" min="0" max="'+(OPS_H-1)+'" value="'+h+'" aria-label="'+t('ops_at')+'"><b id="ops-hl"></b></div>'
      +'<div id="omap" class="lmap tall"></div><div class="legend"><span><i style="background:var(--go)"></i>'+t('go')+'</span><span><i style="background:var(--cau)"></i>'+t('cau')+'</span><span><i style="background:var(--avd)"></i>'+t('avd')+'</span><span><i style="background:var(--avd);border-radius:50%"></i>'+t('rep')+'</span></div></div>'
    +'<div class="card ops-grid"><h3>'+t('grid_t')+'</h3><p class="sub">'+t('grid_s')+'</p>'+grid+'</div></div>'
    +'<div class="ops-g2"><div class="card"><h3>'+t('adv_t')+'</h3><p class="sub">'+t('adv_s')+'</p><pre class="adv" id="adv">'+esc(advisoryText(D))+'</pre>'
      +'<div class="acts in"><button class="btn" type="button" id="adv-copy">'+t('adv_copy')+'</button><button class="btn pri" type="button" id="adv-wa">'+t('adv_wa')+'</button></div></div>'
    +'<div class="card"><h3>'+t('jam_t')+'</h3><p class="sub">'+t('jam_s')+'</p>'+D.jams.map(j=>'<div class="rep"><div class="t">'+esc(segName(j.e))+'</div><span class="pill l'+tlvl(j.ci)+'">×'+j.dm.toFixed(1)+'</span><div class="m">'+esc(hourLabel(j.a)+' · '+t('trf'+tlvl(j.ci)))+'</div></div>').join('')+'</div>'
    +'<div class="card"><h3>'+t('rep_t')+'</h3>'+(reps.length?reps.map(r=>'<div class="rep"><div class="t">'+esc(t('t_'+r.type))+'</div><span class="pill pl">'+r.conf+'</span><div class="m">'+esc(repLabel(r)+' · '+ago(r.ts)+' '+t('ago')+' · '+(r.sample?t('sample'):t('you')))+'</div></div>').join(''):'<p class="note">'+t('rep_none')+'</p>')+'</div></div>';
  const o=GL&&glOps(D)?null:makeMap('omap'); // 2.0: MapLibre when WebGL is there (src/shell.js), Leaflet otherwise
  if(o){
    const g=L.layerGroup().addTo(o.map),bounds=[];o.lines={};
    EDGES.forEach(e=>{if(e.virtual||!e.plain)return;L.polyline(geomOf(e),{color:cssv('--muted'),weight:2,opacity:.35,interactive:false}).addTo(g);});
    D.rows.forEach(r=>{const ll=geomOf(r.e);ll.forEach(p=>bounds.push(p));o.lines[r.e.id]=casedLine(g,ll,cssv('--go'),5).bindPopup('');});
    ctx().reports.filter(x=>x.type!=='clear'&&S[x.seg]).forEach(x=>{const s=S[x.seg],f=s.spots[x.spot]?s.spots[x.spot].f:.5,p=along(geomOf(s),f);L.marker([p.lat,p.lon],{icon:divIcon('!','lf-rep',[16,16]),zIndexOffset:500}).bindTooltip(esc(t('t_'+x.type))).addTo(g);});
    if(OD.events&&OD.events.length&&st.useOD)OD.events.forEach(p=>L.circleMarker([p[0],p[1]],{radius:2,color:'#6B4C9A',weight:0,fillColor:'#6B4C9A',fillOpacity:.55,interactive:false}).addTo(g));
    Object.keys(N).forEach(id=>{const n=N[id];if(n.k!=='h'||n.foot||!n.stay)return;L.circleMarker([n.lat,n.lon],{radius:2.5,color:cssv('--ink'),weight:1,fillColor:cssv('--surface'),fillOpacity:1}).bindTooltip(esc(nm(n)),{direction:'right',className:'tlab'}).addTo(g);});
    o.map.fitBounds(bounds,{padding:[16,16]});
  }
  opsHour(h);
}
function opsHour(h){
  st.opsH=h;const D=opsData(),o=LM.omap;
  let n=[0,0,0],worst=null;
  D.rows.forEach(r=>{const s=r.sc[h],l=lvl(s);n[l]++;if(!worst||s>worst.s)worst={r,s};
    if(o&&o.lines&&o.lines[r.e.id]){o.lines[r.e.id].setStyle({color:cssv('--'+LV[l])});const x=r.rr[h];
      o.lines[r.e.id].setPopupContent('<b>'+esc(segName(r.e))+'</b><br>'+esc(hourLabel(h)+' · '+t(LV[l])+' '+s+'/100 · '+t('rain')+' '+Math.round(x.P24)+'/'+Math.round(edThr(r.e)(24))+' mm'+(x.rw?' · '+t('rep'):'')));}});
  if(o&&o.gl)glOpsHour(D,h);
  const reps=ctx().reports.filter(r=>r.type!=='clear').length,k=$('ops-k');
  if(k)k.innerHTML='<div class="kp l2"><small>'+t('k_avd')+'</small><b>'+n[2]+'</b><em>'+fill(t('k_of'),{n:D.rows.length})+'</em></div><div class="kp l1"><small>'+t('k_cau')+'</small><b>'+n[1]+'</b><em>'+fill(t('k_of'),{n:D.rows.length})+'</em></div><div class="kp l0"><small>'+t('k_go')+'</small><b>'+n[0]+'</b><em>'+fill(t('k_of'),{n:D.rows.length})+'</em></div>'
    +'<div class="kp"><small>'+t('k_rep')+'</small><b>'+reps+'</b><em>&nbsp;</em></div><div class="kp wide"><small>'+t('k_worst')+'</small><b class="sm">'+esc(worst?segName(worst.r.e):'')+'</b><em>'+(worst?esc(t(LV[lvl(worst.s)])+' '+worst.s):'')+'</em></div>';
  if($('ops-hl'))$('ops-hl').textContent=t('ops_at')+': '+hourLabel(h)+(h===0?' ('+t('ops_now')+')':'');
  if($('ops-h'))$('ops-h').value=h;
  document.querySelectorAll('#v-ops .gc').forEach(c=>{const b=+c.dataset.oh;c.classList.toggle('on',h>=b&&h<b+6);});
}
function stopPlay(){if(playT){clearInterval(playT);playT=null;const b=$('ops-play');if(b)b.textContent=t('ops_play');}}
function togglePlay(){
  if(playT){stopPlay();return;}
  $('ops-play').textContent=t('ops_pause');
  playT=setInterval(()=>{if(st.view!=='ops'){stopPlay();return;}opsHour((st.opsH+1)%OPS_H);},350);
}

/* ---------- proof: closure-day replay with the app's own engine ---------- */
const RP_BAKED=/*__REPLAY_BAKED__*/null;
const RP_API={archive:{host:'https://archive-api.open-meteo.com/v1/archive',v:'precipitation'},
 prev1:{host:'https://previous-runs-api.open-meteo.com/v1/forecast',v:'precipitation_previous_day1'},
 prev2:{host:'https://previous-runs-api.open-meteo.com/v1/forecast',v:'precipitation_previous_day2'}};
/* baked results win over older runs saved in this browser; runs made here after the baked ones are kept */
let RP=(()=>{const loc=lsGet('pp_proof',null);if(!RP_BAKED)return loc||{results:{},series:{}};
  const out={results:Object.assign({},RP_BAKED.results),series:Object.assign({},RP_BAKED.series)};if(!loc)return out;
  const newest=Object.values(RP_BAKED.results).reduce((m,r)=>r.ranAt>m?r.ranAt:m,'');
  Object.entries(loc.results||{}).forEach(([k,r])=>{if(r.ranAt>newest)out.results[k]=r;});
  Object.entries(loc.series||{}).forEach(([k,v])=>{if(!out.series[k])out.series[k]=v;});return out;})();
RP.results=RP.results||{};RP.series=RP.series||{};
let rpSel=Object.keys(RP.results)[0]||null,rpMsg='',rpErr='';
function saveRP(){if(!lsSet('pp_proof',RP)){const lite={results:RP.results,series:{}};Object.keys(RP.series).filter(k=>k.endsWith('/archive')).forEach(k=>{lite.series[k]=RP.series[k];});lsSet('pp_proof',lite);}}
function addDays(s,n){const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
const allKeys=()=>[...new Set(EDGES.filter(e=>!e.virtual).map(locKey))];
async function fetchRain(date,src){
  const a=RP_API[src],keys=allKeys(),start=addDays(date,-3),end=addDays(date,2);
  const url=a.host+'?latitude='+keys.map(k=>k.split(',')[0]).join(',')+'&longitude='+keys.map(k=>k.split(',')[1]).join(',')+'&hourly='+a.v+'&start_date='+start+'&end_date='+end+'&timezone=Asia%2FKolkata';
  const res=await omFetch(url,()=>{rpMsg=t('pr_wait');if(st.view==='proof')renderProof();});if(!res.ok)throw new Error('Open-Meteo '+res.status+' ('+src+' '+date+')');
  let js=await res.json();if(!Array.isArray(js))js=[js];
  if(js.length!==keys.length)throw new Error('unexpected reply shape');
  const by={};let nulls=0,total=0;
  keys.forEach((k,i)=>{const h=js[i].hourly,t0=h.time.indexOf(start+'T00:00');if(t0<0)throw new Error('day not in reply');
    by[k]=h[a.v].slice(t0,t0+144).map(v=>{total++;if(v==null){nulls++;return 0;}return Math.round(v*10)/10;});});
  return{by,start,nulls,total,url};
}
/* series in the engine's layout (index j+PAST = hour j from hour0) cut from a stored block that starts at 00:00 IST on `start` */
function seriesFrom(rec,hour0){
  const s0=Date.parse(rec.start+'T00:00:00+05:30'),off=Math.round((hour0-s0)/3600e3)-PAST,out={};
  EDGES.forEach(e=>{const src=rec.by[locKey(e)];const a=new Array(SERIES_LEN).fill(0);if(src)for(let i=0;i<SERIES_LEN;i++){const v=src[i+off];if(v!=null&&i+off>=0)a[i]=v;}out[e.id]=a;});
  out.__id='rp'+rec.start+hour0;return out;
}
function scoreDay(date,rec){
  const nowMs=Date.parse(date+'T00:00:00+05:30'),c={series:seriesFrom(rec,nowMs),reports:[],nowMs,hour0:nowMs};
  const rd=RP_DAILY&&RP_DAILY[date];if(rd&&modelOn()){const o={};EDGES.forEach(e=>{o[e.id]=rd.by[locKey(e)]||null;});c.daily=o;c.dday0=parseDate(rd.start);}
  return EDGES.filter(e=>!e.plain&&!e.virtual).map(e=>{let best=null;for(let a=0;a<=23;a++){const r=segScore(e,a,c);if(!best||r.score>best.score)best=Object.assign({hour:a},r);}
    return{id:e.id,score:best.score,band:lvl(best.score),hour:best.hour,P6:+best.P6.toFixed(1),P24:+best.P24.toFixed(1),P72:+best.P72.toFixed(1),ratio:+best.ratio.toFixed(2),susc:e.susc,slSrc:e.slSrc};});
}
function rpMetrics(ev,rows){
  const closed=new Set(ev.closures.map(c=>c.link)),named=rows.filter(r=>closed.has(r.id)),others=rows.filter(r=>!closed.has(r.id));
  const hit=named.filter(r=>r.band===2).length,hitC=named.filter(r=>r.band>=1).length;
  return{named:named.length,hit,hitCaution:hitC,hitRate:named.length?hit/named.length:null,avoidTotal:rows.filter(r=>r.band===2).length,avoidUnnamed:others.filter(r=>r.band===2).length,links:rows.length};
}
async function rpRun(ev,src){
  rpMsg=fill(t('pr_busy'),{d:ev.label,s:t('pr_'+src)});rpErr='';if(st.view==='proof')renderProof();
  const rec=await fetchRain(ev.date,src);
  RP.series[ev.id+'/'+src]={start:rec.start,by:rec.by};
  const rows=scoreDay(ev.date,rec),c=odCounts();
  const res={event:ev.id,date:ev.date,source:src,nulls:rec.nulls,total:rec.total,rows,metrics:rpMetrics(ev,rows),slope:c.slUsed?'dem':'demo',hist:c.hiUsed?'nasa':'demo',km:c.kmUsed?'osrm':'hand',engine:st.engine,ranAt:new Date().toISOString(),url:rec.url};
  const rk=ev.id+'/'+src+'/'+res.slope+(res.hist==='nasa'?'+nasa':'')+(st.engine==='v5'?'/v5':'');RP.results[rk]=res;rpSel=rk;saveRP();return res;
}
/* weather for the trip planner on a recorded day: 06:00 IST on that day is "now" */
async function loadReplayWeather(date){
  const ev=GT.events.find(e=>e.date===date)||{id:date,date};
  let rec=RP.series[ev.id+'/archive'];
  if(!rec){try{rec=await fetchRain(date,'archive');RP.series[ev.id+'/archive']={start:rec.start,by:rec.by};saveRP();}catch(e){return false;}}
  st.nowMs=Date.parse(date+'T06:00:00+05:30');st.hour0=st.nowMs;st.src='replay';
  st.series=seriesFrom(rec,st.hour0);st.dateIdx=dayOf(st.nowMs);return true;
}
const pct=x=>x==null?'n/a':Math.round(100*x)+'%';
let PSEC=(()=>{const q=new URLSearchParams(location.search).get('psec');if(q)return q;try{return sessionStorage.getItem('pp_psec')||'season';}catch(e){return 'season';}})();
document.addEventListener('click',e=>{const b=e.target.closest('[data-psec]');if(!b)return;PSEC=b.dataset.psec;try{sessionStorage.setItem('pp_psec',PSEC);}catch(x){}renderProof();});
function renderProof(){
  const evs=GT.events,keys=Object.keys(RP.results).sort();
  if(rpSel&&!RP.results[rpSel])rpSel=keys[0]||null;
  const R=rpSel&&RP.results[rpSel],ev=R&&evs.find(e=>e.id===R.event);
  const psec=['season','replay','method','all'].includes(PSEC)?PSEC:'season'; // all: every section at once (tests, printing)
  let h='<div class="ops-h"><h2>'+t('pr_t2')+'</h2><p class="sub">'+t('pr_s2')+'</p></div>'
   +'<div class="seg" role="tablist">'+['season','replay','method'].map(k=>'<button type="button" role="tab" data-psec="'+k+'" aria-selected="'+(psec===k)+'">'+t('ps_'+k)+'</button>').join('')+'</div>'
   +'<div class="psec" data-psec-body="season"'+(psec==='season'||psec==='all'?'':' hidden')+'>'+btCard()+indepCard()+'</div>'
   +'<div class="psec" data-psec-body="replay"'+(psec==='replay'||psec==='all'?'':' hidden')+'><p class="sub psub">'+t('pr_s')+'</p>'
   +(RP_BAKED?'<div class="card"><h3>'+t('pr_learn')+'</h3><ul class="ul">'+[1,2,3,4].map(i=>'<li>'+t('pr_l'+i)+'</li>').join('')+'</ul></div>':'')
   +'<div class="card"><div class="row"><label class="fld"><span>'+t('pr_day')+'</span><select id="pr-ev">'+evs.map((e,i)=>'<option value="'+i+'"'+(ev&&ev.id===e.id?' selected':'')+'>'+esc(rpEvLabel(e))+'</option>').join('')+'</select></label>'
   +'<label class="fld"><span>'+t('pr_src')+'</span><select id="pr-src">'+Object.keys(RP_API).map(k=>'<option value="'+k+'"'+(R&&R.source===k?' selected':'')+'>'+t('pr_'+k)+'</option>').join('')+'</select></label></div>'
   +'<div class="acts in"><button class="btn pri" id="pr-run" type="button">'+t('pr_run')+'</button><button class="btn" id="pr-all" type="button">'+t('pr_all')+'</button><button class="btn" id="pr-dl" type="button">'+t('pr_dl')+'</button><button class="btn" id="pr-ul" type="button">'+t('pr_ul')+'</button></div>'
   +'<p class="note" id="pr-msg">'+esc(rpMsg)+'</p>'+(rpErr?'<p class="note err">'+esc(rpErr)+'</p>':'')+'</div>';
  if(!keys.length)h+='<div class="card"><p class="note">'+t('pr_none')+'</p></div>';
  else{
    h+='<div class="card"><h3>'+t('pr_board')+'</h3><div class="wrap"><table class="tb"><tr><th>'+t('pr_b_day')+'</th><th>'+t('pr_b_src')+'</th><th>'+t('pr_b_hit')+'</th><th>'+t('pr_b_cau')+'</th><th>'+t('pr_b_fa')+'</th><th>'+t('pr_b_sl')+'</th></tr>'
      +keys.map(k=>{const r=RP.results[k],e=evs.find(x=>x.id===r.event)||{label:r.event,control:false},m=r.metrics;
        return '<tr class="'+(k===rpSel?'on':'')+'" data-rp="'+esc(k)+'"><td>'+esc(rpEvLabel(e))+'</td><td>'+t('pr_'+r.source)+'</td><td>'+(e.control?'':m.hit+' / '+m.named+' ('+pct(m.hitRate)+')')+'</td><td>'+(e.control?'':m.hitCaution+' / '+m.named)+'</td><td>'+(e.control?m.avoidTotal:m.avoidUnnamed)+' / '+(m.links-m.named)+'</td><td>'+(r.slope==='dem'?'DEM':'demo')+' · '+(r.hist==='nasa'?'NASA':'demo')+' · '+(r.engine==='v5'?'v5':'v4')+'</td></tr>';}).join('')+'</table></div></div>';
  }
  if(R&&ev){
    const m=R.metrics,closed={};ev.closures.forEach(c=>{(closed[c.link]=closed[c.link]||[]).push(c.place);});
    const rows=R.rows.slice().sort((x,y)=>(closed[y.id]?1:0)-(closed[x.id]?1:0)||y.score-x.score),cols=t('pr_tbl').split(',');
    h+='<div class="card"><h3>'+esc(rpEvLabel(ev))+' · '+t('pr_'+R.source)+'</h3><div class="kpis">'
      +(ev.control?'':'<div class="kp l2"><small>'+t('pr_hit')+'</small><b>'+m.hit+' / '+m.named+'</b><em>'+pct(m.hitRate)+'</em></div><div class="kp l1"><small>'+t('pr_cau')+'</small><b>'+m.hitCaution+' / '+m.named+'</b><em>&nbsp;</em></div>')
      +'<div class="kp"><small>'+t(ev.control?'pr_fac':'pr_fa')+'</small><b>'+(ev.control?m.avoidTotal:m.avoidUnnamed)+' / '+(m.links-m.named)+'</b><em>&nbsp;</em></div><div class="kp"><small>'+t('pr_miss')+'</small><b>'+R.nulls+'</b><em>/ '+R.total+'</em></div></div>'
      +'<div id="pmap" class="lmap"></div>'
      +(ev.control?'':'<div class="acts in"><button class="btn" type="button" data-rpplan="'+ev.date+'">'+t('pr_plan')+'</button></div>')
      +'<div class="wrap"><table class="tb"><tr>'+cols.map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr>'
      +rows.map(r=>{const e=S[r.id];return '<tr><td>'+esc(e?segName(e):r.id)+'</td><td>'+esc((closed[r.id]||[]).join('; '))+'</td><td>'+r.score+'</td><td><span class="pill l'+r.band+'">'+t(LV[r.band])+'</span></td><td>'+String(r.hour).padStart(2,'0')+':00</td><td>'+r.P6+'</td><td>'+r.P24+'</td><td>'+r.P72+'</td><td>'+r.ratio+'</td><td>'+r.susc+(r.slSrc==='gsi'?' GSI':r.slSrc==='dem'?' DEM':' demo')+'</td></tr>';}).join('')+'</table></div>'
      +'<p class="note">'+t('pr_src_l')+': '+esc(ev.sources.join('; '))+'</p></div>';
  }
  h+='</div><div class="psec" data-psec-body="method"'+(psec==='method'||psec==='all'?'':' hidden')+'>';
  h+=tuneCard();
  h+='<div class="card"><h3>'+t('pr_read')+'</h3><ul class="ul"><li>'+t('pr_r1')+'</li><li>'+t('pr_r2')+'</li><li>'+t('pr_r3')+'</li><li>'+t('pr_r4')+'</li></ul></div>';
  h+=odCard()+'</div>';
  $('v-proof').innerHTML=h;
  if(R&&ev&&(psec==='replay'||psec==='all')){
    const o=GL&&glProof(R,ev)?null:makeMap('pmap'); // 2.0: MapLibre first, Leaflet otherwise
    if(o){const g=L.layerGroup().addTo(o.map),bounds=[];const closed={};ev.closures.forEach(c=>{(closed[c.link]=closed[c.link]||[]).push(c.place);});
      R.rows.forEach(r=>{const e=S[r.id];if(!e)return;const ll=geomOf(e);ll.forEach(p=>bounds.push(p));
        casedLine(g,ll,cssv('--'+LV[r.band]),5).bindPopup('<b>'+esc(segName(e))+'</b><br>'+esc(t(LV[r.band])+' '+r.score+' · '+String(r.hour).padStart(2,'0')+':00 · 24 h '+r.P24+' mm'));
        if(closed[r.id]){const p=along(ll,.5);L.marker([p.lat,p.lon],{icon:divIcon('✕','lf-x',[18,18]),zIndexOffset:900}).bindTooltip(esc(closed[r.id].join('; '))).addTo(g);}});
      o.map.fitBounds(bounds,{padding:[16,16]});}
  }
}
const rpEvLabel=e=>e.control?(st.lang==='hi'?'नियंत्रण: ':'Control: ')+rpLabel(e.date):rpLabel(e.date)+(st.lang==='hi'?', सड़कें बंद':', roads closed');
function odCard(){
  const c=odCounts();
  const hill=EDGES.filter(e=>!e.virtual&&(OD.km[e.id]||OD.slope[e.id]||OD.hist[e.id]));
  const cols=t('od_tbl').split(',');
  return '<div class="card"><h3>'+t('od_t')+'</h3><p class="sub">'+t('od_s')+'</p>'
    +'<div class="acts in"><button class="btn pri" id="od-roads" type="button"'+(odBusy?' disabled':'')+'>'+t('od_roads')+'</button><button class="btn pri" id="od-slope" type="button"'+(odBusy?' disabled':'')+'>'+t('od_slope')+'</button>'
    +'<label class="chk"><input type="checkbox" id="od-use"'+(st.useOD?' checked':'')+'> '+t('od_use')+'</label></div>'
    +'<div class="acts in"><button class="btn" id="od-exp" type="button">'+t('od_exp')+'</button><button class="btn" id="od-imp" type="button">'+t('od_imp')+'</button><button class="btn" id="od-clear" type="button">'+t('od_clear')+'</button></div>'
    +'<p class="note" id="od-msg">'+esc(odBusy||fill(t('od_st'),c)+' '+fill(t('od_st_h'),c))+'</p>'
    +(hill.length?'<div class="wrap"><table class="tb"><tr>'+cols.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr>'+hill.map(e=>{const k=OD.km[e.id],s=OD.slope[e.id];
      return '<tr><td>'+esc(segName(e))+'</td><td>'+e.km0+'</td><td>'+(k?k.km:'')+'</td><td>'+(k?(k.ok?t('od_ok'):t('od_flag')):'')+'</td><td>'+(e.plain?'':e.susc0)+'</td><td>'+(s?s.p75+'°':'')+'</td><td>'+(s?slopeClass(s.p75):'')+'</td><td>'+(e.plain?'':e.hist0)+'</td><td>'+(OD.hist[e.id]?OD.hist[e.id].n+' → '+OD.hist[e.id].cls:'')+'</td></tr>';}).join('')+'</table></div>':'')
    +'</div>';
}
async function odRun(kind){
  if(odBusy)return;
  const msg=x=>{odBusy=x;const m=$('od-msg');if(m)m.textContent=x;};
  try{msg(fill(t('od_busy'),{i:0,n:'…'}));renderProof();
    await (kind==='roads'?buildRoads:buildSlope)((i,n,w)=>msg(fill(t(w?'od_wait':'od_busy'),{i,n})));
    odBusy=null;applyOpenData();opsCache=null;toast(fill(t('od_st'),odCounts()));
  }catch(e){odBusy=null;toast(fill(t('od_err'),{e:String(e.message||e)}));}
  applyOpenData();renderProof();
}

/* ---------- safety tab ---------- */
const HELP=[['112','sf_112'],['1070','sf_1070'],['1077','sf_1077'],['1364','sf_1364']];
function renderSafety(M){
  const stays=M.cur.nodes.filter(id=>NODE(id).stay&&NODE(id).k==='h'&&!NODE(id).virtual);
  $('panel').innerHTML='<h4 class="sec" style="margin-top:0">'+t('sf_help')+'</h4>'
    +HELP.map(x=>'<a class="help" href="tel:'+x[0]+'"><b>'+x[0]+'</b><span>'+esc(t(x[1]))+'</span></a>').join('')
    +'<p class="note">'+t('sf_src')+' <a href="https://usdma.uk.gov.in/" target="_blank" rel="noopener noreferrer">usdma.uk.gov.in</a> · <a href="https://registrationandtouristcare.uk.gov.in/" target="_blank" rel="noopener noreferrer">registrationandtouristcare.uk.gov.in</a></p>'
    +'<button class="btn pri sos" id="a-sos" type="button">'+t('sf_sos')+'</button><p class="note">'+t('sf_sos_s')+'</p>'
    +(stays.length?'<h4 class="sec">'+t('sf_halts')+'</h4><p>'+stays.map(id=>esc(pname(id))).join(' · ')+'</p>':'')
    +'<h4 class="sec">'+t('sf_stuck')+'</h4><ul class="ul">'+t('sf_tips').map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><p class="note">'+t('sf_tipnote')+'</p>';
}

/* ---------- QR and links ---------- */
function shareUrl(){
  const p=new URLSearchParams();p.set('from',st.from);p.set('to',st.to);p.set('date',st.date);if(st.dep!=null)p.set('dep',st.dep);if(st.lang==='hi')p.set('lang','hi');if(st.scn!=='live')p.set('scn',st.scn);
  return (siteHosted()?location.origin+location.pathname:SITE_URL)+'?'+p.toString(); // the Android app and a saved file have no address another phone can open
}
function qrSvg(text){
  if(typeof qrcode==='undefined')return '';
  const q=qrcode(0,'M');q.addData(text);q.make();const n=q.getModuleCount();let d='';
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))d+='M'+c+' '+r+'h1v1h-1z';
  return '<svg class="qr" viewBox="-2 -2 '+(n+4)+' '+(n+4)+'" role="img" aria-label="QR"><rect x="-2" y="-2" width="'+(n+4)+'" height="'+(n+4)+'" fill="#fff"/><path d="'+d+'" fill="#000"/></svg>';
}
function showQr(){
  const u=shareUrl(),hosted=true;
  openModal('<h3>'+t('qr_t')+'</h3>'+(hosted?qrSvg(u):'<p class="note">'+t('qr_local')+'</p>'+qrSvg(u))+'<p class="mono">'+esc(u)+'</p><div class="acts in"><button class="btn pri" id="a-copyl" type="button">'+t('copy_l')+'</button></div>');
}
function openModal(h){$('modal-body').innerHTML=h;$('modal').hidden=false;}
function closeModal(){$('modal').hidden=true;$('modal-body').innerHTML='';}
function copyText(s){if(window.PPAndroid&&window.PPAndroid.copy){window.PPAndroid.copy(s);toast(t('copied'));return;}try{navigator.clipboard.writeText(s).then(()=>toast(t('copied')),()=>toast(s));}catch(e){toast(s);}}

/* ---------- trip from a sentence (typed or spoken), English, Hindi or Hinglish ---------- */
const ALIAS={delhi:['delhi','dilli','new delhi','नई दिल्ली','दिल्ली'],dehradun:['doon','dun'],kedarnath:['kedar','केदार'],badrinath:['badri','बद्री'],rishikesh:['rishikesh'],haridwar:['hardwar'],
  nainital:['naini tal'],mussoorie:['masoori','mussorie','mussoori','masuri'],gangotri:['gangotri'],yamunotri:['jamunotri'],ghangaria:['hemkund','valley of flowers','फूलों की घाटी','हेमकुंड'],srinagar:['srinagar'],kainchi:['kainchi','neem karoli'],ramnagar:['corbett','jim corbett','कॉर्बेट']};
const WD={en:['sunday','monday','tuesday','wednesday','thursday','friday','saturday'],hx:['ravivar','somvar','mangalvar','budhvar','guruvar','shukravar','shanivar'],hi:['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार']};
const MON=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'],MONHI=['जनवरी','फ़रवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्तूबर','नवंबर','दिसंबर'];
function parseAsk(text){
  const raw=' '+text.toLowerCase().replace(/[.,!?।]/g,' ').replace(/\s+/g,' ')+' ';
  const names=[];
  Object.keys(N).forEach(id=>{const n=N[id];[n.en.toLowerCase(),n.en.split(' (')[0].toLowerCase(),n.hi,...(ALIAS[id]||[])].forEach(a=>{if(a&&a.length>2)names.push([a,id]);});});
  names.sort((a,b)=>b[0].length-a[0].length);
  let s=raw;const found=[];
  names.forEach(([a,id])=>{let i=s.indexOf(a);while(i>=0){const pre=s[i-1],post=s[i+a.length];
      if(!/[a-z]/.test(pre||' ')&&!/[a-z]/.test(post||' ')){found.push({i,id});s=s.slice(0,i)+' '.repeat(a.length)+s.slice(i+a.length);}
      i=s.indexOf(a,i+1);}});
  found.sort((x,y)=>x.i-y.i);
  const ids=found.map(f=>f.id).filter((v,i,a)=>a.indexOf(v)===i);
  const out={};
  if(ids.length>=2){out.from=ids[0];out.to=ids[1];
    /* "X from Y": English "from" between the two places means the second one is the start */
    const fr=raw.indexOf(' from ',found[0].i);if(fr>=0&&fr<found[1].i){out.from=ids[1];out.to=ids[0];}
  }else if(ids.length===1)out.to=ids[0];
  const today=dayOf(st.nowMs);
  if(/ (day after tomorrow|parson|परसों) /.test(raw))out.date=today+2;
  else if(/ (tomorrow|kal|कल) /.test(raw))out.date=today+1;
  else if(/ (today|aaj|आज|abhi|अभी) /.test(raw))out.date=today;
  else{
    for(let w=0;w<7;w++){if([WD.en[w],WD.hx[w],WD.hi[w]].some(x=>raw.indexOf(' '+x)>=0)){let d=today+1;while((d+4)%7!==w)d++;out.date=d;break;}}
    const m=/ (\d{1,2})(?:st|nd|rd|th)? (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* /.exec(raw)||/ (\d{1,2}) (जनवरी|फ़रवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|अक्तूबर|नवंबर|दिसंबर) /.exec(raw);
    if(m){let mo=MON.indexOf(m[2]);if(mo<0)mo=MONHI.indexOf(m[2]);if(mo>=0){const y=new Date(st.nowMs+IST).getUTCFullYear();let d=dI(y,mo+1,+m[1]);if(d<today)d=dI(y+1,mo+1,+m[1]);out.date=d;}}
  }
  const tm=/ (\d{1,2})(?::(\d{2}))? ?(am|pm|a m|p m|baje|बजे|o'?clock)? /.exec(raw.replace(/ (\d{1,2})(?:st|nd|rd|th)? (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* /,' '));
  if(tm&&(tm[3]||/ (subah|सुबह|morning|shaam|शाम|evening|raat|रात|night|dopahar|दोपहर|afternoon) /.test(raw))){
    let hh=+tm[1];const pmw=/pm|p m/.test(tm[3]||'')||/ (shaam|शाम|evening|raat|रात|night|dopahar|दोपहर|afternoon) /.test(raw);
    if(pmw&&hh<12)hh+=12;if(/am|a m/.test(tm[3]||'')&&hh===12)hh=0;if(hh>=0&&hh<24)out.dep=hh;
  }
  return out;
}
function applyAsk(text){
  const r=parseAsk(text);
  if(!r.to){toast(t('ask_no'));return false;}
  dropVirtual('vf');dropVirtual('vt');
  if(r.from)st.from=r.from;st.to=r.to;st.pmsg=null;st.pick=null;
  if(r.date!=null){st.dateIdx=r.date;clampDate();}
  st.dep=r.dep!=null?r.dep:null;
  render();
  toast(fill(t('ask_ok'),{x:pname(st.from)+' → '+pname(st.to)+', '+fmtDate(st.dateIdx)+(st.dep!=null?' '+String(st.dep).padStart(2,'0')+':00':'')}));
  return true;
}
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
function listen(){
  if(!SR)return;
  const r=new SR();r.lang=st.lang==='hi'?'hi-IN':'en-IN';r.interimResults=false;r.maxAlternatives=1;
  $('b-mic').classList.add('on');toast(t('ask_listen'));
  r.onresult=e=>{const x=e.results[0][0].transcript;$('in-ask').value=x;applyAsk(x);};
  r.onend=()=>$('b-mic').classList.remove('on');r.onerror=()=>$('b-mic').classList.remove('on');
  try{r.start();}catch(e){$('b-mic').classList.remove('on');}
}

/* ---------- wiring ---------- */
const renderFormBase=renderForm;
renderForm=function(){
  renderFormBase();
  $('in-ask').placeholder=t('ask_ph');$('b-mic').setAttribute('aria-label',t('ask_mic'));$('b-mic').title=t('ask_mic');$('b-mic').hidden=!SR;
};
$('in-ask').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyAsk(e.target.value);}});
$('b-mic').addEventListener('click',listen);
$('modal-x').addEventListener('click',closeModal);
$('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('modal').hidden)closeModal();});
document.addEventListener('input',e=>{if(e.target.id==='ops-h'){stopPlay();opsHour(+e.target.value);}});
document.addEventListener('change',e=>{
  if(e.target.id==='od-use'){st.useOD=e.target.checked;lsSet('pp_od_use',st.useOD);applyOpenData();opsCache=null;render();}
});
document.addEventListener('click',e=>{
  const c=e.target.closest('[data-view],[data-tiles],[data-oh],[data-oz],[data-rp],[data-rpplan],#ops-play,#adv-copy,#adv-wa,#pr-run,#pr-all,#pr-dl,#pr-ul,#od-roads,#od-slope,#od-exp,#od-imp,#od-clear,#a-sos,#a-qr,#a-copyl');if(!c)return;
  if(c.dataset.view){st.view=c.dataset.view;render();window.scrollTo(0,0);}
  else if(c.dataset.tiles){st.tiles=c.dataset.tiles==='1';render();}
  else if(c.dataset.oh!=null){stopPlay();opsHour(+c.dataset.oh);}
  else if(c.dataset.oz){const o=LM.omap;if(o&&o.gl&&S[c.dataset.oz]){glOpsZoom(c.dataset.oz);$('omap').scrollIntoView({block:'center',behavior:'smooth'});}
    else if(o&&S[c.dataset.oz]){o.map.fitBounds(geomOf(S[c.dataset.oz]),{padding:[40,40],maxZoom:11});const ln=o.lines[c.dataset.oz];if(ln)ln.openPopup();$('omap').scrollIntoView({block:'center',behavior:'smooth'});}}
  else if(c.dataset.rp){rpSel=c.dataset.rp;renderProof();}
  else if(c.dataset.rpplan){st.scn='rp:'+c.dataset.rpplan;st.view='trip';st.err='';
    st.from='delhi';st.to='gangotri';
    resetPick();load();window.scrollTo(0,0);}
  else if(c.id==='ops-play')togglePlay();
  else if(c.id==='adv-copy')copyText($('adv').textContent);
  else if(c.id==='adv-wa')waOpen($('adv').textContent);
  else if(c.id==='pr-run'){const ev=GT.events[+$('pr-ev').value],src=$('pr-src').value;rpRun(ev,src).then(()=>{rpMsg=t('pr_done');renderProof();},err=>{rpMsg='';rpErr=String(err.message||err);renderProof();});}
  else if(c.id==='pr-all'){(async()=>{const errs=[];for(const ev of GT.events)for(const src of Object.keys(RP_API)){try{await rpRun(ev,src);}catch(err){errs.push(String(err.message||err));}}rpMsg=t('pr_done');rpErr=errs.join(' | ');renderProof();})();}
  else if(c.id==='pr-dl')download('pahaadpath_replay_results.json',{app:'PahaadPath',groundTruth:GT,results:RP.results,series:RP.series});
  else if(c.id==='pr-ul')pickFile(js=>{if(!js.results)throw new Error('no results in file');Object.assign(RP.results,js.results);Object.assign(RP.series,js.series||{});rpSel=Object.keys(js.results)[0];saveRP();renderProof();});
  else if(c.id==='od-roads')odRun('roads');
  else if(c.id==='od-slope')odRun('slope');
  else if(c.id==='od-exp')download('pahaadpath_open_data.json',OD);
  else if(c.id==='od-imp')pickFile(js=>{if(!js.km)throw new Error('not an open data file');OD=js;['km','geom','slope','meta','hist'].forEach(k=>{OD[k]=OD[k]||{};});saveOD();applyOpenData();opsCache=null;renderProof();});
  else if(c.id==='od-clear'){OD={km:{},geom:{},slope:{},meta:{},hist:{}};saveOD();applyOpenData();opsCache=null;renderProof();}
  else if(c.id==='a-sos')sos();
  else if(c.id==='a-qr')showQr();
  else if(c.id==='a-copyl')copyText(shareUrl());
});
if(/^https?:/.test(location.protocol)){
  const l=document.createElement('link');l.rel='manifest';l.href='manifest.webmanifest';document.head.appendChild(l);
  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
}
