/* ICELOCK Zamboni Shift — rink art: ice design, dirt texture, venue backdrop, sprites */
window.IL = window.IL || {};
IL.R = (function () {
  const RW = 340, RH = 720, CR = 90, BT = 13, RES = 2;
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
  }
  function rinkPath(ctx, inset) { inset = inset || 0; rr(ctx, inset, inset, RW - inset * 2, RH - inset * 2, CR - inset); }
  function inside(x, y, inset) {
    inset = inset || 0;
    if (x < inset || y < inset || x > RW - inset || y > RH - inset) return false;
    const dx = Math.max(Math.abs(x - RW / 2) - (RW / 2 - CR), 0), dy = Math.max(Math.abs(y - RH / 2) - (RH / 2 - CR), 0);
    return dx * dx + dy * dy <= (CR - inset) * (CR - inset);
  }
  // seeded rng
  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  /* ---------- Logos ---------- */
  function starPath(ctx, x, y, r, n, inner) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = -Math.PI / 2 + i * Math.PI / n, rr2 = i % 2 ? r * inner : r;
      ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
    }
    ctx.closePath();
  }
  function initials(name) {
    const p = String(name || 'IL').trim().split(/\s+/);
    return ((p[0] || 'I')[0] + (p[1] ? p[1][0] : (p[0] || 'L')[1] || '')).toUpperCase();
  }
  function drawLogo(ctx, id, x, y, size, color, accent, teamName) {
    const r = size / 2;
    const L = IL.LOGOS.find(l => l.id === id) || IL.LOGOS[0];
    ctx.save();
    // crest base
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = L.id === 'initials' ? color : accent; ctx.fill();
    ctx.lineWidth = size * 0.06; ctx.strokeStyle = L.id === 'initials' ? accent : color; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r * 0.86, 0, Math.PI * 2);
    ctx.lineWidth = size * 0.015; ctx.stroke();
    const s = r * 0.62;
    ctx.fillStyle = color; ctx.strokeStyle = color;
    if (L.kind === 'emoji') {
      ctx.font = Math.round(size * 0.58) + 'px ' + EMOJI_FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(L.label, x, y + size * 0.03);
    } else if (L.id === 'initials') {
      ctx.fillStyle = accent; ctx.font = '900 ' + Math.round(size * 0.42) + 'px system-ui,Arial Black,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(initials(teamName), x, y + size * 0.02);
    } else if (L.id === 'star') { starPath(ctx, x, y, s, 5, 0.45); ctx.fill(); }
    else if (L.id === 'shield') {
      ctx.beginPath(); ctx.moveTo(x - s * 0.8, y - s * 0.8); ctx.lineTo(x + s * 0.8, y - s * 0.8);
      ctx.lineTo(x + s * 0.8, y); ctx.quadraticCurveTo(x + s * 0.7, y + s * 0.7, x, y + s); ctx.quadraticCurveTo(x - s * 0.7, y + s * 0.7, x - s * 0.8, y);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = accent; ctx.fillRect(x - s * 0.12, y - s * 0.7, s * 0.24, s * 1.4); ctx.fillRect(x - s * 0.6, y - s * 0.25, s * 1.2, s * 0.24);
    } else if (L.id === 'bolt') {
      ctx.beginPath(); const p = [[0.2, -1], [-0.6, 0.12], [-0.05, 0.12], [-0.25, 1], [0.6, -0.15], [0.05, -0.15]];
      p.forEach((q, i) => i ? ctx.lineTo(x + q[0] * s, y + q[1] * s) : ctx.moveTo(x + q[0] * s, y + q[1] * s)); ctx.closePath(); ctx.fill();
    } else if (L.id === 'crown') {
      ctx.beginPath(); ctx.moveTo(x - s * 0.9, y + s * 0.55); ctx.lineTo(x - s * 0.9, y - s * 0.45); ctx.lineTo(x - s * 0.45, y + s * 0.05);
      ctx.lineTo(x, y - s * 0.75); ctx.lineTo(x + s * 0.45, y + s * 0.05); ctx.lineTo(x + s * 0.9, y - s * 0.45); ctx.lineTo(x + s * 0.9, y + s * 0.55); ctx.closePath(); ctx.fill();
      ctx.fillStyle = accent; [-0.9, 0, 0.9].forEach(k => { ctx.beginPath(); ctx.arc(x + k * s, y + (k ? -0.5 : -0.8) * s, s * 0.13, 0, 7); ctx.fill(); });
    } else if (L.id === 'snowflake') {
      ctx.lineWidth = s * 0.16; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3, cx = Math.cos(a), sy = Math.sin(a);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cx * s, y + sy * s); ctx.stroke();
        const bx = x + cx * s * 0.6, by = y + sy * s * 0.6;
        [a + 0.8, a - 0.8].forEach(b => { ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(b) * s * 0.3, by + Math.sin(b) * s * 0.3); ctx.stroke(); });
      }
    } else if (L.id === 'puck') {
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(x, y + s * 0.15, s * 0.85, s * 0.45, 0, 0, 7); ctx.fill();
      ctx.fillRect(x - s * 0.85, y - s * 0.2, s * 1.7, s * 0.35);
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y - s * 0.2, s * 0.85, s * 0.45, 0, 0, 7); ctx.fill();
    } else if (L.id === 'heart') {
      ctx.beginPath(); ctx.moveTo(x, y + s * 0.9);
      ctx.bezierCurveTo(x - s * 1.3, y, x - s * 0.6, y - s * 1.1, x, y - s * 0.35);
      ctx.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.3, y, x, y + s * 0.9); ctx.fill();
    } else if (L.id === 'paw') {
      ctx.beginPath(); ctx.ellipse(x, y + s * 0.3, s * 0.5, s * 0.42, 0, 0, 7); ctx.fill();
      [[-0.62, -0.2], [-0.25, -0.62], [0.25, -0.62], [0.62, -0.2]].forEach(q => { ctx.beginPath(); ctx.ellipse(x + q[0] * s, y + q[1] * s, s * 0.2, s * 0.26, 0, 0, 7); ctx.fill(); });
    }
    ctx.restore();
  }

  /* ---------- Ice design (what shows through clean ice) ---------- */
  function drawDesign(ctx, d) {
    const tint = IL.ICE_TINTS.find(t => t.id === d.ice) || IL.ICE_TINTS[0];
    ctx.save();
    rinkPath(ctx); ctx.clip();
    const g = ctx.createRadialGradient(RW / 2, RH / 2, 40, RW / 2, RH / 2, RH * 0.65);
    g.addColorStop(0, tint.a); g.addColorStop(1, tint.b);
    ctx.fillStyle = g; ctx.fillRect(0, 0, RW, RH);
    const R = rng(7);
    for (let i = 0; i < 220; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + R() * 0.5) + ')'; ctx.fillRect(R() * RW, R() * RH, 1.2, 1.2); }
    const cx = RW / 2, cy = RH / 2;
    // creases + nets
    [44, RH - 44].forEach((gy, k) => {
      const dir = k ? -1 : 1;
      ctx.save(); ctx.beginPath(); ctx.arc(cx, gy, 24, k ? Math.PI : 0, k ? Math.PI * 2 : Math.PI); ctx.closePath();
      ctx.fillStyle = 'rgba(70,160,235,.45)'; ctx.fill(); ctx.strokeStyle = d.red; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
      ctx.strokeStyle = d.red; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(RW, gy); ctx.stroke();
      // net
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(cx - 13, k ? gy : gy - 14, 26, 14);
      ctx.strokeStyle = d.red; ctx.lineWidth = 2.5; ctx.strokeRect(cx - 13, k ? gy : gy - 14, 26, 14);
      ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 0.6;
      for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(cx - 13 + i * 4.3, k ? gy : gy - 14); ctx.lineTo(cx - 13 + i * 4.3, k ? gy + 14 : gy); ctx.stroke(); }
      // end zone circles
      [cx - 86, cx + 86].forEach(fx => {
        const fy = gy + dir * 84;
        ctx.strokeStyle = d.circle; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(fx, fy, 42, 0, 7); ctx.stroke();
        ctx.fillStyle = d.circle; ctx.beginPath(); ctx.arc(fx, fy, 6, 0, 7); ctx.fill();
        ctx.lineWidth = 2;
        [-1, 1].forEach(sx => [-1, 1].forEach(sy => { ctx.beginPath(); ctx.moveTo(fx + sx * 5, fy + sy * 42); ctx.lineTo(fx + sx * 5, fy + sy * 50); ctx.stroke(); }));
      });
    });
    // blue lines
    [cy - 118, cy + 118].forEach(by => { ctx.fillStyle = d.blue; ctx.fillRect(0, by - 6, RW, 12); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(0, by - 6, RW, 3); });
    // neutral dots
    ctx.fillStyle = d.circle;
    [-1, 1].forEach(sx => [-1, 1].forEach(sy => { ctx.beginPath(); ctx.arc(cx + sx * 86, cy + sy * 92, 5.5, 0, 7); ctx.fill(); }));
    // center red line
    ctx.fillStyle = d.red; ctx.fillRect(0, cy - 6, RW, 12);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (let x = 6; x < RW; x += 22) ctx.fillRect(x, cy - 1.5, 9, 3);
    // center circle
    ctx.strokeStyle = d.circle; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, 48, 0, 7); ctx.stroke();
    // logo
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 6;
    if (d.logo !== 'none') drawLogo(ctx, d.logo, cx, cy, 88, d.logoColor, d.accent, d.teamName);
    ctx.restore();
    // names
    ctx.font = '900 19px system-ui,Arial Black,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = d.logoColor; ctx.globalAlpha = 0.85;
    ctx.fillText(String(d.rinkName || '').toUpperCase().slice(0, 18), cx, cy - 80);
    ctx.save(); ctx.translate(cx, cy + 80); ctx.rotate(Math.PI);
    ctx.fillText(String(d.teamName || '').toUpperCase().slice(0, 18), 0, 0); ctx.restore();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* ---------- Dirty ice layer ---------- */
  function drawDirt(ctx, venue, seed) {
    const R = rng(seed || 99);
    const pond = venue.theme.kind === 'pond' || venue.theme.kind === 'outdoor';
    ctx.save(); rinkPath(ctx); ctx.clip();
    ctx.fillStyle = pond ? 'rgba(228,235,243,.96)' : 'rgba(184,194,206,.95)';
    ctx.fillRect(0, 0, RW, RH);
    for (let i = 0; i < 260; i++) {
      const r = 6 + R() * 34;
      ctx.fillStyle = R() < 0.5 ? 'rgba(255,255,255,' + (0.08 + R() * 0.18) + ')' : 'rgba(120,132,150,' + (0.04 + R() * 0.08) + ')';
      ctx.beginPath(); ctx.arc(R() * RW, R() * RH, r, 0, 7); ctx.fill();
    }
    // skate marks
    ctx.lineCap = 'round';
    for (let i = 0; i < 260; i++) {
      const x = R() * RW, y = R() * RH, a = R() * 7, L = 30 + R() * 150, bend = (R() - 0.5) * 80;
      ctx.strokeStyle = 'rgba(' + (R() < 0.3 ? '255,255,255' : '105,118,138') + ',' + (0.2 + R() * 0.35) + ')';
      ctx.lineWidth = 0.6 + R() * 1.4;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a) * L / 2 - Math.sin(a) * bend, y + Math.sin(a) * L / 2 + Math.cos(a) * bend, x + Math.cos(a) * L, y + Math.sin(a) * L);
      ctx.stroke();
    }
    // hockey-stop snow sprays
    for (let i = 0; i < 46; i++) {
      const x = R() * RW, y = R() * RH, a = R() * 7;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath(); ctx.ellipse(0, 0, 14 + R() * 10, 4 + R() * 3, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(150,165,185,.35)'; ctx.beginPath(); ctx.ellipse(0, 3, 12, 2, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
    // snow piles
    for (let i = 0; i < 34; i++) {
      const x = R() * RW, y = R() * RH, r = 5 + R() * 11;
      ctx.fillStyle = 'rgba(120,135,155,.25)'; ctx.beginPath(); ctx.arc(x + 2, y + 3, r, 0, 7); ctx.fill();
      ctx.fillStyle = '#fbfdff'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.4, 0, 7); ctx.fill();
    }
    // debris: puck marks, tape, paper
    for (let i = 0; i < 70; i++) {
      const x = R() * RW, y = R() * RH, t = R();
      ctx.save(); ctx.translate(x, y); ctx.rotate(R() * 7);
      if (t < 0.4) { ctx.fillStyle = 'rgba(30,30,40,.35)'; ctx.beginPath(); ctx.ellipse(0, 0, 4 + R() * 6, 1.5, 0, 0, 7); ctx.fill(); }
      else if (t < 0.7) { ctx.fillStyle = 'rgba(20,20,25,.7)'; ctx.fillRect(-3, -1, 6 + R() * 4, 2); }
      else { ctx.fillStyle = ['#ffd23f', '#e63946', '#3ddc84', '#2d9cdb', '#fff'][i % 5]; ctx.globalAlpha = 0.75; ctx.fillRect(-2, -2, 4, 3); }
      ctx.restore();
    }
    ctx.restore();
  }

  /* ---------- Venue backdrop: stands, crowd, boards (static, cached) ---------- */
  function drawBackdrop(ctx, W, H, L, venue, design, rink) {
    const th = venue.theme, s = L.s;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, th.bg); g.addColorStop(1, th.bg2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(L.ox, L.oy); ctx.scale(s, s);
    const reachX = Math.max(L.ox, W - L.ox - RW * s) / s + 40, reachY = Math.max(L.oy, H - L.oy - RH * s) / s + 40;
    const reach = Math.max(reachX, reachY);
    const R = rng(1234 + venue.id.length);
    const crowdDensity = Math.min(1, th.crowd + rink.seats * 0.15);
    const shirts = [design.logoColor, design.accent, design.board, design.blue, design.red, '#ffffff', '#222'];
    const skins = ['#f5d0b5', '#e0ac8a', '#c68642', '#8d5524', '#ffdbac'];
    if (th.kind === 'pond') {
      ctx.fillStyle = '#e8eff4'; rr(ctx, -reach, -reach, RW + reach * 2, RH + reach * 2, 0); ctx.fill();
      for (let i = 0; i < 400; i++) { ctx.fillStyle = 'rgba(160,180,200,' + R() * 0.25 + ')'; ctx.beginPath(); ctx.arc(-reach + R() * (RW + reach * 2), -reach + R() * (RH + reach * 2), 2 + R() * 10, 0, 7); ctx.fill(); }
      // pine trees
      for (let i = 0; i < 90; i++) {
        const x = -reach + R() * (RW + reach * 2), y = -reach + R() * (RH + reach * 2);
        if (x > -40 && x < RW + 40 && y > -40 && y < RH + 40) continue;
        const r = 14 + R() * 18;
        ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.arc(x + 6, y + 8, r, 0, 7); ctx.fill();
        starPath(ctx, x, y, r, 8, 0.6); ctx.fillStyle = '#1f5a3a'; ctx.fill();
        starPath(ctx, x, y, r * 0.65, 8, 0.6); ctx.fillStyle = '#2e7d4f'; ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.25, 0, 7); ctx.fill();
      }
      // fire pit
      ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(RW + 34, RH * 0.5, 12, 0, 7); ctx.fill();
      ctx.fillStyle = '#ff8c42'; ctx.beginPath(); ctx.arc(RW + 34, RH * 0.5, 7, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(RW + 34, RH * 0.5, 3.5, 0, 7); ctx.fill();
    } else {
      let start = BT + 6;
      if (th.kind === 'outdoor') {
        ctx.fillStyle = '#e9f0f7'; rr(ctx, -70, -70, RW + 140, RH + 140, CR + 60); ctx.fill();
        ctx.fillStyle = '#2f7a46'; rr(ctx, -150, -150, RW + 300, RH + 300, CR + 120); ctx.fill();
        ctx.fillStyle = '#e9f0f7'; rr(ctx, -70, -70, RW + 140, RH + 140, CR + 60); ctx.fill();
        for (let i = 0; i < 200; i++) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(-150 + R() * (RW + 300), -150 + R() * (RH + 300), 2 + R() * 8, 0, 7); ctx.fill(); }
        start = 160;
      }
      for (let d = start, k = 0; d < reach; d += 10, k++) {
        ctx.strokeStyle = k % 2 ? th.stands : th.seat; ctx.lineWidth = 10;
        rr(ctx, -d, -d, RW + d * 2, RH + d * 2, CR + d); ctx.stroke();
        if (k % 8 === 7) { ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 5; rr(ctx, -d, -d, RW + d * 2, RH + d * 2, CR + d); ctx.stroke(); continue; }
        const per = 2 * (RW + RH) + 2 * Math.PI * (CR + d) - 8 * CR;
        const n = Math.floor(per / 8.5);
        for (let i = 0; i < n; i++) {
          if (R() > crowdDensity) continue;
          if (k < 2 && th.kind !== 'outdoor') continue; // front rows are animated bubble fans
          const p = pointOnRR(i / n, d);
          const bc = R() < 0.45 ? shirts[(R() * shirts.length) | 0] : IL.B.BODIES[(R() * IL.B.BODIES.length) | 0];
          ctx.fillStyle = bc === '#ffffff' || bc === '#222' || bc === '#111827' ? '#ffd6a5' : bc;
          ctx.beginPath(); ctx.arc(p[0], p[1], 3.9, 0, 7); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p[0] - 1.3, p[1] - 0.6, 1.1, 0, 7); ctx.arc(p[0] + 1.3, p[1] - 0.6, 1.1, 0, 7); ctx.fill();
          ctx.fillStyle = '#2b2d42'; ctx.beginPath(); ctx.arc(p[0] - 1.2, p[1] - 0.4, 0.55, 0, 7); ctx.arc(p[0] + 1.4, p[1] - 0.4, 0.55, 0, 7); ctx.fill();
          if (R() < 0.25) { ctx.fillStyle = shirts[(R() * shirts.length) | 0]; ctx.beginPath(); ctx.arc(p[0], p[1] - 1.5, 3.2, Math.PI, 0); ctx.fill(); }
        }
      }
      // benches (right side), penalty boxes (left)
      ctx.fillStyle = 'rgba(20,24,34,.85)'; ctx.fillRect(RW + BT, RH / 2 - 150, 14, 300);
      ctx.fillStyle = 'rgba(20,24,34,.85)'; ctx.fillRect(-BT - 14, RH / 2 - 40, 14, 80);
      for (let i = 0; i < 10; i++) IL.B.draw(ctx, RW + BT + 7, RH / 2 - 135 + i * 30, 5.5, Object.assign(IL.B.look(i + 50, 'player'), { body: design.logoColor === '#ffffff' ? '#a0c4ff' : design.logoColor, hatCol: design.accent }));
      if (rink.concessions) {
        [[-60, -60], [RW + 60, RH + 60]].forEach((p, i) => {
          if (i && rink.concessions < 2) return;
          ctx.fillStyle = '#ffd23f'; rr(ctx, p[0] - 30, p[1] - 14, 60, 28, 6); ctx.fill();
          ctx.fillStyle = '#e63946'; ctx.font = '900 11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('🌭 NACHOS', p[0], p[1]);
        });
      }
    }
    // vignette: keeps wide (desktop) screens calm and focused on the ice
    const vg = ctx.createRadialGradient(RW / 2, RH / 2, RH * 0.56, RW / 2, RH / 2, RH * 1.15);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, th.kind === 'pond' ? 'rgba(20,40,30,.75)' : 'rgba(5,10,25,.82)');
    ctx.fillStyle = vg; ctx.fillRect(-reach, -reach, RW + reach * 2, RH + reach * 2);
    // boards
    ctx.strokeStyle = th.glass; ctx.lineWidth = 4; rr(ctx, -BT - 3, -BT - 3, RW + BT * 2 + 6, RH + BT * 2 + 6, CR + BT + 3); ctx.stroke();
    ctx.fillStyle = th.boards; rr(ctx, -BT, -BT, RW + BT * 2, RH + BT * 2, CR + BT); ctx.fill();
    ctx.fillStyle = design.board; rr(ctx, -5, -5, RW + 10, RH + 10, CR + 5); ctx.fill();
    // ads along sides
    const ads = [design.ad, 'ICELOCK', venue.name.toUpperCase(), design.ad, design.teamName.toUpperCase()];
    ctx.font = '900 8px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 5; i++) {
      const y = CR + 10 + i * ((RH - CR * 2 - 20) / 4);
      [[-BT / 2 - 2, -Math.PI / 2], [RW + BT / 2 + 2, Math.PI / 2]].forEach(q => {
        ctx.save(); ctx.translate(q[0], y); ctx.rotate(q[1]);
        ctx.fillStyle = i % 2 ? design.board : '#ffffff'; rr(ctx, -44, -5, 88, 10, 2); ctx.fill();
        ctx.fillStyle = i % 2 ? '#fff' : design.board; ctx.fillText(String(ads[i]).slice(0, 16), 0, 0.5); ctx.restore();
      });
    }
    [[RW / 2, -BT / 2 - 2, 0], [RW / 2, RH + BT / 2 + 2, 0]].forEach(q => {
      ctx.fillStyle = '#fff'; rr(ctx, q[0] - 50, q[1] - 5, 100, 10, 2); ctx.fill();
      ctx.fillStyle = design.board; ctx.fillText(String(design.ad).slice(0, 18), q[0], q[1] + 0.5);
    });
    // ice edge shadow ring
    ctx.restore();
  }
  function pointOnRR(t, d) {
    // walk perimeter of rounded rect offset by d (clockwise from top-left straight)
    const r = CR + d, sw = RW - 2 * CR, sh = RH - 2 * CR, arc = Math.PI * r / 2;
    const per = 2 * sw + 2 * sh + 4 * arc; let u = t * per;
    const segs = [
      ['l', CR, -d, sw, 0], ['a', RW - CR, CR, -Math.PI / 2], ['l', RW + d, CR, 0, sh], ['a', RW - CR, RH - CR, 0],
      ['l', RW - CR, RH + d, -sw, 0], ['a', CR, RH - CR, Math.PI / 2], ['l', -d, RH - CR, 0, -sh], ['a', CR, CR, Math.PI]
    ];
    for (const sg of segs) {
      const len = sg[0] === 'l' ? Math.abs(sg[3] || sg[4]) : arc;
      if (u <= len) {
        if (sg[0] === 'l') { const f = u / len; return [sg[1] + sg[3] * f, sg[2] + sg[4] * f]; }
        const a = sg[3] + (u / len) * Math.PI / 2; return [sg[1] + Math.cos(a) * r, sg[2] + Math.sin(a) * r];
      }
      u -= len;
    }
    return [0, 0];
  }

  /* ---------- Sprites ---------- */
  function drawZamboni(ctx, x, y, a, skin, t, bladeW, cleaning) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = 'rgba(10,20,40,.25)'; rr(ctx, -36, -19, 74, 42, 12); ctx.fill();
    // conditioner (rear blade)
    ctx.fillStyle = '#4b5563'; rr(ctx, -40, -bladeW / 2, 10, bladeW, 3); ctx.fill();
    ctx.fillStyle = cleaning ? '#7dd3fc' : '#9ca3af'; ctx.fillRect(-39, -bladeW / 2 + 2, 2.5, bladeW - 4);
    // wheels
    ctx.fillStyle = '#111827';
    [[-22, -20], [-22, 15], [16, -20], [16, 15]].forEach(w => { rr(ctx, w[0], w[1], 13, 5, 2); ctx.fill(); });
    // body
    ctx.fillStyle = skin.body; rr(ctx, -32, -18, 64, 36, 9); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.2; ctx.stroke();
    // hopper (front)
    const hg = ctx.createLinearGradient(0, -16, 0, 16); hg.addColorStop(0, '#ffffff'); hg.addColorStop(1, skin.body);
    ctx.fillStyle = hg; rr(ctx, 2, -15, 28, 30, 6); ctx.fill();
    ctx.fillStyle = skin.trim; rr(ctx, 4, -13, 24, 26, 5); ctx.globalAlpha = 0.25; ctx.fill(); ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(16, 0); ctx.rotate(Math.PI / 2); ctx.fillStyle = skin.trim; ctx.font = '900 6.5px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ICELOCK', 0, 0); ctx.restore();
    // stripes
    ctx.fillStyle = skin.stripe; ctx.fillRect(-30, -18, 60, 3); ctx.fillRect(-30, 15, 60, 3);
    // cab / driver
    ctx.fillStyle = '#1f2937'; rr(ctx, -26, -11, 22, 22, 5); ctx.fill();
    ctx.fillStyle = '#f5d0b5'; ctx.beginPath(); ctx.arc(-14, 0, 6.5, 0, 7); ctx.fill();
    ctx.fillStyle = skin.trim; ctx.beginPath(); ctx.arc(-15, 0, 6.6, Math.PI * 0.5, Math.PI * 1.5); ctx.fill();
    ctx.fillRect(-9, -2.5, 4, 5);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-4, 0, 4, -1.2, 1.2); ctx.stroke();
    // headlights + beacon
    ctx.fillStyle = '#fff7c2'; [[30, -11], [30, 11]].forEach(h => { ctx.beginPath(); ctx.arc(h[0], h[1], 3, 0, 7); ctx.fill(); });
    const on = Math.sin(t * 10) > 0;
    ctx.fillStyle = on ? '#ffb020' : '#a16207'; ctx.beginPath(); ctx.arc(-28, 0, 3.2, 0, 7); ctx.fill();
    if (on) { ctx.fillStyle = 'rgba(255,176,32,.25)'; ctx.beginPath(); ctx.arc(-28, 0, 9, 0, 7); ctx.fill(); }
    ctx.restore();
  }

  function drawItem(ctx, it, t) {
    const b = Math.sin(t * 3 + it.x) * 1.5;
    ctx.save(); ctx.translate(it.x, it.y);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(2, 4, it.r, it.r * 0.5, 0, 0, 7); ctx.fill();
    ctx.translate(0, b * (it.type === 'nacho' ? 0 : 1)); ctx.rotate(it.rot || 0);
    if (it.type === 'puck') {
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill();
      ctx.strokeStyle = '#444'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(-3, -3, 2, 0, 7); ctx.fill();
    } else if (it.type === 'glove') {
      ctx.fillStyle = it.col || '#b91c1c'; rr(ctx, -9, -11, 18, 22, 6); ctx.fill();
      ctx.fillStyle = '#f5f5f4'; ctx.fillRect(-9, 6, 18, 5);
      ctx.fillStyle = 'rgba(0,0,0,.2)'; for (let i = 0; i < 3; i++) ctx.fillRect(-6 + i * 5, -10, 1.5, 12);
      ctx.fillStyle = it.col || '#b91c1c'; rr(ctx, 7, -4, 7, 10, 3); ctx.fill();
    } else if (it.type === 'hat') {
      ctx.fillStyle = it.col || '#1d4ed8'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 9, 8, 4, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(0, -1, 3, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * 2.1) * 9, Math.sin(i * 2.1) * 9); ctx.stroke(); }
    } else if (it.type === 'nacho') {
      ctx.fillStyle = '#f59e0b'; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283, r = 14 + (i % 2 ? 5 : 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(-2, -2, 9, 0, 7); ctx.fill();
      ctx.fillStyle = '#fde68a';
      [[-8, -6, 0.3], [4, 3, 2], [6, -8, 4]].forEach(c => { ctx.save(); ctx.translate(c[0], c[1]); ctx.rotate(c[2]); ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(5, 4); ctx.lineTo(-5, 4); ctx.closePath(); ctx.fill(); ctx.restore(); });
    } else if (it.type === 'octopus') {
      ctx.strokeStyle = '#8b2c8f'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + Math.sin(t * 4 + i) * 0.15; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(a + 0.4) * 9, Math.sin(a + 0.4) * 9, Math.cos(a) * 16, Math.sin(a) * 16); ctx.stroke(); }
      ctx.fillStyle = '#a63fa9'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-3, -2, 2.4, 0, 7); ctx.arc(3, -2, 2.4, 0, 7); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-3, -2, 1.1, 0, 7); ctx.arc(3, -2, 1.1, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  function drawPerson(ctx, x, y, a, jersey, helmet, kind, t, fallen) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a + (fallen ? t * 12 : 0));
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(3, 4, kind === 'mascot' ? 17 : 12, kind === 'mascot' ? 14 : 9, 0, 0, 7); ctx.fill();
    if (kind === 'mascot') {
      ctx.fillStyle = '#7c4a1e'; ctx.beginPath(); ctx.arc(-5, -12, 6, 0, 7); ctx.arc(-5, 12, 6, 0, 7); ctx.fill();
      ctx.fillStyle = jersey; ctx.beginPath(); ctx.ellipse(0, 0, 14, 16, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#8b5a2b'; ctx.beginPath(); ctx.arc(6, 0, 10, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(10, 0, 6, 3, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(9, -4, 1.6, 0, 7); ctx.arc(9, 4, 1.6, 0, 7); ctx.arc(15, 0, 2, 0, 7); ctx.fill();
    } else if (kind === 'player') {
      ctx.restore();
      IL.B.draw(ctx, x, y, 12, Object.assign(IL.B.look(Math.round(fallen ? 1 : x * 7 + y), 'player'), { body: jersey === '#ffffff' ? '#a0c4ff' : jersey, hatCol: helmet, t: t, walk: 0.3 }));
      return;
    } else {
      ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(4, 8); ctx.lineTo(22, 12); ctx.stroke();
      ctx.fillStyle = jersey; rr(ctx, -7, -10, 14, 20, 6); ctx.fill();
      ctx.fillStyle = helmet; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(3, -3, 2, 6);
    }
    ctx.restore();
  }

  return { pointOnRR, RW, RH, CR, BT, RES, rr, rinkPath, inside, rng, drawLogo, drawDesign, drawDirt, drawBackdrop, drawZamboni, drawItem, drawPerson, starPath, EMOJI_FONT };
})();
