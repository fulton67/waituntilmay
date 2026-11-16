# march2004.com — UI motion and spacing study

Study notes only. No code, CSS, font, image or copy from this site ships. Measured 2026-11-16.
Linked from newapology.com (the site footer credits "New Apology", seen in `page-498a6189eb19b0af.js`).
What it is: a single-page mixtape archive with a built-in audio player (queue, Chromecast, idle screensaver).

Tags used below: **[obs]** observed at runtime (capture JSON, probe JSON or video frame), **[code]** read
from the shipped bundle text, **[inf]** inferred from the two, **[unk]** not recovered.

## 1. Pages captured

The site has exactly one route. `index.html` contains no same-origin `<a href>` other than icons and
`manifest.json`; the only other links are 94 external portfolio links, Instagram links and
`mailto:info@march2004.com` ([obs] `facts.links` in both captures). So "up to 6 page types" is 1 here.

| Page | 1440 capture | 390 capture | Session video |
|---|---|---|---|
| `/` (home: header, 4-col or 2-col mixtape grid, fixed player bar, footer) | `runtime/march2004.com_1440.json` | `runtime/march2004.com_390.json` | `runtime/video/cfe514c99dc3e10d3bf10710b5193f34.webm` (1440), `runtime/video/d673a6461e929680a5f472aa9f8d0ec9.webm` (390) |

Capture facts: docH 9433 px (1440) / 15088 px (390); 3297 / 3296 visible elements; 94 `<img>`, 4 `<video>`,
0 `<canvas>` at load (1 p5 canvas created later, see M5); 1745 / 621 animation samples at 50 ms.
Marks (1440, ms from navigation): loaded 2875, settled 6416, scroll 7000-41670, hover 43332-90812.

Extra probe: `march2004.com/wheelprobe_home_1440.json` (one wheel impulse, scrollY sampled every rAF).
Frames: `march2004.com/frames/` (25 fps PNGs `load_1440_001..150.png` = video 0.00-5.96 s, plus contact sheets).
Video timing note: the Playwright recording starts before navigation, so video time is roughly
performance time plus 1 to 2 s; frame references below use **video** time (frame n = n/25 s).

## 2. Stack (REA + bundle text)

REA 6.8.0 `analyze-javascript-application`, summary delivery:
- Evidence `ev_c5e84f2919568e06567a6f8f022dc893c506777cd2572205f1d5489526633f9b` (summary view), parent
  `ev_be334c2c0e591050e5996de90e986e605c8fc3219ad72b0fd8039b60266dee4b`; full bundle `march2004.com/rea-evidence.json` (97.5 MB).
- Scope: 19 app-owned files selected (`march2004.com/rea-sources.json`), **19 parsed, 0 parse failures**,
  68,208 AST nodes, 100 modules, 427 findings, coverage `partial` (11 inventoried files left out by selection).
- A first whole-tree run timed out at 300 s on `25b8c134.6027246e75063825.js` (111 KB, a p5 add-on); partial
  Evidence `ev_eb73f149343d9f423dd4414a823ef6de9741ef6602caccec00abc74301e4e8a3`. Framework chunks were then excluded.
- Graph nodes in the bundle: javascript-module 356, javascript-asset 29, javascript-chunk 22, worker 2, endpoint 2
  (`/_next/image` route candidate, Sanity `loader/query-listen`).

Bundle: Next.js App Router (`self.__next_f`), 14 referenced + 17 lazy chunks (webpack runtime map), 2 CSS files.
Library fingerprints (counts are string occurrences across all 31 downloaded JS/CSS files):

