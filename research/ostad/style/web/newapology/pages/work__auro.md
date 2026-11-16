# /work/auro — case-study page

Study notes only. Nothing from newapology.com ships: no code, CSS, class names, fonts, images or copy.
Titles, tags and credit names appear as data so the structure is readable.

Auro, Cellar, Cole Ferguson and ET AL use the same case-study template as `/work/george-davies`.
`work__george-davies.md` has the full template motion table and the easing metrics. **This file has the
per-frame curve tables for this batch of four**: heading cascade, gallery reveal, sticky title, next-project
reveal, and the pull-to-next View Transition, which this run drove to completion on all four pages.
`work__cellar.md`, `work__cole-ferguson.md` and `work__et-al.md` point back here.

## Sources

| What | File |
|---|---|
| Runtime capture (marks, facts, getAnimations, styleWrites) | `runtime/work__auro_1440.json`, `runtime/work__auro_390.json` |
| Per-frame probe (new): computed opacity/transform/translate/scale of every heading element, gallery block, sticky pill and next-project layer, sampled every rAF only when they change; `data-in-view` / `data-phase` / `data-visible` events; wheel pull to the next project; view-transition pseudo animations | `runtime_extra/probe_work__auro_1440.json` (script kept outside the repo: same launch settings as `tools/capture.mjs`) |
| Media inventory after every lazy block mounted | `runtime_extra/media_auro+cellar+cole-ferguson+et-al_1440.json` (`tools/media_case.mjs`) |
| Saved HTML / CSS / page chunk | `extracted/page_work_auro.html`, `extracted/_next/static/css/6f399c267a4ae1fc.css`, `extracted/_next/static/chunks/app/work/%5Bslug%5D/page-f72fca6efa960802.js`, pull state machine in `chunks/4428-9918e630fbcee588.js` module `11206` |
| Session videos (25 fps; the one video written between this JSON and the previous one, so **inferred**) | 1440: `runtime/video/51b67f2ecac4536e7b7c59abc15a5042.webm`; 390: `runtime/video/aa23f06505388dde36ec512033266359.webm` |

Measurement notes: headless Chromium ran rAF at **~32 fps** (median frame 31.3 ms). The curves were sampled at
that rate and then fitted against the declared CSS curve. The fit gives a start time and an RMS error. "Frames to
settle" is computed at 60 fps from the declared curve once the fit confirmed it. Times use the page clock.
Labels: **observed** = measured; **declared** = read from CSS/JS; **inferred** = deduced; **unknown**.

---

## 1. Page structure

Title `Auro`, caption "Light to live by". **5 offering pills** (Naming, Visual Identity, Art Direction,
Digital Design, Interfaces). **No client-site link**: the link slot under the caption is empty (0 px tall).
The sticky title pill on this page is the title alone. Document height **11 922 px at 1440**, **8 315 px at 390**.
175 elements rendered.

| # | Block | y (1440) | h | Width | Content |
|---|---|---|---|---|---|
| 1 | heading (h1, caption, empty link slot) | 220 | 151 | 692 narrow | 36 px title, 36 px muted caption |
| 2 | offering pills | 536 | 40 | 1048 | 5 pills, 8 px gap |
| 3 | hero | 606 | 590 | 1048 wide | **image**, 2805:1579, WebP 1051x591. The only image hero of the four |
| 4 | intro prose | 1195 | 578 | 692 | 57 words, 26 px / 31.2, 180 px top and bottom padding |
| 5–19 | gallery, 15 blocks | 1794 → 11 155 | — | 1048 | see below |
| 20 | credits | 11 175 | 187 | 1048 | 2 groups: Typography (typeface + foundry link), Photography (2 photographer links) |
| 21 | next project: **Soft Union** | 11 342 | 580 | 1048 | cover image 2000:1127 |

Gallery, top to bottom (y, height, content after lazy mount, **observed**):

| # | Type | y | h | Slots |
|---|---|---|---|---|
| G0 | pair 6+6, 4:5 | 1774 | 642 | video 1080x1352 (10.0 s) + JPG |
| G1 | full | 2436 | 588 | video 1926x1080 (5.6 s) |
| G2 | full | 3044 | 589 | video 1920x1080 (6.2 s) |
| G3 | full | 3653 | 589 | JPG |
| G4 | pair 4:5 | 4262 | 642 | video (5.6 s) + JPG |
| G5 | full | 4925 | 590 | WebP |
| G6 | pair 4:5 | 5534 | 642 | WebP + JPG |
| G7 | full | 6197 | 585 | WebP |
| G8 | full | 6802 | 590 | video 1920x1080 (10.4 s) |
| G9 | pair 4:5 | 7412 | 642 | video (6.0 s) + video (20.0 s) |
| G10–G11 | full x 2 | 8074 / 8685 | 591 / 589 | WebP, WebP |
| G12 | pair 4:5 | 9294 | 642 | WebP + PNG |
| G13–G14 | full x 2 | 9957 / 10 566 | 589 | WebP, WebP |

