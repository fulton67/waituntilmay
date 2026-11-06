"""Render the icon set: kit/icons/png/{name}.png (ink on paper, 240 px), kit/icons/glass/{name}.png (glass chip over a treated
skin photo, 360 px), kit/icons/sheet.png. Uses kit/kit.css and scripts/render_scenes.cjs. brand-venv python -I."""
import json, pathlib, subprocess, sys, glob
sys.stdout.reconfigure(encoding="utf-8")
B = pathlib.Path(__file__).resolve().parents[1]; ROOT = B.parent; O = B / "kit" / "icons"; S = O / "_scenes"; S.mkdir(parents=True, exist_ok=True)
icons = [i["name"] for i in json.load(open(O / "icons.json", encoding="utf-8"))["icons"]]
svg = {n: (O / "svg" / f"{n}.svg").read_text(encoding="utf-8") for n in icons}
BACK = "/" + pathlib.Path(glob.glob(str(B / "board" / "img" / "2145281_*"))[0]).relative_to(B).as_posix()
HEAD = '<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="https://use.typekit.net/vzz0hgt.css"><link rel="stylesheet" href="/kit/kit.css"><style>html,body{margin:0}</style>'
scenes = []
for n in icons:
    (S / f"p_{n}.html").write_text(HEAD + f'<div class="ok" style="width:240px;height:240px;display:grid;place-items:center"><span class="ok-icon" style="--ok-icon:160px;color:var(--ok-text)">{svg[n]}</span></div>', encoding="utf-8")
    scenes.append({"html": f"kit/icons/_scenes/p_{n}.html", "w": 240, "h": 240, "clip": None, "out": f"kit/icons/png/{n}.png"})
    (S / f"g_{n}.html").write_text(HEAD + f'<div class="ok" style="width:360px;height:360px;display:grid;place-items:center"><img class="ok-bg" src="{BACK}" style="object-position:70% 40%">'
                                   f'<span class="ok-icon ok-icon--glass" style="--ok-icon:120px;--ok-glass-blur:14px;position:relative;color:var(--ok-text)">{svg[n]}</span></div>', encoding="utf-8")
    scenes.append({"html": f"kit/icons/_scenes/g_{n}.html", "w": 360, "h": 360, "clip": None, "out": f"kit/icons/glass/{n}.png"})
cells = "".join(f'<figure><span class="ok-icon" style="--ok-icon:80px">{svg[n]}</span><div class="tile"><img class="ok-bg" src="{BACK}" style="object-position:{(i * 37) % 100}% {(i * 53) % 100}%"><span class="ok-icon ok-icon--glass" style="--ok-icon:52px;--ok-glass-blur:10px">{svg[n]}</span></div><figcaption class="ok-meta">{n}</figcaption></figure>' for i, n in enumerate(icons))
(S / "sheet.html").write_text(HEAD + f'''<style>.sheet{{display:grid;grid-template-columns:repeat(6,1fr);gap:30px 12px;padding:100px 60px 60px}}
figure{{margin:0;display:grid;justify-items:center;gap:12px;position:relative}} figcaption{{font-size:15px!important;color:var(--ok-text)}} .tile{{position:relative;width:150px;height:120px;border-radius:12px;overflow:hidden;display:grid;place-items:center}}
.ok-icon--glass{{position:relative}} h1{{position:absolute;top:28px;left:72px;margin:0;font:600 34px/1 var(--ok-display)}} .bg{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:var(--ok-photo-filter);opacity:.9}}
.band{{position:absolute;left:0;right:0;bottom:0;height:0}}</style>
<div class="ok" style="width:1400px;height:1290px;color:var(--ok-text)"><h1>{len(icons)} icons · monoline, round caps, stroke {json.load(open(O / "icons.json"))["stroke_units"]} / 24</h1><div class="sheet">{cells}</div></div>''', encoding="utf-8")
scenes.append({"html": "kit/icons/_scenes/sheet.html", "w": 1400, "h": 1290, "clip": None, "out": "kit/icons/sheet.png"})
json.dump(scenes, open(S / "scenes.json", "w"), indent=1)
r = subprocess.run(["node", str(B / "scripts" / "render_scenes.cjs"), str(S / "scenes.json")], cwd=ROOT, env={**__import__("os").environ, "NODE_PATH": str(ROOT / "node_modules")}, capture_output=True, text=True)
print(r.stdout, r.stderr[-2000:])
