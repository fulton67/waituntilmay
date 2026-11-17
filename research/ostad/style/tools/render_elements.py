"""render_elements.py: run the corpus element trackers (M10 ocr_track, M11 graphic_track) on one of OUR renders, so its entries and
exits can be fitted (easing_fit.element_fits) and classified (device_stats.classify) exactly like measure/_devices/entry_stats.json.

The trackers are the corpus ones, unchanged; only the inputs are adapted:
  - detection width: the corpus ran M11 at 270 px on 1080-wide portrait; we keep the same short side (270), so a 1920x1080
    landscape render is read 480 px wide.
  - hard cuts: ffmpeg scdet (threshold 8, the flash scan of V6_SYSTEM §5), frame = round(t * fps).
Output (raw, large, keep outside the repo): <out>/<name>/{probe,cuts,graphic_elements,text_elements}.json

Run: C:/Users/naimj/tools/style-venv/Scripts/python.exe -I tools/render_elements.py <render.mp4> <name> <outdir> [--no-ocr]
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import common  # noqa: E402
import graphic_track  # noqa: E402


def probe(path):
    r = json.loads(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
                                   "stream=width,height,r_frame_rate,nb_read_frames", "-of", "json", path],
                                  capture_output=True, text=True).stdout)["streams"][0]
    num, den = map(int, r["r_frame_rate"].split("/"))
    return {"path": path, "width": r["width"], "height": r["height"], "fps": num / den, "frame_count": int(r["nb_read_frames"])}


def scdet(path, fps, work):
    # relative filenames: an absolute Windows path breaks the filter's option parser
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-vf", "scdet=threshold=8,metadata=print:key=lavfi.scd.time:file=cuts.txt",
                    "-f", "null", "-"], cwd=work, check=True)
    out = []
    for ln in open(os.path.join(work, "cuts.txt"), encoding="utf-8"):
        if "lavfi.scd.time=" in ln:
            out.append(int(round(float(ln.split("=")[1]) * fps)))
    return sorted(set(out))


def main():
    path, name, outdir = sys.argv[1], sys.argv[2], sys.argv[3]
    work = os.path.join(outdir, name)
    os.makedirs(work, exist_ok=True)
    P = probe(path)
    json.dump(P, open(os.path.join(work, "probe.json"), "w"), indent=1)
    cuts = scdet(path, P["fps"], work)
    json.dump(cuts, open(os.path.join(work, "cuts.json"), "w"))
    print("cuts", len(cuts), cuts, flush=True)
    short = min(P["width"], P["height"])
    W = int(round(P["width"] * 270 / short))
    graphic_track.ANALYSIS_W = W
    graphic_track.frames = lambda p: common.frames(p, width=W)
    graphic_track.cuts_frames = lambda ref, vid: cuts
    g = graphic_track.m11(name, name, path, P)
    json.dump(g, open(os.path.join(work, "graphic_elements.json"), "w"))
    print("graphic elements", len(g["elements"]), flush=True)
    if "--no-ocr" not in sys.argv:
        import ocr_track
        t = ocr_track.m10(name, name, path, P)
        json.dump(t, open(os.path.join(work, "text_elements.json"), "w"))
        print("text elements", len(t["elements"]), flush=True)


if __name__ == "__main__":
    main()
