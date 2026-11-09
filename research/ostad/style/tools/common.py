"""Shared helpers for the style-study measurement tools (M1-M21).

Corpus: every reference video/still under research/ostad/style/media, mapped to its ref id (refs.yaml):
  media/ig/<owner>/<sc>.mp4 -> ref from raw/ig_index.json + raw/ig_posts.json inputUrl (collabs belong to the account scraped),
  the three named posts -> ig_<shortcode>; media/yt/glp1.mp4 -> glp1; media/yt/ro/<id>.mp4 -> ro; media/arena/* -> arena.
Outputs: measure/<ref>/<video>/<name>.json. Every per-frame output carries one row per decoded frame.
Frames are decoded with ffmpeg at native frame rate, every frame (-fps_mode passthrough, no -r, no select), scaled down for
analysis only (ANALYSIS_W wide); frame index = source frame index.
"""
from __future__ import annotations
import json, math, os, subprocess, sys
from functools import lru_cache
import numpy as np

STYLE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA, MEASURE = os.path.join(STYLE, "media"), os.path.join(STYLE, "measure")
ANALYSIS_W = 270
DIRECT = {"DfTeuSYK23y", "DdrkdrYv-yW", "DYKh5yyPxxg"}
ACCOUNT_REF = {"dr.jc.global": "drjc", "doctor.grove": "grove"}


def load_json(p, default=None):
    try:
        return json.load(open(p, encoding="utf8"))
    except FileNotFoundError:
        return default


def save_json(p, obj):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"), default=_np)
    os.replace(tmp, p)


def _np(o):
    if isinstance(o, (np.integer,)): return int(o)
    if isinstance(o, (np.floating,)): return None if not np.isfinite(o) else round(float(o), 5)
    if isinstance(o, np.ndarray): return o.tolist()
    raise TypeError(type(o))


@lru_cache(None)
def _ig_ref_by_shortcode():
    m = {}
    for p in load_json(os.path.join(STYLE, "raw", "ig_posts.json"), []):
        u = (p.get("inputUrl") or "").rstrip("/").split("/")[-1]
        m[p["shortCode"]] = ACCOUNT_REF.get(u, u)
    for sc in DIRECT: m[sc] = "ig_" + sc
    return m


def corpus(kind="video"):
    """[(ref, vid, path)] for kind 'video' (mp4) or 'still' (carousel slides, still posts, Are.na images; not reel covers)."""
    out, refmap = [], _ig_ref_by_shortcode()
    igdir = os.path.join(MEDIA, "ig")
    for owner in sorted(os.listdir(igdir)) if os.path.isdir(igdir) else []:
        for f in sorted(os.listdir(os.path.join(igdir, owner))):
            stem, ext = os.path.splitext(f)
            if stem.endswith("_cover"): continue
            sc = stem.rsplit("_", 1)[0] if ("_" in stem and stem.rsplit("_", 1)[1].isdigit()) else stem
            ref = refmap.get(sc)
            if not ref: continue
            if (kind == "video") == (ext == ".mp4"):
                out.append((ref, stem, os.path.join(igdir, owner, f)))
    if kind == "video":
        if os.path.exists(os.path.join(MEDIA, "yt", "glp1.mp4")): out.append(("glp1", "glp1", os.path.join(MEDIA, "yt", "glp1.mp4")))
        rodir = os.path.join(MEDIA, "yt", "ro")
        for f in sorted(os.listdir(rodir)) if os.path.isdir(rodir) else []:
            if f.endswith(".mp4"): out.append(("ro", f[:-4], os.path.join(rodir, f)))
    adir = os.path.join(MEDIA, "arena")
    for f in sorted(os.listdir(adir)) if os.path.isdir(adir) else []:
        stem, ext = os.path.splitext(f)
        isvid = ext.lower() in (".mp4", ".mov", ".webm", ".gif")
        if (kind == "video") == isvid: out.append(("arena", stem, os.path.join(adir, f)))
    return out


def out_path(ref, vid, name):
    return os.path.join(MEASURE, ref, vid, name)


