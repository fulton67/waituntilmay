"""reuse_check.py: fail a new edit whose graphic key frames near-match a graphic from an earlier edit (RUN_BRIEF rule 2).

A graphic made for one subject never appears under another, and each edit must move on from the last. So every graphic key frame
of the new edit is perceptually hashed (pHash + dHash, 64 bits each) on the graphic layer's crop, never on a frame dominated by his
face, and compared with every window of every earlier edit's frames. Any match at or under the calibrated threshold FAILS (exit 1).

Earlier edits (the bank, `DEFAULT_SOURCES`): the rosacea render, YouTube v2 / v3 / v4 / v4.1 / v5, the ExoMind vertical reel
(brand/edits/exomind/exomind.mp4) and the storyboard stills. Video frames are sampled every `--step` s (default 0.5). Each frame
contributes the full frame, a 3x3 grid of half-size windows, a 2x2 grid of two-thirds windows, and, for 16:9 sources, the v6
graphic area [760, 60, 1120, 840] and full-bleed area [0, 0, 1920, 860] (so a reused graphic in the same place hashes the same
way). Flat windows (grey std < 6, an empty canvas) are skipped on both sides: there is nothing there to reuse.

Distance = (Hamming(pHash) + Hamming(dHash)) / 128, from 0 (identical) to ~0.5 (unrelated).

Commands (Python that reads downloaded / reference media runs with -I):
  --build-bank                 hash the sources into the bank (local only, gitignored: research/ostad/style/measure/_reuse/bank.npz)
  --calibrate                  two calibrations, written to measure/_reuse/calibration.json (committed, numbers only):
                               pairs: identical (the same window re-encoded: JPEG q35, 0.5x and back, 2 % shift, +10 brightness; held
                               graphics on consecutive samples) vs different (other sources, or >= 10 s apart). Reference only, because
                               the check takes a MINIMUM over ~100k windows, so one pair's statistics understate how close unrelated
                               content gets.
                               nn (the decision threshold): nearest-bank distance of known-new frames (8 Ro videos from the reference
                               study, never in our edits) vs earlier-edit frames taken between bank samples and re-encoded at JPEG q35;
                               threshold = midpoint of earlier-edit p99 and known-new p1.
  --build-bank --beats B.json  also index B.json's key-frame crops as bank windows, so the check compares like geometry with like
  KEYFRAMES_DIR --beats beats.json
                               check: KEYFRAMES_DIR holds one PNG per beat named <beat id>*.png (B03.png, B03_f245.png). A full
                               1920x1080 frame is cropped by the beat's keyframe.crop; a PNG already the crop's size is used as is.
"""
from __future__ import annotations
import argparse, json, random, subprocess, sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / "research/ostad/style/measure/_reuse"
DL = Path.home() / "Downloads"
DEFAULT_SOURCES = [
    ("rosacea_v5", DL / "Ostad - Rosacea laser (v5, clean captions).mp4"),
    ("yt_v2", DL / "Ostad - Exomind and total skin health (YouTube v2).mp4"),
    ("yt_v3", DL / "Ostad - Exomind and total skin health (YouTube v3).mp4"),
    ("yt_v4", DL / "Ostad - Exomind and total skin health (YouTube v4).mp4"),
    ("yt_v4.1", DL / "Ostad - Exomind and total skin health (YouTube v4.1).mp4"),
    ("yt_v5", DL / "Ostad - Exomind and total skin health (YouTube v5).mp4"),
    ("exomind_reel", ROOT / "brand/edits/exomind/exomind.mp4"),
    ("storyboard", ROOT / "brand/edits/exomind-skin/storyboard"),
]
SCALE = 0.5            # hash at half resolution (1920 -> 960); hashes are 8x8, so nothing is lost
G_AREA = [760, 60, 1120, 840]
FULL_AREA = [0, 0, 1920, 860]
FLAT_STD = 6.0

# ------------------------------------------------------------------------------------------------ hashing
_N = 32
_C = np.cos(np.pi * (2 * np.arange(_N)[None, :] + 1) * np.arange(_N)[:, None] / (2 * _N))  # DCT-II basis


