# REA study — ninepointsixthree.co

Study only. No code, CSS, font, image or copy from that site is in our build.
Measured 2026-11-09. Raw data in this directory; the measured spec is `SPEC.md`.

## Step 0 — tooling
`rea 6.8.0`, Node `v24.15.0`. Already installed; nothing to add.

## Step 1 — browser observation
Chromium (real GPU, ANGLE/D3D11) at **390x844** touch DPR2 and **1440x900**,
across `/`, `/journal`, `/journal/[slug]`, `/sounds`. Scrolled each page to the
bottom in 4-14 steps and hovered up to 28 interactive elements per page at 1440.
HARs: `session-390.har`, `session-1440.har` — **147 entries each, 0 errors**,
2 hosts (`www.ninepointsixthree.co` 82, `cdn.sanity.io` 65).
Weight: 2.23 MB JS, 1.93 MB AVIF, 1.17 MB fonts, 0.96 MB WebP, 90 KB CSS.
Page errors: none on any route at either width.

## Step 2 — the whole client bundle
`_buildManifest.js` and `_ssgManifest.js` **do not exist** on this site: it is a
Next.js **App Router** build (`self.__next_f` present, `__NEXT_DATA__` absent), and
those two files are Pages-Router artifacts. There is also no `buildId` directory in
the asset paths. So the brief's route to the bundle is not available here, and I
reached the same place two other ways:

1. the **webpack runtime's chunk-id to hash map** in `webpack-ce48ed05e66117be.js`
   (12 entries), which enumerates lazy chunks no page references; and
2. a **link crawl seeded from `sitemap.xml`** (14 URLs; the first crawl missed them
   because the sitemap uses the `www.` host and my origin filter did not).

Counts:

| | Count | Bytes |
|---|---|---|
| Routes (URLs) | 14 | — |
| Route groups | 4: `/`, `/journal`, `/journal/[slug]`, `/sounds` | — |
| JS chunks | 24 | 1,239,849 |
| CSS files | 2 | 27,149 |
| Fonts | 4 | 337,460 |
| Sourcemaps found | **0 of 26 probed** | — |
| Chunks referenced but 404 | 2 (`654.…`, `678.…`) | — |

No `sourceMappingURL` comment in any file, and every `<file>.map` probe returned
404 — so there was nothing for REA to reconstruct original modules from. All
findings below come from the minified source plus runtime observation.

## Step 3 — REA static reconstruction
Run over the whole tree first: it spent over 15 min on the React framework chunk
alone and timed out at the 600 s/file budget, returning a partial observation.
Re-targeted at the **19 app-owned chunks** (`--source-paths-json`) it completed
clean:

```
rea analyze-javascript-application ref/963/extracted --format json \
  --max-heap-mb 4096 --analysis-timeout-ms 900000 --max-semantic-nodes 300000 \
  --source-paths-json ref/963/rea-sources.json > ref/963/js-analysis.json
```

`JavaScriptApplicationGraph` `jag_6d388fd8…`: **420 nodes, 580 edges**, 19 files
parsed, **0 parse failures**, 101 modules, 401 findings, 65,728 AST nodes visited.
Nodes: 339 `javascript-module`, 22 `javascript-asset`, 16 `javascript-chunk`,
7 `endpoint`, 1 `worker`, 20 unknown. Coverage `partial` (alias expansion bounded
at 512; 20 framework files left out of scope by my own selection).

Endpoints recovered: `/api/subscribe` (`fetch`, from `layout`), `/_next/image` x3,
Sanity `loader/query-listen` (live preview), route candidates `/`, `/journal`,
`/sounds`, and one worker in chunk `341`.

## Step 4 — motion code in JS and CSS
Fingerprinted the **whole** bundle, not one page.

**Absent (0 occurrences):** lenis, locomotive, GSAP, ScrollTrigger, framer-motion,
motion-dom, smooth-scrollbar, embla, scrollama, react-spring, popmotion,
ScrollMagic, AOS, rellax, SplitText/splitting, barba, swup, keen-slider,
react-scroll, three.js/WebGL, matter-js, anime.js, velocity.js, plyr, howler,
wavesurfer, hls.js, mux.

**Present:** **Swiper** (132 references in `940-…js`, with its own 6.5 KB CSS),
modules `freeMode`, `virtual`, `mousewheel`; and Sanity's client (135 refs).

