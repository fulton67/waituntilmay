"""Key-layer coverage check (v5b; coordinator: a short key froze his figure under '04 The result', f1579-1611 in v5).
For every section title with a person key (timeline beat layout.key), the KeyLayer is mounted over every picture segment of the key's clip
inside [s, s + SECTION_LEN]. The key webm covers source [a, a + duration). Reports the source span each title needs vs what the key holds.
usage: python brand/scripts/undereye_keys_cover.py [timeline.json]   (exit 1 if any title needs source the key does not have)"""
import json, subprocess, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import timeline_lib as T
SECTION_LEN = 12 + 60 + 8
tl = T.load(sys.argv[1] if len(sys.argv) > 1 else T.REM / "timelines/undereye.json"); P = T.transcript(tl)
PUB = T.REM / "public/undereye-filler"
sp = P["speed"]; pics = [q for x in P["pieces"] for q in x["pics"]]
bad = []
for b in tl["beats"]:
    name = (b.get("layout") or {}).get("key")
    if b["lane"] != "titles" or not name: continue
    s = T.resolve(b["start"], tl, P); e = s + SECTION_LEN
    for nm in (name, name + "b"):
        k = P["keys"].get(nm)
        if not k: continue
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(PUB / f"key_{nm}.webm")], capture_output=True, text=True).stdout)
        need = []
        for q in pics:
            if q.get("clip") != k["clip"] or q["f1"] <= s or q["f0"] > e: continue
            f0, f1 = max(q["f0"], s), min(q["f1"] - 1, e)
            need.append((q["src"] + (f0 - q["f0"]) * sp / 24, q["src"] + (f1 - q["f0"]) * sp / 24))
        if not need: continue
        lo, hi = min(n[0] for n in need), max(n[1] for n in need)
        ok = lo >= k["a"] - 1e-6 and hi <= k["a"] + dur - 1 / 30
        print(f"{b['id']:<6} key_{nm:<8} clip {k['clip']} needs src {lo:6.2f}-{hi:6.2f}  key has {k['a']:6.2f}-{k['a'] + dur:6.2f}  {'ok' if ok else 'SHORT by %.2f s' % max(k['a'] - lo, hi - (k['a'] + dur))}")
        if not ok: bad.append(nm)
print("PASS" if not bad else f"FAIL {bad}")
sys.exit(1 if bad else 0)
