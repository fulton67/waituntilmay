# cellar-app.io — motion and spacing study

Study notes only. Nothing from this site ships: no code, CSS, fonts, images or copy.
Measured 2026-11-16 (headless Chromium 1243, Playwright). Linked from newapology.com `/work/cellar`
(the client build; the footer links back to newapology.com, `extracted/index.html`).

Tags: **[O]** observed in a capture, **[I]** inferred from code or a fit, **[U]** unknown.

Time base note: in `runtime/*.json` the `marks[].t` values are raw `performance.now()`, while
`styleWrites[].t` are relative to the init script (about 500 ms later in page time). All durations below are
differences inside one series, so the offset does not affect them.

## 1. Pages captured

Hugo 0.153.1 static site (`<meta name=generator>`), 6 page types, each at 1440x900 and 390x844 (DPR 2, touch).
`/installation/` and `/usage/` are meta-refresh redirects (352 B / 319 B) to their first child page, so the
child pages were captured instead.

| Page type | URL | 1440 file | 390 file | docH 1440 / 390 |
|---|---|---|---|---|
| Home (landing) | `/` | `runtime/cellar-app.io_1440.json` | `runtime/cellar-app.io_390.json` | 4656 / 5200 |
| Home, UK locale | `/uk/` | `runtime/cellar-app.io__uk_1440.json` | `..._uk_390.json` | 4656 / 5224 |
| About | `/about/` | `runtime/cellar-app.io__about_1440.json` | `..._about_390.json` | 2846 / 3545 |
| Docs article (installation) | `/installation/deployment-and-configuration/deployment` | `runtime/cellar-app.io__installation__deployment-and-configuration__deployment_1440.json` | `..._390.json` | 3186 / 4233 |
| Docs article (usage) | `/usage/creating-a-secret/file-secret-details` | `runtime/cellar-app.io__usage__creating-a-secret__file-secret-details_1440.json` | `..._390.json` | 3415 / 4346 |

Per-capture folders with log and session video: `sites/cellar-app.io/runtime/<page>_<width>/`.
Frames: `sites/cellar-app.io/frames/home_1440_1fps.png`, `home_390_1fps.png`.

## 2. Stack (REA + bundle text)

REA run: `rea analyze-javascript-application sites/cellar-app.io/extracted --json` -> `sites/cellar-app.io/rea.json`,
Evidence **`ev_87656032fc409c30ea4bf95608be37a4e28b6aa393b3cf77062a35dfc5ab0aec`**, 8 relevant files, 1 JS file parsed
(`inline_scripts.js`, the de-duplicated inline `<script>` bodies, sha256 `08d5b5c1…`), 342 AST nodes, 0 parse failures.
The site has **no same-origin JavaScript at all**; every library loads from public CDNs, so REA could only see the
inline glue. REA semantic nodes for `gsap`, `ScrollTrigger`, `read:/timeline` sit at `inline_scripts.js` line 3.

| Library | Version | Source | Role | Tag |
|---|---|---|---|---|
| GSAP core | 3.9.1 | cdnjs `<script>` | one scroll-scrubbed timeline | [O] HTML + runtime writes |
| ScrollTrigger | 3.9.1 | cdnjs | `scrub: true`, no smoothing | [O] |
| Alpine.js | `@3.x.x` (resolved 3.17.5 on 2026-11-16) | jsDelivr, unpinned | menus, search dropdown, collapse | [O] HTML; version [I] from CDN fetch |
| @alpinejs/collapse, @alpinejs/focus | `@3.x.x` | jsDelivr | accordion nav | [O] |
| MiniSearch | 7.1.0 | jsDelivr | site search (no motion) | [O] |
| Tailwind CSS | 4.1.18 | `/css/style.min.*.css` (73,583 B) | all transitions are Tailwind utilities | [O] |
| Smooth scroll library | none | — | `html.scroll-smooth` only (affects anchor jumps, not the wheel) | [O] `facts.scrollBehavior = "smooth"` |
| Page transitions (Barba/Swup) | none | — | full page loads | [O] |
| WebGL / canvas | none | — | `facts.media.canvas = 0` on every page | [O] |

CSS `@keyframes`: **0** in every capture (`facts.keyframes.length = 0`). [O]

## 3. Motion table

