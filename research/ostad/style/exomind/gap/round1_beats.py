"""round1_beats.py: apply gap-fix round 1 to research/ostad/style/exomind/beats.json (DECISIONS 14o, gap/ROUND1.md).

Writes, per beat: `layout` (LT/LC/LW him left + type/card/window right, SPLIT-L him left half + picture right half, SPLIT picture
halves with him out, FB full-frame picture, CO a centred object with him out), `ostad`, `immersion`, devices, image layers with their
`subject` (the same-asset cap, max 2 beats), events re-timed on the spoken words (yt_words onset + 1 f), and `sfx` by event class
resolved through the top-level `sfx_map`. Section cards get their own `layout` (all FB now). Idempotent: run it again and it writes
the same sheet. Usage: python -I round1_beats.py
"""
from __future__ import annotations
import json
from pathlib import Path

P = Path(__file__).resolve().parents[1] / "beats.json"
d = json.loads(P.read_text(encoding="utf-8"))
B = {b["id"]: b for b in d["beats"]}

d["sfx_map"] = {"draw": "exo_draw", "card": "exo_card", "chapter": "exo_chapter", "reveal": "swish", "chip": "pop", "tick": "yes"}
d["sfx_rule"] = ("one sound per event class (audio.md gap 2): draw = every arrow draw-on; card = a card or plate landing; chapter = a "
                 "section card; reveal = a picture cut, wipe or highlighter; chip = a chip, label or node pop; tick = a tick, marker or "
                 "circled slot. Gain: sfx_hero 0.32, the rest 0.16 (OstadYT6.tsx).")
d["presentation"] = {
    "ostad": "keyed on the cream room canvas, left third, 0.7x at (-30, -150), same place and size whenever he is on the canvas; "
             "he steps out on purpose for the takeovers (B04, B11, B12 into the circular pip; B06 centred phone; S2-B09, B15 splits; "
             "S3; S4-B18 the BTL MOA film). No blurred side-fill anywhere.",
    "keyed_source": "matte_fgr_cut.mp4 + matte_pha_cut.mp4 for the whole cut",
    "layout_rule": "no run of one layout family longer than 3 segments or 15 s (him-left family = LC, LT, LW, SPLIT-L); >= 3 full-frame "
                   "picture takeovers per minute; mean image fill >= 35 % (gap/immersion_layout.md).",
}

def ev(bid, rows):
    s0 = B[bid]["start_f"]
    B[bid]["events"] = [{"f": s0 + lf, "word": w, "what": what} for lf, w, what in rows]

def sfx(bid, rows, hero):
    s0 = B[bid]["start_f"]
    B[bid]["sfx"] = [[s0 + lf, c] for lf, c in rows]
    B[bid]["sfx_hero"] = [s0 + hero[0], hero[1]]

def layer(asset, box, f0, f1, subject):
    return {"asset": asset, "box": box, "from_f": f0, "to_f": f1, "subject": subject}

# chip boxes: the inner 140 px of each orbiting chip at B13 local f90 (ring rot -55 deg, chip radius 378 px round (1360, 476))
# ---------------------------------------------------------------------------------------------------------------- per beat
B["B01"].update(layout="LT")
sfx("B01", [(3, "reveal"), (26, "chip")], (3, "reveal"))

b = B["B02"]; s = b["start_f"]
b.update(layout="LC", image_layers=[layer("btl/unit_cut.png", [1180, 120, 560, 720], s + 11, s + 52, "btl_unit")])
b["arrow"] = "straight-pointer: tail above the FDA chip (1030, 640) -> applicator pad (1452, 566), weight 8 / 1.15 inside the Stage"
ev("B02", [(0, "helped", "plate lands (card)"), (11, "understand", "unit picture resolves through the frosted tile"),
           (20, "Exomind", "name + the pointer draws to the applicator pad (7 f, barb lands last)"), (38, "and", "FDA chip pops ⚠"),
           (45, "(exit)", "plate exits 7 f, done by end_f - 2")])
sfx("B02", [(0, "card"), (11, "reveal"), (20, "draw"), (38, "chip")], (20, "draw"))

