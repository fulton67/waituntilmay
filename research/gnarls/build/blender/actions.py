"""Gnarls in motion: a full-body action reel on the rig, timed from ANIMATION.md.
blender -b gnarls_rig.blend --factory-startup -P actions.py -- OUTDIR [test | frames=a,b,c] [samples=N]
Needs rig_more.py's rig (glasses + horn bones) with look3d.py's look (Cycles, shadow-catcher floor).

Sequence (24 fps): hello idle, jump, wave (right fin), two-fin cheer, present (left fin), twirl, turnaround with a
glance back over the shoulder, a happy settle.

How it moves:
- primary keys per action come straight from ANIMATION.md's tables (local frames, 1-based), interpolated with a
  monotone cubic (slow in / slow out without overshoot unless an overshoot is keyed); the jump's airborne frames are
  the gravity table itself (0.0085 n^2 per frame from the apex);
- squash and stretch on the root, scaled about the base between the flukes with the volume kept (xy = 1/sqrt(s));
- secondary motion is simulated, not keyed: damped springs driven by the body's vertical acceleration (launch,
  free fall, impact) and spin rate give the follow-through on the head, horn, glasses, fins (whip down the chain),
  tail and flukes (left and right tuned apart so they don't move in lockstep);
- breathing and a little drift keep every hold alive;
- face: keyed per phase (eyes lead, then brows, then mouth), blinks from ANIMATION.md 0.4 laid on top (right lid 1 f
  behind the left, none while the ^ eyes are closed, the lids follow the pupils), and a speed limit per frame on every
  mouth control so it can't pop (0.6).
Every frame is baked (keys on frames 3001+) and rendered; actions_video.py lays the frames on white and encodes."""
import json, math, os, sys
import bpy
import numpy as np
from mathutils import Matrix, Vector

A = sys.argv[sys.argv.index("--") + 1:]
OUT = A[0]; os.makedirs(OUT, exist_ok=True)
TEST = "test" in A[1:]
ONLY = next((list(map(int, a.split("=")[1].split(","))) for a in A[1:] if a.startswith("frames=")), None)
SAMPLES = next((int(a.split("=")[1]) for a in A[1:] if a.startswith("samples=")), 48)
sc = bpy.context.scene; cam = sc.camera
arm = next(o for o in sc.objects if o.type == "ARMATURE"); ob = bpy.data.objects["Gnarls"]
PRE = json.loads(sc["gnarls_face_presets"]); CTRL = list(PRE["controls"])
F0 = 3001

# ------------------------------------------------------------------ tracks
TR = {}  # name -> {frame: value}
DEFAULT = {"root.s": 1.0}
cur = {"t0": 0}


def k(name, f, v):
    TR.setdefault(name, {})[cur["t0"] + f - 1] = float(v)


def ks(name, *pairs):
    for f, v in zip(pairs[::2], pairs[1::2]): k(name, f, v)


def kLR(name, *pairs, mirror=False):
    """face pairs: same values on _L and _R; body pairs (mirror=True): R = -L (fins)"""
    for f, v in zip(pairs[::2], pairs[1::2]):
        k(name.replace("*", "L"), f, v); k(name.replace("*", "R"), f, -v if mirror else v)


def pchip(xs, ys, x):
    xs = np.asarray(xs, float); ys = np.asarray(ys, float)
    if len(xs) == 1: return np.full_like(x, ys[0], dtype=float)
    h = np.diff(xs); d = np.diff(ys) / h
    m = np.zeros(len(xs))
    for i in range(1, len(xs) - 1):
        if d[i - 1] * d[i] > 0:
            w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    m[0] = m[-1] = 0.0  # ends ease
    i = np.clip(np.searchsorted(xs, x) - 1, 0, len(xs) - 2)
    t = np.clip((x - xs[i]) / h[i], 0, 1)
    h00, h10, h01, h11 = 2 * t ** 3 - 3 * t ** 2 + 1, t ** 3 - 2 * t ** 2 + t, -2 * t ** 3 + 3 * t ** 2, t ** 3 - t ** 2
    return h00 * ys[i] + h10 * h[i] * m[i] + h01 * ys[i + 1] + h11 * h[i] * m[i + 1]


