# OSTAD REFS — pass 2: motion and 3D, not stills (spec as pasted 2026-11-03, condensed)

Unattended, same rules (never ask, log to refs/DECISIONS.md, resume from refs/TODO2.md, cache, push to main after each measured phase). Keep procedures.json (97) and refs.json; do not re-run the image search.

Goal: for each of the 97 procedures, a moving explanation Naim can overlay while Ostad talks (orbitable 3D cross-section, energy effect that plays, injection map filling point by point). Needs: existing animations as references, licensed 3D models, a shot-by-shot plan.

## Phase 1 — existing animations per procedure → motion.json
Search as video: YouTube (yt-dlp `ytsearch20:` + web search; queries "{device} mechanism of action", "{device} how it works animation", "{procedure} 3D animation", "{procedure} medical animation", manufacturer channels: InMode, Solta, BTL, Candela, Cutera, Cynosure Lutronic, Allergan, Galderma, Evolus, miraDry, Sinclair, Benev), Vimeo (web search), studio portfolios (Nucleus, AXS, Random42, Scientific Animations, Ghost Productions, XVIVO, Hybrid Medical Animation, Studio Charlie, Anatomic Studios, Trinity Animation), manufacturer HCP pages (page source: .mp4, vimeo, wistia, vidyard), Behance/Dribbble, AMI salon animation.
Keep only animated/3D explanations (no testimonials, filmed treatment, talking heads). Whole videos, never truncated; prefer full-length versions; trim to the how-it-works chapter of long HCP videos. Frames across the whole duration (≥1 fps under 2 min, every 2 s above), look at all of them; beats cover first to last frame with timestamps. Cut-downs → find the longer one. Under 15 s → `fragment: true`.
Fields: procedure_id, url, platform, title, maker, duration, year, style (flat-2D | shaded-2D | soft-3D | photoreal-3D | mixed), what_it_shows, beats, camera_moves (orbit | zoom | push-in | cutaway | static), energy_effect_how, reusable_as_reference, notes. Download 720p to refs/motion/{procedure_id}/ when allowed; else URL + 6 frame grabs. Target 3–10 per procedure; log gaps.

## Phase 2 — 3D models with licences → models.json
Structures from the procedures' anatomy (face layers, fat compartments, SMAS, platysma, masseter, DAO, mentalis, orbicularis, nose, eyelid, neck, hands, scalp/follicle, skin cross-section, melanocyte/basal layer, vessels, sweat gland, …). Sources: Z-Anatomy (CC BY-SA .blend, download once, list contents), BodyParts3D (CC BY-SA 2.1 JP, OBJs by name), NIH 3D (licence per model), Sketchfab downloadable + CC. Paid as a priced list only (Zygote store, TurboSquid, CGTrader: name, URL, price, licence, polycount, layered).
Fields: structure, source, url, license, format, downloaded, path, polycount, layered, quality (1–5 after a headless Blender turntable render), notes. Attribution files beside models. Every structure: ≥1 downloadable or priced option.

## Phase 3 — base scene
research/ostad/3d/base/face.blend: layered head/neck, separable skin shell (epidermis/dermis), superficial fat compartments (approximated + flagged if missing), SMAS, deep fat, mimetic muscles (frontalis, corrugator, procerus, orbicularis oculi, nasalis, zygomatici, DAO, mentalis, masseter, platysma), bone. skin_crosssection.blend: 2×2 cm block, epidermis, papillary/reticular dermis, hypodermis, hair follicle, sebaceous gland, sweat gland, vessel (primitives OK, legible). Matte SSS material per layer (palette from research/ostad/bible/measurements.json if it exists, else placeholder logged). Three-point rig. GLB export: metres, origin head centre, Y-up, named nodes, layers.json. Verify: 8-frame turntable + cutaway render each; GLB loads in Node with expected node count; each < 15 MB.

## Phase 4 — shot plan per procedure
shots/{procedure_id}.md: scene, visible layers, camera move, what animates, duration, label text, reference video; matched to his transcript sentences; missing assets listed. Sum into refs/BUILD_LIST.md ranked by procedures needing each.

## Phase 5 — orbit prototype
R3F page /ostad/anatomy: face.glb + skin_crosssection.glb, orbit/zoom, layer toggles, cutaway slider, procedure picker with presets for Botox glabella (signal-cut), filler cheek (compartment fills), Morpheus8 (needle array + RF glow), Fraxel (laser columns), Mohs (layered excision). Noindex, /ostad styling. Link from Refs; Refs gets a Motion section per procedure and mentioned_in videos per procedure. Verify: loads, node count = manifest, five presets switch, 0 console errors (Playwright), build passes, live 200. Push.

## Finish
TODO2.md ends with: animations per procedure (min/median/max, gaps), models downloaded vs priced-only, base scene layer list, BUILD_LIST top 10, five working presets, decisions made alone.
