# Rosacea → ExoMind translation table (YouTube v6)

Written 2026-11-17, before anything is built (EXOMIND_REDO §2).
- **Rosacea frames** (`ROS f<n>`) are output frames of the final rosacea render at 24 fps (`exomind/ROSACEA_METHOD.md`).
- **ExoMind timestamps** are composition seconds and frames on the v6 edit: 24 fps, 1.15×, reveals at onset + 1 f. The beat ids match `beats.json`.
- **Rule 2 applies throughout:** reuse the *method*, never the graphic. No rosacea graphic (gut panel, Rx card, calendar, skin card, GLP-1 pop-up) appears here.
- **Tokens** are MOTION.md §2 / `library/motion.ts` `D24`:
  - `arrive`: 14 f, 16 px rise
  - `exit`: 7 f
  - `sweep`: highlighter 16, row 14, trace 27
  - `plate`: 18 + 18 f
  - `morph`: 26 f
  - `swap`: 16 f
  - `stagger`: 2 f

## 1. One row per rosacea device or technique

| # | Rosacea device (frames) | Why it worked | ExoMind version | Where (v6) |
|---|---|---|---|---|
| 1 | **Title card / Hook**: "Rosacea?" rises 105 % out of a mask f3–7, subline f6–9, strike on "prescription" f35–37, out f74–82 | The question and the answer are both on screen in 9 f. A mask reveal reads as decisive, and the strike lands on the spoken word | EXOMIND wordmark *behind* keyed Ostad (`wordmark-depth-sandwich`): rises 6 % H in 5 f at f3, subline at f8, defocus out f98–105. It keeps the mask-reveal decisiveness and adds depth (title behind him) | B01 · 0.13 s · f3 |
| 2 | **Name card**: liquid-glass lower third, rises 2.4 cqw in 0.6 s, light sweep 0.55–1.45 s, holds 4.2 s (f8–106) | The name and the claim share the first 4 s | `name-super` under keyed Ostad from "spending" (f26) to f98, fade in and out; the glass light sweep is kept | B01 · 1.08 s · f26 |
| 3 | **Section markers**: glass chips top-left (f1256 / 1385 / 1630); one full cutaway as the only break (ClipFull f1955) | A section change shows without stopping him | **Section cards** at every turn (EXOMIND_REDO requires them): `chapter-title-card` beside keyed Ostad, number and title typed in 12 f, held 10 f, out with `type-letter-stagger-out` 8 f (30 f); he keeps talking | 01 f263 (10.96 s) · 02 f893 (37.21 s) · 03 f1242 (51.75 s) · 04 f1710 (71.25 s) |
| 4 | **One full cutaway** (`ClipFull` f1955–2070): the practice's own Excel V footage takes the frame | The one moment we step into the practice | The Nov 5 consult card **morphs to full frame** (`card-full-morph`, `morph` 26 f) on "conversation" and back on "care" | B04 · 13.08 s · f314 → f386 |
| 5 | **RxStack**: three Rx labels stack up f112 / 128 / 146, each `enter` 0.45 s | Each drug he names adds visible weight | The objects stack by channel instead: giveaway panel (far), email, then phone call (near), at three depths, on "giveaway / email / phone" | B05 · 18.29 / 19.17 / 19.71 s · f439 / 460 / 473 |
| 6 | **Real condition photo** (`SkinCard`, f217): a real clinical photo with credit, scale 0.9→1 in 0.36 s | A real picture proves the thing | The practice's **real session photo** IMG_3714 (coil on the head, console running), full frame, 3 depth layers | B12 · 49.21 s · f1181 |
| 7 | **Ring the exact spot**: ellipse on the lesion with a dot riding the pen tip, leader, chip, on the noun (f235, f1110) | It tells you where to look as he says the word | Same method, without the dot or the leader: a **circle drawn on the exact slot** of the calendar on "appointment" (12 f `sweep`), and a **zoom box drawn on the exact cheek area** that opens an inset on "translate". Never on his face | B07 · 30.54 s · f733; B20 · 85.21 s · f2045 |
| 8 | **Chronic line** (f296, draw f303–335) | The axis shows "it keeps coming back" | The **session timeline** (ExoMind-only, §2.4): arrive → session → walk out | B12 · 49.92–50.58 s · f1198–1214 |
| 9 | **Checklist** with ticks on the items as named (f344, ticks f457, f492) | A tick lands on each item as he says it | **Intake form** (`intake-form-fill`): goals, then medical history (highlighter 16 f), then three rows tick +16 / +20 / +24 f, then "appropriate" checks | B08 · 31.33–35.79 s · f752–859 |
| 10 | **Calendar** fills cells (f522, f865) | "Months" becomes countable | Not reused (rule 2). Time shows as a **week grid with one slot circled** (B07) and the **session timeline** (B12) | B07 f696; B12 f1198 |
| 11 | **Rx card**: a real pill photo, caps eyebrow, bold title, 4-segment bar + counter "Course 1…4" (f702–792) | A count you can watch climb, with no copy beyond a label | **Plate, then the real unit**, with one compliance chip: "FDA-cleared: major depressive disorder" ⚠. Nothing is counted, because there's no cited figure. The "count you watch" lives in the B12 timeline markers | B02 · 5.21 s · f125 |
| 12 | **Gut-microbiome panel** (`MicrobeCard` f795–862): glass panel, chip, gut tube draws, 16 microbes pop, half fade, × lands | One mechanism in 2.8 s, shown by subtraction | **Synapse panel** (ExoMind-only, §2.3): a pulse train on top; each pulse **adds** vesicles across the cleft, and a jittery trace settles to calm on "focused". It shows by addition and rhythm. No tube, no microbes, no × | B19 · 77.13 s · f1851 (release on "neurotransmitter" f1877) |
| 13 | **Licence-aware markup**: CC BY-SA photos stay unaltered, X outside the card (f1042), credit under every card | Keeps the reel publishable | Markup only on images we may mark: practice photos (consent pending) and BTL images used under the practice licence. The BTL MOA film gets **no markup on the picture itself**: B18's trace is an overlay arrow; the film is not altered or recoloured. Credit line under every card ("Image: BTL Industries", "Our office") | B02, B03, B12, B13, B16, B18, B20 |
| 14 | **Before/after in the same card**: "no" X on before, 0.35 s crossfade, "yes" check (f1463–1516, f2666–2724) | Only the change moves | Not used: ExoMind has no cleared before/after, and a skin before/after would be a treatment claim. The same "only the change moves" idea drives B15's split: a line wipe opens "Beyond" while "Classic" holds | B15 · 62.08 s · f1490 |
| 15 | **Entry vocabulary**: glass `enter` 0.45 s / 18 px; `Panel` 0.97→1 0.36 s; chips easeOutBack; all entries ≤ 14 f; exits 0.3 s | Fast, calm, consistent | Measured tokens: `arrive` 14 f / 16 px for cards; §T entries for type, all ≤ 17 f (13 distinct, rotated); `exit` 7 f; no easeOutBack overshoot (references never overshoot) | every beat |
| 16 | **Device float**: machine cut-out sways ±2.2° and drifts ±1.4 cqw, 3.2 s period (f1340, f1548) | A still PNG looks alive | Unit drifts 1.00→1.02 and 6 px (B02). Phone tilts ±1.5° on a 3.2 s period (B06). Applicator descends then rides the head's parallax at 1.5× (B17) | B02 f106; B06 f547; B17 f1740 |
| 17 | **TreatmentCard / split** (f2319–2659, split f2568) | Two treatments side by side | `split-labelled`: practice treatment footage vs the glass head ("Beyond") | B15 · 60.42 s · f1450 |
| 18 | **Compare** (f1693) | Two states | Folded into B15 (one split in the edit) | B15 |
| 19 | **Chain** (f1777, f2161; last step turns navy f2276) | A causal order made visible | **Flow diagram with headed curved arrows**: mind → our approach → your skin. Arrow #1's tail sits on his crown (head track) | B03 · 7.83 / 8.38 / 9.63 s · f188 / 201 / 231 |
| 20 | **Note / RoutineCard strike** (f1866, f2140) | Correcting a habit on the word | Not needed: nothing in this script is a misconception. `type-strike-replace` is kept off the sheet instead of forced in | n/a |
| 21 | **End card** (f2788–2859): background blurs, glass card "Book a consultation. / Link in bio.", handle at f2805 | One clear action | Glass card "Book a consultation. / Dr. Ariel Ostad / Link in the description." The press UI from v4.1 is removed | 87.17 s · f2092–2166 |
| 22 | **Captions**: one phrase at a time, keyword in `#7cc8f2` = the card's subject; 122 phrases | Caption and graphic agree | Word-onset captions (DEC 14d r8: `type-caption-word`, cut on at the onset) in their band. Keywords are blue only when the beat's object is that thing: Exomind (B02), text (B06), appointment (B07), medical history (B08), questions (B09), office (B12), comprehensive (B13), frontier (B14), emotions (B16), neuroplasticity (B17), rewire (B18), neurotransmitter (B19) | all |
| 23 | **Typed SFX**: card / swish / pop / no / yes, one per event | The sound says what kind of event it is | Same five types, per event in `beats.json sfx`: card on every card, swish on arrows and traces, pop on chips and markers, yes on ticks and the slot circle. No "no" (nothing is wrong in this script) | per beat (beats.json) |
| 24 | **No LUT, no grade**: true skin | A skin video keeps skin true | Same: `grade: false`, no LUT. The palette is cream canvas, white glass, navy ink and blue keywords. BTL imagery is shown as delivered; the MOA film's navy is not recoloured | all |
| 25 | **Pacing**: 1.1×, a new object every 2–4 s, ≤ 1 card per band | Calm but never empty | 1.15× (as v4.1). 20 beats in 87 s = one new object every **4.3 s** on average, plus 2–4 timed events inside each beat (every 1.1–2 s). Never more than one primary object in the graphic area | all |
| 26 | **Bands relative to the head**: explainers top, pictures at chest, captions 83 % | The face stays clear | 16:9 version: Ostad keyed at x 80–750; everything else in x 760–1880 / y 60–900. Captions keep their band. `faceSafeRect` (track.ts) checks every overlay against his face box every frame | all |
| 27 | **Uncut talking shot, layered visuals** | He is continuous | Continuous keyed Ostad for 16 of 20 beats. He steps out only for 4 full-bleed takeovers (B04 in footage, B12 pip, B17–B18 out) | all |
| 28 | **Real photo per thing named** | Proof, not illustration | The practice's own ExoMind bank: IMG_3712 (B03, B13), IMG_3714 (B12), the Nov 5 consult (B04). BTL licensed unit, applicator and model photos. The gold pick and the MOA film for the mechanism | per beat |
| 29 | **Head-relative placement** (`face_track.json` for tracked markup) | Markup follows him | MediaPipe track (DECISIONS 14g): B01 wordmark under the crown, B03 arrow tail on `headTop`, B16 ribbon orbit above `glabella` | B01 f3; B03 f188; B16 f1655 |

