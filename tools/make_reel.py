"""make-reel <clip> <preset>: the FAST LANE (research/ostad/PLAYBOOK.md). One command from a camera-roll clip to a reel in Remotion Studio.

  tools/make-reel <clip.MOV|mp4> <preset> [--id ID] [--no-studio] [--skip-dead]
  presets: brand/remotion/presets/{procedure-explainer,myth-buster,product-talk,patient-walkthrough}.json

Steps (each timed into public/fast/<id>/timings.json and printed):
  1 transcribe + track   work copy (1080x1920, 24 fps, HLG tags kept, no grade), faster-whisper words, face boxes (MediaPipe, 4 Hz)
  2 argument map         ARGUMENT.md + argument.json: a fresh `claude -p` reader of the numbered sentences (text only, no footage)
  3 fill the preset      timeline.json: cuts on sentence ends in measured silence, slots on key words, springs named, SFX on settle,
                         every box clear of the tracked face
  4 checks               motion lint, banned lint, sfx alignment, dead frames (quarter-scale gfx preview), cuts on sentence ends,
                         comprehension (a second fresh reader of the cut transcript only), audio levels, faces clear, hold-min
  5 Remotion Studio      npx remotion studio src/fast/index.ts, on this reel. It does not render.
No paid generation anywhere. Patient footage stays on this machine (only transcript text goes to the reader).
"""
import argparse, datetime, difflib, json, math, os, re, shutil, subprocess, sys, tempfile, time, wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RM = ROOT / "brand/remotion"
PUB = RM / "public"
sys.path.insert(0, str(Path(__file__).resolve().parent))
from springs import first_reach  # noqa: E402

FPS = 24
W, H, M, SAFE_T, CHEST_T, CAP_T = 1080, 1920, 98, 250, 1040, 1594
PY = sys.executable
T = {}


def say(*a):
    print(*a, flush=True)


def timed(name):
    def deco(fn):
        def run(*a, **k):
            t0 = time.time()
            say(f"\n== {name}")
            r = fn(*a, **k)
            T[name] = round(time.time() - t0, 1)
            say(f"   {name}: {T[name]} s")
            return r
        return run
    return deco


def sh(cmd, **k):
    return subprocess.run(cmd, check=True, **k)


# ---------------------------------------------------------------- 1 transcribe + track
def work_copy(src: Path, d: Path):
    out = d / "talk.mp4"
    if out.exists():
        return out
    # no colour filter: scale + crop only, and the ORIGINAL's colour tags stated on the copy (HLG stays HLG, SDR stays SDR)
    pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=color_primaries,color_transfer,color_space",
                                    "-of", "json", str(src)], capture_output=True, text=True).stdout)["streams"][0]
    tags = []
    for k, flag in (("color_primaries", "-color_primaries"), ("color_transfer", "-color_trc"), ("color_space", "-colorspace")):
        if pr.get(k) and pr[k] != "unknown":
            tags += [flag, pr[k]]
    sh(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf", "fps=24,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
        "-c:v", "libx264", "-crf", "16", "-preset", "veryfast", "-pix_fmt", "yuv420p", *tags, "-c:a", "aac", "-b:a", "192k", str(out)])
    (d / "source.json").write_text(json.dumps({"original": str(src).replace("\\", "/"), "colour": pr, "mapping": "fps=24 nearest frames, scale+crop to 1080x1920, no grade"}, indent=1))
    return out


