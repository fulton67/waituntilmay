"""Headless Blender: research/ostad/3d/base/skin_crosssection.blend + .glb + .layers.json.

A 2 x 2 cm skin block built from primitives, legible rather than to scale (the epidermis is thickened ~8x).
Origin at the centre of the skin surface, metres, exported Y-up.
run: blender -b -P build_skin_block.py
"""
import bpy, bmesh, json, math, pathlib, random
from mathutils import Vector, Matrix

HERE = pathlib.Path(__file__).resolve().parents[1]
OUT = HERE / "base"; OUT.mkdir(exist_ok=True)
REN = HERE / "renders"; REN.mkdir(exist_ok=True)
random.seed(7)
S = 0.02            # block side
H = S / 2
# depths (m, below the surface z=0)
EPI, PAP, RET, HYP = 0.0008, 0.0020, 0.0060, 0.0120

PAL = {"epidermis": "#E9C2A6", "papillary_dermis": "#E7A99B", "reticular_dermis": "#D98F84", "hypodermis": "#F3E3B5",
       "fat_lobules": "#F2D27A", "hair": "#3A2A20", "hair_follicle": "#C98D7A", "sebaceous_gland": "#EFD9A0",
       "sweat_gland": "#9CC3D5", "artery": "#C0312B", "vein": "#3D5A99", "capillaries": "#D9534F", "melanocytes": "#5B3A29",
       "arrector_pili": "#B5473F"}


def hexcol(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1.0]


def material(key):
    m = bpy.data.materials.new(key); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hexcol(PAL[key]); b.inputs["Roughness"].default_value = 0.6
    if "Subsurface Weight" in b.inputs: b.inputs["Subsurface Weight"].default_value = 0.2
    if "Subsurface Scale" in b.inputs: b.inputs["Subsurface Scale"].default_value = 0.0005
    return m


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
objs = {}  # object -> layer


def add(ob, layer):
    ob.data.materials.clear(); ob.data.materials.append(material(layer) if layer not in MATS else MATS[layer])
    MATS.setdefault(layer, ob.data.materials[0])
    for p in ob.data.polygons: p.use_smooth = True
    objs[ob] = layer
    return ob


MATS = {}


def wave(x, y):  # dermal papillae: the epidermis/dermis junction undulates
    return 0.00028 * (math.sin(x * 2 * math.pi / 0.0016) * math.sin(y * 2 * math.pi / 0.0016))


def slab(name, z_top, z_bot, top_fn=None, bot_fn=None, n=80):
    """Closed block between two height fields over the 2x2 cm square."""
    bm = bmesh.new()
    def grid(z, fn, flip):
        vs = [[bm.verts.new((-H + S * i / n, -H + S * j / n, z + (fn(-H + S * i / n, -H + S * j / n) if fn else 0)))
               for j in range(n + 1)] for i in range(n + 1)]
        for i in range(n):
            for j in range(n):
                q = [vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]]
                bm.faces.new(q[::-1] if flip else q)
        return vs
    t = grid(z_top, top_fn, False); b = grid(z_bot, bot_fn, True)
    for k in range(n):  # side walls
        for (a1, a2, b1, b2) in ((t[k][0], t[k + 1][0], b[k][0], b[k + 1][0]), (t[n][k], t[n][k + 1], b[n][k], b[n][k + 1]),
                                 (t[k + 1][n], t[k][n], b[k + 1][n], b[k][n]), (t[0][k + 1], t[0][k], b[0][k + 1], b[0][k])):
            bm.faces.new((a1, b1, b2, a2))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    return ob


def tube(name, pts, r, layer, res=12):
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = r; cu.bevel_resolution = 3
    sp = cu.splines.new("NURBS"); sp.points.add(len(pts) - 1)
    for p, c in zip(sp.points, pts): p.co = (*c, 1)
    sp.use_endpoint_u = True; sp.order_u = 3; cu.use_fill_caps = True; cu.resolution_u = res
    ob = bpy.data.objects.new(name, cu); scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob; ob.select_set(True); bpy.ops.object.convert(target="MESH"); ob.select_set(False)
    return add(ob, layer)


def sphere(name, c, r, layer, scale=(1, 1, 1), seg=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=r, location=c)
    ob = bpy.context.active_object; ob.name = name; ob.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return add(ob, layer)


