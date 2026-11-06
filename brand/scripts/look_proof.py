"""BUILDER Phase A proofs: every kept device is rebuilt from kit/components/*.css at the source image's own canvas size, rendered in
Chromium with the Adobe kit fonts (scripts/render_scenes.cjs), then shown next to its source crop:
  [ source crop | rebuilt (exemplar's own measured values) | kit (look.json medians + palette roles) ]
and re-measured with the same estimators that measured the source (scripts/look_lib.py / look_measure.py functions).
Clean plates for line devices: the drawn device is removed from the source by inpainting (bright thin pixels, cv2.inpaint TELEA)
so the rebuild is drawn on the same photo. Grain opacity is calibrated here and written back to kit/look.json + kit/tokens.css.
-> look/proof/{device}.png, look/proof_check.json. brand-venv python -I."""
import json, pathlib, subprocess, sys, os, glob, re
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from look_lib import img, lab, hexc, refine_rect, corner_radius, glass
B = pathlib.Path(__file__).resolve().parents[1]; ROOT = B.parent; P = B / "look" / "proof"; SC = P / "_scenes"; PL = P / "_plates"; R = P / "_r"
for d in (P, SC, PL, R): d.mkdir(parents=True, exist_ok=True)
ms = json.load(open(B / "look" / "measure.json", encoding="utf-8"))["devices"]; look = json.load(open(B / "kit" / "look.json", encoding="utf-8")); D = look["devices"]
src = lambda bid: "/" + pathlib.Path(glob.glob(str(B / "board" / "img" / f"{bid}_*"))[0]).relative_to(B).as_posix()
HEAD = '<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="https://use.typekit.net/vzz0hgt.css"><link rel="stylesheet" href="/kit/kit.css"><style>html,body{margin:0;background:#000}</style>'
scenes, PROOFS = [], []
def scene(name, w, h, body, style=""):
    (SC / f"{name}.html").write_text(HEAD + f'<div class="ok" style="width:{w}px;height:{h}px;{style}">{body}</div>', encoding="utf-8")
    scenes.append({"html": f"look/proof/_scenes/{name}.html", "w": w, "h": h, "clip": None, "out": f"look/proof/_r/{name}.png"})
def plate(bid, region, name, thr=12, extra_mask=None):
    """inpaint bright thin structures inside region -> plate png served to the scene"""
    a = img(bid).copy(); x0, y0, x1, y1 = region; Lc = lab(a)[..., 0]
    sub = Lc[y0:y1, x0:x1]; bgm = cv2.medianBlur(np.clip(sub * 2.55, 0, 255).astype(np.uint8), 21).astype(np.float32) / 2.55
    m = ((sub - bgm) > thr).astype(np.uint8)
    if extra_mask is not None: m |= extra_mask
    m = cv2.dilate(m, np.ones((5, 5), np.uint8)); full = np.zeros(Lc.shape, np.uint8); full[y0:y1, x0:x1] = m * 255
    out = cv2.inpaint(a, full, 6, cv2.INPAINT_TELEA); cv2.imwrite(str(PL / f"{name}.png"), out); return f"/look/proof/_plates/{name}.png", int(m.sum())
def medhex(bid, box): a = img(bid); x0, y0, x1, y1 = box; return hexc(np.median(a[y0:y1, x0:x1].reshape(-1, 3), axis=0))
rgb = lambda h: ", ".join(str(int(h[i:i + 2], 16)) for i in (1, 3, 5))

