# Shared pieces of the housing bake (kit/bake/*.py): the parts in world space, the sheet cameras, silhouettes.
# The kit sheets (kit/rolodex-parts-kit-*.png) are 2400 x 1200: a 4 x 2 grid of 600 x 600 cells, each part centred
# in its cell and framed to 1.2x its bounding diagonal, orthographic, looking along -(1, 0.8, 1.6) for the front and
# -(-1, 0.6, -1.6) for the back (the camera sits on the given side). The painted sheets are 1696 x 2528, 2 x 4 cells
# of 848 x 632, in the same label order.
import os
import subprocess

import cv2
import numpy as np
import trimesh

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
KIT = os.path.join(ROOT, "kit")
WORK = os.path.join(KIT, "work")
GLB = os.path.join(ROOT, "public", "models", "housing.glb")
GT = os.path.expanduser("~/tools/gt/node_modules/.bin/gltf-transform")

# label -> (meshes, name); the 6 housing parts, and the two paper panels used for the paper tile only
PARTS = {
    "A": (["frame"], "frame"),
    "B": (["base"], "base"),
    "C": (["side_right"], "side_right"),
    "D": (["side_right_inner", "side_left_inner"], "inner discs"),
    "E": (["knob_right"], "knob_right"),
    "F": (["knob_left", "knob_left_cap", "knob_left_face"], "knob_left"),
}
VIEWS = {"front": np.array([1.0, 0.8, 1.6]), "back": np.array([-1.0, 0.6, -1.6])}
ORDER = "ABCDEFGH"
KIT_CELL = 600
PAINT_CELL = (848, 632)  # w, h


def scene():
    """the housing with meshopt and quantization undone (gltf-transform), as trimesh, node transforms applied"""
    dq = os.path.join(WORK, "housing-dq.glb")
    if not os.path.exists(dq):
        os.makedirs(WORK, exist_ok=True)
        subprocess.run([GT, "dequantize", GLB, dq], check=True, shell=os.name == "nt")
    return trimesh.load(dq)


def part_meshes(sc, label):
    """the label's meshes in world space, by node name (side_left_inner is the mirrored instance)"""
    out = []
    for node in sc.graph.nodes_geometry:
        if node in PARTS[label][0]:
            T, g = sc.graph[node]
            m = sc.geometry[g].copy()
            m.apply_transform(T)
            out.append((node, m))
    return out


def camera(view):
    """orthographic basis: z toward the camera (the given direction), x right, y up (world +Y projected); view is a
    sheet name or a direction of its own (fit.py's elevation search for the round base)"""
    d = VIEWS[view] if isinstance(view, str) else np.asarray(view, float)
    z = d / np.linalg.norm(d)
    up = np.array([0.0, 1.0, 0.0])
    x = np.cross(up, z); x /= np.linalg.norm(x)
    y = np.cross(z, x)
    return x, y, z


def frame_of(meshes):
    """centre and size of the framing: the parts' bounding box centre, 1.2x its diagonal"""
    lo = np.min([m.bounds[0] for _, m in meshes], axis=0)
    hi = np.max([m.bounds[1] for _, m in meshes], axis=0)
    return (lo + hi) / 2, 1.2 * np.linalg.norm(hi - lo)


def project(points, view, centre, span, cell=KIT_CELL):
    """world points -> pixel (x, y) in a cell, and depth toward the camera (larger is nearer)"""
    x, y, z = camera(view)
    d = points - centre
    s = cell / span
    return np.stack([cell / 2 + d @ x * s, cell / 2 - d @ y * s], 1), d @ z


def silhouette(meshes, view, cell=KIT_CELL, scale=4):
    """the parts' silhouette in a cell, rasterised at scale x and area-averaged down (antialiased, 0..1)"""
    centre, span = frame_of(meshes)
    big = np.zeros((cell * scale, cell * scale), np.uint8)
    for _, m in meshes:
        px, _ = project(m.vertices, view, centre, span, cell * scale)
        tris = np.round(px[m.faces] * 16).astype(np.int32)  # 4 bits of subpixel precision
        # one triangle at a time: fillPoly with many polygons fills even-odd, and overlapping triangles would cancel
        for t in tris:
            cv2.fillConvexPoly(big, t, 255, lineType=cv2.LINE_8, shift=4)
    return cv2.resize(big, (cell, cell), interpolation=cv2.INTER_AREA).astype(np.float32) / 255


def iou(a, b):
    a, b = a > 0.5, b > 0.5
    u = (a | b).sum()
    return float((a & b).sum() / u) if u else 0.0
