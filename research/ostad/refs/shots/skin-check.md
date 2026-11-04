# Skin checks and dermoscopy

**What it does:** A yearly head-to-toe exam, with a dermatoscope for suspicious spots, catches cancers early.  
**Anatomy:** skin surface, pigment network  
**Runtime:** 12 s across 3 shots · 3 overlay, 0 full-frame

OVERLAY = rendered with alpha (PNG sequence + WebM VP9 alpha), floats beside Dr Ostad on the filmed plate. FULL-FRAME = camera inside tissue or at cell scale; cut away from him for these.

| # | Frame | Scene | Visible layers | Camera | What animates | s | Label |
|---|---|---|---|---|---|---|---|
| 1 | **OVERLAY** | body_model | skin | slow full-body orbit | a scan line passes head to toe; spots light up | 4 | Head-to-toe exam |
| 2 | **OVERLAY** | skin_block.glb | epidermis, melanocytes | top view through a lens | the dermatoscope shows a pigment network | 4 | Dermatoscope view |
| 3 | **OVERLAY** | caption | — | static | ABCDE checklist builds letter by letter | 4 | A B C D E |

## Reference animation

- none found (see MOTION_GAPS.md); build from the shot list alone

## His words (matched from the transcripts of his videos)

No spoken sentence matched (these clips are music over footage), so his captions instead:
- caption: “Skin Cancer Awareness Month is devoted to shining the spotlight on the most common cancer in the United States- skin cancer. It is estimated that about 9,500 people in the US are diagnosed with skin cancer. Fortunately, …” — [yo_nOIuVdhTxtw](https://www.youtube.com/shorts/nOIuVdhTxtw)
- caption: “A new chapter in melanoma treatment is emerging. Recent Phase 3 results surrounding a personalized mRNA melanoma vaccine have generated significant attention—and for good reason. But what does a “melanoma vaccine” actual…” — [in_DcbazZHio4C](https://www.instagram.com/p/DcbazZHio4C/)

## Assets

Have: skin_block.glb

Missing: body_model, caption_card, dermoscope_lens, scan_line_fx
