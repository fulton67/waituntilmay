"""Blender (background) script: a sagittal section of the face model through the pupil line of her right eye (LESSONS P5: anatomy
comes from the model, not from memory).

  "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup --python brand/scripts/undereye_section_render.py -- <out_dir>

face.glb (Z-Anatomy, CC BY-SA 4.0). An orthographic camera looks along the model's X axis from inside the head; its near clip plane
sits on the vertical plane through the centre of eyeball_r, so everything nearer is cut away and the layers show where the plane
cuts them: skin, the superficial orbital fat, the orbicularis oculi (palpebral and orbital parts), the deep fat under it (SOOF),
the maxilla / zygomatic bone of the orbital rim, the eyeball. Each layer gets its palette colour from face.layers.json (flat, no
lighting), so the render can be segmented back into layers by colour. Output: <out_dir>/section.png (1200 x 1200, the lower lid
and cheek) and section.json (camera, scale, the colour per layer).
"""
import json, sys
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
out = Path(sys.argv[sys.argv.index("--") + 1])
out.mkdir(parents=True, exist_ok=True)
layers = json.loads((ROOT / "research/ostad/3d/base/face.layers.json").read_text(encoding="utf-8"))
KEEP = {"epidermis", "dermis", "fat_superficial", "smas", "fat_deep", "muscle", "bone", "eye", "vessel_artery"}
node_layer = {n: L for L in layers["layers"] for n in L["nodes"] if L["id"] in KEEP}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT / "research/ostad/3d/base/face.glb"))
eye = None
for o in list(bpy.context.scene.objects):
    if o.type != "MESH":
        continue
    base = o.name.split(".")[0]
    if base == "eyeball_r":
        eye = sum((o.matrix_world @ Vector(v) for v in o.bound_box), Vector()) / 8
    L = node_layer.get(base)
    if L is None:
        bpy.data.objects.remove(o, do_unlink=True)
        continue
    h = L["color"].lstrip("#")
    o.color = (int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255, 1)

sc = bpy.context.scene
cam_data = bpy.data.cameras.new("side")
cam_data.type = "ORTHO"
cam_data.ortho_scale = 0.06  # 6 cm: the lower lid, the tear trough, the cheek
cam = bpy.data.objects.new("side", cam_data)
sc.collection.objects.link(cam)
# from the midline (x = 0) looking toward the right eye (x < 0): the camera sits at x = +0.2 looking along -X; near clip = the eye plane
cam.location = Vector((0.2, eye.y + 0.006, eye.z - 0.012))
cam.rotation_euler = (1.5707963, 0, 1.5707963)  # looks along -X (a first try at -90 deg looked away from the head: blank)
cam_data.clip_start = 0.2 - eye.x  # the plane through the eyeball centre
cam_data.clip_end = 0.6
sc.camera = cam
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.light = "FLAT"
sc.display.shading.color_type = "OBJECT"
sc.display.shading.show_backface_culling = False
sc.world = bpy.data.worlds.new("w")
sc.world.color = (1, 1, 1)
sc.render.resolution_x = sc.render.resolution_y = 1200
sc.view_settings.view_transform = "Standard"
sc.render.filepath = str(out / "section.png")
bpy.ops.render.render(write_still=True)
(out / "section.json").write_text(json.dumps({
    "model": "face.glb (Z-Anatomy, CC BY-SA 4.0)", "plane": "sagittal, through the centre of eyeball_r (x = %.4f m)" % eye.x,
    "camera": {"ortho_scale_m": cam_data.ortho_scale, "size": [1200, 1200], "centre_yz": [eye.y + 0.006, eye.z - 0.012]},
    "mm_per_px": cam_data.ortho_scale * 1000 / 1200,
    "colours": {L["id"]: L["color"] for L in layers["layers"] if L["id"] in KEEP}}, indent=1))
print("SECTION_DONE")
