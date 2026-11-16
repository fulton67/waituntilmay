# mirapest.com: motion and spacing study

Study notes only. No code, CSS, font, image or copy from this site goes into our build.
Measured 2026-11-16. The site is linked from newapology.com's project pages. It is a WordPress theme
(`wp-content/themes/mira-git`) for "Mira Home", a residential pest-control company.

Tags: **[O]** observed (runtime capture, probe or frame), **[S]** read from the shipped source
(JS/CSS text), **[I]** inferred, **[U]** unknown.

## 1. Pages captured

`capture.mjs` ran on each page at 1440 and at 390. The JSON files are in `../sites/runtime/`, and the session
videos are in `mirapest.com/video/<tag>.webm`.

| Page type | URL | 1440 JSON | 390 JSON | docH 1440 / 390 |
|---|---|---|---|---|
| Home | `/` | `mirapest.com_1440.json` | `mirapest.com_390.json` | 9136 / 10133 |
| Process / explainer | `/how-it-works/` | `mirapest.com__how-it-works_1440.json` | `..._390.json` | 4566 / 3828 |
| About | `/about-us/` | `mirapest.com__about-us_1440.json` | `..._390.json` | 7448 / 6561 |
| Service (case) page | `/pest-control/ants/` | `mirapest.com__pest-control__ants_1440.json` | `..._390.json` | 5395 / 6357 |
| Index / list | `/pest-library/` | `mirapest.com__pest-library_1440.json` | `..._390.json` | 2693 / 4662 |
| Blog list | `/blog/` | `mirapest.com__blog_1440.json` | `..._390.json` | 3800 / 4693 |

I also wrote a per-frame interaction probe. It sampled computed styles on every requestAnimationFrame
(about 31 ms per sample in headless Chromium) for wheel, hotspot, card hover, button hover, image-corner
hover and the mobile burger. Output: `mirapest.com/probe.json`. Script (not shipped): scratchpad `probe.mjs`.

**Caveat [O]:** every session starts behind a bot-check interstitial ("Checking your browser before
accessing mirapest.com"). It lasts about 10 s of video (`frames/home1440_sheet_0-8s.png`, and
`home1440_sheet_8-14s.png` frame 9 at about 10.0 s). The capture timestamps (`marks.loaded`) count from the real
document, after the interstitial.

## 2. Stack (REA plus bundle text)

- **REA, full tree:** `rea analyze-javascript-application <extracted> --detail summary` hit the
  300 s per-source deadline on the 149 KB Swiper bundle (`provider_timeout`). The partial-observation Evidence is
  `ev_d308d40c01f692f2…` and is saved as `mirapest.com/rea-full-timeout.json`.
- **REA, app-owned sources** (`mirapest.com/rea-sources.json`, 5 theme JS files plus `page_home.html`):
  completed. Evidence **`ev_677790ae446ea6b8c336d984b63df727884099fb53de4fa8100b32adb0b5d000`**, graph
  **`jag_a49e91e0a501…`**, 44 nodes and 44 edges, 5 JS files parsed, 0 parse failures, 5,155 AST nodes, 40 findings,
  coverage `partial` (15 files outside the selection). Output: `mirapest.com/rea.json`.
- **Libraries** (fingerprint counts over `extracted/`, plus `<script>` URLs in every page):

| Library | Evidence | Status |
|---|---|---|
| jQuery 3.2.1 | `ajax.googleapis.com/.../jquery/3.2.1` in `assets.txt` | present [S] |
| GSAP 3.12.5 plus ScrollTrigger | `cdn.jsdelivr.net/npm/gsap@3.12.5/dist/{gsap,ScrollTrigger}.min.js` | present, used **once** [S] |
| Swiper (bundle) | `litespeed/js/9498df80….js` (149 KB, starts `var Swiper=function(){`) | present [S] |
| Mapbox GL 2.15 | `api.mapbox.com/mapbox-gl-js/v2.15.0` (map canvas on about / how-it-works) | present [S][O] |
| Lucide icons | `lucide.createIcons()` inline | present [S] |
| Lenis, Locomotive, framer-motion, Barba, Swup, Three/OGL, Lottie, AOS, SplitText | 0 hits | absent [S] |

