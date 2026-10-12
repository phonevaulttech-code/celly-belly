/* ICELOCK Zamboni Shift — game data: venues, events, design options, shop */
window.IL = window.IL || {};

IL.PALETTE = ['#e63946', '#ff8c42', '#ffd23f', '#3ddc84', '#1fb5a8', '#2d9cdb', '#1d4ed8', '#7b2ff7',
  '#e84393', '#8b5a2b', '#111827', '#ffffff', '#c0c7d1', '#b5e48c', '#00e5ff', '#9d0208'];

IL.ICE_TINTS = [
  { id: 'classic', name: 'Classic', a: '#f7fcff', b: '#dcefff' },
  { id: 'arctic', name: 'Arctic', a: '#eef8ff', b: '#bfe3ff' },
  { id: 'mint', name: 'Frost Mint', a: '#f3fffb', b: '#c9f5e6' },
  { id: 'blush', name: 'Blush', a: '#fff6fa', b: '#ffd9ea' },
  { id: 'gold', name: 'Golden Hour', a: '#fffdf2', b: '#fbecc2' },
  { id: 'night', name: 'Night Ice', a: '#e3ecff', b: '#aebde6' }
];

IL.LOGOS = [
  { id: 'star', kind: 'shape', label: '★' }, { id: 'shield', kind: 'shape', label: '⛉' },
  { id: 'bolt', kind: 'shape', label: '⚡' }, { id: 'crown', kind: 'shape', label: '♛' },
  { id: 'snowflake', kind: 'shape', label: '❄' }, { id: 'puck', kind: 'shape', label: '●' },
  { id: 'heart', kind: 'shape', label: '♥' }, { id: 'paw', kind: 'shape', label: '🐾' },
  { id: 'initials', kind: 'text', label: 'AB' },
  { id: 'e-duck', kind: 'emoji', label: '🦆' }, { id: 'e-bear', kind: 'emoji', label: '🐻' },
  { id: 'e-deer', kind: 'emoji', label: '🦌' }, { id: 'e-cheese', kind: 'emoji', label: '🧀' },
  { id: 'e-wolf', kind: 'emoji', label: '🐺' }, { id: 'e-eagle', kind: 'emoji', label: '🦅' },
  { id: 'e-octo', kind: 'emoji', label: '🐙' }, { id: 'e-fire', kind: 'emoji', label: '🔥' },
  { id: 'e-badger', kind: 'emoji', label: '🦡' }
];

