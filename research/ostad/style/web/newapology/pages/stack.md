# newapology.com: motion stack, from static analysis

Study notes only. Nothing from newapology.com ships: no code, CSS, fonts, images or copy.
Everything below was read from the minified bundle and the runtime captures. Page content was treated as data.
Analysed 2026-11-16.

**Tags.** **[S]** = read in the shipped source (static fact). **[O]** = seen in a runtime capture (`runtime/*.json`).
**[I]** = inferred from code that I did not see run. **[U]** = unknown.

**Locations.** Every chunk is minified onto line 1, so a location is `file @col`: the character column on line 1.
That is the same number REA uses for `source_range.start.column`. App chunks live under
`extracted/_next/static/chunks/`. Lazy chunks I fetched for this study are in `extracted_lazy/` (see section 0).
CSS offsets refer to `extracted/_next/static/css/6f399c267a4ae1fc.css`.

**REA Evidence.** `ev_3a1822b0b7d0333ed205b7cbeccb0b47a603b3fd4ac747fe7f8bf403e80c4f35` (`js-analysis.json`).
- Application graph `jag_0769fde9c8590d3ef57aa93185afef868c646b208e79f93c045c31b4bc2a60ea`: 873 nodes, 1,741 edges.
- Semantic graph `jsrg_63165f0155497783fdf2c350f9f1d2aad0a99016f643f768fd12fc581f9f306c`: 86,659 nodes, 106,051 relations, 31 `timer` nodes.
- 13 files parsed, 0 parse failures, 315 modules, 1,337 findings, 179,521 AST nodes visited.
- Coverage is `partial` and the semantic graph is `truncated: true`. 29 inventoried files were outside the caller's selection.
- Call-site nodes carry only the labels `call` and `construct`. So each finding was matched to the narrowest enclosing
  REA **function** node by column (appendix A). Read those IDs as "the function that contains this", not as an exact call node.

---

## 0. Inventory, and what the brief's text-search got wrong

| Library or tech | Verdict | Evidence |
|---|---|---|
| **Lenis 1.3.15** | **present**, 4 kinds of instance (section 1) | `7427-…js @10499` `window.lenisVersion="1.3.15"` [S]; `<html class="lenis">` in every capture [O] |
| `lenis/react` (ReactLenis) | present | `3671-…js` module 39709 @76 [S] |
| **OGL / WebGL** | **absent** | All 5+3+1 "ogl" hits are the substring in `Google` (`HTML_LIMITED_BOT_UA_RE`, "Google Maps", "Google Material Symbols", googletagmanager) [S]. 0 `getContext`, `webgl`, `gl_Position`, `precision mediump`, `createShader` in all 13 app chunks, the 35 lazy chunks and the diffusion embed [S]. There is no shader, so there are no uniforms to report. |
| **Swiper** | **absent from JS** | 0 hits in all JS. 11 hits in the CSS only: `.swiper`, `.swiper-wrapper{transition-timing-function:linear!important}`, `.home-carousel`, `.text-carousel` (CSS @16723–30865). Nothing creates a Swiper and no class `swiper-initialized` is ever set. **Dead CSS from an earlier build** [I]. The same applies to `.fade--in` / `.in-view` (CSS @16578): no JS adds `in-view` [S]. |
| **Blossom carousel** (drag inertia for horizontal rails) | present, lazy | `extracted_lazy/5878.eaca981698a3a2ed.js`, imported from `1579-…js @6913` [S] |
| View Transitions API | present (project → project) | `4428-…js @7949` `document.startViewTransition` [S] |
| WAAPI `Element.animate` | 22 call sites in app code, plus 1 in the contact dialog | sections 3–6 [S]; 9 / 15 / 1 calls captured on home-1440 / work-1440 / x-390 [O] |
| framer-motion | **only inside the Sanity Studio / visual-editing chunk** | `extracted_lazy/7420-…js @31542` (`framerAppearId`, `@sanity/ui`). It is not loaded on public routes [I]. |
| Vimeo player | lazy, for the "Latest Project" block | `page-930638b8919afb83.js` → `n.e(1247)` [S] |
| `nap-diffusion` custom element | lazy, a single essay image | `/embeds/diffusion.v2.js` (458 KB: SVG plus an embedded Inter font; no canvas) [S] |
| Squircle clip-path ("smooth corners") | present | `3671-…js` module 98241, smoothing `A=.6` @8079; driver in `layout @28676` [S] |

**How the bundle is put together.** The webpack runtime `webpack-dbb557dc59d2210d.js` maps **35 lazy chunk ids**, and
none of them was in `extracted/`. I fetched all 35 (each returned 200) into `extracted_lazy/` to rule libraries in or out.
Of these, 26 are Sanity Studio or visual-editing. The ones that load on public pages are:
- `9316` (contact dialog, from `layout`)
- `1247` (Vimeo)
- `5878` (Blossom)
- `/embeds/diffusion.v2.js`

The REA run covered the 13 selected app chunks only. It never saw the lazy chunks.

---

## 1. Lenis: the smooth-scroll configuration

### 1a. The site's options object [S]
Module `46689` sits at `layout-4fed5579bc6a9310.js @28480` and is duplicated in `674-…js @8325`. It is shared by the
root scroller, the essay popup and (in part) the rails:

