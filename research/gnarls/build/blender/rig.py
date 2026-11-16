"""Gnarls rig: armature + weights + face controls + the six guide poses + renders.
blender -b gnarls_master.blend --factory-startup -P rig.py -- FACE_ZONES.json ATLAS_EYES.png ATLAS_MOUTH.png OUTDIR

Body (CONTEXT.md 3D spec): root > hips > spine > chest > head (S-bend chain); hips > tail1 > tail2 > fluke_L / fluke_R
(independent lobes); chest > fin_{L,R}_1..3 > grip_{L,R} (prop socket, non-deforming). Weights are computed here (z-bands
for the trunk, side/height gating for the fins, x-split for the lobes) because heat weighting fails on fused Tripo meshes.
Face: the armature carries integer controls `eyes` and `mouth` (0-13, order in face_zones.json). Each picks a cell of the
eye/mouth atlas, read through the mesh's proj_front UVs and laid over the baked skin on front-facing verts only, so any eye
state mixes with any mouth state. Character's left (fin_L) is +X; the front faces -Y."""
import json, math, os, sys
import bpy
import numpy as np
from mathutils import Matrix, Vector

A = sys.argv[sys.argv.index("--") + 1:]
ZONES = json.load(open(A[0])); ATL = {"eyes": A[1], "mouth": A[2]}; OUT = A[3]
os.makedirs(OUT, exist_ok=True)
LOG = open(os.path.join(OUT, "rig_log.txt"), "w")


def P(*a):
    s = " ".join(str(x) for x in a); print(s); LOG.write(s + "\n"); LOG.flush()


sc = bpy.context.scene
ob = [o for o in sc.objects if o.type == "MESH"][0]; me = ob.data
n = len(me.vertices)
v = np.empty(n * 3); me.vertices.foreach_get("co", v); v = v.reshape(-1, 3)
v = (np.array(ob.matrix_world)[:3, :3] @ v.T).T + np.array(ob.matrix_world)[:3, 3]
nr = np.empty(n * 3); me.vertices.foreach_get("normal", nr); nr = nr.reshape(-1, 3)
x, y, z = v.T
P("verts", n, "z", z.min().round(3), z.max().round(3), "x", x.min().round(3), x.max().round(3))


# ---------- landmarks ----------
def band(z0, z1): return (z > z0) & (z < z1)


cy = float(np.median(y[band(0.3, 0.6)]))
hem = 0.92 * float(np.abs(x[band(0.53, 0.55)]).max())   # tee body half-width = narrowest neck slice above the sleeves
side = {}
for s, sg in (("L", 1), ("R", -1)):
    m = band(0.3, 0.62) & (sg * x > 0)
    i = np.argmax(sg * x * m - (~m) * 9)
    side[s] = v[i]
fl = {}
for s, sg in (("L", 1), ("R", -1)):
    m = (z < 0.06) & (sg * x > 0)
    i = np.argmax(sg * x * m - (~m) * 9); fl[s] = v[i]
P("cy", round(cy, 3), "hem", round(hem, 3), "fin tips", {k: t.round(3).tolist() for k, t in side.items()},
  "fluke tips", {k: t.round(3).tolist() for k, t in fl.items()})

# ---------- armature ----------
ad = bpy.data.armatures.new("gnarls_rig"); arm = bpy.data.objects.new("gnarls_rig", ad); sc.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode="EDIT")
E = {}


def bone(name, h, t, parent=None, deform=True):
    b = ad.edit_bones.new(name); b.head = Vector(h); b.tail = Vector(t); b.use_deform = deform
    if parent: b.parent = E[parent]; b.use_connect = False
    E[name] = b; return b


C = lambda zz: (0.0, cy, zz)
bone("root", (0, cy, 0), (0, cy, 0.08), deform=False)
bone("hips", C(0.28), C(0.40), "root")
bone("spine", C(0.40), C(0.52), "hips")
bone("chest", C(0.52), C(0.62), "spine")
bone("head", C(0.62), C(0.95), "chest")
bone("tail1", C(0.28), C(0.19), "hips")
bone("tail2", C(0.19), C(0.10), "tail1")
for s, sg in (("L", 1), ("R", -1)):
    tip = side[s]; sh = np.array([sg * hem, tip[1], 0.47])  # shoulder at the sleeve top
    a, b_ = sh + (tip - sh) * 0.45, sh + (tip - sh) * 0.78
    bone(f"fin_{s}_1", sh, a, "chest"); bone(f"fin_{s}_2", a, b_, f"fin_{s}_1"); bone(f"fin_{s}_3", b_, tip, f"fin_{s}_2")
    d = (tip - sh) / np.linalg.norm(tip - sh)
    bone(f"grip_{s}", tip, tip + d * 0.04, f"fin_{s}_3", deform=False)
    bone(f"fluke_{s}", C(0.10), fl[s] + np.array([0, 0, 0.01]), "tail2")
