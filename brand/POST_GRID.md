# POST GRID: feed tiles, grid planner, photo intake (2026-11-17)

Brief: post templates that work as a feed, built on the existing kit (tokens, type, icons, server renderer). Nine square-cropped
tiles that read as one system: a meta corner "(…)", a label corner, one large headline on text tiles, and photo, text, diagram and
graphic tiles alternating. References: `brand/refs/grid/` (6 images supplied with the brief).

## What was built

| Part | Where |
|---|---|
| Tile skeleton and styles | `brand/kit/templates/tile.css` (token multiples only) |
| 9 tile templates (17 variants) | `brand/kit/templates/tiles.js`, merged into `engine.js` |
| Rhythm check + Fill 9 | `brand/kit/templates/rhythm.js` (also on `window.OK` in render.html) |
| Grid planner | `/brand/ostad/grid` (`app/brand/ostad/grid/`) |
| Before/after export gate | `/api/brand/ostad/render` (403) and `brand/scripts/render_posts.cjs` (CLI refuses) |
| iCloud photo intake | `brand/scripts/intake.py` → `brand/intake/` (local, gitignored); `/api/brand/ostad/intake` (+ `/img`) |
| Demo grid + proof | `brand/kit/templates/grid/demo.grid.json`, `brand/kit/templates/_grid_proof/` |
| Checks | `brand/scripts/grid_check.cjs` → `brand/kit/templates/grid/grid_check.json` |

### Templates (reference → template)

| Template | Variants | Reference it follows |
|---|---|---|
| `product` | photo, line, ingredients | café photo tile; serum frame (line drawing + hairline + mixed-weight headline + measure line); green glass ingredient cards |
| `before-after` | side, stacked; ring markup | signature "measured pair" (below) |
| `statement` | white / paper / dark | café text tile |
| `notice` | | café "Notice" / "Closed for Holiday" (meta = date and time lines) |
| `diagram` | radial, list, two-column, callouts | Seed capsule radial; dashed circle + straight labelled lines; profile callouts (with arrowheads, see below) |
| `ruled` | serif / grotesk words | Roam skin poster / fashion poster: words spread over 3 columns, 3 hairlines, 3-part footer |
| `procedure` | | café photo tile: meta = category, label = name + one fact |
| `quote` | existing template + meta slot | meta = source |
| `graphic` | clock, number, ring, timeline, icon | café clock face (open hours drawn as an arc); Seed feed ring text |

`product`, `before-after` and `procedure` get **Make carousel** in the editor (cover = the tile, 2 body slides, end slide, from
the existing carousel templates).

### Signature before/after: the measured pair

Two photos edge to edge with a hairline seam. The procedure goes in the meta corner, what was done is the label, and a ruler runs
from **Before · Day 0** to **After · Week N** with one tick per week. "Time since" becomes something you can see, the way the serum
frame's measure line shows size. An optional dashed ring sits at the same spot on both halves. Both photos get the same kit
treatment, so the comparison is never helped by the grade. Until both `patient_consent` and `approved_by_ostad` are yes, the tile
shows a "Draft · needs consent + Dr. Ostad approval" chip and every exporter refuses.

## Photo intake (iCloud)

- **Path used:** `C:\Users\naimj\clinic-library`. None of the standard iCloud folders exist on this PC. The library is the
  read-only icloudpd mirror with an existing catalog: 10,999 assets tagged by procedure, content type, before/after, device,
  description and patient code, with 72 matched before/after pairs. The intake reads that catalog and does not re-tag.
- **Sorted:** 4,119 candidates scanned (every photo, plus video stills of product, office and event content) and 2,807 kept:
  product 465, before-after 1,284, procedure 432, office-team 464, event 116, other-usable 46. Skipped: 627 not a post (personal,
  talking-head, consult), 34 flagged SENSITIVE, 651 near-duplicates (dHash ≤ 4).
- **Needs info:** 1,739 items plus 72 pairs. All 179 patient codes have consent `unknown`, so every before/after asks for consent
  and own-patient vs device-maker. Unclear procedures and products are asked, never guessed. Pairs give the days between the two
  photos; the time since treatment is still asked.
- Photos stay on this machine. The planner loads them only through a local route that resolves catalog row numbers.

## Measured (grid_check.json)

- **Export:** 36/36 renders through the server route (9 templates × variants × 4:5 and 1:1), right pixel size, Adobe fonts on all.
- **Centre crop:** 18/18 template/variant layouts keep meta, label and headline boxes inside y 135–1215 on the 4:5 canvas.
- **Gate:** consent only 403, approval only 403, both yes 200.
- **Rhythm:** the known-bad grid fires all four rules (text-side, text-stacked, photo-run, template-repeat). The demo grid and a
  Fill 9 result raise 0 warnings.
- **Page:** `/brand/ostad/grid` 200, 9 tiles, 0 console errors.
- **Lint on the nine demo tiles:** 0 off-token colours. 26 text/ground pairs on flat grounds pass contrast (4.5:1, or 3:1 at
  24 px and up). Text on photos sits on the tile shade, which this lint does not measure.

## Decided alone

- `/brand/ostad/edit` doesn't exist, so the templates live in `/brand/ostad/make` (slot form, not object editing).
- The profile-callout reference uses dot-and-line pointers, which rule 8 bans. They became elbow leaders ending in arrowheads.
- "Copy exactly": the layouts follow the references closely, but type, colour and treatment are Ostad's tokens (NHG, plus
  Cormorant for the ruled serif words). No reference logos or copy were used.
- Demo notices (Thanksgiving, Christmas) and the 9–5 clock aren't in CLIENT.md, so they're marked needs info.
- The demo before/after pairs' "after" previews from the catalog are composites (multi-day grids, watermarked posts). They are
  placeholders. Real posts need the originals pulled with `clinic-library/pull.py` once consent is in.
- The are.na board pull (`arena_pull.py`) hit 429 rate limits and was stopped. The board went from 56 to 87 blocks since the
  last pull, and those 31 new blocks weren't read this run.
