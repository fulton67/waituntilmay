"""Under-eye reel v5: stills sheet (every beat, from the timeline) + the REAL OBJECT beat as a 6-frame strip (larger tiles, own row).
usage: python brand/scripts/undereye_sheet_v5.py <render.mp4> <out.jpg> [cols=8]"""
import subprocess, sys
from pathlib import Path
import numpy as np
import cv2
sys.path.insert(0, str(Path(__file__).parent))
import timeline_lib as T
tl = T.load(T.REM / "timelines/undereye.json"); P = T.transcript(tl)
c = P["cues"]
R = {b["id"]: (T.resolve(b["start"], tl, P), T.resolve(b["end"], tl, P)) for b in tl["beats"]}
F = [("hook", 20)]
for b in tl["beats"]:
    if b["lane"] == "footage" or b["id"] in ("hook", "cannula", "needle"): continue
    s, e = R[b["id"]]; F.append((b["id"], min(e - 4, s + 40)))
F += [("tyndall", c["tyndall"] + 20), ("before marks", c["pinprick"] + 40), ("after wipe", c["two"] + 45), ("bars", c["settled"] + 20), ("end", P["durationInFrames"] + 40)]
cs, ce = R["cannula"]; ns = R["needle"][0]; ct = T.resolve(tl["beats"][[b["id"] for b in tl["beats"]].index("cannula")]["events"]["tip"], tl, P)
nt = T.resolve(tl["beats"][[b["id"] for b in tl["beats"]].index("needle")]["events"]["tip"], tl, P)
STRIP = [("cannula in", cs + 6), ("cannula held", ns - 4), ("needle in", ns + 10), ("needle tip", nt + 12), ("cannula tip", ct + 12), ("leaving", max(ce, cs + 62) + 5)]
src, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 8
want = {f: n for n, f in F}; swant = {f: n for n, f in STRIP}
pr = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-vf", "scale=360:640", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE)
tiles, strip, f = {}, {}, 0
def lab(im, t, s):
    cv2.rectangle(im, (0, 0), (im.shape[1], int(30 * s)), (0, 0, 0), -1)
    cv2.putText(im, t, (4, int(21 * s)), cv2.FONT_HERSHEY_SIMPLEX, 0.6 * s, (0, 255, 255), 1, cv2.LINE_AA); return im
while True:
    b = pr.stdout.read(360 * 640 * 3)
    if len(b) < 360 * 640 * 3: break
    im = np.frombuffer(b, np.uint8).reshape(640, 360, 3)
    if f in want: tiles[f] = lab(cv2.resize(im, (270, 480)), f"{f} {want[f]}", 0.8)
    if f in swant: strip[f] = lab(im.copy(), f"{f} {swant[f]}", 1)
    f += 1
ts = [tiles[k] for k in sorted(tiles)]
while len(ts) % cols: ts.append(np.zeros_like(ts[0]))
grid = np.vstack([np.hstack(ts[i:i + cols]) for i in range(0, len(ts), cols)])
srow = np.hstack([strip[k] for k in sorted(strip)])
srow = cv2.resize(srow, (grid.shape[1], int(srow.shape[0] * grid.shape[1] / srow.shape[1])))
head = np.zeros((40, grid.shape[1], 3), np.uint8)
cv2.putText(head, "REAL OBJECTS: blunt cannula (PLACEHOLDER, SHOT_REQUESTS #16) + needle (Commons, CC BY-SA 3.0)", (8, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 1, cv2.LINE_AA)
cv2.imwrite(out, np.vstack([grid, head, srow]), [cv2.IMWRITE_JPEG_QUALITY, 88])
print(len(tiles), "stills +", len(strip), "strip ->", out)
