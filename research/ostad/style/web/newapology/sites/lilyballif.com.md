# lilyballif.com: motion and spacing study

Study notes only. No code, CSS, font, image or copy from this site goes into our build.
Measured 2026-11-16. This is a photographer's portfolio linked from newapology.com. Astro static build on Netlify, Sanity images
via `/.netlify/images`, Fathom analytics.

Tags: **[O]** observed (runtime capture, probe or frame), **[S]** read from shipped source, **[I]** inferred, **[U]** unknown.

## 1. Pages captured

From the home page menu. `/fashion` and `/random` appear in an earlier link list but return the Astro **404** page, so I
replaced them with `/portraits` and a second project.

| Page type | URL | 1440 JSON | 390 JSON |
|---|---|---|---|
| Home (index strip) | `/` | `lilyballif.com_1440.json` | `lilyballif.com_390.json` |
| Project / case | `/projects/midtown` | `lilyballif.com__projects__midtown_1440.json` | `..._390.json` |
| Project / case 2 | `/projects/the-sound-of-liver` | `lilyballif.com__projects__the-sound-of-liver_1440.json` | `..._390.json` |
| Category list | `/portraits` | `lilyballif.com__portraits_1440.json` | `..._390.json` |
| Archive (titled strip) | `/documentation` | `lilyballif.com__documentation_1440.json` | `..._390.json` |
| About | `/about` | `lilyballif.com__about_1440.json` | `..._390.json` |

All JSON files are in `../sites/runtime/`. Videos are in `lilyballif.com/video/`. Frames are in `lilyballif.com/frames/`
(`home1440_sheet_0-16s.png`, `home390_sheet.png`, `home1440_001..032.png` at 4 fps).
The per-frame interaction probe output (wheel, hover, lightbox, menu, preview titles, geometry at both widths) is in
`lilyballif.com/probe.json`.

## 2. Stack (REA plus source)

- **REA, full tree** (`--detail summary`): hit the 300 s per-source deadline on React's `client.D2uXF50x.js` (134 KB).
  The partial Evidence is `ev_73654a6d11d0ca57…` (`lilyballif.com/rea-full-timeout.json`).
- **REA, app-owned sources** (`rea-sources.json`: `ImageCarousel.Uc_0Laxk.js`, `client.Creo3yiD.js`, the 5 extracted
  inline page scripts and `page_home.html`): completed. Evidence
  **`ev_8ebf34ab2777e6c41d0e3f2da392c2f785d676790fa8939439c550b95895fd3f`**, graph **`jag_7500a8802ed0…`**, 58 nodes and
  67 edges, 26 JS modules, 7 files parsed, 0 parse failures, 33 findings, 1 endpoint candidate (`astro-island`), coverage `partial`.
  Output: `lilyballif.com/rea.json`.
- **Libraries [S]:**
  - Astro islands (`astro-island component-url=/_astro/ImageCarousel…js`, `renderer-url=/_astro/client…js`)
  - React (jsx-runtime plus client)
  - an inlined **react-swipeable**-style hook in `ImageCarousel` (`delta:10, trackMouse:true, swipeDuration:Infinity`)
  - Tailwind utility CSS (`_astro/index.BDf6aFFH.css`).
  - **Absent:** GSAP, Lenis, framer-motion, Swiper, Barba/Swup, WebGL. Fingerprint hits are 0 except `requestAnimationFrame` (2) and
    `cubic-bezier` (4, Tailwind defaults).
- **Runtime [O]:**
  - 0 `Element.animate` calls on all 12 captures
  - 0 IntersectionObservers
  - rAF calls are 0 except on `/documentation` (5, the title tracker)
  - `styleWrites` are 0 except on `/documentation` (7 at 1440, 4 at 390, all `preview-title` / `sticky-title` opacity)
  - `@keyframes` is 0 on every page.

The whole motion vocabulary in the source is four CSS lines and one Tailwind utility [S]:
```
.hover-shrink{transition:transform .3s ease}  .hover-shrink:hover{transform:scale(.975)}
.transition-opacity{transition-property:opacity;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s} .duration-300{transition-duration:.3s}
```

## 3. Motion table

