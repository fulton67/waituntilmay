"""Generate research/ostad/style/exomind/beats.json (source of truth for the v6 builder).
Frames are composition frames at 24 fps on the 1.15x edit (comp s = cut s / 1.15). Word reveals = onset frame + 1 (MOTION.md `cut`)."""
import json, sys

FPS = 24
G = [760, 60, 1120, 840]          # default graphic crop: right two-thirds, above the caption band, clear of keyed Ostad (x 80-750)
FULL = [0, 0, 1920, 860]           # full-bleed crop above the caption band
DISC = "Exomind does not directly treat skin conditions."
MOA = "Conceptual depiction. Results may vary."

def s(f): return round(f / FPS, 3)

def A(kind, src, source, consent=None, credit=None, ai=False):
    a = {"kind": kind, "src": src, "source": source}
    if consent: a["consent"] = consent
    if credit: a["credit"] = credit
    if ai: a["ai_generated"] = True
    return a

def E(f, word, what): return {"f": f, "word": word, "what": what}

beats = []
def B(**k):
    k["start_s"], k["end_s"] = s(k["start_f"]), s(k["end_f"])
    k.setdefault("arrow", None); k.setdefault("text_only", False); k.setdefault("ostad", "keyed-left")
    k.setdefault("image_layers", []); k.setdefault("compliance", {}); k.setdefault("track", None)
    beats.append(k)

B(id="B01", section="S0", start_f=0, end_f=105, said="Thank you for spending part of your evening with us. I hope tonight's conversation has",
  noun="the evening / the title (EXOMIND)", devices=["wordmark-depth-sandwich", "name-super"], entry="type-word-fade-rise", text_only=True,
  immersion="depth push", card="title",
  assets=[A("matte", "brand/edits/exomind-skin/matte_fgr_cut.mp4 + matte_pha_cut.mp4", "ostad-footage"), A("type", "EXOMIND wordmark set in the display face", "built")],
  events=[E(3, "(open)", "giant EXOMIND wordmark rises 6 % H out of its mask behind keyed Ostad, 5 f ease-out, opacity with it (DDOS f3-9)"),
          E(8, "(open)", "subline 'Total skin health' rises 3 f later, 5 f"),
          E(26, "spending", "name-super 'Dr. Ariel Ostad / Triple Board-Certified Dermatologist' lower left under him (fade, holds to f98)"),
          E(1, "(hold)", "wordmark layer scales 1.000->1.012 over the beat while the matte layer holds: 2-layer depth push"),
          E(98, "has", "wordmark defocuses 0->8 px and fades on `exit` 7 f; name-super fades 7 f")],
  keyframe={"f": 60, "crop": [760, 140, 1160, 520]}, sfx=[[3, "swish"], [26, "pop"]],
  track="faceSafeRect: wordmark baseline kept below headTop-40 px so letters pass behind the hair, never across the face")

B(id="B02", section="S0", start_f=106, end_f=159, said="helped you understand ExoMind and",
  noun="the Exomind device (unit + applicator)", devices=["product-plate-reveal", "arrow-straight-pointer"], entry="type-box-slam",
  immersion="masked card", arrow="straight-pointer",
  assets=[A("image", "btl/unit_cut.png (Exomind unit cut-out)", "btl", credit="Image: BTL Industries")],
  events=[E(106, "helped", "neutral glass plate in the unit's final rect (`plate` 18 f)"),
          E(125, "ExoMind", "unit cut-out fades through the plate (`plate` 18 f); word 'Exomind' rises 4 f then a box wipes L->R behind it 4 f (GMu3 f1512-1520)"),
          E(143, "and", "straight pointer: shaft grows 7 f tail->tip toward the applicator head, solid head lands on f150 (WZ f926-933); holds with a 2 px breathe"),
          E(150, "and", "chip 'FDA-cleared: major depressive disorder' arrives (`arrive` 14 f) under the label ⚠"),
          E(106, "(hold)", "unit drifts scale 1.00->1.02 and 6 px left over the beat"),
          E(152, "(exit)", "pointer retracts tip->tail 7 f, plate+unit exit 7 f")],
  image_layers=[{"asset": "btl/unit_cut.png", "box": [1180, 120, 560, 720], "from_f": 125, "to_f": 152}],
  compliance={"physician_check": ["FDA-cleared only for MDD in adults who failed antidepressants: chip wording"]},
  keyframe={"f": 152, "crop": G}, sfx=[[106, "card"], [125, "pop"], [143, "swish"]])

