/* Top Shelf, Bottom Barrel — one-finger puck flinging: levels, Beer League (wobble rounds), daily level */
window.IL = window.IL || {};
IL.Flick = (function () {
  const R = IL.R, RW = R.RW, RH = R.RH, BT = R.BT, RES = R.RES, HUD_TOP = 92, HUD_BOT = 14;
  const CX = RW / 2, GOAL_Y = 44, LAUNCH = { x: RW / 2, y: RH - 92 }, PR = 7;
  let canvas, ctx, W, H, dpr, L, bgC, iceC, F = null, raf = 0, last = 0, drag = null;
  const $ = (id) => document.getElementById(id);
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  /* ---------------- level ladder (seeded templates, 32 levels) ---------------- */
  const NAMES = ['Cup Pyramid', 'Cone Zone', 'Bank on It', 'Bubble Goalie', 'Tire Swing', 'Cooler Kingdom', 'Ref Sniper', 'Ping City', 'Glass House', 'Beer League Chaos'];
  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function pyramid(T, x, y, rows, kind) { for (let r = 0; r < rows; r++) for (let i = 0; i <= r; i++) T.push({ t: kind || 'can', x: x + (i - r / 2) * 15, y: y + r * 14, req: true }); }
  function buildLevel(i, seedOverride) {
    const ORDER = [0, 1, 3, 7, 8, 5, 2, 4, 6, 9];
    const r = rng(seedOverride || (i * 7919 + 17)), tpl = seedOverride ? i % 10 : ORDER[i % 10], tier = Math.floor(i / 10), T = [];
    const mv = (o, amp, sp) => Object.assign(o, { move: { ax: amp, ay: 0, sp: sp || 1.2, ph: r() * 6 } });
    const m = tier > 0;
    switch (tpl) {
      case 0: if (i === 0) { pyramid(T, CX, 170, 4, 'can'); break; } pyramid(T, CX + (r() - 0.5) * 80, 150, 3 + tier); break;
      case 1: for (let k = 0; k < 4 + tier; k++) T.push(m && k % 2 ? mv({ t: 'cone', x: 60 + r() * (RW - 120), y: 110 + r() * 260, req: true }, 40 + tier * 20) : { t: 'cone', x: 60 + r() * (RW - 120), y: 110 + r() * 260, req: true }); T.push({ t: 'glass', x: CX, y: 400, w: 90, h: 7 }); break;
      case 2: T.push({ t: 'wall', x: CX, y: 330, w: 210, h: 12 }); T.push({ t: 'nacho', x: r() < 0.5 ? 26 : RW - 26, y: 150 + r() * 80, req: true }); if (tier) T.push({ t: 'nacho', x: RW - 26, y: 110, req: true }); pyramid(T, CX, 170, 2); break;
      case 3: T.push({ t: 'goal', req: true }); T.push({ t: 'goalie', x: CX, y: 78, amp: 44 + tier * 18, sp: 1.3 + tier * 0.5 }); T.push({ t: 'cone', x: 70, y: 240, req: true }); break;
      case 4: T.push(mv({ t: 'tire', x: CX, y: 210, req: true }, 50 + tier * 25, 1 + tier * 0.4)); pyramid(T, CX, 110, 2, 'cup'); break;
      case 5: T.push({ t: 'cooler', x: CX - 70, y: 190, hp: 2, req: true }); T.push({ t: 'cooler', x: CX + 70, y: 190, hp: 2, req: true }); pyramid(T, CX, 120, 2 + tier, 'cup'); break;
      case 6: T.push(mv({ t: 'ref', x: CX, y: 200, req: true }, 70, 1 + tier * 0.4)); T.push({ t: 'cone', x: 60, y: 140, req: true }); T.push({ t: 'cone', x: RW - 60, y: 140, req: true }); break;
      case 7: T.push({ t: 'goal', req: true }); T.push({ t: 'glass', x: CX, y: 150, w: 70, h: 7, req: true }); if (tier) T.push({ t: 'goalie', x: CX, y: 78, amp: 30 + tier * 20, sp: 1.6 }); pyramid(T, 80, 260, 2, 'cup'); break;
      case 8: for (let k = 0; k < 3 + tier; k++) T.push({ t: 'glass', x: 70 + ((k * 97) % (RW - 140)), y: 120 + k * 70, w: 70, h: 7, req: true }); pyramid(T, CX, 110, 2); break;
      case 9: T.push({ t: 'goal', req: true }); T.push({ t: 'goalie', x: CX, y: 78, amp: 50, sp: 1.5 + tier * 0.5 }); T.push(mv({ t: 'tire', x: CX, y: 260, req: false }, 70, 1.4)); T.push({ t: 'nacho', x: 26, y: 200, req: true }); T.push({ t: 'cooler', x: RW - 80, y: 320, hp: 2, req: true }); pyramid(T, CX, 150, 2, 'cup'); break;
    }
    const req = T.filter(t => t.req).length;
    const pucks = clamp(Math.ceil(req * 0.55) + 3 - tier + (tier === 0 && (tpl === 2 || tpl === 4 || tpl === 6) ? 1 : 0), 2, 9);
    const star3 = Math.max(1, Math.min(2, pucks - Math.ceil(req * 0.5)));
    return { i, tpl, tier, star3, name: NAMES[tpl] + (tier ? ' ' + ['', 'II', 'III', 'IV'][tier] : ''), targets: T, pucks };
  }
  const LEVELS = 32;

  /* ---------------- setup ---------------- */
  function init() {
    canvas = $('game-canvas'); ctx = canvas.getContext('2d');
    canvas.addEventListener('pointerdown', (e) => { if (!F || paused()) return; IL.Audio.resume(); drag = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, id: e.pointerId, path: [[e.clientX, e.clientY]], t0: performance.now() }; e.preventDefault(); });
    canvas.addEventListener('pointermove', (e) => { if (F && drag && drag.id === e.pointerId) { drag.x = e.clientX; drag.y = e.clientY; drag.path.push([e.clientX, e.clientY]); if (drag.path.length > 60) drag.path.shift(); } });
    const up = (e) => { if (F && drag && drag.id === e.pointerId) { const a = aim(); drag = null; if (a) shoot(a); } };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', () => drag = null);
    window.addEventListener('resize', () => { if (F) layout(); });
    window.addEventListener('keydown', (e) => { if (!F) return; if (e.code === 'KeyR') restart(); if (e.code === 'KeyP' || e.code === 'Escape') togglePause(); });
  }
  const paused = () => !$('pause').classList.contains('hidden') || (F && F.ended);
  function layout() {
    W = innerWidth; H = innerHeight; dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    const aw = W - 16, ah = H - HUD_TOP - HUD_BOT, s = Math.min(aw / (RW + BT * 2 + 8), ah / (RH + BT * 2 + 8));
    L = { s, ox: (W - RW * s) / 2, oy: HUD_TOP + (ah - RH * s) / 2 };
    bgC = document.createElement('canvas'); bgC.width = canvas.width; bgC.height = canvas.height;
    const b = bgC.getContext('2d'); b.scale(dpr, dpr); R.drawBackdrop(b, W, H, L, F.venue, F.design, IL.save.rink);
  }
  function buildIce() {
    iceC = document.createElement('canvas'); iceC.width = RW * RES; iceC.height = RH * RES;
    const g = iceC.getContext('2d'); g.scale(RES, RES); R.drawDesign(g, F.design);
    for (let i = 0; i < 6; i++) { // wet arena-light streaks
      const lx = RW * (0.2 + 0.6 * ((i * 0.618) % 1)), ly = RH * ((i + 0.5) / 6);
      g.save(); g.translate(lx, ly); g.scale(0.3, 1); const sg = g.createRadialGradient(0, 0, 2, 0, 0, 120);
      sg.addColorStop(0, 'rgba(255,248,230,.32)'); sg.addColorStop(1, 'rgba(255,248,230,0)'); g.fillStyle = sg; g.fillRect(-120, -120, 240, 240); g.restore();
    }
  }
  const toWorld = (x, y) => ({ x: (x - L.ox) / L.s, y: (y - L.oy) / L.s });
  const toScreen = (x, y) => ({ x: L.ox + x * L.s, y: L.oy + y * L.s });

  /* mode: 'level' | 'beer' | 'daily' */
  function start(mode, levelIndex) {
    stop();
    const vi = IL.save.venue;
    F = { mode, vi, venue: IL.VENUES[vi], design: IL.getPaintedDesign(vi), t: 0, score: 0, shots: 0, hits: 0, tricks: 0, combo: 0, best: 0,
      pucksLeft: 0, puck: null, parts: [], debris: [], ended: false, slow: 0, shake: 0, flash: 0, wob: 0, round: 1, ringT: 0, bigs: [] };
    if (mode === 'beer') { F.timeLeft = 75; F.level = { name: 'Beer League', targets: [] }; F.pucksLeft = Infinity; F.daySeed = IL.dailyNumber() * 31; }
    else if (mode === 'daily') { const n = IL.dailyNumber(); F.n = n; F.level = buildLevel(n % 10 + 10, n * 104729 + 7); F.level.name = 'Daily Level #' + n; F.pucksLeft = F.level.pucks; }
    else { F.li = clamp(levelIndex || 0, 0, LEVELS - 1); F.level = buildLevel(F.li); F.pucksLeft = F.level.pucks; }
    F.targets = F.level.targets.map(t => prepTarget(Object.assign({}, t)));
    if (mode === 'beer') for (let k = 0; k < 5; k++) spawnBeerTarget();
    F.shooter = Object.assign(IL.B.look(5, 'fan'), { beard: true, dad: true, hat: 'backcap', hatCol: '#ffb547', jersey: F.design.logoColor === '#ffffff' ? '#3d5a80' : F.design.logoColor, num: 19, mood: 'happy' });
    $('hud').classList.add('hidden'); $('jobhud').classList.add('hidden'); $('flickhud').classList.remove('hidden'); $('fend').classList.add('hidden');
    layout(); buildIce(); updateHud();
    callout(mode === 'beer' ? 'BEER LEAGUE · ROUND 1' : F.level.name.toUpperCase(), 'count go');
    pa(mode === 'beer' ? '75 seconds. Five rounds. Aim gets... creative.' : 'Level ' + (mode === 'daily' ? 'of the day' : (F.li + 1)) + ': ' + F.level.name + '. ' + F.pucksLeft + ' pucks.');
    IL.Clip.start();
    cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function prepTarget(t) {
    const R0 = { can: 7, cup: 7, cone: 9, nacho: 15, cooler: 0, glass: 0, wall: 0, tire: 22, ref: 14, goalie: 20, goal: 0 };
    t.r = R0[t.t] || 0; t.bx = t.x; t.by = t.y; t.hp = t.hp || 1; t.dead = false;
    if (t.t === 'cooler') { t.w = 40; t.h = 26; }
    if (t.t === 'goal') { t.x = CX; t.y = GOAL_Y; }
    if (t.t === 'ref') { t.whistle = true; }
    t.look = t.t === 'ref' ? Object.assign(IL.B.look(9, 'ref'), { prop: 'whistle' }) : t.t === 'goalie' ? Object.assign(IL.B.look(33, 'player'), { body: '#3d5a80', hatCol: '#f2f2f2', dad: true, beard: true }) : null;
    return t;
  }
  function spawnBeerTarget() {
    const pool = ['cans', 'cone', 'cooler', 'nacho', 'tire', 'ref', 'glass'];
    const k = pick(pool), x = 60 + Math.random() * (RW - 120), y = 120 + Math.random() * 260;
    if (!F.targets.some(t => t.t === 'goal')) { F.targets.push(prepTarget({ t: 'goal', req: true })); F.targets.push(prepTarget({ t: 'goalie', x: CX, y: 78, amp: 50, sp: 1.4 })); }
    if (k === 'cans') { const T = []; pyramid(T, x, y, 2 + ((Math.random() * 2) | 0), Math.random() < 0.5 ? 'can' : 'cup'); T.forEach(t => F.targets.push(prepTarget(t))); }
    else if (k === 'nacho') F.targets.push(prepTarget({ t: 'nacho', x: Math.random() < 0.5 ? 26 : RW - 26, y, req: true }));
    else if (k === 'glass') F.targets.push(prepTarget({ t: 'glass', x, y, w: 70, h: 7, req: true }));
    else if (k === 'cooler') F.targets.push(prepTarget({ t: 'cooler', x, y, hp: 2, req: true }));
    else F.targets.push(prepTarget({ t: k, x, y, req: true, move: k === 'tire' || k === 'ref' ? { ax: 60, ay: 0, sp: 1.2, ph: Math.random() * 6 } : null }));
  }
  function stop() { cancelAnimationFrame(raf); F = null; drag = null; $('flickhud').classList.add('hidden'); $('fend').classList.add('hidden'); $('game').classList.remove('slowmo'); IL.Clip.stop(); }
  function restart() { if (!F) return; const m = F.mode, li = F.li; IL.Audio.click(); start(m, li); }
  function togglePause() { if (!F || F.ended) return; $('pause').classList.toggle('hidden'); }

  /* ---------------- FX helpers ---------------- */
  function callout(text, cls, wx, wy) {
    const cc = /combo/.test(cls || '') ? '.callout.combo' : /big/.test(cls || '') ? '.callout.big' : /count/.test(cls || '') ? '.callout.count' : null; if (cc && wx == null) document.querySelectorAll('#callouts ' + cc).forEach(e => e.remove());
    const el = document.createElement('div'); el.className = 'callout ' + (cls || ''); el.textContent = text; if (/count/.test(cls || '') && text.length > 12) el.style.fontSize = Math.max(22, 520 / text.length) + 'px';
    if (wx != null) { const p = toScreen(wx, wy); el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; el.classList.add('float'); }
    $('callouts').appendChild(el); setTimeout(() => el.remove(), 1400);
  }
  let paT = 0;
  function pa(text) { const el = $('pa'); el.textContent = '📢 ' + text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); clearTimeout(paT); paT = setTimeout(() => el.classList.remove('show'), 2600); }
  function spawn(x, y, vx, vy, life, col, size, type, g) { F.parts.push({ x, y, vx, vy, life, max: life, col, size, type: type || 'dot', g: g || 0, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14 }); if (F.parts.length > 400) F.parts.shift(); }
  function burst(x, y, col, n, type, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = (sp || 160) * (0.4 + Math.random()); spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.6 + Math.random() * 0.4, col, 2 + Math.random() * 3.5, type || 'dot'); } }

  /* ---------------- aiming + shooting ---------------- */
  function aim() {
    if (!drag) return null;
    const dx = drag.x - drag.x0, dy = drag.y - drag.y0, len = Math.hypot(dx, dy);
    if (len < 14) return null;
    let ang = Math.atan2(dy, dx);
    if (F.wob) ang += F.wob * 0.2 * Math.sin(F.t * 1.9) + F.wob * 0.07 * Math.sin(F.t * 5.3);
    const power = clamp(len / L.s * 4.2, 260, 1150);
    // curve from the drag path's sideways bow
    let dev = 0; const ux = dx / len, uy = dy / len;
    drag.path.forEach(p => { const px = p[0] - drag.x0, py = p[1] - drag.y0, side = px * -uy + py * ux; if (Math.abs(side) > Math.abs(dev)) dev = side; });
    const curve = clamp(-dev / len * 2.2, -1, 1);
    return { ang, power, curve };
  }
  function simulate(a, steps) {
    const pts = []; let x = LAUNCH.x, y = LAUNCH.y, vx = Math.cos(a.ang) * a.power, vy = Math.sin(a.ang) * a.power, t = 0; const dt = 1 / 60;
    for (let i = 0; i < steps; i++) {
      t += dt; const c = curveAcc(a.curve, t, vx, vy); vx += c[0] * dt; vy += c[1] * dt;
      vx *= 1 - 0.55 * dt; vy *= 1 - 0.55 * dt; x += vx * dt; y += vy * dt;
      const b = boards(x, y, vx, vy); x = b.x; y = b.y; vx = b.vx; vy = b.vy;
      if (i % 3 === 0) pts.push([x, y]);
    }
    return pts;
  }
  function curveAcc(c, t, vx, vy) { if (!c || t > 0.9) return [0, 0]; const sp = Math.hypot(vx, vy) || 1, k = c * 520 * (1 - t / 0.9); return [-vy / sp * k, vx / sp * k]; }
  function boards(x, y, vx, vy) {
    const cx = clamp(x, R.CR, RW - R.CR), cy = clamp(y, R.CR, RH - R.CR), dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), allow = R.CR - PR;
    let hit = false;
    if (d > allow) { const nx = dx / d, ny = dy / d; x = cx + nx * allow; y = cy + ny * allow; const vn = vx * nx + vy * ny; if (vn > 0) { vx -= 1.82 * vn * nx; vy -= 1.82 * vn * ny; hit = vn; } }
    return { x, y, vx, vy, hit };
  }
  function shoot(a) {
    if (!F || F.ended || F.puck || F.pucksLeft <= 0 || (F.mode === 'beer' && F.timeLeft <= 0)) return;
    F.shots++; if (F.pucksLeft !== Infinity) F.pucksLeft--;
    F.puck = { x: LAUNCH.x, y: LAUNCH.y, vx: Math.cos(a.ang) * a.power, vy: Math.sin(a.ang) * a.power, curve: a.curve, t: 0, bounces: 0, hits: 0, pinged: false, trail: [] };
    F.combo = 0; F.shotTricks = [];
    IL.Audio.slap(a.power / 1150); IL.Audio.haptic(14);
    F.shooter.tilt = -0.5; setTimeout(() => F && (F.shooter.tilt = 0), 180);
    if (Math.abs(a.curve) > 0.35) callout(a.curve > 0 ? '↻ SPIN' : '↺ SPIN', 'small', LAUNCH.x, LAUNCH.y - 30);
    updateHud();
  }

  /* ---------------- hits ---------------- */
  function register(t, label, pts, col) {
    const p = F.puck; p.hits++; F.hits++; F.combo++; F.best = Math.max(F.best, F.combo);
    let bonus = 0, tricks = [];
    if (p.bounces > 0) { tricks.push('BANK SHOT'); bonus += 150; }
    if (F.combo >= 2) { tricks.push('COMBO x' + F.combo); bonus += 75 * F.combo; }
    if (p.curve && Math.abs(p.curve) > 0.4) { tricks.push('CURVE'); bonus += 60; }
    const gain = Math.round((pts + bonus) * (1 + (F.combo - 1) * 0.25));
    F.score += gain; F.tricks += tricks.length;
    callout('+' + gain + (label ? ' ' + label : ''), 'small', t.x, t.y - 16);
    if (tricks.length) callout(tricks.join(' · ') + '!', 'big' + (F.combo >= 3 ? ' hot' : ''));
    else if (Math.random() < 0.3) callout(pick(IL.FLICK_LINES.hit), 'mid');
    if (F.combo >= 3) { callout(['', '', '', 'HAT TRICK!', 'FOUR-BAGGER!', 'BEER-LEAGUE LEGEND!'][Math.min(5, F.combo)] || 'UNREAL!', 'count go combo c' + Math.min(6, F.combo)); }
    IL.Audio.haptic(F.combo >= 3 ? [20, 30, 40] : F.combo === 2 ? [15, 25, 15] : 18);
    F.shake = Math.max(F.shake, 4 + F.combo); F.flash = 0.12;
    IL.Audio.combo(F.combo + 2);
    if (F.mode !== 'beer') {
      const left = F.targets.filter(q => q.req && !q.dead).length;
      if (left === 0 && !F.clearing) { F.clearing = true; celly(); F.slow = 0.9; $('game').classList.add('slowmo'); IL.Audio.slowmo(); callout(pick(IL.FLICK_LINES.clear), 'count go'); }
    } else if (F.targets.filter(q => q.req && !q.dead && q.t !== 'goal').length < 3) setTimeout(() => F && F.mode === 'beer' && spawnBeerTarget(), 500);
    updateHud();
  }
  function knock(t) {
    t.dead = true; const p = F.puck;
    const col = { can: '#c0c7d1', cup: '#e63946', cone: '#ff8c42', nacho: '#fbbf24', glass: '#cfefff', cooler: '#2d9cdb' }[t.t] || '#fff';
    if (t.t === 'glass') { IL.Audio.shatter(); burst(t.x, t.y, 'rgba(210,240,255,.95)', 26, 'shard', 220); register(t, 'GLASS', 120); }
    else if (t.t === 'cooler') { IL.Audio.thunk(); burst(t.x, t.y, '#2d9cdb', 18, 'shard'); burst(t.x, t.y, '#e9f6ff', 14); register(t, 'COOLER', 200); }
    else {
      if (t.t === 'can' || t.t === 'cup') IL.Audio.tink(); else IL.Audio.thunk();
      F.debris.push({ t: t.t, x: t.x, y: t.y, vx: p.vx * 0.5 + (Math.random() - 0.5) * 120, vy: p.vy * 0.5 + (Math.random() - 0.5) * 120, rot: 0, vr: (Math.random() - 0.5) * 20, life: 1.2 });
      burst(t.x, t.y, col, 10);
      register(t, t.t === 'nacho' ? 'NACHOS' : t.t === 'cone' ? 'CONE' : '', t.t === 'nacho' ? 180 : 100);
      if (t.t === 'nacho') { pa('Sir, those were $14 nachos.'); IL.Audio.laugh(); }
      // chain reaction for stacks
      if (t.t === 'can' || t.t === 'cup') setTimeout(() => {
        if (!F) return; let n = 0;
        F.targets.forEach(q => { if (!q.dead && (q.t === 'can' || q.t === 'cup') && Math.hypot(q.x - t.x, q.y - t.y) < 19 && Math.random() < (F.mode === 'level' && F.li === 0 ? 1 : 0.65)) { q.dead = true; n++; IL.Audio.tink(); F.debris.push({ t: q.t, x: q.x, y: q.y, vx: (q.x - t.x) * 8, vy: (q.y - t.y) * 8, rot: 0, vr: 12, life: 1 }); burst(q.x, q.y, col, 6); F.score += 80; } });
        if (n >= 2) { callout('STACK ATTACK +' + n * 80, 'mid'); }
        if (F.mode !== 'beer' && !F.clearing && F.targets.filter(q => q.req && !q.dead).length === 0) { F.clearing = true; celly(); F.slow = 0.9; $('game').classList.add('slowmo'); IL.Audio.slowmo(); callout(pick(IL.FLICK_LINES.clear), 'count go'); }
        updateHud();
      }, 90);
    }
  }
  function reflect(p, nx, ny, e) { const vn = p.vx * nx + p.vy * ny; if (vn < 0) { p.vx -= (1 + e) * vn * nx; p.vy -= (1 + e) * vn * ny; } }
  function collide(p) {
    for (const t of F.targets) {
      if (t.dead) continue;
      if (t.t === 'goal') {
        if (p.y < GOAL_Y + 2 && p.y > GOAL_Y - 16 && Math.abs(p.x - CX) < 22 && p.vy < 0 && !p.scored) {
          p.scored = true; t.dead = F.mode !== 'beer'; IL.Audio.goalHorn(); const hz = cosm('horn'); if (hz) setTimeout(() => IL.Audio.horn && IL.Audio.horn(), 250); F.ringT = 1;
          register({ x: CX, y: GOAL_Y + 10 }, p.pinged ? 'BAR DOWN!' : 'GOAL', p.pinged ? 450 : 250);
          if (p.pinged) { callout('🔔 BAR DOWN!', 'count go'); celly(); IL.Audio.haptic([30, 40, 60]); }
          p.vx *= 0.1; p.vy *= 0.1; p.dead = 0.4;
          if (F.mode === 'beer') setTimeout(() => { if (F) t.dead = false; }, 600);
        }
        // posts = crossbar ping
        for (const sx of [-26, 26]) {
          const dx = p.x - (CX + sx), dy = p.y - GOAL_Y, d = Math.hypot(dx, dy);
          if (d < PR + 4) { reflect(p, dx / d, dy / d, 0.9); p.x = CX + sx + dx / d * (PR + 4.5); p.y = GOAL_Y + dy / d * (PR + 4.5); if (!p.pinged) { p.pinged = true; IL.Audio.ping(); callout('PING!', 'big'); F.score += 100; F.flash = 0.15; } }
        }
        if (p.y < GOAL_Y && Math.abs(p.x - CX) < 30 && !p.scored && p.y < GOAL_Y - 14) { p.vy = Math.abs(p.vy) * 0.5; }
        continue;
      }
      if (t.t === 'glass' || t.t === 'wall' || t.t === 'cooler') {
        const hx = t.w / 2, hy = t.h / 2, qx = clamp(p.x, t.x - hx, t.x + hx), qy = clamp(p.y, t.y - hy, t.y + hy), dx = p.x - qx, dy = p.y - qy, d = Math.hypot(dx, dy);
        if (d < PR) {
          if (t.t === 'glass') { knock(t); p.vx *= 0.72; p.vy *= 0.72; continue; }
          const nx = d ? dx / d : 0, ny = d ? dy / d : 1; p.x = qx + nx * (PR + 0.5); p.y = qy + ny * (PR + 0.5); reflect(p, nx, ny, 0.75);
          if (t.t === 'wall') { IL.Audio.thunk(); p.bounces++; }
          else { t.hp--; IL.Audio.thunk(); F.shake = 4; if (t.hp <= 0) knock(t); else { callout('CRACK!', 'small', t.x, t.y - 20); burst(t.x, t.y, '#bfe3ff', 8); } }
        }
        continue;
      }
      const dx = p.x - t.x, dy = p.y - t.y, d = Math.hypot(dx, dy) || 0.01;
      if (t.t === 'tire') {
        if (d < 8 && !t.thru) { t.thru = true; t.dead = F.mode !== 'beer' || true; IL.Audio.lane(); register(t, 'THROUGH THE TIRE', 350); callout('🛞 THROUGH THE TIRE!', 'count go'); if (F.mode === 'beer') setTimeout(() => { if (F) { t.dead = false; t.thru = false; } }, 1500); }
        else if (Math.abs(d - t.r) < PR + 2.5 && !t.thru) { const sgn = d > t.r ? 1 : -1; reflect(p, sgn * dx / d, sgn * dy / d, 0.6); IL.Audio.thunk(); }
        continue;
      }
      if (t.t === 'goalie') {
        if (d < t.r + PR) {
          if (t.open > 0.6 && Math.abs(dx) < 7 && p.vy < 0) { if (!p.fivehole) { p.fivehole = true; F.score += 200; callout('FIVE-HOLE!', 'big'); IL.Audio.lane(); } continue; }
          reflect(p, dx / d, dy / d, 0.7); p.x = t.x + dx / d * (t.r + PR + 0.5); p.y = t.y + dy / d * (t.r + PR + 0.5);
          if (!p.saved) { p.saved = true; IL.Audio.thunk(); callout('SAVE!', 'mid bad'); if (Math.random() < 0.5) pa(pick(IL.FLICK_LINES.goalie)); t.look.emote = 'angry'; t.look.emoteT = 0; }
        }
        continue;
      }
      if (t.t === 'ref') {
        const wx = t.x + 11, wy = t.y + 5, wd = Math.hypot(p.x - wx, p.y - wy);
        if (t.whistle && wd < PR + 5) { t.whistle = false; t.dead = true; IL.Audio.whistle(); register({ x: wx, y: wy }, 'WHISTLE SNIPED', 300); callout('🎯 WHISTLE SNIPED!', 'count go'); pa('Ref is fine. His whistle is not.'); continue; }
        if (d < t.r + PR) { reflect(p, dx / d, dy / d, 0.6); p.x = t.x + dx / d * (t.r + PR + 0.5); p.y = t.y + dy / d * (t.r + PR + 0.5); IL.Audio.thunk(); t.look.emote = 'angry'; t.look.emoteT = 0; }
        continue;
      }
      if (d < t.r + PR) knock(t), p.vx *= 0.84, p.vy *= 0.84;
    }
  }

  /* ---------------- loop ---------------- */
  function frame(now) {
    if (!F) return;
    let dt = Math.min(0.034, (now - last) / 1000); last = now;
    if (F.slow > 0) { F.slow -= dt; dt *= 0.25; if (F.slow <= 0) $('game').classList.remove('slowmo'); }
    if (!paused()) update(dt);
    render();
    raf = requestAnimationFrame(frame);
  }
  function update(dt) {
    F.t += dt;
    if (F.mode === 'beer') {
      F.timeLeft -= dt;
      const round = Math.min(5, 1 + Math.floor((75 - F.timeLeft) / 15));
      if (round !== F.round) { F.round = round; F.wob = (round - 1) * 0.65; callout('ROUND ' + round, 'count go'); pa(IL.FLICK_LINES.rounds[round - 2]); IL.Audio.horn(); }
      if (F.timeLeft <= 0 && !F.puck) return end('time');
    }
    F.targets.forEach(t => {
      if (t.move) { t.x = t.bx + Math.sin(F.t * t.move.sp + t.move.ph) * t.move.ax; }
      if (t.t === 'goalie') { t.x = CX + Math.sin(F.t * t.sp) * t.amp; t.open = Math.max(0, Math.sin(F.t * 2.1)); }
      if (t.look) { t.look.t = F.t; if (t.look.emote) { t.look.emoteT += dt; if (t.look.emoteT > 1.3) t.look.emote = null; } }
    });
    const p = F.puck;
    if (p) {
      const sub = 4, h = dt / sub;
      for (let k = 0; k < sub && F.puck; k++) {
        p.t += h; const c = curveAcc(p.curve, p.t, p.vx, p.vy); p.vx += c[0] * h; p.vy += c[1] * h;
        p.vx *= 1 - 0.55 * h; p.vy *= 1 - 0.55 * h; p.x += p.vx * h; p.y += p.vy * h;
        const b = boards(p.x, p.y, p.vx, p.vy); p.x = b.x; p.y = b.y; p.vx = b.vx; p.vy = b.vy;
        if (b.hit && b.hit > 60) { p.bounces++; IL.Audio.board(b.hit / 900); F.shake = Math.max(F.shake, 2); burst(p.x, p.y, '#ffffff', 4, 'dot', 60); }
        collide(p);
        if (!p.hits) for (const q of F.targets) if (q.req && !q.dead) { const qx = q.t === 'goal' ? CX : q.x, qy = q.t === 'goal' ? GOAL_Y : q.y; p.near = Math.min(p.near == null ? 1e9 : p.near, Math.hypot(p.x - qx, p.y - qy) - (q.r || 10)); }
      }
      p.trail.push([p.x, p.y]); if (p.trail.length > 18) p.trail.shift();
      if (p.dead) p.dead -= dt;
      const sp = Math.hypot(p.vx, p.vy);
      const doneAll = F.mode !== 'beer' && F.targets.every(q => !q.req || q.dead);
      if (sp < 45 || p.t > 3.2 || (doneAll && p.t > 0.5) || (p.dead !== undefined && p.dead !== false && p.dead <= 0)) {
        if (!p.hits && !p.scored && p.near != null && p.near < 16) { callout('SO CLOSE!', 'count go bad'); IL.Audio.haptic([10, 40, 10]); pa('Inches! ' + (F.pucksLeft > 0 ? 'Fire again.' : 'Hit retry, champ.')); }
        else if (!p.hits && !p.scored && Math.random() < 0.5) { if (Math.random() < 0.5) pa(pick(IL.FLICK_LINES.miss)); else IL.FX.chirp(pick(IL.FLICK_LINES.bench)); }
        F.puck = null; F.combo = 0; updateHud();
        if (F.mode !== 'beer') {
          if (F.targets.filter(q => q.req && !q.dead).length === 0) return setTimeout(() => end('clear'), F.celly > 0 ? 1300 : 500);
          if (F.pucksLeft <= 0) return setTimeout(() => end('fail'), 250);
        }
      }
    }
    F.debris.forEach(d => { d.life -= dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= 0.96; d.vy *= 0.96; d.rot += d.vr * dt; });
    F.debris = F.debris.filter(d => d.life > 0);
    for (let i = F.parts.length - 1; i >= 0; i--) { const q = F.parts[i]; q.life -= dt; if (q.life <= 0) { F.parts.splice(i, 1); continue; } q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.97; q.vy *= 0.97; q.rot += q.vr * dt; }
    if (F.celly > 0) F.celly = Math.max(0, F.celly - dt);
    F.shake *= Math.pow(0.02, dt); F.flash = Math.max(0, F.flash - dt); F.ringT = Math.max(0, F.ringT - dt);
    if (F.mode === 'beer') $('fh-pucks').textContent = '⏱ ' + Math.max(0, Math.ceil(F.timeLeft)) + 's · R' + F.round;
  }
  function updateHud() {
    if (!F) return;
    $('fh-title').textContent = F.mode === 'beer' ? 'BEER LEAGUE' : F.mode === 'daily' ? 'DAILY #' + F.n : 'LEVEL ' + (F.li + 1);
    $('fh-sub').textContent = F.level.name ;
    $('fh-score').textContent = F.score.toLocaleString();
    if (F.mode !== 'beer') $('fh-pucks').innerHTML = Array.from({ length: F.level.pucks }, (_, i) => '<i class="' + (i < F.pucksLeft + (F.puck ? 0 : 0) ? 'on' : '') + '"></i>').join('');
    $('fh-combo').textContent = F.combo > 1 ? 'COMBO x' + F.combo : '';
    const left = F.targets.filter(q => q.req && !q.dead).length;
    $('fh-left').textContent = F.mode === 'beer' ? '🎯 ' + F.hits + ' hits' : '🎯 ' + left + ' left' + (F.level.star3 ? ' · ★★★ ' + F.level.star3 + ' spare' : '');
  }

  /* ---------------- end of level / run ---------------- */
  function end(reason) {
    if (!F || F.ended) return; F.ended = true;
    const sv = IL.save; sv.flick = sv.flick || { stars: {}, best: {}, unlocked: 1 };
    let stars = 0, grade, title, key;
    if (F.mode === 'beer') {
      grade = F.score >= 4000 ? 'S' : F.score >= 2600 ? 'A' : F.score >= 1400 ? 'B' : 'C'; key = 'beer'; title = 'FULL TIME!';
      stars = { S: 3, A: 3, B: 2, C: 1 }[grade];
    } else {
      const cleared = reason === 'clear';
      const s3 = F.level.star3 || 2; stars = !cleared ? 0 : F.pucksLeft >= s3 ? 3 : F.pucksLeft >= 1 ? 2 : 1;
      if (cleared) F.score += F.pucksLeft * 250;
      grade = !cleared ? 'C' : stars === 3 && F.tricks >= 2 ? 'S' : stars === 3 ? 'A' : stars === 2 ? 'B' : 'C';
      title = cleared ? (stars === 3 ? 'TOP SHELF!' : 'LEVEL CLEAR!') : 'OUT OF PUCKS';
      key = F.mode === 'daily' ? 'daily-' + IL.todayKey() : 'L' + F.li;
      if (F.mode === 'level' && cleared) { sv.flick.stars[F.li] = Math.max(sv.flick.stars[F.li] || 0, stars); sv.flick.unlocked = Math.max(sv.flick.unlocked, F.li + 2); const firstClear = !(sv.flick.stars[F.li] >= 0) || sv.flick.best['L' + F.li] == null; F.coinGain = 10 + stars * 10 + (F.li === 0 && firstClear ? 100 : 0); sv.coins += F.coinGain; }
      F.unlock = cheekUnlock(sv);
    }
    const prev = sv.flick.best[key] || 0, isPB = F.score > prev && (F.mode === 'beer' || reason === 'clear');
    if (isPB) sv.flick.best[key] = F.score;
    const acc = F.shots ? Math.min(100, F.hits / F.shots * 100) : 0;
    if (F.mode === 'daily') { sv.runs.push({ d: IL.todayKey(), n: F.n, mode: 'daily', title: 'Daily #' + F.n, grade, pct: acc, time: F.t, score: F.score }); sv.runs.sort((a, b) => b.score - a.score || a.time - b.time); sv.runs = sv.runs.slice(0, 25); }
    IL.persist();
    if (stars) { IL.Audio.goalHorn(); IL.Audio.cheer(true); } else IL.Audio.boo();
    const share = { title: F.mode === 'beer' ? 'Beer League' : F.mode === 'daily' ? 'Daily Level #' + F.n : 'Level ' + (F.li + 1) + ' · ' + F.level.name, daily: F.mode === 'daily', n: F.n, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), grade, score: F.score, pct: acc, time: F.t, stars, jobs: [], vi: F.vi, design: F.design, flick: true, lines: [['SHOTS', F.shots], ['HITS', F.hits], ['BEST COMBO', 'x' + Math.max(1, F.best)], ['TRICKS', F.tricks]] };
    IL.Main.lastShare = share; IL.UI.setShare(share);
    F.result = { mode: F.mode, reason, stars, grade, score: F.score, isPB, prev, li: F.li };
    IL.Flick.lastResult = F.result;
    const el = $('fend');
    $('fe-title').textContent = title;
    $('fe-sub').textContent = F.mode === 'beer' ? 'Five rounds of beer-league physics' : F.level.name;
    $('fe-stars').innerHTML = [0, 1, 2].map(i => '<i class="' + (i < stars ? 'on' : '') + '" style="animation-delay:' + (0.2 + i * 0.18) + 's">★</i>').join('');
    $('fe-grade').textContent = grade; $('fe-grade').className = 'grade g' + grade + ' pop';
    $('fe-score').textContent = F.score.toLocaleString();
    $('fe-pb').classList.toggle('hidden', !isPB);
    $('fe-coins').textContent = (F.coinGain ? '+' + F.coinGain + ' 🪙' : '') + (F.unlock ? '  ·  🔓 ' + F.unlock : '') + (F.mode === 'level' && reason === 'clear' && stars < 3 ? '  ·  ★★★ needs ' + (F.level.star3 || 2) + ' spare pucks' : '') + (reason === 'fail' ? 'So close. One more?' : '');
    $('fe-stats').textContent = F.shots + (F.shots === 1 ? ' shot · ' : ' shots · ') + F.hits + ' hits · ' + acc.toFixed(0) + '% · best combo x' + Math.max(1, F.best);
    const next = $('fe-next');
    if (F.mode === 'level' && reason === 'clear' && F.li < LEVELS - 1) { next.textContent = 'NEXT LEVEL ▶'; next.onclick = () => start('level', F.li + 1); }
    else if (F.mode === 'level' && reason === 'clear') { next.textContent = 'ALL LEVELS DONE 🏆'; next.onclick = () => IL.UI.show('home'); }
    else { next.textContent = F.mode === 'beer' ? 'AGAIN ▶' : 'RETRY ↻'; next.onclick = () => restart(); }
    el.classList.remove('hidden'); next.classList.add('cta'); setTimeout(() => { try { next.focus({ preventScroll: true }); } catch (e) {} }, 350);
    if (stars) IL.Audio.haptic([20, 40, 20, 40, 60]);
    setTimeout(() => IL.Audio.grade(grade), 500);
  }

  function celly() { if (!F) return; F.celly = 1.6; F.shooter.mood = 'cheer'; setTimeout(() => F && F.celly > 0 && (callout('💥 BELLY BUMP!', 'big hot'), IL.Audio.thunk(), F.shake = 8, IL.Audio.haptic([40, 30, 80]), burst(LAUNCH.x - 10, LAUNCH.y - 10, '#ffb547', 22, 'dot', 220)), 520); }
  function cheekUnlock(sv) {
    const tot = Object.values(sv.flick.stars || {}).reduce((a, b) => a + b, 0); sv.cosm = sv.cosm || { got: [] };
    const nu = (IL.COSMETICS || []).filter(c => tot >= c.stars && sv.cosm.got.indexOf(c.id) < 0);
    nu.forEach(c => sv.cosm.got.push(c.id)); if (nu.length) IL.persist();
    return nu.length ? nu.map(c => c.name).join(', ') : '';
  }
  function cosm(kind) { const g = (IL.save.cosm && IL.save.cosm.got) || [], l = (IL.COSMETICS || []).filter(c => c.kind === kind && g.indexOf(c.id) >= 0); return l[l.length - 1] || null; }

  /* ---------------- render ---------------- */
  function drawTarget(t) {
    if (t.dead && t.t !== 'goal') return;
    const x = t.x, y = t.y;
    if (t.t === 'can' || t.t === 'cup') {
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 3, 7, 4, 0, 0, 7); ctx.fill();
      const g = ctx.createLinearGradient(x - 7, 0, x + 7, 0);
      if (t.t === 'can') { g.addColorStop(0, '#8d97a6'); g.addColorStop(0.45, '#f2f5f9'); g.addColorStop(1, '#7c8696'); } else { g.addColorStop(0, '#9d0208'); g.addColorStop(0.45, '#ff5a5f'); g.addColorStop(1, '#9d0208'); }
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
      ctx.strokeStyle = t.t === 'can' ? '#5c6676' : '#fff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.stroke();
    } else if (t.t === 'cone') {
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 3, 10, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 5.5, 0, 7); ctx.fill(); ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
    } else if (t.t === 'nacho') { R.drawItem(ctx, { type: 'nacho', x, y, r: 15, rot: 0 }, F.t); ctx.strokeStyle = '#c0c7d1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 17, 0, 7); ctx.stroke(); }
    else if (t.t === 'glass' || t.t === 'wall') {
      ctx.fillStyle = t.t === 'glass' ? 'rgba(200,235,255,.55)' : '#3d4659'; R.rr(ctx, x - t.w / 2, y - t.h / 2, t.w, t.h, 3); ctx.fill();
      ctx.strokeStyle = t.t === 'glass' ? 'rgba(255,255,255,.95)' : '#20263a'; ctx.lineWidth = 1.5; ctx.stroke();
      if (t.t === 'glass') { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(x - t.w / 2 + 6, y - 1.5, t.w * 0.3, 1.5); }
    } else if (t.t === 'cooler') {
      ctx.fillStyle = 'rgba(0,0,0,.25)'; R.rr(ctx, x - t.w / 2 + 3, y - t.h / 2 + 4, t.w, t.h, 5); ctx.fill();
      ctx.fillStyle = '#2d9cdb'; R.rr(ctx, x - t.w / 2, y - t.h / 2, t.w, t.h, 5); ctx.fill();
      ctx.fillStyle = '#f4f7fb'; R.rr(ctx, x - t.w / 2, y - t.h / 2, t.w, 9, 4); ctx.fill();
      ctx.fillStyle = '#1b6fa0'; ctx.fillRect(x - 8, y + 2, 16, 3);
      if (t.hp < 2) { ctx.strokeStyle = '#0b2e45'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 10, y - 4); ctx.lineTo(x - 2, y + 4); ctx.lineTo(x + 6, y - 2); ctx.stroke(); }
    } else if (t.t === 'tire') {
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(x + 3, y + 4, t.r, 0, 7); ctx.stroke();
      ctx.strokeStyle = '#1d1f24'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(x, y, t.r, 0, 7); ctx.stroke();
      ctx.strokeStyle = '#3a3d45'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, t.r, 0, 7); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,181,71,.6)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#8b8b8b'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - t.r - 4); ctx.lineTo(t.bx, y - t.r - 60); ctx.stroke();
    } else if (t.t === 'ref') {
      IL.B.draw(ctx, x, y, t.r, t.look);
      if (t.whistle) { ctx.fillStyle = '#ffd93d'; ctx.beginPath(); ctx.arc(x + 11, y + 5, 4, 0, 7); ctx.fill(); ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x + 11, y + 5, 7 + Math.sin(F.t * 6) * 1.5, 0, 7); ctx.stroke(); }
    } else if (t.t === 'goalie') {
      ctx.fillStyle = '#f4f4f4'; const o = t.open * 7;
      R.rr(ctx, x - 22 - o, y + 4, 16, 18, 5); ctx.fill(); R.rr(ctx, x + 6 + o, y + 4, 16, 18, 5); ctx.fill();
      IL.B.draw(ctx, x, y, t.r, Object.assign(t.look, { hat: 'helmet', hatCol: '#f2f2f2' }));
    } else if (t.t === 'goal') {
      const pulse = t.dead ? 0 : 0.5 + 0.5 * Math.sin(F.t * 4);
      ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillRect(CX - 26, GOAL_Y - 18, 52, 18);
      ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 0.7; for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(CX - 26 + i * 6.5, GOAL_Y - 18); ctx.lineTo(CX - 26 + i * 6.5, GOAL_Y); ctx.stroke(); }
      ctx.strokeStyle = '#e63946'; ctx.lineWidth = 3.5; ctx.strokeRect(CX - 26, GOAL_Y - 18, 52, 18);
      ctx.fillStyle = '#e63946'; [-26, 26].forEach(sx => { ctx.beginPath(); ctx.arc(CX + sx, GOAL_Y, 4, 0, 7); ctx.fill(); });
      if (!t.dead && t.req) { ctx.strokeStyle = 'rgba(255,181,71,' + (0.4 + pulse * 0.5) + ')'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.strokeRect(CX - 30, GOAL_Y - 22, 60, 26); ctx.setLineDash([]); }
      if (F.ringT) { ctx.strokeStyle = 'rgba(255,60,60,' + F.ringT + ')'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(CX, GOAL_Y - 6, 30 + (1 - F.ringT) * 60, 0, 7); ctx.stroke(); }
    }
    if (t.req && !t.dead && t.t !== 'goal' && t.t !== 'goalie') { ctx.fillStyle = '#ffb547'; ctx.beginPath(); ctx.moveTo(x, y - (t.r || 12) - 10 + Math.sin(F.t * 5) * 2); ctx.lineTo(x - 4, y - (t.r || 12) - 16 + Math.sin(F.t * 5) * 2); ctx.lineTo(x + 4, y - (t.r || 12) - 16 + Math.sin(F.t * 5) * 2); ctx.fill(); }
  }
  function render() {
    const sx = F.shake ? (Math.random() - 0.5) * F.shake : 0, sy = F.shake ? (Math.random() - 0.5) * F.shake : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bgC, sx * dpr, sy * dpr);
    ctx.setTransform(dpr * L.s, 0, 0, dpr * L.s, dpr * (L.ox + sx), dpr * (L.oy + sy));
    if (F.wob) { ctx.translate(RW / 2, RH / 2); ctx.rotate(Math.sin(F.t * 1.3) * F.wob * 0.03); ctx.translate(-RW / 2, -RH / 2); }
    ctx.save(); R.rinkPath(ctx); ctx.clip(); ctx.drawImage(iceC, 0, 0, RW, RH);
    const bx = ((F.t * 70) % (RW + RH + 300)) - 200, sg = ctx.createLinearGradient(bx, 0, bx + 160, 160);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,.22)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sg; ctx.fillRect(0, 0, RW, RH);
    ctx.restore();
    IL.B.frontRows(ctx, F.t, F.venue, F.design, F.combo >= 2 ? 'love' : 'happy', F.combo ? 0.8 : 0.25, 1 / 60);
    F.targets.forEach(drawTarget);
    F.debris.forEach(d => { ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot); ctx.globalAlpha = Math.min(1, d.life * 2); ctx.fillStyle = d.t === 'cup' ? '#e63946' : d.t === 'cone' ? '#ff7a1a' : d.t === 'nacho' ? '#fbbf24' : '#c0c7d1'; ctx.fillRect(-6, -4, 12, 8); ctx.restore(); });
    ctx.globalAlpha = 1;
    // aim preview
    const a = aim();
    if (a && !F.puck && F.pucksLeft > 0) {
      const pts = simulate(a, 70);
      pts.forEach((q, i) => { ctx.fillStyle = 'rgba(255,181,71,' + (1 - i / pts.length) + ')'; ctx.beginPath(); ctx.arc(q[0], q[1], 2.6 - i / pts.length * 1.6, 0, 7); ctx.fill(); });
      const k = a.power / 1150; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(LAUNCH.x, LAUNCH.y, 22, -Math.PI / 2, -Math.PI / 2 + 6.283); ctx.stroke();
      ctx.strokeStyle = k > 0.85 ? '#ff4d4d' : '#ffb547'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(LAUNCH.x, LAUNCH.y, 22, -Math.PI / 2, -Math.PI / 2 + 6.283 * k); ctx.stroke();
    }
    // shooter + puck on stick
    if (F.celly > 0) {
      const c = 1.6 - F.celly, gap = c < 0.5 ? 60 * (1 - c / 0.5) : c < 0.65 ? -3 : 6 + Math.sin(c * 14) * 3, hop = Math.abs(Math.sin(c * 9)) * 10, sq = c > 0.5 && c < 0.7 ? 1.25 : 1;
      F.mate = F.mate || Object.assign(IL.B.look(12, 'fan'), { dad: true, beard: false, hat: 'toque', hatCol: '#e63946', jersey: F.shooter.jersey, num: 88 });
      IL.B.draw(ctx, LAUNCH.x - 26 + gap * 0.5 + 18, LAUNCH.y + 10 - hop, 17 * sq, Object.assign(F.mate, { t: F.t, walk: 0.8, mood: 'cheer', dad: true }));
      IL.B.draw(ctx, LAUNCH.x - 26 - gap * 0.5 + 4, LAUNCH.y + 14 - hop, 17 * sq, Object.assign(F.shooter, { t: F.t, walk: 0.8, mood: 'cheer' }));
    } else IL.B.draw(ctx, LAUNCH.x - 26, LAUNCH.y + 14, 17, Object.assign(F.shooter, { t: F.t, walk: drag ? 0.5 : 0.1, mood: F.combo >= 2 ? 'cheer' : 'happy' }));
    const tape = cosm('tape');
    ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(LAUNCH.x - 16, LAUNCH.y + 8); ctx.lineTo(LAUNCH.x - 4, LAUNCH.y + 4); ctx.stroke();
    if (tape) { ctx.strokeStyle = tape.col; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(LAUNCH.x - 8, LAUNCH.y + 5.3); ctx.lineTo(LAUNCH.x - 4, LAUNCH.y + 4); ctx.stroke(); }
    const p = F.puck;
    if (p) {
      p.trail.forEach((q, i) => { ctx.fillStyle = 'rgba(30,30,40,' + (i / p.trail.length * 0.35) + ')'; ctx.beginPath(); ctx.arc(q[0], q[1], PR * (i / p.trail.length), 0, 7); ctx.fill(); });
      drawPuck(p.x, p.y);
    } else if (F.pucksLeft > 0 && !F.ended) drawPuck(LAUNCH.x, LAUNCH.y);
    F.parts.forEach(q => { ctx.globalAlpha = Math.min(1, q.life / q.max * 1.5); ctx.fillStyle = q.col;
      if (q.type === 'shard') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.beginPath(); ctx.moveTo(0, -q.size); ctx.lineTo(q.size * 0.7, q.size); ctx.lineTo(-q.size * 0.7, q.size * 0.6); ctx.fill(); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, 7); ctx.fill(); } });
    ctx.globalAlpha = 1;
    if (!F.shots && !drag && F.t > 0.8) { ctx.font = '34px ' + R.EMOJI_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const k = (F.t * 0.9) % 1; ctx.globalAlpha = 1 - k; ctx.fillText('👆', LAUNCH.x + 20, LAUNCH.y - k * 120); ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.font = '900 13px system-ui'; ctx.fillText('FLICK UP TO SHOOT', LAUNCH.x, LAUNCH.y + 46); }
    if (F.flash) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 'rgba(255,255,255,' + F.flash * 1.5 + ')'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    IL.Clip.watermark(ctx, W, H, dpr);
  }
  function drawPuck(x, y) {
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x + 1.5, y + 2.5, PR, PR * 0.6, 0, 0, 7); ctx.fill();
    const sk = cosm('puck'); ctx.fillStyle = sk ? sk.col : '#111'; ctx.beginPath(); ctx.arc(x, y, PR, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, PR * 0.65, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(x - 2.5, y - 2.5, 1.8, 0, 7); ctx.fill();
  }

  function debug() {
    if (!F) return null;
    return { mode: F.mode, score: F.score, shots: F.shots, hits: F.hits, pucksLeft: F.pucksLeft, ended: F.ended, flying: !!F.puck, launch: toScreen(LAUNCH.x, LAUNCH.y),
      targets: F.targets.filter(t => !t.dead && t.req).map(t => Object.assign(toScreen(t.t === 'goal' ? CX : t.x, t.t === 'goal' ? GOAL_Y - 6 : t.y), { t: t.t })), level: F.li, result: F.result || null, celly: F.celly || 0, star3: F.level.star3 || 0 };
  }
  const _ff = (sec) => { if (F && F.mode === 'beer') { F.timeLeft -= sec; F.puck = null; } };
  return { _ff, _wob: () => F ? F.wob : 0, _end: (r) => end(r), init, start, stop, restart, togglePause, debug, buildLevel, LEVELS, get active() { return !!F; }, lastResult: null };
})();
