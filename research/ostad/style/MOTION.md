# Motion: the Ostad brand bible's motion chapter

Written 2026-11-16. This chapter **adds to** the system we already have and doesn't replace it: the calm signature glass (DECISIONS 11–12), the YouTube system in `brand/remotion/src/components/YT.tsx` (14b–14c), the client rules (14d) and the process (`research/ostad/PROCESS.md`). It turns the measured reference studies into named timing tokens, a reveal grammar for speech, a short list of designed transitions and a spacing system for 16:9 and 9:16. The reusable animations built on these tokens are in `ANIMATION_LIBRARY.md`. What was adopted, adapted or rejected is logged in DECISIONS 14e.

**Sources** (short names used in every citation below):

| Short | File |
|---|---|
| DDOS | `research/ostad/style/read/ig_Ddos1QZRGmV.md`: the client's model post, 2,953 frames at 30 fps |
| G1–G4 | `research/ostad/style/read/evident_yt_group1.md` … `group4.md`: 53 Evident YouTube Shorts, read board by board |
| NAP | `research/ostad/style/web/newapology/pages/site.md`: newapology.com, site-wide motion and spacing |
| M04 | `research/ostad/style/web/newapology/sites/march2004.com.md` |
| SU | `research/ostad/style/web/newapology/sites/softunion.online.md` |
| CEL | `research/ostad/style/web/newapology/sites/cellar-app.io.md` |
| DEC | `research/ostad/style/DECISIONS.md` |
| MR | `brand/motion/RULES.md`: the earlier board-reel motion tokens |
| YT / RO | `brand/remotion/src/components/YT.tsx` / `Ro.tsx` |
| BOARD | `brand/edits/exomind-skin/stills/BOARD.md`: the 6 Exomind ideas × 3 looks |

**Frame rates.** OstadYT renders at 24 fps (DEC 14b, "24 fps"). Reels and the Evident references run at 30 fps. Every token below is given at both rates. Evident frame counts (30 fps) are converted to 24 fps by × 0.8; web durations (ms) by × 0.024 (24 fps) and × 0.030 (30 fps). Everything is rounded to the nearest whole frame.

**Measured on all 53 Evident Shorts (2026-11-16).** `pacing.json` and `sfx.json` (M17/M19) are in for 53 of 53. Pacing: median 2.74 words/s (range 1.65–3.79), 9.4 pauses a minute (median 0.42 s), 3.0 % dead air, sentences 5.4 s. Sound: graphic and caption entries land within ±3 f of an audio onset 60 % of the time against 59 % chance (random frames, same onset density; text 66 %, graphics 60 %), and only 20 % meet a strong onset (strength ≥ 0.5). That repeats the DDOS result (62.6 % vs 58.7 %): Evident does not sync a sound to each reveal. `easing.json` (M12) is still computing; until it lands the Shorts timings come from the board reads (±2 f, G1 §6), the easing *shapes* from the DDOS pixel tables (§4, Moments A–C) and the newapology bezier fits.

---

## 1. Principles

