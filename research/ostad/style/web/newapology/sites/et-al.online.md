# et-al.online — motion and spacing study

Study notes only. Nothing from this site ships (no code, CSS, fonts, images, copy).
Measured 2026-11-16, headless Chromium (Playwright), 1440x900 and 390x844 (DPR2, touch). Built by darkroom.engineering
(footer link to `https://darkroom.engineering`; same Lenis/Tempus/hamo/`dr-*` toolkit, see `darkroom.engineering.md`).

Tags: **[obs]** runtime, **[code]** shipped bundle, **[inf]** inferred, **[unk]** unknown. Headless ran at ~32 fps (dt ≈ 31 ms).

Capture note: this site never reaches `networkidle` (all 12 first attempts timed out at 90 s), so every capture used a copy
of `capture.mjs` with `waitUntil:"load"` (only change, plus recording the session video path into the JSON).

## 1. Pages captured

| Page | 1440 | 390 | docH 1440 | Notes |
|---|---|---|---|---|
| `/` home | `runtime/et-al.online_1440.json` | `runtime/et-al.online_390.json` | 7949 | 24 img, 4 video, 2 Splide carousels |
| `/collections/products` (index/list) | `runtime/et-al.online__collections__products_1440.json` | `..._390.json` | 8847 (390: 26145) | 52 img, product grid reveal |
| `/product-os` (product page) | `runtime/et-al.online__product-os_1440.json` | `..._390.json` | 6393 | |
| `/supply` | `runtime/et-al.online__supply_1440.json` | `..._390.json` | 7426 | goo tabs, spring fades |
| `/system` | `runtime/et-al.online__system_1440.json` | `..._390.json` | 7694 | |
| `/resources` | `runtime/et-al.online__resources_1440.json` | `..._390.json` | 3266 | |

Probe: `et-al.online/probe_home_1440.json` (single-wheel Lenis curves; click `/` → `/system`). Session videos: `video` field in each
JSON (home 1440 = `runtime/video/57b297b97848c70c7ea04c14759e0288.webm`). Frames: `et-al.online/frames/home1440_###.png` (1 fps) and
`home1440_load_sheet.png` (8 fps, first 3 s: blank white until ~1.75 s, then the hero photo; the text reveal is too small at that scale
to read, so the numbers below come from the style log).

## 2. Stack

Bundle: 41 same-origin assets from 6 page HTMLs into `et-al.online/extracted/` (3.6 MB). Next.js App Router, Turbopack, Tailwind +
CSS modules, darkroom `dr-*` scaled-unit utilities.

| Library | Evidence | Config |
|---|---|---|
| **Lenis 1.3.23** | [code] `1t7zg4ubwh71e.js@141` `var e="1.3.23"`; defaults `lerp:p=.1, smoothWheel:o=!0, syncTouch:n=!1, wheelMultiplier:w=1` @5230 | [code] app wrapper `0-z5na2j0le7p.js@19244`: `lerp: d?.lerp ?? .125, autoRaf:!1, anchors:!0, autoToggle:!0`, driven by `useTempus` |
| **Motion** (framer-motion / motion-dom, WAAPI-accelerated opacity) | [code] `047wwli-brj2d.js` (`generateLinearEasing`, WAAPI `fill:"both"`), spring solver `@55696`; [obs] 26 `Element.animate` calls on home | eases section 3 |
| darkroom `RevealUp` + `SplitText` components | [code] `06hnp0gkkk8us.js`: `RevealUp` `initial {opacity:0,y:"100%"}`, `duration .6`, `ease [.2,.6,.2,1]`; `SplitText` per line `delay: g + l*v`, **stagger default .06**, duration .6, line wrapper `overflow-hidden` | |
| Product grid `motion.li` whileInView | [code] `10_yxlm78js36.js`: variants `hidden {opacity:0,y:16}` / `visible {opacity:1,y:0}`, `viewport {once:!0, amount:.15}`, `transition {duration:.5, ease:[.2,.6,.2,1]}`; filter bar `layout:"position"` `duration .5 ease [.4,0,0,1]` | |
| Menu / cart drawers | [code] `3y_d6vfrqc8ch.js`: `eR=[.22,1,.36,1]`, `{duration:.8, ease:eR}`; overlays `{duration:.2, ease:"easeOut"}` | |
| `useScrollTrigger` (darkroom hook, not GSAP) + `Fold` sticky/parallax sections | [code] `0-z5na2j0le7p.js@4897` `start:"top bottom", end:"bottom top"`, `--parallax-scale`; `fold-module__…` classes | |
| **next-view-transitions** `Link` | [code] `0lch-f-m1v4o5.js` `document.startViewTransition(...)`; CSS `::view-transition-old/new(root){animation-duration:.4s; animation-timing-function:cubic-bezier(.65,0,.35,1)}`, `.01ms` under reduced motion | |
| Splide carousels | [obs] `ul#splide01-list` `translateX(139px)`, `splide__track--loop` | |
| OGL / Rive / Theatre strings | [code] present in shared chunks (`1tkogwcpeq8zd.js` ogl ×5) | [obs] 0 canvas on all 6 pages; [inf] used only in the product-builder tool, not on these pages |

