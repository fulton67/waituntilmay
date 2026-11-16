# /work/pavlo-lotnik — case-study page

Study notes only. Nothing from newapology.com ships: no code, CSS, class names, fonts, images or copy.
Titles, tags and credit names are listed as data so the structure is readable.

This page uses the same case-study template and motion system as `/work/george-davies`. **`work__george-davies.md`
is the reference write-up for that template.** Site-wide systems (Lenis, header, view transitions) are in `site.md`.
This file has this page's own measured numbers and per-frame curves. It is also the reference for the other three
pages in this batch (`work__pinto.md`, `work__sandbox.md`, `work__soft-union.md`).

What is particular to Pavlo Lotnik:
- the **hero is a video**;
- one gallery block is a **68 s video with a cursor play/pause control**. It is the only controlled video in this batch,
  and the control sits on a gallery block, not on the hero;
- a **client-site link pill** with a hover expand;
- the **shortest** page of the four: 8.0 screens at 1440.

## Sources

| What | File |
|---|---|
| Runtime capture (marks, facts, getAnimations, styleWrites) | `runtime/work__pavlo-lotnik_1440.json`, `runtime/work__pavlo-lotnik_390.json` |
| Per-frame computed-style sampler (load cascade, Lenis tick, gallery reveals, sticky, next reveal and hide, pull, link pill hover) | `runtime_extra/frames_work__pavlo-lotnik_{1440,390}.json`. Script: `tools/frames_case.mjs`, same launch settings as `tools/capture.mjs` |
| Video cursor probe (pointer vs pill every frame, two clicks) | `runtime_extra/cursor_work__pavlo-lotnik_1440.json` (`tools/cursor_probe.mjs`) |
| Media inventory after all lazy blocks mounted | `runtime_extra/media_pavlo-lotnik+pinto+sandbox+soft-union_1440.json` (`tools/media_case.mjs`) |
| Saved HTML, CSS, page chunk | `extracted/page_work_pavlo-lotnik.html`, `extracted/_next/static/css/6f399c267a4ae1fc.css`, `chunks/app/work/%5Bslug%5D/page-f72fca6efa960802.js`, state machine `chunks/4428-9918e630fbcee588.js` (module `11206`) |
| Session videos (25 fps). Mapping checked by reading the title in a frame | 1440: `runtime/video/49d690ba2c4da579c3e8d87edb06e3ae.webm`; 390: `runtime/video/6bf9b21f6452225b10251c307d50bfc7.webm` |

**Measurement notes.**
- Headless Chromium delivered rAF at **~32 fps** (median frame 31.3 ms), so every curve is sampled every ~31 ms.
- Each curve was fitted against its declared CSS curve. "Frames to settle" are computed at 60 fps from the declared curve
  once the samples confirmed it.
- Times are in the page clock (`performance.now()`).
- Labels: **observed**, **declared** (read from CSS/JS), **inferred**, **unknown**.

---

## 1. Page structure

Title `Pavlo Lotnik`. Caption "A bilingual portfolio". Tags: Visual Identity, Digital Design.

Document height:

| Width | docH | Screens | Elements rendered |
|---|---|---|---|
| 1440 x 900 | **7176 px** | 8.0 | 144 |
| 390 x 844 | **5352 px** | 6.3 | 139 |

Top to bottom at 1440. Document y and height are **observed** after reveal; the +20 px pre-reveal offset is removed.

| # | Block | y | h | Content |
|---|---|---|---|---|
| 0 | site header | 0 | 90 | site-wide; no footer on case pages |
| 1 | heading: h1, caption, link pill | 220 | **153** | 692 px narrow column, centred. The pill links to the client site |
| 2 | tags | 539 | 40 | 2 pills |
| 3 | hero 16:9 | 608 | 589 | **video** 1920x1080, **9.0 s** loop, muted, no control |
| 4 | intro prose | 1198 | 547 | 45 words, 26/31.2 px, 180 px padding above and below |
| 5 | pair 3:4 + 3:4 | 1745 | 685 | image + image |
| 6 | full 3:2 (2000:1333) | 2450 | 698 | image |
| 7 | pair 4:5 + 4:5 | 3168 | 642 | **video** 1080x1216 5.3 s + **video** 1080x1350 13.6 s |
| 8 | full 16:9 | 3830 | 589 | **video 1620x1080, 68.05 s, with the cursor play/pause control** (`controls: true` in the CMS) |
| 9 | full 3:2 | 4439 | 698 | image |
| 10 | pair 4:5 + 4:5 | 5157 | 642 | image + image |
| 11 | full 16:9 | 5819 | 589 | image |
| 12 | credits | 6409 | 187 | Typography: "KTF Metro by Kyiv Type Foundry" (foundry linked). Web Development: one name, **not linked** |
| 13 | next project: **Auro** | 6596 | 580 | cover 2805:1579, **image** |

