# Exomind and total skin health: YouTube rework storyboard (v6 proposal)

This is a storyboard for approval. Nothing has been rendered as video. Every frame is a real 1920x1080 Remotion still: composition `Storyboard` in `brand/remotion/src/storyboard/` (code in `Storyboard.tsx` and `kit.tsx`).

- **Render:** `bash brand/edits/exomind-skin/storyboard/render.sh [IDS]`
- **Source frames:** `python -I brand/edits/exomind-skin/storyboard/prep_stills.py` and `prep_cutout.py`
- **Overview board:** `overview.jpg`
- **Stills and sheets** (`F*.png`, `font_*.png`, `fonts.jpg`, `presentation.jpg`, `overview.jpg`) contain BTL-licensed, practice and patient pictures. They are gitignored and live on the local machine only, never in this public repo.

**Times** are output time on the 1.15x cut, taken from `props_yt.json` captions. Each graphic lands on its word +1 frame (DECISIONS 14e).

## 1. The one presentation (replaces the keyed / raw-phone switching)

v4 cut between three looks: him keyed on the canvas, his raw phone panel, and full-bleed B-roll. The user called that switching cheap. v6 has one grammar with three devices, and nothing else is allowed on screen:

1. **Him, always the same.** He is keyed on the soft room canvas (blue glow, no strip, grain). He always sits in the same place at the same size: left third, 670 px wide, feathered right edge. He never appears in his raw phone frame. He steps out only for a full-frame explanation (Look B and Look D of the mechanism), then comes back in the same place.
2. **The window.** A real picture sits in a soft rounded frame (r 22, inset white hairline, long soft shadow) in the right two-thirds, never above 1x source. Cut-out objects such as the Exomind unit float without a frame and carry their own drop shadow.
   - *Motion:* windows rise 24 px with a fade on the *arrive* token. While held, they drift 1–2 % in scale and 6–10 px in position, so no photo is ever static. Cut-outs drift on a separate parallax layer. A second window pops up beside the first (the rosacea pop-up), never on top of him.
3. **Marks that point.** There are only two kinds:
   - *Ring:* a hairline ellipse drawn on the exact spot, with a chip label on a lead line. This is the rosacea device.
   - *Thread:* a hairline with a travelling bead, the arrow the user praised (mind → our approach → your skin). It is used only when he states a relationship, and the bead moves on his words.

   A source line in small type sits on every frame that shows a picture or a fact.

The comparison sheet is `presentation.jpg`: v4's raw phone panel (crossed out) against v6 him + window (F09) and v6 full frame (F11B).

Removed for good: the toggle, step counters and pills, the reused mind-pointer, decorative lines, play/pause and cursors, and any icon or label that does not explain something.

## 2. Type: three options from kit vzz0hgt (kit not modified)

All three are shown on the same frame (F10A) in `fonts.jpg` (`font_serif / font_text / font_poppins`, with `font_nhg` = v4.1 for reference).

| Option | Display | UI / labels / captions | Read |
|---|---|---|---|
| **A, recommended** | Cormorant Garamond 500 (in kit) | Neue Haas Grotesk Text 500 (in kit) | Editorial luxury, close to the Are.na board. The serif carries the "considered" tone and the grotesk keeps the captions plain. |
| B | Neue Haas Grotesk Text 400 | NHG Text 500 | Quiet and clinical, one family. Less display weight than NHG Display, so it is not the face the user disliked. |
| C | Poppins 400 | Poppins 500 | Friendlier and rounder, but closer to generic app UI. |

**Needs the user's go-ahead (not added):** Helvetica Neue LT Pro 55/65 is the stated YouTube caption face (DECISIONS) but is not in kit vzz0hgt. If approved, it replaces NHG Text in option A for captions only.

## 3. Frames

Columns:
- **Line @ time:** his words.
- **Words can't:** what the picture has to carry that the words cannot.
- **Shows:** what the frame shows.
- **Source:** where the image or fact comes from.
- **Reference:** the device or studied media it draws on.

