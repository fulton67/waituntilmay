"""Oct 14 injection reel: measure the reusable devices on the placeholder lab renders (decoded frames, not the code's intent).

  PY=C:/Users/naimj/tools/style-venv/Scripts/python.exe
  $PY -I brand/scripts/oct14_lab_measure.py
Reads brand/edits/oct14-injection/lab/lab_{pip,ba}_bare.mp4 (graphics on black: brand/remotion Oct14Lab --props bare=true) and the full
renders, and brand/remotion/public/oct14/placeholder/points.json. Writes research/ostad/style/oct14/lab_measure.json.
Timings must match Oct14Lab.tsx LAB_PIPS / LAB_BA (copied below; a mismatch shows up as offsets, never silently).

InjectionPip, per pip (target = MOTION §3: reveal at onset + 1 f; `arrive` 14 f; callout head lands at r0 + 17):
  reveal_f      first frame where the ring + window area differs from the frame before the cue (> 3 grey levels on > 0.2 % of it)
  open_f        first frame the window covers >= 98 % of its final box; overshoot_px = largest window width beyond the box
  arrow_land_f  first frame the callout corridor reaches 95 % of its held ink
  anchor_clear  the point itself (5 px disc at the ring centre) stays dark while the window is up (the window never covers it)
  inside_safe   every graphic pixel above the caption band stays inside x 98..982 and below y 250 (consent flag excluded)
BeforeAfter (targets: plate at s + 1; push lands at region s + 1 (starts s - 25, `sweep` 26 f); outline from region s + 1; pointer head lands at region s + 18):
  plate_f, push_settle_f (on a marks-off pass), outline_f, arrow_land_f per region, and moving_min (the cards never hold still: min 1 s grey change
  inside a card during holds, against the 0.16 lint threshold, DECISIONS 14i)
Flashes: one-frame luma spikes > 30 levels on the full renders.
"""
import json, math
from pathlib import Path
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parents[2]
LAB = ROOT / "brand/edits/oct14-injection/lab"
PTS = json.loads((ROOT / "brand/remotion/public/oct14/placeholder/points.json").read_text())["pts"]
OUT = ROOT / "research/ostad/style/oct14/lab_measure.json"
W, H, M, SAFE_T, CAP_T = 1080, 1920, 98, 250, 1594
PIPS = [(1, 30, 100, "marioL"), (2, 110, 180, "nasoR"), (3, 190, 260, "lipU")]
BA = {"s": 5, "out": 250, "pullS": 200, "regions": [(70, "marioL"), (140, "nasoR")], "crop": (0.14, 0.0, 0.72), "r": (70, 95)}


def frames(path):
    cap, out = cv2.VideoCapture(str(path)), []
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        out.append(cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY))
    return np.stack(out)


def pip_box(a):
    w, h = 380, round(380 * 1920 / 1080)
    x = W - M - w if a[0] < W / 2 else M
    y = max(SAFE_T + 20, min(CAP_T - 40 - 120 - h, a[1] - h / 2))
    return int(x), int(y), w, h


def first_change(F, mask, f0, f1, ref, lv=3, share=0.002):
    for f in range(f0, f1):
        d = np.abs(F[f].astype(int) - F[ref].astype(int))[mask]
        if (d > lv).mean() > share:
            return f
    return None


def land(F, mask, f0, f1, k=0.99, thr=60):
    ink = np.array([(F[f][mask] > thr).sum() for f in range(f0, f1)])
    if ink.max() == 0:
        return None
    return f0 + int(np.argmax(ink >= k * ink[-1]))


def safe(F, f0, f1):
    viol = 0
    for f in range(f0, f1, 2):
        g = F[f][:CAP_T - 14].copy()
        g[:90, 600:] = 0  # the consent flag (a draft flag, deliberately in the top corner)
        ys, xs = np.nonzero(g > 70)
        if len(xs) and (xs.min() < M - 30 or xs.max() > W - M + 30 or ys.min() < SAFE_T - 30):
            viol += 1
    return viol


def flashes(path):
    cap, prev2, prev, n = cv2.VideoCapture(str(path)), None, None, 0
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        y = float(cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY).mean())
        if prev2 is not None and prev - prev2 > 30 and prev - y > 30:
            n += 1
        prev2, prev = prev, y
    return n


