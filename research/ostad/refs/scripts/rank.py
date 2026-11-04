"""Pool candidates per procedure, drop what can't pass, CLIP-score thumbnails, pick the shortlist.

in : cache/ddg/*.json, cache/epmc/*.json
out: cache/pool.json  (every surviving candidate with clip scores)
     cache/shortlist.json (top K per procedure, to download + judge by eye)
"""
import json, pathlib, re, hashlib, io, sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse
import requests
from PIL import Image

R = pathlib.Path(__file__).resolve().parents[1]
C = R / "cache"
TH = C / "thumbs"; TH.mkdir(exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36"}
K = int(sys.argv[1]) if len(sys.argv) > 1 else 40
PER_QUERY = 70  # DuckDuckGo results past ~70 drift off topic

# social reposts and watermarked stock previews (DECISIONS 6)
BLOCK = re.compile(r"pinterest\.|pinimg\.|instagram\.|facebook\.|fbcdn\.|tiktok\.|x\.com|twitter\.|reddit\.|redd\.it|youtube\.|ytimg\.|"
                   r"shutterstock\.|istockphoto\.|gettyimages\.|dreamstime\.|alamy\.|123rf\.|depositphotos\.|stock\.adobe\.|adobestock|"
                   r"canstockphoto\.|bigstockphoto\.|pond5\.|agefotostock\.|megapixl\.|lookaside\.|amazon\.|ebay\.|etsy\.|aliexpress\.|walmart\.", re.I)
TITLE_DROP = re.compile(r"before (and|&) after|before-after|\bresults?\b.*\bpatient|testimonial|\bcoupon|\bsale\b|% off|price list|logo\b", re.I)

def sha(s): return hashlib.sha1(s.encode()).hexdigest()[:16]

procs = {p["id"]: p for p in json.load(open(R / "procedures.json", encoding="utf-8"))}
pool = defaultdict(dict)
for f in (C / "ddg").glob("*.json"):
    d = json.load(open(f, encoding="utf-8"))
    for rank, r in enumerate(d["rows"][:PER_QUERY]):
        u = r.get("image") or ""
        if not u.startswith("http") or BLOCK.search(u) or BLOCK.search(r.get("page") or ""):
            continue
        if TITLE_DROP.search(r.get("title") or ""):
            continue
        w, h = r.get("w") or 0, r.get("h") or 0
        if max(w, h) < 800 and not u.lower().split("?")[0].endswith(".svg"):
            continue
        c = pool[d["pid"]].setdefault(u, {**r, "pid": d["pid"], "id": sha(u), "via": "ddg", "hits": 0, "best_rank": 999, "queries": []})
        c["hits"] += 1; c["best_rank"] = min(c["best_rank"], rank); c["queries"].append(d["q"])
for f in (C / "epmc").glob("*.json"):
    d = json.load(open(f, encoding="utf-8"))
    for r in d["rows"]:
        u = r["image"]
        pool[d["pid"]].setdefault(u, {**r, "pid": d["pid"], "id": sha(u), "via": "epmc", "hits": 1, "best_rank": 0, "queries": [d["q"]]})

cands = [c for pid in pool for c in pool[pid].values()]
print("candidates", len(cands), "procedures", len(pool))

def thumb(c):
    f = TH / f"{c['id']}.jpg"
    if f.exists():
        return c["id"], True
    try:
        r = requests.get(c["thumb"] or c["image"], headers=UA, timeout=20)
        im = Image.open(io.BytesIO(r.content)).convert("RGB"); im.thumbnail((384, 384))
        im.save(f, quality=85); return c["id"], True
    except Exception:
        return c["id"], False

ok = {}
with ThreadPoolExecutor(24) as ex:
    for i, (cid, good) in enumerate(ex.map(thumb, cands)):
        ok[cid] = good
        if i % 2000 == 0: print("thumbs", i, flush=True)
cands = [c for c in cands if ok.get(c["id"])]
print("with thumbs", len(cands))

import torch, open_clip
model, _, pre = open_clip.create_model_and_transforms("ViT-B-32", pretrained="laion2b_s34b_b79k")
tok = open_clip.get_tokenizer("ViT-B-32"); model.eval()
POS = ["a labeled medical illustration diagram", "a cross-section diagram of the skin layers", "a 3D medical render of human anatomy",
       "an anatomical illustration of facial muscles with injection points marked", "a scientific schematic diagram with arrows and labels",
       "a vector infographic explaining how a medical device works", "a surgical technique illustration showing steps",
       "a biology diagram of cells, receptors and molecules", "an illustration of a hair follicle, sweat gland or blood vessel in skin",
       "a molecular structure illustration"]
NEG = ["a photo of a person's face", "a before and after photo of a patient", "a company logo", "a product photo of a bottle, syringe or machine",
       "a photo of a doctor treating a patient in a clinic", "a text-only advertisement banner", "a vintage engraving or old textbook plate",
       "a microscope histology slide", "a stock photo of a smiling woman", "a screenshot of a web page with paragraphs of text", "a chart or graph of data"]
import numpy as np
cache_f = C / "clip.json"; emb_f = C / "emb.npz"
clip = json.load(open(cache_f)) if cache_f.exists() else {}
emb = dict(np.load(emb_f)) if emb_f.exists() else {}
with torch.no_grad():
    T = model.encode_text(tok(POS + NEG)); T /= T.norm(dim=-1, keepdim=True)
    todo = [c for c in cands if c["id"] not in clip or c["id"] not in emb]
    for i in range(0, len(todo), 64):
        batch = todo[i:i + 64]
        ims = torch.stack([pre(Image.open(TH / f"{c['id']}.jpg").convert("RGB")) for c in batch])
        E = model.encode_image(ims); E /= E.norm(dim=-1, keepdim=True)
        P = (100 * E @ T.T).softmax(dim=-1)
        for c, pr, e in zip(batch, P, E):
            pos = float(pr[:len(POS)].sum()); top = int(pr.argmax())
            clip[c["id"]] = {"pos": round(pos, 4), "top": (POS + NEG)[top]}
            emb[c["id"]] = e.numpy().astype(np.float16)
        if i % 1280 == 0: print("clip", i, len(todo), flush=True)
    # relevance: image vs a sentence about this procedure, z-scored within the procedure
    PT = {}
    for pid, p in procs.items():
        n = re.split(r"[(:]", p["name"])[0].strip()
        s = f"a medical illustration of {n}: {p['what_it_does']} Anatomy: {', '.join(p['anatomy'][:4])}."
        v = model.encode_text(tok([s[:300]])); PT[pid] = (v / v.norm(dim=-1, keepdim=True))[0].numpy()
json.dump(clip, open(cache_f, "w"))
np.savez(emb_f, **emb)

def toks(p):
    words = set()
    for s in [p["name"]] + p["aliases"] + [p.get("brand_or_device") or ""]:
        for w in re.findall(r"[a-z0-9+]{4,}", s.lower()):
            if w not in {"filler", "fillers", "lines", "toxin", "treatment", "laser", "skin", "general", "surgery", "lift"}:
                words.add(w)
    return words
TOK = {pid: toks(p) for pid, p in procs.items()}
for c in cands:
    c["clip"] = clip[c["id"]]["pos"]; c["clip_top"] = clip[c["id"]]["top"]
    c["rel"] = float(np.dot(emb[c["id"]].astype(np.float32), PT[c["pid"]]))
    t = ((c.get("title") or "") + " " + (c.get("page") or "")).lower()
    c["title_hit"] = any(w in t for w in TOK[c["pid"]])
by = defaultdict(list)
for c in cands:
    by[c["pid"]].append(c)
for pid, cs in by.items():
    rs = np.array([c["rel"] for c in cs]); mu, sd = rs.mean(), rs.std() + 1e-6
    for c in cs:
        c["relz"] = round(float((c["rel"] - mu) / sd), 3)
json.dump(cands, open(C / "pool.json", "w", encoding="utf-8"))

# shortlist: per procedure, epmc figures + best scores (diagram-ness + relevance + title match)
short = []
for pid, cs in by.items():
    for c in cs:
        c["score"] = c["clip"] + 0.12 * c["relz"] + (0.15 if c["title_hit"] else 0) + 0.03 * min(c["hits"], 4) - 0.001 * c["best_rank"]
    cs = [c for c in cs if c["clip"] >= 0.2]
    ep = sorted([c for c in cs if c["via"] == "epmc"], key=lambda c: -c["score"])[:12]
    dd = sorted([c for c in cs if c["via"] == "ddg"], key=lambda c: -c["score"])[:K]
    short += ep + dd
json.dump(short, open(C / "shortlist.json", "w", encoding="utf-8"))
from collections import Counter
cnt = Counter(c["pid"] for c in short)
print("shortlist", len(short), "min/max per proc", min(cnt.values()), max(cnt.values()), "missing", [p for p in procs if p not in cnt])
