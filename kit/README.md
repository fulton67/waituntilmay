# Housing bake: the painted part sheets onto the Rolodex

Inputs (here): `rolodex-parts-kit-front.png` and `-back.png`, the housing GLB's parts rendered to a 4 x 2 grid
(orthographic, each part centred in a 600 px cell at 1.2x its bounding diagonal, camera on the side of
(1, 0.8, 1.6) and (-1, 0.6, -1.6)). `painted-front.png` and `painted-back.png` are the same parts repainted by an
image model: 2 x 4 cells of 848 x 632, parts at other scales and places, the back on white with drop shadows.

Run in order, with `~/tools/rolodex-venv/Scripts/python -I` (numpy, opencv, scipy, trimesh, xatlas):

| Step | Script | Writes |
|---|---|---|
| camera check | `bake/check_camera.py` | outline IoU of `common.silhouette` against the kit renders (0.96–0.997, the back of the base 0.71 where the kit's shading matches its ground) |
| 1a extract | `bake/extract.py` | `work/paint-<view>-<label>.png`: each painted part, background and shadows out, soft edge |
| 1b fit | `bake/fit.py` | `work/fit.json`: similarity transform (scale, translation, rotation within 3°) and IoU per part per view; under 0.92 is flagged and not projected. For the round base the camera's elevation is searched too (the image model drew it steeper: back 0.896 at the sheet's 17.6°, 0.983 at 21.6°), and the bake projects along the direction found |
| 2a UVs | `bake/unwrap.py` | `work/uv-<label>.npz`: xatlas, one 2048 atlas per part |
| 2b bake | `bake/bake.py` | `work/bake-<label>-albedo.png`: front/back projection blended by facing angle, depth-tested, 2 px eroded masks; unseen texels from a seamless tile of the part's own paint, triplanar |
| 3, 4 maps | `bake/pbr.py` | `public/models/housing-maps/*`, `public/materials/paper.jpg`, `lib/gillenwebsite/housing-bake.json` |
| geometry | `bake/export.py` | `public/models/housing-baked.glb`: the baked meshes with their new UVs, meshopt |

`kit/work/` is git-ignored. The check is `node scripts/gillenwebsite/housing.mjs [base-url] --fps <sleeves report>`
(renders from the four cardinal angles and the two sheet views, IoU, coverage, texture memory).

A part whose fit fails in both views is left out of `housing-bake.json` and keeps its previous material (the
triplanar enamel from `components/gillenwebsite/triplanar.ts`). A part that passes in one view is projected from
that view only, and the rest of it is tile.
