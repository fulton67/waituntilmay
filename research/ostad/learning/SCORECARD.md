# Scorecard

One row per piece that ships or is proposed. Reels and posts are scored the same way: the measured checks that ran on the
render, then the client's response once it is shown. A row joins `GOLDEN/` only after the client approves it.

## Posts (feed tiles, POST_GRID)

Checks: `brand/scripts/grid_check.cjs` -> `brand/kit/templates/grid/grid_check.json` (export at 4:5 and 1:1, centre-crop
positions, before/after gate, rhythm, page, token + contrast lint).

| Date | Piece | Templates | Export | Crop | Gate | Rhythm | Lint | Client | Notes |
|---|---|---|---|---|---|---|---|---|---|
| 2026-11-17 | ~~Demo grid~~ REJECTED | product ×2, notice ×2, before-after ×2, graphic, diagram, ruled | 36/36 renders, Adobe fonts | 18/18 inside 1080² | 403 / 403 / 200 | pass (0 warnings) | 9/9 | **rejected**: tinted blue, off the bible, inaccurate; never use | before/after tiles are gallery placeholders, locked; notices and clock hours need confirming |

## Reels

| Date | Piece | Checks | Client | Notes |
|---|---|---|---|---|
| 2026-11-17 | Oct 14 injection reel, devices stage (`style/oct14/LAB.md`) | lab: pip reveal +0/+1 f, 0 px overshoot, point never covered; before/after push lands on word +1; static min 0.80; 0 flashes; lint PASS | not shown | footage pending (tmp\oct14); NOT FOR POSTING until patient consent = yes |
| 2026-11-17 | Oct 14 injections, by area (`style/oct14/BEATS.md`), 93.9 s | variety PASS; lint PASS; static PASS; dup lines 0 (max sim 0.27); area line->injection <= 1 beat; captions median 0 f; reveals median +1 f; -14.2 LUFS; 0 flashes; name words 0 | not shown | before = 4:42 PM clip (intro angle 45 deg off); one arrow (cheek): NOT FOR POSTING until patient consent = yes |

## FAST LANE step timings (`tools/make-reel`, research/ostad/PLAYBOOK.md)

| Date | Reel | Preset | Length | 1 transcribe+track | 2 argument map | 3 fill | 4 checks | 5 studio | Total | Flagged |
|---|---|---|---|---|---|---|---|---|---|---|
| 2026-11-25 | sculptra-product-talk-t3 (test, clip sep17 sculptra, 179 s source) | product-talk | 75.1 s | 114.6 s | 26.4 s | 0.0 s | 192.7 s (dead frames 153 s) | 18.0 s | **351.7 s (5.9 min)** | cuts_on_sentence_end (no 80 ms gap after sentence 7), comprehension (role labels; clinical wording for Dr. Ostad) |
