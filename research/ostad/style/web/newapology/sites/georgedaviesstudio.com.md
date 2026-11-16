# georgedaviesstudio.com: motion and spacing study

Study notes only. Nothing from this site ships: no code, CSS, fonts, images or copy.
Measured 2026-11-16 in headless Chromium (Playwright, chromium-1243). Linked from newapology.com.
Labels: **[obs]** measured in a capture, **[code]** read from the shipped bundle, **[inf]** inferred, **[unk]** unknown.

Raw data:
- runtime captures: `sites/runtime/georgedaviesstudio.com{,__catalog,__commissions,__information}_{1440,390}.json` (8 files)
- session videos: `sites/runtime/video/georgedaviesstudio.com*_{1440,390}.webm`
- per-frame route-transition samples (my own rAF sampler, ~32 Hz in headless): `C:\Users\naimj\AppData\Local\Temp\claude\2fbb7afbe3c780d0\10cbab37-ebe9-4db0-add6-d78bca54dcb6\scratchpad\gds_nav_1440.json`, `...\gds_nav_390.json` (scratch, not kept in the repo)
- bundle: `sites/georgedaviesstudio.com/extracted/` (5 HTML pages, 20 JS/CSS files, 929 KB)
- frames: `sites/georgedaviesstudio.com/frames/home1440_sheet_0-6.4s.png`, `home1440_sheet_6.4-12.8s.png`, `home1440_slide_4.4-6.8s_10fps.png`

## 1. Pages captured

| Page | 1440 | 390 | docH | Notes |
|---|---|---|---|---|
| `/` (home, which is a preloader slideshow) | yes | yes | 900 / 844 | 5 full-bleed photos, no page scroll |
| `/commissions` (project carousel) | yes | yes | 900 / 844 | Swiper, horizontal at 1440 and vertical at 390 |
| `/catalog` (index grid and product detail) | yes (second run; the first timed out) | yes | 1488 / 844 | inner scroll container with `scroll-snap-type: y mandatory` |
| `/information` (about) | yes | yes | 900 / 844 | 3 centred text blocks |

The site has only these 4 routes. The nav links are `/catalog`, `/commissions` and `/information`. Catalog items open in place (no item URL).

## 2. Stack

| Item | Evidence |
|---|---|
| Next.js App Router built with Turbopack (`turbopack-0t-5c2a6rbzp5.js`, `self.__next_f`) | [code] HTML |
| Contentful CMS (`images.ctfassets.net`), `next/image` | [code] HTML |
| **Swiper** with the `Mousewheel` module (414 `swiper` refs) | [code] `0pz45zq9lnyek.js`, `0rw3i-6fjla7w.js` |
| `react-intersection-observer` style hook (thresholds 0.66 and 0.85) | [code] `0pz45zq9lnyek.js` |
| **Absent (0 hits in the whole bundle):** lenis, gsap, ScrollTrigger, framer-motion, three/WebGL, barba, swup, locomotive, SplitText | [code] grep across `extracted/_next` |
| `startViewTransition` (1 hit) is React DOM internals, not app code | [code] `0yoi6g0rt32bk.js` |
| Runtime: `Element.animate` 0 calls, rAF 0-1 calls per page, **0 ScrollTimeline**, all animations on `DocumentTimeline` | [obs] all 8 captures |
| REA static analysis | see section 9 |

All motion is **CSS transitions and keyframes plus Swiper's CSS-transition carousel**. No JS tweening and no smooth scroll.

Design tokens [code], from the `:root` rule in `0n7at05bu-kd4.css`:
```
--white #f7f7f7  --black #292929  --gray #bebebe  --light_gray #ebebeb
--link_duration .35s
--easing   cubic-bezier(.66,.33,0,1)    (links, hovers, image dimming)
--easing_2 cubic-bezier(.33,.15,.15,1)  (fade-ins)
```
The code also has two inline curves: `cubic-bezier(.5,0,.15,1)` for slides, carousel and index width, and `cubic-bezier(.35,0,.15,1)` for the header's travel.

## 3. Easing curves, computed

From my numeric solver ([inf], exact maths on the declared curves):

