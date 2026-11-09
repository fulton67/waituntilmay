# ninepointsixthree.co — measured spec

Study notes. Measured 2026-11-09 from the live site at 390x844 (mobile, touch, DPR 2)
and 1440x900 (desktop, DPR 1), Chromium via Playwright with a real GPU (ANGLE/D3D11).
Every number here was read from `getComputedStyle` / `getBoundingClientRect` /
`document.getAnimations()`, or from the shipped CSS and JS. Nothing here is their
code, copy, imagery or type — only the dimensions of what they built.

Raw data: `bundle.json`, `runtime.json`, `measured.json`, `formula-check.json`,
`js-analysis.json`, `session-390.har`, `session-1440.har`.

## 1. Stack

| Fact | Value | How measured |
|---|---|---|
| Framework | Next.js **App Router** | `self.__next_f` present, `__NEXT_DATA__` absent |
| Build manifests | **none** (`_buildManifest.js` / `_ssgManifest.js` 404) | App Router has no such files |
| CMS | Sanity, project `xsp4llp3`, dataset `production` | `cdn.sanity.io` image URLs, 135 `sanity` hits in bundle |
| Routes | 4 groups / 14 URLs | `sitemap.xml` + link crawl |
| JS chunks | 24 (1,239,849 B uncompressed) | downloaded all |
| CSS files | 2 (27,149 B) | `4c127f03…` app, `1d8d46c9…` Swiper |
| Fonts | 4 self-hosted faces (337,460 B on disk, 1.17 MB over the wire) | `_next/static/media/*` |
| Sourcemaps | **0** — no `sourceMappingURL`, every `.map` probe 404 | 26 probes |
| WASM | **0** | no `.wasm` in any route or chunk |
| Requests / route-set | 147 entries, 0 errors | HAR, both widths |

### Routes
`/` · `/journal` · `/journal/[slug]` (11 entries) · `/sounds`

### Endpoints (REA `analyze-javascript-application`, 19 app chunks, 0 parse failures)
`/api/subscribe` (`fetch`, from `layout`) · `/_next/image` ×3 · Sanity
`loader/query-listen` (live preview) · route candidates `/`, `/journal`, `/sounds` ·
1 worker in chunk `341`.

## 2. Tokens

| Token | Value | Note |
|---|---|---|
| `--background` | `#f8f8f8` | **declared but not what body uses** |
| `--foreground` | `#373737` | = `rgb(55,55,55)`, the body text colour |
| actual page background | `rgb(250,249,246)` = `#FAF9F6` | warm off-white |
| surface (pill) | `#DBDBDBB2` = `rgba(219,219,219,.698)` | |
| surface hover | `#BCBCBCB2` = `rgba(188,188,188,.698)` | |
| surface active/selected | `rgba(108,108,108,.698)` | with `#F8F8F8` text |
| border | `0.5px solid #BCBCBCB2` | half-pixel |
| radius — pill | `24px` | |
| radius — media tile | `12px` | |
| backdrop blur | `blur(64px)` on the pill; `blur(22px)` in the email keyframe | |

### Type
One family, one weight. `Helvetica` self-hosted via `next/font/local` in 4 faces
(400 normal `.otf`, 700 normal `.ttf`, 400 italic `.ttf`, 700 italic `.ttf`), plus a
metric-matched `Helvetica Fallback` over `local("Arial")` with
`ascent-override:93.91% descent-override:21.11% size-adjust:101.37%`.
Every rendered text node resolves to weight **400**.

| Size | Count (390 / 1440, /journal) | Role |
|---|---|---|
| `11px` / line-height `13.75px` (1.25) | 182 / 167 | body, nav, nearly everything |
| `7.5px` | 43 / 43 | fine print |
| `13.4px` | 11 / 11 | |
| `14px` | 6 / 3 | largest type on the site |

There is no large display size anywhere. The Tailwind theme variable is misnamed:
`--font-times-new-roman: "Helvetica","Helvetica Fallback"`.

## 3. Nav pill

Identical at both widths; only the left offset changes.

