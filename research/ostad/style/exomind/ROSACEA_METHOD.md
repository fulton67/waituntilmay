# Rosacea method: what the rosacea reel does, frame by frame

Study only (2026-11-17). Source: the final delivered render `Downloads/Ostad - Rosacea laser (v5, clean captions).mp4`
(1080×1920, 24 fps, 2859 frames, 119.125 s). The repo's `brand/edits/rosacea-laser/rosacea-laser.mp4` is the older
"1.1x, brand kit" render, made before the visuals went in, so it is **not** the reference. The timings in
`brand/edits/rosacea-laser/edit.json` (the `remotion` block) and `brand/remotion/public/rosacea-laser/props.json` match the render
frame for frame. In this doc, **f = output frame at 24 fps** and the times are output seconds (after the 1.1× speed-up).

The contact sheets are 60 sheets at 2 s each (48 frames, 12×4, each tile labelled with frame and time). They are in
`research/ostad/style/exomind/rosacea_sheets/`, which is gitignored because they show his face and patient pictures. Every sheet was looked at.

Components live under `brand/remotion/src/`: `OstadReel.tsx` (layers), `components/{Hook,NameCard,Captions,Device,SkinCard,Explainers,Ro,Glass}.tsx`,
`devices/Markup.tsx`, `brand.ts`.

## 0. The grammar in one paragraph

He talks in the frame, uncut. Over that, one thing at a time appears in a fixed band: the **top band** (y < 610, `TOP_B`) for
explainers, and the **chest band** (y ≈ 1040, `CHEST_T`) for pictures. Captions sit at 83 %. Every object is the same frosted card:
white at 72–86 %, blur 26, a hairline rim, two slow light blobs (`Ro.tsx` `glassLife`) and navy `#1d2230` type. Each card says
**one specific, sourced thing**: a real photo of the condition with the exact spot ringed, a real drug photo, or a count of
courses. A new object arrives roughly every 2–4 s. There's no colour grade (client), no LUT and no stock footage.

## 1. Title card (Hook), f0–82

- **f0–2:** a dark scrim fades in at the top (0.5 s) so white type reads over his wall.
- **f3–7:** the headline "Rosacea?" (NHG Display 600, up to 15 cqw) rises 105 % of its own height out of a mask, 0.6 s on
  quint-out. It is a real mask reveal, not a fade.
- **f6–9:** the second line, "Not another prescription.", comes in a white caption box with navy type. It rises 20 px with a
  0.14 s stagger.
- **f35–37 (1.46 s):** a navy strike draws through "prescription" over 0.4 s, with the `no` SFX. That is the thesis in one gesture: the
  video is about not adding a drug.
- **f74–82:** out in the last 0.35 s with a fade and a 14 px lift. A `swish` SFX plays at 0.1 s.
- **Component:** `Hook.tsx`, from edit.json `hook {text, at 0, dur 3.4, strike "prescription"}`.
- **Why it worked:** the question and the answer are both on screen within 9 frames, and the strike lands on the spoken
  word. It's a mask reveal (type appears from behind an edge, so it reads as decisive), not a slow fade.

**Name card, f8–106.** `NameCard.tsx` puts liquid glass (SVG displacement, blur and rim in `Glass.tsx`) on the lower third. It rises
2.4 cqw in 0.6 s. A light sweep crosses it from 0.55 to 1.45 s. It holds 4.2 s and fades out over 300 ms. It overlaps the title, so the
first 4 s carry the name and the claim together.

**Section cards.** The rosacea reel has **no** full-screen section cards. Sections are marked instead by the **chips** at top-left
(`Ro.tsx` `Chips`, at f1256 / f1385 / f1630, e.g. "Other ways to target it" on the 12-month calendar at f630). They are glass
pills that pop in where the eye already is. The full cutaway at f1955–2070 (`ClipFull`, "In our practice / Treat it directly")
is the one section break that takes the whole frame: the background blurs and the Excel V clip plays big.

## 2. The prescription run, f112–792 (`Ro.tsx`)

