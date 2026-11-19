# Before/after v2: glass feed posts with measured marks (2026-11-19, draft for Naim)

The page is `public/brand/ostad/stills/ba/v2.html`. Measurements come from `brand/scripts/ba_v2_measure.py` and are written to
`ba/v2.js` and `measure.json`. Render with:
`NODE_PATH=node_modules node brand/scripts/render_stills.cjs ba/v2 "<out>"`.
The PNGs are kept outside the repo, in `Downloads/Ostad BA redesign/`. Patient photos and renders are never committed; the
sources are in the gitignored `ba/src/v2`.

## What was kept

These come from the established 1920×1080 cream slides and the SkinCard STANDARD:

- **Paper and colour:** cream paper and navy ink.
- **Header:** the serif name "DR. ARIEL OSTAD", a hairline, then "TOTAL SKIN HEALTH" in letterspaced caps.
- **Procedure name:** a letterspaced serif name under the photos, with one small caps line beneath it.
- **Photos:** matched photos, never graded or retouched.
- **SkinCard parts:**
  - glass windows, both round and rounded
  - the glass BEFORE / AFTER pill
  - thin white ellipse rings
  - the credit line "Patient of Dr. Ostad. Individual results vary."

## What changed and why

- **Tile format.** Tiles are 1080×1350 (4:5 feed) instead of 16:9 slides. The SCIENCE / DERMATOLOGY side columns and the tagline are
  dropped, so there is more air in the Ro manner: one photo object, generous margins, small type, and the numbers set as the
  display element.
- **Photos sit in glass.** Each photo sits in a rounded window on a lit glass rim (stills.css `.glass`, key light from the upper
  right). The navy "THE TRANSFORMATION" panels and flat pills are gone.
- **Marks are measured.** All marks are white hairlines with a soft down-left shadow and no blue (L5/U6). They are placed from
  MediaPipe landmarks after the after photo is aligned to the before on the eye corners, nose bridge and nose tip (similarity fit,
  residual reported). A region is marked only when its change clears a noise floor: red area ≥ 0.5 % before and down ≥ 40 %, or ≥ 4
  spots and down ≥ 40 %.
- **Cheek regions start below the lower lid.** A mark for an under-eye or cheek change never starts above the eye. This does not
  ban marking a change that is itself above the eye (forehead acne).
- **Profiles are measured against his own drawn guide line.** For each row, the first skin column is compared with the white line.
- **Layout variety.** There are four layouts, so no two neighbouring grid tiles share a look.

## Layouts and use

| File | Layout | Use it for |
|---|---|---|
| `v1_split_P0010.png` | One aligned face split by a slider line (glass handle) through the measured cheek; the white ring spans both sides | Frontal skin results (acne, redness, pigment) where the pair aligns well (residual under 2 % of eye distance) |
| `v2_loupe_P0013.png` | Matched panels, each with a glass loupe (2×) on the treated point and the measured gap tick; big numbers below | Small structural changes (chin, lips, nose) that need magnifying |
| `v3_hero_inset_P0013.png` | The after large in a glass window, the before in a round glass inset on the same point, one short white arrow | Single-number results, and as a calmer cover tile |
| `v4a_carousel_cover_P0010.png` + `v4b_carousel_detail_P0010.png` | Carousel: cover (after window plus a round before inset with a ring; the dashed ring marks the same region on the after), then a measured detail slide (visits as round glass thumbnails on a timeline, with spec rows) | Multi-visit series (AviClear, laser courses) |

## Measurements used (`measure.json`)

