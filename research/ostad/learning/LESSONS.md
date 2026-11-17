# Lessons (with a check where one exists)

## Feed posts (2026-11-17, after grid 3 was rejected; see REJECTED/2026-11-17_posts_grid3.md)

| # | Lesson | Check |
|---|---|---|
| P1 | Posts are designed stills, never frames or grabs from any video. | The route: posts render only through `brand/scripts/render_stills.cjs` from `public/brand/ostad/stills/`. `reuse_check` distance > .107 to every video key frame and to earlier posts (`brand/posts/reuse_grid4.json`). |
| P2 | No screenshots of web pages, press pages or award listings. | Catalog `description` must not contain "screenshot" for any image used (enforced by the picks script filter). |
| P3 | No transcript lines as word-by-word captions, and no video caption style. | Nothing in `stills/*.html` imports the Remotion `TypeEntry` / caption components. Grep for `wordFrames` returns 0. |
| P4 | The video system's pills, blue arrows and moving warm background never go in as-is. Blue `#37a9e8` is for arrows and measurement marks on before/afters, and those arrows land on measured points. | Every arrow target comes from `ba/marks.js` or a documented pixel probe. |
| P5 | Anatomy drawings must be accurate to a reference; inaccurate anatomy is rejected, drawn anatomy is wanted (on its own and drawn over the face, in posts and reels). Corrected 2026-11-17: the earlier ban came from one inaccurate skull. Build every drawing from a real reference (`research/ostad/3d/base/face.glb`, `skin_crosssection.glb`, Z-Anatomy, or a gold-pick frame of that structure) and trace proportions from it; never from memory. On a face, place structures from the face-tracking landmarks. Any drawing that makes a clinical point is marked for Ostad to check. If it can't pass, use a line-style render of the 3D model or a real licensed image instead. | Overlay the drawing on a render of the model from the same angle and measure the outline difference (report the number); strictest tolerance for skull, bone and muscle shapes. On-face drawings: landmark-anchored (no free placement). Clinical drawings listed as `ostad_check: pending` until he signs off. |
| P6 | Never upscale a small image when a full-size original exists. Pull originals (`clinic-library/pull.py`). | Source size ≥ 1080 px on the short side, or flagged in the checklist (item 1). |
| P7 | At most about 25 words per tile, except text tiles by design (Naim's round-2 note: not enough information, so the information layer is welcome; Naim's refs median 24.5). | `still_study.py` layer.words ≤ 25 per tile. |
| P8 | Before/afters must show what changed, with arrows that land on the change and the measured numbers, in a designed layout. | `brand/scripts/ba_measure.py` landmarks and profile; the pixel probe printed in the checklist. |
| P9 | Every patient photo is usable (company iCloud, under patient contracts, consent = yes since 2026-11-17). Never use names; patient codes only. | `grep -i` for patient names in `stills/` returns nothing; codes only. |
| P10 | Glass is a material with a reason: blur, a veil, a lit-edge highlight, a rim, a contact shadow and grain, all lit from the upper right. | Checklist item 4; `stills.css .glass`. |
