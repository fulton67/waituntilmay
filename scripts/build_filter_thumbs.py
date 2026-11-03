"""One before/after thumbnail per filter, so you can see it before you add it.

Each thumbnail is a single 322x90 webp: frame 100 of a Journey version on the
left, the same frame with the filter applied at its own defaults on the right,
a one-pixel rule between them. The UI shows it beside the filter's name, which
is the whole point - a name and a sentence tell you what a filter is, and the
picture tells you whether you want it.

Two details make this work on filters that a naive "grab one frame" approach
cannot touch:

  * the filter runs over a 101-frame clip, not over one frame, because
    `tblend`, `lagfun`, `tmix` and `minterpolate` have nothing to do until
    they have a history. The clip is written once and reused.
  * the output is written with `-update 1`, so every frame overwrites the same
    file and what is left on disk is the LAST frame out of the filter. That
    is the only way to take "the frame at the end" from a filter that changes
    how many frames there are - `framestep`, `fps`, `random`, `reverse`.

Filters that need a second or third input are fed the same clip again, which
is what makes `displace`, `remap`, `haldclut` and `morpho` produce something
rather than an error. A filter that still fails - hardware-only, needs a real
lookup table, needs a map that is not a picture of a face - is recorded with
the reason in the index, and the UI simply shows no picture.

    .venv/Scripts/python.exe scripts/build_filter_thumbs.py
    .venv/Scripts/python.exe scripts/build_filter_thumbs.py --only hue,lagfun
    .venv/Scripts/python.exe scripts/build_filter_thumbs.py --force
"""
import argparse
import concurrent.futures as cf
import glob
import json
import os
import subprocess
import sys
import tempfile
import time

PLAIN = "config/ffmpeg-filters.plain.json"
OUTDIR = os.path.join("public", "mosh-lab", "filter-thumbs")
FRAME = 100               # which frame of the version to show
TILE = (160, 90)          # each half
TIMEOUT = 25              # seconds per filter

# A handful of filters do nothing at their defaults, or refuse to start
# without an argument, so the thumbnail would be either identical to the
# before or missing. These give them just enough to show what they are for.
# Everything else is previewed at its own defaults, which is the point.
THUMB_ARGS = {
    # the comma inside an expression has to be escaped or the filter graph
    # reads it as the end of this filter
    "geq": r"lum_expr=p(X\,Y+10*sin(X/18)):cb_expr=p(X\,Y):cr_expr=p(X\,Y)",
    "pixscope": "x=0.45:y=0.45:w=12:h=12",
    "drawtext": "text=AB:fontsize=48:fontcolor=white:x=20:y=20",
    "delogo": "x=20:y=20:w=120:h=60",
    "colormatrix": "src=bt601:dst=bt709",
    "colorspace": "all=bt709",
    "crop": "w=iw/2:h=ih/2",
    "decimate": "cycle=5",
}

# Filters that structurally cannot have a before/after here, with the reason
# said plainly rather than left as an ffmpeg error in the index.
SKIP = {
    "haldclut": "needs a real lookup-table image as its second input, not "
                "another copy of the clip",
    "extractplanes": "sends each channel out as its own video, so there is no "
                     "single 'after'",
    "alphaextract": "outputs the transparency channel alone, which this clip "
                    "does not have",
    "pixscope": "ffmpeg will not write a still frame out of this one",
}


def run(cmd, timeout=TIMEOUT):
    return subprocess.run(cmd, capture_output=True, text=True,
                          timeout=timeout)


def pick_source(explicit=None):
    if explicit:
        return explicit
    for d in ("renders_arc", "renders_multi", "renders"):
        hits = sorted(glob.glob(os.path.join(d, "v_*.mp4")))
        hits = [h for h in hits if not h.endswith("_clean.mp4")]
        if hits:
            return hits[0]
    raise SystemExit("no rendered version found - run assemble.py first")


def make_clip(src, path, frames=FRAME + 1):
    """The first `frames` frames of the source, at render size.

    Written once and handed to every filter, so the cost of decoding the
    version is paid once rather than four hundred times.
    """
    r = run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
             "-i", src, "-frames:v", str(frames), "-an",
             "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", path],
            timeout=180)
    if r.returncode != 0 or not os.path.exists(path):
        raise SystemExit(f"could not cut the thumbnail clip: {r.stderr[-400:]}")
    return path


def before(clip, path):
    r = run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
             "-i", clip, "-vf", f"scale={TILE[0]}:{TILE[1]}",
             "-update", "1", "-frames:v", str(FRAME + 1), path], timeout=120)
    if r.returncode != 0:
        raise SystemExit(f"could not make the before frame: {r.stderr[-400:]}")
    return path


