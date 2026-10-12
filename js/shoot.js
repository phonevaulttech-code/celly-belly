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
  function start(mode, li) {
    stop(true); IL.Audio.resume && IL.Audio.resume();
    if (mode === 'pints') return startPint(li == null ? nextPint() : li);
    const weekly = mode === 'weekly', daily = mode === 'daily' || weekly, n = weekly ? IL.Meta.weekNumber() : IL.dailyNumber();
    labels('STREAK');
    S = { mode: weekly ? 'weekly' : daily ? 'daily' : 'endless', n, r: rng(weekly ? n * 15485863 + 77 : daily ? n * 92821 + 5 : (Math.random() * 1e9) | 0), score: 0, streak: 0, bestStreak: 0, pucks: 3, shots: 0, hits: 0, dings: 0, bars: 0,
      puck: null, target: null, goalie: null, t: 0, stop: 0, shake: 0, celly: 0, ended: false, parts: [], resetT: 0, lastSpot: -1 };
    $('s-end').classList.add('hidden'); IL.UI.show('shoot'); layout(); nextTarget(); hud();
    say(weekly ? 'WEEKLY TOURNAMENT #' + n : daily ? 'DAILY #' + n : 'FLICK UP TO SHOOT', 'soft');
    cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function stop(silent) { cancelAnimationFrame(raf); S = null; drag = null; if (!silent) IL.UI.show('home'); }
  function nextTarget() {
    const lvl = S.hits;                                         // difficulty follows total hits this run
    let i; do { i = (S.r() * SPOTS.length) | 0; } while (i === S.lastSpot || (lvl < 2 && i === 3));
    S.lastSpot = i; const sp = SPOTS[i];
    S.target = { u: sp.u, v: sp.v, name: sp.name, r: Math.max(0.124, 0.236 - lvl * 0.006), pop: 0 };   // ~18% bigger than v1
    S.goalie = lvl >= 6 ? { u: 0, amp: Math.min(0.5, 0.2 + (lvl - 6) * 0.02), sp: Math.min(2.2, 1.0 + (lvl - 6) * 0.05), w: 0.42, h: 0.62 } : null;   // slower ramp
  }

  /* ---------- input: swipe direction + speed = aim + power; sideways bow = light curve ---------- */
  function aimFrom(d) {
    const dx = d.x - d.x0, dy = d.y - d.y0, len = Math.hypot(dx, dy);
    if (len < 18 || dy > -10) return null;
    const ms = Math.max(30, performance.now() - d.t0), speed = len / ms;          // px per ms
    const power = clamp(0.6 + speed * 0.3, 0.65, 1.2);
    const u = clamp(dx / -dy * 1.9, -2, 2);
    const v = clamp((len / Math.min(W, 420)) * 1.4 * (0.92 + 0.08 * power) - 0.06, -0.05, 1.5);   // gentler: more swipe per unit of height
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
    window.addEventListener('keydown', (e) => { if (S && e.code === 'KeyR') again(); });
    $('s-retry').onclick = () => { IL.Audio.click(); again(); };
    $('se-retry').onclick = () => { IL.Audio.click(); if (S && S.mode === 'pints' && S.cleared && S.li < PINTS - 1) start('pints', S.li + 1); else again(); };
    $('se-levels').onclick = () => { IL.Audio.click(); if (S && S.mode === 'weekly') IL.Meta.openWeekly(); else openPints(); };
    $('s-home').onclick = $('se-home').onclick = () => { IL.Audio.click(); stop(); };
    $('se-share').onclick = share;
  }
  function fire(a) {
    if (!S || S.ended || S.puck || S.pucks <= 0) return;
    S.shots++;
    let fu = a.u + a.curve * 0.5, fv = a.v;                        // curve bends the finish point a little
    if (S.mode === 'pints') { const d = drift(); fu += d.u; fv += d.v; S.pucks--; S.shotKnocks = 0; }
    else if (S.target) {                                            // gentle aim assist: only pulls shots that were already close
      const t = S.target, R0 = t.r * 2.2, dd = Math.hypot((fu - t.u) * GW, (fv - t.v) * GH);
      if (dd < R0) { const pull = 0.45 * (1 - dd / R0) + 0.15; fu += (t.u - fu) * pull; fv += (t.v - fv) * pull; }
    }
    S.puck = { a, t: 0, T: 0.42 / a.power, fu, fv, done: false, hitSet: [], X: 0, Y: 0, Z: PZ, trail: [] };
    IL.Audio.slap(clamp(a.power - 0.4, 0, 1)); IL.Audio.haptic(12); if (S.mode === 'pints') hud();
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
      if (out === 'bardown') { S.bars++; IL.Audio.ping(); setTimeout(() => IL.Meta.horn(), 120); say('BAR DOWN  +' + pts, 'gold'); S.stop = 0.14; S.shake = 5; IL.Audio.haptic([25, 30, 50]); }
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
        if (S.mode === 'pints') pintCollide(p);
        if (!p.done && k >= 1) { p.done = true; if (S.mode === 'pints') { p.out = Math.abs(p.X) < GW && p.Y < GH ? 'goal' : 'miss'; if (!p.hitSet.length) { IL.Audio.board(0.3); say(p.out === 'goal' ? 'IN THE NET — HIT THE STUFF' : 'MISSED', 'bad'); } } else resolve(p); p.t2 = 0; }
      } else {
        p.t2 += dt; const o = p.out;
        if (o === 'hit' || o === 'bardown' || o === 'goal' || o === 'postin') { p.Z = Math.min(ZG + 0.7, p.Z + dt * 4); p.Y = Math.max(0, p.Y - dt * (o === 'bardown' ? 4 : 1.5)); }
        else if (o === 'miss') { p.Z += dt * 6; }
        else { p.Z = Math.max(PZ + 0.8, p.Z - dt * 3); p.Y = Math.max(0, p.Y - dt * 2); p.X += (o === 'ding' ? Math.sign(p.X || 1) : 0) * dt; }
        if (p.t2 > 0.5) { S.puck = null; if (S.mode === 'pints') pintCheck(); else if (S.pucks <= 0) end(); }
      }
      p.trail.push([p.X, p.Y, p.Z]); if (p.trail.length > 7) p.trail.shift();
    }
    if (S.objs) S.objs.forEach(o => { if (o.dead) { o.dt += dt; o.X += o.vx * dt; o.Y += o.vy * dt; o.vy -= 6 * dt; o.Z += o.vz * dt; } else if (o.hitT) o.hitT = Math.max(0, o.hitT - dt); });
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
    if (S.target && S.mode !== 'pints') drawTarget(g, S.target);
    // posts + crossbar
    const pw = POST * 2 * f / ZG;
    g.strokeStyle = '#d62839'; g.lineWidth = pw; g.lineCap = 'round';
    g.beginPath(); g.moveTo(fl.x, fl.y); g.lineTo(tl.x, tl.y); g.lineTo(tr.x, tr.y); g.lineTo(fr.x, fr.y); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = pw * 0.25; g.beginPath(); g.moveTo(fl.x - pw * 0.2, fl.y); g.lineTo(tl.x - pw * 0.2, tl.y + pw * 0.2); g.lineTo(tr.x, tr.y - pw * 0.2); g.stroke();
    if (S.objs) S.objs.slice().sort((a, b) => b.Z - a.Z).forEach(o => drawObj(g, o));
    // aim reticle (subtle) while dragging
    if (drag && !S.puck) { const a = aimFrom(drag), d = S.mode === 'pints' ? drift() : { u: 0, v: 0 }; if (a) { const c = UV(a.u + a.curve * 0.5 + d.u, a.v + d.v); g.strokeStyle = 'rgba(13,27,51,.45)'; g.lineWidth = 1.5; g.setLineDash([3, 4]); g.beginPath(); g.arc(c.x, c.y, 9, 0, 7); g.stroke(); g.setLineDash([]); } }
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
    const sk = skin('puck'); g.fillStyle = sk.col; g.beginPath(); g.ellipse(bot.x, bot.y, r, r * 0.45, 0, 0, 7); g.fill(); g.fillRect(bot.x - r, top.y, r * 2, bot.y - top.y);
    g.fillStyle = sk.top; g.beginPath(); g.ellipse(top.x, top.y, r, r * 0.45, 0, 0, 7); g.fill();
  }
  function drawStick(g) {
    const c = P(0, 0, PZ), k = c.k, s = S.puck && S.puck.t < 0.15 ? -1 : 0;
    g.save(); g.translate(c.x - 0.09 * k, c.y + 0.02 * k); g.rotate(-0.15 + s * 0.4);
    g.fillStyle = '#20242c'; g.beginPath(); IL.R.rr(g, -0.15 * k, -0.025 * k, 0.17 * k, 0.05 * k, 4); g.fill();   // taped blade
    g.fillStyle = skin('tape').col; g.fillRect(-0.12 * k, -0.025 * k, 0.07 * k, 0.05 * k);
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

  /* =====================================================================================
     BEER LEAGUE — "pints": Pop Shot-style rounds in the same close-net view.
     Clear every can / cooler / cone / nacho tray with limited pucks. Leftover pucks = bonus.
     Each pint adds a light, tasteful drift to your aim (the beer gag). Screen stays still.
     ===================================================================================== */
  const PINTS = 30;
  const SKINS = {
    puck: [{ id: 'p0', name: 'Classic', col: '#05080e', top: '#1c222c', price: 0 }, { id: 'p1', name: 'Goal Red', col: '#8e1520', top: '#c62835', price: 150 },
      { id: 'p2', name: 'Navy', col: '#0d1b33', top: '#284a80', price: 150 }, { id: 'p3', name: 'Frosty', col: '#4f8fb2', top: '#9fd3ee', price: 300 }, { id: 'p4', name: 'Gold', col: '#8a6510', top: '#e0b43a', price: 600 }],
    tape: [{ id: 't0', name: 'White tape', col: '#f2f5f8', price: 0 }, { id: 't1', name: 'Black tape', col: '#111418', price: 100 }, { id: 't2', name: 'Red tape', col: '#d62839', price: 120 },
      { id: 't3', name: 'Pink tape', col: '#ff7ab6', price: 250 }, { id: 't4', name: 'Gold tape', col: '#e0b43a', price: 500 }],
    horn: [{ id: 'h0', name: 'Arena horn', col: '#e63946', price: 0 }, { id: 'h1', name: 'Double horn', col: '#ff8a3d', price: 200 }, { id: 'h2', name: 'Train horn', col: '#6f84a3', price: 350 }, { id: 'h3', name: 'Rink organ', col: '#8e5bd6', price: 300 }]
  };
  let deferredInstall = null, a2Shown = false;
  function pintSave() { const s = sv(); s.pints = s.pints || { stars: {}, unlocked: 1 }; s.skins = s.skins || { owned: ['p0', 't0', 'h0'], puck: 'p0', tape: 't0', horn: 'h0' }; if (!s.skins.horn) { s.skins.horn = 'h0'; s.skins.owned.push('h0'); } return s.pints; }
  function skinSave() { pintSave(); return sv().skins; }
  function skin(kind) { const ss = skinSave(), id = ss[kind]; return SKINS[kind].find(x => x.id === id) || SKINS[kind][0]; }
  function nextPint() { const ps = pintSave(); return Math.min(PINTS - 1, ps.unlocked - 1); }
  const NAMES = ['Six-Pack Stack', 'Crossbar Cans', 'Cooler Corner', 'Nacho Night', 'Crease Pyramid', 'Full Tailgate'];
  function buildPint(li) {
    const r = rng(li * 7907 + 11), tpl = li % 6, tier = Math.floor(li / 6), O = [];
    const can = (X, Y, Z, bar) => O.push({ k: 'can', X, Y, Z, w: 0.066, h: 0.12, bar: !!bar, alt: O.length % 2 });
    const pyramid = (rows, cx) => { for (let j = 0; j < rows; j++) for (let i = 0; i < rows - j; i++) can(cx + (i - (rows - j - 1) / 2) * 0.07, 0.06 + j * 0.12, ZG - 0.7); };
    const barCans = (xs) => xs.forEach(x => can(x, GH + POST + 0.06, ZG, true));
    const cooler = (side) => O.push({ k: 'cooler', X: side * 0.6, Y: 0.15, Z: ZG - 0.08, w: 0.4, h: 0.3, hp: 2 });
    const cone = (x) => O.push({ k: 'cone', X: x, Y: 0.11, Z: ZG - 1.15, w: 0.16, h: 0.22 });
    const tray = () => O.push({ k: 'tray', X: 0, Y: GH + POST + 0.04, Z: ZG, w: 0.34, h: 0.08 });
    const side = r() < 0.5 ? -1 : 1;
    switch (tpl) {
      case 0: pyramid(3 + Math.min(1, tier), 0); break;
      case 1: barCans(tier ? [-0.66, -0.33, 0, 0.33, 0.66] : [-0.5, 0, 0.5]); break;
      case 2: cooler(side); cone(-side * 0.42); break;
      case 3: tray(); barCans([-0.6, 0.6]); break;
      case 4: pyramid(3, 0); cooler(side); break;
      case 5: tray(); cone(side * 0.42); barCans([-0.62, 0.62]); cooler(-side); break;
    }
    if (tier >= 1 && tpl !== 2 && tpl !== 5) cone((r() < 0.5 ? -1 : 1) * 0.45);
    if (tier >= 3 && tpl !== 1 && tpl !== 3 && tpl !== 5) barCans([-0.62, 0.62]);
    O.forEach(o => { o.dead = false; o.dt = 0; o.vx = 0; o.vy = 0; o.vz = 0; o.hp = o.hp || 1; o.hitT = 0; });
    const est = (O.some(o => o.k === 'can' && !o.bar) ? 2 : 0) + Math.ceil(O.filter(o => o.bar).length / 2) + O.filter(o => o.k === 'cooler').length * 2 + O.filter(o => o.k === 'cone' || o.k === 'tray').length;
    const pucks = Math.max(est + 1, Math.min(8, est + 3 - Math.floor(tier / 2)));
    return { li, name: NAMES[tpl] + (tier ? ' ' + ['', 'II', 'III', 'IV', 'V'][tier] : ''), objs: O, pucks, star3: pucks >= 5 ? 2 : 1, wob: Math.min(0.3, 0.025 + li * 0.011) };
  }
  function startPint(li) {
    const L = buildPint(li); labels('PINT');
    S = { mode: 'pints', li, level: L, objs: L.objs, wob: L.wob, score: 0, streak: 0, bestStreak: 0, pucks: L.pucks, maxPucks: L.pucks, shots: 0, hits: 0, bars: 0, dings: 0,
      puck: null, target: null, goalie: null, t: 0, stop: 0, shake: 0, celly: 0, ended: false, parts: [], stars: 0, r: rng(li + 1) };
    $('s-end').classList.add('hidden'); IL.UI.show('shoot'); layout(); hud();
    say('PINT ' + (li + 1) + ' · ' + L.name.toUpperCase(), 'soft');
    cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame);
  }
  // the beer gag: a slow, gentle drift of where the puck really goes (shown on the reticle)
  function drift() { const w = S.wob || 0; return { u: w * (Math.sin(S.t * 1.1) + 0.4 * Math.sin(S.t * 2.3 + 1)), v: w * 0.45 * Math.sin(S.t * 1.7 + 0.5) }; }
  const pathK = (Z) => (Z - PZ) / (ZG - PZ);
  // inverse aim for an object (test hook / tuning): returns the (u, v) that sends a straight shot through it, minus current drift
  function aimAt(i) {
    const o = S && S.objs && S.objs[i]; if (!o) return null; const k = pathK(o.Z), d = drift();
    return { u: o.X / (GW * k) - d.u, v: o.Y / (GH * k + 0.08 * Math.sin(Math.PI * k)) - d.v };
  }
  function pintCollide(p) {
    for (const o of S.objs) {
      if (o.dead || p.done || p.hitSet.indexOf(o) >= 0 || Math.abs(p.Z - o.Z) > 0.17) continue;
      if (Math.abs(p.X - o.X) < o.w / 2 + PUCK && Math.abs(p.Y - o.Y) < o.h / 2 + PUCK) {
        p.hitSet.push(o); knock(o, p);
        if (o.k !== 'can') { p.done = true; p.out = 'thud'; p.t2 = 0; return; }   // solid stuff stops the puck; cans don't
      }
    }
  }
  function knock(o, p, chain) {
    if (o.k === 'cooler' && o.hp > 1 && !chain) { o.hp--; o.hitT = 0.25; IL.Audio.thunk(); say('CRACK — ONE MORE', 'soft'); S.stop = 0.05; IL.Audio.haptic(20); return; }
    o.dead = true; S.hits++; S.shotKnocks = (S.shotKnocks || 0) + 1;
    const base = { can: 100, cooler: 250, cone: 150, tray: 250 }[o.k], n = S.shotKnocks, pts = chain ? 60 : base + (n - 1) * 50;
    S.score += pts;
    o.vx = (o.X - (p ? p.X : o.X)) * 3 + (Math.random() - 0.5) * 0.6; o.vy = 1.2 + Math.random(); o.vz = 1.2;
    const c = P(o.X, o.Y, o.Z); for (let i = 0; i < 6; i++) { const a = Math.random() * 6.28, s2 = 50 + Math.random() * 70; S.parts.push({ x: c.x, y: c.y, vx: Math.cos(a) * s2, vy: Math.sin(a) * s2 - 50, life: 0.4, col: o.k === 'can' ? '#c9d1db' : o.k === 'tray' ? '#f5c542' : o.k === 'cone' ? '#ff7a1a' : '#2a6fdb' }); }
    if (o.k === 'can') IL.Audio.tink(); else IL.Audio.thunk();
    if (!chain) {
      S.stop = n >= 3 ? 0.12 : 0.06; IL.Audio.combo(n + 1); IL.Audio.haptic(n >= 3 ? [15, 25, 30] : 16);
      say(n >= 3 ? n + ' IN ONE  +' + pts : (o.k === 'tray' ? 'NACHOS  +' : o.k === 'cone' ? "REF'S CONE  +" : o.k === 'cooler' ? 'COOLER  +' : '+') + pts, n >= 3 ? 'gold' : '');
    }
    // stacking: cans resting on this one fall; crossbar neighbours may wobble off
    setTimeout(() => { if (!S || !S.objs) return; S.objs.forEach(q => { if (q.dead || q.k !== 'can' || q.Z !== o.Z) return;
      const above = !o.bar && q.Y > o.Y + 0.05 && Math.abs(q.X - o.X) < 0.075, nb = o.bar && q.bar && Math.abs(q.X - o.X) < 0.36 && Math.random() < 0.35;
      if (above || nb) knock(q, null, true); }); hud(); }, 70);
    hud();
  }
  function pintCheck() {
    const left = S.objs.filter(o => !o.dead).length;
    if (!left) return endPint(true);
    if (S.pucks <= 0) return endPint(false);
    hud();
  }
  function endPint(cleared) {
    if (!S || S.ended) return; S.ended = true; S.cleared = !!cleared;
    const ps = pintSave(), L = S.level;
    S.stars = !cleared ? 0 : S.pucks >= L.star3 ? 3 : S.pucks >= 1 ? 2 : 1;
    const bonus = cleared ? S.pucks * 300 : 0; S.score += bonus;
    const prev = ps.stars[S.li] || 0, first = cleared && !prev;
    if (cleared) { ps.stars[S.li] = Math.max(prev, S.stars); ps.unlocked = Math.max(ps.unlocked, S.li + 2); }
    const coins = cleared ? 10 + S.stars * 10 + (first ? 20 : 0) : 2; IL.save.coins += coins; IL.persist();
    if (cleared && S.stars === 3) { S.celly = 1.1; setTimeout(() => S && IL.Audio.bump(), 380); }
    setTimeout(() => {
      if (!S) return;
      $('se-mode').textContent = 'PINT ' + (S.li + 1) + (cleared ? ' · CLEARED' : ' · OUT OF PUCKS');
      $('se-stars').innerHTML = [0, 1, 2].map(i => '<i class="' + (i < S.stars ? 'on' : '') + '">★</i>').join('');
      $('se-score').textContent = S.score.toLocaleString(); $('se-pb').classList.toggle('hidden', !(cleared && S.stars > prev));
      $('se-pb').textContent = first ? 'NEW PINT UNLOCKED' : 'MORE STARS';
      $('se-stats').textContent = cleared ? (S.pucks ? S.pucks + ' spare puck' + (S.pucks > 1 ? 's' : '') + ' +' + bonus : 'Cleared on the last puck!') + (S.stars < 3 ? ' · ★★★ needs ' + L.star3 + ' spare' : '') : 'So close. ' + S.objs.filter(o => !o.dead).length + ' left standing.';
      $('se-coins').textContent = '+' + coins + ' 🪙';
      $('se-retry').textContent = cleared ? (S.li < PINTS - 1 ? 'NEXT PINT ▶' : 'LAST CALL — ALL DONE 🏆') : 'ONE MORE TRY ↻';
      $('se-levels').classList.remove('hidden'); $('se-levels').textContent = 'Pints';
      $('s-end').classList.remove('hidden'); if (cleared) { IL.Audio.win(); if (S.stars === 3) IL.Meta.horn(); } else IL.Audio.grade('C');
      setTimeout(() => { try { $('se-retry').focus({ preventScroll: true }); } catch (e) {} }, 200);
      IL.UI.shareText = shareText(); if (S.stars === 3) maybeA2HS();
    }, cleared ? 650 : 250);
  }
  function again() { if (!S) return start('endless'); if (S.mode === 'pints') start('pints', S.li); else start(S.mode); }
  function labels(mid) { const l = document.querySelectorAll('#shud .sstat small'); if (l[1]) l[1].textContent = mid; }
  function drawObj(g, o) {
    const c = P(o.X, o.Y, o.Z), k = c.k, w = o.w * k, h = o.h * k;
    if (o.dead && o.dt > 0.6) return;
    g.save(); g.globalAlpha = o.dead ? Math.max(0, 1 - o.dt / 0.6) : 1; g.translate(c.x, c.y); if (o.dead) g.rotate(o.dt * (o.vx > 0 ? 6 : -6));
    if (o.hitT) g.translate((Math.random() - 0.5) * 3, 0);
    if (o.k === 'can') {
      const gr = g.createLinearGradient(-w / 2, 0, w / 2, 0);
      if (o.alt) { gr.addColorStop(0, '#9a1b28'); gr.addColorStop(0.45, '#e84855'); gr.addColorStop(1, '#9a1b28'); } else { gr.addColorStop(0, '#8d97a6'); gr.addColorStop(0.45, '#f4f6f9'); gr.addColorStop(1, '#7c8696'); }
      g.fillStyle = gr; g.fillRect(-w / 2, -h / 2, w, h);
      g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(-w / 2, -h * 0.08, w, h * 0.16);
      g.fillStyle = '#b8c0cc'; g.beginPath(); g.ellipse(0, -h / 2, w / 2, w * 0.18, 0, 0, 7); g.fill();
    } else if (o.k === 'cooler') {
      g.fillStyle = '#2a6fdb'; IL.R.rr(g, -w / 2, -h / 2, w, h, 4); g.fill();
      g.fillStyle = '#f4f7fb'; IL.R.rr(g, -w / 2, -h / 2, w, h * 0.28, 4); g.fill();
      g.fillStyle = '#1b4f9c'; g.fillRect(-w * 0.15, h * 0.05, w * 0.3, h * 0.08);
      if (o.hp < 2) { g.strokeStyle = '#0b2e45'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-w * 0.3, -h * 0.05); g.lineTo(-w * 0.05, h * 0.25); g.lineTo(w * 0.15, h * 0.02); g.stroke(); }
    } else if (o.k === 'cone') {
      g.fillStyle = '#ff7a1a'; g.beginPath(); g.moveTo(-w * 0.12, -h / 2); g.lineTo(w * 0.12, -h / 2); g.lineTo(w * 0.42, h * 0.42); g.lineTo(-w * 0.42, h * 0.42); g.closePath(); g.fill();
      g.fillStyle = '#fff'; g.fillRect(-w * 0.27, -h * 0.05, w * 0.54, h * 0.13); g.fillStyle = '#e8650f'; g.fillRect(-w / 2, h * 0.38, w, h * 0.12);
    } else if (o.k === 'tray') {
      g.fillStyle = '#20242c'; g.fillRect(-w / 2, h * 0.1, w, h * 0.4);
      g.fillStyle = '#f5c542'; for (let i = 0; i < 6; i++) { const x = -w / 2 + w * (i + 0.5) / 6; g.beginPath(); g.moveTo(x - w * 0.07, h * 0.15); g.lineTo(x + w * 0.07, h * 0.15); g.lineTo(x, -h * 0.5); g.closePath(); g.fill(); }
      g.fillStyle = '#ffae00'; g.beginPath(); g.ellipse(0, h * 0.05, w * 0.22, h * 0.2, 0, 0, 7); g.fill();
    }
    g.restore();
  }
  /* ---------- level path ---------- */
  function openPints() {
    const ps = pintSave(); $('s-end').classList.add('hidden'); if (S) stop(true); IL.UI.show('pints-path');
    const st = Object.values(ps.stars).reduce((a, b) => a + b, 0), n = nextPint();
    $('pl-coins').textContent = '🪙 ' + IL.save.coins.toLocaleString(); $('pl-stars').textContent = '★ ' + st + ' / ' + PINTS * 3;
    $('pl-go').textContent = '▶ PINT ' + (n + 1) + ' · ' + buildPint(n).name;
    const path = $('pl-path'); path.innerHTML = '';
    for (let i = 0; i < PINTS; i++) {
      const b = document.createElement('button'), open = i < ps.unlocked, s3 = ps.stars[i] || 0;
      b.className = 'pnode' + (open ? '' : ' locked') + (i === n ? ' cur' : '') + (i % 2 ? ' r' : '');
      b.innerHTML = '<b>' + (open ? i + 1 : '🔒') + '</b><small>' + (open ? '★'.repeat(s3) + '<span>' + '★'.repeat(3 - s3) + '</span>' : '') + '</small>';
      if (open) b.onclick = () => { IL.Audio.click(); start('pints', i); };
      path.appendChild(b);
    }
    setTimeout(() => { const c = path.querySelector('.cur'); if (c && c.scrollIntoView) c.scrollIntoView({ block: 'center' }); }, 30);
  }
  function openSkins() { IL.Meta.openShop('pints-path'); }
  /* ---------- share card with a small watermark ---------- */
  function shareCard() {
    const c = document.createElement('canvas'), Wc = 1080, Hc = 1350; c.width = Wc; c.height = Hc; const g = c.getContext('2d');
    g.fillStyle = '#0d1b33'; g.fillRect(0, 0, Wc, Hc);
    try { const sw = cv.width, sh = Math.min(cv.height, sw * 1.05); g.drawImage(cv, 0, cv.height * 0.18, sw, sh, 0, 120, Wc, Wc * sh / sw); } catch (e) {}
    g.fillStyle = 'rgba(13,27,51,.92)'; g.fillRect(0, Hc - 330, Wc, 330);
    g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = '900 130px system-ui,sans-serif'; g.fillText(S ? S.score.toLocaleString() : '0', Wc / 2, Hc - 170);
    g.fillStyle = '#9fb0c8'; g.font = '700 42px system-ui,sans-serif';
    g.fillText(S ? (S.mode === 'pints' ? 'Beer League · Pint ' + (S.li + 1) + '  ' + '★'.repeat(S.stars) + '☆'.repeat(3 - S.stars) : (S.mode === 'weekly' ? 'Weekly #' + S.n : S.mode === 'daily' ? 'Daily #' + S.n : 'Streak ' + S.bestStreak)) : '', Wc / 2, Hc - 100);
    g.textAlign = 'right'; g.fillStyle = '#e63946'; g.font = '900 40px system-ui,sans-serif'; g.fillText(IL.GAME_TITLE, Wc - 36, Hc - 30);   // watermark
    return c;
  }
  /* ---------- add to home screen, after a good game ---------- */
  function maybeA2HS() {
    const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (a2Shown || standalone || (!deferredInstall && !ios)) return; a2Shown = true;
    $('a2-txt').textContent = deferredInstall ? 'Play offline: add Celly Belly to your home screen' : 'Play offline: tap Share → Add to Home Screen';
    $('a2-add').classList.toggle('hidden', !deferredInstall); $('a2hs').classList.remove('hidden');
  }
  async function installApp() { if (!deferredInstall) return; const e = deferredInstall; deferredInstall = null; $('a2hs').classList.add('hidden'); try { e.prompt(); await e.userChoice; } catch (er) {} }

  /* ---------- HUD + single callout ---------- */
  function hud() {
    if (!S) return;
    $('s-score').textContent = S.score.toLocaleString(); $('s-streak').textContent = S.streak;
    const mx = S.mode === 'pints' ? S.maxPucks : 3;
    $('s-pucks').textContent = '●'.repeat(Math.max(0, S.pucks)) + '○'.repeat(Math.max(0, mx - S.pucks));
    if (S.mode === 'pints') { $('s-streak').textContent = S.li + 1; $('s-streak').parentNode.classList.remove('hot'); return; }
    $('s-streak').parentNode.classList.toggle('hot', S.streak >= 3);
  }
  function say(txt, cls) { const el = $('s-call'); el.textContent = txt; el.className = 'show ' + (cls || ''); void el.offsetWidth; clearTimeout(callT); callT = setTimeout(() => el.className = '', 1100); }

  /* ---------- end ---------- */
  function end() {
    if (!S || S.ended) return; S.ended = true;
    if (S.mode === 'pints') return endPint();
    const s = sv(); s.runs++;
    let pb = false;
    if (S.mode === 'weekly') { pb = S.score > IL.Meta.weeklyBest(); S.rank = IL.Meta.submitWeekly(S.score, { streak: S.bestStreak, bars: S.bars }); }
    else if (S.mode === 'daily') { const k = IL.todayKey(); pb = S.score > (s.daily[k] || 0); if (pb) s.daily[k] = S.score; }
    else { pb = S.score > s.best && S.score > 0; if (pb) s.best = S.score; }
    s.bestStreak = Math.max(s.bestStreak, S.bestStreak);
    const coins = Math.floor(S.score / 50); IL.save.coins += coins; IL.persist();
    $('se-mode').textContent = S.mode === 'weekly' ? 'WEEKLY #' + S.n : S.mode === 'daily' ? 'DAILY #' + S.n : 'RUN OVER';
    $('se-score').textContent = S.score.toLocaleString(); $('se-pb').classList.toggle('hidden', !pb);
    $('se-stats').textContent = 'Best streak ' + S.bestStreak + ' · ' + S.hits + ' targets · ' + S.bars + ' bar down' + (S.mode === 'weekly' ? ' · #' + S.rank + ' of your runs this week' : S.mode === 'daily' ? '' : ' · Best ' + s.best.toLocaleString());
    $('se-coins').textContent = coins ? '+' + coins + ' 🪙' : '';
    $('s-end').classList.remove('hidden'); if (pb) IL.Audio.win(); else IL.Audio.grade('B');
    $('se-retry').textContent = 'PLAY AGAIN'; $('se-stars').textContent = ''; $('se-levels').classList.toggle('hidden', S.mode !== 'weekly'); $('se-levels').textContent = 'Leaderboard';
    setTimeout(() => { try { $('se-retry').focus({ preventScroll: true }); } catch (e) {} }, 200);
    IL.UI.shareText = shareText(); if (pb && S.score >= 500) maybeA2HS();
  }
  function shareText() { if (S.mode === 'pints') return IL.GAME_TITLE + ' Beer League · Pint ' + (S.li + 1) + ': ' + '★'.repeat(S.stars) + '☆'.repeat(3 - S.stars) + ' ' + S.score.toLocaleString() + ' pts 🍺🏒';
    return IL.GAME_TITLE + (S.mode === 'weekly' ? ' Weekly #' + S.n : S.mode === 'daily' ? ' Daily #' + S.n : '') + ': ' + S.score.toLocaleString() + ' pts · streak ' + S.bestStreak + (S.bars ? ' · ' + S.bars + '× BAR DOWN' : '') + ' 🏒'; }
  async function share() {
    const t = shareText(); IL.UI.shareText = t;
    try {
      const blob = await new Promise(r => shareCard().toBlob(r, 'image/png')), file = blob && new File([blob], 'celly-belly.png', { type: 'image/png' });
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: t, title: IL.GAME_TITLE }); return; }
      if (navigator.share) { await navigator.share({ text: t, title: IL.GAME_TITLE }); return; }
    } catch (e) { return; }
    try { await navigator.clipboard.writeText(t); IL.UI.toast('Score copied'); } catch (e) { IL.UI.toast(t); }
  }

  /* ---------- home ---------- */
  function renderHome() {
    const s = sv(), dk = s.daily[IL.todayKey()];
    $('nh-best').textContent = s.best ? 'Best ' + s.best.toLocaleString() + ' · Streak ' + s.bestStreak : 'Flick. Bar down. Celly.';
    $('btn-sdaily').textContent = '📅 Daily #' + IL.dailyNumber() + (dk ? ' · ' + dk.toLocaleString() : '');
    $('home-coins').textContent = '🪙 ' + IL.save.coins.toLocaleString();
    const ps = pintSave(), st = Object.values(ps.stars).reduce((a, b) => a + b, 0); $('pints-sub').textContent = 'Pint ' + (nextPint() + 1) + ' · ★ ' + st + ' / ' + PINTS * 3;
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
    $('btn-weekly').onclick = () => { IL.Audio.click(); IL.Meta.openWeekly(); };
    $('btn-shop').onclick = () => { IL.Audio.click(); IL.Meta.openShop('home'); };
    $('btn-pints').onclick = () => { IL.Audio.click(); openPints(); };
    $('pl-back').onclick = () => { IL.Audio.click(); IL.UI.show('home'); };
    $('pl-go').onclick = () => { IL.Audio.click(); start('pints', nextPint()); };
    $('pl-skins').onclick = () => { IL.Audio.click(); IL.Meta.openShop('pints-path'); };
    $('a2-x').onclick = () => $('a2hs').classList.add('hidden');
    $('a2-add').onclick = installApp;
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });
    $('btn-more').onclick = () => { IL.Audio.click(); const m = $('more-panel'); m.classList.toggle('hidden'); $('btn-more').textContent = m.classList.contains('hidden') ? 'More' : 'Less'; };
    renderHome();
  }
  /* test hooks */
  function debug() { if (!S) return null; const t = S.target, c = t && UV(t.u, t.v), launch = P(0, 0, PZ);
    return { mode: S.mode, score: S.score, streak: S.streak, pucks: S.pucks, shots: S.shots, hits: S.hits, bars: S.bars, ended: S.ended, flying: !!S.puck, celly: S.celly, goalie: !!S.goalie,
      target: t && { u: t.u, v: t.v, r: t.r, name: t.name, x: c.x, y: c.y }, launch, out: S.lastOut,
      li: S.li, stars: S.stars, wob: S.wob || 0, cleared: !!S.cleared, objs: S.objs ? S.objs.filter(o => !o.dead).map((o, i) => ({ k: o.k, i: S.objs.indexOf(o) })) : null }; }
  function _fire(u, v, curve) { fire({ u, v, curve: curve || 0, power: 1 }); }
  // inverse of aimFrom for a given flick duration: returns a screen swipe vector that lands on (u, v)
  function swipeFor(u, v, ms) { const speed0 = 1; let len = 150; for (let i = 0; i < 30; i++) { const power = clamp(0.6 + (len / ms) * 0.3, 0.65, 1.2); len = (v + 0.06) / (1.4 * (0.92 + 0.08 * power)) * Math.min(W, 420); }
    const dy = -len / Math.sqrt(1 + (u / 1.9) ** 2), dx = u / 1.9 * -dy; return { dx, dy }; }
  return { skin, skinSave, init, start, stop, debug, renderHome, _fire, swipeFor, aimAt, openPints, openSkins, shareCard, PINTS, SKINS, buildPint, _fireAt: (i) => { const a = aimAt(i); if (a) fire({ u: a.u, v: a.v, curve: 0, power: 1 }); }, _noWob: () => { if (S) S.wob = 0; }, _end: () => { if (S) { S.pucks = 0; end(); } }, get active() { return !!S; } };
})();