# ------------------------------------------------------------------ actions (local frames from ANIMATION.md)
SEG = []


def action(name, length):
    cur["t0"] = SEG[-1][1] + SEG[-1][2] if SEG else 0
    SEG.append((name, cur["t0"], length))


BLINKS = []  # (global start, pattern, eyes)
PAT = {"regular": [0, .6, 1, 1, .6, .25, 0], "fast": [0, .6, 1, .5, .15, 0],
       "long": [0, .4, .8, 1, 1, .75, .45, .2, .05, 0]}


def blink(f, kind="regular", eyes="LR"): BLINKS.append((cur["t0"] + f - 1, PAT[kind], eyes))


# --- hello: idle, notice the camera
action("hello", 24)
ks("mouth_smile", 1, 0.6, 24, 0.65); ks("mouth_open", 1, 0.1, 24, 0.1); kLR("brow_raise_*", 1, 0.15, 24, 0.2)
ks("look_x", 1, 0.0, 24, 0.0); blink(9)
for t in ("root.s",): ks(t, 1, 1.0)

# --- jump (48)
action("jump", 48)
ks("root.s", 1, 1.0, 4, 1.0, 12, 0.82, 13, 0.80, 14, 0.81, 15, 0.80, 17, 1.18, 21, 1.00, 23, 0.97, 25, 1.00, 28, 1.10,
   29, 1.08, 31, 0.78, 35, 1.04, 38, 0.99, 41, 1.0, 48, 1.0)
ks("root.z", 1, 0, 16, 0, 17, 0, 18, .094, 19, .171, 20, .230, 21, .273, 22, .298, 23, .307, 24, .298, 25, .273, 26, .230,
   27, .171, 28, .094, 29, 0, 48, 0)
ks("hips.X", 1, 0, 5, 0, 12, 6, 15, 6, 17, -4, 23, 0, 29, 0, 31, 5, 36, 0, 48, 0)
ks("head.X", 1, 0, 7, 0, 14, 8, 17, 0, 19, -4, 23, 0, 31, 0, 35, -3, 40, 0, 48, 0)
kLR("fin_*_1.Y", 1, 0, 5, 0, 13, 25, 15, 25, 19, -45, 23, -55, 27, -50, 29, -20, 32, 15, 36, -8, 42, 0, 48, 0, mirror=True)
ks("tail1.X", 1, 0, 5, 0, 13, 10, 17, -8, 23, -8, 28, 4, 31, 0, 48, 0)
kLR("fluke_*.X", 1, 0, 13, 0, 17, -20, 23, -10, 28, 5, 31, 0, 48, 0)
ks("look_z", 1, 0, 3, 0, 4, 0.25, 5, 0.35, 24, 0.35, 26, -0.4, 30, -0.4, 34, 0, 48, 0)
kLR("brow_angry_*", 1, 0, 3, 0, 6, 0.35, 14, 0.35, 17, 0, 48, 0)
kLR("squint_*", 1, 0, 3, 0, 6, 0.3, 14, 0.3, 17, 0, 29, 0, 30, 0.5, 33, 0, 48, 0)
kLR("brow_raise_*", 1, 0.2, 3, 0.1, 14, 0.0, 17, 0.7, 21, 0.85, 29, 0.85, 31, -0.15, 37, 0.5, 42, 0.35, 48, 0.3)
ks("mouth_smile", 1, 0.65, 5, 0.6, 10, 0.2, 15, 0.2, 17, 0.6, 21, 0.85, 32, 0.85, 36, 1.0, 48, 0.8)
ks("mouth_wide", 1, 0, 5, 0, 10, 0.35, 15, 0.35, 17, 0.25, 29, 0.25, 31, 0.5, 36, 0.35, 48, 0.2)
ks("mouth_open", 1, 0.1, 5, 0.1, 10, 0, 15, 0, 17, 0.45, 21, 0.6, 29, 0.6, 31, 0.3, 36, 0.35, 48, 0.25)
ks("sparkle", 1, 0, 18, 0, 22, 1, 40, 1, 48, 0.5)
ks("pupil_small", 1, 0, 18, 0, 21, 0.15, 29, 0.15, 32, 0, 48, 0)
kLR("happy_*", 1, 0, 31, 0, 36, 1, 43, 1, 48, 0.6)
blink(11); blink(28, "fast")

