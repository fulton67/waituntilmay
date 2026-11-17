"""lint_compositions.py: fail any Remotion composition that draws a dot-and-line callout, or any render whose image layers hold still.

Two modes; each exits 1 on a violation, 0 when clean, 2 on bad input.

1) Dot-and-line lint (default):  python -I lint_compositions.py brand/remotion/src/OstadYT6.tsx [more.tsx ...]
   Reads the TSX, splits it into top-level components, and resolves relative imports (recursively) so a banned component
   defined in another file is caught where it is *used*. Rules, each from a pattern we actually shipped (DECISIONS 14i):
     DOT1  a small filled <circle> (r <= 12) and a straight stroke (path "M..L/H/V", <line>, 2-point <polyline>) share an endpoint
           -> components/YT.tsx Callout, OstadYT.tsx Lead and HeadNotes (v4.1)
     DOT2  a small filled <circle> placed from a bead / dot / tip / travel / bez( / cub( / pts[0] expression, in a component that
           strokes a path and has no arrowhead  -> storyboard/kit.tsx Thread + Lead, Markup.tsx Ring's riding tip, OstadYT S2 bead
     DOT3  a small round <div> dot (w, h <= 14, borderRadius) in a component that also strokes a straight leader or uses a LEAD
           component, with no arrowhead  -> Markup.tsx Pin
     RING  an open <circle> with a headless straight stroke whose endpoint is built from the circle's cx / cy -> OstadYT5.tsx (v5)
     LEAD  a component named *Callout / *Lead / *Leader / *Pin that strokes a straight line and has no arrowhead
           (arrow-leader-hairline, banned as an arrow)  -> Markup.tsx Callout
     PROP  a JSX element given a `bead=` or `dot` prop
     USE   a JSX element whose component is flagged by any rule above (local or imported)
   An arrowhead is structural: markerEnd / marker-end / <marker / <polygon / data-arrowhead, or an open chevron (a 3-point
   <polyline>, or a path "M..L..L" with nothing else). Names don't count (`head_final_anim.mp4` is not a head). New arrows (devices/Arrow.tsx) put `data-arrowhead` on the head element.
   Escape hatch: `// lint-ok: <reason>` on the offending line (the reason is printed). Use it only for things that are not
   callouts (e.g. synapse vesicles), never for a pointer.

2) No-static-image check:  python -I lint_compositions.py --static-image render.mp4 --beats research/ostad/style/exomind/beats.json
   Chosen over a render-time helper (DECISIONS 14i). It measures the pixels that shipped, not the code that meant to move them:
     a) beats.json analysis: every asset of kind "image" must have an `image_layers` entry (box + span), else FAIL.
     b) frame diff: for each image layer, sample the box every 4 f from from_f + 14 (after the `arrive`) to to_f - 7 (before
        the `exit`); the layer is STATIC if the largest mean-absolute grey difference against the first sample stays under the
        calibrated threshold (`--thresh`, default from `--calibrate`). Static = FAIL.
   `--calibrate` encodes a still and a 1 % zoom over 2 s at the render settings (crf 16) and prints the noise floor, the
   moving minimum and the threshold between them.
"""
from __future__ import annotations
import argparse, json, re, subprocess, sys, tempfile
from dataclasses import dataclass, field
from pathlib import Path

# ----------------------------------------------------------------------------------------------- TSX scanning helpers
TOP = re.compile(r"^(?:export\s+)?(?:const|function|let)\s+([A-Za-z_]\w*)", re.M)
ARROWHEAD = re.compile(r"markerEnd|marker-end|<marker|<polygon|data-arrowhead")
COMMENT = re.compile(r"/\*.*?\*/|//[^\n]*", re.S)
RIDING = re.compile(r"\b(?:bead|dot|tip|travel)\w*|\bbez\(|\bcub\(|pts\[0\]", re.I)
LEADNAME = re.compile(r"(?:Callout|Lead|Leader|Pin)$")
LINT_OK = re.compile(r"//\s*lint-ok:\s*(.+)")