B(id="B03", section="S0", start_f=160, end_f=262, said="why we include the mind in our approach to your total skin health.",
  noun="the chain mind -> our approach -> your skin", devices=["flow-diagram-build", "arrow-curved-callout"], entry="type-ghost-to-lit",
  immersion="masked card", arrow="curved-callout",
  assets=[A("image", "flora/head_A_glass_brain.png (glass head)", "built", ai=True),
          A("image", "clinic: IMG_3712 (staff sets the coil arm; BTL logo readable), crop to the coil + hand", "clinic", consent="P0006 unknown"),
          A("image", "btl/img/Exomind_PIC_Female-Model_1012_ENNA100.jpg (cheek crop)", "btl", credit="Image: BTL Industries")],
  events=[E(160, "why", "three round masked windows arrive on an arc (`arrive` 14 f, 2 f stagger); line 'total skin health' set dim under them (rises 2 % H in 5 f)"),
          E(188, "mind", "curved callout #1 draws tail->tip 7 f from Ostad's head crown (track headTop) to the 'Mind' window; open-V head lands f195, window rim turns blue"),
          E(201, "approach", "curved callout #2 'Mind' -> 'Our approach' draws 7 f, head lands f208"),
          E(224, "total", "'total' lit (1 f)"), E(231, "skin", "curved callout #3 -> 'Your skin' 7 f, head lands f238; 'skin' lit"),
          E(238, "health.", "'health' lit; disclaimer line fades in under the diagram"),
          E(160, "(hold)", "windows drift 1.5 % scale and 6-10 px each, out of phase; landed arrows breathe <= 2 px along their normals"),
          E(255, "(exit)", "arrows retract tail-first along the path 7 f; windows exit 7 f")],
  image_layers=[{"asset": "flora/head_A_glass_brain.png", "box": [860, 200, 260, 260], "from_f": 160, "to_f": 255},
                {"asset": "clinic/IMG_3712.jpg", "box": [1200, 130, 260, 260], "from_f": 160, "to_f": 255},
                {"asset": "btl/Female-Model_1012.jpg", "box": [1540, 200, 260, 260], "from_f": 160, "to_f": 255}],
  compliance={"disclaimer": DISC, "physician_check": ["the mind as part of total skin health (framing, not a treatment claim)"]},
  keyframe={"f": 245, "crop": G}, sfx=[[160, "card"], [188, "swish"], [201, "swish"], [231, "swish"]],
  track="arrow #1 tail = follow('headTop') + (0,-24) px in comp space; tip error spec median < 6 px, p95 < 15 px")

B(id="B04", section="S1", start_f=263, end_f=413, said="Your questions are an important part of this conversation, and I appreciate your interest in learning more about your care.",
  noun="the conversation (a real consultation in his office)", devices=["card-full-morph"], entry="type-scale-pop",
  immersion="full-bleed", ostad="in-footage", section_card={"title": "Your questions", "num": "01", "start_f": 263, "end_f": 292},
  assets=[A("video", "clinic: Nov 5 raw ExoMind consult (Ostad + P0001), via catalog.sqlite; v4.1 used clips/consult_q.mp4", "clinic", consent="P0001 unknown")],
  events=[E(293, "questions", "consult clip in a rounded window (r 24) arrives right (`arrive` 14 f), playing"),
          E(314, "conversation,", "card -> full frame on `morph` 26 f (radius 24 -> 0); keyed Ostad + canvas fade out 5 f"),
          E(341, "and", "chip 'In our office' pops (`type-scale-pop` 5 f, 0.95->1)"),
          E(314, "(hold)", "footage pushes 1.00->1.04 (in-out) over the full-bleed span"),
          E(386, "care.", "full frame -> card on `morph` 26 f, keyed Ostad fades back 5 f; card exits 7 f at f406")],
  keyframe={"f": 360, "crop": FULL}, sfx=[[293, "card"], [314, "swish"], [341, "pop"]])