# --- wave, character's right fin (52)
action("wave", 52)
ks("head.Z", 1, 0, 6, -6, 44, -6, 52, 0)
ks("fin_R_1.Y", 1, 0, 8, -8, 15, 75, 16, 80, 18, 75, 40, 75, 47, -4, 50, 0, 52, 0)
for f in range(17, 41):
    k("fin_R_2.Y", f, 20 + 18 * math.sin(2 * math.pi * (f - 17) / 12))
    k("fin_R_3.Y", f, 10 + 28 * math.sin(2 * math.pi * (f - 19) / 12))
    k("tail1.Z", f, 4 * math.sin(2 * math.pi * (f - 21) / 12))
    k("head.Y", f, -3 * math.sin(2 * math.pi * (f - 19) / 12))
ks("fin_R_2.Y", 1, 0, 9, 0, 16, 20, 44, 20, 50, 0, 52, 0); ks("fin_R_3.Y", 1, 0, 10, 0, 16, 10, 44, 10, 51, 0, 52, 0)
ks("tail1.Z", 1, 0, 16, 0, 46, 0, 52, 0); ks("head.Y", 1, 0, 16, 0, 44, 0, 52, 0)
ks("chest.Y", 1, 0, 5, 0, 8, 2, 12, -4, 40, -4, 46, 0, 52, 0)
ks("head.X", 1, 0, 9, 0, 15, -4, 40, -4, 46, 0, 52, 0)
ks("fin_L_1.Y", 1, 0, 9, 0, 16, 5, 44, 5, 50, 0, 52, 0)
kLR("brow_raise_*", 4, 0.45, 48, 0.45, 52, 0.3)
ks("mouth_smile", 4, 0.7, 8, 0.7, 16, 0.85, 52, 0.8)
ks("mouth_open", 6, 0.15, 10, 0.1, 16, 0.3, 40, 0.3, 46, 0.15, 52, 0.15)
ks("mouth_wide", 6, 0.2, 41, 0.2, 46, 0.3, 52, 0.25)
ks("sparkle", 4, 0.4, 10, 0.3, 16, 0.6, 46, 0.6, 52, 0.4)
kLR("happy_*", 4, 0.3, 9, 0.0, 16, 0.35, 41, 0.35, 46, 0.6, 52, 0.3)
blink(5)

# --- two-fin cheer (44)
action("cheer", 44)
for f in range(19, 35):
    v = -68 + 10 * math.cos(2 * math.pi * (f - 19) / 8)
    k("fin_L_1.Y", f, v); k("fin_R_1.Y", f, -v)
    k("root.s", f, 1 - 0.015 * (1 + math.cos(2 * math.pi * (f - 19) / 8)))
    k("mouth_open", f, 0.725 + 0.075 * math.cos(2 * math.pi * (f - 19) / 8 + math.pi))
