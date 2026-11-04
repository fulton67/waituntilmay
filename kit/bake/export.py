# The baked parts' geometry with their new UVs, as public/models/housing-baked.glb: one mesh per GLB mesh name, in
# the mesh's own local space, so Rolodex.tsx can swap each housing node's geometry for the baked one by name (both
# inner disc nodes take the one side_right_inner mesh). The UVs are written so the image's first row is v = 0, as
# glTF has it (trimesh flips V on export, so it is handed 1 - v), then meshopt-compressed with gltf-transform.
import json
import os
import struct
import subprocess
import sys

import numpy as np
import trimesh

sys.path.insert(0, os.path.dirname(__file__))
from common import GT, PARTS, ROOT, WORK, scene

if __name__ == "__main__":
    sc = scene()
    bake = json.load(open(os.path.join(WORK, "bake.json")))
    out = trimesh.Scene()
    for label in PARTS:
        if not bake[label].get("baked"):
            continue
        uv = np.load(os.path.join(WORK, f"uv-{label}.npz"))
        for g in uv["geoms"]:
            g = str(g)
            m = sc.geometry[g]
            vmap, idx, uvs = uv[f"{g}.vmapping"], uv[f"{g}.indices"], uv[f"{g}.uvs"]
            t = np.array(uvs, np.float64)
            t[:, 1] = 1 - t[:, 1]
            mesh = trimesh.Trimesh(vertices=np.asarray(m.vertices)[vmap], faces=idx, vertex_normals=np.asarray(m.vertex_normals)[vmap],
                                   visual=trimesh.visual.TextureVisuals(uv=t), process=False)
            out.add_geometry(mesh, geom_name=g, node_name=g)
    raw = os.path.join(WORK, "housing-baked-raw.glb")
    out.export(raw)
    # check the UVs as written: the accessor's first v against xatlas's
    b = open(raw, "rb").read()
    n = struct.unpack("<I", b[12:16])[0]
    j = json.loads(b[20:20 + n])
    print("meshes", [m["name"] for m in j["meshes"]])
    dst = os.path.join(ROOT, "public", "models", "housing-baked.glb")
    subprocess.run([GT, "meshopt", raw, dst], check=True, shell=os.name == "nt")
    print("wrote", dst, os.path.getsize(dst))
