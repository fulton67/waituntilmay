"""Replace the glasses Tripo fused into the head with real, separate glasses (CONTEXT 3D spec: glasses are their own mesh).
blender -b gnarls_rig.blend --factory-startup -P fix_glasses.py -- gen/lens_mask.png OUT.blend

Why: the fused glasses had the hero's eyes and brows sculpted into the lens shells (ghost eyeballs under every
expression), the frame was texture painted onto the head behind a proud ring (brown smears at 3/4), and the lens read as
chrome. Steps:
1. Find the fused glasses on the rest mesh: frame = texels palette-snapped to frame brown (#5e2818), lens = the lens
   interiors of the flat front skin (gen/lens_mask.png R) via proj_front UVs; grow 7 rings.
2. Measure them first: per side a plane fit to the ring gives centre, normal, radius and tube size; the temple ends are
   the back-most brown points.
3. Weld the GLB's seam splits, drop floating lens shells, then put every glasses vertex on a height field fitted to the
   front of the head around them (the fused frame is a closed tube, which smoothing can't collapse). Rim, walls and lens
   land on one smooth surface and share its colour and normals; the outer rings blend back to the original.
4. The patch gets body grey (an albedo texel), proj_front UVs from a linear fit, face_mask 1 (so expression decals land on
   it), head weights, and smooth normals; the rest keeps Tripo's custom normals.
5. New glasses parented to the head bone: two torus rims, an arched bridge, temples back to the measured ends (frame
   brown, satin), and tinted lens discs (#abb9c0, alpha-blended, glossy) in front of the eyes.
6. Atlas cells: lens-tint background texels become body grey, so the decals sit on a uniform face behind the lens."""
import sys
import bpy, bmesh
import numpy as np
from mathutils import Vector

A = sys.argv[sys.argv.index("--") + 1:]
MASK, OUT = A[:2]

sc = bpy.context.scene
ob = bpy.data.objects["Gnarls"]; me = ob.data
arm = next(o for o in sc.objects if o.type == "ARMATURE")
arm.data.pose_position = "REST"; sc.frame_set(101); bpy.context.view_layer.update()


def srgb01(h): return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])
def lin(h): return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in srgb01(h)) + (1,)