/* obstacle flavor keys: pucks, gloves, hats, nachos, mascot, octopus, players, snow (patch interval s), snowfall, water */
IL.VENUES = [
  {
    id: 'community', name: 'Community Rink', place: 'Madison, WI', rep: 0, icon: '🏘️',
    blurb: 'Drafty barn, warm cocoa, the best Friday fish fry in town.',
    theme: { bg: '#3a2a1f', bg2: '#5b4330', stands: '#6b4f3a', seat: '#8a6a4f', crowd: 0.35, boards: '#fdfdfd', glass: 'rgba(200,230,255,.25)', light: '#ffe8b0', kind: 'barn', lights: 2 },
    design: { rinkName: 'MADTOWN ICE', teamName: 'Lakers', logo: 'e-badger', logoColor: '#e63946', accent: '#ffffff', red: '#e63946', blue: '#1d4ed8', circle: '#e63946', board: '#e63946', ice: 'classic', ad: 'CURDS & CO.' },
    events: [
      { name: 'Learn-to-Skate', time: '9:00 AM', icon: '⛸️', timer: 90, stars: [75, 88, 96], dirt: 0.8, obs: {}, quip: 'Tiny skaters waiting with juice boxes. No pressure!' },
      { name: 'Youth Practice', time: '4:30 PM', icon: '🏒', timer: 85, stars: [78, 90, 97], dirt: 0.9, obs: { pucks: 4, gloves: 1 }, quip: 'The Squirts left their pucks everywhere again.' },
      { name: 'Beer League Night', time: '10:15 PM', icon: '🍺', timer: 80, stars: [80, 91, 97], dirt: 1, obs: { pucks: 3, gloves: 2, hats: 3, nachos: 2 }, quip: 'Dads in jerseys. Nachos on the ice. Hats incoming.' }
    ]
  },
  {
    id: 'highschool', name: 'Westside High Arena', place: 'Junior / High School', rep: 40, icon: '🏫',
    blurb: 'Pep band, student section, and a principal who loves ice.',
    theme: { bg: '#14233f', bg2: '#22385f', stands: '#2e4a78', seat: '#3c5d93', crowd: 0.5, boards: '#ffffff', glass: 'rgba(200,230,255,.3)', light: '#e9f3ff', kind: 'gym', lights: 3 },
    design: { rinkName: 'WESTSIDE', teamName: 'Wolves', logo: 'e-wolf', logoColor: '#1d4ed8', accent: '#ffd23f', red: '#e63946', blue: '#1d4ed8', circle: '#e63946', board: '#1d4ed8', ice: 'arctic', ad: 'GO WOLVES!' },
    events: [
      { name: 'Morning Skate', time: '7:00 AM', icon: '🌅', timer: 80, stars: [80, 90, 97], dirt: 0.9, obs: { pucks: 4, players: 1 }, quip: 'Players lingering at the bench. Classic teenagers.' },
      { name: 'JV Game', time: '5:00 PM', icon: '🥅', timer: 78, stars: [80, 91, 97], dirt: 1, obs: { pucks: 3, gloves: 2, snow: 14 }, quip: 'Watch for snow piles from hockey stops!' },
      { name: 'Rivalry Night', time: '7:30 PM', icon: '🔥', timer: 75, stars: [82, 92, 98], dirt: 1, obs: { pucks: 3, hats: 3, players: 1, snow: 12, nachos: 2 }, quip: 'Student section is LOUD. Make it shine.' }
    ]
  },
  {
    id: 'college', name: 'University Coliseum', place: 'College Arena', rep: 110, icon: '🎓',
    blurb: 'Bucky-style mascot, marching band, 8,000 screaming students.',
    theme: { bg: '#2a0d12', bg2: '#4a141d', stands: '#7a1f2b', seat: '#a12a3a', crowd: 0.7, boards: '#ffffff', glass: 'rgba(220,235,255,.32)', light: '#fff4e6', kind: 'arena', lights: 4 },
    design: { rinkName: 'THE COLISEUM', teamName: 'Badgers', logo: 'e-badger', logoColor: '#9d0208', accent: '#ffffff', red: '#9d0208', blue: '#1d4ed8', circle: '#9d0208', board: '#9d0208', ice: 'classic', ad: 'STATE BANK' },
    events: [
      { name: 'Team Practice', time: '3:00 PM', icon: '📋', timer: 78, stars: [80, 91, 97], dirt: 1, obs: { pucks: 4, players: 1, water: 1 }, quip: 'New: keep an eye on your water tank. Refill at the gate!' },
      { name: 'Mascot Mayhem', time: '6:00 PM', icon: '🦡', timer: 75, stars: [81, 91, 97], dirt: 1, obs: { pucks: 2, mascot: 1, gloves: 2, water: 1 }, quip: 'The mascot is on the ice and tracking slush. Gently.' },
      { name: 'Homecoming Game', time: '7:00 PM', icon: '🎉', timer: 72, stars: [82, 92, 98], dirt: 1, obs: { pucks: 2, hats: 3, mascot: 1, snow: 13, nachos: 2, water: 1 }, quip: 'Sold-out homecoming. Everyone\'s watching!' }
    ]
  },
  {
    id: 'minor', name: 'The Barn', place: 'Minor League', rep: 200, icon: '🐄',
    blurb: 'Dollar-dog night, chuck-a-puck, rowdiest fans in the league.',
    theme: { bg: '#1d1a12', bg2: '#3a3020', stands: '#5a4a28', seat: '#c08a2d', crowd: 0.8, boards: '#fffaf0', glass: 'rgba(255,240,210,.28)', light: '#fff1c9', kind: 'arena', lights: 4 },
    design: { rinkName: 'THE BARN', teamName: 'Mooseheads', logo: 'e-deer', logoColor: '#ff8c42', accent: '#111827', red: '#e63946', blue: '#2d9cdb', circle: '#ff8c42', board: '#ff8c42', ice: 'gold', ad: 'DOLLAR DOGS' },
    events: [
      { name: 'Dollar-Dog Night', time: '6:30 PM', icon: '🌭', timer: 75, stars: [80, 90, 97], dirt: 1, obs: { nachos: 5, pucks: 2, water: 1 }, quip: 'Concessions exploded. Nacho cleanup on aisle ICE.' },
      { name: 'Chuck-a-Puck', time: '8:10 PM', icon: '🥏', timer: 72, stars: [81, 91, 97], dirt: 1, obs: { pucks: 10, mascot: 1, water: 1 }, quip: 'Fans just threw 200 foam pucks. Scoop what you can!' },
      { name: 'Hat Trick Night', time: '9:00 PM', icon: '🎩', timer: 70, stars: [82, 92, 98], dirt: 1, obs: { hats: 6, players: 1, snow: 12, nachos: 2, water: 1 }, quip: 'Somebody scored three. It\'s raining hats!' }
    ]
  },
  {
    id: 'pro', name: 'Pro Arena', place: 'NHL-size Arena', rep: 320, icon: '🏟️',
    blurb: 'Jumbotron, laser show, national TV. Don\'t blow it.',
    theme: { bg: '#05070f', bg2: '#0e1630', stands: '#1a2240', seat: '#24325e', crowd: 0.95, boards: '#ffffff', glass: 'rgba(200,225,255,.35)', light: '#ffffff', kind: 'pro', lights: 6 },
    design: { rinkName: 'CAPITOL CENTER', teamName: 'Blizzard', logo: 'snowflake', logoColor: '#00e5ff', accent: '#1d4ed8', red: '#e63946', blue: '#1d4ed8', circle: '#e63946', board: '#111827', ice: 'arctic', ad: 'ICELOCK' },
    events: [
      { name: 'Morning Skate', time: '10:30 AM', icon: '☕', timer: 70, stars: [82, 92, 97], dirt: 1, obs: { pucks: 4, players: 1, water: 1, snow: 12 }, quip: 'Stars of the league watching from the bench.' },
      { name: 'Octopus Night', time: '7:00 PM', icon: '🐙', timer: 68, stars: [82, 92, 98], dirt: 1, obs: { octopus: 3, pucks: 2, mascot: 1, water: 1 }, quip: 'Detroit fans are in the building. Octopi on the ice!' },
      { name: 'Game 7', time: '8:00 PM', icon: '🏆', timer: 65, stars: [84, 93, 98], dirt: 1, obs: { hats: 3, octopus: 1, nachos: 3, mascot: 1, snow: 10, players: 1, water: 1 }, quip: 'Game 7. National TV. Hands steady, Michael.' }
    ]
  },
  {
    id: 'classic', name: 'Winter Classic', place: 'Outdoor Stadium', rep: 470, icon: '❄️',
    blurb: 'A rink in a football stadium. Snow keeps falling. Embrace it.',
    theme: { bg: '#0b1530', bg2: '#1c2f5c', stands: '#2a3558', seat: '#3a4a78', crowd: 1, boards: '#ffffff', glass: 'rgba(220,235,255,.25)', light: '#ffffff', kind: 'outdoor', lights: 4 },
    design: { rinkName: 'WINTER CLASSIC', teamName: 'Frost', logo: 'snowflake', logoColor: '#1d4ed8', accent: '#ffffff', red: '#e63946', blue: '#1d4ed8', circle: '#1d4ed8', board: '#1d4ed8', ice: 'arctic', ad: 'COCOA & CO' },
    events: [
      { name: 'Alumni Skate', time: '11:00 AM', icon: '👴', timer: 75, stars: [76, 87, 94], dirt: 1, obs: { pucks: 3, snowfall: 1, water: 1 }, quip: 'Light flurries. The snow re-dirties the ice — keep moving!' },
      { name: 'Snow Squall', time: '2:00 PM', icon: '🌨️', timer: 72, stars: [76, 87, 94], dirt: 1, obs: { gloves: 3, snowfall: 2, snow: 12, water: 1 }, quip: 'It\'s really coming down now!' },
      { name: 'The Classic', time: '5:00 PM', icon: '🏟️', timer: 70, stars: [78, 88, 95], dirt: 1, obs: { hats: 3, octopus: 1, mascot: 1, snowfall: 2, players: 1, water: 1 }, quip: '70,000 fans in toques. History is made on clean ice.' }
    ]
  },
  {
    id: 'pond', name: 'Backyard Pond', place: 'Bonus — frozen pond', rep: 600, icon: '🌲',
    blurb: 'Pine trees, a fire pit, and nobody keeping score. Pure chill.',
    theme: { bg: '#1b2d24', bg2: '#2f4a3a', stands: '#e9f1f5', seat: '#ffffff', crowd: 0.1, boards: '#e9f1f5', glass: 'rgba(0,0,0,0)', light: '#ffd9a0', kind: 'pond', lights: 1 },
    design: { rinkName: 'POND HOCKEY', teamName: 'Loons', logo: 'e-duck', logoColor: '#111827', accent: '#3ddc84', red: '#e63946', blue: '#2d9cdb', circle: '#2d9cdb', board: '#8b5a2b', ice: 'night', ad: 'COCOA' },
    events: [
      { name: 'Sunday Shinny', time: '1:00 PM', icon: '🏒', timer: 90, stars: [75, 86, 94], dirt: 1, obs: { pucks: 5, gloves: 2, snowfall: 1 }, quip: 'Just you, the pond, and some lost pucks.' },
      { name: 'Twilight Clear', time: '4:45 PM', icon: '🌇', timer: 85, stars: [76, 87, 95], dirt: 1, obs: { hats: 3, snow: 12, snowfall: 1 }, quip: 'Clear it before the neighbors show up.' },
      { name: 'Midnight Pond', time: '11:59 PM', icon: '🌙', timer: 80, stars: [78, 88, 95], dirt: 1, obs: { pucks: 4, octopus: 1, snowfall: 2 }, quip: 'Under the stars. Someone left an octopus. Why?' }
    ]
  }
];

