# Style study decisions

1. **Sample, don't exhaust (client, 2026-11-08).** Apify's monthly limit is $10 and $8.85 was used, so $1.15 remained (the client said "the last 2 dollars"). Runs were capped at $1.00 total with `maxTotalChargeUsd` + `maxItems`: 60 latest posts per account (2 accounts), the 3 named posts, and the 2 profiles' details. Spent: $0.2673 + $0.0081 + $0.0054 = $0.28 (104 results at $0.0027).
2. **Flora is not used for scraping.** It is an AI generation canvas; no evidence it imports Instagram accounts, and it is not connected in this session.
3. **Are.na without a token.** `dr-ostad` is public; the v3 API returns it unauthenticated. Its 3 "sub-channels" are other people's channels connected to the board (MOTION/Typography by Alex Rainer, _skintech by Maud Giraudin, CGI 3D LIQUIDS by Natalie Liu): pulled as board context (the first two in full, liquids sampled), not treated as Naim's own picks. There is no `brand/board_marks.json` (no stars or rect notes), so "targets" on the board are the blocks with Naim's own descriptions.
4. **Media stays local.** Reference media, frames, sheets, stems and bank images are gitignored (other creators' work; the repo is public). Measurements, reads, rules, tools and manifests are committed.
5. **Remotion project = `brand/remotion/`** (the brief says `brand/video/`, which does not exist).

6. **Connected Are.na channels are context, not corpus.** MOTION/Typography (21 blocks), _skintech (47) and CGI 3D LIQUIDS (first 60 of 290) are saved to `media/arena_connected/` for the sheet readers (step 2), but they are not measured with M1-M21: they are other people's collections that Naim connected, not his own picks, and measuring them would weight the rule book toward them.
7. **Frame rate = native, every frame (client asked 2026-11-08 "each video should be watched at 30 frames a sec").** 82 of 119 videos are 30 fps; the 19 Ro videos are 23.976 fps, three are 60 fps (incl. the GLP-1 ad), Are.na GIFs 9-10 fps. Every real frame is measured (161,431 frames). Resampling to 30 would add duplicate frames to the 24 fps videos and drop half the frames of the 60 fps GLP-1 pop-up (a target), so native is kept; frame numbers can be converted to a 30 fps timeline at the end if wanted.

## 8. Markup devices v2: glass + hairline, small, around the feature (2026-11-09)
Client on v1 (yellow arrow, red disc badges, filled tint): "too big and not circling anything ... would need to be glass icons like the rest of the UI ... a lot cuter and smaller, kind of like what's in the Are.na board ... tacky and cheap right now". Read against the Are.na board (white hairline callouts, tiny dots, small spaced-caps labels, viewfinder brackets). v2 devices (brand/remotion/src/devices/Markup.tsx): Ring (3 px hairline ellipse drawn round the feature, 0.55 s), Pin (26 px glass dot + one pulse), Flow (dotted hairline arc + open chevron), Mark (68 px glass disc, thin X / check, rose / brand-blue tint), Brackets (corner marks closing 14 px), all with glass label chips (Elza 700 21 px, 0.16 em, caps) on 2 px leaders. Glass = the name card material scaled down plus a faint #202532 floor so labels read on a white wall. Positions follow YuNet face landmarks per frame (public/<slug>/face_track.json; 270/270 frames found on the rosacea window). Chips pop 0.72 -> 1 with a small overshoot (easeOutBack 1.2): the reference's no-overshoot timing is overridden by the client's "cuter".

## 9. Markup goes on condition images, before -> after, with a sound per pop (2026-11-09)
Client on v2: "these actually look good ... save the way you did that", but "we wouldn't circle his face ... pull up images of the type of rosacea he's talking about ... circle those red spots ... then pop up the image of it being gone and good, like after he does the machine". And: "sound effects pop up with different icons automatically".
- SkinCard (brand/remotion/src/components/SkinCard.tsx): glass-framed photo in the upper half (max 620x470 px image, above his mouth), Before/After chip, Rings on the spots + labels, X on the before, crossfade to the after + check; credit line under the card. Driven by edit.json "remotion.cards".
- Spots are measured, not hand-placed: research/ostad/style/tools/redness_spots.py. Single image: a* above its local surround (top 7%). Before/after pair: split at the divider, after ECC-aligned and L*a*b*-matched to the before, a fine-scale red / purple / dark map, a spot kept only if one of its signals mostly disappears in the after (lips and features present in both drop out). Checked on contact sheets: rosacea_cheek OK (cheek patches + nose), cheek pair OK (the red mark, red 0.17 left). Nose pair: no spot passed (ECC 0.82, after still pink there), so its ring is placed by hand on the purple vessels and marked in the card's _note.
- "After" images must be after the treatment he is talking about: the PMC tapinarof (cream) and photobiomodulation pairs in the bank are NOT used as "after laser". Only Dr. Ostad's own Cutera-gallery pairs are (needs-approval: patient consent to confirm before posting).
- Sound: scripts/sfx.py synthesises pop / swish / yes / no / card (no licence question); SkinCard places card on open, swish per ring, pop per label, tock on X, pop + chime on the after; gain 0.32 (about -10 dB under the voice). Measured on the rosacea render: added peaks -14 to -19 dBFS at the cards, audio identical elsewhere; integrated -13.9 LUFS unchanged.

## 10. Visuals all the way through, brand font back, glass keywords, new title and outro (2026-11-09)
Client: "it does a great job when it says before and after laser ... that is exactly what I'm talking about ... whenever he's describing something that we can find, add those visualizations" (oral antibiotics: pop up, shake, swipe out, X; irritation / dryness; flushing and visible vessels; oil glands, inflamed; the vascular lasers; the depths of skin), "see if this font is the most accurate to the brand bible", "when the text comes up blue make sure that's the actual glass", "the outro doesn't fit the brand identity anymore", the title "not as smooth or creative as what it could be".
- Font: the bible (brand/fonts/SYSTEM.md) is Neue Haas Grotesk Display only (600 headline, 500 caption/label). Elza was the client's caption reference (brand DECISIONS 65), not the bible. Reel back on NHG Display: captions 600 (fitted per line to the margins, it is wider than Elza), labels 500 caps (+0.12 em at 21 px: judgment call, small chips need air), name card 600/500. Brand DECISIONS 69.
- Glass keywords: glossy blue glass letter fill (white top edge, deep blue body, light bottom reflection), 1.6 px white rim, blue glow, one glint across the word as it is said.
- Title v2: "Rosacea?" big (up to 14cqw) in the glass letters; "Not another prescription." with "prescription" crossed out by a hairline and a glass X at the line end (sound: swish, tock).
- Outro v2 (components/EndCard.tsx): footage keeps running blurred + darkened, a glass card "Book a consultation. / Link in bio." with rising letters, hairline brackets, handle as a glass chip.
- New beats on rosacea-laser: pills 29.2 s (oral antibiotics) and 86.4 s (repeated antibiotics); gut microbiome 33.1 s; irritation/dryness photo 41.6 s; visible vessels photo 44.85 s (auto ring); flushing photo 49.4 s; skin cross-section 96.6-110.8 s (oil gland ringed, inflamed, vessels lit, Excel V beams stopping on a superficial and a deep vessel, Laser Genesis as a broad warm band in the upper dermis, depth ruler). Drawn explainers carry "illustration".
- Photos for the gaps from Wikimedia Commons, added to the bank: Flush01 (JBCH, CC BY-SA 4.0, a niacin flush) and Periorale Dermatitis (Johannes Köhler, CC BY-SA 4.0). ShareAlike photos are shown unaltered (no rings on them; the X sits outside the card); the credit line names the actual diagnosis. No "dryness" face photo on Commons fit; the irritation card carries both words.
- Render (Downloads/Ostad - Rosacea laser (v3 visuals).mp4): 119.125 s, -13.9 LUFS, true peak -2.1 dBFS; stills checked at every new element.

## 11. Calm v3: Ro-style cards, real treatment footage, quiet sound (2026-11-09)
Client on v3: the title, the outro brackets, the glass keyword letters and the pill pop-ups "look really cheap ... it shouldn't be distracting"; "oral antibiotics" and "repeated antibiotics" should be two different animations, "like Ro"; the depth diagram is "kind of confusing ... being able to show it in the way that it's actually done is important"; SFX should be "more low-key or familiar".
- One card material from the Ro set (media/yt/ro): light frosted white, navy type, soft long shadow, no rims, glints or tint. Motion everywhere is a fade + 18 px rise in 0.45 s (quint), out in 0.3 s. No overshoot or shake (components/Ro.tsx). The drawn explainers' panel lost its overshoot too.
- Title (Hook.tsx): no glass. "Rosacea?" is big white NHG 600 over a soft top scrim; "Not another prescription." sits in Ro's small white caption box, and a thin navy line strikes "prescription".
- Outro (EndCard.tsx): no brackets and no glass chip. One frosted card over the blurred footage: "Book a consultation." / "Link in bio." / hairline / handle.
- Captions: keywords are solid light brand blue (#7cc8f2). The glass fill, rim, glow and glint are gone, and the pop is 0.95 -> 1 with no overshoot.
- 29.2 s RxCard: a real photo of doxycycline capsules (Shorelander, CC BY 2.5, cropped, credited) and a 4-segment "repeated courses" bar that fills as he says "repeated, prolonged courses".
- 86.4 s RoutineCard: a different beat, built as a Ro checklist. "Instead of depending on": "Repeated antibiotics", "Daily topical creams", each struck through as he finishes the line.
- 96.6-110.8 s TreatmentCard replaces the diagram:
  - "What drives the redness": oil glands -> inflammation -> excess blood vessels, as three rows on a hairline.
  - Then the practice's own treatment footage (Dr. Ostad's YouTube shorts yo_NQn3K9Ilr5o and yo_OGdAzf1D3c0, cut to segments without burned-in text): Excel V at 102.3 s, with Laser Genesis sliding in beside it at 107.5 s.
  - Each clip has a three-line depth glyph: "Vessels near the surface" for Excel V, "Deeper in the skin" for Laser Genesis.
  - Clips live in brand/remotion/public (gitignored).
- SFX v2 (scripts/sfx.py): a soft rounded tap, a low airy whoosh, a single soft tone and a muted thud, each peaking at -8 to -12 dBFS. If the client sends an SFX reference, it replaces these.
- Render (Downloads/Ostad - Rosacea laser (v4 calm).mp4): 119.125 s, -13.9 LUFS, true peak -2.1 dBFS. Stills were checked for the title, both antibiotic cards, all three treatment phases and the outro.

## 12. Visuals every few seconds, face-safe placement zones, calm signature glass, clean captions; Evident + Colin and Samir (2026-11-09)
Client on v4 (loved it, "almost done"):
- "something happen every 5 seconds or so ... representations of every subject ... the same thing shown in different ways".
- "not completely covering his face ... it can be below him ... in different places"; placement should come from the scraped references measured frame by frame, not a fixed rule.
- "we want the glass features ... that's our signature ... something in between" (glass, Ro and Evident).
- A version with and one without the black caption outline ("kind of outdated").

Measured:
- **Face track** (YuNet every 0.5 s over the whole reel, public/rosacea-laser/face_reel.json): hairline y 494–551, eyes y 711–767, face x 288–749 (1080x1920). That gives four zones in brand.ts:
  - `top`: SAFE_T to about 610, over the hair, never the eyes;
  - `chest`: 1040–1560, over the scrubs and above the captions;
  - `*Left` / `*Right` variants;
  - a `full` cutaway.
  The image cards moved to `chest`.
- **Cadence** (frame difference on the two key reels):
  - Colin and Samir DfAik8-piUm: something changes every 2.55 s on average (median 1.67 s, longest gap 7.1 s).
  - Evident Ddos1QZRGmV: every 2.52 s (median 1.47 s, longest gap 10.9 s).
  - v4 had two 17 s gaps (12.4–29.2 and 69.5–86.4).
- **Captions** (Colin and Samir): white semibold, no outline, no box, 1–3 words, centred at 70% height, glyphs about 5.8% of frame width.

Built:
- New card kinds in components/Ro.tsx, mapped from edit.json kind to component in OstadReel:
  - `stack` (Rx labels, "another prescription");
  - `chronic` (flares drawn across a year);
  - `checklist` (ticks, or strikes);
  - `calendar` (months on medication, days of topicals);
  - `compare` (oral = whole body vs targeted therapy = the vessel);
  - `chain` (vessels -> redness; symptoms -> driving cause -> targeted treatment);
  - `note` ("some patients need medication");
  - `chips` (facts beside the device: hemoglobin, diffuse redness / skin quality);
  - `clip` (full cutaway of the practice's Excel V footage over the blurred room, after Evident's full-screen inserts, but light).
- 17 explainer beats plus 6 image cards: nothing goes more than about 4 s without a new element or a step inside one. Repeated subjects get a different form each time:
  - antibiotics: Rx label -> capsule card -> struck checklist;
  - topicals: calendar -> struck checklist;
  - lasers: chips -> full clip -> two clip cards.
- Card material: the signature glass made calm. Translucent frost (white 72–86%, blur 26, saturate 1.5), a hairline light rim, a top highlight, navy type. No tint, glint or gloss; the inner cells are glass too.
- Captions: `capStyle` "stroke" (8 px black outline) or "clean" (no outline, 5.8cqw, soft shadow). Set in edit.json remotion.capStyle or at render time with `--props '{"capStyle":"clean"}'`.
- References added (refs.yaml): evident (80 latest posts, 56 reels) and colin (40 posts), downloaded via the existing pipeline (ig_media.py; common.py maps them to refs `evident` / `colin`). The full M1–M21 measurement is queued behind pass 2 and will re-tune cadence, placement, easing and SFX.
- First manual read of Evident's animation: inserts build up piece by piece (title, baseline draw, bars grow, value tags pop), with a slow push-in on the held graphic and labels typed on inside a growing highlight box. Candidates once measured.

## 13. Exomind reel: an edit, not just an overlay (2026-11-09)

Client: "edit this one as well, not just add the visuals on top of it ... take out the dead spaces and cut out the things where he repeats himself. Use the other video as a standard." Start at "This treatment is FDA approved"; 1.1x; a header that is different but sits on the same grid as the rosacea title; the treatment itself shown muted in a card beside him or below; head taps and presses shown where they land; neurotransmitters off balance, neuroplasticity improving, numbers improving; seamless cuts where the patient comes in.

Measured / decided:
- **Cut** (new brand/scripts/video_cut.py; edit.json `cut.keep` in raw seconds, chosen from the word-timed raw transcript): 85 s raw -> 25 kept phrases -> 56.6 s cut -> 54.1 s at 1.1x with the end card. Gone: the false start, the repeated "obsessive compulsive" take, the repeated "headache" explanation, the "you came from" slip, and pauses longer than 0.30 s. Every join was checked on the audio envelope (each cut sits in a dip) and by re-transcribing the cut; four joins were moved after whisper heard a clipped word ("like", "you've", "better", "You").
- **Faces** (YuNet every 0.25 s on the cut): Ostad x 28–285, y 487–818; patient x 760–1012, y 555–852. Two seated faces leave a free column x ≈ 300–750 from the top band to the chest, so this reel uses that column (`pos: "xy:322,300"`, new in place()) as well as the chest band. The rosacea zones assumed one centred face.
- **Gestures** (from frames): Ostad taps the top of his head at raw 38.6–39.4 s, final 19.8–20.6 s, during "I feel a tapping". The patient's fingertips are on the top-left of her head at final 26.1–27.4 s, during "gentle pressure", measured at (930, 548) on the cut.
- **Reframes** (`spec.frames`, new): at each of the 25 joins the footage alternates between wide and a 1.10 punch-in on Ostad, so a jump cut reads as a cut. Patient lines punch in 1.16 toward her ("It quiets my brain", "I wouldn't even call it a headache", "the poor track record"). Ripples are drawn inside the reframed layer, so they stay on the heads.

Built (components/Exo.tsx, same calm glass and enter/Sfx as Ro.tsx):
- `video`: a muted clip in a glass card. Used for the practice's own treatment footage (Oct 30 video: the patient under the coil; Ostad showing the tapping on his own head) and for BTL's "What is EXOMIND?" animation (synapse, plasticity, coil, brain). BTL clips are cropped clear of their watermark and credited "Animation: BTL". They are manufacturer media: gitignored, and the client needs to approve them.
- `balance`: a tilted scale levels out (neurotransmitters off balance; reused as "busy -> quieter" for "in a good way").
- `network`: new connections draw between nodes, with a counter (neuroplasticity).
- `wave`: a busy line settles ("It quiets my brain").
- `bars`, `phone`: sleep numbers climbing. Labelled "Illustration": the reel has no real data.
- `meter`: "a little heavy", which drains on "dissipates quickly".
- `timer`: "up to an hour".
- `swap`: "A headache" struck and replaced by "Gentle pressure".
- `ripple`: taps (expanding rings) or a press (contracting rings) anchored to footage coordinates, with an optional chip.
- Header: the rosacea Hook template unchanged in grid, type and box ("Exomind?" / "What it feels like, what it treats."). There is no strike: the difference is in the content, not the layout.
- 22 beats in 51 s; the longest stretch without a new element is about 3 s. Repeated subjects change form: sleep goes checklist -> his bars -> her phone -> weekly bars; the treatment goes office clip -> tapping clip -> coil animation; the headache goes timer -> swap -> meter.
- The checklist was raised to y 890 so it clears the kit's lower third (0.1–4.3 s).

### 13b. Exomind v2 after client feedback (2026-11-09)

Client on v1: "I don't like the drinking-out-of-a-straw graphic ... it feels unnecessary"; "times when the animation BTL could be used to show the neuroplasticity or different parts, it's not"; "there are times when the cuts are a bit too fast and it cuts off what he says"; "when they tap their head ... some type of outburst and then it goes to a quieting ... it quiets my brain: it actually comes out from her brain ... that kind of squiggly line"; "having the parts that are actually animated be parts that are important".

- **Cuts:** video_cut.py gains `tail`. Each piece's end runs on to the first 10 ms frame within 5 dB of the room tone, up to 0.22 s. If no dip arrives in that window, the next sound is joined speech and the end stays put. `tailSkip` lists the three ends where the extension let in a dropped retake or filler ("for those that are", "like", "I would say like"); I found them by re-transcribing the cut. maxPause is 0.34 s, up from 0.30. Pieces that end up touching are merged. The cut is now 57.7 s and the reel 55.0 s; 0.9 s of that is restored word endings and breaths.
- **BTL animation where it explains:** "neurotransmitter issues" now cuts away to BTL's synapse release (the release lands on "issues"). "helps with neuroplasticity" cuts away to its growing branches. These are full cutaways (`clip`) instead of small side cards, and the drawn network and the small synapse/plasticity cards are gone. The drawn balance stays for "off balance" just before the cutaway.
- **Reactive heads** (`burst`, footage layer): coral jagged squiggles burst out of the head, then settle into slow blue waves rising off it. They run on her head for "It quiets my brain" (busy on "quiets", calm on "brain", "Quieter" chip) and on his head at the tap, together with the tap rings. Coral and blue rather than white, because the back wall is white.
- **Removed:** the swimming / cold-straw chips and the second "in a good way" balance, which the quieting now carries.
