# /work/george-davies — case-study page

Study notes only. Nothing from newapology.com ships: no code, CSS, class names, fonts, images or copy.
Titles, tags and credit names below are listed as data so the structure is readable.

This file is the **reference write-up for the case-study template**. The other three
(`work__march-2004.md`, `work__mira.md`, `work__notom.md`) use the same template and the same
motion system. They list only their own numbers and point back here for the per-frame curve tables.

## Sources

| What | File |
|---|---|
| Runtime capture, 1440 and 390 (marks, facts, getAnimations, styleWrites) | `runtime/work__george-davies_1440.json`, `runtime/work__george-davies_390.json` |
| Per-frame measurement (new for this page: load cascade, scroll reveals, sticky, next-project, pull-to-navigate) | `runtime_extra/measure_work__george-davies_{1440,390}.json`, made by `tools/measure_case.mjs` |
| Media inventory after every lazy block mounted | `runtime_extra/media_gd-m04-mira-notom_1440.json`, made by `tools/media_case.mjs` |
| Saved HTML / CSS / page chunk | `extracted/page_work_george-davies.html`, `extracted/_next/static/css/6f399c267a4ae1fc.css`, `extracted/_next/static/chunks/app/work/%5Bslug%5D/page-f72fca6efa960802.js`, state machine in `chunks/4428-9918e630fbcee588.js` (module `11206`) |
| Session videos (25 fps; mapped by modification order, **inferred**) | 1440: `runtime/video/bb8e885b38197499dea0ab7a5fa406fc.webm`; 390: `runtime/video/8ee6caab97d75df21c2d8f8f2722e631.webm` |

Measurement notes:
- Headless Chromium delivered rAF at about **32 fps** (median frame 31.3 ms) during the per-frame runs. Every curve
  below is sampled at that rate, then checked against the declared CSS curve. The "frames to settle" column is
  computed at 60 fps from the declared curve once the samples confirmed it.
- Times are in the page clock (`performance.now()` from navigation start).
- Labels: **observed** (measured at runtime), **declared** (read from CSS or JS), **inferred** (a deduction), **unknown**.

---

## 1. Page structure

Title `George Davies`, caption "Soft brutalism furniture design". Tags: Visual Identity, Digital Design.
Document height **6613 px at 1440** and **5736 px at 390**. Elements rendered: 151 and 145.

Top to bottom, at 1440 (document y and height, **observed**; blocks still hidden carry a +20 px offset
from their transform, which is removed here):

| # | Block | y | h | Width | Content |
|---|---|---|---|---|---|
| 0 | site header (fixed nav pills) | 0 | 90 | — | site-wide |
| 1 | `case-heading` (h1 + caption + external link pill) | 220 | 153 | 692 (narrow) | title 36 px, caption 36 px muted, a pill that links to the client site |
| 2 | `case-offerings` (tag pills) | 539 | 40 | 1048 | 2 pills |
| 3 | `case-hero` | 608 | 590 | 1048 (wide) | **video**, 1918x1080, 28.8 s, autoplay, muted, loop, with a play/pause cursor control |
| 4 | gallery 1, `twoImagesBlock` 6+6 | 1218 | 685 | 2 x 514 | 3:4 video (1080x1350, 2.3 s) + 3:4 image |
| 5 | gallery 2, `imageBlock` | 1923 | 589 | 1048 | 16:9 video (1920x1080, 5.1 s) |
| 6 | gallery 3, pair | 2532 | 685 | 2 x 514 | 3:4 video 8.2 s + 3:4 video 25.5 s |
| 7 | gallery 4, full | 3238 | 589 | 1048 | 16:9 video 8.0 s |
| 8 | gallery 5, pair | 3847 | 685 | 2 x 514 | 3:4 image + 3:4 image |
| 9 | gallery 6, full | 4552 | 589 | 1048 | 2880:1620 image |
| 10 | gallery 7, pair | 5161 | 685 | 2 x 514 | 3:4 image + 3:4 image |
| 11 | `case-credits` | 5846 | 187 | 1048 | 2 groups: Typography (typeface + foundry link), Web Development (developer link) |
| 12 | `case-next` (next project: **Sandbox**) | 6033 | 580 | 1048 | label, title, and a cover video that rises and grows |

