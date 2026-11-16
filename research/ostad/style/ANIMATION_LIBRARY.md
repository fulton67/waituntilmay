# Animation library

Written 2026-11-16. These are reusable, parameterised animations that each **explain something Dr. Ostad says**, built on the tokens in `MOTION.md` and inside the visual style we already have: the room canvas, calm glass, slate, brand blue and ice accent, Helvetica Neue 65 via `TYPEFACE`, and word captions. This is the library proposed in `research/ostad/PROCESS.md` ("Proposed additions" 1). Its code home is `brand/remotion/src/library/`. A new edit pulls from here first. A new graphic is added only when nothing here explains the line (see the idea log in PROCESS.md).

**How to read an entry**

- **Frames are at 24 fps** (OstadYT), counted from **t0**, the measured onset of the key word (`yt_words.json`). "+1" means one frame after the onset. For a 30 fps reel, multiply by 1.25 (the token table in MOTION.md §2 gives both rates).
- **Token names** (`cut`, `arrive`, `settle`, `sweep`, `swap`, `plate`, `morph`, `exit`, `blank`, `count`) are defined in MOTION.md §2.
- **Placement** uses the grids in MOTION.md §5. The 16:9 frame is 1920×1080 with margin 175, top 149 and the caption zone at y 930–1010. The 9:16 frame is 1080×1920 with margin 98, the `top` band 250–610, the `chest` band 1040–1560 and captions at 1594.
- **Spoken lines** come from the Exomind / total skin health YouTube edit (`brand/edits/exomind-skin/yt_words.json` onsets with the `props_yt.json` caption text, 1.15x timeline). Where he doesn't say the trigger in this recording, the entry says so and the line is a pattern for future videos.
- **Data:** never invented. Every number slot is `[cited figure]` until a primary source is on the frame. The only sourced figures in hand are those in BOARD.md (Dalgard 2015, PMID 25521458: clinical anxiety in 17.2 % of patients vs 11.1 % of controls, OR 2.18; depression 10.1 % vs 4.3 %; Margetis & Vadakekut, StatPearls, PMID 32491743, the neuroplasticity definition).
- **Assets:** BTL, Flora, practice and patient media stay gitignored under `brand/remotion/public/` (DECISIONS 4, 14). Patient footage needs written consent, BTL footage needs BTL's approval, and Flora renders are labelled "Illustration" (PROCESS §6).

**Citations:** DDOS = `read/ig_Ddos1QZRGmV.md`; G1–G4 = `read/evident_yt_group1..4.md`; NAP = `web/newapology/pages/site.md`; M04, SU, CEL = `web/newapology/sites/march2004.com.md`, `softunion.online.md`, `cellar-app.io.md`; BOARD = `brand/edits/exomind-skin/stills/BOARD.md`.

## Index

| # | Name | Explains | Extends | Built |
|---|---|---|---|---|
| L01 | Headline highlighter | a study or article that backs his claim | new (IdeaStills `HL`) | **yes**: `library/Highlighter.tsx` |
| L02 | Thesis karaoke | his one-line thesis | YT `Kinetic` | **yes**: `Highlighter.tsx` (`mode="karaoke"`) |
| L03 | Mechanism trace | how the coil reaches the brain | YT `Callout` + OstadYT `MECH` | **yes**: `library/TraceOnFootage.tsx` |
| L04 | Neurons grow, junctions counted | neuroplasticity, "rewire" | Exo `Network` (replaced) | no |
| L05 | Rolling label | a count that advances (session, week) | Exo `Swap` | **yes**: `library/RollingLabel.tsx` |
| L06 | Plate-then-picture before/after | a result on real skin | Ro `card()` | no |
| L07 | Dim-the-rest annotation | a thing in real footage he names | YT `Callout`, Exo `Ripple` | partly (`TraceOnFootage` `dim`) |
| L08 | Capped cascade ledger | a list he reads, or its quiet companion list | Ro `Checklist` | no |
| L09 | Card ↔ full-frame morph | "come and see it": the same shot at a new scale | Exo `VideoCard`, Ro `ClipFull` | no |
| L10 | Bar builds in place | a number, a comparison | Exo `Bars`, YT `Bar`/`Counter` | no |
| L11 | Dot grid share | "one in N", a share of people | new | no |
| L12 | Pie with dimming | parts of a whole, spoken one by one | new | no |
| L13 | Chapter title, blank crossfade | a new chapter | YT `title` kind | no |
| L14 | Typed callout on the rag | a phrase that names a process | YT `Tag` | no |
| L15 | Document isolate | a definition or guideline he paraphrases | new | no |
| L16 | Stepped punch-in | "right here": the key area | OstadYT frames | no |
| L17 | Ledger: classic vs beyond | what is added and what stays | Ro `Compare` | no |
| L18 | Strike and replace | a misconception corrected | Exo `Swap` | no |
| L19 | Noise clears to calm | "quiets", "focused", "in flow" | Exo `Wave`, `Burst` | no |
| L20 | Study ID card | introducing a study or a person | new | no |
| L21 | Another voice, in italic, in a window | a patient's own words | Exo `VideoCard` | no |
| L22 | Stat over dimmed footage | a figure that belongs to real footage | Ro `ClipFull` | no |
| L23 | Labelled split | two states side by side | Ro `Compare` | no |

