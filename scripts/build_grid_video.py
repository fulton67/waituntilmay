"""Stitch every video into ONE silent grid MP4, plus the map that locates
each one inside it.

WHY THIS EXISTS

    "All videos should be playing at the same time, cohesively."

Nineteen YouTube embeds cannot do that. A phone hands out a small fixed
number of hardware video decoders, so nineteen players contend for maybe
eight, and the losers sit paused wearing YouTube's chrome. No embed
parameter reaches that -- it is the device, not the markup.

But the wall is silent. Audio only ever arrives when someone clicks a tile
and the real player opens. And nineteen silent pictures do not actually need
nineteen decoders: they need nineteen RECTANGLES of one picture. So every
video is scaled to one cell and tiled into a single file. The page plays that
one file, hidden, and each tile is a <canvas> drawing its own rectangle out
of it. One decoder. Nineteen tiles. Every device, including the phone.

    grid MP4  : 4 columns x 5 rows of 320x180 cells -> 1280x900, 24fps,
                silent, H.264, faststart, as long as the longest video with
                the shorter ones looped to fill.
    latest.json: which rectangle belongs to which video id, and the name of
                the MP4 those rectangles are in.

TWO PHASES, deliberately. Handing ffmpeg twenty inputs and asking it to
decode, scale, loop and tile them in one pass means twenty live decoders plus
an encoder in one process; that is where it runs out of memory. So each video
is first normalised on its own into a cell-sized clip (phase A, one decode at
a time), and the tiling then reads twenty already-correct clips (phase B).
Phase A is also resumable, which matters when the input is nineteen
downloads.

AGE-RESTRICTED VIDEOS cannot be fetched by yt-dlp without YouTube cookies,
and CI has none. Any id that fails is recorded in `missing` rather than
guessed at: its cell stays black and the front end leaves that tile showing
its poster. Drop a file at media/grid-src/<id>.mp4 and this uses that instead
of the network, which is how such a video gets in.

    python scripts/build_grid_video.py              # download, build, write
    python scripts/build_grid_video.py --no-download # reuse what is cached
    python scripts/build_grid_video.py --probe      # report only, build nothing
"""
import argparse
import hashlib
import io
import json
import os
import shutil
import subprocess
import sys

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
FEED = os.path.join(ROOT, "site", "videos.json")
OVERRIDE = os.path.join(ROOT, "media", "grid-src")
WORK = os.path.join(ROOT, ".grid-work")
OUT = os.path.join(ROOT, "site", "build", "grid")

# One cell is what a tile actually occupies. The wall is three columns, so on
# a 390px phone a tile is about 115px wide; at device-pixel-ratio 3 that is
# 345 real pixels. 320 is the nearest sane 16:9 width, and going higher costs
# bitrate on every one of the nineteen at once.
# 320x180 cells at 1.5 Mbps for the whole grid read as soft and blocky next to the
# films themselves ("they should be high res when you look at them on the
# website"). A tile is drawn about 200 CSS px wide on a desktop and 130 on a
# phone, i.e. ~400 device px on a 2x-3x screen, so 480x270 is the cell that is
# actually sharp there, and the encode is quality-led (CRF) with a ceiling.
CELL_W, CELL_H = 480, 270
COLS, ROWS = 4, 5                 # 20 cells for 19 videos; the spare is black
FPS = 24
BITRATE = "4500k"                 # the CEILING; the encode itself is CRF 22
CRF = "22"


