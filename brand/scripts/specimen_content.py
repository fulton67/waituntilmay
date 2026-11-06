"""FIX Phase 3: specimen content, all real. Board headlines = OCR of board headline crops, stacked lines joined in reading order
(crops.json boxes); captions = first sentence of 3 of Dr. Ostad's Instagram captions (existing/posts.json);
procedures = the 5 most-mentioned entries of research/ostad/refs/procedures.json whose category is a treatment (not a condition
or skincare). Grounds = the three photographic favourites. -> fonts/specimen/content.json"""
import json, pathlib, re, sys
sys.stdout.reconfigure(encoding="utf-8")
B = pathlib.Path(__file__).resolve().parents[1]; ROOT = B.parent
crops = json.load(open(B / "fonts" / "crops.json", encoding="utf-8"))
def stack(block, idx):
    cs = sorted([c for c in crops if c["block"] == block and int(pathlib.Path(c["crop"]).stem.rsplit("_", 1)[1]) in idx], key=lambda c: c["box"][1])
    return " ".join(c["text"].strip() for c in cs)
headlines = [stack(32197302, {3, 0, 1, 2}), stack(38944212, {0})]
posts = {p["shortCode"]: p for p in json.load(open(B / "existing" / "posts.json", encoding="utf-8"))}
first = lambda s: re.split(r"(?<=[.!?])\s", s.strip(), 1)[0]
cap_ids = [k for k, p in posts.items() if re.match(r"(Where surgical precision|Just because a treatment|Strength is part)", p["caption"] or "")]
captions = [first(posts[k]["caption"]) for k in cap_ids]
procs = json.load(open(ROOT / "research" / "ostad" / "refs" / "procedures.json", encoding="utf-8"))
TREAT = {"filler", "neurotoxin", "body", "RF/energy", "regenerative", "laser"}
top = [p for p in sorted(procs, key=lambda p: -len(p.get("mentioned_in", []))) if p["category"] in TREAT][:5]
procedures = [re.sub(r"\s*\(.*?\)", "", p["name"]).strip() for p in top]
out = {"headlines": headlines, "headline_source": "board blocks 32197302 (crops 3,0,1,2) and 38944212 (crop 0), OCR text",
       "captions": captions, "caption_source": [f"existing/posts.json {k}" for k in cap_ids],
       "procedures": procedures, "procedure_source": [p["id"] for p in top], "grounds": ["14664481", "41911984", "2145281"],
       "grounds_source": "board favourites with a photograph (SIJO, Seed, Reve Humide); EQL 7529470 is a logotype grid"}
json.dump(out, open(B / "fonts" / "specimen" / "content.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(json.dumps(out, ensure_ascii=False, indent=1))
