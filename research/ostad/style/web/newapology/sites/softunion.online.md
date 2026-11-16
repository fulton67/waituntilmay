# softunion.online — UI motion and spacing study

Study notes only. No code, CSS, font, image or copy from this site ships. Measured 2026-11-16.
Linked from newapology.com (the footer links to `https://newapology.com`). What it is: "Soft Union", an online
literary magazine ("New Literature every Mon - Fri") with a library of stories, reading tools and a Shopify shop.

Tags: **[obs]** observed at runtime (capture JSON, probe JSON or video frame), **[code]** read from the shipped
bundle text, **[inf]** inferred from both, **[unk]** not recovered.

## 1. Pages captured

`networkidle` never fired on this site (persistent connections), so the capture copy waited for `load`
instead (`WAIT=load`); everything else is the stock `capture.mjs` method, plus the video path recorded in each JSON.

| Page type | Route | 1440 | 390 | Notes |
|---|---|---|---|---|
| Home | `/` | `runtime/softunion.online_1440.json` | `runtime/softunion.online_390.json` | docH 5380 / 5267 |
| Index / list | `/library` | `runtime/softunion.online__library_1440.json` | `..._library_390.json` | 333 images, docH 33640 / 42873; styleWrites hit the 60,000 cap |
| Article (case page) | `/library/in-august` | `runtime/softunion.online__library__in-august_1440.json` | `..._in-august_390.json` | reading progress bar, reading tools |
| About | `/about` | `runtime/softunion.online__about_1440.json` | `..._about_390.json` | |
| Shop | `/shop` | `runtime/softunion.online__shop_1440.json` | `..._shop_390.json` | |
| Form page | `/submissions` | `runtime/softunion.online__submissions_1440.json` | `..._submissions_390.json` | nothing submitted |
| Product | `/products/issue-7`, `/products/tote-bag` | `..._products__issue-7_1440.json`, `..._products__tote-bag_1440.json` (+390) | | **failed**: 3 elements, docH 900, 0 animations in headless Chromium (client render did not complete); excluded |

Probes written for this study (scripts in the session scratchpad `tools/`):
- `softunion.online/wheelprobe_in-august_1440.json`: one wheel impulse (500 px, then 120 px) and ten 120 px wheels, scrollY sampled every rAF.
- `softunion.online/navprobe_home_to_article.json`: client-side navigation home -> `/library/in-august`, `Element.animate` calls and per-rAF opacity.
Frames: `softunion.online/frames/` (`load_1440_001..175.png` = home video 0.00-6.96 s at 25 fps, plus sheets).
Videos: home 1440 `runtime/video/92942a1613497dde41c1fba4121f42a3.webm`; article 1440 `.../814a57b1c95d3a77cc7fcc3e0479f5e8.webm`;
library 1440 `.../d55a0a5fa10483537f2c4de288cb31ea.webm`; shop 1440 `.../16b13caf04388033a6c3304bcff7cb27.webm`;
about 1440 `.../4fef3a433b1d101134952ebc1aa4ff6b.webm`; home 390 `.../d8435602da641f23c88c408ff1e90ebb.webm`.
Headless rAF ran at a **31.3 ms median interval (~32 fps)** in every capture and probe [obs]; frame-based numbers below
are converted to 60 fps where it matters.

## 2. Stack (REA + bundle text)

REA 6.8.0 `analyze-javascript-application`, summary delivery:
- Evidence `ev_844cf7d1777fd5b9c27387bbc1e82da26eeb0d8fe679c5822ed72c8a703779ca` (summary), parent
  `ev_5e07db9b70f8597080d430548190d5058e9d1efb5692ddbfbefc42e5ec2ba563`; bundle `softunion.online/rea-evidence.json` (111 MB).
- Scope: 22 app-owned files (`softunion.online/rea-sources.json`, 274,090 bytes), **22 parsed, 0 parse failures**, 76,103 AST nodes,
  151 modules, 749 findings, coverage `partial` (framework, GSAP core, framer-motion core and Sanity chunks excluded by selection).
