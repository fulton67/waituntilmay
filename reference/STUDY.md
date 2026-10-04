# STUDY — from three references to one sie

Read `fonts.md` first, then the three site files. This document does one job: for every element of sie, show what A, B and C each do, and state what sie does and why.

**Five things are fixed by Naim and are not up for derivation.** Everything else in this document must trace to the table.

> ground is black · product centred and modest · the disc turns inside the open-case photo · the wordmark is the nav · videos are visible

The black ground is the biggest single departure from the references — all three are light (A and B `#bfbfbf`, C `#ffffff`). It inverts the contrast problem in sie's favour, and it means several values below are deliberately *not* taken from any reference.

---

## 1. The interpolation table

| element | A — ear-music.org | B — shop.ear-music.org | C — thecorrectdistance.com | **sie** | source |
|---|---|---|---|---|---|
| **ground colour** | `#bfbfbf` grey | `#bfbfbf` grey | `#ffffff` white | **`#000000`** | **fixed by Naim.** None of the three. |
| **text on ground** | `#ffffff` — **1.84:1, fails AA** | `#ffffff` — 1.84:1, fails | `#000000` — 21:1 | **`#f4f4f4` — 18.9:1** | chosen: black ground makes near-white the only option, and it finally clears AA, which neither ear site does |
| **secondary text** | none (one colour only) | none | none | **`#8a8a8a` — 5.6:1** | chosen: needed for counter/footer; kept above AA unlike B's single-colour system |
| **accent** | `#3bfb00` — 1.31:1, hue-only | `#ff0000`, used once | none | **none** | from C: no accent at all. A's green is a light-ground trick that dies on black |
| **hairline / divider** | **none anywhere** | **none anywhere** | **none anywhere** | **none** | unanimous across all three |
| **type family** | system Helvetica stack, **0 webfonts** | system Helvetica stack, **0 webfonts** | 1,181 KB ABC Dinamo | **system Helvetica stack** | from A + B. Nothing to buy — see `fonts.md` |
| **type sizes** | **1** | **1** | 4 | **1** | from A + B |
| **root size law** | `3.136vw`, JS-set | `clamp(11px, min(100vw,100vh)×0.03136, 22px)` | `2.128vw`, JS-set | **B's clamp formula** | from B: keys off the short axis, so landscape doesn't inflate. The only reference that gets this right |
| **line-height** | 1.0 everywhere | 1.0 UI / 1.15 prose | 1.2 | **1.0 UI / 1.15 prose** | from B |
| **case** | lowercase, typed | lowercase, CSS-enforced | Sentence case | **lowercase, CSS-enforced** | from B (enforcement); A types it and drifts |
| **gutter** | 22.9px | 22.932px (`1.875rem`) | 0 (full-bleed) / centred text | **22.932px** | from B, which A independently matches |
| **spacing scale** | 1 line + 2 lines, nothing else | 1rem / 1.15 / 1.4 / 2.8rem | generous, unsystematic | **1 / 2 / 3 lines** | from A: the single-unit discipline |
| **alignment** | left | left (counter + buy right) | **centred** | **left, product centred** | hybrid — see §2. Page is A/B left; the object is C/Naim centred |
| **nav placement** | top-left, stacked, scrolls away | top-left, stacked, scrolls away | **mid-page, y 811** | **top, scrolls away** | from A + B. C's mid-page nav needs a hero that earns the scroll |
| **wordmark** | `ear`, in the nav stack, body size | `ear`, in the nav stack, body size | logo image, top-left corner | **`sie`, top-left, body size, IS the nav** | **fixed by Naim**, and it matches A/B's treatment exactly |
| **current-page marker** | **underline** | **underline** | none | **underline** | from A + B |
| **gallery width** | n/a | 344.2px — **88.3vw, in a panel** | **390px — 100vw, full-bleed** | **100vw full-bleed** | from C. "Very large" was the brief |
| **object size in frame** | n/a | **modest** — floats in a `#f1f1f1` box with air | fills the frame edge to edge | **modest, centred, air around it** | **fixed by Naim**; the treatment is B's |
| **panel behind object** | n/a | **yes** — `#f1f1f1`, one shade off page | **no** — page ground shows through | **no panel** | from C: on a black ground a lighter panel would fight the artwork |
| **aspect handling** | `cover` | `cover`, cropped square | **fitted whole**, pillar/letterboxed | **fitted whole, `object-fit: contain`** | from C — forced by sie's real 1.0–1.5455 spread; a square crop loses 35% of the poster |
| **frame ratio** | n/a | 1:1 | 0.94:1 | **1:1** | chosen: least total bar area across 1.0–1.5455 (108.8px vs 158.8px for 0.94:1), and a square is the only frame a rotating disc never clips |
| **multi-view** | n/a | click-to-swap thumbs, **no swipe** | stacked slideshow, swipe + edge zones | **native scroll-snap swipe** | chosen: B can't swipe, C uses JS. `scroll-snap-type: x mandatory` is the modern answer both predate |
| **indicator** | n/a | **text counter `1/7`** | **none** | **text counter `1/4`** | from B. C's absence is a real failure — nine slides with no sign they exist |
| **disc treatment** | n/a | n/a | n/a | **disc rotates inside the open-case photo, 14s linear, active slide only** | **fixed by Naim.** No reference does this |
| **title** | n/a | body size, left, lowercase | centred, sentence case | **body size, left, lowercase** | from B |
| **price** | n/a | `15 usd` — no symbol, body size | `26 €` — **with symbol**, centred | **`$80`** — with symbol, left, body size | B's weight and placement, C's symbol |
| **buy control** | n/a | **57.8 × 12.2px unstyled text** — 28% of minimum | 74.7 × 23.9px platform-default pill — 54% | **full width, ≥44px, 1px border, no radius** | chosen: **both references fail.** See §3 |
| **buy placement** | n/a | right-aligned corner | centred below price | **full width below price** | chosen: neither reference's placement survives a 44px target |
| **links page rows** | **one line each, no dividers, no icons** (`/about`) | n/a | n/a | **one line each, no dividers, 44px hit area** | from A `/about` — the real model, not `/home-2` |
| **link row hit area** | **14px — 32% of minimum** | 12.2px — 28% | 10.4px — 23% | **44px** | chosen: **all three fail.** The look survives padding |
| **video presentation** | **linked, never embedded** — no thumbnail, no badge, no title | n/a | n/a | **visible: title + channel, no embed** | **fixed by Naim** ("videos visible"); A's no-embed discipline kept |
| **footer** | live date stamp only | two policy links | about + contact, two columns | **date + policy links** | A's date, B's policy links |
| **hover** | **none** (one rule, phone never fires it) | **none** — not one `:hover` in the theme | **none**, except `cursor: e-resize` on the gallery | **none, except `e-resize` on gallery** | from B + C's one good idea |
| **press** | `opacity 0.7` | `opacity 0.7` | `opacity 0.7` | **`opacity 0.7`** | unanimous |
| **page transition** | opacity fade 120/160ms | none | opacity fade 120/160ms | **none** | chosen: a two-page site doesn't need it |
| **reduced motion** | not honoured | **honoured** | not honoured | **honoured** | from B |
| **sticky elements** | none | none | none | **none** | unanimous |
| **retina** | 2.03× cap | **4.07×** | 2.05× cap | **3× (1170px)** | from B, which is the only one that serves it properly |

