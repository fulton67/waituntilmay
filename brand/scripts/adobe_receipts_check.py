"""Check every receipt shows its own crop: OCR the preview band of the receipt (the crop as Adobe shows it, plus the
sample-text box) and fuzzy-match it against the crop's OCR text, versus the crops searched just before and after."""
import json, pathlib, sys, difflib, re
import cv2, easyocr
sys.stdout.reconfigure(encoding="utf-8")
B = pathlib.Path(__file__).resolve().parents[1]; A = B / "fonts" / "adobe"
rows = [json.loads(l) for l in (A / "raw.jsonl").read_text(encoding="utf-8").splitlines()]
rows = sorted([r for r in rows if r.get("activation")], key=lambda r: r["saved_at"])
order = list(dict.fromkeys(pathlib.Path(r["crop"]).name for r in rows))
text = {pathlib.Path(c["crop"]).name: c["text"] for c in json.load(open(B / "fonts" / "crops.json", encoding="utf-8"))}
norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
rd = easyocr.Reader(["en"], gpu=False, verbose=False)
res, bad = {}, []
for i, name in enumerate(order):
    img = cv2.imread(str(A / (pathlib.Path(name).stem + ".png")))
    if img is None: bad.append((name, "missing")); continue
    band = img[60:240, 140:800]
    got = norm(" ".join(t for _, t, c in rd.readtext(band)))
    sim = lambda n: difflib.SequenceMatcher(None, got, norm(text[n])).ratio() if n in text else 0
    own = sim(name); nb = max([sim(order[j]) for j in (i - 2, i - 1, i + 1, i + 2) if 0 <= j < len(order) and text.get(order[j]) != text.get(name)] or [0])
    res[name] = {"own": round(own, 2), "best_neighbour": round(nb, 2), "ocr": got[:60]}
    if nb > own + 0.15 and nb > 0.5: bad.append((name, res[name]))
json.dump(res, open(A / "receipts_check.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
own = [v["own"] for v in res.values()]
print("checked", len(res), "| own-text similarity >= 0.5:", sum(o >= .5 for o in own), "| neighbour beats own:", len(bad))
for b in bad[:15]: print(b)
