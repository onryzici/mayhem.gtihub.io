// Mayhem savaş motoru: DOM'a dokunmaz, tarayıcıda da Node'da da çalışır.
(function (root) {
  const W = 1000, H = 560, LEVEL = 13;

  const ROLES = ['top', 'jungle', 'mid', 'adc', 'support'];
  const ROLE_NAMES = { top: 'Üst Koridor', jungle: 'Orman', mid: 'Orta Koridor', adc: 'Nişancı', support: 'Destek' };
  const ROLE_SHORT = { top: 'ÜST', jungle: 'ORM', mid: 'ORTA', adc: 'NİŞ', support: 'DST' };

  const ROLE_POOLS = {
    top: 'Aatrox Ambessa Camille Chogath Darius DrMundo Fiora Gangplank Garen Gnar Gragas Gwen Illaoi Irelia Jax Jayce Kayle Kennen Kled KSante Malphite Mordekaiser Nasus Olaf Ornn Pantheon Poppy Quinn Renekton Riven Rumble Sett Shen Singed Sion Teemo Trundle Tryndamere Urgot Volibear Warwick Yasuo Yone Yorick Zaahen Akali Aurora Vladimir Sylas',
    jungle: 'Amumu Belveth Briar Diana Ekko Elise Evelynn Fiddlesticks Gragas Graves Hecarim Ivern JarvanIV Karthus Kayn Khazix Kindred LeeSin Lillia Locke MasterYi MonkeyKing Naafiri Nidalee Nocturne Nunu Rammus RekSai Rengar Sejuani Shaco Shyvana Skarner Taliyah Talon Udyr Vi Viego Volibear Warwick XinZhao Zac',
    mid: 'Ahri Akali Akshan Anivia Annie AurelionSol Aurora Azir Cassiopeia Corki Ekko Fizz Galio Hwei Irelia Kassadin Katarina Leblanc Lissandra Locke Lux Malzahar Mel Naafiri Neeko Orianna Qiyana Ryze Swain Sylas Syndra Taliyah Talon TwistedFate Veigar Vex Viktor Vladimir Xerath Yasuo Yone Zed Ziggs Zoe',
    adc: 'Aphelios Ashe Caitlyn Corki Draven Ezreal Jhin Jinx Kaisa Kalista KogMaw Lucian MissFortune Nilah Samira Senna Sivir Smolder Tristana Twitch Varus Vayne Xayah Yunara Zeri Ziggs',
    support: 'Alistar Bard Blitzcrank Brand Braum Janna Karma Leona Lulu Lux Maokai Mel Milio Morgana Nami Nautilus Neeko Pyke Rakan Rell Renata Senna Seraphine Sona Soraka Swain TahmKench Taric Thresh Velkoz Xerath Yuumi Zilean Zyra'
  };
  for (const r in ROLE_POOLS) ROLE_POOLS[r] = ROLE_POOLS[r].split(' ');

  const ARCH_NAMES = {
    adc: 'Nişancı', bruiser: 'Savaşçı', lethal: 'Suikastçı', ap: 'Büyücü',
    apBruiser: 'Büyülü Savaşçı', tank: 'Tank', enchanter: 'Şifacı Destek', tankSup: 'Tank Destek'
  };
  const ARCH_DESC = {
    adc: 'Arkadan sürekli hasar. Kritik ve saldırı hızı ister.',
    bruiser: 'Ön safta dayanıklı ve can emen savaşçı. Saldırı gücü + can ister.',
    lethal: 'Arka hattaki zayıf hedefe dalar. Ölümcüllük ister.',
    ap: 'Alan hasarlı büyüler. Yetenek gücü ister.',
    apBruiser: 'Büyü hasarı veren dayanıklı savaşçı. Yetenek gücü + can ister.',
    tank: 'Takıma girer, sersemletir, hasarı üstlenir. Can ve direnç ister.',
    enchanter: 'Dostlarını iyileştirir ve korur. Destek itemleri ister.',
    tankSup: 'Sersemletip takımını korur. Can ve direnç ister.'
  };
  const MAGIC_ARCH = { ap: 1, apBruiser: 1, enchanter: 1 };

  // stats: Data Dragon değerleri (yama 16.21), fx: simülasyondaki özel etkiler
  const ITEMS = [
    { id: 3031, cat: 'crit', stats: { ad: 75, crit: 0.25 }, fx: { critDmg: 0.4 }, desc: 'Kritik vuruşlar %40 daha fazla hasar verir.' },
    { id: 3046, cat: 'crit', stats: { as: 0.65, crit: 0.25, ms: 0.1 }, desc: 'Çok yüksek saldırı hızı ve hareket hızı.' },
    { id: 3036, cat: 'crit', stats: { ad: 35, crit: 0.25 }, fx: { arpen: 0.35 }, desc: 'Rakibin zırhının %35\'ini yok sayar. Tanklara karşı.' },
    { id: 3072, cat: 'crit', stats: { ad: 80, ls: 0.15 }, desc: 'Temel saldırılar hasarın %15\'i kadar can çalar.' },
    { id: 3153, cat: 'crit', stats: { ad: 40, as: 0.25, ls: 0.1 }, fx: { botrk: 0.08 }, desc: 'Saldırılar hedefin mevcut canının %8\'i kadar ek hasar verir.' },
    { id: 6672, cat: 'crit', stats: { ad: 45, as: 0.4, ms: 0.04 }, fx: { kraken: 90 }, desc: 'Her 3. saldırı 90 gerçek hasar verir.' },

    { id: 3078, cat: 'fighter', stats: { hp: 333, ad: 36, as: 0.3 }, fx: { spellblade: 1 }, ah: 15, desc: 'Yetenekten sonraki saldırı +%100 temel saldırı gücü hasar verir.' },
    { id: 3071, cat: 'fighter', stats: { hp: 400, ad: 45 }, fx: { shred: 0.24 }, ah: 15, desc: 'Fiziksel hasar hedefin zırhını %24 eritir.' },
    { id: 3053, cat: 'fighter', stats: { hp: 400, ad: 20 }, fx: { sterak: 0.35 }, desc: 'Canın %30\'un altına düşünce azami canın %35\'i kadar kalkan.' },
    { id: 3074, cat: 'fighter', stats: { ad: 65, ls: 0.12 }, fx: { cleave: 0.4 }, ah: 15, desc: 'Saldırılar çevredeki düşmanlara da %40 hasar verir.' },
    { id: 6333, cat: 'fighter', stats: { ad: 60, armor: 50 }, fx: { dd: 0.15 }, ah: 15, desc: 'Alınan hasar %15 azalır, alınan her skorda canın %15\'i dolar.' },
    { id: 3026, cat: 'fighter', stats: { ad: 55, armor: 45 }, fx: { ga: 1 }, desc: 'Ölünce 2 saniye sonra %40 canla dirilir. Bir kez.' },

    { id: 3142, cat: 'lethal', stats: { ad: 55, ms: 0.04 }, fx: { leth: 18 }, desc: '18 ölümcüllük: rakip zırhını düz değerle deler.' },
    { id: 3814, cat: 'lethal', stats: { hp: 250, ad: 50 }, fx: { leth: 10, spellshield: 1 }, desc: 'Kendisine gelen ilk yeteneği tamamen engeller.' },
    { id: 6695, cat: 'lethal', stats: { ad: 55 }, fx: { leth: 15, antiShield: 0.5 }, desc: '15 ölümcüllük. Rakip kalkanlarını %50 daha hızlı kırar.' },

    { id: 3089, cat: 'ap', stats: { ap: 130 }, fx: { rabadon: 0.35 }, desc: 'Toplam yetenek gücün %35 artar.' },
    { id: 6655, cat: 'ap', stats: { ap: 100 }, fx: { luden: 90 }, ah: 15, desc: 'Yetenekler ek 90 + %10 YG büyü hasarı verir.' },
    { id: 3135, cat: 'ap', stats: { ap: 95 }, fx: { mpen: 0.4 }, desc: 'Rakibin büyü direncinin %40\'ını yok sayar.' },
    { id: 3157, cat: 'ap', stats: { ap: 105, armor: 50 }, fx: { zhonya: 2.5 }, desc: 'Canın %25\'in altına düşünce 2.5 sn dokunulmaz olursun.' },
    { id: 4645, cat: 'ap', stats: { ap: 110 }, fx: { mpenFlat: 15, execute: 0.2 }, desc: '%40 canın altındaki hedeflere %20 fazla büyü hasarı.' },
    { id: 6653, cat: 'ap', stats: { hp: 300, ap: 60 }, fx: { burn: 0.02 }, desc: 'Yetenekler 3 sn yakar: saniyede azami canın %2\'si. Tank eritir.' },
    { id: 3115, cat: 'ap', stats: { ap: 80, as: 0.5 }, fx: { nashor: 20 }, ah: 15, desc: 'Saldırılar ek 20 + %15 YG büyü hasarı verir.' },
    { id: 3116, cat: 'ap', stats: { hp: 400, ap: 65 }, fx: { slow: 1 }, desc: 'Yeteneklerin hedefi 1.5 sn %35 yavaşlatır.' },

    { id: 3083, cat: 'tank', stats: { hp: 1000 }, fx: { warmog: 0.04 }, desc: '3 sn hasar almazsan saniyede canının %4\'ü yenilenir.' },
    { id: 3068, cat: 'tank', stats: { hp: 350, armor: 50 }, fx: { sunfire: 30 }, ah: 15, desc: 'Yakındaki düşmanları saniyede 30 + ek canın %1\'i kadar yakar.' },
    { id: 3075, cat: 'tank', stats: { hp: 150, armor: 75 }, fx: { thorns: 0.25 }, desc: 'Sana vurulan temel saldırı hasarının %25\'ini geri yansıtır.' },
    { id: 3143, cat: 'tank', stats: { hp: 350, armor: 75 }, fx: { randuin: 0.3 }, desc: 'Kritik vuruşlardan %30 daha az hasar alırsın.' },
    { id: 3065, cat: 'tank', stats: { hp: 400, mr: 50 }, fx: { healAmp: 0.25 }, ah: 15, desc: 'Aldığın iyileşme ve kalkanlar %25 güçlenir.' },
    { id: 6665, cat: 'tank', stats: { hp: 350, armor: 45, mr: 45 }, fx: { jaksho: 0.3 }, desc: 'Savaşın 5. saniyesinden sonra zırh ve direnç %30 artar.' },

    { id: 3190, cat: 'support', stats: { hp: 200, armor: 30, mr: 30 }, fx: { solari: 1 }, ah: 15, desc: 'Bir dost %50 canın altına düşünce tüm takıma kalkan. Bir kez.' },
    { id: 3107, cat: 'support', stats: { hp: 200, ap: 30 }, fx: { redemption: 1 }, ah: 15, desc: 'Bir dost %35 canın altına düşünce tüm takımı iyileştirir. Bir kez.' },
    { id: 6617, cat: 'support', stats: { hp: 200, ap: 25 }, fx: { moonstone: 0.3 }, ah: 15, desc: 'İyileştirmelerin %30 güçlenir.' },
    { id: 3504, cat: 'support', stats: { ap: 45, ms: 0.04 }, fx: { ardent: 0.3 }, desc: 'İyileştirdiğin dostların saldırı hızı 4 sn %30 artar.' }
  ];
  const ITEM_BY_ID = {};
  ITEMS.forEach(it => { ITEM_BY_ID[it.id] = it; });
  const ITEM_CATS = { crit: 'Kritik & Hız', fighter: 'Savaşçı', lethal: 'Suikast', ap: 'Büyü', tank: 'Tank', support: 'Destek' };

  const RECOMMENDED = {
    adc: [3031, 3046, 3036, 3072, 3153, 6672],
    bruiser: [3078, 3071, 3053, 3074, 6333, 3026],
    lethal: [3142, 3814, 6695, 3071, 3074, 3026],
    ap: [3089, 6655, 3135, 3157, 4645, 6653],
    apBruiser: [6653, 3116, 3157, 3068, 3065, 3115],
    tank: [3083, 3068, 3075, 3143, 3065, 6665],
    enchanter: [3190, 3107, 6617, 3504, 3157, 3065],
    tankSup: [3190, 3075, 3143, 3083, 3065, 6665]
  };

  function archetype(c) {
    const t = c.tags, info = c.info;
    const magic = info.magic > info.attack;
    if (t[0] === 'Marksman' || (t.includes('Marksman') && !magic && t[0] !== 'Support')) return 'adc';
    if (t[0] === 'Support') {
      if (t.includes('Tank') || info.defense >= 6) return 'tankSup';
      if (t.includes('Assassin')) return 'lethal';
      return magic ? 'enchanter' : 'tankSup';
    }
    if (t[0] === 'Tank') return 'tank';
    if (t[0] === 'Mage') return 'ap';
    if (t[0] === 'Assassin') return magic ? 'ap' : 'lethal';
    if (t[0] === 'Fighter') return magic ? 'apBruiser' : 'bruiser';
    return magic ? 'ap' : 'bruiser';
  }

  function rolePool(role, champs) {
    const ids = ROLE_POOLS[role].filter(id => champs[id]);
    // Listede olmayan yeni şampiyonları sınıfına göre ekle
    for (const id in champs) {
      if (Object.values(ROLE_POOLS).some(p => p.includes(id))) continue;
      const a = archetype(champs[id]);
      const fit = { top: ['bruiser', 'tank', 'apBruiser'], jungle: ['lethal', 'bruiser', 'tank'], mid: ['ap', 'lethal'], adc: ['adc'], support: ['enchanter', 'tankSup'] }[role];
      if (fit.includes(a)) ids.push(id);
    }
    return ids;
  }

  function computeStats(champ, itemIds) {
    const s = champ.stats, lv = LEVEL - 1;
    const st = {
      hp: s.hp + s.hpperlevel * lv,
      ad: s.attackdamage + (s.attackdamageperlevel || 3) * lv,
      bonusAd: 0, ap: 0,
      armor: s.armor + s.armorperlevel * lv,
      mr: s.spellblock + s.spellblockperlevel * lv,
      asBonus: (s.attackspeedperlevel || 2) * lv / 100,
      crit: 0, ls: 0, ah: 0, msPct: 0,
      range: s.attackrange, fx: {}
    };
    for (const id of itemIds) {
      const it = ITEM_BY_ID[id];
      if (!it) continue;
      const k = it.stats;
      st.hp += k.hp || 0; st.bonusAd += k.ad || 0; st.ap += k.ap || 0;
      st.armor += k.armor || 0; st.mr += k.mr || 0; st.asBonus += k.as || 0;
      st.crit += k.crit || 0; st.ls += k.ls || 0; st.msPct += k.ms || 0; st.ah += it.ah || 0;
      for (const key in it.fx || {}) st.fx[key] = (st.fx[key] || 0) + it.fx[key];
    }
    st.crit = Math.min(1, st.crit);
    if (st.fx.rabadon) st.ap *= 1 + st.fx.rabadon;
    st.ad += st.bonusAd;
    st.as = Math.min(2.5, s.attackspeed * (1 + st.asBonus));
    st.ms = s.movespeed * (1 + st.msPct);
    return st;
  }

  // Kart/arayüz için tek sayıyla güç tahmini
  function powerScore(champ, itemIds) {
    const st = computeStats(champ, itemIds);
    const arch = archetype(champ);
    const rec = RECOMMENDED[arch];
    const fit = itemIds.filter(id => rec.includes(id)).length;
    return { st, fit };
  }

  const FORM = { top: [270, 140], jungle: [300, 280], mid: [250, 420], adc: [150, 230], support: [170, 360] };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  class Sim {
    constructor(teams) {
      this.t = 0;
      this.units = [];
      this.projs = [];
      this.events = [];
      this.done = false;
      this.winner = -1;
      this.kills = [0, 0];
      this.teams = teams;
      teams.forEach((team, side) => team.roster.forEach((m, i) => this.units.push(this.makeUnit(m, side, i))));
    }

    makeUnit(m, side, i) {
      const st = computeStats(m.champ, m.items);
      const arch = archetype(m.champ);
      const [fx, fy] = FORM[m.role] || [250, 100 + i * 80];
      const range = st.range;
      return {
        uid: side * 10 + i, side, champ: m.champ, role: m.role, arch, st, items: m.items,
        x: side ? W - fx : fx, y: fy + (Math.random() - 0.5) * 30, r: 21,
        maxHp: st.hp * 1.3, hp: st.hp * 1.3, shield: 0,
        dr: { bruiser: 0.12, apBruiser: 0.15, lethal: 0.1 }[arch] || 0, evadeUntil: 0,
        rangePx: range * 0.32, ranged: range >= 300,
        speed: st.ms * 0.38,
        atkCd: Math.random() * 0.5, abilCd: 1.5 + Math.random() * 2,
        energy: 0, ultRate: 100 / (10 + Math.random() * 5),
        power: MAGIC_ARCH[arch] ? m.champ.info.magic : m.champ.info.attack,
        stun: 0, stasis: 0, slow: 0, slowUntil: 0, shred: 0, dead: false, reviveAt: 0,
        target: null, retarget: 0, lastHurt: -10, attacks: 0, spellblade: false,
        buffUntil: 0, asBuffUntil: 0, asBuffAmt: 0, burns: [], sunfireTick: 1,
        spellshield: !!st.fx.spellshield, used: {},
        kills: 0, deaths: 0, dmg: 0, heal: 0
      };
    }

    emit(e) { this.events.push(e); }
    allies(u) { return this.units.filter(o => o.side === u.side && !o.dead); }
    enemies(u) { return this.units.filter(o => o.side !== u.side && !o.dead); }

    abilityPower(u) {
      const base = 90 + 14 * u.power;
      if (u.arch === 'tank' || u.arch === 'tankSup') return base * 0.6 + u.maxHp * 0.05 + u.st.ap * 0.4;
      if (MAGIC_ARCH[u.arch]) return base + 0.75 * u.st.ap;
      return base * 0.8 + 1.1 * u.st.bonusAd;
    }
    abilityType(u) { return u.arch === 'adc' || u.arch === 'lethal' || u.arch === 'bruiser' ? 'physical' : 'magic'; }
    healPower(u) { return (70 + 10 * u.champ.info.magic + 0.45 * u.st.ap) * (1 + (u.st.fx.moonstone || 0)); }

    pickTarget(u) {
      const foes = this.enemies(u).filter(o => o.stasis <= 0);
      const pool = foes.length ? foes : this.enemies(u);
      if (!pool.length) return null;
      let best = null, bestScore = Infinity;
      for (const o of pool) {
        let score = dist(u, o);
        if (u.arch === 'lethal') score = o.hp * 0.6 + dist(u, o) * 0.5 - (o.ranged ? 300 : 0);
        else if (u.arch === 'adc' || u.arch === 'ap') score -= (1 - o.hp / o.maxHp) * 120;
        if (score < bestScore) { bestScore = score; best = o; }
      }
      return best;
    }

    densest(list, radius) {
      let best = list[0], n = -1;
      for (const a of list) {
        const c = list.filter(b => dist(a, b) < radius).length;
        if (c > n) { n = c; best = a; }
      }
      return best;
    }

    step(dt) {
      if (this.done) return;
      this.t += dt;
      for (const u of this.units) this.updateUnit(u, dt);
      this.updateProjs(dt);
      this.separate();
      this.checkEnd();
    }

    updateUnit(u, dt) {
      if (u.dead) {
        if (u.reviveAt && this.t >= u.reviveAt) {
          u.dead = false; u.reviveAt = 0; u.hp = u.maxHp * 0.4;
          this.emit({ t: 'revive', u });
        }
        return;
      }
      const fx = u.st.fx;
      if (fx.warmog && this.t - u.lastHurt > 3 && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * fx.warmog * dt);
      if (fx.sunfire) {
        u.sunfireTick -= dt;
        if (u.sunfireTick <= 0) {
          u.sunfireTick = 1;
          const dmg = fx.sunfire + (u.maxHp - u.champ.stats.hp) * 0.01;
          for (const o of this.enemies(u)) if (dist(u, o) < 110) this.damage(u, o, dmg, 'magic', { quiet: true });
          this.emit({ t: 'ring', x: u.x, y: u.y, r: 110, color: 'sun' });
        }
      }
      for (const b of u.burns) {
        b.left -= dt;
        b.acc += dt;
        if (b.acc >= 0.5) { b.acc -= 0.5; this.damage(b.src, u, b.dps * 0.5, 'magic', { quiet: true, burn: true }); }
      }
      u.burns = u.burns.filter(b => b.left > 0);
      if (u.dead) return;

      if (u.stasis > 0) { u.stasis -= dt; return; }
      if (u.stun > 0) { u.stun -= dt; return; }

      u.energy += dt * u.ultRate;
      u.atkCd -= dt;
      u.abilCd -= dt;
      u.retarget -= dt;
      if (!u.target || u.target.dead || u.target.stasis > 0 || u.retarget <= 0) {
        u.target = this.pickTarget(u);
        u.retarget = 1.2;
      }
      const tg = u.target;
      if (!tg) return;
      const d = dist(u, tg);

      if (u.energy >= 100 && d < 420) { u.energy = 0; this.castUlt(u, tg); return; }
      if (u.abilCd <= 0 && d < Math.max(u.rangePx + 40, 230)) {
        u.abilCd = this.abilityCd(u);
        this.castAbility(u, tg);
      }

      const reach = u.rangePx + u.r + tg.r;
      const slowF = this.t < u.slowUntil ? 1 - u.slow : 1;
      if (d > reach) {
        const sp = u.speed * slowF * dt;
        u.x += (tg.x - u.x) / d * Math.min(sp, d - reach + 1);
        u.y += (tg.y - u.y) / d * Math.min(sp, d - reach + 1);
      } else {
        // Nişancılar yakın dövüşçüden biraz kaçar
        if (u.ranged) {
          const melee = this.enemies(u).find(o => !o.ranged && dist(u, o) < 70);
          if (melee) {
            const md = dist(u, melee) || 1;
            u.x += (u.x - melee.x) / md * u.speed * 0.5 * dt;
            u.y += (u.y - melee.y) / md * u.speed * 0.5 * dt;
          }
        }
        if (u.atkCd <= 0) {
          const as = u.st.as * (1 + (this.t < u.asBuffUntil ? u.asBuffAmt : 0));
          u.atkCd = 1 / Math.min(3, as);
          this.basicAttack(u, tg);
        }
      }
      u.x = Math.max(30, Math.min(W - 30, u.x));
      u.y = Math.max(40, Math.min(H - 30, u.y));
    }

    abilityCd(u) {
      const base = { ap: 5, lethal: 6, bruiser: 5, apBruiser: 5, tank: 7, adc: 6, enchanter: 4.5, tankSup: 7 }[u.arch];
      return base * 100 / (100 + u.st.ah) * (0.9 + Math.random() * 0.2);
    }

    basicAttack(u, tg) {
      u.attacks++;
      const crit = Math.random() < u.st.crit;
      let dmg = u.st.ad * (crit ? 1.75 + (u.st.fx.critDmg || 0) : 1);
      if (u.spellblade) { dmg += (u.st.ad - u.st.bonusAd) * u.st.fx.spellblade; u.spellblade = false; }
      if (this.t < u.buffUntil) dmg *= 1.35;
      const hit = () => {
        if (tg.dead) return;
        this.damage(u, tg, dmg, 'physical', { basic: true, crit });
        if (u.st.fx.botrk) this.damage(u, tg, Math.max(15, tg.hp * u.st.fx.botrk), 'physical', { basic: true, quiet: true });
        if (u.st.fx.nashor) this.damage(u, tg, u.st.fx.nashor + 0.15 * u.st.ap, 'magic', { quiet: true });
        if (u.st.fx.kraken && u.attacks % 3 === 0) this.damage(u, tg, u.st.fx.kraken, 'true', {});
        if (u.st.fx.cleave) {
          for (const o of this.enemies(u)) if (o !== tg && dist(o, tg) < 80) this.damage(u, o, dmg * u.st.fx.cleave, 'physical', { quiet: true });
        }
      };
      if (u.ranged) this.shoot(u, tg, 900, 'attack', hit, crit);
      else { this.emit({ t: 'slash', u, tg, crit }); hit(); }
    }

    shoot(u, tg, speed, kind, onHit, big) {
      this.projs.push({ x: u.x, y: u.y, tg, speed, kind, onHit, side: u.side, magic: kind === 'spell' && this.abilityType(u) === 'magic', big });
    }

    updateProjs(dt) {
      for (const p of this.projs) {
        const d = Math.hypot(p.tg.x - p.x, p.tg.y - p.y);
        const sp = p.speed * dt;
        if (d <= sp || p.tg.dead) { p.done = true; if (!p.tg.dead) p.onHit(); continue; }
        p.x += (p.tg.x - p.x) / d * sp;
        p.y += (p.tg.y - p.y) / d * sp;
      }
      this.projs = this.projs.filter(p => !p.done);
    }

    afterAbility(u, tg) {
      if (u.st.fx.spellblade) u.spellblade = true;
      if (tg && !tg.dead) {
        if (u.st.fx.burn) tg.burns.push({ src: u, dps: tg.maxHp * u.st.fx.burn, left: 3, acc: 0 });
        if (u.st.fx.slow) { tg.slow = 0.35; tg.slowUntil = this.t + 1.5; }
        if (u.st.fx.luden) this.damage(u, tg, u.st.fx.luden + 0.1 * u.st.ap, 'magic', { quiet: true, ability: true });
      }
    }

    castAbility(u, tg) {
      const A = this.abilityPower(u), type = this.abilityType(u);
      switch (u.arch) {
        case 'ap':
          this.shoot(u, tg, 650, 'spell', () => {
            this.emit({ t: 'ring', x: tg.x, y: tg.y, r: 70, color: 'magic' });
            for (const o of this.enemies(u)) if (dist(o, tg) < 70) this.damage(u, o, A, type, { ability: true });
            this.afterAbility(u, tg);
          }, true);
          break;
        case 'lethal':
        case 'bruiser':
        case 'apBruiser': {
          if (u.arch === 'lethal') {
            this.dash(u, tg);
            u.evadeUntil = this.t + 1.2;
            this.damage(u, tg, A * 1.4, type, { ability: true });
          } else {
            this.emit({ t: 'ring', x: u.x, y: u.y, r: 90, color: type === 'magic' ? 'magic' : 'phys' });
            let total = 0;
            for (const o of this.enemies(u)) if (dist(o, u) < 90 + o.r) total += this.damage(u, o, A * 0.8, type, { ability: true });
            this.heal(u, u, total * 0.25);
          }
          this.afterAbility(u, tg);
          break;
        }
        case 'tank':
        case 'tankSup':
          if (dist(u, tg) > u.rangePx + 50) this.dash(u, tg);
          this.damage(u, tg, A, 'magic', { ability: true });
          if (!tg.dead && tg.stasis <= 0) { tg.stun = Math.max(tg.stun, u.arch === 'tankSup' ? 1.1 : 0.9); this.emit({ t: 'stun', u: tg }); }
          this.addShield(u, u, u.maxHp * 0.08);
          this.afterAbility(u, tg);
          break;
        case 'adc':
          this.shoot(u, tg, 1100, 'spell', () => {
            const crit = Math.random() < u.st.crit;
            this.damage(u, tg, (A * 0.6 + u.st.ad * 1.1) * (crit ? 1.5 : 1), 'physical', { ability: true, crit });
            this.afterAbility(u, tg);
          }, true);
          break;
        case 'enchanter': {
          const hurt = this.allies(u).filter(a => a.hp / a.maxHp < 0.85 && dist(a, u) < 420)
            .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
          if (hurt) {
            this.heal(u, hurt, this.healPower(u));
            this.addShield(u, hurt, this.healPower(u) * 0.4);
            if (u.st.fx.ardent) { hurt.asBuffUntil = this.t + 4; hurt.asBuffAmt = u.st.fx.ardent; }
          } else {
            this.shoot(u, tg, 650, 'spell', () => { this.damage(u, tg, A * 0.7, 'magic', { ability: true }); this.afterAbility(u, tg); }, true);
          }
          break;
        }
      }
    }

    castUlt(u, tg) {
      this.emit({ t: 'ult', u });
      const A = this.abilityPower(u), type = this.abilityType(u);
      const foes = this.enemies(u);
      switch (u.arch) {
        case 'ap': {
          const c = this.densest(foes, 130);
          this.emit({ t: 'ring', x: c.x, y: c.y, r: 130, color: 'magic', big: true });
          for (const o of foes) if (dist(o, c) < 130) this.damage(u, o, A * 2.1, 'magic', { ability: true });
          this.afterAbility(u, c);
          break;
        }
        case 'lethal': {
          const victim = foes.slice().sort((a, b) => a.hp - b.hp)[0];
          this.dash(u, victim);
          u.evadeUntil = this.t + 1.5;
          this.damage(u, victim, A * 2.6, type, { ability: true, crit: true });
          this.afterAbility(u, victim);
          break;
        }
        case 'bruiser':
        case 'apBruiser':
          u.buffUntil = this.t + 5;
          u.asBuffUntil = this.t + 5; u.asBuffAmt = 0.3;
          this.heal(u, u, u.maxHp * 0.2);
          this.emit({ t: 'ring', x: u.x, y: u.y, r: 100, color: 'buff', big: true });
          for (const o of foes) if (dist(o, u) < 100 + o.r) this.damage(u, o, A * 1.2, type, { ability: true });
          break;
        case 'tank':
        case 'tankSup': {
          const c = this.densest(foes, 130);
          this.dash(u, c);
          this.emit({ t: 'ring', x: u.x, y: u.y, r: 130, color: 'stun', big: true });
          for (const o of this.enemies(u)) if (dist(o, u) < 130 + o.r) {
            this.damage(u, o, A * 1.2, 'magic', { ability: true });
            if (!o.dead && o.stasis <= 0) { o.stun = Math.max(o.stun, 1.5); this.emit({ t: 'stun', u: o }); }
          }
          this.addShield(u, u, u.maxHp * 0.2);
          break;
        }
        case 'adc':
          u.asBuffUntil = this.t + 4; u.asBuffAmt = 0.9;
          u.buffUntil = this.t + 4;
          this.emit({ t: 'ring', x: u.x, y: u.y, r: 60, color: 'buff', big: true });
          break;
        case 'enchanter':
          for (const a of this.allies(u)) {
            this.heal(u, a, this.healPower(u) * 1.5);
            this.addShield(u, a, this.healPower(u) * 0.5);
          }
          this.emit({ t: 'ring', x: u.x, y: u.y, r: 160, color: 'heal', big: true });
          break;
      }
    }

    dash(u, tg) {
      const fromX = u.x, fromY = u.y;
      const d = dist(u, tg) || 1;
      const back = u.r + tg.r + 4;
      u.x = tg.x - (tg.x - u.x) / d * back;
      u.y = tg.y - (tg.y - u.y) / d * back;
      this.emit({ t: 'dash', u, fromX, fromY });
    }

    heal(src, tgt, amount) {
      if (tgt.dead || amount <= 0) return;
      amount *= 1 + (tgt.st.fx.healAmp || 0);
      const real = Math.min(amount, tgt.maxHp - tgt.hp);
      tgt.hp += real;
      src.heal += real;
      if (real >= 20) this.emit({ t: 'heal', x: tgt.x, y: tgt.y, amount: real });
    }

    addShield(src, tgt, amount) {
      if (tgt.dead) return;
      tgt.shield += amount * (1 + (tgt.st.fx.healAmp || 0));
      this.emit({ t: 'shield', u: tgt });
    }

    damage(src, tgt, amount, type, o) {
      if (tgt.dead || tgt.stasis > 0 || amount <= 0) return 0;
      if (o.ability && tgt.spellshield) {
        tgt.spellshield = false;
        this.emit({ t: 'block', u: tgt });
        return 0;
      }
      const jak = tgt.st.fx.jaksho && this.t > 5 ? 1 + tgt.st.fx.jaksho : 1;
      if (type === 'physical') {
        let arm = tgt.st.armor * jak * (1 - tgt.shred) * (1 - (src.st.fx.arpen || 0)) - (src.st.fx.leth || 0);
        amount *= arm >= 0 ? 100 / (100 + arm) : 2 - 100 / (100 - arm);
        if (src.st.fx.shred) tgt.shred = Math.min(src.st.fx.shred, tgt.shred + 0.06);
      } else if (type === 'magic') {
        let mr = tgt.st.mr * jak * (1 - (src.st.fx.mpen || 0)) - (src.st.fx.mpenFlat || 0);
        amount *= mr >= 0 ? 100 / (100 + mr) : 2 - 100 / (100 - mr);
        if (src.st.fx.execute && tgt.hp / tgt.maxHp < 0.4) amount *= 1 + src.st.fx.execute;
      }
      if (o.crit && tgt.st.fx.randuin) amount *= 1 - tgt.st.fx.randuin;
      if (o.ability && this.t < src.buffUntil) amount *= 1.2;
      if (tgt.st.fx.dd) amount *= 1 - tgt.st.fx.dd;
      if (tgt.dr) amount *= 1 - tgt.dr;
      if (this.t < tgt.evadeUntil) amount *= 0.6;

      let left = amount;
      if (tgt.shield > 0) {
        const mult = 1 + (src.st.fx.antiShield || 0);
        const absorbed = Math.min(tgt.shield, left * mult);
        tgt.shield -= absorbed;
        left -= absorbed / mult;
      }
      tgt.hp -= left;
      tgt.lastHurt = this.t;
      src.dmg += amount;
      if (!o.quiet || o.burn) this.emit({ t: 'hit', x: tgt.x, y: tgt.y, amount, type, crit: !!o.crit, quiet: !!o.quiet });

      if (o.basic && src.st.ls) this.heal(src, src, amount * src.st.ls);
      if (o.basic && type === 'physical' && tgt.st.fx.thorns && !o.reflect) {
        this.damage(tgt, src, amount * tgt.st.fx.thorns, 'magic', { quiet: true, reflect: true });
      }

      const pct = tgt.hp / tgt.maxHp;
      if (tgt.hp > 0) {
        if (tgt.st.fx.sterak && !tgt.used.sterak && pct < 0.3) { tgt.used.sterak = true; this.addShield(tgt, tgt, tgt.maxHp * tgt.st.fx.sterak); }
        if (tgt.st.fx.zhonya && !tgt.used.zhonya && pct < 0.25) { tgt.used.zhonya = true; tgt.stasis = tgt.st.fx.zhonya; this.emit({ t: 'stasis', u: tgt }); }
        for (const a of this.allies(tgt)) {
          if (a.st.fx.solari && !a.used.solari && pct < 0.5) {
            a.used.solari = true;
            this.emit({ t: 'ring', x: a.x, y: a.y, r: 200, color: 'shield', big: true });
            for (const b of this.allies(a)) this.addShield(a, b, 180 + b.maxHp * 0.05);
          }
          if (a.st.fx.redemption && !a.used.redemption && pct < 0.35) {
            a.used.redemption = true;
            this.emit({ t: 'ring', x: tgt.x, y: tgt.y, r: 200, color: 'heal', big: true });
            for (const b of this.allies(a)) this.heal(a, b, 200 + b.maxHp * 0.1);
          }
        }
      } else {
        this.kill(src, tgt);
      }
      return amount;
    }

    kill(src, tgt) {
      tgt.hp = 0;
      tgt.dead = true;
      tgt.shield = 0;
      tgt.burns = [];
      tgt.deaths++;
      if (tgt.st.fx.ga && !tgt.used.ga) { tgt.used.ga = true; tgt.reviveAt = this.t + 2; }
      if (src.side !== tgt.side) { src.kills++; this.kills[src.side]++; }
      src.energy += 30;
      if (src.st.fx.dd) this.heal(src, src, src.maxHp * 0.15);
      this.projs = this.projs.filter(p => p.tg !== tgt);
      this.emit({ t: 'kill', killer: src, victim: tgt });
    }

    separate() {
      const live = this.units.filter(u => !u.dead);
      for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
        const a = live[i], b = live[j];
        const d = dist(a, b), min = a.r + b.r;
        if (d < min && d > 0.01) {
          const push = (min - d) / 2;
          const nx = (a.x - b.x) / d, ny = (a.y - b.y) / d;
          a.x += nx * push; a.y += ny * push;
          b.x -= nx * push; b.y -= ny * push;
        }
      }
    }

    alive(side) { return this.units.some(u => u.side === side && (!u.dead || u.reviveAt)); }

    checkEnd() {
      const a = this.alive(0), b = this.alive(1);
      if (a && b && this.t < 90) return;
      this.done = true;
      if (a !== b) this.winner = a ? 0 : 1;
      else {
        const hp = s => this.units.filter(u => u.side === s).reduce((t, u) => t + u.hp / u.maxHp, 0);
        this.winner = hp(0) >= hp(1) ? 0 : 1;
      }
    }

    runHeadless(maxT = 120) {
      while (!this.done && this.t < maxT) { this.step(1 / 30); this.events.length = 0; }
      if (!this.done) { this.t = 999; this.checkEnd(); }
      return this.winner;
    }
  }

  root.Mayhem = {
    W, H, LEVEL, ROLES, ROLE_NAMES, ROLE_SHORT, ARCH_NAMES, ARCH_DESC, ITEMS, ITEM_BY_ID, ITEM_CATS,
    RECOMMENDED, archetype, rolePool, computeStats, powerScore, Sim
  };
})(typeof window !== 'undefined' ? window : globalThis);
