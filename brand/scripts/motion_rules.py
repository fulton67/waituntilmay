"""BUILDER Phase F: motion rules for the video kit -> brand/motion/rules.json + brand/motion/RULES.md.
Direction comes from the board's only video (Media/Link block 43001699), measured by scripts/motion.py analyse(). It is one 9.75 s
handheld take: 0 cuts, 0% of samples with text on screen, no loop. Current practice is Dr. Ostad's own clips (motion/motion.json,
when the Phase 4 run has written it); their numbers are reported beside the rules as the contrast, not copied.
The measured rules are Phase 4's (motion/RULES_PHASE4.md, from board_flow.json / board_detail.json / summary.json): a locked frame,
one take, a drift -> zoom in -> hold -> zoom out shape with ease-in-out moves, 24 fps, captions cut on in the feed's band. This script
turns them into tokens. The board has no text, so text entrance/exit timings stay judgment calls (DECISIONS 57). brand-venv python -I."""
import json, pathlib, statistics as st
B = pathlib.Path(__file__).resolve().parents[1]; M = B / "motion"
board_f = M / "board_43001699.json"; mot_f = M / "motion.json"
flow = json.load(open(M / "board_flow.json", encoding="utf-8")); summ = json.load(open(M / "summary.json", encoding="utf-8"))["instagram"]
board = json.load(open(board_f, encoding="utf-8"))
ig = []
if mot_f.exists():
    ig = [v for v in json.load(open(mot_f, encoding="utf-8"))["videos"] if v["role"] == "instagram"]
