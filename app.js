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

  // ---------- 1. giriş ----------
  function setupIntro() {
    const ids = shuffle(Object.keys(S.champs));
    const picks = ids.slice(0, 7);
    $('introBg').innerHTML = picks.map((id, i) => `<div class="slide${i ? '' : ' on'}" style="background-image:url('${splashArt(S.champs[id])}')"></div>`).join('');
    $('featChamps').textContent = Object.keys(S.champs).length;
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
    $('toDraft').disabled = !(S.champs && name.length >= 2);
    if (S.champs) $('toDraft').textContent = 'Takımı kur →';
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
    S.team.name = $('teamName').value.trim();
    S.team.tag = ($('teamTag').value.trim() || autoTag(S.team.name)).toLocaleUpperCase('tr');
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
        <h3>${esc(c.name)}</h3>
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
          Build uyumu: <b style="color:${fi.color}">${r.items.length ? fi.label : '—'}</b>
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
      const id = pool[Math.floor(Math.random() * pool.length)];
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
    const col = side ? series.opp.color : S.team.color;
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
    const sim = new M.Sim([simTeam(S.team), simTeam(series.opp)], { manual: [!S.autoUlt, false] });
    const teams = [S.team, series.opp];
    $('sbA').innerHTML = `${teamBadge(S.team)}<span class="tn">${esc(S.team.name)}</span><span class="obj" id="oA"></span><span class="k" id="kA">0</span>`;
    $('sbB').innerHTML = `${teamBadge(series.opp)}<span class="tn">${esc(series.opp.name)}</span><span class="obj" id="oB"></span><span class="k" id="kB">0</span>`;
    $('sbSeries').textContent = series.bo === 1 ? `${ROUND_NAMES[S.tour.round]} · Tek maç` : `${ROUND_NAMES[S.tour.round]} · Maç ${series.game} · ${series.wins[0]}-${series.wins[1]}`;
    $('hudA').innerHTML = sim.units.filter(u => u.side === 0).map((u, i) => hudCard(u, 0, i)).join('');
    $('hudB').innerHTML = sim.units.filter(u => u.side === 1).map((u, i) => hudCard(u, 1, i)).join('');
    $('killfeed').innerHTML = '';
    $('fxHost').innerHTML = '';
    if (viewer) viewer.stop();
    viewer = new R.Viewer($('arena'), sim, {
      colors: teams.map(t => t.color),
      speed: S.speed,
      assets: {
        img,
        iconImg: u => {
          if (u.isPet && u.petIcon) return img(u.petIcon);
          const p = img(portrait(u.champ, u.skin));
          return u.skin && p.complete && !p.naturalWidth ? img(icon(u.champ)) : p;
        },
        summIcon, itemIcon
      },
      hooks: { onEnd: onGameEnd, onUlt: callout, onKill: onKill, onFrame: hudTick, onObjective }
    });
    hudT = 0;
  }

  let hudT = 0;
  function hudTick(sim, dt) {
    hudT -= dt;
    if (hudT > 0) return;
    hudT = 0.1;
    $('kA').textContent = sim.kills[0];
    $('kB').textContent = sim.kills[1];
    const t = Math.min(M.GAME_LEN, Math.floor(sim.t));
    $('sbClock').textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} / ${Math.floor(M.GAME_LEN / 60)}:00`;
    const obj = s => `<i style="--oc:#94a3b8" title="Yıkılan kule">${sim.towersDown[s]}</i><i style="--oc:#f97316" title="Ejder">${sim.drakes[s]}</i><i style="--oc:#a855f7" title="Baron">${sim.barons[s]}</i><i style="--oc:#facc15" title="Altın">${(sim.gold[s] / 1000).toFixed(1)}k</i>`;
    $('oA').innerHTML = obj(0);
    $('oB').innerHTML = obj(1);
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
    const det = S.detail[u.champ.id] || {};
    const col = (u.ult[1] && u.ult[1].color) || '#f0d48a';
    const name = u.stolenName && u.ult[0] === 'steal' ? u.stolenName : det.ultName || 'Ulti';
    const el = document.createElement('div');
    el.className = `callout ${u.side ? 'r' : 'l'}`;
    el.style.setProperty('--c', col);
    el.innerHTML = `<div class="face" style="background-image:url('${splashArt(u.champ, u.skin)}')"></div><img class="uicon" src="${det.ultIcon || icon(u.champ)}" alt=""><div><div class="cn">${esc(u.champ.name.toLocaleUpperCase('tr'))}</div><div class="un">${esc(name)}</div></div>`;
    $('fxHost').querySelectorAll(`.callout.${u.side ? 'r' : 'l'}`).forEach(x => x.remove());
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
    const col = killer.side ? series.opp.color : S.team.color;
    const vcol = victim.side ? series.opp.color : S.team.color;
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
    if (m.n >= 2) announce(names[Math.min(5, m.n)], killer.champ.name, col);
    else if (e.first) announce('İLK KAN!', `${killer.champ.name} → ${victim.champ.name}`, col);
    else if (ace) announce('AS!', killer.side ? series.opp.name : S.team.name, col);
  }

  function onObjective(e) {
    const m = e.m;
    if (e.kind === 'tower' || e.kind === 'nexus') {
      const team = e.side ? series.opp : S.team;
      announce(e.kind === 'nexus' ? 'NEXUS YIKILDI!' : 'KULE YIKILDI', `${team.name}${e.u ? ' · ' + e.u.champ.name : ''}`, team.color);
      return;
    }
    if (e.kind === 'spawn') { if (m.key === 'baron') announce('BARON NASHOR', 'Nehrin üstünde uyandı', m.color); else announce('EJDER', 'Nehrin altında belirdi', m.color); return; }
    const team = e.side ? series.opp : S.team;
    announce(m.key === 'baron' ? 'BARON ALINDI!' : 'EJDER ALINDI!', `${team.name} · ${e.u.champ.name}`, team.color);
  }

  $('hudA').addEventListener('click', e => {
    const b = e.target.closest('.ultbtn');
    if (b && viewer) viewer.sim.requestUlt(+b.dataset.ult);
  });
  document.addEventListener('keydown', e => {
    if (!$('battle').classList.contains('active') || !viewer) return;
    if (e.key >= '1' && e.key <= '5') {
      const u = viewer.sim.units.filter(x => x.side === 0 && !x.isPet)[+e.key - 1];
      if (u) viewer.sim.requestUlt(u.uid);
    }
    if (e.key === ' ') { e.preventDefault(); setSpeed(viewer.speed ? 0 : (S.speed || 1)); }
  });
  function setSpeed(s) {
    if (s) S.speed = s;
    if (viewer) viewer.speed = s;
    document.querySelectorAll('#speed button').forEach(x => x.classList.toggle('on', +x.dataset.s === s));
  }
  $('speed').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) setSpeed(+b.dataset.s);
  });
  $('autoUlt').addEventListener('change', e => {
    S.autoUlt = e.target.checked;
    if (viewer) viewer.sim.manual[0] = !S.autoUlt;
  });
  $('skip').addEventListener('click', () => viewer && viewer.skip());

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
  function renderEnd() {
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

  load();
})();
