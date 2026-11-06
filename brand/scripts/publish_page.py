"""Copy what /brand/ostad shows into the Next app: specimen plates -> public/brand/ostad/specimen/, data -> app/brand/ostad/data/.
Re-run after any re-render; the page only reads these copies."""
import json, pathlib, shutil, sys
sys.stdout.reconfigure(encoding="utf-8")
B = pathlib.Path(__file__).resolve().parents[1]; ROOT = B.parent
PUB = ROOT / "public" / "brand" / "ostad" / "specimen"; DATA = ROOT / "app" / "brand" / "ostad" / "data"
PUB.mkdir(parents=True, exist_ok=True); DATA.mkdir(parents=True, exist_ok=True)
renders = json.load(open(B / "fonts" / "specimen" / "renders.json", encoding="utf-8"))
for r in renders:
    shutil.copy2(B / r["file"], PUB / pathlib.Path(r["file"]).name)
    r["src"] = "/brand/ostad/specimen/" + pathlib.Path(r["file"]).name
spec = json.load(open(B / "fonts" / "specimen" / "spec.json", encoding="utf-8"))
system = json.load(open(B / "fonts" / "system.json", encoding="utf-8"))
matches = json.load(open(B / "fonts" / "matches.json", encoding="utf-8"))["matches"]
added = [m for m in matches if m.get("added")]
type_ = {"renders": renders, "spec": spec, "display_ranked": system["display_ranked"][:6], "text_ranked": system["text_ranked"][:6],
         "losing": system["losing_display"], "rule": system["rule"],
         "counts": {"crops": len(matches), "searched": len(added), "added": sum(m["added"]["activation"] == "added" for m in added),
                    "already": sum(m["added"]["activation"] == "already active" for m in added), "families": len({t["family_slug"] for m in added for t in m["top5"]})}}
json.dump(type_, open(DATA / "type.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print("plates", len(renders), "->", PUB, "| data ->", DATA / "type.json")
