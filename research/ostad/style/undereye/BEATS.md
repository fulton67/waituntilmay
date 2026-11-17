# Under-eye filler reel: beat sheet and graphics brief

**NOT FOR POSTING until patient consent = yes.** The catalog has consent = *unknown* for this session (P0001/P0002).

Dr. Ostad, 2021-09-20, one session, four phone clips (1080×1920): IMG_6816 (intro, 52 s), IMG_6817 (procedure, 4:37), IMG_6818
(assessment, 47 s), IMG_6821 (result, 35 s). The reel is 9:16, 24 fps, his words only, in his order with one exception (B12).

Files:
- `cut.json`: the 19 pieces as spoken phrases, and the cue words. `brand/scripts/undereye_prep.py` resolves them to frames.
- `beats.json`: the machine sheet (schema of `exomind/beats.json`), written by `tools/gen_beats_undereye.py`. Frames there are final.
- `verify.json`: the measurements of the render (`brand/scripts/undereye_verify.py`).
- Code: `brand/remotion/src/undereye/` (own entry point `index.ts`, composition `UndereyeReel`).

**Time base.** Composition frames at 24 fps on the 1.1× edit. A reveal starts on the cue word's onset frame + 1 (MOTION §3).
**Privacy.** Piece P01 ends on "beautiful patient," and P02 starts on "who has just requested": her name, spoken between them, is cut
out of the audio. The two other places her name is spoken (IMG_6817 at about 0:06 and 1:47) are outside every piece. On screen she is
"our patient" or nobody. No word list with her name is stored: the prep script redacts it on read.

## The line, the literal visual, the device

The noun column is the thing on screen; no beat shows words where the thing can be shown (ONBOARDING lesson, `exomind/BEATS.md` §0.2).
Refs are DEVICE_LIBRARY ids with their reference frames; tokens are MOTION §2.

