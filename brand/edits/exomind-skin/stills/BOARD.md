# Exomind / total skin health: explainer ideas, three looks each (stills)

Still frames only. Nothing here is animated yet: the client picks one look per idea, and only that look gets built. Each still shows the **mid-reveal state**, the frame you'd see partway through the build, with the caption that would be on screen at that moment.

- **Composition:** `IdeaStills` (`brand/remotion/src/IdeaStills.tsx`, registered in `Root.tsx`), props `{idea, look}`, 1920x1080.
- **Render:** `cd brand/remotion && bash scripts/idea_stills.sh`. This writes `idea<N>_look<A|B|C>.png` here.
- **Boards:** `python brand/scripts/idea_boards.py`. This writes `board_idea<N>.png` here, with the three looks side by side.
- **Gitignored:** the PNGs (BTL, Flora and practice footage) and the source frames in `brand/remotion/public/exomind-skin/ideas/`. Only this file and the code are committed.
- **Type:** `TYPEFACE` in `components/YT.tsx`, currently NHG Display 500. Flipping it to `"helvetica"` switches every still to Helvetica Neue LT Pro 65 Medium.
- **Colour:** room canvas (`Canvas`, with the neural field off and the bottom strip cropped out) or navy `#202532`. The neutral data colours are slate `#5b6f8a` and brand blue `#37a9e8`. The one accent is ice blue `#cfe9f7` (highlighter `#c4e4f8`), used only on the punchline. No green.
- **Captions:** word by word at y 950 in the OstadYT caption zone, with nothing else in that band. The only exception is idea 4, where captions are hidden because the karaoke line is the caption (Evident R19).
- **Timestamps:** edit time in the delivered OstadYT cut (1.15x), from `props_yt.json` captions / `yt_words.json` onsets.
- **"Read-out":** `research/ostad/style/read/ig_Ddos1QZRGmV.md`. Frame counts there are at 30 fps; OstadYT runs at 24 fps, so durations below are given in seconds and in 24 fps frames.

**Transcript gaps, flagged honestly.**
- He never says "stress", "cortisol", "inflammation", "prefrontal cortex" or "sessions" in this recording.
- Ideas 1, 2 and 5 are tied to the nearest line he does say, listed below. Idea 1's chain and idea 2's anatomy label are explanatory additions, so the client should approve them as an addition or drop them to his words only.
- The R1 rule is "graphics only for what's said". Ideas 3, 4 and 6 are fully on his words.

**Sourced figures (verified on PubMed via NCBI E-utilities, 2026-11-16).**
- **Dalgard FJ et al.** "The psychological burden of skin diseases: a cross-sectional multicenter study among dermatological out-patients in 13 European countries." *J Invest Dermatol* 2015;135(4):984-991. PMID 25521458. https://pubmed.ncbi.nlm.nih.gov/25521458/
  - Clinical anxiety: 17.2 % of patients vs 11.1 % of controls (OR 2.18, 1.68-2.82).
  - Clinical depression: 10.1 % vs 4.3 % (OR 2.40, 1.67-3.47).
  - 3,635 patients and 1,359 controls. Used in 6C.
- **Margetis K, Vadakekut ES.** "Neuroplasticity." *StatPearls*, 2026. PMID 32491743. https://pubmed.ncbi.nlm.nih.gov/32491743/
  - Definition quoted verbatim: "the ability of the nervous system to change its activity in response to intrinsic or extrinsic stimuli by reorganizing its structure, functions, or connections." Used in 3C.
- **Chen Y, Lyga J.** "Brain-skin connection: stress, inflammation and skin aging." *Inflamm Allergy Drug Targets* 2014;13(3):177-90. PMID 24853682. https://pubmed.ncbi.nlm.nih.gov/24853682/
  - A review cited for the stress-to-inflammation link. No number is taken from it. Used in 1A and 1C.

**Not used.** Exomind's FDA clearance is claimed by BTL's own press release, but it wasn't found in an FDA database record. It is not put on any frame. Every other number slot is a bracketed `[cited figure]`.

---

## Idea 1: Stress to skin

- **Spoken:** "...helping you become aware of how our emotions improve our skin," (66.70-70.66 s; "emotions" 68.94, "skin" 70.66). The chain stress → cortisol → inflammation is **not spoken** (see the gaps above).
- **Evident technique:** build in place on one scene (read-out §5 R4/R5, B05 366-693). The accent colour reserved for the last element delivers the point (R7; B05d lime bar 619). Line trace on a real image (§6 idea 3, B03 216-250).

| Look | What it does |
|---|---|
| A: flat chain on the room canvas | Three words on one baseline: Stress → Cortisol → Inflammation, each with a one-line gloss. A rule grows under the chain to each stage. Inflammation lands last, with the ice highlighter mid-sweep. Review source line underneath. |
| B: trace on the condition image | The Flora skin macro (AI render, labelled) is full bleed. An ice/white stroke traces the edge of the red patch, its tail still drawing, with a small "Inflammation" label. Top left: "Stress → cortisol → inflammation", the last word highlighted. Markup goes on the condition image, never a face. |
| C: full-bleed type on navy | Three words stacked at 176 px. Stress and Cortisol are slate, and Inflammation lights in ice. Small caps glosses sit beside them. No image. |

