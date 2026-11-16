# /work/et-al — case-study page

Study notes only. Nothing from newapology.com ships: no code, CSS, class names, fonts, images or copy.
Names appear as data so the structure is readable.

Same template and motion system as `/work/george-davies` (template: `work__george-davies.md`). Per-frame curve tables
for this batch: **`work__auro.md` §3**. ET AL is the **richest** case page of the four. It is the only one with an
essay ("Read more") dialog, **click-through carousels**, a video with a cursor control inside the gallery, and
**asymmetric 5+7 pairs**. These are measured below.

## Sources

| What | File |
|---|---|
| Runtime capture | `runtime/work__et-al_1440.json`, `runtime/work__et-al_390.json` |
| Per-frame probe (1440, pulled through to the next project) | `runtime_extra/probe_work__et-al_1440.json` |
| Interaction probe (new): Read-more dialog open/close, carousel clicks, video-block hover | `runtime_extra/probe_etal_interactions_1440.json` |
| Media inventory | `runtime_extra/media_auro+cellar+cole-ferguson+et-al_1440.json` |
| Saved HTML | `extracted/page_work_et-al.html` |
| Session videos (**inferred** by write order) | 1440: `runtime/video/ebe078d5395e6a7423e358f4eb93b6a2.webm`; 390: `runtime/video/15bfcef720a202eb8cfeb29e724ba172.webm` |

---

## 1. Page structure

Title `ET AL`, caption "Taste deserves infrastructure". **5 pills** (Visual Identity, Art Direction, Digital Design,
Creative Direction, Campaign). Under the caption sits a **"Read more" pill** (a plus icon that expands to a label),
not a client link. The client site appears only in the sticky title. Document height **18 901 px at 1440**,
**14 354 px at 390**. **349 elements**, 2x the others. Network idle arrived at **19.2 s** (others 1.8–6.3 s). The cascade
still started at about 360 ms.

| # | Block | y (1440) | h | Content |
|---|---|---|---|---|
| 1 | heading + Read-more pill | 220 | 151 | |
| 2 | pills | 539 | 40 | 5 pills |
| 3 | hero 16:9 | 608 | 589 | **video** 1920x1080, 29.7 s, muted loop |
| 4 | intro prose | 1198 | 610 | 60 words (the longest intro) |
| 5–28 | gallery, **24 blocks** | 1807 → 17 656 | — | see below |
| 29 | credits | 17 676 | **665** | **9 groups**, 12 linked names |
| 30 | next project: **Pinto** | 18 321 | 580 | cover image 1724:970 |

Gallery (observed after lazy mount; "5+7" = column spans):

| # | Type | y | h | Slots |
|---|---|---|---|---|
| G0 | full | 1807 | 589 | JPG |
| G1 | pair 6+6 4:5 | 2417 | 642 | PNG + video 7.0 s |
| G2 | `videoPlayer` full | 3079 | 589 | video 22.4 s |
| G3 | pair **5+7** 4:5 | 3688 | 753 | PNG 425x531 + JPG 603x753 |
| G4–G5 | full x 2 | 4462 / 5071 | 589 | video 26.5 s, video 14.1 s |
| G6 | pair 6+6 | 5680 | 642 | video 6.1 s + JPG |
| G7 | full | 6342 | 589 | PNG |
| G8 | pair 6+6 | 6952 | 642 | JPG + video 1152x1440 18.9 s |
| G9 | full | 7614 | 589 | video 8.9 s |
| G10 | pair **7+5** | 8223 | 753 | video 10.1 s + video 7.0 s |
| G11 | full | 8997 | 589 | PNG |
| G12 | pair 6+6 | 9606 | 642 | **carousel (2 slides)** + JPG |
| G13 | full | 10 268 | 589 | PNG |
| G14 | pair **5+7** | 10 878 | 753 | **carousel (2 slides)** + JPG |
| G15 | `carouselBlock` full 3:2 | 11 651 | 698 | **carousel (4 slides)** |
| G16 | full | 12 370 | 589 | PNG |
| G17 | pair **5+7** | 12 979 | **804** | video 4:5 9.1 s + video **9:12** 1080x1920 13.2 s |
| G18 | full | 13 803 | 589 | JPG |
| G19 | pair **7+5** | 14 412 | 753 | **carousel (2 PNG slides)** + 3:4 video 9.8 s **with play/pause cursor control** |
| G20 | full | 15 186 | 589 | video 7.5 s |
| G21 | pair 6+6 | 15 795 | 642 | JPG + JPG |
| G22 | full | 16 457 | 589 | PNG |
| G23 | `videoPlayer` full | 17 067 | 589 | video 11.1 s |

