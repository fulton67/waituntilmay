"""Quiet technical decay: short-lived squares that break the picture open.

This replaces the spreading mask in composite.py. That one opened a block and
kept it open, dragging it along A's motion vectors until the frame was almost
entirely B - which read as tiles pasted over the image and, by the end, as a
different video. The brief for this one is the opposite: most of the time the
damage should be sparse and small, it should move around rather than pile up,
and the picture should only break open at moments the talk earns.

What a square is
----------------
A square is a short-lived hole in layer A, at 16, 8 or 4 px, that shows layer
B through it. It exists for 6-20 frames and then closes. Nothing advects and
nothing is permanent, so damage drifts around the frame instead of winning.

Sizes come from subdivision rather than a second grid: a glitched macroblock
is split recursively, so one damaged area yields a 16 next to two 8s next to
four 4s. The sizes are therefore always aligned and always nest.

Why a square is never intact
----------------------------
A square does not switch from A to B. It fills in over 8-12 frames, in
quantised steps, by turning on its own sub-cells in a per-square scrambled
order. A half-filled square is literally half its sub-cells, hard-edged, in a
broken pattern - the image coming apart rather than a tile arriving. The same
ramp runs backwards as it closes.

Where a square may open
-----------------------
Only where A is already broken. That is measured as |A - C| per macroblock
against a floor taken from a control encode of the same chain with the mosh
skipped, so the floor is this render's own codec noise and not a guess. The
motion-vector detector that composite.py used is measured too and reported,
but it is not the gate here: it marks the frames the mosh touched, while what
we need is where A *looks* broken, which is wherever that error has since
propagated - the moving edges, the face, the hands.

How far it opens
----------------
pipeline.intensity turns the transcript into an envelope. A knee keeps the
baseline quiet: only a real spike crosses it, so reveals are moments. Above
the knee, new squares prefer the ring just outside the squares already open,
so a reveal grows outward from existing damage into a region instead of
speckling the whole frame.
"""
import json
import math
import os
import subprocess

import numpy as np

from .composite import block_mean, export_mv, luma, mv_arrays, probe, reader

SUB = 4                    # finest square, and the sub-cell the fill uses
SIZES = (16, 8, 4)         # square sizes in source pixels
FILL_STEPS = 5             # quantisation of the dissolve - stepped, not smooth


# ------------------------------------------------------------ glitch map
def glitch_maps(a_mp4, c_mp4, control_mp4, w, h, n, mb=16, quiet=False):
    """Per-frame |A - C| per macroblock, plus the floor from the control.

    Returns (score [n,rows,cols], floor, mv_score, mv_has) - the mv arrays
    come back for the report, not for the gate.
    """
    rows, cols = math.ceil(h / mb), math.ceil(w / mb)
    score = np.zeros((n, rows, cols), np.float32)
    ra, rc = reader(a_mp4, w, h), reader(c_mp4, w, h)
    for i in range(n):
        fa, fc = next(ra, None), next(rc, None)
        if fa is None or fc is None:
            break
        score[i] = block_mean(np.abs(luma(fa) - luma(fc)), rows, cols, mb)

    floor = 0.0
    if control_mp4 and os.path.exists(control_mp4):
        rk, rc2 = reader(control_mp4, w, h), reader(c_mp4, w, h)
        vals = []
        for i in range(n):
            fk, fc = next(rk, None), next(rc2, None)
            if fk is None or fc is None:
                break
            vals.append(block_mean(np.abs(luma(fk) - luma(fc)), rows, cols, mb))
        if vals:
            floor = float(np.percentile(np.stack(vals), 99.5))
    if not quiet:
        print(f"  |A-C| floor from the control (p99.5): {floor:.2f}")
    return score, floor


# --------------------------------------------------------------- squares
def _subdivide(r, c, rng, p_split=0.55, depth=0):
    """A damaged macroblock -> a mixed bag of 16/8/4 px squares inside it.

    Coordinates come back in SUB-cell units so every size lands on its own
    alignment without a second grid.
    """
    k = 16 // SUB                               # sub-cells across a macroblock
    out = []

    def rec(sr, sc, size, d):
        if size > 1 and rng.random() < (p_split if d == 0 else p_split * 0.75):
            half = size // 2
            for dr in (0, half):
                for dc in (0, half):
                    # a child is dropped sometimes, which is what makes the
                    # damage read as broken rather than as a tidy quadtree
                    if rng.random() < 0.82:
                        rec(sr + dr, sc + dc, half, d + 1)
        else:
            out.append((sr, sc, size))

    rec(r * k, c * k, k, depth)
    return out


