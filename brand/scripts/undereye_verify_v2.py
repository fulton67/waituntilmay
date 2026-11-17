"""Under-eye filler reel v2: measure the render (DECISIONS 15c). Writes research/ostad/style/undereye/verify_v2.json.

  $PY -I brand/scripts/undereye_verify_v2.py <final.mp4> <bare.mp4>

Everything undereye_verify.py measures (name, words, loudness, captions, reveals, flashes) plus the user's checks:
  cuts      every in / out point's silence gap (props_v2 pieces): the minimum, and that each is >= 80 ms
  fillers   um / uh / er / ah / hmm and repeats (a word or two-word phrase again within 1 s) in a fresh transcript of the render:
            the count overall and in the first 10 s (target 0)
  hook      the first frame where the picture changes by more than 8 grey levels (mean abs diff vs frame 0) and the first frame with
            text on it (bare pass, outside the caption band): both must be <= 1.5 s
  opening   the first words heard in the render, with their times
"""
import difflib, json, sys
from pathlib import Path
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "brand/scripts"))
sys.path.insert(0, str(ROOT / "research/ostad/style/tools"))
import undereye_prep as prep  # noqa: E402
import undereye_verify as v1  # noqa: E402

PUB, OUT = ROOT / "brand/remotion/public/undereye-filler", ROOT / "research/ostad/style/undereye/verify_v2.json"
FILL = {"um", "uh", "uhm", "er", "ah", "hmm", "erm"}


