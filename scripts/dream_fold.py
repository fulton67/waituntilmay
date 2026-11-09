"""DeepDream over the fold, before it becomes layer B.

Where this sits, and why there
------------------------------
The fold is the picture the underlayer is made of: the frame mirrored into
itself at three zooms, built in the pixel domain by ffmpeg. Layer B is that
picture encoded and then driven by the surface's motion field. The exchange
then lets B through wherever the two layers disagree, which is wherever the
figure moved.

Dreaming the fold - not the footage, not the composite - therefore puts the
dream exactly where the grain already is: it shows through the holes and
nowhere else. Dream the footage instead and the whole frame turns into a
wallpaper; dream the composite and the damage map stops meaning anything,
because every pixel has been repainted.

Temporal stability
------------------
DeepDream is a gradient ascent, and gradient ascent from a slightly
different starting point lands somewhere else entirely. Run it on
consecutive frames independently and the textures re-roll every frame -
the "boiling" that makes most dreamed video unwatchable.

The fix is the one the optical-flow literature uses: before dreaming frame
f, warp the dreamed frame f-1 along the motion field and blend it into the
input. The dream then starts from where it finished, moved to where the
picture moved, so a texture that grew on a shoulder travels with the
shoulder. The field used is the clip's OWN exported vectors - the same
cleanA-mv.json the surface is built from - so the dream follows the
footage's motion rather than an optical flow estimated here, and there is
one motion field in the pipeline rather than two.

The report measures what that is worth: mean absolute frame-to-frame
difference in the still regions, where any difference at all is the dream
boiling rather than the picture moving.

  .venv/Scripts/python.exe scripts/dream_fold.py \
      --in bank/prep/blum_00324115/fold.mp4 --out /tmp/foldD.mp4 \
      --mv bank/prep/blum_00324115/cleanA-mv.json --frames 101
"""
import argparse
import json
import os
import subprocess
import time

import numpy as np

MEAN = np.float32([0.485, 0.456, 0.406])
STD = np.float32([0.229, 0.224, 0.225])

# GoogLeNet, which is the network DeepDream was written against. Shallow
# blocks answer to edges and weave; the deep ones answer to whole objects,
# which is where the eyes and the dog faces come from.
LAYERS = ["conv3", "inception3a", "inception3b", "inception4a",
          "inception4b", "inception4c", "inception4d", "inception4e",
          "inception5a", "inception5b"]


def decode(path, n, w, h):
    raw = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", path,
         "-frames:v", str(n), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout
    a = np.frombuffer(raw, np.uint8)
    got = len(a) // (w * h * 3)
    if got < n:
        raise SystemExit(f"{path}: decoded {got} of {n} frames")
    return a[:n * w * h * 3].reshape(n, h, w, 3)


def read_mv(path, n, rows, cols):
    """The clip's own vectors, in PIXELS, per block, plus a coded mask."""
    doc = json.load(open(path, encoding="utf-8"))
    fr = doc["streams"][0]["frames"]
    mv = np.zeros((n, rows, cols, 2), np.float32)
    has = np.zeros((n, rows, cols), bool)
    for f in range(min(n, len(fr))):
        fwd = (fr[f].get("mv") or {}).get("forward")
        if not fwd:
            continue
        for y, row in enumerate(fwd):
            if not row or y >= rows:
                continue
            for x, v in enumerate(row):
                if v is None or x >= cols:
                    continue
                # a 4MV macroblock exports four pairs; their mean is the
                # block's motion, which is all this needs
                if isinstance(v[0], list):
                    vx = sum(z[0] for z in v) / len(v)
                    vy = sum(z[1] for z in v) / len(v)
                else:
                    vx, vy = v[0], v[1]
                mv[f, y, x] = (vx / 2.0, vy / 2.0)
                has[f, y, x] = True
    return mv, has


