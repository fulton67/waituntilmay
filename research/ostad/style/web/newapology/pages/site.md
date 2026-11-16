# newapology.com: site-wide systems (home, /work, /about, /journal)

Study notes only. No code, CSS, fonts, images or copy from newapology.com ship. Page content was treated as data.
Class names and token names are quoted below only so the evidence can be traced. They are not for reuse.

**Tags:** **[obs]** = measured in a runtime capture. **[code]** = read from the shipped bundle or CSS (declared, and
consistent with runtime wherever both exist). **[inf]** = inferred. **[unk]** = unknown.

**Sources**
- `runtime/{home,work,about,journal}_{1440,390}.json` (capture.mjs).
- New captures from `tools/measure.mjs`, written to `runtime_extra/`:
  - `lenis_1440.json`: wheel response on /about, rAF-sampled `scrollY`.
  - `click_{1440,390}.json`: /work to /work/et-al.
  - `next_1440.json`: end-of-case pull into the next project, with CDP screencast frames.
  - `load_1440.json`: home load screencast.
- Bundle: `extracted/_next/static/chunks/*`, CSS `6f399c…css`.
- Videos, mapped by order: home 1440 `d8d9be93…`, work 1440 `fe83613c…`, about 1440 `476ffa80…`, journal 1440 `7410173e…`,
  home 390 `d4fb72f2…`, work 390 `8d9de4b3…`, about 390 `c1ba1439…`, journal 390 `0dfddd2c…`. `d5d8272a…` is an earlier
  aborted run.

**Frame-rate caveat.** Headless Chromium rendered rAF at **~32 fps** (median frame 31.2 ms). Curves were therefore fitted
against the known easing functions. They were not differentiated frame by frame. "Frames to settle" figures are computed
at 60 fps from the fitted or declared curve.

---

## 0. Corrections to the brief

- **No WebGL.** **[obs]** `canvas` count is 0 on all 8 captures. **[code]** No `getContext`, `webgl`, `createProgram` or
  GLSL appears anywhere in the bundle. The "OGL" text hit is a false positive: the substring of "G**oogl**e"
  (googletagmanager, Googlebot, Google Maps). No video frame shows a GL surface. All imagery is `<img>`/`<video>`.
- **No Swiper JS.** **[code]** Swiper appears only as leftover CSS selectors (`.swiper`, `.home-carousel`) from an older
  theme. There are no Swiper symbols in the JS, and no `.swiper` element in the DOM.
- **Lenis is real.** **[code]** Version 1.3.15 (`window.lenisVersion`), on `<html class="lenis">`. Section 2 measures it.
- **/work into a project is not a shared-element transition.** **[code+obs]** It is an eye-blink, a 200 ms timer and a
  plain route change (section 3A). The site's shared-element View Transition fires from the **end of a case study into
  the next project** (section 3B).

---

## 1. Page anatomy

The shell is shared by every route:
- **Header.** `.nap-header`, sticky, background transition 0.2 s. Contents:
  - wordmark at left;
  - **centre nav pill** (`.nap-nav-surface`, 233 x 40 at x=596 on 1440, links Projects/About/Journal);
  - at right, a blue **"Work with us"** pill (127 x 40) and a pink notification dot-pill (47 x 40).
- **Footer.** `.nap-footer`:
  - a signature that reads as **initials "NAP"** and expands letter by letter to the full studio name plus "Projects"
    when it enters view (section 5I);
  - a yellow "Send us a message" input bar;
  - a contact row: address, email, Instagram.
- **Header height** is written to `--nap-header-height`: 90.45 px at 1440, 76 px at 390. **[obs]**
- **Page-reveal system.** On load, an IntersectionObserver (`threshold .01`, `rootMargin 0 0 -30px 0`) staggers every
  top-level section in (section 5A).
- **Body background** is transparent, so the page reads white. Ink is `#313131`.

