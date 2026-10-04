# The index language — from Naim's source

**This document is built from Naim's own hand-written CSS/JS on this machine, not from
a capture of the live site.** An earlier revision of this file was measured off
dauanjacari.com; that was the wrong source and has been discarded.

## Where it came from

Search keys were taken from the live index purely as identifiers — class names
(`navbar2_container`, `menu-icon2_line-top`, `product1_item-link`, `sm-mini-cart_items`),
ids, `data-wf-*` attributes, and the Webflow variable-group custom properties
(`--_ui-styles---stroke--border-width`, `--_primitives---colors--neutral-darkest`,
`--_typography---font-styles--body`). 37 keys, one ripgrep pass over `C:/Users/naimj`
with `--no-ignore --hidden`, skipping `node_modules`, `.git` and binaries.

**3,982 matches across 116 files.** Ranked by how many distinct keys each file carried:

| keys | file |
|---:|---|
| 33 | `webflow-migration/dauan-jacari/_nav/home.html` |
| 33 | `webflow-migration/dauan-jacari/home-live.html` |
| 33 | `webflow-migration/dauan-jacari/home-fresh.html` |
| 28 | `webflow-migration/dauan-jacari/_live{,2,3,4,5,6}.html` |
| 23 | `webflow-migration/dauan-jacari/_nav/blog.html`, `blog-stg2.html` |
| 13 | `.claude/projects/C--Users-naimj-webflow-migration-dauan-jacari/bb026774….jsonl` |

Every one of those is a **capture of the rendered site**, not source. The real source was
one level in: the top-ranked directory also holds hand-written files, and
`webflow-migration/dauan-jacari/nav-index.css` opens with

> ```
> /* Mobile nav rebuilt as an index component, matched to .myth-index.
>    Every value below is copied from the myth-collection index CSS - no invented
>    sizes. …
> ```
> — `nav-index.css:1-3`

which names its own upstream. A second pass for `myth-index__` found it:

| file | `myth-index__` hits | mtime | verdict |
|---|---:|---|---|
| **`webflow-migration/dauan-jacari/myth-head.v2.html`** | 39 | 2026-09-12 17:49 | **SOURCE — authoritative** |
| `webflow-migration/dauan-jacari/myth-head.CLEAN.html` | 39 | 2026-09-12 12:58 | identical index CSS (22 rules, byte-equal); earlier |
| `Documents/dj/myth-resize/_myth_head_current.txt` | 39 | 2026-08-07 16:02 | earlier state, 22 rules but **not** equal |
| `myth-head.v3.html` / `v4.html` | 20 | 2026-09-12 18:27/18:30 | index CSS trimmed out |
| `webflow-migration/dauan-jacari/nav-index.css` | 6 | — | **derived**, mobile nav only, carries the reasoning |

So the tokens below are quoted from **`myth-head.v2.html`** (the `.myth-index` block,
lines 136–160, and the builder JS from line 300) with `nav-index.css` as the adaptation
Naim already wrote when he moved this language onto a nav.

---

## The row is the whole idea

```css
.myth-index__row { display: grid; grid-template-columns: 28px 1fr 60px;
  align-items: center; padding: 5px 8px;
  border-top: 1px solid rgba(0,0,0,0.06);
  text-decoration: none; color: #000; transition: background 160ms ease; }
```
— `myth-head.v2.html:149`

**A three-column grid — `28px 1fr 60px` — number, title, value.** Fixed-width number,
elastic title, fixed-width right-aligned value. That is the motif, and it repeats in the
header row at the identical track spec (`:147`). Not three lines: three *columns*.

```css
.myth-index__num   { color: #666; font: 400 10px/1 Instrumentsans, Arial, sans-serif; }
.myth-index__title { font: 400 11.5px/1.3 Instrumentsans, Arial, sans-serif;
                     text-transform: lowercase;
                     overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.myth-index__price { text-align: right; font: 400 11px/1 …; color: #333; }
```
— `myth-head.v2.html:152-154`

The title is **one line, clipped with an ellipsis**. That is Naim's rule, not an
invention — and it is exactly what the video-tile label needs.

### The three-line hamburger is deliberately deleted

