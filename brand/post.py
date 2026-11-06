"""Make an Ostad post from the terminal (BUILDER Phase D). Same templates, same renderer as /brand/ostad/make.

  python brand/post.py --template procedure-card --headline "Laser resurfacing" --body "Smooths texture in one session." \
      --icon laser --accent accent-1 --size 4x5 --out brand/demo/out
  python brand/post.py --caption-file caption.txt --size 9x16 --seed 2 --out out      # Auto mode (kit/templates/auto.js)
  python brand/post.py --template list --slot 'items=[{"text":"Fine lines","icon":"lines"}]' --slot ground=dark --out out
  python brand/post.py --spec spec.json --out out                                      # a spec saved from the builder

--headline / --body go to the template's main text slots (HEADLINE_KEYS / BODY_KEYS, first one the template has);
--image goes to its first image slot; --slot key=value sets any slot (JSON values allowed). Prints the files written.
Runs scripts/post_render.mjs -> scripts/render_posts.cjs (headless Chromium + the Adobe kit). Needs node and the repo's playwright.
"""
import argparse, json, os, pathlib, subprocess, sys
B = pathlib.Path(__file__).resolve().parent; ROOT = B.parent; TP = B / "kit" / "templates"
HEADLINE_KEYS = ["statement", "title", "name", "headline", "heading", "quote"]
BODY_KEYS = ["what", "caption", "body", "text", "note", "subtitle"]

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--template"); ap.add_argument("--headline"); ap.add_argument("--body"); ap.add_argument("--icon"); ap.add_argument("--image")
    ap.add_argument("--accent", choices=["accent-1", "accent-2", "signal", "surface"]); ap.add_argument("--size", default="4x5", choices=["4x5", "1x1", "9x16"])
    ap.add_argument("--slot", action="append", default=[], help="key=value (value may be JSON)")
    ap.add_argument("--caption"); ap.add_argument("--caption-file"); ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--spec"); ap.add_argument("--name"); ap.add_argument("--out", required=True)
    a = ap.parse_args(argv)
    req = {"out": str(pathlib.Path(a.out).resolve()), "size": a.size, "seed": a.seed}
    if a.name: req["name"] = a.name
    if a.accent: req["accent"] = a.accent
    caption = pathlib.Path(a.caption_file).read_text(encoding="utf-8") if a.caption_file else a.caption
    if a.spec:
        req["spec"] = json.load(open(a.spec, encoding="utf-8"))
    elif caption:
        req["caption"] = caption
        if a.template: req["template"] = a.template
        if a.image: req["photos"] = [str(pathlib.Path(a.image).resolve())]
    else:
        if not a.template: ap.error("--template, --caption/--caption-file or --spec is required")
        sch = json.load(open(TP / a.template / "slots.json", encoding="utf-8"))
        keys = {s["key"]: s for s in sch["slots"]}; slots = {}
        pick = lambda cands: next((k for k in cands if k in keys), None)
        if a.headline is not None:
            k = pick(HEADLINE_KEYS) or ap.error(f"{a.template} has no headline slot"); slots[k] = a.headline
        if a.body is not None:
            k = pick(BODY_KEYS) or ap.error(f"{a.template} has no body slot"); slots[k] = a.body
        if a.icon:
            k = next((s["key"] for s in sch["slots"] if s["type"] == "icon"), None) or ap.error(f"{a.template} has no icon slot"); slots[k] = a.icon
        if a.image:
            k = next((s["key"] for s in sch["slots"] if s["type"] == "image"), None) or ap.error(f"{a.template} has no image slot"); slots[k] = str(pathlib.Path(a.image).resolve())
        for kv in a.slot:
            k, _, v = kv.partition("=")
            if k not in keys: ap.error(f"{a.template} has no slot {k!r}; slots: {', '.join(keys)}")
            try: slots[k] = json.loads(v) if v[:1] in "[{" else v
            except json.JSONDecodeError: slots[k] = v
        for k, v in slots.items():
            m = keys[k].get("max")
            if m and isinstance(v, str) and len(v) > m: print(f"warning: {k} is {len(v)} chars (slot max {m}); autofit may truncate", file=sys.stderr)
        req["template"] = a.template; req["slots"] = slots
    env = {**os.environ, "NODE_PATH": str(ROOT / "node_modules")}
    r = subprocess.run(["node", str(B / "scripts" / "post_render.mjs")], input=json.dumps(req), capture_output=True, text=True, encoding="utf-8", cwd=ROOT, env=env)
    if r.returncode: sys.exit(r.stderr.strip()[-2000:] or "render failed")
    rec = json.loads(r.stdout)
    for f in rec["files"]: print(f)
    print(f"{rec['pages']} page(s), {rec['size']}, {rec['accent']}, fonts: {rec['fonts']}" + (f", auto: {rec['choice']}" if rec.get("choice") else "")
          + ("".join(f"\nwarning: {w}" for w in rec["warnings"])) + ("".join(f"\nerror: {e}" for e in rec["errors"])), file=sys.stderr)
    return rec

if __name__ == "__main__":
    main()
