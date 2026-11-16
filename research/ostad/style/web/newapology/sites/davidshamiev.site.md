# davidshamiev.site — motion and spacing study

Study notes only. Nothing from this site (code, CSS, fonts, images, copy) ships. Measured 2026-11-16.
David Shamiev is the developer New Apology lists on its project pages (his own project list names
"Grit Shift" and "Pavlo Lotnik" as "developed in collaboration with New Apology Studio", bundle `p2` array).
Tags: **[obs]** observed in a capture, **[code]** read from the shipped bundle, **[inf]** inferred, **[unk]** unknown.

## Pages captured

The site is **one route** (`/`). Vite + React SPA, no router (`path:` occurs 0 times as a route; the two hits are GSAP
MotionPath internals). The "pages" are four **overlay panels** opened by clicking words on the intro: `stack`,
`projects`, `about`, `contact` (bundle component `_2`, state `selectedSection`). `capture.mjs` only scrolls and hovers,
so a second script clicks every panel open: `tools/ds_sections.mjs`.

| Capture | File (`sites/runtime/`) | Notes |
|---|---|---|
| Home 1440 | `davidshamiev.site_1440.json` | docH 900 = viewport (no scroll); 11 visible elements; 619 style writes; 0 links/media to hover |
| Home 390 | `davidshamiev.site_390.json` | docH 844 = viewport; 587 writes |
| Panels 1440 (clicks, hovers, drag) | `davidshamiev.site__sections_1440.json` | 1,590 writes, 5 CSS transitions, phase marks in `marks` |
| Panels 390 (taps) | `davidshamiev.site__sections_390.json` | 1,432 writes, 0 CSS transitions (no hover on touch) |
| Video 1440 / 390 | `sites/davidshamiev.site/frames/sections_1440.webm`, `sections_390.webm`; overview sheet `frames/sections_1440_1fps.png` (1 frame/s, 11 x 6) | The 1440 video runs ~1.9x slower than wall time (66 s file for a 35 s session), so frame refs below are sheet cells, not ms |

Caveat [obs]: headless Chromium ticked rAF at **~31 ms** (32 fps) in every capture, so curves have ~31 ms resolution;
fitted durations still land on the code values within 10 ms.

## Stack (static bundle)

Bundle: `extracted/assets/index-mTyzRCjo.js` (324,737 B) + `index-AVXA6dhX.css` (8,429 B); fonts from Google Fonts
(PT Serif, Public Sans, Fragment Mono); GoatCounter analytics. No sourcemap.

REA: `rea analyze-javascript-application` on `sites/davidshamiev.site/extracted` hit the 300,000 ms per-source
provider deadline on `index-mTyzRCjo.js`; a rerun with `--analysis-timeout-ms 1500000` also timed out on that one
file after 25 min (`rea.json`: `provider_timeout`, partial-observation Evidence
`ev_0aa20004986e02f9d6f5e821d1d1daac424dacb74d3d90038d32161f2818434e`, no graph).
**No completed REA graph for this site.** All stack claims below come from text search of the bundle.

| Library | Evidence (bundle text) |
|---|---|
| **GSAP 3.15.0** core | `version:"3.15.0"`; 84 `gsap` hits; `@gsap/react` `useGSAP` (minified `Ao(...,{scope})`) |
| **Draggable 3.15.0** | `ui.version="3.15.0"`, `ui.create(".thing",{type:"x,y",zIndexBoost:!0})` |
| ScrollTrigger + Observer/normalizeScroll | registered (`rn.registerPlugin(ge,Pv)`), **no ScrollTrigger is created** anywhere in app code [code]; docH = viewport so nothing scrolls [obs] |
| MotionPathPlugin | registered (`Pv={version:"3.15.0",name:"motionPath"}`), unused by app code [code] |
| Canvas 2D | `Cx` component: full-screen fixed `<canvas>` at z-index -1 |
| Absent (0 hits) | Lenis, framer-motion, Three/OGL/WebGL, Swiper, Barba/Swup, Locomotive, IntersectionObserver (0 created [obs]), CSS `@keyframes` (0 [obs]), `cubic-bezier` (0) |

## Motion table

All values: code from the bundle, curve from the styleWrites log fitted with
`v(t)=a+(b-a)(1-(1-u)^n)` (GSAP `power1.out` is n=2, `power3.out` n=4, `power4.out` n=5).