def wav16(src: Path, d: Path):
    w = d / "a16.wav"
    if not w.exists():
        sh(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vn", "-ac", "1", "-ar", "16000", str(w)])
    return w


def transcribe(w: Path, d: Path):
    out = d / "words.json"
    if out.exists():
        return json.loads(out.read_text(encoding="utf-8"))
    if os.name == "nt":  # CTranslate2 needs cublas / cudnn, which ship inside torch/lib (research/ostad/style/tools/common.py cuda_dlls)
        try:
            import torch
            os.add_dll_directory(os.path.join(os.path.dirname(torch.__file__), "lib"))
        except Exception:
            pass
    from faster_whisper import WhisperModel

    def run(device, ct):
        m = WhisperModel("medium", device=device, compute_type=ct)
        segs, info = m.transcribe(str(w), language="en", word_timestamps=True, vad_filter=True, beam_size=5)
        return [{"w": x.word.strip(), "s": round(x.start, 3), "e": round(x.end, 3), "p": round(x.probability, 3)} for s in segs for x in (s.words or [])], info
    try:
        words, info = run("cuda", "float16"); dev = "cuda fp16"
    except Exception as e:
        say("   GPU whisper failed:", str(e)[:120], "-> CPU int8")
        words, info = run("cpu", "int8"); dev = "cpu int8"
    r = {"model": f"faster-whisper medium {dev}", "duration": info.duration, "words": words}
    out.write_text(json.dumps(r, indent=1), encoding="utf-8")
    return r


def envelope(w: Path):
    with wave.open(str(w)) as f:
        x = np.frombuffer(f.readframes(f.getnframes()), np.int16).astype(np.float32) / 32768
    hop = 160  # 10 ms
    n = len(x) // hop
    rms = np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    floor = np.percentile(db, 10)
    return db, floor


def track(work: Path, d: Path, every=6):
    out = d / "track.json"
    if out.exists():
        return json.loads(out.read_text())
    import cv2, mediapipe as mp
    V = mp.tasks.vision
    opts = V.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path="C:/Users/naimj/tools/models/face_landmarker.task"),
                                   running_mode=V.RunningMode.VIDEO, num_faces=2, min_face_detection_confidence=0.5)
    cap = cv2.VideoCapture(str(work))
    rows, i = [], 0
    with V.FaceLandmarker.create_from_options(opts) as lm:
        while True:
            ok = cap.grab()
            if not ok:
                break
            if i % every == 0:
                ok, bgr = cap.retrieve()
                r = lm.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)), int(i * 1000 / FPS))
                faces = []
                for f in r.face_landmarks or []:
                    xs = [q.x * W for q in f]; ys = [q.y * H for q in f]
                    # the face box padded to the hairline and chin (landmarks stop at the forehead): +35 % up, +8 % down, +10 % sides
                    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
                    fw, fh = x1 - x0, y1 - y0
                    faces.append([round(x0 - 0.1 * fw), round(y0 - 0.35 * fh), round(fw * 1.2), round(fh * 1.43)])
                rows.append([i, faces])
            i += 1
    r = {"every": every, "fps": FPS, "frames": i, "faces": rows}
    out.write_text(json.dumps(r))
    return r


def faces_at(trk, src_frame):
    rows = trk["faces"]
    k = min(len(rows) - 1, max(0, int(round(src_frame / trk["every"]))))
    return rows[k][1] if rows else []


# ---------------------------------------------------------------- sentences, silence
def sentences(words):
    out, cur = [], []
    for i, w in enumerate(words):
        cur.append(i)
        if re.search(r"[.?!]$", w["w"]) or (i + 1 < len(words) and words[i + 1]["s"] - w["e"] > 1.2):
            out.append(cur); cur = []
    if cur:
        out.append(cur)
    return [{"id": k, "w": ix, "s": words[ix[0]]["s"], "e": words[ix[-1]]["e"], "text": " ".join(words[j]["w"] for j in ix)} for k, ix in enumerate(out)]


def silent_mid(db, floor, t, lo, hi, side):
    """middle of the silent run (>= 80 ms, below floor + 8 dB) nearest t inside [t+lo, t+hi]; None if there is none"""
    thr = floor + 8
    a, b = max(0, int((t + lo) * 100)), min(len(db) - 1, int((t + hi) * 100))
    runs, s = [], None
    for k in range(a, b + 1):
        q = db[k] < thr
        if q and s is None:
            s = k
        if (not q or k == b) and s is not None:
            e = k if not q else k + 1
            if e - s >= 8:
                runs.append((s, e))
            s = None
    if not runs:
        return None
    best = min(runs, key=lambda r: abs((r[0] + r[1]) / 200 - t))
    mid = (best[0] + best[1]) / 200
    # keep >= 25 ms of the gap on the speech side
    return max(best[0] / 100 + 0.025, mid) if side == "out" else min(best[1] / 100 - 0.025, mid)


# ---------------------------------------------------------------- 2 argument map
def claude_json(prompt: str, timeout=240):
    exe = shutil.which("claude")
    if not exe:
        return None, "claude CLI not found"
    tmp = Path(tempfile.gettempdir()) / "ostad_fast_reader"  # outside the repo: the reader gets no project context (kept; Windows locks a
    tmp.mkdir(exist_ok=True)                                  # just-used temp dir, so a per-call TemporaryDirectory failed to clean up)
    if True:
        try:
            r = subprocess.run([exe, "-p", "--output-format", "text", "--disallowedTools", "Bash,Edit,Write,Read,WebFetch,WebSearch,Glob,Grep,Agent"],
                               input=prompt, capture_output=True, text=True, encoding="utf-8", cwd=tmp, timeout=timeout)
        except subprocess.TimeoutExpired:
            return None, "timeout"
    m = re.search(r"\{[\s\S]*\}", r.stdout)
    if not m:
        return None, (r.stdout + r.stderr)[-400:]
    try:
        return json.loads(m.group(0)), None
    except json.JSONDecodeError as e:
        return None, f"bad json: {e}"