def phash(g: np.ndarray) -> np.ndarray:
    im = np.asarray(Image.fromarray(g).resize((_N, _N), Image.LANCZOS), dtype=np.float64)
    d = _C @ im @ _C.T
    low = d[:8, :8].ravel()
    return low > np.median(low[1:])


def dhash(g: np.ndarray) -> np.ndarray:
    im = np.asarray(Image.fromarray(g).resize((9, 8), Image.LANCZOS), dtype=np.int16)
    return (im[:, 1:] > im[:, :-1]).ravel()


def hash_crop(g: np.ndarray) -> np.ndarray | None:
    if g.size == 0 or g.std() < FLAT_STD:
        return None
    return np.packbits(np.concatenate([phash(g), dhash(g)]))  # 16 bytes


_POP = np.array([bin(i).count("1") for i in range(256)], dtype=np.uint8)


def dist(q: np.ndarray, bank: np.ndarray) -> np.ndarray:
    """q: (16,) uint8; bank: (n, 16) uint8 -> (n,) distance in [0, 1]."""
    return _POP[np.bitwise_xor(bank, q[None, :])].sum(1) / 128.0


EXTRA_CROPS: list[list[int]] = []   # beats.json keyframe crops (1920 px space), added at --build-bank --beats


def windows(w: int, h: int, wide: bool) -> list[tuple[int, int, int, int]]:
    out = [(0, 0, w, h)]
    for frac, n in ((0.5, 3), (2 / 3, 2), (0.375, 5)):
        ww, hh = int(w * frac), int(h * frac)
        for i in range(n):
            for j in range(n):
                out.append((int(i * (w - ww) / (n - 1)), int(j * (h - hh) / (n - 1)), ww, hh))
    if wide:
        for b in [G_AREA, FULL_AREA, *EXTRA_CROPS]:
            out.append(tuple(int(v * SCALE * w / 960) for v in b))
    return list(dict.fromkeys(out))


def inside(win, crop) -> float:
    """Share of window `win` (x, y, w, h) that lies inside `crop`."""
    x0, y0 = max(win[0], crop[0]), max(win[1], crop[1])
    x1, y1 = min(win[0] + win[2], crop[0] + crop[2]), min(win[1] + win[3], crop[1] + crop[3])
    return max(0, x1 - x0) * max(0, y1 - y0) / float(win[2] * win[3])


def grey(im: Image.Image, width: int) -> np.ndarray:
    im = im.convert("L")
    return np.asarray(im.resize((width, round(im.height * width / im.width)), Image.LANCZOS))


