# Type system

Chosen from Adobe Fonts visual search on all 542 crops (542 searched; `matches.json`), scored by `scripts/fonts_system.py`.
Every number below cites a row of `metrics/pixels.json`, `fonts/specimen/calib/`, or is marked **judgment call**. Nothing here is by eye.

## Roles

| Role | Adobe style | Web (kit `vzz0hgt`) | Line height | Letter-spacing | Block width | Source |
|---|---|---|---|---|---|---|
| headline | Neue Haas Grotesk Display Pro 65 Medium | `neue-haas-grotesk-display` 600 | 1.033 | +0.0082 em | 45.7% of width | pixels.json regions role=headline median cap_pct_h; pixels.json regions role=headline median leading_em (1.006) x cap_em 0.7188 / 0.7; calib/tracking.json nhg-display-600 headline (target pixels.json regions role=headline median tracking_pct_em); pixels.json regions role=headline source=instagram median block_w_pct |
| caption | Neue Haas Grotesk Display Pro 55 Roman | `neue-haas-grotesk-display` 500 | 1.271 | -0.0158 em | 35.7% of width | pixels.json regions role=caption median cap_pct_h; pixels.json regions role=caption median leading_em (1.238) x cap_em 0.7188 / 0.7; calib/tracking.json nhg-display-500 caption (target pixels.json regions role=caption median tracking_pct_em); pixels.json regions role=caption source=instagram median block_w_pct |
| label | Neue Haas Grotesk Display Pro 55 Roman | `neue-haas-grotesk-display` 500 caps | 1.078 | +0.0102 em | 20.7% of width | pixels.json regions role=label median cap_pct_h; pixels.json regions role=label median leading_em (1.05) x cap_em 0.7188 / 0.7; calib/tracking.json nhg-display-500 label (target pixels.json regions role=label median tracking_pct_em); pixels.json regions role=label source=instagram median block_w_pct |

Display and text are the same family. Neue Haas Grotesk won both roles outright, so there is no second family. No mono: the best mono family (Roboto Mono, score 2.75) is under the 10% bar.

## Sizes on the three canvases

| Canvas | Headline | Caption | Label | Basis |
|---|---|---|---|---|
| 1080×1350 | 82.1 / 84.8 px | 37.6 / 47.7 px | 35.6 / 38.4 px | cap % of canvas height (pixels.json) |
| 1080×1080 | 65.7 / 67.8 px | 30.1 / 38.2 px | 28.5 / 30.7 px | cap % of canvas height (pixels.json) |
| 1080×1920 | 82.1 / 84.8 px | 37.6 / 47.7 px | 35.6 / 38.4 px | judgment call: 4:5 sizes reused, a story is read at the same width |

Size / leading. Font size = measured cap height (% of canvas height) / the font's cap-height (0.7188 em for NHG Display, measured in the browser).

## Layout

- Margin: 5.4% of width (pixels.json images source=instagram median text_margin_left_pct).
- Headline top: 13.8% of height (pixels.json images source=board median text_margin_top_pct).
- Alignment: left (PIXELS.md stack alignment: board left 53 / centre 10 / right 8; instagram left 42 / centre 21 / right 13).

## Web

| Use | Family | Weight | Size | Source |
|---|---|---|---|---|
| h1 | `neue-haas-grotesk-display` | 600 | 39 px | headline/caption cap ratio from pixels.json applied to the 17px body, cap-height matched across Text and Display |
| h2 | `neue-haas-grotesk-display` | 600 | 30 px | judgment call: between h1 and body |
| body | `neue-haas-grotesk-text` | 400 | 17 px | judgment call: 17px web body in NHG Text (optical size for small text); line-height 1.5 for long reading |
| label | `neue-haas-grotesk-display` | 500 | 13 px caps | judgment call size; tracking from calib/tracking.json label |

Fallbacks (web page and scripts only, named as fallbacks): `"neue-haas-grotesk-display", "Inter Tight", Arial, sans-serif` and `"neue-haas-grotesk-text", Inter, Arial, sans-serif`.

## Why this system