b = B["B03"]; s = b["start_f"]
b.update(layout="LC")
b["assets"] = [{"kind": "image", "src": "btl/unit_cut.png (the Exomind unit)", "source": "btl"},
               {"kind": "image", "src": "clinic: clinic-library row 741, the 'after' half of a cheek before/after (lower face only, no eyes, no patient code) -> clinic/skin_after_00741.jpg", "source": "clinic", "approval": True}]
b["image_layers"] = [layer("btl/unit_cut.png", [960, 150, 320, 320], s, s + 101, "btl_unit"),
                     layer("clinic/skin_after_00741.jpg", [1500, 150, 320, 320], s + 2, s + 101, "clinic_skin_741")]
b["arrow"] = "curved-callout x2: his templeR (+40, -6, tracked) -> Our approach (on 'mind'), Our approach -> Your skin (on 'approach'); connectors 360 px and 188 px"
b["track"] = "callout #1 tail on templeR + (40, -6) via follow() (measured 3.8 / 5.5 px; the old headTop anchor carried an 8 px bias)"
ev("B03", [(0, "why", "two round windows arrive (unit, real treated skin), 2 f apart"), (29, "mind", "callout #1 leaves his temple, lands on Our approach"),
           (42, "approach", "callout #2 lands on Your skin"), (66, "total", "'total skin health' lights word by word (66 / 72 / 79)"),
           (79, "health", "skin disclaimer"), (94, "(exit)", "windows, arrows, type exit 7 f")])
sfx("B03", [(0, "card"), (29, "draw"), (42, "draw"), (66, "reveal")], (29, "draw"))

b = B["B04"]; s = b["start_f"]
b.update(layout="FB", ostad="pip", immersion="full-bleed", devices=["portrait-pip-circle"])
b["never_built_devices"] = []
b["image_layers"] = [layer("clinic/consult_wide.mp4", [0, 0, 1920, 1080], s, b["end_f"], "consult_nov5")]
ev("B04", [(0, "(cut)", "S1 'Your questions' on the consult, full frame (picture cut)"), (30, "questions", "card leaves; he pops into the pip bottom-left (tracked, feathered)"),
           (52, "conversation", "'In our office' chip"), (141, "(exit)", "chip out; picture cut back to the room at the beat line")])
sfx("B04", [(0, "chapter"), (30, "chip"), (52, "chip")], (0, "chapter"))

B["B05"].update(layout="LC")
ev("B05", [(26, "giveaway", "far panel fades in (Giveaway winners)"), (47, "email", "email panel slides in on sweep"), (62, "phone", "incoming call panel, ring"),
           (102, "messages", "sender rows light blue"), (120, "(exit)", "far panel first, 7 f")])
sfx("B05", [(26, "card"), (47, "chip"), (62, "chip"), (102, "reveal")], (47, "chip"))

b = B["B06"]; b.update(layout="CO", ostad="out", immersion="camera move")
ev("B06", [(0, "(cut)", "he steps out; the phone close-up is centred (1.4x)"), (1, "Please", "phone rises"), (36, "check", "message plate"), (42, "your", "sender"),
           (48, "text", "line 1"), (53, "messages", "line 2"), (93, "schedule", "highlighter on 'schedule a consultation'"), (104, "consultation", "status chip")])
sfx("B06", [(1, "card"), (36, "chip"), (93, "reveal"), (104, "tick")], (36, "chip"))

b = B["B07"]; b.update(layout="LC")
b["arrow"] = "arc-connector: from the reply's top (1060, 560) over the grid header (via 1420, 236) down onto the Thu 10:30 slot; crosses no slot text"
ev("B07", [(0, "(cut)", "he is back, keyed left; the phone steps back to 1x"), (7, "reply", "reply types"), (22, "text", "reply sends"),
           (29, "and", "calendar arrives"), (31, "we'll", "arc draws over the header (26 f)"), (57, "find", "arc lands on the slot"), (66, "appointment", "slot circled")])
