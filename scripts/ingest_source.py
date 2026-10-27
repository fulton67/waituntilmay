"""Turn a YouTube URL into a source: download, normalise, transcribe, tag.

The same pipeline Blum went through, in one command, so a new source arrives
with the same five transcript files and the same tag set rather than something
nearly like them.

YouTube returns 403 to yt-dlp's default player clients from this machine, so
the clients are tried in order and the first that yields a format wins;
`--cookies-from-browser` is the documented fallback and is passed straight
through when asked for.

  python scripts/ingest_source.py --url https://youtube.com/watch?v=... --id swartz
  python scripts/ingest_source.py --picked sources/houthi-picked.json
  python scripts/ingest_source.py --picked ... --register --weight 0.3
"""
import argparse
import json
import os
import re
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DL = ".dl"
SOURCES = "sources"
CONFIG = "config/sources.json"
# mweb first: the default clients 403 from here, and web_safari/ios/tv return
# "format is not available" or a reload demand. Measured, not guessed.
CLIENTS = ["mweb", "web", "tv", "ios", "web_safari"]
PY = sys.executable


def run(cmd, **kw):
    kw.setdefault("check", True)
    kw.setdefault("cwd", ROOT)
    return subprocess.run(cmd, **kw)


def out(cmd, **kw):
    kw.setdefault("cwd", ROOT)
    return subprocess.run(cmd, capture_output=True, text=True, **kw).stdout.strip()


def probe(path):
    j = json.loads(out(["ffprobe", "-v", "error", "-show_entries",
                        "stream=codec_type,width,height,r_frame_rate",
                        "-show_entries", "format=duration", "-of", "json", path]))
    v = next((s for s in j["streams"] if s["codec_type"] == "video"), {})
    return {"duration": float(j["format"]["duration"]),
            "width": v.get("width"), "height": v.get("height"),
            "fps": v.get("r_frame_rate")}


def meta(url, cookies=None):
    base = ["yt-dlp", "--no-warnings", "--print",
            "%(title)s\t%(channel)s\t%(upload_date)s\t%(duration)s\t%(id)s"]
    if cookies:
        base += ["--cookies-from-browser", cookies]
    for c in CLIENTS:
        t = out(base + ["--extractor-args", f"youtube:player_client={c}", url])
        if t and "\t" in t:
            title, channel, date, dur, vid = t.split("\t")[:5]
            d = (f"{date[:4]}-{date[4:6]}-{date[6:8]}"
                 if date and date.isdigit() and len(date) == 8 else date or None)
            return {"title": title, "channel": channel, "date": d,
                    "duration": float(dur or 0), "video_id": vid, "client": c}
    raise RuntimeError(f"could not read metadata for {url}")


def download(url, vid, cookies=None):
    os.makedirs(os.path.join(ROOT, DL), exist_ok=True)
    dst = os.path.join(ROOT, DL, f"{vid}.mp4")
    if os.path.exists(dst):
        print(f"  [dl] cached {dst}")
        return dst
    base = ["yt-dlp", "--no-warnings", "--no-progress",
            "-f", "bv*[height<=720]+ba/b[height<=720]/b",
            "--merge-output-format", "mp4",
            "-o", os.path.join(DL, "%(id)s.%(ext)s")]
    if cookies:
        base += ["--cookies-from-browser", cookies]
    last = None
    for c in CLIENTS:
        r = subprocess.run(base + ["--extractor-args",
                                   f"youtube:player_client={c}", url],
                           cwd=ROOT, capture_output=True, text=True)
        if os.path.exists(dst):
            print(f"  [dl] {c}: ok")
            return dst
        last = (r.stdout or "") + (r.stderr or "")
        print(f"  [dl] {c}: {last.strip().splitlines()[-1][:110] if last.strip() else 'no output'}")
    raise RuntimeError(f"download failed for {url}\n{last[-600:] if last else ''}")


# Every source is levelled to this. It is Blum's own integrated loudness, so
# the existing pool, the room tone and BED_GAIN - all tuned against Blum -
# stay valid, and a version that crosses sources mid-sentence does not jump.
TARGET_LUFS = -19.9