add(slab("epidermis", 0.0, -EPI, None, lambda x, y: wave(x, y)), "epidermis")
add(slab("papillary_dermis", -EPI, -PAP, lambda x, y: wave(x, y)), "papillary_dermis")
add(slab("reticular_dermis", -PAP, -RET, n=20), "reticular_dermis")
add(slab("hypodermis", -RET, -HYP, n=20), "hypodermis")
# fat lobules packed in the hypodermis, kept clear of the follicle/sweat coil
k = 0
for i in range(6):
    for j in range(6):
        x, y = -H + (i + 0.5) * S / 6 + random.uniform(-4e-4, 4e-4), -H + (j + 0.5) * S / 6 + random.uniform(-4e-4, 4e-4)
        if abs(x + 0.003) < 0.0022 and abs(y) < 0.0022: continue
        sphere(f"fat_lobule_{k:02d}", (x, y, -RET - 0.003 + random.uniform(-6e-4, 6e-4)), 0.0014, "fat_lobules",
               scale=(1, 1, random.uniform(0.8, 1.15))); k += 1
# hair follicle (slanted), bulb, shaft, sebaceous gland, arrector pili
fx = -0.003
top, bot = Vector((fx, 0, 0)), Vector((fx - 0.0016, 0, -RET - 0.0012))
tube("hair_follicle", [top, top.lerp(bot, 0.5), bot], 0.00045, "hair_follicle")
sphere("hair_bulb", bot + Vector((0, 0, -0.0002)), 0.0007, "hair_follicle", scale=(1, 1, 1.3))
tube("hair_shaft", [bot, top, top + Vector((0.0008, 0, 0.004))], 0.00012, "hair")
for n_, (dz, dy) in enumerate(((0.0018, 0.0005), (0.0024, 0.0007), (0.0021, -0.0006))):
    sphere(f"sebaceous_gland_{n_}", top.lerp(bot, dz / RET) + Vector((0.0007, dy, 0)), 0.00045, "sebaceous_gland")
tube("arrector_pili", [top.lerp(bot, 0.45) + Vector((0.0004, 0, 0)), Vector((fx + 0.0022, 0, -PAP + 0.0003))], 0.00012, "arrector_pili")
# eccrine sweat gland: a coil at the dermis/hypodermis border, duct spiralling to the surface
cx, cy, cz = 0.0045, -0.0022, -RET - 0.0005
coil = [(cx + 0.0007 * math.cos(t), cy + 0.0007 * math.sin(t), cz + 0.00012 * t - 0.0006) for t in [i * 0.5 for i in range(36)]]
duct = [(cx + 0.00025 * math.cos(t * 3), cy + 0.00025 * math.sin(t * 3), cz + 0.0005 + (-cz - 0.0005) * t / 6) for t in
        [i * 0.5 for i in range(13)]]
tube("sweat_gland_coil", coil, 0.0002, "sweat_gland", res=4)
tube("sweat_duct", [coil[-1]] + duct, 0.00012, "sweat_gland", res=4)
# vessels: artery + vein across the reticular dermis, capillary loops rising into the papillae
for nm, layer, y, z in (("artery", "artery", -0.0045, -0.0048), ("vein", "vein", -0.0060, -0.0050)):
    tube(nm, [(-H, y, z), (-0.004, y + 0.0006, z + 0.0004), (0.004, y - 0.0004, z - 0.0002), (H, y, z)], 0.00045, layer)
for i in range(7):
    x = -0.0075 + i * 0.0024; y = -0.0045
    tube(f"capillary_loop_{i}", [(x, y, -0.0046), (x, y + 0.0004, -PAP), (x + 0.0002, y + 0.0004, -EPI - 0.00025),
                                 (x + 0.0004, y + 0.0004, -PAP), (x + 0.0004, -0.0060, -0.0049)], 0.00008, "capillaries", res=6)
# melanocytes along the basal layer
for i in range(40):
    x, y = random.uniform(-H + 5e-4, H - 5e-4), random.uniform(-H + 5e-4, H - 5e-4)
    sphere(f"melanocyte_{i:02d}", (x, y, -EPI + wave(x, y) + 0.00008), 0.00011, "melanocytes", seg=8)

# ---- export
ORDER = ["epidermis", "melanocytes", "papillary_dermis", "capillaries", "reticular_dermis", "hair", "hair_follicle",
         "sebaceous_gland", "arrector_pili", "sweat_gland", "artery", "vein", "hypodermis", "fat_lobules"]
cols = {}
for k_ in ORDER:
    c = bpy.data.collections.new(k_); scene.collection.children.link(c); cols[k_] = c