- **P0010, AviClear** (catalog 2965, visit 1 vs visit 4 of the clinic's own 4-up sheet).
  - Alignment: scale 1.001, rotation 4.9°, residual 1.3 % of eye distance.
  - Right cheek red area: 2.88 % → 0.00 %. This is the only marked region.
  - Left cheek: 0.15 % → 0. Below the floor, so it is not marked.
  - Both cheeks per visit: 1.52 %, 1.77 %, 0.75 %, 0.00 % red area.
- **P0013, chin filler** (catalog 6069, right profile sheet). The gap from the chin to his guide line went from 21.5 px to 4.0 px:
  9.9 % → 1.9 % of the line's length. The older drafts read 10.2 % → 5.5 % with a different chin row, so this needs a check.
- **Dropped for honesty:**
  - P0005 (profile acne): MediaPipe finds no face on the after, so it can't be aligned.
  - P0028 (acne scars): no measurable redness change, and texture is not measured yet.

## _cephra

Not scraped. The Apify account is at its monthly cap ($10.01 of $10, checked through `/v2/users/me/limits`), and the actor call
returned 403. No items, frames or notes exist yet. The mark style above follows the brief's description: thin white lines,
ellipses and arrows on the face. Rerun the 10-item scrape after the cap resets and fill this section in: line style, labels, what
is measured, and motion.

## Open items

- **v1 split, after side:** the after panel's own burned-in caption strip and the edge of the warped panel show along its top and
  right. Tighten the after crop (y0 ≈ 575, x1 ≈ 915) and render again.
- **Low source resolution:** P0010 panels are ~386 px wide, so v1 and v4a show them at ~1.6×. The P0013 loupes show 2× of a 525 px
  panel. Find full-resolution originals of the individual visits (the catalog holds only the 4-up sheet) before posting.
- **Two patients across four layouts:** add one more frontal pair with a measured change (high-res, separate images) so each layout
  has its own patient.
- **"Sept 8, ~3:50" standard set not found:** the catalog has no images in that window (2025-09-08 15:53 is a product video). The
  pasted slides were used as the standard.
- **Arrow and text check:** an in-page audit (same rule as `arrow_text_lint.py`) found 0 crossings on all 5 tiles.
  `arrow_text_lint.py` itself expects a Remotion TEXTAUDIT log, so it can't score stills.
- **Sign-off:** Ostad and Naim to review. Red area is a colour measure and is sensitive to lighting differences between visits.

## Video: v1 split as a slider animation (P0010, 2026-11-19)

- **Compositions:** `brand/remotion/src/bastory` (own entry point): `BaStoryP0010` (Story, 1080×1920) and `BaFeedP0010` (feed, 1080×1350),
  30 fps, 11.5 s. Same beats in both. Render: `npx remotion render src/bastory/index.ts BaStoryP0010 <raw.mp4> --codec=h264 --crf=12`, then
  `ffmpeg -i <raw.mp4> -vf scale=in_range=full:out_range=tv -c:v libx264 -crf 16 -preset slow -pix_fmt yuv420p -color_range tv -movflags +faststart <out.mp4>` (limited range, not yuvj420p).
- **Photos:** `brand/scripts/ba_story_p0010.py` warps the after into the before's frame with the measured M, then cuts ONE rectangle
  that lies inside the clean area of both panels (no sheet caption, white margin, seam or rotated panel edge), eroded 6 px, with
  the ring at least 20 px inside. Result: before-panel px x 37–364, y 145–496 (327×351), shown at 2.9×. Output goes to the
  gitignored `brand/remotion/public/ba-story`. This fixes the v1 still's after-side caption strip and tilted edge.
- **Rings in sequence (round 3, user: "one circle shouldn't be up for that long ... then another in another place where there is
  acne"):** `brand/scripts/ba_story_regions.py` runs the v2 spot / red-area detection over landmark regions (forehead, both cheeks,
  nose, chin, both jaws) on the before and the aligned after, with the v2 floor. Results on P0010:
  | Region | Spots before → after | Red area before → after | Floor | Ringed |
  |---|---|---|---|---|
  | Forehead | 4 → 0 | 1.11 → 0.00 % | clears | **yes** (run with `--allow-above-eye`), tight to its largest cluster (2 spots; window px 600, 65; 41×49 at k = 1) |
  | Right cheek | 0 → 0 | 2.88 → 0.00 % | clears | **yes**, tight to the red patch that went away (window px 188, 635; 53×34 at k = 1) |
  | Nose | 4 → 2 | 2.81 → 2.08 % | clears (spots) | no: visual check, the vanished spot is the tip highlight, the others the nostril shadows |
  | Left cheek | 1 → 0 | 0.15 → 0.00 % | below | no |
  | Chin | 1 → 3 | 1.78 → 4.71 % | worse (lighting) | no |
  | Right / left jaw | 0 → 1 / 0 → 3 | 0 → 0.52 / 0 → 1.31 % | worse | no |
  Two regions are ringed: the right cheek, then the forehead. The rule against marks above the eye only covers marks for an
  under-eye change, so forehead acne is marked; the script needs `--allow-above-eye` for it. On BEFORE each ring draws on 0.6 s
  (from its top, clockwise), holds 0.7 s and retracts 0.5 s; on AFTER the same rings come back briefly (0.45 / 0.45 / 0.4 s). The caption follows the ring showing ("Right cheek · red area 2.9 % →
  x %"; a spot region would read "<Region> · n spots → m").
- **Beats (s), two rings (13.87 s, 416 frames):** 0.2–2.05 right-cheek ring on BEFORE · 2.05–3.9 forehead ring on BEFORE · 3.9–6.4
  sweep LEFT → RIGHT (AFTER revealed on the left) · 6.5–7.85 cheek ring on AFTER · 7.85–9.2 forehead ring on AFTER · 9.2–10.1 scrub
  back right → left past both rings · 10.1–10.3 pause · 10.3–11.2 return · 11.45–11.75 line and handle fade · 11.77–12.27 end card
  in · hold to 13.87. The timeline scales with the ring count (`timeline(n)` in Story.tsx). The caption follows the ring showing:
  "Right cheek · red area 2.9 % → x %", then "Forehead · 4 spots → n".
- **Story link sticker:** the Story keeps a plain 600×160 zone (x 240–840, y 1380–1540) empty for the whole video for Instagram's link
  sticker, which is the real booking button; the Story end card has no BOOK NOW pill, only "Tap the link below". The window is
  scaled to 0.85 (799×858) to make room. The feed keeps the BOOK NOW pill.
- **Guards:** the composition throws (fails the render) if a visible pill or the end card crosses the slider line, or if a visible ring touches the line, a pill, the handle, the end card or the sticker zone, leaves the photo window (so it
  clears the header) or enters the Story's top 250 px, or if any
  text row, the window or the end card enters the sticker zone.
  `brand/scripts/ba_story_verify.py <mp4> <outdir> [story|feed]` checks flashes (one-frame luma spikes > 30), white sheet margin
  along the window edges every 10th frame, that the sticker zone stays plain paper in every frame, and writes posters, a beat sheet and an edge/corner tile (outside the repo).
