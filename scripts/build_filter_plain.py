"""Build config/ffmpeg-filters.plain.json - the filters, in plain English.

ffmpeg's filter help is a reference for someone who already knows what the
filter is. This produces the other thing: a plain name, one sentence about
what the filter does to the picture, and for every option a plain label, a
one-line hint, and - where the option is a slider - what each end of it means
in words.

The ~80 filters this work reaches for are written by hand in
scripts/filters_hand.py. Everything else in the build is generated from
`ffmpeg -h filter=<name>` and flagged `"hand": false`, filter and option
alike, so the rough ones are visibly rough rather than quietly wrong.

Re-running is safe: any entry already in the output with `"hand": true` is
kept as it is, so the JSON can be edited directly and the generator will only
fill what is missing.

The grouping is by what a filter does to the picture, not by its name:
Color, Blur & sharpen, Distort & warp, Time, Edges & shapes, Glitch & noise,
Cut & crop, Everything else. An auto filter is placed by keyword and the
guess is recorded, because a guess in a list of eight groups is still a
guess.

    .venv/Scripts/python.exe scripts/build_filter_plain.py
    .venv/Scripts/python.exe scripts/build_filter_plain.py --check
"""
import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from filters_hand import GROUPS, HAND

OUT = "config/ffmpeg-filters.plain.json"

# A filter whose name or one-line description contains one of these goes in
# that group when nobody wrote it out by hand. First match wins, so the order
# is the priority: a filter that is both about colour and about time is
# usually better filed under time.
AUTO_GROUP = [
    ("Time (speed, echo, repeat)",
     r"\b(fps|frame rate|framerate|temporal|time|pts|timestamp|duration|"
     r"interpolat|speed|loop|delay|echo|previous frame|frames? together)\b"),
    ("Glitch & noise",
     r"\b(noise|dither|grain|scope|shuffl|random|corrupt|bitplane|"
     r"datamosh|plane)\b"),
    ("Blur & sharpen",
     r"\b(blur|sharpen|unsharp|denois|smooth|soften|median|average)\b"),
    ("Edges & shapes",
     r"\b(edge|gradient|sobel|prewitt|roberts|erosion|dilat|morpho|"
     r"convol|kernel|mask|outline|contour|draw)\b"),
    ("Distort & warp",
     r"\b(distort|warp|rotate|perspectiv|displace|remap|lens|zoom|"
     r"transpos|flip|mirror|pixelat|pixeliz|geometr|project|spheric|"
     r"stereo|fish)\b"),
    ("Cut & crop",
     r"\b(crop|pad|scale|resiz|aspect|border|letterbox|trim|cut|tile|"
     r"split|stack)\b"),
    ("Color",
     r"\b(colou?r|hue|saturat|chroma|luma|bright|contrast|gamma|"
     r"gradat|lut|levels|curve|tint|white ?balance|temperature|"
     r"exposure|negate|monochrome|grey|gray|rgb|yuv)\b"),
]


def ffmpeg_version():
    out = subprocess.run(["ffmpeg", "-hide_banner", "-version"],
                         check=True, capture_output=True, text=True).stdout
    return out.splitlines()[0].strip()


def list_filters():
    """Every video->video filter in this build, with its one-line help.

    `ffmpeg -filters` prints a flag column, the name, the signature and the
    description. Only the ones that take a picture and return a picture are
    of any use here, which is what the signature says.
    """
    out = subprocess.run(["ffmpeg", "-hide_banner", "-filters"],
                         check=True, capture_output=True, text=True).stdout
    rows = []
    pat = re.compile(r"^\s*([TSC.]{2,3})\s+(\S+)\s+(\S+)\s+(.*)$")
    for line in out.splitlines():
        m = pat.match(line)
        if not m:
            continue
        flags, name, sig, desc = m.groups()
        if "->" not in sig:
            continue
        ins, outs = sig.split("->", 1)
        # A picture in and a picture out. `N` means ffmpeg decides the count
        # at runtime, which is how `extractplanes` (V->N) and `hstack` (N->V)
        # are written; those are video filters and belong here. Anything with
        # an `A` on either side is audio, and `N->N` is plumbing that could be
        # either, so both are left out.
        if "A" in sig or "V" not in sig:
            continue
        # `|` on one side means a source or a sink, so that side has no
        # pads at all: `color` is `|->V` and makes a picture out of nothing,
        # which is a filter you may well want and one that cannot have a
        # "before" thumbnail.
        def pads(side):
            if "|" in side:
                return 0
            return "N" if "N" in side else len(side)
        rows.append({"name": name, "signature": sig, "help": desc.strip(),
                     "timeline": "T" in flags,
                     "inputs": pads(ins), "outputs": pads(outs),
                     "hardware": bool(_HW.search(name))})
    return rows


