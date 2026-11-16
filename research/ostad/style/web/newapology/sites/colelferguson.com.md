# colelferguson.com — motion and spacing study

Study notes only. Nothing from this site ships: no code, CSS, fonts, images or copy.
Measured 2026-11-16 (headless Chromium 1243, Playwright). Linked from newapology.com `/work/cole-ferguson`
(a photographer's portfolio; Next.js + Sanity build).

Tags: **[O]** observed in a capture, **[I]** inferred from code or a fit, **[U]** unknown.

Time bases: `marks[].t` in every JSON is raw `performance.now()`; `frames[].t`, `writes[].t`, `styleWrites[].t`
and `animate[].t` are relative to the init script, which ran about 540 ms (home) / 515 ms (gallery) after navigation
start. All durations below are differences inside one series. Session videos are **not** wall-clock (Playwright
under load stretches them by roughly 1.6x), so video timestamps are only used to show what a state looks like;
every number comes from the logs.

## 1. Pages captured

The site has two routes (`/`, `/gallery`) plus in-page states that work as pages: the project slideshow, the
Information panel, the gallery lightbox and the gallery List view. The home links are only `/`, `/gallery`
and Instagram (`facts.links`).

| Page / state | How reached | 1440 | 390 |
|---|---|---|---|
| Home: preloader + project slideshow | `/` | `runtime/colelferguson.com_1440.json` (generic), `colelferguson.com/runtime/interact_home_1440/interact_home_1440.json` (per-frame) | `runtime/colelferguson.com_390.json`, `colelferguson.com/runtime/interact_mobile_390/interact_mobile_390.json` |
| Home: Information panel | "Information" button | `interact_home_1440` marks `info_open`, `info_close` | — (desktop control, `xl:block`) |
| Overview (gallery grid) | `/gallery` | `runtime/colelferguson.com__gallery_1440.json`, `colelferguson.com/runtime/interact_gallery_1440/interact_gallery_1440.json` | `runtime/colelferguson.com__gallery_390.json` |
| Gallery lightbox (project page) | click a cell | `interact_gallery_1440` mark `click_item` | — |
| Gallery List view (index) | "List" toggle | `interact_gallery_1440` marks `list_toggle`, `grid_toggle` | — |
| Mobile menu | "Menu" | — | `interact_mobile_390` marks `menu_open`, `menu_close` |

`capture.mjs` (generic load / wheel / hover) ran on both routes at both widths. Because the document never
scrolls (docH = viewport: 900 at 1440, 844 at 390) and the interesting motion is click-driven, I added a per-frame
interaction recorder, `sites/colelferguson.com/interact.mjs`. It samples bounding box, computed opacity and
transform of named elements on every rAF (about 31 fps headless, 30-33 ms apart), logs every `style`/`src` write
and every `Element.animate()` call, and clicks through the states above.

Frames: `sites/colelferguson.com/frames/interact_home/preloader_0-3s_10fps.png`,
`frames/interact_gallery/lightbox_seq_25.6s_5fps.png`, `frames/interact_gallery/scan_14-38s.png`,
`frames/home_1440/contact_1fps.png`, `frames/gallery_1440/contact_1fps.png`, `frames/interact_home/info_open_28s.png`.

## 2. Stack (REA + bundle text)

Bundle: HTML for `/` and `/gallery` plus the 16 same-origin `/_next/static/` files they reference (1.2 MB) in
`sites/colelferguson.com/extracted/`.

- Whole-tree REA run timed out at the 300 s per-source deadline on the GSAP vendor chunk and returned a partial
  observation, Evidence **`ev_994980daf081554eb6d2864f49cb7b8064644059f6a413c771b6fd031423448c`**
  (`rea_timeout_partial.json`): 1 file parsed (`0b0944fb-…js`, 14,937 semantic nodes, `gsapVersions`, `timeline`,
  `_gsap` reads).
- Targeted re-run on the 4 app-owned chunks (`3995-…`, `5820-…`, `app/gallery/page-…`, `app/layout-…`) completed:
  parent Evidence **`ev_73c58f8ada0d779edd0e293e9c88147e2d5a32c649a8fc9882e5ab6b0c5a7f10`**, summary view
  `ev_b31aed0b0963ec61aae63a257293675b2d06437c3c23c21c25919c932b2f4949` (`rea.json`, full `rea_evidence.json`),
  4 files parsed, 47 webpack modules, 373 findings, 28,246 AST nodes, 0 parse failures.
  Recovered module exports include `Preloader` (41896), `PreloaderGate` (68173), `PageTransition` (17706),
  `LenisProvider` (89748), `LightBox` (92537), `InfoShell` (43456), `CursorLabel` (53542), `DesktopCursorPolicy`
  (16338), `PhotoIndicator` (72153), `GalleryGridView` (74007), `GalleryListView` (64843), `MenuMobile` (27181),
  `ProjectView` (50942), `GalleryView` (58322).

| Library | Version | Evidence | Role | Tag |
|---|---|---|---|---|
| Next.js (App Router) | 15.5.9 | `5207-…js` `version:"15.5.9"` | framework | [O] |
| React | 19.2.0-canary | `10180c45-…js` | | [O] |
| GSAP | 3.13.0 | `0b0944fb-…js` `"3.13.0"`; REA ev_9949… | Information panel, lightbox title/content, gallery expand | [O] |
| ScrollTrigger | (in GSAP chunk) | string present in `0b0944fb-…js` | registered, no scroll-linked tweens observed | [I] |
| framer-motion / motion | (bundled, `a.P.div`) | `transition:{type:"spring",stiffness:380,damping:36,mass:.2}` etc. in `3995`, `5820` | springs, crossfades, page entry, stagger | [O] |
| Lenis | 1.3.11 | `5493-…js` `"1.3.11"`; `LenisProvider` = `new Lenis({lerp:.1})` + own rAF loop | window smooth scroll; idle because the window never scrolls | [O] code, [O] idle |
| Tailwind CSS | 4 | `_next/static/css/2da48b6c7e39501c.css` (36,153 B) | tokens, CSS transitions | [O] |
| Sanity | API `2025-10-03` | module 57825 | content | [O] |
| WebGL / canvas | none | `facts.media.canvas = 0` | | [O] |

CSS `@keyframes`: 0. Custom easing tokens in CSS: `--ease-premium: cubic-bezier(.22,1,.36,1)` and
`--ease-soft: cubic-bezier(.16,1,.3,1)`. [O]

## 3. Motion table

Two easing families do almost all the work: **`cubic-bezier(.22,1,.36,1)`** ("premium", an ease-out-quint-like
curve: 50 % of the move in 13 % of the time) for things that arrive, and **linear** for image crossfades.
Springs are all over-damped (no overshoot).

| # | Effect | Target | Trigger | Duration | Delay | Easing | Values | Stagger | Measured | Tag |
|---|---|---|---|---|---|---|---|---|---|---|
| C1 | Preloader flipbook | 57x72 px image, centred, white full-screen veil | first visit in a session (`sessionStorage "cole-ferguson:intro-seen"`), 30 s failsafe | 10 frames x `max(50, floor((1400-320)/10))` = **108 ms** each, then veil fade **320 ms** | waits for frame 1 to load and frames 2-10 to decode | veil: `cubic-bezier(.22,1,.36,1)` | src 1.webp -> 10.webp, veil opacity 1 -> 0 | — | src writes at 681, 800, 912, 1024, 1148, 1269, 1394, 1521, 1646 ms (mean step **121 ms**, 108 + render), veil starts 1763 ms (= last flip + 117) | [O] writes, [I] formula from module 41896 |
| C2 | Page entry rise | route content wrapper (`PageTransition`) | route mount | **650 ms** | 0 | `[.22,1,.36,1]` | opacity 0 -> 1 (WAAPI), y 8 -> 0 px | — | y fit to the bezier: start 469 ms, rms **0.007 px** over 13 writes; 50 % at 86 ms, 90 % at 244 ms, 99 % at 423 ms. Exit variant keeps opacity 1 (no exit fade) | [O] + fit |
| C3 | Project image crossfade | two stacked images | click Next/Prev half, click a counter digit, tap (390) | **720 ms** | 0 | **linear** | outgoing 1 -> 0, incoming 0 -> 1 simultaneously | — | 4 clicks: opacity steps of 0.0433 per 31 ms frame (1.40/s), start to end 715 ms; sum of the two opacities stays 1.00 +/- 0.01 (e.g. 0.502 / 0.498 at the midpoint) | [O] |
| C4 | Photo counter underline | 1 px black bar under the digit row | image change | spring k 380, c 36, m 0.2 (zeta 2.06) | 0 | spring, over-damped | left/width to the active digit (e.g. left 684 -> 696 px) | — | gallery toggle bar: simulated spring fits 12 writes at **0.1 px rms**; 50 % at 68 ms, 90 % at 211 ms, 99 % at 416 ms, no overshoot | [O] + fit |
| C5 | Project list centring | `ul.nav-project-list` (left column, 32 titles, 24 px rows) | active project changes / first mount | spring k 190, c 28, m 0.65 (zeta 1.26) | 0 | spring, over-damped | translateY 0 -> -447 px on mount | — | 46 writes, simulated spring fits at **0.4 px rms**; 50 % 114 ms, 90 % 307 ms, 99 % 580 ms, < 0.5 px at about 900 ms | [O] + fit |
| C6 | Information panel open/close | `.text` panel, `.text-info`, the "Overview / Information" links | "Information" button (`infoshell:toggle` event) | **500 ms** | 0 | GSAP `power2.inOut` | panel height 0 -> 48 vh (432 px); info opacity 0 -> 1; links travel up -783 / -402 px with the panel top | — | writes 27909 -> 28398 ms (489 ms); at 236 ms (p 0.48) height 24.29 vh = 0.506, the inOut midpoint; close is the mirror (30614 ->). An image layer also changes opacity, but faster: 0.40 -> 1 in about 230 ms on open (27986 -> 28208), 1 -> 0 in about 310 ms on close (30614 -> 30924), while the photo counter travels y 155 -> 875 px | [O] |
| C7 | Lightbox (project detail from the grid) | grid veil, title, image | click a grid cell | grid/lightbox crossfade **720 ms linear**; title hold **600 ms**; title travel **600 ms**; content **600 ms** | sequential | title + content `power2.out` | title placed at `innerHeight/2 - 24` = 426 px, holds, travels to y 0; content y 10 -> 0, opacity 0 -> 1 | sequence | title writes: set 20840, travel 21446 -> 22040 (594 ms), content 22040 -> 22633 (593 ms), total 1.8 s. At 390 the title instead drops to the bottom (y = vh - 48 - h - 24) in 0.6 s with 0.05 s offset | [O] writes, frames `lightbox_seq_25.6s_5fps.png` |
| C8 | Lightbox close | lightbox | Escape | 0 ms (removed) | — | — | — | — | element present until 23708 ms, null at 23714 ms | [O] |
| C9 | Grid cell reveal (stagger) | each gallery cell overlay | image load / view mount | **220 ms** | `index mod batch x 22 ms` (0, 22, 44 … up to 374 ms) | `[.22,1,.36,1]` | opacity 0 -> 1, translateY 4 -> 0 px | **22 ms** | 1,072 `Element.animate` calls in `runtime/colelferguson.com__gallery_1440.json`; delays 0-374 ms in steps of 22; duration-0 calls set the hidden state first | [O] |
| C10 | Image arrival blur | every `img` | image decoded | **300 ms** | 0 | `[.22,1,.36,1]` | filter blur(10px) -> blur(0), opacity 0.96 -> 1 | — | CSSTransition `filter@img.object-cover…` seen 457 samples | [O] |
| C11 | Grid <-> List toggle | two views stacked in one grid cell | Grid / List buttons | in **240 ms**, out **160 ms** | 0 | in `[.22,1,.36,1]`, out `[.4,0,1,1]` (ease-in) | opacity | — | WAAPI calls at 28374.8 ms (`{"opacity":[1,0]}` 160 ms, `[0,1]` 240 ms); returning to Grid re-runs C9 | [O] |
| C12 | Hover focus dim | other grid cells and captions | hover a cell | **300 ms** | 0 | `cubic-bezier(.4,0,.2,1)` | opacity 1 -> 0.2 | — | CSSTransition `opacity@button.relative.block.w-full` 1 -> 0.2, 300 ms (gallery 1440, from 22236 ms) | [O] |
| C13 | Custom cursor label | `div.cursor-label`, `mix-blend-mode: difference` | pointer over image halves | position: **0 lag** (1:1 with the pointer); label 280 ms; container opacity 220 ms | 0 | `[.22,1,.36,1]` | 7 px dot <-> "Next"/"Prev" text, text scale 0.35 -> 1 | — | 10 pointer steps 1000 -> 400 px: each write equals the pointer x exactly (940, 880, … 400) | [O] |
| C14 | Mobile menu | `nav[aria-label=Primary]` | "Menu" | spring k 420, c 36, m 0.25 (zeta 1.76) | 0 | spring | y -24 -> 0 px; label "Menu"/"Close" crossfade 220 ms out then 220 ms in (`mode: wait`, `[.4,0,.2,1]`) | — | open: -23.9 at 6084, -11.6 at 6146 (50 % at about 62 ms), -2.2 at 6274 (90 % at about 190 ms), `none` at 6396; simulated 50/90/99 % = 62/188/369 ms | [O] + fit |
| C15 | Project-to-project (vertical) | `div.snap-y.snap-mandatory` list, one project per 100 dvh | wheel / swipe | native snap | — | browser | inactive projects `opacity-0`, active `opacity-100`, `transition-opacity duration-300` | — | one 120 px wheel did not pass the snap point: scrollTop 138 -> 24 in 194 ms (snap back) | [O] |

## 4. Smooth scroll

Lenis 1.3.11 is mounted on the window with `lerp: 0.1` and driven by its own `requestAnimationFrame` loop
(`LenisProvider`, module 89748). With frame-rate-independent damping (`1 - exp(-60 x 0.1 x dt)`), that would be a
time constant of 167 ms (63 % of the way in 0.17 s, 95 % in 0.5 s) [I from code]. **It never runs here**: the
document height equals the viewport on every route (900 / 844), and all scrolling happens in inner native
scrollers. Measured on the gallery scroller: each 120 px wheel moved `scrollTop` by exactly 120 px in the next
frame (0 -> 120 -> 240 … 840, `interact_gallery_1440` frames), so wheel-to-position lag is 0 frames in headless. [O]

## 5. Page transitions

`/` <-> `/gallery` uses the framer `PageTransition` entry (C2): opacity 0 -> 1 and an 8 px rise over 650 ms with
the premium ease, and no exit animation (exit variant `opacity: 1`). In-page "pages" (project slides, lightbox,
Information, List) use C3, C6, C7, C11. [O]

## 6. Hover states

- Text links and "Information"/"Overview": colour `#121212` -> `#717171`, 300 ms standard ease
  (`color@a.fixed…` CSSTransition). [O]
- Project list rows: opacity/colour 180 ms `[.22,1,.36,1]`. [O]
- Grid cells: siblings dim to 0.2 in 300 ms (C12). [O]
- Image halves: cursor label (C13) plus `.next-btn::after` text fade 200 ms. [O]
- Counter digits: active digit lifts -2 px, 200 ms (`transition-transform duration-200`). [I] from module 72153

## 7. Spacing, grid, type, colour tokens

**Base unit** `--spacing: .25rem` (4 px). Measured values (`facts.spacing`): gaps 4, 6 (251x, caption rows at
1440), 8 (251x at 390), 24, 32, 48, 60, 100; paddings 8, 12, 20, 24, 64, 80. Page margin **24 px** at 1440, **20 px**
at 390. [O]

**Grid**:

| Width | Layout grid | Columns | Gutter | Evidence |
|---|---|---|---|---|
| 1440 | page | 24 x 58 px inside 24 px margins | 0 | `div.px-[24px].grid.grid-cols-24` |
| 1440 | gallery | 6 x 124 px | row 100 px, column 60 px | `div.w-full.h-full.grid` |
| 1440 | Information panel | 20 x 30.5 px | 32 px | `div.grid.grid-cols-20.gap-x-[32px]` |
| 390 | page | 8 x 43.75 px inside 20 px margins | 0 | `div.grid.grid-cols-8` |
| 390 | gallery | 8 x 26.25 px | row 24 px, column 20 px | `div.w-full.grid.grid-cols-8` |

A debug `GridOverlay` (module 42078) draws the same 24 columns with 24 px edge lines, so the grid is the design's
own reference. [O]

**Type**: one face, **recitalBook** (single weight 400, Arial fallback with metric overrides
`size-adjust: 104.59%`). Letter-spacing normal everywhere except the cursor label (0.025 em = 0.3 px).

| Role | 1440 | 390 |
|---|---|---|
| UI / nav / list / captions | 12/18 (48x on home) | 12/18, 12/12 |
| Gallery captions | 10/15 (251x) | 10/12 |
| Body (Information) | 16/24 | — |
| Large | 64/73.6 (1x) | 21/27.3 |

Text colour `#121212` (rgb 18,18,18) and `#171717`, hover grey `#717171`, background `#ffffff`, image placeholder
`#f3f3f3`. Radii: none on content; only the 7 px cursor dot (50 %). [O]

## 8. What is worth learning for a dermatologist's explainer videos and reels

1. **Two curves, two jobs.** Arrivals use `cubic-bezier(.22,1,.36,1)` (half the move in the first 13 % of the time,
   99 % done by 65 %); swaps between two images use **linear opacity with both layers summing to 1**, so there is no
   brightness dip mid-dissolve. For before/after skin images in a reel, a 720 ms linear crossfade (about 22 frames at
   30 fps) is the most transferable single rule on this site.
2. **Tiny distances.** Entry rises are 8 px (page), 4 px (grid cells) and 10 px (lightbox content). Calm motion here
   comes from moving very little, not from moving slowly. Scaled to a 1080 x 1920 reel that is roughly 10-20 px.
3. **Sequence instead of overlap for the hero moment.** The lightbox holds the title still for 600 ms, moves it for
   600 ms, then fades the image in for 600 ms: one thing at a time, 1.8 s total. That is a good beat for "name the
   condition, then show it".
4. **A 22 ms stagger.** Short enough to read as a ripple, not a queue (a full row of 6 lands within 330 ms).
5. **Springs only where something tracks a target**, and always over-damped (zeta 1.3-2.1): underline, list
   centring, menu. No bounce anywhere.
6. **The 24-column / 24 px margin grid** with a single 12 px UI size and a single weight: restraint the reel layout
   can borrow for captions and labels.

## 9. What not to copy

- The preloader flipbook (108 ms frames) is fast and busy; on a medical explainer it would read as a glitch. If an
  intro is needed, keep only the 320 ms veil fade.
- Entry animation runs under the preloader veil (C2 starts at 469 ms; the veil lifts at 1763 ms), so on first visit
  it is never seen. Do not plan motion that the viewer cannot see.
- `mix-blend-mode: difference` cursor and 10 px captions: unreadable on skin tones and on phones.
- Instant lightbox close (C8): fine for a site, but an abrupt cut in a reel. Mirror the open instead.
- 0.2 hover dimming of everything else is too aggressive for clinical imagery; it reads as "disabled".

## 10. Unknowns

- [U] Lenis behaviour in a real browser was not observable (idle by construction); the 167 ms time constant is from code.
- [U] Real Chrome's animated wheel scrolling is off in headless, so the 0-frame wheel lag applies to headless only.
- [U] The "Expand" video button (`button.video-button`) was off-screen for the click in `interact_home_1440`
  (`expand_video_FAILED`), and the project-list click timed out (`list_click_FAILED`); the GSAP expand for the
  gallery (`x/y/scale` to centre, 500 ms `power2.inOut`, `.video-bg` fade 500 ms, `--after-opacity` 500 ms with
  300 ms delay, module code in `3995`) is [I] from code only.
- [U] At 390 the swipe on the image did not advance (no crossfade logged); a tap on the right half did (C3).
