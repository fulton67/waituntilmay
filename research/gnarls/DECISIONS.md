# Gnarls: rules we adopt (step 4.5 of FRAME_BY_FRAME.md)

Each rule has a number, a spread, its sources, and a verdict: **adopt**, **adapt** (with how), or **reject** (with why).
Ids are images in the drive study (`index.tsv`, `read/images.tsv`). "Guide" = `media/key/gnarls_style_guide_2021.pdf`.
Numbers come from `measure/` (G1–G10) and the read (`read/images.tsv`, 1,714 rows). Pulled 2026-11-16.

## Character construction (for 2D-on-command and the 3D model)

| # | Rule | Number (spread) | Source | Verdict |
|---|---|---|---|---|
| C1 | Proportions are ratios of total figure height H (tusk tip to fluke bottom, outline included) | figure W/H 0.663 | G10 on guide p.1 primary mark | **adopt** |
| C2 | Tusk: spiral, 4–5 bands, roots top-right of the head in the primary ¾ view, leaning right | axis 47.7° above horizontal; visible length ≈ 0.19 H; top at 0.019 H | G10; reads (I0323, I0445, I1297) | **adopt**. In front views it moves to top-centre, vertical (I0715, I0717, I0718): model it as one fixed tusk on the skull, and let the camera produce the change |
| C3 | Glasses are wider than the head: temples stick out past both sides | span 0.525 H incl. temples; height 0.200 H; ring 0.020 H; near lens 0.150 H round; far lens 0.107 × 0.135 H (aspect 0.79, ¾ foreshortening) | G10; I0715 | **adopt**. Lenses carry a tint fill (#abb9c0) |
| C4 | Tee: red, short-sleeved, white N logo centred low | tee top 0.398 H, bottom 0.694 H, width 0.391 H; N 0.088 × 0.134 H at 0.529–0.662 H | G10 | **adopt** |
| C5 | White shorts band under the tee, then the tail | shorts 0.677–0.765 H, width 0.240 H | G10 | **adopt** |
| C6 | No legs: the body tapers into a forked fluke that stands like feet | tail 0.765–1.000 H, fluke span 0.404 H (61% of figure W) | G10; reads: jeans are one tube into the fluke (I1322, I1590) | **adopt** for the illustrated model. The costume has two legs and boots (I0784): a different object, see C10 |
| C7 | Outer contour: thick near-black (#100f0d) die-cut outline around the whole figure | guide primary 2.0% H on left/right/top (1.98 / 2.12 / 2.09%), 1.66% bottom; library stickers median 1.34% (p10–p90 0.90–1.78%, n=24 labelled black_thick) | G10 per side; G5 on illustrated cut-outs | **adopt** 1.5–2.0% H. Exports shrink it, so draw at 2.0% |
| C8 | Cel shading, 3 greys plus a blue-grey shadow; light-grey spots on the head and back | as-drawn fills: body #909faa, light #c1c7ca / #bfc6ca, shade #798e9b #688493 #556f7c, deep #3f474d #273742 | guide p.1 SVG fills (`crops/guide/p1.svg`) | **adopt**. The guide lists only 2 greys "when colours are limited"; full art uses ~10 |
| C9 | Colours as drawn differ slightly from the guide's swatches | tee drawn #ed1d2f / shadow #cc1e25 (guide swatch Parsons Red 228 42 29 = #e42a1d); glasses #5e2818 / dark #411c15 (guide 100 48 22); body #909faa (guide 147 161 172 = #93a1ac) | SVG vs guide p.2 | **adapt**. Use the guide swatch for brand surfaces and print; use the as-drawn values to match existing stickers in 3D |
| C10 | Two Gnarls exist: the vector character and the walkabout costume | in the drive: costume 868, illustrated 461, mixed 18, AI 6, silhouette 5, plush 2, no Gnarls 354 | read | **adopt** the vector character as the 3D master. Use the costume only as volume and back-view reference: the drawn library has 0 back views and 3 profiles, the costume photos have 5 backs and 16 profiles |
| C11 | Default view is ¾, mirrored freely | illustrated views: front 174, ¾-left 168, ¾-right 113, profile 3, back 0 | read | **adopt**. The model is symmetric apart from the tusk; build mirrored poses |

## Poses and actions (what a rig must do)

| # | Rule | Number | Source | Verdict |
|---|---|---|---|---|
| A1 | Six guide poses carry the illustrated corpus | lounge 79, sparkle hop 70, cheer jump 69, proud grin 47, presenting 35, fired-up flex 30 = 330 of 479 illustrated figures (69%) | keyword classes over the read (`measure/pose_classes.json`), guide p.3 | **adopt**: these six are the first rig targets, then the rest of guide p.3 (primary, mask, backpack, hoodie, overalls, jeans, !, ?, angry, laptop, graduate) |
| A2 | Props are parented to a fin, not redrawn | holding 367 rows; same pose reused with paddle, ray gun, boombox, frisbee, sign, rope, bow | read (I0245, I0237, I0377, I0258, I1422, I1444) | **adopt**: 1 grip socket per fin |
| A3 | Glasses are a swap slot | swapped 113 (hexagon 50+, thin yellow round 13+, goggles, heart, sleep mask); off 13 | read | **adopt**. The lounge pose always wears gold hexagons (guide p.3); the "!" pose has none |
| A4 | Hats sit on the crown with the tusk through or beside them | many (I0144, I0183, I1596, I1298) | read | **adopt**: hats need a tusk hole or a tusk-hide toggle |
| A5 | The tail is a posable limb | fluke kicks a ball (I0072), straps into a snowboard as feet (I1596), curls up in the lounge pose | read | **adopt**: 3–4 spine joints into a 2-lobe fluke with independent lobe bend |
| A6 | Strong S-curve bends happen | ActionPose3 (I0714) | read | **adopt**: a spine chain with enough joints to S-bend without breaking the tee |
| A7 | The house animation is a 2-key toggle | GIFs: 4 frames A-B-A-B, 330 ms holds (cycle 660 ms); jump drops 12.2% of canvas height between keys; sparkle loop 32 × 30 ms with a still body | G9 (I0074, I0711–I0713, I0076) | **adapt**: keep the snappy hold timing as a style option ("on twos"); 3D adds in-betweens and squash |
| A8 | A ready-made animation brief exists | 12-beat dance storyboard: slow-mo jump, fast spin, wave, flap, kick, run to camera, orbit | I1560 | **adopt** as the first animation test |

## House style (making graphics on command)

| # | Rule | Number | Source | Verdict |
|---|---|---|---|---|
| S1 | Gnarls is a composited sticker, not redrawn per design | PSD smart objects: `gnarls jersey.psb` ×22, `NOBG-ActionPose1..7`, `gnarls4/7/8/10.png`; team deck: "photoshopped Gnarls over 1,000 times" | G8 (163 PSDs); `read/docs/Graphic Design Presentation AY26.pptx.txt` | **adopt** for 2D. 3D replaces the cut-out with a rendered pose at the same placement |
| S2 | Delivery formats | 1300×780 (292), 1080×1080 (217), 1080×1920 (88), 1080×1350 (40), 1920×1080 (39); 504 images match no named format (prints, raw photos) | G1 | **adopt** `media/key/design_requirements.png`: NN 1300×780 ≤10 MB; story/easel 1080×1920; feed 1080×1350; TV 1920×1080 jpg ≤5 MB; 3% safe margin |
| S3 | Instagram: minimal or no text. NN, TV, flyer, easel: include the Narwhal Nation QR code | — | team decks (AY26, internal 2025) | **adopt** |
| S4 | Palette is red / black / white with photo colour | layouts: median saturation 0.35 (p10–p90 0.17–0.62), luma 136 (70–197) | G3 | **adopt** |
| S5 | University logo: black or white only, never outlined, recoloured, effected or redrawn; cantilevered lockup only for degree-granting units | — | brief p.2, sports-logo memo | **adopt** (hard rule) |
| S6 | Costume cut-outs flipped so the N reads backwards | I0620–I0623, I1190–I1193, I1536, I1543 | read | **reject**: never mirror a figure with the N or type on it; mirror the pose and re-letter |
| S7 | Off-model edits: crude repaints, photo capes pasted on cel art, moved tusk, AI images with garbled N | on_model off 108 of 461 illustrated (23%); AI 6 (I0958–I0960, I1343–I1345) | read | **reject** for the canonical model; keep as a "what not to do" set |
| S8 | Hand-drawn "cute" chibi set (brown line, blush, stub legs, nub horn) | 29 figures (I0730–I0754) | read | **adapt**: a separate emote style, not the 3D master |

## Constraint on the whole project

| # | Rule | Source | Verdict |
|---|---|---|---|
| X1 | "Please use the files provided. Do not re-create the character or alter the character's shape or colors in any way." | guide p.2 | **adapt**: the guide is written for units that *use* Gnarls. This project is the New School graphic design team's own work on the character (2026-11-16), so the 3D master and the modernisation are in scope. Keep the identity (silhouette, glasses, tusk, red N tee, colours) traceable to the guide. Route the finished master through the branding office the way the team already does for logos (`read/docs/Memo for graphic designers…`), so the new files can replace the old stickers as "the files provided" |
