/* ICELOCK Zamboni Shift — WebAudio SFX (adapted from zamboni-triumph) */
window.IL = window.IL || {};
IL.Audio = (function () {
  let actx = null, master = null, sfxG = null, musicG = null;
  let eng = null, engG = null, scrub = null, scrubG = null, scrubF = null;
  let muted = false;

  function ensure() {
    if (actx) return;
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      master = actx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(actx.destination);
      sfxG = actx.createGain(); sfxG.gain.value = 0.45; sfxG.connect(master);
      musicG = actx.createGain(); musicG.gain.value = 0.25; musicG.connect(master);
    } catch (e) { actx = null; }
  }
  function resume() { ensure(); if (actx && actx.state === 'suspended') actx.resume(); }
  function setMuted(m) { muted = !!m; if (master) master.gain.value = muted ? 0 : 1; }

  function beep(freq, dur, type, vol, slide, dest, delay) {
    if (!actx) return;
    const t0 = actx.currentTime + (delay || 0);
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.linearRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(vol || 0.08, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(dest || sfxG); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol, hp, lp, delay) {
    if (!actx) return;
    const t0 = actx.currentTime + (delay || 0);
    const b = actx.createBuffer(1, Math.max(1, actx.sampleRate * dur | 0), actx.sampleRate);
    const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = actx.createBufferSource(); s.buffer = b;
    const g = actx.createGain(); g.gain.setValueAtTime(vol || 0.1, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    let n = s;
    if (hp) { const f = actx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; n.connect(f); n = f; }
    if (lp) { const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; n.connect(f); n = f; }
    n.connect(g); g.connect(sfxG); s.start(t0);
  }
  const A = {};
  A.click = () => { resume(); beep(560, 0.04, 'square', 0.04); beep(840, 0.03, 'sine', 0.03); };
  A.pickup = () => { resume(); beep(880, 0.07, 'sine', 0.06); beep(1320, 0.09, 'sine', 0.05, 0, null, 0.05); };
  A.coin = () => { resume(); beep(1046, 0.05, 'square', 0.03); beep(1568, 0.08, 'square', 0.025, 0, null, 0.04); };
  A.combo = (n) => { resume(); beep(500 + Math.min(n, 12) * 60, 0.08, 'triangle', 0.05); };
  A.lane = () => { resume(); [659, 880, 1175].forEach((f, i) => beep(f, 0.12, 'triangle', 0.06, 0, null, i * 0.06)); };
  A.bump = () => { resume(); noise(0.18, 0.16, 60, 700); beep(80, 0.16, 'triangle', 0.1, 45); };
  A.squish = () => { resume(); beep(300, 0.15, 'sine', 0.07, 120); noise(0.12, 0.05, 400, 2000); };
  A.horn = () => { resume(); [220, 277, 330].forEach(f => beep(f, 0.9, 'sawtooth', 0.04)); };
  A.countdown = (n) => { resume(); if (n > 0) beep(440, 0.12, 'square', 0.07); else { beep(880, 0.3, 'square', 0.09); beep(1320, 0.2, 'sine', 0.05); } };
  A.cheer = (big) => { resume(); noise(big ? 1.4 : 0.8, big ? 0.12 : 0.07, 300, 3000); beep(220, 0.4, 'sawtooth', 0.02, 330); };
  A.boo = () => { resume(); beep(150, 0.7, 'sawtooth', 0.04, 110); beep(158, 0.7, 'sawtooth', 0.03, 104); noise(0.6, 0.04, 100, 600); };
  A.laugh = () => { resume(); [0, 0.12, 0.24, 0.36].forEach(d => beep(330 - d * 100, 0.09, 'triangle', 0.04, 0, null, d)); noise(0.5, 0.04, 400, 2500); };
  A.organ = () => { resume(); [392, 523, 659, 784, 659, 784].forEach((f, i) => beep(f, i === 5 ? 0.4 : 0.14, 'square', 0.035, 0, musicG, i * 0.15)); };
  A.star = (i) => { resume(); beep([659, 784, 1046][i] || 1046, 0.22, 'triangle', 0.08); };
  A.win = () => { resume(); [392, 523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => beep(f, 0.16, 'triangle', 0.07, 0, null, i * 0.1)); noise(0.5, 0.06, 350, 4000, 0.2); };
  A.purchase = () => { resume(); [659, 784, 1046].forEach((f, i) => beep(f, 0.1, 'sine', 0.07, 0, null, i * 0.06)); };
  A.splat = () => { resume(); noise(0.25, 0.1, 200, 1500); beep(200, 0.12, 'sine', 0.05, 90); };
  A.water = () => { resume(); noise(0.4, 0.06, 1500, 6000); };
  A.warn = () => { resume(); beep(600, 0.1, 'square', 0.05); beep(450, 0.14, 'square', 0.05, 0, null, 0.12); };

  A.whistle = () => { resume(); for (let i = 0; i < 3; i++) beep(2400 + (i % 2) * 300, 0.07, 'square', 0.035, 0, null, i * 0.07); beep(2600, 0.25, 'sine', 0.04, 2300, null, 0.21); };
  A.pop = (n) => { resume(); beep(500 + Math.min(n || 0, 14) * 45, 0.08, 'sine', 0.07, 900 + Math.min(n || 0, 14) * 45); };
  function sweep(dur, vol, f0, f1, q) { // filtered-noise sweep: ASMR-ish scrape / brush / water
    if (!actx) return; const t0 = actx.currentTime;
    const b = actx.createBuffer(1, Math.max(1, actx.sampleRate * dur | 0), actx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / 90));
    const s = actx.createBufferSource(); s.buffer = b;
    const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q || 1.2; f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(sfxG); s.start(t0);
  }
  A.scrape = () => { resume(); sweep(0.16, 0.09, 5200, 2400, 2.5); };
  A.brush = () => { resume(); sweep(0.22, 0.05, 900, 1800, 0.8); };
  A.water = () => { resume(); sweep(0.5, 0.06, 1400, 3200, 3); sweep(0.35, 0.04, 2600, 1800, 4); };
  A.slowmo = () => { resume(); beep(70, 0.6, 'sine', 0.16, 38); sweep(0.7, 0.07, 4000, 300, 1); };
  A.squawk = () => { resume(); beep(900, 0.12, 'sawtooth', 0.05, 1400); beep(1300, 0.14, 'sawtooth', 0.04, 700, null, 0.12); };
  A.tick = () => { resume(); beep(1800, 0.025, 'square', 0.02); };
  A.grade = (g) => { resume(); const n = { S: [523, 659, 784, 1046, 1318], A: [523, 659, 784, 1046], B: [440, 554, 659], C: [330, 392] }[g] || [440]; n.forEach((f, i) => beep(f, 0.14, 'triangle', 0.07, 0, null, i * 0.08)); };
  A.bossOn = () => { resume(); beep(1200, 0.03, 'sine', 0.03); };
  A.startEngine = function () {
    resume(); if (!actx || eng) return;
    eng = actx.createOscillator(); eng.type = 'sawtooth'; eng.frequency.value = 50;
    const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
    engG = actx.createGain(); engG.gain.value = 0.03;
    eng.connect(f); f.connect(engG); engG.connect(sfxG); eng.start();
    const buf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    scrub = actx.createBufferSource(); scrub.buffer = buf; scrub.loop = true;
    scrubF = actx.createBiquadFilter(); scrubF.type = 'bandpass'; scrubF.frequency.value = 3200; scrubF.Q.value = 0.9;
    try { const lfo = actx.createOscillator(), lg = actx.createGain(); lfo.frequency.value = 0.7; lg.gain.value = 900; lfo.connect(lg); lg.connect(scrubF.frequency); lfo.start(); } catch (e) {}
    scrubG = actx.createGain(); scrubG.gain.value = 0;
    scrub.connect(scrubF); scrubF.connect(scrubG); scrubG.connect(sfxG); scrub.start();
  };
  A.updateEngine = function (speed01, cleaning) {
    if (!eng || !actx) return; const t = actx.currentTime;
    eng.frequency.setTargetAtTime(48 + speed01 * 45, t, 0.08);
    engG.gain.setTargetAtTime(0.025 + speed01 * 0.03, t, 0.08);
    scrubG.gain.setTargetAtTime(cleaning ? 0.05 * speed01 + 0.01 : 0, t, 0.06);
  };
  A.stopEngine = function () {
    try { eng && eng.stop(); } catch (e) {} try { scrub && scrub.stop(); } catch (e) {}
    eng = engG = scrub = scrubG = null;
  };
  A.slap = (k) => { resume(); noise(0.07, 0.22 * (0.5 + k), 900, 5000); beep(160, 0.08, 'triangle', 0.12, 70); sweep(0.25, 0.05 + k * 0.05, 2500, 600, 1); };
  A.tink = () => { resume(); beep(2100 + Math.random() * 500, 0.12, 'triangle', 0.07); beep(3300, 0.06, 'sine', 0.03); noise(0.05, 0.06, 2500, 8000); };
  A.thunk = () => { resume(); beep(110, 0.14, 'sine', 0.2, 55); noise(0.08, 0.12, 120, 1400); };
  A.board = (k) => { resume(); noise(0.12, 0.08 + 0.12 * Math.min(1, k), 80, 900); beep(90, 0.1, 'sine', 0.1, 50); };
  A.shatter = () => { resume(); noise(0.45, 0.2, 2500, 12000); for (let i = 0; i < 6; i++) beep(2500 + Math.random() * 3000, 0.06, 'triangle', 0.04, 0, null, i * 0.035); };
  A.ping = () => { resume(); beep(2637, 1.1, 'sine', 0.13); beep(3951, 0.7, 'sine', 0.05); beep(5274, 0.3, 'sine', 0.025); };
  A.goalHorn = () => { resume(); [174, 220, 261].forEach(f => beep(f, 1.0, 'sawtooth', 0.045)); noise(1.2, 0.08, 400, 3000); };
  A.haptic = (p) => { try { navigator.vibrate && navigator.vibrate(p || 12); } catch (e) {} };
  A.ensure = ensure; A.resume = resume; A.setMuted = setMuted;
  return A;
})();