FIN = {s: [np.array(E[f"fin_{s}_{k}"].head) for k in (1, 2, 3)] + [np.array(E[f"fin_{s}_3"].tail)] for s in "LR"}
bpy.ops.object.mode_set(mode="OBJECT")


# ---------- weights ----------
def ss(e0, e1, t):
    u = np.clip((t - e0) / (e1 - e0), 0, 1); return u * u * (3 - 2 * u)


W = {}
trunk = {"hips": (0.28, 0.40), "spine": (0.40, 0.52), "chest": (0.52, 0.62), "head": (0.62, 1.01),
         "tail1": (0.19, 0.28), "tail2": (0.08, 0.19)}
for b_, (z0, z1) in trunk.items():
    dz = np.maximum(0, np.maximum(z0 - z, z - z1)); W[b_] = np.exp(-(dz / 0.035) ** 2)
tot = sum(W.values()); W = {k: w / tot for k, w in W.items()}
# fins: outside the hem, sleeve height, not the head (glasses temples sit at z>0.62)
for s, sg in (("L", 1), ("R", -1)):
    f = ss(hem * 1.05, hem * 1.40, sg * x) * ss(0.31, 0.34, z) * (1 - ss(0.54, 0.58, z))
    p0, p1, p2, p3 = FIN[s]; ax = p3 - p0; L = np.linalg.norm(ax); ax = ax / L
    t = ((v - p0) @ ax) / L
    k1, k2 = np.linalg.norm(p1 - p0) / L, np.linalg.norm(p2 - p0) / L
    w1 = 1 - ss(k1 - 0.08, k1 + 0.08, t); w3 = ss(k2 - 0.08, k2 + 0.08, t); w2 = np.clip(1 - w1 - w3, 0, 1)
    for k in W: W[k] = W[k] * (1 - f)
    W[f"fin_{s}_1"], W[f"fin_{s}_2"], W[f"fin_{s}_3"] = w1 * f, w2 * f, w3 * f
# fluke lobes below the tail root, split left/right with a soft seam
g = 1 - ss(0.06, 0.12, z)
lr = ss(-0.025, 0.025, x)
for k in list(W): W[k] = W[k] * (1 - g)
W["fluke_L"], W["fluke_R"] = g * lr, g * (1 - lr)
tot = sum(W.values()); P("weight sum min/max", tot.min().round(3), tot.max().round(3))
for k, w in W.items():
    vg = ob.vertex_groups.new(name=k); idx = np.nonzero(w > 0.005)[0]
    for i in idx: vg.add([int(i)], float(w[i] / tot[i]), "REPLACE")
    P("group", k, "verts", len(idx))
ob.parent = arm
mod = ob.modifiers.new("rig", "ARMATURE"); mod.object = arm
# keep the armature modifier first so the (disabled) outline solidify follows the deformation
ob.modifiers.move(ob.modifiers.find("rig"), 0)

# ---------- face controls ----------
arm["eyes"] = 0; arm["mouth"] = 0
for k in ("eyes", "mouth"):
    ui = arm.id_properties_ui(k); ui.update(min=0, max=len(ZONES["order"]) - 1, description="index into " + ",".join(ZONES["order"]))
fm = np.clip((nr @ np.array([0, -1, 0]) - 0.25) / 0.25, 0, 1) * (y < cy + 0.02) * (z > 0.55)
at = me.attributes.new("face_mask", "FLOAT", "POINT"); at.data.foreach_set("value", fm.astype(np.float32))
P("face_mask verts > 0.5:", int((fm > 0.5).sum()))
G = ZONES["grid"]


