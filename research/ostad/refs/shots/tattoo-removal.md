# Laser tattoo removal

**What it does:** Ultra-short pulses break tattoo ink into particles the immune system clears.  
**Anatomy:** dermis, macrophages, ink particles  
**Runtime:** 14 s across 4 shots · 2 overlay, 2 full-frame

OVERLAY = rendered with alpha (PNG sequence + WebM VP9 alpha), floats beside Dr Ostad on the filmed plate. FULL-FRAME = camera inside tissue or at cell scale; cut away from him for these.

| # | Frame | Scene | Visible layers | Camera | What animates | s | Label |
|---|---|---|---|---|---|---|---|
| 1 | **OVERLAY** | skin_block.glb | all layers | 3/4 | tattoo ink sits as clumps in the dermis | 3 | Ink in the dermis |
| 2 | **FULL-FRAME** | pigment_macro | ink clumps | macro slow-mo | ultra-short pulse: ink clumps fracture into fine particles | 4 | Ink fractured |
| 3 | **FULL-FRAME** | pigment_macro | particles, macrophages, lymph vessel | macro track | macrophages carry particles into a lymph vessel | 4 | Cleared by the immune system |
| 4 | **OVERLAY** | skin_block.glb | all layers | hold, session counter | ink fades over sessions 1 → 8 | 3 | Many sessions |

## Reference animation

- [PicoFractional - Mechanism of Action | Lumenis](https://www.youtube.com/watch?v=0iQYy2FRyP4) — Lumenis Aesthetics, soft-3D, 85 s. Best moment 0:44. Reuse: Shockwave rings and pigment particles shattering: the core picosecond photoacoustic visual for tattoo removal.
- [Laser tattoo removal technology - 3D animation](https://www.youtube.com/watch?v=CwchHbjfTn0) — Amerra Medical, mixed, 142 s. Best moment 1:34. Reuse: Side-by-side dermis cutaway of coloured ink spheres breaking into fine particles per wavelength.

## His words (matched from the transcripts of his videos)

No spoken sentence matched (these clips are music over footage), so his captions instead:
- caption: “The PicoWay laser is an advanced laser that uses ultra-short picosecond (a trillionth of a second) pulses to treat an array of skin issues. The PicoWay laser uses a “photoacoustic” effect that avoids heating the skin rat…” — [yo_QIrF4sijt-k](https://www.youtube.com/shorts/QIrF4sijt-k)
- caption: “Part 2: Revitalize your skin for Spring and Summer with laser treatments! In this series, we will highlight the best treatments to rejuvenate your skin so that you can look your best for all the exciting things you have …” — [yo_s1FYqIy7n3Y](https://www.youtube.com/shorts/s1FYqIy7n3Y)

## Assets

Have: lymph_vessel_valve (NIH 3D, downloaded), skin_block.glb

Missing: ink_particles, macrophage_cell, pigment_macro, pulse_flash_fx, shatter_fx, timelapse_counter