CSS: exactly **4 app keyframes** (`fadeIn`, `fadeUp`, `emailWidgetUp`,
`emailWidgetDown`) plus Swiper's `swiper-preloader-spin`. `:root` carries two
custom properties. **Zero** `@scroll-timeline`, `animation-timeline`,
`scroll-behavior:smooth`, `scroll-snap`, `position:sticky` (0 sticky elements on
every route) or `will-change` (0 elements).

## Step 5 — runtime ground truth
`document.getAnimations()` sampled every 100 ms through every scroll and hover, on
4 routes by 2 widths (53-148 samples per page), plus a `MutationObserver` on the
`style` attribute, plus instrumented `requestAnimationFrame`, `Element.animate`
and `addEventListener`. Full log: `runtime.json`.

| Measure | Result |
|---|---|
| Animation timelines seen | **`DocumentTimeline` only** — 1,163 + 189 + 104 + 101 + 743 + … observations, **0 `ScrollTimeline`, 0 `ViewTimeline`** |
| `ScrollTimeline` supported by the test browser? | **yes** (`'ScrollTimeline' in window === true`) — so its absence is a choice, not a fallback |
| `Element.animate()` calls | **0** on every route at both widths |
| `requestAnimationFrame` calls | 0 on `/journal`, `/sounds`, `/journal/[slug]`; 16 (390) and 96 (1440) on `/` — all Swiper |
| Inline `style` transform/opacity writes | 0 on all routes **except** `/`: 6 (390), 9 (1440), every one on `.swiper-wrapper` as `translate3d(0px, -12807px, 0px)` |
| `position:sticky` elements | 0 everywhere |
| `scroll-behavior` | `auto` everywhere |

**The scroll is native, with one exception.** `/journal`, `/journal/[slug]` and
`/sounds` are plain document scroll with no scroll-linked motion of any kind — no
IntersectionObserver reveals either. On `/` the document does **not** scroll at all
(`scrollHeight` equals the viewport at both widths); the wall is a vertical Swiper
(desktop) or a native-scroll overflow container (mobile) that writes tile sizes.

## Step 6 — one table per visible effect

### A. Entry fade-up of page content
| | |
|---|---|
| Type | CSS animation `fadeUp` |
| Target | the page content wrapper (`/journal`, `/journal/[slug]`, `/sounds`) |
| Duration / delay | **2000 ms** / 0 |
| Easing | `ease` declared; the timeline reports `linear` with per-keyframe `ease` |
| Fill | `forwards`, 1 iteration |
| Keyframes | `0%: opacity 0, translateY(20px)` to `100%: opacity 1, translateY(0)` |
| Timeline | `DocumentTimeline` |
| Trigger | mount. **Not** scroll- or viewport-triggered |
| Absent on | `/` |

### B. Email widget rise
| | |
|---|---|
| Type | CSS animation `emailWidgetUp` (and `emailWidgetDown` for the reverse) |
| Target | the fixed bottom widget, all 4 routes, both widths |
| Duration / delay | **1500 ms** / 0 |
| Easing | `ease` |
| Fill | `forwards`, 1 iteration |
| Keyframes | `0%: opacity 0, translateY(100px), backdrop-filter blur(0) opacity(0)` to `100%: opacity 1, translateY(0), backdrop-filter blur(22px) opacity(1)` |
| Timeline | `DocumentTimeline` |
| Note | animates `backdrop-filter`, which is the expensive part |

### C. Route-change crossfade
| | |
|---|---|
| Type | CSS transition on `opacity` |
| Target | `.main-content` |
| Duration | **300 ms**, delay 0 |
| Easing | `ease-in-out` |
| Fill | `backwards` |
| Keyframes | `opacity 0 to 1` |
| Trigger | mount / client-side navigation |

