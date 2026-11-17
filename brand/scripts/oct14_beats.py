"""Oct 14 injection reel: the machine beat sheet (schema of research/ostad/style/exomind/beats.json) from the cut's real frames.

  $PY -I brand/scripts/oct14_beats.py   # public/oct14/props.json -> research/ostad/style/oct14/beats.json
Then: $PY -I research/ostad/style/tools/variety_check.py research/ostad/style/oct14/beats.json
Frames are composition frames at 24 fps on the 1.15x edit. Beats follow the pieces of research/ostad/style/oct14/cut.json, grouped by
area. Consent = yes (written, 2026-11-17 catalog).
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
lines = list(dict.fromkeys(p["line"] for p in P["pieces"]))
said = {ln: " ".join(w["w"] for p in P["pieces"] if p["line"] == ln for w in P["words"] if w["piece"] == p["id"]) for ln in lines}
RV = {"results_vary": "Immediately after the filler. Individual results vary."}

# id, section, first piece, last piece, cue, noun (the literal visual), devices, entry, refs, extra
B = [
    ("B01", "S0", "intro-patient", "intro-typical", "typical", "hook: the needle at her cheek, then his opening line; Label C 'A typical patient', then punch-ins on her own forehead and frown with 'This is / Forehead lines', 'Frown lines'; crow's feet with three pen strokes; his name",
     ["name-super", "stepped-punch-in"], "type-word-fade-rise", "DDOS f3-13 (5 f rise); name super G3 13/13", {}),
    ("B02", "S1", "intro-dynamic", "intro-dynamic", "dynamic", "the frown-line injection (IMG_3657) on a STANDARD glass ClipCard along the bottom (Injection 1 · neuromodulator · used here / Frown lines, depth: into the muscle), a white curved arrow to her glabella; then the traced muscle drawing (frontalis, corrugator, procerus, orbicularis oculi)",
     ["std-clip-card", "arrow-curved-callout"], "type-typewriter", "G4 T5 Ik5Zt8oGko4 f1245-1399; DDOS f2007-2214; GMu3 f395-401; ETSQ T7", {}),
    ("B03", "S1", "neuro-more-less", "neuro-more-less", "lifted", "him injecting her crow's feet (his line said while injecting); ticks point up over her brow tails on 'lifted'; 'More where it lifts' / 'Less where it droops'",
     ["anatomy-trace-card"], "type-word-fade-rise", "WZ f940/944 ticks; GMu3 f1512-1522 box slam; anatomy traced from face.glb (anatomy_measure.json)",
     {"anatomy": "upper: frontalis, corrugator, procerus, orbicularis oculi (Z-Anatomy meshes)", "ostad_check": "pending"}),
    ("B04", "S1", "intro-lasts", "intro-lasts", "four", "a months rule 0-6; ticks on 'four' and 'five', the span fills: 4-5 months (his figure)",
     ["timeline-markers", "arrow-marker-tick"], "type-rise", "Are.na 16463981; WZ f940/944", {}),
    ("B05", "S1", "intro-onset-vs-filler", "intro-onset-vs-filler", "day", "a two-row ledger: Neuromodulator · a day or two / Filler · right away, each row wiped on its words",
     ["day-axis-lanes", "timeline-markers"], "type-typewriter", "DDOS Moment C f1686-1745 (row wipe 14 f)", {}),
    ("B06", "S2", "intro-midface", "intro-deflation", "deflation", "jowling: punch-in on her jaw with a pen contour; 'Patients usually ask / Fill the laugh lines first' struck on his 'but' ('Not first, here'), 'Here / Cheekbones first'; on 'moving down' a headed route on her face, the glass anatomy card 'The source / Deflation' traced from face.glb, the fat sliding down from a dashed ghost, the cheekbone strengthening on 'cheekbones'",
     ["arrow-route-trace", "mechanism-on-real-image", "type-strike-replace", "std-clip-card", "stepped-punch-in", "anatomy-trace-card"], "type-word-fade-rise", "DDOS f216-250 (27 f); G1 T8 IkrW f610-880; anatomy traced from face.glb (anatomy_measure.json)", {"anatomy": "midface: cheek and jowl fat (the model's approximated compartments), cheekbone, maxilla, jaw bone (Z-Anatomy); the fat slides down on 'moving down' (Illustration)", "ostad_check": "pending"}),
    ("B07", "S2", "intro-cheeks", "inj2-syringe", "literally", "the cheek injection (IMG_3641) on a STANDARD ClipCard (Injection 2 · Evolysse Form / Outer cheekbone, depth: deep, over the bone), a white arrow to her outer cheekbone, while he names the product and the spot",
     ["std-clip-card", "arrow-curved-callout"], "type-typewriter", "G4 T5; DDOS f2007-2214; GMu3 f395-401",
     {"brand_named": "Evolysse Form", "brand_evidence": "he says it: IMG_3642 0:04 'a syringe of what I call Evolysse Form' (and IMG_3652 0:08)"}),
    ("B08", "S3", "inj5-less-needed", "inj5-less-needed", "laugh3", "her close-up after the cheeks; white pen rings on both laugh lines (tracked); 'Laugh lines: better' with a pen underline on 'better'",
     ["arrow-hand-drawn"], "type-word-fade-rise", "G4 T20 tQkjtXJEtxY f851-1091; DDOS Moment A", {}),
    ("B09", "S3", "after-smooth", "after-smooth", "used", "the cannula injection (IMG_3653) on a STANDARD ClipCard (Injection 3 · Evolysse Smooth / Laugh lines, depth: under the skin, by cannula), a straight white pointer to her laugh line; the clip plays in sync with the next shot, which cuts to it full frame",
     ["std-clip-card", "arrow-straight-pointer"], "type-typewriter", "NAP §3B (MOTION §4.2); WZ f926-933",
     {"brand_named": "Evolysse Smooth", "brand_evidence": "he says it: IMG_3656 0:54 'we used Evolysse Smooth here'"}),
    ("B10", "S3", "inj6-bruising", "inj6-bruising", "bruising", "the cannula in her lower face, full frame; Label C 'A cannula' with a pen underline under 'to minimise bruising'",
     [], "type-word-fade-rise", "DDOS Moment A (highlighter 16 f)", {"text_only": True}),
    ("B11", "S4", "after-summary", "after-summary", "ba", "marionette lines: pen strokes from her mouth corners on the after close-up; then the surgeon before/after: one aligned card, entry X marks, pen paths and hatched zones in treatment order with product labels, a line wipe to 4:55 PM with the markup faint, one straight arrow outward, 'Fuller cheek' (measured), honest notes where no change is measurable",
     ["std-skin-window", "brand-shape-wipe", "arrow-straight-pointer", "arrow-hand-drawn"], "type-typewriter", "G1 R27 yA0 f494-583; DDOS f1016-1026; G4 T2 5J8M f2293-2311; G4 T18",
     {"result_claim": True, "compliance": RV}),
    ("B12", "S4", "after-15min", "after-lasts", "fifteen", "the cards pull back with the numbered summary; a card rolls 'about 15 min' then 'Filler lasts 1-1½ years' (his figures)",
     ["rx-card"], "type-rolling-swap", "SU S2 rolling swap; our Ro RxCard", {"result_claim": True, "compliance": RV}),
]
SECT = [("S0", "Opening"), ("S1", "Upper face"), ("S2", "Cheeks and jawline"), ("S3", "Laugh lines"), ("S4", "The result")]


def main():
    beats = []
    for bid, sec, p0, p1, cue, noun, dev, entry, refs, extra in B:
        ps = lines[lines.index(p0): lines.index(p1) + 1]
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
             "consent": "yes", "not_for_posting": False, "status": "consent = yes (written, before the procedure; clinic-library DECISIONS 2026-11-17)",
             "presentation": {"ostad": "in his own footage throughout (handheld 9:16 session video); no keying"}, "sections": secs, "cards": cards, "beats": beats}
    OUT.write_text(json.dumps(sheet, indent=1, ensure_ascii=False), encoding="utf-8")
    print("beats", len(beats), "duration", sheet["duration_f"], "f")


if __name__ == "__main__":
    main()
