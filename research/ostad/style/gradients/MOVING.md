# Your gradients, moving

The four pieces are Naim's own gradient images (`ref/ref1_cards.jpg` both cards, `ref/ref2_column.jpg`, `ref/ref3_tile.jpg`).
They are only moved. Nothing is redrawn.

**Method.** Each image is a WebGL texture. Every output pixel samples it at a position pushed back through a slow, divergence-free
curl-noise flow: the stream function is 4D simplex noise with time on a circle, the same noise and loop code as `FluidGlass.tsx`.
Only the soft colour field (a small Gaussian of the source) is displaced. The fine grain, `source - Gaussian`, is added back at the
fixed pixel, so it does not swim. UVs are mirror-folded inside the crop, so edges don't smear and the texture doesn't repeat.

- Displacement: about 1.8 % of the piece width on average (`amp 0.018`, `freq 1.15`, 3 back-trace sub-steps). One loop is 12 s
  at 30 fps (360 frames), and frame 360 equals frame 0.
- Card mint: the thin diagonal light streak is held still, with the flow fading out within a few px of it.
- Tile: the flow happens only inside the tile (a rounded-rect mask, eased in 70 px from the edge). The tile edges, rim and ground stay still.
  For Story and feed the whole tile stays in frame, and the plain grey ground continues around it (the ground band is mirror-folded).
- Cards: each card is cropped 32 px inside its rounded corners, so the pieces are full-bleed rectangles.
- `_soft` = exactly the same motion with saturation at 60 %.

Code: `brand/remotion/src/components/FlowingImage.tsx` and the entry `brand/remotion/src/flowimg/` (pieces, crops and locks are in `Root.tsx`).

```
cd brand/remotion
npx remotion render src/flowimg/index.ts Flow out.mp4 --gl=angle --public-dir=../../research/ostad/style/gradients/ref \
  --props='{"piece":"cardB","w":1080,"h":1920,"sat":1}'      # piece: cardA | cardB | column | tile; sat 0.6 = soft
npx remotion render src/flowimg/index.ts Compare check.mp4 --gl=angle --public-dir=../../research/ostad/style/gradients/ref \
  --props='{"piece":"cardB","w":680,"h":1188,"sat":1}'       # left: source through the same pipeline at amp 0, right: moving
```

Outputs are in `Downloads/Ostad gradients moving/`: `<piece>_loop|story-1080x1920|feed-1080x1350_original|soft.mp4`, plus `check_card-mint_still-vs-moving.mp4`.
