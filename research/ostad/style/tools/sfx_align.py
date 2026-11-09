"""M19: sound effects vs graphics. Onsets (librosa onset_detect, backtracked, on the non-voice stem from M18) are the candidate
SFX hits; every element entry (M10 text with >= 0.2 s life, M11 graphics with a mid-shot entry, M14 mockups) is matched to the
nearest onset within +-0.5 s. Output per entry: frame, nearest onset frame, offset in frames (onset - entry; negative = sound
leads), onset strength; summary: share of entries with a hit within +-3 frames, median offset."""
import os

import librosa
import numpy as np

from common import STYLE, load_json, out_path, run


def m19(ref, vid, path, P):
    nv = os.path.join(STYLE, "stems", ref, vid, "no_vocals.wav")
    ld = load_json(out_path(ref, vid, "loudness.json"))
    if ld is None:
        raise RuntimeError("needs loudness.json (M18)")
    if not ld.get("has_audio"):
        return {"has_audio": False}
    y, sr = librosa.load(nv, sr=22050, mono=True)
    env = librosa.onset.onset_strength(y=y, sr=sr)
    on = librosa.onset.onset_detect(onset_envelope=env, sr=sr, backtrack=True, units="frames")
    on_t = librosa.frames_to_time(on, sr=sr)
    strength = env[on] if len(on) else np.array([])
    fps = P["fps"]
    entries = []
    te = load_json(out_path(ref, vid, "text_elements.json"), {"elements": []})
    for e in te["elements"]:
        if (e["exit"] - e["entry"]) / fps >= 0.2:
            entries.append(("text", e["id"], e["entry"]))
    ge = load_json(out_path(ref, vid, "graphic_elements.json"), {"elements": []})
    for e in ge["elements"]:
        if e.get("mid_shot_entry"):
            entries.append(("graphic", e["id"], e["entry"]))
    mk = load_json(out_path(ref, vid, "mockups.json"), {"elements": []})
    for e in mk["elements"]:
        entries.append(("mockup", e["id"], e["entry"]))
    out = []
    for kind, eid, fr in sorted(entries, key=lambda x: x[2]):
        t = fr / fps
        if len(on_t):
            j = int(np.argmin(np.abs(on_t - t)))
            off = (on_t[j] - t) * fps
            hit = abs(on_t[j] - t) <= 0.5
            out.append({"kind": kind, "id": eid, "entry_frame": fr, "onset_frame": round(on_t[j] * fps, 1) if hit else None,
                        "offset_frames": round(off, 1) if hit else None, "strength": round(float(strength[j]), 3) if hit else None})
        else:
            out.append({"kind": kind, "id": eid, "entry_frame": fr, "onset_frame": None, "offset_frames": None, "strength": None})
    offs = [o["offset_frames"] for o in out if o["offset_frames"] is not None]
    return {"has_audio": True, "onsets_s": np.round(on_t, 3), "entries": out,
            "share_hit_within_3_frames": round(sum(abs(x) <= 3 for x in offs) / len(out), 3) if out else None,
            "median_offset_frames": round(float(np.median(offs)), 2) if offs else None}


if __name__ == "__main__":
    run("sfx.json", m19)
