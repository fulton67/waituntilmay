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
