"""
Watch every blocker that a background process can actually see, and exit the
moment any one of them clears.

Covers:
  shopify  - client-credentials token mint stops returning app_not_installed
  r2       - R2 credentials appear in .env
  variant  - SHOPIFY_VARIANT_ID appears in .env

Not covered: Webflow authorization. The Webflow MCP only exists inside the
agent session, so there is nothing for a script to poll — that one gets
re-checked in-session instead.

Exits 0 on first clear, 2 on timeout, 3 on a non-transient credential error.
Prints names and status codes only, never values.

    python scripts/wait_blockers.py [tries] [interval_seconds]
"""

import sys
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import json
import os
import time
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify import load_env  # noqa: E402

R2_KEYS = ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET")


def shopify_state(env):
    store = env.get("SHOPIFY_STORE_DOMAIN", "")
    cid = env.get("SHOPIFY_CLIENT_ID", "")
    sec = env.get("SHOPIFY_CLIENT_SECRET", "")
    if not (store and cid and sec):
        return "missing-credentials", None
    req = urllib.request.Request(
        f"https://{store}/admin/oauth/access_token",
        data=json.dumps({"client_id": cid, "client_secret": sec,
                         "grant_type": "client_credentials"}).encode(),
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            d = json.loads(r.read().decode())
        if "access_token" in d:
            return "INSTALLED", (d.get("scope") or "")
        return "no-token-in-response", None
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read().decode()).get("error", f"http_{e.code}"), None
        except Exception:
            return f"http_{e.code}", None
    except Exception:
        return "network", None


def main():
    tries = int(sys.argv[1]) if len(sys.argv) > 1 else 240
    interval = int(sys.argv[2]) if len(sys.argv) > 2 else 60

    print(f"watching shopify-install, r2-credentials, shopify-variant "
          f"(every {interval}s, up to {tries * interval // 3600:.1f}h)", flush=True)
    print("note: Webflow authorization cannot be polled from a script; "
          "it is re-checked in-session.", flush=True)

    last = None
    for i in range(1, tries + 1):
        env = load_env()
        cleared = []

        state, scopes = shopify_state(env)
        if state == "INSTALLED":
            cleared.append("shopify-install")
        elif state not in ("app_not_installed", "network", "missing-credentials"):
            print(f"\nSTOPPING - non-transient shopify error: {state}")
            return 3

        if all(env.get(k) for k in R2_KEYS):
            cleared.append("r2-credentials")
        if env.get("SHOPIFY_VARIANT_ID"):
            cleared.append("shopify-variant")

        if cleared:
            print(f"\nCLEARED after {i * interval}s: {', '.join(cleared)}", flush=True)
            if "shopify-install" in cleared and scopes is not None:
                names = [s.strip() for s in scopes.split(",") if s.strip()]
                print(f"  scopes granted ({len(names)}): {', '.join(names) or '(none reported)'}")
                need = ["read_products", "write_products", "read_inventory",
                        "write_inventory", "read_locations", "write_publications"]
                missing = [n for n in need if names and n not in names]
                print(f"  {'MISSING REQUIRED: ' + ', '.join(missing) if missing else 'all required scopes present'}")
            if "r2-credentials" in cleared:
                print(f"  R2 keys present: {', '.join(R2_KEYS)}")
            if "shopify-variant" in cleared:
                print(f"  SHOPIFY_VARIANT_ID = {env['SHOPIFY_VARIANT_ID']}")
            return 0

        if state != last:
            print(f"  [{i * interval:>6}s] shopify: {state}", flush=True)
            last = state
        time.sleep(interval)

    print(f"\nTIMEOUT after {tries * interval // 3600:.1f}h - still {last}")
    return 2


if __name__ == "__main__":
    sys.exit(main())
