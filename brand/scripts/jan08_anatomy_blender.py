"""Jan 08 filler-fatigue reel anatomy (derived from oct14_anatomy_blender.py, same method): silhouette masks of real model structures, one PNG per structure per view (run inside Blender).

  blender -b --factory-startup -P brand/scripts/jan08_anatomy_blender.py -- <out_dir>

The drawings in the reel are traced from these masks (brand/scripts/jan08_anatomy.py), so every outline comes from
research/ostad/3d/base/face.glb (Z-Anatomy bone and muscle meshes; the fat compartments are the model's approximations,
see face.layers.json approximation_notes). Orthographic camera, flat white, transparent film. Nothing is drawn from memory.
"""
import json, math, pathlib, sys
import bpy
from mathutils import Vector

ROOT = pathlib.Path(__file__).resolve().parents[2]
ARGS = sys.argv[sys.argv.index("--") + 1:]
OUT = pathlib.Path(ARGS[0]).resolve()
MODEL = ARGS[1] if len(ARGS) > 1 else "face"  # "face" (face.glb, views upper / midface / profile) or "skin" (skin_crosssection.glb, view section)
OUT.mkdir(parents=True, exist_ok=True)
SIZE = 1024

VIEWS = {
    # where he places filler: the cheekbone (zygoma) and the mid-cheek fat beside it, 3/4 view of the right side (yaw < 0 = her right)
    "midface": {"yaw": -30, "structures": ["skin_epidermis", "zygomatic_bone_r", "maxilla_r", "mandible", "fat_sup_medial_cheek_r", "fat_sup_middle_cheek_r",
                                           "fat_sup_nasolabial_r", "fat_sup_jowl_r", "fat_deep_soof_r", "fat_deep_medial_cheek_r", "orbicularis_oris_muscle_r"],
                "frame": ["zygomatic_bone_r", "fat_sup_jowl_r", "fat_sup_nasolabial_r", "fat_sup_middle_cheek_r", "nasal_bone_r"], "pad": 0.2},
    # volume loss and pillow vs lift: the right profile (skin outline = the face profile; fat compartments; bone)
    "profile": {"yaw": -90, "structures": ["skin_epidermis", "zygomatic_bone_r", "maxilla_r", "mandible", "fat_sup_medial_cheek_r", "fat_sup_middle_cheek_r",
                                           "fat_sup_nasolabial_r", "fat_sup_jowl_r", "fat_deep_soof_r", "fat_deep_medial_cheek_r"],
                "frame": ["zygomatic_bone_r", "mandible", "nasal_bone_r", "fat_sup_jowl_r"], "pad": 0.12},
}
# skin block (skin_crosssection.glb), looked at along +X: layer bands and the arteriole / venule in cross-section (round), one row of fat
SKIN_VIEWS = {"section": {"yaw": 90, "structures": ["epidermis", "papillary_dermis", "reticular_dermis", "hypodermis", "artery", "vein",
                                                     "fat_lobule_27", "fat_lobule_28", "fat_lobule_29", "fat_lobule_30", "fat_lobule_31", "fat_lobule_32"],
                          "frame": ["epidermis", "hypodermis"], "pad": 0.04}}
if MODEL == "skin":
    VIEWS = SKIN_VIEWS
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT / ("research/ostad/3d/base/skin_crosssection.glb" if MODEL == "skin" else "research/ostad/3d/base/face.glb")))
objs = {o.name: o for o in bpy.data.objects if o.type == "MESH"}


def find(name):
    if name in objs:
        return objs[name]
    c = [o for n, o in objs.items() if n.lower().startswith(name.lower())]
    return c[0] if c else None


sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.light = "FLAT"
sc.display.shading.color_type = "SINGLE"
sc.display.shading.single_color = (1, 1, 1)
sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = SIZE
sc.render.image_settings.file_format = "PNG"
sc.render.image_settings.color_mode = "RGBA"
sc.view_settings.view_transform = "Standard"

cam_data = bpy.data.cameras.new("cam")
cam_data.type = "ORTHO"
cam = bpy.data.objects.new("cam", cam_data)
sc.collection.objects.link(cam)
sc.camera = cam

# the face looks along -Y in Blender after the glTF import (glTF +Z forward -> Blender -Y); checked on the skin bbox below
skin = find("epidermis" if MODEL == "skin" else "skin_epidermis")
bb = [skin.matrix_world @ Vector(c) for c in skin.bound_box]
centre = sum(bb, Vector()) / 8
manifest = {"source": "research/ostad/3d/base/face.glb", "size": SIZE, "views": {}, "missing": []}

for vname, v in VIEWS.items():
    yaw = math.radians(v["yaw"])
    d = Vector((math.sin(yaw), -math.cos(yaw), 0))  # camera position direction; yaw > 0 turns toward her right side
    pts = []
    for n in v["frame"]:
        o = find(n)
        if o:
            pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
    # project the framing points on the camera plane to size the ortho box
    right = Vector((math.cos(yaw), math.sin(yaw), 0)); up = Vector((0, 0, 1))
    xs = [p.dot(right) for p in pts]; zs = [p.dot(up) for p in pts]
    cx, cz = (min(xs) + max(xs)) / 2, (min(zs) + max(zs)) / 2
    span = max(max(xs) - min(xs), max(zs) - min(zs)) * (1 + 2 * v["pad"])
    target = right * cx + up * cz + d * centre.dot(d)
    cam.location = target + d * 1.0
    cam.rotation_euler = (math.radians(90), 0, yaw)  # looks along -d
    cam_data.ortho_scale = span
    cam_data.clip_end = 5
    manifest["views"][vname] = {"yaw_deg": v["yaw"], "ortho_scale_m": span, "centre": [cx, cz], "files": {}}
    for s in v["structures"]:
        o = find(s)
        if not o:
            manifest["missing"].append(s); continue
        for ob in objs.values():
            ob.hide_render = ob is not o
        f = OUT / f"{vname}__{s}.png"
        sc.render.filepath = str(f)
        bpy.ops.render.render(write_still=True)
        manifest["views"][vname]["files"][s] = f.name

for ob in objs.values():
    ob.hide_render = False
mf = OUT / "manifest.json"
old = json.loads(mf.read_text()) if mf.exists() else {"views": {}, "missing": []}
old["views"].update(manifest["views"]); old["missing"] = sorted(set(old.get("missing", [])) | set(manifest["missing"]))
old.update({k: v for k, v in manifest.items() if k not in ("views", "missing")})
old.setdefault("sources", {})
for vn in manifest["views"]:
    old["sources"][vn] = manifest["source"] if MODEL == "face" else "research/ostad/3d/base/skin_crosssection.glb"
mf.write_text(json.dumps(old, indent=1))
print("ANATOMY_DONE", json.dumps(manifest["missing"]))