Absent [code]: GSAP, Swiper, Barba/Swup, Three.js.

CSS easing tokens [code]: `--ease-out-quart (.165,.84,.44,1)`, `--ease-out-expo (.19,1,.22,1)`, `--ease-in-out-cubic (.645,.045,.355,1)`,
`--ease-gleasing (.4,0,0,1)`; `--duration-fast .2s`, `--duration .4s`, `--duration-slow .8s`; reveal `opacity/transform var(--reveal-duration,.7s) var(--ease-out-expo)`.
@keyframes: only 6 small module ones (spin, dot blink, ellipsis, carousel enter-left/right, wizard swap-in).

## 3. Motion table

| # | Effect | Target | Trigger | Duration | Delay | Easing | Values | Stagger | Measured |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Hero line-mask reveal** | hero title block, 2 split lines, subcopy, CTA | page load (after hero media ready) | **600 ms** | 0 / 100 / 160 / 350 / 500 ms | **cubic-bezier(.2,.6,.2,1)** | `translateY(100%) → 0` inside `overflow:hidden`; opacity 0→1 on WAAPI | lines **60 ms** (SplitText default .06) | [obs] fit on the transform log: each element bezier(.2,.6,.2,1), 590 ms, RMSE 0.004-0.006, starts at 2289 / 2349 / 2539 / 2689 ms = base 2189 + delay. WAAPI options logged verbatim: `{"delay":100,"duration":600,"easing":"cubic-bezier(0.2, 0.6, 0.2, 1)"}`. Whole hero settles **1.1 s** after it starts |
| 2 | **Product tile rise** | each `li` in the grid | enters viewport (15 % visible), once | **500 ms** | 0 | (.2,.6,.2,1) | `opacity 0→1`, `y 16px→0` | none in code; tiles in one row start together (same timestamp) | [obs] 55 WAAPI calls `duration 500` on 1440; tile y 15.7 px at first frame → 0 at +511 ms; row pairs share a start time (3292.7 ms ×2) |
| 3 | Smooth scroll | page | wheel | — | — | exponential, lerp 0.125 | — | — | section 4 |
| 4 | Page change crossfade | root | internal link | 400 ms | 0 | cubic-bezier(.65,0,.35,1) (in-out cubic) | old → new root snapshot crossfade | — | [code] CSS; [obs] probe click `/`→`/system`: `main`, `header` untouched (no JS transform), new path rendered by +480 ms. The crossfade lives on `::view-transition` pseudo-elements, which my probe did not sample [unk numerically] |
| 5 | Menu / drawer open | mobile menu, dropdown | click | 250 ms panel; contents 180 ms at +120 ms; image 300 ms at +800 ms | as listed | ease-out; (.2,.6,.2,1); (.22,1,.36,1) | opacity 0→1 | 120 ms then 800 ms | [obs] WAAPI log at t=31162 (home 1440). Close: 150-250 ms, no delay |
| 6 | Tab / panel swap | `div.relative.flex.w-full` | click | 200 ms out + 200 ms in, simultaneous | 0 | (.2,.6,.2,1) | opacity 1→0 / 0→1 | — | [obs] t=33163 |
| 7 | "Goo" tab bubble | `paths-section-module…bubble` | tab change | 400-500 ms | 0 | `--bubble-ease` (.2,.6,.2,1) or out-quart | left/top/width/height of the highlight | — | [code] CSS transitions; [obs] CSS var writes `--active-tab-left/right/...` |
| 8 | Accordion | grid rows | click | 600 ms | 0 | (.19,1,.22,1) out-expo | `grid-template-rows` 0fr→1fr | — | [code] CSS |
| 9 | Spring fades (supply, 390) | small badges | in view | 550 ms | 0 | `linear(0, 0.0121, 0.0435, 0.0882, …)` = Motion spring baked to CSS `linear()` | opacity 1→0, 0.18→0 | — | [obs] |

