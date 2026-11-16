# /work/mira — case-study page

Study notes only. Nothing from newapology.com ships: no code, CSS, class names, fonts, images or copy.
Names below are data, so the structure is readable.

Same template and motion system as `/work/george-davies`. **Read `work__george-davies.md` first** for the
template, the full motion table, the easing metrics and the per-frame curves. This file gives Mira's own
structure and numbers. Mira is the **longest** case page of the four (2.1x George Davies).

## Sources

| What | File |
|---|---|
| Runtime capture | `runtime/work__mira_1440.json`, `runtime/work__mira_390.json` |
| Per-frame measurement | `runtime_extra/measure_work__mira_{1440,390}.json` (`tools/measure_case.mjs`) |
| Media inventory | `runtime_extra/media_gd-m04-mira-notom_1440.json` (`tools/media_case.mjs`) |
| Saved HTML | `extracted/page_work_mira.html` |
| Session videos (by modification order, **inferred**) | 1440: `runtime/video/e6107ef5ddd453f2e0ee3a6821f66d2e.webm`; 390: `runtime/video/a5473d3e8cba58dbdbae042be4faa877.webm` |

---

## 1. Page structure

Title `Mira`, caption "Life is for living". **4 tags**: Naming, Visual Identity, Art Direction, Digital Design.
Document height **13 996 px at 1440** and **10 109 px at 390**. 215 elements.

**Load cost (observed):** the capture's `networkidle` arrived at **46.8 s** (1440) and 46.7 s (390). The other three
pages took 10–19 s. The hero is a 62.7 s 1080p video, and the page has 10 more gallery videos. Which file holds up
network idle is **unknown**. The heading cascade still started at 271 ms, so first paint is not blocked.

| # | Block | y (1440) | h | Content |
|---|---|---|---|---|
| 1 | heading | 220 | 153 | narrow 692 |
| 2 | tags | 539 | 40 | 4 pills (at 390 they wrap to **2 rows, 80 px**) |
| 3 | hero 16:9 | 608 | 589 | **video** 1920x1080, **62.7 s**, muted loop, no control |
| 4 | intro prose | 1198 | 547 | 54 words, 26 px / 31.2, 6 lines, 180 px padding |
| 5–7 | 3 x full (5:3, 95:54, 5:3) | 1745 / 2393 / 3009 | 629 / 595 / 629 | image, video (1900x1080, 3.1 s), image |
| 8 | pair 4:5 | 3657 | 642 | PNG image + video 720x810, 10.1 s |
| 9–10 | 2 x full 5:3 | 4320 / 4968 | 629 | video 1728x1080 12.0 s, image |
| 11–22 | alternating **pair 19:22 (595) / full 5:3 (629)**, six times, one pair at 8:9 (578) | 5617 → 12532 | — | see inventory |
| 23 | credits | 13161 | 255 | **3 groups**: Mira (4 team names, no links), Photography (2 photographer links), Typography (2 typefaces, 2 foundry links) |
| 24 | next project: **George Davies** | 13416 | 580 | cover 2000:1126, video |

**Media mix (observed):** hero video + **18 gallery blocks (11 full, 7 pairs) = 25 slots: 10 videos + 15 images**
(JPG mostly, one PNG), plus the next cover video. 15 `img` elements at load, 34 IntersectionObservers.

**Pacing:** the opening is the slowest of the four: heading, hero, a 547 px intro, then **three full-width
landscapes back to back** (about 1900 px of single images). After that the page settles into a strict
pair/full alternation for 12 blocks. Blocks revealed every **906 ms** (median of 18 intervals) at ~690 px/s.
At 390 all 25 slots stack in one column (pairs 823–887 px tall), and a reveal fired every 406 ms of capture
time (native 120 px steps).

---

## 2. Motion table (this page's values)

Every effect is the template's. See `work__george-davies.md` §2–3 for triggers, curves and per-frame tables.

