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
    back = from || back; if (IL.Shoot.active) IL.Shoot.stop(true); IL.UI.show('store'); renderShop();
  }
  function renderShop() {
    const ss = IL.Shoot.skinSave(), grid = $('st-grid'); grid.innerHTML = ''; $('st-coins').textContent = '🪙 ' + IL.save.coins.toLocaleString();
    ['puck', 'tape', 'horn'].forEach(kind => IL.Shoot.SKINS[kind].forEach(it => {
      const own = ss.owned.indexOf(it.id) >= 0, on = ss[kind] === it.id, b = document.createElement('button');
      b.className = 'skin' + (on ? ' on' : ''); b.dataset.id = it.id;
      const sw = kind === 'puck' ? '<i class="sw puck" style="background:' + it.top + ';border-color:' + it.col + '"></i>' : kind === 'tape' ? '<i class="sw tape" style="background:' + it.col + '"></i>' : '<i class="sw horn">📯</i>';
      b.innerHTML = sw + '<b>' + it.name + '</b><small class="k">' + KIND[kind] + '</small><small>' + (on ? 'Equipped' : own ? 'Equip' : '🪙 ' + it.price) + '</small>';
      b.onclick = () => {
        if (!own) { if (IL.save.coins < it.price) { IL.UI.toast('Need 🪙 ' + (it.price - IL.save.coins) + ' more'); return; } IL.save.coins -= it.price; ss.owned.push(it.id); IL.Audio.purchase(); }
        else IL.Audio.click();
        ss[kind] = it.id; IL.persist(); renderShop(); if (kind === 'horn') horn();
      };
      grid.appendChild(b);
    }));
  }
  function watchAd() {
    if (adBusy) return; adBusy = true;
    IL.Ads.showRewarded().then(ok => { adBusy = false; if (ok) { IL.save.coins += 50; IL.persist(); IL.Audio.coin(); IL.UI.toast('+50 🪙'); renderShop(); } });
  }
  function init() {
    $('st-back').onclick = () => { IL.Audio.click(); if (back === 'pints-path') IL.Shoot.openPints(); else IL.UI.show('home'); };
    $('st-ad').onclick = watchAd;
    $('wk-back').onclick = () => { IL.Audio.click(); IL.UI.show('home'); };
    $('wk-go').onclick = () => { IL.Audio.click(); IL.Shoot.start('weekly'); };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  return { weekNumber, weeklyBest, submitWeekly, openWeekly, openShop, horn, BADGES, board };
})();
