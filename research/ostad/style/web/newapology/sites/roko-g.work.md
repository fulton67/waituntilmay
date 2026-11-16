# roko-g.work: motion and spacing study

Study notes only. Nothing from this site ships: no code, CSS, fonts, images or copy.
Measured 2026-11-16 in headless Chromium (Playwright, chromium-1243). Linked from newapology.com. Roko Gabrilo's portfolio lists newapology-adjacent builds (for example `/project/george-davies`, `/project/march-2004`).
Labels: **[obs]** measured in a capture, **[code]** read from the shipped bundle, **[inf]** inferred, **[unk]** unknown.

Raw data:
- runtime captures: `sites/runtime/roko-g.work{,__gallery,__project__george-davies,__project__talgh}_{1440,390}.json` (8 files)
- session videos: `sites/runtime/video/roko-g.work*_{1440,390}.webm`
- per-frame route samples (my own rAF sampler, about 32 Hz headless): `C:\Users\naimj\AppData\Local\Temp\claude\2fbb7afbe3c780d0\10cbab37-ebe9-4db0-add6-d78bca54dcb6\scratchpad\roko_nav_1440.json` (home, then gallery, then project, then home; scratch, not kept)
- bundle: `sites/roko-g.work/extracted/` (3 HTML pages, 20 JS/CSS files, 677 KB plus 5 lazy chunks)
- frames: `sites/roko-g.work/frames/home1440_sheet_0-3.2s.png`, `home1440_preloader_crop_0.8-3.2s.png`, `home1440_hover_16.8-19.2s_10fps.png`, `home1440_hover_17-29s_2fps.png`

## 1. Pages captured

| Page | 1440 | 390 | docH 1440 / 390 | Notes |
|---|---|---|---|---|
| `/` (home: project list with full-screen hover preview) | yes | yes | 3464 / 844 | at 390 the list is an inner snap scroller (`scroll-snap-type: y mandatory`, height `100svh - 24px`) |
| `/gallery` (index grid) | yes | yes | 6353 / 13457 | 27 project links |
| `/project/george-davies` (case page) | yes | yes | 2053 / 2404 | |
| `/project/talgh` (case page) | yes | yes | 3492 / 3285 | |

There is no about route: "Info" opens an overlay inside the page (`.hZHEWW_info_overlay`).

## 2. Stack

| Item | Evidence |
|---|---|
| Next.js App Router built with Turbopack (`/_next/static/immutable/`), Sanity CMS (`8561cxs2.api.sanity.io`) | [code] HTML |
| framer-motion code is present in `3iux0o71djjr_.js` (714 KB) but **only inside Sanity UI** (toast variants, `@sanity` 19 refs). App code has no `motion.` components | [code] |
| **Absent from app code:** lenis, gsap, ScrollTrigger, three/WebGL, barba, swup, Swiper, SplitText | [code] grep |
| App motion = **CSS transitions and keyframes** plus **one rAF scroll-progress writer** (`36anso4f8j3k9.js`) | [code] |
| Runtime: `Element.animate` 0, **0 ScrollTimeline**, all `DocumentTimeline`; rAF 12-117 calls per page, all from the progress writer | [obs] |
| REA | section 9 |

One token for every curve [code], from the `:root` rule in `3vzxoz-nopyh9.css`:
```
--black #1c1c1c   --gray #e3e3e3   --bezier cubic-bezier(.35,.82,.165,1)
```
**Every** transition and keyframe on the site uses `--bezier` (the app CSS has no linear and no default `ease` transitions). Its maths [inf, solver]: the start is very steep (y1 0.82 is greater than x1 0.35); peak velocity at 18% of duration (2.97x linear); **50% of the value at 19% of the time, 90% at 41%, 99% at 73%**; the last 1% takes 25 of 90 frames on a 1.5 s move; no overshoot. Value at 10/25/50/75/90% of time: 0.25 / 0.68 / 0.95 / 0.99 / 0.999.

## 3. Motion table