---

## L01 Headline highlighter

- **Spoken trigger:** he points to evidence or a claim a paper backs. In this recording: "how our **emotions** improve our skin," (68.50–70.66 s; "emotions" 68.94). Chen & Lyga's review title "Brain-skin connection: stress, inflammation and skin aging" (BOARD: cited for the link, no number taken) is rebuilt as a headline card.
- **Adapts:** DDOS B11–B12 (document crop + highlighter, frames 1227–1250, 23 f at 30 fps) and Moment A (sweep peak at 44 %). G1 R24 re-typesets illegible headlines as cards (IkrW 998–1205). G3 T3: the headline lands, then the highlight 8–20 f later.
- **Frames:**

| Frame | Layer | Move |
|---|---|---|
| −12 | paper card (flat `#f4f6f8`, no shadow), journal masthead in small caps, headline 44 px, date + PMID line 22 px `#8e8e8e` | `arrive` 14 f; masthead, headline and source cascade at 2 f |
| +1 → +17 | ice block `#c4e4f8` behind "Brain-skin connection" | `sweep` 16 f; the text stays ink |
| +18 → hold | block stays lit | hold to at least 2.5 s total (MR `hold-min` 2500 ms) |
| out | card | hard cut on his next claim word, or `exit` 7 f |

- **Stagger:** cascade 2 f, capped at 10 f.
- **Placement:** 16:9: the card spans columns 2–9 (x 175–1155), its top at 300; the defocused BTL lifestyle footage or room canvas behind. 9:16: the card is full width inside the margins (x 98–982) in the `top` band; the caption stays at 1594.
- **Props:** `masthead`, `headline`, `highlight: [start,end]` (character range), `source`, `at` (onset s), `fill`.
- **Component:** new `library/Highlighter.tsx` (`mode="sweep"`), generalising IdeaStills `HL`.
- **Assets:** a real citation (masthead, title, year, PMID). No photo needed.

## L02 Thesis karaoke (progressive highlight)

- **Spoken trigger:** his thesis line, once per video. "and again, I am so excited in creating **this comprehensive approach to total skin health.**" (onsets: this 53.80, comprehensive 54.12, approach 54.86, to 55.32, total 55.64, skin 56.00, health 56.34). The same thesis comes earlier at 8.98–9.88 s ("your total skin health").
- **Adapts:** DDOS B26 (2595–2821, each word lights on its onset ±1 f), R19. G2 T2 (karaoke 7–26 s, yh4l 3308–4085). DDOS B01 highlighter on the punch phrase (27–47).
- **Frames:**

| Frame | Layer | Move |
|---|---|---|
| −12 (before "this") | the whole line in `#bcbcbc` at 88 px (hero), name line "Dr. Ariel Ostad · Dermatologist" in label caps above | `arrive` 14 f, together; captions hidden from here |
| each onset +1 | that word → ink `#373737` | `cut` (0 f) |
| "total" +1 → "health" +1 (17 f) | ice block grows under "total skin health." | `sweep` 17 f, across three onsets (BOARD idea 4) |
| +24 after "health" | line | hold, then `exit` 7 f; captions resume on the next word |

- **Placement:** 16:9: two lines, left-aligned at x 175, baseline 1 at y 470; room canvas (look A) or beside his 4:5 panel on the right (look B, never over the face). 9:16: three lines at 64 px in the `top` band, with his face below.
- **Props:** `words: {text, at}[]` (from `yt_words.json`), `punch: [i,j]`, `size`, `dim`, `ink`.
- **Component:** `library/Highlighter.tsx` (`mode="karaoke"`), extending YT `Kinetic` (which fades words over 2 s; karaoke cuts them on).
- **Assets:** none.

## L03 Mechanism trace (coil → prefrontal cortex)

- **Spoken trigger:** "and if there's **technology** that can actually help create **neuroplasticity**," (technology 71.64, neuroplasticity 73.96). "Prefrontal cortex" is BTL's term, not his (BOARD gap note), so the label needs the client's sign-off as an addition. If it isn't approved, use "the front of the brain".
- **Adapts:** G1 R22 / T8 (mechanism simulated step by step on real imagery, IkrW 610–880; landmarks −9 f). DDOS B03 (a stroke traces the coastline being named, 216–250 = 34 f at 30 fps) and B09 (stepped punch-in, 1016–1026). DEC 14d rule 6 (Flora head only).
- **Frames:**

| Frame | Layer | Move |
|---|---|---|
| −24 | Flora `head_final_anim` full frame at 1.3x, nearest frame (as OstadYT `MECH`) | hard cut on the clause before |
| +1 → +15 | brand-blue path, 3 px, from the coil pad into the frontal lobe | `sweep` 14 f (BOARD 2A) |
| +15 → +20 | target ring (r 34 → 30 px, opacity 0 → 1) at the path end | `arrive` 5 f, no overshoot |
| +16 | hairline leader from the ring to the empty left third; label "Prefrontal cortex" types about 1 char/frame | `cut` per character |
| neuroplasticity +1 | optional stepped punch-in 1.0 → 1.15 toward the ring (L16) | `sweep` 8 f |
| +36 after | hand-off to L04 (the neurons) by a hard cut | `cut` |