sfx("B07", [(7, "chip"), (22, "reveal"), (29, "card"), (31, "draw"), (57, "tick"), (66, "tick")], (66, "tick"))

b = B["B08"]; s = b["start_f"]
b.update(layout="LW", immersion="camera move")
b["assets"] = [{"kind": "image", "src": "clinic: clinic-library row 3601, professional photo of an empty procedure room (no people) -> clinic/room_03601.jpg", "source": "clinic"},
               {"kind": "built", "src": "consultation intake form, field list from the practice Exomind page", "source": "built"}]
b["image_layers"] = [layer("clinic/room_03601.jpg", [700, 40, 1180, 860], s + 1, b["end_f"] - 2, "clinic_room_3601")]
ev("B08", [(1, "During", "treatment-room window arrives"), (3, "your", "form rises 16 px in 14 f (was 194 px in 27 f)"), (34, "goals", "goals field writes"),
           (56, "medical", "highlighter on Medical history"), (64, "history", "tick Medications"), (68, "history", "tick Implanted devices"), (72, "and", "tick Conditions"),
           (93, "Exomind", "answer lights"), (110, "appropriate", "answer circled"), (133, "(exit)", "form exits 7 f; focus eases between fields over 12 f (no jolt)")])
sfx("B08", [(1, "card"), (34, "chip"), (56, "reveal"), (64, "tick"), (68, "tick"), (72, "tick"), (110, "tick")], (56, "reveal"))

b = B["B09"]; s = b["start_f"]
b.update(layout="SPLIT", ostad="out", immersion="split", devices=["quote-card-carousel"])
b["assets"] = [{"kind": "image", "src": "clinic: clinic-library row 3614, the practice waiting room (professional photo, no people) -> clinic/waiting_03614.jpg (S2)", "source": "clinic"},
               {"kind": "video", "src": "clinic: Nov 5 2026 consult (row 30, Ostad + P0001), consult.mp4, full-height left half", "source": "clinic", "approval": True},
               {"kind": "built", "src": "question box: the brochure FAQ headings, no askers' names", "source": "built"}]
b["image_layers"] = [layer("clinic/waiting_03614.jpg", [0, 0, 1920, 1080], s, s + 29, "clinic_waiting_3614"),
                     layer("clinic/consult.mp4", [0, 0, 960, 1080], s + 30, b["end_f"], "consult_nov5")]
ev("B09", [(0, "Before", "S2 'Before you go' on the waiting room, full frame"), (30, "us", "picture cut to the split: consult left, question box right"),
           (43, "continue", "card: Does it hurt?"), (62, "questions", "card: Will it disrupt my daily life?"), (83, "question", "card: Is Exomind right for me? + highlight"),
           (94, "(exit)", "box exits 7 f")])
sfx("B09", [(0, "chapter"), (30, "reveal"), (31, "card"), (43, "chip"), (62, "chip"), (83, "chip")], (0, "chapter"))

b = B["B10"]; b.update(layout="LC")
b["assets"] = [{"kind": "built", "src": "ledger 'Tonight' with 4 rows; thumbs: the EXOMIND logo, chat, clipboard, calendar icons", "source": "built"}]
ev("B10", [(1, "If", "ledger arrives"), (3, "there's", "row 1"), (6, "there's", "row 2"), (13, "something", "row 3"), (19, "we", "row 4"),
           (26, "haven't", "open row 'Your question'"), (53, "hear", "row sweep"), (75, "(exit)", "ledger exits")])
sfx("B10", [(1, "card"), (26, "chip"), (53, "reveal")], (26, "chip"))

b = B["B11"]; s = b["start_f"]
b.update(layout="FB", ostad="pip", immersion="full-bleed", devices=["windowed-footage"])
b["assets"] = [{"kind": "video", "src": "clips/office_team.mp4 + clips/office_treat.mp4 (practice footage: Dr. Ostad and staff with a patient), each a full-height half at 1.33x", "source": "clinic", "approval": True}]
b["image_layers"] = [layer("clips/office_team.mp4", [0, 0, 960, 1080], s, b["end_f"], "coil_session"),
                     layer("clips/office_treat.mp4", [960, 0, 960, 1080], s + 8, b["end_f"], "coil_session")]
