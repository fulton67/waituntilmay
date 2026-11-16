"""Generate one image with Meta Muse Image via OpenRouter (meta/muse-image).
usage: python -I gen_muse.py OUT.png "PROMPT" [ref.png|https://... ...] [--ar 3:4]
Prompt may be @file to read text from a file. Refs are sent as data URLs (local) or URLs. Key comes from OPENROUTER_API_KEY."""
import base64, json, os, sys, urllib.request
ENDPOINT = os.environ.get("MUSE_ENDPOINT", "https://openrouter.ai/api/v1/images/generations")
args = sys.argv[1:]
ar = None
if "--ar" in args:
    i = args.index("--ar"); ar = args[i + 1]; del args[i:i + 2]
out, prompt, refs = args[0], args[1], args[2:]
if prompt.startswith("@"):
    prompt = open(prompt[1:], encoding="utf8").read()
refs_c = []
for r in refs:
    url = r if r.startswith("http") else "data:image/png;base64," + base64.b64encode(open(r, "rb").read()).decode()
    refs_c.append({"type": "image_url", "image_url": {"url": url}})
body = {"model": "meta/muse-image", "prompt": prompt, "output_format": "png", "quality": "high"}
if refs_c: body["input_references"] = refs_c
if ar: body["aspect_ratio"] = ar
req = urllib.request.Request(ENDPOINT, data=json.dumps(body).encode(),
                             headers={"Authorization": "Bearer " + os.environ["OPENROUTER_API_KEY"], "Content-Type": "application/json"})
import time
for attempt in range(5):
    try:
        raw = urllib.request.urlopen(req, timeout=900).read().decode(); break
    except urllib.error.HTTPError as e:
        msg = e.read()[:400].decode(errors="replace")
        if e.code in (429, 500, 502, 503, 504) and attempt < 4:
            time.sleep(10 * (attempt + 1)); continue
        print("HTTP", e.code, msg); sys.exit(1)
# plain JSON or an SSE stream: find the first b64_json / url anywhere in it
objs = []
for line in raw.splitlines():
    line = line.strip()
    if line.startswith("data:"): line = line[5:].strip()
    if line.startswith("{"):
        try: objs.append(json.loads(line))
        except Exception: pass
if not objs:
    try: objs = [json.loads(raw)]
    except Exception: pass
def find(o):
    if isinstance(o, dict):
        for k in ("b64_json", "url"):
            if isinstance(o.get(k), str) and len(o[k]) > 20: return k, o[k]
        for v in o.values():
            r = find(v)
            if r: return r
    if isinstance(o, list):
        for v in o:
            r = find(v)
            if r: return r
hit = None
for o in objs:
    hit = find(o)
    if hit: break
if not hit:
    print("no image:", raw[:800]); sys.exit(1)
k, v = hit
if k == "b64_json": data = base64.b64decode(v)
elif v.startswith("data:"): data = base64.b64decode(v.split(",", 1)[1])
else: data = urllib.request.urlopen(v).read()
res = objs[-1] if objs else {}
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
open(out, "wb").write(data)
print("ok", out, len(data), "bytes; usage", res.get("usage", {}).get("cost"))
