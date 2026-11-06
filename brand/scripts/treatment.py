"""BRANDKIT Phase 4 (photography / image treatment): measure the board and the Instagram images, state the look as numbers.
Every image is resized to 1080 px wide (the post width) before measuring, so grain is comparable across sources.
Per image:
  grain      robust noise sigma of a high-pass (gray - Gaussian sigma 1.5), 1.4826 x MAD over flat pixels only
             (Sobel magnitude under its 40th percentile), in 0..1 units;
  contrast   L* p5 / p95 and RMS (std L* / 100);
  cast       mean a*, b* over mid-tones (30 < L* < 70);
  saturation median chroma C*;
  points     per-channel p1 (black point), p50, p99 (white point), 0..1;
  crop       aspect w/h and subject area % of frame (metrics/pixels.json images: w, h, subject_box).
'Photographic' subset (used for the look): images whose pixels.json text_area_pct <= 10 (or no text crops at all) (judgment call: more text than that and
the image is a layout, not a photograph). Board medians weight the 4 favourites x2 (as colour/board.json does).
LUT (Instagram look -> board look, per channel c):
  x' = clip((x - ig_p1_c) / (ig_p99_c - ig_p1_c));   y = lift_c + (gain_c - lift_c) * x' ** (1 / gamma_c)
  lift_c = board p1_c, gain_c = board p99_c, gamma_c chosen so the Instagram median maps to the board median;
  saturation multiplier = board median C* / Instagram median C*; grain to add = sqrt(max(0, board^2 - ig^2)).
-> colour/treatment.json, fig/treatment_*.png. Run with brand-venv python -I."""
import json, pathlib, sys, math
import numpy as np, cv2
from PIL import Image, ImageSequence
from skimage.color import rgb2lab
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt

sys.stdout.reconfigure(encoding="utf-8")
B = pathlib.Path(__file__).resolve().parents[1]; FIG = B / "fig"
blocks = {str(b["id"]): b for b in json.load(open(B / "board" / "blocks.json", encoding="utf-8"))}
PIX = json.load(open(B / "metrics" / "pixels.json", encoding="utf-8"))["images"]
FAV = {"7529470", "14664481", "41911984", "2145281"}

def load(src, iid):
    p = B / "board" / blocks[iid]["file"] if src == "board" else B / "existing" / "thumbs" / f"{iid}.jpg"
    im = Image.open(p)
    if getattr(im, "is_animated", False): im = next(ImageSequence.Iterator(im))
    im = im.convert("RGB"); w, h = im.size; im = im.resize((1080, max(1, round(h * 1080 / w))), Image.LANCZOS)
    return np.asarray(im).astype(np.float32) / 255

def measure(rgb):
    g = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    hp = g - cv2.GaussianBlur(g, (0, 0), 1.5)
    mag = np.hypot(cv2.Sobel(g, cv2.CV_32F, 1, 0), cv2.Sobel(g, cv2.CV_32F, 0, 1))
    flat = hp[mag < np.percentile(mag, 40)]
    grain = float(1.4826 * np.median(np.abs(flat - np.median(flat))))
    small = cv2.resize(rgb, (360, max(1, round(rgb.shape[0] * 360 / rgb.shape[1]))), interpolation=cv2.INTER_AREA)
    lab = rgb2lab(small).reshape(-1, 3); L = lab[:, 0]; mid = (L > 30) & (L < 70)
    q = lambda a, p: float(np.percentile(a, p))
    return {"grain": round(grain, 5), "L_p5": round(q(L, 5), 1), "L_p95": round(q(L, 95), 1), "rms": round(float(L.std() / 100), 3),
            "a_mid": round(float(lab[mid, 1].mean()), 2) if mid.any() else None, "b_mid": round(float(lab[mid, 2].mean()), 2) if mid.any() else None,
            "chroma": round(float(np.median(np.hypot(lab[:, 1], lab[:, 2]))), 2),
            "p1": [round(q(small[..., c], 1), 4) for c in range(3)], "p50": [round(q(small[..., c], 50), 4) for c in range(3)],
            "p99": [round(q(small[..., c], 99), 4) for c in range(3)]}

