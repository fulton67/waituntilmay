"""Jan 08 reel: measured silences in his voice (LESSONS L7). 10 ms RMS envelope of the source audio; silence = below the noise
floor (10th percentile) + 8 dB; a gap is >= 80 ms of silence. Writes EDIT/gaps.json and prints every gap with the words around it,
so each cut in research/ostad/style/jan08/cut.json is placed mid-gap. `check` re-measures the cut list: each cut's gap and the
energy at the cut point.
  python -I brand/scripts/jan08_gaps.py [list|check]
"""
import json, sys, wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
EDIT = ROOT / "brand/edits/jan08-filler-fatigue"
CUT = ROOT / "research/ostad/style/jan08/cut.json"
HOP = 0.010


def envelope():
    with wave.open(str(EDIT / "talk48.wav")) as f:
        x = np.frombuffer(f.readframes(f.getnframes()), np.int16).astype(np.float32) / 32768
        sr = f.getframerate()
    n = int(HOP * sr)
    fr = x[: len(x) // n * n].reshape(-1, n)
    db = 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-9)
    floor = float(np.percentile(db, 10))
    return db, floor


def gaps(db, floor, min_s=0.08):
    sil = db < floor + 8
    out, i = [], 0
    while i < len(sil):
        if sil[i]:
            j = i
            while j < len(sil) and sil[j]:
                j += 1
            if (j - i) * HOP >= min_s:
                out.append([round(i * HOP, 3), round(j * HOP, 3)])
            i = j
        else:
            i += 1
    return out


def main():
    db, floor = envelope()
    G = gaps(db, floor)
    (EDIT / "gaps.json").write_text(json.dumps({"floor_db": floor, "thresh_db": floor + 8, "gaps": G}))
    W = json.loads((EDIT / "words_talk.json").read_text())
    if len(sys.argv) > 1 and sys.argv[1] == "check":
        cut = json.loads(CUT.read_text(encoding="utf-8"))
        rows = []
        for p in cut["pieces"]:
            for edge in ("from", "to"):
                t = p[edge]
                GG = gaps(db, floor + p["gap_thr_db"] - 8) if (edge == "from" and "gap_thr_db" in p) else G  # a logged exception: a breath pause
                g = next((g for g in GG if g[0] - 1e-6 <= t <= g[1] + 1e-6), None)
                k = int(t / HOP)
                rows.append({"piece": p["id"], "edge": edge, "t": t, "gap_s": round(g[1] - g[0], 3) if g else 0.0,
                             "energy_db_above_floor": round(float(db[max(0, k - 1): k + 2].max() - floor), 1), "ok": bool(g),
                             "thr_db_above_floor": p.get("gap_thr_db", 8) if edge == "from" else 8})
        bad = [r for r in rows if not r["ok"]]
        res = {"floor_db": round(floor, 1), "min_gap_s": min(r["gap_s"] for r in rows), "fails": bad, "exceptions": [r for r in rows if r["thr_db_above_floor"] != 8], "edges": rows}
        (ROOT / "research/ostad/style/jan08/cut_gaps.json").write_text(json.dumps(res, indent=1))
        print(json.dumps({k: v for k, v in res.items() if k != "edges"}, indent=1))
        return rows
    print(f"floor {floor:.1f} dB, {len(G)} gaps >= 80 ms")
    for a, b in G:
        before = [w["w"] for w in W if w["t1"] <= a + 0.15][-4:]
        after = [w["w"] for w in W if w["t0"] >= b - 0.15][:4]
        print(f"{a:7.2f}-{b:7.2f} ({(b - a) * 1000:4.0f} ms)  ...{' '.join(before)} | {' '.join(after)}...")


if __name__ == "__main__":
    main()