1. **The motion is the meaning.** Bar height is the number, the fill is the share, the trace is the path, and the highlighter is the phrase he's saying. DDOS has 0 UI widgets in 33 beats (§1.1, R1). The Shorts keep UI "only when it is the evidence itself" (G1 §5, R1 refined). For us this means no play/pause, cursor, step-player chrome or decorative icon (DEC 14d rules 1, 5). This answers the client's 2026-11-16 note that widgets read as random.
2. **Reveal on the word.** Short reveals start **+1 frame after the word's onset**: the DDOS median over 23 reveals, abs median 2 f, 65 % within ±3 f (§1.2). Highlights in the Shorts match this (+1 f, n = 7; G1 §2 T1). Long builds may start on the clause before, so long as they *land* on the key word (G3 §5 R2 refined: "start up to 0.5–2.5 s early … finish by the number"; G4 A1). This is the same discipline as our word-onset captions (DEC 14c: 0 f offset on decoded frames).
3. **Build in place before you cut.** One scene grows across a sentence instead of cutting to a new card: DDOS B05 adds 4 reveals over 10.9 s (frames 366–693), and 7 of 32 transitions are in-place additions (§1.3). Graphic-led Shorts hold one scene for 10–24 s while it keeps building (G1 §3). For us: a visual every ≤ 5 s (client, DEC 12), and inside a held scene a new step every 2–4 s (G1 §5, R4 refined).
4. **Calm curves: no spring, no overshoot.** newapology has "no spring and no overshoot anywhere on the site" (NAP §6). Its durations sit at 180–1100 ms, softunion's at 350–750 ms (SU §8.7), and Evident's element entries settle in a median 5.5 f, p90 19 f, at 30 fps (DDOS §2). Our brand already rejected glossy pops (DEC 10–11). `easeOutBack` in `brand.ts` stays unused in this system.
5. **One grammar, a new form each time.** Keep the constants (room canvas, glass, one blue family, the highlighter, word captions) and change one variable per repeat. DDOS's three bar charts each change the title, the label and the accent position (§3, R6). No two neighbouring sections share a layout (DEC 14b).
6. **One accent, and it's for the punchline.** DDOS uses lime only on 9 punch elements (§1.5, R7). We use ice blue `#cfe9f7` (highlighter `#c4e4f8`) over slate `#5b6f8a` and brand blue `#37a9e8` (BOARD, Colour). The Shorts say "one accent per video, never two on one chart" (G4 A6) and "do not rotate in non-brand hues" (G1 §5 R7). Never green (DEC 14d rule 4).
7. **Real pictures carry the explanation.** The mechanism is simulated step by step on real imagery (G1 R22, IkrW 610–880), and annotation sits on footage (G1 R23; 19 uses in G4). For us that's real practice or BTL footage and the Flora glass head and neurons. There is no drawn anatomy (DEC 14d rule 6), and markup never goes on his face (memory: markup on condition images; G1 R23).
8. **Hard cuts by default. Designed transitions are rare and mean something.** DDOS has 21 hard cuts, 2 defocus-ins and 0 crossfades (§2, R17). newapology's one signature move is the shared-element morph (NAP §3B). softunion crossfades through a blank only on page change (SU S5). We allow three designed transitions (§4) and nothing else.

---

## 2. Timing and easing tokens

Eight curves plus two non-curve timings (`cut`, `count`). Implementation: `brand/remotion/src/library/motion.ts` (Remotion `Easing.bezier`). Durations are frames at **24 / 30 fps**.