# ---- glass panel (two exemplars) + photo card ----
G = {e["block"]: e for e in ms["glass_panel"]["exemplars"]}; PCm = {e["block"]: e for e in ms["photo_card"]["exemplars"]}
for bid, W, H, shift, photo in ((41911984, 1700, 1638, 576, (610, 516, 1090, 1120)), (41432513, 1700, 2125, -1095, (342, 333, 796, 786))):
    e = G[bid]; l, t, r_, b = e["box_px"]; pc = PCm[bid]; pw = r_ - l - 2 * pc["inset_px"]
    crop_png = R / f"photo_{bid}.png"; a = img(bid); x0, y0, x1, y1 = photo; cv2.imwrite(str(crop_png), a[y0:y1, x0:x1])
    bg = f"background:url({src(bid)}) {shift}px 0 / {W}px {H}px repeat-x"
    for var, tint, al, blur, rad, prad in (("rebuilt", e["tint_hex"], e["tint_alpha"], e["backdrop_blur_sigma_px"], e["radius_px"], pc["radius_px"]),
                                          ("kit", None, D["glass_panel"]["tint_alpha"], None, None, None)):
        st = "" if var == "kit" else f"--ok-surface-rgb:{rgb(tint)};--ok-glass-alpha:{al};--ok-glass-blur:{blur}px;--ok-glass-radius:{rad}px;--ok-photo-radius:{prad}px;--ok-photo-inset:{pc['inset_px']}px;"
        scene(f"glass_panel_{bid}_{var}", W, H, f'<div class="ok-glass" style="left:{l}px;top:{t}px;width:{r_ - l}px;height:{b - t}px;{st}">'
              f'<img class="ok-photo" src="/look/proof/_r/photo_{bid}.png" style="filter:none;height:{int(pw * (y1 - y0) / (x1 - x0))}px"></div>', bg)
    PROOFS.append(("glass_panel", bid, (l - 40, t - 40, r_ + 40, b + 40), f"glass_panel_{bid}"))
    PROOFS.append(("photo_card", bid, (l - 10, t - 10, l + 220, t + 220), f"glass_panel_{bid}"))

# ---- glass band ----
e = ms["glass_band"]["exemplars"][0]; xe = e["edge_x_px"]
for var, st in (("rebuilt", f"--ok-surface-rgb:{rgb(e['tint_hex'])};--ok-band-alpha:{e['tint_alpha']};--ok-band-blur:{e['backdrop_blur_sigma_px']}px;--ok-band-w:{xe}px"), ("kit", "")):
    scene(f"glass_band_2145281_{var}", 1280, 1268, f'<div class="ok-glass ok-glass--band" style="{st}"></div>', f"background:url({src(2145281)}) -560px 0 / 1280px 1268px repeat-x")
PROOFS.append(("glass_band", 2145281, (0, 0, xe + 300, 1268), "glass_band_2145281"))

# ---- pills ----
pm = ms["pill_chip"]["exemplars"]
p27 = pm[1]; g27 = medhex(27647159, (400, 300, 700, 500)); f27 = round(p27["text_h_pct_pill_h"] / 100 * p27["h_px"] / 0.7188 / (D["pill_chip"]["cap_pct_h"] / p27["text_h_pct_pill_h"]), 1)
fs = lambda h: round(D["pill_chip"]["cap_pct_h"] / 100 * h / 0.7188, 2)  # font size that gives the kit cap/height ratio at height h
for var, st in (("rebuilt", f"--ok-label-size:{fs(p27['h_px'])}px;background:{p27['fill_hex']};color:{p27['text_hex']};font-weight:400"), ("kit", "")):
    scene(f"pill_chip_27647159_{var}", 1080, 1080, f'<span class="ok-pill ok-pill--grey" style="position:absolute;left:50px;top:50px;{st}">+ Recruitment</span>', f"background:{g27}")
PROOFS.append(("pill_chip", 27647159, (35, 35, 330, 120), "pill_chip_27647159"))
po = pm[3]
for var, st in (("rebuilt", f"--ok-label-size:{fs(po['h_px'])}px;--ok-pill-stroke:{po['stroke_px']}px;font-weight:400"), ("kit", "")):
    scene(f"pill_chip_11460382_{var}", 1080, 2246, f'<div class="ok-pills" style="position:absolute;left:70px;top:349px;{st}"><span class="ok-pill" style="background:#fbfbfc">New</span><span class="ok-pill ok-pill--outline">26.02.21</span></div>', "background:#000")
PROOFS.append(("pill_chip", 11460382, (55, 330, 520, 470), "pill_chip_11460382"))

