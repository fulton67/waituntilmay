"""
Wait for the Dev Dashboard app to be installed on the store.

The blocker is not an .env value, so the .env poller cannot see it. This
retries the client-credentials token mint until it stops returning
app_not_installed, then reports the granted scopes and exits 0 so the full
pass can run.

Exits:
    0  token minted — prints scopes and whether the required set is present
    2  timed out still uninstalled
    3  a different, non-transient error (bad credentials, shop_not_permitted)

Prints scope names and error codes only. Never prints credentials.

    python scripts/wait_install.py [tries] [interval_seconds]
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

REQUIRED = ["read_products", "write_products", "read_inventory", "write_inventory",
            "read_locations", "write_publications"]
NICE = ["read_shipping", "write_shipping", "read_orders"]


def attempt(store, cid, secret):
    """-> (ok, scopes, error_code, detail)"""
    url = f"https://{store}/admin/oauth/access_token"
    body = json.dumps({"client_id": cid, "client_secret": secret,
                       "grant_type": "client_credentials"}).encode()
    req = urllib.request.Request(url, data=body, method="POST", headers={
        "Content-Type": "application/json", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            d = json.loads(r.read().decode())
        if "access_token" not in d:
            return False, None, "no_token_in_response", json.dumps(d)[:200]
        return True, (d.get("scope") or ""), None, None
    except urllib.error.HTTPError as e:
        raw = e.read().decode()[:300]
        try:
            j = json.loads(raw)
            return False, None, j.get("error", f"http_{e.code}"), j.get("error_description", "")
        except Exception:
            return False, None, f"http_{e.code}", raw
    except Exception as exc:
        return False, None, "network", repr(exc)[:160]


def main():
    tries = int(sys.argv[1]) if len(sys.argv) > 1 else 120
    interval = int(sys.argv[2]) if len(sys.argv) > 2 else 60

    env = load_env()
    store = env.get("SHOPIFY_STORE_DOMAIN", "")
    cid = env.get("SHOPIFY_CLIENT_ID", "")
    secret = env.get("SHOPIFY_CLIENT_SECRET", "")
    if not (store and cid and secret):
        print("missing SHOPIFY_STORE_DOMAIN / CLIENT_ID / CLIENT_SECRET in .env")
        return 3

    print(f"watching {store} for app install "
          f"(every {interval}s, up to {tries * interval // 60} min)", flush=True)

    last = None
    for i in range(1, tries + 1):
        ok, scope, err, detail = attempt(store, cid, secret)
        if ok:
            scopes = [s.strip() for s in scope.split(",") if s.strip()]
            print(f"\nINSTALLED — token minted after {i * interval}s", flush=True)
            print(f"  scopes granted ({len(scopes)}): {', '.join(scopes) or '(none reported)'}")
            missing = [s for s in REQUIRED if s not in scopes]
            extra_missing = [s for s in NICE if s not in scopes]
            if missing:
                print(f"  MISSING REQUIRED: {', '.join(missing)}")
            else:
                print("  all required scopes present: " + ", ".join(REQUIRED))
            if extra_missing:
                print(f"  absent (optional for this pass): {', '.join(extra_missing)}")
            return 0
        if err != last:
            print(f"  [{i * interval:>5}s] {err}"
                  + (f" — {detail[:90]}" if detail else ""), flush=True)
            last = err
        if err not in ("app_not_installed", "network"):
            print(f"\nSTOPPING — non-transient error: {err} {detail[:200]}")
            return 3
        time.sleep(interval)

    print(f"\nTIMEOUT after {tries * interval // 60} min — still {last}")
    return 2


if __name__ == "__main__":
    sys.exit(main())