Fold sections (sticky + overlay + `--parallax-scale`) are configured `start:"top bottom", end:"bottom top"` [code] but wrote no
inline transforms during my captures (home 1440 has 260 style writes total) [obs]; they probably animate through CSS variables the
logger does not watch [inf].

## 4. Smooth scroll — measured (`probe_home_1440.json`)

| Impulse | First movement | 50 % | 90 % | 99 % | Settled |
|---|---|---|---|---|---|
| 120 px | +92 ms | +154 ms | +373 ms | +654 ms | +810 ms |
| 480 px | +81 ms | +143 ms | +363 ms | +675 ms | +987 ms |

Each ~31 ms frame closes **20.8 % ± 0.5 %** of the remaining distance [obs] = Lenis lerp **0.125** framerate-corrected
(1-e^(-7.5·0.031) = 0.207) [inf, matches]. Time constant 125 ms, no overshoot. Identical to darkroom.engineering. Phones: native scroll
(`syncTouch:false`) [code].

## 5. Hover states [obs]
| Target | Property | Duration | Easing | Values |
|---|---|---|---|---|
| nav / text links | color | 300 ms | ease | `rgb(83,82,82)` → `rgb(158,158,158)` (dims on hover) |
| "+" icon in pill | opacity, rotate | 400 ms | (.4,0,0,1) | rotate 0 → 45°, cross-fade with label |
| primary button | background, color | 200 ms | (.4,0,0,1) | `rgb(240,240,240)` → `rgb(31,31,31)` |
| arrow glyph | opacity | 400 ms | out-quart (.165,.84,.44,1) | 1 → 0 |
| product card meta | opacity, color | 200 ms | ease | price row swaps for colour swatches |
| icon buttons | opacity | 200 ms | ease | 1 → 0.7 |

## 6. Spacing, type, grid, colour

**Units** [obs + inf]: every `dr-N` utility is `N × (viewport / design width)`. 1440: 0.9 (design 1600: dr-20 = 18 px, dr-30 = 27,
dr-60 = 54, dr-90 = 81, dr-100 = 90, dr-172 = 154.8). 390: 0.9701 (design 402: dr-20 = 19.40, dr-30 = 29.10). Written as
`calc(N * ((… * 100) / var(--device-width)) * 1vw)` [obs style log].

**Spacing scale** (design units) [obs, home 1440 counts]: gap **20** ×18, **30** ×7, **60** ×4, 8 ×4, 90 ×2; padding 10, 20, 30;
page side padding **20** (mobile) / **172** (desktop, `dt:dr-px-172`) [code class]. Base unit **10** (20 / 30 / 60 / 90 multiples).

**Grid**: no CSS grid on the main layout [obs: only one tiny grid]; flex rows with 20-unit gaps, a 172-unit side margin at 1600,
content width 1250 px at 1440 (hero block box) [obs].

