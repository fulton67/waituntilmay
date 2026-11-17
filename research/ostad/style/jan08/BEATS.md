# Jan 08 filler fatigue: beat sheet (reel v1)

Source: `IMG_2421.MOV` (catalog id 163, filmed 2026-01-08 1:26 PM). Argument map: `ARGUMENT.md`. Cut: `cut.json` (edge gaps: `cut_gaps.json`). Code: `brand/remotion/src/jan08/`.

## The 3 weakest things about the previous reels (CRITIQUE_v2) and the fix here

1. **Hairline rings on random spots.** The only rings and pen lines here sit on MediaPipe landmarks of a real patient photo (B11, B13). Diagrams carry no rings.
2. **No topic-only animation.** There are three, built first: SkinBelief, VolumeLoss and CheekPlacement, plus two contrast states, LipMigration and PillowVsLift. All are traced from the 3D models.
3. **Dead stretches and text by default.** The picture changes at least every 4 s (see `pacing.json`), and there is one text beat (B03) out of 13.

## Beats

| Beat | Time | He says | What's shown | Devices | Asset and source (or search log) | Ostad check |
|---|---|---|---|---|---|---|
| B01 | 0.0–3.2 s | I don't really believe in filler fatigue, | the claim: 'Filler fatigue', struck through on 'fatigue' | type-strike-replace | IMG_2421.MOV 163.31-165.21 s (catalog id 163) |  |
| B02 | 3.2–14.0 s | where patients feel that a lot of filler can ... skin stretch, ... overfilled, or the fillers can migrate. | the belief, drawn: gel in the fat layer bulges the skin (stretch), sits as a lump (overfilled), beads drift away (migrates) | topic-glass-panel | skin_crosssection.glb section view, traced (anatomy_measure.json: all_pass); RVM key of IMG_2421 16.15-28.23 s (video_matte.py --refine) · searched: catalog filler + cheek + before-after / result rows for an overfilled or migrated example (needs_review = 0): none of his own patients shows one, and his patients are never shown as a bad result; bank/filler-volume-loss, bank/ozempic-face: no overfill example. Drawn from the traced model instead. | pending |
| B03 | 14.0–22.0 s | I find either happens from improper injections, from people who are not trained..., from doing too much filling. | the three causes, each lit on his word | checklist-ledger | IMG_2421.MOV 46.05-54.14 s · searched: catalog for footage of an improper / untrained injection (none, and none would be shown); the one text beat of the reel |  |
| B04 | 22.1–34.4 s | the underlying physiology of aging is that we lose volume ... fatty tissue ... the support structure for our facial skin. | aging in profile: the cheek and jowl fat shrink on 'volume', the fat lights on 'fatty', the bone lights on 'support', the lower face drops (dashed: where it was) | anatomy-trace-card, region-light-on-model | face.glb profile view (Z-Anatomy bone; fat compartments are the model's approximation), traced; RVM key of IMG_2421 64.44-77.24 s | pending |
| B05 | 34.5–37.8 s | That happens from aging. And when you lose that support structure, the skin sags. | a real example of volume loss: a mid-cheek / under-eye hollow (journal photo, panel A only) | std-clip-card | research/ostad/style/bank/filler-volume-loss/pmc_PMC12828540_fig_7.jpg panel A; Hong GW et al., JPRAS Open 2026, CC BY 4.0; bank use = on-air · GLOSSARY 'Deflation' -> bank example; catalog filler before photos are his patients' befores (kept for B11/B13) |  |
| B06 | 37.9–46.0 s | And I have my own sort of methodology that I find really gives us incredible results | his own cheekbone cannula session (two moments), his name | name-super | IMG_3453.MOV (catalog id 6990, 2022-08-31, cannula into the cheekbone from a lateral entry) 14 s and 27 s; clinic-library catalog.sqlite (read-only), pulled with scripts/pull_direct.py --out=tmp/jan08/pull |  |
| B07 | 46.0–48.3 s | utilizing micro-cannulas. And really, it's | the microcannula on the cheekbone (his own clip) in the STANDARD ClipCard | std-clip-card | IMG_3470.MOV (catalog id 6973, 2022-08-31, lateral cheekbone HA by cannula, no label readable) from 13 s; clinic-library catalog.sqlite (read-only), pulled with scripts/pull_direct.py --out=tmp/jan08/pull | pending (depth line 'On the cheekbone') |
| B08 | 48.4–57.5 s | injecting fillers on the cheekbones and that causes a lot of lifting because the ligaments ... diminish over time | his method: one entry, the cannula route along the traced cheekbone, gel on the bone, the cheek lifts; without support it falls (dashed) | anatomy-trace-card, arrow-route-trace, arrow-straight-pointer | face.glb midface view (-30 deg), traced | pending (deposit points and route are illustrative; ligaments are not in the model and are not drawn) |
| B09 | 57.6–61.2 s | the skin falls. I find fillers work really great. | his hands at the cheekbone, full frame |  | IMG_3470.MOV from 18 s (catalog id 6973) |  |
| B10 | 61.2–67.4 s | I don't see them migrate unless you're really using the wrong filler. It may migrate in a lip that too much is injected. | migration: gel on the cheekbone stays; too much in the lip spreads past its border | topic-glass-panel | face.glb midface view: zygoma + orbicularis oris, traced · searched: catalog filler + cheek + before-after / result rows for an overfilled or migrated example (needs_review = 0): none of his own patients shows one, and his patients are never shown as a bad result; bank/filler-volume-loss, bank/ozempic-face: no overfill example. Drawn from the traced model instead. | pending |
| B11 | 67.5–78.0 s | I have my approach of basically injecting the cheekbones, maybe minimal amounts in the laugh line, marionette lines, a little bit on the lower lids | his plan on a real face: white pen on her landmarks (cheekbones heavy; laugh lines, marionette lines, lower lids thin), each on its word | arrow-hand-drawn, std-skin-window | IMG_2316.HEIC (catalog id 7681, P0007, 2022-07-08 standardised frontal, before the session; consent yes); MediaPipe landmarks (jan08_ba.py); clinic-library catalog.sqlite (read-only), pulled with scripts/pull_direct.py --out=tmp/jan08/pull | pending (placement lines) |
| B12 | 78.0–81.8 s | but I am not really a fan of creating golf size, you know, filling in the mid-cheek, that looks awkward. | the contrast: a golf-size lump grows in the mid cheek of the traced profile and is crossed out | type-strike-replace, region-light-on-model | face.glb profile view, traced · searched: catalog filler + cheek + before-after / result rows for an overfilled or migrated example (needs_review = 0): none of his own patients shows one, and his patients are never shown as a bad result; bank/filler-volume-loss, bank/ozempic-face: no overfill example. Drawn from the traced model instead. | pending |
| B13 | 81.9–87.4 s | So I just want to address this issue of filler fatigue. I really think fillers are here to stay. | the result: her before -> after (registered on stable landmarks), the white ring on her cheekbone | std-skin-window | IMG_2316.HEIC / IMG_2335.HEIC (catalog ids 7681 / 7662, P0007, 2022-07-08 before and right after; registered, jan08_ba.py); clinic-library catalog.sqlite (read-only), pulled with scripts/pull_direct.py --out=tmp/jan08/pull · searched for a weeks-apart filler B/A without on-image text or brand names (catalog filler before-after, needs_review = 0): the P0011 / P0013 triptychs carry slide text and product names; P0007 is clean and standardised |  |

## Topic-only animations

- **SkinBelief** (B02): the belief, drawn. Gel in the traced fat layer of `skin_crosssection.glb` bulges the dermis and epidermis on "stretch", sits as a lump on "overfilled", and beads drift away on "migrate". The labels end in "?".
- **VolumeLoss** (B04): the `face.glb` profile. Cheek and jowl fat shrink to 70 % on "volume". The fat lights on "fatty", and the bone lights on "support". The lower skin outline drops 22 render px, with the original left dashed.
- **CheekPlacement** (B08): the `face.glb` midface. One lateral entry, then a route-trace along the traced zygoma and three gel deposits on it. The cheek lifts on "lifting" (three straight pointers), and a dashed fallen outline shows on "diminish".
- Contrast states: **LipMigration** (B10: on the cheekbone it stays; too much in the lip spreads past the traced orbicularis oris) and **PillowVsLift** (B12: a golf-size lump in the mid cheek, crossed out).

Anatomy outline difference (drawn path vs the model render, 1024 px): see `anatomy_measure.json`. Bone mean 0.04–0.06 px, max 1.0 px. Fat (the model's approximation) max 1.4 px. Skin profile max 3.0 px. All pass. Every clinical drawing is `ostad_check: pending`.

## Before/after

P0007, 2022-07-08, standardised frontal before and right-after photos (catalog 7681/7662), registered on stable landmarks (median residual 9.3 px at 3024 px).
Measured (`ba_measure.json`): the landmark widths all shift by the same −2.6 to −3.0 %, which is pose or scale, not volume, and the submalar shadow changes are within lighting noise. **No change is measurable on these photos**, so the window shows the pair with the STANDARD white ring on the cheekbone landmark and no change arrow or number (LESSONS L4).

## Checks on the render (`verify.json`)

- Pacing, measured on pixels (a change = mean grey difference >= 6 over 6 f): longest stretch 6.08 s. Stretches over 4 s: [(6.9, 11.7), (16.0, 22.1)]. Both have designed changes the metric reads as too small: a line draw at 9.3 s ("stretch") and the causes rows lighting at 18.8 s and 21.4 s. They are logged as exceptions.
- First third vs last third: 4.8 vs 6.17 changes per 10 s; median interval 1.96 vs 1.04 s. The last third is tighter.
- Hook: his line starts at 0.08 s, full frame, with the title on screen from frame 2.
- Flash scan (scdet 8): 19 cuts at [3.29, 6.58, 14.0, 22.12, 25.42, 34.46, 41.21, 43.58, 46.04, 48.38, 57.58, 61.25, 61.29, 64.58, 67.46, 78.0, 81.88, 87.46, 87.5]. Each one is a planned cut: a section card, a takeover, a plate or a window.
- Keyed edges: belief 0 and aging 0 straight-edge frames (140 px feather).
- Loudness: -14.3 LUFS, true peak -1.3 dBTP.
- Arrows over text: arrow_text_lint: PASS.
- Audio cuts: minimum gap 0.08 s, 15 ms crossfade. One exception: the belief start sits in a 100 ms breath pause measured at floor + 9 dB.
- Fillers or stutters in the final audio (local re-transcription): 0, and 0 in the first 10 s. "You know" at 77 s is kept, inside his "golf size, you know, filling" line.
