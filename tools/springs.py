"""The FAST LANE springs in Python (same closed form as brand/remotion/src/fast/spring.ts; values from brand/kit/tokens.json)."""
import json, math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_T = json.loads((ROOT / "brand/kit/tokens.json").read_text(encoding="utf-8"))["motion"]["spring"]
SPRINGS = {k: v["$value"] for k, v in _T.items() if not k.startswith("$")}
TOL = 0.005


def step(t, s):
    if t <= 0:
        return 0.0
    k, c, m = s["stiffness"], s["damping"], s["mass"]
    w, z = math.sqrt(k / m), c / (2 * math.sqrt(k * m))
    if z < 1:
        wd = w * math.sqrt(1 - z * z)
        return 1 - math.exp(-z * w * t) * (math.cos(wd * t) + z * w / wd * math.sin(wd * t))
    if z == 1:
        return 1 - math.exp(-w * t) * (1 + w * t)
    r = math.sqrt(z * z - 1); r1, r2 = -w * (z - r), -w * (z + r)
    return 1 - (r2 * math.exp(r1 * t) - r1 * math.exp(r2 * t)) / (r2 - r1)


def first_reach(name, fps=24):
    s = SPRINGS[name]
    return next(f for f in range(1, fps * 20) if step(f / fps, s) >= 1 - TOL)


def settled(name, fps=24):
    s = SPRINGS[name]
    return max([f for f in range(1, fps * 20) if abs(step(f / fps, s) - 1) > TOL] or [0]) + 1


def overshoot(name, fps=24):
    s = SPRINGS[name]
    return max(0.0, max(step(f / fps, s) for f in range(1, fps * 20)) - 1)


if __name__ == "__main__":
    for n in SPRINGS:
        print(n, SPRINGS[n], "first_reach", first_reach(n), "settled", settled(n), f"overshoot {overshoot(n) * 100:.2f} %")
