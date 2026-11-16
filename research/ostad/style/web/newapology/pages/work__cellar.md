# /work/cellar — case-study page

Study notes only. Nothing from newapology.com ships: no code, CSS, class names, fonts, images or copy.
Names appear as data so the structure is readable.

Same template and motion system as `/work/george-davies` (template reference: `work__george-davies.md`). The per-frame
curve tables for this batch are in **`work__auro.md` §3**. This file gives Cellar's own structure and numbers, plus
the **mobile (390) pull-to-next run**, which goes through the non-View-Transition path, measured only here.

## Sources

| What | File |
|---|---|
| Runtime capture | `runtime/work__cellar_1440.json`, `runtime/work__cellar_390.json` |
| Per-frame probe (1440 and 390, both pulled through to the next project) | `runtime_extra/probe_work__cellar_1440.json`, `runtime_extra/probe_work__cellar_390.json` |
| Media inventory | `runtime_extra/media_auro+cellar+cole-ferguson+et-al_1440.json` |
| Saved HTML | `extracted/page_work_cellar.html` |
| Session videos (**inferred** by write order) | 1440: `runtime/video/ce8f10227df230c9e728d9df1107df78.webm`; 390: `runtime/video/81be3d765f87f43a4ec990207bad5b52.webm` |

rAF ran at ~32 fps headless. Labels: observed / declared / inferred / unknown, as in `work__auro.md`.

---

## 1. Page structure

Title `Cellar`, caption "Open source secret sharing". **2 pills** (Visual Identity, Digital Design). One
**client-site link pill** (`cellar-app.io`) under the caption. Document height **6557 px at 1440** (the shortest of the
four), **5190 px at 390**. 126 elements.

| # | Block | y (1440) | h | Content |
|---|---|---|---|---|
| 1 | heading + link pill | 220 | 151 | title, muted caption, expandable link pill |
| 2 | pills | 539 | 40 | 2 pills |
| 3 | hero | 608 | **665** | **video** 1920x1218, 16.7 s, muted loop, no control. Ratio 2880:1827 (1.58:1), so it stands 76 px taller than the 16:9 heroes |
| 4 | intro prose | 1273 | 516 | 37 words, 26 / 31.2, 180 px padding |
| 5 | G0 pair 3:4 | 1789 | 685 | video 1080x1350 8.0 s + video 26.4 s |
| 6 | G1 full | 2494 | 628 | WebP, 2105:1262 |
| 7 | G2 pair 3:4 | 3142 | 685 | video 13.1 s + WebP |
| 8 | G3 full | 3847 | 629 | video 1800x1080, 19.5 s (5:3) |
| 9 | G4 pair 3:4 | 4496 | 685 | video 14.1 s + WebP |
| 10 | G5 full | 5201 | 589 | JPG 16:9 |
| 11 | credits | 5810 | 187 | 2 groups: Typography (2 typeface names, **no links**), Web Development (a person's name, no link) |
| 12 | next project: **ET AL** | 5977 | 580 | cover **video**, 16:9 |

**Media mix (observed):** hero video + **6 blocks (3 pairs, 3 full) = 9 slots: 5 videos + 4 images**, plus a video
next cover. **Video-led:** 7 of the page's 11 media are video (64 %), the highest share of the four (Cole Ferguson 62 %,
ET AL 38 %, Auro 32 %). 18 IntersectionObservers.

**Pacing (observed):** strict **pair / full alternation** (3:4 portraits 685 px against landscapes 589–629 px).
7 reveals, one every **969 ms** (median), one per **675 px** of scroll. The whole gallery is 4001 px, about
4.4 screens.

**At 390:** pairs stack to 945 px (2 x 466.7 + 12), full blocks are 197–210 px. Gallery reveal trigger tops were
**697–799 px** in an 844 px viewport, coarser than desktop because the scroll moves in raw 120 px steps (no smoothing
on mobile, observed: scrollY changed in exact steps).

---

## 2. Motion table (this page's values)

