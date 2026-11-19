"""Jan 08 reel v3: his treatment plan as surgeon's marks on the patient's own frontal photo (P0007, clinic library, consented).

Client (2026-11-19): "the drawings on the face don't really show the injections clearly, just circles"; "every drawing should be
technical ... he's a plastic surgeon". So every mark is a construction a surgeon would draw, from MediaPipe landmarks
(public/jan08/ba.json lm_before, photo px), nothing free-hand:
  - Hinderer's lines (lateral canthus -> oral commissure, alar base -> tragus): the cheekbone's high point is the upper-outer
    quadrant of their crossing. Thin dashed construction lines.
  - the cheekbone treatment zone = that quadrant, bounded by the infraorbital rim and the face edge (hatched outline)
  - the microcannula entry point (an x) below and lateral to the zone, and 3 fanned cannula paths from it onto the bone,
    with the product deposits (beads) along the last part of each path: "the most" product goes here (his words).
  - laugh line, marionette line, lower lid: one entry x + one short path + 1-2 small beads each ("minimal", "a little").
Both sides are mirrored by landmark pairs. Clinical placement: physician-check (Dr. Ostad signs off).

  $PY -I brand/scripts/jan08_plan.py   -> brand/remotion/src/jan08/planV3.ts + brand/edits/jan08-filler-fatigue/v3/plan_preview.jpg
"""
import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
BA = ROOT / "brand/remotion/public/jan08/ba.json"
OUT_TS = ROOT / "brand/remotion/src/jan08/planV3.ts"
PREV = ROOT / "brand/edits/jan08-filler-fatigue/v3/plan_preview.jpg"

# patient's left (image right) -> patient's right (image left) landmark pairs
SIDES = {
    "L": dict(canthus=263, comm=291, ala=358, tragus=454, lid_a=449, lid_b=450, lid_c=339, rim=346, edge=323, low=411, low2=376,
              nl=436, mar=422, jaw=394, mid=266, inner=371),
    "R": dict(canthus=33, comm=61, ala=129, tragus=234, lid_a=229, lid_b=230, lid_c=110, rim=117, edge=93, low=187, low2=147,
              nl=216, mar=202, jaw=169, mid=36, inner=142),
}


def inter(p1, p2, p3, p4):
    d1, d2 = p2 - p1, p4 - p3
    A = np.array([d1, -d2]).T
    t, _ = np.linalg.solve(A, p3 - p1)
    return p1 + t * d1


def side(lm, k, sgn):
    g = {n: np.array(lm[i], float) for n, i in SIDES[k].items()}
    ipd = np.linalg.norm(np.array(lm[263]) - np.array(lm[33]))  # outer canthi distance, the scale unit
    u = ipd / 860.0  # ~1 photo px per unit on this photo
    out = lambda v: np.array([sgn * v[0], v[1]]) * u  # lateral is +x on the patient's left (image right)
    I = inter(g["canthus"], g["comm"], g["ala"], g["tragus"])
    # zone: upper-outer quadrant of Hinderer's crossing, under the infraorbital rim (lid line + 75 u) and inside the face edge
    rim_y = max(g["lid_a"][1], g["lid_b"][1]) + 75 * u
    t_tr = 0.80
    P_tr = g["ala"] + t_tr * (g["tragus"] - g["ala"])
    # canthus-commissure line at rim height
    c1, c2 = g["canthus"], g["comm"]
    P_up = c1 + (rim_y - c1[1]) / (c2[1] - c1[1]) * (c2 - c1)
    P_out = np.array([P_tr[0] - sgn * 20 * u, rim_y + 10 * u])
    zone = [I, P_tr, P_out, P_up]
    # entry: below and lateral to the zone, on the lateral cheek (between landmarks low and low2), 30 u down
    E = 0.5 * (g["low"] + g["low2"]) + out((-10, 20))
    # three fanned paths onto the bone: lateral (along the arch), the high point, medial body (kept under the rim)
    zc = np.mean(zone, axis=0)
    T1 = P_tr + 0.30 * (P_out - P_tr) + out((-30, -10))
    T2 = zc + out((10, -25))
    T3 = P_up + out((40, 25))
    paths = [[E, T] for T in (T1, T2, T3)]
    beads = []
    for (a, b) in paths:
        for t in (0.62, 0.78, 0.93):
            beads.append(a + t * (b - a))
    # laugh line: entry just lateral and below the commissure, path up along the fold toward the ala, 2 small beads
    nlE = g["comm"] + out((70, 40))
    nlT = g["ala"] + out((55, 60))
    # marionette: entry at the jawline below, path up to the corner of the mouth, 2 small beads
    mE = g["jaw"] + out((-5, 25))
    mT = g["comm"] + out((30, 45))
    # lower lid (tear trough): entry at the lateral lid-cheek junction, a short path medially just under the lid line, 1 bead
    lE = g["canthus"] + out((10, 150))
    lT = 0.5 * (g["lid_a"] + g["lid_b"]) + out((-60, 52))
    n = lambda v: v / np.linalg.norm(v)
    lin = lambda a, b, ts: [a + t * (b - a) for t in ts]
    return {
        # the two construction lines, drawn only around their crossing (+-150 u each way) so they do not clutter the lips
        "hinderer": [[I - 150 * u * n(g["comm"] - g["canthus"]), I + 150 * u * n(g["comm"] - g["canthus"])],
                     [I - 150 * u * n(g["tragus"] - g["ala"]), I + 150 * u * n(g["tragus"] - g["ala"])]],
        "cross": I, "zone": zone, "entry": E, "paths": paths, "beads": beads,
        "laugh": {"entry": nlE, "path": [nlE, nlT], "beads": lin(nlE, nlT, (0.55, 0.8))},
        "mar": {"entry": mE, "path": [mE, mT], "beads": lin(mE, mT, (0.6, 0.85))},
        "lid": {"entry": lE, "path": [lE, lT], "beads": lin(lE, lT, (0.9,))},
        "unit": u,
    }


