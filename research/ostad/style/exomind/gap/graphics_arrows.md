# Gap: graphics and arrows, YouTube v6 (EXOMIND_REDO §4.3)

Measured 2026-11-17 on the pixels of `Downloads/Ostad - Exomind and total skin health (YouTube v6).mp4` (2166 f, 24 fps, 1920×1080). Nothing in the composition was changed.

**Compared against:**
- the rosacea render `Downloads/Ostad - Rosacea laser (v5, clean captions).mp4` (1080×1920);
- the DEVICE_LIBRARY reference frames for the same beat type;
- v4.1 and v5 at the same composition frame.

**Files:**
- Numbers: `graphics_arrows.json` (committed).
- Sheet: `research/ostad/style/exomind/v6_frames/gap_graphics_arrows.jpg`. It is gitignored because it holds his face, BTL, patient and reference frames. It has 7 rows: callout, pointer, arc, flow, mechanism, real-image markup and repeats, with v6 | rosacea | reference / v4.1 in each.

**Method:**
- **Arrow pixels:** within RGB distance 70 of brand blue `#37a9e8` (38 on B18's teal film), inside a region of interest for each arrow.
- **Stroke width:** skeleton × distance transform.
- **Tip:** the extreme mask pixel along the arrow's direction.
- **Text:** EasyOCR through `tools/ocr_track.read` at the reference study's settings, so v6, rosacea and the corpus are read the same way. Box height is scaled to a 1080 px short side and quantised at about 6 px.
- **Reuse:** `tools/reuse_check.py` on the 20 key frames.

## 1. Arrows, per arrow

| beat | variant | colour ΔRGB from #37a9e8 | shaft px (60–140 px back from tip) | head | head width px | tip vs code `to` | tip to target | crosses text |
|---|---|---|---|---|---|---|---|---|
| B02 | straight-pointer (inside Stage ×1.15) | 3.2 | 8.4 (nominal **9.2**) | rounded triangle | 27.5 | 2.5 px | on the applicator pad rim (0) | **123 px across the FDA chip** |
| B03 #1 | curved-callout, head → Mind | 1.7 | 8.0 | barb | n/a (merges with rim) | n/a | 15 px outside the Mind rim | no |
| B03 #2 | curved-callout, Mind → Our approach | 1.6 | **2.0** | barb | 33.1 | n/a | 18 px outside the rim | no |
| B03 #3 | curved-callout, → Your skin | 1.6 | **2.8** | barb | 23.1 | n/a | 3 px outside the rim | no |
| B07 | arc-connector + chat icon | 2.2 | 2.0 at the dash gap; 8.0 behind | rounded triangle | 33.8 | n/a | 3 px inside the Thu 10:30 slot, **43 px from its centre**; the icon sits on the slot | **114 px through the "Wed 16 10:30" slot** |
| B12 | marker-tick ×3 | 2.0 | n/a | triangle | 20.0 | n/a | 8 px above the line | no |
| B16 | curved-callout, his temple → "Emotional stress" | 1.4 | 8.0 | barb | 33.5 | 2.0 px | 10 px left of the label | no |
| B17 | orbit-arc ×3 + dashed ring | **20.9** (ring at 50 % alpha) | 8.0 / ring 3.4 | barb | 33.6 | n/a | front of the frontal lobe | no |
| B18 | route-trace on the BTL MOA film | 1.0 | 7.2 | barb | 31.7 | n/a | lit soma (≈ 15 px) | no |
| B20 | dashed-flow, clip → quote | 2.9 | 5.6 | rounded triangle | 23.0 | 3.0 px | 19 px left of the quote card | no |

**Consistency** (Naim: "all the same brand blue, one weight, a real head"):
- **Colour.** 9 of 10 arrow marks are within ΔRGB 3.9 of #37a9e8. The B17 orbit ring reads as a second, paler blue (ΔRGB 20.9).
- **Weight.** One nominal weight (8 px), but:
  - B02 is scaled to 9.2 px by the B02 `Stage` (k 1.15), so +15 %;
  - B03's two connectors never reach 8. Each is 55–60 px long with a 37 px barb, so the head is about 62 % of the arrow and the shaft is 2.0–2.8 px. They read as loose chevrons, not arrows.
- **Head.** There are **2 head shapes**: a barb (callout, route, orbit) and a rounded triangle (pointer, arc, dashed, tick). Measured head widths run 20–34 px (1.7×).
- **Against the references:**
  - GMu3 f404 callout: shaft **2.8 px** (p90 4.0) at the 1080 short side, so ours is 2.9× heavier. Its head is about 30 px on a 2.8 px line, ≈ 10× the stroke; ours is 4.6×.
  - D_bh f1140 arc dashes: 8.0 px, which matches ours.
  - Do not thin ours back towards a hairline: Naim called the 4.6 px stroke cheap (DEC 14l). The gap is the ratio and the mix of heads, not the 8 px weight itself.
- **Landing.** Tips land on the code target within 2.0–3.0 px.
  - Every tip has a meaningful target.
  - 2 of 10 cross text on the way: B02 runs 123 px over "FDA-cleared", and B07 runs 114 px through "10:30".
  - The references keep a clear path: GMu3 0 px over text, D_bh 0 px.
- **Real images.** **0 of 10 arrow marks point to a spot on a real practice photo.**
  - Their targets are cards, labels, diagram windows, a product cut-out (B02) and renders/film (B17, B18).
  - The rosacea reel rings the exact spot on a real image 4 times in 119 s (f235, f1110, f1477, f2666), on the spoken noun.
  - B12 shows IMG_3714 (coil on the forehead, console timer 24:30) with **no markup**, although ROSACEA_METHOD §4a planned two rings on it.

## 2. Per beat: card width, smallest text, literal subject, repeat

Card width is the main card: px, % of the 1920 frame width (% of the 1080 short side). Min text is the OCR box at 1080, scrub embroidery excluded.

| beat | said (short) | card | min text | literal subject? (no empty signifiers) | repeats an earlier look? |
|---|---|---|---|---|---|
| B01 | "your evening" | wordmark | 42 | title card (n/a) | no (0.258) |
| B02 | "ExoMind" | 805 px, 42 % (75 %) | 42 | yes: the unit | no |
| B03 | "the mind in our approach to your skin" | 3 round windows of 260 px, 13.5 % (24 %) | 36 | **partial, 1 of 3:** Mind is the Flora AI glass brain; **Your skin is the BTL stock model face** (`model_1012.jpg`), the "stock face" Naim banned; Our approach is IMG_3712 | **yes:** the same glass-brain render as v4.1/v5 B03 |
| B04 | "your questions … conversation" | 1240 px, 65 % (115 %) | 36 | yes: real consult | no |
| B05 | "notify winners by email or phone" | 820 px, 43 % | 24 | yes: email and call panels (generic glyphs) | no |
| B06 | "check your texts" | phone 560 px, 29 % | 36 | yes | no |
| B07 | "reply … find an appointment" | calendar 660 px, 34 % | **18** | yes (labelled Illustration) | no |
| B08 | "goals, medical history" | 930 px, 48 % | 24 | yes | no |
| B09 | "your questions … question box" | 840 px, 44 % | 24 | **partial:** brochure-FAQ questions under **invented askers "Maya / Jordan / Sam"** | no |
| B10 | "if we haven't covered" | 800 px, 42 % | 42 | yes (ledger of tonight) | family of the rosacea Checklist (tick rows) |
| B11 | "our team" | 740 px, 39 % | 42 | yes: staff footage | coil-on-patient, 2nd use |
| B12 | "seeing you in the office" | 640 px, 33 % + 260 pip | 36 | yes: IMG_3714, but unmarked | coil-on-patient, 3rd use |
| B13 | "comprehensive approach" | ring ≈ 525 px | 36 | yes (after the 14m fix) | IMG_3712, **2nd use in this edit** |
| B14 | "next frontier" | type only | 60 | words only (allowed 1 in 5) | **yes:** the same phrase card, type only, as v4.1/v5 (0.195, the closest hash in the edit) |
| B15 | "beyond classic treatments" | 1150 px, 60 % | 48 | yes: Fraxel vs ExoMind | coil-on-patient, 4th use |
| B16 | "emotions improve our skin" | 800 px, 42 % | 36 | **partial:** a rosacea flare-trigger chart (stress worsens), against the line's "improve" | no |
| B17 | "neuroplasticity" | full-bleed plate | 24 | **partial:** AI glass skull plus BTL applicator (conceptual, labelled) | **yes:** glass head + coil from above, as v4.1/v5 B17 |
| B18 | "rewire the brain" | full bleed | 38 | yes: BTL MOA film | no (v4.1 used a white neuron field) |
| B19 | "neurotransmitter … focused" | 876 px, 46 % | 36 | yes: built synapse | no |
| B20 | "feel better" | 560 + 430 px, 29 % / 22 % | 24 | yes: the real patient, her words | **yes:** same clip, tall left window + "It quiets my brain." right, as v4.1 and v5 |

**Literal subject:** 14 yes, **4 partial** (B03, B09, B16, B17), 2 n/a.

**Repeats:**
- **4 of 20 beats** repeat the v4.1/v5 look at the same beat (B03, B14, B17, B20).
- The pixel hash passes everywhere (nearest 0.195–0.281 against a threshold of 0.107), because colour and layout moved while the content and composition did not. A hash check alone does not catch "same idea, restyled".
- Inside the edit, the coil-on-a-reclining-patient picture appears in **5 beats**: B03, B11, B12, B13, B15. IMG_3712 is used twice.

**Card width.**
- v6 subject cards are 640–1240 px: 33–65 % of the width, or 59–115 % of the 1080 short side. The rosacea cards are 640–880 px (59–81 % of the same short side).
- Landscape references are smaller: ro landscape median 15.3 % of the width (IQR 12–30); colin landscape 24 %.
- **No width gap,** except B03's 260 px windows (24 % of the short side) carrying three pictures with faces, and B20's 430 px quote card.

**Smallest text.**
- v6: min 18 px (B07), p5 24, share ≤ 24 px 10.4 %.
- Rosacea: min 18, p5 24, 20 %.
- References: evident_yt p5 24 / 10.4 %; ro p5 18 / 25 %.
- **No size gap.** The gap is density: **7 text boxes per graphic frame (median) against the rosacea reel's 2** (B07: 26, B08: 16, B05: 14, B16: 13). The rosacea card says one thing.

## 3. Ranked gaps and fixes

1. **Empty signifiers remain on 4 of 20 beats.** B03 still uses a BTL stock model face for "your skin", the exact thing Naim removed from B20. B09 invents three askers. B16's chart says stress *triggers* flares under "emotions *improve* our skin". B17 is an AI head.
   - **Fix:**
     - B03 "Your skin": use a real treated-skin image from clinic-library (no needs_review, on the approval list), and drop the Flora brain: his own head is the mind, and the callout already starts there.
     - B09: remove the names and show the live question-box UI only.
     - B16: retitle it to what the data shows ("Stress shows up on skin").
2. **0 of 10 arrows mark a spot on a real photo; the rosacea reel does it 4 times.**
   - **Fix:** on B12's IMG_3714, curved-callout from the SESSION tick to the coil pad on the forehead (on "office"), plus a ring on the console timer 24:30, per ROSACEA_METHOD §4a.
3. **Arrows cross text in 2 of 10 marks:** B02 runs 123 px over the FDA chip, B07 runs 114 px through the Wed 10:30 slot, and B07's tip is 43 px from the slot centre with the chat icon covering the slot.
   - **Fix:**
     - B02: start the tail above the chip (y < 700).
     - B07: route over the grid header (bend −0.6, tail from the reply bubble's top), and land 12 px outside the slot's left edge at its centre height.
     - Add a lint rule: an arrow mask may not intersect a text box.
4. **One weight and one head are not met.** There are 2 head shapes, head widths run 20–34 px, B02 is 9.2 px (+15 % from the Stage scale), the B17 ring is a second blue (ΔRGB 20.9), and the B03 connectors are 62 % head on a 2–2.8 px shaft.
   - **Fix:**
     - Use the barb on every variant (keep the triangle only for marker-tick).
     - Pass `weight={8 / k}` inside a Stage.
     - Draw the orbit ring at full #37a9e8.
     - Space the B03 windows so each connector is at least 120 px long (head at most 30 %), or replace them with one route-trace through all three.
5. **Look repeats: 4 of 20 beats restyle v4.1/v5 (B03, B14, B17, B20); one subject (coil on a patient) appears in 5 beats.**
   - **Fix:**
     - B20: build her quote as `type-line-accumulate` over the clip itself, not the same window-plus-quote layout.
     - B14: give "next frontier" an object instead of the type card used in v4.1/v5.
     - B17: replace the glass head with the coil in IMG_3714 plus the field drawn on it.
     - Cap any single photo subject at 2 beats, and add a content check to `reuse_check` (same asset id at the same beat as the last edit fails).
