# Gap round 2 on YouTube v6: before and after (2026-11-17, DECISIONS 14p)

The last gap round. The orchestrator's notes on `exomind/v6_stills_sheet.jpg` after round 1, each checked on the render's pixels before it was fixed.

**Render:**
- In place: `Downloads/Ostad - Exomind and total skin health (YouTube v6).mp4` (2166 f, 90.261 s).
- The round-1 render was copied, not deleted, to `... (YouTube v6 round1).mp4`.

**How it was measured:**
- "Before" is the round-1 render; "after" is the new one, with the same tools.
- Numbers: `gap/round2.json`.
- Stills: `gap/round2_stills.jpg` (gitignored): every beat key frame, the four section-card hold midpoints, the B18 dissolve and the B14 arm frame. Labels sit at the bottom so they hide no top edge.

## 1. Section titles "Your questi", "Before y", "Total skin hea"

**Diagnosis.** It was not a clip or an overflow: the DOM text box is whole (TextAudit) and nothing crops it. The sheet caught the typewriter mid-line, 10 f into a 30 f card. The real fault was the hold: the whole title was legible for only 10 f (0.42 s), against RULES `duration.hold-min` 2500 ms.

**Fix.** `SECTION_TIMING` is now type-in 12 f, hold 60 f, letters out 8 f, for 80 f in all (`SECTION_LEN`).
- **S1.** Holds over the consult; the pip still drops in at f30, under the title.
- **S2.** Holds across the cut to the B09 split. It is set at 120 px so it fits the consult half, which is the only half darkened after the cut.
- **S3.** Runs to f1321. The ring now arrives on the cut back to him (f1322, "approach"). Its labels hold 60 f, so its exit runs over B14's first 16 f, and B14's decode starts at local 18.
- **S4.** Set at 130 px; the orbit ring lands on "create" beside it.

| Item | Before | After |
|---|---|---|
| Frames each title is fully lit (pixel run on the render, S1–S4) | 10 / 10 / 10 / 10 (0.42 s) | **60 / 60 / 60 / 60 (2.5 s)** |
| Still at the hold midpoint (start + 42 f) | n/a | whole title on every card (f305, f935, f1284, f1752) |
| B13 ring track at its exit | faded only to 0.4, then cut at the beat line | fades to 0 inside its (extended) Sequence |

## 2. Straight source-frame edge on his keyed arm (B14 and every keyed beat)

**Diagnosis.** His phone frame's right side lands at screen x 726. When he gestures, the arm crosses it and is cut in a straight vertical line. The left edge (x −30) and the bottom edge (y 1194) are off screen.

New tool `tools/edge_check.py`: a column-edge detector on the effective alpha (matte × feather ramp) over every frame where he is keyed. Cross-checked on the render's pixels: a grey step ≥ 24 across x 725 | 727, as a vertical run.

**Fix.** The keyed plate's right 140 source px (13 %, 98 screen px) fade out on a linear alpha ramp (`RIGHT_FEATHER` in OstadYT6). The rightmost opaque column has a median of 768 of 1080, so the ramp touches only gestures (the rightmost column passes 960 in 12.6 % of frames).

| Item | Before | After |
|---|---|---|
| Keyed frames with a straight edge ≥ 12 px (alpha) | **61** (B02 13, B03 9, B05 8, B10 9, B14 15, B19 7) | **0** |
| Longest straight run (alpha) | 305.9 px (B14) | 0 |
| Steepest one-column alpha drop at the right side | 0.906 | 0.233 (his own silhouette) |
| Render pixels, the same 61 frames: frames with a run ≥ 12 px | 50 | 0 |
| Render pixels, longest run | 239 px | 9 px |
| Pip left edge | feathered (round 1) | unchanged |

## 3. B11 diptych: two near-identical moments

**Before.** `office_team` | `office_treat`: two moments of one session, each showing him, the console and a patient under the coil.

**After.** Two subjects of "trusting our team with your care":
- **Left: the care.** `office_team`, Dr. Ostad and staff with the patient.
- **Right: the team itself.** clinic-library row 222 (IMG_8356, 2025-11-11): Dr. Ostad and a staff member at the practice's silver painting.
  - The 768 × 1024 preview runs at 1.25×; the original is to be re-pulled when iCloud recovers.
  - It is revealed in place by a mask on `sweep`, so the picture never re-fits while the mask grows. It pushes 1.00 → 1.07.

`variety_check` R14 still passes: 15 subjects, none on more than 2 beats. `team_portrait_222` is new.

## 4. S4 / B17: the MOA film's marks

**Diagnosis on the render.** At 1.16× from the top-left, the film's EXOMIND mark sat whole in the corner. The sheet's yellow label covered its top, which is why the sheet showed it "clipped".

Measuring found three real problems:
- The BTL emblem was cut by the right frame edge (a "‹" sliver at x ≈ 1905, f1712–1810).
- In the 8 f B17 → B18 dissolve, the scaled mark ghosted over B18's 1× mark.
- In B19's window, the emblem was cut by the window's right edge, with a sliver of the mark at its left.