# ---- leader lines + outline box on a clean plate of 30940781 ----
url30, n30 = plate(30940781, (40, 30, 540, 740), "p30940781", thr=14)
VX, DOT = [96, 219, 343, 468], [(96, 145), (219, 245), (343, 252), (468, 387)]
LBL = ["exfoliate", "double cleanse", "use facial mask", "apply moisturiser"]
def leaders(stroke, dot, size):
    svg = f'<svg class="ok-leaders" width="564" height="752" viewBox="0 0 564 752" style="--ok-hair:{stroke}px"><polyline points="{VX[0] + .5},{DOT[0][1]} {VX[0] + .5},58.5 {VX[-1] + .5},58.5 {VX[-1] + .5},{DOT[-1][1]}"/>' + \
          "".join(f'<line x1="{x + .5}" y1="58.5" x2="{x + .5}" y2="{y}"/>' for x, (_, y) in zip(VX[1:3], DOT[1:3])) + "".join(f'<circle cx="{x}" cy="{y}" r="{dot / 2}"/>' for x, y in DOT) + "</svg>"
    lab_ = "".join(f'<span class="ok-vert" style="left:{x + 12}px;bottom:{752 - y + 4}px;font-size:{size}px;font-weight:400;text-transform:none;letter-spacing:0.04em;color:var(--ok-background)">{t}</span>' for (x, t), (_, y) in zip(zip(VX, LBL), DOT))
    return svg + lab_
ll = ms["leader_line"]; st30 = round(float(np.median([x["stroke_fwhm_px"] for x in ll["exemplars"] if x["block"] == 30940781])), 2)
scene("leader_line_30940781_rebuilt", 564, 752, leaders(st30, 9.15, 16), f"background:url({url30}) 0 0 / 564px 752px")
scene("leader_line_30940781_kit", 564, 752, leaders(round(D["leader_line"]["stroke_cqw"] * 5.64, 2), round(D["leader_line"]["stroke_cqw"] * 5.64 * D["leader_line"]["dot_over_stroke"], 2), 16), f"background:url({url30}) 0 0 / 564px 752px")
PROOFS.append(("leader_line", 30940781, (60, 30, 520, 420), "leader_line_30940781"))
ob = ms["outline_box"]["exemplars"][0]; fsb = round(ob["text_h_px"] / 0.7188, 1)
for var, st in (("rebuilt", f"font-size:{fsb}px;font-weight:400;--ok-box-stroke:{ob['stroke_px']}px;padding:{ob['pad_y_px'] - 1}px {ob['pad_x_px'] - 1}px;letter-spacing:0.02em"), ("kit", f"font-size:{fsb}px")):
    scene(f"outline_box_30940781_{var}", 564, 752, f'<span class="ok-box" style="position:absolute;left:121px;top:667px;color:#ffe0c8;{st}">Naturally glowing skin</span>', f"background:url({url30}) 0 0 / 564px 752px")
PROOFS.append(("outline_box", 30940781, (100, 640, 564, 745), "outline_box_30940781"))

# ---- step marks + dotted path on a clean plate of 34175362 ----
url34, _ = plate(34175362, (40, 92, 1010, 152), "p34175362", thr=10)
sm = ms["step_marks"]["exemplars"][0]
steps = "".join(f'<span class="ok-step{" ok-step--on" if k == 6 else ""}"><span>{k}</span></span>' for k in range(1, 7))
for var in ("rebuilt", "kit"):
    scene(f"step_marks_34175362_{var}", 1080, 1349, f'<div class="ok-steps" style="position:absolute;left:{157 - sm["d_px"] / 2:.1f}px;top:{123 - sm["d_px"] / 2:.1f}px;color:#fff;--ok-step-on-ink:#211b15">{steps}</div>', f"background:url({url34}) 0 0 / 1080px 1349px")
PROOFS.append(("step_marks", 34175362, (40, 85, 1010, 165), "step_marks_34175362"))
PROOFS.append(("dotted_path", 34175362, (150, 100, 520, 146), "step_marks_34175362"))