**Media mix (observed):** hero video + 24 blocks (11 full, 10 pairs, 1 carousel block, 2 video blocks) = **37 media
elements counting each carousel slide: 14 videos + 23 images**, 4 carousels. 50 IntersectionObservers, 4190 rAF calls
at 1440. Images mix JPG and PNG (the PNGs are the flat graphic frames).

**Pacing (observed):** the longest scroll of the four. A **pair/full alternation** runs almost the whole length. The
rhythm comes from the pair widths: 6+6 pairs (642 px) alternate with 5+7 / 7+5 pairs (753–804 px), which sit
**top-aligned with ragged bottoms** (the 5-column slot is 531 px tall next to a 753 px one). 25 reveals, one every
**947 ms** (median), one per **636 px**. The whole gallery is 15 849 px, about 17.6 screens.

**At 390:** every pair stacks (the 5/7 spans collapse to full width), so the ragged pairs become plain stacks of
4:5 images.

---

## 2. Motion table (this page's values)

| # | Effect | This page | Easing | Status |
|---|---|---|---|---|
| A | Heading cascade | h1 0, caption 85, Read-more 170, pills **255 / 340 / 425 / 510 / 595**, **hero 680**, **prose 765**. Prose opacity 0.999 at **1492 ms**, the longest cascade of the four | (.22,1,.36,1) | observed |
| C | Gallery reveal | 25 reveals; trigger tops **832–864 px** (median 853). Fit on G0: transform **RMS 0.09 %**, opacity 0.05 % | ease / (.22,1,.36,1) | observed |
| D | Loading veil | first at 514 ms, **288 observations** (one per media as it loads) | (.22,1,.36,1) 320 ms | observed |
| E1/E2 | Sticky title | visible at scrollY **584**; nav slot 0 → **79.16 px**; pill fit 280 ms **RMS 0.29 %** | (.22,1,.36,1) | observed |
| E3/E4 | Mobile dock | slot 0 → **124.16 px**; dock at 22 908 ms; header actions leave at 45 661 ms | | observed |
| F/G/H | Next rise / grow / label | `revealing` with **143 px** left. Rise fit **RMS 0.05 %**. Scale 0.660298 → 1 | as template | observed |
| I/J | Pull + View Transition into Pinto | pull 20 / 40 / 60 at 54 057 / 54 243 / 54 455; VT called 54 433.5, route in 54 558.5 (+125 ms), cover and title groups 54 589 → 55 711, Pinto's cascade at 55 836 | (.66,0,.25,1) 1100 ms | observed |
| K2 | **Read-more pill expand** (hover) | label width 0 → **84 px** in 380 ms, label opacity 180 ms after 80 ms, and the pill's backing inset 0 → −2 px over **380 ms (.3,0,.2,1)**. The link pills elsewhere use 250 ms (.22,1,.36,1) for the inset, so this pill grows its backing on the same curve as its label | (.3,0,.2,1) | observed |
| O | **Essay dialog** (click Read more) | opens a full-viewport `<dialog>` in place (URL stays `/work/et-al`, observed; the href to `/work/et-al/taste-deserves-infrastructure` is the fallback for modifier-clicks, declared). Backdrop tint oklch(0.313 0 0 / **0.15**). Escape closes and the backdrop returns to transparent (0.42 s background transition, declared). Essay elements enter with `nap-essay-element-in` (−10 px → 0, opacity) 400 ms (.22,1,.36,1) after 330 ms (declared). The dialog has its own Lenis instance (class observed) | see row | observed + declared |
| O' | Dialog slide-in | `nap-dialog-in` translateY(100dvh) → 0, 550 ms (.22,1,.36,1) is declared. The first probe sample, **194 ms** after the click, already showed `transform: none`. Whether it ran at 1440 in full-screen presentation is **unknown** | | unknown |
| P | **Carousel crossfade** (click anywhere on it, or ←/→) | outgoing slide 1 → 0 and incoming 0 → 1, **350 ms `ease`**, same start (observed 26 969 → 27 345 incl. one frame of lag). The dots change 0.3 → 1 white alpha in **200 ms** `ease`. **No autoplay**: no slide changed during the whole scroll (observed). Wraps around. A video slide waits until it can play before it becomes active (declared) | ease | observed |
| L | Gallery video cursor control (G19) | a fixed pill follows the pointer over the video with a pause/play glyph. On click the glyph swaps from two pause bars to a play triangle drawn with an icon mask (rotate 90°). The swap is a state change, not an animation (styleWrites at 53 966 and 56 962 ms). Fades out in 160 ms when the pointer leaves (template value, see `work__george-davies.md`) | | observed |

