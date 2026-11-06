"""BUILDER Phase F: Lottie JSON versions of the video kit elements, from kit/tokens.json (colours, sizes, motion durations/easings,
video.fps, caption band). For After Effects (Bodymovin import), Premiere via AE, and the web (lottie-web).
Glass in Lottie is the surface tint at the measured alpha only: Lottie has no backdrop blur, so VIDEO.md says to blur the footage
under the shape in the editor (DECISIONS 58). Text layers name the Adobe font (Neue Haas Grotesk Display); the host must have it.
-> kit/video/lottie/*.json. brand-venv python -I."""
import json, pathlib
B = pathlib.Path(__file__).resolve().parents[1]; T = json.load(open(B / "kit" / "tokens.json", encoding="utf-8")); OUT = B / "kit" / "video" / "lottie"; OUT.mkdir(parents=True, exist_ok=True)
W, H = 1080, 1920; FPS = T["video"]["fps"]["$value"]
px = lambda t: float(str(t["$value"]).replace("px", ""))
ms = lambda k: float(T["motion"]["duration"][k]["$value"].replace("ms", "")) / 1000
ez = lambda k: T["motion"]["easing"][k]["$value"]
rgb = lambda k: [round(int(T["color"][k]["$value"][i:i + 2], 16) / 255, 4) for i in (1, 3, 5)]
F = lambda s: round(s * FPS)
MARGIN = px(T["dimension"]["margin"]); SAFE_T = px(T["dimension"]["safe-top-9x16"]); SAFE_B = px(T["dimension"]["safe-bottom-9x16"])
GR = px(T["radius"]["glass"]); GA = T["opacity"]["glass"]["$value"] * 100; RISE = 1.2 * W / 100
TY = T["typography"]["9x16"]; size = lambda r: float(TY[r]["$value"]["fontSize"][:-2]); track = lambda r: round(float(TY[r]["$value"]["letterSpacing"][:-2]) * 1000)
FONTS = {"list": [{"fName": "NeueHaasGroteskDisp-Medium", "fFamily": "neue-haas-grotesk-display", "fStyle": "Medium", "fWeight": "600", "ascent": 72},
                  {"fName": "NeueHaasGroteskDisp-Roman", "fFamily": "neue-haas-grotesk-display", "fStyle": "Roman", "fWeight": "500", "ascent": 72}]}

def kf(frames_vals, ease="out"):
    """[(frame, value)] -> animated property with cubic-bezier easing between keys"""
    x1, y1, x2, y2 = ez(ease); ks = []
    for (f, v), nxt in zip(frames_vals, frames_vals[1:] + [None]):
        k = {"t": f, "s": v if isinstance(v, list) else [v]}
        if nxt: k.update({"o": {"x": [x1], "y": [y1]}, "i": {"x": [x2], "y": [y2]}})
        ks.append(k)
    return {"a": 1, "k": ks}
st = lambda v: {"a": 0, "k": v}
def tr(p=None, o=None, s=None, a=(0, 0)):
    return {"o": o or st(100), "r": st(0), "p": p or st([0, 0, 0]), "a": st([a[0], a[1], 0]), "s": s or st([100, 100, 100])}
def rect(w, h, r, color, alpha=100, x=0, y=0):
    return {"ty": "gr", "nm": "box", "it": [{"ty": "rc", "nm": "r", "d": 1, "s": st([w, h]), "p": st([x + w / 2, y + h / 2]), "r": st(r)},
                                             {"ty": "fl", "nm": "fill", "c": st(color + [1]), "o": st(alpha), "r": 1},
                                             {"ty": "tr", "p": st([0, 0]), "a": st([0, 0]), "s": st([100, 100]), "r": st(0), "o": st(100)}]}
def shape_layer(nm, shapes, ks, ip, op, ind):
    return {"ddd": 0, "ind": ind, "ty": 4, "nm": nm, "ln": nm, "sr": 1, "ks": ks, "ao": 0, "shapes": shapes, "ip": ip, "op": op, "st": 0, "bm": 0}
def text_layer(nm, text, font, sz, color, x, y, ks_extra, ip, op, ind, tracking=0, lh=None, caps=False):
    doc = {"s": sz, "f": font, "t": text.upper() if caps else text, "j": 0, "tr": tracking, "lh": lh or sz * 1.1, "ls": 0, "fc": color}
    ks = tr(**ks_extra); ks["p"] = ks.get("p") if ks_extra.get("p") else st([x, y, 0])
    return {"ddd": 0, "ind": ind, "ty": 5, "nm": nm, "ln": nm, "sr": 1, "ks": ks, "ao": 0, "t": {"d": {"k": [{"s": doc, "t": 0}]}, "p": {}, "m": {"g": 1, "a": st([0, 0])}, "a": []},
            "ip": ip, "op": op, "st": 0, "bm": 0}
def comp(nm, dur, layers):
    return {"v": "5.12.2", "fr": FPS, "ip": 0, "op": F(dur), "w": W, "h": H, "nm": nm, "ddd": 0, "assets": [], "fonts": FONTS, "layers": layers,
            "meta": {"g": "brand/scripts/video_lottie.py from brand/kit/tokens.json"}}
def enter_exit(t_in, t_out, y0, rise=True):
    """opacity + position keyframes: fade-rise in (enter, ease out), fade out (exit, ease in)"""
    o = kf([(F(t_in), 0), (F(t_in + ms("enter")), 100)], "out"); o["k"][-1]["o"] = {"x": [ez("in")[0]], "y": [ez("in")[1]]}; o["k"][-1]["i"] = {"x": [ez("in")[2]], "y": [ez("in")[3]]}
    o["k"].insert(len(o["k"]), {"t": F(t_out), "s": [100], "o": {"x": [ez("in")[0]], "y": [ez("in")[1]]}, "i": {"x": [ez("in")[2]], "y": [ez("in")[3]]}}); o["k"].append({"t": F(t_out + ms("exit")), "s": [0]})
    p = kf([(F(t_in), [0, RISE if rise else 0, 0]), (F(t_in + ms("enter")), [0, 0, 0])], "out")
    return {"o": o, "p": p}