(The y values come from the inventory run, which scrolled with `scrollTo`; the probe at load reports each block 20 px
lower because the hidden blocks still carry their `translateY(20px)`.)

**Media mix (observed):** an image hero, plus **15 blocks (10 full, 5 pairs) = 20 slots: 7 videos + 13 images**.
Every video is muted, looped, has no controls, and pauses when off screen. Full slots are 1048 x ~589 (16:9 with
small per-asset ratio drift: 3850:2160, 3155:1775, 5609:3157 ...). Pair slots are 514 x 642 (4:5). 29 IntersectionObservers.

**Pacing (observed):** a **landscape-heavy** rhythm. The pattern is pair, full, full, full, pair, full, pair, full,
full, pair, full, full, pair, full, full: two or three landscapes between portrait pairs, where George Davies
strictly alternates. 16 one-shot reveals (15 blocks + credits). At the capture's scroll speed a block
revealed every **905 ms** (median of 15 intervals), one per **616 px** of scroll. The opening runs heading, image
hero, 578 px of prose, then the first pair, which arrives at document y 1774.

**At 390 (observed):** one 350 px column. Pairs stack into two 4:5 slots (437 px each), the gap is 12 px, the title and
caption are 24 px / 28.32, the intro is 20 px / 24 with 90 px padding, and the 5 pills wrap onto 2 rows.

---

## 2. Motion table (this page's values)

| # | Effect | Trigger | This page | Easing (declared) | Status |
|---|---|---|---|---|---|
| A | Heading cascade (`case-arrive`, 0→1 opacity, 12→0 px) | mount | 600 ms each. `--case-delay` = 85 ms x index: h1 **0**, caption **85**, empty link slot **170**, pills **255 / 340 / 425 / 510 / 595**, hero **595**, prose **680**. Last element (prose) reached opacity 0.999 at **1399 ms** | (.22,1,.36,1) per keyframe | observed + declared |
| B | Gallery/credits pre-hide | hydration adds the reveal class | all 16 items go 1→0 and 0→20 px at 450–1000 ms, below the fold, so no one sees it | ease 500 / (.22,1,.36,1) 600 | observed |
| C | Gallery/credits reveal | IO `rootMargin 0 0 -30px 0`, threshold 0.01, one-shot | opacity 500 ms `ease`, translateY 20→0 px 600 ms. Trigger tops **832–864 px** (median 853.5) in a 900 px viewport | ease / (.22,1,.36,1) | observed + declared |
| D | Media loading veil | media ready | opacity 1→0, 320 ms | (.22,1,.36,1) | observed |
| E1 | Sticky title, nav slot opens | `.case-offerings` bottom ≤ 0 | width 0 → **71.95 px**, margin-left 0→10 px, 240 ms. Fired at scrollY **584** (pills bottom 576) | (.22,1,.36,1) | observed |
| E2 | Sticky title pill drops in | same | translateY −80→0 px 280 ms, opacity 160 ms, both after a **240 ms** delay | (.22,1,.36,1) / ease | observed |
| E3 | Mobile dock | same (390) | mobile slot 0 → **63.95 px** in 280 ms; dock rises 150→0 px in 450 ms | (.22,1,.36,1) | observed |
| E4 | Mobile header actions leave near the end | `.case-next` within 120 px | translate(−50%, calc(100% + 40px)), 280 ms | (.22,1,.36,1) | observed |
| F | Next cover rise | ≤ 160 px of scroll left (reverses above 220) | `translate` 180→0 px, 702 ms. Phase `revealing` with **142 px** left | (.22,.7,.25,1) | observed + declared |
| G | Next cover grow | same | `scale` **0.660298** → 1, 576 ms after 126 ms | (.3,0,.2,1) | observed + declared |
| H | Next label | same | opacity 0→1, 8→0 px, 198 ms after 702 ms | (.22,1,.36,1) | observed + declared |
| I | Pull to next project | at the bottom, phase `ready` | link translateY −20 / −40 / −60 px, one step per wheel event | stepped | observed |
| J | Route change into Soft Union | pull reaches 60 | View Transition: cover and title groups 1100 ms, root group 250 ms, old-root fade 200 ms | (.66,0,.25,1) | observed |
| M | Header pills (hover) | hover | site-wide | — | observed |

