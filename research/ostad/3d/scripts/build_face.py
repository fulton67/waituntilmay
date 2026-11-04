"""Headless Blender: build research/ostad/3d/base/face.blend + face.glb + layers.json from Z-Anatomy.

run: blender -b -P build_face.py
Layers, outside in: epidermis, dermis, superficial fat compartments (approximated), SMAS + galea (approximated SMAS),
deep fat (approximated), mimetic + masticatory muscles, vessels, bone (+ nasal cartilage).
Z-Anatomy has no single skin mesh: the skin is its region surfaces (frontal, buccal, zygomatic ...) joined. Fat and SMAS are
offsets of those same regions inward along the normals, so each compartment sits where its region is and carries its name.
Units: metres. Exported Y-up with the origin at the head centre (glTF exporter converts Blender's Z-up).
"""
import bpy, bmesh, json, math, pathlib, re, sys
from mathutils import Vector, Matrix

HERE = pathlib.Path(__file__).resolve().parents[1]
SRC = HERE / "sources/z-anatomy"
OUT = HERE / "base"; OUT.mkdir(exist_ok=True)
REN = HERE / "renders"; REN.mkdir(exist_ok=True)

# placeholder palette: research/ostad/bible/measurements.json does not exist (logged in DECISIONS)
PAL = {"epidermis": "#E9C2A6", "dermis": "#D98F84", "fat_superficial": "#F2D27A", "smas": "#CDBBA7", "fat_deep": "#E3AE4F",
       "muscle": "#B5473F", "vessel_artery": "#C0312B", "vessel_vein": "#3D5A99", "bone": "#EDE6D6", "cartilage": "#CFE0E4", "eye": "#F4F1EA", "iris": "#4A6A7A"}

MUSCLES = ["Frontalis muscle", "Corrugator supercilii", "Procerus muscle", "Orbital part of orbicularis oculi",
           "Palpebral part of orbicularis oculi", "Nasalis muscle", "Depressor septi nasi", "Levator nasolabialis",
           "Levator labii superioris", "Levator anguli oris", "Zygomaticus major muscle", "Zygomaticus minor muscle",
           "Risorius muscle", "Orbicularis oris muscle", "Depressor anguli oris", "Depressor labii inferioris",
           "Mentalis muscle", "Bucinator", "Superficial part of masseter", "Deep part of masseter", "Temporalis muscle",
           "Platysma", "Occipitalis muscle", "Temporoparietalis muscle", "Sternocleidomastoid muscle"]
GALEA = ["Epicranial aponeurosis", "Superficial layer of temporal fascia"]
BONES = ["Mandible", "Frontal bone", "Parietal bone", "Temporal bone", "Occipital bone", "Sphenoid bone", "Maxilla",
         "Zygomatic bone", "Nasal bone", "Ethmoid bone", "Lacrimal bone", "Hyoid bone", "Atlas (C1)", "Axis (C2)",
         "Vertebra C3", "Vertebra C4", "Vertebra C5", "Vertebra C6", "Vertebra C7"]
CARTILAGE = re.compile(r"alar cartilage|lateral nasal cartilage|septal cartilage|nasal septum cartilage|accessory nasal cartilage", re.I)
ARTERIES = ["Facial artery", "Angular artery", "Superior labial artery", "Inferior labial artery", "Superficial temporal artery",
            "Frontal branch of superficial temporal artery", "Supratrochlear artery", "Supra-orbital artery",
            "Transverse facial artery", "Infra-orbital artery", "Submental artery"]
VEINS = ["Facial vein", "Angular vein", "Superior labial vein", "Inferior labial veins", "Superficial temporal veins"]
SKIP_REGIONS = re.compile(r"hair|eyelash|cross section", re.I)
# neck skin: these regions start below the head cutoff, so they are taken by name
NECK_REGIONS = {"Lateral region of neck", "Posterior region of neck", "Sternocleidomastoid region", "Muscular triangle",
                "Greater supraclavicular fossa", "Lesser supraclavicular fossa"}