def run(args, **kw):
    return subprocess.run(args, check=True, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", **kw)


def probe_duration(path):
    r = run(["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "format=duration", "-of",
             "default=nw=1:nk=1", path])
    return float(r.stdout.strip())


def feed_ids():
    with open(FEED, encoding="utf-8") as fh:
        d = json.load(fh)
    return [(v["id"], v.get("title", "")) for v in d["videos"]]


def override_for(vid):
    if not os.path.isdir(OVERRIDE):
        return None
    for ext in (".mp4", ".mov", ".webm", ".mkv"):
        p = os.path.join(OVERRIDE, vid + ext)
        if os.path.isfile(p):
            return p
    return None


def fetch(vid, dest_dir, allow_network):
    """A local override wins; otherwise yt-dlp at 360p or less. Returns a path
    or None, and None is a fact to record rather than an error to raise."""
    ov = override_for(vid)
    if ov:
        return ov, "override"
    cached = os.path.join(dest_dir, vid + ".src.mp4")
    if os.path.isfile(cached) and os.path.getsize(cached) > 0:
        return cached, "cached"
    if not allow_network:
        return None, "not cached"
    try:
        run(["yt-dlp", "-q", "--no-warnings", "--no-playlist",
             "-f", "bv*[height<=360]/best[height<=360]/best",
             "--merge-output-format", "mp4",
             "-o", cached, "https://www.youtube.com/watch?v=" + vid])
    except subprocess.CalledProcessError as e:
        tail = (e.stderr or "").strip().splitlines()
        return None, (tail[-1][:160] if tail else "yt-dlp failed")
    if not os.path.isfile(cached):
        return None, "yt-dlp produced nothing"
    return cached, "downloaded"


def make_cell(src, dest, seconds):
    """One video -> one cell-sized silent clip of exactly `seconds`, looping
    the source as many times as it takes. Letterboxed rather than cropped, so
    nothing of the frame is thrown away."""
    vf = ("scale=%d:%d:force_original_aspect_ratio=decrease,"
          "pad=%d:%d:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=%d"
          % (CELL_W, CELL_H, CELL_W, CELL_H, FPS))
    run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
         "-stream_loop", "-1", "-t", "%.3f" % seconds, "-i", src,
         "-vf", vf, "-an",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "16",
         "-pix_fmt", "yuv420p", dest])


def black_cell(dest, seconds):
    run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
         "-f", "lavfi", "-t", "%.3f" % seconds,
         "-i", "color=c=black:s=%dx%d:r=%d" % (CELL_W, CELL_H, FPS),
         "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "30",
         "-pix_fmt", "yuv420p", dest])


