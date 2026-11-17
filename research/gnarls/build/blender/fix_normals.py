"""Fix the black slivers: faces whose winding points into the body while their custom (smoothed) normals point out.
Cycles treats such a face as hit from behind, flips its shading normal inward and renders it black, with a stray glint
from the reflection. They came from the hole fills and fold deletes in repair_mesh.py (347 bad faces on the front of the head, 2,082 in all,
in a line just above the glasses bridge and at the old temple ends).
blender -b gnarls_rig.blend --factory-startup -P fix_normals.py -- OUT.blend

1. Flip the faces whose corner normals all point against them (face count and order unchanged). Each corner keeps its custom normal, matched by
   (face, vertex).
0. First the band round the glasses (brow, bridge, temples) is relaid onto a smooth fitted head surface (see step 0
   below): it was crumpled just outside the zone repair_mesh.py fixed. Faces there are deleted and refilled, so this
   runs last in the chain (the face count no longer matches gen/parts_faces.npz; materials are already assigned).
2. Any corner normal that disagrees with its face (dot < 0.35) is replaced by the vertex's angle-weighted smooth
   normal, or by the face normal where the vertex is a real crease."""
import sys
import bpy, bmesh
import numpy as np

OUT = sys.argv[sys.argv.index("--") + 1:][0]
ob = bpy.data.objects["Gnarls"]; me = ob.data
NF = len(me.polygons)


def corner_table(mesh):
    cn = np.array([tuple(c.vector) for c in mesh.corner_normals])
    return [{mesh.loops[li].vertex_index: cn[li] for li in p.loop_indices} for p in mesh.polygons]


def stats(mesh, tag):
    cn = np.array([tuple(c.vector) for c in mesh.corner_normals])
    fn = np.empty(len(mesh.polygons) * 3); mesh.polygons.foreach_get("normal", fn); fn = fn.reshape(-1, 3)
    li2f = np.empty(len(mesh.loops), int)
    for p in mesh.polygons: li2f[p.loop_start:p.loop_start + p.loop_total] = p.index
    d = np.einsum("ij,ij->i", cn, fn[li2f])
    badf = np.unique(li2f[d < 0.2])
    print(f"{tag}: faces with a corner normal against the face (dot<0.2): {len(badf)}")
    return len(badf)


before = stats(me, "before")

# ---- 0. relay the brow / temple band onto a smooth head surface ----
# repair_mesh.py only relaid the old frame's own zone; just outside it (a ledge above the bridge, V creases up from
# the lens tops, the old temple ends) the surface was still crumpled: 160 edges folded past 45 deg, some flat back on
# themselves. A robust r(phi, z) fit (Fourier k<=4 x z^0..4, refit 3x without >2.5 sigma outliers) of the whole head
# band, then every vert of the front/side band is pulled onto it, fading out over 2 cm; corners there take the fit's
# analytic normal; faces left facing into the head are deleted and the holes filled.
CY = 0.014


def basis(p_, z_):
    zn = (z_ - 0.75) / 0.15; cols = []
    for i in range(5):
        for k_ in range(5):
            cols.append(zn ** i * np.cos(k_ * p_))
            if k_: cols.append(zn ** i * np.sin(k_ * p_))
    return np.stack(cols, 1)


def ramp(x, a, b): return np.clip((x - a) / (b - a), 0, 1)


def limb_of(mesh):
    out = np.zeros(len(mesh.vertices))
    for v in mesh.vertices:
        for g in v.groups:
            n_ = ob.vertex_groups[g.group].name
            if n_.startswith("fin") or n_ in ("fluke_L", "fluke_R", "horn"): out[v.index] += g.weight
    return out


def weight(c, limb):  # 1 in the band round the glasses, fading out over 2 cm / 10 deg
    t = np.degrees(np.arctan2(c[:, 0], -(c[:, 1] - CY)))
    return ramp(c[:, 2], 0.64, 0.66) * ramp(-c[:, 2], -0.86, -0.84) * ramp(-np.abs(t), -105, -95) * (1 - np.clip(limb * 4, 0, 1))


def surf(c):  # fitted radius and analytic outward normal at each point's (phi, z)
    ph = np.arctan2(c[:, 1] - CY, c[:, 0]); z_ = c[:, 2]
    rf = basis(ph, z_) @ kf; e = 1e-4
    r_p = (basis(ph + e, z_) @ kf - basis(ph - e, z_) @ kf) / (2 * e)
    r_z = (basis(ph, z_ + e) @ kf - basis(ph, z_ - e) @ kf) / (2 * e)
    c_, s_ = np.cos(ph), np.sin(ph)
    Sp = np.c_[r_p * c_ - rf * s_, r_p * s_ + rf * c_, np.zeros(len(c))]
    Sz = np.c_[r_z * c_, r_z * s_, np.ones(len(c))]
    n = np.cross(Sp, Sz); n /= np.linalg.norm(n, axis=1, keepdims=True)
    n *= np.sign((n * np.c_[c_, s_, np.zeros(len(c))]).sum(1))[:, None]
    return ph, rf, n