- Graph nodes: javascript-module 579, javascript-asset 71, javascript-chunk 33, endpoint 14: `/api/sign-up` (newsletter),
  Shopify Storefront mutations `CartCreate`, `CartLineAdd`, `CartLineUpdate`, `CartLineRemove`, `CartQuery`, `CartNoteUpdate`, ...

Bundle: Next.js App Router, 31 referenced + 41 lazy chunks, 1 CSS file (`525d31579c42fd5a.css`, Tailwind v4), Sanity CMS images,
Shopify Hydrogen-react cart (`storefrontApiVersion:"2025-04"`).

| Library | Version / config | Evidence |
|---|---|---|
| **Lenis** smooth scroll | `window.lenisVersion="1.3.15"`; React wrapper `ReactLenis` with **`root: true, options: { lerp: 0.125 }`**; `autoRaf` default true | [code] `3510-ee05df6c836b85f3.js`; options in the RSC payload of `index.html` (`"root":true,"options":{"lerp":0.125}`); html class `lenis` at runtime [obs probe] |
| **framer-motion** | `AnimatePresence` + `motion.*`; all app transitions are tween `{duration, ease:[bezier]}`, no springs in app code | [code] `2443-ac14aaa79670b0c9.js` (library), usages in `7125`, `9591`, `2710`, layout, article page |
| **GSAP + SplitText** | GSAP core `0b0944fb-...js`; SplitText `4334-...js` used **only to split titles into lines** (`type:"lines"`, class `underline-hover--group`); no GSAP tweens found in app code | [code] component `SplitTextUnderline`, IntersectionObserver `{threshold:0.1, rootMargin:"0px 0px -20% 0px"}` [obs `ioOpts`] |
| Embla carousel | present (`1808-...js`, friction `.68`) | [code] |
| media-chrome | lazy chunk `1268` (audio/video controls) | [code] |
| View Transitions | 3 `startViewTransition` hits, all inside Sanity's visual-editing chunk `b7217679` (types `sanity-iframe-viewport`), **not** the public site | [code] |
| Three / OGL / WebGL / Barba / Swup / Swiper | absent | [code] |

Easing table defined once and reused everywhere [code, module `64149`]:
`inOutQuad [.45,0,.55,1]`, `inQuart [.5,0,.75,0]`, `outQuart [.25,1,.5,1]`, `inOutQuart [.76,0,.24,1]`,
`inExpo [.7,0,.84,0]`, `outExpo [.16,1,.3,1]`, `inOutExpo [.87,0,.13,1]`. The CSS mirrors them as utilities
`ease-in-out-quad`, `ease-in-out-quart`, `ease-out-expo` [code].

Curve profiles (computed from the beziers): **outExpo** 83 % of the distance at 25 % time, 97 % at 50 %, 99 % at 62 %;
peak velocity at t=0 (6.2x average). **inOutQuart** 5 % at 25 %, 50 % at 50 %, 99 % at 88 %; peak at mid (4.2x).
**inOutQuad** 12 % at 25 %, peak at mid (1.8x). **outQuart** 69 % at 25 %, 93 % at 50 %.

Runtime instrumentation [obs]: `Element.animate` 5 calls per page (framer-motion WAAPI for opacity/filter);
IntersectionObserver 2-4; scroll/wheel listeners 11; rAF 2,094 (about) to 1,118,380 (library 1440, see "do not copy");
timelines DocumentTimeline only (0 ScrollTimeline/ViewTimeline).

## 3. Motion table

### S1. First-visit splash ("screensaver"), and idle return after 60 s (signature)
| | |
|---|---|
| Trigger | shown when there is no `hasLoaded` cookie **or** after 60 s idle (`useIdle(6e4)`); on first visit it auto-dismisses after `setTimeout(3000)`; Lenis is `stop()`ped while it shows [code layout] |
| Layer | fixed full-screen `#fefdf7` at 92 % alpha (`#fefdf7eb`) over the page, serif label centred [code] |
| Enter (idle case) | layer opacity 0->1, **750 ms inOutQuad**; label `opacity 0, blur(8px) -> 1, blur(0)`, **650 ms outQuart, 150 ms delay** [code] |
| Enter (first visit) | none: `AnimatePresence initial={false}`, so the layer is simply there at first paint. Frames f20+ (0.80 s) show the label already sharp [obs `frames/sheet_newlit_enter_f14-43.png`] |
| Exit | label `opacity 1->0` and `filter blur(0) -> blur(8px)`, **600 ms inOutQuart**; layer `opacity 1->0`, **750 ms inOutQuad**, both start together [obs `animate` log at 3541.5 ms (home 1440), identical on all 12 captures, 3401-3834 ms] |
| Frames | label sharp to video f121 (4.84 s), blurred and fading f122-f127, layer gone by f130 (5.20 s) [obs `frames/sheet_newlit_exit_f112-141.png`; some frames flicker because the headless recorder duplicates frames] |
| Note | the exit is a blur-out, not a slide: the label "dissolves" into the page underneath |

