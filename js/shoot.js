/* Celly Belly — the main game: close-up net shooter. Flick to shoot at clean targets in the goal mouth.
   Endless streak mode (best score) + a seeded Daily Target Challenge. Virtual coins only. */
window.IL = window.IL || {};
IL.Shoot = (function () {
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  // world (metres): X lateral, Y height, Z depth from camera. Goal mouth 1.83 x 1.22.
  const GW = 0.915, GH = 1.22, ZG = 4.0, CAMH = 0.5, PZ = 1.15, PUCK = 0.038, POST = 0.03;
  const SPOTS = [
    { u: -0.78, v: 0.80, name: 'TOP CORNER' }, { u: 0.78, v: 0.80, name: 'TOP CORNER' },
    { u: 0, v: 0.84, name: 'TOP SHELF' }, { u: 0, v: 0.13, name: 'FIVE-HOLE' },
    { u: -0.78, v: 0.15, name: 'LOW BLOCKER' }, { u: 0.78, v: 0.15, name: 'LOW GLOVE' },
    { u: -0.45, v: 0.5, name: 'GLOVE SIDE' }, { u: 0.45, v: 0.5, name: 'BLOCKER SIDE' }];
  let cv, ctx, W, H, dpr, f, hz, S = null, raf = 0, last = 0, drag = null, callT = 0;

  function sv() { const s = IL.save; s.shoot = s.shoot || { best: 0, bestStreak: 0, runs: 0, daily: {} }; return s.shoot; }
  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  /* ---------- camera ---------- */
  function layout() {
    W = innerWidth; H = innerHeight; dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    f = Math.min(W * 0.86, H * 0.62) * ZG / (GW * 2);           // goal fills most of the width
    hz = H * 0.63 - CAMH * f / ZG;                               // goal line sits ~63% down
  }
  const P = (X, Y, Z) => ({ x: W / 2 + X * f / Z, y: hz + (CAMH - Y) * f / Z, k: f / Z });
  const UV = (u, v) => P(u * GW, v * GH, ZG);

  /* ---------- run ---------- */
  function start(mode) {
    stop(true); IL.Audio.resume && IL.Audio.resume();
    const daily = mode === 'daily', n = IL.dailyNumber();
    S = { mode: daily ? 'daily' : 'endless', n, r: rng(daily ? n * 92821 + 5 : (Math.random() * 1e9) | 0), score: 0, streak: 0, bestStreak: 0, pucks: 3, shots: 0, hits: 0, dings: 0, bars: 0,
      puck: null, target: null, goalie: null, t: 0, stop: 0, shake: 0, celly: 0, ended: false, parts: [], resetT: 0, lastSpot: -1 };
    $('s-end').classList.add('hidden'); IL.UI.show('shoot'); layout(); nextTarget(); hud();
    say(daily ? 'DAILY #' + n : 'FLICK UP TO SHOOT', 'soft');
    cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function stop(silent) { cancelAnimationFrame(raf); S = null; drag = null; if (!silent) IL.UI.show('home'); }
  function nextTarget() {
    const lvl = S.hits;                                         // difficulty follows total hits this run
    let i; do { i = (S.r() * SPOTS.length) | 0; } while (i === S.lastSpot || (lvl < 2 && i === 3));
    S.lastSpot = i; const sp = SPOTS[i];
    S.target = { u: sp.u, v: sp.v, name: sp.name, r: Math.max(0.105, 0.2 - lvl * 0.007), pop: 0 };
    S.goalie = lvl >= 4 ? { u: 0, amp: Math.min(0.55, 0.22 + (lvl - 4) * 0.03), sp: Math.min(2.6, 1.1 + (lvl - 4) * 0.08), w: 0.42, h: 0.62 } : null;
  }

  /* ---------- input: swipe direction + speed = aim + power; sideways bow = light curve ---------- */
  function aimFrom(d) {
    const dx = d.x - d.x0, dy = d.y - d.y0, len = Math.hypot(dx, dy);
    if (len < 18 || dy > -10) return null;
    const ms = Math.max(30, performance.now() - d.t0), speed = len / ms;          // px per ms
    const power = clamp(0.55 + speed * 0.35, 0.6, 1.25);
    const u = clamp(dx / -dy * 1.9, -2, 2);
    const v = clamp((len / Math.min(W, 420)) * 1.55 * (0.88 + 0.12 * power) - 0.08, -0.05, 1.5);
    let dev = 0; const ux = dx / len, uy = dy / len;
    d.path.forEach(p => { const s = (p[0] - d.x0) * -uy + (p[1] - d.y0) * ux; if (Math.abs(s) > Math.abs(dev)) dev = s; });
    return { u, v, curve: clamp(-dev / len * 1.4, -0.35, 0.35), power };
  }
  function bind() {
    cv = $('shoot-canvas'); ctx = cv.getContext('2d');
    cv.addEventListener('pointerdown', (e) => { if (!S || S.ended || S.puck) return; IL.Audio.resume && IL.Audio.resume(); drag = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, id: e.pointerId, t0: performance.now(), path: [] }; e.preventDefault(); });
    cv.addEventListener('pointermove', (e) => { if (drag && drag.id === e.pointerId) { drag.x = e.clientX; drag.y = e.clientY; drag.path.push([e.clientX, e.clientY]); if (drag.path.length > 40) drag.path.shift(); } });
    cv.addEventListener('pointerup', (e) => { if (drag && drag.id === e.pointerId) { const a = aimFrom(drag); drag = null; if (a) fire(a); } });
    cv.addEventListener('pointercancel', () => drag = null);
    window.addEventListener('resize', () => { if (S) layout(); });
    window.addEventListener('keydown', (e) => { if (S && e.code === 'KeyR') start(S.mode === 'daily' ? 'daily' : 'endless'); });
    $('s-retry').onclick = () => { IL.Audio.click(); start(S ? S.mode : 'endless'); };
    $('se-retry').onclick = () => { IL.Audio.click(); start(S ? S.mode : 'endless'); };
    $('s-home').onclick = $('se-home').onclick = () => { IL.Audio.click(); stop(); };
    $('se-share').onclick = share;
  }
  function fire(a) {
    if (!S || S.ended || S.puck || S.pucks <= 0) return;
    S.shots++;
    const fu = a.u + a.curve * 0.5;                                // curve bends the finish point a little
    S.puck = { a, t: 0, T: 0.42 / a.power, fu, fv: a.v, done: false, X: 0, Y: 0, Z: PZ, trail: [] };
    IL.Audio.slap(clamp(a.power - 0.4, 0, 1)); IL.Audio.haptic(12);
  }

  /* ---------- resolve at the goal plane ---------- */
  function resolve(p) {
    const X = p.fu * GW, Y = p.fv * GH, tg = S.target, gl = S.goalie;
    const inMouth = Math.abs(X) < GW - PUCK && Y < GH - PUCK && Y > -0.02;
    const postD = Math.abs(Math.abs(X) - GW), barD = Math.abs(Y - GH);
    const onPost = postD < POST + PUCK && Y < GH + POST, onBar = barD < POST + PUCK && Math.abs(X) < GW + POST;
    let out = 'miss';
    if (gl && inMouth) { const gx = gl.x * GW, hw = gl.w * GW / 2, hh = gl.h * GH; if (Math.abs(X - gx) < hw && Y < hh && !(Math.abs(X - gx) < 0.07 && Y < 0.2)) out = 'save'; }
    if (out !== 'save') {
      const td = Math.hypot(X - tg.u * GW, Y - tg.v * GH);
      if (onBar && Y <= GH) out = 'bardown';                        // off the crossbar and in: always BAR DOWN
      else if (onPost && Math.abs(X) <= GW) out = td < tg.r + PUCK ? 'hit' : 'postin';
      else if (onBar || onPost) out = 'ding';
      else if (inMouth) out = td < tg.r + PUCK ? 'hit' : 'goal';
    }
    p.out = out; p.endX = X; p.endY = Y; S.lastOut = out;
    const mult = () => 1 + Math.floor(S.streak / 3);
    if (out === 'hit' || out === 'bardown') {
      S.streak++; S.hits++; S.bestStreak = Math.max(S.bestStreak, S.streak);
      const big = out === 'bardown' || tg.r <= 0.13 || S.streak % 5 === 0;
      const pts = (out === 'bardown' ? 250 : 100) * mult(); S.score += pts;
      if (out === 'bardown') { S.bars++; IL.Audio.ping(); setTimeout(() => IL.Audio.goalHorn(), 120); say('BAR DOWN  +' + pts, 'gold'); S.stop = 0.14; S.shake = 5; IL.Audio.haptic([25, 30, 50]); }
      else { IL.Audio.tink(); IL.Audio.combo(S.streak + 2); say((S.streak >= 3 ? 'STREAK ' + S.streak + '  ' : '') + '+' + pts, S.streak >= 3 ? 'gold' : ''); S.stop = 0.08; IL.Audio.haptic(S.streak >= 3 ? [15, 25, 25] : 18); }
      if (S.streak % 5 === 0 && S.pucks < 3) { S.pucks++; setTimeout(() => say('STREAK ' + S.streak + '  +1 PUCK', 'gold'), 650); }
      if (big) { S.celly = 1.1; setTimeout(() => S && IL.Audio.bump(), 380); }
      tg.pop = 1; burst(tg.u, tg.v, out === 'bardown' ? '#ffcf3f' : '#e63946');
      setTimeout(() => S && !S.ended && nextTarget(), 420);
    } else if (out === 'postin' || out === 'goal') {
      IL.Audio.thunk(); if (out === 'postin') IL.Audio.ping();
      S.score += out === 'postin' ? 50 : 10; S.streak = 0; say(out === 'postin' ? 'POST & IN  +50' : 'GOAL — MISSED THE TARGET', 'soft');
    } else if (out === 'ding') {
      IL.Audio.ping(); S.dings++; S.score += 25; S.pucks--; say('DING!  SO CLOSE', 'soft'); IL.Audio.haptic([10, 40, 10]); S.stop = 0.06;
    } else {
      S.streak = 0; S.pucks--; if (out === 'save') { IL.Audio.thunk(); say('SAVE', 'bad'); if (S.goalie) S.goalie.flash = 0.4; } else { IL.Audio.board(0.4); say('WIDE', 'bad'); }
      IL.Audio.haptic(30);
    }
    hud();
  }

  /* ---------- loop ---------- */
  function frame(now) {
    if (!S) return;
    let dt = Math.min(0.034, (now - last) / 1000); last = now;
    if (S.stop > 0) { S.stop -= dt; dt = 0; }                     // hit-stop
    update(dt); render(); raf = requestAnimationFrame(frame);
  }
  function update(dt) {
    S.t += dt; S.shake = Math.max(0, S.shake - dt * 30); S.celly = Math.max(0, S.celly - dt);
    if (S.goalie) { const g = S.goalie; g.x = Math.sin(S.t * g.sp) * g.amp; g.flash = Math.max(0, (g.flash || 0) - dt); }
    if (S.target && S.target.pop) S.target.pop = Math.max(0, S.target.pop - dt * 2.5);
    const p = S.puck;
    if (p) {
      p.t += dt; const k = Math.min(1, p.t / p.T);
      if (!p.done) {
        p.Z = PZ + (ZG - PZ) * k; p.X = (p.fu * GW) * k + p.a.curve * GW * 0.6 * Math.sin(Math.PI * k) * -1;
        p.Y = p.fv * GH * k + Math.sin(Math.PI * k) * 0.08 * p.fv;
        if (k >= 1) { p.done = true; resolve(p); p.t2 = 0; }
      } else {
        p.t2 += dt; const o = p.out;
        if (o === 'hit' || o === 'bardown' || o === 'goal' || o === 'postin') { p.Z = Math.min(ZG + 0.7, p.Z + dt * 4); p.Y = Math.max(0, p.Y - dt * (o === 'bardown' ? 4 : 1.5)); }
        else if (o === 'miss') { p.Z += dt * 6; }
        else { p.Z = Math.max(PZ + 0.8, p.Z - dt * 3); p.Y = Math.max(0, p.Y - dt * 2); p.X += (o === 'ding' ? Math.sign(p.X || 1) : 0) * dt; }
        if (p.t2 > 0.5) { S.puck = null; if (S.pucks <= 0) end(); }
      }
      p.trail.push([p.X, p.Y, p.Z]); if (p.trail.length > 7) p.trail.shift();
    }
    for (let i = S.parts.length - 1; i >= 0; i--) { const q = S.parts[i]; q.life -= dt; if (q.life <= 0) { S.parts.splice(i, 1); continue; } q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 300 * dt; }
  }
  function burst(u, v, col) { const c = UV(u, v); for (let i = 0; i < 10; i++) { const a = Math.random() * 6.28, s = 60 + Math.random() * 90; S.parts.push({ x: c.x, y: c.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0.5, col }); } }

  /* ---------- render (calm: white ice, red goal, navy) ---------- */
  function render() {
    const g = ctx; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = S.shake ? (Math.random() - 0.5) * S.shake : 0, sy = S.shake ? (Math.random() - 0.5) * S.shake : 0;
    g.save(); g.translate(sx, sy);
    // arena backdrop
    const bg = g.createLinearGradient(0, 0, 0, hz + 40); bg.addColorStop(0, '#0d1b33'); bg.addColorStop(1, '#1d3358'); g.fillStyle = bg; g.fillRect(-10, -10, W + 20, H + 20);
    // boards + glass behind the net
    const bTop = P(0, 1.1, ZG + 3.5).y, bBot = P(0, 0, ZG + 3.5).y;
    g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, bTop - 70, W, 70);
    g.fillStyle = '#f2f5f8'; g.fillRect(0, bTop, W, bBot - bTop); g.fillStyle = '#f5c518'; g.fillRect(0, bBot - 4, W, 4);
    // ice
    const ice = g.createLinearGradient(0, bBot, 0, H); ice.addColorStop(0, '#e7eef5'); ice.addColorStop(1, '#ffffff'); g.fillStyle = ice; g.fillRect(0, bBot, W, H - bBot);
    // goal line + crease
    const gl0 = P(-6, 0, ZG), gl1 = P(6, 0, ZG); g.strokeStyle = '#d62839'; g.lineWidth = 2; g.beginPath(); g.moveTo(gl0.x, gl0.y); g.lineTo(gl1.x, gl1.y); g.stroke();
    g.beginPath(); for (let i = 0; i <= 24; i++) { const a = Math.PI * i / 24, q = P(Math.cos(a) * 1.83, 0, ZG - Math.sin(a) * 1.4); i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y); } g.closePath();
    g.fillStyle = 'rgba(120,180,235,.45)'; g.fill(); g.strokeStyle = '#d62839'; g.lineWidth = 2; g.stroke();
    // net: back + mesh
    const D = 1.0, bl = P(-GW, 0, ZG + D), br = P(GW, 0, ZG + D), btl = P(-GW * 0.8, GH * 0.75, ZG + D * 0.6), btr = P(GW * 0.8, GH * 0.75, ZG + D * 0.6);
    const fl = UV(-1, 0), fr = UV(1, 0), tl = UV(-1, 1), tr = UV(1, 1);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(tl.x, tl.y); g.lineTo(tr.x, tr.y); g.lineTo(btr.x, btr.y); g.lineTo(br.x, br.y); g.lineTo(bl.x, bl.y); g.lineTo(btl.x, btl.y); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(70,90,120,.22)'; g.lineWidth = 1;
    for (let i = 1; i < 14; i++) { const k = i / 14; g.beginPath(); g.moveTo(bl.x + (br.x - bl.x) * k, bl.y); g.lineTo(btl.x + (btr.x - btl.x) * k, btl.y); g.lineTo(tl.x + (tr.x - tl.x) * k, tl.y); g.stroke(); }
    for (let i = 1; i < 8; i++) { const k = i / 8; g.beginPath(); g.moveTo(bl.x + (btl.x - bl.x) * k, bl.y + (btl.y - bl.y) * k); g.lineTo(br.x + (btr.x - br.x) * k, br.y + (btr.y - br.y) * k); g.stroke(); }
    // goalie (behind targets visually) / target
    if (S.goalie) drawGoalie(g, S.goalie);
    if (S.target) drawTarget(g, S.target);
    // posts + crossbar
    const pw = POST * 2 * f / ZG;
    g.strokeStyle = '#d62839'; g.lineWidth = pw; g.lineCap = 'round';
    g.beginPath(); g.moveTo(fl.x, fl.y); g.lineTo(tl.x, tl.y); g.lineTo(tr.x, tr.y); g.lineTo(fr.x, fr.y); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = pw * 0.25; g.beginPath(); g.moveTo(fl.x - pw * 0.2, fl.y); g.lineTo(tl.x - pw * 0.2, tl.y + pw * 0.2); g.lineTo(tr.x, tr.y - pw * 0.2); g.stroke();
    // aim reticle (subtle) while dragging
    if (drag && !S.puck) { const a = aimFrom(drag); if (a) { const c = UV(a.u + a.curve * 0.5, a.v); g.strokeStyle = 'rgba(13,27,51,.45)'; g.lineWidth = 1.5; g.setLineDash([3, 4]); g.beginPath(); g.arc(c.x, c.y, 9, 0, 7); g.stroke(); g.setLineDash([]); } }
    // puck
    const p = S.puck;
    if (p) { p.trail.forEach((q, i) => { const s = P(q[0], q[1], q[2]); g.fillStyle = 'rgba(13,27,51,' + (i / p.trail.length * 0.18) + ')'; g.beginPath(); g.arc(s.x, s.y, PUCK * s.k * 0.9, 0, 7); g.fill(); }); drawPuck(g, p.X, p.Y, p.Z); }
    else if (!S.ended && S.pucks > 0) drawPuck(g, 0, 0, PZ);
    // shooter's stick blade (we're right behind him)
    drawStick(g);
    S.parts.forEach(q => { g.globalAlpha = q.life * 2; g.fillStyle = q.col; g.beginPath(); g.arc(q.x, q.y, 2.5, 0, 7); g.fill(); }); g.globalAlpha = 1;
    if (S.celly) drawCelly(g);
    if (!S.shots && !drag) { const k = (S.t * 0.8) % 1, c = P(0, 0, PZ); g.globalAlpha = 1 - k; g.fillStyle = '#0d1b33'; g.beginPath(); g.arc(c.x, c.y - 40 - k * 90, 7, 0, 7); g.fill(); g.globalAlpha = 1; }
    g.restore();
  }
  function drawTarget(g, t) {
    const c = UV(t.u, t.v), r = t.r * f / ZG * (1 + t.pop * 0.4);
    g.globalAlpha = 1 - t.pop * 0.7;
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(c.x, c.y, r, 0, 7); g.fill();
    g.strokeStyle = '#d62839'; g.lineWidth = r * 0.18; g.beginPath(); g.arc(c.x, c.y, r * 0.86, 0, 7); g.stroke();
    g.fillStyle = '#d62839'; g.beginPath(); g.arc(c.x, c.y, r * 0.38, 0, 7); g.fill();
    g.globalAlpha = 1;
    if (!S.shots && !t.pop) { g.fillStyle = 'rgba(13,27,51,.7)'; g.font = '700 11px system-ui,sans-serif'; g.textAlign = 'center'; g.fillText(t.name, c.x, c.y + r + 14); }
  }
  function drawGoalie(g, gl) {
    const c = UV(gl.x, 0), k = f / ZG, w = gl.w * GW * k, h = gl.h * GH * k;
    g.fillStyle = gl.flash ? '#3b5b8f' : '#1d3358';
    // pads with a five-hole gap
    g.beginPath(); IL.R.rr(g, c.x - w / 2, c.y - h * 0.36, w * 0.44, h * 0.36, 6); g.fill();
    g.beginPath(); IL.R.rr(g, c.x + w * 0.06, c.y - h * 0.36, w * 0.44, h * 0.36, 6); g.fill();
    g.beginPath(); IL.R.rr(g, c.x - w * 0.4, c.y - h, w * 0.8, h * 0.7, 14); g.fill();
    g.fillStyle = '#f2f5f8'; g.beginPath(); g.arc(c.x, c.y - h * 1.02, w * 0.17, 0, 7); g.fill();
    g.fillStyle = '#d62839'; g.fillRect(c.x - w * 0.4, c.y - h * 0.62, w * 0.8, h * 0.06);
  }
  function drawPuck(g, X, Y, Z) {
    const top = P(X, Y + 0.025, Z), bot = P(X, Y, Z), r = PUCK * top.k;
    g.fillStyle = 'rgba(13,27,51,.18)'; g.beginPath(); const sh = P(X, 0, Z); g.ellipse(sh.x, sh.y + r * 0.2, r * 1.1, r * 0.35, 0, 0, 7); g.fill();
    g.fillStyle = '#05080e'; g.beginPath(); g.ellipse(bot.x, bot.y, r, r * 0.45, 0, 0, 7); g.fill(); g.fillRect(bot.x - r, top.y, r * 2, bot.y - top.y);
    g.fillStyle = '#1c222c'; g.beginPath(); g.ellipse(top.x, top.y, r, r * 0.45, 0, 0, 7); g.fill();
  }
  function drawStick(g) {
    const c = P(0, 0, PZ), k = c.k, s = S.puck && S.puck.t < 0.15 ? -1 : 0;
    g.save(); g.translate(c.x - 0.09 * k, c.y + 0.02 * k); g.rotate(-0.15 + s * 0.4);
    g.fillStyle = '#20242c'; g.beginPath(); IL.R.rr(g, -0.15 * k, -0.025 * k, 0.17 * k, 0.05 * k, 4); g.fill();   // taped blade
    g.fillStyle = '#f2f5f8'; g.fillRect(-0.1 * k, -0.025 * k, 0.04 * k, 0.05 * k);
    g.strokeStyle = '#2b2f38'; g.lineWidth = 0.035 * k; g.beginPath(); g.moveTo(-0.15 * k, 0); g.lineTo(-0.5 * k, 0.6 * k); g.stroke();
    g.restore();
  }
  function drawCelly(g) {
    // small belly bump at the bottom-left: two bubble skaters bounce in and bump
    const c = 1.1 - S.celly, gap = c < 0.35 ? 46 * (1 - c / 0.35) : c < 0.5 ? -2 : 4, hop = Math.abs(Math.sin(c * 8)) * 6, x = W - 78, y = H - 90;
    g.globalAlpha = Math.min(1, S.celly * 3);
    const a = { body: '#1d3358', dad: true, beard: true, mood: 'cheer', hat: 'helmet', hatCol: '#d62839', t: S.t }, b = { body: '#d62839', dad: true, mood: 'cheer', hat: 'helmet', hatCol: '#1d3358', t: S.t };
    try { IL.B.draw(g, x - 14 - gap / 2, y - hop, 16, Object.assign(IL.B.look(5, 'player'), a)); IL.B.draw(g, x + 14 + gap / 2, y - hop, 16, Object.assign(IL.B.look(8, 'player'), b)); } catch (e) {}
    g.globalAlpha = 1;
  }

  /* ---------- HUD + single callout ---------- */
  function hud() {
    if (!S) return;
    $('s-score').textContent = S.score.toLocaleString(); $('s-streak').textContent = S.streak;
    $('s-pucks').textContent = '●'.repeat(Math.max(0, S.pucks)) + '○'.repeat(Math.max(0, 3 - S.pucks));
    $('s-streak').parentNode.classList.toggle('hot', S.streak >= 3);
  }
  function say(txt, cls) { const el = $('s-call'); el.textContent = txt; el.className = 'show ' + (cls || ''); void el.offsetWidth; clearTimeout(callT); callT = setTimeout(() => el.className = '', 1100); }

  /* ---------- end ---------- */
  function end() {
    if (!S || S.ended) return; S.ended = true;
    const s = sv(); s.runs++;
    let pb = false;
    if (S.mode === 'daily') { const k = IL.todayKey(); pb = S.score > (s.daily[k] || 0); if (pb) s.daily[k] = S.score; }
    else { pb = S.score > s.best && S.score > 0; if (pb) s.best = S.score; }
    s.bestStreak = Math.max(s.bestStreak, S.bestStreak);
    const coins = Math.floor(S.score / 50); IL.save.coins += coins; IL.persist();
    $('se-mode').textContent = S.mode === 'daily' ? 'DAILY #' + S.n : 'RUN OVER';
    $('se-score').textContent = S.score.toLocaleString(); $('se-pb').classList.toggle('hidden', !pb);
    $('se-stats').textContent = 'Best streak ' + S.bestStreak + ' · ' + S.hits + ' targets · ' + S.bars + ' bar down' + (S.mode === 'daily' ? '' : ' · Best ' + s.best.toLocaleString());
    $('se-coins').textContent = coins ? '+' + coins + ' 🪙' : '';
    $('s-end').classList.remove('hidden'); if (pb) IL.Audio.win(); else IL.Audio.grade('B');
    setTimeout(() => { try { $('se-retry').focus({ preventScroll: true }); } catch (e) {} }, 200);
    IL.UI.shareText = shareText();
  }
  function shareText() { return IL.GAME_TITLE + (S.mode === 'daily' ? ' Daily #' + S.n : '') + ': ' + S.score.toLocaleString() + ' pts · streak ' + S.bestStreak + (S.bars ? ' · ' + S.bars + '× BAR DOWN' : '') + ' 🏒'; }
  async function share() {
    const t = shareText(); IL.UI.shareText = t;
    try { if (navigator.share) { await navigator.share({ text: t, title: IL.GAME_TITLE }); return; } } catch (e) { return; }
    try { await navigator.clipboard.writeText(t); IL.UI.toast('Score copied'); } catch (e) { IL.UI.toast(t); }
  }

  /* ---------- home ---------- */
  function renderHome() {
    const s = sv(), dk = s.daily[IL.todayKey()];
    $('nh-best').textContent = s.best ? 'Best ' + s.best.toLocaleString() + ' · Streak ' + s.bestStreak : 'Flick. Bar down. Celly.';
    $('btn-sdaily').textContent = '📅 Daily #' + IL.dailyNumber() + (dk ? ' · ' + dk.toLocaleString() : '');
    $('home-coins').textContent = '🪙 ' + IL.save.coins.toLocaleString();
    const c = $('nh-art'), g = c.getContext('2d'), w = c.width, h = c.height; g.clearRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.fillRect(0, h * 0.72, w, h); g.strokeStyle = '#d62839'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, h * 0.72); g.lineTo(w, h * 0.72); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(w * 0.18, h * 0.22, w * 0.64, h * 0.5);
    g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 1; for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo(w * (0.18 + 0.064 * i), h * 0.22); g.lineTo(w * (0.18 + 0.064 * i), h * 0.72); g.stroke(); }
    g.strokeStyle = '#d62839'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(w * 0.18, h * 0.72); g.lineTo(w * 0.18, h * 0.22); g.lineTo(w * 0.82, h * 0.22); g.lineTo(w * 0.82, h * 0.72); g.stroke();
    [[0.27, 0.34], [0.73, 0.34]].forEach(([x, y]) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(w * x, h * y, 14, 0, 7); g.fill(); g.fillStyle = '#d62839'; g.beginPath(); g.arc(w * x, h * y, 5, 0, 7); g.fill(); });
    g.fillStyle = '#05080e'; g.beginPath(); g.ellipse(w * 0.5, h * 0.9, 13, 5, 0, 0, 7); g.fill();
  }
  function init() {
    bind();
    $('btn-shoot').onclick = () => { IL.Audio.click(); start('endless'); };
    $('btn-sdaily').onclick = () => { IL.Audio.click(); start('daily'); };
    $('btn-more').onclick = () => { IL.Audio.click(); const m = $('more-panel'); m.classList.toggle('hidden'); $('btn-more').textContent = m.classList.contains('hidden') ? 'More' : 'Less'; };
    renderHome();
  }
  /* test hooks */
  function debug() { if (!S) return null; const t = S.target, c = t && UV(t.u, t.v), launch = P(0, 0, PZ);
    return { mode: S.mode, score: S.score, streak: S.streak, pucks: S.pucks, shots: S.shots, hits: S.hits, bars: S.bars, ended: S.ended, flying: !!S.puck, celly: S.celly, goalie: !!S.goalie,
      target: t && { u: t.u, v: t.v, r: t.r, name: t.name, x: c.x, y: c.y }, launch, out: S.lastOut }; }
  function _fire(u, v, curve) { fire({ u, v, curve: curve || 0, power: 1 }); }
  // inverse of aimFrom for a given flick duration: returns a screen swipe vector that lands on (u, v)
  function swipeFor(u, v, ms) { const speed0 = 1; let len = 150; for (let i = 0; i < 30; i++) { const power = clamp(0.55 + (len / ms) * 0.35, 0.6, 1.25); len = (v + 0.08) / (1.55 * (0.88 + 0.12 * power)) * Math.min(W, 420); }
    const dy = -len / Math.sqrt(1 + (u / 1.9) ** 2), dx = u / 1.9 * -dy; return { dx, dy }; }
  return { init, start, stop, debug, renderHome, _fire, swipeFor, _end: () => { if (S) { S.pucks = 0; end(); } }, get active() { return !!S; } };
})();
