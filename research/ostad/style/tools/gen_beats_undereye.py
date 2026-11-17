"""gen_beats_undereye.py: write research/ostad/style/undereye/beats.json (schema of exomind/beats.json) for the under-eye filler reel.

The beat design is the BEATS table below (one row per beat: the piece(s) it covers, the line, the noun, the devices, the entry,
the reference). Frames come from brand/remotion/public/undereye-filler/props.json (brand/scripts/undereye_prep.py): a beat
starts at its first piece's start and ends the frame before the next beat. Only his redacted words reach the sheet.
Run: C:/Users/naimj/tools/style-venv/Scripts/python.exe -I research/ostad/style/tools/gen_beats_undereye.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
PROPS = ROOT / "brand/remotion/public/undereye-filler/props.json"
OUT = ROOT / "research/ostad/style/undereye/beats.json"

# id, pieces, cue (first reveal), noun (the literal visual), devices, entry, refs, extra flags
BEATS = [
    ("B01", ["P01", "P02"], "fillers", "who he is, and the request: fillers for her lower eyelids", ["name-super"], "type-word-fade-rise",
     "name super G3 (13/13); title words rise 5 f, DDOS f3-13", {}),
    ("B02", ["P03"], "hollows", "the hollow under her eye, magnified in a loupe", ["loupe-zoom", "arrow-curved-callout"], "type-typewriter",
     "loupe G4 T2 5J8M f1168; curved callout GMu3 f395-401; typed label DDOS B09", {}),
    ("B03", ["P03"], "tired", "'Tired?' struck and replaced by his word 'An illusion.'", ["type-strike-replace"], "type-strike-replace",
     "strike-replace G3 T13 D_bh f3350 (strike 6 f)", {"text_only": True}),
    ("B04", ["P04"], "usefiller", "the actual syringe from the session, plate then picture", ["product-plate-reveal"], "type-rise",
     "plate-then-picture M04 M1-M2 (MOTION plate 18+18 f); ro yaFInenV3Eg f618-674", {}),
    ("B05", ["P04", "P05"], "cannula", "a blunt cannula tip beside a sharp needle bevel; swelling and bruising land under the needle", ["split-labelled"],
     "type-highlight-sweep", "labelled split G1 T11, G3 T6 (L23); highlighter DDOS Moment A", {}),
    ("B06", ["P06"], "last", "a months rule with ticks at 12 and 18 months", ["timeline-markers", "arrow-marker-tick"], "type-rise",
     "timeline Are.na 16463981; marker ticks WZ f940/944", {}),
    ("B07", ["P07"], "insertion", "a ring on the one entry point on her cheek, tracked on the footage", ["tracking-ring"], "type-typewriter",
     "tracking ring G4 T20 tQkjtXJEtxY f851-1091", {}),
    ("B08", ["P08"], "lidocaine", "'Lidocaine' slammed with an ice box over the injection", ["type-box-slam"], "type-box-slam",
     "box slam GMu3 f1512-1522 (4 f + 4 f)", {"text_only": True}),
    ("B09", ["P09"], "deep", "the cannula's route traced from the entry point along the under-eye on the real footage", ["arrow-route-trace", "mechanism-on-real-image"],
     "type-typewriter", "route trace DDOS f216-250 (27 f); mechanism on real image G1 T8 IkrW f610-880", {"arrow": "route-trace"}),
    ("B10", ["P10"], "fuller", "boxes round both under-eyes: 'Fuller' (treated) vs 'Deeper' (not yet), the rest dimmed", ["annotation-box-footage"], "type-rise",
     "numbered boxes G4 T2 5J8M f2293-2311; dim the rest G4 T6", {}),
    ("B11", ["P11"], "absorb", "two gel beads taking on water: one swells pillowy, the low-hydrophilic one barely changes", ["topic-glass-panel"],
     "type-highlight-sweep", "topic glass panel: rosacea MicrobeCard method", {"illustration": True}),
    ("B12", ["P12", "P13"], "halfsyringe", "the amount rolls from half a syringe (one side) to one syringe (both sides), with the syringe", ["rx-card"],
     "type-rolling-swap", "rolling label SU S2 / G2 T16 (L05, swap 16 f)", {}),
    ("B13", ["P14"], "another", "'Another syringe?' lit word by word, then an arrow up: it will expand", ["arrow-straight-pointer"], "type-ghost-to-lit",
     "ghost-to-lit WZ f238-263 (L02); straight pointer WZ f926-933", {"arrow": "straight-pointer"}),
    ("B14", ["P15"], "bluish", "a bluish hue appears under her eyes (illustration), named, then cleared: inject deep", ["region-light-on-model"], "type-typewriter",
     "region light ig_DdrkdrYv-yW f600-660", {"illustration": True}),
    ("B15", ["P16"], "nobody", "her face right after, in a card that grows to full frame on 'nobody would know'", ["card-full-morph"], "type-rise",
     "card-full morph NAP §3B (MOTION §4.2, L09)", {"result_claim": True}),
    ("B16", ["P17"], "pinprick", "a curved arrow to the single pinprick on her cheek", ["arrow-curved-callout"], "type-typewriter",
     "curved callout GMu3 f395-401", {"arrow": "curved-callout", "result_claim": True}),
    ("B17", ["P18", "P19"], "week", "a three-week strip with weeks 1-2 circled: the follow-up photo", ["calendar-date-circle"], "type-scale-pop",
     "calendar circle Are.na 31223791; Ro Calendar", {"result_claim": True}),
]
# keyframe per beat: the cue whose reveal completes the beat, + frames (the still checked, and the reuse-check crop)
KEY = {"B01": ("eyelids", 10), "B02": ("hollows", 20), "B03": ("not", 20), "B04": ("acid", 20), "B05": ("bruising", 16), "B06": ("half", 22),
       "B07": ("insertion", 22), "B08": ("lidocaine", 14), "B09": ("underneath", 22), "B10": ("deeper", 16), "B11": ("pillowy", 12),
       "B12": ("onesyringe", 20), "B13": ("expand", 16), "B14": ("tyndall", 24), "B15": ("nobody", 30), "B16": ("pinprick", 30), "B17": ("week", 22)}
SECTIONS = [("S1", "The concern"), ("S2", "The procedure"), ("S3", "The decision"), ("S4", "The result")]


def main():
    P = json.loads(PROPS.read_text(encoding="utf-8"))
    pc = {p["id"]: p for p in P["pieces"]}
    words = P["words"]
    dur = P["durationInFrames"] + 72
    # a beat starts with its first piece; a second beat inside the same piece starts 4 f before its cue word
    starts = [pc[b[1][0]]["at"] if i == 0 or BEATS[i - 1][1][-1] != b[1][0] else P["cues"][b[2]] - 4 for i, b in enumerate(BEATS)]
    sec_start = {}
    for b, s in zip(BEATS, starts):
        sid = pc[b[1][0]]["section"]
        sec_start.setdefault(sid, s)
    beats = []
    for i, (bid, pieces, cue, noun, devs, entry, refs, extra) in enumerate(BEATS):
        s0, s1 = starts[i], (starts[i + 1] - 1 if i + 1 < len(BEATS) else P["durationInFrames"] - 1)
        said = " ".join(w["w"] for w in words if w["piece"] in pieces)
        b = {"id": bid, "section": pc[pieces[0]]["section"], "start_f": s0, "end_f": s1, "start_s": round(s0 / 24, 3), "end_s": round(s1 / 24, 3),
             "pieces": pieces, "said": said, "noun": noun, "cue": cue, "cue_f": P["cues"][cue], "reveal_f": P["cues"][cue] + 1,
             "devices": devs, "entry": entry, "immersion": "full-bleed", "ostad": "in-footage", "refs": refs,
             "text_only": extra.get("text_only", False), "compliance": {}}
        kc, ko = KEY[bid]
        b["keyframe"] = {"f": min(s1, P["cues"][kc] + ko), "crop": [0, 0, 1080, 1580]}
        # photo layers for the static-image check (lint_compositions.py --static-image): the box is the photo's own rect
        if bid == "B04":
            b["assets"] = [{"kind": "image", "src": "undereye-filler/syringe.jpg (a still of this session's syringe)", "source": "clinic", "consent": "P0001/P0002 unknown"}]
            b["image_layers"] = [{"asset": "undereye-filler/syringe.jpg", "box": [98, 1000, 480, 480], "from_f": P["cues"]["usefiller"] + 1 + 36, "to_f": P["cues"]["cannula"] - 8}]
        if bid == "B12":
            e13 = pc["P13"]["at"] + pc["P13"]["dur"] - 1
            b["assets"] = [{"kind": "image", "src": "undereye-filler/syringe.jpg (thumbnail)", "source": "clinic", "consent": "P0001/P0002 unknown"}]
            b["image_layers"] = [{"asset": "undereye-filler/syringe.jpg", "box": [124, 1236, 150, 150], "from_f": pc["P12"]["at"] + 15, "to_f": e13 - 7}]
        if extra.get("arrow"):
            b["arrow"] = extra["arrow"]
        if extra.get("illustration"):
            b["illustration"] = True
            b["compliance"]["illustration_label"] = "Illustration"
        if extra.get("result_claim"):
            b["result_claim"] = True
            b["compliance"]["results_vary"] = "Individual results vary."
        beats.append(b)
    sheet = {
        "edit": "Ostad - under-eye filler with a blunt cannula (reel)", "fps": 24, "width": 1080, "height": 1920, "speed": P["speed"], "duration_f": dur,
        "time_base": "composition frames at 24 fps on the 1.1x edit; reveals at word onset + 1 f",
        "device_library": "research/ostad/style/DEVICE_LIBRARY.md", "cut": "research/ostad/style/undereye/cut.json",
        "compliance_profile": "injectable", "consent": "unknown", "not_for_posting": True,
        "status": "NOT FOR POSTING until patient consent = yes",
        "presentation": {"ostad": "in his own footage throughout (handheld 9:16 session video); no keying"},
        "sections": [{"id": s, "title": t, "start_f": sec_start[s]} for s, t in SECTIONS],
        "cards": [{"kind": "title", "device": "chapter-title-card", "start_f": 0}]
                 + [{"kind": "section", "device": "chapter-title-card", "start_f": sec_start[s], "title": t} for s, t in SECTIONS[1:]]
                 + [{"kind": "end", "device": "end-card", "start_f": P["durationInFrames"]}],
        "beats": beats,
    }
    OUT.write_text(json.dumps(sheet, indent=1), encoding="utf-8")
    print(f"wrote {OUT} ({len(beats)} beats, {dur} f)")


if __name__ == "__main__":
    main()