- **Placement:** 16:9: the head fills the frame and the label sits in the left third (x 175–620) at y 300–420, clear of the face. 9:16: crop the head to the `top` band, with the label above the eyes line (y ≤ 610) or in the `chest` band.
- **Props:** `src` (clip or still), `path` (SVG d, in source px), `ring: {x,y}`, `label`, `at`, `punch?`, `credit` ("Illustration").
- **Component:** `library/TraceOnFootage.tsx` (new), built from YT `Callout`.
- **Assets:** Flora `head_final_anim.mp4` or `head_A5_calm.png`, or real practice footage of the coil on the head (`yt/session.mp4`, crop below his face, consent).

## L04 Neurons grow, junctions counted

- **Spoken trigger:** "help create **neuroplasticity**," (73.96) → "**rewire** the brain," (75.50).
- **Adapts:** DDOS Moment B (a counter running beside growth, linear, ends +2 f). BOARD 3A (each junction ringed as it lights). DEC 14d note on `neuro_anim` (sparse → connected).
- **Frames:**

| Frame | Layer | Move |
|---|---|---|
| −8 | `neuro_anim.mp4` full frame at 1.3x, nearest frame | hard cut |
| at each junction's light frame (measured from the clip's blue-pixel peaks) | a thin ring, 1.5 px white, r 18 | `sweep` 6 f, then it stays |
| rewire +1 | counter label "Junctions lit in this clip: N", counting the rings on screen | `count`, finishing 2 f after the last ring |
| "Neuroplasticity" | label in the left third, then the StatPearls definition line in small type (optional, L15) | `arrive` 14 f |

- **Rule:** the counter counts **what's on screen** and says so. It is never presented as a clinical number. A clinical figure needs `[cited figure]` and a source line.
- **Placement:** 16:9: label x 175, y 149; the counter under it. 9:16: label in the `top` band, the neurons fill the frame, the counter in `chest`.
- **Props:** `src`, `junctions: {x,y,frame}[]` (pre-measured), `label`, `counterText`, `at`.
- **Component:** new; replaces Exo `Network` (a drawn network that the client rejected in favour of BTL/Flora media, DEC 13b).
- **Assets:** Flora `neuro_anim.mp4` / `neurons_sparse_blue.png` → `neurons_connected_blue.png`.

## L05 Rolling label (Session 1 → 6, Week 1 → 12)

- **Spoken trigger:** a count that advances while one device stays, such as "over six sessions …" or "by week twelve …". **He doesn't say this in this recording.** It's a pattern for future treatment videos. The roll fires on each spoken number. If he gives only the end value, the label rolls through the steps on `swap` at a 6 f stagger and lands on his word.
- **Adapts:** SU S2 (masked roll, 650 ms outExpo, fit RMS 0.0017–0.0029; width reserved by the longest string). G2 T16 (label swap: same device, only the variable changes, LSuT 23–115). DDOS R6.
- **Frames:**

| Frame | Layer | Move |
|---|---|---|
| −14 | caps label "SESSION" + a value slot sized to "12", in the corner of a footage window | `arrive` 14 f |
| each number onset +1 → +17 | old value y 0 → −100 %, new value y +100 % → 0, inside a one-line mask | `swap` 16 f, both together |
| optional | a hairline under the label fills to the step / total | `sweep` 14 f |
| out | label | `exit` 7 f, or it rides out with the shot |

- **Placement:** 16:9: top-left of the footage window, 24 px inset, label 24 px caps, value 88 px. 9:16: `top` band, left margin.
- **Props:** `label`, `values: {text, at}[]`, `size`, `mask` ("line"), `total?`.
- **Component:** `library/RollingLabel.tsx` (new). It replaces Exo `Swap`'s strike-and-replace, which stays for corrections (L18).
- **Assets:** real session footage per step (consent), or a still of the device.

## L06 Plate-then-picture before/after

- **Spoken trigger:** "and how that can actually **translate into better skin**." (translate 85.16, better 85.86, skin 86.08). **No results footage exists on disk** (DEC 14b, "Not available"), so this waits for consented gallery before/afters.
- **Adapts:** M04 M1–M2 (grey plate fades in over 750 ms, then the picture fades through it over 750 ms). G1 R27 (labelled before/after cards, never a slider; yA0 494–583). Memory: markup goes on the popped-up condition images, never his face.
- **Frames:**

| Frame | Layer | Move |
|---|---|---|
| translate +1 | two glass plates (Ro `card()`, radius 24) in their final rects | `plate` 18 f, plate 2 starts 1 f after plate 1 |
| +19 → +37 | the "Before" photo fades through plate 1 | `plate` 18 f |
| better +1 | the "After" photo fades through plate 2 | `plate` 18 f |
| skin +1 | labels "Before" / "After · [weeks, cited]" + a hairline glass ring on the feature (DEC 8 markup) | `arrive` 14 f; ring `sweep` 12 f |
| hold ≥ 2.5 s | — | hard cut out |

