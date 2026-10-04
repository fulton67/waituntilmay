"""
Shopify product setup for sie.market — steps 2a–2f plus Headless publication.

Idempotent: every step looks for what it would create before creating it, so a
re-run after a partial failure resumes rather than duplicating.

Each step reads its result back with a query and prints IDs. Nothing is assumed.

    python scripts/shopify_setup.py --check          # creds + scopes + shop, no writes
    python scripts/shopify_setup.py --only product   # 2a
    python scripts/shopify_setup.py --only variant   # 2b
    python scripts/shopify_setup.py --only inventory # 2c
    python scripts/shopify_setup.py --only media     # 2d
    python scripts/shopify_setup.py --only shipping  # 2e
    python scripts/shopify_setup.py --only publish   # Headless channel
    python scripts/shopify_setup.py                  # all, in order

Product stays DRAFT until the end-to-end test passes (step 6).
"""


import sys as _sys
for _s in (_sys.stdout, _sys.stderr):
    try: _s.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass
import argparse
import json
import mimetypes
import os
import sys
import urllib.request
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shopify import Shopify, ShopifyError, load_env, set_env, numeric_id  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
MEDIA_DIR = os.path.join(ROOT, "assets", "web")

HANDLE = "tazparis-from-paris-with-love-cd"


def need(env, *keys):
    missing = [k for k in keys if not env.get(k)]
    if missing:
        raise SystemExit(f"blocked: {', '.join(missing)} not set in .env")
    return [env[k] for k in keys]


# ───────────────────────── 2a. product ─────────────────────────

Q_FIND = """
query($q: String!) {
  products(first: 5, query: $q) {
    nodes { id title handle status vendor productType
            variants(first: 5) { nodes { id title price sku
              inventoryItem { id tracked requiresShipping
                measurement { weight { unit value } } } } }
            media(first: 20) { nodes { id alt mediaContentType
              ... on MediaImage { image { url width height } } } } }
  }
}"""

M_PRODUCT_CREATE = """
mutation($product: ProductCreateInput!) {
  productCreate(product: $product) {
    product { id title handle status vendor productType
              variants(first: 5) { nodes { id title price } } }
    userErrors { field message }
  }
}"""


def step_product(sh, env):
    found = sh.gql(Q_FIND, {"q": f"handle:{HANDLE}"})["products"]["nodes"]
    if found:
        p = found[0]
        print(f"  exists  product {p['id']}  status={p['status']}  handle={p['handle']}")
    else:
        p = sh.gql(M_PRODUCT_CREATE, {"product": {
            "title": env["PRODUCT_TITLE"],
            "handle": HANDLE,
            "vendor": env["PRODUCT_VENDOR"],
            "productType": env["PRODUCT_TYPE"],
            "status": "DRAFT",
        }})["productCreate"]["product"]
        print(f"  created product {p['id']}  status={p['status']}")

    variants = (p.get("variants") or {}).get("nodes") or []
    if not variants:
        raise ShopifyError("product has no default variant")
    v = variants[0]
    set_env({"SHOPIFY_PRODUCT_GID": p["id"],
             "SHOPIFY_VARIANT_GID": v["id"],
             "SHOPIFY_VARIANT_ID": numeric_id(v["id"])})
    print(f"  variant {v['id']}  numeric={numeric_id(v['id'])}")
    return p["id"], v["id"]


# ───────────────────────── 2b. variant ─────────────────────────

M_VARIANT = """
mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants { id price
      inventoryItem { id tracked requiresShipping
        measurement { weight { unit value } } } }
    userErrors { field message }
  }
}"""


