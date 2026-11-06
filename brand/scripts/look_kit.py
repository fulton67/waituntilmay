"""BUILDER Phase A: turn the measured devices into the kit.
-> kit/look.json (every parameter with its source), kit/palette.json, kit/tokens.css (custom properties),
   kit/components/*.css (one file per kept device), kit/kit.css (imports), kit/treatment.cube (33^3), kit/treatment.json (CSS filter fit).
Units: components live inside a post root `.ok` (container-type: size), so 1cqw = 1% of the canvas width and 1cqh = 1% of its height.
Where the board gives 2+ exemplars the parameter is their median, expressed in % of the exemplar's canvas width.
Run with brand-venv python -I."""
import json, pathlib, sys, glob, statistics as st
import numpy as np, cv2
sys.stdout.reconfigure(encoding="utf-8")
B = pathlib.Path(__file__).resolve().parents[1]; K = B / "kit"; C = K / "components"; C.mkdir(parents=True, exist_ok=True)
ms = json.load(open(B / "look" / "measure.json", encoding="utf-8"))["devices"]
cat = json.load(open(B / "look" / "catalog.json", encoding="utf-8"))
pal = json.load(open(B / "colour" / "palette.json", encoding="utf-8")); tr = json.load(open(B / "colour" / "treatment.json", encoding="utf-8"))
spec = json.load(open(B / "fonts" / "specimen" / "spec.json", encoding="utf-8")); grid = json.load(open(B / "composition" / "grid.json", encoding="utf-8"))
shp = json.load(open(B / "shapes" / "catalogue.json", encoding="utf-8"))["proportions_median_n"]
CANVAS = {41911984: 1700, 41432513: 1700, 2145281: 1280, 30940781: 564, 12400773: 1080, 34175362: 1080, 14664481: 2400, 13607089: 750, 27454113: 1440, 11460382: 1080, 27647159: 1080}
r2 = lambda v: round(float(v), 2); r3 = lambda v: round(float(v), 3); med = lambda xs: float(st.median(xs))
P = {k: v["hex"] for k, v in pal["palette"].items()}

g = ms["glass_panel"]["exemplars"]; band = ms["glass_band"]["exemplars"][0]; pc = ms["photo_card"]["exemplars"]
pills = ms["pill_chip"]["exemplars"]; ll = ms["leader_line"]; ob = ms["outline_box"]["exemplars"][0]
sm = ms["step_marks"]["exemplars"][0]; sf = ms["screen_frame"]["exemplars"]; mf = ms["meta_footer"]["exemplars"][0]; rb = ms["ring_button"]["exemplars"][0]
pill_text_ok = [p for p in pills if p.get("text_h_pct_pill_h", 100) < 60]  # >= 60% = detection merged text with the pill edge (crops checked)
lab_ = spec["roles"]["label"]; cap_em = 0.7188

look = {"units": "cqw = % of canvas width, cqh = % of canvas height, em = of the element's font size", "devices": {}}
D = look["devices"]
D["glass_panel"] = {
    "radius_cqw": r2(med([e["radius_px"] / CANVAS[e["block"]] * 100 for e in g])),
    "blur_cqw": r2(med([e["backdrop_blur_sigma_px"] / CANVAS[e["block"]] * 100 for e in g])),
    "tint_alpha": r3(med([e["tint_alpha"] for e in g])), "tint_role": "surface",
    "rim": None, "shadow": None,
    "cite": "look/measure.json glass_panel 41911984 + 41432513 (medians); blur = sigma of the Gaussian whose blurred backdrop best predicts the inside (max R^2); rim dL "
            + ", ".join(str(e["rim_dL"]) for e in g) + " and edge shadow dL " + ", ".join(str(e["edge_shadow_dL"]) for e in g) + " are under 1.5 L*, so neither is built",
    "judgment": "tint hue: the board's glass takes the hue of the photo behind it (measured " + ", ".join(e["tint_hex"] for e in g) + "); the kit uses the palette surface role at the measured alpha"}
D["glass_band"] = {"blur_cqw": r2(band["backdrop_blur_sigma_px"] / CANVAS[2145281] * 100), "blur_is_lower_bound": True, "tint_alpha": r3(band["tint_alpha"]), "tint_role": "surface",
                   "width_cqw": r2(band["band_w_pct_w"]), "radius": 0, "cite": "look/measure.json glass_band 2145281 (R^2 still rising at sigma 64 px: blur is at least this)"}