B(id="B05", section="S1", start_f=414, end_f=545, said="We'll notify our giveaway winners by email or phone, so please keep an eye out for messages from our team.",
  noun="the notification (an email and a phone call from the team)", devices=["spatial-glass-ui"], entry="type-slide-side",
  immersion="depth push",
  assets=[A("ui", "glass notification panels (gift, envelope, incoming call), built", "built")],
  events=[E(439, "giveaway", "far-plane glass panel 'Giveaway winners' arrives (`arrive` 14 f) at depth 0.6 (smaller, softer shadow)"),
          E(460, "email", "near panel: envelope icon + 'Email · from our team' slides in from the right 9 f, 3.4 % H (type-slide-side)"),
          E(473, "phone,", "second near panel: incoming-call card slides in 9 f; its ring pulses 3x (12 f period)"),
          E(516, "messages", "both panels' sender row 'Our team' lights (ink -> blue, 1 f)"),
          E(414, "(hold)", "panels drift on parallax: near 12 px/s, far 5 px/s, opposite directions"),
          E(538, "(exit)", "panels exit 7 f, far one first")],
  keyframe={"f": 525, "crop": G}, sfx=[[439, "card"], [460, "pop"], [473, "pop"]])

B(id="B06", section="S1", start_f=546, end_f=666, said="Please also check your text messages after the event. If you would like to schedule a consultation,",
  noun="a phone, a text from the practice arriving", devices=["phone-message-arrives"], entry="type-message-lines",
  immersion="depth push",
  assets=[A("ui", "glass phone object (3D tilt), lock screen, message card from 'Dr. Ostad's office', built", "built")],
  events=[E(547, "Please", "phone object rises 4.2 % H in 11 f (`arrive`), tilted -8 deg; lock screen dim"),
          E(582, "check", "message plate lands on the lock screen in 4 f; badge '1' pops on the same frame (glp1 f860-870)"),
          E(588, "your", "sender row 'Dr. Ostad's office · now' fades 4 f"),
          E(593, "text", "line 1 'Thanks for joining us tonight.' fades + rises 1 % H in 4 f"),
          E(598, "messages", "line 2 'Reply to schedule a consultation.' 4 f"),
          E(637, "schedule", "'schedule a consultation' gets a highlighter block (sweep 16 f)"),
          E(648, "consultation,", "status chip spinner -> tick (glp1 f935)"),
          E(547, "(hold)", "phone tilts +-1.5 deg and drifts 8 px on a 3.2 s period; a slow camera push 1.00->1.03 on the phone layer"),
          E(660, "(exit)", "phone stays for B07 (same object, not a new device)")],
  keyframe={"f": 655, "crop": G}, sfx=[[547, "card"], [582, "pop"], [648, "yes"]])

B(id="B07", section="S1", start_f=667, end_f=750, said="you can reply to our text and we'll help you find an appointment.",
  noun="the reply and the appointment slot", devices=["arrow-arc-connector", "calendar-date-circle"], entry="type-typewriter",
  immersion="split", arrow="arc-connector",
  assets=[A("ui", "phone (from B06) | week calendar with time slots, labelled 'Illustration'", "built")],
  events=[E(667, "you", "phone slides to the left half of the graphic area; a hairline divider wipes 14 f (`sweep`): split phone | calendar"),
          E(673, "reply", "reply bubble types 'Yes, I'd like to book' at 3.9 chars/f, linear (DDOS f1539-1556)"),
          E(688, "text", "bubble sends (rises 6 px, 4 f)"),
          E(696, "and", "calendar arrives right (`arrive` 14 f); arc connector grows 26 f from the bubble to the calendar with the message icon riding its growing end (D_bh f1108-1140)"),
          E(723, "find", "arc head lands on a free slot (last draw frame, no overshoot)"),
          E(733, "appointment.", "circle draws round the slot 12 f (`sweep`), slot fills blue"),
          E(667, "(hold)", "the arc keeps a 1.5 px breathe; both halves drift 4 px/s opposite"),
          E(744, "(exit)", "arc retracts along its path 7 f, both halves exit 7 f")],
  keyframe={"f": 746, "crop": G}, sfx=[[673, "pop"], [696, "swish"], [733, "yes"]])