def relay(c, w):
    ph, rf, _ = surf(c); r0 = np.hypot(c[:, 0], c[:, 1] - CY); r1 = r0 + w * (rf - r0)
    out = c.copy(); out[:, 0] = r1 * np.cos(ph); out[:, 1] = CY + r1 * np.sin(ph); return out, np.abs(rf - r0)


nv = len(me.vertices)
co = np.empty(nv * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
limb = limb_of(me)
phi = np.arctan2(co[:, 1] - CY, co[:, 0]); zz = co[:, 2]; rr = np.hypot(co[:, 0], co[:, 1] - CY)
fitm = (zz > 0.58) & (zz < 0.90) & (limb < 0.05)
for it in range(3):
    kf, *_ = np.linalg.lstsq(basis(phi[fitm], zz[fitm]), rr[fitm], rcond=None)
    res = rr - basis(phi, zz) @ kf
    sd = res[fitm].std(); fitm = fitm & (np.abs(res) < 2.5 * sd)
print(f"band fit: rms {res[fitm].std():.4f} on {int(fitm.sum())} verts")
wz = weight(co, limb); sel = wz > 0
co[sel], mv = relay(co[sel], wz[sel])
print(f"relay: {int(sel.sum())} verts, mean move {mv.mean() * 1000:.2f} mm, max {mv.max() * 1000:.1f} mm")
nfull = np.zeros((nv, 3)); nfull[sel] = surf(co[sel])[2]
me.vertices.foreach_set("co", co.ravel()); me.update()

# folds now lie flat: drop the layers that face into the head, fill the gaps
bm = bmesh.new(); bm.from_mesh(me); bm.normal_update()
drop = [f for f in bm.faces if all(wz[v.index] > 0.5 for v in f.verts)
        and np.dot(np.array(f.normal), nfull[[v.index for v in f.verts]].mean(0)) < 0.6]
bmesh.ops.delete(bm, geom=drop, context="FACES_ONLY")
bnd = [e_ for e_ in bm.edges if e_.is_boundary and all(wz[v.index] > 0 for v in e_.verts)]
newf = bmesh.ops.holes_fill(bm, edges=bnd, sides=0)["faces"]
newf = set(bmesh.ops.triangulate(bm, faces=newf)["faces"]) | set(f for f in newf if f.is_valid)
uvl = list(bm.loops.layers.uv.values())
for f in newf:
    for l in f.loops:
        src = next((l2 for l2 in l.vert.link_loops if l2.face not in newf), None)
        if src:
            for lay in uvl: l[lay].uv = src[lay].uv
    f.smooth = True; f.material_index = 0
print(f"relay: fold faces removed {len(drop)}, boundary edges {len(bnd)} -> {len(newf)} faces")

# sag: hole fills (these and repair_mesh.py's) are a few big flat triangles, and a 5 cm chord sits ~4 mm under the
# curved head: a ledge with a dark shelf and a pink subsurface glow. Split only faces whose centre sags > 0.3 mm
# below the fit, and lay the new verts on it, until none do.
nsplit = 0
for it in range(10):
    bm.faces.ensure_lookup_table()
    F = [f for f in bm.faces if all(wz[v.index] > 0.99 if v.index < nv else True for v in f.verts)]
    cen = np.array([tuple(f.calc_center_median()) for f in F])
    if not len(cen): break
    _, rf, _ = surf(cen); sag = rf - np.hypot(cen[:, 0], cen[:, 1] - CY)
    bad = [F[i] for i in np.nonzero(sag > 0.0003)[0]]
    if not bad: break
    edges = list({e_ for f in bad for e_ in f.edges if e_.calc_length() > 0.002})
    if not edges: break
    nsplit += len(edges)
    r_ = bmesh.ops.subdivide_edges(bm, edges=edges, cuts=1, use_grid_fill=False)
    vs = [g for g in r_["geom_inner"] if isinstance(g, bmesh.types.BMVert)]
    ng = [f for f in bm.faces if len(f.verts) > 3]
    if ng: bmesh.ops.triangulate(bm, faces=ng)
    if vs:
        c = np.array([tuple(v.co) for v in vs]); c2, _ = relay(c, np.ones(len(c)))
        for v, p_ in zip(vs, c2): v.co = p_
    print(f"  sag pass {it}: {len(bad)} sagging faces, split {len(edges)} edges")
print(f"sag: split {nsplit} edges, verts {nv} -> {len(me.vertices)}")

# paint: fill faces copy UVs from a neighbour, and some land on red (tee) or white texels, which show as pink and
# white flecks on the brow, or span several UV islands. Any such face in the band points at the patch grey.
import os
im = bpy.data.images.get("gnarls_albedo")
path = bpy.path.abspath(im.filepath) if im else ""
if not os.path.exists(path):
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "renders", "mv7_v4", "gnarls_albedo.png")
alb = bpy.data.images.load(path, check_existing=False); iw, ih = alb.size
px = np.empty(iw * ih * 4, np.float32); alb.pixels.foreach_get(px); px = px.reshape(ih, iw, 4)[..., :3]
GREY_UV = (0.36782, 0.57386)  # repair_mesh.py's patch texel (plain body grey)
au = bm.loops.layers.uv["albedo_uv"]; npaint = 0
for f in bm.faces:
    c = np.array([tuple(f.calc_center_median())])
    if weight(c, np.zeros(1))[0] < 0.5: continue
    cols = np.array([px[min(int(l[au].uv[1] * ih), ih - 1), min(int(l[au].uv[0] * iw), iw - 1)] for l in f.loops])
    lum = cols @ np.array([0.2126, 0.7152, 0.0722])
    uvs = np.array([tuple(l[au].uv) for l in f.loops]); span = np.ptp(uvs, axis=0).max()
    # span: a fill face whose corners copied UVs from different islands stretches across the whole atlas and shows a
    # thin smear of every colour in it (the pink line), though each corner alone samples grey
    warm_dark = (lum < 0.5) & (cols[:, 0] > cols[:, 2] - 0.02)  # old frame edge blends: darker than the body, not cool
    if span > 0.02 or ((cols[:, 0] - cols[:, 2] > 0.06) | (lum > 0.86) | (lum < 0.12) | warm_dark).any():
        for l in f.loops: l[au].uv = GREY_UV
        npaint += 1