```
{ duration: 1, orientation: "vertical",
  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),   // expo-out
  smoothWheel: true, syncTouch: false, wheelMultiplier: 1.1 }
```

| Option | Value | Notes |
|---|---|---|
| `duration` | **1 s** | Each wheel event calls `scrollTo(target)` and restarts a 1 s clock from the current animated position (`7427 @18358`) [S] |
| `easing` | **`min(1, 1.001 − 2^(−10t))`**, expo-out | Peak velocity is at t=0 (6.9× linear). 99 % at **frame 40**, 99.9 % at frame 54, clamped to 1 at t=0.997 s (frame 60) [S, computed] |
| `lerp` | **not set**. The library default `0.1` is present but **unused**, because `Animate.advance` takes the duration path whenever `duration && easing` (`7427 @5383`) | [S] |
| `wheelMultiplier` | **1.1** | [S] |
| `touchMultiplier` | 1 (library default) | [S] |
| `smoothTouch` | no such option in Lenis 1.x. It is `syncTouch: false` (`syncTouchLerp` .075 and `touchInertiaExponent` 1.7 are defaults and inactive) | [S] |
| `orientation` / `gestureOrientation` | vertical / vertical | [S] |
| `prevent` | `dialog, [role=dialog], textarea, select, [contenteditable=true], .nap-notification-copy-inner` (`layout @1767`) | [S] |
| `virtualScroll` filter | `68138` (`layout @32952`). A wheel event that is horizontal-dominant, or has ctrl or shift held, goes to native scroll and any smooth scroll in flight is cut (`scrollTo(actualScroll,{immediate:true})`) | [S] |
| `autoRaf` | ReactLenis default `true` on desktop | `3671 @717` [S] |

### 1b. Which configuration runs where [S] (`layout @1615`, `SmoothScroll` component)
`options = coarsePointer ? m : (previewPath || reducedMotion || coarsePointer) ? p : b`
- **b** (desktop, fine pointer): the object above plus the virtualScroll filter.
- **p**: `{duration:0, smoothWheel:false, syncTouch:false}`. Reduced motion, or `/studio` and `/p/` preview paths.
- **m** = p plus `autoRaf:false`. **Touch devices get native scroll**, and Lenis never ticks.

[O] confirms this: rAF calls on home are **6,221 at 1440** against **122 at 390**.

### 1c. Pause and hand-off rules [S] (`layout @1615`, component `h`)
- A MutationObserver watches `html[style]` and `html[data-scroll-handoff]`. When `overflow:hidden` or `data-scroll-handoff=true`, it calls `lenis.stop()`; otherwise `start()`.
- `pointerdown` (capture) and the keys ↑ ↓ PgUp PgDn Space Home End call `Ez()`, which ends a smooth scroll on the spot.
  Clicking or keyboard scrolling never fights the 1 s tail.

### 1d. The other Lenis instances [S]
| Instance | Where | Options |
|---|---|---|
| Essay / project-article popup | `674 @12069` (module 59036) | the 1a object plus `wrapper/content` = the dialog paper, `eventsTarget`, `autoRaf:true`, `allowNestedScroll:true`, `anchors:true`. Off on mobile, reduced motion and coarse pointer. |
| Horizontal rails (essays, with `smooth:true`) | `1579 @7978` (module 82102) | `orientation/gestureOrientation:"horizontal"`, `smoothWheel:true`, `autoRaf:true`, duration 1 s and expo by **library default**. A virtualScroll that maps shift+wheel or deltaX to x. **After 160 ms with no wheel input it snaps** to the nearest child `offsetLeft` (`@8428`). Arrow keys scroll by **0.65 × clientWidth**. |
| Lenis CSS | `da6512f5b0afe8ea.css` | `.lenis.lenis-stopped{overflow:clip}`; `iframe{pointer-events:none}` while smooth |

[I] The scroll curve itself never shows up in `styleWrites`. Lenis drives `window.scrollTo`, not inline transforms, so the
expo curve above is the code's curve and was not measured.

---

## 2. Drag rails: Blossom inertia [S]
`extracted_lazy/5878.eaca981698a3a2ed.js`. It is loaded only on hover-capable, fine-pointer devices, and not under reduced motion (`1579 @6913`).
It is applied to `.nap-project-rail`, `.nap-essay-rail`, `.nap-journal-rail`, `.info-team-portraits` and `.info-mix-rail`.

| Parameter | Value |
|---|---|
| Drag threshold | 10 px of pointer travel before a drag counts and the click is swallowed. A separate rail hook flags `data-dragging` after **6 px** (`1579 @9200`) |
| Velocity | `m` is the pointer delta, decayed **×0.72 every frame**. **Doubled on release** |
| Position follow | `damp(cur, target, r, dt) = lerp by 1 − exp(dt/16.67 · ln(1−r))`, a frame-rate-independent lerp. **r = 0.72 while dragging, 0.12 while coasting** (time constant ≈ 7.8 frames) |
| Throw distance | ≈ **5.14 × release velocity** (2 × 0.72/0.28). Velocity falls to 1 % after ≈ 14 frames |
| Snap | Projected landing point = `x + v/(1−0.72)`. It snaps to the nearest `scroll-snap-align` target. The CSS sets `scroll-snap-type:x mandatory`, which Blossom turns off on fine pointers and re-applies when idle (CSS @46248–46640) |
| Rubber-band overscroll | displacement **0.2 ×** overshoot while dragging, eased back with r = 0.12. Written as an inline `transform:translateX()` on the rail |

