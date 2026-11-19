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

Delivery encode: Remotion writes full-range `yuvj420p`, so each file was re-encoded to limited-range `yuv420p`, keeping the same
BT.601 matrix so the colours don't change (`ffmpeg -vf "scale=in_range=full:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt601,format=yuv420p" -c:v libx264 -crf 14`).
The sources are tagged Display P3. The browser converts them to sRGB, so the colour checks compare against the sRGB-converted source.

Checks (loop files): the seam in the rendered PNGs equals one frame step (0.121 vs 0.122 mean abs). After H.264 the seam is about 1.1x the largest
frame step, which is keyframe noise. There are no pops (largest step under 3.3x the median). Mean RGB is within 2.1 levels of the source. The grain stays
put: the high-pass correlation between frame 0 and frame 180 is 0.63 (tile) and 0.35 (column), against about 0.01 if the grain moved by 3 px.
