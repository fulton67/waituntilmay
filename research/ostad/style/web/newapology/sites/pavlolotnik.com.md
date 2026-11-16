# pavlolotnik.com — motion and spacing study

Study notes only. No code, CSS, font, image or copy from this site goes into any build.
Measured 2026-11-16, headless Chromium (Playwright, chromium-1243). Linked from newapology.com
(the biography page links back to newapology.com, so this is a collaborator/client build).

Legend: **[O]** observed in a capture, **[C]** read from the shipped bundle (code), **[I]** inferred, **[U]** unknown.

Caveat on timing resolution: headless rAF ran at ~32 Hz (frame interval 30-32 ms in every log), so
curves are sampled every ~31 ms. Fits below are against that sampling.

## 1. Pages captured

The SPA has exactly three routes in its router table [C: `path:"/"`, `path:"/archive"`, `path:"/biography"` in `extracted/assets/index-B3BzGue_.js`]. There are no per-project URLs; a project opens in place on /archive.

| Page type | URL | 1440 | 390 |
|---|---|---|---|
| Home (single random image) | `/` | `runtime/pavlolotnik.com_1440.json` | `runtime/pavlolotnik.com_390.json` |
| Index / archive grid (projects open in place) | `/archive` | `runtime/pavlolotnik.com__archive_1440.json` | `runtime/pavlolotnik.com__archive_390.json` |
| About | `/biography` | `runtime/pavlolotnik.com__biography_1440.json` | `runtime/pavlolotnik.com__biography_390.json` |

Extra probes (my own script `scratchpad/probe/probe.mjs`, same instrumentation plus per-frame `scrollY`, wheel log, and a click):
- `pavlolotnik.com/probe/archive_1440.json` (+ video `probe/video/652ccbfc7d6b3ce47873ede9318019ec.webm`): 1 wheel tick, 5 fast ticks, click first project.
- `pavlolotnik.com/probe/home_1440.json` (+ video `probe/video/7faee5c6078cb2371e4a5c33561ad365.webm`): wheel, click home image.

Frames: `pavlolotnik.com/frames/home_preloader_1.2-3.6s_10fps_tile.png` (24 frames, 100 ms apart, read left-to-right, top-to-bottom), `frames/archive_click_13.8-16.8s_8fps_tile.png`.

## 2. Stack

Bundle: Vite build, one entry `assets/index-B3BzGue_.js` (480,755 B) + CSS `assets/index-ClNotBpI.css` (16,863 B) + 3 lazy chunks (`locomotive-scroll.modern-CTDqJNMM.js` 32,429 B, `browser-2A7KVxhv.js`, `stegaEncodeSourceMap-BXdjU4hP.js`). All in `pavlolotnik.com/extracted/`.

REA: `rea analyze-javascript-application <extracted> --detail summary` → `pavlolotnik.com/js-analysis.json`, evidence bundle `pavlolotnik.com/rea-evidence` (see section 9 for its status). Library identification below is from string search of the same files.

| Library | Evidence | Role |
|---|---|---|
| React + react-router | `useNavigate` x2, route table above [C] | SPA |
| **GSAP 3 core** (+ ScrollTrigger code present, 6 refs; `matchMedia` used) | 70 `gsap` refs; `ie=hn.registerPlugin(...)`; `ie.to/ie.timeline` app calls [C] | every app animation (preloader, staggers, zoom) |
| **Locomotive Scroll v5** (wraps **Lenis**) | lazy `import("./locomotive-scroll.modern-...js")`; config `new r({lenisOptions:{smooth:!0,duration:1,multiplier:1,lerp:.15,smoothWheel:!0,wheelMultiplier:1}})` [C] | smooth wheel scroll |
| **framer-motion** (motion) | `B0=...kI.div,{initial:"initial",animate:"in",exit:"out",variants:RI,transition:{type:"tween",duration:1}}`, `RI={initial:{opacity:0},in:{opacity:1},out:{opacity:0}}`, `LayoutGroup` x3, motion's `F0` easing table [C] | route enter/exit fade |
| Sanity client | `pavellotnik.api.sanity.io` preconnect, 11 `sanity` refs [C] | CMS |
| Absent | three/OGL/WebGL shaders, Barba/Swup, Swiper, SplitText: 0 refs [C] | |

