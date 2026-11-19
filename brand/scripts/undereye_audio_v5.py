"""Under-eye reel v5: the dialogue joins, measured (Naim 2026-11-19 "the audio is messed up at this point", 04 The result, f1531).
  joins <props.json> <dialogue.wav> <out.json>   every piece join: is a word chopped at the out or the in point (speech energy in the source
                                                  within 120 ms outside the cut), the click (largest sample step at the join), and the level
                                                  step (50 ms RMS, speech p80 of the 1.5 s either side)
  fix   <props.json> <dialogue_in.wav> <dialogue_out.wav> <fixes.json>   replaces each chopped fragment with room tone from the same piece
                                                  (crossfaded 10 ms): the picture, the timing and every other sample are unchanged
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "brand/remotion/public/undereye-filler"
SR = 48000


def load(src, ss=None, t=None, sr=SR, ch=1):
    cmd = ["ffmpeg", "-v", "error"] + (["-ss", str(ss)] if ss is not None else []) + (["-t", str(t)] if t is not None else []) + ["-i", str(src), "-map", "0:a:0", "-ac", str(ch), "-ar", str(sr), "-f", "f32le", "-"]
    x = np.frombuffer(subprocess.run(cmd, capture_output=True).stdout, np.float32)
    return x.reshape(-1, ch) if ch > 1 else x


def db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9) if len(x) else -120.0


def frames50(x):
    n = SR // 20
    return np.array([db(x[i:i + n]) for i in range(0, len(x) - n + 1, n)])


def joins(props, wav, out):
    P = json.load(open(props)); sp = P["speed"]
    D = load(wav)
    rows = []
    ps = P["pieces"]
    for a, b in zip(ps, ps[1:]):
        t = b["at"] / 24; i = int(t * SR)
        # source audio just outside each cut (in source seconds), at the transcoded clip's level
        src_after_out = load(PUB / f"{a['clip']}.mp4", a["to"], 0.12); src_before_in = load(PUB / f"{b['clip']}.mp4", max(0, b["from"] - 0.12), 0.12)
        floor_a = np.percentile(frames50(load(PUB / f"{a['clip']}.mp4", max(0, a["to"] - 3), 3)), 10)
        floor_b = np.percentile(frames50(load(PUB / f"{b['clip']}.mp4", b["from"], 3)), 10)
        # inside the edit: the last 200 ms of the outgoing piece (a chopped word shows as speech here AND speech just after the out point)
        tail = frames50(D[i - int(0.2 * SR):i]); head = frames50(D[i:i + int(0.2 * SR)])
        step = float(np.max(np.abs(np.diff(D[i - 48:i + 48])))) if i + 48 < len(D) else 0.0
        before = np.percentile(frames50(D[max(0, i - int(1.5 * SR)):i]), 80); after = np.percentile(frames50(D[i:i + int(1.5 * SR)]), 80)
        r = {"join": f"{a['id']}->{b['id']}", "frame": b["at"], "t": round(t, 3),
             "out_chop_db_over_floor": round(float(db(src_after_out) - floor_a), 1), "in_chop_db_over_floor": round(float(db(src_before_in) - floor_b), 1),
             "tail_max_db": round(float(tail.max()), 1), "head_max_db": round(float(head.max()), 1), "click_step": round(step, 4),
             "level_step_db": round(float(after - before), 1)}
        r["chopped_out"] = bool(r["out_chop_db_over_floor"] > 12 and r["tail_max_db"] - floor_a > 12)
        r["chopped_in"] = bool(r["in_chop_db_over_floor"] > 12 and r["head_max_db"] - floor_b > 12)
        rows.append(r)
    worst = {"chop": max(rows, key=lambda r: max(r["out_chop_db_over_floor"], r["in_chop_db_over_floor"]))["join"],
             "click": max(rows, key=lambda r: r["click_step"])["join"], "level": max(rows, key=lambda r: abs(r["level_step_db"]))["join"]}
    json.dump({"wav": str(wav), "joins": rows, "worst": worst}, open(out, "w"), indent=1)
    for r in rows:
        print(r)
    print("worst", worst)


def _fragment(e, fl, from_end=True):
    """e: 10 ms levels next to a cut (ordered away from the cut when from_end=False). A fragment = loud material (> floor + 12 dB) between
    the cut and a quiet run (< floor + 8 dB) of >= 100 ms: a piece of a word that is not in the cut. Returns its length in hops, or 0."""
    seq = e[::-1] if from_end else e  # walk away from the cut
    loud = seq > fl + 12; quiet = seq < fl + 8
    k = 0
    while k < len(seq) and not quiet[k:k + 10].all():
        k += 1
    if k >= len(seq) or not loud[:k].any():
        return 0
    return k


def fix(props, src, dst, fixes, edges=str(ROOT / "research/ostad/style/undereye/edges_v5.json")):
    """replace each chopped fragment next to a join (the start of the next word at a piece's out point, or the end of the previous word at
    the next piece's in point) with room tone from the quiet run beside it, 10 ms crossfades; nothing else changes"""
    P = json.load(open(props)); spd = P["speed"]
    EDG = {e["piece"]: e for e in json.load(open(edges))}
    D = load(src, ch=2).copy(); M = D.mean(1)
    n = SR // 100; x = int(0.01 * SR); w = np.linspace(0, 1, x)[:, None]
    done = []

    def patch(f0, f1, tone_src):
        L = f1 - f0
        tone = np.resize(tone_src, (L, 2))
        seg = tone.copy()
        seg[:x] = D[f0:f0 + x] * (1 - w) + tone[:x] * w
        seg[-x:] = tone[-x:] * (1 - w) + D[f1 - x:f1] * w
        D[f0:f1] = seg

    for a, b in zip(P["pieces"], P["pieces"][1:]):
        i1 = int(round(b["at"] / 24 * SR))
        fl_a = np.percentile([db(M[k:k + n]) for k in range(max(0, i1 - 3 * SR), i1, n)], 10)
        fl_b = np.percentile([db(M[k:k + n]) for k in range(i1, min(len(M), i1 + 3 * SR) - n, n)], 10)
        ea = np.array([db(M[k:k + n]) for k in range(i1 - int(0.5 * SR), i1, n)])
        eb = np.array([db(M[k:k + n]) for k in range(i1, i1 + int(0.5 * SR), n)])
        # only where the SOURCE keeps talking across the cut (a word really is cut in two): its level in the 60 ms outside the cut
        sa = load(PUB / f"{a['clip']}.mp4", a["to"], 0.06); sb = load(PUB / f"{b['clip']}.mp4", max(0, b["from"] - 0.06), 0.06)
        # a fragment is only a fragment if it starts AFTER the cut's own last word ends (or ends BEFORE its first word starts), by the
        # whisper times of the source (edges_v5.json): a real last word preceded by a pause is never touched
        ka = _fragment(ea, fl_a, True)
        la = EDG.get(a["id"], {}).get("last_heard_e")
        if ka and not (la is not None and a["to"] - ka * 0.01 * spd >= la - 0.02):
            ka = 0
        if ka:
            f0 = i1 - ka * n
            patch(f0, i1, D[f0 - 10 * n:f0])
            done.append({"join": f"{a['id']}->{b['id']}", "side": "out (start of the next word)", "replaced_s": [round(f0 / SR, 3), round(i1 / SR, 3)], "ms": ka * 10, "floor_db": round(float(fl_a), 1)})
        kb = _fragment(eb, fl_b, False)
        fb = EDG.get(b["id"], {}).get("first_heard_s")
        if kb and not (fb is not None and fb >= b["from"] and b["from"] + kb * 0.01 * spd <= fb - 0.02):
            kb = 0
        if kb:
            f1 = i1 + kb * n
            patch(i1, f1, D[f1:f1 + 10 * n])
            done.append({"join": f"{a['id']}->{b['id']}", "side": "in (end of the previous word)", "replaced_s": [round(i1 / SR, 3), round(f1 / SR, 3)], "ms": kb * 10, "floor_db": round(float(fl_b), 1)})
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s16le", str(dst)], input=D.astype(np.float32).tobytes(), check=True)
    json.dump(done, open(fixes, "w"), indent=1)
    for d in done:
        print(d)


def level(props, src, dst, target=-13.5, cap=3.0):
    """even the piece-to-piece speech level (v4: P14 sat 2.3 dB under P15 and 5.8 dB under P10). Per piece: 80th percentile of the
    50 ms RMS over speech frames (> -40 dB); gain = target - that, capped at +-cap dB; 40 ms linear ramps across each join."""
    P = json.load(open(props))
    D = load(src, ch=2).copy(); M = D.mean(1)
    n = SR // 20
    g = np.ones(len(D), np.float32); rep = []
    for x in P["pieces"]:
        a, b = int(x["at"] / 24 * SR), min(len(D), int((x["at"] + x["dur"]) / 24 * SR))
        seg = M[a:b][: (b - a) // n * n].reshape(-1, n)
        r = 20 * np.log10(np.sqrt((seg ** 2).mean(1)) + 1e-9); r = r[r > -40]
        lv = float(np.percentile(r, 80)); gd = float(np.clip(target - lv, -cap, cap))
        g[a:b] = 10 ** (gd / 20); rep.append({"piece": x["id"], "level_db": round(lv, 1), "gain_db": round(gd, 1)})
    k = int(0.04 * SR)
    g = np.convolve(g, np.ones(k, np.float32) / k, mode="same")
    D = D * g[:, None]
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s16le", str(dst)], input=D.astype(np.float32).tobytes(), check=True)
    for r_ in rep:
        print(r_)
    return rep


if __name__ == "__main__":
    if sys.argv[1] == "joins":
        joins(*sys.argv[2:5])
    elif sys.argv[1] == "level":
        level(*sys.argv[2:5], *map(float, sys.argv[5:7]))
    else:
        fix(*sys.argv[2:7])
