# Video wall reference — clintonvanarnam.net

Scrapling 0.4.15 → Chromium · 390 × 844 and 1280 × 900 · **dpr 2** · HTTP 200 both passes.
Captured 2026-09-23. Captures: `reference/captures/clintonvanarnam/{390,1280}-{fold,full}.png`

---

## Two things in the brief don't match what the site does

**1. There is no marquee.** The brief describes "a marquee of 200px webp thumbs with the list duplicated for looping." Measured: the bottom strip is a **static CSS grid** — `display: grid`, fixed pixel columns, `overflow-x: visible`, `scroll-snap-type: none`. Nothing animates: zero elements on the page carry a non-`none` `animation-name`, and the translate sampled twice a second apart is unchanged. Nothing is duplicated — 120 tiles, 120 distinct Sanity asset hashes. And the tiles are **31.8px** wide at 390 and **55.5px** at 1280, not 200px.

**2. The index has no `<video>` at rest.** The brief says each project is "a self-hosted MP4 rendered as `<video autoplay muted loop playsinline>`". On first load there are **zero** `<video>` elements at either width. They are created **on hover, desktop only** — see below. The autoplay-loop treatment is presumably on the project detail pages, which this pass did not open.

Both corrections change the build: there is no marquee speed to copy, and the "do side videos play?" question has a clear answer.

---

## What it actually is

A single screen. Fixed text in the upper area, a dense grid of tiny thumbnails along the bottom. `scrollHeight` equals viewport height at both widths — **the page does not scroll.**

| | 390 | 1280 |
|---|---:|---:|
| tiles | **120** | **120** |
| grid columns | **8** | **16** |
| rows | 15 | 8 |
| tile size | **31.8 × 20.7** | **55.5 × 36.4** |
| tile aspect | **1.536** (≈3:2) | **1.525** (≈3:2) |
| grid gap | **16px** | **24px** |
| container | 366 wide at x 12, y 538 | 1248 wide at x 16, y 628.6 |
| container height | 294 | 255.4 |
| visible without scrolling | **120 — all of them** | **120 — all of them** |
| served thumb | 184 × 120 webp | 366 × 240 webp |
| effective density | 5.8× | 6.6× |
| `loading` | `eager` | `eager` |

Thumbnails are WebP from `cdn.sanity.io`. All 120 load immediately — no lazy-loading, no pagination, no virtualisation.

The served thumbnails are far larger than their slots (184px into a 31.8px box is 5.8×, well beyond the 2× dpr needs). That is the main reason the page costs what it does.

---

## Do the side videos play? Yes — but only on desktop hover

Hovering the first tile and waiting 1.6s:

| | videos created | iframes |
|---|---:|---:|
| **390** | **0** | 0 |
| **1280** | **2** | 0 |

So the mechanism is: **thumbnail grid at rest → hover spawns a `<video>`**. No iframe is ever created — everything is self-hosted MP4 through Sanity. On mobile there is no hover, so the grid stays thumbnails-only and nothing plays.

Two videos appearing rather than one suggests a crossfade or a preload-plus-display pair. I did not chase which, because the relevant finding for sie is the pattern: *thumbnails by default, video created on demand, destroyed after.* That is exactly the "no more than one iframe alive" discipline, applied to `<video>`.

**No IntersectionObserver pausing is observable**, because at rest there are no videos to pause and the page doesn't scroll. The offscreen-pause question doesn't arise on this page.

---

## Mobile swipe mechanism: there isn't one

- `scroll-snap-type` on every element: **none**
- horizontal scrollers (`scrollWidth > clientWidth` with `overflow-x: auto|scroll`): **0**
- JS carousel libraries detected (Swiper, Flickity, Embla, Splide, GSAP, Lenis): **none**

At 390 the grid simply reflows to 8 columns × 15 rows and fits the screen. There is no swipe strip to copy. **The bottom-strip scroll-snap in sie's spec is our own design, not inherited** — which is fine, it just isn't traceable to this reference.

---

## Wireframes

### 1280 × 900