for o, k_ in objs.items():
    for c in o.users_collection: c.objects.unlink(o)
    cols[k_].objects.link(o)
bpy.ops.object.select_all(action="DESELECT")
for o in objs: o.select_set(True)
glb = OUT / "skin_crosssection.glb"
bpy.ops.export_scene.gltf(filepath=str(glb), export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_cameras=False, export_lights=False)
LABEL = {"epidermis": "Epidermis", "melanocytes": "Melanocytes (basal layer)", "papillary_dermis": "Papillary dermis",
         "capillaries": "Capillary loops", "reticular_dermis": "Reticular dermis", "hair": "Hair shaft",
         "hair_follicle": "Hair follicle", "sebaceous_gland": "Sebaceous gland", "arrector_pili": "Arrector pili",
         "sweat_gland": "Sweat gland", "artery": "Arteriole", "vein": "Venule", "hypodermis": "Hypodermis",
         "fat_lobules": "Fat lobules"}
layers = {"file": "skin_crosssection.glb", "units": "m", "up": "Y", "origin": "centre of the skin surface",
          "size": "2 x 2 cm, 1.2 cm deep; epidermis thickened ~8x for legibility", "palette": "placeholder",
          "source": "built from primitives in Blender (original, no third-party assets)",
          "depths_mm": {"epidermis": EPI * 1000, "papillary_dermis": PAP * 1000, "reticular_dermis": RET * 1000, "hypodermis": HYP * 1000},
          "layers": [{"id": k_, "label": LABEL[k_], "order": i, "color": PAL[k_], "default_visible": True,
                      "nodes": sorted(o.name for o, kk in objs.items() if kk == k_)} for i, k_ in enumerate(ORDER)]}
layers["node_count"] = sum(len(l["nodes"]) for l in layers["layers"])
json.dump(layers, open(OUT / "skin_crosssection.layers.json", "w"), indent=1)

# ---- rig + renders
pivot = bpy.data.objects.new("turntable", None); scene.collection.objects.link(pivot)
for o in objs: o.parent = pivot


def light(name, loc, energy, size):
    L = bpy.data.lights.new(name, "AREA"); L.energy = energy; L.size = size
    ob = bpy.data.objects.new(name, L); scene.collection.objects.link(ob); ob.location = loc
    ob.rotation_euler = (Vector((0, 0, -0.006)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()


light("key", (0.04, -0.05, 0.05), 0.12, 0.04); light("fill", (-0.05, -0.04, 0.01), 0.04, 0.06); light("rim", (0, 0.06, 0.04), 0.1, 0.03)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scene.collection.objects.link(cam); cam.data.lens = 60; cam.data.clip_start = 0.001
cam.location = (0.0, -0.055, 0.03); cam.rotation_euler = (Vector((0, 0, -0.006)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.camera = cam
scene.render.engine = "BLENDER_EEVEE"
import sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import render_seq as RS
RS.setup(scene, 720)
RS.turntable(scene, pivot, REN / "skin_turntable", frames=72, start_deg=20)
RS.encode(REN / "skin_turntable", "skin_turntable", 720)
# cutaway: a cutter slides in from the front and takes the front-right quarter of the tissue (closed slabs, so a real
# boolean works here and the cut faces show every layer), exposing follicle, glands, sweat coil and vessels
cut = bpy.data.objects.new("cutter", bpy.data.meshes.new("cutter")); scene.collection.objects.link(cut)
bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bm.transform(Matrix.Translation((0.5 + fx - 0.0025, -0.5, 0))); bm.to_mesh(cut.data); bm.free()
cut.hide_render = True
for o, k_ in objs.items():
    if k_ in ("epidermis", "papillary_dermis", "reticular_dermis", "hypodermis"):
        b = o.modifiers.new("cut", "BOOLEAN"); b.object = cut; b.operation = "DIFFERENCE"; b.solver = "EXACT"
RS.sweep(scene, cut, (0, -0.0125, 0), (0, 0, 0), REN / "skin_cutaway", frames=48, hold=24, pivot=pivot, deg=20)
RS.encode(REN / "skin_cutaway", "skin_cutaway", 720)
for o in objs:
    if "cut" in o.modifiers: o.modifiers.remove(o.modifiers["cut"])
bpy.data.objects.remove(cut, do_unlink=True); pivot.rotation_euler = (0, 0, 0)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "skin_crosssection.blend"), compress=True)
print("NODES", layers["node_count"], "GLB_MB", round(glb.stat().st_size / 1e6, 2))