def step_variant(sh, env, product_gid, variant_gid):
    price = env.get("PRODUCT_PRICE")
    if not price:
        raise SystemExit("blocked: PRODUCT_PRICE is empty in .env")
    out = sh.gql(M_VARIANT, {
        "productId": product_gid,
        "variants": [{
            "id": variant_gid,
            "price": str(price),
            "inventoryItem": {
                "tracked": True,
                "requiresShipping": True,
                "measurement": {"weight": {
                    "unit": "GRAMS",
                    "value": float(env.get("PRODUCT_WEIGHT_GRAMS", 100))}},
            },
        }],
    })["productVariantsBulkUpdate"]["productVariants"][0]
    w = out["inventoryItem"]["measurement"]["weight"]
    print(f"  price={out['price']}  tracked={out['inventoryItem']['tracked']}  "
          f"requiresShipping={out['inventoryItem']['requiresShipping']}  "
          f"weight={w['value']} {w['unit']}")
    set_env({"SHOPIFY_INVENTORY_ITEM_GID": out["inventoryItem"]["id"]})
    return out["inventoryItem"]["id"]


# ───────────────────────── 2c. inventory ─────────────────────────

Q_LOCATIONS = """
query { locations(first: 10, includeInactive: false) {
  nodes { id name isActive shipsInventory
          address { city provinceCode countryCode zip } } } }"""

# 2026-07 requires @idempotent on inventorySetQuantities. The key is derived from the
# item+location+quantity, so a re-run of this idempotent script replays rather than
# double-applying, and a genuinely different target gets a different key.
M_SET_QTY = """
mutation($input: InventorySetQuantitiesInput!, $key: String!) {
  inventorySetQuantities(input: $input) @idempotent(key: $key) {
    inventoryAdjustmentGroup { createdAt reason
      changes { name delta quantityAfterChange } }
    userErrors { field message }
  }
}"""

M_ACTIVATE = """
mutation($inventoryItemId: ID!, $locationId: ID!, $available: Int) {
  inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId, available: $available) {
    inventoryLevel { id }
    userErrors { field message }
  }
}"""

Q_LEVELS = """
query($id: ID!) { inventoryItem(id: $id) {
  id tracked
  inventoryLevels(first: 10) { nodes {
    location { id name } quantities(names: ["available"]) { name quantity } } } } }"""


def step_inventory(sh, env, inventory_item_gid):
    stock = env.get("PRODUCT_STOCK")
    if not stock:
        raise SystemExit("blocked: PRODUCT_STOCK is empty in .env")
    locs = sh.gql(Q_LOCATIONS)["locations"]["nodes"]
    if not locs:
        raise ShopifyError("no active locations")
    for loc in locs:
        a = loc.get("address") or {}
        print(f"  location {loc['id']}  {loc['name']}  "
              f"{a.get('city')}/{a.get('provinceCode')}/{a.get('countryCode')}  "
              f"shipsInventory={loc['shipsInventory']}")
    primary = next((l for l in locs if l["shipsInventory"]), locs[0])
    set_env({"SHOPIFY_LOCATION_ID": primary["id"]})

    # Schema drift, verified by introspecting 2026-07 rather than guessing:
    # InventorySetQuantitiesInput no longer has ignoreCompareQuantity, and
    # InventoryQuantityInput calls the comparand changeFromQuantity (optional).
    levels = sh.gql(Q_LEVELS, {"id": inventory_item_gid})["inventoryItem"]["inventoryLevels"]["nodes"]
    stocked = [l for l in levels if l["location"]["id"] == primary["id"]]
    if not stocked:
        print(f"  activating inventory at {primary['id']}")
        sh.gql(M_ACTIVATE, {"inventoryItemId": inventory_item_gid,
                            "locationId": primary["id"], "available": 0})
        current = 0
    else:
        current = next((q["quantity"] for q in stocked[0]["quantities"]
                        if q["name"] == "available"), 0)
    print(f"  changeFromQuantity={current} -> setting {int(stock)}")

    key = uuid.uuid5(uuid.NAMESPACE_URL,
                     f"sie:setqty:{inventory_item_gid}:{primary['id']}:{int(stock)}")
    sh.gql(M_SET_QTY, {"key": str(key), "input": {
        "name": "available",
        "reason": "correction",
        "quantities": [{
            "inventoryItemId": inventory_item_gid,
            "locationId": primary["id"],
            "quantity": int(stock),
            "changeFromQuantity": current,
        }],
    }})
    back = sh.gql(Q_LEVELS, {"id": inventory_item_gid})["inventoryItem"]
    for lvl in back["inventoryLevels"]["nodes"]:
        for q in lvl["quantities"]:
            print(f"  read back: {lvl['location']['name']} {q['name']}={q['quantity']}")
    return primary["id"]