# ---- screen frame ----
sf = ms["screen_frame"]["exemplars"][0]; l, t, r_, b = sf["box_px"]; a = img(14664481); cv2.imwrite(str(R / "frame_14664481.png"), a[t:b, l:r_])
g14 = medhex(14664481, (5, 1300, 100, 1400))
for var, st in (("rebuilt", f"--ok-frame-radius:{sf['radius_px'] / sf['w_px']:.4f};--ok-frame-aspect:{(r_ - l) / (b - t):.4f}"), ("kit", "")):
    scene(f"screen_frame_14664481_{var}", 2400, 1408, f'<div class="ok-frame" style="--w:{r_ - l}px;left:{l}px;top:{t}px;{st}"><img src="/look/proof/_r/frame_14664481.png" style="filter:none"></div>', f"background:{g14}")
PROOFS.append(("screen_frame", 14664481, (l - 20, t - 20, r_ + 20, b + 20), "screen_frame_14664481"))

# ---- dark card + meta label (27454113 rebuilt as a whole slide) ----
body = ('<div style="position:absolute;left:144px;top:140px;width:1100px;font:400 37px/1.36 var(--ok-text)">As an organisation, Pure Finance is committed to putting 5% of revenue to work for good via our impact giving model: Pure Community. This 5% is then split between three distinct impact areas:'
        '<p style="font-weight:500;margin:52px 0">1% to Pay the Rent<br>1% For the Earth<br>3% for our NFP, YOURS</p>Let\'s take a look at where the community sent its support for the third quarter of the year.</div>')
foot = '<div class="ok-footer" style="left:144px;right:144px;font-size:33px;--ok-meta-dot:29px"><span class="ok-meta" style="text-transform:none;font-size:33px;margin-left:61px">Pure Community&nbsp; /&nbsp; Q3, 2023</span><span class="ok-count" style="font-size:33px">1 / 9</span></div>'
scene("dark_card_27454113_rebuilt", 1440, 1800, body + foot, "background:#000;color:#fff")
scene("dark_card_27454113_kit", 1440, 1800, body.replace("font:400 37px/1.36 var(--ok-text)", "font:400 37px/1.36 var(--ok-text)") + foot.replace("--ok-meta-dot:29px", ""), "", )
(SC / "dark_card_27454113_kit.html").write_text((SC / "dark_card_27454113_kit.html").read_text(encoding="utf-8").replace('class="ok"', 'class="ok ok--dark"'), encoding="utf-8")
PROOFS.append(("dark_card", 27454113, (0, 0, 1440, 1800), "dark_card_27454113"))
PROOFS.append(("meta_label", 27454113, (100, 1580, 1340, 1700), "dark_card_27454113"))

# ---- vertical type on 2145281 ('Rêve Humide • Shine') ----
url21, _ = plate(2145281, (325, 100, 395, 560), "p2145281", thr=8)
colm = lab(img(2145281))[..., 0][120:540, 330:390]; on = (colm - np.median(colm)) > 8; xs = np.nonzero(on.sum(0) > 3)[0]; capw = int(xs.max() - xs.min() + 1) if len(xs) else 24
for var, st in (("rebuilt", f"font-size:{round(capw / 0.7188, 1)}px;text-transform:none;font-weight:400;letter-spacing:0.02em;color:#e9e6e4"), ("kit", f"font-size:{round(capw / 0.7188, 1)}px;color:var(--ok-background)")):
    scene(f"vertical_type_2145281_{var}", 1280, 1268, f'<span class="ok-vert" style="left:{330 + xs.min() if len(xs) else 340}px;top:112px;{st}">Rêve Humide &nbsp;•&nbsp; Shine</span>', f"background:url({url21}) 0 0 / 1280px 1268px")
PROOFS.append(("vertical_type", 2145281, (300, 90, 420, 580), "vertical_type_2145281"))