### S2. Rolling text swap (supporter ticker, Menu/Close label, Copy link, add-to-bag price)
| | |
|---|---|
| Type | framer-motion `AnimatePresence`; incoming `y: 100% -> 0`, outgoing `y: 0 -> -100%`, in an `overflow:hidden` mask one line tall [code] |
| Duration / easing | ticker and Menu/Close **650 ms outExpo**; Copy link/Copied 500 ms outExpo; price/"Add to bag" 350 ms outExpo with opacity [code] |
| Ticker cadence | `setTimeout(3500)` per name [code]; observed runs start at 540, 4041, 7542, 11074, 14575 ... ms, i.e. **3500 ms +/- 32 ms** apart [obs 12 runs, home 1440 `div.will-change-transform`] |
| Measured curve | run at 4041 ms: incoming element translateY 90.7 % -> 65.7 -> 46.8 -> 30.8 -> 23.7 -> 16.6 -> 10.5 -> 8.6 -> 6.0 -> 4.0 -> 2.9 -> 1.9 -> 1.3 -> 0.8 % ... `none` at 4698 ms. Least-squares fit over 3 runs: **outExpo, D = 650 ms, RMS 0.0017-0.0029**; next best outQuart RMS 0.024-0.033 (10x worse) [obs + fit] |
| Frames to settle | 657 ms from first to last write = 21 frames at 32 fps; 90 % of travel within 33 % of D (~215 ms), 99 % within 62 % (~400 ms) [computed] |
| Layout guard | an invisible copy of the **longest** name reserves the width, so the line never jumps [code `Supporters`] |
| Both widths | yes (390 home: 279 writes) [obs] |

### S3. Cursor-following "read" label on story cards (desktop)
| | |
|---|---|
| Type | rAF loop writing inline `transform: translate(x px, y px)` on `div.hidden.md:block.absolute` (39 x 20 px label) inside each card [obs styleWrites, 6150 on home 1440] |
| Law | per frame `x += (target - x) * 0.125` (`lerp(.., .., .125)`), target = pointer minus card origin minus half label size; on pointer enter it **snaps** to the pointer (no fly-in), then follows [code `3432`, `9591`, product page] |
| Measured | while settling on a hovered card the remaining distance shrank by **0.875 per write** at ~31 ms per frame (e.g. y = -30.2, -13.2, -0.2, 9.7, 17.3, 23.1, 27.6, 31.0 ... successive differences 17.0, 13.0, 9.9, 7.6, 5.8, 4.5, 3.4 px = ratio 0.765 per two frames) [obs]. The lerp is **per frame, not per ms**: at 60 fps the time constant is ~125 ms (90 % in ~290 ms); at the 32 fps seen here it was ~235 ms [inf] |
| Visibility | label `opacity-0` class toggled on enter/leave, opacity transition **300 ms inOutQuart** [obs CSSTransition opacity 300 ms cubic-bezier(0.76,0,0.24,1)] |
| Hidden | `hidden md:block`: no follower below 900 px [code] |

