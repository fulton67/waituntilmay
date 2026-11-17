"""Export the body mesh for make_parts.py: verts, loops, albedo UVs, face_mask and bone weights.
blender -b gnarls_rig.blend --factory-startup -P export_mesh.py -- gen/mesh.npz"""
import sys
import bpy
import numpy as np

OUT = sys.argv[sys.argv.index("--") + 1]
ob = bpy.data.objects["Gnarls"]; me = ob.data
nv, nl, np_ = len(me.vertices), len(me.loops), len(me.polygons)
co = np.empty(nv * 3); me.vertices.foreach_get("co", co)
lv = np.empty(nl, np.int64); me.loops.foreach_get("vertex_index", lv)
ls = np.empty(np_, np.int64); me.polygons.foreach_get("loop_start", ls)
lt = np.empty(np_, np.int64); me.polygons.foreach_get("loop_total", lt)
uv = np.empty(nl * 2); me.uv_layers["albedo_uv"].data.foreach_get("uv", uv)
fm = np.empty(nv, np.float32); me.attributes["face_mask"].data.foreach_get("value", fm)
W = np.zeros((nv, len(ob.vertex_groups)), np.float32)
for v in me.vertices:
    for g in v.groups: W[v.index, g.group] = g.weight
np.savez(OUT, co=co.reshape(-1, 3), lv=lv, ls=ls, lt=lt, uv=uv.reshape(-1, 2), fm=fm, W=W,
         vg=np.array([g.name for g in ob.vertex_groups]))
print("exported", nv, "verts", np_, "faces ->", OUT)
