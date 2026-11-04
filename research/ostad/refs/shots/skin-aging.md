# Skin aging and collagen loss

**What it does:** With age the face loses collagen, fat and bone, so the skin deflates and sags.  
**Anatomy:** collagen, facial fat compartments, facial skeleton  
**Runtime:** 16 s across 4 shots · 4 overlay, 0 full-frame

OVERLAY = rendered with alpha (PNG sequence + WebM VP9 alpha), floats beside Dr Ostad on the filmed plate. FULL-FRAME = camera inside tissue or at cell scale; cut away from him for these.

| # | Frame | Scene | Visible layers | Camera | What animates | s | Label |
|---|---|---|---|---|---|---|---|
| 1 | **OVERLAY** | face.glb | all layers | slow 3/4 orbit of the whole face | age slider 30 → 70: skin thins, fat compartments deflate and slide, bone recedes | 6 | Age 30 → 70 |
| 2 | **OVERLAY** | face.glb | fat_superficial + fat_deep | 3/4 hold | fat compartments shrink one by one and drop | 4 | Fat deflates |
| 3 | **OVERLAY** | skin_block.glb | dermis | 3/4 | collagen fibres thin and fragment | 3 | Collagen fades |
| 4 | **OVERLAY** | skull_model | bone | profile | the orbit widens and the jaw recedes | 3 | Bone recedes |

## Reference animation

- [Neolastin Anti-Aging Skincare with Nuflex technology - 3D animation](https://www.youtube.com/watch?v=USqSKjg-WgQ) — Amerra Medical, soft-3D, 101 s. Best moment 0:20. Reuse: Colour-coded collagen vs elastin highlight technique in a lateral section.
- [Face Aging 3d medical animation sample use only](https://www.youtube.com/watch?v=xEzgj-zcrpo) — Dandelion Medical Animation, soft-3D, 89 s. Best moment 0:59. Reuse: Progressive face-aging morph tied to cell-level shots.

## His words (matched from the transcripts of his videos)

- “I can use it for facial rejuvenation, such as just improving brown spots, red spots, and just stimulating collagen.” — [ti_7439457647939636511](https://www.tiktok.com/@drarielostad/video/7439457647939636511)
- “And by loss of collagen in that area, you get some small little what we call herniations which is protrusions of the bulges forward.” — [ti_7438709969106554143](https://www.tiktok.com/@drarielostad/video/7438709969106554143)
- “Uh, these are lines that are yet generally due to over expression with raising the eyebrows, that over time just leads to collagen loss and collagen depletion.” — [ti_7296928587473636651](https://www.tiktok.com/@drarielostad/video/7296928587473636651)

## Assets

Have: face.glb, skin_block.glb, skull_and_eyes (NIH 3D, downloaded)

Missing: aging_morph, collagen_growth_fx