nv = len(me.vertices)
co = np.empty(nv * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
lv = np.empty(len(me.loops), np.int64); me.loops.foreach_get("vertex_index", lv)
ed = np.empty(len(me.edges) * 2, np.int64); me.edges.foreach_get("vertices", ed); ed = ed.reshape(-1, 2)


def loop_uv(name):
    a = np.empty(len(me.loops) * 2); me.uv_layers[name].data.foreach_get("uv", a); return a.reshape(-1, 2)


def sample(px, uv):
    H, W = px.shape[:2]
    return px[np.clip((uv[:, 1] * H).astype(int), 0, H - 1), np.clip((uv[:, 0] * W).astype(int), 0, W - 1)]


# ---- 1. find the fused glasses ----
alb = bpy.data.images["gnarls_albedo"]; aw, ah = alb.size
apx = np.array(alb.pixels[:], np.float32).reshape(ah, aw, 4)[..., :3]  # byte sRGB image: values are display-encoded
auv = loop_uv("albedo_uv"); lcol = sample(apx, auv)
brown_l = np.linalg.norm(lcol - srgb01("5e2818"), axis=1) < 0.09
body_l = np.linalg.norm(lcol - srgb01("909faa"), axis=1) < 0.03
brown = np.zeros(nv, bool); np.logical_or.at(brown, lv, brown_l)
mk = bpy.data.images.load(MASK); mw_, mh_ = mk.size
mpx = np.array(mk.pixels[:], np.float32).reshape(mh_, mw_, 4)
puv = loop_uv("proj_front")
cnt = np.bincount(lv, minlength=nv).astype(float); cnt[cnt == 0] = 1
vuv = np.stack([np.bincount(lv, puv[:, 0], nv), np.bincount(lv, puv[:, 1], nv)], 1) / cnt[:, None]
lens_px = sample(mpx, vuv)[:, 0]
cy = float(np.median(co[:, 1])); zmin, zmax = co[:, 2].min(), co[:, 2].max()
head = co[:, 2] > zmin + 0.5 * (zmax - zmin)
lens = (lens_px > 0.5) & (co[:, 1] < cy) & head
frame = brown & head
region = lens | frame
ring = np.where(region, 0, 99)
for k in range(1, 8):  # wide enough to take in the rim's grey inner/outer walls and the bridge
    r2 = region.copy(); r2[ed[:, 0]] |= region[ed[:, 1]]; r2[ed[:, 1]] |= region[ed[:, 0]]
    ring[r2 & ~region] = k; region = r2
print("fused glasses: frame verts", int(frame.sum()), "lens verts", int(lens.sum()), "cut", int(region.sum()))

# ---- 2. measure ----
G = {}
for s, side in ((1, "L"), (-1, "R")):  # character's left is +X
    Ls = lens & (np.sign(co[:, 0]) == s)
    cxz = co[Ls][:, [0, 2]].mean(0)
    dxz = np.linalg.norm(co[:, [0, 2]] - cxz, axis=1)
    rl = np.percentile(dxz[Ls], 97)
    ann = frame & (co[:, 1] < cy) & (dxz > 0.85 * rl) & (dxz < 1.6 * rl)
    P = co[ann]; c = P.mean(0)
    _, _, vt = np.linalg.svd(P - c); n = vt[2] * (-1 if vt[2][1] > 0 else 1)  # normal faces the viewer (-Y)
    n = n + np.array([0, -1.0, 0]); n /= np.linalg.norm(n)  # halfway to flat-front: drawn Gnarls glasses barely wrap
    u = np.cross(n, [0, 0, 1]); u /= np.linalg.norm(u); u *= np.sign(u[0]) * s  # in-plane, pointing outward
    v = np.cross(u, n); v *= np.sign(v[2])
    rr = np.linalg.norm((P - c) - np.outer((P - c) @ n, n), axis=1)
    R = float(np.median(rr)); tube = float(np.clip((np.percentile(rr, 90) - np.percentile(rr, 10)) / 2, 0.008, 0.011))  # ring 0.020 H
    # temples run back to the side of the head (just outside its surface, behind the cheek), not out sideways
    band = head & (np.abs(co[:, 2] - c[2]) < 0.02) & ~region & (np.sign(co[:, 0]) == s)
    half = np.abs(co[band][:, 0]).max()
    end = np.array([s * (half + tube), cy + 0.04, c[2] + 0.005])
    G[side] = dict(c=c, n=n, u=u, v=v, R=R, tube=tube, end=end, front=float(P[:, 1].min()))
    print(side, "centre", np.round(c, 3), "normal", np.round(n, 2), "R", round(R, 3), "tube", round(tube, 4), "temple end", np.round(end, 3))

# ---- 3. cut and fill ----
kn = me.attributes.new("keep_n", "FLOAT_VECTOR", "CORNER")
cn = np.empty(len(me.loops) * 3); me.corner_normals.foreach_get("vector", cn); kn.data.foreach_set("vector", cn)
bm = bmesh.new(); bm.from_mesh(me)
bm.verts.ensure_lookup_table()
rl = bm.verts.layers.int.new("reg")
for v_ in bm.verts: v_[rl] = int(ring[v_.index]) + 1 if region[v_.index] else 0  # 1 = core .. 8 = outermost ring
# the GLB import splits vertices at UV seams; weld them so the surface is one connected piece
nb = len(bm.verts); bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-6); print("welded", nb - len(bm.verts), "seam verts")
# floating pieces that are mostly glasses (separate lens shells) go; everything else stays
seenf, islands = set(), []
for f0 in bm.faces:
    if f0 in seenf: continue
    st, isl = [f0], []
    seenf.add(f0)
    while st:
        f = st.pop(); isl.append(f)
        for e in f.edges:
            for g in e.link_faces:
                if g not in seenf: seenf.add(g); st.append(g)
    islands.append(isl)
