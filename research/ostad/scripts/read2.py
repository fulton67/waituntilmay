"""Run 2, phase 2a: serve batches of 25 for reading, store the readers' answers, enforce the distribution guard.
No keyword rules anywhere: every label comes from a reader who read transcript + caption + comments.

python read2.py merge            transcripts/ -> videos.json (transcript, transcript_status, transcript_words, opening_line, closing_line)
python read2.py export           classify2/batch_NN.json, 25 rows each
python read2.py apply            validate + merge classify2/out_*.json into videos.json (bad rows listed, not merged)
python read2.py guard            distributions of genre / hook_type / tone / subject; exit 1 if the guard fails
python read2.py reread FIELD     classify2/reread_FIELD_NN.json: every row holding FIELD's top value, for a second read
"""
import glob, json, re, sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
V, TR, RAW, B = ROOT / "data" / "videos.json", ROOT / "transcripts", ROOT / "raw", ROOT / "classify2"
B.mkdir(exist_ok=True)

GENRES = ["educational-explainer", "myth-bust", "derm-reacts / duet / stitch", "procedure-POV", "before-after",
          "patient-story / testimonial", "routine", "product-review / drugstore-vs-medical", "trend-commentary",
          "day-in-the-life / office", "Q&A / comment-reply", "red-flag / what-not-to-do", "price / what-it-costs",
          "skin-cancer-awareness", "humor / skit", "ad / promo",
          # run 2 additions, because the transcripts showed them
          "hack / tip", "diagnosis / is-it-X", "brand advertorial / sponsored", "personal journey / diary"]
FORMATS = ["talking-head", "talking-head + b-roll", "voiceover-over-procedure", "green-screen", "text-on-screen only",
           "stitch/duet", "vlog", "carousel", "interview / podcast clip", "skit / acted"]
HOOKS = ["question", "contrarian claim", "number/stat", "stop doing X", "curiosity gap", "before/after reveal",
         "story open", "direct address", "reaction",
         "visual shock / gross-out", "credential open", "POV / you-are-the-patient", "promise of a result", "list open"]
TONES = ["clinical", "casual-friend", "confessional", "fear/warning", "humor", "luxury", "contrarian", "reassuring", "salesy"]
SPEAKERS = ["doctor", "nurse/injector", "patient", "influencer", "brand", "other"]
GUARD_FIELDS = ["genre", "hook_type", "tone", "subject"]


def load():
    return json.loads(V.read_text(encoding="utf-8"))


def dump(vids):
    V.write_text(json.dumps(vids, ensure_ascii=False, indent=0), encoding="utf-8")


def sentences(t):
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", t) if s.strip()]


def clip(s, n=200):
    return s if len(s) <= n else s[:n].rsplit(" ", 1)[0] + "…"


def merge():
    vids = load()
    for r in vids:
        meta_f = TR / f"{r['id']}.json"
        if not meta_f.exists():
            r.update(transcript_status="pending")
            continue
        meta = json.loads(meta_f.read_text())
        txt_f = TR / f"{r['id']}.txt"
        t = txt_f.read_text(encoding="utf-8").strip() if txt_f.exists() else ""
        st = meta["status"]
        r["transcript"] = t or None
        r["transcript_status"] = st
        r["transcript_reason"] = meta.get("reason")
        r["transcript_lang"] = meta.get("lang")
        r["transcript_model"] = meta.get("model")
        r["transcript_words"] = len(t.split())
        s = sentences(t)
        r["opening_line"] = clip(s[0]) if s else None
        r["closing_line"] = clip(s[-1]) if len(s) > 1 else None
    dump(vids)
    c = Counter((r["platform"], r["transcript_status"]) for r in vids)
    print(json.dumps({f"{a}/{b}": n for (a, b), n in sorted(c.items())}, indent=1))


def comments_index():
    """top comments per video id from whatever raw/ has: TikTok comments run + IG latestComments."""
    out = {}
    q = RAW / "questions__tiktok-comments.json"
    if q.exists():
        for c in json.loads(q.read_text(encoding="utf-8"))["items"]:
            m = re.search(r"/video/(\d+)", c.get("videoWebUrl") or c.get("submittedVideoUrl") or "")
            if m and c.get("text"):
                out.setdefault("ti_" + m.group(1), []).append((c.get("diggCount") or 0, c["text"]))
    for f in glob.glob(str(RAW / "*.json")):
        d = json.loads(Path(f).read_text(encoding="utf-8"))
        if "instagram" not in d.get("actor", ""):
            continue
        for it in d.get("items", []):
            for c in it.get("latestComments") or []:
                if c.get("text") and it.get("shortCode"):
                    out.setdefault("in_" + it["shortCode"], []).append((c.get("likesCount") or 0, c["text"]))
    return {k: [clip(t, 160) for _, t in sorted(v, key=lambda x: -x[0])[:8]] for k, v in out.items()}


def row_for_reader(r, com):
    t = r.get("transcript") or ""
    w = t.split()
    return dict(id=r["id"], platform=r["platform"], source=r["source"], creator=r["creator_handle"],
                followers=r.get("creator_followers"), duration_s=r["duration_s"], title=r.get("title"),
                caption=(r.get("caption") or "")[:500], on_screen_hook=r.get("on_screen_hook"),
                transcript_status=r.get("transcript_status"),
                transcript=" ".join(w[:450]) + (" …[truncated]" if len(w) > 450 else ""),
                top_comments=com.get(r["id"], []))


