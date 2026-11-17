# Usage audit: established devices and tools in ExoMind YouTube v6

Planned (2026-11-17, from `beats.json`) for EXOMIND_REDO §3 "Use what we established".
- The **Where (planned)** column holds composition seconds / frames at 24 fps on the 1.15× edit.
- The builder fills **Where (confirmed)** after the render, from the rendered frames, and states any difference from the plan.
- An empty cell needs a real reason, so every "not used" row gives one.

## A. The list EXOMIND_REDO §3 names

| # | Established device / tool | Source in the repo | Where (planned) | Where (confirmed) | Note |
|---|---|---|---|---|---|
| 1 | Rule book: camera numbers (lock the camera; graphic layers drift / zoom in / hold / zoom out; out 1.9× slower than in) | `brand/motion/RULES.md` | Every image layer moves for its whole span. Pushes: B04 1.00→1.04, B08 1.00→1.06, B11 1.00→1.05, B12 1.00→1.06 (3 depth rates), B13 1.00→1.03, B14 1.00→1.04. B20 pulls back 1.06→1.00. His footage is never digitally zoomed | | Checked by `lint_compositions.py --static-image` on the render |
| 2 | Rule book: easing tokens (`arrive` 14 f / 16 px, `exit` 7 f, `sweep`, `plate`, `morph`, `swap`) | `research/ostad/style/MOTION.md` §2, `library/motion.ts` | Cards `arrive` (all beats). `plate` B02 f106 / f125, B16 f1601. `morph` B04 f314 / f386. `sweep`: B07 f667 / f733, B08 f806, B12 f1198, B14 f1380, B15 f1490, B18 f1812, B19 f1939. `exit` 7 f at every beat end | | No easeOutBack. `settle` (48 f) on no word-tied line |
| 3 | Rule book: pacing (a new object every 2–4 s; 1.1–1.2× speed) | MOTION.md, memory `ostad-reel-direction` | 1.15×; 20 beats, mean 4.3 s; timed events every 1.1–2 s inside each beat | | Gentle cuts; hard cuts only into and out of B12, B18 |
| 4 | Captions composition with word timings | `OstadYT.tsx YTCaptions`, `components/Captions.tsx`; DEC 14d r8 | 0–87.1 s, every word cut on at its onset (`type-caption-word`); keywords blue per TRANSLATION row 22. Never hidden: section cards and full-bleed crops stop above the caption band | | `yt_words.json` timings |
| 5 | Lower third / name card | `components/NameCard.tsx` (`name-super`) | B01 · 1.08–4.08 s · f26–98 | | Liquid glass with its light sweep |
| 6 | Glass chip | `devices/Markup.tsx Chip`, `components/Glass.tsx` | B02 f150 (FDA chip ⚠), B04 f341 "In our office", B12 f1207 session label, B18 f1826 "Neural connectivity", B19 f1853 "SYNAPSE" | | Chips sit on headed arrows or alone, never on a dot leader |
| 7 | Contrast pairs (palette pairs that pass AA) | `brand/SPEC.md` colour, `brand/kit/tokens.json` | Every type-on-ground pair: navy/ink on cream and white glass; white on the MOA navy (B18); white on IMG_3714 with a 0.35 scrim under the timeline (B12) | | The builder measures contrast on the key frames |
| 8 | SFX at graphic entries, aligned per M19 | `public/sfx` (card / swish / pop / no / yes); MOTION.md M19 | One hero sound per beat (`beats.json sfx_hero`): B01 f3 swish, B02 f125 pop, B03 f188 swish, B04 f314 swish, B05 f460 pop, B06 f582 pop, B07 f733 yes, B08 f806 swish, B09 f933 pop, B10 f1022 pop, B11 f1158 pop, B12 f1181 swish, B13 f1300 swish, B14 f1380 swish, B15 f1490 swish, B16 f1655 swish, B17 f1776 pop, B18 f1812 swish, B19 f1877 pop, B20 f2045 swish | | M19: per-graphic SFX is not evidenced (60 % vs 59 % chance), so one per hero reveal; voice ≥ 8 LU over |
| 9 | The LUT | `brand/kit/treatment.cube` | **Not used.** | | Client rule `grade: false` (DEC 14d; rosacea had none either). A skin doctor's skin stays true, and the BTL imagery is shown as delivered |
| 10 | Condition-image / bank treatment (real photo, credit, plate then picture) | `components/SkinCard.tsx`, the bank method | The practice's ExoMind bank instead of condition photos: IMG_3712 (B03 f160, B13 f1288), IMG_3714 (B12 f1181), the Nov 5 consult (B04 f293). BTL bank: B02, B03, B13, B16, B20. Credit line under each | | No skin-condition image: ExoMind makes no skin claim, so a lesion photo would imply one. `SkinCard` itself is not reused (rule 2) |
| 11 | Markup overlay (ring the exact spot) | `devices/Markup.tsx` (Ring, Mark, Brackets, Flow) | The method is used, the component is not: the circle on the calendar slot (B07 · 30.54 s · f733), the zoom box on the cheek (B20 · 85.21 s · f2045) | | `Markup.Ring`'s leader and `Pin` are dot-and-line callouts (banned; the lint fails them). The ring draws without a tip dot. It sits on images, never on his face |
| 12 | GLP-1-style pop-up | glp1 ref (`yhPRJ-dWP80`), `phone-message-arrives` | B06 · 22.81 s · f547: the glass phone message, timed from glp1 f860–950 (plate 4 f, lines 5–6 f apart, status chip spinner → tick) | | The *timing* and method are borrowed; the graphic is new (rule 2) |
| 13 | Phone mockup | `components/Exo.tsx Phone` (the sleep-trend phone) | B06–B07 · 22.81–31.21 s · f547–750: a new glass phone (message arrives, reply, arc to the calendar) | | `Exo.tsx Phone` is not reused: it belongs to the vertical reel and shows a sleep trend |
| 14 | The gold-pick shot for EXOMIND (k4lEDTVCb0U 0:56) | `research/ostad/refs/motion/exomind/k4lEDTVCb0U.mp4`, `refs/shots/exomind.md` | B17 · 72.50–75.42 s · f1740–1810: the coil lands on a glass head and the field shows under it, rebuilt from GOLD f1325–1475 in our palette. Its neuron-signal idea (GOLD f1250–1312) feeds B18 on the MOA film | | The BTL gold-pick video itself isn't placed on screen: the MOA film is the licensed copy of the same imagery |