FPS = int(board["fps"])  # 24, rule 8
J = "judgment (the board reel has no text or cuts to time against; DECISIONS 57)"
zi = flow["zoom_in_spans_s"][0]; zo = flow["zoom_out_spans_s"][0]
R = {
    "source": {"board": {k: board[k] for k in ("id", "duration_s", "fps", "cuts", "median_shot_s", "camera_counts", "text_on_screen_share", "loops")},
               "instagram": ({"clips": len(ig), "median_shot_s": round(st.median([v["median_shot_s"] for v in ig]), 2), "median_cuts_per_10s": round(st.median([v["cuts_per_10s"] for v in ig]), 2),
                              "median_text_on_screen_share": round(st.median([v["text_on_screen_share"] for v in ig]), 2),
                              "median_reveal_s": round(st.median([e["reveal_s"] for v in ig for e in v["text_events"]] or [0]), 2),
                              "text_arrivals": {a: sum(e["arrives"] == a for v in ig for e in v["text_events"]) for a in ("with a cut", "animated in place", "cuts on in place")}}
                             if ig else "motion/motion.json not written yet")},
    "rules": [  # motion/RULES_PHASE4.md, rule for rule
        {"rule": "One take per story; no cuts under 10 s. In longer reels a shot runs at least 4.5 s.", "number": f"board {board['cuts']} cuts in {board['duration_s']} s; floor = feed p75 shot {summ['shot_s_iqr'][1]} s", "cite": "motion.json board cuts; summary.json instagram shot_s_iqr"},
        {"rule": "Lock the camera; motion comes from the subject. No digital zoom on filmed footage.", "number": "board border drift median 0.127 px/frame", "cite": "board_detail.json global_drift_px_median"},
        {"rule": "Graphic and product layers may move as the board does: drift, zoom in, hold, zoom out.", "number": f"zoom in {zi[0]}-{zi[1]} s to {flow['cum_scale_max']}x, out {zo[0]}-{zo[1]} s, ends at {flow['cum_scale_end']}x", "cite": "board_flow.json zoom_in_spans_s, zoom_out_spans_s, cum_scale_max, cum_scale_end"},
        {"rule": "Every move eases in and out; the way out is slower than the way in.", "number": f"out takes {round((zo[1]-zo[0])/(zi[1]-zi[0]), 1)}x as long as in", "cite": "board_flow.json zoom_easing"},
        {"rule": "Keep the tempo slow outside the zoom.", "number": f"median {flow['speed_px_per_frame_median']} px/frame at 270 px wide (1.1% of width)", "cite": "board_flow.json speed_px_per_frame_median"},
        {"rule": "End on the opening framing without faking a seamless loop.", "number": f"end scale {flow['cum_scale_end']}x of frame 1", "cite": "board_flow.json cum_scale_end"},
        {"rule": "Text only where speech needs captions: one line at a time in the feed's caption band, cut on in place. Text reveals belong to title and end cards, not to footage.", "number": f"band {round(summ['text_box_top_median']*100,1)}-{round(summ['text_box_bottom_median']*100,1)}% of height; {summ['text_arrivals']['cuts on in place']} of {sum(summ['text_arrivals'].values())} feed text events cut on", "cite": "motion.json board text_on_screen_share; summary.json instagram text_box_*_median, text_arrivals"},
        {"rule": "Make it at 24 fps, 1080 x 1920.", "number": f"board {board['fps']} fps", "cite": "motion.json board fps"},
        {"rule": "Footage takes the kit treatment; graphics use the still kit unchanged.", "number": "kit/treatment.cube + grain 0.06; kit/tokens.json", "cite": "kit/treatment.json, kit/look.json"},
    ],
    "fps": FPS,
    "caption_band": {"top": summ["text_box_top_median"], "bottom": summ["text_box_bottom_median"], "arrives": "cut", "cite": "summary.json instagram text_box_top_median, text_box_bottom_median, text_arrivals"},
    "duration": {
        "enter": {"ms": 600, "d": "text and graphic entrances", "cite": J},
        "enter-slow": {"ms": 900, "d": "title-card headline", "cite": J},
        "exit": {"ms": 300, "d": "every exit", "cite": J},
        "stagger": {"ms": 90, "d": "between lines or words in a staggered reveal", "cite": J},
        "hold-min": {"ms": 2500, "d": "shortest time any text stays fully on", "cite": J},
        "dissolve": {"ms": round(12 / FPS * 1000), "d": f"the only transition besides a cut (12 frames at {FPS} fps)", "cite": J},
        "shot-min": {"ms": round(summ["shot_s_iqr"][1] * 1000, -2), "d": "shortest shot in a longer reel (feed p75)", "cite": "summary.json instagram shot_s_iqr"},
        "zoom-in": {"ms": round((zi[1] - zi[0]) * 1000), "d": "graphic zoom in", "cite": "board_flow.json zoom_in_spans_s"},
        "zoom-hold": {"ms": round((zo[0] - zi[1]) * 1000), "d": "hold between zooms", "cite": "board_flow.json"},
        "zoom-out": {"ms": round((zo[1] - zo[0]) * 1000), "d": "graphic zoom out", "cite": "board_flow.json zoom_out_spans_s"},
    },
    "easing": {
        "out": {"bezier": [0.22, 0.61, 0.36, 1.0], "d": "entrances (ease-out cubic)", "cite": J},
        "in": {"bezier": [0.55, 0.06, 0.68, 0.19], "d": "exits", "cite": J},
        "in-out": {"bezier": [0.65, 0.0, 0.35, 1.0], "d": "zoom in, dissolves and moves (peak at 0.57 of the span)", "cite": "board_flow.json zoom_easing; curve fitted by eye (judgment, RULES_PHASE4 rule 4)"},
        "zoom-out": {"bezier": [0.33, 0.0, 0.2, 1.0], "d": "zoom out (peak at 0.42, 61% of change in the first half)", "cite": "board_flow.json zoom_easing; curve fitted by eye (judgment, RULES_PHASE4 rule 4)"},
    },
    "distance": {"rise": {"cqw": 1.2, "d": "vertical travel of a fade-rise (1.2% of width, 13 px at 1080)", "cite": J},
                 "blur-in": {"cqw": 0.8, "d": "starting blur of a blur-in reveal", "cite": J}},
}
json.dump(R, open(M / "rules.json", "w", encoding="utf-8"), indent=1)
md = ["# Motion rules", "", "Generated by `scripts/motion_rules.py` from the Phase 4 measurements; the full measured table with contrasts is `RULES_PHASE4.md`. The direction is the board's only video (block 43001699); Dr. Ostad's clips are the contrast.", "",
      f"Board reel: {board['duration_s']} s at {board['fps']} fps, {board['cuts']} cuts, a locked frame whose graphic content zooms (board_detail.json; the flow classifier's 'handheld' label is overruled, DECISIONS 55), text on screen in {int(board['text_on_screen_share'] * 100)}% of samples.", ""]
if ig: s = R["source"]["instagram"]; md += [f"Instagram ({s['clips']} clips): median shot {s['median_shot_s']} s, {s['median_cuts_per_10s']} cuts per 10 s, text on screen {int(s['median_text_on_screen_share'] * 100)}% of samples, median text reveal {s['median_reveal_s']} s.", ""]
md += ["| rule | number | source |", "|---|---|---|"] + [f"| {r['rule']} | {r['number']} | {r['cite']} |" for r in R["rules"]]
md += ["", "| token | value | use |", "|---|---|---|"] + [f"| duration.{k} | {v['ms']} ms | {v['d']} |" for k, v in R["duration"].items()] + [f"| easing.{k} | cubic-bezier({', '.join(map(str, v['bezier']))}) | {v['d']} |" for k, v in R["easing"].items()]
(M / "RULES.md").write_text("\n".join(md) + "\n", encoding="utf-8")
print(json.dumps(R["source"], indent=1))
