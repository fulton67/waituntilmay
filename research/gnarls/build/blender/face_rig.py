"""A real face rig for Gnarls: every feature is its own shape, deformed by controls, so expressions animate with true
in-betweens instead of swapping pictures.
blender -b gnarls_rig.blend --factory-startup -P face_rig.py -- gen/face_features.json OUT.blend

Features (measured from the neutral front skin, gen/face_features.json, converted to 3D with the proj_front mapping):
- per eye: pupil + highlight; per side: brow;
- mouth: ink outline, dark interior, teeth band, tongue.
Each is a strip mesh (top edge / bottom edge over x) with shape keys, shrinkwrapped onto the head and parented to the head
bone. Because every shape (round pupil, ^ closed arc, flat closed line, D-shaped open mouth, O) has the same vertex
layout, any mix of keys is a valid in-between.

Controls (custom properties on the armature, all keyable, all driving shape keys):
  brow_raise_L/R  brow_angry_L/R (negative = sad)     blink_L/R  happy_L/R (^ eyes)  squint_L/R
  pupil_small  sparkle  look_x  look_z                mouth_open  mouth_smile (negative = frown)  mouth_wide
  mouth_round (O)  mouth_smirk
Expressions are presets of these values (scene["gnarls_face_presets"]: EYES + MOUTH parts, so any eyes go with any
mouth). The picture-swap decals are blanked (atlas cell 14 = plain face), and the existing pose / expression-sheet frames
are re-keyed with the presets. Render from a freshly opened file (drivers, see rig.py)."""
import json, math, sys
import bpy
import numpy as np
from mathutils import Vector

A = sys.argv[sys.argv.index("--") + 1:]
FEAT, OUT = A[0], A[1]
F = json.load(open(FEAT)); IW, IH = F["size"]
sc = bpy.context.scene
arm = next(o for o in sc.objects if o.type == "ARMATURE")
ob = bpy.data.objects["Gnarls"]; me = ob.data
arm.data.pose_position = "REST"; bpy.context.view_layer.update()