def tags(src: str, name: str):
    """Yield (start_offset, element_text) for every <name ...> or <name .../> element, scanning braces so `=>` inside {} is fine."""
    for m in re.finditer(rf"<{name}\b", src):
        i, depth, quote = m.end(), 0, None
        while i < len(src):
            c = src[i]
            if quote:
                if c == quote and src[i - 1] != "\\":
                    quote = None
            elif c in "\"'`" and depth == 0:
                quote = c
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
            elif c == ">" and depth == 0:
                yield m.start(), src[m.start(): i + 1]
                break
            i += 1


def attr(el: str, key: str) -> str | None:
    m = re.search(rf"\b{key}=", el)
    if not m:
        return None
    i = m.end()
    if el[i] in "\"'":
        j = el.index(el[i], i + 1)
        return el[i + 1: j]
    if el[i] == "{":
        depth, j = 0, i
        while j < len(el):
            depth += el[j] == "{"
            depth -= el[j] == "}"
            if depth == 0:
                return el[i + 1: j].strip()
            j += 1
    return None


def has_arrowhead(code: str) -> bool:
    """A real head: a marker, a polygon, data-arrowhead, or an open chevron (a 3-point polyline, or a path M..L..L with nothing else)."""
    if ARROWHEAD.search(code):
        return True
    for _, el in tags(code, "polyline"):
        p = attr(el, "points") or ""
        if ".map(" not in p and len(re.findall(r",", p)) == 3:
            return True
    for _, el in tags(code, "path"):
        d = (attr(el, "d") or "").replace("`", " ")
        cmds = re.findall(r"(?<![\w$.])([MLHVCSQTAZmlhvcsqtaz])(?=[\s\d$\-{(.])", d)
        if [c.upper() for c in cmds] == ["M", "L", "L"]:
            return True
    return False


norm = lambda s: re.sub(r"\s+", "", s or "").strip("{}$")


def small_r(r: str | None) -> bool:
    if r is None:
        return False
    m = re.search(r"\d+(?:\.\d+)?", r)
    return bool(m) and float(m.group()) <= 12


def filled(el: str) -> bool:
    f = attr(el, "fill")
    return f is not None and f.strip().strip("\"'") not in ("none", "transparent")


def straight_strokes(body: str):
    """Yield (offset, [endpoints as normalised 'x|y' strings]) for straight strokes."""
    for off, el in tags(body, "path"):
        d = attr(el, "d")
        if d is None:
            continue
        cmds = re.findall(r"(?<![\w$.])([MLHVCSQTAZmlhvcsqtaz])(?=[\s\d$\-{(.])", d.replace("`", " "))
        if not cmds or any(c.upper() in "CSQTA" for c in cmds) or len([c for c in cmds if c.upper() in "LHV"]) != 1:
            continue
        pts = re.findall(r"[ML]\s*\$\{([^}]*)\}[\s,]*\$\{([^}]*)\}", d) + re.findall(r"[ML]\s*(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)", d)
        yield off, [f"{norm(a)}|{norm(b)}" for a, b in pts]
    for off, el in tags(body, "line"):
        x1, y1, x2, y2 = (attr(el, k) for k in ("x1", "y1", "x2", "y2"))
        if x1 is not None:
            yield off, [f"{norm(x1)}|{norm(y1)}", f"{norm(x2)}|{norm(y2)}"]
    for off, el in tags(body, "polyline"):
        p = attr(el, "points")
        if p is None or ".map(" in p:
            continue
        pairs = re.findall(r"\$\{([^}]*)\}\s*,\s*\$\{([^}]*)\}", p) or re.findall(r"(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)", p)
        if len(pairs) == 2:
            yield off, [f"{norm(a)}|{norm(b)}" for a, b in pairs]


def any_stroke(body: str) -> bool:
    return bool(re.search(r"<(?:path|line|polyline)\b", body))


def line_of(src: str, off: int) -> int:
    return src.count("\n", 0, off) + 1


@dataclass
class Comp:
    name: str
    file: Path
    start: int  # offset in file
    body: str
    rules: list[tuple[str, int, str]] = field(default_factory=list)  # (rule, line, detail)


@dataclass
class Module:
    path: Path
    src: str
    comps: dict[str, Comp]
    imports: dict[str, tuple[Path, str]]  # local name -> (module path, exported name)


