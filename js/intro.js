/* ICELOCK — cold open: spotlight, PA announcer, Zamboni entrance, ridiculous loading tip */
window.IL = window.IL || {};
IL.Intro = (function () {
  const TIPS = ['Tip: Don\'t hit the goalie. Again.', 'Tip: The mascot is not a traffic cone.', 'Tip: Nachos are not a lubricant.', 'Tip: Flick up. Bend it with a curve. Bank it off the boards.',
    'Tip: Gary from the beer league will never leave the ice voluntarily.', 'Tip: Straight passes = slow-mo glory.', 'Tip: Press B if your boss walks by. We\'ve all been there.', 'Tip: A seagull is not a hat trick.'];
  const LINES = ['Ladies and gentlemen...', 'from the bottom of the beer league...', 'the TOP SHELF.'];
  let raf = 0;
  function run(done) {
    let seen = false; try { seen = sessionStorage.getItem('il.intro') === '1'; } catch (e) {}
    const el = document.getElementById('intro');
    if (seen) { el.remove(); return done && done(); }
    try { sessionStorage.setItem('il.intro', '1'); } catch (e) {}
    document.getElementById('intro-tip').textContent = TIPS[(Math.random() * TIPS.length) | 0];
    const c = document.getElementById('intro-canvas'), g = c.getContext('2d');
    const t0 = performance.now(), mascot = Object.assign(IL.B.look(21, 'fan'), { beard: true, dad: true, hat: 'backcap', hatCol: '#ffb547', body: '#e07a5f', jersey: '#3d5a80', num: 99, mood: 'cheer' });
    const skin = IL.SKINS[0];
    function frame() {
      const t = (performance.now() - t0) / 1000, dpr = Math.min(2, devicePixelRatio || 1);
      const W = c.clientWidth, H = c.clientHeight; if (c.width !== W * dpr) { c.width = W * dpr; c.height = H * dpr; }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = '#07090e'; g.fillRect(0, 0, W, H);
      // ice strip
      const iy = H * 0.62, ih = 120;
      g.fillStyle = '#9aa7b8'; g.fillRect(0, iy, W, ih);
      for (let i = 0; i < 60; i++) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.beginPath(); const x = (i * 53) % W, y = iy + (i * 37) % ih; g.moveTo(x, y); g.lineTo(x + 30, y + 6); g.stroke(); }
      // zamboni enters, leaving glossy mirror ice
      const zx = -80 + Math.min(1, Math.max(0, (t - 0.6) / 2.4)) * (W + 160);
      const cg = g.createLinearGradient(0, iy, 0, iy + ih); cg.addColorStop(0, '#f4fbff'); cg.addColorStop(0.5, '#d4ecff'); cg.addColorStop(1, '#f4fbff');
      g.fillStyle = cg; g.fillRect(0, iy + 18, Math.max(0, zx - 40), ih - 36);
      g.fillStyle = 'rgba(255,200,120,.35)'; g.fillRect(0, iy + 46, Math.max(0, zx - 40), 6);
      g.fillStyle = '#d62839'; g.fillRect(W * 0.5 - 5, iy + 18, 10, ih - 36);
      g.save(); g.translate(zx, iy + ih / 2); g.scale(1.6, 1.6); IL.R.drawZamboni(g, 0, 0, 0, skin, t, 50, true); g.restore();
      // spotlights
      [0, 1].forEach(k => {
        const sx = W * (0.5 + Math.sin(t * 1.3 + k * 2) * 0.35);
        const sg = g.createRadialGradient(sx, iy + ih / 2, 5, sx, iy + ih / 2, 160); sg.addColorStop(0, 'rgba(255,230,180,.35)'); sg.addColorStop(1, 'rgba(255,230,180,0)');
        g.fillStyle = sg; g.fillRect(0, 0, W, H);
      });
      // mascot in the stands
      IL.B.draw(g, W * 0.8, iy - 40, 30, Object.assign(mascot, { t, walk: 0.4, emote: t > 2.6 ? 'hearts' : 'bang', emoteT: t % 1.4 }));
      // PA lines
      g.textAlign = 'center'; g.fillStyle = '#ffb547'; g.font = '900 13px system-ui'; g.fillText('📢 PA ANNOUNCER', W / 2, H * 0.2);
      LINES.forEach((ln, i) => {
        const k = Math.min(1, Math.max(0, (t - i * 0.8) / 0.6)); if (!k) return;
        g.globalAlpha = k; g.fillStyle = i === 2 ? '#fff' : '#c9d2df'; g.font = (i === 2 ? '900 30px' : '700 20px') + ' system-ui';
        g.fillText(ln.slice(0, Math.ceil(ln.length * k)), W / 2, H * 0.27 + i * 36); g.globalAlpha = 1;
      });
      if (t > 3) document.getElementById('intro').classList.add('ready');
      raf = requestAnimationFrame(frame);
    }
    frame();
    const go = () => { cancelAnimationFrame(raf); IL.Audio.resume(); IL.Audio.horn(); IL.Audio.cheer(true); el.classList.add('out'); setTimeout(() => el.remove(), 450); done && done(); };
    el.addEventListener('click', go, { once: true });
    setTimeout(() => IL.Audio.organ && 0, 0);
  }
  return { run };
})();
