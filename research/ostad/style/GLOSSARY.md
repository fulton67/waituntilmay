# Glossary: facial and skin terms, with a real example for each

When Dr. Ostad names a facial feature or condition, the reel shows an example of it at that moment, so the viewer sees "this is that" (client 2026-11-17; `learning/LESSONS.md` L3).

`tools/glossary_scan.py` scans every transcript for the phrases in the second column. Each hit in the cut needs a "Shown as" entry: the patient's own footage when it shows the term clearly, otherwise an **on-air** example from `style/bank/` (never a reference-only image, never an unconsented patient: `bank.json` `use` = "on-air" only), otherwise markup on the patient's own frame. Drawn faces and anatomy are banned (DECISIONS 14d rule 6). AI examples are briefed in `oct14/AI_SLOTS.md` and are never a result or the real patient.

Sources:
- Terms: Dr. Ostad's transcripts (Oct 14 clips; earlier edits) and `research/ostad/refs/procedures.json` (anatomy, aliases).
- Bank: `research/ostad/style/bank/bank.json`.

## Terms

| Term | Matched phrases | Plain definition | Face region | Shown as (Oct 14 reel) | On-air bank example (for other reels) |
|---|---|---|---|---|---|
| Forehead lines | forehead lines / forehead creases / forehead wrinkles | Horizontal lines across the forehead, deepest when the brows are raised (the frontalis muscle) | forehead | Bank card at "forehead": MERZ dynamic forehead-lines grade 4 (B01) | `botox-brow-ptosis/pmc_PMC12584049_FIGURE1_11` row (e); `pmc_PMC12663534_Figure3_3` |
| Frown lines | frown lines / frown line / glabellar lines / elevens | Vertical lines between the brows when frowning (corrugator muscles) | glabella | Bank card at "frown" (MERZ glabellar grade 4); then her own frown in the injection pop-up (B02) | `pmc_PMC12584049_FIGURE1_11` row (g) |
| Crow's feet | crow's feet / crows feet | Fan of lines at the outer eye corner when smiling (orbicularis oculi) | lateral canthus | Her own smile, punched in at her eye, pen ticks along the fan (B02, intro 0:20) | `pmc_PMC12584049_FIGURE1_11` row (b) |
| Dynamic lines | dynamic lines / when patients are expressive | Lines made by muscle movement; they show with expression and fade at rest | upper face | Her frown in the injection pop-up (IMG_3657 0:08) | — |
| Brow drop | brows tend to drop / brows dropped / drooping / brow ptosis | The brow sitting lower after too much neuromodulator in the forehead | brow | Not in the cut (the line was cut for length). Footage would show it on her brows | `botox-brow-ptosis` (condition panels) |
| Jowling | jowling / jowls / jowl | Soft tissue sagging below the jawline beside the chin | lower face, jaw | Her own jaw, punched in, a pen contour along the jowl (B06, intro 1:18) | gap: no on-air jowl image (`bank/GAPS.md`) |
| Laugh lines | laugh lines / laugh line / nasolabial folds / smile lines | The folds from the side of the nose to the mouth corners | nasolabial | Pen rings on both folds on her close-up (B08) | gap |
| Deflation | deflation / loss of volume / lose fatty tissue / volume loss / hollowing / hollow | Loss of volume in the mid-cheek fat and bone support, so the skin above sags into folds | mid-cheek | Her own face: "Deflation" label and a headed route down her cheek, from cheekbone to jaw ("soft tissue moving down") (B06) | `filler-volume-loss/pmc_PMC12828540_fig_7` panel A only (mid-cheek sulcus, pre) |
| Soft tissue descent | soft tissue moving down / skin stretching / ligaments | Cheek tissue moving down as the ligaments that hold it loosen | mid-cheek to jaw | The same route on her face (B06) | — |
| Cheekbones | cheekbones / cheekbone / cheek bone / outer cheekbone / projection | The zygoma; filler on it supports and lifts the mid face | zygoma | The injection pop-up at her outer cheekbone (B07), the surgeon markup (B11) | — |
| Marionette lines | marionette lines / marionette | Lines from the mouth corners down toward the chin | lower face | Pen strokes along both lines on her 4:55 close-up (B11 lead-in) | gap |
| Jawline | jawline / jaw line | The lower border of the face; "lifted" when the mid face is supported | jaw | The surgeon markup context (B11). No change arrow: none visible (ARROWS.md) | — |
| Cannula | cannula | A blunt-tipped tube for filler, through one entry point | (instrument) | His own cannula injection, full frame (B10) | — |
| Neuromodulator | neuromodulator / neuromodulators / juvo / jeuveau / botox | A muscle relaxer injected to soften dynamic lines | (product class) | The injection pop-up, "Injection 1 · neuromodulator · used here" (B02) | — |
| Hyaluronic acid filler | hyaluronic acid / filler / fillers | A gel that adds volume; Evolysse Form (cheeks) and Evolysse Smooth (lines), named by him | (product class) | Product named only where he says it (pop-up eyebrow, markup labels) | — |

## Gaps (no usable on-air example in the bank)

- **Jowling, laugh lines, marionette lines:** shown on the patient's own footage with markup. For other reels, the briefs for a neutral-face illustration are in `oct14/AI_SLOTS.md` (slots G1-G3). They are labelled "Illustration" and never show a result.
- **Brow drop:** the bank has condition panels (`botox-brow-ptosis`), but they are journal figures with several panels and need cropping per use.
