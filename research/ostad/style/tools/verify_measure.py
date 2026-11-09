"""Step-1 gate: for every video, every applicable M1-M20 output exists, is non-empty and covers every frame (frame count of the
output = ffprobe -count_frames); for every still, M21 exists. Prints a video x tool table (check / cross + coverage) and writes
MEASURE_COVERAGE.md with the calibration table. Exit code 1 if anything is missing (step 2 is blocked).

Coverage rules per output: rows-per-frame outputs (frames, cuts, camera_pc, camera_ecc, camera, image_stats, tone_hue,
text_elements, graphic_elements, mockups) need len(rows) == frame_count; sheets.json needs frames_covered == frame_count and
count == expected; palette.json needs its 15-frame buckets to span every frame; element / audio outputs (easing, cards,
audio_meta, transcript, pacing, loudness, sfx, script) need to exist and parse (audio ones are 'n/a' for silent videos)."""
import math
import os
import sys

from common import MEASURE, STYLE, corpus, load_json, out_path

PER_FRAME = {"M1": "frames.json", "M3": "cuts.json", "M4": "camera_pc.json", "M5": "camera_ecc.json", "M6": "camera.json",
             "M7": "image_stats.json", "M8": "tone_hue.json", "M10": "text_elements.json", "M11": "graphic_elements.json", "M14": "mockups.json"}
OTHER = {"M12": "easing.json", "M13": "cards.json"}
AUDIO = {"M15": "audio_meta.json", "M16": "transcript.json", "M17": "pacing.json", "M18": "loudness.json", "M19": "sfx.json", "M20": "script.json"}
ORDER = ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12", "M13", "M14", "M15", "M16", "M17", "M18", "M19", "M20"]


def check_video(ref, vid):
    probe = load_json(out_path(ref, vid, "probe.json"))
    n = probe["frame_count"] if probe else None
    res = {}
    meta = load_json(out_path(ref, vid, "audio_meta.json"))
    silent = meta is not None and not meta.get("has_audio")
    for m in ORDER:
        if m in PER_FRAME:
            d = load_json(out_path(ref, vid, PER_FRAME[m]))
            res[m] = ("x", "missing") if d is None else (("ok", f"{len(d['rows'])}/{n}") if n and len(d.get("rows", [])) == n else ("x", f"{len(d.get('rows', []))}/{n}"))
        elif m == "M2":
            d = load_json(out_path(ref, vid, "sheets.json"))
            ok = d is not None and n and d["frames_covered"] == n and d["count"] == d["expected"]
            res[m] = ("ok" if ok else "x", f"{d['count']} sheets" if d else "missing")
        elif m == "M9":
            d = load_json(out_path(ref, vid, "palette.json"))
            ok = d is not None and n and len(d["rows"]) == math.ceil(n / d["step"])
            res[m] = ("ok" if ok else "x", f"{len(d['rows'])}x15f" if d else "missing")
        elif m in OTHER:
            d = load_json(out_path(ref, vid, OTHER[m]))
            res[m] = ("ok", "ok") if d is not None else ("x", "missing")
        elif m in AUDIO:
            if silent and m != "M15":
                res[m] = ("ok", "n/a silent")
                continue
            d = load_json(out_path(ref, vid, AUDIO[m]))
            res[m] = ("ok", "ok") if d is not None else ("x", "missing")
    return n, res


def main():
    vids = corpus("video")
    stills = corpus("still")
    lines, bad = [], 0
    hdr = "| ref / video | frames | " + " | ".join(ORDER) + " |"
    lines += [hdr, "|" + "---|" * (len(ORDER) + 2)]
    for ref, vid, _ in vids:
        n, res = check_video(ref, vid)
        bad += sum(v[0] != "ok" for v in res.values())
        lines.append(f"| {ref}/{vid} | {n} | " + " | ".join(("✓ " if res[m][0] == "ok" else "✗ ") + res[m][1] for m in ORDER) + " |")
    st_ok = sum(load_json(out_path(r, v, "still.json")) is not None for r, v, _ in stills)
    bad += len(stills) - st_ok
    cal = load_json(os.path.join(MEASURE, "_calibration", "calibration.json"), {})
    out = ["# Measurement coverage", "",
           f"Videos: {len(vids)}; stills: {len(stills)} (M21 done: {st_ok}). Cells: ✓/✗ and frames covered / frame count (ffprobe -count_frames).",
           f"**Status: {'ALL ✓' if bad == 0 else f'{bad} ✗ (step 2 blocked)'}**", "", "## Calibration (synthetic clips, calibrate.py)", "",
           "| check | measured | known | error | ok |", "|---|---|---|---|---|"]
    for c in cal.get("checks", []):
        out.append(f"| {c['check']} | {c['measured']} | {c['known']} | {c['err']} | {'✓' if c['ok'] else '✗'} |")
    out += ["", f"Calibration: {'ALL ✓' if cal.get('all_ok') else '✗'}", "", "## Videos × tools", ""] + lines
    open(os.path.join(STYLE, "MEASURE_COVERAGE.md"), "w", encoding="utf8").write("\n".join(out) + "\n")
    print(f"videos {len(vids)} stills {len(stills)} missing/failed cells {bad} calibration {'ok' if cal.get('all_ok') else 'FAIL'}")
    sys.exit(0 if bad == 0 and cal.get("all_ok") else 1)


if __name__ == "__main__":
    main()