D["photo_card"] = {"inset_cqw": r2(med([e["inset_px"] / CANVAS[e["block"]] * 100 for e in pc])), "radius_cqw": r2(med([e["radius_px"] / CANVAS[e["block"]] * 100 for e in pc])),
                   "cite": "look/measure.json photo_card 41911984 + 41432513 (colour mask, circle fit)"}
D["pill_chip"] = {"radius": "50% of height (measured radius/height " + ", ".join(str(p["radius_over_h"]) for p in pills) + ")",
                  "cap_pct_h": r2(med([p["text_h_pct_pill_h"] for p in pill_text_ok])), "pad_x_pct_h": r2(med([p["pad_x_pct_pill_h"] for p in pills])),
                  "fills": {"light": P["background"], "grey": P["surface"], "outline_on_dark": "transparent"},
                  "outline_stroke_pct_h": r2(next(p["stroke_px"] / p["h_px"] * 100 for p in pills if p["stroke_px"])),
                  "font": f"label role ({lab_['adobe_style']}), sentence case", "cite": "look/measure.json pill_chip (5 exemplars; cap height from the 3 whose text detection held)",
                  "judgment": "fills map to palette roles: measured " + ", ".join(p["fill_hex"] for p in pills if p["fill_hex"])}
lw = [e["stroke_fwhm_px"] / CANVAS[e["block"]] * 100 for e in ll["exemplars"]]
dot_ratio = med([d["dot_d_px"] / e for d, e in zip(ll["end_dots"], [1.5, 1.75, 1.25])])
D["leader_line"] = {"stroke_cqw": r3(med(lw)), "dot_over_stroke": r2(dot_ratio), "colour_role": "background (light, on photos)",
                    "label": "label role, caps", "cite": "look/measure.json leader_line (4 profiles, FWHM) + end_dots"}
D["outline_box"] = {"stroke_cqw": r3(ob["stroke_pct_w"]), "pad_x_cap": r2(ob["pad_x_over_text_h"]), "pad_y_cap": r2(ob["pad_y_over_text_h"]), "cite": "look/measure.json outline_box 30940781"}
D["hairline_rule"] = {"stroke_cqw": shp["rule_stroke_pct_w"][0], "length_cqw": shp["rule_h_len_pct"][0], "cite": f"shapes/catalogue.json proportions_median_n (n={shp['rule_stroke_pct_w'][1]})"}
D["step_marks"] = {"ring_d_cqw": r2(sm["d_pct_w"]), "pitch_cqw": r2(sm["pitch_px"] / 1080 * 100), "stroke_cqw": max(r3(sm["ring_stroke_px"] / 1080 * 100), shp["rule_stroke_pct_w"][0]),
                   "active": "filled ring (34175362 step 6)", "page_count": "label role 'n / N'", "cite": "look/measure.json step_marks 34175362 (Hough circles); stroke floored at the hairline rule"}
D["screen_frame"] = {"radius_pct_frame_w": r2(med([e["radius_pct_w"] for e in sf])), "aspect_w_h": r3(med([e["aspect_w_h"] for e in sf])), "cite": "look/measure.json screen_frame 14664481 (bottom-left corners)"}
D["meta_label"] = {"dot_d_cqw": r2(mf["dot_d_pct_w"]), "baseline_from_bottom_cqh": r2(mf["baseline_from_bottom_pct_h"]), "left_cqw": grid["margin_pct_w"],
                   "font": f"label role ({lab_['adobe_style']}), caps, tracking {lab_['letter_spacing_em']} em", "cite": "look/measure.json meta_footer 27454113; left edge = composition/grid.json margin (27454113 measured 10.0%)"}
D["dark_card"] = {"ground_role": "text", "ink_role": "background", "cite": "look/measure.json dark_card grounds " + ", ".join(e["ground_hex"] for e in ms["dark_card"]["exemplars"]),
                  "judgment": "ground = palette text #211b15 (the board's warm black), not pure #000"}
