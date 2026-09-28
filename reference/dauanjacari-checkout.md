# dauanjacari.com — buy control, cart strip, checkout modal

Captured 2026-09-23 · Scrapling → Chromium · 1280 × 900 and 390 × 844 · HTTP 200 both.

---

## How this was found

The Webflow API grant no longer covers site `6839b331d842b556e5fb6b86`, so the
asset route was closed. Four other routes were tried:

| route | result |
|---|---|
| `C:/Users/naimj/Documents/dj/myth-resize/` — `dj-archive.v45.js`, `grid-manifest*.json`, 20+ box scripts | **no UI** — an image-resize and grid-packing pipeline. Zero `svg`/`<path>`, zero `cart`/`checkout`/`buy` strings. One bag-named file, `week5-spiral-boxer-bag-8463.png`, is a product photo, not an icon. |
| `C:/Users/naimj/webflow-migration/dauan-jacari/captured/` — full DOM capture, `page.rendered.html`, css, js, images | **predates the shop** — 0 `<svg>`, no commerce strings. Captured 2026-07-21. |
| `…/webflow-package/assets-to-upload/` — 100+ AVIFs | product imagery only; one `386db7-icon.avif` which is a favicon, not UI |
| **`https://dauanjacari.com` live** | ✅ **found everything** |

The live site was the answer.

---

## What the icons actually are

**They are not custom dauanjacari artwork.** All four are Shopify's own
embed icons, shipped with the Shopify Buy Button / mini-cart widget — the
class prefix `sm-` (`sm-mini-cart-modal_close-b`, `sm-action-button`) is
Shopify's. Every one is a 24 × 24 viewBox path with `fill="currentColor"`,
which is why they recolour for free.

Worth knowing before adopting one: copying it means matching Shopify's
default iconography, not dauanjacari's design.

| file | shape | viewBox | rendered | where on dauanjacari |
|---|---|---|---:|---|
| `dj-bag.svg` | **shopping bag with handle** | 0 0 24 24 | **16 × 16** | the only one actually visible — cart affordance, top-right area (x 1230.4 y 793 at 1280; x 354.3 y 446 at 390) |
| `dj-card.svg` | credit card, rounded rect + stripe | 0 0 24 24 | 0 × 0 | inside `.icon-embed-xsmall.text-color-white` — payment row in the checkout modal, hidden until opened |
| `dj-close.svg` | X / dismiss | 0 0 24 24 | 0 × 0 | `<button class="sm-mini-cart-modal_close-b">` — mini-cart close |
| `dj-diamond.svg` | DJ diamond mark | — | 35 × 35.6 | brand mark low on the page (y 2213.8), 1,659 B, from the Webflow CDN |

All four are in `site/assets/icons/`.

### The buy control itself

```
<a class="sm-action-button w-button">Shop new collection</a>

background     rgb(26, 26, 26)     ← near-black, not pure
border-radius  5.6px
padding        4px 12px
```

Note it carries **no icon** — the bag sits separately in the header, not inside
the button. If sie puts the bag *in* the buy control, that's our composition,
not something inherited.

---

## For sie's buy area

Default per the brief is the bag shape, and it's the only one that's actually
visible on dauanjacari, so `dj-bag.svg` is the pick unless Naim says otherwise.

Recoloured for black ground: the path is `fill="currentColor"`, so it inherits
`--fg` with no edit. At `1em` it renders 12.23px at 390 and 16px at 1280,
matching the type.

```html
<a class="buy" href="{BUY_URL}" rel="noopener">
  <svg class="buy-ico" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M5 22h14c1.103 0 2-.897 2-2V9a1 1 0 0 0-1-1h-3V7c0-2.757-2.243-5-5-5S7 4.243 7 7v1H4a1 1 0 0 0-1 1v11c0 1.103.897 2 2 2M9 7c0-1.654 1.346-3 3-3s3 1.346 3 3v1H9z"/>
  </svg>
  buy
</a>
```

```css
.buy-ico{ width:1em; height:1em; margin-right:.5em; flex:0 0 auto; }
```

Inline rather than `<img>`: `currentColor` only works inline, and it saves a
request. The file is kept in `site/assets/icons/` as the source of truth.

**What not to carry over:** the `5.6px` radius and `rgb(26,26,26)` fill are
Shopify-embed defaults on a white page. sie's ground is black and its buy
control is already specified as a 1px bordered rectangle — the icon goes in,
the button styling does not.

**Action:** the cart permalink (`BUY_URL`), not a modal. dauanjacari opens a
Shopify mini-cart overlay; sie hands off to Shopify's hosted checkout directly,
which is fewer moving parts and needs no embed script.
