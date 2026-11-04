# Step 2b: project the painted sheets onto each part's atlas, and fill what no view sees from a tile.
# For every atlas texel (rasterised from the part's UV triangles) its world position and normal; for each view whose
# fit passed (fit.json, IoU >= 0.92): is the texel the nearest surface along that view (a depth map of the part
# from the sheet camera), and does it land inside the painted part's mask eroded by 2 px (so no background bleeds
# in)? Where both views see it, they blend by facing angle (cos^2 of the normal against the view). Texels neither
# view sees take a seamless tile cut from the part's own painted pixels, mapped triplanar in world space at the
# painting's own scale, so nothing is grey or stretched. Parts with no passing view are not baked at all.
# Writes kit/work/bake-<label>-albedo.png (2048, gutters dilated), bake-<label>-src.png (0 empty, 1 projected,
# 2 tile) and kit/work/bake.json with each part's coverage.
import json
import os
import sys
import time

import cv2
import numpy as np
from scipy import ndimage

sys.path.insert(0, os.path.dirname(__file__))
from common import KIT_CELL, PARTS, WORK, camera, frame_of, part_meshes, project, scene

SIZE = 2048
ZRES = 2  # the depth map is ZRES x the cell's resolution
ERODE = 2


def raster(px, W, H):
    """every pixel centre inside each triangle: (triangle, x, y, barycentrics (n, 3)); px is (T, 3, 2) in pixels"""
    lo = np.floor(px.min(1) - 0.5).astype(int).clip(0, [W - 1, H - 1])
    hi = np.ceil(px.max(1) - 0.5).astype(int).clip(0, [W - 1, H - 1])
    w, h = hi[:, 0] - lo[:, 0] + 1, hi[:, 1] - lo[:, 1] + 1
    n = w * h
    tri = np.repeat(np.arange(len(px)), n)
    k = np.arange(n.sum()) - np.repeat(np.cumsum(n) - n, n)
    x = lo[tri, 0] + k % w[tri]
    y = lo[tri, 1] + k // w[tri]
    a, b, c = px[tri, 0], px[tri, 1], px[tri, 2]
    p = np.stack([x + 0.5, y + 0.5], 1)
    v0, v1, v2 = b - a, c - a, p - a
    d = v0[:, 0] * v1[:, 1] - v1[:, 0] * v0[:, 1]
    d = np.where(np.abs(d) < 1e-12, 1e-12, d)
    l1 = (v2[:, 0] * v1[:, 1] - v1[:, 0] * v2[:, 1]) / d
    l2 = (v0[:, 0] * v2[:, 1] - v2[:, 0] * v0[:, 1]) / d
    l0 = 1 - l1 - l2
    inside = (l0 >= -1e-4) & (l1 >= -1e-4) & (l2 >= -1e-4)
    return tri[inside], x[inside], y[inside], np.stack([l0, l1, l2], 1)[inside]


def depth_map(meshes, view, centre, span):
    """the nearest depth (toward the camera) at each pixel of the cell, at ZRES x resolution"""
    R = KIT_CELL * ZRES
    z = np.full(R * R, -np.inf)
    for _, m in meshes:
        px, d = project(m.vertices, view, centre, span, R)
        f = m.faces
        for s in range(0, len(f), 20000):  # in chunks, to bound memory
            ff = f[s:s + 20000]
            tri, x, y, bc = raster(px[ff], R, R)
            dz = (d[ff][tri] * bc).sum(1)
            np.maximum.at(z, y * R + x, dz)
    return z.reshape(R, R)


def bilinear(img, x, y):
    h, w = img.shape[:2]
    x = np.clip(x, 0, w - 1.001); y = np.clip(y, 0, h - 1.001)
    x0, y0 = x.astype(int), y.astype(int)
    fx, fy = (x - x0)[:, None], (y - y0)[:, None]
    a = img[y0, x0] * (1 - fx) + img[y0, x0 + 1] * fx
    b = img[y0 + 1, x0] * (1 - fx) + img[y0 + 1, x0 + 1] * fx
    return a * (1 - fy) + b * fy