B(id="B08", section="S1", start_f=751, end_f=892, said="During your visit, we'll discuss your goals, review your medical history, and determine whether ExoMind is appropriate for you.",
  noun="the intake form / medical history", devices=["intake-form-fill"], entry="type-highlight-sweep",
  immersion="camera move",
  assets=[A("ui", "consultation intake form, built; field list from the practice Exomind page", "built")],
  events=[E(752, "During", "form card slides up 27 f (G4 T14 cover) and the canvas dims to 0.5 over 14 f"),
          E(784, "goals,", "field 'Your goals' fills (handwritten-weight type, +16 f: f800)"),
          E(806, "medical", "highlighter sweeps behind 'Medical history' 16 f (DDOS Moment A)"),
          E(813, "history,", "three rows tick +16/+20/+24 f: 'Current medications' f829, 'Implanted devices' f833, 'Medical conditions' f837 ⚠"),
          E(844, "ExoMind", "last field 'Is Exomind appropriate for you?' lights"),
          E(859, "appropriate", "answer 'Decided with Dr. Ostad' checks in a drawn circle 12 f"),
          E(752, "(hold)", "camera push 1.00->1.06 that follows the active field (in-out, 0.3 % per f)"),
          E(885, "(exit)", "form exits 7 f")],
  compliance={"physician_check": ["'Certain medical conditions, implanted devices, or other circumstances may make TMS inappropriate.' (practice page)"]},
  keyframe={"f": 870, "crop": G}, sfx=[[752, "card"], [806, "swish"], [829, "yes"], [859, "yes"]])

B(id="B09", section="S2", start_f=893, end_f=996, said="Before you go, please stay with us and continue sending your questions throughout the question box.",
  noun="the live question box", devices=["quote-card-carousel"], entry="type-card-rise",
  immersion="masked card", section_card={"title": "Before you go", "num": "02", "start_f": 893, "end_f": 922},
  assets=[A("ui", "Q&A panel 'Your questions · live' with question cards; the three questions are the brochure FAQ headings", "built", credit="Questions: Exomind patient brochure FAQ")],
  events=[E(923, "us", "Q&A panel arrives (`arrive` 14 f)"),
          E(933, "continue", "card 1 'Does it hurt?' rises 10.7 % H in 17 f, keeps drifting up 4 px/s (colin DZiJljQJEKN f46-64)"),
          E(954, "questions", "card 2 'Will it disrupt my daily life?' pushes in from the right; card 1 steps back (scale 0.94, 0.6 opacity)"),
          E(975, "question", "card 3 'Is Exomind right for me?' pushes in; its phrase 'right for me' highlights +4 f"),
          E(990, "(exit)", "panel exits 7 f")],
  keyframe={"f": 985, "crop": G}, sfx=[[923, "card"], [933, "pop"], [954, "pop"], [975, "pop"]])

B(id="B10", section="S2", start_f=997, end_f=1080, said="If there's something we haven't covered, I'd love to hear about it.",
  noun="what tonight covered, and the gap left open", devices=["checklist-ledger"], entry="type-slide-side",
  immersion="camera move",
  assets=[A("ui", "ledger 'Tonight' with 4 rows, each with a thumbnail of this edit's own object (unit, phone, form, question card)", "built")],
  events=[E(998, "If", "4 ruled rows wipe in 14 f each, 2 f stagger, each ticks +1 f after its wipe"),
          E(1022, "haven't", "5th row slides in 9 f from the left as an empty dashed row: 'Your question'"),
          E(1049, "hear", "light sweep crosses the empty row (sweep 16 f)"),
          E(998, "(hold)", "ledger drifts 0.8 % scale"),
          E(1073, "(exit)", "rows exit 7 f bottom-up")],
  keyframe={"f": 1060, "crop": G}, sfx=[[998, "card"], [1022, "pop"]])

B(id="B11", section="S2", start_f=1081, end_f=1179, said="Thank you again for joining us and trusting our team with your care.",
  noun="our team", devices=["windowed-footage"], entry="type-word-fade-rise",
  immersion="masked card",
  assets=[A("video", "clips/office_team.mp4 (practice footage, staff)", "clinic", consent="staff release unknown")],
  events=[E(1082, "Thank", "rounded window (r 24) arrives right (`arrive` 14 f), footage plays"),
          E(1158, "team", "'Our team' rises 6 % H in 5 f with its fade; credit 'Our office' 3 f later"),
          E(1082, "(hold)", "window content pushes 1.00->1.05 and drifts 8 px"),
          E(1172, "(exit)", "window exits 7 f")],
  keyframe={"f": 1168, "crop": G}, sfx=[[1082, "card"], [1158, "pop"]])

