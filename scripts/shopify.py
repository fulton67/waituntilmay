"""
Shopify Admin client — Dev Dashboard app, client-credentials grant.

Legacy admin custom apps (the "Develop apps" flow with a pasted Admin API token)
cannot be created since 2026-01-01. A Dev Dashboard app instead exchanges
client_id + client_secret for a short-lived access token:

    POST https://{store}/admin/oauth/access_token
         {client_id, client_secret, grant_type: "client_credentials"}
    -> {access_token, scope, expires_in}

The token is cached in .shopify-token.json (gitignored) and re-minted when it is
within 5 minutes of expiry, so no Admin token is ever pasted into .env.

Usage:
    from shopify import Shopify
    sh = Shopify()                       # reads .env
    data = sh.gql(QUERY, {"id": gid})    # raises on userErrors
"""


import sys as _sys
for _s in (_sys.stdout, _sys.stderr):
    try: _s.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass
import json
import os
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
ENV_PATH = os.path.join(ROOT, ".env")
TOKEN_CACHE = os.path.join(ROOT, ".shopify-token.json")


def load_env(path=ENV_PATH):
    env = {}
    if not os.path.exists(path):
        return env
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            v = v.split("#")[0].strip().strip('"').strip("'")
            env[k.strip()] = v
    return env


def set_env(updates, path=ENV_PATH):
    """Write keys back into .env in place, preserving comments and order."""
    lines = []
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            lines = fh.read().split("\n")
    remaining = dict(updates)
    for i, line in enumerate(lines):
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        k = s.split("=", 1)[0].strip()
        if k in remaining:
            comment = ""
            if "#" in line and line.index("#") > line.index("="):
                comment = "   " + line[line.index("#"):]
            lines[i] = f"{k}={remaining.pop(k)}{comment}"
    for k, v in remaining.items():
        lines.append(f"{k}={v}")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))
    return list(updates)


class ShopifyError(RuntimeError):
    pass


class Shopify:
    def __init__(self, env=None):
        self.env = env or load_env()
        self.store = self.env.get("SHOPIFY_STORE_DOMAIN", "").strip()
        self.client_id = self.env.get("SHOPIFY_CLIENT_ID", "").strip()
        self.client_secret = self.env.get("SHOPIFY_CLIENT_SECRET", "").strip()
        self.version = self.env.get("SHOPIFY_API_VERSION", "2026-07").strip()
        missing = [k for k, v in {
            "SHOPIFY_STORE_DOMAIN": self.store,
            "SHOPIFY_CLIENT_ID": self.client_id,
            "SHOPIFY_CLIENT_SECRET": self.client_secret,
        }.items() if not v]
        if missing:
            raise ShopifyError("missing in .env: " + ", ".join(missing))
        if not self.store.endswith(".myshopify.com"):
            raise ShopifyError(
                f"SHOPIFY_STORE_DOMAIN should be the xxx.myshopify.com host, got {self.store!r}")
        self._token = None
        self._scopes = None

    # ---------- token ----------

    def _cached(self):
        if not os.path.exists(TOKEN_CACHE):
            return None
        try:
            with open(TOKEN_CACHE, encoding="utf-8") as fh:
                d = json.load(fh)
        except Exception:
            return None
        if d.get("store") != self.store:
            return None
        if d.get("expires_at", 0) - time.time() < 300:   # 5 min safety margin
            return None
        return d

    def token(self, force=False):
        if self._token and not force:
            return self._token
        if not force:
            c = self._cached()
            if c:
                self._token = c["access_token"]
                self._scopes = c.get("scope", "")
                return self._token

        url = f"https://{self.store}/admin/oauth/access_token"
        body = json.dumps({
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "client_credentials",
        }).encode()
        req = urllib.request.Request(url, data=body, method="POST",
                                     headers={"Content-Type": "application/json",
                                              "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                d = json.loads(r.read().decode())
                status = r.status
        except urllib.error.HTTPError as e:
            raise ShopifyError(
                f"token mint failed {e.code}: {e.read().decode()[:400]}\n"
                "Check that the Dev Dashboard app is installed on this store and that "
                "client credentials are enabled for it.") from None

        if "access_token" not in d:
            raise ShopifyError(f"no access_token in response ({status}): {json.dumps(d)[:300]}")
        self._token = d["access_token"]
        self._scopes = d.get("scope", "")
        with open(TOKEN_CACHE, "w", encoding="utf-8") as fh:
            json.dump({"store": self.store, "access_token": self._token,
                       "scope": self._scopes,
                       "expires_at": time.time() + int(d.get("expires_in", 3600)),
                       "minted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}, fh)
        os.chmod(TOKEN_CACHE, 0o600)
        return self._token

    def scopes(self):
        self.token()
        return (self._scopes or "").split(",") if self._scopes else []

    # ---------- graphql ----------

    def gql(self, query, variables=None, tries=3, allow_user_errors=False):
        url = f"https://{self.store}/admin/api/{self.version}/graphql.json"
        payload = json.dumps({"query": query, "variables": variables or {}}).encode()
        last = None
        for attempt in range(tries):
            req = urllib.request.Request(url, data=payload, method="POST", headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-Shopify-Access-Token": self.token(),
            })
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    d = json.loads(r.read().decode())
            except urllib.error.HTTPError as e:
                text = e.read().decode()[:400]
                if e.code == 401 and attempt == 0:
                    self.token(force=True)       # expired mid-run
                    continue
                if e.code in (429, 500, 502, 503) and attempt < tries - 1:
                    time.sleep(2 * (attempt + 1))
                    last = f"{e.code}: {text}"
                    continue
                raise ShopifyError(f"HTTP {e.code}: {text}") from None

            if d.get("errors"):
                msgs = [e.get("message", "") for e in d["errors"]]
                if any("Throttled" in m for m in msgs) and attempt < tries - 1:
                    time.sleep(3 * (attempt + 1))
                    last = "; ".join(msgs)
                    continue
                raise ShopifyError("GraphQL errors: " + json.dumps(d["errors"])[:600])

            data = d.get("data") or {}
            if not allow_user_errors:
                for _, v in data.items():
                    if isinstance(v, dict):
                        ue = v.get("userErrors") or v.get("mediaUserErrors") or []
                        if ue:
                            raise ShopifyError("userErrors: " + json.dumps(ue)[:600])
            return data
        raise ShopifyError(f"exhausted retries: {last}")

    # ---------- convenience ----------

    def shop_info(self):
        return self.gql("""
        query { shop { name myshopifyDomain primaryDomain { host url }
                       currencyCode ianaTimezone
                       billingAddress { city provinceCode countryCodeV2 } } }""")["shop"]


def numeric_id(gid):
    """gid://shopify/ProductVariant/123 -> '123'"""
    return str(gid).rstrip("/").split("/")[-1].split("?")[0]


if __name__ == "__main__":
    sh = Shopify()
    print("store   :", sh.store)
    print("token   : minted, expires in",
          int(json.load(open(TOKEN_CACHE))["expires_at"] - time.time()), "s")
    print("scopes  :", ", ".join(sh.scopes()) or "(none reported)")
    info = sh.shop_info()
    print("shop    :", info["name"], "|", info["myshopifyDomain"])
    print("currency:", info["currencyCode"], "| tz", info["ianaTimezone"])
    print("address :", info.get("billingAddress"))
