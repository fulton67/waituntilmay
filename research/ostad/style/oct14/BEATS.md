# Oct 14 injection reel: beat sheet, line ranking, duplicate map and briefs

**Consent = yes since 2026-11-17 (written, before the procedure; DECISIONS 16d). v1 and v2 were made while consent was unknown, and their file names still carry the flag.** Earlier text: consent for this patient was unknown. She agreed on camera to be filmed (intro 0:04), which is not consent to post.

Dr. Ostad, Oct 14 2026: one session, 13 phone clips. The clips are picked by `com.apple.quicktime.creationdate`, never the file time (`brand/scripts/oct14_prep.py select`):

| Role | Clip | Created | Length | What is in frame (checked on contact sheets) |
|---|---|---|---|---|
| intro | IMG_3640 | 16:44:10 | 148.8 s | two-shot, him left, her right; he names the lines and the targets (the brief's opening line is at 0:02) |
| neuro | IMG_3657 | 16:57:10 | 120.5 s | the neuromodulator: frown lines, forehead, crow's feet; his technique line while injecting |
| inj1 | IMG_3641 | 16:47:23 | 37.7 s | the first cheek injection (her right cheek, image left), silent |
| inj2 | IMG_3642 | 16:48:09 | 51.6 s | one side done: he names the product, the amount and the spot |
| inj3 / inj4 | IMG_3650 / 3651 | 16:49 / 16:50 | 46.8 / 11.5 s | the second cheek, silent (not used: same move, other side) |
| inj5 | IMG_3652 | 16:50:28 | 62.1 s | her close-up after the cheeks; laugh lines better |
| inj6 | IMG_3653 | 16:51:49 | 102.0 s | cannula into the lower face, profile; "minimise bruising" |
| inj7 | IMG_3654 | 16:53:50 | 111.2 s | cannula at the lines and the chin, front (not used: the cut ran long) |
| after | IMG_3656 | 16:55:44 | 70.8 s | "We're done": the result area by area, the product for the lines, how long it lasts |
| before (still) | IMG_3637 | 16:42:54 | 32.1 s | before any injection; the frame for the before/after card (see "Before/after") |

IMG_3655 (0.8 s, 16:55:43) is an accidental tap. The six JPGs (16:49) are mid-treatment, so they are not used as a "before".

Files:
- `cut.json`: pieces, cues, pips and the before/after config.
- `plan.json`: the ranking, the duplicate map and the checks (`brand/scripts/oct14_plan.py`).
- `beats.json`: the machine sheet (`brand/scripts/oct14_beats.py`).
- `ARROWS.md`: how each before/after arrow was chosen.
- `verify.json`: the measurements of the render.
- Code: `brand/remotion/src/oct14/`.

**Time base.** Composition frames at 24 fps on the 1.15x edit. Reveals start at the cue word's onset + 1 f (MOTION §3).

**Privacy.** No clip contains her name (all 13 local transcripts checked; the redaction pass found 0 name tokens). On screen she is never named.

## Structure: by area, not by clip (coordinator, 2026-11-17)

Each area is one continuous thought: (a) the problem, from the intro; (b) the injection on that exact spot, as a pop-up anchored to her face or the injection clip full frame; (c) what he says while injecting. The areas run in the order he introduces them in the intro: forehead and frown lines, then crow's feet, then the mid face (jowling, laugh lines). The result area closes on the before/after.

| Area | (a) the problem | (b) the injection on the spot | (c) his line while / about injecting |
|---|---|---|---|
| S1 Upper face | intro: "forehead lines, frown lines … crow's feet … dynamic lines" | pop-up of IMG_3657 0:04 (the frown injection) at her glabella, on "dynamic" | IMG_3657 1:37, injecting the crow's feet: "more in some areas that need to be lifted and less in areas that tend to cause drooping" |
| S2 Cheeks and jawline | intro: "jowling … laugh lines … the source of the problem is deflation … soft tissue moving down … filler in the cheeks" | pop-up of IMG_3641 0:06 (the cheek injection) at her outer cheekbone, on "literally" | IMG_3642 0:04: "a syringe of what I call Evolysse Form into her outer cheekbone" |
| S3 Laugh lines | IMG_3652: "the laugh lines got better, so we don't need to put as much in there" | pop-up of IMG_3653 (the cannula) at her laugh line, morphing to full frame | IMG_3653 0:39: "I like using a cannula because we can minimize bruising" |
| S4 The result | IMG_3656: "when she came in … laugh lines … marionette lines" | before/after cards (IMG_3637 vs IMG_3656, aligned) | "proper cheek bone projection, her jaw line is lifted … laugh lines … softer"; "about 15 minutes"; "a year, a year and a half" |

The order is his intro order. One exception: the S3 opening line comes from IMG_3652, because the intro gives the laugh lines only as the reason for treating the cheeks, and taking that line again would repeat S2.

## The beats: the line, the literal visual, the device

| Beat | Sec | Frames | He says | Literal visual | Device id(s) | Entry | Reference (frames) |
|---|---|---|---|---|---|---|---|
| B01 | S0 | 0–160 | "We're here with our lovely patient. She comes to us just basically with a typical patient presents with some forehead lines, some frown lines." (cue **typical**, f94) | his opening line; the title 'A typical patient', with 'Forehead lines · frown lines' landing on his words; his name | `name-super` | `type-word-fade-rise` | DDOS f3-13 (5 f rise); name super G3 13/13 |
| B02 | S1 | 161–429 | "She's got, you know, just relatively strong crow's feet. These are what we call dynamic lines, meaning they're more noticeable when patients are expressive, and those are typically treated with a neuromodulator." (cue **dynamic**, f261) | the frown-line injection (IMG_3657) grows out of her glabella in a window while he explains dynamic lines; ring on the point, badge 1, curved callout | `zoom-box-inset`, `windowed-footage`, `arrow-curved-callout` | `type-typewriter` | G4 T5 Ik5Zt8oGko4 f1245-1399; DDOS f2007-2214; GMu3 f395-401; ETSQ T7 |
| B03 | S1 | 430–603 | "It's about putting more in some areas that need to be lifted and less in areas that tend to cause drooping." (cue **lifted**, f524) | him injecting her crow's feet (his line said while injecting); ticks point up over her brow tails on 'lifted'; 'More where it lifts' / 'Less where it droops' | `arrow-marker-tick` | `type-box-slam` | WZ f940/944 ticks; GMu3 f1512-1522 box slam |
| B04 | S1 | 604–633 | "It lasts about four or five months." (cue **four**, f618) | a months rule 0-6; ticks on 'four' and 'five', the span fills: 4-5 months (his figure) | `timeline-markers`, `arrow-marker-tick` | `type-rise` | Are.na 16463981; WZ f940/944 |
| B05 | S1 | 634–787 | "You know, with the neuromodulators, the results kind of take a day or two to kick in. With fillers, you see it right away." (cue **day**, f710) | a two-row ledger: Neuromodulator · a day or two / Filler · right away, each row wiped on its words | `checklist-ledger` | `type-highlight-sweep` | DDOS Moment C f1686-1745 (row wipe 14 f) |
| B06 | S2 | 788–1184 | "Then moving to her mid face, you know, she's got a little bit of jowling. She's got a little bit of laugh lines. A lot of times patients come in saying they want their laugh lines filled. But really, the source of the problem is more like what we call deflation and just skin stretching from just soft tissue moving down." (cue **deflation**, f1041) | 'Deflation' slams up; on 'moving down' a headed route draws on her face from the cheekbone past the jaw line | `arrow-route-trace`, `mechanism-on-real-image` | `type-box-slam` | DDOS f216-250 (27 f); G1 T8 IkrW f610-880 |
| B07 | S2 | 1185–1351 | "So we're just going to put a little bit of filler in the cheeks. we literally put a syringe of what I call Evolysse Form into her outer cheekbone" (cue **literally**, f1234) | the cheek injection (IMG_3641) grows out of her outer cheekbone while he names the product and the spot; badge 2 | `zoom-box-inset`, `windowed-footage`, `arrow-curved-callout` | `type-typewriter` | G4 T5; DDOS f2007-2214; GMu3 f395-401 |
| B08 | S3 | 1352–1438 | "And you can see the laugh lines got better, so we don't need to put as much in there." (cue **laugh3**, f1381) | her close-up after the cheeks; rings on both laugh lines (tracked); 'Laugh lines: better' with the highlighter on 'better' | `tracking-ring` | `type-highlight-sweep` | G4 T20 tQkjtXJEtxY f851-1091; DDOS Moment A |
| B09 | S3 | 1439–1619 | "And we used Evolysse Smooth here, it's also a hyaluronic acid in the same family and it just really does such a nice job of filling." (cue **used**, f1451) | the cannula injection (IMG_3653) grows out of her laugh line on her close-up, a straight pointer to the point, then the window morphs to full frame | `card-full-morph`, `arrow-straight-pointer` | `type-typewriter` | NAP §3B (MOTION §4.2); WZ f926-933 |
| B10 | S3 | 1620–1695 | "I like using a cannula because we can minimize bruising." (cue **bruising**, f1671) | the cannula in her lower face, full frame; 'A cannula, to minimise bruising' with the highlighter on his phrase | (text on footage) | `type-highlight-sweep` | DDOS Moment A (highlighter 16 f) |
| B11 | S4 | 1696–2036 | "You can see how when she came in, she was complaining of her laugh lines being deep and she had some deep and sort of what we call marionette lines. And you can see how she has proper cheek bone projection, her jaw line is lifted and then her laugh lines are so much softer." (cue **ba**, f1867) | him pointing at her result, then two labelled cards (4:42 PM before / 4:55 PM right after, aligned); both push to the cheek, the same outline on both, the rest dims, a pointer to 'Fuller cheek' | `split-labelled`, `stepped-punch-in`, `annotation-box-footage`, `arrow-straight-pointer` | `type-typewriter` | G1 R27 yA0 f494-583; DDOS f1016-1026; G4 T2 5J8M f2293-2311; G4 T18 |
| B12 | S4 | 2037–2178 | "And you know, the treatment took about 15 minutes, not even. And you will see this easily last you over like a year, a year and a half." (cue **fifteen**, f2071) | the cards pull back with the numbered summary; a card rolls 'about 15 min' then 'Filler lasts 1-1½ years' (his figures) | `rx-card` | `type-rolling-swap` | SU S2 rolling swap; our Ro RxCard |
| End | | 2179– | | End card "Book a consultation. / Link in bio." over the last shot, soft | `EndCard` (kit) | | DEC 11 |

Section cards (`chapter-title-card`, one look): 01 Upper face, 02 Cheeks and jawline, 03 Laugh lines, 04 The result. The title is "A typical patient" (his words).

## Information ranking (every candidate line)

Score 1-5: why the line forms, what he targets and why, technique, depth or product handling, the result, downtime, how long it lasts. Lines under 3 go first, then the weaker take of each point, then the cut works up from the bottom to about 90 s. At 1.1x the kept lines ran 98 s. At 1.15x (the speed the client approved for him, DEC 14) they run 93.8 s with the end card, so no score-5 line was dropped.

| Line | Clip, at | Score | Point | Kept | Reason |
|---|---|---|---|---|---|
| after-15min | IMG_3656 16:55 | 5 | time | **yes** | treatment time: about 15 minutes |
| after-lasts | IMG_3656 16:55 | 5 | filler-lasts | **yes** | how long the filler lasts: over a year, a year and a half |
| after-smooth | IMG_3656 16:55 | 5 | lines-product | **yes** | product handling for the lines: Evolysse Smooth, a hyaluronic acid in the same family |
| after-summary | IMG_3656 16:55 | 5 | result | **yes** | the result named area by area: laugh lines and marionette lines, cheekbone projection, jawline, softer lines |
| inj2-syringe | IMG_3642 16:48 | 5 | cheek-product | **yes** | the product, the amount and the spot: one syringe of Evolysse Form in the outer cheekbone |
| inj5-less-needed | IMG_3652 16:50 | 5 | laugh-less | **yes** | the payoff of treating the cheeks: the laugh lines improved, so less filler goes in them |
| inj6-bruising | IMG_3653 16:51 | 5 | cannula | **yes** | technique and downtime: a cannula, to minimise bruising |
| intro-cheeks | IMG_3640 16:44 | 5 | target-cheeks | **yes** | what he targets: filler in the cheeks |
| intro-deflation | IMG_3640 16:44 | 5 | laugh-cause | **yes** | why laugh lines form: deflation and soft tissue moving down, not the line itself |
| intro-dynamic | IMG_3640 16:44 | 5 | dynamic | **yes** | crow's feet; why: dynamic lines, seen when expressive; treated with a neuromodulator |
| intro-lasts | IMG_3640 16:44 | 5 | neuro-lasts | **yes** | how long it lasts: four or five months (his figure) |
| intro-onset-vs-filler | IMG_3640 16:44 | 5 | neuro-onset | **yes** | neuromodulator takes a day or two, filler shows right away: also why the after shows only the filler areas |
| intro-typical | IMG_3640 16:44 | 5 | presents | **yes** | what a typical patient presents with: forehead and frown lines |
| neuro-more-less | IMG_3657 16:57 | 5 | neuro-technique | **yes** | the technique in one line, said while injecting: more where it needs lift, less where it droops |
| after-less-needed | IMG_3656 16:55 | 4 | laugh-less | no | same point at the end; the inj5 take is in place in the story |
| after-thinner | IMG_3656 16:55 | 4 | lines-product | no | not as thick as the cheek filler; cut for length |
| inj2-jaw | IMG_3642 16:48 | 4 | jaw-lift | no | jaw raised vs the other side: the same result as after-summary |
| inj5-syringe | IMG_3652 16:50 | 4 | cheek-product | no | same syringe plus Cold-X / stable / structure: the brand claims are the weaker take |
| inj6-cannula | IMG_3653 16:51 | 4 | cannula | no | we use a cannula under the skin; the bruising line says why, which matters more |
| intro-brows | IMG_3640 16:44 | 4 | neuro-technique | no | too much in the forehead drops the brows; same point as the take he gives while injecting |
| intro-jaw-predict | IMG_3640 16:44 | 4 | jaw-lift | no | a tiny amount lifts the jawline: the result is shown and said at the end (after-summary) |
| intro-midface | IMG_3640 16:44 | 4 | midface | **yes** | names the mid-face concerns: jowling, laugh lines |
| intro-patient | IMG_3640 16:44 | 4 | opening | **yes** | the opening the brief asks for |
| neuro-12h | IMG_3657 16:57 | 4 | neuro-onset | no | difference by tomorrow; conflicts in wording with 'a day or two', and lacks the filler contrast |
| neuro-strategic | IMG_3657 16:57 | 4 | neuro-technique | no | strategic placement for smoothing and brow lift; long with pauses |
| pre1-lasts | IMG_3637 16:42 | 4 | neuro-lasts | no | same figure, said before the intro; the intro take is in sequence and on the same shot |
| after-collagen | IMG_3656 16:55 | 3 | laugh-cause | no | ageing: collagen and fat loss; a fourth take of the cause |
| after-natural | IMG_3656 16:55 | 3 | natural | no | nice projection, natural, not overfilled: repeats the summary |
| inj2-heaviness | IMG_3642 16:48 | 3 | jaw-lift | no | heaviness lifted: a third take of the jaw lift |
| inj2-replenish | IMG_3642 16:48 | 3 | laugh-cause | no | loss of volume replenished: the cause again, to the patient |
| inj5-jaw | IMG_3652 16:50 | 3 | jaw-lift | no | fuller cheekbones, jaw raised, slimmer: the result before it is finished |
| inj5-laugh-filled | IMG_3652 16:50 | 3 | laugh-cause | no | patients want the laugh lines filled: duplicate of intro-deflation's first sentence |
| inj6-pinpricks | IMG_3653 16:51 | 3 | cannula | no | one entry point vs many: starts mid-sentence ('versus before') |
| inj7-chin | IMG_3654 16:53 | 3 | chin | no | chin recession: named only here, never in the intro, so no area to anchor it to; cut for length |
| intro-frown | IMG_3640 16:44 | 3 | frown | no | shows the frown line, but 'frown lines' is already said in intro-typical |
| intro-hollow | IMG_3640 16:44 | 3 | laugh-cause | no | deflation in the mid cheek: a third take of the cause |
| intro-ligaments | IMG_3640 16:44 | 3 | laugh-cause | no | ligaments not holding the skin: the same cause, said again; cut for length |
| intro-onset | IMG_3640 16:44 | 3 | neuro-brand | no | faster onset, longer lasting: a product claim with no figure; cut for length |
| intro-overfilled | IMG_3640 16:44 | 3 | natural | no | patients fear looking overfilled; long; the after says 'not overfilled' again |
| intro-rejuv | IMG_3640 16:44 | 3 | target-cheeks | no | the same target restated as a principle |
| neuro-units | IMG_3657 16:57 | 3 | neuro-technique | no | units = the amount; setup for the next line |
| intro-30y | IMG_3640 16:44 | 2 | neuro-brand | no | experience and preference |
| intro-brand | IMG_3640 16:44 | 2 | neuro-brand | no | his product preference; promotional rather than explanatory |
| intro-elsewhere | IMG_3640 16:44 | 2 | neuro-technique | no | anecdote about other clinics |
| after-patient | IMG_3656 16:55 | 1 | patient | no | her reaction; another voice, chatter |
| intro-consent | IMG_3640 16:44 | 1 | thanks | no | thanks for filming; not information (consent to film is not consent to post) |
| intro-hi | IMG_3640 16:44 | 1 | greeting | no | pleasantry |
| intro-plan | IMG_3640 16:44 | 1 | plan | no | we'll show pictures afterwards: chatter |

## Duplicate map (every point he makes more than once)

Each point is used once, in its best take. Clip times are raw (m:ss). The result point (jaw lift, cheekbones, softer lines) is said in four places; only the after summary keeps it, and that summary drives the before/after.

| Point | Every take (clip at m:ss, score) | Chosen | Why |
|---|---|---|---|
| neuro-brand | intro-brand (IMG_3640 16:44 0:33.86, 2); intro-onset (IMG_3640 16:44 0:37.88, 3); intro-30y (IMG_3640 16:44 0:45.04, 2) | none (cut) | all takes ranked below the cut |
| neuro-lasts | intro-lasts (IMG_3640 16:44 0:55.10, 5); pre1-lasts (IMG_3637 16:42 0:07.45, 4) | intro-lasts | how long it lasts: four or five months (his figure) |
| neuro-technique | intro-brows (IMG_3640 16:44 0:56.55, 4); intro-elsewhere (IMG_3640 16:44 1:05.84, 2); neuro-units (IMG_3657 16:57 1:16.32, 3); neuro-strategic (IMG_3657 16:57 1:24.68, 4); neuro-more-less (IMG_3657 16:57 1:37.26, 5) | neuro-more-less | the technique in one line, said while injecting: more where it needs lift, less where it droops |
| neuro-onset | neuro-12h (IMG_3657 16:57 1:46.22, 4); intro-onset-vs-filler (IMG_3640 16:44 2:20.18, 5) | intro-onset-vs-filler | neuromodulator takes a day or two, filler shows right away: also why the after shows only the filler areas |
| laugh-cause | intro-deflation (IMG_3640 16:44 1:20.92, 5); intro-ligaments (IMG_3640 16:44 1:34.67, 3); inj5-laugh-filled (IMG_3652 16:50 0:26.96, 3); intro-hollow (IMG_3640 16:44 1:49.70, 3); inj2-replenish (IMG_3642 16:48 0:37.06, 3); after-collagen (IMG_3656 16:55 0:39.72, 3) | intro-deflation | why laugh lines form: deflation and soft tissue moving down, not the line itself |
| target-cheeks | intro-cheeks (IMG_3640 16:44 1:37.40, 5); intro-rejuv (IMG_3640 16:44 1:39.46, 3) | intro-cheeks | what he targets: filler in the cheeks |
| jaw-lift | intro-jaw-predict (IMG_3640 16:44 1:53.93, 4); inj2-jaw (IMG_3642 16:48 0:09.74, 4); inj2-heaviness (IMG_3642 16:48 0:18.66, 3); inj5-jaw (IMG_3652 16:50 0:16.00, 3) | none (cut) | all takes ranked below the cut |
| natural | intro-overfilled (IMG_3640 16:44 1:59.02, 3); after-natural (IMG_3656 16:55 0:45.30, 3) | none (cut) | all takes ranked below the cut |
| cheek-product | inj2-syringe (IMG_3642 16:48 0:03.82, 5); inj5-syringe (IMG_3652 16:50 0:01.78, 4) | inj2-syringe | the product, the amount and the spot: one syringe of Evolysse Form in the outer cheekbone |
| laugh-less | inj5-less-needed (IMG_3652 16:50 0:34.12, 5); after-less-needed (IMG_3656 16:55 0:22.28, 4) | inj5-less-needed | the payoff of treating the cheeks: the laugh lines improved, so less filler goes in them |
| cannula | inj6-pinpricks (IMG_3653 16:51 0:00.00, 3); inj6-cannula (IMG_3653 16:51 0:07.28, 4); inj6-bruising (IMG_3653 16:51 0:39.02, 5) | inj6-bruising | technique and downtime: a cannula, to minimise bruising |
| lines-product | after-smooth (IMG_3656 16:55 0:53.36, 5); after-thinner (IMG_3656 16:55 1:02.02, 4) | after-smooth | product handling for the lines: Evolysse Smooth, a hyaluronic acid in the same family |


Checked on the cut (`plan.json`, `verify.json` "structure"):
- **Text similarity** of every pair of kept spans: max difflib ratio 0.27 and trigram Jaccard 0.074 (intro-midface vs intro-cheeks), against limits of 0.6 / 0.25. 0 fails.
- **Shots:** no clip time range is on screen twice (pieces and pop-ups). The pop-up of IMG_3653 flows straight into its own full-frame piece as one continuous shot. The before/after stills are the one deliberate repeat.

## Briefs (with citations)

- **Pop-up at the exact point** (B02, B07, B09).
  - The injection clip grows out of the facial point he names, takes a box clear of his face, and returns into the point as a numbered marker (`zoom-box-inset`: G4 T5 Ik5Zt8oGko4 f1245-1399; numbered windows: G2 ETSQ T7).
  - The point is her tracked landmark: MediaPipe + One Euro 0.1 / 0.03 (DEC 14g), `oct14_track.py`.
  - Footage window radius 2 % of its width (DDOS R12); `arrive` 14 f; curved callout 7 f with the head last (DL §A, GMu3 f395-401). No dot-and-line.
  - B09 morphs to full frame instead (`morph` 26 f, MOTION §4.2), into the same shot's full-frame piece.
- **Lift ticks** (B03): `arrow-marker-tick` (WZ f940/944, 1 f pops) above the tracked brow tails; box slam (GMu3 f1512-1522).
- **Months rule** (B04): `timeline-markers` (Are.na 16463981), ticks on "four" and "five". His figure (DEC 14d rule 10).
- **Ledger** (B05): row wipe 14 f `sweep` on each row's words (DDOS Moment C).
- **Route on her face** (B06): `arrow-route-trace` 27 f (DDOS f216-250) from the cheekbone past the jaw line. A path of his words, not anatomy (DEC 14d rule 6). Markup sits on her, never on him (MOTION §1.7).
- **Rings** (B08): `tracking-ring` (G4 T20) on both laugh lines; highlighter 16 f on "better" (DDOS Moment A).
- **Before/after** (B11-B12):
  - Two labelled cards, never a slider (G1 R27, DEC 14d rule 1), entering plate-then-picture (M04 M1-M2).
  - Both cards push to the region and land on the word (MOTION §3 long build).
  - The same outline sits on both cards (G4 T18), and the rest dims to 0.45 instead of tinting her skin (MOTION §3).
  - A straight pointer (WZ f926-933) runs to the label.
  - "Immediately after the filler. Individual results vary." stays on.
  - Then the numbered summary and the rolling fact card (SU S2).
- **Captions:** word by word on onset (DEC 14d rule 8). "Evolysse" is spelled as the product he names (whisper heard "eboli's / Evolice / Everly's").

## Before/after

- **Before is IMG_3637 at 16.8 s (4:42 PM), not the intro.** In every intro frame she is turned 24-43 deg toward him (yaw, measured), while in the after clip she faces the camera (+1 to +27 deg). That pair would be 45 deg apart, so it is not a fair comparison. IMG_3637 is before any injection, and its frame is 6.5 deg from the after frame. The card says "4:42 PM · before".
- **After is IMG_3656 at 12.2 s,** aligned to the before by rotation and scale only (residual 2.6 px).
- **Arrows only where a change is measured AND visible:** one region, the cheek. See `ARROWS.md`.

## variety_check

PASS:
- R1: max 2 uses.
- R2: 6 entries, none consecutive.
- R3: text-only 1/12.
- R4: worst 60 s window 11 devices, 16 in total.
- R5: never-built arrow-marker-tick, arrow-straight-pointer, card-full-morph, zoom-box-inset.
- R6-R12 pass, including the injectable compliance profile: not_for_posting; brands only where he says them; result beats carry "results vary".

## Measured on the final render (`verify.json`, `brand/scripts/oct14_verify.py`)

- **Format:** 1080x1920, 24 fps, 2,251 frames, 93.9 s, including the 3 s end card. Target about 90 s.
- **Coordinator's checks:** no duplicate lines (max similarity 0.27, 0 fails). Each area's injection footage is on screen in the same beat as his line or the next one (upper face 0, cheeks 1, laugh lines 1). No shot is reused.
- **Name:** 0 name-like words in a fresh local transcript of the render. No clip says her name at all.
- **Words:** cut vs heard sequence ratio 0.978 (336 / 341 words).
- **Loudness:** −14.2 LUFS integrated, true peak −1.3 dBFS. The phone audio rendered at −34.2 and is mastered by `oct14_prep.py master` (two-pass loudnorm, picture copied).
- **Captions:** 319 of 336 words measured, median 0 f from the onset, 78 % at 0 f, 81 % within ±1 f.
- **Reveals:** median +1 f, 8 of 11 within ±1 f. The three outside it:
  - B04: the months card enters on its piece start, by design; its ticks land on "four" and "five".
  - B09: the window catches the previous beat's exit.
  - B10: the highlighter's slow `sweep` start, +3 f to 10 %.
  - B12's rolling value is below the probe threshold, so it isn't measured.
- **Other checks:** static-image PASS; 0 one-frame flashes; lint_compositions PASS (0 dot-and-line, 5 files); variety_check PASS.
- **Fixed after the first render:** the B06 route started on "moving" and could not finish before the cut. It now draws early and lands on the word.


## v3 cut list, one reason per cut (2026-11-17)

29 cuts. Every voice cut sits in measured silence (≥ 80 ms; see verify.json v2.cut_gap).

| At | From → to | Kind | Reason |
|---|---|---|---|
|   1.5 s | intro-patient → intro-typical | voice + picture, in silence | Hook over: from the needle-at-her-cheek B-roll (picture) back to the two-shot for his first line, "a typical patient". |
|   3.2 s | intro-typical → intro-typical/b | picture only (voice continuous) | Glossary: he says "forehead lines". Picture-only cut to her own forehead in the neuromodulator clip, punched in 2.4x on the landmark. |
|   4.1 s | intro-typical/b → intro-typical/b/b | picture only (voice continuous) | Glossary: "frown lines". Picture-only cut to her frown in the same clip, punched in on the glabella. |
|   4.5 s | intro-typical/b/b → intro-dynamic | voice + picture, in silence | Back to the two-shot for "crow's feet" (sentence start, 80+ ms silence). |
|   5.3 s | intro-dynamic → intro-dynamic~2 | voice + picture, in silence | Trim of a false start ("she's got … she's got"). The jump is covered by the 1.1 punch. |
|   6.3 s | intro-dynamic~2 → intro-dynamic~2/b | picture only (voice continuous) | Glossary: "crow's feet". Punch in 2.0x at her eye, with pen strokes along the fan. |
|   7.1 s | intro-dynamic~2/b → intro-dynamic~2/b/b | picture only (voice continuous) | Back to wide for "dynamic lines … neuromodulator". Injection 1 pops up over it. |
|  14.6 s | intro-dynamic~2/b/b → neuro-more-less | voice + picture, in silence | Technique line, cut to the clip where he injects the neuromodulator (he says it while injecting). |
|  21.9 s | neuro-more-less → intro-lasts | voice + picture, in silence | Duration line (back to the intro). The 30 s of brand talk between them are dropped (ranking). |
|  23.7 s | intro-lasts → intro-onset-vs-filler | voice + picture, in silence | The onset contrast he makes at the end of the intro, moved up to close the upper face (same topic). Punch 1.1 covers the jump. |
|  29.8 s | intro-onset-vs-filler → intro-midface | voice + picture, in silence | Section turn 02: "moving to her mid face". |
|  31.8 s | intro-midface → intro-midface~2 | voice + picture, in silence | Filler trim ("um"). Covered by the 1.1 punch. |
|  32.6 s | intro-midface~2 → intro-midface~2/b | picture only (voice continuous) | Glossary: "jowling". Punch in 2.0x on her jaw, with a pen contour. |
|  33.8 s | intro-midface~2/b → intro-deflation | picture only (voice continuous) | Kept joined to the jowling line: "patients want their laugh lines filled. But really …" stays one span (setup with its "but"). |
|  41.5 s | intro-deflation → intro-deflation~2 | voice + picture, in silence | Trim of the ligament aside (repeats the deflation claim). Same claim, punch back to 1.0. |
|  43.1 s | intro-deflation~2 → intro-deflation~3 | voice + picture, in silence | Trim of a stutter. Covered by the 1.1 punch. |
|  44.8 s | intro-deflation~3 → intro-cheeks | voice + picture, in silence | "So we're just going to put a little filler in the cheeks": the "instead" of the argument. |
|  46.6 s | intro-cheeks → intro-cheekbones | voice + picture, in silence | His reason, "it's really more about addressing the cheekbones" (restored in v3; cut in v2). |
|  48.8 s | intro-cheekbones → inj2-syringe | voice + picture, in silence | Cut to the injection: he names the product and the spot while injecting. Pop-up 2. |
|  51.8 s | inj2-syringe → inj5-less-needed | voice + picture, in silence | Section turn 03: her close-up after the cheeks, "the laugh lines got better" (the result of the "instead"). |
|  55.5 s | inj5-less-needed → after-smooth | voice + picture, in silence | His product line for the lines (said in the after clip), laid over the line injection (picture inj5 16 s), so the words sit on the act. |
|  64.9 s | after-smooth → inj6-bruising | voice + picture, in silence | Cut to the cannula clip for "I like using a cannula" (said while injecting). |
|  70.2 s | inj6-bruising → inj6-bruising/b | picture only (voice continuous) | Same shot, the tail of the sentence. A 1.12 punch covers a removed pause. |
|  71.2 s | inj6-bruising/b → after-summary | voice + picture, in silence | Section turn 04: "we're done", the result. |
|  74.3 s | after-summary → after-summary/b | picture only (voice continuous) | B-roll of the line injection (inj7) under "when she came in … laugh lines deep": shows what he is describing. |
|  76.5 s | after-summary/b → after-summary/b/b | picture only (voice continuous) | Back to the after close-up for "marionette lines" (glossary pen strokes). |
|  78.3 s | after-summary/b/b → after-summary/b/b/b | picture only (voice continuous) | Into the surgeon before/after under "proper cheek bone projection, jaw line lifted". |
|  85.3 s | after-summary/b/b/b → after-15min | voice + picture, in silence | Treatment time (same clip, a later sentence). 1.1 punch. |
|  87.8 s | after-15min → after-lasts | voice + picture, in silence | Duration line, from 45 s later in the after clip. 1.0 punch (alternation). |

## v3 glossary: terms he names and what is shown

| Term (in cut) | Shown |
|---|---|
| Forehead lines | punch-in 2.4x on her forehead (neuromodulator clip), label "This is / Forehead lines" |
| Frown lines | punch-in on her frown, label "This is / Frown lines" |
| Crow's feet | punch-in 2.0x at her eye on her smile, three white pen strokes along the fan, label |
| Dynamic lines | the three above, then pop-up 1 "Frown lines (dynamic)" |
| Jowling | punch-in 2.0x on her jaw, white pen contour, label |
| Deflation / soft tissue descent | the route trace from cheekbone to below the jaw, Label C "The source / Deflation" |
| Laugh lines | rings on her close-up (inj5), "Usually vs here" columns |
| Cheekbones | pop-up 2 at the outer cheekbone; the surgeon X marks and hatched zone on the before |
| Marionette lines | white pen strokes from the mouth corners on her after close-up, label |
| Cannula | TechLine "A cannula / to minimise bruising" over the cannula clip |
| Neuromodulator | pop-up 1 "used here", MonthsRule, Ledger |
| Hyaluronic acid filler | named by his words only (Evolysse Form / Smooth labels) |

No bank examples were needed: every named condition had an example on her own face (GLOSSARY.md bank examples stay on-air only).

## v3 photo and source per beat (REELS_HOW_I_WOULD_BUILD item 7)

| Beat | Picture / image | Source |
|---|---|---|
| Hook 0–1.8 s | her face 4:42 PM → 4:55 PM, registered, with the measured cheek line | IMG_3637 at 16.83 s and IMG_3656 at 12.17 s (pair.json; contour_measure.json) |
| B01 | needle at her cheek; her forehead and frown (punch-ins) | IMG_3650 0:08; IMG_3657 0:33.6 and 0:04.6 |
| B02–B03 | ClipCard: the neuromodulator injection; frown-muscle drawing (contracting, then lift / pull-down forces) | IMG_3657 0:09; face.glb (Z-Anatomy muscles), anatomy_measure.json |
| B04–B05 | month ruler; day-axis lanes; B-roll of a filler injection on "with fillers" | his figures; IMG_3642 0:25 |
| B06 | jowl punch-in; her with a hand mirror ("patients come in…"); him assessing her before ("deflation"); profile drawing, deflate / descend / filler restores; compare ClipCards | IMG_3640; IMG_3638 (pre2) 0:05; IMG_3637 (pre1) 0:10; face.glb; IMG_3654 1:10 and IMG_3650 0:20 |
| B07 | ClipCard: the cheek injection | IMG_3641 0:06 |
| B08 | her close-up, pen lines on both folds (tracked) | IMG_3652 0:34 |
| B09 | ClipCard: the cannula; Form vs Smooth gel drops (illustration) | IMG_3653; drawn, his words "not as thick" |
| B10 | the cannula clip; needle vs cannula skin section | IMG_3653 0:35; skin_crosssection.glb |
| B11 | marionette pen lines; SkinCard window with markup and the measured cheek line | IMG_3656 0:24.6; pair as the hook |
| B12 | facts; end card on the sharp last frame | IMG_3656 |

Searched and not used (time box): the clinic library for product boxes / syringe close-ups from Oct 14 (only the 13 clips exist for the visit); the maker's Evolysse Form / Smooth product photos (allowed, not fetched; open item, approval list).
