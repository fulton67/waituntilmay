import json, re, sys, os
import numpy as np, soundfile as sf, librosa, pyloudnorm as pyln
from scipy.signal import butter, sosfiltfilt

D = os.path.dirname(os.path.abspath(__file__))
REPO = sys.argv[1]
FPS = 24
out = {}

def ebur_series(p):
    t = M = S = None; rows = []
    cur = {}
    for line in open(p):
        m = re.match(r"frame:\d+\s+pts:\d+\s+pts_time:([\d.]+)", line)
        if m:
            if cur: rows.append(cur)
            cur = {"t": float(m.group(1))}
            continue
        m = re.match(r"lavfi\.r128\.(M|S|true_peak)=(-?[\d.]+)", line)
        if m: cur[m.group(1)] = float(m.group(2))
    rows.append(cur)
    return rows

def stl(rows):
    t = np.array([r["t"] for r in rows]); S = np.array([r.get("S", -120) for r in rows]); M = np.array([r.get("M", -120) for r in rows])
    tp = np.array([r.get("true_peak", 0) for r in rows])
    return t, S, M, tp

def band(y, sr, lo, hi):
    return sosfiltfilt(butter(4, [lo, hi], btype="band", fs=sr, output="sos"), y)

def lufs(y, sr):
    m = pyln.Meter(sr)
    v = m.integrated_loudness(y if y.ndim > 1 else y[:, None])
    return round(float(v), 2)

def voice_vs_bed(name):
    v, sr = sf.read(f"{D}/sep/htdemucs/{name}/vocals.wav"); b, _ = sf.read(f"{D}/sep/htdemucs/{name}/no_vocals.wav")
    r = {"voice_lufs": lufs(v, sr), "bed_lufs": lufs(b, sr)}
    r["voice_minus_bed_lu"] = round(r["voice_lufs"] - r["bed_lufs"], 2)
    vm, bm = v.mean(1), b.mean(1)
    vb, bb = band(vm, sr, 300, 3400), band(bm, sr, 300, 3400)
    w = int(0.4 * sr); n = len(vm) // w
    ev = 10 * np.log10(np.mean(vb[: n * w].reshape(n, w) ** 2, 1) + 1e-12)
    eb = 10 * np.log10(np.mean(bb[: n * w].reshape(n, w) ** 2, 1) + 1e-12)
    speech = ev > ev.max() - 30
    snr = ev[speech] - eb[speech]
    r["voiceband_snr_db_median"] = round(float(np.median(snr)), 1)
    r["voiceband_snr_db_p5"] = round(float(np.percentile(snr, 5)), 1)
    r["voiceband_snr_db_min"] = round(float(snr.min()), 1)
    r["windows_400ms_snr_below_10db"] = int((snr < 10).sum())
    r["speech_windows"] = int(speech.sum())
    return r, bm, sr

for name in ["v6", "ro5"]:
    rows = ebur_series(f"{D}/{name}.ebur.txt")
    t, S, M, tp = stl(rows)
    act = S > -40
    out[name] = {"short_term_lufs": {"median": round(float(np.median(S[act])), 2), "p10": round(float(np.percentile(S[act], 10)), 2),
                                      "p95": round(float(np.percentile(S[act], 95)), 2), "max": round(float(S[act].max()), 2),
                                      "range_p95_minus_p10": round(float(np.percentile(S[act], 95) - np.percentile(S[act], 10)), 2)},
                 "momentary_max": round(float(M.max()), 2)}
    vb, bed, sr = voice_vs_bed(name)
    out[name]["voice_vs_bed"] = vb
    # onsets on the non-voice stem (M19)
    y = librosa.resample(bed, orig_sr=sr, target_sr=22050)
    env = librosa.onset.onset_strength(y=y, sr=22050)
    on = librosa.onset.onset_detect(onset_envelope=env, sr=22050, backtrack=True, units="frames")
    out[name]["_onsets"] = (librosa.frames_to_time(on, sr=22050) * FPS).tolist()
    out[name]["_strength"] = env[on].tolist()
    out[name]["bed_onsets_per_min"] = round(len(on) / (len(y) / 22050 / 60), 1)