Approval marks:
- **[BTL]** is BTL material, used under the practice's licence.
- **[PRACTICE]** is wording or images from drarielostad.com.
- **[CONSENT]** means patient consent must be confirmed before use.

### s1 · 0–6.6 s · "...helped you understand **Exomind** and"

**F01A** · key moment, @5.6 s
- **Words can't:** what Exomind physically is.
- **Shows:** the real unit, cut out and floating on the canvas. A ring and an "Applicator" chip mark the part that goes on the head. Type: "Non-invasive brain stimulation", "Carefully controlled magnetic pulses to targeted areas of the brain."
- **Source:** unit photo [BTL]; wording [PRACTICE] Exomind page.
- **Reference:** Evident product float; Are.na 22036380 (object on a soft field).
- **Motion:** the unit drifts on parallax, the ring draws on "Exomind" +1 f, then the chip.

**Alternatives for F01A:**
- **F01B:** his own treatment room, with a ring on the applicator on the patient's head and on the session screen. Source: practice footage, Oct 30 [CONSENT].
- **F01C:** full-bleed applicator photo with white type [BTL]. It is more cinematic but drops him.

### s2 · 6.6–11 s · "why we include the **mind** in our **approach** to your total **skin** health"

**F02A** · key moment, the praised arrow kept and made concrete
- **Words can't:** the three things he links and their order.
- **Shows:** three windows (the BTL card "during" brain, him with a patient in the office, a skin close-up), with the thread travelling across their tops. The bead reaches each node on "mind" 7.78, "approach" 8.32 and "skin" 9.6, and each node brightens as it is reached.
- **Source:** card [BTL] conceptual depiction; Nov 05 practice footage [CONSENT]; model portrait [BTL].
- **Reference:** v4 arrow (praised); Are.na 12400773 triptych.

**Alternatives for F02A:**
- **F02B:** one large card, with a white thread from the coil through the brain to a skin window.
- **F02C:** typographic version: the words themselves with small round image chips, and the thread underlines the line.

### s3 · 11–16.5 s · "Your questions are an important part of this conversation..."

**F03**
- **Words can't:** that this is a real two-way consultation.
- **Shows:** him and a patient talking in the office, window at 1x.
- **Source:** practice footage, Nov 05 [CONSENT].

### s4 · 17.2–27.5 s · giveaway / "check your text messages after the event"

**F04**
- **Words can't:** the one action asked of the viewer.
- **Shows:** "After tonight". The giveaway line is muted; "Check your text messages after the event." is highlighted in ice blue.
- **Source:** his words only.
- **Editorial flag:** s4–s6 talk about a live event (giveaway, texts, question box). On YouTube these lines may confuse viewers. Ask the client whether to keep them, trim them, or re-voice them.

### s5 · 27.5–37.2 s · "During your visit, we'll discuss your goals, **review your medical** history, and determine whether Exomind is appropriate for you"

**F05**
- **Words can't:** what the consultation actually covers, and that not everyone qualifies.
- **Shows:** a three-row consultation list; row 2 lights on "review your medical". A practice quote: "Certain medical conditions, implanted devices, or other circumstances may make TMS inappropriate."
- **Source:** [PRACTICE] Exomind page.
- **Reference:** Evident list reveal.

### s6 · 37.2–47.3 s · "If there's something we haven't covered, I'd love to hear about it."

**F06** (new: the empty him-only frame was rejected)
- **Words can't:** an example of a question people actually ask.
- **Shows:** a real session photo (model on the couch, applicator on) with "Questions we hear / Does it hurt? / 'Most patients find the therapy comfortable. Sessions are quick, lasting under 30 minutes.'"
- **Source:** photo [BTL] (model); answer from the BTL Exomind patient brochure FAQ.

### s7 · 47.3–51.7 s · "...seeing you in the office,"

**F07**
- **Shows:** a window of the real treatment room beside him.
- **Source:** Oct 30 practice footage [CONSENT]. If consent is not given, swap in the BTL couch photo `Female-Model3_0081` [BTL].