def measure_pip():
    F = frames(LAB / "lab_pip_bare.mp4")
    res = []
    for n, s, out, key in PIPS:
        r0 = s + 1
        a = PTS[key][r0]
        x, y, w, h = pip_box(a)
        box = np.zeros((H, W), bool)
        box[y:y + h, x:x + w] = True
        ring = np.zeros((H, W), np.uint8)
        cv2.circle(ring, (int(a[0]), int(a[1])), 34, 1, -1)
        area = box | ring.astype(bool)
        rev = first_change(F, area, s, s + 20, s)  # ref = the cue frame (the pip draws nothing until s + 1); the previous pip has finished its exit by then
        cover = [(F[f][box] > 25).mean() for f in range(r0, r0 + 30)]
        open_f = r0 + int(np.argmax(np.array(cover) >= 0.98 * max(cover)))
        # window width per frame from the bright rim columns on the box's middle row band
        over = 0.0
        for f in range(r0, out):
            band = F[f][y + h // 3:y + 2 * h // 3]
            cols = np.nonzero((band > 25).mean(0) > 0.9)[0]
            if len(cols):
                over = max(over, (cols.max() - cols.min() + 1) - w - 6)  # 3 px rim each side; the breathe moves, it does not widen
        # the corridor between the window edge and the ring
        cx0, cx1 = sorted([int(a[0]) + (40 if x > a[0] else -40), x - 16 if x > a[0] else x + w + 16])  # clear of the drifting rim
        corr = np.zeros((H, W), bool)
        corr[int(a[1]) - 160:int(a[1]) + 60, cx0:cx1] = True
        corr &= ~box
        arrow = land(F, corr, r0 + 8, r0 + 40) if corr.any() else None
        cx, cy = int(PTS[key][r0 + 20][0]), int(PTS[key][r0 + 20][1])
        clear = all(F[f][cy - 3:cy + 4, int(PTS[key][f][0]) - 3:int(PTS[key][f][0]) + 4].mean() < 40 for f in range(r0 + 14, out))
        res.append({"n": n, "cue_f": s, "target_reveal_f": r0, "reveal_f": rev, "reveal_offset_f": None if rev is None else rev - r0,
                    "open_f": open_f, "open_token_end_f": r0 + 14, "open_note": "98 % of the area is open at about 65 % of `arrive` (the curve is 99 % there, MOTION §2)", "overshoot_px": round(float(max(0.0, over)), 1),
                    "arrow_land_f": arrow, "arrow_target_f": r0 + 17, "anchor_clear": bool(clear),
                    "box": [x, y, w, h], "anchor": [round(cx), round(cy)], "gap_box_to_point_px": round(min(abs(x - a[0]), abs(x + w - a[0])), 1)})
    return {"pips": res, "safe_violation_frames": safe(F, 0, len(F)), "frames": len(F)}


def measure_ba():
    F = frames(LAB / "lab_ba_bare.mp4")
    P = frames(LAB / "lab_ba_push.mp4")
    s, cw, ch, y0 = BA["s"], (W - 2 * M - 24) / 2, 700, 430
    cards = [(M, y0, int(cw), ch), (int(M + cw + 24), y0, int(cw), ch)]
    cmask = np.zeros((H, W), bool)
    for (x, y, w, h) in cards:
        cmask[y:y + h, x:x + w] = True
    plate = first_change(F, cmask, s - 4, s + 30, s - 4)
    regs = []
    for rs, key in BA["regions"]:
        # the push alone, on the marks-off pass (lab_ba_push.mp4: no outline, dim or pointer): it ends when the frame-to-frame change
        # falls back to the slow drift's level
        moves = [float(np.abs(P[f].astype(int) - P[f - 1].astype(int))[cmask].mean()) for f in range(rs - 27, rs + 24)]
        # the push is the one contiguous run of moving frames (> 0.5 grey) around the peak; it has landed on the frame after the run.
        # The slow drift encodes as sporadic sub-pixel updates (<= 0.6 grey, isolated frames), which never join the run.
        i = int(np.argmax(moves))
        while i + 1 < len(moves) and moves[i + 1] > 0.5:
            i += 1
        settle = rs - 27 + i + 1
        # the outline: white pixels on the after card's centre column band (the region is centred after the push)
        x, y, w, h = cards[1]
        # the ring where this region's outline lands: the push centres the region on the card at zoom 1.7 (k = card px per image px)
        k = cw / ((BA["crop"][2] / 1.7) * W)
        band = np.zeros((H, W), np.uint8)
        cv2.ellipse(band, (int(x + w / 2), int(y + h / 2)), (int(BA["r"][0] * k), int(BA["r"][1] * k)), 0, 0, 360, 1, 14)
        band = band.astype(bool)
        # new white pixels (not white just before the cue), so the previous outline's exit does not hide this one's start
        was = (F[rs - 2] > 248) & band
        new = [int(((F[f] > 248) & band & ~was).sum()) for f in range(rs - 2, rs + 20)]
        out_f = rs - 2 + next((i for i, v in enumerate(new) if v > 60), -1000)
        corr = np.zeros((H, W), bool)
        ax = int(x + w / 2)
        corr[y + h - 200:y + h + 30, ax - 24:ax + 24] = True
        arrow = land(F, corr, rs + 8, rs + 40, thr=200)
        regs.append({"cue_f": rs, "push_settle_f": settle, "push_target_f": rs + 1, "outline_f": out_f, "outline_target_f": rs + 1, "arrow_land_f": arrow, "arrow_target_f": rs + 18})
    # never static: 1 s grey change inside each card during the holds (after the plate, outside the pushes)
    holds = [(s + 40, 40), (90, 110), (160, 170), (225, 240)]
    mv = []
    for a, b in holds:
        for (x, y, w, h) in cards:
            for f in range(a, b, 4):
                if f + 24 < len(F):
                    mv.append(float(np.abs(F[f + 24][y:y + h, x:x + w].astype(int) - F[f][y:y + h, x:x + w].astype(int)).mean()))
    return {"plate_f": plate, "plate_target_f": s + 1, "regions": regs, "moving_min_grey": round(min(mv), 2), "static_threshold": 0.16, "safe_violation_frames": safe(F, 0, len(F)), "frames": len(F)}


def main():
    res = {"note": "placeholder lab (synthetic face, no patient); frames are composition frames at 24 fps", "pip": measure_pip(), "ba": measure_ba()}
    res["flashes"] = {p.name.split(" -")[0]: flashes(p) for p in LAB.glob("lab_* - NOT FOR POSTING*.mp4")}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(res, indent=1))
    print(json.dumps(res, indent=1))


if __name__ == "__main__":
    main()