kLR("fin_*_1.Y", 1, 0, 8, 20, 12, -78, 16, -68, 35, -68, 42, 6, 44, 0, mirror=True)
kLR("fin_*_3.Y", 1, 0, 8, 15, 12, 0, 44, 0, mirror=True)
ks("root.s", 1, 1.0, 8, 0.92, 11, 1.12, 15, 1.0, 17, 0.94, 18, 0.98, 35, 1.0, 44, 1.0)
ks("root.z", 1, 0, 11, 0, 12, 0.025, 13, 0.04, 14, 0.035, 15, 0.02, 16, 0.006, 17, 0, 44, 0)
ks("root.yaw", 1, 0, 9, 0, 13, 12, 35, 12, 44, 0)
ks("hips.X", 1, 0, 8, 4, 11, 0, 44, 0); ks("tail1.X", 1, 0, 8, 6, 12, 0, 44, 0)
kLR("brow_raise_*", 4, 0.4, 9, 0.4, 13, 1.0, 18, 0.9, 34, 0.9, 44, 0.45)
kLR("squint_*", 1, 0, 4, 0.2, 9, 0.2, 13, 0, 44, 0)
ks("mouth_smile", 4, 0.4, 8, 0.4, 13, 1.0, 44, 0.85)
ks("mouth_wide", 4, 0.3, 8, 0.3, 13, 0.4, 35, 0.4, 42, 0.55, 44, 0.5)
ks("mouth_open", 4, 0.0, 8, 0.0, 13, 0.8, 18, 0.8, 35, 0.8, 42, 0.3, 44, 0.3)
kLR("happy_*", 4, 0.0, 9, 0, 13, 1, 35, 1, 44, 0.7)
ks("sparkle", 4, 0.3, 13, 0, 16, 1, 44, 0.6)
blink(4)

# --- present, left fin (54)
action("present", 54)
ks("look_x", 1, 0, 2, 0.5, 3, 0.7, 28, 0.7, 29, 0.5, 31, 0, 54, 0)
k("brow_raise_L", 5, 0.6); k("brow_raise_L", 18, 0.7); k("brow_raise_L", 44, 0.7); k("brow_raise_L", 54, 0.3)
k("brow_raise_R", 5, 0.3); k("brow_raise_R", 44, 0.3); k("brow_raise_R", 54, 0.3)
ks("head.Z", 1, 0, 4, 0, 10, 18, 30, 18, 36, 8, 44, 8, 54, 0)
ks("chest.Z", 1, 0, 6, 0, 12, 8, 44, 8, 54, 0)
ks("fin_L_1.Z", 1, 0, 8, 0, 13, 15, 18, -60, 22, -55, 44, -55, 54, 0)
ks("fin_L_1.Y", 1, 0, 8, 0, 13, 10, 18, -35, 22, -35, 34, -37, 44, -35, 54, 0)
ks("fin_L_2.Z", 1, 0, 14, 0, 18, -20, 44, -20, 54, 0)
ks("fin_L_3.Y", 1, 0, 8, 0, 13, 20, 18, 0, 54, 0)
ks("chest.Y", 1, 0, 8, 0, 13, 3, 18, -4, 44, -4, 54, 0)
ks("mouth_smirk", 1, 0, 4, 0, 10, 0.35, 30, 0.35, 36, 0.5, 44, 0.5, 54, 0.2)
ks("mouth_smile", 4, 0.8, 8, 0.45, 13, 0.4, 18, 0.7, 54, 0.7)
ks("mouth_open", 4, 0.2, 8, 0.0, 13, 0, 18, 0.25, 30, 0.15, 54, 0.1)
ks("mouth_wide", 4, 0.4, 12, 0.15, 54, 0.15)
ks("sparkle", 4, 0.5, 14, 0, 18, 0.5, 54, 0.4)
kLR("happy_*", 3, 0.6, 7, 0, 54, 0)
blink(4); blink(29)

# --- twirl (40): root Z + (to the character's left)
action("twirl", 40)
Y = 0.0
ks("root.yaw", 1, Y, 4, Y, 12, Y - 30, 14, Y - 30, 15, Y - 26, 16, Y - 12, 17, Y + 12, 18, Y + 48, 19, Y + 92, 20, Y + 138,
   21, Y + 184, 22, Y + 230, 23, Y + 274, 24, Y + 314, 25, Y + 346, 26, Y + 366, 27, Y + 372, 29, Y + 366, 31, Y + 358,
   33, Y + 360, 40, Y + 360)