def export(size=25):
    vids, com = load(), comments_index()
    for old in B.glob("batch_*.json"):
        old.unlink()
    for i in range(0, len(vids), size):
        rows = [row_for_reader(r, com) for r in vids[i:i + size]]
        (B / f"batch_{i // size:02d}.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(vids)} rows -> {len(range(0, len(vids), size))} batches; {sum(1 for r in vids if com.get(r['id']))} rows have comments")


def check(c):
    errs = []
    if c.get("genre") not in GENRES: errs.append(f"genre={c.get('genre')}")
    if c.get("format") not in FORMATS: errs.append(f"format={c.get('format')}")
    if c.get("hook_type") not in HOOKS: errs.append(f"hook_type={c.get('hook_type')}")
    tone = c.get("tone")
    if not isinstance(tone, list) or not 1 <= len(tone) <= 2 or any(t not in TONES for t in tone): errs.append(f"tone={tone}")
    if c.get("speaker") not in SPEAKERS: errs.append(f"speaker={c.get('speaker')}")
    if not isinstance(c.get("makeable_by_ostad"), bool): errs.append("makeable")
    s = c.get("subject") or ""
    if not 2 <= len(s.split()) <= 7: errs.append(f"subject={s!r}")
    if not c.get("claim"): errs.append("claim")
    return errs


KEYS = ("genre", "format", "hook_type", "subject", "claim", "tone", "speaker", "makeable_by_ostad", "makeable_note",
        "audience_reaction")


def apply(pattern="out_*.json"):
    vids = load()
    idx = {r["id"]: r for r in vids}
    n, bad = 0, []
    for p in sorted(B.glob(pattern)):
        for c in json.loads(p.read_text(encoding="utf-8")):
            r = idx.get(c.get("id"))
            errs = ["unknown id"] if not r else check(c)
            if errs:
                bad.append((p.name, c.get("id"), errs)); continue
            for k in KEYS:
                if k in c:
                    r[k] = c[k]
            r["read2"] = True
            n += 1
    dump(vids)
    print(f"applied {n}; rejected {len(bad)}; read {sum(1 for r in vids if r.get('read2'))}/{len(vids)}")
    for b in bad[:40]:
        print("  ", b)


def validate(path):
    """check a reader's out file without merging (parallel readers never write videos.json)"""
    ids = {r["id"] for r in load()}
    rows = json.loads(Path(path).read_text(encoding="utf-8"))
    src = json.loads((B / Path(path).name.replace("out_", "batch_")).read_text(encoding="utf-8")) if (B / Path(path).name.replace("out_", "batch_")).exists() else None
    bad = [(c.get("id"), ["unknown id"] if c.get("id") not in ids else check(c)) for c in rows]
    bad = [b for b in bad if b[1]]
    missing = sorted({r["id"] for r in src} - {c.get("id") for c in rows}) if src else []
    print(f"{path}: {len(rows)} rows, {len(bad)} invalid, {len(missing)} missing")
    for b in bad: print("  ", b)
    for m in missing: print("   missing", m)
    return not bad and not missing


def dist(vids, field):
    vals = []
    for r in vids:
        v = r.get(field)
        vals += v if isinstance(v, list) else [v]
    c = Counter(vals)
    return c, len(vids)


def guard(quiet=False):
    vids = [r for r in load() if r.get("read2")]
    ok, report = True, {}
    for f in GUARD_FIELDS:
        c, n = dist(vids, f)
        top, k = c.most_common(1)[0]
        share = k / n
        report[f] = dict(top=top, share=round(share, 3), distinct=len(c), top5=c.most_common(5))
        if share > 0.35:
            ok = False
    g = report["genre"]["distinct"]
    if g < 6:
        ok = False
    if not quiet:
        print(json.dumps(report, ensure_ascii=False, indent=1))
        print("GUARD", "PASS" if ok else "FAIL", f"({len(vids)} rows read)")
    return ok, report


def reread(field, size=25):
    vids, com = load(), comments_index()
    c, _ = dist([r for r in vids if r.get("read2")], field)
    top = c.most_common(1)[0][0]
    rows = [r for r in vids if (top in r.get(field) if isinstance(r.get(field), list) else r.get(field) == top)]
    for i in range(0, len(rows), size):
        out = [dict(row_for_reader(r, com), current={k: r.get(k) for k in KEYS}) for r in rows[i:i + size]]
        (B / f"reread_{field}_{i // size:02d}.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{field}: top value {top!r} on {len(rows)} rows -> {len(range(0, len(rows), size))} reread batches")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "guard"
    if cmd == "merge": merge()
    elif cmd == "export": export()
    elif cmd == "apply": apply(sys.argv[2] if len(sys.argv) > 2 else "out_*.json")
    elif cmd == "check": sys.exit(0 if all([validate(p) for p in sys.argv[2:]]) else 1)
    elif cmd == "guard": sys.exit(0 if guard()[0] else 1)
    elif cmd == "reread": reread(sys.argv[2])