---

## 3. Page entry and scroll reveals (IntersectionObserver)

| # | Effect | Trigger (IO options) | Motion | Stagger | Location |
|---|---|---|---|---|---|
| R1 | **Page section reveal** (every route) | IO `threshold .01, rootMargin "0px 0px -30px 0px"` [S][O] | `[data-page-reveal=waiting]{opacity:0; translateY(12px)}` → `nap-page-enter` **600 ms `cubic-bezier(.22,1,.36,1)`** | Visible entries sorted by `top`. `--page-reveal-delay = min(85·i, 425) ms` | JS `layout @3395`; CSS @170275–170368 |
| R2 | Case-study heading cascade | mount, no IO | `.case-reveal` → `case-arrive` 600 ms, same ease, `opacity 0→1, translateY(12px→0)` | `--case-delay = 85 ms × index` (title 0, caption 1, link 2, tags 3…, hero, intro) [S]. [O] work__auro: delays 0, 85, … | `page-f72… @21314`; CSS @87555 |
| R3 | Case gallery items and credits | IO `rootMargin "0px 0px -30px 0px", threshold .01`, unobserved after the first hit | `.case-has-reveal … :not([data-in-view])`: `opacity 0, translateY(20px)`. Transitions are **opacity 500 ms ease, transform 600 ms (.22,1,.36,1)** | none | `page-f72… @22274`; CSS @87901 |
| R4 | Index cards (`/work`, journal) | mount (after one rAF sets `data-entered`) | `nap-index-in` 600 ms (.22,1,.36,1), `opacity 0, translateY(−7px) → none` | `--index-delay = min(85·n, 1020) ms` | `page-f964… @19788, @12331`; CSS @94939 |
| R5 | Footer wordmark letters | IO **threshold .35** | `.nap-footer-letter`: `opacity .2s, transform .4s var(--nap-ease)`, starting from `translateY(5px)` | `--letter-delay` per letter | `2273 @8728`; CSS @20042 |
| R6 | Media lazy-play | IO **rootMargin 120px** (16 instances per page [O]) | `.nap-media-loading` palette-colour veil fades `opacity .32s (.22,1,.36,1)` once the first frame is painted (`requestVideoFrameCallback`) | none | `674 @11018`; CSS @72681 |
| R7 | Testimonial autoplay gate | IO `rootMargin "-35vh 0px -35vh 0px"` (observed −315 px at 900 h [O]). Advances every **6000 ms** only while centred | entry `nap-index-in` 600 ms, attribution +300 ms | none | `page-930638… @16875, @16786` |
| R8 | Capabilities autoplay gate | IO **threshold .35**. `setInterval` **3500 ms** | section 5 | none | `page-930638… @21843, @22054` |
| R9 | Next-project prefetch | IO **rootMargin 1600px** | none (`router.prefetch`) | none | `page-f72… @13136` |
| R10 | Sticky project tag | IO `threshold [0,1]`, visible once the offerings row is above the top | `case-sticky` slot | none | `page-f72… @21990` |
| R11 | Footer-near flag | IO `rootMargin "0px 0px 120px 0px"` on `.nap-footer`, `.case-next` | hides docked controls | none | `4428 @1332` |
| R12 | Journal media | IO `threshold [0,.25]`, plays at ≥25 % | none | none | `9768 @11377` |
| R13 | Diffusion chart | IO **threshold .15**, waits for the font | `rAF`-driven draw over **1600 ms, easeInOutQuad** (peak velocity at 50 %, frame 90 of 96 reaches 99 %) | none | `diffusion.v2.js` line 316 |

Reduced motion: R1 sets `[data-page-reveal]{animation:none!important; opacity:1}`. The CSS has 52 `prefers-reduced-motion` blocks [S].

---

## 4. Page transitions: project → project [S]
Context provider `80058` at `4428-…js @1800`. Constants are `11206 @138`: **reveal 900 ms, transition 1100 ms, ease `cubic-bezier(.66,0,.25,1)`**.

**What triggers a transition.** Only the **Next Project** block at the bottom of a case study:
- a click, or
- a **pull past the end of the page** (section 4b).

The cards on `/work` do *not* use it. Their click is an eye "blink" (`nap-eye-blink` 200 ms), then `router.push` after **200 ms** (`page-f964… @19647`).
This explains why no view transition shows up in the `/work` click capture [O].

**Mode selection** (`@7949`). The mode is written to `html[data-project-transition-mode]`:
1. **`native`**: when `document.startViewTransition` exists, reduced motion is off, the tab is visible, and width ≥ 768.
   - The cover gets `view-transition-name: nap-project-cover`, the title gets `nap-project-title`, and `router.push(…,{scroll:false})` runs inside the transition.
   - CSS (@247529–248786):
     - group `nap-project-cover`: **1.1 s `cubic-bezier(.66,0,.25,1)`**, `overflow:hidden`. Old snapshot `opacity:0`, new `object-fit:cover`. The image-pair animates `border-radius` from `--nap-transition-start-radius` (19 px) to `--nap-transition-end-radius` (5 px), on the same curve.
     - group `nap-project-title`: 1.1 s, same curve.
     - root old: `case-root-out` **200 ms** fade. Root new: no animation.
     - reduced motion: `::view-transition-group(*){animation-duration:.01ms}`.