islands.sort(key=len, reverse=True)
drop = []  # the "shells" are the lens surface itself: dropping them leaves holes behind the lenses, so they are projected too
# a separate piece that holds any glasses vertex is glasses through and through (the rim's grey outer wall is one)
for isl in islands[1:]:
    vs = {v_ for f in isl for v_ in f.verts}
    if any(v_[rl] for v_ in vs):
        for v_ in vs:
            if not v_[rl]: v_[rl] = 1
        print("island of", len(isl), "faces taken into the glasses region")
print("islands", len(islands), "dropping", len(drop), "glasses shells,", sum(len(i) for i in drop), "faces")
bmesh.ops.delete(bm, geom=[f for isl in drop for f in isl], context="FACES")
dl = bm.verts.layers.deform.verify(); hi = ob.vertex_groups["head"].index
for v_ in bm.verts:
    if v_[rl]:
        for k in list(v_[dl].keys()): del v_[dl][k]
        v_[dl][hi] = 1.0
for f in bm.faces:
    if any(v_[rl] for v_ in f.verts): f.smooth = True
bm.to_mesh(me); bm.free(); me.update()

# The old frame is a closed tube fused to the face, so no smoothing operator collapses it. Instead every glasses vertex
# is put on a smooth model of the head around the glasses: radius r(theta, z) about the head's vertical axis, a
# degree-4 polynomial fitted to the untouched head. Rim, walls and lens shell land on one surface (so they render as one
# face) and the sides follow the head's roundness. The outer rings blend back to the original.
nv2 = len(me.vertices)
co2 = np.empty(nv2 * 3); me.vertices.foreach_get("co", co2); co2 = co2.reshape(-1, 3)
rg = np.empty(nv2, np.int32); me.attributes["reg"].data.foreach_get("value", rg)
ed2 = np.empty(len(me.edges) * 2, np.int64); me.edges.foreach_get("vertices", ed2); ed2 = ed2.reshape(-1, 2)


def rings_out(mask, n):
    """ring index of each vertex outside `mask` (1 = touching it .. n), 0 inside, 99 beyond"""
    out = np.where(mask, 0, 99); cur = mask.copy()
    for k in range(1, n + 1):
        nx = cur.copy(); nx[ed2[:, 0]] |= cur[ed2[:, 1]]; nx[ed2[:, 1]] |= cur[ed2[:, 0]]
        out[nx & ~cur] = k; cur = nx
    return out


def feats(t, z):
    return np.stack([t ** i * z ** j for i in range(7) for j in range(7 - i)], 1)  # degree 6


core = rg > 0
gz0, gz1 = co2[core][:, 2].min() - 0.08, co2[core][:, 2].max() + 0.08
hs = (co2[:, 2] > gz0) & (co2[:, 2] < gz1)
ax = np.array([np.median(co2[hs][:, 0]), (co2[hs][:, 1].min() + co2[hs][:, 1].max()) / 2])  # head axis (x, y)
th = np.arctan2(co2[:, 0] - ax[0], -(co2[:, 1] - ax[1])); rr_ = np.hypot(co2[:, 0] - ax[0], co2[:, 1] - ax[1])
ro0 = rings_out(core, 30)
for pas in range(2):
    ro = rings_out(core, 30)
    # fit only to the untouched head close around the glasses (a local fit follows the real head far better)
    fit = (ro >= 4) & ((ro <= 30) | (np.abs(th) > np.radians(55))) & hs & (np.abs(th) < np.radians(140))  # local, plus the sides
    cf, *_ = np.linalg.lstsq(feats(th[fit], co2[fit][:, 2]), rr_[fit], rcond=None)
    res = feats(th[fit], co2[fit][:, 2]) @ cf - rr_[fit]
    print(f"pass {pas}: head fit r(theta,z) verts", int(fit.sum()), "rms", round(float(np.sqrt((res ** 2).mean())), 4))
    if pas == 0:
        # anything else in the glasses band standing proud of the head model is old glasses too (temple arms, flecks)
        band_z = (co2[:, 2] > gz0 + 0.05) & (co2[:, 2] < gz1 - 0.05)
        proud = band_z & (np.abs(th) < np.radians(150)) & (rr_ > feats(th, co2[:, 2]) @ cf + 0.008) & ~core  # no ring limit: some old rim pieces join the head only far round the back
        core = core | (rings_out(proud, 2) <= 2)
        print("proud of the head:", int(proud.sum()), "core now", int(core.sum()))
