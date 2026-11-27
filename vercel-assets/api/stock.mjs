/* GET /api/stock — how many CDs are left, straight from the Shopify admin.

   stock.v1.js asked the Storefront API, whose quantityAvailable lags the real
   count during a run of sales: with 14 orders in, it still said 20 (30 - 10)
   while the admin said 16. The admin's "available" at the store's location is
   the number checkout itself enforces, so that is what this returns.

   The admin credentials live only in this project's environment variables
   (SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET,
   SHOPIFY_VARIANT_GID, SHOPIFY_API_VERSION); the page never sees them. The
   token is minted with the client-credentials grant and kept for the life of
   the instance, renewed five minutes before it expires.

   The answer is cached at the edge for 15 s and served stale for up to a
   minute while it refreshes, so a crowd opening the page at once costs
   Shopify about four requests a minute, not one per visitor. */

const TOTAL = 30;
let tok = null, tokUntil = 0;

async function token(env) {
  if (tok && Date.now() < tokUntil - 300e3) return tok;
  const r = await fetch(`https://${env.SHOPIFY_STORE_DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.SHOPIFY_CLIENT_ID,
      client_secret: env.SHOPIFY_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });
  if (!r.ok) throw new Error('mint ' + r.status);
  const d = await r.json();
  tok = d.access_token;
  tokUntil = Date.now() + (Number(d.expires_in) || 3600) * 1000;
  return tok;
}

const QUERY = `query($id: ID!) {
  productVariant(id: $id) {
    inventoryPolicy
    inventoryItem { tracked
      inventoryLevels(first: 10) { nodes {
        location { fulfillsOnlineOrders isActive }
        quantities(names: ["available"]) { quantity } } } } } }`;

async function available(env) {
  const run = async () => {
    const r = await fetch(
      `https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/${env.SHOPIFY_API_VERSION || '2026-07'}/graphql.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': await token(env) },
        body: JSON.stringify({ query: QUERY, variables: { id: env.SHOPIFY_VARIANT_GID } }),
      });
    if (r.status === 401) { tok = null; throw Object.assign(new Error('401'), { retry: true }); }
    if (!r.ok) throw new Error('admin ' + r.status);
    return r.json();
  };
  let d;
  try { d = await run(); } catch (e) { if (!e.retry) throw e; d = await run(); }
  const v = d && d.data && d.data.productVariant;
  if (!v) throw new Error('no variant');
  /* the sum over every active location that ships online orders */
  let left = 0;
  for (const n of v.inventoryItem.inventoryLevels.nodes) {
    if (!n.location.isActive || !n.location.fulfillsOnlineOrders) continue;
    left += (n.quantities[0] && n.quantities[0].quantity) || 0;
  }
  return Math.max(0, left);
}

const HEAD = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
};

export async function GET() {
  try {
    const left = await available(process.env);
    return new Response(JSON.stringify({ left, total: TOTAL, sold: left <= 0 }), {
      headers: { ...HEAD, 'Cache-Control': 'public, max-age=0, s-maxage=15, stale-while-revalidate=60' },
    });
  } catch (e) {
    /* say nothing rather than a wrong number; the page leaves the counter hidden */
    return new Response(JSON.stringify({ error: 'unavailable' }), {
      status: 502, headers: { ...HEAD, 'Cache-Control': 'no-store' },
    });
  }
}