No intro prose on this page (the other three are split: March 2004 and Mira have one, Notom has none).

**Media mix (observed after full scroll):** 1 hero video + **11 gallery slots = 5 videos + 6 images**, plus
1 next-project cover video. Every gallery video is muted, looped, has no controls, and plays only while it is
near the viewport (all were `paused` once scrolled past). Images are lazy `next/image` WebP at 518x648
(half slots) or 1051x591 (full). Media sit on a transparent background with a 5 px radius and a
`clip-path: inset(0 round 5px)`.

**Layout system (declared and observed):**
- Two column widths: **narrow 692 px** (heading, prose, next-cover start size) and **wide 1048 px** (media).
  The wide column is a 12-column grid, columns 68.95 px with 20 px gutters. Pairs are `span 6 + span 6`, so each
  half is 514 px.
- Gallery is a flex column with **20 px** gaps (`--nap-media-gap`). The first gallery item has 20 px above it.
- Pacing: the page alternates **portrait pair (685 px) / landscape full (589 px)** seven times, so each scroll step
  of about 600-700 px brings one new block. At the capture's scroll speed (about 660 px/s) a new block revealed every
  **969 ms** (median of 7 intervals).
- At 390 everything is one column 350 px wide (20 px side margins). Pairs stack (945 px tall), gaps become **12 px**.

**Hero video control (observed, declared):** a transparent `button` covers the hero. With a fine pointer it
hides the system cursor (`cursor:none`) and shows a fixed pill that follows the mouse with a pause/play icon.
With touch it is pinned at bottom-left, 12 px in. The pill fades out in 160 ms when the pointer leaves.

**Sticky title pill (observed):** once the tag row has scrolled off the top, a pill with the project title
appears in the site nav (desktop) or the bottom dock (mobile). Clicking it scrolls to top (`behavior: smooth`).
Hovering it reveals a second pill that links to the client site.

**Next project (observed, declared):** the last 580 px. A label "Next Project" and the next title sit
above a cover clipped inside a 384 px stage. Near the bottom the cover rises and grows. One more deliberate
scroll at the very bottom **navigates to the next project** (section 3.H).

---

## 2. Motion inventory

All animations are CSS animations and CSS transitions on a `DocumentTimeline`. **No ScrollTimeline, no WAAPI
choreography, no per-frame JS writes to transform or opacity** on this page (the 102 styleWrites at 1440 are all
custom properties and widths). JS only flips attributes (`data-in-view`, `data-visible`, `data-phase`) and sets
a few custom properties once. Lenis (site-wide, declared `duration 1, easing 1.001 - 2^(-10t), wheelMultiplier 1.1`)
drives the window scroll on desktop. It accounts for the 2704 rAF calls at 1440. On 390 rAF counted only 68 and
`scrollY` moved in exact 120 px wheel steps, so no smoothing was **observed** on mobile.

### Motion table

