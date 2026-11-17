"""Split the fused Gnarls mesh into parts for real per-part materials (blender/part_materials.py).
python -I make_parts.py [gen/mesh.npz]  ->  gen/parts_faces.npz (label per face: 0 skin, 1 tee, 2 belly band, 3 horn; logo per face)
Needs the mesh export (blender/export_mesh.py: verts, loops, albedo UVs, bone weights) of the repaired rig.

The baked albedo carries the reference painting's mistakes (the tail painted down the back of the tee, the fin bases
cut into the sides), so parts come from the shape, not the paint:
- tee / belly band: per angle around the body axis, the collar, hem and band bottom are the robust percentiles of the
  red / white paint, median-filtered across angles so local paint errors can't move them;
- horn: faces above the head's fitted dome surface in the horn zone;
- fins, tail and flukes (by bone weight) are skin."""
import sys
import numpy as np, cv2
from scipy.ndimage import median_filter, uniform_filter1d

d = np.load(sys.argv[1] if len(sys.argv) > 1 else "gen/mesh.npz"); co, lv, ls, lt, uv, W = d["co"], d["lv"], d["ls"], d["lt"], d["uv"], d["W"]; vg = list(d["vg"])
alb = cv2.imread("renders/mv7_v4/gnarls_albedo.png")[..., ::-1].astype(np.float32); H, Wd = alb.shape[:2]
px = np.clip((uv[:, 0] * Wd).astype(int), 0, Wd - 1); py = np.clip(((1 - uv[:, 1]) * H).astype(int), 0, H - 1)
fidx = np.repeat(np.arange(len(ls)), lt)
def fmean(x):
    o = np.zeros((len(ls),) + x.shape[1:]); np.add.at(o, fidx, x); return o / lt.reshape((-1,) + (1,) * (x.ndim - 1))
fc, fv, Wf = fmean(alb[py, px]), fmean(co[lv]), fmean(W[lv])
lab = cv2.cvtColor((fc[None] / 255).astype(np.float32), cv2.COLOR_RGB2LAB)[0]; L, a = lab[:, 0], lab[:, 1]
red, white = a > 35, (L > 88) & (np.abs(a) < 8)
limb = sum(Wf[:, vg.index(n)] for n in vg if n.startswith("fin") or n in ("fluke_L", "fluke_R"))
cy = 0.014
th = np.degrees(np.arctan2(fv[:, 0], -(fv[:, 1] - cy))); z = fv[:, 2]
fin = sum(Wf[:, vg.index(n)] for n in vg if n.startswith("fin"))
torso = limb < 0.5
cloth = torso & (fin < 0.25)  # sleeves stop short on the fin roots, as drawn
NB = 180; tb = ((th + 180) / 360 * NB).astype(int) % NB


def per_angle(mask, q, lo=0.0, hi=1.0):
    out = np.full(NB, np.nan)
    for i in range(NB):
        s = mask & (tb == i) & (z > lo) & (z < hi)
        if s.sum() > 20: out[i] = np.percentile(z[s], q)
    ok = ~np.isnan(out); out = np.interp(np.arange(NB), np.nonzero(ok)[0], out[ok], period=NB)
    out = median_filter(out, size=31, mode="wrap")
    return uniform_filter1d(out, 9, mode="wrap")


collar = per_angle(red & torso, 99.0, 0.25, 0.7)
hem = per_angle(red & torso, 1.0, 0.2, 0.7)
band_bot = per_angle(white & torso, 2.0, 0.15, 0.4)
band_bot = np.minimum(band_bot, hem - 0.03)
lab_ = np.zeros(len(ls), np.int8)
lab_[cloth & (z >= hem[tb]) & (z <= collar[tb])] = 1
lab_[cloth & (z >= band_bot[tb]) & (z < hem[tb])] = 2
# horn: above the dome. Fit head radius r(th, z) outside the horn zone, then take what sticks out.
r = np.hypot(fv[:, 0], fv[:, 1] - cy)
headm = (z > 0.7) & torso
hz = headm & (np.abs(th) < 30) & (z > 0.8)
fit = headm & ~hz
def feats(t, zz):
    t = np.radians(t); return np.stack([np.ones_like(zz), zz, zz ** 2, zz ** 3, zz ** 4, np.cos(t), np.sin(t), np.cos(2 * t), np.sin(2 * t),
                                        zz * np.cos(t), zz * np.sin(t), zz ** 2 * np.cos(t), zz ** 2 * np.cos(2 * t)], 1)
k, *_ = np.linalg.lstsq(feats(th[fit], z[fit]), r[fit], rcond=None)
res = r - feats(th, z) @ k
horn = hz & (res > 0.008)
ztop_dome = np.percentile(z[fit], 99.5)
horn |= headm & (z > ztop_dome) & (np.abs(th) < 40)
# keep the horn connected: faces whose centroid is within the horn's xy hull band at each height
lab_[horn] = 3
# logo: white paint inside the tee, front
logo = (lab_ == 1) & white & (np.abs(th) < 30)
np.savez("gen/parts_faces.npz", label=lab_, logo=logo, collar=collar, hem=hem, band_bot=band_bot)
print("faces", len(ls), "skin", (lab_ == 0).sum(), "tee", (lab_ == 1).sum(), "band", (lab_ == 2).sum(), "horn", (lab_ == 3).sum(),
      "logo", logo.sum(), "dome top", round(float(ztop_dome), 3), "fit rms", round(float(res[fit].std()), 4))
print("collar z front/side/back", [round(float(collar[i]), 3) for i in (90, 135, 0)], "hem", [round(float(hem[i]), 3) for i in (90, 135, 0)],
      "band bottom", [round(float(band_bot[i]), 3) for i in (90, 135, 0)])