| Token | cubic-bezier | Duration (24 / 30 fps) | Distance | Stagger, cap | Used for | Derived from |
|---|---|---|---|---|---|---|
| `cut` | step (0 f) | 0 / 0, placed at onset **+1 f** | none | none | caption words, karaoke words lighting, value-tag and label pops, hard cuts | DDOS §1.2 (+1 f median); DDOS Moment A (sweep starts 1 f after the onset, f28→29); captions DEC 14c, 14d rule 8 |
| `arrive` | `.22, 1, .36, 1` | **14 / 18** (600 ms) | opacity 0→1, rise **16 px** at 1080 high | **2 / 3 f** (85 ms), cap **10 / 13 f** (425 ms) | anything that enters on its word: labels, rows, chips, glass cards | NAP §5A `nap-page-enter` 600 ms, 12 px, `min(85·i, 425)`; NAP §6 (peak at 0, 99 % at 65 %, no overshoot) |
| `settle` | `.25, .1, .25, 1` (CSS ease) | **48 / 60** (2 s) | rise 20 px | 0.7 × word step (YT `Kinetic`) | secondary type that isn't tied to one word: chapter sublines, credits, the `settle` of glass; the 963 fadeUp | YT `life()` (DEC 14c: "the 963 fadeUp: 2 s, CSS ease, 20 px rise"): **kept unchanged** |
| `sweep` | `.6, 0, .25, 1` | highlighter **16 / 20**; row wipe **14 / 18**; bar **26 / 33**; trace **27 / 34**; dot-grid fill **18 / 22** | its own length | successive rows 30–90 f apart, each on its word | highlighter, row wipe, bar growth, line traces, fills: anything whose *progress* is the content | DDOS Moment A (20 f, peak at 44 %), Moment C (18 f, peak 44 %), Moment B (bar 33 f, peak 45 %), waffle (22 f), B03 trace 216–250 (34 f); NAP §6 `--nap-control-ease` (.6,0,.25,1) peaks at **0.43**, the same shape; G1 T1 / G4 T1 spacing |
| `swap` | `.16, 1, .3, 1` (outExpo) | **16 / 20** (650 ms) | one line height, inside a mask | none | the rolling label: the old value leaves up to −100 % as the new one rolls in from +100 %, both on this curve; the box is sized to the longest string | SU S2 (650 ms outExpo, fit RMS 0.0017–0.0029, 10× better than outQuart); SU §8.2 (no reflow); G2 T16 label swap (LSuT 23–115) |
| `plate` | `.15, 0, .25, 1` (march2004 house curve) | plate **18 / 23**, then picture **18 / 23** (750 + 750 ms) | opacity only | index stagger **1 / 2 f** (50 ms), cap **12** steps | plate-then-picture: a neutral glass plate first, then the real image fades through it; capped grid entries | M04 M1 (750 ms, `350 + 50·min(i,12)` ms), M2 (picture through the grey plate, 750 ms), M04 §8.3 |
| `morph` | `.66, 0, .25, 1` | **26 / 33** (1100 ms); the surround fades out in **5 / 6 f** (200 ms, CSS ease) | card rect → full frame; radius 24 → 0 | none | card-to-full-frame and back (§4.2) | NAP §3B View Transition (1100 ms, peak at 46 %, radius 19 → 5 px, old root out 200 ms) |
| `exit` | `.4, 0, 1, 1` | **7 / 9** (300 ms) | opacity 1→0, fall 7 px | `min(25·n, 300)` ms → **1 / 1 f**, cap **7 / 9 f** | everything leaving that isn't a hard cut | NAP §3C `nap-index-out` (.4,0,1,1), 7 px, `min(25n,300)`; duration from RO `enter()` out 0.3 s and MR `duration.exit` 300 ms |
| `blank` | `.76, 0, .24, 1` (inOutQuart) | out **11 / 14**, blank hold **7 / 9**, in **11 / 14** (450 + 290 + 450 ms) | opacity through the room canvas | none | chapter changes only (§4.3) | SU S5 (450 ms inOutQuart out, ~290 ms blank, 450 ms in) |
| `count` | linear | the length of its bar, then **+2 f** | value | none | rolling counters beside a growing bar | DDOS Moment B (counter linear at ≈ 0.25 %/f, ends 2 f after the bar) |

### How the tokens map onto what we already have

- **`arrive` replaces the quint-out entrance and is nearly the same curve.** RO `enter()` and YT `prog()` use quint out (`1 − (1 − q)^5`, 0.45–0.5 s, 18 px rise). Computed: quint out reaches 99 % at 60 % of its duration, `.22,1,.36,1` at 65 %, and both have their peak velocity at t = 0 (computed in the session from the beziers; NAP §6 gives the same 65 % for `.22,1,.36,1`). So existing cards don't change visibly. New library code uses `arrive` at 14 f / 16 px so that reels and long-form share one number. RO's 18 px and 0.45 s stay valid in old components (within 4 f and 2 px).
- **`settle` is YT's 963 fadeUp, kept.** It's the client-approved calm type entrance (DEC 14c). The library uses it only for type that isn't tied to a word. A word-tied reveal must use `cut` or `arrive`, because a 2 s fade can't land on a word.
- **`sweep` is the one in-out curve.** MR's `easing.in-out` `(.65,0,.35,1)` peaks at 0.50 (computed). Evident's measured sweeps peak at 0.44–0.45 (DDOS Moments A–C), which `.6,0,.25,1` matches at 0.43. MR's in-out stays for camera zoom-ins on the board-reel style. All explainer progress uses `sweep`.
- **`exit` reconciles three sources.** It uses RO's 0.3 s and MR's `duration.exit` 300 ms on newapology's accelerating `.4,0,1,1` (MR's `easing.in` `.55,.06,.68,.19` has the same accelerating shape).
- **`blank` is MR's "only transition besides a cut" made specific.** MR's `duration.dissolve` is 500 ms (12 f). softunion's measured 450 + 290 + 450 ms gives the same 11 f fades, with the cut hidden inside the blank.
- **The step player's 520 ms cubic ease-out** (DEC 14c) stays as is. It's the quiet progress indicator the client still allows (DEC 14d rule 1), not a library token.
- **Stepped graphics (2s/3s) stay an A/B option on data graphics only.** DDOS steps 44 % of graphic frames (R11), but the Shorts' graphic segments step only a median 7.8 % (G1 §3) and whole videos 0–11.1 % (G3 §3). So the evidence for stepping is weaker than it looked from one post. The default is smooth at 24 fps, with footage never stepped.