# ---------------------------------------------------------------- v6 SFX schedule vs graphics
B = json.load(open(f"{REPO}/research/ostad/style/exomind/beats.json"))
sched = []
for b in B["beats"]:
    for at, nm in b["sfx"]:
        hero = bool(b.get("sfx_hero")) and b["sfx_hero"][0] == at and b["sfx_hero"][1] == nm
        sched.append({"beat": b["id"], "f": at, "sfx": nm, "hero": hero, "gain": 0.2 if hero else 0.05})
events = []
for b in B["beats"]:
    for e in b["events"]:
        if e["word"] in ("(hold)",) or "holds" in e["what"][:12]:
            continue
        events.append({"beat": b["id"], "f": e["f"], "what": e["what"]})
for c in B["cards"]:
    events.append({"beat": c.get("beat", "END"), "f": c["start_f"], "what": f"{c['kind']} card {c.get('title', '')}"})
events.sort(key=lambda e: e["f"])
on = np.array(out["v6"]["_onsets"]); st = np.array(out["v6"]["_strength"])

def near(f, tol):
    if not len(on): return None
    j = int(np.argmin(np.abs(on - f)))
    return (round(float(on[j] - f), 1), round(float(st[j]), 2)) if abs(on[j] - f) <= tol else None

# exact SFX stem rebuilt from the schedule (same wavs, same linear gains as OstadYT6 <Audio volume>)
v, sr = sf.read(f"{D}/sep/htdemucs/v6/vocals.wav"); vm = v.mean(1)
sfxw = {}
for nm in ["card", "swish", "pop", "yes", "no"]:
    w, s2 = sf.read(f"{REPO}/brand/remotion/public/sfx/{nm}.wav")
    if w.ndim > 1: w = w.mean(1)
    w = librosa.resample(w, orig_sr=s2, target_sr=sr)
    S_ = np.abs(librosa.stft(w, n_fft=1024)); cen = librosa.feature.spectral_centroid(S=S_, sr=sr).mean()
    sfxw[nm] = w
    out.setdefault("sfx_files", {})[nm] = {"dur_s": round(len(w) / sr, 3), "peak_dbfs": round(20 * np.log10(np.abs(w).max()), 1),
                                            "centroid_hz": int(cen)}
for s in sched:
    t0 = int(s["f"] / FPS * sr); w = sfxw[s["sfx"]] * s["gain"]
    seg = vm[t0: t0 + len(w)]
    pk_s = 20 * np.log10(np.abs(w).max() + 1e-12)
    rms_s = 20 * np.log10(np.sqrt(np.mean(w ** 2)) + 1e-12)
    rms_v = 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-12)
    s["sfx_peak_dbfs"] = round(pk_s, 1); s["sfx_minus_voice_rms_db"] = round(rms_s - rms_v, 1)
    n = near(s["f"], 2); s["onset_within_2f"] = n is not None; s["onset"] = n
    s["onset_within_0.5s"] = near(s["f"], 12)
    s["event"] = next((e["what"][:90] for e in events if abs(e["f"] - s["f"]) <= 2 and e["beat"] == s["beat"]), None)
sfx_f = np.array([s["f"] for s in sched])
for e in events:
    e["sfx_within_2f"] = bool(np.any(np.abs(sfx_f - e["f"]) <= 2))
    e["onset_within_2f"] = near(e["f"], 2) is not None
rng = np.random.default_rng(0); rf = rng.uniform(0, B["duration_f"], 5000)
chance2 = float(np.mean([np.min(np.abs(on - f)) <= 2 for f in rf]))
H = [s for s in sched if s["hero"]]; NH = [s for s in sched if not s["hero"]]
out["v6_sfx"] = {
    "scheduled": len(sched), "hero": len(H), "non_hero": len(NH),
    "by_type": {k: sum(s["sfx"] == k for s in sched) for k in ["card", "swish", "pop", "yes", "no"]},
    "scheduled_detected_within_2f": round(np.mean([s["onset_within_2f"] for s in sched]), 3),
    "hero_detected_within_2f": round(np.mean([s["onset_within_2f"] for s in H]), 3),
    "nonhero_detected_within_2f": round(np.mean([s["onset_within_2f"] for s in NH]), 3),
    "hero_sfx_minus_voice_db_median": float(np.median([s["sfx_minus_voice_rms_db"] for s in H])),
    "nonhero_sfx_minus_voice_db_median": float(np.median([s["sfx_minus_voice_rms_db"] for s in NH])),
    "graphic_entries": len(events),
    "entries_with_scheduled_sfx_within_2f": round(np.mean([e["sfx_within_2f"] for e in events]), 3),
    "entries_with_bed_onset_within_2f": round(np.mean([e["onset_within_2f"] for e in events]), 3),
    "chance_onset_within_2f": round(chance2, 3),
    "entries_without_sfx": [(e["beat"], e["f"], e["what"][:80]) for e in events if not e["sfx_within_2f"]],
    "schedule": sched,
}