```css
body .navbar2_menu-button .menu-icon2{display:none}
body .navbar2_menu-button::before{content:"menu"}
body .navbar2_menu-button::after{ content:"\25BE"; font-size:10px; … }
```
— `nav-index.css:34-44`

Webflow's stock `menu-icon2_line-top / _line-middle / _line-bottom` three-bar icon is
**hidden and replaced by a lowercase word plus a `▾` chevron.** So in this language the
"three-line" signature is a *three-column row*, and navigation is named in words. Any sie
nav built from this document uses words, not bars.

---

## Tokens, as written

### Hairlines — four weights, each with a job

| where | value | source |
|---|---|---|
| row separator | `1px solid rgba(0,0,0,0.06)` | `:149` |
| column-head underline | `1px solid rgba(0,0,0,0.14)` | `:147` |
| control border | `1px solid rgba(0,0,0,0.08)` | `:138`, `nav-index.css:15` |
| panel edge | `1px solid rgba(255,255,255,0.6)` | `:143` |

All 1px. The separator is the faintest (0.06), the head underline the strongest (0.14),
the control sits between (0.08). **First row loses its rule**: `.myth-index__col >
.myth-index__row:first-of-type { border-top: 0; }` (`:150`) — repeated in the nav as
`.navbar2_link:first-child{border-top:0}` (`nav-index.css:111`).

### Type — five roles, all Instrument Sans

| role | value | source |
|---|---|---|
| control | `500 12px/1`, lowercase, `letter-spacing: 0.02em` | `:138` |
| column head | `500 9px/1.2`, **uppercase**, `letter-spacing: 0.08em`, `#666` | `:147` |
| title | `400 11.5px/1.3`, lowercase, ellipsis | `:153` |
| value | `400 11px/1`, `#333` | `:154` |
| number | `400 10px/1`, `#666` | `:152` |

Tracking is used twice and in opposite directions: `0.02em` on the lowercase control,
`0.08em` on the uppercase micro-head. The title and value carry none.

### Radius

| where | value | source |
|---|---|---|
| control (pill) | **`999px`** | `:138` |
| panel | `12px` | `:143` |
| hover preview | `14px` | `:156` |
| rows | `0` | `:149` |

**The control is a full pill.** That is the opposite of what I had assumed from the live
site, and it settles the question directly: sie's buy control is a pill in this language,
not a square box.

### States and timing

| state | value | source |
|---|---|---|
| control hover | `background: rgba(255,255,255,0.72) → rgba(255,255,255,0.9)` | `:139` |
| control transition | `background 200ms ease` | `:138` |
| row hover | `background: rgba(255,255,255,0.5)` | `:151` |
| row transition | `background 160ms ease` | `:149` |
| chevron | `rotate(0) → rotate(180deg)`, `transform 220ms ease` | `:140-141` |
| preview in | `opacity 0→1`, `scale(.98)→scale(1)`, `140ms ease` both | `:156-157` |
| current row | `underline`, `text-decoration-thickness:1px`, `text-underline-offset:6px` | `nav-index.css:118-122` |

**Hover is a background change, never an opacity fade**, and the durations are graded:
140ms preview, 160ms row, 200ms control, 220ms chevron. Longer for bigger things.

`nav-index.css:116-117` is explicit that the active-row underline was *not* in the
myth index and was carried over from the nav rather than invented:

> ```
> /* Active row: the myth index has NO active-row treatment to copy, so the
>    nav's existing underline is kept rather than inventing one. */
> ```

### Surfaces

Translucent white over a colour that moves: `background: rgba(255,255,255,0.72)` on the
control, `rgba(250,250,250,0.55)` on the panel, `rgba(250,250,250,0.85)` on the sticky
head, each with `backdrop-filter: blur(8px) saturate(1.2)` / `blur(16px) saturate(1.25)`
(`:138`, `:143`, `:147`). One shadow: `0 20px 60px -12px rgba(0,0,0,0.18)` (`:143`).

The ground itself is scroll-interpolated:

```js
var TOP_RGB = [211, 225, 233];
var BOT_RGB = [78, 114, 136];
…
doc.style.setProperty('--myth-card-bg', lerpRGB(p));
doc.style.setProperty('--myth-card-hover', hoverRGB(p));   // 0.88 × the base
```
— `myth-head.v2.html:186-208`, defaults `--myth-card-bg:#D3E1E9` / `--myth-card-hover:#BAC6CD` at `:10-11`

