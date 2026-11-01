"""Create the weekly workflow in n8n via the public API. Needs N8N_HOST + N8N_API_KEY (env or repo .env).
python research/ostad/n8n/create_workflow.py   -> prints the new workflow id, or why it could not."""
import json, os, pathlib, sys, requests
HERE = pathlib.Path(__file__).resolve().parent
env = {}
for line in (HERE.parents[2] / ".env").read_text().splitlines():
    if "=" in line:
        k, v = line.split("=", 1); env[k.strip()] = v.strip().strip('"')
host = (os.environ.get("N8N_HOST") or env.get("N8N_HOST") or "").rstrip("/")
key = os.environ.get("N8N_API_KEY") or env.get("N8N_API_KEY")
if not (host and key):
    sys.exit("N8N_HOST / N8N_API_KEY missing: import ostad-weekly-refresh.json by hand (n8n → Workflows → Import from file)")
wf = json.loads((HERE / "ostad-weekly-refresh.json").read_text(encoding="utf-8"))
body = {k: wf[k] for k in ("name", "nodes", "connections", "settings")}
r = requests.post(f"{host}/api/v1/workflows", json=body, headers={"X-N8N-API-KEY": key}, timeout=30)
print(r.status_code, r.text[:300])
