"""Verify: every image has a non-error row in every applicable tool, every PSD has a G8 row, every image is on exactly one
contact sheet, and every sheet has a read line (read/sheets.tsv) and every image a read row (read/images.tsv).
Writes MEASURE_COVERAGE.md (a check / cross table). A cross means the reading step waits until it's fixed."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from common import ROOT, corpus, read_rows

TOOLS = ["probe", "color", "ocr", "silhouette", "hash", "gnarls"]


def tsv_ids(name, col=0):
    p = os.path.join(ROOT, "read", name)
    if not os.path.exists(p): return set()
    lines = open(p, encoding="utf8").read().splitlines()[1:]
    return {l.split("\t")[col] for l in lines if l.strip()}


def main():
    imgs = corpus("image"); psds = corpus("psd")
    ids = [i for i, _, _ in imgs]
    lines = ["# Measurement coverage (Gnarls)", "", f"{len(ids)} images, {len(psds)} PSDs.", "",
             "| tool | rows | errors | missing | status |", "|---|---|---|---|---|"]
    ok_all = True
    for t in TOOLS:
        rows = read_rows(t)
        err = [i for i in ids if i in rows and "error" in rows[i]]
        miss = [i for i in ids if i not in rows]
        ok = not err and not miss
        ok_all &= ok
        lines.append(f"| {t} | {len(rows)} | {len(err)} {' '.join(err[:8])} | {len(miss)} {' '.join(miss[:8])} | {'✓' if ok else '✗'} |")
    rows = read_rows("psd")
    perr = [p for p, _, _ in psds if p in rows and "error" in rows[p]]
    pmiss = [p for p, _, _ in psds if p not in rows]
    lines.append(f"| psd (G8) | {len(rows)} | {len(perr)} {' '.join(perr[:8])} | {len(pmiss)} | {'✓' if not perr and not pmiss else '✗'} |")
    sp = os.path.join(ROOT, "sheets.json")
    sheets = json.load(open(sp, encoding="utf8")) if os.path.exists(sp) else []
    on = [i for s in sheets for i in s["ids"]]
    dup = len(on) - len(set(on)); off = set(ids) - set(on)
    lines.append(f"| sheets (G2) | {len(sheets)} sheets, {len(on)} tiles | dup {dup} | {len(off)} | {'✓' if not dup and not off else '✗'} |")
    rs = tsv_ids("sheets.tsv"); ri = tsv_ids("images.tsv")
    ms = [str(s["n"]) for s in sheets if f"{s['n']:04d}" not in rs and str(s["n"]) not in rs]
    mi = sorted(set(ids) - ri)
    lines.append(f"| read: sheet lines | {len(rs)} | | {len(ms)} {' '.join(ms[:8])} | {'✓' if sheets and not ms else '✗'} |")
    lines.append(f"| read: image rows | {len(ri)} | | {len(mi)} {' '.join(mi[:8])} | {'✓' if not mi else '✗'} |")
    open(os.path.join(ROOT, "MEASURE_COVERAGE.md"), "w", encoding="utf8").write("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