# every board image with a file and every Instagram thumbnail; pixels.json only lists images that carry text crops,
# so an image absent from it has no text (text_area_pct 0) and no subject_box / aspect from there (aspect read from the file)
ITEMS = [("board", k) for k, b in blocks.items() if b.get("file")] + [("instagram", p.stem) for p in sorted((B / "existing" / "thumbs").glob("*.jpg"))]
rows = []
for src, iid in ITEMS:
    key = f"{src}:{iid}"
    im = PIX.get(key)
    if im is None:
        p_ = B / "board" / blocks[iid]["file"] if src == "board" else B / "existing" / "thumbs" / f"{iid}.jpg"
        w_, h_ = Image.open(p_).size
        im = {"source": src, "image": iid, "w": w_, "h": h_, "aspect": round(w_ / h_, 3), "text_area_pct": 0.0}
    try: m = measure(load(src, iid))
    except Exception as e: print("skip", key, e); continue
    x0, y0, x1, y1 = im["subject_box"] if im.get("subject_box") else (0, 0, 0, 0)
    rows.append({"key": key, "source": src, "image": iid, "favourite": iid in FAV, "aspect": im["aspect"],
                 "subject_pct": round(100 * (x1 - x0) * (y1 - y0) / (im["w"] * im["h"]), 1) if im.get("subject_box") else None,
                 "subject_by": im.get("subject_by"), "text_area_pct": im.get("text_area_pct"),
                 "photo": (im.get("text_area_pct") or 0) <= 10, **m})

def wmed(vals, ws):
    o = np.argsort(vals); v = np.array(vals)[o]; w = np.array(ws, float)[o]; c = np.cumsum(w)
    return float(v[np.searchsorted(c, c[-1] / 2)])
def stat(src, k, photo=True, ch=None):
    sel = [r for r in rows if r["source"] == src and (r["photo"] or not photo) and (r[k] is not None)]
    vals = [r[k][ch] if ch is not None else r[k] for r in sel]; ws = [2 if r["favourite"] else 1 for r in sel] if src == "board" else [1] * len(sel)
    return round(wmed(vals, ws), 4), len(sel)

S = {}
for src in ("board", "instagram"):
    S[src] = {k: stat(src, k)[0] for k in ("grain", "L_p5", "L_p95", "rms", "a_mid", "b_mid", "chroma", "aspect", "subject_pct")}
    S[src].update({f"{k}_{c}": stat(src, k, ch=i)[0] for k in ("p1", "p50", "p99") for i, c in enumerate("rgb")})
    S[src]["n_photo"] = stat(src, "grain")[1]; S[src]["n_all"] = sum(r["source"] == src for r in rows)
    S[src]["aspect_counts"] = {}
    for r in rows:
        if r["source"] == src:
            a = r["aspect"]; lab_ = "9:16" if a < 0.6 else "4:5-ish (0.6-0.9)" if a < 0.9 else "1:1 (0.9-1.1)" if a <= 1.1 else "landscape"
            S[src]["aspect_counts"][lab_] = S[src]["aspect_counts"].get(lab_, 0) + 1
bd, ig = S["board"], S["instagram"]
lut = {}
for c in "rgb":
    lift, gain = bd[f"p1_{c}"], bd[f"p99_{c}"]
    xm = (ig[f"p50_{c}"] - ig[f"p1_{c}"]) / (ig[f"p99_{c}"] - ig[f"p1_{c}"])
    r = (bd[f"p50_{c}"] - lift) / (gain - lift)
    lut[c] = {"in_black": ig[f"p1_{c}"], "in_white": ig[f"p99_{c}"], "lift": lift, "gain": gain, "gamma": round(math.log(xm) / math.log(r), 3)}
treat = {"method": __doc__.split("LUT")[0].strip(), "lut_formula": "x' = clip((x - in_black) / (in_white - in_black)); y = lift + (gain - lift) * x' ** (1 / gamma)",
         "board": bd, "instagram": ig,
         "lut": lut, "saturation_multiplier": round(bd["chroma"] / ig["chroma"], 3),
         "grain_add_sigma": round(math.sqrt(max(0.0, bd["grain"] ** 2 - ig["grain"] ** 2)), 5),
         "cast_shift_lab": {"a": round(bd["a_mid"] - ig["a_mid"], 2), "b": round(bd["b_mid"] - ig["b_mid"], 2)},
         "crop": {"board_aspect_median": bd["aspect"], "instagram_aspect_median": ig["aspect"], "board_subject_pct": bd["subject_pct"], "instagram_subject_pct": ig["subject_pct"],
                  "board_aspects": bd["aspect_counts"], "instagram_aspects": ig["aspect_counts"]},
         "per_image": rows}
