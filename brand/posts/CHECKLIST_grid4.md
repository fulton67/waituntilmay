# Grid 4: compare and checklist (2026-11-17)

- Sheet: `brand/posts/grid4/_compare.jpg` (ours, nine rit.clinic stills, nine Are.na stills).
- Measurements: `still_study_grid4.json`, `gap_grid4.json`.
- Reuse: `reuse_grid4.json`.

## Gap per rule, in numbers

| Rule | Reference target | Before (round 0) | After (round 2) | Status |
|---|---|---|---|---|
| R4 words per tile | 11.5 (Are.na) to 24.5 (Naim's refs); limit about 25 | median 19, max 31 (chin), 26 (AviClear) | median 19, range 12–23 | in |
| R3 type ÷ width | .032–.039 | median .033 | .033 | in |
| R12 luma | about 117–127 | median 175 | median 175 | **out**: the photos are high-key iPhone office shots and grading is banned, so the fix is reshoots (`SHOT_REQUESTS.md`) |
| R12 saturation | .18–.29 | .12 | .16 (.20 after round 1; the sunscreen field went to pure ivory→sand tokens in round 2) | slightly out |
| R12 RMS contrast | about .21 | .20 | .20 | in |
| Warmth b* | +3.9 (rit) to +10.9 (Naim's refs) | 3.6 | 3.6 | in |
| R6 light | upper right | all glass lit top/right | same | in |
| R7 glass values | veil .30, lit-edge band, radius about 11 % of the plate | as built | as built | in |
| R8 edges | a mix | 7 inset / 2 full bleed (probe) | 7 / 2 | in (Are.na runs more full bleed) |
| Reuse (hash distance) | > .107 | nearest .188 (08 vs grid 2 BCC) | .188 | in |

## Pass/fail, judged by opening each rendered tile (3 rounds at most)

The nine checks:
1. Starts from an iCloud original or a designed graphic.
2. No banned element.
3. One idea, within the word limit.
4. Glass built with all its parts.
5. Light direction matches the other tiles.
6. Colours are tokens only.
7. Type sits inside the centre crop.
8. Doesn't match another tile or an earlier post.
9. Would sit unnoticed in the rit.clinic grid.

| Tile | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| 01 CEG + Ferulic | **F**ᵃ | P | P | P | P | P | P | P | P |
| 02 BCC (text) | P (designed) | P | P | – | P | P (sand, navy) | P | P | P |
| 03 EMSCULPT | **F**ᵃ | P | P | P | P | P | P | P | **F**ᵇ |
| 04 Lexington | **F**ᵃ | P | P | P | P | P | P | P | **F**ᵇ |
| 05 Reapply (graphic) | P (designed) | P | P | P | P | P (round 2) | P | P | P |
| 06 Jeuveau | **F**ᶜ | P | P | P | P | P (round 1) | P | P | **F**ᵇ |
| 07 AviClear B/A | **F**ᵃ | P | P (round 1: 26 → 22) | Pᵈ | P | P (round 1) | P | P | P |
| 08 Prevention (text) | P (designed) | P | P | – | – | P | P | P | P |
| 09 Chin B/A | **F**ᵃ | P | P (round 1: 31 → 22) | Pᵈ | P | P | P | P | P |

- Rounds used: 2 of 3.
- Repairs:
  - round 1: words on 07 and 09; the dark backgrounds to ink; the dark glass to ink
  - round 2: the sunscreen gradient to ivory→sand tokens only

**Still failing:**
- **a.** Built from the catalog's 1024 px previews. iCloud still answers "Photo Library has not finished indexing yet" to every
  original download (`pull.py`, tried 2026-11-17). They render about 1.06–1.6× upscaled. Re-render when the originals pull.
- **b.** iPhone snapshots of the office (an outlet and cable behind EMSCULPT, flat overhead light on the flowers). They would not sit
  unnoticed beside rit.clinic's low-key, window-lit photography. Fix: the reshoots in `brand/intake/SHOT_REQUESTS.md`.
- **c.** Row 897 is an Evolus product render on white, not a clinic photo. Replace it with a photo of his own vials (shot request 3).
- **d.** The loupe ring has the rim, highlight and contact shadow but deliberately no backdrop blur: a loupe has to stay sharp.

Topics repeat from earlier grids (CEG, BCC, reapply, Jeuveau), but every design is new: the hash distance is ≥ .188 to all 69
earlier post stills.
