# Image bank (style study, step 5)

Condition photos, procedure-in-progress photos and before/afters for the on-screen image cards in Dr. Ostad's short videos. **440 images in 23 topic folders: 267 on-air, 127 needs-approval, 46 reference-only.** Built 2026-11-08.

- `bank.json`: one entry per image (`file, topic, kind, source_page, image_url, licence, attribution, use, notes`). `notes` starts with the source's own caption in quotes: that is the diagnosis to use on screen. Do not relabel it.
- `TOPICS.md`: the topics, why each is needed, and which plan slots and own videos mention it, plus the full inventory of procedures, products and claims.
- `GAPS.md`: what's missing per topic and where it might come from.
- The image files are gitignored (`*.jpg/*.png/*.webp` under `bank/`). To rebuild a folder, download each `image_url` in `bank.json` to its `file` path.

## Counts

| topic | total | on-air | needs-approval | reference-only | condition / procedure / before-after | sources (commons / pmc / ostad / dermnet) |
|---|---|---|---|---|---|---|
| `acne` | 36 | 20 | 12 | 4 | 16 / 2 / 18 | 17 / 7 / 12 / 0 |
| `actinic-keratosis` | 9 | 9 | 0 | 0 | 9 / 0 / 0 | 9 / 0 / 0 / 0 |
| `basal-cell-carcinoma` | 18 | 18 | 0 | 0 | 17 / 1 / 0 | 18 / 0 / 0 / 0 |
| `botox-brow-ptosis` | 37 | 19 | 12 | 6 | 8 / 10 / 19 | 4 / 15 / 12 / 6 |
| `chemical-burn-pih` | 27 | 15 | 7 | 5 | 15 / 2 / 10 | 9 / 6 / 7 / 5 |
| `co2-laser-healing` | 23 | 10 | 12 | 1 | 1 / 7 / 15 | 6 / 5 / 12 / 0 |
| `demodex` | 10 | 9 | 0 | 1 | 10 / 0 / 0 | 5 / 5 / 0 / 0 |
| `dpn-seborrheic-keratosis` | 19 | 13 | 0 | 6 | 18 / 1 / 0 | 8 / 5 / 0 / 6 |
| `filler-volume-loss` | 15 | 3 | 12 | 0 | 0 / 2 / 13 | 1 / 2 / 12 / 0 |
| `hair-loss` | 23 | 14 | 9 | 0 | 9 / 1 / 13 | 12 / 2 / 9 / 0 |
| `hyperhidrosis` | 3 | 3 | 0 | 0 | 2 / 1 / 0 | 3 / 0 / 0 / 0 |
| `laser-skin-of-colour` | 8 | 0 | 8 | 0 | 0 / 0 / 8 | 0 / 0 / 8 / 0 |
| `melanoma` | 27 | 26 | 0 | 1 | 25 / 2 / 0 | 27 / 0 / 0 / 0 |
| `melasma` | 16 | 10 | 0 | 6 | 9 / 1 / 6 | 4 / 6 / 0 / 6 |
| `milia` | 2 | 2 | 0 | 0 | 2 / 0 / 0 | 2 / 0 / 0 / 0 |
| `mohs-surgery` | 32 | 16 | 12 | 4 | 0 / 19 / 13 | 11 / 5 / 12 / 4 |
| `mole-removal-scars` | 23 | 11 | 9 | 3 | 13 / 1 / 9 | 11 / 3 / 9 / 0 |
| `ozempic-face` | 7 | 5 | 0 | 2 | 4 / 0 / 3 | 1 / 4 / 0 / 2 |
| `rosacea-redness` | 32 | 22 | 9 | 1 | 16 / 2 / 14 | 18 / 4 / 10 / 0 |
| `solar-lentigines` | 24 | 10 | 10 | 4 | 13 / 1 / 10 | 8 / 2 / 10 / 4 |
| `spider-varicose-veins` | 16 | 6 | 8 | 2 | 3 / 3 / 10 | 5 / 1 / 10 / 0 |
| `squamous-cell-carcinoma` | 13 | 13 | 0 | 0 | 13 / 0 / 0 | 13 / 0 / 0 / 0 |
| `tattoo-removal` | 20 | 13 | 7 | 0 | 3 / 5 / 12 | 6 / 7 / 7 / 0 |
| **all** | **440** | **267** | **127** | **46** | 206 / 61 / 173 | |

