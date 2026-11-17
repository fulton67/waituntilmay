"""variety_check.py: fail an edit whose beat sheet repeats itself (DESIGN_PER_BEAT section 3).

Reads an edit's beats.json (schema: research/ostad/style/exomind/beats.json) and DEVICE_LIBRARY.md (ids + built status).
Exits 1 if any rule fails, 0 if all pass. `--selftest` breaks a copy of the sheet once per rule and checks each rule fires.

Rules (DESIGN_PER_BEAT section 3, plus the structure rules of EXOMIND_REDO section 3 and RUN_BRIEF):
  R1  no device on more than 2 beats
  R2  no entry animation on two beats in a row
  R3  text-only beats <= 20 %, and never more than 1 in any 5 consecutive beats
  R4  >= 6 distinct devices in every 60 s window (whole edit if shorter), and >= 6 per 60 s overall
  R5  >= 3 distinct never-built devices (status read from DEVICE_LIBRARY.md, not trusted from the sheet)
  R6  no dot-and-line callout: device `arrow-leader-hairline`, or an arrow variant naming a dot / bead / leader
  R7  every device and entry id exists in DEVICE_LIBRARY.md; never_built flags agree with it
  R8  a title card at frame 0, a section card opening every section, an end card
  R9  one presentation of Ostad: keyed-left unless the beat is full-bleed; immersion is one of the five modes
  R10 beats are in order, do not overlap, and sit inside the edit
  R11 compliance: MOA footage carries the MOA label; >= 1 beat carries the Exomind disclaimer; >= 3 ExoMind-only animations.
      With "compliance_profile": "injectable" (procedure reels): consent must be "yes" or the sheet marked not_for_posting;
      illustration beats carry an on-screen "Illustration" label; no product brand without evidence; result claims carry "results vary"
  R12 every arrow variant is backed by an arrow-* device on that beat
  R13 layout runs (gap round 1, immersion_layout.md): beats carrying `layout` never hold one layout family for more than 3
      segments in a row or 15 s (him-left family = LC / LT / LW / SPLIT-L; FB, SPLIT and CO each their own); the end card counts
  R14 same subject (gap round 1, graphics_arrows.md: coil-on-patient on 5 beats): no image-layer `subject` on more than 2 beats

Usage: python -I variety_check.py research/ostad/style/exomind/beats.json [--library research/ostad/style/DEVICE_LIBRARY.md] [--selftest]
"""
from __future__ import annotations
import argparse, copy, json, math, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEFAULT_LIB = HERE.parent / "DEVICE_LIBRARY.md"
IMMERSION = {"full-bleed", "split", "depth push", "camera move", "masked card"}
OSTAD = {"keyed-left", "pip", "out", "in-footage"}
BANNED_DEVICES = {"arrow-leader-hairline"}
BANNED_ARROW = re.compile(r"dot|bead|leader|hairline", re.I)


def load_library(path: Path) -> dict[str, str]:
    st: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^\| `([a-z0-9-]+)` \|", line)
        if not m:
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        b = re.match(r"\**(yes|partial|never)", cells[-2])
        st[m.group(1)] = b.group(1) if b else "unknown"
    if len(st) < 40:
        raise SystemExit(f"library parse found only {len(st)} ids in {path}")
    return st