| # | Effect | Target | Trigger | Duration | Delay | Easing | Values | Stagger | Measured curve | Tag |
|---|---|---|---|---|---|---|---|---|---|---|
| M1 | Counter-rotating hero crosses | `img#logo1`, `img#logo2` (same 534x544 green cross SVG, 544 px at 1440, 373 px at 390) | scroll, `#hero` "top top" to "+=600" px, `scrub: true` | tied to 600 px of scroll (timeline length 2 s, both tweens in parallel via `"<"`) | 0 | GSAP default `power1.out` per tween (no ease given) | logo1 rotate 0 -> 180 deg, logo2 0 -> -180 deg, `transformOrigin: center` | 0 (both start together) | see M1 below | [O] writes + [I] ease fit |
| M2 | Nav link colour | `nav a.transition.duration-500` | hover | 500 ms | 0 | `cubic-bezier(0.4,0,0.2,1)` | `rgb(110,110,110)` -> `rgb(48,48,48)` | — | CSSTransition seen 61 samples (`anims["color@a.transition.duration-500.text-cellar-5"]`, home 1440) | [O] |
| M3 | Search results dropdown | `div[x-show=searchResults.length>0]` | typing | enter 200 ms / leave 100 ms | 0 | enter `ease-out` = `cubic-bezier(0,0,0.2,1)`, leave `ease-in` = `cubic-bezier(0.4,0,1,1)` | opacity 0 -> 1, scale 0.95 -> 1 (reverse on leave) | — | not triggered in capture | [I] HTML |
| M4 | Mobile menu panel | `div[x-show=mobile]`, `origin-top` | tap hamburger | enter 200 ms / leave 100 ms | 0 | ease-out / ease-in | opacity 0 -> 1, scale 0.95 -> 1 | — | not triggered | [I] HTML |
| M5 | Hamburger to X | three 1 px x 20 px spans | tap | 300 ms | 0 | `ease-in-out` = `cubic-bezier(0.4,0,0.2,1)` | top: translateY(-6 px) -> rotate(45deg); middle: opacity 1 -> 0; bottom: +6 px -> rotate(-45deg) | — | on load at 390 the closed state itself animates: `translate none -> 0px -6px`, 300 ms, first seen 611 ms (`anims["translate@span.absolute.block.h-px"]`, every 390 capture) | [O] load artifact, [I] toggle |
| M6 | Accordion (docs nav) | `nav[x-collapse]` | tap | 250 ms (plugin default) | 0 | `cubic-bezier(0.4,0,0.2,1)` | height 0 -> auto | — | initial `height: 0px; overflow: hidden` writes at 525 ms (home 1440) | [O] initial state, [I] timing from plugin source |
| M7 | Sticky navbar | `#navbar.sticky.top-0.transition-all.duration-300.ease-out` with `backdrop-blur-md` | declared | 300 ms | 0 | `cubic-bezier(0,0,0.2,1)` | no class change observed on scroll | — | no CSSTransition on `#navbar` in any capture | [O] nothing animates |

### M1 measured curve (home, 1440, `runtime/cellar-app.io_1440.json` `runtime.styleWrites`)

Scroll offset is recovered from the rotated element's box: at rest the cross sits at y = 225, size 544, centre 497;
during scroll its bounding box grows by |cos| + |sin|, so centre = box.y + box.h / 2. Each Playwright wheel step was 120 px.

| write t (ms) | rotate (deg) | box (y, size) | scroll (px) | linear-scrub would predict | power1.out predicts scroll | residual |
|---|---|---|---|---|---|---|
| 5348.0 | 57.49 | 1, 751 | 120.5 | 192 | 105 | +16 |
| 5593.4 | 109.69 | -91, 695 | 240.5 | 366 | 225 | +15 |
| 5779.5 | 147.49 | -239, 751 | 360.5 | 492 | 345 | +15 |
| 5936.0 | 170.89 | -295, 623 | 480.5 | 570 | 465 | +16 |
| 6218.8 | 179.89 | -376, 545 | 600.5 | 600 | 585 | +16 |
| 6500.1 | 180 (`rotate(180deg)`, GSAP drops translate3d at end) | -495, 544 | 720 | — | — | — |

The residual is a constant 15-16 px, which is the trigger start (the hero's top passes the viewport top at about
16 px of scroll, under the 23 px announcement bar and sticky nav). With that offset, `power1.out`
(`1 - (1-p)^2`) fits all five points to within 1 px; a linear map is off by up to 146 px. The 390 capture gives the
same constant (centre + implied scroll = 304 px for all five writes). So: **rotation = 180 x (1 - (1 - (scrollY - 16)/600)^2)**.
Peak angular velocity is at the start of the range (0.6 deg per px), falling to 0 at 616 px; there is no overshoot
and no settle because `scrub: true` has no lag. Frame reference: `frames/home_1440_1fps.png`, 00:07 shows both crosses
at roughly 45 deg mid-scroll. The cross is 4-fold symmetric, so 180 deg reads as "returns to rest".

## 4. Smooth scroll

None. No Lenis/Locomotive; `scrollListeners` = 5 (GSAP/ScrollTrigger and Alpine), and the wheel moves the document
directly (each 120 px wheel step moves scroll by 120 px, M1 table). `html.scroll-smooth` only smooths anchor jumps. [O]

## 5. Page transitions

None. Every navigation is a full Hugo page load; no View Transitions, no Barba/Swup. [O] (no transition libraries in
HTML, no `startViewTransition` in inline scripts.)

## 6. Hover states

- Nav links: grey `#6e6e6e` to `#303030`, **500 ms** standard ease (M2). [O]
- Buttons/cards: no transform hover observed in 30 hovered targets per 1440 capture (`marks hover_start..hover_end`,
  24.6 s). [O]

## 7. Spacing, grid, type, colour tokens

Tailwind 4 theme, read from `extracted/css/style.min.css` and confirmed by computed styles.