def after(clip, name, inputs, tmp):
    """The last frame out of `name` at its defaults, or (None, why).

    `-update 1` makes the image writer overwrite one file per frame, so what
    survives is the final frame however many the filter emitted.
    """
    out = os.path.join(tmp, f"{name}_after.png")
    spec = f"{name}={THUMB_ARGS[name]}" if name in THUMB_ARGS else name
    n = 3 if inputs == 3 else (2 if inputs in (2, "N") else 1)
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"]
    for _ in range(n):
        cmd += ["-i", clip]
    if n == 1:
        cmd += ["-vf", f"{spec},scale={TILE[0]}:{TILE[1]}"]
    else:
        pads = "".join(f"[{i}:v]" for i in range(n))
        cmd += ["-filter_complex",
                f"{pads}{spec}[f];[f]scale={TILE[0]}:{TILE[1]}[o]",
                "-map", "[o]"]
    cmd += ["-an", "-update", "1", "-frames:v", str(FRAME + 1), out]
    try:
        r = run(cmd)
    except subprocess.TimeoutExpired:
        return None, f"timed out after {TIMEOUT}s"
    if r.returncode != 0 or not os.path.exists(out):
        why = (r.stderr or "").strip().splitlines()
        return None, (why[-1][:160] if why else "ffmpeg failed")
    return out, None


def stitch(before_png, after_png, dst):
    """before | rule | after, as one small webp."""
    r = run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
             "-i", before_png, "-i", after_png,
             "-filter_complex",
             "[0:v]pad=iw+2:ih:0:0:color=#2a2a2a[a];[a][1:v]hstack=2[o]",
             "-map", "[o]", "-frames:v", "1", "-q:v", "72", dst], timeout=60)
    return r.returncode == 0 and os.path.exists(dst)


def one(name, inputs, clip, before_png, tmp, dst, force, hardware=False):
    # Two kinds of filter cannot have a before/after and it is not a failure:
    # a source makes a picture out of nothing, so there is no before; and a
    # hardware filter needs a GPU device the command line has to set up, which
    # a preview has no business doing.
    if inputs == 0:
        return name, False, "a source filter - there is no 'before'"
    if hardware:
        return name, False, "hardware-only - needs a GPU device set up first"
    if name in SKIP:
        return name, False, SKIP[name]
    if os.path.exists(dst) and not force:
        return name, True, "cached"
    a, why = after(clip, name, inputs, tmp)
    if a is None:
        return name, False, why
    ok = stitch(before_png, a, dst)
    try:
        os.remove(a)
    except OSError:
        pass
    return name, ok, None if ok else "could not stitch"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plain", default=PLAIN)
    ap.add_argument("--outdir", default=OUTDIR)
    ap.add_argument("--src", default=None,
                    help="which rendered version to take the frame from")
    ap.add_argument("--only", default=None, help="comma-separated filter names")
    ap.add_argument("--force", action="store_true", help="redo cached thumbs")
    ap.add_argument("--jobs", type=int, default=4)
    args = ap.parse_args()

    doc = json.load(open(args.plain, encoding="utf-8"))
    filters = doc["filters"]
    if args.only:
        want = set(args.only.split(","))
        filters = [f for f in filters if f["name"] in want]

    src = pick_source(args.src)
    os.makedirs(args.outdir, exist_ok=True)
    t0 = time.time()
    with tempfile.TemporaryDirectory(prefix="thumbs_") as tmp:
        clip = make_clip(src, os.path.join(tmp, "clip.mp4"))
        bp = before(clip, os.path.join(tmp, "before.png"))
        print(f"source: {src}, frame {FRAME}, {TILE[0]}x{TILE[1]} per half")
        print(f"building {len(filters)} thumbnails with {args.jobs} workers")

        results = []
        with cf.ThreadPoolExecutor(max_workers=args.jobs) as ex:
            futs = {ex.submit(one, f["name"], f["inputs"], clip, bp, tmp,
                              os.path.join(args.outdir, f"{f['name']}.webp"),
                              args.force,
                              f.get("hardware", False)): f for f in filters}
            done = 0
            for fut in cf.as_completed(futs):
                name, ok, why = fut.result()
                results.append((name, ok, why))
                done += 1
                if done % 25 == 0 or done == len(filters):
                    print(f"  {done}/{len(filters)}")

    ok = sorted(n for n, o, _ in results if o)
    failed = {n: w for n, o, w in results if not o}
    # a cached-only run has nothing to say about the ones it skipped
    index = {
        "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": os.path.basename(src),
        "frame": FRAME,
        "tile": list(TILE),
        "count": len(ok),
        "ok": ok,
        "failed": failed,
    }
    json.dump(index, open(os.path.join(args.outdir, "index.json"), "w",
                          encoding="utf-8"), ensure_ascii=False, indent=1)

    size = sum(os.path.getsize(os.path.join(args.outdir, f))
               for f in os.listdir(args.outdir) if f.endswith(".webp"))
    print(f"\n{len(ok)}/{len(results)} filters have a before/after thumbnail "
          f"({size/1024:.0f} KB total) in {time.time()-t0:.0f}s")
    by_group = {}
    for f in filters:
        g = f["group"]
        e = by_group.setdefault(g, [0, 0])
        e[0] += 1
        e[1] += 1 if f["name"] in set(ok) else 0
    print(f"\n{'group':<30} {'filters':>8} {'thumbs':>8}")
    print("-" * 48)
    for g in doc["groups"]:
        if g in by_group:
            print(f"{g:<30} {by_group[g][0]:>8} {by_group[g][1]:>8}")
    if failed:
        print(f"\nno thumbnail ({len(failed)}) - the reason is in index.json:")
        for n, w in sorted(failed.items())[:40]:
            print(f"  {n:<28} {w}")
        if len(failed) > 40:
            print(f"  ... and {len(failed)-40} more")
    return 0


if __name__ == "__main__":
    sys.exit(main())
