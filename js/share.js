/* ICELOCK — grades, share card (canvas image), share text */
window.IL = window.IL || {};
IL.Share = (function () {
  const GV = { S: 4, A: 3, B: 2, C: 1 }, GL = ['C', 'C', 'B', 'A', 'S'];
  const GCOL = { S: '#ffcc33', A: '#7fd6ff', B: '#9be38a', C: '#c9b8a8' };
  function fmtTime(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function gradeJob(type, r, ev) {
    if (type === 'clear') { const k = r.time / Math.max(1, r.n); return k < 0.6 ? 'S' : k < 1 ? 'A' : k < 1.6 ? 'B' : 'C'; }
    if (type === 'fix') { const k = r.time / Math.max(1, r.n); return k < 1.8 ? 'S' : k < 2.8 ? 'A' : k < 4.2 ? 'B' : 'C'; }
    if (type === 'paint') return r.time < 14 ? 'S' : r.time < 20 ? 'A' : r.time < 30 ? 'B' : 'C';
    if (type === 'zamboni') return ['C', 'B', 'A', 'S'][r.stars];
    return 'B';
  }
  function overall(grades) {
    if (!grades.length) return 'C';
    const z = grades.find(g => g.type === 'zamboni');
    let avg = grades.reduce((a, g) => a + GV[g.grade], 0) / grades.length;
    if (z && z.grade === 'C') avg = Math.min(avg, 2);
    return GL[Math.round(avg + 0.001)];
  }
  function text(d) {
    if (d.flick) return IL.GAME_TITLE + ' | ' + (d.daily ? 'Daily #' + d.n : d.title) + ' | ' + d.grade + ' grade | ' + '★'.repeat(d.stars || 0) + (d.stars ? ' | ' : '') + d.score + ' pts';
    return IL.GAME_TITLE + ' | ICELOCK ' + (d.daily ? 'Daily #' + d.n : d.title) + ' | ' + d.grade + ' grade | ' + d.pct.toFixed(1) + '% | ' + fmtTime(d.time);
  }
  /* d: {title, daily, n, date, grade, score, pct, time, jobs:[{icon,name,grade}], vi, design} */
  function card(d) { return story(d); }
  function cardOld(d) {
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), R = IL.R;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#10141d'); bg.addColorStop(1, '#1c2333');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const glow = g.createRadialGradient(W * 0.75, 380, 20, W * 0.75, 380, 520); glow.addColorStop(0, 'rgba(255,170,60,.28)'); glow.addColorStop(1, 'rgba(255,170,60,0)');
    g.fillStyle = glow; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffb547'; g.font = '900 86px system-ui,Arial Black,sans-serif'; g.textBaseline = 'top'; g.fillText('ICELOCK', 64, 56);
    g.fillStyle = '#8b96a8'; g.font = '800 30px system-ui'; g.fillText('ZAMBONI SHIFT · RINK MANAGER', 68, 150);
    g.fillStyle = '#eef2f7'; g.font = '900 54px system-ui'; g.fillText(d.daily ? 'DAILY RINK #' + d.n : d.title.toUpperCase(), 64, 220);
    g.fillStyle = '#8b96a8'; g.font = '700 32px system-ui'; g.fillText(d.date + ' · ' + IL.VENUES[d.vi].name, 66, 286);
    // rink
    g.save(); g.translate(70, 360); const s = 0.98; g.scale(s, s);
    g.fillStyle = '#ffffff'; R.rr(g, -12, -12, R.RW + 24, R.RH + 24, R.CR + 12); g.fill();
    g.fillStyle = d.design.board; R.rr(g, -6, -6, R.RW + 12, R.RH + 12, R.CR + 6); g.fill();
    R.drawDesign(g, d.design);
    g.save(); R.rinkPath(g); g.clip();
    const sh = g.createLinearGradient(0, 0, R.RW, R.RH * 0.6); sh.addColorStop(0.3, 'rgba(255,255,255,0)'); sh.addColorStop(0.45, 'rgba(255,255,255,.45)'); sh.addColorStop(0.6, 'rgba(255,255,255,0)');
    g.fillStyle = sh; g.fillRect(0, 0, R.RW, R.RH);
    // dirt left over proportional to (100 - pct)
    const rr = R.rng(d.n || 3), miss = Math.round((100 - d.pct) * 3);
    g.fillStyle = 'rgba(180,190,205,.9)'; for (let i = 0; i < miss; i++) { g.beginPath(); g.arc(rr() * R.RW, rr() * R.RH, 4 + rr() * 10, 0, 7); g.fill(); }
    g.restore(); g.restore();
    // grade
    const gx = 700;
    g.textAlign = 'center'; g.fillStyle = GCOL[d.grade]; g.font = '900 360px system-ui,Arial Black,sans-serif';
    g.shadowColor = 'rgba(255,180,70,.5)'; g.shadowBlur = 40; g.fillText(d.grade, gx, 340); g.shadowBlur = 0;
    g.fillStyle = '#8b96a8'; g.font = '800 30px system-ui'; g.fillText('GRADE', gx, 700);
    const stat = (label, val, y) => { g.fillStyle = '#8b96a8'; g.font = '800 28px system-ui'; g.fillText(label, gx, y); g.fillStyle = '#eef2f7'; g.font = '900 62px system-ui'; g.fillText(val, gx, y + 34); };
    stat('SCORE', String(d.score), 760); stat('CLEAN', d.pct.toFixed(1) + '%', 880); stat('TIME', fmtTime(d.time), 1000);
    g.textAlign = 'left'; g.font = '800 30px system-ui';
    (d.jobs || []).forEach((j, i) => { const y = 1140 + i * 0, x = 450 + i * 150; g.fillStyle = GCOL[j.grade]; g.font = '900 44px system-ui'; g.fillText(j.grade, x + 54, 1120); g.font = '40px ' + R.EMOJI_FONT; g.fillText(j.icon, x, 1118); });
    // a couple of beer-league bubble guys cheering
    [[140, 1270, 1], [250, 1285, 2], [960, 1270, 3]].forEach(q => IL.B.draw(g, q[0], q[1], 46, Object.assign(IL.B.look(q[2] * 17, 'fan'), { t: 0.5, mood: 'cheer', emote: q[2] === 3 ? 'star' : 'heart', emoteT: 0.6 })));
    g.textAlign = 'center'; g.fillStyle = '#ffb547'; g.font = '900 34px system-ui'; g.fillText('Beat my ice.', W / 2 + 40, 1250);
    g.fillStyle = '#5d6678'; g.font = '700 22px system-ui'; g.fillText('virtual coins only · just for bragging rights', W / 2 + 40, 1300);
    return c;
  }
  /* 1080x1920 story card */
  function story(d) {
    const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), R = IL.R;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0f131c'); bg.addColorStop(1, '#1d2536'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const glow = g.createRadialGradient(W / 2, 760, 40, W / 2, 760, 700); glow.addColorStop(0, 'rgba(255,170,60,.3)'); glow.addColorStop(1, 'rgba(255,170,60,0)'); g.fillStyle = glow; g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; g.textBaseline = 'top';
    g.fillStyle = '#ffb547'; g.font = '900 84px system-ui,Arial Black,sans-serif'; wrap(g, IL.GAME_TITLE.toUpperCase(), W / 2, 110, 960, 92);
    g.fillStyle = '#8b96a8'; g.font = '800 34px system-ui'; g.fillText(d.flick ? 'BEER-LEAGUE TRICK SHOTS' : 'ICELOCK · ZAMBONI SIDE GIG', W / 2, 320);
    g.fillStyle = '#eef2f7'; g.font = '900 60px system-ui'; g.fillText(d.daily ? (d.flick ? 'DAILY LEVEL #' : 'DAILY RINK #') + d.n : d.title.toUpperCase(), W / 2, 400);
    g.fillStyle = '#8b96a8'; g.font = '700 34px system-ui'; g.fillText(d.date, W / 2, 478);
    // mini rink strip with the design
    g.save(); g.translate(W / 2 - R.RW * 0.75, 560); g.scale(1.5, 0.75);
    g.fillStyle = d.design.board; R.rr(g, -8, -8, R.RW + 16, R.RH + 16, R.CR + 8); g.fill(); R.drawDesign(g, d.design);
    g.save(); R.rinkPath(g); g.clip(); const sh = g.createLinearGradient(0, 0, R.RW, R.RH); sh.addColorStop(0.3, 'rgba(255,255,255,0)'); sh.addColorStop(0.45, 'rgba(255,255,255,.4)'); sh.addColorStop(0.6, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(0, 0, R.RW, R.RH); g.restore(); g.restore();
    g.fillStyle = 'rgba(15,19,28,.55)'; g.fillRect(0, 560, W, 540);
    g.fillStyle = GCOL[d.grade]; g.font = '900 420px system-ui,Arial Black,sans-serif'; g.shadowColor = 'rgba(255,180,70,.6)'; g.shadowBlur = 50; g.fillText(d.grade, W / 2, 600); g.shadowBlur = 0;
    if (d.stars != null) { g.font = '900 110px system-ui'; for (let i = 0; i < 3; i++) { g.fillStyle = i < d.stars ? '#ffd23f' : 'rgba(255,255,255,.18)'; g.fillText('★', W / 2 + (i - 1) * 130, 1110); } }
    g.fillStyle = '#8b96a8'; g.font = '800 34px system-ui'; g.fillText('SCORE', W / 2, 1260); g.fillStyle = '#fff'; g.font = '900 120px system-ui'; g.fillText(String(d.score), W / 2, 1300);
    const lines = d.lines || [['CLEAN', d.pct.toFixed(1) + '%'], ['TIME', fmtTime(d.time)]];
    lines.forEach((l, i) => { const x = W / 2 + (i - (lines.length - 1) / 2) * 240; g.fillStyle = '#8b96a8'; g.font = '800 26px system-ui'; g.fillText(l[0], x, 1470); g.fillStyle = '#eef2f7'; g.font = '900 56px system-ui'; g.fillText(String(l[1]), x, 1506); });
    [[150, 1790, 1], [290, 1810, 2], [930, 1790, 3], [800, 1815, 4]].forEach(q => IL.B.draw(g, q[0], q[1], 58, Object.assign(IL.B.look(q[2] * 17, 'fan'), { beard: q[2] % 2 === 1, t: 0.5, mood: 'cheer', emote: q[2] === 3 ? 'star' : 'heart', emoteT: 0.6 })));
    g.fillStyle = '#ffb547'; g.font = '900 44px system-ui'; g.fillText('Beat my shot.', W / 2, 1650);
    g.fillStyle = '#5d6678'; g.font = '700 24px system-ui'; g.fillText('virtual coins only · bragging rights only', W / 2, 1715);
    return c;
  }
  function wrap(g, text, x, y, maxW, lh) { const words = text.split(' '); let line = ''; for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); y += lh; line = w; } else line = t; } g.fillText(line, x, y); }
  return { gradeJob, overall, card, text, fmtTime, GCOL };
})();
