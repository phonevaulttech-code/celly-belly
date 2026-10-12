/* ICELOCK Zamboni Shift — menus: manager hub, venues, designer, upgrades, modals, results */
window.IL = window.IL || {};
IL.UI = (function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const FLAVOR = {
    pucks: ['🏒', 'Loose pucks'], gloves: ['🧤', 'Dropped gloves'], hats: ['🎩', 'Hats (3 = hat trick!)'], nachos: ['🧀', 'Nacho spills'],
    mascot: ['🦡', 'Wandering mascot'], octopus: ['🐙', 'Octopus'], players: ['👥', 'Players at the bench'], snow: ['❄️', 'Snow piles'],
    snowfall: ['🌨️', 'Snowfall re-dirties'], water: ['💧', 'Water tank']
  };
  let current = 'home';

  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('hidden', s.id !== id));
    current = id;
    if (id === 'hub') renderHub();
    if (id === 'home') renderHome();
    if (id === 'venues') renderVenues();
    if (id === 'shop') renderShop();
  }
  let toastT = 0;
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800);
  }
  function fmt(n) { return n >= 10000 ? (n / 1000).toFixed(1) + 'k' : String(n); }
  function nextVenueInfo() {
    const nv = IL.VENUES.findIndex(v => IL.save.rep < v.rep);
    return nv < 0 ? null : { vi: nv, v: IL.VENUES[nv] };
  }

  function drawPreview(canvas, design, opts) {
    const c = canvas.getContext('2d'), R = IL.R;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, canvas.width, canvas.height);
    const s = Math.min(canvas.width / (R.RW + 20), canvas.height / (R.RH + 20));
    c.translate((canvas.width - R.RW * s) / 2, (canvas.height - R.RH * s) / 2); c.scale(s, s);
    c.fillStyle = design.board; R.rr(c, -8, -8, R.RW + 16, R.RH + 16, R.CR + 8); c.fill();
    c.fillStyle = '#fff'; R.rr(c, -4, -4, R.RW + 8, R.RH + 8, R.CR + 4); c.fill();
    R.drawDesign(c, design);
    if (opts && opts.dirty) {
      const d = document.createElement('canvas'); d.width = R.RW; d.height = R.RH;
      const dc = d.getContext('2d'); R.drawDirt(dc, IL.VENUES[IL.save.venue], 5);
      dc.globalCompositeOperation = 'destination-out'; dc.lineCap = 'round'; dc.lineJoin = 'round'; dc.lineWidth = 56;
      dc.beginPath(); dc.moveTo(60, 680); dc.lineTo(60, 60); dc.lineTo(170, 40); dc.lineTo(170, 560); dc.stroke();
      c.drawImage(d, 0, 0);
    }
  }

  /* ---------- HUB ---------- */
  function renderHub() {
    const sv = IL.save, vi = sv.venue, v = IL.VENUES[vi], d = IL.getDesign(vi);
    $('hub-coins').textContent = '🪙 ' + fmt(sv.coins);
    const dn = IL.dailyNumber(), dbest = sv.runs.filter(r => r.d === IL.todayKey()).sort((a, b) => b.score - a.score)[0];
    $('daily-title').textContent = 'Daily Rink #' + dn;
    $('daily-sub').textContent = dbest ? 'Today: ' + dbest.grade + ' grade · ' + dbest.score + ' pts · ' + IL.Share.fmtTime(dbest.time) : IL.VENUES[dn % 6].name + ' · same rink for everyone · ~2 min';
    const nx = (() => { for (let i = 0; i < 3; i++) if (IL.eventUnlocked(vi, i) && !(sv.stars[IL.starKey(vi, i)] > 0)) return i; return 0; })();
    $('btn-continue').innerHTML = '▶ <b>Continue</b><small>' + esc(v.events[nx].name) + ' · ' + v.events[nx].jobs.length + ' jobs</small>';
    $('btn-continue').onclick = () => openEvent(vi, nx);
    $('hub-venue').textContent = v.icon + ' ' + v.name + ' · ' + v.place;
    $('hub-rinkname').textContent = d.rinkName || v.design.rinkName;
    $('hub-team').textContent = 'Home of the ' + (d.teamName || 'Team');
    $('hub-rep').textContent = fmt(sv.rep);
    $('hub-fans').textContent = fmt(IL.fans());
    $('hub-day').textContent = String(1 + Math.floor(sv.stats.shifts / 3));
    const nv = nextVenueInfo();
    if (nv) {
      const prev = IL.VENUES[Math.max(0, nv.vi - 1)].rep;
      $('hub-repfill').style.width = Math.min(100, (sv.rep - prev) / (nv.v.rep - prev) * 100) + '%';
      $('hub-next').textContent = 'Next venue: ' + nv.v.name + ' at ' + nv.v.rep + ' rep';
    } else { $('hub-repfill').style.width = '100%'; $('hub-next').textContent = 'Every venue unlocked — legend status!'; }
    $('rinkcard').style.background = 'linear-gradient(135deg,' + v.theme.bg2 + 'ee,' + v.theme.bg + 'cc)';
    drawPreview($('hub-preview'), d);
    $('btn-daily').classList.toggle('hidden', sv.lastDaily === IL.todayKey());
    const unlocked = IL.VENUES.filter((x, i) => IL.venueUnlocked(i)).length;
    $('hub-venuecount').textContent = unlocked + ' / ' + IL.VENUES.length + ' unlocked';
    drawCrew();
    const sch = $('schedule'); sch.innerHTML = '';
    let nextMarked = false;
    v.events.forEach((ev, ei) => {
      const st = sv.stars[IL.starKey(vi, ei)] || 0, open = IL.eventUnlocked(vi, ei);
      const b = document.createElement('button');
      b.className = 'event' + (open ? '' : ' locked');
      if (open && st === 0 && !nextMarked) { b.classList.add('next'); nextMarked = true; }
      const fl = ev.jobs.map(j => IL.JOBS[j].icon).join(' › ') + (ev.tag ? ' · 🖌️ Opener' : '');
      b.innerHTML = '<div class="ico">' + ev.icon + '</div><div class="mid"><div class="tm">' + ev.time + ' · ' + ev.timer + 's</div><div class="nm">' + esc(ev.name) + '</div><div class="fl">' + fl + '</div></div>' +
        '<div class="st">' + (open ? '<b>' + '★'.repeat(st) + '</b>' + '★'.repeat(3 - st) + '<span class="go">' + (st ? 'REPLAY' : 'START') + '</span>' : '🔒') + '</div>';
      b.dataset.ei = ei;
      b.onclick = () => { IL.Audio.click(); if (!open) { toast('Earn ★ on the previous event first'); return; } openEvent(vi, ei); };
      sch.appendChild(b);
    });
  }

  let crewRaf = 0;
  function drawCrew() {
    const c = $('hub-crew'); if (!c) return;
    const cw = c.clientWidth || 340; c.width = cw * 2; c.height = 220;
    const g = c.getContext('2d');
    const crew = [{ name: 'You', look: Object.assign(IL.B.look(1, 'coach'), { body: '#ffd6a5', hat: 'cap', hatCol: '#ff6b6b', jersey: '#4d96ff', prop: 'clipboard' }) }]
      .concat(IL.STAFF.filter(st => IL.hasStaff(st.id)).map(st => ({ name: st.name.split(' ')[0], look: Object.assign(IL.B.look(st.id.length * 9, 'fan'), st.look) })));
    if (crew.length < 5) crew.push({ name: 'Hire!', look: Object.assign(IL.B.look(99, 'fan'), { body: '#e9e4f0', hat: 'none', scarf: null }), ghost: true });
    cancelAnimationFrame(crewRaf);
    const t0 = performance.now();
    (function loop() {
      if (IL.UI.current !== 'hub') return;
      const t = (performance.now() - t0) / 1000;
      g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, cw, 110);
      const gap = Math.min(78, cw / crew.length);
      crew.forEach((m, i) => {
        const x = gap * (i + 0.5) + (cw - gap * crew.length) / 2;
        g.globalAlpha = m.ghost ? 0.5 : 1;
        IL.B.draw(g, x, 52, 22, Object.assign(m.look, { t, walk: 0.15, emote: (Math.floor(t / 2.5) % crew.length) === i && !m.ghost ? ['heart', 'note', 'star', 'bang'][i % 4] : null, emoteT: t % 2.5 }));
        g.globalAlpha = 1; g.fillStyle = '#5b4a6b'; g.font = '800 12px system-ui'; g.textAlign = 'center'; g.fillText(m.name, x, 102);
      });
      crewRaf = requestAnimationFrame(loop);
    })();
  }

  function openEvent(vi, ei) {
    const v = IL.VENUES[vi], ev = v.events[ei];
    const chips = Object.keys(ev.obs).map(k => '<span class="chip">' + FLAVOR[k][0] + ' ' + FLAVOR[k][1] + '</span>').join('') || '<span class="chip">✨ No obstacles — just shine</span>';
    $('modal-card').innerHTML =
      '<div class="ev-ico">' + ev.icon + '</div><div class="ev-time">' + ev.time.toUpperCase() + ' · ' + esc(v.name.toUpperCase()) + '</div>' +
      '<h2>' + esc(ev.name) + '</h2><p>' + esc(ev.quip) + '</p>' +
      '<div class="joblist">' + ev.jobs.map((j, i) => '<div><b>' + (i + 1) + '</b><span>' + IL.JOBS[j].icon + '</span>' + IL.JOBS[j].name + '</div>').join('') + '</div>' +
      '<div class="chips">' + chips + '</div>' +
      '<div class="targets"><div>★ ' + ev.stars[0] + '%</div><div>★★ ' + ev.stars[1] + '%</div><div>★★★ ' + ev.stars[2] + '%</div></div>' +
      '<div class="ctrlhint">🚜 Zamboni run: ' + ev.timer + 's before puck drop · drag to drive (or WASD / arrows)</div>' +
      '<button class="btn big" id="btn-start">START SHIFT ›</button><button class="link" id="btn-cancel">Not yet</button>';
    $('modal').classList.remove('hidden');
    $('btn-start').onclick = () => { $('modal').classList.add('hidden'); IL.Main.startShift(vi, ei); };
    $('btn-cancel').onclick = () => { IL.Audio.click(); $('modal').classList.add('hidden'); };
  }

  function showHelp() {
    $('modal-card').innerHTML = '<div class="ev-ico">🧊</div><h2>How to Play</h2>' +
      '<p style="text-align:left">👆 <b>Drag anywhere</b>: your Zamboni drives toward your finger. Desktop: <b>WASD / arrows</b>.<br><br>' +
      '✨ The blade behind you lays fresh glossy ice and reveals <b>your custom ice design</b>.<br><br>' +
      '🛣 Long straight passes over dirty ice = <b>PERFECT LANE</b>. Don\'t re-clean the same spot or your combo resets.<br><br>' +
      '🎩 Scoop pucks, gloves, hats (3 = <b>hat trick</b>) and octopi for coins. Avoid the mascot!<br><br>' +
      '⭐ Stars + perfect ice earn <b>reputation</b>. Reputation unlocks bigger venues. Spend coins on Zamboni & rink upgrades.</p>' +
      '<button class="btn" id="btn-cancel">Got it!</button>';
    $('modal').classList.remove('hidden');
    $('btn-cancel').onclick = () => { IL.Audio.click(); $('modal').classList.add('hidden'); };
  }

  /* ---------- VENUES ---------- */
  function renderVenues() {
    $('ven-rep').textContent = '⭐ ' + IL.save.rep + ' rep';
    const list = $('venue-list'); list.innerHTML = '';
    IL.VENUES.forEach((v, vi) => {
      const open = IL.venueUnlocked(vi), b = document.createElement('button');
      b.className = 'venue' + (open ? '' : ' locked') + (vi === IL.save.venue ? ' cur' : '');
      b.style.background = 'linear-gradient(135deg,' + v.theme.bg2 + ',' + v.theme.bg + ' 60%,' + v.theme.seat + ')';
      b.innerHTML = '<span class="vi">' + v.icon + '</span><h3>' + esc(v.name) + '</h3><p>' + esc(v.place) + ' — ' + esc(v.blurb) + '</p>' +
        '<div class="vmeta"><span>★ ' + IL.venueStars(vi) + '/9</span><span>' + (vi === IL.save.venue ? '📍 Current' : '') + '</span></div>' +
        (open ? '' : '<span class="lock">🔒 ' + v.rep + ' rep</span>');
      b.dataset.vi = vi;
      b.onclick = () => {
        IL.Audio.click();
        if (!open) { toast('Need ' + (v.rep - IL.save.rep) + ' more reputation'); return; }
        IL.save.venue = vi; IL.persist(); show('hub'); toast('Now managing ' + v.name + '!');
      };
      list.appendChild(b);
    });
  }

  /* ---------- DESIGNER ---------- */
  let draft = null, desTab = 'logo', dirtyView = false;
  function openDesigner() {
    draft = IL.getDesign(IL.save.venue); desTab = 'logo'; dirtyView = false;
    const c = $('des-canvas'); c.width = 680; c.height = 1440;
    show('designer'); renderDesTabs(); renderDes();
  }
  function renderDes() { drawPreview($('des-canvas'), draft, { dirty: dirtyView }); }
  function swatches(key) {
    return '<div class="swrow">' + IL.PALETTE.map(c => '<button class="sw' + (draft[key] === c ? ' on' : '') + '" data-k="' + key + '" data-v="' + c + '" style="background:' + c + '"></button>').join('') + '</div>';
  }
  function renderDesTabs() {
    document.querySelectorAll('#des-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === desTab));
    let h = '';
    if (desTab === 'logo') {
      h += '<div class="lbl">Center-ice logo</div><div class="grid">' + IL.LOGOS.map(l => '<button class="opt' + (draft.logo === l.id ? ' on' : '') + '" data-k="logo" data-v="' + l.id + '"' + (l.kind === 'emoji' ? ' style="font-family:' + IL.R.EMOJI_FONT.replace(/"/g, '\'') + '"' : '') + '>' + (l.id === 'initials' ? esc(initials(draft.teamName)) : l.label) + '</button>').join('') + '</div>';
      h += '<div class="lbl">Logo color</div>' + swatches('logoColor') + '<div class="lbl">Crest background</div>' + swatches('accent');
    } else if (desTab === 'lines') {
      h += '<div class="lbl">Center red line</div>' + swatches('red') + '<div class="lbl">Blue lines</div>' + swatches('blue') + '<div class="lbl">Faceoff circles</div>' + swatches('circle');
      h += '<div class="lbl">Ice tint</div><div class="tints">' + IL.ICE_TINTS.map(t => '<button class="tint' + (draft.ice === t.id ? ' on' : '') + '" data-k="ice" data-v="' + t.id + '" style="background:linear-gradient(135deg,' + t.a + ',' + t.b + ')">' + t.name + '</button>').join('') + '</div>';
    } else if (desTab === 'boards') {
      h += '<div class="lbl">Boards & kick-plate color</div>' + swatches('board');
      h += '<div class="lbl">Board ad text</div><input class="field" id="f-ad" maxlength="16" value="' + esc(draft.ad) + '">';
    } else {
      h += '<div class="lbl">Rink name</div><input class="field" id="f-rink" maxlength="16" value="' + esc(draft.rinkName) + '">';
      h += '<div class="lbl">Team name</div><input class="field" id="f-team" maxlength="16" value="' + esc(draft.teamName) + '">';
      h += '<p class="ctrlhint" style="margin-top:10px">Names are painted on the ice in the neutral zone and on the boards.</p>';
    }
    $('des-body').innerHTML = h;
    $('des-body').querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
      IL.Audio.click(); draft[b.dataset.k] = b.dataset.v; renderDesTabs(); renderDes();
    });
    const bind = (id, k) => { const f = $(id); if (f) f.oninput = () => { draft[k] = f.value.toUpperCase(); renderDes(); }; };
    bind('f-ad', 'ad'); bind('f-rink', 'rinkName'); bind('f-team', 'teamName');
  }
  function initials(n) { const p = String(n || 'IL').trim().split(/\s+/); return ((p[0] || 'I')[0] + (p[1] ? p[1][0] : (p[0] || 'L')[1] || '')).toUpperCase(); }
  function saveDesign(silent) {
    IL.setDesign(IL.save.venue, draft);
    if (!silent) { IL.Audio.purchase(); toast(IL.save.painted[IL.VENUES[IL.save.venue].id] ? '🎨 Saved! Paint it in on an 🖌️ Opener' : '🎨 Ice design saved!'); }
  }

  /* ---------- SHOP ---------- */
  let shopTab = 'zam';
  function canvasZam(skin) {
    const c = document.createElement('canvas'); c.width = 104; c.height = 104; c.className = 'skinswatch';
    const x = c.getContext('2d'); x.fillStyle = '#e6f4ff'; IL.R.rr(x, 0, 0, 104, 104, 22); x.fill();
    x.translate(52, 52); x.scale(1.2, 1.2); IL.R.drawZamboni(x, 0, 0, -Math.PI / 2, skin, 0.1, 50, true);
    return c;
  }
  function renderShop() {
    const sv = IL.save;
    $('shop-coins').textContent = '🪙 ' + fmt(sv.coins);
    document.querySelectorAll('#shop-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === shopTab));
    const body = $('shop-body'); body.innerHTML = '';
    const row = (icon, name, desc, lvl, max, label, can, own, fn, swatch) => {
      const d = document.createElement('div'); d.className = 'shopitem';
      d.innerHTML = '<div class="si">' + (swatch ? '' : icon) + '</div><div class="sm"><b>' + esc(name) + '</b><small>' + esc(desc) + '</small>' +
        (max ? '<div class="lv">' + Array.from({ length: max }, (_, i) => '<i class="' + (i < lvl ? 'on' : '') + '"></i>').join('') + '</div>' : '') + '</div>';
      if (swatch) d.querySelector('.si').replaceWith(swatch);
      const b = document.createElement('button'); b.className = 'buy' + (own ? ' own' : ''); b.textContent = label; b.disabled = !can && !own;
      b.onclick = fn; d.appendChild(b); body.appendChild(d);
    };
    if (shopTab === 'zam') {
      body.insertAdjacentHTML('beforeend', '<div class="note">Zamboni upgrades help you clear faster and wider every shift.</div>');
      IL.ZUPGRADES.forEach(u => {
        const lv = sv.up[u.id], max = u.prices.length, price = u.prices[lv];
        row(u.icon, u.name, u.desc, lv, max, lv >= max ? 'MAX' : '🪙 ' + price, lv < max && sv.coins >= price, lv >= max, () => {
          if (lv >= max || sv.coins < price) return toast('Not enough coins');
          sv.coins -= price; sv.up[u.id]++; IL.persist(); IL.Audio.purchase(); toast(u.name + ' upgraded!'); renderShop();
        });
      });
    } else if (shopTab === 'skins') {
      IL.SKINS.forEach(s => {
        const own = sv.skins.owned.includes(s.id), sel = sv.skins.sel === s.id;
        row('', s.name, own ? (sel ? 'Equipped' : 'Owned — tap to equip') : 'Fresh paint job', 0, 0, sel ? '✓ ON' : own ? 'EQUIP' : '🪙 ' + s.price, own || sv.coins >= s.price, sel, () => {
          if (own) { sv.skins.sel = s.id; IL.persist(); IL.Audio.click(); renderShop(); return; }
          if (sv.coins < s.price) return toast('Not enough coins');
          sv.coins -= s.price; sv.skins.owned.push(s.id); sv.skins.sel = s.id; IL.persist(); IL.Audio.purchase(); toast(s.name + ' unlocked!'); renderShop();
        }, canvasZam(s));
      });
    } else if (shopTab === 'staff') {
      body.insertAdjacentHTML('beforeend', '<div class="note">Hire cozy staff to help with prep jobs. They show up on the ice and in your crew!</div>');
      IL.STAFF.forEach(st => {
        const own = IL.hasStaff(st.id);
        const c = document.createElement('canvas'); c.width = 104; c.height = 104; c.className = 'skinswatch';
        const x = c.getContext('2d'); x.fillStyle = '#fff1e6'; IL.R.rr(x, 0, 0, 104, 104, 22); x.fill();
        IL.B.draw(x, 52, 50, 30, Object.assign(IL.B.look(st.id.length * 9, 'fan'), st.look, { t: 0.3 }));
        row('', st.name, st.desc, 0, 0, own ? '✓ HIRED' : '🪙 ' + st.price, sv.coins >= st.price, own, () => {
          if (own) return; if (sv.coins < st.price) return toast('Not enough coins');
          sv.coins -= st.price; sv.staff[st.id] = true; IL.persist(); IL.Audio.purchase(); toast(st.name.split(' ')[0] + ' joined your crew! 🫧'); renderShop();
        }, c);
      });
    } else {
      body.insertAdjacentHTML('beforeend', '<div class="note">Rink upgrades show up in every venue and boost reputation, crowd and coins.</div>');
      IL.RUPGRADES.forEach(u => {
        const lv = sv.rink[u.id], max = u.prices.length, price = u.prices[lv];
        row(u.icon, u.name, u.desc, lv, max, lv >= max ? 'MAX' : '🪙 ' + price, lv < max && sv.coins >= price, lv >= max, () => {
          if (lv >= max || sv.coins < price) return toast('Not enough coins');
          sv.coins -= price; sv.rink[u.id]++; sv.rep += u.rep[lv]; IL.persist(); IL.Audio.purchase(); toast(u.name + ' installed! +' + u.rep[lv] + ' rep'); renderShop();
        });
      });
    }
    body.insertAdjacentHTML('beforeend', '<div class="note">💡 Coin packs would live here. This build has <b>no real purchases</b> — the button below is a free, simulated placeholder.</div>');
    const demo = document.createElement('button'); demo.className = 'btn ghost'; demo.id = 'btn-democoins'; demo.textContent = '🎁 Demo coin pack (+250, virtual)';
    demo.onclick = () => { sv.coins += 250; IL.persist(); IL.Audio.purchase(); toast('+250 virtual coins (simulated)'); renderShop(); };
    body.appendChild(demo);
  }

  /* ---------- RESULTS ---------- */
  function showResults(res, rew) {
    const v = IL.VENUES[res.vi], ev = v.events[res.ei];
    $('res-event').textContent = ev.icon + ' ' + ev.name + ' · ' + v.name;
    $('res-title').textContent = res.perfect ? 'CLEAN SWEEP. 💯' : IL.GRADE_TITLES[rew.grade];
    if (rew.mode !== 'normal') $('res-event').textContent = rew.mode === 'daily' ? '📅 ' + rew.share.title + ' · ' + v.name : '⚡ Quick Shift · ' + v.name;
    const gEl = $('res-grade'); gEl.textContent = rew.grade; gEl.className = 'grade g' + rew.grade; void gEl.offsetWidth; gEl.classList.add('pop');
    setTimeout(() => IL.Audio.grade(rew.grade), 650);
    $('res-pb').classList.toggle('hidden', !rew.isPB);
    $('res-pb').textContent = rew.prevPB ? '🏆 NEW PERSONAL BEST (+' + (rew.score - rew.prevPB) + ')' : '🏆 FIRST PB SET';
    countUp($('res-score'), rew.score);
    shareData = rew.share; IL.UI.shareText = IL.Share.text(rew.share);
    const st = $('res-stars').children;
    for (let i = 0; i < 3; i++) { st[i].className = ''; if (i < res.stars) { st[i].style.animationDelay = (0.25 + i * 0.25) + 's'; st[i].className = 'on'; setTimeout(() => IL.Audio.star(i), 250 + i * 250); } }
    $('res-pct').textContent = res.pct.toFixed(1) + '%';
    $('res-combo').textContent = 'x' + res.bestMult.toFixed(2).replace(/0$/, '');
    $('res-lanes').textContent = res.lanes;
    $('res-coins').textContent = '+' + rew.coins;
    $('res-rep').textContent = '+' + rew.rep;
    $('res-fans').textContent = fmt(IL.fans());
    $('res-note').textContent = rew.note || '';
    $('res-jobs').innerHTML = (rew.jobs || []).map((j, i) => '<div style="animation-delay:' + (0.15 + i * 0.12) + 's"><span>' + j.icon + '</span>' + esc(j.label) + '<i class="gchip g' + j.grade + '">' + j.grade + '</i><b>+' + j.coins + '</b></div>').join('');
    $('res-time').textContent = IL.Share.fmtTime(rew.totalTime);
    const next = $('res-next');
    next.disabled = false; $('res-retry').classList.toggle('hidden', res.stars === 0);
    if (rew.mode === 'quick') { next.textContent = '⚡ Again'; next.onclick = () => IL.Main.startShift(0, 0, 'quick'); }
    else if (rew.mode === 'daily') { next.textContent = '🏆 Leaderboard'; next.onclick = () => { show('hub'); showLeaderboard(); }; }
    else if (res.stars === 0) { next.textContent = 'Try again ›'; next.onclick = () => IL.Main.startShift(res.vi, res.ei); }
    else if (res.ei < 2) { next.textContent = 'Next event ›'; next.onclick = () => { IL.Audio.click(); openEventFromResults(res.vi, res.ei + 1); }; }
    else if (res.vi + 1 < IL.VENUES.length && IL.venueUnlocked(res.vi + 1)) {
      next.textContent = 'Next venue ›';
      next.onclick = () => { IL.Audio.click(); IL.save.venue = res.vi + 1; IL.persist(); show('hub'); toast('Welcome to ' + IL.VENUES[res.vi + 1].name + '!'); };
    } else { next.textContent = 'Manager hub ›'; next.onclick = () => { IL.Audio.click(); show('hub'); }; }
    show('results');
  }
  let shareData = null;
  function countUp(el, to) {
    const t0 = performance.now(), dur = 900;
    (function f() { const k = Math.min(1, (performance.now() - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(to * e).toLocaleString(); if (k < 1) { if (Math.random() < 0.4) IL.Audio.tick(); requestAnimationFrame(f); } else el.classList.add('pop'); })();
    el.classList.remove('pop');
  }
  function openShare() {
    const c = IL.Share.card(shareData), url = c.toDataURL('image/png');
    IL.UI.lastCardUrl = url;
    $('modal-card').innerHTML = '<h2>Brag card</h2><img class="sharecard" id="share-img" src="' + url + '" alt="ICELOCK result card">' +
      '<div class="sharetext" id="share-text">' + esc(IL.UI.shareText) + '</div>' +
      '<div class="sharebtns"><button class="btn" id="share-native">📤 Share</button><button class="btn ghost" id="share-copy">📋 Copy text</button><a class="btn ghost" id="share-save" download="topshelf-' + (shareData.daily ? 'daily-' + shareData.n : 'result') + '.png" href="' + url + '">💾 Save image</a></div>' +
      '<button class="link" id="btn-cancel">Close</button>';
    $('modal').classList.remove('hidden');
    $('btn-cancel').onclick = () => $('modal').classList.add('hidden');
    $('share-copy').onclick = () => copyText(IL.UI.shareText);
    $('share-native').onclick = async () => {
      try {
        const blob = await (await fetch(url)).blob(), file = new File([blob], 'icelock.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text: IL.UI.shareText, title: IL.GAME_TITLE });
        else if (navigator.share) await navigator.share({ text: IL.UI.shareText, title: IL.GAME_TITLE });
        else { copyText(IL.UI.shareText); $('share-save').click(); }
      } catch (e) { /* user cancelled */ }
    };
  }
  function copyText(t) {
    const done = () => toast('📋 Copied: ' + t.slice(0, 32) + '…');
    try { if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(t).then(done, fallback); return; } } catch (e) {}
    fallback();
    function fallback() { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); done(); }
  }
  function openDaily() {
    const d = IL.dailyEvent(), v = IL.VENUES[d.vi];
    $('modal-card').innerHTML = '<div class="ev-ico">📅</div><div class="ev-time">DAILY RINK #' + d.n + ' · ' + esc(v.name.toUpperCase()) + '</div><h2>Same rink. Everyone.</h2>' +
      '<p>Today\'s seeded rink is identical for every player. Clear, fix, flood — about 2 minutes. Best score and grade go on your board.</p>' +
      '<div class="joblist">' + d.ev.jobs.map((j, i) => '<div><b>' + (i + 1) + '</b><span>' + IL.JOBS[j].icon + '</span>' + IL.JOBS[j].name + '</div>').join('') + '</div>' +
      '<button class="btn big" id="btn-start">START DAILY ›</button><button class="link" id="btn-cancel">Not yet</button>';
    $('modal').classList.remove('hidden');
    $('btn-start').onclick = () => { $('modal').classList.add('hidden'); IL.Main.startShift(0, 0, 'daily'); };
    $('btn-cancel').onclick = () => $('modal').classList.add('hidden');
  }
  function showLeaderboard() {
    const runs = IL.save.runs.slice().sort((a, b) => b.score - a.score || a.time - b.time).slice(0, 10);
    $('modal-card').innerHTML = '<h2>🏆 Your Daily Board</h2><p>Local best runs on this device. Ranked by score, then time.</p>' +
      (runs.length ? '<table class="lb"><tr><th>#</th><th>Rink</th><th>Gr</th><th>%</th><th>Time</th><th>Score</th></tr>' + runs.map((r, i) => '<tr><td>' + (i + 1) + '</td><td>#' + r.n + '</td><td class="g' + r.grade + '">' + r.grade + '</td><td>' + r.pct.toFixed(1) + '</td><td>' + IL.Share.fmtTime(r.time) + '</td><td>' + r.score + '</td></tr>').join('') + '</table>'
        : '<p class="ctrlhint">No daily runs yet. Today\'s rink is waiting.</p>') +
      '<button class="btn" id="btn-cancel">Close</button>';
    $('modal').classList.remove('hidden'); $('btn-cancel').onclick = () => $('modal').classList.add('hidden');
  }
  function openEventFromResults(vi, ei) { show('hub'); openEvent(vi, ei); }

  /* ---------- HOME (flinging is the main game) ---------- */
  function flickSave() { const sv = IL.save; sv.flick = sv.flick || { stars: {}, best: {}, unlocked: 1 }; return sv.flick; }
  function nextLevel() { const f = flickSave(); for (let i = 0; i < IL.Flick.LEVELS; i++) if (!f.stars[i]) return Math.min(i, f.unlocked - 1); return IL.Flick.LEVELS - 1; }
  function renderHome() {
    const f = flickSave(), n = nextLevel(), L = IL.Flick.buildLevel(n);
    let st = 0, cl = 0; for (const k in f.stars) { st += f.stars[k]; cl++; }
    $('home-stars').textContent = '★ ' + st; $('home-coins').textContent = '🪙 ' + fmt(IL.save.coins);
    $('play-sub').textContent = 'Level ' + (n + 1) + ' · ' + L.name + ' · ' + L.pucks + ' pucks';
    $('levels-sub').textContent = cl + ' / ' + IL.Flick.LEVELS + ' cleared';
    const db = f.best['daily-' + IL.todayKey()]; $('dlevel-sub').textContent = db ? 'Today: ' + db.toLocaleString() + ' pts' : 'Daily #' + IL.dailyNumber() + ' · same shot for everyone';
    $('beer-sub').textContent = f.best.beer ? 'PB ' + f.best.beer.toLocaleString() + ' · 5 wobbly rounds' : '75s · 5 wobbly rounds';
    drawHomeArt();
  }
  function drawHomeArt() {
    const c = $('home-art'), g = c.getContext('2d'), t = performance.now() / 1000;
    g.clearRect(0, 0, c.width, c.height);
    const ice = g.createLinearGradient(0, 120, 0, 300); ice.addColorStop(0, '#dff3ff'); ice.addColorStop(1, '#a8d8f5');
    g.fillStyle = ice; IL.R.rr(g, 20, 150, 320, 150, 40); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(60, 175, 160, 4);
    g.fillStyle = '#e63946'; g.fillRect(20, 222, 320, 5);
    // net
    g.fillStyle = 'rgba(255,255,255,.95)'; g.fillRect(140, 110, 80, 40); g.strokeStyle = '#e63946'; g.lineWidth = 5; g.strokeRect(140, 110, 80, 40);
    g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = 1; for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(140 + i * 10, 110); g.lineTo(140 + i * 10, 150); g.stroke(); }
    // stacked cans
    for (let r = 0; r < 3; r++) for (let i = 0; i <= r; i++) { const x = 285 + (i - r / 2) * 18, y = 175 + r * 15; g.fillStyle = r === 2 && i === 1 ? '#e63946' : '#c9d1dc'; g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); g.strokeStyle = '#6b7685'; g.stroke(); }
    // flying puck with trail
    g.strokeStyle = 'rgba(255,181,71,.9)'; g.setLineDash([4, 6]); g.lineWidth = 3; g.beginPath(); g.moveTo(110, 285); g.quadraticCurveTo(110, 170, 200, 135); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#111'; g.beginPath(); g.ellipse(200, 132, 9, 6, 0, 0, 7); g.fill();
    IL.B.draw(g, 85, 262, 34, Object.assign(IL.B.look(5, 'fan'), { beard: true, dad: true, hat: 'backcap', hatCol: '#ffb547', jersey: '#3d5a80', num: 19, mood: 'cheer', t }));
    IL.B.draw(g, 180, 150, 26, Object.assign(IL.B.look(33, 'player'), { body: '#3d5a80', hat: 'helmet', hatCol: '#f2f2f2', beard: true, mood: 'sad', emote: 'sweat', emoteT: 0.5, t }));
    g.fillStyle = '#ffd23f'; g.font = '900 26px system-ui'; g.textAlign = 'center'; g.fillText('PING!', 250, 100);
  }
  function openLevels() {
    const f = flickSave();
    let h = '<h2>🏒 Level ladder</h2><div class="lvgrid">';
    for (let i = 0; i < IL.Flick.LEVELS; i++) {
      const lock = i >= f.unlocked, s = f.stars[i] || 0;
      h += '<button class="lv' + (lock ? ' lock' : '') + (s ? ' done' : '') + '" data-lv="' + i + '"' + (lock ? ' disabled' : '') + '><b>' + (lock ? '🔒' : i + 1) + '</b><small>' + '★'.repeat(s) + '<i>' + '★'.repeat(3 - s) + '</i></small></button>';
    }
    h += '</div><button class="link" id="btn-cancel">Close</button>';
    $('modal-card').innerHTML = h; $('modal').classList.remove('hidden');
    $('btn-cancel').onclick = () => $('modal').classList.add('hidden');
    document.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { $('modal').classList.add('hidden'); playFlick('level', +b.dataset.lv); });
  }
  function playFlick(mode, li) { IL.Audio.click(); IL.Main.quit(); show('game'); IL.Flick.start(mode, li); }
  function setShare(d) { shareData = d; IL.UI.shareText = IL.Share.text(d); }

  function bind() {
    $('btn-play').onclick = () => playFlick('level', nextLevel());
    $('btn-levels').onclick = () => { IL.Audio.click(); openLevels(); };
    $('btn-dlevel').onclick = () => playFlick('daily');
    $('btn-beer').onclick = () => playFlick('beer');
    $('btn-manager').onclick = () => { IL.Audio.click(); show('hub'); };
    document.querySelectorAll('[data-home]').forEach(b => b.onclick = () => { IL.Audio.click(); show('home'); });
    $('fe-retry').onclick = () => IL.Flick.restart();
    $('fh-retry').onclick = () => IL.Flick.restart();
    $('fe-share').onclick = () => { IL.Audio.click(); openShare(); };
    $('fe-home').onclick = () => { IL.Audio.click(); IL.Flick.stop(); show('home'); };
    document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { IL.Audio.click(); show(b.dataset.go); });
    $('go-designer').onclick = () => { IL.Audio.click(); openDesigner(); };
    $('go-shop').onclick = () => { IL.Audio.click(); show('shop'); };
    $('go-venues').onclick = () => { IL.Audio.click(); show('venues'); };
    $('go-help').onclick = () => { IL.Audio.click(); showHelp(); };
    $('des-back').onclick = () => { IL.Audio.click(); saveDesign(true); show('hub'); };
    $('des-save').onclick = () => saveDesign(false);
    $('des-dirty').onclick = () => { IL.Audio.click(); dirtyView = !dirtyView; renderDes(); };
    $('des-random').onclick = () => {
      IL.Audio.click(); const P = IL.PALETTE, r = (a) => a[(Math.random() * a.length) | 0];
      Object.assign(draft, { logo: r(IL.LOGOS).id, logoColor: r(P), accent: r(['#ffffff', '#111827', '#ffd23f', '#c9efff']), red: r(['#e63946', '#9d0208', '#e84393', '#ff8c42']), blue: r(['#1d4ed8', '#2d9cdb', '#7b2ff7', '#1fb5a8']), circle: r(P), board: r(P), ice: r(IL.ICE_TINTS).id });
      renderDesTabs(); renderDes();
    };
    $('des-reset').onclick = () => { IL.Audio.click(); draft = Object.assign({}, IL.VENUES[IL.save.venue].design); renderDesTabs(); renderDes(); };
    document.querySelectorAll('#des-tabs button').forEach(b => b.onclick = () => { IL.Audio.click(); desTab = b.dataset.tab; renderDesTabs(); });
    document.querySelectorAll('#shop-tabs button').forEach(b => b.onclick = () => { IL.Audio.click(); shopTab = b.dataset.tab; renderShop(); });
    $('btn-quick').onclick = () => IL.Main.startShift(0, 0, 'quick');
    $('btn-daily-rink').onclick = () => { IL.Audio.click(); openDaily(); };
    $('btn-leader').onclick = (e) => { e.stopPropagation(); IL.Audio.click(); showLeaderboard(); };
    $('btn-daily').onclick = () => {
      const sv = IL.save, y = new Date(); y.setDate(y.getDate() - 1);
      const yk = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
      sv.dailyStreak = sv.lastDaily === yk ? sv.dailyStreak + 1 : 1; sv.lastDaily = IL.todayKey();
      const amt = 75 + Math.min(6, sv.dailyStreak - 1) * 25; sv.coins += amt; IL.persist(); IL.Audio.purchase();
      toast('🎁 +' + amt + ' coins · ' + sv.dailyStreak + '-day streak'); renderHub();
    };
    $('res-share').onclick = () => { IL.Audio.click(); openShare(); };
    $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') $('modal').classList.add('hidden'); });
  }

  return { setShare, openLevels, playFlick, renderHome, nextLevel, openShare, showLeaderboard, shareText: '', lastCardUrl: '', show, toast, bind, renderHub, openEvent, openDesigner, showResults, drawPreview, get current() { return current; } };
})();
