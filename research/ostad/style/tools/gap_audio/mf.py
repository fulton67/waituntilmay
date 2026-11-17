import json, sys, numpy as np, soundfile as sf, librosa
sys.stdout.reconfigure(encoding="utf-8")
D, REPO = sys.argv[1], sys.argv[2]; FPS = 24
o = json.load(open(f"{D}/audio_measure.json"))
x, sr = sf.read(f"{D}/v6.wav"); x = x.mean(1)
T = {}
for nm in ["card", "swish", "pop", "yes", "no"]:
    w, s2 = sf.read(f"{REPO}/brand/remotion/public/sfx/{nm}.wav"); w = w.mean(1) if w.ndim > 1 else w
    T[nm] = librosa.resample(w, orig_sr=s2, target_sr=sr)
def est(i, s):
    # least-squares gain of template s in x at the best lag within +-3 f
    best = (0, 0)
    for lag in range(-int(3/FPS*sr), int(3/FPS*sr), 8):
        seg = x[i+lag:i+lag+len(s)]
        if len(seg) < len(s) or i+lag < 0: continue
        c = np.dot(seg, s) / np.sqrt(np.dot(seg, seg)*np.dot(s, s) + 1e-12)
        if c > best[0]: best = (c, lag)
    c, lag = best; seg = x[i+lag:i+lag+len(s)]
    return round(float(c), 3), round(lag/sr*FPS, 2), round(float(np.dot(seg, s)/np.dot(s, s)), 3)
rng = np.random.default_rng(1)
res = []
for s in o["v6_sfx"]["schedule"]:
    i = int(s["f"]/FPS*sr); c, lag, g = est(i, T[s["sfx"]])
    ctrl = [est(int(rng.uniform(1, 88)*sr), T[s["sfx"]])[0] for _ in range(6)]
    s["mf_corr"], s["mf_lag_f"], s["mf_gain"], s["mf_ctrl_corr_max"] = c, lag, g, round(max(ctrl), 3)
    res.append((s["hero"], c, max(ctrl)))
    print(s["beat"], s["f"], s["sfx"], "H" if s["hero"] else "-", "gain", s["gain"], "corr", c, "lag", lag, "ls_gain", g, "ctrl", round(max(ctrl),3))
H = [r for r in res if r[0]]; N = [r for r in res if not r[0]]
for lab, R in (("hero", H), ("nonhero", N)):
    print(lab, "median corr", np.median([r[1] for r in R]), "share corr > ctrl max", np.mean([r[1] > r[2] for r in R]))
    o["v6_sfx"][f"{lab}_mf_corr_median"] = float(np.median([r[1] for r in R]))
    o["v6_sfx"][f"{lab}_mf_present_share"] = float(np.mean([r[1] > r[2] for r in R]))
json.dump(o, open(f"{D}/audio_measure.json", "w"), indent=1)