- **Placement:** 16:9: two 4:5 cards, 520×650, at x 380 and 1020, top 160. 9:16: stacked in the `chest` band at 820×(2×350) with a 24 px gap, or one card that swaps the picture through the same plate.
- **Props:** `before`, `after`, `labels`, `ring?: {x,y,r}`, `at: {plate, before, after}`, `credit` (consent line).
- **Component:** new, on Ro `card()`.
- **Assets:** real consented patient photos only. Never an AI before/after.

## L07 Dim-the-rest annotation on footage

- **Spoken trigger:** naming a thing visible in real footage. "I hope tonight's conversation has helped you understand **Exomind**" (Exomind 5.18) over the session clip; the coil gets a box and leader.
- **Adapts:** G4 T2 (annotation on footage: box, circle plus leader, −8 to +9 f; 5J8M 2293; 19 uses in G4). G3 T12 (document isolate: dim, then box, 15–25 f after). G4 T6 (background dims 10–24 f first). Dim levels 0.33–0.5 from roko-g / georgedavies (MOTION §3).
- **Frames:**

| Frame | Layer | Move |
|---|---|---|
| −6 | real footage, full frame | playing |
| +1 → +13 | dark scrim (rgba(16,24,40,.5)) everywhere except a rounded hole on the subject | `sweep` 12 f |
| +6 → +20 | white hairline box (1 px) around the subject, drawn clockwise | `sweep` 14 f |
| +14 | leader from the box corner to the empty side; label (24 px caps) | leader `sweep` 8 f, label `arrive` 14 f |
| tracking | box and leader follow the subject (pre-measured keyframes, as the v3 coil leader at source px 640, 290; DEC 14c) | linear between keyframes |
| out | scrim, box, label | `exit` 7 f together, or a hard cut |

- **Placement:** 16:9: the label goes in whichever third is empty, never over a face. 9:16: label in the `top` or `chest` band.
- **Props:** `src`, `box: {x,y,w,h}[]` per keyframe, `label`, `side`, `dim` (0.33–0.5), `at`.
- **Component:** `TraceOnFootage.tsx` with `dim` + `box` (built in part), and YT `Callout`.
- **Assets:** practice footage (consent) or BTL film (approval).

## L08 Capped cascade ledger

- **Spoken trigger:** a list he reads: "we'll discuss your **goals**, review your **medical history**, and determine whether Exomind is **appropriate** for you." (goals 32.62, history 33.86, appropriate 35.78).
- **Adapts:** NAP §5A (`min(85·i, 425)` ms cascade, 12 px rise) for the ledger frame. M04 M1 (cap at 12 steps). DDOS B15 / Moment C (row wipe 18 f, +1 f after the name, rows stay lit) for the spoken rows. BOARD 5A.
- **Frames:**

| Frame | Layer | Move |
|---|---|---|
| "During" (31.34) +1 | three ruled rows, numerals 01–03 dim, texts dim `#bcbcbc` | `arrive` 14 f, rows 2 f apart (cap 10 f) |
| goals +1 → +15 | row 1 text → ink; ice wipe behind it | `sweep` 14 f |
| history +1 | row 2 | `sweep` 14 f |
| appropriate +1 | row 3 | `sweep` 14 f; all rows stay lit |
| out | ledger | hard cut on "Before you go" (37.26) |

- **Rule:** when the list isn't spoken item by item (a quiet companion list, as in s8's "skin care / the mind / technology"; DEC 14c), the cascade alone carries it: `arrive`, 2 f stagger, cap 10 f.
- **Placement:** 16:9: rows at x 175, width 8 columns, 72 px row pitch, from y 320; a small consult window right (x 1240–1745). 9:16: rows in the `chest` band at 64 px pitch.
- **Props:** `rows: {text, at?}[]`, `numerals`, `window?`.
- **Component:** extends Ro `Checklist` (ticks → wipes).
- **Assets:** optional consult footage (consent).

## L09 Card ↔ full-frame morph

- **Spoken trigger:** the same shot needs to grow because he moves from mentioning to showing: "We look forward to **seeing you in the office**," (seeing 49.88, office 50.58). The session clip in a card grows to full frame.
- **Adapts:** NAP §3B (View Transition 1100 ms, `.66,0,.25,1`, radius 19 → 5 px, old root out 200 ms). MOTION §4.2.
- **Frames:**

| Frame | Layer | Move |
|---|---|---|
| before | footage in a glass card (radius 24), type beside it | playing |
| seeing +1 → +27 | the card rect → 1920×1080, radius 24 → 0; footage keeps playing (object-fit cover re-computed per frame) | `morph` 26 f |
| seeing +1 → +6 | the type and canvas around the card | fade out, 5 f, CSS ease |
| office +1 | optional label on the full frame (L07) | `arrive` 14 f |
| reverse | full frame → card at a section end | `morph` 26 f |