| # | Effect | Trigger | Property | From → to | Duration | Delay / stagger | Easing (declared) | Status |
|---|---|---|---|---|---|---|---|---|
| A | Heading cascade (`case-arrive`) | mount | opacity, translateY | 0 → 1, 12 → 0 px | 600 ms | `--case-delay` = **85 ms x index**: h1 0, caption 85, link 170, tags 255 and 340, hero 425 | cubic-bezier(.22,1,.36,1), on keyframes | observed + declared |
| B | Gallery / credits pre-hide | hydration adds `.case-has-reveal` | opacity, translateY | 1 → 0, 0 → 20 px | 500 / 600 ms | — | `ease` / (.22,1,.36,1) | observed (below the fold, so never seen) |
| C | Gallery / credits reveal | IntersectionObserver, `rootMargin 0 0 -30px 0`, threshold 0.01, **one-shot** (`unobserve`) | opacity, translateY | 0 → 1, 20 → 0 px | **500 ms** opacity, **600 ms** transform | none between blocks; both halves of a pair move as one item | opacity `ease`, transform (.22,1,.36,1) | observed + declared |
| D | Media loading veil | media ready | opacity of `.nap-media-loading` | 1 → 0 | 320 ms | — | (.22,1,.36,1) | observed (site-wide) |
| E1 | Sticky title, desktop: slot opens | `.case-offerings` bottom ≤ 0 (IntersectionObserver `threshold [0,1]`) | `#nap-project-nav-slot` width, margin-left | 0 → 138.1 px, 0 → 10 px | 240 ms | 0 | (.22,1,.36,1) | observed |
| E2 | Sticky title, desktop: pill drops in | same | translateY, opacity, visibility | −80 → 0 px, 0 → 1 | 280 ms / 160 ms | **240 ms** (waits for the slot) | (.22,1,.36,1) / ease | observed + declared |
| E3 | Sticky title, mobile: dock rises | same | bottom pill width, slot width, translateY, opacity | pill 174 → 350 px, slot 0 → 183.1 px, 150 → 0 px, 0 → 1 | slot 280 ms, rise 450 ms, fade 250 ms | 0 | (.22,1,.36,1) / ease | observed |
| E4 | Mobile dock leaves near the footer | `.case-next` within 120 px (IO `rootMargin 0 0 120px 0`) | header-actions translateY | 0 → 76 px (`100% + 40px`) | 280 ms | visibility flips at 280 | (.22,1,.36,1) | observed |
| F | Next-project rise | remaining scroll ≤ **160 px** (reverses when > **220 px**) | `translate` Y of the cover | 180 → 0 px | **702 ms** (900 x .78) | 0 | (.22,.7,.25,1) | observed + declared |
| G | Next-project grow | same | `scale` | **0.660298 → 1** (heading width / stage width = 692/1048; 0.78 on mobile) | **576 ms** (900 x .64) | **126 ms** (900 x .14) | (.3,0,.2,1) | observed + declared |
| H | Next-project label | same | opacity, translateY | 0 → 1, 8 → 0 px | **198 ms** (900 x .22) | **702 ms** (after the rise) | (.22,1,.36,1) | observed + declared |
| I | Pull to next project | at bottom (≤ 3 px left), phase `ready`, first input ≥ 360 ms after the previous one | link translateY = −pull | 0 → −60 px, instant per event | — | — | none (stepped) | observed + declared |
| J | Route change to next project | pull reaches 60 | View Transition: cover group, title group, old root | cover morph to the next hero, radius 19 → 5 px, old page fades | cover and title **1100 ms**, root group 250 ms, old-root fade **200 ms** | — | (.66,0,.25,1); fade `ease` | observed + declared |
| K | External link pill expand (hover/focus) | `:hover` | label width, label opacity, pill inset | 0 → 173.7 px, 0 → 1, 0 → −2 px | 380 ms / 180 ms / 250 ms | opacity 80 ms | (.3,0,.2,1) / ease / (.22,1,.36,1) | observed |
| L | Hero cursor pill | pointer leave | opacity, visibility | 1 → 0 | 160 ms | visibility at 160 | ease | observed |
| M | Header "work with us" and notification pills (hover) | hover | width 127 → 173.9 px, inset −2 px | 380 / 250 ms | — | (.3,0,.2,1) / (.22,1,.36,1) | observed (site-wide) |
| N | Mobile header-actions open (WAAPI) | mount | width 32 → 174 px | 550 ms | — | (.6,0,.25,1) | observed (site-wide, the only `Element.animate` call) |

`prefers-reduced-motion: reduce` turns all of A–H off (`animation:none!important; transition:none!important`).
The next cover then sits at full size with its label visible (**declared**).

### Easing metrics (declared curves, verified against samples)

