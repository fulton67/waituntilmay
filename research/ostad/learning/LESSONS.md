# Lessons (with a check where one exists)

## Feed posts (2026-11-17, after grid 3 was rejected; see REJECTED/2026-11-17_posts_grid3.md)

| # | Lesson | Check |
|---|---|---|
| P1 | Posts are designed stills, never frames or grabs from any video. | The route: posts render only through `brand/scripts/render_stills.cjs` from `public/brand/ostad/stills/`. `reuse_check` distance > .107 to every video key frame and to earlier posts (`brand/posts/reuse_grid4.json`). |
| P2 | No screenshots of web pages, press pages or award listings. | Catalog `description` must not contain "screenshot" for any image used (enforced by the picks script filter). |
| P3 | No transcript lines as word-by-word captions, and no video caption style. | Nothing in `stills/*.html` imports the Remotion `TypeEntry` / caption components. Grep for `wordFrames` returns 0. |
| P4 | The video system's pills, blue arrows and moving warm background never go in as-is. Blue `#37a9e8` is for arrows and measurement marks on before/afters, and those arrows land on measured points. | Every arrow target comes from `ba/marks.js` or a documented pixel probe. |
| P5 | No drawn anatomy diagrams. | Review. |
| P6 | Never upscale a small image when a full-size original exists. Pull originals (`clinic-library/pull.py`). | Source size ≥ 1080 px on the short side, or flagged in the checklist (item 1). |
| P7 | At most about 25 words per tile, except text tiles by design (Naim's round-2 note: not enough information, so the information layer is welcome; Naim's refs median 24.5). | `still_study.py` layer.words ≤ 25 per tile. |
| P8 | Before/afters must show what changed, with arrows that land on the change and the measured numbers, in a designed layout. | `brand/scripts/ba_measure.py` landmarks and profile; the pixel probe printed in the checklist. |
| P9 | Every patient photo is usable (company iCloud, under patient contracts, consent = yes since 2026-11-17). Never use names; patient codes only. | `grep -i` for patient names in `stills/` returns nothing; codes only. |
| P10 | Glass is a material with a reason: blur, a veil, a lit-edge highlight, a rim, a contact shadow and grain, all lit from the upper right. | Checklist item 4; `stills.css .glass`. |