| f | t (s) | object | component | what moves | why |
|---|---|---|---|---|---|
| 112, 128, 146 | 4.7–6.1 | three Rx labels stack up | `RxStack` | each card `enter`: fade + 18 px rise, 0.45 s quint | each new drug he names adds weight to the pile you can see |
| 217 | 9.04 | **real rosacea cheek photo** (M. Sand, CC BY 2.0) | `SkinCard` pos chest | scale 0.9→1 easeOutBack 1.3 in 0.36 s; ring "Redness" at +0.75 s (f235), ring "Blood vessels" at +2.03 s | see §4 |
| 296 | 12.3 | "Chronic" card, a line draws f303–335 | `Chronic` (top) | the line draws while he says "chronic" | the time axis shows "it keeps coming back" |
| 344 | 14.3 | "Where medication has a role" | `Checklist` | ticks at f457, f492 | a tick lands on each item as he names it |
| 522 | 21.7 | a 12-month calendar | `Calendar` | cells fill one by one; chip "Other ways to target it" at +4.5 s | "months" made countable |
| **702–792** | **29.2–33.0** | **Antibiotics card** | `RxCard` | see below | |
| 865 | 36.0 | a 7-day calendar | `Calendar` | cells fill | "a week" of the course |

**Antibiotics card (`RxCard`, f702–792).**
- An 880 px glass card with a real doxycycline photo (290 px, "Photo: Shorelander, CC BY 2.5 (cropped)").
- A small caps line "PRESCRIPTION · BY MOUTH" sits over a 52 px title "Oral antibiotics".
- A 4-segment bar fills from +0.5 s, one segment every 0.38 s (f714, 723, 732, 744), as a counter steps "Course 1…4" beside "Repeated courses".
- It fades out at f788–792.
- **Why it worked:** a real pill with a real licence line, plus a count you can watch climb. "Repeated courses" becomes a number
  that grows in front of you, without a single word of on-screen copy beyond the label.

## 3. The gut-microbiome glass panel, f795–862 (`Explainers.tsx` `MicrobeCard`)

The 640×360 glass `Panel` sits at `SAFE_T + 10`, centred in the top band. It overlaps his forehead, which is accepted because the band is
the panel's place.

- **f795 (33.12 s):** the panel scales in 0.97→1 over 0.36 s on quint. No overshoot.
- **f795 + 0.3 s:** the chip "GUT MICROBIOME" pops (0.72→1, easeOutBack 1.2).
- **f800–812:** the gut draws as a path (`M 70 250 C 70 120, 220 110, 230 200 S 360 300, 380 190 S 520 90, 560 200`). It is a 70 px
  translucent tube plus a 2 px hairline, drawn over 0.2–0.9 s on quint.