def argument_map(sents, preset, d: Path):
    out = d / "argument.json"
    if out.exists():
        return json.loads(out.read_text(encoding="utf-8"))
    roles = preset["roles"]
    lines = "\n".join(f"[{s['id']}] ({s['s']:.1f}-{s['e']:.1f}s) {s['text']}" for s in sents)
    prompt = f"""You are mapping the argument of a short vertical video by Dr. Ariel Ostad, a board-certified dermatologist. Preset: {preset['preset']}.
{preset['brief']}
Roles (key: on-screen label): {json.dumps(roles)}
Rules: keep {preset['target_s'][0]}-{preset['target_s'][1]} seconds of whole sentences, in their original order; never keep a setup without its 'but';
never change a claim by trimming; end on a complete sentence; on-screen titles <= 6 words and literally true for the whole video; no patient names
(say 'the patient'); do not invent numbers. Named conditions (e.g. jowling, tear trough, crow's feet) go in terms; named instruments or products
(e.g. cannula, needle, Evolysse Smooth) go in objects.
Numbered sentences:
{lines}

Answer with ONE JSON object only, no prose:
{{"title": "<= 5 words", "fields": {{<role>: "one plain sentence"}}, "keep": [sentence ids],
 "beats": [{{"sentence": id, "role": "<role key>", "title": "<= 6 words", "line": "optional <= 10 words", "key_word": "a word of that sentence"}}],
 "terms": [{{"sentence": id, "term": "...", "region": "eyes|cheeks|lips|jaw|forehead|neck|none"}}],
 "objects": [{{"sentence": id, "name": "..."}}], "keywords": ["..."]}}"""
    t0 = time.time()
    m, err = claude_json(prompt)
    if m is None:  # fallback: keep everything up to the target length, a beat on each sentence with a contrast word
        say("   reader failed:", err, "-> heuristic map")
        keep, tot = [], 0
        for s in sents:
            if tot + (s["e"] - s["s"]) > preset["target_s"][1]:
                break
            keep.append(s["id"]); tot += s["e"] - s["s"]
        rk = list(roles)
        m = {"title": " ".join(sents[0]["text"].split()[:4]).strip(".,"), "fields": {}, "keep": keep, "terms": [], "objects": [], "keywords": [],
             "beats": [{"sentence": s["id"], "role": rk[min(len(rk) - 1, i)], "title": " ".join(s["text"].split()[:6]).strip(".,"), "key_word": s["text"].split()[0]}
                       for i, s in enumerate([s for s in sents if s["id"] in keep and re.search(r"\b(but|instead|usually|because|so)\b", s["text"], re.I)][:6])],
             "reader": "heuristic"}
    else:
        m["reader"] = f"claude -p ({round(time.time() - t0)} s)"
    out.write_text(json.dumps(m, indent=1), encoding="utf-8")
    md = [f"# Argument map ({preset['preset']})", "", f"Title: **{m.get('title', '')}**", ""]
    md += [f"- **{roles.get(k, k)}**: {v}" for k, v in (m.get("fields") or {}).items()]
    md += ["", "Kept sentences: " + ", ".join(map(str, m.get("keep", []))), "", "| sentence | role | card |", "|---|---|---|"]
    md += [f"| {b['sentence']} | {b.get('role')} | {b.get('title')} |" for b in m.get("beats", [])]
    (d / "ARGUMENT.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    return m


# ---------------------------------------------------------------- 3 fill the preset
def objects_library():
    lib = {}
    for p in list((PUB / "objects").glob("*.png")) + list((PUB / "objects/evolus").glob("*.png")):
        n = p.stem.lower()
        if "placeholder" in n or n.startswith("ghost") or n.endswith("_tip"):
            continue
        lib[p] = set(re.split(r"[-_ ]+", n.replace("_clean", "")))
    return lib


def find_object(name, lib):
    toks = set(re.split(r"[-_ ]+", name.lower()))
    best = max(lib.items(), key=lambda kv: len(kv[1] & toks) / max(1, len(kv[1])), default=None)
    if best and len(best[1] & toks) / max(1, len(best[1])) >= 0.5:
        return best[0]
    return None


def free_band(trk, src_frames, h_need):
    """the face-free band for a box of height h_need over these source frames: 'top' (y 250..) or 'chest' (y 1040..) or the lowest gap"""
    boxes = [b for f in src_frames for b in faces_at(trk, f)]
    if not boxes:
        return SAFE_T + 10
    top = min(b[1] for b in boxes); bot = max(b[1] + b[3] for b in boxes)
    if SAFE_T + 10 + h_need + 20 <= top:
        return SAFE_T + 10
    if bot + 30 <= CAP_T - h_need - 20:
        return max(CHEST_T, bot + 30)
    return None


def visuals_library():
    p = ROOT / "research/ostad/fast/visuals.json"
    return json.loads(p.read_text(encoding="utf-8"))["entries"] if p.exists() else []


def resolve_props(v, start, end, word_at):
    """fill '@start', '@start+N', '@word:<prefix>' and '@ramp:<prefix>:v0,v1,..:step' in a visuals.json props template"""
    miss = [0]

    def word(prefix):
        f = word_at(prefix, start - 6, end)
        if f is None:
            miss[0] += 1
            return start + 12 * miss[0]
        return f

    def r(x):
        if isinstance(x, dict):
            return {k: r(y) for k, y in x.items()}
        if isinstance(x, list):
            return [r(y) for y in x]
        if isinstance(x, str) and x.startswith("@"):
            if x == "@start":
                return start
            if x.startswith("@start+"):
                return start + int(x[7:])
            if x.startswith("@word:"):
                return word(x[6:])
            if x.startswith("@ramp:"):
                _, pre, vals, step = x.split(":")
                t0 = word(pre)
                vs = [float(q) for q in vals.split(",")]
                return [[0, vs[0]], [t0, vs[0]]] + [[t0 + int(step) * i, q] for i, q in enumerate(vs) if i]
        return x
    return r(v), miss[0]


def fill(preset, sents, words, m, db, floor, trk, d: Path, reel_id: str):
    keep = sorted(set(m["keep"]))
    S = {s["id"]: s for s in sents}
    # pieces: runs of consecutive kept sentences, in/out snapped into measured silence
    runs, cur = [], []
    for k in keep:
        if cur and k != cur[-1] + 1:
            runs.append(cur); cur = []
        cur.append(k)
    if cur:
        runs.append(cur)
    pieces, at, warn = [], 0, []
    for i, r in enumerate(runs):
        a, b = S[r[0]], S[r[-1]]
        prev_e = words[a["w"][0] - 1]["e"] if a["w"][0] > 0 else 0
        nxt_s = words[b["w"][-1] + 1]["s"] if b["w"][-1] + 1 < len(words) else b["e"] + 1.0
        tin = silent_mid(db, floor, a["s"], max(-0.6, prev_e - a["s"]), 0.05, "in")
        tout = silent_mid(db, floor, b["e"], -0.05, min(0.8, nxt_s - b["e"]), "out")
        if tin is None:
            tin = max(prev_e, a["s"] - 0.08); warn.append(f"piece {i}: no 80 ms gap before sentence {r[0]}")
        if tout is None:
            tout = min(nxt_s, b["e"] + 0.08); warn.append(f"piece {i}: no 80 ms gap after sentence {r[-1]}")
        n = int(round((tout - tin) * FPS))
        pieces.append({"id": f"p{i}", "in": round(tin, 3), "out": round(tin + n / FPS, 3), "at": at, "sentences": r, "reason": f"sentences {r[0]}-{r[-1]} whole"})
        at += n
    last = pieces[-1]
    tail_s = next(s for s in preset["slots"] if s["kind"] == "end").get("tail_s", 2.5)
    nt = int(round(tail_s * FPS))
    pieces.append({"id": "tail", "in": last["out"], "out": round(last["out"] + nt / FPS, 3), "at": at, "muted": True, "reason": "end card over his silence"})
    total = at + nt

    def comp_frame(t_src):
        for p in pieces:
            if p["in"] - 0.001 <= t_src <= p["out"] + 0.001 and p["id"] != "tail":
                return p["at"] + int(round((t_src - p["in"]) * FPS))
        return None

    def src_frames(c0, c1):
        out = []
        for c in range(c0, c1 + 1, 6):
            p = max((p for p in pieces if p["at"] <= c), key=lambda p: p["at"])
            out.append(int(round((p["in"] + (c - p["at"]) / FPS) * FPS)))
        return out

    # captions: kept words, 1-3 words per phrase, break on punctuation / a pause > 0.3 s
    caps, ph = [], []
    kw = [(i, words[i]) for k in keep for i in S[k]["w"]]
    for j, (i, w) in enumerate(kw):
        cf = comp_frame(w["s"])
        if cf is None:
            continue
        ph.append((cf + 0, w))
        brk = len(ph) >= 3 or re.search(r"[.,?!;:]$", w["w"]) or j + 1 == len(kw) or kw[j + 1][1]["s"] - w["e"] > 0.3
        if brk:
            caps.append({"from": ph[0][0], "text": " ".join(x[1]["w"] for x in ph).strip(), "end_src": w["e"]}); ph = []
    for j, c in enumerate(caps):
        e = comp_frame(c.pop("end_src")) or c["from"] + 12
        c["to"] = min(caps[j + 1]["from"] if j + 1 < len(caps) else total, e + 8)
        c["text"] = re.sub(r"[.,;:]$", "", c["text"])

    slots, wish = [], []
    spec = {s["kind"]: s for s in preset["slots"]}
    busy = []  # (start, end) of on-screen cards: one card at a time, sequential handover

    def place(kind, start, hold, h_need, extra):
        sp = spec[kind]["spring"]
        end = start + first_reach(sp) + hold
        for (a, b) in busy:
            if a <= start <= b + 6:
                start = b + 8; end = start + first_reach(sp) + hold
        if end > total - nt - 2:
            return None
        top = free_band(trk, src_frames(start, end), h_need)
        if top is None:
            warn.append(f"{kind} at f{start}: no face-free band; dropped")
            return None
        busy.append((start, end))
        sl = {"id": f"{kind}{len(slots)}", "kind": kind, "start": start, "end": end, "spring": sp,
              "sfx": {"name": spec[kind]["sfx"], "frame": start + first_reach(sp), "gain": 0.32} if kind == "title" else None, **extra(top)}  # sound on heroes only (round 2)
        slots.append(sl)
        return sl

    # title within 1.5 s
    place("title", 6, spec["title"]["hold_f"], 260, lambda top: {"top": top + 40, "text": {"caps": spec["title"]["caps"], "title": m.get("title", "")}, "box": {"left": M, "top": top, "w": W - 2 * M}})

    def onset(sid, key):
        s = S.get(sid)
        if not s:
            return None
        ws = s["w"]
        hit = next((i for i in ws if key and re.sub(r"\W", "", words[i]["w"].lower()) == re.sub(r"\W", "", key.lower())), ws[0])
        c = comp_frame(words[hit]["s"])
        return None if c is None else c + 1

    lib = objects_library()
    vis, used_vis = visuals_library(), set()
    kept_words = [(comp_frame(words[i]["s"]), re.sub(r"[^a-z]", "", words[i]["w"].lower())) for k in keep for i in S[k]["w"]]

    def word_at(prefix, lo, hi):
        pre = re.sub(r"[^a-z]", "", prefix.lower())
        hit = [c for c, w in kept_words if c is not None and lo <= c <= hi and w.startswith(pre)]
        return min(hit) + 1 if hit else None

    def place_tech(v, f0, sid):
        spg = v.get("spring", "settle")
        start = f0
        for (a, b) in busy:
            if a <= start <= b + 6:
                start = b + 8
        end = min(start + v.get("max_f", 200), total - nt - 2)
        if end - start < 60:
            return None
        top = None
        if not v.get("full_frame"):
            top = free_band(trk, src_frames(start, end), v.get("h", 410))
            if top is None:
                warn.append(f"tech {v['id']} at f{start}: no face-free band; card instead")
                return None
        props, miss = resolve_props(v["props"], start, end, word_at)
        box = None
        if top is not None:
            props["top"] = max(top, 1150)
            box = {"left": M, "top": props["top"], "w": W - 2 * M, "h": v.get("h", 410)}
        if miss:
            warn.append(f"tech {v['id']}: {miss} word anchor(s) not found; timed from the start")
        busy.append((start, end))
        sl = {"id": f"{v['view']}{len(slots)}", "kind": "tech", "view": v["view"], "start": start, "end": end, "spring": spg, "visual": v["id"], **({"box": box} if box else {}),
              "sfx": {"name": v["hero"], "frame": start + first_reach(spg), "gain": 0.24} if v.get("hero") else None, "props": props}
        slots.append(sl)
        used_vis.add(v["id"])
        return sl

    events = []
    for b in m.get("beats", []):
        events.append(("argument", b["sentence"], b.get("key_word"), b))
    for t in m.get("terms", []):
        events.append(("term", t["sentence"], t.get("term", "").split()[-1] if t.get("term") else None, t))
    for o in m.get("objects", []):
        events.append(("object", o["sentence"], (o.get("name") or "").split()[-1], o))
    def S_on(sid):  # the sentence's first word onset
        c = comp_frame(S[sid]["s"])
        return c + 1 if c is not None else None

    for kind, sid, key, e in sorted(events, key=lambda e: (onset(e[1], e[2]) or 1e9)):
        f0 = onset(sid, key)
        if f0 is None:
            continue
        if kind == "argument":
            txt = S[sid]["text"]
            v = next((v for v in vis if v["id"] not in used_vis and re.search(v["match"], txt, re.I)), None)
            if v and place_tech(v, f0 if v.get("full_frame") else S_on(sid), sid):
                continue
            if not v:
                wish.append({"reel": reel_id, "want": f"technical visual for: {txt[:90]}", "at_frame": f0, "used_instead": "argument card"})
            role = preset["roles"].get(e.get("role"), e.get("role", ""))
            place("argument", f0, spec["argument"]["hold_f"], 230,
                  lambda top, e=e, role=role: {"text": {"caps": role, "title": e.get("title", ""), **({"line": e["line"]} if e.get("line") else {})}, "box": {"left": M, "top": top, "w": W - 2 * M}})
        elif kind == "term":
            def term_extra(top, e=e, f0=f0):
                fs = src_frames(f0, f0 + 1)[0]
                fb = (faces_at(trk, fs) or [[300, 500, 480, 640]])[0]
                reg = e.get("region", "none")
                fx, fy, fw, fh = fb
                frac = {"eyes": (0.22, 0.42), "cheeks": (0.45, 0.65), "lips": (0.62, 0.8), "jaw": (0.72, 0.98), "forehead": (0.05, 0.3), "neck": (0.95, 1.25)}.get(reg, (0.3, 0.8))
                cy = fy + fh * (frac[0] + frac[1]) / 2
                cw = fw * 0.95
                crop = {"x": round(fx + fw / 2 - cw / 2), "y": round(cy - cw * 0.76 / 2), "w": round(cw), "h": round(cw * 0.76)}
                return {"text": {"caps": "Example", "title": e.get("term", "")}, "at": round(fs / FPS, 3), "crop": crop, "top": top,
                        "box": {"left": (W - 540) / 2, "top": top, "w": 540}}
            place("term", f0, spec["term"]["hold_f"], 400, term_extra)
        elif kind == "object":
            p = find_object(e.get("name", ""), lib)
            if p is None:
                wish.append({"reel": reel_id, "want": f"real cut-out: {e.get('name')}", "at_frame": f0, "used_instead": "argument card"})
                place("argument", f0, spec["argument"]["hold_f"], 230,
                      lambda top, e=e: {"text": {"caps": "Named", "title": e.get("name", "")}, "box": {"left": M, "top": top, "w": W - 2 * M}, "wish": f"cut-out {e.get('name')}"})
            else:
                from PIL import Image
                iw, ih = Image.open(p).size
                place("object", f0, spec["object"]["hold_f"], 360, lambda top, p=p, e=e, iw=iw, ih=ih: {
                    "src": str(p.relative_to(PUB)).replace("\\", "/"), "aspect": round(iw / ih, 3), "text": {"label": e.get("name", "")},
                    "box": {"left": 540, "top": top, "w": 420}})
    # the end card over the tail
    es = total - nt
    slots.append({"id": "end", "kind": "end", "start": es, "end": total, "spring": spec["end"]["spring"], "hold": True,
                  "sfx": {"name": spec["end"]["sfx"], "frame": es + first_reach(spec["end"]["spring"]), "gain": 0.16}, "box": {"left": 119, "top": 691, "w": 842}})
    slots = [s for s in slots if s.get("sfx") is not None] + [{k: v for k, v in s.items() if k != "sfx"} for s in slots if s.get("sfx") is None]
    slots.sort(key=lambda s: s["start"])
    tl = {"schema": "fast/1", "reel": reel_id, "preset": preset["preset"], "fps": FPS, "durationInFrames": total, "clip": f"fast/{reel_id}/talk.mp4",
          "pieces": pieces, "captions": caps, "keywords": m.get("keywords", []), "slots": slots, "warnings": warn}
    (d / "timeline.json").write_text(json.dumps(tl, indent=1), encoding="utf-8")
    return tl, wish


# ---------------------------------------------------------------- 4 checks
def check_cuts(tl, words, sents, db, floor):
    ends = {round(s["e"], 3) for s in sents}
    rows = []
    for p in tl["pieces"]:
        if p["id"] == "tail":
            continue
        # every kept word whole inside the piece, the cut not inside a word, and in a gap >= 80 ms
        inside = [w for w in words if w["s"] < p["out"] and w["e"] > p["in"]]
        cut_word = [w for w in inside if w["s"] < p["in"] - 0.01 or w["e"] > p["out"] + 0.01]
        last = max((w for w in inside), key=lambda w: w["e"], default=None)
        sent_end = last is not None and any(abs(last["e"] - e) < 0.002 for e in ends)
        k0, k1 = int(p["out"] * 100), int(p["in"] * 100)
        quiet_out = bool(len(db) > k0 and db[max(0, k0 - 4): k0 + 4].max() < floor + 8)
        quiet_in = bool(db[max(0, k1 - 4): k1 + 4].max() < floor + 8) if k1 > 4 else True
        rows.append({"piece": p["id"], "ends_on_sentence": sent_end, "cuts_a_word": bool(cut_word), "quiet_in": quiet_in, "quiet_out": quiet_out})
    ok = all(r["ends_on_sentence"] and not r["cuts_a_word"] and r["quiet_out"] for r in rows)
    return {"pass": ok, "pieces": rows}


def check_faces(tl, trk):
    hits = []
    for s in tl["slots"]:
        b = s.get("box")
        if not b or s["kind"] in ("end",):
            continue
        hh = b.get("h") or {"title": 260, "argument": 230, "term": 400, "object": 360}.get(s["kind"], 300)
        for c in range(s["start"], s["end"] + 1, 6):
            p = max((p for p in tl["pieces"] if p["at"] <= c), key=lambda p: p["at"])
            sf = int(round((p["in"] + (c - p["at"]) / FPS) * FPS))
            for fx, fy, fw, fh in faces_at(trk, sf):
                if not (b["left"] > fx + fw or b["left"] + b["w"] < fx or b["top"] > fy + fh or b["top"] + hh < fy):
                    hits.append({"slot": s["id"], "frame": c}); break
    return {"pass": not hits, "overlaps": hits[:20], "n": len(hits)}


def check_hold(tl):
    bad = []
    for s in tl["slots"]:
        if s["kind"] in ("title", "argument", "term"):
            lit = s["end"] - (s["start"] + first_reach(s["spring"]))
            if lit < 60:
                bad.append({"slot": s["id"], "lit_f": lit})
        if s["kind"] == "object" and s["end"] - (s["start"] + first_reach(s["spring"])) < 48:
            bad.append({"slot": s["id"], "lit_f": s["end"] - s["start"]})
    return {"pass": not bad, "short": bad}


def check_audio(tl, work: Path, d: Path):
    segs = [p for p in tl["pieces"] if not p.get("muted")]
    f = "".join(f"[0:a]atrim={p['in']}:{p['out']},asetpts=PTS-STARTPTS[a{i}];" for i, p in enumerate(segs)) + "".join(f"[a{i}]" for i in range(len(segs))) + f"concat=n={len(segs)}:v=0:a=1,ebur128=peak=true[o]"
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(work), "-filter_complex", f, "-map", "[o]", "-f", "null", "-"], capture_output=True, text=True)
    I = re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr); TP = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r.stderr)
    if not I:
        return {"pass": False, "error": r.stderr[-300:]}
    I, TP = float(I[-1]), float(TP[-1]) if TP else 0.0
    gain = -14 - I
    return {"pass": TP < -0.1 and I > -40, "integrated_lufs": I, "true_peak_dbtp": TP, "gain_to_-14": round(gain, 2),
            "peak_after_gain": round(TP + gain, 2), "limiter_needed": TP + gain > -1.0,
            "note": "the render masters to -14 LUFS / -1 dBTP (limiter when peak_after_gain > -1)"}


