/* ICELOCK Zamboni Shift — localStorage persistence */
window.IL = window.IL || {};
IL.SAVE_KEY = 'icelock.zamboni.v1';

IL.defaultSave = function () {
  return {
    v: 1, coins: 120, rep: 0, day: 1, venue: 0,
    stars: {}, best: {},
    up: { blade: 0, speed: 0, tank: 0 },
    skins: { owned: ['classic'], sel: 'classic' },
    rink: { lights: 0, scoreboard: 0, seats: 0, concessions: 0, music: 0 },
    designs: {}, painted: {}, staff: {}, pb: {}, runs: [], last: null,
    settings: { mute: false },
    lastDaily: '', dailyStreak: 0,
    stats: { shifts: 0, perfects: 0, hats: 0, pucks: 0 }
  };
};

IL.todayKey = function () {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

IL.load = function () {
  const base = IL.defaultSave();
  try {
    const raw = localStorage.getItem(IL.SAVE_KEY);
    if (!raw) return base;
    const d = JSON.parse(raw);
    return Object.assign(base, d, {
      up: Object.assign(base.up, d.up || {}),
      skins: Object.assign(base.skins, d.skins || {}),
      rink: Object.assign(base.rink, d.rink || {}),
      settings: Object.assign(base.settings, d.settings || {}),
      stats: Object.assign(base.stats, d.stats || {}),
      designs: d.designs || {}, painted: d.painted || {}, staff: d.staff || {}, pb: d.pb || {}, runs: d.runs || [], stars: d.stars || {}, best: d.best || {}
    });
  } catch (e) { return base; }
};

IL.persist = function () {
  try { localStorage.setItem(IL.SAVE_KEY, JSON.stringify(IL.save)); } catch (e) {}
};

IL.getDesign = function (vi) {
  const v = IL.VENUES[vi];
  return Object.assign({}, v.design, IL.save.designs[v.id] || {});
};
IL.getPaintedDesign = function (vi) {
  const v = IL.VENUES[vi], p = IL.save.painted[v.id];
  return p ? Object.assign({}, v.design, p) : IL.getDesign(vi);
};
IL.paintPending = function (vi) {
  const p = IL.save.painted[IL.VENUES[vi].id]; if (!p) return false;
  return JSON.stringify(Object.assign({}, IL.VENUES[vi].design, p)) !== JSON.stringify(IL.getDesign(vi));
};
IL.hasStaff = (id) => !!IL.save.staff[id];
IL.setDesign = function (vi, d) {
  IL.save.designs[IL.VENUES[vi].id] = Object.assign({}, d);
  IL.persist();
};

IL.starKey = (vi, ei) => vi + '-' + ei;
IL.venueStars = function (vi) {
  let s = 0; for (let i = 0; i < 3; i++) s += IL.save.stars[IL.starKey(vi, i)] || 0; return s;
};
IL.totalStars = function () { let s = 0; for (let v = 0; v < IL.VENUES.length; v++) s += IL.venueStars(v); return s; };
IL.venueUnlocked = (vi) => IL.save.rep >= IL.VENUES[vi].rep;
IL.eventUnlocked = (vi, ei) => ei === 0 || (IL.save.stars[IL.starKey(vi, ei - 1)] || 0) > 0;
IL.rinkBonus = function () { const r = IL.save.rink; return r.lights + r.scoreboard + r.seats + r.concessions + r.music; };
IL.fans = function () { return Math.round(120 + IL.save.rep * 37 + IL.rinkBonus() * 400); };

IL.save = IL.load();