| Library | Present? | Evidence |
|---|---|---|
| p5.js (+ WebGL filter path) | **yes, lazy** | 369 `p5.` refs in `160.3ec2aca4282a33a4.js` (719 KB); loaded by `Promise.all([i.e(169),i.e(323),i.e(420),i.e(160)])` from the page chunk when a cover enters view [code] |
| dnd-kit (queue reorder) | yes | `353-5935a02209ded3a8.js`; queue item transition string `transform 300ms cubic-bezier(0.15, 0, 0.25, 1), opacity 300ms ...` [code] |
| Lenis | **no** library | only the attributes `data-lenis-prevent-wheel` / `data-lenis-prevent-touch` (2) on the queue list; no `lenisVersion`, no `new Lenis` [code] |
| framer-motion | **not in the app** | 2 `framer` hits are inside `769.7b6c4566582ae8ec.js`, the Vercel live-feedback toolbar chunk, not page code [code] |
| GSAP / ScrollTrigger / SplitText / Swiper / Barba / Swup / Three / OGL | absent (0) | [code] |
| Google Cast SDK | yes | 9 `chrome.cast` refs, `march2004CastSessionId` in localStorage [code] |
| CSS motion | 5 `@keyframes`, ~30 transition rules | `3c61e8deca13cfd9.css` [code] |

Global tokens from `:root` [code]: `--white:#fafafa; --black:#212121; --dark_gray:#bbbbbb; --light_gray:#eaeaea;`
`--easing_1: cubic-bezier(0.15,0,0.25,1)`. `html { scroll-behavior: smooth }` (in `9447a93dc6470e84.css`).

Runtime instrumentation [obs]: rAF calls 207 (1440) / 98 (390); `Element.animate` 0; IntersectionObserver 2
(`{rootMargin:"200px"}` for next/image lazy load, `{rootMargin:"200px",threshold:0.01}` for the p5 cover);
scroll/wheel listeners 7; inline transform/opacity writes **1** in the whole session (the p5 canvas size).
Timelines: DocumentTimeline only. So **all motion is CSS animations and transitions**, plus one p5 canvas.

## 3. Motion table

Easing profiles used below (computed from the bezier, `scratchpad/tools/fit.py` method): for `--easing_1`
(.15,0,.25,1): 45 % of the distance at 25 % time, 80 % at 50 %, 90 % at 63 % time, 99 % at 88 %; peak velocity
at 14 % of the duration (2.3x the average). It is a short ease-in with a long, soft tail, close to CSS `ease`
(.25,.1,.25,1: peak at 21 %). The second curve (.55,0,.2,1) used on the player and form: 12 % at 25 % time,
73 % at 50 %, peak velocity at 38 % (3.2x), so it is a stronger in-out.

### M1. Grid entry: staggered fade-in of every mixtape tile (signature)
| | |
|---|---|
| Type | CSS animation `mixtapes_fade-in` on `.mixtapes_playlist_wrapper` [code+obs] |
| Keyframes | `0% {opacity:0}` to `100% {opacity:1}`; no translate, no scale [code; obs `getKeyframes()`] |
| Duration | **750 ms** [obs `anims`, duration 750] |
| Easing | `--easing_1` cubic-bezier(.15,0,.25,1), applied per keyframe; the timeline reports `linear` [obs] |
| Delay / stagger | inline `animationDelay = 350 + 50 * min(index, 12)` ms, so 350, 400, ... 950 ms, then every tile after the 13th shares 950 ms [code `page-498a6189eb19b0af.js`; obs 10 distinct `animation-delay:350ms..800ms` values in the SSR HTML] |
| Fill | `forwards`, 1 iteration [obs] |
| Trigger | mount (load). Not viewport-triggered; tiles below the fold finish while off screen [code+obs: first sample at 202 ms] |
| Layout guard | `content-visibility:auto; contain-intrinsic-size:auto 320px` on each tile [code] |
| Frames | video f29-f30 (1.16-1.20 s) tiles 1-2 appear as light-grey placeholders; f31 (1.24 s) tiles 3-4 begin; f33 (1.32 s) row 2 begins; tiles fill in reading order, about 2 tiles per 50 ms frame step; whole first screen at full placeholder opacity by f45 (1.80 s). Sheet: `frames/sheet_stagger_f026-055.png` [obs] |
| Measured curve | opacity only; the stagger order is index order (newest mixtape first, `sort by date desc`) [code] |

