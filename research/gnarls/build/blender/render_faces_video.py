"""Render the face rig going through every expression (and the mix proofs) as a frame sequence, for an MP4 on white.
blender -b gnarls_rig.blend --factory-startup -P render_faces_video.py -- OUTDIR [test]
Each state: 30 frames at 24 fps. On every switch the head does a small eased tilt/nod (the rig moving), then holds.
Frames are rendered with a transparent film; faces_video.py composites them on white, labels them and encodes the MP4.
Keys go on frames 2001+ so the file's own pose/face keys are untouched (the rig's face index is keyed animation, which
would override values set directly)."""
import json, math, os, sys
import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector

A = sys.argv[sys.argv.index("--") + 1:]
OUT = A[0]; TEST = len(A) > 1 and A[1] == "test"
os.makedirs(OUT, exist_ok=True)
sc = bpy.context.scene; cam = sc.camera
arm = next(o for o in sc.objects if o.type == "ARMATURE")
ob = bpy.data.objects["Gnarls"]
ORDER = arm.id_properties_ui("eyes").as_dict()["description"].split("index into ", 1)[1].split(",")
STATES = [(n, n) for n in ORDER] + [("happy", "surprised"), ("angry", "laugh"), ("sad", "shout"), ("neutral", "neutral")]
HOLD, F0 = 30, 2001
sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = 1080
sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
try: sc.eevee.taa_render_samples = 48
except Exception: pass


def bone_q(pb, axis, deg):
    """World-axis rotation expressed in the pose bone's local space (armature is unrotated)."""
    B = pb.bone.matrix_local.to_3x3()
    Rw = Matrix.Rotation(math.radians(deg), 3, axis)
    return (B.inverted() @ Rw @ B).to_quaternion()


def ease(t):  # 0..1 -> overshooting settle: quick tilt, spring back
    return math.sin(math.pi * min(t, 1)) * math.exp(-2.2 * t)


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
c = right * (pr.max() + pr.min()) / 2 + up * (pu.max() + pu.min()) / 2 + up * 0.01
cam.data.type = "ORTHO"; cam.data.ortho_scale = 1.22 * max(pu.max() - pu.min(), pr.max() - pr.min())
cam.location = Vector(c - fwd * 6); cam.rotation_euler = Vector(-fwd).to_track_quat("Z", "Y").to_euler()

head, chest = arm.pose.bones["head"], arm.pose.bones["chest"]
base_loc = arm.location.copy()
labels = []
fr = F0
for si, (e, m) in enumerate(STATES):
    side = 1 if si % 2 == 0 else -1
    for k in range(HOLD):
        t = k / 10.0; a = ease(t)
        for pb in arm.pose.bones:
            pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
        head.rotation_quaternion = bone_q(head, "Y", 7 * side * a) @ bone_q(head, "X", -5 * a)
        chest.rotation_quaternion = bone_q(chest, "Y", 2.5 * side * a)
        arm.location = base_loc + Vector((0, 0, 0.012 * a))
        arm["eyes"] = ORDER.index(e); arm["mouth"] = ORDER.index(m)
        for pb in arm.pose.bones:
            pb.keyframe_insert("rotation_quaternion", frame=fr); pb.keyframe_insert("location", frame=fr)
        arm.keyframe_insert("location", frame=fr); arm.keyframe_insert('["eyes"]', frame=fr); arm.keyframe_insert('["mouth"]', frame=fr)
        labels.append({"frame": fr - F0, "eyes": e, "mouth": m})
        fr += 1
json.dump(labels, open(os.path.join(OUT, "labels.json"), "w"))
for o_ in (bpy.data.objects.get("prop_sign"), bpy.data.objects.get("prop_stick")):
    if o_: o_.hide_render = True; o_.animation_data_clear()

frames = range(F0, fr)
if TEST: frames = [F0 + 2 * HOLD + 29, F0 + 7 * HOLD + 4, F0 + 12 * HOLD + 29]  # happy hold, angry mid-tilt, shout
import shutil
for f in frames:
    k = (f - F0) % HOLD
    if not TEST and k > 10:  # the tilt has settled by frame 10 (ease() is 0 from there): the hold repeats that frame
        shutil.copy(os.path.join(OUT, f"f_{f - F0 - k + 10:04d}.png"), os.path.join(OUT, f"f_{f - F0:04d}.png")); continue
    sc.frame_set(f)
    sc.render.filepath = os.path.join(OUT, f"f_{f - F0:04d}.png")
    bpy.ops.render.render(write_still=True)
    print("frame", f - F0, "eyes", ob.get("eyes"), "mouth", ob.get("mouth"), flush=True)