def decal_group():
    ng = bpy.data.node_groups.new("face_decals", "ShaderNodeTree")
    ng.interface.new_socket("Color", in_out="INPUT", socket_type="NodeSocketColor")
    ng.interface.new_socket("Color", in_out="OUTPUT", socket_type="NodeSocketColor")
    N, Lk = ng.nodes, ng.links
    gi = N.new("NodeGroupInput"); go = N.new("NodeGroupOutput")
    uvn = N.new("ShaderNodeUVMap"); uvn.uv_map = "proj_front"
    sep = N.new("ShaderNodeSeparateXYZ"); Lk.new(uvn.outputs[0], sep.inputs[0])
    att = N.new("ShaderNodeAttribute"); att.attribute_type = "GEOMETRY"; att.attribute_name = "face_mask"

    def M(op, a, b=None, clamp=False):
        m = N.new("ShaderNodeMath"); m.operation = op; m.use_clamp = clamp
        for i_, val in enumerate((a, b)):
            if val is None: continue
            if isinstance(val, (int, float)): m.inputs[i_].default_value = val
            else: Lk.new(val, m.inputs[i_])
        return m.outputs[0]

    col = gi.outputs[0]
    for zone in ("eyes", "mouth"):
        zn = ZONES[zone]; (u0, v0), (u1, v1) = zn["uv_min"], zn["uv_max"]
        # EEVEE bakes Value-node constants into the compiled shader, so a driven Value never updates mid-session.
        # An Object attribute is a per-object uniform: the mesh mirrors the rig's control (object driver) and the shader
        # reads it each frame without recompiling.
        ob[zone] = 0
        dr = ob.driver_add(f'["{zone}"]').driver; dr.type = "SCRIPTED"; dr.expression = "var"
        var = dr.variables.new(); var.name = "var"; var.type = "SINGLE_PROP"
        var.targets[0].id = arm; var.targets[0].data_path = f'["{zone}"]'
        idx = N.new("ShaderNodeAttribute"); idx.attribute_type = "OBJECT"; idx.attribute_name = zone; idx.label = zone
        ul = M("DIVIDE", M("SUBTRACT", sep.outputs[0], u0), u1 - u0)
        vl = M("DIVIDE", M("SUBTRACT", sep.outputs[1], v0), v1 - v0)
        inside = M("MULTIPLY", M("MULTIPLY", M("GREATER_THAN", ul, 0.0), M("LESS_THAN", ul, 1.0)),
                   M("MULTIPLY", M("GREATER_THAN", vl, 0.0), M("LESS_THAN", vl, 1.0)))
        c_ = M("MODULO", M("ROUND", idx.outputs["Fac"]), G); r_ = M("FLOOR", M("DIVIDE", M("ROUND", idx.outputs["Fac"]), G))
        au = M("DIVIDE", M("ADD", c_, M("MINIMUM", M("MAXIMUM", ul, 0.0), 1.0)), G)
        av = M("DIVIDE", M("ADD", M("SUBTRACT", G - 1, r_), M("MINIMUM", M("MAXIMUM", vl, 0.0), 1.0)), G)
        cmb = N.new("ShaderNodeCombineXYZ"); Lk.new(au, cmb.inputs[0]); Lk.new(av, cmb.inputs[1])
        img = bpy.data.images.load(ATL[zone]); img.alpha_mode = "STRAIGHT"
        tx = N.new("ShaderNodeTexImage"); tx.image = img; tx.extension = "EXTEND"; tx.interpolation = "Linear"
        Lk.new(cmb.outputs[0], tx.inputs[0])
        fac = M("MULTIPLY", tx.outputs[1], att.outputs["Fac"])  # cell edges carry alpha 0, so no zone test is needed
        mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"
        Lk.new(fac, mix.inputs[0]); Lk.new(col, mix.inputs[6]); Lk.new(tx.outputs[0], mix.inputs[7])
        col = mix.outputs[2]
    Lk.new(col, go.inputs[0])
    return ng


NG = decal_group()
for mat in bpy.data.materials:
    if not mat.use_nodes: continue
    for tx in [nd for nd in mat.node_tree.nodes if nd.type == "TEX_IMAGE"]:
        for lk in list(tx.outputs[0].links):
            gn = mat.node_tree.nodes.new("ShaderNodeGroup"); gn.node_tree = NG
            to = lk.to_socket; mat.node_tree.links.remove(lk)
            mat.node_tree.links.new(tx.outputs[0], gn.inputs[0]); mat.node_tree.links.new(gn.outputs[0], to)
            P("decals wired into", mat.name)

# ---------- camera helpers ----------
cam = sc.camera
sc.render.resolution_x, sc.render.resolution_y = 1200, 1500


def eval_verts():
    dg = bpy.context.evaluated_depsgraph_get(); oe = ob.evaluated_get(dg); m_ = oe.to_mesh()
    a = np.empty(len(m_.vertices) * 3); m_.vertices.foreach_get("co", a); oe.to_mesh_clear()
    a = a.reshape(-1, 3); Mw = np.array(oe.matrix_world); return (Mw[:3, :3] @ a.T).T + Mw[:3, 3]