# ------------------------------------------------------------------------------------------------ frames
def video_frames(path: Path, step: float):
    """Yield (t, grey frame) at `step` s, scaled so a 1920-wide frame becomes 960 (vertical 1080 -> 540)."""
    probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", str(path)],
                           capture_output=True, text=True, check=True).stdout.strip().split(",")
    W, H = int(probe[0]), int(probe[1])
    w, h = round(W * SCALE), round(H * SCALE)
    cmd = ["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"fps=1/{step},scale={w}:{h},format=gray", "-f", "rawvideo", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    k = 0
    while True:
        buf = p.stdout.read(w * h)
        if len(buf) < w * h:
            break
        yield k * step, np.frombuffer(buf, np.uint8).reshape(h, w)
        k += 1
    p.wait()


def source_frames(name: str, path: Path, step: float):
    if path.is_dir():
        for f in sorted(path.glob("*.png")) + sorted(path.glob("*.jpg")):
            im = Image.open(f)
            yield f.name, grey(im, round(im.width * SCALE))
    elif path.is_file():
        yield from video_frames(path, step)
    else:
        print(f"  missing source {name}: {path}", file=sys.stderr)


def build_bank(step: float) -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    H, meta = [], []
    for name, path in DEFAULT_SOURCES:
        n0 = len(H)
        for t, g in source_frames(name, path, step):
            h_, w_ = g.shape
            for (x, y, w, h) in windows(w_, h_, w_ > h_):
                hc = hash_crop(g[y:y + h, x:x + w])
                if hc is not None:
                    H.append(hc)
                    meta.append((name, str(t), x, y, w, h))
        print(f"  {name}: {len(H) - n0} window hashes")
    bank = OUT / "bank.npz"
    np.savez_compressed(bank, h=np.array(H, np.uint8), meta=np.array(meta, dtype=object), step=step)
    print(f"bank: {len(H)} hashes -> {bank}")
    return bank


def load_bank():
    z = np.load(OUT / "bank.npz", allow_pickle=True)
    return z["h"], z["meta"]


# ------------------------------------------------------------------------------------------------ calibration
def variants(g: np.ndarray):
    im = Image.fromarray(g)
    import io
    b = io.BytesIO(); im.save(b, "JPEG", quality=35); yield "jpeg35", np.asarray(Image.open(b).convert("L"))
    yield "half", np.asarray(im.resize((g.shape[1] // 2, g.shape[0] // 2)).resize((g.shape[1], g.shape[0])))
    dx, dy = max(1, g.shape[1] // 50), max(1, g.shape[0] // 50)
    yield "shift2pc", g[dy:, dx:]
    yield "bright10", np.clip(g.astype(np.int16) + 10, 0, 255).astype(np.uint8)


def calibrate(step: float, n: int = 400, seed: int = 1) -> dict:
    rnd = random.Random(seed)
    step = max(step, 1.0)  # 1 frame a second is plenty for pair statistics and keeps memory near 300 MB
    frames = {}
    for name, path in DEFAULT_SOURCES:
        fr = list(source_frames(name, path, step))
        if fr:
            frames[name] = fr
    same, diff, held = [], [], []
    names = list(frames)
    # identical: the same graphic window, re-encoded / rescaled / shifted / brightened
    k = 0
    while len(same) < n * 4 and k < n * 20:
        k += 1
        name = rnd.choice(names)
        t, g = rnd.choice(frames[name])
        h_, w_ = g.shape
        x, y, w, h = rnd.choice(windows(w_, h_, w_ > h_))
        crop = g[y:y + h, x:x + w]
        a = hash_crop(crop)
        if a is None:
            continue
        for _, v in variants(crop):
            b = hash_crop(v)
            if b is not None:
                same.append(float(dist(a, b[None, :])[0]))
    # identical in time: consecutive samples of a held graphic window (both non-flat, video sources)
    for name in names:
        fr = frames[name]
        if isinstance(fr[0][0], str):
            continue
        for i in range(len(fr) - 1):
            g0, g1 = fr[i][1], fr[i + 1][1]
            h_, w_ = g0.shape
            x, y, w, h = windows(w_, h_, w_ > h_)[-2] if w_ > h_ else (0, 0, w_, h_ // 3)
            a, b = hash_crop(g0[y:y + h, x:x + w]), hash_crop(g1[y:y + h, x:x + w])
            if a is not None and b is not None and np.abs(g0[y:y + h, x:x + w].astype(np.int16) - g1[y:y + h, x:x + w]).mean() < 1.5:
                held.append(float(dist(a, b[None, :])[0]))
    # different: windows from different sources, or the same source >= 10 s apart
    k = 0
    while len(diff) < n * 4 and k < n * 40:
        k += 1
        n1, n2 = rnd.choice(names), rnd.choice(names)
        (t1, g1), (t2, g2) = rnd.choice(frames[n1]), rnd.choice(frames[n2])
        if n1 == n2 and (isinstance(t1, str) and t1 == t2 or not isinstance(t1, str) and abs(t1 - t2) < 10):
            continue
        w1 = rnd.choice(windows(g1.shape[1], g1.shape[0], g1.shape[1] > g1.shape[0]))
        w2 = rnd.choice(windows(g2.shape[1], g2.shape[0], g2.shape[1] > g2.shape[0]))
        a = hash_crop(g1[w1[1]:w1[1] + w1[3], w1[0]:w1[0] + w1[2]])
        b = hash_crop(g2[w2[1]:w2[1] + w2[3], w2[0]:w2[0] + w2[2]])
        if a is not None and b is not None:
            diff.append(float(dist(a, b[None, :])[0]))
    same_a, diff_a, held_a = np.array(same), np.array(diff), np.array(held)
    s99, d01 = float(np.percentile(same_a, 99)), float(np.percentile(diff_a, 1))
    thr = round((s99 + d01) / 2, 4) if s99 < d01 else round(s99, 4)
    res = {
        "metric": "(hamming pHash + hamming dHash) / 128 on grey crops at 0.5x",
        "step_s": step, "sources": [n for n in names],
        "identical_variants": {"n": len(same), "median": float(np.median(same_a)), "p99": s99, "max": float(same_a.max())},
        "identical_held_graphic": {"n": len(held), "median": float(np.median(held_a)) if len(held) else None,
                                   "p99": float(np.percentile(held_a, 99)) if len(held) else None},
        "different": {"n": len(diff), "min": float(diff_a.min()), "p01": d01, "p05": float(np.percentile(diff_a, 5)), "median": float(np.median(diff_a))},
        "threshold": thr,
        "rule": "near-match if distance <= threshold; threshold = midpoint of identical p99 and different p1",
        "fp_rate_on_different": float((diff_a <= thr).mean()), "recall_on_identical": float((same_a <= thr).mean()),
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "calibration.json").write_text(json.dumps(res, indent=1), encoding="utf-8")
    return res


# ------------------------------------------------------------------------------------------------ check
class Bank:
    def __init__(self):
        self.h, self.meta = load_bank()
        geo: dict[tuple, list] = {}
        for k, row in enumerate(self.meta):
            geo.setdefault(tuple(int(v) for v in row[2:6]), []).append(k)
        self.geo = {key: np.array(v) for key, v in geo.items()}

    def nearest(self, full: Image.Image, crop) -> tuple[float | None, int, str]:
        """Best distance of a key frame's graphic crop to the bank: (distance or None if flat, bank index, how)."""
        x, y, w, h = crop
        im = full if (full.width, full.height) == (w, h) else full.crop((x, y, x + w, y + h))
        hq = hash_crop(grey(im, round(im.width * SCALE)))
        if hq is None:
            return None, -1, "flat"
        # (1) the crop against every bank window (a reused graphic at another size or place)
        d = dist(hq, self.h)
        i = int(d.argmin())
        best, how = float(d[i]), "crop"
        # (2) same-geometry windows: a full 1920x1080 key frame is cut into the bank's own window set; each window lying >= 70 %
        #     inside the graphic crop (so never a face-dominated one) is compared with bank windows of the identical geometry
        if (full.width, full.height) == (1920, 1080):
            gf = grey(full, 960)
            for win in windows(960, 540, True):
                if inside(win, [v * SCALE for v in crop]) < 0.7:
                    continue
                hw = hash_crop(gf[win[1]:win[1] + win[3], win[0]:win[0] + win[2]])
                sel = self.geo.get(win)
                if hw is None or sel is None:
                    continue
                dd = dist(hw, self.h[sel])
                j = int(dd.argmin())
                if dd[j] < best:
                    best, i, how = float(dd[j]), int(sel[j]), f"window {win}"
        return best, i, how


# Known-new footage (never in any of our edits): other creators' 16:9 videos from the reference study
NEW_SOURCES = sorted((ROOT / "research/ostad/style/media/yt/ro").glob("*.mp4"))[:8]


def frame_at(path: Path, t: float) -> Image.Image:
    out = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", str(path), "-frames:v", "1", "-vf", "scale=1920:1080",
                          "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True, check=True).stdout
    import io
    return Image.open(io.BytesIO(out)).convert("RGB")


def duration(path: Path) -> float:
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                                capture_output=True, text=True, check=True).stdout.strip())


def calibrate_nn(n_per: int = 12, seed: int = 3) -> dict:
    """The check takes the *minimum* over ~100k bank windows, so pair statistics understate how close unrelated content gets.
    Calibrate the decision itself: nearest-bank distance of known-new frames (Ro videos) vs of earlier-edit frames taken
    between bank samples (+0.125 s) and re-encoded (JPEG q35). Both use the v6 graphic area G as the crop."""
    import io
    rnd = random.Random(seed)
    B = Bank()
    new, same = [], []
    for p in NEW_SOURCES:
        D = duration(p)
        for _ in range(n_per):
            dd, _, _ = B.nearest(frame_at(p, rnd.uniform(2, D - 2)), G_AREA)
            if dd is not None:
                new.append(dd)
    for name, p in DEFAULT_SOURCES:
        if not p.is_file() or not name.startswith("yt_"):
            continue
        D = duration(p)
        for _ in range(n_per):
            im = frame_at(p, round(rnd.uniform(2, D - 2) * 4) / 4 + 0.125)
            b = io.BytesIO(); im.save(b, "JPEG", quality=35)
            dd, _, _ = B.nearest(Image.open(io.BytesIO(b.getvalue())).convert("RGB"), G_AREA)
            if dd is not None:
                same.append(dd)
    new_a, same_a = np.array(new), np.array(same)
    s99, n01 = float(np.percentile(same_a, 99)), float(np.percentile(new_a, 1))
    thr = round((s99 + n01) / 2, 4) if s99 < n01 else round(min(s99, n01), 4)
    return {"known_new": {"sources": [q.name for q in NEW_SOURCES], "n": len(new), "min": float(new_a.min()), "p01": n01,
                          "p05": float(np.percentile(new_a, 5)), "median": float(np.median(new_a))},
            "earlier_edit_offgrid_jpeg35": {"n": len(same), "median": float(np.median(same_a)), "p99": s99, "max": float(same_a.max())},
            "threshold": thr, "rule": "midpoint of earlier-edit nearest p99 and known-new nearest p1"}


def check(kdir: Path, beats_path: Path, thr: float | None) -> int:
    sheet = json.loads(beats_path.read_text(encoding="utf-8"))
    cal = OUT / "calibration.json"
    if thr is None:
        if not cal.is_file():
            print("no calibration.json: run --calibrate first (or pass --thresh)")
            return 2
        thr = json.loads(cal.read_text(encoding="utf-8"))["threshold"]
    B = Bank()
    print(f"reuse_check: bank {len(B.h)} window hashes, threshold {thr}")
    bad = missing = 0
    for b in sheet["beats"]:
        files = sorted(kdir.glob(f"{b['id']}*.png"))
        if not files:
            print(f"  MISSING {b['id']}: no key frame PNG")
            missing += 1
            continue
        best, i, how = B.nearest(Image.open(files[0]).convert("RGB"), b["keyframe"]["crop"])
        if best is None:
            print(f"  FLAT    {b['id']}: the crop is empty canvas (no graphic to hash): fix the key frame or the crop")
            bad += 1
            continue
        near = best <= thr
        src, t, *_ = B.meta[i]
        bad += near
        print(f"  {'FAIL' if near else 'ok  '}    {b['id']}: nearest {best:.3f} = {src} @ {t}{' s' if not str(t).endswith(('png', 'jpg')) else ''} ({how})")
    ok = not bad and not missing
    print("reuse_check:", "PASS" if ok else f"FAIL ({bad} near-match/flat, {missing} missing)")
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("keyframes", nargs="?", type=Path)
    ap.add_argument("--beats", type=Path)
    ap.add_argument("--build-bank", action="store_true")
    ap.add_argument("--calibrate", action="store_true")
    ap.add_argument("--step", type=float, default=0.5)
    ap.add_argument("--thresh", type=float)
    a = ap.parse_args()
    if a.build_bank:
        if a.beats:  # index the sheet's own key-frame crops too, so the check compares like with like
            sheet = json.loads(a.beats.read_text(encoding="utf-8"))
            EXTRA_CROPS.extend(list(dict.fromkeys(tuple(b["keyframe"]["crop"]) for b in sheet["beats"])))
        build_bank(a.step)
    if a.calibrate:
        r = calibrate(a.step)
        r["pairs_threshold"] = r.pop("threshold")
        r["nn"] = calibrate_nn()
        r["threshold"] = r["nn"]["threshold"]
        r["rule"] = "decision threshold from the nearest-neighbour calibration (nn); pairs_threshold kept for reference"
        (OUT / "calibration.json").write_text(json.dumps(r, indent=1), encoding="utf-8")
        print(json.dumps(r, indent=1))
    if a.keyframes:
        if not a.beats:
            print("check needs --beats")
            return 2
        return check(a.keyframes, a.beats, a.thresh)
    if not (a.build_bank or a.calibrate):
        ap.print_help()
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
