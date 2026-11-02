// Mayhem savaş motoru v2: DOM'a dokunmaz, tarayıcıda da Node'da da çalışır.
(function (root) {
  const D = root.MayhemData;
  const W = 1400, H = 800, LEVEL = 16;
  const REALM = { x: W / 2, y: -700, r: 170 };
  const RANGE_SCALE = 0.38, MS_SCALE = 0.5, HP_MULT = 1.6;
  const TAU = Math.PI * 2;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);

  // Data Dragon item.json'dan gelen statlar buraya yüklenir
  const ITEMS = {};
  function setItemData(itemJson) {
    for (const id in D.ITEM_FX) {
      const src = itemJson.data[id];
      if (!src) continue;
      ITEMS[id] = { id: +id, name: src.name, plaintext: src.plaintext || '', stats: src.stats || {}, gold: src.gold ? src.gold.total : 0, ...D.ITEM_FX[id] };
    }
  }

  const MAGIC_CLASSES = { apAssassin: 1, mage: 1, battlemage: 1, apBruiser: 1, enchanter: 1, mageSup: 1, tank: 1, engage: 1 };
  const lvGrowth = per => per * (LEVEL - 1) * (0.7025 + 0.0175 * (LEVEL - 1));

  function computeStats(champ, loadout) {
    const s = champ.stats;
    const st = {
      hp: s.hp + lvGrowth(s.hpperlevel),
      ad: s.attackdamage + lvGrowth(s.attackdamageperlevel || 3),
      bonusAd: 0, ap: 0,
      armor: s.armor + lvGrowth(s.armorperlevel),
      mr: s.spellblock + lvGrowth(s.spellblockperlevel),
      asBonus: lvGrowth(s.attackspeedperlevel || 2) / 100,
      asBase: s.attackspeed,
      crit: 0, ls: 0, ah: 0, msFlat: 0, msPct: 0,
      range: s.attackrange, leth: 0, mpenFlat: 0, fx: {}
    };
    const items = loadout.items || [];
    for (const id of items) {
      const it = ITEMS[id];
      if (!it) continue;
      const k = it.stats;
      st.hp += k.FlatHPPoolMod || 0;
      st.bonusAd += k.FlatPhysicalDamageMod || 0;
      st.ap += k.FlatMagicDamageMod || 0;
      st.armor += k.FlatArmorMod || 0;
      st.mr += k.FlatSpellBlockMod || 0;
      st.asBonus += k.PercentAttackSpeedMod || 0;
      st.crit += k.FlatCritChanceMod || 0;
      st.ls += k.PercentLifeStealMod || 0;
      st.msFlat += k.FlatMovementSpeedMod || 0;
      st.msPct += k.PercentMovementSpeedMod || 0;
      st.ah += it.ah || 0;
      for (const key in it.fx || {}) st.fx[key] = (st.fx[key] || 0) + it.fx[key];
    }
    if (st.fx.yuntal) st.crit += 0.25;
    if (st.fx.muramana) st.bonusAd += 60;
    const sec = D.SECONDARY[loadout.secondary];
    if (sec) {
      const b = sec.bonus;
      st.asBonus += b.as || 0;
      st.hp += b.hp || 0; st.armor += b.armor || 0; st.mr += b.mr || 0;
      st.ah += b.ah || 0;
      st.fx.leth = (st.fx.leth || 0) + (b.leth || 0);
      st.fx.mpenFlat = (st.fx.mpenFlat || 0) + (b.mpenFlat || 0);
      if (b.adaptive) { if (st.ap > st.bonusAd) st.ap += 30; else st.bonusAd += 18; }
      if (b.triumph) st.fx.triumph = b.triumph;
      if (b.taste) st.fx.taste = 1;
      if (b.summCd) st.fx.summCd = (st.fx.summCd || 0) + b.summCd;
    }
    st.crit = Math.min(1, st.crit);
    if (st.fx.rabadon) st.ap *= 1 + st.fx.rabadon;
    st.ad += st.bonusAd;
    st.as = Math.min(2.5, st.asBase * (1 + st.asBonus));
    st.ms = (s.movespeed + st.msFlat) * (1 + st.msPct);
    st.range += st.fx.rangeBonus || 0;
    return st;
  }

  class Sim {
    constructor(teams, opts = {}) {
      this.t = 0;
      this.units = [];
      this.projs = [];
      this.zones = [];
      this.beams = [];
      this.tethers = [];
      this.timers = [];
      this.events = [];
      this.done = false;
      this.winner = -1;
      this.kills = [0, 0];
      this.teams = teams;
      this.focus = [null, null];
      this.manual = opts.manual || [false, false];
      this.ultRequests = new Set();
      this.nextUid = 0;
      teams.forEach((team, side) => team.roster.forEach((m, i) => this.units.push(this.makeUnit(m, side, i))));
    }

    // ---------- kurulum ----------
    makeUnit(m, side, i) {
      const st = computeStats(m.champ, m);
      const cls = D.classOf(m.champ);
      const pos = {
        top: [400, 260], jungle: [340, 600], mid: [330, 420], adc: [200, 380], support: [250, 500]
      }[m.role] || [300, 200 + i * 100];
      const x = side ? W - pos[0] : pos[0];
      const y = pos[1] + rnd(-25, 25);
      const u = {
        uid: this.nextUid++, side, champ: m.champ, role: m.role, cls, st, items: m.items || [],
        keystone: m.keystone, summs: (m.summs || []).slice(), ult: D.ultOf(m.champ), ultName: m.ultName || 'Ulti', ultIcon: m.ultIcon,
        x, y, r: 28, facing: side ? Math.PI : 0,
        maxHp: st.hp * HP_MULT, hp: st.hp * HP_MULT, shields: [],
        ranged: st.range >= 300, rangePx: st.range * RANGE_SCALE,
        atkCd: rnd(0, 0.4), qCd: rnd(1.5, 3), eCd: rnd(3, 6),
        energy: rnd(0, 15), ultTime: rnd(11, 15), ultReadySince: -1,
        power: 0.85 + 0.03 * (MAGIC_CLASSES[cls] ? m.champ.info.magic : m.champ.info.attack),
        st0: st,
        // durumlar
        stun: 0, root: 0, sleep: 0, suppress: 0, stasis: 0, banish: 0, untarget: 0, invis: 0,
        fear: null, charm: null, berserk: 0, slowAmt: 0, slowUntil: 0, air: null, dash: null,
        realm: 0, inside: null, hidden: false,
        buffs: [], mod: null,
        dead: false, reviveAt: 0, deathT: 0,
        target: null, retarget: 0, lastHurt: -10, lastHurtBy: {}, attacks: 0, hitsOn: {},
        spellblade: false, shred: 0, grievousUntil: 0, exhaustedUntil: 0, vulnUntil: 0,
        rune: { stacks: 0, cd: 0, conqUntil: 0, lethal: 0, lethalUntil: 0, hail: 3, fleet: 0, grasp: 0, guardian: 0, first: 0, harvest: 0, aftershock: 0, electro: [] },
        used: {}, summCd: {}, history: [], histT: 0,
        kills: 0, deaths: 0, assists: 0, dmg: 0, taken: 0, heal: 0, cc: 0,
        // çizim ipuçları
        flash: 0, lunge: 0, scale: 1
      };
      this.recalc(u);
      return u;
    }

    recalc(u) {
      const m = { ad: 0, as: 0, ms: 0, armor: 0, mr: 0, dr: 0, scale: 1, range: 0, ls: 0, amp: 0, unstoppable: false, undying: false, invuln: false, trueHit: 0, pierce: false, every3: 0, drain: 0, aura: 0, healAura: 0, hpRegen: 0 };
      for (const b of u.buffs) {
        m.ad += b.ad || 0; m.as += b.as || 0; m.ms += b.ms || 0; m.armor += b.armor || 0; m.mr += b.mr || 0;
        m.dr = 1 - (1 - m.dr) * (1 - (b.dr || 0));
        m.scale = Math.max(m.scale, b.scale || 1);
        m.range += b.range || 0; m.ls += b.ls || 0; m.amp += b.amp || 0;
        m.unstoppable = m.unstoppable || !!b.unstoppable;
        m.undying = m.undying || !!b.undying;
        m.invuln = m.invuln || !!b.invuln;
        m.trueHit += b.trueHit || 0; m.pierce = m.pierce || !!b.pierce;
        m.every3 = Math.max(m.every3, b.every3 || 0);
        m.drain = Math.max(m.drain, b.drain || 0);
        m.aura += b.aura || 0; m.healAura += b.healAura || 0; m.hpRegen += b.regen || 0;
      }
      const classDr = { assassin: 0.15, apAssassin: 0.12, fighter: 0.05 }[u.cls] || 0;
      m.dr = 1 - (1 - m.dr) * (1 - classDr);
      u.mod = m;
      u.scale = m.scale;
      u.r = 28 * m.scale;
    }

    addBuff(u, b) {
      b.until = this.t + b.dur;
      if (b.key) u.buffs = u.buffs.filter(x => x.key !== b.key);
      if (b.hp) {
        const add = u.maxHp * b.hp;
        u.maxHp += add; u.hp += add;
        b._hpAdd = add;
      }
      u.buffs.push(b);
      this.recalc(u);
    }

    emit(e) { this.events.push(e); }
    later(delay, fn) { this.timers.push({ at: this.t + delay, fn }); }

    sameRealm(a, b) { return a.realm === b.realm; }
    targetable(o) { return !o.dead && o.stasis <= 0 && o.banish <= 0 && o.untarget <= 0 && o.invis <= 0 && !o.inside && !(o.dash && o.dash.untargetable); }
    alliesOf(u, all) { return this.units.filter(o => o.side === u.side && !o.dead && this.sameRealm(u, o) && (all || !o.isPet)); }
    enemiesOf(u, all) { return this.units.filter(o => o.side !== u.side && !o.dead && this.sameRealm(u, o) && (all || this.targetable(o))); }
    champs(side) { return this.units.filter(o => o.side === side && !o.isPet); }

    // ---------- statlar ----------
    ad(u) { return u.st.ad * (1 + u.mod.ad) + (u.rune.hubris || 0) + (u.st.fx.taste ? 0 : 0); }
    bonusAd(u) { return u.st.bonusAd + u.st.ad * u.mod.ad + (u.rune.hubris || 0); }
    ap(u) { return u.st.ap; }
    as(u) {
      let bonus = u.mod.as + (u.rune.lethal || 0) * 0.06;
      if (u.st.fx.yuntal && this.t < 4) bonus += 0.5;
      if (u.keystone === 9923 && u.rune.hail > 0) bonus += 1.1;
      if (this.t < (u.asBuffUntil || 0)) bonus += u.asBuffAmt || 0;
      let as = u.st.asBase * (1 + u.st.asBonus + bonus);
      if (this.frozenNear(u)) as *= 0.8;
      return Math.min(3, as);
    }
    ms(u) {
      let ms = u.st.ms * (1 + u.mod.ms);
      if (this.t < (u.msBuffUntil || 0)) ms *= 1 + (u.msBuffAmt || 0);
      if (this.t < u.slowUntil) ms *= 1 - u.slowAmt * (1 - (u.st.fx.slowResist || 0));
      if (this.t < u.exhaustedUntil) ms *= 0.7;
      return ms * MS_SCALE;
    }
    armor(u) {
      let a = u.st.armor * (1 + u.mod.armor);
      if (u.st.fx.jaksho && this.t > 5) a *= 1 + u.st.fx.jaksho;
      if (this.t < u.rune.aftershockUntil) a += 35 + 0.4 * (a);
      return a;
    }
    mr(u) {
      let m = u.st.mr * (1 + u.mod.mr);
      if (u.st.fx.jaksho && this.t > 5) m *= 1 + u.st.fx.jaksho;
      if (u.st.fx.forceOfNature) m *= 1 + Math.min(0.35, (u.fonStacks || 0) * 0.05);
      if (this.t < u.rune.aftershockUntil) m += 35 + 0.4 * m;
      return m;
    }
    rangePx(u) { return u.rangePx + u.mod.range * RANGE_SCALE; }
    frozenNear(u) { return this.units.some(o => o.side !== u.side && !o.dead && o.st.fx.frozenHeart && dist(o, u) < 220); }
    isMagic(u) { return !!MAGIC_CLASSES[u.cls]; }

    abilityBase(u) {
      if (u.cls === 'tank' || u.cls === 'engage') return (150 + u.maxHp * 0.035 + u.st.ap * 0.4) * u.power;
      if (this.isMagic(u)) return (170 + 0.75 * this.ap(u)) * u.power;
      return (140 + 1.0 * this.bonusAd(u)) * u.power;
    }
    ultBase(u) {
      if (u.cls === 'tank' || u.cls === 'engage') return (220 + u.maxHp * 0.05 + u.st.ap * 0.5) * u.power;
      if (this.isMagic(u)) return (300 + 0.9 * this.ap(u)) * u.power;
      return (260 + 1.25 * this.bonusAd(u)) * u.power;
    }
    healBase(u) { return (180 + 0.6 * this.ap(u) + u.maxHp * 0.02) * (1 + (u.st.fx.moonstone || 0)); }
    ultType(u) { return this.isMagic(u) ? 'magic' : 'physical'; }

    abilityCd(u, base) { return base * 100 / (100 + u.st.ah) * rnd(0.9, 1.1); }

    // ---------- döngü ----------
    step(dt) {
      if (this.done) return;
      this.t += dt;
      for (let i = this.timers.length - 1; i >= 0; i--) {
        if (this.timers[i].at <= this.t) { const tm = this.timers.splice(i, 1)[0]; tm.fn(); }
      }
      for (const u of this.units) this.updateUnit(u, dt);
      this.updateProjs(dt);
      this.updateZones(dt);
      this.updateBeams();
      this.tethers = this.tethers.filter(t => t.until > this.t && !t.a.dead && !t.b.dead);
      this.separate();
      this.checkEnd();
    }

    updateUnit(u, dt) {
      if (u.dead) {
        if (u.reviveAt && this.t >= u.reviveAt) this.revive(u, u.reviveHp || 0.5);
        return;
      }
      if (u.isPet && this.t > u.expires) { this.petExpire(u); return; }

      // süreli durumlar
      for (const k of ['stun', 'root', 'sleep', 'suppress', 'stasis', 'banish', 'untarget', 'invis', 'berserk']) if (u[k] > 0) u[k] -= dt;
      if (u.banish <= 0 && u.banished) { u.banished = false; this.emit({ t: 'return', u }); }
      if (u.fear && this.t > u.fear.until) u.fear = null;
      if (u.charm && this.t > u.charm.until) u.charm = null;
      if (u.flash > 0) u.flash -= dt;
      if (u.lunge > 0) u.lunge -= dt;
      if (u.buffs.some(b => b.until <= this.t)) {
        for (const b of u.buffs) if (b.until <= this.t && b._hpAdd) { u.maxHp -= b._hpAdd; u.hp = Math.min(u.hp, u.maxHp); }
        const ending = u.buffs.filter(b => b.until <= this.t);
        u.buffs = u.buffs.filter(b => b.until > this.t);
        this.recalc(u);
        for (const b of ending) if (b.onEnd) b.onEnd();
      }
      u.shields = u.shields.filter(s => s.until > this.t && s.a > 0);

      // geçmiş (Ekko için)
      u.histT -= dt;
      if (u.histT <= 0) { u.histT = 0.25; u.history.push({ x: u.x, y: u.y, hp: u.hp, t: this.t }); if (u.history.length > 14) u.history.shift(); }

      this.passiveTicks(u, dt);
      if (u.dead) return;

      if (u.inside) { this.updateInside(u, dt); return; }
      if (u.dash) { this.updateDash(u, dt); return; }
      if (u.air) {
        u.air.t += dt;
        if (u.air.t >= u.air.dur) u.air = null;
        return;
      }
      if (u.stasis > 0 || u.banish > 0 || u.stun > 0 || u.sleep > 0 || u.suppress > 0) return;
      if (u.channel && this.t < u.channel.until) return;

      if (u.fear) { this.moveAway(u, u.fear.from, dt); return; }
      if (u.charm) { this.moveToward(u, u.charm.to, dt, 0); return; }

      if (!u.isPet) {
        u.energy += dt * 100 / u.ultTime;
        this.summonerLogic(u);
      }
      u.atkCd -= dt; u.qCd -= dt; u.eCd -= dt;
      u.retarget -= dt;

      const tg = this.chooseTarget(u);
      if (!tg) {
        // Hedef yoksa takımın ortasına doğru yürü
        return;
      }
      u.target = tg;
      const d = dist(u, tg);
      u.facing = Math.atan2(tg.y - u.y, tg.x - u.x);

      if (!u.isPet) {
        if (u.energy >= 100) {
          if (u.ultReadySince < 0) { u.ultReadySince = this.t; this.emit({ t: 'ultReady', u }); }
          const manual = this.manual[u.side];
          const wants = !manual || this.ultRequests.has(u.uid) || this.t - u.ultReadySince > 6;
          if (wants && this.canUlt(u, tg, d)) { this.ultRequests.delete(u.uid); this.castUlt(u, tg); return; }
        }
        if (u.qCd <= 0 && d < Math.max(this.rangePx(u) + 60, 260)) { u.qCd = this.abilityCd(u, this.qBase(u)); this.castQ(u, tg); }
        if (u.eCd <= 0) { const used = this.castE(u, tg, d); if (used) u.eCd = this.abilityCd(u, this.eBase(u)); else u.eCd = 0.5; }
        if (u.dash || u.dead) return;
      }

      const reach = this.rangePx(u) + u.r + tg.r;
      if (d > reach) {
        if (u.root <= 0) this.moveToward(u, tg, dt, reach - 2);
      } else {
        if (u.ranged && u.root <= 0 && !u.isPet) this.kite(u, dt);
        if (u.atkCd <= 0) {
          u.atkCd = 1 / this.as(u);
          this.basicAttack(u, tg);
        }
      }
      this.clampPos(u);
    }

    clampPos(u) {
      if (u.realm) {
        const dx = u.x - REALM.x, dy = u.y - REALM.y, d = Math.hypot(dx, dy);
        if (d > REALM.r - u.r) { u.x = REALM.x + dx / d * (REALM.r - u.r); u.y = REALM.y + dy / d * (REALM.r - u.r); }
        return;
      }
      u.x = clamp(u.x, 40, W - 40);
      u.y = clamp(u.y, 90, H - 60);
      if (u.cage && this.t < u.cage.until) {
        const c = u.cage, dx = u.x - c.x, dy = u.y - c.y, d = Math.hypot(dx, dy);
        if (d > c.r - u.r) { u.x = c.x + dx / d * (c.r - u.r); u.y = c.y + dy / d * (c.r - u.r); }
      }
    }

    moveToward(u, p, dt, stopAt) {
      const d = dist(u, p);
      if (d <= stopAt) return;
      const sp = Math.min(this.ms(u) * dt, d - stopAt);
      u.x += (p.x - u.x) / d * sp;
      u.y += (p.y - u.y) / d * sp;
      u.facing = Math.atan2(p.y - u.y, p.x - u.x);
      this.clampPos(u);
    }

    moveAway(u, p, dt) {
      const d = dist(u, p) || 1;
      u.x += (u.x - p.x) / d * this.ms(u) * 0.8 * dt;
      u.y += (u.y - p.y) / d * this.ms(u) * 0.8 * dt;
      this.clampPos(u);
    }

    kite(u, dt) {
      const melee = this.enemiesOf(u).find(o => !o.ranged && dist(u, o) < 110);
      if (!melee) return;
      const d = dist(u, melee) || 1;
      const sp = this.ms(u) * 0.45 * dt;
      // geri ve hafif yana
      const nx = (u.x - melee.x) / d, ny = (u.y - melee.y) / d;
      u.x += (nx - ny * 0.4) * sp;
      u.y += (ny + nx * 0.4) * sp;
      this.clampPos(u);
    }

    chooseTarget(u) {
      if (u.berserk > 0) {
        const allies = this.alliesOf(u).filter(o => o !== u && this.targetable(o));
        if (allies.length) return allies.sort((a, b) => dist(u, a) - dist(u, b))[0];
      }
      if (u.target && !u.target.dead && this.targetable(u.target) && this.sameRealm(u, u.target) && u.target.side !== u.side && u.retarget > 0) return u.target;
      u.retarget = 1;
      const foes = this.enemiesOf(u);
      if (!foes.length) return null;
      if (u.realm && u.realmFoe && !u.realmFoe.dead) return u.realmFoe;
      const f = this.focus[u.side];
      if (f && this.t < f.until && f.u && !f.u.dead && foes.includes(f.u) && u.cls !== 'enchanter') return f.u;
      let best = null, score = Infinity;
      for (const o of foes) {
        let s = dist(u, o);
        if (u.cls === 'assassin' || u.cls === 'apAssassin') s = s * 0.5 + o.hp * 0.25 - (o.ranged ? 350 : 0);
        else if (u.ranged) s -= (1 - o.hp / o.maxHp) * 160;
        if (o.isPet) s += 220;
        if (s < score) { score = s; best = o; }
      }
      return best;
    }

    // ---------- pasifler, rün ve item tıkları ----------
    passiveTicks(u, dt) {
      const fx = u.st.fx;
      if (fx.warmog && this.t - u.lastHurt > 3 && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * fx.warmog * dt);
      if (u.mod.hpRegen) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * u.mod.hpRegen * dt);
      u.auraTick = (u.auraTick || 0) - dt;
      if (u.auraTick <= 0) {
        u.auraTick = 1;
        const burn = (fx.sunfire ? fx.sunfire + (u.maxHp - u.champ.stats.hp) * 0.015 : 0) + (u.mod.aura || 0) * u.power * 2;
        if (burn > 0) {
          const near = this.enemiesOf(u, true).filter(o => dist(u, o) < 150);
          for (const o of near) this.damage(u, o, burn, 'magic', { quiet: true, aoe: true });
          if (near.length) this.emit({ t: 'pulse', x: u.x, y: u.y, r: 150, color: u.mod.aura ? '#ef4444' : '#fb923c', u });
        }
        if (fx.despair) {
          const near = this.enemiesOf(u, true).filter(o => dist(u, o) < 160);
          for (const o of near) this.damage(u, o, 25 + u.maxHp * 0.01, 'magic', { quiet: true, aoe: true });
          if (near.length) this.heal(u, u, 30 + u.maxHp * 0.007 * near.length, true);
        }
        if (u.mod.drain) {
          const near = this.enemiesOf(u, true).filter(o => dist(u, o) < u.mod.drain);
          let tot = 0;
          for (const o of near) tot += this.damage(u, o, 60 + 0.15 * this.ap(u), 'magic', { quiet: true, aoe: true });
          this.heal(u, u, tot * 0.6, true);
          for (const o of near) this.emit({ t: 'drain', from: o, to: u, color: '#ef4444' });
        }
        if (u.mod.healAura) {
          for (const a of this.alliesOf(u)) if (dist(a, u) < 200) this.heal(u, a, a.maxHp * u.mod.healAura, true);
        }
      }
      // yanmalar
      if (u.burns && u.burns.length) {
        for (const b of u.burns) {
          b.left -= dt; b.acc += dt;
          if (b.acc >= 0.5) { b.acc -= 0.5; this.damage(b.src, u, b.dps * 0.5, b.type || 'magic', { quiet: true, dot: true }); if (u.dead) return; }
        }
        u.burns = u.burns.filter(b => b.left > 0);
      }
      if (u.rune.cd > 0) u.rune.cd -= dt;
      if (u.rune.lethalUntil && this.t > u.rune.lethalUntil) u.rune.lethal = 0;
    }

    // ---------- sihirdar büyüleri ----------
    summonerLogic(u) {
      if (!u.summs.length) return;
      const pct = u.hp / u.maxHp;
      const foes = this.enemiesOf(u);
      const near = foes.filter(o => dist(u, o) < 200);
      const ready = id => u.summs.includes(id) && !(u.summCd[id] > this.t);
      const use = (id, cd) => { u.summCd[id] = this.t + cd * (1 - (u.st.fx.summCd || 0) - (u.keystone === 8360 ? 0.25 : 0)); this.emit({ t: 'summ', u, id }); };

      if (ready('SummonerBarrier') && pct < 0.28 && near.length) {
        use('SummonerBarrier', 60);
        this.addShield(u, u, 120 + 22 * LEVEL, 2.5);
      }
      if (ready('SummonerHeal') && pct < 0.3 && near.length) {
        use('SummonerHeal', 60);
        this.heal(u, u, 80 + 18 * LEVEL);
        const ally = this.alliesOf(u).filter(a => a !== u && dist(a, u) < 350).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (ally) this.heal(u, ally, 80 + 18 * LEVEL);
        u.msBuffUntil = this.t + 1; u.msBuffAmt = 0.3;
      }
      if (ready('SummonerFlash')) {
        if (pct < 0.22 && near.some(o => !o.ranged || dist(u, o) < 120)) {
          use('SummonerFlash', 120);
          const c = near[0];
          const d = dist(u, c) || 1;
          this.blink(u, u.x + (u.x - c.x) / d * 200, u.y + (u.y - c.y) / d * 200);
        } else if ((u.cls === 'assassin' || u.cls === 'engage' || u.cls === 'tank') && u.target && !u.target.dead) {
          const d = dist(u, u.target);
          if (d > 160 && d < 300 && this.t > 3 && u.energy >= 100) {
            use('SummonerFlash', 120);
            this.blink(u, u.target.x - (u.target.x - u.x) / d * 60, u.target.y - (u.target.y - u.y) / d * 60);
          }
        }
      }
      if (ready('SummonerDot')) {
        const low = foes.find(o => !o.isPet && dist(u, o) < 260 && o.hp / o.maxHp < 0.4);
        if (low) {
          use('SummonerDot', 90);
          this.addBurn(u, low, (70 + 20 * LEVEL) / 5, 5, 'true');
          low.grievousUntil = this.t + 5;
          this.emit({ t: 'ignite', u: low });
        }
      }
      if (ready('SummonerExhaust')) {
        const diver = foes.find(o => !o.isPet && (o.cls === 'assassin' || o.cls === 'apAssassin' || o.cls === 'fighter' || o.cls === 'marksman') && dist(u, o) < 300 && this.alliesOf(u).some(a => dist(a, o) < 140));
        if (diver) {
          use('SummonerExhaust', 90);
          diver.exhaustedUntil = this.t + 3;
          this.emit({ t: 'exhaust', u: diver });
        }
      }
      if (ready('SummonerSmite') && u.target && dist(u, u.target) < 200 && !u.target.isPet) {
        use('SummonerSmite', 15);
        this.damage(u, u.target, 160, 'true', {});
        this.slow(u.target, 0.2, 2);
        this.emit({ t: 'smite', u: u.target });
      }
      if (ready('SummonerHaste') && u.target && dist(u, u.target) > 280) {
        use('SummonerHaste', 120);
        u.msBuffUntil = this.t + 5; u.msBuffAmt = 0.4;
      }
    }

    // ---------- temel saldırı ----------
    basicAttack(u, tg) {
      u.attacks++;
      u.lunge = 0.14;
      if (u.keystone === 9923 && u.rune.hail > 0) u.rune.hail--;
      if (u.keystone === 8008) { u.rune.lethal = Math.min(6, u.rune.lethal + 1); u.rune.lethalUntil = this.t + 4; }
      let crit = Math.random() < u.st.crit;
      if (u.st.fx.sundered && !u.hitsOn['sk' + tg.uid]) { u.hitsOn['sk' + tg.uid] = 1; crit = true; this.heal(u, u, (u.st.ad - u.st.bonusAd) * 1 + (u.maxHp - u.hp) * 0.06); }
      const critMult = 1.75 + (u.st.fx.critDmg || 0);
      let dmg = this.ad(u) * (crit ? critMult : 1);
      const spellblade = u.spellblade;
      u.spellblade = false;
      const hit = () => {
        if (tg.dead || !this.sameRealm(u, tg)) return;
        const tgts = [tg];
        this.onHit(u, tg, dmg, crit, spellblade);
        if (u.mod.pierce) {
          for (const o of this.enemiesOf(u)) if (o !== tg && this.distToSeg(o, u, tg) < 40 && dist(u, o) < dist(u, tg) + 80) this.damage(u, o, dmg * 0.6, 'physical', { basic: true, quiet: true });
        }
        if (u.st.fx.bolts && u.ranged) {
          const others = this.enemiesOf(u).filter(o => o !== tg && dist(o, u) < this.rangePx(u) + 60).slice(0, u.st.fx.bolts);
          for (const o of others) { this.emit({ t: 'shot', from: u, to: o, color: '#fde68a', small: true }); this.damage(u, o, dmg * 0.55, 'physical', { basic: true, quiet: true }); }
        }
        return tgts;
      };
      if (u.ranged) this.shoot(u, tg, { speed: 1300, kind: 'attack', crit, color: u.isPet ? '#fbbf24' : null, onHit: hit });
      else { this.emit({ t: 'swing', u, tg, crit }); hit(); }
    }

    onHit(u, tg, dmg, crit, spellblade) {
      const fx = u.st.fx;
      // Guinsoo: her 3. saldırıda isabet etkileri iki kez
      const times = fx.guinsoo && u.attacks % 3 === 0 ? 2 : 1;
      this.damage(u, tg, dmg, 'physical', { basic: true, crit });
      if (tg.dead) return;
      for (let i = 0; i < times; i++) {
        if (fx.botrk) this.damage(u, tg, Math.max(20, tg.hp * fx.botrk), 'physical', { basic: true, quiet: true, onhit: true });
        if (fx.onhitMagic) this.damage(u, tg, fx.onhitMagic, 'magic', { quiet: true, onhit: true });
        if (fx.nashor) this.damage(u, tg, fx.nashor + 0.2 * this.ap(u), 'magic', { quiet: true, onhit: true });
        if (fx.terminus) { tg.shred = Math.min(0.3, tg.shred + 0.03); }
        if (u.mod.trueHit) this.damage(u, tg, tg.maxHp * u.mod.trueHit, 'true', { quiet: true, onhit: true });
      }
      if (fx.kraken && u.attacks % 3 === 0) this.damage(u, tg, fx.kraken, 'true', {});
      if (fx.statikk && u.attacks % 3 === 0) {
        const chain = [tg, ...this.enemiesOf(u).filter(o => o !== tg && dist(o, tg) < 250).slice(0, 3)];
        chain.forEach((o, i) => { this.damage(u, o, fx.statikk, 'magic', { quiet: i > 0 }); if (i) this.emit({ t: 'zap', from: chain[i - 1], to: o }); });
      }
      if (u.mod.every3 && u.attacks % 3 === 0) {
        this.emit({ t: 'pulse', x: tg.x, y: tg.y, r: 90, color: '#fbbf24', u });
        for (const o of this.enemiesOf(u)) if (dist(o, tg) < 90) this.damage(u, o, this.ultBase(u) * u.mod.every3, 'magic', { aoe: true });
      }
      if (spellblade) {
        if (fx.spellblade) this.damage(u, tg, (u.st.ad - u.st.bonusAd) * fx.spellblade, 'physical', { quiet: true });
        if (fx.lichbane) this.damage(u, tg, 100 + 0.4 * this.ap(u), 'magic', {});
        if (fx.iceborn) { this.slow(tg, 0.5, 2); this.emit({ t: 'pulse', x: tg.x, y: tg.y, r: 120, color: '#bae6fd', u }); }
      }
      if (fx.eclipse) {
        u.hitsOn['ec' + tg.uid] = (u.hitsOn['ec' + tg.uid] || 0) + 1;
        if (u.hitsOn['ec' + tg.uid] % 2 === 0 && !(u.eclipseCd > this.t)) {
          u.eclipseCd = this.t + 6;
          this.damage(u, tg, tg.maxHp * fx.eclipse, 'physical', { quiet: true });
          this.addShield(u, u, 100 + 0.3 * this.bonusAd(u), 2);
        }
      }
      if (fx.titanic) {
        for (const o of this.enemiesOf(u)) if (dist(o, tg) < 110) this.damage(u, o, u.maxHp * fx.titanic, 'physical', { quiet: true, aoe: true });
      }
      if (fx.cleave && !u.ranged) {
        for (const o of this.enemiesOf(u)) if (o !== tg && dist(o, tg) < 100) this.damage(u, o, dmg * fx.cleave, 'physical', { quiet: true, aoe: true });
      }
      if (fx.heartsteel && !(u.heartCd > this.t)) {
        u.heartCd = this.t + 4;
        this.damage(u, tg, 70 + u.maxHp * 0.06, 'physical', {});
        u.maxHp += 15; u.hp += 15;
      }
      if (fx.deadman && !u.hitsOn.dm) { u.hitsOn.dm = 1; this.damage(u, tg, 150, 'magic', {}); this.slow(tg, 0.5, 1); }
      if (fx.voltaic && u.attacks % 5 === 0) { this.damage(u, tg, 120, 'physical', {}); this.slow(tg, 0.9, 0.75); this.emit({ t: 'zap', from: u, to: tg }); }
      this.runeOnHit(u, tg, 'attack');
    }

    // ---------- yetenekler ----------
    qBase(u) { return { marksman: 7, onhit: 6, caster: 4.5, assassin: 6, apAssassin: 5, mage: 5, battlemage: 4, apBruiser: 5, fighter: 5, tank: 7, engage: 8, enchanter: 5, mageSup: 5 }[u.cls] || 6; }
    eBase(u) { return { marksman: 12, onhit: 9, caster: 10, assassin: 9, apAssassin: 9, mage: 12, battlemage: 11, apBruiser: 11, fighter: 10, tank: 11, engage: 11, enchanter: 7, mageSup: 11 }[u.cls] || 11; }

    castQ(u, tg) {
      const A = this.abilityBase(u);
      const type = this.isMagic(u) ? 'magic' : 'physical';
      const color = type === 'magic' ? '#b48cff' : '#f5a524';
      switch (u.cls) {
        case 'marksman':
        case 'onhit':
          this.shoot(u, tg, { speed: 1600, kind: 'spell', color: '#fde68a', big: true, onHit: () => {
            const crit = Math.random() < u.st.crit;
            this.damage(u, tg, (A * 0.5 + this.ad(u) * 1.1) * (crit ? 1.6 : 1), 'physical', { ability: true, crit });
            this.afterAbility(u, tg);
          } });
          break;
        case 'caster':
          this.skillshot(u, tg, { width: 40, speed: 1500, color: '#fde047', dmg: A * 1.15, type: 'physical', length: this.rangePx(u) + 200 });
          break;
        case 'mage':
        case 'mageSup':
        case 'battlemage':
          this.shoot(u, tg, { speed: 900, kind: 'spell', color, big: true, onHit: () => {
            this.emit({ t: 'blast', x: tg.x, y: tg.y, r: 90, color });
            for (const o of this.enemiesOf(u)) if (dist(o, tg) < 90 + o.r) this.damage(u, o, A, 'magic', { ability: true, aoe: true });
            this.afterAbility(u, tg);
          } });
          break;
        case 'assassin':
        case 'apAssassin':
          this.damage(u, tg, A * (u.cls === 'assassin' ? 1.9 : 1.5), type, { ability: true });
          this.emit({ t: 'slash', u, tg, color, big: true });
          this.afterAbility(u, tg);
          break;
        case 'fighter':
        case 'apBruiser': {
          this.emit({ t: 'blast', x: u.x, y: u.y, r: 110, color });
          let total = 0;
          for (const o of this.enemiesOf(u)) if (dist(o, u) < 110 + o.r) total += this.damage(u, o, A * 0.9, type, { ability: true, aoe: true });
          this.heal(u, u, total * 0.25 + u.maxHp * 0.02);
          this.afterAbility(u, tg);
          break;
        }
        case 'tank':
        case 'engage':
          this.damage(u, tg, A * 0.8, 'magic', { ability: true });
          this.cc(u, tg, 'stun', u.cls === 'engage' ? 1.1 : 0.9);
          this.emit({ t: 'blast', x: tg.x, y: tg.y, r: 60, color: '#facc15' });
          this.afterAbility(u, tg);
          break;
        case 'enchanter': {
          const hurt = this.mostHurt(u, 450);
          if (hurt && hurt.hp / hurt.maxHp < 0.9) {
            this.heal(u, hurt, this.healBase(u) * 0.8);
            this.supportProcs(u, hurt);
            this.emit({ t: 'link', from: u, to: hurt, color: '#86efac' });
          } else {
            this.shoot(u, tg, { speed: 900, kind: 'spell', color: '#c4b5fd', big: true, onHit: () => { this.damage(u, tg, A * 0.6, 'magic', { ability: true }); this.afterAbility(u, tg); } });
          }
          break;
        }
      }
    }

    // E: hareket / kontrol / koruma. Kullanıldıysa true döner
    castE(u, tg, d) {
      const A = this.abilityBase(u);
      switch (u.cls) {
        case 'assassin':
        case 'apAssassin':
        case 'fighter':
          if (d > this.rangePx(u) + 70 && d < 380) {
            this.dashTo(u, tg.x - (tg.x - u.x) / d * (u.r + tg.r), tg.y - (tg.y - u.y) / d * (u.r + tg.r), { dur: 0.22, style: 'dash', color: u.cls === 'apAssassin' ? '#b48cff' : '#f5a524' });
            if (u.cls === 'fighter') this.later(0.22, () => this.cc(u, tg, 'slow', 0.4, 1.5));
            else this.addBuff(u, { key: 'evade', dur: 1.8, dr: 0.4 });
            return true;
          }
          return false;
        case 'onhit':
        case 'marksman':
        case 'caster': {
          const threat = this.enemiesOf(u).find(o => !o.ranged && dist(o, u) < 130);
          if (threat) {
            const dd = dist(u, threat) || 1;
            this.dashTo(u, u.x + (u.x - threat.x) / dd * 150, u.y + (u.y - threat.y) / dd * 150, { dur: 0.2, style: 'roll' });
            return true;
          }
          return false;
        }
        case 'mage':
        case 'mageSup':
        case 'battlemage':
          if (d < this.rangePx(u) + 100) {
            this.skillshot(u, tg, { width: 50, speed: 1100, color: '#c084fc', dmg: A * 0.6, type: 'magic', root: 1.2, length: this.rangePx(u) + 160 });
            return true;
          }
          return false;
        case 'apBruiser':
        case 'tank':
          if (d < 400 && d > 140) {
            this.dashTo(u, tg.x - (tg.x - u.x) / d * (u.r + tg.r), tg.y - (tg.y - u.y) / d * (u.r + tg.r), { dur: 0.3, style: 'dash', onEnd: () => { this.cc(u, tg, 'knockup', 0.6); this.damage(u, tg, A * 0.6, 'magic', { ability: true }); } });
            return true;
          }
          this.addShield(u, u, u.maxHp * 0.08 + this.ap(u) * 0.3, 3);
          return true;
        case 'engage': {
          if (d < 420) {
            this.skillshot(u, tg, { width: 50, speed: 1300, color: '#5eead4', dmg: A * 0.5, type: 'magic', stun: 1, length: 440, hook: true });
            return true;
          }
          const carry = this.alliesOf(u).filter(a => a !== u).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
          if (carry) { this.addShield(u, carry, 120 + u.maxHp * 0.04, 3); return true; }
          return false;
        }
        case 'enchanter': {
          const ally = this.alliesOf(u).filter(a => dist(a, u) < 450).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
          if (ally && this.enemiesOf(u).some(o => dist(o, ally) < 300)) {
            this.addShield(u, ally, this.healBase(u) * 0.8, 3);
            this.supportProcs(u, ally);
            this.emit({ t: 'link', from: u, to: ally, color: '#e2e8f0' });
            return true;
          }
          return false;
        }
      }
      return false;
    }

    afterAbility(u, tg) {
      const fx = u.st.fx;
      if (fx.spellblade || fx.lichbane || fx.iceborn) u.spellblade = true;
      if (tg && !tg.dead) {
        if (fx.burn) this.addBurn(u, tg, tg.maxHp * fx.burn, 3, 'magic');
        if (fx.slow) this.slow(tg, fx.slow, 1);
        if (fx.luden && !(u.ludenCd > this.t)) { u.ludenCd = this.t + 3; this.damage(u, tg, fx.luden + 0.1 * this.ap(u), 'magic', { quiet: true }); }
        if (fx.grievous) tg.grievousUntil = this.t + 3;
        if (fx.stormsurge && !(u.stormCd > this.t) && tg.hp / tg.maxHp < 0.6) { u.stormCd = this.t + 8; this.later(0.8, () => { if (!tg.dead) { this.emit({ t: 'zap', from: { x: tg.x, y: tg.y - 300 }, to: tg }); this.damage(u, tg, 150 + 0.15 * this.ap(u), 'magic', {}); } }); }
        this.runeOnHit(u, tg, 'ability');
      }
      if (fx.navori) u.qCd -= 1;
    }

    runeOnHit(u, tg, kind) {
      const r = u.rune, k = u.keystone;
      if (tg.isPet) return;
      if (k === 8010) {
        r.stacks = Math.min(12, r.stacks + (kind === 'ability' ? 2 : 1));
        r.conqUntil = this.t + 5;
      } else if (k === 8005 && kind === 'attack') {
        r['pta' + tg.uid] = (r['pta' + tg.uid] || 0) + 1;
        if (r['pta' + tg.uid] === 3) { this.damage(u, tg, 60 + 10 * LEVEL, this.isMagic(u) ? 'magic' : 'physical', {}); tg.vulnUntil = this.t + 6; this.emit({ t: 'rune', u: tg, color: '#fbbf24' }); }
      } else if (k === 8112 && r.cd <= 0) {
        r.electro = r.electro.filter(e => e.t > this.t - 3 && e.uid === tg.uid);
        r.electro.push({ t: this.t, uid: tg.uid });
        if (r.electro.length >= 3) {
          r.cd = 8; r.electro = [];
          this.emit({ t: 'zap', from: { x: tg.x, y: tg.y - 220 }, to: tg, color: '#f43f5e' });
          this.damage(u, tg, 50 + 12 * LEVEL + 0.4 * this.bonusAd(u) + 0.25 * this.ap(u), this.isMagic(u) ? 'magic' : 'physical', {});
        }
      } else if (k === 8128 && r.cd <= 0 && tg.hp / tg.maxHp < 0.5) {
        r.cd = 6;
        this.emit({ t: 'rune', u: tg, color: '#7f1d1d' });
        this.damage(u, tg, 60 + 12 * r.harvest + 0.25 * this.bonusAd(u) + 0.15 * this.ap(u), this.isMagic(u) ? 'magic' : 'physical', {});
      } else if (k === 8214 && kind === 'ability' && r.cd <= 0) {
        r.cd = 2;
        this.emit({ t: 'aery', from: u, to: tg });
        this.damage(u, tg, 40 + 6 * LEVEL + 0.2 * this.ap(u) + 0.1 * this.bonusAd(u), 'magic', { quiet: true });
      } else if (k === 8229 && kind === 'ability' && r.cd <= 0) {
        r.cd = 7;
        this.emit({ t: 'comet', x: tg.x, y: tg.y });
        this.later(0.8, () => { if (!tg.dead) this.damage(u, tg, 50 + 10 * LEVEL + 0.35 * this.ap(u) + 0.2 * this.bonusAd(u), 'magic', {}); });
      } else if (k === 8230 && r.cd <= 0) {
        r.phase = (r.phase || 0) + 1;
        if (r.phase >= 3) { r.phase = 0; r.cd = 10; u.msBuffUntil = this.t + 3; u.msBuffAmt = 0.45; this.emit({ t: 'rune', u, color: '#a78bfa' }); }
      } else if (k === 8992 && kind === 'ability') {
        this.addBurn(u, tg, 20 + 0.03 * this.ap(u), 3, 'magic');
      } else if (k === 8437 && kind === 'attack' && r.grasp <= this.t) {
        r.grasp = this.t + 4;
        this.damage(u, tg, u.maxHp * 0.04, 'magic', {});
        this.heal(u, u, u.maxHp * 0.02 + 10, true);
        u.maxHp += 6; u.hp += 6;
        this.emit({ t: 'rune', u, color: '#4ade80' });
      } else if (k === 8021 && kind === 'attack') {
        r.fleet++;
        if (r.fleet >= 5) { r.fleet = 0; this.heal(u, u, 60 + 0.3 * this.bonusAd(u) + 0.2 * this.ap(u)); u.msBuffUntil = this.t + 1; u.msBuffAmt = 0.2; }
      } else if (k === 8369 && r.first <= this.t) {
        r.first = this.t + 10; r.firstUntil = this.t + 3;
      }
    }

    supportProcs(u, ally) {
      const fx = u.st.fx;
      if (fx.ardent && ally !== u) { ally.asBuffUntil = this.t + 4; ally.asBuffAmt = fx.ardent; }
      if (fx.flowing && ally !== u) { ally.flowUntil = this.t + 4; }
      if (fx.helia) {
        const e = this.enemiesOf(u).sort((a, b) => dist(a, ally) - dist(b, ally))[0];
        if (e && dist(e, ally) < 300) { this.emit({ t: 'zap', from: ally, to: e, color: '#fde68a' }); this.damage(u, e, 60 + 0.2 * this.ap(u), 'magic', { quiet: true }); }
      }
      if (u.keystone === 8214 && u.rune.cd <= 0) { u.rune.cd = 2; this.emit({ t: 'aery', from: u, to: ally }); this.addShield(u, ally, 40 + 5 * LEVEL + 0.2 * this.ap(u), 2); }
    }

    mostHurt(u, range) {
      return this.alliesOf(u).filter(a => dist(a, u) < range).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    }

    // ---------- ulti ----------
    canUlt(u, tg, d) {
      const [type, o] = u.ult;
      if (o.global || type === 'team' || type === 'transform' || type === 'steal') return true;
      if (type === 'summon') return d < 500;
      if (type === 'possess' || type === 'execute') return d < 520 && tg.hp / tg.maxHp < 0.75;
      if (type === 'realm') return d < 320;
      return d < 560;
    }

    requestUlt(uid) { this.ultRequests.add(uid); }

    castUlt(u, tg, stolen) {
      const [type, o] = stolen || u.ult;
      u.energy = 0;
      u.ultReadySince = -1;
      u.ultTime = rnd(20, 26) * (u.st.fx.malignance ? 0.8 : 1) * 100 / (100 + u.st.ah * 0.5);
      if (!stolen) this.emit({ t: 'ult', u, type });
      this.ultCount = (this.ultCount || 0) + 1;
      const A = this.ultBase(u) * (o.dmg || 1.5);
      const dtype = o.trueDmg ? 'true' : this.ultType(u);
      const handler = this['ult_' + type];
      if (handler) handler.call(this, u, tg, o, A, dtype);
      if (u.st.fx.zeke) { const a = this.alliesOf(u).find(x => x !== u && x.ranged); if (a) { a.asBuffUntil = this.t + 6; a.asBuffAmt = 0.25; } }
      if (u.st.fx.malignance) {
        const z = tg;
        this.addZone(u, { x: z.x, y: z.y, r: 110, dur: 3, ticks: 6, color: '#7c3aed', onTick: (zz, tgts) => tgts.forEach(t => this.damage(u, t, 30 + 0.1 * this.ap(u), 'magic', { quiet: true, aoe: true })) });
      }
    }

    // Ultinin hedef seçimi yardımcıları
    densest(u, radius, pool) {
      const list = pool || this.enemiesOf(u);
      if (!list.length) return null;
      let best = list[0], n = -1;
      for (const a of list) {
        const c = list.filter(b => dist(a, b) < radius).length + (a.isPet ? -0.5 : 0);
        if (c > n) { n = c; best = a; }
      }
      return best;
    }
    lowest(u, pool) { return (pool || this.enemiesOf(u)).filter(o => !o.isPet).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] || null; }
    farthest(u) { return this.enemiesOf(u).filter(o => !o.isPet).sort((a, b) => dist(u, b) - dist(u, a))[0] || null; }

    applyUltCc(u, o, t) {
      if (o.stun) this.cc(u, t, 'stun', o.stun);
      if (o.knockup) this.cc(u, t, 'knockup', o.knockup);
      if (o.root) this.cc(u, t, 'root', o.root);
      if (o.slow) this.cc(u, t, 'slow', o.slow, 2);
      if (o.fear) this.cc(u, t, 'fear', o.fear, u);
      if (o.charm) this.cc(u, t, 'charm', o.charm, u);
      if (o.sleep) this.cc(u, t, 'sleep', o.sleep);
      if (o.berserk) this.cc(u, t, 'berserk', o.berserk);
    }

    ult_missile(u, tg, o, A, dtype) {
      const shots = o.shots || 1;
      for (let i = 0; i < shots; i++) {
        this.later((o.delay || 0) + i * (o.interval || 0), () => {
          if (u.dead) return;
          let target = tg;
          if (o.global) target = this.lowest(u) || tg;
          if (!target || target.dead || !this.targetable(target)) target = this.chooseTarget(u);
          if (!target) return;
          const last = i === shots - 1;
          const mult = (last && o.lastMult ? o.lastMult : 1);
          if (o.line) {
            this.skillshot(u, target, {
              width: o.width || 70, speed: o.speed || 1200, color: o.color, ult: true, length: o.global ? 1700 : 900,
              dmg: A * mult, type: dtype, root: o.root, stun: o.stun, missing: o.missing, returns: o.returns
            });
            if (o.recoil) { const d = dist(u, target) || 1; this.dashTo(u, u.x - (target.x - u.x) / d * o.recoil, u.y - (target.y - u.y) / d * o.recoil, { dur: 0.2, style: 'roll' }); }
            return;
          }
          if (o.sky) {
            const x = target.x, y = target.y;
            this.emit({ t: 'telegraph', x, y, r: o.aoe || 80, dur: 0.6, color: o.color });
            this.later(0.6, () => {
              this.emit({ t: 'impact', x, y, r: o.aoe || 80, color: o.color, big: shots === 1, sky: true });
              for (const t of this.enemiesOf(u)) if (Math.hypot(t.x - x, t.y - y) < (o.aoe || 80) + t.r) {
                this.damage(u, t, A * mult * this.missingMult(t, o.missing), dtype, { ult: true, ability: true, aoe: true });
                this.applyUltCc(u, o, t);
              }
            });
            return;
          }
          let bounces = o.bounce || 0;
          const fire = (from, t2) => {
            this.shoot(from, t2, {
              speed: o.speed || 1000, kind: 'ult', color: o.color, width: o.width || (o.shark ? 30 : 14), big: true, global: !!o.global,
              onHit: () => {
                const r = o.aoe || 0;
                if (r) {
                  this.emit({ t: 'impact', x: t2.x, y: t2.y, r, color: o.color, big: shots === 1, shark: o.shark });
                  for (const x of this.enemiesOf(u)) if (dist(x, t2) < r + x.r) {
                    this.damage(u, x, A * mult * this.missingMult(x, o.missing), dtype, { ult: true, ability: true, aoe: true });
                    this.applyUltCc(u, o, x);
                  }
                } else {
                  this.emit({ t: 'impact', x: t2.x, y: t2.y, r: 50, color: o.color });
                  this.damage(u, t2, A * mult * this.missingMult(t2, o.missing), dtype, { ult: true, ability: true });
                  this.applyUltCc(u, o, t2);
                }
                if (o.spread) for (const x of this.enemiesOf(u)) if (x !== t2 && dist(x, t2) < o.spread) { this.emit({ t: 'link', from: t2, to: x, color: o.color }); this.cc(u, x, 'root', o.root); }
                if (o.burstAfter) this.later(o.burstAfter, () => { this.emit({ t: 'impact', x: t2.x, y: t2.y, r: o.aoe, color: o.color }); for (const x of this.enemiesOf(u)) if (dist(x, t2) < o.aoe) this.damage(u, x, A * 0.5, dtype, { ult: true, aoe: true }); });
                if (o.burn) this.addBurn(u, t2, 40 + 0.05 * this.ap(u), 4, 'magic');
                this.afterAbility(u, t2);
                if (bounces-- > 1) {
                  const nx = this.enemiesOf(u).filter(x => x !== t2 && dist(x, t2) < 350)[0];
                  if (nx) fire(t2, nx);
                }
              }
            });
          };
          fire(u, target);
        });
      }
    }

    missingMult(t, k) { return k ? 1 + k * (1 - t.hp / t.maxHp) : 1; }

    ult_beam(u, tg, o, A, dtype) {
      const len = o.global ? 1800 : (o.length || 700);
      const ang = Math.atan2(tg.y - u.y, tg.x - u.x);
      const x2 = u.x + Math.cos(ang) * len, y2 = u.y + Math.sin(ang) * len;
      const beam = { x1: u.x, y1: u.y, x2, y2, width: o.width || 100, color: o.color, at: this.t + (o.delay || 0.5), until: this.t + (o.delay || 0.5) + 0.35, wave: o.wave, owner: u, fired: false };
      const fire = () => {
        const hits = this.enemiesOf(u).filter(t => this.distToSeg(t, { x: beam.x1, y: beam.y1 }, { x: beam.x2, y: beam.y2 }) < beam.width / 2 + t.r);
        for (const t of hits) {
          this.damage(u, t, A * (o.channel ? 0.33 : 1), dtype, { ult: true, ability: true, aoe: true });
          this.applyUltCc(u, o, t);
        }
        if (o.shieldAllies) for (const a of this.alliesOf(u)) if (this.distToSeg(a, { x: beam.x1, y: beam.y1 }, { x: beam.x2, y: beam.y2 }) < beam.width / 2 + a.r) this.addShield(u, a, A * o.shieldAllies, 3);
        if (o.healSelf) this.heal(u, u, A * o.healSelf);
        if (o.dashThrough) {
          const far = Math.min(len, 500);
          this.dashTo(u, u.x + Math.cos(ang) * far, u.y + Math.sin(ang) * far, { dur: 0.25, style: 'dash', color: o.color, untargetable: true });
        }
        if (hits[0]) this.afterAbility(u, hits[0]);
      };
      if (o.channel) {
        u.channel = { until: this.t + o.channel };
        for (let i = 0; i < 3; i++) {
          const b = { ...beam, at: this.t + (o.delay || 0.3) + i * (o.channel / 3), until: this.t + (o.delay || 0.3) + (i + 1) * (o.channel / 3) };
          b.fire = fire;
          this.beams.push(b);
        }
      } else {
        beam.fire = fire;
        this.beams.push(beam);
      }
      this.emit({ t: 'beamCharge', u, color: o.color });
    }

    updateBeams() {
      for (const b of this.beams) {
        if (!b.fired && this.t >= b.at) { b.fired = true; b.fire(); this.emit({ t: 'beamFire', b }); }
      }
      this.beams = this.beams.filter(b => this.t < b.until);
    }

    ult_engage(u, tg, o, A, dtype) {
      let dest;
      if (o.toAlly) {
        const ally = this.alliesOf(u).filter(a => a !== u).sort((a, b) => this.enemiesOf(u).filter(e => dist(e, b) < 250).length - this.enemiesOf(u).filter(e => dist(e, a) < 250).length)[0];
        dest = ally || this.densest(u, o.radius) || tg;
      } else if (o.backline) dest = this.farthest(u) || tg;
      else if (o.lock) dest = this.lowest(u) || tg;
      else if (o.far) dest = this.farthest(u) || tg;
      else dest = this.densest(u, o.radius || 160) || tg;
      const land = () => {
        if (u.dead) return;
        this.emit({ t: 'impact', x: u.x, y: u.y, r: o.radius || 150, color: o.color, big: true, shake: 10 });
        const hits = this.enemiesOf(u, o.lock).filter(t => dist(t, u) < (o.radius || 150) + t.r || (o.lock && t === dest));
        for (const t of hits) {
          this.damage(u, t, A, dtype, { ult: true, ability: true, aoe: true });
          this.applyUltCc(u, o, t);
        }
        if (o.shieldAllies) for (const a of this.alliesOf(u)) if (dist(a, u) < (o.radius || 150) + 60) this.addShield(u, a, a.maxHp * o.shieldAllies, 3);
        if (o.shield) this.addShield(u, u, u.maxHp * o.shield, 3);
        if (o.selfBuff) this.addBuff(u, { key: 'ult', dur: 5, as: o.selfBuff, ad: 0.15, ms: 0.2 });
        if (o.after) this.addBuff(u, { key: 'ult', dur: o.after.dur, hp: o.after.hp, scale: o.after.scale });
        if (o.blackout) for (const e of this.enemiesOf(u, true)) e.blindUntil = this.t + o.blackout;
        if (o.knockOthers) for (const t of this.enemiesOf(u)) if (t !== dest && dist(t, u) < 100) this.cc(u, t, 'knockup', 0.6);
        if (hits[0]) this.afterAbility(u, hits[0]);
      };
      if (o.style === 'bounce') {
        let n = o.bounces || 3;
        const hop = () => {
          if (u.dead || n-- <= 0) return;
          const t = this.densest(u, o.radius) || tg;
          this.dashTo(u, t.x, t.y, { dur: 0.45, style: 'leap', arc: 120, untargetable: true, color: o.color, onEnd: () => { land(); hop(); } });
        };
        hop();
        return;
      }
      const tx = dest.x - (dest.x - u.x) / (dist(u, dest) || 1) * (o.style === 'blink' ? u.r + dest.r : 0);
      const ty = dest.y - (dest.y - u.y) / (dist(u, dest) || 1) * (o.style === 'blink' ? u.r + dest.r : 0);
      if (o.delay) this.emit({ t: 'telegraph', x: tx, y: ty, r: o.radius, dur: o.delay, color: o.color });
      const go = () => {
        if (o.style === 'sky') {
          this.emit({ t: 'telegraph', x: tx, y: ty, r: o.radius || 150, dur: 1, color: o.color });
          this.dashTo(u, tx, ty, { dur: 1, style: 'sky', arc: 900, untargetable: true, color: o.color, onEnd: land });
        } else if (o.style === 'leap') {
          this.dashTo(u, tx, ty, { dur: 0.5, style: 'leap', arc: 160, untargetable: true, color: o.color, onEnd: land });
        } else if (o.style === 'blink') {
          this.emit({ t: 'telegraph', x: tx, y: ty, r: 60, dur: 0.6, color: o.color });
          this.later(0.6, () => { if (!u.dead) { this.blink(u, tx, ty); land(); } });
        } else {
          const d = dist(u, { x: tx, y: ty });
          this.dashTo(u, tx, ty, { dur: clamp(d / (o.fast ? 1800 : 1100), 0.2, 0.7), style: 'charge', color: o.color, unstoppable: true, onEnd: land, onPath: o.long ? null : (t => { if (o.knockup && dist(t, u) < 60) this.cc(u, t, 'knockup', 0.5); }) });
        }
      };
      if (o.delay && o.style !== 'sky') this.later(o.delay, go); else go();
    }

    ult_zone(u, tg, o, A, dtype) {
      if (o.global) {
        const run = () => {
          if (u.dead && !o.channel) return;
          for (const t of this.enemiesOf(u, true)) {
            if (t.isPet) continue;
            this.emit({ t: 'impact', x: t.x, y: t.y, r: 70, color: o.color, sky: true });
            if (o.dmg) this.damage(u, t, A * 0.75, dtype, { ult: true, ability: true });
            this.applyUltCc(u, o, t);
          }
        };
        if (o.channel) {
          u.channel = { until: this.t + o.channel };
          for (const t of this.enemiesOf(u, true)) if (!t.isPet) this.emit({ t: 'telegraph', x: t.x, y: t.y, r: 60, dur: o.channel, color: o.color, follow: t });
          this.later(o.channel, run);
        } else run();
        return;
      }
      let center = o.center === 'self' ? u : o.center === 'target' ? tg : (this.densest(u, o.radius) || tg);
      if (o.blink) { this.emit({ t: 'telegraph', x: center.x, y: center.y, r: o.radius, dur: 0.8, color: o.color }); }
      const start = () => {
        if (u.dead) return;
        if (o.blink) this.blink(u, center.x, center.y);
        const follow = o.center === 'self' || o.follow ? (o.center === 'self' ? u : center) : null;
        const pos = { x: center.x, y: center.y };
        if (o.stasis) {
          this.emit({ t: 'impact', x: pos.x, y: pos.y, r: o.radius, color: o.color, big: true });
          for (const t of this.units) if (!t.dead && !t.isPet && t.realm === u.realm && Math.hypot(t.x - pos.x, t.y - pos.y) < o.radius + t.r) { t.stasis = o.stasis; this.emit({ t: 'stasis', u: t, color: '#fde68a' }); }
          return;
        }
        if (o.channel) u.channel = { until: this.t + o.channel };
        if (o.pull) {
          for (const t of this.enemiesOf(u)) if (Math.hypot(t.x - pos.x, t.y - pos.y) < o.radius + 60) {
            this.dashTo(t, pos.x + (t.x - pos.x) * 0.25, pos.y + (t.y - pos.y) * 0.25, { dur: 0.3, style: 'pulled', forced: true });
          }
        }
        if (o.knockback) {
          for (const t of this.enemiesOf(u)) if (dist(t, u) < o.radius + t.r) {
            const d = dist(t, u) || 1;
            this.dashTo(t, t.x + (t.x - u.x) / d * o.knockback, t.y + (t.y - u.y) / d * o.knockback, { dur: 0.35, style: 'knock', arc: 40, forced: true });
            this.cc(u, t, 'stun', 0.5);
          }
        }
        const dur = o.channel || o.dur || 0;
        const ticks = o.ticks || (dur ? Math.max(1, Math.round(dur * 2)) : 1);
        const hitAll = (frac, final) => {
          const r = o.radius || 160;
          const c = follow || pos;
          const tgts = this.enemiesOf(u).filter(t => Math.hypot(t.x - c.x, t.y - c.y) < r + t.r);
          let tot = 0;
          if (o.barrage) {
            const pool = o.barrage === 'cone' || o.barrage === 'line' ? this.enemiesOf(u).filter(t => dist(t, u) < 600) : tgts;
            for (let k = 0; k < 2; k++) {
              const t = pool[Math.floor(Math.random() * pool.length)];
              if (!t) break;
              this.emit({ t: o.barrage === 'line' || o.barrage === 'cone' ? 'shot' : 'cannon', from: u, to: t, x: t.x + rnd(-40, 40), y: t.y + rnd(-40, 40), color: o.color });
              tot += this.damage(u, t, A * frac * 0.5, dtype, { ult: true, ability: true, aoe: true, quiet: true });
            }
          } else {
            for (const t of tgts) {
              tot += this.damage(u, t, A * frac, dtype, { ult: true, ability: true, aoe: true, quiet: ticks > 3 });
              if (o.slow) this.cc(u, t, 'slow', o.slow, 1);
              if (o.knockup && (final || ticks === 1 || o.spin)) this.cc(u, t, 'knockup', o.knockup);
              if (o.stun && !o.stunAt && (ticks === 1 || final)) this.cc(u, t, 'stun', o.stun);
              if (o.fear) this.cc(u, t, 'fear', o.fear, u);
              if (o.grievous) t.grievousUntil = this.t + 3;
            }
          }
          if (o.lifesteal || o.heal) this.heal(u, u, tot * (o.lifesteal || o.heal));
          if (o.healAllies) for (const a of this.alliesOf(u)) if (dist(a, c) < r + 60) this.heal(u, a, this.healBase(u) * o.healAllies);
          return tgts;
        };
        if (o.burst) {
          this.addZone(u, { follow, x: pos.x, y: pos.y, r: o.radius, dur: o.channel, ticks: 4, color: o.color, kind: 'channel', onTick: (z, tgts) => tgts.forEach(t => this.cc(u, t, 'slow', o.slow, 1)) });
          this.later(o.channel, () => { if (u.dead) return; this.emit({ t: 'impact', x: u.x, y: u.y, r: o.radius, color: o.color, big: true, shake: 12 }); hitAll(o.burst / 1.5); });
          return;
        }
        if (o.delay) {
          this.emit({ t: 'telegraph', x: pos.x, y: pos.y, r: o.radius, dur: o.delay, color: o.color, follow });
          this.later(o.delay, () => {
            if (u.dead && !o.heal) return;
            this.emit({ t: 'impact', x: (follow || pos).x, y: (follow || pos).y, r: o.radius, color: o.color, big: true, shake: 8, vines: o.vines });
            const t = hitAll(1, true);
            if (o.amp) for (const x of t) x.vulnUntil = this.t + 4;
            if (t[0]) this.afterAbility(u, t[0]);
          });
          return;
        }
        if (!dur) {
          this.emit({ t: 'impact', x: pos.x, y: pos.y, r: o.radius, color: o.color, big: true, shake: 8 });
          const t = hitAll(1, true);
          if (o.after) this.addBuff(u, { key: 'ult', dur: o.after.dur, ad: o.after.ad, dr: o.after.dr });
          if (t[0]) this.afterAbility(u, t[0]);
          return;
        }
        if (o.invis) u.invis = o.invis;
        let n = 0;
        const tgtsHit = new Set();
        this.addZone(u, {
          follow, x: pos.x, y: pos.y, r: o.radius, dur, ticks, color: o.color, kind: o.barrage ? 'barrage' : o.mushrooms ? 'mushrooms' : o.box ? 'box' : o.tentacles ? 'tentacles' : 'zone',
          onTick: () => {
            n++;
            const final = n >= ticks;
            const t = hitAll(1 / ticks, final);
            t.forEach(x => tgtsHit.add(x));
            if (o.stunAt && final) for (const x of t) this.cc(u, x, 'stun', o.stun);
            if (final && o.after) this.addBuff(u, { key: 'ult', dur: o.after.dur, ad: o.after.ad, dr: o.after.dr });
            if (o.tether && final) for (const x of t) this.emit({ t: 'link', from: u, to: x, color: o.color });
          }
        });
        if (o.tether) for (const x of this.enemiesOf(u)) if (dist(x, u) < o.radius) this.tethers.push({ a: u, b: x, until: this.t + dur, color: o.color });
      };
      if (o.blink) this.later(0.8, start); else start();
    }

    ult_execute(u, tg, o, A, dtype) {
      let t = o.style === 'airborne' ? (this.enemiesOf(u).find(x => x.air) || this.lowest(u)) : this.lowest(u);
      if (!t || dist(u, t) > 700) t = tg;
      const hitIt = (target, mult = 1) => {
        if (!target || target.dead) return;
        const dmg = A * mult * this.missingMult(target, o.missing);
        const before = target.dead;
        this.damage(u, target, dmg, dtype, { ult: true, ability: true, big: true });
        if (o.reset && !before && target.dead) { u.energy = 100; u.ultReadySince = this.t; this.emit({ t: 'reset', u }); }
        this.afterAbility(u, target);
      };
      switch (o.style) {
        case 'dunk':
          this.dashTo(u, t.x, t.y - 1, { dur: 0.45, style: 'leap', arc: 160, untargetable: true, color: o.color, onEnd: () => { this.emit({ t: 'execute', u, tg: t, style: 'dunk', color: o.color }); hitIt(t); } });
          break;
        case 'sky':
          this.emit({ t: 'execute', u, tg: t, style: 'sword', color: o.color });
          this.later(0.5, () => hitIt(t));
          break;
        case 'bite':
          this.dashTo(u, t.x - (t.x - u.x) / (dist(u, t) || 1) * (u.r + t.r), t.y - (t.y - u.y) / (dist(u, t) || 1) * (u.r + t.r), { dur: 0.2, style: 'dash', color: o.color, onEnd: () => {
            this.emit({ t: 'execute', u, tg: t, style: 'bite', color: o.color });
            const was = t.dead; hitIt(t);
            if (!was && t.dead && o.grow) this.addBuff(u, { key: 'feast', dur: 999, hp: o.grow, scale: 1.25 });
          } });
          break;
        case 'shot':
          this.emit({ t: 'execute', u, tg: t, style: 'aim', color: o.color, dur: o.delay || 0.3 });
          this.later(o.delay || 0.3, () => { if (u.dead || t.dead) return; this.shoot(u, t, { speed: 3000, kind: 'ult', color: o.color, width: 10, big: true, onHit: () => hitIt(t) }); });
          break;
        case 'orbs':
          for (let i = 0; i < 5; i++) this.later(i * 0.12, () => this.shoot(u, t, { speed: 1100, kind: 'ult', color: o.color, big: true, onHit: () => hitIt(t, 0.2) }));
          break;
        case 'mark': {
          this.blink(u, t.x + (u.x < t.x ? 50 : -50), t.y);
          this.emit({ t: 'mark', u: t, dur: o.delay, color: o.color });
          const startDmg = t.taken;
          this.damage(u, t, A * 0.4, dtype, { ult: true, ability: true });
          this.later(o.delay, () => {
            if (t.dead) return;
            const stored = (t.taken - startDmg) * o.store;
            this.emit({ t: 'execute', u, tg: t, style: 'pop', color: o.color });
            this.damage(u, t, A * 0.8 + stored, dtype, { ult: true, big: true });
          });
          break;
        }
        case 'x': {
          this.emit({ t: 'execute', u, tg: t, style: 'x', color: o.color, r: o.radius });
          this.later(0.5, () => {
            for (const x of this.enemiesOf(u)) if (dist(x, t) < o.radius) {
              if (x.hp / x.maxHp < o.threshold) this.damage(u, x, x.hp + 10, 'true', { ult: true, big: true, execute: true });
              else this.damage(u, x, A, dtype, { ult: true, ability: true });
            }
            this.blink(u, t.x, t.y);
          });
          break;
        }
        case 'airborne':
          this.blink(u, t.x - 30, t.y);
          if (t.air) t.air.dur += 1;
          this.emit({ t: 'execute', u, tg: t, style: 'slashes', color: o.color });
          for (const x of this.enemiesOf(u)) if (x.air || x === t) hitIt(x);
          break;
        case 'leap':
          if (o.invis) u.invis = o.invis;
          this.dashTo(u, t.x - (t.x - u.x) / (dist(u, t) || 1) * (u.r + t.r), t.y - (t.y - u.y) / (dist(u, t) || 1) * (u.r + t.r), { dur: 0.4, style: 'leap', arc: 120, untargetable: true, color: o.color, onEnd: () => {
            this.emit({ t: 'execute', u, tg: t, style: 'slashes', color: o.color });
            hitIt(t);
            if (o.radius) for (const x of this.enemiesOf(u)) if (x !== t && dist(x, t) < o.radius) this.damage(u, x, A * 0.4, dtype, { ult: true, aoe: true });
          } });
          break;
        default: // blink
          this.blink(u, t.x - (t.x - u.x) / (dist(u, t) || 1) * (u.r + t.r), t.y - (t.y - u.y) / (dist(u, t) || 1) * (u.r + t.r));
          this.emit({ t: 'execute', u, tg: t, style: 'slashes', color: o.color });
          hitIt(t);
          if (o.cone) for (const x of this.enemiesOf(u)) if (x !== t && dist(x, u) < o.cone) this.damage(u, x, A * 0.5, dtype, { ult: true, aoe: true });
      }
    }

    ult_transform(u, tg, o, A) {
      const b = { key: 'ult', dur: o.dur, ad: o.ad, as: o.as, ms: o.ms, armor: o.armor, mr: o.mr, dr: o.dr, scale: o.scale, hp: o.hp, regen: o.regen, unstoppable: o.unstoppable, undying: o.undying, trueHit: o.trueHit, pierce: o.pierce, every3: o.every3, drain: o.drain, aura: o.aura, healAura: o.healAura, color: o.color, glow: true };
      if (o.range) b.range = o.range;
      if (o.healAmp) b.healAmpBuff = o.healAmp;
      if (o.melee) { b.range = -(u.st.range - 150); }
      this.addBuff(u, b);
      if (o.heal) this.heal(u, u, u.maxHp * o.heal);
      if (o.shield) this.addShield(u, u, u.maxHp * o.shield, 4);
      if (o.invis) u.invis = o.invis;
      if (o.unstoppable) { u.stun = u.root = u.sleep = 0; u.fear = u.charm = null; u.slowUntil = 0; }
      if (o.fear) for (const t of this.enemiesOf(u)) if (dist(t, u) < 160) this.cc(u, t, 'fear', 0.75, u);
      if (o.steal && tg && !tg.dead) {
        const take = { ad: o.steal * 0.5, armor: o.steal, mr: o.steal };
        this.addBuff(u, { key: 'steal', dur: o.dur, ...take });
        this.addBuff(tg, { key: 'stolen', dur: o.dur, armor: -o.steal, mr: -o.steal, ad: -o.steal * 0.3, color: '#7dd3fc' });
        this.emit({ t: 'drain', from: tg, to: u, color: '#7dd3fc', big: true });
      }
      if (o.windslash) this.later(o.dur - 0.5 > 3 ? 3 : 1, () => {
        if (u.dead) return;
        const t = this.lowest(u);
        if (t) this.skillshot(u, t, { width: 200, speed: 1600, color: o.color, ult: true, length: 600, dmg: this.ultBase(u) * o.windslash, type: 'physical', missing: 1.2, cone: true });
      });
      if (o.nova) {
        this.emit({ t: 'impact', x: u.x, y: u.y, r: o.nova, color: o.color, big: true, shake: 6 });
        for (const t of this.enemiesOf(u)) if (dist(t, u) < o.nova) this.damage(u, t, A, 'magic', { ult: true, aoe: true });
      }
      if (o.invisPulse) u.invis = 1;
      this.emit({ t: 'transform', u, color: o.color });
    }

    ult_team(u, tg, o, A) {
      const allies = this.alliesOf(u);
      switch (o.mode) {
        case 'invuln': {
          const run = () => {
            const list = o.single ? [this.mostHurt(u, 600) || u] : allies.filter(a => dist(a, u) < o.radius);
            for (const a of list) { this.addBuff(a, { key: 'invuln', dur: o.dur, invuln: true, color: o.color, dome: true }); }
            this.emit({ t: 'impact', x: u.x, y: u.y, r: o.radius || 120, color: o.color, big: true, holy: true });
            if (o.aoeAfter) this.later(o.dur, () => { if (u.dead) return; this.emit({ t: 'impact', x: u.x, y: u.y, r: o.aoeAfter, color: o.color, big: true, sky: true, shake: 8 }); for (const t of this.enemiesOf(u)) if (dist(t, u) < o.aoeAfter) this.damage(u, t, A, 'magic', { ult: true, aoe: true }); });
          };
          if (o.delay) { this.emit({ t: 'telegraph', x: u.x, y: u.y, r: o.radius, dur: o.delay, color: o.color, follow: u }); this.later(o.delay, run); } else run();
          break;
        }
        case 'noDeath': {
          const z = this.addZone(u, { x: u.x, y: u.y, r: o.radius, dur: o.dur, ticks: 1, color: o.color, kind: 'lamb', onTick: () => {} });
          z.noDeath = true;
          break;
        }
        case 'revive': {
          const dead = this.units.filter(a => a.side === u.side && a.dead && !a.isPet && a.realm === 0 && this.t - a.deathT < 8).sort((a, b) => b.deathT - a.deathT)[0];
          if (dead) { this.emit({ t: 'clock', u: dead, color: o.color }); this.later(2, () => this.revive(dead, 0.5)); }
          else {
            const a = this.mostHurt(u, 600) || u;
            this.addBuff(a, { key: 'chrono', dur: 5, undying: true, color: o.color, dome: true });
            this.emit({ t: 'clock', u: a, color: o.color });
          }
          break;
        }
        case 'heal':
          for (const a of (o.global ? this.alliesOf(u, true) : allies.filter(a => dist(a, u) < o.radius))) {
            this.heal(u, a, this.healBase(u) * o.amount * (a.hp / a.maxHp < 0.4 ? 1.5 : 1));
            if (o.cleanse) this.cleanse(a);
            this.emit({ t: 'holy', u: a, color: o.color });
          }
          if (!o.global) this.emit({ t: 'impact', x: u.x, y: u.y, r: o.radius, color: o.color, big: true, holy: true });
          break;
        case 'shield':
          for (const a of allies) if (dist(a, u) < 400) { this.addShield(u, a, this.healBase(u) * o.amount * 2, 4); a.msBuffUntil = this.t + 2; a.msBuffAmt = o.ms; this.emit({ t: 'holy', u: a, color: o.color }); }
          break;
        case 'buff':
          for (const a of allies) { this.addBuff(a, { key: 'sivir', dur: o.dur, ms: o.ms, as: o.as, color: o.color }); this.emit({ t: 'holy', u: a, color: o.color }); }
          break;
        case 'enlarge': {
          const a = this.mostHurt(u, 600) || u;
          this.addBuff(a, { key: 'lulu', dur: 7, hp: o.hp, scale: 1.45, color: o.color });
          this.emit({ t: 'impact', x: a.x, y: a.y, r: o.radius, color: o.color, big: true });
          for (const t of this.enemiesOf(u)) if (dist(t, a) < o.radius) this.cc(u, t, 'knockup', o.knockup);
          break;
        }
        case 'shen': {
          const a = this.alliesOf(u).filter(x => x !== u).sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp)[0];
          if (!a) break;
          this.addShield(u, a, this.healBase(u) + a.maxHp * 0.15, 4);
          this.emit({ t: 'link', from: u, to: a, color: o.color });
          this.emit({ t: 'telegraph', x: a.x, y: a.y, r: 60, dur: 1, color: o.color, follow: a });
          u.channel = { until: this.t + 1 };
          this.later(1, () => { if (!u.dead && !a.dead) { this.blink(u, a.x + 40, a.y); this.emit({ t: 'impact', x: u.x, y: u.y, r: 80, color: o.color }); } });
          break;
        }
        case 'devour': {
          const a = this.alliesOf(u).filter(x => x !== u && dist(x, u) < 400).sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp)[0];
          if (!a) break;
          a.inside = u; a.insideUntil = this.t + o.dur;
          a.insideAlly = true;
          this.addShield(u, u, u.maxHp * o.shield, o.dur + 1);
          this.emit({ t: 'devour', u, a });
          break;
        }
      }
    }

    ult_summon(u, tg, o) {
      const pet = this.makePet(u, o, tg);
      this.units.push(pet);
      this.emit({ t: 'summon', u: pet, owner: u, color: o.color });
      if (o.landStun) {
        this.emit({ t: 'impact', x: pet.x, y: pet.y, r: o.radius, color: o.color, big: true, shake: 8 });
        for (const t of this.enemiesOf(u)) if (dist(t, pet) < o.radius) { this.cc(u, t, 'stun', o.landStun); this.damage(u, t, this.ultBase(u), 'magic', { ult: true, aoe: true }); }
      }
      if (o.knockup) this.later(4, () => { if (pet.dead) return; this.emit({ t: 'impact', x: pet.x, y: pet.y, r: 120, color: o.color }); for (const t of this.enemiesOf(pet)) if (dist(t, pet) < 120) this.cc(u, t, 'knockup', o.knockup); });
    }

    makePet(owner, o, near) {
      const base = owner.champ;
      const champ = o.clone ? base : { ...base, stats: { ...base.stats } };
      const st = o.clone ? { ...owner.st, fx: {} } : {
        hp: o.hp, ad: o.ad, bonusAd: o.ad, ap: 0, armor: 60, mr: 50, asBase: o.as, asBonus: 0, as: o.as, crit: 0, ls: 0, ah: 0,
        ms: 340, range: o.range ? o.range / RANGE_SCALE : 150, fx: o.aura ? { sunfire: o.aura } : {}
      };
      const p = {
        ...this.makeUnit({ champ: base, role: 'pet', items: [] }, owner.side, 9),
        isPet: true, owner, petName: o.pet, petIcon: owner.ultIcon, petColor: o.color, expires: this.t + o.dur, explode: o.explode
      };
      p.st = st; p.maxHp = o.clone ? owner.maxHp * 0.6 : o.hp; p.hp = p.maxHp;
      p.rangePx = (o.range || (o.clone ? owner.rangePx : 60));
      p.ranged = !!o.range || (o.clone && owner.ranged);
      p.cls = 'fighter'; p.summs = []; p.keystone = 0;
      p.x = near ? (near.x + owner.x) / 2 : owner.x + 40; p.y = near ? (near.y + owner.y) / 2 : owner.y;
      p.r = o.clone ? owner.r : 34; p.realm = owner.realm;
      if (o.clone) owner.invis = 1;
      this.recalc(p); p.r = o.clone ? 28 : 34;
      return p;
    }

    petExpire(p) {
      if (p.explode) this.petExplode(p);
      p.dead = true; p.hp = 0; p.deathT = this.t;
      this.emit({ t: 'petGone', u: p });
    }

    petExplode(p) {
      this.emit({ t: 'impact', x: p.x, y: p.y, r: 140, color: '#ef4444', big: true, shake: 6 });
      for (const t of this.enemiesOf(p)) if (dist(t, p) < 140) { this.damage(p.owner, t, this.ultBase(p.owner) * p.explode, 'magic', { ult: true, aoe: true }); this.cc(p.owner, t, 'fear', 1, p); }
    }

    ult_suppress(u, tg, o, A, dtype) {
      let t = o.dash === 'far' ? (this.farthest(u) || tg) : (this.lowest(u) && dist(u, this.lowest(u)) < 500 ? this.lowest(u) : tg);
      const start = () => {
        if (u.dead || t.dead) return;
        this.cc(u, t, 'suppress', o.dur);
        u.channel = { until: this.t + o.dur };
        this.tethers.push({ a: u, b: t, until: this.t + o.dur, color: o.color, thick: true });
        const ticks = Math.round(o.dur * 4);
        for (let i = 1; i <= ticks; i++) this.later(i * o.dur / ticks, () => {
          if (u.dead || t.dead) return;
          const dealt = this.damage(u, t, A / ticks, dtype, { ult: true, ability: true, quiet: i < ticks });
          if (o.heal) this.heal(u, u, dealt * o.heal, true);
          if (o.drag) {
            const home = { x: u.side ? W - 250 : 250, y: H / 2 };
            const d = Math.hypot(home.x - u.x, home.y - u.y) || 1;
            const step = Math.min(30, d);
            u.x += (home.x - u.x) / d * step; u.y += (home.y - u.y) / d * step;
            t.x = u.x + Math.cos(u.facing) * (u.r + t.r); t.y = u.y + Math.sin(u.facing) * (u.r + t.r);
          }
          if (i === ticks) {
            if (o.execute && t.hp / t.maxHp < o.execute) this.damage(u, t, t.hp + 10, 'true', { ult: true, big: true, execute: true });
            if (o.fear) for (const x of this.enemiesOf(u)) if (dist(x, u) < 200) this.cc(u, x, 'fear', o.fear, u);
          }
        });
      };
      if (o.dash) {
        const d = dist(u, t) || 1;
        this.dashTo(u, t.x - (t.x - u.x) / d * (u.r + t.r), t.y - (t.y - u.y) / d * (u.r + t.r), { dur: clamp(d / 1400, 0.15, 0.5), style: 'charge', color: o.color, onEnd: start });
      } else start();
    }

    ult_kick(u, tg, o, A, dtype) {
      if (o.single) {
        const t = tg;
        const go = () => {
          if (t.dead) return;
          const d = dist(u, t) || 1;
          const nx = (t.x - u.x) / d, ny = (t.y - u.y) / d;
          this.damage(u, t, A, dtype, { ult: true, ability: true, big: true });
          this.emit({ t: 'impact', x: t.x, y: t.y, r: 50, color: o.color, shake: 6 });
          const hit = new Set();
          this.dashTo(t, t.x + nx * o.push, t.y + ny * o.push, { dur: 0.45, style: 'knock', arc: 30, forced: true, onPath: x => {
            if (x !== t && x.side === t.side && !hit.has(x)) { hit.add(x); this.cc(u, x, 'knockup', o.knockupOthers || 0.75); this.damage(u, x, A * 0.6, dtype, { ult: true, aoe: true }); this.emit({ t: 'impact', x: x.x, y: x.y, r: 60, color: o.color }); }
          } });
          this.cc(u, t, 'stun', 0.5);
          if (o.follow) this.later(0.45, () => { if (!u.dead && !t.dead) this.dashTo(u, t.x - nx * 40, t.y - ny * 40, { dur: 0.3, style: 'charge', color: o.color }); });
          if (o.transform) this.addBuff(u, { key: 'ult', dur: o.transform.dur, ad: o.transform.ad, as: o.transform.as, color: o.color, glow: true });
        };
        if (!o.ranged && dist(u, t) > u.r + t.r + 20) {
          const d = dist(u, t);
          this.dashTo(u, t.x - (t.x - u.x) / d * (u.r + t.r), t.y - (t.y - u.y) / d * (u.r + t.r), { dur: 0.2, style: 'dash', color: o.color, onEnd: go });
        } else go();
        return;
      }
      if (o.grab) {
        const t = tg;
        const d = dist(u, t) || 1;
        this.dashTo(u, t.x, t.y, { dur: 0.2, style: 'dash', color: o.color, onEnd: () => {
          if (t.dead) return;
          const c = this.densest(u, o.radius, this.enemiesOf(u).filter(x => x !== t)) || { x: u.x + (t.x - u.x) / d * 200, y: u.y };
          this.cc(u, t, 'suppress', 0.6);
          this.dashTo(u, c.x, c.y, { dur: 0.6, style: 'leap', arc: 200, untargetable: true, color: o.color });
          this.dashTo(t, c.x, c.y + 1, { dur: 0.6, style: 'leap', arc: 200, forced: true, onEnd: () => {
            this.emit({ t: 'impact', x: c.x, y: c.y, r: o.radius, color: o.color, big: true, shake: 14 });
            this.damage(u, t, A * 1.2, dtype, { ult: true, big: true });
            for (const x of this.enemiesOf(u)) if (x !== t && dist(x, c) < o.radius) this.damage(u, x, A * 0.8, dtype, { ult: true, aoe: true });
          } });
        } });
        return;
      }
      // alan itme
      const c = o.thrown ? (this.densest(u, o.radius) || tg) : u;
      const cx = c.x, cy = c.y;
      const fire = () => {
        this.emit({ t: 'impact', x: cx, y: cy, r: o.radius, color: o.color, big: true, shake: 10 });
        if (o.scale) this.addBuff(u, { key: 'mega', dur: 8, scale: o.scale, hp: 0.2, color: o.color });
        for (const t of this.enemiesOf(u)) if (Math.hypot(t.x - cx, t.y - cy) < o.radius + t.r) {
          this.damage(u, t, A, dtype, { ult: true, aoe: true });
          if (o.banish) {
            const dir = t.side ? 1 : -1;
            this.dashTo(t, t.side ? W - 30 : 30, t.y, { dur: 0.5, style: 'knock', arc: 120, forced: true, onEnd: () => { t.banish = o.banish; t.banished = true; this.emit({ t: 'banish', u: t }); this.later(o.banish, () => { if (!t.dead) { t.x = t.side ? W - 120 : 120; } }); } });
            void dir;
            continue;
          }
          const d = Math.hypot(t.x - cx, t.y - cy) || 1;
          const push = o.push || 150;
          this.dashTo(t, t.x + (t.x - cx) / d * push, t.y + (t.y - cy) / d * push, { dur: 0.4, style: 'knock', arc: 50, forced: true });
          if (o.stun) this.later(0.4, () => this.cc(u, t, 'stun', o.stun));
          else this.cc(u, t, 'stun', 0.4);
        }
      };
      if (o.thrown) {
        this.shoot(u, c, { speed: 900, kind: 'ult', color: o.color, big: true, width: 26, arc: true, onHit: fire });
      } else fire();
    }

    ult_arena(u, tg, o, A, dtype) {
      const t = this.densest(u, o.radius) || tg;
      const make = () => {
        const cx = u.x, cy = u.y;
        this.emit({ t: 'impact', x: cx, y: cy, r: o.radius, color: o.color, big: true, shake: 10 });
        const z = this.addZone(u, { x: cx, y: cy, r: o.radius, dur: o.dur, ticks: 2, color: o.color, kind: 'cage', onTick: (zz, tgts) => tgts.forEach(x => this.cc(u, x, 'slow', o.slow || 0.2, 1)) });
        z.cage = true;
        for (const x of this.enemiesOf(u)) if (Math.hypot(x.x - cx, x.y - cy) < o.radius) {
          x.cage = { x: cx, y: cy, r: o.radius, until: this.t + o.dur };
          this.damage(u, x, A, dtype, { ult: true, aoe: true });
          if (o.trueHit) this.addBuff(u, { key: 'cage', dur: o.dur, trueHit: o.trueHit });
        }
      };
      if (o.leap) this.dashTo(u, t.x, t.y, { dur: 0.45, style: 'leap', arc: 180, untargetable: true, color: o.color, onEnd: make });
      else make();
    }

    ult_realm(u, tg, o) {
      if (u.realm || tg.realm || tg.isPet) { this.ult_transform(u, tg, { dur: 6, ad: 0.2, color: o.color }); return; }
      const id = 1;
      if (this.units.some(x => x.realm)) { this.ult_transform(u, tg, { dur: 6, ad: 0.2, color: o.color }); return; }
      const back = [{ u, x: u.x, y: u.y }, { u: tg, x: tg.x, y: tg.y }];
      this.emit({ t: 'realmOpen', u, tg, color: o.color });
      for (const b of back) { b.u.realm = id; b.u.dash = null; b.u.cage = null; b.u.air = null; }
      u.x = REALM.x - 70; u.y = REALM.y; tg.x = REALM.x + 70; tg.y = REALM.y;
      u.realmFoe = tg; tg.realmFoe = u;
      u.target = tg; tg.target = u;
      const steal = o.steal;
      this.addBuff(u, { key: 'realm', dur: o.dur, ad: steal, armor: steal, mr: steal, color: o.color });
      this.addBuff(tg, { key: 'realmed', dur: o.dur, ad: -steal, armor: -steal, mr: -steal });
      this.projs = this.projs.filter(p => p.src !== u && p.src !== tg && p.tg !== u && p.tg !== tg);
      this.realmInfo = { a: u, b: tg, until: this.t + o.dur, color: o.color };
      this.later(o.dur, () => {
        for (const b of back) {
          b.u.realm = 0; b.u.realmFoe = null;
          if (!b.u.dead) { b.u.x = b.x; b.u.y = b.y; b.u.target = null; }
          else { b.u.x = b.x; b.u.y = b.y; }
        }
        this.realmInfo = null;
        this.emit({ t: 'realmClose', u, color: o.color });
      });
    }

    ult_possess(u, tg, o, A, dtype) {
      const t = this.lowest(u) && dist(this.lowest(u), u) < 550 ? this.lowest(u) : tg;
      const d = dist(u, t) || 1;
      this.dashTo(u, t.x - (t.x - u.x) / d * 10, t.y - (t.y - u.y) / d * 10, { dur: 0.25, style: 'dash', color: o.color, untargetable: true, onEnd: () => {
        if (t.dead) return;
        u.inside = t; u.insideUntil = this.t + o.dur; u.insideDmg = A; u.insideType = dtype; u.insideOpts = o;
        this.emit({ t: 'possess', u, tg: t, color: o.color });
      } });
    }

    updateInside(u, dt) {
      const host = u.inside;
      if (u.insideAlly) {
        if (host.dead || this.t >= u.insideUntil) { u.inside = null; u.insideAlly = false; u.x = host.x + 40; u.y = host.y; this.emit({ t: 'impact', x: u.x, y: u.y, r: 60, color: '#86efac' }); }
        else { u.x = host.x; u.y = host.y; }
        return;
      }
      u.x = host.x; u.y = host.y;
      if (this.t >= u.insideUntil || host.dead) {
        u.inside = null;
        const ang = rnd(0, TAU);
        u.x = host.x + Math.cos(ang) * (host.r + u.r + 6); u.y = host.y + Math.sin(ang) * (host.r + u.r + 6);
        this.clampPos(u);
        this.emit({ t: 'burst', u, tg: host, color: u.insideOpts.color });
        if (!host.dead) {
          const dealt = this.damage(u, host, u.insideDmg * (1 + 0.6 * (1 - host.hp / host.maxHp)), u.insideType, { ult: true, big: true });
          this.heal(u, u, dealt * u.insideOpts.heal);
          this.afterAbility(u, host);
        }
      }
    }

    ult_rewind(u, tg, o, A, dtype) {
      const past = u.history[0] || { x: u.x, y: u.y };
      this.emit({ t: 'rewind', u, x: past.x, y: past.y, color: o.color });
      u.untarget = 0.5;
      this.later(0.5, () => {
        if (u.dead) return;
        this.blink(u, past.x, past.y);
        this.heal(u, u, u.maxHp * o.heal);
        this.emit({ t: 'impact', x: u.x, y: u.y, r: o.radius, color: o.color, big: true, shake: 8 });
        for (const t of this.enemiesOf(u)) if (dist(t, u) < o.radius) this.damage(u, t, A, dtype, { ult: true, aoe: true });
      });
    }

    ult_multiDash(u, tg, o, A, dtype) {
      if (o.untargetable) {
        u.untarget = o.untargetable;
        this.emit({ t: 'feathers', u, color: o.color });
        this.later(o.untargetable, () => {
          if (u.dead) return;
          this.emit({ t: 'impact', x: u.x, y: u.y, r: 260, color: o.color, big: true });
          for (const t of this.enemiesOf(u)) if (dist(t, u) < 320) {
            this.emit({ t: 'link', from: u, to: t, color: o.color });
            this.damage(u, t, A * 0.6, dtype, { ult: true, aoe: true });
            this.cc(u, t, 'root', o.root);
          }
        });
        return;
      }
      if (o.far) {
        const t = this.lowest(u) || tg;
        const d = dist(u, t) || 1;
        this.dashTo(u, t.x - (t.x - u.x) / d * (u.r + t.r + 40), t.y - (t.y - u.y) / d * (u.r + t.r + 40), { dur: 0.35, style: 'dash', color: o.color, untargetable: true, onEnd: () => {
          this.addShield(u, u, this.ad(u) * 1.5 + this.ap(u), 3);
          u.target = t; u.retarget = 3;
        } });
        return;
      }
      if (o.back) {
        const sx = u.x, sy = u.y;
        const t = tg;
        const d = dist(u, t) || 1;
        this.blink(u, u.x + (t.x - u.x) / d * Math.min(250, d - 60), u.y + (t.y - u.y) / d * Math.min(250, d - 60));
        this.shoot(u, t, { speed: 1200, kind: 'ult', color: o.color, big: true, onHit: () => { this.damage(u, t, A, dtype, { ult: true }); this.cc(u, t, 'sleep', 1.5); } });
        this.later(1, () => { if (!u.dead) this.blink(u, sx, sy); });
        return;
      }
      const n = o.dashes || 2;
      for (let i = 0; i < n; i++) {
        this.later(i * 0.55, () => {
          if (u.dead) return;
          const t = (o.execute && i === n - 1) ? (this.lowest(u) || tg) : this.chooseTarget(u) || tg;
          if (!t || t.dead) return;
          const d = dist(u, t) || 1;
          const back = i === 0 && (u.ranged) ? -120 : u.r + t.r;
          const tx = i === 0 && u.ranged ? u.x + (u.x - t.x) / d * 40 + (Math.random() - 0.5) * 140 : t.x - (t.x - u.x) / d * back;
          const ty = i === 0 && u.ranged ? u.y + (u.y - t.y) / d * 40 + (Math.random() - 0.5) * 140 : t.y - (t.y - u.y) / d * back;
          this.dashTo(u, tx, ty, { dur: 0.2, style: 'dash', color: o.color, untargetable: true, onEnd: () => {
            const pool = this.enemiesOf(u).filter(x => dist(x, u) < 420).slice(0, o.bolts || 1);
            for (const x of o.aoe ? this.enemiesOf(u).filter(y => dist(y, u) < o.aoe) : pool) {
              if (o.bolts || u.ranged) this.shoot(u, x, { speed: 1300, kind: 'ult', color: o.color, onHit: () => { this.damage(u, x, A / n, dtype, { ult: true }); if (o.root) this.cc(u, x, 'root', o.root); if (o.fear) this.cc(u, x, 'fear', o.fear, u); } });
              else { this.emit({ t: 'slash', u, tg: x, color: o.color, big: true }); this.damage(u, x, A / n * this.missingMult(x, o.execute ? 1 : 0), dtype, { ult: true }); if (o.root) this.cc(u, x, 'root', o.root); if (o.fear) this.cc(u, x, 'fear', o.fear, u); }
            }
            if (o.aoe) this.emit({ t: 'impact', x: u.x, y: u.y, r: o.aoe, color: o.color });
          } });
        });
      }
    }

    ult_steal(u, tg, o) {
      const victims = this.units.filter(x => x.side !== u.side && !x.isPet && x.ult[0] !== 'steal' && x.ult[0] !== 'realm');
      const v = victims[Math.floor(Math.random() * victims.length)];
      if (!v) return;
      this.emit({ t: 'steal', u, from: v, color: o.color });
      u.stolenName = v.ultName;
      const t = this.chooseTarget(u) || tg;
      this.castUlt(u, t, v.ult);
    }

    // ---------- hareket araçları ----------
    dashTo(u, x, y, opts) {
      if (u.dead) return;
      if (opts.forced && (u.mod.unstoppable || u.stasis > 0 || u.realm !== (opts.realm || u.realm))) return;
      const d = { x0: u.x, y0: u.y, x1: x, y1: y, t: 0, dur: opts.dur || 0.3, ...opts };
      if (u.realm) {
        const dx = d.x1 - REALM.x, dy = d.y1 - REALM.y, dd = Math.hypot(dx, dy);
        if (dd > REALM.r - u.r) { d.x1 = REALM.x + dx / dd * (REALM.r - u.r); d.y1 = REALM.y + dy / dd * (REALM.r - u.r); }
      } else {
        d.x1 = clamp(d.x1, 40, W - 40);
        d.y1 = clamp(d.y1, 90, H - 60);
      }
      if (u.dash && u.dash.onEnd && u.dash !== d) { const prev = u.dash; u.dash = null; if (!opts.forced) prev.onEnd && prev.onEnd(); }
      u.dash = d;
      d.pathHit = new Set();
      this.emit({ t: 'dash', u, d });
    }

    updateDash(u, dt) {
      const d = u.dash;
      d.t += dt;
      const p = Math.min(1, d.t / d.dur);
      const e = d.style === 'sky' ? (p < 0.5 ? 0 : (p - 0.5) * 2) : p;
      u.x = d.x0 + (d.x1 - d.x0) * e;
      u.y = d.y0 + (d.y1 - d.y0) * e;
      if (d.onPath) {
        for (const o of this.units) if (!o.dead && o !== u && o.realm === u.realm && !d.pathHit.has(o) && dist(o, u) < o.r + u.r + 10) { d.pathHit.add(o); d.onPath(o); }
      }
      if (p >= 1) {
        u.dash = null;
        this.clampPos(u);
        if (d.onEnd) d.onEnd();
      }
    }

    blink(u, x, y) {
      const fx = u.x, fy = u.y;
      u.x = x; u.y = y;
      this.clampPos(u);
      this.emit({ t: 'blink', u, fx, fy });
    }

    skillshot(u, tg, o) {
      const ang = Math.atan2(tg.y - u.y, tg.x - u.x);
      this.projs.push({
        src: u, side: u.side, realm: u.realm, x: u.x, y: u.y, vx: Math.cos(ang), vy: Math.sin(ang), speed: o.speed, travelled: 0, length: o.length,
        width: o.width, color: o.color, kind: o.ult ? 'ult' : 'spell', line: true, hit: new Set(), o, big: true
      });
    }

    shoot(u, tg, o) {
      this.projs.push({ src: u, side: u.side, realm: u.realm, x: u.x, y: u.y, tg, speed: o.speed, kind: o.kind, color: o.color, width: o.width, big: o.big, crit: o.crit, onHit: o.onHit, global: o.global, arc: o.arc, sx: u.x, sy: u.y });
    }

    updateProjs(dt) {
      for (const p of this.projs) {
        const sp = p.speed * dt;
        if (p.line) {
          p.x += p.vx * sp; p.y += p.vy * sp; p.travelled += sp;
          for (const t of this.units) {
            if (t.dead || t.side === p.side || t.realm !== p.realm || p.hit.has(t) || !this.targetable(t)) continue;
            if (Math.hypot(t.x - p.x, t.y - p.y) < p.width / 2 + t.r) {
              p.hit.add(t);
              const o = p.o;
              this.damage(p.src, t, o.dmg * this.missingMult(t, o.missing) * (o.ult && p.hit.size > 1 && !o.cone ? 0.8 : 1), o.type, { ability: true, ult: !!o.ult, aoe: p.hit.size > 1 });
              if (o.root) this.cc(p.src, t, 'root', o.root);
              if (o.stun) this.cc(p.src, t, 'stun', o.stun);
              if (o.hook) {
                const s = p.src;
                this.dashTo(t, s.x + (t.x - s.x) * 0.2, s.y + (t.y - s.y) * 0.2, { dur: 0.35, style: 'pulled', forced: true });
                this.emit({ t: 'link', from: s, to: t, color: o.color });
                p.done = true;
              }
              this.afterAbility(p.src, t);
              if (!o.ult && !o.cone) p.done = true;
              this.emit({ t: 'impact', x: t.x, y: t.y, r: 40, color: p.color });
            }
          }
          if (p.travelled >= p.length || p.x < -100 || p.x > W + 100 || p.y < -100 && !p.realm || p.y > H + 100) {
            if (p.o.returns && !p.returned) { p.returned = true; p.vx *= -1; p.vy *= -1; p.travelled = 0; p.length = Math.hypot(p.x - p.src.x, p.y - p.src.y); p.hit = new Set(); }
            else p.done = true;
          }
          continue;
        }
        const t = p.tg;
        const d = Math.hypot(t.x - p.x, t.y - p.y);
        if (t.dead || t.realm !== p.realm || (!this.targetable(t) && !t.dash)) { p.done = true; continue; }
        if (d <= sp + t.r * 0.5) { p.done = true; p.onHit && p.onHit(); continue; }
        p.x += (t.x - p.x) / d * sp;
        p.y += (t.y - p.y) / d * sp;
      }
      this.projs = this.projs.filter(p => !p.done);
    }

    addZone(u, z) {
      z.owner = u; z.side = u.side; z.realm = u.realm;
      z.start = this.t; z.until = this.t + z.dur; z.n = 0;
      z.interval = z.dur / (z.ticks || 1);
      z.nextTick = this.t + (z.ticks ? z.interval : z.dur);
      this.zones.push(z);
      return z;
    }

    updateZones() {
      for (const z of this.zones) {
        if (z.follow) { if (z.follow.dead) { z.until = this.t; continue; } z.x = z.follow.x; z.y = z.follow.y; }
        if (z.onTick && this.t >= z.nextTick && z.n < (z.ticks || 1)) {
          z.n++; z.nextTick += z.interval;
          const tgts = this.units.filter(t => !t.dead && t.side !== z.side && t.realm === z.realm && this.targetable(t) && Math.hypot(t.x - z.x, t.y - z.y) < z.r + t.r);
          z.onTick(z, tgts);
        }
      }
      this.zones = this.zones.filter(z => this.t < z.until);
    }

    distToSeg(p, a, b) {
      const vx = b.x - a.x, vy = b.y - a.y;
      const l2 = vx * vx + vy * vy || 1;
      const t = clamp(((p.x - a.x) * vx + (p.y - a.y) * vy) / l2, 0, 1);
      return Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t));
    }

    // ---------- kitle kontrolü ----------
    cc(src, t, kind, dur, extra) {
      if (!t || t.dead || t.stasis > 0 || t.banish > 0 || !dur) return;
      if (t.mod.invuln && kind !== 'slow') return;
      if (t.mod.unstoppable || (t.dash && t.dash.unstoppable)) return;
      if (kind === 'slow') { t.slowAmt = Math.max(dur && extra ? dur : 0, this.t < t.slowUntil ? t.slowAmt : 0); t.slowUntil = this.t + (extra || 1); return; }
      const hard = kind !== 'root';
      let d = dur;
      if (kind !== 'knockup' && kind !== 'suppress') d *= 1 - (t.st.fx.tenacity || 0);
      // Arındır / Mikael
      if (hard && d >= 0.9 && !t.isPet) {
        if (t.summs.includes('SummonerBoost') && !(t.summCd.SummonerBoost > this.t)) { t.summCd.SummonerBoost = this.t + 90; this.emit({ t: 'summ', u: t, id: 'SummonerBoost' }); this.emit({ t: 'cleanse', u: t }); return; }
        const mik = this.units.find(a => a.side === t.side && !a.dead && a.st.fx.mikael && !(a.mikCd > this.t) && dist(a, t) < 500);
        if (mik && kind !== 'knockup') { mik.mikCd = this.t + 45; this.heal(mik, t, 150 + t.maxHp * 0.1); this.emit({ t: 'cleanse', u: t }); return; }
      }
      t.cc_ = true;
      src.cc += d;
      switch (kind) {
        case 'stun': t.stun = Math.max(t.stun, d); break;
        case 'root': t.root = Math.max(t.root, d); break;
        case 'sleep': t.sleep = Math.max(t.sleep, d); t.sleeping = true; break;
        case 'suppress': t.suppress = Math.max(t.suppress, d); break;
        case 'berserk': t.berserk = Math.max(t.berserk, d); t.target = null; break;
        case 'knockup':
          if (t.dash) { t.dash = null; }
          t.air = { t: 0, dur: d, h: 70 };
          break;
        case 'fear': t.fear = { until: this.t + d, from: { x: extra ? extra.x : src.x, y: extra ? extra.y : src.y } }; break;
        case 'charm': t.charm = { until: this.t + d, to: extra || src }; break;
      }
      if (t.channel) t.channel = null;
      this.emit({ t: 'cc', u: t, kind, dur: d });
      // Artçı Şok
      if (src.keystone === 8439 && src.rune.aftershock <= this.t && dist(src, t) < 200) {
        src.rune.aftershock = this.t + 15;
        src.rune.aftershockUntil = this.t + 2.5;
        this.later(2.5, () => {
          if (src.dead) return;
          this.emit({ t: 'impact', x: src.x, y: src.y, r: 140, color: '#fbbf24' });
          for (const o of this.enemiesOf(src)) if (dist(o, src) < 140) this.damage(src, o, 40 + src.maxHp * 0.06, 'magic', { quiet: true, aoe: true });
        });
      }
      if (src.keystone === 8351 && !(src.glacialCd > this.t)) {
        src.glacialCd = this.t + 8;
        this.addZone(src, { x: t.x, y: t.y, r: 110, dur: 2, ticks: 4, color: '#bae6fd', kind: 'ice', onTick: (z, tg) => tg.forEach(x => this.cc(src, x, 'slow', 0.4, 0.6)) });
      }
    }

    slow(t, amt, dur) { this.cc(t, t, 'slow', amt, dur); }

    cleanse(t) {
      t.stun = t.root = t.sleep = t.suppress = t.berserk = 0;
      t.fear = t.charm = null; t.slowUntil = 0; t.air = null;
    }

    addBurn(src, t, dps, dur, type) {
      if (!t.burns) t.burns = [];
      t.burns.push({ src, dps, left: dur, acc: 0, type });
    }

    addShield(src, t, amt, dur) {
      if (t.dead) return;
      const a = amt * (1 + (t.st.fx.healAmp || 0) + (src !== t ? (src.st.fx.moonstone || 0) * 0.5 : 0));
      t.shields.push({ a, until: this.t + dur });
      this.emit({ t: 'shield', u: t, a });
    }
    shieldOf(u) { return u.shields.reduce((s, x) => s + x.a, 0); }

    heal(src, t, amt, quiet) {
      if (t.dead || amt <= 0) return 0;
      let a = amt * (1 + (t.st.fx.healAmp || 0) + (t.mod.healAmpBuff || 0));
      if (this.t < t.grievousUntil) a *= 0.6;
      const real = Math.min(a, t.maxHp - t.hp);
      t.hp += real;
      src.heal += real;
      if (real >= 25 && !quiet) this.emit({ t: 'heal', u: t, amount: real });
      return real;
    }

    // ---------- hasar ----------
    damage(src, t, raw, type, o = {}) {
      if (!t || t.dead || raw <= 0) return 0;
      if (t.stasis > 0 || t.banish > 0) return 0;
      if (t.inside && !t.insideAlly) return 0;
      if (src.realm !== t.realm) return 0;
      if (t.mod.invuln) { if (!o.quiet) this.emit({ t: 'immune', u: t }); return 0; }
      if ((o.ability || o.ult) && t.spellshieldReady !== false && t.st.fx.spellshield && !(t.spellshieldCd > this.t) && src.side !== t.side) {
        t.spellshieldCd = this.t + 30;
        this.emit({ t: 'block', u: t });
        return 0;
      }
      let amt = raw;
      if (type === 'physical') {
        let arm = this.armor(t) * (1 - t.shred) * (1 - (src.st.fx.arpen || 0)) - (src.st.fx.leth || 0);
        amt *= arm >= 0 ? 100 / (100 + arm) : 2 - 100 / (100 - arm);
        if (src.st.fx.shred) t.shred = Math.min(src.st.fx.shred, t.shred + 0.06);
      } else if (type === 'magic') {
        let mr = this.mr(t) * (1 - (src.st.fx.mpen || 0)) - (src.st.fx.mpenFlat || 0);
        amt *= mr >= 0 ? 100 / (100 + mr) : 2 - 100 / (100 - mr);
        if (t.st.fx.forceOfNature) t.fonStacks = Math.min(7, (t.fonStacks || 0) + 0.25);
      }
      // çıkan hasar çarpanları
      let mult = 1 + src.mod.amp;
      if (src.keystone === 8010 && src.rune.stacks >= 12 && this.t < src.rune.conqUntil) mult += 0.12;
      if (src.rune.firstUntil && this.t < src.rune.firstUntil) mult += 0.12;
      if (src.st.fx.riftmaker) mult += Math.min(src.st.fx.riftmaker, this.t * 0.01);
      if (src.st.fx.execute && t.hp / t.maxHp < 0.4) mult += src.st.fx.execute;
      if (src.st.fx.profane && t.hp / t.maxHp < 0.5) mult += 0.1;
      if (src.st.fx.horizon && (dist(src, t) > 300 || t.stun > 0 || t.root > 0)) mult += src.st.fx.horizon;
      if (src.st.fx.shojin && o.ability) mult += src.st.fx.shojin;
      if (this.t < t.vulnUntil) mult += 0.08;
      if (this.t < src.exhaustedUntil) mult *= 0.65;
      if (src.blindUntil && this.t < src.blindUntil && o.basic) mult *= 0.5;
      amt *= mult;
      // gelen hasar azaltma
      if (o.crit && t.st.fx.randuin) amt *= 1 - t.st.fx.randuin;
      if (o.basic && t.st.fx.attackDr) amt *= 1 - t.st.fx.attackDr;
      amt *= 1 - t.mod.dr;
      if (t.st.fx.dd && type !== 'true') { const delayed = amt * t.st.fx.dd; amt -= delayed; this.addBurn(src, t, delayed / 3, 3, 'true'); }
      if (t.sleeping && t.sleep > 0) { amt *= 1.2; t.sleep = 0; t.sleeping = false; }

      // kalkanlar
      let left = amt;
      const antiShield = 1;
      for (const s of t.shields) {
        if (left <= 0) break;
        const take = Math.min(s.a, left * antiShield);
        s.a -= take; left -= take / antiShield;
      }
      const noDeathZone = this.zones.some(z => z.noDeath && z.side === t.side && Math.hypot(t.x - z.x, t.y - z.y) < z.r);
      t.hp -= left;
      if (t.hp < 1 && (t.mod.undying || noDeathZone)) t.hp = 1;
      t.lastHurt = this.t;
      t.taken += amt;
      t.lastHurtBy[src.uid] = this.t;
      const credit = src.isPet ? src.owner : src;
      credit.dmg += amt;
      t.flash = 0.12;
      if (!o.quiet || o.big) this.emit({ t: 'hit', u: t, amount: amt, type, crit: !!o.crit, big: !!o.big, ult: !!o.ult });

      // can çalma ve vuruşta etkiler
      if (o.basic && (src.st.ls || src.mod.ls)) {
        const ls = src.st.ls + src.mod.ls;
        const healed = this.heal(src, src, amt * ls, true);
        if (src.st.fx.bloodShield && src.hp >= src.maxHp - 1) this.addShield(src, src, Math.min(300, amt * ls - healed), 3);
      }
      if (src.keystone === 8010 && src.rune.stacks >= 12 && this.t < src.rune.conqUntil) this.heal(src, src, amt * (src.ranged ? 0.05 : 0.08), true);
      if (src.st.fx.riftmaker && this.t > 4) this.heal(src, src, amt * 0.06, true);
      if (src.st.fx.taste && !(src.tasteCd > this.t) && !t.isPet) { src.tasteCd = this.t + 15; this.heal(src, src, 30 + 0.1 * this.bonusAd(src) + 0.05 * this.ap(src), true); }
      if (o.basic && type === 'physical' && t.st.fx.thorns && !o.reflect) {
        this.damage(t, src, 30 + amt * t.st.fx.thorns, 'magic', { quiet: true, reflect: true });
        if (t.st.fx.grievous) src.grievousUntil = this.t + 3;
      }
      if (!t.isPet && src.side !== t.side) {
        t.energy += amt / t.maxHp * 25;
        credit.energy += amt / t.maxHp * 12;
      }

      // tetikler
      const pct = t.hp / t.maxHp;
      if (t.hp > 0) {
        const fx = t.st.fx;
        if (fx.sterak && !t.used.sterak && pct < 0.3) { t.used.sterak = 1; this.addShield(t, t, (t.maxHp - t.champ.stats.hp) * fx.sterak, 4); this.emit({ t: 'itemProc', u: t, id: 3053 }); }
        if (fx.shieldbow && !t.used.shieldbow && pct < 0.3) { t.used.shieldbow = 1; this.addShield(t, t, 300 + t.maxHp * 0.12, 3); this.addBuff(t, { key: 'shieldbow', dur: 6, ls: 0.12 }); this.emit({ t: 'itemProc', u: t, id: 6673 }); }
        if (fx.maw && !t.used.maw && pct < 0.3) { t.used.maw = 1; this.addShield(t, t, 250 + 1.5 * this.bonusAd(t), 3); this.emit({ t: 'itemProc', u: t, id: 3156 }); }
        if (fx.seraph && !t.used.seraph && pct < 0.3) { t.used.seraph = 1; this.addShield(t, t, 250 + 0.2 * this.ap(t) + 300, 3); this.emit({ t: 'itemProc', u: t, id: 3040 }); }
        if (fx.kaenic && !t.used.kaenic && type === 'magic' && pct < 0.6) { t.used.kaenic = 1; this.addShield(t, t, t.maxHp * 0.15, 6); }
        if (fx.zhonya && !t.used.zhonya && pct < 0.3) { t.used.zhonya = 1; t.stasis = fx.zhonya; t.dash = null; this.emit({ t: 'stasis', u: t, color: '#fbbf24' }); this.emit({ t: 'itemProc', u: t, id: 3157 }); }
        for (const a of this.alliesOf(t)) {
          if (a.st.fx.solari && !a.used.solari && pct < 0.45 && dist(a, t) < 600) {
            a.used.solari = 1;
            this.emit({ t: 'impact', x: a.x, y: a.y, r: 260, color: '#fde68a', holy: true });
            this.emit({ t: 'itemProc', u: a, id: 3190 });
            for (const b of this.alliesOf(a)) if (dist(a, b) < 600) this.addShield(a, b, 200 + b.maxHp * 0.04, 2.5);
          }
          if (a.st.fx.redemption && !a.used.redemption && pct < 0.35) {
            a.used.redemption = 1;
            const x = t.x, y = t.y;
            this.emit({ t: 'telegraph', x, y, r: 180, dur: 2, color: '#86efac' });
            this.emit({ t: 'itemProc', u: a, id: 3107 });
            this.later(2, () => {
              this.emit({ t: 'impact', x, y, r: 180, color: '#86efac', holy: true, sky: true });
              for (const b of this.alliesOf(a)) if (Math.hypot(b.x - x, b.y - y) < 200) this.heal(a, b, 220 + b.maxHp * 0.1);
              for (const e of this.enemiesOf(a)) if (Math.hypot(e.x - x, e.y - y) < 200) this.damage(a, e, e.maxHp * 0.1, 'true', { aoe: true });
            });
          }
          if (a.keystone === 8465 && a !== t && !(a.rune.guardian > this.t) && dist(a, t) < 260 && pct < 0.5) {
            a.rune.guardian = this.t + 30;
            this.addShield(a, t, 120 + 0.15 * this.ap(a) + 0.1 * (a.maxHp - a.champ.stats.hp), 2);
            this.addShield(a, a, 120, 2);
            this.emit({ t: 'link', from: a, to: t, color: '#93c5fd' });
          }
          if (a.st.fx.vow && a !== t && dist(a, t) < 500 && !t.isPet) {
            const moved = left * 0.1;
            t.hp += moved; a.hp -= moved;
            if (a.hp <= 0) { a.hp = 1; }
          }
        }
      } else {
        if (t.isPet) { this.killPet(src, t); return amt; }
        this.kill(src, t);
      }
      return amt;
    }

    killPet(src, p) {
      if (p.explode) this.petExplode(p);
      p.dead = true; p.deathT = this.t;
      this.emit({ t: 'petGone', u: p });
    }

    kill(src, t) {
      t.hp = 0;
      t.dead = true;
      t.deathT = this.t;
      t.shields = [];
      t.burns = [];
      t.dash = null; t.air = null; t.channel = null;
      t.deaths++;
      const killer = src.isPet ? src.owner : src;
      if (t.st.fx.ga && !t.used.ga) { t.used.ga = 1; t.reviveAt = this.t + 4; t.reviveHp = 0.5; this.emit({ t: 'itemProc', u: t, id: 3026 }); }
      if (killer.side !== t.side) {
        killer.kills++;
        this.kills[killer.side]++;
        for (const uid in t.lastHurtBy) {
          const a = this.units.find(x => x.uid === +uid);
          if (a && a !== killer && !a.isPet && a.side === killer.side && this.t - t.lastHurtBy[uid] < 8) a.assists++;
        }
        killer.energy += 25;
        if (killer.st.fx.dd) { killer.burns = (killer.burns || []).filter(b => b.type !== 'true'); this.heal(killer, killer, killer.maxHp * 0.1); }
        if (killer.st.fx.hubris) killer.rune.hubris = (killer.rune.hubris || 0) + 15;
        if (killer.st.fx.axiom) killer.energy += 40;
        if (killer.st.fx.heartsteel || killer.st.fx.despair) this.heal(killer, killer, killer.maxHp * 0.05, true);
        if (killer.st.fx.triumph) this.heal(killer, killer, killer.maxHp * killer.st.fx.triumph);
        if (killer.st.fx.collector) killer.energy += 5;
        if (killer.keystone === 8128) killer.rune.harvest++;
        if (killer.keystone === 9923) killer.rune.hail = 3;
      }
      // içindeki Kayn / Tahm
      for (const x of this.units) if (x.inside === t) { x.insideUntil = this.t; }
      for (const x of this.units) if (x.isPet && x.owner === t && !x.dead && !x.explode) { x.expires = this.t + 2; }
      this.projs = this.projs.filter(p => p.tg !== t);
      this.emit({ t: 'kill', killer, victim: t, first: this.kills[0] + this.kills[1] === 1 });
    }

    revive(u, hpPct) {
      u.dead = false; u.reviveAt = 0;
      u.hp = u.maxHp * hpPct;
      u.stun = u.root = 0; u.fear = u.charm = null;
      this.emit({ t: 'revive', u });
    }

    separate() {
      const live = this.units.filter(u => !u.dead && !u.dash && !u.inside && u.banish <= 0);
      for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
        const a = live[i], b = live[j];
        if (a.realm !== b.realm) continue;
        const d = dist(a, b), min = (a.r + b.r) * 0.9;
        if (d < min && d > 0.01) {
          const push = (min - d) / 2;
          const nx = (a.x - b.x) / d, ny = (a.y - b.y) / d;
          a.x += nx * push; a.y += ny * push;
          b.x -= nx * push; b.y -= ny * push;
        }
      }
    }

    alive(side) { return this.units.some(u => u.side === side && !u.isPet && (!u.dead || u.reviveAt)); }

    checkEnd() {
      const a = this.alive(0), b = this.alive(1);
      if (a && b && this.t < 120) return;
      this.done = true;
      if (a !== b) this.winner = a ? 0 : 1;
      else {
        const hp = s => this.champs(s).reduce((t, u) => t + (u.dead ? 0 : u.hp / u.maxHp), 0);
        this.winner = hp(0) >= hp(1) ? 0 : 1;
      }
    }

    runHeadless(maxT = 140) {
      while (!this.done && this.t < maxT) { this.step(1 / 30); this.events.length = 0; }
      if (!this.done) { this.t = 999; this.checkEnd(); }
      return this.winner;
    }
  }

  root.Mayhem = { W, H, LEVEL, REALM, HP_MULT, ITEMS, setItemData, computeStats, Sim, dist };
})(typeof window !== 'undefined' ? window : globalThis);