D["vertical_type"] = {"rotation_deg": -90, "font": "label role, caps", "cite": "catalog.json vertical_type (4 images); type from fonts/specimen/spec.json"}
D["icon_outline"] = {"grid": 24, "stroke_units": r2(rb["stroke_px"] / rb["canvas_w"] * 100 * 24 / 6.0), "display_cqw": 6.0, "linecap": "round", "linejoin": "round", "fill": "none",
                     "cite": f"stroke = ring_button 13607089 stroke {rb['stroke_px']} px on a {rb['canvas_w']} px canvas ({r3(rb['stroke_px'] / rb['canvas_w'] * 100)} cqw), drawn at 6 cqw on a 24 grid",
                     "judgment": "display size 6 cqw and round caps/joins, read from the close/menu/send icons on 11460382, 13607089, 14664481"}
D["dotted_path"] = {"dot_cqw": shp["rule_stroke_pct_w"][0], "dash_cqw": 0.3, "gap_cqw": 0.28, "cite": "judgment: a dashed hairline (thickness 0.139 cqw = the rule), dash 0.3 cqw / gap 0.28 cqw (about 3 px / 3 px at 1080), matched to 34175362 in the step_marks proof; the runs are too JPEG-soft to measure"}
D["grain"] = {"sigma": tr["board"]["grain"], "add_sigma": tr["grain_add_sigma"], "cite": "colour/treatment.json board.grain and grain_add_sigma; overlay opacity calibrated in proof (look/proof_check.json)"}
D["photo_treatment"] = {"lut": "kit/treatment.cube", "css_filter": None, "saturation": tr["saturation_multiplier"], "cast_shift_lab": tr["cast_shift_lab"], "cite": "colour/treatment.json"}
D["hairline_rule"]["colour_role"] = "text"

# ---------- LUT (feed -> board) as a 33^3 .cube ----------
lut = tr["lut"]
def curve(x, c):
    x = np.clip((x - c["in_black"]) / (c["in_white"] - c["in_black"]), 0, 1); return c["lift"] + (c["gain"] - c["lift"]) * x ** (1 / c["gamma"])
def treat(rgb):  # rgb float 0..1, shape (..., 3)
    o = np.stack([curve(rgb[..., i], lut[ch]) for i, ch in enumerate("rgb")], -1).astype(np.float32)
    labv = cv2.cvtColor(o[None] if o.ndim == 2 else o, cv2.COLOR_RGB2Lab)
    labv[..., 1] = labv[..., 1] * tr["saturation_multiplier"] + tr["cast_shift_lab"]["a"]; labv[..., 2] = labv[..., 2] * tr["saturation_multiplier"] + tr["cast_shift_lab"]["b"]
    out = np.clip(cv2.cvtColor(labv, cv2.COLOR_Lab2RGB), 0, 1); return out[0] if o.ndim == 2 else out
N = 33; gr = np.linspace(0, 1, N, dtype=np.float32); bb, gg, rr = np.meshgrid(gr, gr, gr, indexing="ij")
cube = treat(np.stack([rr, gg, bb], -1).reshape(-1, 3))
with open(K / "treatment.cube", "w", encoding="ascii") as f:
    f.write('TITLE "Ostad feed to board"\n# scripts/look_kit.py from colour/treatment.json: per-channel levels/gamma, Lab chroma x0.493, cast a-5.68 b-1.47\nLUT_3D_SIZE 33\n')
    for v in cube: f.write(f"{v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")

# ---------- CSS filter fit to the LUT (W3C filter math), on pixels from the Instagram thumbnails ----------
rng = np.random.default_rng(0); px = []
for p in sorted((B / "existing" / "thumbs").glob("*.jpg")):
    a = cv2.cvtColor(cv2.imread(str(p)), cv2.COLOR_BGR2RGB).reshape(-1, 3); px.append(a[rng.choice(len(a), 400, replace=False)])
X = np.concatenate(px).astype(np.float32) / 255; Y = treat(X)
def css(x, s, c, b, sep):
    m = np.array([[0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s], [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s], [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s]])
    y = np.clip(x @ m.T, 0, 1)
    sp = np.array([[0.393 + 0.607 * (1 - sep), 0.769 - 0.769 * (1 - sep), 0.189 - 0.189 * (1 - sep)], [0.349 - 0.349 * (1 - sep), 0.686 + 0.314 * (1 - sep), 0.168 - 0.168 * (1 - sep)], [0.272 - 0.272 * (1 - sep), 0.534 - 0.534 * (1 - sep), 0.131 + 0.869 * (1 - sep)]])
    y = np.clip(y @ sp.T, 0, 1); y = np.clip((y - 0.5) * c + 0.5, 0, 1); return np.clip(y * b, 0, 1)
