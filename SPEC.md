# SPEC — sie.market
Date: 2026-09-28
Goal: one single-product page and one videos page, built from the packaged index component, nothing invented.
Stack: static HTML + one CSS + one JS on assets.sie.market, rendered in Webflow custom code; Shopify checkout only; Vercel static; GitHub Actions + yt-dlp.
Supersedes every earlier brief. Where this and a past message disagree, this wins.

## 1. Source of truth for controls — only these

| file | holds |
|---|---|
| `C:/Users/naimj/webflow-migration/dauan-jacari/component/README.md` | API + theming (rename `:121`, options `:33-40`) |
| `…/component/myth-index.css` | pill `:36-53`, hover `:54`, chev `:55-61`, panel `:62-99`, row `:115-126`, num/title/price `:128-136`, preview `:140-160` |
| `…/component/myth-index.js` | markup + behaviour, UMD, returns `{el,open,close,toggle,destroy}` |
| `…/dauan-jacari/nav-index.css` | tap targets `:92-95`, no-`::after` `:113-115`, current-item underline `:118-122` |

`myth-head.v2.html:136-160` is the same CSS in its original home. No live-site derivation, no
invention. That README is the only `*.md` on this machine documenting the index UI and the hover
button — every `*.md` under `webflow-migration/` and `Documents/` was searched.

## 2. Vendor the component

Vendored, never edited: `site/vendor/sie-index/{sie-index.css,sie-index.js,README.md}`. Ours:
`site/css/sie.v10.css` (no control styling), `site/js/sie.v10.js`, `site/index.html`,
`site/videos.json`, `.github/workflows/feed.yml`, `site/build/webflow-paste/` (fallback).
Copy all three in unchanged, then the README's rename (`README.md:121`):

```
sed -i 's/myth-index/sie-index/g; s/--myth-card-bg/--sie-card-bg/g' sie-index.css sie-index.js
```

CSS in `<head>`, JS before `sie.v10.js`, on **both** pages.

## 3. Theming — exactly four variables, nothing else

```css
:root{
  --sie-card-bg: #161616;
  --sie-index-font: "Schibsted Grotesk","Helvetica Neue",Helvetica,Arial,sans-serif;
  --sie-index-gutter: var(--gutter);
  --sie-index-gutter-sm: var(--gutter);
}
```

Delete the v9 `.buy` and `.corner` rules and markup, the `--idx-*` variables, and `.summary`.
**Accepted:** the pill is `rgba(255,255,255,.72)` + `blur(8px)`; on `#000` there is nothing to
blur, so it renders as a flat light lozenge (EVAL §2). Kept verbatim — if it reads badly, fix
the component and push upstream, never a local override.

## 4. Home (`/`) — resting order

logo (fixed top-left → `/`) · corner nav (fixed top-right, §6) · gallery, **slide 1 the open
case with the disc turning**, then emoji cover, poster, om cover · dots · title at body size,
`from paris, with love.` · caption from the existing `data-copy` attributes · **description
paragraph, always visible, justified** (`text-align-last:left; hyphens:auto`) · `$80` ·
**BUY** (§5) · **four edition rows** (§5b). No shipping rows on the page — Shopify quotes
shipping at checkout (US $8/$0/$15, RoW $15, already configured).

## 5. BUY

```js
sieIndex({ mount: document.querySelector('#buy-mount'), label:'buy', columns:1,
  items:[{ href: BUY_URL, title:'from paris, with love. — cd',
           price:'$80', thumb:'assets/cd-front.webp' }] });
```

`BUY_URL` = `https://ysrtvh-pa.myshopify.com/cart/49227493146807:1` (from `.env`).
**Accepted:** buying is two taps — the pill opens the panel, the row is the link; the component
is a disclosure widget, not a button. Verify the row's `href` is `BUY_URL` and reaches a live
$80 Shopify checkout.

### 5b. The four rows

Second mount directly beneath buy. `columns:1`, `label:'edition'`, `columnLabels:['#','','']`,
titles: `01 edition: 35 copies` · `02 format: cd, jewel case, pamphlet, folded poster` ·
`03 availability: physical only, never on streaming` · `04 ownership: the music, in its totality`.
No `thumb` → no hover preview (README `:35`). If `myth-index.js` requires `href`, pass `'#'` and
`preventDefault` in `sie.v10.js` rather than editing the vendored file.

## 6. Corner nav