| # | Effect | Target | Trigger | Duration | Delay | Easing | Values | Stagger | Measured |
|---|---|---|---|---|---|---|---|---|---|
| R1 | **Preloader clock hand** | `._3nGs4W_clock` (1x12 px white line, `transform-origin: 0 100%`) | first load | fade-in 350, rotate 700 x **2 iterations**, fade-out 350 | 400 / 550 / 1950 ms | `--bezier` | opacity 0 to 1; `rotate(0)` to `rotate(360deg)` twice; opacity to 0 | none | [obs] CSSAnimations in `_1440.json`; frames: the hand is visible at the top left in `home1440_preloader_crop_0.8-3.2s.png` |
| R2 | Preloader overlay out | `._3nGs4W_preloader_overlay` (white, 100vw x 120vh) | first load | 350 ms | 2000 ms | `--bezier` | opacity 1 to 0 | none | [obs] fit start 2274 ms, **rms 0.0014** over 14 frames: measured 0.717 of the fade at +94 ms, 0.958 at +190 ms |
| R3 | **Tick ruler appears** | 12 x `._3nGs4W_lines` (1x12 px white ticks, `mix-blend-mode: difference`) | first load | 350 ms | 1950 ms | `--bezier` | opacity 0 to 1 | all 12 together (no stagger) | [obs] |
| R4 | **Ruler width re-scale = page transition** | `._3nGs4W_lines_wrapper` (fixed, 12-column grid) | route change | **1500 ms** (750 ms below 550 px) | 0 | `--bezier` | width `--preloader-route-width`: home `calc(200% - 32px)` = **2848 px**, gallery `calc(400% - 90px)` = **5670 px**, project `calc(100% - 12px)` = **1428 px** at 1440; at 390: home 400%, gallery 600%, project 300% | none | [obs] home to gallery fit **rms 0.0056** over 49 frames (50.5% at +278 ms, 87% at +574 ms, 99.6% at +1217 ms); gallery to project rms 0.0205 |
| R5 | **Scroll-progress ruler** | same wrapper | native scroll (rAF-coalesced) | per frame, no easing | 0 | linear mapping | `translate3d(0, progress x wrapperHeight, 0)`, progress = `scrollY / (scrollHeight - innerHeight)`; `will-change: transform` set on move, cleared 200 ms after the last move | none | [obs] 1440 home: **+40.437 px per 120 px wheel step**, which is 120/2564 x 864 exactly; ends at 864 px (`_1440.json` writes 5520 to 9488 ms; `will-change: auto` 200 ms later, e.g. 5519.9 to 5720.1) [code `36anso4f8j3k9.js`] |
| R6 | Page content fade-in | `main.fade_in` / `.project_wrapper.fade_in` | route mount | 700 ms | 250 ms | `--bezier` | opacity 0 to 1 | none | [obs] gallery fit start 5837.5, **rms 0.0046**; it begins 248 ms after R4 starts (R4 start 5589.5), so the ruler moves first and the content follows a quarter-second later |
| R7 | **Hover: full-screen project preview** | `.NoU7wq_asset_wrapper` (fixed, inset 0) and `img.NoU7wq_asset` | `onMouseEnter` on a project link or URL [code] | wrapper 750 ms; image 1500 ms | 0 | `--bezier` | wrapper opacity 0 to 1; image opacity 0 to 1, **`filter: blur(16px)`**, `min-width` and `min-height` 115% (oversized, cover) | none | [obs] CSSTransitions at t=17558 in `_1440.json`; frames: a blurred full-bleed grey field fills the viewport at video 19.0 s (`home1440_hover_17-29s_2fps.png`, frame 5). The media content barely rendered in headless (7 `<video>` sources), so [unk] what the image looks like in a real browser |
| R8 | Hover: list focus | `.project_link`, `.project_url` | same | 350 ms | 0 | `--bezier` | hovered row turns white (on top of the preview) and its URL slides `translate(4px)`; every other row goes to opacity **0.5**; the service label fades in over 750 ms | none | [obs] keyframes `translate(0px)` to `translate(4px)`, opacity 1 to 0.5 |
| R9 | Gallery hover dim | `a._41Ed6G_asset_wrapper` | `:hover` | 350 ms | 0 | `--bezier` | opacity 1 to **0.33** on the hovered tile | none | [obs] `__gallery_1440.json` |
| R10 | Nav and info hover | header items, `.hZHEWW_sub_list > a` | `:hover` | 350 ms | 0 | `--bezier` | opacity to 0.5 (nav), or 0.33 plus `translate(4px)` (sub-list) | none | [obs+code] |
| R11 | Info overlay | `.hZHEWW_info_overlay` | click "Info" | 500 ms | 0 | `--bezier` | opacity 0 to 1 over `backdrop-filter: blur(24px)` and `#e3e3e380`; the label pill width animates max-width 34 px to 61 px | none | [code] (not clicked in the capture) |
| R12 | Image loader | `.loader` (1x14 px line) | media loading | 1000 ms, infinite; 2 iterations once loaded | 0 | `--bezier` | `rotate(0)` to `rotate(360deg)` | none | [obs] |
| R13 | Mobile index ticker | `.NoU7wq_index_value` | snap to item (390) | 350 ms | 0 | `--bezier` | opacity 0 to 1 with blur 1 px to 0 (a cross-fading number stack) | none | [code]; [obs] 390 writes come from R5 via the `home-mobile-scroll-progress` event |