ks("root.s", 1, 1, 4, 1, 12, 0.92, 14, 0.92, 17, 1.06, 27, 1.06, 29, 0.96, 33, 1.0, 40, 1.0)
ks("root.z", 1, 0, 15, 0, 17, 0.015, 26, 0.015, 28, 0, 40, 0)
ks("chest.Z", 1, 0, 5, 0, 12, -8, 15, 0, 40, 0)
ks("head.Z", 1, 0, 14, 0, 16, 15, 20, 0, 25, -10, 29, 0, 40, 0)
kLR("fin_*_1.Z", 1, 0, 5, 0, 12, 20, 15, 0, 40, 0)
ks("head.Y", 1, 0, 33, 0, 35, 4, 38, -2, 40, 0)
ks("look_x", 1, 0, 2, 0.4, 4, 0.6, 30, 0.6, 32, 0, 40, 0)
kLR("brow_raise_*", 6, 0.3, 27, 0.3, 29, 0.75, 35, 0.5, 40, 0.45)
ks("mouth_smirk", 4, 0.2, 8, 0.3, 14, 0.3, 17, 0, 40, 0)
ks("mouth_smile", 6, 0.6, 15, 0.9, 27, 0.9, 30, 1.0, 40, 0.9)
ks("mouth_open", 6, 0.1, 14, 0.1, 18, 0.5, 26, 0.5, 30, 0.3, 40, 0.3)
ks("mouth_round", 1, 0, 14, 0, 18, 0.15, 26, 0.15, 31, 0, 40, 0)
ks("mouth_wide", 4, 0.15, 14, 0.15, 18, 0.1, 27, 0.2, 32, 0.4, 40, 0.35)
kLR("happy_*", 1, 0, 13, 0, 16, 1, 26, 1, 30, 0, 40, 0)
ks("sparkle", 4, 0.4, 14, 0.2, 27, 0, 30, 1, 40, 0.7)
blink(11)

# --- turnaround (176): turning to the character's right (root Z -), so the glance back faces this camera
action("turnaround", 176)
Y = 360.0
ks("root.yaw", 1, Y, 12, Y, 64, Y - 180, 80, Y - 180, 84, Y - 184, 92, Y - 105, 110, Y - 105, 118, Y - 180, 164, Y - 362,
   170, Y - 360, 176, Y - 360)
ks("head.Z", 1, 0, 13, 0, 19, -8, 58, 0, 64, 6, 70, 0, 84, 0, 90, 35, 110, 35, 116, 0, 118, 0, 124, -8, 160, 0, 166, 4, 172, 0, 176, 0)
ks("head.Y", 1, 0, 92, 0, 96, 4, 110, 4, 116, 0, 176, 0)
ks("chest.Z", 1, 0, 84, 0, 92, 10, 110, 10, 116, 0, 176, 0)
ks("head.X", 1, 0, 80, 0, 82, 3, 86, 0, 176, 0)
for f in range(64, 81):
    k("fluke_L.X", f, 8 * math.sin(2 * math.pi * (f - 64) / 8)); k("fluke_R.X", f, 8 * math.sin(2 * math.pi * (f - 67) / 8))
