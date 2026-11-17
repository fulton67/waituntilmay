"""L04 junction rings for YouTube v5: find the cyan synapse points in Flora neuro_anim.mp4 as they light, frame by frame.
A pixel is 'lit' when it is bright and blue-cyan (B - R > 28, G - R > 14, V > 200). Blobs that are lit for >= 6 frames running
and were dark in the first frame are junctions; each gets the frame it first lit and its centroid (source px, 1928x1076).
Output: junctions.json next to this script (list of {x, y, frame} in output px 1920x1080, frame at the clip's own 24 fps)."""
import json, sys, cv2, numpy as np, os
src = sys.argv[1]
cap = cv2.VideoCapture(src); frames = []
while True:
    ok, f = cap.read()
    if not ok: break
    frames.append(f)
H, W = frames[0].shape[:2]
def lit(f):
    b, g, r = [f[..., i].astype(int) for i in range(3)]
    v = f.max(axis=2)
    m = ((b - r > 28) & (g - r > 14) & (v > 200)).astype(np.uint8)
    return cv2.dilate(m, np.ones((5, 5), np.uint8))
masks = [lit(f) for f in frames]
first = masks[0]
# accumulate: a pixel's first lit frame where it stays lit 6 frames
n = len(masks); stack = np.stack(masks)  # n,H,W
run = np.zeros((H, W), int); onset = np.full((H, W), -1)
for i in range(n):
    run = np.where(stack[i] > 0, run + 1, 0)
    newly = (run == 6) & (onset < 0)
    onset[newly] = i - 5
valid = (onset > 0) & (first == 0)
num, lab, stats, cent = cv2.connectedComponentsWithStats(valid.astype(np.uint8))
out = []
sx, sy = 1920 / W, 1080 / H
for k in range(1, num):
    area = stats[k, cv2.CC_STAT_AREA]
    if area < 60: continue
    fr = int(np.median(onset[lab == k]))
    out.append({"x": round(cent[k][0] * sx), "y": round(cent[k][1] * sy), "frame": fr, "area": int(area)})
out.sort(key=lambda j: j["frame"])
print(len(out), "junctions"); [print(j) for j in out]
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "junctions.json"), "w"), indent=1)