def de(a, b):
    la = cv2.cvtColor(a[None].astype(np.float32), cv2.COLOR_RGB2Lab)[0]; lb = cv2.cvtColor(b[None].astype(np.float32), cv2.COLOR_RGB2Lab)[0]; return float(np.median(np.linalg.norm(la - lb, axis=1)))
best = (1e9, None)
for s in np.arange(0.3, 1.01, 0.05):
    for c in np.arange(0.6, 1.11, 0.05):
        for b in np.arange(0.8, 1.11, 0.025):
            for sep in (0, 0.05, 0.1, 0.15):
                e = de(css(X, s, c, b, sep), Y)
                if e < best[0]: best = (e, (r2(s), r2(c), r3(b), r2(sep)))
e, (s, c, b, sep) = best
filt = f"saturate({s}) sepia({sep}) contrast({c}) brightness({b})"
D["photo_treatment"]["css_filter"] = filt; D["photo_treatment"]["css_filter_median_dE_to_lut"] = round(e, 2)
D["photo_treatment"]["css_filter_cite"] = f"grid search (saturate, sepia, contrast, brightness) minimising median CIE76 dE to the LUT on {len(X)} pixels sampled from existing/thumbs"
json.dump({"css_filter": filt, "median_dE_to_lut": round(e, 2), "svg_filter": "components/treatment-filter.svg", "params": {"saturate": s, "sepia": sep, "contrast": c, "brightness": b}, "lut": "treatment.cube", "source": "colour/treatment.json"},
          open(K / "treatment.json", "w", encoding="utf-8"), indent=1)

# ---------- SVG filter: the LUT as per-channel tables + one fitted colour matrix (sRGB) ----------
# feComponentTransfer reproduces the per-channel levels/gamma exactly (33-point tables); the Lab chroma x0.493 + cast shift is
# approximated by a 4x5 feColorMatrix fitted by least squares on the same Instagram pixels. Chromium only resolves same-document
# filter references, so templates inline kit/components/treatment-filter.svg and use filter:url(#ok-treat).
tab = {ch: " ".join(f"{v:.4f}" for v in curve(np.linspace(0, 1, 33), lut[ch])) for ch in "rgb"}
Cx = np.stack([curve(X[:, i], lut[ch]) for i, ch in enumerate("rgb")], -1)
A = np.c_[Cx, np.ones(len(Cx))]; Mx = np.linalg.lstsq(A, Y, rcond=None)[0].T  # 3x4
svgY = np.clip(A @ Mx.T, 0, 1); e_svg = de(svgY.astype(np.float32), Y)
rows = [" ".join(f"{v:.4f}" for v in (*Mx[i, :3], 0, Mx[i, 3])) for i in range(3)] + ["0 0 0 1 0"]
svg_f = ('<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="ok-treat" color-interpolation-filters="sRGB">'
         f'<feComponentTransfer><feFuncR type="table" tableValues="{tab["r"]}"/><feFuncG type="table" tableValues="{tab["g"]}"/><feFuncB type="table" tableValues="{tab["b"]}"/></feComponentTransfer>'
         f'<feColorMatrix type="matrix" values="{" ".join(rows)}"/></filter></svg>')
(C / "treatment-filter.svg").write_text(svg_f + chr(10), encoding="utf-8")
D["photo_treatment"]["svg_filter"] = "kit/components/treatment-filter.svg (#ok-treat)"; D["photo_treatment"]["svg_filter_median_dE_to_lut"] = round(e_svg, 2)
# ---------- palette + accent/surface rule ----------
aa = pal["aa_pairs"]
kp = {"roles": {k: {"hex": v["hex"], "L": v["L"], "C": v["C"], "source": v["source"]} for k, v in pal["palette"].items()},
      "pairs": aa, "rule": {
          "background": {"text": ["text", "signal", "accent-2"], "fill_accent": "accent-1 (with text ink)"},
          "surface": {"text": ["text"], "headline_only": ["signal"]},
          "accent-1": {"text": ["text"]}, "accent-2": {"headline_only": ["text"]},
          "text (dark card)": {"text": ["background"], "accent": "accent-1"},
          "glass": {"text": ["text"], "note": "glass = surface at the measured alpha over a treated photo; text ink is checked per render"}},
      "rule_cite": "colour/palette.json aa_pairs (caption >= 4.5, headline >= 3.0)", "source": "colour/palette.json"}
