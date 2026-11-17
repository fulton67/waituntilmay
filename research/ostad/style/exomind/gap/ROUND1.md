# Gap round 1 on YouTube v6: before and after (2026-11-17, DECISIONS 14o)

**Render:**
- In place: `Downloads/Ostad - Exomind and total skin health (YouTube v6).mp4`.
- The previous render was copied, not deleted, to `... (YouTube v6 pre-gap).mp4`.

**How it was measured:**
- "Before" is the five gap reports in this folder (each measured on the pre-gap render).
- "After" was re-measured on the new render's pixels with the same tools:
  - `immersion_tools/` (with a fresh `plain: true` render)
  - `tracking_tools/`
  - `tools/layer_motion.py`
  - `tools/lint_compositions.py`
  - `tools/reuse_check.py`
  - `tools/variety_check.py`
  - `tools/arrow_text_lint.py`
  - ffmpeg `scdet` and `ebur128`
- **Stills sheet:** `exomind/v6_stills_sheet.jpg` (gitignored), 25 key frames labelled with their layouts.

## 1. Layout and immersion (`immersion_layout.md`)

| Item | Before | After |
|---|---|---|
| Mean image fill | 14.8 % | **40.2 %** (target ≥ 35 %) |
| Fill while imagery is on | 29.0 % | 58.5 % |
| Imagery on screen | 50.6 % of runtime | 68.6 % |
| Full-frame takeovers (fill ≥ 50 % for ≥ 6 f) | 0.66 /min | **5.32 /min** (target ≥ 3) |
| Seconds at ≥ 50 % fill | 5.5 s | 34.7 s |
| Frame splits | 0 | 4: B09, B11 diptych, B15, B20 |
| Longest run of one layout family | 13 segments, 0–49 s | **3 segments, 13.2 s** (B19–END; `variety_check` R13 passes) |
| Hard picture cuts (scdet 8) | 1.3 /min | **10.0 /min** (15 cuts; Ro 9.2) |
| Section cards | type beside him | full-frame on practice or BTL picture (S1–S4) |
| Imagery moving | 82.2 % | 88.0 % |
| Longest still image run | n/a | B15 1 f, B17 7 f; 20 f in the whole edit, on the B06 phone graphic, not an image |
| Blurred side-fill | 0 | 0 |

He stays keyed left whenever he is on the canvas. He steps out only for the takeovers.

## 2. Empty signifiers and accuracy (`graphics_arrows.md`)

| Item | Before | After |
|---|---|---|
| Beats with an empty or partial signifier | 4 / 20 | 0 / 20 |
| B03 "your skin" | BTL stock face | clinic-library row 741, treated cheek "after" half, lower face (approval list) |
| B09 askers | invented names "Maya / Jordan / Sam" | none: question-box UI only |
| B16 | rosacea trigger chart under "emotions improve our skin" | "The mind–skin link", Emotions → Skin, cited Kabat-Zinn et al. 1998 (⚠ physician-check) |
| B17 | Flora AI skull | BTL MOA film (applicator on the head, region lit), MOA label |
| Coil-on-patient subject | 5 beats | 2 (B11, B12); `variety_check` R14 caps every subject at 2 |
| Flora shots on screen | 2 (glass head, glass skull) | 0 |

## 3. Arrows

| Item | Before | After |
|---|---|---|
| Arrows crossing text | 2 (B02 123 px, B07 114 px) | **0**: `arrow_text_lint` over every frame (B07 re-checked after its reroute) |
| Markup on a real photo | 0 (rosacea had 4) | 2 on B12 IMG_3714: a callout from SESSION to the coil pad, and a ring on the 24:30 timer |
| Head shapes | 3 shapes, 20–34 px | 1 (barb) on every general arrow; marker-tick keeps its triangle |
| B17 ring | half opacity | full brand blue, tracked through the film push |
| Shortest connector | n/a | 188 px (B03), every connector ≥ 120 |

## 4. Motion (`motion_easing.md`)

| Item | Before | After |
|---|---|---|
| `arrive` | 14 f | 10 f (all exo6 and OstadYT6) |
| x/y moves | on `arrive` (velocity peak 0.07–0.20) | on `sweep` path, arrive timing (`io`) |
| Rise travel | 7.3 % H; B08 194 px over 27 f | 16 px; B08 16 px over 14 f |
| B08 focus jolt | 7.7 px in 1 f | eased over 12 f on `sweep` |
| B14 → B15 exit | 22 % still up at the line | exit starts f1440 and is done by f1448 |
| B17 → B18 | 56 % of the zone popped in at f1811 | 8 f dissolve, no pop-in at f1811 |
| B13 thumbnails, median 12 f change | 0.11 / 0.21 | 39.9 / 26.6 / 26.1 (push 14 % over the whole life) |
| Image layers moving for their whole life | 15 / 15 | 24 / 24 (`layer_motion`); `--static-image` passes |