def r(v):
    if isinstance(v, dict):
        return {k: r(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [r(x) for x in v]
    if isinstance(v, np.ndarray):
        return [round(float(v[0]), 1), round(float(v[1]), 1)]
    return round(float(v), 3) if isinstance(v, float) else v


def main():
    lm = json.loads(BA.read_text())["front"]["lm_before"]
    plan = {"L": r(side(lm, "L", +1)), "R": r(side(lm, "R", -1))}
    OUT_TS.write_text("// generated by brand/scripts/jan08_plan.py (do not edit): surgeon's marks in front_before.jpg photo px\n"
                      "export type P2 = [number, number];\n"
                      "export type Minor = { entry: P2; path: P2[]; beads: P2[] };\n"
                      "export type Side = { hinderer: P2[][]; cross: P2; zone: P2[]; entry: P2; paths: P2[][]; beads: P2[]; laugh: Minor; mar: Minor; lid: Minor; unit: number };\n"
                      "export const PLAN: { L: Side; R: Side } = " + json.dumps(plan) + ";\n", encoding="utf-8")
    import cv2
    im = cv2.imread(str(ROOT / "brand/remotion/public/jan08/clinic/front_before.jpg"))
    W = (255, 255, 255)
    P = lambda q: (int(q[0]), int(q[1]))
    for k in "LR":
        s = plan[k]
        for a, b in s["hinderer"]:
            cv2.line(im, P(a), P(b), (200, 200, 200), 3)
        cv2.polylines(im, [np.array(s["zone"], np.int32)], True, W, 5)
        for a, b in s["paths"]:
            cv2.line(im, P(a), P(b), W, 4)
        for q in s["beads"]:
            cv2.circle(im, P(q), 14, W, -1)
        e = s["entry"]
        cv2.drawMarker(im, P(e), W, cv2.MARKER_TILTED_CROSS, 40, 6)
        for z in ("laugh", "mar", "lid"):
            a, b = s[z]["path"]
            cv2.line(im, P(a), P(b), (230, 230, 230), 3)
            cv2.drawMarker(im, P(a), W, cv2.MARKER_TILTED_CROSS, 28, 4)
            for q in s[z]["beads"]:
                cv2.circle(im, P(q), 9, W, -1)
    PREV.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(PREV), cv2.resize(im[1400:3000, 700:2350], None, fx=0.6, fy=0.6))
    print("wrote", OUT_TS, PREV)


if __name__ == "__main__":
    main()