json.dump(treat, open(B / "colour" / "treatment.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)

# plates, one claim each
COL = {"board": "#505f53", "instagram": "#bf8662"}
def dist(fname, key, title, xlabel, ch=None):
    fig, ax = plt.subplots(figsize=(9, 3.6))
    for k, src in enumerate(("board", "instagram")):
        v = [r[key][ch] if ch is not None else r[key] for r in rows if r["source"] == src and r["photo"] and r[key] is not None]
        ax.scatter(v, np.full(len(v), k) + np.random.default_rng(0).uniform(-0.15, 0.15, len(v)), s=14, color=COL[src], alpha=0.75)
        m = S[src][key]; ax.plot([m, m], [k - 0.3, k + 0.3], color="#211b15", lw=2); ax.text(m, k + 0.36, f"median {m}", fontsize=8, family="monospace", ha="center")
    ax.set_yticks([0, 1], [f"board (n={bd['n_photo']})", f"instagram (n={ig['n_photo']})"]); ax.set_ylim(-0.6, 1.8); ax.set_xlabel(xlabel, family="monospace")
    ax.set_title(title, family="monospace", fontsize=10, loc="left"); ax.spines[["top", "right"]].set_visible(False)
    fig.savefig(FIG / fname, dpi=160, bbox_inches="tight"); plt.close(fig)
dist("treatment_grain.png", "grain", f"GRAIN — board photos carry {'more' if bd['grain'] > ig['grain'] else 'less'} noise than the feed (flat-area high-pass sigma)", "noise sigma (0..1)")
dist("treatment_contrast.png", "rms", f"CONTRAST — RMS luminance contrast, board {bd['rms']} vs feed {ig['rms']}", "std L* / 100")
dist("treatment_saturation.png", "chroma", f"SATURATION — median chroma, board {bd['chroma']} vs feed {ig['chroma']} (x{treat['saturation_multiplier']})", "median C*")
fig, ax = plt.subplots(figsize=(5.5, 5))
for src in ("board", "instagram"):
    sel = [r for r in rows if r["source"] == src and r["photo"] and r["a_mid"] is not None]
    ax.scatter([r["a_mid"] for r in sel], [r["b_mid"] for r in sel], s=16, color=COL[src], alpha=0.7, label=src)
    ax.scatter([S[src]["a_mid"]], [S[src]["b_mid"]], s=120, color=COL[src], edgecolor="#211b15", marker="X")
ax.axhline(0, color="#999", lw=0.5); ax.axvline(0, color="#999", lw=0.5); ax.set_xlabel("a* (green - / red +)", family="monospace"); ax.set_ylabel("b* (blue - / yellow +)", family="monospace")
ax.legend(); ax.set_title(f"CAST — mid-tones: board a*{bd['a_mid']:+.1f} b*{bd['b_mid']:+.1f}, feed a*{ig['a_mid']:+.1f} b*{ig['b_mid']:+.1f}", family="monospace", fontsize=9, loc="left")
fig.savefig(FIG / "treatment_cast.png", dpi=160, bbox_inches="tight"); plt.close(fig)
fig, ax = plt.subplots(figsize=(5.5, 5)); x = np.linspace(0, 1, 256)
for c, col in zip("rgb", ("#c33", "#3a3", "#33c")):
    l = lut[c]; xp = np.clip((x - l["in_black"]) / (l["in_white"] - l["in_black"]), 0, 1); y = l["lift"] + (l["gain"] - l["lift"]) * xp ** (1 / l["gamma"])
    ax.plot(x, y, color=col, lw=1.6, label=f"{c}: lift {l['lift']:.3f} gamma {l['gamma']} gain {l['gain']:.3f}")
ax.plot([0, 1], [0, 1], color="#999", lw=0.5, ls="--"); ax.set_xlabel("input (feed)", family="monospace"); ax.set_ylabel("output (board look)", family="monospace")
ax.legend(fontsize=7); ax.set_title("CURVE — the LUT that moves the feed's levels onto the board's", family="monospace", fontsize=9, loc="left")
fig.savefig(FIG / "treatment_curve.png", dpi=160, bbox_inches="tight"); plt.close(fig)
fig, axs = plt.subplots(1, 2, figsize=(10, 3.8))
for k, src in enumerate(("board", "instagram")):
    cnt = S[src]["aspect_counts"]; axs[0].barh([f"{src} {a}" for a in cnt], list(cnt.values()), color=COL[src])
    v = [r["subject_pct"] for r in rows if r["source"] == src and r["subject_pct"] is not None]
    axs[1].hist(v, bins=np.arange(0, 105, 10), alpha=0.6, color=COL[src], label=f"{src} median {S[src]['subject_pct']}%")
axs[0].set_title("CROP — aspect ratios (all images)", family="monospace", fontsize=9, loc="left"); axs[1].set_title("subject area, % of frame", family="monospace", fontsize=9, loc="left")
axs[1].legend(fontsize=8); [a.spines[["top", "right"]].set_visible(False) for a in axs]
fig.savefig(FIG / "treatment_crop.png", dpi=160, bbox_inches="tight"); plt.close(fig)
print(json.dumps({k: v for k, v in treat.items() if k not in ("per_image", "method", "board", "instagram")}, indent=1))
print("board", {k: bd[k] for k in ("grain", "L_p5", "L_p95", "rms", "a_mid", "b_mid", "chroma", "n_photo", "n_all")})
print("ig", {k: ig[k] for k in ("grain", "L_p5", "L_p95", "rms", "a_mid", "b_mid", "chroma", "n_photo", "n_all")})
