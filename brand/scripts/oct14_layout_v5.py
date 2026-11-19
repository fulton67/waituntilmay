"""Oct 14 reel v5: place every card, plate and title where no face is (client 2026-11-19), from faces_src.json (oct14_faces.py).

  $PY -I brand/scripts/oct14_layout_v5.py      # -> brand/remotion/public/oct14/layout_v5.json + a printed table
Each element has its life [s, e] (composition frames, from the cues), its size, and candidate positions (x fixed per side, y on a
10 px grid between the top safe line 250 and the caption band 1594) and scales (1, 0.9, 0.8). The first candidate whose rect clears
every face box (expanded 10 % + 16 px) on every sampled frame of its life, and every element already placed that overlaps it in time,
wins (preferring the element's usual spot). No fit at any scale -> "takeover": the element is shown on the cream room, full frame,
and the footage is not on screen under it (nothing is covered).
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PUB = ROOT / "brand/remotion/public/oct14"
EDIT = ROOT / "brand/edits/oct14-injection"
W, H, M, TOP, CAP = 1080, 1920, 98, 250, 1594
SEC = 80


def main():
    P = json.loads((PUB / "props.json").read_text())
    # faces on the rendered allowed layer (oct14_faces.py --render) when present: exactly what face_clear.py checks against
    fj = EDIT / "faces_render.json" if (EDIT / "faces_render.json").exists() else EDIT / "faces_src.json"
    faces = {int(k): v for k, v in json.loads(fj.read_text()).items()}
    c = P["cues"]
    S = lambda l: c["start:" + l]
    E = lambda l: c["end:" + l]
    end = P["durationInFrames"]
    # id, s, e, w, h, xs (candidate lefts), preferred y. Order = priority. "parts": extra (s, e, dx, w) rects sharing the same y
    # (CompareClips: the left card alone until "cheeks", then both).
    nameS = 46 + 2 * SEC + 2  # the name card after the title and section 01 (v4 put it under the title)
    els = [
        ("title", 46, 46 + SEC, 884, 300, [M, W - M], 1250, {"scales": (1.0, 0.9, 0.8, 0.7, 0.6)}),  # top right when her close-up fills the bottom
        ("ch01", 46 + SEC + 1, 46 + 2 * SEC + 1, 884, 200, [M], 1250, {}),
        ("name", nameS, nameS + 101, 820, 190, [M], 1380, {"fixed": True}),  # NameCard measured on the render: x 98-~900, y ~1386-1568
        ("pip1", c["dynamic"], c["pip1out"] + 8, 440, 495, [W - M - 440, M], 290, {}),
        ("O1", nameS + 102,  # after the name card (full-width; test 2 render showed the plate cutting its role line)
          E("neuro-more-less") - 2 + 8, 480, 540, [W - M - 480, M], 1060, {"xs_exact": True}),
        ("months", S("intro-lasts"), S("intro-lasts") + 62 + 8, 884, 300, [M], 1180, {}),
        ("days", S("intro-lasts") + 68, E("intro-onset-vs-filler") - 2 + 8, 884, 360, [M], 1120, {}),
        ("ch02", S("intro-midface"), S("intro-midface") + SEC, 884, 200, [M], 1110, {}),
        ("O2", c["deflation"], E("intro-cheekbones") - 2 + 8, 540, 560, [M], 300, {"force": "takeover", "rect": (M, 740)}),  # O2: full width under the compare cards (a takeover: no face to avoid)
        ("compare", c["filled"], E("intro-cheekbones") - 2 + 8, 420, 495, [M], 1010, {"parts": [(c["cheeks"], E("intro-cheekbones") + 6, 464, 420)]}),
        ("pip2", c["literally"], c["pip2out"] + 8, 440, 485, [M, W - M - 440], 1010, {"force": "takeover", "rect": ((W - 440) // 2, 640)}),
        ("O3", c["used"] + 20, S("inj6-bruising") - 2 + 8, 884, 600, [M], 270, {"force": "takeover", "rect": (M, 270)}),
        ("pip3", c["used"], S("inj6-bruising"), 440, 485, [M], 960, {"force": "takeover", "rect": ((W - 440) // 2, 940)}),
        ("O4", S("inj6-bruising"), E("inj6-bruising") + 40 + 8, 884, 600, [M], 270, {"force": "takeover", "rect": (M, 270)}),
        ("ch03", E("inj6-bruising") + 42, E("inj6-bruising") + 42 + SEC, 884, 200, [M], 1140, {}),
    ]
    rooms = [(s, e) for (eid, s, e, w, h, xs, y0, o) in els if o.get("force") == "takeover"]
    on_room = lambda f: any(a <= f < b for a, b in rooms)
    placed, out = [], {}
    for eid, s, e, w, h, xs, y0, o in els:
        if o.get("force") == "takeover":
            x, y = o["rect"]
            out[eid] = {"mode": "takeover", "s": s, "e": e, "x": x, "y": y, "scale": 1.0}
            placed.append((s, e, (x, y, w, h)))
            print(eid, out[eid])
            continue
        fr = [f for f in range(s, e + 1) if f in faces and not on_room(f)]
        best = None
        for sc in ((1.0,) if o.get("fixed") else o.get("scales", (1.0, 0.9, 0.8, 0.7))):
            ww, hh = w * sc, h * sc
            ys = [y0] if o.get("fixed") else sorted(range(TOP, int(CAP - hh) + 1, 10), key=lambda y: abs(y - y0))
            for x in xs:
                xx = x if (x == M or o.get("xs_exact") is None and False) else (W - M - ww if x != M else M)
                for y in ys:
                    rects = [(s, e, (xx, y, ww, hh))] + [(a, b, (xx + dx * sc, y, pw * sc, hh)) for a, b, dx, pw in o.get("parts", [])]
                    bad = any(hit(r, bx) for a, b, r in rects for f in fr if a <= f <= b for bx in faces[f])
                    bad = bad or any(min(b, q[1]) - max(a, q[0]) > 8 and inter(r, q[2]) for a, b, r in rects for q in placed)
                    if not bad:
                        best = {"x": round(xx), "y": y, "scale": sc, "mode": "overlay"}
                        placed.extend(rects)
                        break
                if best:
                    break
            if best:
                break
        if not best:
            best = {"mode": "takeover"}
        best.update({"s": s, "e": e, "faces_frames": len(fr)})
        if "room" in o:
            best["noArrow"] = o["room"]
        out[eid] = best
        print(eid, best)
    out["name"]["at"] = nameS
    (PUB / "layout_v5.json").write_text(json.dumps(out, indent=1))


def hit(r, b, k=0.10, pad=40):
    # pad 40: 16 px of air + the card drop shadow (measured 26 px below a ClipCard on the face_clear test-1 render)
    x, y, w, h = b
    bb = (x - k * w - pad, y - k * h - pad, w * (1 + 2 * k) + 2 * pad, h * (1 + 2 * k) + 2 * pad)
    return inter(r, bb)


def inter(a, b):
    return a[0] < b[0] + b[2] and b[0] < a[0] + a[2] and a[1] < b[1] + b[3] and b[1] < a[1] + a[3]


if __name__ == "__main__":
    main()
