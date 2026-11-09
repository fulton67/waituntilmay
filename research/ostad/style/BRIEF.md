# OSTAD STYLE STUDY — the brief (client paste, 2026-11-08), with the client's amendments

Amendments from the client in chat (2026-11-08), which override the brief where they differ:
- **Sampling, not exhaustion.** "use the last 2 dollars on apify getting samples from all uploaded accounts then just do the process from that". Apify had $1.15 left of the $10 monthly limit; the IG accounts are sampled (latest posts, cap $1.00 total). The completeness gate's item 1 checks the sample was saved in full and logs the profile post count beside it.
- **Two more references (ADDITIONAL):** `https://www.instagram.com/p/DdrkdrYv-yW/` ("done in Higgsfield, I think; these animations, not the whole page, I like the way they look") and `https://www.instagram.com/p/DYKh5yyPxxg/`. Both get rebuilt **with no background** (transparent overlays over Ostad's footage).
- **Are.na:** the channel is public at `https://api.are.na/v3/channels/dr-ostad` (no token needed).
- **Flora** was asked about for scraping; it is an AI canvas, not a scraper, so Apify + yt-dlp are used.
- The brief names `brand/video/` as "the existing Remotion project"; the Remotion project is `brand/remotion/` (DECISIONS 67-68). It is used.

---

Unattended; same rules as every Ostad run (never ask, log to `research/ostad/style/DECISIONS.md`, resume from `style/TODO.md`, cache everything, push to main after each measured phase). Work in the waituntilmay repo. This run follows a proven method: download the references, measure every frame, turn the measurements into a rule book, build to the rule book in Remotion, compare our frames to theirs with a team of measuring agents, rebuild, and package the result as a reusable Claude skill. The goal is not to copy any one creator. It is a repeatable format for Ostad's videos, assembled from the specific things Naim likes in each reference, in Ostad's own palette.

Core rule for every phase: **measure, don't describe.** An opinion can't be recreated; a number can. Every rule in the output carries a number and the reference frames it came from.

## 0. References
`style/refs.yaml`, each entry with a `target`. IG `@dr.jc.global` (clinical images of conditions: the rednesses, disease photos, crop, label, sequence, timing against speech). IG `@doctor.grove` (image treatment: shapes, rounded corners on image cards, framing, placement). YouTube `yhPRJ-dWP80` (the "GLP-1" pop-up and its animation; when she goes on her phone; frame-by-frame keyframes for both). IG post `DfTeuSYK23y` (full study). Ro (ro.co) YouTube, last 20 videos (graphics system: type, cards, transitions, colour). Are.na board `dr-ostad` (Naim's favourites; `brand/board_marks.json` if present; starred blocks are targets; video blocks get the full frame study). The existing glass animation in `brand/kit/video/` (approved; new devices must sit next to it without clashing). ADDITIONAL URLs.
IG accounts: read the profile's post count; carousel slides saved as their own images; reels' video and cover. Log `profile_post_count` vs `saved_count`. Original-language audio; verify the transcript language.

## 1. Measure every frame
Per video at native fps, with scripts: contact sheets (one per 2 s, every frame a tile, frame numbers burned in); cuts (PySceneDetect ContentDetector AND ffmpeg scdet, reconciled); camera (phase correlation frame-to-frame + ECC/feature tracking over 1 s windows for slow pushes; static/drift/push/pan); image stats (luma, RMS contrast, saturation, black/white point, shadow/highlight hue, palette k=5 every 15 frames); on-screen graphics (OCR, element tracking: entry/exit, bbox, opacity, scale, blur, easing fit with frames-to-settle and overshoot; image cards: corner radius px and % of width, border, shadow offset/blur/alpha, padding, grid position; device mockups); audio + script (Whisper word timings, words/s, pauses, dead air, music vs voice LUFS, SFX aligned to graphic entries, script structure, recurring phrases).
Save `style/measure/{ref}/{video}.json` and per-creator summaries (medians, spreads).

Checklist M1-M21 (each a script in `style/tools/`): M1 frames.py, M2 contact_sheets.py, M3 cuts.py, M4 camera_phasecorr.py, M5 camera_ecc.py, M6 camera_classify.py, M7 luma_contrast_sat.py, M8 shadow_highlight_hue.py, M9 palette.py (Lab k-means k=5 every 15 frames), M10 ocr_track.py, M11 graphic_track.py, M12 easing_fit.py, M13 card_geometry.py, M14 mockup_detect.py, M15 audio_track.py, M16 transcribe.py, M17 pacing.py, M18 loudness.py (Demucs stems), M19 sfx_align.py, M20 script_structure.py, M21 still_image.py. `style/tools/verify_measure.py` checks every applicable output exists, is non-empty and covers every frame (ffprobe -count_frames); table to `style/MEASURE_COVERAGE.md`; any ✗ blocks step 2.
Calibration first: M4-M6 on three synthetic clips (static, 2% push over 2 s, 30 px pan) and M12 on a synthetic bezier element; within 10% or fix the tool.

## 2. Read the sheets
One subagent per reference; `style/read/{ref}.md` (what measurements can't tell; frame numbers) and `style/read/{ref}_sheets.tsv` (one line per sheet; verified count). Frame-by-frame tables for the GLP-1 pop-up and the phone moment (10 frames before entry to 10 after exit).

## 3. The rule book
`style/RULES.md`: per reference, then the combined Ostad format. Each rule: number, spread, frames, adopted / adapted / rejected (reason). Sections: script formula · pacing and delivery · camera · cuts and transitions · colour and light · type on screen · image cards and shapes · condition-image sequences · pop-up callouts (GLP-1) · device mockups (phone) · before/after · markup overlays · sound. Flag disagreements and pick one.

## 4. Palette
From Ostad's existing blues (`brand/colour/existing.json`); lighter, with gradients. Three candidate palettes (ramps, 2-3 gradients, accent, neutrals); the same three test frames in each (condition-image card, pop-up callout, before/after). Score against step 1 colour stats and the contrast grades in `tokens.json`. Pick one, update `tokens.json` (gradients as tokens), regenerate token outputs, DECISIONS.md.

## 5. The image bank
From Ostad's own transcripts (`research/ostad/data/videos.json`, `source == own`) and `procedures.json`: every condition, procedure, product, claim. `style/bank/{topic}/`: condition photos (DermNet, Wikimedia Commons, Open-i/PMC OA, NIH; stated licence), procedure photos, before/afters (Ostad's gallery first). `bank.json` per image: topic, source page, image URL, licence, `use`: on-air / reference-only; Ostad's own = needs-approval. 10+ per topic; log gaps. Nothing reference-only in a render.

## 6. Research per topic
For each topic in `research/ostad/PLAN.md` (or the next 10): fact-check every claim against primary sources with links; the one surprising true detail for the hook; check reference creators' coverage. `style/research/{topic}.md`.

## 7. Script beats
Per researched topic: opening line, structure from the script formula, beats with the on-screen device cued, closing line; timing targets. `style/beats/{topic}.json` in the shape the Remotion composition reads.

## 8. Build in Remotion
One composition per device (condition-image card, condition-image sequence, pop-up callout, phone mockup, before/after split, markup overlay hook, the existing glass chip, captions, lower third, title/end); wire into a composition so beats JSON + talking-head clip + bank images → a finished short. **Stills before video.**

## 9. The gap analysis (agent team)
Our frames next to reference frames. Seven measuring agents (colour · type and graphics · motion and easing · image cards and shapes · layout and depth · audio and pacing · script), numbers not impressions, re-check the rule book. Four building agents in their own git worktrees (compositions / tokens and colour / bank treatment and image cards / audio and timing). Merge file by file. Re-measure. Repeat to tolerance or three rounds.

## 10. Package and prove
A skill at `.claude/skills/ostad-video/` (SKILL.md topic → research → beats → render; rule book; device catalogue with screenshots; beats schema; commands). Three finished shorts on real topics from the plan (Ostad's footage where it matches, else a labelled placeholder plate), 9:16, on `/brand/ostad` under the reel, each next to its reference frames.

## 11. The bible
`style/STYLE-BIBLE.md` in the Doom Bible form (revision and date; styles defined once; fixed template per device; V/D/N manifests; margin symbols; appendices: glossary, file layout, utilities with exact invocations, approved language, known failure modes).

## Completeness gate
`style/tools/verify_all.py`, ✓/✗ with evidence for: 1 IG saved vs count (sample, see amendments); 2 M1-M21 coverage; 3 calibration within 10%; 4 every sheet has a tsv line; 5 GLP-1 and phone frame tables; 6 every rule has number, spread, frames; 7 three palettes on the same three frames, chosen one in tokens.json; 8 bank folders or logged gaps, every image has `use`, no reference-only in renders; 9 every claim sourced; 10 stills before every video render (log timestamps); 11 seven measuring reports + four builder worktrees, numbers per round; 12 the skill runs end to end in a fresh session (test once); 13 three shorts rendered and live on `/brand/ostad`.

## Finish
TODO.md ends with the verify_all.py table, then: references downloaded / failed, frames measured, sheets read, rules adopted / adapted / rejected, the chosen palette, bank images by `use`, topics researched, devices built, gap-analysis rounds and final numbers per dimension, the three shorts' URLs, the skill path, and anything decided alone.
