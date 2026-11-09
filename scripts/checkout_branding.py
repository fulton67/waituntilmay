"""Attempt checkoutBrandingUpsert on the published checkout profile.

Introspects first, because the mutation is plan-gated: it exists on the schema
only for Shopify Plus. If it is absent or denied, this prints the exact
Settings -> Checkout -> Customize values once and stops. No retries.

Prints no credentials: the token is minted inside scripts/shopify.py from .env
and never leaves it.

    python scripts/checkout_branding.py
"""

import sys
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception: pass

import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from shopify import Shopify                                    # noqa: E402

BG = "#000000"
INK = "#F2F2F2"
BTN = "#0A0A0A"
BRAND = "#0A0A0A"
FONT = 'Helvetica Neue, Helvetica, Arial, sans-serif'
LOGO = os.path.join(os.path.dirname(HERE), "site", "assets", "sie-logo.png")

INTROSPECT = """
query {
  mutationType: __type(name: "Mutation") { fields { name } }
  queryType:    __type(name: "QueryRoot") { fields { name } }
}
"""

PROFILES = """
query { checkoutProfiles(first: 20) {
  nodes { id name isPublished typOgraphyStub: id } } }
"""

PROFILES_MIN = """
query { checkoutProfiles(first: 20) { nodes { id name isPublished } } }
"""

UPSERT = """
mutation ($id: ID!, $input: CheckoutBrandingInput!) {
  checkoutBrandingUpsert(checkoutProfileId: $id, checkoutBrandingInput: $input) {
    checkoutBranding { designSystem { colors { global { brand } } } }
    userErrors { field message }
  }
}
"""


def manual_block():
    print()
    print("=" * 68)
    print("CHECKOUT BRANDING — DO THIS BY HAND")
    print("Shopify admin -> Settings -> Checkout -> Customize")
    print("=" * 68)
    print(f"  Background                 {BG}")
    print(f"  Text / body                {INK}")
    print(f"  Primary button background  {BTN}")
    print(f"  Primary button text        {INK}")
    print(f"  Brand / accent             {BRAND}")
    print(f"  Button corner radius       Large (pill)")
    print(f"  Typography                 {FONT}")
    print(f"  Logo                       {os.path.relpath(LOGO)}")
    print(f"  Logo max width             ~120 px")
    print("=" * 68)


def main():
    sh = Shopify()

    d = sh.gql(INTROSPECT)
    muts = {f["name"] for f in d["mutationType"]["fields"]}
    queries = {f["name"] for f in d["queryType"]["fields"]}
    has_mut = "checkoutBrandingUpsert" in muts
    has_q = "checkoutProfiles" in queries
    print(f"schema: checkoutProfiles query      {'present' if has_q else 'ABSENT'}")
    print(f"schema: checkoutBrandingUpsert      {'present' if has_mut else 'ABSENT'}")
    print(f"schema: fileCreate                  {'present' if 'fileCreate' in muts else 'ABSENT'}")

    profiles = []
    if has_q:
        try:
            p = sh.gql(PROFILES_MIN)
            profiles = p["checkoutProfiles"]["nodes"]
            for n in profiles:
                print(f"  profile  {n['id']}  published={n['isPublished']}  {n['name']!r}")
        except Exception as e:
            print(f"  checkoutProfiles query failed: {str(e)[:200]}")

    if not has_mut:
        print()
        print("checkoutBrandingUpsert is not on this store's schema "
              "(it is a Shopify Plus capability). Not retrying.")
        manual_block()
        return 2

    published = next((n for n in profiles if n.get("isPublished")), None)
    if not published:
        print("no published checkout profile; nothing to brand")
        manual_block()
        return 2

    inp = {
        "designSystem": {
            "colors": {
                "global": {"brand": BRAND},
                "schemes": {"scheme1": {
                    "base": {"background": BG, "text": INK},
                    "primaryButton": {"background": BTN, "text": INK},
                }},
            },
            "typography": {
                "primary": {"customFontGroup": None, "shopifyFontGroup":
                            {"name": "Helvetica"}},
            },
        },
        "customizations": {
            "primaryButton": {"cornerRadius": "LARGE"},
        },
    }
    try:
        r = sh.gql(UPSERT, {"id": published["id"], "input": inp})
        errs = r["checkoutBrandingUpsert"]["userErrors"]
        if errs:
            print("userErrors:", json.dumps(errs, indent=1)[:800])
            manual_block()
            return 2
        print("checkoutBrandingUpsert OK:",
              json.dumps(r["checkoutBrandingUpsert"]["checkoutBranding"])[:300])
        return 0
    except Exception as e:
        print(f"checkoutBrandingUpsert failed: {str(e)[:300]}")
        manual_block()
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
