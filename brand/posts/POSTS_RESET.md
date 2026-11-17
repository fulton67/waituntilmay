# POSTS RESET: posts are designed stills, not video frames (2026-11-17)

Grid 3 is scrapped (Naim: "the worst one yet ... the are.na board doesn't look like an infographic ... screenshots and quotes from
the page isn't cool either ... no aesthetic that is cohesive ... taking screenshots from the videos isn't utilizing the hundreds of
photos that are in the iCloud"). Don't redo the other 6 carousels in the grid 3 direction.

**Anatomy (correction 2026-11-17):** drawn anatomy is NOT banned. Naim likes drawn anatomy, on its own and drawn over the face,
in posts and reels; what he rejected was one inaccurate skull. Anatomy drawings must be accurate to a reference (see LESSONS P5).

**Banned in posts:**
- frame grabs or screenshots from any video
- screenshots of web pages, press pages or award listings
- transcript lines as word-by-word captions, and the video caption style in general
- the video system's pill labels, blue arrows and moving warm background, dropped in as-is
- upscaled small images when a full-size original exists
- text-heavy tiles, beyond the information layer Naim asked for in round 2 (see Step 3)

## Steps

1. **Still study.** Pull the references:
   - `@rit.clinic_official` and post `DdjBJOUE436` (Apify, $5 cap)
   - the Are.na board `dr-ostad`
   - `brand/refs/grid/`

   Run M21 plus the layer, material, light and edge probes on every still: `research/ostad/style/tools/still_study.py`. Write
   `STILL_STUDY.md`, then `POST_RULES.md` with numbered rules that cite reference tiles. Posts share tokens and type with the
   videos, not layouts.

   **Order for every value (added 2026-11-17):**
   1. Inventory the raw values first.
   2. Merge near-duplicates.
   3. Name each value by its role.
   4. Flag every place the references contradict each other, and say which one we follow and why.
   5. Mark each rule "observed" (measured) or "inferred" (a guess).

   Put the inferred rules in their own list at the end of `POST_RULES.md`.

2. **Photos first, from iCloud.**
   - Work from full-resolution originals only.
   - List shot requests from the videos in `brand/intake/SHOT_REQUESTS.md`. Don't grab frames.
   - Make a contact sheet of the 30 strongest photos.
   - Before/after pairs: watermarked "not for posting" drafts only, plus a consent list by patient code for the office.

3. **Nine single posts.** Each is HTML/CSS/SVG rendered by the server renderer: `public/brand/ostad/stills/grid4.html` →
   `brand/scripts/render_stills.cjs`.
   - Glass is a material, used only with a reason. It has:
     - blur of what's behind it
     - a tint
     - a highlight along one edge
     - a thin bright rim
     - a soft contact shadow
     - grain
   - One light direction across all nine.
   - One idea per tile.
   - Round 2 (Naim: "a bit closer though not enough information"): each tile adds a sourced information layer (spec rows or
     chips). Keep it to about 25 words, which is the median of Naim's grid refs.
   - Grid rhythm: photo-led tiles, one or two quiet text tiles, and one designed graphic.
   - The variety and reuse checks apply.

4. **Compare.** Put the nine on one sheet next to the rit.clinic grid and the Are.na favourites. Re-run the still measurements and
   report the gap per rule in numbers.

   **Fixed pass/fail checklist (added 2026-11-17).** Judge it by opening each rendered tile:
   1. Starts from an iCloud original or a designed graphic.
   2. No banned element.
   3. One idea, within the word limit.
   4. Glass built with all its parts.
   5. Light direction matches the other tiles.
   6. Colours are tokens only.
   7. Type sits inside the centre crop.
   8. Doesn't match another tile or an earlier post.
   9. Would sit unnoticed in the rit.clinic grid.

   Repair any fail and re-check it, 3 rounds at most, then report what still fails. Publish to `/brand/ostad/grid`. Carousels
   come only after Naim has seen this grid.

5. **Record.**
   - Log grid 3 in `research/ostad/learning/REJECTED/`.
   - Add the lessons and checks to `research/ostad/learning/LESSONS.md`.
   - Update the `/post` skill so posts never route through the video compositions.

6. **V6 lessons that carry over to posts** (`research/ostad/style/V6_SYSTEM.md`):
   - every image is the literal subject
   - no empty signifiers
   - real clinic-library material
   - an arrow only lands on a meaningful target, in one colour and one weight
   - no graphic reused (`tools/reuse_check.py`)

## Correction (2026-11-17): drawn anatomy is wanted, it must be accurate

Drawn anatomy is NOT banned. Naim likes drawn anatomy, on its own and drawn over the face, in posts and in reels. What he
rejected was one inaccurate skull. The rule is accuracy:
- Every anatomy drawing is built from a real reference: the layered face and skin models (`research/ostad/3d/base/face.glb`,
  `skin_crosssection.glb`, Z-Anatomy) or a gold-pick frame for that structure. Trace proportions from the model; never draw
  anatomy from memory.
- Before use, overlay the drawing on a render of the model from the same angle and measure the outline difference; report the
  number. Skulls, bone and muscle shapes get the strictest tolerance.
- Drawings on a face use the face-tracking landmarks, so structures sit where they really are.
- Any drawing that makes a clinical point is marked for Ostad to check.
- If a drawing can't pass, use a render of the 3D model in the line style instead, or a real licensed image.