| Curve | Used for | Peak velocity at | 50% of the value at | 99% at | Overshoot |
|---|---|---|---|---|---|
| `.5,0,.15,1` | slides 1.5 s, carousel 1.0 s | 34% of duration (3.3x linear) | 37% of duration | 86% | none |
| `.35,0,.15,1` | header travel 1.0 s | 26% (2.9x) | 31% | 86% | none |
| `.33,.15,.15,1` (`--easing_2`) | fades 1.0 s | 23% (2.8x) | 28% | 85% | none |
| `.66,.33,0,1` (`--easing`) | hover 0.35 s, dimming 0.5 s | 36% (5.75x) | 35% | 81% | none |

Every curve is a **soft-in, long-tail ease-out with no overshoot**, and the last 1% of travel takes 8-12 of 60 frames.

## 4. Motion table

| # | Effect | Target | Trigger | Duration | Delay | Easing | Values | Stagger | Measured |
|---|---|---|---|---|---|---|---|---|---|
| M1 | **Home slideshow push-up** | `.preloader_img_wrapper` x5 (stacked 100vh panels) | `setInterval(5000)` [code `0peuz5xhzwkrk.js`] | 1500 ms | 0 | `.5,0,.15,1` | `translateY(0)` to `-100%`, then `-200%` ... `-400%`; after the last slide `router.push("/commissions")`; a click anywhere skips to it; wheel and touchmove are `preventDefault`ed | none (all 5 panels move together) | [obs] writes at t=5214, 10217, 15220, 20233 ms (intervals of 5003, 5003, 5012 ms) in `_1440.json`; frames: the new image rises from the bottom edge at video 6.0 s, is about 50% up by 6.6 s, and settles by about 7.0 s (`home1440_slide_4.4-6.8s_10fps.png`) |
| M2 | Home photo fade-in-out | `img.preloader_img_tag` | load | 4000 ms | 1250 ms | per keyframe `--easing_2` | opacity 0 at 0%, 1 at 20%, back to 0 at 100% | none | [obs] CSSAnimation in `_1440.json` |
| M3 | Home wrapper fade-in | `main.preloader_wrapper` | load | 1000 ms | 500 ms | `--easing_2` | opacity 0 to 1 | none | [obs] per-frame fit start 570 ms, **rms 0.0007** over 36 frames (`gds_nav_1440.json`) |
| M4 | **Header travels between routes** | `header` (fixed, centred) | route change | 1000 ms | 0 | `.35,0,.15,1` | `top` 48 px on commissions, `calc(100% - 64px)` (y=836 at 1440, 806 at 390) on catalog, y=320 at 1440 (292 at 390) on information | none | [obs] fits: commissions to catalog rms **0.0010**, catalog to information rms **0.0002**, 390 rms 0.0006 |
| M5 | Header fade-in on leaving home | `header` | route change | 250 ms | 0 | `--easing_2` | opacity 0 to 1 (hidden on home via `.home_active`) | none | [obs] rms 0.012 |
| M6 | **Page content cascade** | commissions: `.index_wrapper` at 0, `.img_title_wrapper` at 150 ms, index `span`s at 750 ms, `.hide_btn` at 1250 ms; catalog: `.single_wrapper` at 150, `h1` at 750; information: 3 `div`s at 600/650/700 | route mount | 1000 ms each | listed | `--easing_2` | opacity 0 to 1 only (no movement) | 150 / 600 / 500 ms tiers; on information **50 ms** | [obs] index_wrapper fit start 5727 (rms 0.0010); img_title_wrapper start 5877, i.e. **+150 ms** (rms 0.0006) |
| M7 | **Carousel step** (commissions) | `.swiper-wrapper` | wheel (1 gesture = 1 slide), drag, click | 1000 ms (`speed: 1e3`) | 0 | `.5,0,.15,1` (CSS `!important` on `.swiper-wrapper`) | translate3d x step of **954.5 px** = slide 676.1 + gap 278.4 (`spaceBetween: "20%"`, `slidesPerView: 1.75`, `centeredSlides`) | none | [obs] writes at 5112.5 (start), 6112.9 (end), next wheel accepted at 6172.9, i.e. **60 ms after the previous one settles**; 0 ms lag from wheel to start |
| M8 | Active slide focus | `img.commissions img` | slide change | 500 ms | 0 | `--easing` | inactive images opacity 0.33, active 1; title opacity 0 to 1 with **1000 ms delay** (500 at 390) | none | [obs] CSSTransition in `__commissions_1440.json` |
| M9 | Catalog in-view reveal | `img.img_single` and `h1 > span` | IntersectionObserver `threshold: 0.66`, not `triggerOnce` | img 750 ms; caption 1000 ms after a 500 ms delay | listed | `--easing_2` | img opacity 0.15 to 1; caption opacity 0 to 1 | caption trails the image by 500 ms | [obs] `ioOpts` `{"threshold":0.66}`; transitions in `__catalog_1440.json` |
| M10 | Index pill expand | `.indexes` (max-width 208 px) | click "..." | 1000 ms | 0 | `.5,0,.15,1` | max-width grows | none | [code] CSS only, not triggered in capture |
| M11 | Loader blink | `.loader > svg` | image loading | 1500 ms, infinite | 0 | linear | opacity 0 to 1 to 0 | none | [obs] |
| M12 | Loader out | `.loader` | image loaded | 250 ms | 0 | linear | opacity 1 to 0 | none | [obs] |
| M13 | Mobile slide height | `.swiper-slide` (390) | slide change | 500 ms | 0 | `--easing_2` | height and margin-top | none | [obs] `__commissions_390.json` |