| Curve | Used by | Peak velocity at | Peak / average speed | Overshoot | 50 % / 90 % reached | Settles within 1 % at 60 fps |
|---|---|---|---|---|---|---|
| (.22,1,.36,1), 600 ms | A, C transform | **0 %** (starts at full speed) | 4.54x | none | 79 / 224 ms | frame 24 of 36 (400 ms) |
| `ease`, 500 ms | C opacity | 21 % | 2.29x | none | 147 / 312 ms | frame 27 of 30 (450 ms) |
| (.22,.7,.25,1), 702 ms | F | 5 % | 3.26x | none | 114 / 325 ms | frame 34 of 43 (567 ms) |
| (.3,0,.2,1), 576 ms | G | 24 % | 2.56x | none | 180 / 359 ms | frame 31 of 35 (517 ms) |
| (.22,1,.36,1), 198 ms | H | 0 % | 4.54x | none | 26 / 74 ms | frame 8 of 12 |
| (.22,1,.36,1), 240 / 280 ms | E1 / E2 | 0 % | 4.54x | none | 32 / 90 ms, 37 / 105 ms | frame 10 of 15, 12 of 17 |
| (.22,1,.36,1), 450 ms | E3 rise | 0 % | 4.54x | none | 59 / 168 ms | frame 18 of 27 |
| (.66,0,.25,1), 1100 ms | J | 46 % | 3.41x | none | 513 / 744 ms | frame 59 of 66 (983 ms) |
| Lenis expo-out, 1000 ms | scroll | 0 % | 6.91x | none | 100 / 331 ms | frame 40 of 60 |

Nothing on this page overshoots. Every entrance is a decelerating curve that starts at or near peak speed,
except the grow (G) and the route morph (J), which ease in as well.

---

## 3. Measured curves

### A. Heading cascade (1440, observed every frame)

Start and end of each element, first sample with opacity > 0 → first sample at ≥ 0.999:

| Element | Declared delay | Started | Finished |
|---|---|---|---|
| h1 | 0 | 272 ms | 754 ms |
| caption | 85 | 397 | 814 |
| link pill | 170 | 469 | 909 |
| tag 1 / tag 2 | 255 / 340 | 593 / 593 | 972 / 1064 |
| hero | 425 | 750 | 1160 |

So the whole heading block lands about **1.16 s** after navigation. At 390 the same cascade ran from 512 to 1295 ms.
Sampled h1 (t from its first frame): 0.223 opacity / 9.3 px at +46 ms, 0.416 / 7.0 px at +146 ms,
0.780 / 2.6 px at +171 ms, 0.927 / 0.9 px at +259 ms, 0.987 / 0.15 px at +373 ms, 1.000 / 0 at +528 ms.

### C. Gallery reveal (1440, gallery block 1, observed vs declared model)

Fitted start offset: −1 ms. Opacity uses `ease` over 500 ms. Translate is 20·(1 − (.22,1,.36,1)) over 600 ms.

| t after trigger (ms) | opacity measured | model | translateY measured (px) | model |
|---|---|---|---|---|
| 0 | 0.000 | 0.000 | 20.000 | 20.000 |
| 31 | 0.046 | 0.044 | 15.500 | 15.659 |
| 63 | 0.137 | 0.134 | 11.698 | 11.775 |
| 96 | 0.268 | 0.273 | 8.555 | 8.467 |
| 126 | 0.410 | 0.406 | 6.160 | 6.213 |
| 157 | 0.537 | 0.535 | 4.390 | 4.419 |
| 188 | 0.646 | 0.644 | 3.077 | 3.091 |
| 220 | 0.734 | 0.733 | 2.128 | 2.140 |
| 284 | 0.858 | 0.860 | 0.988 | 0.970 |
| 500 | 1.000 | 1.000 | 0.016 | 0.016 |
| 594 | 1.000 | 1.000 | 0.000 | 0.000 |

Max error 0.005 opacity and 0.16 px. All 7 blocks plus the credits produced the same series to within 0.002.

**Trigger position (observed):** the declared threshold is "top passes 30 px above the viewport bottom", which would be
y = 870 at vh 900. Measured block tops on the trigger frame were **810–838 px** (median 827), i.e. **62–90 px**
above the bottom. The difference is IntersectionObserver delivery lag plus Lenis moving about 20–35 px per frame at
660 px/s. So a block is already about 7–10 % into view when it starts to fade, and it finishes its translate while
travelling another 300–400 px up the screen. At 390 (native 120 px steps) tops ranged 676–782.