# superficial fat compartments: (node name, source region, depth mm, thickness mm)
FAT_SUP = [("fat_sup_forehead_central", "Frontal region", 2.0, 2.0), ("fat_sup_temporal", "Temporal region", 2.0, 3.0),
           ("fat_sup_orbital", "Orbital region", 1.2, 1.0), ("fat_sup_nasolabial", "Nasolabial sulcus", 2.0, 5.0),
           ("fat_sup_medial_cheek", "Infra-orbital region", 2.0, 4.0), ("fat_sup_middle_cheek", "Zygomatic region", 2.0, 4.0),
           ("fat_sup_lateral_temporal_cheek", "Parotideomasseteric region", 2.0, 3.0), ("fat_sup_jowl", "Buccal region", 2.0, 4.0)]
SMAS_REGIONS = ["Buccal region", "Zygomatic region", "Parotideomasseteric region", "Infra-orbital region", "Nasolabial sulcus",
                "Temporal region"]
FAT_DEEP = [("fat_deep_medial_cheek", "Infra-orbital region", 8.0, 4.0), ("fat_deep_soof", "Zygomatic region", 8.0, 3.0)]


def base(name):
    return re.sub(r"\.(l|r)$", "", name)


def hexcol(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1.0]


def material(key):
    m = bpy.data.materials.get(key) or bpy.data.materials.new(key)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = hexcol(PAL[key])
    b.inputs["Roughness"].default_value = 0.65
    for nm, v in (("Subsurface Weight", 0.25 if key not in ("bone", "cartilage") else 0.05), ("Subsurface Scale", 0.003)):
        if nm in b.inputs:
            b.inputs[nm].default_value = v
    return m


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
keep = {}  # object -> layer key


def import_fbx(fn):
    """Import, then bake every object's world transform and unparent it. Z-Anatomy hangs meshes under scaled empties
    (scale 3); deleting an empty before baking would shrink its children to a third and move them."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(SRC / fn))
    new = [o for o in bpy.data.objects if o not in before]
    mws = {o: o.matrix_world.copy() for o in new}
    for o in new:
        o.parent = None
    for o in new:
        o.matrix_world = mws[o]
    return new


def drop(objs):
    for o in objs:
        bpy.data.objects.remove(o, do_unlink=True)


# ---- muscles + galea
new = import_fbx("MuscularSystem100.fbx")
for o in new:
    if o.type == "MESH" and base(o.name) in MUSCLES: keep[o] = "muscle"
    elif o.type == "MESH" and base(o.name) in GALEA: keep[o] = "smas"
drop([o for o in new if o not in keep])
# ---- bones + cartilage
new = import_fbx("SkeletalSystem100.fbx")
for o in new:
    if o.type == "MESH" and base(o.name) in BONES: keep[o] = "bone"
    elif o.type == "MESH" and CARTILAGE.search(o.name) and not o.name.endswith((".i", ".j")): keep[o] = "cartilage"
drop([o for o in new if o not in keep])
# ---- vessels
new = import_fbx("CardioVascular41.fbx")
for o in new:
    if o.type == "MESH" and base(o.name) in ARTERIES: keep[o] = "vessel_artery"
    elif o.type == "MESH" and base(o.name) in VEINS: keep[o] = "vessel_vein"
drop([o for o in new if o not in keep])
# ---- skin regions (head + neck)
new = import_fbx("Regions of human body100.fbx")
meshes = [o for o in new if o.type == "MESH"]
top = max((o.matrix_world @ Vector(c)).z for o in meshes for c in o.bound_box)
regions = {}
for o in meshes:
    zs = [(o.matrix_world @ Vector(c)).z for c in o.bound_box]
    if (min(zs) > top - 0.36 or base(o.name) in NECK_REGIONS) and not o.name.endswith(".j") and not SKIP_REGIONS.search(o.name)             and len(o.data.vertices) > 8:
        regions[o.name] = o
drop([o for o in new if o.name not in regions])
drop([o for o in bpy.data.objects if o.type != "MESH"])

for o in bpy.data.objects:  # apply transforms so offsets are in metres
    o.select_set(True)
bpy.context.view_layer.objects.active = next(iter(bpy.data.objects))
# left/right halves share one mesh with a mirrored transform: give each object its own mesh first
bpy.ops.object.make_single_user(type="SELECTED_OBJECTS", object=True, obdata=True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.select_all(action="DESELECT")


def offset_copy(src_objs, name, depth_mm, thick_mm, layer):
    """Copy region surfaces, push them inward by depth along the normals, give them thickness: an approximated layer."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    for o in src_objs:
        tmp = bmesh.new(); tmp.from_mesh(o.data); tmp.transform(o.matrix_world)
        m2 = bpy.data.meshes.new("tmp"); tmp.to_mesh(m2); bm.from_mesh(m2); bpy.data.meshes.remove(m2); tmp.free()
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0002)
    # open region patches give inconsistent normals: orient every face away from the head centre, then push each
    # vertex radially toward the centre (on a roughly round head that is the inward normal, and it never flips)
    def ref(p):  # inward reference: the head centre above the jaw, the vertical axis through it below
        return HEAD_C if p.z > HEAD_C.z - 0.06 else Vector((HEAD_C.x, HEAD_C.y + 0.01, p.z))
    for f in bm.faces:
        c = f.calc_center_median()
        if f.normal.dot(c - ref(c)) < 0:
            f.normal_flip()
    bm.normal_update()
    for v in bm.verts:
        v.co -= (v.co - ref(v.co)).normalized() * depth_mm / 1000
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    s = ob.modifiers.new("thick", "SOLIDIFY"); s.thickness = thick_mm / 1000; s.offset = -1
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.modifier_apply(modifier="thick"); ob.select_set(False)
    keep[ob] = layer
    return ob


