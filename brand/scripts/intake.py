"""POST_GRID §3b: photo intake from iCloud -> brand/intake/ (local only; the folder is gitignored and nothing is uploaded).

The iCloud library on this PC is %USERPROFILE%\\clinic-library (icloudpd, read-only): every asset is already listed, previewed
and tagged in catalog\\catalog.sqlite (procedure, area, content type, before/after, devices, description, patient code, consent),
with 72 before/after pairs matched by patient, angle and date. This script reads that catalog instead of re-tagging 11k items:
  1. sort: every photo, plus video stills of product / office / event content, into product, before-after, procedure,
     office-team, event, other-usable (hard links to the previews, no extra space); skips personal, screenshots, SENSITIVE
     items and near-duplicates (64-bit dHash, Hamming <= 4 within a category)
  2. fill in what is known: dates from metadata, product names (skincare line in CLIENT.md + brands read from labels),
     procedures from refs/procedures.json slugs; never a guessed diagnosis, procedure or time since treatment
  3. QUESTIONS.md: one batched list (consent per patient, own patient vs device-maker, unclear procedures, pair timing)
  4. drafts: items with enough information get a suggested template + slots (before/after drafts stay locked)
usage: python brand/scripts/intake.py  [--lib PATH]"""
import json, os, pathlib, re, sqlite3, sys, datetime
import numpy as np
from PIL import Image, ImageFilter

B = pathlib.Path(__file__).resolve().parents[1]; ROOT = B.parent
LIB = pathlib.Path(sys.argv[sys.argv.index("--lib") + 1]) if "--lib" in sys.argv else pathlib.Path(os.environ["USERPROFILE"]) / "clinic-library"
OUT = B / "intake"
CATS = ["product", "before-after", "procedure", "office-team", "event", "other-usable"]
TEMPLATE = {"product": "product", "before-after": "before-after", "procedure": "procedure", "office-team": "ruled", "event": "notice", "other-usable": "graphic"}

def products():
    rows = []
    for line in (ROOT / "research/ostad/CLIENT.md").read_text(encoding="utf-8").splitlines():
        m = re.match(r"\| ([^|]+?) \| \$\d", line)
        if m: rows.append(re.sub(r"\s*\(.*?\)", "", m.group(1)).strip())
    return rows

def dhash(p):
    im = Image.open(p).convert("L").resize((9, 8), Image.BILINEAR); a = np.asarray(im, np.int16)
    return int("".join("1" if v else "0" for v in (a[:, 1:] > a[:, :-1]).flatten()), 2)

def quality(p):
    im = Image.open(p); w, h = im.size; g = im.convert("L"); g.thumbnail((512, 512))
    lap = np.asarray(g.filter(ImageFilter.FIND_EDGES), np.float32); a = np.asarray(g, np.float32)
    sharp = float(lap.var()); mean = float(a.mean())
    r = w / h
    return {"w": w, "h": h, "sharp": round(sharp, 1), "brightness": round(mean, 1),
            "sharp_ok": sharp > 60, "light_ok": 60 < mean < 225,
            # crop-safe: the 4:5 feed crop and the centre square keep >= 80 % of the shorter side's content
            "crop_4x5": round(min(r / 0.8, 0.8 / r), 2) >= 0.8 or r < 0.8, "crop_1x1": round(min(r, 1 / r), 2) >= 0.75}

def category(a):
    ct, grp, d = a["content_type"] or "", a["grp"] or "", (a["description"] or "").lower()
    if "screenshot" in d or "screen capture" in d or "dm " in d or "text message" in d: return None
    if ct == "product": return "product"
    if ct in ("before-after", "result") or a["before_after"] in ("before", "after"): return "before-after" if ct != "procedure-footage" else "procedure"
    if ct == "procedure-footage": return "procedure"
    if grp == "Events": return "event"
    if ct in ("office", "behind-the-scenes") or grp == "Office & Team": return "office-team"
    if grp == "Doctor & Press": return "other-usable"
    return None  # personal / other / talking-head / consult: not a feed post