def comprehension(tl, m, preset, sents, words):
    S = {s["id"]: s for s in sents}
    cut = " ".join(S[k]["text"] for p in tl["pieces"] if p["id"] != "tail" for k in p["sentences"])
    screen = [f"{s['kind']}: " + " / ".join(str(v) for v in (s.get("text") or {}).values()) for s in sorted(tl["slots"], key=lambda s: s["start"]) if s.get("text")]
    roles = preset["roles"]
    q = f"""You are seeing a short medical video for the first time, as its transcript and on-screen text only.
Transcript: {cut}
On-screen text, in order: {json.dumps(screen)}
Answer each question in one plain sentence from this material only. Then list anything confusing or contradictory (quote it), or [] if nothing.
Questions (key: question): {json.dumps({k: f'{v}: what does the video say?' for k, v in roles.items()})}
Answer with ONE JSON object only: {{"answers": {{<key>: "..."}}, "confusing": []}}"""
    a, err = claude_json(q)
    if a is None:
        return {"pass": None, "error": err}
    j = f"""Map (what the editor intended): {json.dumps(m.get('fields', {}))}
A first-time viewer's answers: {json.dumps(a.get('answers', {}))}
For each key in the map, does the viewer's answer say the same thing (true/false)? Answer with ONE JSON object only: {{"match": {{<key>: true}}, "notes": "one line"}}"""
    v, err2 = claude_json(j)
    match = (v or {}).get("match", {})
    ok = bool(match) and all(match.values()) and not a.get("confusing")
    return {"pass": ok, "answers": a.get("answers"), "confusing": a.get("confusing"), "match": match, "notes": (v or {}).get("notes", err2)}


