# Arrow and type-entry proof: ours vs the references (2026-11-17)

**Code:**
- `brand/remotion/src/devices/Arrow.tsx` and `TypeEntry.tsx`, with usage in `devices/README.md`.
- The lab composition is `ArrowTypeLab` (`devices/ArrowTypeLab.tsx`). It renders one device alone on the kit background (`tokens.json` `color.background`) at 1920×1080 and 24 fps. Each arrow starts at f6 and ends at f66. Each entry starts at f6 and exits at f54.

**Measured with `tools/arrow_type_proof.py`.** It uses the reference method (`graphic_track.py` boxes and opacity, then `easing_fit.fit_track`), applied to our PNG frames.
- **Settle** is the frame from which progress stays within 1 % of the end value.
- **Visible travel** runs from the first legible frame to rest. This is what the reference tracks and frame counts measure.
- **Arrow draw progress** is measured as ink mass: the summed |diff| against the empty frame. A pixel count turns anti-aliasing into false overshoot.

**Outputs:**
- Raw numbers: `arrow_type_proof.json`, committed.
- Sheets: `arrows_vs_refs.jpg` and `type_vs_refs.jpg`. They are gitignored because they hold reference crops.

**Tolerance, set before tuning:**
- ±1 f on draws and entries of 10 f or less, and ±3 f (about 10 %) on longer ones.
- Travel within 0.5 % H.
- Overshoot: none beyond the fit's 1 % noise floor.

The reference numbers are from DEVICE_LIBRARY.md §A / §T, where M means frame-counted and E means estimated. The corpus medians are from `measure/_devices/entry_stats.json`.

## Arrows

| variant | ref draw | **our draw** | ref head | **our head lands** | apex overshoot | **frames to settle after landing** | hold (ref → ours) | exit (ours) |
|---|---|---|---|---|---|---|---|---|
| curved-callout | 7 f (M) | **7 f** | last draw frame | **f+7** | 0.0 px | **0** | static → shaft breathes, centroid ±1.4 px; tip 0.0 px | 6 f tail-erase, max 27 %/f |
| straight-pointer | 7 f (M) | **7 f** | pops at end | **f+7** | 0.0 px | **0** | static → ±1.2 px | 6 f tip-retract, max 20 %/f |
| bracket-pointer | (no ref; callout timing) | **7 f** | n/a | **f+7** | 0.0 px | **0** | → static bracket, breathing shaft | 6 f, max 34 %/f |
| route-trace | 27 f (M), peak 44 % | **30 f** by ink mass (head at f+26; the arc length runs on `sweep` 27 f, peak 43 %); mass peak 38 % | at end | **f+26** | 0.0 px | **1** | n/a → ±3.7 px breathe on the legs | 6 f tail-erase (DDOS) |
| arc-connector | 26 f (M) | **24 f** (peak 48 %) | icon rides end | **f+25** | 0.0 px | **0** | static → ±0.7 px | 6 f |
| dashed-flow | 8 f (E) | **8 f** (peak 44 %) | at end | **f+8** | 0.0 px | **0** | static → ±1.3 px | 6 f |
| light-ribbon | 28 f per pass (M) | not comparable by ink: the window draws over 28 f, then **keeps travelling** at 17.8 px/f (one loop per 96 f) | n/a | n/a | n/a | n/a | keeps travelling → keeps travelling | rides on and thins, 6 f |
| orbit-arc | 8–10 f (E) | **11 f** (the ring draws with the arc) | n/a | (drifts) | 0.0 px | **0** | drifts with the model → ±4° drift (centroid ±7 px) | 6 f |
| marker-tick | 1 f pop (M) | **1 f** | pops | **f+1** | n/a (1 px bob = the alive hold) | n/a | static → 1 px bob | fade + 7 px fall, 6 f |

**Resolution of "overshoot and settle" (EXOMIND_REDO §3) against "no reference overshoots" (DEVICE_LIBRARY §A): measured, no overshoot.**
- No reference arrow overshoots.
- Our heads land on the last draw frame with a measured apex overshoot of **0.0 px** and **0 frames to settle** after landing. Route-trace takes 1 f, and that is ink settling at the rounded join, not head motion.
- The settle the brief asked for is carried by the hold instead: a ≤ 1.5 px breathe on the shaft interior, with tail and tip pinned.

**Head tracking (follow).** The test was a curved callout whose `to` is `follow(track, "templeL", LAYERS.keyed)`, using v6 timeline frames 1007–1090. The target travelled 77 px over the 84 frames.
- Tip-to-landmark error: **median 2.97 px, p95 3.15 px**, against a spec of median < 6, p95 < 15 (at 1080 px high, the stricter scale).
- The error includes the round cap of the head, about 2.2 px.

**Exit.** No arrow is ever cut. The largest one-frame ink drop is 20–34 % (a cut would be 100 %). The last visible frame is `end − 1`.

