"""Face atlases for the rig: every expression edit (gen/expr/*.png) is aligned to the neutral flat front skin on the glasses
(ECC affine on the brown frame mask), then two zones are cut: EYES (brows + lids + pupils, inside/above the lenses) and
MOUTH (between the glasses and the tee). Each zone becomes a 4x4 atlas; face_zones.json records the zone boxes in the
neutral image's normalised coordinates, which are exactly the mesh's proj_front UVs (u = x/w, v = 1 - y/h).
Run: python -I make_face_atlas.py"""
import json, os
import cv2, numpy as np

R = os.path.dirname(os.path.abspath(__file__))
NEUTRAL = os.path.join(R, "gen", "flat_muse_front.png")
ORDER = ["neutral", "neutral_open", "happy", "laugh", "excited", "surprised", "sad", "angry", "fired_up", "smug",
         "sleepy", "wink", "shout", "thinking"]
GRID = 4


def lab(im):
    l = cv2.cvtColor(im, cv2.COLOR_BGR2LAB).astype(np.float32); l[..., 0] *= 100 / 255; l[..., 1:] -= 128; return l


def frame_mask(im):
    L = lab(im)
    m = (L[..., 0] > 15) & (L[..., 0] < 40) & (L[..., 1] > 12) & (L[..., 2] > 12)
    n, lb, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
    return (lb == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))).astype(np.float32)  # largest = the frame


neu = cv2.imread(NEUTRAL); h, w = neu.shape[:2]
fm = frame_mask(neu)
ys, xs = np.nonzero(fm)
gx0, gx1, gy0, gy1 = xs.min(), xs.max(), ys.min(), ys.max()
L = lab(neu)
red = (L[..., 1] > 40) & (L[..., 0] > 25)
cx = (gx0 + gx1) // 2
tee_top = int(np.nonzero(red[:, cx - 20:cx + 20].any(1))[0].min())
span = gx1 - gx0
# lens rings sit inside the frame bbox minus the temple arms (~12% of span each side)
gh = gy1 - gy0
eyes = (int(gx0 + 0.08 * span), int(gy0 - 0.45 * gh), int(gx1 - 0.08 * span), int(gy1 - 0.12 * gh))
mouth = (int(cx - 0.26 * span), int(gy1 - 0.12 * gh), int(cx + 0.26 * span), int(tee_top - 0.004 * h))
print("frame bbox", (gx0, gy0, gx1, gy1), "tee top", tee_top, "eyes", eyes, "mouth", mouth)


def align(im):
    m = frame_mask(im)
    warp = np.eye(2, 3, dtype=np.float32)
    try:
        _, warp = cv2.findTransformECC(cv2.GaussianBlur(fm, (0, 0), 3), cv2.GaussianBlur(m, (0, 0), 3), warp,
                                       cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6), None, 5)
    except cv2.error as e:
        print("ECC failed", e)
    return cv2.warpAffine(im, warp, (w, h), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE), warp


ALIGNED = {}
for n in ORDER:
    f = NEUTRAL if n == "neutral" else os.path.join(R, "gen", "expr", n + ".png")
    im = cv2.imread(f)
    if im.shape[:2] != (h, w): im = cv2.resize(im, (w, h))
    ALIGNED[n] = im if n == "neutral" else align(im)[0]
# the decal mask: everywhere any expression differs from neutral (features), never on the frame, feathered
diff = np.zeros((h, w), bool)
for n in ORDER[1:]:
    d = np.abs(lab(ALIGNED[n]) - L).max(2) > 14
    diff |= d
diff = cv2.morphologyEx(diff.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
diff = cv2.dilate(diff, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))
# keep only regions that hold feature ink (lines, pupils, mouth interior) in some expression: drops contour/tusk slivers
ink = np.zeros((h, w), bool)
for n in ORDER:
    la = lab(ALIGNED[n]); ink |= (la[..., 0] < 32) & (np.abs(la[..., 1]) + np.abs(la[..., 2]) < 60)
ink &= ~(cv2.dilate(fm.astype(np.uint8), np.ones((15, 15), np.uint8)) > 0)
nlab, lbl = cv2.connectedComponents(diff, connectivity=8)
keep = np.unique(lbl[ink & (diff > 0)]); keep = keep[keep > 0]
diff = np.isin(lbl, keep).astype(np.uint8)
print("mask components kept", len(keep), "of", nlab - 1)
frame_d = cv2.dilate(fm.astype(np.uint8), np.ones((9, 9), np.uint8))
MASK = cv2.GaussianBlur((diff & (1 - frame_d)).astype(np.float32), (0, 0), 5)


def atlas(box, name):
    x0, y0, x1, y1 = box
    cw, ch = x1 - x0, y1 - y0
    A = np.zeros((ch * GRID, cw * GRID, 4), np.uint8)
    yy, xx = np.mgrid[0:ch, 0:cw]
    e = np.minimum.reduce([xx, cw - 1 - xx, yy, ch - 1 - yy]).astype(np.float32)
    alpha = np.clip(e / 6, 0, 1) * MASK[y0:y1, x0:x1]
    for i, n in enumerate(ORDER):
        cell = ALIGNED[n][y0:y1, x0:x1]
        r, c = divmod(i, GRID)
        A[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw, :3] = cell
        A[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw, 3] = (alpha * 255).astype(np.uint8)
    cv2.imwrite(os.path.join(R, "gen", f"atlas_{name}.png"), A)
    return {"box_px": [x0, y0, x1, y1], "uv_min": [x0 / w, 1 - y1 / h], "uv_max": [x1 / w, 1 - y0 / h]}


zones = {"image": "gen/flat_muse_front.png", "size": [w, h], "grid": GRID, "order": ORDER,
         "eyes": atlas(eyes, "eyes"), "mouth": atlas(mouth, "mouth")}
json.dump(zones, open(os.path.join(R, "gen", "face_zones.json"), "w"), indent=1)
print(json.dumps(zones, indent=1))