# A filter that only runs on a GPU device the command line has to set up
# first. They are in the build and in this list, flagged, because knowing the
# accelerated version exists is worth something - but they cannot be
# previewed here, and the thumbnail builder says so rather than failing
# silently.
_HW = re.compile(r"_(opencl|vulkan|cuda|vaapi|qsv|d3d11|d3d12|npp|amf|"
                 r"rkmpp|v4l2m2m|videotoolbox)$")


_OPT = re.compile(
    r"^\s{3}(\S+)\s+<(\w+)>\s+([.A-Z]+)\s*(.*)$")
_ENUM = re.compile(r"^\s{5,}(\S+)\s+(-?\d+)\s+[.A-Z]+\s*(.*)$")
_RANGE = re.compile(r"\(from (-?[\d.e+]+) to (-?[\d.e+]+)\)")
_DEFAULT = re.compile(r"\(default ([^)]*)\)\s*$")


def filter_options(name):
    """Parse `ffmpeg -h filter=<name>` into a list of options.

    Each option carries its ffmpeg flag, its type, its range and default
    where the help gives them, and the enum values where it has any. An
    option whose description is identical to the one before it is an alias -
    ffmpeg prints `master` and `m` as two entries - and is recorded as one so
    the UI shows a filter's dials once.
    """
    try:
        out = subprocess.run(["ffmpeg", "-hide_banner", "-h", f"filter={name}"],
                             check=True, capture_output=True, text=True).stdout
    except subprocess.CalledProcessError:
        return [], None
    desc = None
    lines = out.splitlines()
    for i, line in enumerate(lines):
        if line.startswith("Filter ") and i + 1 < len(lines):
            desc = lines[i + 1].strip()
            break
    opts = []
    for line in lines:
        m = _OPT.match(line)
        if m:
            flag, typ, _fl, tail = m.groups()
            rng = _RANGE.search(tail)
            dflt = _DEFAULT.search(tail)
            text = _RANGE.sub("", tail)
            text = _DEFAULT.sub("", text).strip()
            o = {"flag": flag, "type": typ, "help": text,
                 "min": float(rng.group(1)) if rng else None,
                 "max": float(rng.group(2)) if rng else None,
                 "default": dflt.group(1).strip('"') if dflt else None,
                 "values": []}
            if opts and opts[-1]["help"] == o["help"] \
                    and opts[-1]["type"] == o["type"]:
                opts[-1].setdefault("aliases", []).append(flag)
                continue
            opts.append(o)
            continue
        m = _ENUM.match(line)
        if m and opts:
            opts[-1]["values"].append({"name": m.group(1),
                                       "value": int(m.group(2)),
                                       "help": m.group(3).strip()})
    return opts, desc


def auto_group(name, help_text):
    hay = f"{name} {help_text}".lower()
    for group, pat in AUTO_GROUP:
        if re.search(pat, hay):
            return group
    return "Everything else"


def ends_for(opt):
    """What the two ends of a slider mean, when nobody said.

    A number is better than nothing and worse than a word, which is exactly
    what `"hand": false` on the option is there to say.
    """
    lo, hi = opt.get("min"), opt.get("max")
    if lo is None or hi is None:
        return None

    def n(x):
        if abs(x) >= 1e9:
            return "no limit"
        return f"{x:g}"
    return [n(lo), n(hi)]


