# The cradle (the saddle under the drum): kit/cradle.glb as its geometry, textured from kit/painted-cradle.png.
#   ~/tools/rolodex-venv/Scripts/python -I kit/bake/cradle.py
# 1. Geometry: the GLB is already in the housing's world frame (0.512 m wide, centred on the drum axis at
#    y 0.585, z 0.005); its radii about the axis, its distance to the frame, and its clearance to the sleeves.
# 2. Camera: the painted cradle is cut out (background removal, as extract.py) and the camera direction is searched
#    (azimuth and elevation, coarse then fine), each direction's silhouette fitted to the cutout with a similarity
#    transform (fit.py). The best IoU has to reach 0.92, or the bake stops.
# 3. Bake: xatlas UVs (2048), projection from that camera with the mask eroded by 2 px, depth-tested; a texel the
#    camera cannot see takes its mirror image across the cradle's two planes of symmetry (x = 0, z = axis) when
#    that is seen, so the rust on the visible edges lands on the hidden ones; the rest is a seamless tile of the
#    painted part, triplanar.
# 4. Maps: roughness, metalness and normal from the albedo as for the other painted parts (pbr.maps: paint 0.45,
#    rust 0.85, metal 0.7 / 0.9, Sobel 0.5).
# Writes public/models/cradle-baked.glb (unquantized, identity node), public/models/housing-maps/cradle-*, kit/work/cradle.json.
import json
import os
import sys

import cv2
import numpy as np
import trimesh
import xatlas
from scipy import ndimage

sys.path.insert(0, os.path.dirname(__file__))
from common import KIT, KIT_CELL, ROOT, WORK, iou, part_meshes, project, scene, silhouette, camera
from fit import fit, matrix, warp
from bake import raster, depth_map, bilinear, seamless_tile, triplanar
from pbr import maps

AXIS = np.array([0.0, 0.585, 0.005])
SIZE, PASS, ERODE = 2048, 0.92, 2
SLEEVE_R = 0.40201  # the sleeves' farthest point from the axis through a full turn (scripts/gillenwebsite/sleeves.mjs)
OUT = os.path.join(ROOT, "public", "models")


def cutout():
    """the painted cradle against its light grey ground: far from the ground's colour in Lab (lightness alone has
    to go well past a soft shadow), largest component, pinholes filled, real openings kept"""
    c = cv2.imread(os.path.join(KIT, "painted-cradle.png"))
    lab = cv2.cvtColor(c, cv2.COLOR_BGR2LAB).astype(np.float32)
    lab[..., 0] *= 100 / 255; lab[..., 1:] -= 128
    h, w = c.shape[:2]
    ring = np.zeros((h, w), bool); ring[:8] = ring[-8:] = True; ring[:, :8] = ring[:, -8:] = True
    bg = np.median(lab[ring], axis=0)
    dL, dC = bg[0] - lab[..., 0], np.hypot(lab[..., 1] - bg[1], lab[..., 2] - bg[2])
    m = (dL > 14) | (dC > 4)
    m = ndimage.binary_opening(m, iterations=1)
    lab_, n = ndimage.label(m)
    m = lab_ == (np.argmax(ndimage.sum(m, lab_, range(1, n + 1))) + 1)
    m = ndimage.binary_closing(m, iterations=2)
    holes = ndimage.binary_fill_holes(m) & ~m
    hl, hn = ndimage.label(holes)
    if hn:
        m |= np.isin(hl, np.where(ndimage.sum(holes, hl, range(1, hn + 1)) < 300)[0] + 1)
    return c.astype(np.float32), m


def direction(az, el):
    a, e = np.radians(az), np.radians(el)
    return np.array([np.sin(a) * np.cos(e), np.sin(e), np.cos(a) * np.cos(e)])


