"""Under-eye reel v4: stills sheet of the render: every beat plus each title at its hold midpoint (s + 12 + 30).
usage: python brand/scripts/undereye_sheet_v4.py <render.mp4> <out.jpg> [cols=8]"""
import json, subprocess, sys
from pathlib import Path
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parents[2]
P = json.load(open(ROOT / "brand/remotion/public/undereye-filler/props_v4.json"))
c = P["cues"]
S = {pc["id"]: pc["at"] for pc in P["pieces"]}
hold = lambda s: s + 42
win = c["pinprick"] - 14
F = [("hook", 20), ("TITLE hold", hold(P["hook"])), ("hook window", 110), ("01 hold", hold(S["P03x"])), ("eye + U1", 240), ("U1 hollow", 330),
     ("02 hold", hold(S["P04"] - 1)), ("name", 420), ("U4", c["blunt"] + 20), ("U4+U5", c["delicate"] + 40), ("afterwards", 630), ("lasts", 700),
     ("U6", c["anesthetic"] + 20), ("U6 lido", c["lidocaine"] + 10), ("inject", 860), ("plan rim", c["deep"] + 20), ("plan paths", c["we"] + 20),
     ("plan + U1", c["underneath"] + 30), ("fuller", c["fuller"] + 10), ("deeper", c["deeper"] + 4), ("03 hold", hold(S["P14"])),
     ("U7 x2", c["another"] + 30), ("U7 expand", c["pillowy"] + 6), ("used/not", c["beautiful"] + 10), ("U3", c["bluish"] + 10), ("U3 tyndall", c["tyndall"] + 20),
     ("04 hold", hold(S["P17"])), ("U8", c["conventional"] + 40), ("U8 bruise", c["bruised"] + 10), ("U9", c["here"] + 30), ("pinprick", c["pinprick"] + 6),
     ("before marks", 1960), ("after wipe", c["two"] + 45), ("bars", c["settled"] + 20), ("stat", c["settled"] + 60), ("end", P["durationInFrames"] + 40)]
src, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 8
want = {f: n for n, f in F}
pr = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-vf", "scale=270:480", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE)
tiles, f = {}, 0
while True:
    b = pr.stdout.read(270 * 480 * 3)
    if len(b) < 270 * 480 * 3: break
    if f in want:
        im = np.frombuffer(b, np.uint8).reshape(480, 270, 3).copy()
        cv2.rectangle(im, (0, 0), (270, 22), (0, 0, 0), -1)
        cv2.putText(im, f"{f} {want[f]}", (4, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (0, 255, 255), 1, cv2.LINE_AA)
        tiles[f] = im
    f += 1
ts = [tiles[k] for k in sorted(tiles)]
while len(ts) % cols: ts.append(np.zeros_like(ts[0]))
cv2.imwrite(out, np.vstack([np.hstack(ts[i:i + cols]) for i in range(0, len(ts), cols)]), [cv2.IMWRITE_JPEG_QUALITY, 88])
print(len(tiles), "stills ->", out)
