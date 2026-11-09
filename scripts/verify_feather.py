"""Does the feather do what it says, and only where it says.

Three numbers, all of them differences between two shades of the SAME clip
that differ in one thing - the ring width and the hold length, zero against
two and six - so nothing here is a comparison against a remembered
impression.

  sharpness   mean gradient magnitude in a 16px band straddling the
              boundary between damaged and clean blocks. A hard edge is a
              big number: the whole complaint about the old picture is that
              the glitch stopped at a block line, and a block line is a
              step in every direction at once. Smearing content across it
              should bring this down, and the three frames reported are the
              three with the hardest edges in the control, not three picked
              because they flattered the result.

  containment of the pixels that changed, the share that lie in a ring
              block. The pass is supposed to touch the ring and nothing
              else; this says whether it does, and it is the measurement
              that would catch a shader reading the wrong texel.

  PSNR        between control and feathered, over the pixels BEYOND the
              ring - not damaged, not in the skirt. Those are supposed to
              be untouched, so this should be infinite rather than merely
              high, and the brief's bar of 45 dB is the level at which a
              leak would be invisible rather than absent.

              It is reported twice, because the bank is stored as JPEG and
              JPEG does not have pixels, it has 16x16 macroblocks: change
              one pixel and every pixel sharing its MCU re-quantises. A
              beyond-the-ring pixel within 16 px of the skirt therefore
              differs for a reason that has nothing to do with this pass.
              The strict figure counts those, the clean figure excludes
              every pixel whose whole MCU neighbourhood is also beyond, and
              only the second can distinguish a shader that leaks from a
              codec that spreads. The gate is on the second; the first is
              printed so the gap is visible rather than quietly dropped.

The map of which block is what comes from the pass itself, through
scripts/shade_bank.mjs --rings, rather than being reconstructed here: the
ring is computed on the GPU from the damage map and a guess at it afterwards
would be measuring the guess.

  .venv/Scripts/python.exe scripts/verify_feather.py \
      --clip blum_00324115 --on 10f17e14 --off cf388983
"""
import argparse
import json
import os
import struct

import numpy as np
from PIL import Image

MB = 16
BAND = 8          # px either side of the boundary: a 16px band across it


def frames_of(d):
    fs = sorted(f for f in os.listdir(d) if f.endswith(".jpg"))
    return [os.path.join(d, f) for f in fs]


def luma(rgb):
    return (rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587
            + rgb[..., 2] * 0.114)


def read_rings(path):
    """(frames, rows, cols, 4), top-down, from the GL readback."""
    with open(path, "rb") as f:
        raw = f.read()
    n, cols, rows, mb = struct.unpack("<4i", raw[:16])
    a = np.frombuffer(raw, dtype="<f4", offset=16).reshape(n, rows, cols, 4)
    # GL hands rows back bottom-up; the pictures are top-down
    return np.ascontiguousarray(a[:, ::-1]), rows, cols, mb


def upsample(blocks, mb, h, w):
    """Block grid to pixel grid, nearest, cropped to the frame."""
    big = np.repeat(np.repeat(blocks, mb, axis=0), mb, axis=1)
    return big[:h, :w]


def dilate(mask, r):
    """Chebyshev dilation by r, as r steps of a 3x3 max."""
    m = mask.copy()
    for _ in range(r):
        o = m.copy()
        o[1:, :] |= m[:-1, :]
        o[:-1, :] |= m[1:, :]
        o[:, 1:] |= m[:, :-1]
        o[:, :-1] |= m[:, 1:]
        m = o
    return m


def grad_mag(y):
    gx = np.zeros_like(y)
    gy = np.zeros_like(y)
    gx[:, 1:-1] = (y[:, 2:] - y[:, :-2]) * 0.5
    gy[1:-1, :] = (y[2:, :] - y[:-2, :]) * 0.5
    return np.hypot(gx, gy)