## 4. Smooth scroll

**None** [obs]: native scroll, `scroll-behavior: auto`, no Lenis. The only scroll-linked motion is R5, which **follows the scroll with no lerp**: each wheel step moves the ruler on the next rAF (write latency is under one frame in `_1440.json`; for example writes at 5720.1 and 5738 come about 18 ms apart, consistent with one rAF per wheel tick). At 390 the home list is a snap container; my wheel driver produced small oscillations of the ruler (5.44 px to 1.74 px, repeating, in `_390.json`) because snap pulled each scroll back [obs]. That is an artefact of wheel-on-mobile emulation, not a feature.

## 5. Page transitions

There is no overlay or curtain after the first load. A route change does two things [obs, `roko_nav_1440.json`]:
1. **The tick ruler re-scales** (R4): 12 ticks spread across 200%, 400% or 100% of the viewport depending on the route, over 1.5 s on `--bezier`. Because the wrapper is wider than the screen on home and gallery, only some ticks are visible, and the tick spacing reads as a "zoom level" for each section. Visually this is a calm, measuring-tape zoom.
2. **The content fades in** after 250 ms (R6: 700 ms). The old page leaves instantly.

On first load there is a 2.35 s intro: white overlay, clock hand fades in at 400 ms and spins twice (550 to 1950 ms), ticks and content appear at 1950 ms, and the overlay fades out at 2000 to 2350 ms (R1-R3).

## 6. Hover states
See R7-R10. One rule throughout: **350 ms, `--bezier`, opacity 0.5 or 0.33 for the non-focused items, and a 4 px nudge on the focused item.** The only large hover is the home full-screen blurred preview (R7: 750 ms wrapper, 1500 ms image).

## 7. Spacing, grid and type tokens

- **Base unit 12 px; scale 1 / 4 / 8 / 12 / 24 / 36.8 / 48 / 96 / 128** [obs+code]. Most common: `gap: 12px` (32 elements on home at 1440), page padding 12 px, header pill padding `4px 8px`, **1 px gutters** between grid tiles (`gap: 1px`), 96 px between project rows on home (48 px below 550 px), and 128 px between gallery rows.
- **Grid** [obs]: everything sits on **12 columns** at both widths.
  - home 1440: 12 x 117.08 px with a 1 px gap and 12 px padding; the project list occupies columns **9-13** (columns 5-13 below 1000 px, full width below 550 px) [code];
  - gallery: `gap: 128px 1px`, each item spans 4 columns (3 per row) at 1440, 2 above 3250 px, 6 below 1000 px, 12 below 430 px;
  - project page: asset container of 10 columns x 117.09 px with a 1 px gap inside a 12-column wrapper (1180 px);
  - the info overlay content is 12 x 116 px.
- **Type** [obs]: two families, one size. **Oracle 14 px / 16.8 px (1.2), weight 400** for names, and **Fragment Mono 14 px uppercase, letter-spacing -0.21 px (-0.015em)** for URLs and labels. Size is `clamp(12px, 2vw, 14px)`, so 12 px / 14.4 px at 390. Gallery captions use line-height 90%.
- **Colour**: #ffffff page, #1c1c1c ink, #e3e3e3 at 50% alpha (`#e3e3e380`) for glass pills with `backdrop-filter: blur(12px)` (header) or `24px` (overlay); white ticks with `mix-blend-mode: difference` [code].
- **Radius**: none (0 border-radius rules in the app CSS) [code].
- Header: fixed at the **bottom**, 12 px from the edges, three glass pills separated by 1 px gaps [code].

