"""Jan 08 reel v3: his RVM matte as a grey video per piece, for the alpha-only key over the RAW footage (client 2026-11-19: never
grade the footage). ReelV3 composites  out = (footage + title) x (1 - m)  plus  footage x m  with CSS multiply / plus-lighter, all
from video elements Remotion waits for, so the keyed pixels are the raw footage's own pixels (no colour seam) and no frame can be
shot with the key missing (the CSS mask-image PNG route of jan08_masks.py dropped his key on ~14 % of frames: face_clear caught it).

Source: brand/edits/jan08-filler-fatigue/matte/<piece>_pha.mp4 (RVM, unchanged geometry), cleaned as video_matte.py --pack
--refine (largest body + 24 px, edge pulled in 1 px, feather sigma 0.8), re-timed to Remotion's piece frames (offset measured in
jan08_masks.py: src frame 0 == raw round(from*24) + off; mask/index.json), written as lossless grey H.264 (qp 0, tv range: alpha a ->
Y = 16 + 219 a / 255) of the piece's full length.

  $PY -I brand/scripts/jan08_mattes.py   -> brand/remotion/public/jan08/matte/<piece>.mp4
"""
import json
import subprocess
from pathlib import Path

import numpy as np

import jan08_masks as jm  # same folder: frames(), clean()

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "brand/remotion/public/jan08"
W, H = 1080, 1920


def main():
    props = json.loads((PUB / "props.json").read_text())
    pcs = {p["id"]: p for p in props["pieces"]}
    idx = json.loads((PUB / "mask/index.json").read_text())
    out_dir = PUB / "matte"
    out_dir.mkdir(exist_ok=True)
    for piece in ("hook", "belief", "aging", "method", "cheekbones"):
        off = idx[piece]["offset"]
        dur = pcs[piece]["dur"]
        pha = jm.frames(jm.MAT / f"{piece}_pha.mp4")
        enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", f"{W}x{H}", "-r", "24", "-i", "-",
                                "-vf", "scale=out_range=tv:out_color_matrix=bt709,format=yuv420p", "-c:v", "libx264", "-qp", "0", "-preset", "veryslow",
                                "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
                                str(out_dir / f"{piece}.mp4")], stdin=subprocess.PIPE)
        for j in range(dur):
            k = min(max(j - off, 0), len(pha) - 1)
            enc.stdin.write(jm.clean(pha[k]).tobytes())
        enc.stdin.close(); enc.wait()
        print(piece, dur, "frames, offset", off)


if __name__ == "__main__":
    main()
