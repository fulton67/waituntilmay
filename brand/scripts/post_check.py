"""BUILDER Phase D check: the terminal and the page produce identical files. Each case renders once through brand/post.py and
once through the site's /api/brand/ostad/render (the builder's Download button), then the PNGs are compared: byte-identical,
else pixel MAD. Needs the dev server (default http://localhost:3107). -> kit/templates/post_check.json. brand-venv python -I."""
import json, pathlib, sys, hashlib, urllib.request, tempfile, io
import numpy as np
from PIL import Image
B = pathlib.Path(__file__).resolve().parents[1]; sys.path.insert(0, str(B))
import post
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3107"
PH = [r["src"] for r in json.load(open(B / "kit" / "templates" / "photos" / "photos.json", encoding="utf-8"))]
CASES = [
    {"size": "4x5", "accent": "accent-1", "slides": [{"template": "procedure-card", "slots": {"image": PH[0], "name": "Laser resurfacing", "what": "Smooths texture and tone in one session.", "icon": "laser", "chip": "Laser"}}]},
    {"size": "1x1", "accent": "signal", "slides": [{"template": "list", "slots": {"title": "What laser resurfacing treats", "ground": "dark"}}]},
    {"size": "9x16", "accent": "accent-2", "slides": [{"template": "story", "slots": {"image": PH[2]}}]},
]
out = pathlib.Path(tempfile.mkdtemp()); rows = []
for i, spec in enumerate(CASES):
    sf = out / f"spec{i}.json"; sf.write_text(json.dumps(spec), encoding="utf-8")
    rec = post.main(["--spec", str(sf), "--out", str(out), "--name", f"cli{i}"]); cli = pathlib.Path(rec["files"][0]).read_bytes()
    rq = urllib.request.Request(BASE + "/api/brand/ostad/render", data=json.dumps({"spec": spec, "format": "png"}).encode(), headers={"Content-Type": "application/json"})
    web = urllib.request.urlopen(rq, timeout=180).read()
    a = np.asarray(Image.open(io.BytesIO(cli)).convert("RGB"), np.int16); b = np.asarray(Image.open(io.BytesIO(web)).convert("RGB"), np.int16)
    rows.append({"case": i, "template": spec["slides"][0]["template"], "size": spec["size"], "bytes_identical": hashlib.sha256(cli).hexdigest() == hashlib.sha256(web).hexdigest(),
                 "same_size": a.shape == b.shape, "mad": round(float(np.abs(a - b).mean()), 4) if a.shape == b.shape else None,
                 "max_diff": int(np.abs(a - b).max()) if a.shape == b.shape else None, "cli_fonts": rec["fonts"]})
res = {"base": BASE, "cases": rows, "all_identical_pixels": all(r["max_diff"] == 0 for r in rows)}
json.dump(res, open(B / "kit" / "templates" / "post_check.json", "w", encoding="utf-8"), indent=1); print(json.dumps(res, indent=1))