### E. Sticky title (1440, observed)

The pill became visible on the frame where `scrollY` = 599. The tag row's bottom is at y = 579, so that is one frame late,
consistent with the trigger being "offerings bottom ≤ 0".

Nav slot width (E1): 0 → 69.3 (+30 ms) → 107.9 (+61) → 125.9 (+92) → 133.6 (+124) → 136.8 (+154) → 138.1 (+217).
Pill (E2, starts 250 ms after the slot): translateY −67.4 / opacity 0.046 (+0), −36.3 / 0.425 (+30), −17.6 / 0.753 (+61),
−8.1 / 0.916 (+93), −3.6 / 0.986 (+124), −1.4 / 1 (+155), −0.09 (+216), 0 (+280).

Mobile dock (E3, 390): translateY 150 → 106.7 (+31) → 71.6 (+64) → 46.4 (+94) → 29.5 (+125) → 18.2 (+158) → 11.0 (+189) → 3.7 (+251)
→ 0.9 (+314) → 0 (+437). Opacity reached 1 at +251 ms. The bottom pill widened 174 → 350 px in 125 ms. The slot
widened 0 → 183.1 px over 250 ms.

### F–H. Next-project reveal (1440, observed vs declared)

Trigger: phase changed to `revealing` at `scrollY` 5582, which is **131 px** before the end (declared ≤ 160). Fitted start: frame 0 = +31 ms.

| t (ms) | translate Y measured | model | scale measured | model |
|---|---|---|---|---|
| 31 | 154.3 | 154.3 | 0.6603 | 0.6603 |
| 93 | 104.0 | 104.7 | 0.6603 | 0.6603 |
| 155 | 65.3 | 65.7 | 0.6641 | 0.6639 |
| 218 | 40.5 | 40.9 | 0.7070 | 0.7056 |
| 280 | 25.3 | 25.5 | 0.7950 | 0.7936 |
| 343 | 15.6 | 15.6 | 0.8739 | 0.8735 |
| 406 | 9.2 | 9.2 | 0.9259 | 0.9262 |
| 499 | 3.6 | 3.6 | 0.9711 | 0.9709 |
| 593 | 0.9 | 0.9 | 0.9928 | 0.9927 |
| 686 | 0.01 | 0.02 | 0.9999 | 0.9999 |
| 718 | 0 | 0 | 1 | 1 |

Max error 0.7 px and 0.0017 scale. The cover's rendered width went 691.7 → 1047.6 px. So it starts exactly as wide as
the heading column and grows to the media column: the next project "opens" from the reading width to the image width.
Label (H): opacity 0.345 / 5.2 px at +688 ms after trigger, 0.753 / 2.0 at +719, 0.917 / 0.67 at +750, 0.995 at +811,
1.0 at +874. Phase became `ready` at +905 ms (declared 900).
Mobile (390): identical translate series (154.25 at the first frame), scale 0.78 → 1, cover 273 → 350 px.

### I–J. Pull to the next project (1440, observed)

At the bottom, after a 600 ms pause: wheel 30 px → `--next-pull` 30, link translateY −30, phase `pulling`.
The second 30 px → pull 60 → phase `leaving`, and navigation to `/work/sandbox` started within 80 ms.

From the code (**declared**): pull = clamp(pull + deltaY, 0, 60). Navigation fires at exactly 60. A first push counts only if
≥ 360 ms have passed since the last input, so leftover momentum from scrolling down cannot trigger it. One real wheel
notch (100–120 px) is therefore enough after a short pause. ArrowDown adds 20, PageDown or Space adds 60 (navigates at once).
On touch, drag distance counts the same way. The next route is prefetched as soon as the section is within 1600 px.

View Transition, sampled (`document.getAnimations()` incl. pseudo-elements):