def loudness(path):
    """Integrated loudness, measured with ebur128."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path,
                        "-af", "ebur128=framelog=quiet", "-f", "null", "-"],
                       cwd=ROOT, capture_output=True, text=True)
    m = re.search(r"Integrated loudness[\s\S]{0,80}?I:\s*(-?[\d.]+)\s*LUFS",
                  r.stderr or "")
    return float(m.group(1)) if m else None


def normalise(src, sid):
    """640x360 @ 24fps at a common loudness - the shape the pool is cut from.

    The level is not cosmetic. The voice runs as one continuous line across
    sources, so a source 12 LU quieter than the rest both jumps audibly at
    the splice and reads as silence to the speech-coverage gate, which is
    calibrated in absolute dBFS against Blum's noise floor. Measured, a
    broadcast source came in at -32.4 LUFS against Blum's -19.9 and lost half
    the batch to a gate it should have passed.

    A flat gain, not loudnorm's dynamic mode: it keeps the original
    dynamics, and the limiter only touches the few samples near peak.
    """
    d = os.path.join(ROOT, SOURCES, sid)
    os.makedirs(d, exist_ok=True)
    dst = os.path.join(d, "source.mp4")
    if os.path.exists(dst):
        print("  [norm] cached")
        return dst
    lufs = loudness(src)
    gain = (TARGET_LUFS - lufs) if lufs is not None else 0.0
    af = (f"volume={gain:.2f}dB,alimiter=limit=-1dB:level=disabled"
          if abs(gain) > 0.2 else "anull")
    print(f"  [norm] {lufs if lufs is None else f'{lufs:.1f}'} LUFS "
          f"-> {TARGET_LUFS} ({gain:+.2f} dB)")
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", src,
         "-vf", "scale=640:360:force_original_aspect_ratio=decrease,"
                "pad=640:360:(ow-iw)/2:(oh-ih)/2,fps=24",
         "-af", af,
         "-c:v", "libx264", "-preset", "slow", "-crf", "18",
         "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
         "-ar", "44100", "-ac", "2", "-movflags", "+faststart", dst])
    got = loudness(dst)
    if got is not None:
        print(f"  [norm] measured {got:.1f} LUFS")
    return dst


def transcribe(sid, video):
    os.makedirs(os.path.join(ROOT, "audio"), exist_ok=True)
    wav = os.path.join(ROOT, "audio", f"{sid}_16k.wav")
    if not os.path.exists(wav):
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", video,
             "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav])
    raw = os.path.join(SOURCES, sid, "_raw_whisperx.json")
    if not os.path.exists(os.path.join(ROOT, raw)):
        run([PY, "scripts/transcribe.py", "--audio",
             os.path.join("audio", f"{sid}_16k.wav"), "--out", raw])
    return raw


def outputs(sid, raw, duration):
    td = os.path.join(SOURCES, sid, "transcript")
    os.makedirs(os.path.join(ROOT, td), exist_ok=True)
    run([PY, "scripts/build_outputs.py", "--raw", raw, "--outdir", td,
         "--duration", f"{duration:.3f}", "--pad", "0.05"],
        capture_output=True, text=True)
    return td


def tag(sid):
    run([PY, "scripts/autotag.py", "tag", "--source",
         os.path.join(SOURCES, sid)])


def register(entry, weight, enabled=True):
    p = os.path.join(ROOT, CONFIG)
    cfg = json.load(open(p, encoding="utf-8"))
    rest = [s for s in cfg["sources"] if s["id"] != entry["id"]]
    rest.append({**entry, "enabled": enabled, "weight": weight})
    cfg["sources"] = rest
    tmp = p + ".tmp"
    json.dump(cfg, open(tmp, "w", encoding="utf-8"), indent=2,
              ensure_ascii=False)
    os.replace(tmp, p)
    print(f"  [config] {entry['id']} registered, weight {weight}")


def ingest(sid, url, weight, cookies=None, do_register=True):
    print(f"\n=== {sid}  {url}")
    m = meta(url, cookies)
    print(f"  [meta] {m['title'][:70]}")
    print(f"         {m['channel']}  {m['date']}  {m['duration']:.0f}s  "
          f"(via {m['client']})")
    raw_mp4 = download(url, m["video_id"], cookies)
    video = normalise(raw_mp4, sid)
    pr = probe(video)
    print(f"  [norm] {pr['width']}x{pr['height']} @ {pr['fps']}  "
          f"{pr['duration']:.2f}s")
    t0 = time.time()
    raw = transcribe(sid, video)
    print(f"  [asr]  {time.time()-t0:.0f}s")
    td = outputs(sid, raw, pr["duration"])
    words = json.load(open(os.path.join(ROOT, td, "words.json"),
                           encoding="utf-8"))
    phrases = json.load(open(os.path.join(ROOT, td, "phrases.json"),
                             encoding="utf-8"))
    print(f"  [txt]  {len(words)} words, {len(phrases)} phrases")
    tag(sid)
    entry = {"id": sid, "title": m["title"], "channel": m["channel"],
             "url": url, "date": m["date"],
             "duration": round(pr["duration"], 3), "fps": 24}
    if do_register:
        register(entry, weight)
    return entry


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url")
    ap.add_argument("--id")
    ap.add_argument("--picked", help="sources/houthi-picked.json from apify-search")
    ap.add_argument("--weight", type=float, default=0.3)
    ap.add_argument("--cookies-from-browser", dest="cookies", default=None)
    ap.add_argument("--no-register", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    jobs = []
    if args.picked:
        picked = json.load(open(os.path.join(ROOT, args.picked),
                                encoding="utf-8"))
        if args.limit:
            picked = picked[:args.limit]
        # the ten share the configured houthi weight between them, so adding
        # ten sources does not quietly make the pool nine tenths Red Sea
        each = args.weight / max(len(picked), 1)
        jobs = [(p["id"], p["url"], each) for p in picked]
    elif args.url and args.id:
        jobs = [(args.id, args.url, args.weight)]
    else:
        ap.error("need --url and --id, or --picked")

    done, failed = [], []
    for sid, url, w in jobs:
        try:
            done.append(ingest(sid, url, w, args.cookies,
                               not args.no_register))
        except Exception as e:
            print(f"  FAILED {sid}: {e}")
            failed.append((sid, str(e)))
    print(f"\n{len(done)}/{len(jobs)} ingested")
    for sid, why in failed:
        print(f"  {sid}: {why.splitlines()[0]}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