def regs(basename):
    return [o for n, o in regions.items() if base(n) == basename]


# head centre: skin bounding box above the neck regions
face_regs = [o for n, o in regions.items() if "neck" not in n.lower() and base(n) not in NECK_REGIONS]
pts = [o.matrix_world @ v.co for o in face_regs for v in o.data.vertices]
HEAD_C = Vector([(min(p[i] for p in pts) + max(p[i] for p in pts)) / 2 for i in range(3)])

approx = []
for nm, rg, d, t in FAT_SUP:
    for side in ("l", "r"):
        src = [o for o in regs(rg) if o.name.endswith("." + side)] or regs(rg)
        if src:
            approx.append(offset_copy(src, f"{nm}.{side}", d, t, "fat_superficial").name)
for side in ("l", "r"):
    src = [o for r in SMAS_REGIONS for o in regs(r) if o.name.endswith("." + side)]
    approx.append(offset_copy(src, f"smas.{side}", 6.5, 0.8, "smas").name)
for nm, rg, d, t in FAT_DEEP:
    for side in ("l", "r"):
        src = [o for o in regs(rg) if o.name.endswith("." + side)]
        if src:
            approx.append(offset_copy(src, f"{nm}.{side}", d, t, "fat_deep").name)
# buccal fat pad: an ellipsoid under the buccal region, flagged approximate
for side, sx in (("l", 1), ("r", -1)):
    b = regs("Buccal region"); src = [o for o in b if o.name.endswith("." + side)][0]
    c = sum((src.matrix_world @ v.co for v in src.data.vertices), Vector()) / len(src.data.vertices)
    c = c + (HEAD_C - c).normalized() * 0.016
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=1, location=c)
    ob = bpy.context.active_object; ob.name = f"fat_deep_buccal_pad.{side}"; ob.scale = (0.009, 0.013, 0.008)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=True)
    keep[ob] = "fat_deep"; approx.append(ob.name)

# eyes: an eyeball behind each orbital skin region (radius 12 mm) with a flattened iris, flagged approximate
mat_override = {}
for side in ("l", "r"):
    src = [o for o in regs("Orbital region") if o.name.endswith("." + side)]
    if not src:
        continue
    vs = [src[0].matrix_world @ v.co for v in src[0].data.vertices]
    c = sum(vs, Vector()) / len(vs)
    front = min(v.y for v in vs)               # the face looks down -Y
    ctr = Vector((c.x, front + 0.019, c.z - 0.002))  # ~7 mm behind the most forward orbital skin: the lids cover the ball
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.012, location=ctr)
    ob = bpy.context.active_object; ob.name = f"eyeball.{side}"; keep[ob] = "eye"; approx.append(ob.name)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=True)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.0062, location=ctr + Vector((0, -0.0108, 0)))
    ob = bpy.context.active_object; ob.name = f"iris.{side}"; ob.scale = (1, 0.25, 1)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=True)
    keep[ob] = "eye"; mat_override[ob] = "iris"; approx.append(ob.name)

