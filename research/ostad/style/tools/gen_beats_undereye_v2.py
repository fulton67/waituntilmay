"""gen_beats_undereye_v2.py: research/ostad/style/undereye/beats_v2.json for the v2 reel (DECISIONS 15c), from props_v2.json.
Same schema as beats.json; one row per beat below (pieces, cue, the literal visual, devices, entry, refs, flags).
Run: C:/Users/naimj/tools/style-venv/Scripts/python.exe -I research/ostad/style/tools/gen_beats_undereye_v2.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
PROPS = ROOT / "brand/remotion/public/undereye-filler/props_v2.json"
OUT = ROOT / "research/ostad/style/undereye/beats_v2.json"

BEATS = [
    ("B01", ["H1"], "so", ("sure", 10), "HOOK: the real result first, in the STANDARD before/after window over her own testimonial (BEFORE pill -> AFTER); the title card above",
     ["std-skin-window", "name-super"], "type-italic-voice", "SkinCard (rosacea, STANDARD); italic voice DDOS R14", {"result_claim": True}),
    ("B02", ["P03"], "hollows", "her real 9-20 eye close-up in a ClipCard, white rings drawn in place on each hollow; beside it the tear trough in section, the face model's own lines",
     ["std-clip-card", "tear-trough-section"], "type-card-rise", "ClipCard (STANDARD); section = face.glb cut through the pupil line", {"illustration": True}),
    ("B03", ["P03", "P03b"], "tired", "his name super on his first full shot; her 9-20 front and eye shots (the hollows themselves)", ["name-super"], "type-rise",
     "name super G3 13/13", {}),
    ("B04", ["P04", "P05"], "cannula", "needle vs blunt cannula at a vessel: the needle goes through, the cannula slides around; one entry point fanning out", ["cannula-vs-needle-glide", "std-clip-card"],
     "type-scale-pop", "topic-only animation", {"illustration": True}),
    ("B05", ["P05"], "afterwards", "'afterwards she'll look great': the real 10-04 photo; then a months ruler with ticks at 12 and 18", ["timeline-markers", "arrow-marker-tick"],
     "type-rise", "Are.na 16463981; WZ f940/944", {"result_claim": True}),
    ("B06", ["P08"], "lidocaine", "the syringe barrel with the HA gel and the lidocaine dissolving in it", ["syringe-lidocaine"], "type-card-rise", "topic-only object", {"illustration": True}),
    ("B07", ["P09"], "deep", "the fan map: the read entry point and the cannula paths drawn on her face in the injection footage, head-tracked; the section card: deep, under the muscle",
     ["surgeon-fan-map", "tear-trough-section"], "type-typewriter", "measured in sketch_measure.json; section = face.glb", {"illustration": True}),
    ("B08", ["P10"], "fuller", "boxes round both under-eyes: Fuller (her right) / Deeper (her left)", ["annotation-box-footage"], "type-rise", "G4 T2 5J8M f2293-2311", {}),
    ("B09", ["P14", "P15"], "another", "one syringe (used) beside another syringe (not used: it expands into a pillowy look)", ["std-clip-card"], "type-card-rise",
     "STANDARD ClipCards side by side; the one not used marked", {"illustration": True}),
    ("B10", ["P15"], "bluish", "the Tyndall effect in section: light into a shallow deposit scatters blue, the deep one shows none", ["tyndall-light-scatter"], "type-scale-pop",
     "topic-only animation on the face model's section", {"illustration": True}),
    ("B11", ["P17"], "conventional", "needles (not used: bruising) beside the blunt cannula (used: one pinprick), STANDARD ClipCards", ["std-clip-card", "split-labelled"], "type-card-rise",
     "G1 T11 / G3 T6 (L23)", {"illustration": True}),
    ("B12", ["P17"], "pinprick", "a blue curved arrow (devices/Arrow) to the read entry point on her cheek, head-tracked", ["arrow-curved-callout"], "type-typewriter", "GMu3 f395-401",
     {"arrow": "curved-callout", "result_claim": True}),
    ("B13", ["P17"], "two", "the STANDARD window: BEFORE -> AFTER wiped in place, registered on eyes, nose and mouth, the sketch locked on faintly; white arrows only where the trough measured lighter; the measured shadow contrast counts down",
     ["std-skin-window", "hud-face-labels", "arrow-straight-pointer", "counter-roll"], "type-rise", "measured in sketch_measure.json / beforeafter.json", {"result_claim": True, "arrow": "straight-pointer"}),
]
# every row gets a keyframe (cue word, frames after it); the default is the cue + 16 f, when its reveal has landed
BEATS = [r if isinstance(r[3], tuple) else r[:3] + ((r[2], 16),) + r[3:] for r in BEATS]
SECTIONS = [("S0", "Hook"), ("S1", "The concern"), ("S2", "The procedure"), ("S3", "The decision"), ("S4", "The result")]


def main():
    P = json.loads(PROPS.read_text(encoding="utf-8"))
    pc = {p["id"]: p for p in P["pieces"]}
    for p in P["pieces"]:  # a piece cut into sub-pieces (P03x, P03y) answers to its base id with its first sub-piece
        if p["id"][-1] in "xyz" and p["id"][:-1] not in pc:
            pc[p["id"][:-1]] = p
    cues = P["cues"]
    starts = []
    for i, b in enumerate(BEATS):
        first = b[1][0]
        same = i and BEATS[i - 1][1][-1] == first
        starts.append(cues[b[2]] - 4 if same else pc[first]["at"])
    beats, sec_start = [], {}
    for i, (bid, pieces, cue, key, noun, devs, entry, refs, extra) in enumerate(BEATS):
        s0, s1 = starts[i], (starts[i + 1] - 1 if i + 1 < len(BEATS) else P["durationInFrames"] - 1)
        sec = pc[pieces[0]]["section"]
        sec_start.setdefault(sec, s0)
        b = {"id": bid, "section": sec, "start_f": s0, "end_f": s1, "start_s": round(s0 / 24, 3), "end_s": round(s1 / 24, 3), "pieces": pieces,
             "said": " ".join(w["w"] for w in P["words"] if any(w["piece"].startswith(x) for x in pieces)), "noun": noun, "cue": cue,
             "cue_f": cues[cue], "reveal_f": cues[cue] + 1, "devices": devs, "entry": entry, "immersion": "full-bleed", "ostad": "in-footage",
             "refs": refs, "text_only": extra.get("text_only", False), "compliance": {}, "keyframe": {"f": min(s1, cues[key[0]] + key[1]), "crop": [0, 0, 1080, 1580]}}
        for k in ("arrow",):
            if k in extra:
                b[k] = extra[k]
        if extra.get("illustration"):
            b.update(illustration=True)
            b["compliance"]["illustration_label"] = "Illustration"
        if extra.get("result_claim"):
            b.update(result_claim=True)
            b["compliance"]["results_vary"] = "individual results vary"
        beats.append(b)
    # the before/after stills are photos on screen: each needs a layer box for the static-image check
    for b in beats:
        segs = [q for pp in P["pieces"] if any(pp["id"].startswith(x) for x in b["pieces"]) for q in pp["pics"] if q.get("still") and q["f0"] <= b["end_f"] and q["f1"] >= b["start_f"]]
        if segs:
            b["assets"] = [{"kind": "image", "src": f"undereye-filler/ba_{q['still']}.jpg", "source": "clinic", "consent": "P0002 yes"} for q in segs]
            b["image_layers"] = [{"asset": f"undereye-filler/ba_{q['still']}.jpg", "box": [0, 250, 1080, 1300], "from_f": max(q["f0"], b["start_f"]) + 2,
                                  "to_f": min(q["f1"], b["end_f"] + 1) - 2} for q in segs]
    # the STANDARD window's photo (her registered face) is an image layer too: box = the window's photo rect (standard.tsx SkinWindow)
    win = {"B01": "ba_wipe_before.jpg", "B13": "ba_wipe_before.jpg"}
    for bb in beats:
        if bb["id"] in win:
            bb["assets"] = bb.get("assets", []) + [{"kind": "image", "src": f"undereye-filler/{win[bb['id']]}", "source": "clinic", "consent": "yes"}]
            bb["image_layers"] = bb.get("image_layers", []) + [{"asset": f"undereye-filler/{win[bb['id']]}", "box": [230, 1050, 620, 449],
                                                                 "from_f": bb["start_f"] + 12, "to_f": bb["end_f"] - 10}]
    dur = P["durationInFrames"] + 72
    sheet = {"edit": "Ostad - under-eye filler with a blunt cannula (reel v2)", "fps": 24, "width": 1080, "height": 1920, "speed": P["speed"], "duration_f": dur,
             "time_base": "composition frames at 24 fps on the 1.15x edit; reveals at word onset + 1 f", "device_library": "research/ostad/style/DEVICE_LIBRARY.md",
             "cut": "research/ostad/style/undereye/cut_v2.json", "compliance_profile": "injectable", "consent": "yes", "not_for_posting": False,
             "status": "consent = yes (catalog, 2026-11-17: written consent before every procedure)", "sections": [{"id": s, "title": t, "start_f": sec_start[s]} for s, t in SECTIONS],
             "cards": [{"kind": "title", "device": "chapter-title-card", "start_f": 0}]
                      + [{"kind": "section", "device": "chapter-title-card", "start_f": sec_start[s], "title": t} for s, t in SECTIONS[1:]]
                      + [{"kind": "end", "device": "end-card", "start_f": P["durationInFrames"]}], "beats": beats}
    OUT.write_text(json.dumps(sheet, indent=1), encoding="utf-8")
    print(f"wrote {OUT} ({len(beats)} beats, {dur} f)")


if __name__ == "__main__":
    main()
