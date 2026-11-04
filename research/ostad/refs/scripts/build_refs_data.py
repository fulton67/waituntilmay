"""Verdicts -> the library.

in : cache/to_judge.json, cache/fetched.json, sheets/*.verdict.json, procedures.json, seeds.py, cache/search_log.json (optional)
out: refs.json, sources.json, GAPS.md, arena-import.csv, img/{pid}/{id}.{ext},
     public/ostad/refs/{pid}/{id}.webp (600 px), app/ostad/data/refs*.json
"""
import json, pathlib, re, shutil, csv, sys, statistics
from collections import Counter, defaultdict
from urllib.parse import urlparse
from PIL import Image
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from seeds import SEEDS

Image.MAX_IMAGE_PIXELS = 200_000_000
R = pathlib.Path(__file__).resolve().parents[1]          # research/ostad/refs
REPO = R.parents[2]
C = R / "cache"
PUB = REPO / "public/ostad/refs"
APP = REPO / "app/ostad/data"
procs = json.load(open(R / "procedures.json", encoding="utf-8"))
P = {p["id"]: p for p in procs}
cands = {c["id"]: c for c in json.load(open(C / "to_judge.json", encoding="utf-8"))}
meta = json.load(open(C / "fetched.json", encoding="utf-8"))

# ---------- verdicts ----------
verd = {}
for f in sorted((R / "sheets").glob("*.verdict.json")):
    legend = json.load(open(str(f).replace(".verdict.json", ".json"), encoding="utf-8"))
    tiles = {t["i"]: t for t in legend["tiles"]}
    for v in json.load(open(f, encoding="utf-8")):
        t = tiles.get(v["i"])
        if t:
            verd[t["id"]] = {**v, "pid": legend["pid"]}
judged = len(verd)
keep = [cid for cid, v in verd.items() if v.get("keep")]
# AI-generated images (generator names left in the filename) invent anatomy and garble labels: never a reference
AI = re.compile(r"chatgpt|dall-?e|midjourney|images\.openai\.com|ai[-_ ]generated|stable[-_ ]diffusion|gemini[-_]generated", re.I)
ai_drop = [cid for cid in keep if AI.search(cands[cid].get("image", "") + " " + cands[cid].get("title", ""))]
keep = [cid for cid in keep if cid not in set(ai_drop)]
print(f"dropped {len(ai_drop)} AI-generated keepers")

# ---------- sources ----------
TWO = {"co.uk", "com.au", "co.kr", "co.jp", "com.br", "co.in", "org.uk", "ac.uk", "com.sg", "co.nz", "com.tr", "com.mx"}
def regdom(host):
    host = host.lower().split(":")[0]
    host = re.sub(r"^www\d?\.", "", host)
    parts = host.split(".")
    if len(parts) >= 3 and (".".join(parts[-2:]) in TWO or (len(parts[-1]) == 2 and parts[-2] in {"com", "co", "org", "net", "ac", "gov", "edu", "or", "ne"})):
        return ".".join(parts[-3:])
    return ".".join(parts[-2:]) if len(parts) >= 2 else host
seed_by_dom = []
for s in SEEDS:
    for d in s[4]:
        seed_by_dom.append((d, s))
def source_for(c):
    host = urlparse(c.get("page") or c["image"]).netloc.lower()
    img_host = urlparse(c["image"]).netloc.lower()
    for d, s in seed_by_dom:
        if d in host or (c.get("via") == "epmc" and d in img_host):
            return s[0]
    return regdom(host)

KIND_HINT = [
    (r"journal|ncbi|pubmed|mdpi|frontiersin|springer|wiley|elsevier|sciencedirect|nature\.com|tandfonline|dovepress|karger|thieme|plos|biomedcentral|hindawi|cureus|jamanetwork|oup\.com|lww\.com|researchgate|semanticscholar|ijdvl|e-?jcs|jcadonline|bmj", "journal/open-access"),
    (r"kenhub|teachme|visiblebody|3d4medical|anatomy|wikimedia|wikipedia|innerbody|getbodysmart|radiopaedia|osmosis|lecturio|statpearls", "anatomy-platform"),
    (r"behance|dribbble|artstation|medicalillustration|illustrat|animation|studio|nucleus|scientificanimations|biorender|art\b", "illustration-studio"),
    (r"academy|institute|training|course|education|university|\.edu|derm(atology)?times|practicaldermatology|aestheticsjournal|prime-journal|pmfa|learn|school", "educator"),
    (r"clinic\.org|mayoclinic|hopkins|nhs\.uk|aad\.org|plasticsurgery\.org|asds|isaps|aafprs|society|association|foundation|skincancer\.org|cancer\.(org|gov)|nih\.gov|hospital|health\.harvard", "society"),
]
def kind_for(sid):
    for s in SEEDS:
        if s[0] == sid:
            return s[3]
    for rx, k in KIND_HINT:
        if re.search(rx, sid):
            return k
    return "image-search"