### s8 · 51.7–57.4 s · "...this comprehensive approach to total skin health"

**F08**
- **Words can't:** what "comprehensive" combines.
- **Shows:** practice quote "The skin is not separate from the person. It is part of a much larger system." over two windows: "Dermatology" (his redness result) and "Longevity & wellness · Exomind" (the unit).
- **Source:** [PRACTICE] Exomind page and gallery.

### s9 · 57.4–65 s · "taking care of one's skin beyond just the sort of classic treatments"

**F09** · key moment
- **Words can't:** what a "classic treatment" result looks like, and what "beyond" means.
- **Shows:** his own redness before/after, with rings on the cheeks and a "Redness" chip. A thread runs from it to "beyond".
- **Source:** drarielostad.com gallery, redness [PRACTICE] (eyes barred by the practice).
- **Reference:** the rosacea video (the user's model).

### s10 · 65–69.4 s · "how our emotions **improve our skin**"

**F10A** · key moment
- **Words can't:** the honest form of the mind–skin link.
- **Shows:** a real rosacea photo with rings on cheek and nose and a "Rosacea" chip. Practice quote: "Emotional stress is among the factors that may aggravate symptoms." Small line: "Exomind does not directly treat skin conditions."
- **Source:** Wikimedia Commons Rosacea_01 (CC BY 2.0); [PRACTICE] condition copy.

**Alternatives for F10A:**
- **F10B:** the practice's own list of conditions where stress plays a role (psoriasis, eczema, seborrheic dermatitis, acne, rosacea, hair shedding).
- **F10C:** Flora glass head with a thread from brain to cheek, and the quote "a bidirectional relationship between the brain and the skin" [PRACTICE].

### s11 · 69.4–82.7 s · "technology that can actually help create neuroplasticity, rewire the brain, increase proper neurotransmitter production... focused in flow"

**Mechanism** · key moment, four looks built on BTL's licensed material. BTL's "conceptual depiction, results may vary" stays on screen in every look.

- **Look A, pop-ups beside him (F11A1–A4):** one panel per phrase.
  - A1: the card "during" panel, with a ring on the pulses.
  - A2: the neuroplasticity card, before → two weeks, ring on the new connections. The footnote states that the card's DOI 10.21125/edulearn.2018.0203 is a cognitive-training study, not Exomind data.
  - A3: the synapse frame from BTL's Mechanism-of-Action film, with a ring on the cleft.
  - A4: the card, before → after.
- **Look B, he steps out (F11B):** the "during" panel on navy, one white thread from the coil into the brain, white labels.
- **Look C, product-led (F11C):** the floating unit, a ring on the brain on its own screen, and a thread that opens the card's "after" panel.
- **Look D, BTL's own film (F11D):** three moments of the official Mechanism-of-Action film (0:52 coil on the head, 1:16 synapse, 1:37 lit network) on navy. One bead travels through them on his three verbs. The captions are BTL brochure wording:
  - "stimulates key areas of the brain involved in emotional regulation"
  - "By activating neural pathways, it helps restore healthy brain activity"
  - "and enhances neural connectivity"

**Recommendation:** Look D for "create neuroplasticity / rewire the brain", then the A4 before → after on "focused in flow". These use real BTL footage, BTL's own words and one device.

**Do not show:** BTL's in-house percentages (90/74/77/71 %), "DLPFC", or anything implying Exomind treats skin.

### s12 · 82.7–87.2 s · "help us just feel better and how that can actually translate into better skin"

**F12A** · key moment, bookend of F02A
- **Shows:** the same three-node thread. "The mind" (card "after"), "feel better" (patient window with her own words, "It quiets my brain."), "better skin". The bead finishes on "skin".
- **Source:** [BTL] card; Nov 05 patient [CONSENT]; model portrait [BTL].

**Alternative:** **F12B:** the patient window and her quote alone.

### s13 · 87.2–90.2 s · "Thank you."

**F13**
- **Shows:** the floating unit, "Book a consultation", drarielostad.com, and "About 20 minutes a session. Typically six sessions, one week apart." [PRACTICE].
- **Note:** the brochure says "under 30 minutes". Use the practice's own figure and ask the client to confirm it.

## 4. Glitches in v4.1: causes and fixes

These were verified on decoded v4.1 frames and by scene detection inside the clips. The fixes are written as `glitch_fix.patch` against `brand/remotion/src/OstadYT.tsx` (`git apply --check` passes). The patch is not applied and nothing has been rendered, so v4.1 is unchanged.

| When (output) | What shows | Cause | Fix |
|---|---|---|---|
| 47.25 s, 1 f | previous BTL shot (dark-haired woman) | s7 `stressed.mp4 from={0.45}` starts at frame 11; the clip's shot change is at 0.500 s (frame 12) | `from={0.5}` |
| 48.33 s, 1 f | sunset field | `couch.mp4 from={1.1}` rounds to frame 26; its cut is at 1.125 s (frame 27) | `from={1.125}` |
| 51.50–51.67 s, 5 f | another BTL model under the coil | `trio.mp4 from={2.2}` (frame 53) plus the 52 frames left run to frame 104; trio cuts at 4.167 s (frame 100) | `from={2.0}` (frame 48, after its 1.917 s cut), so it ends on frame 99 |
| 64.96 s, 2 f | man in a suit | s10 `stressed2.mp4` from 0; its first cut is at 0.083 s | `from={0.125}` |
| 68.66 s / 69.16 s | new shot, then freeze in the s10 left half | stressed2 cuts again at 3.708 s and ends at 4.208 s, but the section is 4.45 s | `rate={0.8}` from 0.125 s: the 3.58 s shot fills the section (v5 used `stressed2_v5.mp4`) |
| 87.12 s, 1 f | blank cream frame before s13 | each Sequence uses `f(s.dur)`, rounded separately from `f(s.at)`. s12 ends on 2091 but s13 starts on 2092, and s12 starts one frame early over s11 (1985) | `durationInFrames = f(next.at) - f(s.at)` |

## 5. The pamphlet

Found: BTL's patient brochure `Exomind_BR_V1_ENUS100_preview.pdf` and the product fact sheet. Both are licensed and stored in `brand/remotion/public/exomind-skin/btl/docs/` (gitignored).

**Used on screen (cite as BTL brochure):**
- "patented ExoTMS technology comfortably stimulates key areas of the brain involved in emotional regulation, cognitive function, and self-control"
- "By activating neural pathways, it helps restore healthy brain activity and enhances neural connectivity"
- "Most patients find the therapy comfortable. Sessions are quick, lasting under 30 minutes"

**Compliance:** the US FDA clearance covers Major Depressive Disorder in adults who failed prior antidepressant medication in the current episode. It does not cover skin, sleep or stress. So:
- no skin-treatment or disease claim for Exomind;
- his Nov 05 phrase "FDA approved for sleep quality" stays off screen;
- the mind → skin link is shown as Dr. Ostad's approach, in his words and the practice's.

## 6. Open client approvals

1. **Framing:** Exomind presented as part of his "total skin health" approach, with the on-screen line "Exomind does not directly treat skin conditions." Needs practice sign-off and, ideally, a BTL compliance check.
2. **BTL material:** the cards, the MOA film frames, product and model photos, and the brochure wording, used under licence, with "conceptual depiction, results may vary" kept on screen.
3. **Patient consent:** Oct 30 (F01B, F07) and Nov 05 (F02A, F03, F12A/B). The clinic library lists consent as "unknown". P0006 (IMG_3712–3714) is not used.
4. **Practice wording quoted:** the TMS exclusion line, the condition stress lines, the "skin is not separate" quote, and "about 20 minutes / six sessions one week apart" (the brochure says under 30 minutes).
5. **Neuroplasticity card footnote:** the DOI is a cognitive-training study, not Exomind data. Keep the footnote, or drop A2.
6. **Live-event lines in s4–s6** on a YouTube upload.
7. **Type:** option A, and whether to add Helvetica Neue LT Pro 55/65 to the kit.
