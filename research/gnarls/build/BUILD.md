# Gnarls 3D master: how it is built

The last step of `research/ostad/style/FRAME_BY_FRAME.md`, applied to Gnarls: build from the rules in `../CONTEXT.md` /
`../DECISIONS.md`, then render and check against the guide. Target look: a 3D cartoon (soft vinyl toy), not hyper-real,
with the guide's black die-cut contour kept. Media (refs/, gen/, models/, renders/) is gitignored: it is generated from
the team's drive art.

## Pipeline

| Step | Tool | Script / input | Output |
|---|---|---|---|
| 1. Reference pack | PIL | `make_refs.py` (guide p.1 primary mark, five ActionPose stickers) | `refs/*.png` |
| 2. Hero ¾ design | **Meta Muse Image** (OpenRouter `meta/muse-image`, `/api/v1/images/generations`) vs **Nano Banana Pro** (Flora) | `gen_muse.py`, `spec.txt`, `p_hero.txt` | Muse won (Nano: empty far lens, brown lenses). Approved: `gen/muse_hero_2.png` |
| 3. Turnaround | Muse, edits referenced to the hero | `p_*`, `p2_*`, `p4_*` prompts; the right view is a mirror of the left | `gen/muse_front, muse3_left, muse2_back, muse3_right` |
| 4. Flat skins | Muse edit: same view, unlit albedo, no shading | `p_flat.txt`, `p_flat_nologo.txt` (N only on the front) | `gen/flat_*.png` |
| 5. Mesh | **Tripo** on Flora: H3.1 multiview (detailed, 200k faces) from the 4 views; P2 from the hero for comparison | Flora MCP | `models/tripo_mv_s7.glb` (197k tris) chosen |
| 6. Skin the mesh | Blender 5.2 | `run_build.sh` → `blender/project.py` | `renders/mv7_v4/` |
| 7. Faces | Muse edits of the front flat skin, one per expression | `expr.tsv` → `gen/expr/*.png`; `make_face_atlas.py` | `gen/atlas_eyes.png`, `gen/atlas_mouth.png`, `gen/face_zones.json` |
| 8. Rig + poses | Blender | `blender/rig.py` then `blender/render_rig.py` (separate run: see below) | `renders/rig_v5/gnarls_rig.blend`, `pose_*.png`, `face_*.png`, `mix_*.png` |
| 9. Contour | OpenCV | `diecut.py IN OUT [0.020]`: dilate alpha by 2.0% H in #100f0d (C7) | `*_cut.png` |

### project.py (step 6)
- Import the GLB, join it, scale to height 1 with Z up.
- Choose the yaw by matching the vertex silhouette to the 4 views (IoU front 0.67, side 0.80 / 0.90).
- Project each view onto the mesh with per-vertex visibility (BVH raycast) and facing⁴ weights. Verts no view can see
  (5.7%) take the view their normal faces.
