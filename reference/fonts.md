# Fonts — what these three sites actually set text in

Captured 2026-09-22 · Scrapling 0.4.15 → Chromium · 390 × 844, dpr 3 · every page loaded live and read twice: once from the CSSOM (`@font-face`), once from `document.fonts` after `document.fonts.ready`.

---

## The short answer

**ear-music.org and shop.ear-music.org do not use a webfont at all.** Between them they download **zero font files**. Both set everything in a system Helvetica stack, so the typeface you see depends entirely on the device:

| device | what actually renders |
|---|---|
| iPhone / iPad / Mac | **Helvetica Neue** (an Apple system font) |
| Windows | **Arial** |
| Android | **Roboto** |

So "use the same fonts as ear-music.org" has an unusual answer: **there is nothing to buy and nothing to install.** Ship the same stack and you get the same result — genuinely identical on Apple hardware, which is where nearly all of this traffic will be.

`thecorrectdistance.com` is the opposite: it pulls **1.18 MB** of commercial ABC Dinamo faces from Cargo's font CDN. Those are licensed *to Cargo*, not to its users, and cannot be reused off-platform.

---

## Every page fetched

| site | page | URL | HTTP | root font @390 |
|---|---|---|---:|---:|
| A | splash | `https://ear-music.org/` | **200** | 12.2304px |
| A | index | `https://ear-music.org/home-2` | **200** | 12.2304px |
| A | about | `https://ear-music.org/about` | **200** | 12.2304px |
| A | releases | `https://ear-music.org/releases` | **200** | 12.2304px |
| B | home | `https://shop.ear-music.org/` | **200** | 12.2304px |
| B | product | `https://shop.ear-music.org/products/rumspringa-cd` | **200** | 12.2304px |
| B | cart | `https://shop.ear-music.org/cart` | **200** | 12.2304px |
| C | home | `https://thecorrectdistance.com/` | **200** | 8.2992px |
| C | shop | `https://thecorrectdistance.com/shop` | **200** | 8.2992px |
| C | product | `https://thecorrectdistance.com/shop-cover-01` | **200** | 8.2992px |

Ten pages, ten 200s. A's nav exposes exactly four routes (`/`, `/home-2`, `/about`, `/releases`); `shop` and `cart` in its nav point off-site to B.

**Not captured:** one stylesheet per Cargo site is CORS-blocked from the CSSOM —
`build.cargo.site/frontend/d36c1d/index.css` (A) and `build.cargo.site/frontend/9c0ec2/index.css` (C). I read those by fetching the URL from inside the page instead, so their `@font-face` rules *are* included below; what I cannot do is attribute a computed style back to a specific line in them.

---

## `@font-face` declared vs actually loaded

### A — ear-music.org

| declared family | faces | loaded |
|---|---:|---:|
| Diatype Variable | 9 | **0** |
| Diatype Semi-Mono Variable | 6 | **0** |
| Diatype Mono Variable | 6 | **0** |
| **total** | **21** | **0** |

**Font files downloaded: 0.**

Cargo injects its whole font menu into every site's CSS whether or not the author picked one. ear-music.org picked none, so 21 faces sit declared and unused. Nothing is fetched, because `@font-face` is lazy — a face only downloads when something asks for it.

### B — shop.ear-music.org

| declared | loaded | files |
|---:|---:|---:|
| **0** | **0** | **0** |

Not a Cargo site — a hand-built Shopify theme. It declares no `@font-face` at all. This is the cleanest statement of intent in the whole reference set: someone wrote the CSS by hand and deliberately did not reach for a webfont.

### C — thecorrectdistance.com

| declared family | faces | loaded |
|---|---:|---:|
| Arizona Sans Variable | 6 | 0 |
| Arizona Flare Variable | 6 | 0 |
| Arizona Mix Variable | 6 | 0 |
| **Arizona Text Variable** | 6 | **5** |
| **Arizona Serif Variable** | 6 | **5** |
| Monument Grotesk Variable | 9 | 0 |
| Monument Grotesk Semi-Mono Variable | 8 | 0 |
| Monument Grotesk Mono Variable | 8 | 0 |
| **Favorit Variable** | 6 | **5** |
| **Diatype Variable** | 9 | **8** |
| Diatype Semi-Mono Variable | 6 | 0 |
| Diatype Mono Variable | 6 | 0 |
| Neue Haas Grotesk | 6 | 0 |
| **total** | **88** | **23** |

Three files come over the wire, all from Cargo's own font host:

