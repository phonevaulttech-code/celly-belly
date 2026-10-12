# Celly Belly — Top Shelf, Bottom Barrel

**Main game:** one-finger puck flinging (Pop Shot style). Launch → home → big **PLAY** starts your next level.
- Flick up from anywhere to shoot; drag length = power (ring meter), bow your swipe sideways for spin/curve; dotted aim preview includes board bounces.
- 32-level ladder (10 seeded templates × tiers): cup/can pyramids with chain reactions, cones, breakable glass, walls for bank shots, 2-hit coolers, fan's nachos on the boards, swinging tire (through = bonus), ref's whistle, moving bubble-goalie (five-hole when pads open), goal + post/crossbar PING (ping-in = BAR DOWN).
- Limited pucks; 3★ = clear with 2+ pucks left. Trick bonuses: bank shot, combo, curve, stack attack. Slow-mo on the final hit. Instant retry (↻ / R).
- **Beer League**: 75s, 5 "rounds" — aim drift, reticle wobble, screen sway. Grade + PB.
- **Daily Level**: date-seeded, same for everyone; 1080x1920 story share card + copy text.
- Clip it (🎬), streamer mode (🎥 / Shift+S), boss key (📊 / B), mute (🔊 / M).
- **Rink Manager** (ICELOCK Zamboni side gig) is still there from the home screen.

# Celly Belly — Top Shelf, Bottom Barrel

**v2 — cozy Rink Manager.** Charming "bubble people" (round bodies, big eyes, hats, scarves, waddles,
emotes ❤️💧💢♪) fill the seats, skate the ice, coach the benches and ref the game. Each event is a short
sequence of pre-game prep jobs, then puck drop:

| Job | How |
|---|---|
| 🙋 Clear skaters | Tap skaters (or near a group) to whistle them off — they waddle to the green EXIT gate |
| 🔧 Fix the ice | Drag the scraper / watering can over pulsing holes, ruts and chips until the ring fills |
| 🖌️ Paint the ice | Trace the glowing guides (center line, blue lines, center circle, logo). Forgiving brush; each guide auto-completes at ~85%. Locks the Designer's design onto the ice |
| 🚜 Zamboni run | The original resurfacing shift — dirty → clean reveals the painted design |
| 🏒 Event | Players + ref waddle out, fans react to ice quality (hearts / cheers / sweat / angry puffs) |

Event 1 of each venue = clear + Zamboni (practice), event 2 = clear + fix + Zamboni (game night),
event 3 = 🖌️ opener with full prep incl. paint. Staff hires (Upgrades → Staff): **Bea** auto-whistles
skaters, **Gus** pre-patches 2 spots, **Pip** gives a fatter/more forgiving brush, **Mo** +10% coins & happier fans.
Your crew shows on the hub.

---


A casual, mobile-first arcade game where you're the **Rink Manager**: drive the Zamboni,
clear the ice before puck drop, and watch **your own custom ice design** shine through
the fresh sheet. No build step — plain HTML/CSS/JS with classic `<script>` tags.

## Run
- **file://** — open `index.html` directly in a browser.
- **Static server** — `python3 -m http.server 8766 --directory /workspace/icelock-zamboni` → http://localhost:8766

## How to play
- **Mobile:** touch and drag anywhere. The Zamboni drives toward your finger (dashed target ring).
- **Desktop:** WASD / arrow keys (holding only a turn key creeps forward, so you can't get stuck). Mouse drag works too. `P` / `Esc` pauses.
- The rear blade lays down glossy clean ice and reveals the rink design underneath. The live **% CLEAN** meter has ★ marks at the 1/2/3-star targets.
- **Combo:** keep cleaning *fresh* ice with no overlap and the multiplier climbs (up to x3). Long straight passes call out **PERFECT LANE**.
- Scoop pucks, gloves, hats (3 = **HAT TRICK**) and octopi for bonus coins. Nacho spills make you spin, the mascot tracks slush (bumping him is funny but costs you), players hang around the bench, hockey stops dump fresh snow, and outdoor snowfall slowly re-dirties the ice. From the College venue on there's a water tank you refill at the blue **💧 WATER** gate.
- Once you reach the 1-star target, a **"Wave players on — finish!"** button lets you end early for a time bonus. Hitting 100% = **PERFECT ICE** + confetti.

## Manager layer
- **Rink Manager hub:** rink name, team, reputation, fans, day, today's schedule (3 events per venue, e.g. Learn-to-Skate 9:00 AM, Youth Practice, Beer League Night), plus a daily bonus.
- **Ice Designer:** center-ice logo (shapes, emoji, team initials), logo and crest colors, red/blue line and faceoff circle colors, ice tint, board color, board ad text, rink and team names. Changes render live, with a dirty/clean preview toggle. Saved **per venue** in localStorage, and painted under the ice in gameplay.
- **Upgrades:** Zamboni (wider blade, engine, water tank), 8 skins, rink upgrades (LED lights, scoreboard/LED HUD, seats = bigger crowd, concessions = +15% coins, arena organ). Rink upgrades also add reputation.
- **Venues (unlocked by reputation):** Community Rink (Madison, WI) → Westside High → University Coliseum → The Barn (minor league) → Pro Arena → Winter Classic (outdoor, snowfall) → bonus Backyard Pond.
- Coins are virtual only. The "coin pack" button is a free, simulated placeholder with no real purchases.

## Files
```
index.html          screens + HUD
css/style.css       UI styling (390×844 first, desktop OK)
js/data.js          venues, events, logos, palettes, skins, upgrades, PA quips
js/save.js          localStorage save (key: icelock.zamboni.v1), per-venue designs
js/audio.js         WebAudio SFX (engine, scrub, crowd, organ…) adapted from zamboni-triumph
js/bubbles.js       bubble people + emotes + animated front-row fans
js/jobs.js          prep jobs: clear skaters, fix ice, paint, event moment
js/rink.js          canvas art: ice design, dirt texture, venue backdrop, Zamboni & sprites
js/game.js          gameplay: physics, coverage mask + grid, combos, obstacles, HUD
js/ui.js            hub, venues, designer, upgrades, pre-shift sheet, results
js/main.js          boot, shift flow, rewards; window.ICELOCK test hooks
tests/smoke.js      Playwright smoke test
screenshots/        hub, designer, venues, gameplay, results, per-venue shots
```

## Tests
```
node tests/smoke.js                                    # file://
ICELOCK_URL=http://localhost:8766/ node tests/smoke.js # via server
```
The smoke test runs at 390×844 and covers designer save + reload, the clear-skaters job (real taps), fix-ice (drags), paint (tracing guides, progress rises, design locked in), Zamboni clean % rising, the event moment, results job breakdown, retry, pause→hub, and hiring staff. Older description: It loads the hub, opens the designer and changes the logo, color, and rink name, saves, and checks localStorage (and that the change survives a reload). It then opens venue select, starts shift 1, drives with pointer and keyboard, checks that clean % rises, force-finishes, checks the results screen and save, then tests retry and return to hub. It fails on any console error.
