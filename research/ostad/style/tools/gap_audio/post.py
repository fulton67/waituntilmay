import json, sys, numpy as np, soundfile as sf
sys.stdout.reconfigure(encoding="utf-8")
D = sys.argv[1]; FPS = 24
o = json.load(open(f"{D}/audio_measure.json"))
for c in o["v6_cuts"]:
    print(c["f"], "Mpre", c["M_pre"], "Mpost", c["M_post"], "dM", c["M_delta"], "min20ms", c["min_20ms_db"], "step", c["sample_step_at_cut"], "clk", c["hf_click_within_1.5f"])
print("step p99.9", o["v6_sample_step_p999"])
# bed level rise at each scheduled SFX (no_vocals stem): RMS over the SFX length after f vs the 200 ms before
b, sr = sf.read(f"{D}/sep/htdemucs/v6/no_vocals.wav"); b = b.mean(1)
def r(a): return 20*np.log10(np.sqrt(np.mean(a**2))+1e-12)
dur = {k: v["dur_s"] for k, v in o["sfx_files"].items()}
rises = []
for s in o["v6_sfx"]["schedule"]:
    i = int(s["f"]/FPS*sr); L = int(min(dur[s["sfx"]], 0.25)*sr)
    rise = r(b[i:i+L]) - r(b[i-int(0.2*sr):i])
    s["bed_rise_db"] = round(rise, 1); rises.append((s["hero"], rise))
    print(s["beat"], s["f"], s["sfx"], "H" if s["hero"] else "-", "peak", s["sfx_peak_dbfs"], "sfx-voice", s["sfx_minus_voice_rms_db"], "bedrise", round(rise,1), "|", (s["event"] or "")[:70])
h = [x for hh, x in rises if hh]; n = [x for hh, x in rises if not hh]
print("hero bed rise median", np.median(h), ">=6dB", np.mean(np.array(h) >= 6), "| nonhero median", np.median(n), ">=6dB", np.mean(np.array(n) >= 6))
o["v6_sfx"]["hero_bed_rise_db_median"] = float(np.median(h)); o["v6_sfx"]["nonhero_bed_rise_db_median"] = float(np.median(n))
o["v6_sfx"]["hero_audible_share_rise6db"] = float(np.mean(np.array(h) >= 6)); o["v6_sfx"]["nonhero_audible_share_rise6db"] = float(np.mean(np.array(n) >= 6))
for nm in ["v6", "ro5"]:
    bb, sr = sf.read(f"{D}/sep/htdemucs/{nm}/no_vocals.wav"); bb = bb.mean(1); w = int(0.05*sr); k = len(bb)//w
    e = 20*np.log10(np.sqrt(np.mean(bb[:k*w].reshape(k, w)**2, 1))+1e-12)
    pk = [round(float(np.percentile(e, q)),1) for q in (50, 95, 99, 99.9)]
    print(nm, "bed 50ms RMS p50/95/99/99.9", pk, "windows > -40 dBFS", int((e > -40).sum()), "per min", round((e > -40).sum()/(len(bb)/sr/60),1))
    o[nm]["bed_50ms_rms_pcts"] = pk; o[nm]["bed_windows_over_-40dbfs_per_min"] = round((e > -40).sum()/(len(bb)/sr/60),1)
json.dump(o, open(f"{D}/audio_measure.json", "w"), indent=1)
