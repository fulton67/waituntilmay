# Mohs micrographic surgery

**What it does:** Removes a skin cancer layer by layer, checking 100% of each margin under the microscope until it is clear.  
**Anatomy:** epidermis, dermis, tumour roots, surgical margins  
**Runtime:** 19 s across 5 shots · 4 overlay, 1 full-frame

OVERLAY = rendered with alpha (PNG sequence + WebM VP9 alpha), floats beside Dr Ostad on the filmed plate. FULL-FRAME = camera inside tissue or at cell scale; cut away from him for these.

| # | Frame | Scene | Visible layers | Camera | What animates | s | Label |
|---|---|---|---|---|---|---|---|
| 1 | **OVERLAY** | face.glb | epidermis | profile push in along the nasal dorsum | a tumour shows on the nose; its visible edge is outlined | 3 | Visible tumour |
| 2 | **OVERLAY** | skin_block.glb | all layers + tumour roots | cutaway | tumour roots spread beyond the visible edge in the dermis | 4 | Roots you can't see |
| 3 | **OVERLAY** | skin_block.glb | all layers + tumour roots | 3/4 hold | stage 1: a thin bowl-shaped layer is removed; its edge is mapped in colours | 4 | Layer 1 removed and mapped |
| 4 | **FULL-FRAME** | lab_slide | frozen section | microscope view | 100% of the margin is checked; one colour zone still has tumour | 4 | 100% of the margin checked |
| 5 | **OVERLAY** | skin_block.glb | all layers | hold | stage 2 removes only that zone; the margin is clear | 4 | Clear margins, tissue saved |

## Reference animation

- none found (see MOTION_GAPS.md); build from the shot list alone

## His words (matched from the transcripts of his videos)

- “And I do a lot of most micrographic surgery, which is the preferred method of treatment for skin cancer in difficult areas such as the eyelids, ears, nose, face.” — [ti_7439457647939636511](https://www.tiktok.com/@drarielostad/video/7439457647939636511)

## Assets

Have: face.glb, skin_block.glb

Missing: excision_layer_rig, lab_slide, margin_map, tumour_decal, tumour_roots