- Bake to a 4096 albedo. Snap every texel to the nearest colour in Lab: the 9 guide colours are fixed centroids (body
  #909faa, light #c1c7ca, red #ed1d2f, white #f4f4f4, brown #5e2818, lens #abb9c0, ink #100f0d, tusk #d5dce5, groove
  #9db5c1), plus 6 free clusters for the skins' own tones.
- Bug fixed in this pass: letting the guide seeds drift in k-means dropped white, so the shorts went grey.
- Looks:
  - soft: Principled, roughness 0.78, specular 0.18, matte vinyl.
  - toon: Shader-to-RGB, 3 constant steps.
- Camera: orthographic. The primary-mark ¾ is **yaw −35** (body turned to the viewer's right).

### rig.py (step 8)
- **Bones.** root > hips > spine > chest > head (S-bend chain, A6); hips > tail1 > tail2 > fluke_L / fluke_R (independent
  lobes, A5); chest > fin_{L,R}_1..3 > grip_{L,R} (prop socket, A2). The character's left is +X; the front faces −Y.
- **Weights are computed, not heat-solved.** Heat weighting fails on fused Tripo meshes. Instead:
  - trunk: z-bands;
  - fins: start outside the tee body (half-width 0.169 = 0.92 × the neck slice) at sleeve height, z 0.31–0.58;
  - lobes: split on x below z 0.12.
- **Faces: two integer controls on the armature, `eyes` and `mouth` (0–13),** each mixable with the other.
  - Order: neutral, neutral_open, happy, laugh, excited, surprised, sad, angry, fired_up, smug, sleepy, wink, shout, thinking.
  - Each control picks a cell of its atlas, read through the mesh's `proj_front` UVs and laid over the skin where the
    `face_mask` attribute (front-facing rest normals) is on.
  - Atlas masks: everywhere any expression differs from neutral and holds feature ink, never on the frame.
  - The set comes from the corpus counts (`read/images.tsv`: big_smile 817, excited 160, smug 97, neutral_smile 94,
    laugh 22, sad 15, sleepy 12, wink 10, surprised 10, thinking 4, angry 3; mouths open_smile 615, closed_smile 564,
    teeth 24, frown 14, open_o 13). Expressions are aligned to the neutral by ECC on the glasses frame. All except
    `thinking` came out within 3 px; it was regenerated.
- **Poses (frames 1–7, constant keys = house 2-key holds, A7):** primary, sparkle_hop, cheer_jump, proud_grin,
  presenting (sign prop), fired_up_flex, lounge. Each has its expression keyed. Frames 101–114 are the expression sheet;
  121–123 are mix proofs.
- **Why rendering is a separate run.** In Blender 5.2, drivers created in the same session do not reach EEVEE renders,
  and EEVEE bakes Value-node constants into the shader. So the face index is read through an Object attribute that the
  mesh mirrors from the rig with a driver, and `render_rig.py` renders a freshly opened file.

## Status and open items
- Done: 3D master (textured, palette-snapped); face rig with 14 states each for eyes and mouth (196 combinations); six
  guide poses rendered with their expressions and the 2% contour.
- Not yet measured: the ¾ render against the primary mark (W/H, tee/shorts bands, glasses span, outline %) with
  `../tools/construction.py`. That is the next step of the method.
- Known gaps:
  - Tripo baked sculpted eyes into the lens geometry, so the neutral eyes show faintly under other expressions. Fix:
    flatten that region or regenerate the mesh from eye-less views.
  - The back/side read glassy (rim light and the lens shell).
  - The lounge pose needs work and has no gold hex glasses (glasses are fused in the mesh, so they can't be swapped
    yet, A3).
  - The sign isn't held by a fin yet.
  - Outfits are the master tee only; the stickers' tank, jeans and white tee aren't built.
- Spend: Flora ≈ $3.84 (Nano Banana Pro $0.36, Tripo P2 $1.32, 2 × H3.1 multiview $1.44, 2 × earlier Nano view sets
  $0.72); Muse ≈ $0.01 per image, ~40 images.

## Run it
```
bash run_build.sh models/tripo_mv_s7.glb mv7_v4 gen/flat_muse_front.png gen/flat_muse3_left.png gen/flat_muse2_back.png gen/flat_muse3_right.png
python -I make_face_atlas.py
blender -b renders/mv7_v4/gnarls_master.blend --factory-startup -P blender/rig.py -- gen/face_zones.json gen/atlas_eyes.png gen/atlas_mouth.png renders/rig_v5
blender -b renders/rig_v5/gnarls_rig.blend --factory-startup -P blender/render_rig.py -- renders/rig_v5
```
Paths go to Blender as Windows absolute paths (`cygpath -w`).

To add an expression:
1. Add a row to `expr.tsv` and generate it with `gen_muse.py` (prompt pattern in the session: edit only the eyes, brows
   and mouth; the glasses are fixed).
2. Add its name to `ORDER` in `make_face_atlas.py`. The grid is 4×4, so two slots are free.
3. Rerun the last three commands above.