def read_mvbin(path, n, rows, cols):
    """The same field in the renderer's own binary: four int32 (frames,
    rows, cols, 2) then float32 x,y per block, already in pixels.

    The clip bank exports the ffedit JSON and the tuning lab exports this,
    and they are the same numbers in two containers - so the warp can read
    whichever the clip being dreamed happens to have, instead of the lab
    getting a dream with no temporal term in it."""
    raw = open(path, "rb").read()
    f, r, c, d = np.frombuffer(raw, "<i4", count=4)
    a = np.frombuffer(raw, "<f4", offset=16).reshape(f, r, c, d)
    mv = np.zeros((n, rows, cols, 2), np.float32)
    k = min(n, f)
    mv[:k, :min(rows, r), :min(cols, c)] = a[:k, :min(rows, r), :min(cols, c), :2]
    return mv, np.ones((n, rows, cols), bool)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="src", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--mv", default=None, help="an ffedit mv export")
    ap.add_argument("--mvbin", default=None,
                    help="the renderer's mv.bin, for a clip that has one "
                         "instead of an ffedit export")
    ap.add_argument("--frames", type=int, required=True)
    ap.add_argument("--width", type=int, default=640)
    ap.add_argument("--height", type=int, default=360)
    ap.add_argument("--fps", type=float, default=24.0)
    ap.add_argument("--strength", type=float, default=0.6)
    ap.add_argument("--depth", type=float, default=0.5)
    ap.add_argument("--warp", type=float, default=0.6)
    ap.add_argument("--scale", type=float, default=0.5)
    ap.add_argument("--iterations", type=int, default=12)
    ap.add_argument("--crf", type=int, default=14)
    ap.add_argument("--report", default=None)
    args = ap.parse_args()

    import torch
    import torch.nn.functional as F
    from torchvision.models import googlenet, GoogLeNet_Weights

    dev = "cuda" if torch.cuda.is_available() else "cpu"
    n, W, H = args.frames, args.width, args.height
    sw = max(32, int(round(W * args.scale / 32)) * 32)
    sh = max(32, int(round(H * args.scale / 32)) * 32)
    li = int(round(min(1.0, max(0.0, args.depth)) * (len(LAYERS) - 1)))
    layer = LAYERS[li]
    print(f"dream: {n} frames {W}x{H} -> dreaming at {sw}x{sh} on {dev}")
    print(f"  layer {layer} (depth {args.depth:.2f}), "
          f"strength {args.strength}, warp {args.warp}, "
          f"{args.iterations} iterations")

    net = googlenet(weights=GoogLeNet_Weights.IMAGENET1K_V1).to(dev).eval()
    for p in net.parameters():
        p.requires_grad_(False)

    feats = {}
    getattr(net, layer).register_forward_hook(
        lambda m, i, o: feats.__setitem__("x", o))

    mean = torch.tensor(MEAN, device=dev).view(1, 3, 1, 1)
    std = torch.tensor(STD, device=dev).view(1, 3, 1, 1)
    lo = ((0.0 - mean) / std)
    hi = ((1.0 - mean) / std)

    def dream(x):
        """Gradient ascent on the layer's own activation, in place."""
        x = x.clone().requires_grad_(True)
        step = args.strength * 0.12
        for _ in range(args.iterations):
            feats.clear()
            net(x)
            a = feats["x"]
            loss = a.pow(2).mean()
            g, = torch.autograd.grad(loss, x)
            # normalise by the mean magnitude, which is what keeps one step
            # the same size whatever layer is being climbed
            x = (x + step * g / (g.abs().mean() + 1e-8)).detach()
            x = torch.max(torch.min(x, hi), lo).requires_grad_(True)
        return x.detach()

    rows, cols = (H + 15) // 16, (W + 15) // 16
    # read whatever the warp setting is: the still mask the flicker number
    # is measured over comes from the same field, and a flicker figure that
    # only exists when the warp is on could not be compared with one
    mv = has = None
    if args.mvbin:
        mv, has = read_mvbin(args.mvbin, n, rows, cols)
    elif args.mv:
        mv, has = read_mv(args.mv, n, rows, cols)

    src = decode(args.src, n, W, H)
    out = np.empty_like(src)
    prev = None
    still_flicker, dream_time = [], []
    base_flicker = []

    # the sampling grid, once: grid_sample wants normalised coordinates
    yy, xx = torch.meshgrid(torch.arange(H, device=dev, dtype=torch.float32),
                            torch.arange(W, device=dev, dtype=torch.float32),
                            indexing="ij")

    enc = subprocess.Popen(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
         "-r", f"{args.fps:g}", "-i", "-", "-an", "-c:v", "libx264",
         "-preset", "medium", "-crf", str(args.crf), "-pix_fmt", "yuv420p",
         args.out], stdin=subprocess.PIPE)

    t_all = time.time()
    for f in range(n):
        t0 = time.time()
        cur = torch.from_numpy(src[f].astype(np.float32) / 255.0).to(dev)
        cur = cur.permute(2, 0, 1).unsqueeze(0)
        inp = cur
        if prev is not None and args.warp > 0 and mv is not None:
            # the block field at pixel resolution, nearest - a motion vector
            # belongs to a macroblock and smoothing it would invent motion
            m = torch.from_numpy(mv[f]).to(dev).permute(2, 0, 1).unsqueeze(0)
            m = F.interpolate(m, size=(H, W), mode="nearest")
            # an MPEG vector points at the reference: pred(px) = ref(px + mv)
            gx = (xx + m[0, 0]) / (W - 1) * 2 - 1
            gy = (yy + m[0, 1]) / (H - 1) * 2 - 1
            grid = torch.stack([gx, gy], -1).unsqueeze(0)
            moved = F.grid_sample(prev, grid, mode="bilinear",
                                  padding_mode="border", align_corners=True)
            inp = cur * (1 - args.warp) + moved * args.warp

        small = F.interpolate(inp, size=(sh, sw), mode="bilinear",
                              align_corners=False)
        x = (small - mean) / std
        x = dream(x)
        got = (x * std + mean).clamp(0, 1)
        # the dream at full size is the DIFFERENCE put back, not the dreamed
        # picture upscaled: that keeps the fold's own detail sharp and only
        # the texture the network added is resampled
        delta = F.interpolate(got - small, size=(H, W), mode="bilinear",
                              align_corners=False)
        res = (inp + delta).clamp(0, 1)
        prev = res.detach()
        dream_time.append(time.time() - t0)

        arr = (res[0].permute(1, 2, 0).cpu().numpy() * 255.0 + 0.5)
        out[f] = arr.astype(np.uint8)
        enc.stdin.write(out[f].tobytes())

        if f > 0 and has is not None:
            still = ~(np.hypot(mv[f, :, :, 0], mv[f, :, :, 1]) > 0.5)
            sp = np.repeat(np.repeat(still, 16, 0), 16, 1)[:H, :W]
            if sp.any():
                d = np.abs(out[f].astype(np.int16)
                           - out[f - 1].astype(np.int16)).mean(axis=2)
                still_flicker.append(float(d[sp].mean()))
                b = np.abs(src[f].astype(np.int16)
                           - src[f - 1].astype(np.int16)).mean(axis=2)
                base_flicker.append(float(b[sp].mean()))
        if (f + 1) % 20 == 0 or f == n - 1:
            print(f"  {f + 1}/{n}  {np.mean(dream_time):.3f}s a frame")

    enc.stdin.close()
    enc.wait()
    total = time.time() - t_all

    rec = {
        "src": args.src, "out": args.out, "frames": n,
        "motion": args.mvbin or args.mv,
        "device": dev, "layer": layer, "layer_index": li,
        "dream_size": [sw, sh], "full_size": [W, H],
        "strength": args.strength, "depth": args.depth, "warp": args.warp,
        "scale": args.scale, "iterations": args.iterations,
        "seconds_total": round(total, 2),
        "seconds_per_frame": round(float(np.mean(dream_time)), 4),
        "flicker_still_dreamed": round(float(np.mean(still_flicker)), 4)
        if still_flicker else None,
        "flicker_still_fold": round(float(np.mean(base_flicker)), 4)
        if base_flicker else None,
    }
    print(f"\n{n} frames in {total:.1f}s "
          f"({rec['seconds_per_frame']:.3f}s a frame)")
    if still_flicker:
        print(f"flicker in the still regions: dreamed "
              f"{rec['flicker_still_dreamed']:.3f} of 255, "
              f"the fold under it {rec['flicker_still_fold']:.3f}")
    if args.report:
        json.dump(rec, open(args.report, "w", encoding="utf-8"), indent=1)
        print(f"-> {args.report}")
    print(f"-> {args.out}  {os.path.getsize(args.out) / 1e6:.2f} MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
