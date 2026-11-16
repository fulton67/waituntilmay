# bentleyrawle.com — motion and spacing study

Study notes only. Nothing from this site (code, CSS, fonts, images, video, copy) ships. Measured 2026-11-16.
Bentley Rawle is a cinematographer; the site is a **Cargo (Cargo Site v2, template `v273`) portfolio** with a
hand-written homepage block ("Homepage Custom CSS (Do not touch)"). Tags: **[obs]** observed in a capture,
**[code]** read from the served HTML/CSS, **[inf]** inferred, **[unk]** unknown.

## Pages captured

Pages from the Cargo page tree in the home HTML (`project_url` values) and the nav. Six page types, both widths:

| Page type | URL | 1440 | 390 |
|---|---|---|---|
| Home (list + hover video, desktop) / video stack (mobile) | `/` | `bentleyrawle.com_1440.json` | `bentleyrawle.com_390.json` |
| Project / case | `/Akon` | `bentleyrawle.com__Akon_1440.json` | `bentleyrawle.com__Akon_390.json` (via `capture_loadwait.mjs`) |
| Project / case (2nd) | `/Project-Chime` | `bentleyrawle.com__Project-Chime_1440.json` | `..._390.json` |
| Index / all projects | `/Projects` | `bentleyrawle.com__Projects_1440.json` | `..._390.json` (both via `capture_loadwait.mjs`, `WAIT=domcontentloaded`) |
| Info / about | `/Info-1` | `bentleyrawle.com__Info-1_1440.json` | `..._390.json` |
| Menu (a Cargo page) | `/Hamburger-Menu` | `bentleyrawle.com__Hamburger-Menu_1440.json` | `..._390.json` |

All files in `sites/runtime/`. `/Projects` (17 autoplay-preloaded videos, 53 images) never reached `networkidle` nor
`load` in 90-120 s, so `tools/capture_loadwait.mjs` (a copy of `capture.mjs` with a configurable wait) was used.
Frame study: `tools/br_frames.mjs` recorded its own videos with wall-clock marks:
`sites/bentleyrawle.com/frames/video_1440/1cf36be1d2df072c3d86850dafa02c9a.webm` (marks in `br_frames_1440.json`),
`frames/video_390/*.webm` (`br_frames_390.json`), per-frame luminance `frames/yavg_1440.txt`, sheets
`hovers_2fps_sheet.png`, `hover1_sheet.png`, `project_menu_sheet.png`, `menu_open.png`, `mobile_home_1fps.png`.
Headless rAF ran at ~31 ms (32 fps) [obs].

## Stack

Same-origin assets downloaded to `sites/bentleyrawle.com/extracted/`: 6 page HTMLs, `stylesheet.css` (13,628 B),
`design.js` (1,194 B). The platform JS (`static.cargo.site/.../cargo.apicore.package.jquery213.min.js`,
`apipackage.min.js`) is third-party origin and was not downloaded, per the brief.

REA: `rea analyze-javascript-application sites/bentleyrawle.com/extracted --json` → Evidence
**`ev_d6f192e0e083d84c853fbca13c39f274d34728eaf15d15eeb28f4de92ae5842a`**, 22 nodes / 29 edges, 7 relevant files,
1 JS file parsed (`design.js`), 0 parse failures, 28 findings; the only endpoint candidate is Cargo's
`layout_options` model. REA states the 3 inline script bodies in each HTML were **not** analysed and the Cargo
scripts are external — so REA confirms "a Cargo shell with almost no first-party JS", and the motion facts below
come from the inline HTML/CSS plus runtime.

| Piece | Evidence |
|---|---|
| Cargo 2 platform (jQuery 2.1.3 package, Handlebars templates, `scrollMonitor`) | script URLs; inline templates; `design.js` instantiates `MobileAdjustments` + `BaseUnit` |
| Cargo **marquee** element | `<div class="marquee" speed="-15">` — 16 on home, 17 per project page, 21 on `/Projects` [code]; runtime writes on `div.marquee_contents` [obs] |
| Hand-written hover-video script | inline IIFE: `a[data-video]` mouseenter → set `.video-background.src`, `play()`, remove `hidden`, add `white-on-hover`; mouseleave → pause, add `hidden` [code] |
| Vimeo player | project pages embed `player.vimeo.com/video/...` iframes in a `padding:69.58% 0 0 0` box [code] |
| Lazy-load | 3 IntersectionObservers, rootMargins `900px`/`1800px` at 1440 and `844px`/`1688px` at 390 (1 and 2 viewports) [obs `ioOpts`] |
| Absent | GSAP, Lenis, framer-motion, Three/WebGL (0 canvas), Swiper, Barba/Swup; `scroll_transition:false` in layout options [code]; `Element.animate` 0 calls on every page [obs] |