**Media mix (observed):**
- hero video;
- **10 gallery slots = 3 videos + 7 images** (4 blocks are single, 3 are pairs);
- next cover image.

The runtime counted 4 `<video>` and 8 `<img>` after the full scroll.
- **Gallery videos.** Muted, `loop`, `preload=metadata`, no `autoplay` attribute. A per-video IntersectionObserver
  (`rootMargin 120px`) calls `play()` when the video is near the viewport and `pause()` when it leaves. After scrolling
  past, all were `paused: true` (**observed**).
- **Images.** Lazy `next/image` WebP/JPG at 518 px wide (half slots) or 1051 px (full slots).
- **Load veil.** Each slot first shows a flat colour veil, picked from the image's Sanity palette by hashing the asset id
  (**declared**).

**Layout system** (template, **observed**):
- Two widths: narrow **692 px** (heading, prose, next-cover start size) and wide **1048 px** (media).
- The wide column is a 12-column grid: 68.95 px columns, 20 px gutters. Pairs are `span 6 + span 6`, 514 px each.
- Gallery is a flex column, gap **20 px**.
- At 390 everything is one 350 px column. Pairs stack: 945 px for 3:4, 887 px for 4:5. The gap becomes **12 px**.

**Pacing while scrolling.**
- After the intro prose, the page **alternates pair / full**, P F P F F P F. The middle has two full-width blocks in a row:
  the controlled film, then a 3:2 still.
- At 1440 a screen holds about 1.3–1.5 blocks.
- The capture scrolled at 482 px/s (100 px wheel every 140 ms through Lenis). A block revealed every **1282 ms** (median
  of 7 intervals).
- At 390 the blocks are shorter (197–945 px). They revealed every **626 ms** at 455 px/s.
- The page front-loads its motion: 2 of the 3 gallery videos sit in the middle pair (block 7), right before the long film
  (block 8).

---

## 2. Motion inventory

All motion is CSS animations and CSS transitions on a `DocumentTimeline`.
- **No ScrollTimeline**, no WAAPI choreography on this page (the one `Element.animate` call at 390 is the site-wide header
  bar), and **no per-frame JS transform/opacity writes**.
- The 84 styleWrites at 1440 break down as:
  - 34 on the header "work with us" pill;
  - 36 on the play/pause icon custom properties;
  - the rest one-off custom properties: `--next-initial-scale`, `--project-tag-width`, `--case-link-label-width`.
- JS only flips `data-in-view`, `data-visible`, `data-footer-near` and `data-phase`.
- rAF: 1628 calls at 1440 (Lenis), 57 at 390.

### Motion table (values observed on this page)