### D. Media tile proximity scale — the headline effect
| | |
|---|---|
| Type | CSS transition on `all`, driven by **imperative inline width/height writes** |
| Target | `.slide` (desktop, inside Swiper) / `.image-container` (mobile, native scroll) |
| Duration | **300 ms**, delay 0 |
| Easing | `cubic-bezier(0, 0, 0.2, 1)` (Tailwind `ease-out`) |
| Base size | `110 x 138 px`, radius 12px, `transform-origin: center center` |
| Formula | `scale = clamp(1, 1 + 0.5*(1 - d/R), MAX)`, where `d` is the distance from the tile centre to the viewport centre |
| `R`, `MAX` | desktop `vh/5`, 1.5 — mobile `vh/4`, 1.4 |
| Written as | `width = 110*scale`, `height = 138*scale` — **not** a transform |
| Observed range | `110.000` exactly beyond `R`, up to `154.000` = `110 x 1.4` exactly at the mobile clamp |
| Verification | settled centre tile at 1440: predicted `1.375278`, measured `1.375282` (5 dp) |
| Timeline | `DocumentTimeline` — it is a transition, not scroll-linked |
| Cost note | animating `width`/`height` lays out and paints every frame; `transform: scale()` would composite instead |

### E. Image load fade
| | |
|---|---|
| Type | CSS transition on `opacity` |
| Target | `next/image` elements (`transition-opacity duration-300`) |
| Duration | **300 ms** |
| Easing | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Keyframes | `opacity 0.9 to 1` (the class flips `opacity-90` to `opacity-100` on `onLoad`) |
| Seen | 1,047 observations at 390, 453 at 1440 on `/` — the most frequent animation on the site |

### F. Nav pill hover and selected state
| | |
|---|---|
| Type | CSS transitions on `background-color` and `color` |
| Target | nav items (`a.drop-shadow-xs`) and the pill wrapper |
| Duration | **500 ms**, delay 0 |
| Easing | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Hover | `rgba(219,219,219,.698)` to `rgba(188,188,188,.698)` |
| Selected | `rgba(108,108,108,.698)` with text `rgb(248,248,248)` |
| Geometry | item 74 x 35.75, radius 24px, padding `10px 0`, 80px pitch and 6px gap, `backdrop-filter: blur(64px)`, `0.5px` border |

### G. Swiper wrapper translate — the `/` scroll itself
| | |
|---|---|
| Type | inline `transform` write, no transition on the wrapper |
| Target | `.swiper-wrapper` |
| Value | `translate3d(0px, -12807px, 0px)` (sampled) |
| Driver | `wheel` listener, `{passive:false}`, `preventDefault()`, `translate -= 0.5*deltaY` applied directly, then a 10 ms-debounced resize pass |
| Smoothing | **none on the position** — Swiper `freeMode` momentum only |
| Loop | `slideTo(len/2, 0)` when `realIndex` is under 10 or over len-10; mobile teleports with `scrollTo({behavior:'instant'})` |

## Is the site simple?
**Yes — simpler than it looks, in a specific way.** Three of its four route groups
are native document scroll with *no* scroll-linked motion at all: not a scroll
timeline, not a `requestAnimationFrame` loop, not even an IntersectionObserver
reveal. All motion on those pages is two mount-time CSS keyframe animations
(`fadeUp` 2 s, `emailWidgetUp` 1.5 s) and three CSS transitions (300 ms opacity,
300 ms size, 500 ms colour). Zero `Element.animate()` calls. Zero scroll-driven
timelines, on a browser that supports them.

The home page is the one piece of real engineering, and it is not a scroll effect
either: the document does not scroll, a vertical Swiper in free mode carries a
4x-repeated media list, wheel delta is halved and written straight to the translate
with no interpolation, and a debounced pass writes each tile's `width`/`height`
from a clamped distance-to-centre formula that a 300 ms `ease-out` transition then
smooths. The perceived smoothness is Swiper momentum plus that one transition.

The proof is the `getAnimations()` log: across 4 routes by 2 widths, **every
observation is on `DocumentTimeline`** — over 2,400 of them — with `ScrollTimeline`
available in the browser and used zero times, and `Element.animate()` called zero
times. `runtime.json` holds the full record.

## What is worth taking (technique, not code)
1. One type size (11px / 1.25 line-height) and one weight, with a metric-matched
   local fallback.
2. Translucent surface plus `backdrop-filter`, a half-pixel border and a 24px
   radius, with a 500 ms colour transition — slow enough to read as material.
3. Distance-from-centre as the single input to a clamped scale, with a short
   `ease-out` transition doing the smoothing instead of a per-frame loop.
4. Their cost mistakes to avoid: animating `width`/`height` instead of `transform`,
   animating `backdrop-filter`, 1.17 MB of fonts, `unoptimized` images, and two
   `console.log` calls left in production.