# the whole glasses region goes onto the surface; the next 5 rings blend back to the original head
ro = rings_out(core, 30)
w = np.where(core, 1.0, np.clip(1 - ro / 6.0, 0, 1))
free = w > 0


def surf(t, z):
    r = feats(t, z) @ cf
    return np.stack([ax[0] + r * np.sin(t), ax[1] - r * np.cos(t), z], 1)


tz = co2[:, 2]; tgt = surf(th, tz)
co2n = co2 + w[:, None] * (tgt - co2)
mv = np.linalg.norm(co2n[free] - co2[free], axis=1)
print("patch verts", int(free.sum()), "moved mean", round(float(mv.mean()), 4), "max", round(float(mv.max()), 4))
co2 = co2n
me.vertices.foreach_set("co", co2.ravel()); me.update()
eps = 1e-4
Pt = (surf(th + eps, tz) - surf(th - eps, tz)) / (2 * eps); Pz = (surf(th, tz + eps) - surf(th, tz - eps)) / (2 * eps)
nrm = np.cross(Pt, Pz); out_ = np.stack([np.sin(th), -np.cos(th), 0 * th], 1)
nrm *= np.sign((nrm * out_).sum(1))[:, None]; nrm /= np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-9
vn0 = np.empty(nv2 * 3); me.vertex_normals.foreach_get("vector", vn0); vn0 = vn0.reshape(-1, 3)
# Collapsed layers that now face into the head shade, shadow and outline wrongly: flip them to face out like the surface
# (deleting them would open holes where a folded layer is the only one).
lv2 = np.empty(len(me.loops), np.int64); me.loops.foreach_get("vertex_index", lv2)
ls_ = np.empty(len(me.polygons), np.int64); me.polygons.foreach_get("loop_start", ls_)
lt_ = np.empty(len(me.polygons), np.int64); me.polygons.foreach_get("loop_total", lt_)
fid = np.repeat(np.arange(len(me.polygons)), lt_)
pn = np.empty(len(me.polygons) * 3); me.polygons.foreach_get("normal", pn); pn = pn.reshape(-1, 3)
fn = np.zeros((len(me.polygons), 3)); np.add.at(fn, fid, nrm[lv2] * w[lv2][:, None])
inpatch = np.zeros(len(me.polygons)); np.add.at(inpatch, fid, (w[lv2] > 0.5).astype(float)); inpatch = inpatch == lt_
flipf = inpatch & ((pn * fn).sum(1) < 0)
# whatever still sticks out of the head model in the glasses band after that (old temple stubs past the cheek) is cut off
th2 = np.arctan2(co2[:, 0] - ax[0], -(co2[:, 1] - ax[1])); r2_ = np.hypot(co2[:, 0] - ax[0], co2[:, 1] - ax[1])
stick = (co2[:, 2] > gz0 + 0.04) & (co2[:, 2] < gz1 - 0.04) & (np.abs(th2) < np.radians(160)) &         (r2_ > feats(th2, co2[:, 2]) @ cf + 0.006)
cnt_s = np.zeros(len(me.polygons)); np.add.at(cnt_s, fid, stick[lv2].astype(float)); cutf = cnt_s * 3 >= lt_ * 2
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
bmesh.ops.reverse_faces(bm, faces=[bm.faces[i] for i in np.nonzero(flipf & ~cutf)[0]])
bmesh.ops.delete(bm, geom=[bm.faces[i] for i in np.nonzero(cutf)[0]], context="FACES")
bm.to_mesh(me); bm.free(); me.update()
print("flipped inward-facing patch faces", int(flipf.sum()), "of", int(inpatch.sum()), "; cut protruding faces", int(cutf.sum()))
nv2 = len(me.vertices)
keep_v = np.ones(len(co2), bool)  # loose verts were removed with the faces: re-read per-vertex arrays
co3 = np.empty(nv2 * 3); me.vertices.foreach_get("co", co3); co3 = co3.reshape(-1, 3)
if nv2 != len(co2):
    from mathutils.kdtree import KDTree
    kd = KDTree(len(co2))
    for i_, p_ in enumerate(co2): kd.insert(p_, i_)
    kd.balance()
    remap = np.array([kd.find(p_)[1] for p_ in co3])
    w, free, nrm, vn0 = w[remap], free[remap], nrm[remap], vn0[remap]
