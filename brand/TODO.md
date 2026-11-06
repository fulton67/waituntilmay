# Brand kit — TODO (spec: brand/SPEC.md, Phases 1–3 replaced by brand/FIX.md)
- [x] Phase 1 — board pulled (53/56 image blocks, full size), board/READ.md
- [x] Phase 2 — existing identity: 60 posts scraped, palette navy #152235 + ivory #f5f2eb + sand, serif-led, review cards top (7.3k vs median 2.3k) → EXISTING.md
- [~] Phase 3 (old, by eye; superseded by FIX Phase 3) — fonts: 122 crops → matches.json; Neue Haas Grotesk + Freight + IBM Plex Mono (OFL fallbacks in fonts/files), fonts/SYSTEM.md
- [x] Phase 4 — colour, shape, composition, motion, image treatment + plates (motion: motion/motion.json 17 videos, BEATS.md, RULES.md, rules.json)
- [ ] Phase 5 — BRAND-BIBLE.md, /brand/ostad page, PDF
- [ ] Phase 6 — kit files
- [ ] Phase 7 — post.py + /post slash command + 12 demo posts
- [ ] Finish summary

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
- [ ] G — page order: Make · Demo wall · Templates · Look · Icons · Type
