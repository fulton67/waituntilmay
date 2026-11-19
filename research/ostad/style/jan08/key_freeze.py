"""Jan08 key-freeze check: through every span where his alpha key is mounted, the render's pixels inside his body must match
talk.mp4 at the EXPECTED source frame (matched lag 0 throughout, no hold), and the silhouette edge must keep matching too (a frozen
matte would leave a stale outline while the footage moves).

  python research/ostad/style/jan08/key_freeze.py <render.mp4> <props.json> <out.json>

For each key span (piece, comp s..e, place) and every frame n: expected source frame k = round(from*24) + (n - at). The render's
body region (and the edge band) is compared with source frames k-6..k+6 placed the same way; the best lag must be 0.
"""
import json, subprocess, sys
import numpy as np

ROOT = "C:/Users/naimj/orca/workspaces/waituntilmay/OSTAD-CONTENT-INTEL/"
TALK = ROOT + "brand/remotion/public/jan08/talk.mp4"
SW, SH = 270, 480  # quarter size


def frames(path, first, n, scale=(SW, SH)):
    vf = f"select=gte(n\\,{first})*lt(n\\,{first + n}),scale={scale[0]}:{scale[1]}:flags=area"
    b = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", vf, "-vsync", "0", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(b, np.uint8).reshape(-1, scale[1], scale[0]).astype(np.float32)


render, props, out = sys.argv[1:4]
P = json.load(open(props))
pcs = {p["id"]: p for p in P["pieces"]}
# the mounted key spans of Jan08ReelV4 (timelines/jan08.json, resolved): piece, s, e, place
# (the full-frame spans are mounted one frame longer, e + 1, under the next shot's cut; checked to e)
SPANS = [("hook", 0, 46, None), ("belief", 46, 96, None), ("belief", 96, 176, None), ("belief", 176, 336, (-250, 0.8)),
         ("aging", 558, 638, None), ("aging", 638, 827, (-250, 0.8)), ("method", 909, 989, None), ("cheekbones", 1470, 1550, None)]
res = []
for pid, s, e, place in SPANS:
    pc = pcs[pid]
    e = min(e, pc["at"] + pc["dur"])
    k0 = round(pc["from"] * 24) + (s - pc["at"])
    R = frames(render, s, e - s)
    S = frames(TALK, k0 - 6, e - s + 12)
    if place:  # the placed key: source scaled by `scale` from his feet, moved x
        x, sc = place
        w, h = round(SW * sc), round(SH * sc)
        S2 = np.zeros_like(S)
        import cv2
        for i in range(len(S)):
            sm = cv2.resize(S[i], (w, h), interpolation=cv2.INTER_AREA)
            ox = round(x / 4)
            xs, xe = max(0, ox), min(SW, ox + w)
            S2[i, SH - h:, xs:xe] = sm[:, xs - ox:xe - ox]
        S = S2
        reg = (slice(SH - h + int(0.15 * h), SH - h + int(0.45 * h)), slice(max(0, round(x / 4) + int(0.30 * w)), round(x / 4) + int(0.70 * w)))  # his head and neck (textured)
    else:
        reg = (slice(int(0.62 * SH), int(0.80 * SH)), slice(int(0.36 * SW), int(0.64 * SW)))  # his torso (chest, below the chin)
    lags, worst, gap = [], 0.0, []
    for i in range(len(R)):
        errs = [float(np.abs(R[i][reg] - S[i + 6 + d][reg]).mean()) if 0 <= i + 6 + d < len(S) else 1e9 for d in range(-6, 7)]
        lag = int(np.argmin(errs)) - 6
        lags.append(lag)
        worst = max(worst, errs[6])
        gap.append(min(errs[3], errs[9]) - errs[6])  # how much worse a 3-frame-stale source fits than the expected frame
    nz = [i + s for i, l in enumerate(lags) if l != 0]
    res.append({"piece": pid, "span": [s, e], "placed": bool(place), "frames": len(R), "frames_lag_nonzero": len(nz), "lag_nonzero_at": nz[:20],
                "max_err_at_lag0": round(worst, 2),
                "median_stale3_minus_lag0": round(float(np.median(gap)), 2)})
    print(res[-1])
json.dump({"spans": res, "frozen_spans": [r for r in res if r["frames_lag_nonzero"] > 2]}, open(out, "w"), indent=1)