## 5. Smooth scroll

**None** [obs]. `scroll-behavior: auto` on html. There is no Lenis or any rAF scroller (rAF 0-1 calls per page). The site avoids page scrolling entirely:
- home and commissions are 100vh with no document scroll (docH equals the viewport);
- catalog scrolls an inner `.catalog_wrapper` with `scroll-snap-type: y mandatory`, `scroll-padding-top: 48px` and `gap: 128px` [code]. My wheel driver ran 68 s without reaching the document bottom because the document itself does not scroll (`marks` scroll_start 5141, scroll_end 73458);
- the carousel moves in **discrete 1000 ms steps**, one per wheel gesture, so there is no lerp to measure. Lag from wheel to motion is 0 ms; the next gesture is accepted about 60 ms after the transition ends [obs].

## 6. Page transitions

There is no overlay or curtain. A route change does three things at once [obs]:
1. the fixed **header glides** to its new position for that route (M4: 1000 ms, `.35,0,.15,1`);
2. the new page **fades its blocks in by tier** (M6: 1000 ms, delays of 0/150/750 ms);
3. the old page is replaced instantly, with no exit animation [obs: on information the old content is simply gone at the first frame of the new route].

## 7. Hover states

| Target | Change | Duration / easing |
|---|---|---|
| any `a` | colour #292929 to #bebebe (gray) | 350 ms `--easing` [obs] |
| active nav item | stays black on hover | same |
| catalog card | image opacity 0.15 to 1, caption colour change; the duration drops to 350 ms while hovered | [code] |
| catalog detail image | **image `filter: blur(2px)`** and a tag SVG fades in at opacity 1 over 500 ms | [code] |

Nothing moves on hover; only colour, opacity and blur change.

## 8. Spacing, grid and type tokens

- **Base unit 12 px; scale 4 / 12 / 24 / 48 / 64 / 128 / 192 / 256** [obs+code]. Most common: `gap: 12px` (20-21 elements on catalog), 24 px side padding (`padding-left: 24px` on header, info and commissions), 48 px catalog padding and header top, and 128 px between catalog groups and grid columns at 1440.
- **Grid** [obs]: catalog at 1440 is `repeat(5, 1fr)` with `gap: 128px` in a 1344 px box (5 x 166.4 px columns). Below 1440 it is 4 columns, below 1152 the gap is 64 px, below 800 it is 3 columns. At 390: 3 x 98 px columns, gap 24 px, inner image gap 6 px.
- **Carousel geometry at 1440** [obs]: slide 676.1 px (1.75 per view), 278.4 px gap (20%), active slide 541 px tall against 416-422 px for the others.
- **Type** [obs]: a single size. Waldenburg Buch **12 px / 14.4 px (1.2), weight 400, normal tracking**, everywhere, in #292929 or #bebebe. No headings at a larger size.
- **Radius**: 2 px (inquire button) and 50% (dot) [code].
- **Colour**: #f7f7f7 background, #292929 ink, #bebebe secondary, #ebebeb button fill [code].
- At 390 the header is 396.9 px wide in a 390 px viewport (x = -3.4) [obs]: a small overflow.