| # | Effect | This page | Status |
|---|---|---|---|
| A | Heading cascade, 600 ms (.22,1,.36,1), 12 px, 85 ms steps | delays: h1 0, caption 85, link 170, **tags 255 / 340 / 425 / 510**, **hero 595**, **prose 680**. Measured at 1440: h1 271→743, caption 364→830, link 490→924, tags 520→986, 666→1082, 678→1174, 769→1268, hero 864→1331, prose 924→1424 ms. **The longest cascade: about 1.42 s** (390 identical within 3 ms) | observed |
| C | Gallery reveal 500 / 600 ms, 20 px | **19 reveals** (18 blocks + credits). Trigger tops **814–851 px** (median 833), i.e. 49–86 px inside the bottom. 390: 692–794 px | observed |
| D | Loading veil 320 ms | first at 908 ms, **204 observations** (most of the four: one per media slot as it loads) | observed |
| E1/E2 | Sticky title in the nav | visible at scrollY 599. Slot 0 → **69.6 px** (shortest title), 240 ms, pill after 240 ms | observed |
| E3/E4 | Mobile dock | visible at scrollY 600. On mobile the tags end at 491 because they wrap, and the 120 px wheel step crossed it at 600. Slot 0 → **114.6 px** | observed |
| F/G/H | Next-project rise / grow / label | revealing at scrollY 12 974, **122 px** before the end. Scale 0.660298 → 1, same 702 / 576 / 198 ms | observed |
| I/J | Pull to George Davies, View Transition 1100 ms | same state machine (**declared**). Not exercised here | declared |
| K | Link pill expand | label 0 → **99.7 px**, 380 ms | observed |
| L | Hero cursor pill | **absent** (no video control on this hero) | observed |

---

## 3. Differences from George Davies and from the site-wide system

- **Four tags push the hero 170 ms later** (595 vs 425 ms delay), because the stagger is per element.
  On mobile the wrapped tag row adds 44 px before the hero.
- **Intro prose** present, like March 2004.
- **Three-group credits** (255 px tall vs 187) with an unlinked team list. Typography credits two families, each with a foundry link.
- The only **PNG** image and the only **720p** video rendition of the four pages.
- Length: 18 gallery blocks against 6–7 elsewhere, so 34 IntersectionObservers and 4061 rAF calls (Lenis over a longer session).
- The next project is George Davies. The "next" links on these four pages form chains through the work list:
  Notom → Mira → George Davies → Sandbox, and March 2004 → Cellar.
- Site-wide differences are the same as for every case page (George Davies §4).

## 4. Spacing and type

Template values (George Davies §5). Additions:
- Tag row: four 40 px pills, 8 px gap, centred, wrapping inside 1048 px (350 px on mobile → 2 rows).
- Intro: 26 px / 31.2, weight 600 (390: 20 / 24).
- Credits: three `h3` + `p` groups, 30 px apart, 14 px / 18.2, weight 500.
- Full-width images here are 5:3 (629 px tall at 1048) instead of 16:9 (589).

## 5. Outbound links

| Link | Where | Opens |
|---|---|---|
| `https://mirapest.com` (x2) | heading pill + sticky pill | new tab, `noopener noreferrer` |
| `https://colelferguson.com/` | credits, Photography | new tab |
| `https://lilyballif.com/` | credits, Photography | new tab |
| `https://www.grillitype.com/` | credits, Typography (foundry 1) | new tab |
| `https://skriftkompani.no/` | credits, Typography (foundry 2) | new tab |
| `/work/george-davies` | next project | in-app, View Transition |
| `https://www.newapology.com/work/et-al` | site-wide notification bubble | same tab |
| `/`, `/work`, `/about`, `/journal` | nav | in-app |

Live-site notes: `sites/mirapest.com.md`, `sites/colelferguson.com.md`, `sites/lilyballif.com.md`.