# ───────────────────────── 2d. media ─────────────────────────

M_STAGED = """
mutation($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets { url resourceUrl parameters { name value } }
    userErrors { field message }
  }
}"""

M_CREATE_MEDIA = """
mutation($productId: ID!, $media: [CreateMediaInput!]!) {
  productCreateMedia(productId: $productId, media: $media) {
    media { id alt mediaContentType status
            ... on MediaImage { image { url width height } } }
    mediaUserErrors { field message }
  }
}"""

Q_MEDIA = """
query($id: ID!) { product(id: $id) {
  media(first: 20) { nodes { id alt status mediaContentType
    ... on MediaImage { image { url width height } } } } } }"""


def multipart(url, fields, filename, filebytes, content_type):
    boundary = "----sie" + os.urandom(8).hex()
    body = b""
    for k, v in fields:
        body += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n").encode()
    body += (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; "
             f"filename=\"{filename}\"\r\nContent-Type: {content_type}\r\n\r\n").encode()
    body += filebytes + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(url, data=body, method="POST",
                                 headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.status


def step_media(sh, env, product_gid):
    manifest_path = os.path.join(MEDIA_DIR, "manifest.json")
    if not os.path.exists(manifest_path):
        raise SystemExit(f"blocked: {manifest_path} missing — run scripts/prep_media.py first")
    with open(manifest_path, encoding="utf-8") as fh:
        manifest = json.load(fh)
    files = [m for m in manifest["files"] if m.get("upload", True)]

    existing = {m["alt"] for m in sh.gql(Q_MEDIA, {"id": product_gid})["product"]["media"]["nodes"] if m.get("alt")}
    todo = [f for f in files if f["alt"] not in existing]
    if not todo:
        print(f"  all {len(files)} media already attached")
    else:
        staged = sh.gql(M_STAGED, {"input": [{
            "resource": "IMAGE", "httpMethod": "POST", "filename": f["filename"],
            "mimeType": f["mime"], "fileSize": str(os.path.getsize(os.path.join(MEDIA_DIR, f["filename"]))),
        } for f in todo]})["stagedUploadsCreate"]["stagedTargets"]

        media_inputs = []
        for f, tgt in zip(todo, staged):
            path = os.path.join(MEDIA_DIR, f["filename"])
            with open(path, "rb") as fh:
                data = fh.read()
            code = multipart(tgt["url"], [(p["name"], p["value"]) for p in tgt["parameters"]],
                             f["filename"], data, f["mime"])
            print(f"  staged upload {f['filename']} -> HTTP {code} ({len(data):,} B)")
            media_inputs.append({"alt": f["alt"], "mediaContentType": "IMAGE",
                                 "originalSource": tgt["resourceUrl"]})
        sh.gql(M_CREATE_MEDIA, {"productId": product_gid, "media": media_inputs})

    back = sh.gql(Q_MEDIA, {"id": product_gid})["product"]["media"]["nodes"]
    for m in back:
        img = m.get("image") or {}
        print(f"  media {m['id']}  status={m.get('status')}  "
              f"{img.get('width')}x{img.get('height')}  alt={m.get('alt')}")
    return len(back)


# ───────────────────────── 2e. shipping ─────────────────────────

Q_PROFILES = """
query { deliveryProfiles(first: 10) { nodes {
  id name default
  profileLocationGroups {
    locationGroup { id locations(first: 5) { nodes { id name } } }
    locationGroupZones(first: 20) { nodes {
      zone { id name countries { code { countryCode restOfWorld } } }
      methodDefinitions(first: 10) { nodes { id name active
        rateProvider { ... on DeliveryRateDefinition { id price { amount currencyCode } } } } } } } } } } }"""

M_PROFILE_UPDATE = """
mutation($id: ID!, $profile: DeliveryProfileInput!) {
  deliveryProfileUpdate(id: $id, profile: $profile) {
    profile { id name }
    userErrors { field message }
  }
}"""


def step_shipping(sh, env):
    profs = sh.gql(Q_PROFILES)["deliveryProfiles"]["nodes"]
    prof = next((p for p in profs if p["default"]), profs[0])
    set_env({"SHOPIFY_DELIVERY_PROFILE_ID": prof["id"]})
    print(f"  profile {prof['id']}  name={prof['name']}  default={prof['default']}")

    # Match on what a zone COVERS, not what it is called: Shopify's stock zone is named
    # "Domestic" and already holds US, so a name check ("United States" not in names)
    # tries to create a second US zone and the API rejects the overlap with
    # "Region: 'US, AL' already exists in another zone."
    covered, has_row = set(), False
    for lg in prof["profileLocationGroups"]:
        for z in lg["locationGroupZones"]["nodes"]:
            # countries[].code is an object: { countryCode, restOfWorld }
            codes = [(c.get("code") or {}).get("countryCode") for c in z["zone"]["countries"]]
            covered.update(c for c in codes if c)
            if any((c.get("code") or {}).get("restOfWorld") for c in z["zone"]["countries"]):
                has_row = True
            rates = [m["rateProvider"] for m in z["methodDefinitions"]["nodes"] if m.get("rateProvider")]
            print(f"    zone {z['zone']['name']}  countries="
                  f"{len(z['zone']['countries'])}  codes={codes}  rates="
                  f"{[r.get('price', {}).get('amount') for r in rates]}")
    print(f"    covered={sorted(covered)}  restOfWorld={has_row}")

    lg_id = prof["profileLocationGroups"][0]["locationGroup"]["id"]
    to_create = []
    if "US" not in covered:
        to_create.append({
            "name": "United States",
            "countries": [{"code": "US", "includeAllProvinces": True}],
            "methodDefinitionsToCreate": [{
                "name": "Standard", "active": True,
                "rateDefinition": {"price": {"amount": env.get("RATE_US", "5.00"), "currencyCode": "USD"}},
            }],
        })
    if not has_row:
        to_create.append({
            "name": "Rest of World",
            "countries": [{"restOfWorld": True}],
            "methodDefinitionsToCreate": [{
                "name": "International", "active": True,
                "rateDefinition": {"price": {"amount": env.get("RATE_ROW", "15.00"), "currencyCode": "USD"}},
            }],
        })
    if not to_create:
        print("  US and rest-of-world already covered — nothing to add")
    else:
        sh.gql(M_PROFILE_UPDATE, {"id": prof["id"], "profile": {
            "locationGroupsToUpdate": [{"id": lg_id, "zonesToCreate": to_create}]}})
        print(f"  created zones: {[z['name'] for z in to_create]}")

    back = sh.gql(Q_PROFILES)["deliveryProfiles"]["nodes"]
    bp = next((p for p in back if p["id"] == prof["id"]), None)
    for lg in bp["profileLocationGroups"]:
        for z in lg["locationGroupZones"]["nodes"]:
            for m in z["methodDefinitions"]["nodes"]:
                rp = m.get("rateProvider") or {}
                pr = rp.get("price") or {}
                print(f"  read back: {z['zone']['name']} / {m['name']} = "
                      f"{pr.get('amount')} {pr.get('currencyCode')} active={m['active']}")
    return prof["id"]


# ───────────────────────── publish to Headless ─────────────────────────

Q_PUBLICATIONS = """
query { publications(first: 25) { nodes { id name supportsFuturePublishing } } }"""

M_PUBLISH = """
mutation($id: ID!, $input: [PublicationInput!]!) {
  publishablePublish(id: $id, input: $input) {
    # publishedOnCurrentPublication needs read_product_listings (a sales-channel scope
    # we deliberately do not hold); resourcePublicationsV2 below confirms the result.
    publishable { ... on Product { id } }
    userErrors { field message }
  }
}"""

Q_PRODUCT_PUBS = """
query($id: ID!) { product(id: $id) {
  id status
  resourcePublicationsV2(first: 20) { nodes { isPublished publication { id name } } } } }"""


def step_publish(sh, env, product_gid):
    pubs = sh.gql(Q_PUBLICATIONS)["publications"]["nodes"]
    for p in pubs:
        print(f"  publication {p['id']}  {p['name']}")
    headless = next((p for p in pubs if "headless" in p["name"].lower()), None)
    if not headless:
        print("  ! no Headless publication found — install the Headless channel in the "
              "Shopify admin, then re-run --only publish")
        return None
    set_env({"SHOPIFY_HEADLESS_PUBLICATION_ID": headless["id"]})
    sh.gql(M_PUBLISH, {"id": product_gid, "input": [{"publicationId": headless["id"]}]})
    back = sh.gql(Q_PRODUCT_PUBS, {"id": product_gid})["product"]
    for rp in back["resourcePublicationsV2"]["nodes"]:
        print(f"  read back: {rp['publication']['name']} published={rp['isPublished']}")
    return headless["id"]


# ───────────────────────── main ─────────────────────────

STEPS = ["product", "variant", "inventory", "media", "shipping", "publish"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", choices=STEPS)
    ap.add_argument("--check", action="store_true", help="creds + scopes + shop, no writes")
    args = ap.parse_args()

    env = load_env()
    sh = Shopify(env)

    print(f"store    {sh.store}   api {sh.version}")
    sh.token()
    scopes = sh.scopes()
    print(f"scopes   {', '.join(scopes) or '(not reported)'}")
    wanted = ["read_products", "write_products", "read_inventory", "write_inventory",
              "read_locations", "write_publications", "read_shipping", "write_shipping"]
    missing = [w for w in wanted if scopes and w not in scopes]
    if missing:
        print(f"WARNING  missing scopes: {', '.join(missing)}")
    info = sh.shop_info()
    print(f"shop     {info['name']}  {info['currencyCode']}  {info['ianaTimezone']}")
    print(f"address  {info.get('billingAddress')}")
    if args.check:
        return 0

    todo = [args.only] if args.only else STEPS
    env = load_env()
    pg = env.get("SHOPIFY_PRODUCT_GID") or None
    vg = env.get("SHOPIFY_VARIANT_GID") or None
    ii = env.get("SHOPIFY_INVENTORY_ITEM_GID") or None

    for s in todo:
        print(f"\n── {s} ──")
        env = load_env()
        if s == "product":
            pg, vg = step_product(sh, env)
        elif s == "variant":
            pg = pg or env["SHOPIFY_PRODUCT_GID"]
            vg = vg or env["SHOPIFY_VARIANT_GID"]
            ii = step_variant(sh, env, pg, vg)
        elif s == "inventory":
            ii = ii or env.get("SHOPIFY_INVENTORY_ITEM_GID")
            step_inventory(sh, env, ii)
        elif s == "media":
            step_media(sh, env, pg or env["SHOPIFY_PRODUCT_GID"])
        elif s == "shipping":
            step_shipping(sh, env)
        elif s == "publish":
            step_publish(sh, env, pg or env["SHOPIFY_PRODUCT_GID"])

    env = load_env()
    if env.get("SHOPIFY_VARIANT_ID") and env.get("SHOPIFY_STORE_DOMAIN"):
        buy = f"https://{env['SHOPIFY_STORE_DOMAIN']}/cart/{env['SHOPIFY_VARIANT_ID']}:1"
        set_env({"BUY_URL": buy})
        print(f"\nBUY_URL  {buy}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