def parse_module(path: Path) -> Module:
    src = path.read_text(encoding="utf-8")
    starts = [(m.start(), m.group(1)) for m in TOP.finditer(src)]
    comps = {}
    for k, (s0, name) in enumerate(starts):
        s1 = starts[k + 1][0] if k + 1 < len(starts) else len(src)
        comps[name] = Comp(name, path, s0, src[s0:s1])
    imports = {}
    for m in re.finditer(r"import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*[\"'](\.[^\"']+)[\"']", src):
        base = (path.parent / m.group(2))
        cand = [base.with_suffix(".tsx"), base.with_suffix(".ts"), base / "index.tsx", base]
        target = next((c for c in cand if c.is_file()), None)
        if target is None:
            continue
        for part in m.group(1).split(","):
            part = part.strip()
            if not part or part.startswith("type "):
                continue
            exp, _, loc = part.partition(" as ")
            imports[(loc or exp).strip()] = (target.resolve(), exp.strip())
    return Module(path.resolve(), src, comps, imports)


def okline(src: str, off: int) -> str | None:
    ln = src.splitlines()[line_of(src, off) - 1] if src else ""
    m = LINT_OK.search(ln)
    return m.group(1).strip() if m else None


class Linter:
    def __init__(self):
        self.mods: dict[Path, Module] = {}
        self.waivers: list[str] = []

    def mod(self, p: Path) -> Module:
        p = p.resolve()
        if p not in self.mods:
            self.mods[p] = parse_module(p)
            m = self.mods[p]
            for c in m.comps.values():
                self.rules_local(m, c)
            for tgt, _ in set(m.imports.values()):
                self.mod(tgt)
        return self.mods[p]

    def flag(self, m: Module, c: Comp, rule: str, off_in_body: int, detail: str):
        off = c.start + off_in_body
        w = okline(m.src, off)
        if w:
            self.waivers.append(f"{m.path.name}:{line_of(m.src, off)} {c.name} {rule} waived: {w}")
            return
        c.rules.append((rule, line_of(m.src, off), detail))

    def rules_local(self, m: Module, c: Comp):
        b = c.body
        code = COMMENT.sub(lambda k: " " * len(k.group()), b)  # comments never count as an arrowhead (same length keeps offsets)
        head = has_arrowhead(code)
        strokes = list(straight_strokes(b))
        ends = {e: off for off, es in strokes for e in es}
        for off, el in tags(b, "circle"):
            cx, cy = attr(el, "cx"), attr(el, "cy")
            key = f"{norm(cx)}|{norm(cy)}"
            if not filled(el):
                # RING: an open circle with a headless straight leader starting on it (v5's ring + line, v4.1's pulse ring)
                ncx, ncy = norm(cx), norm(cy)
                if not head and ncx and ncy and any(e.split("|")[0].find(ncx) >= 0 and e.split("|")[1].find(ncy) >= 0 for e in ends):
                    self.flag(m, c, "RING", off, f"open circle at ({cx}, {cy}) with a headless straight leader")
                continue
            if not small_r(attr(el, "r")):
                continue
            if key in ends:
                self.flag(m, c, "DOT1", off, f"dot at ({cx}, {cy}) on the end of a straight stroke")
            elif not head and any_stroke(b) and RIDING.search(f"{cx} {cy}"):
                self.flag(m, c, "DOT2", off, f"bead/dot riding a stroke at ({cx}, {cy}), no arrowhead")
        is_lead = bool(LEADNAME.search(c.name)) and strokes and not head
        if is_lead:
            self.flag(m, c, "LEAD", strokes[0][0], "headless straight leader (arrow-leader-hairline)")
        for mm in re.finditer(r"width:\s*(\d+)\s*,\s*height:\s*(\d+)\s*,\s*borderRadius", b):
            if int(mm.group(1)) <= 14 and int(mm.group(2)) <= 14 and not head and (strokes or re.search(r"<(?:\w*Callout|\w*Lead\w*)\b", b)):
                self.flag(m, c, "DOT3", mm.start(), f"{mm.group(1)}x{mm.group(2)} round div dot with a leader")
        sig = re.search(r"React\.FC<\{([^}]*)\}>", code)
        if sig and re.search(r"\b(bead|dot)\??\s*:", sig.group(1)):
            self.flag(m, c, "PROP", sig.start(), "component takes a bead/dot prop")
        for mm in re.finditer(r"<([A-Z]\w*)\b[^>]*?\b(bead=|dot\b(?!\w))", code):
            self.flag(m, c, "PROP", mm.start(), f"<{mm.group(1)}> given a {mm.group(2).rstrip('=')} prop")

    def resolve(self, m: Module, name: str, seen=None) -> Comp | None:
        if name in m.comps:
            return m.comps[name]
        if name in m.imports:
            p, exp = m.imports[name]
            return self.resolve(self.mod(p), exp)
        return None

    def flagged(self, c: Comp, seen: set) -> list[str]:
        """Rules hit by c or, transitively, by components it uses."""
        if (c.file, c.name) in seen:
            return []
        seen.add((c.file, c.name))
        hits = [r for r, _, _ in c.rules if r != "USE"]
        m = self.mods[c.file.resolve()]
        for u in set(re.findall(r"<([A-Z]\w*)\b", c.body)):
            cc = self.resolve(m, u)
            if cc is not None and cc is not c and self.flagged(cc, seen):
                hits.append(f"USE:{u}")
        return hits

    def lint(self, path: Path) -> list[str]:
        m = self.mod(path)
        out = []
        for c in m.comps.values():
            for rule, ln, detail in c.rules:
                out.append(f"{m.path.name}:{ln}  {rule:5} {c.name}: {detail}")
            for mm in re.finditer(r"<([A-Z]\w*)\b", c.body):
                u = mm.group(1)
                cc = self.resolve(m, u)
                if cc is None or cc is c:
                    continue
                hits = self.flagged(cc, set())
                if hits:
                    off = c.start + mm.start()
                    w = okline(m.src, off)
                    if w:
                        self.waivers.append(f"{m.path.name}:{line_of(m.src, off)} USE {u} waived: {w}")
                        continue
                    where = f"{cc.file.name}" if cc.file.resolve() != m.path else "this file"
                    out.append(f"{m.path.name}:{line_of(m.src, off)}  USE   {c.name} uses <{u}> ({where}: {', '.join(sorted(set(hits)))})")
        return out