No external-link pill expand (K) and no hero cursor pill (L) on this page: there is no link and the hero is a still.

---

## 3. Measured curves (1440, ~32 fps samples)

### A. Heading cascade
Samples from first paint. The first frames after load are sparse (hydration jank), so each fit starts from the
first clean frame.

| t (ms) | h1 opacity / ty | hero opacity / ty | prose opacity / ty |
|---|---|---|---|
| 327 | 0.222 / 9.34 | 0 / 12 | 0 / 12 |
| 340 | 0.691 / 3.70 | 0 / 12 | 0 / 12 |
| 509 | 0.950 / 0.59 | 0 / 12 | 0 / 12 |
| 869 | 1 / 0 | 0.216 / 9.41 | 0 / 12 |
| 931 | 1 | 0.687 / 3.76 | 0.273 / 8.73 |
| 1024 | 1 | 0.891 / 1.31 | 0.714 / 3.43 |
| 1148 | 1 | 0.979 / 0.26 | 0.933 / 0.80 |
| 1336 | 1 | 1.000 / 0.00 | 0.997 / 0.04 |

Fit vs declared (.22,1,.36,1), 600 ms: prose **RMS 0.09 %** of travel (start 892 ms). Hero RMS 3.5 %, because its first
sample landed on a janky frame. The hero starts with the 5th pill (both at index 7 = 595 ms). The delay index comes from
the CMS tag count (4), while the pill row shows 5 tags (**inferred** from the code: hero index = 3 + tags.length).

### C. Gallery reveal (first pair, G0)
`data-in-view` set at **6056.1 ms**, block top 849 px, scrollY 945. The transition starts on the next frame.

| t − 6056 (ms) | opacity | translateY (px) |
|---|---|---|
| 30 | 0.000 | 20.00 |
| 61 | 0.045 | 15.55 |
| 93 | 0.137 | 11.69 |
| 155 | 0.407 | 6.20 |
| 218 | 0.646 | 3.07 |
| 280 | 0.802 | 1.47 |
| 377 | 0.935 | 0.42 |
| 468 | 0.991 | 0.08 |
| 562 | 1.000 | 0.00 |

Fits: transform vs (.22,1,.36,1) 600 ms → **RMS 0.04 %**. Opacity vs `ease` 500 ms → **RMS 0.07 %**. A swapped
easing fits at 5–6 % error, which confirms the split: the movement starts at full speed (peak velocity at 0 %, 4.54x
average) while the fade lags (peak at 21 %). So at 93 ms the block has covered 42 % of its travel but shows only
14 % opacity. Every later block repeats this curve exactly (G1 at 7055 ms: 0.046 / 15.52 at +31 ms).

### E. Sticky title (desktop)
`data-visible=true` at **5541.8 ms**. The pill moves only after the 240 ms slot delay:

| t (ms) | opacity | translateY |
|---|---|---|
| 5806 | 0.044 | −67.86 |
| 5842 | 0.424 | −36.38 |
| 5868 | 0.751 | −17.77 |
| 5900 | 0.915 | −8.19 |
| 5962 | 1.000 | −1.38 |
| 6055 | 1.000 | 0.00 |

Fit: translateY vs (.22,1,.36,1) 280 ms, start **5797.5** → RMS 1.1 %. Opacity vs `ease` 160 ms, start 5798.5 →
RMS 1.2 %. The 5798 − 5542 = **256 ms** start lag is the declared 240 ms plus one frame. 60 fps settle: frame 12 of 17.
On desktop the pill **stays** after `data-footer-near` flips at scrollY 10 334 (observed). Only the mobile dock leaves.

### F–H. Next project reveal
Phase → `revealing` at **20 526.5 ms**, 142 px from the end.

| t − 20 525 (ms) | translate Y | scale | label opacity |
|---|---|---|---|
| 32 | 153.7 | 0.6603 | 0 |
| 94 | 103.5 | 0.6603 | 0 |
| 156 | 65.0 | 0.6643 | 0 |
| 218 | 40.3 | 0.7075 | 0 |
| 281 | 25.2 | 0.7960 | 0 |
| 375 | 12.0 | 0.9032 | 0 |
| 500 | 3.6 | 0.9713 | 0 |
| 625 | 0.4 | 0.9965 | 0 |
| 718 | 0 | 1 | 0.354 |
| 749 | 0 | 1 | 0.753 |
| 811 | 0 | 1 | 0.976 |
| 874 | 0 | 1 | 1.000 |