- **Placement:** 16:9: the card starts at the right column (x 1060–1745, y 200–760). 9:16: the card starts in the `chest` band at full margin width.
- **Props:** `src`, `from: {x,y,w,h,r}`, `at`, `dir: "in" | "out"`.
- **Component:** extends Exo `VideoCard` + Ro `ClipFull` (new morph wrapper).
- **Assets:** real footage at ≥ 1080 px high, never upscaled (DEC 14).

## L10 Bar builds in place (bar = number)

- **Spoken trigger:** a number or a comparison. In this video, attached to "how our **emotions** improve our skin" as a sourced addition: Dalgard 2015, clinical anxiety 17.2 % of dermatology patients vs 11.1 % of controls (BOARD 6C). Needs the client's approval as an addition, since he doesn't say the number.
- **Adapts:** DDOS B05 (scaffold, then bars one by one, the accent on the last; 366–693), Moment B (bar 33 f at 30 fps, peak 45 %; counter linear, +2 f), B07b (comparison at the same scale). G1 bar chart "punchline first, then context" (Zzgg 1524–1824). G4 A6 (one accent per chart).
- **Frames:**

| Frame | Layer | Move |
|---|---|---|
| −30 | scaffold: title (label caps), baseline 2 px, source line 22 px | title `cut`, baseline `sweep` 12 f, source `arrive` |
| clause before → word +1 | bar 1 "Controls 11.1 %" in slate `#5b6f8a` | `sweep` 26 f, landing on the word; counter `count` +2 f |
| +12 after | bar 2 "Patients 17.2 %" in ice `#cfe9f7` (the accent) | `sweep` 26 f; counter `count` |
| next word | "Odds ratio 2.18 (95 % CI 1.68–2.82)" | `cut` pop (2–3 f, G2 T4) |
| hold | — | ≥ 2.5 s |

- **Placement:** 16:9: chart columns 2–7 (x 175–1000), baseline y 820, 24 px per percentage point (BOARD 6C); type on the right. 9:16: chart in the `chest` band, bars horizontal.
- **Props:** `title`, `bars: {label, value, accent?, at}[]`, `unit`, `pxPerUnit`, `source`.
- **Component:** extends Exo `Bars` and YT `Counter` (adds `sweep` growth, `count` and the accent rule).
- **Assets:** a cited figure with a source line. Otherwise dashed outline bars labelled `[cited figure]` (BOARD 3B).

## L11 Dot grid share

- **Spoken trigger:** "one in N", "most people", a share of patients. A sourced example: Dalgard 2015, 17.2 % of patients had clinical anxiety → 100 dots, 17 lit (the label states 17.2 %).
- **Adapts:** DDOS B08 (waffle builds from the bottom-left 888–906, the fill floods 22 f, the hero % fades in; 931–955). G2 T8 (unit grid, flicker-on recolour, boxed group; CfyG 187–377, +5 f).
- **Frames:**

| Frame | Layer | Move |
|---|---|---|
| −20 | 10×10 grid of 14 px slate dots, 24 px pitch | rows cascade from the bottom, 1 f per row (cap 10 f), `arrive` |
| word +1 → +19 | the share recolours to ice from the top-left, in reading order | `sweep` 18 f across the dot index |
| +12 | hero figure "17.2 %" at 88 px + one-line gloss | `arrive` 14 f |
| next clause | optional stepped punch-in into the lit block (L16) | `sweep` 8 f |

- **Placement:** 16:9: grid 240×240 at x 175, y 330; the figure to its right. 9:16: grid in the `chest` band, centred.
- **Props:** `total`, `share`, `label`, `source`, `at`.
- **Component:** new.
- **Assets:** a cited share.

## L12 Pie with dimming

- **Spoken trigger:** the parts of a whole, named one after another ("a third … half … the rest"). Not in this recording.
- **Adapts:** G2 T11 (pie with spotlight: the other slices dim as each share is spoken, +4 f; uxfg 752). The dim levels follow MOTION §3.
- **Frames:**

| Frame | Layer | Move |
|---|---|---|
| −16 | full pie, slices in slate tints, thin white separators | clockwise `sweep` 16 f |
| each share's word +1 | that slice to brand blue (the last one spoken to ice); the others to 0.4 opacity | `sweep` 10 f |
| +6 | slice label with a leader | `arrive` 14 f |

- **Placement:** 16:9: pie Ø 420 at x 300, y 300; labels on the right. 9:16: Ø 520 in the `chest` band.
- **Props:** `slices: {label, value, at}[]`, `source`.
- **Component:** new.
- **Assets:** cited shares only.

## L13 Chapter title with the blank crossfade

- **Spoken trigger:** a new chapter. "and again, I am so excited …" (51.58) opens "A comprehensive approach to total skin health" (OstadYT s8; DEC 14b).
- **Adapts:** SU S5 (450 ms out, ~290 ms blank, 450 ms in). YT chapter `title` (DEC 14).
- **Frames:**

| Frame | Layer | Move |
|---|---|---|
| −11 → 0 | the outgoing shot fades to the room canvas | `blank` out 11 f |
| 0 → +7 | room canvas only | hold 7 f |
| +7 | chapter number in label caps, title at 88 px, left at x 175 | `arrive` 14 f, 2 f between the lines |
| +7 → +18 | the new section (Flora coil clip) fades in under the type | `blank` in 11 f |
| +18 → | quiet companion list (L08 cascade) | `arrive`, 2 f stagger |