# ---------------------------------------------------------------- cuts: dropouts, level jumps, clicks
mix, sr = sf.read(f"{D}/v6.wav"); mm = mix.mean(1)
hp = sosfiltfilt(butter(4, 6000, btype="high", fs=sr, output="sos"), mm)
d = np.abs(hp)
def rmsdb(a): return 20 * np.log10(np.sqrt(np.mean(a ** 2)) + 1e-12)
# global click candidates: 1 ms HF peaks > 12x the 200 ms local median HF level
blk = int(0.001 * sr); nb = len(d) // blk
pk = d[: nb * blk].reshape(nb, blk).max(1)
from scipy.ndimage import median_filter
loc = median_filter(pk, size=201)
ratio = pk / (loc + 1e-9)
cand = np.where((ratio > 12) & (pk > 10 ** (-50 / 20)))[0]
clicks = []
for c in cand:
    if clicks and c - clicks[-1][0] < 50: continue
    clicks.append((int(c), round(float(c / 1000 * FPS), 1), round(float(ratio[c]), 1), round(20 * np.log10(pk[c]), 1)))
out["v6_clicks_hf"] = clicks
rows = ebur_series(f"{D}/v6.ebur.txt"); t, S, M, tp = stl(rows)
audio_join_f = 42.28 / 1.15 * FPS
cuts = [1181, 1242, 1811, 1850] + [b["start_f"] for b in B["beats"][1:] if b["start_f"] not in (1180, 1242, 1811, 1850)] + [round(audio_join_f, 1), 2092]
cr = []
for f in sorted(set(cuts)):
    ts = f / FPS; i = int(ts * sr)
    w20 = int(0.02 * sr)
    pre = [rmsdb(mm[i - (k + 1) * w20: i - k * w20]) for k in range(5)][::-1]
    post = [rmsdb(mm[i + k * w20: i + (k + 1) * w20]) for k in range(5)]
    Mpre = float(np.interp(ts - 0.05, t, M)); Mpost = float(np.interp(ts + 0.45, t, M))
    jump = abs(np.diff(mm[i - 2: i + 3])).max()
    hf_near = [c for c in clicks if abs(c[1] - f) <= 1.5]
    cr.append({"f": f, "rms_20ms_pre_db": [round(x, 1) for x in pre], "rms_20ms_post_db": [round(x, 1) for x in post],
               "M_pre": round(Mpre, 1), "M_post": round(Mpost, 1), "M_delta": round(Mpost - Mpre, 1),
               "min_20ms_db": round(min(pre + post), 1), "sample_step_at_cut": round(float(jump), 4),
               "hf_click_within_1.5f": hf_near})
out["v6_cuts"] = cr
# typical sample-to-sample step for reference
out["v6_sample_step_p999"] = round(float(np.percentile(np.abs(np.diff(mm)), 99.9)), 4)
for k in ["v6", "ro5"]:
    out[k].pop("_onsets"); out[k].pop("_strength")
json.dump(out, open(f"{D}/audio_measure.json", "w"), indent=1, default=lambda o: o.item() if hasattr(o, "item") else str(o))
print(json.dumps({k: v for k, v in out.items() if k not in ("v6_sfx",)}, indent=1, default=str)[:6000])
vs = dict(out["v6_sfx"]); sch = vs.pop("schedule")
print(json.dumps(vs, indent=1, default=str))
for s in sch: print(s["beat"], s["f"], s["sfx"], "H" if s["hero"] else "-", s["sfx_peak_dbfs"], s["sfx_minus_voice_rms_db"], s["onset"], s["onset_within_0.5s"], "|", s["event"])
