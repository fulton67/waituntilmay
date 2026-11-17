# Device library (from the ~50-reference study)

Written 2026-11-17 for DESIGN_PER_BEAT §2. It lists every distinct visual device in the reference study, with a stable id for each. The beat sheets (`style/<topic>/BEATS.md`), the builder and `tools/variety_check.py` all key on these ids. Use this file together with `ANIMATION_LIBRARY.md` (L01–L23), which holds full frame tables for the devices we have already specified. Here an `L` number means the device is specified in that file.

- **Arrows** are in **§A** and **text entries** in **§T**. A later agent builds the arrow system (`devices/Arrow.tsx`) and the type system from those two sections.
- **Everything else** is in **§D**.

## How to read an entry

- **id**: kebab-case, stable. Never rename one. If a device changes, add a new id.
- **Ref frames**: `ref vid f<frame>`, given in the source's own frame numbers.
  - The contact sheet for a frame is `research/ostad/style/sheets/<ref>/<vid>/<n>.jpg`, with `n = floor(frame / (2 × fps))`. Each sheet covers 2 s, and `measure/<ref>/<vid>/sheets.json` maps frames to sheets.
  - The primary sheet path is given for each device.
  - Are.na blocks are stills in `media/arena/<id>`.
  - All media and sheets are gitignored.
- **Timing**: always in **frames at 24 fps** (OstadYT).
  - Conversions: 30 fps sources × 0.8; 60 fps (the GLP-1 ad) × 0.4; 23.976 fps sources × 1.
  - **M** means measured. The number comes from the measure JSONs (`easing.json`, `text_elements.json`, `graphic_elements.json`, via `tools/device_stats.py` → `measure/_devices/entry_stats.json`), or from a frame count read off the reference sheets below, or from the read files (`read/ig_Ddos1QZRGmV.md` = DDOS, `read/evident_yt_group1..4.md` = G1–G4, which count frames on the sheets).
  - **E** means estimated from the sheet: the device was seen, but its frames were not counted one by one.
- **Built**: where it lives in `brand/remotion/src`.
  - **yes**: the file implements it.
  - **partial**: a related component exists, but it lacks this device's defining motion or look.
  - **never**: nothing exists.
- **Exo**: suits the ExoMind / neuro / device / session / phone / medical-history topic. ★ marks a strong fit.

**Reference sheets made for this file** are local only and gitignored as `research/ostad/style/exomind/ref_*.jpg`. Rebuild them with `python -I tools/ref_device_sheet.py tools/sheet_specs/<name>.json exomind/<name>.jpg`.
- `exomind/ref_arrows.jpg`: 10 arrow treatments, frame by frame.
- `exomind/ref_type_entries.jpg`: 11 text entries, 6 frames across each.

### Measured baseline (all refs, `measure/_devices/entry_stats.json`, 24 fps)

| Kind | Entry style | n | Settle median (IQR) | Travel median | Overshoot > 2 % |
|---|---|---|---|---|---|
| text | appears whole (pop / cut) | 19,549 | 0 | 0 | 6 % |
| text | scale-in | 2,270 | 5.0 (2.4–11.0) | 0.2 % H | 34 % |
| text | rise | 2,187 | 11.2 (5.0–17.6) | 4.2 % H | 68 % |
| text | slide left | 1,965 | 9.0 (4.8–16.0) | 3.4 % H | 62 % |
| text | slide right | 1,609 | 9.0 (4.0–16.0) | 2.8 % H | 58 % |
| text | drop | 853 | 10.4 (5.0–17.6) | 3.0 % H | 66 % |
| text | type-on | 366 | 5.6 (3.2–10.0) | n/a | 47 % |
| graphic | fade | 7,969 | 8.8 (5.0–16.0) | 0 | — |
| graphic | rise / drop | 7,515 | 10.4–10.6 | 2.8–2.9 % H | — |
| graphic | scale-in | 3,715 | 8.0 (5.0–13.6) | 0.4 % H | — |
| graphic | slide left / right | 6,603 | 10.0–10.4 | 2.9–3.0 % H | — |

**Caveats on the baseline**
- These are OCR and frame-difference tracks, so box jitter reads as overshoot. Treat the overshoot share as an upper bound (MOTION.md says the same).
- The frame-counted moments in §T are cleaner: none of them overshoots.

**How our motion compares**
- Our `arrive` token is 14 f with a 16 px rise (1.5 % of H).
- The reference rise is shorter and travels further: 11 f and 4.2 % of H (≈ 45 px at 1080).
- Our `settle` token (48 f, 20 px) is far slower than any measured reference text entry.

---

## §A. Arrows (every distinct treatment seen). For `devices/Arrow.tsx`

Sheet: `exomind/ref_arrows.jpg`. **No reference uses a dot-plus-line as an arrow.** The only dot terminals in the corpus are hairline leaders with no head (`arrow-leader-hairline`), and those are now banned for us (EXOMIND_REDO §3).

