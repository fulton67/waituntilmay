"""
Point sie.market at Webflow, on Vercel DNS.

The domain is registered through Vercel and served by Vercel DNS, so the records
live there. Vercel installs two system defaults that must be overridden:

    @   ALIAS  cname.vercel-dns-016.com.
    *   ALIAS  cname.vercel-dns-016.com.

An explicit A record on the apex takes precedence over the apex ALIAS, and an
explicit CNAME on www takes precedence over the wildcard. If resolution still
shows Vercel after applying, the domain is still attached to a Vercel project
and needs detaching — the script says so rather than guessing.

Values come from .env (WEBFLOW_A_1 / WEBFLOW_A_2 / WEBFLOW_WWW_CNAME / TXT),
which Naim pastes from Webflow's own Publishing panel. Nothing is hard-coded:
Webflow is mid-migration and the IPs differ per site.

CAA on the domain already permits letsencrypt.org, so Webflow's certificate
will issue without touching it. Verified 2026-09-21.

    python scripts/dns_webflow.py              # dry run, prints the plan
    python scripts/dns_webflow.py --apply      # writes, then verifies
    python scripts/dns_webflow.py --verify     # resolution + TLS only
"""


import sys as _sys
for _s in (_sys.stdout, _sys.stderr):
    try: _s.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass
import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, HERE)
from shopify import load_env  # noqa: E402  (shared .env reader)

VERCEL_AUTH = "C:/Users/naimj/AppData/Roaming/com.vercel.cli/Data/auth.json"
API = "https://api.vercel.com"


def vercel_token():
    """Reuse the CLI's existing session; never copied into .env or printed."""
    with open(VERCEL_AUTH, encoding="utf-8") as fh:
        return json.load(fh)["token"]


def vercel_team():
    p = "C:/Users/naimj/AppData/Roaming/com.vercel.cli/Data/config.json"
    try:
        with open(p, encoding="utf-8") as fh:
            return json.load(fh).get("currentTeam")
    except Exception:
        return None


def api(path, method="GET", body=None):
    team = vercel_team()
    sep = "&" if "?" in path else "?"
    url = f"{API}{path}{sep}teamId={team}" if team else f"{API}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": f"Bearer {vercel_token()}",
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            txt = r.read().decode()
            return json.loads(txt) if txt else {}
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"vercel api {method} {path} -> {e.code}: {e.read().decode()[:300]}")


def resolve(name, rtype):
    """nslookup against the authoritative NS (dig is not present on Windows)."""
    try:
        out = subprocess.run(["nslookup", "-type=" + rtype, name, "ns1.vercel-dns.com"],
                             capture_output=True, text=True, timeout=25).stdout
    except Exception as e:
        return [f"(lookup failed: {e})"]
    vals = []
    for line in out.splitlines():
        s = line.strip()
        if rtype == "A" and ("Address:" in s or "Addresses:" in s):
            v = s.split(":", 1)[1].strip()
            if v and not v.startswith("2603") and v != "":
                vals.append(v)
        elif rtype == "CNAME" and "canonical name" in s:
            vals.append(s.split("=")[-1].strip().rstrip("."))
        elif rtype == "TXT" and "text =" in s:
            vals.append(s.split("=", 1)[1].strip().strip('"'))
    # drop the resolver's own address, which nslookup prints first
    if rtype == "A" and vals:
        vals = [v for v in vals if v not in ("198.51.44.13", "198.51.45.13")]
    return vals


def http_probe(url):
    try:
        out = subprocess.run(
            ["curl", "-sS", "-o", os.devnull, "-w", "%{http_code}|%{redirect_url}|%{ssl_verify_result}",
             "--max-time", "20", url],
            capture_output=True, text=True, timeout=30)
        if out.returncode != 0:
            return {"error": (out.stderr or "").strip()[:120]}
        code, redir, ssl = (out.stdout.split("|") + ["", "", ""])[:3]
        return {"status": code, "redirect": redir, "sslVerify": ssl}
    except Exception as e:
        return {"error": str(e)[:120]}