# ----------------------------------------------------------------------------------------------- static-image check
def grey_crops(video: Path, frames: list[int], box: list[int]):
    import cv2, numpy as np
    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise SystemExit(f"cannot open {video}")
    x, y, w, h = box
    out = []
    for f in frames:
        cap.set(cv2.CAP_PROP_POS_FRAMES, f)
        ok, im = cap.read()
        if not ok:
            break
        g = cv2.cvtColor(im[y:y + h, x:x + w], cv2.COLOR_BGR2GRAY).astype(np.float32)
        out.append(g)
    cap.release()
    return out


def layer_motion(video: Path, box, f0: int, f1: int, step: int = 4) -> float:
    import numpy as np
    frames = list(range(f0, max(f0 + 1, f1 + 1), step))
    crops = grey_crops(video, frames, box)
    if len(crops) < 2:
        return float("nan")
    return float(max(np.mean(np.abs(c - crops[0])) for c in crops[1:]))


def calibrate(work: Path) -> tuple[float, float, float]:
    """Encode a textured still twice (static, and a 1 % zoom over 48 f) at the render settings; return (noise, moving, threshold)."""
    import numpy as np, cv2
    rng = np.random.default_rng(7)
    base = cv2.GaussianBlur((rng.random((1080, 1920, 3)) * 255).astype(np.uint8), (0, 0), 6)
    base = cv2.addWeighted(base, 2.2, np.full_like(base, 128), -1.2, 0)  # mid-contrast photo-like texture
    png = work / "cal.png"
    cv2.imwrite(str(png), base)
    still, zoom = work / "cal_still.mp4", work / "cal_zoom.mp4"
    common = ["-y", "-v", "error", "-loop", "1", "-framerate", "24", "-t", "3", "-i", str(png)]
    subprocess.run(["ffmpeg", *common, "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", str(still)], check=True)
    # slowest move we allow: 1 % scale over 2 s (48 f), the gentlest drift in beats.json
    subprocess.run(["ffmpeg", *common, "-vf", "scale=3840:-1,zoompan=z='1+0.01*min(on,48)/48':d=1:s=1920x1080:fps=24:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'",
                    "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", str(zoom)], check=True)
    box = [560, 240, 800, 600]
    noise = layer_motion(still, box, 14, 64)
    moving = layer_motion(zoom, box, 0, 48)
    return noise, moving, (noise * moving) ** 0.5 if noise > 0 else moving / 4