| # | Effect | Trigger | Property, from → to | Duration | Delay / stagger | Easing (declared, confirmed) | Status |
|---|---|---|---|---|---|---|---|
| A | Heading cascade `case-arrive` | mount | opacity 0 → 1, translateY 12 → 0 px | 600 ms | **85 ms x index**: h1 0, caption 85, link 170, tags 255/340, hero 425, prose 510 | (.22,1,.36,1) | observed + declared |
| B | Gallery/credits pre-hide | hydration adds `.case-has-reveal` | opacity 1 → 0, translateY 0 → 20 | 500 / 600 ms | — | ease / (.22,1,.36,1) | observed (below the fold, never seen) |
| C | Gallery/credits reveal | IO `rootMargin 0 0 -30px 0`, threshold .01, one-shot | opacity 0 → 1, translateY 20 → 0 | **500 / 600 ms** | none; a pair moves as one item | `ease` / (.22,1,.36,1) | observed + declared |
| D | Media load veil | media ready | `.nap-media-loading` opacity 1 → 0 | 320 ms | — | (.22,1,.36,1) | observed (first at 609 ms) |
| E1 | Sticky title, desktop: nav slot opens | `.case-offerings` bottom ≤ 0 | slot width 0 → **121.4 px**, margin-left 0 → 10 | 240 ms | 0 (closing: 140 ms delay) | (.22,1,.36,1) | observed |
| E2 | Sticky title, desktop: pill drops in | same | translateY −80 → 0, opacity 0 → 1 | 280 / 160 ms | **240 ms** | (.22,1,.36,1) / ease | observed |
| E3 | Sticky, 390: dock pill rises | same | slot 0 → **166.4 px** (title + link pill side by side), translateY 150 → 0, opacity | slot 280, rise 450, fade 250 ms | 0 | (.22,1,.36,1) / ease | observed |
| E4 | Sticky leaves | offerings back in view | translateY 0 → −80, opacity → 0, slot → 0 | 180 / 120 ms; slot 240 ms after 140 ms | — | (.22,1,.36,1) / ease | observed |
| F | Next cover rise | remaining scroll ≤ **160 px** (reverses at > **220**) | `translate` Y 180 → 0 | **702 ms** | 0 | (.22,.7,.25,1) | observed |
| G | Next cover grow | same | `scale` **0.660298 → 1** (= 692/1048); **0.78** at 390 | **576 ms** | **126 ms** | (.3,0,.2,1) | observed |
| H | Next label | same | opacity 0 → 1, translateY 8 → 0 | **198 ms** | **702 ms** | (.22,1,.36,1) | observed |
| F–H reverse | Next hides | remaining > 220 px | same animations, `playbackRate −1` from the current time | 900 ms total | — | mirrored | observed |
| I | Pull to next project | at bottom (≤ 3 px), phase `ready`, first input ≥ 360 ms after the previous | `.case-next__link` translateY = −pull, 1:1, **stepped, no easing**, 0 → −60 px | — | — | none | observed |
| J | Route change to Auro | pull = 60 | View Transition: cover group + title group 1100 ms, root group 250 ms, old root fade 200 ms, cover radius morph 1100 ms | — | — | (.66,0,.25,1) / ease | observed (getAnimations at +80 ms) |
| K | Link pill expand (hover/focus) | `:hover` | label width 0 → **114.4 px**, label opacity 0 → 1, pill `::before` inset 0 → −2 px | 380 / 180 / 250 ms | opacity 80 ms on enter, 0 on leave (120 ms) | (.3,0,.2,1) / ease / (.22,1,.36,1) | observed |
| L | Video cursor pill (block 8) | pointer over the video (fine pointer) | fixed pill 53 x 40 at the pointer, opacity 0 → 1 | **instant** while following; **160 ms** fade on leave | — | ease (leave) | observed |
| L2 | Play/pause icon | video play state | icon swap: 2 pause bars ↔ play triangle (`rotate: 90deg` on the mask) | instant (custom-property write) | — | — | observed |
| M | Header pills hover, mobile header bar | site-wide | see `site.md` §4B, §5 | | | | |

`prefers-reduced-motion: reduce` disables A–H and the sticky transitions (**declared**).

### Easing metrics (declared curves, computed; samples match)

| Curve | Used by | Peak velocity at | Peak / mean speed | Overshoot | 50 % / 90 % / 99 % of duration | Settles at 60 fps |
|---|---|---|---|---|---|---|
| (.22,1,.36,1) | A, C transform, E, H, K inset, D | **0 %** | 4.54x | none | 13 / 37 / 65 % | 12 px / 600 ms: within 0.5 px at frame 18 (300 ms). 20 px / 600 ms: frame 20 (333 ms). 80 px / 280 ms: frame 12 |
| `ease` | C opacity, E2 opacity | 21 % | 2.29x | none | 29 / 62 / 87 % | 500 ms: within 1 % at frame 27 (450 ms) |
| (.22,.7,.25,1) | F | 5 % | 3.26x | none | 16 / 46 / 79 % | 180 px / 702 ms: within 0.5 px at frame 38 (633 ms) |
| (.3,0,.2,1) | G, K width | 24 % | 2.56x | none | 31 / 62 / 87 % | G: 356 px of growth / 576 ms, frame 33 (550 ms). K: 114 px / 380 ms, frame 21 (350 ms) |
| (.66,0,.25,1) | J | 46 % | 3.41x | none | 47 / 68 / 88 % | 1100 ms, 66 frames |
| Lenis expo-out `1.001 − 2^(−10t)` | wheel scroll, 1000 ms per event | 0 % | ~6.9x | none | 7 / 33 / 66 % | — |