out = {}
# lower third: glass box + name + role, enters at 0.2 s, holds, exits
d = 0.2 + ms("enter") + ms("hold-min") + 0.6 + ms("exit"); ee = enter_exit(0.2, d - ms("exit"), 0)
bw, bh = 720, 150; bx, by = MARGIN, T["video"]["caption-band-top"]["$value"] * H - 0.02 * W - bh  # directly above the caption band (DECISIONS 57)
out["lower-third"] = comp("lower-third", d, [
    text_layer("name", "Dr. Ariel Ostad", "NeueHaasGroteskDisp-Medium", size("caption"), rgb("text"), bx + 36, by + 62, {"o": ee["o"]}, 0, F(d), 1, track("headline")),
    text_layer("role", "Triple board-certified dermatologist", "NeueHaasGroteskDisp-Roman", size("label") * 0.82, rgb("text"), bx + 36, by + 112, {"o": ee["o"]}, 0, F(d), 2, track("label"), caps=True),
    shape_layer("glass", [rect(bw, bh, GR, rgb("surface"), GA, bx, by)], tr(o=ee["o"], p=ee["p"]), 0, F(d), 3)])
# caption: one line, box top on the feed band, cut on / cut off (motion rule 7)
d = 0.1 + ms("hold-min") + 0.5; top = T["video"]["caption-band-top"]["$value"] * H
cut = {"a": 1, "k": [{"t": 0, "s": [0], "h": 1}, {"t": F(0.1), "s": [100], "h": 1}, {"t": F(d) - 1, "s": [0], "h": 1}]}
out["caption"] = comp("caption", d, [
    text_layer("text", "Sessions take about twenty minutes.", "NeueHaasGroteskDisp-Roman", size("caption"), rgb("text"), MARGIN + 36, top + 66, {"o": cut}, 0, F(d), 1, track("caption")),
    shape_layer("glass", [rect(0.357 * W + 0.068 * W + 160, 100, GR, rgb("surface"), GA, MARGIN, top)], tr(o=cut), 0, F(d), 2)])
# chip: pill (radius = h/2) at the top of the safe area, scale-in 94 -> 100%
d = 0.2 + ms("enter") + ms("hold-min") + ms("exit"); ee = enter_exit(0.2, d - ms("exit"), 0, rise=False)
ph = size("label") * float(T["dimension"]["pill-height"]["$value"][:-2]); pw = 200
sc = kf([(F(0.2), [94, 94, 100]), (F(0.2 + ms("enter")), [100, 100, 100])], "out")
out["chip"] = comp("chip", d, [
    text_layer("label", "+ Ellacor", "NeueHaasGroteskDisp-Roman", size("label"), rgb("text"), MARGIN + ph * 0.42, SAFE_T + 0.02 * W + ph * 0.66, {"o": ee["o"]}, 0, F(d), 1, track("label")),
    shape_layer("pill", [rect(pw, ph, ph / 2, rgb("surface"), GA, MARGIN, SAFE_T + 0.02 * W)], tr(o=ee["o"], s=sc, a=(MARGIN, SAFE_T), p=st([MARGIN, SAFE_T, 0])), 0, F(d), 2)])
# reveal: headline fade-rise (enter-slow)
d = 3.0; o = kf([(F(0.2), 0), (F(0.2 + ms("enter-slow")), 100)], "out"); o["k"][-1].update({"o": {"x": [ez("in")[0]], "y": [ez("in")[1]]}, "i": {"x": [ez("in")[2]], "y": [ez("in")[3]]}})
o["k"].append({"t": F(d - ms("exit")), "s": [100], "o": {"x": [ez("in")[0]], "y": [ez("in")[1]]}, "i": {"x": [ez("in")[2]], "y": [ez("in")[3]]}}); o["k"].append({"t": F(d), "s": [0]})
p = kf([(F(0.2), [MARGIN, 0.38 * H + size("headline") + RISE, 0]), (F(0.2 + ms("enter-slow")), [MARGIN, 0.38 * H + size("headline"), 0])], "out")
out["reveal-fade-rise"] = comp("reveal-fade-rise", d, [text_layer("headline", "Natural results come\rfrom restraint.", "NeueHaasGroteskDisp-Medium", size("headline"), rgb("background"), 0, 0, {"o": o, "p": p}, 0, F(d), 1, track("headline"), lh=size("headline") * float(TY["headline"]["$value"]["lineHeight"]))])
# transitions: glass wipe (band sweeps up, in-out) and dip to paper
d = 1.0; wp = kf([(0, [0, H, 0]), (F(d), [0, -H, 0])], "in-out")
out["transition-glass-wipe"] = comp("transition-glass-wipe", d, [shape_layer("band", [rect(W, H, 0, rgb("surface"), T["opacity"]["band"]["$value"] * 100)], tr(p=wp), 0, F(d), 1)])
dp = kf([(0, 0), (F(d / 2), 100), (F(d), 0)], "in-out")
out["transition-dip-paper"] = comp("transition-dip-paper", d, [shape_layer("paper", [rect(W, H, 0, rgb("background"))], tr(o=dp), 0, F(d), 1)])
for k, v in out.items(): json.dump(v, open(OUT / f"{k}.json", "w", encoding="utf-8"), separators=(",", ":"))
print(len(out), "lottie files at", FPS, "fps:", ", ".join(out))