## 9. REA

- **Whole tree**, `rea analyze-javascript-application <extracted> --format json --max-heap-mb 4096 --analysis-timeout-ms 400000`: it spent more than 15 min in the React DOM chunk `0yoi6g0rt32bk.js` (log `rea.err`, last phase `javascript_worker_static`) and was stopped, so it produced no result. A first try with `--detail summary` was refused because summary output needs `--evidence_output`.
- **App-owned chunks only** (`--source-paths-json` with `0peuz5xhzwkrk.js` home, `0pz45zq9lnyek.js` catalog, `0rw3i-6fjla7w.js` commissions, `0dqszi-5_ccos.js` header), written to `sites/georgedaviesstudio.com/rea_app.json`:
  - Evidence `ev_d6209553d9594f9a6174a8ddba8e0a23b3982d4d41618dc815fde0dc50cf97fb`
  - graph `jag_23f41cef60b24bba7a1278d7bf87a1f21662df2bc622321cf2b529dff0d51a40`
  - 87 nodes and 100 edges (46 module, 15 asset, 15 unknown, 6 endpoint, 5 artifact)
  - 4 files parsed, **0 parse failures**, 22,231 AST nodes, 62 findings; coverage `partial` because I left 15 files out of scope
  - Endpoints: only `/_next/image` (x3) and the Next `dpl` deployment-id candidate. No fetch to an app API, no worker.
- REA gives the module graph, not motion parameters. Every motion parameter in this report comes from **grep of the same chunks** (Swiper props `speed:1e3`, `slidesPerView:1.75`, `spaceBetween:"20%"`, `centeredSlides`, `mousewheel`, `cssMode` on mobile; `setInterval(...,5e3)`; IO thresholds `.66` and `.85`) and from the CSS.

## 10. For a dermatologist's explainer videos and reels

**Worth learning**
1. **One push, one hold.** M1 holds each image for 5.0 s, then moves it in 1.5 s with a slow-start ease (only 16% of the travel in the first 25% of the time, 96% done by 75%). This calm rhythm translates directly into a before/after or condition-image sequence: about 3.5 s of stillness, then a 1.5 s vertical push on `cubic-bezier(.5,0,.15,1)`.
2. **Opacity-only cascades with tiered delays** (0 / 150 / 750 ms, 1 s each, no movement) feel premium and never jittery. Use them for caption, label, then source line.
3. **Dim, don't hide.** Inactive items sit at 0.33 opacity (carousel) or 0.15 (catalog) and rise to 1 when focused. This suits "focus on one lesion or one product" moments.
4. **A persistent anchor that relocates.** The header glides 1 s on `.35,0,.15,1` to a new home for each section. The same idea works for a lower-third or chapter label that moves between positions instead of cutting.
5. **Two-curve system**: one fast hover curve (`.66,.33,0,1`, 350 ms) and one slow reveal curve (`.33,.15,.15,1`, 1 s). That is a whole brand-bible motion rule in two tokens.

**Do not copy**
- Hijacking the wheel (`preventDefault` on wheel) and the auto-redirect after 20 s. In video terms, never auto-advance faster than the viewer can read a medical label.
- Single 12 px type: too small for reels on phones.
- Blur on hover (M7 detail, `blur(2px)`) over a clinical image reads as "obscured" and could hide detail a patient needs to see.

## 11. Unknowns
- [unk] The exact time the first preloader image paints relative to load depends on network (the fade-in-out starts at a 1250 ms delay after mount).
- [unk] Catalog item detail transitions (`item_selected_wrapper` fade) were not triggered, because the capture does not click.