### S4. Line-by-line underline on titles (SplitText + CSS)
| | |
|---|---|
| Split | GSAP SplitText splits each title into lines; every line gets a 1 px royal-blue `::after` bar, `transform-origin: 0 0`, `scaleX 0 -> 1` [code] |
| Desktop trigger | hover. Line 2 follows line 1 by **250 ms** (`.group:hover .underline-hover--group:nth-child(2):after {transition-delay:.25s}`); on hover-out the order reverses (line 1 waits for line 2) [code] |
| Mobile trigger | scroll: IntersectionObserver `threshold 0.1, rootMargin 0 0 -20% 0` adds `underline-hover--active` when the title is in the upper 80 % of the viewport [code + obs `ioOpts`] |
| Duration / easing | **750 ms outExpo** cubic-bezier(.16,1,.3,1) [obs CSSTransition `scale` 750 ms, first at 8205 ms (home 390), 10055 ms (article 390), 8552 ms (shop 390)] |
| Plain links | single-line `.underline-hover:after` 750 ms cubic-bezier(.26,1,.3,1) [code]; nav links 550 ms outExpo [obs about 1440, CSSTransition `scale` 550 ms] |

### S5. Page transition (client-side navigation)
| | |
|---|---|
| Component | `LayoutTransition`: freezes the old route's context, `AnimatePresence mode="wait"`, defaults `{opacity:0} -> {opacity:1} -> {opacity:0}`, transition **450 ms inOutQuart**; scroll reset by `lenis.scrollTo(0, {immediate:true})` [code layout] |
| Measured | click at t=0: exit `opacity 1->0` WAAPI call at +45 ms, 450 ms inOutQuart; opacity 0.995 (+75), 0.958 (+139), 0.847 (+200), **0.473 (+263)**, 0.138 (+325), 0.015 (+419), ~0 (+481); scrollY 600 -> 0 at +514 ms (after the page is invisible); blank (off-white) hold until +756 ms; enter `opacity 0->1` WAAPI call at +757 ms, 450 ms inOutQuart: 0.090 (+887), 0.302 (+951), **0.557 (+980)**, 0.871 (+1043), 0.986 (+1137); settled by ~+1200 ms [obs `navprobe_home_to_article.json`] |
| Curve check | at 48 % of the exit duration the opacity was 0.473; inOutQuart predicts 0.47 [computed] |
| Total | ~1.2 s click to settled; ~290 ms fully blank between the two fades (data fetch / render of the new route) |

### S6. Reading progress bar (article)
| | |
|---|---|
| Type | inline `transform: scaleX(p)` on a fixed bottom bar, p = scroll progress through the article [obs 41 writes (1440), 141 (390)] |
| Values | scaleX 0.0157 at 5412 ms -> 0.618 at 6067 -> 1.000 at 6630 ms during the slow scroll; box width tracks 23 px -> 1440 px exactly [obs] |
| Size | 6 px tall desktop, grows to 12 px (`height` transition 400 ms cubic-bezier(.4,0,.2,1)) when the reading tools open; 3 px -> 6 px on mobile [obs CSSTransition height] |
| Smoothness | it follows Lenis' interpolated scroll, so it inherits the lerp-0.125 glide [inf] |

### S7. Panels: reading tools bar, bag drawer, filters, search
| Element | Motion | Source |
|---|---|---|
| Reading tools bar (article bottom) | `y: 100% -> 1px` + box-shadow `0 0 10px 1px rgba(100,100,100,0 -> .1)`, **550 ms outExpo**; content opacity 550 ms outExpo | [code] |
| Bag drawer | backdrop `off-white/90` opacity 650 ms inOutQuart (exit +100 ms delay); panel `opacity 0, scale .975 -> 1, scale 1`, **750 ms outExpo, 250 ms delay**; exit 650 ms inOutQuart, no delay | [code] |
| Filter panel | `height 0 -> auto` + opacity, 600 ms outExpo | [code] |
| Search field | input `opacity 0 -> 1` 500 ms outExpo (exit 500 ms inOutQuart); its underline `scaleX 0 -> 1` (desktop from 0.3), 500 ms outExpo; trigger label fades 300 ms inOutQuad with 200 ms delay; clear "x" fades in 500 ms inOutQuad, 150 ms delay | [code] |
| Result grids (library/shop filters) | crossfade opacity, 350 ms inOutQuad, `mode="wait"` | [code] |
| Header menu (desktop "Table of contents") | header translates from `-translate-y-[calc(100%-80px)]` to 0; utility `duration-700 ease-in-out-quart`, and `.site-header {transition: transform .65s outExpo}` also declared | [code; not opened, effective value **[unk]**] |
| Newsletter "Thank You." | opacity 450 ms inOutQuad; error text `y 100% -> 0` 550 ms outExpo | [code] |