| Route | 1440 x 900 (docH) | 390 x 844 (docH) | Sections, in DOM order |
|---|---|---|---|
| `/` | 5051 | 3626 | 1. **Showcase**: one reel card (878 x 549 at 1440) playing the studio reel, with an "Explore projects" pill. It morphs into a row of project cards (335.9 x 209.9 each; section 5D).<br>2. `nap-about`: 36/43.2 statement over 8 of 12 cols, plus an expand "+" pill.<br>3. `nap-essays`: "Writing", a horizontal strip of essay cards that peek or translate.<br>4. `nap-testimonials`: a quote stage (height-animated, 295 px) with prev/next arrows. It auto-advances every **6000 ms** while its top sits between 35% and 65% of the viewport. **[code]**<br>5. `nap-latest`: "Latest Project", one wide card.<br>6. `nap-capabilities`: "We offer" + a rotating name + a dice-roll media stack, advancing every **3500 ms**. **[code]**<br>7. `nap-journal` placeholder.<br>8. Footer. |
| `/work` | 2950 | 3387 | Heading shell (the filter pill "All", which expands to the capability filters), then `nap-index-grid` with **14 cards**: **4 cols x 246.9** at 1440, gap **80 px row / 20 px col**. Each card is cover media + title/caption, with a per-card eye cursor. At 390 the grid is 2 cols x 169, gap 80 / 12. |
| `/about` | 4184 | 4101 | 1. `info-overview` (narrow): headline with a **word-swap rotator**.<br>2. `nap-essays--editorial`.<br>3. `info-approach` (narrow).<br>4. `info-offices` (wide): 2 office cards, 513.8 x 2, gap 20.<br>5. `info-music`: a "Next in queue" player.<br>6. `info-open-roles` (narrow).<br>7. `info-family` (wide): team portraits.<br>8. Footer.<br>Section rhythm is `margin-top: 200px` (1440) and 120 px (390). |
| `/journal` | 24591 | 33558 | `nap-journal-featured` (2-up, 513.8 x 2), filter row, then `nap-index-grid` of **~180 entries** (4 x 246.9 at 1440, 2 x 169 at 390, row gap 80). Entry kinds are images, writing (essays) and video. |

**390-specific chrome** **[obs, video]**:
- Header collapses to wordmark + "Menu".
- "Work with us" and the notification dot move into a **bottom-centred fixed pill bar** (`.nap-header-actions`). It
  grows on load and hides when the footer is near (section 5F).
- Hover-only cursors are absent.

---

## 2. Smooth scroll: Lenis, measured

**Config [code]** (module 46689, spread into the root `ReactLenis` in `layout`):
```
duration: 1, easing: t => min(1, 1.001 - 2^(-10t)), smoothWheel: true, syncTouch: false, wheelMultiplier: 1.1, orientation: vertical
prevent: dialogs, textarea, select, contenteditable, notification copy
```
- Because `duration` is set, Lenis ignores `lerp`. **Each wheel event restarts a 1000 ms expo-out tween** from the current
  animated position to the accumulated target.
- A second preset `{duration: 0, smoothWheel: false}` is used for touch / studio / reduced-motion contexts. **[code]**
  So **mobile scroll is native** (syncTouch false). **[inf]**

**Measured on /about at 1440** (`runtime_extra/lenis_1440.json`, synthetic `mouse.wheel`):

| Input | Target | Observed displacement vs time after the wheel event (ms : px) | Fit |
|---|---|---|---|
| 1 notch, deltaY 100 | **110 px** (x1.1) **[obs]** | 30:22, 62:39, 93:53, 124:64, 155:73, 187:80, 249:91, 312:98, 374:102, 468:106, 593:108, 749:110 | expo-out `1.001-2^(-10t/1s)`: **RMS 0.26 px**, time offset 1 ms. A `lerp 0.1 @60fps` model fits worse (RMS 2.1 px). |
| 1 event, deltaY 300 | 330 px | 31:64, 62:116, 124:192, 249:258, 374:300, 499:320, 749:329, 874:330 | same curve. RMS 4.6 px, caused by two dropped headless frames. |
| 10 notches about every 94-124 ms | 1100 px | at the last notch (t=936) position is 871 vs target 1100 → **lag ≈ 229 px ≈ 2.1 notches**. Settles at 1100 by about t=1780 ms (≈ 840 ms after the last input). | retarget-per-event behaviour confirmed |

