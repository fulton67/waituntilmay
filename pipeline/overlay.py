"""Surveillance-style burn-in: "CAM 03" plus a clock that runs continuously
from 00:00:00 regardless of how the footage underneath was cut.

Because the clock is driven by the OUTPUT timeline (drawtext's own timecode at
the output frame rate), edits, freezes and reversals in the source never touch
it - it counts the render, not the talk. The phase number is never shown.
"""
import os

_FONT_CANDIDATES = [
    r"C:\Windows\Fonts\consola.ttf",
    r"C:\Windows\Fonts\cour.ttf",
    r"C:\Windows\Fonts\arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
]


def _font():
    for p in _FONT_CANDIDATES:
        if os.path.exists(p):
            # ffmpeg filter syntax needs the drive colon escaped
            return p.replace("\\", "/").replace(":", r"\:")
    return None


def cam_overlay(seconds, label="CAM 03", fps=24):
    f = _font()
    if not f:
        return None
    common = (f"fontfile='{f}':fontsize=16:fontcolor=white@0.92:"
              "box=1:boxcolor=black@0.40:boxborderw=6")
    cam = f"drawtext={common}:text='{label}':x=22:y=18"
    clock = (f"drawtext={common}:timecode='00\\:00\\:00\\:00':"
             f"rate={fps}:x=w-tw-22:y=18")
    dot = (f"drawtext={common}:text='REC':x=22:y=h-th-18:"
           "fontcolor=white@0.92")
    return ",".join([cam, clock, dot])
