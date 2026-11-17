"""Oct 14 injection reel: synthetic PLACEHOLDER media for building and measuring the reusable devices before the footage lands.

Nothing here is patient footage. It draws an abstract mannequin face (an oval with eyes, nose, lips, nasolabial and marionette
lines) on the room canvas with a slow handheld drift, three "injection" clips (a gradient, a numbered card and a moving bar so the
playback is visible), and an aligned before/after still pair whose "after" has softer lines. Every frame says PLACEHOLDER.

  PY=C:/Users/naimj/tools/style-venv/Scripts/python.exe
  $PY -I brand/scripts/oct14_placeholder.py
Writes brand/remotion/public/oct14/placeholder/ (gitignored): intro.mp4, inj1..3.mp4, before.jpg, after.jpg, points.json
(the face points per frame in composition px, the same schema the real track will use: {f0, pts: {name: [[x, y], ...]}}).
"""
import json, math, subprocess
from pathlib import Path
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "brand/remotion/public/oct14/placeholder"
W, H, FPS = 1080, 1920, 24
BG_TOP, BG_BOT = (214, 206, 200), (236, 231, 228)  # BGR, the cool blue-grey room (style DECISIONS 14d v4)


def drift(f):
    return 6 * math.sin(2 * math.pi * f / 96), 4 * math.sin(2 * math.pi * f / 130 + 1)


def base():
    g = np.linspace(0, 1, H)[:, None, None]
    return (np.array(BG_TOP) * (1 - g) + np.array(BG_BOT) * g).astype(np.uint8).repeat(W, axis=1)


# face geometry (centre-relative px); the named points are the ones the reel uses (marionette, nasolabial, lips, chin, cheek, under-eye)
C0 = (540, 930)
PTS = {
    "eyeL": (-150, -170), "eyeR": (150, -170), "nose": (0, 20), "lipU": (0, 150), "lipL": (0, 205), "chin": (0, 380),
    "nasoL": (-120, 120), "nasoR": (120, 120), "marioL": (-130, 290), "marioR": (130, 290), "cheekL": (-230, 20), "cheekR": (230, 20),
    "underL": (-150, -110), "underR": (150, -110),
}


def face(img, f, soft=0.0, label="PLACEHOLDER: not patient footage"):
    dx, dy = drift(f)
    cx, cy = C0[0] + dx, C0[1] + dy
    P = lambda k: (int(cx + PTS[k][0]), int(cy + PTS[k][1]))
    cv2.ellipse(img, (int(cx), int(cy + 40)), (330, 470), 0, 0, 360, (196, 205, 222), -1, cv2.LINE_AA)
    cv2.ellipse(img, (int(cx), int(cy + 40)), (330, 470), 0, 0, 360, (150, 158, 172), 3, cv2.LINE_AA)
    for k in ("eyeL", "eyeR"):
        cv2.ellipse(img, P(k), (60, 26), 0, 0, 360, (90, 80, 70), 3, cv2.LINE_AA)
    cv2.line(img, (int(cx), int(cy - 120)), P("nose"), (140, 140, 150), 3, cv2.LINE_AA)
    cv2.ellipse(img, (int(cx), int(cy + 175)), (95, 30), 0, 0, 360, (120, 120, 170), -1, cv2.LINE_AA)
    k = int(150 + 80 * soft)  # lines get lighter in the "after"
    col = (k - 40, k - 40, k - 30)
    for a, b in (((-60, 40), (-120, 140)), ((60, 40), (120, 140)), ((-95, 190), (-135, 310)), ((95, 190), (135, 310))):
        cv2.line(img, (int(cx + a[0]), int(cy + a[1])), (int(cx + b[0]), int(cy + b[1])), col, max(1, int(6 - 4 * soft)), cv2.LINE_AA)
    cv2.putText(img, label, (60, 200), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (40, 40, 160), 3, cv2.LINE_AA)
    return {k2: [round(cx + v[0], 1), round(cy + v[1], 1)] for k2, v in PTS.items()}


def encode(path, frames):
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", str(path)], stdin=subprocess.PIPE)
    for fr in frames:
        p.stdin.write(fr.tobytes())
    p.stdin.close()
    p.wait()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    n = 12 * FPS
    pts = {k: [] for k in PTS}
    def intro():
        for f in range(n):
            img = base()
            for k, v in face(img, f).items():
                pts[k].append(v)
            cv2.putText(img, f"INTRO 4:44 PM  f{f}", (60, 260), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (60, 60, 60), 2, cv2.LINE_AA)
            yield img
    encode(OUT / "intro.mp4", intro())
    (OUT / "points.json").write_text(json.dumps({"f0": 0, "pts": pts}))
    tints = [(176, 150, 120), (150, 170, 130), (130, 140, 175)]
    for i, t in enumerate(tints, 1):
        def inj():
            for f in range(6 * FPS):
                img = np.zeros((H, W, 3), np.uint8)
                img[:] = t
                g = np.linspace(0, 60, H).astype(np.uint8)[:, None, None]
                img = cv2.add(img, g.repeat(W, 1).repeat(3, 2))
                x = int(200 + 500 * (f / (6 * FPS)))
                cv2.line(img, (x, 500), (x + 260, 1300), (240, 240, 240), 18, cv2.LINE_AA)
                cv2.putText(img, f"INJECTION {i}", (120, 960), cv2.FONT_HERSHEY_SIMPLEX, 3.2, (255, 255, 255), 8, cv2.LINE_AA)
                cv2.putText(img, f"placeholder  f{f}", (120, 1060), cv2.FONT_HERSHEY_SIMPLEX, 1.6, (255, 255, 255), 3, cv2.LINE_AA)
                yield img
        encode(OUT / f"inj{i}.mp4", inj())
    b, a = base(), base()
    face(b, 0, 0.0, "PLACEHOLDER BEFORE")
    face(a, 0, 1.0, "PLACEHOLDER AFTER")
    cv2.imwrite(str(OUT / "before.jpg"), b, [cv2.IMWRITE_JPEG_QUALITY, 92])
    cv2.imwrite(str(OUT / "after.jpg"), a, [cv2.IMWRITE_JPEG_QUALITY, 92])
    print("wrote", OUT)


if __name__ == "__main__":
    main()