**Scroll lag characteristics** **[from the fitted curve]**:
- Velocity peaks at t=0, at **6.93 x distance/s** (762 px/s for one notch). There is no ramp-in and no overshoot.
- Half the distance is covered at **100 ms**, 90% at **331 ms**, 99% at **651 ms**. The tween finishes at 1000 ms.
- Equivalent exponential time constant τ = **144 ms**. Per-60fps-frame factor **0.109**: perceptually the same as the
  Lenis default lerp 0.1, but frame-rate independent.
- At 60 fps: 99% in **40 frames**, done in 60 frames.

**Scroll handoff during transitions [code].** While a project transition runs, `data-scroll-handoff="true"` is set:
- wheel, touchmove and scroll keys are `preventDefault`ed;
- scroll is pinned to 0;
- release happens ≥160 ms after the transition finishes **and** ≥240 ms after the last input.

---

## 3. Route transitions

### 3A. /work card into a project (the brief's case)

**[code]** The card link's `onClick` does `preventDefault`, adds `is-blinking` (eye icon) and runs `setTimeout(200)`,
then `router.push('/work/<slug>')`. **No View Transition and no overlay** on this path.

| | 1440 [obs] | 390 [obs] |
|---|---|---|
| t=0 click (`img` inside the card) | eye `nap-eye-blink` starts at +20 ms: **200 ms**, `scaleY 1 → .08 (45-55%) → 1`, ease-in-out | same |
| Route swap (pathname changes) | **+270 ms** (200 ms timer + ~70 ms render) | +271 ms |
| Old page | removed instantly (no fade) | same |
| Arrival cascade `case-arrive` | all start at +270. `opacity 0→1, translateY 12→0`, **600 ms** `(.22,1,.36,1)`. Delays: title 0, caption 85, link 170, tag pills 255/340/425/510/595, **hero 680**, intro prose 765 | identical |
| Last element settled | +270+765+600 = **+1635 ms** | same |
| Gallery and credits | `.case-has-reveal` items transition `opacity .5s ease` and `transform 600ms (.22,1,.36,1)`, `translateY(20px)` → none, per item on viewport entry **[code]** | same |

### 3B. Signature: "pull to next project", shared cover via View Transitions (measured on /work/et-al into /work/pinto)

Mechanism **[code]**:
- At the page bottom, `.case-next` reveals the next project's card:
  - `case-next-rise`: translate 0 180px → 0, over 0.78 x 900 = 702 ms, `(.22,.7,.25,1)`;
  - `case-next-grow`: scale `--next-initial-scale` (0.660 at 1440, i.e. heading width / wide; 0.78 at 390) → 1, over
    576 ms, delayed 126 ms, `(.3,0,.2,1)`;
  - heading label rises 8 px over 198 ms at delay 702.
- Continued downward input accumulates "pull" (0-60 units).
- A new gesture must start ≥360 ms after the previous input, and the pull needs 60 units to trigger.
- At 60 it leaves via `document.startViewTransition` with `view-transition-name` `nap-project-cover` and
  `nap-project-title`.
- Fallback below 768 px or without the API: clone the overlay and run FLIP `transform + border-radius`, **1100 ms**
  `(.66,0,.25,1)`.

