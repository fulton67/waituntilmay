"""Reel timelines (brand/remotion/timelines/<reel>.json): load, resolve anchors to composition frames, validate.
The same resolver as brand/remotion/src/timeline/timeline.ts; keep the two in step. Schema: brand/remotion/REELS.md.
  python -I brand/scripts/timeline_lib.py [file ...]      validate (default: every file in brand/remotion/timelines)
"""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
REM = ROOT / "brand/remotion"
TL = REM / "timelines"
LANES = ["footage", "captions", "titles", "plates", "objects", "markup", "sfx"]

def norm(s): return re.sub(r"[^a-z0-9']", "", s.lower())

def path_for(reel, version=None):
    """timelines/<reel>.<version>.json when it exists (a frozen, delivered version), else the working timelines/<reel>.json"""
    if version and (TL / f"{reel}.{version}.json").exists(): return TL / f"{reel}.{version}.json"
    return TL / f"{reel}.json"

def load(p): return json.loads(Path(p).read_text(encoding="utf-8"))
def transcript(tl): return json.loads((REM / tl["transcript"]).read_text(encoding="utf-8"))

def word_index(a, P):
    ws = P["words"]
    if not a.get("text"): return a["word"]
    t = norm(a["text"])
    if 0 <= a["word"] < len(ws) and norm(ws[a["word"]]["w"]) == t: return a["word"]
    hits = [i for i, w in enumerate(ws) if norm(w["w"]) == t]
    if not hits: raise KeyError(f'word "{a["text"]}" (index {a["word"]}) is not in the transcript')
    return min(hits, key=lambda i: abs(i - a["word"]))

def pieces_of(name, P, exact=False):
    if exact: return [x for x in P["pieces"] if x["id"] == name]
    return [x for x in P["pieces"] if x["id"] == name or x.get("line") == name or (len(x["id"]) == len(name) + 1 and x["id"].startswith(name) and x["id"][-1] in "xyz")]

def resolve(a, tl, P, seen=()):
    off = a.get("offset", 0)
    if "frame" in a: return a["frame"] + off
    if "word" in a:
        w = P["words"][word_index(a, P)]
        return (w["f1"] if a.get("edge") == "end" else w["f"]) + off
    if "cue" in a:
        if a["cue"] == "end": return P["durationInFrames"] + off
        return P["cues"][a["cue"]] + off
    if "piece" in a:
        ps = pieces_of(a["piece"], P, a.get("exact", False))
        if not ps: raise KeyError(f'piece {a["piece"]} missing')
        return (ps[-1]["at"] + ps[-1]["dur"] if a.get("edge") == "end" else ps[0]["at"]) + off
    if "beat" in a:
        key = (a["beat"], a.get("edge", "start"))  # a beat's end may be its own start + n
        if key in seen: raise ValueError(f'beat anchors loop through {a["beat"]}')
        b = next((x for x in tl["beats"] if x["id"] == a["beat"]), None)
        if b is None: raise KeyError(f'beat {a["beat"]} missing')
        return resolve(b["end"] if a.get("edge") == "end" else b["start"], tl, P, seen + (key,)) + off
    raise ValueError(f"not an anchor: {a}")

def anchors(o, path=""):
    """every anchor object inside a beat, with its JSON path"""
    if isinstance(o, dict):
        if any(k in o for k in ("word", "cue", "piece", "beat", "frame")) and not ("id" in o and "lane" in o): yield path, o; return
        for k, v in o.items(): yield from anchors(v, f"{path}.{k}" if path else k)
    elif isinstance(o, list):
        for i, v in enumerate(o): yield from anchors(v, f"{path}[{i}]")

def validate(tl, P=None):
    P = P or transcript(tl)
    errs, ids = [], set()
    for k in ("schema", "reel", "version", "comp", "fps", "transcript", "beats"):
        if k not in tl: errs.append(f"missing key {k}")
    for b in tl.get("beats", []):
        bid = b.get("id", "?")
        if bid in ids: errs.append(f"{bid}: duplicate id")
        ids.add(bid)
        if b.get("lane") not in LANES: errs.append(f"{bid}: lane {b.get('lane')!r} not one of {LANES}")
        for path, a in anchors({k: v for k, v in b.items() if k not in ("id", "lane")}):
            try:
                resolve(a, tl, P)
                if "word" in a and a.get("text") and word_index(a, P) != a["word"]: errs.append(f"{bid}.{path}: note: word \"{a['text']}\" moved {a['word']} -> {word_index(a, P)} (re-found by text)")
            except Exception as e: errs.append(f"{bid}.{path}: {e}")
        try:
            s, e = resolve(b["start"], tl, P), resolve(b["end"], tl, P)
            if e < s: errs.append(f"{bid}: ends ({e}) before it starts ({s})")
        except Exception as e:
            if "start" not in b or "end" not in b: errs.append(f"{bid}: needs start and end")
    return errs

def resolved(tl, P=None):
    """the beats with start_f / end_f (composition frames): what the view and the manifest show"""
    P = P or transcript(tl)
    out = []
    for b in tl["beats"]:
        out.append({"id": b["id"], "lane": b["lane"], "device": b.get("device"), "start_f": resolve(b["start"], tl, P), "end_f": resolve(b["end"], tl, P)})
    return out

if __name__ == "__main__":
    files = [Path(x) for x in sys.argv[1:]] or sorted(TL.glob("*.json"))
    bad = 0
    for f in files:
        tl = load(f)
        try: errs = validate(tl)
        except FileNotFoundError as e: print(f"{f.name}: transcript not on disk yet ({tl.get('transcript')})"); bad += 1; continue
        hard = [e for e in errs if ": note:" not in e]
        print(f"{f.name}: {len(tl['beats'])} beats, {len(hard)} errors, {len(errs) - len(hard)} notes")
        for e in errs: print("  ", e)
        bad += len(hard)
    sys.exit(1 if bad else 0)