def check(sheet: dict, lib: dict[str, str]) -> list[tuple[str, bool, str]]:
    beats, fps, dur_f = sheet["beats"], sheet["fps"], sheet["duration_f"]
    res: list[tuple[str, bool, str]] = []
    add = lambda rule, ok, msg: res.append((rule, bool(ok), msg))

    # R1
    uses: dict[str, list[str]] = {}
    for b in beats:
        for d in dict.fromkeys(b["devices"]):
            uses.setdefault(d, []).append(b["id"])
    # STANDARD devices (DEVICE_LIBRARY "STANDARD", ids `std-*`; client 2026-11-17) are the reel's fixed look and may repeat
    over = {d: ids for d, ids in uses.items() if len(ids) > 2 and not d.startswith("std-")}
    add("R1 device used <= 2x", not over, f"max uses {max(len(v) for v in uses.values())}" + (f"; over: {over}" if over else ""))

    # R2
    rep = [(a["id"], b["id"], a["entry"]) for a, b in zip(beats, beats[1:]) if a["entry"] == b["entry"]]
    add("R2 no entry on consecutive beats", not rep, f"{len(set(b['entry'] for b in beats))} distinct entries" + (f"; repeats: {rep}" if rep else ""))

    # R3
    to = [bool(b.get("text_only")) for b in beats]
    share = sum(to) / len(beats)
    win = [beats[i]["id"] for i in range(max(1, len(beats) - 4)) if sum(to[i:i + 5]) > 1]
    add("R3 text-only <= 20 % and <= 1 in 5", share <= 0.2 + 1e-9 and not win,
        f"{sum(to)}/{len(beats)} = {share:.0%}" + (f"; >1 text-only in the 5 beats from {win}" if win else ""))

    # R4
    span = 60 * fps
    worst, worst_at = 10**9, 0
    starts = range(0, max(1, dur_f - span + 1), fps) if dur_f > span else [0]
    for w0 in starts:
        w1 = w0 + span
        ds = {d for b in beats if b["start_f"] < w1 and b["end_f"] >= w0 for d in b["devices"]}
        if len(ds) < worst:
            worst, worst_at = len(ds), w0
    total = len(uses)
    need_total = math.ceil(6 * max(dur_f, span) / span)
    add("R4 >= 6 distinct devices per 60 s", worst >= 6 and total >= need_total,
        f"worst 60 s window {worst} (from {worst_at / fps:.0f} s); total {total} distinct, need >= {need_total}")

    # R5
    nb = sorted({d for b in beats for d in b["devices"] if lib.get(d) == "never"})
    add("R5 >= 3 never-built devices", len(nb) >= 3, f"{len(nb)}: {', '.join(nb)}")

    # R6
    bad = [(b["id"], d) for b in beats for d in b["devices"] if d in BANNED_DEVICES]
    bad += [(b["id"], b["arrow"]) for b in beats if b.get("arrow") and BANNED_ARROW.search(b["arrow"])]
    add("R6 no dot-and-line callout", not bad, "none" if not bad else f"{bad}")

    # R7
    unknown = [(b["id"], d) for b in beats for d in b["devices"] + [b["entry"]] if d not in lib]
    unknown += [(c.get("kind"), c["device"]) for c in sheet.get("cards", []) if c.get("kind") != "end" and c["device"] not in lib]
    flag = [b["id"] for b in beats if "never_built" in b and b["never_built"] != any(lib.get(d) == "never" for d in b["devices"])]
    add("R7 ids exist, never_built flags agree", not unknown and not flag, f"unknown {unknown}; wrong flags {flag}" if unknown or flag else "ok")

    # R8
    cards = sheet.get("cards", [])
    title = [c for c in cards if c["kind"] == "title" and c["start_f"] == 0]
    sec_cards = {c["start_f"]: c for c in cards if c["kind"] == "section"}
    secs = sheet.get("sections", [])
    missing = [s["id"] for s in secs if s["start_f"] != 0 and s["start_f"] not in sec_cards]
    one_look = len({c["device"] for c in sec_cards.values()}) <= 1
    first_beat = {s["id"]: next((b for b in beats if b["section"] == s["id"]), None) for s in secs}
    late = [sid for sid, b in first_beat.items() if b and sid != secs[0]["id"] and b["start_f"] != next(s["start_f"] for s in secs if s["id"] == sid)]
    end = [c for c in cards if c["kind"] == "end"]
    add("R8 title + section card at every turn + end card", title and not missing and one_look and end and not late,
        f"title {bool(title)}; sections {len(secs)} / cards {len(sec_cards)}; missing {missing}; one card look {one_look}; end {bool(end)}")

    # R9
    badi = [(b["id"], b["immersion"]) for b in beats if b["immersion"] not in IMMERSION]
    bado = [(b["id"], b.get("ostad")) for b in beats if b.get("ostad", "keyed-left") not in OSTAD
            or (b.get("ostad", "keyed-left") != "keyed-left" and b["immersion"] not in ("full-bleed", "split") and b.get("layout") != "CO")
            or (b.get("ostad") == "pip" and b["immersion"] != "full-bleed")]
    fb = sum(b["immersion"] == "full-bleed" for b in beats)
    add("R9 one keyed presentation, steps out only for full-bleed / a split / a centred object", not badi and not bado,
        f"modes {sorted({b['immersion'] for b in beats})}; full-bleed beats {fb}" + (f"; bad {badi + bado}" if badi or bado else ""))

    # R10
    order = [(a["id"], b["id"]) for a, b in zip(beats, beats[1:]) if b["start_f"] <= a["end_f"]]
    outside = [b["id"] for b in beats if b["start_f"] < 0 or b["end_f"] >= dur_f or b["end_f"] < b["start_f"]]
    add("R10 beats ordered, no overlap, inside the edit", not order and not outside, f"{len(beats)} beats" + (f"; overlap {order}; outside {outside}" if order or outside else ""))

    # R11 (profile "exomind" by default; "injectable" for procedure reels, added 2026-11-17 for the under-eye filler reel)
    if sheet.get("compliance_profile", "exomind") == "injectable":
        cons = sheet.get("consent", "unknown")
        posting_ok = cons == "yes" or sheet.get("not_for_posting") is True
        illus = [b["id"] for b in beats if b.get("illustration") and not b.get("compliance", {}).get("illustration_label")]
        brand = [b["id"] for b in beats if b.get("brand_named") and not b.get("brand_evidence")]
        results = [b["id"] for b in beats if b.get("result_claim") and not b.get("compliance", {}).get("results_vary")]
        add("R11 injectable compliance: consent / illustration / brand / results", posting_ok and not illus and not brand and not results,
            f"consent {cons}, not_for_posting {sheet.get('not_for_posting')}; illustration unlabelled {illus}; brand without evidence {brand}; result claims without 'results vary' {results}")
    else:
        moa = [b["id"] for b in beats if any(a.get("source") == "moa" for a in b.get("assets", [])) and not b.get("compliance", {}).get("moa_label")]
        disc = [b["id"] for b in beats if b.get("compliance", {}).get("disclaimer")]
        exo = sorted({b["exomind_only"] for b in beats if b.get("exomind_only")})
        add("R11 compliance labels + >= 3 ExoMind-only animations", not moa and disc and len(exo) >= 3,
            f"disclaimer on {disc}; MOA unlabelled {moa}; ExoMind-only {exo}")

    # R12
    noarrow = [b["id"] for b in beats if b.get("arrow") and not any(d.startswith("arrow-") for d in b["devices"])]
    add("R12 arrow variants backed by an arrow device", not noarrow, "ok" if not noarrow else f"{noarrow}")

    # R13 (only when the sheet carries layouts)
    if any("layout" in b for b in beats):
        fam = lambda L: "him-left" if L in ("LC", "LT", "LW", "SPLIT-L") else L
        segs = [(b["id"], fam(b.get("layout", "?")), b["start_f"], b["end_f"]) for b in beats]
        segs += [("END", fam(c.get("layout", "?")), c["start_f"], c["end_f"]) for c in sheet.get("cards", []) if c["kind"] == "end"]
        runs, cur = [], [segs[0]]
        for sg in segs[1:]:
            if sg[1] == cur[-1][1]:
                cur.append(sg)
            else:
                runs.append(cur); cur = [sg]
        runs.append(cur)
        long = [(r[0][0] + "-" + r[-1][0], len(r), round((r[-1][3] - r[0][2] + 1) / fps, 1)) for r in runs
                if len(r) > 3 or (r[-1][3] - r[0][2] + 1) / fps > 15]
        worst = max(runs, key=lambda r: r[-1][3] - r[0][2])
        add("R13 no layout run > 3 segments or 15 s", not long,
            f"{len(runs)} runs; longest {worst[0][0]}-{worst[-1][0]} {len(worst)} seg {(worst[-1][3] - worst[0][2] + 1) / fps:.1f} s" + (f"; too long {long}" if long else ""))

    # R14
    subj: dict[str, set[str]] = {}
    for b in beats:
        for l in b.get("image_layers", []):
            if l.get("subject"):
                subj.setdefault(l["subject"], set()).add(b["id"])
    over_s = {k: sorted(v) for k, v in subj.items() if len(v) > 2}
    add("R14 no image subject on more than 2 beats", not over_s, f"{len(subj)} subjects" + (f"; over {over_s}" if over_s else ""))
    return res


