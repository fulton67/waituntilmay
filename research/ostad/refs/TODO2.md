# OSTAD REFS pass 2 — motion and 3D — TODO
Spec: `refs/SPEC2.md`. Starts after pass 1 (`refs/TODO.md`) is finished. Resume from the first unchecked item.

## Phase 1 — animations → motion.json
- [x] video search plan (yt-dlp ytsearch, 507 queries; Vimeo/studios/HCP pages not run, see DECISIONS 16)
- [x] candidate pool, filtered to animated/3D explanations (475 shortlisted, 5 per procedure)
- [x] full downloads (720p), frames across the whole duration, beats written by eye (16-frame overviews, DECISIONS 15)
- [x] motion.json + gaps: 245 kept of 428, 85/97 procedures, MOTION_GAPS.md; Motion + His videos views on /ostad/refs
## Picking (added 2026-11-03)
- [x] Gold toggle on every image and animation, note per pick, "N gold", gold-only filter, Export picks (gold_picks.json), Export zip (JSZip, originals via /api/ostad-refimg)
## Phase 2 — models → models.json
- [x] structure list from procedures.json anatomy (30 structures)
- [x] Z-Anatomy, BodyParts3D, NIH 3D, Sketchfab CC; priced list (Zygote store, TurboSquid, CGTrader): 155 options, 33 downloaded, 67 priced; every structure has a downloadable or priced option (3d/models.json, 3d/MODELS.md)
- [x] headless Blender turntable per model, quality score: 13 clay turntables (renders/survey/*.jpg), q 2–4; best: NIH eye 4, VHM skull 4, Z-Anatomy head 4. No free SMAS/fat compartments (paid: 3dmi $169); Zygote priced only ($690 integument)
## Phase 3 — base scene
- [x] face.blend + skin_crosssection.blend, materials, rig, GLB + layers.json, renders, size check: face.glb 8.59 MB/146 nodes, skin 1.44 MB/95 nodes, both load in Node with every manifest node; transparent turntable + cutaway sequences (PNG/WebM-alpha/MP4) for each, check_alpha PASS
## Phase 4 — shots
- [x] shots/{id}.md × 97, BUILD_LIST.md: 320 shots (270 overlay / 50 full-frame), reference animation in 85, his spoken words in 52 + captions in 28, 136 missing assets ranked (top: surface_volume_morph 33, dermis_macro 17, needle_syringe 17)
## Phase 5 — /ostad/anatomy
- [x] R3F page, five presets, Refs Motion section + mentioned_in, verify, push: /ostad/anatomy (face 146/146, skin 95/95 nodes), Botox glabella / filler cheek / Morpheus8 / Fraxel / Mohs all switch and animate, pause + scrub, layer toggles, cutaway, background transparent/black/white, PNG export with alpha (76% clear pixels, corner alpha 0; black/white opaque), 0 console errors (verify_anatomy.mjs)
## Finish
- [x] summary (below)

## Pass 2 summary (2026-11-03)

**Animations per procedure:** 245 kept of 428 judged. Per procedure: min 0, median 2, max 5. 85 of 97 procedures have at least one. The 12 gaps are toxin-neck, evolysse, alloclae, prfm, co2-laser, mohs, skin-check, cellulite, niacinamide, diamondglow, hydrafacial and led-light (MOTION_GAPS.md). Shown on /ostad/refs as a Motion view with timestamped beats and seekable embeds, next to a His-videos view built from mentioned_in.

**Models:** 155 options across 30 structures (3d/models.json, 3d/MODELS.md).
- Downloaded, 33: Z-Anatomy (already in repo) 17, NIH 3D 10, BodyParts3D 6.
- Priced only, 67: TurboSquid 31, CGTrader 29, Zygote 7.
- Sketchfab, 53: recorded only, because downloading needs an account token.
- Quality from 13 clay turntables: the best are the NIH eye, the VHM skull and our Z-Anatomy head (4 each).
- Nothing free exists for SMAS or fat compartments. The paid option is the 3dmi head with fat layers ($169).
- Zygote is priced only, e.g. the integumentary system at $690.

**Base scene layers.** face.glb (8.59 MB, 146 nodes) has eight layers:
- epidermis\*, dermis\*
- superficial fat compartments\* (16)
- SMAS + galea\*
- deep fat\* (buccal pad, deep medial cheek, SOOF)
- muscles (50: frontalis, corrugator, procerus, orbicularis oculi/oris, nasalis, zygomatici, levators, DAO, DLI, mentalis, masseter, temporalis, platysma, SCM …)
- arteries (22), veins (10)
- plus neck skin and eyes\*

\* = approximated, flagged in face.layers.json. skin_crosssection.glb (1.44 MB, 95 nodes) has epidermis, 40 melanocytes, papillary dermis, capillary loops, reticular dermis, hair shaft and follicle, sebaceous glands, arrector pili, a sweat gland, arteriole, venule, hypodermis and 33 fat lobules.

**BUILD_LIST top 10:** `surface_volume_morph` (33), `dermis_macro` (17), `needle_syringe` (17), `collagen_growth_fx` (15), `gel_bolus` (13), `injection_point_map` (11), `cannula` (10), `muscle_contraction_rig` (10), `timelapse_counter` (10), `artery_pulse_fx` (9). 136 missing assets in total, ranked in refs/BUILD_LIST.md.

**Shot plans:** 97 plans in refs/shots/ with 320 shots, 270 overlay and 50 full-frame. Each shot is marked OVERLAY or FULL-FRAME. Coverage:
- reference animation: 85 plans;
- his spoken sentences: 52 plans;
- his captions instead: 28 plans (music-only clips).

**Five working presets** on /ostad/anatomy, verified live with verify_anatomy.mjs:
- Botox glabella: 5 raycast injection points, contraction, signal-cut rings, relax.
- Filler cheek: cannula to the deep medial cheek fat, gel bolus.
- Morpheus8: needle array at three measured depths, RF glow.
- Fraxel: fractional columns in scan order, then healing.
- Mohs: stage-1 bowl mapped, stage 2 takes only the positive zone.

The page also has layer toggles, a cutaway, pause + scrub, and a transparent/black/white background. The PNG export keeps alpha: corner alpha 0, ~76% clear pixels on the free view; black and white exports are opaque. 0 console errors.

**Overlay assets.** Every Blender render is transparent: RGBA PNG sequence, WebM VP9 alpha (decoded alpha 0–255), and MP4 on black. They are face_cutaway (72 frames 720², WebM 0.06 MB, MP4 0.07 MB, 3.0 s); face_turntable (72 frames 720², WebM 0.4 MB, MP4 0.35 MB, 3.0 s); skin_cutaway (72 frames 720², WebM 0.1 MB, MP4 0.11 MB, 3.0 s); skin_turntable (72 frames 720², WebM 0.43 MB, MP4 0.29 MB, 3.0 s). All pass check_alpha. They are rebuilt by build_face.py / build_skin_block.py and kept local (renders/ is gitignored). The GLBs are unchanged; copies are served from public/ostad/3d/ for the page.

**Decisions made alone:** DECISIONS.md 10–31. The ones that matter:
- 15: motion judged from 16-frame overviews, not every frame.
- 16: 5 candidates per procedure; Vimeo, studio and HCP pages not searched.
- 17: no years (YouTube 429).
- 19: the Zygote rip was declined again; legal routes offered.
- 22: placeholder palette (no bible).
- 23: the face's fat/SMAS/skin thickness are approximated.
- 25: the cutaway is a material clip.
- 26: the skin block is diagrammatic.
- 27: the overlay vs full-frame rule.
- 29: caption fallback for his words.
- 30–31: anatomy presets are procedural effects, and export is at screen resolution.

**Stopped here, as instructed. The bible is not started.**