## Type entries

| id | reference (DEVICE_LIBRARY §T) | **ours (measured)** | in tolerance |
|---|---|---|---|
| type-word-fade-rise | up 6 % H, 5 f, ease-out, 0 OS | **5 f, up 5.74 % H, 0 OS** | yes |
| type-rise | settle 11.2 f, up 4.2 % H (corpus median, n 2,187) | **11 f, up 4.17 % H, 0 OS** | yes |
| type-slide-side | settle 9 f, 2.8 % H (slide-right, n 1,609) | **9 f, right 2.78 % H, 0 OS** | yes |
| type-scale-pop | 5 f, scale 0.95→1 | **5 f, +4.96 % scale, 0 OS** | yes |
| type-card-rise | 17 f, up 10.7 % H, bezier (0,.18,.42,.91), 0 OS | **17 f, up 10.74 % H, fit (0,.15,.35,.81), 0 OS** | yes |
| type-box-slam | type 4 f, up ≈ 7 % H, scale .85→1; box L→R 4 f from f+4 | **type 4 f, up 7.27 % H, scale +15.9 %; box 4 f from f+5** | yes |
| type-highlight-sweep | 16 f, `sweep` peak 44 % | **16 f, peak 46.9 %** | yes |
| type-ghost-to-lit | line rises 2 % H in 5 f; each word lit in 1 f | **line 6 f, 1.76 % H; every word lit in 1 f (6/6)** | yes |
| type-line-accumulate | lines cut on per phrase; words lit ±1 f | **each word lit in 1 f (6/6); each line appears in 1 f (2 line cuts)** | yes |
| type-typewriter | 3.9 characters/frame, linear | **24 characters in 7 frames, first to full (3.9 c/f → 7 frames)** | yes |
| type-message-lines | plate 4 f; lines fade 4 f, ≈ 5–6 f apart | **plate 3 f; lines fade 4 f each, at f+5, f+13, f+19** | yes |
| type-orbit-labels | first pair 3 f, all by 9 f | **first pair 3 f, all 9 f** | yes |
| type-letter-stagger-out | about 1 letter per GIF frame (2.4 f) | **2.29 f per letter (14 letters in 32 f)** | yes |
| type-name-decode | resolves over ≈ 70 f | **last character resolves at f+70; first-to-last change spans 59 f (6 characters, seeded order)** | yes |

**Tuning log (what the first measured pass showed, and what changed):**
1. **Durations.**
   - word-fade-rise D 6→5, slide-side 10→9, scale-pop 6→5: each first measured 1 f long.
   - highlight 16→17: it measured 15.
   - orbit 4→3: the first pair landed at 4.
2. **Visible travel.** The ease-out moves the text a large share of its path before it is legible, so a nominal 4.2 % H showed only 3.5 %. The nominal values are now set so the visible travel matches: rise 5 %, slide 3.5 %, word 9 %, ghost 4 %, pop scale 7 %.
3. **box-slam.** It first showed 1.8 % of visible travel. The reference pops on whole ("$4.6 billion pops white") and then moves, so ours now pops on at full opacity and rises on `sweep` 8 % H. It measures 7.27 %.
4. **name-decode.** Random resolve times bunched early (the last character resolved at 37 f). They are now evenly spread in a seeded order, so the last character lands at the end of the span.

## F04 "check your texts", v4.1 vs rebuilt

Word onsets come from `yt_words.json` (×24): "check" f580, "your" f587, "text(s)" f592.

| | first ink − onset | settled − onset | entry length |
|---|---|---|---|
| v4.1 "Check" (TYPE_AUDIT §1) | **−27 f** (f553) | +10 f (f590) | 48 f CSS ease, double-wrapped |
| ours "Check" | **+2 f** (f582) | **+4 f** (f584) | 5 f per word |
| ours "your" | +2 f | +5 f | 5 f |
| ours "texts" | +2 f | +4 f | 5 f |

- Each word reveals at onset + 1 f (MOTION §1.2). The ink becomes legible one frame later.
- The B06 message card in the same rebuild lands its plate on "check" (f581) and its lines on "your", "text" and "messages", 4 f each.
- The rebuilt row is in `type_vs_refs.jpg`, beside the v4.1 frames.

## Limits

- **Light-ribbon:** by design it never settles. Its comparison is that the window keeps travelling, as the reference does.
- **Bracket-pointer:** has no corpus reference. EXOMIND_REDO names it, so it borrows the callout timing.
- **Message card on the flat lab background:** the glass plate is faint, because tokens glass alpha is 0.613 white with nothing behind it to blur. Over footage it reads as glass.
- **Route-trace:** measures 30 f by ink mass against 27 f in the reference. The overrun is the hold breathe (±1.3 % of ink) starting at landing, inside the 1 % band. Its arc-length progress is `sweep` over 27 f by construction, and the head lands at f+26.
