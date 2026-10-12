/* ICELOCK — cozy "bubble people": round characters with big eyes, hats, scarves, emotes */
window.IL = window.IL || {};
IL.B = (function () {
  const BODIES = ['#ffb5a7', '#fcd5ce', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff', '#ffadad', '#b9fbc0', '#f1c0e8', '#cfbaf0', '#fbf8cc', '#98f5e1'];
  const HATS = ['backcap', 'backcap', 'cap', 'none', 'toque', 'none', 'beanie', 'helmet'];
  const ADULT = ['#e07a5f', '#3d5a80', '#81b29a', '#f2cc8f', '#c08552', '#6d597a', '#b56576', '#457b9d', '#e9c46a', '#2a9d8f', '#d4a373', '#9a8c98'];
  const HAIR = ['#3b2a20', '#6b4423', '#a0522d', '#d9b38c', '#1f1f1f', '#8d8d8d', '#b5651d'];
  const ACC = ['#ff6b6b', '#4d96ff', '#6bcb77', '#ffd93d', '#c77dff', '#ff9f68', '#ffffff', '#3d405b'];
  function rng(seed) { let s = (seed * 9301 + 49297) % 233280 || 7; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }
  function look(seed, kind) {
    const r = rng(seed + 11);
    const p = (a) => a[(r() * a.length) | 0];
    const o = { body: p(BODIES), hat: p(HATS), hatCol: p(ACC), scarf: r() < 0.55 ? p(ACC) : null, jersey: null, phase: r() * 6.28, blinkAt: r() * 4 };
    if (kind !== 'kid' && kind !== 'ref') {
      o.body = p(ADULT); o.hair = p(HAIR);
      o.beard = r() < 0.42; o.stache = !o.beard && r() < 0.4; o.mullet = r() < 0.3; o.dad = r() < 0.4; o.lids = r() < 0.35;
      o.num = 1 + ((r() * 98) | 0); if (r() < 0.5) o.jersey = p(ACC);
      if (o.hat === 'beanie' && r() < 0.5) o.hat = 'backcap';
      if (o.scarf && r() < 0.6) o.scarf = null;
    }
    if (kind === 'kid') { o.hat = r() < 0.7 ? 'helmet' : 'beanie'; o.scarf = r() < 0.4 ? p(ACC) : null; }
    if (kind === 'player') { o.hat = 'helmet'; o.scarf = null; o.jersey = null; o.dad = r() < 0.25; }
    if (kind === 'ref') { o.body = '#f5f5f5'; o.ref = true; o.hat = 'helmet'; o.hatCol = '#222'; o.scarf = null; }
    if (kind === 'coach') { o.hat = 'cap'; o.scarf = null; o.jersey = '#3d405b'; }
    return o;
  }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    r = Math.min(255, Math.max(0, r + f)); g = Math.min(255, Math.max(0, g + f)); b = Math.min(255, Math.max(0, b + f));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  function heart(ctx, x, y, s, col) {
    ctx.fillStyle = col || '#ff4d6d'; ctx.beginPath(); ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.4, y, x - s * 0.6, y - s * 1.1, x, y - s * 0.3);
    ctx.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.4, y, x, y + s * 0.9); ctx.fill();
  }
  function emote(ctx, kind, x, y, s, t) {
    ctx.save();
    const pop = Math.min(1, t * 5), sc = pop < 1 ? pop * 1.25 : 1 + Math.sin(t * 6) * 0.06;
    ctx.translate(x, y - Math.min(t, 1) * s * 0.4); ctx.scale(sc, sc);
    if (kind === 'heart') heart(ctx, 0, 0, s);
    else if (kind === 'hearts') { heart(ctx, -s * 0.7, 0, s * 0.7); heart(ctx, s * 0.6, -s * 0.7, s * 0.55, '#ff8fab'); }
    else if (kind === 'sweat') { ctx.fillStyle = '#7ec8ff'; ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.8, s * 0.2, 0, s * 0.6); ctx.quadraticCurveTo(-s * 0.8, s * 0.2, 0, -s); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(-s * 0.15, s * 0.1, s * 0.18, 0, 7); ctx.fill(); }
    else if (kind === 'angry') {
      ctx.fillStyle = '#e5383b';
      for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * Math.PI / 2 + 0.78); ctx.beginPath(); ctx.ellipse(0, -s * 0.5, s * 0.22, s * 0.42, 0, 0, 7); ctx.fill(); ctx.restore(); }
      ctx.fillStyle = 'rgba(160,160,170,.55)'; ctx.beginPath(); ctx.arc(s * 1.1, s * 0.4, s * 0.35, 0, 7); ctx.arc(s * 1.5, s * 0.1, s * 0.25, 0, 7); ctx.fill();
    } else if (kind === 'note') { ctx.fillStyle = '#7b2ff7'; ctx.font = '900 ' + (s * 2) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('♪', 0, 0); }
    else if (kind === 'star') { ctx.fillStyle = '#ffc300'; IL.R.starPath(ctx, 0, 0, s, 5, 0.45); ctx.fill(); }
    else if (kind === 'bang' || kind === 'q') {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, s * 0.95, 0, 7); ctx.fill(); ctx.strokeStyle = '#3d405b'; ctx.lineWidth = s * 0.12; ctx.stroke();
      ctx.fillStyle = kind === 'bang' ? '#ff6b6b' : '#4d96ff'; ctx.font = '900 ' + (s * 1.4) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(kind === 'bang' ? '!' : '?', 0, s * 0.05);
    } else if (kind === 'zzz') { ctx.fillStyle = '#4d96ff'; ctx.font = '900 ' + s * 1.3 + 'px system-ui'; ctx.fillText('z', 0, 0); ctx.font = '900 ' + s + 'px system-ui'; ctx.fillText('z', s * 0.8, -s * 0.7); }
    else if (kind === 'wave') { ctx.font = (s * 1.8) + 'px ' + IL.R.EMOJI_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('👋', 0, 0); }
    ctx.restore();
  }
  /* o: look + {t, walk (0..1), mood:'happy'|'meh'|'sad'|'angry', emote, emoteT, lookX, lookY, scale} */
  function draw(ctx, x, y, r, o) {
    const t = o.t || 0, ph = o.phase || 0, walk = o.walk || 0;
    if (r < 6.5) { // tiny LOD for big crowds
      const by = y - Math.abs(Math.sin(t * 6 + ph)) * r * 0.25 * (o.hype || 0);
      ctx.fillStyle = o.body; ctx.beginPath(); ctx.arc(x, by, r, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - r * 0.35, by - r * 0.15, r * 0.3, 0, 7); ctx.arc(x + r * 0.35, by - r * 0.15, r * 0.3, 0, 7); ctx.fill();
      ctx.fillStyle = '#2b2d42'; ctx.beginPath(); ctx.arc(x - r * 0.33, by - r * 0.1, r * 0.15, 0, 7); ctx.arc(x + r * 0.37, by - r * 0.1, r * 0.15, 0, 7); ctx.fill();
      if (o.hat === 'beanie' || o.hat === 'toque') { ctx.fillStyle = o.hatCol; ctx.beginPath(); ctx.arc(x, by - r * 0.35, r * 0.75, Math.PI, 0); ctx.fill(); }
      if (o.emote) emote(ctx, o.emote, x + r * 0.6, by - r * 2, Math.max(5.5, r * 0.8), o.emoteT || 0);
      return;
    }
    const step = Math.sin(t * 11 + ph) * walk;
    const hop = Math.abs(Math.sin(t * 11 + ph)) * r * 0.16 * walk + Math.sin(t * 2.2 + ph) * r * 0.03;
    const by = y - hop;
    ctx.save();
    // shadow + feet
    ctx.fillStyle = 'rgba(40,30,60,.18)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.92, r * 0.85, r * 0.26, 0, 0, 7); ctx.fill();
    ctx.fillStyle = shade(o.body, -70);
    ctx.beginPath(); ctx.ellipse(x - r * 0.38, y + r * 0.82 - Math.max(0, step) * r * 0.2, r * 0.27, r * 0.17, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + r * 0.38, y + r * 0.82 - Math.max(0, -step) * r * 0.2, r * 0.27, r * 0.17, 0, 0, 7); ctx.fill();
    // body (squash & stretch)
    ctx.translate(x, by); ctx.rotate(step * 0.08 + (o.tilt || 0)); ctx.scale(1 + Math.sin(t * 2.2 + ph) * 0.025, 1 - Math.sin(t * 2.2 + ph) * 0.025);
    const bw = o.dad ? 1.13 : 1;
    if (o.mullet) { ctx.fillStyle = o.hair; ctx.beginPath(); ctx.ellipse(-r * 0.78 * bw, r * 0.15, r * 0.32, r * 0.55, 0.25, 0, 7); ctx.ellipse(r * 0.78 * bw, r * 0.15, r * 0.32, r * 0.55, -0.25, 0, 7); ctx.fill(); }
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
    g.addColorStop(0, shade(o.body, 40)); g.addColorStop(1, o.body);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, r * bw, r, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, r * bw, r, 0, 0, 7); ctx.clip();
    if (o.dad) { ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.beginPath(); ctx.ellipse(0, r * 0.62, r * 0.7, r * 0.42, 0, 0, 7); ctx.fill(); }
    if (o.ref) { ctx.fillStyle = '#222'; for (let i = -3; i <= 3; i++) ctx.fillRect(i * r * 0.36 - r * 0.09, -r, r * 0.18, r * 2); }
    if (o.jersey) { ctx.fillStyle = o.jersey; ctx.fillRect(-r * 1.2, r * 0.42, r * 2.4, r); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(-r * 1.2, r * 0.62, r * 2.4, r * 0.09);
      if (o.num && r > 9) { ctx.fillStyle = '#fff'; ctx.font = '900 ' + (r * 0.32) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.num, r * 0.45, r * 0.82); } }
    ctx.restore();
    ctx.strokeStyle = shade(o.body, -45); ctx.lineWidth = Math.max(1, r * 0.06); ctx.beginPath(); ctx.ellipse(0, 0, r * bw, r, 0, 0, 7); ctx.stroke();
    // scarf
    if (o.scarf) {
      ctx.fillStyle = o.scarf; ctx.beginPath(); ctx.ellipse(0, r * 0.52, r * 0.8, r * 0.15, 0, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(r * 0.4, r * 0.56); ctx.rotate(0.3 + Math.sin(t * 5 + ph) * 0.15); ctx.fillRect(-r * 0.1, 0, r * 0.22, r * 0.5); ctx.restore();
    }
    // face
    const lx = (o.lookX || 0) * r * 0.08, ly = (o.lookY || 0) * r * 0.06;
    const blink = ((t + (o.blinkAt || 0)) % 4) < 0.12;
    [-1, 1].forEach(sd => {
      const ex = sd * r * 0.32, ey = -r * 0.14;
      if (blink) { ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = r * 0.07; ctx.beginPath(); ctx.moveTo(ex - r * 0.13, ey); ctx.lineTo(ex + r * 0.13, ey); ctx.stroke(); return; }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.22, r * 0.27, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#2b2d42'; ctx.beginPath(); ctx.arc(ex + lx, ey + ly + r * 0.03, r * 0.13, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + lx - r * 0.05, ey + ly - r * 0.03, r * 0.05, 0, 7); ctx.fill();
    });
    if (o.lids && !blink) { ctx.fillStyle = shade(o.body, -15); [-1, 1].forEach(sd => { ctx.beginPath(); ctx.ellipse(sd * r * 0.32, -r * 0.2, r * 0.25, r * 0.17, 0, Math.PI, 0); ctx.fill(); }); }
    if (o.beard) {
      ctx.fillStyle = o.hair; ctx.beginPath(); ctx.moveTo(-r * 0.72, -r * 0.02);
      ctx.quadraticCurveTo(-r * 0.7, r * 0.7, 0, r * 0.74); ctx.quadraticCurveTo(r * 0.7, r * 0.7, r * 0.72, -r * 0.02);
      ctx.quadraticCurveTo(r * 0.4, r * 0.3, 0, r * 0.26); ctx.quadraticCurveTo(-r * 0.4, r * 0.3, -r * 0.72, -r * 0.02); ctx.fill(); ctx.strokeStyle = shade(o.hair, -35); ctx.lineWidth = r * 0.04; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.ellipse(-r * 0.25, r * 0.45, r * 0.12, r * 0.06, 0.4, 0, 7); ctx.fill();
    }
    if (o.stache || o.beard) { ctx.fillStyle = o.hair; [-1, 1].forEach(sd => { ctx.beginPath(); ctx.ellipse(sd * r * 0.16, r * 0.07, r * 0.2, r * 0.08, sd * -0.35, 0, 7); ctx.fill(); }); }
    if (o.mood === 'angry') { ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = r * 0.07; [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(sd * r * 0.5, -r * 0.48); ctx.lineTo(sd * r * 0.15, -r * 0.38); ctx.stroke(); }); }
    ctx.fillStyle = 'rgba(255,120,140,.45)'; ctx.beginPath(); ctx.ellipse(-r * 0.56, r * 0.07, r * 0.15, r * 0.09, 0, 0, 7); ctx.ellipse(r * 0.56, r * 0.07, r * 0.15, r * 0.09, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = r * 0.07; ctx.lineCap = 'round'; ctx.beginPath();
    if (o.mood === 'sad' || o.mood === 'angry') ctx.arc(0, r * 0.22, r * 0.11, Math.PI * 1.15, Math.PI * 1.85);
    else if (o.mood === 'meh') { ctx.moveTo(-r * 0.09, r * 0.13); ctx.lineTo(r * 0.09, r * 0.13); }
    else if (o.mood === 'cheer') { ctx.fillStyle = '#7a2e3a'; ctx.arc(0, r * 0.1, r * 0.13, 0, Math.PI); ctx.fill(); }
    else ctx.arc(0, (o.stache || o.beard) ? r * 0.12 : r * 0.06, r * 0.11, 0.2, Math.PI - 0.2);
    ctx.stroke();
    // hats
    const hc = o.hatCol || '#ff6b6b';
    if (o.hat === 'beanie' || o.hat === 'toque') {
      ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(0, -r * 0.45, r * 0.78, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade(hc.length === 7 ? hc : '#ff6b6b', 35); ctx.fillRect(-r * 0.72, -r * 0.62, r * 1.44, r * 0.18);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -r * (o.hat === 'toque' ? 1.32 : 1.25), r * 0.17, 0, 7); ctx.fill();
    } else if (o.hat === 'helmet') {
      ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.92, Math.PI * 1.08, Math.PI * 1.92); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.82, r * 0.22, r * 0.08, -0.4, 0, 7); ctx.fill();
    } else if (o.hat === 'cap') {
      ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(0, -r * 0.42, r * 0.7, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(r * 0.45, -r * 0.45, r * 0.45, r * 0.1, 0, 0, 7); ctx.fill();
    } else if (o.hat === 'backcap') {
      ctx.fillStyle = shade(hc.length === 7 ? hc : '#e07a5f', -30); ctx.beginPath(); ctx.ellipse(-r * 0.15, -r * 0.98, r * 0.42, r * 0.11, -0.15, 0, 7); ctx.fill();
      ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(0, -r * 0.42, r * 0.72, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(-r * 0.12, -r * 0.62, r * 0.24, r * 0.12);
      if (o.hair) { ctx.fillStyle = o.hair; ctx.beginPath(); ctx.ellipse(-r * 0.66, -r * 0.42, r * 0.14, r * 0.2, 0.3, 0, 7); ctx.ellipse(r * 0.66, -r * 0.42, r * 0.14, r * 0.2, -0.3, 0, 7); ctx.fill(); }
    } else if (o.hat === 'none' && o.hair) {
      ctx.fillStyle = o.hair; ctx.beginPath(); ctx.arc(0, -r * 0.35, r * 0.74, Math.PI * 1.08, Math.PI * 1.92); ctx.quadraticCurveTo(0, -r * 0.72, -r * 0.7, -r * 0.55); ctx.fill();
    } else if (o.hat === 'earmuffs') {
      ctx.strokeStyle = '#3d405b'; ctx.lineWidth = r * 0.08; ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.9, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(-r * 0.88, -r * 0.18, r * 0.22, 0, 7); ctx.arc(r * 0.88, -r * 0.18, r * 0.22, 0, 7); ctx.fill();
    }
    if (o.prop === 'whistle') { ctx.fillStyle = '#ffd93d'; ctx.fillRect(r * 0.05, r * 0.15, r * 0.3, r * 0.14); }
    if (o.prop === 'clipboard') { ctx.fillStyle = '#c9a66b'; ctx.fillRect(r * 0.5, 0, r * 0.45, r * 0.6); ctx.fillStyle = '#fff'; ctx.fillRect(r * 0.56, r * 0.08, r * 0.33, r * 0.42); }
    if (o.prop === 'brush') { ctx.fillStyle = '#8b5a2b'; ctx.fillRect(r * 0.7, -r * 0.5, r * 0.12, r * 1.0); ctx.fillStyle = o.hatCol; ctx.fillRect(r * 0.62, -r * 0.7, r * 0.28, r * 0.25); }
    if (o.prop === 'can') { ctx.fillStyle = '#4d96ff'; ctx.fillRect(r * 0.6, r * 0.05, r * 0.4, r * 0.4); ctx.fillRect(r * 0.95, r * 0.05, r * 0.3, r * 0.08); }
    ctx.restore();
    if (o.emote) emote(ctx, o.emote, x + r * 0.65, by - r * 1.45, r * 0.42, o.emoteT || 0);
  }

  /* animated front rows of fans around the boards (world coords) */
  let rowCache = null;
  function frontRows(ctx, t, venue, design, mood, hype, dt) {
    const R = IL.R;
    if (venue.theme.kind === 'pond' || venue.theme.kind === 'outdoor') return;
    const key = venue.id + design.logoColor + design.accent;
    if (!rowCache || rowCache.key !== key) {
      const fans = []; let seed = 1;
      [R.BT + 6, R.BT + 16].forEach((d, row) => {
        const per = 2 * (R.RW + R.RH) + 2 * Math.PI * (R.CR + d) - 8 * R.CR, n = Math.floor(per / 10.5);
        for (let i = 0; i < n; i++) {
          seed++;
          if ((seed * 7919) % 100 > Math.min(97, venue.theme.crowd * 100 + 25)) continue;
          const p = R.pointOnRR(i / n + row * 0.004, d);
          if (p[0] > R.RW && Math.abs(p[1] - R.RH / 2) < 160) continue; // benches
          const lk = look(seed, 'fan'); if (seed % 3 === 0) lk.body = [design.logoColor, design.accent, design.board][seed % 3]; if (lk.body === '#ffffff' || lk.body === '#111827') lk.body = '#ffd6a5';
          fans.push(Object.assign(lk, { x: p[0], y: p[1], emote: null, emoteT: 0, nextE: Math.random() * 6 }));
        }
      });
      rowCache = { key, fans };
    }
    const pool = mood === 'love' ? ['heart', 'hearts', 'star', 'heart'] : mood === 'happy' ? ['heart', 'note', 'star', 'bang'] : mood === 'meh' ? ['sweat', 'q', 'zzz'] : mood === 'mad' ? ['angry', 'sweat'] : ['note', 'heart', 'bang', 'q'];
    rowCache.fans.forEach(f => {
      f.nextE -= dt * (0.3 + hype * 2.5);
      if (f.emote) { f.emoteT += dt; if (f.emoteT > 1.4) f.emote = null; }
      else if (f.nextE <= 0) { f.emote = pool[(Math.random() * pool.length) | 0]; f.emoteT = 0; f.nextE = 2 + Math.random() * 8; }
      f.t = t; f.hype = 0.4 + hype;
      draw(ctx, f.x, f.y - Math.abs(Math.sin(t * (4 + hype * 6) + f.phase)) * 1.6 * (0.3 + hype), 4.6, f);
    });
  }
  return { look, draw, emote, frontRows, heart, BODIES };
})();