co2 = co3
ed2 = np.empty(len(me.edges) * 2, np.int64); me.edges.foreach_get("vertices", ed2); ed2 = ed2.reshape(-1, 2)
# The ink outline is kept off the whole patch: vertex group "outline" (0 on the patch, back to 1 over 4 rings) drives the
# outline modifier's thickness.
ow = np.clip(1 - rings_out(free, 4) / 4.0, 0, 1); ow = 1 - np.maximum(ow, free.astype(float))
vg = ob.vertex_groups.get("outline") or ob.vertex_groups.new(name="outline")
for val in np.unique(np.round(ow, 2)):
    idx = np.nonzero(np.round(ow, 2) == val)[0].tolist()
    if idx: vg.add(idx, float(val), "REPLACE")
print("outline group: off on", int((ow < 0.01).sum()), "verts")

# ---- 4. patch data ----
lv2 = np.empty(len(me.loops), np.int64); me.loops.foreach_get("vertex_index", lv2)
newl = free[lv2]
ls_ = np.empty(len(me.polygons), np.int64); me.polygons.foreach_get("loop_start", ls_)
lt_ = np.empty(len(me.polygons), np.int64); me.polygons.foreach_get("loop_total", lt_)
fid = np.repeat(np.arange(len(me.polygons)), lt_)
touch = np.zeros(len(me.polygons), bool); np.logical_or.at(touch, fid, newl)
facel = touch[fid]  # every corner of a face that touches the patch: no UV streaks across the albedo atlas
oldfront = (~newl) & (co2[lv2][:, 1] < cy)
X = np.c_[co2[lv2][:, 0], co2[lv2][:, 2], np.ones(len(lv2))]
for name in [u_.name for u_ in me.uv_layers]:
    uv = loop_uv(name)
    if name == "albedo_uv":
        uv[facel] = auv[np.nonzero(body_l)[0][0]]
    else:
        sel = oldfront & (uv[:, 0] > 0) & (uv[:, 0] < 1)
        M_, *_ = np.linalg.lstsq(X[sel], uv[sel], rcond=None)
        uv[newl] = X[newl] @ M_
    me.uv_layers[name].data.foreach_set("uv", uv.ravel())
fm = np.empty(nv2, np.float32); me.attributes["face_mask"].data.foreach_get("value", fm)
fm[free & (co2[:, 1] < cy)] = 1.0; me.attributes["face_mask"].data.foreach_set("value", fm)
kk = np.empty(len(me.loops) * 3); me.attributes["keep_n"].data.foreach_get("vector", kk); kk = kk.reshape(-1, 3)
bad = (np.linalg.norm(kk, axis=1) < 0.5)
kk[bad] = vn0[lv2[bad]]
wl = w[lv2][:, None]
kk = kk * (1 - wl) + nrm[lv2] * wl; kk /= np.linalg.norm(kk, axis=1, keepdims=True) + 1e-9
me.normals_split_custom_set([tuple(x) for x in kk])
for nm in ("keep_n", "reg"):
    if nm in me.attributes: me.attributes.remove(me.attributes[nm])
