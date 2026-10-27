"""Prove the A/V alignment gate is not vacuous.

A gate that passes everything is worse than no gate, because it reads like
evidence. This builds a log that should pass, confirms it does, then breaks it
one way at a time - each break being a fault that actually happened or could -
and confirms each one is caught.

  python scripts/test_align_gate.py
"""
import copy
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from verify_renders import align_report

FPS = 24
TOTAL = 720


def good_log():
    """Two phrases and a breath, tiling exactly 30s, locked."""
    segs = [
        {"kind": "speech", "frame": 0, "n_frames": 350, "seconds": 350 / FPS,
         "src": "blum", "audio_src": "blum", "unit": 11,
         "video_span": [[10.0, 24.583]], "audio_span": [[10.0, 24.583]],
         "av_offset_frames": 0, "text": "cables under the water"},
        {"kind": "hold", "frame": 350, "n_frames": 20, "seconds": 20 / FPS,
         "src": "blum", "audio_src": None, "unit": 11,
         "video_span": None, "audio_span": None, "av_offset_frames": 0},
        {"kind": "speech", "frame": 370, "n_frames": 350, "seconds": 350 / FPS,
         "src": "houthi-02", "audio_src": "houthi-02", "unit": 42,
         "video_span": [[5.0, 19.583]], "audio_span": [[5.0, 19.583]],
         "av_offset_frames": 0, "text": "the cables were cut"},
    ]
    track = [
        {"frame": 0, "unit": 11, "src": "blum", "dur": 350 / FPS,
         "text": "cables under the water"},
        {"frame": 370, "unit": 42, "src": "houthi-02", "dur": 350 / FPS,
         "text": "the cables were cut"},
    ]
    return {"seed": 1, "phase": 1, "segments": segs, "audio_track": track}


def first_speech(d):
    return next(s for s in d["segments"] if s["kind"] == "speech")


CASES = [
    ("one source's picture over another's voice",
     lambda d: first_speech(d).update(src="swartz")),
    ("picture taken from a different span",
     lambda d: first_speech(d).update(video_span=[[0.0, 1.0]])),
    ("picture two frames off the voice",
     lambda d: first_speech(d).update(av_offset_frames=2)),
    ("a hole in the tiling",
     lambda d: first_speech(d).update(n_frames=345)),
    # kept consistent on purpose: the tiling still sums to 720 and the two
    # builders still agree, so only the floor rule can be what catches it
    ("a segment under the 1.5s floor",
     lambda d: (d["segments"][2].update(frame=370, n_frames=30,
                                        seconds=30 / FPS),
                d["segments"].append({
                    "kind": "speech", "frame": 400, "n_frames": 320,
                    "seconds": 320 / FPS, "src": "blum", "audio_src": "blum",
                    "unit": 55, "video_span": [[40.0, 53.333]],
                    "audio_span": [[40.0, 53.333]], "av_offset_frames": 0,
                    "text": "and back to the first speaker"}),
                d["audio_track"][1].update(dur=30 / FPS),
                d["audio_track"].append({
                    "frame": 400, "unit": 55, "src": "blum",
                    "dur": 320 / FPS,
                    "text": "and back to the first speaker"}))),
    ("a breath that cuts to another source",
     lambda d: d["segments"][1].update(src="swartz")),
    ("the two builders disagreeing",
     lambda d: d["audio_track"][0].update(unit=999999)),
    ("no per-segment provenance at all",
     lambda d: d.pop("segments")),
]


def main():
    base = good_log()
    ok, detail, stats = align_report(base)
    print(f"{'a locked render':<42} {'LOCKED' if ok else 'FAIL'}   {detail}")
    if not ok:
        print("the gate rejects a log that should pass - fix the gate first")
        return 1
    print(f"{'':42} {json.dumps(stats)}\n")

    bad = 0
    for label, mutate in CASES:
        d = copy.deepcopy(base)
        mutate(d)
        ok, detail, _ = align_report(d)
        print(f"{label:<42} {'caught' if not ok else 'MISSED':<8} "
              f"{detail[:60]}")
        bad += 1 if ok else 0

    print(f"\n{len(CASES) - bad}/{len(CASES)} faults caught")
    if bad:
        print("a fault the gate does not catch is a fault that can ship")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