def shoot(path, yaw, elev=4, frame_to=None, pad=1.12):
    a_, e_ = math.radians(yaw), math.radians(elev)
    fwd = -np.array([math.sin(a_) * math.cos(e_), -math.cos(a_) * math.cos(e_), math.sin(e_)])
    right = np.cross(fwd, [0, 0, 1]); right /= np.linalg.norm(right); up = np.cross(right, fwd)
    pts = eval_verts() if frame_to is None else frame_to
    pr, pu = pts @ right, pts @ up
    c = right * (pr.max() + pr.min()) / 2 + up * (pu.max() + pu.min()) / 2
    asp = sc.render.resolution_x / sc.render.resolution_y
    cam.data.ortho_scale = pad * max(pu.max() - pu.min(), (pr.max() - pr.min()) / asp) * max(1, 1 / asp)
    pos = c - fwd * 6
    cam.location = Vector(pos); cam.rotation_euler = Vector(-fwd).to_track_quat("Z", "Y").to_euler()
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)


O = ZONES["order"].index



# ---------- poses ----------
def rot_world(pb, rots):
    R = Matrix.Identity(3)
    for axis, deg in rots: R = Matrix.Rotation(math.radians(deg), 3, axis) @ R
    Mr = pb.bone.matrix_local.to_3x3()
    pb.rotation_mode = "QUATERNION"; pb.rotation_quaternion = (Mr.inverted() @ R @ Mr).to_quaternion()


POSES = [  # name, camera yaw, lift, eyes, mouth, {bone: [(world axis, deg), ...]}  (yaw -35 = primary 3/4 facing right)
    ("primary", -35, 0.0, "neutral", "neutral", {}),
    ("sparkle_hop", 0, 0.07, "happy", "happy", {
        "fin_L_1": [("Y", 22)], "fin_R_1": [("Y", -22)], "fin_L_3": [("Y", -15)], "fin_R_3": [("Y", 15)],
        "fluke_R": [("Y", 35)], "tail1": [("Y", 6)], "head": [("Y", -6)]}),
    ("cheer_jump", 35, 0.10, "excited", "laugh", {
        "root": [("Z", 12)], "hips": [("Y", -8)], "spine": [("X", -6), ("Y", 8)], "chest": [("Y", 6)], "head": [("X", -8)],
        "fin_L_1": [("Y", -68)], "fin_R_1": [("Y", 68)], "fin_L_2": [("Y", -15)], "fin_R_2": [("Y", 15)],
        "tail1": [("X", 18)], "tail2": [("X", 22)], "fluke_L": [("Y", -15)]}),
    ("proud_grin", 0, 0.0, "happy", "excited", {
        "chest": [("X", -5)], "head": [("X", -6)],
        "fin_L_1": [("Y", 30), ("Z", 70)], "fin_R_1": [("Y", -30), ("Z", -70)],
        "fin_L_2": [("Z", 25)], "fin_R_2": [("Z", -25)]}),
    ("presenting", 35, 0.0, "excited", "shout", {
        "chest": [("X", 4)], "head": [("X", -4)],
        "fin_L_1": [("Z", -55), ("Y", -15)], "fin_R_1": [("Z", 55), ("Y", 15)],
        "fin_L_2": [("Z", -20)], "fin_R_2": [("Z", 20)]}),
    ("fired_up_flex", 0, 0.0, "fired_up", "fired_up", {
        "chest": [("Y", 6)], "head": [("Y", -4)],
        "fin_L_1": [("Y", -80), ("Z", 20)], "fin_L_2": [("Y", -55)], "fin_L_3": [("Y", -25)],
        "fin_R_1": [("Y", -38)], "fin_R_2": [("Y", -10)]}),
    ("lounge", -35, 0.0, "smug", "smug", {
        "root": [("Y", -75)], "chest": [("Y", 10)], "head": [("Y", 22)],
        "tail1": [("Y", -35)], "tail2": [("Y", -50)], "fluke_L": [("Y", -20)], "fluke_R": [("Y", -20)],
        "fin_L_1": [("Y", 65)], "fin_R_1": [("Y", -10)]}),
]
sc.frame_start, sc.frame_end = 1, len(POSES)
sign = None
for fr, (nm, yaw, lift, ee, mm, rots) in enumerate(POSES, start=1):
    sc.frame_set(fr)
    for pb in arm.pose.bones:
        pb.rotation_mode = "QUATERNION"; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
    for b_, r in rots.items(): rot_world(arm.pose.bones[b_], r)
    arm.location = (0, 0, 0); bpy.context.view_layer.update()
    pts = eval_verts(); arm.location = (0, 0, -pts[:, 2].min() + lift)
    arm["eyes"] = O(ee); arm["mouth"] = O(mm)
    for pb in arm.pose.bones:
        pb.keyframe_insert("rotation_quaternion", frame=fr); pb.keyframe_insert("location", frame=fr)
    arm.keyframe_insert("location", frame=fr); arm.keyframe_insert('["eyes"]', frame=fr); arm.keyframe_insert('["mouth"]', frame=fr)
