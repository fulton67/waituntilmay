"""Gnarls 3D master: Tripo GLB -> normalised mesh -> flat-skin projection bake -> soft + toon looks -> renders + .blend.
blender -b -P project.py -- MODEL.glb OUTDIR FRONT.png LEFT.png BACK.png RIGHT.png
Views follow the turnaround: front = camera on -Y; left = camera on +X (character faces image-left); back = camera on +Y;
right = camera on -X. Each flat image is mapped onto the mesh by matching the figure's bbox in the image (pixels that differ
from the #eeeeee ground) to the mesh's projected bbox in that view. Per-vertex weight = visible(ray to camera) * max(0, n.d)^3."""
import bpy, bmesh, math, os, sys
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index("--") + 1:]
GLB, OUT = argv[0], argv[1]
VIEWS = {"front": (argv[2], Vector((0, -1, 0))), "left": (argv[3], Vector((1, 0, 0))),
         "back": (argv[4], Vector((0, 1, 0))), "right": (argv[5], Vector((-1, 0, 0)))}
os.makedirs(OUT, exist_ok=True)
log = open(os.path.join(OUT, "build_log.txt"), "w")


def P(*a):
    s = " ".join(str(x) for x in a); print(s); log.write(s + "\n"); log.flush()


# ---------- scene ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
bpy.ops.object.select_all(action="DESELECT")
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1: bpy.ops.object.join()
ob = bpy.context.view_layer.objects.active
ob.name = "Gnarls"
bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in list(bpy.context.scene.objects):
    if o != ob: bpy.data.objects.remove(o, do_unlink=True)
me = ob.data


def verts():
    a = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get("co", a); return a.reshape(-1, 3)


def normals():
    a = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get("normal", a); return a.reshape(-1, 3)


def set_verts(v):
    me.vertices.foreach_set("co", v.astype(np.float32).ravel()); me.update()


v = verts()
lo, hi = v.min(0), v.max(0)
v = (v - [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]]) / (hi[2] - lo[2])
set_verts(v)
P("verts", len(v), "faces", len(me.polygons), "extent", np.round(v.max(0) - v.min(0), 3))


# ---------- images ----------
def load(path):
    im = bpy.data.images.load(path, check_existing=True)
    w, h = im.size
    px = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(px)
    return im, px.reshape(h, w, 4)[::-1]  # row 0 = top


def fig_bbox(px):
    d = np.abs(px[..., :3] - np.array([0xee, 0xee, 0xee]) / 255.0).max(2)
    m = d > 0.10
    ys, xs = np.nonzero(m)
    return m, (xs.min(), ys.min(), xs.max(), ys.max())


def basis(d):
    """image right / up in world for a camera at +d looking along -d."""
    fwd = -d; up = Vector((0, 0, 1)); right = fwd.cross(up)
    return np.array(right), np.array(up)


def proj(v, d):
    r, u = basis(d); return np.stack([v @ r, v @ u], 1)


def to_img(v, d, bb, shape):
    p = proj(v, d); h, w = shape; x0, y0, x1, y1 = bb
    px_ = (p[:, 0] - p[:, 0].min()) / np.ptp(p[:, 0]) * (x1 - x0) + x0
    py_ = (1 - (p[:, 1] - p[:, 1].min()) / np.ptp(p[:, 1])) * (y1 - y0) + y0
    return px_, py_


def silhouette(v, d, shape, bb, s=4):
    """vertex splat at 1/s resolution (dense Tripo meshes: ~100k verts) with a 1-px close."""
    px_, py_ = to_img(v, d, bb, shape); h, w = shape[0] // s, shape[1] // s
    m = np.zeros((h, w), bool)
    m[np.clip((py_ / s).astype(int), 0, h - 1), np.clip((px_ / s).astype(int), 0, w - 1)] = True
    acc = m.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            acc |= np.roll(np.roll(m, dy, 0), dx, 1)
    return acc


def small(m, s=4):
    h, w = m.shape[0] // s, m.shape[1] // s
    return m[: h * s, : w * s].reshape(h, s, w, s).any(3).any(1)


imgs = {k: load(p) for k, (p, _) in VIEWS.items()}
masks = {k: fig_bbox(px) for k, (im, px) in imgs.items()}


def iou(a, b): return (a & b).sum() / max(1, (a | b).sum())


