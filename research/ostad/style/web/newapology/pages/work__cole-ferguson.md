# /work/cole-ferguson — case-study page

Study notes only. Nothing from newapology.com ships: no code, CSS, class names, fonts, images or copy.
Names appear as data so the structure is readable.

Same template and motion system as `/work/george-davies` (template: `work__george-davies.md`). Per-frame curve tables
for this batch: **`work__auro.md` §3**. This file gives Cole Ferguson's own structure and numbers.

## Sources

| What | File |
|---|---|
| Runtime capture | `runtime/work__cole-ferguson_1440.json`, `runtime/work__cole-ferguson_390.json` |
| Per-frame probe (1440, pulled through to the next project) | `runtime_extra/probe_work__cole-ferguson_1440.json` |
| Media inventory | `runtime_extra/media_auro+cellar+cole-ferguson+et-al_1440.json` |
| Saved HTML | `extracted/page_work_cole-ferguson.html` |
| Session videos (**inferred** by write order) | 1440: `runtime/video/99581f4179da8e6558921fb14c0396ab.webm`; 390: `runtime/video/8dcdc300d3612836ca7b6aba511e2c86.webm` |

---

## 1. Page structure

Title `Cole Ferguson`, caption "A photographer's monograph". **2 pills** (Visual Identity, Digital Design). Link
pill `colelferguson.com`. Document height **8224 px at 1440**, **5033 px at 390**. 135 elements.

| # | Block | y (1440) | h | Content |
|---|---|---|---|---|
| 1 | heading + link pill | 220 | 151 | |
| 2 | pills | 539 | 40 | 2 pills |
| 3 | hero 16:9 | 608 | 589 | **video** 1920x1080, 17.2 s, muted loop, no control |
| 4 | intro prose | 1198 | 485 | 38 words |
| 5 | G0 full | 1682 | 589 | video 1920x1080, **36.4 s** (longest gallery clip of the batch) |
| 6 | G1 full | 2291 | 589 | video 10.5 s |
| 7 | G2 pair 3:4 | 2900 | 685 | WebP + WebP |
| 8 | G3 full | 3605 | 589 | video 9.1 s |
| 9 | G4 pair 3:4 | 4214 | 685 | video 1080x1462 6.4 s + WebP |
| 10 | G5 full | 4919 | 589 | WebP |
| 11 | G6 full **3:2** | 5528 | **698** | video 1618x1080, 18.0 s |
| 12 | G7 full | 6246 | 602 | video 10.1 s (1386:797) |
| 13 | G8 full | 6868 | 589 | WebP |
| 14 | credits | 7477 | 187 | Typography (typeface + foundry link), Development (studio name, no link) |
| 15 | next project: **March 2004** | 7644 | 580 | cover video, 2000:1124 |

**Media mix (observed):** hero video + **9 blocks (7 full, 2 pairs) = 11 slots: 6 videos + 5 images**, plus a video
next cover. 20 IntersectionObservers.

**Pacing (observed):** the most **landscape** page of the four. Seven of nine blocks are full width. Hero, G0 and G1 make
three 16:9 videos in a row (about 1800 px of moving landscape) before the first portrait pair. That reads like the
spreads of the photographer's book the caption names (**inferred** intent). 10 reveals, one every **937 ms** (median),
one per **619 px**. At 390 the full blocks shrink to 197 px tall, so the mobile page is short (5033 px) and fast.

---

## 2. Motion table (this page's values)

| # | Effect | This page | Status |
|---|---|---|---|
| A | Heading cascade | h1 0, caption 85, link 170, pills 255 / 340, **hero 425**, **prose 510**. Prose opacity 0.999 at **1267 ms** | observed |
| C | Gallery reveal | 10 reveals; trigger tops **838–863 px** (median 855.5) | observed |
| D | Loading veil 320 ms | first at 1753 ms, 90 observations | observed |
| E1/E2 | Sticky title in the nav | visible at scrollY **584**; slot 0 → **136.84 px** (longest title of the four); pill after 240 ms | observed |
| E3/E4 | Mobile dock | slot 0 → **181.84 px**; dock rise at 10 054 ms; header actions leave at 15 356 ms | observed |
| F/G/H | Next rise / grow / label | `revealing` with **157 px** left (the 160 px threshold, one wheel tick early). Scale 0.660298 → 1, 702 / 576 / 198 ms | observed |
| I | Pull | pull 20 / 40 / 60 at 23 518 / 23 705 / 23 904 ms | observed |
| J | View Transition into March 2004 | called 23 894 → route in at 23 972 (**+78 ms**, the fastest swap of the four, where the others took 112–139 ms; all four prefetch the next route 1600 px ahead, so why this one was quicker is **unknown**) → cover and title groups 23 991 → 25 111 (1100 ms) → March 2004's cascade starts at 25 236 | observed |
| K | Link pill expand | label width 0 → **132.86 px** in 380 ms (.3,0,.2,1) | observed |

Fits on this page's own samples against the declared curves: gallery G0 transform (.22,1,.36,1) 600 ms **RMS 0.08 %**,
opacity `ease` 500 ms **0.11 %** (start 10 173.5 ms, 32 ms after `data-in-view` at 10 141.9). Sticky pill translateY
280 ms **0.33 %**. Next-cover grow (.3,0,.2,1) 576 ms after 126 ms **0.13 %**. The curve tables are in `work__auro.md` §3.

---

## 3. Differences from the site-wide system and from the template

- **Landscape-dominant rhythm** (7 full : 2 pairs) instead of the strict pair/full alternation of George Davies and Cellar.
- **One 3:2 block** (698 px) and one 1386:797 block (602 px) break the 589 px landscape height, the only height
  variation among the full blocks on this page.
- **Longest sticky slot** (136.84 px desktop, 181.84 px mobile). The sticky-title slot animates to the measured title
  width, so the nav pill grows with the project name.
- **Video next cover** (March 2004), like Cellar.

## 4. Spacing and type deltas

Template values (`work__auro.md` §5). Nothing page-specific: 3:4 pairs 685 px, full blocks 589 px, gap 20 / 12,
prose 26 / 31.2 with 180 px padding (390: 20 / 24, 90 px).

## 5. Outbound links

| Link | Where | Opens |
|---|---|---|
| colelferguson.com | heading link pill; also the sticky title's hover pill | new tab, `noopener noreferrer` |
| optimo.ch/typefaces/recital | credits, Typography | new tab |
| /work/march-2004 | next project | same tab, View Transition |
| /work/et-al (absolute URL) | runtime-only header notification (site-wide, **inferred**) | — |

Plus the site nav: /, /work, /about, /journal.
