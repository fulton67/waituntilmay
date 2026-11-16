# /work/soft-union — case-study page

Study notes only. Nothing from newapology.com ships: no code, CSS, class names, fonts, images or copy.
Titles, tags and credit names are listed as data.

Same template and motion system as every case page. Template reference: `work__george-davies.md`.
Per-frame curve tables for this batch: `work__pavlo-lotnik.md` §3. This file lists Soft Union's own numbers.

What is particular to Soft Union:
- a **strict full / pair alternation** across 15 blocks;
- **half the gallery slots are video** (11 of 22);
- the **longest intro** (76 words) and the **largest credits block** (3 groups, no links);
- a client-site link pill with hover expand;
- four tag pills.

## Sources

| What | File |
|---|---|
| Runtime capture | `runtime/work__soft-union_1440.json`, `runtime/work__soft-union_390.json` |
| Per-frame sampler | `runtime_extra/frames_work__soft-union_{1440,390}.json` (`tools/frames_case.mjs`) |
| Media inventory | `runtime_extra/media_pavlo-lotnik+pinto+sandbox+soft-union_1440.json` |
| Saved HTML | `extracted/page_work_soft-union.html` |
| Session videos (25 fps). Mapping checked by the title in a frame | 1440: `runtime/video/c648f6a4504d6689fb2dc02f9cf3f889.webm`; 390: `runtime/video/ae3db11035f49c556156634f2e5d882e.webm` |

rAF ran at ~32 fps in headless (31.3 ms median). Curves were fitted to the declared CSS curves. Labels: **observed**,
**declared**, **inferred**, **unknown**.

---

## 1. Page structure

Title `Soft Union`. Caption "New literature". Tags: Visual Identity, Digital Design, Print, Type Design.

| Width | docH | Screens | Elements |
|---|---|---|---|
| 1440 | **12340 px** | 13.7 | 191 |
| 390 | **10051 px** | 11.9 | 191 |

| # | Block | y (1440) | h | Content |
|---|---|---|---|---|
| 1 | heading: h1, caption, link pill | 220 | 153 | the pill links to the client site |
| 2 | tags | 539 | 40 | **4 pills** (2 rows, 80 px, at 390) |
| 3 | hero 2000:1127 | 608 | 590 | **image** (WebP 1051x592) |
| 4 | intro prose | 1199 | **641** | **76 words**, the longest intro in the batch |
| 5 | full **891:540** | 1839 | 635 | video 1782x1080, 18.8 s |
| 6 | pair 3:4 | 2494 | 685 | video 12.2 s + image |
| 7 | full 4209:2373 | 3199 | 591 | image |
| 8 | pair 4:5 | 3810 | 642 | video 8.1 s + video 13.5 s |
| 9 | full 16:9 | 4472 | 589 | video 1920x1080, **21.9 s** |
| 10 | pair 3:4 | 5081 | 685 | image + image |
| 11 | full 16:9 | 5787 | 590 | video, 21.8 s |
| 12 | pair 3:4 | 6397 | 685 | image + image |
| 13 | full 16:9 | 7102 | 588 | video, 13.2 s |
| 14 | pair 4:5 | 7710 | 642 | video 8.3 s + image |
| 15 | full 16:9 | 8372 | 589 | video, 6.0 s |
| 16 | pair 4:5 | 8981 | 642 | image + image |
| 17 | full 6012:3382 | 9643 | 589 | image |
| 18 | pair 4:5 | 10253 | 642 | video 6.4 s + image |
| 19 | full 1020:574 | 10915 | 590 | video, 5.0 s |
| 20 | credits | 11505 | **255** | 3 groups, **none linked**: Web Development (a developer, studio in brackets), Type Design Assist (one name), Soft Union Team (two names) |
| 21 | next project: **Notom** | 11760 | 580 | cover 2000:1125, **video** |

**Media mix (observed).**
- Image hero.
- **22 gallery slots = 11 videos + 11 images**, plus the next cover video. The runtime counted 12 `<video>` and 12 `<img>`.
- The videos are the longest loops in the batch, up to 21.9 s. All are muted, looped and IO-played. No `case-video-control`.

**Pacing.**
- The block sequence is **F P F P F P F P F P F P F P F**: a perfect alternation that opens and closes on a full-width
  film.
- Every full block carries motion except two stills (blocks 7 and 17). The page holds video almost continuously:
  at 1440 a video is on screen for most of the scroll.
- The capture scrolled at 509 px/s. A block revealed every **1250 ms** (median), 16 reveals in all.
- At 390 single blocks are 197–212 px and pairs stack to 887/945 px, so the beat alternates short / long. Reveals came
  every **588 ms**.

---

## 2. Motion table (this page's values)

All effects are the template's. Triggers, declared curves and easing metrics are in `work__pavlo-lotnik.md` §2.

