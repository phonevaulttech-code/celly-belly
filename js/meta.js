/* Celly Belly — meta layer: coin shop (puck skins, stick tape, goal horns), weekly tournament with a
   local personal-best leaderboard + badges, and a rewarded-ad STUB. Virtual coins only; no real money, no IAP. */
window.IL = window.IL || {};

/* Leaderboard provider. Local today; to go online later, swap in an object with the same async API
   (e.g. IL.Leaderboard = IL.makeRemoteLeaderboard(url)) — callers only use submit() and top(). */
IL.LocalLeaderboard = {
  _all() { const s = IL.save.shoot = IL.save.shoot || {}; return (s.boards = s.boards || {}); },
  submit(board, entry) { const all = this._all(), list = all[board] = all[board] || []; list.push(entry); list.sort((a, b) => b.score - a.score); all[board] = list.slice(0, 10); IL.persist(); return Promise.resolve(all[board].indexOf(entry) + 1 || list.indexOf(entry) + 1); },
  top(board, n) { return Promise.resolve((this._all()[board] || []).slice(0, n || 10)); },
  rankSync(board, entry) { return (this._all()[board] || []).indexOf(entry) + 1 || 11; }
};
IL.Leaderboard = IL.Leaderboard || IL.LocalLeaderboard;

/* Rewarded ads: STUB. Replace IL.Ads.provider with a real SDK adapter exposing showRewarded(): Promise<boolean>. */
IL.Ads = {
  provider: null,
  showRewarded() {
    if (this.provider && this.provider.showRewarded) return this.provider.showRewarded();
    return new Promise(res => {   // fake 3-second placeholder, clearly labeled
      const el = document.getElementById('adstub'), c = document.getElementById('ad-count'); let n = 3;
      c.textContent = n; el.classList.remove('hidden');
      const iv = setInterval(() => { n--; c.textContent = n; if (n <= 0) { clearInterval(iv); el.classList.add('hidden'); res(true); } }, 1000);
    });
  }
};

