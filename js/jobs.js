/* ICELOCK — rink-manager prep jobs: clear skaters, fix the ice, paint the ice, and the event moment */
window.IL = window.IL || {};
IL.Jobs = (function () {
  const R = IL.R, RW = R.RW, RH = R.RH, RES = R.RES, BT = R.BT, HUD_TOP = 112, HUD_BOT = 16;
  const DOOR = { x: RW - 6, y: RH / 2 };
  let canvas, ctx, W, H, dpr, L, bgC, J = null, raf = 0, last = 0, pointer = null;
  const $ = (id) => document.getElementById(id);
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  function init() {
    canvas = $('game-canvas'); ctx = canvas.getContext('2d');
    canvas.addEventListener('pointerdown', (e) => { if (!J || paused()) return; IL.Audio.resume(); pointer = { x: e.clientX, y: e.clientY, px: e.clientX, py: e.clientY, id: e.pointerId, down: true }; onTap(toWorld(e.clientX, e.clientY)); e.preventDefault(); });
    canvas.addEventListener('pointermove', (e) => { if (!J) return; if (pointer && pointer.id === e.pointerId) { pointer.x = e.clientX; pointer.y = e.clientY; } });
    const up = (e) => { if (pointer && pointer.id === e.pointerId) pointer = null; };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    window.addEventListener('resize', () => { if (J) layout(); });
  }
  const paused = () => !$('pause').classList.contains('hidden');
  function toWorld(x, y) { return { x: (x - L.ox) / L.s, y: (y - L.oy) / L.s }; }
  function toScreen(x, y) { return { x: L.ox + x * L.s, y: L.oy + y * L.s }; }

  function layout() {
    W = innerWidth; H = innerHeight; dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    const aw = W - 16, ah = H - HUD_TOP - HUD_BOT, s = Math.min(aw / (RW + BT * 2 + 8), ah / (RH + BT * 2 + 8));
    L = { s, ox: (W - RW * s) / 2, oy: HUD_TOP + (ah - RH * s) / 2 };
    bgC = document.createElement('canvas'); bgC.width = canvas.width; bgC.height = canvas.height;
    const b = bgC.getContext('2d'); b.scale(dpr, dpr); R.drawBackdrop(b, W, H, L, J.venue, J.design, IL.save.rink);
  }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  /* ---------- shared FX ---------- */
  function callout(text, cls, wx, wy) {
    const el = document.createElement('div'); el.className = 'callout ' + (cls || ''); el.textContent = text;
    if (wx != null) { const p = toScreen(wx, wy); el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; el.classList.add('float'); }
    $('callouts').appendChild(el); setTimeout(() => el.remove(), 1400);
  }
  function spawn(x, y, vx, vy, life, col, size, type, g) { J.parts.push({ x, y, vx, vy, life, max: life, col, size, type: type || 'dot', g: g || 0, rot: Math.random() * 6 }); }
  function sparkle(x, y, col, n) { for (let i = 0; i < (n || 14); i++) { const a = Math.random() * 6.28, sp = 40 + Math.random() * 120; spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.7, col || '#ffd93d', 3 + Math.random() * 3, 'star'); } }
  function confetti(n) { const cols = ['#ffd93d', '#ff6b6b', '#4d96ff', '#6bcb77', '#c77dff', '#fff']; for (let i = 0; i < n; i++) spawn(Math.random() * RW, -20 + Math.random() * 120, (Math.random() - 0.5) * 200, -40 - Math.random() * 160, 2.4, pick(cols), 5, 'conf', 150); }
  function setHud(title, hint, prog, count) {
    $('job-title').textContent = title; $('job-hint').textContent = hint;
    $('job-fill').style.width = (clamp(prog, 0, 1) * 100).toFixed(1) + '%'; $('job-count').textContent = count;
  }

  /* ---------- run a job ---------- */
  function run(type, vi, ei, info, done) {
    const venue = IL.VENUES[vi], ev = IL.activeEvent || venue.events[ei];
    J = { type, vi, ei, venue, ev, info: info || {}, done, t: 0, parts: [], ripples: [], finished: false,
      design: ev.design || (type === 'paint' ? IL.getDesign(vi) : IL.getPaintedDesign(vi)) };
    pointer = null;
    $('hud').classList.add('hidden'); $('jobhud').classList.remove('hidden'); $('btn-finish').classList.add('hidden');
    layout();
    // ice layers
    J.designC = mk(RW * RES, RH * RES); const g = J.designC.getContext('2d'); g.scale(RES, RES); R.drawDesign(g, J.design);
    if (type === 'clear' || type === 'fix') {
      J.dirtC = mk(RW * RES, RH * RES); const d = J.dirtC.getContext('2d'); d.scale(RES, RES); R.drawDirt(d, venue, vi * 31 + ei * 7 + 3);
    }
    ({ clear: setupClear, fix: setupFix, paint: setupPaint, event: setupEvent })[type]();
    cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function stop() { cancelAnimationFrame(raf); J = null; pointer = null; $('jobhud').classList.add('hidden'); }
  function complete(res) {
    if (J.finished) return; J.finished = true;
    const cb = J.done; J.endT = J.t;
    setTimeout(() => { if (J && J.finished && J.done === cb) { stop(); cb(res); } }, J.type === 'event' ? 50 : 900);
  }
  function frame(now) {
    if (!J) return;
    const dt = Math.min(0.034, (now - last) / 1000); last = now;
    if (!paused()) {
      J.t += dt;
      if (pointer) { J.pdx = pointer.x - pointer.px; J.pdy = pointer.y - pointer.py; pointer.px = pointer.x; pointer.py = pointer.y; }
      J.update(dt);
      for (let i = J.parts.length - 1; i >= 0; i--) { const q = J.parts[i]; q.life -= dt; if (q.life <= 0) { J.parts.splice(i, 1); continue; } q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.97; q.rot += dt * 5; }
      for (let i = J.ripples.length - 1; i >= 0; i--) { J.ripples[i].t += dt; if (J.ripples[i].t > 0.6) J.ripples.splice(i, 1); }
    }
    render(dt);
    raf = requestAnimationFrame(frame);
  }
  function onTap(w) { if (J && J.tap && !J.finished) J.tap(w); }

  /* ---------- CLEAR SKATERS ---------- */
  function setupClear() {
    const ev = J.ev, kind = ev.skaterKind, n = ev.skaters;
    J.skaters = [];
    for (let i = 0; i < n; i++) {
      let x, y; do { x = 30 + Math.random() * (RW - 60); y = 40 + Math.random() * (RH - 80); } while (!R.inside(x, y, 34));
      const lk = IL.B.look(i * 13 + J.vi * 7 + J.ei, kind);
      if (kind === 'player') { lk.body = i % 2 ? J.design.logoColor : '#ffd6a5'; if (lk.body === '#ffffff') lk.body = '#a0c4ff'; lk.hatCol = i % 2 ? J.design.accent : '#3d405b'; }
      const a = Math.random() * 6.28, sp = kind === 'kid' ? 22 : 38;
      J.skaters.push(Object.assign(lk, { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: kind === 'kid' ? 15 : 18, state: 'skate', emote: null, emoteT: 0, walk: 0.5, sp }));
    }
    if (kind !== 'kid' && n >= 4) { // Gary: dad-bod beer leaguer who refuses to leave
      const g0 = J.skaters[0]; Object.assign(g0, { stubborn: 3, dad: true, beard: true, hat: 'backcap', hatCol: '#ffb547', body: '#c08552', jersey: '#3d5a80', num: 69 - 50, r: 20, name: 'GARY' });
    }
    J.total = n; J.gone = 0; J.beaT = 1.2; J.spawn = J.skaters.map(q => Math.round(q.x) + ',' + Math.round(q.y)).join(' ');
    if (IL.hasStaff('bea')) J.bea = Object.assign(IL.B.look(901, 'coach'), IL.STAFF[0].look, { jersey: null });
    J.update = updateClear; J.tap = tapClear; J.draw = drawClear;
    setHud('🙋 Clear skaters', IL.JOBS.clear.hint, 0, '0/' + n);
    callout(kind === 'kid' ? 'Lesson\'s over, kiddos!' : 'Beer league\'s over, boys!', 'mid');
  }
  const GARY = ['GARY: "Five more minutes!"', 'GARY: "I PAID for this ice time!"', 'GARY: "Fine. But I\'m doing a hockey stop."'];
  function sendOff(s, manual) {
    if (s.state !== 'skate') return false;
    if (s.stubborn && !manual) return false;
    if (s.stubborn) { s.stubborn--; callout(GARY[2 - s.stubborn], 'mid chirp', s.x, s.y - 34); s.emote = s.stubborn ? 'angry' : 'sweat'; s.emoteT = 0; s.mood = s.stubborn ? 'angry' : 'meh'; s.tilt = 0.4; setTimeout(() => s.tilt = 0, 300); IL.Audio.laugh(); if (s.stubborn) return true; IL.Audio.cheer(false); }
    s.state = 'leave'; s.emote = Math.random() < 0.5 ? 'bang' : 'wave'; s.emoteT = 0; s.walk = 1;
    return true;
  }
  function tapClear(w) {
    let hit = J.skaters.filter(s => s.state === 'skate' && Math.hypot(s.x - w.x, s.y - w.y) < 72);
    if (!hit.length) {
      let best = null, bd = 140;
      J.skaters.forEach(s => { const d = Math.hypot(s.x - w.x, s.y - w.y); if (s.state === 'skate' && d < bd) { bd = d; best = s; } });
      if (best) hit = [best];
    }
    J.ripples.push({ x: w.x, y: w.y, t: 0 });
    if (hit.length) { hit.forEach(q => sendOff(q, true)); IL.Audio.whistle(); IL.Audio.haptic(12); if (hit.length >= 3) callout('TWEEEET! x' + hit.length, 'mid'); else if (Math.random() < 0.45) callout('"' + pick(IL.SKATER_LINES) + '"', 'small chirp', hit[0].x, hit[0].y - 30); }
    else IL.Audio.click();
  }
  function updateClear(dt) {
    if (J.bea && !J.finished) { J.beaT -= dt; if (J.beaT <= 0) { J.beaT = 1.0; const s = J.skaters.find(q => q.state === 'skate' && !q.stubborn); if (s && sendOff(s)) { IL.Audio.whistle(); callout('Bea: off you go!', 'small', s.x, s.y - 24); } } }
    J.skaters.forEach(s => {
      s.t = J.t; if (s.emote) { s.emoteT += dt; if (s.emoteT > 1.6) s.emote = null; }
      if (s.state === 'skate') {
        const a = Math.atan2(s.vy, s.vx) + (Math.random() - 0.5) * 2.4 * dt;
        s.vx = Math.cos(a) * s.sp; s.vy = Math.sin(a) * s.sp;
        if (!R.inside(s.x + s.vx * 0.5, s.y + s.vy * 0.5, s.r + 8)) { const b = Math.atan2(RH / 2 - s.y, RW / 2 - s.x); s.vx = Math.cos(b) * s.sp; s.vy = Math.sin(b) * s.sp; }
        s.x += s.vx * dt; s.y += s.vy * dt; s.lookX = Math.sign(s.vx);
        if (Math.random() < dt * 0.15 && !s.emote) { s.emote = pick(['note', 'heart', 'q']); s.emoteT = 0; }
      } else if (s.state === 'leave') {
        const dx = DOOR.x - s.x, dy = DOOR.y - s.y, d = Math.hypot(dx, dy);
        const sp = 125 + (s.r < 13 ? -20 : 0);
        if (d < 12) { s.state = 'gone'; J.gone++; IL.Audio.pop(J.gone); sparkle(DOOR.x, DOOR.y, '#9bf6ff', 6); callout('+1', 'small', DOOR.x - 20, DOOR.y - 20); }
        else { s.x += dx / d * sp * dt; s.y += dy / d * sp * dt; s.lookX = dx / d; s.lookY = dy / d; }
      }
    });
    setHud('🙋 Clear skaters', J.bea ? 'Bea is helping! Tap skaters to whistle them off' : IL.JOBS.clear.hint, J.gone / J.total, J.gone + '/' + J.total);
    if (J.gone >= J.total && !J.finished) { callout('✨ ICE CLEAR!', 'big'); IL.Audio.cheer(false); complete({ time: J.t, n: J.total }); }
  }
  function drawClear() {
    // exit door glow
    const p = 0.5 + 0.5 * Math.sin(J.t * 5);
    ctx.fillStyle = 'rgba(107,203,119,' + (0.2 + p * 0.25) + ')'; ctx.beginPath(); ctx.arc(DOOR.x + 6, DOOR.y, 40, Math.PI / 2, Math.PI * 1.5); ctx.fill();
    ctx.fillStyle = '#6bcb77'; R.rr(ctx, RW - 2, DOOR.y - 26, BT + 4, 52, 5); ctx.fill();
    ctx.save(); ctx.translate(RW + BT / 2, DOOR.y); ctx.rotate(Math.PI / 2); ctx.fillStyle = '#fff'; ctx.font = '900 9px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('EXIT ➜', 0, 0); ctx.restore();
    J.ripples.forEach(r => { ctx.strokeStyle = 'rgba(255,217,61,' + (1 - r.t / 0.6) + ')'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(r.x, r.y, 20 + r.t * 110, 0, 7); ctx.stroke(); });
    J.skaters.filter(s => s.state !== 'gone').sort((a, b) => a.y - b.y).forEach(s => { IL.B.draw(ctx, s.x, s.y, s.r, s); if (s.name) { ctx.fillStyle = 'rgba(12,15,22,.8)'; R.rr(ctx, s.x - 18, s.y + s.r + 4, 36, 12, 6); ctx.fill(); ctx.fillStyle = '#ffb547'; ctx.font = '900 8px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.name + (s.stubborn ? ' ×' + s.stubborn : ''), s.x, s.y + s.r + 10); } });
    if (J.bea) IL.B.draw(ctx, RW + BT + 8, DOOR.y - 44, 11, Object.assign(J.bea, { t: J.t, emote: J.beaT < 0.3 ? 'note' : null, emoteT: 0.5 }));
    if (J.t < 2.5 && J.gone === 0) hintFinger(J.skaters[0].x, J.skaters[0].y, true);
  }

  /* ---------- FIX THE ICE ---------- */
  function setupFix() {
    const n = J.ev.damage, types = ['hole', 'rut', 'chip'];
    J.spots = [];
    for (let i = 0; i < n; i++) {
      let x, y, ok, tries = 0;
      do { x = 50 + Math.random() * (RW - 100); y = 70 + Math.random() * (RH - 140); ok = R.inside(x, y, 40) && J.spots.every(s => Math.hypot(s.x - x, s.y - y) > 85); tries++; } while (!ok && tries < 60);
      J.spots.push({ x, y, type: types[i % 3], r: 24, prog: 0, rot: Math.random() * 3, done: false, seed: i * 17 + 5 });
    }
    J.fixed = 0;
    if (IL.hasStaff('gus')) {
      J.gus = Object.assign(IL.B.look(77, 'coach'), IL.STAFF[1].look, { jersey: null });
      J.spots.slice(0, 2).forEach(s => { s.prog = 1; s.done = true; s.byGus = true; J.fixed++; });
      callout('Gus patched ' + Math.min(2, n) + ' spots for you!', 'mid');
    }
    J.update = updateFix; J.tap = tapFix; J.draw = drawFix;
    setHud('🔧 Fix the ice', IL.JOBS.fix.hint, J.fixed / n, J.fixed + '/' + n);
  }
  function tapFix(w) {
    const s = J.spots.find(q => !q.done && Math.hypot(q.x - w.x, q.y - w.y) < q.r + 22);
    if (s) { s.prog += 0.22; IL.Audio.scrape(); }
  }
  function updateFix(dt) {
    if (pointer && !J.finished) {
      const w = toWorld(pointer.x, pointer.y), mv = Math.hypot(J.pdx || 0, J.pdy || 0);
      J.spots.forEach(s => {
        if (s.done || Math.hypot(s.x - w.x, s.y - w.y) > s.r + 22) return;
        s.prog += dt * (mv > 1 ? 1.7 : 0.8);
        if (Math.random() < 0.6) spawn(w.x + (Math.random() - 0.5) * 16, w.y + 10, (Math.random() - 0.5) * 40, 30 + Math.random() * 30, 0.5, s.type === 'hole' ? '#7ec8ff' : '#ffffff', 2.5);
        if (mv > 1 && Math.random() < 0.15) IL.Audio.scrape();
      });
    }
    J.spots.forEach(s => {
      if (!s.done && s.prog >= 1) {
        s.done = true; s.prog = 1; s.doneT = J.t; J.fixed++; IL.Audio.pickup(); sparkle(s.x, s.y, '#9bf6ff');
        callout(s.type === 'hole' ? 'HOLE FILLED!' : s.type === 'rut' ? 'RUT SMOOTHED!' : 'CHIP PATCHED!', 'small', s.x, s.y - 20);
      }
    });
    const n = J.spots.length;
    setHud('🔧 Fix the ice', IL.JOBS.fix.hint, J.spots.reduce((a, s) => a + Math.min(1, s.prog), 0) / n, J.fixed + '/' + n);
    if (J.fixed >= n && !J.finished) { callout('🧊 ICE PATCHED!', 'big'); IL.Audio.cheer(false); complete({ time: J.t, n }); }
  }
  function drawSpot(s) {
    const a = 1 - s.prog;
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
    if (a > 0.01) {
      ctx.globalAlpha = a;
      if (s.type === 'hole') {
        ctx.fillStyle = '#5a6b85'; ctx.beginPath(); ctx.ellipse(0, 0, 15, 11, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#34405a'; ctx.beginPath(); ctx.ellipse(1, 1, 9, 6, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = '#6b7c96'; ctx.lineWidth = 1.4;
        for (let i = 0; i < 6; i++) { const b = i; ctx.beginPath(); ctx.moveTo(Math.cos(b) * 14, Math.sin(b) * 10); ctx.lineTo(Math.cos(b + 0.2) * 24, Math.sin(b + 0.2) * 19); ctx.stroke(); }
      } else if (s.type === 'rut') {
        ctx.strokeStyle = '#6b7c96'; ctx.lineCap = 'round'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-24, -4); ctx.quadraticCurveTo(0, 6, 24, -2); ctx.stroke();
        ctx.strokeStyle = '#3e4a63'; ctx.lineWidth = 3; ctx.stroke();
      } else {
        ctx.fillStyle = '#ffffff'; R.starPath(ctx, 0, 0, 16, 7, 0.45); ctx.fill();
        ctx.strokeStyle = '#8796ad'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#c3cede'; R.starPath(ctx, 2, 2, 7, 5, 0.5); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (!s.done) {
      const p = 0.5 + 0.5 * Math.sin(J.t * 6 + s.seed);
      ctx.strokeStyle = 'rgba(255,107,107,' + (0.45 + p * 0.4) + ')'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 6 + p * 3, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      if (s.prog > 0) { ctx.strokeStyle = '#ffd93d'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 6, -Math.PI / 2, -Math.PI / 2 + s.prog * 6.283); ctx.stroke(); }
    } else if (J.t - s.doneT < 1.2) {
      const k = (J.t - s.doneT) / 1.2;
      ctx.fillStyle = 'rgba(200,240,255,' + (0.6 * (1 - k)) + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, 18 + k * 20, 0, 7); ctx.fill();
    }
  }
  function drawTool(w, type) {
    ctx.save(); ctx.translate(w.x + 10, w.y - 14); ctx.rotate(Math.sin(J.t * 14) * 0.15);
    if (type === 'hole') { // watering can
      ctx.fillStyle = '#4d96ff'; R.rr(ctx, -12, -8, 22, 18, 5); ctx.fill();
      ctx.fillRect(9, -4, 12, 4); ctx.strokeStyle = '#2f6fd6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-1, -10, 7, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = '#9bf6ff'; ctx.beginPath(); ctx.arc(22, -2, 3, 0, 7); ctx.fill();
    } else { // scraper
      ctx.fillStyle = '#8b5a2b'; ctx.fillRect(-2, -26, 5, 26); ctx.fillStyle = '#c0c7d1'; R.rr(ctx, -14, -2, 30, 9, 3); ctx.fill(); ctx.fillStyle = '#ff6b6b'; ctx.fillRect(-2, -30, 5, 6);
    }
    ctx.restore();
  }
  function drawFix() {
    J.spots.forEach(drawSpot);
    if (J.gus) IL.B.draw(ctx, -BT - 10, RH / 2 + 60, 11, Object.assign(J.gus, { t: J.t }));
    let w = pointer ? toWorld(pointer.x, pointer.y) : null;
    const target = J.spots.find(s => !s.done);
    if (w) { let near = target; J.spots.forEach(s => { if (!s.done && Math.hypot(s.x - w.x, s.y - w.y) < 60) near = s; }); drawTool(w, near ? near.type : 'rut'); }
    else if (target && J.t > 0.5) hintFinger(target.x, target.y, false);
  }

  /* ---------- PAINT THE ICE ---------- */
  function setupPaint() {
    const d = J.design, cx = RW / 2, cy = RH / 2;
    J.blankC = mk(RW * RES, RH * RES);
    const b = J.blankC.getContext('2d'); b.scale(RES, RES);
    R.drawDesign(b, Object.assign({}, d, { red: 'rgba(0,0,0,0)', blue: 'rgba(0,0,0,0)', circle: 'rgba(0,0,0,0)', logo: 'none', rinkName: '', teamName: '' }));
    J.maskC = mk(RW * RES, RH * RES); J.mctx = J.maskC.getContext('2d');
    J.outC = mk(RW * RES, RH * RES); J.octx = J.outC.getContext('2d');
    const line = (y) => { const p = []; for (let x = 8; x <= RW - 8; x += 8) p.push([x, y]); return p; };
    const circ = (r, x0, y0) => { const p = []; for (let i = 0; i < 40; i++) p.push([(x0 || cx) + Math.cos(i / 40 * 6.283 - Math.PI / 2) * r, (y0 || cy) + Math.sin(i / 40 * 6.283 - Math.PI / 2) * r]); return p; };
    J.els = [
      { name: 'CENTER LINE', col: d.red, pts: line(cy), w: 20 },
      { name: 'BLUE LINE', col: d.blue, pts: line(cy - 118), w: 20 },
      { name: 'BLUE LINE', col: d.blue, pts: line(cy + 118), w: 20 },
      { name: 'CENTER CIRCLE', col: d.circle, pts: circ(48), w: 14 },
      { name: 'CENTER LOGO', col: d.logoColor, pts: circ(28), w: 30, fill: 50 }
    ];
    J.els.forEach(e => { e.cov = new Uint8Array(e.pts.length); e.done = false; e.prog = 0; });
    J.brush = IL.hasStaff('pip') ? 30 : 22; J.need = IL.hasStaff('pip') ? 0.7 : 0.85;
    J.update = updatePaint; J.tap = (w) => { J.lastW = w; }; J.draw = drawPaint; J.dirtyMask = true;
    setHud('🖌️ Paint the ice', IL.JOBS.paint.hint, 0, '0/5');
    callout('Paint night. Steady hands. 🎨', 'mid');
  }
  function stamp(x0, y0, x1, y1, w, col) {
    const m = J.mctx; m.save(); m.lineCap = 'round'; m.strokeStyle = '#000'; m.lineWidth = w * RES;
    m.beginPath(); m.moveTo(x0 * RES, y0 * RES); m.lineTo(x1 * RES + 0.01, y1 * RES); m.stroke(); m.restore();
    J.dirtyMask = true;
  }
  function finishEl(e) {
    e.done = true; e.prog = 1; e.doneT = J.t;
    if (e.fill) { const m = J.mctx; m.fillStyle = '#000'; m.beginPath(); m.arc(RW / 2 * RES, RH / 2 * RES, e.fill * RES, 0, 7); m.fill(); }
    for (let i = 1; i < e.pts.length; i++) stamp(e.pts[i - 1][0], e.pts[i - 1][1], e.pts[i][0], e.pts[i][1], e.w + 6);
    if (e.pts.length === 40) stamp(e.pts[39][0], e.pts[39][1], e.pts[0][0], e.pts[0][1], e.w + 6);
    const mid = e.pts[(e.pts.length / 2) | 0]; sparkle(mid[0], mid[1], e.col, 18);
    callout('✨ ' + e.name + '!', 'mid'); IL.Audio.lane();
  }
  function updatePaint(dt) {
    if (pointer && !J.finished) {
      const w = toWorld(pointer.x, pointer.y), lw = J.lastW || w;
      stamp(lw.x, lw.y, w.x, w.y, J.brush);
      const len = Math.hypot(w.x - lw.x, w.y - lw.y), steps = Math.max(1, Math.ceil(len / 5)), rr2 = (J.brush * 0.5 + 12) ** 2;
      J.els.forEach(e => {
        if (e.done) return;
        for (let k = 0; k <= steps; k++) {
          const px = lw.x + (w.x - lw.x) * k / steps, py = lw.y + (w.y - lw.y) * k / steps;
          for (let i = 0; i < e.pts.length; i++) if (!e.cov[i]) { const dx = e.pts[i][0] - px, dy = e.pts[i][1] - py; if (dx * dx + dy * dy < rr2) e.cov[i] = 1; }
        }
        let c = 0; for (let i = 0; i < e.cov.length; i++) c += e.cov[i]; e.prog = c / e.cov.length;
        if (e.prog >= J.need) finishEl(e);
      });
      if (len > 1 && Math.random() < 0.7) spawn(w.x, w.y, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50, 0.4, pick(J.els.filter(e => !e.done).map(e => e.col).concat(['#fff'])), 3);
      if (len > 2 && Math.random() < 0.12) IL.Audio.brush();
      J.lastW = w;
    } else J.lastW = null;
    if (J.dirtyMask) {
      J.dirtyMask = false; const o = J.octx;
      o.globalCompositeOperation = 'source-over'; o.clearRect(0, 0, J.outC.width, J.outC.height);
      o.drawImage(J.maskC, 0, 0); o.globalCompositeOperation = 'source-in'; o.drawImage(J.designC, 0, 0); o.globalCompositeOperation = 'source-over';
    }
    const done = J.els.filter(e => e.done).length, prog = J.els.reduce((a, e) => a + e.prog, 0) / J.els.length;
    setHud('🖌️ Paint the ice', done < 5 ? 'Trace the glowing guide: ' + (J.els.find(e => !e.done) || {}).name : 'Design locked in!', prog, done + '/5');
    if (done === J.els.length && !J.finished) {
      J.mctx.fillStyle = '#000'; J.mctx.fillRect(0, 0, J.maskC.width, J.maskC.height); J.dirtyMask = true;
      IL.save.painted[J.venue.id] = Object.assign({}, J.design); IL.persist();
      callout('🎨 DESIGN LOCKED IN!', 'big'); IL.Audio.win(); confetti(60);
      complete({ time: J.t, acc: Math.min(1, prog) });
    }
  }
  function drawPaint() {
    J.els.forEach((e, idx) => {
      if (e.done) return;
      const next = J.els.find(q => !q.done) === e, p = 0.5 + 0.5 * Math.sin(J.t * 5);
      ctx.strokeStyle = e.col; ctx.globalAlpha = next ? 0.35 + p * 0.35 : 0.18; ctx.lineWidth = next ? 4 : 2.5; ctx.setLineDash([8, 7]); ctx.lineDashOffset = -J.t * 30;
      ctx.beginPath(); e.pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); if (e.pts.length === 40) ctx.closePath(); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      if (next) { // dots on covered/uncovered samples
        e.pts.forEach((q, i) => { if (e.cov[i]) return; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(q[0], q[1], 2, 0, 7); ctx.fill(); });
        if (!pointer && J.t > 0.6) hintFinger(e.pts[0][0], e.pts[0][1], false, e.pts[Math.min(e.pts.length - 1, 12)]);
      }
    });
    if (pointer) { const w = toWorld(pointer.x, pointer.y); ctx.save(); ctx.translate(w.x + 8, w.y - 10); ctx.rotate(0.6); ctx.fillStyle = '#8b5a2b'; ctx.fillRect(-2, -26, 5, 22); ctx.fillStyle = (J.els.find(e => !e.done) || J.els[0]).col; R.rr(ctx, -6, -6, 13, 12, 4); ctx.fill(); ctx.restore(); }
  }

  /* ---------- EVENT MOMENT ---------- */
  function setupEvent() {
    const st = J.info.stars || 0, d = J.design;
    J.mood = st >= 3 ? 'love' : st === 2 ? 'happy' : st === 1 ? 'meh' : 'mad';
    J.players = [];
    const away = d.logoColor === '#e63946' ? '#4d96ff' : '#ff6b6b';
    for (let i = 0; i < 10; i++) {
      const home = i < 5, lk = IL.B.look(300 + i, 'player');
      lk.body = home ? (d.logoColor === '#ffffff' ? '#a0c4ff' : d.logoColor) : away; lk.hatCol = home ? d.accent : '#3d405b';
      const slot = i % 5, tx = [RW / 2, RW / 2 - 90, RW / 2 + 90, RW / 2 - 55, RW / 2 + 55][slot], ty = RH / 2 + (home ? 1 : -1) * [45, 80, 80, 160, 160][slot];
      J.players.push(Object.assign(lk, { x: DOOR.x, y: DOOR.y + (home ? 20 : -20), tx, ty, delay: i * 0.18, r: 16, walk: 1 }));
    }
    J.ref = Object.assign(IL.B.look(7, 'ref'), { x: DOOR.x, y: DOOR.y, tx: RW / 2 + 22, ty: RH / 2, delay: 0.1, r: 15, walk: 1, prop: 'whistle' });
    J.coaches = [0, 1].map(i => Object.assign(IL.B.look(40 + i, 'coach'), { x: RW + BT + 9, y: RH / 2 + (i ? 90 : -90), prop: 'clipboard' }));
    J.update = updateEvent; J.tap = () => { if (J.t > 1.2) complete({}); }; J.draw = drawEvent;
    const msg = { love: 'Fans LOVE the ice! 💕', happy: 'Crowd is happy! 🎉', meh: 'Fans shrug... it\'s playable 😅', mad: 'Booo! Bumpy ice! 💢' }[J.mood];
    setHud('🏒 Puck drop!', msg, 1, '★'.repeat(st) + '☆'.repeat(3 - st));
    callout(st >= 2 ? '🎉 PUCK DROP!' : 'PUCK DROP', 'count go');
    if (st >= 2) { IL.Audio.cheer(true); if (IL.save.rink.music) IL.Audio.organ(); } else if (st === 0) IL.Audio.boo(); else IL.Audio.cheer(false);
    if (st >= 3) confetti(120);
  }
  function updateEvent(dt) {
    [J.ref].concat(J.players).forEach(p => {
      p.t = J.t; if (J.t < p.delay) return;
      const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
      if (d > 3) { p.x += dx / d * Math.min(d, 160 * dt); p.y += dy / d * Math.min(d, 160 * dt); p.walk = 1; p.lookX = dx / d; } else { p.walk = 0.1; p.lookX = 0; p.mood = J.mood === 'mad' ? 'angry' : J.mood === 'meh' ? 'meh' : 'cheer'; }
    });
    if (J.t > 4.2) complete({});
  }
  function drawEvent() {
    J.coaches.forEach(c => IL.B.draw(ctx, c.x, c.y, 10, Object.assign(c, { t: J.t, emote: J.mood === 'mad' ? 'angry' : 'bang', emoteT: (J.t % 2) })));
    [J.ref].concat(J.players).filter(p => J.t >= p.delay).sort((a, b) => a.y - b.y).forEach(p => IL.B.draw(ctx, p.x, p.y, p.r, p));
    if (J.t > 1.6) { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(RW / 2, RH / 2 - Math.max(0, 30 - (J.t - 1.6) * 60), 4, 0, 7); ctx.fill(); }
  }

  /* ---------- render ---------- */
  function hintFinger(x, y, tap, to) {
    let hx = x, hy = y;
    if (to) { const k = (J.t * 0.8) % 1; hx = x + (to[0] - x) * k; hy = y + (to[1] - y) * k; }
    const b = tap ? Math.abs(Math.sin(J.t * 6)) * 8 : 0;
    ctx.font = '30px ' + R.EMOJI_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('👆', hx + 6, hy + 6 + b);
  }
  function render(dt) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bgC, 0, 0);
    ctx.setTransform(dpr * L.s, 0, 0, dpr * L.s, dpr * L.ox, dpr * L.oy);
    ctx.save(); R.rinkPath(ctx); ctx.clip();
    if (J.type === 'paint') { ctx.drawImage(J.blankC, 0, 0, RW, RH); ctx.drawImage(J.outC, 0, 0, RW, RH); }
    else { ctx.drawImage(J.designC, 0, 0, RW, RH); if (J.dirtC) ctx.drawImage(J.dirtC, 0, 0, RW, RH); }
    if (J.type === 'event' || J.type === 'paint') {
      const bx = ((J.t * 120) % (RW + RH + 300)) - 200, sg = ctx.createLinearGradient(bx, 0, bx + 140, 140);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,.3)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, RW, RH);
    }
    ctx.restore();
    const mood = J.type === 'event' ? J.mood : 'neutral';
    IL.B.frontRows(ctx, J.t, J.venue, J.design, mood, J.type === 'event' ? (J.mood === 'mad' ? 0.3 : 1) : 0.1 + (IL.hasStaff('mo') ? 0.2 : 0), dt);
    J.draw();
    J.parts.forEach(q => {
      ctx.globalAlpha = Math.min(1, q.life / q.max * 1.5); ctx.fillStyle = q.col;
      if (q.type === 'conf') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillRect(-q.size / 2, -q.size / 4, q.size, q.size / 2); ctx.restore(); }
      else if (q.type === 'star') { R.starPath(ctx, q.x, q.y, q.size, 4, 0.4); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, 7); ctx.fill(); }
    });
    ctx.globalAlpha = 1;
  }

  /* test helpers */
  function debug() {
    if (!J) return null;
    const out = { type: J.type, t: J.t };
    if (J.skaters) out.skaters = J.skaters.filter(s => s.state === 'skate').map(s => toScreen(s.x, s.y)), out.gone = J.gone, out.total = J.total, out.spawn = J.spawn;
    if (J.spots) out.spots = J.spots.filter(s => !s.done).map(s => toScreen(s.x, s.y)), out.fixed = J.fixed;
    if (J.els) { out.els = J.els.map(e => ({ done: e.done, prog: e.prog, pts: e.pts.map(q => toScreen(q[0], q[1])) })); out.paintProg = J.els.reduce((a, e) => a + e.prog, 0) / J.els.length; }
    return out;
  }
  return { init, run, stop, debug, get active() { return !!J; }, get type() { return J ? J.type : null; } };
})();
