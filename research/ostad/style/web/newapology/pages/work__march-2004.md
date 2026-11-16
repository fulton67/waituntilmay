# /work/march-2004 — case-study page

Study notes only. Nothing from newapology.com ships: no code, CSS, class names, fonts, images or copy.
Names below are data, so the structure is readable.

Same template and motion system as `/work/george-davies`. **Read `work__george-davies.md` first.** It has the
template description, the full motion table, the easing metrics and the per-frame curve tables. This file gives
this page's own structure and numbers, and everything that differs.

## Sources

| What | File |
|---|---|
| Runtime capture | `runtime/work__march-2004_1440.json`, `runtime/work__march-2004_390.json` |
| Per-frame measurement | `runtime_extra/measure_work__march-2004_{1440,390}.json` (`tools/measure_case.mjs`) |
| Media inventory | `runtime_extra/media_gd-m04-mira-notom_1440.json` (`tools/media_case.mjs`) |
| Saved HTML | `extracted/page_work_march-2004.html` |
| Session videos (by modification order, **inferred**) | 1440: `runtime/video/0f3e0a050996cf98c2cd2220ee1d02b6.webm`; 390: `runtime/video/0dcac189528d565f52cec32ff12bfa3d.webm` |

---

## 1. Page structure

Title `March 2004`, caption "Music for working". Tags: Digital Design, Community. Document height **6257 px at 1440**,
**4125 px at 390**. 122 elements at both widths, the leanest of the four.

| # | Block | y (1440) | h | Content |
|---|---|---|---|---|
| 1 | heading (h1, caption, link pill) | 220 | 153 | narrow 692 |
| 2 | tags | 539 | 40 | 2 pills |
| 3 | hero | 608 | 589 | **video** 1920x1080, 20.5 s, muted loop, **no play/pause control** (plain media, plays while active) |
| 4 | **intro prose** (`case-prose--intro`) | 1197 | 547 | 45 words, 26 px / 31.2, weight 600, 6 lines in the narrow column, **180 px padding above and below** |
| 5 | gallery 1, full | 1744 | 590 | video 1920x1080, 7.9 s |
| 6 | gallery 2, pair 1:1 | 2354 | 514 | image (518x517 JPG) + video 1080x1216, 8.8 s |
| 7 | gallery 3, full | 2888 | 589 | video 1920x1080, **61.0 s** |
| 8 | gallery 4, full | 3498 | 589 | image 3000:1687 |
| 9 | gallery 5, pair 8:9 | 4107 | 578 | video 1080x1920, 6.2 s + video 1080x1216, 45.0 s |
| 10 | gallery 6, full 4:3 | 4705 | 786 | image 1051x788 JPG |
| 11 | credits | 5490 | 187 | Typography (typeface + foundry link), Web Development (developer link) |
| 12 | next project: **Cellar** | 5677 | 580 | cover 2880:1827, video |

**Media mix (observed):** hero video + **8 gallery slots = 5 videos + 3 images**, plus the next cover video.
Video-led: 6 of 9 visible media move. Gallery videos pause when off-screen.

**Pacing:** heading, hero, then a **547 px text pause** (the intro), then 6 media blocks. Two of them are the
only square and 8:9 pairs on these four pages, and the last block is a taller 4:3 full-width (786 px). Blocks
revealed every **875 ms** (median) at the capture's ~675 px/s. At 390 the intro is 420 px (90 px padding, 10
lines at 20/24) and the pairs stack (712 px and 800 px tall).

---

## 2. Motion table (this page's values)

Every effect is the template's. See `work__george-davies.md` §2 for triggers and curves.

| # | Effect | This page | Status |
|---|---|---|---|
| A | Heading cascade, 600 ms (.22,1,.36,1), 12 px, 85 ms steps | h1 0, caption 85, link 170, tags 255 and 340, hero 425, **intro prose 510 ms**. Measured at 1440: h1 343→808 ms, caption 429→901, link 559→1028, tags 594→1059 and 740→1153, hero 748→1246, **prose 839→1342**. The block lands at about **1.34 s** (390: 1.37 s) | observed |
| C | Gallery reveal, 500 ms opacity `ease` + 600 ms 20 px rise | 7 reveals (6 blocks + credits). Trigger tops **812–845 px** (median 839, vh 900), i.e. 55–88 px inside the bottom edge. 390: 713–805 px | observed |
| D | Loading veil 320 ms | first at 1058 ms (1440) | observed |
| E1/E2 | Sticky title in the nav | visible at scrollY 599 (tags bottom 579). Slot 0 → **122 px** in 240 ms, pill −80 → 0 after 240 ms | observed |
| E3/E4 | Mobile dock | slot 0 → **167 px**, rise 150 → 0 in 450 ms. Header pill leaves (+76 px, 280 ms) near the footer | observed |
| F/G/H | Next-project rise / grow / label | revealing at scrollY 5219, **138 px** before the end. Scale 0.660298 → 1 (1440), 0.78 → 1 (390). Same 702 / 576+126 / 198+702 ms | observed |
| I/J | Pull to Cellar, View Transition 1100 ms | same state machine (**declared**). Not exercised on this page | declared |
| K | Link pill expand | label 0 → **118.7 px**, 380 ms (.3,0,.2,1) | observed |
| L | Hero cursor pill | **absent**: the hero has no video control here (no fixed cursor element in the facts) | observed |

The curves were not re-fitted here. The samples follow the same series as George Davies to the third decimal,
e.g. the next cover's first frames read 154.3 / 128.2 / 104.0 px.

---

## 3. Differences from George Davies and from the site-wide system

- **Intro prose block** present (George Davies and Notom have none). It is a `case-reveal` element on the heading cascade
  (delay 510 ms), not a scroll reveal. Its 180 px padding (90 on mobile) is the page's longest quiet stretch.
- **Hero video has no control and no custom cursor.** Hovering the hero does nothing.
- Square (1:1) and 8:9 pairs. The other three pages use 3:4, 4:5 and 19:22.
- Shortest and lightest: 3 `img`, 1 video at load, 17 IntersectionObservers (George Davies has 20, Mira 34).
- Site-wide differences are the same as for every case page (George Davies §4).

## 4. Spacing and type

Identical to the template (George Davies §5). Additions for the intro: **26 px / 31.2 (1.2), weight 600, tracking 0.26 px**
(390: 20 px / 24, 0.2 px), width 692 px (100 % on mobile), `white-space: pre-line`, hyphenation on.

## 5. Outbound links

| Link | Where | Opens |
|---|---|---|
| `https://march2004.com` (x2) | heading pill + sticky pill | new tab, `noopener noreferrer` |
| `https://www.sharptype.co/` | credits, Typography (foundry) | new tab |
| `https://roko-g.work` | credits, Web Development | new tab |
| `/work/cellar` | next project | in-app, View Transition |
| `https://www.newapology.com/work/et-al` | site-wide notification bubble | same tab |
| `/`, `/work`, `/about`, `/journal` | nav | in-app |

Live-site notes: `sites/march2004.com.md`, `sites/roko-g.work.md`.
