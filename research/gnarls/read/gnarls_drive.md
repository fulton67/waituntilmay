# Read-out: gnarls_drive (step 4 of FRAME_BY_FRAME.md, for stills)

Reference: "Gnarls Graphic Design" shared drive (refs.yaml `gnarls_drive`), pulled 2026-11-16.
Target: pin the canonical character to the pixel, catalogue every pose/action for a rig, and read the house style.

## Coverage (MEASURE_COVERAGE.md: all ✓)

- Listed 2,210 objects; saved 1,714 raster images, 163 PSDs, 58 EPS, 56 AI, 21 PDF, docs and decks. 11 same-name files rclone skips
  were fetched by Drive id; 15 shortcuts are dangling (target deleted, can't be fetched).
- G1 probe, G3 colour, G4 OCR, G5 silhouette, G6 hash, G7 official-colour shares: 1,714/1,714, 0 errors. G8 PSD layers 163/163.
  G9 GIFs 7/7, every frame. G10 construction of the guide's primary mark.
- Calibration (`tools/calibrate.py`): 23/23 within 10%. Fixes made on the way: outline width was +1 px (distance-transform origin);
  pHash flips about 10 bits on flat art after resize+JPEG, so duplicate groups use dHash ≤ 6.
- Read: 186 contact sheets, 186 sheet lines, 1,714 image rows (8 readers), 24 fields each, 0 malformed, 0 duplicates.

## The mix

| | n |
|---|---|
| layout / photo / logo / sticker / collage / doc / other | 1120 / 170 / 158 / 124 / 79 / 26 / 37 |
| Gnarls form: costume / illustrated / none / mixed / AI / silhouette / plush | 868 / 461 / 354 / 18 / 6 / 5 / 2 |
| illustrated on-model: yes / minor / off | 112 / 239 / 108 (23% off) |
| unique art (dHash ≤ 6) | 1,487 of 1,714; biggest group is one design ×21 |

## Numbers

| Measure | Value |
|---|---|
| View, illustrated | front 174, ¾-left 168, ¾-right 113, profile 3, back 0 |
| View, costume | front 492, ¾-right 227, ¾-left 119, profile 16, top 8, back 5 |
| Pose, all Gnarls rows | stand 652, other 117, jump 113, sit 109, lie 84, dance 81, float 46, lean 40, ride 38, exercise 25, run 17, walk 13, primary 11, swim 6 |
| Six guide poses' share of illustrated | 330 / 479 = 69% (lounge 79, sparkle 70, cheer jump 69, proud grin 47, presenting 35, fired-up 30) |
| Expression | big smile 817, excited 160, smug 97, neutral smile 94, laugh 22, sad 15, sleepy 12, wink 10, surprised 10 |
| Glasses | on 1216, swapped 113, off 13 |
| Fins | holding 367, both up 124, one up 117, down 94, waving 38 |
| Outline, illustrated cut-outs (G5) | outlined 57 of 73 with alpha; width median 1.74% H (p10–p90 0.91–3.09%); labelled black_thick: 1.34% (0.90–1.78%) |
| Primary mark outline (G10) | 1.98% left, 2.12% right, 2.09% top, 1.66% bottom of H |
| Delivery sizes (G1) | 1300×780 292, 1080×1080 217, 1080×1920 88, 1080×1350 40, 1920×1080 39; 504 match no named format |
| Layout colour (G3) | saturation 0.35 (0.17–0.62), luma 136 (70–197); brand-red share 1.1% median (0–5.5%) |
| PSD construction (G8) | 3,304 type, 2,644 shape, 1,269 pixel, 353 smart-object layers; Gnarls arrives as smart objects (`gnarls jersey.psb` ×22, `NOBG-ActionPose1..7`, `gnarls4/7/8/10.png`) |

## Frame tables

**GIFs (G9).** Every frame decoded. All 4-frame GIFs are A-B-A-B toggles: frame 2 = frame 0, frame 3 = frame 1.

| GIF | Canvas | Frames × ms | What changes between A and B (measured) |
|---|---|---|---|
| Gnarls_Jumping (I0074 = I0711) | 840×1080 | 4 × 330 | centroid y 37.1% → 49.3% (drop 12.2% of canvas), width 81.7% → 92.0% (fins spread), tilt −75.8° → −72.3° |
| Gnarls_chilling (I0712) | 1080×691 | 4 × 330 | tail flick: tilt 16.9° → 26.4°, width 92.0% → 95.0% |
| Gnarls_wow (I0713) | 976×1080 | 4 × 330 | mouth dash ↔ O; height 100% → 98.7%; mean pixel change 3.0 |
| Gnarls_MaskUP (I0075) | 900×720 | 4 × 400 | mask on/off, "MASK UP" black ↔ red; pixel change 8.7–10.8 |
| Gnarls_Sparkle (I0076) | 1080×1420 | 32 × 30 | body still (pixel change ≤ 0.5); only the sparkles scale |
| GnarlsPainting_Gif (I1124) | 3600×2700 | 2 × 500 | brush stroke; height 86.9% → 86.6% |

**Primary mark construction (G10)**, ratios of H (figure 2829 px at 400 dpi): see `CONTEXT.md` §2. Tusk 47.7°; glasses span
0.525 H; near lens 0.150 H; far lens aspect 0.79; tee 0.398–0.694 H; shorts 0.677–0.765 H; fluke 0.765–1.000 H, span 0.404 H.

## What the readers saw (condensed from 8 reports)

- Illustrated Gnarls is almost never newly drawn. Designers reuse the guide's p.3 stickers, recolour the tee and paste on props
  or hats. A rig that hits about six poses plus swappable props covers most uses.
- The tusk sits top-centre and vertical in front views and top-right or top-left at 40–60° in ¾ views. It is one fixed tusk
  seen from different cameras (I0715 / I0717 / I0718 vs I0714, I0716).
- Fins are long flat paddles with a scalloped trailing edge, lighter underneath, coming out of the short sleeves (I0435, I1556).
- No legs: the jeans and overalls run as one tube into the fluke (I1322, I1590). The fluke lobes act as feet when needed (I1596).
- Hats let the tusk pierce through or sit beside it (I0144, I1596, I1298). Glasses get replaced by other eyewear rather than
  layered (I0534, I1609, I1626).
- Two-shots are one figure mirrored (I1364, I1404). Mirroring is common, and flipped costume photos make the N read backwards
  (I0620–I0623, I1190–I1193).
- Off-model patterns: crude repaints (I0936, I0944, I0956), photo capes on cel art (I1610–I1615), a brown outline (I1626), a moved
  tusk (I0656), AI images with garbled N and forehead tusks (I0958–I0960, I1343–I1345), and the multi-hand coloring book
  (I1458–I1495).
- Costume construction: bullet head deeper than wide, domed felt lenses with printed pupils standing off the face, stitched smile,
  ridged horn, mitten fins, two booted legs, separate tail flap (I0784, I0776, I0794, I1062 back).
- I1560 is a hand-drawn 12-beat dance storyboard: a ready-made animation test.

Rules and verdicts: `DECISIONS.md`.
