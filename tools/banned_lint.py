"""banned_lint: the PLAYBOOK banned list (research/ostad/PLAYBOOK.md section 3), by script, on composition source.

  python -I tools/banned_lint.py [paths...]      default brand/remotion/src/fast; exit 1 on any violation
Rules (each from a client note or a shipped mistake; source in the PLAYBOOK):
  STRIKE     strike-through text (line-through)                                        Naim 2026-11-19
  TONEMAP    a video without toneMapped={false} (Remotion tone-maps iPhone HLG = the orange "filter")   2026-11-19
  BLURFILL   a blurred copy as a fill: filter blur(>= 12 px) on anything (backdrop frost on glass is allowed)   RULES Immersion
  PALETTE    a colour that is not a brand/kit/tokens.json colour or a glass neutral (white / ink / greys)       LESSONS L5, U6
  BLUE       blue highlight, tint, ice or zone fill (#37a9e8 is for arrows only)                               LESSONS L5
  GREEN      any green accent                                                                                  DEC 14d rule 4
  WIDGET     play / pause marks, cursors, sliders, step-player chrome                                          DEC 14d rule 1
  AIGEN      an object / instrument / product image from an AI generator (Flora, Higgsfield, Krea): real cut-outs only
  HIGGSFIELD any Higgsfield use (never)
plus the dot-and-line and text-on-flat-box rules of research/ostad/style/tools/lint_compositions.py (run on the same files).
A line may opt out with  // banned-lint: allow <RULE> <reason>
"""
import json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "brand/remotion/src"
TOK = json.loads((ROOT / "brand/kit/tokens.json").read_text(encoding="utf-8"))["color"]
TOKEN_HEX = {v["$value"].lower() for v in TOK.values() if isinstance(v, dict) and v.get("$type") == "color"}
NEUTRAL_HEX = {"#ffffff", "#fff", "#000", "#000000", "#1d2230", "#6b7183", "#e2e5eb", "#f4f1ec", "#211b15"}
BLUE_HEX = {"#37a9e8", "#cfe9f7", "#c4e4f8", "#9fd6f5", "#7cc8f2", "#2f9fe0"}
HEX = re.compile(r"#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b")
RGB = re.compile(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)")


def hue_sat(r, g, b):
    import colorsys
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return h * 360, s, v


def colour_rule(r, g, b):
    h, s, v = hue_sat(r, g, b)
    if s < 0.12 or v < 0.16:
        return None  # a glass neutral: white, ink, grey, shadow black
    if 75 <= h <= 165:
        return "GREEN"
    if 185 <= h <= 250:
        return "BLUE"
    return "PALETTE"


RULES = [
    ("STRIKE", re.compile(r"line-through|textDecoration\s*:\s*[\"'][^\"']*line")),
    ("BLURFILL", re.compile(r"(?<!backdrop)(?<!backdropF)filter\s*:\s*[^,}]*blur\(\s*(1[2-9]|[2-9]\d|\d{3})")),
    ("WIDGET", re.compile(r"[▶⏸⏯]|\bcursor\s*:|PlayPause|Slider\b|StepPlayer")),
    ("AIGEN", re.compile(r"objects/[^\"']*(flora|higgs|krea|_ai[._]|nanobanana|seedance)", re.I)),
    ("HIGGSFIELD", re.compile(r"higgsfield", re.I)),
]
VIDEO = re.compile(r"<(OffthreadVideo|Video)\b[\s\S]*?/>")  # to the tag's self-close (props may contain =>)


def lint(p: Path):
    out = []
    txt = p.read_text(encoding="utf-8", errors="replace")
    lines = txt.splitlines()
    for n, raw in enumerate(lines, 1):
        allow = set(re.findall(r"banned-lint:\s*allow\s+([A-Z]+)", raw))
        s = raw.strip()
        if s.startswith(("//", "*", "import")):
            continue
        line = re.sub(r"//.*$", "", raw)
        for rule, rx in RULES:
            if rx.search(line) and rule not in allow:
                out.append((rule, n, s[:140]))
        for h in HEX.findall(line):
            hl = h.lower()
            if hl in TOKEN_HEX or hl in NEUTRAL_HEX:
                continue
            if len(hl) == 4:
                hl = "#" + "".join(c * 2 for c in hl[1:])
            r, g, b = (int(hl[i:i + 2], 16) for i in (1, 3, 5))
            rule = "BLUE" if hl in BLUE_HEX else colour_rule(r, g, b)
            if rule and rule not in allow:
                out.append((rule, n, f"{h}: {s[:110]}"))
        for m in RGB.findall(line):
            r, g, b = map(int, m)
            if "#%02x%02x%02x" % (r, g, b) in TOKEN_HEX:
                continue
            rule = colour_rule(r, g, b)
            if rule and rule not in allow:
                out.append((rule, n, f"rgb{m}: {s[:110]}"))
    for m in VIDEO.finditer(txt):
        if "toneMapped" not in m.group(0):  # toneMapped={false}, or passed through from a prop (checked where it is set)
            n = txt[: m.start()].count("\n") + 1
            if "banned-lint: allow TONEMAP" not in lines[n - 1]:
                out.append(("TONEMAP", n, m.group(0)[:140]))
    return out


def files(paths):
    for q in map(Path, paths):
        yield from ([q.resolve()] if q.is_file() else sorted(x.resolve() for x in q.rglob("*") if x.suffix in (".ts", ".tsx")))


def main():
    a = sys.argv[1:] or [str(SRC / "fast")]
    fl = list(files(a))
    bad = 0
    for p in fl:
        for rule, n, s in lint(p):
            bad += 1
            print(f"{p.relative_to(ROOT)}:{n}: {rule}: {s}")
    tsx = [str(p) for p in fl if p.suffix == ".tsx"]
    lc = subprocess.run([sys.executable, "-I", str(ROOT / "research/ostad/style/tools/lint_compositions.py"), *tsx], capture_output=True, text=True) if tsx else None
    if lc is not None:
        print(lc.stdout.strip().splitlines()[-1] if lc.stdout.strip() else lc.stderr.strip()[-300:])
        bad += lc.returncode != 0
    print(f"banned_lint: {'FAIL' if bad else 'PASS'} ({bad} violations in {len(fl)} files)")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
