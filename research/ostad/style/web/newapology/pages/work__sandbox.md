# /work/sandbox — case-study page

Study notes only. Nothing from newapology.com ships: no code, CSS, class names, fonts, images or copy.
Titles, tags and credit names are listed as data.

Same template and motion system as every case page. Template reference: `work__george-davies.md`.
Per-frame curve tables for this batch: `work__pavlo-lotnik.md` §3. This file lists Sandbox's own numbers.

What is particular to Sandbox:
- a **taller video hero** (3326:2160, 680 px at 1440);
- the **longest run of full-width blocks** in the batch: five in a row, including a 2.06:1 panorama;
- **no client-site link**;
- **two foundry links** in a single credit line.

## Sources

| What | File |
|---|---|
| Runtime capture | `runtime/work__sandbox_1440.json`, `runtime/work__sandbox_390.json` |
| Per-frame sampler | `runtime_extra/frames_work__sandbox_{1440,390}.json` (`tools/frames_case.mjs`) |
| Media inventory | `runtime_extra/media_pavlo-lotnik+pinto+sandbox+soft-union_1440.json` |
| Saved HTML | `extracted/page_work_sandbox.html` |
| Session videos (25 fps). Mapping checked by the title in a frame | 1440: `runtime/video/d730919b3713585b0f126ae283160bf1.webm`; 390: `runtime/video/05726ef8a75fb9fed53fc889d18844e7.webm` |

rAF ran at ~32 fps in headless (31.3 ms median). Curves were fitted to the declared CSS curves. Labels: **observed**,
**declared**, **inferred**, **unknown**.

---

## 1. Page structure

Title `Sandbox`. Caption "21st century education". Tags: Visual Identity, Digital Design.

| Width | docH | Screens | Elements |
|---|---|---|---|
| 1440 | **8406 px** | 9.3 | 126 |
| 390 | **5128 px** | 6.1 | 126 |

| # | Block | y (1440) | h | Content |
|---|---|---|---|---|
| 1 | heading: h1, caption, empty link row | 220 | 151 | no client link |
| 2 | tags | 536 | 40 | 2 pills |
| 3 | hero **3326:2160** | 606 | **680** | **video** 2000x1292, **4.4 s** loop. 91 px taller than a 16:9 hero; 227 px at 390 |
| 4 | intro prose | 1286 | 610 | 51 words |
| 5 | pair 3:4 | 1895 | 685 | image + image |
| 6 | full 16:9 | 2600 | 589 | video 1920x1080, 8.5 s |
| 7 | full **2.06:1** | 3209 | **509** | image, the flattest block in the batch |
| 8 | full 2000:1140 | 3738 | 597 | image |
| 9 | full 2000:1140 | 4355 | 597 | image |
| 10 | full 2000:1138 | 4972 | 596 | video 1900x1080, 4.0 s |
| 11 | pair 3:4 | 5588 | 685 | video 1080x1350, 7.2 s + image |
| 12 | full 3:2 (2000:1331) | 6293 | 697 | image |
| 13 | full 3:2 | 7010 | 697 | image |
| 14 | credits | 7708 | 118 | one group: Typography, "Affairs, Häuser by SM Foundry, Diatype by Dinamo" (both foundries linked) |
| 15 | next project: **Cole Ferguson** | 7826 | 580 | cover 2400:1350, **video** |

