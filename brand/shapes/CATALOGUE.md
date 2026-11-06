# Shape catalogue

113 images: 53 board, 60 Instagram (`catalogue.json`, `scripts/shapes.py`). Sizes are % of the frame after scaling the short side to 720 px.

| Class | Images | Board | Instagram | Favourites | Shapes | Score | Vocabulary |
|---|---|---|---|---|---|---|---|
| rule_h | 65 | 24 | 41 | 2 | 152 | 69 | yes |
| grain | 49 | 26 | 23 | 0 | 49 | 49 | yes |
| rule_v | 35 | 21 | 14 | 4 | 88 | 43 | yes |
| rect | 18 | 4 | 14 | 1 | 20 | 20 | yes |
| rounded_rect | 11 | 5 | 6 | 1 | 12 | 13 | yes |
| blob | 10 | 3 | 7 | 1 | 11 | 12 | yes |
| frame | 8 | 3 | 5 | 0 | 8 | 8 | yes |
| pill | 4 | 3 | 1 | 0 | 4 | 4 |  |
| circle | 3 | 3 | 0 | 0 | 3 | 3 |  |
| grid | 1 | 1 | 0 | 1 | 1 | 3 |  |

Rule: score = images showing the class + 2 x favourite images showing it; keep classes on >= 5% of images, 6..10.

## Measured proportions (median, n)

| Measure | Median | n |
|---|---|---|
| rule_stroke_pct_w | 0.139 | 152 |
| rule_h_len_pct | 45.9 | 152 |
| rule_v_len_pct | 34.65 | 88 |
| frame_inset_pct_w | 2.85 | 8 |
| rounded_radius_pct_short | 27.9 | 12 |
| rounded_radius_pct_frame | 4.725 | 12 |
| rounded_aspect | 2.155 | 12 |
| rect_aspect | 5.37 | 20 |
| pill_aspect | 6.815 | 4 |
| circle_d_pct_short | 32.1 | 3 |
| blob_circularity | 0.52 | 11 |
| grid_spacing_pct | 22.7 | 1 |
| grain_hp_std | 2.17 | 113 |

## Vocabulary SVGs (`kit/shapes/`)

- `rule_h.svg` — horizontal hairline; length 45.9% of width, stroke 0.150% of width (catalogue medians)
- `grain.svg` — grain overlay; median high-pass std 2.17 grey levels (alpha scaled from it: judgment call); frequency judgment call
- `rule_v.svg` — vertical hairline; length 34.65% of height, stroke 0.150% of width
- `rect.svg` — sharp rectangle (bar); aspect 5.37
- `rounded_rect.svg` — rounded card; corner radius 27.9% of its short side (measured), aspect 2.155 (measured)
- `blob.svg` — blob; circularity 0.52 matching the median 0.52
- `frame.svg` — inset frame; inset 2.85% of width (measured)

## Limits

- Contours on photographs catch edges of bodies and products; presence counts (images showing a class) are used for the vocabulary rather than raw instance counts for that reason.
- Board images include phone mockups: their screen edges count as rounded rectangles, which is part of how the board presents work.
- The grain threshold (2.5 grey levels of high-pass std in flat areas) and the blob/circle cut-offs are judgment calls, stated in the script header.