**Row count: 29.**

## 2. ExoMind-only animations (frame by frame)

Each one exists only for this topic and shows the single thing that matters at its beat.
- Frames are composition frames (24 fps). "Trigger" = the spoken word, its onset frame, and onset + 1 f.
- Clinical content is ⚠ physician-check. The MOA label "Conceptual depiction. Results may vary." is on screen for all of §2.1–2.3.

### 2.1 field-through-skull (B17, f1740–1810)

His words: "and if there's **technology** that can actually **help create neuroplasticity**". Section card 04 "The technology" plays f1710–1739.
- **Borrowed from:** gold pick k4lEDTVCb0U 53–59 s (GOLD f1325–1475: the applicator descends onto the glass head, then a cyan field glows under the coil). Rebuilt in our palette.
- **Layers:**
  - cream canvas
  - glass head in profile (Flora `head_B_glass_skull.png`, AI shot), 900×800 at x 600
  - BTL Applicator_0429 cut-out
  - three dashed orbit arcs
  - a region tint inside the skull under the pad
  - label

| Frames | What moves | Timing source | Trigger |
|---|---|---|---|
| 1740–1753 | Full frame: the head fades on (opacity 0→1, `arrive` 14 f, no rise). The applicator descends 40 px onto the forehead on `arrive` 14 f | `arrive` 14 f | after the card (he's on "technology", onset f1719) |
| 1740–1810 | Hold life: the head layer turns 4° about its vertical axis (2.5D displacement) over the beat; the coil layer moves 1.5× as far, so the coil reads as nearer | MOTION "every image moves"; parallax rule | — |
| 1750–1758 | Arc 1 (nearest the pad) grows tail→tip along a 60° arc from the coil into the skull, 9 f; its open-V head lands on 1758 with no overshoot | `arrow-orbit-arc` 8–10 f (DYKh5yyPxxg f1200–1264) | "help" f1749 → f1750 |
| 1754–1762 | Arc 2, 9 f, 4 f stagger | same | — |
| 1758–1766 | Arc 3, 9 f | same | — |
| 1765 → 1810 | Pulse rhythm: every **12 f** (f1765, 1777, 1789, 1801), each arc steps 6 px inward over 4 f and its opacity dips to 0.4, then recovers over 8 f. The arcs never sit still | 12 f = 0.5 s at 24 fps, a visible rhythm (the measured `pop` pair spacing of 4 f × 3) | "create" f1764 → f1765 |
| 1776–1781 | The prefrontal region under the pad lights: a soft radial tint (`BLUE` 0.0→0.55) fades on over **6 f** and then breathes ±0.08 on the pulse rhythm | `region-light-on-model` 6 f (DdrkdrYv-yW f600–660) | "neuroplasticity" f1775 → f1776 |
| 1776–1784 | Label "Prefrontal cortex" ⚠ rises 7 % H in 4 f (scale 0.85→1), then a box wipes L→R behind it in 4 f | `type-box-slam` (GMu3 f1512–1520) | f1776 |
| 1740–1810 | "Conceptual depiction. Results may vary." bottom-right, small | compliance | — |
| 1810 | Hard cut to B18 | Hard cuts by default (MOTION rule 8) | "rewire" f1811 |

### 2.2 rewire-trace (B18, f1811–1849)

His words: "**rewire** the **brain**".
- **Layers:**
  - the BTL MOA film neuron shot (MOA 59.0–60.6 s, 25 fps, played at 1×; 1.6 s ≈ 38 f), full frame. The burned-in subtitle band sits under our caption band.
  - one route arrow over it
  - chip

| Frames | What moves | Timing source | Trigger |
|---|---|---|---|
| 1812 | Hard cut to the MOA neuron shot, full frame; the footage plays (the film itself moves the whole time) | MOTION rule 8 | "rewire" f1811 → f1812 |
| 1812–1839 | Route trace: a 3 px white tapered stroke traces leg by leg along one dendrite from the reactivating cell to its neighbour (3 legs, each ending at a branch point), **27 f** on `sweep` (velocity peak at 44 %). The solid head rides the growing end and lands on 1839 with no overshoot | `arrow-route-trace` 27 f (DDOS f216–250) | f1812 |
| 1826–1830 | Chip "Neural connectivity" (the brochure's wording) pops 0.95→1 in 5 f, beside the route's end, in the upper third (clear of the subtitle band) | `type-scale-pop` 5 f | "brain" f1825 → f1826 |
| 1839–1849 | The tail erases toward the head over 10 f (the DDOS trace exit); the chip holds | DDOS tail erase | — |
| 1812–1849 | "Conceptual depiction. Results may vary." | compliance | — |
| 1849 | Hard cut to B19 | | "increase" f1850 |

### 2.3 pulse-train-synapse (B19, f1850–1986)

His words: "increase proper **neurotransmitter** production where we can actually be more **focused** in **flow**".
- **The panel:** a frosted panel 720×420 (`topic-glass-panel`, Glass material), chip "SYNAPSE", right of keyed Ostad under the face-safe line.
- **Inside the panel:**
  - top strip (80 px): the pulse train
  - middle: a presynaptic terminal (left), the cleft, the postsynaptic membrane (right), white glass with navy hairlines
  - bottom strip (60 px): a trace line

| Frames | What moves | Timing source | Trigger |
|---|---|---|---|
| 1851–1864 | Panel scales 0.97→1 with opacity on `arrive` 14 f | `arrive`; the rosacea `Panel` scale | "increase" f1850 → f1851 |
| 1853–1858 | Chip "SYNAPSE" pops 0.95→1, 5 f | `type-scale-pop` 5 f | — |
| 1856 → 1979 | Pulse train: a tick mark enters the top strip at the left every **12 f** and slides right 120 px over 12 f, so one tick always sits under the terminal. The strip never stops | 12 f rhythm, shared with §2.1, so the pulses read as the same coil | f1856 |
| 1877 → 1979 | On each tick from f1877 (f1877, 1889, 1901, …), 6–9 vesicles (8 px circles) leave the terminal and cross the cleft in **10 f** (`arrive` curve), dock on the membrane, and fade over 6 f. The membrane receptors flash 1 f on docking | 10 f crossing (the arc connector's riding-icon idea at synapse scale) | "neurotransmitter" f1876 → f1877 |
| 1900–1905 | Line "focused, in flow" set dim under the panel; it rises 2 % H in 5 f | `type-ghost-to-lit` (WZjqgyXpk0A f238–263) | set 34 f before "focused" (f1938) |
| 1904 → 1938 | Bottom trace: a jittery line (random amplitude ±14 px, re-seeded every 2 f) | `noise-clears` start state | — |
| 1939–1965 | "focused" lights in 1 f. The trace settles from jitter to a calm 1 Hz sine over **26 f** on `sweep` | `noise-clears` `sweep` 26 f (DDOS B23 inverse) | "focused" f1938 → f1939 |
| 1961 | "flow" lights in 1 f; the trace is steady and keeps flowing (phase advances 15°/f) | — | "flow" f1960 → f1961 |
| 1851–1986 | Panel drifts ±4 px on a 3.2 s period; the vesicle release never stops | "every image moves" | — |
| 1979–1986 | Panel exits on `exit` 7 f (opacity, 7 px fall) | `exit` 7 f | — |

⚠ "neurotransmitter production" and "focused, in flow" are his words, set as his words. They are not brochure claims, and they are not tied to skin.

### 2.4 session-timeline (B12, f1180–1241)

His words: "We look forward to **seeing** you **in** the **office**".
- **Over:** the practice's IMG_3714, full frame, 2.5D, with Ostad in a 260 px pip circle bottom-left.

| Frames | What moves | Timing source | Trigger |
|---|---|---|---|
| 1181 | Hard cut to IMG_3714 full frame; the pip circle pops (scale 0.95→1, 5 f) with keyed Ostad inside | `portrait-pip-circle` (drjc DYI5TbdvR3U f225) | "We" f1180 → f1181 |
| 1181–1233 | Depth push: three depth layers (staff + console / patient + coil / wall) scale 1.00→1.06 at rates 1.0 / 0.6 / 0.3 on the `in-out` curve | RULES.md graphic zoom; REDO "depth push" | — |
| 1198–1211 | Timeline hairline (2 px white, soft shadow) draws L→R along y 800, 14 f on `sweep`; marker ▼ "Arrive" pops at its left end in **1 f** | `sweep` row 14 f; `arrow-marker-tick` 1 f (WZ f940) | "seeing" f1197 → f1198 |
| 1207 | Marker ▼ "Session" pops in 1 f mid-line; segment label "about 20–30 min" ⚠ scale-pops in 5 f | 1 f pop; `type-scale-pop` 5 f | "in" f1206 → f1207 |
| 1214 | Marker ▼ "Walk out" pops in 1 f at the right end (the pair pop, WZ f940 / f944) | 1 f | "office," f1213 → f1214 |
| 1214–1233 | Hold: a soft light sweep (a gradient, no dot) travels the line arrive → walk out once (19 f), so the timeline moves while held | "stays alive" | — |
| 1234 | Cut back to keyed Ostad | | "and" f1234 |

⚠ Session length: the brochure says "under 30 min" and the practice page "about 20 min". The label reads "about 20–30 min" until the client confirms.
The console's 24:30 readout is shown as photographed, never as a claim.

**ExoMind-only animations: 4.**
- **field-through-skull** (B17): the coil lands on a glass head and dashed orbit arcs carry the field into the skull until the prefrontal region lights on "neuroplasticity".
- **rewire-trace** (B18): one route arrow traces a dendrite to the next neuron on the MOA film on "rewire".
- **pulse-train-synapse** (B19): a 12 f pulse train releases vesicles across a synapse, and the trace calms on "focused".
- **session-timeline** (B12): arrive → session → walk out markers pop on "seeing / in / office" over the practice's real session photo.
