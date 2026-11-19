# Fluid glass (round 2 of the moving gradient / glass look)

Round 1 (`research/ostad/style/gradients`, `GlassGradient.tsx`, `GlassTile.tsx`) was rejected: blobs drifting on sine paths read
stiff and mechanical, and the frosted arrow was copied literally. Round 2 target (Naim, 2026-11-19): the glass **sphere** from his
reference (three objects on dark: flat panel, curved panel, sphere): translucent, navy top, violet middle, amber bottom, a bright
fresnel rim, an inner floor plane, light pooling at the bottom, depth (you see through it), with motion that moves like liquid.

## How real-time fluid motion is usually done

| Method | What it is | Fits Remotion? |
|---|---|---|
| **Stable Fluids** (Jos Stam, SIGGRAPH 1999) | Grid Navier-Stokes: add forces, **semi-Lagrangian advection** (trace each cell back along the velocity, sample there: unconditionally stable), diffuse, **pressure projection** (Poisson solve so the velocity is divergence-free = incompressible swirls). | State lives in grids that must be stepped in order from frame 0. Remotion renders frames out of order on parallel tabs, so it only works if precomputed (bake to an image sequence) or re-stepped from 0 for every frame (O(n²)). |
| **WebGL fluid sim** (Pavel Dobryakov, WebGL-Fluid-Simulation) | Stam on the GPU in ping-pong framebuffers: velocity + **dye** textures, curl/vorticity confinement, Jacobi pressure iterations, splats from the pointer; the dye is what you see. | Same problem: stateful, frame-order dependent, splat-driven. Beautiful, but not deterministic per frame without baking. |
| **Curl noise** (Bridson, Hourihan, Nordenstam, SIGGRAPH 2007) | Take a smooth noise potential ψ and use its curl (∂ψ/∂y, −∂ψ/∂x) as the velocity: divergence-free by construction, so it swirls like an incompressible fluid with no solver. | Yes: a pure function of (position, time). |
| **Domain-warped fbm** (Inigo Quilez, "warp") | fbm(p + fbm(p + fbm(p))): warping the domain by noise produces folded, marbled, smoke/ink-like layering. | Yes: a pure function. |

**Chosen:** a GLSL fragment shader (raw WebGL canvas, `useCurrentFrame()` as time) that does **dye advection through a curl-noise
velocity field** and colours the advected position with a **Quilez domain warp**. Each pixel back-traces its dye a few
semi-Lagrangian steps along the curl field (Stam's advection step, done analytically instead of from a stored grid), so the dye
swirls, folds and layers, and it is deterministic per frame, so parallel / out-of-order rendering is safe.

- **Variable speed, not drift:** the stream function has two octaves; the fine one evolves twice as fast (eddies inside the big
  swirl), and each time track has a periodic phase warp, so the flow surges and settles (measured optical flow 0.6 to 1.3 px/frame
  in one 2 s window) instead of moving at one rate.
- **Seamless loop with no crossfade:** time runs around a circle in 4D simplex noise, noise(x, y, cos θ, sin θ) with θ = 2π·t/8 s
  and integer turn counts per octave, so frame 240 equals frame 0 exactly. No ghosting from blending two time domains.
- Nothing moves on a sine path: positions never oscillate; only the noise field's time coordinate travels.

## The glass (`brand/remotion/src/components/FluidGlass.tsx`)

`FluidGlass` shapes: `sphere` (the reference ball), `bead` (small sphere, no floor), `ring` (elliptical glass band), `arrow`
(round glass tube + head, SDF). `FluidGlassSphere` is the full-frame sphere. Shading, back to front: what is behind refracted
through a ball lens (flipped and shrunk), a dark (or, on paper, faint) interior tint, the far dye wall seen through, the **inner
floor** (ellipse with its far edge as a faint light line), **light pooling** on the floor and in the bowl, the front **dye
weighted by fresnel** (colour lives at the rim, the middle stays see-through), a cool sky rim on top, a hairline edge, a broad soft
key highlight, per-frame grain. Ring/arrow use an SDF tube profile for the normal (fresnel at the edges, lit upper wall, warm
pooling on the lower wall, a contact shadow down-left to match the posts' key light from the upper right). `bg={false}` renders
premultiplied alpha to sit over the DOM; frost over photos is a real `backdrop-filter` clipped to the arrow polygon.

Palettes (`PALETTES`): `ref` (the reference: navy → violet → amber on near-black), `brand` (navy, soft pale blue, muted
lavender-grey, sand/cream warmth, saturation 0.78, on brand navy #152235), `paper` (pastel, for the ivory #f5f2eb post
background, contact shadow instead of halo). The on-photo glass uses `brand` with a light interior and more milk.

## Applications to the before/after posts (`brand/remotion/src/fluid/Apps.tsx`, AviClear P0010, feed 1080x1350)

Interpretations, not copies. Rule kept from v2: glass sits on top and never over the measured area; the face is never graded.

- **(a) Loupe rim** `AppLoupe`: the round window holding the before (v4a cover) gets a living fluid-glass rim with a refraction
  edge instead of a flat white ring; the rim starts exactly at the photo edge, so no glass covers the skin.
- **(b) Glass arrow** `AppArrow variant=arrow`: the frosted-arrow idea as a glass tube with fluid inside, a fresnel edge and a
  contact shadow, pointing from the measured figure (red area 2.9 → 0.0 %) to the cheek it was measured on; the tip stops 16 px
  short of the measured ellipse. It grows in over 18 frames (ease-out), then the fluid carries the motion.
  `variant=ring`: the white hairline ellipse becomes a glass band just outside the measured ellipse.
- **(c) End card** `AppEndCard`: the fluid sphere as the object behind "Book your AviClear treatment today" (`paper` on ivory or
  `brand` on navy).
- **(d) Slider bead** `AppSlider`: the split layout's handle is a small fluid-glass bead on the hairline; the split eases across the
  measured cheek (ease-in-out), chevrons on top.

## Render

```
cd brand/remotion
# bundle with a small public dir (brand/remotion/public is ~21 GB and makes bundling take minutes)
npx remotion bundle src/fluid/index.ts --out-dir <tmp>/bundle --public-dir <dir holding fluidglass/p0010_grid.jpg>
npx remotion render <tmp>/bundle SpherePost out.mp4 --gl=angle --props='{"palette":"brand"}'   # SphereReel = 1080x1920
npx remotion render <tmp>/bundle AppArrow out.mp4 --gl=angle --props='{"variant":"ring"}'
```

`--gl=angle` (GPU) is required; WebGL output is premultiplied with `preserveDrawingBuffer` so Remotion's screenshot sees it.
The P0010 source is local only (`brand/remotion/public` is gitignored); renders go to `Downloads/Ostad fluid glass`, never git.

## Motion check

`research/ostad/style/fluid/motion_check.py <clip> [x,y,w,h]` per clip: mean abs frame difference and Farneback optical flow per step inside
the object, pops = steps over 2.5x the median, loop seam = last → first frame difference against the median step.
Results are in the round-2 report.