```
┌────────────────────────────────────────────────────────────────────┐
│ ┌──────────────────┐   Selected Work:        Filter:               │ y16
│ │ Clinton Van Arnam│   Comfort Magazine      Identity              │
│ │ is a Brooklyn-   │   History of Now        Motion                │
│ │ based independent│   inourti.me            Research              │
│ │ designer …       │   Jessica Helfand       Web                   │
│ │                  │   Nike All Star …                             │
│ │ Contact:         │   Shona Kitchen                               │
│ │ cva@…            │   Super Saturated                             │
│ └──────────────────┘   The Talent House                            │
│   373.5 wide, fixed    WXY                                         │
│                        Your Brain on Art                           │
│                        sidebar 176.8 wide, fixed                   │
│                                                                    │
│                        [ ~390px of white ]                         │
│                                                                    │
│ ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐  │ y628.6
│ └──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘  │
│ ┌──┐┌──┐…                    16 cols × 55.5px, gap 24px            │
│ └──┘└──┘                     8 rows, 120 tiles, all visible        │
│ ┌──┐┌──┐…                    hover a tile → <video> appears        │
│ └──┘└──┘                                                           │
└────────────────────────────────────────────────────────────────────┘
```

### 390 × 844

```
┌──────────────────────────────┐
│ ┌──────────────────────────┐ │ y12
│ │ Clinton Van Arnam is a   │ │  bio 366 wide, fixed
│ │ Brooklyn-based …         │ │  224 tall
│ │ Contact: cva@…           │ │
│ └──────────────────────────┘ │
│ Selected Work:               │ y252
│ Comfort Magazine             │
│ History of Now               │
│ …                            │
│                              │
│ ┌─┐┌─┐┌─┐┌─┐┌─┐┌─┐┌─┐┌─┐     │ y538
│ └─┘└─┘└─┘└─┘└─┘└─┘└─┘└─┘     │  8 cols × 31.8px, gap 16px
│ ┌─┐┌─┐┌─┐┌─┐┌─┐┌─┐┌─┐┌─┐     │  15 rows, 120 tiles
│ └─┘└─┘└─┘└─┘└─┘└─┘└─┘└─┘     │  all visible, no scroll
│ … 15 rows total …            │  no hover → no video
└──────────────────────────────┘
```

---

## Nav placement, type, colour

| | |
|---|---|
| ground | `rgb(255,255,255)` |
| text | `rgb(0,0,0)` — 21:1 |
| family | **abcDiatype** (ABC Dinamo, self-hosted) with `system-ui, sans-serif` fallback |
| size | **18px** across bio, Selected Work and Filter — effectively one size |
| root | 16px, **not fluid** |
| bio | fixed, top-left, 373.5 wide (1280) / 366 (390), 224 tall, z 110 |
| sidebar "Selected Work" | fixed, 176.8 wide, y 16, z 100 |
| Filter | top-right — Identity / Motion / Research / Web |
| header | `position: fixed`, full width, 32 tall, z 60 |

Everything above the grid is **fixed**, which is why the page doesn't scroll: the layout is a single composed screen, not a document.

Same one-size discipline as the ear sites, and — worth noting — the same foundry. This site pays for ABC Diatype; ear-music.org declares it and never loads it.

---

## First-load cost

| | 390 | 1280 |
|---|---:|---:|
| requests | **172** | **172** |
| total transfer | **2.03 MB** | **4.12 MB** |
| video bytes at rest | 0 | 0 |

Identical request count, double the bytes at desktop — the grid requests larger thumbnail renditions. All 120 thumbnails are fetched eagerly on first paint.

**For sie this is the number to beat.** 172 requests and 2 MB to show 120 thumbnails is roughly 17 KB per tile for a 31.8px box. Lazy-loading below the fold and serving 2× rather than 6× renditions would cut it by most of an order of magnitude.

---

## What to take for sie's /sie page

**Take:** thumbnails at rest, video created on demand and destroyed after — the one-live-player discipline, applied to `<video>` as well as iframes. Take the ~3:2 tile aspect. Take the single type size and the fixed text block above the wall.

**Don't take:** eager-loading every tile (172 requests, 2 MB), 6× oversized renditions, or the assumption of a marquee — there isn't one. And note the mobile swipe strip in sie's spec has **no precedent here**; at 390 this reference just reflows the grid and fits everything on one screen without scrolling. That is worth considering as an alternative: sie has four videos today, not 120, and a 2×2 grid would need no swipe mechanism at all.