| # | Effect | This page (observed) | Fit to declared curve |
|---|---|---|---|
| A | Heading cascade, 600 ms (.22,1,.36,1), 12 px, 85 ms steps | **9 steps** (4 tags). h1 250→764, caption 367→808, link pill 410→866, tags 517→960, 698→1053, 761→1115, 764→1209, hero 835→1303, prose 897→**1398** ms: **the latest landing in the batch**. 390: 286→1373 | finish steps 44, 58, 94, 93, 62, 94, 94, 95 ms (mean 79) |
| B/C | Gallery and credits reveal, 500 ms `ease` + 600 ms (.22,1,.36,1), 20 px | **16 reveals**. Trigger tops **822–846 px** (median 835), line at 870. 390: 689–780 (median 751, line 814) | block 5: 0.096 px, opacity 0.0054 |
| D | Media veil 320 ms | first at 451 ms | — |
| E1/E2 | Sticky title in the nav | visible at scrollY **586** (offerings bottom −7). Slot 0 → **110.0 px**. Hovering the title reveals the link pill beside it (clip-path 280 ms, translate 380 ms) | slot 2.1 px; pill translate 0.48 px |
| E3 | 390 dock | slot 0 → **155.0 px** (title + link pill side by side) in 280 ms. Rise 450 ms, fade 250 ms | as Pavlo Lotnik |
| — | footer-near | scrollY 10747 | — |
| F/G/H | Next rise / grow / label | revealing at scrollY 11283, **157 px** before the end. `ready` +906 ms. Scale 0.660298 → 1 (692 → 1048 px). Hide at 255 px. 390: 0.78, trigger 107 px | rise 0.18 px, grow 0.0008, label 0.007 |
| I/J | Pull → View Transition | 5 x 12 px → 60 → `leaving` → `/work/notom`. 390: 48 px, no navigation | stepped, 1:1 |
| K | Link pill expand | label 0 → **115.6 px** at ~370 ms (declared 380 ms (.3,0,.2,1)). Opacity 1 at ~215 ms (80 ms delay + 180 ms). Leave: opacity gone in ~95 ms, width 0 in ~340 ms. Samples: 3.5, 16.8, 39.2, 62.0, 79.2, 91.4, 100.1, 106.4, 110.7, 113.5, 115.0, 115.6 px every ~31 ms | same series as Pavlo Lotnik to 1 px (label 1.3 px wider) |
| L | Video cursor pill | **absent** | — |

**Scroll.** Lenis on desktop. A tick moved 46 px: 50 % by ~100 ms, 90 % by ~320 ms. 2003 rAF calls at 1440, 109 at 390.

---

## 3. Differences

**From the site-wide system.** Same as every case page: George Davies §4, Pavlo Lotnik §4.

**From the other three pages in this batch:**
- **Alternation discipline.** 15 blocks in strict F/P order. Pinto and Sandbox break the pattern; Pavlo Lotnik does
  once.
- **Long films.** Four full-width loops of 13–22 s. The other pages' loops are 4–18 s, apart from Pavlo Lotnik's 68 s
  controlled film.
- **Two non-16:9 full videos** at the ends: 891:540 (≈1.65:1, 635 px) opens the gallery and 1020:574 closes it.
- **Biggest credits block**, 255 px (225 at 390). None of the names is linked, so the page has no foundry or credit
  outbound links at all; its only external link is the client site.
- **Four tags plus a link pill**, so the heading cascade lands at 1.40 s, the latest here. At 390 the tag rows wrap
  (80 px) and the hero sits at y 511.

## 4. Spacing and type deltas

| Item | 1440 | 390 |
|---|---|---|
| Heading (with link pill) | 153 px | 151 px |
| Tags row | 40 px | **80 px** |
| Intro prose (76 words) | **641 px** | **516 px** |
| Credits (3 groups, 30 px apart) | **255 px** | **225 px** |

Pairs are 685 px (3:4) and 642 px (4:5). Full blocks are 588–591 px, plus 635 px for the opener. The type histogram
has 3 muted 14/18.2 credit headings (h3) where the other pages have 1–2. Otherwise type matches the template:
14/18.2 w500 UI, 36/42.48 w600 display, 26/31.2 w600 prose.

## 5. Outbound links

| Link | Where | Opens |
|---|---|---|
| `https://softunion.online/` (x2: heading pill, sticky hover pill) | client site | new tab, `noopener noreferrer` |
| `/work/notom` | next project | in-app, pull or click, View Transition |
| `https://www.newapology.com/work/et-al` | site-wide notification bubble (runtime-injected) | same tab |
| `/`, `/work`, `/about`, `/journal` | nav | in-app |

Notes on the client site: `sites/softunion.online.md`.