ks("fluke_L.X", 1, 0, 63, 0, 82, 0, 176, 0); ks("fluke_R.X", 1, 0, 63, 0, 84, 0, 176, 0)
ks("look_x", 1, 0, 9, 0, 10, 0.35, 11, 0.5, 20, 0, 80, 0, 81, 0.7, 82, 1.0, 108, 1.0, 112, 0, 176, 0)
ks("mouth_smile", 1, 0.9, 6, 0.6, 90, 0.5, 96, 0.6, 110, 0.6, 116, 0.5, 150, 0.5, 158, 0.8, 176, 0.8)
ks("mouth_open", 1, 0.3, 8, 0.1, 150, 0.1, 158, 0.2, 176, 0.2)
ks("mouth_wide", 1, 0.35, 10, 0.15, 176, 0.15)
ks("mouth_smirk", 1, 0, 90, 0, 96, 0.55, 110, 0.55, 116, 0.2, 140, 0.2, 158, 0, 176, 0)
k("brow_raise_L", 6, 0.35); k("brow_raise_L", 90, 0.3); k("brow_raise_L", 96, 0.6); k("brow_raise_L", 110, 0.6)
k("brow_raise_L", 116, 0.3); k("brow_raise_L", 158, 0.4); k("brow_raise_L", 176, 0.4)
k("brow_raise_R", 6, 0.35); k("brow_raise_R", 90, 0.3); k("brow_raise_R", 96, 0.15); k("brow_raise_R", 110, 0.15)
k("brow_raise_R", 116, 0.3); k("brow_raise_R", 158, 0.4); k("brow_raise_R", 176, 0.4)
kLR("squint_*", 1, 0, 90, 0, 96, 0.2, 110, 0.2, 116, 0, 176, 0)
ks("sparkle", 1, 0.7, 10, 0.3, 90, 0.2, 96, 0.6, 110, 0.6, 116, 0.3, 164, 0.5, 176, 0.5)
kLR("happy_*", 1, 0, 164, 0, 170, 0.4, 176, 0.4)
blink(13, "long"); blink(84); blink(100, eyes="L"); blink(110); blink(152, "long")

# --- happy settle (30)
action("settle", 30)
ks("mouth_smile", 1, 0.8, 10, 1.0, 30, 0.95); ks("mouth_open", 1, 0.2, 10, 0.45, 30, 0.4); ks("mouth_wide", 1, 0.15, 10, 0.3, 30, 0.3)
kLR("happy_*", 1, 0.4, 10, 0.9, 30, 0.9); ks("sparkle", 1, 0.5, 30, 0.5); kLR("brow_raise_*", 1, 0.4, 10, 0.6, 30, 0.55)
ks("root.s", 1, 1.0, 6, 0.95, 10, 1.04, 14, 1.0, 30, 1.0)
kLR("fin_*_1.Y", 1, 0, 6, 8, 11, -20, 16, -14, 30, -14, mirror=True)

N = SEG[-1][1] + SEG[-1][2]
fr = np.arange(N, dtype=float)
names = set(TR) | {"root.z", "root.s", "root.yaw"}
V = {}
for n in names:
    d = TR.get(n, {})
    if not d: V[n] = np.full(N, DEFAULT.get(n, 0.0)); continue
    xs = sorted(d); ys = [d[x] for x in xs]
    if xs[0] > 0: xs = [0] + xs; ys = [DEFAULT.get(n, 0.0) if n.count(".") else ys[0]] + ys
    if xs[-1] < N - 1: xs = xs + [N - 1]; ys = ys + [ys[-1]]
    V[n] = pchip(xs, ys, fr)
def get(n): return V.get(n, np.full(N, DEFAULT.get(n, 0.0)))

# ------------------------------------------------------------------ secondary motion: damped springs
def spring(signal, period, zeta, sub=6):
    w0 = 2 * math.pi / period; x = v = 0.0; out = np.zeros(len(signal)); dt = 1.0 / sub
    for i, s in enumerate(signal):
        for _ in range(sub):
            a = w0 * w0 * (s - x) - 2 * zeta * w0 * v; v += a * dt; x += v * dt
        out[i] = x
    return out


z = get("root.z"); az = np.gradient(np.gradient(z))
s_ = get("root.s"); ds = np.gradient(s_)
yaw = get("root.yaw"); om = np.gradient(yaw)
g_t = np.arange(N)
breath = np.sin(2 * math.pi * g_t / 72.0)
SEC = {}
SEC["head.X"] = spring(az * 140 + ds * 60, 9, 0.45)
SEC["horn.X"] = spring(az * 120 + ds * 50, 6, 0.25)
SEC["glasses.z"] = np.clip(spring(-az * 0.12 - ds * 0.04, 5, 0.35), -0.006, 0.006)
lift = spring(az * 260 + ds * 120, 10, 0.35)                     # fins drop on impact, float up in free fall
fly = spring(-np.minimum(np.abs(om) * 0.8, 40), 12, 0.5)          # fins fly out in a spin
drag = spring(-om * 0.45, 10, 0.4)
SEC["fin_L_1.Y"] = lift + fly; SEC["fin_R_1.Y"] = -lift - fly
SEC["fin_L_1.Z"] = drag; SEC["fin_R_1.Z"] = drag
for sd, sg in (("L", 1), ("R", -1)):
    f1 = get(f"fin_{sd}_1.Y") + SEC[f"fin_{sd}_1.Y"]
    w2 = spring(-np.gradient(f1) * 1.0, 7, 0.35); SEC[f"fin_{sd}_2.Y"] = w2
    SEC[f"fin_{sd}_3.Y"] = spring(-np.gradient(f1 + w2) * 1.2, 6, 0.3)