2. **`shared-cover`** (no View Transitions, or mobile): the cover and title are cloned to `position:fixed` and FLIPped with WAAPI:
   - `translate(dx,dy) scale(sx,sy)` plus `borderRadius`, **1100 ms (.66,0,.25,1) fill forwards** (`@8105`). The title gets the same treatment (`@8594`).
   - The clones are removed two rAFs after the destination is ready. The destination image is awaited up to **600 ms** (`decode()` race).
3. **`reduced`**: plain navigation.

**Mobile extra.** The sticky project tag is cloned and dropped off-screen: `translateY(innerHeight − top + 12)`, **320 ms `cubic-bezier(.55,0,.8,.45)`** (`@6242`).

**Scroll hand-off.** During the transition, wheel, touchmove and nav keys are swallowed. The scroll is pinned at 0 (`data-scroll-handoff=true`, which also stops Lenis). It is released 160 ms after finish *and* 240 ms after the last input. Safety timeout: **5000 ms**.

**Curve (.66,0,.25,1) at 1100 ms.** Slow start, peak velocity at **46 % (505 ms)**, 3.4× linear. 99 % at frame 59, 99.9 % at frame 64 of 66. No overshoot [computed].

### 4b. Pull-to-next state machine [S] (`11206 @76`, used at `page-f72… @13569`)
States: `hidden → revealing → ready → pulling → leaving`, plus `hiding`.
- **Arrive.** When the page is ≤ 160 px from the bottom, the reveal plays. `case-next__reveal` runs two animations:
  - `case-next-rise` (translate 180 px → 0) over **0.78 × 900 = 702 ms `(.22,.7,.25,1)`**;
  - `case-next-grow` (scale `--next-initial-scale` → 1) over **0.64 × 900 = 576 ms**, delayed **126 ms**, `(.3,0,.2,1)`.
  
  The heading label then fades in over **198 ms**, delayed **702 ms** (CSS @85832–86114).
  `--next-initial-scale` = heading width / section width, or **0.78 on mobile** (`@13966`).
- **Retreat.** Above 220 px from the bottom, the same CSS animations are **played backwards** (`playbackRate −1`) from their current time.
- **Pull.** When within **3 px of the bottom**, wheel and touch deltas add to `pull`, clamped **0..60**. `--next-pull` moves the link up `−1 px × pull`.
  - `pull = 60` → `leaving` → transition.
  - A new pull needs a gap of ≥ **360 ms** since the last input (stops one trackpad flick from both scrolling to the bottom and leaving).
  - Keys: ↓ adds 20, PgDn and Space add 60.

---

## 5. Every WAAPI `element.animate()` routine [S] (with [O] where captured)