- **Runtime [O]:** `Element.animate` was called 0 times on all 12 captures. There is 1 IntersectionObserver with
  options `{}` (Swiper or recaptcha). rAF calls run 338 to 5,957 per session, driven by Swiper, GSAP and Mapbox. There
  is no `<canvas>` except Mapbox.

GSAP is used for exactly one thing: `b31c9ff1….js`, line 238 (split on `;`). [S]
```
gsap.to(container,{x:()=>-containerWidth,scrollTrigger:{trigger:'.horizontal-scroll-block .horizontal-wrapper',
  start:'center center',scrub:0.5,pin:'.horizontal-scroll-block .horizontal-container',end:()=>"+="+containerWidth,invalidateOnRefresh:!0}})
```
All other motion comes from CSS transitions (default `transition: all .5s ease`, 105 declarations in
`extracted/css/main.css`), jQuery `.animate / slideUp / fadeIn` (default `swing`), and Swiper `speed`.

Swiper configs, from `d9e67f22….js` [S]:

| Instance | Config |
|---|---|
| `.swiper-with-big-images` | `direction:"vertical", effect:"fade", speed:1400, autoplay:{delay:2500}` |
| `.swiper-scroll-cards` | `speed:800`, slidesPerView 1.06 / 2 / 3, spaceBetween 15 / 20 / 20 |
| `.swiper-cards-plan` (<=992 px) | `speed:800, spaceBetween:20, centeredSlides` |
| `.swiper-reviews` | `speed:5000, loop, autoplay, slidesPerView:3, centeredSlides`; thumbs `.swiper-reviews-bottom` `speed:5000` |
| `.horizontalSwiperHome` | slidesPerView 1.7 (1.144 below 576), spaceBetween 20 |

## 3. Motion table (signature effects)

Each fitted curve was solved by least squares over the probe samples against CSS `ease`, `ease-in-out`,
`ease-out`, linear and GSAP `power3.out`. "rms" is the residual as a percentage of the travel.

