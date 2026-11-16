"""Render every keyed frame of gnarls_rig.blend (poses 1-7, expression sheet 101-114, mixes 121-123).
blender -b gnarls_rig.blend --factory-startup -P render_rig.py -- OUTDIR
Runs on a freshly opened file so the face-control drivers are in the depsgraph (drivers created in the same session as a
render do not reach EEVEE)."""
import json, math, os, sys
import bpy
import numpy as np
from mathutils import Vector

OUT = sys.argv[sys.argv.index("--") + 1]; os.makedirs(OUT, exist_ok=True)
sc = bpy.context.scene; cam = sc.camera
ob = [o for o in sc.objects if o.type == "MESH" and o.name.startswith("prop_") is False][0]
sign = bpy.data.objects.get("prop_sign")
sc.render.resolution_x, sc.render.resolution_y = 1200, 1500


def eval_pts(o):
    dg = bpy.context.evaluated_depsgraph_get(); oe = o.evaluated_get(dg); m_ = oe.to_mesh()
    a = np.empty(len(m_.vertices) * 3); m_.vertices.foreach_get("co", a); oe.to_mesh_clear()
    a = a.reshape(-1, 3); Mw = np.array(oe.matrix_world); return (Mw[:3, :3] @ a.T).T + Mw[:3, 3]


def shoot(path, yaw, pts, elev=4, pad=1.12, res=(1200, 1500)):
    sc.render.resolution_x, sc.render.resolution_y = res
    a_, e_ = math.radians(yaw), math.radians(elev)
    fwd = -np.array([math.sin(a_) * math.cos(e_), -math.cos(a_) * math.cos(e_), math.sin(e_)])
    right = np.cross(fwd, [0, 0, 1]); right /= np.linalg.norm(right); up = np.cross(right, fwd)
    pr, pu = pts @ right, pts @ up
    c = right * (pr.max() + pr.min()) / 2 + up * (pu.max() + pu.min()) / 2
    asp = res[0] / res[1]
    cam.data.ortho_scale = pad * max(pu.max() - pu.min(), (pr.max() - pr.min()) / asp) * max(1, 1 / asp)
    cam.location = Vector(c - fwd * 6); cam.rotation_euler = Vector(-fwd).to_track_quat("Z", "Y").to_euler()
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)


for f in json.loads(sc["gnarls_frames"]):
    sc.frame_set(f["frame"])
    pts = eval_pts(ob)
    if f["kind"] == "face":
        zz = pts[:, 2]; head = pts[zz > zz.min() + 0.55 * (zz.max() - zz.min())]
        shoot(os.path.join(OUT, f["name"] + ".png"), 0, head, elev=2, pad=1.05, res=(900, 900))
    else:
        if sign is not None and not sign.hide_render: pts = np.concatenate([pts, eval_pts(sign)])
        shoot(os.path.join(OUT, f"pose_{f['frame']}_{f['name']}.png"), f["yaw"], pts)
    print("rendered", f["frame"], f["name"], "eyes", ob.get("eyes"), "mouth", ob.get("mouth"))
