# Jeuveau

**What it does:** A botulinum toxin type A made with Hi-Pure purification, used for frown lines between the brows.  
**Anatomy:** corrugator, procerus, neuromuscular junction  
**Runtime:** 17 s across 4 shots · 3 overlay, 1 full-frame

OVERLAY = rendered with alpha (PNG sequence + WebM VP9 alpha), floats beside Dr Ostad on the filmed plate. FULL-FRAME = camera inside tissue or at cell scale; cut away from him for these.

| # | Frame | Scene | Visible layers | Camera | What animates | s | Label |
|---|---|---|---|---|---|---|---|
| 1 | **OVERLAY** | face.glb | epidermis | 3/4 left orbit, push in to the glabella | injection map fills point by point: 5 points across the glabella | 4 | Injection points |
| 2 | **OVERLAY** | face.glb | epidermis at 20% + muscle | hold, skin fades | skin fades; corrugators and procerus highlight and contract, creasing the skin above | 4 | Corrugators and procerus |
| 3 | **FULL-FRAME** | nmj_closeup | nerve terminal, synapse, muscle fibre | macro push-in to the synapse | acetylcholine vesicles stream across the gap; toxin arrives, cuts the SNARE protein, vesicles stop (signal-cut) | 5 | Signal blocked at the nerve ending |
| 4 | **OVERLAY** | face.glb | epidermis + muscle | pull back to the start framing | contraction amplitude falls to zero; the 11 lines soften | 4 | Relaxed for ~3–4 months |

## Reference animation

- [Botulinum Neurotoxin: Mechanism of Action](https://www.youtube.com/watch?v=bFUeaCsTems) — CLIMB Training, photoreal-3D, 567 s. Best moment 5:38. Reuse: high-end red-muscle/green-nerve palette and HUD framing for a premium toxin explainer
- [Dysport: How it works](https://www.youtube.com/watch?v=CduvKqhYQAw) — Skinly Aesthetics, soft-3D, 193 s. Best moment 2:20. Reuse: pastel neuromuscular-junction look and the SNARE-cleavage beat for toxin mechanism

## His words (matched from the transcripts of his videos)

- “When she frowns, we can see the activity of the muscles that are responsible for creating these lines, primarily what we call the corrugator muscles located on either side and the procerus muscle centrally.” — [yo_3zcokqzZ2jk](https://www.youtube.com/shorts/3zcokqzZ2jk)
- “Juvo temporarily improves the look of moderate to severe frown lines between the eyebrows and adults.” — [yo_3zcokqzZ2jk](https://www.youtube.com/shorts/3zcokqzZ2jk)
- “So communicating to the patient how those lines are formed and how basically Juvo works and how it gives you the intended results.” — [in_DalW61oD-se](https://www.instagram.com/p/DalW61oD-se/)

## Assets

Have: face.glb

Missing: injection_point_map, muscle_contraction_rig, nmj_closeup, product_vial_card, signal_cut_fx, wrinkle_blendshapes
