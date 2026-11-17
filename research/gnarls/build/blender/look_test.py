"""Quick look check: full body front 3/4, side, back and a face close-up, at rest.
blender -b gnarls_rig.blend --factory-startup -P look_test.py -- OUTDIR [VIEW_TRANSFORM] [EXPOSURE] [ONLY]
ONLY: a view name to render just that view, "mouth" for a mouth sweep close-up (open, O,
frown, smirk, shout), or "glasses" for close-ups round the glasses at seven angles."""
import math, os, sys
import bpy
import numpy as np
from mathutils import Vector

A = sys.argv[sys.argv.index("--") + 1:]
OUT = A[0]; os.makedirs(OUT, exist_ok=True)
sc = bpy.context.scene; cam = sc.camera


def gpu():
    p = bpy.context.preferences.addons["cycles"].preferences
    for t in ("OPTIX", "CUDA"):
        try:
            p.compute_device_type = t; p.get_devices()
            if any(d.type == t for d in p.devices):
                for d in p.devices: d.use = d.type == t
                sc.cycles.device = "GPU"; return t
        except Exception: pass
    sc.cycles.device = "CPU"; return "CPU"


print("device", gpu())
if len(A) > 1: sc.view_settings.view_transform = A[1]
if len(A) > 1 and A[1] != "AgX": sc.view_settings.look = "None"
if len(A) > 2: sc.view_settings.exposure = float(A[2])
arm = next(o for o in sc.objects if o.type == "ARMATURE"); ob = bpy.data.objects["Gnarls"]
for n in ("prop_sign", "prop_stick"):
    o = bpy.data.objects.get(n)
    if o: o.hide_render = True
arm.animation_data_clear()
for pb in arm.pose.bones: pb.rotation_mode = "QUATERNION"; pb.rotation_quaternion = (1, 0, 0, 0)
arm["mouth_smile"] = 0.85
sc.frame_set(1)
dg = bpy.context.evaluated_depsgraph_get(); oe = ob.evaluated_get(dg); m = oe.to_mesh()
Pp = np.array([v.co for v in m.vertices]); oe.to_mesh_clear()
cam.data.type = "ORTHO"; cam.data.clip_start = 0.5; cam.data.clip_end = 20
c = Vector((0, 0.014, 0.52))


def shoot(name, yaw, scale, centre, res=(900, 1100), elev=6):
    sc.render.resolution_x, sc.render.resolution_y = res
    a, e = math.radians(yaw), math.radians(elev)
    fwd = Vector((-math.sin(a) * math.cos(e), math.cos(a) * math.cos(e), -math.sin(e)))
    cam.data.ortho_scale = scale; cam.location = centre - fwd * 8
    cam.rotation_euler = fwd.to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.path.join(OUT, name); bpy.ops.render.render(write_still=True)


ONLY = A[3] if len(A) > 3 else ""
if ONLY == "mouth":
    SW = [dict(mouth_open=v, mouth_smile=1.0) for v in (0, 0.15, 0.3, 0.5, 0.75, 1.0)] +          [dict(mouth_open=0.6, mouth_round=0.8), dict(mouth_smile=-0.8), dict(mouth_smile=0.5, mouth_smirk=0.8),
          dict(mouth_open=1.0, mouth_round=0.45, mouth_wide=0.15)]
    for i, d_ in enumerate(SW):
        for k in ("mouth_open", "mouth_smile", "mouth_round", "mouth_wide", "mouth_smirk"): arm[k] = float(d_.get(k, 0.0))
        arm.update_tag(); sc.frame_set(1)
        shoot(f"m{i:02d}.png", -10, 0.26, Vector((0, 0.0, 0.585)), res=(500, 400))
    sys.exit(0)
if ONLY == "glasses":  # close-ups round the glasses from the front to both sides
    for yaw in (0, -30, -60, -90, 30, 60, 90):
        shoot(f"g{yaw:+04d}.png", yaw, 0.34, Vector((0, 0.0, 0.73)), res=(800, 800))
    sys.exit(0)
for name, yaw in (("a_front34.png", -30), ("b_side.png", -90), ("c_back.png", 180), ("d_front.png", 0)):
    if ONLY and ONLY not in name: continue
    shoot(name, yaw, 1.3, c)
if ONLY: sys.exit(0)
shoot("e_face.png", -15, 0.5, Vector((0, 0.0, 0.72)), res=(900, 900))