def static_check(video: Path, beats_path: Path, thresh: float) -> int:
    sheet = json.loads(beats_path.read_text(encoding="utf-8"))
    bad = 0
    for b in sheet["beats"]:
        imgs = [a for a in b.get("assets", []) if a.get("kind") == "image"]
        layers = b.get("image_layers", [])
        if len(imgs) > len(layers):
            print(f"  FAIL {b['id']}: {len(imgs)} image assets but {len(layers)} image_layers (every image needs a box + span)")
            bad += 1
        for L in layers:
            f0, f1 = L["from_f"] + 14, L["to_f"] - 7
            mv = layer_motion(video, L["box"], f0, f1)
            ok = mv == mv and mv >= thresh
            bad += not ok
            print(f"  {'ok  ' if ok else 'FAIL'} {b['id']} {L['asset']}: max change {mv:.2f} grey levels over f{f0}-{f1} (threshold {thresh:.2f})")
    print("static-image check:", "PASS" if not bad else f"FAIL ({bad})")
    return 1 if bad else 0


# ----------------------------------------------------------------------------------------------- main
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("tsx", nargs="*", type=Path)
    ap.add_argument("--static-image", type=Path, metavar="RENDER.mp4")
    ap.add_argument("--beats", type=Path)
    ap.add_argument("--thresh", type=float, default=None, help="grey-level threshold; default = calibrated")
    ap.add_argument("--calibrate", action="store_true")
    ap.add_argument("--selftest", action="store_true", help="clean fixture passes, bad fixture and v4.1 OstadYT.tsx fail")
    a = ap.parse_args()
    if a.selftest:
        fx = Path(__file__).resolve().parent / "lint_fixtures"
        v41 = Path(__file__).resolve().parents[4] / "brand/remotion/src/OstadYT.tsx"
        good = True
        for p, want_fail, need in [(fx / "clean_arrow.tsx", False, set()), (fx / "bad_callout.tsx", True, {"DOT1", "DOT2", "RING", "PROP", "USE"}),
                                   (v41, True, {"DOT1", "DOT2", "DOT3", "USE"})]:
            if not p.is_file():
                print(f"  skip {p} (missing)")
                continue
            L = Linter()
            v = L.lint(p)
            got = {s.split()[1] for s in v}
            ok = (bool(v) == want_fail) and need <= got
            good &= ok
            print(f"  {'ok  ' if ok else 'MISS'} {p.name}: {len(v)} violations, rules {sorted(got)}; expected {'FAIL with ' + str(sorted(need)) if want_fail else 'PASS'}")
        print("selftest:", "PASS" if good else "FAIL")
        return 0 if good else 1
    if a.calibrate or (a.static_image and a.thresh is None):
        with tempfile.TemporaryDirectory() as td:
            noise, moving, thr = calibrate(Path(td))
        print(f"calibration: still (crf 16) max change {noise:.2f}; 1 % zoom over 48 f {moving:.2f}; threshold {thr:.2f} (geometric mean)")
        if a.thresh is None:
            a.thresh = thr
        if a.calibrate and not a.static_image:
            return 0
    if a.static_image:
        if not a.beats:
            print("--static-image needs --beats")
            return 2
        return static_check(a.static_image, a.beats, a.thresh)
    if not a.tsx:
        ap.print_help()
        return 2
    L = Linter()
    viol = []
    for p in a.tsx:
        viol += L.lint(p)
    for w in L.waivers:
        print("  waiver:", w)
    for v in viol:
        print("  " + v)
    print(f"lint_compositions: {'FAIL' if viol else 'PASS'} ({len(viol)} dot-and-line violation{'s' * (len(viol) != 1)} in {len(a.tsx)} file(s))")
    return 1 if viol else 0


if __name__ == "__main__":
    sys.exit(main())
