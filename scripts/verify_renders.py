"""Measured verification of the renders - no screenshots, only numbers.

Checks, per render:
  source seconds   10.0 <= s <= 30.0
  output duration  == 30.0 +/- 1 frame
  |video duration - audio duration| < 1 frame
  frame count      == 720
  speech coverage  >= 70% of runtime
  longest silence  <= 1.5s
  all five beats present, refrain opens and closes
  internet triggers  1 <= n <= 3
  mosh v2          B coverage starts low, never goes backwards, and the
                   composite's own block check agrees with the mask
Exits non-zero if any render fails, so it can gate a re-run.
"""
import argparse
import glob
import json
import os
import subprocess
import sys

FPS = 24
FRAME = 1.0 / FPS
TARGET = 30.0
MAX_SOURCE, MIN_SOURCE = 30.0, 10.0
MIN_SPEECH_PCT = 70.0
MAX_SILENCE_S = 1.5

# The trigger range is read from the same config the renderer obeys, so the
# gate and the pipeline cannot drift apart again - they did, and a third of
# the pool shipped outside the declared range before anyone measured it.
_CFG = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    "config", "triggers.json")
try:
    _TPR = json.load(open(_CFG, encoding="utf-8"))["triggers_per_render"]
    MIN_TRIGGERS, MAX_TRIGGERS = int(_TPR["min"]), int(_TPR["max"])
except Exception:
    MIN_TRIGGERS, MAX_TRIGGERS = 1, 3


def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries",
         "stream=codec_type,duration,nb_frames,width,height",
         "-show_entries", "format=duration", "-of", "json", path],
        check=True, capture_output=True).stdout
    d = json.loads(out)
    v = next(s for s in d["streams"] if s["codec_type"] == "video")
    a = next((s for s in d["streams"] if s["codec_type"] == "audio"), None)

    def f(x):
        try:
            return float(x)
        except (TypeError, ValueError):
            return None
    nb = v.get("nb_frames")
    if not str(nb).isdigit():
        nb = subprocess.run(
            ["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0",
             "-show_entries", "stream=nb_read_frames", "-of", "default=nw=1:nk=1",
             path], check=True, capture_output=True).stdout.strip()
    return {"v": f(v.get("duration")), "a": f(a.get("duration")) if a else None,
            "n": int(nb) if str(nb).isdigit() else None,
            "container": f(d["format"]["duration"]),
            "size_mb": os.path.getsize(path) / 1e6}


def check_render(log, m, drift):
    """Every gate a render must pass, in one place.

    The nightly pool job runs exactly these, so a version that joins the
    rotation unattended has cleared the same bar as the original batch.
    """
    track = log.get("audio_track", [])
    checks = {
        "src10-30": MIN_SOURCE - 1e-6 <= log["total_source_seconds"] <= MAX_SOURCE + 1e-6,
        "dur==30": abs((m["container"] or 0) - TARGET) <= FRAME,
        "drift<1f": drift < FRAME,
        "frames==720": m["n"] == int(TARGET * FPS),
        "speech>=70%": log["speech_pct"] >= MIN_SPEECH_PCT,
        "gap<=1.5s": log["longest_silence_s"] <= MAX_SILENCE_S,
        "5beats": all(b["units"] > 0 for b in log["beats"]),
        "refrain-both": bool(log.get("refrain")) and len(track) >= 2
                        and track[0]["text"] == log["refrain"]
                        and track[-1]["text"] == log["refrain"],
        f"triggers{MIN_TRIGGERS}-{MAX_TRIGGERS}":
            MIN_TRIGGERS <= log["internet_triggers"] <= MAX_TRIGGERS,
    }
    if log.get("mosh_version") == 2:
        per = log.get("b_coverage_per_second") or []
        agree = log.get("b_block_agreement_pct")
        checks.update({
            "B-monotone": bool(log.get("b_coverage_monotone")),
            "B-opens": bool(per) and per[0]["end_pct"] <= 25.0,
            "B-grows": bool(per) and per[-1]["end_pct"] > per[0]["end_pct"],
            "B-blocks==mask": agree is not None and agree >= 99.5,
        })
    return checks