GSAP constants: `hi={preloaderDelayTime:1.5,preloaderPlayTime:.9,easing:"power3.out"}` [C].
Anchor scroll: `scrollTo(i,{duration:2e3,easing:VA})` where `VA` is easeInOutExpo (`2^(20t-10)/2`) [C] — 2 s.

## 3. Motion table

| # | Effect | Target | Trigger | Duration | Delay | Easing | Values | Stagger | Measured |
|---|---|---|---|---|---|---|---|---|---|
| M1 | **Preloader split** | two wordmarks (EN upright, UA mirrored) start stacked at centre, travel to top and bottom edges | load | **900 ms** [C+O] | 1.5 s after mount [C] | **power3.out** = 1-(1-x)^4 [C+O] | `top` 410 px → 0 (EN, 1440) [O] | both move together, 0 ms | fit rmse **0.44 px**, t0 = 1728 ms page time (`runtime/pavlolotnik.com_1440.json`, el `a.logo.logo--en.active`). 50 % of travel at 143 ms, 90 % at 395 ms, 99 % at 618 ms; peak velocity at frame 0 (pure ease-out, no overshoot). At 390 the timeline also moves `left` to 16 px (second tween) [C]. Frames: tile cells 1-12 show the split, cells 13+ static with nav. |
| M2 | Swap to static logo | `a.logo` → `a.logo--static` | M1 onComplete | 0 (hard swap) | — | — | opacity 0 / 1 | — | t = 2645 ms [O] |
| M3 | Credits/nav fade | `div.credits` | after M2 | **200 ms** [C `ie.to(e.current,{opacity:1,duration:.2})`] | 0 | GSAP default **power1.out** [O: 0.286 at 31 ms, 0.524 at 62 ms = 1-(1-x)^2 exactly] | 0 → 1 | — | 2645-2863 ms |
| M4 | **Route enter fade** | page wrapper `div` | route mount | **1000 ms** [C+O] | 0 | `ease-out` (WAAPI, framer-motion tween default) [O: Element.animate log] | opacity 0 → 1; exit 1 → 0 [C] | — | starts 2680 ms on every page (`runtime/*_1440.json` → `runtime.animate[0]`) |
| M5 | **Archive grid stagger** | 30+ `.project` thumbnails | data loaded | **1000 ms** each [C] | `i * 0.09 s` [C] | power1.out [O: 0.4375 at x=.25 → 1-(.75)^2] | opacity 0 → 1 | **90 ms** [O: start times 3130, 3220, 3317, 3411, 3505, 3600 ms …] | `runtime/pavlolotnik.com__archive_1440.json`, 983 writes on `div.project`. 30 items → last starts at ~2.7 s, whole wave ~3.7 s. |
| M6 | **Thumbnail zoom-to-stage** (open project) | clicked `.project img` | click | **500 ms** [C+O] | 0 | GSAP default power1.out [O] | `scale` 1 → **4.1** (landscape; 3.1 portrait) [C `E=O.width>O.height?4.1:3.1`], `transform-origin: top`, `y:-top`, `x` = centre + `gsap.utils.random(0, innerWidth - w*E)` [C]; z-index 99 | — | probe `archive_1440.json`: scale 1.6994 @13389.6, 2.3376 @13451.9, 3.0999 @13545.6, 3.6524 @13639.1, 3.9857 @13733.1, 4.0999 @13826.5 → t0 ≈ 13330, end ≈ 13830 ms. Close: reverse to scale 1 in 500 ms [C]. Then the gallery image fades in 1000 ms CSS `ease` (`img.project__photo_container.visible`, 17821 ms) [O]. |
| M7 | Home image | `img.homepage__img` | load + each click | **1000 ms** CSS `transition: opacity 1s` | 0 | `ease` | opacity 0 → 1; each new image pinned to a random edge (left/right with top `random(0,150)`, or top/bottom with left `random(0, vw-w)`) [C] | — | three clicks in probe: left 549.7 / bottom 0 → right 0 / top 139.9 → top 0 / left 449.7 [O] |
| M8 | Biography fade | `.biography__uk`, `.biography__en` | mount / language switch | **4000 ms** [C] | 0 | power1.out [O: fit rmse 0.0001] | opacity 0 → 1 | — | `runtime/pavlolotnik.com__biography_1440.json`, 128 writes 2693-6661 ms |
| M9 | Menu language flip | `.menu` / `.menu--switch` | language toggle | 1000 ms | 0 | CSS `ease` | transform [C css] | — | not triggered [U for values] |