---

## 2. The sie design spec

### Tokens

```css
:root{
  /* colour — black ground, 4 values, all AA-clear */
  --bg:        #000000;   /* fixed                                    */
  --fg:        #f4f4f4;   /* 18.9:1                                   */
  --fg-muted:  #8a8a8a;   /*  5.6:1 — counter, footer, channel labels */
  --hairline:  transparent; /* declared and never used — no dividers  */

  /* type */
  --line:      1;
  --line-copy: 1.15;

  /* space — one line, two lines, three lines. nothing else. */
  --pad:    1.875rem;   /* 22.932px @390 — B's --ear-pad exactly */
  --gutter: 0.65rem;
  --step-1: 1rem;
  --step-2: 2rem;
  --step-3: 3rem;

  /* motion */
  --t-press: 0ms;       /* opacity .7, no transition — all three sites */
  --t-disc:  14s;
}

html{
  --root-scale: 0.03136;
  font-size: clamp(11px, calc(min(100vw,100vh) * var(--root-scale)), 22px);
  text-size-adjust: 100%;
}
```

→ **12.2304px at 390**, identical to both ear properties.

### Type roles — one size, one weight, one family

`font-family: "Helvetica Neue", Helvetica, Arial, sans-serif` · `400` · `letter-spacing: 0` · `text-transform: lowercase`