def run_tool(args):
    r = subprocess.run([PY, "-I", *args], capture_output=True, text=True, cwd=ROOT)
    return {"pass": r.returncode == 0, "tail": (r.stdout.strip().splitlines() or [""])[-1]}


# ---------------------------------------------------------------- 5 studio
def studio(reel_id):
    import socket, urllib.request
    (PUB / "fast/current.json").write_text(json.dumps({"reel": reel_id}))
    port = next(p for p in range(3100, 3200) if socket.socket().connect_ex(("127.0.0.1", p)) != 0)
    log = PUB / "fast" / reel_id / "studio.log"
    flags = 0x00000008 | 0x00000200 if os.name == "nt" else 0  # DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP: it outlives make-reel
    with open(log, "w") as lf:
        subprocess.Popen(f"npx remotion studio src/fast/index.ts --port {port} --no-open", cwd=RM, shell=True, stdout=lf, stderr=subprocess.STDOUT, creationflags=flags)
    for _ in range(120):
        time.sleep(1)
        try:
            if urllib.request.urlopen(f"http://localhost:{port}/", timeout=2).status == 200:
                return f"http://localhost:{port}/FastReel"
        except Exception:
            pass
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("clip"); ap.add_argument("preset"); ap.add_argument("--id")
    ap.add_argument("--no-studio", action="store_true"); ap.add_argument("--skip-dead", action="store_true")
    a = ap.parse_args()
    t_all = time.time()
    src = Path(a.clip).resolve()
    preset = json.loads((RM / "presets" / f"{a.preset}.json").read_text())
    reel_id = a.id or f"{src.stem.lower()}-{a.preset}"
    d = PUB / "fast" / reel_id
    d.mkdir(parents=True, exist_ok=True)

    @timed("1 transcribe + track")
    def s1():
        work = work_copy(src, d)
        w = wav16(work, d)
        tr = transcribe(w, d)
        trk = track(work, d)
        say(f"   {len(tr['words'])} words, {tr['duration']:.1f} s, {sum(1 for r in trk['faces'] if r[1])}/{len(trk['faces'])} samples with a face")
        return work, w, tr, trk
    work, w, tr, trk = s1()
    words = tr["words"]
    sents = sentences(words)
    db, floor = envelope(w)

    @timed("2 argument map")
    def s2():
        m = argument_map(sents, preset, d)
        say(f"   {m.get('reader')}: title '{m.get('title')}', keep {len(m['keep'])}/{len(sents)} sentences, {len(m.get('beats', []))} beats, "
            f"{len(m.get('terms', []))} terms, {len(m.get('objects', []))} objects")
        return m
    m = s2()

    @timed("3 fill the preset")
    def s3():
        tl, wish = fill(preset, sents, words, m, db, floor, trk, d, reel_id)
        say(f"   {tl['durationInFrames']} f ({tl['durationInFrames'] / FPS:.1f} s), {len(tl['pieces']) - 1} pieces, {len(tl['slots'])} slots, {len(tl['captions'])} caption phrases")
        for x in tl["warnings"]:
            say("   warn:", x)
        if wish:
            wl = ROOT / "research/ostad/WISHLIST.md"
            with open(wl, "a", encoding="utf-8") as f:
                for x in wish:
                    f.write(f"| {datetime.date.today()} | {x['reel']} | {x['want']} | f{x['at_frame']} | {x['used_instead']} |\n")
            say(f"   {len(wish)} wishlist item(s) -> research/ostad/WISHLIST.md")
        return tl
    tl = s3()

    @timed("4 checks")
    def s4():
        C = {}
        C["motion_lint"] = run_tool(["tools/motion_lint.py"])
        C["banned_lint"] = run_tool(["tools/banned_lint.py"])
        C["sfx_check"] = run_tool(["tools/sfx_check.py", str(d / "timeline.json")])
        C["cuts_on_sentence_end"] = check_cuts(tl, words, sents, db, floor)
        C["faces_clear"] = check_faces(tl, trk)
        C["hold_min"] = check_hold(tl)
        C["audio_levels"] = check_audio(tl, work, d)
        t0 = time.time()
        C["comprehension"] = comprehension(tl, m, preset, sents, words)
        C["comprehension"]["s"] = round(time.time() - t0, 1)
        if not a.skip_dead:
            t0 = time.time()
            C["dead_frames"] = run_tool(["tools/dead_frames.py", "--reel", reel_id, "--out", str(d / "dead_frames.json")])
            C["dead_frames"]["s"] = round(time.time() - t0, 1)
        (d / "checks.json").write_text(json.dumps(C, indent=1), encoding="utf-8")
        for k, v in C.items():
            say(f"   {k:22s} {'PASS' if v.get('pass') else ('n/a' if v.get('pass') is None else 'FLAG')}  {v.get('tail', '')}")
        return C
    C = s4()
    flagged = [k for k, v in C.items() if v.get("pass") is False]

    url = None
    if not a.no_studio:
        @timed("5 studio")
        def s5():
            return studio(reel_id)
        url = s5()
    T["total"] = round(time.time() - t_all, 1)
    (d / "timings.json").write_text(json.dumps(T, indent=1))
    # the committed record of this reel (no footage: timeline, map, checks, timings)
    rec = ROOT / "research/ostad/fast/reels" / reel_id
    rec.mkdir(parents=True, exist_ok=True)
    for f in ("timeline.json", "argument.json", "ARGUMENT.md", "checks.json", "timings.json"):
        if (d / f).exists():
            shutil.copy2(d / f, rec / f)
    say("\n== done", json.dumps(T))
    say("flagged:", flagged or "none (skip self-grading)")
    say("studio:", url or "(not opened)")


if __name__ == "__main__":
    main()