# ---------- previews + rows ----------
rows = []
PUB.mkdir(parents=True, exist_ok=True)
for cid in keep:
    c, v, m = cands[cid], verd[cid], meta[cid]
    pid = v["pid"]
    src = source_for(c)
    full = C / "full" / f"{cid}.{m['ext']}"
    dst = R / "img" / pid / f"{cid}.{m['ext']}"
    dst.parent.mkdir(parents=True, exist_ok=True)
    if not dst.exists():
        shutil.copyfile(full, dst)
    prev = PUB / pid / f"{cid}.webp"
    prev.parent.mkdir(parents=True, exist_ok=True)
    srcimg = full if m["ext"] != "svg" else C / "thumbs" / f"{cid}.jpg"
    im = Image.open(srcimg)
    im = im.convert("RGBA") if im.mode in ("P", "LA", "RGBA") else im.convert("RGB")
    if im.mode == "RGBA":
        bg = Image.new("RGB", im.size, "white"); bg.paste(im, mask=im.split()[3]); im = bg
    im.thumbnail((600, 600), Image.LANCZOS)
    if not prev.exists():
        im.save(prev, "WEBP", quality=78, method=6)
    lic = c.get("license") or next((s[7] for s in SEEDS if s[0] == src and "CC" in s[7]), None) or "unknown — reference only"
    rows.append({
        "id": cid, "procedure_id": pid, "image_url": c["image"], "page_url": c.get("page") or c["image"],
        "source_id": src, "source_kind": kind_for(src),
        "title_or_caption": (c.get("title") or c.get("article") or "").strip()[:400],
        "type": v.get("type", "other"), "labelled": bool(v.get("labelled")), "style_notes": v.get("style", ""),
        "license": lic, "width": m.get("w"), "height": m.get("h"), "phash": m.get("phash"),
        "found_by": c.get("via"), "queries": c.get("queries", [])[:3],
        "preview": f"/ostad/refs/{pid}/{cid}.webp", "preview_w": im.width, "preview_h": im.height,
    })

# remove stale previews (rejected on a re-judge)
live = {r["preview"] for r in rows}
for f in PUB.rglob("*.webp"):
    if "/ostad/refs/" + f.relative_to(PUB).as_posix() not in live:
        f.unlink()