B(id="B12", section="S2", start_f=1180, end_f=1241, said="We look forward to seeing you in the office, and",
  noun="a session in the office (coil on the head, console)", devices=["portrait-pip-circle", "timeline-markers", "arrow-marker-tick"], entry="type-scale-pop",
  immersion="full-bleed", ostad="pip", arrow="marker-tick", exomind_only="session-timeline",
  assets=[A("image", "clinic: IMG_3714 (coil on reclining P0006, staff at the BTL console, timer 24:30), with a depth map for 2.5D", "clinic", consent="P0006 unknown")],
  events=[E(1181, "We", "hard cut to IMG_3714 full frame; 3 depth layers (staff+console / patient+coil / wall) push at 1.0 / 0.6 / 0.3 rates, 1.00->1.06 over the beat"),
          E(1181, "We", "Ostad drops into a 260 px circle bottom-left (keyed footage inside), pops on the cut"),
          E(1198, "seeing", "timeline hairline draws along the bottom 14 f; marker 'Arrive' pops (1 f)"),
          E(1207, "in", "marker 'Session' pops, segment label 'about 20-30 min' scale-pops 5 f ⚠"),
          E(1214, "office,", "marker 'Walk out' pops (pair pop, 1 f each, WZ f940/944)"),
          E(1234, "and", "cut back to keyed Ostad")],
  image_layers=[{"asset": "clinic/IMG_3714.jpg", "box": [0, 0, 1920, 860], "from_f": 1181, "to_f": 1233}],
  compliance={"physician_check": ["session length: brochure 'under 30 min' vs practice page 'about 20 min' (conflict, client to confirm)"]},
  keyframe={"f": 1225, "crop": [420, 0, 1500, 860]}, sfx=[[1181, "swish"], [1198, "pop"], [1207, "pop"], [1214, "pop"]])

B(id="B13", section="S3", start_f=1242, end_f=1378, said="again, I am so excited in creating this comprehensive approach to total skin health. For me,",
  noun="'comprehensive': the full circle of skin care, treatments and the mind", devices=["donut-ring-fill"], entry="type-orbit-labels",
  immersion="camera move", section_card={"title": "Total skin health", "num": "03", "start_f": 1242, "end_f": 1271},
  assets=[A("ui", "3-segment ring with image chips", "built"),
          A("image", "btl/img/Exomind_PIC_Female-Model3_0249_ENNA100.jpg (skin chip)", "btl", credit="Image: BTL Industries"),
          A("image", "clinic: IMG_3712 crop (treatment chip)", "clinic", consent="P0006 unknown"),
          A("image", "flora/head_A_glass_brain.png (mind chip)", "built", ai=True)],
  events=[E(1272, "(after card)", "ring outline (3 segments, gaps 6 deg) appears (`arrive` 14 f)"),
          E(1288, "creating", "labels 'Skin care' / 'Treatments' / 'The mind' fan out on an arc: first pair 3 f, third lands by +9 f, 2 f stagger (glp1 f626-644)"),
          E(1300, "comprehensive", "ring fills clockwise segment by segment, 22 f per ring with 12 f stagger is compressed to 3 x 7 f + 1 f gaps (G3 T15)"),
          E(1335, "total", "centre 'Total skin health' lights word by word on total/skin/health"),
          E(1344, "skin", "disclaimer line fades in under the ring"),
          E(1272, "(hold)", "ring rotates 2 deg/s; image chips drift 4 px; camera push 1.00->1.03"),
          E(1371, "(exit)", "segments retract anticlockwise 7 f")],
  image_layers=[{"asset": "btl/Female-Model3_0249.jpg", "box": [1500, 180, 140, 140], "from_f": 1288, "to_f": 1371},
                {"asset": "clinic/IMG_3712.jpg", "box": [1560, 560, 140, 140], "from_f": 1288, "to_f": 1371},
                {"asset": "flora/head_A_glass_brain.png", "box": [960, 380, 140, 140], "from_f": 1288, "to_f": 1371}],
  compliance={"disclaimer": DISC},
  keyframe={"f": 1360, "crop": G}, sfx=[[1272, "card"], [1288, "pop"], [1300, "swish"]])

B(id="B14", section="S3", start_f=1379, end_f=1448, said="it's about really being at the next frontier of",
  noun="'the next frontier' (the words are the point)", devices=["type-name-decode"], entry="type-name-decode", text_only=True,
  immersion="camera move",
  assets=[A("type", "'The next frontier' in the display face", "built")],
  events=[E(1380, "it's", "'The next frontier' set as dim asterisks; characters resolve left to right"),
          E(1413, "next", "'next' fully resolved"),
          E(1419, "frontier", "last letter of 'frontier' resolves on its onset +1 (40 f resolve, G4 T22 rate)"),
          E(1380, "(hold)", "a horizon hairline draws under the line (`sweep` 26 f) and the type layer pushes 1.00->1.04"),
          E(1442, "(exit)", "type exits 7 f")],
  keyframe={"f": 1435, "crop": G}, sfx=[[1380, "swish"]])

