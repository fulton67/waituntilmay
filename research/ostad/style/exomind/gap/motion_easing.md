# Gap: motion and easing, YouTube v6 render (EXOMIND_REDO §4.3)

This file only measures; it changes nothing in the edit.
- **Measured render:** `Downloads/Ostad - Exomind and total skin health (YouTube v6).mp4`: 1920×1080, 24 fps, 2166 f.
- **Compared against:**
  - the MOTION.md tokens
  - `measure/_devices/entry_stats.json`: corpus `_all`, `evident`, `ro`
  - the rosacea render `Downloads/Ostad - Rosacea laser (v5, clean captions).mp4` (1080×1920, 24 fps, 2859 f), measured here the same way
- **Numbers:** in `motion_easing.json` (committed). Raw element tracks were kept out of the repo.

## Method (the corpus tools, unchanged, run on our pixels)

| Step | Tool | What it gives |
|---|---|---|
| Element tracks | `tools/render_elements.py` → M11 `graphic_track.m11` + M10 `ocr_track.m10`, short side read at 270 px like the corpus; hard cuts from ffmpeg `scdet=8` (v6: f1181, 1242, 1811, 1850) | 119 graphic and 773 text elements (v6); 227 / 468 (rosacea) |
| Entry and exit fits | `tools/render_entry_stats.py` → `easing_fit.element_fits` (bezier; the spring alternative is dropped for speed, while settle, overshoot and bezier use the same code) + `device_stats.classify` | settle (24 f), style, travel, overshoot, the velocity peak of each bezier, exit length, cut or animated |
| Graphic layer vs the empty room | `tools/layer_motion.py`: \|frame − room\| right of him (x ≥ 740, y < 940) | 1-frame pop-ins and cut-outs, exits at each beat line, how long each image keeps moving (full-res grey, change over 12 f, frozen < 0.10 grey levels = 5× the crf-16 still noise) |
| One-frame jolts | phase correlation of the graphic zone frame to frame; flagged when a shift ≥ 2 px has neighbouring frames < 35 % of it | f838 |
| Word timing | `brand/edits/exomind-skin/yt_words.json` × 24, checked against chance (random frames, same onset density) | how close entries sit to word onsets |

**Validation of the word test:** the word-cut captions measure **99 %** within 0…+3 f of an onset (chance 48 %), with a median offset of 0 f. The test resolves word lock at this speech density.

**Caveats:**
- The fit window is 0.8 s (19 f), so "settle 19" means *did not settle within 19 f*.
- Elements that keep drifting while held read as slow settles. This affects:
  - the B05 parallax panels
  - the B20 push
  - B04 and B11 (footage inside a window)
- Overshoot > 2 % reads high in both the corpus (69–92 %) and v6 (73 %): box jitter and drift (MOTION.md §1). The lab proof measured 0 px. **Not a gap.**

## 1. Entries (graphic layer, excluding the presenter's side)

| | n | settle 24 f median (IQR) | not settled in 19 f | velocity peak (share of move) | travel, rise / slide |
|---|---|---|---|---|---|
| **v6 graphics** | 92 | **11.5 (7–17)** | **16 %** | **0.07** (fade 0.03, rise 0.09, slide-L 0.20) | rise **7.31 % H**, slide-L **4.81 % H** |
| rosacea v5 graphics | 226 | 9.0 (6–14) | 11 % | 0.12 (rise 0.35, slide-R 0.58) | rise 5.42, slide-L 2.76 |
| corpus `_all` graphics | 7,969 fades / 3,802 rises | fade 8.8 (5–16), rise 10.4, scale 8.0 | n/a | x/y moves **41–46 %**, opacity **21 %** (MOTION §1) | rise 2.92, slide-L 2.92 |
| Evident Shorts | n/a | **7.2 (4.0–13.6)** (MOTION §1), fade 7.0 | n/a | `sweep` 43 % | rise 2.60, slide-L 2.19 |
| **v6 text (non-caption)** | 243 | **13 (5–17)**, 54 % pops | 7 % | 0.01 | rise 2.78, slide-L 4.21 |
| rosacea v5 text | 130 | 8.0 (3.5–14.5), 70 % pops | 4 % | 0.0 | n/a |
| corpus `_all` text | n/a | rise 11.2, slide 9.0, scale-in 5.0 | n/a | n/a | rise 4.22 |