| Animation | Duration | Notes |
|---|---|---|
| `::view-transition-group(nap-project-cover)` | **1100 ms** | progress linear in timing, eased by keyframes with (.66,0,.25,1); finished at +1100 |
| `::view-transition-group(nap-project-title)` | 1100 ms | the next title morphs with the cover |
| `::view-transition-group(root)` | 250 ms | |
| `::view-transition-old(root)` `case-root-out` | 200 ms | old page fades to 0 |
| `::view-transition-image-pair(nap-project-cover)` `nap-project-rounding` | 1100 ms | radius `--nap-transition-start-radius` (19 px) → `--nap-transition-end-radius` (the hero's 5 px) |

After the morph, the new page's nav slot opens again (E1, 240 ms), and the new gallery's items transition (B/C) at about
+1150 ms. Whether those are the pre-hide or a reveal is **unknown** from the samples, because progress does not carry direction.

---

## 4. What differs from the site-wide system

| Site-wide (other routes) | Case pages (this page) |
|---|---|
| Page entrance `nap-page-enter`: 600 ms, (.22,1,.36,1), translateY 12 px, one block | Same curve and distance, renamed `case-arrive`, but **staggered per element at 85 ms** and paused while a cover transfer is in progress (`data-arriving`) |
| No scroll reveals on `/about` and `/journal` (only `nap-index-in` cards on `/journal` and `/work`) | **One-shot reveal per gallery block** (20 px, 500/600 ms), trigger 30 px inside the bottom edge |
| Index → project: cover morph 1100 ms (.66,0,.25,1) | The **same morph runs in reverse direction from the bottom** of a case page: the next-project cover becomes the next page's hero |
| Nav pills: fixed header group | A **4th nav pill** (project title) is spliced into the header group on desktop, or the bottom dock on mobile, after the tags scroll away |
| — | **Pull-to-navigate** state machine (60 px, 360 ms gesture gap). Not on any other route |
| Curves in use site-wide: (.22,1,.36,1), (.3,0,.2,1) for width expansions, `ease` for opacity | Adds (.22,.7,.25,1) for the next-cover rise. Nothing else new |

## 5. Spacing and type (deltas from site-wide)

| Token | 1440 | 390 | Note |
|---|---|---|---|
| Page top padding (`case-study`) | 130 px (heading at y 220 under the 90 px header) | 84 px (heading at y 160) | |
| Display type (title, caption) | **36 px / 42.48 (1.18), weight 600**, tracking 0.01 em (0.36 px) | 24 px / 28.32 | Site display line-height is 1.2. Case headings use 1.18 |
| Caption colour | muted `oklch(78.3% .018 242)` | same | Ink is `oklch(31.3% 0 0)` |
| Body UI type | 14 px / 18.2 (1.3), weight 500 | same | pills, credits, labels |
| Tag pills | 40 px tall, radius 19 px, 8 px gap, padding 9/20 | 36 px, radius 17 px, padding 8/16 | |
| Heading → tags | **165 px** above, 29 px below | 100 / 20 px | |
| Hero | 1048 x 590, radius 5 | 350 x 197 | |
| Gallery gap | **20 px** | **12 px** | `--nap-media-gap` |
| Grid | 12 cols x 68.95 px, 20 px gutter, wide 1048 / narrow 692 | 1 col, 350 px | |
| Credits | padding-top 80, 30 px between groups, h3 muted with 2 px below | padding-top 50 | |
| Next project | padding-top 220, stage 384 px (360 + 24 clearance), label 14 px muted with 12 px below | padding-top 100 | |
| Media radius | 5 px everywhere, next cover uses the pill radius (19 px) | | |

## 6. Outbound links

| Link | Where | Opens |
|---|---|---|
| `https://georgedaviesstudio.com` (x2: heading pill, sticky pill) | client site | new tab, `noopener noreferrer` |
| `https://kimeracorp.eu/` | credits, Typography (foundry) | new tab |
| `https://roko-g.work/` | credits, Web Development | new tab |
| `/work/sandbox` | next project | in-app, View Transition |
| `https://www.newapology.com/work/et-al` | site-wide notification bubble (CMS notice, expires 2026-12-10) | same tab |
| `/`, `/work`, `/about`, `/journal` | site nav | in-app |

Notes on linked live sites are in `sites/georgedaviesstudio.com.md` and `sites/roko-g.work.md`.
