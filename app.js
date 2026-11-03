(() => {
  const D = window.MayhemData;
  const M = window.Mayhem;
  const R = window.MayhemRender;
  const DD = 'https://ddragon.leagueoflegends.com';
  const $ = id => document.getElementById(id);

  const COLORS = ['#4f8cff', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#f97316', '#ec4899'];
  const AI_TEAMS = [
    ['Noxus Lejyonu', 'NOX'], ['Demacia Şövalyeleri', 'DMC'], ['Zaun Kimyagerleri', 'ZAU'], ['Piltover Mucitleri', 'PLT'],
    ['Ionia Ruhları', 'ION'], ['Freljord Kurtları', 'FRJ'], ['Shurima Varisleri', 'SHR'], ['Bilgewater Korsanları', 'BLG'],
    ['Gölge Adalar', 'GLG'], ['Targon Yıldızları', 'TGN'], ['Hiçlik Sürüsü', 'VOID'], ['Ixtal Avcıları', 'IXT']
  ];
  const ROUND_NAMES = ['Çeyrek Final', 'Yarı Final', 'Final'];
  const BEST_OF = [1, 3, 3];
  const ITEM_SLOTS = 5;

  const S = {
    v: null, champs: null, runes: [], keystones: {}, trees: {}, summ: {}, detail: {},
    team: { name: '', tag: '', color: COLORS[0], roster: [] },
    tagTouched: false,
    draft: { idx: 0, options: [], rerolls: 3 },
    loIdx: 0, loTab: 'items',
    tour: null, speed: 1, autoUlt: true
  };

  // ---------- yardımcılar ----------
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('tr-TR');
  const icon = c => `${DD}/cdn/${S.v}/img/champion/${c.image.full}`;
  const loadingArt = (c, skin = 0) => `${DD}/cdn/img/champion/loading/${c.id}_${skin || 0}.jpg`;
  const splashArt = (c, skin = 0) => `${DD}/cdn/img/champion/splash/${c.id}_${skin || 0}.jpg`;
  // Kostümlü portre: varsayılan kostümde kare simge, diğerlerinde yükleme görselinden yüz kırpılır
  const portrait = (c, skin) => skin ? loadingArt(c, skin) : icon(c);
  const porStyle = skin => skin ? ' style="object-fit:cover;object-position:50% 14%" onerror="this.onerror=null;this.style.objectPosition=\'50% 50%\';this.src=this.dataset.fb"' : '';
  const itemIcon = id => `${DD}/cdn/${S.v}/img/item/${id}.png`;
  const summIcon = id => `${DD}/cdn/${S.v}/img/spell/${id}.png`;
  const runeIcon = path => `${DD}/cdn/img/${path}`;

  const imgCache = {};
  function img(url) {
    if (!imgCache[url]) { const i = new Image(); i.src = url; imgCache[url] = i; }
    return imgCache[url];
  }

  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    lineup.hidden = !(id === 'draft' || id === 'loadout');
    window.scrollTo(0, 0);
  }
  const teamBadge = (t, small) => `<span class="badge${small ? ' sm' : ''}" style="--c:${t.color}">${esc(t.tag)}</span>`;
  function refreshTeamBits() {
    document.querySelectorAll('[data-team-badge]').forEach(b => { b.textContent = S.team.tag; b.style.setProperty('--c', S.team.color); });
    document.querySelectorAll('[data-team-name]').forEach(n => { n.textContent = S.team.name; });
  }

  function itemStatLine(it) {
    const k = it.stats, out = [];
    if (k.FlatHPPoolMod) out.push(`+${k.FlatHPPoolMod} Can`);
    if (k.FlatPhysicalDamageMod) out.push(`+${k.FlatPhysicalDamageMod} SG`);
    if (k.FlatMagicDamageMod) out.push(`+${k.FlatMagicDamageMod} YG`);
    if (k.FlatArmorMod) out.push(`+${k.FlatArmorMod} Zırh`);
    if (k.FlatSpellBlockMod) out.push(`+${k.FlatSpellBlockMod} BD`);
    if (k.PercentAttackSpeedMod) out.push(`%${Math.round(k.PercentAttackSpeedMod * 100)} SH`);
    if (k.FlatCritChanceMod) out.push(`%${Math.round(k.FlatCritChanceMod * 100)} Kritik`);
    if (k.PercentLifeStealMod) out.push(`%${Math.round(k.PercentLifeStealMod * 100)} Can Çalma`);
    if (it.ah) out.push(`${it.ah} YH`);
    if (it.fx && it.fx.leth) out.push(`${it.fx.leth} Ölümcüllük`);
    if (k.FlatMovementSpeedMod) out.push(`+${k.FlatMovementSpeedMod} HH`);
    return out.join(' · ');
  }

  // ---------- veri ----------
  async function getJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(url);
    return r.json();
  }

  async function load() {
    try {
      S.v = (await getJSON(`${DD}/api/versions.json`))[0];
      const base = `${DD}/cdn/${S.v}/data/tr_TR`;
      const [c, i, r, s] = await Promise.all([
        getJSON(`${base}/champion.json`), getJSON(`${base}/item.json`), getJSON(`${base}/runesReforged.json`), getJSON(`${base}/summoner.json`)
      ]);
      S.champs = c.data;
      M.setItemData(i);
      S.runes = r;
      for (const tree of r) {
        S.trees[tree.id] = tree;
        for (const k of tree.slots[0].runes) if (D.KEYSTONES[k.id]) S.keystones[k.id] = { ...k, tree: tree.id };
      }
      for (const id in D.SUMMONERS) if (s.data[id]) S.summ[id] = s.data[id];
      $('loadNote').textContent = `${Object.keys(S.champs).length} şampiyon · yama ${S.v}`;
      setupIntro();
      updateIntro();
    } catch (e) {
      $('toDraft').textContent = 'Yüklenemedi';
      $('loadNote').textContent = 'Veriler alınamadı. Bağlantını kontrol edip sayfayı yenile.';
    }
  }

  async function detail(id) {
    if (S.detail[id]) return S.detail[id];
    try {
      const d = (await getJSON(`${DD}/cdn/${S.v}/data/tr_TR/champion/${id}.json`)).data[id];
      const r = d.spells[3];
      const skins = (d.skins || []).filter(s => s.parentSkin === undefined).map(s => ({ num: s.num, name: s.num === 0 ? 'Klasik' : s.name, chromas: !!s.chromas }));
      S.detail[id] = { ultName: r.name, ultIcon: `${DD}/cdn/${S.v}/img/spell/${r.image.full}`, skins: skins.length ? skins : [{ num: 0, name: 'Klasik' }] };
    } catch (e) {
      S.detail[id] = { ultName: 'Ulti', ultIcon: icon(S.champs[id]), skins: [{ num: 0, name: 'Klasik' }] };
    }
    return S.detail[id];
  }

  // ---------- ses replikleri ----------
  const VO_BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/tr_tr/v1';
  const vo = { on: true, cur: null, played: new Set() };
  try { vo.on = localStorage.getItem('mayhemVO') !== '0'; } catch (e) {}
  function playVO(c, kind = 'choose', vol = 0.75, force = true) {
    if (!vo.on || !c) return null;
    if (!force && vo.cur && !vo.cur.paused && !vo.cur.ended) return null;
    try {
      if (vo.cur) vo.cur.pause();
      const a = new Audio(`${VO_BASE}/champion-${kind}-vo/${c.key}.ogg`);
      a.volume = vol;
      a.play().catch(() => {});
      vo.cur = a;
      return a;
    } catch (e) { return null; }
  }
  function setVO(on) {
    vo.on = on;
    if (!on && vo.cur) vo.cur.pause();
    try { localStorage.setItem('mayhemVO', on ? '1' : '0'); } catch (e) {}
    document.querySelectorAll('[data-vo-toggle]').forEach(b => { b.classList.toggle('off', !on); b.textContent = on ? '🔊' : '🔇'; });
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-vo-toggle]'); if (b) setVO(!vo.on); });

  // ---------- 1. giriş (launcher) ----------
  function setupLauncher(ids) {
    $('lnPatch').textContent = `yama ${S.v}`;
    const pick = n => S.champs[ids[n % ids.length]];
    const news = [
      { c: pick(10), tag: 'Yeni mod', t: '5 dakikalık maçlar', d: 'Koridor evresi, orman, ejder ve Baron. Nexus\'u yıkan kazanır.' },
      { c: pick(11), tag: 'Koleksiyon', t: 'Kostümler geldi', d: 'Her şampiyonun güncel kostümleri dizilim ekranında.' },
      { c: pick(12), tag: 'Yama ' + S.v, t: 'Güncel itemler', d: `${Object.keys(M.ITEMS).length} item, ${Object.keys(S.keystones).length} ana rün, gerçek buildler.` }
    ];
    $('lnNews').innerHTML = news.map((n, i) => `<div class="ln-card" data-news="${i}" style="background-image:url('${splashArt(n.c)}')"><div><small>${esc(n.tag)}</small><b>${esc(n.t)}</b><span>${esc(n.d)}</span></div></div>`).join('');
    const sorted = Object.values(S.champs).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    $('lnGal').innerHTML = sorted.map(c => `<button type="button" class="ln-ch" data-ch="${c.id}" data-q="${esc(c.name.toLocaleLowerCase('tr'))}"><img src="${icon(c)}" alt="" loading="lazy"><span>${esc(c.name)}</span></button>`).join('');
    const status = [['Çevrimiçi', '#0acf83'], ['Maçta', '#0ab3cf'], ['Dizilim yapıyor', '#c8a14b'], ['Çevrimdışı', '#5b5a56']];
    let online = 0;
    $('lnTeams').innerHTML = AI_TEAMS.map(([n, t], i) => {
      const st = status[(i * 7 + 3) % 4];
      if (st[0] !== 'Çevrimdışı') online++;
      return `<div class="ln-tm" style="--st:${st[1]};--stc:${st[1]}"><span class="badge sm" style="--c:${COLORS[(i + 1) % COLORS.length]}">${esc(t)}</span><div><b>${esc(n)}</b><small>${st[0]}</small></div></div>`;
    }).join('');
    $('lnOnline').textContent = `${online}/${AI_TEAMS.length}`;
  }
  const lnTab = tab => {
    S.lnTab = tab;
    if (S.champs) updateIntro();
    document.querySelectorAll('#lnTabs button').forEach(b => b.classList.toggle('on', b.dataset.ln === tab));
    document.querySelectorAll('.ln-page').forEach(pg => pg.classList.toggle('on', pg.dataset.page === tab));
  };
  const goForm = () => { lnTab('home'); const f = $('formCard'); f.classList.remove('pulse'); void f.offsetWidth; f.classList.add('pulse'); $('teamName').focus(); };
  $('lnTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) lnTab(b.dataset.ln); });
  $('lnPlay').addEventListener('click', () => { if (!$('toDraft').disabled) $('toDraft').click(); else goForm(); });
  $('intro').addEventListener('click', e => {
    if (e.target.closest('[data-go-form]') || e.target.closest('[data-news]')) goForm();
    const ch = e.target.closest('[data-ch]');
    if (ch) {
      document.querySelectorAll('.ln-ch.playing').forEach(x => x.classList.remove('playing'));
      ch.classList.add('playing');
      const a = playVO(S.champs[ch.dataset.ch]);
      if (a) a.onended = () => ch.classList.remove('playing');
    }
  });
  $('lnSearch').addEventListener('input', e => {
    const q = e.target.value.trim().toLocaleLowerCase('tr');
    document.querySelectorAll('.ln-ch').forEach(b => { b.hidden = q && !b.dataset.q.includes(q); });
  });
  $('voToggle').dataset.voToggle = '1';

  function setupIntro() {
    const ids = shuffle(Object.keys(S.champs));
    const picks = ids.slice(0, 7);
    $('introBg').innerHTML = picks.map((id, i) => `<div class="slide${i ? '' : ' on'}" style="background-image:url('${splashArt(S.champs[id])}')"></div>`).join('');
    $('featChamps').textContent = Object.keys(S.champs).length;
    setupLauncher(ids);
    setVO(vo.on);
    const icons = ids.slice(0, 44).map(id => `<img src="${icon(S.champs[id])}" alt="" loading="lazy">`).join('');
    $('marquee').innerHTML = icons + icons;
    let cur = 0;
    const credit = () => { const c = S.champs[picks[cur]]; $('bgCredit').innerHTML = `<b>${esc(c.name)}</b>${esc(c.title)}`; };
    credit();
    clearInterval(S.introTimer);
    S.introTimer = setInterval(() => {
      if (!$('intro').classList.contains('active')) return;
      const slides = $('introBg').children;
      slides[cur].classList.remove('on');
      cur = (cur + 1) % slides.length;
      slides[cur].classList.add('on');
      credit();
    }, 6500);
  }
  function autoTag(name) {
    const words = name.trim().split(/\s+/).filter(Boolean);
    const t = words.length > 1 ? words.map(w => w[0]).join('') : (words[0] || '');
    return t.slice(0, 3).toLocaleUpperCase('tr');
  }
  function updateIntro() {
    const name = $('teamName').value.trim();
    if (!S.tagTouched) $('teamTag').value = autoTag(name);
    const tag = $('teamTag').value.trim().toLocaleUpperCase('tr') || 'TAK';
    $('pvBadge').textContent = tag;
    $('pvBadge').style.setProperty('--c', S.team.color);
    $('teamPreview').style.setProperty('--pc', S.team.color);
    $('pvName').textContent = name || 'Takımın';
    $('lnName').textContent = typeof ACC !== 'undefined' && ACC.user ? ACC.name : (ACC.ready ? 'Misafir · Giriş yap' : 'Bağlanıyor…');
    $('lnBadge').textContent = tag;
    $('lnBadge').style.setProperty('--c', S.team.color);
    $('toDraft').disabled = !(S.champs && name.length >= 2);
    if (S.champs) $('toDraft').textContent = S.lnTab === 'ranked' ? 'Kaydet ve devam et ✓' : 'AI turnuvası için takımı kur →';
    $('formCard').querySelector('.eyebrow').textContent = S.lnTab === 'ranked' ? 'Online profil' : 'Yeni takım';
  }
  $('swatches').innerHTML = COLORS.map((c, i) => `<button type="button" class="swatch${i ? '' : ' on'}" style="--c:${c}" data-c="${c}" aria-label="Renk"></button>`).join('');
  $('swatches').addEventListener('click', e => {
    const b = e.target.closest('.swatch');
    if (!b) return;
    S.team.color = b.dataset.c;
    document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('on', s === b));
    updateIntro();
  });
  $('teamName').addEventListener('input', updateIntro);
  $('teamTag').addEventListener('input', () => { S.tagTouched = $('teamTag').value.trim() !== ''; updateIntro(); });
  $('teamName').addEventListener('keydown', e => { if (e.key === 'Enter' && !$('toDraft').disabled) $('toDraft').click(); });
  $('toDraft').addEventListener('click', () => {
    if (S.lnTab === 'ranked') { rankedFormSubmit(); return; }
    cancelLobby();
    S.team.name = $('teamName').value.trim();
    S.team.tag = ($('teamTag').value.trim() || autoTag(S.team.name)).toLocaleUpperCase('tr');
    if (typeof rememberTeam === 'function') rememberTeam();
    S.team.roster = [];
    document.documentElement.style.setProperty('--team', S.team.color);
    refreshTeamBits();
    S.draft = { idx: 0, options: draftOptions(0), rerolls: 3 };
    renderDraft();
    show('draft');
  });

  // ---------- alt çubuk ----------
  const lineup = document.createElement('div');
  lineup.className = 'lineup';
  lineup.hidden = true;
  lineup.innerHTML = '<div class="inner"><div class="slots" id="slots"></div><div id="lineupAction"></div></div>';
  document.body.appendChild(lineup);

  function renderLineup(activeIdx, action) {
    $('slots').innerHTML = D.ROLES.map((role, i) => {
      const r = S.team.roster[i];
      const list = r ? [r.boots, ...r.items].filter(Boolean) : [];
      const dots = list.length ? `<div class="items-dots">${list.map(id => `<img src="${itemIcon(id)}" alt="">`).join('')}</div>` : '';
      return `<div class="slot${i === activeIdx ? ' on' : ''}" data-i="${i}">
        <div class="ico">${r ? `<img src="${portrait(r.champ, r.skin)}" data-fb="${icon(r.champ)}"${porStyle(r.skin)} alt="">` : ''}</div>
        <div class="txt"><small>${D.ROLE_SHORT[role]}</small><b>${r ? esc(r.champ.name) : '—'}</b>${dots}</div>
      </div>`;
    }).join('');
    $('lineupAction').innerHTML = action || '';
  }

  // ---------- 2. draft ----------
  function draftOptions(idx) {
    const taken = new Set(S.team.roster.slice(0, idx).map(r => r.champ.id));
    const pool = D.ROLE_POOLS[D.ROLES[idx]].filter(id => S.champs[id] && !taken.has(id));
    return shuffle(pool).slice(0, 5).map(id => S.champs[id]);
  }
  const bar = (label, v, color) => `<div class="bar"><span>${label}</span><i style="--v:${v * 10}%;--bc:${color}"></i></div>`;

  function renderDraft() {
    const { idx, options, rerolls } = S.draft;
    const role = D.ROLES[idx];
    $('draftSteps').innerHTML = D.ROLES.map((r, i) => `<span class="step${i === idx ? ' on' : i < idx ? ' done' : ''}">${D.ROLE_SHORT[r]}</span>`).join('');
    $('draftEyebrow').textContent = `Seçim ${idx + 1} / 5`;
    $('draftTitle').textContent = `${D.ROLE_NAMES[role]} için şampiyonunu seç`;
    $('reroll').textContent = `↻ Başka 5 göster (${rerolls})`;
    $('reroll').disabled = rerolls <= 0;
    $('draftBack').disabled = idx === 0;
    $('picks').innerHTML = options.map((c, i) => {
      const cls = D.classOf(c);
      const det = S.detail[c.id];
      return `<button class="pick" type="button" data-i="${i}">
        <div class="art"><img src="${loadingArt(c)}" alt="${esc(c.name)}"></div>
        <div class="meta">
          <div class="name">${esc(c.name)}</div>
          <div class="title">${esc(c.title)}</div>
          <div class="chips"><span class="chip gold">${D.CLASS_NAMES[cls]}</span><span class="chip">${c.stats.attackrange >= 300 ? 'Uzak' : 'Yakın'}</span></div>
          <div class="ult-line" data-ult="${c.id}">${ultLine(c, det)}</div>
          <div class="bars">${bar('Saldırı', c.info.attack, '#f59e0b')}${bar('Savunma', c.info.defense, '#34d399')}${bar('Büyü', c.info.magic, '#a78bfa')}</div>
        </div>
      </button>`;
    }).join('');
    renderLineup(idx);
    options.forEach(c => detail(c.id).then(det => {
      const el = document.querySelector(`[data-ult="${c.id}"]`);
      if (el) el.innerHTML = ultLine(c, det);
    }));
  }

  function ultLine(c, det) {
    return `${det ? `<img src="${det.ultIcon}" alt="">` : '<img alt="" style="opacity:0">'}<div><b>R · ${det ? esc(det.ultName) : '…'}</b><span>${esc(D.ultDesc(c))}</span></div>`;
  }

  // Ormancı her zaman Çarp taşır
  const roleSumms = (role, b) => role === 'jungle' ? ['SummonerSmite', b.summ.includes('SummonerFlash') ? 'SummonerFlash' : b.summ[0]] : b.summ.filter(x => x !== 'SummonerSmite').slice(0, 2);
  function defaultLoadout(c, role) {
    const b = D.buildFor(c);
    return { boots: b.boots, items: [...new Set([...b.core, ...b.alt])].slice(0, ITEM_SLOTS), keystone: b.keystone, secondary: b.secondary, summs: roleSumms(role, b) };
  }

  $('picks').addEventListener('click', e => {
    const b = e.target.closest('.pick');
    if (!b) return;
    const c = S.draft.options[+b.dataset.i];
    const idx = S.draft.idx;
    playVO(c);
    const b0 = D.buildFor(c);
    S.team.roster[idx] = { role: D.ROLES[idx], champ: c, boots: null, items: [], keystone: b0.keystone, secondary: b0.secondary, summs: roleSumms(D.ROLES[idx], b0) };
    S.team.roster.length = idx + 1;
    detail(c.id);
    if (idx === 4) { S.loIdx = 0; S.loTab = 'items'; renderLoadout(); show('loadout'); return; }
    S.draft.idx++;
    S.draft.options = draftOptions(S.draft.idx);
    renderDraft();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  $('reroll').addEventListener('click', () => {
    if (S.draft.rerolls <= 0) return;
    S.draft.rerolls--;
    S.draft.options = draftOptions(S.draft.idx);
    renderDraft();
  });
  $('draftBack').addEventListener('click', () => {
    if (S.draft.idx === 0) return;
    S.draft.idx--;
    S.team.roster.length = S.draft.idx;
    S.draft.options = draftOptions(S.draft.idx);
    renderDraft();
  });

  // ---------- 3. dizilim ----------
  const complete = r => r.boots && r.items.length === ITEM_SLOTS && r.keystone && r.secondary && r.summs.length === 2;

  function fitInfo(r) {
    const b = D.buildFor(r.champ);
    const rec = new Set([...b.core, ...b.alt]);
    const fit = r.items.filter(id => rec.has(id)).length;
    const cls = D.classOf(r.champ);
    const magic = ['apAssassin', 'mage', 'battlemage', 'apBruiser', 'enchanter', 'mageSup'].includes(cls);
    const physical = ['marksman', 'onhit', 'caster', 'assassin', 'fighter'].includes(cls);
    const cats = r.items.map(id => M.ITEMS[id] && M.ITEMS[id].cat);
    let warn = '';
    if (magic && cls !== 'apBruiser' && cats.some(c => c === 'crit' || c === 'assassin' || c === 'caster')) warn = 'Bu şampiyon büyü hasarı vuruyor; saldırı gücü itemleri yeteneklerini güçlendirmez.';
    else if (physical && cats.includes('mage') && !['Kaisa', 'Kayle'].includes(r.champ.id)) warn = 'Bu şampiyon fiziksel hasar vuruyor; yetenek gücü burada boşa gider.';
    else if (cls === 'enchanter' && r.items.length === ITEM_SLOTS && !cats.includes('support')) warn = 'Destek itemleri olmadan iyileştirmelerin zayıf kalır.';
    else if ((cls === 'tank' || cls === 'engage') && r.items.length === ITEM_SLOTS && !cats.some(c => c === 'tank' || c === 'support')) warn = 'Tank itemleri olmadan ön safta hızla erirsin.';
    const labels = ['Uyumsuz', 'Uyumsuz', 'Zayıf', 'Orta', 'İyi', 'Mükemmel'];
    const colors = ['#f87171', '#f87171', '#fb923c', '#facc15', '#a3e635', '#34d399'];
    return { fit, label: labels[fit], color: colors[fit], warn };
  }

  function renderLoadout() {
    const idx = S.loIdx;
    const r = S.team.roster[idx];
    const c = r.champ;
    const cls = D.classOf(c);
    const det = S.detail[c.id];
    if (!det) detail(c.id).then(() => { if (S.loIdx === idx) renderLoadout(); });

    $('loSteps').innerHTML = S.team.roster.map((x, i) => `<button type="button" class="step${i === idx ? ' on' : complete(x) ? ' done' : ''}" data-i="${i}">${complete(x) ? '✓ ' : ''}${esc(x.champ.name)}</button>`).join('');
    document.querySelectorAll('#loTabs .tab').forEach(t => t.classList.toggle('on', t.dataset.tab === S.loTab));

    const lo = { items: [r.boots, ...r.items].filter(Boolean), secondary: r.secondary };
    const base = M.computeStats(c, { items: [] });
    const cur = M.computeStats(c, lo);
    const HM = M.HP_MULT;
    const stat = (label, a, b, f = v => fmt(v)) => `<div class="stat"><small>${label}</small><b>${f(b)}</b>${b - a > 0.001 ? `<em>+${f(b - a)}</em>` : ''}</div>`;
    const fi = fitInfo(r);
    const gold = [r.boots, ...r.items].filter(Boolean).reduce((t, id) => t + (M.ITEMS[id] ? M.ITEMS[id].gold : 0), 0);
    $('champPanel').innerHTML = `
      <div class="art"><img src="${splashArt(c, r.skin)}" alt=""></div>
      <div class="body">
        <div class="eyebrow">${D.ROLE_NAMES[r.role]}${r.skin && det ? ` · ${esc((det.skins.find(s => s.num === r.skin) || {}).name || '')}` : ''}</div>
        <h3>${esc(c.name)} <button type="button" class="btn ghost small" data-vo-play="${c.id}" title="Repliği dinle" style="padding:4px 9px;vertical-align:middle">🔊</button></h3>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"><span class="chip gold">${D.CLASS_NAMES[cls]}</span><span class="chip">Seviye ${M.LEVEL}</span><span class="chip">${fmt(gold)} altın</span></div>
        <div class="desc">${D.CLASS_DESC[cls]}</div>
        <div class="ult-line">${ultLine(c, det)}</div>
        <div class="stats">
          ${stat('Can', base.hp * HM, cur.hp * HM)}
          ${stat('Saldırı Gücü', base.ad, cur.ad)}
          ${stat('Yetenek Gücü', base.ap, cur.ap)}
          ${stat('Saldırı Hızı', base.as, cur.as, v => v.toFixed(2))}
          ${stat('Zırh', base.armor, cur.armor)}
          ${stat('Büyü Direnci', base.mr, cur.mr)}
          ${stat('Kritik', base.crit * 100, cur.crit * 100, v => `%${Math.round(v)}`)}
          ${stat('Yetenek Hızı', base.ah, cur.ah)}
        </div>
        <div class="fit">
          Build uyumu: <b style="color:${fi.color}">${r.items.length ? fi.label : '—'}</b>${D.buildFor(c).pro ? ` <span class="chip gold" style="margin-left:6px" title="Önerilen build pro maçlardan">PRO · ${D.buildFor(c).pro.n} maç · %${Math.round(D.buildFor(c).pro.wr * 100)} kazanma</span>` : ''}
          <div class="meter" style="--fc:${fi.color}">${Array.from({ length: ITEM_SLOTS }, (_, i) => `<i class="${i < fi.fit ? 'on' : ''}"></i>`).join('')}</div>
          ${fi.warn ? `<div style="margin-top:8px;color:#fca5a5;font-size:12px;line-height:1.45">⚠ ${fi.warn}</div>` : ''}
        </div>
      </div>`;

    if (S.loTab === 'items') renderItemsTab(r);
    else if (S.loTab === 'runes') renderRunesTab(r);
    else if (S.loTab === 'skins') renderSkinTab(r, det);
    else renderSummTab(r);

    const allDone = S.team.roster.every(complete);
    const next = S.team.roster.findIndex((x, i) => i !== idx && !complete(x));
    let action;
    if (allDone) action = '<button class="btn" id="startTour">Turnuvaya başla →</button>';
    else if (next < 0) action = '<button class="btn" disabled>Dizilimi tamamla</button>';
    else action = `<button class="btn" id="nextChamp" ${complete(r) ? '' : 'disabled'}>Sonraki: ${esc(S.team.roster[next].champ.name)} →</button>`;
    renderLineup(idx, action);
  }

  function renderItemsTab(r) {
    const b = D.buildFor(r.champ);
    const recSet = new Set(b.core);
    const altSet = new Set(b.alt);
    const slot = (id, i, boots) => {
      if (!id) return `<div class="cslot${boots ? ' boots' : ''}">${boots ? 'Ayakkabı' : `Item ${i}`}</div>`;
      const it = M.ITEMS[id];
      return `<div class="cslot full${boots ? ' boots' : ''}" data-rm="${id}" title="Çıkarmak için tıkla"><img src="${itemIcon(id)}" alt=""><div style="min-width:0"><b>${esc(it.name)}</b><span class="muted" style="font-size:10px">Çıkar ✕</span></div></div>`;
    };
    const tile = it => {
      const isBoots = it.cat === 'boots';
      const sel = isBoots ? r.boots === it.id : r.items.includes(it.id);
      const dis = !sel && !isBoots && r.items.length >= ITEM_SLOTS;
      const tag = recSet.has(it.id) || b.boots === it.id ? '★ ÖNERİLEN' : altSet.has(it.id) ? 'ALTERNATİF' : '';
      return `<button type="button" class="item${sel ? ' sel' : ''}" data-id="${it.id}" ${dis ? 'disabled' : ''}>
        <img src="${itemIcon(it.id)}" alt="" loading="lazy">
        <div><b>${esc(it.name)}</b><div class="st">${itemStatLine(it)}</div><div class="d">${esc(it.desc)}</div></div>
        ${tag ? `<span class="rec">${tag}</span>` : ''}<span class="gold">${fmt(it.gold)}</span>
      </button>`;
    };
    const all = Object.values(M.ITEMS);
    const recList = [...b.core, ...b.alt].map(id => M.ITEMS[id]).filter(Boolean);
    let html = `<div class="chosen">${slot(r.boots, 0, true)}${Array.from({ length: ITEM_SLOTS }, (_, i) => slot(r.items[i], i + 1)).join('')}</div>`;
    html += `<div class="legend">Tam build: ayakkabı + 5 item. <b>★ ÖNERİLEN</b> profesyonellerin bu sınıfta kurduğu çekirdek, <b>ALTERNATİF</b> duruma göre alınanlar. Diğerlerini de seçebilirsin, savaşta etkisini görürsün.</div>`;
    html += `<div class="cat-title">Ayakkabı</div><div class="item-grid">${all.filter(it => it.cat === 'boots').map(tile).join('')}</div>`;
    html += `<div class="cat-title">★ ${D.CLASS_NAMES[D.classOf(r.champ)]} için</div><div class="item-grid">${recList.map(tile).join('')}</div>`;
    for (const cat in D.ITEM_CATS) {
      if (cat === 'boots') continue;
      const list = all.filter(it => it.cat === cat && !recSet.has(it.id) && !altSet.has(it.id));
      if (list.length) html += `<div class="cat-title">${D.ITEM_CATS[cat]}</div><div class="item-grid">${list.map(tile).join('')}</div>`;
    }
    $('loBody').innerHTML = html;
  }

  function renderRunesTab(r) {
    const b = D.buildFor(r.champ);
    const primaryTree = S.keystones[r.keystone] ? S.keystones[r.keystone].tree : null;
    const trees = S.runes.filter(t => t.slots[0].runes.some(k => D.KEYSTONES[k.id]));
    let html = `<div class="cat-title" style="margin-top:0">Ana rün</div><div class="trees">`;
    for (const t of trees) {
      html += `<div class="tree${primaryTree === t.id ? ' on' : ''}"><h4><img src="${runeIcon(t.icon)}" alt="">${esc(t.name)}</h4>`;
      for (const k of t.slots[0].runes) {
        if (!D.KEYSTONES[k.id]) continue;
        html += `<button type="button" class="ks${r.keystone === k.id ? ' on' : ''}${b.keystone === k.id ? ' rec' : ''}" data-ks="${k.id}"><img src="${runeIcon(k.icon)}" alt=""><span>${esc(k.name)}</span></button>`;
      }
      html += '</div>';
    }
    html += '</div>';
    const ks = S.keystones[r.keystone];
    if (ks) html += `<div class="rune-desc"><b>${esc(ks.name)}:</b> ${esc(D.KEYSTONES[ks.id])}</div>`;
    html += `<div class="cat-title">İkincil yol</div><div class="secs">`;
    for (const id in D.SECONDARY) {
      if (+id === primaryTree) continue;
      const t = S.trees[id];
      if (!t) continue;
      html += `<button type="button" class="sec${r.secondary === +id ? ' on' : ''}" data-sec="${id}"><img src="${runeIcon(t.icon)}" alt=""><div><b>${esc(t.name)}${b.secondary === +id ? ' <span style="color:var(--gold)">★</span>' : ''}</b><span>${esc(D.SECONDARY[id].desc)}</span></div></button>`;
    }
    html += '</div>';
    $('loBody').innerHTML = html;
  }

  function renderSkinTab(r, det) {
    if (!det) { $('loBody').innerHTML = '<div class="muted">Kostümler yükleniyor…</div>'; return; }
    const cur = r.skin || 0;
    $('loBody').innerHTML = `<div class="cat-title" style="margin-top:0">${esc(r.champ.name)} · ${det.skins.length} kostüm</div>
      <div class="skin-grid">${det.skins.map(s => `<button type="button" class="skin${s.num === cur ? ' on' : ''}" data-skin="${s.num}">
        <img src="${loadingArt(r.champ, s.num)}" alt="" loading="lazy"><b>${esc(s.name)}</b></button>`).join('')}</div>
      <div class="cat-title"><button type="button" class="btn ghost small" data-skin="rand">🎲 Takıma rastgele kostüm</button></div>`;
  }

  function renderSummTab(r) {
    const b = D.buildFor(r.champ);
    let html = `<div class="cat-title" style="margin-top:0">2 sihirdar büyüsü seç</div><div class="summ-grid">`;
    for (const id in S.summ) {
      const s = S.summ[id];
      html += `<button type="button" class="summ${r.summs.includes(id) ? ' on' : ''}${b.summ.includes(id) ? ' rec' : ''}" data-summ="${id}"><img src="${summIcon(id)}" alt=""><div><b>${esc(s.name)}</b><span>${esc(D.SUMMONERS[id])}</span></div></button>`;
    }
    html += '</div>';
    $('loBody').innerHTML = html;
  }

  document.addEventListener('click', e => { const b = e.target.closest('[data-vo-play]'); if (b) playVO(S.champs[b.dataset.voPlay]); });
  $('loTabs').addEventListener('click', e => {
    const t = e.target.closest('.tab');
    if (t) { S.loTab = t.dataset.tab; renderLoadout(); }
  });
  $('loBody').addEventListener('click', e => {
    const r = S.team.roster[S.loIdx];
    const it = e.target.closest('.item');
    const rm = e.target.closest('[data-rm]');
    const ks = e.target.closest('[data-ks]');
    const sec = e.target.closest('[data-sec]');
    const sm = e.target.closest('[data-summ]');
    const sk = e.target.closest('[data-skin]');
    if (sk) {
      if (sk.dataset.skin === 'rand') {
        Promise.all(S.team.roster.map(x => detail(x.champ.id))).then(ds => { S.team.roster.forEach((x, i) => { const l = ds[i].skins; x.skin = l[Math.floor(Math.random() * l.length)].num; }); renderLoadout(); });
        return;
      }
      r.skin = +sk.dataset.skin;
      renderLoadout();
      return;
    }
    if (it && !it.disabled) {
      const id = +it.dataset.id;
      if (M.ITEMS[id].cat === 'boots') r.boots = r.boots === id ? null : id;
      else {
        const i = r.items.indexOf(id);
        if (i >= 0) r.items.splice(i, 1);
        else if (r.items.length < ITEM_SLOTS) r.items.push(id);
      }
    } else if (rm) {
      const id = +rm.dataset.rm;
      if (r.boots === id) r.boots = null; else r.items = r.items.filter(x => x !== id);
    } else if (ks) {
      r.keystone = +ks.dataset.ks;
      if (S.keystones[r.keystone].tree === r.secondary) r.secondary = +Object.keys(D.SECONDARY).find(id => +id !== r.secondary);
    } else if (sec) {
      r.secondary = +sec.dataset.sec;
    } else if (sm) {
      const id = sm.dataset.summ;
      if (r.summs.includes(id)) r.summs = r.summs.filter(x => x !== id);
      else { r.summs.push(id); if (r.summs.length > 2) r.summs.shift(); }
    } else return;
    renderLoadout();
  });
  $('loSteps').addEventListener('click', e => {
    const b = e.target.closest('.step');
    if (b) { S.loIdx = +b.dataset.i; renderLoadout(); }
  });
  $('slots').addEventListener('click', e => {
    const b = e.target.closest('.slot');
    if (b && $('loadout').classList.contains('active') && S.team.roster[+b.dataset.i]) { S.loIdx = +b.dataset.i; renderLoadout(); }
  });
  $('recOne').addEventListener('click', () => { const r = S.team.roster[S.loIdx]; Object.assign(r, defaultLoadout(r.champ, r.role)); renderLoadout(); });
  $('recAll').addEventListener('click', () => {
    for (const r of S.team.roster) {
      const d = defaultLoadout(r.champ, r.role);
      if (!r.boots) r.boots = d.boots;
      for (const id of [...d.items, ...D.buildFor(r.champ).alt]) if (r.items.length < ITEM_SLOTS && !r.items.includes(id)) r.items.push(id);
      if (!r.keystone) r.keystone = d.keystone;
      if (!r.secondary) r.secondary = d.secondary;
      if (r.summs.length < 2) r.summs = d.summs;
    }
    renderLoadout();
  });
  lineup.addEventListener('click', e => {
    if (e.target.closest('#nextChamp')) {
      const next = S.team.roster.findIndex((x, i) => i !== S.loIdx && !complete(x));
      if (next >= 0) { S.loIdx = next; renderLoadout(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    }
    if (e.target.closest('#startTour')) startTournament();
  });

  // ---------- 4. turnuva ----------
  function aiTeam(name, tag, color) {
    const used = new Set();
    const roster = D.ROLES.map(role => {
      const pool = D.ROLE_POOLS[role].filter(id => S.champs[id] && !used.has(id));
      let id = pool[Math.floor(Math.random() * pool.length)];
      // pro draft: rolde pro maçlarda sık seçilenleri ağırlıkla al
      const pp = window.MayhemPro && window.MayhemPro.pool[role];
      if (pp && Math.random() < 0.85) {
        const cand = Object.entries(pp).filter(([c]) => S.champs[c] && !used.has(c));
        const tot = cand.reduce((t, [, n]) => t + n, 0);
        let r = Math.random() * tot;
        for (const [c, n] of cand) { r -= n; if (r <= 0) { id = c; break; } }
      }
      used.add(id);
      const champ = S.champs[id];
      const lo = defaultLoadout(champ, role);
      const b = D.buildFor(champ);
      if (Math.random() < 0.5 && b.alt.length) lo.items[4] = shuffle(b.alt).find(x => !lo.items.includes(x)) || lo.items[4];
      if (Math.random() < 0.35 && b.alt.length > 1) lo.items[3] = shuffle(b.alt).find(x => !lo.items.includes(x)) || lo.items[3];
      return { role, champ, ...lo };
    });
    return { name, tag, color, roster };
  }

  async function startTournament() {
    const colors = shuffle(COLORS.filter(c => c !== S.team.color));
    const names = shuffle(AI_TEAMS).slice(0, 7);
    const teams = shuffle([S.team, ...names.map(([n, t], i) => aiTeam(n, t, colors[i % colors.length]))]);
    S.tour = {
      teams,
      rounds: [[0, 1, 2, 3].map(i => ({ a: teams[i * 2], b: teams[i * 2 + 1], wins: [0, 0], winner: null }))],
      round: 0, alive: true, champion: null, path: [], stats: {}
    };
    S.team.roster.forEach(r => { S.tour.stats[r.champ.id] = { k: 0, d: 0, a: 0, dmg: 0, heal: 0 }; });
    renderBracket();
    show('bracketScreen');
    await Promise.all(teams.flatMap(t => t.roster.map(r => detail(r.champ.id))));
  }

  const simTeam = t => ({
    name: t.name, color: t.color,
    roster: t.roster.map(r => {
      const det = S.detail[r.champ.id] || {};
      return { champ: r.champ, role: r.role, skin: r.skin || 0, items: [r.boots, ...r.items].filter(Boolean), keystone: r.keystone, secondary: r.secondary, summs: r.summs, ultName: det.ultName || 'Ulti', ultIcon: det.ultIcon };
    })
  });

  function playSeriesHeadless(m, bo) {
    const need = Math.ceil(bo / 2);
    while (m.wins[0] < need && m.wins[1] < need) {
      const sim = new M.Sim([simTeam(m.a), simTeam(m.b)]);
      m.wins[sim.runHeadless()]++;
    }
    m.winner = m.wins[0] > m.wins[1] ? m.a : m.b;
  }

  function finishRound() {
    const T = S.tour;
    const round = T.rounds[T.round];
    for (const m of round) if (!m.winner) playSeriesHeadless(m, BEST_OF[T.round]);
    if (!round.some(m => m.winner === S.team)) T.alive = false;
    if (T.round === 2) { T.champion = round[0].winner; return; }
    const w = round.map(m => m.winner);
    T.rounds.push(w.reduce((acc, t, i) => (i % 2 ? acc : acc.concat({ a: t, b: w[i + 1], wins: [0, 0], winner: null })), []));
    T.round++;
  }

  function userMatch() {
    const T = S.tour;
    return T.rounds[T.round].find(m => !m.winner && (m.a === S.team || m.b === S.team));
  }

  function renderBracket() {
    const T = S.tour;
    const cols = [4, 2, 1].map((n, ri) => {
      const round = T.rounds[ri];
      const cards = [];
      for (let i = 0; i < n; i++) {
        const m = round && round[i];
        if (!m) { cards.push('<div class="match"><div class="mrow tbd">Belli değil</div><div class="mrow tbd">Belli değil</div></div>'); continue; }
        const row = (t, w) => `<div class="mrow${m.winner ? (m.winner === t ? ' w' : ' l') : ''}">${teamBadge(t, true)}<span class="n">${esc(t.name)}</span><span class="s">${m.winner || w ? w : ''}</span></div>`;
        cards.push(`<div class="match${m.a === S.team || m.b === S.team ? ' me' : ''}">${row(m.a, m.wins[0])}${row(m.b, m.wins[1])}</div>`);
      }
      return `<div class="round-col"><h3>${ROUND_NAMES[ri]} · ${BEST_OF[ri] === 1 ? 'Tek maç' : 'Bo' + BEST_OF[ri]}</h3>${cards.join('')}</div>`;
    });
    cols.push(`<div class="round-col"><h3>Şampiyon</h3><div class="trophy"><div class="cup">🏆</div><b>${T.champion ? esc(T.champion.name) : '?'}</b></div></div>`);
    $('bracket').innerHTML = cols.join('');
    $('bracketStage').textContent = T.champion ? 'Turnuva bitti' : !T.alive ? 'Elendin' : ROUND_NAMES[T.round];

    const m = !T.champion && T.alive ? userMatch() : null;
    if (m) {
      const opp = m.a === S.team ? m.b : m.a;
      const icons = t => `<div class="icons">${t.roster.map(r => `<img src="${icon(r.champ)}" alt="${esc(r.champ.name)}" title="${esc(r.champ.name)} · ${D.CLASS_NAMES[D.classOf(r.champ)]}">`).join('')}</div>`;
      $('nextMatch').innerHTML = `
        <div class="next-card">
          <div class="side"><div class="tname">${teamBadge(S.team)}${esc(S.team.name)}</div>${icons(S.team)}</div>
          <div class="vs-big">VS<small>${ROUND_NAMES[T.round].toLocaleUpperCase('tr')} · ${BEST_OF[T.round] === 1 ? 'TEK MAÇ' : `${BEST_OF[T.round]} MAÇTA ${Math.ceil(BEST_OF[T.round] / 2)}`}</small></div>
          <div class="side r"><div class="tname">${teamBadge(opp)}${esc(opp.name)}</div>${icons(opp)}</div>
        </div>
        <div class="center-actions"><button class="btn ghost" id="editLoadout">Dizilimi düzenle</button><button class="btn" id="playMatch">Maça çık ⚔</button></div>`;
    } else if (!T.champion) {
      $('nextMatch').innerHTML = '<div class="center-actions"><button class="btn" id="simRest">Turnuvanın kalanını oynat</button></div>';
    } else {
      $('nextMatch').innerHTML = '<div class="center-actions"><button class="btn" id="toEnd">Turnuva özeti →</button></div>';
    }
  }

  $('bracketScreen').addEventListener('click', async e => {
    if (e.target.closest('#playMatch')) {
      e.target.closest('#playMatch').disabled = true;
      await Promise.all(S.tour.teams.flatMap(t => t.roster.map(r => detail(r.champ.id))));
      // rakip takımlar kostüm giyer
      for (const t of S.tour.teams) if (t !== S.team) for (const r of t.roster) if (r.skin === undefined) { const l = S.detail[r.champ.id].skins; r.skin = Math.random() < 0.8 ? l[Math.floor(Math.random() * l.length)].num : 0; }
      startSeries();
    }
    if (e.target.closest('#editLoadout')) {
      S.loIdx = 0; S.loTab = 'items'; S.editing = true;
      renderLoadout(); show('loadout');
      $('lineupAction').innerHTML = '<button class="btn" id="backToBracket">Fikstüre dön →</button>';
    }
    if (e.target.closest('#simRest')) { while (!S.tour.champion) finishRound(); renderBracket(); }
    if (e.target.closest('#toEnd')) renderEnd();
  });
  lineup.addEventListener('click', e => {
    if (e.target.closest('#backToBracket')) {
      if (!S.team.roster.every(complete)) return;
      S.editing = false;
      renderBracket(); show('bracketScreen');
    }
  });
  const origRenderLoadout = renderLoadout;
  renderLoadout = function () {
    origRenderLoadout();
    if (S.editing && S.tour) $('lineupAction').innerHTML = `<button class="btn" id="backToBracket" ${S.team.roster.every(complete) ? '' : 'disabled'}>Fikstüre dön →</button>`;
  };

  // ---------- 5. savaş ----------
  let series = null, viewer = null, multi = {};
  // Maçtaki takımlar (taraf sırasıyla), bizim tarafımız ve online oturum
  let G = { teams: [], mySide: 0, online: null };
  const sideTeam = side => G.teams[side] || { name: '', color: '#94a3b8', tag: '' };

  function startSeries() {
    const m = userMatch();
    const opp = m.a === S.team ? m.b : m.a;
    series = { m, opp, bo: BEST_OF[S.tour.round], wins: [0, 0], game: 0 };
    loadingScreen(() => { show('battle'); startGame(); });
  }

  function loadingScreen(done) {
    const teams = [S.team, series.opp];
    let n = 0;
    const card = (t, r) => {
      const ks = S.keystones[r.keystone];
      const det = S.detail[r.champ.id] || {};
      return `<div class="ls-card" style="--c:${t.color};animation-delay:${(n++) * 0.07}s">
        <div class="ls-art" style="background-image:url('${loadingArt(r.champ, r.skin)}')"></div>
        <div class="ls-meta"><b>${esc(r.champ.name)}</b><small>${D.ROLE_NAMES[r.role]}</small>
          <div class="ls-icons">${r.summs.map(x => `<img src="${summIcon(x)}" alt="">`).join('')}${ks ? `<img class="rn" src="${runeIcon(ks.icon)}" alt="">` : ''}${det.ultIcon ? `<img src="${det.ultIcon}" alt="">` : ''}</div>
        </div>
      </div>`;
    };
    const row = t => `<div class="ls-team"><div class="ls-head">${teamBadge(t)}<b>${esc(t.name)}</b></div><div class="ls-row">${t.roster.map(r => card(t, r)).join('')}</div></div>`;
    const bo = series.bo === 1 ? 'Tek maç' : `${series.bo} maçta ${Math.ceil(series.bo / 2)}`;
    $('overlayHost').innerHTML = `<div class="loadscreen" id="loadscreen">${row(teams[0])}<div class="ls-vs"><span>VS</span><small>${ROUND_NAMES[S.tour.round]} · ${bo}</small><i class="ls-bar"><em></em></i><small class="muted">Başlamak için tıkla</small></div>${row(teams[1])}</div>`;
    let fired = false;
    const go = () => { if (fired) return; fired = true; closeOverlay(); done(); };
    $('loadscreen').addEventListener('click', go);
    setTimeout(go, 5000);
  }

  function hudCard(u, side, i) {
    const det = S.detail[u.champ.id] || {};
    const col = sideTeam(u.side).color;
    return `<div class="pc" style="--c:${col}" data-uid="${u.uid}">
      <div class="por"><img src="${portrait(u.champ, u.skin)}" data-fb="${icon(u.champ)}"${porStyle(u.skin)} alt=""><span class="lv">${M.LEVEL}</span><span class="cdt"></span></div>
      <div style="min-width:0">
        <div class="nm"><span>${esc(u.champ.name)}</span><em class="kda">0/0/0</em></div>
        <div class="hp"><i></i><b></b></div>
        <div class="row">
          <button class="ultbtn" type="button" data-ult="${u.uid}" title="${esc(det.ultName || 'Ulti')}"><img src="${det.ultIcon || icon(u.champ)}" alt=""><span class="key">${side ? 'R' : i + 1}</span></button>
          ${u.summs.map(s => `<img class="sm" data-s="${s}" src="${summIcon(s)}" alt="">`).join('')}
        </div>
      </div>
    </div>`;
  }

  function startGame() {
    series.game++;
    multi = {};
    vo.played = new Set();
    const sim = new M.Sim([simTeam(S.team), simTeam(series.opp)], { manual: [!S.autoUlt, false] });
    G = { teams: [S.team, series.opp], mySide: 0, online: null };
    setupBattle(sim, series.bo === 1 ? `${ROUND_NAMES[S.tour.round]} · Tek maç` : `${ROUND_NAMES[S.tour.round]} · Maç ${series.game} · ${series.wins[0]}-${series.wins[1]}`, {});
  }

  function setupBattle(sim, label, extra) {
    const me = G.mySide, op = 1 - me;
    const tA = sideTeam(me), tB = sideTeam(op);
    $('sbA').innerHTML = `${teamBadge(tA)}<span class="tn">${esc(tA.name)}</span><span class="obj" id="oA"></span><span class="k" id="kA">0</span>`;
    $('sbB').innerHTML = `${teamBadge(tB)}<span class="tn">${esc(tB.name)}</span><span class="obj" id="oB"></span><span class="k" id="kB">0</span>`;
    $('sbSeries').textContent = label;
    $('hudA').innerHTML = sim.units.filter(u => u.side === me && !u.isPet).map((u, i) => hudCard(u, 0, i)).join('');
    $('hudB').innerHTML = sim.units.filter(u => u.side === op && !u.isPet).map((u, i) => hudCard(u, 1, i)).join('');
    $('killfeed').innerHTML = '';
    $('fxHost').innerHTML = '';
    const online = !!G.online;
    document.querySelectorAll('#speed button').forEach(b => { b.disabled = online && b.dataset.s !== '1'; });
    $('skip').hidden = online;
    if (online) setSpeed(1);
    if (viewer) viewer.stop();
    viewer = new R.Viewer($('arena'), sim, {
      colors: G.teams.map(t => t.color),
      speed: online ? 1 : S.speed,
      mySide: me,
      gate: extra.gate,
      assets: {
        img,
        iconImg: u => {
          if (u.isPet && u.petIcon) return img(u.petIcon);
          const p = img(portrait(u.champ, u.skin));
          return u.skin && p.complete && !p.naturalWidth ? img(icon(u.champ)) : p;
        },
        summIcon, itemIcon
      },
      hooks: { onEnd: extra.onEnd || onGameEnd, onUlt: callout, onKill: onKill, onFrame: extra.onFrame ? (s, dt) => { extra.onFrame(s, dt); hudTick(s, dt); } : hudTick, onObjective, focus: extra.focus }
    });
    hudT = 0;
  }

  let hudT = 0;
  function hudTick(sim, dt) {
    hudT -= dt;
    if (hudT > 0) return;
    hudT = 0.1;
    $('kA').textContent = sim.kills[G.mySide];
    $('kB').textContent = sim.kills[1 - G.mySide];
    const t = Math.min(M.GAME_LEN, Math.floor(sim.t));
    $('sbClock').textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} / ${Math.floor(M.GAME_LEN / 60)}:00`;
    const drk = s => (sim.drakeTypes ? sim.drakeTypes[s] : []).map(k => { const d = M.DRAKES.find(x => x.k === k); return `<em class="drk" style="--dc:${d.color}" title="${d.name}"></em>`; }).join('') + (sim.souls && sim.souls[s] ? `<em class="drk soul" style="--dc:${M.DRAKES.find(x => x.k === sim.souls[s]).color}" title="${M.DRAKES.find(x => x.k === sim.souls[s]).sname}">✦</em>` : '');
    const obj = s => `<i style="--oc:#94a3b8" title="Yıkılan kule">${sim.towersDown[s]}</i><i style="--oc:#f97316" title="Ejder">${sim.drakes[s]}${drk(s)}</i><i style="--oc:#a855f7" title="Baron">${sim.barons[s]}</i><i style="--oc:#facc15" title="Altın">${(sim.gold[s] / 1000).toFixed(1)}k</i>`;
    $('oA').innerHTML = obj(G.mySide);
    $('oB').innerHTML = obj(1 - G.mySide);
    for (const u of sim.units) {
      if (u.isPet) continue;
      const el = document.querySelector(`.pc[data-uid="${u.uid}"]`);
      if (!el) continue;
      el.classList.toggle('dead', u.dead);
      const total = Math.max(u.maxHp, u.hp + sim.shieldOf(u));
      el.querySelector('.hp i').style.width = `${Math.max(0, u.hp) / total * 100}%`;
      const b = el.querySelector('.hp b');
      b.style.left = `${Math.max(0, u.hp) / total * 100}%`;
      b.style.width = `${sim.shieldOf(u) / total * 100}%`;
      el.querySelector('.kda').textContent = `${u.kills}/${u.deaths}/${u.assists}`;
      el.querySelector('.cdt').textContent = u.dead && u.reviveAt ? Math.ceil(u.reviveAt - sim.t) : '';
      const ub = el.querySelector('.ultbtn');
      ub.style.setProperty('--p', Math.min(100, u.energy));
      ub.classList.toggle('ready', u.energy >= 100 && !u.dead);
      el.querySelectorAll('.sm').forEach(s => s.classList.toggle('cd', u.summCd[s.dataset.s] > sim.t));
    }
  }

  function callout(u) {
    if (!vo.played.has(u.uid) && playVO(u.champ, 'choose', u.side === G.mySide ? 0.6 : 0.45, false)) vo.played.add(u.uid);
    const det = S.detail[u.champ.id] || {};
    const col = (u.ult[1] && u.ult[1].color) || '#f0d48a';
    const name = u.stolenName && u.ult[0] === 'steal' ? u.stolenName : det.ultName || 'Ulti';
    const el = document.createElement('div');
    el.className = `callout ${u.side === G.mySide ? 'l' : 'r'}`;
    el.style.setProperty('--c', col);
    el.innerHTML = `<div class="face" style="background-image:url('${splashArt(u.champ, u.skin)}')"></div><img class="uicon" src="${det.ultIcon || icon(u.champ)}" alt=""><div><div class="cn">${esc(u.champ.name.toLocaleUpperCase('tr'))}</div><div class="un">${esc(name)}</div></div>`;
    $('fxHost').querySelectorAll(`.callout.${u.side === G.mySide ? 'l' : 'r'}`).forEach(x => x.remove());
    $('fxHost').appendChild(el);
    setTimeout(() => el.remove(), 1750);
  }

  function announce(text, sub, color) {
    const el = document.createElement('div');
    el.className = 'announce';
    el.style.setProperty('--c', color);
    el.innerHTML = `<b>${esc(text)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}`;
    $('fxHost').querySelectorAll('.announce').forEach(x => x.remove());
    $('fxHost').appendChild(el);
    setTimeout(() => el.remove(), 2300);
  }

  function onKill(e) {
    const { killer, victim } = e;
    const sim = viewer.sim;
    const col = sideTeam(killer.side).color;
    const vcol = sideTeam(victim.side).color;
    const el = document.createElement('div');
    el.className = 'kf';
    el.innerHTML = `<img src="${icon(killer.champ)}" style="--c:${col}" alt=""><span class="sw">⚔</span><img src="${icon(victim.champ)}" style="--c:${vcol}" alt="">`;
    const feed = $('killfeed');
    feed.prepend(el);
    while (feed.children.length > 6) feed.lastChild.remove();
    setTimeout(() => el.remove(), 5000);

    const m = multi[killer.uid] && sim.t - multi[killer.uid].t < 8 ? multi[killer.uid] : { n: 0 };
    m.n++; m.t = sim.t;
    multi[killer.uid] = m;
    const ace = sim.champs(victim.side).every(u => u.dead);
    const names = ['', '', 'ÇİFTE SKOR!', 'ÜÇLÜ SKOR!', 'DÖRTLÜ SKOR!', 'PENTAKILL!'];
    const sprees = { 3: 'KATLİAM YAPIYOR!', 4: 'KUDURMUŞ!', 5: 'DURDURULAMAZ!', 6: 'TANRI GİBİ!', 7: 'EFSANEVİ!' };
    if (m.n >= 2) announce(names[Math.min(5, m.n)], killer.champ.name, col);
    else if (e.shutdown) announce('SONLANDIRMA!', `${killer.champ.name} · +${300 + e.shutdown} altın`, col);
    else if (e.first) announce('İLK KAN!', `${killer.champ.name} → ${victim.champ.name}`, col);
    else if (ace) announce('AS!', sideTeam(killer.side).name, col);
    else if (e.spree >= 3) announce(sprees[Math.min(7, e.spree)], killer.champ.name, col);
  }

  function onObjective(e) {
    const m = e.m;
    if (e.kind === 'tower' || e.kind === 'nexus') {
      const team = sideTeam(e.side);
      announce(e.kind === 'nexus' ? 'NEXUS YIKILDI!' : 'KULE YIKILDI', `${team.name}${e.u ? ' · ' + e.u.champ.name : ''}`, team.color);
      return;
    }
    if (e.kind === 'spawn') {
      if (m.key === 'baron') announce('BARON NASHOR', 'Nehrin üstünde uyandı', m.color);
      else if (m.key === 'herald') announce('VADİNİN ALAMETİ', 'Nehrin üstünde belirdi', m.color);
      else announce(m.name.toLocaleUpperCase('tr'), 'Nehrin altında belirdi', m.color);
      return;
    }
    if (e.kind === 'despawn') return;
    const team = sideTeam(e.side);
    if (e.kind === 'soul') { setTimeout(() => announce(e.soul.sname.toLocaleUpperCase('tr') + '!', `${team.name} ejder ruhunu kazandı`, e.soul.color), 2400); return; }
    announce(m.key === 'baron' ? 'BARON ALINDI!' : m.key === 'herald' ? 'ALAMET ALINDI!' : `${m.name.toLocaleUpperCase('tr')} ALINDI!`, `${team.name} · ${e.u.champ.name}`, m.key === 'herald' || m.key === 'baron' ? team.color : m.color);
  }

  $('hudA').addEventListener('click', e => {
    const b = e.target.closest('.ultbtn');
    if (b && viewer) askUlt(+b.dataset.ult);
  });
  document.addEventListener('keydown', e => {
    if (!$('battle').classList.contains('active') || !viewer) return;
    if (e.key >= '1' && e.key <= '5') {
      const u = viewer.sim.units.filter(x => x.side === G.mySide && !x.isPet)[+e.key - 1];
      if (u) askUlt(u.uid);
    }
    if (e.key === ' ' && !G.online) { e.preventDefault(); setSpeed(viewer.speed ? 0 : (S.speed || 1)); }
  });
  function setSpeed(s) {
    if (s && !G.online) S.speed = s;
    if (viewer) viewer.speed = s;
    document.querySelectorAll('#speed button').forEach(x => x.classList.toggle('on', +x.dataset.s === s));
  }
  $('speed').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) setSpeed(+b.dataset.s);
  });
  $('autoUlt').addEventListener('change', e => {
    S.autoUlt = e.target.checked;
    if (!viewer) return;
    if (G.online) G.online.cmd({ type: 'manual', side: G.mySide, on: !S.autoUlt });
    else viewer.sim.manual[0] = !S.autoUlt;
  });
  function askUlt(uid) { if (G.online) G.online.cmd({ type: 'ult', uid }); else viewer.sim.requestUlt(uid); }
  $('skip').addEventListener('click', () => viewer && !G.online && viewer.skip());

  function recordStats(sim) {
    for (const u of sim.units) {
      if (u.side !== 0 || u.isPet) continue;
      const s = S.tour.stats[u.champ.id];
      s.k += u.kills; s.d += u.deaths; s.a += u.assists; s.dmg += u.dmg; s.heal += u.heal;
    }
  }

  function statTable(sim, teams) {
    const list = sim.units.filter(u => !u.isPet && !u.isMonster);
    const maxDmg = Math.max(...list.map(u => u.dmg), 1);
    const winners = list.filter(u => u.side === sim.winner);
    const score = u => u.dmg + u.kills * 600 + u.assists * 250 + u.heal * 0.6 + u.cc * 150;
    const mvp = winners.reduce((b, u) => (score(u) > score(b) ? u : b), winners[0]);
    const rows = list.map((u, i) => `
      <tr class="${i === 5 ? 'sep' : ''}">
        <td><div class="who" style="--c:${teams[u.side].color}"><img src="${portrait(u.champ, u.skin)}" data-fb="${icon(u.champ)}"${porStyle(u.skin)} alt=""><span>${esc(u.champ.name)}${u === mvp ? '<span class="mvp-tag">MVP</span>' : ''}</span></div></td>
        <td class="num">${u.kills}/${u.deaths}/${u.assists}</td>
        <td class="num">${fmt(u.dmg)}</td>
        <td style="width:24%"><div class="dbar" style="--c:${teams[u.side].color};width:${u.dmg / maxDmg * 100}%"></div></td>
        <td class="num">${fmt(u.heal)}</td>
        <td class="num">${u.cc.toFixed(1)} sn</td>
      </tr>`).join('');
    return `<table class="stat-table"><thead><tr><th>Şampiyon</th><th>S/Ö/A</th><th>Hasar</th><th></th><th>İyileştirme</th><th>Kontrol</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  const overlay = html => { $('overlayHost').innerHTML = `<div class="overlay"><div class="modal">${html}</div></div>`; };
  const closeOverlay = () => { $('overlayHost').innerHTML = ''; };

  function onGameEnd(sim) {
    recordStats(sim);
    series.wins[sim.winner]++;
    const need = Math.ceil(series.bo / 2);
    const over = series.wins[0] >= need || series.wins[1] >= need;
    const won = sim.winner === 0;
    const teams = [S.team, series.opp];
    let title, sub, btn;
    if (!over) {
      title = won ? '<span class="res-win">Maçı aldın!</span>' : '<span class="res-lose">Maçı kaybettin</span>';
      sub = `Seri: ${esc(S.team.tag)} ${series.wins[0]} - ${series.wins[1]} ${esc(series.opp.tag)}`;
      btn = '<button class="btn" id="nextGame">Sonraki maç →</button>';
    } else {
      const seriesWon = series.wins[0] > series.wins[1];
      const isFinal = S.tour.round === 2;
      title = seriesWon && isFinal ? '<span class="res-win">ŞAMPİYONSUN! 🏆</span>' : seriesWon ? `<span class="res-win">${ROUND_NAMES[S.tour.round]} geçildi!</span>` : '<span class="res-lose">Elendin</span>';
      sub = series.bo === 1 ? `${esc(teams[sim.winner].name)} ${sim.byNexus ? 'Nexus\'u yıkarak' : `${sim.kills[sim.winner]}-${sim.kills[1 - sim.winner]} skorla`} kazandı.` : `Seri sonucu: ${esc(S.team.tag)} ${series.wins[0]} - ${series.wins[1]} ${esc(series.opp.tag)}`;
      btn = `<button class="btn" id="seriesDone">${seriesWon && isFinal ? 'Kupayı al →' : 'Fikstüre dön →'}</button>`;
    }
    overlay(`
      <div class="eyebrow">${ROUND_NAMES[S.tour.round]}${series.bo > 1 ? ` · Maç ${series.game}` : ''} · ${esc(S.team.tag)} ${sim.kills[0]} - ${sim.kills[1]} ${esc(series.opp.tag)} · Ejder ${sim.drakes[0]}-${sim.drakes[1]} · Baron ${sim.barons[0]}-${sim.barons[1]}</div>
      <h2>${title}</h2>
      <div class="muted">${sub}</div>
      ${statTable(sim, teams)}
      <div class="center-actions">${btn}</div>`);
  }

  $('overlayHost').addEventListener('click', e => {
    if (e.target.closest('#nextGame')) { closeOverlay(); startGame(); }
    if (e.target.closest('#seriesDone')) {
      closeOverlay();
      if (viewer) { viewer.stop(); viewer = null; }
      const T = S.tour, m = series.m;
      m.wins = m.a === S.team ? [series.wins[0], series.wins[1]] : [series.wins[1], series.wins[0]];
      const won = series.wins[0] > series.wins[1];
      m.winner = won ? S.team : series.opp;
      T.path.push({ round: T.round, opp: series.opp, score: series.wins.slice(), won });
      finishRound();
      if (T.champion === S.team) { renderEnd(); return; }
      renderBracket();
      show('bracketScreen');
    }
  });

  // ---------- 6. son ----------
  let renderEnd = function () {
    const T = S.tour;
    const won = T.champion === S.team;
    const lastRound = T.path.length ? T.path[T.path.length - 1].round : 0;
    const stageText = ['Çeyrek finalde', 'Yarı finalde', 'Finalde'][lastRound];
    const entries = S.team.roster.map(r => ({ r, s: T.stats[r.champ.id] }));
    const score = e => e.s.dmg + e.s.k * 600 + e.s.a * 250 + e.s.heal * 0.6;
    const mvp = entries.reduce((b, e) => (score(e) > score(b) ? e : b), entries[0]);
    const hero = won
      ? `<div class="cup">🏆</div><div class="eyebrow">Mayhem Ligi şampiyonu</div><h1>${esc(S.team.name)}</h1><p>Bütün rakipleri devirdin. Kupa senin.</p>`
      : `<div class="cup">${lastRound === 2 ? '🥈' : '⚔️'}</div><div class="eyebrow">Turnuva bitti</div><h1>${esc(S.team.name)}</h1><p>${stageText} elendin. Şampiyon: <b style="color:var(--text)">${esc(T.champion.name)}</b></p>`;
    const path = T.path.map(p => `<div class="p"><span class="r">${ROUND_NAMES[p.round]}</span>${teamBadge(p.opp, true)}<span>${esc(p.opp.name)}</span><span class="sc" style="color:${p.won ? 'var(--win)' : 'var(--lose)'}">${p.score[0]}-${p.score[1]}</span></div>`).join('');
    const rows = entries.map(e => `
      <tr>
        <td><div class="who" style="--c:${S.team.color}"><img src="${icon(e.r.champ)}" alt=""><span>${esc(e.r.champ.name)}${e === mvp ? '<span class="mvp-tag">MVP</span>' : ''}</span></div></td>
        <td class="num">${e.s.k}/${e.s.d}/${e.s.a}</td>
        <td class="num">${fmt(e.s.dmg)}</td>
        <td><div style="display:flex;gap:2px">${[e.r.boots, ...e.r.items].map(id => `<img src="${itemIcon(id)}" alt="" title="${esc(M.ITEMS[id].name)}" style="width:22px;height:22px;border-radius:3px">`).join('')}</div></td>
      </tr>`).join('');
    $('endWrap').innerHTML = `
      <div class="end-hero">${hero}</div>
      <div class="end-grid">
        <div class="mvp-card">
          <div class="art"><img src="${loadingArt(mvp.r.champ, mvp.r.skin)}" alt=""></div>
          <div class="body">
            <span class="chip gold">Turnuva MVP'si</span>
            <h3>${esc(mvp.r.champ.name)}</h3>
            <div class="stats">
              <div class="stat"><small>S / Ö / A</small><b>${mvp.s.k} / ${mvp.s.d} / ${mvp.s.a}</b></div>
              <div class="stat"><small>Toplam hasar</small><b>${fmt(mvp.s.dmg)}</b></div>
            </div>
          </div>
        </div>
        <div>
          <div class="cat-title" style="margin-top:0">Turnuva yolu</div>
          <div class="path">${path}</div>
          <div class="cat-title">Kadro istatistikleri</div>
          <table class="stat-table" style="margin-top:0"><thead><tr><th>Şampiyon</th><th>S/Ö/A</th><th>Hasar</th><th>Build</th></tr></thead><tbody>${rows}</tbody></table>
          <div class="center-actions" style="justify-content:flex-start">
            <button class="btn" id="againSame">Aynı kadroyla tekrar</button>
            <button class="btn ghost" id="newTeam">Yeni takım kur</button>
          </div>
        </div>
      </div>`;
    show('end');
    if (won) confetti();
  }

  function confetti() {
    const box = document.createElement('div');
    box.className = 'confetti';
    const cols = [S.team.color, '#f0d48a', '#ffffff', '#c8a14b'];
    box.innerHTML = Array.from({ length: 90 }, () => `<i style="left:${Math.random() * 100}%;background:${cols[Math.floor(Math.random() * cols.length)]};animation-duration:${2.5 + Math.random() * 3}s;animation-delay:${Math.random() * 1.5}s"></i>`).join('');
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 7000);
  }

  $('end').addEventListener('click', e => {
    if (e.target.closest('#againSame')) startTournament();
    if (e.target.closest('#newTeam')) {
      S.team = { name: S.team.name, tag: S.team.tag, color: S.team.color, roster: [] };
      updateIntro();
      show('intro');
    }
  });

  // =====================================================================
  // ---------- 7. profil, LP ve rank ----------
  const TIERS = [['iron', 'Demir'], ['bronze', 'Bronz'], ['silver', 'Gümüş'], ['gold', 'Altın'], ['platinum', 'Platin'], ['emerald', 'Zümrüt'], ['diamond', 'Elmas'], ['master', 'Usta'], ['grandmaster', 'Büyük Usta'], ['challenger', 'Şampiyonluk']];
  const DIVS = ['IV', 'III', 'II', 'I'];
  const START_LP = 800;
  const emblem = tier => `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-${tier}.png`;
  function rankOf(p) {
    p = Math.max(0, Math.round(p));
    if (p >= 3600) return { tier: 9, div: '', lp: p - 3600, key: 'challenger', name: 'Şampiyonluk', p };
    if (p >= 3200) return { tier: 8, div: '', lp: p - 3200, key: 'grandmaster', name: 'Büyük Usta', p };
    if (p >= 2800) return { tier: 7, div: '', lp: p - 2800, key: 'master', name: 'Usta', p };
    const tier = Math.floor(p / 400), d = Math.floor((p % 400) / 100);
    return { tier, div: DIVS[d], lp: p % 100, key: TIERS[tier][0], name: TIERS[tier][1], p };
  }
  const rankLabel = p => { const r = rankOf(p); return `${r.name}${r.div ? ' ' + r.div : ''}`; };
  function loadProfile() {
    let pr = null;
    try { pr = JSON.parse(localStorage.getItem('mayhemProfile') || 'null'); } catch (e) {}
    if (!pr || !pr.id) pr = { id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4), lp: START_LP, w: 0, l: 0, hist: [], solo: { tours: 0, titles: 0, best: 3 } };
    pr.solo = pr.solo || { tours: 0, titles: 0, best: 3 };
    return pr;
  }
  // ---------- hesaplar (Firebase: Auth + Firestore) ----------
  // Kullanıcı adı herkes arasında benzersiz; LP, geçmiş ve takım sunucuda tutulur. Eski yerel hesaplar ilk girişte buluta taşınır.
  const FB_CFG = { apiKey: 'AIzaSyCU_jIVX8qh-lXwdnZ-E6wXBKO18-9aq3Q', authDomain: 'mayhem-ligi.firebaseapp.com', projectId: 'mayhem-ligi', storageBucket: 'mayhem-ligi.firebasestorage.app', messagingSenderId: '572556858922', appId: '1:572556858922:web:0f6961f5d9cebe1b3dd553' };
  const FB = (() => { try { if (!window.firebase) return null; const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(FB_CFG); return { auth: app.auth(), db: app.firestore() }; } catch (e) { console.warn('firebase', e); return null; } })();
  const ACC = { list: {}, user: null, name: null, ready: !FB };
  try { ACC.list = JSON.parse(localStorage.getItem('mayhemAccounts') || '{}') || {}; } catch (e) { ACC.list = {}; }
  let GUEST = loadProfile();
  let PROFILE = GUEST;
  const PFIELDS = ['user', 'key', 'lp', 'w', 'l', 'hist', 'solo', 'team', 'id', 'created'];
  let saveChain = Promise.resolve();
  function cloudDoc(pr) {
    const d = {};
    for (const k of PFIELDS) if (pr[k] !== undefined) d[k] = pr[k];
    d.lp = Math.max(0, Math.round(d.lp || 0)); d.w = d.w | 0; d.l = d.l | 0;
    d.hist = (d.hist || []).slice(0, 30).map(h => ({ won: !!h.won, opp: String(h.opp || '').slice(0, 40), d: h.d | 0, at: h.at || 0 }));
    d.solo = d.solo || { tours: 0, titles: 0, best: 3 };
    d.team = d.team || null;
    d.ts = firebase.firestore.FieldValue.serverTimestamp();
    return d;
  }
  const saveProfile = () => {
    try {
      if (ACC.user && FB) {
        const uid = ACC.user, doc = cloudDoc(PROFILE);
        saveChain = saveChain.then(() => FB.db.collection('users').doc(uid).set(doc)).catch(async e => {
          console.warn('kayıt', e);
          // sunucu reddettiyse (hız/LP sınırı) sunucudaki hali geri yükle
          try { const snap = await FB.db.collection('users').doc(uid).get(); if (snap.exists && ACC.user === uid) { PROFILE = withDefaults(snap.data()); accountChanged(); } } catch (er) {}
        });
      } else localStorage.setItem('mayhemProfile', JSON.stringify(PROFILE));
    } catch (e) {}
  };
  saveProfile();
  const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  async function hashPw(pw, salt) {
    const enc = new TextEncoder();
    if (window.crypto && crypto.subtle) {
      const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
      return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256));
    }
    let h = 2166136261; for (const ch of salt + pw) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return 'f' + (h >>> 0).toString(16);
  }
  const userKey = u => u.trim().toLocaleLowerCase('tr');
  const validUser = u => /^[\p{L}\p{N}_. -]{3,16}$/u.test(u.trim());
  // Firebase e-posta ister: kullanıcı adından sabit, ASCII bir adres türet
  const emailFor = async u => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mhl:' + userKey(u)))).slice(0, 32) + '@mayhemligi.app';
  const withDefaults = d => ({ lp: START_LP, w: 0, l: 0, hist: [], solo: { tours: 0, titles: 0, best: 3 }, ...d, solo: d.solo || { tours: 0, titles: 0, best: 3 }, hist: d.hist || [] });
  function fbErr(e) {
    const c = (e && e.code) || '';
    if (/email-already-in-use/.test(c)) return 'Bu kullanıcı adı alınmış.';
    if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return 'Kullanıcı adı ya da şifre yanlış.';
    if (/too-many-requests/.test(c)) return 'Çok fazla deneme. Biraz bekleyip tekrar dene.';
    if (/network/.test(c)) return 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.';
    if (/weak-password/.test(c)) return 'Şifre en az 6 karakter olmalı.';
    return (e && e.message) || 'Bir şeyler ters gitti.';
  }
  const needFB = () => { if (!FB) throw new Error('Hesap sunucusuna ulaşılamadı. Sayfayı yenileyip tekrar dene.'); };
  async function register(user, pw, keepGuest, base) {
    needFB();
    const k = userKey(user);
    if (!validUser(user)) throw new Error('Kullanıcı adı 3-16 karakter olmalı (harf, rakam, boşluk, _ . -).');
    if (pw.length < 6) throw new Error('Şifre en az 6 karakter olmalı.');
    if ((await FB.db.collection('usernames').doc(k).get()).exists) throw new Error('Bu kullanıcı adı alınmış.');
    let cred;
    try { cred = await FB.auth.createUserWithEmailAndPassword(await emailFor(user), pw); } catch (e) { throw new Error(fbErr(e)); }
    const uid = cred.user.uid;
    const src = base || (keepGuest ? GUEST : { lp: START_LP, w: 0, l: 0, hist: [], solo: { tours: 0, titles: 0, best: 3 } });
    const profile = withDefaults({ ...JSON.parse(JSON.stringify(src)), id: (src.id && base) ? src.id : Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4), user: user.trim(), key: k, created: (base && base.created) || Date.now(), team: (base && base.team) || { name: S.team.name || $('teamName').value.trim(), tag: S.team.tag, color: S.team.color } });
    profile.lp = Math.min(profile.lp, 2400);
    try {
      const batch = FB.db.batch();
      batch.set(FB.db.collection('usernames').doc(k), { uid });
      batch.set(FB.db.collection('users').doc(uid), cloudDoc(profile));
      await batch.commit();
    } catch (e) {
      try { await cred.user.delete(); } catch (er) {}
      throw new Error('Bu kullanıcı adı alınmış.');
    }
    if (keepGuest && !base) { GUEST = { ...GUEST, lp: START_LP, w: 0, l: 0, hist: [] }; try { localStorage.setItem('mayhemProfile', JSON.stringify(GUEST)); } catch (e) {} }
    await loginAs(uid, profile);
  }
  async function login(user, pw) {
    needFB();
    try {
      const cred = await FB.auth.signInWithEmailAndPassword(await emailFor(user), pw);
      await loginAs(cred.user.uid);
    } catch (e) {
      // eski yerel hesap mı? şifresi doğruysa buluta taşı
      const a = ACC.list[userKey(user)];
      if (/invalid-credential|user-not-found|invalid-login/.test((e && e.code) || '') && a && await hashPw(pw, a.salt) === a.hash) {
        await register(a.user, pw, false, a.profile);
        delete ACC.list[userKey(user)];
        try { localStorage.setItem('mayhemAccounts', JSON.stringify(ACC.list)); } catch (er) {}
        return;
      }
      throw new Error(e && e.code ? fbErr(e) : (e.message || fbErr(e)));
    }
  }
  async function loginAs(uid, profile) {
    cancelLobby();
    if (!profile) {
      const snap = await FB.db.collection('users').doc(uid).get();
      if (!snap.exists) throw new Error('Hesap verisi bulunamadı.');
      profile = snap.data();
    }
    ACC.user = uid; ACC.name = profile.user;
    PROFILE = withDefaults(profile);
    applyTeam();
    accountChanged();
  }
  function applyTeam() {
    const t = PROFILE.team;
    if (t && t.name) {
      S.team.name = t.name; S.team.tag = t.tag || autoTag(t.name); S.team.color = t.color || S.team.color;
      $('teamName').value = t.name; $('teamTag').value = S.team.tag; S.tagTouched = true;
      document.querySelectorAll('.swatch').forEach(x => x.classList.toggle('on', x.dataset.c === S.team.color));
    }
  }
  function logout() {
    cancelLobby();
    ACC.user = null; ACC.name = null;
    if (FB) FB.auth.signOut().catch(() => {});
    PROFILE = GUEST;
    accountChanged();
  }
  function accountChanged() {
    renderRanked();
    if (S.champs) updateIntro();
  }
  // Oturum: Firebase tarayıcıda hatırlar; sayfa açılınca geri yükle
  if (FB) {
    try { localStorage.removeItem('mayhemSession'); } catch (e) {}
    FB.auth.onAuthStateChanged(async u => {
      if (u && ACC.user !== u.uid) { try { await loginAs(u.uid); } catch (e) { console.warn('oturum', e); } }
      ACC.ready = true;
      if (S.champs) updateIntro();
    });
  }
  // Liderlik tablosu
  async function loadBoard() {
    const el = $('rkBoard'); if (!el || !FB) return;
    try {
      const q = await FB.db.collection('users').orderBy('lp', 'desc').limit(15).get();
      const rows = q.docs.map((d, i) => { const x = d.data(), r = rankOf(x.lp); return `<div class="rk-b${d.id === ACC.user ? ' me' : ''}"><em>${i + 1}</em><img src="${emblem(r.key)}" alt=""><b>${esc(x.user)}</b><span>${rankLabel(x.lp)} · ${r.lp} LP</span><small>${x.w}G ${x.l}M</small></div>`; });
      el.innerHTML = `<div class="eyebrow" style="margin-bottom:6px">Liderlik tablosu</div>${rows.join('') || '<div class="muted" style="font-size:13px">Henüz kimse yok. İlk sen ol.</div>'}`;
    } catch (e) { el.innerHTML = ''; }
  }
  function accountModal(tab = 'login', msg = '') {
    if (ACC.user) {
      const r = rankOf(PROFILE.lp);
      overlay(`<div class="acc">
        <div class="eyebrow">Hesabım</div>
        <div class="acc-head"><img src="${emblem(r.key)}" alt=""><div><h2>${esc(ACC.name)}</h2><span class="muted">${rankLabel(PROFILE.lp)} · ${r.lp} LP · ${PROFILE.w}G ${PROFILE.l}M</span><br><span class="muted" style="font-size:12px">Kayıt: ${new Date(PROFILE.created || Date.now()).toLocaleDateString('tr-TR')}</span></div></div>
        <p class="rk-note">Hesabın sunucuda. Başka bir cihazda aynı kullanıcı adı ve şifreyle giriş yapman yeterli.</p>
        <div class="acc-row"><button class="btn ghost" id="accOut">Çıkış yap</button><button class="btn" id="accClose">Kapat</button></div>
        ${msg ? `<div class="acc-msg">${esc(msg)}</div>` : ''}
      </div>`);
      return;
    }
    if (tab === 'import') tab = 'login';
    overlay(`<div class="acc">
      <div class="acc-tabs"><button class="${tab === 'login' ? 'on' : ''}" data-acc-tab="login">Giriş yap</button><button class="${tab === 'register' ? 'on' : ''}" data-acc-tab="register">Kayıt ol</button></div>
        <label class="field"><span>Kullanıcı adı</span><input class="input" id="accUser" maxlength="16" autocomplete="username"></label>
        <label class="field"><span>Şifre</span><input class="input" id="accPw" type="password" autocomplete="${tab === 'login' ? 'current-password' : 'new-password'}"></label>
        ${tab === 'register' ? `<label class="field"><span>Şifre (tekrar)</span><input class="input" id="accPw2" type="password" autocomplete="new-password"></label>
        ${GUEST.w + GUEST.l > 0 ? `<label class="acc-check"><input type="checkbox" id="accKeep" checked> Misafir olarak kazandığım ${rankLabel(GUEST.lp)} derecesini hesaba taşı</label>` : ''}` : ''}
        <div class="acc-row"><button class="btn ghost" id="accClose">Vazgeç</button><button class="btn" id="accGo">${tab === 'login' ? 'Giriş yap' : 'Hesap oluştur'}</button></div>
      ${msg ? `<div class="acc-msg">${esc(msg)}</div>` : ''}
      <p class="rk-note">${FB ? 'Hesabın sunucuda saklanır; her cihazdan giriş yapabilirsin. Kullanıcı adları herkes arasında benzersiz.' : 'Hesap sunucusuna ulaşılamadı. Sayfayı yenileyip tekrar dene.'}</p>
    </div>`);
    const f = $('accUser'); if (f) f.focus();
  }
  $('overlayHost').addEventListener('click', async e => {
    const t = e.target.closest('[data-acc-tab]'); if (t) { accountModal(t.dataset.accTab); return; }
    if (e.target.closest('#accClose')) { closeOverlay(); return; }
    if (e.target.closest('#accOut')) { logout(); closeOverlay(); return; }
    if (e.target.closest('#accGo')) {
      const reg = !!$('accPw2');
      const user = $('accUser').value, pw = $('accPw').value;
      const btn = e.target.closest('#accGo'); btn.disabled = true; btn.textContent = '…';
      try {
        if (reg) { if (pw !== $('accPw2').value) throw new Error('Şifreler aynı değil.'); await register(user, pw, $('accKeep') ? $('accKeep').checked : false); }
        else await login(user, pw);
        closeOverlay();
        const after = MM.afterLogin; MM.afterLogin = null; if (after) after();
      } catch (er) { accountModal(reg ? 'register' : 'login', er.message); if ($('accUser')) $('accUser').value = user; }
    }
  });
  $('overlayHost').addEventListener('keydown', e => { if (e.key === 'Enter' && $('accGo') && e.target.matches('input')) $('accGo').click(); });
  document.querySelector('.ln-prof').addEventListener('click', () => accountModal());
  document.addEventListener('click', e => { if (e.target.closest('#rkLogin')) accountModal('login'); });
  document.querySelector('.ln-prof').style.cursor = 'pointer';
  // Elo tabanlı LP: güçlü rakibi yenmek daha çok kazandırır
  function lpDelta(me, opp, won) {
    const E = 1 / (1 + Math.pow(10, (opp - me) / 400));
    const d = Math.round(40 * ((won ? 1 : 0) - E));
    return won ? Math.max(8, d) : Math.min(-8, d);
  }
  function soloBadge() {
    const s = PROFILE.solo;
    if (s.titles >= 5) return 'Efsane Şampiyon';
    if (s.titles >= 1) return `${s.titles}× Turnuva Şampiyonu`;
    if (s.tours) return ['Finalist', 'Yarı Finalist', 'Çeyrek Finalist', 'Çeyrek Finalist'][Math.min(3, s.best)];
    return 'Henüz turnuva yok';
  }

  let boardAt = 0;
  function renderRanked() {
    if (Date.now() - boardAt > 4000) { boardAt = Date.now(); loadBoard(); }
    const r = rankOf(PROFILE.lp);
    $('rkEmblem').src = emblem(r.key);
    $('rkTier').textContent = rankLabel(PROFILE.lp);
    $('rkLp').textContent = `${r.lp} LP`;
    $('rkBar').style.setProperty('--v', `${r.tier >= 7 ? Math.min(100, r.lp / 4) : r.lp}%`);
    const games = PROFILE.w + PROFILE.l;
    $('rkWL').textContent = `${PROFILE.w}G ${PROFILE.l}M${games ? ` · %${Math.round(PROFILE.w / games * 100)} kazanma` : ''}`;
    $('rkSolo').textContent = `Tek oyunculu: ${soloBadge()} · ${PROFILE.solo.tours} turnuva`;
    $('rkHist').innerHTML = PROFILE.hist.slice(0, 8).map(h => `<div class="rk-h ${h.won ? 'w' : 'l'}"><b>${h.won ? 'Zafer' : 'Bozgun'}</b><span>${esc(h.opp)}</span><em>${h.d > 0 ? '+' : ''}${h.d} LP</em></div>`).join('') || '<div class="muted" style="font-size:13px">Henüz dereceli maç yok.</div>';
    $('lnRank').src = emblem(r.key);
    $('rkUser').innerHTML = ACC.user ? `<b>${esc(ACC.name)}</b> olarak oynuyorsun` : 'Misafirsin · <button type="button" class="linkbtn" id="rkLogin">Giriş yap / kayıt ol</button>';
    $('lnRankTxt').textContent = `${rankLabel(PROFILE.lp)} · ${r.lp} LP`;
  }

  // ---------- 8. ağ: herkese açık MQTT üzerinden eşler arası ----------
  const BROKERS = ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt'];
  const P = 'mayhemligi/v2/';
  const NET = { c: null, ready: null, subs: new Map(), broker: '' };
  // Her sekmenin kendi ağ kimliği olur: aynı tarayıcıda iki sekme birbiriyle oynayabilir
  const SID = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  function netConnect() {
    if (NET.ready) return NET.ready;
    NET.ready = new Promise((resolve, reject) => {
      if (!window.mqtt) { reject(new Error('Ağ kütüphanesi yüklenemedi')); return; }
      let i = 0;
      const tryNext = () => {
        if (i >= BROKERS.length) { NET.ready = null; reject(new Error('Sunucuya bağlanılamadı')); return; }
        const url = BROKERS[i++];
        const c = window.mqtt.connect(url, { clean: true, connectTimeout: 7000, reconnectPeriod: 0, keepalive: 30, clientId: 'mh_' + SID });
        let ok = false;
        c.on('connect', () => {
          ok = true; NET.c = c; NET.broker = url;
          c.on('message', (topic, buf) => {
            let m; try { m = JSON.parse(buf.toString()); } catch (e) { return; }
            if (!m || m.from === SID) return;
            const fn = NET.subs.get(topic);
            if (fn) fn(m);
          });
          c.on('close', () => { NET.ready = null; NET.c = null; mmLost(); });
          c.options.reconnectPeriod = 0;
          resolve(c);
        });
        c.on('error', () => { if (!ok) { try { c.end(true); } catch (e) {} tryNext(); } });
        setTimeout(() => { if (!ok) { try { c.end(true); } catch (e) {} tryNext(); } }, 8000);
      };
      tryNext();
    });
    return NET.ready;
  }
  function sub(topic, fn) { NET.subs.set(topic, fn); if (NET.c) NET.c.subscribe(topic); }
  function unsub(topic) { NET.subs.delete(topic); if (NET.c) NET.c.unsubscribe(topic); }
  function pub(topic, m) { if (NET.c) NET.c.publish(topic, JSON.stringify({ ...m, from: SID })); }
  const inbox = id => `${P}u/${id}`;

  // ---------- 9. eşleşme ve odalar ----------
  const MM = { state: 'idle', since: 0, seen: new Map(), rooms: new Map(), pending: null, timer: null, code: '' };
  const meCard = () => ({ name: S.team.name, tag: S.team.tag, color: S.team.color, lp: PROFILE.lp, user: ACC.user ? ACC.name : 'Misafir', pid: PROFILE.id });
  const mmWindow = () => Math.min(1400, 150 + 30 * (Date.now() - MM.since) / 1000);
  function saveTeamForm() {
    const name = $('teamName').value.trim();
    if (name.length < 2) return false;
    S.team.name = name;
    S.team.tag = ($('teamTag').value.trim() || autoTag(name)).toLocaleUpperCase('tr');
    document.documentElement.style.setProperty('--team', S.team.color);
    rememberTeam();
    return true;
  }
  // Takım adı yoksa Dereceli sekmesinde kalıp sağdaki formu gösterir; kaydedilince istenen işlem sürer
  function needTeam(after) {
    if (saveTeamForm() || S.team.name) return false;
    MM.after = after || null;
    const f = $('formCard'); f.classList.remove('pulse'); void f.offsetWidth; f.classList.add('pulse');
    $('teamName').focus();
    rkStatus('Önce sağdaki panelden takım adını yaz, sonra "Kaydet ve devam et"e bas.');
    return true;
  }
  function cancelLobby() {
    if (MM.state === 'hosting') pub(`${P}rooms`, { closed: true });
    if (MM.state === 'queue' || MM.state === 'hosting' || MM.state === 'joining') { MM.state = 'idle'; MM.pending = null; rkStatus(''); rkButtons(); }
  }
  function rememberTeam() { if (ACC.user) { PROFILE.team = { name: S.team.name, tag: S.team.tag, color: S.team.color }; saveProfile(); } }
  function rankedFormSubmit() {
    if (!saveTeamForm()) { needTeam(MM.after); return; }
    const f = MM.after; MM.after = null;
    rkStatus(`Takım kaydedildi: ${esc(S.team.name)}`);
    if (f) f();
  }
  function rkStatus(t, busy) { $('rkStatus').innerHTML = t ? `${busy ? '<i class="spin"></i>' : ''}${t}` : ''; }
  async function lobbyJoin() {
    try { await netConnect(); } catch (e) { rkStatus(`Bağlantı hatası: ${e.message}`); return false; }
    if (!NET.subs.has(`${P}q`)) {
      sub(`${P}q`, m => { MM.seen.set(m.from, { ...m, at: Date.now() }); });
      sub(`${P}rooms`, m => { if (m.closed) MM.rooms.delete(m.from); else MM.rooms.set(m.from, { ...m, at: Date.now() }); renderRooms(); });
      sub(inbox(SID), onInbox);
      clearInterval(MM.timer);
      MM.timer = setInterval(mmTick, 1000);
    }
    return true;
  }
  function renderRooms() {
    const now = Date.now();
    for (const [k, r] of MM.rooms) if (now - r.at > 7000) MM.rooms.delete(k);
    for (const [k, q] of MM.seen) if (now - q.at > 6000) MM.seen.delete(k);
    const list = [...MM.rooms.values()];
    $('rkRooms').innerHTML = list.length ? list.map(r => `<button type="button" class="rk-room" data-join="${r.from}"><span class="badge sm" style="--c:${r.color}">${esc(r.tag)}</span><div><b>${esc(r.name)}</b><small>${rankLabel(r.lp)} · Kod ${esc(r.code)}</small></div><em>Katıl →</em></button>`).join('') : '<div class="muted" style="font-size:13px">Açık oda yok. Bir tane kur!</div>';
    const q = [...MM.seen.values()].length + (MM.state === 'queue' ? 1 : 0);
    $('rkQueueInfo').textContent = NET.c ? `${q} oyuncu maç arıyor · ${list.length} açık oda` : 'Lobiye bağlanınca kuyruk ve odalar görünür.';
  }
  function mmTick() {
    renderRooms();
    if (MM.state === 'queue') {
      pub(`${P}q`, { ...meCard(), w: mmWindow(), pid: PROFILE.id });
      const waited = Math.floor((Date.now() - MM.since) / 1000);
      rkStatus(`Maç aranıyor… ${Math.floor(waited / 60)}:${String(waited % 60).padStart(2, '0')} · ±${Math.round(mmWindow())} puan aralığı`, true);
      if (MM.pending && Date.now() - MM.pending.at > 5000) MM.pending = null;
      if (!MM.pending) {
        const cand = [...MM.seen.values()].filter(o => o.pid !== PROFILE.id && Math.abs(o.lp - PROFILE.lp) <= Math.max(mmWindow(), o.w || 0)).sort((a, b) => Math.abs(a.lp - PROFILE.lp) - Math.abs(b.lp - PROFILE.lp))[0];
        if (cand && SID < cand.from) {
          MM.pending = { to: cand.from, match: Math.random().toString(36).slice(2, 10), at: Date.now() };
          pub(inbox(cand.from), { type: 'invite', match: MM.pending.match, card: meCard(), ranked: true });
        }
      }
    } else if (MM.state === 'hosting') {
      pub(`${P}rooms`, { ...meCard(), code: MM.code });
    }
  }
  function onInbox(m) {
    if (m.type === 'invite' && MM.state === 'queue') {
      if (MM.pending || (m.card && m.card.pid === PROFILE.id)) { pub(inbox(m.from), { type: 'decline' }); return; }
      pub(inbox(m.from), { type: 'accept', match: m.match, card: meCard() });
      beginMatch({ id: m.match, host: false, oppId: m.from, opp: m.card, ranked: true });
    } else if (m.type === 'accept' && MM.state === 'queue' && MM.pending && MM.pending.to === m.from && MM.pending.match === m.match) {
      beginMatch({ id: m.match, host: true, oppId: m.from, opp: m.card, ranked: true });
    } else if (m.type === 'decline' && MM.pending && MM.pending.to === m.from) {
      MM.pending = null;
    } else if (m.type === 'join') {
      if (MM.state === 'hosting' && (!m.code || m.code === MM.code)) {
        const id = Math.random().toString(36).slice(2, 10);
        pub(inbox(m.from), { type: 'welcome', match: id, card: meCard() });
        pub(`${P}rooms`, { closed: true });
        beginMatch({ id, host: true, oppId: m.from, opp: m.card, ranked: false });
      } else pub(inbox(m.from), { type: 'full' });
    } else if (m.type === 'welcome' && MM.state === 'joining') {
      beginMatch({ id: m.match, host: false, oppId: m.from, opp: m.card, ranked: false });
    } else if (m.type === 'full' && MM.state === 'joining') {
      MM.state = 'idle'; rkStatus('Oda dolu ya da kapandı.'); rkButtons();
    }
  }
  function mmLost() { if (MM.state === 'queue' || MM.state === 'hosting' || MM.state === 'joining') { MM.state = 'idle'; rkStatus('Bağlantı koptu. Tekrar dene.'); rkButtons(); } }
  function rkButtons() {
    const st = MM.state;
    $('rkQueue').textContent = st === 'queue' ? 'Aramayı iptal et' : 'Dereceli maç ara';
    $('rkQueue').classList.toggle('ghost', st === 'queue');
    $('rkHost').textContent = st === 'hosting' ? 'Odayı kapat' : 'Oda kur';
    $('rkQueue').disabled = st === 'hosting' || st === 'joining';
    $('rkHost').disabled = st === 'queue' || st === 'joining';
  }
  $('rkQueue').addEventListener('click', async () => {
    if (MM.state === 'queue') { MM.state = 'idle'; MM.pending = null; rkStatus(''); rkButtons(); return; }
    if (!ACC.user) { MM.afterLogin = () => $('rkQueue').click(); accountModal('login', 'Dereceli oynamak için giriş yap ya da kayıt ol. LP hesabına yazılır.'); return; }
    if (needTeam(() => $('rkQueue').click())) return;
    rkStatus('Lobiye bağlanılıyor…', true);
    if (!await lobbyJoin()) return;
    MM.state = 'queue'; MM.since = Date.now(); MM.pending = null;
    rkButtons(); mmTick();
  });
  $('rkHost').addEventListener('click', async () => {
    if (MM.state === 'hosting') { pub(`${P}rooms`, { closed: true }); MM.state = 'idle'; rkStatus(''); rkButtons(); return; }
    if (needTeam(() => $('rkHost').click())) return;
    rkStatus('Lobiye bağlanılıyor…', true);
    if (!await lobbyJoin()) return;
    MM.state = 'hosting';
    MM.code = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPRSTUVYZ23456789'[Math.floor(Math.random() * 29)]).join('');
    rkStatus(`Oda açık · Kod <b class="rk-code">${MM.code}</b> · Rakip bekleniyor…`, true);
    rkButtons(); mmTick();
  });
  async function joinRoom(hostId, code) {
    if (needTeam(() => joinRoom(hostId, code))) return;
    if (!await lobbyJoin()) return;
    if (!hostId) {
      rkStatus('Oda aranıyor…', true);
      await new Promise(r => setTimeout(r, 2500));
      const r = [...MM.rooms.values()].find(x => x.code === code);
      if (!r) { rkStatus(`${code} kodlu oda bulunamadı.`); return; }
      hostId = r.from;
    }
    MM.state = 'joining'; rkButtons();
    rkStatus('Odaya katılınıyor…', true);
    pub(inbox(hostId), { type: 'join', code, card: meCard() });
    setTimeout(() => { if (MM.state === 'joining') { MM.state = 'idle'; rkStatus('Oda yanıt vermedi.'); rkButtons(); } }, 8000);
  }
  $('rkJoin').addEventListener('click', () => { const code = $('rkCode').value.trim().toUpperCase(); if (code.length === 4) joinRoom(null, code); else rkStatus('4 haneli oda kodunu yaz.'); });
  $('rkRooms').addEventListener('click', e => { const b = e.target.closest('[data-join]'); if (b) { const r = MM.rooms.get(b.dataset.join); joinRoom(b.dataset.join, r && r.code); } });
  $('lnTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b && b.dataset.ln === 'ranked') { renderRanked(); renderRooms(); lobbyJoin(); } });

  // ---------- 10. online maç oturumu ----------
  const DRAFT_SECS = 180;
  const teamPayload = t => ({ name: t.name, tag: t.tag, color: t.color, roster: t.roster.map(r => ({ id: r.champ.id, role: r.role, skin: r.skin || 0, boots: r.boots, items: r.items, keystone: r.keystone, secondary: r.secondary, summs: r.summs })) });
  const teamFrom = p => ({ name: p.name, tag: p.tag, color: p.color, roster: p.roster.map(r => ({ ...r, champ: S.champs[r.id] })).filter(r => r.champ) });
  let OM = null;
  function beginMatch(o) {
    MM.state = 'match'; MM.pending = null; rkButtons(); rkStatus('');
    const topic = `${P}m/${o.id}`;
    OM = { ...o, topic, phase: 'draft', deadline: Date.now() + DRAFT_SECS * 1000, myReady: false, oppReady: false, myTeam: null, oppTeam: null, lastHeard: Date.now(), oppTick: 0, cmdN: 0, snap: null, hostEnd: null, oppPhase: 'draft' };
    sub(topic, onMatchMsg);
    OM.hb = setInterval(() => {
      if (!OM) return;
      if (OM.phase === 'draft') pub(OM.topic, { type: 'hb', phase: 'draft', ready: OM.myReady, left: OM.host ? Math.max(0, OM.deadline - Date.now()) : undefined });
      const silent = Date.now() - OM.lastHeard;
      if (OM.phase === 'draft' && silent > 15000) matchAbort('Rakibin bağlantısı koptu. Maç iptal edildi, LP değişmedi.');
      if (OM.phase === 'game' && silent > 12000) finishOnline({ forfeit: true });
      if (OM.phase === 'draft') onBar();
      if (OM.phase === 'draft' && Date.now() >= OM.deadline && !OM.myReady) autoReady();
    }, 1000);
    // takım kurma ekranı
    S.mode = 'online';
    S.team.roster = [];
    S.draft = { idx: 0, options: draftOptions(0), rerolls: 3 };
    renderDraft();
    show('draft');
    onBar();
    announceOnline();
  }
  function announceOnline() {
    const el = document.createElement('div');
    el.className = 'mm-found';
    el.innerHTML = `<b>MAÇ BULUNDU</b><span>${esc(OM.opp.name)} · ${rankLabel(OM.opp.lp)}</span>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
    playVO(S.champs[Object.keys(S.champs)[Math.floor(Math.random() * Object.keys(S.champs).length)]], 'ban', 0.5);
  }
  function onBar() {
    let bar = $('onBar');
    if (!OM || OM.phase !== 'draft') { if (bar) bar.remove(); return; }
    if (!bar) { bar = document.createElement('div'); bar.id = 'onBar'; bar.className = 'on-bar'; document.body.appendChild(bar); }
    const left = Math.max(0, Math.ceil((OM.deadline - Date.now()) / 1000));
    bar.innerHTML = `<div class="ob-l"><span class="chip gold">${OM.ranked ? 'DERECELİ' : 'ÖZEL ODA'}</span><span class="ob-vs">${esc(S.team.name || 'Sen')} <i>vs</i> <span class="badge sm" style="--c:${OM.opp.color}">${esc(OM.opp.tag)}</span> ${esc(OM.opp.name)} <small>${esc(OM.opp.user || '')} · ${rankLabel(OM.opp.lp)}</small></span></div>
      <div class="ob-t${left <= 30 ? ' hot' : ''}">${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</div>
      <div class="ob-r"><span class="${OM.oppReady ? 'ok' : ''}">Rakip: ${OM.oppReady ? 'HAZIR ✓' : 'takımını kuruyor…'}</span><span class="${OM.myReady ? 'ok' : ''}">Sen: ${OM.myReady ? 'HAZIR ✓' : 'kuruyor'}</span></div>`;
  }
  function onMatchMsg(m) {
    if (!OM || m.from !== OM.oppId) return;
    OM.lastHeard = Date.now();
    if (m.type === 'hb') {
      if (!OM.host && m.left !== undefined) OM.deadline = Date.now() + m.left;
      if (m.ready && !OM.oppReady && OM.oppTeam) OM.oppReady = true;
    } else if (m.type === 'ready') {
      OM.oppTeam = m.team; OM.oppReady = true; onBar();
      if (OM.host) maybeStart();
    } else if (m.type === 'start' && !OM.host) {
      startOnline(m.seed, m.hostTeam, OM.myTeam);
    } else if (m.type === 'tk') {
      OM.oppTick = Math.max(OM.oppTick, m.tick);
    } else if (m.type === 'cmd' && viewer && OM.sim) {
      if (m.c.tick <= OM.sim.tick) OM.sim.applyCmd(m.c); else OM.sim.queueCmd(m.c);
    } else if (m.type === 'snap' && !OM.host) {
      OM.snap = m.s;
    } else if (m.type === 'end') {
      OM.hostEnd = m;
      if (!OM.host) finishOnline({});
    } else if (m.type === 'leave') {
      if (OM.phase === 'draft') matchAbort('Rakip maçtan ayrıldı. LP değişmedi.');
      else if (OM.phase === 'game') finishOnline({ forfeit: true });
    }
  }
  function completeTeam() {
    // eksik seçimleri ve dizilimleri tamamla
    while (S.team.roster.length < 5) {
      const idx = S.team.roster.length;
      const c = draftOptions(idx)[0];
      const b0 = D.buildFor(c);
      S.team.roster[idx] = { role: D.ROLES[idx], champ: c, boots: null, items: [], keystone: b0.keystone, secondary: b0.secondary, summs: roleSumms(D.ROLES[idx], b0) };
    }
    for (const r of S.team.roster) {
      const d = defaultLoadout(r.champ, r.role);
      if (!r.boots) r.boots = d.boots;
      for (const id of [...d.items, ...D.buildFor(r.champ).alt]) if (r.items.length < ITEM_SLOTS && !r.items.includes(id)) r.items.push(id);
      if (!r.keystone) r.keystone = d.keystone;
      if (!r.secondary) r.secondary = d.secondary;
      if (r.summs.length < 2) r.summs = d.summs;
    }
  }
  function autoReady() { completeTeam(); sendReady(); }
  function sendReady() {
    if (!OM || OM.myReady) return;
    OM.myReady = true;
    OM.myTeam = teamPayload(S.team);
    pub(OM.topic, { type: 'ready', team: OM.myTeam });
    onBar();
    renderLoadout();
    if (OM.host) maybeStart();
  }
  function maybeStart() {
    if (!OM || !OM.host || !OM.myReady || !OM.oppReady || OM.phase !== 'draft') return;
    const seed = Math.floor(Math.random() * 2147483647);
    pub(OM.topic, { type: 'start', seed, hostTeam: OM.myTeam });
    startOnline(seed, OM.myTeam, OM.oppTeam);
  }
  async function startOnline(seed, hostP, guestP) {
    if (!OM || OM.phase !== 'draft') return;
    OM.phase = 'loading';
    onBar();
    const hostT = teamFrom(hostP), guestT = teamFrom(guestP);
    if (guestT.color === hostT.color) guestT.color = COLORS.find(c => c !== hostT.color && c !== '#4f8cff') || '#ef4444';
    await Promise.all([...hostT.roster, ...guestT.roster].map(r => detail(r.champ.id)));
    G = { teams: [hostT, guestT], mySide: OM.host ? 0 : 1, online: null };
    series = { opp: OM.host ? guestT : hostT, bo: 1, wins: [0, 0], game: 0, online: true };
    onlineLoading(() => {
      if (!OM) return;
      OM.phase = 'game';
      OM.lastHeard = Date.now();
      const sim = new M.Sim([simTeam(hostT), simTeam(guestT)], { seed, manual: [false, false] });
      OM.sim = sim;
      G.online = {
        cmd: c => { if (!OM || !OM.sim) return; c.tick = OM.sim.tick + 150; c.n = ++OM.cmdN * 2 + (OM.host ? 0 : 1); OM.sim.queueCmd(c); pub(OM.topic, { type: 'cmd', c }); }
      };
      $('autoUlt').checked = true; S.autoUlt = true;
      multi = {}; vo.played = new Set();
      let tkT = 0, snapAt = 180;
      show('battle');
      setupBattle(sim, OM.ranked ? `Dereceli · ${rankLabel(PROFILE.lp)} vs ${rankLabel(OM.opp.lp)}` : 'Özel oda', {
        gate: tick => tick <= OM.oppTick + 120,
        focus: u => G.online.cmd({ type: 'focus', side: G.mySide, uid: u.uid }),
        onFrame: (s, dt) => {
          tkT -= dt;
          if (tkT <= 0) { tkT = 0.2; pub(OM.topic, { type: 'tk', tick: s.tick }); }
          if (OM.host && s.tick >= snapAt) { snapAt = s.tick + 180; pub(OM.topic, { type: 'snap', s: s.exportState() }); }
          if (!OM.host && OM.snap && s.tick >= OM.snap.tick) { s.importState(OM.snap); OM.snap = null; }
          const wait = $('waitOpp');
          if (wait) wait.hidden = !(s.tick + 1 > OM.oppTick + 120 && !s.done);
        },
        onEnd: s => {
          if (!OM) return;
          if (OM.host) { pub(OM.topic, { type: 'end', winner: s.winner, byNexus: !!s.byNexus, kills: s.kills }); finishOnline({}); }
          else { OM.waitEnd = true; if (OM.hostEnd) finishOnline({}); else setTimeout(() => OM && OM.phase === 'game' && finishOnline({}), 5000); }
        }
      });
      if (!$('waitOpp')) $('arenaWrap').insertAdjacentHTML('beforeend', '<div class="wait-opp" id="waitOpp" hidden><i class="spin"></i> Rakip bekleniyor…</div>');
    });
  }
  function onlineLoading(done) {
    const teams = G.teams;
    const card = (t, r) => {
      const ks = S.keystones[r.keystone];
      return `<div class="ls-card" style="--c:${t.color}"><div class="ls-art" style="background-image:url('${loadingArt(r.champ, r.skin)}')"></div><div class="ls-meta"><b>${esc(r.champ.name)}</b><small>${D.ROLE_NAMES[r.role]}</small><div class="ls-icons">${r.summs.map(x => `<img src="${summIcon(x)}" alt="">`).join('')}${ks ? `<img class="rn" src="${runeIcon(ks.icon)}" alt="">` : ''}</div></div></div>`;
    };
    const lp = side => side === G.mySide ? PROFILE.lp : OM.opp.lp;
    const row = (t, side) => `<div class="ls-team"><div class="ls-head">${teamBadge(t)}<b>${esc(t.name)}</b><img class="ls-rank" src="${emblem(rankOf(lp(side)).key)}" alt=""><small class="muted">${rankLabel(lp(side))}</small></div><div class="ls-row">${t.roster.map(r => card(t, r)).join('')}</div></div>`;
    $('overlayHost').innerHTML = `<div class="loadscreen">${row(teams[0], 0)}<div class="ls-vs"><span>VS</span><small>${OM.ranked ? 'DERECELİ' : 'ÖZEL ODA'}</small><i class="ls-bar"><em></em></i></div>${row(teams[1], 1)}</div>`;
    setTimeout(() => { closeOverlay(); done(); }, 4000);
  }
  function leaveMatch() {
    if (!OM) return;
    clearInterval(OM.hb);
    unsub(OM.topic);
    OM = null;
    MM.state = 'idle';
    S.mode = null;
    G.online = null;
    const bar = $('onBar'); if (bar) bar.remove();
    rkButtons();
  }
  function matchAbort(msg) {
    if (!OM) return;
    leaveMatch();
    if (viewer) { viewer.stop(); viewer = null; }
    overlay(`<div class="eyebrow">Dereceli</div><h2>Maç iptal</h2><div class="muted" style="margin-top:8px">${esc(msg)}</div><div class="center-actions"><button class="btn" id="toLobby">Lobiye dön</button></div>`);
  }
  function finishOnline({ forfeit }) {
    if (!OM || OM.phase === 'done') return;
    OM.phase = 'done';
    const sim = OM.sim;
    let winner = sim ? sim.winner : G.mySide;
    if (forfeit) winner = G.mySide;
    else if (OM.hostEnd && !OM.host) winner = OM.hostEnd.winner;
    if (viewer) viewer.stop();
    const won = winner === G.mySide;
    const before = PROFILE.lp;
    let d = 0;
    if (OM.ranked) {
      d = lpDelta(PROFILE.lp, OM.opp.lp, won);
      PROFILE.lp = Math.max(0, PROFILE.lp + d);
      if (won) PROFILE.w++; else PROFILE.l++;
      PROFILE.hist.unshift({ won, opp: OM.opp.name, d, at: Date.now() });
      PROFILE.hist.length = Math.min(PROFILE.hist.length, 30);
      saveProfile();
    }
    const rb = rankOf(before), ra = rankOf(PROFILE.lp);
    const promo = OM.ranked && (ra.tier > rb.tier || (ra.tier === rb.tier && ra.div !== rb.div && d > 0));
    const demo = OM.ranked && d < 0 && (ra.tier < rb.tier || (ra.tier === rb.tier && ra.div !== rb.div));
    const teams = G.teams;
    const kills = sim ? sim.kills : [0, 0];
    overlay(`
      <div class="eyebrow">${OM.ranked ? 'Dereceli' : 'Özel oda'} · ${esc(teams[G.mySide].tag)} ${kills[G.mySide]} - ${kills[1 - G.mySide]} ${esc(teams[1 - G.mySide].tag)}${forfeit ? ' · Rakip ayrıldı' : ''}</div>
      <h2>${won ? '<span class="res-win">ZAFER</span>' : '<span class="res-lose">BOZGUN</span>'}</h2>
      ${OM.ranked ? `<div class="lp-res"><img src="${emblem(ra.key)}" alt=""><div><b>${rankLabel(PROFILE.lp)} · <span class="lp-count" id="lpCount">${rb.lp}</span> LP</b><span class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d} LP</span>${promo ? '<em class="up">Terfi! 🎉</em>' : demo ? '<em class="down">Düşüş</em>' : ''}<div class="lp-track"><i id="lpFill" style="width:${promo || demo ? (d > 0 ? 0 : 100) : rb.lp}%"></i></div></div></div>` : ''}
      ${sim ? statTable(sim, teams) : ''}
      <div class="center-actions"><button class="btn" id="toLobby">Lobiye dön</button></div>`);
    leaveMatch();
    renderRanked();
    if (OM && OM.ranked) animateLp(promo || demo ? (d > 0 ? 0 : 100) : rb.lp, ra.lp);
    if (promo || demo) setTimeout(() => rankCinematic(rb, ra, promo), 900);
    else if (won) confetti();
  }
  // LP çubuğu ve sayaç: eski değerden yeni değere akar
  function animateLp(from, to) {
    const fill = $('lpFill'), num = $('lpCount');
    if (!fill || !num) return;
    const t0 = performance.now() + 350, dur = 1100;
    const tick = now => {
      const k = Math.max(0, Math.min(1, (now - t0) / dur)), e = 1 - Math.pow(1 - k, 3);
      const v = from + (to - from) * e;
      fill.style.width = `${Math.max(0, Math.min(100, v))}%`; num.textContent = Math.round(v);
      if (k < 1 && document.body.contains(fill)) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  window.MHLdebug = { rankFx: (from, to, up) => rankCinematic(rankOf(from), rankOf(to), up) };
  const TIER_COL = { iron: '#8c8c8c', bronze: '#c0773f', silver: '#b8c4cf', gold: '#f2c14e', platinum: '#4fd1c5', emerald: '#34d399', diamond: '#7aa2ff', master: '#c084fc', grandmaster: '#f87171', challenger: '#fde68a' };
  // Terfi / düşüş sinematiği
  function rankCinematic(rb, ra, up) {
    document.querySelectorAll('.rankfx').forEach(x => x.remove());
    const col = TIER_COL[ra.key] || '#c8aa6e';
    const el = document.createElement('div');
    el.className = `rankfx ${up ? 'up' : 'down'}`;
    el.style.setProperty('--rc', col);
    const tierChange = ra.tier !== rb.tier;
    el.innerHTML = `
      <div class="rf-rays"></div>
      <div class="rf-ring"></div>
      <div class="rf-stage">
        <img class="rf-old" src="${emblem(rb.key)}" alt="">
        <img class="rf-new" src="${emblem(ra.key)}" alt="">
        <div class="rf-flash"></div>
      </div>
      <div class="rf-txt">
        <small>${up ? (tierChange ? 'YENİ KADEME' : 'KÜME ATLADIN') : 'KÜME DÜŞTÜN'}</small>
        <b>${esc(rankLabel(ra.p))}</b>
        <span>${up ? `${esc(rankLabel(rb.p))} → ${esc(rankLabel(ra.p))}` : 'Bir sonraki maçta geri al!'}</span>
      </div>
      <button class="btn rf-ok">Devam</button>`;
    if (up) for (let i = 0; i < 26; i++) {
      const p = document.createElement('i');
      p.className = 'rf-spark';
      const a = Math.random() * Math.PI * 2, r = 140 + Math.random() * 240;
      p.style.cssText = `--dx:${Math.cos(a) * r}px;--dy:${Math.sin(a) * r}px;--d:${(1.5 + Math.random() * 0.6).toFixed(2)}s;--s:${(4 + Math.random() * 6).toFixed(1)}px`;
      el.appendChild(p);
    }
    document.body.appendChild(el);
    if (up) setTimeout(confetti, 1500);
    const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 400); };
    el.addEventListener('click', close);
    setTimeout(close, up ? 6500 : 4000);
  }
  $('overlayHost').addEventListener('click', e => {
    if (e.target.closest('#toLobby')) { closeOverlay(); if (viewer) { viewer.stop(); viewer = null; } renderRanked(); show('intro'); lnTab('ranked'); renderRooms(); }
  });
  window.addEventListener('beforeunload', () => { if (OM) pub(OM.topic, { type: 'leave' }); if (MM.state === 'hosting') pub(`${P}rooms`, { closed: true }); });

  // online modda dizilim ekranının eylem düğmesi HAZIR olur
  const tourRenderLoadout = renderLoadout;
  renderLoadout = function () {
    tourRenderLoadout();
    if (S.mode === 'online' && OM) {
      const all = S.team.roster.length === 5 && S.team.roster.every(complete);
      $('lineupAction').innerHTML = OM.myReady ? `<button class="btn" disabled>HAZIR ✓ · rakip bekleniyor</button>` : `<button class="btn" id="onReady" ${all ? '' : 'disabled'}>HAZIR</button>`;
      if (!all && !OM.myReady) {
        const next = S.team.roster.findIndex((x, i) => i !== S.loIdx && !complete(x));
        if (next >= 0) $('lineupAction').insertAdjacentHTML('afterbegin', `<button class="btn ghost" id="nextChamp" style="margin-right:8px">Sonraki: ${esc(S.team.roster[next].champ.name)} →</button>`);
      }
    }
  };
  lineup.addEventListener('click', e => { if (e.target.closest('#onReady')) sendReady(); });
  // tek oyunculu derece: turnuva sonu
  const tourRenderEnd = renderEnd;
  renderEnd = function () {
    const T = S.tour;
    if (T && !T.counted) {
      T.counted = true;
      PROFILE.solo.tours++;
      const last = T.path.length ? T.path[T.path.length - 1].round : 0;
      const place = T.champion === S.team ? -1 : 2 - last;
      if (place < 0) PROFILE.solo.titles++;
      PROFILE.solo.best = Math.min(PROFILE.solo.best, Math.max(0, place));
      saveProfile();
    }
    tourRenderEnd();
  };
  renderRanked();

  load();
})();
