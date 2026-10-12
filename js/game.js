/* ICELOCK Zamboni Shift — core resurfacing gameplay */
window.IL = window.IL || {};
IL.Game = (function () {
  const R = IL.R, RW = R.RW, RH = R.RH, RES = R.RES, BT = R.BT;
  const CELL = 8, GW = Math.ceil(RW / CELL), GH = Math.ceil(RH / CELL);
  const ZR = 20, HUD_TOP = 104, HUD_BOT = 16;
  const GATE = { x: 22, y: RH - 150 };
  let canvas, ctx, W = 0, H = 0, dpr = 1, L = { ox: 0, oy: 0, s: 1 };
  let designC, dirtC, dctx, dirtSrc, bgC;
  const grid = new Uint8Array(GW * GH);
  let total = 0, clean = 0;
  let S = null, raf = 0, last = 0, onFinish = null;
  const keys = {};
  let pointer = null;
  let parts = [], flakes = [], flashes = [];
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 6.2832; while (d < -Math.PI) d += 6.2832; return d; };
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  function init(cb) {
    canvas = $('game-canvas'); ctx = canvas.getContext('2d');
    onFinish = cb;
    window.addEventListener('resize', () => { if (S) { layout(); } });
    const down = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
    window.addEventListener('keydown', (e) => {
      if (!S) return;
      if (down[e.code]) { keys[down[e.code]] = true; e.preventDefault(); }
      if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
    });
    window.addEventListener('keyup', (e) => { if (down[e.code]) keys[down[e.code]] = false; });
    const pd = (e) => { if (!S) return; IL.Audio.resume(); pointer = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { canvas.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault(); };
    const pm = (e) => { if (pointer && (pointer.id === e.pointerId || pointer.id == null)) { pointer.x = e.clientX; pointer.y = e.clientY; } };
    const pu = (e) => { if (pointer && pointer.id === e.pointerId) pointer = null; };
    canvas.addEventListener('pointerdown', pd);
    canvas.addEventListener('pointermove', pm);
    canvas.addEventListener('pointerup', pu);
    canvas.addEventListener('pointercancel', pu);
    document.addEventListener('visibilitychange', () => { if (document.hidden && S && S.phase === 'play') togglePause(true); });
  }

  function layout() {
    W = window.innerWidth; H = window.innerHeight; dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    const aw = W - 16, ah = H - HUD_TOP - HUD_BOT;
    const s = Math.min(aw / (RW + BT * 2 + 8), ah / (RH + BT * 2 + 8));
    L = { s, ox: (W - RW * s) / 2, oy: HUD_TOP + (ah - RH * s) / 2 };
    bgC = document.createElement('canvas'); bgC.width = canvas.width; bgC.height = canvas.height;
    const b = bgC.getContext('2d'); b.scale(dpr, dpr);
    R.drawBackdrop(b, W, H, L, S.venue, S.design, IL.save.rink);
    flakes = [];
    const snowLvl = (S.ev.obs.snowfall || 0) + (S.venue.theme.kind === 'outdoor' ? 1 : 0);
    for (let i = 0; i < snowLvl * 45; i++) flakes.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2.5, v: 30 + Math.random() * 50, w: Math.random() * 6 });
  }

  function cellIdx(x, y) { const cx = (x / CELL) | 0, cy = (y / CELL) | 0; if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) return -1; return cy * GW + cx; }

  function start(vi, ei) {
    const venue = IL.VENUES[vi], ev = IL.activeEvent || venue.events[ei], design = ev.design || IL.getPaintedDesign(vi), up = IL.save.up, rk = IL.save.rink;
    S = {
      vi, ei, venue, ev, design, t: 0, timeLeft: ev.timer, phase: 'count', countT: 3.4, lastCount: 4,
      z: { x: RW / 2, y: RH - 70, a: -Math.PI / 2, vx: 0, vy: 0, sp: 0, spin: 0, spinDir: 1 },
      bladeW: 50 + up.blade * 10, maxSp: 165 * (1 + up.speed * 0.12), tankDur: 26 + up.tank * 12,
      water: ev.obs.water ? 1 : null, lowWarned: false,
      items: [], mascot: null, players: [], pendingSnow: [], nextSnow: ev.obs.snow || 0, snowAcc: 0,
      streakT: 0, streakCells: 0, overlapT: 0, laneDist: 0, comboLvl: 0, mult: 1, bestMult: 1, lanes: 0,
      points: 0, bonus: 0, hats: 0, pucks: 0, bumps: 0, bumpCd: 0, shake: 0, trail: [], prevA: -Math.PI / 2,
      saidHalf: false, saidLow: false, hype: 0, lights: Math.min(8, venue.theme.lights + rk.lights * 2), paT: 0
    };
    // offscreen layers
    designC = document.createElement('canvas'); designC.width = RW * RES; designC.height = RH * RES;
    const g = designC.getContext('2d'); g.scale(RES, RES); R.drawDesign(g, design);
    // bake light reflections into the clean ice
    for (let i = 0; i < S.lights; i++) {
      const lx = RW * (0.25 + 0.5 * ((i % 2))), ly = RH * ((Math.floor(i / 2) + 0.5) / Math.ceil(S.lights / 2));
      const rg = g.createRadialGradient(lx, ly, 2, lx, ly, 46 + rk.lights * 8);
      rg.addColorStop(0, 'rgba(255,255,255,' + (0.22 + rk.lights * 0.06) + ')'); rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg; g.fillRect(lx - 90, ly - 90, 180, 180);
    }
    // long wet light-streak reflections + crisp gloss (only visible where ice is clean)
    for (let i = 0; i < S.lights; i++) {
      const lx = RW * (0.2 + 0.6 * ((i * 0.618) % 1)), ly = RH * ((i + 0.5) / S.lights);
      g.save(); g.translate(lx, ly); g.scale(0.28, 1);
      const sg2 = g.createRadialGradient(0, 0, 2, 0, 0, 120); sg2.addColorStop(0, 'rgba(255,248,230,.28)'); sg2.addColorStop(1, 'rgba(255,248,230,0)');
      g.fillStyle = sg2; g.fillRect(-120, -120, 240, 240); g.restore();
    }
    const gl = g.createLinearGradient(0, 0, RW, RH); gl.addColorStop(0, 'rgba(255,255,255,.10)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(140,200,255,.08)');
    g.fillStyle = gl; g.fillRect(0, 0, RW, RH);
    dirtC = document.createElement('canvas'); dirtC.width = RW * RES; dirtC.height = RH * RES;
    dctx = dirtC.getContext('2d'); dctx.save(); dctx.scale(RES, RES); R.drawDirt(dctx, venue, vi * 31 + ei * 7 + 3); dctx.restore();
    dirtSrc = document.createElement('canvas'); dirtSrc.width = dirtC.width; dirtSrc.height = dirtC.height;
    dirtSrc.getContext('2d').drawImage(dirtC, 0, 0);
    // grid
    total = 0; clean = 0;
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const ok = R.inside(x * CELL + CELL / 2, y * CELL + CELL / 2, 4);
      grid[y * GW + x] = ok ? 1 : 0; if (ok) total++;
    }
    // obstacles
    const o = ev.obs;
    const spawnItem = (type, n) => {
      for (let i = 0; i < (n || 0); i++) {
        let x, y, tries = 0;
        do { x = 30 + Math.random() * (RW - 60); y = 40 + Math.random() * (RH - 80); tries++; }
        while ((!R.inside(x, y, 28) || Math.hypot(x - S.z.x, y - S.z.y) < 90) && tries < 40);
        S.items.push({ type, x, y, r: type === 'nacho' ? 16 : 11, rot: Math.random() * 6, col: pick(['#1d4ed8', '#e63946', '#111827', '#3ddc84', '#ff8c42', design.logoColor]) });
      }
    };
    spawnItem('puck', o.pucks); spawnItem('glove', o.gloves); spawnItem('hat', o.hats); spawnItem('nacho', o.nachos); spawnItem('octopus', o.octopus);
    if (o.mascot) S.mascot = { x: RW / 2, y: RH * 0.35, tx: RW / 2, ty: RH / 2, fall: 0, stamp: 0, vx: 0, vy: 0 };
    if (o.players) for (let i = 0; i < 4; i++) S.players.push({ x: RW - 26 - (i % 2) * 22, y: RH / 2 - 50 + i * 32, a: Math.PI, leaveAt: 7 + i * 1.6, gone: false, look: Object.assign(IL.B.look(i + 3, 'player'), { body: design.logoColor === '#ffffff' ? '#a0c4ff' : design.logoColor, hatCol: design.accent }) });
    S.gull = (ev.quick || ei === 0 || Math.random() < 0.6) ? { x: 60 + Math.random() * (RW - 120), y: RH * 0.3 + Math.random() * RH * 0.3, a: 0, state: 'walk', fly: 0 } : null;
    S.nachoDropAt = 9 + Math.random() * 8;
    parts = []; flashes = []; pointer = null; for (const k in keys) keys[k] = false;
    layout();
    $('hud').classList.toggle('led', IL.save.rink.scoreboard > 0);
    $('hud-water').style.display = S.water != null ? '' : 'none';
    $('btn-finish').classList.add('hidden');
    const marks = $('hud-marks'); marks.innerHTML = '';
    ev.stars.forEach((p, i) => { const m = document.createElement('i'); m.style.left = p + '%'; m.textContent = '★'; m.dataset.i = i; marks.appendChild(m); });
    pa(pick(IL.PA_QUIPS.start));
    cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame);
    updateHud(true);
  }

  function stop() { cancelAnimationFrame(raf); IL.Audio.stopEngine(); S = null; pointer = null; }

  function togglePause(force) {
    if (!S || S.phase === 'done' || S.phase === 'count') return;
    if (S.phase === 'paused' && force !== true) { S.phase = 'play'; $('pause').classList.add('hidden'); last = performance.now(); }
    else if (S.phase === 'play') { S.phase = 'paused'; $('pause').classList.remove('hidden'); IL.Audio.updateEngine(0, false); }
  }

  /* ---------- feedback ---------- */
  function callout(text, cls, wx, wy) {
    const el = document.createElement('div');
    el.className = 'callout ' + (cls || '');
    el.textContent = text;
    if (wx != null) { el.style.left = (L.ox + wx * L.s) + 'px'; el.style.top = (L.oy + wy * L.s) + 'px'; el.classList.add('float'); }
    $('callouts').appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }
  let paTimer = 0;
  function pa(text) {
    const el = $('pa'); el.textContent = '📢 ' + text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(paTimer); paTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }
  function spawn(x, y, vx, vy, life, col, size, type, grav) {
    parts.push({ x, y, vx, vy, life, max: life, col, size, type: type || 'dot', g: grav || 0, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10 });
    if (parts.length > 500) parts.splice(0, parts.length - 500);
  }
  function confetti(n, wx, wy) {
    const cols = ['#ffd23f', '#e63946', '#2d9cdb', '#3ddc84', '#e84393', '#ffffff', S.design.logoColor];
    for (let i = 0; i < n; i++) {
      const x = wx != null ? wx : Math.random() * RW, y = wy != null ? wy : -20 + Math.random() * RH * 0.3;
      spawn(x, y, (Math.random() - 0.5) * 220, -60 - Math.random() * 220, 2 + Math.random() * 1.5, pick(cols), 4 + Math.random() * 4, 'conf', 160);
    }
  }

  /* ---------- cleaning ---------- */
  function cleanSeg(x0, y0, x1, y1, r) {
    dctx.save(); dctx.globalCompositeOperation = 'destination-out'; dctx.lineCap = 'round';
    dctx.beginPath(); dctx.moveTo(x0 * RES, y0 * RES); dctx.lineTo(x1 * RES + 0.01, y1 * RES);
    dctx.strokeStyle = 'rgba(0,0,0,.45)'; dctx.lineWidth = (r * 2 + 8) * RES; dctx.stroke();
    dctx.strokeStyle = '#000'; dctx.lineWidth = r * 2 * RES; dctx.stroke();
    dctx.restore();
    let newly = 0, over = 0;
    const len = Math.hypot(x1 - x0, y1 - y0), steps = Math.max(1, Math.ceil(len / 4));
    const r2 = r * r;
    for (let k = 0; k <= steps; k++) {
      const px = x0 + (x1 - x0) * k / steps, py = y0 + (y1 - y0) * k / steps;
      const cx0 = Math.max(0, ((px - r) / CELL) | 0), cx1 = Math.min(GW - 1, ((px + r) / CELL) | 0);
      const cy0 = Math.max(0, ((py - r) / CELL) | 0), cy1 = Math.min(GH - 1, ((py + r) / CELL) | 0);
      for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
        const i = cy * GW + cx, v = grid[i]; if (!v) continue;
        const dx = cx * CELL + CELL / 2 - px, dy = cy * CELL + CELL / 2 - py;
        if (dx * dx + dy * dy <= r2) { if (v === 1) { grid[i] = 2; newly++; } else if (k === steps) over++; }
      }
    }
    clean += newly;
    return newly;
  }
  function redirty(x, y, r) {
    dctx.save(); dctx.beginPath(); dctx.arc(x * RES, y * RES, r * RES, 0, 7); dctx.clip(); dctx.drawImage(dirtSrc, 0, 0); dctx.restore();
    const cx0 = Math.max(0, ((x - r) / CELL) | 0), cx1 = Math.min(GW - 1, ((x + r) / CELL) | 0);
    const cy0 = Math.max(0, ((y - r) / CELL) | 0), cy1 = Math.min(GH - 1, ((y + r) / CELL) | 0);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const i = cy * GW + cx; if (grid[i] !== 2) continue;
      const dx = cx * CELL + CELL / 2 - x, dy = cy * CELL + CELL / 2 - y;
      if (dx * dx + dy * dy <= r * r) { grid[i] = 1; clean--; }
    }
  }
  function pct() { return total ? clean / total * 100 : 0; }
  // test helper: mark a fraction of the rink clean (top-down rows), used by the smoke test only
  function debugFill(frac) {
    let want = Math.floor(total * frac) - clean;
    for (let y = 0; y < GH && want > 0; y++) for (let x = 0; x < GW && want > 0; x++) {
      const i = y * GW + x; if (grid[i] === 1) { grid[i] = 2; clean++; want--; dctx.clearRect(x * CELL * RES, y * CELL * RES, CELL * RES, CELL * RES); }
    }
  }

  function breakStreak() {
    if (S.streakCells > 260) { const b = Math.round(S.streakCells / 40); S.bonus += b; callout('SMOOTH STROKE +' + b, 'mid'); }
    S.streakT = 0; S.streakCells = 0; S.comboLvl = 0; S.mult = 1; S.laneDist = 0;
  }

  /* ---------- update ---------- */
  function frame(now) {
    if (!S) return;
    let dt = Math.min(0.034, (now - last) / 1000); last = now;
    if (S.slow > 0 && S.phase === 'play') { S.slow -= dt; dt *= 0.3; if (S.slow <= 0) document.getElementById('game').classList.remove('slowmo'); }
    if (S.phase !== 'paused') update(dt);
    render();
    raf = requestAnimationFrame(frame);
  }

  function update(dt) {
    S.t += dt;
    if (S.phase === 'count') {
      S.countT -= dt;
      const n = Math.ceil(S.countT - 0.4);
      if (n !== S.lastCount) {
        S.lastCount = n;
        if (n > 0 && n <= 3) { callout(String(n), 'count'); IL.Audio.countdown(n); }
        else if (n <= 0) {
          callout('CLEAR THE ICE!', 'count go'); IL.Audio.countdown(0); IL.Audio.horn(); IL.Audio.startEngine();
          if (IL.save.rink.music) IL.Audio.organ();
          S.phase = 'play'; IL.Audio.cheer(false);
        }
      }
    }
    const play = S.phase === 'play';
    if (play) {
      S.timeLeft -= dt;
      if (S.timeLeft <= 10 && !S.saidLow) { S.saidLow = true; pa(pick(IL.PA_QUIPS.low)); IL.Audio.warn(); }
      if (S.timeLeft <= 0) { S.timeLeft = 0; finish('time'); }
    }
    const z = S.z;
    // ---- input
    let thr = 0, turn = 0, targetA = null;
    S.target = null;
    if (play && pointer) {
      const wx = (pointer.x - L.ox) / L.s, wy = (pointer.y - L.oy) / L.s;
      const dx = wx - z.x, dy = wy - z.y, d = Math.hypot(dx, dy);
      S.target = { x: wx, y: wy };
      if (d > 16) { targetA = Math.atan2(dy, dx); thr = clamp((d - 16) / 110, 0.3, 1); }
    } else if (play) {
      if (keys.up) thr = 1; if (keys.down) thr = -0.55;
      turn = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      if (turn && !keys.up && !keys.down) thr = 0.35; // turning alone creeps forward: never stuck
    }
    const turnRate = 3.3;
    if (targetA != null) {
      const diff = angDiff(targetA, z.a);
      z.a += clamp(diff, -turnRate * dt, turnRate * dt);
      if (Math.abs(diff) > 1.7) thr *= 0.55;
    } else {
      z.a += turn * turnRate * dt * (z.sp < -5 ? -1 : 1) * (0.5 + 0.5 * Math.min(1, Math.abs(z.sp) / 90));
    }
    if (z.spin > 0) { z.a += z.spinDir * 8 * dt * Math.min(1, z.spin * 2); z.spin -= dt; }
    const tgt = thr * S.maxSp;
    z.sp += clamp(tgt - z.sp, -330 * dt, 230 * dt);
    const hx = Math.cos(z.a), hy = Math.sin(z.a);
    const grip = z.spin > 0 ? 1.2 : 5.2;
    const k = Math.min(1, grip * dt);
    z.vx += (hx * z.sp - z.vx) * k; z.vy += (hy * z.sp - z.vy) * k;
    const bx0 = z.x - hx * 34, by0 = z.y - hy * 34;
    z.x += z.vx * dt; z.y += z.vy * dt;
    // ---- boards (soft)
    S.bumpCd -= dt;
    const cx = clamp(z.x, R.CR, RW - R.CR), cy = clamp(z.y, R.CR, RH - R.CR);
    const ddx = z.x - cx, ddy = z.y - cy, dd = Math.hypot(ddx, ddy), allow = R.CR - ZR;
    if (dd > allow) {
      const nx = ddx / dd, ny = ddy / dd;
      z.x = cx + nx * allow; z.y = cy + ny * allow;
      const vn = z.vx * nx + z.vy * ny;
      if (vn > 0) {
        z.vx -= 1.35 * vn * nx; z.vy -= 1.35 * vn * ny;
        if (vn > 95 && S.bumpCd <= 0) {
          S.bumpCd = 0.6; S.bumps++; S.shake = Math.min(14, vn / 14); z.sp *= 0.5;
          IL.Audio.bump(); IL.Audio.haptic(25);
          callout('BONK!', 'small bad', z.x + nx * 20, z.y + ny * 20);
          for (let i = 0; i < 10; i++) spawn(z.x + nx * 22, z.y + ny * 22, (Math.random() - 0.5) * 120 - nx * 60, (Math.random() - 0.5) * 120 - ny * 60, 0.5, '#ffffff', 3, 'dot');
          if (vn > 150) { pa(pick(IL.PA_QUIPS.bump)); if (Math.random() < 0.5) IL.Audio.boo(); }
        }
      }
    }
    // ---- people collisions
    const pushFrom = (px, py, pr) => {
      const dx = z.x - px, dy = z.y - py, d = Math.hypot(dx, dy) || 1, min = ZR + pr;
      if (d < min) {
        const nx = dx / d, ny = dy / d; z.x = px + nx * min; z.y = py + ny * min;
        const vn = z.vx * nx + z.vy * ny; if (vn < 0) { z.vx -= 1.4 * vn * nx; z.vy -= 1.4 * vn * ny; }
        return true;
      }
      return false;
    };
    S.players.forEach(p => {
      if (p.gone) return;
      if (play && S.t > p.leaveAt + 3.4) {
        if (!p.leaving) { p.leaving = true; if (!S.saidPlayers) { S.saidPlayers = true; pa('Players finally clearing the ice!'); } }
        const ex = RW + 30, ey = RH / 2, a = Math.atan2(ey - p.y, ex - p.x); p.a = a;
        p.x += Math.cos(a) * 80 * dt; p.y += Math.sin(a) * 80 * dt;
        if (p.x > RW + 12) p.gone = true;
      } else { p.y += Math.sin(S.t * 2 + p.leaveAt) * 6 * dt; }
      if (pushFrom(p.x, p.y, 12) && S.bumpCd <= 0) { S.bumpCd = 0.6; IL.Audio.bump(); S.shake = 5; callout('HEY! WATCH IT!', 'small bad', p.x, p.y - 20); }
    });
    const m = S.mascot;
    if (m) {
      if (m.fall > 0) { m.fall -= dt; m.x += m.vx * dt; m.y += m.vy * dt; m.vx *= 0.96; m.vy *= 0.96; }
      else if (play) {
        const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy);
        if (d < 10) { m.tx = 50 + Math.random() * (RW - 100); m.ty = 60 + Math.random() * (RH - 120); }
        else { m.x += dx / d * 42 * dt; m.y += dy / d * 42 * dt; m.a = Math.atan2(dy, dx); }
        m.stamp -= dt;
        if (m.stamp <= 0) { m.stamp = 0.3; redirty(m.x - Math.cos(m.a) * 8 + (Math.random() - 0.5) * 8, m.y - Math.sin(m.a) * 8, 4.5); }
      }
      if (!R.inside(m.x, m.y, 20)) { m.x = clamp(m.x, 30, RW - 30); m.y = clamp(m.y, 30, RH - 30); m.vx *= -1; m.vy *= -1; }
      if (m.fall <= 0 && pushFrom(m.x, m.y, 16)) {
        m.fall = 1.3; const a = Math.atan2(m.y - z.y, m.x - z.x); m.vx = Math.cos(a) * 140; m.vy = Math.sin(a) * 140;
        S.bumps++; S.shake = 7; IL.Audio.squish(); IL.Audio.laugh(); IL.Audio.haptic(30);
        callout('MASCOT DOWN!', 'mid bad'); pa(pick(IL.PA_QUIPS.mascot));
      }
    }
    // ---- cleaning
    const bx1 = z.x - hx * 34, by1 = z.y - hy * 34;
    const moved = Math.hypot(bx1 - bx0, by1 - by0);
    let newly = 0, cleaning = false;
    if (play && moved > 0.05 && Math.abs(z.sp) > 8) {
      let r = S.bladeW / 2;
      if (S.water != null) {
        S.water = Math.max(0, S.water - dt / S.tankDur);
        if (S.water <= 0) { r *= 0.55; if (!S.lowWarned) { S.lowWarned = true; IL.Audio.warn(); callout('LOW WATER! REFILL AT GATE 💧', 'mid bad'); pa('Driver, swing by the gate for water!'); } }
      }
      newly = cleanSeg(bx0, by0, bx1, by1, r);
      cleaning = true;
      S.trail.push({ x: bx1, y: by1, t: S.t, w: r * 2 });
      // spray
      if (S.water == null || S.water > 0) {
        for (let i = 0; i < 2; i++) {
          const side = (Math.random() - 0.5) * r * 2;
          spawn(bx1 - hy * side, by1 + hx * side, -hx * 40 + (Math.random() - 0.5) * 50, -hy * 40 + (Math.random() - 0.5) * 50, 0.35 + Math.random() * 0.25, Math.random() < 0.5 ? 'rgba(170,230,255,.9)' : 'rgba(255,255,255,.95)', 2 + Math.random() * 2.5, 'dot');
        }
      }
      if (newly > 0 && Math.random() < 0.5) spawn(z.x + hx * 30, z.y + hy * 30, hx * 20 + (Math.random() - 0.5) * 40, hy * 20 + (Math.random() - 0.5) * 40, 0.4, '#f8fbff', 2.5, 'dot');
    }
    while (S.trail.length && S.t - S.trail[0].t > 3.2) S.trail.shift();
    if (S.water != null && Math.hypot(z.x - GATE.x, z.y - GATE.y) < 52 && S.water < 1) {
      if (S.water < 0.98 && Math.random() < 0.08) IL.Audio.water();
      S.water = Math.min(1, S.water + dt * 0.75); S.lowWarned = false;
      if (Math.random() < 0.5) spawn(GATE.x + 10, GATE.y + (Math.random() - 0.5) * 30, 60 + Math.random() * 40, (Math.random() - 0.5) * 40, 0.5, 'rgba(120,200,255,.9)', 3, 'dot');
      if (S.water >= 1) { callout('TANK FULL!', 'small', z.x, z.y - 30); IL.Audio.pickup(); }
    }
    // ---- combo / lanes
    if (play) {
      if (Math.abs(z.sp) > 25) {
        const turnSpeed = Math.abs(angDiff(z.a, S.prevA)) / Math.max(dt, 0.001);
        if (newly > 0) S.freshT = 0; else S.freshT = (S.freshT || 0) + dt;
        if (S.freshT < 0.3) {
          S.streakT += dt; S.streakCells += newly; S.overlapT = 0;
          if (turnSpeed < 0.6 && z.spin <= 0) S.laneDist += moved; else S.laneDist = Math.max(0, S.laneDist - moved * 3);
          if (S.laneDist > 230) {
            S.laneDist = -60; S.lanes++; const b = Math.round(12 * S.mult); S.bonus += b;
            callout('PERFECT PASS! +' + b, 'big'); IL.Audio.lane(); IL.Audio.slowmo(); S.hype = 1;
            S.slow = 0.75; document.getElementById('game').classList.add('slowmo'); S.shake = 3;
            if (S.lanes === 1 || Math.random() < 0.3) pa(pick(IL.PA_QUIPS.lane));
            if (S.lanes % 3 === 0) { pa(pick(IL.PA_QUIPS.lane)); IL.Audio.cheer(false); if (IL.save.rink.music) IL.Audio.organ(); }
          }
        } else {
          S.overlapT += dt; S.laneDist = Math.max(0, S.laneDist - moved);
          if (S.overlapT > 0.8 && S.streakT > 0) breakStreak();
        }
      }
      const lvl = Math.min(8, Math.floor(S.streakCells / 70));
      if (lvl > S.comboLvl) { S.comboLvl = lvl; IL.Audio.combo(lvl); if (lvl % 2 === 0) callout('COMBO x' + (1 + lvl * 0.25).toFixed(2).replace(/0$/, ''), 'mid'); }
      S.mult = 1 + S.comboLvl * 0.25; S.bestMult = Math.max(S.bestMult, S.mult);
      S.points += newly * S.mult;
    }
    S.prevA = z.a;
    // ---- items
    for (let i = S.items.length - 1; i >= 0; i--) {
      const it = S.items[i];
      if (Math.hypot(it.x - z.x, it.y - z.y) > ZR + it.r + 2) continue;
      S.items.splice(i, 1);
      IL.Audio.pickup(); IL.Audio.haptic(10);
      for (let j = 0; j < 12; j++) spawn(it.x, it.y, (Math.random() - 0.5) * 160, (Math.random() - 0.5) * 160, 0.6, it.type === 'nacho' ? '#fbbf24' : '#ffd23f', 3, 'star');
      if (it.type === 'puck') { S.bonus += 5; S.pucks++; callout('+5 PUCK', 'small', it.x, it.y); }
      else if (it.type === 'glove') { S.bonus += 8; callout('GLOVE SAVE! +8', 'small', it.x, it.y); }
      else if (it.type === 'hat') {
        S.hats++; S.bonus += 6;
        if (S.hats % 3 === 0) { S.bonus += 40; callout('🎩 HAT TRICK! +40', 'big'); pa(pick(IL.PA_QUIPS.hat)); IL.Audio.cheer(true); confetti(40, it.x, it.y); S.hype = 1; }
        else callout('HAT ' + (S.hats % 3) + '/3', 'small', it.x, it.y);
      } else if (it.type === 'octopus') { S.bonus += 25; callout('🐙 OCTOPUS! +25', 'big'); pa(pick(IL.PA_QUIPS.octo)); IL.Audio.cheer(true); }
      else if (it.type === 'nacho') {
        S.bonus += 4; z.spin = 0.55; z.spinDir = Math.random() < 0.5 ? -1 : 1; IL.Audio.splat(); IL.Audio.laugh();
        callout('NACHO SLIDE! 🧀', 'mid', it.x, it.y); if (Math.random() < 0.6) pa(pick(IL.PA_QUIPS.nacho));
      }
    }
    // ---- seagull (why is there a seagull in Wisconsin?) + fan nacho drop
    const gl = S.gull;
    if (gl && play) {
      if (gl.state === 'walk') {
        gl.a += (Math.random() - 0.5) * 3 * dt; gl.x += Math.cos(gl.a) * 14 * dt; gl.y += Math.sin(gl.a) * 14 * dt;
        if (!R.inside(gl.x, gl.y, 30)) gl.a += Math.PI;
        if (Math.random() < dt * 0.3) { gl.squawk = 0.8; }
        if (Math.hypot(gl.x - z.x, gl.y - z.y) < 75) {
          gl.state = 'fly'; gl.a = Math.atan2(gl.y - z.y, gl.x - z.x); S.bonus += 15; IL.Audio.squawk(); IL.Audio.laugh();
          callout('🐦 SEAGULL EVICTED +15', 'big'); pa(pick(['A seagull? In THIS economy?', 'Seagull has been escorted from the building.', 'That bird did not buy a ticket.']));
        }
      } else { gl.fly += dt; gl.x += Math.cos(gl.a) * 220 * dt; gl.y += Math.sin(gl.a) * 220 * dt - 40 * dt; if (gl.fly > 2.5) S.gull = null; }
      if (gl.squawk) gl.squawk = Math.max(0, gl.squawk - dt);
    }
    if (play && S.nachoDropAt && S.t > S.nachoDropAt + 3.4) {
      S.nachoDropAt = 0;
      const side = Math.random() < 0.5, nx = side ? 22 : RW - 22, ny = 140 + Math.random() * (RH - 280);
      S.items.push({ type: 'nacho', x: nx + (side ? 14 : -14), y: ny, r: 16, rot: Math.random() * 6 });
      for (let i = 0; i < 16; i++) spawn(nx, ny, (side ? 1 : -1) * (40 + Math.random() * 80), (Math.random() - 0.5) * 80, 0.6, '#fbbf24', 3, 'dot');
      IL.Audio.splat(); IL.Audio.laugh(); S.shake = 3;
      callout('🧀 SECTION 104 DROPPED THEIR NACHOS', 'mid'); pa('Sir. SIR. Those were $14 nachos.');
    }
    // ---- snow patches / snowfall
    if (play && S.nextSnow && S.t > S.nextSnow + 3.4) {
      S.nextSnow += S.ev.obs.snow * (0.8 + Math.random() * 0.4);
      let best = null;
      for (let i = 0; i < 14; i++) {
        const x = 50 + Math.random() * (RW - 100), y = 60 + Math.random() * (RH - 120), ci = cellIdx(x, y);
        if (R.inside(x, y, 40) && grid[ci] === 2 && Math.hypot(x - z.x, y - z.y) > 70) { best = { x, y }; break; }
      }
      if (best) S.pendingSnow.push({ x: best.x, y: best.y, t: 1.3 });
    }
    for (let i = S.pendingSnow.length - 1; i >= 0; i--) {
      const p = S.pendingSnow[i]; p.t -= dt;
      if (p.t <= 0) {
        S.pendingSnow.splice(i, 1); redirty(p.x, p.y, 30); S.shake = Math.max(S.shake, 2);
        for (let j = 0; j < 18; j++) spawn(p.x, p.y, (Math.random() - 0.5) * 180, (Math.random() - 0.5) * 180, 0.7, '#ffffff', 4, 'dot');
        callout('❄ HOCKEY STOP!', 'small bad', p.x, p.y);
      }
    }
    const fall = S.ev.obs.snowfall || 0;
    if (play && fall) {
      S.snowAcc += dt * 1.3 * fall;
      while (S.snowAcc >= 1) {
        S.snowAcc -= 1;
        const x = Math.random() * RW, y = Math.random() * RH;
        if (R.inside(x, y, 6)) redirty(x, y, 3.5 + Math.random() * 3.5);
      }
    }
    // ---- milestone + finish check
    const p = pct();
    if (play && p >= 50 && !S.saidHalf) { S.saidHalf = true; pa(pick(IL.PA_QUIPS.half)); IL.Audio.cheer(false); }
    if (play && p >= S.ev.stars[0]) $('btn-finish').classList.remove('hidden');
    if (play && p >= 99.95) finish('perfect');
    // ---- particles + juice
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i]; q.life -= dt; if (q.life <= 0) { parts.splice(i, 1); continue; }
      q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.985; q.rot += q.vr * dt;
    }
    S.shake *= Math.pow(0.02, dt); if (S.shake < 0.2) S.shake = 0;
    S.hype = Math.max(0, S.hype - dt * 0.5);
    const flashRate = 3 + S.hype * 25 + (IL.save.rink.seats * 2) + S.mult * 2;
    if (S.venue.theme.kind !== 'pond' && Math.random() < flashRate * dt) flashes.push({ x: Math.random() * W, y: HUD_TOP * 0.5 + Math.random() * H, t: 0.15 });
    for (let i = flashes.length - 1; i >= 0; i--) { flashes[i].t -= dt; if (flashes[i].t <= 0) flashes.splice(i, 1); }
    flakes.forEach(f => { f.y += f.v * dt; f.x += Math.sin(S.t + f.w) * 12 * dt; if (f.y > H) { f.y = -5; f.x = Math.random() * W; } });
    IL.Audio.updateEngine(Math.min(1, Math.abs(z.sp) / S.maxSp), cleaning && newly > 0);
    updateHud();
  }

  let hudCache = {};
  function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
  function updateHud(force) {
    if (force) hudCache = {};
    const p = pct();
    setText('hud-time', Math.ceil(S.timeLeft) + 's');
    setText('hud-pct', Math.floor(p) + '%');
    $('hud-fill').style.width = p.toFixed(1) + '%';
    $('hud-time').classList.toggle('low', S.timeLeft <= 10);
    setText('hud-combo', S.mult > 1 ? 'x' + S.mult.toFixed(2).replace(/0$/, '') : '');
    setText('hud-coins', '🪙 ' + coinsSoFar());
    if (S.water != null) $('hud-water-fill').style.width = (S.water * 100).toFixed(0) + '%';
    const marks = $('hud-marks').children;
    for (let i = 0; i < marks.length; i++) marks[i].classList.toggle('got', p >= S.ev.stars[i]);
  }
  function coinsSoFar() { return Math.floor(S.points / 90) + S.bonus; }

  function finish(reason) {
    if (!S || S.phase === 'done') return;
    const prev = S.phase; S.phase = 'done';
    IL.Audio.updateEngine(0, false); IL.Audio.stopEngine();
    $('btn-finish').classList.add('hidden'); $('pause').classList.add('hidden');
    breakStreak();
    const p = pct(), perfect = p >= 99.95;
    const stars = S.ev.stars.filter(s => p >= s).length;
    if (perfect) { confetti(140); callout('💯 PERFECT ICE!', 'count go'); IL.Audio.win(); IL.Audio.cheer(true); }
    else if (stars >= 2) { confetti(50); callout(reason === 'time' ? 'PUCK DROP!' : 'ICE READY!', 'count go'); IL.Audio.cheer(true); }
    else if (stars === 1) { callout(reason === 'time' ? 'PUCK DROP!' : 'GOOD ENOUGH!', 'count'); IL.Audio.cheer(false); }
    else { callout("TIME'S UP!", 'count bad'); IL.Audio.boo(); }
    IL.Audio.horn();
    const res = {
      vi: S.vi, ei: S.ei, pct: p, stars, perfect, timeUsed: S.ev.timer - S.timeLeft, score: Math.round(p * 10 + S.lanes * 40 + S.bonus * 2 + (stars ? S.timeLeft * 5 : 0) + (perfect ? 300 : 0)), timeLeft: S.timeLeft,
      bestMult: S.bestMult, lanes: S.lanes, coins: coinsSoFar(), hats: S.hats, pucks: S.pucks, bumps: S.bumps, reason, prev
    };
    IL.Game.lastResult = res;
    setTimeout(() => { if (onFinish) onFinish(res); }, perfect ? 1900 : 1300);
  }

  /* ---------- render ---------- */
  function render() {
    const sx = S.shake ? (Math.random() - 0.5) * S.shake : 0, sy = S.shake ? (Math.random() - 0.5) * S.shake : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bgC, sx * dpr, sy * dpr);
    // camera flashes in the crowd
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    flashes.forEach(f => { ctx.fillStyle = 'rgba(255,255,255,' + (f.t / 0.15) + ')'; ctx.beginPath(); ctx.arc(f.x, f.y, 2.2, 0, 7); ctx.fill(); });
    ctx.setTransform(dpr * L.s, 0, 0, dpr * L.s, dpr * (L.ox + sx), dpr * (L.oy + sy));
    ctx.save(); R.rinkPath(ctx); ctx.clip();
    ctx.drawImage(designC, 0, 0, RW, RH);
    // sweeping shine band over clean ice
    const bxp = ((S.t * 90) % (RW + RH + 300)) - 200;
    const sg = ctx.createLinearGradient(bxp, 0, bxp + 140, 140);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,.28)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, RW, RH);
    for (let i = 0; i < 26; i++) {
      const tw = Math.sin(S.t * 2.3 + i * 1.7); if (tw < 0.6) continue;
      const tx = (i * 97.3) % RW, ty = (i * 211.7 + Math.floor(S.t / 2.7 + i) * 53) % RH;
      ctx.fillStyle = 'rgba(255,255,255,' + ((tw - 0.6) * 2.2) + ')'; R.starPath(ctx, tx, ty, 3.2, 4, 0.25); ctx.fill();
    }
    ctx.drawImage(dirtC, 0, 0, RW, RH);
    // wet gloss trail
    ctx.lineCap = 'round';
    for (let i = 1; i < S.trail.length; i++) {
      const a = S.trail[i - 1], b = S.trail[i]; if (Math.hypot(a.x - b.x, a.y - b.y) > 20) continue;
      const age = (S.t - b.t) / 3.2;
      ctx.strokeStyle = 'rgba(200,240,255,' + (0.42 * (1 - age) * (1 - age)) + ')'; ctx.lineWidth = b.w * 0.95;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    S.pendingSnow.forEach(p => {
      const k = 1 - p.t / 1.3;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.5 * Math.sin(S.t * 20)) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, 30 * (0.4 + k * 0.6), 0, 7); ctx.stroke();
    });
    ctx.restore();
    IL.B.frontRows(ctx, S.t, S.venue, S.design, S.mult >= 2 ? 'happy' : S.bumps > 3 ? 'meh' : 'neutral', Math.min(1, S.hype + (S.mult - 1) * 0.3), 1 / 60);
    // gate
    if (S.water != null) {
      const pulse = 0.5 + 0.5 * Math.sin(S.t * 5), lowW = S.water < 0.3;
      ctx.fillStyle = 'rgba(60,180,255,' + ((lowW ? 0.35 : 0.15) + pulse * 0.2) + ')';
      ctx.beginPath(); ctx.arc(GATE.x - 10, GATE.y, 44, -Math.PI / 2, Math.PI / 2); ctx.fill();
      ctx.fillStyle = '#0ea5e9'; R.rr(ctx, -BT - 2, GATE.y - 26, BT + 4, 52, 4); ctx.fill();
      ctx.save(); ctx.translate(-BT / 2, GATE.y); ctx.rotate(-Math.PI / 2); ctx.fillStyle = '#fff'; ctx.font = '900 8px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('💧 WATER', 0, 0); ctx.restore();
    }
    S.items.forEach(it => R.drawItem(ctx, it, S.t));
    if (S.gull) {
      const gl = S.gull, fly = gl.state === 'fly', flap = Math.sin(S.t * (fly ? 30 : 4)) ;
      ctx.save(); ctx.translate(gl.x, gl.y - (fly ? gl.fly * 30 : 0)); ctx.rotate(gl.a + Math.PI / 2 * 0); const sc = fly ? 1 + gl.fly * 0.3 : 1; ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(3, 6, 10, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#f5f7fa'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 6.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#9aa5b4'; ctx.beginPath(); ctx.ellipse(-2, fly ? -6 - flap * 6 : -3, 8, fly ? 4 + Math.abs(flap) * 5 : 3.5, 0, 0, 7); ctx.ellipse(-2, fly ? 6 + flap * 6 : 3, 8, fly ? 4 + Math.abs(flap) * 5 : 3.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(10, 0, 5, 0, 7); ctx.fill();
      ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.moveTo(14, -1.5); ctx.lineTo(20, 0); ctx.lineTo(14, 1.5); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(11.5, -2, 1, 0, 7); ctx.fill();
      ctx.restore();
      if (gl.squawk) { ctx.fillStyle = '#fff'; ctx.font = '900 9px system-ui'; ctx.textAlign = 'center'; ctx.fillText('SQUAWK', gl.x, gl.y - 14); }
    }
    S.players.forEach(p => { if (!p.gone) IL.B.draw(ctx, p.x, p.y, 12, Object.assign(p.look, { t: S.t, walk: p.leaving ? 1 : 0.15, emote: p.leaving ? 'wave' : null, emoteT: p.leaving ? S.t - p.leaveAt - 3.4 : 0 })); });
    if (S.mascot) R.drawPerson(ctx, S.mascot.x, S.mascot.y, S.mascot.a || 0, S.design.logoColor, '#fff', 'mascot', S.t, S.mascot.fall > 0);
    if (S.target) {
      ctx.strokeStyle = 'rgba(255,210,63,.85)'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.arc(S.target.x, S.target.y, 14 + Math.sin(S.t * 8) * 2, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    }
    const skin = IL.SKINS.find(s => s.id === IL.save.skins.sel) || IL.SKINS[0];
    const cl = S.phase === 'play' && Math.abs(S.z.sp) > 8;
    R.drawZamboni(ctx, S.z.x, S.z.y, S.z.a, skin, S.t, S.bladeW * (S.water === 0 ? 0.55 : 1), cl);
    parts.forEach(q => {
      const a = Math.min(1, q.life / q.max * 1.5);
      ctx.globalAlpha = a; ctx.fillStyle = q.col;
      if (q.type === 'conf') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillRect(-q.size / 2, -q.size / 4, q.size, q.size / 2); ctx.restore(); }
      else if (q.type === 'star') { R.starPath(ctx, q.x, q.y, q.size, 4, 0.4); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (0.5 + 0.5 * a), 0, 7); ctx.fill(); }
    });
    ctx.globalAlpha = 1;
    if (flakes.length) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = 'rgba(255,255,255,.85)';
      flakes.forEach(f => { ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill(); });
    }
  }

  return {
    init, start, stop, finish, togglePause,
    forceFinish: () => finish('forced'), debugFill,
    get state() { return S ? S.phase : 'idle'; },
    get pct() { return S ? pct() : 0; },
    get session() { return S; },
    lastResult: null
  };
})();