| Property | 390 | 1440 |
|---|---|---|
| wrapper box | 71.41 x 35.75 at x=24, y=34 | 71.41 x 35.75 at x=60, y=34 |
| item box | — (collapsed) | 74 x 35.75 |
| item pitch / gap | — | 80px pitch, 6px gap (x = 1146, 1226, 1306) |
| padding | `10px 0` | `10px 0` |
| font | 11px / 400 | 11px / 400 |
| radius | 24px | 24px |
| background | `rgba(219,219,219,.698)` | same |
| backdrop-filter | `blur(64px)` | same |
| transition | `color, background-color, border-color, text-decoration-color, fill, stroke` **500ms** `cubic-bezier(.4,0,.2,1)` | same |

## 4. The media wall — the whole scroll effect

Two implementations behind one breakpoint, `window.innerWidth < 640`.

| | < 640 (mobile) | >= 640 (desktop) |
|---|---|---|
| mechanism | **native scroll** of an overflow container | **Swiper**, `direction:"vertical"` |
| tile class | `.image-container` | `.slide` |
| tiles in DOM | 282 | 188 (`swiper-slide` count) |
| document scrolls? | **no** — `scrollHeight` 844 == viewport | **no** — `scrollHeight` 900 == viewport |
| infinite loop | teleport `scrollTo({top: scrollHeight/2, behavior:'instant'})` at either end | `loop:true` + `slideTo(len/2, 0)` when `realIndex` < 10 or > len-10 |
| scale ceiling | **1.4** | **1.5** |
| influence radius | `vh / 4` | `vh / 5` |

Swiper config (desktop): `slidesPerView:"auto"`, `spaceBetween:2`,
`virtualTranslate:false`, `loop:true`, `freeMode:{enabled:true, sticky:false}`,
`allowTouchMove:true`, `centeredSlides:true`, `direction:"vertical"`.
The slide list is the media array **repeated 4x**.

### Base tile
`110 x 138 px` (ratio 0.7971), `border-radius:12px`, `overflow:hidden`,
`transform-origin:center center`,
`transition: all 300ms cubic-bezier(0,0,0.2,1)` (Tailwind `transition-all duration-300 ease-out`).

### The proximity scale
Per tile, on every settle pass, width and height are written as inline px:

```
c     = rect.top + rect.height/2          // tile centre, viewport coords
d     = |c - vh/2|                        // distance from viewport centre
scale = clamp(1, 1 + 0.5*(1 - d/R), MAX)  // R = vh/4 mobile, vh/5 desktop
width  = 110 * scale
height = 138 * scale
```

`MAX` = 1.4 mobile, 1.5 desktop. Only tiles with
`rect.bottom > -100 && rect.top < vh+100` are touched; desktop further limits the
pass to `realIndex-5 .. realIndex+5`.

Verified against live geometry (`formula-check.json`):

| Check | Expected | Measured | Result |
|---|---|---|---|
| upper clamp, 390 | `110 x 1.4 = 154.000` | `154.000` | exact |
| settled centre tile, 1440 (d=44.9, vh=900) | `1.375278` | `151.281/110 = 1.375282` | 5 dp |
| lower clamp beyond R | exactly `110.000` | `110.000` on all 5 far tiles, both widths | exact |
| radius cutoff, 1440 | `vh/5 = 180` | last scaled tile d=136.8, first unscaled d=203.6 | brackets 180 |
| radius cutoff, 390 | `vh/4 = 211` | first unscaled d=285.2 | consistent |

Instantaneous per-tile deltas of up to 11.9 px appear while scrolling. They are not
a different formula: the pass reads positions that its own writes then move (tiles
are in normal flow, so resizing one shifts every tile below it), and the 300 ms
transition means the painted size lags the written size. The system is a damped
feedback loop, and it only matches the closed form once it settles.

### Wheel handling (desktop)
```
window.addEventListener('wheel', e => {
  e.preventDefault();                                  // {passive:false}
  swiper.setTranslate(swiper.translate - 0.5*e.deltaY) // deltaY halved, applied raw
  swiper.update()
  debounce(10ms) -> resize pass
})
```
No interpolation, no lerp, no `requestAnimationFrame` smoothing of the scroll
position itself. The soft feel comes from Swiper's `freeMode` momentum plus the
300 ms size transition — not from scroll easing.

## 5. Production leftovers
`console.log("Image scale:", …)` on every mobile resize pass and
`console.log("End reached, teleporting to middle...")` on every loop wrap.
Images are `unoptimized:true`, served straight from `cdn.sanity.io` as AVIF
(63 of 147 requests), with `placeholder:"blur"` from Sanity's LQIP.