# ---------- yaw: silhouettes pick 0/180 vs 90/270; the red/white N picks front vs back ----------
v0 = verts()
scores = {}
for yaw in (0, 90, 180, 270):
    R = np.array(Matrix.Rotation(math.radians(yaw), 3, "Z"))
    vr = v0 @ R.T
    s = 0
    for k in ("front", "left"):
        m, bb = masks[k]
        s += iou(silhouette(vr, VIEWS[k][1], m.shape, bb), small(m))
    scores[yaw] = s / 2
    P("yaw", yaw, "silhouette IoU", round(s / 2, 4))
YAW = max(scores, key=scores.get)
# front/back tie-break with the GLB's own vertex colours / texture is unreliable; use the sign of the glasses: they are the
# frontmost dark-brown geometry, so the side of the mesh with more forward bulge at glasses height is the front.
R = np.array(Matrix.Rotation(math.radians(YAW), 3, "Z")); vr = v0 @ R.T
band = (vr[:, 2] > 0.70) & (vr[:, 2] < 0.85)
front_reach, back_reach = -vr[band, 1].min(), vr[band, 1].max()
P("glasses band reach: -Y", round(float(front_reach), 3), "+Y", round(float(back_reach), 3))
if back_reach > front_reach * 1.05:
    YAW = (YAW + 180) % 360; P("flipped to face -Y")
set_verts(v0 @ np.array(Matrix.Rotation(math.radians(YAW), 3, "Z")).T)
P("chosen yaw", YAW)

# ---------- visibility + weights per view ----------
bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
bvh = BVHTree.FromBMesh(bm)
v = verts(); n = normals()
W = {}
for k, (_, d) in VIEWS.items():
    dn = np.array(d)
    fd = n @ dn
    vis = np.zeros(len(v), bool)
    for i in np.nonzero(fd > -0.05)[0]:
        hit = bvh.ray_cast(Vector(v[i] + n[i] * 2e-3 + dn * 2e-3), d, 10.0)
        vis[i] = hit[0] is None
    W[k] = (np.clip(fd, 0, 1) ** 4 + 1e-4) * vis
    P("view", k, "visible verts", int(vis.sum()))
tot = sum(W.values())
unc = tot < 1e-9
P("verts visible from no view", int(unc.sum()), f"({unc.mean():.2%})")
# hidden verts (inside the sleeve, under the glasses): take the view their normal faces most, ignoring occlusion
fb = np.argmax(np.stack([n @ np.array(VIEWS[k][1]) for k in VIEWS], 1), 1)
for j, k in enumerate(VIEWS):
    W[k] = np.where(unc, (fb == j).astype(float), W[k])
tot = sum(W.values())


def add_uv(name, uv):
    uvl = me.uv_layers.new(name=name)
    li = np.empty(len(me.loops), np.int32); me.loops.foreach_get("vertex_index", li)
    uvl.data.foreach_set("uv", uv[li].astype(np.float32).ravel())


for k, (_, d) in VIEWS.items():
    m, bb = masks[k]; h, w = m.shape
    px_, py_ = to_img(v, d, bb, m.shape)
    add_uv("proj_" + k, np.stack([px_ / w, 1 - py_ / h], 1))
    a = me.color_attributes.new(name="w_" + k, type="FLOAT_COLOR", domain="POINT")
    wn = W[k] / tot
    col = np.repeat(wn[:, None], 4, 1); col[:, 3] = 1
    a.data.foreach_set("color", col.astype(np.float32).ravel())

# bake target: a fresh smart-UV map (Tripo's atlas is fine too, but a clean map makes the albedo editable by hand)
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
before = set(l.name for l in me.uv_layers)
bpy.ops.mesh.uv_texture_add()
new = [l for l in me.uv_layers if l.name not in before][0]; new.name = "albedo_uv"
me.uv_layers.active = new
bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.004)
bpy.ops.object.mode_set(mode="OBJECT")
new.active_render = True
P("bake target uv", new.name)

# ---------- projection material -> bake ----------
mat = bpy.data.materials.new("proj"); mat.use_nodes = True
nt = mat.node_tree; nt.nodes.clear()
outn = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission")
nt.links.new(em.outputs[0], outn.inputs["Surface"])
acc = None
for k in VIEWS:
    uvn = nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = "proj_" + k
    tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = imgs[k][0]; tex.extension = "EXTEND"
    att = nt.nodes.new("ShaderNodeAttribute"); att.attribute_name = "w_" + k
    nt.links.new(uvn.outputs[0], tex.inputs[0])
    mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs[0].default_value = 1.0
    nt.links.new(tex.outputs[0], mul.inputs[6]); nt.links.new(att.outputs["Fac"], mul.inputs[7])
    if acc is None:
        acc = mul
    else:
        add = nt.nodes.new("ShaderNodeMix"); add.data_type = "RGBA"; add.blend_type = "ADD"; add.inputs[0].default_value = 1.0
        nt.links.new(acc.outputs[2], add.inputs[6]); nt.links.new(mul.outputs[2], add.inputs[7]); acc = add
