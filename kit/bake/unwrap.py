# Step 2a: clean UVs per part with xatlas, one 2048 atlas a part (a part's meshes share it: knob_left with its cap
# and face). The inner discs are one mesh drawn twice (side_left_inner is the mirrored instance), so they unwrap
# once and both instances use the same atlas. Each mesh is unwrapped in its own local space (the space the GLB
# keeps it in), so the result drops straight back into the model. Writes kit/work/uv-<label>.npz:
# per mesh, vmapping (new vertex -> old vertex), indices and uvs.
import os
import sys
import time

import numpy as np
import xatlas

sys.path.insert(0, os.path.dirname(__file__))
from common import PARTS, WORK, scene

SIZE, PADDING = 2048, 6

if __name__ == "__main__":
    sc = scene()
    for label, (names, title) in PARTS.items():
        t = time.time()
        geoms = []
        for node in sc.graph.nodes_geometry:
            if node in names:
                g = sc.graph[node][1]
                if g not in geoms:
                    geoms.append(g)
        atlas = xatlas.Atlas()
        for g in geoms:
            m = sc.geometry[g]
            atlas.add_mesh(np.asarray(m.vertices, np.float32), np.asarray(m.faces, np.uint32), np.asarray(m.vertex_normals, np.float32))
        co = xatlas.ChartOptions()
        po = xatlas.PackOptions()
        po.resolution = SIZE
        po.padding = PADDING
        po.bilinear = True
        po.rotate_charts = True
        atlas.generate(co, po)
        out = {}
        for k, g in enumerate(geoms):
            vmap, idx, uv = atlas[k]
            out[f"{g}.vmapping"] = vmap
            out[f"{g}.indices"] = idx
            out[f"{g}.uvs"] = uv
        np.savez(os.path.join(WORK, f"uv-{label}.npz"), geoms=np.array(geoms), **out)
        print(label, title.ljust(12), "meshes", geoms, "charts", atlas.chart_count, "utilisation", round(float(atlas.utilization), 3), "atlases", atlas.atlas_count, f"{time.time() - t:.1f}s")
