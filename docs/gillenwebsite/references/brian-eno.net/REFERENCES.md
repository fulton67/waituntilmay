# brian-eno.net: reference read

Crawled on 2026-10-30 with the full Lexicon crawl. Pages: /, /new-work and /information. Each page was loaded fully, scrolled to the bottom and back, and probed live for computed styles. Scripts went through REA: 49 scripts, 42 read in full, 6 skipped as third-party and 1 library.
Crawl folder: `~/arena/lexicon/channels/references/brian-eno.net/deep/`. The site is built on Nuxt. The release list logic is in `scripts/a56c29239557c359.js`, minified onto line 1. The list CSS is `styles/4671c87d45e487cf.css`.

## Layout: one long discography, newest first
- The page is a grid of **66.66% / 33.33%** columns, with one release per row.
- A collapsed row is **20 px tall** (`max-height: 1.25rem`). Its inline item is `1fr 1fr`: the text on the left and a horizontal slice of the cover on the right.
- The text column is a grid of **6fr 4.5fr 1fr** (title | collaborators | year) with a `.25rem` gap and `.25rem` padding (css:1 `span.left-column,span.right-column{grid-template-columns:6fr 4.5fr 1fr;gap:.25rem…}`).

## How covers load and scale
- In a collapsed row the cover shows only as a **464 × 20** `<img>` with `object-fit: cover`, a thin strip through the middle of the artwork.
- Covers are served by Cloudflare Images. The **`/public`** variant measured **768 × 768** and **`/covers`** measured **1080 × 1080**.
- Clicking a row opens it with `heightExpand`, which animates `max-height` from 1.25rem to the open height. The open height steps up with the viewport: **248 px at ≥ 750 px**, **446 px at 1350 px** and **634 px at ≥ 1920 px**, which keeps the open cover a square about 33vw wide (css:1 `@keyframes heightExpand{0%{max-height:1.25rem}to{max-height:248px}}`).
- The transition under it is `max-height:30rem; transition:max-height 3s ease-out`, so opening is a slow **3 s ease-out**. Closing (`heightCollapse`) is **1 s ease-in**.

## Click and switch (`Ft`, js:1)
```
function Ft(t,n,r){ … if(O.value===n){ j.value=!0, M.value=n, setTimeout(()=>{ A.value=n, O.value=null, M.value=null,
    setTimeout(()=>{ A.value=null, j.value=!1 }, y) }, 500); return }
  j.value=!0; let i=()=>{ k.value=n, setTimeout(async()=>{ O.value=n, await r(), … k.value=null, j.value=!1 }, Et) };
  O.value ? ( M.value=O.value, setTimeout(()=>{ A.value=O.value, O.value=null, M.value=null,
    setTimeout(()=>{ A.value=null, i() }, y) }, 500) ) : i() }
```
The constants are `y=1500,Et=2e3` (js:1).
- Clicking the open row closes it: after **500 ms** it goes into the closing state (`A`), which is held for **1500 ms**.
- Clicking another row while one is open closes the open one first (500 ms, then 1500 ms) and then opens the new one. The new row sits in `is_opening` (`k`) for **2000 ms** before it is marked open.
- While a row opens its title hides with `opacity 1s ease-in-out`. `.item-wrapper` slides with `transform 2s ease-in-out` (css:1 `.item-wrapper{transition:transform 2s ease-in-out}`) and fades with `opacity 1s`.

## Hover
- The row title underlines with `text-underline-offset: 2px`. Nothing else moves.

## Type: measured live (`~/arena/lexicon/probe-eno.mjs`)
| part | family | size / leading | other |
|---|---|---|---|
| title | Neue-Haas-Grotesk-DisplayPro-65-Medium | 13 px / 20 px | nowrap, ellipsis |
| collaborators | Neue-Haas-Grotesk-DisplayPro-55-Roman | 10 px / 1.45rem | uppercase |
| year | 55-Roman | 10 px | |
| colour | rgb(142,135,124) on cream | | |

## Font families
| family | source |
|---|---|
| Neue Haas Grotesk Display Pro 55 Roman, 65 Medium | **self-hosted**. This is a commercial font from Monotype/Linotype. |
| Roboto | Google Fonts, loaded only by the YouTube embeds |

No font files were copied.

## What /gillenwebsite/discography takes from it
- Collapsed rows 20 px tall on the 6fr / 4.5fr / 1fr text grid, with a cover slice on the right.
- Clicking expands a row to a square of about 33vw at the stepped heights: 3 s ease-out to open, 1 s ease-in to close.
- Opening a second row closes the first, using the same 500 / 1500 / 2000 ms sequence.