**Fix.** Both marks are fully out, and B18 brings them back whole at 1×:
- **B17.** Crops the film's top band (mark and emblem, film y ≤ 160) above the frame and its subtitle band (film y ≥ 930) below it: k 1.40 → 1.46, y = −160k, x −200 → −240 (`moaFrame`). The orbit ring and the "Neuroplasticity" chip follow the lit region through the new transform.
- **B19.** Runs the synapse film at 1.2× with the same bands outside the window.
- **B12.** The same check found the console's BTL emblem cut by the frame's right edge after the new crop. The push origin moved to 60 % 30 %, so the emblem sits behind the IMG_3714 card.

| Item | Before | After |
|---|---|---|
| Frames with a film mark cut by a frame or window edge (S4–B19, stills every beat + f1712, f1809, f1815) | B17 emblem every frame, B19 emblem every frame, B18 double mark in the dissolve | 0 |

## 5. B12 reuse against v3

| Item | Before | After |
|---|---|---|
| `reuse_check` B12 | **FAIL** 0.023 vs YouTube v3 at 12 s (the same session clip full frame) | **ok 0.289** (nearest: v5 at 73.25 s) |
| Treatment | the clip full frame at 1.00 → 1.06 | a 1.30 → 1.36 crop on the coil and her face; the IMG_3714 card is the wide |

The logged exception from round 1 is closed; nothing is left for Naim on reuse.

**B14 also failed at first in round 2,** at 0.070 against v5's empty canvas at 38.5 s. Its key-frame crop [760, 60, 1120, 840] was about 80 % empty cream. With the arm's hard edge feathered away, little was left to tell it apart. The crop is now the graphic's own box [700, 330, 1160, 260] (title and horizon line): 0.242.

## 6. Every check, re-run on the new render

| Check | Round 1 | Round 2 |
|---|---|---|
| `variety_check` | PASS R1–R14 | **PASS R1–R14** (29 distinct devices; longest layout run 3 segments, 13.2 s) |
| `reuse_check` | FAIL B12 (accepted exception) | **PASS**, nearest 0.148 (B04, B09) against 0.107 |
| `lint_compositions` (committed dot-and-line rules) | 32 files, 0 | **31 files, 0** (OstadYT6 + exo6) |
| `--static-image` | PASS | **PASS** |
| `arrow_text_lint` | 0 crossings | **0 crossings** over 4332 audited frames |
| `edge_check` | n/a | **0 frames** |
| Flash scan (scdet 8) | 15 cuts, all intended | 15 cuts, all intended. The S3 cut moved f1272 → f1322 with the longer card; the 1850 / 1852 pair is the cut back to him, then the B19 window arriving |
| Loudness | −14.1 LUFS, −3.8 dBTP | **−14.1 LUFS, −3.8 dBTP** |
| B03 tracked tail, held (MediaPipe IMAGE on the render) | 3.1 / 5.6 / 7.1 px | **3.0 / 5.6 / 7.5 px** |
| B16 tracked tail, held f1662–1701 | 2.2 / 7.5 / ≤ 12 px | **2.2 / 4.9 / 9.7 px** (f1702 is the retract) |
| Pip centring, B12 | max 3.9 px (1.5 %) | median 2.1, max **4.8 px (1.9 % of the diameter**, spec < 4 %); r 129 |
| Face overlay while he is keyed on the canvas | 0 | **0**. Every overlap hit is in a takeover where he is not on the canvas (B04, B09, B11): the detector sees him in the clinic footage |
| Mean image fill | 40.2 % | **42.5 %** |
| Fill while imagery is on | 58.5 % | 60.2 % |
| Imagery on screen | 68.6 % | 70.5 % |
| Takeovers (fill ≥ 50 % for ≥ 6 f) | 5.32 /min | **4.65 /min** (target ≥ 3). S3's longer card joins B12 into one run, which counts as one takeover |
| Seconds at ≥ 50 % fill | 34.7 s | 36.1 s |
| SFX entry coverage (events within ±2 f of a sound, from beats.json) | 79/101 = 78.2 % | 78/100 = 78.0 % |
| Smallest text | 22.8 px (MOA label) | 22.8 px (MOA label) |

**Two notes on the tools.**
- `gap_track.py` takes the largest blue component as B16's tail. Here that is the arrowhead at x 1001, so the B16 row was re-measured with the leftmost component in x < 960.
- `track_verify.py` and `pip_verify.py` (14l) assume the pre-gap layout (B03 on headTop, the presenter on in takeovers), so their round-2 output was not kept. The round-1 gap tools were used instead.

## 7. Still open (for Naim)

- **Re-pull the full-size originals when iCloud recovers:** row 222 (B11, at 1.25×), row 1705 (B15, at 1.4×) and IMG_3714 (B12).
- **A lint conflict from another session.** Uncommitted rules in `tools/lint_compositions.py` (PAL / BOX1, from the Oct 14 reel's lesson L5 "blue throws off the glass cohesion") flag v6's brand-blue arrows and chips: 109 hits in 31 files. v6 was built and approved under the brand-blue arrow rule (14k, 14m). Naim decides whether L5 applies to YouTube edits.
- **Velocity-peak re-fit** (`render_entry_stats`): not re-run, as in round 1.
- **The ⚠ claims and the client-approval list:** `exomind/TODO.md`.
