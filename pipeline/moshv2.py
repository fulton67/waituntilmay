"""Mosh stage v2: the journey mosh seen through its own glitch, as windows.

v1 was a single pass - corrupt the encoded stream and ship it. v2 keeps that
pass as the base and opens the blocks it damaged onto a second, differently
corrupted version of the same edit:

  A  the v1 journey datamosh, called through pipeline.mosh unchanged
  B  the mv-transfer layer: the same edit re-encoded with the shader's motion
     field written into its vectors, and a P-VOP repeated every DUP_P frames
     so the displacement compounds instead of resetting
  C  the clean edit, as the reference the mask is measured against

The composite is A everywhere and B inside the glitched blocks, with hard
16x16 edges. Which blocks count as glitched, and how the opening escalates,
lives in pipeline/composite.py.

B needs the WebGL shader, which means a browser and a page to host it, so
this stage requires the dev server to be up. It is the slowest part of a
render by a wide margin.
"""
import os
import shutil
import subprocess
import time

from . import composite as CP
from . import mosh as MOSH

DUP_P = 4                 # repeat a P-VOP every N frames in layer B
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _run(cmd, **kw):
    """Run a child and, when it fails, say why.

    check=True on its own raises a CalledProcessError whose message is just
    the exit code; the actual error sits in the captured stderr and is lost.
    """
    try:
        return subprocess.run(cmd, check=True, capture_output=True, text=True,
                              cwd=ROOT, **kw)
    except subprocess.CalledProcessError as e:
        tail = "\n    ".join(
            ((e.stderr or "") + (e.stdout or "")).strip().splitlines()[-10:])
        raise RuntimeError(
            f"{os.path.basename(cmd[1] if len(cmd) > 1 else cmd[0])} "
            f"failed (exit {e.returncode}):\n    {tail}") from None


def server_up(url="http://localhost:3000/mosh-lab"):
    try:
        import urllib.request
        with urllib.request.urlopen(url, timeout=5) as r:
            return r.status == 200
    except Exception:
        return False


def build_b(clean_mp4, out_mp4, tmpdir, url="http://localhost:3000/mosh-lab",
            dup_p=DUP_P, quiet=False, attempts=3, pause_s=10):
    """Layer B via scripts/mosh-mv-transfer.mjs.

    The script names its outputs from --name, so it is pointed at a scratch
    directory: the faces render it also produces is an intermediate here, not
    something the journey piece ships.

    This pass goes through a real browser and a real GPU, which fail
    occasionally for reasons that have nothing to do with the render - a
    context that will not come up, a launch that loses a race. Those failures
    do not repeat, so it is retried rather than allowed to end the batch. A
    fault in the render itself fails all three attempts and still raises.
    """
    os.makedirs(tmpdir, exist_ok=True)
    name = os.path.splitext(os.path.basename(out_mp4))[0]

    def once():
        r = _run(["node", "scripts/mosh-mv-transfer.mjs",
                  "--src", clean_mp4, "--name", name, "--outdir", tmpdir,
                  "--out-name", name, "--k", "1.0", "--dup-p", str(dup_p),
                  "--url", url])
        if not quiet:
            for line in r.stdout.splitlines():
                if "moves:" in line or "applied (read back)" in line:
                    print("  " + line.strip())
        produced = os.path.join(tmpdir, f"{name}.mp4")
        if not os.path.exists(produced):
            raise RuntimeError(f"mv-transfer produced no output at {produced}")
        if os.path.abspath(produced) != os.path.abspath(out_mp4):
            shutil.move(produced, out_mp4)
        return out_mp4

    last = None
    for k in range(attempts):
        try:
            return once()
        except RuntimeError as e:
            last = e
            if k + 1 < attempts:
                print(f"  layer B attempt {k + 1}/{attempts} failed, "
                      f"retrying in {pause_s}s: {e}")
                time.sleep(pause_s)
    raise RuntimeError(f"layer B failed {attempts} times: {last}")


def datamosh_v2(clean_mp4, out_mp4, triggers=(), n_frames=720, gamma=2.0,
                peak=0.7, cfg=None, seed=0, fps=24, tmpdir=".mosh-v2",
                url="http://localhost:3000/mosh-lab", keep_layers=False,
                quiet=False):
    """Drop-in replacement for mosh.datamosh, returning its keys plus the mask.

    Raises if the dev server is not reachable: silently falling back to the v1
    mosh would ship a render that looks nothing like the rest of the batch.
    """
    if not server_up(url):
        raise RuntimeError(
            f"the shader page at {url} is not reachable, so layer B cannot be "
            f"rendered. Start the dev server first (npx next dev).")

    os.makedirs(tmpdir, exist_ok=True)
    base = os.path.splitext(os.path.basename(out_mp4))[0]
    a_mp4 = os.path.join(tmpdir, f"{base}_A.mp4")
    b_mp4 = os.path.join(tmpdir, f"{base}_B.mp4")
    ctl_mp4 = os.path.join(tmpdir, f"{base}_ctl.mp4")

    # ---- A: the v1 mosh, unchanged, with its elementary streams kept
    a = MOSH.datamosh(clean_mp4, a_mp4, triggers=triggers, n_frames=n_frames,
                      gamma=gamma, peak=peak, cfg=cfg, seed=seed,
                      keep_intermediate=True, fps=fps)

    # ---- the control: same encode chain, mosh skipped, for the noise floor
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                    "-fflags", "+genpts", "-r", str(fps), "-f", "m4v",
                    "-i", a["intermediate"]["clean_m4v"], "-an",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "20",
                    "-pix_fmt", "yuv420p", "-r", str(fps),
                    "-movflags", "+faststart", ctl_mp4],
                   check=True, capture_output=True)

    # ---- B: the mv-transfer layer
    build_b(clean_mp4, b_mp4, os.path.join(tmpdir, "mv"), url=url, quiet=quiet)

    # ---- the composite, carrying the edit's own audio
    rep = CP.build(a_mp4, b_mp4, clean_mp4,
                   a["intermediate"]["clean_m4v"],
                   a["intermediate"]["moshed_m4v"],
                   out_mp4, control=ctl_mp4, triggers=triggers,
                   ground_truth=a["moshed_index"], gamma=gamma, peak=peak,
                   crf=20, tmp=os.path.join(tmpdir, "cp"),
                   audio_from=clean_mp4, quiet=quiet)

    if not keep_layers:
        for f in (a_mp4, b_mp4, ctl_mp4,
                  a["intermediate"]["clean_m4v"],
                  a["intermediate"]["moshed_m4v"]):
            try:
                os.remove(f)
            except OSError:
                pass
        shutil.rmtree(os.path.join(tmpdir, "mv"), ignore_errors=True)

    out = dict(a)
    out.pop("intermediate", None)
    out["mask"] = rep
    out["b_coverage_per_second"] = rep["per_second"]
    out["b_coverage_final_pct"] = rep["coverage_final_pct"]
    out["b_detector"] = rep["detector"]
    return out