class Square:
    __slots__ = ("sr", "sc", "size", "birth", "life", "fade", "order")

    def __init__(self, sr, sc, size, birth, life, fade, rng):
        self.sr, self.sc, self.size = sr, sc, size
        self.birth, self.life = birth, life
        # a short square cannot ramp for longer than it exists
        self.fade = max(1, min(fade, int(life * 0.45)))
        n = size * size
        self.order = rng.permutation(n) if n > 1 else np.zeros(1, np.int64)

    def fill(self, f):
        """Quantised trapezoid in [0,1]: open over `fade`, hold, close."""
        age = f - self.birth
        if age < 0 or age >= self.life:
            return 0.0
        up = min(1.0, (age + 1) / self.fade)
        dn = min(1.0, (self.life - age) / self.fade)
        v = min(up, dn)
        return math.floor(v * FILL_STEPS + 0.5) / FILL_STEPS

    def stamp(self, mask, f):
        """Turn on the first `fill` share of this square's sub-cells."""
        v = self.fill(f)
        if v <= 0.0:
            return 0
        n = self.size * self.size
        k = int(round(v * n))
        if k <= 0:
            return 0
        rows, cols = mask.shape
        if n == 1:
            if self.sr < rows and self.sc < cols:
                mask[self.sr, self.sc] = True
                return 1
            return 0
        on = self.order[:k]
        rr = self.sr + (on // self.size)
        cc = self.sc + (on % self.size)
        keep = (rr < rows) & (cc < cols)
        mask[rr[keep], cc[keep]] = True
        return int(keep.sum())


# ---------------------------------------------------------------- labels
def clusters(mask):
    """Connected components of the sub-cell mask, 4-connected, iterative."""
    rows, cols = mask.shape
    seen = np.zeros_like(mask)
    n = 0
    stack = []
    for r0 in range(rows):
        for c0 in range(cols):
            if not mask[r0, c0] or seen[r0, c0]:
                continue
            n += 1
            stack.append((r0, c0))
            seen[r0, c0] = True
            while stack:
                r, c = stack.pop()
                for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    rr, cc = r + dr, c + dc
                    if 0 <= rr < rows and 0 <= cc < cols \
                            and mask[rr, cc] and not seen[rr, cc]:
                        seen[rr, cc] = True
                        stack.append((rr, cc))
    return n


# ------------------------------------------------------------ the target
def coverage_target(env, drift, cfg, knee=0.60, gamma=1.6):
    """Envelope -> wanted share of the frame, as a fraction.

    The knee is what keeps this quiet: below it the picture only carries the
    baseline, which itself wanders on `drift` so no stretch is ever flat.
    """
    ic = (cfg or {}).get("intensity") or {}
    lo, hi = [x / 100.0 for x in (ic.get("baseline_pct") or [1.0, 5.0])]
    plo, phi = [x / 100.0 for x in (ic.get("peak_pct") or [30.0, 40.0])]
    base = lo + (hi - lo) * drift
    shaped = np.clip((env - knee) / max(1e-6, 1.0 - knee), 0.0, 1.0) ** gamma
    peak = plo + (phi - plo) * drift
    return base + (peak - base) * shaped, shaped


# ----------------------------------------------------------------- build
def build(a, b, c, out, control=None, env=None, drift=None, cfg=None,
          concept_frames=(), trigger_frames=(), mb=16, seed=0, knee=0.60,
          gamma=1.6, life_range=(6, 20), fade_range=(8, 12), crf=20,
          fill_efficiency=0.75, tmp=".decay", audio_from=None,
          moshed_m4v=None, quiet=False):
    """Composite A with B showing through short-lived squares. Returns a report."""
    os.makedirs(tmp, exist_ok=True)
    pa = probe(a)
    w, h = pa["w"], pa["h"]
    n = min(pa["frames"], probe(b)["frames"], probe(c)["frames"])
    if env is not None:
        n = min(n, len(env))
    fps = pa["fps"]
    rows, cols = math.ceil(h / mb), math.ceil(w / mb)
    srows, scols = math.ceil(h / SUB), math.ceil(w / SUB)
    k = mb // SUB
    rng = np.random.default_rng(seed or 0)

    if env is None:
        env = np.full(n, 0.2)
    if drift is None:
        drift = np.full(n, 0.5)
    env, drift = np.asarray(env[:n]), np.asarray(drift[:n])

    if not quiet:
        print(f"frames {n}  {w}x{h} @ {fps:g}  mb grid {cols}x{rows}  "
              f"sub grid {scols}x{srows} ({SUB}px)")

    # ---- where A is broken
    score, floor = glitch_maps(a, c, control, w, h, n, mb, quiet)
    thr = max(floor, 1.0)
    glitch = score > thr
    gl_pct = float(glitch.mean()) * 100.0

    # ---- the mv detector, measured for the report but not used as the gate
    mv_pct = None
    if moshed_m4v and os.path.exists(moshed_m4v) and os.path.exists(
            os.path.join(".tools", "ffglitch-0.10.2-windows-x86_64",
                         "ffedit.exe")):
        try:
            doc = export_mv(moshed_m4v, os.path.join(tmp, "a-mv.json"))
            mvv, mvh = mv_arrays(doc, rows, cols, n)
            mag = np.hypot(mvv[:, :, :, 0], mvv[:, :, :, 1])
            mvmask = mvh & (mag > np.percentile(mag[mvh], 99) if mvh.any() else 0)
            mv_pct = float(mvmask.mean()) * 100.0
        except Exception as e:                       # measurement, not a gate
            if not quiet:
                print(f"  (mv detector unavailable: {e})")

    target, shaped = coverage_target(env, drift, cfg, knee, gamma)

    # ---- grow the square population frame by frame
    live = []
    masks = np.zeros((n, srows, scols), bool)
    stats = {"spawned": 0, "spawn_ring": 0, "spawn_free": 0}
    per_frame = []
    lifes, fades = [], []

    total_sub = float(srows * scols)
    padded = np.zeros((rows * k, cols * k), bool)
    short_fade = 0

    for i in range(n):
        live = [s for s in live if i - s.birth < s.life]
        mask = np.zeros((srows, scols), bool)
        for s in live:
            s.stamp(mask, i)

        # A square spends most of its life part-open, so the area actually
        # lit is a fraction of the area committed. Measured at 0.75-0.78 on
        # the test clip, flat across baseline and peak, so the target is
        # divided by it rather than fitted per frame.
        want = float(target[i]) / max(fill_efficiency, 0.05)
        gmap = glitch[i]
        # Spawning chases COMMITTED area, not what is lit this frame. A square
        # is nearly shut at birth - it ramps over its fade - so a loop that
        # chased the realised mask would spawn hundreds to hit the target now
        # and then overshoot wildly as they all opened. Committed area is the
        # ground the live squares will cover once open, so realised coverage
        # trails it by the fade, which is the ramp the brief asks for.
        committed = sum(s.size * s.size for s in live) / total_sub

        guard = 0
        while committed < want and guard < 4000:
            guard += 1
            padded[:] = False
            padded[:srows, :scols] = mask
            openmb = padded.reshape(rows, k, cols, k).any(axis=(1, 3))
            ring = np.zeros((rows, cols), bool)
            if openmb.any():
                ring[1:, :] |= openmb[:-1, :]
                ring[:-1, :] |= openmb[1:, :]
                ring[:, 1:] |= openmb[:, :-1]
                ring[:, :-1] |= openmb[:, 1:]
                ring &= ~openmb

            # Baseline damage may only open where A is broken. A reveal is
            # different: it is seeded at damage that already exists and then
            # grows OUTWARD from it, which is the only way a peak can reach a
            # region larger than the aperture A leaves - measured at 7.6% of
            # macroblocks, far under the 30-40% a peak is meant to reach.
            reveal = float(shaped[i]) > 0.02
            free = gmap & ~openmb
            if reveal and ring.any() and rng.random() < 0.85:
                pool, kind = ring, "ring"
            elif free.any():
                pool, kind = free, "free"
            elif reveal and ring.any():
                pool, kind = ring, "ring"
            else:
                break

            idx = np.flatnonzero(pool)
            pick = int(idx[rng.integers(len(idx))])
            r, cc = divmod(pick, cols)
            # a reveal holds longer, so a cluster can finish opening before it
            # closes again; baseline damage stays brief
            lo_l, hi_l = life_range
            life = int(round(int(rng.integers(lo_l, hi_l + 1))
                             * (1.0 + 1.6 * float(shaped[i]))))
            fade = int(rng.integers(fade_range[0], fade_range[1] + 1))
            for sr, sc, size in _subdivide(r, cc, rng):
                sq = Square(sr, sc, size, i, life, fade, rng)
                live.append(sq)
                sq.stamp(mask, i)
                lifes.append(life)
                fades.append(sq.fade)
                if sq.fade < fade:
                    short_fade += 1
                committed += (size * size) / total_sub
            stats["spawned"] += 1
            stats["spawn_" + kind] += 1

        masks[i] = mask
        padded[:] = False
        padded[:srows, :scols] = mask
        per_frame.append({"cov": float(mask.mean()), "live": len(live),
                          "want": want, "committed": committed,
                          "mb_open": padded.reshape(rows, k, cols, k)
                          .any(axis=(1, 3)).copy(),
                          "glitch": float(gmap.mean())})

    # ---- clusters, on a sample so a 720-frame render stays cheap.
    # Two measures, because they answer different questions: on the sub-cell
    # grid the dissolve itself splits one square into many islands, which is
    # the broken-edge look working; on the macroblock grid a cluster is a
    # contiguous damaged REGION, which is what "grows into larger revealed
    # regions" is about.
    step = max(1, n // 120)
    cl = [(i, clusters(masks[i])) for i in range(0, n, step)]
    for i, v in cl:
        per_frame[i]["clusters"] = v
    clr = [(i, clusters(per_frame[i]["mb_open"])) for i in range(0, n, step)]
    for i, v in clr:
        per_frame[i]["mb_clusters"] = v
    for p in per_frame:
        p.pop("mb_open", None)

    # ---- composite and encode
    if not quiet:
        print("  compositing ...")
    vf = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
          "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}",
          "-r", f"{fps:g}", "-i", "-"]
    if audio_from:
        vf += ["-i", audio_from, "-map", "0:v:0", "-map", "1:a:0?",
               "-c:a", "aac", "-b:a", "128k", "-shortest"]
    vf += ["-c:v", "libx264", "-preset", "medium", "-crf", str(crf),
           "-pix_fmt", "yuv420p", "-r", f"{fps:g}",
           "-movflags", "+faststart", out]
    enc = subprocess.Popen(vf, stdin=subprocess.PIPE,
                           stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    ra, rb = reader(a, w, h), reader(b, w, h)
    try:
        for i in range(n):
            fa, fb = next(ra, None), next(rb, None)
            if fa is None or fb is None:
                break
            m = np.repeat(np.repeat(masks[i], SUB, axis=0), SUB, axis=1)[:h, :w]
            enc.stdin.write(np.where(m[:, :, None], fb, fa).tobytes())
    finally:
        enc.stdin.close()
        err = enc.stderr.read().decode(errors="replace")
        enc.wait()
    if enc.returncode != 0:
        raise RuntimeError(f"encode failed: {err.strip()[-400:]}")

    cov = np.array([p["cov"] for p in per_frame])
    per_second = []
    for s in range(int(math.ceil(n / fps))):
        f0, f1 = int(s * fps), min(n, int((s + 1) * fps))
        if f0 >= n:
            break
        seg = cov[f0:f1]
        per_second.append({
            "second": s,
            "mean_pct": round(float(seg.mean()) * 100, 2),
            "max_pct": round(float(seg.max()) * 100, 2),
            "env_mean": round(float(env[f0:f1].mean()), 3),
        })

    at_concept = []
    for cf in concept_frames:
        f = int(cf["frame"] if isinstance(cf, dict) else cf)
        if 0 <= f < n:
            at_concept.append({
                "frame": f, "second": int(f // fps),
                "word": (cf.get("stem") if isinstance(cf, dict) else None),
                "coverage_pct": round(float(cov[f]) * 100, 2),
                "env": round(float(env[f]), 3),
                "peak_next_1s_pct": round(
                    float(cov[f:min(n, f + int(fps))].max()) * 100, 2),
            })

    clv = [v for _, v in cl]
    rep = {
        "frames": n, "fps": fps, "grid": {"mb": [cols, rows],
                                          "sub": [scols, srows], "sub_px": SUB},
        "detector": {"gate": "|A-C| per macroblock", "floor_p99_5": round(floor, 3),
                     "threshold": round(thr, 3),
                     "a_glitched_pct_mean": round(gl_pct, 2),
                     "mv_detector_pct_mean": (round(mv_pct, 2)
                                              if mv_pct is not None else None)},
        "coverage": {
            "per_second": per_second,
            "mean_pct": round(float(cov.mean()) * 100, 2),
            "max_pct": round(float(cov.max()) * 100, 2),
            "min_pct": round(float(cov.min()) * 100, 2),
            "at_concept_words": at_concept,
            "max_frame_jump_pct": round(float(np.abs(np.diff(cov)).max()) * 100, 2)
            if n > 1 else 0.0,
            "flat_runs_over_1s": int(_flat_runs(cov, int(fps))),
        },
        "squares": {
            "spawned": stats["spawned"],
            "from_ring_pct": round(100.0 * stats["spawn_ring"]
                                   / max(stats["spawned"], 1), 1),
            "life_frames": {"min": int(min(lifes)) if lifes else 0,
                            "max": int(max(lifes)) if lifes else 0,
                            "mean": round(float(np.mean(lifes)), 1) if lifes else 0},
            "fade_frames": {"min": int(min(fades)) if fades else 0,
                            "max": int(max(fades)) if fades else 0,
                            "mean": round(float(np.mean(fades)), 1) if fades else 0},
            # a square cannot ramp for longer than it exists: with a life of
            # 6-20 frames and a wanted fade of 8-12, anything under ~18
            # frames is clamped. Counted rather than hidden.
            "fade_clamped_pct": round(100.0 * short_fade
                                      / max(len(fades), 1), 1),
            "live_mean": round(float(np.mean([p["live"] for p in per_frame])), 1),
            "live_max": int(max(p["live"] for p in per_frame)) if per_frame else 0,
        },
        "clusters": {"sampled_frames": len(clv),
                     "min": int(min(clv)) if clv else 0,
                     "max": int(max(clv)) if clv else 0,
                     "mean": round(float(np.mean(clv)), 1) if clv else 0,
                     "regions_min": int(min(v for _, v in clr)) if clr else 0,
                     "regions_max": int(max(v for _, v in clr)) if clr else 0,
                     "regions_mean": round(float(np.mean([v for _, v in clr])), 1)
                     if clr else 0},
        "target": {"knee": knee, "gamma": gamma,
                   "fill_efficiency": fill_efficiency,
                   "mean_pct": round(float(target.mean()) * 100, 2),
                   "max_pct": round(float(target.max()) * 100, 2)},
        "output": out,
    }
    if not quiet:
        print(f"  coverage mean {rep['coverage']['mean_pct']}%  "
              f"max {rep['coverage']['max_pct']}%  "
              f"squares {stats['spawned']} ({rep['squares']['from_ring_pct']}% "
              f"from the ring)  clusters {rep['clusters']['mean']} mean")
    return rep


def _flat_runs(cov, fps_i):
    """Runs longer than a second where coverage does not move at all."""
    if len(cov) < 2:
        return 0
    same = np.isclose(np.diff(cov), 0.0, atol=1e-12)
    runs, cur = 0, 0
    for s in same:
        cur = cur + 1 if s else 0
        if cur == fps_i:
            runs += 1
    return runs


def save(rep, path):
    json.dump(rep, open(path, "w", encoding="utf-8"), indent=1)
    return path
