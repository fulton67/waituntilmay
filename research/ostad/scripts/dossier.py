"""Run 2, phase 2b/2c helper: per-theme dossiers for the writers, and the compact corpus index for the cares reader.

python dossier.py themes   -> classify2/dossier_{slug}.md (stats computed here, every member with its evidence)
python dossier.py index    -> classify2/corpus_index.md (one line per video: id, theme, speaker, ×usual, subject, claim, opening)
"""
import json, statistics, sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA, B = ROOT / "data", ROOT / "classify2"
vids = json.loads((DATA / "videos.json").read_text(encoding="utf-8"))
themes = json.loads((DATA / "themes.json").read_text(encoding="utf-8"))
niche = [v for v in vids if v["source"] != "own"]


def x(v):
    s = v["outlier_score"]
    return f"{s:.0f}×" if s >= 10 else f"{s:.1f}×" if s >= 1 else f"{s:.2f}×"


def mix(rows, key, n=6):
    c = Counter(t for r in rows for t in (r.get(key) if isinstance(r.get(key), list) else [r.get(key)]))
    return ", ".join(f"{k} {round(100 * m / len(rows))}%" for k, m in c.most_common(n))


def stats(slug):
    tv = [v for v in niche if v["theme"] == slug]
    mk = [v for v in tv if v.get("makeable_by_ostad")]
    return dict(n=len(tv), share=len(tv) / len(niche), win=sum(v["winning"] for v in tv) / len(tv),
                medx=statistics.median(v["outlier_score"] for v in tv), mk=len(mk) / len(tv), mkn=len(mk),
                medx_mk=statistics.median(v["outlier_score"] for v in mk) if mk else 0,
                own=[v for v in vids if v["source"] == "own" and v["theme"] == slug], rows=tv)


def themes_cmd():
    q = json.loads((DATA / "questions.json").read_text(encoding="utf-8")) if (DATA / "questions.json").exists() else []
    for t in themes:
        s = stats(t["slug"])
        out = [f"# DOSSIER: {t['name']} (`{t['slug']}`)", "", t["short"], "",
               "## Numbers (copy these exactly)",
               f"- size: {s['n']} niche videos = {s['share'] * 100:.0f}% of the 922-video niche corpus",
               f"- winning: {s['win'] * 100:.0f}% of them are 'winning' (top 20% on their platform and above the platform median)",
               f"- median × the creator's usual: {s['medx']:.2f}× (all) · {s['medx_mk']:.2f}× (makeable only)",
               f"- makeable by Ostad: {s['mk'] * 100:.0f}% ({s['mkn']} videos)",
               f"- tone mix: {mix(s['rows'], 'tone')}",
               f"- speaker mix: {mix(s['rows'], 'speaker')}",
               f"- hook mix: {mix(s['rows'], 'hook_type')}",
               f"- genre mix: {mix(s['rows'], 'genre')}",
               f"- Ostad's own videos in this theme: {len(s['own'])}", ""]
        out.append("## Ostad's own videos in this theme")
        for v in s["own"]:
            out.append(f"- {v['id']} · {v['platform']} · {v['views']} views · {v.get('subject')} · “{v.get('opening_line') or ''}”")
        out += ["", "## Every niche video, best × usual first", ""]
        for v in sorted(s["rows"], key=lambda v: -v["outlier_score"]):
            tr = " ".join((v.get("transcript") or "").split()[:110])
            out.append(f"### {v['id']} · {v['platform']} @{v['creator_handle']} · {v['views']:,} views · {x(v)} usual · "
                       f"{'MAKEABLE' if v.get('makeable_by_ostad') else 'not makeable'} · {v['speaker']} · {'/'.join(v['tone'])} · {v['hook_type']}")
            out.append(f"- subject: {v.get('subject')} · claim: {v.get('claim')}")
            if v.get("makeable_note"):
                out.append(f"- makeable note: {v['makeable_note']}")
            out.append(f"- opening line: {v.get('opening_line') or '(no speech)'}")
            if v.get("audience_reaction"):
                out.append(f"- audience reaction (from comments): {v['audience_reaction']}")
            out.append(f"- transcript start: {tr or '(none: ' + str(v.get('transcript_status')) + ')'}")
            out.append(f"- caption: {(v.get('caption') or '')[:200]}")
        if q:
            out += ["", "## The 47 viewer questions from run 1 (pick the ones that belong to this theme)"]
            out += [f"- “{x_['q']}” ({x_['likes']} likes)" for x_ in q]
        (B / f"dossier_{t['slug']}.md").write_text("\n".join(out), encoding="utf-8")
        print(t["slug"], s["n"], f"{s['medx']:.2f}×", f"win {s['win'] * 100:.0f}%", f"mk {s['mk'] * 100:.0f}%")


def index_cmd():
    out = ["# Corpus index: one line per video", "id | theme | source | speaker | makeable | ×usual | views | subject | claim | opening line", ""]
    for v in sorted(vids, key=lambda v: v["theme"]):
        out.append(f"{v['id']} | {v['theme']} | {v['source']} | {v['speaker']} | {'mk' if v.get('makeable_by_ostad') else '-'} | {x(v)} | {v['views']} | "
                   f"{v.get('subject')} | {v.get('claim')} | {(v.get('opening_line') or '')[:120]}")
    for v in vids:
        if v.get("audience_reaction"):
            out.append(f"COMMENTS {v['id']}: {v['audience_reaction']}")
    (B / "corpus_index.md").write_text("\n".join(out), encoding="utf-8")
    print(len(out), "lines")


if __name__ == "__main__":
    {"themes": themes_cmd, "index": index_cmd}[sys.argv[1]]()