print(f"paint: {npaint} band faces pointed at the plain grey texel")
bpy.data.images.remove(alb)
bm.to_mesh(me); bm.free(); me.update()

nv2 = len(me.vertices)
co = np.empty(nv2 * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
wz = weight(co, limb_of(me)); sel = wz > 0
nfull = np.zeros((nv2, 3)); nfull[sel] = surf(co[sel])[2]
lv = np.empty(len(me.loops), np.int64); me.loops.foreach_get("vertex_index", lv)
cn = np.array([tuple(c.vector) for c in me.corner_normals])
fnz = np.empty(len(me.polygons) * 3); me.polygons.foreach_get("normal", fnz); fnz = fnz.reshape(-1, 3)
li2f = np.repeat(np.arange(len(me.polygons)), [p.loop_total for p in me.polygons])
bad0 = (np.linalg.norm(cn, axis=1) < 0.5) | (np.einsum("ij,ij->i", cn, fnz[li2f]) < 0.2)
cn[bad0] = fnz[li2f][bad0]
wl = wz[lv][:, None]
cn = cn * (1 - wl) + nfull[lv] * wl; cn /= np.linalg.norm(cn, axis=1, keepdims=True)
me.normals_split_custom_set([tuple(x) for x in cn])
NF = len(me.polygons)

old = corner_table(me)
fn0 = np.empty(NF * 3); me.polygons.foreach_get("normal", fn0); fn0 = fn0.reshape(-1, 3)

# trust the custom normals (they are the original surface's smooth shading): flip a face only when its own corners
# all point the other way. (bmesh recalc_face_normals is no good here: it flipped 8% of the mesh, whole islands.)
cm = np.array([np.mean([old[p.index][v] for v in p.vertices], 0) for p in me.polygons])
flip = set(np.nonzero(np.einsum("ij,ij->i", cm, fn0) < -0.2)[0].tolist())
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
bmesh.ops.reverse_faces(bm, faces=[bm.faces[i] for i in flip])
bm.to_mesh(me); bm.free(); me.update()
assert len(me.polygons) == NF
fn = np.empty(NF * 3); me.polygons.foreach_get("normal", fn); fn = fn.reshape(-1, 3)
flipped = int((np.einsum("ij,ij->i", fn, fn0) < 0).sum())
print("faces flipped to outward:", flipped)
assert flipped < NF * 0.05, "recalc flipped a whole region: check the mesh before trusting this"

# vertex smooth normals (angle-weighted) from the corrected faces
co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
vs = np.zeros_like(co)
for p in me.polygons:
    vids = list(p.vertices); n = len(vids)
    for k in range(n):
        a, b, c = co[vids[k - 1]], co[vids[k]], co[vids[(k + 1) % n]]
        e1, e2 = a - b, c - b
        ang = np.arccos(np.clip(e1 @ e2 / (np.linalg.norm(e1) * np.linalg.norm(e2) + 1e-12), -1, 1))
        vs[vids[k]] += fn[p.index] * ang
vs /= np.linalg.norm(vs, axis=1, keepdims=True) + 1e-12

new = np.zeros((len(me.loops), 3)); fixed = 0
for p in me.polygons:
    f = fn[p.index]
    for li in p.loop_indices:
        v = me.loops[li].vertex_index
        n = old[p.index].get(v, f)
        if n @ f < 0.35:
            n = vs[v] if vs[v] @ f >= 0.35 else f; fixed += 1
        new[li] = n
print("corner normals reset:", fixed)
me.normals_split_custom_set([tuple(x) for x in new])
after = stats(me, "after")
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print(f"saved {OUT} | bad faces {before} -> {after}, flipped {flipped}, corners reset {fixed}")
