"""Repair the body mesh before parts and materials: the 3D model's leftovers that real lighting exposes.
0. The old glasses zone: the removed frame left crumpled, folded faces and a normals seam round each lens. The zone
   (vertex group "outline" < 0.5) plus a 2 cm ring is laid onto a smooth surface fitted to the clean head, with that
   surface's analytic normals, so it reads as one continuous head; the folds' inward-facing layers are deleted.
blender -b gnarls_rig.blend --factory-startup -P repair_mesh.py -- OUT.blend

1. The back tab: Tripo modelled the back reference's tail as a ~0.1-deep fin sticking out of the back of the tee
   (z 0.22-0.42). Its verts are pulled radially onto the back's own surface (the radius just either side of it,
   per height), with the custom normals set to that surface's normal, so it vanishes into the tee.
2. Holes: the glasses removal (fix_glasses.py) cut 10 small slits in the face patch. They are filled, triangulated,
   and given the neighbours' UVs and normals.
3. Frame paint: faces in the old frame zone, or with any corner still sampling the old drawn frame (dark ink /
   brown) in the albedo, are pointed at the patch's plain skin texel.
Custom normals of every other corner are kept as they were."""
import math, sys
import bpy, bmesh
import numpy as np

OUT = sys.argv[sys.argv.index("--") + 1]
ob = bpy.data.objects["Gnarls"]; me = ob.data
CY = 0.014
nv = len(me.vertices); nl = len(me.loops)
co = np.empty(nv * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
lv = np.empty(nl, np.int64); me.loops.foreach_get("vertex_index", lv)
cn = np.empty(nl * 3); me.corner_normals.foreach_get("vector", cn); cn = cn.reshape(-1, 3)
vg = {g.name: g.index for g in ob.vertex_groups}
limb = np.zeros(nv)
for v in me.vertices:
    for g in v.groups:
        n = ob.vertex_groups[g.group].name
        if n.startswith("fin") or n in ("fluke_L", "fluke_R"): limb[v.index] += g.weight

# ---- 0. the old glasses zone: lay it onto a smooth fitted head surface with analytic normals ----
# r(phi, z) about the body axis, Fourier (k<=4) x polynomial (z^0..4), fitted on clean head verts (not the patch,
# not the horn); the patch (vertex group "outline" < 0.5) and a 0.02 ring around it are projected onto it.
from mathutils.kdtree import KDTree
ol = np.ones(nv)
gi = vg.get("outline")
if gi is not None:
    for v in me.vertices:
        for g in v.groups:
            if g.group == gi: ol[v.index] = g.weight
phi = np.arctan2(co[:, 1] - CY, co[:, 0]); zz = co[:, 2]; rr = np.hypot(co[:, 0], co[:, 1] - CY)
def basis(p_, z_):
    zn = (z_ - 0.75) / 0.15; cols = []
    for i in range(5):
        for k_ in range(5):
            cols.append(zn ** i * np.cos(k_ * p_))
            if k_: cols.append(zn ** i * np.sin(k_ * p_))
    return np.stack(cols, 1)
thf = np.degrees(np.arctan2(co[:, 0], -(co[:, 1] - CY)))
band = (zz > 0.6) & (zz < 0.9) & (limb < 0.1)
patch = band & (ol < 0.5)
horn = (zz > 0.8) & (np.abs(thf) < 35)
fitm = band & ~patch & ~horn
kf, *_ = np.linalg.lstsq(basis(phi[fitm], zz[fitm]), rr[fitm], rcond=None)
res0 = rr[fitm] - basis(phi[fitm], zz[fitm]) @ kf
kd = KDTree(int(patch.sum()))
for i, idx in enumerate(np.nonzero(patch)[0]): kd.insert(co[idx], i)
kd.balance()
dist = np.full(nv, 1.0)
for idx in np.nonzero(band & ~horn)[0]:
    dist[idx] = kd.find(co[idx])[2]
wz = np.clip(1 - (dist - 0.004) / 0.02, 0, 1); wz[patch] = 1.0; wz[horn] = 0.0
sel = wz > 0
rf0 = basis(phi[sel], zz[sel]) @ kf
co[sel, 0] = (rr[sel] + wz[sel] * (rf0 - rr[sel])) * np.cos(phi[sel])
co[sel, 1] = CY + (rr[sel] + wz[sel] * (rf0 - rr[sel])) * np.sin(phi[sel])
e = 1e-4
r_p = (basis(phi[sel] + e, zz[sel]) @ kf - basis(phi[sel] - e, zz[sel]) @ kf) / (2 * e)
r_z = (basis(phi[sel], zz[sel] + e) @ kf - basis(phi[sel], zz[sel] - e) @ kf) / (2 * e)
c_, s_ = np.cos(phi[sel]), np.sin(phi[sel])
Sp = np.c_[r_p * c_ - rf0 * s_, r_p * s_ + rf0 * c_, np.zeros(sel.sum())]
Sz = np.c_[r_z * c_, r_z * s_, np.ones(sel.sum())]
nsel = np.cross(Sp, Sz); nsel /= np.linalg.norm(nsel, axis=1, keepdims=True)
nsel *= np.sign((nsel * np.c_[c_, s_, np.zeros(sel.sum())]).sum(1))[:, None]
nfull = np.zeros((nv, 3)); nfull[sel] = nsel
wl0 = wz[lv][:, None]
cn = cn * (1 - wl0) + nfull[lv] * wl0; cn /= np.linalg.norm(cn, axis=1, keepdims=True)
me.vertices.foreach_set("co", co.ravel())
print("glasses zone: fit rms", round(float(res0.std()), 4), "patch verts", int(patch.sum()), "with ring", int(sel.sum()))

# ---- 1. back tab ----
th = np.degrees(np.arctan2(co[:, 0], -(co[:, 1] - CY))); z = co[:, 2]; r = np.hypot(co[:, 0], co[:, 1] - CY)
back = 180 - np.abs(th)  # 0 at the centre of the back
zb = np.arange(0.16, 0.50, 0.01)
ref = []
for z0 in zb:
    s = (np.abs(z - z0) < 0.012) & (back > 14) & (back < 30) & (limb < 0.3)
    ref.append(np.median(r[s]) if s.sum() > 5 else np.nan)
ref = np.array(ref); ok = ~np.isnan(ref); ref = np.interp(zb, zb[ok], ref[ok])
k = np.polyfit(zb, ref, 3)
rf = np.polyval(k, z); drdz = np.polyval(np.polyder(k), z)
tab = (back < 18) & (z > 0.18) & (z < 0.46) & (limb < 0.5) & (r > rf + 0.004)
# grow a soft ring so the join is smooth
w = np.zeros(nv); w[tab] = 1.0
ring = (back < 24) & (z > 0.16) & (z < 0.48) & ~tab & (r > rf)
w[ring] = np.clip((r[ring] - rf[ring]) / 0.004, 0, 1)
newr = r + w * (rf - r)
ang = np.arctan2(co[:, 1] - CY, co[:, 0])
co2 = co.copy()
co2[:, 0] = np.where(w > 0, newr * np.cos(ang), co[:, 0]); co2[:, 1] = np.where(w > 0, CY + newr * np.sin(ang), co[:, 1])
me.vertices.foreach_set("co", co2.ravel())
radial = np.c_[np.cos(ang), np.sin(ang), np.zeros(nv)]
nsurf = radial - drdz[:, None] * np.array([0, 0, 1.0]); nsurf /= np.linalg.norm(nsurf, axis=1, keepdims=True)
wl = w[lv][:, None]
cn = cn * (1 - wl) + nsurf[lv] * wl; cn /= np.linalg.norm(cn, axis=1, keepdims=True)
print("back tab: verts flattened", int(tab.sum()), "blend ring", int((ring & (w > 0)).sum()),
      "max pull", round(float((r - newr).max()), 3))

# ---- 2. holes ----
n_poly0 = len(me.polygons)
ls0 = np.empty(n_poly0, np.int64); me.polygons.foreach_get("loop_start", ls0)
lt0 = np.empty(n_poly0, np.int64); me.polygons.foreach_get("loop_total", lt0)
bm = bmesh.new(); bm.from_mesh(me)
bm.faces.ensure_lookup_table()
# folds left in the glasses zone: after projection their inward-facing layers lie on the skin and shade as black
# speckle, so faces there whose geometric normal points into the head are removed (holes_fill closes any gap)
bm.normal_update()
drop = []
for f in bm.faces:
    ids = [v.index for v in f.verts]
    if not all(sel[i] for i in ids): continue
    na = nfull[ids].mean(0)
    if np.dot(np.array(f.normal), na) < 0.6: drop.append(f)
dropped_ids = set(f.index for f in drop)
bmesh.ops.delete(bm, geom=drop, context="FACES_ONLY")
print("glasses zone: inward fold faces removed", len(drop))
# a deleted face's corners vanish: rebuild the corner->normal table from the vertex normals below
bm.faces.ensure_lookup_table(); nf_old = len(bm.faces)
bnd = [e for e in bm.edges if e.is_boundary]
res = bmesh.ops.holes_fill(bm, edges=bnd, sides=0)
newf = res["faces"]
tri = bmesh.ops.triangulate(bm, faces=newf)
newf = set(tri["faces"]) | set(f for f in newf if f.is_valid)
uvl = list(bm.loops.layers.uv.values())
for f in newf:
    for l in f.loops:
        src = next((l2 for l2 in l.vert.link_loops if l2.face not in newf), None)
        if src:
            for lay in uvl: l[lay].uv = src[lay].uv
    f.smooth = True
    f.material_index = 0
print("holes filled:", len(bnd), "boundary edges ->", len(newf), "faces")
# ---- 3. old frame paint left in the face: faces near the glasses whose albedo is dark/brown get the patch's grey ----
im = bpy.data.images["gnarls_albedo"]; iw, ih = im.size
px = np.empty(iw * ih * 4, np.float32); im.pixels.foreach_get(px); px = px.reshape(ih, iw, 4)[..., :3]
au = bm.loops.layers.uv["albedo_uv"]
from collections import Counter
cnt = Counter()
for f in bm.faces:
    c = f.calc_center_median()
    if abs(c.x) < 0.04 and 0.80 < c.z < 0.84 and c.y < -0.15:  # forehead centre: the patch's texel
        for l in f.loops: cnt[tuple(round(x, 5) for x in l[au].uv)] += 1
grey_uv = cnt.most_common(1)[0][0]
nfix = 0
for f in bm.faces:
    c = f.calc_center_median()
    if not (0.6 < c.z < 0.86 and c.y < -0.05 and abs(c.x) < 0.24): continue
    cols = []
    for l in f.loops:
        u, v = l[au].uv; cols.append(px[min(int(v * ih), ih - 1), min(int(u * iw), iw - 1)])
    cols = np.array(cols); lum = cols @ np.array([0.2126, 0.7152, 0.0722])
    in_patch = all(patch[l.vert.index] for l in f.loops)
    if in_patch or lum.min() < 0.12 or ((cols[:, 0] > cols[:, 2] * 1.6) & (lum < 0.3)).any():  # the frame zone, ink, frame brown
        for l in f.loops: l[au].uv = grey_uv
        nfix += 1
print("frame paint cleared on", nfix, "faces (grey texel", grey_uv, ")")
bm.to_mesh(me); bm.free()
# custom normals: old corners keep theirs (face order is preserved), new corners take their vertex's mean normal
nl2 = len(me.loops)
lv2 = np.empty(nl2, np.int64); me.loops.foreach_get("vertex_index", lv2)
vn = np.zeros((len(me.vertices), 3)); np.add.at(vn, lv, cn)
vn /= np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-9)
# corners of surviving old faces keep their normal (matched by the face's vertex set: bmesh reuses deleted faces'
# slots, so order can't be trusted); new faces take the vertex mean
old = {}
for i in range(n_poly0):
    vs = lv[ls0[i]:ls0[i] + lt0[i]]
    old[tuple(sorted(vs))] = dict(zip(vs.tolist(), cn[ls0[i]:ls0[i] + lt0[i]]))
ls2 = np.empty(len(me.polygons), np.int64); me.polygons.foreach_get("loop_start", ls2)
lt2 = np.empty(len(me.polygons), np.int64); me.polygons.foreach_get("loop_total", lt2)
N = vn[lv2].copy(); hit = 0
for i in range(len(me.polygons)):
    vs = lv2[ls2[i]:ls2[i] + lt2[i]]
    m_ = old.get(tuple(sorted(vs.tolist())))
    if m_ is not None:
        hit += 1
        for j, v in enumerate(vs.tolist()): N[ls2[i] + j] = m_[v]
print("normals: faces matched", hit, "of", len(me.polygons))
me.normals_split_custom_set([tuple(x) for x in N])
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print("saved", OUT, "faces", len(me.polygons))
