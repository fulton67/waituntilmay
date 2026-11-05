# OSTAD FACE MARKUP — procedure → annotated face, automatically

Unattended; same rules as the other Ostad runs (never ask, log to `research/ostad/markup/DECISIONS.md`, resume from `markup/TODO.md`, push to main after each measured phase). Depends on `procedures.json` (97 entries) and, when present, the bible's chapter 6 house style and the gold picks. If the bible doesn't exist yet, build the tool with a placeholder style from `BRAND-BIBLE`-adjacent rules in DECISIONS.md and flag it; the bible will own the final grammar.

## What it is

Give it a face photo and one or more procedure ids; it returns the photo with the treatment marked on the face in Ostad's house markup — dots where product goes, brackets and outlines where a device or surgery acts, leader lines to small labels — as a PNG, and as a transparent overlay PNG/SVG so it can sit on video. The reference registers: the hand-drawn surgeon's pen markup (image "Chesnut before/after") for *what* gets marked, and the editorial product-callout layout (thin white leaders, small-caps labels, hairline boxes) for *how* it reads. Ours is cleaner than the pen, more clinical than the editorial.

## Phase 1 — landmarks

`markup/landmarks.py`: MediaPipe Face Mesh (468 points + iris) on any portrait; fall back to dlib 68 if MediaPipe fails on a frame. Output normalised coordinates, head pose (yaw/pitch/roll), and a quality score. Reject or warn under 0.6 (profile, occlusion). Test on 30 varied faces (download CC0 portraits: skin tones, ages, glasses, beards, turned heads) and log the detection rate.

## Phase 2 — zones

`markup/zones.json`: every anatomical zone Ostad treats, defined as sets of landmark indices (and, where a zone is a region, a polygon of indices): glabella (procerus, corrugator L/R), frontalis rows, crow's feet L/R, bunny lines, nasal tip/dorsum, tear trough L/R, medial/middle/lateral cheek fat pads L/R, nasolabial folds, lips (vermilion border, philtrum, cupid's bow, oral commissures), marionette, DAO L/R, mentalis, chin, prejowl, jawline L/R, masseter L/R, submental, platysmal bands, neck, temples, brow tail, under-eye, full-face field, hands (separate hand-landmark model). Mirror pairs by symmetry so a left definition yields the right.

Then `markup/patterns.json`: **procedure → markup pattern**. For each of the 97: the zones, the marker type per zone (`dots` with a count and spacing rule, `bracket`, `outline`, `hatch` region, `arrow`, `line`), the label text (short, the way Ostad says it), and the default placement side for the label. Dot counts and positions come from the gold injection-map references and from what he says on camera ("three points along the masseter"), not from memory — cite the ref id per pattern in a `source` field and mark every pattern ⚠ physician-check. Where a procedure is site-specific (Mohs, mole removal, scar revision), the pattern takes a user-supplied point.

## Phase 3 — the renderer

`markup/render.py`: takes the photo, landmarks, patterns and the style spec; draws an SVG overlay in image coordinates, then rasterises (Playwright or cairosvg) at 2×. Style spec is a JSON the bible will own: dot radius and fill, ring vs solid, leader-line weight and bend rule (one elbow, horizontal tail), label type (face, size, case, tracking), label box (hairline, padding, background alpha), bracket style, hatch pattern, the single keyable background colour, 9:16 safe area, how labels avoid eyes and mouth. Label placement is automatic: labels go to the nearer image edge, stack without overlap, never cover the marked zone. Export: composite PNG, overlay PNG with alpha, raw SVG, and a JSON of every marker's pixel position (so the R3F anatomy page or After Effects can reuse it).

Also a **before/after template**: two portraits side by side, left marked with the plan, right unmarked or with only result brackets, the house header (name/clinic/BEFORE/AFTER) in the type system — the image-1 format done cleanly.

## Phase 4 — the interfaces

- CLI: `markup.py --image face.jpg --procedure botox-glabella --procedure masseter-botox --side both --label on --out dir`. Multiple procedures compose; colours or marker types differentiate them per the style spec.
- `/ostad/markup` page (noindex, same styling): drop a photo, tick procedures from the 97 (grouped by category), optional click for site-specific ones, toggle labels/overlay-only, download PNG / overlay / SVG. Runs client-side: MediaPipe Face Mesh via its web build, the same patterns.json and style spec, the same SVG renderer ported to the browser so output matches the CLI pixel-for-pixel on the test set.
- Slash command `.claude/commands/markup.md`: "mark up this photo for cheek filler and lip flip" → runs the CLI with the right ids.

## Phase 5 — the bible chapter

Write `research/ostad/bible/ch-markup.md` (to be merged into the bible as its own chapter): the grammar (what each marker type means, when to use which, dot semantics: solid = product, ring = assessment point, bracket = device field, outline = surgical plan), the style spec as the rules behind it, before/after format rules, do/don't with rendered examples from the test set, and the manifest of patterns with their ⚠ status. One plate: the full face with every zone labelled, schematic.

## Verify by measurement

Detection rate on the 30-face test set; every procedure in procedures.json has a pattern (count the misses); CLI and web render diffs under 1% pixels on the test set; label overlap count = 0 on the test set; overlay PNGs have an alpha channel; `/ostad/markup` live returns 200. Render all 97 procedures on one neutral test face into a contact sheet `markup/sheet.jpg` and look at it.

## Finish

TODO.md ends with: detection rate, patterns written / missing, the ⚠ list, sheet path, page URL, anything decided alone.