IL.SKINS = [
  { id: 'classic', name: 'Classic White', price: 0, body: '#f4f7fb', trim: '#2d9cdb', stripe: '#e63946' },
  { id: 'fire', name: 'Fire Red', price: 150, body: '#e63946', trim: '#ffd23f', stripe: '#ffffff' },
  { id: 'ice', name: 'Glacier Blue', price: 150, body: '#2d9cdb', trim: '#ffffff', stripe: '#00e5ff' },
  { id: 'lime', name: 'Lime Rider', price: 250, body: '#3ddc84', trim: '#111827', stripe: '#ffffff' },
  { id: 'pink', name: 'Neon Pink', price: 300, body: '#e84393', trim: '#ffffff', stripe: '#ffd23f' },
  { id: 'retro', name: 'Retro Teal', price: 350, body: '#1fb5a8', trim: '#ff8c42', stripe: '#fffaf0' },
  { id: 'night', name: 'Midnight', price: 450, body: '#1f2937', trim: '#00e5ff', stripe: '#7b2ff7' },
  { id: 'gold', name: 'Gold Cup', price: 800, body: '#f5c518', trim: '#8b5a2b', stripe: '#ffffff' }
];

IL.ZUPGRADES = [
  { id: 'blade', name: 'Wider Blade', icon: '📏', desc: 'Wider clean path', prices: [150, 350, 700] },
  { id: 'speed', name: 'Engine Tune', icon: '⚙️', desc: 'Faster top speed', prices: [120, 300, 600] },
  { id: 'tank', name: 'Big Water Tank', icon: '💧', desc: 'Water lasts longer', prices: [100, 250, 500] }
];

