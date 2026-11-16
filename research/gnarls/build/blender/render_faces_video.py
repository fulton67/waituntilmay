"""Render the face rig going through every expression (and the mix proofs) as a frame sequence, for an MP4 on white.
blender -b gnarls_rig.blend --factory-startup -P render_faces_video.py -- OUTDIR [test]
Needs the geometric face rig from face_rig.py (controls + presets on the armature).

Each state lasts 30 frames at 24 fps and every frame is animated (no held stills):
- in-betweens: every face control eases from the old expression's value to the new one over 7 frames (lids close,
  brows travel, the mouth opens), while the head squashes and stretches and tilts, then settles;
- blinks: the eyelids close and reopen once during each hold where the eyes are open;
- idle: breathing (chest, fins, a small rise) and a slow head sway run under everything.
Frames are rendered with a transparent film; faces_video.py composites them on white, labels them and encodes the MP4.
Keys go on frames 2001+ so the file's own pose/face keys are untouched."""
import json, math, os, sys
import bpy
import numpy as np
from mathutils import Matrix, Vector

A = sys.argv[sys.argv.index("--") + 1:]
OUT = A[0]; TEST = len(A) > 1 and A[1] == "test"
os.makedirs(OUT, exist_ok=True)
sc = bpy.context.scene; cam = sc.camera
arm = next(o for o in sc.objects if o.type == "ARMATURE")
ob = bpy.data.objects["Gnarls"]
assert "gnarls_face_presets" in sc.keys(), "run face_rig.py on the rig first"
PRE = json.loads(sc["gnarls_face_presets"]); CTRL = list(PRE["controls"])
ORDER = ["neutral", "neutral_open", "happy", "laugh", "excited", "surprised", "sad", "angry", "fired_up", "smug",
         "sleepy", "wink", "shout", "thinking"]
STATES = [(n, n) for n in ORDER] + [("happy", "surprised"), ("angry", "laugh"), ("sad", "shout"), ("neutral", "neutral")]
HOLD, F0, T_BLEND = 30, 2001, 7


def target(e, m):
    v = dict(PRE["eyes"][e]); v.update(PRE["mouth"][m]); return v
sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = 1080
sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
try: sc.eevee.taa_render_samples = 32
except Exception: pass


def bone_q(pb, axis, deg):
    """World-axis rotation expressed in the pose bone's local space (armature is unrotated)."""
    B = pb.bone.matrix_local.to_3x3()
    return (B.inverted() @ Matrix.Rotation(math.radians(deg), 3, axis) @ B).to_quaternion()


def smooth(x): x = min(max(x, 0.0), 1.0); return x * x * (3 - 2 * x)
def settle(t): return math.sin(math.pi * min(t, 1)) * math.exp(-2.2 * t)  # quick move, spring back


# rest framing: head + top of the tee, fixed for the whole clip
for pb in arm.pose.bones: pb.rotation_mode = "QUATERNION"
sc.frame_set(101)
dg = bpy.context.evaluated_depsgraph_get(); oe = ob.evaluated_get(dg); m_ = oe.to_mesh()
P = np.empty(len(m_.vertices) * 3); m_.vertices.foreach_get("co", P); oe.to_mesh_clear(); P = P.reshape(-1, 3)
Mw = np.array(oe.matrix_world); P = (Mw[:3, :3] @ P.T).T + Mw[:3, 3]
zr = P[:, 2].max() - P[:, 2].min(); P = P[P[:, 2] > P[:, 2].min() + 0.44 * zr]
yaw, elev = math.radians(-18), math.radians(5)
fwd = -np.array([math.sin(yaw) * math.cos(elev), -math.cos(yaw) * math.cos(elev), math.sin(elev)])
right = np.cross(fwd, [0, 0, 1]); right /= np.linalg.norm(right); up = np.cross(right, fwd)
pr, pu = P @ right, P @ up
c = right * (pr.max() + pr.min()) / 2 + up * (pu.max() + pu.min()) / 2 + up * 0.005
cam.data.type = "ORTHO"; cam.data.ortho_scale = 1.28 * max(pu.max() - pu.min(), pr.max() - pr.min())
cam.location = Vector(c - fwd * 6); cam.rotation_euler = Vector(-fwd).to_track_quat("Z", "Y").to_euler()

