"""Headless Blender: import the Z-Anatomy FBXs and list every mesh whose bounding box sits in the head/neck.
run: blender -b -P head_inventory.py -- <out.json>
"""
import bpy, sys, json, pathlib
from mathutils import Vector

SRC = pathlib.Path(__file__).resolve().parents[1] / "sources/z-anatomy"
out = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
rows = []
for fbx in ["MuscularSystem100.fbx", "SkeletalSystem100.fbx", "Regions of human body100.fbx", "CardioVascular41.fbx"]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(SRC / fbx))
    new = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
    zs = []
    for o in new:
        bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
        lo = Vector((min(v.x for v in bb), min(v.y for v in bb), min(v.z for v in bb)))
        hi = Vector((max(v.x for v in bb), max(v.y for v in bb), max(v.z for v in bb)))
        rows.append({"file": fbx, "name": o.name, "verts": len(o.data.vertices), "lo": list(lo), "hi": list(hi)})
    # free memory between files
    for o in new:
        bpy.data.objects.remove(o, do_unlink=True)
# body height from all rows, keep meshes whose bottom is in the top 16% (head + neck)
top = max(r["hi"][2] for r in rows); bot = min(r["lo"][2] for r in rows); H = top - bot
head = [r for r in rows if r["lo"][2] > top - 0.16 * H]
json.dump({"top": top, "bottom": bot, "height": H, "head": head}, open(out, "w"), indent=0)
print("TOTAL", len(rows), "HEAD", len(head), "height", H)