if __name__ == "__main__":
    sc = trimesh.load(os.path.join(KIT, "cradle.glb"))
    mesh = sc.to_geometry() if hasattr(sc, "to_geometry") else sc
    mesh.merge_vertices()
    meshes = [("cradle", mesh)]
    rep = {}
    # ---- 1. geometry against the housing ----
    v = mesh.vertices
    r = np.hypot(v[:, 1] - AXIS[1], v[:, 2] - AXIS[2])
    rep["geometry"] = {"vertices": int(len(v)), "faces": int(len(mesh.faces)), "widthM": round(float(np.ptp(v[:, 0])), 4), "boundsM": mesh.bounds.round(4).tolist(),
                       "radiusMinM": round(float(r.min()), 4), "radiusMaxM": round(float(r.max()), 4),
                       "centreZ": round(float((v[:, 2].min() + v[:, 2].max()) / 2), 4)}
    hs = scene()
    frame = part_meshes(hs, "A")[0][1]
    # how close the cradle comes to the frame: from the cradle's points to the frame's surface, and back
    pq = trimesh.proximity.ProximityQuery(frame)
    samples = mesh.sample(20000)
    d1 = pq.distance(samples) if hasattr(pq, "distance") else np.abs(pq.signed_distance(samples))
    pq2 = trimesh.proximity.ProximityQuery(mesh)
    fs = frame.sample(40000)
    near = fs[np.abs(fs[:, 0]) < 0.3]
    d2 = np.abs(pq2.signed_distance(near))
    # inside the frame's material: points of the cradle with the frame's surface on both sides along x (the frame's
    # side rails run along x) are counted by a ray test; the frame mesh is not watertight, so this is a ray parity test
    inside = frame.ray.contains_points(samples) if frame.is_watertight else None
    rep["frame"] = {"closestCradleToFrameMm": round(float(d1.min()) * 1000, 2), "closestFrameToCradleMm": round(float(d2.min()) * 1000, 2),
                    "cradlePointsWithin1mmPct": round(100 * float((d1 < 0.001).mean()), 2), "frameWatertight": bool(frame.is_watertight),
                    "penetrating": None if inside is None else int(inside.sum())}
    rep["sleeves"] = {"sleeveMaxRadiusM": SLEEVE_R, "cradleInnerRadiusM": rep["geometry"]["radiusMinM"], "clearanceMm": round((rep["geometry"]["radiusMinM"] - SLEEVE_R) * 1000, 1)}
    print("geometry", rep["geometry"]); print("frame", rep["frame"]); print("sleeves", rep["sleeves"])

    # ---- 2. the painted camera ----
    rgb, m = cutout()
    H, W = m.shape
    pad = max(H, W)
    sq = np.zeros((pad, pad), np.float32); sq[(pad - H) // 2:(pad - H) // 2 + H, (pad - W) // 2:(pad - W) // 2 + W] = m
    best = None
    for az in range(-180, 180, 15):
        for el in range(5, 86, 10):
            u = fit(silhouette(meshes, direction(az, el), scale=2), sq)[1]
            if best is None or u > best[0]:
                best = (u, az, el)
    print("coarse", best)
    for step in (5, 2, 1):
        u0, az0, el0 = best
        for az in np.arange(az0 - 2 * step, az0 + 2 * step + 0.01, step):
            for el in np.arange(max(1, el0 - 2 * step), min(89, el0 + 2 * step) + 0.01, step):
                u = fit(silhouette(meshes, direction(az, el), scale=2), sq)[1]
                if u > best[0]:
                    best = (u, float(az), float(el))
        print("refine", step, best)
    u, az, el = best
    d = direction(az, el)
    sil = silhouette(meshes, d)
    vfit, ufull, c = fit(sil, sq)
    M = matrix(*vfit, c)
    rep["camera"] = {"azimuthDeg": az, "elevationDeg": el, "direction": d.round(5).tolist(), "iou": round(ufull, 4), "scale": round(float(vfit[0]), 4), "rotationDeg": round(float(vfit[1]), 3), "pass": ufull >= PASS}
    cv2.imwrite(os.path.join(WORK, "cradle-fit.png"), np.dstack([np.zeros_like(sil), (warp(sq, M, KIT_CELL) > 0.5) * 255, (sil > 0.5) * 255]).astype(np.uint8))
    print("camera", rep["camera"])
    json.dump(rep, open(os.path.join(WORK, "cradle.json"), "w"), indent=2)
    if ufull < PASS:
        print(f"STOP: IoU {ufull:.4f} < {PASS}")
        sys.exit(2)

    # ---- 3. bake ----
    atlas = xatlas.Atlas()
    atlas.add_mesh(np.asarray(mesh.vertices, np.float32), np.asarray(mesh.faces, np.uint32), np.asarray(mesh.vertex_normals, np.float32))
    po = xatlas.PackOptions(); po.resolution = SIZE; po.padding = 6; po.bilinear = True; po.rotate_charts = True
    atlas.generate(xatlas.ChartOptions(), po)
    vmap, idx, uvs = atlas[0]
    # the painted sheet in the cell's frame: painted px are the padded square's, shifted back to the image
    off = np.array([(pad - W) // 2, (pad - H) // 2])
    Minv = cv2.invertAffineTransform(M)
    from common import frame_of
    centre, span = frame_of(meshes)
    z = depth_map(meshes, d, centre, span)
    mask = ndimage.binary_erosion(m, iterations=ERODE)
    cam_z = camera(d)[2]
    eps = 0.004 * span
    P0, N0 = np.asarray(mesh.vertices)[vmap], np.asarray(mesh.vertex_normals)[vmap]
    tri, x, y, bc = raster(uvs[idx] * SIZE, SIZE, SIZE)
    P = (P0[idx][tri] * bc[..., None]).sum(1)
    N = (N0[idx][tri] * bc[..., None]).sum(1); N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-9

    def sample(P, N):
        cx, cz = project(P, d, centre, span)
        zx = np.clip((cx[:, 0] * 2).astype(int), 0, KIT_CELL * 2 - 1); zy = np.clip((cx[:, 1] * 2).astype(int), 0, KIT_CELL * 2 - 1)
        seen = cz >= z[zy, zx] - eps
        q = cx @ Minv[:, :2].T + Minv[:, 2] - off
        qi = np.round(q).astype(int)
        ok = seen & (qi[:, 0] >= 0) & (qi[:, 0] < W) & (qi[:, 1] >= 0) & (qi[:, 1] < H) & (np.clip(N @ cam_z, 0, 1) > 0.05)
        ok[ok] &= mask[qi[ok, 1], qi[ok, 0]]
        col = np.zeros((len(P), 3), np.float32)
        col[ok] = bilinear(rgb, q[ok, 0], q[ok, 1])
        return ok, col

    albedo = np.zeros((SIZE, SIZE, 3), np.float32); src = np.zeros((SIZE, SIZE), np.uint8)
    ok, col = sample(P, N)
    albedo[y[ok], x[ok]] = col[ok]; src[y[ok], x[ok]] = 1
    # hidden texels: their mirror images across x = 0 and across the axis plane in z, when the camera sees those
    rest = ~ok
    for sx, sz in ((-1, 1), (1, -1), (-1, -1)):
        if not rest.any():
            break
        Pm = P[rest].copy(); Nm = N[rest].copy()
        Pm[:, 0] *= sx; Nm[:, 0] *= sx
        if sz < 0:
            Pm[:, 2] = 2 * AXIS[2] - Pm[:, 2]; Nm[:, 2] *= -1
        okm, colm = sample(Pm, Nm)
        ids = np.where(rest)[0][okm]
        albedo[y[ids], x[ids]] = colm[okm]; src[y[ids], x[ids]] = 3
        rest[ids] = False
    tile, tn = seamless_tile(rgb, m)
    world_per_px = span / KIT_CELL / vfit[0]
    if rest.any():
        albedo[y[rest], x[rest]] = triplanar(tile, P[rest], N[rest], world_per_px)
        src[y[rest], x[rest]] = 2
    covered = src > 0
    rep["coverage"] = {"projectedPct": round(100 * float((src == 1).sum()) / covered.sum(), 1), "mirroredPct": round(100 * float((src == 3).sum()) / covered.sum(), 1),
                       "tilePct": round(100 * float((src == 2).sum()) / covered.sum(), 1), "atlasFilledPct": round(100 * float(covered.mean()), 1), "tilePx": tn}
    print("coverage", rep["coverage"])
    ii = ndimage.distance_transform_edt(~covered, return_distances=False, return_indices=True)
    albedo = np.clip(albedo[ii[0], ii[1]], 0, 255).astype(np.uint8)
    cv2.imwrite(os.path.join(WORK, "bake-cradle-albedo.png"), albedo)
    cv2.imwrite(os.path.join(WORK, "bake-cradle-src.png"), (src * 80).astype(np.uint8))

    # ---- 4. maps (as the frame: metal paint) ----
    rm, normal, st = maps("A", albedo)
    os.makedirs(os.path.join(OUT, "housing-maps"), exist_ok=True)
    cv2.imwrite(os.path.join(OUT, "housing-maps", "cradle-albedo.jpg"), cv2.resize(albedo, (1024, 1024), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 90])
    cv2.imwrite(os.path.join(OUT, "housing-maps", "cradle-rm.png"), cv2.resize(rm, (512, 512), interpolation=cv2.INTER_AREA))
    cv2.imwrite(os.path.join(OUT, "housing-maps", "cradle-normal.png"), cv2.resize(normal, (512, 512), interpolation=cv2.INTER_AREA))
    rep["maps"] = {**st, "albedo": 1024, "rm": 512, "normal": 512, "gpuMB": round((1024 * 1024 + 2 * 512 * 512) * 4 * 4 / 3 / 2 ** 20, 2)}

    # ---- geometry with its UVs (glTF v as xatlas's; trimesh flips on export, so it gets 1 - v) ----
    t = np.array(uvs, np.float64); t[:, 1] = 1 - t[:, 1]
    out = trimesh.Trimesh(vertices=P0, faces=idx, vertex_normals=N0, visual=trimesh.visual.TextureVisuals(uv=t), process=False)
    s2 = trimesh.Scene(); s2.add_geometry(out, geom_name="cradle", node_name="cradle")
    # written as it is, float positions and an identity node: the GLB is already in the housing's world frame, and
    # meshopt's quantization would move its dequantizing offset and scale onto the node (58 KB uncompressed anyway)
    s2.export(os.path.join(OUT, "cradle-baked.glb"))
    json.dump(rep, open(os.path.join(WORK, "cradle.json"), "w"), indent=2)
    print("maps", rep["maps"])
