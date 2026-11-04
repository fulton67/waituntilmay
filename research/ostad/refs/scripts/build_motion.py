"""Judged animations -> motion.json + the Refs tab's motion and mentioned_in data.

in : cache/movw/{vid}.beats.json (judges), cache/msheets/{vid}.json (download meta), cache/ytdate/{vid}.txt (upload date),
     procedures.json, app/ostad/data/videos.json (his own videos)
out: refs/motion.json (spec fields), refs/MOTION_GAPS.md,
     app/ostad/data/refs_motion.json (compact), app/ostad/data/refs_mentions.json ({pid: [his videos]})
"""
import json, pathlib, statistics
from collections import Counter

R = pathlib.Path(__file__).resolve().parents[1]
REPO = R.parents[2]
C = R / "cache"
APP = REPO / "app/ostad/data"
procs = json.load(open(R / "procedures.json", encoding="utf-8"))
P = {p["id"]: p for p in procs}
# dropped after the judges' notes: looks AI-generated
DROP = {"oDfHKZAIbkA": "judge note: AI-generated imagery mixed with a presenter"}


def secs(t):
    m, s = t.split(":"); return int(m) * 60 + int(s)


rows = []
judged = 0
for f in sorted((C / "movw").glob("*.beats.json")):
    judged += 1
    b = json.load(open(f, encoding="utf-8"))
    if not b.get("keep") or b["id"] in DROP:
        continue
    m = json.load(open(C / "msheets" / f"{b['id']}.json", encoding="utf-8"))
    d = (C / "ytdate" / f"{b['id']}.txt")
    date = d.read_text().strip() if d.exists() else ""
    year = int(date[:4]) if date[:4].isdigit() else None
    beats = sorted(({"t": x["t"], "s": secs(x["t"]), "what": x["what"]} for x in b.get("beats", [])), key=lambda x: x["s"])
    rows.append({
        "procedure_id": m["pid"], "id": b["id"], "url": m["url"], "platform": "youtube", "title": m["title"],
        "maker": m["channel"], "duration": m["duration"], "year": year, "style": b.get("style2") or "mixed",
        "render_type": b.get("type"), "what_it_shows": b.get("what_it_shows", ""), "beats": beats,
        "best": b.get("best"), "camera_moves": b.get("camera_moves", []), "energy_effect_how": b.get("energy_effect_how", ""),
        "reusable_as_reference": b.get("reusable_as_reference", ""), "fragment": bool(b.get("fragment")) or m["duration"] < 15,
        "notes": b.get("style", ""), "local": f"refs/motion/{m['pid']}/{b['id']}.mp4",
    })
rows.sort(key=lambda r: (r["procedure_id"], -(r["duration"] or 0)))
json.dump(rows, open(R / "motion.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)

n = Counter(r["procedure_id"] for r in rows)
counts = sorted(n.get(p["id"], 0) for p in procs)
gaps = [p for p in procs if n.get(p["id"], 0) == 0]
thin = [p for p in procs if 0 < n.get(p["id"], 0) < 3]
lines = ["# Motion gaps", "",
         f"{len(rows)} animations kept of {judged} judged, across {len(n)} of {len(procs)} procedures "
         f"(min {counts[0]} / median {statistics.median(counts)} / max {counts[-1]}). Target was 3–10 per procedure.", "",
         f"## No animation found ({len(gaps)})", ""]
lines += [f"- **{p['name']}** (`{p['id']}`): the YouTube search found only talking heads, filmed treatments or off-topic results."
          for p in gaps]
lines += ["", f"## Fewer than 3 ({len(thin)})", ""] + [f"- {p['name']} (`{p['id']}`): {n[p['id']]}" for p in thin]
(R / "MOTION_GAPS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

# compact app data
APP.joinpath("refs_motion.json").write_text(json.dumps([{
    "id": r["id"], "p": r["procedure_id"], "t": r["title"], "ch": r["maker"], "dur": r["duration"], "yr": r["year"],
    "st": r["style"], "what": r["what_it_shows"], "b": [[x["s"], x["what"]] for x in r["beats"]],
    "best": secs(r["best"]) if r["best"] else 0, "cam": r["camera_moves"], "fx": r["energy_effect_how"],
    "reuse": r["reusable_as_reference"], "frag": r["fragment"]} for r in rows], ensure_ascii=False), encoding="utf-8")
vids = {v["id"]: v for v in json.load(open(APP / "videos.json", encoding="utf-8"))}
mentions = {}
for p in procs:
    ms = [vids[i] for i in p.get("mentioned_in", []) if i in vids]
    ms.sort(key=lambda v: -float(v.get("v") or 0))
    mentions[p["id"]] = [{"id": v["id"], "t": v.get("title") or (v.get("cap") or "")[:80], "u": v["url"], "d": v.get("d"),
                          "pl": v.get("p")} for v in ms]
APP.joinpath("refs_mentions.json").write_text(json.dumps(mentions, ensure_ascii=False), encoding="utf-8")
print(f"judged {judged} · kept {len(rows)} · procedures with motion {len(n)}/{len(procs)} · "
      f"min {counts[0]} median {statistics.median(counts)} max {counts[-1]} · gaps {len(gaps)} · fragments {sum(r['fragment'] for r in rows)}"
      f" · with year {sum(1 for r in rows if r['year'])} · styles {dict(Counter(r['style'] for r in rows))}")