| # | Effect | Type | Target | Trigger | Duration | Delay | Easing | Values | Stagger | Measured curve |
|---|---|---|---|---|---|---|---|---|---|---|
| L1 | **Image press-in on hover** | CSS transition | every strip image (`img.hover-shrink`) | hover | **300 ms** | 0 | `ease` | `scale(1)→scale(0.975)` (−2.5 %, about 13 px on a 540 px tall image) and back | n/a | probe `hover_img`: 1→0.99748→0.99217→0.98660→0.98240→0.97947→0.97748→0.97620→0.97542→0.97506→0.975 at 31 ms steps (57 to 368 ms). `unhover_img` is the mirror, 0.975→1 by 361 ms [O] |
| L2 | **Preview title fade** while scrolling the strip | inline `style.opacity` write (rAF on scroll) plus Tailwind `transition-opacity duration-300` | `.preview-title` (16 px caption under an image) | horizontal scroll: shown when an image is **>30 % visible** and its title differs from the leftmost one [S] | **300 ms** | 0 | cubic-bezier(.4,0,.2,1) [S]. Peak speed at 90 ms, 90 % at 190 ms [I] | opacity `0→1` | one title per project (deduped by `Set`) [S] | probe `wheel_doc_title`: 0.028, 0.148, 0.403, 0.646, 0.800, 0.895, 0.951, 0.983, 0.998, 1.0 from 150 to 431 ms after the wheel [O] |
| L3 | **Sticky title swap** | `textContent` replace plus `opacity='1'` | `#sticky-title` (fixed, `bottom:20px; left:20px`) | leftmost visible image changes | instant | n/a | none (hard cut) | text replaced in place [S] | n/a | capture: 1 write per page [O] |
| L4 | **Lightbox open** | React mount | `fixed bg-white/90` scrim plus image (`h-[90svh]`, 92svw on mobile) | click image | **0 ms (hard cut)** | about 95 ms click-to-paint latency | none | scrim `rgba(255,255,255,.9)` full viewport; the top bar (44 px, white) is reused | n/a | probe `click_img`: `null` at 6.9 ms, full overlay with image at opacity 1 at 99.7 ms. No intermediate frames [O] |
| L5 | **Lightbox next / previous** | React state | image `src` | ←/→ key, a click on the image (left 40 % = previous, otherwise next), swipe (delta 10 px) | 0 ms (cut) | 1 frame | none | the neighbours (index ±1) are preloaded with `new Image()` [S] | n/a | probe `carousel_next`: src changed between 14 ms and 45 ms (one frame) [O] |
| L6 | **Menu** | class toggle `hidden↔block` | `#menu-dropdown`, `#menu-background` (`text-[3.25svw] #C8C8C8` statement line) | click "Menu" (the label becomes "Collapse") | 0 ms (cut) | n/a | none | `display none→block`, background `none→flex` [O] | n/a | probe `menu`: one-frame switch [O] |

**Load [O]:** there is no intro or reveal. Frame sheet `home1440_sheet_0-16s.png`: the first image appears at about 1 s, and the rest *pop in*
when they decode (about 6 s in this session) with no fade. The layout is stable because `width` / `height` attributes are set.
**Page transitions [S][O]:** none. These are full Astro page loads with no `<ViewTransitions />` and no Swup.

## 4. Scroll model

- **The page never scrolls vertically** on the strip pages [O]: docH equals the viewport (900 / 844) on `/`, `/portraits`, `/documentation`
  and the projects at 1440.
- **The wheel is remapped to horizontal** [S]: `imageGrid.addEventListener('wheel', e => { e.preventDefault(); imageGrid.scrollLeft += e.deltaY })`.
- **There is no smoothing or lerp [O].** Probe `wheel_home`: one 120 px wheel tick gives `scrollLeft 0→120` in **one frame**, and `scrollY` stays 0.
  On `/documentation` the input-to-change time is 64 ms. On `/` it is 156 ms, which includes image-decode jank.
- **Strip length [O]:** `scrollWidth` is 6,537 px on `/` (14 images), 21,446 px on `/documentation` and 8,820 px on `/projects/midtown` at 1440.
- **Phone:** native touch momentum on `overflow-x:scroll` with the scrollbar hidden (`no-scroll-bar`) [S][I].
- **Bug [O]:** `/projects/midtown` at 390 overflows: docW is 980 px and the images are 1272 × 1272. The square-image project template does not
  apply `55svh` at that width.

## 5. Hover states

- **Image:** `scale(.975)` over 300 ms ease, L1.
- **Menu links:** `hover:text-black` (`#808080→#000`) with **no transition** (instant colour change) [S].

