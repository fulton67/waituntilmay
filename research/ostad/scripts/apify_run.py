"""Cached Apify actor runner.

usage (as module):  from apify_run import run
    items = run("tiktok__botox", "clockworks/tiktok-scraper", {...}, est_items=20)

- Skips the run if raw/{key}.json exists with items (returns cached items).
- Refuses to start if spent + estimate would pass BUDGET_USD.
- Logs run id, items, usageTotalUsd to data/costs.json and regenerates COSTS.md.
"""
import json, os, sys, time, pathlib, threading
LOCK = threading.Lock()
from apify_client import ApifyClient

ROOT = pathlib.Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
RAW, DATA = ROOT / "raw", ROOT / "data"
COSTS = DATA / "costs.json"
BUDGET_USD = 6.50

PRICE = {  # per-item price from the actors' pricing (FREE tier), for estimates
    "clockworks/tiktok-scraper": 0.0037, "apify/instagram-scraper": 0.0027,
    "apify/instagram-hashtag-scraper": 0.0026, "streamers/youtube-scraper": 0.004,
    "trudax/reddit-scraper-lite": 0.004, "curious_coder/facebook-ads-library-scraper": 0.00075, "fatihtahta/reddit-scraper-search-fast": 0.0015, "harshmaur/reddit-scraper": 0.0025, "clockworks/tiktok-comments-scraper": 0.00125,
}


def token():
    t = os.environ.get("APIFY_TOKEN") or os.environ.get("APIFY_API_TOKEN")
    if t:
        return t
    for line in (REPO / ".env").read_text().splitlines():
        if line.startswith(("APIFY_TOKEN=", "APIFY_API_TOKEN=")):
            return line.split("=", 1)[1].strip().strip('"')
    sys.exit("no APIFY_TOKEN")


def load_costs():
    return json.loads(COSTS.read_text()) if COSTS.exists() else []


def spent():
    return round(sum(max(r.get("usd") or 0, r.get("est") or 0) for r in load_costs()), 4)


def write_costs_md(rows):
    lines = ["# Apify spend", "",
             "Spec cap $20. Real ceiling: account limit $10/month with $2.73 already used before this run, so the run budget is $6.50.",
             "", f"**Total this run: ${sum(r.get('usd') or 0 for r in rows):.2f}** across {len(rows)} runs.", "",
             "| key | actor | run id | items | usd | status |", "|---|---|---|---|---|---|"]
    for r in rows:
        lines.append(f"| {r['key']} | {r['actor']} | {r.get('run_id','')} | {r.get('items',0)} | {r.get('usd') or 0:.4f} | {r.get('status','')} |")
    (ROOT / "COSTS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def _d(o):
    if o is None or isinstance(o, dict):
        return o
    if hasattr(o, "model_dump"):
        return o.model_dump(by_alias=True, mode="json")
    return dict(o)


MEM = {"clockworks/tiktok-scraper": 2048, "clockworks/tiktok-comments-scraper": 2048, "streamers/youtube-scraper": 1024}


def run(key, actor, run_input, est_items=10, wait=900, force=False):
    out = RAW / f"{key}.json"
    if out.exists() and not force:
        cached = json.loads(out.read_text(encoding="utf-8"))
        if cached.get("items"):
            return cached["items"]
    est = est_items * PRICE.get(actor, 0.005) + 0.01
    if spent() + est > BUDGET_USD:
        print(f"[budget] skip {key}: spent {spent():.2f} + est {est:.2f} > {BUDGET_USD}")
        return []
    client = ApifyClient(token())
    t0 = time.time()
    from datetime import timedelta
    from decimal import Decimal
    r = client.actor(actor).call(run_input=run_input, wait_duration=timedelta(seconds=wait), logger=None, memory_mbytes=MEM.get(actor),
                                 max_total_charge_usd=Decimal(str(max(0.5, round(est * 1.5 + 0.02, 3)))))
    r = _d(r)
    items = list(client.dataset(r["defaultDatasetId"]).iterate_items()) if r else []
    usd = (_d(client.run(r["id"]).get()) or {}).get("usageTotalUsd") or 0 if r else 0
    out.write_text(json.dumps({"key": key, "actor": actor, "input": run_input, "run_id": r and r["id"],
                               "status": r and r["status"], "usd": usd, "items": items}, ensure_ascii=False),
                   encoding="utf-8")
    with LOCK:
      rows = [x for x in load_costs() if x["key"] != key]
      rows.append({"key": key, "actor": actor, "run_id": r and r["id"], "items": len(items), "usd": usd, "est": round(len(items) * PRICE.get(actor, 0.005) + 0.01, 4),
                   "status": r and r["status"], "secs": round(time.time() - t0)})
      COSTS.write_text(json.dumps(rows, indent=1))
      write_costs_md(rows)
    print(f"[run] {key}: {len(items)} items, ${usd:.4f}, total ${spent():.2f}")
    return items


if __name__ == "__main__":
    print("spent", spent())