B(id="B15", section="S3", start_f=1449, end_f=1599, said="taking care of one's skin beyond just the sort of classic treatments that are available",
  noun="classic treatments vs beyond (the mind)", devices=["split-labelled"], entry="type-rise",
  immersion="split",
  assets=[A("video", "clips/office_treat.mp4 (practice treatment footage)", "clinic", consent="patient in frame: check"),
          A("image", "flora/head_A_glass_brain.png (glass head, slow 2.5D turn)", "built", ai=True)],
  events=[E(1450, "taking", "left panel arrives (`arrive` 14 f) with the treatment footage"),
          E(1490, "beyond", "a vertical line wipes 14 f (`sweep`) and opens the right panel: glass head; label 'Beyond' rises 4.2 % H in 11 f"),
          E(1540, "classic", "left label 'Classic treatments' rises 4.2 % H in 11 f"),
          E(1450, "(hold)", "panels drift 4 px/s in opposite directions; head layer parallax-turns 3 deg"),
          E(1592, "(exit)", "split closes 7 f")],
  image_layers=[{"asset": "flora/head_A_glass_brain.png", "box": [1350, 100, 520, 740], "from_f": 1490, "to_f": 1592}],
  keyframe={"f": 1580, "crop": G}, sfx=[[1450, "card"], [1490, "swish"], [1540, "pop"]])

B(id="B16", section="S3", start_f=1600, end_f=1709, said="helping you become aware of how our emotions improve our skin,",
  noun="emotions (the head) -> skin", devices=["arrow-light-ribbon"], entry="type-highlight-sweep",
  immersion="depth push", arrow="light-ribbon",
  assets=[A("matte", "keyed Ostad (matte), the ribbon passes behind his head via the matte", "ostad-footage"),
          A("image", "btl/img/Exomind_PIC_Female-Model3_0081_ENNA100.jpg (skin close crop, right card)", "btl", credit="Image: BTL Industries")],
  events=[E(1601, "helping", "skin card arrives right (`plate` 18 f then picture 18 f)"),
          E(1655, "emotions", "a glowing tapered ribbon draws on round Ostad's head above the brow (track headTop, orbit radius 1.15 x head width), 28 f per pass (glp1 f1100-1170); the back half passes behind him via the matte; label 'Emotions' with a highlighter sweep 16 f"),
          E(1696, "skin,", "the ribbon peels off its orbit and lands on the skin card (head on the last draw frame); label 'Skin'"),
          E(1655, "(hold)", "the ribbon never stops: it keeps travelling along its path; skin card pushes 1.00->1.03"),
          E(1702, "(exit)", "ribbon rides off along its path 7 f, card exits 7 f")],
  image_layers=[{"asset": "btl/Female-Model3_0081.jpg", "box": [1380, 180, 420, 560], "from_f": 1619, "to_f": 1702}],
  compliance={"physician_check": ["'how our emotions improve our skin' (his line: mind-skin link, not an Exomind claim)"]},
  keyframe={"f": 1700, "crop": [1100, 60, 780, 840]}, sfx=[[1601, "card"], [1655, "swish"], [1696, "pop"]],
  track="ribbon orbit centre = follow('headTop') + (0, +0.35 head height); orbit kept above the brow line (follow('glabella').y - 20 px) so it never crosses the face")

