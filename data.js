// Mayhem verileri: sınıflar, buildler, item etkileri, rünler, sihirdar büyüleri, ultiler
(function (root) {
  const ROLES = ['top', 'jungle', 'mid', 'adc', 'support'];
  const ROLE_NAMES = { top: 'Üst Koridor', jungle: 'Orman', mid: 'Orta Koridor', adc: 'Nişancı', support: 'Destek' };
  const ROLE_SHORT = { top: 'ÜST', jungle: 'ORM', mid: 'ORTA', adc: 'NİŞ', support: 'DST' };

  const split = s => s.trim().split(/\s+/);
  const ROLE_POOLS = {
    top: split('Aatrox Ambessa Camille Chogath Darius DrMundo Fiora Gangplank Garen Gnar Gragas Gwen Illaoi Irelia Jax Jayce Kayle Kennen Kled KSante Malphite Mordekaiser Nasus Olaf Ornn Pantheon Poppy Quinn Renekton Riven Rumble Sett Shen Singed Sion Teemo Trundle Tryndamere Urgot Volibear Warwick Yasuo Yone Yorick Zaahen Akali Aurora Vladimir Sylas Zac'),
    jungle: split('Amumu Belveth Briar Diana Ekko Elise Evelynn Fiddlesticks Gragas Graves Hecarim Ivern JarvanIV Karthus Kayn Khazix Kindred LeeSin Lillia Locke MasterYi MonkeyKing Naafiri Nidalee Nocturne Nunu Rammus RekSai Rengar Sejuani Shaco Shyvana Skarner Taliyah Talon Udyr Vi Viego Volibear Warwick XinZhao Zac Zaahen Jax Poppy'),
    mid: split('Ahri Akali Akshan Anivia Annie AurelionSol Aurora Azir Cassiopeia Corki Ekko Fizz Galio Hwei Irelia Kassadin Katarina Leblanc Lissandra Locke Lux Malzahar Mel Naafiri Neeko Orianna Qiyana Ryze Swain Sylas Syndra Taliyah Talon TwistedFate Veigar Vex Viktor Vladimir Xerath Yasuo Yone Zed Ziggs Zoe Smolder'),
    adc: split('Aphelios Ashe Caitlyn Corki Draven Ezreal Jhin Jinx Kaisa Kalista KogMaw Lucian MissFortune Nilah Samira Senna Sivir Smolder Tristana Twitch Varus Vayne Xayah Yunara Zeri Ziggs'),
    support: split('Alistar Bard Blitzcrank Brand Braum Janna Karma Leona Lulu Lux Maokai Mel Milio Morgana Nami Nautilus Neeko Pyke Rakan Rell Renata Senna Seraphine Sona Soraka Swain TahmKench Taric Thresh Velkoz Xerath Yuumi Zilean Zyra Poppy')
  };

  // Her şampiyonun gerçek oyundaki build sınıfı
  const CLASS_OF = {};
  const CLASS_LIST = {
    marksman: 'Caitlyn Jinx Draven Tristana Xayah Sivir Aphelios Samira Nilah Yunara Zeri Graves Akshan Kindred Yasuo Yone Tryndamere MissFortune Ashe Gangplank Twitch',
    onhit: 'Kaisa Vayne KogMaw Varus Kalista MasterYi',
    caster: 'Ezreal Jhin Corki Lucian Smolder Senna Quinn Jayce',
    assassin: 'Zed Talon Khazix Rengar Qiyana Pyke Kayn Naafiri Shaco Locke',
    apAssassin: 'Akali Evelynn Fizz Kassadin Katarina Leblanc Diana Ekko Elise Nidalee Sylas Vex Aurora Fiddlesticks Kennen',
    mage: 'Annie Lux Syndra Veigar Orianna Xerath Velkoz Zoe Ahri Neeko Hwei Mel Lissandra Viktor Ziggs Taliyah AurelionSol Azir Seraphine Malzahar TwistedFate Heimerdinger',
    battlemage: 'Ryze Cassiopeia Swain Vladimir Anivia Brand Karthus',
    apBruiser: 'Gwen Mordekaiser Lillia Rumble Teemo Singed Gragas Kayle',
    fighter: 'Aatrox Darius Fiora Garen Irelia Jax Camille Riven Renekton Sett Olaf Pantheon Vi XinZhao MonkeyKing LeeSin Hecarim Trundle JarvanIV Kled Udyr Warwick Viego Belveth Briar Yorick Illaoi Volibear Ambessa Zaahen Gnar RekSai Nasus Urgot Shyvana Nocturne',
    tank: 'Malphite Ornn Sion Maokai Zac Sejuani Amumu Rammus Chogath DrMundo KSante Poppy Shen Galio Skarner TahmKench Nunu',
    engage: 'Leona Nautilus Alistar Rell Braum Thresh Blitzcrank Rakan Taric',
    enchanter: 'Janna Lulu Nami Soraka Sona Karma Yuumi Milio Renata Zilean Ivern Bard',
    mageSup: 'Zyra Morgana'
  };
  for (const c in CLASS_LIST) for (const id of split(CLASS_LIST[c])) CLASS_OF[id] = c;

  const CLASS_NAMES = {
    marksman: 'Nişancı', onhit: 'İsabetli Nişancı', caster: 'Yetenekçi Nişancı', assassin: 'Suikastçı',
    apAssassin: 'Büyülü Suikastçı', mage: 'Patlayıcı Büyücü', battlemage: 'Savaş Büyücüsü', apBruiser: 'Büyülü Savaşçı',
    fighter: 'Savaşçı', tank: 'Tank', engage: 'Öncü Destek', enchanter: 'Büyüleyici Destek', mageSup: 'Büyücü Destek'
  };
  const CLASS_DESC = {
    marksman: 'Arkadan sürekli kritik hasar. Korunursa takımı tek başına taşır.',
    onhit: 'Saldırı başına ek etki. Saldırı hızı ve isabet itemleriyle tankları eritir.',
    caster: 'Yetenekleriyle uzaktan dürter. Yetenek hızı ve saldırı gücü ister.',
    assassin: 'Arka hatta dalar, tek hedefi siler. Ölümcüllük ister.',
    apAssassin: 'Büyü hasarıyla anında patlatır. Yetenek gücü ve büyü nüfuzu ister.',
    mage: 'Uzaktan yüksek büyü patlaması. Yetenek gücü ister.',
    battlemage: 'Savaşın ortasında sürekli büyü hasarı. Can ve yetenek gücü ister.',
    apBruiser: 'Büyü hasarı veren dayanıklı savaşçı.',
    fighter: 'Ön safta hasar verip alan savaşçı. Saldırı gücü, can ve can emme ister.',
    tank: 'Takımın kalkanı. Savaşı başlatır, kitle kontrolüyle rakibi kilitler.',
    engage: 'Savaşı başlatan, rakibi kilitleyen destek.',
    enchanter: 'Dostlarını iyileştirir, korur ve güçlendirir.',
    mageSup: 'Büyü hasarı ve kontrolle destekler.'
  };

  // Sınıflara göre gerçek buildler: [ayakkabı, önerilen 4 item, alternatifler]
  const BUILDS = {
    marksman: { boots: 3006, core: [3032, 3031, 6675, 3036], alt: [3072, 3094, 3085, 6676, 3046, 3033, 3026, 6673, 3095, 2512, 2523, 3139], keystone: 8008, secondary: 8400, summ: ['SummonerFlash', 'SummonerHeal'] },
    onhit: { boots: 3006, core: [3153, 3124, 3091, 3302], alt: [6672, 3085, 3046, 3072, 3026, 3115, 2510, 3139], keystone: 8008, secondary: 8400, summ: ['SummonerFlash', 'SummonerHeal'] },
    caster: { boots: 3158, core: [3004, 3078, 6694, 3508], alt: [3071, 6676, 3094, 3031, 3036, 6333, 3026, 2520, 6609], keystone: 8005, secondary: 8300, summ: ['SummonerFlash', 'SummonerHeal'] },
    assassin: { boots: 3158, core: [3142, 6698, 3814, 6694], alt: [6697, 6699, 6696, 6676, 6692, 3071, 6333, 3026, 2520, 3179, 6695], keystone: 8112, secondary: 8000, summ: ['SummonerFlash', 'SummonerDot'] },
    apAssassin: { boots: 3020, core: [4646, 4645, 3089, 3135], alt: [3157, 3100, 3152, 4629, 3102, 6655, 3137, 3146], keystone: 8112, secondary: 8200, summ: ['SummonerFlash', 'SummonerDot'] },
    mage: { boots: 3020, core: [6655, 4645, 3089, 3135], alt: [3157, 4628, 3165, 3102, 4646, 3003, 3118, 2503, 3137, 8010], keystone: 8229, secondary: 8300, summ: ['SummonerFlash', 'SummonerBarrier'] },
    battlemage: { boots: 3020, core: [6653, 3116, 4633, 3157], alt: [3089, 3135, 4629, 3165, 3003, 3118, 3102, 2503, 6657, 8010], keystone: 8010, secondary: 8400, summ: ['SummonerFlash', 'SummonerHaste'] },
    apBruiser: { boots: 3111, core: [4633, 6653, 3157, 6665], alt: [3116, 3115, 3089, 4629, 3065, 3068, 3146, 2510], keystone: 8010, secondary: 8400, summ: ['SummonerFlash', 'SummonerDot'] },
    fighter: { boots: 3047, core: [3071, 3053, 6333, 6610], alt: [3078, 6692, 3161, 3748, 3074, 3156, 3026, 3065, 6631, 2501, 3073, 6609, 2517, 3181], keystone: 8010, secondary: 8400, summ: ['SummonerFlash', 'SummonerDot'] },
    tank: { boots: 3047, core: [3068, 3075, 6665, 4401], alt: [3084, 3083, 3143, 3110, 2504, 2502, 6662, 3065, 3742, 6664, 8020, 3119, 2525], keystone: 8437, secondary: 8300, summ: ['SummonerFlash', 'SummonerHaste'] },
    engage: { boots: 3047, core: [3190, 3109, 6665, 3075], alt: [3143, 4401, 2504, 3084, 3050, 3110, 6664, 8020, 4005, 2525], keystone: 8439, secondary: 8300, summ: ['SummonerFlash', 'SummonerExhaust'] },
    enchanter: { boots: 3158, core: [6617, 3107, 3504, 3222], alt: [2065, 6620, 6616, 6621, 3190, 3157, 4005, 2524], keystone: 8214, secondary: 8400, summ: ['SummonerFlash', 'SummonerExhaust'] },
    mageSup: { boots: 3020, core: [6653, 3116, 3118, 3157], alt: [3089, 3135, 3165, 4645, 6655, 2503, 4005], keystone: 8229, secondary: 8300, summ: ['SummonerFlash', 'SummonerDot'] }
  };

  // Şampiyona özel build düzeltmeleri
  const BUILD_OVERRIDES = {
    Jhin: { boots: 3006, core: [6676, 3094, 3031, 3036] },
    Senna: { core: [3508, 6676, 3036, 3031] },
    MissFortune: { core: [6676, 3031, 3094, 3036] },
    Yasuo: { core: [3032, 6673, 3031, 6333] },
    Yone: { core: [3032, 6673, 3031, 6333] },
    Tryndamere: { core: [3032, 3031, 6675, 3072] },
    Kaisa: { core: [3124, 3115, 3089, 3157], boots: 3006 },
    Kayle: { boots: 3006, core: [3115, 3124, 3089, 4645] },
    Gwen: { core: [3115, 4633, 3089, 3157] },
    Jax: { core: [3078, 3153, 6333, 3053] },
    Irelia: { core: [3153, 3124, 3091, 3053] },
    Belveth: { core: [3153, 3124, 3053, 6333] },
    Fiora: { core: [6692, 3074, 6333, 3053] },
    Riven: { core: [6692, 3074, 6333, 3053] },
    Graves: { boots: 3047, core: [6676, 3031, 3036, 3072] },
    Kindred: { core: [3153, 6675, 3031, 3036] },
    Akshan: { core: [3032, 6676, 3031, 3036] },
    Gangplank: { boots: 3158, core: [3078, 3508, 6675, 3031] },
    MasterYi: { core: [3153, 3124, 3091, 3302] },
    Diana: { core: [4646, 3100, 3157, 3135] },
    Ekko: { core: [4646, 3100, 3157, 3135] },
    Ahri: { core: [6655, 4645, 3089, 3135] },
    Galio: { boots: 3111, core: [3152, 4401, 3157, 2504] },
    Rakan: { boots: 3158, core: [3190, 3109, 6617, 3107] },
    Taric: { core: [3190, 3109, 6665, 3110] },
    Shyvana: { boots: 3020, core: [3152, 3157, 4645, 3089] },
    Volibear: { core: [3124, 3153, 6665, 3075] },
    Udyr: { core: [3078, 6665, 3075, 3065] },
    Nocturne: { core: [6692, 3071, 6333, 3053] },
    Sett: { core: [3071, 3053, 6333, 3065] },
    Pyke: { boots: 3158, core: [3142, 3814, 6694, 6696] },
    Varus: { core: [3153, 3124, 3091, 3302] },
    Twitch: { core: [3153, 3124, 3031, 3036] },
    Mordekaiser: { core: [4633, 6653, 3116, 6665] },
    Kennen: { boots: 3020, core: [4646, 4629, 3157, 3135] },
    Swain: { core: [6653, 3116, 3065, 3157] },
    Teemo: { core: [3115, 6653, 4633, 3089] },
    Lillia: { core: [6653, 3116, 4633, 3089] },
    Malphite: { boots: 3047, core: [3068, 3075, 3110, 6665] },
    Amumu: { core: [6664, 6665, 3075, 4401] }
  };

  // Item efektleri (statlar Data Dragon'dan gelir)
  // ah: yetenek hızı, leth: ölümcüllük, arpen: zırh delme, mpen: büyü delme, mpenFlat: düz büyü delme
  const ITEM_FX = {
    // Ayakkabılar
    3006: { cat: 'boots', desc: '+%30 saldırı hızı.' },
    3020: { cat: 'boots', fx: { mpenFlat: 12 }, desc: '12 büyü nüfuzu.' },
    3047: { cat: 'boots', fx: { attackDr: 0.12 }, desc: 'Temel saldırılardan %12 az hasar.' },
    3111: { cat: 'boots', fx: { tenacity: 0.3 }, desc: 'Kitle kontrolü süreleri %30 kısalır.' },
    3158: { cat: 'boots', ah: 15, fx: { summCd: 0.1 }, desc: '15 yetenek hızı.' },
    3009: { cat: 'boots', fx: { slowResist: 0.25 }, desc: 'Yavaşlatmalara %25 direnç, çok hızlı.' },
    // Kritik
    3032: { cat: 'crit', fx: { critDmg: 0, yuntal: 1 }, desc: 'Savaş başında 4 sn %50 ek saldırı hızı. +%25 kritik kazanır.' },
    3031: { cat: 'crit', fx: { critDmg: 0.4 }, desc: 'Kritik hasarı %40 artar.' },
    6675: { cat: 'crit', fx: { navori: 1 }, desc: 'Kritikler yetenek bekleme sürelerini kısaltır.' },
    3036: { cat: 'crit', fx: { arpen: 0.35 }, desc: '%35 zırh delme. Tanklara karşı.' },
    3072: { cat: 'crit', fx: { bloodShield: 1 }, desc: '%15 can çalma, fazla can kalkana dönüşür.' },
    3094: { cat: 'crit', fx: { rangeBonus: 60 }, desc: 'Menzil ve hızlı ateş: daha uzaktan vurur.' },
    3085: { cat: 'crit', fx: { bolts: 2 }, desc: 'Saldırılar 2 yakın hedefe %55 hasarlı ok fırlatır.' },
    6676: { cat: 'crit', fx: { leth: 10, collector: 0.05 }, desc: '%5 canın altındaki hedefi infaz eder.' },
    3087: { cat: 'crit', fx: { statikk: 90 }, desc: 'Her 3 saldırıda zincir şimşek: 90 büyü hasarı.' },
    3033: { cat: 'crit', fx: { arpen: 0.3, grievous: 1 }, desc: '%30 zırh delme ve iyileşme azaltma.' },
    3046: { cat: 'crit', fx: {}, desc: 'Çok yüksek saldırı ve hareket hızı.' },
    3026: { cat: 'fighter', fx: { ga: 1 }, desc: 'Ölünce 4 sn sonra %50 canla dirilir. Bir kez.' },
    6673: { cat: 'crit', fx: { shieldbow: 1 }, desc: '%30 canın altında büyük kalkan + can çalma.' },
    // İsabet
    3153: { cat: 'onhit', fx: { botrk: 0.08 }, desc: 'Saldırılar mevcut canın %8\'i kadar ek hasar.' },
    3124: { cat: 'onhit', fx: { guinsoo: 1 }, desc: 'Her 3. saldırı isabet etkilerini iki kez uygular.' },
    3091: { cat: 'onhit', fx: { onhitMagic: 45 }, desc: 'Saldırılar 45 ek büyü hasarı verir.' },
    3302: { cat: 'onhit', fx: { terminus: 1 }, desc: 'Saldırdıkça zırh/direnç deler ve kazanır.' },
    6672: { cat: 'onhit', fx: { kraken: 140 }, desc: 'Her 3. saldırı 140 gerçek hasar.' },
    3115: { cat: 'onhit', ah: 15, fx: { nashor: 20 }, desc: 'Saldırılar ek 20 + %20 YG büyü hasarı.' },
    // Yetenekçi / savaşçı
    3004: { cat: 'caster', ah: 15, fx: { muramana: 1 }, desc: 'Manaya göre saldırı gücü; yetenekler ek hasar.' },
    3078: { cat: 'fighter', ah: 20, fx: { spellblade: 2 }, desc: 'Yetenek sonrası saldırı +%200 temel SG hasar.' },
    6694: { cat: 'caster', ah: 20, fx: { arpen: 0.3 }, desc: '%30 zırh delme, yetenekler yavaşlatır.' },
    3508: { cat: 'caster', ah: 20, fx: { navori: 1 }, desc: 'Kritikler yetenek bekleme sürelerini kısaltır.' },
    3071: { cat: 'fighter', ah: 20, fx: { shred: 0.3 }, desc: 'Fiziksel hasar hedefin zırhını %30\'a kadar eritir.' },
    3053: { cat: 'fighter', fx: { sterak: 0.6 }, desc: 'Canın %30\'un altında ek canın %60\'ı kalkan.' },
    6333: { cat: 'fighter', ah: 15, fx: { dd: 0.3 }, desc: 'Alınan hasarın %30\'u zamana yayılır, skorda silinir.' },
    6610: { cat: 'fighter', ah: 10, fx: { sundered: 1 }, desc: 'Her hedefe ilk saldırı kritik vurur ve iyileştirir.' },
    6692: { cat: 'fighter', ah: 15, fx: { eclipse: 0.06 }, desc: '2 vuruşta azami canın %6\'sı ek hasar + kalkan.' },
    3161: { cat: 'fighter', ah: 25, fx: { shojin: 0.12 }, desc: 'Yetenek hasarı %12\'ye kadar artar.' },
    3748: { cat: 'fighter', fx: { titanic: 0.015 }, desc: 'Saldırılar canının %1.5\'i kadar alan hasarı verir.' },
    3074: { cat: 'fighter', ah: 15, fx: { cleave: 0.4 }, desc: 'Saldırılar çevreye %40 hasar verir.' },
    3156: { cat: 'fighter', ah: 15, fx: { maw: 1 }, desc: 'Canın düşünce büyü hasarını emen kalkan.' },
    6631: { cat: 'fighter', ah: 15, fx: { stride: 1 }, desc: 'Etkinleştirince çevreyi yavaşlatır ve hasar verir.' },
    3065: { cat: 'tank', ah: 10, fx: { healAmp: 0.25 }, desc: 'İyileşme ve kalkanlar %25 güçlenir.' },
    // Suikast
    3142: { cat: 'assassin', fx: { leth: 18 }, desc: '18 ölümcüllük, savaş başında hız patlaması.' },
    6698: { cat: 'assassin', ah: 15, fx: { leth: 18, profane: 1 }, desc: '18 ölümcüllük, çevre hasarı; düşük canlılara ek hasar.' },
    3814: { cat: 'assassin', ah: 10, fx: { leth: 15, spellshield: 1 }, desc: 'Gelen ilk yeteneği engeller.' },
    6697: { cat: 'assassin', ah: 10, fx: { leth: 18, hubris: 1 }, desc: 'Skor aldıkça saldırı gücü kazanır.' },
    6699: { cat: 'assassin', ah: 15, fx: { leth: 18, voltaic: 1 }, desc: 'Hareket edince yüklenir, sonraki saldırı yavaşlatır.' },
    6696: { cat: 'assassin', ah: 20, fx: { leth: 18, axiom: 1 }, desc: 'Skorda ultinin bekleme süresi kısalır.' },
    // Büyü
    4646: { cat: 'mage', ah: 15, fx: { mpenFlat: 10, stormsurge: 1 }, desc: 'Hızlı hasar verince şimşek yağar.' },
    4645: { cat: 'mage', ah: 0, fx: { mpenFlat: 15, execute: 0.2 }, desc: '%40 canın altındaki hedeflere %20 ek hasar.' },
    3089: { cat: 'mage', fx: { rabadon: 0.35 }, desc: 'Toplam yetenek gücü %35 artar.' },
    3135: { cat: 'mage', fx: { mpen: 0.4 }, desc: '%40 büyü delme.' },
    3157: { cat: 'mage', ah: 15, fx: { zhonya: 2.5 }, desc: 'Canın %30\'un altında 2.5 sn dokunulmazlık.' },
    3100: { cat: 'mage', ah: 10, fx: { lichbane: 1 }, desc: 'Yetenek sonrası saldırı ek büyü hasarı verir.' },
    3152: { cat: 'mage', ah: 15, fx: { rocketbelt: 1 }, desc: 'Savaş başında hedefe atılır ve hasar verir.' },
    4629: { cat: 'mage', ah: 25, fx: {}, desc: 'Çok yüksek yetenek hızı ve hareket hızı.' },
    3102: { cat: 'mage', ah: 10, fx: { spellshield: 1 }, desc: 'Gelen ilk yeteneği engeller.' },
    6655: { cat: 'mage', ah: 20, fx: { luden: 100 }, desc: 'Yetenekler ek 100 + %10 YG büyü hasarı.' },
    4628: { cat: 'mage', ah: 25, fx: { horizon: 0.1 }, desc: 'Uzaktan veya hareketsiz hedeflere %10 ek hasar.' },
    3165: { cat: 'mage', ah: 15, fx: { grievous: 1 }, desc: 'Büyüler iyileşmeyi %40 azaltır.' },
    3003: { cat: 'mage', ah: 25, fx: { seraph: 1 }, desc: 'Canın düşünce büyük kalkan.' },
    3118: { cat: 'mage', ah: 20, fx: { malignance: 1 }, desc: 'Ulti yakan bölge bırakır, ulti daha sık dolar.' },
    6653: { cat: 'mage', fx: { burn: 0.02 }, desc: 'Yetenekler 3 sn yakar: saniyede azami canın %2\'si.' },
    3116: { cat: 'mage', fx: { slow: 0.3 }, desc: 'Yetenekler %30 yavaşlatır.' },
    4633: { cat: 'mage', ah: 15, fx: { riftmaker: 0.1 }, desc: 'Savaşta kaldıkça %10\'a kadar ek hasar + can emme.' },
    // Tank
    6665: { cat: 'tank', fx: { jaksho: 0.3 }, desc: 'Savaşın 5. saniyesinden sonra direnç %30 artar.' },
    3068: { cat: 'tank', ah: 10, fx: { sunfire: 30 }, desc: 'Yakındakileri saniyede 30 + ek canın %1.5\'i yakar.' },
    3075: { cat: 'tank', fx: { thorns: 0.3, grievous: 1 }, desc: 'Gelen saldırı hasarının %30\'unu yansıtır.' },
    4401: { cat: 'tank', fx: { forceOfNature: 1 }, desc: 'Büyü hasarı aldıkça büyü direnci %35\'e kadar artar.' },
    3084: { cat: 'tank', fx: { heartsteel: 1 }, desc: 'Her 4 sn bir saldırı can bazlı vurur, kalıcı can kazanır.' },
    3083: { cat: 'tank', fx: { warmog: 0.04 }, desc: '3 sn hasar almazsan saniyede %4 can yenilenir.' },
    3143: { cat: 'tank', fx: { randuin: 0.3 }, desc: 'Kritiklerden %30 az hasar.' },
    3110: { cat: 'tank', ah: 20, fx: { frozenHeart: 0.2 }, desc: 'Yakındaki rakiplerin saldırı hızı %20 düşer.' },
    2504: { cat: 'tank', fx: { kaenic: 1 }, desc: 'Büyü hasarını emen kalkan.' },
    2502: { cat: 'tank', ah: 10, fx: { despair: 1 }, desc: 'Savaşta yakındakilerden can çeker.' },
    6662: { cat: 'tank', ah: 15, fx: { iceborn: 1 }, desc: 'Yetenek sonrası saldırı buz alanı yaratır.' },
    3742: { cat: 'tank', fx: { deadman: 1 }, desc: 'İlk saldırısı ivmeyle ek hasar ve yavaşlatma.' },
    6664: { cat: 'tank', ah: 10, fx: { sunfire: 25 }, desc: 'Çevreyi yakar, büyü direnci verir.' },
    // Destek
    3190: { cat: 'support', ah: 10, fx: { solari: 1 }, desc: 'Takım arkadaşı düşünce tüm takıma kalkan.' },
    3109: { cat: 'support', ah: 10, fx: { vow: 1 }, desc: 'En güçlü dostun aldığı hasarın %10\'unu üstlenir.' },
    3050: { cat: 'support', ah: 10, fx: { zeke: 1 }, desc: 'Ulti sonrası dostun saldırıları ek hasar verir.' },
    6617: { cat: 'support', ah: 15, fx: { moonstone: 0.3 }, desc: 'İyileştirmeler %30 güçlenir.' },
    3107: { cat: 'support', ah: 15, fx: { redemption: 1 }, desc: 'Dost düşünce bölgede tüm takımı iyileştirir.' },
    3504: { cat: 'support', fx: { ardent: 0.3 }, desc: 'İyileştirdiğin dostlar %30 saldırı hızı kazanır.' },
    3222: { cat: 'support', ah: 15, fx: { mikael: 1 }, desc: 'Sersemletilen dostu arındırır ve iyileştirir.' },
    2065: { cat: 'support', ah: 15, fx: { shurelya: 1 }, desc: 'Savaş başında takıma hız verir.' },
    6620: { cat: 'support', ah: 15, fx: { helia: 1 }, desc: 'İyileştirince yakındaki rakibe hasar verir.' },
    6616: { cat: 'support', ah: 15, fx: { flowing: 1 }, desc: 'İyileştirdiklerine yetenek gücü verir.' },
    6621: { cat: 'support', fx: { moonstone: 0.2 }, desc: 'İyileştirme ve kalkanlar %20 güçlenir.' },
    // Güncel yama itemleri
    3008: { cat: 'boots', fx: { omnivamp: 0.04 }, desc: '%4 mutlak sömürü, çok hızlı.' },
    3095: { cat: 'crit', fx: { voltaic: 1 }, desc: 'Yüklü saldırı ek hasar verir ve yavaşlatır.' },
    2512: { cat: 'crit', fx: { critDmg: 0.1, ultHaste: 30 }, desc: 'Ulti daha sık dolar, kritik hasarı artar.' },
    2523: { cat: 'crit', fx: { horizon: 0.1 }, desc: 'Uzaktaki hedeflere %10 ek hasar.' },
    2510: { cat: 'onhit', ah: 20, fx: { lichbane: 1 }, desc: 'Yetenek sonrası saldırı ek büyü hasarı verir.' },
    3073: { cat: 'fighter', fx: { ultHaste: 30, hexplate: 1 }, desc: 'Ulti daha sık dolar; ulti sonrası hız patlaması.' },
    2501: { cat: 'fighter', fx: { bloodmail: 0.025 }, desc: 'Ek canının %2.5\'i kadar saldırı gücü.' },
    2517: { cat: 'fighter', fx: { omnivamp: 0.07 }, desc: 'Verdiğin tüm hasardan %7 can emersin.' },
    6609: { cat: 'fighter', ah: 15, fx: { grievous: 1 }, desc: 'Fiziksel hasar iyileşmeyi %40 azaltır.' },
    3181: { cat: 'fighter', fx: { kraken: 110 }, desc: 'Her 3. saldırı ek fiziksel hasar verir.' },
    3139: { cat: 'fighter', fx: { qss: 1 }, desc: 'Sersemletilince kendini arındırır (90 sn).' },
    2520: { cat: 'assassin', ah: 15, fx: { leth: 18, siege: 1 }, desc: '18 ölümcüllük; yetenekler ek gerçek hasar.' },
    3179: { cat: 'assassin', ah: 15, fx: { leth: 18 }, desc: '18 ölümcüllük, görünmezlikten sonra ek hasar.' },
    6695: { cat: 'assassin', fx: { leth: 15, reave: 0.5 }, desc: 'Hedefin kalkanlarını yarı yarıya azaltır.' },
    2503: { cat: 'mage', ah: 20, fx: { burn: 0.012 }, desc: 'Yetenekler 3 sn yakar.' },
    2522: { cat: 'mage', ah: 10, fx: { shojin: 0.1 }, desc: 'Yetenek hasarı %10 artar.' },
    3137: { cat: 'mage', ah: 20, fx: { mpen: 0.3 }, desc: '%30 büyü delme, skorda dostları iyileştirir.' },
    3146: { cat: 'mage', fx: { omnivamp: 0.1 }, desc: 'Verdiğin tüm hasardan %10 can emersin.' },
    6657: { cat: 'mage', fx: {}, desc: 'Can, mana ve yetenek gücü.' },
    8010: { cat: 'mage', ah: 15, fx: { mpen: 0.2 }, desc: 'Büyü hasarı hedefin direncini eritir.' },
    4005: { cat: 'support', ah: 15, fx: { mandate: 1 }, desc: 'Hareketsiz bıraktığın rakip 4 sn %8 fazla hasar alır.' },
    2524: { cat: 'support', ah: 15, fx: { ardent: 0.2 }, desc: 'Kitle kontrolünden sonra takımla saldırı hızı.' },
    2525: { cat: 'tank', ah: 20, fx: { sterak: 0.5 }, desc: 'Canın %30\'un altında büyük kalkan.' },
    3119: { cat: 'tank', ah: 15, fx: { seraph: 1 }, desc: 'Can düşünce büyük kalkan.' },
    8020: { cat: 'tank', ah: 15, fx: { abyssal: 0.12 }, desc: 'Yakındaki rakipler %12 fazla büyü hasarı alır.' }
  };
  const ITEM_CATS = {
    boots: 'Ayakkabı', crit: 'Kritik', onhit: 'İsabet', caster: 'Yetenekçi', fighter: 'Savaşçı',
    assassin: 'Suikast', mage: 'Büyü', tank: 'Tank', support: 'Destek'
  };

  // Ana rünler ve simülasyondaki etkileri
  const KEYSTONES = {
    8005: 'Aynı hedefe 3 saldırı patlama hasarı verir, hedef 6 sn %8 fazla hasar alır.',
    8008: 'Saldırdıkça saldırı hızı %36\'ya kadar artar.',
    8021: 'Her 5. saldırı seni iyileştirir ve hızlandırır.',
    8010: 'Vurdukça güç toplar: tam yükte %12 hasar ve verdiğin hasarın %8\'i kadar iyileşme.',
    8112: '3 sn içinde 3 vuruş: ek patlama hasarı.',
    8128: '%50 canın altındaki hedeflere ek hasar, her skorda büyür.',
    9923: 'Savaş başında ilk 3 saldırı %110 daha hızlı.',
    8214: 'Yeteneklerle rakibe hasar ya da dosta kalkan.',
    8229: 'Yetenek isabetinde hedefe yıldız düşer.',
    8230: '3 vuruşta hız patlaması, kaçma ve kovalama.',
    8992: 'Yetenekler hedefi 3 sn yakar.',
    8437: 'Her 4 sn bir saldırı azami canın %4\'ü kadar vurur ve iyileştirir.',
    8439: 'Kitle kontrolünden sonra 2.5 sn direnç kazanır ve patlar.',
    8465: 'Yakındaki dost hasar alınca ikinize kalkan.',
    8351: 'Kitle kontrolü yavaşlatan bir buz alanı bırakır.',
    8360: 'Sihirdar büyüleri daha sık yenilenir.',
    8369: 'Savaşta ilk vuruş 3 sn %12 fazla hasar sağlar.'
  };
  const SECONDARY = {
    8000: { desc: '+%12 saldırı hızı, skorda %10 iyileşme', bonus: { as: 0.12, triumph: 0.1 } },
    8100: { desc: '+10 ölümcüllük / +12 büyü nüfuzu, vuruşta can emme', bonus: { leth: 10, mpenFlat: 12, taste: 1 } },
    8200: { desc: '+18 SG veya +30 YG, +10 yetenek hızı', bonus: { adaptive: 1, ah: 10 } },
    8400: { desc: '+250 can, +10 zırh ve direnç', bonus: { hp: 250, armor: 10, mr: 10 } },
    8300: { desc: '+15 yetenek hızı, sihirdar büyüleri %20 daha hızlı', bonus: { ah: 15, summCd: 0.2 } }
  };

  const SUMMONERS = {
    SummonerFlash: 'Tehlikede kaçar ya da hedefine anında ulaşır.',
    SummonerDot: 'Düşük canlı rakibi yakar ve iyileşmesini azaltır.',
    SummonerHeal: 'Can düşünce seni ve en zor durumdaki dostu iyileştirir.',
    SummonerBarrier: 'Can düşünce büyük bir kalkan.',
    SummonerExhaust: 'Dalan rakibin hasarını %35 azaltır.',
    SummonerBoost: 'Kitle kontrolünden kurtarır.',
    SummonerSmite: 'Ormancı büyüsü: canavarlara 900 gerçek hasar, kampları hızlı temizler, ejder ve baronu çalar.',
    SummonerHaste: 'Savaşta büyük hareket hızı.'
  };

  // Şampiyona özel ultiler: [tür, ayarlar]
  const ULTS = {
    Aatrox: ['transform', { dur: 9, ad: 0.3, heal: 0.15, healAmp: 0.4, scale: 1.3, fear: 1, color: '#dc2626' }],
    Ahri: ['multiDash', { dashes: 3, bolts: 3, color: '#f472b6' }],
    Akali: ['multiDash', { dashes: 2, execute: 1, color: '#22d3ee' }],
    Akshan: ['missile', { shots: 5, interval: 0.25, missing: 1, dmg: 0.45, color: '#facc15', speed: 1500 }],
    Alistar: ['transform', { dur: 7, dr: 0.6, scale: 1.15, color: '#fde68a' }],
    Ambessa: ['suppress', { dur: 1.3, dash: 'far', dmg: 1.5, color: '#e5e5e5' }],
    Amumu: ['zone', { center: 'self', radius: 190, stun: 1.5, dmg: 1.2, color: '#4ade80' }],
    Anivia: ['zone', { center: 'densest', radius: 160, dur: 5, ticks: 10, slow: 0.4, dmg: 1.8, color: '#7dd3fc' }],
    Annie: ['summon', { pet: 'Tibbers', hp: 2400, ad: 110, as: 0.8, dur: 14, aura: 45, landStun: 1.25, radius: 150, color: '#f97316' }],
    Aphelios: ['missile', { aoe: 170, dmg: 1.5, speed: 1200, color: '#c084fc' }],
    Ashe: ['missile', { global: true, aoe: 140, stun: 2.5, dmg: 1.3, speed: 1000, width: 18, color: '#7dd3fc' }],
    AurelionSol: ['engage', { style: 'sky', radius: 180, knockup: 1, dmg: 1.8, cast: true, color: '#fbbf24' }],
    Aurora: ['arena', { radius: 190, dur: 4, dmg: 1.2, slow: 0.4, color: '#c084fc' }],
    Azir: ['kick', { area: true, radius: 190, push: 260, dmg: 1, color: '#fcd34d' }],
    Bard: ['zone', { center: 'densest', radius: 170, stasis: 2.5, color: '#fde68a' }],
    Belveth: ['transform', { dur: 10, as: 0.45, ad: 0.15, trueHit: 0.15, scale: 1.35, color: '#a855f7' }],
    Blitzcrank: ['zone', { center: 'self', radius: 190, stun: 0.75, dmg: 1.5, shieldBreak: true, color: '#facc15' }],
    Brand: ['missile', { bounce: 5, dmg: 0.9, burn: true, speed: 800, color: '#f97316' }],
    Braum: ['beam', { width: 90, knockup: 1.25, dmg: 1.1, delay: 0.5, color: '#7dd3fc' }],
    Briar: ['engage', { style: 'charge', radius: 160, fear: 1.5, dmg: 1.4, selfBuff: 0.3, color: '#ef4444' }],
    Caitlyn: ['execute', { style: 'shot', delay: 1, dmg: 3.2, color: '#facc15' }],
    Camille: ['arena', { radius: 130, dur: 3.5, leap: true, dmg: 1.2, trueHit: 0.05, color: '#93c5fd' }],
    Cassiopeia: ['beam', { width: 220, length: 380, stun: 1.6, dmg: 1.2, delay: 0.4, color: '#86efac' }],
    Chogath: ['execute', { style: 'bite', trueDmg: true, dmg: 2.4, grow: 0.12, color: '#a855f7' }],
    Corki: ['missile', { shots: 5, interval: 0.3, aoe: 70, dmg: 0.5, speed: 1100, color: '#fb923c' }],
    Darius: ['execute', { style: 'dunk', trueDmg: true, missing: 1, dmg: 2, reset: true, color: '#ef4444' }],
    Diana: ['zone', { center: 'self', radius: 180, pull: true, delay: 0.6, dmg: 1.8, color: '#c4b5fd' }],
    DrMundo: ['transform', { dur: 10, hp: 0.25, regen: 0.04, ms: 0.3, scale: 1.25, color: '#a3e635' }],
    Draven: ['missile', { line: true, global: true, width: 70, dmg: 1.6, returns: true, speed: 1200, color: '#ef4444' }],
    Ekko: ['rewind', { heal: 0.3, radius: 170, dmg: 2, color: '#22d3ee' }],
    Elise: ['transform', { dur: 8, ad: 0.3, as: 0.35, heal: 0.1, color: '#dc2626' }],
    Evelynn: ['execute', { style: 'blink', missing: 1.4, dmg: 1.6, cone: 170, color: '#ec4899' }],
    Ezreal: ['missile', { line: true, global: true, width: 90, dmg: 1.5, speed: 1400, color: '#fde047' }],
    Fiddlesticks: ['zone', { center: 'densest', blink: true, radius: 190, dur: 3, ticks: 6, fear: 1.2, dmg: 2.2, color: '#a3e635' }],
    Fiora: ['transform', { dur: 7, ad: 0.25, trueHit: 0.03, healAura: 0.04, color: '#f472b6' }],
    Fizz: ['missile', { aoe: 170, knockup: 1.25, delay: 1, dmg: 1.8, shark: true, speed: 900, color: '#38bdf8' }],
    Galio: ['engage', { style: 'sky', toAlly: true, radius: 190, knockup: 1, dmg: 1.2, shieldAllies: 0.15, color: '#93c5fd' }],
    Gangplank: ['zone', { center: 'densest', radius: 210, dur: 5, ticks: 12, slow: 0.3, dmg: 2.2, barrage: true, color: '#fb923c' }],
    Garen: ['execute', { style: 'sky', trueDmg: true, missing: 1.1, dmg: 1.6, color: '#facc15' }],
    Gnar: ['kick', { area: true, radius: 170, push: 160, stun: 1.25, dmg: 1.2, scale: 1.4, color: '#f59e0b' }],
    Gragas: ['kick', { area: true, thrown: true, radius: 170, push: 200, dmg: 1.4, color: '#fb923c' }],
    Graves: ['missile', { line: true, width: 70, dmg: 1.8, recoil: 120, speed: 1300, color: '#fbbf24' }],
    Gwen: ['missile', { shots: 3, interval: 0.6, aoe: 90, slow: 0.4, dmg: 0.7, speed: 900, color: '#93c5fd' }],
    Hecarim: ['engage', { style: 'charge', radius: 170, fear: 1.4, dmg: 1.4, color: '#60a5fa' }],
    Heimerdinger: ['summon', { pet: 'H-28Q', hp: 1400, ad: 95, as: 1, range: 220, dur: 12, color: '#fbbf24' }],
    Hwei: ['missile', { aoe: 170, slow: 0.5, delay: 0.3, burstAfter: 2, dmg: 1.8, speed: 900, color: '#a78bfa' }],
    Illaoi: ['zone', { center: 'self', radius: 190, knockup: 0.4, dmg: 1.4, after: { ad: 0.3, dur: 7 }, tentacles: true, color: '#a3e635' }],
    Irelia: ['missile', { line: true, width: 110, root: 1.2, dmg: 1.3, speed: 1100, color: '#e879f9' }],
    Ivern: ['summon', { pet: 'Daisy', hp: 2600, ad: 90, as: 0.8, dur: 14, knockup: 1, color: '#86efac' }],
    Janna: ['zone', { center: 'self', radius: 180, knockback: 200, healAllies: 0.25, dur: 3, ticks: 6, color: '#bae6fd' }],
    JarvanIV: ['arena', { radius: 170, dur: 3.5, leap: true, dmg: 1.4, color: '#fde68a' }],
    Jax: ['transform', { dur: 8, armor: 0.5, mr: 0.5, ad: 0.2, every3: 0.6, color: '#fbbf24' }],
    Jayce: ['transform', { dur: 8, ad: 0.35, as: 0.3, color: '#38bdf8' }],
    Jhin: ['missile', { shots: 4, interval: 0.7, aoe: 50, dmg: 0.8, lastMult: 2, missing: 0.6, speed: 1700, color: '#f43f5e' }],
    Jinx: ['missile', { global: true, aoe: 150, missing: 1.2, dmg: 1.6, speed: 1100, width: 24, color: '#f472b6' }],
    KSante: ['kick', { single: true, push: 320, dmg: 1.4, follow: true, transform: { ad: 0.4, as: 0.3, dur: 8 }, color: '#facc15' }],
    Kaisa: ['multiDash', { dashes: 1, far: true, shield: 0.4, color: '#c026d3' }],
    Kalista: ['engage', { style: 'sky', radius: 170, knockup: 1.25, dmg: 0.8, color: '#5eead4' }],
    Karma: ['team', { mode: 'shield', amount: 0.25, ms: 0.3, color: '#fb7185' }],
    Karthus: ['zone', { global: true, channel: 3, dmg: 2.2, color: '#a3e635' }],
    Kassadin: ['multiDash', { dashes: 3, aoe: 120, dmg: 0.7, color: '#a855f7' }],
    Katarina: ['zone', { center: 'self', channel: 2.5, radius: 190, ticks: 10, dmg: 3, grievous: true, color: '#ef4444' }],
    Kayle: ['team', { mode: 'invuln', single: true, dur: 2.5, aoeAfter: 220, dmg: 1.6, color: '#fde047' }],
    Kayn: ['possess', { dur: 1.8, dmg: 2.4, heal: 0.25, color: '#ef4444' }],
    Kennen: ['zone', { center: 'self', radius: 200, dur: 3, ticks: 6, stunAt: 3, stun: 1.25, dmg: 2.4, color: '#c084fc' }],
    Khazix: ['transform', { dur: 6, invis: 1.5, ad: 0.25, color: '#a78bfa' }],
    Kindred: ['team', { mode: 'noDeath', radius: 200, dur: 4, color: '#a5b4fc' }],
    Kled: ['engage', { style: 'charge', radius: 160, knockup: 0.6, dmg: 1.4, long: true, color: '#f59e0b' }],
    KogMaw: ['missile', { shots: 4, interval: 0.5, aoe: 90, missing: 0.6, dmg: 0.7, delay: 0.4, speed: 900, color: '#a3e635' }],
    Leblanc: ['multiDash', { dashes: 2, root: 1.4, dmg: 0.9, color: '#c084fc' }],
    LeeSin: ['kick', { single: true, push: 330, knockupOthers: 1, dmg: 1.6, color: '#f59e0b' }],
    Leona: ['missile', { aoe: 170, stun: 1.75, delay: 0.6, sky: true, dmg: 1.2, speed: 2000, color: '#fde047' }],
    Lillia: ['zone', { global: true, sleep: 2.5, dmg: 1.3, color: '#f9a8d4' }],
    Lissandra: ['zone', { center: 'target', radius: 170, stun: 1.5, dur: 3, ticks: 3, slow: 0.6, dmg: 1.6, color: '#bae6fd' }],
    Locke: ['execute', { style: 'blink', missing: 1.2, dmg: 1.6, color: '#94a3b8' }],
    Lucian: ['zone', { center: 'self', channel: 3, barrage: 'line', shots: 18, dmg: 2.4, color: '#fde68a' }],
    Lulu: ['team', { mode: 'enlarge', hp: 0.3, radius: 160, knockup: 1, color: '#c4b5fd' }],
    Lux: ['beam', { width: 100, global: true, delay: 0.9, dmg: 1.8, color: '#fde047' }],
    Malphite: ['engage', { style: 'charge', radius: 190, knockup: 1.5, dmg: 1.6, fast: true, color: '#a8a29e' }],
    Malzahar: ['suppress', { dur: 2.5, dmg: 1.8, color: '#a855f7' }],
    Maokai: ['beam', { width: 200, root: 1.8, dmg: 1.1, delay: 0.8, wave: true, color: '#86efac' }],
    MasterYi: ['transform', { dur: 8, as: 0.7, ms: 0.45, unstoppable: true, color: '#facc15' }],
    Mel: ['zone', { global: true, channel: 0.6, dmg: 1.4, color: '#fde68a' }],
    Milio: ['team', { mode: 'heal', radius: 320, amount: 1.6, cleanse: true, color: '#fdba74' }],
    MissFortune: ['zone', { center: 'self', channel: 3, barrage: 'cone', shots: 16, dmg: 2.6, color: '#fda4af' }],
    MonkeyKing: ['zone', { center: 'self', radius: 170, dur: 2, ticks: 2, knockup: 0.75, dmg: 1.6, spin: true, color: '#fbbf24' }],
    Mordekaiser: ['realm', { dur: 7, steal: 0.12, color: '#4ade80' }],
    Morgana: ['zone', { center: 'self', radius: 200, dur: 3, ticks: 3, slow: 0.3, stunAt: 3, stun: 1.5, dmg: 1.6, tether: true, color: '#a855f7' }],
    Naafiri: ['transform', { dur: 6, ad: 0.3, ms: 0.4, shield: 0.2, color: '#94a3b8' }],
    Nami: ['beam', { width: 140, knockup: 1, dmg: 1.2, delay: 0.7, wave: true, color: '#38bdf8' }],
    Nasus: ['transform', { dur: 12, hp: 0.3, armor: 0.4, mr: 0.4, scale: 1.45, aura: 40, color: '#facc15' }],
    Nautilus: ['missile', { knockup: 1.3, single: true, dmg: 1.5, speed: 600, trail: true, color: '#5eead4' }],
    Neeko: ['engage', { style: 'leap', radius: 190, stun: 1.25, dmg: 1.6, delay: 1, shield: 0.15, color: '#f472b6' }],
    Nidalee: ['transform', { dur: 8, ad: 0.4, as: 0.2, melee: true, color: '#a3e635' }],
    Nilah: ['zone', { center: 'self', radius: 190, pull: true, dur: 1.5, ticks: 4, dmg: 1.6, heal: 0.4, color: '#38bdf8' }],
    Nocturne: ['engage', { style: 'charge', radius: 60, dmg: 1.6, blackout: 3, far: true, color: '#6366f1' }],
    Nunu: ['zone', { center: 'self', channel: 2.5, radius: 220, slow: 0.6, burst: 3, color: '#bae6fd' }],
    Olaf: ['transform', { dur: 6, ad: 0.3, ms: 0.25, unstoppable: true, color: '#ef4444' }],
    Orianna: ['zone', { center: 'densest', radius: 180, pull: true, dmg: 1.8, color: '#93c5fd' }],
    Ornn: ['engage', { style: 'charge', radius: 170, knockup: 1, dmg: 1.3, fromFar: true, color: '#fb923c' }],
    Pantheon: ['engage', { style: 'sky', radius: 190, dmg: 1.8, slow: 0.5, color: '#fbbf24' }],
    Poppy: ['kick', { area: true, radius: 140, banish: 3, dmg: 1, color: '#fde68a' }],
    Pyke: ['execute', { style: 'x', radius: 170, threshold: 0.3, trueDmg: true, dmg: 1.2, color: '#2dd4bf' }],
    Qiyana: ['beam', { width: 140, stun: 1, dmg: 1.6, delay: 0.3, color: '#86efac' }],
    Quinn: ['transform', { dur: 5, ms: 0.8, ad: 0.25, color: '#a5b4fc' }],
    Rakan: ['engage', { style: 'charge', radius: 160, charm: 1.3, dmg: 1, color: '#fbbf24' }],
    Rammus: ['engage', { style: 'sky', radius: 200, knockup: 0.75, dmg: 1.4, color: '#a8a29e' }],
    RekSai: ['execute', { style: 'leap', missing: 1, dmg: 1.6, color: '#a855f7' }],
    Rell: ['zone', { center: 'self', radius: 200, pull: true, dur: 2, ticks: 4, stun: 0.75, dmg: 1.4, color: '#fde68a' }],
    Renata: ['beam', { width: 260, length: 360, berserk: 2.5, delay: 0.5, color: '#4ade80' }],
    Renekton: ['transform', { dur: 12, hp: 0.3, scale: 1.4, aura: 50, color: '#16a34a' }],
    Rengar: ['execute', { style: 'leap', invis: 1.5, dmg: 2, color: '#ef4444' }],
    Riven: ['transform', { dur: 9, ad: 0.25, windslash: 1.8, color: '#4ade80' }],
    Rumble: ['zone', { center: 'densest', radius: 150, dur: 4, ticks: 8, slow: 0.35, dmg: 2, line: true, color: '#fb923c' }],
    Ryze: ['missile', { aoe: 150, root: 1.2, dmg: 1.4, speed: 900, color: '#38bdf8' }],
    Samira: ['zone', { center: 'self', channel: 2, radius: 200, ticks: 10, dmg: 2.6, lifesteal: 0.4, color: '#ef4444' }],
    Sejuani: ['missile', { aoe: 170, stun: 1.6, dmg: 1.3, speed: 900, width: 30, color: '#7dd3fc' }],
    Senna: ['beam', { width: 120, global: true, delay: 0.9, dmg: 1.4, shieldAllies: 0.2, color: '#6ee7b7' }],
    Seraphine: ['beam', { width: 130, charm: 1.75, dmg: 1.4, delay: 0.5, color: '#f9a8d4' }],
    Sett: ['kick', { grab: true, radius: 180, dmg: 1.4, carry: true, color: '#f87171' }],
    Shaco: ['summon', { pet: 'Klon', clone: true, dur: 9, explode: 1.4, color: '#ef4444' }],
    Shen: ['team', { mode: 'shen', amount: 0.35, color: '#60a5fa' }],
    Shyvana: ['transform', { dur: 10, scale: 1.5, armor: 0.3, mr: 0.3, range: 160, aura: 35, color: '#f97316' }],
    Singed: ['transform', { dur: 10, armor: 0.4, mr: 0.4, ms: 0.4, hp: 0.15, aura: 35, color: '#a3e635' }],
    Sion: ['engage', { style: 'charge', radius: 180, knockup: 1.5, dmg: 1.6, fromFar: true, color: '#ef4444' }],
    Sivir: ['team', { mode: 'buff', ms: 0.5, as: 0.4, dur: 6, color: '#fde68a' }],
    Skarner: ['suppress', { dur: 2, drag: true, dmg: 1.2, color: '#c084fc' }],
    Smolder: ['beam', { width: 140, global: true, delay: 0.7, dmg: 1.6, healSelf: 0.2, color: '#fb923c' }],
    Sona: ['beam', { width: 140, stun: 1.5, dmg: 1.2, delay: 0.3, color: '#93c5fd' }],
    Soraka: ['team', { mode: 'heal', global: true, amount: 1.4, color: '#fde68a' }],
    Swain: ['transform', { dur: 8, drain: 180, scale: 1.25, color: '#b91c1c' }],
    Sylas: ['steal', { color: '#a5b4fc' }],
    Syndra: ['execute', { style: 'orbs', missing: 0.8, dmg: 2, color: '#a855f7' }],
    TahmKench: ['team', { mode: 'devour', dur: 2, shield: 0.3, color: '#86efac' }],
    Taliyah: ['engage', { style: 'charge', radius: 150, knockup: 0.5, dmg: 1.2, color: '#d6b37a' }],
    Talon: ['zone', { center: 'self', radius: 200, invis: 1.5, ticks: 2, dur: 1.5, dmg: 2.2, blades: true, color: '#94a3b8' }],
    Taric: ['team', { mode: 'invuln', radius: 360, delay: 2.5, dur: 2.5, color: '#93c5fd' }],
    Teemo: ['zone', { center: 'densest', radius: 120, dur: 6, ticks: 6, slow: 0.4, dmg: 1.8, mushrooms: true, color: '#a3e635' }],
    Thresh: ['zone', { center: 'self', radius: 170, dur: 4, ticks: 2, slow: 0.8, dmg: 1.4, box: true, color: '#5eead4' }],
    Tristana: ['kick', { single: true, push: 260, knockupOthers: 0.75, dmg: 1.5, ranged: true, color: '#60a5fa' }],
    Trundle: ['transform', { dur: 7, steal: 0.4, color: '#7dd3fc' }],
    Tryndamere: ['transform', { dur: 5, undying: true, as: 0.3, color: '#ef4444' }],
    TwistedFate: ['engage', { style: 'blink', backline: true, radius: 60, stun: 1.5, dmg: 1.4, color: '#fcd34d' }],
    Twitch: ['transform', { dur: 7, ad: 0.25, range: 300, pierce: true, color: '#a3e635' }],
    Udyr: ['zone', { center: 'self', radius: 160, dur: 4, ticks: 8, slow: 0.3, dmg: 1.8, follow: true, color: '#7dd3fc' }],
    Urgot: ['suppress', { dur: 1.5, drag: true, execute: 0.25, fear: 1.5, dmg: 1, color: '#a3e635' }],
    Varus: ['missile', { root: 2, spread: 220, dmg: 1.2, speed: 1000, color: '#c084fc' }],
    Vayne: ['transform', { dur: 8, ad: 0.35, invisPulse: 1, color: '#94a3b8' }],
    Veigar: ['execute', { style: 'shot', missing: 1.5, dmg: 2.2, color: '#a855f7' }],
    Velkoz: ['beam', { width: 80, channel: 2.5, dmg: 2.4, trueDmg: true, delay: 0.3, color: '#c084fc' }],
    Vex: ['multiDash', { dashes: 2, fear: 1, dmg: 1, color: '#a78bfa' }],
    Vi: ['engage', { style: 'charge', lock: true, knockup: 1.3, dmg: 1.6, knockOthers: true, color: '#f472b6' }],
    Viego: ['execute', { style: 'leap', missing: 1.2, dmg: 1.5, radius: 130, color: '#5eead4' }],
    Viktor: ['zone', { center: 'densest', radius: 150, dur: 6, ticks: 12, dmg: 2.4, follow: true, color: '#facc15' }],
    Vladimir: ['zone', { center: 'densest', radius: 180, delay: 3, dmg: 2, heal: 0.5, amp: 0.1, color: '#ef4444' }],
    Volibear: ['engage', { style: 'leap', radius: 170, slow: 0.5, dmg: 1.4, after: { hp: 0.25, scale: 1.35, dur: 8 }, color: '#7dd3fc' }],
    Warwick: ['suppress', { dur: 1.5, dash: 'target', dmg: 1.6, heal: 0.6, color: '#ef4444' }],
    Xayah: ['multiDash', { dashes: 0, untargetable: 1.5, root: 1.25, dmg: 1.6, feathers: true, color: '#e879f9' }],
    Xerath: ['missile', { shots: 5, interval: 0.55, aoe: 100, dmg: 0.6, delay: 0.5, sky: true, speed: 3000, color: '#60a5fa' }],
    XinZhao: ['zone', { center: 'self', radius: 180, knockback: 180, dmg: 1.4, after: { dr: 0.4, dur: 4 }, color: '#fbbf24' }],
    Yasuo: ['execute', { style: 'airborne', dmg: 1.8, color: '#bae6fd' }],
    Yone: ['beam', { width: 120, knockup: 0.9, dmg: 1.5, delay: 0.5, dashThrough: true, color: '#93c5fd' }],
    Yorick: ['summon', { pet: 'Kızlık', hp: 1800, ad: 110, as: 0.9, dur: 15, color: '#5eead4' }],
    Yunara: ['transform', { dur: 8, as: 0.4, ad: 0.15, pierce: true, color: '#fb7185' }],
    Yuumi: ['missile', { shots: 5, interval: 0.4, line: true, width: 110, root: 1.2, dmg: 0.4, speed: 900, color: '#c4b5fd' }],
    Zaahen: ['engage', { style: 'sky', radius: 170, knockup: 1, dmg: 1.6, color: '#fbbf24' }],
    Zac: ['engage', { style: 'bounce', bounces: 4, radius: 160, knockup: 0.8, dmg: 0.6, color: '#86efac' }],
    Zed: ['execute', { style: 'mark', delay: 3, store: 0.4, dmg: 1.2, color: '#ef4444' }],
    Zeri: ['transform', { dur: 8, as: 0.4, ms: 0.4, nova: 200, dmg: 1.4, color: '#60a5fa' }],
    Ziggs: ['missile', { aoe: 200, dmg: 1.8, global: true, arc: true, delay: 0.4, speed: 900, color: '#fb923c' }],
    Zilean: ['team', { mode: 'revive', color: '#fde68a' }],
    Zoe: ['multiDash', { dashes: 1, back: true, dmg: 1.4, color: '#f472b6' }],
    Zyra: ['zone', { center: 'densest', radius: 180, delay: 1, knockup: 1, dmg: 1.8, vines: true, color: '#f43f5e' }]
  };

  const ULT_FALLBACK = {
    marksman: ['missile', { aoe: 140, dmg: 1.6, speed: 1100, color: '#facc15' }],
    onhit: ['transform', { dur: 7, as: 0.5, ad: 0.15, color: '#c084fc' }],
    caster: ['beam', { width: 100, delay: 0.6, dmg: 1.6, color: '#fde047' }],
    assassin: ['execute', { style: 'blink', missing: 1, dmg: 1.8, color: '#ef4444' }],
    apAssassin: ['multiDash', { dashes: 2, dmg: 1.2, color: '#a855f7' }],
    mage: ['missile', { aoe: 160, dmg: 2, speed: 900, color: '#a78bfa' }],
    battlemage: ['zone', { center: 'densest', radius: 170, dur: 4, ticks: 8, dmg: 2, color: '#a855f7' }],
    apBruiser: ['zone', { center: 'self', radius: 170, dur: 3, ticks: 6, dmg: 2, color: '#a855f7' }],
    fighter: ['transform', { dur: 8, ad: 0.3, heal: 0.15, color: '#ef4444' }],
    tank: ['engage', { style: 'charge', radius: 170, knockup: 1, dmg: 1.2, color: '#a8a29e' }],
    engage: ['engage', { style: 'charge', radius: 170, stun: 1.25, dmg: 1, color: '#fde68a' }],
    enchanter: ['team', { mode: 'heal', radius: 320, amount: 1.4, color: '#86efac' }],
    mageSup: ['zone', { center: 'densest', radius: 170, delay: 0.8, stun: 1, dmg: 1.6, color: '#f43f5e' }]
  };

  function classOf(c) {
    if (CLASS_OF[c.id]) return CLASS_OF[c.id];
    const t = c.tags, magic = c.info.magic > c.info.attack;
    if (t[0] === 'Marksman') return magic ? 'caster' : 'marksman';
    if (t[0] === 'Support') return t.includes('Tank') ? 'engage' : magic ? 'enchanter' : 'engage';
    if (t[0] === 'Tank') return 'tank';
    if (t[0] === 'Mage') return 'mage';
    if (t[0] === 'Assassin') return magic ? 'apAssassin' : 'assassin';
    if (t[0] === 'Fighter') return magic ? 'apBruiser' : 'fighter';
    return magic ? 'mage' : 'fighter';
  }

  function buildFor(c) {
    const cls = classOf(c);
    const b = { ...BUILDS[cls], ...(BUILD_OVERRIDES[c.id] || {}) };
    const alt = [...new Set([...BUILDS[cls].core, ...BUILDS[cls].alt])].filter(id => !b.core.includes(id));
    return { ...b, alt };
  }

  function ultOf(c) {
    return ULTS[c.id] || ULT_FALLBACK[classOf(c)];
  }

  function ultDesc(c) {
    const [type, o] = ultOf(c);
    const cc = o.stun ? `${o.stun} sn sersemletir` : o.knockup ? `${o.knockup} sn havaya kaldırır` : o.root ? `${o.root} sn köküne bağlar`
      : o.fear ? `${o.fear} sn korkutur` : o.charm ? `${o.charm} sn büyüler` : o.sleep ? 'uyutur' : o.berserk ? 'rakipleri birbirine saldırtır' : '';
    const withCc = cc ? `, ${cc}` : '';
    switch (type) {
      case 'realm': return `Hedefi Ölüler Âlemi'ne çeker: ${o.dur} sn kimsenin karışamadığı 1v1 düello, statlarını çalar.`;
      case 'possess': return 'Yaralı bir rakibin içine girer, dokunulmaz olur, sonra onu parçalayarak çıkar.';
      case 'missile': return `${o.global ? 'Haritanın öbür ucuna' : 'Hedefe'} ${o.shots ? o.shots + ' atış' : 'güçlü bir mermi'} yollar${o.aoe ? ', alan hasarı' : ''}${withCc}${o.missing ? ', düşük canlıları infaz eder' : ''}.`;
      case 'beam': return `${o.global ? 'Haritayı boydan boya kesen' : 'Önündeki hatta'} bir ${o.wave ? 'dalga' : 'ışın'} gönderir${withCc}.`;
      case 'engage': return `${o.style === 'sky' ? 'Gökyüzünden kalabalığın ortasına iner' : o.style === 'blink' ? 'Arka hatta ışınlanır' : 'Rakip takıma dalar'}${withCc}.`;
      case 'zone': return `${o.global ? 'Tüm rakiplere' : 'Bir bölgeye'} ${o.channel ? 'kanalize ederek ' : ''}hasar verir${withCc}${o.stasis ? ', bölgedeki herkesi dondurur' : ''}${o.pull ? ', rakipleri içe çeker' : ''}.`;
      case 'execute': return `Tek hedefe ${o.trueDmg ? 'gerçek hasarlı ' : ''}infaz vuruşu${o.missing ? ', eksik canla güçlenir' : ''}${o.reset ? ', skor alırsa tekrar kullanır' : ''}.`;
      case 'transform': return `${o.dur} sn dönüşür${o.scale ? ', devleşir' : ''}${o.undying ? ', ölmez' : ''}${o.unstoppable ? ', durdurulamaz' : ''}${o.invis ? ', görünmez olur' : ''}.`;
      case 'team': return {
        invuln: 'Dostlarını kısa süre ölümsüz yapar.', noDeath: 'Bir bölgedeki kimse ölemez.', revive: 'Ölen bir dostu diriltir.',
        heal: 'Takımını iyileştirir.', shield: 'Takımına kalkan ve hız verir.', buff: 'Takımına hız ve saldırı hızı verir.',
        enlarge: 'Bir dostu devleştirir, çevresindekileri havaya kaldırır.', shen: 'En zor durumdaki dostunun yanına ışınlanıp kalkan verir.',
        devour: 'Dostunu yutarak korur.'
      }[o.mode];
      case 'summon': return o.clone ? 'Kendi klonunu yaratır, klon ölünce patlar.' : `${o.pet}'i savaşa çağırır.`;
      case 'suppress': return `Hedefi ${o.dur} sn bastırır${o.drag ? ', takımına doğru sürükler' : ''}.`;
      case 'kick': return o.banish ? 'Rakipleri savaş alanının dışına fırlatır.' : o.grab ? 'Rakibi yakalayıp kalabalığın üstüne çarpar.' : 'Rakibi geri fırlatır, çarptıklarını havaya kaldırır.';
      case 'arena': return `${o.dur} sn kaçılmaz bir kafes kurar.`;
      case 'rewind': return 'Zamanda geri gider, iyileşir ve vardığı yerde patlar.';
      case 'multiDash': return o.untargetable ? 'Hedef alınamaz olur, tüyleri geri çağırıp köküne bağlar.' : `${o.dashes} kez atılır${o.root ? ', köküne bağlar' : ''}.`;
      case 'steal': return 'Rakibin ultisini çalıp ona karşı kullanır.';
    }
    return '';
  }

  root.MayhemData = {
    ROLES, ROLE_NAMES, ROLE_SHORT, ROLE_POOLS, CLASS_NAMES, CLASS_DESC, BUILDS, ITEM_FX, ITEM_CATS,
    KEYSTONES, SECONDARY, SUMMONERS, ULTS, classOf, buildFor, ultOf, ultDesc
  };
})(typeof window !== 'undefined' ? window : globalThis);