def report(res) -> bool:
    ok = all(r[1] for r in res)
    for rule, good, msg in res:
        print(f"  {'PASS' if good else 'FAIL'}  {rule}: {msg}")
    print("variety_check:", "PASS" if ok else "FAIL")
    return ok


def selftest(sheet: dict, lib: dict[str, str]) -> bool:
    """Break the sheet once per rule; each break must make exactly that rule (at least) fail."""
    B = lambda s: s["beats"]
    def r1(s): [b["devices"].append("donut-ring-fill") for b in B(s)[:3]]
    def r2(s): B(s)[1]["entry"] = B(s)[0]["entry"]
    def r3(s): B(s)[2]["text_only"] = B(s)[3]["text_only"] = True
    def r4(s): [b.__setitem__("devices", ["windowed-footage"]) for b in B(s)]
    def r5(s): [b.__setitem__("devices", [d for d in b["devices"] if lib.get(d) != "never"] or ["windowed-footage"]) for b in B(s)]
    def r6(s): B(s)[3]["devices"].append("arrow-leader-hairline")
    def r7(s): B(s)[0]["devices"].append("made-up-device")
    def r8(s): s["cards"] = [c for c in s["cards"] if c["kind"] != "section"][:1]
    def r9(s): B(s)[5]["ostad"] = "pip"
    def r10(s): B(s)[4]["start_f"] = B(s)[3]["start_f"]
    def r11(s): [b.get("compliance", {}).pop("moa_label", None) for b in B(s)]
    def r12(s): B(s)[6].update(arrow="curved-callout", devices=["calendar-date-circle"])
    def r13(s): [b.__setitem__("layout", "LC") for b in B(s)]
    def r14(s): [b.setdefault("image_layers", []).append({"asset": "x", "subject": "same"}) for b in B(s)[:3]]
    cases = [("R1", r1), ("R2", r2), ("R3", r3), ("R4", r4), ("R5", r5), ("R6", r6), ("R7", r7), ("R8", r8), ("R9", r9), ("R10", r10), ("R11", r11), ("R12", r12), ("R13", r13), ("R14", r14)]
    good = True
    base = check(sheet, lib)
    print(f"selftest: baseline {'passes' if all(r[1] for r in base) else 'FAILS'}")
    good &= all(r[1] for r in base)
    for rule, f in cases:
        s = copy.deepcopy(sheet)
        f(s)
        failed = [r[0].split()[0] for r in check(s, lib) if not r[1]]
        hit = rule in failed
        print(f"  {'ok ' if hit else 'MISS'} break {rule}: failing rules {failed}")
        good &= hit
    print("selftest:", "PASS" if good else "FAIL")
    return good


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("beats", type=Path)
    ap.add_argument("--library", type=Path, default=DEFAULT_LIB)
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    sheet = json.loads(a.beats.read_text(encoding="utf-8"))
    lib = load_library(a.library)
    print(f"variety_check: {a.beats} ({len(sheet['beats'])} beats, {sheet['duration_f'] / sheet['fps']:.1f} s), library {len(lib)} ids")
    if a.selftest:
        return 0 if selftest(sheet, lib) else 1
    return 0 if report(check(sheet, lib)) else 1


if __name__ == "__main__":
    sys.exit(main())