B(id="B17", section="S4", start_f=1710, end_f=1810, said="and if there's technology that can actually help create neuroplasticity,",
  noun="the coil's magnetic field passing through the skull to the region it targets", devices=["region-light-on-model", "arrow-orbit-arc"], entry="type-box-slam",
  immersion="full-bleed", ostad="out", arrow="orbit-arc", exomind_only="field-through-skull",
  section_card={"title": "The technology", "num": "04", "start_f": 1710, "end_f": 1739},
  assets=[A("image", "flora/head_B_glass_skull.png (glass head in profile, 2.5D)", "built", ai=True),
          A("image", "btl/img/Exomind_PIC_Applicator_0429_ENUS100.jpeg (applicator, cut out)", "btl", credit="Image: BTL Industries"),
          A("reference", "gold pick k4lEDTVCb0U 53-59 s (applicator descends, cyan field under the coil)", "gold-pick")],
  events=[E(1740, "(after card)", "full frame: glass head in profile on the cream canvas; applicator descends onto the forehead (`arrive` 14 f, 40 px), gold pick f1325-1400"),
          E(1750, "help", "three dashed orbit arcs grow from the coil into the skull, 9 f each, 4 f stagger (DYKh5yyPxxg f1200-1264)"),
          E(1765, "create", "the arcs pulse outward on a 12 f rhythm (one pulse = one arc pushed 6 px inward and faded)"),
          E(1776, "neuroplasticity,", "the prefrontal region under the coil lights (tint fades on 6 f); 'Prefrontal cortex' rises 4 f then a box wipes behind it 4 f ⚠"),
          E(1740, "(hold)", "head layer turns 4 deg on parallax, coil layer 1.5x that; arcs keep pulsing"),
          E(1803, "(exit)", "hard cut to B18 on 'rewire'")],
  image_layers=[{"asset": "flora/head_B_glass_skull.png", "box": [600, 60, 900, 800], "from_f": 1740, "to_f": 1803},
                {"asset": "btl/Applicator_0429_cut.png", "box": [1150, 0, 600, 520], "from_f": 1740, "to_f": 1803}],
  compliance={"moa_label": MOA, "physician_check": ["target region named 'prefrontal cortex' (topic file: DLPFC)"]},
  keyframe={"f": 1795, "crop": FULL}, sfx=[[1740, "card"], [1750, "swish"], [1776, "pop"]])

B(id="B18", section="S4", start_f=1811, end_f=1849, said="rewire the brain,",
  noun="a new connection forming between neurons", devices=["mechanism-on-real-image", "arrow-route-trace"], entry="type-scale-pop",
  immersion="full-bleed", ostad="out", arrow="route-trace", exomind_only="rewire-trace",
  assets=[A("video", "btl/video/Exomind_VIDEO_Mechanism-of-Action_ENNA101.mp4 59.0-60.6 s (neuron reactivating), at 1x; its burned-in subtitle band hidden under our caption band", "moa", credit="Film: BTL Industries")],
  events=[E(1812, "rewire", "hard cut to the MOA neuron shot full frame; a path traces leg by leg along one dendrite to the next neuron, 27 f `sweep` (peak 44 %), head at the end (DDOS f216-250)"),
          E(1826, "brain,", "chip 'Neural connectivity' pops 5 f (brochure wording)"),
          E(1839, "(hold)", "tail erases toward the head 10 f; footage plays"),
          E(1849, "(exit)", "hard cut")],
  compliance={"moa_label": MOA, "physician_check": ["'rewire the brain' / 'enhances neural connectivity' (brochure)"]},
  keyframe={"f": 1838, "crop": FULL}, sfx=[[1812, "swish"], [1826, "pop"]])

B(id="B19", section="S4", start_f=1850, end_f=1986, said="increase proper neurotransmitter production where we can actually be more focused in flow and",
  noun="the pulse train releasing neurotransmitters at a synapse", devices=["topic-glass-panel", "noise-clears"], entry="type-ghost-to-lit",
  immersion="masked card", exomind_only="pulse-train-synapse",
  assets=[A("ui", "frosted panel 720x420, chip 'SYNAPSE': pulse-train strip on top, two terminals and a cleft below, built", "built")],
  events=[E(1851, "increase", "panel scales 0.97->1 (`arrive` 14 f) right of keyed Ostad, under the face-safe line"),
          E(1856, "increase", "pulse train starts: a tick every 12 f slides along the top strip"),
          E(1877, "neurotransmitter", "each tick now releases 6-9 vesicles that cross the cleft in 10 f and dock; chip 'SYNAPSE' pops ⚠"),
          E(1900, "where", "line 'focused, in flow' set dim under the panel"),
          E(1939, "focused", "'focused' lit; a jittery trace along the panel bottom settles to a calm wave over 26 f (`sweep`, DDOS B23 inverse)"),
          E(1961, "flow", "'flow' lit; the wave is steady"),
          E(1851, "(hold)", "panel drifts +-4 px; pulses never stop"),
          E(1979, "(exit)", "panel exits 7 f")],
  compliance={"moa_label": MOA, "physician_check": ["'increase proper neurotransmitter production' (his words; not a brochure claim)", "'focused, in flow' (his words)"]},
  keyframe={"f": 1975, "crop": G}, sfx=[[1851, "card"], [1877, "pop"], [1939, "swish"]])