## 8. Signature numbers

| Token | Value |
|---|---|
| curve | `cubic-bezier(.35,.82,.165,1)`, used for everything |
| micro (hover, dim, nudge) | 350 ms |
| overlay or preview in | 500-750 ms |
| content in | 700 ms after a 250 ms delay |
| big spatial move (ruler zoom) | 1500 ms (750 ms on mobile) |
| dim levels | 0.5 (list) and 0.33 (tiles) |
| nudge | 4 px |

## 9. REA

- **Whole tree**, `rea analyze-javascript-application <extracted> --format json --max-heap-mb 4096 --analysis-timeout-ms 400000`: it returned `provider_timeout` on the 400 s per-source deadline (React DOM chunk `28ptyt0gbzms2.js`), and the partial observation went to `sites/roko-g.work/rea.json` (162 MB, error envelope). A first try with `--detail summary` was refused because it needs `--evidence_output`.
- **App-owned chunks only** (`0drzm2mmr-8vf.js`, `1x5vyslem5vg8.js` home list and preview, `36anso4f8j3k9.js` ruler and scroll progress), written to `sites/roko-g.work/rea_app.json`:
  - Evidence `ev_7dfb8e3329fe3b6735710aa72def05a1624a656da035f5cdca635724c3cd9689`
  - graph `jag_509b674f5b9eb69bd04ad5ffc17c201712b2361a86fb868b617f0acadb12228a`
  - 67 nodes and 74 edges (27 module, 17 asset, 16 unknown, 4 endpoint, 3 artifact)
  - 3 files parsed, **0 parse failures**, 22,383 AST nodes, 36 findings; coverage `partial` because I left 16 files out of scope
  - Endpoints: only `/_next/image` and the `dpl` candidate.
- Motion parameters come from grep of these chunks: the ruler writer (`translate3d(0, ${i*o}px, 0)`, threshold 0.001, `will-change` cleared after 200 ms, `ResizeObserver`, custom event `home-mobile-scroll-progress`), the `onMouseEnter`-driven `activateProject`, and the CSS.

## 10. For a dermatologist's explainer videos and reels

**Worth learning**
1. **One curve, four durations.** The whole site runs on `cubic-bezier(.35,.82,.165,1)` at 350 / 700 / 750 / 1500 ms. It covers half the distance in the first 19% of the time, then glides for a long time. On screen this reads as "arrives decisively, settles gently", which is ideal for calm medical graphics (labels, arrows, callout boxes). Make it the single brand-bible easing and vary only duration.
2. **The measuring ruler as a section transition** (R4). A row of thin ticks that re-spaces (zooms) between chapters is a literal, on-brand metaphor for dermatology: scale, millimetres, lesion size. Use a 1.5 s re-scale on the curve above, then fade content in 250 ms later (R6). Here that ordering is "structure moves, then content appears".
3. **Scroll or progress ruler with no lag** (R5). A tick bar that tracks video progress 1:1 gives viewers a quiet chapter indicator with no bounce.
4. **Focus by dimming plus a 4 px nudge** (R8-R10). Siblings drop to 0.5 or 0.33 and the subject shifts 4 px. This is a minimal way to point at one item in a list of treatments.
5. **Glass pills** (`#e3e3e3` at 50% with 12 px backdrop blur) for lower-thirds over clinic footage.

**Do not copy**
- The 2.35 s preloader with a spinning hand: in a reel the first 2 s must carry content.
- A full-screen **16 px blur** preview behind text: over skin imagery it would hide exactly the detail being explained.
- 14 px single-size type and `mix-blend-mode: difference` ticks: illegible on phones and unpredictable over skin tones.

## 11. Unknowns
- [unk] What the hover preview media look like in a real GPU browser; headless frames show only a blurred grey field.
- [unk] The info overlay and the mobile index ticker were not exercised (they need a click or a touch snap).
- [inf] Route-transition timings were measured at about 32 Hz rAF in headless; the fit residuals (rms 0.005-0.02) suggest real 60 Hz playback matches the declared CSS exactly.
