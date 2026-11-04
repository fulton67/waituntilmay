"""Shared by build_face.py and build_skin_block.py: transparent renders for overlaying on filmed video.

Every sequence is written three ways into renders/{name}/:
  frames/0000.png ...   RGBA PNG sequence (film transparent)
  {name}.webm           VP9 with alpha (yuva420p), plays transparent in browsers and editors that read VP9 alpha
  {name}.mp4            H.264 over black, for anything that cannot take alpha
plus {name}_sheet.jpg: 8 frames on a checkerboard so the transparency is visible at a glance.
"""
import math, pathlib, shutil, subprocess

try:
    import bpy  # inside Blender; encode()/sheet() also run from plain Python
except ImportError:
    bpy = None

FPS = 24


def setup(scene, size=720):
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.resolution_x = scene.render.resolution_y = size
    scene.render.fps = FPS
    scene.view_settings.view_transform = "Standard"


def _frames(outdir):
    d = pathlib.Path(outdir) / "frames"
    if d.exists():
        shutil.rmtree(d)
    d.mkdir(parents=True)
    return d


def turntable(scene, pivot, outdir, frames=72, start_deg=0.0):
    """One full turn of the pivot."""
    d = _frames(outdir)
    for i in range(frames):
        pivot.rotation_euler = (0, 0, math.radians(start_deg + 360 * i / frames))
        scene.render.filepath = str(d / f"{i:04d}.png")
        bpy.ops.render.render(write_still=True)
    pivot.rotation_euler = (0, 0, 0)
    return d


def sweep(scene, cutter, start, end, outdir, frames=48, hold=24, pivot=None, deg=0.0):
    """Move a hidden boolean cutter from start to end (eased), then hold: a cutaway that reveals itself."""
    d = _frames(outdir)
    if pivot is not None:
        pivot.rotation_euler = (0, 0, math.radians(deg))
    for i in range(frames + hold):
        t = min(1.0, i / max(1, frames - 1))
        e = t * t * (3 - 2 * t)
        cutter.location = tuple(a + (b - a) * e for a, b in zip(start, end))
        scene.render.filepath = str(d / f"{i:04d}.png")
        bpy.ops.render.render(write_still=True)
    return d


def encode(outdir, name, size):
    out = pathlib.Path(outdir)
    pat = str(out / "frames" / "%04d.png")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", pat, "-c:v", "libvpx-vp9",
                    "-pix_fmt", "yuva420p", "-auto-alt-ref", "0", "-b:v", "0", "-crf", "30", "-row-mt", "1",
                    str(out / f"{name}.webm")], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"color=c=black:s={size}x{size}:r={FPS}",
                    "-framerate", str(FPS), "-i", pat, "-filter_complex", "[0][1]overlay=shortest=1,format=yuv420p",
                    "-c:v", "libx264", "-crf", "20", "-movflags", "+faststart", str(out / f"{name}.mp4")], check=True)


def sheet(outdir, name):
    """8 evenly spaced frames on a checkerboard so the transparency shows. Needs PIL, which Blender's Python lacks:
    inside Blender this is a no-op and `python render_seq.py` (plain Python) makes every sheet afterwards."""
    try:
        from PIL import Image
    except ImportError:
        return None
    out = pathlib.Path(outdir)
    frames = sorted((out / "frames").glob("*.png"))
    pick = [frames[round(i * (len(frames) - 1) / 7)] for i in range(8)]
    T = 320
    chk = Image.new("RGBA", (T, T), (255, 255, 255, 255))
    for y in range(0, T, 16):
        for x in range(0, T, 16):
            if (x // 16 + y // 16) % 2 == 0:
                chk.paste((204, 204, 204, 255), (x, y, x + 16, y + 16))
    S = Image.new("RGB", (T * 4, T * 2))
    for i, f in enumerate(pick):
        tile = chk.copy(); tile.alpha_composite(Image.open(f).convert("RGBA").resize((T, T)))
        S.paste(tile.convert("RGB"), ((i % 4) * T, (i // 4) * T))
    S.save(out / f"{name}_sheet.jpg", quality=88)
    return out / f"{name}_sheet.jpg"


if __name__ == "__main__":
    R = pathlib.Path(__file__).resolve().parents[1] / "renders"
    for d in sorted(p for p in R.iterdir() if (p / "frames").is_dir()):
        print(sheet(d, d.name))