| # | Element / trigger | Keyframes | Duration · easing · delay · fill | Location |
|---|---|---|---|---|
| A1 | **Home reel → project rail morph** (reel `ended`, or the "Explore projects" button) | `{width,height of reel, translate(dx,dy)}` → `{card w,h, translate(0,0)}` | **700 ms `(.22,1,.36,1)`**, forwards. [O] home-1440 @23215 ms: 878×549 → 336 w | `page-930638… @6986` |
| A2 | Rest of the rail cards during the morph | CSS: `opacity 0, translateY(−20px)` → none, via transition `.55s var(--nap-ease)` | delay `120 + 700·(n−1)/(count−2)` ms | `@5657`; CSS @49195–49349 |
| A3 | Project pointer label swap (hover moves to a new card) | old: `opacity 1→0, translateY(0→−5px), blur(0→2px)`; new: `opacity 0→1, translateY(5px→0), blur(2px→0)` | **180 ms ease-out** / **260 ms (.22,1,.36,1)**. [O] 4 swaps on home | `1579 @2347, @2508` |
| A4 | Project pointer follow | inline `transform: translate3d(x,y,0)` in a rAF, **no smoothing** (raw cursor) | per frame. [O] 45 writes on `div.nap-project-pointer` | `1579 @3541` |
| A5 | Header-actions width (mobile, when the panel changes) | `width: old → new` | **`--nap-control-ms` 550 · `--nap-control-ease` (.6,0,.25,1)**. [O] 390: 32 → 174 px | `layout @12103` |
| A6 | Essay / article close, fullscreen mode | each visible element: `{current opacity, transform}` → `{0, translateY(−10px)}`, **reverse order** | **240 ms `(.4,0,.7,.2)`**, stagger **35 ms**, cap 140 ms | `674 @20842` |
| A7 | Essay tint close | `backgroundColor → transparent` | **330 ms (.4,0,.7,.2)**, delay 240 + min((n−1)·35, 140) | `674 @21072` |
| A8 | Essay close, panel mode | `transform → translateY(100dvh)` | **420 ms (.4,0,.7,.2)** | `674 @21365` |
| A9 | Send-message icon "paper plane" | `translate(0,0) rotate(0)` → **@0.55** `translate(75px,−12px) rotate(12deg) opacity 0` → **@0.56** `translate(−25px,5px) rotate(−8deg) opacity 0` → home | **650 ms (.22,1,.36,1)** | `page-930638… @2962` |
| A10 | Capability card press | `transform → scale(.99)` | **140 ms (.3,0,.2,1)**, forwards | `@20161` |
| A11 | Capability release (cancelled) | `→ scale(1)` | **220 ms (.22,1,.36,1)** | `@20475` |
| A12 | Capability settle after the swap | `scale(.99) → scale(1)` | **520 ms (.16,1,.3,1)** | `@21235` |
| A13 | `/work` filter: heading height | `height: old → new` | **480 ms (.22,1,.36,1)**. [O] 43 → 89 px | `page-f964… @13336` |
| A14 | `/work` filter: FLIP of persisting words / pills | `translate(dx,dy)[ scale]` → `translate(0,0)`, origin 0 0 | **480 ms (.22,1,.36,1)**. [O] dx 344 px | `@13643` |
| A15 | `/work` filter: new pills, desktop | `opacity 0, translateX(−8px)` → in | **280 ms**, delay **40 + 28·i**, fill backwards. [O] delays 96, 124, 152 … 264 (i = 2..8) | `@14036` |
| A16 | `/work` filter: new pills, mobile | `opacity 0, translateY(−6px)` → in | **320 ms**, delay **70 + 25·i** | `@13877` |
| A17 | Index grid filter swap | CSS `nap-index-out` **180 ms (.4,0,1,1)**, `--exit-delay = min(25n, 300)`. The JS waits `180 + min((n−1)·25, 300)` ms, then remounts with `nap-index-in` | none | `@16934`; CSS @95097 |
| A18 | Shared-cover FLIP (cover, title) | section 4 | 1100 ms (.66,0,.25,1) | `4428 @8105, @8594` |
| A19 | Mobile sticky-tag drop | section 4 | 320 ms (.55,0,.8,.45) | `4428 @6242` |
| A20 | Contact dialog close | `{opacity, transform}` → `{0, translateY(3px) scale(.99)}` | **160 ms (.23,1,.32,1)** | `extracted_lazy/9316… @12514` |

**rAF loops** [S]:
- Lenis × up to 3 (root, plus 2 rails on home).
- Blossom (only while dragging or coasting).
- Pointer follow (A4).
- `6734 @8034`: mix-player progress, `currentTime / duration` every frame while playing.
- Diffusion draw (R13).
- One-shot rAF debouncers for layout measurement: hanging punctuation `layout @26816`, smooth-corner recompute `layout @28676`, page-reveal re-scan `layout @3395`.

---

## 6. Class / attribute toggles that drive CSS motion [S]

**Tokens** (`:root`):
- `--nap-ease: cubic-bezier(.22,1,.36,1)` (CSS @43012)
- `--nap-expand-time: .38s`, `--nap-expand-ease: cubic-bezier(.3,0,.2,1)` (@6)
- `--nap-control-ms: 550` → `--nap-control-time`, `--nap-control-ease: cubic-bezier(.6,0,.25,1)` (@144136)

**Transitions.** The CSS has **180 transition declarations**. The most common durations are .2s (32), .5s (28), .3s / .28s (21 each) and .18s (20).
The most common easings are `ease` (88), `var(--nap-ease)` (77) and the expand/control tokens (18 / 13).

| Toggle | Set by | CSS response |
|---|---|---|
| `.nap-showcase.is-reel → is-morphing → is-projects` (and `is-returning` when it is not the first visit) | `page-930638…` module 37299 | rail cards fade or rise (A2). On a repeat visit the cards play `nap-index-in` 600 ms (CSS @49472) |
| `.nap-capabilities[data-transitioning]` + `.is-current` / `.is-previous` | capability swap. `previous` clears after **640 ms** (`@22365`) | current layer `nap-capability-reveal` (opacity 0→1, **scale 1.025→1**) **640 ms `(.2,.65,.25,1)`**; previous `nap-capability-recede` (scale 1→1.012); label `nap-capability-label-in` 440 ms +100 ms; old label out 180 ms ease-out (CSS @73292–74072) |
| Dice cursor | each swap rolls a random face. `turn += 2..4` full turns, `angle ±8°` (at least 3° away from the last). Inline `transform: rotate(360·turn + angle)` | `.nap-die{transition: transform .65s cubic-bezier(.18,.8,.25,1)}`: 2–4.x turns in 650 ms, decelerating, no overshoot. Pips morph via `cx/cy/r .32s ease-in-out` (CSS @233372–233487) |
| `.nap-essay-dialog[data-presentation=screen] [data-essay-enter]` | `674 @23875` | `nap-essay-element-in` **400 ms var(--nap-ease)**, `opacity 0, translateY(−10px) → none`. Delay = **max(0, 330 − elapsed) + min(45·i, 540) ms**. Tint `nap-essay-tint-in` 330 ms. Panel mode: `nap-dialog-in` translateY(100dvh → 0) **550 ms var(--nap-ease)** |
| `.case-next[data-phase]` + `--next-pull` | section 4b | section 4b |
| `[data-cursor-visible]`, `--cursor-x/y` | cursor hook `674 @4129` (rAF per pointermove) | follow-cursor pills (testimonial arrows, play/pause, close, eye) |
| `.nap-project-pointer[data-cursor-icon=book][data-activating]` | essay click: **280 ms** delay before opening (`1579 @595`) | `nap-book-topple-left/right` **280 ms linear**, keyframes 0 / 18 / 35 / 58 / 82 / 100 % to −76° / −38° |
| `.info-headline-phrase.is-entering / is-exiting` (About page) | not located in the 13 chunks [U] | words in **550 ms (.22,1,.36,1)**, delay `300 ms + --headline-word-delay`, `translateY(.5em) blur(4px)` → none; out 220 ms (.4,0,1,1), `−.35em blur(3px)` |
| `.screen--saver.active` | **60 s with no mouse move** on width ≥ 768 (`layout @6923`) | `opacity .3s ease`; a full-screen `<dialog>` with an SVG |
| `[data-smooth-corners]`, `--nap-smooth-corner-clip` | `layout @28676`. Recomputed on transition/animation run and end | `clip-path: path(evenodd …)` squircle, smoothing **0.6** |
| `[data-hanging-start]`, `--nap-hanging-start` | `layout @26816` | hanging opening punctuation, using the measured glyph width |
| Header "Work with us" pill | width measured into `--work-with-us-expanded-width`, label states default → email → copied (copied resets after **1000 ms**) | `width var(--nap-expand-time) var(--nap-expand-ease)` = 380 ms (.3,0,.2,1) |