---

## 3. Reveal grammar for speech

Timing comes from `yt_words.json` / `caption_words.py` (onsets on the sped-up timeline, PROCESS §4). In every rule below, "onset" means the measured audio onset of the named word.

| Move | Rule | Numbers | Source |
|---|---|---|---|
| **On the word** | A pop, a label or a highlight *starts* at onset + 1 f (`cut`). A long build (≥ 20 f) may start up to 2.5 s early, on the clause before, but its end must land within ±3 f of the key word. A cut to a new picture happens mid-sentence on the claim word, not at the full stop | DDOS +1 f median, 65 % within ±3 f; 22 of 31 beat changes mid-sentence (R3) | DDOS §1.2, R2, R3; G3 §5 R2; G4 A1 |
| **Build in place** | Add the next bar, row, label or trace to the scene already on screen. Re-frame (push into the slot, pull back to make room) inside our 1.1–1.2x cap | B05 four reveals in 10.9 s; reframes 416–430, 540–560 | DDOS §1.3, R5, R16 |
| **Highlighter on the spoken phrase** | A flat block in `#c4e4f8` behind the phrase, square corners, swept left to right with `sweep` in 16 f at 24 fps (14–20 f range); the text stays ink. It starts at onset + 1 f and stays lit. Never on a box border, never glossy | 20 f, peak at 44 %, 74 px tall (5.8 % H) at 720×1280 | DDOS Moment A, R9; G1 T1 (+1 f, n = 7) |
| **Progressive highlight** | The thesis line is laid out dim (`#bcbcbc` on the room canvas). Each word lights to ink on its onset (`cut`, ±1 f), and the highlighter grows under the punch phrase across its words. Captions are hidden while the line is up | karaoke ±1 f on 7 words; G2 karaoke 7–26 s | DDOS B26, R19; G2 T2 (yh4l 3308–4085) |
| **Rolling label swap** | One device, one variable. The label rolls (`swap`, 16 f) inside a mask sized to the longest value, so nothing reflows. The number or word changes on its spoken onset | 650 ms outExpo | SU S2; G2 T16 |
| **Plate, then picture** | A neutral glass plate in the image's final rect (`plate`, 18 f), then the real image fades through it (`plate`, 18 f). Labels arrive last (`arrive`, 2 f stagger). Use it for before/afters and any clinical image, so the frame never pops from empty to a photo | 750 + 750 ms | M04 M1–M2, §8.3 |
| **Dim the rest** | When one line or object matters, everything else dims to 0.33–0.5 opacity (a dark scrim of the same strength over footage) over 10–24 f on `sweep`. Never as far as 0.2. Then a hairline box (0.65 px at 1080p scale, `#8e8e8e` on light, white on footage) and a leader label isolate the subject. Dimming replaces scaling up the focused thing | dim 10–24 f; isolate lands 15–25 f after the highlight; dim levels 0.5 / 0.33 (roko-g), 0.33 / 0.15 (georgedavies); colelferguson flags its own 0.2 as too strong | G4 T6 (5J8M 620–760); G3 T12 (iZ4 567, 3463); `web/newapology/sites/roko-g.work.md`, `georgedaviesstudio.com.md`, `colelferguson.com.md` §9 |
| **Counter** | A number counts `count` (linear) while its bar grows on `sweep`, finishing 2 f after the bar. Counters show **cited** figures only, or a literal count of what's visible on screen (labelled as such) | ≈ 0.25 %/f; ends +2 f | DDOS Moment B, R10 |
| **Typed callout** | A short callout types on with his words (about 1 character per frame), hugging the rag | B09 1026–1085 | DDOS B09 |
| **Italic for another voice** | A patient's or a study's words are set in italic | f2050 | DDOS R14; G4 A7 |

Captions keep their own rule: word by word on the onset frame, with no fade, rise or shadow (DEC 14d rule 8). This chapter doesn't change that.

---

## 4. Transitions

**Default: a hard cut**, on the claim word (DDOS R3, R17). A defocus-to-focus of 6 f (DDOS B21: 7 f at 30 fps) is allowed only into a still or archive frame. Beyond those, three designed transitions are allowed in our style:

### 4.1 Brand-shape wipe

A soft-edged **room-canvas panel shaped like our glass card** (radius 24, the YT `RADIUS`) wipes across the frame on `sweep` in 14 f (24 fps) / 18 f (30 fps), revealing the next shot behind it. Used at most once per chapter, to move from footage into a built scene. Evidence: the Shorts reveal report covers with a brand-shape wipe (G1 GS3 54–116; lMrm 1677). The timing is the row-wipe `sweep` (DDOS Moment C). It's never a glossy streak, a light leak or a cut-out logo.

### 4.2 Card ↔ full-frame morph

A media card (footage in a rounded window, radius 2 % of the window width; DDOS R12) grows into the full frame: its rect and radius (24 → 0) move on `morph` in 26 f (24 fps), while the surrounding type and canvas fade out in 5 f on CSS ease. Reverse it to send a full-frame shot back into its card. The footage keeps playing through the morph with no freeze. This is newapology's shared-element View Transition translated to video: 1100 ms, `.66,0,.25,1`, radius 19 → 5 px, old root out in 200 ms (NAP §3B). It replaces both a cut and a crossfade when the *same* shot continues at a new scale.

### 4.3 Blank crossfade, for chapter changes only

The outgoing shot fades to the room canvas (`blank`, 11 f), holds the canvas for 7 f, then the chapter title arrives (`arrive`) and the new section fades in (`blank`, 11 f). The total is 29 f, or 1.2 s at 24 fps. Source: SU S5 (450 ms out, ~290 ms blank, 450 ms in; the scroll reset is hidden in the blank). It's used only at a chapter title (the YT `title` kind, DEC 14), never between two shots of the same section. That keeps DDOS's "0 crossfades" true inside sections.

**Not allowed:** whip pans, zoom blurs, glitches, datamosh, light leaks, page curls, sliders. The one exception is R18's "medium as meaning" in its calm, inverse form, as a *content* animation (ANIMATION_LIBRARY L19), not a transition.

---

## 5. Spacing and layout

### 5.1 Base unit and scale

**Base unit u = 8 px at 1080 px frame height**, on a doubling scale: 8 / 16 / 32 / 64 / 128, with 24 (3u) and 48 (6u) as the in-between steps.

- march2004 uses a 6 px doubling scale (6/12/24/48, with 96 and 144) at 1440 CSS width (M04 §7). That gives 8 px when scaled to our 1920-wide frame (6 × 1920/1440 = 8).
- newapology's element step is 20 px at 1440 (NAP §7, "Spacing scale"), and softunion's gutter unit is 20 px (SU §7). Scaled to 1920, that's 26.7 px. We round it to **24 px (3u)** so it stays on the scale.
- Our existing tokens stay as the anchors: margin 9.1 % of width (`--ok-margin`, kit/tokens.css; YT `M` = 175 px at 1920), headline top 149 px (YT `TOP`), card radius 24 (YT `RADIUS`; DEC 14c), and the kit glass radius 2.74 cqw (kit/tokens.css). Footage windows use radius 2 % of the window width (DDOS R12).
- Radii: only three are used. **24** for glass cards, **2 % of width** for footage windows, and **0** for highlighter blocks and full frames. newapology also uses just two (5 px media, 19 px pills; NAP §7 Radii).

### 5.2 16:9 (1920 × 1080)