```
https://type.cargo.site/files/Cargo-DiatypePlusVariable.woff2     427 ms
https://type.cargo.site/files/CargoArizonaPlusVariable.woff2     1074 ms
https://type.cargo.site/files/CargoFavoritVariable.woff2          791 ms
```

Each is a multi-family variable bundle — one file carries both Arizona Text and Arizona Serif. Measured under Slow 4G + 4× CPU these total **1,181 KB**, the single largest cost on the page and a direct contributor to its **CLS 0.17**.

`font-display` is **unset** on every declared face on both Cargo sites, which means the default `auto` — in Chromium, a block period followed by an indefinite swap.

---

## Method note: `document.fonts.check()` lied

My first pass reported "resolved: Helvetica Neue" for A and B and I nearly wrote that down as fact. It's wrong. `document.fonts.check('40px "Helvetica Neue"')` returns **`true` on a Windows machine with no Helvetica Neue installed** — it answers "can I render this request without a pending download", not "is this family present".

The reliable test is a width comparison. Same string, same size, measured through canvas:

```
string  "Handgloves 0123 rumspringa"  at 40px

  B's body stack                                     522.54
  Arial                                              522.54   ← identical
  Helvetica                                          522.54   ← identical (maps to Arial on Windows)
  sans-serif                                         522.54   ← identical

  "Helvetica Neue"  (alone)                          473.26
  "Times New Roman"                                  473.26   ← identical
  "Liberation Sans"                                  473.26   ← identical
  "Nimbus Sans"                                      473.26   ← identical

  Verdana                                            591.39   (control, distinct)
  monospace                                          571.80   (control, distinct)
```

Read that second block carefully: `"Helvetica Neue"` requested alone measures the same as `"Times New Roman"`, because **none** of those families exist on this machine and all three fall through to the browser's default serif. That is proof of absence, not presence.

So on the capture machine both A and B render in **Arial**. On Naim's iPhone they will render in **Helvetica Neue**. Same CSS, different typeface — by design.

---

## Which family renders which role

### A — ear-music.org (`/home-2`, `/about`)

Stack: `"Helvetica Neue", Helvetica, sans-serif, "Helvetica Neue Regular"`
*(the trailing `"Helvetica Neue Regular"` is a Cargo artefact; it matches nothing)*

| role | size @390 | weight | line-height | tracking | case |
|---|---:|---:|---:|---|---|
| nav (`about`, `releases`, `shop`) | 12.2304px | 400 | 12.2304px (1.0) | normal | typed lowercase |
| wordmark `ear` | 12.2304px | 400 | 12.2304px | normal | typed lowercase |
| list row (show dates) | 12.2304px | 400 | 12.2304px | normal | typed lowercase |
| tracklist | 12.2304px | 400 | 12.2304px | normal | typed lowercase |
| footer (live date) | 12.2304px | 400 | 12.2304px | normal | — |
| **splash wordmark** (`/` only) | **122.304px** | 400 | 122.304px | normal | typed lowercase |

One size for the entire site, with a single 10× exception on the door page. `text-transform` is `none` everywhere — the lowercase is **typed by hand**, not enforced in CSS.

### B — shop.ear-music.org

Stack: `"Helvetica Neue", Helvetica, Arial, sans-serif` *(cleaner — a real Arial fallback)*

| role | example | size @390 | weight | line-height | case |
|---|---|---:|---:|---:|---|
| nav | `about` | 12.2304px | 400 | 12.2304px (1.0) | `text-transform: lowercase` |
| wordmark | `ear` | 12.2304px | 400 | 12.2304px | lowercase |
| product title | `rumspringa vinyl` | 12.2304px | 400 | 12.2304px | lowercase |
| price | `30 usd` | 12.2304px | 400 | 12.2304px | lowercase |
| buy label | `add to cart` | 12.2304px | 400 | 12.2304px | lowercase |
| list row | `the most dear and the future usb` | 12.2304px | 400 | 12.2304px | lowercase |
| caption | `1/9` | 12.2304px | 400 | 12.2304px | lowercase |
| body copy | `rumspringa by ear pressed on…` | 12.2304px | 400 | **14.065px (1.15)** | lowercase |
| footer | `privacy policy` | 12.2304px | 400 | 12.2304px | lowercase |

**Nine roles, one size, one weight, one colour.** The only variable in the entire type system is line-height: `1.0` for UI, `1.15` for prose. Unlike A, the lowercase is enforced in CSS.

### C — thecorrectdistance.com