| role | size | line-height | colour | align |
|---|---|---:|---|---|
| wordmark `sie` (is the nav) | 1rem | 1.0 | `--fg` | left |
| nav `links` / `shop` | 1rem | 1.0 | `--fg`, underline when current | right |
| product title | 1rem | 1.0 | `--fg` | left |
| price | 1rem | 1.0 | `--fg` | left |
| buy label | 1rem | 1.0 | `--fg` | centre (in a full-width control) |
| counter `1/4` | 1rem | 1.0 | `--fg-muted` | right |
| body / tracklist | 1rem | **1.15** | `--fg` | left |
| link row | 1rem | 1.0 | `--fg` | left |
| channel row | **2rem** | 1.0 | `--fg` | left |
| footer | 1rem | 1.0 | `--fg-muted` | left / right |

The 2rem channel row is the **one** permitted departure from the single-size rule — A allows itself exactly one such exception (the 122px splash wordmark), so the precedent holds.

### Wireframe — cd page, 390px

```
┌──────────────────────────────┐
│ sie                    links │  22.9 · wordmark IS the nav
│                              │
├──────────────────────────────┤  ← full bleed, edge to edge
│                              │
│         ┌──────────┐         │  gallery 390 × 390, 1:1
│         │          │         │  object CENTRED and MODEST
│         │  front   │         │  object-fit: contain
│         │  insert  │         │  bars are #000, read as page
│         └──────────┘         │
│                              │
├──────────────────────────────┤
│ ● ○ ○ ○              1/4     │  dots left (44px targets)
│                              │  counter right, muted
│                              │
│ from paris, with love        │  1rem, left
│ tazparis                     │
│ $80                          │
│                              │
│ ┌──────────────────────────┐ │
│ │           buy            │ │  full width, ≥44px
│ └──────────────────────────┘ │  1px --fg border, no radius
│                              │
│ one cd in a jewel case       │  1.15 line-height
│ 4.75in panels, poster folds  │  physical facts, from C
│ to 9.5in                     │
│ ships from brooklyn          │
│                              │
│ 9/22/26              links   │  date from A, muted
└──────────────────────────────┘
```

Slide 4 is the disc:

```
┌──────────────────────────────┐
│                              │
│   [photo: open jewel case]   │  still photograph, contain
│    ┌────┐                    │
│    │ ◎  │ ← disc rotates in  │  circular disc image
│    └────┘   place, 14s       │  absolutely positioned on the
│             linear, only     │  spindle, transform-origin
│             while active     │  centre, no clipping (a circle
│                              │  in a square is rotation-safe)
└──────────────────────────────┘
```

### Wireframe — links page, 390px

```
┌──────────────────────────────┐
│ sie                     shop │
│                              │
│ channels                     │  muted label
│                              │
│ hunnakay                     │  2rem, 56px row
│ kllhhr                       │  2rem, 56px row
│                              │
│ videos                       │  muted label
│                              │
│ tazparis on my terms  kllhhr │  1rem, 44px row
│ 18 by sheroy          sheroy │  channel right, muted
│ suckrball - moss   suckrball │
│ disgusted w tazparis    hip  │
│                              │
│         [ empty space ]      │  ← A's /about leaves half the
│                              │    page empty. Keep that.
│ 9/22/26               shop   │
└──────────────────────────────┘
```

No dividers, no icons, no thumbnails, no embeds. Rows sit one line apart visually with a 44px hit area laid over — use the **two-line step (28px)** between rows so the targets don't overlap.

### Motion spec

| trigger | property | duration | easing | source |
|---|---|---:|---|---|
| press, anything | `opacity` → 0.7 | 0ms | — | all three |
| focus-visible | `outline: 1px solid var(--fg)`, offset 2px | — | — | B |
| gallery hover (pointer only) | `cursor` → `e-resize` | — | — | C |
| slide change | native scroll-snap momentum | — | — | new |
| **disc** | `rotate(360deg)` | **14s** | `linear` | fixed |
| current nav item | underline | — | — | A + B |

```css
.slide-disc .disc{ animation: disc-spin var(--t-disc) linear infinite;
                   animation-play-state: paused; }
.slide-disc[data-active="true"] .disc{ animation-play-state: running; }
@keyframes disc-spin{ to{ transform: rotate(360deg) } }

@media (prefers-reduced-motion: reduce){
  .slide-disc .disc{ animation: none }
}
```

**No hover states beyond the cursor. No page transitions. Nothing sticky. Nothing fixed.** Total motion budget: one rotation and one opacity flash.

---

## 3. Why the buy control comes from neither reference