def tile(cells, dest):
    """xstack the twenty cells into the one grid file."""
    layout = "|".join("%d_%d" % ((i % COLS) * CELL_W, (i // COLS) * CELL_H)
                      for i in range(len(cells)))
    args = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
    for c in cells:
        args += ["-i", c]
    args += [
        "-filter_complex",
        "".join("[%d:v]" % i for i in range(len(cells)))
        + "xstack=inputs=%d:layout=%s:fill=black[v]" % (len(cells), layout),
        "-map", "[v]", "-an",
        "-c:v", "libx264", "-preset", "medium",
        "-crf", CRF, "-maxrate", BITRATE, "-bufsize", "9000k",
        "-r", str(FPS), "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", dest,
    ]
    run(args)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-download", action="store_true")
    ap.add_argument("--probe", action="store_true")
    ap.add_argument("--check", action="store_true",
                    help="print rebuild/skip and exit; no network, no encode")
    a = ap.parse_args()

    os.makedirs(WORK, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    ids = feed_ids()

    # Rebuilding costs nineteen downloads and a 155-second encode, so the
    # hourly run asks first. The committed map records exactly which ids the
    # live grid was built from; if the feed still names those, the grid on the
    # CDN is already correct and there is nothing to do.
    if a.check:
        want = [v for v, _ in ids]
        try:
            with open(os.path.join(OUT, "latest.json"), encoding="utf-8") as fh:
                have = json.load(fh)
            built = sorted(list(have.get("tiles", {}).keys())
                           + [m["id"] for m in have.get("missing", [])])
        except Exception:
            built = None
        if built == sorted(want):
            # The id list alone is not enough. A video recorded as `missing`
            # keeps its id in the feed, so lifting its age restriction -- or
            # dropping its source into media/grid-src -- changes nothing the
            # list can see, and the grid would never pick it up. So each
            # missing id is re-tested: an override file now present, or a
            # plain metadata probe that now succeeds, both mean rebuild.
            stuck = []
            for m in have.get("missing", []):
                if override_for(m["id"]):
                    print("rebuild (%s now has a local source)" % m["id"])
                    return 10
                try:
                    run(["yt-dlp", "-q", "--no-warnings", "--simulate",
                         "--no-playlist", "--print", "%(duration)s",
                         "https://www.youtube.com/watch?v=" + m["id"]])
                except subprocess.CalledProcessError:
                    stuck.append(m["id"])
                    continue
                print("rebuild (%s is reachable again)" % m["id"])
                return 10
            print("skip (grid %s covers these %d ids%s)"
                  % (have.get("version"), len(want),
                     "; still unreachable: " + ", ".join(stuck) if stuck else ""))
            return 0
        print("rebuild (feed has %d ids; grid covers %s)"
              % (len(want), len(built) if built else "none"))
        return 10
    assert len(ids) <= COLS * ROWS, "grid is %dx%d, feed has %d" % (
        COLS, ROWS, len(ids))

    # ---- phase A.1: get the sources -------------------------------------
    print("sources (%d in the feed)" % len(ids))
    got, missing = [], []
    for vid, title in ids:
        path, how = fetch(vid, WORK, not a.no_download)
        if path:
            got.append((vid, path))
            print("  %-12s %-11s %s" % (vid, how, title[:46]))
        else:
            missing.append({"id": vid, "reason": how})
            print("  %-12s MISSING     %s  <- %s" % (vid, title[:38], how))

    if not got:
        print("\nnothing to build")
        return 1

    seconds = max(probe_duration(p) for _, p in got)
    print("\nlongest source: %.2fs -> grid duration %.2fs" % (seconds, seconds))
    est = float(BITRATE.rstrip("k")) * 1000 * seconds / 8 / 1e6
    print("grid: %dx%d of %dx%d = %dx%d @ %dfps %s  (~%.1f MB estimated)"
          % (COLS, ROWS, CELL_W, CELL_H, COLS * CELL_W, ROWS * CELL_H,
             FPS, BITRATE, est))
    if a.probe:
        return 0

    # ---- phase A.2: one cell at a time ----------------------------------
    print("\ncells")
    order = {vid: i for i, (vid, _) in enumerate(ids)}
    by_id = dict(got)
    cells, tiles = [], {}
    for i, (vid, _title) in enumerate(ids):
        dest = os.path.join(WORK, "cell_%02d.mp4" % i)
        if vid in by_id:
            make_cell(by_id[vid], dest, seconds)
            # dur is the SOURCE's length, not the grid's. A short video loops
            # several times inside one grid pass, so what a tile is showing is
            # at `grid.currentTime % dur` -- which is where the large player
            # has to open for the sound to pick up the picture already running.
            tiles[vid] = {"x": (i % COLS) * CELL_W, "y": (i // COLS) * CELL_H,
                          "w": CELL_W, "h": CELL_H,
                          "dur": round(probe_duration(by_id[vid]), 3)}
        else:
            black_cell(dest, seconds)
        cells.append(dest)
        print("  cell %02d  %-12s %8s B" % (i, vid, os.path.getsize(dest)))
    while len(cells) < COLS * ROWS:                 # the spare cells
        dest = os.path.join(WORK, "cell_%02d.mp4" % len(cells))
        black_cell(dest, seconds)
        cells.append(dest)

    # ---- phase B: tile --------------------------------------------------
    # The name carries a hash of everything that changes the picture, so a
    # rebuilt grid is a new immutable URL and never a stale cache.
    sig = hashlib.sha256(json.dumps(
        {"ids": [v for v, _ in ids], "missing": [m["id"] for m in missing],
         "cell": [CELL_W, CELL_H], "grid": [COLS, ROWS], "fps": FPS,
         "bitrate": BITRATE, "seconds": round(seconds, 2)},
        sort_keys=True).encode()).hexdigest()[:10]

    mp4 = os.path.join(OUT, "sie-grid.%s.mp4" % sig)
    print("\ntiling -> %s" % os.path.basename(mp4))
    tile(cells, mp4)
    size = os.path.getsize(mp4)

    payload = {
        "version": sig,
        # a BASENAME, resolved against the map's own URL by the front end,
        # so the pair works unchanged at site/build/grid/ and at /grid/.
        "mp4": "sie-grid.%s.mp4" % sig,
        "bytes": size,
        "duration": round(seconds, 3),
        "fps": FPS,
        "cell": [CELL_W, CELL_H],
        "grid": [COLS, ROWS],
        "canvas": [COLS * CELL_W, ROWS * CELL_H],
        "tiles": tiles,
        "missing": missing,
    }
    with open(os.path.join(OUT, "latest.json"), "w", encoding="utf-8",
              newline="\n") as fh:
        json.dump(payload, fh, indent=1, sort_keys=True)
        fh.write("\n")
    shutil.copyfile(os.path.join(OUT, "latest.json"),
                    os.path.join(OUT, "sie-grid.%s.json" % sig))

    print("\n  grid   %s  %.2f MB  (%s B)"
          % (os.path.basename(mp4), size / 1e6, format(size, ",")))
    print("  tiles  %d placed, %d missing" % (len(tiles), len(missing)))
    print("  map    site/build/grid/latest.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
