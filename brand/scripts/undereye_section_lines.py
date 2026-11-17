"""Blender (background) script: the sagittal section of the face model as clean lines (LESSONS P5: drawn from the model).

  "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup --python brand/scripts/undereye_section_lines.py -- <out_json>

Every mesh of the kept layers (skin, superficial and deep fat, muscle, bone, eye, the infra-orbital artery) is cut by the vertical
plane through the centre of eyeball_r (bmesh bisect, world space); the cut edges are the section's outlines. They are exported as
segments in mm, relative to the eyeball centre (u = forward (-Y), v = up (+Z)), inside a window from the brow to the mid-cheek.
Because the lines ARE the model's section, there is nothing to trace by hand; undereye_anatomy_check.py still overlays them on the
same-angle colour render (section.png) and reports the outline difference.
"""
import json, sys
from pathlib import Path
import bpy, bmesh
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
out = Path(sys.argv[sys.argv.index("--") + 1])
layers = json.loads((ROOT / "research/ostad/3d/base/face.layers.json").read_text(encoding="utf-8"))
KEEP = {"epidermis", "fat_superficial", "fat_deep", "muscle", "bone", "eye", "vessel_artery"}
node_layer = {n: L["id"] for L in layers["layers"] for n in L["nodes"] if L["id"] in KEEP}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT / "research/ostad/3d/base/face.glb"))
objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
eye = next(sum((o.matrix_world @ Vector(v) for v in o.bound_box), Vector()) / 8 for o in objs if o.name.split(".")[0] == "eyeball_r")
res = {"plane_x_m": eye.x, "units": "mm from the eyeball centre: u forward, v up", "segments": {}}
for o in objs:
    base = o.name.split(".")[0]
    lid = node_layer.get(base)
    if lid is None:
        continue
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bm.transform(o.matrix_world)
    r = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=Vector((eye.x, 0, 0)), plane_no=Vector((1, 0, 0)))
    segs = []
    for e in [g for g in r["geom_cut"] if isinstance(g, bmesh.types.BMEdge)]:
        a, b = e.verts[0].co, e.verts[1].co
        ua, va = (eye.y - a.y) * 1000, (a.z - eye.z) * 1000
        ub, vb = (eye.y - b.y) * 1000, (b.z - eye.z) * 1000
        if -30 < ua < 30 and -42 < va < 20 and -30 < ub < 30 and -42 < vb < 20:
            segs.append([round(ua, 2), round(va, 2), round(ub, 2), round(vb, 2)])
    bm.free()
    if segs:
        res["segments"].setdefault(lid, {})[base] = segs
out.write_text(json.dumps(res))
print("SECTION_LINES_DONE", {k: sum(len(s) for s in v.values()) for k, v in res["segments"].items()})