| # | Effect | Type | Target | Trigger | Duration | Delay | Easing (fitted) | Keyframes / values | Stagger | Measured curve |
|---|---|---|---|---|---|---|---|---|---|---|
| M1 | **Hotspot glide** over the house photo | CSS transition `all 1.8s ease` | `.exterior-overview-house .absolute-wrap` (a dot plus a 179 px label card) | click on a tab / point (`b31c…` l.186). Also runs on `window.onload` and resize | **1800 ms** [O: anims `left/top/transform@div.absolute-wrap` = 1800, ease] | 0 | `ease` cubic-bezier(.25,.1,.25,1). Peak speed at 377 ms (21 %), 90 % at 1121 ms, 99 % at 1564 ms [I, computed] | `left 47%→84%`, `top 55%→60%`, `transform translate(-50%,-50%)→translate(-106%,-50%)` (label flips to the other side of the dot) [O] | the label card fades in with jQuery `animate({opacity:1},300)` (swing) after the move starts [S] | probe `hotspot`: x 845→713 px over the first 250 ms, with per-frame Δ falling 21.6→16.3 px. The element was re-rendered after that, so the curve is partial [O] |
| M2 | **Tab title indent** | CSS `0.5s all ease` | `.tabs .item .item-title` (Tango 60 px, `#f1f1f1` on photo) | same click | 500 ms | 0 | ease | `padding-left 0↔30px` [O: anims `padding-left@div.item-title` 0→30px, 500, ease] | outgoing and incoming run simultaneously | probe `hotspot_title`: incoming 0→28 px over 266→673 ms, outgoing 30→0.27 px [O] |
| M3 | **Card reveal on hover** | three CSS transitions with different durations | `.cards-scroll-block .card-item`: `.bg-image`, `h3`, `.description` | hover | **400 / 500 / 600 ms** | 0 (all start on the same frame) | `ease` for all three. Fits: h3 400 ms rms 0.32 %, bg 500 ms rms 0.31 %, description 600 ms rms 0.30 % [O] | bg photo `opacity 1→0`; h3 `translateY(63%)` (50.4 px) `→0` and colour `#fff→#171717`; description `opacity 0→1` [O] | **duration stagger of 100 ms**: the elements finish at +400 / +500 / +600 ms. There is no delay stagger [O] | `probe.json card_hover`, 30 samples. h3 is at 0 px by 507 ms, bg at 0 by 601 ms, description at 1.0 by 728 ms [O] |
| M4 | **Image corner morph** | CSS `border-radius .5s ease` | `.img-wrap` / `.media-block` (one rounded corner only: `0 70px 0 0`, `0 90px 0 0`, `0 117px 0 0`) | hover | 500 ms | about 50 ms input latency | ease, rms 0.18 % [O] | `border-top-right-radius 70px→0` [O] | n/a | probe `radius_hover`: 70→66.8→60.4→51.4→41.4→32.4… reaches 0 at 550 ms [O] |
| M5 | **Pill-to-square button** | CSS `0.5s` | `a.btn-global` (`border-radius:40px`), `.btn-global.big::before` | hover | 500 ms | 0 | ease, scale fit rms 0.36 % [O] | `border-radius 40px→3px`; `.big::before` `scale(1)→scale(1.2)`; `.btn-num` `min-width 176→200px` plus number fade [O] | n/a | probe `btn_hover`: radius 0→3 px, ::before scale 1→1.2, settling at 557 ms [O] |
| M6 | **Vertical fade slider** ("About Us" glass card on photo) | Swiper fade plus CSS | `.swiper-with-big-images .swiper-slide`, inner `.img-wrap` (`transition: 3s all ease`), copy `p.slide-description` | autoplay | slide **1400 ms**, inner image **3000 ms**, copy fade **300 ms** | autoplay `delay:2500` [S] | slide and image `ease` [O]; copy jQuery `swing` [S] (opacity 0.54 at 157 ms, matching swing 0.5 at 150 ms) [O] | slide `opacity 0↔1`; image `opacity 0→1`; wrapper `height` animate 100 ms, then copy `fadeIn(300)` [S][O] | measured cycle **3.93 s** (bursts at 7333, 11272 ms → 3939 ms) ≈ 2500 + 1400 [O] | capture styleWrites: `p.slide-description.tab-content` opacity 0→0.026→0.10→0.24→0.38→0.54→0.69→0.83→0.93→0.99 at 30 ms steps from 7452 ms [O] |
| M7 | **Pinned horizontal scroller** | GSAP ScrollTrigger, `scrub:0.5`, pin | `.horizontal-scroller` inside `.horizontal-scroll-block` | scroll position (`start:'center center'`, `end:+=containerWidth`) | catch-up **≈ 450 to 500 ms** after the scroll stops | n/a | **power3.out** (quart-out) best fit: 450 ms, rms 6.2 px over 811 px travel [O]. Peak velocity on frame 1 | `x: 0 → -811.5px` at 1440 (container 2133 px wide in a 1283 px row) [O] | n/a | capture `mirapest.com_1440.json` writes at 25576 to 26106 ms. Per-frame Δx: 171, 161, 116, 89, 58, 42, 26, 18, 12, 7, 5, 3, 2, 1.4, 0.8 px [O] |
| M8 | **Mobile menu drop** | CSS `.mobile_menu_container {transition:.5s ease-in-out}` | `#mobile-menu` (390) | burger tap | 500 ms | about 360 ms tap latency in the probe | **ease-in-out**, rms 0.46 % [O] | `translateY(-928px)→0`, full-height sheet (844 px) [O] | n/a | probe `burger`: -921, -900, -862, -808, -739, -657, -564, -464, -366, -272, -188, -120, -66, -29, -7 px [O] |
| M9 | Nav dropdown | CSS 200 ms | `ul.sub-menu`, caret `a` | hover | 200 ms | 0 | ease | `opacity 0→1`, `translateY(8px)→0`, `visibility`; caret `rotate(0→180deg)`; link colour `#171717→#2d96f0` [O] | n/a | anims `transform@ul.sub-menu` 200 ms [O] |