# skin: epidermis = region surfaces joined, given 0.6 mm; dermis = 0.6..2.0 mm under it
epi = offset_copy(list(regions.values()), "skin_epidermis", -1.2, 0.6, "epidermis")
der = offset_copy(list(regions.values()), "skin_dermis", -0.6, 1.4, "dermis")
drop(list(regions.values()))

# ---- decimate heavy meshes, recentre, materials, collections
for o, layer in keep.items():
    n = len(o.data.vertices)
    if n > 6000:
        d = o.modifiers.new("dec", "DECIMATE"); d.ratio = max(0.25, 6000 / n)
        bpy.context.view_layer.objects.active = o; o.select_set(True)
        bpy.ops.object.modifier_apply(modifier="dec"); o.select_set(False)
for o in keep:
    o.data.transform(Matrix.Translation(-HEAD_C)); o.location = (0, 0, 0)
    o.data.materials.clear(); o.data.materials.append(material(mat_override.get(o, keep[o])))
    for p in o.data.polygons: p.use_smooth = True
ORDER = ["epidermis", "dermis", "fat_superficial", "smas", "fat_deep", "muscle", "vessel_artery", "vessel_vein", "eye", "cartilage", "bone"]
LABEL = {"epidermis": "Epidermis", "dermis": "Dermis", "fat_superficial": "Superficial fat compartments", "smas": "SMAS + galea",
         "fat_deep": "Deep fat", "muscle": "Muscles", "vessel_artery": "Arteries", "vessel_vein": "Veins",
         "eye": "Eyes", "cartilage": "Nasal cartilage", "bone": "Bone"}
cols = {}
for k in ORDER:
    c = bpy.data.collections.new(k); scene.collection.children.link(c); cols[k] = c
for o, k in keep.items():
    for c in o.users_collection: c.objects.unlink(o)
    cols[k].objects.link(o)

# ---- node ids: snake_case so three.js keeps them verbatim (it strips spaces, dots and brackets); readable names go in labels
labels = {}
for o in keep:
    nid = re.sub(r"[^a-z0-9]+", "_", o.name.lower()).strip("_")
    side = {"_l": " (left)", "_r": " (right)"}.get(nid[-2:], "")
    labels[nid] = re.sub(r"\.(l|r)$", "", o.name).replace("_", " ") + side
    o.name = nid
approx = [re.sub(r"[^a-z0-9]+", "_", a.lower()).strip("_") for a in approx]
# ---- export GLB (before the render rig so lights/camera stay out of it)
bpy.ops.object.select_all(action="DESELECT")
for o in keep: o.select_set(True)
glb = OUT / "face.glb"
bpy.ops.export_scene.gltf(filepath=str(glb), export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_materials="EXPORT", export_cameras=False, export_lights=False)
layers = {"file": "face.glb", "units": "m", "up": "Y", "origin": "head centre (skin bounding box above the neck)",
          "palette": "placeholder (no research/ostad/bible/measurements.json)",
          "source": "Z-Anatomy (CC BY-SA 4.0), derived from BodyParts3D (CC BY-SA 2.1 JP, DBCLS)",
          "approximated": sorted(approx) + ["skin_epidermis", "skin_dermis"], "labels": labels,
          "approximation_notes": {
              "fat_superficial": "Not anatomical meshes. Each compartment is its skin region pushed 1.2-2 mm inward and given 1-5 mm of thickness, "
                                 "so position and name are right but the true shape and septa are not. The temporal piece flares near the ear.",
              "smas": "The SMAS is approximated as a 0.8 mm sheet 6.5 mm under the midface and temporal skin. The galea (epicranial aponeurosis) "
                      "and superficial temporal fascia are real Z-Anatomy meshes.",
              "fat_deep": "Deep medial cheek fat and SOOF are skin regions pushed 8 mm in; the buccal fat pad is an ellipsoid. Placement is approximate.",
              "epidermis": "Z-Anatomy's skin region surfaces joined and given 0.6 mm of thickness (real epidermis is ~0.1 mm).",
              "dermis": "The same surfaces 0.6-2.0 mm in.",
              "eye": "Placeholder eyeballs (12 mm spheres) with a flattened iris, placed behind the orbital skin."},
          "layers": [{"id": k, "label": LABEL[k], "order": i, "color": PAL[k], "default_visible": k not in ("dermis",),
                      "approximated": k in ("fat_superficial", "smas", "fat_deep", "epidermis", "dermis", "eye"),
                      "nodes": sorted(o.name for o, kk in keep.items() if kk == k)} for i, k in enumerate(ORDER)]}
