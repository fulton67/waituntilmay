"""Jan 08 filler-fatigue reel: write research/ostad/style/jan08/beats.json (variety_check schema) and BEATS.md from the cut's cue frames
(brand/remotion/public/jan08/props.json). Frame numbers follow Reel.tsx's picture plan; the asset column names every photo or clip and
where it came from, or where we searched when nothing was found.
  python -I brand/scripts/jan08_beats.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "research/ostad/style/jan08"
P = json.loads((ROOT / "brand/remotion/public/jan08/props.json").read_text())
c = P["cues"]
SEC = 80
S1, S2, S3, S4 = 78, c["start:aging"], c["start:method"], c["great"] + 9
END = P["durationInFrames"]
LIB = "clinic-library catalog.sqlite (read-only), pulled with scripts/pull_direct.py --out=tmp/jan08/pull"
SEARCH_BAD = "searched: catalog filler + cheek + before-after / result rows for an overfilled or migrated example (needs_review = 0): none of his own patients shows one, and his patients are never shown as a bad result; bank/filler-volume-loss, bank/ozempic-face: no overfill example. Drawn from the traced model instead."

B = [
    dict(id="B01", section="S0", start_f=0, end_f=S1 - 1, said="I don't really believe in filler fatigue,", noun="the claim: 'Filler fatigue', struck through on 'fatigue'",
         devices=["type-strike-replace"], entry="type-word-fade-rise", immersion="full-bleed", ostad="in-footage", layout="FB",
         assets=[{"kind": "video", "src": "IMG_2421.MOV 163.31-165.21 s (catalog id 163)"}], better="hook in 0.08 s on his strongest line (oct14 v2: a lower third first)"),
    dict(id="B02", section="S1", start_f=S1, end_f=c["start:cause"] - 1, said="where patients feel that a lot of filler can ... skin stretch, ... overfilled, or the fillers can migrate.",
         noun="the belief, drawn: gel in the fat layer bulges the skin (stretch), sits as a lump (overfilled), beads drift away (migrates)",
         devices=["topic-glass-panel"], entry="type-typewriter", immersion="split", ostad="keyed-left", layout="LC", illustration=True, topic_only="SkinBelief",
         compliance={"illustration_label": True}, ostad_check="pending",
         assets=[{"kind": "drawing", "src": "skin_crosssection.glb section view, traced (anatomy_measure.json: all_pass)"}, {"kind": "video", "src": "RVM key of IMG_2421 16.15-28.23 s (video_matte.py --refine)"}],
         search=SEARCH_BAD, better="the belief has a picture, not a word (oct14 v2 'Deflation' label)"),
    dict(id="B03", section="S1", start_f=c["start:cause"], end_f=S2 - 1, said="I find either happens from improper injections, from people who are not trained..., from doing too much filling.",
         noun="the three causes, each lit on his word", devices=["checklist-ledger"], entry="type-line-accumulate", immersion="full-bleed", ostad="in-footage", layout="FB", text_only=True,
         assets=[{"kind": "video", "src": "IMG_2421.MOV 46.05-54.14 s"}],
         search="searched: catalog for footage of an improper / untrained injection (none, and none would be shown); the one text beat of the reel"),
    dict(id="B04", section="S2", start_f=S2, end_f=c["aging2"] - 1, said="the underlying physiology of aging is that we lose volume ... fatty tissue ... the support structure for our facial skin.",
         noun="aging in profile: the cheek and jowl fat shrink on 'volume', the fat lights on 'fatty', the bone lights on 'support', the lower face drops (dashed: where it was)",
         devices=["anatomy-trace-card", "region-light-on-model"], entry="type-typewriter", immersion="split", ostad="keyed-left", layout="LC", illustration=True, topic_only="VolumeLoss",
         compliance={"illustration_label": True}, ostad_check="pending",
         assets=[{"kind": "drawing", "src": "face.glb profile view (Z-Anatomy bone; fat compartments are the model's approximation), traced"}, {"kind": "video", "src": "RVM key of IMG_2421 64.44-77.24 s"}],
         better="every structure traced from the model and measured (outline mean <= 0.13 px), not drawn from memory"),
    dict(id="B05", section="S2", start_f=c["aging2"], end_f=S3 - 1, said="That happens from aging. And when you lose that support structure, the skin sags.",
         noun="a real example of volume loss: a mid-cheek / under-eye hollow (journal photo, panel A only)", devices=["std-clip-card"], entry="type-scale-pop", immersion="full-bleed", ostad="in-footage", layout="CO",
         assets=[{"kind": "image", "src": "research/ostad/style/bank/filler-volume-loss/pmc_PMC12828540_fig_7.jpg panel A; Hong GW et al., JPRAS Open 2026, CC BY 4.0; bank use = on-air"}],
         image_layers=[{"asset": "bank_midcheek.jpg", "subject": "bank-midcheek", "box": [108, 1020, 420, 315], "from_f": c["aging2"], "to_f": S3 - 8}],
         search="GLOSSARY 'Deflation' -> bank example; catalog filler before photos are his patients' befores (kept for B11/B13)"),
    dict(id="B06", section="S3", start_f=S3, end_f=c["micro"] - 1, said="And I have my own sort of methodology that I find really gives us incredible results",
         noun="his own cheekbone cannula session (two moments), his name", devices=["name-super"], entry="type-typewriter", immersion="full-bleed", ostad="out", layout="FB",
         assets=[{"kind": "video", "src": f"IMG_3453.MOV (catalog id 6990, 2022-08-31, cannula into the cheekbone from a lateral entry) 14 s and 27 s; {LIB}"}]),
    dict(id="B07", section="S3", start_f=c["micro"], end_f=c["start:cheekbones"] + 9, said="utilizing micro-cannulas. And really, it's",
         noun="the microcannula on the cheekbone (his own clip) in the STANDARD ClipCard", devices=["std-clip-card"], entry="type-rise", immersion="full-bleed", ostad="in-footage", layout="CO", ostad_check="pending (depth line 'On the cheekbone')",
         assets=[{"kind": "video", "src": f"IMG_3470.MOV (catalog id 6973, 2022-08-31, lateral cheekbone HA by cannula, no label readable) from 13 s; {LIB}"}]),
    dict(id="B08", section="S3", start_f=c["start:cheekbones"] + 10, end_f=c["falls"] - 1, said="injecting fillers on the cheekbones and that causes a lot of lifting because the ligaments ... diminish over time",
         noun="his method: one entry, the cannula route along the traced cheekbone, gel on the bone, the cheek lifts; without support it falls (dashed)",
         devices=["anatomy-trace-card", "arrow-route-trace", "arrow-straight-pointer"], entry="type-word-fade-rise", immersion="full-bleed", ostad="out", layout="CO", illustration=True,
         topic_only="CheekPlacement", compliance={"illustration_label": True}, ostad_check="pending (deposit points and route are illustrative; ligaments are not in the model and are not drawn)",
         assets=[{"kind": "drawing", "src": "face.glb midface view (-30 deg), traced"}]),
    dict(id="B09", section="S3", start_f=c["falls"], end_f=S4 - 1, said="the skin falls. I find fillers work really great.", noun="his hands at the cheekbone, full frame",
         devices=[], entry="type-caption-word", immersion="full-bleed", ostad="out", layout="FB",
         assets=[{"kind": "video", "src": "IMG_3470.MOV from 18 s (catalog id 6973)"}]),
    dict(id="B10", section="S4", start_f=S4, end_f=c["start:approach"] - 1, said="I don't see them migrate unless you're really using the wrong filler. It may migrate in a lip that too much is injected.",
         noun="migration: gel on the cheekbone stays; too much in the lip spreads past its border", devices=["topic-glass-panel"], entry="type-typewriter", immersion="full-bleed", ostad="out", layout="CO",
         illustration=True, topic_only="LipMigration", compliance={"illustration_label": True}, ostad_check="pending",
         assets=[{"kind": "drawing", "src": "face.glb midface view: zygoma + orbicularis oris, traced"}], search=SEARCH_BAD),
    dict(id="B11", section="S4", start_f=c["start:approach"], end_f=c["golf"] - 13, said="I have my approach of basically injecting the cheekbones, maybe minimal amounts in the laugh line, marionette lines, a little bit on the lower lids",
         noun="his plan on a real face: white pen on her landmarks (cheekbones heavy; laugh lines, marionette lines, lower lids thin), each on its word",
         devices=["arrow-hand-drawn", "std-skin-window"], entry="type-scale-pop", immersion="full-bleed", ostad="out", layout="FB",
         compliance={"results_vary": True}, ostad_check="pending (placement lines)",
         assets=[{"kind": "image", "src": f"IMG_2316.HEIC (catalog id 7681, P0007, 2022-07-08 standardised frontal, before the session; consent yes); MediaPipe landmarks (jan08_ba.py); {LIB}"}],
         image_layers=[{"asset": "front_before.jpg", "subject": "P0007-frontal", "box": [80, 250, 920, 1200], "from_f": c["start:approach"], "to_f": c["golf"] - 16}]),
    dict(id="B12", section="S4", start_f=c["golf"] - 12, end_f=c["awkward"] + 10, said="but I am not really a fan of creating golf size, you know, filling in the mid-cheek, that looks awkward.",
         noun="the contrast: a golf-size lump grows in the mid cheek of the traced profile and is crossed out", devices=["type-strike-replace", "region-light-on-model"], entry="type-word-fade-rise",
         immersion="full-bleed", ostad="out", layout="CO", illustration=True, topic_only="PillowVsLift", compliance={"illustration_label": True}, ostad_check="pending",
         assets=[{"kind": "drawing", "src": "face.glb profile view, traced"}], search=SEARCH_BAD),
    dict(id="B13", section="S4", start_f=c["awkward"] + 11, end_f=END - 1, said="So I just want to address this issue of filler fatigue. I really think fillers are here to stay.",
         noun="the result: her before -> after (registered on stable landmarks), the white ring on her cheekbone", devices=["std-skin-window"], entry="type-rolling-swap",
         immersion="masked card", ostad="in-footage", layout="CO", result_claim=True, compliance={"results_vary": True},
         assets=[{"kind": "image", "src": f"IMG_2316.HEIC / IMG_2335.HEIC (catalog ids 7681 / 7662, P0007, 2022-07-08 before and right after; registered, jan08_ba.py); {LIB}"}],
         image_layers=[{"asset": "front_before/after_aligned.jpg", "subject": "P0007-frontal", "box": [130, 820, 820, 640], "from_f": c["awkward"] + 11, "to_f": END - 4}],
         search="searched for a weeks-apart filler B/A without on-image text or brand names (catalog filler before-after, needs_review = 0): the P0011 / P0013 triptychs carry slide text and product names; P0007 is clean and standardised"),
]
for b in B:
    b.setdefault("text_only", False)
    b["start_s"], b["end_s"] = round(b["start_f"] / 24, 2), round(b["end_f"] / 24, 2)

sheet = {"edit": "Ostad - Filler fatigue (reel v1)", "fps": 24, "width": 1080, "height": 1920, "duration_f": END + P["tail"], "time_base": "composition frames at 24 fps; reveals at word onset + 1 f",
         "device_library": "research/ostad/style/DEVICE_LIBRARY.md", "cut": "research/ostad/style/jan08/cut.json", "compliance_profile": "injectable", "consent": "yes", "not_for_posting": False,
         "status": "consent = yes (clinic-library rule 4, 2026-11-17); patients by code only; no injectable brand on screen (he names none in the cut)",
         "presentation": {"ostad": "his own talking-head footage; keyed in front on the left (RVM) over the two topic drawings B02, B04"},
         "sections": [{"id": "S0", "title": "Opening", "start_f": 0}, {"id": "S1", "title": "The belief", "start_f": S1}, {"id": "S2", "title": "What aging does", "start_f": S2},
                      {"id": "S3", "title": "On the cheekbones", "start_f": S3}, {"id": "S4", "title": "Migration", "start_f": S4}],
         "cards": [{"kind": "title", "device": "chapter-title-card", "start_f": 0}] + [{"kind": "section", "device": "chapter-title-card", "start_f": s, "title": t} for s, t in
                   ((S1, "The belief"), (S2, "What aging does"), (S3, "On the cheekbones"), (S4, "Migration"))] + [{"kind": "end", "device": "end-card", "start_f": END, "end_f": END + P["tail"] - 1, "layout": "CO"}],
         "sfx_map": {"chapter": "exo_chapter", "card": "exo_card", "draw": "exo_draw", "reveal": "swish", "chip": "pop"},
         "beats": B}
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "beats.json").write_text(json.dumps(sheet, indent=1), encoding="utf-8")

md = ["# Jan 08 filler fatigue: beat sheet (reel v1)", "",
      "Source: `IMG_2421.MOV` (catalog id 163, filmed 2026-01-08 1:26 PM). Argument map: `ARGUMENT.md`. Cut: `cut.json` (edge gaps: `cut_gaps.json`). Code: `brand/remotion/src/jan08/`.", "",
      "## The 3 weakest things about the previous reels (CRITIQUE_v2) and the fix here", "",
      "1. **Hairline rings on random spots.** The only rings and pen lines here sit on MediaPipe landmarks of a real patient photo (B11, B13). Diagrams carry no rings.",
      "2. **No topic-only animation.** There are three, built first: SkinBelief, VolumeLoss and CheekPlacement, plus two contrast states, LipMigration and PillowVsLift. All are traced from the 3D models.",
      "3. **Dead stretches and text by default.** The picture changes at least every 4 s (see `pacing.json`), and there is one text beat (B03) out of 13.", "",
      "## Beats", "", "| Beat | Time | He says | What's shown | Devices | Asset and source (or search log) | Ostad check |", "|---|---|---|---|---|---|---|"]
for b in B:
    src = "; ".join(a["src"] for a in b["assets"]) + (f" · {b['search']}" if b.get("search") else "")
    md.append(f"| {b['id']} | {b['start_s']:.1f}–{b['end_s']:.1f} s | {b['said']} | {b['noun']} | {', '.join(b['devices'])} | {src} | {b.get('ostad_check', '')} |")
md += ["", "## Topic-only animations", "", "- **SkinBelief** (B02): the belief, drawn. Gel in the traced fat layer of `skin_crosssection.glb` bulges the dermis and epidermis on \"stretch\", sits as a lump on \"overfilled\", and beads drift away on \"migrate\". The labels end in \"?\".",
       "- **VolumeLoss** (B04): the `face.glb` profile. Cheek and jowl fat shrink to 70 % on \"volume\". The fat lights on \"fatty\", and the bone lights on \"support\". The lower skin outline drops 22 render px, with the original left dashed.",
       "- **CheekPlacement** (B08): the `face.glb` midface. One lateral entry, then a route-trace along the traced zygoma and three gel deposits on it. The cheek lifts on \"lifting\" (three straight pointers), and a dashed fallen outline shows on \"diminish\".",
       "- Contrast states: **LipMigration** (B10: on the cheekbone it stays; too much in the lip spreads past the traced orbicularis oris) and **PillowVsLift** (B12: a golf-size lump in the mid cheek, crossed out).",
       "", "Anatomy outline difference (drawn path vs the model render, 1024 px): see `anatomy_measure.json`. Bone mean 0.04–0.06 px, max 1.0 px. Fat (the model's approximation) max 1.4 px. Skin profile max 3.0 px. All pass. Every clinical drawing is `ostad_check: pending`.",
       "", "## Before/after", "", "P0007, 2022-07-08, standardised frontal before and right-after photos (catalog 7681/7662), registered on stable landmarks (median residual 9.3 px at 3024 px).",
       "Measured (`ba_measure.json`): the landmark widths all shift by the same −2.6 to −3.0 %, which is pose or scale, not volume, and the submalar shadow changes are within lighting noise. **No change is measurable on these photos**, so the window shows the pair with the STANDARD white ring on the cheekbone landmark and no change arrow or number (LESSONS L4)."]
V = OUT / "verify.json"
if V.exists():
    v = json.loads(V.read_text())
    pc, ch = v["pacing"], v["pacing"]["changes_f"]
    over = [(round(a / 24, 1), round(b / 24, 1)) for a, b in zip(ch, ch[1:]) if (b - a) / 24 > 4]
    md += ["", "## Checks on the render (`verify.json`)", "",
           f"- Pacing, measured on pixels (a change = mean grey difference >= 6 over 6 f): longest stretch {pc['longest_s']} s. Stretches over 4 s: {over}. Both have designed changes the metric reads as too small: a line draw at 9.3 s (\"stretch\") and the causes rows lighting at 18.8 s and 21.4 s. They are logged as exceptions.",
           f"- First third vs last third: {pc['first_third']['per_10s']} vs {pc['last_third']['per_10s']} changes per 10 s; median interval {pc['first_third']['median_interval_s']} vs {pc['last_third']['median_interval_s']} s. The last third is tighter.",
           "- Hook: his line starts at 0.08 s, full frame, with the title on screen from frame 2.",
           f"- Flash scan (scdet 8): {len(v['cuts_scdet8'])} cuts at {v['cuts_scdet8']}. Each one is a planned cut: a section card, a takeover, a plate or a window.",
           f"- Keyed edges: belief {v['edges']['belief']['edge_frames']} and aging {v['edges']['aging']['edge_frames']} straight-edge frames (140 px feather).",
           f"- Loudness: {v['loudness']['integrated_lufs']} LUFS, true peak {v['loudness']['true_peak_dbtp']} dBTP.",
           f"- Arrows over text: {v['arrow_text']['out'].splitlines()[-1]}.",
           f"- Audio cuts: minimum gap {v['audio_cuts']['min_gap_s']} s, 15 ms crossfade. One exception: the belief start sits in a 100 ms breath pause measured at floor + 9 dB.",
           f"- Fillers or stutters in the final audio (local re-transcription): {len(v['fillers']['all'])}, and {len(v['fillers']['first_10s'])} in the first 10 s. \"You know\" at 77 s is kept, inside his \"golf size, you know, filling\" line."]
(OUT / "BEATS.md").write_text("\n".join(md) + "\n", encoding="utf-8")
print("beats", len(B), "duration_f", sheet["duration_f"])
