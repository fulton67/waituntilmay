# ExoMind YouTube v6: beat sheet (a literal visual for every line)

Design only (2026-11-17), for DESIGN_PER_BEAT §1 and RUN_BRIEF rule 2. The builder implements exactly `beats.json` (this folder). This file
is the reasoning behind it. `tools/variety_check.py beats.json` passes (output at the end).

**Time base.** Composition frames at **24 fps** on the **1.15×** edit that v4.1 uses (`OstadYT.tsx`: `ARoll startFrom = at·speed·24`,
`props_yt.json speed 1.15`, 2166 f = 90.23 s). Composition s = cut s ÷ 1.15, from `brand/edits/exomind-skin/transcript.json` word onsets.
Every graphic reveal lands on **onset + 1 f** (MOTION.md `cut`). `f` below = composition frame. The 16:9 1920×1080 frame is kept (RUN_BRIEF).

**Reference ids** are DEVICE_LIBRARY.md ids and their ref frames (`ref vid f<frame>`, source frame numbers). `ROS f<n>` = the final rosacea
render frame (exomind/ROSACEA_METHOD.md). `GOLD f<n>` = k4lEDTVCb0U at 25 fps (0:56 = f1400). `MOA t` = BTL Mechanism-of-Action film
seconds. `v4.1 #n` = row n of exomind/TYPE_AUDIT.md §2.

---

## Gap round 1 (2026-11-17, DECISIONS 14o, gap/ROUND1.md)

The five gap reports in `gap/` measured v6 against the references. `gap/round1_beats.py` rewrote `beats.json` (layouts, subjects,
re-timed events, SFX classes); this table is the new shape. Sections below keep the original reasoning; where they disagree, this table and
`beats.json` win.

| Seg | f | Layout | Him | What changed |
|---|---|---|---|---|
| B01 | 0-105 | LT | keyed left | none |
| B02 | 106-159 | LC | keyed left | pointer rerouted off the FDA chip; barb head; weight 8/1.15 |
| B03 | 160-262 | LC | keyed left | Flora glass head gone: real unit -> real treated skin (clinic row 741, after half, lower face); tail on templeR + 40 px (measured), not headTop |
| S1 + B04 | 263-413 | FB | pip | consult full frame, S1 card on the picture, him in the circular pip (feathered left edge) |
| B05 | 414-545 | LC | keyed left | timing only |
| B06 | 546-666 | CO | out | phone close-up centred, him out (a frame change at 22.8 s) |
| B07 | 667-750 | LC | keyed left | arc rerouted over the grid header, lands on the slot |
| B08 | 751-892 | LW | keyed left | the practice treatment room (row 3601) in a window behind the form; form rise 16 px in 14 f; focus eased 12 f |
| S2 + B09 | 893-996 | FB -> SPLIT | out | waiting room (row 3614) with S2, then consult left / question box right; no names (Maya, Jordan, Sam gone) |
| B10 | 997-1080 | LC | keyed left | logo thumb for "What Exomind is" |
| B11 | 1081-1179 | FB | pip | team / treatment diptych, full height |
| B12 | 1180-1241 | FB | pip | session full frame; IMG_3714 card with a callout SESSION -> coil pad and a ring on the 24:30 timer |
| S3 | 1242-1271 | FB | out | reception (row 3612) with S3 |
| B13 | 1272-1378 | LC | keyed left | donut; mind chip is the BTL MOA lit brain (Flora head gone) |
| B14 | 1379-1448 | LT | keyed left | exit by end - 8 |
| B15 | 1449-1599 | SPLIT | out | full-height split: classic laser | the lit Exomind applicator (BTL 0108) |
| B16 | 1600-1709 | LC | keyed left | rosacea trigger chart gone: "The mind-skin link", Emotions -> Skin, cited Kabat-Zinn 1998 ⚠ physician-check |
| S4 + B17 | 1710-1810 | FB | out | BTL MOA film (applicator on the head, region lit) under S4; orbit ring; MOA label. Flora skull gone |
| B18 | 1811-1849 | FB | out | dissolves in over B17 (8 f) |
| B19 | 1850-1986 | LW | keyed left | the MOA synapse film in a window + the pulse-train panel |
| B20 | 1987-2091 | SPLIT-L | keyed left | her footage full height on the right; her words build over it |
| END | 2092-2165 | LC | keyed left | SFX added |

Same subject on at most 2 beats (`variety_check` R14): coil-on-patient now B11 + B12 only (was 5). Layout runs at most 3 segments / 15 s (R13).
SFX: one wav per event class through `beats.json sfx_map` (draw / card / chapter are new, `tools/make_exo_sfx.py`), hero 0.32, rest 0.16.

---

## 0. v4.1's three weakest graphics problems, and how v6 fixes each

Measured against the references (DEVICE_LIBRARY baseline, TYPE_AUDIT, ROSACEA_METHOD) and Naim's notes.

### 1. One move for everything, and it is the wrong move

- **Measured:** 44 of v4.1's 73 text entries (60 %) ride the same 2 s CSS-ease fade-up (TYPE_AUDIT §2). F04 "Check your texts" takes
  **47.8 f** to ease in (RMSE 0.013), rises a doubled **40 px**, starts **33 f before "check"** and is still moving on the word.
  None of the 73 uses a mask reveal, and no headline lands on a measured onset.
- **The references:** text rise 11.2 f / 4.2 % H (n 2,187); Evident entries 7.2 f; no frame-counted reference type entry is longer than 17 f.
- **The fix:**
  - **13 distinct entries** from §T, rotated so no entry repeats on consecutive beats (variety_check R2).
  - Every word-tied entry is **≤ 17 f** and starts on **onset + 1 f**.
  - F04's beat (B06) becomes a phone whose message plate lands in **4 f on "check" + 1 (f582)**: 4 f vs 47.8 f, +1 f vs −33 f.
  - The 48 f `settle` is banned from word-tied lines.
