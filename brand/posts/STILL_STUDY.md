# Still study: what the reference posts look like as stills (2026-11-17)

Measured by `research/ostad/style/tools/still_study.py` (M21 plus the layer, light, material and edge probes). Raw numbers:
`brand/posts/still_study.json` (96 reference stills) and `still_study_grid4.json` (ours).

All values below are given as 25th percentile / median / 75th percentile, written p25 / p50 / p75.

## Sources pulled

| Set | Stills | How |
|---|---|---|
| rit.clinic (`@rit.clinic_official`) | 20 slides from 6 posts | Apify `instagram-scraper` + `instagram-post-scraper`, $0.0054 in total. The account's monthly Apify credit ran out after this, so it is **not the whole account** |
| `DdjBJOUE436` (onflowsocials, "how I'd post if I was your social media manager") | 4 | Apify |
| Are.na `dr-ostad` | 66 images (82 blocks; no `board_marks.json` exists, so there are no stars) | `arena_pull.py` |
| Naim's grid refs, `brand/refs/grid/` | 6 | on disk |

## 1. Raw values (inventory)

| Probe | rit.clinic | Are.na | Naim's refs | onflow |
|---|---|---|---|---|
| Photo share of tile (p25 / p50 / p75) | .24 / .33 / .39 | .21 / .42 / .55 | .32 / .58 / .73 | .12 / .20 / .34 |
| Empty (flat) share | .61 / .67 / .73 | .32 / .52 / .65 | .17 / .39 / .63 | .62 / .71 / .76 |
| Words per tile (OCR) | 0 / 0.5 / 1.3 ¹ | 5 / 11.5 / 19.5 | 15.8 / 24.5 / 34.8 | 5 / 6.5 / 8.8 |
| Type height ÷ tile width (median block) | .066 / .081 / .110 ¹ | .029 / .039 / .072 | .024 / .032 / .038 | .050 / .063 / .081 |
| Body line height ÷ width (rit text panel, row profile) | .029–.030 on all 10 body slides | | | |
| Key-light direction (deg; 0 = right, −90 = up) | −105 / **−38** / 110 | −113 / **−60** / 51 | −148 / −9 / 89 | |
| Key ratio (p95 ÷ p5 luma) | 5.8 / 10.5 / 49 | 2.9 / 8.2 / 44 | 3.7 / 10.0 / 13.1 | 3.9 / 4.9 / 6.3 |
| Warmth (Lab b*) | 2.9 / 3.9 / 6.5 | 0.6 / 6.3 / 12.5 | 3.7 / 10.9 / 17.0 | 3.6 / 8.0 / 12.1 |
| Luma (0–255) | 80 / 126 / 152 | 94 / 127 / 180 | 105 / 117 / 137 | 147 / 183 / 223 |
| RMS contrast | .22 / .23 / .26 | .17 / .21 / .27 | .14 / .19 / .29 | .17 / .21 / .24 |
| Saturation | .13 / .18 / .24 | .06 / .22 / .36 | .12 / .29 / .36 | .05 / .17 / .30 |
| Edge treatment | inset 16, split-bottom 3, full-bleed 1 | inset 31, full-bleed 20, split 15 | full-bleed 3, inset 3 | inset 3, split 1 |
| Panel split | body slides: photo 63 % over a grey paper panel 37 % (RGB ≈ 210, 210, 210); covers are full bleed | | | |
| Frosted cards (inside ÷ outside sharpness < .35) | 0 | 11 of 78 cards | 1 of 14 | 0 |
| Glass (Naim's ref 2, profiled by hand) | | | white veil α ≈ .30 (background luma 66 → 122); inner highlight band +28 levels, about 20 px wide (1.2 % of width), on the lit edge; corner radius about 11 % of card width; photo windows inside at about 6.5 % radius; padding about 6.7 % | |
| Are.na frosted-card highlight edge | | top 4, left 4, right 2, bottom 1 | | |

¹ EasyOCR is English-only and reads none of rit.clinic's Korean, so its rit word count and type size are too low. By eye, rit
covers carry 6–12 words and body slides 40–60 words in the panel.

## 2. Merged and named by role

| Role | Value |
|---|---|
| **Photo field** | One photo per tile, either full bleed or inset in a paper margin. Split photo/paper 63/37 is the rit body-slide form. |
| **Paper** | A flat field, neutral to warm: rit's is grey paper (≈ #d2d1d1); Naim's refs and Are.na use ivory or cream. Ours is his ivory `#f5f2eb`, paper `#ece8e0` and sand `#d6c3a0`. |
| **Body type** | 3.0 % of width line height (rit), 3.2–3.9 % (Naim's refs, Are.na) → 32 px at 1080. |
| **Head type** | 6.6–8.1 % of width (rit covers) → ≤ 68 px. A single display number can go far larger (Are.na "7", "INT"). |
| **Words** | 11.5 (Are.na median) to 24.5 (Naim's refs median). |
| **Key light** | Upper right: rit −38°, Are.na −60°. |
| **Tone** | Luma about 120–127, warmth b* +4 to +11, saturation .18–.29, RMS contrast about .21. |
| **Glass** | Veil α .30, lit-edge highlight +28 levels / 1.2 % of width, radius 11 % of the plate, used over a defocused or flat backdrop. |

## 3. Where the references contradict each other

| Topic | Contradiction | What we follow, and why |
|---|---|---|
| Words | rit covers 6–12, Are.na 11.5, Naim's refs 24.5 | **About 25.** Naim's round-2 note was "not enough information", and his refs are the densest set. |
| Edge | rit is mostly inset or split; Are.na is 31 inset to 20 full bleed; Naim's refs are 50/50 | **A mix**, with no two neighbours alike (the grid-rhythm rule). |
| Warmth | rit +3.9; Naim's refs +10.9 | **Photos are never graded**, so warmth comes from the paper tokens (ivory and sand), not from a filter. |
| Light | Naim's refs median −9° (side); rit and Are.na upper right | **Upper right.** Two of three sets agree, and they are the larger sets. |
| Glass | rit uses none; Are.na and Naim's refs use frosted cards | **Glass only with a reason** (a label plate, a panel over a product, a loupe). That is the overlap: rit's restraint plus Are.na's material. |
| Luma | onflow is bright (183); everything else is about 120 | **The ~120 group.** The onflow post is a social-media-manager pitch, not a clinic feed. |

## 4. Observed vs inferred

- **Observed (measured):** every number in sections 1–2.
- **Inferred:** listed at the end of `POST_RULES.md`.

## 5. What repeats across the feed and what changes

| | rit.clinic | Are.na |
|---|---|---|
| **Repeats** | the same carousel grammar: a full-bleed cover with 2–4 lines lower left; body slides of photo plus a grey paper panel; one white caption line on the photo bottom left; the logo top left | one photo plus small type; spec rows; frosted cards over defocused nature |
| **Changes** | the subject (device, hands, product, skin, interior) and the light | the medium (screens, posters, packaging) |
| **Overlap (the target)** | real close photography of skin, hands and product; warm-neutral, low-key, soft single-direction light; small type; little text on the photo itself | |
| **Only here** | the strict 63/37 carousel template, Korean body copy, and darker low-key interiors | glass ingredient cards, hairline callouts on skin, spec-sheet rows, big single numbers |
