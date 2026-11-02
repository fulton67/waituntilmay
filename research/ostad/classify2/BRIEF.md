# Reader brief: run 2 re-classification

You are reading short-form videos about cosmetic dermatology, skin care, injectables, lasers and skin cancer. The client is
**Dr. Ariel Ostad**: a male cosmetic dermatologist and Mohs surgeon in his 50s, triple board-certified, with 20+ years in
practice on Park Avenue in Manhattan. He offers injectables (Botox, Jeuveau, fillers, Sculptra), lasers (Fraxel, CO2,
Morpheus8, IPL), thread lifts, EXOMIND, IV/NAD+, mole and skin-cancer removal with Mohs and reconstruction, treatments for
skin of color, and his own skincare line (LUMA Cream).

## Task
Each `classify2/batch_NN.json` holds 25 videos. For each one, read **the transcript, caption, title, on-screen hook and top
comments**, then write `classify2/out_NN.json`: a JSON array with one object per video, same ids, same order.

Judge each row by reading it. Do **not** write a script that assigns labels by keywords or rules. Python is fine for reading
and writing the JSON files, but every label must be your own judgement. A transcript may be missing (`no_speech` or
`unavailable`). If so, use the caption, title and on-screen hook, and say less where you know less.

When a batch is done, run `python scripts/read2.py check classify2/out_NN.json` from `research/ostad/` and fix anything it
reports. **Never run `apply`.** The coordinator merges every file.

## Fields (exact spelling matters; the checker rejects anything else)

- `id`
- `genre`: the ONE that fits best. Pick the most specific one that is true.
  - `educational-explainer`: teaches how something works. Use it only when nothing more specific fits.
  - `myth-bust`: a common belief, and why it's wrong.
  - `derm-reacts / duet / stitch`: reacting to someone else's clip.
  - `procedure-POV`: footage of a treatment being done.
  - `before-after`: the result is the payload.
  - `patient-story / testimonial`: a patient's own experience.
  - `personal journey / diary`: a creator documenting their own skin over time.
  - `routine`: a step-by-step regimen.
  - `product-review / drugstore-vs-medical`: judges products.
  - `brand advertorial / sponsored`: an influencer or creator paid to plug a product.
  - `ad / promo`: a clinic or brand selling its own service.
  - `trend-commentary`: commentary on a viral trend or a celebrity.
  - `day-in-the-life / office`: life at the practice or behind the scenes.
  - `Q&A / comment-reply`: answers a viewer's question.
  - `red-flag / what-not-to-do`: what not to do.
  - `price / what-it-costs`: what something costs.
  - `skin-cancer-awareness`: moles, melanoma, BCC/SCC, Mohs or sun damage as cancer risk.
  - `diagnosis / is-it-X`: "is this X or Y", what that bump or rash is.
  - `hack / tip`: one quick, practical trick.
  - `humor / skit`: comedy first.
- `format`: one of these.
  - `talking-head`
  - `talking-head + b-roll`
  - `voiceover-over-procedure`
  - `green-screen`
  - `text-on-screen only`
  - `stitch/duet`
  - `vlog`
  - `carousel`
  - `interview / podcast clip`
  - `skit / acted`
- `hook_type`: what the **first line or first second** does. Use one of these.
  - `question`
  - `contrarian claim`
  - `number/stat`
  - `stop doing X`
  - `curiosity gap`
  - `before/after reveal`
  - `story open`
  - `reaction`
  - `visual shock / gross-out`
  - `credential open`: opens on "As a board-certified dermatologist…".
  - `POV / you-are-the-patient`
  - `promise of a result`
  - `list open`: "3 things…".
  - `direct address`: ONLY when the opening is literally a greeting or "today we're talking about X" with no other device. If the line also asks, promises, lists or contradicts, label that instead.
- `subject`: what it is actually about, in 2–6 plain words, lowercase.
  - Good: "why filler migrates", "the sunscreen mistake with retinol", "what Mohs surgery looks like", "morpheus8 downtime, day by day".
  - Bad: "skincare", "botox", "dermatology tips".
  - Be specific. Two videos share a subject only if they really say the same thing.
- `claim`: the one thing the video asserts, as one sentence, in English even if the video isn't.
- `tone`: an array of 1 or 2 values, most important first.
  - Allowed: `clinical`, `casual-friend`, `confessional`, `fear/warning`, `humor`, `luxury`, `contrarian`, `reassuring`, `salesy`.
- `speaker`: who carries the video. One of `doctor`, `nurse/injector`, `patient`, `influencer`, `brand`, `other`.
  - A clinic account with no visible clinician is `brand`.
- `makeable_by_ostad`: true or false. True only if Dr. Ostad could film **this version** without it being absurd.
  - False examples: an influencer's GRWM, a brand advertorial, a young woman's product haul, a "my skin journey" diary, a Filipino product plug, hair "botox", OR comedy, a body-positivity confession.
  - True examples: a derm explaining, reacting, myth-busting, answering, showing a procedure or a result, a patient story he fronts.
  - When it's a judgement call, say so in `makeable_note`.
- `makeable_note`: a short string, or null. Examples: "yes if a patient fronts it", "only as a reaction/stitch", "needs his own before/after".
- `audience_reaction`: one line summarising what the **top_comments** asked, argued or thanked for. Use null if `top_comments` is empty. Never invent it.

## Distribution sanity
Across a whole batch, no single genre, hook or tone should cover most of the rows unless the videos really are alike. If you
find yourself labelling half a batch `educational-explainer` or `direct address`, re-read those rows: there is usually a more
specific truth (myth-bust, Q&A, hack/tip, list open, question, promise of a result…).

## Example output row
```json
{"id":"ti_123","genre":"myth-bust","format":"talking-head","hook_type":"contrarian claim","subject":"retinol and sunscreen myth",
 "claim":"Retinol doesn't make you burn more if you wear sunscreen every day, so don't skip it in summer.","tone":["contrarian","reassuring"],
 "speaker":"doctor","makeable_by_ostad":true,"makeable_note":null,"audience_reaction":"People ask which sunscreen works under makeup."}
```
