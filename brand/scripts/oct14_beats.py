"""Oct 14 injection reel: the machine beat sheet (schema of research/ostad/style/exomind/beats.json) from the cut's real frames.

  $PY -I brand/scripts/oct14_beats.py   # public/oct14/props.json -> research/ostad/style/oct14/beats.json
Then: $PY -I research/ostad/style/tools/variety_check.py research/ostad/style/oct14/beats.json
Frames are composition frames at 24 fps on the 1.15x edit. Beats follow the pieces of research/ostad/style/oct14/cut.json, grouped by
area. NOT FOR POSTING until patient consent = yes.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
P = json.loads((ROOT / "brand/remotion/public/oct14/props.json").read_text(encoding="utf-8"))
OUT = ROOT / "research/ostad/style/oct14/beats.json"
CUT = json.loads((ROOT / "research/ostad/style/oct14/cut.json").read_text(encoding="utf-8"))
c = P["cues"]
S = lambda pid: c["start:" + pid]
E = lambda pid: c["end:" + pid] - 1
said = {p["id"]: " ".join(w["w"] for w in P["words"] if w["piece"] == p["id"]) for p in P["pieces"]}
RV = {"results_vary": "Immediately after the filler. Individual results vary."}

# id, section, first piece, last piece, cue, noun (the literal visual), devices, entry, refs, extra
B = [
    ("B01", "S0", "intro-patient", "intro-typical", "typical", "his opening line; the title 'A typical patient', with 'Forehead lines · frown lines' landing on his words; his name",
     ["name-super"], "type-word-fade-rise", "DDOS f3-13 (5 f rise); name super G3 13/13", {}),
    ("B02", "S1", "intro-dynamic", "intro-dynamic", "dynamic", "the frown-line injection (IMG_3657) grows out of her glabella in a window while he explains dynamic lines; ring on the point, badge 1, curved callout",
     ["zoom-box-inset", "windowed-footage", "arrow-curved-callout"], "type-typewriter", "G4 T5 Ik5Zt8oGko4 f1245-1399; DDOS f2007-2214; GMu3 f395-401; ETSQ T7", {}),
    ("B03", "S1", "neuro-more-less", "neuro-more-less", "lifted", "him injecting her crow's feet (his line said while injecting); ticks point up over her brow tails on 'lifted'; 'More where it lifts' / 'Less where it droops'",
     ["arrow-marker-tick"], "type-box-slam", "WZ f940/944 ticks; GMu3 f1512-1522 box slam", {}),
    ("B04", "S1", "intro-lasts", "intro-lasts", "four", "a months rule 0-6; ticks on 'four' and 'five', the span fills: 4-5 months (his figure)",
     ["timeline-markers", "arrow-marker-tick"], "type-rise", "Are.na 16463981; WZ f940/944", {}),
    ("B05", "S1", "intro-onset-vs-filler", "intro-onset-vs-filler", "day", "a two-row ledger: Neuromodulator · a day or two / Filler · right away, each row wiped on its words",
     ["checklist-ledger"], "type-highlight-sweep", "DDOS Moment C f1686-1745 (row wipe 14 f)", {}),
    ("B06", "S2", "intro-midface", "intro-deflation", "deflation", "'Deflation' slams up; on 'moving down' a headed route draws on her face from the cheekbone past the jaw line",
     ["arrow-route-trace", "mechanism-on-real-image"], "type-box-slam", "DDOS f216-250 (27 f); G1 T8 IkrW f610-880", {}),
    ("B07", "S2", "intro-cheeks", "inj2-syringe", "literally", "the cheek injection (IMG_3641) grows out of her outer cheekbone while he names the product and the spot; badge 2",
     ["zoom-box-inset", "windowed-footage", "arrow-curved-callout"], "type-typewriter", "G4 T5; DDOS f2007-2214; GMu3 f395-401",
     {"brand_named": "Evolysse Form", "brand_evidence": "he says it: IMG_3642 0:04 'a syringe of what I call Evolysse Form' (and IMG_3652 0:08)"}),
    ("B08", "S3", "inj5-less-needed", "inj5-less-needed", "laugh3", "her close-up after the cheeks; rings on both laugh lines (tracked); 'Laugh lines: better' with the highlighter on 'better'",
     ["tracking-ring"], "type-highlight-sweep", "G4 T20 tQkjtXJEtxY f851-1091; DDOS Moment A", {}),
    ("B09", "S3", "after-smooth", "after-smooth", "used", "the cannula injection (IMG_3653) grows out of her laugh line on her close-up, a straight pointer to the point, then the window morphs to full frame",
     ["card-full-morph", "arrow-straight-pointer"], "type-typewriter", "NAP §3B (MOTION §4.2); WZ f926-933",
     {"brand_named": "Evolysse Smooth", "brand_evidence": "he says it: IMG_3656 0:54 'we used Evolysse Smooth here'"}),
    ("B10", "S3", "inj6-bruising", "inj6-bruising", "bruising", "the cannula in her lower face, full frame; 'A cannula, to minimise bruising' with the highlighter on his phrase",
     [], "type-highlight-sweep", "DDOS Moment A (highlighter 16 f)", {"text_only": True}),
    ("B11", "S4", "after-summary", "after-summary", "ba", "him pointing at her result, then two labelled cards (4:42 PM before / 4:55 PM right after, aligned); both push to the cheek, the same outline on both, the rest dims, a pointer to 'Fuller cheek'",
     ["split-labelled", "stepped-punch-in", "annotation-box-footage", "arrow-straight-pointer"], "type-typewriter", "G1 R27 yA0 f494-583; DDOS f1016-1026; G4 T2 5J8M f2293-2311; G4 T18",
     {"result_claim": True, "compliance": RV}),
    ("B12", "S4", "after-15min", "after-lasts", "fifteen", "the cards pull back with the numbered summary; a card rolls 'about 15 min' then 'Filler lasts 1-1½ years' (his figures)",
     ["rx-card"], "type-rolling-swap", "SU S2 rolling swap; our Ro RxCard", {"result_claim": True, "compliance": RV}),
]
SECT = [("S0", "Opening"), ("S1", "Upper face"), ("S2", "Cheeks and jawline"), ("S3", "Laugh lines"), ("S4", "The result")]


def main():
    beats = []
    for bid, sec, p0, p1, cue, noun, dev, entry, refs, extra in B:
        ids = [p["id"] for p in P["pieces"]]
        ps = ids[ids.index(p0): ids.index(p1) + 1]
        b = {"id": bid, "section": sec, "start_f": S(p0), "end_f": E(p1), "start_s": round(S(p0) / 24, 3), "end_s": round((E(p1) + 1) / 24, 3), "pieces": ps,
             "said": " ".join(said[x] for x in ps), "noun": noun, "cue": cue, "cue_f": c[cue], "reveal_f": c[cue] + 1, "devices": dev, "entry": entry,
             "immersion": "full-bleed", "ostad": "in-footage", "refs": refs, "text_only": extra.get("text_only", False), "compliance": extra.get("compliance", {})}
        for k in ("brand_named", "brand_evidence", "result_claim"):
            if k in extra:
                b[k] = extra[k]
        beats.append(b)
    secs = [{"id": s, "title": t, "start_f": next(b["start_f"] for b in beats if b["section"] == s)} for s, t in SECT]
    cards = [{"kind": "title", "device": "chapter-title-card", "start_f": 0}]
    cards += [{"kind": "section", "device": "chapter-title-card", "start_f": s["start_f"], "title": s["title"]} for s in secs[1:]]
    cards += [{"kind": "end", "device": "end-card", "start_f": P["durationInFrames"]}]
    sheet = {"edit": "Ostad - Oct 14 injections, by area (reel)", "fps": 24, "width": 1080, "height": 1920, "speed": P["speed"],
             "duration_f": P["durationInFrames"] + P["tail"], "time_base": "composition frames at 24 fps on the 1.15x edit; reveals at word onset + 1 f",
             "device_library": "research/ostad/style/DEVICE_LIBRARY.md", "cut": "research/ostad/style/oct14/cut.json", "compliance_profile": "injectable",
             "consent": "unknown", "not_for_posting": True, "status": "NOT FOR POSTING until patient consent = yes",
             "presentation": {"ostad": "in his own footage throughout (handheld 9:16 session video); no keying"}, "sections": secs, "cards": cards, "beats": beats}
    OUT.write_text(json.dumps(sheet, indent=1, ensure_ascii=False), encoding="utf-8")
    print("beats", len(beats), "duration", sheet["duration_f"], "f")


if __name__ == "__main__":
    main()