- **Measure to confirm after the build:** median entry duration ≤ 14 f; median |reveal − onset| ≤ 1 f.

### 2. Words where the thing should be, pointed at with a dot and a line

- **Measured:**
  - v4.1 writes the line instead of showing it: "Check your texts", the "Your goals / Your medical history" rows, the "Stress" / "Calm" tags, and "Neurotransmitters in balance".
  - Its only pointer is the dot-and-line (`YT.tsx Callout`: a 5 px dot, a pulsing ring and a straight stroke; `OstadYT.tsx Lead`: a 9 px dot plus a stroke). It is used in s3, s7 and s11. Naim: "just the circle and the line… cheap".
  - **No reference uses a dot-plus-line as an arrow** (DEVICE_LIBRARY §A).
  - v4.1 also counts "+24 new connections" (#59), a number with no source.
- **The fix:**
  - Every beat names its **noun** and builds it as an object doing what he says:
    - B06: a text arrives on a phone.
    - B08: an intake form fills in.
    - B07: a slot is circled on a calendar.
    - B09: questions land in a live Q&A box.
    - B19: a synapse fires with the pulse train.
  - Text-only beats: **2 of 20 (10 %)**.
  - **8 headed arrow variants:** straight-pointer, curved-callout, arc-connector, marker-tick, light-ribbon, orbit-arc, route-trace, dashed-flow.
  - Each arrow draws tail→tip, its head lands on the last draw frame with no overshoot (as in every reference), it stays alive while held, and it exits along its path.
  - `tools/lint_compositions.py` fails any dot-and-line, and it fails v4.1.
  - No uncited numbers.

### 3. Not immersive, two presentations, nothing made for ExoMind

- **Measured:**
  - v4.1 switches between his raw phone panel (s1, s4, s9), the keyed look (only from cut 42.4 s) and full-bleed stock (stressed, couch, hiker).
  - Pictures are flat rectangles over the canvas.
  - There is no title card beyond an s1 label, and no section cards.
  - It does not use the head track (DECISIONS 14g came after it).
  - It has no ExoMind-only animation that compares with the rosacea gut panel (ROS f795–862) or Rx card (ROS f702–792).
- **The fix:**
  - **One presentation:** Ostad keyed on the cream canvas, left third, same size, for the whole edit. He steps out only on purpose, for **4 full-bleed takeovers**:
    - B04: the consult clip
    - B12: the office photo, with him in a pip circle
    - B17: the coil and skull
    - B18: the MOA film
  - **Every beat logs one of the five immersion modes** (full-bleed 4, depth push 4, camera move 5, split 2, masked card 5), and every still image moves for its whole span.
  - **Cards:** a title card plus **4 section cards** (one look, `chapter-title-card`) open every turn.
  - **Head track** (`devices/track.ts`):
    - B01: the wordmark passes behind his hair.
    - B03: arrow #1's tail sits on his crown.
    - B16: the ribbon orbits his head above the brow and passes behind him through the matte.
    - Everywhere: overlays use `faceSafeRect`.
  - **Four ExoMind-only animations** (TRANSLATION.md §2): field-through-skull, rewire-trace, pulse-train-synapse, session-timeline.

---

## 1. Rules this sheet satisfies (checked by `variety_check.py`)

| Rule | Value |
|---|---|
| Beats | 20 (+ title, 4 section cards, end card) over 90.2 s |
| Max uses of one device | 1 (limit 2) |
| Entries | 13 distinct; none on two consecutive beats |
| Text-only | B01 (title), B14 ("the next frontier"): 2/20 = 10 %, never 2 in any 5 consecutive |
| Distinct devices | 30; worst 60 s window 16 (need ≥ 6) |
| Never-built devices | 12: `wordmark-depth-sandwich`, `arrow-straight-pointer`, `card-full-morph`, `intake-form-fill`, `quote-card-carousel`, `portrait-pip-circle`, `arrow-marker-tick`, `type-name-decode`, `arrow-light-ribbon`, `region-light-on-model`, `arrow-orbit-arc`, `zoom-box-inset` |
| Never-built entries also used | `type-message-lines`, `type-orbit-labels`, `type-name-decode` |
| Dot-and-line | none (`arrow-leader-hairline` banned) |
| Cards | title f0; sections 01 f263, 02 f893, 03 f1242, 04 f1710; end f2092–2166 |
| Presentation | keyed-left on 16 beats; full-bleed only on B04 (in footage), B12 (pip), B17 and B18 (out) |

**Section cards are structural, like captions.** They don't count toward the device limits. All four use the same look so the grammar reads
as one system:
- `chapter-title-card` on the clean canvas to the right of keyed Ostad, who stays.
- Number plus title, typed on in 12 f, held 10 f, out with `type-letter-stagger-out` in 8 f.
- 30 f in total, inside the first 30 f of the section's first beat.
- He keeps talking. The card never covers him, and the beat's graphic arrives after it.

**Compliance on every beat:**
- No skin-treatment claim for Exomind (FDA-cleared only for MDD in adults who failed antidepressants).
- "Exomind does not directly treat skin conditions." is on screen where the mind–skin link is made: B03, B13, B20.
- "Conceptual depiction. Results may vary." sits on all MOA-style imagery: B17, B18, B19.
- ⚠ = physician-check, listed per beat.
- The Nov 12 reel's "FDA approved for sleep, anxiety, OCD" is never on screen. The MOA film's burned-in subtitle band (which says "Major Depressive Disorder and OCD") is hidden under our caption band.

**Placement:**
- He is keyed at x 80–750.
- The graphic area is x 760–1880, y 60–900. Captions keep their band below it.
- Full-bleed crops stop at y 860.
- The keyed matte comes from `matte_fgr_cut.mp4` + `matte_pha_cut.mp4` for the whole cut (v4.1's `presenter_k.webm` starts at cut 42.4 s).

---

## 2. The beats

Each beat gives: what he says (composition s / f), the noun, three concepts (each citing its borrowed reference and frame), the pick and
why, what it does **better** than our closest earlier graphic (with a measure), then the device ids, the entry (§T), the immersion mode,
the arrow, the assets and any ⚠.

### S0 · Opening

#### B01 · 0.00–4.38 s · f0–105 · TITLE CARD
- **Said:** "Thank you for spending part of your evening with us. I hope tonight's conversation has"
- **Noun:** the evening, and its subject: EXOMIND.
- **Concepts:**
  1. A giant EXOMIND wordmark behind keyed Ostad, with him in front (`wordmark-depth-sandwich`, ro _MAYscxxhDE f66; glp1 f120–140).
  2. A chapter title typed letter by letter on a clean ground (`chapter-title-card`, evident_yt eMX2jPQE090 f1160–1207).
  3. The practice's EXOMIND logo (clinic IMG_3720) fading through a frosted plate (`product-plate-reveal`, ro yaFInenV3Eg f618–674).
- **Pick: 1.** It's the only option that uses what Naim liked (keyed, no background) to make depth: the title sits *behind* him. It names the topic at frame 3, the way the rosacea Hook names it in 9 f (ROS f3–9).
- **Better than v4.1 s1:**
  - v4.1 had his raw phone panel, a "Total skin health evening" label and the name as a Kinetic fade.
  - The title lands in **5 f vs 47.8 f**, and he is in the keyed look from frame 0 instead of the raw panel.
- **Devices:** `wordmark-depth-sandwich` (never) + `name-super` (yes)
- **Entry:** `type-word-fade-rise` (6 % H in 5 f, DDOS f3–9)
- **Immersion:** depth push. The wordmark scales 1.000→1.012 while the matte layer holds. Exit is an 8 px defocus plus a fade over 7 f.
- **Arrow:** none
- **Assets:** built type, plus Ostad's matte
- **Track:** the wordmark baseline is kept below `headTop` − 40 px, so letters pass behind his hair and never across his face.

#### B02 · 4.42–6.62 s · f106–159
- **Said:** "helped you understand ExoMind and"
- **Noun:** the Exomind device: the unit and its applicator.
- **Concepts:**
  1. Plate then picture: the unit fades through a frosted tile, and a status chip lands last (`product-plate-reveal`, ro yaFInenV3Eg f618–674).
  2. The unit cut-out floating and swaying (`product-cutout-float`, ro yaFInenV3Eg f226).
  3. Leaders radiating to its claims, "non-invasive · drug-free · walk-in/walk-out" (`radial-leader-callouts`, Are.na 12400773).
- **Pick: 1, plus a straight pointer** to the applicator head.
  - The plate gives the name a moment, and the chip carries the one compliance fact that matters first: "FDA-cleared: major depressive disorder".
  - Option 3 is three claims in 2.2 s, too many.
- **Better than v4.1 #4:**
  - v4.1 showed "Exomind" as HERO kinetic type in an icon box, with no device on screen.
  - v6 shows the real unit, which a word can't, and points at the part that touches the head. The pointer head lands on the last draw frame (7 f, WZ f926–933) instead of a dot.
- **Devices:** `product-plate-reveal` (partial) + `arrow-straight-pointer` (never)
- **Entry:** `type-box-slam`. "Exomind" rises in 4 f, then the box wipes in 4 f (GMu3 f1512–1520).
- **Immersion:** masked card. The unit drifts 1.00→1.02 and 6 px.
- **Arrow:** straight-pointer. It draws f143–150, breathes 2 px while held, and retracts tip→tail on exit.
- **Assets:** BTL `unit_cut.png`
- ⚠ the chip wording

#### B03 · 6.66–10.95 s · f160–262
- **Said:** "why we include the **mind** in our **approach** to your total **skin** health."
- **Noun:** the chain mind → our approach → your skin (the flow Naim liked).
- **Concepts:**
  1. A flow diagram built in place, nodes arriving on their names, with real arrows (`flow-diagram-build`, evident_yt GMu3uTEDzn0 f383–1042; `arrow-curved-callout` f392–404).
  2. A route traced leg by leg across three windows (`arrow-route-trace`, evident Ddos1QZRGmV f216–250).
  3. A network of nodes with a focus pull on "mind" (`network-node-graph`, evident_yt 2_e5sGWXtOo f44–824).
- **Pick: 1.** He states a three-step relationship in order, and a flow diagram is the reference device for exactly that.
  - Arrow #1's tail starts **on his own head** (track `headTop`): the mind is literally his.
  - Each node: glass head (mind), the practice's coil-arm photo IMG_3712 (our approach), a BTL skin close-up (your skin).
- **Better than v4.1 s2 / the storyboard Thread:**
  - v4.1 had a 9 px blue dot travelling a bezier, the Toggle, and 2 s Tags.
  - v6 has three headed curved arrows, each drawn in **7 f** on its word +1 (f188 / f201 / f231). Every arrival is visible, on the word, and has a direction.
- **Devices:** `flow-diagram-build` (partial) + `arrow-curved-callout` (partial: built new in `Arrow.tsx`, never with a bead)
- **Entry:** `type-ghost-to-lit`. "total skin health" is set dim, and each word lights in 1 f on its onset (WZjqgyXpk0A f238–263).
- **Immersion:** masked card. The round windows drift 1.5 % and 6–10 px, out of phase.
- **Arrow:** curved-callout, with a ≤ 2 px breathe while held. On exit it retracts tail-first.
- **Assets:**
  - Flora glass head (AI shot)
  - clinic IMG_3712 (P0006 consent unknown)
  - BTL Female-Model_1012 crop
- **On screen:** "Exomind does not directly treat skin conditions."

### S1 · Your questions (section card 01, f263–292)

#### B04 · 10.96–17.21 s · f263–413
- **Said:** "Your questions are an important part of this conversation, and I appreciate your interest in learning more about your care."
- **Noun:** the conversation: a real consultation in his office.
- **Concepts:**
  1. A footage card grows to full frame and back (`card-full-morph`, newapology §3B; MOTION §4.2 `morph` 26 f).
  2. The consult in a credited rounded window (`windowed-footage`, evident Ddos1QZRGmV f2007–2214).
  3. Quote cards from real questions pushed in from the right (`quote-card-carousel`, evident_yt liXI5YR96w4 f3958–4288).
- **Pick: 1.** "This conversation" *is* a consultation, and the practice filmed one (Nov 5 raw consult, Ostad + P0001).
  - Growing it to full frame is the one designed transition in the section, and it means something: we step into the room. Option 3 suits B09's question box better.
- **Better than v4.1 s3:** v4.1 had a "The Exomind coil" dot callout and a session-timer pill on his raw panel. v6 shows a real two-way consult full frame for 72 f (f314–386), where v4.1 s3 kept him in a raw panel beside a window.
- **Devices:** `card-full-morph` (never)
- **Entry:** `type-scale-pop` ("In our office" chip, 5 f)
- **Immersion:** full-bleed, with the footage pushing 1.00→1.04. Ostad appears in the footage itself; the keyed look fades 5 f out and back.
- **Arrow:** none
- **Assets:** clinic Nov 5 consult (P0001 consent unknown)

#### B05 · 17.25–22.74 s · f414–545
- **Said:** "We'll notify our giveaway winners by **email** or **phone**, so please keep an eye out for **messages** from our team."
- **Noun:** the notification: an email and a phone call from the team.
- **Concepts:**
  1. Frosted panels floating in depth around the presenter (`spatial-glass-ui`, ro _MAYscxxhDE f746–812).
  2. Notification tiles sliding into a ranked row (`tier-tile-grid`, ig_DfTeuSYK23y f240–287).
  3. An email card arriving beside him (`phone-message-arrives` style, glp1 f860–950).
- **Pick: 1.** Two channels (email and phone) need two objects, and placing them at two depths makes the frame spatial instead of one card. Option 3 would pre-empt B06's phone.
- **Better than v4.1 #12–14:** v4.1 had "Giveaway winners" as Kinetic inside `life()` (the doubled F04 entry) plus two chips. v6 lands each channel on its word (f460 / f473) with a **9 f** side slide, against v4.1's **48 f** fade.
- **Devices:** `spatial-glass-ui` (partial)
- **Entry:** `type-slide-side` (9 f, 3.4 % H)
- **Immersion:** depth push. The near panels drift 12 px/s and the far one 5 px/s.
- **Arrow:** none
- **Assets:** built UI

#### B06 · 22.77–27.79 s · f546–666 (F04 S4, the moment Naim named)
- **Said:** "Please also **check** your **text messages** after the event. If you would like to **schedule** a consultation,"
- **Noun:** a phone, with a text from the practice arriving.
- **Concepts:**
  1. A message card arriving on a glass phone: plate, sender, then line by line (`phone-message-arrives` + `type-message-lines`, glp1 f860–950).
  2. An arc connector from the practice to a phone with an icon riding it (`arrow-arc-connector`, D_bh30x6w9c f1102–1140).
  3. A waveform-style live transcript of the message (`audio-waveform-transcript`, Ik5Zt8oGko4 f1790–2710).
- **Pick: 1.** It is the exact object DESIGN_PER_BEAT asks for ("a phone with a message arriving"), with the measured glp1 timing.
- **Better than v4.1 #15 (F04):**
  - Plate lands in **4 f on "check" + 1 (f582)** vs **47.8 f starting 33 f early**.
  - Lines are 5–6 f apart vs a **1 f** stagger, and each fades in 4 f with a 1 % H rise vs a 40 px drift.
  - No grey ghost frames: v4.1 had 20 f at 0.3–0.7 opacity.
- **Devices:** `phone-message-arrives` (partial: `Exo.tsx Phone` is a sleep-trend phone, so this is new)
- **Entry:** `type-message-lines` (never)
- **Immersion:** depth push. The phone tilts −8° ± 1.5° and the layer pushes 1.00→1.03.
- **Arrow:** none
- **Assets:** built (sender "Dr. Ostad's office")

#### B07 · 27.79–31.25 s · f667–750
- **Said:** "you can **reply** to our **text** and we'll help you **find** an **appointment**."
- **Noun:** the reply, and the appointment slot.
- **Concepts:**
  1. Split phone | calendar. The reply rides an arc from the phone to a slot, which gets circled (`arrow-arc-connector`, D_bh30x6w9c f1108–1140; `calendar-date-circle`, Are.na 31223791).
  2. A calendar filling day by day (Ro `Calendar`, ROS f522). That is the rosacea graphic, so it is **not reused** (rule 2).
  3. A booking checklist ticking (`checklist-ledger`, DDOS f1686–1745).
- **Pick: 1.** It continues B06's phone and shows the action (reply → slot). The circle on the slot is the rosacea "circle the exact spot" method, applied to time.
  - The calendar has no real dates: a generic week, labelled "Illustration".
- **Better than v4.1 #18–21:** v4.1 had three chat bubbles fading 0.35 s, then "Booked". v6's arc **travels from the reply to the slot** (26 f, D_bh), so cause and effect is one motion. The circle lands on "appointment" + 1 (f733).
- **Devices:** `arrow-arc-connector` (partial) + `calendar-date-circle` (partial)
- **Entry:** `type-typewriter` (3.9 chars/f, linear, DDOS f1539–1556)
- **Immersion:** split
- **Arrow:** arc-connector, with a 1.5 px breathe while held. It retracts along its path on exit.
- **Assets:** built

#### B08 · 31.29–37.17 s · f751–892
- **Said:** "During your visit, we'll discuss your **goals**, review your **medical history**, and determine whether **ExoMind** is **appropriate** for you."
- **Noun:** the intake form / medical history.
- **Concepts:**
  1. A form slides up, then fills field by field after each word (`intake-form-fill`, evident_yt liXI5YR96w4 f3601–3928).
  2. A document dimmed with one line lit (`document-isolate`, iZ4ljC_4Rb4 f567).
  3. A ruled checklist that wipes row by row (`checklist-ledger`, DDOS f1686–1745).
- **Pick: 1.** DESIGN_PER_BEAT names it ("medical history → a chart or intake form"), and the three spoken items map onto the form's three fields. The highlighter sweep lands on "medical history".
  - The rows "Current medications / Implanted devices / Medical conditions" come from the practice page's TMS caveat.
- **Better than v4.1 #22–25:** v4.1 had three dim rows lit on a 2 s ease. v6 has a real form: fields fill **+16 f** after their words (the G4 measure), a 16 f highlighter is on the spoken phrase, and a camera push follows the active field.
- **Devices:** `intake-form-fill` (never)
- **Entry:** `type-highlight-sweep` (16 f, `sweep`)
- **Immersion:** camera move (push 1.00→1.06, following the field)
- **Arrow:** none
- **Assets:** built
- ⚠ the practice caveat "Certain medical conditions, implanted devices, or other circumstances may make TMS inappropriate."

### S2 · Before you go (section card 02, f893–922)

#### B09 · 37.21–41.50 s · f893–996
- **Said:** "Before you go, please stay with us and continue sending your **questions** throughout the **question** box."
- **Noun:** the live question box.
- **Concepts:**
  1. Question cards pushed in from the right, each with a phrase highlight (`quote-card-carousel`, liXI5YR96w4 f3958–4288).
  2. A headline card that cuts in and keeps rising (`type-card-rise`, colin DZiJljQJEKN f46–64).
  3. Typewriter text in a box (v4.1 #27). That is our own earlier graphic, so it is not reused.
- **Pick: 1.** A live Q&A box filling with the questions people actually ask makes it a webinar (Naim: "not webinar enough"). The three questions are the **brochure FAQ headings**: "Does it hurt?", "Will it disrupt my daily life?", "Is Exomind right for me?". No answers are given, so no claims are made.
- **Better than v4.1 #26–28:** v4.1 had a static card plus one typed question. v6 has **3 questions on their words** (f933 / f954 / f975), each card rising 10.7 % H in 17 f (the measured colin curve) and still drifting.
- **Devices:** `quote-card-carousel` (never)
- **Entry:** `type-card-rise`
- **Immersion:** masked card
- **Arrow:** none
- **Assets:** built (credit: Exomind patient brochure FAQ)

#### B10 · 41.54–45.00 s · f997–1080
- **Said:** "If there's something we **haven't covered**, I'd love to **hear** about it."
- **Noun:** what tonight covered, and the gap left open.
- **Concepts:**
  1. A "Tonight" ledger of what was covered, each row with a thumbnail of this edit's own object, and one empty row for "Your question" (`checklist-ledger`, DDOS f1686–1745).
  2. An empty question card with the input open (a phone-style message, glp1 f860).
  3. A dashed blank node added to the B03 flow (`flow-diagram-build`, GMu3 f383).
- **Pick: 1.** "Something we haven't covered" is literally a gap in a list. The thumbnails make it a recap object, not a text block.
- **Better than v4.1 #29:** v4.1 had "Something we haven't covered?" as a 2 s fade line. v6's rows wipe in **14 f** with ticks +1 f, and the empty row arrives on "haven't" + 1 (f1022).
- **Devices:** `checklist-ledger` (partial)
- **Entry:** `type-slide-side`
- **Immersion:** camera move (0.8 % drift)
- **Arrow:** none
- **Assets:** built

#### B11 · 45.04–49.13 s · f1081–1179
- **Said:** "Thank you again for joining us and trusting our **team** with your care."
- **Noun:** our team.
- **Concepts:**
  1. The practice's team footage in a rounded, credited window (`windowed-footage`, DDOS f2007–2214).
  2. Staff photos as person cards (`person-id-card`, tqxCIKD2Bb0 f1010–1326). We have no named staff stills or releases.
  3. A footage wall that tiles in (`footage-wall`, tQkjtXJEtxY f505–581).
- **Pick: 1.** It's the only real team footage we have (`clips/office_team.mp4`), so it is honest and simple, after a dense run.
- **Better than v4.1 #30:** v4.1 had a "Thank you" text swap. v6 shows the people he thanks, with "Our team" on "team" + 1 (f1158) in 5 f.
- **Devices:** `windowed-footage` (yes)
- **Entry:** `type-word-fade-rise`
- **Immersion:** masked card (push 1.00→1.05, drift 8 px)
- **Arrow:** none
- **Assets:** practice footage (staff release unknown)

#### B12 · 49.17–51.71 s · f1180–1241 · ExoMind-only animation **session-timeline**
- **Said:** "We look forward to **seeing** you **in** the **office**, and"
- **Noun:** a session in the office: coil on the head, console running.
- **Concepts:**
  1. The practice's own session photo full frame, with Ostad in a pip circle and a session timeline ticking along the bottom (`portrait-pip-circle`, drjc DYI5TbdvR3U f225; `timeline-markers`, Are.na 16463981; `arrow-marker-tick`, WZ f940–944).
  2. A loupe on the console timer (`loupe-zoom`, 5J8M96aZYYg f1168). That makes 24:30 read as a claim.
  3. A ring on the coil pad (ROS f235 method).
- **Pick: 1.** "In the office" is a place, and IMG_3714 is that place in use. The full-bleed takeover with 2.5D depth is the most immersive frame in the edit.
  - The timeline (arrive → session → walk out) tells you what a visit is, in three markers on "seeing / in / office".
- **Better than v4.1 s7:** v4.1 had stock b-roll (stressed, couch) plus a dot callout "An Exomind session". v6 uses the practice's real session photo at **100 % fill** with 3 depth layers moving at 1.0 / 0.6 / 0.3. Markers pop in 1 f on their words.
- **Devices:** `portrait-pip-circle` (never) + `timeline-markers` (partial) + `arrow-marker-tick` (never)
- **Entry:** `type-scale-pop`
- **Immersion:** full-bleed (depth push inside it)
- **Arrow:** marker-tick
- **Assets:** clinic IMG_3714 (P0006 consent unknown)
- ⚠ "about 20–30 min": the brochure says under 30 min, the practice page about 20 min. The client confirms.

### S3 · Total skin health (section card 03, f1242–1271)

#### B13 · 51.75–57.42 s · f1242–1378
- **Said:** "again, I am so excited in creating this **comprehensive** approach to **total skin health**. For me,"
- **Noun:** "comprehensive": the full circle of skin care, treatments and the mind.
- **Concepts:**
  1. A ring that fills clockwise segment by segment and closes (`donut-ring-fill`, GRMVbXpO1jQ f889), with labels fanning out on an arc (`type-orbit-labels`, glp1 f622–644).
  2. Tiles sliding into a row (`tier-tile-grid`, DfTeuSYK23y f240).
  3. Bars building (`bar-build`, DDOS f421–693). There's no data, so it's wrong for this.
- **Pick: 1.** "Comprehensive" means complete, and a ring that closes on the word is that meaning as motion. Image chips (BTL skin, the clinic coil, the glass head) keep it literal.
- **Better than v4.1 #33–38:** v4.1 had Kinetic "A comprehensive approach to" plus three icon labels on 2 s fades. v6's ring **closes on "comprehensive" + 1 (f1300)**, and the labels fan out in 9 f with a 2 f stagger.
- **Devices:** `donut-ring-fill` (partial)
- **Entry:** `type-orbit-labels` (never)
- **Immersion:** camera move (ring rotates 2°/s, push 1.00→1.03)
- **Arrow:** none
- **Assets:** BTL Female-Model3_0249, clinic IMG_3712, Flora head (AI)
- **On screen:** "Exomind does not directly treat skin conditions."

#### B14 · 57.46–60.33 s · f1379–1448 · TEXT-ONLY (1 of 2)
- **Said:** "it's about really being at the next **frontier** of"
- **Noun:** "the next frontier". The words themselves are the point.
- **Concepts:**
  1. Asterisks resolve into "The next frontier" (`type-name-decode`, FWfMMmC6mzE f960–1029).
  2. A highlighter sweep behind the phrase (`type-highlight-sweep`, DDOS f27–47).
  3. A giant word behind him (`wordmark-depth-sandwich`). It would repeat the B01 title tile.
- **Pick: 1.** A frontier is something not yet known, and the decode shows it becoming known, with the last letter landing on "frontier" + 1 (f1419). A horizon hairline draws under it.
- **Better than v4.1 #39:** v4.1 had "The next frontier" as a 48 f Kinetic fade. v6 resolves over 40 f, **ending on the word**, so the type finishes with him instead of 33 f ahead.
- **Devices:** `type-name-decode` (never)
- **Entry:** `type-name-decode`
- **Immersion:** camera move (push 1.00→1.04)
- **Arrow:** none
- **Assets:** built

#### B15 · 60.37–66.62 s · f1449–1599
- **Said:** "taking care of one's skin **beyond** just the sort of **classic** treatments that are available"
- **Noun:** classic treatments vs beyond (the mind).
- **Concepts:**
  1. A labelled split, never a slider, with a line wipe (`split-labelled`, yA0gele-Nmo f494–583; oomds0rZz_o f118).
  2. A strike on "classic" replaced by "beyond" (`type-strike-replace`, D_bh30x6w9c f3350). That would be wrong: classic treatments aren't wrong.
  3. A tile row, classic → beyond (`tier-tile-grid`).
- **Pick: 1.** Two states side by side, opened by a line wipe on "beyond". The left is the practice's real treatment footage; the right is the glass head.
- **Better than v4.1 #40–42:** v4.1 had a text swap, "Caring for the skin" → "Classic treatments", plus a "Beyond" label. v6 shows **both worlds as pictures** (100 % of the graphic area is image vs v4.1's text lines), with labels in 11 f on their words.
- **Devices:** `split-labelled` (partial)
- **Entry:** `type-rise` (4.2 % H in 11 f)
- **Immersion:** split
- **Arrow:** none
- **Assets:** `clips/office_treat.mp4` (practice; check for a patient in frame), Flora head (AI)

#### B16 · 66.67–71.21 s · f1600–1709
- **Said:** "helping you become aware of how our **emotions** improve our **skin**,"
- **Noun:** emotions (the head) → skin.
- **Concepts:**
  1. A glowing ribbon that orbits his head, passing behind him through the matte, then peels off to land on a skin card (`arrow-light-ribbon`, glp1 f1100–1170).
  2. Stress/calm tags (v4.1 #43–44). Naim removed them.
  3. A ribbon on a model portrait. That would repeat B20's portrait.
- **Pick: 1.** The emotions are *his*, so the ribbon wraps his head (head-tracked, above the brow, never on his face) and carries the link to the skin. It never stops moving, which is the "stays alive" rule.
- **Better than v4.1 #43–45:** v4.1 had three text tags. v6 draws the link as one continuous motion (28 f per pass, the glp1 measure), head-tracked, at depth: it passes behind him.
- **Devices:** `arrow-light-ribbon` (never)
- **Entry:** `type-highlight-sweep` (on "Emotions")
- **Immersion:** depth push (the ribbon in two depth layers around the matte)
- **Arrow:** light-ribbon
- **Assets:** matte, BTL Female-Model3_0081 skin crop
- ⚠ "emotions improve our skin" is his line about the mind–skin link, not an Exomind claim.

### S4 · The technology (section card 04, f1710–1739)

#### B17 · 71.25–75.42 s · f1710–1810 · ExoMind-only animation **field-through-skull**
- **Said:** "and if there's **technology** that can actually **help create neuroplasticity**,"
- **Noun:** the coil's magnetic field passing through the skull into the region it targets.
- **Concepts:**
  1. A glass head in profile; the applicator descends onto the forehead, dashed orbit arcs carry the field through the skull, and the region under the coil lights (gold pick GOLD f1325–1475; `arrow-orbit-arc`, DYKh5yyPxxg f1200–1264; `region-light-on-model`, DdrkdrYv-yW f600–660).
  2. The MOA film coil shot as is (MOA 47–55 s). It's real, but it shows the burned-in subtitles and nothing is ours.
  3. A step player, coil → pulse (v4.1 s11). Rejected UI.
- **Pick: 1.** It's what the gold pick shows at 0:56: the coil lands, then the field shows *under* the coil. It's rebuilt in our cream / white-glass palette, with the field drawn as orbit arcs that keep pulsing.
- **Better than v4.1 s11 (Flora head clip + StepPlayer + HeadNotes dot leaders):**
  - The field and target are shown **in one frame** with a headed arc system (not a dot leader).
  - It's full-bleed (100 % vs v4.1's window), and the region lights on "neuroplasticity" + 1 (f1776).
- **Devices:** `region-light-on-model` (never) + `arrow-orbit-arc` (never)
- **Entry:** `type-box-slam` ("Prefrontal cortex")
- **Immersion:** full-bleed, Ostad out
- **Arrow:** orbit-arc
- **Assets:** Flora `head_B_glass_skull.png` (AI), BTL Applicator_0429 cut-out, gold-pick reference
- **Labels:** "Conceptual depiction. Results may vary."
- ⚠ the region name

#### B18 · 75.46–77.04 s · f1811–1849 · ExoMind-only animation **rewire-trace**
- **Said:** "**rewire** the **brain**,"
- **Noun:** a new connection forming between neurons.
- **Concepts:**
  1. The MOA film's neuron shot with a path traced along a dendrite, head at the end (`mechanism-on-real-image`, IkrWPG3HGD8 f610–880; `arrow-route-trace`, DDOS f216–250).
  2. A drawn node graph rewiring (`network-node-graph`). That's the rejected drawn look.
  3. GOLD f1250–1312: orange signals travel the dendrites. It's BTL's own shot and we can't add to it.
- **Pick: 1.** Real (licensed) imagery and one traced path on "rewire" + 1. The chip says "Neural connectivity", the brochure's own wording.
- **Better than v4.1 #59–60:** v4.1 showed "+24 New connections", an unsourced counter. v6 shows a connection, makes no number claim, and uses the brochure wording. The trace takes 27 f with its peak at 44 % (DDOS).
- **Devices:** `mechanism-on-real-image` (partial) + `arrow-route-trace` (partial)
- **Entry:** `type-scale-pop`. B17 is box-slam and B19 ghost-to-lit, so there's no consecutive repeat.
- **Immersion:** full-bleed, Ostad out
- **Arrow:** route-trace
- **Assets:** MOA 59.0–60.6 s (subtitle band hidden)
- **Labels:** "Conceptual depiction. Results may vary."
- ⚠

#### B19 · 77.08–82.75 s · f1850–1986 · ExoMind-only animation **pulse-train-synapse**
- **Said:** "increase proper **neurotransmitter** production where we can actually be more **focused** in **flow** and"
- **Noun:** the pulse train releasing neurotransmitters at a synapse.
- **Concepts:**
  1. A frosted topic panel: a pulse-train strip on top and a synapse below, where each pulse releases vesicles across the cleft. A jittery trace settles to a calm wave on "focused" (`topic-glass-panel`, the rosacea method ROS f795–862, new content; `noise-clears`, DDOS B23).
  2. The MOA film neuron firing (MOA 56–63 s). Already used in B18.
  3. A bar chart of neurotransmitters (`bar-build`). There's no data.
- **Pick: 1.** This is the ExoMind counterpart of the gut panel. The rosacea panel removed half the microbes to show what antibiotics do. This one **adds** vesicles in rhythm to show what repeated pulses do, and settles the trace to show "focused, in flow". Same method, a different graphic (rule 2): no tube, no microbes, no × button.
- **Better than v4.1 #61 + neuro_anim clip:** v4.1 had "Neurotransmitters in balance" as a 2 s text over an AI neuron loop. v6 makes the mechanism **readable in one 5.7 s panel**: pulse → release → calm. The release is locked to a 12 f rhythm from "neurotransmitter" + 1 (f1877), and the calm lands on "focused" + 1 (f1939).
- **Devices:** `topic-glass-panel` (yes, as a method) + `noise-clears` (partial)
- **Entry:** `type-ghost-to-lit`
- **Immersion:** masked card (the panel drifts ±4 px; the pulses never stop)
- **Arrow:** none
- **Assets:** built
- **Labels:** "Conceptual depiction. Results may vary."
- ⚠ "neurotransmitter production" and "focused, in flow" are his words, not brochure claims.

#### B20 · 82.79–87.13 s · f1987–2091
- **Said:** "help us just **feel better** and how that can actually **translate** into **better skin**. Thank you."
- **Noun:** feeling better → the skin (his closing link).
- **Concepts:**
  1. A portrait card. On "translate", a zoom box frames her cheek and the inset scales out on a dashed flow arrow (`zoom-box-inset`, Ik5Zt8oGko4 f1245–1399; `arrow-dashed-flow`, GMu3 f448–472).
  2. Rebuild B03's chain with a new last node. That would be the same tile twice (DESIGN_PER_BEAT §6.2).
  3. The patient quote "It quiets my brain" (v4.1 #64–68). That's v4.1's beat, and a patient line next to a skin line reads as a claim.
- **Pick: 1.** It moves from the person (feel better) to her skin (the inset) in one camera pull-back. The disclaimer sits under the second line.
- **Better than v4.1 #64–71:** v4.1 had a colour-flip quote plus two nodes lit on a 2 s ease. v6 makes the link a spatial move (box → inset on a dashed arrow, 8 f reveal, head lands last), with lines accumulating on their words (f2012 / f2061).
- **Devices:** `zoom-box-inset` (never) + `arrow-dashed-flow` (partial)
- **Entry:** `type-line-accumulate`
- **Immersion:** camera move (pull back 1.06→1.00)
- **Arrow:** dashed-flow
- **Assets:** BTL Female-Model5_0251
- **On screen:** "Exomind does not directly treat skin conditions."
- ⚠ "translate into better skin"

**End card · 87.17–90.23 s · f2092–2166.** A glass card: "Book a consultation. / Dr. Ariel Ostad / Link in the description."
- No "Book now" press animation: v4.1's press UI is removed.

---

## 3. For the client (approval items)

**Patient and practice images:**
- clinic IMG_3712 (B03, B13) and IMG_3714 (B12): P0006, consent unknown.
- Nov 5 consult (B04): P0001, consent unknown.
- `office_team.mp4` (B11): staff release.
- `office_treat.mp4` (B15): check for a patient in frame.

**BTL licensed:**
- unit cut-out (B02)
- Female-Model_1012, 3_0249, 3_0081, 5_0251 (B03, B13, B16, B20)
- Applicator_0429 (B17)
- MOA film 59.0–60.6 s (B18)

**AI-generated shots (Flora):** none after gap round 1 (the glass head and glass skull were replaced by real practice and BTL imagery).

**Added in gap round 1 (client approval):**
- clinic-library row 741: the "after" half of a cheek before/after, lower face only, no patient code (B03). Patient image: needs consent.
- clinic-library rows 3601 (treatment room, B08), 3612 (reception, S3), 3614 (waiting room, S2): practice photos, no people.
- `yt/session.mp4` full frame (B12) and IMG_3714 (B12): P0006, consent unknown.
- `clinic/p0001_quiet.mp4` full height (B20): P0001, consent unknown.
- BTL: Applicator_0108 (B15), MOA film 49.0 s (B17), 74.6 s (B19), the lit brain at 98 s (B13 chip).
- Citation on screen (B16): Kabat-Zinn et al., Psychosomatic Medicine 1998 ⚠ physician-check the wording.

**⚠ physician-check lines:** the FDA chip (B02), the mind–skin framing (B03), the TMS caveat (B08), session length (B12), "emotions improve our skin" (B16), the region name (B17), "rewire / neural connectivity" (B18), "neurotransmitter production / focused, in flow" (B19), "translate into better skin" (B20).

## 4. variety_check output

```
variety_check: research\ostad\style\exomind\beats.json (20 beats, 90.2 s), library 79 ids
  PASS  R1 device used <= 2x: max uses 1
  PASS  R2 no entry on consecutive beats: 13 distinct entries
  PASS  R3 text-only <= 20 % and <= 1 in 5: 2/20 = 10%
  PASS  R4 >= 6 distinct devices per 60 s: worst 60 s window 16 (from 11 s); total 30 distinct, need >= 10
  PASS  R5 >= 3 never-built devices: 12: arrow-light-ribbon, arrow-marker-tick, arrow-orbit-arc, arrow-straight-pointer, card-full-morph, intake-form-fill, portrait-pip-circle, quote-card-carousel, region-light-on-model, type-name-decode, wordmark-depth-sandwich, zoom-box-inset
  PASS  R6 no dot-and-line callout: none
  PASS  R7 ids exist, never_built flags agree: ok
  PASS  R8 title + section card at every turn + end card: title True; sections 5 / cards 4; missing []; one card look True; end True
  PASS  R9 one keyed presentation, steps out only for full-bleed: modes ['camera move', 'depth push', 'full-bleed', 'masked card', 'split']; full-bleed beats 4
  PASS  R10 beats ordered, no overlap, inside the edit: 20 beats
  PASS  R11 compliance labels + >= 3 ExoMind-only animations: disclaimer on ['B03', 'B13', 'B20']; MOA unlabelled []; ExoMind-only ['field-through-skull', 'pulse-train-synapse', 'rewire-trace', 'session-timeline']
  PASS  R12 arrow variants backed by an arrow device: ok
variety_check: PASS
```