## B. Other established components and tools

| # | Device / tool | Where (planned) | Where (confirmed) | Note |
|---|---|---|---|---|
| 15 | Head track (`devices/track.ts`: `follow`, `faceSafeRect`, `intersects`) | B01 f3 (wordmark under the crown), B03 f188 (arrow tail on `headTop`), B16 f1655 (ribbon orbit above `glabella`); `faceSafeRect` on every overlay in every frame | | Verify after the build: tip error median < 6 px, p95 < 15 px; face overlap 0 frames |
| 16 | `library/Highlighter.tsx` (L01/L02) | Highlight mode: B06 f637, B08 f806, B16 f1655. Karaoke / ghost-to-lit: B03 f160–238, B19 f1900–1961 | | |
| 17 | `library/RollingLabel.tsx` (L05) | **Not used.** | | Nothing in this script advances a value in place. A rolling session count would invent a number |
| 18 | `library/TraceOnFootage.tsx` (L03) | B18 · 75.50 s · f1812 (route trace on the MOA film; it gets a real head, from the new `Arrow.tsx` path variant) | | Its ring-and-path look without a head is not used |
| 19 | `components/Glass.tsx` (material) | B05 panels, B06 phone, B09 Q&A panel, B19 synapse panel, end card | | |
| 20 | `components/Hook.tsx` (title) | **Not used as is.** B01's wordmark-depth title replaces it (TRANSLATION row 1) | | Hook is the rosacea title graphic (rule 2) |
| 21 | `components/SkinCard.tsx` | **Not used** (row 10) | | rule 2 |
| 22 | `components/Device.tsx` (machine float) | Its float numbers drive B02's unit drift and B06's phone tilt (TRANSLATION row 16) | | The component is not reused for the unit, because the plate-then-picture entry is new |
| 23 | `components/EndCard.tsx` | 87.17–90.23 s · f2092–2166 | | The press / "Book now" UI is removed |
| 24 | `components/Exo.tsx` (Phone, Bars, Network, Meter, Wave, Swap) | **Not used** | | The vertical reel's graphics (rule 2). `Network` is the rejected drawn look |
| 25 | `components/Explainers.tsx` (`MicrobeCard`, `PillCard`) and `Ro.tsx` (`RxCard`, `Calendar`, `Chain`, `Checklist`) | **Not used** | | Rosacea graphics (rule 2). Their methods are translated in TRANSLATION rows 5–12 and 19 |
| 26 | `OstadYT5.tsx` | **Not used** | | Rejected v5 approach (RUN_BRIEF) |
| 27 | `storyboard/kit.tsx` (`Thread`, `Lead`, `Ring`, `Chip`, `Win`, `Float`) | `Win` and `Float` geometry (r 22–24, hairline, long shadow) for B04, B11 and B03's windows. **`Thread` and `Lead` are not used** | | `Thread` (bead) and `Lead` (dot) are dot-and-line; the lint fails them |
| 28 | `storyboard/glitch_fix.patch` | Applied in the v6 build (the BTL-woman flash at 51.5 s etc.); scdet scan on the render | | Builder confirms 0 unintended flashes |
| 29 | Contact-sheet tool (`tools/contact_sheets.py`) | Stills sheet of one key frame per beat (`beats.json keyframe.f`) before the render | | DESIGN_PER_BEAT §6.2 |
| 30 | `tools/variety_check.py` | Run on `beats.json`: PASS (BEATS.md §4) | | Re-run on the built beat JSON |
| 31 | `tools/reuse_check.py` | Key frames cropped by `beats.json keyframe.crop` vs earlier edits | | After the stills |
| 32 | `tools/lint_compositions.py` | On `OstadYT6.tsx` and every new device file before the render; `--static-image` on the render | | Fails v4.1 (proof in DECISIONS 14i) |