SEC["tail1.X"] = spring(-az * 200 - ds * 80, 9, 0.3); SEC["tail2.X"] = spring(-az * 260 - ds * 100, 8, 0.28)
SEC["tail1.Z"] = spring(-om * 0.35, 12, 0.4); SEC["tail2.Z"] = 1.3 * spring(-om * 0.35, 11, 0.35)
SEC["fluke_L.X"] = spring(az * 380 + ds * 150, 8, 0.25); SEC["fluke_R.X"] = spring(az * 380 + ds * 150, 8.6, 0.25)
SEC["chest.X"] = 1.0 * breath
for n_, a_ in SEC.items(): V[n_] = get(n_) + a_
V["root.s"] = get("root.s") * (1 + 0.008 * breath)

# ------------------------------------------------------------------ face: blinks, lid rules, mouth speed limits
for c in CTRL:
    if c not in V: V[c] = np.zeros(N)
bl = {"L": np.zeros(N), "R": np.zeros(N)}
for st, pat, eyes in BLINKS:
    for e in eyes:
        off = 1 if (e == "R" and eyes == "LR") else 0
        for i, p in enumerate(pat):
            f = st + i + off
            if 0 <= f < N: bl[e][f] = max(bl[e][f], p)
for e in ("L", "R"):
    hap = V[f"happy_{e}"]
    lid = np.where(hap > 0.5, 0, bl[e])
    lid = np.maximum(lid, np.clip(-(V["look_z"] + 0.3) * 0.6, 0, 0.3))  # lids follow the pupils down
    V[f"blink_{e}"] = np.maximum(V[f"blink_{e}"], lid)
LIM = {"mouth_open": 0.25, "mouth_smile": 0.2, "mouth_wide": 0.2, "mouth_round": 0.2, "mouth_smirk": 0.15,
       "happy_L": 0.3, "happy_R": 0.3}
for c, lim in LIM.items():
    x = V[c].copy()
    for i in range(1, N): x[i] = x[i - 1] + np.clip(x[i] - x[i - 1], -lim, lim)
    V[c] = x
V["mouth_wide"] = np.minimum(V["mouth_wide"], 1 - 1.5 * V["mouth_round"])
for c, (lo, hi) in PRE["controls"].items(): V[c] = np.clip(V[c], lo, hi)

# ------------------------------------------------------------------ apply + bake
PB = arm.pose.bones
for pb in PB: pb.rotation_mode = "QUATERNION"
REST = {pb.name: pb.bone.matrix_local.copy() for pb in PB}
BASE = Vector((0, 0.014, 0.0))


def world_rot(name, deg_xyz):
    B = REST[name].to_3x3()
    R = Matrix.Rotation(math.radians(deg_xyz[2]), 3, "Z") @ Matrix.Rotation(math.radians(deg_xyz[1]), 3, "Y") @ \
        Matrix.Rotation(math.radians(deg_xyz[0]), 3, "X")
    return (B.inverted() @ R @ B).to_quaternion()


BONES = ["hips", "spine", "chest", "head", "horn", "fin_L_1", "fin_L_2", "fin_L_3", "fin_R_1", "fin_R_2", "fin_R_3",
         "tail1", "tail2", "fluke_L", "fluke_R"]