Not observed, declared only [S]:
- reviews Swiper `speed:5000` loop. Its section did not appear on the 6 captured pages.
- `#zip-result.show {animation: fadeInUp .3s ease-out}`
- WordPress lightbox keyframes `lightbox-zoom-in .4s`
- `.s-link a {transition:.5s cubic-bezier(.165,.84,.44,1)}`, an easeOutQuart: 90 % done at 236 ms out of 500

There are **no load or entrance animations [O].** After the interstitial, the hero (a looping `<video>`, `media.video:1`)
and all of its text are fully present on the first frame, and frames 10.0 to 11.25 s are identical
(`frames/home1440_sheet_8-14s.png`). Sections do not reveal on scroll: 0 IntersectionObserver-driven class
changes, and no opacity/transform writes on section elements during the scroll pass.

## 4. Smooth scroll

There is **no smooth-scroll library [S][O].** `scrollBehavior: auto`, and there is no Lenis or Locomotive. Probe `wheel`: one 120 px
wheel tick lands as `scrollY 0→120` in a single frame, 63 ms after input, with no interpolation. The only
"smoothed" scroll response is M7's scrub tween (about 500 ms power3.out). The `.btn-arrow` anchor links use
`$('html,body').animate({scrollTop},800)` with jQuery swing (peak speed at 400 ms, 90 % at 636 ms) [S].

## 5. Page transitions

None [S][O]. These are full document loads: no Barba or Swup, no View Transitions, no `startViewTransition` in the
bundle text.

## 6. Hover states (summary)

| Element | Change | Timing |
|---|---|---|
| Image tiles | one-corner radius (70 / 90 / 117 px) → 0 | 500 ms ease [O] |
| Pill buttons | radius 40 → 3 px, opacity 1 → 0.8 (cookie button) | 500 ms ease [O] |
| Big buttons | `::before` scale 1 → 1.2 (fill grows outward) | 500 ms ease [O] |
| Number button `.btn-num` | min-width 176 → 200 px, number fades. Also auto-toggles every **10 000 ms** (`setInterval`, paused on hover) | 500 ms [S][O] |
| Step / process cards | photo fades out, title rises 63 %, body fades in | 400 / 500 / 600 ms ease [O] |
| Nav links | colour → `#2d96f0`; dropdown rises 8 px | 200 ms [O] |
| `.hover-underline-animation::after` | `transform .25s ease-out` | declared [S] |

## 7. Spacing, grid, type, colour tokens

**Containers [S]:** `.row1674`, `.row1548`, `.row1283` and `.row1156` are fixed widths 1674, 1548, 1283 and 1156 px, each
with `max-width:96%; margin:0 auto`. At 1440 the 1283 row is 1283 px with gutters of 79 px each side (`box` [79,…] in the capture).
At 390 the 96 % rule gives 374 px, with 8 px sides. Breakpoints by frequency: 576 (187), 768 (162), 1140 (71), 960, 1024, 620, 992, 1728/1729 [S].

**Spacing scale.** Capture histograms, home 1440 / 390 [O]:
- padding: **10 / 20 / 32 px** dominate, plus 4, 8, 9 and 22
- gap: **16 px** (10 elements), 10, 24, 32 and 64 px (zip picker), 28 px (cards)
- margin-bottom: **10 / 20 / 100 px**. 100 px is the section rhythm at 1440 (8 elements) and 60 to 100 px at 390.
- CSS text [S]: padding `20px` (27), `40px` (9); gap `20px` (17), `16px` (9).

The base unit reads as **10 px, with a 20 / 40 / 100 ladder** [I]. 16 / 32 px come from the WordPress block layer.

**Grids [O]:**
- zip picker: `627px 465px`, gap 64 at 1440 → 1 column, gap 24 at 390
- four-card grid: `4 × 260px`, gap 32 → 1 × 260 at 390
- scroll cards (Swiper): slidesPerView 3, spaceBetween 20 at ≥992 (card 415 × 364); 1.06 / 15 on phone.

**Type [O]:** two families from one foundry, "Store Norske **Tango**" (display) and "Store Norske **Skandia**" (text). Inter 10 px is
used only by the cookie plugin.

