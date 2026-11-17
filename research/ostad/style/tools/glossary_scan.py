"""glossary_scan.py: find every facial / skin term in a reel's transcripts, so each one gets an example on screen.

  python -I research/ostad/style/tools/glossary_scan.py <words_dir> [--props props.json] [--out hits.json]
- words_dir: word JSONs ([{w, t0, t1}]) of every clip.
- --props: the reel's props.json (pieces + words in composition frames), to say which hits are IN THE CUT and at which frame.

Terms come from research/ostad/style/GLOSSARY.md (the table under "## Terms": first column = term, second = matched phrases separated by
" / "). Each hit in the cut must have an example beat on the beat sheet, unless the footage already shows it clearly on the patient
(LESSONS L3). The script prints the hits per term and exits 1 if a term in the cut has no "Shown as" entry in the glossary.
"""
from __future__ import annotations
import argparse, json, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
GLOSS = HERE.parent / "GLOSSARY.md"


def load_terms():
    terms = []
    rows = GLOSS.read_text(encoding="utf-8").split("## Terms", 1)[1].split("\n## ", 1)[0].splitlines()
    for ln in rows:
        if not ln.startswith("| ") or ln.startswith("| Term") or ln.startswith("|---"):
            continue
        c = [x.strip() for x in ln.strip().strip("|").split("|")]
        phrases = [p.strip().lower() for p in c[1].split(" / ") if p.strip()]
        terms.append({"term": c[0], "phrases": phrases, "shown": c[4] if len(c) > 4 else ""})
    return terms


def norm(w):
    return re.sub(r"[^a-z' ]", "", w.lower()).strip()


def scan(words, phrases):
    toks = [norm(w["w"]) for w in words]
    hits = []
    for ph in phrases:
        pt = ph.split()
        for i in range(len(toks) - len(pt) + 1):
            if all(toks[i + k].rstrip("s'") == pt[k].rstrip("s'") or toks[i + k] == pt[k] for k in range(len(pt))):
                hits.append(i)
    return sorted(set(hits))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("words_dir", type=Path)
    ap.add_argument("--props", type=Path)
    ap.add_argument("--out", type=Path)
    a = ap.parse_args()
    terms = load_terms()
    res, missing = [], []
    cut = json.loads(a.props.read_text()) if a.props else None
    for t in terms:
        rec = {"term": t["term"], "in_clips": {}, "in_cut": []}
        for f in sorted(a.words_dir.glob("words_*.json")):
            ws = json.loads(f.read_text())
            h = scan(ws, t["phrases"])
            if h:
                rec["in_clips"][f.stem[6:]] = [round(ws[i]["t0"], 2) for i in h]
        if cut:
            h = scan(cut["words"], t["phrases"])
            rec["in_cut"] = [cut["words"][i]["f"] for i in h]
            if rec["in_cut"] and not t["shown"]:
                missing.append(t["term"])
        res.append(rec)
        if rec["in_clips"] or rec["in_cut"]:
            print(f"{t['term']:22s} clips {sum(len(v) for v in rec['in_clips'].values()):3d}  cut frames {rec['in_cut']}")
    if a.out:
        a.out.write_text(json.dumps({"terms": res, "missing_example": missing}, indent=1))
    print("glossary_scan:", "PASS" if not missing else f"FAIL, no example for {missing}")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