ev("B11", [(0, "(cut)", "picture cut: the team, left half; he is in the pip"), (8, "you", "right half wipes in on sweep (12 f)"),
           (76, "team", "'Our team' rises 16 px"), (79, "with", "credit 'Dr. Ostad's office'")])
sfx("B11", [(0, "reveal"), (8, "reveal"), (76, "chip")], (76, "chip"))

b = B["B12"]; s = b["start_f"]
b.update(layout="FB", ostad="pip", immersion="full-bleed", devices=["portrait-pip-circle", "timeline-markers", "arrow-marker-tick", "calendar-date-circle", "arrow-curved-callout"])
b["assets"] = [{"kind": "video", "src": "yt/session.mp4 (the Oct 30 session, P0006, 1920x1080) from 7 s, full frame", "source": "clinic", "approval": True},
               {"kind": "image", "src": "clinic: IMG_3714 (coil on P0006, staff at the BTL console, timer 24:30), cropped past the staff name tag", "source": "clinic", "approval": True}]
b["image_layers"] = [layer("yt/session.mp4", [0, 0, 1920, 1080], s, b["end_f"], "coil_session"),
                     layer("clinic/IMG_3714.jpg", [1300, 60, 560, 720], s + 4, b["end_f"] - 2, "coil_session")]
b["arrow"] = "curved-callout from the timeline's SESSION tick to the coil pad on the real photo (on 'office'); a drawn ring on the 24:30 console timer; marker-ticks on the timeline"
b["markup_on_real_photo"] = ["callout -> coil pad (IMG_3714)", "ring -> console timer 24:30 (IMG_3714)"]
ev("B12", [(0, "(cut)", "picture cut: the session full frame; he is in the pip"), (4, "look", "IMG_3714 card arrives right"), (14, "to", "timeline draws"),
           (19, "seeing", "tick Arrive"), (28, "in", "tick Session + 'about 20-30 min ⚠'"), (32, "the", "tick Walk out"),
           (36, "office", "callout SESSION -> coil pad on the photo"), (40, "office", "ring on the 24:30 timer"), (53, "(exit)", "card, ring, timeline exit by f61")])
sfx("B12", [(0, "reveal"), (4, "card"), (19, "tick"), (36, "draw"), (40, "tick")], (36, "draw"))

b = B["B13"]; s = b["start_f"]
b.update(layout="LC")
b["assets"] = [{"kind": "image", "src": "clinic: clinic-library row 3612, the reception corridor (professional photo) -> clinic/reception_03612.jpg (S3)", "source": "clinic"},
               {"kind": "image", "src": "practice bank: CEG + Ferulic Complex serum (skin care chip)", "source": "clinic"},
               {"kind": "image", "src": "practice bank: Clear + Brilliant handpiece on a forehead (treatments chip)", "source": "clinic"},
               {"kind": "image", "src": "BTL MOA film 98 s, the lit brain (mind chip) -> btl/web/moa_brainlit_98s.jpg", "source": "moa"}]
b["compliance"] = dict(b.get("compliance", {}), moa_label=True)
b["image_layers"] = [layer("clinic/reception_03612.jpg", [0, 0, 1920, 1080], s, s + 29, "clinic_reception_3612"),
                     layer("clinic/ceg_ferulic.jpg", [1323, 29, 140, 140], s + 47, s + 135, "ceg_ferulic"),
                     layer("clinic/cb_00451.jpg", [1600, 623, 140, 140], s + 47, s + 135, "clinic_cb_451"),
                     layer("btl/web/moa_brainlit_98s.jpg", [947, 566, 140, 140], s + 47, s + 135, "btl_moa_head")]
ev("B13", [(0, "again", "S3 'Total skin health' on the reception, full frame"), (30, "excited", "picture cut back to him; the ring track arrives"),
           (47, "creating", "labels fan out, chips (moving: 8 % push + pan)"), (59, "comprehensive", "segments fill clockwise"),
           (95, "total", "centre words light 95 / 104 / 112"), (104, "skin", "disclaimer"), (128, "(exit)", "segments retract")])
