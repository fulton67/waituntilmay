# OSTAD VISUAL REFERENCES — TODO

Spec: pasted 2026-11-03 (saved as `refs/SPEC.md`). Resume from the first unchecked item. Decisions in `refs/DECISIONS.md`.

## Phase 1 — procedure list
- [x] read CLIENT.md, 245 crawled pages, 62 Shopify records, all 109 of his videos (70 with speech; 34 no speech, 5 unavailable: nothing left to transcribe)
- [x] `refs/procedures.json`: 97 entries, region grouping for injectables, mentioned_in by keyword over his transcripts + captions

## Phase 2 — sources
- [x] seed list probed (manufacturers, societies, journals, studios, educators, Are.na)
- [x] `refs/sources.json` with yield + rank (filled after collection)

## Phase 3 — collect
- [x] collector: DuckDuckGo images (real Chrome), Europe PMC figures, Wikimedia Commons, manufacturer pages
- [x] candidate pool per procedure, CLIP pre-rank on thumbnails
- [x] download top candidates, size filter ≥ 800 px, perceptual-hash dedupe
- [x] judge every candidate by eye (contact sheets), type + labelled + style notes
- [x] `refs/refs.json`, previews in `public/ostad/refs/{id}/`, `GAPS.md` for < 5 keepers

## Phase 4 — view
- [x] `/ostad/refs` tab (procedure list + masonry + lightbox + filters) and `/ostad/refs/sources`
- [x] Are.na: no `ARENA_ACCESS_TOKEN` in `.env` → `refs/arena-import.csv`
- [x] verify: counts, previews resolve, build passes, live 200 with count = refs.json length; push

## Finish
- [x] summary below

## Summary (2026-11-03)

**1,552 images across 97 procedures.** 3,252 were judged by eye and 48% kept. 1,353 are labelled. 13 AI-generated keepers were dropped.

**By category:** surgical 235 · filler 228 · skincare 188 · RF/energy 161 · medical-derm 150 · laser 143 · skin-cancer 123 · neurotoxin 120 · body 71 · regenerative 62 · biostimulator 49 · wellness 22.

**By type:** cross-section 501 · MOA 341 · other 169 · surgical steps 152 · injection map 125 · 3D anatomy 98 · device 90 · flowchart 76.

**Images per procedure:** min 6 · median 15 · max 32.

**Top 10 sources by yield:**

| # | Source | Images | Licence |
|---|---|---|---|
| 1 | MDPI journals | 49 | CC BY 4.0 |
| 2 | vecteezy.com | 30 | unknown |
| 3 | clinicalpub.com | 28 | unknown |
| 4 | Springer / Wiley / Thieme | 25 | publisher copyright unless OA |
| 5 | athenaplasticsurgery.com | 23 | unknown |
| 6 | Frontiers | 22 | CC BY 4.0 |
| 7 | mymedicineadvisor.com | 20 | unknown |
| 8 | freepik.com | 18 | unknown |
| 9 | theclinics.com | 17 | unknown |
| 10 | findyourbeautiful.com | 16 | unknown |

**Licences:** 81 images are journal figures under CC or per-article licences. The other 1,471 are "unknown — reference only". Treat them as mood references, not assets to publish.

**Gaps:** none under 5. The thinnest are evolysse (6); diamondglow and filler-safety (8 each); aquagold, earlobe-repair, exosomes, festoons, filler-nose, iv-therapy and milia (9 each).

**Are.na:** `ARENA_ACCESS_TOKEN` is not set, so no channels were created. Import with `refs/arena-import.csv` (one row per image: channel = procedure, source URL, title, description).

**Decided alone:** DECISIONS.md items 1–14. The main ones are DuckDuckGo through real Chrome (Bing and Google are blocked for automation, and Open-i is down), the block list (social reposts and watermarked stock), CLIP shortlisting with the keep/drop call made by eye, the gap round, and dropping AI-generated images.

**Verification:**
- Local production build passes.
- `verify_refs.mjs`:
  - 1,552/1,552 previews on disk;
  - /ostad/refs returns 200 and renders 1,552 = refs.json;
  - 156/156 sampled previews return 200;
  - the procedure filter works and the lightbox opens;
  - /ostad/refs/sources returns 200 with 945 rows;
  - 0 console errors.
- `verify2.mjs` passes. **Live** (https://waituntilmay.com, after 76819b3): verify_refs PASS, 1,552 rendered = refs.json, sources page 200 with 945 rows. It first returned 404 because `.vercelignore`'s bare `sources/` rule dropped the route; fixed with `!app/**/sources/`.