Sources, by count: Wikimedia Commons 198 (this includes the public-domain NCI Visuals Online photos, through their Commons copies), PMC open-access figures 79 (all from CC BY 4.0 articles), Dr. Ostad's own gallery 130, DermNet 33. Open-i (openi.nlm.nih.gov) returned an error page all session, so PMC figures were found through the Europe PMC search API (filter: open access, licence CC BY or CC0) and the licence was then read off each article page at pmc.ncbi.nlm.nih.gov.

## Licence rules (how `use` was set)

| use | rule |
|---|---|
| `on-air` | The licence on the source page allows commercial reuse: CC0, public domain, CC BY, CC BY-SA. The attribution line is recorded. |
| `reference-only` | Anything NC or ND (all DermNet images: CC BY-NC-ND 4.0 for the watermarked versions), anything unclear, "all rights reserved", a journal figure the caption says was reproduced from another source (the article's CC BY licence may not cover it), and three device-maker images found on Dr. Ostad's gallery page. |
| `needs-approval` | Dr. Ostad's own gallery (drarielostad.com/gallery, "©2026 Dr. Ariel Ostad. All Rights Reserved."). The practice must confirm the patient consented to social video use, and that each image is their own patient. |

- The licence was never guessed. Commons licences come from each file page's licence template (read through the Commons API `extmetadata`, the same data the file page renders; 8 file pages were spot-checked by hand and matched). PMC licences are the sentence on the article page, copied into `licence` as written. If a licence could not be read on the source page, the image is reference-only.
- One Commons file (`melanoma/commons_Photography_of_nodular_melanoma.jpg`) is reference-only even though its Commons page says CC BY 4.0, because the author is given as DermNet NZ, whose images are CC BY-NC-ND. The provenance conflicts, so treat it as NC-ND until DermNet confirms.
- **CC BY-SA (106 images):** showing the image unaltered on a card with credit is fine. If the image itself is adapted (cropped with graphics baked in, recoloured, composited), the adapted image has to be released under the same CC BY-SA licence. The safe way is to keep the photo as a separate layer: don't bake graphics into it, and don't sell or exclusively license the adapted image.
- **Journal figures** are often several panels. Cropping to one panel is an adaptation, which CC BY allows. Say "cropped" or "adapted" in the credit.
- **Public domain / CC0:** credit isn't legally required, but show it anyway. The NCI and Wikipedia communities expect it, and it keeps every card consistent.
- **Clinic-uploaded Commons images** (AMA Skincare / Alice Pien MD, Dr. Braun, Balikian Facial Plastic Surgery) are validly CC BY-SA or CC BY. They are another practice's promotional photos, so check that no competitor branding is visible.
- **Historical atlas plates** (Fox 1900s, Sequeira, Riehl & Zumbusch) are public domain hand-coloured plates. Use them for explaining subtypes, not as modern patient photos.

## How attribution must be shown on screen

CC BY and CC BY-SA need the TASL credit (Title, Author, Source, Licence), "reasonable to the medium". For a short vertical video:

1. **On the card, for as long as the image is on screen**, put a single line in small type (about 2.5% of frame height, minimum 22 px at 1080x1920) in a corner that platform UI doesn't cover (top-left is safest on Reels/TikTok/Shorts). The line reads:
   `Photo: <author> / <licence>` + `, cropped` if cropped. Examples:
   - `Photo: James Heilman, MD / CC BY-SA 3.0`
   - `Photo: Kelly Nelson, NCI / public domain`
   - `Photo: McCarthy et al., J Cosmet Dermatol 2026 / CC BY 4.0, cropped`
2. **In the caption or description of the post**, give the full credit with links: the `attribution` field of `bank.json` plus the `source_page` URL. TikTok/Reels captions count as "reasonable to the medium" for the link part.
3. **Clinical label:** if the card names the condition, use the source's diagnosis from `notes` (translated into plain English only where the source is not in English, e.g. "Basaliom" = basal cell carcinoma, "Spinaliom" = squamous cell carcinoma). Never present a reference photo as Dr. Ostad's own patient.
4. **Dr. Ostad's own before/afters** (`needs-approval`): no third-party credit, but they need the practice's written OK per image. Add a "Results vary" line if the practice's advertising policy requires one.
5. **reference-only:** never on air. Use them for planning, for briefing a re-shoot, or for choosing what to photograph in the clinic. DermNet sells clean commercial licences (dermnetnz.org/image-licence) if one is essential.