| Element | Duration | Easing | From → to [obs, getAnimations on pseudo-elements] |
|---|---|---|---|
| `::view-transition-group(nap-project-cover)` | **1100 ms** | `cubic-bezier(.66,0,.25,1)` | 1047.6 x 589.4 at (189, 660) → same size at (189, 606). The next card had already grown to full width, so the cover only travels **54 px up** |
| `::view-transition-image-pair(nap-project-cover)` | 1100 ms | same | border-radius **19px → 5px** (`nap-project-rounding`) |
| `::view-transition-group(nap-project-title)` | 1100 ms | same | 86 x 42.5 at (669, 560) → (669, 220): **340 px up** |
| `::view-transition-old(root)` | **200 ms** | ease | opacity 1 → 0 (`case-root-out`). Old page blanks to white behind the flying cover |
| `::view-transition-group(root)` | 250 ms | ease | UA default |
| Destination `case-arrive` | 600 ms | `(.22,1,.36,1)` | caption 85, link 170, pills 255…510, prose 680 (title and hero are the VT targets, so they are skipped) |

Timeline [obs]:
- pull input at 0 / +65 / +159 ms;
- `data-project-transition-mode="native"` set at **+159**;
- route and VT running at **+315**;
- VT done and dataset cleared at **+1471** (≈ 1100 + overhead).

Curve `(.66,0,.25,1)`: peak velocity at **46%** of the duration (3.41 x average), no overshoot, 99% at 88%. That is
**59 frames to 99% at 60 fps**. It is a slow, symmetric-ish "heavy" move, unlike the site's fast-out `nap-ease`.

### 3C. Index filter morph (/work, same-page) [obs]

Opening the filter pill does three things together:
- **FLIP** (`Element.animate`) the heading `span.nap-display` and the current pill: translate (±344, ±22.9) → 0,
  **480 ms** `(.22,1,.36,1)`;
- heading shell height 43.2 → 88.9 px over 480 ms;
- the other filter pills enter `opacity 0, translateX(-8px) → 0` over **280 ms**, delays 96, 124, 152 … 264
  (**28 ms stagger**), `fill: backwards`.

Grid exit on filter change: `nap-index-out` 180 ms `(.4,0,1,1)`, translateY 0 → 7 px, stagger `min(25n, 300) ms`. **[code]**

---

## 4. Cursor, nav and hover states

### 4A. Project pointer / cursor pill (desktop)

- `div.nap-project-pointer` is `position: fixed`. It holds a glass pill (`--nap-color-glass`, blur 9 px, radius 19,
  h 40.465) with label text ("View", "Read", "Index", "Explore projects", project names).
- **Follow is 1:1, with no smoothing.** **[obs]** Its `transform: translate3d(x, y, 0)` is written on each `pointermove`
  at exactly the pointer coordinates.
- Evidence: Playwright's 8-step moves produce perfectly even increments, e.g. 59.87/50.60 px per step, from
  (720, 450) → (480.5, 247.6). Lag = 0 frames.
- Show/hide: pill `opacity 160 ms ease` + `visibility 0 s 160 ms`.
- Width morphs between labels at `--nap-expand-time` **380 ms** `(.3,0,.2,1)`, e.g. 53 → 149, 149 → 79, 138 → 77 px.
- Label swap (`Element.animate`):
  - old label: `opacity 1→0, translateY 0→-5px, blur 0→2px`, **180 ms ease-out**;
  - new label: `opacity 0→1, translateY 5→0, blur 2→0`, **260 ms** `(.22,1,.36,1)`, both started together.
- Book icon variant: two "books" topple in 280 ms (rotate up to -38° / -76° keyframes) on activation. **[code]**
- /work uses per-card `span.nap-index-eye` pills (eye icon), which blink on click.

### 4B. Header "Work with us" pill (hover) [obs]

- Width **127.0 → 173.9 px** (label reveals).
- `transition: width 380ms cubic-bezier(.3,0,.2,1)`. The fitted curve matches styleWrites at **RMS 1.3 px**.
- A JS squircle clip-path (`--nap-smooth-corner-clip`) is rewritten every frame for the whole 400 ms.
- Inner content `opacity 100 ms (.445,.05,.55,.95)`.
- The pill's `::before` grows **2 px on every side** (`inset 0 → -2px`), 250 ms `(.22,1,.36,1)`. **This same "inflate by 2 px" hover is used on every `.nap-pill`** (nav, filter chips, notification bubble, footer).
- Reverse on leave: 174 → 127 in ≈ 400 ms (same curve).