# ---- px (front skin) -> head-space (x, z), from the mesh's own proj_front UVs ----
nv = len(me.vertices)
co = np.empty(nv * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
lv = np.empty(len(me.loops), np.int64); me.loops.foreach_get("vertex_index", lv)
uv = np.empty(len(me.loops) * 2); me.uv_layers["proj_front"].data.foreach_get("uv", uv); uv = uv.reshape(-1, 2)
fm = np.empty(nv, np.float32); me.attributes["face_mask"].data.foreach_get("value", fm)
cy = float(np.median(co[:, 1]))
sel = (fm[lv] > 0.5) & (co[lv][:, 1] < cy)
X = np.c_[co[lv][sel][:, 0], co[lv][sel][:, 2], np.ones(sel.sum())]
M, *_ = np.linalg.lstsq(X, uv[sel], rcond=None)
Am = np.array([[M[0, 0], M[1, 0]], [M[0, 1], M[1, 1]]]); Ai = np.linalg.inv(Am)
J = Ai @ np.diag([1 / IW, -1 / IH])  # (d px, d py-down) -> (dx, dz)


def px2xz(px, py):
    return Ai @ (np.array([px / IW, 1 - py / IH]) - M[2])


print("px->units: 1 px =", round(float(abs(J[0, 0])), 5), "x,", round(float(abs(J[1, 1])), 5), "z")
y_front = float(co[:, 1].min()) - 0.06

# ---- shape builders: everything in px offsets from the feature centre, y UP ----
NS = 24
U = np.linspace(-1, 1, NS + 1)


def strip(xs, top, bot):
    return np.concatenate([np.c_[xs, top], np.c_[xs, bot]])  # verts 0..NS top, NS+1.. bottom


def ellipse(a, b, cx=0.0, cy_=0.0):
    s = np.sqrt(np.clip(1 - U ** 2, 0, 1))
    return strip(cx + U * a, cy_ + b * s, cy_ - b * s)


def eye_shapes(e):
    a, b = e["rx"], e["ry"]
    s = np.sqrt(np.clip(1 - U ** 2, 0, 1)); q = 1 - U ** 2
    base = ellipse(a, b)
    tk = 0.24 * b * (0.45 + 0.55 * s)
    mid = -0.05 * b + 0.42 * b * q  # ^ arc
    happy = strip(U * 1.12 * a, mid + tk / 2, mid - tk / 2)
    tk2 = 0.17 * b * (0.4 + 0.6 * s)
    mid2 = -0.30 * b - 0.14 * b * q  # relaxed closed line
    blink = strip(U * 1.08 * a, mid2 + tk2 / 2, mid2 - tk2 / 2)
    sq = base.copy(); top = sq[:NS + 1, 1]; cap = 0.12 * b; sq[:NS + 1, 1] = np.where(top > cap, cap + (top - cap) * 0.2, top)
    small = base * 0.62
    lx = base.copy(); lx[:, 0] += 0.32 * a
    lz = base.copy(); lz[:, 1] += 0.28 * b
    return base, {"happy": happy, "blink": blink, "squint": sq, "small": small, "look_x": lx, "look_z": lz}


def hl_shapes(e):
    a, b = e["rx"], e["ry"]
    dx, dy, r = e["hl"] if e["hl"] else (0.35 * a, -0.45 * b, 0.27 * a)
    hx, hy = dx, -dy
    base = ellipse(r, r, hx, hy)
    hide = strip(np.full(NS + 1, hx) + U * 1e-3, np.full(NS + 1, hy), np.full(NS + 1, hy))
    R = 2.3 * r; prof = R * (1 - np.abs(U)) ** 2.6 + 0.04 * R  # 4-point sparkle
    sparkle = strip(hx * 0.6 + U * R, hy * 0.6 + prof, hy * 0.6 - prof)
    small = ellipse(r * 0.75, r * 0.75, hx * 0.62, hy * 0.62)
    lx = base.copy(); lx[:, 0] += 0.32 * a
    lz = base.copy(); lz[:, 1] += 0.28 * b
    return base, {"hide": hide, "sparkle": sparkle, "small": small, "look_x": lx, "look_z": lz}


def brow_shapes(br, side):
    hw, t = br["hw"], br["t"] * 1.3
    arch = br["curve"] * hw * hw
    q = 1 - U ** 2; s = np.sqrt(np.clip(q, 0, 1))
    mid = arch * q - arch * 0.5
    th = t * (0.3 + 0.7 * s ** 0.6)
    base = strip(U * hw, mid + th / 2, mid - th / 2)
    inner = -1.0 if side == "L" else 1.0  # image x of the brow's inner end (towards the nose)
    raise_ = base.copy(); raise_[:, 1] += 0.55 * hw * 0.42
    ang = base.copy(); ang[:, 1] += -0.42 * ang[:, 0] * inner - 0.10 * hw  # inner end down, outer up, a bit lower
    return base, {"raise": raise_, "angry": ang}


m0 = F["mouth"]; HW, T0 = m0["hw"], max(m0["t"], 7.0)


def mouth_edges(o=0.0, s=0.0, wd=0.0, k=0.0):
    xc = HW * (1 + 0.7 * wd + 0.45 * o)  # opening also widens, as drawn (laugh ~2.5x the neutral width)
    xs = U * xc; q = 1 - U ** 2
    c = -s * 0.27 * HW * q + k * 0.2 * HW * U
    th = T0 * (0.45 + 0.55 * np.sqrt(np.clip(q, 0, 1)))
    T = c + th / 2 + o * 0.10 * xc * q ** 0.8
    B = c - th / 2 - o * 1.25 * xc * q ** 0.7
    return xs, T, B


def mouth_round():
    rx, ry, c0 = 0.95 * HW, 1.25 * HW, -0.7 * HW
    s = np.sqrt(np.clip(1 - U ** 2, 0, 1))
    return U * rx, c0 + ry * s, c0 - ry * s


INK = 3.5


def mouth_set(xs, T, B):
    gap = np.maximum(T - B - T0, 0)
    q = 1 - U ** 2
    ink = strip(xs * (1 + INK / max(abs(xs).max(), 1)), T + INK, B - INK)
    fill = strip(xs, T, B)
    teeth = strip(xs * 0.96, T - 0.35 * T0, T - 0.35 * T0 - 0.30 * gap)
    tongue_top = B + 0.30 * T0 + 0.42 * gap * np.sqrt(np.clip(q, 0, 1))
    tongue = strip(xs * 0.78, tongue_top, B + 0.30 * T0)
    return {"mouth_ink": ink, "mouth_fill": fill, "mouth_teeth": teeth, "mouth_tongue": tongue}


MB = mouth_set(*mouth_edges())
MK = {"open": mouth_set(*mouth_edges(o=1)), "smile": mouth_set(*mouth_edges(s=1)),
      "wide": mouth_set(*mouth_edges(wd=1)), "smirk": mouth_set(*mouth_edges(k=1))}
ro, op = mouth_set(*mouth_round()), MK["open"]
MK["round"] = {n: MB[n] + (ro[n] - op[n]) for n in MB}  # open + round = O

# ---- materials ----
def lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c) + (1,)