def main():
    db = sqlite3.connect(LIB / "catalog" / "catalog.sqlite"); db.row_factory = sqlite3.Row
    procs = {p["id"]: p for p in json.load(open(ROOT / "research/ostad/refs/procedures.json", encoding="utf-8"))}
    prods = products()
    rows = db.execute("select * from assets where preview_path is not null and (type='photo' or content_type in ('product','office','behind-the-scenes') or grp='Events')").fetchall()
    for c in CATS: (OUT / c).mkdir(parents=True, exist_ok=True)
    items, seen, skipped = [], {c: [] for c in CATS}, {"not-a-post": 0, "sensitive": 0, "duplicate": 0, "missing-preview": 0}
    for a in rows:
        if "SENSITIVE" in (a["review_reason"] or ""): skipped["sensitive"] += 1; continue
        cat = category(a)
        if not cat: skipped["not-a-post"] += 1; continue
        src = LIB / a["preview_path"]
        if not src.exists(): skipped["missing-preview"] += 1; continue
        h = dhash(src)
        if any(bin(h ^ o).count("1") <= 4 for o in seen[cat]): skipped["duplicate"] += 1; continue
        seen[cat].append(h)
        q = quality(src)
        dst = OUT / cat / f"{a['id']:05d}_{a['filename'].rsplit('.', 1)[0]}.jpg"
        if not dst.exists():
            try: os.link(src, dst)
            except OSError: dst.write_bytes(src.read_bytes())
        text = " ".join(filter(None, [a["description"], a["brand"], a["devices"]])).lower()
        product = next((p for p in prods if p.lower() in text or p.lower().replace(" ", "") in text.replace(" ", "")), None) if cat == "product" else None
        proc = procs.get(a["procedure"])
        missing = []
        if cat in ("procedure", "before-after") and (not proc or a["procedure"] in ("unclear", "injection-unclear", "other")): missing.append("procedure")
        if cat == "before-after": missing += ["consent", "own patient or device-maker photo"]
        if cat == "product" and not (product or a["brand"]): missing.append("which product")
        it = {"id": f"a{a['id']}", "row": a["id"], "asset_id": a["asset_id"], "file": str(dst.relative_to(ROOT)).replace("\\", "/"), "source": a["filename"],
              "date": a["date"], "type": a["type"], "category": cat, "what": a["description"], "procedure": a["procedure"], "procedure_name": proc["name"] if proc else None,
              "area": a["area"], "before_after": a["before_after"], "patient": a["patient_code"], "consent": a["consent"], "product": product, "brand": a["brand"],
              "devices": a["devices"], "quality": q, "template": TEMPLATE[cat], "missing": missing, "answers": {},
              "status": "needs info" if missing else "draft"}
        items.append(it)
    # before/after pairs from the catalog (same patient, procedure, area, angle; dates from metadata)
    pairs = []
    for p in db.execute("select * from pairs").fetchall():
        b = db.execute("select date, preview_path from assets where id=?", (p["before_id"],)).fetchone(); f = db.execute("select date, preview_path from assets where id=?", (p["after_id"],)).fetchone()
        proc = procs.get(p["procedure"])
        missing = ["consent", "own patient or device-maker photo", "time since treatment (photos are {} days apart)".format(p["days_between"])]
        if not proc or p["procedure"] in ("unclear", "injection-unclear", "other"): missing.insert(0, "procedure")
        pairs.append({"id": f"pair-{p['pair_id']}", "patient": p["patient"], "procedure": p["procedure"], "procedure_name": proc["name"] if proc else None, "area": p["area"], "angle": p["angle"],
                      "before_row": p["before_id"], "after_row": p["after_id"], "before_date": b["date"] if b else None, "after_date": f["date"] if f else None,
                      "days_between": p["days_between"], "confidence": p["confidence"], "needs_review": bool(p["needs_review"]), "consent": p["consent"],
                      "preview": (str(LIB / p["preview"]) if p["preview"] else None), "template": "before-after", "missing": missing, "answers": {}, "status": "needs info"})
    old = {}
    if (OUT / "intake.json").exists():  # keep answers typed on the planner page
        prev = json.load(open(OUT / "intake.json", encoding="utf-8")); old = {x["id"]: x.get("answers", {}) for x in prev.get("items", []) + prev.get("pairs", [])}
    for x in items + pairs:
        if old.get(x["id"]): x["answers"] = old[x["id"]]
    counts = {c: sum(1 for i in items if i["category"] == c) for c in CATS}
    doc = {"generated": datetime.datetime.now().isoformat(timespec="seconds"), "library": str(LIB), "source": "clinic-library catalog.sqlite (iCloud, read-only)",
           "scanned": len(rows), "kept": len(items), "counts": counts, "skipped": skipped, "pairs": pairs, "items": items,
           "patients_consent": {r["code"]: r["consent"] for r in db.execute("select * from patients")}}
    json.dump(doc, open(OUT / "intake.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    questions(doc)
    print(json.dumps({"library": str(LIB), "scanned": len(rows), "kept": len(items), "counts": counts, "skipped": skipped, "pairs": len(pairs),
                      "needs_info": sum(1 for i in items if i["missing"]) + len(pairs)}, indent=1))

def questions(doc):
    L = ["# Intake: needs info", "", f"Generated {doc['generated']} from `{doc['source']}`. Answer here or on `/brand/ostad/grid` (Needs info panel); answers save to `intake.json`.", "",
         "Nothing is assumed: no procedure, diagnosis or time since treatment is guessed. Before/after posts stay locked until consent and Dr. Ostad's approval are both yes.", ""]
    pats = sorted({p["patient"] for p in doc["pairs"] if p["patient"]} | {i["patient"] for i in doc["items"] if i["category"] == "before-after" and i["patient"]})
    L += [f"## 1. Consent, per patient ({len(pats)} patients appear in before/after photos; all are `unknown`)", "",
          "For each code: has the patient consented to social posts? Is this Dr. Ostad's own patient?", ""]
    for p in pats: L.append(f"- [ ] **{p}**: consent? own patient? (faces: `clinic-library/catalog/patient-faces/{p}*`)")
    L += ["", f"## 2. Before/after pairs ({len(doc['pairs'])})", ""]
    for p in doc["pairs"]:
        th = p["preview"].replace("\\", "/") if p["preview"] else ""
        L.append(f"- **{p['id']}** · {p['patient']} · {p['procedure_name'] or p['procedure']} · {p['area']} / {p['angle']} · photos {p['days_between']} days apart"
                 f" ({(p['before_date'] or '')[:10]} → {(p['after_date'] or '')[:10]})  \n  ![]({'file:///' + th})  \n  Missing: {', '.join(p['missing'])}")
    L += ["", "## 3. Items missing a procedure or product", ""]
    for i in [i for i in doc["items"] if i["missing"] and i["category"] != "before-after"][:400]:
        L.append(f"- **{i['id']}** ({i['category']}, {(i['date'] or '')[:10]}) {i['what'][:140] if i['what'] else ''}  \n  ![](../../{i['file']})  \n  Missing: {', '.join(i['missing'])}")
    (OUT / "QUESTIONS.md").write_text("\n".join(L) + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()