---

## 3. Measured curves (1440 unless noted)

### A. Heading cascade

First sample with opacity > 0, then first sample at ≥ 0.999 with translate < 0.05 px. FCP was 676 ms. Start times are
noisy at 32 fps. The finish times follow the 85 ms ladder: steps of 94, 64, 92, 93, 63, 94 ms, mean **83 ms**.

| Element | Declared delay | Started | Finished |
|---|---|---|---|
| h1 | 0 | 344 | 796 |
| caption | 85 | 447 | 890 |
| link pill | 170 | 498 | 954 |
| tag 1 / tag 2 | 255 / 340 | 726 / 726 | 1046 / 1139 |
| hero (video) | 425 | 789 | 1202 |
| intro prose | 510 | 827 | **1296** |

h1 samples (t from its first non-zero frame), opacity / translateY:

| t | 0 ms | +103 | +154 | +227 | +382 | +452 | +514 |
|---|---|---|---|---|---|---|---|
| opacity / px | 0.222 / 9.33 | 0.690 / 3.72 | 0.846 / 1.85 | 0.927 / 0.88 | 0.987 / 0.15 | 0.999 / 0.01 | 1 / 0 |

At 390 the cascade finished at 734 → 1234 ms.

### Lenis, one 100-delta wheel tick (observed)

`scrollY` relative to start: +6 (45 ms), +11 (76), +14 (108), +18 (139), +20 (170), +22 (201), +24 (232), +26 (295),
+27 (326), +29 (451), +30 (576), flat after.
- Normalised, that is 0.20 / 0.37 / 0.47 / 0.60 / 0.73 / 0.80 / 0.90 / 0.97 / 1.0. It matches `1.001 − 2^(−10t)` over
  1000 ms within one sample (~10 ms lag).
- The total was 30 px, not 110 (100 x 1.1). The page had been restored to scrollY 80 while Lenis's internal target was
  still 0, so only the remainder was animated (**inferred**).
- At 390 the wheel was **not smoothed**: `scrollY` moved in exact 100 px steps (**observed**).

### C. Gallery reveal (block 2, the 3:2 still)

| t after trigger frame (ms) | 0 | 31 | 63 | 93 | 125 | 156 | 187 | 218 | 250 | 312 | 375 | 438 | 500 | 594 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| opacity | 0 | .045 | .137 | .265 | .408 | .537 | .644 | .732 | .802 | .901 | .960 | .991 | 1 | 1 |
| translateY px | 20 | 15.57 | 11.70 | 8.61 | 6.18 | 4.40 | 3.10 | 2.15 | 1.47 | 0.65 | 0.26 | 0.08 | 0.016 | 0 |

- **Fit to the declared curves:** start offset 0 ms. Max error 0.029 px for the translate and 0.0008 for opacity.
  Blocks 3 and 5 fit within 0.16 px and 0.004.
- **Trigger position:** item tops on the trigger frame were **828–840 px** (median 834). The declared line is at
  870 (vh − 30), so blocks start 60–72 px into view. The gap is observer delivery plus ~20 px per frame of Lenis travel.
- At 390 tops were 686–785 against a line at 814.
- All **8 reveals** (7 blocks + credits) produced the same series.

### E. Sticky title

