# kirillkozyrev.com — motion and spacing study

Study notes only. No code, CSS, font, image or copy from this site goes into any build.
Measured 2026-11-16, headless Chromium (Playwright, chromium-1243). Linked from newapology.com.

Legend: **[O]** observed in a capture, **[C]** read from the shipped bundle (code), **[I]** inferred, **[U]** unknown.
Headless rAF ran at ~32 Hz (frame interval ~31 ms), so per-frame curves are sampled every ~31 ms.

## 1. Pages captured

Framer site with exactly two pages: `./` and `./about` (the only same-origin hrefs in either page's HTML, `extracted/index.html`, `extracted/about.html`) [O]. Projects are not pages; each opens as an in-page overlay (a Framer "Overlay" with `dismissWithEsc`) [C].

| Page type | URL | 1440 | 390 |
|---|---|---|---|
| Home / project list (cards + overlays) | `/` | `runtime/kirillkozyrev.com_1440.json` | `runtime/kirillkozyrev.com_390.json` |
| About / information | `/about` | `runtime/kirillkozyrev.com__about_1440.json` | `runtime/kirillkozyrev.com__about_390.json` |
| Project case (overlay, opened by click) | `/` + tap | `kirillkozyrev.com/probe/home_1440.json` | — |

Probe (`scratchpad/probe/probe.mjs`): per-frame `scrollY`, wheel log, every `Element.animate` call, inline-style writes; one wheel tick, five fast ticks, then a click on the first "Read More" pill (`[data-framer-name="Frame 2087329038"]`), then Escape. Video: `probe/video/dc2b840e6e4010bf0f2d824fab1cd80b.webm`.
Frames: `kirillkozyrev.com/frames/home_session_0-24s_1fps_tile.png`, `frames/home_overlay_open_25.4-26.6s_20fps_tile.png` (that window caught the page before the click: the video clock runs ahead of page time by an unknown offset, so the overlay is measured from the numbers, not frames) [U for the visual].

## 2. Stack

Bundle (site-scoped Framer modules from `framerusercontent.com/sites/3vpQ0xbCK4hVyZcpNRYGN0/`, saved in `kirillkozyrev.com/extracted/mjs/`; Framer serves a site's own build from that CDN, so these count as its bundle):
`a6jhu…Cu_yqYC2.mjs` (home page, 957,293 B), `neRJ…BRdgBT_4.mjs` (about, 22,763 B), `framer.-UkVkuKK.mjs` (runtime, 482,013 B), `motion.Dl6wqeo_.mjs` (150,901 B), `react.BpKPsBQp.mjs`, `script_main`, `shared-lib`, `sS341XTtJ`, 2 small route stubs.

**REA**: `rea analyze-javascript-application <extracted> --detail summary --source-paths-json rea-sources.json` over the 7 site-owned modules (runtime, react and motion left out on purpose) → `kirillkozyrev.com/js-analysis.json`, Evidence **`ev_9520817d8b27972407de1e73298b79dc49306cab2a0ee8a5ebc049d7351b10f6`** (summary view `ev_a6bdfbd1…`), bundle `kirillkozyrev.com/rea-evidence`. 7 files parsed, **0 parse failures**, 119,713 AST nodes, 335 findings, coverage `partial` (6 framework files out of scope by selection). REA identifies no endpoints of interest; it is a static-site bundle. The motion parameters below come from string search of the same files.

| Library | Evidence | Role |
|---|---|---|
| Framer runtime (React) + **Framer Motion** (`motion.mjs`) | module names; `whileHover`, `initial/animate/exit` variants in page module [C] | all motion |
| Framer **View Transitions** for page change | `::view-transition-group(framer-Aen3X-…-exclude)` rules [O facts.animations] | `/` ↔ `/about` |
| "Better Carousel" code component on **Splide** | `splide__track` / `splide__list` writes at 390 [O]; props `dragMode:"snap", gap:8, motion:{speed:3, momentum:600}` [C] | mobile image rows |
| Absent | GSAP, Lenis/Locomotive, three/WebGL, Barba/Swup: 0 refs [C]; no smooth scroll [O] | |

## 3. Motion table

| # | Effect | Target | Trigger | Duration | Delay | Easing | Values | Stagger | Measured |
|---|---|---|---|---|---|---|---|---|---|
| K1 | **Case overlay: backdrop** | full-screen layer `div.framer-1oi1k4t` (1440×900) | tap "Read More" | **500 ms** [C+O] | 0 | **cubic-bezier(0.5, 0, 0.88, 0.77)** (an ease-in) [C+O] | opacity 0 → 1; close 1 → 0 same curve [O] | — | `Element.animate` at 25633.2 ms; close at 29038.4 ms (probe) |
| K2 | **Case overlay: sheet slides up** | white sheet `div.framer-pmjfak-container` 922 px wide, radius 24, layered soft shadow; plus close pill `framer-49tbcl` | same tap | **350 ms** [C+O] | 0 | **cubic-bezier(0.44, 0, 0.56, 1)** (symmetric ease-in-out) [C+O] | translateY **957.7 → 0 px** (variant `y:960`) and opacity 0 → 1; exit back to y 960 / opacity 0 [C `exit:X`] | sheet and pill move together, 0 ms | fit rmse **2.1 px** over 958 px, t0 25620: y 930.6 @+43 ms, 571 @+156, 359 @+199, 157 @+250, 50 @+291 [O]. Peak velocity at 50 % of time (symmetric curve), no overshoot. Inner content variant `Bt` = opacity .001 → 1 over **600 ms** same bezier [C]. |
| K3 | **Card hover dim** | project pill/card `div#…` (`whileHover:Y`) | hover | **400 ms** spring, `bounce 0.2` [C] | 0 | spring compiled to `linear(0, 0.0235, 0.083 … peak 1.0151 at 59 % … 1)` [O] | opacity 1 → **0.9** [C+O] | — | `runtime/kirillkozyrev.com_1440.json` animate log; peak overshoot 1.5 % at ~236 ms |
| K4 | Card hover out | same | mouse leave | **300 ms** | 0 | **cubic-bezier(0.25, 0.1, 0.35, 1)** [O] | opacity 0.9 → 1 | — | same file, t 18101 ms |
| K5 | **Footer link pills** (Are.na / Instagram / X) | `a.framer-osyrk3` | hover | spring **0.4 s, bounce 0.2** [C `en/Rt/xt/yn`] | 0 | spring | background `#f5f5f5` → `#404040` token, label → `#f7f7f7` [O] | — | `runtime/kirillkozyrev.com__about_1440.json`: bg channel 245 → 231 @24 ms, 193 @52, 149 @83, 107 @113, 74 @145, 50 @176, **39 @207, 37 @239 (5 % past target)**, 42, 45, 46, 47 @395 ms, then token. Progress: 50 % at ~85 ms, overshoot peak ~240 ms, settled ~395-430 ms. |
| K6 | Nav pill states | centre nav `nav.framer-y5644w` 256×44, `backdrop-filter: blur(64px)`, `rgba(242,242,242,.8)`, radius 100 | page change | variant swap (`framer-v-y5644w` → `framer-v-1odzv9`) [O]; transition `ut` = spring 0.45 s bounce 0.15 [C, I which variant uses it] | | | | | |
| K7 | Page change `/` ↔ `/about` | document | nav click | browser View Transition, Framer default; fixed header elements excluded from the transition [O CSS] | | | | | not triggered by capture [U duration] |
| K8 | Mobile image rows | 6 Splide tracks 358×272 | drag | Splide snap, speed 3, momentum 600 [C] | | | | | not swiped [U] |

Not present [O]: no scroll-linked effects, no reveal-on-scroll (IntersectionObserver count 4, all Framer internals; no style writes during the 6.8 s scroll), no preloader, no parallax. The 2 `<video>` elements autoplay inline [O media].

## 4. Smooth scroll
None. Native scroll: one 120 px wheel tick moves `scrollY` 0 → 120 in a single frame (19130.7 → 19162.1 ms, probe `frames`) [O]. `scroll-behavior: auto` [O].

## 5. Page transitions
Within the page, the project overlay (K1 + K2) is the transition: backdrop 500 ms ease-in, sheet 350 ms ease-in-out from 960 px below. Between pages Framer uses View Transitions with the fixed header/nav excluded [O CSS rules]; timing unmeasured [U].

## 6. Hover states
K3/K4 (cards: dim to 0.9 with a soft spring, recover 300 ms), K5 (pills invert to dark with a 5 % spring overshoot). Nav links underline token `--framer-link-text-color: rgb(0,153,255)` defined but not seen in use [O]. No cursor effects.

## 7. Spacing, grid, type, colour

Breakpoints [C]: desktop ≥ 1440 (design frame 1440), tablet 810-955.98 / 956-1439, phone < 810.

Spacing (computed counts, home 1440 / 390) [O]:
- gap: **24 px** (13), **8 px** (13), **16 px** (12), 10 px (8, Framer stack default), 12 px (7), 2 px (6).
- padding: 24 px left/right on cards (12), 16 px (header), 8/6/12 px inside pills (`6px 12px 5.5px`).
- section padding [C HTML]: `240px 16px 32px` (top of home at desktop), `96px 16px 32px` (phone), `178px 0 280px`.
- **Base unit: 8 px** with a 4/8/12/16/24 ladder (+ 2 px hairline gaps). 10 px values are Framer defaults, not design.

Grid: no CSS grid [O grid: []]; Framer stacks. Desktop content column **737 px** centred (x 351 → 1088 at 1440): two cards **363 × 478** per row with **12 px** gap; row pitch 492 px (1836 → 2328) [O boxes]. Case sheet 922 px wide. Phone: 16 px side gutter, cards 358 × 272 carousels [O].

Radii [O]: cards **16** (50 instances), sheet 24 / `0 0 24 24` (12), pills **100-120**, 64 (6), 1000 (avatar). Soft layered shadow on the sheet (`rgba(0,0,0,.19) 0 -0.48px 2.41px -1.33px …`).

Type [O]: one family, **ABC Marist (trial)**, weight **350** only, **12/18 and 14/18**, letter-spacing normal; colours `#2f2f2f`, `#404040`, `#8a8a8a` (secondary), white on dark pills. Case title 28 px line box observed (`framer-llwogz` 283×28) [O].

Colour tokens [C HTML]: `#2f2f2f` text, `#5f5f5f`, `#a2a2a2`, `#bbbbbb`, `#f7f7f7`, `#030303`, accent `#10e32b` (not seen on screen), nav glass `rgba(242,242,242,.8)` + blur 64.

## 8. What to learn for calm, premium motion in dermatology explainers and reels

Worth learning:
1. **The sheet-over-dimmed-backdrop (K1 + K2) — the most transferable thing here.** The content card rises the full frame height in **350 ms with a symmetric ease-in-out (.44,0,.56,1)** while the background dims over **500 ms with an ease-in**. Two different curves on two layers: the card arrives decisively, the backdrop deepens slowly and keeps going after the card has landed (150 ms of tail). For explainers: bring a "fact card" or product-ingredient panel up over a dimmed clip the same way; land the card at 350 ms, finish the dim at 500 ms.
2. **Hover/press feedback is tiny: opacity to 0.9, not a scale.** A 10 % dim with a 1.5 % overshoot spring (400 ms) is enough to say "this is interactive". For on-screen callouts in a reel, emphasise by dimming the rest by ~10 % rather than bouncing the subject.
3. **Springs with low bounce (0.15-0.2) for colour changes**: pills invert dark in ~400 ms with a ~5 % overshoot at ~240 ms. Use this for label chips ("Before" / "After", "Day 30") switching state.
4. **Spacing discipline: one 8-px ladder (4/8/12/16/24), radii 16 on media and 24 on sheets, pills fully round, one type weight at two sizes (12/18, 14/18).** That restraint is the premium feel; it maps directly onto lower-thirds and caption chips.
5. **Glass nav (blur 64, white 80 %)**: a single frosted capsule as the only floating element matches the "calm glass" brand direction.

Do not copy:
- The ease-in backdrop on *close* as well as open (same curve both ways): in video, exits should ease out; an ease-in fade-out reads abrupt at the end.
- 12-14 px UI type and `#8a8a8a` secondary grey: too small and low-contrast for phone reels.
- Trial-licensed typeface (ABC Marist "Unlicensed Trial") — not usable, and not ours to use anyway.
- The full 960 px travel is fine on a 900 px stage; on a 1920 px vertical reel scale the travel to the frame height, not a fixed 960.