def emat(name, hexc):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True; N = m.node_tree.nodes; N.clear()
    e = N.new("ShaderNodeEmission"); e.inputs["Color"].default_value = lin(hexc)
    o = N.new("ShaderNodeOutputMaterial"); m.node_tree.links.new(e.outputs[0], o.inputs["Surface"]); return m


MAT = {"pupil": emat("face_pupil", "141418"), "hl": emat("face_highlight", "ffffff"), "brow": emat("face_brow", "1c1816"),
       "mouth_ink": emat("face_ink", "100f0d"), "mouth_fill": emat("face_mouth", "5a1620"),
       "mouth_teeth": emat("face_teeth", "f7f5ef"), "mouth_tongue": emat("face_tongue", "e46f7b")}

# ---- controls on the armature ----
CTRL = {}
for side in ("L", "R"):
    for k in ("brow_raise", "brow_angry"): CTRL[f"{k}_{side}"] = (-1.0, 1.0)
    for k in ("blink", "happy", "squint"): CTRL[f"{k}_{side}"] = (0.0, 1.0)
for k, r in (("pupil_small", (0, 1)), ("sparkle", (0, 1)), ("look_x", (-1, 1)), ("look_z", (-1, 1)), ("mouth_open", (0, 1)),
             ("mouth_smile", (-1, 1)), ("mouth_wide", (-1, 1)), ("mouth_round", (0, 1)), ("mouth_smirk", (-1, 1))):
    CTRL[k] = tuple(map(float, r))
for k, (lo, hi) in CTRL.items():
    arm[k] = 0.0; arm.id_properties_ui(k).update(min=lo, max=hi, soft_min=lo, soft_max=hi, description="face control")

# ---- build feature objects ----
head_bone = "head"
col = bpy.data.collections.new("face"); sc.collection.children.link(col)
made = []


def build(name, centre_px, base, keys, mat, offset, drivers):
    cx, cz = px2xz(*centre_px)
    def to3(P): d = (J @ np.c_[P[:, 0], -P[:, 1]].T).T; return [(float(x), 0.0, float(z)) for x, z in d]
    faces = [(i, i + 1, NS + 2 + i, NS + 1 + i) for i in range(NS)]
    mesh = bpy.data.meshes.new(name); mesh.from_pydata(to3(base), [], faces); mesh.update()
    o = bpy.data.objects.new(name, mesh); col.objects.link(o); o.location = (cx, y_front, cz)
    mesh.materials.append(mat)
    o.shape_key_add(name="Basis")
    for kn, P in keys.items():
        kb = o.shape_key_add(name=kn, from_mix=False)
        kb.data.foreach_set("co", np.array(to3(P), np.float32).ravel())
        kb.slider_min = -1.0
        expr, vars_ = drivers[kn]
        d = kb.driver_add("value").driver; d.type = "SCRIPTED"; d.expression = expr
        for vn, prop in vars_.items():
            v = d.variables.new(); v.name = vn; v.type = "SINGLE_PROP"; v.targets[0].id = arm; v.targets[0].data_path = f'["{prop}"]'
    sw = o.modifiers.new("onto_head", "SHRINKWRAP"); sw.target = ob; sw.wrap_method = "PROJECT"
    sw.use_project_x = sw.use_project_z = False; sw.use_project_y = True
    sw.use_negative_direction = False; sw.use_positive_direction = True; sw.offset = offset; sw.wrap_mode = "OUTSIDE_SURFACE"
    made.append(o); return o