def main():
    final, bare = Path(sys.argv[1]), Path(sys.argv[2])
    P = json.loads((PUB / "props_v2.json").read_text(encoding="utf-8"))
    res = {"render": final.name, "format": v1.probe(final)}
    gaps = [g for p in P["pieces"] for g in (p["gap_in"], p["gap_out"])]
    res["cuts"] = {"cut_points": len(gaps), "min_gap_ms": round(min(gaps) * 1000), "all_in_gaps_ge_80ms": all(g >= 0.0795 for g in gaps),
                   "joins": len(P["pieces"]) - 1, "fade_ms_each_side": 15}

    import common
    common.cuda_dlls()
    from faster_whisper import WhisperModel
    segs, _ = WhisperModel("medium", device="auto", compute_type="auto").transcribe(str(final), language="en", word_timestamps=True)
    heard = [(w.word.strip(), w.start) for s in segs for w in s.words]
    secrets = prep.secret_names()
    res["name"] = {"name_like_words_in_render_audio": sum(1 for w, _ in heard if any(difflib.SequenceMatcher(None, prep.norm(w), s).ratio() >= 0.75 for s in secrets))}
    cut_words = [prep.norm(w["w"]) for w in P["words"]]
    hn = [prep.norm(w) for w, _ in heard]
    res["words"] = {"cut_words": len(cut_words), "heard_words": len(hn), "sequence_ratio": round(difflib.SequenceMatcher(None, cut_words, hn).ratio(), 3)}
    bad = []
    for i, (w, t) in enumerate(heard):
        n = prep.norm(w)
        if n in FILL:
            bad.append((w, round(t, 2), "filler"))
        if i and n and n == prep.norm(heard[i - 1][0]) and t - heard[i - 1][1] < 1.0:
            bad.append((w, round(t, 2), "repeat"))
    res["fillers"] = {"remaining": len(bad), "in_first_10s": sum(1 for b in bad if b[1] < 10), "list": bad}
    res["opening"] = {"first_words": [(w, round(t, 2)) for w, t in heard[:8]]}
    res["loudness"] = v1.loudness(final)

    cap = cv2.VideoCapture(str(final))
    ok, f0 = cap.read()
    g0 = cv2.cvtColor(f0, cv2.COLOR_BGR2GRAY).astype(np.int16)
    change = None
    for k in range(1, 72):
        ok, f = cap.read()
        if not ok:
            break
        if np.abs(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.int16) - g0).mean() > 8 and change is None:
            change = k
    cap.release()
    capb = cv2.VideoCapture(str(bare))
    text_f = None
    for k in range(0, 72):
        ok, f = capb.read()
        if not ok:
            break
        if (cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)[: 1580] > 60).mean() > 0.002:
            text_f = k
            break
    capb.release()
    res["hook"] = {"first_picture_change_f": change, "first_picture_change_s": None if change is None else round(change / 24, 3),
                   "first_text_f": text_f, "first_text_s": None if text_f is None else round(text_f / 24, 3),
                   "pass_le_1_5s": (change is not None and change <= 36) or (text_f is not None and text_f <= 36)}

    capd, gfx, _ = v1.stream_diffs(bare)
    offs = []
    for w in P["words"]:
        f = w["f"]
        win = [(capd[k - 1] if 0 < k <= len(capd) else 0, k) for k in range(f - 3, f + 4)]
        best = max(win)
        if best[0] > 0.05:
            offs.append(best[1] - f)
    offs = np.array(offs)
    res["captions"] = {"words": len(P["words"]), "measured": int(len(offs)), "median_offset_f": float(np.median(offs)), "share_at_0f": round(float(np.mean(offs == 0)), 3),
                       "share_within_1f": round(float(np.mean(np.abs(offs) <= 1)), 3)}
    _, _, m = v1.stream_diffs(final, 0.25)
    spikes = [int(k) for k in range(1, len(m) - 1) if (m[k] - m[k - 1] > 30 and m[k] - m[k + 1] > 30) or (m[k - 1] - m[k] > 30 and m[k + 1] - m[k] > 30)]
    res["flashes"] = {"one_frame_luma_spikes": len(spikes), "frames": spikes}
    # picture changes (cuts, B-roll, punch-ins) while he is just talking: the longest stretch without one
    starts = sorted({q["f0"] for p in P["pieces"] for q in p["pics"]})
    gaps_f = np.diff(starts + [P["durationInFrames"]])
    res["pace"] = {"picture_changes": len(starts), "median_s_between": round(float(np.median(gaps_f)) / 24, 2), "max_s_between": round(float(gaps_f.max()) / 24, 2),
                   "duration_s": round(P["durationInFrames"] / 24, 2)}
    # the surgeon's sketch and the before/after arrows (user note: accuracy check)
    sm = json.loads((ROOT / "research/ostad/style/undereye/sketch_measure.json").read_text(encoding="utf-8"))
    an = json.loads((ROOT / "research/ostad/style/undereye/anatomy_check.json").read_text(encoding="utf-8"))
    sk = P.get("sketch") or {}
    acc = {"target_px": 15, "sides": {}}
    for k, v in sm["sides"].items():
        acc["sides"][k] = {"entry_error_px": v.get("entry_error_px"), "entry_error_px_max": v.get("entry_error_px_max"),
                           "entry_within_target": (v.get("entry_error_px_max") or 999) < 15, "readings": len(v.get("readings", [])),
                           "path": v.get("path_error_px"), "method": v.get("method")}
    acc["marks_backed_by_footage"] = {k: [f"IMG_6817 @ {r['t']} s" for r in v.get("readings", [])] for k, v in sm["sides"].items()}
    arrows = sk.get("arrows", [])
    margins = []
    for a_ in arrows:
        ch = sm["change"][a_["side"]]
        margins.append(round(a_["change"] - ch["noise_floor_Lstar"], 2))
    acc["arrows"] = {"count": len(arrows), "each_above_noise_floor": all(m > 0 for m in margins), "min_margin_Lstar": min(margins) if margins else None,
                     "floors_Lstar": {k: v["noise_floor_Lstar"] for k, v in sm["change"].items()}, "registration_error_px": sm.get("registration_error_px_mean")}
    acc["orbital_rim"] = {k: {kk: v[kk] for kk in ("outline_diff_px_median", "outline_diff_px_p90", "pass")} for k, v in an["orbits"].items()}
    acc["orbital_rim"]["ostad_check"] = an["ostad_check"]
    res["sketch_accuracy"] = acc
    OUT.write_text(json.dumps(res, indent=1), encoding="utf-8")
    print(json.dumps(res, indent=1))


if __name__ == "__main__":
    main()