IL.RUPGRADES = [
  { id: 'lights', name: 'LED Lights', icon: '💡', desc: 'Brighter ice, more sparkle. +rep', prices: [200, 500], rep: [10, 20] },
  { id: 'scoreboard', name: 'Scoreboard', icon: '📺', desc: 'LED scoreboard HUD + jumbotron. +rep', prices: [250, 600], rep: [10, 25] },
  { id: 'seats', name: 'Comfy Seats', icon: '💺', desc: 'Bigger crowd, louder cheers. +rep', prices: [200, 550], rep: [15, 25] },
  { id: 'concessions', name: 'Concessions', icon: '🌭', desc: '+15% coins per level', prices: [300, 700], rep: [5, 10] },
  { id: 'music', name: 'Arena Organ', icon: '🎹', desc: 'Organ stings & hype. +rep', prices: [150, 400], rep: [10, 15] }
];

IL.PA_QUIPS = {
  start: ['Ladies and gentlemen... the ZAMBONI!', 'Please welcome to the ice: our driver!', 'Intermission! Clear it before puck drop!', 'Cue the Zamboni. Cue the cheering.'],
  lane: ['Look at that LANE!', 'Straight as a blue line!', 'Textbook resurfacing!', 'That\'s glass, folks!'],
  bump: ['Easy on the boards!', 'The boards felt that one.', 'Insurance has been notified.', 'Bonk!'],
  half: ['Halfway there — crowd is loving it!', 'Ice is looking GLOSSY.'],
  low: ['Puck drop is coming!', 'Hurry hurry hurry!', '10 seconds, driver!'],
  hat: ['HAT TRICK! Scoop those lids!'],
  mascot: ['Mascot down! (He\'s fine.)', 'Please do not bump the mascot.'],
  nacho: ['Nacho slide!', 'Cheese on ice. Bold.'],
  octo: ['An OCTOPUS! Detroit says hi.', 'Eight legs, zero tickets.']
};