### M2. Cover image load crossfade (loader out)
| | |
|---|---|
| Type | CSS transition `opacity` on `.mixtapes_loader` (light-grey `#eaeaea` plate over each cover) [code+obs] |
| Values | `1 -> 0` when the image reports loaded (`.mixtapes_loaded` class) [obs keyframes] |
| Duration / easing | **750 ms**, `--easing_1` [obs, first at 1122 ms (1440) / 1165 ms (390)] |
| Frames | covers emerge through the grey at f46-f49 (1.84-1.96 s) and are fully saturated by f51 (2.04 s) [obs `sheet_stagger_f026-055.png`] |
| Net effect | a two-stage reveal: grey plate fades in (M1, 750 ms), then the picture fades through it (M2, 750 ms) |

### M3. Player bar expand and progress
| | |
|---|---|
| Type | CSS transition (`height`) on the fixed bottom bar `.ui_ui_wrapper` [code] |
| Values | 42 px collapsed -> 305 px open (desktop); 40 px collapsed on mobile [code] |
| Duration / easing | **750 ms**, cubic-bezier(.55,0,.2,1); the chevron rotates on the same curve [code] |
| Progress bar | `progress` value transitions `all .75s cubic-bezier(.55,0,.2,1)`, 5 px tall, fixed at bottom 41.8 px [code] |
| Now-playing cover | children fade `ui_fade` 0->1, 500 ms, `--easing_1`, 50 ms delay on the image [code] |
| Marquee | long titles scroll `translateX(0) -> calc(-100% - 12px)`, **10 s linear, 1 s delay, infinite**, with white-to-transparent edge gradients [code] |
| Runtime | not opened during capture (no click), so [code] only |

### M4. Idle screensaver (60 s, only while a mixtape plays)
| | |
|---|---|
| Trigger | `setTimeout(60000)` reset by mousemove/keydown/scroll/touchstart; renders only when a mixtape is active; cursor hides after 5 s more idle (`setTimeout 5e3`, class `hideCursor`) [code] |
| Enter | wrapper transition 750 ms `--easing_1`: opacity 0->1, `backdrop-filter: blur(16px) -> blur(0)`, background `rgba(250,250,250,0)` -> `--white` [code] |
| Cover change | next cover `opacity 0, filter blur(2px)` -> `opacity 1, blur(0)`, 500 ms `--easing_1`; outgoing text keyframe `opacity 1, blur 0 -> opacity 0, blur 2px`, 500 ms [code] |
| Runtime | **[unk]** not reached: capture did not start playback |

### M5. Generative clock cover (p5.js canvas)
| | |
|---|---|
| Type | p5 sketch inside one mixtape tile; `createCanvas(600,600)`, `frameRate(30)` [code] |
| Content | white clock face (`ellipse` r = 0.4 x 600, stroke 5), hour/minute hands black, second hand red `color(255,0,0)`; 18 letters "MARCH2004MARCH2004" placed on a ring at r = 0.8 x face radius; when the second hand ticks into a letter, that letter starts falling under gravity, collides with the hand and with other letters (4 physics sub-steps per frame, dt = 1/60 / 4) [code] |
| Display | backing store 600 x 600 scaled into the tile: box `[1086,1040,330,330]` at 1440, `[203,777,173,173]` at 390 [obs styleWrites t=9284 ms / 12266 ms] |
| Trigger | lazy: IntersectionObserver `rootMargin:200px, threshold:0.01`; paused when `document.hidden` [code] |
| Frames | visible in column 4 at video 14-20 s; letters ring the face, red second hand visible [obs `frames/sheet_col4_8-24s_1fps.png`] |