- **Animation (24 fps):**
  - **A:** each word cuts on +1 f after its onset (R2). The rule grows with an ease-in-out cubic over 0.8 s (19 f) per stage, peaking at about 45 % (Moment B curve). The highlighter sweeps "Inflammation" in 0.67 s (16 f), cubic in-out, peaking at 44 % of its duration, stepped on 2s (Moment A).
  - **B:** the trace draws over 1.1 s (27 f; B03 34 f at 30 fps) clockwise, then its tail erases. The label pops in 2-3 f.
  - **C:** each word changes from dim to its colour on its onset frame (karaoke ±1 f, B26).

## Idea 2: The coil to the prefrontal cortex

- **Spoken:** "and if there's technology that can actually help create neuroplasticity," (70.86-73.96 s; "technology" 71.64). "Prefrontal cortex" is BTL's term from their film, not his (see the gaps above).
- **Evident technique:** line trace (B03 216-250); stepped punch-in into the key area (B09 1016-1026, R16); typed callout (B09 1026-1085). No drawn anatomy: the head is the Flora render (DECISIONS 14d rule 6).

| Look | What it does |
|---|---|
| A: path traced on the Flora glass head | `head_final_anim` end frame, full bleed. A brand-blue path runs from the coil pad into the frontal lobe and ends in a ring (blue, not ice: the coil's glow is ice-white and swallowed an ice ring). A hairline leader goes to "Prefrontal cortex", in the empty left third. "Exomind coil" is labelled. |
| B: pulse on a real BTL frame | The BTL film model with the real coil on her head (navy studio). Three arcs travel down from the coil into the scalp, the last still drawing in ice. A leader goes to "Magnetic pulse / to the prefrontal cortex" on the empty navy side. Credited BTL. |
| C: type-led, punched-in window | Room canvas, type first: "The coil sits over / the **prefrontal cortex**" (highlighted), and "the front of the brain, behind the forehead". On the right, the Flora head sits in a rounded window (radius 2 % of width) already punched in 1.2x on the frontal lobe, with a brand-blue ring on the target. |

- **Animation:**
  - **A:** the path draws over 0.6 s (14 f) on "technology", then the ring settles in 5-6 f (the median element settle). The label types on with the words, about 1 char per frame (B14 1540-1556).
  - **B:** the arcs follow 0.25 s apart, each drawn in 8 f, ease-in-out. Footage stays at 24 fps; only the graphics step on 2s (R11, A/B test).
  - **C:** a stepped punch-in from 1.0 to 1.2x in 8 f (B09's 10 f at 30 fps), inside our 1.1-1.2x cap. The highlighter is 16 f.

## Idea 3: Neuroplasticity

- **Spoken:** "actually help create neuroplasticity," (72.52-73.96 s; "neuroplasticity" 73.96) then "rewire the brain," (75.50-76.08 s).
- **Evident technique:** counters, with bar height = the number (B07a 763-798, R10), as before/after bars (§6 idea 6, B14). A document crop with a highlighter (B11-B18, R9). Credit every borrowed image (R13).

| Look | What it does |
|---|---|
| A: junctions ringed on `neuro_anim` | The Flora neurons at their connected end, full bleed. Each newly lit junction gets a thin ring as it lights: four are in and the fifth is mid-ring. "New connection" labels one. Top left: "Neuroplasticity", plus "New connections: [cited figure]". |
| B: before / after windows + bars | Navy. `neuro_anim` start (sparse) and end (connected) frames in two rounded windows, "Before" and "After". The bars below are dashed outlines reading **[cited figure]**: no length is drawn until a primary source gives one. |
| C: document crop + highlighter | The StatPearls definition set as a flat paper crop (serif, no shadow) over the defocused neurons. "reorganizing its structure, functions, or connections." is lit in ice on "rewire". Full citation below. |

- **Animation:**
  - **A:** the clip plays at 1.3x (as in OstadYT). Each ring draws in 6 f when its junction lights, nearest-frame with no blending.
  - **B:** the windows cut in hard (R17, no crossfade). When a figure exists, bars ease in-out over 1.1 s (26 f), peaking at 45 %. Counters run linear and finish 2 f after the bar (Moment B).
  - **C:** defocus-to-focus on the background in 6 f (B21's 7 f), then the highlighter sweeps on "rewire" (75.50) in 16 f, line by line.

## Idea 4: Total skin health (his thesis)

- **Spoken:** "and again, I am so excited in creating this comprehensive approach to total skin health." (51.58-56.34 s; "this" 53.80, "comprehensive" 54.12, "approach" 54.86, "to" 55.32, "total" 55.64, "skin" 56.00, "health." 56.34). He also says it as "...our approach to your total skin health." at 8.98-9.88 s.
- **Evident technique:** the karaoke quote: the whole statement is laid out dim and each word lights on its onset, ±1 f (B26 2595-2821, R19). Captions are hidden during it. The highlighter is on the punch phrase (B01 27-47).

| Look | What it does |
|---|---|
| A: karaoke line on the room canvas | "this comprehensive approach / to total skin health." at 112 px with "Dr. Ariel Ostad · Dermatologist" above. Mid-reveal: through "total" is lit, "total" sits on the ice highlighter, and "skin health." is still dim. |
| B: beside his own shot | His real (unkeyed) shot at that moment in a 4:5 rounded panel on the right. The same karaoke line, smaller, sits in the room on the left (B01: type beside the presenter, never over the face). |
| C: stacked words on navy | "this comprehensive approach to" small, then **total / skin / health.** stacked at 220 px. "total" is lit ice and the rest are dim. The accent here is the whole phrase, lit word by word. |

- **Animation:** each word switches from dim to lit on its measured onset frame (±1 f), with no fade. In A, the highlighter grows under "total skin health." across the three onsets (55.64 → 56.34, 17 f), cubic in-out. No caption during the line (hidden 53.80-56.9 s).

## Idea 5: The visit and her sessions

- **Spoken:** "During your visit, we'll discuss your goals, review your medical history, and determine whether Exomind is appropriate for you." (31.34-36.46 s; "goals" 32.62, "medical history" 33.54/33.86, "appropriate" 35.78). He doesn't speak about her sessions in this recording. The dates come from the files: the Oct 30 session (`yt/session.mp4`) and the Nov 05 recording (`yt/patient.mp4`, her words "It quiets my brain.", DECISIONS 14b).
- **Evident technique:** a table with row wipes that stay lit (B15 1676-1843, Moment C: 18 f wipe, peak 44 %, +1 f after the word). The typed callout follows the words (B09).
- **REVIEW: every look shows the patient and is marked "needs patient consent" on the frame.** Practice footage must not be posted without her written consent.

| Look | What it does |
|---|---|
| A: table, rows wiped as named | Room canvas. Three ruled rows: 01 Discuss your goals (lit), 02 Review your medical history (mid-wipe), 03 Is Exomind appropriate for you? (dim). The consult frame (him with the patient) sits in a small window. |
| B: session timeline | Her two recorded days: the Oct 30 session frame and the Nov 05 frame, in windows. A timeline below is lit to the second date. "Oct 30 · In the chair" and "Nov 05 · *"It quiets my brain."*" are in italic for her voice (R14). |
| C: steps typed on session footage | The Oct 30 frame, full bleed with no wash. The three steps are typed on the white blanket, clear of her face and the machine logo. Step 2 is mid-highlight. |

- **Animation:** each row's wipe starts +1 f after its keyword ("goals" 32.62, "history" 33.86, "appropriate" 35.78). Each takes 0.6 s (14 f), cubic in-out peaking at 44 %, and the rows stay lit. In B, the timeline rule grows like a bar (26 f in-out), and the second window cuts in hard.

## Idea 6: Classic treatments vs beyond

- **Spoken:** "For me, it's about really being at the next frontier of taking care of one's skin beyond just the sort of classic treatments that are available and helping you become aware of how our emotions improve our skin," (56.66-70.66 s; "beyond" 62.02, "classic" 64.14, "treatments" 65.10, "emotions" 68.94).
- **Evident technique:** a comparison bar at the same scale (B07b 803-843). Bar height = the number, with a source line on the chart (R10, R13). Accent on the punchline only (R7). Build in place (R5).

| Look | What it does |
|---|---|
| A: two-column ledger | Room canvas. "The classic treatments → the skin" (grey) and "Beyond → the skin **and the mind**" (highlighted), with one rule between the columns. |
| B: split, classic vs the mind | Hard split at the centre. Left: the Flora still life of classic treatments (cream, serum, a laser handpiece). Right: the Flora glass head with the coil. "for the skin" and "Beyond / **the mind**" (highlighted). Both halves are labelled AI renders. |
| C: cited bars (Dalgard 2015) | Navy. Clinical anxiety 17.2 % vs 11.1 % and clinical depression 10.1 % vs 4.3 %, dermatology patients vs controls, at 24 px per point. The anxiety patients bar is the ice accent. "Odds ratio, clinical anxiety 2.18 (95% CI 1.68-2.82)". The full source line is on the frame. |

- **Animation:**
  - **A:** the left column appears on "classic" (64.14). The right column builds on "beyond", and its highlighter lands on "emotions" (68.94).
  - **B:** a hard cut to the split on "beyond" (62.02), then the left half dims slightly on "classic treatments".
  - **C:** bars grow in pairs, each 1.1 s (26 f), ease-in-out peaking at 45 %, with counters running linear to the cited value 2 f after the bar (Moment B). The odds ratio pops in 2-3 f on "emotions".

---

## Checks on the final renders

- Every PNG was opened and viewed at 1280x720. No text overlaps or clips, and nothing sits in the caption band (y 930-1010) except the caption.
- Nothing is green.
- There are no cursors, buttons, play/pause marks or progress bars.
- There is no drawn anatomy: heads and brains are Flora renders or real BTL/practice frames only. The rings and paths are markup on those images.