### A. Intro text "blur-rise" (the signature)
| | |
|---|---|
| Type | GSAP `fromTo` [code] |
| Target | 3 greeting lines (`.intro__greet`) + 4 nav words (`.intro__sections`) = 7 elements |
| Trigger | mount (useGSAP), first tween write at 295 ms after navigation start [obs] |
| From → to | `y:16px, filter:blur(4px)` + CSS `opacity:0` → `y:0, blur(0), opacity:1`; `clearProps:"filter"` at end [code] |
| Duration / ease | `duration:.5, ease:"power3.out"` [code]. Fit [obs]: n=4, D=500 ms (rms 0.0014-0.0027 opacity) on greet 3, stack, projects, about; first two lines fit D=580-600 n=5 because their opening frames were dropped during page load |
| Stagger | `stagger:.12` [code]. Fitted starts 366, 485, 604, 725, 845, 966 ms → **119-121 ms** apart [obs] |
| Curve shape | progress 0.45 at 61 ms, 0.73 at 122 ms, 0.90 at ~220 ms, 0.99 at ~340 ms: peak velocity at frame 1, **90 % done at 44 % of the time**, no overshoot, last ~150 ms is sub-pixel settle [obs, `curves.py` dump] |
| Total sequence | 7 x 120 ms + 500 ms = **1.22 s** from first to last element settled |
| Mobile 390 | same code; same 16 px / 4 px values (px, not rem) so the motion is proportionally larger on a small screen [code] |

### B. Contact links blur-rise
`gsap.from(".contacts__section",{autoAlpha:0,y:16,filter:"blur(4px)",duration:.5,ease:"power3.out",stagger:.12})` [code].
Fit [obs, sections_1440 32.7-33.6 s]: n=4, D=490-500 ms, starts 32,756 / 32,876 / 32,996 / 33,118 ms → **120-122 ms stagger**.
Same recipe as A: the site has **one entrance grammar**, reused.

### C. Projects panel: scaleY "unfold" stagger
| | |
|---|---|
| Type | GSAP `to` per element, delay-based stagger [code] |
| Target | 8 `.project` cards (3 per row, `flex-wrap:wrap-reverse; row-reverse`, so they build from the bottom-right) |
| Trigger | click "projects" |
| From → to | CSS `opacity:0; transform:scaleY(.1)` → `opacity:1, scaleY:1`, transform-origin centre [code] |
| Duration / ease | `duration:.3`, no ease given → GSAP default `power1.out` [code]. Fit [obs]: **n=2, D=300 ms** on all 8 cards, rms 0.0016-0.0025 |
| Stagger | `delay:o*.1` [code]; fitted starts 7385, 7485, 7585, 7685, 7785, 7885, 7985, 8085 ms → **100 ms** [obs] |
| Total | 7 x 100 + 300 = 1.0 s |

### D. Project hover: image follows the cursor (lagged)
| | |
|---|---|
| Type | `gsap.quickTo(el,"x"/"y",{duration:.6,ease:"power3"})` on `mousemove` [code]; `.cursor--{id}:after` background image = project preview (10vw x 10vh) |
| Trigger | hover a `.project` (class swaps to `cursor--{id}`; image appears instantly, no fade) |
| Offset | `xPercent:10, yPercent:-5` |
| Step response [obs] | 300 px mouse jump at 17,176.6 ms: 10 % at 17 ms, **50 % at 110 ms, 90 % at 266 ms, 99 % at 423 ms, settled 1278.00 px at 548 ms**. Fit: **n=4 (power3.out), D=600 ms**, rms 0.40 px |
| Feel | a soft trailing lag, no overshoot; reads as "weight" without spring |

### E. About panel: objects toss to random places, then draggable
| | |
|---|---|
| Type | `gsap.to(.thing,{x:random(0,vw-w), y:random(...), rotate:random(-15,15)})` once all images load [code] |
| Duration / ease | defaults → 0.5 s `power1.out` [code]. Obs (`thing--music` 0 → 1108.84 px): 0.236 at 20,542, 0.895 at 20,817, 1.0 at 20,975 ms → start ≈ 20,479, **D ≈ 500 ms, n=2** [obs] |
| Stagger | none: all 13 objects launch on the same frame (20,542.5 ms) [obs] |
| Drag | Draggable `type:"x,y"`, `zIndexBoost` → z-index 1002 on grab; moves 1:1 with the pointer (30 px per 30 px step) and **stops dead on release, no inertia** (InertiaPlugin absent) [obs 24,115-24,733 ms] |
| Hover caption | `.thing__description` opacity 0→1 **500 ms ease** in, 1→0 **300 ms ease** out (CSSTransition, `anims` in sections_1440) — slower in than out [obs] |