| Beat | He says (cue word in bold) | Literal visual | Device id(s) | Entry | Reference (frames) | Tokens |
|---|---|---|---|---|---|---|
| B01 | "We are here with our lovely, beautiful patient, who has just requested that we inject **fillers** for her **lower eyelids**." | Title of his own words, word by word; his name super | `name-super` (+ title card) | `type-word-fade-rise` | DDOS f3-13 (5 f rise, 0 overshoot); name super G3 13/13 | 5 f per word on its onset; NameCard 4.2 s |
| B02 | "She's a bit bothered by kind of the **hollows** under her eyes" | A loupe opens over her clothes (the empty band) and magnifies the hollow under her eye; a curved headed arrow from the loupe to the spot; "Under-eye hollows" types | `loupe-zoom`, `arrow-curved-callout` | `type-typewriter` | loupe G4 T2 5J8M f1168; callout GMu3 f395-401 (7 f, head last); DDOS B09 typing | loupe opens 10 f `arrive`; arrow 7 f `sweep`; 1 char/f |
| B03 | "which kind of creates this illusion of kind of being **tired**. She's **not**," | "Tired?" struck through, replaced by his word "An illusion." | `type-strike-replace` | `type-strike-replace` | G3 T13 D_bh f3350 (strike 8 f @30 = 6 f; old line dims and rises) | strike 6 f `sweep`; new line `arrive` 14 f |
| B04 | "So we're gonna go ahead and use a **filler**. This is a hyaluronic **acid** filler" | The actual syringe from this session, on a glass plate, then the picture through it; chip "Hyaluronic acid filler · with lidocaine" | `product-plate-reveal` | `type-rise` | ro yaFInenV3Eg f618-674; M04 M1-M2 plate-then-picture | `plate` 18 + 18 f; chip `arrive` |
| B05 | "and we're gonna use a **cannula**. I like using cannulas because they're **blunt**. There's nothing **sharp**." … "we don't use needles because that can cause a lot of **swelling**, **bruising**." | Two labelled cards: a cannula's rounded tip with its side port, a needle's bevel; "Blunt" and "Sharp" highlighted on their words; "Swelling" and "Bruising" land under the needle | `split-labelled` | `type-highlight-sweep` | G1 T11 / G3 T6 (L23, never a slider); highlighter DDOS Moment A | cards `plate`; highlighter 16 f `sweep`; chips `arrive` |
| B06 | "And these fillers typically **last** anywhere from a **year** to a year and a **half**." | A months rule 0-18; a tick drops at 12 on "year", at 18 on "half", and the span between fills ice | `timeline-markers`, `arrow-marker-tick` | `type-rise` | Are.na 16463981; WZ f940/944 (ticks 1 f) | rule 14 f `sweep`; tick 1 f; band 18 f `sweep` |
| §02 | section card "02 · The procedure" | glass pill, one look for every section | `chapter-title-card` (structural) | | MOTION §4.3 (cards only at chapter turns) | `arrive` 14 f, `exit` 7 f |
| B07 | "create a little **insertion** point using a little needle here." | A ring re-placed every frame on the entry point on her cheek (face-tracked), "One entry point" typed beside it | `tracking-ring` | `type-typewriter` | G4 T20 tQkjtXJEtxY f851-1091 | ring 5 f `arrive` |
| B08 | "There is a bit of anesthetic already in the filler. It's what we call **lidocaine**." | "Lidocaine" slams up with an ice box behind it; "Numbing, already in the filler" | `type-box-slam` | `type-box-slam` | GMu3 f1512-1522 (4 f + 4 f) | 4 f rise, 4 f box `sweep` |
| B09 | "inject the filler **deep** into the tissue. We basically go right **underneath** the muscle so that it looks super natural." | The cannula's path traced on the real footage from the entry point along the under-eye, head landing at the inner corner; "Deep, under the muscle" | `arrow-route-trace`, `mechanism-on-real-image` | `type-typewriter` | DDOS f216-250 (27 f, peak 44 %); G1 T8 IkrW f610-880 | trace 27 f `sweep` |
| B10 | "you can already see how her lower eyelid is **fuller** on the right versus here where it's kind of **deeper**." | Boxes draw round both under-eyes (tracked), the rest dims to 0.4; "Fuller" under the treated side, "Deeper" under the other | `annotation-box-footage` | `type-rise` | G4 T2 5J8M f2293-2311; dim the rest G4 T6 | dim 12 f `sweep`; box 14 f `sweep` |
| B11 | "These fillers **absorb** water. And I try to use fillers that are not **hydrophilic** … It's not **pillowy**." | One glass panel: water drops fall into two gel beads; one swells round, the low-water one barely changes; "Not hydrophilic" highlighted. Labelled "Illustration" | `topic-glass-panel` | `type-highlight-sweep` | our rosacea MicrobeCard (ROS f795-862) | swell on `settle`; highlighter 16 f |
| B12 | "And I went ahead and just basically put **half** a syringe." … "So we went ahead and did **one** syringe." | A white card with the syringe; the amount rolls "½ syringe · one side" → "1 syringe · both sides" | `rx-card` | `type-rolling-swap` | L05 (SU S2 650 ms outExpo; G2 T16) | `swap` 16 f |
| §03 | "03 · The decision" | | | | | |
| B13 | "do we want to put **another** syringe in there? And I always take into account the fact that this is going to **expand**." | "Another syringe?" laid dim, each word lit on its onset with the ice block; on "expand" a straight headed arrow rises: "It will expand" | `arrow-straight-pointer` | `type-ghost-to-lit` | WZ f238-263 (L02); WZ f926-933 (7 f) | words lit ±0 f; arrow 7 f |
| B14 | "the key is to inject deep, to avoid that **bluish** hue called the **Tyndall** effect." | Over a close-up of her face, a soft blue tint comes up under both eyes (tracked), named "Bluish hue: the Tyndall effect", then clears: "Avoided by injecting deep". Labelled "Illustration" (it is what the effect looks like, not her result) | `region-light-on-model` | `type-typewriter` | ig_DdrkdrYv-yW f600-660 (tint ~6 f) | tint 6 f; clear 20 f `sweep` |
| §04 | "04 · The result" | | | | | |
| B15 | "she can go out here and **nobody** would know yet she had fillers done." | Her face right after, in a rounded card, grows to the full frame on "nobody would know" | `card-full-morph` | `type-rise` | NAP §3B (MOTION §4.2, L09) | `morph` 26 f, surround 5 f |
| B16 | "you can't tell other than that really one actual **pinprick**" | A curved headed arrow to the pinprick on her cheek; "One pinprick" | `arrow-curved-callout` | `type-typewriter` | GMu3 f395-401 | 7 f, head last |
| B17 | "We're going to basically show her photo in about a **week** or two when really the filler is settled," … "But she won't have any bruising or swelling. Thank you." | A strip "Today · Week 1 · Week 2 · Week 3"; a ring closes round weeks 1-2: "Follow-up photo"; "Individual results vary." | `calendar-date-circle` | `type-scale-pop` | Are.na 31223791; Ro `Calendar` | ring 12 f `sweep` |
| End | | End card "Book a consultation. / Link in bio." over the last shot | `EndCard` (kit) | | DEC 11 | |

## Decisions made while writing

- **Brand of filler: not named.** He says a product name at IMG_6818 0:35, but the catalog transcript renders it as a word that is not
  a product name, so it is not a clear match to any filler; and no label is readable in the 432×768 stills. The clinic rule applies:
  the reel says "hyaluronic acid filler" (re-checked on the full-size footage, see DECISIONS 15).
- **B12 is the one reorder.** "half a syringe" (IMG_6817 1:26) is moved next to "did one syringe" (3:31), after B10-B11, so the amount
  rolls once in one card. Everything else is in his order.
- **B-roll under his voice** (P07, P15, P16-P17): his audio, her close-up from the same session, because the markup belongs on the
  treated area and his own shot at those moments is a wide or a two-shot.
- **Placement.** In the two-shots both faces fill the top half, so graphics go to the chest band (y 1000-1500) over clothing; in the
  close-ups the card and type sit top or bottom, never over her eyes (B10/B14 markup *is* on the under-eye, which is the condition).
- **Text-only beats** are B03 and B08 (2 / 17 = 12 %), five beats apart.
- **No numbers he doesn't say.** The figures on screen are his: 12 and 18 months, ½ and 1 syringe, weeks 1-2.
