"""Oct 14 freeze proof (coordinator 2026-11-19, after the under-eye v5 key-layer freeze): the footage in the render must keep moving.

  $PY -I research/ostad/style/oct14/freeze_check.py <render.mp4> <out.json> [--fix]   (--fix = apply ReelV6b's PIECE_FIX)

For every footage piece (stills and takeover rooms excluded), every 2nd render frame is matched against the source frames
expected +- 10 (the punch-in applied, 120x214 grey, y < 1450 so captions do not weigh in). The best match must keep advancing:
a run of >= 6 samples (12 frames) with the same matched source frame while the expected frame moved >= 12 is a FREEZE.
"""
import json, sys
from pathlib import Path
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parents[4]
PUB = ROOT / "brand/remotion/public/oct14"
P = json.loads((PUB / "props.json").read_text(encoding="utf-8"))
LAY = json.loads((PUB / "layout_v5.json").read_text(encoding="utf-8"))
STILLS = json.loads((PUB / "stills_v5.json").read_text(encoding="utf-8"))
FIX = {"intro-deflation/b/b": {"pictureRole": "pre1", "pictureFrom": 5.975}}  # = ReelV6b.tsx PIECE_FIX
W, H, SW, SH, YMAX = 1080, 1920, 120, 214, 1450
ROOMS = [(v["s"], v["e"]) for v in LAY.values() if isinstance(v, dict) and v.get("mode") == "takeover"]
# still-image spans (no video on screen): the Hook (before/after jpgs, f0 .. out+8 = 46) and the SurgeonPlan (cue ba .. end, scaled jpgs)
ROOMS += [(0, 47), (P["cues"][P["surgeon"]["cue"]] + 1, 10 ** 6)]


def small(img, punch=1.0, o=(0.4, 0.42)):
    if punch != 1:
        ox, oy = o[0] * W, o[1] * H
        img = cv2.warpAffine(img, np.float32([[punch, 0, ox * (1 - punch)], [0, punch, oy * (1 - punch)]]), (W, H))
    g = cv2.cvtColor(img[:YMAX], cv2.COLOR_BGR2GRAY)
    return cv2.resize(g, (SW, int(SH * YMAX / H)), interpolation=cv2.INTER_AREA).astype(np.float32)


def main():
    src, out = sys.argv[1], Path(sys.argv[2])
    pieces = [dict(p, **FIX[p["id"]]) if "--fix" in sys.argv and p["id"] in FIX else p for p in P["pieces"]]
    still_pieces = {v["piece"] for v in STILLS.values()} if isinstance(STILLS, dict) else set()
    sp = P["speed"]
    samples = []  # (render f, piece, expected src idx)
    for p in pieces:
        if p["id"] in still_pieces:
            continue
        t0 = round(p["pictureFrom"] * 24)
        for f in range(p["at"], p["at"] + p["dur"], 2):
            if any(a <= f < b for a, b in ROOMS):
                continue
            samples.append((f, p, int(np.floor(t0 + (f - p["at"]) * sp + 1e-6))))
    # render frames
    want = {f for f, _, _ in samples}
    R = {}
    cap = cv2.VideoCapture(src)
    i = -1
    while True:
        ok = cap.grab(); i += 1
        if not ok or i > max(want):
            break
        if i in want:
            _, fr = cap.retrieve(); R[i] = small(fr)
    # source frames per role
    need = {}  # role -> {src idx -> [pieces that need it]}
    for f, p, e in samples:
        for k in range(max(0, e - 10), e + 11):
            need.setdefault(p["pictureRole"], {}).setdefault(k, set()).add(p["id"])
    PB = {p["id"]: p for p in pieces}
    S, LAST = {}, {}
    for role, idxs in need.items():
        c = cv2.VideoCapture(str(PUB / f"{role}.mp4")); j = -1; top = max(idxs)
        while j < top:
            ok = c.grab(); j += 1
            if not ok:
                break
            LAST[role] = j
            if j in idxs:
                _, fr = c.retrieve()
                for pid in idxs[j]:
                    q = PB[pid]; S[(pid, j)] = small(fr, q.get("punch") or 1, q.get("punchO") or (0.4, 0.42))
    rows = []
    for f, p, e in samples:
        if f not in R:
            continue
        best = None
        for k in range(max(0, e - 10), e + 11):
            fr = S.get((p["id"], k))
            if fr is None:
                continue
            d = float(np.abs(R[f] - fr).mean())
            if best is None or d < best[1]:
                best = (k, d)
        last = LAST.get(p["pictureRole"])
        rows.append({"f": f, "piece": p["id"], "role": p["pictureRole"], "expected": e, "matched": best[0] if best else None,
                     "diff": round(best[1], 2) if best else None, "src_last": last})
    # freeze runs: same matched frame on >= 6 consecutive samples of one piece while the expectation moved >= 12
    freezes, run = [], [rows[0]] if rows else []
    for r in rows[1:]:
        if r["piece"] == run[-1]["piece"] and r["matched"] == run[-1]["matched"]:
            run.append(r)
        else:
            if len(run) >= 6 and run[-1]["expected"] - run[0]["expected"] >= 12:
                freezes.append({"piece": run[0]["piece"], "frames": [run[0]["f"], run[-1]["f"]], "held_src_frame": run[0]["matched"]})
            run = [r]
    if len(run) >= 6 and run[-1]["expected"] - run[0]["expected"] >= 12:
        freezes.append({"piece": run[0]["piece"], "frames": [run[0]["f"], run[-1]["f"]], "held_src_frame": run[0]["matched"]})
    lag = [abs(r["matched"] - r["expected"]) for r in rows if r["matched"] is not None]
    res = {"render": src, "fix": "--fix" in sys.argv, "samples": len(rows), "freezes": freezes,
           "match_offset_median": float(np.median(lag)) if lag else None, "match_offset_p95": float(np.percentile(lag, 95)) if lag else None,
           "pass": not freezes, "rows": rows}
    out.write_text(json.dumps(res, indent=1))
    print(json.dumps({k: v for k, v in res.items() if k != "rows"}))


if __name__ == "__main__":
    main()