**Type** (`rand`, one family) [obs]
| Role | Design px | 1440 px | Line height | Weight | Tracking |
|---|---|---|---|---|---|
| caption / UI | 14 | 12.6 | 1.2-1.3 | 400 / 700 | 0 |
| body | 16 | 14.4 | 1.2 | 400 | -0.01em |
| lead | 24 | 21.6 | 1.3 | 400 | -0.02em |
| H3 | 32 | 28.8 | 1.05-1.2 | 200 / 400 | -0.02 to -0.03em |
| H2 | 52 | 46.8 | 1.1 | 200 | -0.02em |
| H1 | 64 | 57.6 | 1.0 | 200 | -0.02em |

**Radii** [obs]: pill (`3.35e7px`) ×15, **16** (14.4 px) ×14, **20** (18 px) ×9, **8** (7.2 px) ×8, 60 on large sheets.
**Colour** [obs]: background `rgb(252,252,252)`, neutral greys only: 240, 191, 158, 123, 100, 83, 31; white on photography.

## 7. What to learn for calm, premium explainer motion (dermatologist reels / YouTube)

Worth learning
1. **Line-mask reveal**: each text line rises from 100 % below inside a clipping box, 600 ms, bezier(.2,.6,.2,1), 60 ms between lines.
   This is the single most transferable move: captions and key terms can enter exactly like this, calm and readable.
2. **One soft out-curve, short delays**: hero sequence uses delays 0/100/160/350/500 ms, so the whole block is done in 1.1 s.
   In a reel, a title card plus two supporting lines should finish inside ~1.1 s and then hold.
3. **Small travel**: grid tiles move only 16 px with a fade (500 ms). Small distance plus a gentle curve reads as premium; big travel reads as busy.
4. **Lerp 0.125 follow** (tau 125 ms) for any tracking move, same as darkroom.
5. **Neutral palette, one family, weight 200 for display**: lets the photography (here: skin images) carry the colour.

Do not copy
- Spring-baked `linear()` badge fades and the goo tab bubble: playful, not clinical.
- The 800 ms delayed menu image: on video, waiting with nothing moving reads as a stall.
- Opacity-only page crossfades as the main scene change in video: fine on the web, flat in a reel; pair them with a small move.

## 8. REA
`rea analyze-javascript-application <abs>/et-al.online/extracted --format json --max-heap-mb 4096 --analysis-timeout-ms 120000 --source-paths-json et-al.online/rea-sources.json`
(33 files under 150 KB).
First run stalled with the darkroom run (see darkroom.engineering.md); re-ran on the 33 files under 150 KB, `--analysis-timeout-ms 120000`. Result:
- Evidence `ev_76bb5288fd1d3c006c8b07dee095543723bf9f5593e579b9e278860610e2db2c`
- `JavaScriptApplicationGraph` `jag_2d86ebed9f8ecfa867c5b1e58ec78a8a466e312c55375db751199a507df59486`: 605 nodes (530 javascript-module, 36 asset, 13 endpoint, 9 storage, 10 unknown), 710 edges, 33 files parsed, **0 parse failures**, 398,793 AST nodes, 624 findings, coverage `partial`.
- Semantic graph `jsrg_387603168ccdb3f337474f27d5e3141889ed3ed30726954568908868cee1155f` (truncated at the 100,000-node cap).
- Route inventory includes `/`, `/collections/products`, `/product-os`, `/legal/*` (navigation targets).
- Left out of REA: the 3 files over 150 KB (`3b5-ca_a1j7z4.js` schema lib, `3y_d6vfrqc8ch.js` nav/cart app chunk, React DOM). The menu/cart easing claims from `3y_d6vfrqc8ch.js` are from text search only.
- REA does not name UI libraries; library and parameter claims come from bundle text search (file@offset) and runtime capture.
Evidence IDs above are file@offset positions in the minified bundle.