json.dump(kp, open(K / "palette.json", "w", encoding="utf-8"), indent=1)

# ---------- tokens.css ----------
G, Pp, PC, LL, OB, HR, SM, SF, ML, IC, DP = (D[k] for k in ("glass_panel", "pill_chip", "photo_card", "leader_line", "outline_box", "hairline_rule", "step_marks", "screen_frame", "meta_label", "icon_outline", "dotted_path"))
hexrgb = lambda h: ", ".join(str(int(h[i:i + 2], 16)) for i in (1, 3, 5))
sizes = spec["canvases"]["1080x1350"]["sizes"]
tok = [f"/* Ostad kit tokens. Generated by brand/scripts/look_kit.py from kit/look.json + colour/palette.json + fonts/specimen/spec.json. Do not edit by hand. */",
       ".ok {", "  container-type: size;", "  position: relative; overflow: hidden;"]
for k, v in P.items(): tok.append(f"  --ok-{k}: {v};"); tok.append(f"  --ok-{k}-rgb: {hexrgb(v)};")
tok += [f"  --ok-display: \"neue-haas-grotesk-display\", \"Inter Tight\", Arial, sans-serif;", f"  --ok-font-text: \"neue-haas-grotesk-text\", Inter, Arial, sans-serif;",
        f"  --ok-margin: {grid['margin_pct_w']}cqw;"]
for role, v in sizes.items():
    r = spec["roles"][role]; tok += [f"  --ok-{role}-size: {r3(v['font_size_px'] / 10.8)}cqw;", f"  --ok-{role}-lh: {r['line_height']};", f"  --ok-{role}-track: {r['letter_spacing_em']}em;", f"  --ok-{role}-weight: {r['weight']};"]
tok += [f"  --ok-glass-radius: {G['radius_cqw']}cqw;", f"  --ok-glass-blur: {G['blur_cqw']}cqw;", f"  --ok-glass-alpha: {G['tint_alpha']};",
        f"  --ok-band-blur: {D['glass_band']['blur_cqw']}cqw;", f"  --ok-band-alpha: {D['glass_band']['tint_alpha']};", f"  --ok-band-w: {D['glass_band']['width_cqw']}cqw;",
        f"  --ok-photo-inset: {PC['inset_cqw']}cqw;", f"  --ok-photo-radius: {PC['radius_cqw']}cqw;",
        f"  --ok-pill-h: {r3(cap_em / (Pp['cap_pct_h'] / 100))}em;", f"  --ok-pill-pad: {r3(cap_em / (Pp['cap_pct_h'] / 100) * Pp['pad_x_pct_h'] / 100)}em;",
        f"  --ok-pill-stroke: {r3(cap_em / (Pp['cap_pct_h'] / 100) * Pp['outline_stroke_pct_h'] / 100)}em;",
        f"  --ok-hair: {LL['stroke_cqw']}cqw;", f"  --ok-dot: calc(var(--ok-hair) * {LL['dot_over_stroke']});",
        f"  --ok-box-stroke: {OB['stroke_cqw']}cqw;", f"  --ok-box-pad-x: {r3(OB['pad_x_cap'] * cap_em)}em;", f"  --ok-box-pad-y: {r3(OB['pad_y_cap'] * cap_em)}em;",
        f"  --ok-rule: {HR['stroke_cqw']}cqw;", f"  --ok-rule-len: {HR['length_cqw']}cqw;",
        f"  --ok-step-d: {SM['ring_d_cqw']}cqw;", f"  --ok-step-pitch: {SM['pitch_cqw']}cqw;", f"  --ok-step-stroke: {SM['stroke_cqw']}cqw;",
        f"  --ok-frame-radius: {SF['radius_pct_frame_w'] / 100};", f"  --ok-frame-aspect: {SF['aspect_w_h']};",
        f"  --ok-meta-dot: {ML['dot_d_cqw']}cqw;", f"  --ok-meta-bottom: {ML['baseline_from_bottom_cqh']}cqh;",
        f"  --ok-icon: {IC['display_cqw']}cqw;", f"  --ok-icon-stroke: {IC['stroke_units']};",
        f"  --ok-dotted-dot: {DP['dot_cqw']}cqw;", f"  --ok-dotted-dash: {DP['dash_cqw']}cqw;", f"  --ok-dotted-gap: {DP['gap_cqw']}cqw;",
        f"  --ok-photo-filter: {filt};", "  --ok-grain-opacity: 0.0;",
        "  background: var(--ok-background); color: var(--ok-text);", "  font-family: var(--ok-display);", "}"]