### Spacing

| | desktop | mobile (≤767) | source |
|---|---|---|---|
| page padding | `0 48px` | `0 16px` | `:136`, `:160` |
| bar padding | `40px 0 12px` | — | `:137` |
| control padding | `8px 18px`, `gap: 8px` | — | `:138` |
| panel offset | `top: calc(100% + 4px)`, `left: 48px` | `left/right: 16px` | `:143`, `:160` |
| panel size | `721px × 472px`, `max-width: calc(100% - 96px)` | `auto`, `max-height: 70vh` | `:143`, `:160` |
| columns | `1fr 1fr`, `gap: 0 20px`, padding `4px 12px 12px` | `1fr`, padding `4px 10px 10px` | `:146`, `:160` |
| row padding | `5px 8px` | `12px 8px` (nav) | `:149`, `nav-index.css:96` |

---

## The one place Naim already resolved tap targets

The myth row is 24.9px tall — a dense reference table. When he rebuilt it as a nav he
raised only the vertical padding, and wrote down why:

> ```
> /* The myth index row is 24.9px, which is a dense reference table. A nav row
>    is a tap target, so only the vertical padding grows: 12px + 14.95px line
>    + 12px + 1px border = 40px. Type stays 11.5px/400, so it still reads as
>    the same system. */
> ```
> — `nav-index.css:92-95`

and rejected the trick of faking a bigger hit area:

> ```
> /* No ::after hit-area extension: at 44px centred on a 24.9px row it spilled
>    ~9.5px past the row in each direction, so neighbouring rows overlapped.
>    The padding now provides the target for real. */
> ```
> — `nav-index.css:113-115`

**So the precedent is: grow the padding, keep the type.** sie's controls take 44px the
same way — real padding, `11.5px/400` type untouched.

---

## What sie takes

Translated to sie's black ground. Alpha hairlines invert cleanly, so the ratios survive.

```css
:root{
  --idx-rule:      rgba(255,255,255,.06);   /* row separator      — :149 */
  --idx-rule-head: rgba(255,255,255,.14);   /* head underline     — :147 */
  --idx-edge:      rgba(255,255,255,.08);   /* control border     — :138 */
  --idx-fill:      rgba(255,255,255,.05);   /* control ground     — :138 inverted */
  --idx-fill-hi:   rgba(255,255,255,.12);   /* control hover      — :139 inverted */
  --idx-row-hi:    rgba(255,255,255,.07);   /* row hover          — :151 inverted */
  --idx-pill:      999px;                   /* control radius     — :138 */
  --idx-t-row:     160ms;                   /* row transition     — :149 */
  --idx-t-ctrl:    200ms;                   /* control transition — :138 */
}
```

| taken | why |
|---|---|
| `28px 1fr 60px` three-column row | the motif; sie's checkout summary rows use it directly |
| title `400 / 1.3`, lowercase, **one line + ellipsis** | `:153` — also the video-tile label spec |
| value right-aligned, dimmer than the title | `:154` |
| **pill radius `999px` on the control** | `:138` |
| hover = **background** change, not opacity | `:139`, `:151` |
| graded timings 160 / 200 / 220ms | `:149`, `:138`, `:140` |
| first row loses its rule | `:150`, `nav-index.css:111` |
| current item = `underline`, `1px`, `offset 6px` | `nav-index.css:118-122` |
| nav in **words**, never a hamburger | `nav-index.css:34-36` |
| 44px by real padding, type unchanged | `nav-index.css:92-95, 113-115` |

**Not taken:** the `backdrop-filter` blur stack and the translucent white surfaces (sie's
ground is flat black with alpha CD cutouts on it — a frosted panel over black reads as
grey mud), the `0 20px 60px -12px` shadow, the scroll-interpolated `--myth-card-bg`
(sie's ground does not move), and the fixed `721 × 472` panel (sie has no dropdown).
Instrument Sans is not licensed into this project, so sie keeps its measured
`clamp(11px, 3.136vw, 16px)` Helvetica stack and carries the *ratios* — 12 / 11.5 / 11 / 10 /
9px becomes `1em / .96em / .92em / .84em / .75em` — rather than the absolute px.
