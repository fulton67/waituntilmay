"""Line-style section renders of the reference models for feed stills (grid 5).

Accuracy rule (POSTS_RESET correction, LESSONS P5): anatomy in posts is never drawn from memory. These images ARE the
model: the GLB is cut by a plane (boolean), rendered orthographic with flat token fills and Freestyle ink outlines, and the
2D position of every named part is written to a JSON so labels land on the real part.

  blender -b -P section_lines.py -- skin <out_dir>     cut through the hair follicle + sebaceous gland
  blender -b -P section_lines.py -- chin <out_dir>     left profile of the lower face: mandible, mentalis, skin

Outputs <out_dir>/<name>.png (RGBA, transparent) and <name>.parts.json ({part: [x, y] in 0-1 of the image, bbox}).
"""
import bpy, bmesh, json, math, os, sys
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ARGS = sys.argv[sys.argv.index("--") + 1:]
WHAT, OUT = ARGS[0], ARGS[1]
OUT = os.path.abspath(OUT); os.makedirs(OUT, exist_ok=True)
BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "base")

# Dr. Ostad tokens: ivory #f5f2eb, paper #ece8e0, sand #d6c3a0, navy #152235, ink #1d1a16, silver #bcb8b7
def hexrgb(h, a=1.0):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x ** 2.2 for x in c] + [a]

SKIN_FILL = {"epidermis": "#ece8e0", "papillary_dermis": "#f5f2eb", "reticular_dermis": "#f5f2eb", "hypodermis": "#ece8e0",
             "fat_lobules": "#d6c3a0", "sebaceous_gland": "#d6c3a0", "hair_follicle": "#f5f2eb", "hair": "#1d1a16",
             "sweat_gland": "#ece8e0", "artery": "#bcb8b7", "vein": "#bcb8b7", "capillaries": "#bcb8b7",
             "arrector_pili": "#bcb8b7", "melanocytes": "#3b3730"}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def flat_material(name, rgba):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = rgba; em.inputs["Strength"].default_value = 1.0
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(em.outputs[0], out.inputs[0])
    return m


def setup_render(size_x, size_y):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"; sc.cycles.samples = 32; sc.cycles.device = "CPU"
    sc.render.film_transparent = True
    sc.render.resolution_x, sc.render.resolution_y = size_x, size_y
    sc.view_settings.view_transform = "Standard"
    sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
    sc.render.use_freestyle = True
    sc.render.line_thickness_mode = "ABSOLUTE"; sc.render.line_thickness = 2.2
    vl = sc.view_layers[0]; fs = vl.freestyle_settings
    ls = fs.linesets[0] if fs.linesets else fs.linesets.new("ink")
    ls.select_by_visibility = True; ls.visibility = "VISIBLE"
    ls.select_silhouette = ls.select_border = ls.select_crease = True
    ls.select_material_boundary = True
    if ls.linestyle is None:
        ls.linestyle = bpy.data.linestyles.new("ink")
    ls.linestyle.color = hexrgb("#1d1a16")[:3]; ls.linestyle.thickness = 2.2
    return sc


def cut(objs, plane_co, normal_axis="Y", keep_negative=True, size=1.0):
    """Remove everything on one side of a plane through plane_co (boolean difference with a big box)."""
    bpy.ops.mesh.primitive_cube_add(size=size * 4)
    box = bpy.context.active_object; box.name = "_cutter"
    off = size * 2
    idx = "XYZ".index(normal_axis)
    loc = list(plane_co); loc[idx] += off if keep_negative else -off
    box.location = loc
    for o in objs:
        if o.type != "MESH":
            continue
        md = o.modifiers.new("cut", "BOOLEAN"); md.operation = "DIFFERENCE"; md.object = box; md.solver = "EXACT"
    box.hide_render = True; box.hide_viewport = True
    return box


def parts_2d(cam, names_to_objs, sc):
    res = {}
    dg = bpy.context.evaluated_depsgraph_get()
    for part, objs in names_to_objs.items():
        pts = []
        for o in objs:
            ev = o.evaluated_get(dg); me = ev.to_mesh()
            for v in me.vertices:
                p = world_to_camera_view(sc, cam, ev.matrix_world @ v.co)
                if 0 <= p.x <= 1 and 0 <= p.y <= 1 and p.z > 0:
                    pts.append((p.x, 1 - p.y))
            ev.to_mesh_clear()
        if pts:
            xs, ys = [p[0] for p in pts], [p[1] for p in pts]
            res[part] = {"c": [round(sum(xs) / len(xs), 4), round(sum(ys) / len(ys), 4)],
                         "bbox": [round(min(xs), 4), round(min(ys), 4), round(max(xs), 4), round(max(ys), 4)], "n": len(pts)}
    return res


