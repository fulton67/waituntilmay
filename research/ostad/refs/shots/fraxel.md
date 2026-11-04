# Fraxel Dual and Restore

**What it does:** Fractional laser columns heat microscopic zones of skin to rebuild collagen and lift pigment, leaving skin in between intact.  
**Anatomy:** epidermis, dermis, microthermal zones  
**Runtime:** 15 s across 4 shots · 3 overlay, 1 full-frame

OVERLAY = rendered with alpha (PNG sequence + WebM VP9 alpha), floats beside Dr Ostad on the filmed plate. FULL-FRAME = camera inside tissue or at cell scale; cut away from him for these.

| # | Frame | Scene | Visible layers | Camera | What animates | s | Label |
|---|---|---|---|---|---|---|---|
| 1 | **OVERLAY** | face.glb | epidermis | 3/4 orbit to the midface | Fraxel handpiece glides across the cheek leaving a faint grid | 3 | Fraxel |
| 2 | **OVERLAY** | skin_block.glb | all layers | 3/4, slow push-in | columns of light heat narrow zones down to the mid dermis; skin between stays intact | 5 | Non-ablative columns to the mid dermis |
| 3 | **FULL-FRAME** | dermis_macro | column wall, collagen | macro inside one column | the zone heals inward from the untouched skin around it; new collagen fills | 4 | Heals from the edges |
| 4 | **OVERLAY** | face.glb | epidermis | pull back | surface texture morphs: finer texture, faded pigment | 3 | Finer texture, faded pigment |

## Reference animation

- [Cynosure Lutronic Ultra - Thulium Fiber Fractional Laser (3D Animation) | TADApix AI Studio](https://www.youtube.com/watch?v=VZEWvPpB4Ng) — TADApix Ai Studio, soft-3D, 116 s. Best moment 0:46. Reuse: Take the shallow epidermal channel depth to contrast non-ablative 1927 with deeper ablative lasers.
- [Pixel Animation RX Skin Clinic](https://www.youtube.com/watch?v=7C8gcWwVnek) — RXSkin, soft-3D, 113 s. Best moment 1:21. Reuse: Take the red beamlet array and the dot-grid footprint: the core visual for fractional laser.

## His words (matched from the transcripts of his videos)

- “Both are non-ablative lasers that are used to treat pigmentation, pore size, fine lines and texture and tone.” — [yo_FCvdsR7fbmk](https://www.youtube.com/shorts/FCvdsR7fbmk)
- “It's really great for a younger individual who's just new to the lasers, has minimal pigmentation, is looking to do something throughout the summertime, and most importantly, Clear and Brilliant can be used on darker skin types.” — [yo_FCvdsR7fbmk](https://www.youtube.com/shorts/FCvdsR7fbmk)

## Assets

Have: face.glb, skin_block.glb

Missing: collagen_growth_fx, dermis_macro, laser_column_fx, laser_handpiece, skin_texture_morph, treatment_grid_fx
