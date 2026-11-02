"""Run 2, phase 1: a transcript for every video, or an honest reason why not. Restartable.

python transcribe.py            fetch captions/audio (8 threads) and transcribe on the GPU as audio lands
python transcribe.py --medium   re-transcribe the top 200 non-own videos by outlier with whisper medium
python transcribe.py --status   counts by status x platform

Per video it writes transcripts/{id}.json = {status, source, words, lang, reason, model} and, when there is speech,
transcripts/{id}.txt. Anything with a .json is done and is skipped next time.
Order of attempts:
  tiktok    raw/subs/{vid}.txt (TikTok's own captions, fetched in run 1) -> yt-dlp audio -> whisper
  youtube   yt-dlp auto/manual English subs -> yt-dlp audio -> whisper
  instagram CDN videoUrl from raw/ (requests) -> yt-dlp -> whisper
"""
import glob, html, json, os, queue, re, site, subprocess, sys, threading, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
DATA, RAW, AUD, TR = ROOT / "data", ROOT / "raw", ROOT / "audio", ROOT / "transcripts"
AUD.mkdir(exist_ok=True)
TR.mkdir(exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36"}


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def vtt_text(t):
    out, last = [], None
    for line in t.splitlines():
        line = line.strip()
        if not line or "-->" in line or line.startswith(("WEBVTT", "NOTE", "Kind:", "Language:")) or line.isdigit():
            continue
        line = html.unescape(re.sub(r"<[^>]+>", "", line)).strip()
        if line and line != last:
            out.append(line)
        last = line
    return re.sub(r"\s+", " ", " ".join(out)).strip()


def done(vid):
    return (TR / f"{vid}.json").exists()


def save(vid, status, text="", **meta):
    text = (text or "").strip()
    if text:
        (TR / f"{vid}.txt").write_text(text, encoding="utf-8")
    meta.update(status=status, words=len(text.split()))
    (TR / f"{vid}.json").write_text(json.dumps(meta), encoding="utf-8")


def ig_cdn():
    m = {}
    for f in glob.glob(str(RAW / "*.json")):
        d = json.loads(Path(f).read_text(encoding="utf-8"))
        if "instagram" not in d.get("actor", ""):
            continue
        for it in d.get("items", []):
            sc = it.get("shortCode")
            if sc and (it.get("videoUrl") or it.get("video_url")):
                m[sc] = it.get("videoUrl") or it.get("video_url")
    return m


def ytdlp(args, timeout=180):
    return subprocess.run(["yt-dlp", "--no-warnings", "--no-playlist", *args], capture_output=True, text=True,
                          encoding="utf-8", errors="replace", timeout=timeout)


def fetch(v, cdn, q):
    vid, p, url = v["id"], v["platform"], v["url"]
    raw_id = vid.split("_", 1)[1]
    if done(vid):
        return
    try:
        if p == "tiktok":
            s = RAW / "subs" / f"{raw_id}.txt"
            if s.exists() and len(s.read_text(encoding="utf-8").split()) >= 5:
                save(vid, "captions", s.read_text(encoding="utf-8"), source="tiktok-captions")
                return
        if p == "youtube":
            base = AUD / f"{vid}.sub"
            ytdlp(["--skip-download", "--write-subs", "--write-auto-subs", "--sub-langs", "en.*,en", "--sub-format", "vtt",
                   "-o", str(base), url], timeout=90)
            subs = sorted(AUD.glob(f"{vid}.sub*.vtt"), key=lambda f: ("orig" not in f.name, len(f.name)))
            if subs:
                t = vtt_text(subs[0].read_text(encoding="utf-8", errors="replace"))
                for f in subs:
                    f.unlink()
                if len(t.split()) >= 5:
                    save(vid, "captions", t, source="youtube-subs")
                    return
        audio = None
        if p == "instagram" and raw_id in cdn:
            r = requests.get(cdn[raw_id], headers=UA, timeout=60)
            if r.ok and len(r.content) > 10_000:
                audio = AUD / f"{vid}.mp4"
                audio.write_bytes(r.content)
        if not audio:
            r = ytdlp(["-x", "--audio-format", "m4a", "-o", str(AUD / f"{vid}.%(ext)s"), url], timeout=240)
            got = [f for f in AUD.glob(f"{vid}.*") if f.suffix in (".m4a", ".mp4", ".webm", ".mp3", ".opus")]
            if got:
                audio = got[0]
            else:
                err = (r.stderr or "").strip().splitlines()
                save(vid, "unavailable", reason=(err[-1] if err else "yt-dlp produced no file")[:300])
                return
        q.put((vid, audio))
    except Exception as e:  # noqa: BLE001 - every failure is recorded, never fatal
        save(vid, "unavailable", reason=f"{type(e).__name__}: {e}"[:300])


def cuda_dlls():
    for sp in site.getsitepackages():
        for sub in ("nvidia/cublas/bin", "nvidia/cudnn/bin"):
            d = os.path.join(sp, sub)
            if os.path.isdir(d):
                os.add_dll_directory(d)
                os.environ["PATH"] = d + os.pathsep + os.environ["PATH"]


def model(name):
    cuda_dlls()
    from faster_whisper import WhisperModel
    return WhisperModel(name, device="cuda", compute_type="float16")


def whisper(m, vid, audio, name):
    segs, info = m.transcribe(str(audio), vad_filter=True, beam_size=5)
    text = " ".join(s.text.strip() for s in segs).strip()
    if len(text.split()) < 3:
        save(vid, "no_speech", text, source="whisper", model=name, lang=info.language, duration=round(info.duration, 1),
             reason="no speech detected (music / text-on-screen only)")
    else:
        save(vid, "whisper", text, source="whisper", model=name, lang=info.language, duration=round(info.duration, 1))


def run():
    vids = json.loads((DATA / "videos.json").read_text(encoding="utf-8"))
    todo = [v for v in vids if not done(v["id"])]
    log(f"{len(vids)} videos, {len(todo)} to do")
    cdn = ig_cdn()
    q = queue.Queue()
    # leftovers from a killed run: audio on disk but no transcript
    for f in AUD.iterdir():
        vid = f.stem
        if f.suffix in (".m4a", ".mp4", ".webm") and not done(vid):
            q.put((vid, f))
    pool = ThreadPoolExecutor(8)
    futs = [pool.submit(fetch, v, cdn, q) for v in todo]
    m = model("small")
    n = 0
    while True:
        try:
            vid, audio = q.get(timeout=5)
        except queue.Empty:
            if all(f.done() for f in futs):
                break
            continue
        if done(vid):
            continue
        try:
            whisper(m, vid, audio, "small")
        except Exception as e:  # noqa: BLE001
            save(vid, "unavailable", reason=f"whisper: {type(e).__name__}: {e}"[:300])
        n += 1
        if n % 25 == 0:
            log(f"whispered {n}; done {sum(1 for _ in TR.glob('*.json'))}/{len(vids)}")
    pool.shutdown()
    log("fetch+whisper finished", status())


def medium():
    vids = json.loads((DATA / "videos.json").read_text(encoding="utf-8"))
    top = sorted([v for v in vids if v["source"] != "own"], key=lambda v: -v["outlier_score"])[:200]
    m = None
    for i, v in enumerate(top):
        meta_f = TR / f"{v['id']}.json"
        meta = json.loads(meta_f.read_text()) if meta_f.exists() else {}
        if meta.get("model") == "medium" or meta.get("status") not in ("whisper", "no_speech"):
            continue  # captions are kept; unavailable has no audio
        audio = next((f for f in AUD.glob(f"{v['id']}.*") if f.suffix in (".m4a", ".mp4", ".webm")), None)
        if not audio:
            continue
        m = m or model("medium")
        whisper(m, v["id"], audio, "medium")
        if i % 20 == 0:
            log(f"medium {i}/200")
    log("medium pass finished")


def worker():
    """second GPU consumer: takes queued audio from the other end of the queue until the fetcher is done"""
    m, idle = model("small"), 0
    while idle < 60:
        todo = sorted((f for f in AUD.iterdir() if f.suffix in (".m4a", ".mp4", ".webm") and not done(f.stem)),
                      key=lambda f: f.stat().st_mtime, reverse=True)
        if not todo:
            idle += 1
            time.sleep(5)
            continue
        idle = 0
        f = todo[0]
        try:
            whisper(m, f.stem, f, "small")
        except Exception as e:  # noqa: BLE001
            save(f.stem, "unavailable", reason=f"whisper: {type(e).__name__}: {e}"[:300])


def status():
    vids = json.loads((DATA / "videos.json").read_text(encoding="utf-8"))
    from collections import Counter
    c = Counter()
    for v in vids:
        f = TR / f"{v['id']}.json"
        c[(v["platform"], json.loads(f.read_text())["status"] if f.exists() else "pending")] += 1
    return dict(sorted(c.items()))


if __name__ == "__main__":
    if "--status" in sys.argv:
        print(json.dumps({f"{a}/{b}": n for (a, b), n in status().items()}, indent=1))
    elif "--worker" in sys.argv:
        worker()
    elif "--medium" in sys.argv:
        medium()
    else:
        run()