### S8. Image load fade
`img.object-cover` opacity 0 -> 1, **500 ms** cubic-bezier(.4,0,.2,1) when loaded [obs CSSTransition, home/shop at both widths].

## 4. Smooth scroll (Lenis, measured)

Config: `lerp 0.125`, `smoothWheel true`, `wheelMultiplier 1`, `syncTouch false` (touch scroll stays native) [code].
Lenis 1.3 damps frame-rate independently: `value = lerp(value, target, 1 - exp(-lerp*60*dt))`.

Probe on `/library/in-august` at 1440 [obs `wheelprobe_in-august_1440.json`]:

| Input | First movement after wheel | 50 % | 90 % | 99 % | settled < 0.5 px |
|---|---|---|---|---|---|
| one 500 px wheel | 68 ms (105 px) | 130 ms | 348 ms | 662 ms | 973 ms |
| one 120 px wheel | 60 ms (25 px) | 121 ms | 340 ms | 622 ms | 778 ms |
| ten 120 px wheels, ~125 ms apart | | | | | 782 ms after the last wheel; scroll was at 1046 of 1200 px when the last wheel landed |

- Remaining distance per frame: 0.790, 0.792, 0.789, 0.795, 0.787 ... at 31.3 ms frames. Prediction
  `exp(-0.125*60*0.0313) = 0.791`. **Match to 3 decimals**, so the lerp is confirmed at runtime.
- At 60 fps this is 0.8825 retained per frame, **time constant 133 ms**: 50 % at 92 ms, 90 % at 307 ms, 99 % at 614 ms
  after input (plus ~40-60 ms input latency seen above).
- Feel: a pure exponential glide, fastest at the first frame, no overshoot, no bounce.
- Lenis CSS: `html.lenis{height:auto}`, `.lenis-stopped{overflow:clip}`, iframes `pointer-events:none` while smoothing [code].

## 5. Page transitions

See S5: opacity-only crossfade through the background colour, 450 ms inOutQuart out, ~290 ms hold, 450 ms inOutQuart in,
scroll reset hidden inside the blank. No shared-element morph, no View Transitions API on the public site [code + obs].

## 6. Hover states (1440, `@media (hover:hover)`)

| Target | Change | Duration / easing | Source |
|---|---|---|---|
| Nav and text links | colour `#272727 -> #0036d5` (royal blue) | 400 ms cubic-bezier(.4,0,.2,1) | [obs CSSTransition color 400 ms, all pages] |
| Small buttons / "x" | colour to royal blue | 300 ms | [obs + code] |
| Story card | cursor label appears and follows (S3); title lines underline in sequence (S4) | 300 ms fade; 750 ms outExpo, +250 ms per line | [obs + code] |
| Checkbox (submissions) | border and label colour `#979797 -> #0036d5` | 400 ms | [obs] |
| Images | no zoom, no scale on hover | | [obs 0 scale/transform writes on images] |

## 7. Spacing, grid, type, colour

**Base: a 20 px gutter unit (x2 = 40, x3 = 60) with small-step px utilities (2/4/8/10/16/18/32).**
CSS px histogram over padding/margin/gap/inset [code]: 20 px x16, 8 x11, 10 x11, 40 x10, 2 x10, 32 x10, 18 x8, 16 x8, 50 x7, 60 x5.

| Token | 1440 (>= 900 px) | 390 (< 900 px) | Source |
|---|---|---|---|
| `--site-x` (side margin) | **60 px** | **20 px** | [code `:root`; obs paddingLeft 60 / 20] |
| `--site-y` | 30 px | 20 px | [code] |
| Header height | 80 px | 50 px | [code] |
| `--padding-top` | 160 px | 80 px | [code] |
| Grid | **12 columns x 73.33 px, gap 40 px** (1320 px content); `--large` grid 24 x 16.66 px | **8 columns x 26.25 px, gap 20 px** (350 px content) | [obs grid; code] |
| Card grids | home 4 x 300 px gap 40; article cards 2 x 652 gap 16; library row gap 68 px, column gap 40 | 2 x 165 px gap 40 / 20; row gap 32 | [obs] |
| Breakpoints | 900, 1280, 1536 (96rem) | | [code] |