There are no cursor followers, magnetic effects or underline animations.

## 6. Spacing, layout, type, colour tokens

All [O] from `probe.json` geometry unless marked.

| Token | 1440 | 390 |
|---|---|---|
| Page side margin | **20 px** (`pl-[20px]` on the strip, `px-[20px]` on the nav) | 20 px |
| Nav | fixed, white, height **44 px** (`pt-[20px]` + 24 px line) | 34 px (`pt-[10px]`) |
| Strip image height | **60svh** = 540 px | **55svh** = 464 px |
| Gutter between images | **10 px** (`pr-[10px]` on each image) | 10 px |
| Caption space under image (archive) | `pb-[36px]`, caption at `bottom-[11px]` | same |
| Strip vertical position | top at 314 px (home, projects) or 350 px (documentation). The strip is bottom-anchored with `pb` 10 to 20 px, so the top area stays white | top at 334 / 370 px |
| Sticky title | fixed `bottom:20px; left:20px` | same |
| Lightbox | scrim white/90, image `md:h-[90svh]`, bar `px-5 pt-5` (20 px) | image `w-[92svw] max-h-[90svh]`, bar `pt-[10px]` |
| Submenu indent | `pl-[2rem]` = 32 px | same |
| About text block | x 308, width 824 (`w-[60svw]`-style centring) | x 20, width 350 |

- **Grids:** none. Every list is a single horizontal flex row (`flex overflow-x-scroll`). Image widths follow the natural aspect ratio at a
  fixed height (e.g., 550 / 415 / 370 px at 540 px tall). Project pages use square 540 × 540 tiles.
- **Spacing scale:** 10 / 20 px only. Capture histogram: padding-top `10px` × 14 and `20px` × 1, padding-left `20px` × 2. The extra
  values are 32 (indent), 36 (caption) and 48 (about paragraph gap). The base unit is **10 px** [I].
- **Type:**
  - **One family, "Jubilee"** (`OTJubilee-Silver.woff2`, weight 400) [S].
  - Nearly everything is **16/24**, colour `#808080` (grey) for UI and `#1f1f1f` for the name line.
  - Captions are 16/16 (`leading-none`).
  - About page: **48/60** at 1440 and **20/25** at 390, colour `rgb(218,128,128)` (dusty pink), paragraph gap 48 px / 16 px.
  - Menu statement: `3.25svw` (about 47 px at 1440) in `#C8C8C8`.
  - No letter-spacing (`normal`), no uppercase.
  - Scale ratio: just 16 → 48 (×3) [O].
- **Radii:** 0 everywhere (photos are square-cornered) [O].
- **Colour:** white `#fff` ground, greys `#808080` / `#C8C8C8`, ink `#1f1f1f`, about pink `#DA8080`, scrim `rgba(255,255,255,.9)`.

## 7. What to learn for a dermatologist's explainers and reels

Worth taking:
1. **Restraint as the premium signal.** The only eased motion on the whole site is a **2.5 % press-in over 300 ms `ease`** and a
   **300 ms opacity fade** with cubic-bezier(.4,0,.2,1). Everything else is a hard cut. This is a measured precedent for keeping
   UI-style motion in our explainers small (≤3 % scale, ≤300 ms) and letting cuts do the work.
2. **Fixed-height filmstrip pacing.** Images keep their native aspect ratios at one height (60 % of the frame), separated by a
   **10 px gutter**, with a 20 px margin, a caption 11 px below, and a single 16 px type size. As a reel layout this works for
   before / after / follow-up sequences: one row, constant height, a pan driven by the voiceover.
3. **Caption follows content, not time.** A title fades in only once its image is more than **30 %** on screen (L2), and the persistent
   label in the corner (bottom-left, 20 px inset) updates on the leftmost item. This is a good rule for on-screen labels in a panning
   sequence.
4. **One typeface, one size, grey UI text** (#808080), with ink kept for the single line that matters.

Not to copy:
- Remapping wheel input to horizontal motion with **zero smoothing** (one-frame 120 px jumps). In video, a pan needs an
  ease (see mirapest M7 power3.out, about 500 ms).
- Images popping in without a fade (decode-time jank).
- The instant menu and lightbox (fine for a portfolio, too abrupt for calm explainer pacing; use about 300 ms opacity).
- The broken 390 project layout.
- The pink about-page colour and the Jubilee face: her identity, not ours.
