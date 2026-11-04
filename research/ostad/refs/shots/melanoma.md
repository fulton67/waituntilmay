# Melanoma

**What it does:** Cancer of pigment cells; its depth decides the stage and the treatment.  
**Anatomy:** melanocytes, epidermis, dermis, lymph nodes  
**Runtime:** 12 s across 3 shots · 3 overlay, 0 full-frame

OVERLAY = rendered with alpha (PNG sequence + WebM VP9 alpha), floats beside Dr Ostad on the filmed plate. FULL-FRAME = camera inside tissue or at cell scale; cut away from him for these.

| # | Frame | Scene | Visible layers | Camera | What animates | s | Label |
|---|---|---|---|---|---|---|---|
| 1 | **OVERLAY** | skin_block.glb | epidermis, melanocytes, dermis | 3/4 | one melanocyte turns dark and multiplies along the basal layer | 4 | Pigment cells turn |
| 2 | **OVERLAY** | skin_block.glb | all layers | cutaway, depth ruler | cells push down into the dermis; a depth ruler reads 0.8 mm, 1 mm, 2 mm | 5 | Depth = stage (Breslow) |
| 3 | **OVERLAY** | skin_block.glb | all layers + vessels | hold | deep cells reach a lymph vessel | 3 | Deeper means it can spread |

## Reference animation

- [Melanoma | MOD Animation](https://www.youtube.com/watch?v=PIcisc8fCyA) — XVIVO Scientific Animation, photoreal-3D, 189 s. Best moment 0:50. Reuse: Melanosome transfer along dendrites (0:50) and the warm skin cross-section block as a pigment-biology look.
- [Melanoma Animation - Medical Malpractice Animation](https://www.youtube.com/watch?v=Q38KgXvkftA) — High Impact, soft-3D, 386 s. Best moment 2:08. Reuse: Skin-layer block with depth levels and cancer cells travelling in a cutaway vessel (2:08) for staging/spread visuals.

## His words (matched from the transcripts of his videos)

- “However, it is a vaccine that's used in advanced melanoma cases in cases where there is an increased risk of melanoma either recurring or spreading potentially later on to other organs or lymph nodes.” — [in_DcbazZHio4C](https://www.instagram.com/p/DcbazZHio4C/)
- “I wanted to just spend a couple of minutes about yesterday's results in the news, about how there is a melanoma vaccine that is now available.” — [in_DcbazZHio4C](https://www.instagram.com/p/DcbazZHio4C/)

## Assets

Have: lymph_vessel_valve (NIH 3D, downloaded), skin_block.glb

Missing: depth_marker, pigment_cluster
