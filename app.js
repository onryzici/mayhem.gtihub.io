(() => {
  const M = window.Mayhem;
  const DD = 'https://ddragon.leagueoflegends.com';
  const $ = id => document.getElementById(id);
  const TAU = Math.PI * 2;
  const STEP = 1 / 60;

  const COLORS = ['#4f8cff', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#f97316', '#ec4899'];
  const AI_TEAMS = [
    ['Noxus Lejyonu', 'NOX'], ['Demacia Şövalyeleri', 'DMC'], ['Zaun Kimyagerleri', 'ZAU'], ['Piltover Mucitleri', 'PLT'],
    ['Ionia Ruhları', 'ION'], ['Freljord Kurtları', 'FRJ'], ['Shurima Varisleri', 'SHR'], ['Bilgewater Korsanları', 'BLG'],
    ['Gölge Adalar', 'GLG'], ['Targon Yıldızları', 'TGN'], ['Hiçlik Sürüsü', 'VOID'], ['Ixtal Avcıları', 'IXT']
  ];
  const ROUND_NAMES = ['Çeyrek Final', 'Yarı Final', 'Final'];
  const BEST_OF = [1, 3, 3];
  const STAT_LABELS = { hp: 'Can', ad: 'SG', ap: 'YG', armor: 'Zırh', mr: 'BD', as: 'Saldırı Hızı', crit: 'Kritik', ls: 'Can Çalma', ms: 'Hareket Hızı' };

  const S = {
    v: null, champs: null,
    team: { name: '', tag: '', color: COLORS[0], roster: [] },
    tagTouched: false,
    draft: { idx: 0, options: [], rerolls: 3 },
    itemIdx: 0,
    tour: null,
    speed: 1
  };

  // ---------- yardımcılar ----------
  const shuffle = a => {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = c => `${DD}/cdn/${S.v}/img/champion/${c.image.full}`;
  const loadingArt = c => `${DD}/cdn/img/champion/loading/${c.id}_0.jpg`;
  const splashArt = c => `${DD}/cdn/img/champion/splash/${c.id}_0.jpg`;
  const itemIcon = id => `${DD}/cdn/${S.v}/img/item/${id}.png`;
  const fmt = n => Math.round(n).toLocaleString('tr-TR');

  const imgCache = {};
  function img(url) {
    if (!imgCache[url]) { const i = new Image(); i.src = url; imgCache[url] = i; }
    return imgCache[url];
  }

  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    lineup.hidden = !(id === 'draft' || id === 'items');
    window.scrollTo(0, 0);
  }

  function teamBadge(t, small) {
    return `<span class="badge${small ? ' sm' : ''}" style="--c:${t.color}">${esc(t.tag)}</span>`;
  }

  function refreshTeamBits() {
    document.querySelectorAll('[data-team-badge]').forEach(b => { b.textContent = S.team.tag; b.style.setProperty('--c', S.team.color); });
    document.querySelectorAll('[data-team-name]').forEach(n => { n.textContent = S.team.name; });
  }

  function itemStatLine(it) {
    const k = it.stats, out = [];
    if (k.hp) out.push(`+${k.hp} Can`);
    if (k.ad) out.push(`+${k.ad} SG`);
    if (k.ap) out.push(`+${k.ap} YG`);
    if (k.armor) out.push(`+${k.armor} Zırh`);
    if (k.mr) out.push(`+${k.mr} BD`);
    if (k.as) out.push(`%${Math.round(k.as * 100)} SH`);
    if (k.crit) out.push(`%${Math.round(k.crit * 100)} Kritik`);
    if (k.ls) out.push(`%${Math.round(k.ls * 100)} Can Çalma`);
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
      const [c, i] = await Promise.all([
        getJSON(`${DD}/cdn/${S.v}/data/tr_TR/champion.json`),
        getJSON(`${DD}/cdn/${S.v}/data/tr_TR/item.json`)
      ]);
      S.champs = c.data;
      for (const it of M.ITEMS) it.name = i.data[it.id] ? i.data[it.id].name : `Item ${it.id}`;
      $('loadNote').textContent = `${Object.keys(S.champs).length} şampiyon · yama ${S.v}`;
      updateIntro();
    } catch (e) {
      $('toDraft').textContent = 'Yüklenemedi';
      $('loadNote').textContent = 'Veriler alınamadı. Bağlantını kontrol edip sayfayı yenile.';
    }
  }

  // ---------- 1. giriş ----------
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
    $('pvName').textContent = name || 'Takımın';
    const ok = !!S.champs && name.length >= 2;
    $('toDraft').disabled = !ok;
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
    S.team.isUser = true;
    document.documentElement.style.setProperty('--team', S.team.color);
    refreshTeamBits();
    S.draft = { idx: 0, options: draftOptions(0), rerolls: 3 };
    renderDraft();
    show('draft');
  });

  // ---------- alt dizilim çubuğu ----------
  const lineup = document.createElement('div');
  lineup.className = 'lineup';
  lineup.hidden = true;
  lineup.innerHTML = '<div class="inner"><div class="slots" id="slots"></div><div id="lineupAction"></div></div>';
  document.body.appendChild(lineup);

  function renderLineup(activeIdx, action) {
    $('slots').innerHTML = M.ROLES.map((role, i) => {
      const r = S.team.roster[i];
      const dots = r && r.items.length ? `<div class="items-dots">${r.items.map(id => `<img src="${itemIcon(id)}" alt="">`).join('')}</div>` : '';
      return `<div class="slot${i === activeIdx ? ' on' : ''}" data-i="${i}">
        <div class="ico">${r ? `<img src="${icon(r.champ)}" alt="">` : ''}</div>
        <div class="txt"><small>${M.ROLE_SHORT[role]}</small><b>${r ? esc(r.champ.name) : '—'}</b>${dots}</div>
      </div>`;
    }).join('');
    $('lineupAction').innerHTML = action || '';
  }

  // ---------- 2. draft ----------
  function draftOptions(idx) {
    const taken = new Set(S.team.roster.slice(0, idx).map(r => r.champ.id));
    const pool = M.rolePool(M.ROLES[idx], S.champs).filter(id => !taken.has(id));
    return shuffle(pool).slice(0, 5).map(id => S.champs[id]);
  }

  function bar(label, v, color) {
    return `<div class="bar"><span>${label}</span><i style="--v:${v * 10}%;--bc:${color}"></i></div>`;
  }

  function renderDraft() {
    const { idx, options, rerolls } = S.draft;
    const role = M.ROLES[idx];
    $('draftSteps').innerHTML = M.ROLES.map((r, i) => `<span class="step${i === idx ? ' on' : i < idx ? ' done' : ''}">${M.ROLE_SHORT[r]}</span>`).join('');
    $('draftEyebrow').textContent = `Seçim ${idx + 1} / 5`;
    $('draftTitle').textContent = `${M.ROLE_NAMES[role]} için şampiyonunu seç`;
    $('reroll').textContent = `↻ Başka 5 göster (${rerolls})`;
    $('reroll').disabled = rerolls <= 0;
    $('draftBack').disabled = idx === 0;
    $('picks').innerHTML = options.map((c, i) => {
      const arch = M.archetype(c);
      return `<button class="pick" type="button" data-i="${i}">
        <div class="art"><img src="${loadingArt(c)}" alt="${esc(c.name)}"></div>
        <div class="meta">
          <div class="name">${esc(c.name)}</div>
          <div class="title">${esc(c.title)}</div>
          <div class="chips"><span class="chip gold">${M.ARCH_NAMES[arch]}</span><span class="chip">${c.stats.attackrange >= 300 ? 'Uzak menzil' : 'Yakın dövüş'}</span></div>
          <div class="bars">
            ${bar('Saldırı', c.info.attack, '#f59e0b')}
            ${bar('Savunma', c.info.defense, '#34d399')}
            ${bar('Büyü', c.info.magic, '#a78bfa')}
          </div>
        </div>
      </button>`;
    }).join('');
    renderLineup(idx);
  }

  $('picks').addEventListener('click', e => {
    const b = e.target.closest('.pick');
    if (!b) return;
    const c = S.draft.options[+b.dataset.i];
    const idx = S.draft.idx;
    S.team.roster[idx] = { role: M.ROLES[idx], champ: c, items: [] };
    S.team.roster.length = idx + 1;
    if (idx === 4) {
      S.itemIdx = 0;
      renderItems();
      show('items');
      return;
    }
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

  // ---------- 3. itemler ----------
  function fitInfo(r) {
    const arch = M.archetype(r.champ);
    const rec = M.RECOMMENDED[arch];
    const fit = r.items.filter(id => rec.includes(id)).length;
    const magic = arch === 'ap' || arch === 'apBruiser' || arch === 'enchanter';
    const physical = arch === 'adc' || arch === 'lethal' || arch === 'bruiser';
    let warn = '';
    const cats = r.items.map(id => M.ITEM_BY_ID[id].cat);
    if (magic && cats.some(c => c === 'crit' || c === 'lethal' || c === 'fighter')) warn = 'Bu şampiyon büyü hasarı vuruyor; saldırı gücü itemleri yeteneklerini güçlendirmez.';
    else if (physical && cats.includes('ap')) warn = 'Bu şampiyon fiziksel hasar vuruyor; yetenek gücü burada boşa gider.';
    else if (arch === 'enchanter' && !cats.includes('support') && r.items.length === 3) warn = 'Destek itemleri olmadan iyileştirmelerin zayıf kalır.';
    const labels = ['Uyumsuz', 'Zayıf', 'İyi', 'Mükemmel'];
    const colors = ['#f87171', '#fb923c', '#facc15', '#34d399'];
    return { fit, label: labels[fit], color: colors[fit], warn };
  }

  function renderItems() {
    const idx = S.itemIdx;
    const r = S.team.roster[idx];
    const c = r.champ;
    const arch = M.archetype(c);
    const rec = M.RECOMMENDED[arch];

    $('itemSteps').innerHTML = S.team.roster.map((x, i) =>
      `<button type="button" class="step${i === idx ? ' on' : x.items.length === 3 ? ' done' : ''}" data-i="${i}" style="cursor:pointer">${x.items.length === 3 ? '✓ ' : ''}${esc(x.champ.name)}</button>`).join('');

    const base = M.computeStats(c, []);
    const cur = M.computeStats(c, r.items);
    const stat = (label, a, b, f = v => fmt(v)) => {
      const diff = b - a;
      return `<div class="stat"><small>${label}</small><b>${f(b)}</b>${diff > 0.001 ? `<em>+${f(diff)}</em>` : ''}</div>`;
    };
    const fi = fitInfo(r);
    $('champPanel').innerHTML = `
      <div class="art"><img src="${splashArt(c)}" alt=""></div>
      <div class="body">
        <div class="eyebrow">${M.ROLE_NAMES[r.role]}</div>
        <h3>${esc(c.name)}</h3>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"><span class="chip gold">${M.ARCH_NAMES[arch]}</span><span class="chip">${c.stats.attackrange >= 300 ? 'Uzak menzil' : 'Yakın dövüş'}</span></div>
        <div class="desc">${M.ARCH_DESC[arch]}</div>
        <div class="stats">
          ${stat('Can', base.hp * 1.3, cur.hp * 1.3)}
          ${stat('Saldırı Gücü', base.ad, cur.ad)}
          ${stat('Yetenek Gücü', base.ap, cur.ap)}
          ${stat('Saldırı Hızı', base.as, cur.as, v => v.toFixed(2))}
          ${stat('Zırh', base.armor, cur.armor)}
          ${stat('Büyü Direnci', base.mr, cur.mr)}
          ${stat('Kritik', base.crit * 100, cur.crit * 100, v => `%${Math.round(v)}`)}
          ${stat('Can Çalma', base.ls * 100, cur.ls * 100, v => `%${Math.round(v)}`)}
        </div>
        <div class="fit">
          Item uyumu: <b style="color:${fi.color}">${r.items.length ? fi.label : '—'}</b>
          <div class="meter" style="--fc:${fi.color}">${[0, 1, 2].map(i => `<i class="${i < fi.fit ? 'on' : ''}"></i>`).join('')}</div>
          ${fi.warn ? `<div style="margin-top:8px;color:#fca5a5;font-size:12px;line-height:1.45">⚠ ${fi.warn}</div>` : ''}
        </div>
      </div>`;

    $('chosen').innerHTML = [0, 1, 2].map(i => {
      const id = r.items[i];
      if (!id) return `<div class="cslot">Boş slot ${i + 1}</div>`;
      const it = M.ITEM_BY_ID[id];
      return `<div class="cslot full" data-id="${id}" title="Çıkarmak için tıkla"><img src="${itemIcon(id)}" alt=""><div><b>${esc(it.name)}</b><div class="muted" style="font-size:11px">Çıkar ✕</div></div></div>`;
    }).join('');

    const tile = it => {
      const sel = r.items.includes(it.id);
      const dis = !sel && r.items.length >= 3;
      return `<button type="button" class="item${sel ? ' sel' : ''}" data-id="${it.id}" ${dis ? 'disabled' : ''}>
        <img src="${itemIcon(it.id)}" alt="" loading="lazy">
        <div><b>${esc(it.name)}</b><div class="st">${itemStatLine(it)}</div><div class="d">${esc(it.desc)}</div></div>
        ${rec.includes(it.id) ? '<span class="rec">★</span>' : ''}
      </button>`;
    };
    let html = `<div class="cat-title">★ ${M.ARCH_NAMES[arch]} için önerilen</div><div class="item-grid">${rec.map(id => tile(M.ITEM_BY_ID[id])).join('')}</div>`;
    for (const cat in M.ITEM_CATS) {
      const list = M.ITEMS.filter(it => it.cat === cat && !rec.includes(it.id));
      if (list.length) html += `<div class="cat-title">${M.ITEM_CATS[cat]}</div><div class="item-grid">${list.map(tile).join('')}</div>`;
    }
    $('itemCats').innerHTML = html;

    const allDone = S.team.roster.every(x => x.items.length === 3);
    const nextIdx = S.team.roster.findIndex((x, i) => i !== idx && x.items.length < 3);
    let action;
    if (allDone) action = '<button class="btn" id="startTour">Turnuvaya başla →</button>';
    else if (nextIdx < 0) action = '<button class="btn" disabled>3 item seç</button>';
    else action = `<button class="btn" id="nextChamp" ${r.items.length < 3 ? 'disabled' : ''}>Sonraki: ${esc(S.team.roster[nextIdx].champ.name)} →</button>`;
    renderLineup(idx, action);
  }

  function toggleItem(id) {
    const r = S.team.roster[S.itemIdx];
    const i = r.items.indexOf(id);
    if (i >= 0) r.items.splice(i, 1);
    else if (r.items.length < 3) r.items.push(id);
    renderItems();
  }

  function goNextChamp() {
    const next = S.team.roster.findIndex((x, i) => i !== S.itemIdx && x.items.length < 3);
    if (next >= 0) { S.itemIdx = next; renderItems(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }

  $('itemCats').addEventListener('click', e => {
    const b = e.target.closest('.item');
    if (b && !b.disabled) toggleItem(+b.dataset.id);
  });
  $('chosen').addEventListener('click', e => {
    const b = e.target.closest('.cslot.full');
    if (b) toggleItem(+b.dataset.id);
  });
  $('itemSteps').addEventListener('click', e => {
    const b = e.target.closest('.step');
    if (b) { S.itemIdx = +b.dataset.i; renderItems(); }
  });
  $('slots').addEventListener('click', e => {
    const b = e.target.closest('.slot');
    if (b && $('items').classList.contains('active') && S.team.roster[+b.dataset.i]) { S.itemIdx = +b.dataset.i; renderItems(); }
  });
  $('autoOne').addEventListener('click', () => {
    const r = S.team.roster[S.itemIdx];
    r.items = M.RECOMMENDED[M.archetype(r.champ)].slice(0, 3);
    renderItems();
  });
  $('autoAll').addEventListener('click', () => {
    for (const r of S.team.roster) {
      const rec = M.RECOMMENDED[M.archetype(r.champ)];
      for (const id of rec) if (r.items.length < 3 && !r.items.includes(id)) r.items.push(id);
    }
    renderItems();
  });
  lineup.addEventListener('click', e => {
    if (e.target.closest('#nextChamp')) goNextChamp();
    if (e.target.closest('#startTour')) startTournament();
  });

  // ---------- 4. turnuva ----------
  function aiTeam(name, tag, color) {
    const used = new Set();
    const roster = M.ROLES.map(role => {
      const pool = M.rolePool(role, S.champs).filter(id => !used.has(id));
      const id = pool[Math.floor(Math.random() * pool.length)];
      used.add(id);
      const champ = S.champs[id];
      let items = shuffle(M.RECOMMENDED[M.archetype(champ)]).slice(0, 3);
      // Yapay zeka arada bir yanlış item alır
      if (Math.random() < 0.25) items[2] = shuffle(M.ITEMS.filter(it => !items.includes(it.id)))[0].id;
      return { role, champ, items };
    });
    return { name, tag, color, roster };
  }

  function startTournament() {
    const colors = shuffle(COLORS.filter(c => c !== S.team.color));
    const names = shuffle(AI_TEAMS).slice(0, 7);
    const teams = shuffle([S.team, ...names.map(([n, t], i) => aiTeam(n, t, colors[i % colors.length]))]);
    S.tour = {
      teams,
      rounds: [[0, 1, 2, 3].map(i => ({ a: teams[i * 2], b: teams[i * 2 + 1], wins: [0, 0], winner: null }))],
      round: 0,
      alive: true,
      champion: null,
      path: [],
      stats: {}
    };
    S.team.roster.forEach(r => { S.tour.stats[r.champ.id] = { k: 0, d: 0, dmg: 0, heal: 0 }; });
    renderBracket();
    show('bracketScreen');
  }

  const simTeam = t => ({ name: t.name, color: t.color, roster: t.roster.map(r => ({ champ: r.champ, items: r.items, role: r.role })) });

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
        const row = (t, w) => {
          const cls = m.winner ? (m.winner === t ? ' w' : ' l') : '';
          return `<div class="mrow${cls}">${teamBadge(t, true)}<span class="n">${esc(t.name)}</span><span class="s">${m.winner || w ? w : ''}</span></div>`;
        };
        const me = m.a === S.team || m.b === S.team;
        cards.push(`<div class="match${me ? ' me' : ''}">${row(m.a, m.wins[0])}${row(m.b, m.wins[1])}</div>`);
      }
      return `<div class="round-col"><h3>${ROUND_NAMES[ri]} · ${BEST_OF[ri] === 1 ? 'Tek maç' : 'Bo' + BEST_OF[ri]}</h3>${cards.join('')}</div>`;
    });
    const champ = T.champion;
    cols.push(`<div class="round-col"><h3>Şampiyon</h3><div class="trophy"><div class="cup">🏆</div><b>${champ ? esc(champ.name) : '?'}</b></div></div>`);
    $('bracket').innerHTML = cols.join('');

    let stage;
    if (T.champion) stage = 'Turnuva bitti';
    else if (!T.alive) stage = 'Elendin';
    else stage = ROUND_NAMES[T.round];
    $('bracketStage').textContent = stage;

    const m = !T.champion && T.alive ? userMatch() : null;
    if (m) {
      const opp = m.a === S.team ? m.b : m.a;
      const icons = t => `<div class="icons">${t.roster.map(r => `<img src="${icon(r.champ)}" alt="${esc(r.champ.name)}" title="${esc(r.champ.name)} · ${M.ARCH_NAMES[M.archetype(r.champ)]}">`).join('')}</div>`;
      $('nextMatch').innerHTML = `
        <div class="next-card">
          <div class="side"><div class="tname">${teamBadge(S.team)}${esc(S.team.name)}</div>${icons(S.team)}</div>
          <div class="vs-big">VS<small>${ROUND_NAMES[T.round].toLocaleUpperCase('tr')} · ${BEST_OF[T.round] === 1 ? 'TEK MAÇ' : `${BEST_OF[T.round]} MAÇTA ${Math.ceil(BEST_OF[T.round] / 2)}`}</small></div>
          <div class="side r"><div class="tname">${teamBadge(opp)}${esc(opp.name)}</div>${icons(opp)}</div>
        </div>
        <div class="center-actions"><button class="btn" id="playMatch">Maça çık ⚔</button></div>`;
    } else if (!T.champion) {
      $('nextMatch').innerHTML = `<div class="center-actions"><button class="btn" id="simRest">Turnuvanın kalanını oynat</button></div>`;
    } else {
      $('nextMatch').innerHTML = `<div class="center-actions"><button class="btn" id="toEnd">Turnuva özeti →</button></div>`;
    }
  }

  $('bracketScreen').addEventListener('click', e => {
    if (e.target.closest('#playMatch')) startSeries();
    if (e.target.closest('#simRest')) {
      while (!S.tour.champion) finishRound();
      renderBracket();
    }
    if (e.target.closest('#toEnd')) renderEnd();
  });

  // ---------- 5. savaş ----------
  let series = null;
  let viewer = null;

  function startSeries() {
    const T = S.tour;
    const m = userMatch();
    const opp = m.a === S.team ? m.b : m.a;
    series = { m, opp, bo: BEST_OF[T.round], wins: [0, 0], game: 0 };
    show('battle');
    startGame();
  }

  function startGame() {
    series.game++;
    const sim = new M.Sim([simTeam(S.team), simTeam(series.opp)]);
    const teams = [S.team, series.opp];
    $('sbA').innerHTML = `${teamBadge(S.team)}<span class="tn">${esc(S.team.name)}</span><span class="k" id="kA">0</span>`;
    $('sbB').innerHTML = `${teamBadge(series.opp)}<span class="tn">${esc(series.opp.name)}</span><span class="k" id="kB">0</span>`;
    $('sbSeries').textContent = series.bo === 1
      ? `${ROUND_NAMES[S.tour.round]} · Tek maç`
      : `${ROUND_NAMES[S.tour.round]} · Maç ${series.game} · ${series.wins[0]}-${series.wins[1]}`;
    const rost = side => sim.units.filter(u => u.side === side).map(u =>
      `<div class="ru" style="--c:${teams[side].color}"><img src="${icon(u.champ)}" alt="${esc(u.champ.name)}"><div style="min-width:0;width:100%"><div class="hp"><i></i></div><div class="kd">0/0 · 0</div></div></div>`).join('');
    $('rostA').innerHTML = rost(0);
    $('rostB').innerHTML = rost(1);
    $('killfeed').innerHTML = '';
    $('ultHost').innerHTML = '';
    if (viewer) viewer.stop();
    viewer = new Viewer(sim, teams, onGameEnd);
  }

  $('speed').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    S.speed = +b.dataset.s;
    document.querySelectorAll('#speed button').forEach(x => x.classList.toggle('on', x === b));
    if (viewer) viewer.speed = S.speed;
  });
  $('skip').addEventListener('click', () => viewer && viewer.skip());

  function recordStats(sim) {
    for (const u of sim.units) {
      if (u.side !== 0) continue;
      const s = S.tour.stats[u.champ.id];
      s.k += u.kills; s.d += u.deaths; s.dmg += u.dmg; s.heal += u.heal;
    }
  }

  function statTable(sim, teams) {
    const maxDmg = Math.max(...sim.units.map(u => u.dmg), 1);
    const winners = sim.units.filter(u => u.side === sim.winner);
    const mvp = winners.reduce((b, u) => (u.dmg + u.kills * 400 + u.heal * 0.5 > b.dmg + b.kills * 400 + b.heal * 0.5 ? u : b), winners[0]);
    const rows = sim.units.map(u => `
      <tr>
        <td><div class="who" style="--c:${teams[u.side].color}"><img src="${icon(u.champ)}" alt=""><span>${esc(u.champ.name)}${u === mvp ? '<span class="mvp-tag">MVP</span>' : ''}</span></div></td>
        <td class="num">${u.kills} / ${u.deaths}</td>
        <td class="num">${fmt(u.dmg)}</td>
        <td style="width:30%"><div class="dbar" style="--c:${teams[u.side].color};width:${(u.dmg / maxDmg) * 100}%"></div></td>
      </tr>`).join('');
    return `<table class="stat-table"><thead><tr><th>Şampiyon</th><th>Ö / Ö</th><th>Hasar</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function overlay(html) {
    $('overlayHost').innerHTML = `<div class="overlay"><div class="modal">${html}</div></div>`;
  }
  function closeOverlay() { $('overlayHost').innerHTML = ''; }

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
      if (seriesWon && isFinal) title = '<span class="res-win">ŞAMPİYONSUN! 🏆</span>';
      else if (seriesWon) title = `<span class="res-win">${ROUND_NAMES[S.tour.round]} geçildi!</span>`;
      else title = '<span class="res-lose">Elendin</span>';
      sub = series.bo === 1
        ? `${esc(teams[sim.winner].name)} ${sim.kills[sim.winner]}-${sim.kills[1 - sim.winner]} skorla kazandı.`
        : `Seri sonucu: ${esc(S.team.tag)} ${series.wins[0]} - ${series.wins[1]} ${esc(series.opp.tag)}`;
      btn = seriesWon && isFinal ? '<button class="btn" id="seriesDone">Kupayı al →</button>' : '<button class="btn" id="seriesDone">Fikstüre dön →</button>';
    }
    overlay(`
      <div class="eyebrow">${ROUND_NAMES[S.tour.round]}${series.bo > 1 ? ` · Maç ${series.game}` : ''} · ${Math.floor(sim.t)} sn</div>
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
      const T = S.tour;
      const m = series.m;
      const userIsA = m.a === S.team;
      m.wins = userIsA ? [series.wins[0], series.wins[1]] : [series.wins[1], series.wins[0]];
      const won = series.wins[0] > series.wins[1];
      m.winner = won ? S.team : series.opp;
      T.path.push({ round: T.round, opp: series.opp, score: series.wins.slice(), won });
      finishRound();
      if (T.champion === S.team) { renderEnd(); return; }
      renderBracket();
      show('bracketScreen');
    }
  });

  // Arena çizimi
  function makeBackground(colors) {
    const c = document.createElement('canvas');
    c.width = M.W; c.height = M.H;
    const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, M.H);
    bg.addColorStop(0, '#0f1a1c');
    bg.addColorStop(1, '#0a1113');
    g.fillStyle = bg;
    g.fillRect(0, 0, M.W, M.H);
    // Takım bölgeleri
    [[0, colors[0]], [M.W, colors[1]]].forEach(([x, col]) => {
      const r = g.createRadialGradient(x, M.H / 2, 20, x, M.H / 2, 420);
      r.addColorStop(0, col + '30');
      r.addColorStop(1, col + '00');
      g.fillStyle = r;
      g.fillRect(0, 0, M.W, M.H);
    });
    // Nehir
    g.save();
    g.translate(M.W / 2, M.H / 2);
    g.rotate(-0.35);
    const rv = g.createLinearGradient(-60, 0, 60, 0);
    rv.addColorStop(0, 'rgba(60,140,200,0)');
    rv.addColorStop(0.5, 'rgba(60,140,200,0.14)');
    rv.addColorStop(1, 'rgba(60,140,200,0)');
    g.fillStyle = rv;
    g.fillRect(-60, -500, 120, 1000);
    g.restore();
    // Izgara
    g.strokeStyle = 'rgba(255,255,255,0.035)';
    g.lineWidth = 1;
    for (let x = 0; x <= M.W; x += 40) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, M.H); g.stroke(); }
    for (let y = 0; y <= M.H; y += 40) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(M.W, y + 0.5); g.stroke(); }
    // Çalılar
    g.fillStyle = 'rgba(40,90,60,0.25)';
    [[330, 70], [670, 490], [420, 500], [580, 60], [140, 470], [860, 90]].forEach(([x, y]) => {
      for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(x + i * 14 - 28, y + Math.sin(i) * 6, 16, 0, TAU); g.fill(); }
    });
    return c;
  }

  const RING_COLORS = { magic: '#b085ff', phys: '#f5a524', stun: '#facc15', heal: '#34d399', buff: '#ef4444', shield: '#e2e8f0', sun: '#fb923c' };

  class Viewer {
    constructor(sim, teams, onEnd) {
      this.sim = sim;
      this.teams = teams;
      this.colors = teams.map(t => t.color);
      this.onEnd = onEnd;
      this.speed = S.speed;
      this.canvas = $('arena');
      this.ctx = this.canvas.getContext('2d');
      this.bg = makeBackground(this.colors);
      this.floats = []; this.rings = []; this.slashes = []; this.dashes = [];
      this.acc = 0; this.doneFor = 0; this.ended = false; this.running = true; this.hudT = 0;
      this.last = performance.now();
      sim.units.forEach(u => img(icon(u.champ)));
      this.resize();
      this.onResize = () => this.resize();
      window.addEventListener('resize', this.onResize);
      requestAnimationFrame(this.frame);
    }

    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = this.canvas.clientWidth || M.W;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(w * M.H / M.W * dpr);
    }

    stop() {
      this.running = false;
      window.removeEventListener('resize', this.onResize);
    }

    skip() {
      if (this.ended) return;
      while (!this.sim.done) { this.sim.step(1 / 30); this.sim.events.length = 0; }
      this.ended = true;
      this.draw();
      this.hud(true);
      this.onEnd(this.sim);
    }

    frame = ts => {
      if (!this.running) return;
      const dt = Math.min(0.05, (ts - this.last) / 1000);
      this.last = ts;
      if (!this.sim.done) {
        this.acc += dt * this.speed;
        while (this.acc >= STEP && !this.sim.done) {
          this.sim.step(STEP);
          this.acc -= STEP;
          this.consume();
        }
      } else if (!this.ended) {
        this.doneFor += dt;
        if (this.doneFor > 1.4) { this.ended = true; this.onEnd(this.sim); }
      }
      this.tickFx(dt * Math.max(1, this.speed * 0.6));
      this.draw();
      this.hudT -= dt;
      if (this.hudT <= 0) { this.hudT = 0.1; this.hud(); }
      requestAnimationFrame(this.frame);
    };

    float(x, y, text, color, size = 14) {
      this.floats.push({ x: x + (Math.random() - 0.5) * 16, y: y - 26, text, color, size, life: 0.9, max: 0.9 });
    }

    consume() {
      for (const e of this.sim.events) {
        switch (e.t) {
          case 'hit':
            if (e.quiet) break;
            if (e.type === 'magic') this.float(e.x, e.y, fmt(e.amount), '#c9a7ff', e.crit ? 18 : 14);
            else if (e.type === 'true') this.float(e.x, e.y, fmt(e.amount), '#ffffff', 15);
            else this.float(e.x, e.y, fmt(e.amount) + (e.crit ? '!' : ''), e.crit ? '#ffb020' : '#ffe2b0', e.crit ? 19 : 13);
            break;
          case 'heal': this.float(e.x, e.y, '+' + fmt(e.amount), '#4ade80', 14); break;
          case 'ring': this.rings.push({ ...e, life: e.big ? 0.7 : 0.45, max: e.big ? 0.7 : 0.45 }); break;
          case 'slash': this.slashes.push({ x1: e.u.x, y1: e.u.y, x2: e.tg.x, y2: e.tg.y, color: this.colors[e.u.side], crit: e.crit, life: 0.16, max: 0.16 }); break;
          case 'dash': this.dashes.push({ x1: e.fromX, y1: e.fromY, x2: e.u.x, y2: e.u.y, color: this.colors[e.u.side], life: 0.4, max: 0.4 }); break;
          case 'block': this.float(e.u.x, e.u.y, 'ENGELLENDİ', '#cbd5e1', 12); break;
          case 'stasis': this.float(e.u.x, e.u.y, 'DOKUNULMAZ', '#f3d58a', 13); break;
          case 'revive':
            this.float(e.u.x, e.u.y, 'DİRİLDİ', '#f3d58a', 14);
            this.rings.push({ x: e.u.x, y: e.u.y, r: 60, color: 'shield', life: 0.6, max: 0.6 });
            break;
          case 'kill': this.killFeed(e.killer, e.victim); break;
          case 'ult': this.ultBanner(e.u); break;
        }
      }
      this.sim.events.length = 0;
    }

    killFeed(k, v) {
      const el = document.createElement('div');
      el.className = 'kf';
      el.innerHTML = `<img src="${icon(k.champ)}" style="--c:${this.colors[k.side]}" alt=""><span class="sw">⚔</span><img src="${icon(v.champ)}" style="--c:${this.colors[v.side]}" alt="">`;
      const feed = $('killfeed');
      feed.prepend(el);
      while (feed.children.length > 5) feed.lastChild.remove();
      setTimeout(() => el.remove(), 4500);
    }

    ultBanner(u) {
      $('ultHost').innerHTML = `<div class="ult-banner" style="--c:${this.colors[u.side]}"><img src="${icon(u.champ)}" alt="">${esc(u.champ.name.toLocaleUpperCase('tr'))} <span>ULTİ!</span></div>`;
    }

    tickFx(dt) {
      for (const list of [this.floats, this.rings, this.slashes, this.dashes]) {
        for (const f of list) f.life -= dt;
      }
      this.floats = this.floats.filter(f => f.life > 0);
      this.rings = this.rings.filter(f => f.life > 0);
      this.slashes = this.slashes.filter(f => f.life > 0);
      this.dashes = this.dashes.filter(f => f.life > 0);
    }

    draw() {
      const c = this.ctx, sim = this.sim;
      c.setTransform(this.canvas.width / M.W, 0, 0, this.canvas.height / M.H, 0, 0);
      c.drawImage(this.bg, 0, 0);

      for (const d of this.dashes) {
        const a = d.life / d.max;
        c.strokeStyle = d.color;
        c.globalAlpha = a * 0.7;
        c.lineWidth = 10 * a;
        c.lineCap = 'round';
        c.beginPath(); c.moveTo(d.x1, d.y1); c.lineTo(d.x2, d.y2); c.stroke();
      }
      c.globalAlpha = 1;

      for (const r of this.rings) {
        const p = 1 - r.life / r.max;
        c.globalAlpha = (1 - p) * 0.9;
        c.strokeStyle = RING_COLORS[r.color] || '#fff';
        c.lineWidth = r.big ? 4 : 2.5;
        c.beginPath(); c.arc(r.x, r.y, r.r * (0.4 + 0.6 * p), 0, TAU); c.stroke();
        c.globalAlpha = (1 - p) * 0.15;
        c.fillStyle = RING_COLORS[r.color] || '#fff';
        c.fill();
      }
      c.globalAlpha = 1;

      const units = sim.units.slice().sort((a, b) => (a.dead - b.dead) * -1 || a.y - b.y);
      for (const u of units) this.drawUnit(u);

      for (const p of sim.projs) {
        const dx = p.tg.x - p.x, dy = p.tg.y - p.y, d = Math.hypot(dx, dy) || 1;
        const col = p.kind === 'spell' ? (p.magic ? '#b085ff' : '#f5a524') : this.colors[p.side];
        const len = p.kind === 'spell' ? 22 : 12;
        c.strokeStyle = col;
        c.lineWidth = p.kind === 'spell' ? 5 : 2.5;
        c.lineCap = 'round';
        c.globalAlpha = 0.5;
        c.beginPath(); c.moveTo(p.x - dx / d * len, p.y - dy / d * len); c.lineTo(p.x, p.y); c.stroke();
        c.globalAlpha = 1;
        c.fillStyle = p.kind === 'spell' ? '#fff' : col;
        c.beginPath(); c.arc(p.x, p.y, p.kind === 'spell' ? 5 : 3, 0, TAU); c.fill();
      }

      for (const s of this.slashes) {
        const a = s.life / s.max;
        const ang = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
        c.strokeStyle = s.crit ? '#ffb020' : '#fff';
        c.globalAlpha = a;
        c.lineWidth = s.crit ? 4 : 2.5;
        c.beginPath(); c.arc(s.x2, s.y2, 18, ang + Math.PI - 0.9, ang + Math.PI + 0.9); c.stroke();
      }
      c.globalAlpha = 1;

      c.textAlign = 'center';
      c.textBaseline = 'middle';
      for (const f of this.floats) {
        const p = 1 - f.life / f.max;
        c.globalAlpha = Math.min(1, f.life / f.max * 2);
        c.font = `700 ${f.size}px "Chakra Petch", Inter, sans-serif`;
        c.lineWidth = 3;
        c.strokeStyle = 'rgba(0,0,0,0.75)';
        c.strokeText(f.text, f.x, f.y - p * 28);
        c.fillStyle = f.color;
        c.fillText(f.text, f.x, f.y - p * 28);
      }
      c.globalAlpha = 1;
    }

    drawUnit(u) {
      const c = this.ctx, sim = this.sim;
      const col = this.colors[u.side];
      const pic = img(icon(u.champ));
      c.save();
      c.globalAlpha = u.dead ? 0.3 : 1;
      c.fillStyle = 'rgba(0,0,0,0.4)';
      c.beginPath(); c.ellipse(u.x, u.y + u.r - 1, u.r * 0.95, 6, 0, 0, TAU); c.fill();

      c.save();
      c.beginPath(); c.arc(u.x, u.y, u.r, 0, TAU); c.clip();
      if (pic.complete && pic.naturalWidth) {
        if (u.dead) c.filter = 'grayscale(1)';
        c.drawImage(pic, u.x - u.r, u.y - u.r, u.r * 2, u.r * 2);
        c.filter = 'none';
      } else {
        c.fillStyle = col; c.fill();
      }
      if (u.stasis > 0) { c.fillStyle = 'rgba(243,213,138,0.55)'; c.fillRect(u.x - u.r, u.y - u.r, u.r * 2, u.r * 2); }
      c.restore();

      c.lineWidth = 3;
      c.strokeStyle = u.stasis > 0 ? '#f3d58a' : col;
      c.beginPath(); c.arc(u.x, u.y, u.r, 0, TAU); c.stroke();

      if (!u.dead) {
        if (u.shield > 1) {
          c.strokeStyle = 'rgba(226,232,240,0.85)';
          c.lineWidth = 2;
          c.beginPath(); c.arc(u.x, u.y, u.r + 4, 0, TAU); c.stroke();
        }
        if (sim.t < u.buffUntil) {
          c.strokeStyle = '#ef4444';
          c.lineWidth = 2;
          c.setLineDash([4, 4]);
          c.lineDashOffset = -sim.t * 30;
          c.beginPath(); c.arc(u.x, u.y, u.r + 7, 0, TAU); c.stroke();
          c.setLineDash([]);
        }
        if (u.stun > 0) {
          c.fillStyle = '#facc15';
          for (let i = 0; i < 3; i++) {
            const a = sim.t * 6 + i * TAU / 3;
            c.beginPath(); c.arc(u.x + Math.cos(a) * 12, u.y - u.r - 22 + Math.sin(a) * 4, 2.5, 0, TAU); c.fill();
          }
        }
        const bw = 50, bh = 6, bx = u.x - bw / 2, by = u.y - u.r - 14;
        c.fillStyle = 'rgba(0,0,0,0.7)';
        c.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
        const hpw = bw * Math.max(0, u.hp) / u.maxHp;
        c.fillStyle = col;
        c.fillRect(bx, by, hpw, bh);
        if (u.shield > 1) {
          c.fillStyle = '#e2e8f0';
          c.fillRect(bx + hpw, by, Math.min(bw - hpw, bw * u.shield / u.maxHp), bh);
        }
        c.fillStyle = u.energy >= 95 ? '#f3d58a' : 'rgba(212,173,85,0.7)';
        c.fillRect(bx, by + bh + 1, bw * Math.min(1, u.energy / 100), 2);
      }
      c.restore();
    }

    hud(force) {
      const sim = this.sim;
      $('kA').textContent = sim.kills[0];
      $('kB').textContent = sim.kills[1];
      const t = Math.floor(sim.t);
      $('sbClock').textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
      [0, 1].forEach(side => {
        const els = $(side ? 'rostB' : 'rostA').children;
        sim.units.filter(u => u.side === side).forEach((u, i) => {
          const el = els[i];
          if (!el) return;
          el.classList.toggle('dead', u.dead);
          el.querySelector('.hp i').style.width = `${Math.max(0, u.hp / u.maxHp) * 100}%`;
          el.querySelector('.kd').textContent = `${u.kills}/${u.deaths} · ${fmt(u.dmg)}`;
        });
      });
    }
  }

  // ---------- 6. son ekran ----------
  function renderEnd() {
    const T = S.tour;
    const won = T.champion === S.team;
    const lastRound = T.path.length ? T.path[T.path.length - 1].round : 0;
    const stageText = ['çeyrek finalde', 'yarı finalde', 'finalde'][lastRound];
    const entries = S.team.roster.map(r => ({ r, s: T.stats[r.champ.id] }));
    const score = e => e.s.dmg + e.s.k * 400 + e.s.heal * 0.5;
    const mvp = entries.reduce((b, e) => (score(e) > score(b) ? e : b), entries[0]);

    const hero = won
      ? `<div class="cup">🏆</div><div class="eyebrow">Mayhem Ligi şampiyonu</div><h1>${esc(S.team.name)}</h1><p>Bütün rakipleri devirdin. Kupa senin.</p>`
      : `<div class="cup">${lastRound === 2 ? '🥈' : '⚔️'}</div><div class="eyebrow">Turnuva bitti</div><h1>${esc(S.team.name)}</h1><p>${stageText.charAt(0).toLocaleUpperCase('tr') + stageText.slice(1)} elendin. Şampiyon: <b style="color:var(--text)">${esc(T.champion.name)}</b></p>`;

    const path = T.path.map(p => `
      <div class="p">
        <span class="r">${ROUND_NAMES[p.round]}</span>
        ${teamBadge(p.opp, true)}<span>${esc(p.opp.name)}</span>
        <span class="sc" style="color:${p.won ? 'var(--win)' : 'var(--lose)'}">${p.score[0]}-${p.score[1]}</span>
      </div>`).join('');

    const rows = entries.map(e => `
      <tr>
        <td><div class="who" style="--c:${S.team.color}"><img src="${icon(e.r.champ)}" alt=""><span>${esc(e.r.champ.name)}${e === mvp ? '<span class="mvp-tag">MVP</span>' : ''}</span></div></td>
        <td class="num">${e.s.k} / ${e.s.d}</td>
        <td class="num">${fmt(e.s.dmg)}</td>
        <td><div style="display:flex;gap:3px">${e.r.items.map(id => `<img src="${itemIcon(id)}" alt="" title="${esc(M.ITEM_BY_ID[id].name)}" style="width:22px;height:22px;border-radius:4px">`).join('')}</div></td>
      </tr>`).join('');

    $('endWrap').innerHTML = `
      <div class="end-hero">${hero}</div>
      <div class="end-grid">
        <div class="mvp-card">
          <div class="art"><img src="${loadingArt(mvp.r.champ)}" alt=""></div>
          <div class="body">
            <span class="chip gold">Turnuva MVP'si</span>
            <h3>${esc(mvp.r.champ.name)}</h3>
            <div class="stats">
              <div class="stat"><small>Skor / Ölüm</small><b>${mvp.s.k} / ${mvp.s.d}</b></div>
              <div class="stat"><small>Toplam hasar</small><b>${fmt(mvp.s.dmg)}</b></div>
            </div>
          </div>
        </div>
        <div>
          <div class="cat-title" style="margin-top:0">Turnuva yolu</div>
          <div class="path">${path}</div>
          <div class="cat-title">Kadro istatistikleri</div>
          <table class="stat-table" style="margin-top:0"><thead><tr><th>Şampiyon</th><th>Ö / Ö</th><th>Hasar</th><th>Itemler</th></tr></thead><tbody>${rows}</tbody></table>
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
    const cols = [S.team.color, '#f3d58a', '#ffffff', '#d4ad55'];
    box.innerHTML = Array.from({ length: 90 }, () => {
      const d = 2.5 + Math.random() * 3;
      return `<i style="left:${Math.random() * 100}%;background:${cols[Math.floor(Math.random() * cols.length)]};animation-duration:${d}s;animation-delay:${Math.random() * 1.5}s"></i>`;
    }).join('');
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
