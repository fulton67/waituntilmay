# darkroom.engineering — motion and spacing study

Study notes only. Nothing from this site ships (no code, CSS, fonts, images, copy).
Measured 2026-11-16, headless Chromium (Playwright, GPU flags), 1440x900 and 390x844 (DPR2, touch).
Linked from newapology.com (et-al.online's footer credits darkroom as builder, so the two sites share one toolkit).

Tags: **[obs]** observed at runtime, **[code]** read in the shipped bundle, **[inf]** inferred, **[unk]** unknown.

Headless frame rate in all captures was ~32 fps (rAF dt 28-38 ms), so curves are sampled every ~31 ms.

## 1. Pages captured

| Page | 1440 | 390 | docH 1440 | Notes |
|---|---|---|---|---|
| `/` home | `runtime/darkroom.engineering_1440.json` | `..._390.json` | 8846 | 4 video, 0 img, scroll-driven CSS |
| `/work` index | `runtime/darkroom.engineering__work_1440.json` | `..._390.json` | 12760 | 106 img, 12 video, 1 WebGL canvas, marquee |
| `/work/harbor` case | `runtime/darkroom.engineering__work__harbor_1440.json` | `..._390.json` | 9406 | 26 video |
| `/about` | `runtime/darkroom.engineering__about_1440.json` | `..._390.json` | 5298 | marquee |
| `/contact` | `runtime/darkroom.engineering__contact_1440.json` | `..._390.json` | 2196 | |
| `/developers` | `runtime/darkroom.engineering__developers_1440.json` | `..._390.json` | 2704 | |

Extra probes (my own script, same browser): `darkroom.engineering/probe_home_1440.json` = per-frame `scrollY` after single
wheel impulses (Lenis lerp) and per-frame computed style of `#curtain`, `#curtain-content`, `main`, `header`,
`.curtain-text-line-*` across a click from `/` to `/work` (page transition). Probe video: `darkroom.engineering/probe_video/11e061ff213e3f40b1af5df0b57a403a.webm`.
Session videos: the `video` field in each runtime JSON (e.g. home 1440 = `runtime/video/dfbb34c4c010d4292c439b3527c28b7d.webm`).
Frames: `darkroom.engineering/frames/home1440_*.png` (4 fps, first 12 s), `home1440_sheet.png`, `work1440_*.png` (2 fps, 4-34 s).

## 2. Stack (bundle + runtime)

Bundle: 26 same-origin assets from 6 page HTMLs into `darkroom.engineering/extracted/` (2.6 MB). Next.js App Router, Turbopack
(`turbopack-1byz1flvc-bu1.js`), styling by **StyleX** (atomic `x…` class names, keyframes named `x…-B`).
REA: see section 9.

| Library | Evidence | Config found |
|---|---|---|
| **Lenis 2.0.0-dev.5** smooth scroll | [code] `0r0w1d7khx_gp.js@9429` `l="2.0.0-dev.5"`; constructor `respectReducedMotion:E=!0`, `stopInertiaOnNavigate:b=!0` @14328 | [code] app wrapper `00vgv92jzf4nf.js@7878`: `wheel:{lerp:.125,...}`, `autoRaf:!0`; scrollbar drag and arrow keys use `scrollTo(...,{lerp:.2})` @5876/@6204, arrow step 100 px |
| **GSAP + TextPlugin** (lazy, only for page transitions) | [code] `3x79abk8gxv4f.js`: `Promise.all([e.A(16495),e.A(23174)])…registerPlugin(t.TextPlugin)` | timelines in section 5 |
| **Tempus** (darkroom rAF scheduler), **hamo** hooks | [code] `Tempus` 14 refs, `hamo` 3 refs | [inf] drives Lenis + marquee on one clock |
| CSS **scroll-driven animations** (`animation-timeline: scroll(root)` and view timeline `--projects`) | [code] CSS rules `.xqy1as1{animation-timeline:scroll(root)}`, `.x2596jo{animation-timeline:--projects}`; [obs] `getAnimations()` reports `ScrollTimeline` / `ViewTimeline` | section 4 |
| **View Transitions API** (React `addTransitionType("curtain")`) | [code] `3x79abk8gxv4f.js` `addTransitionType("curtain")`; CSS `::view-transition-old/new(root){animation-duration:.2s}` and `html:active-view-transition-type(curtain)::view-transition-*{animation:none}`; [obs] UA view-transition anims 200/250 ms at load | |
| **OGL** WebGL (only on `/work`) | [code] `423r94fa74309.js` 5 refs to `ogl`; [obs] 1 `canvas` 1440x900 on `/work` | [unk] shader parameters not recovered |
| Theatre.js (studio root excluded from transitions) | [code] `theatrejs-studio-root` string in `00vgv92jzf4nf.js` | [inf] dev tooling only |

Absent [code]: ScrollTrigger as a GSAP plugin (the 12 "ScrollTrigger" strings are darkroom's own `useScrollTrigger` hook name),
framer-motion, Swiper, Barba/Swup, Three.js.

Easing tokens shipped in CSS [code] (full Penner set as custom properties): `--ease-out-quint: cubic-bezier(.23,1,.32,1)`,
`--ease-out-expo: (.19,1,.22,1)`, `--ease-in-out-quart: (.77,0,.175,1)`, `--ease-gleasing: (.4,0,0,1)`, etc. The one actually
used for UI transitions at runtime is **ease-out-quint (.23,1,.32,1)** [obs, every CSSTransition in every capture].

## 3. Smooth scroll (Lenis) — measured

Probe: one wheel event, sample `scrollY` every frame (`probe_home_1440.json`, analysed with `lerp.py`).

| Impulse | First movement after wheel | 50 % | 90 % | 99 % | Settled |
|---|---|---|---|---|---|
| 120 px | +81 ms | +144 ms | +361 ms | +640 ms | +798 ms |
| 480 px | +49 ms | +114 ms | +328 ms | +644 ms | +952 ms |

- Every frame closes **20.7 % ± 1.5 %** of the remaining distance at dt ≈ 31 ms [obs]. Lenis 2 damps as
  `x += (target-x)·(1-e^(-60·lerp·dt))`; with lerp 0.125 and dt 0.031 s that predicts 20.7 % [inf, matches exactly].
  At 60 fps this is 12.5 % per frame, **time constant 125 ms**; 90 % of any scroll is reached ~290 ms after motion starts.
- No overshoot (exponential, monotonic) [obs].
- 390 px: Lenis is not synced to touch (`syncTouch` default false) so phones get native scroll [code, inf].

## 4. Motion table

| # | Effect | Target | Trigger | Duration | Delay | Easing | Values | Stagger | Measured |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Curtain page transition, exit** | `#curtain` clip, `#curtain-content`, `main`+`#webgl`, header | click on nav link to one of `/`, `/work`, `/about`, `/contact` (only these four are registered; reduced-motion skips it) [code] | 1.1 s (clip, content), 1.0 s (main), 0.6 s (header) | header at `<0.3` | GSAP `power3.inOut` (= quartic in-out) | clip `inset(100% 0 0 0)→inset(0%)`; content `translateY 100%→0`; main `y 0→-50vh, opacity 1→0`; header `y 0→-100%`; text lines x `k(i)%→k(i)-4%` with offsets `[34,14,8,22,10,26,20,12,28,16,4,24,…]` | rows alternate left/right direction | [obs] clip fit: quartic in-out, start +234 ms after click, **1090 ms**, RMSE 0.0034; main y fit 990 ms, RMSE 0.0041. 50 % of curtain at +775 ms. The +234 ms is the lazy GSAP import |
| 2 | **Curtain page transition, enter** | `#curtain-content` lifts away, `main` rises in | after route commit (2 rAFs) | 1.2 s (content, main), 0.9 s (text lines), 0.6 s (bg fade), 0.7 s (header) | lines `curtain-up+=0.2`, header `+=0.4` | power3.inOut; bg `expo.out`; header `expo.inOut` | content `y 0→-(100vh-151px)` (desktop) / `-240.5vw` (mobile); main `y 100vh→0, opacity 0→1`; lines `y 0→-200%` | — | [obs] route change at +1857 ms; main fit start +1903 ms, **1120 ms**, RMSE 0.016; `#curtain-content` final y -749 px = -(900-151) [obs]. Curtain hidden (`opacity 0`) at +3262 ms. **Click → settled ≈ 3.0 s** |
| 3 | Hero "peek" frame expands to full-bleed | home hero video frame `div.x7wzq59` | scroll position, `animation-timeline: scroll(root)`, range `0 → calc(100svh - var(--peek))` | scroll-linked (≈1 viewport of scroll) | — | linear (to scroll) | `clip-path: inset(0 calc(50% - 160px) calc(100% - 84px)) → inset(0)` i.e. a 320x84 slot opens to 1440x900 (390: 250x60) | — | [obs] keyframes from `getAnimations()`; frames `home1440_sheet.png` rows 5-6 show the video slot growing under the title |
| 4 | Project cards reveal on scroll (`/work`) | card media `div.x1n2onr6.x186iv6y` + caption clip `div.x78zum5…x1q0g3np` | scroll (JS, per frame) | ~383 px of scroll per card | — | linear in scroll | `scale 0.90→1.00`, `opacity 0→1`; caption `clip-path: inset(0 100% 0 0) → inset(0 0 0 0)` (wipe left→right) | per card, by position | [obs] opacity vs card top y: 0.023 @868 px, 0.23 @787, 0.50 @683, 0.79 @567, 1.0 @485 → linear, opacity = (868-y)/383; scale = 0.9 + 0.1·opacity exactly |
| 5 | Section clip reveal (home) | `div.x10l6tqk.x13vifvy.xh8yej3` (full-viewport panel) | scroll, JS | follows scroll (1.75 s in the capture) | — | follows Lenis | `clip-path: inset(100% 0 0) → inset(0)` (rises from bottom) | — | [obs] 76 writes, 99.8 % → 0 % between t=11756 and 13504 ms during slow scroll |
| 6 | Banner **marquee** | `div.x78zum5.xuxw1ft.xoww4n8` (3 copies, 2138 px each at 1440) | always on, velocity-coupled to scroll | continuous | — | linear | `translate3d(x,0,0)` | — | [obs] idle **100.0 px/s** at both 1440 and 390 (3.97 s windows); during scroll -305 px/s (down) and +112 px/s on `/about` (direction follows scroll). Paused with `setSpeed(0)` during transitions [code] |
| 7 | Header hide on scroll down | `header` | scroll direction | 350 ms | 0 | ease-out-quint (.23,1,.32,1) | `translateY(0) → translateY(-100%)` | — | [obs] CSSTransition in every page capture |
| 8 | Footer bar swap | two `footer` bars | scroll start / end of page | 300 ms | 0 | ease-out-quint | one `translateY(0)→100%, opacity 1→0`, other `100%→0, 0→1` | — | [obs] |
| 9 | Scroll indicator ticks | `span.xcrlgei…` | `scroll(root)` | scroll-linked | — | linear | `opacity 1→0, scaleY(1)→scaleY(0)` | — | [obs] |
| 10 | Animated favicon | `link[rel=icon]` | always | 500 ms per frame, 13 frames | — | step | SVG pattern cycles | — | [code] `setInterval(n,500)`, `o.slice(0,13)` |

WebGL canvas on `/work`: 1 OGL canvas 1440x900, fixed full-screen behind content [obs box]. Its look comes from shaders I did not
recover numerically [unk]. In `work1440_*.png` the canvas does not show as a separate layer at 2 fps [obs]; treat as unknown.

## 5. Page transitions (summary)
- Same-origin only, only to the 4 top-level routes, skipped when `prefers-reduced-motion: reduce` [code].
- Native View Transition root crossfade is shortened to 0.2 s and disabled (`animation:none`) when the transition type is
  `curtain`, so the GSAP curtain is the only visible motion [code].
- The text inside the curtain is the destination page name, typed into every line by TextPlugin (`text:i`) [code].
- Exit 1.1 s + route render ~0.6 s + enter 1.2 s ≈ **3.0 s click-to-settled** [obs]. Too long for a reel; the shape is the lesson.

## 6. Hover states [obs]
| Target | Property | Duration | Easing | Values |
|---|---|---|---|---|
| list rows / nav items | background-color, color | 150 ms | (.23,1,.32,1) | bg transparent → red; text red → black (inverts) |
| row label | transform | 150 ms | same | `translateX(0) → translateX(18px)` nudge |
| CTA buttons with arrow | bg, color, arrow transform | 200 ms | same | bg red → black, text black → red, arrow `translateX(0) → 18px` |
| contact list rows | border colours | 150 ms | same | dark red → red |
| developer links | opacity | 150 ms | same | 1 → 0.6 |
| harbor case CTA | background-color | 200 ms | `ease` | cream `rgb(244,240,231)` |

## 7. Spacing, grid, type, colour

**Grid** [obs `facts.grid`]
- 1440: **8 columns of 162 px, gutter 16 px, outer margin 16 px** (16·2 + 162·8 + 16·7 = 1440). Content row 1408 px.
- 390: **4 columns of 87.11 px, gutter 8.32 px**, margin 8.32 px.
- Mobile values are vw-scaled from a 375-wide design (8 × 390/375 = 8.32) [inf]; desktop is 1:1 at 1440 [inf].

**Spacing scale** (counts from 1440 home + work) [obs]
- `column-gap 16px` ×53 (home), `padding-left 16px` ×44, `8px` ×17; `padding-top 4/6/8px`; `margin-bottom 16, 24, 40, 120, 200px`.
- **Base unit 8 px** (4 px half-step); section spacing 120 / 200 px.

**Type** [obs]
| Role | Family | 1440 size/line | Weight | Tracking | Case |
|---|---|---|---|---|---|
| UI / body | `mono` (custom) | 14/16.8 (1.2) | 200 | -0.14 px (-0.01em) | uppercase |
| micro labels | mono | 10/12 | 200 | -0.1 px | uppercase |
| display | `therma` (condensed) | 200/160 (0.8) | 400 | -10 px (-0.05em) | uppercase |
| display 2 | therma | 120/96 (0.8) | 700 | -6 px (-0.05em) | uppercase |
| editorial | `sauce` | 86/86 | 400 | normal | none |
| 390 | mono 12.48/15.6, therma 104/83.2 and 74.88/59.9 | | | | |

**Radii**: effectively square; 2 px on case-study tags, 2.08 px at 390 [obs].
**Colour** [obs]: background `lab(0 0 0)` black; one accent for everything, `lab(49.9 73.4 57.0)` (signal red-orange); hover
inverts to black text on that red. Harbor case uses the client palette (`rgb(244,240,231)` cream, `rgb(141,231,201)` mint,
`rgb(143,146,137)` grey) [obs].

## 8. What to learn for calm, premium explainer motion (dermatologist reels / YouTube)

Worth learning
1. **One easing family per job.** All UI feedback uses one curve (out-quint `.23,1,.32,1`) at 150-350 ms; all big scene changes use
   one in-out curve (quartic in-out) at 1.0-1.2 s. In video: pick one out-curve for overlays/captions and one in-out for scene wipes.
2. **Exponential follow (lerp 0.125 @60 fps, tau 125 ms)** for any camera/pan that tracks a target: no overshoot, 90 % in ~0.3 s.
   Good model for a slow push-in that "catches up" to a pointer or highlight box on a skin image.
3. **Layered wipe instead of a cut**: a clip-path rising from the bottom (1.1 s) while the old scene drifts up 50 % and fades —
   a calm, directional scene change. For reels, compress to ~0.6-0.7 s.
4. **Reveal tied to position, not time**: card scale 0.90→1.00 with opacity 0→1 over a fixed travel. In video, tie the reveal of a
   before/after image to the move that brings it on screen so the two never fight.
5. **Strict grid**: 8 columns, 16 px gutters and margins, 8 px base. Use the same 8-unit grid for lower-thirds and callout placement.

Do not copy
- The 3 s curtain and the 100 px/s marquee: attention-seeking, wrong for medical calm.
- All-caps mono at weight 200 and the single saturated red: legibility and tone are wrong for a clinical audience.
- WebGL backgrounds and the animated favicon: novelty, no information.

## 9. REA
`rea analyze-javascript-application <abs>/darkroom.engineering/extracted --format json --max-heap-mb 4096 --analysis-timeout-ms 120000 --source-paths-json darkroom.engineering/rea-sources.json`
(23 files under 150 KB). Output `darkroom.engineering/js-analysis.json`, progress log `js-analysis.err`.
First run (all files under 260 KB) stalled more than 7 min in the React DOM chunk `41zknhdt_5ylv.js` (256 KB) despite the 300 s per-file budget; I stopped it and re-ran on the 23 files under 150 KB with `--analysis-timeout-ms 120000`. Result:
- Evidence `ev_e996ef275cce7256770a44f05ff932397dbbf8a57e1677f517ef3ddb03905102`
- `JavaScriptApplicationGraph` `jag_e3253496f0b60015370ad39302b727cf8c0dfa804d9d2c8736fcec6c61e75616`: 458 nodes (412 javascript-module, 25 asset, 5 endpoint, 7 artifact, 9 unknown), 524 edges, 23 files parsed, **0 parse failures**, 189,182 AST nodes, 460 findings, coverage `partial`.
- Semantic graph `jsrg_b699d30be4304ace481c875021861d7eb6eddacfc13e2b7015dfc98f34abd8c6` truncated at the 100,000-node cap (41,943 unknowns).
- Route inventory: `/`, `/about`, `/contact`, `/work` (navigation targets) = exactly the four routes the curtain transition registers (`H=["/","/work","/about","/contact"]` in `3x79abk8gxv4f.js`).
- REA does not name UI libraries; the library and parameter claims in sections 2-4 come from bundle text search (file@offset) and runtime capture, not from REA findings.
Evidence IDs used above are file@offset positions in the minified bundle (e.g. `3x79abk8gxv4f.js` timeline, `0r0w1d7khx_gp.js@9429` Lenis version).