# ---- icon style vs the ring button / outline icons of 13607089 ----
rbm = ms["ring_button"]["exemplars"][0]; playsvg = (B / "kit" / "icons" / "svg" / "play.svg").read_text(encoding="utf-8")
icon_px = rbm["d_px"] * 24 / 18  # the play icon's ring is r=9 on the 24 grid
for var, px_, st in (("rebuilt", icon_px, f"--ok-icon:{icon_px:.1f}px;--ok-icon-stroke:{rbm['stroke_px'] * 24 / icon_px:.3f}"), ("kit", 6 * 7.5, "")):
    scene(f"icon_outline_13607089_{var}", 750, 1618, f'<span class="ok-icon" style="position:absolute;left:{589 - px_ / 2:.1f}px;top:{1301 - px_ / 2:.1f}px;color:#fff;{st}">{playsvg}</span>', f"background:url({src(13607089)}) -300px -700px / 750px 1618px")
PROOFS.append(("icon_outline", 13607089, (440, 1150, 740, 1450), "icon_outline_13607089"))

# ---- hairline rules: detect the rules in 36747221 and redraw them ----
a36 = img(36747221); H36, W36 = a36.shape[:2]; g36 = cv2.cvtColor(a36, cv2.COLOR_BGR2GRAY).astype(float)
rows = []
for y in range(int(H36 * 0.02), int(H36 * 0.3)):
    d = g36[y] < np.median(g36[max(0, y - 6):y + 7], axis=0) - 25; run = np.diff(np.flatnonzero(np.diff(np.r_[0, d.astype(int), 0])))
    starts = np.flatnonzero(np.diff(np.r_[0, d.astype(int)]) == 1)
    if len(run) and run[::2].max() > 0.3 * W36:
        k = int(np.argmax(run[::2])); rows.append((y, int(starts[k]), int(starts[k] + run[::2][k])))
rules = []
for y, x0, x1 in rows:
    if rules and y - rules[-1]["y1"] <= 1: rules[-1]["y1"] = y
    else: rules.append({"y0": y, "y1": y, "x0": x0, "x1": x1})
