"""Under-eye reel v5 props: props_v4.json + two picture fixes (no new cut, no new words; the audio is dialogue_v5.wav).
  - P17's second picture segment (f1794-2152) started at 6821 18.0 s while the audio there is 6821 15.62 s: his mouth ran 2.4 s ahead
    of his voice and the segment ran past the clip end (35.1 s). It now starts at the audio's own time (lip-synced, ends at 33.2 s).
  - the tail under the end card (TAIL5) continues from the last picture's real end at rate 0.5 so it stays inside the clip.
usage: python brand/scripts/undereye_prep_v5.py  -> brand/remotion/public/undereye-filler/props_v5.json
"""
import json
from pathlib import Path
PUB = Path(__file__).resolve().parents[1] / "remotion/public/undereye-filler"
P = json.load(open(PUB / "props_v4.json"))
spd = P["speed"]
for x in P["pieces"]:
    for q in x["pics"]:
        if q.get("clip") == x["clip"] and not q.get("still") and q.get("from") is not None:
            sync = round(x["from"] + (q["f0"] - x["at"]) / 24 * spd, 3)
            print(f"{x['id']} pic f{q['f0']}-{q['f1']}: src {q['src']} -> {sync} (lip-synced to its own audio)")
            q["src"] = sync; q.pop("from")
# v5b: longer person keys for the "02" and "04" titles (the v5 keys ended 1.6-1.9 s of source early and froze), + every key's own length
import subprocess
P["keys"]["c02v5b"] = {"clip": "6817", "a": 32}
P["keys"]["c04v5b"] = {"clip": "6821", "a": 2}
for nm, k in P["keys"].items():
    w = PUB / f"key_{nm}.webm"
    if w.exists():
        k["dur"] = round(float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(w)], capture_output=True, text=True).stdout), 3)
P["dialogue"] = "undereye-filler/dialogue_v5.wav"
P["tailRate"] = 0.5
json.dump(P, open(PUB / "props_v5.json", "w"))
print("props_v5.json written")