### Carousel crossfade, samples (observed, first carousel, click at 26 917 ms)

| t (ms) | slide 0 opacity | slide 1 opacity | dot 0 alpha | dot 1 alpha |
|---|---|---|---|---|
| 26 969 | 1 | 0 | 1 | 0.30 |
| 27 002 | 0.920 | 0.080 | 0.860 | 0.440 |
| 27 063 | 0.553 | 0.447 | 0.461 | 0.839 |
| 27 125 | 0.258 | 0.742 | 0.321 | 0.979 |
| 27 188 | 0.098 | 0.902 | 0.300 | 1 |
| 27 282 | 0.007 | 0.993 | | |
| 27 345 | 0 | 1 | | |

The two opacities sum to 1.000 on every frame (a true crossfade over a transparent base). The midpoint falls at ≈ 30 %
of the duration (`ease` reaches 50 % at 29.3 %). 60 fps settle: frame 19 of 21.

---

## 3. Differences from the site-wide system and from the template

- **Read-more instead of a client link**: the heading pill opens an in-page essay. The client site moves to the sticky
  title's hover pill.
- **Asymmetric pairs** (5+7 and 7+5 column spans, plus one 9:12 portrait at 804 px). The only page of the four that
  uses spans other than 6+6, so the bottoms go ragged on purpose.
- **Carousels** (4) with a pill of 7 px dots, 6 px apart, inset 20 px from the bottom-left (12 px at 390). The only
  click-driven media on these pages, and the slides crossfade. Nothing slides sideways.
- **A video with a cursor control inside the gallery** (G19). On the other pages that control appears only on heroes.
- **Credits as a long list**: 9 groups, 665 px tall, 12 outbound links (production, photography, styling, set, hair,
  web development, logomark, motion, interface support).
- Heaviest page: 19.2 s to network idle, 288 loading-veil fades, 50 IntersectionObservers.

## 4. Spacing and type deltas

Template values (`work__auro.md` §5). Page-specific:
- spacing histogram adds **6 px** gaps (carousel dots) and **50 %** radii (dots), plus 9 extra 2 px margins
  (credit headings);
- 4:5 pair slots measure 514 x 642 (6+6), **425 x 531** (5 columns) and **603 x 753** (7 columns), from the 12-column
  68.95 px grid with 20 px gutters;
- the intro is the longest (610 px block, 60 words).

## 5. Outbound links

| Link | Where | Opens |
|---|---|---|
| /work/et-al/taste-deserves-infrastructure | Read-more pill (normally opens the dialog in place) | same tab only on modifier-click |
| et-al.online | sticky title's hover pill (not in the heading) | new tab, `noopener noreferrer` |
| instagram.com/sync.age | credits, Production | new tab |
| instagram.com/andrew.greyy, instagram.com/denismanokha, instagram.com/valerielevanova | credits, Photography | new tab |
| instagram.com/nemchenko.online | credits, Styling | new tab |
| pavlolotnik.com | credits, Hair | new tab |
| roko-g.work, darkroom.engineering, davidshamiev.site | credits, Web Development | new tab |
| instagram.com/thispopshitpop | credits, Logomark Mastering | new tab |
| instagram.com/alxacecchetto | credits, Motion Support | new tab |
| kirillkozyrev.com | credits, Interface Design Support | new tab |
| /work/pinto | next project | same tab, View Transition |
| /work/et-al (absolute URL) | runtime-only header notification (site-wide, **inferred**). It points to this same page | — |

Plus the site nav: /, /work, /about, /journal.