ink36 = hexc(np.median(a36[[r["y0"] for r in rules], :][:, :, :].reshape(-1, 3)[np.argsort(g36[[r["y0"] for r in rules]].ravel())[:200]], axis=0)) if rules else "#000"
url36, _ = plate(36747221, (0, int(H36 * 0.02), W36, int(H36 * 0.3)), "p36747221", thr=0, extra_mask=None) if False else (src(36747221), 0)
bg36 = medhex(36747221, (W36 // 2 - 40, int(H36 * 0.025), W36 // 2 + 40, int(H36 * 0.03)))
for var in ("rebuilt", "kit"):
    lines = "".join(f'<hr class="ok-rule" style="position:absolute;left:{r["x0"]}px;top:{r["y0"]}px;width:{r["x1"] - r["x0"]}px;{"height:%dpx;" % (r["y1"] - r["y0"] + 1) if var == "rebuilt" else ""}color:{ink36}">' for r in rules)
    scene(f"hairline_rule_36747221_{var}", W36, H36, lines, f"background:{bg36}")
PROOFS.append(("hairline_rule", 36747221, (0, int(H36 * 0.02), W36, int(H36 * 0.3)), "hairline_rule_36747221"))

# ---- grain calibration: flat mid-tone with the grain overlay at several opacities ----
OPS = [0.04, 0.08, 0.12, 0.18, 0.26, 0.36]
for o in OPS: scene(f"grain_cal_{int(o * 100)}", 1080, 1080, f'<div class="ok-grain" style="--ok-grain-opacity:{o}"></div>', "background:#8f8580")
# ---- photo treatment: an Instagram thumb raw / CSS filter ----
thumb = sorted((B / "existing" / "thumbs").glob("*.jpg"))[3]; cv2.imwrite(str(R / "thumb.png"), cv2.imread(str(thumb)))
th = cv2.imread(str(thumb)); TH, TW = th.shape[:2]
scene("photo_treatment_css", TW, TH, '<img class="ok-bg" src="/look/proof/_r/thumb.png">')
TF = (B / "kit" / "components" / "treatment-filter.svg").read_text(encoding="utf-8")
scene("photo_treatment_svg", TW, TH, TF + '<img class="ok-bg" src="/look/proof/_r/thumb.png">')
(SC / "photo_treatment_svg.html").write_text((SC / "photo_treatment_svg.html").read_text(encoding="utf-8").replace('class="ok"', 'class="ok ok--svgtreat"'), encoding="utf-8")

json.dump(scenes, open(SC / "scenes.json", "w"), indent=1)
r = subprocess.run(["node", str(B / "scripts" / "render_scenes.cjs"), str(SC / "scenes.json")], cwd=ROOT, env={**os.environ, "NODE_PATH": str(ROOT / "node_modules")}, capture_output=True, text=True)
print(r.stdout.strip(), r.stderr[-1500:])
rec = {x["out"].split("/")[-1][:-4]: x for x in json.load(open(SC / "scenes.receipts.json"))}

# ---------------- checks ----------------
check = {}
rd = lambda name: cv2.imread(str(R / f"{name}.png"))
for bid in (41911984, 41432513):
    e = G[bid]; out = {"source": {k: e[k] for k in ("radius_px", "tint_alpha", "backdrop_blur_sigma_px", "rim_dL", "edge_shadow_dL")}}
    cf = (260, 500) if bid == 41911984 else (1300, 1650)
    for var in ("rebuilt", "kit"):
        m = glass(rd(f"glass_panel_{bid}_{var}"), tuple(e["box_px"]), None, content_free=cf if var == "rebuilt" else None)
        out[var] = {k: m[k] for k in ("radius_px", "tint_alpha", "backdrop_blur_sigma_px", "rim_dL", "edge_shadow_dL")}
    check[f"glass_panel_{bid}"] = out
import ast
tree = ast.parse((B / "scripts" / "look_measure.py").read_text(encoding="utf-8"))
tree.body = [n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.Import, ast.ImportFrom))]
ns = {"__file__": str(B / "scripts" / "look_measure.py"), "L": B / "look"}; exec(compile(tree, "look_measure_fns", "exec"), ns)
pill, line_profile, outline_box, step_dots, band = ns["pill"], ns["line_profile"], ns["outline_box"], ns["step_dots"], ns["band"]
def keep(d, ks): return {k: d.get(k) for k in ks}
PK = ("h_px", "radius_over_h", "text_h_pct_pill_h", "pad_x_pct_pill_h", "fill_hex", "stroke_px")
check["pill_chip_27647159"] = {"source": keep(pm[1], PK), **{v: keep(pill(rd(f"pill_chip_27647159_{v}"), (35, 35, 330, 120), None), PK) for v in ("rebuilt", "kit")}}
check["pill_chip_11460382_outline"] = {"source": keep(pm[3], PK), **{v: keep(pill(rd(f"pill_chip_11460382_{v}"), (228, 335, 520, 470), None, outlined=True), PK) for v in ("rebuilt",)}}
check["leader_line_30940781"] = {"source": [keep(x, ("stroke_fwhm_px", "peak_L")) for x in ll["exemplars"] if x["block"] == 30940781],
                                 **{v: [keep(line_profile(rd(f"leader_line_30940781_{v}"), (96, 58), (468, 58)), ("stroke_fwhm_px", "peak_L")), keep(line_profile(rd(f"leader_line_30940781_{v}"), (219, 70), (219, 235)), ("stroke_fwhm_px", "peak_L"))] for v in ("rebuilt", "kit")}}
OBK = ("stroke_px", "text_h_px", "pad_x_px", "pad_y_px")
check["outline_box_30940781"] = {"source": keep(ob, OBK), **{v: keep(outline_box(rd(f"outline_box_30940781_{v}"), (110, 655, 564, 732), None, 564), OBK) for v in ("rebuilt", "kit")}}
SMK = ("n", "d_px", "pitch_px", "ring_stroke_px")
check["step_marks_34175362"] = {"source": keep(sm, SMK), **{v: keep(step_dots(rd(f"step_marks_34175362_{v}"), (40, 85, 1010, 165), None, 1080), SMK) for v in ("rebuilt", "kit")}}
for v in ("rebuilt", "kit"):
    a_ = rd(f"screen_frame_14664481_{v}"); Lc = lab(a_)[..., 0]; l_, t_, r2_, b_ = refine_rect(Lc, tuple(sf["box_px"]), win=30); rr, ee = corner_radius(Lc, l_, t_, 90, bottom=b_)
    check.setdefault("screen_frame_14664481", {"source": keep(sf, ("radius_px", "w_px", "aspect_w_h"))})[v] = {"radius_px": rr, "w_px": r2_ - l_, "aspect_w_h": round((r2_ - l_) / (b_ - t_), 3)}