- **Placement:** 16:9: type in the bright left third over the clip (DEC 14d v4 s8). 9:16: type in the `top` band.
- **Props:** `number`, `title`, `sub?`, `next` (clip), `at`.
- **Component:** extends the YT `title` kind with the `blank` timing.
- **Assets:** the clip for the new section (Flora `coil_anim.mp4` here).

## L14 Typed callout on the rag

- **Spoken trigger:** a phrase that names a process: "increase proper **neurotransmitter production**" (neurotransmitter 78.14, production 79.06).
- **Adapts:** DDOS B09 (a rag-hugging callout types along with the words, 1026–1085). G1 T14 / G3 T5 (typewriter titles). The caret is rejected (MOTION §6, no UI).
- **Frames:**

| Frame | Layer | Move |
|---|---|---|
| neurotransmitter +1 | callout text types 1 char/frame (no caret), 30 px; the block's background is a soft glass plate that grows with the line | `cut` per character; plate width follows |
| production +1 | the second line types | same |
| +12 | a literal `synapse` icon (YT ICON) draws on beside it | `sweep` 12 f (pathLength) |

- **Placement:** 16:9: beside the subject, max 6 columns wide, never over the face. 9:16: in the `chest` band.
- **Props:** `lines: {text, at}[]`, `icon?`, `x,y`.
- **Component:** extends YT `Tag` (whose label stays whole from its first frame; DEC 14c). Typing is allowed only where the words are being *spoken* at that moment.
- **Assets:** none. Over BTL synapse footage or `neuro_anim` if it's behind.

## L15 Document isolate

- **Spoken trigger:** a definition he paraphrases: "**rewire** the brain," (75.50). StatPearls defines neuroplasticity as "the ability of the nervous system to change its activity in response to intrinsic or extrinsic stimuli by reorganizing its structure, functions, or connections." (BOARD 3C).
- **Adapts:** G3 T12 (page dims or blurs, one line stays lit or boxed, 15–25 f after the highlight; iZ4 567, 3463). DDOS B11 (a flat paper crop, no shadow). DDOS B21 (defocus-in, 7 f at 30 fps).
- **Frames:**

| Frame | Layer | Move |
|---|---|---|
| −10 | the defocused neurons behind | focus pull, blur 12 → 0 px over 6 f |
| −8 | flat paper crop, serif text set from the real source, full citation line | `plate` 18 f |
| rewire +1 → +17 | ice block on "reorganizing its structure, functions, or connections." line by line | `sweep` 16 f per line, the next line starting as the first ends |
| +20 → +40 | the rest of the paragraph dims to 0.4 | `sweep` 20 f |