PB = arm.pose.bones
head, chest, spine = PB["head"], PB["chest"], PB["spine"]
fins = [PB[n] for n in ("fin_L_1", "fin_R_1") if n in PB]
base_loc = arm.location.copy()
labels = []
fr = F0
for si, (e, m) in enumerate(STATES):
    pe, pm = STATES[si - 1] if si else (e, m)
    side = 1 if si % 2 == 0 else -1
    for k in range(HOLD):
        g = fr - F0
        # --- face: ease every control from the previous expression to this one, then blink once ---
        tv, pv = target(e, m), target(pe, pm)
        f_ = smooth((k + 1) / T_BLEND) if si else 1.0
        vals = {c_: pv[c_] + (tv[c_] - pv[c_]) * f_ for c_ in CTRL}
        if 18 <= k <= 23:
            bl = [0.35, 0.85, 1.0, 0.8, 0.4, 0.1][k - 18]
            for sd in ("L", "R"):
                if tv[f"happy_{sd}"] + tv[f"blink_{sd}"] < 0.5: vals[f"blink_{sd}"] = max(vals[f"blink_{sd}"], bl)
        for c_, v_ in vals.items(): arm[c_] = float(v_)
        # --- body ---
        for pb in PB:
            pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
        a = settle(k / 10.0) if si else 0.0
        breath = math.sin(2 * math.pi * g / 48.0)
        sway = math.sin(2 * math.pi * g / 80.0)
        head.rotation_quaternion = (bone_q(head, "Z", 3.0 * sway) @ bone_q(head, "Y", 7 * side * a)
                                    @ bone_q(head, "X", -5 * a + 1.2 * breath))
        chest.rotation_quaternion = bone_q(chest, "Y", 2.5 * side * a) @ bone_q(chest, "X", 1.0 * breath)
        spine.rotation_quaternion = bone_q(spine, "Z", -1.2 * sway)
        for i_, fb in enumerate(fins):
            fb.rotation_quaternion = bone_q(fb, "Y", (4.0 * breath + 9 * a) * (1 if i_ == 0 else -1))
        # squash then stretch on each change (the head bone's Y axis runs up the head)
        if si and k < 12:
            sq = -0.045 * math.sin(2 * math.pi * k / 9.0) * math.exp(-k / 5.0)
            head.scale = (1 - sq / 2, 1 + sq, 1 - sq / 2)
        arm.location = base_loc + Vector((0, 0, 0.004 * breath + 0.014 * a))
        for pb in PB:
            for path in ("rotation_quaternion", "location", "scale"): pb.keyframe_insert(path, frame=fr)
        arm.keyframe_insert("location", frame=fr)
        for c_ in CTRL: arm.keyframe_insert(f'["{c_}"]', frame=fr)
        labels.append({"frame": g, "eyes": e, "mouth": m})
        fr += 1
json.dump(labels, open(os.path.join(OUT, "labels.json"), "w"))
for o_ in (bpy.data.objects.get("prop_sign"), bpy.data.objects.get("prop_stick")):
    if o_: o_.hide_render = True; o_.animation_data_clear()

frames = range(F0, fr)
if TEST: frames = [F0 + i * HOLD + 14 for i in range(len(STATES) - 1)]  # every state, settled (an expression sheet)
for f in frames:
    sc.frame_set(f)
    sc.render.filepath = os.path.join(OUT, f"f_{f - F0:04d}.png")
    bpy.ops.render.render(write_still=True)
    print("frame", f - F0, "open", round(float(arm["mouth_open"]), 2), "blink_L", round(float(arm["blink_L"]), 2), flush=True)