def psnr(a, b, sel):
    if sel.sum() == 0:
        return None, 0.0
    d = (a[sel].astype(np.float64) - b[sel].astype(np.float64))
    mse = float((d * d).mean())
    if mse <= 0:
        return float("inf"), 0.0
    return 10.0 * np.log10(255.0 * 255.0 / mse), mse


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--clip", required=True)
    ap.add_argument("--on", required=True, help="look hash, feather on")
    ap.add_argument("--off", required=True, help="look hash, feather off")
    ap.add_argument("--rings", default=None)
    ap.add_argument("--bankdir", default="bank")
    ap.add_argument("--ring-width", type=float, default=2.0)
    ap.add_argument("--out", default="public/mosh-lab/feather-report.json")
    ap.add_argument("--png", default="public/mosh-lab/refs")
    args = ap.parse_args()

    don = os.path.join(args.bankdir, f"look-{args.on}", args.clip)
    doff = os.path.join(args.bankdir, f"look-{args.off}", args.clip)
    rings = args.rings or os.path.join(args.bankdir, "rings-on", args.clip,
                                       "rings.bin")
    fon, foff = frames_of(don), frames_of(doff)
    assert len(fon) == len(foff), (len(fon), len(foff))
    field, rows, cols, mb = read_rings(rings)
    n = min(len(fon), field.shape[0])
    print(f"{args.clip}: {n} frames, {cols}x{rows} blocks of {mb}px")
    print(f"  feathered  {don}")
    print(f"  control    {doff}")

    per = []
    for f in range(n):
        A = np.asarray(Image.open(foff[f]).convert("RGB")).astype(np.float32)
        B = np.asarray(Image.open(fon[f]).convert("RGB")).astype(np.float32)
        h, w = A.shape[:2]
        dmgB = field[f, :, :, 0] > 0.002
        marked = field[f, :, :, 2] > 0.5
        inring = marked & ~dmgB
        mvmag = field[f, :, :, 3]

        dmg = upsample(dmgB, mb, h, w)
        ring = upsample(inring, mb, h, w)
        # the pixel pass reads the ring between its blocks, so the skirt
        # reaches half a block past the last marked one
        touched = dilate(upsample(marked, mb, h, w), mb // 2)
        # the band: within BAND px of the damaged/clean boundary, either side
        band = dilate(dmg, BAND) & dilate(~dmg, BAND)

        ya, yb = luma(A), luma(B)
        ga, gb = grad_mag(ya), grad_mag(yb)
        changed = (np.abs(A - B).max(axis=2) > 0.5)
        beyond = ~touched
        # every pixel whose entire 16px MCU neighbourhood is also beyond:
        # anything that still differs here cannot be JPEG spill
        clean = ~dilate(touched, MB)

        p, mse = psnr(A, B, beyond)
        pc, msec = psnr(A, B, clean)
        per.append({
            "frame": f,
            "band_px": int(band.sum()),
            "sharp_off": float(ga[band].mean()) if band.any() else 0.0,
            "sharp_on": float(gb[band].mean()) if band.any() else 0.0,
            "ring_share": float(inring.mean()),
            "dmg_share": float(dmgB.mean()),
            "changed_px": int(changed.sum()),
            "changed_in_ring": int((changed & ring).sum()),
            "beyond_px": int(beyond.sum()),
            "psnr_beyond": None if p is None else (1e9 if p == float("inf")
                                                   else round(p, 2)),
            "mse_beyond": mse,
            "clean_px": int(clean.sum()),
            "mse_clean": msec,
            "changed_beyond_mcu": int((changed & clean).sum()),
            "mv_mean_in_ring": float(mvmag[inring].mean()) if inring.any()
            else 0.0,
        })

    hard = sorted(per, key=lambda r: -r["sharp_off"])[:3]
    chg = sum(r["changed_px"] for r in per)
    chg_in = sum(r["changed_in_ring"] for r in per)
    beyond_px = sum(r["beyond_px"] for r in per)
    all_mse = sum(r["mse_beyond"] * r["beyond_px"] for r in per) \
        / max(beyond_px, 1)
    all_psnr = float("inf") if all_mse <= 0 else \
        10.0 * np.log10(255.0 * 255.0 / all_mse)
    clean_px = sum(r["clean_px"] for r in per)
    clean_mse = sum(r["mse_clean"] * r["clean_px"] for r in per) \
        / max(clean_px, 1)
    clean_psnr = float("inf") if clean_mse <= 0 else \
        10.0 * np.log10(255.0 * 255.0 / clean_mse)
    chg_beyond_mcu = sum(r["changed_beyond_mcu"] for r in per)

    print("")
    print("the three frames with the hardest edge in the control")
    print("  frame   band px   |grad| off    |grad| on     change")
    for r in hard:
        d = r["sharp_on"] - r["sharp_off"]
        print(f"  {r['frame']:5d}   {r['band_px']:7d}   "
              f"{r['sharp_off']:10.3f}   {r['sharp_on']:10.3f}   "
              f"{d:+7.3f}  ({d / max(r['sharp_off'], 1e-9) * 100:+.1f}%)")
    so = float(np.mean([r["sharp_off"] for r in per]))
    sn = float(np.mean([r["sharp_on"] for r in per]))
    print(f"  all {n} frames            {so:10.3f}   {sn:10.3f}   "
          f"{sn - so:+7.3f}  ({(sn - so) / max(so, 1e-9) * 100:+.1f}%)")

    print("")
    print(f"ring       {np.mean([r['ring_share'] for r in per]) * 100:.2f}% "
          f"of blocks, |mv| carried "
          f"{np.mean([r['mv_mean_in_ring'] for r in per]):.2f} px")
    print(f"damage     {np.mean([r['dmg_share'] for r in per]) * 100:.2f}% "
          f"of blocks")
    print(f"changed    {chg} px, of which {chg_in} "
          f"({chg_in / max(chg, 1) * 100:.3f}%) are in a ring block")
    print("")
    print(f"beyond the ring          {beyond_px:>10} px   "
          f"{'identical' if all_mse <= 0 else f'{all_psnr:.2f} dB'}"
          f"   (JPEG spill included)")
    print(f"beyond it by a whole MCU {clean_px:>10} px   "
          f"{'identical' if clean_mse <= 0 else f'{clean_psnr:.2f} dB'}"
          f"   {chg_beyond_mcu} px differ at all")
    ok = clean_mse <= 0 or clean_psnr > 45
    print(f"gate > 45 dB: {'PASS' if ok else 'FAIL'}")

    # the pictures, so the number has a face beside it
    os.makedirs(args.png, exist_ok=True)
    f0 = hard[0]["frame"]
    A = np.asarray(Image.open(foff[f0]).convert("RGB"))
    B = np.asarray(Image.open(fon[f0]).convert("RGB"))
    Image.fromarray(A).save(os.path.join(args.png, "feather-before.png"))
    Image.fromarray(B).save(os.path.join(args.png, "feather-after.png"))
    pair = np.concatenate([A, B], axis=1)
    Image.fromarray(pair).save(os.path.join(args.png, "feather-pair.png"))

    rec = {
        "clip": args.clip, "frames": n, "look_on": args.on,
        "look_off": args.off, "band_px_either_side": BAND,
        "hardest_frames": hard,
        "sharp_off_mean": so, "sharp_on_mean": sn,
        "sharp_change_pct": (sn - so) / max(so, 1e-9) * 100,
        "changed_px": chg, "changed_in_ring": chg_in,
        "containment_pct": chg_in / max(chg, 1) * 100,
        "psnr_beyond_db": None if all_mse <= 0 else all_psnr,
        "psnr_beyond_identical": all_mse <= 0,
        "psnr_beyond_mcu_db": None if clean_mse <= 0 else clean_psnr,
        "psnr_beyond_mcu_identical": clean_mse <= 0,
        "changed_beyond_mcu": chg_beyond_mcu,
        "pass": bool(ok),
        "per_frame": per,
    }
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(rec, fh, indent=1)
    print(f"\n-> {args.out}")
    print(f"-> {os.path.join(args.png, 'feather-pair.png')}")
    return 0 if rec["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