nt.links.new(acc.outputs[2], em.inputs[0])
bake_img = bpy.data.images.new("gnarls_albedo", 4096, 4096, alpha=False)
tn = nt.nodes.new("ShaderNodeTexImage"); tn.image = bake_img; nt.nodes.active = tn
me.materials.clear(); me.materials.append(mat)
sc = bpy.context.scene
sc.render.engine = "CYCLES"; sc.cycles.samples = 4
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for t in ("OPTIX", "CUDA"):
        try:
            prefs.compute_device_type = t; prefs.get_devices(); break
        except Exception: pass
    for dv in prefs.devices: dv.use = True
    sc.cycles.device = "GPU"
except Exception as e:
    P("gpu setup", e)
sc.render.bake.margin = 16
bpy.ops.object.bake(type="EMIT", uv_layer="albedo_uv")
bake_img.filepath_raw = os.path.join(OUT, "gnarls_albedo_raw.png"); bake_img.file_format = "PNG"; bake_img.save()
P("baked", bake_img.filepath_raw)


# ---------- palette snap: every texel -> nearest flat colour (k-means of the flat skins), guide colours where they match ----------
def srgb_to_lab(c):
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ M.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


samp = []
for k, (im, px) in imgs.items():
    m = masks[k][0]
    samp.append(px[..., :3][m][:: max(1, m.sum() // 40000)])
samp = np.concatenate(samp)
rng = np.random.default_rng(0)
GUIDE = {"body": "909faa", "light": "c1c7ca", "red": "ed1d2f", "white": "f4f4f4", "brown": "5e2818", "lens": "abb9c0",
         "ink": "100f0d", "tusk": "d5dce5", "groove": "9db5c1"}
g_rgb = np.array([[int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)] for h in GUIDE.values()])
g_lab = srgb_to_lab(g_rgb)
lab_s = srgb_to_lab(samp)
K = len(GUIDE) + 6
cent = np.concatenate([g_lab, lab_s[rng.choice(len(lab_s), 6, replace=False)]])
for _ in range(30):
    lab_idx = np.argmin(((lab_s[:, None] - cent[None]) ** 2).sum(2), 1)
    for j in range(len(GUIDE), K):  # guide colours stay fixed; only the free clusters move
        if (lab_idx == j).any(): cent[j] = lab_s[lab_idx == j].mean(0)
rgb_c = np.array([samp[lab_idx == j].mean(0) if (lab_idx == j).any() else g_rgb[min(j, len(g_rgb) - 1)] for j in range(K)])
for j in range(K):
    dE = np.sqrt(((g_lab - cent[j]) ** 2).sum(1)); g = int(np.argmin(dE))
    if dE[g] < 12: rgb_c[j] = g_rgb[g]
    P("palette", j, "#%02x%02x%02x" % tuple((rgb_c[j] * 255).astype(int)), "share", round(float((lab_idx == j).mean()), 3),
      "-> guide " + list(GUIDE)[g] if dE[g] < 12 else "(kept)", "dE", round(float(dE[g]), 1))
W2, H2 = bake_img.size
pix = np.empty(W2 * H2 * 4, np.float32); bake_img.pixels.foreach_get(pix); pix = pix.reshape(-1, 4)
lab_p = srgb_to_lab(np.clip(pix[:, :3], 0, 1))
idx = np.empty(len(pix), np.int32)
for a in range(0, len(pix), 1 << 20):
    idx[a:a + (1 << 20)] = np.argmin(((lab_p[a:a + (1 << 20), None] - cent[None]) ** 2).sum(2), 1)
pix[:, :3] = rgb_c[idx]
bake_img.pixels.foreach_set(pix.ravel())
bake_img.filepath_raw = os.path.join(OUT, "gnarls_albedo.png"); bake_img.save()
P("palette-snapped albedo saved")


# ---------- looks ----------
def tex_node(t_, uvname="albedo_uv"):
    uvn = t_.nodes.new("ShaderNodeUVMap"); uvn.uv_map = uvname
    t = t_.nodes.new("ShaderNodeTexImage"); t.image = bake_img
    t_.links.new(uvn.outputs[0], t.inputs[0]); return t


def soft_mat():
    m = bpy.data.materials.new("gnarls_soft"); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    t = tex_node(m.node_tree); m.node_tree.links.new(t.outputs[0], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.78
    b.inputs["Specular IOR Level"].default_value = 0.18
    return m


def toon_mat():
    m = bpy.data.materials.new("gnarls_toon"); m.use_nodes = True; t_ = m.node_tree; t_.nodes.clear()
    o = t_.nodes.new("ShaderNodeOutputMaterial"); dif = t_.nodes.new("ShaderNodeBsdfDiffuse")
    s2r = t_.nodes.new("ShaderNodeShaderToRGB"); ramp = t_.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    ramp.color_ramp.elements[0].position = 0.0; ramp.color_ramp.elements[0].color = (0.62, 0.62, 0.62, 1)
    ramp.color_ramp.elements[1].position = 0.18; ramp.color_ramp.elements[1].color = (0.85, 0.85, 0.85, 1)
    e = ramp.color_ramp.elements.new(0.55); e.color = (1, 1, 1, 1)
    tex = tex_node(t_)
    mul = t_.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs[0].default_value = 1
    emi = t_.nodes.new("ShaderNodeEmission")
    t_.links.new(dif.outputs[0], s2r.inputs[0]); t_.links.new(s2r.outputs[0], ramp.inputs[0])
    t_.links.new(tex.outputs[0], mul.inputs[6]); t_.links.new(ramp.outputs[0], mul.inputs[7])
    t_.links.new(mul.outputs[2], emi.inputs[0]); t_.links.new(emi.outputs[0], o.inputs["Surface"])
    return m


SOFT, TOON = soft_mat(), toon_mat()
ink = bpy.data.materials.new("ink"); ink.use_nodes = True; it = ink.node_tree; it.nodes.clear()
io = it.nodes.new("ShaderNodeOutputMaterial"); ie = it.nodes.new("ShaderNodeEmission")
ie.inputs[0].default_value = (0.0056, 0.0052, 0.0042, 1)  # #100f0d in linear
it.links.new(ie.outputs[0], io.inputs["Surface"])
ink.use_backface_culling = True
me.materials.clear(); me.materials.append(SOFT); me.materials.append(ink)
sol = ob.modifiers.new("outline", "SOLIDIFY")
sol.thickness = 0.015; sol.offset = 1.0; sol.use_flip_normals = True; sol.material_offset = 1; sol.use_rim = False
sol.show_render = False; sol.show_viewport = False

# ---------- lights, camera, render ----------
world = bpy.data.worlds.new("w"); sc.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.9, 0.9, 0.92, 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.75


def light(name, rot, energy, size=5):
    l = bpy.data.lights.new(name, "SUN"); l.energy = energy; l.angle = math.radians(size)
    o = bpy.data.objects.new(name, l); sc.collection.objects.link(o); o.rotation_euler = [math.radians(a) for a in rot]


light("key", (50, 0, -35), 2.2, 30); light("fill", (65, 0, 70), 0.7, 60); light("rim", (110, 0, 180), 1.2, 15)
cam_d = bpy.data.cameras.new("cam"); cam_d.type = "ORTHO"; cam_d.ortho_scale = 1.18
cam = bpy.data.objects.new("cam", cam_d); sc.collection.objects.link(cam); sc.camera = cam
sc.render.engine = "BLENDER_EEVEE"; sc.render.resolution_x = 1200; sc.render.resolution_y = 1500
sc.render.film_transparent = True
sc.view_settings.view_transform = "Standard"


def shoot(name, yaw_deg, elev_deg=4):
    """yaw 0 = camera on -Y (front); +yaw orbits toward +X (the body turns to the viewer's LEFT). The primary mark's ¾
    (body turned to the viewer's right) is yaw -35."""
    a, e = math.radians(yaw_deg), math.radians(elev_deg)
    tgt = Vector((0, 0, 0.5))
    pos = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))) * 5 + tgt
    cam.location = pos
    cam.rotation_euler = (tgt - pos).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.path.join(OUT, name + ".png"); bpy.ops.render.render(write_still=True)


for look in ("soft", "toon"):
    me.materials[0] = SOFT if look == "soft" else TOON
    sol.show_render = False
    for nm, yw in (("q34", -35), ("front", 0), ("left", 90), ("back", 180), ("right", -90)):
        shoot(f"{look}_{nm}", yw)
me.materials[0] = SOFT; sol.show_render = False
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "gnarls_master.blend"))
P("saved blend; done")
