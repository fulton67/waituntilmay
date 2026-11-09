# sie jewel case — what goes on each part

Two files, same model:
- **sie-case-web.glb** (2.8 MB): use this on the website. Mesh is simplified, Meshopt-compressed, WebP textures. In three.js, set `loader.setMeshoptDecoder(MeshoptDecoder)`.
- **sie-case-full.glb** (55 MB): full detail, for Blender or renders.

The model stands upright with the case opened in a V. The lid is on the left, and the tray with the disc is on the right.

## Printed parts (textures already applied)

| Part (node name) | What it is | Texture | Faces |
|---|---|---|---|
| `front_insert` | Front cover, behind the clear lid | textures/1-front-insert_2048x2048.png (om cover) | Outward from the lid |
| `inside_insert` | Back of the booklet, seen when the case opens | textures/2-inside-insert_2048x2048.png ("sie" panel) | Into the case |
| `back_traycard` | Tray card behind the tray, seen on the back of the case | textures/3-back-traycard_2048x1600.png (emoji art, a **placeholder**: there's no photo of the real back card yet) | Outward from the tray |
| `disc` | The CD | textures/4-disc-label_2048x2048.png (painted disc) | Up, out of the tray |

## Plastic parts (materials only, no image)

| Nodes | Material |
|---|---|
| `lid_clear`, `frame_*` | Clear case plastic: transmission 0.92, IOR 1.49, roughness 0.04 |
| `tray_2`, `tray_3`, `tray_6`, `tray_11`, `tray_13` | Black tray: #080808, roughness 0.35 |
| `hub` | Smoky centre hub, translucent |

The original model had a stray floating slab (Tripo part 9). It's been removed.

## Swapping a cover

Replace the matching image in the material and keep the same size and aspect:
- Front insert and inside insert: square, 120 x 120 mm in real life
- Back tray card: 151 x 118 mm (2048 x 1600)
- Disc: square, with the circle touching the edges

To show the emoji or the sie art on the front instead, put that image on `front_insert`. The UVs are 0–1 across each flat insert, so any square image drops straight in.

## Opening and closing animation

The lid hinge is the vertical edge where the lid meets the tray. To animate the opening, parent `lid_clear`, `front_insert`, `inside_insert` and the `frame_*` pieces on the lid side to one empty placed on that hinge edge, then rotate the empty around the vertical (Y) axis. About 90° takes it from open to closed.

## Materials (v2)
- Cover paper: paper-grain normal map, matte roughness ~0.8, soft sheen. It catches light like printed stock instead of glowing.
- Disc: lacquer clearcoat, faint concentric grooves, slight metal.
- Clear plastic: full transmission, IOR 1.49, thin volume, specular 0.55. The edges catch light like real acrylic.
- Black tray: satin with a light clearcoat.
- The remaining fake-looking part is the photo glare baked into the cover images. Replace the four textures with clean flat art (the Nano Banana prompts) and drop them into the same materials.
