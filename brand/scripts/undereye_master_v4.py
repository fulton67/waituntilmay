"""Under-eye reel v4: master and measure (same two-pass loudnorm as brand/scripts/jan08_prep.py master; the picture is copied).
  master  <raw.mp4> <out.mp4>   -14 LUFS integrated, true peak <= -1 dBTP (target -1.5), aac 192k 48 kHz
  master_lim <raw> <out>  the same with a 4x-oversampled peak limiter first (when linear loudnorm cannot reach -1 dBTP)
  measure <out.mp4> <json>      ebur128 (integrated, true peak) + ffmpeg scdet=threshold=8 cut list
"""
import json, re, subprocess, sys


PRE = "aresample=192000,alimiter=limit=0.56:attack=1:release=60:level=false,aresample=48000,"  # 4x oversampled peak limiter at -5 dBFS before the linear loudnorm (true peak)


def master(src, dst, pre=""):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", src, "-af", pre + "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True)
    j = json.loads(r.stderr[r.stderr.rindex("{"):r.stderr.rindex("}") + 1])
    af = (pre + f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
          f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,aresample=48000")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-c:v", "copy", "-af", af, "-c:a", "aac", "-b:a", "192k", dst], check=True)
    print("input", j["input_i"], "LUFS ->", dst)


def measure(src, out):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", src, "-filter_complex", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    tail = r[r.rindex("Summary:"):]
    I = float(re.search(r"I:\s+(-?[\d.]+) LUFS", tail).group(1)); TP = float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", tail).group(1))
    s = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", src, "-vf", "scdet=threshold=8,metadata=print", "-an", "-f", "null", "-"], capture_output=True, text=True).stderr
    cuts = [(float(t), float(sc)) for sc, t in re.findall(r"lavfi\.scd\.score=([\d.]+)\s*\n.*?lavfi\.scd\.time=([\d.]+)", s)]
    if not cuts:
        ts = re.findall(r"lavfi\.scd\.time=([\d.]+)", s); scs = re.findall(r"lavfi\.scd\.score=([\d.]+)", s)
        cuts = list(zip(map(float, ts), map(float, scs)))
    res = {"file": src, "integrated_lufs": I, "true_peak_dbtp": TP, "loudness_pass": abs(I + 14) <= 0.5 and TP <= -1.0,
           "scdet": [{"t": round(t, 3), "f": round(t * 24), "score": sc} for t, sc in cuts]}
    json.dump(res, open(out, "w"), indent=1)
    print(f"I {I} LUFS, TP {TP} dBTP, {len(cuts)} scdet changes -> {out}")


if __name__ == "__main__":
    {"master": master, "master_lim": lambda a, b: master(a, b, PRE), "measure": measure}[sys.argv[1]](sys.argv[2], sys.argv[3])