## 4. Smooth scroll

Locomotive Scroll v5 → Lenis, `lerp: 0.15`, `smoothWheel: true`, `wheelMultiplier: 1` [C].
Measured on /archive at 1440 (probe `archive_1440.json`, `frames` array):
- One 120 px wheel tick: remaining distance 89 → 68 → 51 → 39 → 29 → 22 → 17 → 13 → 10 px on successive frames.
  Per-frame catch-up 0.24 at a 31 ms frame; as a rate, **λ ≈ 9.0 /s** (mean of 9 frames, 8.2-10.1) = `lerp 0.15 × 60`, i.e. Lenis' frame-rate-independent damping.
- So the lag is exponential with time constant **≈ 111 ms**: 50 % of a tick at ~77 ms, 90 % at ~256 ms, 99 % at ~510 ms, last pixel at ~800 ms (6045 → 6827 ms).
- Five ticks 16 ms apart (600 px) settle at 8827 ms, 1.19 s after the last tick, with the same λ ≈ 9 /s tail.
- /home and /biography do not scroll (`docH` = viewport: 900 / 844) [O]. At 390 the archive `docH` is 844 because Locomotive scrolls a wrapper [O, I].

## 5. Page transitions
framer-motion wrapper: opacity 0 → 1 over 1000 ms `ease-out` on enter, 1 → 0 on exit [C+O M4]. No overlay, no clip, no Barba/Swup. Exit duration [C] same 1 s tween; not measured [U].

## 6. Hover states (all CSS, 1440)
- Nav and menu links: `color` `#c8c8c8` → `#7a7a7a` (on bio: `#f7f9f1` → `#7a7a7a`), **300 ms `ease`** [O `color@div.navigation__link`, `color@a.menu_part__link`].
- Archive project caption `.project__info`: opacity 0 → 1, **300 ms `ease`** on hover; leaving interrupts and reverses (observed 161 ms reverse from 0.538) [O].
- Credits `transition: .1s` [C css].
- No scale, no cursor follower, no magnetic effects [O: no transform writes during hover].

## 7. Spacing, grid, type, colour

**Fluid root.** `html,body{font-size:1.0582vw}` (16 px at a 1512 px design width), `≤820px: 1.9512vw` (16 px at 820), `≤600px: 4.07vw` (16 px at 393) [C css]. Everything is in rem, so all spacing scales with viewport. At 1440, 1 rem = 15.24 px; at 390, 1 rem = 15.87 px. This explains every odd computed value: 19.0476 = 1.25 rem, 3.8095 = .25 rem, 78.095 = 5.125 rem, 80 = 5.25 rem [O+I].

| Token | 1440 computed | rem (design px) |
|---|---|---|
| Base gap | 19.05 px | 1.25 rem (20) — most frequent rem value in CSS (8x) [C] |
| Small gap | 3.81 px | .25 rem (4) |
| Page side padding | 40 px | (px) [O paddingLeft 40] |
| Top padding | 15 px | (px) |
| Archive grid | **6 columns × 161.6 px, column gap 78.1 px, row gap 80 px** [O grid] | 5.125 / 5.25 rem |
| Archive grid at 390 | **3 columns × 99.7 px, gaps 23.8 / 25.4 px**, side padding 20 px [O] | 1.5 / 1.6 rem |
| Bio top padding | 304.8 px (1440) / 137.9 px (390) | 20 rem / ~8.7 rem |

