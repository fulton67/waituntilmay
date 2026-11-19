"""face_clear: does any text / card / label / plate / caption cover a face? Measured on RENDERED pixels (client 2026-11-19: "the text
shouldn't go directly over the face ever").

  $PY -I research/ostad/style/oct14/face_clear.py <final.mp4> <allowed.mp4> <out.json> [--step 2] [--expand 0.10] [--min-px 60]

<allowed.mp4> is the same composition rendered with layer="allowed": the picture (footage, the full-frame before/after photo, the
cream-room takeover ground) plus the ALLOWED marks only (the pen markup on her face, the arrows' tips that land on a treated point).
Everything the final render has beyond it (cards, plates, titles, labels, captions, chips, notes) is the graphics mask:
  mask = max-channel |final - allowed| > 28 after a 3x3 blur, opened with a 3x3 kernel (codec noise out).
Faces: OpenCV YuNet + MediaPipe Face Landmarker boxes (brand/scripts/oct14_faces.py Faces) on the allowed frame, every `step` frames,
each box expanded by `expand` of its size on every side. A frame VIOLATES when a box holds >= `min_px` mask pixels.
A title that sits BEHIND a person (his/her key composited over it) changes no face pixel, so it passes by construction.
Pass = 0 violating frames.
--bare (the v4 baseline): <final.mp4> is a graphics-only render on black (Oct14Reel* --props='{"bare":true}') and <allowed.mp4> is the
footage-only render of the same cut (faces come from it); mask = bare pixels brighter than 28. This counts every v4 graphic,
its pen marks on her face included, so it is an upper bound for v4.
"""
import json, sys
from pathlib import Path
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "brand/scripts"))
from oct14_faces import Faces  # noqa: E402


def frames(path):
    cap = cv2.VideoCapture(str(path))
    while True:
        ok, f = cap.read()
        if not ok:
            return
        yield f


def main():
    a = sys.argv[1:]
    final, allowed, out = a[0], a[1], Path(a[2])
    opt = lambda k, d: type(d)(a[a.index(k) + 1]) if k in a else d
    step, expand, min_px = opt("--step", 2), opt("--expand", 0.10), opt("--min-px", 60)
    F = Faces()
    ker = np.ones((3, 3), np.uint8)
    viol, checked, faces_seen = [], 0, 0
    for i, (fa, fb) in enumerate(zip(frames(final), frames(allowed))):
        if i % step:
            continue
        checked += 1
        boxes = F(fb)
        faces_seen += len(boxes)
        if not boxes:
            continue
        if "--bare" in a:
            d = cv2.blur(fa, (3, 3)).max(axis=2).astype(np.int16)
        else:
            d = np.abs(cv2.blur(fa, (3, 3)).astype(np.int16) - cv2.blur(fb, (3, 3)).astype(np.int16)).max(axis=2)
        m = cv2.morphologyEx((d > 28).astype(np.uint8), cv2.MORPH_OPEN, ker)
        H, W = m.shape
        hits = []
        for x, y, w, h in boxes:
            x0, y0 = int(max(0, x - expand * w)), int(max(0, y - expand * h))
            x1, y1 = int(min(W, x + w * (1 + expand))), int(min(H, y + h * (1 + expand)))
            n = int(m[y0:y1, x0:x1].sum())
            if n >= min_px:
                hits.append({"box": [x0, y0, x1 - x0, y1 - y0], "px": n, "share": round(n / max(1, (x1 - x0) * (y1 - y0)), 3)})
        if hits:
            viol.append({"f": i, "hits": hits})
    runs = []
    for v in viol:
        if runs and v["f"] - runs[-1][1] <= step:
            runs[-1][1] = v["f"]
        else:
            runs.append([v["f"], v["f"]])
    res = {"final": str(final), "allowed": str(allowed), "step": step, "expand": expand, "min_px": min_px, "frames_checked": checked,
           "faces_seen": faces_seen, "violating_frames": len(viol), "runs": runs, "pass": len(viol) == 0, "violations": viol}
    out.write_text(json.dumps(res, indent=1))
    print(json.dumps({k: v for k, v in res.items() if k != "violations"}))


if __name__ == "__main__":
    main()