### M6. Other covers
Some covers are GIFs or `coverVideo` files; they change on their own (video 4.4-4.8 s, tiles 1 and 8 swap
images in `sheet_load_1440_every5.png`). That is media content, not UI motion [obs].

### M7. Password field (gated playlists)
`.home_form_wrapper` slides from `right:144px` to centre (`right:50%; translateX(50%)`), 1 s cubic-bezier(.55,0,.2,1);
its underline `:after` grows `width 0 -> calc(100% + 24px)`, 1 s same curve, **950 ms delay** (so the line draws after
the field has nearly arrived); wrong-password text fades in 500 ms `--easing_1` [code]. Not triggered [unk runtime].

### Load artefact worth knowing
At 1440, ~25 `CSSTransition`s fire at 398-403 ms on load (UA button styles `border 3px -> 0`, `font-size`,
`margin 13.33px -> 0`, `line-height 16 -> 12px`) because `.txt_hvr`/`.btn_hvr` set `transition-duration`
without `transition-property` (so `all`) [obs `anims`, first 398-403]. Not present at 390 (only 2 animations there).
It is a side effect, not a designed motion.

## 4. Smooth scroll

- No Lenis or JS scroll engine [code]. Wheel scrolling is native.
- Probe [obs `wheelprobe_home_1440.json`]: one 500 px wheel impulse moved scrollY 0 -> 500 in a single step,
  first change 73 ms after the wheel (one rAF at the ~31 ms headless frame interval plus input latency), no
  tail. 120 px impulse: 0 -> 120 in one step at 67 ms. Ten 120 px wheels 94 ms apart: scroll settled 32 ms after the
  last wheel. Headless Chromium does not run the OS smooth-wheel animation, so a desktop user sees Chrome's own
  ~150 ms wheel smoothing [inf], not anything from the site.
- `scroll-behavior: smooth` affects programmatic scrolls only: the capture's `scrollTo(0,0)` after the scroll pass
  animated, visible as one blurred mid-scroll frame around video 49.5 s in `sheet_hover_1440_44-64s_2fps.png` [obs].
- No sticky elements (0 at both widths). Fixed: header buttons, the player bar and its progress bar/slider [obs].

## 5. Page transitions

None: single route, no router transitions, no View Transitions (0 `startViewTransition`) [code].

## 6. Hover states (1440, `@media (hover:hover)` only)

| Target | Change | Duration / easing | Source |
|---|---|---|---|
| Text links (`a`, `.txt_hvr`) | colour `#bbbbbb` (links are grey by default) -> `#212121` | 300 ms `--easing_1` | [code]; [obs] CSSTransition color 300 ms |
| Buttons (`.btn_hvr`) | background -> `#eaeaea` (light grey plate), padding 1/6 -> 4/8 px | 350 ms `--easing_1` | [code+obs] |
| Header zoom icon (`rect`) | fill `#212121` -> `#bbbbbb` | 350 ms | [obs] CSSTransition fill 350 at 51.0 s |
| Mixtape tile | play/queue options layer fades in, **`backdrop-filter: none -> blur(4px)`** over the cover | 500 ms `--easing_1` | [obs] CSSTransition backdrop-filter 500 ms at 47.8 s |
| Tile info layer | `#eaeaea` plate opacity | 350 ms | [code+obs] |
| "Added"/"Playing" buttons | width + background | 250 ms / 350 ms | [code] |
| Queue drag | dnd-kit transform, 300 ms `--easing_1`; drop lines fade 500 ms | [code] |

No scale, no translate, no image zoom on hover anywhere [code+obs: 0 transform writes].

## 7. Spacing, grid, type, colour

**Base unit: 6 px, doubling scale 6 / 12 / 24 / 48 (96, 144 = 6 x 16, 6 x 24).** CSS px histogram over all
padding/margin/gap/inset declarations [code]: 12 px x21, 24 x17, 6 x9, 15 x9 (mobile gutter), 4 x6, 48 x3, 144 x2.
Runtime histogram (1440) [obs]: gaps 6 px (199 elements), 12 px (302 column gaps), 4 px (173), 24 px (6), 48 px (1).