Fits (all with a common start of **20 524–20 525 ms**): rise vs (.22,.7,.25,1) 702 ms → RMS 0.14 %. Grow vs
(.3,0,.2,1) 576 ms after 126 ms → RMS 0.10 %. Label vs (.22,1,.36,1) 198 ms after 702 ms → RMS 0.18 %.
The phase turned `ready` at 21 431 (+905 ms ≈ the 900 ms budget plus one frame).

### I–J. Pull to the next project and the route morph (observed end to end)

| t (ms) | Event |
|---|---|
| 24 305 | first 20 px wheel after more than 360 ms idle → phase `pulling`, `--next-pull` 20, link at −20 px |
| 24 494 | second wheel → pull 40 |
| 24 714 | third wheel → pull 60 = the cap → phase `leaving`, `document.startViewTransition` called |
| 24 826 | new route committed (old article gone, phase of the new page `hidden`): **112 ms** after the call |
| 24 840 | VT animations start: `group(nap-project-cover)` and `group(nap-project-title)` 1100 ms, `image-pair` runs the radius keyframes, `group(root)` 250 ms, `old(root)` fades out over 200 ms |
| 25 962 | cover and title groups finish (1122 ms sampled) |
| 26 087 | Soft Union's heading cascade starts (it was paused while the page arrived): **125 ms after the morph** |

The pull is **stepped**: each wheel event moves the link by its delta, clamped to 0–60 px, with no easing (observed:
the link transform jumps −20 → −40 → −60). A wheel with a 120 px delta after a 360 ms pause would leave at once
(declared: `push` clamps to 60). The morph curve (.66,0,.25,1) eases in and out: 50 % at 513 ms, 90 % at 744 ms,
settled within 1 % at frame 59 of 66.

---

## 4. Differences from the site-wide system and from George Davies

- **Still hero.** The only image hero of the four: it shows no video and no cursor pill. During the route morph it is
  the cover that flies in (from Soft Union's index card, or from the previous page's next cover).
- **No client link.** The link slot keeps its 170 ms cascade index and the 30 px top margin but has no content. The
  sticky title is a single pill (desktop slot 71.95 px, mobile 63.95 px).
- **Five pills** on one row at 1440, two rows at 390. The hero shares its delay with the 5th pill.
- **Mostly landscapes:** 10 full blocks against 5 pairs. The 4:5 pairs here are 642 px tall, against 685 px for George
  Davies's 3:4 pairs.
- Motion: the site's case template with nothing added. 1829 rAF calls at 1440 (Lenis), 85 at 390.

## 5. Spacing and type deltas (case template vs the site pages)

| | Case page (1440 / 390) | Site pages (home, about, work) |
|---|---|---|
| Display type | 36 px / **42.48 (1.18)** 600, tracking 0.36 px; 390: 24 / 28.32 | 36 / **43.2 (1.2)** 600 |
| Intro prose | 26 / 31.2 600; 390: 20 / 24 | 26 / 31.2 on /about |
| Body/meta | 14 / 18.2 500 (credits, pills) | same |
| Top of heading | 220 px (90 header + 130 padding); 390: 160 | — |
| Pills → hero | 165 px above the pills, 29 below; 390: 100 / 20 | — |
| Prose padding | 180 / 180; 390: 90 | — |
| Media gap | **20 px**; 390: **12 px** | 20 / 12 grid gap |
| Credits | padding-top 80, 30 px between groups; 390: 50 | — |
| Next project | padding-top 220, stage 384 px (360 + 24 heading clearance); 390: 100 | — |
| Radii | 5 px media, 19 px pills (17 at 390) | same |
| Grid | 12 columns, 68.95 px, 20 px gutters, wide 1048, narrow 692 | same tokens |

## 6. Outbound links

| Link | Where | Opens |
|---|---|---|
| kimeracorp.eu/typefaces/melange-grotesk | credits, Typography | new tab, `noopener noreferrer` |
| instagram.com/ethanjones.co | credits, Photography | new tab |
| instagram.com/jarodfrausto | credits, Photography | new tab |
| /work/soft-union | next project (pull or click) | same tab, View Transition |
| /work/et-al (absolute URL) | appears only at runtime, not in the saved HTML: the site-wide header notification (**inferred**) | — |

Plus the site nav: /, /work, /about, /journal.