| role | family | size @390 | weight | line-height |
|---|---|---:|---:|---:|
| nav / links | **Diatype Variable** | 11.6189px | 400 | 13.9427px (1.2) |
| caption | **Favorit Variable** | 6.2244px | 300 | 7.46928px (1.2) |
| body / contributor list | Arizona Text Variable | ~8.3px | 400 | 1.2 |
| price, buy label | Diatype Variable | 9.959px | 400 | normal |

Four sizes, two weights, three families. A 6.2px caption is below any sane legibility floor on a real phone — it reads as texture beside the photography, not as something to read.

---

## Identifying the typefaces

| family as declared | actual typeface | foundry | confidence | how identified |
|---|---|---|---|---|
| Diatype Variable | **ABC Diatype** | **ABC Dinamo** | **certain** | `abcdinamo.com/typefaces/diatype` returns 200, page title "Diatype — Dinamo Typefaces"; Cargo's file is literally named `Cargo-DiatypePlusVariable.woff2` |
| Arizona Text / Serif / Sans / Flare / Mix | **ABC Arizona** | **ABC Dinamo** | **certain** | file `CargoArizonaPlusVariable.woff2`; Arizona is a Dinamo superfamily with exactly these five cuts |
| Favorit Variable | **ABC Favorit** | **ABC Dinamo** | **certain** | file `CargoFavoritVariable.woff2` |
| Monument Grotesk (+ Semi-Mono, Mono) | **ABC Monument Grotesk** | **ABC Dinamo** | **certain** | declared-only; name is unique to Dinamo |
| Neue Haas Grotesk | **Neue Haas Grotesk** | **Monotype** (Christian Schwartz's 2010 redraw of Haas Helvetica) | **certain** | declared-only, never loaded |
| *(A and B)* | **Helvetica Neue** on Apple / **Arial** on Windows / **Roboto** on Android | Monotype / Monotype / Google | **certain** | width probe above |

**Cargo's entire bundled font menu is ABC Dinamo**, plus one Monotype face. That is a licensing arrangement between Cargo and Dinamo, not something a Cargo user owns.

---

## Licensing

### For A and B — nothing to buy ✅

There is no webfont to license. Ship this and you match them exactly:

```css
font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
```

That's B's stack verbatim (I'd use B's over A's — A's trailing `"Helvetica Neue Regular"` matches nothing and its missing `Arial` makes the Windows fallback implicit rather than declared).

**If you want Helvetica Neue on every device**, not just Apple, that's a separate purchase: Helvetica Neue is Monotype's, sold through `monotype.com` / `fonts.com`, web licences priced by monthly pageviews. Worth saying plainly: **I don't recommend it.** You'd pay for a webfont to make Windows and Android look like the iPhone, on a site whose reference sites don't bother, and you'd add ~100 KB to beat a 0 KB baseline. Arial and Roboto are close enough at 12px that nobody will notice.

### For C's fonts — buyable, but not what you asked for

ABC Dinamo sells direct at **abcdinamo.com**. Confirmed from their site: licence types are **Desktop/Print**, **Web** ("Use webfonts for your website"), and **App/Game**, with web pricing scaled by **company size**.

**I could not extract a price.** The configurator is JavaScript-driven and the page returns no figure to a plain fetch; `abcdinamo.com/pricing` is a 404. Get a number from the typeface page's own configurator, or email them — for a one-person operation it will be their smallest tier. Confidence on the tier structure: high. On any specific price: **none, I have no number.**

### ⚠️ The file you must not use

```
https://type.cargo.site/files/Cargo-DiatypePlusVariable.woff2
→ HTTP 200, 356,716 bytes, publicly downloadable
```

All three of Cargo's font bundles are openly fetchable. **Do not.** They are served under Cargo's licence to Cargo's own subscribers; hotlinking or copying them onto sie.market is a licence breach, and it's the kind that gets noticed because the referrer is in Cargo's logs.

---

## Recommendation

**Use the system stack. There is nothing to install and nothing to buy.**

```css
font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
font-weight: 400;
letter-spacing: 0;
-webkit-font-smoothing: antialiased;
```

This is not a compromise or a stand-in — it is *precisely* what both ear properties do, and it's why they load in a fraction of the bytes C needs. On Naim's phone it renders real Helvetica Neue.

`assets/fonts/` has deliberately not been created. There is no open-source file to install, because the reference sites install nothing.

**If you later decide you want a font nobody else has**, the two honest routes are: license ABC Diatype from Dinamo (the actual Cargo look, ~360 KB, get a quote), or use **Inter** or **Archivo** from Google Fonts (SIL OFL, free, self-hostable) — both are grotesques that sit comfortably where Helvetica does at small sizes. Neither is needed for the brief as written.