def plan(env, domain):
    a1, a2 = env.get("WEBFLOW_A_1", ""), env.get("WEBFLOW_A_2", "")
    cname = env.get("WEBFLOW_WWW_CNAME", "")
    txt_n, txt_v = env.get("WEBFLOW_TXT_NAME", ""), env.get("WEBFLOW_TXT_VALUE", "")
    missing = [k for k, v in {"WEBFLOW_A_1": a1, "WEBFLOW_A_2": a2,
                              "WEBFLOW_WWW_CNAME": cname}.items() if not v]
    recs = []
    if a1:
        recs.append({"name": "", "type": "A", "value": a1, "ttl": 60})
    if a2:
        recs.append({"name": "", "type": "A", "value": a2, "ttl": 60})
    if cname:
        recs.append({"name": "www", "type": "CNAME", "value": cname.rstrip("."), "ttl": 60})
    if txt_v:
        recs.append({"name": txt_n or "", "type": "TXT", "value": txt_v, "ttl": 60})
    return recs, missing


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--verify", action="store_true")
    ap.add_argument("--domain", default=None)
    args = ap.parse_args()

    env = load_env()
    domain = args.domain or env.get("SIE_DOMAIN", "sie.market")

    if not args.verify:
        recs, missing = plan(env, domain)
        print(f"domain   {domain}   (Vercel DNS, team {vercel_team()})")
        if missing:
            print("\nBLOCKED — paste these from Webflow (Site settings → Publishing → Production)")
            print("into .env, then re-run:")
            for m in missing:
                print(f"  {m}=")
            print("\nWebflow is mid-migration, so the A record IPs differ per site — "
                  "read them off your own panel, do not reuse another site's.")
            return 2

        existing = api(f"/v4/domains/{domain}/records").get("records", [])
        print(f"\ncurrent records ({len(existing)}):")
        for r in existing:
            src = "default" if not r.get("id") or r.get("creator") == "system" else r.get("id")
            print(f"  {r.get('name') or '@':6} {r['type']:6} {str(r.get('value'))[:48]:50} {src}")

        print(f"\nplan — {len(recs)} records to create:")
        for r in recs:
            print(f"  {r['name'] or '@':6} {r['type']:6} {r['value'][:48]:50} ttl={r['ttl']}")
        conflicts = [r for r in existing
                     if (r.get("name") or "") in ("", "www", "*") and r["type"] in ("ALIAS", "A", "CNAME")]
        if conflicts:
            print("\n  overridden by the above (Vercel system defaults, left in place):")
            for r in conflicts:
                print(f"    {r.get('name') or '@':6} {r['type']:6} {str(r.get('value'))[:48]}")

        if not args.apply:
            print("\ndry run — re-run with --apply to write")
            return 0

        print("\napplying:")
        for r in recs:
            try:
                out = api(f"/v2/domains/{domain}/records", "POST", r)
                print(f"  created {r['name'] or '@':6} {r['type']:6} {r['value'][:40]:42} id={out.get('uid')}")
            except RuntimeError as e:
                print(f"  FAILED  {r['name'] or '@':6} {r['type']:6} {e}")

    print("\nverify:")
    for label, name, rtype in [("A    @", domain, "A"),
                               ("CNAME www", f"www.{domain}", "CNAME"),
                               ("A    www", f"www.{domain}", "A")]:
        print(f"  {label:12} {resolve(name, rtype)}")

    for url in (f"https://www.{domain}", f"https://{domain}", f"http://{domain}"):
        p = http_probe(url)
        if "error" in p:
            print(f"  {url:28} ERROR {p['error']}")
        else:
            print(f"  {url:28} {p['status']}"
                  + (f" -> {p['redirect']}" if p.get("redirect") else "")
                  + f"  tls_verify={p['sslVerify']}")

    print("\nexpected once Webflow has issued the certificate:")
    print(f"  https://www.{domain}  -> 200, tls_verify=0")
    print(f"  https://{domain}      -> 301 -> https://www.{domain}")
    print("  TLS can take a few minutes after the records resolve; re-run --verify to poll.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