- **f806+:** 16 microbes (rods and circles) pop along the tube with easeOutBack 1.6, staggered 0.03 s, wobbling at sin(t·6).
- **f824+ (from 1.2 s):** half the microbes fade out over 0.6 s. That fade is what antibiotics do, shown and not written.
- **f828:** `XMark` lands: a rose glass disc with an X (the "×" in Naim's screenshot), with the `no` SFX.
- **f858–862:** out over 0.3 s.

**Why it worked:** one mechanism in 2.8 s. The tube gives a place, the microbes give a population, and **removing half of them** is the
whole argument (antibiotics also thin the good bacteria). The X closes it on the word. It has no text beyond a 2-word chip.

## 4. Markup on condition images (`SkinCard.tsx` + `devices/Markup.tsx`)

This is the core technique. The rule (memory `ostad-markup-on-images`) is that markup goes on the **popped-up condition image**,
never on his face.

- **Card:** a glass card around a real clinical photo, max 620×450, `PAD 10`, at chest (Y = 1040). It scales 0.9→1 on easeOutBack 1.3
  in 0.36 s, with the `card` SFX.
- **Ring:** an ellipse placed on the exact lesion (auto spots, or hand-placed for the nose pair). It draws in 0.55 s with a **dot riding the
  stroke tip**, so the eye follows the pen. Then a leader runs to a glass **chip** naming the thing ("Redness", "Blood vessels").
  Each ring gets a `swish`, each chip a `pop`.
- **Instances:**
  - f217: cheek. "Redness" ring at f235. "Blood vessels" at +2.03 s.
  - f1077: ear vessels. Ring and chip at f1110.
  - f1463: nose before/after. Ring f1477–1495. "After laser" crossfade f1510–1516 with a `yes` check.
  - f2666: cheek before/after. Ring, then X, then the after image with a check at f2724.
- **Licence rule:** a CC BY-SA image (perioral f999, flush f1187) is shown **unaltered**: no ring on the picture, and the X sits
  **outside** the card (f1042). The credit line sits under every card.
- **Before/after:** the same card. The "after" crossfades in 0.35 s with a `yes` check, and the "before" gets the `no` X first. The
  card never moves during the swap, so the change is the only thing that moves.
- **Why it worked:** a real picture proves the condition, and the ring says **where to look** while he says the word. The tip-dot and the
  leader make the ring read as a doctor pointing. The chip names it in the same breath. The licence handling keeps the reel publishable.

### 4a. Where "real image + ring the exact spot" maps onto the practice's ExoMind photos

Source: `clinic-library/browse/Collections/EXOMIND/` and `catalog/md/exomind-photos.md`. **Consent for patient P0006 is
unknown, so none of these go into a published edit until consent = yes.** They are practice/patient imagery, so they never get
committed to this public repo.

| photo | ring (exact spot) | chip | rosacea equivalent |
|---|---|---|---|
| IMG_3714 (row 39): coil applicator on the reclining patient, staff setting the BTL console, timer **24:30** | ellipse on the coil pad where it meets the forehead, the prefrontal site (v4.1 s11 already tracks this at source px ≈ (705, 330) on session.mp4) | "Coil over the prefrontal cortex" | cheek photo + "Redness" ring (f235) |
| same photo, second ring | ring the console timer readout | "Session timer 24:30" (as shown on screen; don't turn it into a claim about session length without the client) | second ring "Blood vessels" at +2.03 s |
| IMG_3713 (row 40, near-duplicate) | use as the "same card, second state" if a before/after-style swap is wanted (staff hand moves, coil settles) | — | nose pair crossfade f1510 (only if the frames differ enough to read) |
| IMG_3712 (row 41): staff adjusts the coil arm, BTL logo readable | ring the coil arm / applicator | "Exomind coil" | `Device.tsx` machine pop (Excel V f1340) |
| Screenshot 16:09 (row 42, "likely" only, confidence 0.50): sleep report, fitness 91, quality 87 %, 7 h 25 m | ring "7h 25m" and "87 %" | "Sleep report (patient's own app)" | `RxCard` counter (a number you can see); also the GLP-1 "phone moment" (§6) |

Rules carried over: the ring is on the **photo**, never on his face. Use one ring per spoken noun, drawn on the word. The chip has 2–5 words
and a credit/source line under the card ("Our office, Oct 30"). The row 42 link to the session is not stated in the catalogue, so it
needs the client to confirm before it's used as an outcome.

## 5. Image treatments and transitions

- **Cards, not cuts.** Every picture enters as a glass card over the uncut talking shot. The reel never hard-cuts away from him except
  for `ClipFull` (f1955–2070), where the background blurs, the clip plays large, and it returns. So the talking shot is continuous for
  119 s, and the visuals are layers on it.
- **Entry vocabulary:**
  - glass `enter`: fade + 18 px rise, 0.45 s quint (Ro cards)
  - `Panel`: scale 0.97→1, 0.36 s quint
  - `SkinCard`: scale 0.9→1, easeOutBack 1.3, 0.36 s
  - chips: 0.72→1, easeOutBack 1.2
  - the Device pop: 0.55→1, easeOutBack, 0.15–0.65 s
  - every exit is 0.3 s with a ≤ 10 px lift
  - all entries settle in **≤ 0.6 s (≤ 14 f)**
- **Devices:** `Device.tsx` cuts out the machine at right under `SAFE_T` (Excel V f1340, Laser Genesis f1548). It pops in, then sways ±2.2° and
  drifts ±1.4 cqw over a 3.2 s period. So a still PNG looks alive without being a video. It lasts 5.2 s.
- **Treatment sequence (`TreatmentCard`, f2319–2659):**
  - drivers at +0.2 / 2.5 / 3.5 s
  - the Excel V `ClipCard` at f2456 with a depth glyph
  - the split screen at f2568
  - Laser Genesis at f2585
- **Chains and compares:**
  - `Compare` f1693 (right half at f1714)
  - `Chain` f1777 and f2161 (the last step turns navy at f2276, "Find the cause first")
  - `Note` f1866
  - `RoutineCard` with a strike at f2140
- **End card, f2788–2859:** the background blurs, a glass card at f2791 ("Book a consultation. / Link in bio."), and the handle at f2805.

## 6. GLP-1 pop-up and phone moment

These are **not in the rosacea render**. They are a reference target: `refs.yaml` id `glp1` (YouTube `yhPRJ-dWP80`, 60 fps). It is fully measured
under `research/ostad/style/measure/glp1/glp1/` (cards, easing, cuts, graphic_elements; 1810/1810 frames per MEASURE_COVERAGE). The
frame tables that BRIEF.md asks for (`read/glp1.md`) do **not** exist yet.

Our only built "phone moment" is `Exo.tsx` `Phone`, from the Exomind vertical reel: a 300×560 card where a "Sleep trend" line draws over
1.6 s, labelled "Illustration". The practice's real sleep-report screenshot (row 42 above) is the honest replacement once consent and
the link are confirmed. A real screen with the number ringed is the rosacea method applied to a phone.

## 7. Captions, SFX, colour, pacing, placement

- **Captions** (`Captions.tsx`): NHG Display 600, white, one phrase at a time. "Clean" look: 5.8 cqw with a soft shadow. The box top sits at
  83 %. Each phrase scales 0.95→1 in 140 ms ease-out. Keywords are in `#7cc8f2` (Excel V, Laser Genesis, redness, blood vessels,
  microbiome, antibiotics). There are 122 phrases. The blue keyword is the same word the card on screen is about, so caption and graphic agree.
- **SFX** (synthesized, `public/sfx`): one per event, never a bed.
  - `card` on each card
  - `swish` per ring and on the title
  - `pop` per chip or label
  - `no` on X / strike
  - `yes` on check / after
  - The sound tells you *what kind* of event it is (wrong, right, new), not just that something moved.
- **Colour / LUT:** none (`grade: false`, client). His skin stays true, which matters in a skin video. The palette is the white glass, navy
  type and sky-blue keywords, and condition photos are shown as photographed. Audio: highpass + compressor + limiter, −14 LUFS.
- **Pacing:** speed 1.1×. A new object every ~2–4 s, at most one card in each band at a time, and each lands on its noun.
- **Head-relative placement:**
  - explainers go in the top band (above `TOP_B` 610, under the 13 % safe line)
  - pictures go at chest height (1040), below his chin
  - captions go at 83 %
  - devices go at the right edge
  - The face stays clear except the gut panel, which grazes the forehead (f795–862).
  - Positions come from `place()` zones in `Ro.tsx` (top / chest / Left / Right / xy). `Markup.tsx` also accepts a per-frame position
    from `face_track.json` for tracked markup.

## 8. The twelve techniques that carried it

1. A real clinical photo for every condition named, with credit and licence (SkinCard, f217, f999, f1077, f1187).
2. Ring the exact spot, with a dot riding the stroke tip, then a leader and a named chip, drawn on the spoken noun (Markup, f235, f1110).
3. Before/after in the *same* card: "no" X on before, a 0.35 s crossfade, then a "yes" check (f1463–1516, f2666–2724).
4. Licence-aware markup: CC BY-SA photos stay unaltered, and the X goes outside the card (f1042).
5. A mechanism shown by subtraction: the gut tube, 16 microbes, half fade, X (MicrobeCard, f795–862).
6. A count you watch climb: course bar plus counter on a real drug photo (RxCard, f702–792), and calendars filling day by day (f522, f865).
7. A thesis strike on the title, on the word (Hook, f35–37).
8. One frosted-glass material for everything, with navy type (Ro `glassLife`, Panel, NameCard).
9. Fixed bands relative to the head: explainers on top, pictures at chest, captions at 83 % (brand.ts `TOP_B`, `CHEST_T`, `CAP_TOP`).
10. Fast, calm entries: everything settles in ≤ 0.6 s, and exits take 0.3 s.
11. Typed SFX: card / swish / pop / no / yes, so the sound tells you what the event means.
12. An uncut talking shot with layered visuals. The one full cutaway (ClipFull, f1955) is the practice's own Excel V footage. No grade.