BK = ("band_w_pct_w", "tint_alpha", "backdrop_blur_sigma_px")
check["glass_band_2145281"] = {"source": keep(e, BK) if False else keep(ms["glass_band"]["exemplars"][0], BK), **{v: keep(band(rd(f"glass_band_2145281_{v}"), xe, None), BK) for v in ("rebuilt", "kit")}}
# icon stroke: ring stroke width on the rendered play icon vs the source ring
def ring_stroke(a_, cx, cy, r):
    g_ = cv2.cvtColor(a_, cv2.COLOR_BGR2GRAY).astype(float); row = g_[int(cy) - 1:int(cy) + 2, int(cx - r - 8):int(cx - r + 8)].mean(0)
    base = float(np.median(np.r_[row[:3], row[-3:]])); pk = row.max(); return int(np.sum(row > base + (pk - base) / 2))  # FWHM, as for the leader lines
check["icon_outline_13607089"] = {"source": {"stroke_px": ring_stroke(img(13607089), 589, 1301, rbm["d_px"] / 2)}, "rebuilt": {"stroke_px": ring_stroke(rd("icon_outline_13607089_rebuilt"), 589, 1301, rbm["d_px"] / 2)},
                                  "kit": {"stroke_px": ring_stroke(rd("icon_outline_13607089_kit"), 589, 1301, 6 * 7.5 * 9 / 24), "note": "kit icon at its own 6 cqw size"}}