- **Placement:** 16:9: the crop spans columns 2–8 at y 260–720. 9:16: the `top` band to the `chest` band, inside the margins.
- **Props:** `text`, `lit: [start,end][]`, `source`, `at`, `bg?`.
- **Component:** new (it shares `Highlighter.tsx`'s sweep).
- **Assets:** verbatim source text with its citation.

## L16 Stepped punch-in

- **Spoken trigger:** he points to a part: "right here", "the front of the brain", or the punchline number of a chart. Here it pairs with "neuroplasticity" (73.96) on the L03 ring.
- **Adapts:** DDOS B09 (stepped punch-in into the 57 %, 1016–1026 = 10 f at 30 fps), R16. G2 T19 (2–3 hard steps on a document, the highlight on the last; 9LOa 89/109/132). The scale stays inside the 1.1–1.2x cap (DEC 14).
- **Frames:**

| Frame | Layer | Move |
|---|---|---|
| word +1 → +9 | the whole frame scales 1.0 → 1.15 about the target | `sweep` 8 f |
| or stepped | 1.0 → 1.08 → 1.15 as two hard steps, 8 f apart | `cut` |
| hold | — | to the next cut, never zoomed back out on camera |

- **Placement:** any. The target must stay inside the title-safe box after scaling.
- **Props:** `origin: {x,y}`, `to` (≤ 1.2), `steps`, `at`.
- **Component:** a wrapper around any layer (the OstadYT frame transform).
- **Assets:** footage ≥ 1.2x the output size, or a still. Never upscale footage past native (DEC 14).

## L17 Ledger: classic vs beyond

- **Spoken trigger:** "taking care of one's skin **beyond** just the sort of **classic treatments** that are available and helping you become aware of how our **emotions** improve our skin," (beyond 62.02, classic 64.14, treatments 65.10, emotions 68.94).
- **Adapts:** DDOS R5 (build in place) and R7 (the accent on the punchline). G4 T13 (a line-art object list where the previous items stay). BOARD 6A.
- **Frames:**

| Frame | Layer | Move |
|---|---|---|
| beyond +1 | the right column header "Beyond" with a literal `brain` icon | `arrive` 14 f |
| classic +1 | the left column "The classic treatments → the skin" in grey, `face` icon | `arrive` 14 f |
| treatments +1 | one vertical hairline between the columns | `sweep` 12 f |
| emotions +1 | right column: "the skin **and the mind**", highlighter on "and the mind" | `arrive` 14 f, then `sweep` 16 f |

- **Placement:** 16:9: columns 2–6 and 8–12, from y 300. 9:16: stacked rows in the `chest` band, with "Beyond" last.
- **Props:** `left: {title, items, at}`, `right: {title, items, at, punch}`.
- **Component:** extends Ro `Compare` (no card box: "not every graphic in a box", DEC 14b).
- **Assets:** none, or Flora still lifes in L23.

## L18 Strike and replace

- **Spoken trigger:** a misconception corrected. From the Exomind reel: "It's **not** a painful **headache**" → "gentle **pressure**" (DEC 13, 13c). Not in the YouTube recording.
- **Adapts:** G3 T13 (strike-through drawn in 8 f; the old item dims and moves; −3 f; D_bh 3350). Exo `Swap` (DEC 13).
- **Frames:**

| Frame | Layer | Move |
|---|---|---|
| headline word +1 | the misconception in ink | `arrive` 14 f |
| "not" +1 → +9 | a 3 px strike across it | `sweep` 8 f |
| +9 → +23 | the struck line dims to 0.4 and moves up 24 px | `arrive` 14 f |
| correction word +1 | the correct phrase in its place | `arrive` 14 f, highlighter `sweep` 16 f |

- **Placement:** 16:9: beside him or over the treatment footage, left third. 9:16: `top` band.
- **Props:** `from`, `to`, `at: {from, strike, to}`, `voice?: "italic"` (her words).
- **Component:** extends Exo `Swap`.
- **Assets:** none.

## L19 Noise clears to calm

- **Spoken trigger:** "where we can actually be more **focused in flow**" (focused 80.80, flow 81.72), and the patient's "It quiets my brain." (Nov 05 clip; DEC 14b s12).
- **Adapts:** DDOS R18, "meaning through the medium" (B23–B24, 2377–2436), **in its inverse, calm form**: noise clears instead of the picture breaking (DDOS §6 idea 12). Exo `Wave` and `Burst` (DEC 13b–13c: white, motion alone carries busy → calm).
- **Frames:**

| Frame | Layer | Move |
|---|---|---|
| −24 | real BTL footage (the restless night, `stressed2.mp4`), with fine luminance noise (grain 0.12) and a jittery white line over it | playing |
| focused +1 → +27 | the noise eases down to the canvas grain 0.035 and the line settles into one slow wave | `sweep` 26 f |
| flow +1 | a hard cut to calm footage (the patient relaxing under the coil); label "Focused, in flow" | `cut`, label `arrive` |

- **Placement:** footage full frame; the label in the left third / `top` band.
- **Props:** `busy` (clip), `calm` (clip), `label`, `at: {settle, cut}`.
- **Component:** extends Exo `Wave` / `Burst`.
- **Assets:** BTL film (approval), patient footage (consent).

## L20 Study ID card

- **Spoken trigger:** the first time a study (or a colleague) is mentioned. Pairs with L10/L11 when Dalgard 2015 is shown.
- **Adapts:** G1 R26 / T10 (a cutout on a colour disc, a typed name, then facts stacked above on their words; tqx 1010–1326, disc +1 f). In our version the disc is a brand-blue circle, and for a study it holds the journal's initials, not a photo.
- **Frames:**

| Frame | Layer | Move |
|---|---|---|
| word +1 | brand-blue disc Ø 120 | `arrive` 14 f |
| +2 | "Dalgard et al., 2015" types 1 char/frame | `cut` per character |
| next facts' words | "13 European countries", "3,635 patients · 1,359 controls" stacked above | `arrive` 14 f each, on their words |
| out | card | `exit` 7 f |

- **Placement:** 16:9: lower-left above the caption zone (y 700–900), x 175. 9:16: the `chest` band.
- **Props:** `disc` (initials or a consented photo), `name`, `facts: {text, at}[]`, `source`.
- **Component:** new.
- **Assets:** citation details (BOARD).

## L21 Another voice, in italic, in a window

- **Spoken trigger:** the patient's own words: "It quiets my brain." (Nov 05, DEC 14b s12).
- **Adapts:** DDOS B19 (archive video in a rounded window, credited, the quoted words captioned in italic; 2007–2214, f2050), R12 (radius 2 % of width, no shadow), R14 (italic register). G4 A7 (a second voice gets its own caption colour plus italics).
- **Frames:**

| Frame | Layer | Move |
|---|---|---|
| her first word −6 | her footage in a rounded window (radius 2 % W) on the room canvas | `plate` 18 f (the window plate, then the picture) |
| each of her words | caption in italic, word by word on its onset, in slate instead of ink | `cut` |
| +12 | small credit "Patient, Nov 05 · consent on file" | `arrive` 14 f |

- **Placement:** 16:9: a 4:5 window at x 1060–1500, y 150–700, with the italic caption in the normal caption zone. 9:16: the window in the `top`–`chest` bands at native size (440×780, never upscaled; DEC 14b).
- **Props:** `src`, `words: {text, at}[]`, `credit`.
- **Component:** extends Exo `VideoCard`.
- **Assets:** patient footage with written consent.

## L22 Stat over dimmed footage

- **Spoken trigger:** a figure that belongs to real footage: a number about the people on screen ("patients with … report …"). Not in this recording.
- **Adapts:** G4 T6 (the background dims first, the number is typed, then highlighted; +16 / +4 f; 5J8M 620–760). G4 T14 (a report cover dims, stats stacked on top; liXI 3601–3928).
- **Frames:**

| Frame | Layer | Move |
|---|---|---|
| −16 | footage dims to 0.45 | `sweep` 16 f |
| number word +1 | `[cited figure]` at 136 px types digit by digit | `cut` per character |
| +6 | the unit line + source line | `arrive` 14 f |
| key word +1 | highlighter on the unit phrase | `sweep` 16 f |

- **Placement:** 16:9: left third, x 175, y 360. 9:16: `top` band.
- **Props:** `value`, `unit`, `source`, `at`, `dim`.
- **Component:** extends Ro `ClipFull`.
- **Assets:** footage + a cited figure.

## L23 Labelled split

- **Spoken trigger:** two states side by side: "**beyond** just the sort of classic treatments" (62.02), or stressed → calm (OstadYT s10).
- **Adapts:** G1 R27 / T11 (labelled before/after or a split, **never a slider widget**; yA0 494–583, qf 1665–1946). This replaces s10's dragged slider from v2, which was removed under DEC 14d rule 1.
- **Frames:**

| Frame | Layer | Move |
|---|---|---|
| word +1 | a hard cut to the split at the centre line; left and right clips at native scale | `cut` |
| +2 | a 1 px white centre hairline | `sweep` 10 f, top to bottom |
| left phrase +1 | the left label; then the left half dims to 0.6 on "classic treatments" (BOARD 6B) | `arrive`, `sweep` 12 f |
| right phrase +1 | the right label with the highlighter ("Beyond / **the mind**") | `arrive` + `sweep` 16 f |

- **Placement:** 16:9: two 960×1080 halves, labels at y 149 in each half's margin. 9:16: stacked halves 1080×960, labels at each half's top.
- **Props:** `left: {src, label, at}`, `right: {src, label, at}`, `dimLeftAt?`.
- **Component:** extends Ro `Compare` (footage version).
- **Assets:** real footage per half (BTL `stressed2.mp4` | patient calm), or Flora renders labelled AI (BOARD 6B).

---

## The 6 Exomind ideas (BOARD.md) mapped to the library

| BOARD idea | Look A | Look B | Look C |
|---|---|---|---|
| 1 Stress to skin | L17 ledger build + L01 highlighter on the last word | L03 trace (on the Flora skin macro) + L07 label | L02 karaoke (stacked words) |
| 2 The coil to the prefrontal cortex | **L03** trace + L07 leader | L03 with arcs on BTL footage (pulse) + L07 | L16 stepped punch-in + L01 highlighter in a window |
| 3 Neuroplasticity | **L04** neurons, junctions counted | L23 split (before/after windows) + L10 bars (`[cited figure]`) | **L15** document isolate |
| 4 Total skin health | **L02** karaoke | L02 beside his own shot | L02 stacked |
| 5 The visit | **L08** ledger with row wipes | L05 rolling label (session dates) + L21 her italic words | L14 typed steps on the session footage |
| 6 Classic vs beyond | **L17** ledger | **L23** labelled split | **L10** cited bars (Dalgard 2015) + L20 study card |

The client picks one look per idea (BOARD). The library entry behind the chosen look is then built as its component, with its props filled from the transcript.

## Built so far (proof)

`brand/remotion/src/library/`:
- `motion.ts`: the MOTION.md tokens.
- `Highlighter.tsx`: L01 / L02.
- `RollingLabel.tsx`: L05.
- `TraceOnFootage.tsx`: L03 / L07.

These are registered as `LibraryProof` in `Root.tsx` (1920×1080, 24 fps, props `{piece: "headline" | "karaoke" | "rolling" | "trace"}`). Render a still with:

```
npx remotion still out/bundle_lib LibraryProof <png> --props='{"piece":"trace"}' --frame=72
```

The stills are in `brand/edits/exomind-skin/stills/library_*.png` and are gitignored because the trace uses a Flora render. Each one was opened and checked:
- `headline_f33`: mid-sweep through "Brain-skin con…".
- `headline_f60`: "Brain-skin connection:" lit, ink text, square block, no shadow.
- `karaoke_f72`: lit through "total"; the ice block is partway across "skin"; "skin health." is still dim.
- `rolling_f48` / `rolling_f60`: "3 of 6" rolling in, then settled.
- `trace_f32`: path mid-draw from the coil.
- `trace_f72`: path, ring on the frontal lobe, and the hairline leader to "PREFRONTAL CORTEX" in the empty left third, with "Illustration" top right.

One fix came out of looking at them: the rolling label's box was first sized by character count, and it clipped the "3" (proportional digits make "1" narrower). Every value is now stacked invisibly in the box, so it takes the widest one.
