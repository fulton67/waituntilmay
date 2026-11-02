"""Run 2, phase 2c. The reader proposes the questions and which videos address each (classify2/cares_draft.json);
this script does the counting and the ranking, so the numbers are computed, not judged.

draft: [{"q": "<in the audience's words>", "ids": [...], "ostad": "<what he has on it today>", "note": "<one or two sentences>"}]
rank  = videos addressing it (niche only) × (1 + log10(median × usual of those videos, floored at 0.1)), top 25.
who   = "doctors" if ≥ 60% of the addressing videos are doctor/nurse-led, "influencers" if ≥ 60% are influencer/patient/brand, else "both".
"""
import json, math, statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
vids = {v["id"]: v for v in json.loads((ROOT / "data" / "videos.json").read_text(encoding="utf-8"))}
draft = json.loads((ROOT / "classify2" / "cares_draft.json").read_text(encoding="utf-8"))
out, bad = [], []
for c in draft:
    ids = [i for i in dict.fromkeys(c["ids"]) if i in vids]
    bad += [i for i in c["ids"] if i not in vids]
    niche = [vids[i] for i in ids if vids[i]["source"] != "own"]
    if not niche:
        continue
    mx = statistics.median(v["outlier_score"] for v in niche)
    doc = sum(v["speaker"] in ("doctor", "nurse/injector") for v in niche) / len(niche)
    who = "doctors" if doc >= 0.6 else "influencers" if doc <= 0.4 else "both doctors and influencers"
    score = len(niche) * (1 + math.log10(max(mx, 0.1)))
    ids.sort(key=lambda i: (not vids[i].get("makeable_by_ostad"), -vids[i]["outlier_score"]))
    out.append(dict(q=c["q"], n=len(niche), medX=round(mx, 2), who=who, ostad=c["ostad"], note=c["note"], ids=ids, score=round(score, 2)))
out.sort(key=lambda c: -c["score"])
out = out[:25]
for i, c in enumerate(out):
    c["rank"] = i + 1
(ROOT / "data" / "cares.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"{len(draft)} drafted -> {len(out)} ranked; unknown ids: {bad[:10]}")
for c in out:
    print(f"{c['rank']:>2}. n={c['n']:>3} med={c['medX']:>5}× {c['who'][:11]:<11} {c['q'][:80]}")
