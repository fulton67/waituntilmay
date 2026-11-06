# Post grid

Derived from `metrics/pixels.json` (`scripts/composition.py`). Every number cites its row or is a judgment call.

- **Margin:** 9.1% of width (pixels.json images source=instagram median text_margin_left_pct (n=38, zeros excluded)). 27 of 59 posts run text to the edge; that is full-bleed type or UI, not the margin habit.
- **Columns:** 2 starts at 13.6%, 53.1% of width (k-means on pixels.json regions source=instagram left_pct > 1 (n=225), k=2 by silhouette over 2..6).
- **Subject:** middle-centre in 28/39 board images and 38/59 posts (pixels.json images subject_thirds_cell).
- **Text area:** 7.88% of the board frame, 10.38% of a post (pixels.json images median text_area_pct).
- **Measure:** headline 45.7% wide, caption 35.7% (fonts/specimen/spec.json roles (pixels.json instagram medians)).
- **Type scale (1080×1350):** headline 82.1 px, caption 37.6 px, label 35.6 px; ratio 2.184.

| Canvas | Margin x | Safe top | Safe bottom | Column x (px) |
|---|---|---|---|---|
| 4:5 1080×1350 | 98 | 98 | 98 | 147, 573 |
| 1:1 1080×1080 | 98 | 98 | 98 | 147, 573 |
| 9:16 1080×1920 | 98 | 250 | 340 | 147, 573 |

9:16 top/bottom bands: judgment call: 250 px top / 340 px bottom kept clear of Instagram story chrome.

Plates: `fig/composition_columns.png`, `fig/composition_subject.png`, `fig/composition_safe_areas.png`.
