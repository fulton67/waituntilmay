"""Key the speaker out of a talking-head recording with Robust Video Matting (Lin et al. 2021, MobileNetV3 or ResNet50 ONNX from the
RVM v1.0.0 release, kept in ~/tools/models/rvm). RVM is recurrent: each frame's matte is predicted with the previous frames' hidden
state, so hair edges don't flicker frame to frame the way per-frame segmenters (rembg/u2net) do. Run it on the WHOLE raw clip
(continuous state, no restarts at the edit's joins), then cut the matte with the same keep ranges as the picture.
Writes <out>_fgr.mp4 (RVM's foreground colour, background spill removed at the edges) and <out>_pha.mp4 (alpha as grey luma),
both at the source size and rate.
usage: ~/tools/brand-venv/Scripts/python -I brand/scripts/video_matte.py <video> <out_prefix> [mobilenetv3|resnet50] [downsample=0.25]
       ~/tools/brand-venv/Scripts/python -I brand/scripts/video_matte.py --pack <fgr_cut.mp4> <pha_cut.mp4> <out.webm>
  --pack: one VP9 + alpha webm for Remotion (<OffthreadVideo transparent>). The alpha is cleaned per frame: only the largest connected
  body (alpha > 0.25) and what lies within 24 px of it are kept, so stray bits of the Exomind machine beside his hand (RVM leaves a few,
  e.g. ~24 s, ~46 s, ~68 s in the source) are dropped while hair fringe and motion-blurred fingers stay."""
import os, subprocess, sys, time
import numpy as np

if sys.argv[1] == "--pack":
    import cv2
    fg, ph, out = sys.argv[2:5]
    probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate",
                            "-of", "csv=p=0", fg], capture_output=True, text=True, check=True).stdout.strip().split(",")
    w, h, rate = int(probe[0]), int(probe[1]), probe[2]
    rd = lambda p, fmt: subprocess.Popen(["ffmpeg", "-v", "error", "-i", p, "-f", "rawvideo", "-pix_fmt", fmt, "-"], stdout=subprocess.PIPE)
    dfg, dph = rd(fg, "rgb24"), rd(ph, "gray")
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{w}x{h}", "-r", rate, "-i", "-",
                            "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "18", "-deadline", "good", "-cpu-used", "4",
                            "-row-mt", "1", "-auto-alt-ref", "0", out], stdin=subprocess.PIPE)
    ker = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (49, 49))
    n = dropped = 0
    while True:
        a = dph.stdout.read(w * h); c = dfg.stdout.read(w * h * 3)
        if len(a) < w * h or len(c) < w * h * 3: break
        al = np.frombuffer(a, np.uint8).reshape(h, w).copy()
        k, lab, st, _ = cv2.connectedComponentsWithStats((al > 64).astype(np.uint8), 8)
        if k > 2:
            main = 1 + int(np.argmax(st[1:, 4]))
            keep = cv2.dilate((lab == main).astype(np.uint8), ker)
            before = int((al > 64).sum()); al[keep == 0] = 0; dropped += before - int((al > 64).sum())
        rgba = np.dstack([np.frombuffer(c, np.uint8).reshape(h, w, 3), al])
        enc.stdin.write(rgba.tobytes()); n += 1
    enc.stdin.close(); enc.wait()
    print(f"{n} frames packed -> {out}; {dropped} stray alpha px dropped in total"); sys.exit(0)

import onnxruntime as ort
src, out = sys.argv[1], sys.argv[2]
arch = sys.argv[3] if len(sys.argv) > 3 else "mobilenetv3"
dr = float(sys.argv[4]) if len(sys.argv) > 4 else 0.25
model = os.path.expanduser(f"~/tools/models/rvm/rvm_{arch}_fp32.onnx")
probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate",
                        "-of", "csv=p=0", src], capture_output=True, text=True, check=True).stdout.strip().split(",")
w, h, rate = int(probe[0]), int(probe[1]), probe[2]
sess = ort.InferenceSession(model, providers=["CPUExecutionProvider"])
dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
enc = lambda path, fmt, extra: subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", fmt, "-s", f"{w}x{h}", "-r", rate,
                                                  "-i", "-", *extra, path], stdin=subprocess.PIPE)
efg = enc(out + "_fgr.mp4", "rgb24", ["-c:v", "libx264", "-crf", "12", "-preset", "fast", "-pix_fmt", "yuv420p"])
eph = enc(out + "_pha.mp4", "gray", ["-c:v", "libx264", "-crf", "6", "-preset", "fast", "-pix_fmt", "yuv420p"])
rec = [np.zeros((1, 1, 1, 1), np.float32)] * 4
d = np.array([dr], np.float32)
n, t0 = 0, time.time()
while True:
    buf = dec.stdout.read(w * h * 3)
    if len(buf) < w * h * 3: break
    x = np.frombuffer(buf, np.uint8).reshape(h, w, 3).transpose(2, 0, 1)[None].astype(np.float32) / 255
    fgr, pha, *rec = sess.run(None, {"src": x, "r1i": rec[0], "r2i": rec[1], "r3i": rec[2], "r4i": rec[3], "downsample_ratio": d})
    efg.stdin.write((fgr[0].transpose(1, 2, 0) * 255).clip(0, 255).astype(np.uint8).tobytes())
    eph.stdin.write((pha[0, 0] * 255).clip(0, 255).astype(np.uint8).tobytes())
    n += 1
    if n % 150 == 0: print(f"{n} frames, {n / (time.time() - t0):.2f} fps", flush=True)
for e in (efg, eph): e.stdin.close(); e.wait()
dec.wait()
print(f"{n} frames {arch} dr={dr} in {time.time() - t0:.0f} s -> {out}_fgr.mp4, {out}_pha.mp4")
