# /work/pinto — case-study page

Study notes only. Nothing from newapology.com ships: no code, CSS, class names, fonts, images or copy.
Titles, tags and credit names are listed as data.

Same template and motion system as every case page. Template reference: `work__george-davies.md`.
Per-frame curve tables for this batch: `work__pavlo-lotnik.md` §3. This file lists Pinto's own numbers.

What is particular to Pinto:
- **the longest and most video-heavy page of the batch**: 15.3 screens, 18 gallery blocks, 11 videos in 24 slots;
- an image hero;
- **no client-site link** and **no controlled video**;
- **four tag pills**, which lengthen the heading cascade and wrap to two rows at 390;
- the most runs of consecutive full-width blocks except Sandbox.

## Sources

| What | File |
|---|---|
| Runtime capture | `runtime/work__pinto_1440.json`, `runtime/work__pinto_390.json` |
| Per-frame sampler | `runtime_extra/frames_work__pinto_{1440,390}.json` (`tools/frames_case.mjs`, capture.mjs launch settings) |
| Media inventory | `runtime_extra/media_pavlo-lotnik+pinto+sandbox+soft-union_1440.json` (`tools/media_case.mjs`) |
| Saved HTML | `extracted/page_work_pinto.html` |
| Session videos (25 fps). Mapping checked by the title in a frame | 1440: `runtime/video/e43ed748ff39ab677a46298f52ca4fb2.webm`; 390: `runtime/video/8b0bea27955a4a5e9db8128581e5141d.webm` |

rAF ran at ~32 fps in headless (31.3 ms median). Curves were fitted to the declared CSS curves. Labels: **observed**,
**declared**, **inferred**, **unknown**.

---

## 1. Page structure

Title `Pinto`. Caption "Leviathan-free currency". Tags: Visual Identity, Art Direction, Digital Design, Interfaces.

| Width | docH | Screens | Elements |
|---|---|---|---|
| 1440 | **13791 px** | 15.3 | 183 |
| 390 | **9367 px** | 11.1 | 183 |