IL.Meta = (function () {
  const $ = (id) => document.getElementById(id);
  let back = 'home', adBusy = false;
  const weekNumber = (d) => { d = d || new Date(); const s = new Date(2026, 0, 5); return Math.max(1, Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - s) / (7 * 864e5)) + 1); };
  const board = () => 'weekly-' + weekNumber();
  const BADGES = [{ id: 'b1', name: 'Bronze Bucket', icon: '🥉', test: e => e.score >= 1000 }, { id: 'b2', name: 'Silver Stick', icon: '🥈', test: e => e.score >= 2500 },
    { id: 'b3', name: 'Gold Glove', icon: '🥇', test: e => e.score >= 5000 }, { id: 'b4', name: 'Bar Down Artist', icon: '🔔', test: e => e.bars >= 2 }, { id: 'b5', name: 'Hot Streak', icon: '🔥', test: e => e.streak >= 8 }];
  function list() { return (IL.LocalLeaderboard._all()[board()] || []); }
  function weeklyBest() { const l = list(); return l.length ? l[0].score : 0; }
  function submitWeekly(score, extra) {
    const e = Object.assign({ score, at: Date.now() }, extra || {});
    IL.Leaderboard.submit(board(), e);
    const s = IL.save.shoot; s.badges = s.badges || {}; BADGES.forEach(b => { if (b.test(e) && !s.badges[b.id]) s.badges[b.id] = weekNumber(); }); IL.persist();
    return IL.LocalLeaderboard.rankSync(board(), e);
  }
  function openWeekly() {
    if (IL.Shoot.active) IL.Shoot.stop(true);
    IL.UI.show('weekly');
    const n = weekNumber(), now = new Date(), end = new Date(2026, 0, 5 + n * 7), days = Math.max(1, Math.ceil((end - now) / 864e5));
    $('wk-title').textContent = 'Tournament #' + n; $('wk-left').textContent = days + 'd left';
    IL.Leaderboard.top(board(), 5).then(l => {
      $('wk-board').innerHTML = l.length ? l.map((e, i) => '<li><b>' + (i + 1) + '</b><span>' + new Date(e.at).toLocaleDateString('en-US', { weekday: 'short' }) + ' · streak ' + (e.streak || 0) + '</span><em>' + e.score.toLocaleString() + '</em></li>').join('') : '<li class="empty">No runs yet this week. Set the bar.</li>';
    });
    const got = (IL.save.shoot && IL.save.shoot.badges) || {};
    $('wk-badges').innerHTML = BADGES.map(b => '<span class="badge' + (got[b.id] ? ' on' : '') + '" title="' + b.name + '">' + b.icon + '<small>' + b.name + '</small></span>').join('');
  }
  function horn() {
    const h = IL.Shoot.skin('horn').id, A = IL.Audio;
    if (h === 'h1') { A.goalHorn(); setTimeout(() => A.goalHorn(), 380); } else if (h === 'h2') { A.horn(); A.goalHorn(); } else if (h === 'h3') A.organ(); else A.goalHorn();
  }
  const KIND = { puck: 'Puck', tape: 'Stick tape', horn: 'Goal horn' };
  function openShop(from) {
    back = from || back; if (IL.Shoot.active) IL.Shoot.stop(true); IL.UI.show('store'); sel = null; renderShop(); adButton();
  }
  let sel = null;
  function renderShop() {
    const ss = IL.Shoot.skinSave(), grid = $('st-grid'); grid.innerHTML = ''; $('st-coins').textContent = '🪙 ' + IL.save.coins.toLocaleString(); ss.seen = ss.seen || [];
    ['puck', 'tape', 'horn'].forEach(kind => IL.Shoot.SKINS[kind].forEach(it => {
      const own = ss.owned.indexOf(it.id) >= 0, on = ss[kind] === it.id, b = document.createElement('button');
      const isNew = !own && ss.seen.indexOf(it.id) < 0 && IL.save.coins >= it.price;
      b.className = 'skin' + (on ? ' on' : '') + (sel && sel.it.id === it.id ? ' sel' : ''); b.dataset.id = it.id;
      const sw = kind === 'puck' ? '<i class="sw puck" style="background:' + it.top + ';border-color:' + it.col + '"></i>' : kind === 'tape' ? '<i class="sw tape" style="background:' + it.col + '"></i>' : '<i class="sw horn">📯</i>';
      b.innerHTML = (isNew ? '<em class="newb">NEW</em>' : '') + sw + '<b>' + it.name + '</b><small class="k">' + KIND[kind] + '</small><small>' + (on ? 'Equipped' : own ? 'Equip' : '🪙 ' + it.price) + '</small>';
      b.onmouseenter = () => preview(kind, it, false);
      b.onclick = () => { if (own) { IL.Audio.click(); ss[kind] = it.id; IL.persist(); preview(kind, it, true); renderShop(); if (kind === 'horn') horn(); } else preview(kind, it, true); };
      grid.appendChild(b);
    }));
    if (!sel) preview('puck', IL.Shoot.skin('puck'), false);
  }
  // preview pane: shows the puck on the ice or the taped blade; tap to select, then BUY
  function preview(kind, it, pick) {
    const ss = IL.Shoot.skinSave(), own = ss.owned.indexOf(it.id) >= 0;
    if (ss.seen.indexOf(it.id) < 0) { ss.seen.push(it.id); IL.persist(); }
    if (pick) { sel = { kind, it }; document.querySelectorAll('#st-grid .skin').forEach(e => e.classList.toggle('sel', e.dataset.id === it.id)); const nb = document.querySelector('#st-grid .skin[data-id="' + it.id + '"] .newb'); if (nb) nb.remove(); }
    const c = $('st-pv'), g = c.getContext('2d'), w = c.width, h = c.height; g.clearRect(0, 0, w, h);
    const ice = g.createLinearGradient(0, 0, 0, h); ice.addColorStop(0, '#bfe6ff'); ice.addColorStop(1, '#ffffff'); g.fillStyle = ice; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(232,17,45,.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, h * 0.82); g.lineTo(w, h * 0.82); g.stroke();
    const pk = kind === 'puck' ? it : IL.Shoot.skin('puck'), tp = kind === 'tape' ? it : IL.Shoot.skin('tape');
    g.save(); g.translate(w * 0.36, h * 0.62); g.rotate(-0.12); g.fillStyle = '#20242c'; g.beginPath(); IL.R.rr(g, -70, -14, 110, 28, 8); g.fill(); g.fillStyle = tp.col; g.fillRect(-48, -14, 44, 28); g.strokeStyle = '#2b2f38'; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(-70, 0); g.lineTo(-130, -90); g.stroke(); g.restore();
    const px = w * 0.72, py = h * 0.62; g.fillStyle = 'rgba(10,20,60,.25)'; g.beginPath(); g.ellipse(px + 4, py + 16, 34, 9, 0, 0, 7); g.fill();
    g.fillStyle = pk.col; g.beginPath(); g.ellipse(px, py + 8, 30, 12, 0, 0, 7); g.fill(); g.fillRect(px - 30, py - 4, 60, 12); g.fillStyle = pk.top; g.beginPath(); g.ellipse(px, py - 4, 30, 12, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(px - 9, py - 7, 9, 3, 0, 0, 7); g.fill();
    if (kind === 'horn') { g.font = '40px system-ui'; g.textAlign = 'center'; g.fillText('📯', w * 0.5, h * 0.3); }
    $('st-pv-name').textContent = it.name + (own ? (ss[kind] === it.id ? ' · equipped' : ' · owned') : '');
    const buy = $('st-buy'); buy.classList.toggle('hidden', own || !pick);
    if (!own && pick) { const can = IL.save.coins >= it.price; buy.textContent = can ? 'BUY · 🪙 ' + it.price : 'NEED 🪙 ' + (it.price - IL.save.coins) + ' MORE'; buy.disabled = !can;
      buy.onclick = () => { if (IL.save.coins < it.price) return; IL.save.coins -= it.price; ss.owned.push(it.id); ss[kind] = it.id; IL.persist(); IL.Audio.purchase(); IL.UI.toast('Unlocked ' + it.name + '!'); renderShop(); preview(kind, it, true); if (kind === 'horn') horn(); }; }
    if (pick && kind === 'horn') horn();
  }
  /* coin-earned toast (virtual coins) */
  function coinToast(n) { if (!n) return; const el = $('cointoast'); el.textContent = '+' + n + ' 🪙'; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); IL.Audio.coin(); }
  /* rewarded-ad placeholder, capped at 5 per day */
  const AD_CAP = 5;
  function adState() { const s = IL.save.shoot = IL.save.shoot || {}, k = dkey(new Date()); if (!s.ads || s.ads.day !== k) s.ads = { day: k, n: 0 }; return s.ads; }
  function adButton() { const a = adState(), b = $('st-ad'); if (!b) return; b.disabled = a.n >= AD_CAP; b.innerHTML = a.n >= AD_CAP ? 'Ad limit reached — back tomorrow <small>(5/5 today)</small>' : '▶ Watch ad for 50 🪙 <small>(placeholder · ' + a.n + '/' + AD_CAP + ' today)</small>'; }
  function watchAd() {
    const a = adState(); if (adBusy || a.n >= AD_CAP) return; adBusy = true;
    IL.Ads.showRewarded().then(ok => { adBusy = false; if (ok) { a.n++; IL.save.coins += 50; IL.persist(); coinToast(50); renderShop(); adButton(); } });
  }
  /* daily login coins (virtual), with a small day-streak bonus */
  const LOGIN = [20, 30, 40, 50, 60, 70, 100];   // 7-day login calendar (repeats)
  const dkey = (d) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  function loginBonus() {
    const s = IL.save.shoot = IL.save.shoot || {}, L = s.login = s.login || { last: '', days: 0 }, today = dkey(new Date()), yest = dkey(new Date(Date.now() - 864e5));
    const el = $('login-bonus'); if (!el) return;
    if (L.last === today) { el.classList.add('hidden'); return; }
    const days = L.last === yest ? L.days + 1 : 1, di = (days - 1) % 7, amt = LOGIN[di];
    $('lb-cal').innerHTML = LOGIN.map((a, i) => '<i class="' + (i < di ? 'got' : i === di ? 'now' : '') + '"><b>D' + (i + 1) + '</b>' + a + '</i>').join('');
    $('lb-txt').textContent = '🎁 Daily bonus +' + amt + ' 🪙' + (days > 1 ? ' · day ' + days + ' streak' : '');
    el.classList.remove('hidden');
    $('lb-claim').onclick = () => { L.last = today; L.days = days; IL.save.coins += amt; IL.persist(); el.classList.add('hidden'); coinToast(amt); $('home-coins').textContent = '🪙 ' + IL.save.coins.toLocaleString(); };
  }
  function init() {
    $('st-back').onclick = () => { IL.Audio.click(); if (back === 'pints-path') IL.Shoot.openPints(); else IL.UI.show('home'); };
    $('st-ad').onclick = watchAd;
    $('wk-back').onclick = () => { IL.Audio.click(); IL.UI.show('home'); };
    $('wk-go').onclick = () => { IL.Audio.click(); IL.Shoot.start('weekly'); };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  return { coinToast, AD_CAP, adState, loginBonus, weekNumber, weeklyBest, submitWeekly, openWeekly, openShop, horn, BADGES, board };
})();