def one(prop): return ("v", {"v": prop})


for side in ("L", "R"):
    e = F["eyes"][side]; br = F["brows"][side]
    b, k = eye_shapes(e)
    build(f"face_pupil_{side}", e["c"], b, k, MAT["pupil"], 0.0016,
          {"happy": one(f"happy_{side}"), "blink": one(f"blink_{side}"), "squint": one(f"squint_{side}"),
           "small": one("pupil_small"), "look_x": one("look_x"), "look_z": one("look_z")})
    b, k = hl_shapes(e)
    build(f"face_highlight_{side}", e["c"], b, k, MAT["hl"], 0.0022,
          {"hide": ("min(1.0, h + b + 0.8 * q)", {"h": f"happy_{side}", "b": f"blink_{side}", "q": f"squint_{side}"}),
           "sparkle": one("sparkle"), "small": one("pupil_small"), "look_x": one("look_x"), "look_z": one("look_z")})
    b, k = brow_shapes(br, side)
    build(f"face_brow_{side}", br["c"], b, k, MAT["brow"], 0.0016,
          {"raise": one(f"brow_raise_{side}"), "angry": one(f"brow_angry_{side}")})
MDRV = {"open": one("mouth_open"), "smile": one("mouth_smile"), "wide": one("mouth_wide"), "round": one("mouth_round"),
        "smirk": one("mouth_smirk")}
for nm, off in (("mouth_ink", 0.0010), ("mouth_fill", 0.0016), ("mouth_tongue", 0.0021), ("mouth_teeth", 0.0025)):
    build(f"face_{nm}", m0["c"], MB[nm], {kn: MK[kn][nm] for kn in MK}, MAT[nm], off, MDRV)
bpy.context.view_layer.update()
for o in made:
    mw = o.matrix_world.copy(); o.parent = arm; o.parent_type = "BONE"; o.parent_bone = head_bone; o.matrix_world = mw
print("face features built:", [o.name for o in made])

# ---- presets (from the expression corpus and the 14 atlas states) ----
def eyes(**kw):
    d = {k: 0.0 for k in CTRL if not k.startswith("mouth")}
    for k, v in kw.items():
        if k.endswith("_LR"): d[k[:-3] + "_L"] = d[k[:-3] + "_R"] = v
        else: d[k] = v
    return d


def mouth(**kw):
    d = {k: 0.0 for k in CTRL if k.startswith("mouth")}
    d.update({"mouth_" + k: v for k, v in kw.items()}); return d


