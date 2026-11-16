"""Measure the neutral face's features on the flat front skin, for the geometric face rig (blender/face_rig.py).
Writes gen/face_features.json in image pixels (1280x1920 front skin = proj_front UV space):
pupils (centre, radii, highlight offset), brows (centre, half-width, thickness, tilt), mouth (centre, half-width, sag).
Run: python -I make_face_features.py"""
import json, os
import cv2, numpy as np

R = os.path.dirname(os.path.abspath(__file__))
im = cv2.imread(os.path.join(R, "gen", "flat_muse_front.png")); h, w = im.shape[:2]
mask = cv2.imread(os.path.join(R, "gen", "lens_mask.png"))
lens = mask[..., 2] > 127
L = cv2.cvtColor(im, cv2.COLOR_BGR2LAB).astype(np.float32); L[..., 0] *= 100 / 255; L[..., 1:] -= 128
dark = (L[..., 0] < 30) & (np.abs(L[..., 1]) + np.abs(L[..., 2]) < 45)
light = L[..., 0] > 85
out = {"size": [w, h], "eyes": {}, "brows": {}}
n, lb, st, cen = cv2.connectedComponentsWithStats((dark & lens).astype(np.uint8), 8)
comps = sorted([i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] > 200], key=lambda i: -st[i, cv2.CC_STAT_AREA])
for i in comps:
    x, y, ww, hh, a = st[i]
    side = "R" if cen[i][0] < w / 2 else "L"  # character's right is image left
    kind = "brows" if ww > 1.6 * hh else "eyes"
    if side in out[kind]: continue
    ys, xs = np.nonzero(lb == i)
    if kind == "eyes":
        hole = light[y:y + hh, x:x + ww] & ~(lb[y:y + hh, x:x + ww] == i)
        hy, hx = np.nonzero(hole)
        hl = [float(hx.mean() + x - cen[i][0]), float(hy.mean() + y - cen[i][1]), float(np.sqrt(hole.sum() / np.pi))] if hole.any() else None
        out["eyes"][side] = {"c": [float(cen[i][0]), float(cen[i][1])], "rx": ww / 2, "ry": hh / 2, "hl": hl}
    else:
        k = np.polyfit(xs, ys, 2)
        out["brows"][side] = {"c": [float(cen[i][0]), float(cen[i][1])], "hw": ww / 2, "t": float(a / ww),
                              "tilt": float(np.degrees(np.arctan(np.polyval(np.polyder(k), cen[i][0])))), "curve": float(k[0])}
# mouth: the dark line below the glasses, above the tee
fr = mask[..., 1] > 127
gy1 = np.nonzero(fr.any(1))[0].max()
red = (L[..., 1] > 40) & (L[..., 0] > 25)
tee = np.nonzero(red[:, w // 2 - 20:w // 2 + 20].any(1))[0].min()
band = np.zeros_like(dark); band[gy1 + 5:tee - 5] = dark[gy1 + 5:tee - 5]
n, lb, st, cen = cv2.connectedComponentsWithStats(band.astype(np.uint8), 8)
i = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
ys, xs = np.nonzero(lb == i)
k = np.polyfit(xs, ys, 2)
out["mouth"] = {"c": [float(xs.mean()), float(np.polyval(k, xs.mean()))], "hw": float((xs.max() - xs.min()) / 2),
                "t": float(len(xs) / (xs.max() - xs.min() + 1)), "sag": float(np.polyval(k, xs.mean()) - np.polyval(k, xs.min()))}
json.dump(out, open(os.path.join(R, "gen", "face_features.json"), "w"), indent=1)
print(json.dumps(out, indent=1))
