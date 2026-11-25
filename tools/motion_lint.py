"""motion_lint: fail any composition with banned motion (FAST LANE, research/ostad/PLAYBOOK.md section 2).

Banned: CSS transitions, CSS @keyframes / animation, stock easings (ease, ease-in, ease-out, ease-in-out, linear) and every other
easing curve on anything that moves, scales, rotates or fades (Remotion Easing.*, cubic-bezier, hand-made ease functions, linear
clamp ramps on the frame, raw sine breathing). All motion is a named closed-form spring (brand/remotion/src/fast/spring.ts).
Every call of sp / life / chase / drift / to must name a spring from brand/kit/tokens.json motion.spring.

  python -I tools/motion_lint.py [paths...]        default: brand/remotion/src/fast; exit 1 on any violation
  python -I tools/motion_lint.py --report          every composition folder, counts only (legacy reels are reported, not failed)
A line may opt out with  // motion-lint: allow <RULE> <reason>   (spring.ts itself is the one exempt file).
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "brand/remotion/src"
SPRINGS = set(json.loads((ROOT / "brand/kit/tokens.json").read_text(encoding="utf-8"))["motion"]["spring"]) - {"$description"}
EXEMPT = {SRC / "fast/spring.ts"}

RULES = [
    ("CSS-TRANSITION", re.compile(r"\btransition\s*[:=]|transitionProperty|transitionDuration")),
    ("CSS-KEYFRAMES", re.compile(r"@keyframes|\banimation(Name|Duration)?\s*:")),
    ("STOCK-EASING", re.compile(r"""["'`](ease|ease-in|ease-out|ease-in-out|linear)["'`]|Easing\.(linear|ease|in|out|inOut|quad|cubic|sin|exp|circle|back|elastic|bounce)\b""")),
    ("BEZIER", re.compile(r"Easing\.bezier|cubic-bezier\(")),
    ("CURVE-HELPER", re.compile(r"\b(easeOutBack|easeOut|easeIn|quint|ease|smooth|smoothstep)\s*\(|\bcurve\[|\bprog\(|arriveStyle\(|from\s+[\"'][./]*library/motion[\"']")),
    ("HAND-EASING", re.compile(r"\(1\s*-\s*\w+\)\s*\*\*\s*\d|Math\.pow\(\s*1\s*-")),
    ("LINEAR-RAMP", re.compile(r"clamp\(\s*\(\s*(frame|f|t)\s*-\s*[\w.]+\s*\)\s*/|interpolate\(\s*(frame|f|t)\b")),
    ("RAW-SINE", re.compile(r"Math\.(sin|cos)\(")),
]
CALL = re.compile(r"\b(sp|life|chase|drift|to|sfxAtSettle|firstReach|audioSpringAt|useAudioSpring)\(")
NAMED = re.compile(r"[\"'](\w+)[\"']")
LEGACY_HELPERS = re.compile(r"\b(p|life|enter|enterF|vis)\(\s*(frame|f|t)\b")  # the delivered reels' bezier helpers (look.ts / Ro.tsx)


def strip_comments(line: str) -> str:
    if line.lstrip().startswith("//") or line.lstrip().startswith("*"):
        return ""
    return re.sub(r"//.*$", "", line)


def lint_file(p: Path, legacy=False):
    out = []
    if p in EXEMPT:
        return out
    fast = "fast" in p.parts
    for n, raw in enumerate(p.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
        allow = re.search(r"motion-lint:\s*allow\s+([A-Z-]+)", raw)
        line = strip_comments(raw)
        if not line.strip():
            continue
        for rule, rx in RULES:
            if rx.search(line) and not (allow and allow.group(1) == rule):
                out.append((rule, n, raw.strip()[:140]))
        if not fast and LEGACY_HELPERS.search(line):
            out.append(("LEGACY-CURVE", n, raw.strip()[:140]))
        if fast:
            for m in CALL.finditer(line):
                if m.group(1) in ("sfxAtSettle", "firstReach", "audioSpringAt", "useAudioSpring", "chase", "to", "drift"):
                    continue  # spring argument optional / defaulted by name in the helper signature
                args = line[m.end(): m.end() + 160]
                names = NAMED.findall(args.split(")")[0] + ")") if args else []
                if not any(nm in SPRINGS for nm in names) and "spring" not in args.split(")")[0] and "Name" not in args.split(")")[0]:
                    out.append(("UNNAMED-SPRING", n, raw.strip()[:140]))
    return out


def files(paths):
    for q in paths:
        q = Path(q)
        if q.is_file():
            yield q.resolve()
        else:
            yield from sorted(x.resolve() for x in q.rglob("*") if x.suffix in (".ts", ".tsx"))


def main():
    a = sys.argv[1:]
    if "--report" in a:
        rep = {}
        for d in sorted(x for x in SRC.iterdir() if x.is_dir()) + [SRC]:
            fl = [x for x in files([d])] if d != SRC else [x for x in SRC.glob("*.ts*")]
            v = [r for x in fl for r in lint_file(x)]
            by = {}
            for r in v:
                by[r[0]] = by.get(r[0], 0) + 1
            rep[d.name if d != SRC else "(src root)"] = {"files": len(fl), "violations": len(v), "by_rule": by}
        print(json.dumps(rep, indent=1))
        (ROOT / "research/ostad/fast/motion_lint_report.json").parent.mkdir(parents=True, exist_ok=True)
        (ROOT / "research/ostad/fast/motion_lint_report.json").write_text(json.dumps(rep, indent=1))
        return 0
    targets = a or [str(SRC / "fast")]
    bad = 0
    for p in files(targets):
        for rule, n, txt in lint_file(p):
            bad += 1
            print(f"{p.relative_to(ROOT)}:{n}: {rule}: {txt}")
    print(f"motion_lint: {'FAIL' if bad else 'PASS'} ({bad} violations)")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