### The slowest entries

**Graphic entries that never settled in 19 f:**
- B02 f124: the unit plate on `plate` 18 f
- B04 f344, f345, f354: the morph window
- B06 f583, f637
- B07 f693, f746
- B11 f1086
- B15 f1519
- B18 f1823
- B20 f1991, f2019

**Text entries at 16–19 f:**
- B05: the spatial panels slide in and keep moving (the parallax drift)
- B08: the intake form. All 10 of its rows ride the form's 27 f `arrive` rise of 0.18 × 1080 = **194 px (18 % H)**.
- B09: carousel cards on Colin's bezier, 17 f by design (type-card-rise)
- B14: "The next frontier" decode, 70 f by design
- B01: the wordmark and subline, 17–18 f

### Easing shape
The code uses `arrive` 58 times and `sweep` 20 times. Card rises and slides use `arrive` for *position* as well as opacity, so their velocity peaks at the first frame:
- v6: 0.07–0.20 across styles
- rosacea v5: 0.35 for rises
- references: 41–46 % for every x/y move (MOTION §1)

## 2. Exits

**Beat-line exits** (pixels lit 20 f before each beat's last frame, followed to the line):

| Beat line | Exit | Note |
|---|---|---|
| B02, B03, B07, B08, B11, B13, B15, B16, B20 | 5–7 f, largest one-frame drop 0.17–0.22 | matches the `exit` 7 f token |
| B01 | 12 f | staggered |
| B04 | 17 f | the morph back |
| B05 | 15 f | far panel first |
| B09 | 19 f | staggered |
| B19 | 20 f | staggered |
| **B12 → B13** | **23 % of the held graphics still up at f1241, cut at f1242** | scdet cut |
| **B14 → B15** | **22 % still up at f1448**, gone at f1449 | exit started at f1443: 6 f before the line for a 7 f exit |
| **B17 → B18** | B17's skull/applicator held at 101 %, then covered by B18's full-bleed cut-in | 56 % of the zone pops in at f1811 |
| **B18 → B19** | full-frame hard cut | 98 % of the zone cut out at f1850, which is onset + 1 f. Allowed as a picture cut on the word (MOTION §2), but not an animated exit. |
| B06 → B07 | held across | intended: one phone across both beats |

**Element exits** (the fitted tail of each element):
- v6 graphics: **3 % cut**, against rosacea 8 %
- Text: v6 58 % "cut", rosacea 52 %. This is mostly OCR identity changes, such as counters and typewriter text, not real cuts.
- Arrows are not cut: the lab proof measured a largest one-frame ink drop of 20–34 %.

**Captions** cut on and off per word by rule (DEC 14d rule 8), the same as in the rosacea render.

**One-frame pops and cuts inside beats** (pixels going 0.15 → 0.8 of their level in 1 frame, area ≥ 0.25 %):
- B01 f5
- B04 f294 (2.1 %)
- B06 f548
- B11 f1083 (1.6 %)
- B12 f1182
- B17 f1741

These are the first frames of `arrive`, which reaches about 40 % opacity at frame 1, plus the section typewriter. The letter-stagger outs at f285–291, 915–921, 1264–1271 and 1732–1738 are by design.

**Jolt:** the one real unanimated move is **B08 f838: the whole intake form jumps 7.7 px up in one frame** (neighbouring frames 0.45 px). There is also a 1.0 px jump at f800.
- Cause: `IntakeFormFill` sets `transformOrigin` to `focusY`. That value is a step function of the active field (`act` flips at `litAt − 6` = local 87), applied under a scale(1.04).
- The comment says "focus follows the active field (in-out)". It does not.

## 3. Timing against the spoken word

| | within 0…+3 f of an onset | chance | median to nearest onset |
|---|---|---|---|
| captions | 99 % | 48 % | 0 f |
| v6 text entries | 63 % | 48 % | +1 f (abs 2) |
| **v6 graphic entries** | **39 %** | **48 %** | 0 f (abs 2) |

- **Graphic entries on the render are not locked to words** (at or below chance).
- The plan in beats.json puts 87 % of its 83 word-named events within ±3 f of the word (median +1 f). The gap therefore comes from secondary entries:
  - staggered rows at fixed offsets (B10 rows at local 1/3/5/7, B07, B18)
  - components that start at local 0/1 of their beat
- Planned events more than 3 f off their own word (beats.json event − onset):

| Event | Word | Offset |
|---|---|---|
| B04 f293 | "questions" | **+22** |
| B04 f341 | "and" | +14 |
| B06 f547 | "please" | **−14** |
| B16 f1640 | "aware" | +9 |
| B02 f150 | "and" | +8 |
| B20 f2037 | "that" | +8 |
| B19 f1856 | "increase" | +7 |
| B19 f1900 | "where" | −8 |
| B16 f1614 | "you" | +6 |
| B17 f1765 | "create" | +6 |
| B12 f1234 | "and" | −4 |

The rosacea render could not be word-tested here: no word file at the same timing.

## 4. Do images keep moving for their whole life?

The existing `lint_compositions --static-image` passes all 11 layers. The per-frame test is stricter:

**v6: 15 of 15 image layers move on every frame of their life**, against rosacea v5 where 16 of 28 image cards move throughout (longest frozen run 31 f). v6 is ahead here. Two weak spots:
- **B13 thumbnails barely move.** `ceg_ferulic` measures a median 0.11 grey levels per 12 f (13 % of frames frozen) and `IMG_3712` 0.21. The gentlest allowed drift, 1 % zoom per 48 f, is about 0.39 per 12 f. Next to the other v6 images (2.8–13.6), they read as still.
- **B02's hero product image lives 28 f** (f125–152, plate exit at local 46 inside a 54 f beat). It is the shortest image life in the edit, and its `plate` entry is 18 f, so it is fully settled for only about 10 f.

## Top 5 gaps, ranked, with the fix

1. **Entries are slow.**
   - Measured: graphic settle median **11.5 f (IQR 7–17), 16 % unsettled at 19 f**. Text: 13 f.
   - Compare: Evident **7.2 f**, corpus fade 8.8 f, rosacea v5 **9.0 f (6–14)**.
   - Fix:
     - Card and row entries on `arrive` **10 f** instead of 14 (that settles in about 7 f).
     - Shorten B08's 27 f form rise to 14 f.
     - Re-time the 13 entries listed in §1 so each lands within 10 f.
     - Keep the drift, but start it *after* the settle.
2. **Moves are ease-out, not in-out.**
   - Measured: position velocity peak **0.07–0.20**, against **41–46 %** in the references (rosacea rises 0.35).
   - Fix: drive every x/y/scale move (card rise, panel slide, phone step-back, morph) with `sweep` (`.6,0,.25,1`, 8 f), and keep `arrive` for opacity only.
   - Also cut travel to the 16 px token (1.5 % H). It now measures rise **7.3 % H** against corpus 2.9 % H, and B08 rises **194 px**.
3. **Graphic entries are not on the word.**
   - Measured: **39 %** within 0…+3 f against **48 %** chance (captions 99 %).
   - Fix:
     - Anchor every secondary entry (staggered rows, beat-start components) with `wordFrames()` to a word, at onset + 1.
     - Re-time the 11 planned events in §3, worst first: B04 +22 f, B06 −14 f, B04 +14 f.
4. **Exits cut at beat lines.**
   - Measured:
     - B12→B13 **23 %**
     - B14→B15 **22 %** of the graphic still up when the beat cuts
     - B17's skull covered by B18's cut-in (56 % of the zone pops in at f1811)
   - Fix:
     - Start each exit at least `end_f − 8` (7 f plus 1), so B14's exit lands by f1448.
     - Fade B12's timeline out before f1241.
     - Cross-dissolve or morph B17 → B18 instead of cutting over a held graphic.
5. **The one-frame jolt in B08.**
   - Measured: **7.7 px in 1 frame at f838**, plus 1.0 px at f800.
   - Fix: interpolate `focusY` between fields on `sweep` over 12 f instead of switching it.
   - Also: give B13's thumbnails a real drift of at least 1 % per 48 f (now 0.11–0.21 grey levels per 12 f), and give B02's product image a longer hold.

**Not gaps:**
- Exits are 5–7 f on the 7 f token wherever a beat ends cleanly.
- Arrows draw and retract within tolerance (ARROW_TYPE_PROOF.md).
- Images stay alive better than in the rosacea render.
- There is no real overshoot.
