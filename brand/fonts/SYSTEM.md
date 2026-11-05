# Type system

Inputs:
- `crops.json`: 122 OCR crops from 39 board images (`scripts/fonts_ocr.py`, EasyOCR, x-height ≥ 24 px).
- `matches.json`: one identification per crop (`scripts/fonts_match.py`).
- `clusters.json`: the weighted tally. Favourites count double.

Plate: `../fig/type_specimen.png`.

## What the board uses

| Family | Weighted crops | Board images |
|---|---|---|
| Grotesk: neo, heavy, condensed, thin geometric | **100** | 29 |
| Serif: contemporary, garalde, didone display | 26 | 11 |
| Mono | 8 | 2 (both favourites carry it: SIJO labels, EQL micro-caps) |

The neo-grotesk alone scores 77: Neue Haas / Helvetica, Söhne / Inter and Neue Montreal shapes. The serifs are warm, contemporary and lightly contrasted (Tiempos, Canela, Freight shapes), used for a sentence that speaks to you. The mono labels data.

## The system: three families

The board wants a grotesk. His grid has to keep a serif voice (`EXISTING.md`, "What must not change"). So the serif speaks and the grotesk organises.

| Role | Adobe Fonts face | Free fallback (in `files/`, OFL) | Used for |
|---|---|---|---|
| **Display / structure** | Neue Haas Grotesk Display Pro (25 Thin, 45 Light, 65 Medium, 75 Bold), with Neue Haas Grotesk Text Pro for small sizes | Inter Tight (variable 100–900, plus italic) | procedure headlines, oversized cropped letterforms, numerals, the "ARIEL OSTAD MD" signature, buttons |
| **Text / voice** | FreightBig Pro (Light, Book) for headlines of 40 px and up; FreightText Pro (Book, Book Italic, Medium) for body | Newsreader (variable, opsz 6–72, wght 200–800, plus italic) | the headline sentence, quotes and testimonials, captions on cards, long body |
| **Mono / data** | IBM Plex Mono (Light, Regular, Medium) | IBM Plex Mono (the same family; OFL) | labels, treatment data rows, dates, page counters, `//` separators |

The calligraphic script is retired. The serif italic does that job ("a *technique*").

## Sizes on the 1080 × 1350 post canvas

| Style | Face | Size / leading | Tracking | Case |
|---|---|---|---|---|
| Mega letterform | grotesk 25 Thin–45 Light | 360–480 / 0.8 | −4% | one or two letters, cropped by the frame, 10–15% tint |
| Display serif | FreightBig Light | 96–112 / 1.0 | −1% | sentence; italic for the turn word |
| Grotesk headline | NHG Display 65 | 52–60 / 1.05 | −1% | sentence |
| Serif subhead | FreightBig Book | 44 / 1.1 | 0 | sentence |
| Body | FreightText Book | 30–32 / 1.35 | 0 | sentence, ≤ 48 characters per line |
| Label | NHG Display 65 | 22–24 / 1.2 | +10–12% | caps |
| Data row | Plex Mono Regular | 20–22 / 1.3 | +6% | caps, `//` between fields |
| Micro | Plex Mono Regular | 15–16 / 1.25 | +8–10% | caps (folios, sources, "VERIFIED PATIENT") |

On the web (`/brand/ostad`) the same ratios scale from a 17 px base:
- body: FreightText / Newsreader, 17–19 px, leading 1.55;
- labels: Plex Mono, 12–13 px;
- h1: clamp(48 px, 7vw, 112 px), leading 1.0.

## Weights

The grotesk uses 25, 45, 65 and 75 and nothing else. 65 is the working weight; 75 is only for heavy event posters. FreightText uses Book, Medium and Book Italic. Plex Mono uses Regular and Medium. A post uses at most four styles.

## Licensing

- **Adobe Fonts** (Neue Haas Grotesk, Freight, IBM Plex Mono): included with a Creative Cloud plan. They are licensed for commercial print, video and social use, and for the web through an Adobe Fonts web project (kit). The files cannot be redistributed or committed, so they are not in this repo. Activate them through Creative Cloud.
- **Fallbacks** (Inter Tight, Newsreader, IBM Plex Mono): SIL Open Font License 1.1. They are free for any use, including embedding and redistribution, and the licence text sits next to each file in `files/`. These are what `post.py` and the web page render with when the Adobe faces aren't available.

## Method and its limits

- The Adobe MCP font tools take names or text, not images. They were used only to confirm that each pick is in the Adobe Fonts catalog (`font_search`). Their availability check (`find_fonts`) was refused for this account type.
- WhatTheFont and Adobe's visual search are browser tools. They were not used: the crops are many, and the board faces are mostly well-known shapes.
- Identification is by eye, so the confidence scores in `matches.json` run 0.3–0.65. The system is chosen at the class level (neo-grotesk, contemporary serif, mono), which is far surer than any single face name.
- The EQL wordmark is a custom thin geometric. The grotesk's 25 Thin stands in for that gesture; the mark itself is not copied.
