# Lower face toxin: mouth corners and chin (DAO, mentalis)

**What it does:** Toxin in the depressor anguli oris lets the corners of the mouth lift instead of pulling down.  
**Anatomy:** depressor anguli oris, depressor labii inferioris, modiolus, mentalis  
**Runtime:** 17 s across 4 shots · 3 overlay, 1 full-frame

OVERLAY = rendered with alpha (PNG sequence + WebM VP9 alpha), floats beside Dr Ostad on the filmed plate. FULL-FRAME = camera inside tissue or at cell scale; cut away from him for these.

| # | Frame | Scene | Visible layers | Camera | What animates | s | Label |
|---|---|---|---|---|---|---|---|
| 1 | **OVERLAY** | face.glb | epidermis | 3/4 low angle on the mouth corners | injection map fills point by point: 1–2 points low on each DAO, lateral to the mentalis | 4 | Injection points |
| 2 | **OVERLAY** | face.glb | epidermis at 20% + muscle | hold, skin fades | skin fades; depressor anguli oris highlight and contract, creasing the skin above | 4 | Depressor anguli oris |
| 3 | **FULL-FRAME** | nmj_closeup | nerve terminal, synapse, muscle fibre | macro push-in to the synapse | acetylcholine vesicles stream across the gap; toxin arrives, cuts the SNARE protein, vesicles stop (signal-cut) | 5 | Signal blocked at the nerve ending |
| 4 | **OVERLAY** | face.glb | epidermis + muscle | pull back to the start framing | contraction amplitude falls to zero; mouth corners stop pulling down and rest level | 4 | Relaxed for ~3–4 months |

## Reference animation

- [Vistabel Animation](https://www.youtube.com/watch?v=_khNkhROBQc) — Iiro Suominen, photoreal-3D, 180 s. Best moment 2:10. Reuse: Benchmark pharma MOA film: magenta palette, synapse cutaway and SNAP-25 cleavage.
- [BOTOX® 3D Video - Dr Landsman](https://www.youtube.com/watch?v=DVQUoaY9HMM) — Lloyd D Landsman MD, soft-3D, 309 s. Best moment 2:44. Reuse: Face-to-synapse cut and back: muscle glow, NMJ block, then relaxed expression.

## His words (matched from the transcripts of his videos)

- “We have the strong mentalis muscle, which is responsible for basically chewing and talking.” — [yo_ppGlX6Ux9AY](https://www.youtube.com/shorts/ppGlX6Ux9AY)
- “We obviously can perform Botox in other areas such as the chin, basically for lifting the corners of the mouth and improving the jawline with adding some Botox here which really tightens it.” — [in_DYDKhFCRykx](https://www.instagram.com/p/DYDKhFCRykx/)
- “Here we're looking at the mentalist muscle.” — [yo_c_FMAbuYPYs](https://www.youtube.com/shorts/c_FMAbuYPYs)

## Assets

Have: face.glb

Missing: injection_point_map, muscle_contraction_rig, nmj_closeup, signal_cut_fx, wrinkle_blendshapes