### F. Stack panel bubbles
CSS `transition:.1s ease`, hover `transform:scale(1.5)` [code+obs: CSSTransition 100 ms `none → scale(1.5)`];
hovering pops the bubble (`display:none` after 200 ms timeout) and plays `/sounds/bubble-sound.mp3` [code]. Playful, fast; not our register.

### G. Canvas pointer trail (background)
`mousemove` → `lineTo` from previous to current pointer, `strokeStyle:#FEFA31`, `lineWidth:2.5`, **never cleared** so the
yellow scribble accumulates for the whole session (sheet cells 7-10 and 37-66) [code+obs]. Each mousemove re-runs the
React effect and starts another `requestAnimationFrame` loop without cancelling the old one: rAF calls **2,664** in a
17 s capture with no pointer motion vs **50,365** in the 35 s panels capture with pointer motion [obs] — a leak, not a technique.

## Smooth scroll
None. Document height equals the viewport at both widths (900 / 844), `scroll-behavior:auto`, 0 sticky, 0 IO [obs].
ScrollTrigger/Observer are registered but never drive anything [code]. Lerp: not applicable.

## Page transitions
None between routes (single route). Panel open = instant mount of a full-screen overlay
(`background #f5f5f59c` or `#ffffffcd`, `backdrop-filter: blur(.2rem)`) followed by that panel's own entrance (C/E/B).
Close = instant unmount [code].

## Hover states
Nav words and contact links: `:hover {font-style:italic}` — an instant style swap, no transition [code].
Projects: preview image follows cursor (D). About: caption fade (E). Stack: 100 ms scale 1.5 (F).

## Spacing / type / grid tokens

| Token | Value | Evidence |
|---|---|---|
| Root size | `html{font-size:.89vw}` (portrait 1.6vw, ≤600 px 2.6vw) → **12.816 px at 1440, 10.14 px at 390** | CSS; computed 20.5056 px = 1.6rem at 1440 |
| Base spacing | panel padding **1.5rem** (19.2 px @1440), intro padding **1.6rem** (20.5 px @1440 / 16.2 px @390) | CSS; `spacing.paddingTop` 20.5056 / 16.224 |
| Project card | padding 1.5rem, `border-left:2px solid #000`, margin-bottom .625rem, width 33 % (portrait 100 %), min-height 22.77vh | CSS |
| Gaps inside card | name→desc→link 1.2rem each | CSS |
| Layout | no grid; absolutely positioned words at % coords (e.g. stack 68 %/14 %, projects 79 %/25 %, about 86 %/39 %, contact 96 %/46 %) — a diagonal descending staircase | CSS |
| Type | PT Serif 400 **1.875rem** (24.03 px @1440, 19.01 @390) for greetings; Public Sans 400 **1.6rem** (20.51 / 18.25 px) for nav words; project name PT Serif 1.4rem ls .02rem; line-height normal everywhere | CSS + `facts.type` |
| Radii | none, except bubbles 50 % | CSS |
| Colours | text #000 on transparent/white; trail #FEFA31; overlays #f5f5f5 at 61 % (`9c`) and #fff at 80 % (`cd`); message pill #000/#fff at .9 | CSS |

## What to learn for calm, premium explainer / reel motion

1. **One entrance recipe, reused everywhere**: 16 px rise + 4 px blur-to-sharp + fade, 500 ms power3.out, 120 ms
   stagger (A and B are the same numbers). For captions and labels in a dermatologist explainer this gives "focus
   pulling in" without bounce. At 30 fps: 15 frames per element, 3.6 frames between elements, 90 % there by frame 7.
2. **Blur as the arrival cue**, not scale or slide distance: the travel is only 16 px; the blur carries the motion.
   Good for text over skin close-ups where big movement would be distracting.
3. **Lagged follow (600 ms power3.out, 50 % at 110 ms)** for anything tracking a subject (a pointer ring or label
   following a lesion as the camera drifts): it feels attached but soft.
4. **Slower in than out** on captions (500 ms vs 300 ms).

What not to copy: the random toss + rotation (E), the 100 ms scale-1.5 bubble pop with sound (F), the never-cleared
scribble trail (G), the rAF leak, scaleY(.1) unfold at power1.out (looks like a cheap squash next to the blur-rise),
and the instant italic hover swap.