/* ---- Rink-manager job sequences per event ----
   practice-style = clear + zamboni, game nights = clear + fix + zamboni, openers = full prep incl. paint */
IL.JOBS = {
  clear: { icon: '🙋', name: 'Clear skaters', hint: 'Tap skaters to whistle them off the ice' },
  fix: { icon: '🔧', name: 'Fix the ice', hint: 'Drag the tool over holes, ruts & chips' },
  paint: { icon: '🖌️', name: 'Paint the ice', hint: 'Trace the glowing guides to paint your design' },
  zamboni: { icon: '🚜', name: 'Zamboni run', hint: 'Drag to drive — clear the ice!' }
};
IL.VENUES.forEach(function (v, vi) {
  v.events.forEach(function (e, ei) {
    if (!e.jobs) e.jobs = ei === 0 ? ['clear', 'zamboni'] : ei === 1 ? ['clear', 'fix', 'zamboni'] : ['clear', 'fix', 'paint', 'zamboni'];
    e.skaterKind = /Learn|Youth|Shinny/.test(e.name) ? 'kid' : /Practice|Skate|JV|Alumni/.test(e.name) ? 'player' : 'fan';
    e.skaters = Math.min(14, 6 + vi + ei * 2);
    e.damage = Math.min(7, 3 + Math.floor(vi / 2) + ei);
    if (ei === 2) e.tag = '🖌️ Opener — paint night';
  });
});
IL.VENUES[0].events[0].jobs = ['clear', 'zamboni'];
IL.VENUES[0].events[0].skaters = 7;