sfx("B13", [(0, "chapter"), (30, "card"), (47, "chip"), (59, "reveal")], (0, "chapter"))

B["B14"].update(layout="LT")
sfx("B14", [(1, "reveal")], (1, "reveal"))

b = B["B15"]; s = b["start_f"]
b.update(layout="SPLIT", ostad="out", immersion="split")
b["assets"] = [{"kind": "image", "src": "clinic catalog row 1705 (Fraxel pass on a jaw), local frame 432x768 at 2.2x ⚠ pull the original when iCloud recovers", "source": "clinic"},
               {"kind": "image", "src": "btl/img/Exomind_PIC_Applicator_0108_ENUS100.jpeg (the applicator, lit) -> btl/web/applicator_0108.jpg", "source": "btl"}]
b["image_layers"] = [layer("clinic/classic_fraxel_1705.jpg", [0, 0, 960, 1080], s, b["end_f"] - 1, "clinic_fraxel_1705"),
                     layer("btl/web/applicator_0108.jpg", [960, 0, 960, 1080], s + 41, b["end_f"] - 1, "btl_applicator")]
ev("B15", [(0, "taking", "picture cut: full-height split, classic laser left"), (41, "beyond", "divider wipes, the Exomind applicator opens right; 'Beyond'"),
           (92, "classic", "'Classic treatments' rises"), (143, "(exit)", "split closes 7 f")])
sfx("B15", [(0, "reveal"), (41, "reveal"), (92, "chip")], (41, "reveal"))

b = B["B16"]; s = b["start_f"]
b.update(layout="LC", devices=["network-node-graph", "arrow-dashed-flow", "arrow-straight-pointer"])
b["assets"] = [{"kind": "built", "src": "glass card 'The mind-skin link': Emotions -> Skin nodes; cited finding: Kabat-Zinn et al., Psychosomatic Medicine 1998 (37 psoriasis patients on light therapy; adding mindfulness, faster clearing) ⚠ physician-check", "source": "built"}]
b["arrow"] = "dashed-flow from his templeR (+40, -6, tracked) to 'Emotions' (on 'emotions'); straight-pointer Emotions -> Skin (on 'improve')"
b["compliance"] = {"physician_check": "Kabat-Zinn 1998 wording and citation", "no_rosacea_headline": True}
b["never_built"] = True  # arrow-straight-pointer
b["review"] = "gap round 1: the rosacea flare-trigger chart contradicted 'emotions improve our skin' and carried a rosacea headline (ADDED RULE 2); replaced"
ev("B16", [(1, "helping", "card arrives"), (55, "emotions", "dashed flow leaves his temple, lands on Emotions"), (56, "emotions", "Emotions node"),
           (69, "improve", "Skin node + pointer Emotions -> Skin"), (78, "skin", "the cited finding rises"), (101, "(exit)", "card exits 7 f")])
sfx("B16", [(1, "card"), (55, "draw"), (69, "chip"), (78, "reveal")], (55, "draw"))

b = B["B17"]; s = b["start_f"]
b.update(layout="FB", ostad="out", immersion="full-bleed", devices=["region-light-on-model", "arrow-orbit-arc"])
b["assets"] = [{"kind": "video", "src": "btl/video/Exomind_VIDEO_Mechanism-of-Action_ENNA101.mp4 49.0 s on (the applicator on the head, the region lights), 1.16x from the top so its subtitles fall below the frame", "source": "moa"}]
b.pop("exomind_only", None)  # field-through-skull is gone (the real MOA head film replaces the built skull)
b["compliance"] = {"moa_label": True}
b["image_layers"] = [layer("btl/video/MOA 49.0 s", [0, 0, 1920, 1080], s, b["end_f"] + 8, "btl_moa_head")]
b["arrow"] = "orbit-arc (full brand blue ring) around the lit region on 'create'"
ev("B17", [(0, "there's", "S4 'The technology' on the BTL MOA film, full frame"), (50, "create", "orbit arc rings the lit region"),
           (66, "neuroplasticity", "'Neuroplasticity' chip"), (101, "(dissolve)", "B18's film dissolves in over 8 f")])
