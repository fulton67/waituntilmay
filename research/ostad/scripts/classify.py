"""Phase 5 helper. Classification is done by reading, not keyword matching.

python classify.py export [size]      -> classify/batch_NN.json (what a reader needs, unclassified rows only)
python classify.py apply <file.json>  -> merges [{id, genre, format, hook_type, topic_tags, ostad_relevant, why}] into
                                         data/videos.json after validating against the taxonomy
python classify.py status             -> how many rows are classified
"""
import json, sys, pathlib, glob

ROOT = pathlib.Path(__file__).resolve().parents[1]
V = ROOT / "data" / "videos.json"
B = ROOT / "classify"
GENRES = ["educational-explainer", "myth-bust", "derm-reacts / duet / stitch", "procedure-POV", "before-after",
          "patient-story / testimonial", "routine", "product-review / drugstore-vs-medical", "trend-commentary",
          "day-in-the-life / office", "Q&A / comment-reply", "red-flag / what-not-to-do", "price / what-it-costs",
          "skin-cancer-awareness", "humor / skit", "ad / promo"]
FORMATS = ["talking-head", "talking-head + b-roll", "voiceover-over-procedure", "green-screen", "text-on-screen only",
           "stitch/duet", "vlog", "carousel"]
HOOKS = ["question", "contrarian claim", "number/stat", "stop doing X", "curiosity gap", "before/after reveal",
         "story open", "direct address", "reaction"]
EXTRA = ROOT / "classify" / "taxonomy_additions.json"  # genres/formats/hooks added because the data demanded them


def load():
    return json.loads(V.read_text(encoding="utf-8"))


def allowed():
    g, f, h = list(GENRES), list(FORMATS), list(HOOKS)
    if EXTRA.exists():
        x = json.loads(EXTRA.read_text(encoding="utf-8"))
        g += x.get("genre", []); f += x.get("format", []); h += x.get("hook_type", [])
    return g, f, h


def export(size=50):
    B.mkdir(exist_ok=True)
    rows = [r for r in load() if not r.get("genre")]
    for old in B.glob("batch_*.json"):
        old.unlink()
    for i in range(0, len(rows), size):
        batch = [dict(id=r["id"], platform=r["platform"], source=r["source"], creator=r["creator_handle"],
                      query=r["query_or_hashtag"], title=r["title"], caption=(r["caption"] or "")[:600],
                      hook=r["on_screen_hook"], transcript=(r.get("transcript") or "")[:500],
                      duration_s=r["duration_s"], views=r["views"], outlier=r["outlier_score"],
                      yt_type=r.get("yt_type"))
                 for r in rows[i:i + size]]
        (B / f"batch_{i // size:02d}.json").write_text(json.dumps(batch, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(rows)} unclassified -> {len(range(0, len(rows), size))} batches in {B}")


def apply(path):
    g, f, h = allowed()
    vids = load()
    idx = {r["id"]: r for r in vids}
    n, bad = 0, []
    for p in sorted(glob.glob(path)):
        for c in json.loads(pathlib.Path(p).read_text(encoding="utf-8")):
            r = idx.get(c.get("id"))
            if not r:
                bad.append((c.get("id"), "unknown id")); continue
            errs = [k for k, ok in (("genre", c.get("genre") in g), ("format", c.get("format") in f),
                                    ("hook_type", c.get("hook_type") in h)) if not ok]
            if errs:
                bad.append((c["id"], errs, c.get("genre"), c.get("format"), c.get("hook_type"))); continue
            for k in ("genre", "format", "hook_type", "topic_tags", "ostad_relevant", "why"):
                if k in c:
                    r[k] = c[k]
            n += 1
    V.write_text(json.dumps(vids, ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"applied {n}; rejected {len(bad)}")
    for b in bad[:30]:
        print("  ", b)


def status():
    vids = load()
    done = sum(bool(r.get("genre")) for r in vids)
    print(f"{done}/{len(vids)} classified")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    {"export": lambda: export(int(sys.argv[2]) if len(sys.argv) > 2 else 50),
     "apply": lambda: apply(sys.argv[2]), "status": status}[cmd]()