| Platform | Trigger | Slot width | Pill |
|---|---|---|---|
| Desktop | visible at scrollY **587**, offerings bottom −8 px | 0 → 59.7 (+30 ms) → 94.8 (+61) → 110.5 (+92) → 117.4 (+124) → 120.2 (+155) → 121.4 (+218) | opacity / translateY: 0.044 / −67.7 (+250), 0.421 / −36.5 (+280), 0.749 / −17.9 (+311), 0.915 / −8.2 (+343), 0.985 / −3.6 (+374), 1 / −1.4 (+405), 1 / 0 (+530) |
| 390 dock (`#nap-project-mobile-slot`) | visible at scrollY 500 | 0 → 166.4 px in 280 ms | translateY 150 → 0 in 450 ms (fit max error 0.19 px); opacity in 250 ms `ease` (error 0.002) |

- **Desktop fits:** slot max error 1.7 px; pill translate 0.96 px; opacity `ease` 160 ms after a 242 ms delay, error 0.012.
- **Leaving (desktop):** opacity 1 → 0.571 → 0.177 → 0.03 → 0 at +30/61/94/125 ms. The slot starts closing about
  140 ms later (**declared** delay .14 s).
- **Near the end:** `data-footer-near` turned true at scrollY 5581, when the next section came within 120 px of the
  viewport bottom. On desktop this changes nothing visible. On mobile the dock stays but goes non-interactive (**declared**).

### F–H. Next-project reveal and hide

- **Trigger:** phase `revealing` at scrollY 6122, **154 px** before the end. `ready` came 903 ms later.
- **Reverse:** scrolling back up 400 px switched to `hiding` at 255 px from the end. It ran the same animations
  backwards in 874 ms, then `hidden`.

| t (ms) | 0 | 34 | 60 | 93 | 124 | 155 | 187 | 249 | 310 | 404 | 498 | 591 | 654 | 685 | 716 | 747 | 811 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| translate Y px | 154.2 | 128.0 | 103.9 | 82.4 | 65.0 | 51.3 | 40.4 | 25.2 | 15.5 | 6.9 | 2.4 | 0.43 | 0.01 | 0 | | | |
| scale | .6603 | .6603 | .6603 | .6603 | .6643 | .6786 | .7072 | .7956 | .8741 | .9445 | .9806 | .9965 | .9999 | 1 | | | |
| cover width px | 692 | | | | 696 | 711 | 741 | 834 | 916 | 989 | 1027 | 1044 | 1047 | 1048 | | | |
| label opacity | 0 | | | | | | | | | | | | | .344 | .753 | .918 | .995 |

- **Fits:** rise max error 1.76 px, grow 0.0013, label 0.009. All three are offset −31 ms, so the animations started one
  sampled frame before the phase was read.
- **The hide is a true reverse.** The label is gone first (0.227 at +156 ms, 0 at +187). The scale returns to 0.6603 by
  +562 ms. The translate is back at 180 px at +688 ms.
- At 390 the start scale was **0.78**, the cover 273 → 350 px. The trigger fired at 108 px from the end and the hide at
  400 (one native 400 px wheel step).

### I–J. Pull and leave

- **Pull (observed):** with 2.5 s of idle at the bottom, five 12 px wheel events moved `--next-pull` 12 → 24 → 36 → 48
  → 60. The link translated −12 … −48 px, one step per event, with no smoothing.
- **Leave:** at 60 the phase went `leaving`. 108 ms later the route was `/work/auro` (client-side; the same document
  survived).
- **Transition animations seen at +80 ms (getAnimations):**

| Animation | Duration | Easing |
|---|---|---|
| `::view-transition-group(nap-project-cover)` | 1100 ms | (UA) |
| `::view-transition-group(nap-project-title)` | 1100 ms | (UA) |
| `nap-project-rounding` on the image pair | 1100 ms | (.66,0,.25,1) declared |
| `::view-transition-group(root)` | 250 ms | (UA) |
| `case-root-out` on the old root | 200 ms | ease |

  The arriving page's nav slot closed (width/margin 240 ms after 140 ms), and its gallery pre-hide ran.
- **390:** eight 12 px events gave only +6 each (48 total), so it did not navigate (**observed**). On touch the code
  adds the raw `touchmove` delta (**declared**).

### K. Link pill hover

Label width 0 → 3.5 → 16.5 → 39.1 → 61.2 → 78.3 → 90.3 → 99.1 → 105.2 → 109.5 → 112.2 → 113.8 → 114.36 px, sampled
every ~31 ms. Full width at **373 ms** (declared 380).

