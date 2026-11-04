# blender -b -P inventory.py -- <fbx> <out.json> : list mesh objects with vertex counts and bbox centres (metres after import)
import bpy, sys, json
fbx, out = sys.argv[sys.argv.index("--") + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=fbx)
rows = []
for o in bpy.data.objects:
    if o.type != "MESH":
        continue
    bb = [o.matrix_world @ __import__("mathutils").Vector(c) for c in o.bound_box]
    cz = sum(v.z for v in bb) / 8; cy = sum(v.y for v in bb) / 8; cx = sum(v.x for v in bb) / 8
    rows.append({"name": o.name, "verts": len(o.data.vertices), "c": [round(cx, 3), round(cy, 3), round(cz, 3)]})
json.dump(rows, open(out, "w"), indent=0)
print("MESHES", len(rows))