def probe(path, ref, vid):
    """fps, frame_count (ffprobe -count_frames), size, duration; cached in measure/<ref>/<vid>/probe.json."""
    p = out_path(ref, vid, "probe.json")
    c = load_json(p)
    if c and c.get("path") == path: return c
    r = json.loads(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
                                   "stream=width,height,r_frame_rate,avg_frame_rate,nb_read_frames:format=duration",
                                   "-of", "json", path], capture_output=True, text=True).stdout)
    s = r["streams"][0]
    num, den = map(int, s["r_frame_rate"].split("/"))
    an, ad = map(int, (s.get("avg_frame_rate") or "0/1").split("/"))
    c = {"path": path, "width": s["width"], "height": s["height"], "fps": num / den, "avg_fps": an / ad if ad else None,
         "frame_count": int(s["nb_read_frames"]), "duration": float(r["format"].get("duration", 0))}
    save_json(p, c)
    return c


def frames(path, width=ANALYSIS_W, gray=False):
    """Yield (index, HxWx3 uint8 RGB or HxW gray) for EVERY frame at native rate."""
    info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                                      "-of", "json", path], capture_output=True, text=True).stdout)["streams"][0]
    w = width; h = int(round(info["height"] * w / info["width"] / 2) * 2)
    pix, ch = ("gray", 1) if gray else ("rgb24", 3)
    cmd = ["ffmpeg", "-v", "error", "-i", path, "-map", "0:v:0", "-fps_mode", "passthrough", "-vf", f"scale={w}:{h}:flags=area",
           "-f", "rawvideo", "-pix_fmt", pix, "-"]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, bufsize=10 ** 7)
    n, size = 0, w * h * ch
    try:
        while True:
            buf = proc.stdout.read(size)
            if len(buf) < size: break
            a = np.frombuffer(buf, np.uint8)
            yield n, (a.reshape(h, w) if gray else a.reshape(h, w, 3))
            n += 1
    finally:
        proc.stdout.close(); proc.wait()


def run(name, fn, kind="video", applies=None, force=False):
    """Run fn(ref, vid, path, P) -> obj for every applicable item lacking measure/<ref>/<vid>/<name>; save obj.
    CLI: python tool.py [--force] [--ref REF] [--vid VID]"""
    a = sys.argv[1:]
    force = force or "--force" in a
    only_ref = a[a.index("--ref") + 1] if "--ref" in a else None
    only_vid = a[a.index("--vid") + 1] if "--vid" in a else None
    items = [x for x in corpus(kind) if (not only_ref or x[0] == only_ref) and (not only_vid or x[1] == only_vid)]
    done = 0
    for ref, vid, path in items:
        if applies and not applies(ref, vid, path): continue
        op = out_path(ref, vid, name)
        if os.path.exists(op) and not force: continue
        try:
            P = probe(path, ref, vid) if kind == "video" else {"path": path}
            obj = fn(ref, vid, path, P)
            if obj is not None:
                save_json(op, obj); done += 1
                print(f"[{name}] {ref}/{vid} ok", flush=True)
        except Exception as e:
            print(f"[{name}] {ref}/{vid} FAIL {type(e).__name__}: {e}", flush=True)
    print(f"[{name}] wrote {done}", flush=True)


def has_audio(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", path],
                       capture_output=True, text=True).stdout.strip()
    return bool(r)


def wav(path, ref, vid, sr=16000):
    """Mono wav at sr for the video's audio, cached at measure/<ref>/<vid>/audio_<sr>.wav (gitignored by size? no: under stems/)."""
    d = os.path.join(STYLE, "stems", ref, vid); os.makedirs(d, exist_ok=True)
    p = os.path.join(d, f"audio_{sr}.wav")
    if not os.path.exists(p):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-vn", "-ac", "1", "-ar", str(sr), p], check=True)
    return p


def circ_mean_deg(h_deg, w=None):
    r = np.deg2rad(h_deg)
    s, c = np.average(np.sin(r), weights=w), np.average(np.cos(r), weights=w)
    return float((np.rad2deg(math.atan2(s, c)) + 360) % 360)


def cuts_frames(ref, vid):
    c = load_json(out_path(ref, vid, "cuts.json"), {})
    return sorted([x["frame"] for x in c.get("hard", [])])