## Motion table

### A. Home hover → full-bleed project reel (signature, desktop)
| | |
|---|---|
| Type | JS swaps the `src` of one fixed `<video>` + toggles `display:none` class; link colour CSS transition |
| Target | 16 project-title rows (Arizona Mix 3rem) over a single `.video-background` (`position:fixed; min-width/height:100%; object-fit:cover; z-index:-1`) |
| Trigger | `mouseenter` / `mouseleave` on each title |
| Video in | **hard cut in one frame**: YAVG 230 → 46 between frames 11.48 and 11.52 s [obs `yavg_1440.txt`] |
| Latency hover → first video frame | 1.02 s (Lizzo, hover 10.505 → 11.52), 1.32 s (Beat Bunny 14.319 → 15.64), 3.17 s (Utah Jazz 18.231 → 21.40), 2.24 s (Otherframe 22.162 → 24.40) [obs]. Purely network: the intended preloader (`.preloader`, loading bar `transition: width 0.25s`) is shipped with `style="display:none"` [code] |
| Video out | one-frame cut back to white (e.g. 13.24 → 13.28 s), ≤250 ms after the mouseleave mark [obs] |
| Text | hovered row `color: black → white`, **300 ms `ease`** CSSTransition [obs `anims` `color@a.white-on-hover`, 116 samples]; an icon-font glyph (↻-style, ``) is prepended with `margin-right:5px` [code]; other rows stay black over the video (sheet `hovers_2fps_sheet.png` cells 4-7) |
| Feel | cinematic cut, like an edit; the only "motion" is the footage itself |

### B. Marquee titles (project pages, `/Projects`, mobile home captions)
| | |
|---|---|
| Type | Cargo marquee, rAF-driven `transform: translateX()` on `.marquee_contents` (`will-change:transform`) [code+obs] |
| Config | `speed="-15"` (right → left) on every marquee [code] |
| Step | **constant 1.35 px per frame at 1440** regardless of frame interval (1,214 deltas of −1.35 px at 30-40 ms dt, also −1.35 at 10-20 ms and 60-70 ms dt) → **frame-based, not time-based** [obs `Akon_1440`]; **1.011 px/frame at 390** [obs `Project-Chime_390`, `_390`] |
| Speed | 43 px/s at the measured 32 fps; **81 px/s at 60 fps** [inf, = 1.35 x 60] |
| Loop | content width 1,387 px at 1440: wrap −1387.04 → −0.21 px in one frame (35,049 ms) [obs] → ~17 s per loop at 60 fps [inf] |
| Mobile home | each video tile has its caption as a marquee row, rows 270 px apart, phases offset by 0.972 px per row (−16.52/−15.55/−14.58/−13.61 px at t=444 ms) [obs `bentleyrawle.com_390.json`; `mobile_home_1fps.png`] |
| Easing | none (linear, infinite) |

### C. Page navigation
Cargo client-side navigation (`rel="history"`). Click on "Lizzo" at 26.03 s: hover video cut at 26.36, list stays,
then the whole content swaps **in one frame** at 28.04 → 28.08 s (YAVG 229.4 → 234.4), Vimeo box appears in one frame
at 29.12 s [obs `yavg_1440.txt`, `project_menu_sheet.png`]. **No crossfade, no slide.** Cargo's own fade class
(`.scroll-transition-fade { transform 1s ease-in-out, opacity .8s ease-in-out }`) exists in the CSS but is switched
off (`scroll_transition:false`) [code].

### D. Loaders (platform)
`fade-pulse-in` 500 ms opacity 0 → .5 → 1 and `spin-loading` 12 s infinite on Cargo's loading glyph — seen only on
`/Projects` [obs `anims`]. Vimeo's own spinner appears on project pages in headless (no playback) [obs `menu_open.png`].

### E. Other declared transitions (platform, not triggered in captures)
Quick-view / lightbox: `opacity 333ms cubic-bezier(.4,0,.22,1)`, `transform 222ms cubic-bezier(.4,0,.22,1)`;
captions `opacity 100ms ease-in-out`; slideshow captions `opacity .3s` [obs `facts.transitions`]. Images on
`/Info-1` use `image-zoom` (4 inline writes) [obs].

