# Cutera excel V (vascular laser)

**What it does:** Green and Nd:YAG wavelengths heat haemoglobin to close visible vessels and redness.  
**Anatomy:** dermal blood vessels, haemoglobin  
**Runtime:** 13 s across 4 shots · 3 overlay, 1 full-frame

OVERLAY = rendered with alpha (PNG sequence + WebM VP9 alpha), floats beside Dr Ostad on the filmed plate. FULL-FRAME = camera inside tissue or at cell scale; cut away from him for these.

| # | Frame | Scene | Visible layers | Camera | What animates | s | Label |
|---|---|---|---|---|---|---|---|
| 1 | **OVERLAY** | face.glb | epidermis | profile push in along the nasal dorsum | red vessels trace over the nose and cheeks | 3 | Visible vessels |
| 2 | **OVERLAY** | skin_block.glb | epidermis, dermis, vessels | 3/4 cutaway | a green 532 nm beam passes the epidermis and lights the vessel | 4 | Haemoglobin absorbs the light |
| 3 | **FULL-FRAME** | vessel_lumen | vessel wall, red cells | inside the vessel | the vessel heats, glows and collapses shut | 4 | Vessel closes |
| 4 | **OVERLAY** | face.glb | epidermis | pull back | redness fades | 2 | Redness gone |

## Reference animation

- [Endovenous Laser Ablation - Medical Animation](https://www.youtube.com/watch?v=9B6NIU-KKwE) — UThink Biomedical Animation, photoreal-3D, 66 s. Best moment 0:35. Reuse: Inside-the-vessel heat and coagulation look for vascular laser; delivery differs from excel V's surface laser.
- [Animation of Ablación Laser Endovenosa](https://www.youtube.com/watch?v=bTvsbVxv2Ro) — Goal Productions, soft-3D, 77 s. Best moment 0:56. Reuse: The valve-reflux inset panel and the x-ray glow vein reveal; ignore the clinic banner

## His words (matched from the transcripts of his videos)

- “I can treat a lot of vascular lesions, whether it be blood vessels, spider veins, broken capillaries, just diffuse redness of the face.” — [ti_7439457647939636511](https://www.tiktok.com/@drarielostad/video/7439457647939636511)
- “In terms of its efficiency in terms of treating what we call vascular lesions, whether these are blood vessels.” — [ti_7439457647939636511](https://www.tiktok.com/@drarielostad/video/7439457647939636511)

## Assets

Have: face.glb, skin_block.glb

Missing: laser_beam_fx, surface_vessels_decal, vessel_heat_fx, vessel_lumen