def build_option(filt, opt, hand_opts):
    h = hand_opts.get(opt["flag"])
    if h:
        plain, hint, lo, hi = h
        return {"flag": opt["flag"], "plain": plain, "hint": hint,
                "ends": [lo, hi] if lo is not None else None,
                "type": opt["type"], "min": opt["min"], "max": opt["max"],
                "default": opt["default"],
                **({"values": opt["values"]} if opt["values"] else {}),
                **({"aliases": opt["aliases"]} if opt.get("aliases") else {}),
                "ffmpeg_help": opt["help"], "hand": True}
    return {"flag": opt["flag"], "plain": opt["flag"],
            "hint": opt["help"] or "No description in the ffmpeg help.",
            "ends": ends_for(opt),
            "type": opt["type"], "min": opt["min"], "max": opt["max"],
            "default": opt["default"],
            **({"values": opt["values"]} if opt["values"] else {}),
            **({"aliases": opt["aliases"]} if opt.get("aliases") else {}),
            "ffmpeg_help": opt["help"], "hand": False}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--check", action="store_true",
                    help="report hand entries that do not match this build "
                         "and write nothing")
    args = ap.parse_args()

    rows = list_filters()
    by_name = {r["name"] for r in rows}

    # keep anything already marked hand in the existing file, so the JSON is
    # the editable copy and this only ever fills gaps
    kept = {}
    if os.path.exists(args.out):
        try:
            old = json.load(open(args.out, encoding="utf-8"))
            for f in old.get("filters", []):
                if f.get("hand"):
                    kept[f["name"]] = f
        except (json.JSONDecodeError, OSError):
            pass

    out, missing, bad_opts = [], [], []
    for r in rows:
        name = r["name"]
        opts, desc = filter_options(name)
        hand = HAND.get(name)
        prev = kept.get(name)
        hand_opts = {}
        if prev:
            hand_opts = {o["flag"]: (o["plain"], o["hint"],
                                     *(o.get("ends") or (None, None)))
                         for o in prev.get("options", []) if o.get("hand")}
            plain, group, what = prev["plain"], prev["group"], prev["what"]
            is_hand = True
        elif hand:
            plain, group, what, hopts = hand
            hand_opts = hopts
            is_hand = True
        else:
            plain, group, what = name, auto_group(name, r["help"]), r["help"]
            is_hand = False

        flags = {o["flag"] for o in opts} | {
            a for o in opts for a in o.get("aliases", [])}
        for f in hand_opts:
            if f not in flags:
                bad_opts.append((name, f))

        out.append({
            "name": name,
            "plain": plain,
            "group": group,
            "what": what,
            "hand": is_hand,
            "group_guessed": not is_hand,
            "inputs": r["inputs"], "outputs": r["outputs"],
            "timeline": r["timeline"], "hardware": r["hardware"],
            "ffmpeg_help": desc or r["help"],
            "options": [build_option(name, o, hand_opts) for o in opts],
        })

    for name in HAND:
        if name not in by_name:
            missing.append(name)

    out.sort(key=lambda f: (GROUPS.index(f["group"]), f["plain"].lower()))

    doc = {
        "_comment": (
            "Every video filter in this ffmpeg build, in plain English. "
            "`plain` is the name to show, `what` is one sentence about what it "
            "does to the picture, and each option carries a plain label, a "
            "one-line hint and - for a slider - `ends`, what the two extremes "
            "mean in words. `hand: true` means a person wrote it; "
            "`hand: false` means it was generated from the ffmpeg help and is "
            "rough. `group_guessed` marks a group picked by keyword rather "
            "than by a person. Rebuild with scripts/build_filter_plain.py, "
            "which keeps every hand entry already in this file, so this is "
            "the copy to edit."),
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "ffmpeg": ffmpeg_version(),
        "groups": GROUPS,
        "counts": {
            "filters": len(out),
            "hand": sum(1 for f in out if f["hand"]),
            "auto": sum(1 for f in out if not f["hand"]),
            "options": sum(len(f["options"]) for f in out),
            "options_hand": sum(1 for f in out for o in f["options"]
                                if o["hand"]),
        },
        "filters": out,
    }

    print(f"ffmpeg: {doc['ffmpeg']}")
    print(f"video filters in this build: {len(out)}")
    print(f"{'group':<30} {'total':>6} {'hand':>6} {'auto':>6} "
          f"{'options':>8} {'opt hand':>9}")
    print("-" * 70)
    for g in GROUPS:
        fs = [f for f in out if f["group"] == g]
        if not fs:
            continue
        print(f"{g:<30} {len(fs):>6} "
              f"{sum(1 for f in fs if f['hand']):>6} "
              f"{sum(1 for f in fs if not f['hand']):>6} "
              f"{sum(len(f['options']) for f in fs):>8} "
              f"{sum(1 for f in fs for o in f['options'] if o['hand']):>9}")
    print("-" * 70)
    c = doc["counts"]
    print(f"{'TOTAL':<30} {c['filters']:>6} {c['hand']:>6} {c['auto']:>6} "
          f"{c['options']:>8} {c['options_hand']:>9}")

    if missing:
        print(f"\nhand-written but not in this build ({len(missing)}): "
              + ", ".join(sorted(missing)))
    if bad_opts:
        print(f"\nhand-written options this build does not have "
              f"({len(bad_opts)}):")
        for n, f in bad_opts:
            print(f"  {n}.{f}")

    if args.check:
        print("\n--check: nothing written")
        return 1 if (missing or bad_opts) else 0

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    json.dump(doc, open(args.out, "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(f"\nwrote {args.out} "
          f"({os.path.getsize(args.out)/1024:.0f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