## Smooth scroll
Native. `scroll-behavior:auto`, 0 sticky, 3 scroll listeners (Cargo `scrollMonitor`), no rAF-driven scroll writes
on any page [obs]. Lerp: none (position = wheel input).

## Hover states
Home titles: A. Everywhere: custom SVG cursors (`Cursor-SolidBento.svg` on `html`, `Cursor-WhiteBento.svg` on links and
images) [code]; `a:active {opacity:.7}` [code]. No hover motion on project pages (Akon/Chime: 0 CSS animations during
30 s of hovering [obs]).

## Spacing / type / grid tokens

| Token | Value | Evidence |
|---|---|---|
| Root size (Cargo base unit) | rem scales with viewport: **12.96 px at 1440 (= 0.9vw)**, **6.739 px at 390** (mobile zoom) | `main_margin 2rem` computes to 25.92 / 13.478 px [obs `spacing.paddingTop`] |
| Page margin | **2rem** all sides (25.92 / 13.48 px) | stylesheet `.content_padding`; [obs] |
| Spacing scale (rem) | 0.25 (3.24 px, grid-pad 0.5 → 41 elements on `/Projects`), 0.375 (4.86), 0.5 (6.48), 0.625 (8.1), 0.75 (9.72, 43 elements), 1.5 (19.44), 2 (25.92) | [obs `spacing` 1440] |
| Grid | Cargo 12-column `grid-row` with `grid-pad="0.5"`, `grid-gutter="1"`; spans used 10+2 (title/aside), 3/3/6 (credits), 4, 6 | [code] counts: `grid-col="10"` 16, `"2"` 17, `"3"` 20, `"6"` 9 on `/Projects` |
| Image gallery | "Columns", **2 columns**, `image_padding 1.5` (mobile 1), cards `width:50%` | [code] `data-gallery`; [obs] gallery_card writes |
| Video ratio | Vimeo boxes `padding-top:69.58%` | [code] |
| Display serif | **Arizona Mix Variable**, weight **310**, `SRFF 0.5`, h1 3rem / lh 1.3 (38.88/50.54 px @1440; 33.70/43.80 @390), letter-spacing .01rem; marquee titles 3.4rem / lh 1 (44.06 px @1440, 38.19 @390) | stylesheet + [obs `type`] |
| Sans | **Diatype Variable**: h2 1.4rem / 1.2, weight 350, ls .04rem (18.14 px @1440, 15.72 @390); small/credits 1.2rem / 1.4, weight 400, ls .04em (15.55 px @1440, 13.48 @390); bold 700 for labels | stylesheet + [obs] |
| Mono | Diatype Mono (tags, quick-view captions) | stylesheet |
| Colours | bg #fff; text rgba(0,0,0,.85) (headings), #000 and rgba(0,0,0,.5) (credits); hover text #fff over footage; menu panel rgba(20,20,20,.95) | stylesheet + [obs] |
| Radii | 0 on desktop; 8 px on the 16 mobile home tiles | [obs `borderRadius` 390] |

## What to learn for calm, premium explainer / reel motion

1. **Let the footage be the motion; cut, don't animate.** Every state change here is a one-frame cut (A video in/out,
   C page swap). For a dermatologist reel, hard cuts between real clinical footage with still typography read as
   confident and editorial; reserve animated transitions for information, not for changing shots.
2. **Typographic index over full-bleed video**: a quiet list of titles (serif, weight 310, 0.85 black) where the
   active title turns white over its footage in 300 ms ease. Directly reusable as a chapter card: chapter list on
   screen, the current chapter's clip fills the background, its label alone inverts.
3. **Slow constant marquee for secondary text**: ~81 px/s at 60 fps (≈ 5.6 % of a 1440 frame width per second),
   linear, never eased. A running caption or credit line at this speed stays legible and calm.
4. **A single fluid unit**: rem = 0.9vw, every gap a 0.25-rem multiple, 2rem frame margin. In a 1080-wide reel that
   is a ~9.7 px unit and a ~19 px safe margin [inf] — a simple rule for a brand bible.

What not to copy: hover-to-video with 1-3 s of blank wait (the shipped preloader is disabled), frame-based marquee
speed (it halves when the frame rate halves — in a render pipeline, define speed per second), white text that
vanishes on white before the video arrives (`hover1_sheet.png`: the hovered row is invisible for ~1 s), Vimeo
spinners as content, and custom cursors.