### 4C. Nav and links [obs]

- Links: `color 200 ms ease` (ink `#313131` → muted).
- Header background 0.2 s.
- The nav pill has a JS squircle clip (corner path with 8 px radius plus smoothing).
- Notification bubble: same 2 px inflate. Hint width 0 → 98 px at 380 ms `(.3,0,.2,1)`, hint opacity 180 ms delayed 80.

### 4D. Media hover

| Target | Property | Duration | Easing | Values |
|---|---|---|---|---|
| Home project surface | `scale` + `box-shadow` | **700 ms** | `(.25,.46,.45,.94)` | scale **1 → 1.025**, shadow none → soft |
| Essay art, latest art, capability visual | `scale` + `box-shadow` | 500 ms | `(.22,1,.36,1)` | 1 → 1.025 |
| Essay card peek | `transform` | 500 ms | `(.22,1,.36,1)` | translateX(176.19px) → 0 [obs] |
| Card press (capabilities) | WAAPI | 140 ms down / 220-520 ms up | `(.3,0,.2,1)` / `(.16,1,.3,1)` | scale 1 → .99 → 1 **[code]** |

---

## 5. Loading and entry animations

There is **no preloader, curtain or intro sequence**. [obs, load screencast]
- The header paints first. Then the home reel card shows its grey `nap-media-loading` tint, which fades out
  (`opacity 1→0`, **320 ms** `(.22,1,.36,1)`) when the media is ready.
- The studio reel video starts at about 0.9-1.1 s, with hard cuts every 0.3-0.6 s inside the video itself.

| # | Effect | Trigger | Duration / delay | Easing | Keyframes | Stagger |
|---|---|---|---|---|---|---|
| A | `nap-page-enter` (sections) | IO enter (`.01`, -30 px bottom) | 600 ms | `(.22,1,.36,1)` | opacity 0→1, translateY 12→0 | `min(85·i, 425) ms` within each IO batch, sorted by top **[code]** |
| B | `nap-index-in` (/work, /journal cards; returning home cards) | mount | 600 ms | `(.22,1,.36,1)` | opacity 0→1, translateY **-7 → 0** (drops in from above) | `min(85·n, 1020) ms` **[code]** |
| C | `nap-index-page-in` (/work container) | mount | 350 ms | ease-out | opacity 0→1 | — |
| D | Home reel → projects morph | "Explore projects" click or reel play failure / end **[code; inf for end]** | **700 ms** | `(.22,1,.36,1)` | WAAPI width/height 878.1 x 548.8 → 335.9 x 209.9 + translate(85.6, -27.9) → 0 [obs] | other cards: `--reveal-delay = 120 + 700·(n-1)/(count-2) ms` |
| E | Testimonial copy | slide change | 450 ms | `(.22,1,.36,1)` | `nap-rise` opacity 0, y 8 → none. Quote `nap-index-in` 600 ms, attribution +300 ms | stage height 600 ms |
| F | 390 bottom action bar | load | **550 ms** (at about +460-1000 ms) | `(.6,0,.25,1)` (`--nap-control-ease`) | width 32 → 174 px (WAAPI) | — |
| F′ | 390 action bar hide near footer | IO (`rootMargin 0 0 120px`) | opacity 180 ms ease; transform 280 ms `(.22,1,.36,1)`; visibility 0 s/280 ms | | translateX(-50%) → offset | — |
| G | About headline word swap | timer **[unk interval, first at ~4.5 s]** | out 220 ms `(.4,0,1,1)`; in 550 ms `(.22,1,.36,1)` + 300 ms | | out: blur 0→3px, y → -.35em, fade. In: blur 4→0, y .5em → 0 | out delay = word delay / 2; in delay = `300 + 160·i/(n-1) ms` **[code]** |
| H | Capability name wheel | 3500 ms interval | in 440 ms (+100) `(.2,.65,.25,1)`; out 180 ms ease-out; layer reveal 640 ms | | label y 8 → 0 / 0 → -8; layer scale 1.025 → 1, previous 1 → 1.012 | — |
| I | Footer "NAP" signature expand | IO | suffix `grid-template-columns 0px → 1fr` **750 ms** `(.6,0,.25,1)`; letters opacity 200 ms + translateY 5 → 0 400 ms `(.22,1,.36,1)` | | | `--letter-delay = (4·word + n)·18 ms` **[code]** |
| J | Image/video ready | load | 320 ms (tint), video `opacity 0→1` 180 ms linear | | | — |

