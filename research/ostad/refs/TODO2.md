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
- [ ] R3F page, five presets, Refs Motion section + mentioned_in, verify, push
## Finish
- [ ] summary
