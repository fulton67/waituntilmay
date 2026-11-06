"""FIX Phase 3: Adobe visual-search results -> fonts/matches.json and fonts/clusters.json.
Input: fonts/adobe/raw.jsonl (one row per search, written by the page script in Naim's signed-in Chrome), fonts/crops.json,
metrics/pixels.json (role per crop), board/blocks.json (favourites, type-driven). Nothing here is read by eye.

Scoring per Adobe family: rank weights 1, 1/2, 1/3, 1/4, 1/5 for the top 5 of each crop; a favourite's crops count x3.
Board and Instagram are scored separately, and per role (headline vs caption/label), so display and text are chosen on the
crops that play that role. Coverage = distinct board blocks whose top 5 include the family. Run with brand-venv python -I."""
import json, pathlib, re, sys
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")
B = pathlib.Path(__file__).resolve().parents[1]
F = B / "fonts"
raw = [json.loads(l) for l in (F / "adobe" / "raw.jsonl").read_text(encoding="utf-8").splitlines()]
good, errs, second = {}, defaultdict(list), {}
for r in raw:
    name = pathlib.Path(r["crop"]).name
    if name.startswith("__"):  # bookkeeping rows: family filter tags, #2 adds for logotype crops
        if name.startswith("__second__"): second[name[len("__second__"):]] = r
        continue
    if r.get("error"):
        errs[name].append(r["error"])
    elif r.get("activation"):
        good[name] = r  # last good search per crop wins
crops = {pathlib.Path(c["crop"]).name: c for c in json.load(open(F / "crops.json", encoding="utf-8"))}
roles = {pathlib.Path(r["crop"]).name: r["role"] for r in json.load(open(B / "metrics" / "pixels.json", encoding="utf-8"))["regions"]}
blocks = {str(b["id"]): b for b in json.load(open(B / "board" / "blocks.json", encoding="utf-8"))}

matches = []
for name, c in crops.items():
    r = good.get(name)
    row = {"crop": f"fonts/crops/{name}", "block": c["block"], "source": c.get("source", "board"), "text": c["text"],
           "ocr_conf": c["ocr_conf"], "role": roles.get(name), "favourite": c.get("favourite", False),
           "type_driven": bool(blocks.get(str(c["block"]), {}).get("type_driven"))}
    if r:
        rec = F / "adobe" / (pathlib.Path(name).stem + ".png")
        row.update({"adobe_results_url": r["results_url"], "similar_count": r["similar_count"],
                    "top5": [{k: t.get(k) for k in ("rank", "variation", "family", "family_slug", "foundry", "family_url", "postscript")} for t in r["top"]],
                    "added": {"variation": r["added_variation"], "family": r["added_family"], "family_url": r["top"][0]["family_url"], "activation": r["activation"]},
                    "screenshot": f"fonts/adobe/{rec.name}" if rec.exists() else None})
        if c["block"] in (7529470,):  # the EQL wordmark is a logotype: #2 is added too (FIX.md)
            row["logotype"] = True
            if name in second:
                row["added_second"] = {"variation": second[name]["variation"], "family_slug": second[name]["family_slug"], "activation": second[name]["activation"]}
            else:
                row["added_second"] = {"variation": r["top"][1]["variation"], "family_slug": r["top"][1]["family_slug"], "activation": "same font added from another EQL crop"}
    else:
        row["error"] = errs.get(name) or ["not searched"]
    matches.append(row)

W = [1, 1 / 2, 1 / 3, 1 / 4, 1 / 5]
fam = defaultdict(lambda: {"family": None, "foundry": None, "url": None, "board": 0.0, "ig": 0.0, "headline": 0.0, "body": 0.0,
                           "fav": 0.0, "first_place": 0, "blocks": set(), "ig_posts": set(), "favourite_blocks": set(), "variations": defaultdict(float)})
for m in matches:
    for t in m.get("top5", []):
        f = fam[t["family_slug"]]
        f["family"] = f["family"] or t["family"]; f["foundry"] = f["foundry"] or t["foundry"]; f["url"] = f["url"] or t["family_url"]
        w = W[t["rank"] - 1] * (3 if m["favourite"] else 1)
        f["variations"][t["variation"]] += w
        if m["source"] == "instagram":
            f["ig"] += w; f["ig_posts"].add(m["block"])
        else:
            f["board"] += w; f["blocks"].add(m["block"])
            if m["favourite"]:
                f["fav"] += w; f["favourite_blocks"].add(m["block"])
        if m["role"] == "headline":
            f["headline"] += w
        elif m["role"] in ("caption", "label"):
            f["body"] += w
        if t["rank"] == 1:
            f["first_place"] += 1
out = []
for slug, f in fam.items():
    out.append({"family_slug": slug, "family": f["family"], "foundry": f["foundry"], "url": f["url"], "board_score": round(f["board"], 2),
                "instagram_score": round(f["ig"], 2), "headline_score": round(f["headline"], 2), "body_score": round(f["body"], 2),
                "favourite_score": round(f["fav"], 2), "first_place": f["first_place"], "board_blocks": len(f["blocks"]),
                "instagram_posts": len(f["ig_posts"]), "favourite_blocks": sorted(f["favourite_blocks"]),
                "mono": bool(re.search(r"mono|code|courier|typewriter", (f["family"] or slug), re.I)),
                "top_variations": [v for v, _ in sorted(f["variations"].items(), key=lambda kv: -kv[1])[:4]]})
out.sort(key=lambda x: -(x["board_score"] + x["instagram_score"]))
json.dump({"n_crops": len(crops), "searched": len(good), "errors": len(errs) - len([e for e in errs if e in good]), "families": len(out),
           "scoring": "rank weights 1,1/2,1/3,1/4,1/5 over each crop's Adobe top 5; favourite crops x3", "families_ranked": out},
          open(F / "clusters.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
added = sorted({(m["added"]["family"], m["added"]["activation"]) for m in matches if m.get("added")})
json.dump({"method": "Adobe Fonts visual search in Naim's signed-in Chrome; crop uploaded to Adobe's own file input; top 5 read from the result cards' data; Add font clicked on #1. Nothing in this file is by eye.",
           "searched": len(good), "of": len(crops), "matches": matches}, open(F / "matches.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print("searched", len(good), "of", len(crops), "| families", len(out), "| added families", len({a[0] for a in added}))
for x in out[:15]:
    print(f"{x['family'][:34]:34} {x['foundry'] or '':14} board {x['board_score']:6} ig {x['instagram_score']:6} head {x['headline_score']:6} body {x['body_score']:6} fav {x['favourite_score']:5} 1st {x['first_place']:3} blocks {x['board_blocks']}")
