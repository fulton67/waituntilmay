# Judging brief: visual references for Dr. Ariel Ostad

You are looking at contact sheets of candidate images for a library of **modern medical-education graphics**, one sheet per batch of up to 20 candidates for ONE procedure. Your job: look at every tile and decide keep or reject, and for keepers say what kind of graphic it is.

## Files
- `research/ostad/refs/sheets/{pid}__{n}.jpg`: the sheet. Tiles are numbered 0–19 in the top-left corner.
- `research/ostad/refs/sheets/{pid}__{n}.json`: legend with `pid`, and per tile `i`, `id`, `title` (the page title it came from), `site`, `size` (pixels), `path` (full-size file).
- `research/ostad/refs/procedures.json`: what each procedure is (`name`, `what_it_does`, `anatomy`).
- Write your verdict to `research/ostad/refs/sheets/{pid}__{n}.verdict.json` (exact format below). One file per sheet. Skip sheets that already have a verdict file.

Read the sheet with the Read tool. If a tile is too small to decide (labels? photo or render? on topic?), Read its full-size `path` from the legend. Do that whenever you're unsure; don't guess.

## Keep only if ALL of these hold
1. **A drawn or rendered medical graphic**: vector illustration, 3D render, animation still, labelled diagram, schematic, flowchart. A clinical photo with injection dots drawn on it is NOT kept; an illustrated face with dots IS.
2. **Looks modern (post-2015)**: flat/vector or modern 3D. Reject scanned textbook halftones, old engravings, 90s clip art, blurry low-effort diagrams.
3. **Clearly about this procedure, its device, or the anatomy it acts on** (check `what_it_does` and `anatomy`). A generic neuron diagram on a Botox sheet: keep only if it shows the neuromuscular junction / acetylcholine / toxin action. A general muscle chart of the whole body on a frown-lines sheet: reject. An injection map for lips on the lip sheet: keep; on the masseter sheet: reject.
4. **Carries information.** Reject: photos of people, before/after photos (even with arrows), logos, product packshots, device photos with no explanation, clinic ad banners and promo graphics with prices or "book now", stock renders that only decorate, text-only infographics, comparison tables, book covers, graphs of study data, screenshots of web pages.

Be strict but not stingy: the library wants 8–20 good images per procedure. A device cutaway or a manufacturer's "how it works" graphic of the treatment head IS kept (`device`). A clean labelled anatomy plate of exactly the region treated IS kept (`3D-anatomy` if rendered, else `cross-section` or `other`). Near-duplicates on the same sheet (same image, different crop/size): keep the better one only.

## Types (pick one per keeper)
- `cross-section`: skin/tissue layers cut through, showing depth (laser columns, RF needles, filler planes).
- `MOA`: mechanism of action: what happens at cell/molecule/tissue level (toxin blocking acetylcholine, collagen remodelling, melanin pathway).
- `injection-map`: face/body drawing with injection points, zones, units or danger areas.
- `surgical-steps`: incisions, flaps, step-by-step surgical drawings.
- `3D-anatomy`: rendered anatomy (muscles, vessels, fat pads) without a procedure overlay.
- `device`: how a device or handpiece works (cutaway, treatment head, energy delivery).
- `flowchart`: decision trees, process diagrams, step sequences drawn as boxes/arrows.
- `other`: a kept graphic that fits none of the above.

`labelled`: true if the graphic carries text labels/callouts naming structures or steps (not just a logo or a title).

`style`: 4–10 words: rendering style + palette + anything notable, e.g. "flat vector, pastel, labelled callouts, white ground", "3D render, realistic muscles, dark background", "line drawing, two-tone, journal figure".

## Verdict format (JSON array, one object per tile, every tile listed)
```json
[
  {"i": 0, "keep": true, "type": "MOA", "labelled": true, "style": "flat vector, blue/pink, labelled synapse"},
  {"i": 1, "keep": false, "why": "before/after photo"},
  {"i": 2, "keep": false, "why": "off topic: shoulder muscles"}
]
```
Keep `why` to a few words. Write valid JSON only (no comments, no trailing commas).