| Display rank | Family | Class | Score | Board | Favourite | Instagram |
|---|---|---|---|---|---|---|
| | Neue Haas Grotesk Display | sans | 21.83 | 21.83 | 0.0 | 0.0 |
| | Poppins | sans | 13.03 | 13.03 | 0.0 | 0.0 |
| | Helvetica Neue LT Pro | not tagged on its Adobe page | 11.2 | 11.2 | 0.0 | 0.0 |
| | Cormorant Garamond | serif | 9.11 | 0.0 | 0.0 | 18.22 |
| | Cormorant | serif | 6.87 | 0.0 | 0.0 | 13.75 |
| | Helvetica LT Pro | sans | 6.83 | 6.83 | 0.0 | 0.0 |
| | IvyPresto Display | serif | 6.58 | 0.0 | 0.0 | 13.17 |
| | Times New Roman | not tagged on its Adobe page | 6.0 | 1.0 | 0.0 | 10.0 |

| Text rank | Family | Class | Score | Board | Favourite | Instagram |
|---|---|---|---|---|---|---|
| | Neue Haas Grotesk Display | sans | 129.21 | 126.58 | 1.5 | 2.25 |
| | Helvetica Neue LT Pro | not tagged on its Adobe page | 37.77 | 34.92 | 0.33 | 5.03 |
| | DM Sans | sans | 28.94 | 4.97 | 0.0 | 47.95 |
| | Neue Haas Unica | sans | 28.25 | 27.58 | 0.2 | 0.93 |
| | Helvetica LT Pro | sans | 26.5 | 25.0 | 0.25 | 2.5 |
| | Halyard Display | sans | 18.33 | 16.33 | 2.0 | 0.0 |
| | Degular Display | sans | 13.7 | 13.7 | 0.0 | 0.0 |
| | Inter 28pt | sans | 13.12 | 11.85 | 0.67 | 1.2 |

Rule: Per Adobe family and per role (headline vs caption/label), using each crop's Adobe top 5 with rank weights 1..1/5:
    score = board + favourite + 0.5 x instagram
'board' already counts a favourite's crops x3 (fonts_matches.py), and 'favourite' adds the favourite crops once more,
so the 4 favourites weigh most; instagram is the consistency check, at half weight.
Logotype crops (the EQL wordmark, block 7529470) are left out: Adobe can only return look-alikes for a custom wordmark.
Display = best headline score; text = best caption/label score. A mono is kept only if a mono family reaches 10% of the
text winner's score. Losing systems (one plate each): the best display family of every other Adobe classification, and the next display family
of the winner's own classification that is not the winner, each paired with the text winner.
Adobe classification (cl:ss sans, cl:se serif, cl:sl slab, cl:ms mono) comes from each family page's own filter tags,
fetched in the signed-in tab (raw.jsonl rows __family_filters__*). -> fonts/system.json

Consistency with Instagram is the weak point, stated plainly: the account's own headlines match high-contrast serifs (Cormorant Garamond, IvyPresto) and its body text matches DM Sans; NHG scores 2.25 on Instagram crops. The system follows the board (and the Seed favourite), not the current feed. The serif route is kept as a losing plate.

## Losing systems

- **Poppins** (sans, display score 13.03) + NHG text: `fonts/specimen/losing_poppins_1080x1350.png` — https://fonts.adobe.com/fonts/poppins
- **Cormorant Garamond** (serif, display score 9.11) + NHG text: `fonts/specimen/losing_cormorant-garamond_1080x1350.png` — https://fonts.adobe.com/fonts/cormorant-garamond

## Adobe Fonts URLs

- Neue Haas Grotesk: https://fonts.adobe.com/fonts/neue-haas-grotesk (whole family active: 22 styles)
- Poppins: https://fonts.adobe.com/fonts/poppins (family added for the losing plate)
- Cormorant Garamond: https://fonts.adobe.com/fonts/cormorant-garamond (family added for the losing plate)

## Activation list

- Kit `vzz0hgt` (web, domains localhost / 127.0.0.1 / waituntilmay.com): NHG Display 55 Roman, 56 Italic, 65 Medium, 75 Bold; NHG Text 55 Roman, 65 Medium; Poppins Regular, Medium; Cormorant Garamond Regular, Medium.
- Families added in full (Add family): Neue Haas Grotesk (already active), Poppins, Cormorant Garamond.
- Add font on each crop's #1: 211 crops added a font, 331 were already active; 174 distinct families across the 542 crops.
- Logotype rule (EQL wordmark, block 7529470): #2 added as well: Nexa Text Regular, Nimbus Sans Extd Regular.

## Specimen

`fonts/specimen/` — 12 plates (3 canvases × 3 board favourites + paper) and 2 losing plates, rendered in Playwright with kit fonts; `renders.json` records that every kit font loaded (no fallbacks).
