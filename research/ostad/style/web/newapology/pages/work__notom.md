# /work/notom — case-study page

Study notes only. Nothing from newapology.com ships: no code, CSS, class names, fonts, images or copy.
Names below are data, so the structure is readable.

Same template and motion system as `/work/george-davies`. **Read `work__george-davies.md` first** for the
template, the full motion table, the easing metrics and the per-frame curves. Notom is the one case page of
these four **without a client-site link**. That removes one heading element and one hover effect.

## Sources

| What | File |
|---|---|
| Runtime capture | `runtime/work__notom_1440.json`, `runtime/work__notom_390.json` |
| Per-frame measurement | `runtime_extra/measure_work__notom_{1440,390}.json` (`tools/measure_case.mjs`) |
| Media inventory | `runtime_extra/media_gd-m04-mira-notom_1440.json` (`tools/media_case.mjs`) |
| Saved HTML | `extracted/page_work_notom.html` |
| Session videos (by modification order, **inferred**) | 1440: `runtime/video/b833451e5efabb494821bc18c988e0f6.webm`; 390: `runtime/video/a0d03c7074d34a807a3ff210ffb53874.webm` |

---

## 1. Page structure

Title `Notom`, caption "Nevertheless, go forth". Tags: Art Direction, Digital Design. Document height
**6494 px at 1440** and **4930 px at 390**. 141 elements (134 at 390).

| # | Block | y (1440) | h | Content |
|---|---|---|---|---|
| 1 | heading (h1, caption, **empty link row**) | 220 | **151** | the row keeps its slot (`min-height: 150.65px`) but holds no pill |
| 2 | tags | 536 | 40 | 2 pills |
| 3 | hero 16:9 | 606 | 589 | **video** 1920x1080, 31.4 s, muted loop, **with play/pause cursor control** |
| 4 | pair 3:4 | 1215 | 685 | image (JPG) + image (WebP) |
| 5 | full 16:9 | 1920 | 589 | video 1920x1080, 15.5 s |
| 6 | pair 4:5 | 2529 | 642 | image + video 1038x1298, 15.6 s |
| 7 | full **16:10** | 3191 | 655 | video 1728x1080, 11.3 s |
| 8 | full 16:9 | 3866 | 590 | image |
| 9 | pair 4:5 | 4476 | 642 | image + video 1080x1350, 12.0 s |
| 10 | full 16:9 | 5138 | 589 | video 1920x1080, 4.8 s |
| 11 | credits | 5728 | 187 | Content (4 linked names, each with a role in brackets), Web Development (1 name, **no link**) |
| 12 | next project: **Mira** | 5914 | 580 | cover 1920:1080, video |

**Media mix (observed):** hero video + **10 gallery slots = 5 videos + 5 images**, plus the next cover video.
No intro prose: the gallery starts 20 px under the hero.

**Pacing:** a clean pair/full alternation like George Davies, except two full-width blocks in a row in the middle
(16:10 video, then a 16:9 image). The page also ends on a full-width video instead of a pair. Blocks revealed
every **938 ms** (median) at ~640 px/s. At 390 the pairs stack (887–945 px).

---

## 2. Motion table (this page's values)

Every effect is the template's. See `work__george-davies.md` §2–3 for triggers, curves and per-frame tables.

| # | Effect | This page | Status |
|---|---|---|---|
| A | Heading cascade, 600 ms (.22,1,.36,1), 12 px, 85 ms steps | h1 0, caption 85, **link row 170 (animates an empty box)**, tags 255 and 340, hero 425. Measured at 1440: h1 395→840, caption 458→934, link row 527→1044, tags 691→1091 and 736→1184, hero 777→1278 ms. Lands at **1.28 s** (390: 1.15 s) | observed |
| C | Gallery reveal 500 / 600 ms, 20 px | 8 reveals (7 blocks + credits). Trigger tops **819–851 px** (median 828), i.e. 49–81 px inside the bottom. 390: 676–801 px | observed |
| D | Loading veil 320 ms | first at 994 ms | observed |
| E1/E2 | Sticky title in the nav | visible at scrollY 599 (tags bottom 576). Slot 0 → **84.6 px**: **title pill only**, no link pill on hover | observed |
| E3/E4 | Mobile dock | slot 0 → **76.6 px**. Narrower than the desktop slot, because no link pill sits beside the title | observed |
| F/G/H | Next-project rise / grow / label | revealing at scrollY 5459, **135 px** before the end. Scale 0.660298 → 1, same 702 / 576 / 198 ms | observed |
| I/J | Pull to Mira, View Transition 1100 ms | same state machine (**declared**). Not exercised here | declared |
| K | Link pill expand | **absent**: there is no `case-external` element, and the capture records no width/inset transitions on it | observed |
| L | Hero cursor pill | present (as on George Davies). Opacity 1 → 0 in 160 ms when the pointer leaves the hero, first at 24.3 s while scrolling | observed |

---

## 3. Differences from George Davies and from the site-wide system

- **No client-site link.** The heading's third row is empty but still reserves its height and still runs its
  `case-arrive` step. The sticky pill is the title only. The page has 10 unique hrefs: 4 nav, 1 notification, 4 credits and the next project.
- **Credits are a collaborator list** (production, DP, editor, photographer) with roles in brackets, and two of the four
  links go to Instagram. Web development is credited without a link.
- A **16:10** full-width video (655 px tall), the only one of the four pages.
- Same hero video control as George Davies. March 2004 and Mira have none.
- Site-wide differences are the same as for every case page (George Davies §4).

## 4. Spacing and type

Template values (George Davies §5). The only delta: the heading block is **151 px** instead of 153 px, so the tags sit
at y 536 and the hero at 606 (3 px higher than George Davies). Credits at 390 are 193 px tall (the bracketed roles wrap).

## 5. Outbound links

| Link | Where | Opens |
|---|---|---|
| `https://www.instagram.com/delirium.works/` | credits, Content (creative direction and production) | new tab, `noopener noreferrer` |
| `https://bentleyrawle.com/` | credits, Content (DP) | new tab |
| `https://www.instagram.com/samgooldylocks/` | credits, Content (video editor) | new tab |
| `https://colelferguson.com/` | credits, Content (photography) | new tab |
| `/work/mira` | next project | in-app, View Transition |
| `https://www.newapology.com/work/et-al` | site-wide notification bubble | same tab |
| `/`, `/work`, `/about`, `/journal` | nav | in-app |

Live-site notes: `sites/bentleyrawle.com`, `sites/colelferguson.com.md`.
