# Neurotoxins (Botox, Dysport, Xeomin, Daxxify)

**What it does:** Blocks the nerve signal (acetylcholine release) to a muscle so it relaxes and the line it creases softens.  
**Anatomy:** neuromuscular junction, facial expression muscles  
**Runtime:** 17 s across 4 shots · 3 overlay, 1 full-frame

OVERLAY = rendered with alpha (PNG sequence + WebM VP9 alpha), floats beside Dr Ostad on the filmed plate. FULL-FRAME = camera inside tissue or at cell scale; cut away from him for these.

| # | Frame | Scene | Visible layers | Camera | What animates | s | Label |
|---|---|---|---|---|---|---|---|
| 1 | **OVERLAY** | face.glb | epidermis | 3/4 left orbit, push in to the glabella | injection map fills point by point: glabella 5, forehead 4–6, crow's feet 3 per side | 4 | Injection points |
| 2 | **OVERLAY** | face.glb | epidermis at 20% + muscle | hold, skin fades | skin fades; corrugators, procerus and frontalis highlight and contract, creasing the skin above | 4 | Corrugators, procerus and frontalis |
| 3 | **FULL-FRAME** | nmj_closeup | nerve terminal, synapse, muscle fibre | macro push-in to the synapse | acetylcholine vesicles stream across the gap; toxin arrives, cuts the SNARE protein, vesicles stop (signal-cut) | 5 | Signal blocked at the nerve ending |
| 4 | **OVERLAY** | face.glb | epidermis + muscle | pull back to the start framing | contraction amplitude falls to zero; frown and forehead lines soften | 4 | Relaxed for ~3–4 months |

## Reference animation

- [US WorldMeds - Mechanism of Action](https://www.youtube.com/watch?v=R-A8YI7Ik4g) — Amerra Medical, photoreal-3D, 229 s. Best moment 2:16. Reuse: the glass-like nerve terminal look, labelled SNARE ribbons and the recovery-sprouting beat
- [Mechanism of Botulinum Toxin](https://www.youtube.com/watch?v=6n3rrjbweO8) — Proteinlounge, soft-3D, 226 s. Best moment 2:44. Reuse: the push-in from muscle fiber to nerve terminal to receptor binding; skip the dated texture work

## His words (matched from the transcripts of his videos)

- “So what Juvo as a neuromodulator does is that it blocks the signal from the nerve to the muscle and basically blocks the action of a neurotransmitter called acetylcholine which is a signal that the nerve produces to have a muscle relax.” — [yo_Gt_Ogifh5_A](https://www.youtube.com/shorts/Gt_Ogifh5_A)
- “Juvo is the botulinum toxin type A injectable, indicated for the temporary improvement in the appearance of moderate to severe glabella lines in adults.” — [yo_3zcokqzZ2jk](https://www.youtube.com/shorts/3zcokqzZ2jk)
- “Put a little bit of Botox into them, which relaxes those lines and therefore just smooths out the neck.” — [yo_ppGlX6Ux9AY](https://www.youtube.com/shorts/ppGlX6Ux9AY)

## Assets

Have: face.glb

Missing: injection_point_map, muscle_contraction_rig, nmj_closeup, signal_cut_fx, wrinkle_blendshapes
