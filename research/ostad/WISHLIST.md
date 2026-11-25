# Wishlist (FAST LANE)

Graphics a reel wanted that the library doesn't have. Production sessions only add rows here and use the closest existing component.
The weekly system session builds them. `make-reel` appends a row automatically when a named object has no real cut-out in `public/objects/`.

## System items (from the setup session, 2026-11-25)

1. **HDR master for FAST LANE reels.** `reel.py --hdr` (footage cut from the 10-bit HLG originals, graphics converted to HLG) works for the three delivered reels. It doesn't yet read `fast/1` timelines. Until it does, a FastReel render is a preview, not the camera-roll master.
2. **Arrow on springs.** `devices/Arrow.tsx` (the one arrow system) still draws on with its bezier `sweep`. Port it to `fast/` (draw-on on `snap`, retract on `snap`).
3. **Keyed titles.** Titles behind him (RVM key), as in Jan 08 / under-eye. The FAST LANE places the title in the face-free band instead.
4. **Surgeon markup / before-after window on springs** (`devices/Markup.tsx`, `undereye/standard.tsx SkinWindow` with sketch marks).
5. **Side-by-side object pair** (Evolysse Form vs Smooth, `oct14/GelPair.tsx`) as a `fast/` component for product-talk comparisons.

## Rows from reels

| date | reel | wanted | at | used instead |
|---|---|---|---|---|
| 2026-11-25 | sculptra-product-talk | real cut-out: Sculptra | f88 | argument card |
| 2026-11-25 | sculptra-product-talk | real cut-out: polylactic acid | f160 | argument card |
| 2026-11-25 | sculptra-product-talk | real cut-out: hyaluronic acid filler | f288 | argument card |
| 2026-11-25 | sculptra-product-talk | real cut-out: Sculptra | f682 | argument card |
| 2026-11-25 | sculptra-product-talk | real cut-out: hyaluronic acid | f724 | argument card |
| 2026-11-25 | sculptra-product-talk-t2 | real cut-out: Sculptra | f7 | argument card |
| 2026-11-25 | sculptra-product-talk-t2 | real cut-out: hyaluronic acid filler | f184 | argument card |
| 2026-11-25 | sculptra-product-talk-t2 | real cut-out: Sculptra | f578 | argument card |
| 2026-11-25 | sculptra-product-talk-t2 | real cut-out: Sculptra | f798 | argument card |
| 2026-11-25 | sculptra-product-talk-t2 | real cut-out: hyaluronic acid injectables | f1035 | argument card |
| 2026-11-25 | sculptra-product-talk-t2 | real cut-out: Sculptra | f1219 | argument card |
| 2026-11-25 | sculptra-product-talk-t2 | real cut-out: hyaluronic acid | f1725 | argument card |
| 2026-11-25 | sculptra-product-talk-t3 | real cut-out: Sculptra | f7 | argument card |
| 2026-11-25 | sculptra-product-talk-t3 | real cut-out: hyaluronic acid filler | f184 | argument card |
| 2026-11-25 | sculptra-product-talk-t3 | real cut-out: hyaluronic acid injectables | f956 | argument card |
| 2026-11-25 | sculptra-product-talk-t3 | real cut-out: Sculptra | f7 | argument card |
| 2026-11-25 | sculptra-product-talk-t3 | real cut-out: hyaluronic acid filler | f184 | argument card |
| 2026-11-25 | sculptra-product-talk-t3 | real cut-out: hyaluronic acid injectables | f956 | argument card |
