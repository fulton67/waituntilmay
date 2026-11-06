# Brand kit — TODO (spec: brand/SPEC.md, Phases 1–3 replaced by brand/FIX.md)
- [x] Phase 1 — board pulled (53/56 image blocks, full size), board/READ.md
- [x] Phase 2 — existing identity: 60 posts scraped, palette navy #152235 + ivory #f5f2eb + sand, serif-led, review cards top (7.3k vs median 2.3k) → EXISTING.md
- [~] Phase 3 (old, by eye; superseded by FIX Phase 3) — fonts: 122 crops → matches.json; Neue Haas Grotesk + Freight + IBM Plex Mono (OFL fallbacks in fonts/files), fonts/SYSTEM.md
- [x] Phase 4 — colour, shape, composition, motion, image treatment + plates (motion: motion/motion.json 17 videos, BEATS.md, RULES.md, rules.json)
- [ ] Phase 5 — BRAND-BIBLE.md, /brand/ostad page, PDF
- [ ] Phase 6 — kit files
- [ ] Phase 7 — post.py + /post slash command + 12 demo posts
- [x] Finish summary (BUILDER) — see "Finish" below

## FIX (brand/FIX.md)
- [x] FIX 1 — board pulled via API: 56/56 (channel length 56), 53 images + 1 reel, 1,427 connected channels → board/blocks_api.json, blocks.json, READ.md (22 type-driven), connected.md
- [x] FIX 2 — colours k=6 measured: IG navy #202532 17.9%, paper #f2efed, skin #bf8662; board paper #f6f6f5, near-black, warm browns, sage-grey #7d8075/#505f53 → colour/
- [x] FIX 3 — Adobe visual search on 542/542 crops (213 added, 329 already active, 0 errors, 542 receipts) → matches.json, clusters.json (397 families), system.json, SYSTEM.md: Neue Haas Grotesk Display 65 Md / 55 Rg, no mono; losing Poppins, Cormorant Garamond; specimen 14 plates in fonts/specimen/ (kit vzz0hgt, no fallbacks)
- [x] FIX 3 — specimen is section 01 of /brand/ostad (app/brand/ostad, plates in public/brand/ostad/specimen; brand/scripts/publish_page.py)
- [x] FIX 3b — metrics: 497 text regions / 98 images → metrics/pixels.json + PIXELS.md + 5 plates; 14 source pages → source.json + SOURCE.md (STK Bureau x/cap file 0.739 vs pixels 0.733)
- [x] FIX 3 crops — 542 (278 board, 264 Instagram)

## BUILDER (brand/BUILDER.md, received 2026-11-06) — supersedes BRANDKIT_RUN Phases 5–7
- [x] A — look as components: 15 devices kept of 17 catalogued (look/CATALOG.md), 15 components + grain/treatment SVGs (kit/components), 19 proof boards (look/proof, numbers in look/proof_check.json), kit/look.json, kit/palette.json, kit/tokens.css, kit/treatment.cube + SVG filter + CSS fallback, 24 icons + sheet (kit/icons). DECISIONS 34–40.
- [x] B — 11 templates in 10 clusters, slots.json, 3 sizes, autofit + paginate/truncate, board citations (kit/templates, fig/templates_sheet.png)
- [x] C — /brand/ostad/make: picker, slots form, image drop, icons, accents, sizes, live preview = render.html, server PNG + zip, drafts, duplicate, Auto + regenerate (kit/templates/make_check.json: 33/33 browser, 33/33 server, glyph IoU ≥ 0.96, 7-slide zip, reload ok, 0 console errors)
- [x] D — brand/post.py + .claude/commands/post.md on render_posts.cjs; CLI and page PNGs byte-identical 3/3 (kit/templates/post_check.json)
- [x] E — 12 demo posts (7 template groups, 4 per size, 21 pages, Adobe 12/12) in brand/demo + wall.png; list and Auto quote fixed from the wall; photo content is the remaining inconsistency (DECISIONS 52)
- [x] F — tokens.json (W3C) → CSS / Tailwind / AE set; video kit (19 elements, 6 Lottie 6/6 in lottie-web); 10 s demo reel (OCR 14/14)
- [x] G — page order: Make · Demo wall · Templates · Look · Icons · Type (+ reel; page_check 1440 / 390 px ok)

## Finish (BUILDER, 2026-11-06)
- **Devices catalogued and rebuilt:** 17 catalogued, 15 kept (photo treatment, hairline rule, grain, meta label, screen frame, step marks, leader line, dark card, glass panel, pill chip, photo card, vertical type, icon outline, outline box, dotted path), each rebuilt in kit/components and proven against its source (look/proof_check.json).
- **Icons: 24** (kit/icons, sheet.png). **Templates: 11** in 3 sizes (kit/templates).
- **Builder checks passed:** 33/33 template × size pairs in the browser and on the server, Adobe fonts 33/33, glyph IoU ≥ 0.96, 7-slide zip, draft survives reload, image drop, 0 console errors (kit/templates/make_check.json). CLI and page byte-identical 3/3 (post_check.json). Templates: 36 renders, paginate, truncate and carousel tests pass (templates_check.json).
- **Demo posts: 12** (7 template groups, 21 pages, 4 per size; brand/demo, wall.png).
- **Video kit:** 19 elements at 24 fps, 6 Lottie (6/6 in lottie-web), LUT, VIDEO.md; 10 s reel over ig_DcjqIkoFMTF, with burnt-in captions hidden in 14/14 OCR samples.
- **Builder URL:** /brand/ostad/make (local: http://localhost:3107/brand/ostad/make). The kit page is /brand/ostad. PNG download runs only where Chromium exists (DECISIONS 48).
- **Decided alone** (DECISIONS 47–60):
  - Auto mode is rules, not a model.
  - The server renderer runs locally only.
  - The CLI fills an empty photo slot from the pool.
  - Demo posts are picked by rule.
  - Legacy photo caption bands are cropped; the photo content stays the one inconsistency.
  - List and quote fixes.
  - Motion re-measured: the board camera is locked with a graphic zoom, and the kit runs at 24 fps.
  - Text timings are judgment calls; the lower third sits above the caption band, and the caption goes wide over footage.
  - No MOGRT: there is no scripting route.
  - Glass in alpha overlays and Lottie is tint only; blur it in the NLE at 1.65% of width.
  - The reel's footage is picked by rule, and the reel is silent because the local clip has no audio.
  - The page uses a manifest with JPEG copies, and ’ instead of `&apos;`.
- **Still open:** Phase 5 BRAND-BIBLE.md and PDF (blocked on gold_picks.json), OSTAD_MARKUP, FLORA. Untracked and left alone: brand/colour.json, fig/colour_board.png, fig/colour_palette.png, scripts/colour.py.