rows.sort(key=lambda r: (r["procedure_id"], not r["labelled"], r["type"]))
json.dump(rows, open(R / "refs.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)

# ---------- sources.json ----------
yld = Counter(r["source_id"] for r in rows)
types_by = defaultdict(Counter); procs_by = defaultdict(Counter); style_by = defaultdict(list)
for r in rows:
    types_by[r["source_id"]][r["type"]] += 1; procs_by[r["source_id"]][r["procedure_id"]] += 1; style_by[r["source_id"]].append(r["style_notes"])
notes = json.load(open(R / "source_notes.json", encoding="utf-8")) if (R / "source_notes.json").exists() else {}
srcs = {}
for s in SEEDS:
    sid, name, url, kind, doms, covers, style, lic = s
    srcs[sid] = {"id": sid, "name": name, "url": url, "kind": kind, "what_it_covers": covers, "style_notes": style, "license_notes": lic, "seed": True}
for sid in yld:
    if sid not in srcs:
        srcs[sid] = {"id": sid, "name": sid, "url": f"https://{sid}", "kind": kind_for(sid), "what_it_covers": "", "style_notes": "",
                     "license_notes": "unknown — reference only", "seed": False}
for sid, s in srcs.items():
    s["yield"] = yld.get(sid, 0)
    if s["yield"]:
        top_p = ", ".join(P[p]["name"].split(" (")[0] for p, _ in procs_by[sid].most_common(3))
        top_t = ", ".join(t for t, _ in types_by[sid].most_common(2))
        if not s["what_it_covers"] or not s["seed"]:
            s["what_it_covers"] = f"{top_t} for {top_p}"
        else:
            s["what_it_covers"] = f"{s['what_it_covers']} · kept: {top_t} for {top_p}"
        if not s["style_notes"]:
            s["style_notes"] = Counter(style_by[sid]).most_common(1)[0][0]
    s.update(notes.get(sid, {}))
ranked = sorted(srcs.values(), key=lambda s: (-s["yield"], not s["seed"], s["name"].lower()))
for i, s in enumerate(ranked, 1):
    s["rank"] = i
json.dump(ranked, open(R / "sources.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)

# ---------- GAPS.md ----------
n_by = Counter(r["procedure_id"] for r in rows)
judged_by = Counter(v["pid"] for v in verd.values())
qlog = defaultdict(list)
for f in (C / "ddg").glob("*.json"):
    d = json.load(open(f, encoding="utf-8")); qlog[d["pid"]].append((d["q"], len(d["rows"])))
epmc_n = {}
for f in (C / "epmc").glob("*.json"):
    d = json.load(open(f, encoding="utf-8")); epmc_n[d["pid"]] = len(d["rows"])
why_by = defaultdict(Counter)
for v in verd.values():
    if not v.get("keep"):
        why_by[v["pid"]][re.sub(r":.*", "", (v.get("why") or "rejected").lower()).strip()[:40]] += 1
gaps = [p for p in procs if n_by.get(p["id"], 0) < 5]
md = ["# Gaps: procedures with fewer than 5 kept images", "",
      f"{len(gaps)} of {len(procs)} procedures came back under 5 keepers after a real search. For each: what was searched, how many candidates reached the eye, and why they were turned down."]
for p in sorted(gaps, key=lambda p: n_by.get(p["id"], 0)):
    qs = qlog.get(p["id"], [])
    md += ["", f"## {p['name']}: {n_by.get(p['id'], 0)} kept", ""]
    md.append(f"- Searched: {len(qs)} DuckDuckGo image queries ({sum(n for _, n in qs):,} results), e.g. " + "; ".join(f"`{q}`" for q, _ in qs[:4]) + ".")
    md.append(f"- Europe PMC open-access figures matching the caption filter: {epmc_n.get(p['id'], 0)}.")
    md.append(f"- Judged by eye: {judged_by.get(p['id'], 0)} candidates (after size ≥ 800 px, block list, CLIP shortlist and perceptual-hash dedupe).")
    if why_by[p["id"]]:
        md.append("- Turned down mostly for: " + ", ".join(f"{w} ({n})" for w, n in why_by[p["id"]].most_common(4)) + ".")
open(R / "GAPS.md", "w", encoding="utf-8").write("\n".join(md) + "\n")

# ---------- arena-import.csv (no ARENA_ACCESS_TOKEN) ----------
with open(R / "arena-import.csv", "w", newline="", encoding="utf-8") as fh:
    w = csv.writer(fh); w.writerow(["procedure", "category", "image_url", "page_url"])
    for r in rows:
        w.writerow([P[r["procedure_id"]]["name"], P[r["procedure_id"]]["category"], r["image_url"], r["page_url"]])

# ---------- app data ----------
APP.mkdir(parents=True, exist_ok=True)
json.dump([{"id": r["id"], "p": r["procedure_id"], "src": next((s["name"] for s in ranked if s["id"] == r["source_id"]), r["source_id"]),
            "k": r["source_kind"], "t": r["type"], "lab": r["labelled"], "cap": r["title_or_caption"][:220], "sn": r["style_notes"],
            "lic": r["license"], "u": r["image_url"], "pg": r["page_url"], "w": r["width"], "h": r["height"],
            "f": r["preview"], "pw": r["preview_w"], "ph": r["preview_h"]} for r in rows],
          open(APP / "refs.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
json.dump([{"id": p["id"], "name": p["name"], "cat": p["category"], "what": p["what_it_does"], "n": n_by.get(p["id"], 0), "site": p["site_url"]}
           for p in procs], open(APP / "refs_procs.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
json.dump([{"id": s["id"], "name": s["name"], "url": s["url"], "kind": s["kind"], "covers": s["what_it_covers"], "style": s["style_notes"],
            "license": s["license_notes"], "yield": s["yield"], "rank": s["rank"]} for s in ranked if s["yield"] or s["seed"]],
          open(APP / "refs_sources.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
blocks = []
for line in md:
    if line.startswith("# "): blocks.append({"t": "h2", "s": line[2:]})
    elif line.startswith("## "): blocks.append({"t": "h3", "s": line[3:]})
    elif line.startswith("- "): blocks.append({"t": "li", "s": line[2:]})
    elif line.strip(): blocks.append({"t": "p", "s": line})
json.dump(blocks, open(APP / "refs_gaps.json", "w", encoding="utf-8"), ensure_ascii=False)

# ---------- report ----------
ns = [n_by.get(p["id"], 0) for p in procs]
print(f"procedures {len(procs)} · judged {judged} · kept {len(rows)} ({len(rows)/max(judged,1):.0%})")
print(f"per procedure min {min(ns)} / median {statistics.median(ns)} / max {max(ns)} · under 5: {len(gaps)}")
print("by category:", dict(Counter(p['category'] for p in procs)))
print("types:", dict(Counter(r['type'] for r in rows)), "labelled", sum(r['labelled'] for r in rows))
print("top sources:", [(s["name"], s["yield"]) for s in ranked[:10]])
