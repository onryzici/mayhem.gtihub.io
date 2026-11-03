// Mayhem savaş alanı çizimi: kamera, zemin, birimler, efektler
(function (root) {
  const M = root.Mayhem;
  const TAU = Math.PI * 2;
  const VW = 1280, VH = 720;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // ---------- zemin ----------
  function seeded(seed) {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  // Kare simge ya da dikey kostüm görselinden yüz kırpımı
  function drawPic(c, pic, x, y, size) {
    const w = pic.naturalWidth, h = pic.naturalHeight;
    if (h > w * 1.2) { const sw = w * 0.66; c.drawImage(pic, (w - sw) / 2, h * 0.07, sw, sw, x, y, size, size); }
    else c.drawImage(pic, x, y, size, size);
  }

  function makeGround(colors) {
    const SC = 1.5;
    const c = document.createElement('canvas');
    c.width = M.W * SC; c.height = M.H * SC;
    const g = c.getContext('2d');
    g.scale(SC, SC);
    const R = seeded(7);
    const W = M.W, H = M.H;

    // çim tabanı
    const base = g.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, '#1d3b27');
    base.addColorStop(0.5, '#24472d');
    base.addColorStop(1, '#1a3423');
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) {
      const x = R() * W, y = R() * H, r = 60 + R() * 160;
      const p = g.createRadialGradient(x, y, 0, x, y, r);
      const light = R() < 0.5;
      p.addColorStop(0, light ? 'rgba(80,130,70,0.18)' : 'rgba(10,25,15,0.22)');
      p.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = p;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // çim bıçakları
    for (let i = 0; i < 9000; i++) {
      const x = R() * W, y = R() * H;
      const h = 3 + R() * 5;
      g.strokeStyle = `hsla(${95 + R() * 30}, ${35 + R() * 25}%, ${18 + R() * 22}%, ${0.35 + R() * 0.4})`;
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 3, y - h); g.stroke();
    }

    // toprak yol (iki üs arası)
    const path = () => {
      g.beginPath();
      g.moveTo(-20, H / 2 + 20);
      g.bezierCurveTo(W * 0.3, H * 0.62, W * 0.42, H * 0.38, W / 2, H / 2);
      g.bezierCurveTo(W * 0.58, H * 0.62, W * 0.7, H * 0.38, W + 20, H / 2 - 20);
    };
    g.lineCap = 'round';
    path(); g.strokeStyle = 'rgba(60,45,25,0.55)'; g.lineWidth = 120; g.stroke();
    path(); g.strokeStyle = 'rgba(120,95,60,0.45)'; g.lineWidth = 92; g.stroke();
    path(); g.strokeStyle = 'rgba(150,120,80,0.22)'; g.lineWidth = 50; g.stroke();
    for (let i = 0; i < 900; i++) {
      const t = R();
      const x = t * W, y = H / 2 + Math.sin(t * Math.PI * 2) * 60 + (R() - 0.5) * 90;
      g.fillStyle = `rgba(${90 + R() * 60},${70 + R() * 40},${40 + R() * 30},${0.25 + R() * 0.3})`;
      g.fillRect(x, y, 1 + R() * 3, 1 + R() * 2);
    }

    // nehir
    const river = () => {
      g.beginPath();
      g.moveTo(W * 0.43, -40);
      g.bezierCurveTo(W * 0.55, H * 0.25, W * 0.42, H * 0.7, W * 0.57, H + 40);
    };
    path();
    river(); g.strokeStyle = 'rgba(150,130,90,0.55)'; g.lineWidth = 150; g.stroke();
    river(); g.strokeStyle = '#173f4d'; g.lineWidth = 128; g.stroke();
    river(); g.strokeStyle = '#1f5a6a'; g.lineWidth = 100; g.stroke();
    river(); g.strokeStyle = 'rgba(70,150,170,0.45)'; g.lineWidth = 46; g.stroke();
    // köprü taşları (yolun nehri kestiği yer)
    for (let i = 0; i < 16; i++) {
      const x = W / 2 - 70 + i * 9 + (R() - 0.5) * 6, y = H / 2 + (R() - 0.5) * 70;
      g.fillStyle = `rgba(${120 + R() * 40},${115 + R() * 30},${100 + R() * 30},0.85)`;
      g.beginPath(); g.ellipse(x, y, 7 + R() * 6, 5 + R() * 4, R() * 3, 0, TAU); g.fill();
    }

    // çalılar
    const brush = (cx, cy, w, h) => {
      for (let i = 0; i < 380; i++) {
        const x = cx + (R() - 0.5) * w, y = cy + (R() - 0.5) * h;
        const len = 10 + R() * 14;
        g.strokeStyle = `hsla(${100 + R() * 25}, ${40 + R() * 20}%, ${14 + R() * 18}%, 0.9)`;
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (R() - 0.5) * 6, y - len / 2, x + (R() - 0.5) * 10, y - len); g.stroke();
      }
    };
    brush(520, 190, 170, 60); brush(880, 610, 170, 60); brush(260, 690, 150, 50); brush(1140, 110, 150, 50);

    // kayalar
    const rock = (cx, cy, size) => {
      const pts = [];
      const n = 7 + Math.floor(R() * 4);
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU, r = size * (0.7 + R() * 0.4);
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.75]);
      }
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x + 6, y + 8) : g.moveTo(x + 6, y + 8)); g.closePath(); g.fill();
      const grd = g.createLinearGradient(cx - size, cy - size, cx + size, cy + size);
      grd.addColorStop(0, '#7b7a72'); grd.addColorStop(1, '#3d3c38');
      g.fillStyle = grd;
      g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 2; g.stroke();
    };
    // ağaç tepeleri
    const tree = (cx, cy, size) => {
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.beginPath(); g.arc(cx + 10, cy + 12, size, 0, TAU); g.fill();
      for (let i = 0; i < 6; i++) {
        const a = R() * TAU, d = R() * size * 0.4;
        const gr = g.createRadialGradient(cx + Math.cos(a) * d - size * 0.2, cy + Math.sin(a) * d - size * 0.25, 2, cx + Math.cos(a) * d, cy + Math.sin(a) * d, size * 0.8);
        gr.addColorStop(0, '#3f6b36'); gr.addColorStop(1, '#14301a');
        g.fillStyle = gr;
        g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, size * (0.55 + R() * 0.3), 0, TAU); g.fill();
      }
    };
    for (let x = 0; x < W + 80; x += 70) {
      if (R() < 0.55) tree(x + R() * 30, 20 + R() * 30, 34 + R() * 20); else rock(x + R() * 30, 30 + R() * 25, 24 + R() * 16);
      if (R() < 0.55) tree(x + R() * 30, H - 15 - R() * 25, 34 + R() * 20); else rock(x + R() * 30, H - 22 - R() * 20, 24 + R() * 16);
    }
    rock(700, 70, 40); rock(720, 735, 40);

    // üst ve alt koridor
    const lane = (y0, y1) => {
      g.beginPath();
      g.moveTo(90, H / 2 + (y1 > H / 2 ? 60 : -60));
      g.quadraticCurveTo(150, y1, 300, y1);
      g.lineTo(W - 300, y1);
      g.quadraticCurveTo(W - 150, y1, W - 90, H / 2 + (y1 > H / 2 ? 60 : -60));
    };
    for (const y of [125, 690]) {
      lane(0, y); g.strokeStyle = 'rgba(60,45,25,0.45)'; g.lineWidth = 78; g.stroke();
      lane(0, y); g.strokeStyle = 'rgba(120,95,60,0.35)'; g.lineWidth = 56; g.stroke();
      lane(0, y); g.strokeStyle = 'rgba(150,120,80,0.16)'; g.lineWidth = 26; g.stroke();
    }
    // kamp çukurları
    const pit = (x, y, r, epic, col) => {
      g.fillStyle = 'rgba(0,0,0,0.28)';
      g.beginPath(); g.ellipse(x + 4, y + 6, r * 1.9, r * 1.35, 0, 0, TAU); g.fill();
      const pg = g.createRadialGradient(x, y, r * 0.2, x, y, r * 1.8);
      pg.addColorStop(0, epic ? 'rgba(70,58,44,0.95)' : 'rgba(92,74,50,0.85)');
      pg.addColorStop(1, 'rgba(60,48,32,0)');
      g.fillStyle = pg;
      g.beginPath(); g.ellipse(x, y, r * 1.9, r * 1.4, 0, 0, TAU); g.fill();
      const n = epic ? 14 : 8;
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU + R() * 0.3, rr = r * (epic ? 1.75 : 1.6);
        g.fillStyle = `rgba(${110 + R() * 40},${105 + R() * 30},${95 + R() * 25},0.85)`;
        g.beginPath(); g.ellipse(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.72, 5 + R() * 5, 4 + R() * 3, R() * 3, 0, TAU); g.fill();
      }
      g.strokeStyle = hexA(col, epic ? 0.5 : 0.3); g.lineWidth = 2;
      g.setLineDash([6, 7]); g.beginPath(); g.ellipse(x, y, r * 1.45, r * 1.05, 0, 0, TAU); g.stroke(); g.setLineDash([]);
    };
    for (const d of M.CAMP_DEFS) for (const side of [0, 1]) pit(side ? W - d.x : d.x, d.y, d.r, false, d.color);
    for (const d of M.EPIC_DEFS) pit(d.x, d.y, d.r, true, d.color);

    // üsler
    [[0, colors[0]], [1, colors[1]]].forEach(([side, col]) => {
      const cx = side ? W - 40 : 40, cy = H / 2;
      // taş platform: halka halka döşeme
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.beginPath(); g.arc(cx + 6, cy + 8, 150, 0, TAU); g.fill();
      for (let ring = 5; ring >= 0; ring--) {
        const r0 = 22 + ring * 25, r1 = r0 + 25, n = 8 + ring * 6;
        for (let a = 0; a < n; a++) {
          const a0 = a / n * TAU + ring * 0.3, a1 = (a + 1) / n * TAU + ring * 0.3;
          const sh = 95 + R() * 35;
          g.fillStyle = `rgb(${sh},${sh - 4},${sh - 12})`;
          g.beginPath(); g.arc(cx, cy, r1 - 2, a0 + 0.02, a1 - 0.02); g.arc(cx, cy, r0 + 1, a1 - 0.02, a0 + 0.02, true); g.closePath(); g.fill();
        }
      }
      g.fillStyle = 'rgb(70,68,64)'; g.beginPath(); g.arc(cx, cy, 24, 0, TAU); g.fill();
      const gl = g.createRadialGradient(cx, cy, 10, cx, cy, 170);
      gl.addColorStop(0, hexA(col, 0.45)); gl.addColorStop(1, hexA(col, 0));
      g.fillStyle = gl; g.fillRect(cx - 170, cy - 170, 340, 340);
      g.strokeStyle = hexA(col, 0.7); g.lineWidth = 3;
      g.beginPath(); g.arc(cx, cy, 120, 0, TAU); g.stroke();
      g.setLineDash([10, 8]); g.beginPath(); g.arc(cx, cy, 100, 0, TAU); g.stroke(); g.setLineDash([]);
      // kristal
      g.fillStyle = hexA(col, 0.9);
      g.beginPath(); g.moveTo(cx, cy - 34); g.lineTo(cx + 16, cy); g.lineTo(cx, cy + 34); g.lineTo(cx - 16, cy); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.beginPath(); g.moveTo(cx, cy - 34); g.lineTo(cx + 6, cy - 4); g.lineTo(cx - 6, cy); g.closePath(); g.fill();
    });
    return c;
  }

  // ---------- görüntüleyici ----------
  class Viewer {
    constructor(canvas, sim, opts) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.sim = sim;
      this.colors = opts.colors;
      this.assets = opts.assets;
      this.hooks = opts.hooks || {};
      this.speed = opts.speed || 1;
      this.gate = opts.gate || null;
      this.mySide = opts.mySide || 0;
      this.ground = makeGround(this.colors);
      this.cam = { x: M.W / 2, y: M.H / 2, z: VW / M.W };
      this.shake = 0;
      this.slowmo = 0;
      this.parts = []; this.fx = []; this.floats = []; this.ghosts = []; this.teles = []; this.marks = []; this.pings = [];
      this.motes = Array.from({ length: 40 }, () => ({ x: rnd(0, M.W), y: rnd(0, M.H), vx: rnd(-6, 6), vy: rnd(-10, -3), a: rnd(0, TAU) }));
      this.acc = 0; this.real = 0; this.running = true; this.ended = false; this.doneFor = 0;
      this.last = performance.now();
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.resize();
      this.onResize = () => this.resize();
      window.addEventListener('resize', this.onResize);
      this.onClick = e => this.click(e);
      canvas.addEventListener('pointerdown', this.onClick);
      requestAnimationFrame(this.frame);
      // online maçta sekme arka plandayken de simülasyon ilerlesin (çizim yapmadan)
      if (this.gate) {
        this.bgLast = performance.now();
        this.bgTimer = setInterval(() => {
          const now = performance.now();
          const realDt = Math.min(3, (now - this.bgLast) / 1000);
          this.bgLast = now;
          if (!this.running || !document.hidden) return;
          this.last = now;
          if (!this.sim.done) {
            this.acc += realDt * this.speed;
            let steps = 0;
            while (this.acc >= 1 / 60 && !this.sim.done && steps < 240) {
              if (!this.gate(this.sim.tick + 1)) { this.acc = Math.min(this.acc, 0.1); break; }
              this.sim.step(1 / 60); this.acc -= 1 / 60; steps++;
              this.sim.events.length = 0;
            }
          } else if (!this.ended) {
            this.doneFor += realDt;
            if (this.doneFor > 1.8) { this.ended = true; this.hooks.onEnd && this.hooks.onEnd(this.sim); }
          }
          this.hooks.onFrame && this.hooks.onFrame(this.sim, realDt);
        }, 250);
      }
    }

    resize() {
      const w = this.canvas.clientWidth || VW;
      this.canvas.width = Math.round(w * this.dpr);
      this.canvas.height = Math.round(w * VH / VW * this.dpr);
    }

    stop() {
      this.running = false;
      clearInterval(this.bgTimer);
      window.removeEventListener('resize', this.onResize);
      this.canvas.removeEventListener('pointerdown', this.onClick);
    }

    skip() {
      if (this.ended) return;
      while (!this.sim.done) { this.sim.step(1 / 30); this.sim.events.length = 0; }
      this.ended = true;
      this.hooks.onEnd && this.hooks.onEnd(this.sim);
    }

    // ekran -> dünya
    toWorld(sx, sy) {
      const k = this.canvas.width / VW / this.dpr;
      const vx = sx / k, vy = sy / k;
      return { x: (vx - VW / 2) / this.cam.z + this.cam.x, y: (vy - VH / 2) / this.cam.z + this.cam.y };
    }

    click(e) {
      const r = this.canvas.getBoundingClientRect();
      const p = this.toWorld(e.clientX - r.left, e.clientY - r.top);
      let best = null, bd = 60;
      for (const u of this.sim.units) {
        if (u.dead || u.side !== 1 - this.mySide || u.realm || u.isPet) continue;
        const d = Math.hypot(u.x - p.x, u.y - p.y);
        if (d < bd) { bd = d; best = u; }
      }
      if (best) {
        if (this.hooks.focus) this.hooks.focus(best);
        else this.sim.focus[this.mySide] = { u: best, until: this.sim.t + 6 };
        this.pings.push({ u: best, life: 1.2 });
        this.hooks.onFocus && this.hooks.onFocus(best);
      }
    }

    frame = ts => {
      if (!this.running) return;
      const realDt = Math.min(0.05, (ts - this.last) / 1000);
      this.last = ts;
      this.real += realDt;
      let scale = this.speed;
      if (this.slowmo > 0) { this.slowmo -= realDt; scale *= 0.3; }
      const dt = realDt * scale;
      if (!this.sim.done) {
        this.acc += dt;
        let steps = 0;
        while (this.acc >= 1 / 60 && !this.sim.done && steps < 12) {
          // online: rakip yetişene kadar bekle
          if (this.gate && !this.gate(this.sim.tick + 1)) { this.acc = Math.min(this.acc, 0.1); break; }
          this.sim.step(1 / 60);
          this.acc -= 1 / 60;
          steps++;
          this.consume();
        }
      } else if (!this.ended) {
        this.doneFor += realDt;
        if (this.doneFor > 1.8) { this.ended = true; this.hooks.onEnd && this.hooks.onEnd(this.sim); }
      }
      this.update(realDt, dt);
      this.draw();
      this.hooks.onFrame && this.hooks.onFrame(this.sim, realDt);
      requestAnimationFrame(this.frame);
    };

    // ---------- olaylar ----------
    float(u, text, color, size = 15, opts = {}) {
      this.floats.push({ x: u.x + rnd(-12, 12), y: u.y - (u.r || 24) - 26, z: 0, text, color, size, life: opts.life || 1, max: opts.life || 1, vy: opts.vy || -38, icon: opts.icon, realm: u.realm });
    }
    burst(x, y, color, n, speed = 120, size = 3, realm = 0, opts = {}) {
      for (let i = 0; i < n; i++) {
        const a = rnd(0, TAU), s = rnd(speed * 0.3, speed);
        this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (opts.up || 0), life: rnd(0.3, 0.8) * (opts.lifeMult || 1), max: 0.8 * (opts.lifeMult || 1), color, size: rnd(size * 0.5, size), g: opts.g || 0, realm });
      }
    }
    addFx(f) { f.max = f.life; this.fx.push(f); return f; }

    consume() {
      const sim = this.sim;
      for (const e of sim.events) {
        switch (e.t) {
          case 'hit': {
            const u = e.u;
            const n = Math.round(e.amount);
            if (n < 4) break;
            const col = e.type === 'magic' ? '#c9a7ff' : e.type === 'true' ? '#ffffff' : (e.crit ? '#ffb020' : '#ffe0b0');
            const size = e.ult || e.big ? 22 : e.crit ? 19 : 14;
            this.float(u, n + (e.crit ? '!' : ''), col, size);
            this.burst(u.x, u.y, e.type === 'magic' ? '#b48cff' : '#ffd08a', e.ult ? 10 : 3, e.ult ? 180 : 90, 2.5, u.realm);
            if (e.ult) this.shake = Math.max(this.shake, 4);
            break;
          }
          case 'heal': this.float(e.u, '+' + Math.round(e.amount), '#4ade80', 14); this.burst(e.u.x, e.u.y, '#86efac', 5, 50, 2.5, e.u.realm, { up: 40 }); break;
          case 'swing': this.addFx({ kind: 'swing', u: e.u, tg: e.tg, crit: e.crit, life: 0.16 }); break;
          case 'slash': this.addFx({ kind: 'slash', x: e.tg.x, y: e.tg.y, a: Math.atan2(e.tg.y - e.u.y, e.tg.x - e.u.x), color: e.color, big: e.big, life: 0.3, realm: e.tg.realm }); break;
          case 'shot': this.addFx({ kind: 'tracer', x1: e.from.x, y1: e.from.y, x2: e.to.x, y2: e.to.y, color: e.color, life: 0.12, realm: e.from.realm }); break;
          case 'blast': this.addFx({ kind: 'ring', x: e.x, y: e.y, r: e.r, color: e.color, life: 0.4 }); this.burst(e.x, e.y, e.color, 10, 160, 3); break;
          case 'pulse': this.addFx({ kind: 'ring', x: e.x, y: e.y, r: e.r, color: e.color, life: 0.5, thin: true, realm: e.u ? e.u.realm : 0 }); break;
          case 'impact': {
            this.addFx({ kind: 'ring', x: e.x, y: e.y, r: e.r, color: e.color, life: e.big ? 0.7 : 0.45, big: e.big, realm: e.y < -200 ? 1 : 0 });
            if (e.big) this.addFx({ kind: 'flashDisk', x: e.x, y: e.y, r: e.r, color: e.color, life: 0.35 });
            if (e.sky) this.addFx({ kind: 'column', x: e.x, y: e.y, r: Math.min(60, e.r * 0.5), color: e.color, life: 0.5 });
            if (e.holy) this.addFx({ kind: 'column', x: e.x, y: e.y, r: 40, color: e.color, life: 0.6 });
            if (e.shark) this.addFx({ kind: 'shark', x: e.x, y: e.y, color: e.color, life: 0.6 });
            if (e.vines) this.addFx({ kind: 'vines', x: e.x, y: e.y, r: e.r, color: e.color, life: 0.8 });
            this.burst(e.x, e.y, e.color, e.big ? 34 : 12, e.big ? 300 : 160, e.big ? 4 : 3, e.y < -200 ? 1 : 0);
            if (e.big) this.burst(e.x, e.y, '#d6c7a1', 14, 120, 3, 0, { g: 260, up: 120 });
            this.shake = Math.max(this.shake, e.shake || (e.big ? 6 : 0));
            break;
          }
          case 'telegraph': this.teles.push({ x: e.x, y: e.y, r: e.r, color: e.color, life: e.dur, max: e.dur, follow: e.follow }); break;
          case 'dash': this.addFx({ kind: 'dashStart', u: e.u, color: e.d.color || this.colors[e.u.side], life: 0.25, x: e.u.x, y: e.u.y }); break;
          case 'blink':
            this.burst(e.fx, e.fy, '#e9d5ff', 12, 120, 3, e.u.realm);
            this.burst(e.u.x, e.u.y, '#e9d5ff', 12, 120, 3, e.u.realm);
            this.addFx({ kind: 'tracer', x1: e.fx, y1: e.fy, x2: e.u.x, y2: e.u.y, color: '#e9d5ff', life: 0.25, wide: true, realm: e.u.realm });
            break;
          case 'cc':
            if (e.kind === 'knockup') this.float(e.u, 'HAVADA', '#facc15', 12, { life: 0.8 });
            else if (e.kind === 'stun' && e.dur >= 1) this.float(e.u, 'SERSEM', '#facc15', 12, { life: 0.8 });
            else if (e.kind === 'fear') this.float(e.u, 'KORKU', '#c084fc', 12, { life: 0.8 });
            else if (e.kind === 'charm') this.float(e.u, '♥', '#f9a8d4', 20, { life: 0.8 });
            else if (e.kind === 'sleep') this.float(e.u, 'Zzz', '#f9a8d4', 16, { life: 1 });
            else if (e.kind === 'suppress') this.float(e.u, 'BASTIRILDI', '#a78bfa', 12, { life: 0.8 });
            else if (e.kind === 'berserk') this.float(e.u, 'ÇILDIRDI', '#4ade80', 12, { life: 0.8 });
            else if (e.kind === 'root') this.float(e.u, 'KÖK', '#86efac', 12, { life: 0.7 });
            break;
          case 'stasis': this.float(e.u, 'DOKUNULMAZ', '#fde68a', 13); this.addFx({ kind: 'ring', x: e.u.x, y: e.u.y, r: 50, color: e.color || '#fde68a', life: 0.5, realm: e.u.realm }); break;
          case 'block': this.float(e.u, 'ENGELLENDİ', '#cbd5e1', 13); this.addFx({ kind: 'ring', x: e.u.x, y: e.u.y, r: 40, color: '#e2e8f0', life: 0.4, realm: e.u.realm }); break;
          case 'immune': if (Math.random() < (e.u.isNexus ? 0.08 : 0.3)) this.float(e.u, e.u.isNexus ? 'KORUMALI' : 'ÖLÜMSÜZ', '#fde68a', 12, { life: 0.6 }); break;
          case 'revive': this.float(e.u, 'DİRİLDİ', '#fde68a', 16); this.addFx({ kind: 'column', x: e.u.x, y: e.u.y, r: 40, color: '#fde68a', life: 0.8 }); break;
          case 'kill':
            this.burst(e.victim.x, e.victim.y, this.colors[e.victim.side], 30, 220, 4, e.victim.realm);
            this.addFx({ kind: 'soul', x: e.victim.x, y: e.victim.y, color: this.colors[e.victim.side], life: 1.4, realm: e.victim.realm });
            this.shake = Math.max(this.shake, 5);
            this.hooks.onKill && this.hooks.onKill(e);
            break;
          case 'ult':
            this.slowmo = Math.max(this.slowmo, 0.4);
            this.addFx({ kind: 'ultAura', u: e.u, color: this.ultColor(e.u), life: 0.9 });
            this.hooks.onUlt && this.hooks.onUlt(e.u);
            break;
          case 'ultReady': this.hooks.onUltReady && this.hooks.onUltReady(e.u); break;
          case 'summ': this.float(e.u, '', '#fff', 14, { icon: this.assets.summIcon(e.id), life: 1.1, vy: -25 }); break;
          case 'itemProc': this.float(e.u, '', '#fff', 14, { icon: this.assets.itemIcon(e.id), life: 1.1, vy: -25 }); break;
          case 'ignite': this.burst(e.u.x, e.u.y, '#fb923c', 14, 90, 3, e.u.realm, { up: 60 }); break;
          case 'exhaust': this.addFx({ kind: 'ring', x: e.u.x, y: e.u.y, r: 40, color: '#94a3b8', life: 0.6 }); break;
          case 'smite':
            this.addFx({ kind: 'column', x: e.u.x, y: e.u.y, r: 30, color: '#fbbf24', life: 0.45 });
            if (e.from) this.addFx({ kind: 'zap', from: { x: e.from.x, y: e.from.y }, to: e.u, color: '#fde047', life: 0.3 });
            this.burst(e.u.x, e.u.y, '#fde047', 18, 180, 3.5);
            this.shake = Math.max(this.shake, e.u.epic ? 7 : 2);
            break;
          case 'monsterKill': {
            const m = e.m;
            this.burst(m.x, m.y, m.color, m.epic ? 50 : 18, m.epic ? 320 : 160, m.epic ? 4.5 : 3);
            const txt = m.key === 'blue' ? 'MAVİ BUFF' : m.key === 'red' ? 'KIRMIZI BUFF' : m.epic ? m.name.toLocaleUpperCase('tr') : '+' + m.def.gold;
            this.float(e.u, txt, m.def.buff || m.epic ? m.color : '#fbbf24', m.epic ? 20 : 13, { life: 1.4 });
            if (m.epic) { this.shake = Math.max(this.shake, 10); this.addFx({ kind: 'ring', x: m.x, y: m.y, r: 160, color: m.color, life: 0.8, big: true }); }
            break;
          }
          case 'objective': this.hooks.onObjective && this.hooks.onObjective(e); break;
          case 'structureKill': {
            const m = e.m, col = this.colors[m.towerSide];
            this.burst(m.x, m.y, col, m.isNexus ? 90 : 45, m.isNexus ? 420 : 280, 5);
            this.burst(m.x, m.y, '#a8a29e', 30, 200, 4, 0, { g: 300, up: 160 });
            this.addFx({ kind: 'ring', x: m.x, y: m.y, r: m.isNexus ? 240 : 140, color: col, life: 0.9, big: true });
            this.addFx({ kind: 'flashDisk', x: m.x, y: m.y, r: m.isNexus ? 160 : 80, color: col, life: 0.4 });
            this.shake = Math.max(this.shake, m.isNexus ? 18 : 10);
            if (m.isNexus) this.slowmo = 1.5;
            break;
          }
          case 'respawn': this.addFx({ kind: 'column', x: e.u.x, y: e.u.y, r: 32, color: this.colors[e.u.side], life: 0.6 }); break;
          case 'death':
            this.burst(e.victim.x, e.victim.y, this.colors[e.victim.side], 24, 200, 4, e.victim.realm);
            this.addFx({ kind: 'soul', x: e.victim.x, y: e.victim.y, color: this.colors[e.victim.side], life: 1.4, realm: e.victim.realm });
            break;
          case 'cleanse': this.float(e.u, 'ARINDI', '#7dd3fc', 13); this.burst(e.u.x, e.u.y, '#7dd3fc', 14, 120, 3); break;
          case 'zap': this.addFx({ kind: 'zap', from: { x: e.from.x, y: e.from.y }, to: e.to, color: e.color || '#a5f3fc', life: 0.22 }); break;
          case 'link': this.addFx({ kind: 'link', from: e.from, to: e.to, color: e.color, life: 0.5 }); break;
          case 'drain': this.addFx({ kind: 'drain', from: e.from, to: e.to, color: e.color, life: 0.6, big: e.big }); break;
          case 'aery': this.addFx({ kind: 'aery', from: e.from, to: e.to, life: 0.45 }); break;
          case 'comet': this.addFx({ kind: 'comet', x: e.x, y: e.y, life: 0.8 }); break;
          case 'rune': this.addFx({ kind: 'ring', x: e.u.x, y: e.u.y, r: 34, color: e.color, life: 0.4, thin: true, realm: e.u.realm }); break;
          case 'cannon': this.addFx({ kind: 'cannon', x: e.x, y: e.y, color: e.color, life: 0.45 }); break;
          case 'beamFire': this.shake = Math.max(this.shake, 7); break;
          case 'execute': this.addFx({ kind: 'exec', style: e.style, u: e.u, tg: e.tg, color: e.color, life: e.style === 'aim' ? (e.dur || 0.3) : e.style === 'sword' ? 0.7 : 0.6, r: e.r }); if (e.style !== 'aim') this.shake = Math.max(this.shake, 8); break;
          case 'mark': this.marks.push({ u: e.u, life: e.dur, max: e.dur, color: e.color }); break;
          case 'possess': this.addFx({ kind: 'possess', u: e.u, tg: e.tg, color: e.color, life: 0.5 }); break;
          case 'burst': this.addFx({ kind: 'exec', style: 'slashes', u: e.u, tg: e.tg, color: e.color, life: 0.6 }); this.burst(e.tg.x, e.tg.y, e.color, 40, 300, 4); this.shake = 12; break;
          case 'rewind': this.addFx({ kind: 'rewind', u: e.u, x: e.x, y: e.y, color: e.color, life: 0.8 }); break;
          case 'feathers': this.addFx({ kind: 'feathers', u: e.u, color: e.color, life: 1.6 }); break;
          case 'steal': this.addFx({ kind: 'link', from: e.from, to: e.u, color: e.color, life: 0.8, chain: true }); break;
          case 'transform': this.addFx({ kind: 'ring', x: e.u.x, y: e.u.y, r: 90, color: e.color, life: 0.6, big: true }); this.burst(e.u.x, e.u.y, e.color, 24, 200, 4, e.u.realm); break;
          case 'holy': this.addFx({ kind: 'column', x: e.u.x, y: e.u.y, r: 30, color: e.color, life: 0.6 }); break;
          case 'clock': this.addFx({ kind: 'clock', u: e.u, color: e.color, life: 2 }); break;
          case 'devour': this.addFx({ kind: 'ring', x: e.u.x, y: e.u.y, r: 50, color: '#86efac', life: 0.5 }); break;
          case 'summon': this.burst(e.u.x, e.u.y, e.color, 30, 200, 4); this.addFx({ kind: 'ring', x: e.u.x, y: e.u.y, r: 80, color: e.color, life: 0.5, big: true }); break;
          case 'petGone': this.burst(e.u.x, e.u.y, '#94a3b8', 14, 120, 3); break;
          case 'banish': this.burst(e.u.x, e.u.y, '#fde68a', 20, 200, 3); break;
          case 'reset': this.float(e.u, 'SIFIRLANDI!', '#ef4444', 16); break;
          case 'realmOpen':
            this.addFx({ kind: 'vortex', x: e.u.x, y: e.u.y, color: e.color, life: 0.8 });
            this.addFx({ kind: 'vortex', x: e.tg.x, y: e.tg.y, color: e.color, life: 0.8 });
            this.shake = 8;
            break;
          case 'realmClose': this.burst(e.u.x, e.u.y, e.color, 24, 200, 3); break;
        }
      }
      sim.events.length = 0;
    }

    ultColor(u) { return (u.ult && u.ult[1].color) || '#fde68a'; }

    // ---------- güncelleme ----------
    update(realDt, dt) {
      const sim = this.sim;
      const fdt = Math.max(dt, realDt * 0.3);
      // kamera
      const champsLive = sim.units.filter(u => !u.dead && !u.realm && u.banish <= 0 && !u.isMonster && !u.isPet);
      const busy = champsLive.filter(u => sim.t - u.lastHurt < 2.5);
      const live = busy.length >= 2 ? busy : champsLive;
      if (live.length) {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const u of live) { x0 = Math.min(x0, u.x); y0 = Math.min(y0, u.y); x1 = Math.max(x1, u.x); y1 = Math.max(y1, u.y); }
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        const z = clamp(Math.min(VW / (x1 - x0 + 460), VH / (y1 - y0 + 360)), 1, 1.45);
        const k = 1 - Math.pow(0.02, realDt);
        this.cam.z = lerp(this.cam.z, z, k * 0.8);
        const hw = VW / 2 / this.cam.z, hh = VH / 2 / this.cam.z;
        this.cam.x = lerp(this.cam.x, clamp(cx, hw, M.W - hw), k);
        this.cam.y = lerp(this.cam.y, clamp(cy, hh, M.H - hh), k);
      }
      this.shake = Math.max(0, this.shake - realDt * 30);

      for (const p of this.parts) { p.x += p.vx * fdt; p.y += p.vy * fdt; p.vy += (p.g || 0) * fdt; p.vx *= 0.96; p.vy *= p.g ? 1 : 0.96; p.life -= fdt; }
      this.parts = this.parts.filter(p => p.life > 0);
      if (this.parts.length > 900) this.parts.splice(0, this.parts.length - 900);
      for (const f of this.fx) f.life -= fdt;
      this.fx = this.fx.filter(f => f.life > 0);
      for (const f of this.floats) { f.life -= realDt; f.y += f.vy * realDt; f.vy *= 0.97; }
      this.floats = this.floats.filter(f => f.life > 0);
      for (const t of this.teles) t.life -= dt;
      this.teles = this.teles.filter(t => t.life > 0);
      for (const m of this.marks) m.life -= dt;
      this.marks = this.marks.filter(m => m.life > 0);
      for (const p of this.pings) p.life -= realDt;
      this.pings = this.pings.filter(p => p.life > 0);
      // atılma izleri
      for (const u of sim.units) {
        if (u.dash && !u.dead) {
          u._ghostT = (u._ghostT || 0) - fdt;
          if (u._ghostT <= 0) { u._ghostT = 0.03; this.ghosts.push({ u, x: u.x, y: u.y, z: this.zOf(u), life: 0.25, max: 0.25, realm: u.realm }); }
        }
      }
      for (const g of this.ghosts) g.life -= fdt;
      this.ghosts = this.ghosts.filter(g => g.life > 0);
      for (const m of this.motes) { m.x += m.vx * realDt; m.y += m.vy * realDt; m.a += realDt; if (m.y < -10) { m.y = M.H + 10; m.x = rnd(0, M.W); } }
      // yanma parçacıkları
      for (const u of sim.units) {
        if (u.dead) continue;
        if (u.burns && u.burns.length && Math.random() < 0.3) this.parts.push({ x: u.x + rnd(-12, 12), y: u.y + rnd(-10, 10), vx: rnd(-10, 10), vy: rnd(-60, -30), life: 0.5, max: 0.5, color: '#fb923c', size: 2.5, realm: u.realm });
        if (u.mod && u.mod.drain && Math.random() < 0.4) this.parts.push({ x: u.x + rnd(-80, 80), y: u.y + rnd(-80, 80), vx: 0, vy: 0, life: 0.6, max: 0.6, color: '#ef4444', size: 2.5, seek: u, realm: u.realm });
      }
      for (const p of this.parts) if (p.seek) { p.x = lerp(p.x, p.seek.x, 0.12); p.y = lerp(p.y, p.seek.y, 0.12); }
    }

    zOf(u) {
      let z = 0;
      if (u.air) z = Math.sin(Math.min(1, u.air.t / u.air.dur) * Math.PI) * u.air.h;
      if (u.dash && u.dash.arc) {
        const p = Math.min(1, u.dash.t / u.dash.dur);
        z = u.dash.style === 'sky' ? (p < 0.5 ? p * 2 * u.dash.arc * 0.3 : (1 - p) * 2 * u.dash.arc * 0.3) : Math.sin(p * Math.PI) * u.dash.arc;
      }
      return z;
    }

    // ---------- çizim ----------
    draw() {
      const c = this.ctx, sim = this.sim;
      const k = this.canvas.width / VW;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = '#0b1210';
      c.fillRect(0, 0, this.canvas.width, this.canvas.height);
      const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;
      c.setTransform(k * this.cam.z, 0, 0, k * this.cam.z, k * (VW / 2 - this.cam.x * this.cam.z + sx), k * (VH / 2 - this.cam.y * this.cam.z + sy));
      this.world = true;
      c.drawImage(this.ground, 0, 0, M.W, M.H);
      this.drawRiver(c);
      this.drawWorld(c, 0);
      // atmosfer
      c.setTransform(1, 0, 0, 1, 0, 0);
      const vg = c.createRadialGradient(this.canvas.width / 2, this.canvas.height / 2, this.canvas.height * 0.35, this.canvas.width / 2, this.canvas.height / 2, this.canvas.height * 0.95);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, `rgba(0,0,0,${0.3 + (this.slowmo > 0 ? 0.25 : 0)})`);
      c.fillStyle = vg;
      c.fillRect(0, 0, this.canvas.width, this.canvas.height);
      if (sim.realmInfo) this.drawRealm(c);
      this.drawMinimap(c);
    }

    drawMinimap(c) {
      const sim = this.sim, k = this.canvas.width / VW;
      const mw = 236 * k, mh = mw * M.H / M.W, pad = 12 * k;
      const ox = this.canvas.width - mw - pad, oy = this.canvas.height - mh - pad;
      const sx = mw / M.W, sy = mh / M.H;
      c.save();
      c.globalAlpha = 0.92;
      c.fillStyle = 'rgba(5,8,12,0.85)'; c.fillRect(ox - 3 * k, oy - 3 * k, mw + 6 * k, mh + 6 * k);
      c.drawImage(this.ground, ox, oy, mw, mh);
      c.globalAlpha = 1;
      c.strokeStyle = 'rgba(212,173,85,0.7)'; c.lineWidth = 1.5 * k; c.strokeRect(ox - 1.5 * k, oy - 1.5 * k, mw + 3 * k, mh + 3 * k);
      const P = (x, y) => [ox + x * sx, oy + y * sy];
      for (const u of sim.units) {
        if (u.dead && !u.isStruct) continue;
        if (u.realm) continue;
        const [x, y] = P(u.x, u.y);
        if (u.isStruct) {
          if (u.dead) continue;
          const z = (u.isNexus ? 6 : 4) * k;
          c.fillStyle = this.colors[u.towerSide]; c.strokeStyle = '#000'; c.lineWidth = 1 * k;
          c.fillRect(x - z, y - z, z * 2, z * 2); c.strokeRect(x - z, y - z, z * 2, z * 2);
        } else if (u.isMonster) {
          c.fillStyle = u.epic ? u.color : '#d6a46b';
          c.beginPath(); c.arc(x, y, (u.epic ? 5 : 2.6) * k, 0, TAU); c.fill();
        } else if (!u.isPet) {
          c.fillStyle = this.colors[u.side]; c.strokeStyle = u.energy >= 100 ? '#f3d58a' : '#000'; c.lineWidth = 1.5 * k;
          c.beginPath(); c.arc(x, y, 4.5 * k, 0, TAU); c.fill(); c.stroke();
        }
      }
      // kamera çerçevesi
      const hw = VW / 2 / this.cam.z, hh = VH / 2 / this.cam.z;
      const [cx0, cy0] = P(this.cam.x - hw, this.cam.y - hh), [cx1, cy1] = P(this.cam.x + hw, this.cam.y + hh);
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.2 * k;
      c.strokeRect(Math.max(ox, cx0), Math.max(oy, cy0), Math.min(ox + mw, cx1) - Math.max(ox, cx0), Math.min(oy + mh, cy1) - Math.max(oy, cy0));
      c.restore();
    }

    drawRiver(c) {
      const t = this.real;
      c.save();
      c.globalAlpha = 0.25;
      c.strokeStyle = '#a5f3fc';
      c.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        const p = ((t * 0.05 + i / 7) % 1);
        const bx = this.bez(M.W * 0.43, M.W * 0.55, M.W * 0.42, M.W * 0.57, p), by = this.bez(-40, M.H * 0.25, M.H * 0.7, M.H + 40, p);
        c.beginPath(); c.moveTo(bx - 18, by); c.lineTo(bx + 18, by + 4); c.stroke();
      }
      c.restore();
      for (const m of this.motes) {
        c.fillStyle = `rgba(255,240,180,${0.25 + 0.2 * Math.sin(m.a * 2)})`;
        c.beginPath(); c.arc(m.x + Math.sin(m.a) * 8, m.y, 1.6, 0, TAU); c.fill();
      }
    }
    bez(a, b, c2, d, t) { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c2 + t * t * t * d; }

    drawWorld(c, realm) {
      const sim = this.sim;
      const inRealm = o => (o.realm || 0) === realm;
      // alanlar
      for (const z of sim.zones) if (z.realm === realm) this.drawZone(c, z);
      for (const t of this.teles) {
        if (realm) continue;
        const p = 1 - t.life / t.max;
        const x = t.follow ? t.follow.x : t.x, y = t.follow ? t.follow.y : t.y;
        c.fillStyle = hexA(t.color, 0.12);
        c.beginPath(); c.arc(x, y, t.r, 0, TAU); c.fill();
        c.fillStyle = hexA(t.color, 0.22);
        c.beginPath(); c.arc(x, y, t.r * p, 0, TAU); c.fill();
        c.strokeStyle = hexA(t.color, 0.8); c.lineWidth = 2.5;
        c.beginPath(); c.arc(x, y, t.r, 0, TAU); c.stroke();
      }
      // ışınlar
      for (const b of sim.beams) {
        if ((b.owner.realm || 0) !== realm) continue;
        const ang = Math.atan2(b.y2 - b.y1, b.x2 - b.x1), len = Math.hypot(b.x2 - b.x1, b.y2 - b.y1);
        c.save();
        c.translate(b.x1, b.y1); c.rotate(ang);
        if (!b.fired) {
          const p = clamp(1 - (b.at - sim.t) / 0.9, 0, 1);
          c.fillStyle = hexA(b.color, 0.1 + 0.12 * p);
          c.fillRect(0, -b.width / 2, len, b.width);
          c.fillStyle = hexA(b.color, 0.5);
          c.fillRect(0, -1.5, len, 3);
        } else {
          const p = clamp((b.until - sim.t) / 0.35, 0, 1);
          const gr = c.createLinearGradient(0, -b.width / 2, 0, b.width / 2);
          gr.addColorStop(0, hexA(b.color, 0)); gr.addColorStop(0.3, hexA(b.color, 0.8 * p)); gr.addColorStop(0.5, `rgba(255,255,255,${0.95 * p})`); gr.addColorStop(0.7, hexA(b.color, 0.8 * p)); gr.addColorStop(1, hexA(b.color, 0));
          c.fillStyle = gr;
          c.fillRect(0, -b.width / 2 * (1.2 - p * 0.2), len, b.width * (1.2 - p * 0.2));
          if (b.wave) {
            c.strokeStyle = `rgba(255,255,255,${0.6 * p})`; c.lineWidth = 3;
            for (let i = 0; i < 8; i++) { c.beginPath(); c.arc((1 - p) * len * 0.9 + i * 6, 0, b.width / 2 - i * 3, -0.9, 0.9); c.stroke(); }
          }
        }
        c.restore();
      }
      // bağlar
      for (const t of sim.tethers) {
        if ((t.a.realm || 0) !== realm) continue;
        c.strokeStyle = hexA(t.color, 0.6 + 0.3 * Math.sin(this.real * 20));
        c.lineWidth = t.thick ? 6 : 3;
        c.beginPath(); c.moveTo(t.a.x, t.a.y - this.zOf(t.a)); c.lineTo(t.b.x, t.b.y - this.zOf(t.b)); c.stroke();
      }
      // izler
      for (const g of this.ghosts) {
        if ((g.realm || 0) !== realm) continue;
        const pic = this.assets.iconImg(g.u);
        c.globalAlpha = (g.life / g.max) * 0.35;
        if (pic && pic.complete && pic.naturalWidth) {
          c.save(); c.beginPath(); c.arc(g.x, g.y - g.z, g.u.r, 0, TAU); c.clip();
          drawPic(c, pic, g.x - g.u.r, g.y - g.z - g.u.r, g.u.r * 2);
          c.restore();
        }
        c.globalAlpha = 1;
      }
      // birimler (önce ölüler)
      const units = sim.units.filter(u => (u.realm || 0) === realm && u.banish <= 0 && !(u.inside)).sort((a, b) => (b.dead - a.dead) || a.y - b.y);
      for (const u of units) { if (u.isStruct) this.drawStructure(c, u); else if (u.isMonster) this.drawMonster(c, u); else this.drawUnit(c, u); }
      // mermiler
      for (const p of sim.projs) if ((p.realm || 0) === realm) this.drawProj(c, p);
      // efektler
      for (const f of this.fx) if ((f.realm || 0) === realm || (f.u && (f.u.realm || 0) === realm && f.realm === undefined)) this.drawFx(c, f);
      for (const p of this.parts) {
        if ((p.realm || 0) !== realm) continue;
        c.globalAlpha = clamp(p.life / p.max, 0, 1);
        c.fillStyle = p.color;
        c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      c.globalAlpha = 1;
      for (const m of this.marks) {
        if ((m.u.realm || 0) !== realm || m.u.dead) continue;
        const p = 1 - m.life / m.max;
        c.strokeStyle = m.color; c.lineWidth = 3;
        c.beginPath(); c.arc(m.u.x, m.u.y - 50, 12, -Math.PI / 2, -Math.PI / 2 + TAU * p); c.stroke();
        c.fillStyle = m.color; c.font = '700 14px "Chakra Petch", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('✖', m.u.x, m.u.y - 50);
      }
      for (const p of this.pings) {
        if (realm || p.u.dead) continue;
        const a = p.life / 1.2;
        c.strokeStyle = `rgba(239,68,68,${a})`; c.lineWidth = 3;
        const r = p.u.r + 10 + (1 - a) * 20;
        c.beginPath(); c.arc(p.u.x, p.u.y, r, 0, TAU); c.stroke();
        c.beginPath();
        for (let i = 0; i < 4; i++) { const ang = i * Math.PI / 2; c.moveTo(p.u.x + Math.cos(ang) * (r - 6), p.u.y + Math.sin(ang) * (r - 6)); c.lineTo(p.u.x + Math.cos(ang) * (r + 8), p.u.y + Math.sin(ang) * (r + 8)); }
        c.stroke();
      }
      // odak işareti
      const f = sim.focus[this.mySide];
      if (!realm && f && f.u && !f.u.dead && sim.t < f.until) {
        c.fillStyle = '#ef4444';
        c.beginPath(); c.moveTo(f.u.x, f.u.y - f.u.r - 48); c.lineTo(f.u.x - 7, f.u.y - f.u.r - 60); c.lineTo(f.u.x + 7, f.u.y - f.u.r - 60); c.closePath(); c.fill();
      }
      // yazılar
      c.textAlign = 'center'; c.textBaseline = 'middle';
      for (const fl of this.floats) {
        if ((fl.realm || 0) !== realm) continue;
        const a = clamp(fl.life / fl.max * 2, 0, 1);
        c.globalAlpha = a;
        if (fl.icon) {
          const im = this.assets.img(fl.icon);
          if (im.complete && im.naturalWidth) {
            c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(fl.x - 15, fl.y - 15, 30, 30);
            c.drawImage(im, fl.x - 13, fl.y - 13, 26, 26);
          }
        } else {
          const pop = 1 + Math.max(0, (fl.life - fl.max + 0.12)) * 4;
          c.font = `800 ${fl.size * pop}px "Chakra Petch", Inter, sans-serif`;
          c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.8)';
          c.strokeText(fl.text, fl.x, fl.y);
          c.fillStyle = fl.color;
          c.fillText(fl.text, fl.x, fl.y);
        }
      }
      c.globalAlpha = 1;
    }

    drawZone(c, z) {
      const t = this.real;
      const col = z.color || '#fff';
      const p = clamp((this.sim.t - z.start) / 0.25, 0, 1);
      const r = z.r * (0.6 + 0.4 * p);
      c.save();
      c.fillStyle = hexA(col, z.kind === 'cage' ? 0.08 : 0.13);
      c.beginPath(); c.arc(z.x, z.y, r, 0, TAU); c.fill();
      c.strokeStyle = hexA(col, 0.85);
      c.lineWidth = z.kind === 'cage' ? 8 : 3;
      if (z.kind === 'cage') {
        c.beginPath(); c.arc(z.x, z.y, r, 0, TAU); c.stroke();
        c.lineWidth = 3;
        for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; c.beginPath(); c.moveTo(z.x + Math.cos(a) * r, z.y + Math.sin(a) * r); c.lineTo(z.x + Math.cos(a) * (r + 14), z.y + Math.sin(a) * (r + 14) - 6); c.stroke(); }
      } else {
        c.setLineDash([14, 10]);
        c.lineDashOffset = -t * 40;
        c.beginPath(); c.arc(z.x, z.y, r, 0, TAU); c.stroke();
        c.setLineDash([]);
      }
      if (z.kind === 'mushrooms') {
        for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.5, d = r * 0.55; this.mushroom(c, z.x + Math.cos(a) * d, z.y + Math.sin(a) * d); }
      } else if (z.kind === 'lamb') {
        c.strokeStyle = hexA(col, 0.5); c.lineWidth = 2;
        c.beginPath(); c.arc(z.x, z.y, r * 0.7, t, t + Math.PI); c.stroke();
        c.beginPath(); c.arc(z.x, z.y, r * 0.5, -t, -t + Math.PI); c.stroke();
      } else if (z.kind === 'box') {
        c.strokeStyle = hexA(col, 0.9); c.lineWidth = 4;
        c.beginPath();
        for (let i = 0; i <= 5; i++) { const a = i / 5 * TAU - Math.PI / 2; const x = z.x + Math.cos(a) * r, y = z.y + Math.sin(a) * r; i ? c.lineTo(x, y) : c.moveTo(x, y); }
        c.stroke();
      } else if (z.kind === 'tentacles') {
        c.strokeStyle = hexA(col, 0.8); c.lineWidth = 6; c.lineCap = 'round';
        for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + t * 0.3; c.beginPath(); c.moveTo(z.x + Math.cos(a) * r, z.y + Math.sin(a) * r); c.quadraticCurveTo(z.x + Math.cos(a + 0.4) * r * 0.6, z.y + Math.sin(a + 0.4) * r * 0.6, z.x + Math.cos(a) * r * 0.25, z.y + Math.sin(a) * r * 0.25); c.stroke(); }
      } else if (z.kind === 'channel' || z.kind === 'zone' || z.kind === 'barrage') {
        c.strokeStyle = hexA(col, 0.35); c.lineWidth = 2;
        for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(z.x, z.y, r * (0.3 + 0.2 * i), t * (i + 1), t * (i + 1) + 2); c.stroke(); }
      }
      c.restore();
    }

    mushroom(c, x, y) {
      c.fillStyle = '#4d7c0f'; c.fillRect(x - 2, y - 2, 4, 7);
      c.fillStyle = '#65a30d'; c.beginPath(); c.arc(x, y - 3, 7, Math.PI, 0); c.fill();
      c.fillStyle = '#ecfccb'; c.fillRect(x - 3, y - 7, 2, 2); c.fillRect(x + 2, y - 6, 2, 2);
    }

    drawUnit(c, u) {
      const sim = this.sim;
      const col = u.isPet ? (u.petColor || this.colors[u.side]) : this.colors[u.side];
      const z = this.zOf(u);
      let x = u.x, y = u.y - z;
      if (u.lunge > 0 && !u.ranged) { const p = Math.sin((1 - u.lunge / 0.14) * Math.PI) * 9; x += Math.cos(u.facing) * p; y += Math.sin(u.facing) * p; }
      const r = u.r;
      c.save();
      if (u.dead) {
        const age = sim.t - u.deathT;
        c.globalAlpha = clamp(0.5 - age * 0.1, 0.18, 0.5);
        c.fillStyle = 'rgba(0,0,0,0.4)';
        c.beginPath(); c.ellipse(u.x, u.y + 6, r * 0.8, 6, 0, 0, TAU); c.fill();
        const pic = this.assets.iconImg(u);
        if (pic && pic.complete && pic.naturalWidth) {
          c.save(); c.beginPath(); c.arc(u.x, u.y, r * 0.75, 0, TAU); c.clip();
          c.filter = 'grayscale(1) brightness(0.6)';
          drawPic(c, pic, u.x - r * 0.75, u.y - r * 0.75, r * 1.5);
          c.filter = 'none';
          c.restore();
        }
        c.restore();
        return;
      }
      if (u.invis > 0 || (u.dash && u.dash.style === 'sky' && u.dash.t / u.dash.dur > 0.15 && u.dash.t / u.dash.dur < 0.85)) c.globalAlpha = u.invis > 0 ? 0.35 : 0.15;
      // gölge
      c.fillStyle = `rgba(0,0,0,${0.45 - Math.min(0.3, z / 400)})`;
      c.beginPath(); c.ellipse(u.x, u.y + r * 0.75, r * (1 - Math.min(0.5, z / 300)), 7, 0, 0, TAU); c.fill();
      // dönüşüm aurası
      const glow = u.buffs && u.buffs.find(b => b.glow || b.dome);
      if (glow) {
        c.strokeStyle = hexA(glow.color || col, 0.85);
        c.lineWidth = 3;
        c.setLineDash([6, 6]); c.lineDashOffset = -this.real * 30;
        c.beginPath(); c.arc(x, y, r + 9, 0, TAU); c.stroke();
        c.setLineDash([]);
        if (glow.dome) { c.fillStyle = hexA(glow.color || '#fde68a', 0.22); c.beginPath(); c.arc(x, y, r + 12, 0, TAU); c.fill(); }
      }
      // portre
      const pic = u.isPet && !u.petIcon ? null : (u.isPet ? this.assets.img(u.petIcon) : this.assets.iconImg(u));
      c.save();
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip();
      if (u.isPet && u.st && !u.petIcon) { c.fillStyle = col; c.fill(); }
      if (pic && pic.complete && pic.naturalWidth) drawPic(c, pic, x - r, y - r, r * 2);
      else { c.fillStyle = col; c.fill(); }
      if (u.flash > 0) { c.fillStyle = `rgba(255,255,255,${u.flash / 0.12 * 0.55})`; c.fillRect(x - r, y - r, r * 2, r * 2); }
      if (u.stasis > 0) { c.fillStyle = 'rgba(253,230,138,0.6)'; c.fillRect(x - r, y - r, r * 2, r * 2); }
      if (u.suppress > 0) { c.fillStyle = 'rgba(88,28,135,0.4)'; c.fillRect(x - r, y - r, r * 2, r * 2); }
      c.restore();
      // çerçeve
      c.lineWidth = 4;
      c.strokeStyle = 'rgba(0,0,0,0.7)';
      c.beginPath(); c.arc(x, y, r + 1.5, 0, TAU); c.stroke();
      c.lineWidth = 3;
      c.strokeStyle = u.stasis > 0 ? '#fde68a' : col;
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
      if (!u.isPet) {
        c.fillStyle = '#0b0f17'; c.beginPath(); c.arc(x - r * 0.72, y + r * 0.72, 8, 0, TAU); c.fill();
        c.strokeStyle = '#d4ad55'; c.lineWidth = 1.5; c.stroke();
        c.fillStyle = '#f3d58a'; c.font = '700 9px "Chakra Petch", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(M.LEVEL, x - r * 0.72, y + r * 0.72 + 0.5);
      } else {
        c.fillStyle = '#fff'; c.font = '700 10px "Chakra Petch", sans-serif'; c.textAlign = 'center';
        c.fillText(u.petName || '', x, y + r + 12);
      }
      // kalkan halkası
      const sh = sim.shieldOf(u);
      if (sh > 1) { c.strokeStyle = 'rgba(241,245,249,0.85)'; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y, r + 5, 0, TAU); c.stroke(); }
      // durum simgeleri
      const top = y - r - 30;
      if (u.stun > 0 || u.air) {
        c.fillStyle = '#facc15';
        for (let i = 0; i < 3; i++) { const a = this.real * 7 + i * TAU / 3; this.star(c, x + Math.cos(a) * 14, top - 6 + Math.sin(a) * 4, 3.5); }
      }
      if (u.root > 0) { c.strokeStyle = '#4ade80'; c.lineWidth = 3; c.beginPath(); c.ellipse(u.x, u.y + r * 0.6, r + 4, 9, 0, 0, TAU); c.stroke(); }
      if (sim.t < u.slowUntil) { c.strokeStyle = 'rgba(125,211,252,0.7)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r + 3, Math.PI * 0.2, Math.PI * 0.8); c.stroke(); }
      if (u.fear) { c.fillStyle = '#c084fc'; c.font = '800 14px sans-serif'; c.textAlign = 'center'; c.fillText('!', x, top - 6); }
      if (u.charm) { c.fillStyle = '#f9a8d4'; c.font = '14px sans-serif'; c.textAlign = 'center'; c.fillText('♥', x, top - 6); }
      if (u.sleep > 0) { c.fillStyle = '#f9a8d4'; c.font = '700 12px sans-serif'; c.textAlign = 'center'; c.fillText('z z', x + 10, top - 8 - Math.sin(this.real * 3) * 3); }
      if (u.berserk > 0) { c.strokeStyle = '#4ade80'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r + 7, 0, TAU); c.stroke(); }
      if (u.channel && sim.t < u.channel.until) {
        c.strokeStyle = hexA(this.ultColor(u), 0.9); c.lineWidth = 3;
        c.beginPath(); c.arc(x, y, r + 12, this.real * 6, this.real * 6 + 4); c.stroke();
      }
      if (u.inside === undefined && u.insideAlly) { /* yutulan dost görünmez */ }
      // içine girilen hedef
      if (sim.units.some(o => o.inside === u && !o.insideAlly)) {
        c.strokeStyle = `rgba(239,68,68,${0.6 + 0.4 * Math.sin(this.real * 18)})`; c.lineWidth = 4;
        c.beginPath(); c.arc(x, y, r + 6, 0, TAU); c.stroke();
      }
      // üsse dönüş
      if (u.recallAt && u.recallAt > sim.t) {
        const p = 1 - (u.recallAt - sim.t) / 3.5;
        c.strokeStyle = 'rgba(96,165,250,0.95)'; c.lineWidth = 3;
        c.beginPath(); c.arc(x, y, r + 10, -Math.PI / 2, -Math.PI / 2 + TAU * p); c.stroke();
        c.fillStyle = 'rgba(96,165,250,0.18)';
        c.beginPath(); c.ellipse(u.x, u.y + r * 0.7, r + 10, 9, 0, 0, TAU); c.fill();
      }
      // can barı
      const bw = Math.max(56, r * 2.4), bh = 8, bx = x - bw / 2, by = y - r - 20;
      // buff simgeleri
      if (!u.isPet && u.buffs) {
        let px = bx;
        for (const [key, bc] of [['red', '#ef4444'], ['blue', '#3b82f6'], ['baron', '#a855f7']]) {
          if (!u.buffs.some(b => b.key === key)) continue;
          c.fillStyle = bc; c.strokeStyle = '#000'; c.lineWidth = 1.5;
          c.beginPath(); c.arc(px + 4, by - 7, 4, 0, TAU); c.fill(); c.stroke();
          px += 11;
        }
      }
      c.fillStyle = 'rgba(5,8,12,0.85)';
      c.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
      const total = Math.max(u.maxHp, u.hp + sh);
      const hpw = bw * Math.max(0, u.hp) / total;
      const grd = c.createLinearGradient(0, by, 0, by + bh);
      grd.addColorStop(0, hexA(col, 1)); grd.addColorStop(1, hexA(col, 0.7));
      c.fillStyle = grd;
      c.fillRect(bx, by, hpw, bh);
      if (sh > 1) { c.fillStyle = '#f1f5f9'; c.fillRect(bx + hpw, by, bw * sh / total, bh); }
      // çentikler
      c.fillStyle = 'rgba(0,0,0,0.55)';
      const step = 500 / total * bw;
      if (step > 3) for (let i = 1; i * step < bw; i++) c.fillRect(bx + i * step, by, i % 2 ? 1 : 1.5, i % 2 ? bh * 0.5 : bh);
      // ulti göstergesi
      if (!u.isPet) {
        const ready = u.energy >= 100;
        c.fillStyle = ready ? '#f3d58a' : 'rgba(212,173,85,0.55)';
        c.fillRect(bx, by + bh + 2, bw * Math.min(1, u.energy / 100), 2.5);
        if (ready) {
          c.save(); c.translate(bx + bw + 8, by + bh / 2); c.rotate(Math.PI / 4);
          c.fillStyle = '#f3d58a'; c.strokeStyle = '#000'; c.lineWidth = 1.5;
          c.fillRect(-4, -4, 8, 8); c.strokeRect(-4, -4, 8, 8);
          c.restore();
        }
      }
      c.restore();
    }

    drawStructure(c, m) {
      const sim = this.sim, col = this.colors[m.towerSide], x = m.x, y = m.y, r = m.r;
      c.save();
      if (m.dead) {
        // enkaz
        c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(x, y + 8, r * 1.3, r * 0.5, 0, 0, TAU); c.fill();
        for (let i = 0; i < 7; i++) {
          const a = i * 2.4 + m.uid, d = r * (0.3 + (i % 3) * 0.3);
          c.fillStyle = i % 2 ? '#57534e' : '#78716c';
          c.beginPath(); c.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.5 + 4, 9 - i % 3 * 2, 6, a, 0, TAU); c.fill();
        }
        c.restore();
        return;
      }
      // menzil halkası: rakip şampiyon yakınsa
      if (m.isTower) {
        const near = sim.units.some(o => o.side === 1 - m.towerSide && !o.dead && !o.isMonster && !o.isPet && Math.hypot(o.x - x, o.y - y) < 215 + r + 120);
        if (near) {
          c.strokeStyle = hexA(m.target ? '#ef4444' : col, 0.55); c.lineWidth = 2; c.setLineDash([8, 8]); c.lineDashOffset = -this.real * 20;
          c.beginPath(); c.arc(x, y, 215 + r, 0, TAU); c.stroke(); c.setLineDash([]);
        }
      }
      c.fillStyle = 'rgba(0,0,0,0.45)'; c.beginPath(); c.ellipse(x + 5, y + r * 0.7, r * 1.25, r * 0.45, 0, 0, TAU); c.fill();
      if (m.isTower) {
        // taş kaide + gövde + kristal
        const sg = c.createLinearGradient(x - r, 0, x + r, 0);
        sg.addColorStop(0, '#57534e'); sg.addColorStop(0.5, '#a8a29e'); sg.addColorStop(1, '#44403c');
        c.fillStyle = sg; c.strokeStyle = 'rgba(0,0,0,0.75)'; c.lineWidth = 2.5;
        c.beginPath(); c.ellipse(x, y + r * 0.45, r * 1.05, r * 0.42, 0, 0, TAU); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(x - r * 0.62, y + r * 0.45); c.lineTo(x - r * 0.42, y - r * 1.3); c.lineTo(x + r * 0.42, y - r * 1.3); c.lineTo(x + r * 0.62, y + r * 0.45); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = 'rgba(0,0,0,0.25)';
        for (let i = 0; i < 3; i++) c.fillRect(x - r * 0.5, y - r * 0.9 + i * r * 0.5, r, 2);
        c.fillStyle = '#d4ad55'; c.beginPath(); c.ellipse(x, y - r * 1.3, r * 0.6, r * 0.2, 0, 0, TAU); c.fill(); c.stroke();
        const bob = Math.sin(this.real * 2.2 + m.uid) * 3;
        c.fillStyle = col; c.strokeStyle = 'rgba(0,0,0,0.7)';
        c.beginPath(); c.moveTo(x, y - r * 2.25 + bob); c.lineTo(x + r * 0.32, y - r * 1.75 + bob); c.lineTo(x, y - r * 1.4 + bob); c.lineTo(x - r * 0.32, y - r * 1.75 + bob); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.55)';
        c.beginPath(); c.moveTo(x, y - r * 2.25 + bob); c.lineTo(x + r * 0.1, y - r * 1.8 + bob); c.lineTo(x - r * 0.12, y - r * 1.75 + bob); c.closePath(); c.fill();
      } else {
        // Nexus: yüzen büyük kristal, açıkken çatlak
        const open = sim.nexusOpen(m.towerSide);
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU;
          c.fillStyle = i % 2 ? '#78716c' : '#a8a29e';
          c.beginPath(); c.ellipse(x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 0.5 + 8, 12, 8, a, 0, TAU); c.fill();
        }
        const bob = Math.sin(this.real * 1.6) * 4;
        c.fillStyle = col; c.strokeStyle = 'rgba(0,0,0,0.75)'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(x, y - r * 1.7 + bob); c.lineTo(x + r * 0.62, y - r * 0.4 + bob); c.lineTo(x, y + r * 0.55 + bob); c.lineTo(x - r * 0.62, y - r * 0.4 + bob); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.45)';
        c.beginPath(); c.moveTo(x, y - r * 1.7 + bob); c.lineTo(x + r * 0.2, y - r * 0.5 + bob); c.lineTo(x - r * 0.25, y - r * 0.35 + bob); c.closePath(); c.fill();
        if (open) {
          c.strokeStyle = 'rgba(15,23,42,0.85)'; c.lineWidth = 2;
          c.beginPath(); c.moveTo(x - r * 0.1, y - r * 1.2 + bob); c.lineTo(x + r * 0.12, y - r * 0.6 + bob); c.lineTo(x - r * 0.08, y - r * 0.1 + bob); c.lineTo(x + r * 0.2, y + r * 0.3 + bob); c.stroke();
        } else {
          c.strokeStyle = hexA('#fde68a', 0.6); c.lineWidth = 2; c.setLineDash([5, 7]); c.lineDashOffset = this.real * 10;
          c.beginPath(); c.arc(x, y - r * 0.5, r * 1.25, 0, TAU); c.stroke(); c.setLineDash([]);
        }
      }
      if (m.flash > 0) { c.fillStyle = `rgba(255,255,255,${m.flash / 0.12 * 0.35})`; c.beginPath(); c.arc(x, y - r * 0.5, r, 0, TAU); c.fill(); }
      // can barı
      const bw = m.isNexus ? 100 : 70, bh = 7, bx = x - bw / 2, by = y - r * (m.isNexus ? 2.2 : 2.6) - 6;
      c.fillStyle = 'rgba(5,8,12,0.85)'; c.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
      c.fillStyle = col; c.fillRect(bx, by, bw * Math.max(0, m.hp) / m.maxHp, bh);
      c.restore();
    }

    drawMonster(c, m) {
      const sim = this.sim;
      if (m.dead) {
        if (m.epic && m.spawnAt > sim.t) {
          const left = Math.ceil(m.spawnAt - sim.t);
          c.fillStyle = 'rgba(0,0,0,0.55)';
          c.beginPath(); c.arc(m.home.x, m.home.y, 22, 0, TAU); c.fill();
          c.strokeStyle = hexA(m.color, 0.8); c.lineWidth = 2; c.stroke();
          c.fillStyle = '#f8fafc'; c.font = '700 12px "Chakra Petch", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(`${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`, m.home.x, m.home.y);
        }
        return;
      }
      const col = m.color, r = m.r, t = this.real;
      let x = m.x, y = m.y + Math.sin(t * 2 + m.uid) * 1.5;
      if (m.lunge > 0) { const p = Math.sin((1 - m.lunge / 0.14) * Math.PI) * 8; x += Math.cos(m.facing) * p; y += Math.sin(m.facing) * p; }
      c.save();
      c.fillStyle = 'rgba(0,0,0,0.42)';
      c.beginPath(); c.ellipse(m.x, m.y + r * 0.8, r * 1.05, r * 0.32, 0, 0, TAU); c.fill();
      const body = (bx, by, br, cc) => {
        const g = c.createRadialGradient(bx - br * 0.35, by - br * 0.4, br * 0.1, bx, by, br);
        g.addColorStop(0, hexA('#ffffff', 0.55)); g.addColorStop(0.25, cc); g.addColorStop(1, hexA('#000000', 0.55));
        c.fillStyle = cc; c.beginPath(); c.arc(bx, by, br, 0, TAU); c.fill();
        c.fillStyle = g; c.beginPath(); c.arc(bx, by, br, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(0,0,0,0.75)'; c.lineWidth = 2.5; c.stroke();
      };
      const eyes = (ex, ey, s, ang, ec) => {
        const ox = Math.cos(ang), oy = Math.sin(ang);
        c.fillStyle = ec || '#fef08a';
        for (const k of [-1, 1]) { c.beginPath(); c.arc(ex + ox * s * 0.45 - oy * s * 0.32 * k, ey + oy * s * 0.45 + ox * s * 0.32 * k, s * 0.13, 0, TAU); c.fill(); }
      };
      const ang = m.facing;
      if (m.key === 'wolves') {
        body(x - r * 0.75, y + r * 0.35, r * 0.55, '#64748b'); eyes(x - r * 0.75, y + r * 0.35, r * 0.55, ang);
        body(x + r * 0.75, y + r * 0.35, r * 0.55, '#64748b'); eyes(x + r * 0.75, y + r * 0.35, r * 0.55, ang);
        body(x, y - r * 0.2, r * 0.75, col); eyes(x, y - r * 0.2, r * 0.75, ang);
      } else if (m.key === 'krugs') {
        body(x + r * 0.7, y + r * 0.4, r * 0.5, '#78716c'); eyes(x + r * 0.7, y + r * 0.4, r * 0.5, ang, '#fb923c');
        body(x, y, r * 0.85, col); eyes(x, y, r * 0.85, ang, '#fb923c');
      } else if (m.key === 'dragon' || m.key === 'baron') {
        // kanatlar / dikenler
        c.fillStyle = hexA(col, 0.85); c.strokeStyle = 'rgba(0,0,0,0.7)'; c.lineWidth = 2;
        const flap = Math.sin(t * (m.key === 'dragon' ? 5 : 2)) * 0.25;
        for (const k of [-1, 1]) {
          c.beginPath();
          if (m.key === 'dragon') {
            c.moveTo(x, y); c.lineTo(x + k * r * 1.9, y - r * (0.9 + flap)); c.lineTo(x + k * r * 1.5, y + r * 0.1); c.lineTo(x + k * r * 1.1, y + r * 0.35);
          } else {
            c.moveTo(x + k * r * 0.4, y - r * 0.6); c.lineTo(x + k * r * 1.35, y - r * (1.25 + flap * 0.4)); c.lineTo(x + k * r * 0.95, y - r * 0.15);
          }
          c.closePath(); c.fill(); c.stroke();
        }
        body(x, y, r, col);
        c.fillStyle = hexA('#000000', 0.25);
        for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(x - r * 0.5 + i * r * 0.25, y + r * 0.45, r * 0.09, 0, TAU); c.fill(); }
        eyes(x, y, r, ang, m.key === 'baron' ? '#f0abfc' : '#fde047');
      } else {
        body(x, y, r, col);
        if (m.def.buff) {
          c.strokeStyle = hexA('#ffffff', 0.5); c.lineWidth = 2;
          c.setLineDash([4, 6]); c.lineDashOffset = -t * 12;
          c.beginPath(); c.arc(x, y, r + 6, 0, TAU); c.stroke(); c.setLineDash([]);
        }
        eyes(x, y, r, ang);
      }
      if (m.flash > 0) { c.fillStyle = `rgba(255,255,255,${m.flash / 0.12 * 0.45})`; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
      // can barı (yalnızca hasarlıysa ya da destansıysa)
      if (m.hp < m.maxHp - 1 || m.epic) {
        const bw = m.epic ? 110 : 54, bh = m.epic ? 8 : 6, bx = m.x - bw / 2, by = m.y - r - (m.epic ? 34 : 18);
        c.fillStyle = 'rgba(5,8,12,0.85)'; c.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
        c.fillStyle = '#d97706'; c.fillRect(bx, by, bw * Math.max(0, m.hp) / m.maxHp, bh);
        // çarp eşiği
        const thr = 900 / m.maxHp * bw;
        if (thr < bw) { c.fillStyle = 'rgba(253,224,71,0.9)'; c.fillRect(bx + thr - 1, by - 2, 2, bh + 4); }
        if (m.epic) {
          c.fillStyle = '#f8fafc'; c.font = '700 12px "Chakra Petch", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'bottom';
          c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.8)';
          c.strokeText(m.name, m.x, by - 4); c.fillText(m.name, m.x, by - 4);
        }
      }
      c.restore();
    }

    star(c, x, y, r) {
      c.beginPath();
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      c.closePath(); c.fill();
    }

    drawProj(c, p) {
      const col = p.color || (p.kind === 'attack' ? this.colors[p.side] : '#fde68a');
      let ang, x = p.x, y = p.y;
      if (p.line) ang = Math.atan2(p.vy, p.vx);
      else ang = Math.atan2(p.tg.y - p.y, p.tg.x - p.x);
      let lift = 0;
      if (p.arc && p.sx !== undefined) {
        const total = Math.hypot(p.tg.x - p.sx, p.tg.y - p.sy) || 1;
        const done = Math.hypot(p.x - p.sx, p.y - p.sy);
        lift = Math.sin(clamp(done / total, 0, 1) * Math.PI) * 120;
      }
      y -= lift;
      c.save();
      c.translate(x, y); c.rotate(ang);
      if (p.kind === 'attack') {
        c.strokeStyle = hexA(col, 0.5); c.lineWidth = 3; c.lineCap = 'round';
        c.beginPath(); c.moveTo(-16, 0); c.lineTo(0, 0); c.stroke();
        c.fillStyle = p.crit ? '#ffb020' : '#fff';
        c.beginPath(); c.arc(0, 0, p.crit ? 4 : 3, 0, TAU); c.fill();
      } else {
        const w = Math.max(8, p.width || 10);
        const len = p.kind === 'ult' ? 46 : 26;
        const gr = c.createLinearGradient(-len, 0, 0, 0);
        gr.addColorStop(0, hexA(col, 0)); gr.addColorStop(1, hexA(col, 0.9));
        c.fillStyle = gr;
        c.beginPath(); c.moveTo(-len, 0); c.lineTo(-2, -w / 2.4); c.lineTo(w / 3, 0); c.lineTo(-2, w / 2.4); c.closePath(); c.fill();
        c.fillStyle = hexA(col, 0.45);
        c.beginPath(); c.arc(0, 0, w / 2.2, 0, TAU); c.fill();
        c.fillStyle = '#fff';
        c.beginPath(); c.arc(0, 0, Math.max(2.5, w / 5), 0, TAU); c.fill();
      }
      c.restore();
      if (p.kind !== 'attack' && Math.random() < 0.7) this.parts.push({ x: p.x + rnd(-4, 4), y: p.y - lift + rnd(-4, 4), vx: rnd(-20, 20), vy: rnd(-20, 20), life: 0.35, max: 0.35, color: col, size: p.kind === 'ult' ? 4 : 2.5, realm: p.realm });
    }

    drawFx(c, f) {
      const p = 1 - f.life / f.max;
      const a = clamp(f.life / f.max, 0, 1);
      switch (f.kind) {
        case 'swing': {
          const u = f.u, tg = f.tg;
          const ang = Math.atan2(tg.y - u.y, tg.x - u.x);
          c.strokeStyle = f.crit ? `rgba(255,176,32,${a})` : `rgba(255,255,255,${a * 0.85})`;
          c.lineWidth = f.crit ? 5 : 3; c.lineCap = 'round';
          c.beginPath(); c.arc(u.x, u.y, u.r + 16, ang - 0.9 + p * 0.6, ang + 0.3 + p * 0.6); c.stroke();
          break;
        }
        case 'slash': {
          c.strokeStyle = hexA(f.color || '#fff', a); c.lineWidth = f.big ? 6 : 3; c.lineCap = 'round';
          const L = f.big ? 46 : 30;
          c.beginPath(); c.moveTo(f.x - Math.cos(f.a + 0.7) * L, f.y - Math.sin(f.a + 0.7) * L); c.lineTo(f.x + Math.cos(f.a + 0.7) * L, f.y + Math.sin(f.a + 0.7) * L); c.stroke();
          break;
        }
        case 'tracer':
          c.strokeStyle = hexA(f.color || '#fff', a); c.lineWidth = f.wide ? 6 : 2;
          c.beginPath(); c.moveTo(f.x1, f.y1); c.lineTo(f.x2, f.y2); c.stroke();
          break;
        case 'ring':
          c.strokeStyle = hexA(f.color, a * 0.95); c.lineWidth = f.big ? 6 : f.thin ? 2 : 3.5;
          c.beginPath(); c.arc(f.x, f.y, f.r * (0.3 + 0.7 * Math.sqrt(p)), 0, TAU); c.stroke();
          if (f.big) { c.lineWidth = 2; c.beginPath(); c.arc(f.x, f.y, f.r * (0.1 + 0.6 * p), 0, TAU); c.stroke(); }
          break;
        case 'flashDisk':
          c.fillStyle = hexA(f.color, a * 0.35);
          c.beginPath(); c.arc(f.x, f.y, f.r, 0, TAU); c.fill();
          c.fillStyle = `rgba(255,255,255,${a * 0.35})`;
          c.beginPath(); c.arc(f.x, f.y, f.r * 0.5 * (1 - p), 0, TAU); c.fill();
          break;
        case 'column': {
          const gr = c.createLinearGradient(0, f.y - 400, 0, f.y);
          gr.addColorStop(0, hexA(f.color, 0)); gr.addColorStop(1, hexA(f.color, a * 0.8));
          c.fillStyle = gr;
          c.fillRect(f.x - f.r * (1 - p * 0.5), f.y - 400, f.r * 2 * (1 - p * 0.5), 400);
          c.fillStyle = `rgba(255,255,255,${a * 0.6})`;
          c.fillRect(f.x - f.r * 0.25, f.y - 400, f.r * 0.5, 400);
          break;
        }
        case 'dashStart':
          c.strokeStyle = hexA(f.color, a); c.lineWidth = 3;
          c.beginPath(); c.arc(f.x, f.y, 20 + p * 30, 0, TAU); c.stroke();
          break;
        case 'soul':
          c.fillStyle = hexA(f.color, a * 0.6);
          c.beginPath(); c.arc(f.x, f.y - p * 90, 12 * (1 - p * 0.5), 0, TAU); c.fill();
          c.fillStyle = `rgba(255,255,255,${a * 0.6})`;
          c.beginPath(); c.arc(f.x, f.y - p * 90, 5, 0, TAU); c.fill();
          break;
        case 'ultAura': {
          const u = f.u;
          c.strokeStyle = hexA(f.color, a); c.lineWidth = 5;
          c.beginPath(); c.arc(u.x, u.y - this.zOf(u), u.r + 8 + p * 50, 0, TAU); c.stroke();
          c.lineWidth = 2;
          c.beginPath(); c.arc(u.x, u.y - this.zOf(u), u.r + 4 + p * 90, 0, TAU); c.stroke();
          break;
        }
        case 'zap': {
          c.strokeStyle = hexA(f.color, a); c.lineWidth = 3;
          c.beginPath(); c.moveTo(f.from.x, f.from.y);
          const n = 6;
          for (let i = 1; i < n; i++) { const t = i / n; c.lineTo(lerp(f.from.x, f.to.x, t) + rnd(-12, 12), lerp(f.from.y, f.to.y, t) + rnd(-12, 12)); }
          c.lineTo(f.to.x, f.to.y); c.stroke();
          break;
        }
        case 'link':
          c.strokeStyle = hexA(f.color, a * 0.85); c.lineWidth = f.chain ? 5 : 3;
          if (f.chain) c.setLineDash([8, 6]);
          c.beginPath(); c.moveTo(f.from.x, f.from.y); c.lineTo(f.to.x, f.to.y); c.stroke();
          c.setLineDash([]);
          break;
        case 'drain':
          for (let i = 0; i < (f.big ? 8 : 4); i++) {
            const t = (p + i / 8) % 1;
            c.fillStyle = hexA(f.color, a);
            c.beginPath(); c.arc(lerp(f.from.x, f.to.x, t) + Math.sin(t * 9 + i) * 8, lerp(f.from.y, f.to.y, t), 3, 0, TAU); c.fill();
          }
          break;
        case 'aery': {
          const x = lerp(f.from.x, f.to.x, p), y = lerp(f.from.y, f.to.y, p) - Math.sin(p * Math.PI) * 40;
          c.fillStyle = `rgba(165,180,252,${a})`;
          c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill();
          break;
        }
        case 'comet': {
          const y = f.y - (1 - p) * 300;
          c.fillStyle = `rgba(196,181,253,${a})`;
          c.beginPath(); c.arc(f.x + (1 - p) * 120, y, 8, 0, TAU); c.fill();
          c.strokeStyle = 'rgba(196,181,253,0.4)'; c.lineWidth = 6;
          c.beginPath(); c.moveTo(f.x + (1 - p) * 120, y); c.lineTo(f.x + (1 - p) * 120 + 40, y - 90); c.stroke();
          break;
        }
        case 'cannon': {
          c.fillStyle = `rgba(0,0,0,${0.4 * (1 - a)})`;
          c.beginPath(); c.ellipse(f.x, f.y, 14 * p, 6 * p, 0, 0, TAU); c.fill();
          c.fillStyle = '#1f2937';
          c.beginPath(); c.arc(f.x, f.y - (1 - p) * 260, 7, 0, TAU); c.fill();
          if (f.life < 0.06) this.burst(f.x, f.y, f.color, 8, 140, 3);
          break;
        }
        case 'shark': {
          c.fillStyle = hexA('#334155', a);
          const h = Math.sin(p * Math.PI) * 60;
          c.beginPath(); c.moveTo(f.x - 30, f.y); c.quadraticCurveTo(f.x, f.y - h * 1.6, f.x + 30, f.y); c.closePath(); c.fill();
          c.fillStyle = `rgba(255,255,255,${a})`;
          for (let i = 0; i < 5; i++) c.fillRect(f.x - 20 + i * 9, f.y - h * 0.6, 4, 6);
          break;
        }
        case 'vines':
          c.strokeStyle = hexA(f.color, a); c.lineWidth = 5; c.lineCap = 'round';
          for (let i = 0; i < 8; i++) { const ang = i / 8 * TAU; c.beginPath(); c.moveTo(f.x, f.y); c.quadraticCurveTo(f.x + Math.cos(ang + 0.5) * f.r * 0.5, f.y + Math.sin(ang + 0.5) * f.r * 0.5, f.x + Math.cos(ang) * f.r * p, f.y + Math.sin(ang) * f.r * p); c.stroke(); }
          break;
        case 'exec': this.drawExec(c, f, p, a); break;
        case 'possess': {
          c.strokeStyle = hexA(f.color, a); c.lineWidth = 4;
          for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(f.tg.x, f.tg.y, f.tg.r + 10 + i * 10 * (1 - p), p * 6 + i, p * 6 + i + 2); c.stroke(); }
          break;
        }
        case 'rewind': {
          c.strokeStyle = hexA(f.color, a); c.lineWidth = 4; c.setLineDash([6, 6]);
          c.beginPath(); c.moveTo(f.u.x, f.u.y); c.lineTo(f.x, f.y); c.stroke(); c.setLineDash([]);
          c.beginPath(); c.arc(f.x, f.y, 40 + p * 30, 0, TAU); c.stroke();
          break;
        }
        case 'feathers': {
          c.strokeStyle = hexA(f.color, a); c.lineWidth = 3;
          for (let i = 0; i < 10; i++) { const ang = i / 10 * TAU; const d = 60 + (i % 3) * 40; c.beginPath(); c.moveTo(f.u.x + Math.cos(ang) * d, f.u.y + Math.sin(ang) * d); c.lineTo(f.u.x + Math.cos(ang) * (d + 16), f.u.y + Math.sin(ang) * (d + 16)); c.stroke(); }
          break;
        }
        case 'clock': {
          const u = f.u;
          c.strokeStyle = hexA(f.color, a); c.lineWidth = 3;
          c.beginPath(); c.arc(u.x, u.y, u.r + 14, 0, TAU); c.stroke();
          c.beginPath(); c.moveTo(u.x, u.y); c.lineTo(u.x + Math.cos(p * TAU * 2 - Math.PI / 2) * (u.r + 8), u.y + Math.sin(p * TAU * 2 - Math.PI / 2) * (u.r + 8)); c.stroke();
          break;
        }
        case 'vortex': {
          for (let i = 0; i < 4; i++) {
            c.strokeStyle = hexA(f.color, a * (1 - i * 0.2)); c.lineWidth = 4;
            c.beginPath(); c.arc(f.x, f.y, 20 + i * 18 + p * 30, p * 10 + i, p * 10 + i + 3); c.stroke();
          }
          break;
        }
      }
    }

    drawExec(c, f, p, a) {
      const t = f.tg, u = f.u;
      const col = f.color || '#fff';
      switch (f.style) {
        case 'sword': {
          const fall = Math.min(1, p * 2.2);
          const y = lerp(t.y - 420, t.y - 10, fall * fall);
          c.save(); c.globalAlpha = a;
          c.fillStyle = col;
          c.fillRect(t.x - 9, y - 150, 18, 150);
          c.fillStyle = '#fff';
          c.fillRect(t.x - 3, y - 150, 6, 150);
          c.fillStyle = '#a16207';
          c.fillRect(t.x - 26, y - 160, 52, 10);
          c.fillRect(t.x - 5, y - 195, 10, 36);
          c.beginPath(); c.moveTo(t.x - 9, y); c.lineTo(t.x, y + 22); c.lineTo(t.x + 9, y); c.fill();
          c.restore();
          if (fall >= 1) { c.strokeStyle = hexA(col, a); c.lineWidth = 6; c.beginPath(); c.arc(t.x, t.y, 30 + p * 60, 0, TAU); c.stroke(); }
          break;
        }
        case 'dunk':
          c.strokeStyle = hexA(col, a); c.lineWidth = 8;
          c.beginPath(); c.arc(t.x, t.y, 20 + p * 70, 0, TAU); c.stroke();
          c.lineWidth = 4;
          for (let i = 0; i < 6; i++) { const ang = i / 6 * TAU; c.beginPath(); c.moveTo(t.x + Math.cos(ang) * 20, t.y + Math.sin(ang) * 20); c.lineTo(t.x + Math.cos(ang) * (40 + p * 60), t.y + Math.sin(ang) * (40 + p * 60)); c.stroke(); }
          break;
        case 'bite': {
          const open = Math.max(0, 1 - p * 2.5);
          c.fillStyle = hexA(col, a * 0.8);
          c.beginPath(); c.arc(t.x, t.y - 10 - open * 30, 46, Math.PI * 1.1, Math.PI * 1.9); c.fill();
          c.beginPath(); c.arc(t.x, t.y + 10 + open * 30, 46, Math.PI * 0.1, Math.PI * 0.9); c.fill();
          c.fillStyle = `rgba(255,255,255,${a})`;
          for (let i = 0; i < 6; i++) { c.fillRect(t.x - 30 + i * 11, t.y - 8 - open * 30, 5, 10); c.fillRect(t.x - 25 + i * 11, t.y - 2 + open * 30, 5, 10); }
          break;
        }
        case 'aim':
          if (u.dead || t.dead) break;
          c.strokeStyle = hexA(col, 0.3 + p * 0.6); c.lineWidth = 1.5 + p * 2;
          c.beginPath(); c.moveTo(u.x, u.y); c.lineTo(t.x, t.y); c.stroke();
          c.beginPath(); c.arc(t.x, t.y, 40 - p * 20, 0, TAU); c.stroke();
          c.beginPath(); c.moveTo(t.x - 50 + p * 20, t.y); c.lineTo(t.x - 20, t.y); c.moveTo(t.x + 20, t.y); c.lineTo(t.x + 50 - p * 20, t.y); c.moveTo(t.x, t.y - 50 + p * 20); c.lineTo(t.x, t.y - 20); c.moveTo(t.x, t.y + 20); c.lineTo(t.x, t.y + 50 - p * 20); c.stroke();
          break;
        case 'x': {
          const r = f.r || 150;
          c.strokeStyle = hexA(col, a); c.lineWidth = 10 * a + 2;
          const L = r * Math.min(1, p * 2);
          c.beginPath(); c.moveTo(t.x - L, t.y - L * 0.6); c.lineTo(t.x + L, t.y + L * 0.6); c.moveTo(t.x + L, t.y - L * 0.6); c.lineTo(t.x - L, t.y + L * 0.6); c.stroke();
          break;
        }
        case 'pop':
          c.strokeStyle = hexA(col, a); c.lineWidth = 6;
          for (let i = 0; i < 8; i++) { const ang = i / 8 * TAU; c.beginPath(); c.moveTo(t.x + Math.cos(ang) * 10, t.y + Math.sin(ang) * 10); c.lineTo(t.x + Math.cos(ang) * (30 + p * 60), t.y + Math.sin(ang) * (30 + p * 60)); c.stroke(); }
          break;
        default: // slashes
          c.strokeStyle = hexA(col, a); c.lineWidth = 5; c.lineCap = 'round';
          for (let i = 0; i < 4; i++) {
            if (p < i * 0.12) continue;
            const ang = i * 0.8 + 0.3, L = 50;
            c.beginPath(); c.moveTo(t.x - Math.cos(ang) * L, t.y - Math.sin(ang) * L); c.lineTo(t.x + Math.cos(ang) * L, t.y + Math.sin(ang) * L); c.stroke();
          }
      }
    }

    drawRealm(c) {
      const info = this.sim.realmInfo;
      const k = this.canvas.width / VW;
      const R = M.REALM;
      const size = 300 * k, sx = this.canvas.width - size / 2 - 16 * k, sy = size / 2 + 16 * k;
      const scale = size / (R.r * 2.3);
      c.save();
      c.beginPath(); c.arc(sx, sy, size / 2, 0, TAU); c.clip();
      const bg = c.createRadialGradient(sx, sy, 10, sx, sy, size / 2);
      bg.addColorStop(0, '#1b3b2a'); bg.addColorStop(0.7, '#0b1a12'); bg.addColorStop(1, '#020604');
      c.fillStyle = bg; c.fillRect(sx - size / 2, sy - size / 2, size, size);
      c.strokeStyle = hexA(info.color, 0.25); c.lineWidth = 2;
      for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(sx, sy, (i + 1) * size / 14, this.real * (i % 2 ? 1 : -1) + i, this.real * (i % 2 ? 1 : -1) + i + 3); c.stroke(); }
      c.setTransform(k * 0 + scale, 0, 0, scale, sx - R.x * scale, sy - R.y * scale);
      this.drawWorld(c, 1);
      c.restore();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.strokeStyle = info.color; c.lineWidth = 4 * k;
      c.beginPath(); c.arc(sx, sy, size / 2, 0, TAU); c.stroke();
      const left = Math.max(0, info.until - this.sim.t) / 7;
      c.strokeStyle = '#f3d58a'; c.lineWidth = 3 * k;
      c.beginPath(); c.arc(sx, sy, size / 2 + 6 * k, -Math.PI / 2, -Math.PI / 2 + TAU * left); c.stroke();
      c.fillStyle = '#e9fbe9'; c.font = `700 ${14 * k}px "Chakra Petch", sans-serif`; c.textAlign = 'center';
      c.fillText('ÖLÜLER ÂLEMİ', sx, sy + size / 2 + 24 * k);
    }
  }

  root.MayhemRender = { Viewer, VW, VH };
})(typeof window !== 'undefined' ? window : globalThis);