Entries were re-timed onto yt_words onsets in `beats.json`.

Not re-measured: the position velocity-peak fit. `render_entry_stats` was not re-run in this round.

## 5. Tracking, on rendered pixels with MediaPipe IMAGE mode (`tracking.md`)

| Item | Before | After |
|---|---|---|
| B03 tail anchor | headTop + (0, −24) | templeR + (40, −6) |
| B03 tail error, median / p95 / max | 5.1 / 12.8 / 16.1 px | **3.1 / 5.6 / 7.1 px** |
| B16 tail error, median / p95 / max (dashed flow; held frames f1662–1701) | 3.8 / 5.5 px | **2.2 / 7.5 / ≤ 12 px** |
| templeR registration (frames where he is keyed) | median ~3 px | 3.3 / 6.2 / 8.5 px |
| headTop registration | 8.9 / 16.1 px | 8.7 / 15.8 px (no device uses it now) |
| Pip face to circle centre, max | 8.3 px (B12) | **3.9 px** (B04, B11, B12; 1.5 % of the diameter) |
| Pip circle | n/a | Hough r 129.6, true circle |
| Straight source edge inside the pip | visible on every B12 frame | none: the left edge is feathered with a mask ramp (checked on crops at 13.5, 46 and 50.5 s) |

Every tracked tail passes "fail on max > 15 px". f1702 is the B16 retract frame, outside the hold.

## 6. Audio (`audio.md`)

| Item | Before | After |
|---|---|---|
| SFX gain | 0.2 hero / 0.05 rest (24–33 dB under the voice) | 0.32 hero / 0.16 rest |
| Distinct sounds | `card` ≈ `swish` (centroid 1140 / 1096 Hz); arrows had no sound | 7 classes through `sfx_map` (centroids measured with librosa) |

The seven classes:

| Class | Sound | Length | Centroid |
|---|---|---|---|
| draw | `exo_draw` | 0.20 s | 7.2 kHz |
| card | `exo_card` | 0.32 s | 0.4 kHz |
| chapter | `exo_chapter` | 0.75 s | 2.9 kHz |
| reveal | `swish` | n/a | n/a |
| chip | `pop` | n/a | n/a |
| tick | `yes` | n/a | n/a |

| Item | Before | After |
|---|---|---|
| Entry coverage (SFX within ±2 f of an entry) | 62.6 % | **80.8 %** (80 / 99, target ~72 %). Section cards, the end card, B07 slot landing, B08 ticks and B20 flow now have SFX |
| Loudness | −14.1 LUFS, −4.4 dBTP | −14.1 LUFS, **−3.8 dBTP** (≤ −1) |

## 7. Checks

| Check | Result |
|---|---|
| `variety_check` | PASS on R1–R14; the selftest breaks every rule |
| `lint_compositions` | 32 files, 0 violations |
| `--static-image` | PASS |
| `arrow_text_lint` | PASS |
| Flash scan (scdet 8) | 15 cuts, all intended. The 77.08 / 77.17 s pair is the cut back to him, then the B19 window arriving (checked frame by frame) |
| Text audit, 16:9 | B19 panel restored to 1×; MOA label on the window at 23 px; B08 caveat raised to 24 px |
| `reuse_check` | **FAIL on B12 only:** 0.023 against v3 at 12 s. It is the raw full-frame session footage (the only session clip; v3 used the same frames). The new graphic layer on it (photo card, markup, timeline) is not in the bank. Logged as accepted in DECISIONS 14o; Naim to confirm |

## 8. Still open

- **B12 reuse match.** This is footage, not a graphic. Another session clip would clear it.
- **B11 diptych.** `office_team` and `office_treat` are two moments of the same session and read alike.
- **S4 / B17 crop.** The MOA film's own EXOMIND mark sits at the top edge in some frames.
- **Velocity-peak re-fit** (render_entry_stats) was not run.

**Client approvals** (BEATS.md §3): clinic rows 741 / 3601 / 3612 / 3614, session and IMG_3714 (P0006), p0001_quiet and the Nov 5 consult (P0001), BTL Applicator_0108 and the MOA film, and the Kabat-Zinn citation (⚠).