Type [obs `facts.type`; code utilities]: two families, `MDGrotesk` (sans, 400) and `TimesNewLiterature` (serif, 500).

| Role | 1440 | 390 |
|---|---|---|
| Body / UI (`text-sans-small`) | 14 px / 19.6 px (140 %), 400 | same |
| Serif display (`text-serif-large`) | 49 px / 44.1 px (90 %), 500 | 32 px / 28.8 px |
| Sans medium | 26 px / 32.5 px (125 %) | 20 px / 24 px (120 %) |
| Serif medium | 26 px / 31.2 px (120 %), 500 | 20 px / 24 px |
| Article body | 16 px / 24 px | 16 px / 24 px |
| Labels | 14 px uppercase, grey `#979797` | same |

Letter-spacing: normal everywhere [obs]. Colours [code + obs]: background off-white `#fcfcfa`, text `#272727`,
grey `#979797`, grey-dark `#7f7f7f`, grey-light `#f6f6f2`, accent **royal blue `#0036d5`** (links, underlines, bag panel),
splash layer `#fefdf7` at 92 %. Radii: **0** (`rounded-none`; 3 `border-radius:0` declarations, nothing else) [code].
Shadows: one, on the reading tools bar (`0 0 10px 1px rgba(100,100,100,.1)`) [code].

## 8. What to learn for calm, premium motion (dermatologist explainers and reels)

Worth taking as technique:
1. **A named easing table, used everywhere.** Seven beziers, defined once, referenced by name. For the brand bible:
   `outExpo (.16,1,.3,1)` for anything arriving, `inOutQuart (.76,0,.24,1)` for anything leaving or a scene change,
   `inOutQuad (.45,0,.55,1)` for quiet crossfades. Exits use a different curve from entrances.
2. **The rolling text swap** (S2) is the single most transferable move: a one-line mask, new text rises from 100 %
   while the old leaves to -100 %, 650 ms outExpo, with the box sized to the longest string so nothing reflows.
   Use it for changing on-screen labels ("Day 1 -> Week 4 -> Week 12", ingredient names, step numbers) in reels.
3. **Blur dissolve for titles** (S1): opacity plus `blur(0 -> 8px)` on exit, 600 ms inOutQuart; enter with blur 8 -> 0,
   650 ms outQuart after a 150 ms delay. A gentle way to clear a title card off a clinical image.
4. **Line-by-line underline** (S4): each line of a two-line title underlines separately, 750 ms outExpo, the second
   line 250 ms after the first. Good for emphasising a key phrase in a caption.
5. **Crossfade through the background, hide the cut inside the blank** (S5): 450 ms out, a short hold, 450 ms in;
   all repositioning happens while nothing is visible. Matches the "gentle cuts" direction.
6. **Exponential follow** (Lenis lerp 0.125 = 133 ms time constant; the card label lerp): when a callout, pointer or
   magnifier follows a moving point on a skin close-up, use an exponential chase with ~125-135 ms time constant
   instead of a fixed-duration tween; it never overshoots.
7. **Durations cluster at 350-750 ms** (350, 450, 500, 550, 600, 650, 750). Nothing quick and twitchy, nothing over 0.75 s
   except the 3.5 s dwell between ticker changes, which is a good reading-time unit for one short label.

Do not copy:
- **Per-frame work for invisible things.** Every card's cursor label runs its lerp every frame even when not hovered:
  the library page made 1.1 million rAF calls and filled the 60,000 style-write cap in 11.8 s (1440) / 5.9 s (390); its scroll pass took
  123 s versus 7-12 s on other pages [obs]. In video terms: do not animate what is off screen.
- A frame-count lerp (the card label) changes speed with frame rate (32 fps here felt ~1.9x slower than 60 fps).
  In video, keep timing in seconds, not frames.
- The splash that blocks the page for 3 s on every first visit, and returns after 60 s idle, is fine for a magazine
  brand, too long for a reel (no 3-second holds on a non-content card).
- The 6.2x start velocity of outExpo can feel like a "snap" on large moves; keep it for short travel
  (one line of text, a 1 px underline, a 2.5 % scale) as this site does.