me.update()

# ---- 5. new glasses ----
def mat(name, hexc, rough, alpha=1.0, spec=0.4):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = lin(hexc); b.inputs["Roughness"].default_value = rough
    b.inputs["Specular IOR Level"].default_value = spec
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
        try: m.surface_render_method = "BLENDED"
        except Exception: m.blend_method = "BLEND"
    return m


m_frame = mat("glasses_frame", "5e2818", 0.42, spec=0.35)
m_lens = mat("glasses_lens", "abb9c0", 0.3, alpha=0.16, spec=0.25)
col = bpy.data.collections.new("glasses"); sc.collection.children.link(col)
made = []


def link(o):
    for c_ in o.users_collection: c_.objects.unlink(o)
    col.objects.link(o); made.append(o); return o


def curve(name, pts, radius):
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = radius; cu.bevel_resolution = 4
    cu.use_fill_caps = True
    sp_ = cu.splines.new("BEZIER"); sp_.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp_.bezier_points, pts):
        bp.co = Vector(p); bp.handle_left_type = bp.handle_right_type = "AUTO"
    o = bpy.data.objects.new(name, cu); o.data.materials.append(m_frame); sc.collection.objects.link(o); return link(o)


for side, g in G.items():
    c, n, u, R, tube = Vector(g["c"]), Vector(g["n"]), Vector(g["u"]), g["R"], g["tube"]
    q = Vector((0, 0, 1)).rotation_difference(n)
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=tube, major_segments=72, minor_segments=14, location=c)
    t = bpy.context.active_object; t.name = f"glasses_rim_{side}"; t.rotation_mode = "QUATERNION"; t.rotation_quaternion = q
    t.data.materials.append(m_frame); bpy.ops.object.shade_smooth(); link(t)
    bpy.ops.mesh.primitive_circle_add(vertices=72, radius=R, fill_type="NGON", location=c - n * (tube * 0.2))
    d = bpy.context.active_object; d.name = f"glasses_lens_{side}"; d.rotation_mode = "QUATERNION"; d.rotation_quaternion = q
    d.data.materials.append(m_lens); link(d)
    a = c + u * R; e = Vector(g["end"])
    curve(f"glasses_temple_{side}", [a, a + u * 0.02 + Vector((0, 0.02, 0)), (a + e) / 2 + Vector((0, 0, 0.004)), e], tube * 0.85)
gl, gr = G["L"], G["R"]
il = Vector(gl["c"]) - Vector(gl["u"]) * gl["R"]; ir = Vector(gr["c"]) - Vector(gr["u"]) * gr["R"]
nose_y = float(surf(np.array([0.0]), np.array([(il.z + ir.z) / 2]))[0, 1])  # the face between the lenses
mid = Vector(((il.x + ir.x) / 2, min((il.y + ir.y) / 2, nose_y - 0.6 * min(gl["tube"], gr["tube"])) - 0.004, (il.z + ir.z) / 2 + 0.012))
curve("glasses_bridge", [il, mid, ir], min(gl["tube"], gr["tube"]) * 0.9)
bpy.context.view_layer.update()
for o in made:
    mw = o.matrix_world.copy(); o.parent = arm; o.parent_type = "BONE"; o.parent_bone = "head"; o.matrix_world = mw
arm.data.pose_position = "POSE"

# ---- 6. atlas backgrounds: lens tint -> body grey ----
for im in bpy.data.images:
    if not im.name.startswith("atlas_"): continue
    w_, h_ = im.size; p = np.array(im.pixels[:], np.float32).reshape(h_, w_, 4)
    near = np.linalg.norm(p[..., :3] - srgb01("abb9c0"), axis=2) < 0.10
    p[near, :3] = srgb01("909faa"); im.pixels.foreach_set(p.ravel()); im.pack()
    print(im.name, "lens-tint texels -> body grey", int(near.sum()))
sc.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print("saved", OUT)