---

## 7. CSS @keyframes: complete list (33) [S]
All are in `6f399c267a4ae1fc.css`. Durations come from the rule that uses each keyframe.

| Keyframes | Content | Used at |
|---|---|---|
| `nap-rise` @65146 | opacity 0, Y 8px → none | testimonial copy 450 ms, team caption 300 ms |
| `nap-word-in` @65234 | opacity 0, Y .18em → none | quote words 200 ms + `--word-delay` |
| `nap-wheel` / `nap-wheel-out` @65327/65417 | Y ±18px with fade | capability name 550 ms (superseded by the label-in/out pair below) |
| `nap-dialog-in` @65512 | Y 100dvh → 0 | essay panel 550 ms |
| `nap-capability-reveal` / `-recede` @73785/73887 | scale 1.025 → 1 with fade / 1 → 1.012 | 640 ms (.2,.65,.25,1) |
| `nap-capability-label-in/out` @73969/74072 | Y ±8px with fade | 440 ms +100 ms / 180 ms |
| `case-next-rise` @87094 | `translate: 0 180px → 0` | 702 ms |
| `case-next-grow` @87159 | `scale: var(--next-initial-scale) → 1` | 576 ms +126 ms |
| `case-next-label` @87232 | Y 8px with fade | 198 ms +702 ms |
| `case-arrive` @88110 | Y 12px with fade | 600 ms + `--case-delay` |
| `nap-eye-blink` @96512 | scaleY 1 → .08 (45–55 %) → 1 | 200 ms ease-in-out |
| `nap-index-in` / `nap-index-out` @96942/97035 | Y −7px → none / none → Y 7px | 600 ms / 180 ms |
| `nap-index-page-in` @97128 | opacity | 350 ms ease-out |
| `info-headline-in/out` @101034/101163, `info-headline-disappear` @244014 | Y .5em plus blur 4px | 550 / 220 ms |
| `info-office-preview-pop` @117182 | scale 1 → .92 (22 %) → **1.045 (58 %)** → 1 | 540 ms var(--nap-ease). **The site's only overshoot keyframe** |
| `info-office-photo-in` @119120 | opacity | 140–180 ms |
| `nap-page-enter` @170483 | Y 12px with fade | 600 ms + `--page-reveal-delay` |
| `nap-essay-tint-in` @175364 | bg transparent → | 330 ms |
| `nap-essay-element-in` @175606 | Y −10px with fade | 400 ms |
| `nap-contact-popup-in` / `-panel-in` / `-content-in` / `-shell-in` @192436–192708 | fade; Y 4px scale .99; Y 4px; Y −7px | 320 ms ease / 240 ms (.23,1,.32,1) / 240 ms / 500 ms +420 ms |
| `nap-book-topple-right/left` @201164/201367 | rotation curves | 280 ms linear |
| `nap-project-rounding` @247904 | border-radius start → end radius | 1.1 s (.66,0,.25,1), the view-transition image-pair |
| `case-root-out` @248682 | → opacity 0 | 200 ms, old root of the view transition |

Smaller CSS files: `4f2ccfd2…css` (376 B) holds the diffusion-block CSS module; `da6512f5…css` (380 B) holds the Lenis CSS. Neither has keyframes.

---

## 8. Easing catalogue (computed from the bezier values at 60 fps) [S + computed]
"Frames" counts until progress reaches 99 % / 99.9 % of the move. **No bezier the site uses overshoots** (every y control point is in [0,1]).
The only overshoot is the keyframed `info-office-preview-pop`.