def fcurves(act):
    if hasattr(act, "layers"):
        for ly in act.layers:
            for st in ly.strips:
                for cb in st.channelbags: yield from cb.fcurves
    elif hasattr(act, "fcurves"): yield from act.fcurves


for fc in fcurves(arm.animation_data.action):
    for kp in fc.keyframe_points: kp.interpolation = "CONSTANT"  # house style: 2-key holds (DECISIONS A7)

# presenting prop: a sign on a stick between the fins (visible on that frame only)
bpy.ops.mesh.primitive_cube_add(size=1); sign = bpy.context.active_object; sign.name = "prop_sign"
sign.scale = (0.30, 0.012, 0.19)
bpy.ops.mesh.primitive_cylinder_add(radius=0.008, depth=0.32); stick = bpy.context.active_object; stick.name = "prop_stick"
stick.parent = sign; stick.matrix_parent_inverse = sign.matrix_world.inverted()
sm = bpy.data.materials.new("sign_white"); sm.use_nodes = True
sm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.92, 0.92, 0.92, 1)
km = bpy.data.materials.new("stick_brown"); km.use_nodes = True
km.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.11, 0.025, 0.012, 1)
sign.data.materials.append(sm); stick.data.materials.append(km)
pf = [p[0] for p in POSES].index("presenting") + 1
for fr in range(1, len(POSES) + 1):
    sc.frame_set(fr)
    for o_ in (sign, stick):
        o_.hide_render = o_.hide_viewport = (fr != pf); o_.keyframe_insert("hide_render", frame=fr); o_.keyframe_insert("hide_viewport", frame=fr)
sc.frame_set(pf)
gl, gr = (arm.matrix_world @ arm.pose.bones["grip_L"].head), (arm.matrix_world @ arm.pose.bones["grip_R"].head)
mid = (gl + gr) / 2
sign.location = gl + Vector((0.16, -0.06, 0.30)); stick.location = gl + Vector((0.16, -0.06, 0.10))  # held up beside the head, clear of the face
stick.parent = None
P("grips at presenting", [round(c, 3) for c in gl], [round(c, 3) for c in gr])

# expression sheet frames (rest pose): 101.. = each state on both zones; 121.. = mix-and-match proofs
MIXES = [("happy", "surprised"), ("angry", "laugh"), ("sad", "shout")]
FR = [{"frame": fr, "name": nm, "yaw": yaw, "kind": "pose"} for fr, (nm, yaw, *_r) in enumerate(POSES, start=1)]
expr_frames = [(101 + i, nm, nm) for i, nm in enumerate(ZONES["order"])] + [(121 + i, e, m) for i, (e, m) in enumerate(MIXES)]
for fr, e_, m_ in expr_frames:
    sc.frame_set(fr)
    for pb in arm.pose.bones:
        pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
        pb.keyframe_insert("rotation_quaternion", frame=fr); pb.keyframe_insert("location", frame=fr)
    arm.location = (0, 0, 0); arm.keyframe_insert("location", frame=fr)
    arm["eyes"] = O(e_); arm["mouth"] = O(m_)
    arm.keyframe_insert('["eyes"]', frame=fr); arm.keyframe_insert('["mouth"]', frame=fr)
    for o_ in (sign, stick):
        o_.hide_render = o_.hide_viewport = True; o_.keyframe_insert("hide_render", frame=fr); o_.keyframe_insert("hide_viewport", frame=fr)
    FR.append({"frame": fr, "name": (f"face_{fr - 101:02d}_{e_}" if fr < 121 else f"mix_{e_}+{m_}"), "yaw": 0, "kind": "face"})
for fc in fcurves(arm.animation_data.action):
    for kp in fc.keyframe_points: kp.interpolation = "CONSTANT"
sc["gnarls_frames"] = json.dumps(FR)
sc.frame_end = len(POSES)
sc.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "gnarls_rig.blend"))
P("saved gnarls_rig.blend; frames", [f["frame"] for f in FR])
