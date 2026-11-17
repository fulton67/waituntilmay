# Under-eye filler reel v2: argument map, beats and cuts

**NOT FOR POSTING until patient consent = yes** (catalog consent: unknown; P0001/P0002). v1 stays as it was, for comparison:
`brand/edits/undereye-filler/UndereyeReel_FINAL_NOT-FOR-POSTING_consent-unknown.mp4` (v1). This is v2:
`UndereyeReel_v2_NOT-FOR-POSTING_consent-unknown.mp4`. Machine files: `cut_v2.json`, `beats_v2.json`, `verify_v2.json`,
`sketch_measure.json`, `facematch.json`, `AI_SLOTS.md`. Decisions: DECISIONS 15c.

## Argument map (built from the full transcripts of IMG_6816, 6817, 6818, 6821 and IMG_7044, before cutting)

| Step | What he says (source) | In the cut |
|---|---|---|
| Problem | Hollows under her eyes create an illusion of being tired; she isn't; she wants her lower eyelids filled (6816 0:13-0:26) | P03, P03b |
| What he uses | A hyaluronic acid filler, with lidocaine in it, through a blunt cannula (6816 0:26-0:35; 6817 0:55-1:02) | P04, P08 |
| The usual way, and why not | Needles: the conventional way causes a lot of swelling and bruising; patients are bruised for over a week (6821 0:09-0:15; 6816 0:35-0:39) | P17 (setup) |
| ... but here | One pinprick: you can't tell, no bruising or swelling (6821 0:15-0:20, 0:31-0:34) | P17 (the "but", in the same piece as its setup), P19 |
| How | One insertion point, deep, under the muscle, so it looks natural (6817 1:12-1:26) | P07, P09 |
| More filler, or not | Do we add another syringe? It will expand; never a pillowy look. In her case there's already a beautiful improvement: no more (6818 0:03-0:26) | P14, P15 (setup and decision kept together) |
| Why deep | Deep placement avoids the bluish Tyndall effect (6818 0:26-0:31) | P15 |
| Result | One pinprick; photo in a week or two once settled (6821); the 10-04 photo; her words (7044) | P17, P19, H1, H2 |

Two contrasts are shown side by side, the approach he doesn't use marked "Not used": **needles vs blunt cannula** (B14) and **another
syringe vs one syringe** (B12).

## Named conditions and their examples (user rule 3; GLOSSARY.md)

| Term he says | Example on screen | Source |
|---|---|---|
| hollows (under the eyes) | her own 9-20 eye close-up (IMG_6814), arrows to each hollow | footage, shown clearly |
| tired (look) | struck "Tired?" → his word "An illusion." | type |
| bruising / swelling | a designed bruise swatch in the "Needles" card (AI slot `bruising` when connected) | designed, Illustration |
| pillowy look | a lid contour whose bulge swells on "expand" (AI slot `pillowy`) | designed, Illustration |
| Tyndall effect | a skin swatch with a blue streak under the lid line (AI slot `tyndall`); not drawn on her | designed, Illustration |
| tear trough / under-eye | the measured sketch: hatch over each hollow, on her 9-20 before frame | measured |

## Cuts and their reasons (v3; every audio cut lies in a measured pause, 80 ms minimum; 15 ms fades)

| At (f) | Join | Pause out / in | Reason | Covered by |
|---|---|---|---|---|
| 127 | H1 (her) → P03 (him) | 90 / 520 ms | the hook ends; the argument starts with the problem | clip change (her testimonial → him) |
| 315 | P03 → P03b | 110 / 100 ms | trims "and" between his two sentences about her concern | punch-in 1.12 on his shot |
| 395 | P03b → P04 | 450 / 150 ms | trims "So we're gonna go ahead and use a filler." (said again in the next line) | B-roll: the syringe close-up |
| 509 | P04 → P05 | 530 / 630 ms | trims "There's nothing sharp. It's not we don't use needles..." (a restart; the needle claim comes later with its "but") | punch-in 1.12 |
| 733 | P05 → P08 | 270 / 680 ms | argument: from what he uses to how (the procedure) | clip change (6816 → 6817) |
| 842 | P08 → P09 | 240 / 750 ms | trims 12 s (numbness lasts half an hour; "I just go ahead and just basically") | punch-in 1.1 |
| 995 | P09 → P10 | 440 / 150 ms | trims 42 s (the half syringe, the pause to show the sides) | the sketch still → footage |
| 1094 | P10 → P14 | 500 / 170 ms | argument: from how to the decision (more filler or not) | clip change (6817 → 6818) |
| 1372 | P14 → P15 | 150 / 430 ms | trims "She has a big improvement already, and we're just going to make a decision whether she needs to have more." (the decision is kept in the next sentence) | punch-in 1.15 |
| 1542 | P15 → P17 | 110 / 80 ms | argument: the result, with the needle-vs-cannula contrast kept whole with its "but" | clip change (6818 → 6821) |

Removed in v2/v3 because they had no reason in the argument or confused it: "using a little needle here" (the entry needle read as a contradiction of "no needles"), "So we went ahead and did one syringe" (the one syringe is on the decision card), the water / hydrophilic explanation, and the patient's two-part quote split across hook and close (now one piece, setup and "but" together).

## v3 assets per beat and the search log (REELS_HOW_I_WOULD_BUILD "Asset column")

Searched: `clinic-library/catalog/catalog.sqlite` assets dated 2021-09-20, 09-30 and 10-04 (read-only). That session holds IMG_6813-6818, 6821 (clips), IMG_6823 (her beside a tablet with the before photo), IMG_7044 (testimonial), IMG_1215 (the before/after pair; catalog `needs_review = 1`, flagged for client approval). No syringe, product box or tray photo exists for the session, so the syringe is a designed object and the filler stays unnamed. Cut-outs (rembg / RVM) were not made in v3 (time box; open item).

| Beat | Picture | Source |
|---|---|---|
| B01 hook | full-frame registered wipe Sept 20 -> Oct 4, then the SkinWindow | IMG_1215 halves registered to IMG_6815 (`undereye_beforeafter.py`) |
| B02 hollows | her eye close-up in a ClipCard; the tear trough in section with the overhead light | IMG_6814 (0.2-1.7 s, before her hand covers it); face.glb section (`undereye_section_lines.py`) |
| B04 cannula | needle vs cannula at a vessel; one entry fanning | designed (topic-only) |
| B05 afterwards / lasts | the 10-04 photo; months ruler | IMG_1215 after half |
| B06 lidocaine | syringe barrel with gel + lidocaine | designed object (no session photo of the syringe) |
| B07 deep | fan map tracked on the injection; section "deep" | IMG_6817 + sketch_measure.json; face.glb |
| B08 fuller/deeper | boxes on both under-eyes | IMG_6817 tracked |
| B09 another syringe | one vs another (pillowy profile) | designed |
| B10 Tyndall | light scatter on the section | face.glb section |
| B11-B12 needles vs cannula, pinprick | ClipCards; white Arrow to the read entry | designed; IMG_6821 tracked |
| B13 result | SkinWindow before -> after, sketch locked, arrows where measured, the shadow-contrast stat | IMG_1215 / IMG_6815; beforeafter.json |