The myth-collection hover button verbatim — the same pill, so the same component, not a restyled
link. Fixed top-right, `right: var(--gutter)`, top-aligned to the logo. Identical on both pages.

```js
sieIndex({ mount: cornerMount, label:'index', columns:1, items:[
  { href:'/',       title:'shop',   thumb:'assets/cd-front.webp' },
  { href:'/videos', title:'videos', thumb:'https://i.ytimg.com/vi/W6n73KxSkn0/hqdefault.jpg' },
]});
```

Tokens from `myth-index.css:36-53` (`padding:8px 18px`, `font:500 12px/1`,
`letter-spacing:.02em`, `border-radius:999px`, `border:1px solid rgba(0,0,0,.08)`,
`transition:background 200ms ease`) and `:54` (hover `rgba(255,255,255,.9)`). Current page marked
per `nav-index.css:118-122` (`underline`, `1px`, `offset 6px`), exempt from hover.
**Route rename:** the page is `/videos`, not `/sie`. Webflow page `6ab3da62aedbf627496688e4` has
slug `sie` and must be renamed or replaced.

## 7. Entrance — the description does NOT animate

**Dropped, deliberately.** ~70 words at 40 ms/word is 2.8 s of continuous motion across a
justified block: a crawl, at the edge of the budget, spending attention immediately before the
four rows that are the target. It fights the calm. Saying so as asked.

Kept: the title entrance only — 4 words, 90 ms stagger, 220 ms each (490 ms), then the gallery
fades in over 600 ms. Buy visible from the first frame, never animates. Once per session; static
final state under `prefers-reduced-motion`. Marks `sie:seq:start`, `:words-done`,
`:settle-start`, `:settle-end`; measure `sie:seq:total`.

## 8. Videos (`/videos`)

Logo, corner nav, grid. **Nothing else** — no channel links, no headings. Tiles from
`videos.json` × `reference/artist-map.json`: poster, label underneath reading `artist — title`,
lowercase, one line, ellipsis per `myth-index.css:129-135`. 2 cols at 390, 3 at ≥560, 4 at ≥900,
5 at ≥1200; 3:2 aspect; gaps 16/24 (`reference/video-wall.md`). Unmapped uploads fall back to
`channelDefaults`, flagged in the build summary.

Tap → black overlay, **exactly one** `youtube-nocookie` iframe, `width:min(100vw, 100dvh*16/9)`,
centred. Closes on X, outside-tap, Esc, Back (`pushState`). Landscape fills at true 16:9,
`requestFullscreen` when permitted. Previews: muted embed on hover (fine pointer) or while
centred in view (coarse, IntersectionObserver, **max 4**); all destroyed on open.

## 9. Type

**Schibsted Grotesk** (SIL OFL, self-hosted, `font-display:swap`) until Diatype lands;
`site/css/fonts.v1.css` holds the `@font-face` block and a commented Diatype hook. Never
download Diatype. `--base: clamp(11px, 3.136vw, 16px)` off the short axis. **Nothing exceeds
1.5× base except the title during the entrance** (2.4×, returning to 1×). The component's own
12/11.5/11/10/9px stay as shipped.

## 10. Feed — must be live

`.github/workflows/feed.yml`, `cron '0 * * * *'` + `workflow_dispatch`: `yt-dlp
--flat-playlist --dump-single-json` over `@hunnakay`, `@kllhhr`, `@comeheadtapme19`,
`@suckrballll`, `@ibeenhip`; dedupe by id; write `site/videos.json`; fetch missing
`hqdefault.jpg` into `site/assets/yt/`; commit only on change; push → Vercel auto-deploy.
**Acceptance: it has run at least once and the report carries the run id and conclusion.** A
committed file with no run is not done.

## 11. Everything else, and ship

Per `reference/STUDY.md` and the existing `data-copy` captions. Ground `#000`, ink `#ededed`,
muted `#8a8a8a`. Disc `left:53.685% top:2.442% width:43.54%`. Tap targets ≥44px by real padding,
never a `::after` extension (`nav-index.css:113-115`).

Bump both to **v10** (v9 highest present, v8 hosted). Host on `assets.sie.market`; verify status
and byte length against local. Publish via the Webflow API **if** the grant covers site
`6ab09c2043ba16c77bec74be`; if it returns "site cannot be found", regenerate
`site/build/webflow-paste/` and say so plainly rather than reporting a deploy. Then publish to
`sie.market` **and** `www.sie.market` explicitly. Report against the EVAL table: every
**random** or **missing** row comes back **correct**, or carries a reason.
