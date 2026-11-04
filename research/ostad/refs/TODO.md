# OSTAD VISUAL REFERENCES — TODO

Spec: pasted 2026-11-03 (saved as `refs/SPEC.md`). Resume from the first unchecked item. Decisions in `refs/DECISIONS.md`.

## Phase 1 — procedure list
- [x] read CLIENT.md, 245 crawled pages, 62 Shopify records, all 109 of his videos (70 with speech; 34 no speech, 5 unavailable: nothing left to transcribe)
- [x] `refs/procedures.json`: 97 entries, region grouping for injectables, mentioned_in by keyword over his transcripts + captions

## Phase 2 — sources
- [ ] seed list probed (manufacturers, societies, journals, studios, educators, Are.na)
- [ ] `refs/sources.json` with yield + rank (filled after collection)

## Phase 3 — collect
- [ ] collector: DuckDuckGo images (real Chrome), Europe PMC figures, Wikimedia Commons, manufacturer pages
- [ ] candidate pool per procedure, CLIP pre-rank on thumbnails
- [ ] download top candidates, size filter ≥ 800 px, perceptual-hash dedupe
- [ ] judge every candidate by eye (contact sheets), type + labelled + style notes
- [ ] `refs/refs.json`, previews in `public/ostad/refs/{id}/`, `GAPS.md` for < 5 keepers

## Phase 4 — view
- [ ] `/ostad/refs` tab (procedure list + masonry + lightbox + filters) and `/ostad/refs/sources`
- [ ] Are.na: no `ARENA_ACCESS_TOKEN` in `.env` → `refs/arena-import.csv`
- [ ] verify: counts, previews resolve, build passes, live 200 with count = refs.json length; push

## Finish
- [ ] summary below