arm.animation_data_clear()
labels = []
for i in range(N):
    f = F0 + i
    s = float(V["root.s"][i]); sxy = 1 / math.sqrt(s)
    T = Matrix.Translation((0, 0, float(V["root.z"][i]))) @ Matrix.Translation(BASE) @ \
        Matrix.Rotation(math.radians(float(V["root.yaw"][i])), 4, "Z") @ Matrix.Diagonal((sxy, sxy, s, 1)) @ Matrix.Translation(-BASE)
    R = REST["root"]
    PB["root"].matrix_basis = R.inverted() @ T @ R
    for b in BONES:
        PB[b].rotation_quaternion = world_rot(b, [float(get(f"{b}.{ax}")[i]) for ax in "XYZ"])
        PB[b].location = (0, 0, 0); PB[b].scale = (1, 1, 1)
    gz = float(get("glasses.z")[i])
    G = REST["glasses"]; PB["glasses"].matrix_basis = G.inverted() @ Matrix.Translation((0, 0, gz)) @ G
    for b in ["root", "glasses"] + BONES:
        for path in ("rotation_quaternion", "location", "scale"): PB[b].keyframe_insert(path, frame=f)
    for c in CTRL:
        arm[c] = float(V[c][i]); arm.keyframe_insert(f'["{c}"]', frame=f)
    seg = next(n for n, t0, ln in SEG if t0 <= i < t0 + ln)
    labels.append({"frame": i, "action": seg})
json.dump({"labels": labels, "segments": SEG}, open(os.path.join(OUT, "labels.json"), "w"))
print("baked", N, "frames,", round(N / 24, 1), "s; segments", [(n, ln) for n, _, ln in SEG])
sc.frame_start, sc.frame_end = F0, F0 + N - 1; sc.render.fps = 24; sc["gnarls_reel"] = [F0, F0 + N - 1]

# ------------------------------------------------------------------ camera, render
for n in ("prop_sign", "prop_stick"):
    o = bpy.data.objects.get(n)
    if o: o.hide_render = True; o.animation_data_clear()
cam.data.type = "PERSP"; cam.data.lens = 70; cam.data.sensor_fit = "AUTO"; cam.data.clip_start = 0.1; cam.data.clip_end = 50
sc.render.resolution_x, sc.render.resolution_y = 1080, 1350
a, e = math.radians(-22), math.radians(7)
fwd = Vector((-math.sin(a) * math.cos(e), math.cos(a) * math.cos(e), -math.sin(e)))
target = Vector((0, 0.014, 0.68)); dist = 0.78 / math.tan(math.atan(18 / 70)) + 0.1
cam.location = target - fwd * dist; cam.rotation_euler = fwd.to_track_quat("-Z", "Y").to_euler()
sc.render.film_transparent = True
sc.cycles.samples = SAMPLES if not TEST else min(SAMPLES, 24)
sc.render.use_motion_blur = True; sc.render.motion_blur_shutter = 0.5
p = bpy.context.preferences.addons["cycles"].preferences
for t in ("OPTIX", "CUDA"):
    try:
        p.compute_device_type = t; p.get_devices()
        if any(d.type == t for d in p.devices):
            for d in p.devices: d.use = d.type == t
            sc.cycles.device = "GPU"; break
    except Exception: pass
sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
sc.frame_set(F0)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "gnarls_actions.blend"), copy=True)  # scrub it in Blender
frames = range(N)
if TEST:
    t = {n: t0 for n, t0, _ in SEG}
    frames = [t["jump"] + 12, t["jump"] + 22, t["jump"] + 30, t["jump"] + 35, t["wave"] + 24, t["cheer"] + 13,
              t["present"] + 26, t["twirl"] + 20, t["turnaround"] + 70, t["turnaround"] + 100]
if ONLY: frames = ONLY
for i in frames:
    sc.frame_set(F0 + i)
    sc.render.filepath = os.path.join(OUT, f"f_{i:04d}.png")
    bpy.ops.render.render(write_still=True)
    print("frame", i, flush=True)