def seamless_tile(rgb, mask, sizes=(128, 96, 64, 48, 32)):
    """the calmest square of the painted part that lies wholly inside it, made to wrap: blended with itself shifted
    by half, with a window that is 1 in the middle and 0 at the edges, so the edges are the middle of the patch"""
    g = cv2.cvtColor(rgb.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)
    energy = np.abs(cv2.Sobel(g, cv2.CV_32F, 1, 0)) + np.abs(cv2.Sobel(g, cv2.CV_32F, 0, 1))
    for n in sizes:
        inner = ndimage.binary_erosion(mask, iterations=4)
        # windows wholly inside: the mask's integral image over the window equals its area
        ii = cv2.integral(inner.astype(np.uint8))
        ie = cv2.integral(energy)
        H, W = mask.shape
        best = None
        for y in range(0, H - n, 4):
            for x in range(0, W - n, 4):
                if ii[y + n, x + n] - ii[y, x + n] - ii[y + n, x] + ii[y, x] == n * n:
                    e = ie[y + n, x + n] - ie[y, x + n] - ie[y + n, x] + ie[y, x]
                    if best is None or e < best[0]:
                        best = (e, x, y)
        if best:
            _, x, y = best
            p = rgb[y:y + n, x:x + n].astype(np.float32)
            t = np.sin(np.pi * (np.arange(n) + 0.5) / n) ** 2
            w = (t[:, None] * t[None, :])[..., None]
            return w * p + (1 - w) * np.roll(p, (n // 2, n // 2), (0, 1)), n
    return None, 0


def triplanar(tile, P, N, world_per_px):
    n = tile.shape[0]
    w = np.abs(N) ** 4
    w /= w.sum(1, keepdims=True)
    out = 0
    for k, (a, b) in enumerate([(2, 1), (0, 2), (0, 1)]):
        u = (P[:, a] / world_per_px) % n
        v = (P[:, b] / world_per_px) % n
        # wrap-around bilinear
        x0, y0 = np.floor(u).astype(int) % n, np.floor(v).astype(int) % n
        x1, y1 = (x0 + 1) % n, (y0 + 1) % n
        fx, fy = (u - np.floor(u))[:, None], (v - np.floor(v))[:, None]
        s = (tile[y0, x0] * (1 - fx) + tile[y0, x1] * fx) * (1 - fy) + (tile[y1, x0] * (1 - fx) + tile[y1, x1] * fx) * fy
        out = out + s * w[:, k:k + 1]
    return out


if __name__ == "__main__":
    sc = scene()
    fits = json.load(open(os.path.join(WORK, "fit.json")))
    report = {}
    for label, (names, title) in PARTS.items():
        t0 = time.time()
        views = [v for v in ("front", "back") if fits[f"{v}/{label}"]["pass"]]
        if not views:
            report[label] = {"part": title, "baked": False, "why": "no view passed the fit (IoU < 0.92 in both): left on its previous material"}
            print(label, title, "not baked")
            continue
        meshes = part_meshes(sc, label)
        centre, span = frame_of(meshes)
        uv = np.load(os.path.join(WORK, f"uv-{label}.npz"))
        # per view: depth map, painted pixels, eroded mask, fit matrix inverted (cell px -> painted px)
        V = {}
        for v in views:
            rgba = cv2.imread(os.path.join(WORK, f"paint-{v}-{label}.png"), cv2.IMREAD_UNCHANGED)
            mask = rgba[..., 3] > 127
            M = np.array(fits[f"{v}/{label}"]["matrix"])
            Minv = cv2.invertAffineTransform(M)
            vd = np.array(fits[f"{v}/{label}"]["dir"])  # the sheet's direction, or the one the fit found (round parts)
            V[v] = {"dir": vd, "z": depth_map(meshes, vd, centre, span), "rgb": rgba[..., :3].astype(np.float32), "mask": ndimage.binary_erosion(mask, iterations=ERODE),
                    "Minv": Minv, "cam": camera(vd), "scale": fits[f"{v}/{label}"]["scale"], "full": mask}
        # the tile: from the view that passed with the larger painted part
        tv = max(views, key=lambda v: V[v]["full"].sum())
        tile, tn = seamless_tile(V[tv]["rgb"], V[tv]["full"])
        world_per_px = span / KIT_CELL / V[tv]["scale"]  # painted px -> metres
        albedo = np.zeros((SIZE, SIZE, 3), np.float32)
        src = np.zeros((SIZE, SIZE), np.uint8)
        eps = 0.004 * span
        for node, m in meshes:
            g = sc.graph[node][1]
            vmap, idx, uvs = uv[f"{g}.vmapping"], uv[f"{g}.indices"], uv[f"{g}.uvs"]
            Pw = np.asarray(m.vertices)[vmap]  # world positions (m is already in world space)
            Nw = np.asarray(m.vertex_normals)[vmap]
            px = uvs[idx] * SIZE
            tri, x, y, bc = raster(px, SIZE, SIZE)
            P = (Pw[idx][tri] * bc[..., None]).sum(1)
            N = (Nw[idx][tri] * bc[..., None]).sum(1)
            N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-9
            acc = np.zeros((len(tri), 3)); wsum = np.zeros(len(tri))
            for v in views:
                d = V[v]
                cx, cz = project(P, d["dir"], centre, span)
                # nearest along the view: the texel's depth against the depth map
                zx = np.clip((cx[:, 0] * ZRES).astype(int), 0, KIT_CELL * ZRES - 1)
                zy = np.clip((cx[:, 1] * ZRES).astype(int), 0, KIT_CELL * ZRES - 1)
                seen = cz >= d["z"][zy, zx] - eps
                # into the painted sheet's cell
                q = cx @ d["Minv"][:, :2].T + d["Minv"][:, 2]
                qi = np.round(q).astype(int)
                H, W = d["mask"].shape
                inb = (qi[:, 0] >= 0) & (qi[:, 0] < W) & (qi[:, 1] >= 0) & (qi[:, 1] < H)
                ok = seen & inb
                ok[ok] &= d["mask"][qi[ok, 1], qi[ok, 0]]
                facing = np.clip(N @ d["cam"][2], 0, 1) ** 2
                ok &= facing > 0.02
                col = bilinear(d["rgb"], q[ok, 0], q[ok, 1])
                acc[ok] += col * facing[ok, None]
                wsum[ok] += facing[ok]
            proj = wsum > 0
            # where a mirrored instance (the left disc) has already projected onto a texel, keep the stronger one
            better = proj & ((src[y, x] != 1) | (wsum > 0))
            albedo[y[better], x[better]] = acc[better] / wsum[better, None]
            src[y[better], x[better]] = 1
            rest = ~proj & (src[y, x] != 1)
            if tile is not None and rest.any():
                albedo[y[rest], x[rest]] = triplanar(tile, P[rest], N[rest], world_per_px)
                src[y[rest], x[rest]] = 2
        covered = src > 0
        stats = {"part": title, "baked": True, "views": views, "atlasTexels": int(covered.sum()), "projectedPct": round(100 * float((src == 1).sum()) / covered.sum(), 1),
                 "tilePct": round(100 * float((src == 2).sum()) / covered.sum(), 1), "atlasFilledPct": round(100 * float(covered.mean()), 1), "tileFrom": tv, "tilePx": tn,
                 "tileWorldM": round(tn * world_per_px, 4)}
        # gutters: every empty texel takes its nearest filled one, so mips and filtering never pull in black
        idx_ = ndimage.distance_transform_edt(~covered, return_distances=False, return_indices=True)
        albedo = albedo[idx_[0], idx_[1]]
        cv2.imwrite(os.path.join(WORK, f"bake-{label}-albedo.png"), np.clip(albedo, 0, 255).astype(np.uint8))
        cv2.imwrite(os.path.join(WORK, f"bake-{label}-src.png"), (src * 120).astype(np.uint8))
        if tile is not None:
            cv2.imwrite(os.path.join(WORK, f"tile-{label}.png"), np.clip(tile, 0, 255).astype(np.uint8))
        report[label] = stats
        print(label, title.ljust(12), stats, f"{time.time() - t0:.1f}s")
    json.dump(report, open(os.path.join(WORK, "bake.json"), "w"), indent=2)