| Token | 1440 | 390 |
|---|---|---|
| Page side padding | 24 px | 15 px |
| Grid | **4 columns x 330 px, gap 24 px** (`--cols:4` inline; zoom button switches 3/4/6) [obs grid] | **2 columns x 172.5 px, gap 30 px row / 15 px column** [obs] |
| Grid top margin | 96 px | 48 px |
| Tile internal gap (cover to caption) | 6 px | 6 px |
| Header | padding 24 px 24 px 0, gap 14 px | 15 px right inset, 7 px gap |
| Player bar | 42 px tall, 12 px side padding | 40 px, gap 12 px |
| Footer | 50vh tall, gap 48 px, margin-bottom 47 px | gap 12 px, margin-bottom 59 px |
| Breakpoints | 599, 999, 1439, 2001 px [code] | |

Type [obs `facts.type`]: one family, `Octave_Regular` (self-hosted woff2), **one size**:
`font-size: clamp(11px, 2vw, 12px)` -> 12 px at 1440, 11 px at 390, weight 400, letter-spacing normal, no
uppercase. Line-heights 11 / 12 / 16 px. Hierarchy comes only from colour (black vs `#bbbbbb`) and position.

Colours: background `#fafafa`, text `#212121`, secondary/links `#bbbbbb`, plates `#eaeaea`; selection inverts
to `#bbbbbb` on `#eaeaea`; one accent, red, only inside the clock sketch [code].
Radii: **0 everywhere** (one `border-radius:0` declaration) [code]. No shadows.

## 8. What to learn for calm, premium motion (dermatologist explainers and reels)

Worth taking as technique:
1. **One house curve.** The whole site uses `cubic-bezier(.15,0,.25,1)` for everything soft and one stronger
   in-out `(.55,0,.2,1)` for structural moves. For the brand bible: pick one "soft" and one "structural" curve and
   ban the rest. This curve reaches 80 % at half time and then glides, which reads as calm.
2. **Stagger by index with a cap.** `350 + 50*min(i,12)` ms: a fixed lead-in (350 ms), a short step (50 ms) and a
   cap so a long list never takes longer than 950 ms to start. In a reel: bullet points, product shots or
   before/after tiles enter 50-80 ms apart, and never more than ~12 steps.
3. **Two-stage reveal: plate, then picture.** A neutral plate fades in first (750 ms), the image fades through
   it (750 ms). For explainers: show the empty frame or a light-grey card first, then cross-fade the clinical image
   into it, so the eye lands before the detail arrives.
4. **Opacity and blur instead of movement.** Entrances here have no translate or scale at all. Change states with
   opacity plus a small blur (2 px on covers, 4 px backdrop on hover, 16 px on the screensaver). A 2 px blur-to-sharp on a
   condition close-up is a gentle "focus pull".
5. **Delay the decoration.** The input underline draws 950 ms after the field starts moving. Lines, labels and
   callout strokes should arrive after the object they annotate has settled.
6. **Spacing on a 6 px doubling scale** (6/12/24/48) and a single type size with grey vs black for hierarchy:
   strong restraint that fits on-screen captions.

Do not copy:
- The grid fade is mount-triggered for every tile, including tiles far below the fold, so most of it is never seen.
  In video, time each entrance to when it is on screen.
- `transition` without a property list (the load-time burst of ~25 unintended transitions at ~400 ms).
- The marquee (10 s linear infinite) and the falling-letter clock are playful brand toys, too busy for medical content.
- The single 11-12 px type size works on a desktop music site but is far below caption legibility for reels.
- Anything that animates `height` (player bar) or `backdrop-filter` (hover, screensaver) is fine on a site but adds
  nothing in rendered video beyond what an opacity fade gives.