Type [O]: one family, **ktf-metro** (KTF Metro Roman, Kyiv Type Foundry), weight 400 only, letter-spacing normal.
Sizes at 1440: 14/14 (logo), 10/normal (UI, captions), 7.6 (small index); at 390: 11.5, 9.5, 7.5. Line-height 1.0 for display. No uppercase transform in CSS (wordmark set in caps).
Colour [C css counts]: text `#373737`, UI grey `#c8c8c8`, hover grey `#7a7a7a`, bio background `#8d8e8b` with `#f7f9f1` text, white page. Radius: only `50%` (one round element); everything else square [C].
Fixed elements: `.menu` only [O]. No sticky.

## 8. What to learn for calm, premium motion in dermatology explainers and reels

Worth learning:
1. **The preloader split (M1): one gesture, 900 ms, power3.out, after a 1.5 s hold.** A centred title that separates to the frame edges is a clean open for an explainer: hold still ~1.5 s (let the viewer read), then 0.9 s ease-out with 90 % of the move done by 0.4 s. As a reel rule: *a title moves once, quickly at the start, then settles for over half its duration.*
2. **A 90 ms stagger on 1 s fades (M5).** Long fade, short offset makes a grid of before/after thumbnails or ingredient icons arrive as a wave, never a pop. Cap the item count so the wave stays under ~1.5 s (they let it run 3.7 s for 30 items, which is too long for video).
3. **Zoom-to-stage (M6): the clicked thumbnail itself scales up to fill the stage in 500 ms from a top origin.** In video: push into a condition photo from its spot in a grid instead of cutting. Keep the anchor (top) fixed so the eye does not lose it.
4. **Exponential lag (Lenis λ ≈ 9 /s, τ ≈ 111 ms).** For camera pans and follow-moves in After Effects or Remotion, a first-order lag with τ ≈ 110 ms feels "expensive" and never overshoots.
5. **Long, quiet text fades (4 s power1.out on the bio).** Good for a doctor's credentials or a disclaimer card: it is fully readable by ~1.5 s while still easing.
6. **Two-speed system:** 300 ms for small UI feedback, 1 s for content arriving. Two numbers is enough for a brand bible.

Do not copy:
- The random placement of images (M7) and the random x offset in the zoom: playful for a photographer, wrong for clinical clarity.
- The mirrored Cyrillic wordmark gag and the 7.5-10 px type: illegible on a phone reel.
- A 3.7 s grid wave: in video, anything over ~1.5 s of staggered entry reads as slow.

## 9. REA status and evidence
- Whole-tree run (`--detail summary --max-heap-mb 4096 --analysis-timeout-ms 600000`) **failed (exit 1, empty output)** while in the static phase on `index-B3BzGue_.js` (480 KB: React + GSAP + ScrollTrigger + framer-motion + app in one chunk). Progress log: `pavlolotnik.com/js-analysis-full.err`.
- Re-run on the three lazy chunks (`rea-sources.json`) completed: Evidence **`ev_84027339639168a838ece12cf15733ae172e62153b6b47f668f183a1a1de4f5e`**, bundle `pavlolotnik.com/rea-evidence-chunks`, output `pavlolotnik.com/js-analysis.json`: 3 files parsed, 0 parse failures, 14,852 AST nodes, 19 findings, coverage partial. It confirms the Locomotive v5 module (which constructs Lenis with the `lenisOptions` passed in) as a separate chunk loaded by dynamic import.
- Every library claim in section 2 and every GSAP/Lenis/motion parameter is therefore from direct text search of the minified entry chunk [C], cross-checked against runtime curves [O]. No source maps (no `sourceMappingURL` in any file).