def check_one(mp4, log):
    """Convenience for a single render: probe it and run every gate."""
    m = probe(mp4)
    drift = abs((m["v"] or 0) - (m["a"] or 0))
    return check_render(log, m, drift), m, drift


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="renders")
    ap.add_argument("--no-text", action="store_true")
    args = ap.parse_args()

    logs = sorted(glob.glob(os.path.join(args.dir, "v_*.json")))
    if not logs:
        print("no renders found")
        return 1

    rows, failures = [], []
    for lp in logs:
        log = json.load(open(lp, encoding="utf-8"))
        mp4 = os.path.join(args.dir, log["output"])
        if not os.path.exists(mp4):
            failures.append((log["seed"], "missing mp4"))
            continue
        m = probe(mp4)
        drift = abs((m["v"] or 0) - (m["a"] or 0))
        checks = check_render(log, m, drift)
        if not all(checks.values()):
            failures.append((log["seed"],
                             ",".join(k for k, ok in checks.items() if not ok)))
        rows.append((log, m, drift, checks))

    rows.sort(key=lambda r: (r[0]["phase"], r[0]["seed"]))

    hdr = (f"{'seed':>10} {'ph':>2} {'units':>5} {'per-beat':>11} {'src s':>6} "
           f"{'speech%':>7} {'gap s':>6} {'cuts':>5} {'out s':>7} {'drift f':>7} "
           f"{'frames':>6} {'trig':>4} {'mosh':>5} {'B%':>6} {'MB':>5}  ok")
    print("=" * len(hdr))
    print("RENDER VERIFICATION  (5-beat arc, L-cut audio)")
    print("=" * len(hdr))
    print(hdr)
    print("-" * len(hdr))
    for log, m, drift, checks in rows:
        ok = "PASS" if all(checks.values()) else "FAIL:" + ",".join(
            k for k, v in checks.items() if not v)
        per = "/".join(str(x) for x in log["units_per_beat"])
        print(f"{log['seed']:>10} {log['phase']:>2} {log['units_total']:>5} "
              f"{per:>11} {log['total_source_seconds']:>6.2f} "
              f"{log['speech_pct']:>7.1f} {log['longest_silence_s']:>6.2f} "
              f"{log['picture_cuts']:>5} {m['container']:>7.3f} "
              f"{drift/FRAME:>7.3f} {m['n']:>6} {log['internet_triggers']:>4} "
              f"{log['moshed_frames']:>5} "
              f"{log.get('b_coverage_final_pct', float('nan')):>6.1f} "
              f"{m['size_mb']:>5.1f}  {ok}")

    print(f"\nLIMITS: source {MIN_SOURCE:.0f}-{MAX_SOURCE:.0f}s | output 30.000s "
          f"+/-1 frame | drift <1 frame | 720 frames | speech >={MIN_SPEECH_PCT:.0f}% "
          f"| longest silence <={MAX_SILENCE_S}s | 5 beats | refrain opens+closes "
          f"| {MIN_TRIGGERS}-{MAX_TRIGGERS} triggers "
          f"| B monotone, opens low, grows, blocks==mask")

    # ---- B coverage per second, one row per render
    v2 = [r for r in rows if r[0].get("mosh_version") == 2]
    if v2:
        print("\n" + "=" * 118)
        print("B COVERAGE PER SECOND  (% of macroblocks showing the "
              "mv-transfer layer, at the end of each second)")
        print("=" * 118)
        print(f"{'seed':>10} {'ph':>2}  "
              + " ".join(f"{s:>2}" for s in range(30)) + f"  {'final':>5}")
        print("-" * 118)
        for log, m, drift, checks in v2:
            per = log.get("b_coverage_per_second") or []
            cells = " ".join(f"{int(round(x['end_pct'])):>2}" for x in per[:30])
            print(f"{log['seed']:>10} {log['phase']:>2}  {cells}  "
                  f"{log.get('b_coverage_final_pct', 0):>5.1f}")
        opened = {}
        for log, *_ in v2:
            for k, cnt in (log.get("b_opened_by") or {}).items():
                opened[k] = opened.get(k, 0) + cnt
        tot = max(sum(opened.values()), 1)
        print("\nblocks opened by: " + "  ".join(
            f"{k} {cnt} ({cnt / tot * 100:.0f}%)" for k, cnt in opened.items()))
        det = {}
        for log, *_ in v2:
            det[log.get("b_detector")] = det.get(log.get("b_detector"), 0) + 1
        print("detector chosen:  "
              + "  ".join(f"{k} x{cnt}" for k, cnt in det.items()))
        agr = [log.get("b_block_agreement_pct") for log, *_ in v2
               if log.get("b_block_agreement_pct") is not None]
        if agr:
            print(f"composite block agreement: min {min(agr):.2f}%  "
                  f"mean {sum(agr) / len(agr):.2f}%  over {len(agr)} renders")

    n = len(rows)
    print(f"\n{n - len(failures)}/{n} renders pass all checks")
    if failures:
        print("\nFAILURES:")
        for s, why in failures:
            print(f"  seed {s}: {why}")

    if not args.no_text:
        print("\n" + "=" * len(hdr))
        print("AUDIO TRACK PER VERSION  (the continuous voice line, in order)")
        print("=" * len(hdr))
        for log, m, drift, checks in rows:
            print(f"\n--- seed {log['seed']}  phase {log['phase']}  "
                  f"speech {log['speech_pct']}%  longest gap "
                  f"{log['longest_silence_s']}s  "
                  f"source {log['total_source_seconds']:.2f}s ---")
            print(f"  refrain: \"{log['refrain']}\"")
            for b in log["beats"]:
                print(f"  [{b['beat']:<11}] {b['units']} units  {b['seconds']:>5.2f}s")
                for t in b["text"]:
                    print(f"       \"{t}\"")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