| Phase | Opacity | Width |
|---|---|---|
| Enter | reached 1 at ~217 ms (80 ms delay + 180 ms `ease`) | full at 373 ms |
| Leave | 1 → 0.57 → 0.18 → 0.03 → 0 within ~95 ms (`.12s ease`) | 114.4 → 0 in ~340 ms |

### L. Video cursor (block 8, `cursor_work__pavlo-lotnik_1440.json`)

- **Mechanism (observed):** a fixed, body-portalled pill (53 x 40, blurred glass) whose `left/top` are
  `--cursor-x/--cursor-y`, written in the pointer handler.
- **Lag:** across 21 moves in a 20-step drag and two jumps of 419 px, the pill centre equalled the pointer to within
  0.1 px **on the same frame**. No lerp, no spring.
- **Visibility:** it appeared with `transition:none` and faded out in 160 ms on leave. The system cursor is hidden over
  the video (`cursor:none`).
- **Clicks:** two clicks toggled `paused` true, then false.
- **Icon:** when the film scrolled into view during the main capture, the pause icon was written (playing). When it
  scrolled out, the play icon (rotate 90deg) was written.

---

## 4. What differs from the site-wide system and from the other case pages

Site-wide: the same deltas as every case page (George Davies §4). In short:
- 85 ms staggered `case-arrive` instead of the one-block `nap-page-enter`;
- one-shot gallery reveals;
- a project-title pill spliced into the nav;
- no footer;
- the pull-to-navigate machine;
- the shared-cover View Transition to the next project.

Within this batch:

| | Pavlo Lotnik | Pinto | Sandbox | Soft Union |
|---|---|---|---|---|
| Hero | **video** 9.0 s | image | video 4.4 s, taller (680 px) | image |
| Gallery blocks / slots | **7 / 10** | 18 / 24 | 9 / 11 | 15 / 22 |
| Gallery videos | 3 | 11 | 3 | 11 |
| Controlled video (cursor pill) | **yes, 68 s film** | no | no | no |
| Client link pill (+ hover K) | **yes** | no | no | yes |
| Tag pills (cascade length) | 2 (lands 1.30 s) | 4 (1.34 s) | 2 (1.19 s) | 4 (1.40 s) |
| Next cover | **image** (Auro) | video (Pavlo Lotnik) | video (Cole Ferguson) | video (Notom) |

## 5. Spacing and type deltas

Template values are in George Davies §5. This page measures:
- **Heading** 153 px (the link row is 40 px tall). Tags sit at y 539 and the hero at 608, 3 px lower than the two
  pages without a link.
- **Intro prose** 26/31.2 px weight 600, tracking 0.26 px, 180 px padding. 45 words make the block 547 px. At 390:
  20/24 px, 90 px padding, 420 px.
- **Display** 36/42.48 px, weight 600, tracking 0.36 px. Caption muted `oklch(78.3% .018 242)`. At 390: 24/28.32.
- **Credits** 187 px (2 groups, 30 px apart); 157 px at 390.
- **Full-width blocks** are 3:2 (698 px) as well as 16:9 (589 px). Pairs are 3:4 (685) and 4:5 (642).
- **Type histogram** (runtime facts): 14/18.2 w500 for UI (15 nodes), 36/42.48 w600 (2), 26/31.2 w600 (1), 14/18.2
  w650 (1). The same set as the other case pages.

## 6. Outbound links

| Link | Where | Opens |
|---|---|---|
| `https://pavlolotnik.com` (x2: heading pill, sticky hover pill) | client site | new tab, `noopener noreferrer` |
| `https://www.kyivtypefoundry.com/` | credits, Typography (foundry) | new tab |
| `/work/auro` | next project | in-app, pull or click, View Transition |
| `https://www.newapology.com/work/et-al` | site-wide notification bubble, injected at runtime (not in the saved HTML) | same tab |
| `/`, `/work`, `/about`, `/journal` | site nav | in-app |

Notes on the client site: `sites/pavlolotnik.com.md`. The web-development credit (`sites/davidshamiev.site.md`) is not
linked on this page.