IL.STAFF = [
  { id: 'bea', name: 'Bea · Rink Attendant', desc: 'Whistles a skater off the ice every second', price: 250, look: { body: '#ffb5a7', hat: 'cap', hatCol: '#ff6b6b', prop: 'whistle' } },
  { id: 'gus', name: 'Gus · Ice Tech', desc: 'Patches up to 2 damage spots before you start', price: 300, look: { body: '#a0c4ff', hat: 'beanie', hatCol: '#3d405b', prop: 'can' } },
  { id: 'pip', name: 'Pip · Line Painter', desc: 'Fatter brush, extra-forgiving paint guides', price: 350, look: { body: '#caffbf', hat: 'beanie', hatCol: '#c77dff', prop: 'brush', scarf: '#ffd93d' } },
  { id: 'mo', name: 'Mo · Hype Host', desc: '+10% coins & louder, happier fans', price: 400, look: { body: '#ffc6ff', hat: 'toque', hatCol: '#4d96ff', prop: 'clipboard', scarf: '#ff6b6b' } }
];

/* ===== v3: work-break tuning, beer-league humor, daily rink ===== */
IL.VENUES.forEach(function (v) {
  v.events.forEach(function (e, ei) {
    e.timer = Math.min(e.timer, 60);
    e.stars = e.stars.map(function (s, i) { return s - [6, 5, 4][i]; });
    e.skaters = Math.min(10, 5 + Math.ceil(v.events.indexOf(e) * 1.5) + IL.VENUES.indexOf(v));
    e.damage = Math.min(5, e.damage);
  });
});
IL.PA_QUIPS = {
  start: ['Please rise for... the Zamboni.', 'Our driver: 14 seasons, zero speeding tickets.', 'Intermission! Beer line is long, ice line is longer.', 'Keep your hands and nachos inside the rink.', 'Ladies and gentlemen: the only guy here with a pension.'],
  lane: ['Ice so clean the goalie can see his paycheck!', 'Zamboni driver of the year. Again.', 'Smoother than a third-period excuse.', 'Somebody frame that pass.', 'That lane just got a standing O.'],
  bump: ['The boards would like a word.', 'Two minutes for boarding... the boards.', 'Insurance has been notified.', 'Easy there, Gretzky.', 'That one is going on the blooper reel.'],
  half: ['Halfway there. The beer line is not.', 'Ice looking glossy. Dads in 104 are emotional.'],
  low: ['Ten seconds! The ref is tapping his watch.', 'Puck drop incoming, driver!', 'Hurry, the beer league has a 10:15 slot!'],
  hat: ['HAT TRICK! Somebody\'s buying the first round.'],
  mascot: ['Mascot down! He\'s fine. His pride isn\'t.', 'Please do not bump the mascot. Again.'],
  nacho: ['Nacho slide! Ten out of ten from the judges.', 'Cheese on ice. Bold strategy.'],
  octo: ['An OCTOPUS! Detroit says hi.', 'Eight legs, zero tickets.']
};
IL.SIGNS = ['MARRY ME ZAMBONI GUY', 'ZAMBONI > GOALIE', 'I CAME FOR THE ZAMBONI', 'HONK IF YOU ❤️ ICE', '9 MPH OF PURE POWER', 'BEER LEAGUE LEGEND', 'FLOOD IT LIKE YOU MEAN IT', 'ICE ICE BABY', 'WILL WORK FOR CLEAN ICE', 'MY DAD DRIVES THAT', 'ZAMBONI 4 MVP', 'SHOW ME THE BLADE'];
IL.CHIRPS = ['Hey Zamboni! You missed a spot!', 'My grandma drives faster!', 'Nice lane, buddy!', 'Is that thing in reverse?', 'Hurry up, my knees are cooling off!', 'Somebody get this guy a contract!', 'Smoother than my slapshot. Way smoother.', 'Do a donut! DO A DONUT!', 'Ref, check his license!', 'I\'d let him flood my driveway.'];
IL.SKATER_LINES = ['Five more minutes!', 'I was working on my edges!', 'Fine, FINE.', 'One more lap!', 'My beer\'s on the bench anyway.', 'Coach said I need cardio...', 'Okay, okay!'];
IL.GRADE_TITLES = { S: 'ICE SO CLEAN THE GOALIE CAN SEE HIS PAYCHECK', A: 'ZAMBONI DRIVER OF THE YEAR. AGAIN.', B: 'SOLID SHIFT. BEER LEAGUE APPROVED.', C: 'IT\'S... PLAYABLE. MOSTLY.' };