layers["node_count"] = sum(len(l["nodes"]) for l in layers["layers"])
json.dump(layers, open(OUT / "face.layers.json", "w"), indent=1)

# ---- three-point rig + turntable + cutaway renders
pivot = bpy.data.objects.new("turntable", None); scene.collection.objects.link(pivot)
for o in keep: o.parent = pivot


def light(name, kind, loc, energy, size):
    L = bpy.data.lights.new(name, kind); L.energy = energy
    if kind == "AREA": L.size = size
    ob = bpy.data.objects.new(name, L); scene.collection.objects.link(ob); ob.location = loc
    ob.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()


light("key", "AREA", (0.35, -0.45, 0.25), 7, 0.4)
light("fill", "AREA", (-0.45, -0.35, 0.05), 2.5, 0.6)
light("rim", "AREA", (0.0, 0.5, 0.35), 7, 0.3)
cam_d = bpy.data.cameras.new("cam"); cam_d.lens = 70
cam = bpy.data.objects.new("cam", cam_d); scene.collection.objects.link(cam); cam.location = (0, -0.62, 0.0)
cam.rotation_euler = (math.radians(90), 0, 0); scene.camera = cam
try:
    scene.render.engine = "BLENDER_EEVEE"
except Exception:
    scene.render.engine = "CYCLES"; scene.cycles.samples = 32
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import render_seq as RS
RS.setup(scene, 720)
# turntable: one full turn, 72 frames (3 s)
RS.turntable(scene, pivot, REN / "face_turntable", frames=72)
RS.encode(REN / "face_turntable", "face_turntable", 720); RS.sheet(REN / "face_turntable", "face_turntable")
# cutaway: no booleans (on these thin open shells they fill the cut with the cutter's faces). Instead the outer layers'
# materials go transparent on one side of a hidden empty; sliding the empty sweeps the cut across the face.
cutplane = bpy.data.objects.new("cutplane", None); scene.collection.objects.link(cutplane)
clipped = []
for key in ("epidermis", "dermis", "fat_superficial", "smas"):
    m = bpy.data.materials[key]; nt = m.node_tree
    tc = nt.nodes.new("ShaderNodeTexCoord"); tc.object = cutplane
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); gt = nt.nodes.new("ShaderNodeMath"); gt.operation = "GREATER_THAN"; gt.inputs[1].default_value = 0.0
    nt.links.new(tc.outputs["Object"], sep.inputs[0]); nt.links.new(sep.outputs["X"], gt.inputs[0])
    link = nt.links.new(gt.outputs[0], nt.nodes["Principled BSDF"].inputs["Alpha"])
    if hasattr(m, "surface_render_method"): m.surface_render_method = "DITHERED"
    if hasattr(m, "blend_method"): m.blend_method = "HASHED"
    clipped.append((nt, link, (tc, sep, gt)))
RS.sweep(scene, cutplane, (-0.17, 0, 0), (0.0, 0, 0), REN / "face_cutaway", frames=48, hold=24, pivot=pivot, deg=-25)
RS.encode(REN / "face_cutaway", "face_cutaway", 720); RS.sheet(REN / "face_cutaway", "face_cutaway")
for nt, link, nodes in clipped:  # the saved .blend keeps plain materials
    nt.links.remove(link)
    for n in nodes: nt.nodes.remove(n)
bpy.data.objects.remove(cutplane, do_unlink=True)
pivot.rotation_euler = (0, 0, 0)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "face.blend"), compress=True)
print("NODES", layers["node_count"], "GLB_MB", round(glb.stat().st_size / 1e6, 2))
