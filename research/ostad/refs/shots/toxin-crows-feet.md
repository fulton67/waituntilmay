# Crow's feet toxin

**What it does:** Toxin in the outer orbicularis oculi relaxes the squint lines at the corners of the eyes.  
**Anatomy:** orbicularis oculi, lateral canthus  
**Runtime:** 17 s across 4 shots · 3 overlay, 1 full-frame

OVERLAY = rendered with alpha (PNG sequence + WebM VP9 alpha), floats beside Dr Ostad on the filmed plate. FULL-FRAME = camera inside tissue or at cell scale; cut away from him for these.

| # | Frame | Scene | Visible layers | Camera | What animates | s | Label |
|---|---|---|---|---|---|---|---|
| 1 | **OVERLAY** | face.glb | epidermis | 3/4 orbit to the lateral canthus | injection map fills point by point: 3 points fanning out at each lateral canthus | 4 | Injection points |
| 2 | **OVERLAY** | face.glb | epidermis at 20% + muscle | hold, skin fades | skin fades; lateral orbicularis oculi highlight and contract, creasing the skin above | 4 | Lateral orbicularis oculi |
| 3 | **FULL-FRAME** | nmj_closeup | nerve terminal, synapse, muscle fibre | macro push-in to the synapse | acetylcholine vesicles stream across the gap; toxin arrives, cuts the SNARE protein, vesicles stop (signal-cut) | 5 | Signal blocked at the nerve ending |
| 4 | **OVERLAY** | face.glb | epidermis + muscle | pull back to the start framing | contraction amplitude falls to zero; squint lines fade at the eye corners | 4 | Relaxed for ~3–4 months |

## Reference animation

- [BOTOX® Mechanism of Action Video](https://www.youtube.com/watch?v=dkpohXE06pg) — Captain VR, photoreal-3D, 354 s. Best moment 2:20. Reuse: High-gloss molecular close-ups of SNARE fusion and cleavage; skip the long safety text tail.
- [BOTOX Mechanism of Action](https://www.youtube.com/watch?v=9phEvqay3Nc) — Enrico Licciardi, soft-3D, 128 s. Best moment 0:50. Reuse: Full mechanism arc including the recovery/sprouting phase, which most toxin films skip.

## His words (matched from the transcripts of his videos)

- “Obviously the most common things we perform is utilizing Botox and fillers to address dynamic lines, wrinkles on the forehead, crow's feet.” — [in_DYDKhFCRykx](https://www.instagram.com/p/DYDKhFCRykx/)
- “So we're taking hyaluronic acid injectables as a form of an injection and filling increases whether it be laugh lines, marionette lines.” — [yo_Gt_Ogifh5_A](https://www.youtube.com/shorts/Gt_Ogifh5_A)
- “Put a little bit of Botox into them, which relaxes those lines and therefore just smooths out the neck.” — [yo_ppGlX6Ux9AY](https://www.youtube.com/shorts/ppGlX6Ux9AY)

## Assets

Have: face.glb

Missing: injection_point_map, muscle_contraction_rig, nmj_closeup, signal_cut_fx, wrinkle_blendshapes
