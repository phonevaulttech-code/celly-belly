/* ICELOCK Zamboni Shift — boot, shift flow (prep jobs -> Zamboni -> event), modes (normal/quick/daily),
   grades, personal bests, boss key, mute, crowd signs & bench chirps */
window.IL = window.IL || {};
IL.withSeed = function (seed, fn) { // deterministic setup for the Daily Rink (same layout for everyone)
  if (seed == null) return fn();
  const orig = Math.random; let s = seed >>> 0 || 1;
  Math.random = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  try { return fn(); } finally { Math.random = orig; }
};
IL.FX = (function () {
  const $ = (id) => document.getElementById(id);
  let t1 = 0, t2 = 0;
  function sign(text) {
    const el = $('sign'); el.querySelector('b').textContent = text || IL.SIGNS[(Math.random() * IL.SIGNS.length) | 0];
    el.className = 'show ' + (Math.random() < 0.5 ? 'left' : 'right');
    clearTimeout(t1); t1 = setTimeout(() => el.className = '', 2600);
  }
  function chirp(text) {
    const el = $('chirp'); el.textContent = text || IL.CHIRPS[(Math.random() * IL.CHIRPS.length) | 0];
    el.classList.add('show'); clearTimeout(t2); t2 = setTimeout(() => el.classList.remove('show'), 2400);
  }
  return { sign, chirp };
})();