---

## 6. Easing vocabulary (computed from the bezier)

| Token / use | cubic-bezier | Peak-velocity position | Peak v / avg | Overshoot | 99% at | Frames to 99% @60 fps (typical duration) |
|---|---|---|---|---|---|---|
| `--nap-ease` (everything "arrive") | .22,1,.36,1 | **0.00** (fast-out) | 4.54x | 0 | 65% | 24 @600 ms, 28 @700, 19 @480 |
| `--nap-expand-ease` (widths) | .3,0,.2,1 | 0.24 | 2.56x | 0 | 87% | 20 @380 ms |
| `--nap-control-ease` | .6,0,.25,1 | 0.43 | 3.12x | 0 | 88% | 29 @550 ms |
| Project VT | .66,0,.25,1 | 0.46 | 3.41x | 0 | 88% | 59 @1100 ms |
| Home surface hover | .25,.46,.45,.94 | 0.07 | 1.88x | 0 | 93% | — |
| Capability | .2,.65,.25,1 | 0.04 | 3.32x | 0 | 80% | — |
| Exit (`index-out`, headline-out) | .4,0,1,1 | 1.00 (accelerating) | 1.66x | 0 | 99% | — |
| Lenis | `1.001-2^(-10t)` | 0.00 | 6.93x | 0 | 65% | 40 @1000 ms |

**No spring and no overshoot anywhere on the site.** **[obs+code]** The one exception is the about-office preview "pop"
keyframes: scale 1 → .92 → 1.045 → 1 over 540 ms.

---

## 7. Grid, spacing, radii, type, colour (tokens)

### Grid [code + obs]
- 12 columns.
- `--nap-gap` is **20 px** (desktop) and **12 px** (≤767).
- `--nap-gutter` is `max(20px, (100vw − min(100vw·0.7275, 1600px))/2)`.
  - At 1440 that gives a **wide measure of 1047.6 px** (content x = 189 with the 15 px scrollbar), 12 cols of 68.95 px,
    and a unit of 89 px.
  - At 390: gutter 20, wide 350, 12 cols of 18.16 px.
- Derived widths at 1440:

| Measure | Columns | px |
|---|---|---|
| narrow | 8u | 692 |
| project / essay | 4u | 336 |
| journal | 3u | 247 |
| team | 2u | 158 |

- Derived widths at 390: narrow = wide, project 10u, journal 6u.
- Between 768 and 1000 px, project width is half of wide.
- Index grid: 4 x 246.9 with **80 px row gap** (1440); 2 x 169 (390).

### Spacing scale (observed histograms, all 4 pages)

| Scale | Desktop (px) | Mobile (px) |
|---|---|---|
| Micro | 2, 4, 6, 8, 10 | 2, 4.2, 6, 8 |
| Element | **20** (199 margin-tops), 22-25 | **12** (187 margin-tops), 16, 20 |
| Pill padding | 9 x 20 | 8 x 16 |
| Index row gap | 80 | 80 |
| Section rhythm | **200**, 300 (before footer); hero padding 142 / 280 | **120**; 140 / 180 |

### Radii
Only two values in use:
- **5 px** for all media and cards (440 of 514 radius hits at 1440);
- **19 px** for pills (17 px at 390, where pill height is 36).
- The VT animates 19 → 5.
- Large CTA pills are 52-56 px tall.

### Type
One family, `"NAP Sorry Rounded"` (custom; fallback Inter). Weights 500 for text and 600 for display.
- Display leading 1.2, body 1.4, small 1.3.
- Tracking .01em on display, 0 on small.