| # | Block | y (1440) | h | Content |
|---|---|---|---|---|
| 1 | heading: h1, caption, **empty link row** | 220 | **151** | the row keeps its slot through the heading's `min-height: 150.65px`. It holds no pill but still runs its `case-arrive` step |
| 2 | tags | 536 | 40 | **4 pills** (2 rows, 80 px, at 390) |
| 3 | hero 1724:970 | 606 | 589 | **image** (WebP 1051x591) |
| 4 | intro prose | 1195 | 578 | 50 words |
| 5 | full 4212:2364 | 1773 | 588 | image |
| 6 | pair **8:9** | 2381 | 578 | image + video 1080x1218, 5.0 s |
| 7 | full 16:9 | 2979 | 589 | video **1080x1350 in a 16:9 slot** (portrait source cropped by `object-fit: cover`), 10.9 s |
| 8 | full 16:9 | 3589 | 589 | image |
| 9 | pair 8:9 | 4198 | 578 | video 6.5 s + image |
| 10 | full **4:3** | 4796 | **786** | image (the tallest full block of the batch) |
| 11 | pair 8:9 | 5602 | 578 | image + image |
| 12 | full 16:9 | 6200 | 589 | video 1920x1080, 15.0 s |
| 13 | full 16:9 | 6808 | 589 | video 1920x1080, 18.0 s |
| 14 | full 3936:2243 | 7418 | 597 | image |
| 15 | pair 4:5 | 8035 | 642 | video 1080x1350, 4.2 s + image |
| 16 | full 16:9 | 8697 | 589 | video, 17.9 s |
| 17 | pair 4:5 | 9306 | 642 | image + video, 4.5 s |
| 18 | full 16:9 | 9968 | 589 | video, 8.5 s |
| 19 | full 3000:1688 | 10578 | 589 | image |
| 20 | pair 8:9 | 11187 | 578 | image + video, 12.0 s |
| 21 | full 3396:2265 | 11785 | 699 | image |
| 22 | full 16:9 | 12504 | 589 | video, 6.5 s |
| 23 | credits | 13093 | 118 | one group: Typography, "Antarctica by New Glyph" (foundry linked) |
| 24 | next project: **Pavlo Lotnik** | 13211 | 580 | cover 2000:1125, **video** (Pavlo Lotnik's hero film) |

**Media mix (observed).**
- Image hero.
- **24 gallery slots = 11 videos + 13 images**, plus the next cover video. The runtime counted 12 `<video>` and 14
  `<img>` after the full scroll.
- All videos are muted, looped, `preload=metadata` and IO-played. All except the visible next cover were `paused` at the
  end.
- No `case-video-control`.

**Pacing.**
- The block sequence is F P F F P F P F F F P F P F F P F F: 12 full-width, 6 pairs.
- Unlike the near-strict alternation on Pavlo Lotnik and Soft Union, Pinto has **runs of two and three full-width blocks**.
  Blocks 12–14 are two 16:9 films and a still.
- Most "pairs" here are **8:9** (578 px), nearly square, so pair and full blocks are almost the same height (578 vs 589).
  The page reads as an even beat of ~600 px steps.
- The capture scrolled at 490 px/s. A block revealed every **1218 ms** (median of 18 intervals), 19 reveals in all.
- At 390 single blocks are 196–263 px and pairs stack to 800/887 px. Reveals came every **469 ms** at 464 px/s.

---

## 2. Motion table (this page's values)

All effects are the template's. Triggers, declared curves and easing metrics are in `work__pavlo-lotnik.md` §2.

| # | Effect | This page (observed) | Fit to declared curve |
|---|---|---|---|
| A | Heading cascade, 600 ms (.22,1,.36,1), 12 px, 85 ms steps | **9 steps** (2 more tags than Pavlo Lotnik), so the hero waits 595 ms and the prose 680 ms. Started → finished (ms): h1 268→654, caption 278→803, empty link row 396→808, tags 449→898, 654→992, 654→1055, 742→1148, hero 808→1242, prose 837→**1335**. FCP 536. 390: 272→1400 | finish steps track 85–94 ms after the first three (start noise at 32 fps) |
| B/C | Gallery and credits reveal, 500 ms `ease` opacity + 600 ms (.22,1,.36,1) translate 20 → 0 | **19 reveals**. Trigger tops **821–847 px** (median 835), line at 870. 390: 696–784 (line 814) | block 5: 0.037 px, opacity 0.0023 |
| D | Media veil 320 ms (.22,1,.36,1) | first at 412 ms (the image hero) | — |
| E1/E2 | Sticky title in the nav | visible at scrollY **587** (offerings bottom −10). Slot 0 → **74.0 px**: **title pill only**, no link pill on hover | slot 1.1 px; pill translate 0.36 px |
| E3 | 390 dock | slot 0 → **66.0 px** in 280 ms. Rise 150 → 0 in 450 ms, opacity 250 ms | rise fit max error 0.19 px; opacity `ease` 250 ms fit error 0.002 |
| — | footer-near (next within 120 px) | scrollY 12205 | — |
| F/G/H | Next rise / grow / label, 702 / 576 (+126) / 198 (+702) ms | revealing at scrollY 12735, **156 px** before the end. `ready` +905 ms. Scale 0.660298 → 1 (cover 692 → 1048 px). Hide at 255 px. 390: 0.78, trigger 123 px | rise 1.47 px, grow 0.0025, label 0.010 |
| I/J | Pull 60 px → View Transition 1100 ms | five 12 px wheels: 12 → 24 → 36 → 48 → 60, then `leaving`. Navigated to `/work/pavlo-lotnik`. 390: 8 events gave 6 px each, 48 total, no navigation | stepped, 1:1 |
| K | Link pill expand | **absent** (no `case-external` element) | — |
| L | Video cursor pill | **absent** | — |

**Scroll engine.** Lenis on desktop; one 100-delta tick moved 19 px with the same expo-out shape as on Pavlo Lotnik (the
start was offset by scroll restoration). At 390 the wheel was native, in 100 px steps (**observed**). rAF: 2178 calls at
1440, 103 at 390.

---

## 3. Differences

**From the site-wide system.** Same as every case page: George Davies §4, Pavlo Lotnik §4.

**From the other three pages in this batch:**
- **Volume.** 18 gallery blocks against 7–15. 11 gallery videos, tied with Soft Union. The longest scroll: 23.2 s in the
  baseline capture, against 13.5 s for Pavlo Lotnik.
- **A portrait video cropped into a 16:9 slot** (block 7). Pinto is the only page here where the source aspect differs
  from the slot.
- **8:9 pairs** (6 of them). Other pages use 3:4 or 4:5.
- **No client link.** The heading's third row is empty, so the heading is 151 px instead of 153. The tags sit at 536 and
  the hero at 606, 2–3 px higher than on pages with a link.
- **Four tags.** The cascade ends 1.34 s after navigation, against 1.19–1.30 s with two tags. At 390 the tags wrap to two
  rows (80 px), which pushes the hero to y 511 instead of 467.
- **Image hero**, but a **video next cover**.

## 4. Spacing and type deltas

Template values (George Davies §5) with these measured deltas:

| Item | 1440 | 390 |
|---|---|---|
| Heading | 151 px | 151 px |
| Tags row | 40 px | **80 px (2 rows)** |
| Intro prose (50 words) | 578 px block | 468 px block |
| Credits (one group) | **118 px** | 88 px |

Pairs are 578 px (8:9) and 642 px (4:5). Full blocks are 588–589 px, 597 px (3936:2243), 699 px (3:2) and 786 px (4:3).

Type is identical to the template: 14/18.2 w500 UI, 36/42.48 w600 display, 26/31.2 w600 prose; 24/28.32 and 20/24 at 390.

## 5. Outbound links

| Link | Where | Opens |
|---|---|---|
| `https://newglyph.com/` | credits, Typography (foundry) | new tab, `noopener noreferrer` |
| `/work/pavlo-lotnik` | next project | in-app, pull or click, View Transition |
| `https://www.newapology.com/work/et-al` | site-wide notification bubble (runtime-injected) | same tab |
| `/`, `/work`, `/about`, `/journal` | nav | in-app |

There is no client-site link on this page.