| Curve | Where | Peak velocity | Example: 99 % / 99.9 % frame |
|---|---|---|---|
| `(.22,1,.36,1)` = `--nap-ease` (≈ easeOutQuint) | default: reveals, morph, filter, pointer | t=0, 4.5× linear | 600 ms: 24 / 30 of 36; 700 ms: 28 / 35 of 42 |
| `(.66,0,.25,1)` | project transition, pull reveal | 46 % (505 ms of 1100) | 59 / 64 of 66 |
| `(.6,0,.25,1)` = control | header width | 43 % | 550 ms: 29 / 32 of 33 |
| `(.3,0,.2,1)` = expand | pill widths, card press, `case-next-grow` | 24 % | 380 ms: 20 / 22 of 23 |
| `(.4,0,.7,.2)` | essay close (ease-in, exit) | 100 % (end) | 240 ms: 15 of 15 |
| `(.55,0,.8,.45)` | mobile sticky drop | 100 % | 320 ms: 20 of 20 |
| `(.2,.65,.25,1)` | capability layer swap | 4 % | 640 ms: 31 / 36 of 39 |
| `(.16,1,.3,1)` | capability settle | t=0, 6.2× | 520 ms: 20 / 26 of 32 |
| `(.23,1,.32,1)` | contact panel / close | t=0, 4.4× | 240 ms: 10 / 12 of 15 |
| `(.22,.7,.25,1)` | `case-next-rise` | 5 % | 702 ms: 34 / 40 of 43 |
| `(.4,0,1,1)` | index-out, headline-out | 100 % | 180 ms: 11 of 11 |
| Lenis expo `min(1, 1.001 − 2^(−10t))` | wheel scroll, 1 s | t=0, 6.9× | 40 / 54 of 60 |
| easeInOutQuad | diffusion chart, 1600 ms | 50 % | 90 of 96 |

---

## 9. Timers worth knowing (REA `timer` nodes; delay read by REA) [S]
| Delay | Purpose | REA timer node |
|---|---|---|
| 60000 ms | screensaver idle | `jsrg_node_26fdd492a5015c9694c7…` (layout @6887) |
| 6000 ms | testimonial advance | `jsrg_node_92864dd199443349945b…` (page @16615) |
| 3500 ms (setInterval) | capability autoplay | `jsrg_node_c2f9724a679cbe4fae53…` (page @22054) |
| 640 ms | capability `previous` clear | `jsrg_node_234fc5817f320fc3ea92…` (page @22307) |
| 5000 ms | transition safety | `jsrg_node_4d9295d4af7a005da6e1…` (4428 @7687) |
| 600 ms | destination image decode race | `jsrg_node_c923ee38d921ccbf31e8…` (4428 @2898) |
| 60 ms | scroll hand-off release poll | `jsrg_node_6c54b0b81945d9534b3d…` (4428 @5148) |
| 280 ms | book-topple, then open the essay | `jsrg_node_b3bc54c3a2dda92f98c1…` (1579 @553) |
| 160 / 120 ms | pointer hide delay / gap tolerance between cards | `jsrg_node_9780d47b40a3c28ed99e…` / `jsrg_node_3fe8e1817dcdb10ae499…` |
| 200 ms | eye blink, then navigate | `jsrg_node_89213f203c324daea923…` (work @20371) |
| 1800 ms | preview-status toasts (font, icons, essay mode) | `jsrg_node_351ffa4e…`, `jsrg_node_656bd773…`, `jsrg_node_9d5b6816…` |

---

## 10. Unknowns and limits
- [U] The actual scroll curve under Lenis was not measured, because it produces no inline style writes. A capture of `window.scrollY` per rAF during a wheel tick would confirm the expo-out over 1 s and the ×1.1 multiplier.
- [U] The View Transition path did not run in any capture. The `/work` click uses a blink and push, not the transition. Driving a `case-next` click at 1440 would show it.
- [U] The About-page headline toggle (`info-headline-phrase`) and the office preview swap live in a module that is not among the 13 analysed chunks. The CSS side is known.
- [I] Swiper, `.fade--in` and `.text-carousel` CSS are legacy: present in CSS, never activated by JS.
- REA coverage is partial and the graph is truncated. Lazy chunks were outside REA. Their findings above come from reading the text directly.

---

## Appendix A: REA function nodes enclosing each finding
Evidence `ev_3a1822b0…4f35`, semantic graph `jsrg_63165f01…306c`. "Fn node" = the narrowest enclosing `function` node at that column.