(K / "tokens.css").write_text("\n".join(tok) + "\n", encoding="utf-8")

# ---------- components (one file each) ----------
COMP = {
"glass-panel": """/* glass_panel + glass_band: frosted surface over a photo. Board: 41911984, 41432513, 2145281. Matte: no rim light, no shadow (measured). */
.ok-glass { position: absolute; border-radius: var(--ok-glass-radius);
  background: rgba(var(--ok-surface-rgb), var(--ok-glass-alpha));
  -webkit-backdrop-filter: blur(var(--ok-glass-blur)); backdrop-filter: blur(var(--ok-glass-blur));
  color: var(--ok-text); overflow: hidden; }
.ok-glass--band { border-radius: 0; top: 0; bottom: 0; left: 0; width: var(--ok-band-w);
  background: rgba(var(--ok-surface-rgb), var(--ok-band-alpha));
  -webkit-backdrop-filter: blur(var(--ok-band-blur)); backdrop-filter: blur(var(--ok-band-blur)); }
.ok-glass--band.ok-glass--right { left: auto; right: 0; }
""",
"photo-card": """/* photo_card: rounded image inset in a glass card. Board: 41911984, 41432513. */
.ok-photo { display: block; width: 100%; border-radius: var(--ok-photo-radius); object-fit: cover; filter: var(--ok-photo-filter); }
.ok-glass > .ok-photo, .ok-glass > .ok-inset { margin: var(--ok-photo-inset); width: calc(100% - 2 * var(--ok-photo-inset)); }
.ok-inset { padding: 0; }
""",
"pill-chip": """/* pill_chip: fully rounded label. Board: 41911984, 41432513, 11460382, 27647159, 52313969. */
.ok-pill { display: inline-flex; align-items: center; height: var(--ok-pill-h); padding: 0 var(--ok-pill-pad);
  border-radius: calc(var(--ok-pill-h) / 2); white-space: nowrap; box-sizing: border-box;
  font: var(--ok-label-weight) var(--ok-label-size)/1 var(--ok-display); letter-spacing: var(--ok-label-track);
  background: var(--ok-background); color: var(--ok-text); }
.ok-pill--grey { background: var(--ok-surface); }
.ok-pill--accent { background: var(--ok-accent-1); color: var(--ok-text); }
.ok-pill--outline { background: transparent; color: var(--ok-background); box-shadow: inset 0 0 0 var(--ok-pill-stroke) currentColor; }
.ok-pill--dark { background: var(--ok-text); color: var(--ok-background); }
.ok-pills { display: flex; flex-wrap: wrap; gap: calc(var(--ok-pill-h) * 0.18); }
""",
"leader-line": """/* leader_line: hairline from a point to a label, dot at the point. Board: 30940781, 12400773, 21587531, 23958815 ...
   Draw the line in SVG inside .ok-leaders (viewBox 0 0 100 H in cqw-like units) or with .ok-leader (CSS, horizontal/vertical). */
.ok-leaders { position: absolute; inset: 0; pointer-events: none; overflow: visible; }
.ok-leaders line, .ok-leaders polyline, .ok-leaders path { stroke: var(--ok-leader-ink, var(--ok-background)); stroke-width: var(--ok-hair); fill: none; vector-effect: non-scaling-stroke; }
.ok-leaders circle { fill: var(--ok-leader-ink, var(--ok-background)); }
.ok-leader { position: absolute; background: var(--ok-leader-ink, var(--ok-background)); }
.ok-leader--h { height: var(--ok-hair); } .ok-leader--v { width: var(--ok-hair); }
.ok-leader-dot { position: absolute; width: var(--ok-dot); height: var(--ok-dot); border-radius: 50%; background: var(--ok-leader-ink, var(--ok-background)); transform: translate(-50%, -50%); }
.ok-leader-label { position: absolute; font: var(--ok-label-weight) var(--ok-label-size)/var(--ok-label-lh) var(--ok-display);
  letter-spacing: calc(var(--ok-label-track) + 0.08em); text-transform: uppercase; color: var(--ok-leader-ink, var(--ok-background)); }
""",
"outline-box": """/* outline_box: hairline rectangle around a caps title. Board: 30940781, 21587531, 23958815, 47161957. */
.ok-box { display: inline-block; padding: var(--ok-box-pad-y) var(--ok-box-pad-x); box-shadow: inset 0 0 0 var(--ok-box-stroke) currentColor;
  font: var(--ok-label-weight) var(--ok-label-size)/1 var(--ok-display); letter-spacing: var(--ok-label-track); text-transform: uppercase; }
""",
"hairline-rule": """/* hairline_rule: divider. shapes/catalogue.json: median stroke 0.139% w, length 45.9% w. */
.ok-rule { display: block; height: var(--ok-rule); width: var(--ok-rule-len); background: currentColor; border: 0; margin: 0; }
.ok-rule--full { width: auto; } .ok-rule--v { width: var(--ok-rule); height: var(--ok-rule-len); }
""",
"step-marks": """/* step_marks: numbered rings on a dotted line; page count. Board: 34175362, 27454113, 11460382, 14664481 ... */
.ok-steps { display: flex; align-items: center; gap: calc(var(--ok-step-pitch) - var(--ok-step-d)); position: relative; }
/* the dotted connector runs only between rings (34175362), never through them */
.ok-step + .ok-step::before { content: ""; position: absolute; right: calc(100% + var(--ok-dotted-gap)); top: 50%; width: calc(var(--ok-step-pitch) - var(--ok-step-d) - 2 * var(--ok-dotted-gap)); height: var(--ok-dotted-dot);
  background: linear-gradient(90deg, currentColor 0 var(--ok-dotted-dash), transparent 0) 0 0 / calc(var(--ok-dotted-dash) + var(--ok-dotted-gap)) 100% repeat-x; transform: translateY(-50%); }
.ok-step { position: relative; z-index: 1; width: var(--ok-step-d); height: var(--ok-step-d); border-radius: 50%; display: grid; place-items: center;
  box-shadow: inset 0 0 0 var(--ok-step-stroke) currentColor; background: var(--ok-step-ground, transparent);
  font: var(--ok-label-weight) calc(var(--ok-step-d) * 0.36)/1 var(--ok-display); }
.ok-step--on { background: currentColor; } .ok-step--on > span { color: var(--ok-step-on-ink, var(--ok-text)); }
.ok-progress { display: flex; gap: 0.6cqw; } .ok-progress > i { flex: 1; height: var(--ok-rule); background: currentColor; opacity: .35; } .ok-progress > i.on { opacity: 1; }
.ok-count { font: var(--ok-label-weight) var(--ok-label-size)/1 var(--ok-display); letter-spacing: var(--ok-label-track); font-variant-numeric: tabular-nums; }
""",
"screen-frame": """/* screen_frame: tall rounded screen. Board: 14664481, 16453124, 34771058, 13828406, 15688099 ... radius = 11.7% of frame width. */
.ok-frame { --w: 40cqw; position: absolute; width: var(--w); aspect-ratio: var(--ok-frame-aspect); border-radius: calc(var(--w) * var(--ok-frame-radius)); overflow: hidden; }
.ok-frame > img { width: 100%; height: 100%; object-fit: cover; filter: var(--ok-photo-filter); }
""",
"meta-label": """/* meta_label: small caps data text in corners; footer dot + text + page count. Board: 14664481, 16463981, 27454113, 2145281 ... */
.ok-meta { font: var(--ok-label-weight) var(--ok-label-size)/var(--ok-label-lh) var(--ok-display); letter-spacing: var(--ok-label-track); text-transform: uppercase; }
.ok-meta--slash::before { content: "/ "; } .ok-meta--slash::after { content: " /"; }
.ok-footer { position: absolute; left: var(--ok-margin); right: var(--ok-margin); bottom: var(--ok-meta-bottom); display: flex; align-items: baseline; gap: 2.5cqw; }
.ok-footer::before { content: ""; width: var(--ok-meta-dot); height: var(--ok-meta-dot); border-radius: 50%; background: currentColor; align-self: center; flex: none; }
.ok-footer > .ok-count { margin-left: auto; }
""",
"dark-card": """/* dark_card: warm black slide. Board: 27454118, 27454113, 11460382, 13902728 ... */
.ok--dark { background: var(--ok-text); color: var(--ok-background); --ok-leader-ink: var(--ok-background); --ok-step-on-ink: var(--ok-text); }
""",
"vertical-type": """/* vertical_type: caps line rotated along an edge. Board: 40898406, 50510620, 2145281, 30940781. */
.ok-vert { position: absolute; writing-mode: vertical-rl; transform: rotate(180deg); font: var(--ok-label-weight) var(--ok-label-size)/1 var(--ok-display);
  letter-spacing: calc(var(--ok-label-track) + 0.06em); text-transform: uppercase; white-space: nowrap; }
""",
"icon": """/* icon_outline: white monoline icons, round caps. SVG masters in kit/icons/svg. */
.ok-icon { width: var(--ok-icon); height: var(--ok-icon); display: inline-block; color: inherit; }
.ok-icon svg, svg.ok-icon { width: 100%; height: 100%; stroke: currentColor; stroke-width: var(--ok-icon-stroke); fill: none; stroke-linecap: round; stroke-linejoin: round; }
.ok-icon--glass { display: inline-grid; place-items: center; width: calc(var(--ok-icon) * 1.75); height: calc(var(--ok-icon) * 1.75); border-radius: 50%;
  background: rgba(var(--ok-surface-rgb), var(--ok-glass-alpha)); -webkit-backdrop-filter: blur(var(--ok-glass-blur)); backdrop-filter: blur(var(--ok-glass-blur)); }
.ok-icon--glass > svg { width: var(--ok-icon); height: var(--ok-icon); }
""",
"dotted-path": """/* dotted_path: dashed hairline connector. Board: 34126462, 33635746, 47161957, 34175362. */
.ok-dotted { display: block; height: var(--ok-dotted-dot); background: linear-gradient(90deg, currentColor 0 var(--ok-dotted-dash), transparent 0) 0 0 / calc(var(--ok-dotted-dash) + var(--ok-dotted-gap)) 100% repeat-x; }
.ok-dotted--v { width: var(--ok-dotted-dot); height: auto; background: linear-gradient(180deg, currentColor 0 var(--ok-dotted-dash), transparent 0) 0 0 / 100% calc(var(--ok-dotted-dash) + var(--ok-dotted-gap)) repeat-y; }
""",
"grain": """/* grain: film noise over the whole post. Opacity calibrated to the board's sigma in look/proof_check.json. */
.ok-grain { position: absolute; inset: 0; pointer-events: none; z-index: 50; opacity: var(--ok-grain-opacity); mix-blend-mode: overlay;
  background-image: url("grain.svg"); background-size: 256px 256px; }
""",
"photo-treatment": """/* photo_treatment: the board look on any photo. Primary: inline kit/components/treatment-filter.svg once per page and the
   photo uses filter:url(#ok-treat) (LUT tables + fitted matrix). Fallback: the CSS shorthand fitted to the LUT (--ok-photo-filter). */
.ok-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: var(--ok-photo-filter); }
.ok-treated { filter: var(--ok-photo-filter); }
.ok--svgtreat .ok-bg, .ok--svgtreat .ok-treated, .ok--svgtreat .ok-photo, .ok--svgtreat .ok-frame > img { filter: url(#ok-treat); }
""",
}
for name, css_ in COMP.items(): (C / f"{name}.css").write_text(css_, encoding="utf-8")
(C / "grain.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>', encoding="utf-8")
(K / "kit.css").write_text('@import url("tokens.css");\n' + "".join(f'@import url("components/{n}.css");\n' for n in COMP), encoding="utf-8")
look["components"] = {n: f"kit/components/{n}.css" for n in COMP}
look["kept_devices"] = cat["kept"]
json.dump(look, open(K / "look.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(json.dumps({k: {kk: vv for kk, vv in v.items() if kk not in ("cite", "judgment")} for k, v in D.items()}, indent=0, ensure_ascii=False)[:4000])
