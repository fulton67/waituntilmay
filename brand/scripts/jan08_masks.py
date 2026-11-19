"""Jan 08 reel v3: his key as ALPHA ONLY over the raw footage (client 2026-11-19: "never edit the footage's colouring ... keep the raw
footage as it looks"). The v2 keys (public/jan08/key_*.webm) carry RVM's foreground colour from the tone-mapped footage, so over the raw
HLG talk.mp4 they would not match. Here the RVM alphas (brand/edits/jan08-filler-fatigue/matte/<piece>_pha.mp4, unchanged geometry)
become per-frame RGBA mask PNGs (white, alpha = matte), and ReelV3 lays a second copy of the SAME raw talk.mp4 over the title with
CSS mask-image = that PNG: the keyed pixels are the footage's own pixels, so there can be no colour seam.
Alpha clean-up as video_matte.py --pack --refine: largest body + 24 px, edge pulled in 1 px, feather sigma 0.8 px.
Frame alignment: each <piece>_src.mp4 was cut with ffmpeg -ss <from> (first frame with pts >= from); Remotion's piece starts at
round(from * 24). The offset is measured per piece by matching src frame 0 against the tone-mapped talk.mp4 at r-1..r+1.

  $PY -I brand/scripts/jan08_masks.py  -> brand/remotion/public/jan08/mask/<piece>/<j>.png (j = frame inside the piece), mask/index.json
"""
import json
import subprocess
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "brand/remotion/public/jan08"
MAT = ROOT / "brand/edits/jan08-filler-fatigue/matte"
TM = PUB / "tonemapped_v2/talk.mp4"
W, H = 1080, 1920


def frames(path, first=0, n=None, fmt="gray"):
    ch = 1 if fmt == "gray" else 3
    vf = f"select=gte(n\\,{first})" + (f"*lt(n\\,{first + n})" if n else "")
    p = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", vf, "-vsync", "0", "-f", "rawvideo", "-pix_fmt", fmt, "-"],
                       capture_output=True, check=True).stdout
    a = np.frombuffer(p, np.uint8)
    return a.reshape(-1, H, W) if ch == 1 else a.reshape(-1, H, W, 3)


def offset(piece, frm):
    r = round(frm * 24)
    src0 = frames(MAT / f"{piece}_src.mp4", 0, 1)[0].astype(float)
    cand = frames(TM, r - 1, 3).astype(float)
    err = [np.abs(c - src0).mean() for c in cand]
    return int(np.argmin(err)) - 1, err  # src frame 0 == raw frame r + off


def clean(al):
    ker = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (49, 49))
    k, lab, st, _ = cv2.connectedComponentsWithStats((al > 64).astype(np.uint8), 8)
    if k > 2:
        main = 1 + int(np.argmax(st[1:, 4]))
        al = al.copy(); al[cv2.dilate((lab == main).astype(np.uint8), ker) == 0] = 0
    a = cv2.GaussianBlur(cv2.erode(al, np.ones((3, 3), np.uint8)).astype(np.float32) / 255, (0, 0), 0.8)
    return (a * 255).round().astype(np.uint8)


def main():
    props = json.loads((PUB / "props.json").read_text())
    pcs = {p["id"]: p for p in props["pieces"]}
    cues = props["cues"]
    L = 80
    S1, S2, S3, S4 = 78, cues["start:aging"], cues["start:method"], cues["great"] + 9
    # (piece, comp start, comp end) spans that need his key: hook, the 4 room titles, the two keyed plates
    spans = [("hook", 0, pcs["hook"]["dur"]), ("belief", S1, cues["start:cause"]), ("aging", S2, cues["aging2"]),
             ("method", S3, S3 + L + 1), ("cheekbones", S4, S4 + L + 1)]
    index = {}
    for piece, s, e in spans:
        at, frm = pcs[piece]["at"], pcs[piece]["from"]
        off, err = offset(piece, frm)
        j0, j1 = s - at, e - at  # piece-local frames needed
        pha = frames(MAT / f"{piece}_pha.mp4")
        out = PUB / "mask" / piece
        out.mkdir(parents=True, exist_ok=True)
        n = 0
        for j in range(j0, j1 + 1):
            k = min(max(j - off, 0), len(pha) - 1)  # src index for piece-local j (raw frame r + j = r + off + k); clamped at the cut's edges
            a = clean(pha[k])
            rgba = np.dstack([np.full((H, W, 3), 255, np.uint8), a])
            cv2.imwrite(str(out / f"{j}.png"), rgba, [cv2.IMWRITE_PNG_COMPRESSION, 6])
            n += 1
        index[piece] = {"j0": j0, "j1": j1, "offset": off, "match_err": [round(x, 2) for x in err], "written": n, "pha_frames": len(pha)}
        print(piece, index[piece])
    (PUB / "mask" / "index.json").write_text(json.dumps(index, indent=1))


if __name__ == "__main__":
    main()