EYES = {
    "neutral": eyes(), "neutral_open": eyes(brow_raise_LR=0.15),
    "happy": eyes(happy_LR=1, brow_raise_LR=0.35), "laugh": eyes(happy_LR=1, brow_raise_LR=0.55),
    "excited": eyes(sparkle=1, brow_raise_LR=0.6), "surprised": eyes(pupil_small=1, brow_raise_LR=1.0),
    "sad": eyes(brow_angry_LR=-0.9, brow_raise_LR=0.1, squint_LR=0.25, look_z=-0.3),
    "angry": eyes(brow_angry_LR=1.0, brow_raise_LR=-0.45, squint_LR=0.55),
    "fired_up": eyes(brow_angry_LR=0.8, brow_raise_LR=-0.2, squint_LR=0.2),
    "smug": eyes(squint_LR=0.65, brow_raise_L=0.55, brow_raise_R=-0.25, brow_angry_R=0.3, look_x=0.35),
    "sleepy": eyes(blink_LR=1, brow_raise_LR=-0.2, brow_angry_LR=-0.3),
    "wink": eyes(happy_R=1, brow_raise_L=0.4, brow_raise_R=0.1),
    "shout": eyes(pupil_small=0.35, brow_raise_LR=0.7, brow_angry_LR=0.3),
    "thinking": eyes(brow_raise_L=0.7, brow_raise_R=-0.3, brow_angry_R=0.4, look_x=0.6, look_z=0.7),
}
MOUTH = {
    "neutral": mouth(smile=0.85), "neutral_open": mouth(open=0.35, smile=0.7),
    "happy": mouth(open=0.55, smile=1.0), "laugh": mouth(open=1.0, smile=1.0, wide=0.45),
    "excited": mouth(open=0.5, smile=1.0, wide=0.6), "surprised": mouth(open=0.45, round=0.6),
    "sad": mouth(smile=-0.8, wide=-0.2), "angry": mouth(open=0.4, smile=-0.6, wide=0.3),
    "fired_up": mouth(open=0.75, smile=0.15, wide=0.1), "smug": mouth(smile=0.55, smirk=0.8),
    "sleepy": mouth(smile=0.2, wide=-0.3), "wink": mouth(open=0.45, smile=1.0),
    "shout": mouth(open=1.0, round=0.45, wide=0.15), "thinking": mouth(smile=-0.2, smirk=-0.6, wide=-0.25),
}
sc["gnarls_face_presets"] = json.dumps({"eyes": EYES, "mouth": MOUTH, "controls": {k: list(v) for k, v in CTRL.items()}})

# ---- blank the old picture decals and re-key the saved frames with presets ----
for im in bpy.data.images:
    if not im.name.startswith("atlas_"): continue
    w_, h_ = im.size; p = np.array(im.pixels[:], np.float32).reshape(h_, w_, 4)
    cw, ch = w_ // 4, h_ // 4; r, c = divmod(14, 4)
    rows = slice(h_ - (r + 1) * ch, h_ - r * ch)  # Blender rows are bottom-up
    body = [int("909faa"[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    p[rows, c * cw:(c + 1) * cw, :3] = body
    p[rows, c * cw:(c + 1) * cw, 3] = p[rows, 0:cw, 3]  # same mask as cell 0
    im.pixels.foreach_set(p.ravel()); im.pack()
for k in ("eyes", "mouth"):
    arm.id_properties_ui(k).update(max=15); arm[k] = 14


def fcurves(act):
    if hasattr(act, "layers"):
        for ly in act.layers:
            for st in ly.strips:
                for cb in st.channelbags: yield cb, cb.fcurves
    elif hasattr(act, "fcurves"): yield None, act.fcurves


act = arm.animation_data.action
for cb, fcs in list(fcurves(act)):
    for fc in [f for f in fcs if f.data_path in ('["eyes"]', '["mouth"]')]: fcs.remove(fc)
POSE_FACES = {1: ("neutral", "neutral"), 2: ("happy", "happy"), 3: ("excited", "laugh"), 4: ("happy", "excited"),
              5: ("excited", "shout"), 6: ("fired_up", "fired_up"), 7: ("smug", "smug")}
ORDER = ["neutral", "neutral_open", "happy", "laugh", "excited", "surprised", "sad", "angry", "fired_up", "smug",
         "sleepy", "wink", "shout", "thinking"]
FACE_FR = dict(POSE_FACES)
FACE_FR.update({101 + i: (n, n) for i, n in enumerate(ORDER)})
FACE_FR.update({121: ("happy", "surprised"), 122: ("angry", "laugh"), 123: ("sad", "shout")})
for fr, (e_, m_) in FACE_FR.items():
    vals = dict(EYES[e_]); vals.update(MOUTH[m_])
    for k, v in vals.items():
        arm[k] = float(v); arm.keyframe_insert(f'["{k}"]', frame=fr)
for cb, fcs in fcurves(act):
    for fc in fcs:
        if fc.data_path.strip('["]') in CTRL:
            for kp in fc.keyframe_points: kp.interpolation = "CONSTANT"
arm.data.pose_position = "POSE"; sc.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print("controls", len(CTRL), "presets", len(EYES), "frames re-keyed", len(FACE_FR), "saved", OUT)