| Item | px | Source |
|---|---|---|
| Side margins | 175 | YT `M` (9.1 % W) |
| Grid | 12 columns, gutter 24, column 108.8 ((1570 − 11 × 24) / 12) | NAP §7 (12 cols, 20 px gap at 1440) scaled and rounded to 3u |
| Top line (headline cap top) | 149 | YT `TOP` |
| Title-safe box | x 175–1745, y 149–906 | YT `M`/`TOP`; bottom = caption zone top 930 − 24 |
| **Caption zone** | y 930–1010; caption top 950, 42 px, left at 175. Nothing else goes in this band | BOARD (Captions); DEC 14b (42 px) |
| Below the captions | y 1010–1080 stays clear (YouTube's scrub bar and hover chrome) | caption zone above; a judgement, not measured |
| Type | headline 44, hero 88, label 24 caps +0.04em, small ≥ 22, caption 42; Helvetica Neue LT Pro 65 Medium via `TYPEFACE` | DEC 14c; DEC 14d rule 7 |
| Section rhythm | 64 between groups, 24 inside a group, 8 between a label and its value | u scale; newapology's 200/20 px rhythm (NAP §7) scaled to video distance |
| His face | never covered; graphics sit beside him or in the empty third | DEC 12, 14; DEC 14d rule 3 |

### 5.3 9:16 (1080 × 1920)

| Item | px | Source |
|---|---|---|
| Side margins | 98 (9.1 cqw) | `brand.ts` `MARGIN` |
| Grid | 6 columns, gutter 24, column 127.3 ((884 − 5 × 24) / 6) | 3u gutter; newapology's mobile 12 px gap at 390 is too tight at reel scale (NAP §7) |
| Top safe | 250 (13.02 % H) | `brand.ts` `SAFE_T` |
| Zones | `top` 250–610 (over the hair, never the eyes), `chest` 1040–1560, `*Left` / `*Right`, `full` | `brand.ts`; DEC 12 (face track) |
| **Caption zone** | top at 83 % H = 1594; 1–3 words | `brand.ts` `CAP_TOP`; DEC 12 (Colin and Samir), DEC 14 (1593) |
| Right edge | keep text inside the 98 px margin. The Instagram/TikTok right-rail size isn't measured in our files; verify it on the first reel before relying on it | not measured |

---

## 6. What we don't do

| We don't | Why |
|---|---|
| Play/pause marks, cursors, taps, presses, sliders, step-player play pills | Client rule (DEC 14d rule 1). Evident uses 0 UI widgets in 33 beats (DDOS R1). Before/after is labelled cards, never a slider (G1 R27) |
| Generic reusable widgets (a timer, meter or toggle with no tie to his words) | Client 2026-11-16: bespoke, non-repetitive. DDOS R6: change one variable per repeat |
| Overshoot, springs, bounce, `easeOutBack` | No overshoot anywhere on newapology (NAP §6). Evident settles in 5.5 f with no overshoot (DDOS §2, Moment A). Calm direction (DEC 11) |
| Glossy glass letters, glints, bevelled or gradient type | Client: the glass words "look really cheap" (RO header, DEC 11). Calm glass is frost plus a hairline only (DEC 12) |
| Chalk-black or charcoal data canvases | DDOS uses charcoal #313032 (R8), and we **adapt** that to the cool blue-grey room canvas (hue 212–216°; DEC 14d v4) or navy #202532 (BOARD). Near-black reads as a different brand |
| Lime, yellow-green, or any green accent | Client rule (DEC 14d rule 4). DDOS R7 adapted to ice blue |
| Hand-drawn heads, brains, skulls, anatomy | DEC 14c, 14d rule 6. Flora glass head and neurons, or real footage traced frame by frame |
| Markup on his face | memory and G1 R23: labels go on condition images and footage of the treatment |
| Crossfades between shots inside a section | DDOS 0 crossfades (R17). The blank crossfade is for chapter changes only (§4.3) |
| Datamosh, glitches, tape breaks | DDOS R18 adapted: only the soft inverse (noise clearing to calm) |
| Invented numbers or illustrative charts with fake values | R1, "graphics only for what's said". BOARD: every unsourced slot is `[cited figure]`. A counter shows a cited value or a literal on-screen count |
| Kinetic "stamps" more than once a minute | G1 R25 caps them at one per minute, each on a different background |
| Per-graphic SFX on every reveal | Not evidenced: DDOS SFX hits 62.6 % vs 58.7 % chance (R20); the 53 Shorts measure 60 % vs 59 % chance, 20 % on a strong onset (`sfx.json`, M19). Keep one sound per hero reveal; voice stays ≥ 8 LU over the bed (DDOS 8.42 LU; the Shorts measure 10.2–12.0 LU, G1–G4 §3) |
| Cuts faster than his speech | Gentle cuts, then 1.1–1.2x (DEC 14). The Shorts' stutter edits (9 cuts in 4.6 s, G1 qf_jdmTkPgg) are rejected for long-form |
| Scroll-scrubbed motion tied to nothing | CEL M1's rotation is mapped to scroll (`180 × (1 − (1 − s)^2)`). The only video equivalent we take is mapping a rotation or progress to *his speech* (the progressive highlight); free-spinning objects are out |