**Base unit** `--spacing: 0.25rem` (4 px). Most common computed values (home 1440 / 390, `facts.spacing`):

| Property | 1440 (count) | 390 (count) |
|---|---|---|
| padding-left | 32 (6), 48, 16, 12, 40 | 24 (6), 16, 8 |
| padding-top | 16 (6), 64 (2), 32 (2), 126, 48 | 16 (6), 48 (4), 64, 132, 32 |
| margin-bottom | 16 (5), 80 (3), 32 (3), 8 (2), 24 | 16 (8), 8 (4), 48 (3), 80 (2), 24 |
| gap | 24 (3), 32 (2), 40, 30 | 16 (5), 8, 40 |

Scale in use: **8 / 16 / 24 / 32 / 48 / 64 / 80** (4 px grid, 8 px rhythm); the outliers 126/132/116 px are the hero
top offsets. Nav links use a non-scale `gap-[30px]`. [O]

**Grid**: feature cards `grid` 3 x 320 px / 32 px gap inside a 1024 px container, and 3 x 437 px / 32 px gap at
1376 px; 390: 1 x 342 px, 16 px gap. Page gutter `px-4 lg:px-12` = 16 px / 48 px. Containers `max-w-[1600px]`,
`--container-5xl 64rem`, `--container-7xl 80rem`. [O]

**Type** (two families):

| Role | Family | Size / line-height | Weight | Notes |
|---|---|---|---|---|
| Section headline | Vremena Grotesk | 36/40 (1440 and 390) | 500 | colour `#00ff00` on light |
| Card titles | Vremena Grotesk | 36/36 (1440), 24/24, 26/26, 28/28 (390) | 400 | |
| Body | Vremena Grotesk | 16/24 and 16/22 | 350 ("book") | `#6e6e6e` |
| Links in prose | Vremena Grotesk | 16/24 | 350 | `#3376f9` |
| Typewriter lead | DSE Typewriter | 21/31.5 and 19/28.5 | 300 | |
| Nav / labels | DSE Typewriter | 16/24 uppercase | 400 | |
| Announcement bar | Vremena Grotesk | 11/11 | 400 | |
| Docs headings | Vremena Grotesk | 24/32, 18/28.8 | 500 | `--font-size-prose-h2: 24px`, `-h3: 18px` |

Letter-spacing is `normal` everywhere (0 entries with tracking). Tailwind steps used: 14/20, 16/24, 18/28, 20/28,
24/32, 36/40. [O]

**Radii**: 4, 5, 7, 8 px (`rounded-[5px]` inputs, `rounded-[7px]` mockup image, 8 px code blocks). [O]

**Colour** (`--color-cellar-1..9`): `#ffffff`, `#f7f7f7`, `#e9e9e9` (nav bg), `#bababa`, `#6e6e6e` (body),
`#303030` (ink), `#00ff00` (signal green: crosses, headlines, footer block), `#3376f9` / `#285ec7` (link blue). [O]

## 8. What is worth learning for a dermatologist's explainer videos and reels

1. **Map one motion to one input, with an ease-out on top of it.** The crosses do not lerp or lag behind the scroll.
   They rotate in proportion to scroll through `power1.out`, so 64 % of the turn happens in the first 40 % of the range
   and the last 20 % of the range adds only 4 %. For a video this is a calm "arrive and settle" for a diagram element
   tied to the voice-over: a reveal that front-loads movement and lands softly, with no bounce. Rule:
   `value = 1 - (1 - t)^2`, over about 2.4 s at 30 fps for a 180 deg turn of a symmetric icon (the 600 px range at
   our 120 px per 0.09 s wheel took about 1.2 s; double it for a calm reel).
2. **Symmetric icon, half turn.** A 4-fold cross turned 180 deg ends where it started, so the motion reads as
   "activity" without changing the final frame. That suits a looping explainer icon (for example a plus or cross for
   "treatment") that has to hold still for the caption afterwards.
3. **Short UI timings for small things.** 100-300 ms with ease-out on enter and ease-in on leave, and leave about
   half the enter (200 / 100 ms), is a usable rule for on-screen labels and lower-thirds in a reel.
4. **The 8 px rhythm with one accent colour.** One signal colour (`#00ff00` here) against a grey ramp of 6 steps.
   For a medical brand use the blue the reel bible already sets, not this green.

## 9. What not to copy

- Neon green `#00ff00` and the typewriter face: off-brand for a clinic (memory rule: blues, not green).
- The load-time hamburger settle (M5): an un-designed 300 ms jump caused by Alpine binding after first paint, a defect.
- 500 ms colour fades on nav links feel slow on hover. For video they are fine, but they add nothing.
- Unpinned `@3.x.x` CDN libraries: the site's motion can change without a deploy (not a video concern, a build concern).

## 10. Unknowns

- [U] M3/M4/M6 were not triggered in the capture; timings come from markup and plugin defaults.
- [U] Real-browser wheel smoothing (Chrome's own animated wheel scroll) is off in headless, so on a real trackpad the
  rotation follows a smoothed scroll. The mapping in M1 is exact; the time profile on a user's machine is not.