| Role | 1440 | 390 |
|---|---|---|
| Display H1/H2 | Tango 60/60 (lh 100 %), sometimes 60/59.4 with ls -1.2 px (-0.02em) | Tango 36/35.6 ls -0.72, 30/30, 26/26 |
| Section H3 | Tango 40/39.6 ls -0.4; 28; 22; 20/20 | Tango 24, 18, 16 |
| Body | Skandia 16/24 (700 for lead-ins), 15 / 500 (nav), 14/17.5 and 14/14 | same, 14/17.5 |
| Micro | Skandia 11/11 700 | same |

CSS frequency [S]: font-size 14 (86), 16 (53), 20 (38), 40 (25), 30 (17), 18, 60 (13); line-height **100 %** (50)
and `1` (20), i.e. display type is set solid. Letter-spacing `-0.01em` (16).

**Radii [S][O]:**
- pills `40px` (19 elements), `999px`
- **single top-right corner** `0 10px 0 0` (13), `0 60/70/90/117/130/160/200px 0 0`
- small `3px` (the hover target), `6px` / `8px`.

The asymmetric one-corner radius is the brand's shape signature [I].

**Colour [S]:** ink `#171717` (97 uses), white, bright blue `#35a8f3` (32) / hover `#2d96f0`, greys `#a9a9a9` `#b5b5b5`,
off-white `#f1f1f1`, mint `#c8f1da` / `#def6e9` (cookie bar and accents), deep green `#0b3b2e`, alert red `#f33535`,
green `#02ca82`. Glass: `backdrop-filter: blur(20px)` (12 uses) and `blur(15px)` (2) on the "About Us" card over the photo (frames
`home1440_sheet_scroll.png` at 22.7 to 25.3 s) [S][O].

## 8. What to learn for a dermatologist's explainers and reels

Worth taking as technique (numbers are directly usable as edit rules):
1. **Hotspot glide, M1.** A dot plus a label card that *travels* across a still photo from region to region over **1.8 s
   `ease`** (peak speed at 21 %, 90 % at 62 %). The label flips sides with a transform when it would leave the frame,
   and the copy fades in over 300 ms after the move starts. This maps 1:1 onto a skin close-up: glide a marker
   from "forehead" to "jawline" instead of cutting. 1.8 s fits roughly one spoken clause, and the 300 ms text fade
   lands while the dot is still decelerating.
2. **Duration stagger instead of delay stagger, M3.** Three layers start on the same frame and finish 100 ms apart
   (400 / 500 / 600 ms, all `ease`): the headline settles first, the background clears, the body arrives last. The result
   reads as one gesture with depth and no visible queue. This is good for before/after card swaps.
3. **Crossfade layering, M6.** The slide fades over 1.4 s while the photo inside it fades over 3 s, so the image is still
   resolving after the frame has changed. That is a calm, long dissolve. The hold is 2.5 s, giving a cycle of 3.9 s.
   This is close to our "visual every ~5 s" pacing, and a 2.5 s hold plus 1.4 s dissolve is a usable B-roll rhythm.
4. **Scrubbed catch-up, M7.** Motion follows input and settles over 0.5 s on a quart-out curve. Its peak velocity is on frame 1, and it is 90 % done
   at 219 ms. For pans across a long horizontal strip (e.g., a treatment timeline), use the same out-curve.
5. **Shape morph as feedback, M4/M5.** A single 70 to 117 px corner relaxing to 0, or a pill tightening to 3 px, over
   500 ms. This is a quiet "selected" state for on-screen cards without scale or bounce.
6. Display type set solid (line-height 100 %, -0.01 to -0.02 em), with 10 / 20 / 100 px spacing.

Not to copy:
- The bot-check interstitial and the 10 s blank start.
- Swiper reviews at `speed:5000` (a 5 s linear-feeling crawl is sluggish).
- jQuery `swing` (a symmetric ease-in-out that feels mechanical next to the `ease` family).
- The 10 s auto-toggling CTA (attention-seeking).
- Mixing three easing families on one page (ease, swing, power3).
- Abrupt `display:none→flex` swaps in the hotspot label. The re-render broke our sampler at 275 ms, which suggests a visible pop.
- The brand fonts and the one-corner radius as a literal look: it is Mira's identity, not ours.
