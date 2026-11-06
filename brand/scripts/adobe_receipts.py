"""FIX Phase 3: file the Claude-in-Chrome screenshots of each Adobe Fonts visual-search results page as receipts.
Each screenshot is taken right after the page script POSTs the scraped row (raw.jsonl, saved_at = server time), so a
screenshot belongs to the latest row saved before the file was written. -> fonts/adobe/{crop_stem}.png
Usage: python adobe_receipts.py <chrome screenshot dir>"""
import json, pathlib, sys
from PIL import Image

B = pathlib.Path(__file__).resolve().parents[1]
A = B / "fonts" / "adobe"
rows = [json.loads(l) for l in (A / "raw.jsonl").read_text(encoding="utf-8").splitlines()]
rows = [r for r in rows if (r.get("activation") or r.get("error")) and not str(r.get("crop", "")).startswith("__")]
rows.sort(key=lambda r: r["saved_at"])
# Chrome writes a batch's screenshots together when the batch ends, named screenshot-<batch ms>-<counter>.jpg.
# So a burst of k files written at time T holds the receipts of the last k rows saved before T, in counter order.
shots = sorted(pathlib.Path(sys.argv[1]).glob("screenshot-*.jpg"), key=lambda p: int(p.stem.rsplit("-", 1)[1]))
# the <batch ms> in the name drifts by a millisecond or two inside one batch, so group by write time (gap > 2 s = new batch)
bursts, last = [], None
for s in sorted(shots, key=lambda p: (p.stat().st_mtime, int(p.stem.rsplit("-", 1)[1]))):
    t = s.stat().st_mtime
    if last is None or t - last > 2:
        bursts.append([])
    bursts[-1].append(s); last = t
bursts = {i: sorted(g, key=lambda p: int(p.stem.rsplit("-", 1)[1])) for i, g in enumerate(bursts)}
n, used = 0, set()
for key, group in sorted(bursts.items(), key=lambda kv: min(p.stat().st_mtime for p in kv[1])):
    t = min(p.stat().st_mtime for p in group)
    cand = [i for i, r in enumerate(rows) if r["saved_at"] <= t and i not in used]
    mine = cand[-len(group):]
    for s, i in zip(group[-len(mine):], mine):
        used.add(i)
        out = A / (pathlib.Path(rows[i]["crop"]).stem + ".png")
        Image.open(s).convert("RGB").quantize(colors=128, method=Image.Quantize.MEDIANCUT).save(out, optimize=True)  # UI screenshot: 128 colours keep it legible
        n += 1
print("receipts", n, "of", len(shots), "screenshots;", len({r['crop'] for r in rows}), "crops in raw.jsonl")
