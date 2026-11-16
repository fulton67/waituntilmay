# Gnarls context layer

Load this first when making, posing, modelling or animating Gnarls the Narwhal (The New School mascot, pronouns **they/them**).
It is the condensed result of a full study of the "Gnarls Graphic Design" drive. Every image was measured (G1–G10) and every image
was read against a fixed schema, using the method in `research/ostad/style/FRAME_BY_FRAME.md`. Rules with numbers and verdicts are in
`DECISIONS.md`; the read-out is `read/gnarls_drive.md`.

## 1. What's here and how to query it

| Thing | Where | Committed? |
|---|---|---|
| 1,714 images (+163 PSDs, 58 EPS, 56 AI, docs) from the drive | `media/drive/` (pull: `rclone copy --drive-root-folder-id 1ipCsX3vpAt0y0BUfQNDe3Aj_J8A0Z_H3 gdrive: media/drive`) | no (team's work; names) |
| Key sources: 2021 Gnarls guide (PDF + docx), design brief, design requirements | `media/key/` | no |
| id ↔ path | `index.tsv` (I0001…), `psd_index.tsv` (P001…) | no |
| **Per-image read**: 24 fields (kind, form, on_model, view, pose, action, expression, eyes, mouth, glasses, outfit, props, fins, tail, outline, shading, background, setting, text, format, notes) | `read/images.tsv` (schema: `READ_SCHEMA.md`) | no |
| Per-sheet read | `read/sheets.tsv` | no |
| Measurements, one JSONL row per image | `measure/probe·color·ocr·silhouette·hash·gnarls.jsonl`; PSD layer trees `measure/psd.jsonl`; GIF frame tables `measure/gif.jsonl`; primary-mark construction `measure/construction.json`; pose classes `measure/pose_classes.json`; duplicate groups `measure/dupe_groups.json` | no |
| Contact sheets (12 per sheet, id burned in) | `sheets/NNNN.jpg`, `sheets/gif_*.jpg` | no |
| Guide pages as 400 dpi PNG and **vector SVG** (the original geometry of all 17 poses) | `crops/guide/p-1..5.png`, `crops/guide/p1..4.svg` | no |
| Tools, calibration, verify | `tools/` (`python -I tools/run.py all|ocr|psd|sheets`, `tools/calibrate.py`, `tools/verify.py`) | yes |

Typical queries: "all sparkle-hop references in ¾-left" = filter `read/images.tsv` on `pose`/`action`/`view`, or take ids from
`measure/pose_classes.json["P17_sparkle_hop"]`. Unique art only: collapse by `measure/dupe_groups.json` (1,487 unique of 1,714).

## 2. The character, to the pixel

Master = the vector primary mark on guide p.1 (`crops/guide/p1.svg`). All ratios are of total height **H** (tusk tip to fluke
bottom, outline included). Measured by `tools/construction.py` at 400 dpi.

```
figure        W/H 0.663            default view: 3/4, facing viewer's right (mirror freely)
tusk          spiral, 4-5 bands; roots top-right of head; axis 47.7 deg above horizontal; top 0.019 H, base ~0.153 H
              bands #d5dce5 / #9db5c1, shadow #6b8795; darker ring at the base
glasses       round brown frames, WIDER than the head (temples overhang both sides)
              span 0.525 H x 0.200 H; ring 0.020 H; top 0.162 H
              near lens 0.150 H round, centre (0.277, 0.253) H; far lens 0.107 x 0.135 H (aspect 0.79), centre (0.560, 0.278) H
              lens tint #abb9c0; frames #5e2818, dark #411c15; brows sit above the lens tops; dot pupils with a lash flick
mouth         small closed smile, right of centre under the far lens (open variants show white teeth band + pink tongue)
head/body     one bullet shape, no neck; light-grey spots on crown and back
tee           red short-sleeve, top 0.398 H, bottom 0.694 H, width 0.391 H; drawn #ed1d2f, shadow #cc1e25
N logo        white, 0.088 x 0.134 H, 0.529-0.662 H (always reads correctly: never mirror it)
shorts        white band 0.677-0.765 H, width 0.240 H
fins          two side fins out of the sleeves; long flat paddles, lighter underside, 3 scallops on the trailing edge
tail          no legs: body tapers into a forked fluke that stands like feet; 0.765-1.000 H, span 0.404 H
outline       near-black #100f0d die-cut contour, 2.0% H sides/top, 1.66% bottom (library median 1.34%)
shading       hard cel: body #909faa, light #c1c7ca, shade #798e9b / #688493 / #556f7c, deep #3f474d / #273742
```

Official swatches (guide p.2): body grey 147 161 172, light grey 193 199 203, glasses brown 100 48 22, Parsons Red 228 42 29
(brand surfaces), secondary yellow PMS 012 255 215 0 (sparkles, effects), blue PMS 279 65 143 222 (jeans, overalls).
Clear space = the height of the glasses. Minimum size 96 px digital, 0.75" print.

The **walkabout costume** is a different object: a plush bullet head deeper than it is wide, felt goggle-glasses with domed
lenses and printed pupils standing ~¼ head-width off the face, a stitched black smile, a stubby ridged horn, mitten fins with a
slit, an apron-like white shorts piece, two legs in grey boots, and a separate flat tail flap. 868 images use it. It's the best back
and profile reference (backs: I1062, I0092, I0093, I1651; profiles: I0794, I0770, I1339, I1235; top: I1295).

## 3. Pose and action library

Guide p.3 defines 17 poses (vector in `crops/guide/p3.svg`). Six of them carry 69% of illustrated use:

The official sticker files are `ActionPose1–7` in `Design Resources/Transparent Gnarls/ILLUSTRATED transparent Gnarls/`:

| Pose | Look | Uses | Master file | More refs |
|---|---|---|---|---|
| Lounge | lying belly-down, fluke curled up, **gold hexagon glasses** | 79 | ActionPose7 = I0716 (¾-right) | I0125, I1243 |
| Sparkle hop | white TNS tee, black shorts, eyes ^^ closed, fins spread low and wide, one fluke lobe bent, yellow sparkles | 70 | ActionPose1 = I0717 (front) | I0111, I0076 (GIF) |
| Cheer jump | red N tank, mouth open, fins flung up and out, body twisted, fluke flicked (often mirrored, tusk on left) | 69 | ActionPose3 = I0714 (¾-left) | I0074 / I0711 (GIF), I1517 |
| Proud grin | white tee + jeans, ^^ eyes, fins tucked behind back, shock lines | 47 | ActionPose4 = I0715 (front) | I0061, I0095 |
| Presenting | thin yellow glasses + blush, holding a sign on a stick with both fins, shouting | 35 | ActionPose6 = I0722 (¾-left) | I0066 |
| Fired-up flex | white TNS tee + jeans, slanted brows, open mouth, one fin bent up behind the head, the other down | 30 | ActionPose2 = I0718 (front) | I1097, I1322 |
| Graduate | gown, mortarboard, diploma, white rectangle glasses | 9 | ActionPose5 = I0720 (¾-left) | I0961 |

The rest of p.3: primary stand, mask, backpack (+ thin yellow glasses), black hoodie with red outline, overalls, white tee + jeans
stand, "!" surprised (no glasses, fins crossed), "?" thinking, angry scribble, laptop "…", graduate.
Observed beyond the guide (costume and composites): stand 652, jump 113, sit 109, lie 84, dance 81, float 46, lean 40, ride 38
(bike, scooter, snowboard, kart, horse, broom), exercise/yoga 25, run 17, walk 13, swim 6.

Swap slots seen in use: glasses (hexagon gold/yellow, thin yellow round, goggles, heart frames, sleep mask, none), outfit (tee
recolours, tank, hoodie, overalls, jeans tube, gown, jerseys, capes), hats (tusk goes through or beside), props held in a fin.

Animation as practised: 2-key toggles, 330 ms holds, no in-betweens (jump drops 12% of height between keys). Brief for the first
3D test: the 12-beat dance storyboard I1560.

## 4. Making it

**2D on command (house style):** pick the pose sticker (ActionPose1–7 from the table in section 3; primary I0577/I0578),
place it as a cut-out over a photo or flat red/black/white field, keep the black die-cut outline (optionally add a
white sticker border), set type in Neu Random, export to the format table (`DECISIONS.md` S2). Instagram gets minimal text; NN,
TV, flyer and easel get the Narwhal Nation QR code. University logo: black or white only, unaltered.

**3D build spec:**
- Meshes: body (head and torso are one bullet, no neck); tusk (fixed to the skull, spiral bands as geometry or a normal map);
  glasses (separate, wider than the head, swappable, tinted lenses); tee, shorts band and jeans as separate shells; 2 fins; fluke.
- Rig: 4–5 spine joints from crown to fluke root (must S-bend, ActionPose3 I0714); head tilt; 2 fin chains (shoulder, mid,
  tip, plus a grip socket); fluke with 2 independently bending lobes (they act as feet on a snowboard, I1596); brows, lids
  (open / ^^ closed / wink), mouth (closed smile, open with teeth band and tongue, O); glasses offset.
- Look: toon shader with hard 3–4 band cel steps in the as-drawn greys; an inverted-hull or post outline at 1.5–2.0% H, in
  #100f0d; spot decals on crown and back. Match the primary mark from the ¾ camera first, then check front (I0715) and the
  costume back views.
- Gap to solve: the drawn library has no back view and only 3 profiles, so the back is designed from the costume (I1062) and the
  silhouettes on guide p.4.

**Modernising (proposals):** keep the silhouette, glasses and tusk (the identity), and update the finish: soft-toy or vinyl
toy shading with the cel outline kept as an option, real in-betweens on the 2-key poses, a consistent prop and outfit kit
instead of crude repaints, and one 3D master that renders every sticker pose so the 23% off-model rate goes away.

**Ownership:** this is the New School graphic design team's own work on the character, so building the 3D master and
modernising the style are in scope. The guide's "do not re-create" line addresses units that use the stickers. Keep every change
traceable to the guide's identity (silhouette, glasses, tusk, red N tee, colours). The finished master goes to the branding
office as the new official files, the same way the team already clears logos (DECISIONS X1).
