"""Jan08 v4 transcript + voice: research/ostad/style/jan08/cut_v4.json -> public/jan08/props_v4.json + public/jan08/voice_v4.wav.
Same rules as jan08_prep.py props/voice (word midpoints, 15 ms crossfades at joins); written to new files so V1-V3 keep theirs.
  python brand/scripts/jan08_v4.py
"""
import json, subprocess
from pathlib import Path
import jan08_prep as J

J.CUT = J.ROOT / "research/ostad/style/jan08/cut_v4.json"
PROPS, VOICE = J.PUB / "props_v4.json", J.PUB / "voice_v4.wav"

# props(): run against cut_v4 with the output files swapped (props.json / cut_transcript.txt are V1-V3's, never rewritten)
_write = Path.write_text
def _redirect(self, data, *a, **k):
    if self.name == "props.json":
        self = PROPS
    elif self.name == "cut_transcript.txt":
        self = J.EDIT / "cut_transcript_v4.txt"
    return _write(self, data, *a, **k)
Path.write_text = _redirect
try:
    res = J.props()
finally:
    Path.write_text = _write

# the awkward piece starts where v3's did (226.27 s at frame 1905), so its words are v3's re-transcribed, punctuated words (whisper on
# the piece alone: "...fatigue. I really think fillers are here to stay." and nothing after 'stay.'); the full-take words carry a
# phantom 'I' at 234.1 inside the end pause
v3 = json.loads((J.PUB / "props.json").read_text())
a3, a4 = next(p for p in v3["pieces"] if p["id"] == "awkward"), next(p for p in res["pieces"] if p["id"] == "awkward")
assert a3["at"] == a4["at"] and a3["from"] == a4["from"]
res["words"] = [w for w in res["words"] if w["piece"] != "awkward"] + [w for w in v3["words"] if w["piece"] == "awkward"]
res["words"].sort(key=lambda w: w["f"])
for k in ("awkward", "address", "stay"):
    res["cues"][k] = v3["cues"][k]
PROPS.write_text(json.dumps(res))
(J.EDIT / "cut_transcript_v4.txt").write_text(" ".join(w["w"] for w in res["words"]), encoding="utf-8")

ins, fl = [], []
for p in res["pieces"]:
    ins += ["-ss", f"{p['from']:.3f}", "-t", f"{p['dur'] / J.FPS + J.XF:.4f}", "-i", str(J.EDIT / "talk48.wav")]
prev = "[0:a]"
for i in range(1, len(res["pieces"])):
    fl.append(f"{prev}[{i}:a]acrossfade=d={J.XF}:c1=tri:c2=tri[x{i}]"); prev = f"[x{i}]"
fl.append(f"{prev}atrim=0:{res['durationInFrames'] / J.FPS:.4f}[v]")
subprocess.run(["ffmpeg", "-y", "-v", "error", *ins, "-filter_complex", ";".join(fl), "-map", "[v]", "-ar", "48000", "-ac", "1", str(VOICE)], check=True)
print(PROPS.name, VOICE.name, res["durationInFrames"], "frames")
