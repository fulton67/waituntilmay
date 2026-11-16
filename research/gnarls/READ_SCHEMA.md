# Reading schema (step 4 of FRAME_BY_FRAME.md, for stills)

Readers look at **every contact sheet** (`sheets/NNNN.jpg`, 12 tiles, id burned top-left in yellow, file name under it) and,
whenever a tile is too small to call a field, open the original (`media/drive/<path>`, path in `index.tsv`). The measurements are
in `measure/*.jsonl`, keyed by id. Use them; don't guess what they already say (size, format, alpha, OCR text, colour shares).

Ground truth for the character is `media/key/gnarls_style_guide_2021.pdf` (the official 2021 Gnarls guide). Read it first.
Official model: grey narwhal (body RGB 147 161 172, light grey 193 199 203), a spiral tusk off the top-right of the head, round brown
glasses (RGB 100 48 22), a red tee (Parsons Red 228 42 29) with the white N logo, white shorts/belly band, two side fins, standing on a
forked tail fluke. Thick black outer contour, cel shading with 2-3 greys, light-grey spots on the head. Pronouns: they/them.
The walkabout **costume** is a different object: plush grey suit, oversized glasses with lenses, a big smile, grey feet/boots.

## 1. `images.tsv`: one row per image (every id on your sheets, none skipped)

Tab-separated, header row exactly:

```
id	sheet	kind	gnarls_n	gnarls_form	on_model	view	pose	action	expression	eyes	mouth	glasses	outfit	props	fins	tail	outline	shading	background	setting	text	format	notes
```

| column | values (use these words; free text only where marked) |
|---|---|
| id | I#### |
| sheet | NNNN |
| kind | `sticker` (cut-out of Gnarls alone) · `layout` (a designed graphic: type + imagery) · `photo` (camera photo, not designed) · `logo` · `collage` · `doc` (a page of guidelines/text) · `other` |
| gnarls_n | number of Gnarls figures visible (0, 1, 2...) |
| gnarls_form | `illustrated` · `costume` · `silhouette` · `plush_toy` · `3d_render` · `ai_generated` · `mixed` · `none` |
| on_model | illustrated only: `yes` (matches the guide's construction and colours) · `minor` (pose or prop new, construction intact) · `off` (proportions, colours or features differ; say how in notes) · `n/a` |
| view | `front` · `3q_left` · `3q_right` · `profile_left` · `profile_right` · `back` · `top` · `n/a`. Left/right = the direction Gnarls faces in the image (viewer's left/right) |
| pose | `stand_primary` (the guide's primary mark pose) · `stand` · `walk` · `run` · `jump` · `sit` · `lie` · `swim` · `float` · `crouch` · `lean` · `dance` · `ride` (bike, scooter...) · `exercise` · `other:<x>` |
| action | free text, a verb phrase: "waving right fin", "holding a basketball over head", "typing on laptop" |
| expression | `neutral_smile` · `big_smile` · `laugh` · `surprised` · `thinking` · `confused` · `angry` · `sad` · `wink` · `smug` · `sleepy` · `excited` · `scared` · `n/a` |
| eyes | `open` · `half` · `closed_happy` (^^ arcs) · `wink` · `squint` · `wide` · `hidden` · `n/a` |
| mouth | `closed_smile` · `open_smile` · `open_o` · `teeth` · `tongue` · `flat` · `frown` · `hidden` · `n/a` |
| glasses | `on` · `off` · `pushed_up` · `swapped:<sunglasses/goggles/...>` · `n/a` |
| outfit | `red_N_tee` · `white_TNS_tee` · `black_hoodie` · `overalls` · `jeans` · `grad_gown` · `jersey:<sport>` · `costume:<x>` · `none` · `other:<x>`; join with `+` |
| props | free text, comma list: "basketball, headband" · `none` |
| fins | `down` (at sides) · `one_up` · `both_up` · `holding` · `crossed` · `on_hips` · `pointing` · `waving` · `other:<x>` · `n/a` |
| tail | `standing` (on the fluke) · `curled` · `swim_arc` · `hidden` · `n/a` |
| outline | how the Gnarls figure is edged: `black_thick` · `black_thin` · `white_die_cut` (white sticker border) · `colored:<c>` · `none` · `n/a` |
| shading | `cel` (hard 2-3 tone) · `flat` · `soft_gradient` · `photo` · `n/a` |
| background | `transparent` · `solid:<colour>` · `gradient:<c1>-<c2>` · `photo` · `pattern:<x>` · `illustrated_scene` |
| setting | free text: "basketball court", "NYC skyline", "none" |
| text | the main headline, verbatim, ≤ 60 chars (use measure/ocr.jsonl to spell it) · `none` |
| format | `event_nn` (1300x780) · `story_9x16` · `feed_4x5` · `feed_1x1` · `tv_16x9` · `print` · `sticker` · `other` (from measure/probe.jsonl delivery_format + size) |
| notes | free text: anything a 3D modeller or animator needs: off-model details, how the fins bend, foreshortening, how the tusk sits in this view, new accessories, duplicate of I#### |

No tabs or newlines inside a field. Use `n/a` when the field doesn't apply (for example no Gnarls in the image).

## 2. `sheets.tsv`: one line per sheet

```
sheet	group	ids	summary	gnarls_forms	repeats
```
`summary` = what's on the sheet in one sentence; `gnarls_forms` = counts like `illustrated 7, costume 3, none 2`; `repeats` = ids that are
duplicates or near-duplicates of another image (same art, different size/crop/format), as `I0003=I0002`.

Count your lines against your sheet count, and your image rows against your id count, before you finish.