| id | Name | Ref frames (primary sheet) | Used for (spoken line) | Entry / hold / exit (24 fps) | Built | Exo |
|---|---|---|---|---|---|---|
| `arrow-curved-callout` | Curved callout, open-V head | evident_yt GMu3uTEDzn0 f392–404 (`sheets/evident_yt/GMu3uTEDzn0/0008.jpg`) | "X goes to Y", pointing from a label to a thing | **Entry M:** thin stroke grows tail→tip f395→401 (**7 f**); the head lands on the last frame, with no overshoot. **Hold M:** static while the diagram builds around it. **Exit:** hard cut with the scene | partial: `storyboard/kit.tsx` `Thread` (cubic path with a bead and chevron: the rejected bead look) | ★ coil → brain region; "our approach → your skin" |
| `arrow-dashed-flow` | Dashed flow arc, solid triangle head | GMu3 f448–472 (`…/GMu3uTEDzn0/0009.jpg`); WZjqgyXpk0A f900–1324 | a step in a mechanism ("gives a bond", "sells to") | **Entry E:** the dashes reveal along the path in about 8 f (f460→468) and the head appears at the end. **Hold:** static; several arrows build in place across a 10–27 s scene (G2 T9, G4 T16). **Exit:** cut | partial: `devices/Markup.tsx` `Flow` (dotted circular arc with an open chevron, arc-only) | ★ "mind → our approach → your skin" flow |
| `arrow-straight-pointer` | Straight shaft (dashed), solid triangle head | WZjqgyXpk0A f926–950 (`…/WZjqgyXpk0A/0019.jpg`) | up or down to a label ("investors", "goes down in value") | **Entry M:** shaft grows f926→933 (**7 f**) and the head pops at 933. Then micro arrows (`arrow-marker-tick`) pop in pairs f940/944. **Hold:** static. **Exit:** cut | never | ★ "stimulates key areas" → pointer to the region |
| `arrow-trend-zigzag` | Zigzag trend arrow beside a number | evident_yt GRMVbXpO1jQ f3362–3376 (`…/GRMVbXpO1jQ/0056.jpg`) | a rise or increase ("42 % increase") | **Entry M:** draws segment by segment f3362→3374, 12 f @30 = **10 f**; the head lands last, with no overshoot. **Hold:** static to the cut | never | a cited change (needs a source) |
| `arrow-arc-connector` | Dotted arc connector with a travelling icon | evident_yt D_bh30x6w9c f1102–1140 (`…/D_bh30x6w9c/0018.jpg`) | "who talks to whom", A ↔ B | **Entry M:** arc grows f1108→1140, 32 f @30 = **26 f**; a phone icon rides the growing end. **Hold:** the icon stays at the end. **Exit:** cut | partial: `Markup.tsx` `Flow` | ★ phone → practice ("check your text messages") |
| `arrow-glyph-delta` | Arrow glyph locked to a number (↓45 lbs) | ro yaFInenV3Eg f78–100 (`sheets/ro/yaFInenV3Eg/0001.jpg`); glp1 f185–215; Are.na 52507673 | a change in a value ("lost 45 lbs") | **Entry M:** glyph and number slide in from the right with directional motion blur, f80→88 (**8 f**); then a trend curve draws under it, f86→102 (**16 f**). **Hold:** static. **Exit:** cut | never | a cited outcome only (no invented numbers) |
| `arrow-light-ribbon` | Glowing tapered ribbon that wraps a subject | glp1 f1100–1170 (`sheets/glp1/glp1/0009.jpg`), 60 fps | movement, energy, "mobility improved" | **Entry M:** draws on along a curve; one pass is 70 f @60 = **28 f**. **Hold M:** keeps travelling around the body while held (the motion never stops). **Exit:** rides off the frame / cut | never | ★ pulse travelling round the head; "stays alive" rule |
| `arrow-orbit-arc` | Curved arc arrows plus a dashed ring around a rotating 3D model | ig_DYKh5yyPxxg f1200–1264 (`sheets/ig_DYKh5yyPxxg/DYKh5yyPxxg/0020.jpg`) | rotation or tilt of a body part ("anterior tilt") | **Entry E:** arcs fade or draw as the model turns, about 8–10 f. **Hold E:** they drift with the model. **Exit:** cut | never | ★ a magnetic-field arc around the Flora glass head |
| `arrow-hand-drawn` | Hand-drawn white strokes and arrows on a before/after | Are.na 52386109 (still) | naming changes on a face or skin image | **E:** draw-on per stroke (still reference; no timing) | never | skin results only (markup on condition images, never his face) |
| `arrow-marker-tick` | Small solid triangle markers (▼) on a line / micro arrows | Are.na 16463981 (timeline); WZ f940–944 "↓ VALUE" | marking moments on a timeline, or a small direction cue | **Entry M:** pop in pairs, 1 f each (WZ f940, f944). **Hold:** static | never | ★ session timeline (Day 1 → week N, "under 30 min") |
| `arrow-route-trace` | Path traced leg by leg, head at the end | DDOS f216–250 (`sheets/evident/Ddos1QZRGmV/0003.jpg`); G4 T10 FWfMMmC6mzE f161–299 | a route or sequence named in order | **Entry M:** DDOS coast trace 34 f @30 = **27 f** (`sweep`, peak 44 %); G4: one leg per spoken name. **Exit:** tail erases (DDOS) | partial: `library/TraceOnFootage.tsx` (path plus ring, no head) | ★ the coil → cortex path (L03) |
| `arrow-elbow-connector` | Orthogonal (elbow) connector lines between nodes | evident_yt idX6wSvZqyw f619–946 (`…/idX6wSvZqyw/0013.jpg`) | a network ("who can reach whom") | **Entry M:** nodes pop and lines draw on as the camera follows, over 9–17 s holds (G3 T10, Δ word −1/−2 f). **Hold:** keeps adding | never | neural pathways "activating" (as a diagram, not anatomy) |
| `arrow-leader-hairline` | Hairline leader, no head (dot terminal) | G1 T7, G2 T5 ETSQdtiNJjg f63–86; Are.na 12400773, 21587531 | labelling a point | **Entry M:** box/leader draws in about 23 f source (≈ 18 f) | yes: `components/YT.tsx` `Callout`, `Markup.tsx` `Pin` / `Ring` | **banned as an arrow** (the dot-and-line). Use a headed arrow instead |