| Role | 1440 | 390 |
|---|---|---|
| Display XL (case heading / footer NAP) | 70/70 600, also 64/70.4 | 50/50 |
| Display L (statements, quotes) | **36/43.2** 600 +.01em | **26.52/31.8** |
| Display M | 34/40.8 | 24/28.8 |
| Display S (card titles, section text) | **26/31.2** 600 | 20/24 |
| UI / body | **14/18.2** 500 (most frequent) | 14/18.2 (UI); captions **12/15.6** |
| Lead | 16/22.4 500 | 16/22.4 |

Muted text uses the blue-grey token. There is no uppercase anywhere (`text-transform: none` on every sample).

### Colour tokens (`:root`, oklch; hex converted)

| Token | oklch | ≈ hex | Use |
|---|---|---|---|
| ink | 31.32% 0 0 | `#313131` | text |
| muted | 78.31% .0177 242.5 | `#afbac3` | secondary text, captions |
| paper | 100% 0 0 | `#ffffff` | page, pill text |
| control | 46.84% .0477 241.4 / .35 | `#425e73` @35% | control fill |
| glass | same / **.60** | `#425e73` @60% | cursor and pill glass (blur 9 px) |
| call | 70.21% .168 244.3 | `#19a7ff` | "Work with us" |
| notice | 75.45% .169 354.3 | `#ff7db6` | notification dot |
| message | 94.03% .190 107.3 | `#faf336` | footer message bar |
| highlight | 95.81% .182 107.4 | `#fff94e` | highlight |
| focus | rgb(66 94 115 / .7) | — | focus ring |

Motion tokens:
- `--nap-ease (.22,1,.36,1)`;
- `--nap-expand-time .38s` / `--nap-expand-ease (.3,0,.2,1)`;
- `--nap-control-ms 550` / `--nap-control-ease (.6,0,.25,1)`;
- transition constants in JS: reveal 900 ms, VT 1100 ms, `(.66,0,.25,1)`.

---

## 8. Runtime totals (for scale)

| Capture | rAF calls | `Element.animate` | IO instances | styleWrites | getAnimations ids |
|---|---|---|---|---|---|
| home 1440 / 390 | 6221 / 122 | 9 / 1 | 26 / 26 | 133 / 35 | 56 / 23 |
| work 1440 / 390 | 2618 / 14 | 15 / 1 | 79 / 79 | 83 / 35 | 55 / 23 |
| about 1440 / 390 | 3712 / 63 | 0 / 1 | 4 / 4 | 118 / 29 | 32 / 20 |
| journal 1440 / 390 | 4832 / 282 | 0 / 1 | 5 / 5 | 280 / 29 | 31 / 13 |

- Desktop rAF volume is Lenis (autoRaf) plus the per-frame squircle clip writer.
- Every animation is on `DocumentTimeline`: **0 ScrollTimeline/ViewTimeline**, and no scroll-scrubbed motion. All motion
  is either input-triggered or IO-triggered and time-based.
- `/journal` 1440 styleWrites are dominated by `div.nap-journal-media` (165), which is media sizing.

## 9. What to take (technique, not code)

1. Expo-out duration scrolling (1 s, x1.1 wheel): τ ≈ 144 ms, no overshoot, retargets on each notch.
2. One "arrive" easing `(.22,1,.36,1)` + 600 ms + 12 px rise, with an 85 ms stagger capped at 425/1020 ms.
3. A 1:1 cursor pill whose **width** morphs (380 ms) and whose label crossfades with 2 px blur.
4. The 2 px `::before` inflate on every pill hover.
5. View-Transition shared cover (1100 ms, slow-in-out `(.66,0,.25,1)`, radius 19 → 5) with the old root faded in 200 ms.
6. Cost notes:
   - the squircle clip-path is rewritten in JS every frame of each pill transition;
   - width/height (layout) animations are used for pills and the reel morph;
   - `filter: blur` sits on label swaps.
