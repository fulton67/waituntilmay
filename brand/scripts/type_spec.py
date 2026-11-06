"""FIX Phase 3: the type spec, computed. Every number cites a row of metrics/pixels.json (or fonts/specimen/calib) or is
marked as a judgment call. -> fonts/specimen/spec.json (read by specimen_render.cjs and written up in fonts/SYSTEM.md)."""
import json, pathlib, statistics as st, sys
sys.stdout.reconfigure(encoding="utf-8")
B = pathlib.Path(__file__).resolve().parents[1]; F = B / "fonts"; C = F / "specimen" / "calib"
px = json.load(open(B / "metrics" / "pixels.json", encoding="utf-8"))
R = px["regions"]; IMG = px["images"]
cal = {f["id"]: f for f in json.load(open(C / "fonts.json", encoding="utf-8"))["fonts"]}
trk = json.load(open(C / "tracking.json", encoding="utf-8"))["fonts"]
system = json.load(open(F / "system.json", encoding="utf-8"))
med = lambda role, k, src=None: st.median([r[k] for r in R if r["role"] == role and r.get(k) is not None and (src is None or r["source"] == src)])
cite = lambda role, k, src=None: f"pixels.json regions role={role}{' source=' + src if src else ''} median {k}"

ROLE_FONT = {"headline": "nhg-display-600", "caption": "nhg-display-500", "label": "nhg-display-500"}
CANVAS = {"1080x1350": (1080, 1350), "1080x1080": (1080, 1080), "1080x1920": (1080, 1920)}
spec = {"kit": "vzz0hgt", "kit_css": "https://use.typekit.net/vzz0hgt.css", "roles": {}, "canvases": {}, "layout": {}, "web": {}, "notes": []}
for role, fid in ROLE_FONT.items():
    cap_pct, lead_em_est = med(role, "cap_pct_h"), med(role, "leading_em")
    cap_em = cal[fid]["cap_em"]
    spec["roles"][role] = {
        "font_id": fid, "family": cal[fid]["family"], "weight": cal[fid]["weight"],
        "adobe_style": {"nhg-display-600": "Neue Haas Grotesk Display Pro 65 Medium", "nhg-display-500": "Neue Haas Grotesk Display Pro 55 Roman"}[fid],
        "cap_pct_h": cap_pct, "cap_pct_h_cite": cite(role, "cap_pct_h"),
        "line_height": round(lead_em_est * cap_em / 0.7, 3), "line_height_cite": cite(role, "leading_em") + f" ({lead_em_est}) x cap_em {cap_em} / 0.7",
        "letter_spacing_em": trk[fid]["letter_spacing_em"][role], "letter_spacing_cite": f"calib/tracking.json {fid} {role} (target {cite(role, 'tracking_pct_em')})",
        "block_w_pct": med(role, "block_w_pct", "instagram"), "block_w_cite": cite(role, "block_w_pct", "instagram"),
        "uppercase": role == "label", "uppercase_cite": "judgment call: labels set in caps to separate them from captions of near-equal size"}
for name, (w, h) in CANVAS.items():
    # the metric is cap height as % of canvas height; a 9:16 story is shown at the same width as a 4:5 post, so it keeps the 4:5 sizes
    href = 1350 if name == "1080x1920" else h
    spec["canvases"][name] = {"w": w, "h": h, "sizes": {role: {"font_size_px": round(r["cap_pct_h"] / 100 * href / cal[r["font_id"]]["cap_em"], 1),
                                                              "line_height_px": round(r["cap_pct_h"] / 100 * href / cal[r["font_id"]]["cap_em"] * r["line_height"], 1)}
                                                       for role, r in spec["roles"].items()},
                              "size_basis": "cap % of canvas height (pixels.json)" if href == h else "judgment call: 4:5 sizes reused, a story is read at the same width"}
ig = [i for i in IMG if i.get("source") == "instagram"] if isinstance(IMG, list) else [v for v in IMG.values() if v.get("source") == "instagram"]
def img_med(k):
    v = [i[k] for i in ig if i.get(k) is not None]
    return st.median(v) if v else None
spec["layout"] = {"margin_pct_w": img_med("text_margin_left_pct"), "margin_cite": "pixels.json images source=instagram median text_margin_left_pct",
                  "headline_top_pct_h": st.median([i["text_margin_top_pct"] for i in IMG.values() if i["source"] == "board" and i.get("text_margin_top_pct") is not None]), "headline_top_cite": "pixels.json images source=board median text_margin_top_pct",
                  "align": "left", "align_cite": "PIXELS.md stack alignment: board left 53 / centre 10 / right 8; instagram left 42 / centre 21 / right 13"}
body = 17
spec["web"] = {"body": {"family": "neue-haas-grotesk-text", "weight": 400, "size_px": body, "line_height": 1.5,
                        "cite": "judgment call: 17px web body in NHG Text (optical size for small text); line-height 1.5 for long reading"},
               "h1": {"family": "neue-haas-grotesk-display", "weight": 600,
                      "size_px": round(body * (med("headline", "cap_pct_h") / med("caption", "cap_pct_h")) * cal["nhg-text-400"]["cap_em"] / cal["nhg-display-600"]["cap_em"]),
                      "cite": "headline/caption cap ratio from pixels.json applied to the 17px body, cap-height matched across Text and Display"},
               "label": {"family": "neue-haas-grotesk-display", "weight": 500, "size_px": 13, "uppercase": True, "letter_spacing_em": spec["roles"]["label"]["letter_spacing_em"],
                         "cite": "judgment call size; tracking from calib/tracking.json label"}}
spec["web"]["h2"] = {"family": "neue-haas-grotesk-display", "weight": 600, "size_px": round((spec["web"]["h1"]["size_px"] * body) ** 0.5 * 1.15),
                     "cite": "judgment call: between h1 and body"}
spec["system"] = {"display": system["chosen"]["display"], "text": system["chosen"]["text"], "mono": system["chosen"]["mono"],
                  "losing": system["losing_display"]}
json.dump(spec, open(F / "specimen" / "spec.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
for n, c in spec["canvases"].items(): print(n, {r: s["font_size_px"] for r, s in c["sizes"].items()})
print({r: (v["line_height"], v["letter_spacing_em"], v["block_w_pct"]) for r, v in spec["roles"].items()}, spec["layout"]["margin_pct_w"], spec["web"])