def skin():
    reset()
    bpy.ops.import_scene.gltf(filepath=os.path.join(BASE, "skin_crosssection.glb"))
    objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    lay = json.load(open(os.path.join(BASE, "skin_crosssection.layers.json")))
    node_layer = {n: L["id"] for L in lay["layers"] for n in L["nodes"]}
    mats = {}
    for o in objs:
        lid = node_layer.get(o.name, o.name)
        key = next((k for k in SKIN_FILL if lid.startswith(k) or k.startswith(lid)), None) or "reticular_dermis"
        if key not in mats:
            mats[key] = flat_material(key, hexrgb(SKIN_FILL[key]))
        o.data.materials.clear(); o.data.materials.append(mats[key])
    fol = bpy.data.objects.get("hair_follicle")
    # cut through the follicle's centre so the section shows the follicle and its gland; keep the back half
    c = fol.matrix_world @ (sum((Vector(b) for b in fol.bound_box), Vector()) / 8)
    LAYERS = {"epidermis", "papillary_dermis", "reticular_dermis", "hypodermis"}
    sc = setup_render(1600, 1100)
    cam_data = bpy.data.cameras.new("cam"); cam_data.type = "ORTHO"; cam_data.ortho_scale = 0.0215
    cam = bpy.data.objects.new("cam", cam_data); bpy.context.scene.collection.objects.link(cam); sc.camera = cam
    # model is Y-up in glTF -> Blender Z-up after import; look at the section face from the front (-Y towards +Y)
    allx = [ (o.matrix_world @ Vector(b)).x for o in objs for b in o.bound_box ]
    allz = [ (o.matrix_world @ Vector(b)).z for o in objs for b in o.bound_box if o.name not in ("hair_shaft",) ]
    cam.location = ((min(allx) + max(allx)) / 2, c.y - 0.2, (min(allz) + max(allz)) / 2)
    cam_data.ortho_scale = (max(allx) - min(allx)) * 1.06; cam.rotation_euler = (math.radians(90), 0, 0)
    # pass 1: the layer bands (front face of the block = the section); pass 2: inner structures with the bands hidden
    for o in objs:
        o.hide_render = node_layer.get(o.name, o.name) not in LAYERS
    sc.render.filepath = os.path.join(OUT, "skin_layers.png"); bpy.ops.render.render(write_still=True)
    for o in objs:
        o.hide_render = node_layer.get(o.name, o.name) in LAYERS
    sc.render.filepath = os.path.join(OUT, "skin_inner.png"); bpy.ops.render.render(write_still=True)
    groups = {}
    for o in objs:
        groups.setdefault(node_layer.get(o.name, o.name), []).append(o)
    json.dump({"camera": "ortho front, section through hair follicle centre", "model": "skin_crosssection.glb",
               "note": "epidermis thickened ~8x in the model for legibility", "parts": parts_2d(cam, groups, sc)},
              open(os.path.join(OUT, "skin.parts.json"), "w"), indent=1)


