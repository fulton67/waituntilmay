# Morpheus8

**What it does:** Gold-coated microneedles deliver radiofrequency heat deep in the skin and fat to tighten and remodel.  
**Anatomy:** dermis, subdermal fat, fibroseptal network  
**Runtime:** 15 s across 4 shots · 3 overlay, 1 full-frame

OVERLAY = rendered with alpha (PNG sequence + WebM VP9 alpha), floats beside Dr Ostad on the filmed plate. FULL-FRAME = camera inside tissue or at cell scale; cut away from him for these.

| # | Frame | Scene | Visible layers | Camera | What animates | s | Label |
|---|---|---|---|---|---|---|---|
| 1 | **OVERLAY** | face.glb | epidermis | 3/4 orbit of the lower face and jowl | Morpheus8 tip stamps along the jawline | 3 | Morpheus8 |
| 2 | **OVERLAY** | skin_block.glb | all layers | 3/4 cutaway | needle array pierces to 1–8 mm (dermis into fat); RF glow blooms at each tip as orange coagulation zones | 5 | RF heat at 1–8 mm (dermis into fat) |
| 3 | **FULL-FRAME** | dermis_macro | collagen, fibroseptal bands | macro hold | heated collagen contracts; fibroseptal bands tighten, then new collagen grows | 4 | Contract, then rebuild |
| 4 | **OVERLAY** | face.glb | epidermis | pull back, orbit | surface morph: tighter jawline, smoother skin | 3 | Tighter jawline, smoother skin |

## Reference animation

- [Morpheus8 Burst and Burst Deep Animation](https://www.youtube.com/watch?v=SPJPb-sBWKk) — InMode International, soft-3D, 128 s. Best moment 0:50. Reuse: Split-screen comparison (0:50) and the deep flame-burst array (1:32) for multi-depth RF.
- [Morpheus8 Body Burst Animation](https://www.youtube.com/watch?v=-9Pxa0tS-LY) — InMode International, soft-3D, 60 s. Best moment 0:12. Reuse: Stacked multi-depth RF beads with mm callouts (0:12); good for showing depth modes.

## His words (matched from the transcripts of his videos)

No spoken sentence matched (these clips are music over footage), so his captions instead:
- caption: “Festoons, also known as malar mounds, are swollen bags that appear beneath the lower eyelid and around the cheek. They are normally caused by sun exposure, smoking, aging, and genetics. It is more common in fair-skinned …” — [yo_9Q9dSwE_X3c](https://www.youtube.com/shorts/9Q9dSwE_X3c)
- caption: “Morpheus 8 is an incredibly effective microneedling treatment, in which the needles emit radiofrequency energy into the skin layers, causing the skin to heat and tighten. This added heat promotes the production of collag…” — [yo_SlCftWUovio](https://www.youtube.com/shorts/SlCftWUovio)

## Assets

Have: face.glb, skin_block.glb

Missing: coagulation_zone_fx, collagen_growth_fx, dermis_macro, needle_array_tip, rf_glow_fx, septae_contract_fx, skin_texture_morph, surface_volume_morph