| Finding | File @col | Fn node |
|---|---|---|
| Lenis options (46689) | layout @28534 | `jsrg_node_bd26e11ecab72cbdbd0eb74ec387e8ee3d90c63b2d3b9075ee1ffb8053e546ac` |
| Page-reveal IO (R1) | layout @3395 | `jsrg_node_9a0f738bfc2222ee63471dd12a25d98d1f409aa305fa442837246cc3c8801779` |
| ReactLenis root, options switch | layout @4649 | `jsrg_node_036b1cd5abe94045b0306f5c6ce0c3ac86db8a9c187a18e031038c446ca44909` |
| Header width animate (A5) | layout @12103 | `jsrg_node_720604d900de49c46b559bf09c4b967af0fbeee10fefc4561c80f9d09044e299` |
| Essay close elements (A6) | 674 @20842 | `jsrg_node_4b22114dd76bc89daaebae7c1577e3421766558c459a7ca27bcfade19d98b3b9` |
| Essay tint / panel close (A7, A8) | 674 @21072 / @21365 | `jsrg_node_65d30c13e6dd01c2c8a9e98c71e26df03b3698bc409febd75238686ad3f76c32` |
| Popup Lenis | 674 @12471 | `jsrg_node_e5cf918d347bfba9c63de8ce42421d3b11137eebb9f0f7a5c9e532001fdf1bde` |
| Media IO 120px (R6) | 674 @11018 | `jsrg_node_435aa9d60cb0611be592436aa64f3369447c53ed216d90c8dc1573b381510ccf` |
| Reel morph (A1) | page @6986 | `jsrg_node_cfc72c462d516470708c7e3702284e8b1a1a66b95858c2eaef4836894be41787` |
| Send icon (A9) | page @2962 | `jsrg_node_07ff48f88a2c09b21e909dcb19b158830e4a4f022346b48ea914481beaa8347d` |
| Capability press / release / settle (A10–A12) | page @20161 / @20475 / @21235 | `jsrg_node_b94da5b11f1c7049361b5c1aff191330734989bd585dfe6d95a257371308b0be`, `jsrg_node_40958ae22038db5fbddb483fe3e5967c59261f1d3ce534d2c91b2a50379876ed`, `jsrg_node_8311b8c6a3432f53887546e114473430eb17d126d4bf225a1d6d18f031602e09` |
| Capability IO .35 / interval (R8) | page @21843 / @22054 | `jsrg_node_336833c17e34bdff301c3a8cf88d8491b7750afcfc0e632d2d2a7c3e316f69b7` / `jsrg_node_3e617eb8e7957f21809f9b37fcf13b59b4c83abe41952e23258a1cb956f55b60` |
| Testimonial IO (R7) | page @16875 | `jsrg_node_4891f7ec317da236cb449151973a68575223f639d0ec560c6de923b3beba5326` |
| Pointer label swap and follow (A3, A4) | 1579 @2347 / @2508 / @3541 | `jsrg_node_d6a59fd168f7283eb542b8cf672f0644179b8042e6fb6f8e8fdefbe482839134` |
| Rail Lenis + snap | 1579 @7978 | `jsrg_node_fc854ee26e06694d07a632a619c2ee1389fa96f420936822b5195780980b89a6` |
| startViewTransition + FLIP fallback (sec. 4) | 4428 @7949 / @8105 / @8594 | `jsrg_node_4e55a412e4917e30ec49d74475da30a0aab3c81ba3f55a7226a8d9c386de9c4d` |
| Sticky exit (A19) | 4428 @6242 | `jsrg_node_2d2e2a6c9fe57446f2831a9fbf440a600f452360b212c9ea8670885008f99eb0` |
| Footer-near IO (R11) | 4428 @1332 | `jsrg_node_ba5dfbabb5fbc3e44e8b9be579191e6d856889f5dd8077e5a359306f1db40aba` |
| Filter height (A13) | work @13336 | `jsrg_node_5aa677f995b2e468b70ecb99ac84b916b24847746e1f8d93b2b5f03c931a4685` |
| Filter FLIP / new pills (A14–A16) | work @13643 / @13877 / @14036 | `jsrg_node_ab5610030947f242efcbd740c4b1a5241f20a30d9f4a014f83e6253355a86189` |
| Next prefetch IO (R9) | slug @13136 | `jsrg_node_6c3f9a90d91ef813a9e83e42944a13484aa08326cad80a574b96e126cc4b7e22` |
| Pull-to-next listeners (4b) | slug @16444 | `jsrg_node_fb04d3eee38e81b6a366ef812b0be0018710c8b8346acae738327895ee0443a0` |
| Sticky IO (R10) | slug @21990 | `jsrg_node_8ef9850ee937c0368a8537cc31d2f3d01417334a1e6ff26b494992dc538f99fc` |
| Gallery reveal IO (R3) | slug @22274 | `jsrg_node_91b74a50688a38e6e804c3dac96cdee31a503fba25080025e8180a818a79867a` |
| Footer wordmark IO (R5) | 2273 @8661 | `jsrg_node_359a0645f2b6180672b29a369ec43efa3cd454d0a773a73deadb75b81518c459` |
| Lenis constructor | 7427 @10478 | `jsrg_node_e69462db8a9ca4830f4f2c3cce7365b2e6acdfa7f7b062f7817de1bd2fc6309f` |
| Lenis `Animate.advance` | 7427 @5383 | `jsrg_node_2bfb46ce05c097797c26ad9d39a9ad90a9160d158168b3a54131a7391536f919` |
| ReactLenis `new Lenis` | 3671 @717 | `jsrg_node_d0a06e128598584a11fb3eff659255893fc7bcccc3445dfe98b9a062496a704f` |

File key:
- layout = `app/layout-4fed5579bc6a9310.js`
- page = `app/page-930638b8919afb83.js`
- work = `app/work/page-f964758853017c38.js`
- slug = `app/work/%5Bslug%5D/page-f72fca6efa960802.js`
- 674 / 1579 / 2273 / 3671 / 4428 / 7427 = the numbered chunks in `chunks/`