| # | Effect | This page | Status |
|---|---|---|---|
| A | Heading cascade 600 ms (.22,1,.36,1), 12 px | delays: h1 0, caption 85, link 170, pills 255 / 340, **hero 425**, **prose 510**. Prose reached opacity 0.999 at **1277 ms** | observed |
| B | Pre-hide of the gallery | at 352 ms (runtime capture), below the fold | observed |
| C | Gallery reveal 500 ms ease / 600 ms (.22,1,.36,1), 20 px | 7 reveals; trigger tops **834–862 px** (median 850) at 1440 | observed |
| D | Loading veil 320 ms | first at 1153 ms, 72 observations | observed |
| E1/E2 | Sticky title in the nav | visible at scrollY **585**; slot 0 → **78.92 px**; pill after 240 ms | observed |
| E3/E4 | Mobile dock | visible at scrollY **480** at 390; slot 0 → **123.92 px** (title + link icon); dock 150→0 px, 450 ms. Fit: (.22,1,.36,1) 450 ms **RMS 0.14 %**, opacity `ease` 250 ms RMS 0.17 % | observed |
| F/G/H | Next cover rise / grow / label | `revealing` with **130 px** left (1440) / 146 px (390). Scale **0.660298 → 1** (1440), **0.78 → 1** (390, fixed mobile value). 390 fits: rise RMS 0.07 %, grow RMS 0.16 % | observed |
| I | Pull | 1440: pull 20 / 40 / 60 at 19 062 / 19 246 / 19 445 ms. 390: **10 / 20 / 30 / 40 / 60** (the probe's 20 px wheel registered as 10 px per event on the mobile emulation, then a 40 px event hit the cap) | observed |
| J | Route change into ET AL | **1440: View Transition**, called at 19 435, new route at 19 574 (+139 ms), cover and title groups 1100 ms (19 594 → 20 747). **390: no View Transition** (below 768 px the code takes the clone path, see below) | observed |
| K | Link pill expand (hover) | label width 0 → **92.16 px** in 380 ms (.3,0,.2,1), label opacity 180 ms after 80 ms, pill inset −2 px in 250 ms (.22,1,.36,1) | observed |

### Mobile route change (390), observed
At 19 321 ms the phase went to `leaving`. 123 ms later the new route was in, and two `Element.animate` calls ran on
fixed clones:

| Clone | Keyframes | Duration / easing |
|---|---|---|
| next cover | translate(0, 0) scale(1) radius 17 px → translate(0, −49.4 px) scale(1, 1) radius **5 px** | 1100 ms, (.66,0,.25,1), fill forwards |
| next title | translate(0, 0) → translate(0, −344.2 px) scale(1, 1) | 1100 ms, (.66,0,.25,1) |

On mobile the clone only slides up into the incoming hero's slot. The scale stays 1 because the 350 px cover already
has the hero's width. The dock-exit clone (320 ms, (.55,0,.8,.45)) did **not** run: the dock was already hidden by
`data-footer-near`, and the code skips it in that state (declared).

---

## 3. Differences from the site-wide system and from the template

- **Tallest hero** of the batch (665 px, 1.58:1 source). The cascade timing does not change with it.
- **Credits without links** (typefaces and developer named, nothing clickable). Every other page links its credits.
- **Shortest case page** (6557 px): only 6 gallery blocks.
- **Next cover is a video** (ET AL's 16:9 hero), so the rise/grow plays over moving footage. Auro and ET AL's next
  covers are stills.
- The link pill's expand is the same component as the header's "work with us" pill (same 380 ms (.3,0,.2,1) width
  curve): one shared pill vocabulary.

## 4. Spacing and type deltas

Identical to the template (`work__auro.md` §5): display 36 / 42.48 (390: 24 / 28.32), intro 26 / 31.2 (20 / 24),
media gap 20 / 12, prose padding 180 / 90, pill row margins 165 + 29 / 100 + 20. The 3:4 pairs make each pair 685 px
(4:5 pairs elsewhere are 642). The external pill fills the link row 30 px under the caption. The heading block stays
151 px because the template gives it a fixed min-height (150.65 px, declared), with or without the pill.

## 5. Outbound links

| Link | Where | Opens |
|---|---|---|
| cellar-app.io | heading link pill (expands on hover to show the domain) | new tab, `noopener noreferrer` |
| cellar-app.io | sticky title's second pill (revealed on hover of the sticky) | new tab |
| /work/et-al | next project (pull or click) | same tab, View Transition (desktop) / clone morph (mobile) |
| /work/et-al (absolute URL) | runtime-only header notification (site-wide, **inferred**) | — |

No credit links. Plus the site nav: /, /work, /about, /journal.