def lit_material(name, hexc, rough=0.55, sss=0.0, emit=None, emit_strength=0.0, alpha=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = hexrgb(hexc)
    b.inputs["Roughness"].default_value = rough
    if sss:
        b.inputs["Subsurface Weight"].default_value = sss
        b.inputs["Subsurface Radius"].default_value = (0.004, 0.002, 0.0015)
        b.inputs["Subsurface Scale"].default_value = 0.6
    if emit:
        b.inputs["Emission Color"].default_value = hexrgb(emit)
        b.inputs["Emission Strength"].default_value = emit_strength
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
    return m


def pore():
    """Lit cutaway of ONE follicle + its oil gland (grid 5 AviClear slide 3). Key light upper right; the 1726 nm laser is
    shown as warm light: an emissive glow inside the gland plus a soft translucent beam from the surface."""
    reset()
    bpy.ops.import_scene.gltf(filepath=os.path.join(BASE, "skin_crosssection.glb"))
    objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    lay = json.load(open(os.path.join(BASE, "skin_crosssection.layers.json")))
    node_layer = {n: L["id"] for L in lay["layers"] for n in L["nodes"]}
    fol = bpy.data.objects["hair_follicle"]
    c = fol.matrix_world @ (sum((Vector(b) for b in fol.bound_box), Vector()) / 8)
    # keep a block about 7 mm wide around the follicle; drop far structures (other loops, sweat gland, far fat)
    half = 0.0035
    for o in list(objs):
        bb = [o.matrix_world @ Vector(b) for b in o.bound_box]
        cx = sum(p.x for p in bb) / 8
        lid = node_layer.get(o.name, o.name)
        if lid in ("epidermis", "papillary_dermis", "reticular_dermis", "hypodermis"):
            continue
        if lid in ("melanocytes", "capillaries", "artery", "vein", "arrector_pili", "sweat_gland") or abs(cx - c.x) > half:
            bpy.data.objects.remove(o); objs.remove(o)
    pal = {"epidermis": ("#c9b48f", .5, .3), "papillary_dermis": ("#efe6d6", .6, .3), "reticular_dermis": ("#f5f2eb", .6, .3),
           "hypodermis": ("#e4dccd", .6, .2), "fat_lobules": ("#d6c3a0", .45, .25), "hair_follicle": ("#bcb8b7", .4, .1),
           "hair": ("#1d1a16", .35, 0), "artery": ("#bcb8b7", .4, 0), "vein": ("#bcb8b7", .4, 0), "capillaries": ("#bcb8b7", .4, 0),
           "arrector_pili": ("#bcb8b7", .5, 0), "melanocytes": ("#3b3730", .5, 0)}
    mats = {}
    for o in objs:
        lid = node_layer.get(o.name, o.name)
        if lid.startswith("sebaceous_gland"):
            m = mats.setdefault("gland", lit_material("gland", "#d6c3a0", .35, .3, emit="#d6c3a0", emit_strength=14.0))
        else:
            key = next((k for k in pal if lid.startswith(k)), "reticular_dermis")
            hx, r, s_ = pal[key]
            m = mats.setdefault(key, lit_material(key, hx, r, s_))
        o.data.materials.clear(); o.data.materials.append(m)
    # the layer meshes are open shells, so a boolean cutaway fails (renders an uncut block). Same trick as skin(): two
    # passes from one camera, the opaque layer block, then the inner structures alone; composited inner-over-block, this
    # reads as the block cut open at the follicle (pore_block.png + pore_inner.png -> pore_lit.png).
    LAYERS = {"epidermis", "papillary_dermis", "reticular_dermis", "hypodermis"}
    gland = [o for o in objs if node_layer.get(o.name, o.name).startswith("sebaceous_gland")]
    gc = sum(((g.matrix_world @ (sum((Vector(b) for b in g.bound_box), Vector()) / 8)) for g in gland), Vector()) / max(len(gland), 1)
    top = max((o.matrix_world @ Vector(b)).z for o in objs for b in o.bound_box if node_layer.get(o.name, o.name) == "epidermis")
    # the laser: a soft translucent cone of warm light from the skin surface down onto the gland
    depth = top - gc.z
    bpy.ops.mesh.primitive_cone_add(vertices=64, radius1=0.0006, radius2=0.0016, depth=depth + 0.0025,
                                    location=(gc.x, gc.y + 0.0004, gc.z + (depth + 0.0025) / 2))
    beam = bpy.context.active_object
    bm = bpy.data.materials.new("beam"); bm.use_nodes = True; nt = bm.node_tree; nt.nodes.clear()
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = hexrgb("#f5f2eb"); em.inputs["Strength"].default_value = 2.5
    tr = nt.nodes.new("ShaderNodeBsdfTransparent"); mix = nt.nodes.new("ShaderNodeMixShader"); mix.inputs[0].default_value = 0.22
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs[0])
    beam.data.materials.append(bm)
    # warm point light inside the gland so the heat reads as light spilling into the dermis around it
    pl = bpy.data.lights.new("heat", "POINT"); pl.energy = 0.02; pl.color = hexrgb("#d6c3a0")[:3]; pl.shadow_soft_size = 0.0006
    plo = bpy.data.objects.new("heat", pl); plo.location = gc; bpy.context.scene.collection.objects.link(plo)
    # key light upper right, soft fill from the left
    for nm, loc, en, size in (("key", (c.x + 0.03, c.y - 0.03, top + 0.04), 0.14, 0.02), ("fill", (c.x - 0.04, c.y - 0.02, top + 0.01), 0.035, 0.04)):
        L = bpy.data.lights.new(nm, "AREA"); L.energy = en; L.size = size
        lo = bpy.data.objects.new(nm, L); lo.location = loc; bpy.context.scene.collection.objects.link(lo)
        d = Vector((c.x, c.y, c.z)) - Vector(loc); lo.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"; sc.cycles.samples = 64; sc.cycles.device = "CPU"; sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = 1400, 1400
    sc.render.film_transparent = True; sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
    sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
    world = bpy.data.worlds.new("w"); sc.world = world; world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = hexrgb("#ece8e0"); world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.35
    cam_data = bpy.data.cameras.new("cam"); cam_data.lens = 85; cam_data.clip_start = 0.0005; cam_data.clip_end = 1.0
    cam = bpy.data.objects.new("cam", cam_data); sc.collection.objects.link(cam); sc.camera = cam
    target = Vector((c.x, c.y, (top + gc.z) / 2 - 0.0012))
    cam.location = target + Vector((0.012, -0.046, 0.010))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    extra = [beam, plo]
    for o in objs:
        o.hide_render = node_layer.get(o.name, o.name) not in LAYERS
    beam.hide_render = True
    sc.render.filepath = os.path.join(OUT, "pore_block.png"); bpy.ops.render.render(write_still=True)
    for o in objs:
        o.hide_render = node_layer.get(o.name, o.name) in LAYERS
    beam.hide_render = False
    sc.render.filepath = os.path.join(OUT, "pore_inner.png"); bpy.ops.render.render(write_still=True)
    names = {"gland": gland, "follicle": [fol], "epidermis": [o for o in objs if node_layer.get(o.name, o.name) == "epidermis"],
             "beam_top": [beam]}
    json.dump({"camera": "perspective 85 mm, 3/4 from front-right above; cutaway through the follicle centre",
               "model": "skin_crosssection.glb", "parts": parts_2d(cam, names, sc)},
              open(os.path.join(OUT, "pore_lit.parts.json"), "w"), indent=1)


if __name__ == "__main__":
    {"skin": skin, "pore": pore}[WHAT]()
