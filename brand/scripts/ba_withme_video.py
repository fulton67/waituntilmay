"""Face-locked full-frame footage for the "With me / Without me" VIDEO reel (src/bavideo/WithMeVideo.tsx).

  python -I brand/scripts/ba_withme_video.py <before.MOV> <after.MOV> <pub_dir> <tag>

Shots follow the reference's spoken word onsets (frames at 30 fps): 0-36 AFTER ("With me"), 36-84 BEFORE ("Without me"),
84-164 AFTER, 164-225 BEFORE. Each clip plays one continuous stretch across its two shots (AFTER 116 frames, BEFORE 109 frames).
The stretch is chosen where the face is steadiest and most front-on, and where the two clips' head turn (yaw) matches.
Every frame is aligned with MediaPipe landmarks (forehead 10 -> nose tip 1 sets one shared scale, the eye line sets roll, nose bridge 168 is
pinned), smoothed over time, so each cut lands face-on-face. Plain ffmpeg decode, no grade, no retouch: crop/scale/rotate/move only.
Where the frame runs past the source, the clip's own backdrop colour is feathered in. Writes <tag>_story.mp4 (1080x1920),
<tag>_feed.mp4 (1080x1350) and <tag>.json into <pub_dir> (outside the repo; never committed).
"""
import json, os, subprocess, sys
import cv2, numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from ba_video_p0005 import detector, frames, smooth  # noqa: E402

CUTS = [0, 36, 84, 164, 225]
NEED = {"after": 36 + 80, "before": 48 + 61}
FMT = {"story": (1080, 1920, 0.42), "feed": (1080, 1350, 0.44)}   # width, height, nose-bridge y as a share of the height


def track(path):
    det = detector(); P, F = [], []
    for img in frames(path):
        F.append(img); L = det(img)
        P.append(None if L is None else {"fh": L[10], "nt": L[1], "nb": L[168], "le": L[33], "re": L[263]})
    idx = [i for i, p in enumerate(P) if p]
    ser = lambda k: smooth(np.array([np.interp(range(len(P)), idx, [P[i][k][j] for i in idx]) for j in range(2)]).T, 7)
    fh, nt, nb, le, re = (ser(k) for k in ("fh", "nt", "nb", "le", "re"))
    yaw = (nt[:, 0] - (le[:, 0] + re[:, 0]) / 2) / np.maximum(1, np.abs(re[:, 0] - le[:, 0]))
    # roll from the eye line (yaw-robust, unlike the forehead->nose vector), heavily smoothed and capped at 8 deg
    roll = smooth(np.degrees(np.arctan2(re[:, 1] - le[:, 1], re[:, 0] - le[:, 0]))[:, None], 15)[:, 0].clip(-8, 8)
    return F, fh, nt, nb, yaw, len(idx) / max(1, len(P)), roll


def pick(ya, yb, na, nb):
    best = None
    for a0 in range(0, len(ya) - na + 1, 2):
        wa = ya[a0:a0 + na]
        for b0 in range(0, len(yb) - nb + 1, 2):
            wb = yb[b0:b0 + nb]
            cost = wa.std() + wb.std() + abs(wa.mean() - wb.mean()) + 0.5 * (abs(wa.mean()) + abs(wb.mean()))
            if best is None or cost < best[0]: best = (cost, a0, b0)
    return best


def main(bpath, apath, pub, tag):
    os.makedirs(pub, exist_ok=True)
    B, A = track(bpath), track(apath)
    na, nb = NEED["after"], NEED["before"]
    if len(A[0]) < na or len(B[0]) < nb: raise SystemExit(f"clip too short: after {len(A[0])}/{na}, before {len(B[0])}/{nb}")
    cost, a0, b0 = pick(A[4], B[4], na, nb)
    # one shared scale: the median native forehead->nose-tip length of both stretches (so neither is enlarged much)
    Ln = lambda T, s, n: np.median(np.hypot(*(T[2][s:s + n] - T[1][s:s + n]).T))
    L0 = (Ln(A, a0, na) + Ln(B, b0, nb)) / 2 * 1.3   # 1.3x: a closer frame, so the source edge stays out of shot
    seq = []                                    # (clip, frame) per output frame
    ai, bi = a0, b0
    for k in range(4):
        for _ in range(CUTS[k + 1] - CUTS[k]):
            if k % 2 == 0: seq.append(("A", ai)); ai += 1
            else: seq.append(("B", bi)); bi += 1
    meta = {"after": os.path.basename(apath), "before": os.path.basename(bpath), "after_in_out_s": [a0 / 30, (a0 + na) / 30],
            "before_in_out_s": [b0 / 30, (b0 + nb) / 30], "pick_cost": float(cost), "detect_rate": [A[5], B[5]],
            "yaw_after_mean": float(A[4][a0:a0 + na].mean()), "yaw_before_mean": float(B[4][b0:b0 + nb].mean()), "scale_vs_native": {}}
    bgc = {}
    for c, T in (("A", A), ("B", B)):
        img = T[0][0]; lum = img.mean(2); dark = img[lum < np.percentile(lum, 30)]
        bgc[c] = np.median(dark, 0)
    for fmt, (W, H, ay) in FMT.items():
        p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", "30", "-i", "-",
                              "-c:v", "libx264", "-crf", "10", "-preset", "slow", "-pix_fmt", "yuv420p", "-colorspace", "bt709",
                              "-color_primaries", "bt709", "-color_trc", "bt709", os.path.join(pub, f"{tag}_{fmt}.mp4")], stdin=subprocess.PIPE)
        sc = []
        for c, i in seq:
            T = A if c == "A" else B
            img, fh, nt, nbr = T[0][i], T[1][i], T[2][i], T[3][i]
            d = nt - fh; s = L0 / np.hypot(*d); ang = -np.radians(T[6][i]); sc.append(s)
            R = np.array([[np.cos(ang), -np.sin(ang)], [np.sin(ang), np.cos(ang)]]) * s
            M = np.hstack([R, (np.array([W / 2, ay * H]) - R @ nbr)[:, None]])
            wi = cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
            m = cv2.warpAffine(np.ones(img.shape[:2], np.float32), M, (W, H), borderValue=0)
            if m.min() < 0.999:
                m = cv2.GaussianBlur(cv2.erode(m, np.ones((9, 9), np.uint8)), (0, 0), 14)[..., None]
                wi = (wi * m + bgc[c] * (1 - m)).clip(0, 255).astype(np.uint8)
            p.stdin.write(np.ascontiguousarray(wi).tobytes())
        p.stdin.close(); p.wait()
        meta["scale_vs_native"][fmt] = [float(min(sc)), float(max(sc))]
    json.dump(meta, open(os.path.join(pub, f"{tag}.json"), "w"), indent=1)
    print(json.dumps(meta))


if __name__ == "__main__":
    main(*sys.argv[1:5])