B(id="B20", section="S4", start_f=1987, end_f=2091, said="help us just feel better and how that can actually translate into better skin. Thank you.",
  noun="feeling better -> the skin (his closing link)", devices=["zoom-box-inset", "arrow-dashed-flow"], entry="type-line-accumulate",
  immersion="camera move", arrow="dashed-flow",
  assets=[A("image", "btl/img/Exomind_PIC_Female-Model5_0251_ENUS100.jpg (model, relaxed portrait)", "btl", credit="Image: BTL Industries")],
  events=[E(1988, "help", "portrait card arrives (`arrive` 14 f) right; line 1 'Feel better' accumulates under it on 'feel' f2012"),
          E(2045, "translate", "a zoom box draws round her cheek (hairline box 10 f), then the inset scales out from the box on a dashed flow arrow that reveals along its path 8 f; head lands last"),
          E(2061, "better", "line 2 'Better skin' accumulates (words lit +-1 f); disclaimer line under it"),
          E(1988, "(hold)", "camera pulls back 1.06->1.00 across the beat (in-out) so the inset has room; inset drifts 4 px"),
          E(2084, "(exit)", "everything exits 7 f into the end card")],
  image_layers=[{"asset": "btl/Female-Model5_0251.jpg", "box": [900, 120, 520, 680], "from_f": 1988, "to_f": 2084}],
  compliance={"disclaimer": DISC, "physician_check": ["'translate into better skin' (his closing line)"]},
  keyframe={"f": 2080, "crop": G}, sfx=[[1988, "card"], [2045, "swish"], [2061, "pop"]])

import re
def lib():
    st = {}
    for line in open("research/ostad/style/DEVICE_LIBRARY.md", encoding="utf-8"):
        m = re.match(r"^\| `([a-z0-9-]+)` \|", line)
        if not m: continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        st[m.group(1)] = re.match(r"\**(yes|partial|never)", cells[-2]).group(1)
    return st
LIB = lib()
for b in beats:
    for d in b["devices"] + [b["entry"]]:
        assert d in LIB, d
    b["built_status"] = {d: LIB[d] for d in b["devices"]}
    b["never_built_devices"] = [d for d in b["devices"] if LIB[d] == "never"]
    b["never_built"] = bool(b["never_built_devices"])
cards = [
    {"kind": "title", "beat": "B01", "start_f": 0, "end_f": 105, "device": "wordmark-depth-sandwich"},
    *[{"kind": "section", "beat": b["id"], "num": b["section_card"]["num"], "title": b["section_card"]["title"], "start_f": b["section_card"]["start_f"],
       "end_f": b["section_card"]["end_f"], "device": "chapter-title-card", "entry": "type-typewriter", "exit": "type-letter-stagger-out"}
      for b in beats if "section_card" in b],
    {"kind": "end", "start_f": 2092, "end_f": 2166, "device": "end-card", "text": ["Book a consultation.", "Dr. Ariel Ostad", "Link in the description."]},
]
sections = [{"id": "S0", "title": "Opening", "start_f": 0}, {"id": "S1", "title": "Your questions", "start_f": 263},
            {"id": "S2", "title": "Before you go", "start_f": 893}, {"id": "S3", "title": "Total skin health", "start_f": 1242},
            {"id": "S4", "title": "The technology", "start_f": 1710}]
out = {
    "edit": "Ostad - Exomind and total skin health (YouTube v6)", "fps": FPS, "width": 1920, "height": 1080, "speed": 1.15,
    "duration_f": 2166, "time_base": "composition frames at 24 fps on the 1.15x edit; comp s = cut s / 1.15; reveals at word onset + 1 f",
    "transcript": "brand/edits/exomind-skin/transcript.json", "device_library": "research/ostad/style/DEVICE_LIBRARY.md",
    "presentation": {"ostad": "keyed on the cream room canvas, left third, 670 px wide, same place and size in every beat; steps out only for full-bleed (B04 in-footage, B12 pip, B17-B18 out)",
                     "keyed_source": "matte_fgr_cut.mp4 + matte_pha_cut.mp4 for the whole cut (v4.1's presenter_k.webm starts at cut 42.4 s only)"},
    "sections": sections, "cards": cards, "beats": beats,
}
json.dump(out, open(sys.argv[1], "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(len(beats), "beats")