IL.dailyNumber = function (d) { d = d || new Date(); return Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(2026, 0, 1)) / 864e5) + 1; };
IL.dailyEvent = function () {
  const n = IL.dailyNumber(), vi = n % 6, v = IL.VENUES[vi], base = v.events[1];
  return { vi: vi, n: n, seed: n * 7919 + 13, ev: { name: 'Daily Rink #' + n, time: 'TODAY', icon: '📅', timer: 55, stars: [70, 84, 93], dirt: 1, obs: Object.assign({}, base.obs), quip: 'Same rink for everyone today. Post your grade.', jobs: ['clear', 'fix', 'zamboni'], skaterKind: 'fan', skaters: 8, damage: 4, design: Object.assign({}, v.design), daily: true } };
};
IL.quickEvent = function (vi) {
  const v = IL.VENUES[vi], base = v.events[Math.min(2, 1 + (vi > 1 ? 1 : 0))];
  return { name: 'Quick Shift', time: 'NOW', icon: '⚡', timer: 45, stars: [60, 74, 86], dirt: 1, obs: Object.assign({}, base.obs, { players: 0 }), quip: '45 seconds. Go.', jobs: ['zamboni'], skaterKind: 'fan', skaters: 0, damage: 0, quick: true };
};

/* ===== v4: puck-flinging is the main game ===== */
IL.GAME_TITLE = 'Celly Belly';
IL.FLICK_LINES = {
  hit: ['Snipe!', 'Wheels!', 'Ferda!', 'Dirty!', 'Filthy!', 'Beauty!'],
  miss: ['Off the glass and out.', 'Hit the net, buddy!', 'That\'s a beer-league wrister.', 'The goalie didn\'t even move.'],
  clear: ['Top shelf, where mom keeps the cookies!', 'Bar down, baby!', 'Somebody call the highlight reel.', 'Celly time!'],
  fail: ['Out of pucks. Out of excuses.', 'The cooler wins this round.', 'Grab another bucket of pucks.'],
  goalie: ['SAVE! The bubble-goalie lives.', 'Robbed! Glove side!', 'He\'s a brick wall with eyebrows.'],
  rounds: ['Round 2. The boys are getting loose.', 'Round 3. Aim is... interpretive.', 'Round 4. Is the rink tilting?', 'Round 5. Full beer-league physics.'],
  bench: ['Shoot the puck, Barry!', 'My kid shoots harder than that!', 'Pick a corner!', 'Just throw it at the net!', 'That\'s going on the group chat.', 'Who taught you to shoot, a Zamboni?']
};

/* cosmetic unlock cadence: unlocked by total stars earned (cosmetic only) */
IL.COSMETICS = [
  { id: 'tape-white', kind: 'tape', name: 'White stick tape', stars: 3, col: '#f4f4f4' },
  { id: 'puck-red', kind: 'puck', name: 'Rec-league red puck', stars: 8, col: '#a3161f' },
  { id: 'horn-dad', kind: 'horn', name: 'Double goal horn', stars: 14 },
  { id: 'tape-pink', kind: 'tape', name: 'Pink sauce tape', stars: 20, col: '#ff6fb5' },
  { id: 'puck-gold', kind: 'puck', name: 'Golden puck', stars: 32, col: '#d4a017' },
  { id: 'tape-camo', kind: 'tape', name: 'Hunting-camo tape', stars: 48, col: '#6b8e23' },
  { id: 'puck-ice', kind: 'puck', name: 'Frosty puck', stars: 72, col: '#6fb7d9' }
];
