# Reading packets: comments grouped by category, for a human read.
import json, re, sys, collections, os
sys.stdout.reconfigure(encoding="utf-8")
d = json.load(open("data/hn.json", encoding="utf-8"))
full = {}
import glob
for f in glob.glob("raw/threads/*.json"):
    t = json.load(open(f, encoding="utf-8"))
    for c in t["comments"]: full[c["id"]] = c["text"]
hits = json.load(open("raw/ontopic.json", encoding="utf-8"))
def text(x): return full.get(x["id"]) or (hits.get(x["id"]) or {}).get("text") or x["claim_excerpt"]
MASS = {"tokens:Tailwind theme/config", "components_docs:Figma", "components_docs:shadcn/ui", "components_docs:Bootstrap", "components_docs:MUI / Material UI", "components_docs:Radix UI", "components_docs:Storybook", "components_docs:Penpot", "components_docs:Sketch", "tokens:Sass variables", "tokens:CSS custom properties"}
KEY = re.compile(r"token|design system|brand|single source|source of truth|theme|variables|export|generate|pipeline|figma.*(code|sync)|sync|marketing|social|video|print", re.I)
os.makedirs("raw/packets", exist_ok=True)
for cat in ["tokens", "components_docs", "rendering", "icons", "video_motion"]:
    out = []
    for x in d:
        ts = [t for t in x["tools"] if t.startswith(cat + ":")]
        if not ts: continue
        tx = text(x)
        if all(t in MASS for t in ts) and not (KEY.search(tx) and (x["context"] in ("brand/marketing/content", "both") or re.search(r"token|design system|source of truth", tx, re.I))): continue
        out.append(f"[{x['id']}|{x['date']}|{x['context'][:5]}|{','.join(t.split(':',1)[1] for t in ts)}] ({(x['title'] or '')[:60]}) {tx[:900]}")
    open(f"raw/packets/{cat}.txt", "w", encoding="utf-8").write("\n".join(out))
    print(cat, len(out), sum(map(len, out)))