sfx("B17", [(0, "chapter"), (50, "draw"), (66, "chip")], (0, "chapter"))

b = B["B18"]; b.update(layout="FB")
ev("B18", [(0, "rewire", "B18 film dissolves in over B17 (8 f)"), (2, "rewire", "route-trace on the axon (27 f)"), (15, "brain", "'Neural connectivity' chip")])
sfx("B18", [(2, "draw"), (15, "chip")], (2, "draw"))

b = B["B19"]; s = b["start_f"]
b.update(layout="LW", immersion="masked card")
b["assets"] = [{"kind": "video", "src": "BTL MOA film 74.6 s on at 0.8x (the synapse: vesicles release across the cleft), in a window cropped above its subtitles", "source": "moa"},
               {"kind": "built", "src": "pulse-train-synapse panel (ExoMind-only), over the window's lower right", "source": "built"}]
b["compliance"] = {"moa_label": True}
b["image_layers"] = [layer("btl/video/MOA 74.6 s", [700, 40, 1180, 860], s + 1, b["end_f"] - 2, "btl_moa_synapse")]
ev("B19", [(1, "proper", "synapse film window arrives"), (12, "proper", "pulse panel"), (27, "neurotransmitter", "release in rhythm + 'Synapse' chip"),
           (91, "focused", "noise clears; 'focused, in flow' lights 91 / 102 / 113"), (128, "(exit)", "panel and window exit")])
sfx("B19", [(1, "card"), (27, "chip"), (91, "reveal")], (27, "chip"))

b = B["B20"]; s = b["start_f"]
b.update(layout="SPLIT-L", ostad="keyed-left", immersion="split", devices=["split-labelled", "type-italic-voice", "arrow-dashed-flow"])
b["image_layers"] = [layer("clinic/p0001_quiet.mp4", [960, 0, 960, 1080], s, b["end_f"] - 2, "p0001_after_session")]
b["arrow"] = "dashed-flow from his side of the split to her words (on 'feel')"
ev("B20", [(0, "help", "the right half wipes open: her, full height"), (26, "feel", "dashed flow to her words"), (32, "better", "'It quiets my brain.' builds word by word over her footage"),
           (50, "how", "credit"), (60, "translate", "skin disclaimer"), (96, "(exit)", "split closes")])
sfx("B20", [(0, "reveal"), (26, "draw"), (32, "chip")], (26, "draw"))

# ---------------------------------------------------------------------------------------------------------------- cards
for c in d["cards"]:
    if c["kind"] == "section":
        c["layout"] = "FB"
        c["background"] = {"B04": "consult (clinic row 30)", "B09": "waiting room (clinic row 3614)", "B13": "reception (clinic row 3612)", "B17": "BTL MOA film 49 s"}[c["beat"]]
    if c["kind"] == "end":
        c["layout"] = "LC"
        c["sfx"] = [[c["start_f"], "card"], [c["start_f"] + 26, "draw"]]
        c["sfx_hero"] = [c["start_f"], "card"]
# key frames (stills sheet, reuse_check): a held frame of each beat on the new layout; full-frame layouts hash the full-bleed area
KF = {"B01": 60, "B02": 140, "B03": 230, "B04": 380, "B05": 500, "B06": 620, "B07": 735, "B08": 840, "B09": 960, "B10": 1040, "B11": 1150,
      "B12": 1225, "B13": 1340, "B14": 1420, "B15": 1530, "B16": 1690, "B17": 1790, "B18": 1830, "B19": 1930, "B20": 2050}
for b in d["beats"]:
    kf = b.setdefault("keyframe", {})
    kf["f"] = KF[b["id"]]
    if b.get("layout") in ("FB", "SPLIT", "CO"):
        kf["crop"] = [0, 0, 1920, 860]
for b in d["beats"]:
    b["never_built_devices"] = [x for x in b.get("never_built_devices", []) if x in b["devices"]]

P.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("beats.json updated:", len(d["beats"]), "beats")