Both fail, in opposite directions, and it's worth being explicit because this is the one element with money attached.

| | size | verdict |
|---|---|---|
| B — unstyled text, corner-right | 57.8 × **12.2** | 28% of the 44px minimum; indistinguishable from body copy until tapped |
| C — pill, centred | 74.7 × **23.9** | 54%; and the styling is **Cargo's stock component default**, not a decision the site made |

```css
.buy{
  display:flex; align-items:center; justify-content:center;
  width:100%; min-height:44px;
  padding: calc(var(--pad)/2) var(--pad);
  background:transparent;
  border:1px solid var(--fg);
  border-radius:0;
  font:inherit; color:var(--fg); text-transform:lowercase;
}
.buy:active{ opacity:.7 }
```

Body type, lowercase, no fill — B's restraint kept. But full width, 44px tall, and carrying **the only border on the site**, which is what makes it read as a control.

---

## 4. Open questions

**1. The black ground reverses the earlier palette work.** Everything measured before assumed `#d9d9dc`. On black, white text finally clears AA (18.9:1 vs 1.41:1) — a real improvement — but it also means the artwork sits on black, and all four views are already dark, low-chroma pieces (`#1d1d1e` through `#514a42`). The tray card in particular is near-black on near-black.
**Default:** proceed on `#000000` as fixed, and if a view disappears into the ground, give the *gallery frame only* a very slight lift (`#0d0d0d`) rather than changing the page.

**2. The disc slide needs two assets that don't exist.** "The disc turns inside the open-case photo" requires (a) a photograph of the open jewel case and (b) a circular disc image with transparency, positioned on the spindle. Neither is in the repo — there is still no disc artwork at all.
**Default:** build the slide with a CSS-drawn circular placeholder over a flat panel, clearly marked as placeholder, and swap both in when the photography exists.

**3. Left-aligned page, centred object.** A and B are left-aligned; C is centred. Naim's brief says the product is centred and modest. I've read that as: the *page* stays left-aligned (A/B), the *object within its frame* is centred (C/Naim).
**Default:** as written above. If "centred" was meant to include the title/price/buy, that's C's whole composition and the links page should follow suit for consistency.

**4. Price display.** B writes `15 usd`, C writes `26 €`. The brief says `$80`.
**Default:** `$80` — symbol, no cents, no currency code, body size.

**5. The channel rows at 2rem.** "Big lowercase text rows" was the instruction; 2rem is double body. A's only size exception is 10×.
**Default:** 2rem. If it reads too timid next to A's splash, 3rem is the next step.

**6. Videos "visible" but not embedded.** A links video with no thumbnail, badge or title at all. Naim wants videos visible. I've read that as title + channel name as text rows, no iframe.
**Default:** text rows now; click-to-load facades with `hqdefault` thumbnails are a later upgrade if "visible" meant imagery. Note `hqdefault.jpg` is 4:3 with baked-in bars — crop to the centre 480 × 270 band for a clean 16:9.

**7. Still unresolved from earlier passes:** only 1 of the 4 videos is on a listed channel (`@kllhhr`); `@hunnakay` owns none of them. The other three are on `@comeheadtapme19`, `@suckrballll` and `@ibeenhip`.
**Default:** flat list of six links — four videos plus two channels — which is the only reading that drops nothing.

---

## 5. What was captured, and what wasn't

Ten pages, ten HTTP 200s, every one screenshotted at 390 × 844 dpr 3 in both above-the-fold and full-page form — 20 PNGs in `reference/captures/`.

**Could not capture:**

- One stylesheet per Cargo site is **CORS-blocked** from the CSSOM: `build.cargo.site/frontend/d36c1d/index.css` (A) and `.../9c0ec2/index.css` (C). I read both by fetching the URL from inside the page, so their `@font-face` rules are included — but I cannot attribute a computed style back to a line number in them. C's buy-button appearance lives in one of these, which is why it took a runtime class-toggle to establish.
- **`shop-product`'s shadow stylesheet** is only 273 bytes and contains no button styling; the appearance comes from the blocked framework CSS.
- **Cargo `<media-item>` images** are inside shadow roots — every image query in this study pierces `shadowRoot`, and a light-DOM query returns zero images on A's index.
- **C's enabled buy state** cannot be observed, because the only product is sold out. Established by class-toggling instead, which proved the enabled and disabled states are identical.
- **A's hover rule** (`column-unit:has(> u) a:hover`) sits behind `@media (hover: hover)` and cannot fire on a phone at all.