# grain calibration (treatment.py's estimator: 1.4826 * MAD of gray - Gaussian(1.5), 0..1, at 1080 px wide)
def grain_sigma(a_):
    g_ = cv2.cvtColor(a_, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255; hp = g_ - cv2.GaussianBlur(g_, (0, 0), 1.5); return float(1.4826 * np.median(np.abs(hp - np.median(hp))))
sig = [grain_sigma(rd(f"grain_cal_{int(o * 100)}")) for o in OPS]; target = D["grain"]["sigma"]
op = float(np.interp(target, sig, OPS)); check["grain"] = {"target_sigma": target, "opacity_vs_sigma": dict(zip(map(str, OPS), [round(s, 5) for s in sig])), "calibrated_opacity": round(op, 3)}
D["grain"]["overlay_opacity"] = round(op, 3); D["grain"]["cite"] += f"; overlay opacity {round(op, 3)} gives sigma {target} on a flat mid-tone (look/proof_check.json grain)"
json.dump(look, open(B / "kit" / "look.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
tk = (B / "kit" / "tokens.css").read_text(encoding="utf-8"); (B / "kit" / "tokens.css").write_text(re.sub(r"--ok-grain-opacity: [0-9.]+;", f"--ok-grain-opacity: {round(op, 3)};", tk), encoding="utf-8")
# treatment: CSS filter render vs the LUT applied in Python
sys.path.insert(0, str(B / "scripts"))
cube = np.loadtxt(B / "kit" / "treatment.cube", skiprows=3).reshape(33, 33, 33, 3)  # index [b][g][r]
def apply_cube(bgr):
    x = bgr[..., ::-1].astype(np.float32) / 255 * 32; i = np.clip(np.rint(x).astype(int), 0, 32); o = cube[i[..., 2], i[..., 1], i[..., 0]]; return (np.clip(o, 0, 1) * 255).astype(np.uint8)[..., ::-1]
lutimg = apply_cube(th); cv2.imwrite(str(R / "thumb_lut.png"), lutimg); cssimg = rd("photo_treatment_css")
svgimg = rd("photo_treatment_svg"); dE = float(np.median(np.linalg.norm(lab(cssimg) - lab(lutimg), axis=2))); dEs = float(np.median(np.linalg.norm(lab(svgimg) - lab(lutimg), axis=2)))
check["photo_treatment"] = {"thumb": thumb.name, "median_dE_css_vs_lut": round(dE, 2), "median_dE_svg_vs_lut": round(dEs, 2), "css_filter": D["photo_treatment"]["css_filter"]}
check["fonts_loaded"] = {k: v["fonts_loaded"] for k, v in rec.items() if v.get("text_on_page")}
check["render_errors"] = sum(len(v["errors"]) for v in rec.values())

# ---------------- compose proof boards ----------------
try: F = ImageFont.truetype("arial.ttf", 22); FB = ImageFont.truetype("arialbd.ttf", 24)
except OSError: F = FB = ImageFont.load_default()
def board(device, panels, note, out):
    th_ = 560; ims = []
    for title, im in panels:
        im = Image.fromarray(cv2.cvtColor(im, cv2.COLOR_BGR2RGB)); s = th_ / im.height; im = im.resize((max(1, int(im.width * s)), th_), Image.LANCZOS)
        if im.width > 900: im = im.resize((900, int(th_ * 900 / im.width)), Image.LANCZOS)
        ims.append((title, im))
    W_ = sum(i.width for _, i in ims) + 24 * (len(ims) + 1); H_ = th_ + 130
    cv = Image.new("RGB", (W_, H_), "#f2efed"); d = ImageDraw.Draw(cv); x = 24
    d.text((24, 16), device.upper(), font=FB, fill="#211b15")
    for title, i in ims: cv.paste(i, (x, 56)); d.text((x, 62 + th_), title, font=F, fill="#7d8075"); x += i.width + 24
    d.text((24, H_ - 34), note[:180], font=F, fill="#211b15"); cv.save(P / f"{out}.png")
def cut(a_, box): x0, y0, x1, y1 = box; return a_[max(0, y0):y1, max(0, x0):x1]
def fmt(c):
    if not isinstance(c, dict): return ""
    s_, rb_, k_ = c.get("source"), c.get("rebuilt"), c.get("kit")
    if isinstance(s_, dict): return "source " + json.dumps(s_)[:70] + " | rebuilt " + json.dumps(rb_)[:70]
    return ""
done = {}
for device, bid, box, stem in PROOFS:
    srcimg = cut(img(bid), box); pan = [(f"source · board {bid}", srcimg), ("rebuilt · exemplar values", cut(rd(f"{stem}_rebuilt"), box)), ("kit · look.json + palette", cut(rd(f"{stem}_kit"), box))]
    key = next((k for k in check if k.startswith(device) and str(bid) in k), None)
    out = device if device not in done else f"{device}_{bid}"; done[device] = 1
    board(device, pan, fmt(check.get(key)) if key else "", out)
gm = cv2.imread(str(R / "grain_cal_4.png")); flat = img(24946075)
board("grain", [("source · board 24946075 (flat patch)", cut(flat, (0, 0, 400, 400))), (f"kit · overlay at {round(op, 3)}", cut(cv2.imread(str(R / f'grain_cal_{int(OPS[int(np.argmin([abs(s - target) for s in sig]))] * 100)}.png')), (0, 0, 400, 400)))],
      f"target sigma {target}; calibrated opacity {round(op, 3)}", "grain")
board("photo_treatment", [("Instagram thumb", th), ("LUT (treatment.cube)", lutimg), ("SVG filter #ok-treat (browser)", svgimg), ("CSS fallback (browser)", cssimg)], f"median dE vs LUT: SVG filter {round(dEs, 2)}, CSS fallback {round(dE, 2)}", "photo_treatment")
json.dump(check, open(B / "look" / "proof_check.json", "w", encoding="utf-8"), indent=1, default=float)
print(json.dumps(check, indent=1, default=float)[:6000])
