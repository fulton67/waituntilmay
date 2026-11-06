"""FIX Phase 3: choose the type system from the Adobe visual-search results (fonts/matches.json), nothing by eye.

Per Adobe family and per role (headline vs caption/label), using each crop's Adobe top 5 with rank weights 1..1/5:
    score = board + favourite + 0.5 x instagram
'board' already counts a favourite's crops x3 (fonts_matches.py), and 'favourite' adds the favourite crops once more,
so the 4 favourites weigh most; instagram is the consistency check, at half weight.
Logotype crops (the EQL wordmark, block 7529470) are left out: Adobe can only return look-alikes for a custom wordmark.
Display = best headline score; text = best caption/label score. A mono is kept only if a mono family reaches 10% of the
text winner's score. Losing systems (one plate each): the best display family of every other Adobe classification, and the next display family
of the winner's own classification that is not the winner, each paired with the text winner.
Adobe classification (cl:ss sans, cl:se serif, cl:sl slab, cl:ms mono) comes from each family page's own filter tags,
fetched in the signed-in tab (raw.jsonl rows __family_filters__*). -> fonts/system.json"""
import json, pathlib, re, sys
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")
B = pathlib.Path(__file__).resolve().parents[1]; F = B / "fonts"
LOGOTYPE_BLOCKS = {7529470}
W = [1, 1 / 2, 1 / 3, 1 / 4, 1 / 5]
matches = json.load(open(F / "matches.json", encoding="utf-8"))["matches"]
cls = {}
for l in (F / "adobe" / "raw.jsonl").read_text(encoding="utf-8").splitlines():
    r = json.loads(l)
    if str(r.get("crop", "")).startswith("__family_filters"):
        for slug, v in r["families"].items():
            if v.get("filters"):
                cls[slug] = v["filters"]
CL = {"cl:ss": "sans", "cl:se": "serif", "cl:sl": "slab", "cl:ms": "mono", "cl:sc": "script", "cl:st": "stylized"}

s = defaultdict(lambda: defaultdict(float)); meta = {}
for m in matches:
    if m["block"] in LOGOTYPE_BLOCKS or not m.get("top5"):
        continue
    role = "display" if m["role"] == "headline" else "text"
    for t in m["top5"]:
        w = W[t["rank"] - 1]
        k = t["family_slug"]; meta.setdefault(k, t)
        if m["source"] == "instagram":
            s[k][role + "_ig"] += w
        else:
            s[k][role + "_board"] += w * (3 if m["favourite"] else 1)
            if m["favourite"]:
                s[k][role + "_fav"] += w
def score(k, role):
    d = s[k]; return d[role + "_board"] + d[role + "_fav"] + 0.5 * d[role + "_ig"]
def row(k, role):
    f = cls.get(k, []); t = meta[k]
    return {"family_slug": k, "family": t["family"], "foundry": t["foundry"], "url": t["family_url"],
            "classification": [CL[c] for c in f if c in CL] or ["not tagged on its Adobe page"],
            "contrast": next((c.split(":")[1] for c in f if c.startswith("ct:")), None),
            "score": round(score(k, role), 2), "board": round(s[k][role + "_board"], 2), "favourite": round(s[k][role + "_fav"], 2),
            "instagram": round(s[k][role + "_ig"], 2)}
disp = sorted(s, key=lambda k: -score(k, "display")); text = sorted(s, key=lambda k: -score(k, "text"))
mono = [k for k in text if "cl:ms" in cls.get(k, []) or re.search(r"mono", meta[k]["family"] or k, re.I)]
mono_keep = mono[0] if mono and score(mono[0], "text") >= 0.1 * score(text[0], "text") else None
out = {"rule": __doc__.split("\n\n")[1].strip(), "display_ranked": [row(k, "display") for k in disp[:12]],
       "text_ranked": [row(k, "text") for k in text[:12]], "mono_ranked": [row(k, "text") for k in mono[:5]],
       "chosen": {"display": row(disp[0], "display"), "text": row(text[0], "text"), "mono": row(mono_keep, "text") if mono_keep else None},
       "losing_display": []}
win_cl = set(cls.get(disp[0], [])) & set(CL)
seen_cl = set()
for k in disp[1:]:
    kc = [c for c in cls.get(k, []) if c in CL]
    if not kc: continue
    key = kc[0]
    if key in seen_cl: continue
    seen_cl.add(key); out["losing_display"].append(row(k, "display"))
# weights the crops matched inside the chosen family, per role
vw = defaultdict(lambda: defaultdict(float))
for m in matches:
    if m["block"] in LOGOTYPE_BLOCKS or not m.get("top5"): continue
    role = "display" if m["role"] == "headline" else "text"
    for t_ in m["top5"]:
        if t_["family_slug"] in (disp[0], text[0]): vw[role][t_["variation"]] += W[t_["rank"] - 1]
out["chosen_variations"] = {r: [[v, round(x, 2)] for v, x in sorted(d.items(), key=lambda kv: -kv[1])[:8]] for r, d in vw.items()}
json.dump(out, open(F / "system.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
for name in ("display_ranked", "text_ranked", "mono_ranked"):
    print("==", name)
    for r in out[name][:8]:
        print(f"  {r['family'][:28]:28} {'/'.join(r['classification'])[:12]:12} {r['contrast'] or '':2} score {r['score']:7} board {r['board']:6} fav {r['favourite']:5} ig {r['instagram']:6}")
print("losing:", [r["family"] + " (" + "/".join(r["classification"]) + ")" for r in out["losing_display"]])
print("variations:", out["chosen_variations"])
print("chosen:", {k: (v["family"] if v else None) for k, v in out["chosen"].items()})