**Media mix (observed).**
- Video hero.
- **11 gallery slots = 3 videos + 8 images** (JPG throughout, no WebP in this page's gallery), plus the next cover video.
- The runtime counted 5 `<video>` and 8 `<img>`. Videos are muted, looped and IO-played. No `case-video-control`.

**Pacing.**
- The block sequence is **P F F F F F P F F**.
- After the opening pair, five full-width blocks run for about 2960 px (3.3 screens): a film, the 2.06:1 panorama,
  two near-16:9 stills and a short film. The page then closes on a pair and two 3:2 stills.
- It reads as **a slideshow of wide frames**, not the pair/full alternation of the other pages.
- The capture scrolled at 484 px/s. A block revealed every **1220 ms** (median), 10 reveals in all.
- At 390 the wide frames shrink to 170–233 px, so the five-block run passes in about 1 screen. Reveals came every
  **438 ms**, the fastest beat in the batch.

---

## 2. Motion table (this page's values)

All effects are the template's. Triggers, declared curves and easing metrics are in `work__pavlo-lotnik.md` §2.

| # | Effect | This page (observed) | Fit to declared curve |
|---|---|---|---|
| A | Heading cascade, 600 ms (.22,1,.36,1), 12 px, 85 ms steps | 7 steps. h1 156→685, caption 219→769, empty link row 344→781, tags 441→875 and 515→969, hero 685→1032, prose 766→**1189** ms (FCP 412). The shortest heading cascade in the batch. 390: 416→1278 | finish steps 84, 12, 94, 94, 63, 157 ms (32 fps quantisation); mean 84 ms |
| B/C | Gallery and credits reveal, 500 ms `ease` + 600 ms (.22,1,.36,1), 20 px | **10 reveals**. Trigger tops **831–848 px** (median 838.5), line at 870. 390: 701–779 (line 814) | block 5: 0.13 px, opacity 0.0037 |
| D | Media veil 320 ms | first at **805 ms**, later than on the image-hero pages (412–609 ms), because the hero is a video | — |
| E1/E2 | Sticky title in the nav | visible at scrollY **587** (offerings bottom −10). Slot 0 → **98.8 px**, title only | slot 0.97 px; pill translate 0.79 px |
| E3 | 390 dock | slot 0 → **90.8 px** in 280 ms. Rise 450 ms, fade 250 ms | as Pavlo Lotnik |
| — | footer-near | scrollY 6821 | — |
| F/G/H | Next rise / grow / label | revealing at scrollY 7367, **139 px** before the end. `ready` +874 ms. Scale 0.660298 → 1 (692 → 1048 px). Hide at 256 px. 390: 0.78, trigger 84 px | rise 1.56 px, grow 0.0007, label 0.011 |
| I/J | Pull → View Transition | 5 x 12 px → 60 → `leaving` → `/work/cole-ferguson`. 390: 48 px, no navigation | stepped, 1:1 |
| K | Link pill expand | **absent** | — |
| L | Video cursor pill | **absent** (the hero video has no control on this page) | — |

**Scroll.** Lenis on desktop. A single tick moved 37 px with the expo-out shape: 50 % by ~100 ms, 90 % by ~330 ms.
Native 100 px steps at 390. rAF: 1651 calls at 1440, 51 at 390.

---

## 3. Differences

**From the site-wide system.** Same as every case page: George Davies §4, Pavlo Lotnik §4.

**From the other three pages in this batch:**
- **Hero aspect.** 3326:2160 (1.54:1), the only non-16:9 hero here. Everything below the hero is pushed down by 91 px,
  so the intro starts at 1286, not 1195–1199.
- **Run of five full-width blocks** and a **2.06:1 panorama**. The other pages never put more than three full blocks in
  a row.
- **Few videos, all short.** 3 gallery videos of 4.0–8.5 s, plus a 4.4 s hero.
- **No client link.** Heading 151 px, tags at 536.
- **Credits** use one Typography line with two foundry links.

## 4. Spacing and type deltas

| Item | 1440 | 390 |
|---|---|---|
| Heading | 151 px | 151 px |
| Hero | **680 px** | **227 px** |
| Intro prose (51 words) | 610 px | 468 px |
| Credits (one line, two links) | 118 px | 88 px |

Full blocks are 509 px (2.06:1), 589 / 596 / 597 px (near 16:9) and 697 px (3:2). Pairs are 685 px (3:4); at 390 they
stack to 945 px.

Type and the other spacing match the template. Type: 14/18.2 w500 UI, 36/42.48 w600 display, 26/31.2 w600 prose.

## 5. Outbound links

| Link | Where | Opens |
|---|---|---|
| `https://s-m.nu/` | credits, Typography (SM Foundry) | new tab, `noopener noreferrer` |
| `https://abcdinamo.com/` | credits, Typography (Dinamo) | new tab |
| `/work/cole-ferguson` | next project | in-app, pull or click, View Transition |
| `https://www.newapology.com/work/et-al` | site-wide notification bubble (runtime-injected) | same tab |
| `/`, `/work`, `/about`, `/journal` | nav | in-app |

There is no client-site link on this page.
