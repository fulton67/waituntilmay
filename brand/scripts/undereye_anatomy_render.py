"""Blender (background) script: a same-angle front render of the face model's bone layer, for tracing the orbital rim (DECISIONS 15c,
LESSONS P5: every anatomy drawing is traced from a reference model, never drawn from memory).

  "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup --python brand/scripts/undereye_anatomy_render.py -- <out_dir>

Loads research/ostad/3d/base/face.glb (Z-Anatomy, CC BY-SA 4.0), keeps only the bone layer (face.layers.json), renders it white on
black with an orthographic camera looking straight at the face (front view, 1080 x 1350), and writes the projected pixel centres of
the two eyeballs (for registering the tracing onto her face) to <out_dir>/bone_front.json.
"""
import json, sys
from pathlib import Path
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT = Path(__file__).resolve().parents[2]
out = Path(sys.argv[sys.argv.index("--") + 1])
out.mkdir(parents=True, exist_ok=True)
FACE_POS_Y = False  # the eyeballs sit at -Y after the import, so the camera goes to -Y looking +Y (checked: True rendered the back of the skull)
layers = json.loads((ROOT / "research/ostad/3d/base/face.layers.json").read_text(encoding="utf-8"))
bone = set(next(L["nodes"] for L in layers["layers"] if L["id"] == "bone"))
eyes = {"eyeball_l", "eyeball_r"}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT / "research/ostad/3d/base/face.glb"))
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
keep = []
for o in meshes:
    base = o.name.split(".")[0]
    if base in bone:
        keep.append(o)
    o.hide_render = base not in bone

# bounds of the bone, to frame the camera
pts = [o.matrix_world @ Vector(c) for o in keep for c in o.bound_box]
mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
ctr = (mn + mx) / 2
# glTF Y-up imports as Blender Z-up; the face looks toward -Y in Blender after import (glTF +Z forward)
cam_data = bpy.data.cameras.new("front")
cam_data.type = "ORTHO"
cam_data.ortho_scale = max(mx.x - mn.x, mx.z - mn.z) * 1.15
cam = bpy.data.objects.new("front", cam_data)
bpy.context.scene.collection.objects.link(cam)
# camera placement: see FACE_POS_Y
cam.location = Vector((ctr.x, mx.y + 1.0, ctr.z)) if FACE_POS_Y else Vector((ctr.x, mn.y - 1.0, ctr.z))
cam.rotation_euler = (1.5707963, 0, 3.1415927) if FACE_POS_Y else (1.5707963, 0, 0)
bpy.context.scene.camera = cam

sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.light = "STUDIO"  # the orbit's walls turn away from the camera and go dark: the rim is the light/dark boundary
sc.display.shading.show_cavity = True
sc.display.shading.color_type = "SINGLE"
sc.display.shading.single_color = (1, 1, 1)
sc.world = bpy.data.worlds.new("w")
sc.world.color = (0, 0, 0)
sc.render.resolution_x, sc.render.resolution_y = 1080, 1350
sc.render.film_transparent = False
sc.view_settings.view_transform = "Standard"
sc.render.filepath = str(out / "bone_front.png")
bpy.ops.render.render(write_still=True)

res = {"camera": "orthographic front, looking along +Y (Blender), ortho_scale %.4f" % cam_data.ortho_scale, "size": [1080, 1350], "eyes": {}}
for o in meshes:
    base = o.name.split(".")[0]
    if base in eyes:
        c = sum((o.matrix_world @ Vector(v) for v in o.bound_box), Vector()) / 8
        p = world_to_camera_view(sc, cam, c)
        res["eyes"][base] = [round(p.x * 1080, 1), round((1 - p.y) * 1350, 1)]
res["eye_world"] = {o.name.split(".")[0]: list(sum((o.matrix_world @ Vector(v) for v in o.bound_box), Vector()) / 8) for o in meshes if o.name.split(".")[0] in eyes}
# trace the orbital rim on the model itself: orthographic rays along +Y on a polar grid around each eyeball centre; walking outward,
# the rim is the first radius where the bone surface comes >= 8 mm forward of the orbit's interior depth near the centre
# (a fixed plane failed: the inferior and lateral rim sit behind the eyeball centre's plane on this model)
import math
for o in list(meshes):  # rays must see bone only (the eyeballs, muscles and skin would stop them first)
    if o.name.split(".")[0] not in bone:
        bpy.data.objects.remove(o, do_unlink=True)
dg = bpy.context.evaluated_depsgraph_get()
px = cam_data.ortho_scale / 1080  # metres per render pixel
res["rim"] = {}
for name, c in res["eye_world"].items():
    c = Vector(c)
    pts = []
    for k in range(144):
        a = 2 * math.pi * k / 144
        hit_r = None
        ys = []
        for r_px in range(30, 260):
            r = r_px * px
            o = Vector((c.x + r * math.cos(a), mn.y - 0.5, c.z + r * math.sin(a)))
            ok, loc, *_ = sc.ray_cast(dg, o, Vector((0, 1, 0)))
            ys.append((r, loc.y if ok else 1.0))
        # the orbit's interior depth near the centre, then the first point where the bone comes >= 8 mm forward of it: the rim
        inner = sorted(y for _, y in ys[:30])[len(ys[:30]) // 2]
        for r, y in ys:
            if y < min(inner, c.y + 0.02) - 0.008:
                hit_r = r
                break
        if hit_r is not None:
            w = Vector((c.x + hit_r * math.cos(a), c.y, c.z + hit_r * math.sin(a)))
            p = world_to_camera_view(sc, cam, w)
            pts.append([round(p.x * 1080, 1), round((1 - p.y) * 1350, 1), round(math.degrees(a), 1)])
    res["rim"][name] = pts
(out / "bone_front.json").write_text(json.dumps(res, indent=1))
print("ANATOMY_RENDER_DONE", res)