**Arrow rules the references agree on**
- The head always lands last, on the final draw frame, with no overshoot in any reference (GMu3, WZ, GRM, D_bh).
- Strokes are thin: about 0.3–0.5 % of H for the black or lime strokes in Evident.
- The only arrows that keep moving while held are the ribbon (`arrow-light-ribbon`) and the orbit arcs. EXOMIND_REDO asks for that "alive" hold on all of ours. Build the hold as the ribbon's slow travel, or a ≤ 2 px breathe, never a static line.

---

## §T. Text entries (every distinct style). For the type system

Sheet: `exomind/ref_type_entries.jpg`. Direction, distance, duration, easing and overshoot are measured off the sheet frames unless marked. % H = percent of frame height.

| id | Name | Ref frames (primary sheet) | Direction · distance | Duration (24 fps) · easing · overshoot | Hold / exit | Used for | Built | Exo |
|---|---|---|---|---|---|---|---|---|
| `type-word-fade-rise` | Words rise and fade on in place | evident Ddos1QZRGmV f3–13 (`sheets/evident/Ddos1QZRGmV/0000.jpg`) | up · ≈ 6 % H | **M** f3→9 = **5 f**, ease-out, opacity 0→1 over the same frames, 0 overshoot; the name line under it fades 3 f later | hold to the cut | an opening quote over the presenter | partial: `components/YT.tsx` `Kinetic` (words rise one after another, slower) | thesis line |
| `type-highlight-sweep` | Highlighter block sweeps behind the phrase | DDOS f27–47 (`…/Ddos1QZRGmV/0000.jpg`), Moment A | block L→R, text static | **M** 20 f @30 = **16 f**, `sweep`, velocity peak 44 %, 0 overshoot; text flips dark | stays lit to the cut | the phrase being said or quoted | yes: `library/Highlighter.tsx` (L01) | ★ one brochure claim, quoted |
| `type-box-slam` | Keyword pops up, then a box wipes in behind it | evident_yt GMu3uTEDzn0 f1512–1522 (`…/GMu3uTEDzn0/0031.jpg`); also f2614–2620 "Champerty" | up and scale ≈ 0.85→1 · ≈ 7 % H | **M** type rises in **4 f** (f1512→1516), then the box wipes L→R in **4 f** (f1516→1520); 0 overshoot. G2 T4: Δ word median −1.5 f | held to the end of the clause; hard cut | a term or number he names | partial: `YT.tsx` `Tag` (label typed inside a growing highlight) | ★ "ExoTMS", "drug-free" |
| `type-ghost-to-lit` | Full line set dim, each word lit on its onset | evident_yt WZjqgyXpk0A f238–263 (`…/WZjqgyXpk0A/0005.jpg`) | the line rises ≈ 2 % H on entry, then no motion | **M** line in about 5 f (f238→243); each word dim→white in 1 f, on its onset (about 5 f apart here) | hold; cut | the punchline sentence | yes: `Highlighter.tsx` `mode="karaoke"` (L02) | ★ "total skin health" thesis |
| `type-line-accumulate` | Quote builds line by line, each lit as spoken | DDOS f2595–2821 (`…/Ddos1QZRGmV/0045.jpg`) | lines add downward; no travel | **M** one line per spoken phrase (about 40 f apart at speech pace); words lit ±1 f | hold to the end; cut | a long quotation | partial: `Highlighter.tsx` karaoke (fixed layout; it doesn't add lines) | ★ patient quote "felt like some tapping on my head" |
| `type-typewriter` | Letters type on (no caret) | DDOS f1539–1556 (`…/Ddos1QZRGmV/0025.jpg`); G1 T14, G3 T5 | in place | **M** 50 characters in 16 f @30 = **13 f** (≈ 3.9 characters per 24-fps frame); linear | hold; cut | a chart title, a rule, a URL | partial: `YT.tsx` `Tag` / `Callout` type-on (≈ 1 char/frame) | ★ a session title, "Non-invasive · drug-free" |
| `type-blur-slide` | Number or line slides in with motion blur | ro yaFInenV3Eg f78–90 (`sheets/ro/yaFInenV3Eg/0001.jpg`) | from the right · ≈ 15 % W | **M** f80→88 = **8 f**, strong ease-out; the blur decays with the speed; 0 overshoot. Ro text slides overall: n 270, 9–11 f, 4.4–4.8 % H (**M**, entry_stats) | static; cut | a hero figure | never | a cited figure only |
| `type-message-lines` | Message card: plate, sender, then line by line | glp1 f860–950 (`sheets/glp1/glp1/0007.jpg`), 60 fps; ro _MAYscxxhDE f746–812 | each line rises ≈ 1 % H as it fades | **M** plate f860→870 (**4 f**); sender row f870→885; message lines f900 / 912 / 925 / 940 (≈ 5–6 f apart); each line fades in about 4 f; the status chip goes spinner → tick by f935 | the card holds while he talks; cut | "a message arrives", a text from the practice | never (`components/Exo.tsx` `Phone` is a sleep-trend phone) | ★★ "check your text messages after the event" |
| `type-orbit-labels` | Labels and glass icons rise and fan out on an arc | glp1 f622–644 (`…/glp1/0005.jpg`) | up and out along an arc around the subject | **M** f626→634 (**3 f**) for the first pair; the third label lands by f644 (**9 f** total); stagger ≈ 2 f; ease-out | static; cut | 2–4 named benefits or parts | never | ★ "emotional regulation · cognitive function · self-control" (brochure) |
| `type-letter-stagger-out` | Letters leave one by one, then the image wipes in | Are.na 12087163 (GIF, ≈ 10 fps) f82–133 | letters vanish from each line's end; the photo wipes L→R | **M** about 1 character per GIF frame; exit about 2.4 s over the full block; the photo wipe takes about 10 GIF frames (≈ 1 s) | n/a | a designed exit for a title card | never | title or section card exit |
| `type-card-rise` | Screenshot / headline card cuts in and keeps rising | colin DZiJljQJEKN f46–64 (`sheets/colin/DZiJljQJEKN/0001.jpg`) | up · **10.7 % H** | **M** 17 f, bezier (0, .18, .42, .91) ease-out, 0 overshoot (`easing.json`) | keeps drifting slowly; cut | an article or document that backs him | partial: `components/Ro.tsx` `card` / `enter` (18 px, 0.45 s) | ★ brochure page / FDA clearance line |
| `type-rise` | Generic rise and fade (the corpus norm) | all refs (entry_stats); evident_yt n = 1,814 | up · **4.2 % H** (≈ 45 px at 1080) | **M** median **11.2 f** (IQR 5.0–17.6); fitted ease-out; overshoot is an upper bound (jitter) | hold; `exit` 7 f or cut | any line tied to a word | partial: `library/motion.ts` `arrive` (14 f, only 1.5 % H) | — |
| `type-slide-side` | Lateral slide on | all refs: left n 1,965 / right n 1,609 | ← / → · 3.4 / 2.8 % H | **M** median **9 f** (IQR 4–16) | hold; cut | list items entering in turn | never | step lists |
| `type-scale-pop` | Small scale-in pop (no travel) | all refs n = 2,270; evident_yt n = 1,571 | scale ≈ 0.95→1 · 0.2 % H | **M** median **5 f** (IQR 2.4–11) | hold; cut | labels and chips | partial: `components/Device.tsx` (overshoot pop, images only) | chips |
| `type-caption-word` | Word captions cut on at the onset | colin (pop n = 1,345); DEC 12 | none | **M** 0 f (cut) at the onset | until the next word | captions | yes: `components/Captions.tsx`, `OstadYT.tsx` `YTCaptions` | always |
| `type-strike-replace` | Strike drawn, old line dims and moves, new one in | G3 T13 D_bh30x6w9c f3350 (`…/D_bh30x6w9c/0055.jpg`) | the old line moves up ≈ 2 % H | **M** strike draws in 8 f @30 = **6 f**; Δ word −3 f | new line held | a misconception corrected | partial: `Exo.tsx` `Swap`, `components/Hook.tsx` strike (L18) | ★ "not a painful headache" → "tapping" (patient quote) |
| `type-name-decode` | Asterisks resolve into a name | G4 T22 FWfMMmC6mzE f960–1029 (`…/FWfMMmC6mzE/0020.jpg`) | in place | **M** characters resolve over about 70 f across the clause | hold | revealing a term | never | "ExoTMS" reveal |
| `type-rolling-swap` | Masked roll of one value | SU S2 (web); G2 T16 LSuT_8L5Pb0 f23–115 | vertical, inside a mask | **M** 650 ms outExpo = **16 f** | value swaps in place | a count that advances | yes: `library/RollingLabel.tsx` (L05) | ★ session 1 → N |
| `type-italic-voice` | Another voice set in italic | DDOS f2007–2214 (`…/Ddos1QZRGmV/0034.jpg`); G3 caption speaker coding | none | **M** cut, per word | per word | a patient's or a study's words | partial: v5 `OstadYT5.tsx` (rejected file; reuse only the rule) | ★ patient quote |

**Rotate at least 5 of these in one edit.** Distinct styles, not one slide at five speeds. For example: `type-box-slam`, `type-ghost-to-lit`, `type-typewriter`, `type-message-lines`, `type-card-rise` / `type-orbit-labels`.
- Never use the same entry on two beats in a row (variety_check).
- No frame-counted reference type entry runs longer than 17 f.
- A 48 f `settle` fade cannot land on a word, so keep it off word-tied lines.

---

## §D. Other devices

| id | Name | Ref frames (primary sheet) | Used for | Entry / hold / exit (24 fps) | Built | Exo |
|---|---|---|---|---|---|---|
| `phone-message-arrives` | A glass message card arrives beside a product or person | glp1 f860–950 (`sheets/glp1/glp1/0007.jpg`); ro _MAYscxxhDE f746–812 (`sheets/ro/_MAYscxxhDE/0016.jpg`) | "you'll get a text", a follow-up from the practice | **M** plate 4 f, then the type of `type-message-lines`; the card floats in depth, drifting about 1 % over its hold; cut | partial: `Exo.tsx` `Phone` (glass phone, sleep trend) | ★★ the text-messages line |
| `spatial-glass-ui` | Frosted panels floating in depth around the presenter | ro _MAYscxxhDE f746–812 | several facts at once (a weight chart, a message, a progress bar) | **E:** panels drift with a slow parallax and arrive about 10 f apart; captions stay in their band | partial: `components/Glass.tsx` (the material only) | ★ session facts around him (time, comfort, walk-out) |
| `wordmark-depth-sandwich` | Giant type behind the subject (the person in front) | ro _MAYscxxhDE f66 (`…/_MAYscxxhDE/0001.jpg`); glp1 f120–140 | opening title, brand moment | **E:** type static behind the keyed subject, blurred out on the cut | never | ★ title card "EXOMIND" behind keyed Ostad (uses the matte) |
| `product-plate-reveal` | Product fades through a frosted tile, plus a status chip | ro yaFInenV3Eg f618–674 (`…/yaFInenV3Eg/0013.jpg`) | introducing a product or treatment | **M** blurred plate f618, image sharp by f670 (52 f, about 52 f at 23.976); chip ("FDA approved") lands last | partial: `components/Explainers.tsx` `PillCard`, `Ro.tsx` `RxCard`, the `plate` token | ★ the Exomind unit on a tile; "FDA-cleared for MDD" chip (compliance wording) |
| `product-cutout-float` | Product cut-out floating, with a person chip | ro yaFInenV3Eg f226 (`…/0004.jpg`); grove machine cutouts (brand DEC 62) | a device he names | **E:** float and sway while held | yes: `components/Device.tsx`, `storyboard/kit.tsx` `Float` | ★ the applicator / unit |
| `portrait-pip-circle` | The presenter in a circle inset over full-bleed footage | drjc DYI5TbdvR3U f225 (`sheets/drjc/DYI5TbdvR3U/0003.jpg`); G2 T18 roundels | full-bleed takeover while he keeps talking | **E:** circle pops at the cut; holds | never | ★ MOA film full frame with Ostad in a corner (REDO "full-bleed takeover") |
| `held-photo-card` | A photo card appears "held" in front of the presenter | grove DfUl-B7p09L f285–593 (`sheets/grove/DfUl-B7p09L/0008.jpg`) | "this is what it looks like" | **E:** cut in and track the hand position | never | before/after only with consent |
| `tier-tile-grid` | Thumbnails slide into a ranked grid | ig_DfTeuSYK23y f240–287 (`sheets/ig_DfTeuSYK23y/DfTeuSYK23y/0005.jpg`); grove tile rows | ranking or comparing options | **M** thumbnails slide right about 7 f (entry_stats slide-right 7 f); stagger by word | partial: kit `tile` / `tile-pair` (`brand/kit/video/kit.html`, not Remotion) | classic treatments vs beyond |
| `region-light-on-model` | One part of a real model lights up | ig_DdrkdrYv-yW f600–660 (`sheets/ig_DdrkdrYv-yW/DdrkdrYv-yW/0010.jpg`) | "this part", a named structure | **E:** tint fades on (about 6 f), holds while he talks | never | ★★ brain region lights on the Flora glass head (no drawn anatomy) |
| `model-turntable-axis` | 3D model rotating with a dashed axis and rings | ig_DYKh5yyPxxg f1200–1264 | showing a structure from all sides | **E:** continuous rotation through the hold | never | ★ glass head turntable with the coil position |
| `mechanism-on-real-image` | The process played out step by step on real imagery | G1 T8 IkrWPG3HGD8 f610–880 (`…/IkrWPG3HGD8/0011.jpg`) | how a treatment works | **M** builds over 5–11 s, landmarks −9 f before the word (G1) | partial: `library/TraceOnFootage.tsx` (L03) | ★★ coil → field → region on BTL MOA (labelled "Conceptual depiction") |
| `annotation-box-footage` | Hairline or numbered boxes on footage, with labels | G4 T2 5J8M96aZYYg f2293–2311 (`…/5J8M96aZYYg/0038.jpg`) | counting or naming things in footage | **M** boxes 10 % at f2294, 90 % at f2311 (17 f @23.976) vs "six" f2302 (−8/+9 f) | partial: `TraceOnFootage` `dim`, `Markup.tsx` `Brackets` | ★ the applicator on the session footage |
| `loupe-zoom` | A circular loupe magnifies a detail | G4 T2 5J8M96aZYYg f1168 (`…/0019.jpg`) | "look closer" | **E:** circle scales open about 10 f | never | ★ the coil pad on the head |
| `zoom-box-inset` | A zoom box opens onto an inset photo on a leader | G4 T5 Ik5Zt8oGko4 f1245–1399 (`…/Ik5Zt8oGko4/0027.jpg`) | from overview to detail | **M** the inset slides or scales out from its pin, on the place name (G4) | never | ★ head → brain-region inset |
| `tracking-ring` | A ring re-placed frame by frame on a moving subject | G4 T20 tQkjtXJEtxY f851–1091 (`…/tQkjtXJEtxY/0018.jpg`) | following one thing in motion | **M** ring from f836 vs "projectile" f852 | partial: `devices/track.ts` + `Markup.tsx` `Ring` | head-tracked labels (never markup on his face) |
| `hud-face-labels` | Hairline labels and a tick ruler on a face or profile | Are.na 23958815, 31815447, 30940781 | measurements, routine steps on a face | **E:** labels draw on one by one | never | condition images only |
| `radial-leader-callouts` | Leaders radiating from an object to its claims | Are.na 12400773, 21587531 | the properties of a product | **E:** leaders draw, labels type, 2 f stagger | partial: `Markup.tsx` `Pin` | ★ "non-invasive · drug-free · walk-in/walk-out" around the unit |
| `timeline-markers` | A horizontal timeline with markers and time labels | Are.na 16463981; G3 T19 carousel | a session or treatment timeline | **E:** markers tick on per spoken step | partial: `Ro.tsx` `Calendar` | ★★ the session (arrive → ~20/<30 min → walk out; flag the conflict) |
| `calendar-date-circle` | A date or cell circled as it's said | Are.na 31223791 (date type); `Ro.tsx` `Calendar` | "the event on the 12th", a booking | **E:** circle draws in about 12 f (`sweep`) | partial: `Ro.tsx` `Calendar` (cells fill, no circle) | ★ the event / booking date |
| `intake-form-fill` | A form or document fills in line by line | G4 T14 liXI5YR96w4 f3601–3928 (`…/liXI5YR96w4/0061.jpg`); G3 T12 | "review your medical history" | **M** the cover slides up about 27 f, dims to about 30 %, items stack +16 to +22 f after their words (G4) | never | ★★ the medical-history line |
| `document-isolate` | The page dims or blurs, one line stays lit or boxed | G3 T12 iZ4ljC_4Rb4 f567 (`…/iZ4ljC_4Rb4/0009.jpg`) | the exact line he paraphrases | **M** dim 15–25 f after the highlight (G3) | never (L15) | ★ brochure claim, FDA-clearance line |
| `headline-card-rebuilt` | Article headline re-set as a brand card, then highlighted | G1 T3 IkrWPG3HGD8 f998–1205; tqxCIKD2Bb0 f129–300 | "a study found" | **M** builds in about 8 f; highlight +4 f (G1) | yes: `Highlighter.tsx` (L01, headline mode) | a cited mind–skin paper |
| `highlighter-document` | Real document crop with a highlighter and a push | DDOS f1222–1284 (`…/Ddos1QZRGmV/0020.jpg`); G1 T2 | "records show", "the filing says" | **M** highlight 23 f @30 = 18 f, with a slow push | yes: `Highlighter.tsx` | ★ brochure page |
| `stat-over-dim` | Background dims first, then a number types and is highlighted | G4 T6 5J8M96aZYYg f636–760 | a count over its context | **M** dim 10–24 f first; highlight +16 / +4 f (G4) | never (L22) | cited figures only |
| `counter-roll` | Linear rolling counter | DDOS f763–796 (`…/Ddos1QZRGmV/0012.jpg`) | a number growing | **M** linear, ends 2 f after its bar | yes: `YT.tsx` `Counter` | session minutes (cited) |
| `bar-build` | Bars grow one by one, with the accent on the punchline bar | DDOS f421–693 (`…/0007.jpg`) | a comparison | **M** bar 33 f @30 = **26 f**, peak 45 % | partial: `Exo.tsx` `Bars`, `YT.tsx` `Bar` (L10) | cited Dalgard 2015 only |
| `unit-icon-chart` | Waffle or icon units, then a recolour of the share | DDOS f888–955 (`…/0015.jpg`); G1 T12 Jq0KrFenFIA f1397–1497 | "one in N" | **M** grid builds 18 f @30, fill 22 f @30 = **18 f** | never (L11) | cited share only |
| `donut-ring-fill` | Clockwise ring fill with a label at about 60 % | G3 T15 GRMVbXpO1jQ f889 (`…/0014.jpg`); G4 T9 liXI f2617 | a share or percent | **M** about 28 f @30 = **22 f**, 12 f stagger between rings | partial: `Exo.tsx` `Meter` | session progress (literal, not a claim) |
| `line-chart-draw` | Line draws point to point, plus a bracket on a segment | G4 T8 liXI5YR96w4 f2350–2467 (`…/0040.jpg`); G3 T18 ymd f573; Ro ↓31 lbs panel | change over time | **M** 55 f @30 = **44 f** draw (G3); bracket −1 f (G4) | partial: `Exo.tsx` `Phone` trend | cited trend only |
| `flow-diagram-build` | Flow diagram built in place on an accent canvas | G2 T9 GMu3uTEDzn0 f383–1042 (`…/0008.jpg`); G4 T16 WZjqgyXpk0A f900–1324 | a mechanism or causal chain | **M** labels pop, dashed arrows draw (`arrow-dashed-flow`), cut-outs arrive on their names (+3 f); 17–27 s builds | partial: `Ro.tsx` `Chain` | ★★ mind → our approach → your skin |
| `network-node-graph` | Nodes and links, with a focus pull on one node | G1 T16 2_e5sGWXtOo f44–824 (`…/0008.jpg`); G4 T23 FWfMMmC6mzE f0–138 | relationships | **M** dims the graph and enlarges one node, −5/+6 f | partial: `Exo.tsx` `Network` (rejected drawn look) | "enhances neural connectivity" (as a diagram) |
| `split-labelled` | Labelled side-by-side split, never a slider | G1 T11 yA0gele-Nmo f494–583; G3 T6 fpXw0rLD5gE f570 (`…/0009.jpg`) | two states | **M** hard cut, or a line wipe (oomds0rZz_o f118); labels on their words | partial: `Ro.tsx` `Compare` (L23) | classic vs beyond |
| `windowed-footage` | Footage in a rounded window, credited | DDOS f2007–2214 (`…/0034.jpg`), radius 2 % W; G4 T11 | archive, testimony | **M** hard cut in; in-window cuts | yes: `OstadYT.tsx` `Win`, `Exo.tsx` `VideoCard` | patient clip (consent) |
| `card-full-morph` | Card grows to full frame | NAP §3B (web study) | "come and see it" | **M** `morph` 26 f, surround out 5 f | never (L09) | ★ session footage card → full frame |
| `stepped-punch-in` | 2–3 hard zoom steps onto the key area | DDOS f1016–1026 (`…/0017.jpg`); G2 T19 9LOajbWUksI f89/109/132 | "right here" | **M** 10 f @30 = **8 f**, or hard steps about 20 f apart | partial: `OstadYT.tsx` frame transform (L16) | ★ onto the targeted region |
| `audio-waveform-transcript` | Waveform plus live transcript lines | G4 T19 Ik5Zt8oGko4 f1790–2710 (`…/0041.jpg`); Ro waveform under captions (_MAYscxxhDE) | a recording or quote | **M** each line on its utterance, 38 s run | never | ★ patient voice / quote |
| `person-id-card` | Disc cut-out, typed name, facts stacked above | G1 T10 tqxCIKD2Bb0 f1010–1326 (`…/0018.jpg`) | introducing a person or study | **M** disc +1 f, facts on their words | never (L20) | a study card |
| `name-super` | Lower-left name and role | G3 (13/13 videos) | first appearance | **M** fade, 3–5 s | yes: `components/NameCard.tsx` | ★ Ostad's name |
| `chapter-title-card` | Chapter title, letter by letter, on a clean ground | G4 T30 eMX2jPQE090 f1160–1207 (`…/0019.jpg`); SU S5 blank | a new section | **M** about 47 f @23.976; SU blank 11 + 7 + 11 f | partial: YT `title` kind (L13) | ★★ section cards (REDO: no section without one) |
| `brand-shape-wipe` | A brand-shaped panel wipes to the next scene | G1 GS3ngZPlBl4 f54–116 (`…/0001.jpg`) | footage → built scene | **M** `sweep` 14 f (MOTION §4.1) | never | ★ into the mechanism section |
| `noise-clears` | Noise or jitter settles to calm | DDOS B23 inverse (`…/0040.jpg`) | "quiets", "focused" | **M** `sweep` 26 f (L19) | partial: `Exo.tsx` `Wave` / `Burst` | ★ "restore healthy brain activity" (calm, not a claim on skin) |
| `footage-wall` | Thumbnails tile in, one pushes forward | G4 T25 tQkjtXJEtxY f505–581 (`…/0011.jpg`) | "all the footage we found" | **M** tiles in across the clause | never | patient montage (consent) |
| `duotone-portrait` | Blue duotone photo in a circle | G3 T7 fpXw0rLD5gE f737 | a person quoted | **E:** pop | never | — |
| `quote-card-carousel` | Quote cards with phrase highlights, pushed in from the right | G4 T15 liXI5YR96w4 f3958–4288 (`…/0068.jpg`) | several testimonies | **M** highlights on the phrases; the next card pushes in | never | patient reviews (consent) |
| `topic-glass-panel` | Frosted panel holding a topic-specific animation (× button) | our rosacea edit (`components/Explainers.tsx` `MicrobeCard`); Ro spatial panels | the one thing that matters at that beat | **M** RO `enter()` 0.45 s / 18 px; hold animates the whole time | yes: `Explainers.tsx` `MicrobeCard` (gut microbiome) | ★★ an ExoMind-only panel (pulse train, region lighting) |
| `rx-card` | White card: cut-out photo, caps eyebrow, bold title, segmented progress | our rosacea edit (`Ro.tsx` `RxCard`, `Explainers.tsx` `PillCard`) | a prescription or course | as built | yes: `Ro.tsx` `RxCard` | ★ "Session · walk-in/walk-out" card |
| `checklist-ledger` | Ruled rows wipe or tick on their words | DDOS f1686–1745 (`…/0028.jpg`), Moment C | a list he reads | **M** row wipe 18 f @30 = **14 f**, +1 f after the word | partial: `Ro.tsx` `Checklist` (L08) | ★ "goals · medical history · appropriate" |

**Count:** §A 13 + §T 19 + §D 47 = **79 devices**.

| Built status | §A | §T | §D | Total |
|---|---|---|---|---|
| yes | 1 | 4 | 8 | **13** |
| partial | 4 | 9 | 20 | **33** |
| never | 8 | 6 | 19 | **33** |

## For ExoMind: the shortlist

These ten cover its lines with things, not text. The never-built ones count toward the ≥ 3 new devices rule.

1. **`phone-message-arrives`** + `type-message-lines` (never): "check your text messages after the event". Glass message card from the practice, plate then lines, after glp1 f860–950.
2. **`intake-form-fill`** (never): "review your medical history". An intake form slides up, then fields fill on his words (after G4 T14).
3. **`timeline-markers`** + `arrow-marker-tick` (never): the session. Arrive → about 20 / under 30 min (flag the conflict) → walk out.
4. **`region-light-on-model`** (never): "stimulates key areas of the brain". A region lights on the Flora glass head. No drawn anatomy.
5. **`arrow-orbit-arc`** / **`arrow-light-ribbon`** (never): the field or pulse travelling round the head. It stays alive while held.
6. **`flow-diagram-build`** with **`arrow-dashed-flow`** / `arrow-curved-callout`: mind → our approach → your skin, with real arrows.
7. **`mechanism-on-real-image`** (partial, TraceOnFootage): coil → field → region on the BTL MOA film, labelled "Conceptual depiction. Results may vary."
8. **`portrait-pip-circle`** (never): MOA or session footage full bleed, Ostad in a corner (REDO "full-bleed takeover").
9. **`chapter-title-card`** + `wordmark-depth-sandwich` (never): opening title and section cards. "EXOMIND" behind keyed Ostad.
10. **`radial-leader-callouts`** (partial) on the unit: non-invasive · drug-free · walk-in / walk-out (brochure claims).

Type entries to rotate for ExoMind: `type-box-slam` ("ExoTMS"), `type-message-lines`, `type-ghost-to-lit` (thesis), `type-line-accumulate` (patient quote "felt like some tapping on my head", in `type-italic-voice`), `type-card-rise` (brochure page), `type-orbit-labels` (emotional regulation · cognitive function · self-control).

**Compliance applies to every device:** no skin-treatment claim for Exomind (FDA-cleared only for MDD in adults who failed antidepressants), and every clinical line is ⚠ physician-check.