IL.Main = (function () {
  const $ = (id) => document.getElementById(id);
  let shift = null, flavorT = 0;

  function renderSteps() {
    const el = $('steps'); el.innerHTML = '';
    shift.jobs.concat(shift.mode === 'quick' ? [] : ['event']).forEach((j, i) => {
      const s = document.createElement('span');
      s.className = 'step' + (i < shift.step ? ' done' : i === shift.step ? ' on' : '');
      s.textContent = j === 'event' ? '🏒' : IL.JOBS[j].icon; el.appendChild(s);
    });
    $('job-step').textContent = (shift.mode === 'daily' ? 'DAILY #' + shift.n + ' · ' : '') + (shift.step < shift.jobs.length ? 'Job ' + (shift.step + 1) + ' of ' + shift.jobs.length : 'Event time!');
  }

  /* mode: 'normal' | 'quick' | 'daily' */
  function startShift(vi, ei, mode) {
    mode = mode || 'normal';
    IL.Audio.resume(); IL.Audio.click();
    IL.Game.stop(); IL.Jobs.stop();
    let ev, seed = null, n = 0;
    if (mode === 'quick') { vi = IL.save.venue; ei = 1; ev = IL.quickEvent(vi); }
    else if (mode === 'daily') { const d = IL.dailyEvent(); vi = d.vi; ei = 1; ev = d.ev; seed = d.seed; n = d.n; }
    else ev = IL.VENUES[vi].events[ei];
    IL.activeEvent = mode === 'normal' ? null : ev;
    shift = { vi, ei, mode, ev, seed, n, jobs: ev.jobs.slice(), step: 0, res: {}, id: Math.random() };
    IL.save.last = { vi, ei, mode }; IL.persist();
    $('modal').classList.add('hidden'); $('pause').classList.add('hidden');
    IL.UI.show('game');
    next();
  }

  function next() {
    const s = shift; if (!s) return;
    renderSteps();
    if (s.step >= s.jobs.length) {
      if (s.mode === 'quick') return finishShift();
      const z = s.res.zamboni || { stars: 0 };
      IL.Jobs.run('event', s.vi, s.ei, { stars: z.stars }, () => { if (shift === s) finishShift(); });
      return;
    }
    const type = s.jobs[s.step], seed = s.seed == null ? null : s.seed + s.step * 101;
    if (type === 'zamboni') {
      IL.Jobs.stop();
      $('jobhud').classList.add('hidden'); $('hud').classList.remove('hidden');
      IL.withSeed(seed, () => IL.Game.start(s.vi, s.ei));
    } else {
      IL.withSeed(seed, () => IL.Jobs.run(type, s.vi, s.ei, {}, (res) => { if (shift !== s) return; s.res[type] = res; s.step++; next(); }));
    }
  }

  function onZamboniDone(res) {
    const s = shift; if (!s || IL.Game.state !== 'done') return;
    IL.Game.stop();
    s.res.zamboni = res; s.step++;
    $('hud').classList.add('hidden');
    next();
  }

  function finishShift() {
    const s = shift, res = s.res.zamboni, sv = IL.save, normal = s.mode === 'normal', key = normal ? IL.starKey(s.vi, s.ei) : s.mode;
    const prevStars = normal ? (sv.stars[key] || 0) : 0, newStars = normal ? Math.max(0, res.stars - prevStars) : 0;
    const mult = (1 + sv.rink.concessions * 0.15) * (IL.hasStaff('mo') ? 1.1 : 1);
    const timeBonus = res.stars > 0 ? Math.round(res.timeLeft) : 0;
    const jobs = []; let jobCoins = 0, score = 0, totalTime = 0;
    const GS = { S: 1000, A: 750, B: 500, C: 250 };
    s.jobs.forEach(type => {
      const r = s.res[type]; if (!r) return;
      const grade = IL.Share.gradeJob(type, r, s.ev);
      let label, c;
      if (type === 'clear') { c = Math.max(5, 25 - Math.floor(r.time)); label = 'Cleared ' + r.n + ' skaters in ' + r.time.toFixed(1) + 's'; totalTime += r.time; score += GS[grade] + Math.max(0, Math.round(300 - r.time * 20)); }
      if (type === 'fix') { c = r.n * 6; label = 'Patched ' + r.n + ' spots in ' + r.time.toFixed(1) + 's'; totalTime += r.time; score += GS[grade] + Math.max(0, Math.round(300 - r.time * 12)); }
      if (type === 'paint') { c = Math.round(20 + r.acc * 30); label = 'Painted the ice in ' + r.time.toFixed(1) + 's'; totalTime += r.time; score += GS[grade] + Math.max(0, Math.round(400 - r.time * 10)); }
      if (type === 'zamboni') { c = r.coins + timeBonus; label = 'Zamboni: ' + r.pct.toFixed(1) + '% clean'; totalTime += r.timeUsed; score += GS[grade] + r.score; }
      jobCoins += type === 'zamboni' ? 0 : c;
      jobs.push({ type, icon: IL.JOBS[type].icon, label, coins: c, grade });
    });
    const grade = IL.Share.overall(jobs);
    const coins = Math.round((res.coins + timeBonus + jobCoins + (res.perfect ? 30 : 0)) * mult);
    const prevBest = normal ? (sv.best[key] || 0) : 0;
    let rep = normal ? newStars * 10 + (res.stars > 0 ? 2 : 0) + (res.perfect && prevBest < 99.95 ? 8 : 0) + (s.res.paint && res.stars > 0 ? 3 : 0) : (res.stars > 0 ? 2 : 0);
    rep = Math.round(rep * (1 + IL.rinkBonus() * 0.05));
    const unlockedBefore = IL.VENUES.map((v, i) => IL.venueUnlocked(i));
    sv.coins += coins; sv.rep += rep;
    if (normal) { sv.stars[key] = Math.max(prevStars, res.stars); sv.best[key] = Math.max(prevBest, res.pct); }
    sv.stats.shifts++; sv.stats.hats += res.hats; sv.stats.pucks += res.pucks; if (res.perfect) sv.stats.perfects++;
    const pbKey = s.mode === 'daily' ? 'daily-' + IL.todayKey() : key;
    const prevPB = sv.pb[pbKey] || 0, isPB = score > prevPB;
    if (isPB) sv.pb[pbKey] = score;
    const run = { d: IL.todayKey(), n: s.n, mode: s.mode, title: s.mode === 'daily' ? 'Daily #' + s.n : s.ev.name, grade, pct: res.pct, time: totalTime, score };
    if (s.mode === 'daily') { sv.runs.push(run); sv.runs.sort((a, b) => b.score - a.score || a.time - b.time); sv.runs = sv.runs.slice(0, 25); }
    IL.persist();
    let note = '';
    const newly = IL.VENUES.findIndex((v, i) => IL.venueUnlocked(i) && !unlockedBefore[i]);
    if (newly >= 0) note = '🔓 New venue unlocked: ' + IL.VENUES[newly].name + '!';
    else if (res.stars === 0) note = 'Hit ' + s.ev.stars[0] + '% clean for a star. Long straight passes = slow-mo bonus.';
    else if (timeBonus) note = '⏱ Time bonus +' + timeBonus + (mult > 1 ? ' · bonus x' + mult.toFixed(2) : '');
    const share = { title: s.ev.name, daily: s.mode === 'daily', n: s.n, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), grade, score, pct: res.pct, time: totalTime, jobs: jobs.map(j => ({ icon: j.icon, grade: j.grade })), vi: s.vi, design: s.ev.design || IL.getPaintedDesign(s.vi) };
    IL.Main.lastShare = share;
    IL.Jobs.stop();
    IL.UI.showResults(res, { coins, rep, note, jobs, grade, score, isPB, prevPB, mode: s.mode, totalTime, share });
  }

  function quit() { if (IL.Flick.active) IL.Flick.stop(); shift = null; IL.activeEvent = null; IL.Game.stop(); IL.Jobs.stop(); $('pause').classList.add('hidden'); $('hud').classList.add('hidden'); }

  function pauseAny(force) {
    if (IL.UI.current !== 'game') return;
    if (IL.Jobs.active || IL.Flick.active) { if (force === true) $('pause').classList.remove('hidden'); else $('pause').classList.toggle('hidden'); }
    else IL.Game.togglePause(force);
  }
  function toggleMute() {
    IL.save.settings.mute = !IL.save.settings.mute; IL.Audio.setMuted(IL.save.settings.mute); IL.persist();
    document.querySelectorAll('.mute-btn').forEach(b => { b.textContent = IL.save.settings.mute ? '🔇' : '🔊'; b.classList.toggle('muted', IL.save.settings.mute); });
    IL.UI.toast(IL.save.settings.mute ? '🔇 Muted — stealth mode' : '🔊 Sound on');
  }
  function toggleStreamer() {
    const on = document.body.classList.toggle('streamer'); IL.save.settings.streamer = on; IL.persist();
    IL.UI.toast(on ? '🎥 Streamer mode: clean frame, big moments' : '🎥 Streamer mode off');
  }
  let bossOn = false;
  function toggleBoss() {
    bossOn = !bossOn;
    $('boss').classList.toggle('hidden', !bossOn);
    if (bossOn) { pauseAny(true); IL.Audio.setMuted(true); document.title = 'Q3_Forecast_FINAL_v7.xlsx'; }
    else { IL.Audio.setMuted(IL.save.settings.mute); document.title = IL.GAME_TITLE; }
  }

  function boot() {
    IL.Audio.setMuted(IL.save.settings.mute);
    IL.Game.init(onZamboniDone);
    IL.Jobs.init();
    IL.UI.bind();
    const pauseBtn = () => { IL.Audio.click(); pauseAny(); };
    $('btn-pause').onclick = pauseBtn; $('job-pause').onclick = pauseBtn; $('btn-resume').onclick = pauseBtn;
    $('btn-restart').onclick = () => { $('pause').classList.add('hidden'); if (IL.Flick.active) return IL.Flick.restart(); const s = shift; quit(); if (s) startShift(s.vi, s.ei, s.mode); };
    $('fh-pause').onclick = pauseBtn;
    document.querySelectorAll('.clip-btn').forEach(b => b.onclick = (e) => { e.stopPropagation(); IL.Clip.openClip(); });
    $('btn-streamer').onclick = () => toggleStreamer();
    $('btn-quit').onclick = () => { const wasFlick = IL.Flick.active; quit(); IL.UI.show(wasFlick ? 'home' : 'hub'); };
    $('btn-finish').onclick = () => { IL.Game.finish('early'); };
    $('res-retry').onclick = () => { const l = IL.save.last; startShift(l.vi, l.ei, l.mode); };
    $('res-hub').onclick = () => { IL.Audio.click(); IL.UI.show('hub'); };
    IL.Flick.init();
    document.title = IL.GAME_TITLE; document.querySelectorAll('.gt').forEach(e => e.textContent = IL.GAME_TITLE);
    if (IL.save.settings.streamer) document.body.classList.add('streamer');
    document.querySelectorAll('.mute-btn').forEach(b => b.onclick = (e) => { e.stopPropagation(); toggleMute(); });
    document.querySelectorAll('.boss-btn').forEach(b => b.onclick = (e) => { e.stopPropagation(); toggleBoss(); });
    $('boss').onclick = toggleBoss;
    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT') return;
      if (e.code === 'KeyB') toggleBoss();
      else if (e.code === 'KeyM') toggleMute();
      else if ((e.code === 'KeyP' || e.code === 'Escape') && IL.Jobs.active) pauseAny();
      else if (e.code === 'KeyS' && e.shiftKey) toggleStreamer();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pauseAny(true); });
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.querySelectorAll('.mute-btn').forEach(b => { b.textContent = IL.save.settings.mute ? '🔇' : '🔊'; b.classList.toggle('muted', IL.save.settings.mute); });
    // crowd signs + bench chirps while playing
    setInterval(() => {
      if (IL.UI.current !== 'game' || bossOn || !$('pause').classList.contains('hidden')) return;
      flavorT++;
      if (IL.Flick.active) { if (flavorT % 2 === 0) IL.FX.sign(); return; }
      if (flavorT % 3 === 0) IL.FX.sign(); else if (flavorT % 3 === 1 && IL.Game.state === 'play') IL.FX.chirp();
    }, 4200);
    IL.UI.show('home');
    IL.Intro.run();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  return { startShift, quit, toggleBoss, toggleMute, toggleStreamer, get shift() { return shift; }, get bossOn() { return bossOn; }, lastShare: null };
})();
/* test / debug hooks */
window.ICELOCK = {
  flick: () => IL.Flick.debug(), get title() { return IL.GAME_TITLE; },
  get state() { return IL.Game.state; }, get pct() { return IL.Game.pct; }, get screen() { return IL.UI.current; },
  get job() { return IL.Jobs.active ? IL.Jobs.type : (IL.Game.state !== 'idle' ? 'zamboni' : null); },
  get mode() { return IL.Main.shift ? IL.Main.shift.mode : null; },
  get timeLeft() { const s = IL.Game.session; return s ? s.timeLeft : null; },
  jobInfo: () => IL.Jobs.debug(),
  forceFinish: () => IL.Game.forceFinish(), debugFill: (f) => IL.Game.debugFill(f),
  start: (v, e, m) => IL.Main.startShift(v || 0, e || 0, m), save: () => IL.save,
  get boss() { return IL.Main.bossOn; }, get shareText() { return IL.UI.shareText; }
};
