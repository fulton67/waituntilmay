"""M3: cuts by PySceneDetect ContentDetector AND ffmpeg scdet, both run and reconciled (match within +-2 frames).
Each hard cut lists which detector(s) found it. Dissolves: runs of >= 4 frames whose ContentDetector score stays above 2.5x the
video's median score but under the cut threshold, not touching a hard cut. rows = per-frame ContentDetector score."""
import re
import subprocess

import numpy as np
from scenedetect import SceneManager, StatsManager, open_video
from scenedetect.detectors import ContentDetector

from common import run

TH_PSD, TH_SCDET = 27.0, 10.0


def m3(ref, vid, path, P):
    v = open_video(path)
    sm = StatsManager()
    mgr = SceneManager(sm)
    mgr.add_detector(ContentDetector(threshold=TH_PSD, min_scene_len=4))
    mgr.detect_scenes(v)
    psd = [s[0].get_frames() for s in mgr.get_scene_list()][1:]
    n = P["frame_count"]
    score = np.zeros(n)
    for i in range(n):
        try:
            m = sm.get_metrics(i, ["content_val"])[0]
            score[i] = m if m is not None else 0
        except Exception:
            pass
    err = subprocess.run(["ffmpeg", "-v", "info", "-i", path, "-map", "0:v:0", "-vf", f"scdet=threshold={TH_SCDET}", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    fps = P["fps"]
    sc = sorted({int(round(float(t) * fps)) for t in re.findall(r"lavfi\.scd\.time:\s*([\d.]+)", err)})
    hard = []
    for f in sorted(set(psd) | set(sc)):
        by = set()
        if any(abs(f - p) <= 2 for p in psd):
            by.add("pyscenedetect")
        if any(abs(f - s) <= 2 for s in sc):
            by.add("scdet")
        if hard and f - hard[-1]["frame"] <= 2:
            hard[-1]["by"] = sorted(set(hard[-1]["by"]) | by)
            continue
        hard.append({"frame": f, "by": sorted(by)})
    pos = score[score > 0]
    med = float(np.median(pos)) if len(pos) else 0.0
    dis, cur = [], []
    hf = [h["frame"] for h in hard]
    for i in range(n + 1):
        if i < n and med and 2.5 * med < score[i] < TH_PSD:
            cur.append(i)
            continue
        if len(cur) >= 4 and not any(cur[0] - 2 <= h <= cur[-1] + 2 for h in hf):
            dis.append({"start": cur[0], "end": cur[-1], "by": ["pyscenedetect-stats"]})
        cur = []
    return {"thresholds": {"pyscenedetect": TH_PSD, "scdet": TH_SCDET}, "pyscenedetect": psd, "scdet": sc, "hard": hard,
            "dissolves": dis, "content_val_median": med, "rows": np.round(score, 2)}


if __name__ == "__main__":
    run("cuts.json", m3)
