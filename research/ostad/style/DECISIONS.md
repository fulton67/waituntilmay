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

### 13c. Exomind v3 (2026-11-09)

Client on v2: "weird glitches ... blue flashes"; "the loud fan in the background ... really distracting"; "the quieter and disruptive brain to stay white instead of being red ... more brand"; "completely remove ... drinking a straw or something cold ... 'almost like if you've gone swimming. It's not a painful headache' ... that's a lot stronger".

- **Blue flashes** were two things, found by scanning every frame for bright-cyan area and frame-to-frame jumps:
  - BTL's cyan light beams sweeping through both clips. Graded down with ffmpeg huesaturation on cyan and blue (saturation −0.55, intensity −0.12), which cuts bright-cyan area from 17% to 8% on average and from 45% to 23% at peak.
  - A 0.3 s unblurred flash of the room between the two cutaways. They are now one continuous `clip`: synapse release cross-fades (0.3 s) into the growing branches, and the title changes mid-shot (ClipFull `titles`, `startFrom`).
  - What's left are the cutaway's own 0.3 s fade-in and fade-out.
- **Fan:** `anlmdn=s=4` goes before the compressor in audio_pre. Measured on the cut: the fan in the pauses drops 12 dB; speech loses 0.6 dB at 300 Hz–1 kHz and 1.1 dB at 2–6 kHz. afftdn at any strength did less than 1 dB. On the finished reel the floor-to-speech gap goes from 7.6 dB to 17.0 dB.
- **Bursts:** white throughout, with a thin dark edge and shadow so they read on the white wall. The motion alone carries busy -> calm.
- **Straw line cut:** "or drinking from a straw of something cold" is gone. "Swimming" ends at the 51.13 s envelope dip before "or" (in tailSkip), and the next phrase is "It's not a painful headache". The reel is 52.9 s.

## 14. Exomind closing remarks: his pace kept, a linear explainer, and a keyed-out 16:9 version (2026-11-13)

Client: "Dr. Ostad is a slower talker. I don't want the cuts to distort his talking"; "we want it to be linear. It is informational, so I don't want the edits to be abrasive"; "our mind can only focus on one thing, so make sure the visuals make sense with the larger topic"; "keep the same editing style"; "think about it more as a YouTube video"; "maybe we try one where we remove his background, then insert videos of him with clients with Exomind and doing things". Then: "a slight speed-up of 1.1x-1.2x applied AFTER it is edited". Source: Nov 04 recording, 104.6 s, his closing remarks for the Exomind / total skin health evening (edit `brand/edits/exomind-skin`).

- **What went wrong before was the cutting, not the speed.** The v1-v3 Exomind reel cut every pause over 0.30-0.34 s and ran 1.1x on top: 219 words/min, his breaths gone. Here nothing inside his delivery is cut. The only cuts are 1.4 s of dead air before the first word, room tone after the last "Thank you", and the one long silence (1.41 s at raw 43.46-44.87, where he moves from booking to "Before you go"). That silence is brought to 0.69 s with a 0.3 s cross-dissolve (video_cut.py `xfade`), so there's no jump cut. All 18 of his natural pauses stay (0.44-0.86 s on the cut). There were no fumbled retakes. 104.6 s raw -> 100.9 s cut.
- **Speed after the edit: 1.15x, uniform** (atempo keeps pitch; picture setpts; captions and graphics timed on the sped result). 161 wpm on the cut becomes 185 wpm, still well under the 219 that read as rushed, and the pauses stay pauses (0.38-0.75 s). 1.1x would be 177 wpm. 1.15x was enough.
- **Re-transcribed:** all 269 words of the source are in the cut in order. The only differences are recogniser variance ("I would" / "I'd").
- **Linear explainer, one idea at a time.** His order is kept, and each visual carries the point he is on: title -> Exomind in the office -> skin + mind = total skin health -> your questions -> after tonight -> booking -> your visit -> before you go -> our team -> chapter "Total skin health / A comprehensive approach" -> the next frontier -> classic vs beyond -> emotions -> skin -> BTL cutaway (Exomind -> neuroplasticity -> neurotransmitters, one continuous shot with mid-shot titles) -> focused, in flow -> feel better -> better skin. No punch-ins, no reframes. A second title works as a chapter break, YouTube-style (graphics kind `title`).
- **Placement (vertical A):** YuNet over the whole source puts his face at x 65-515, y 476-1072. Small cards go in the right column x 584-1024 from y 262. Wide cards start at y 1110, below his chin and above the captions at 1593.
- **Movement behind the glass** (client: "clean and not stagnant"). His back wall never moves, so every card now carries two soft light blobs (brand blue, white) drifting slowly inside the frost (Ro.tsx `card()`, clock from `setGlassClock`). In B the background footage keeps playing defocused with a 3% push-in per shot, two slow glows sit behind the frost, and a sheen crosses each card once on entry.
- **B, the 16:9 YouTube cut (new composition `OstadWide`).** It's 1920x1080, not 9:16, because the client framed it as YouTube, and a wide frame gives the speaker and the footage each their own space instead of stacking them. The layout follows the client's reference, a console home screen ("the glass glossiness and the box on the right side and the curved boxes"), in our palette: the background is full-bleed footage, defocused and dimmed; the chapter sits top left as a white NHG headline with an outlined pill; he is keyed out, large, on the left; on the right is a column of two tall frosted cards (radius 38-40, top sheen, no hard border). The point card has a section label, a brand-blue pill, a two-line title and a muted line. The media card holds footage, a ticked list or a comparison, and the Exomind device cutout breaks out of its top edge at the start. Cards change with his points and chapters (13 points in 87 s), not every few seconds.
- **Keying:** Robust Video Matting (MobileNetV3, ONNX, CPU) runs over the whole raw clip (scripts/video_matte.py). RVM is recurrent, so the hair edge stays stable. The matte is cut with the same pieces as the picture (video_cut.py `--raw/--out`), then cleaned per frame: only the largest body plus 24 px around it is kept, which drops the few machine slivers beside his hand. The result is packed as VP9 + alpha for `<OffthreadVideo transparent>`.
- **B footage rules** (client): clean, crisp and high resolution; never upscaled into a full 16:9 background; never footage with Dr. Ostad in it behind him. So B uses only BTL's Exomind stock: the device, patients under the headset, the neuro animation and the lifestyle shots, from BTL's "What is EXOMIND?" film (1280x720). Each clip is cropped 1066x600 below BTL's logos and shown in the media card at 0.93x or less. The full-bleed copy behind the glass is blurred 38 px, so it carries only colour and motion. One light grade across everything (contrast 1.03, saturation 0.9; the cyan beams graded down as in 13c). The practice's own footage, all of which shows him, stays in A's side cards. The BTL support site (btlsupport.com) needs a login, so nothing new was downloaded from it. All BTL media is gitignored and needs the client's approval before posting.
- **Audio:** the v3b chain unchanged (no denoise), loudnorm -14 LUFS.
- **Measured on the finals.** Motion behind the glass: for each card, the mean change against the frame 1 s earlier, taken in an empty part of the card. In the first A render the right-column note and wave cards sat at 0.4 levels/s, with still stretches up to 2.3 s, so the blobs were made faster and stronger (periods ~10-14 s, ~25 % travel). On the final A every card moves (0.75-6.4 levels mean) and the longest still stretch is 0.71 s. On B the point cards, list cards and open background all move (worst still stretch 0.29 s). Each background clip is slowed to fill its window (rate 0.16-1.0) instead of holding a frozen last frame. Final A re-transcribed: 268 of 269 words, the 3 differences are recogniser variance. Measured speed 1.150 / 1.151 per piece (word-start slope). Both A and B: 90.22 s, -14.1 LUFS, true peak -4.4 dBFS. Keying: hair-band alpha change 0.86 levels/frame mean (p99 1.98); stray components appeared in 10 frames, and 5783 px were dropped in total.

## 14b. YouTube v2: varied shots, Exomind first, a white line system that responds to him (2026-11-13)

The client rated v1 (OstadWide) 6/10. Their notes:
- "extremely repetitive ... looks super generative": 90 s of the same presenter-left + two-cards layout.
- "around the head looks really bad ... the cut out is very visible and looks cheap".
- "focus and show the Exomind as much as possible ... someone experiencing it, the results".
- The Evident Media graphics they liked (refs `evident`, Ddos1QZRGmV): "I don't want every graphic in a box".
- "Think about visual graphics like you made on the rosacea".
- "new animations showing how Exomind actually works".
- "I don't want the black around the captions".
- One themed system, and "make the whole page feel interactive".
- "a bit more white".
- "I don't know if the font is the brand bible font ... it doesn't seem clean".

They asked to keep his size, the clips they liked, the 1.15x speed, his pauses and the linear order. New composition `OstadYT` (src/OstadYT.tsx + components/YT.tsx), config `yt` in brand/edits/exomind-skin/edit.json, footage from brand/edits/exomind-skin/yt_assets.sh.

- **13 sections, no two neighbours share a layout:**

  | # | Time (s) | Layout | Content |
  |---|---|---|---|
  | 1 | 0-6.6 | A-roll panel right | name, then "Exomind" with the coil pulsing |
  | 2 | 6.6-11.0 | line diagram | head + skin; an "Include the mind" toggle tapped on "mind"; a live link travels between them |
  | 3 | 11.0-17.2 | full-frame practice footage | the Oct 30 session, the patient under the coil, his face cropped out; coil callout; live session timer |
  | 4 | 17.2-27.5 | A-roll window left + type | giveaway: email and phone chips light on the words; "check your texts" with an unread badge the cursor taps |
  | 5 | 27.5-37.2 | phone UI + checklist | a reply thread, a calendar slot booked, the visit's three steps tick on his words |
  | 6 | 37.2-47.3 | the one keyed shot | over a bright white plate, with a matte-white question box that types, sends and answers |
  | 7 | 47.3-51.7 | full-frame BTL footage | patients under the coil; calendar chip tapped on "seeing you in the office" |
  | 8 | 51.7-57.4 | chapter type + ring | "A comprehensive approach to total skin health"; three arcs (skin care, the mind, technology) close into one ring |
  | 9 | 57.4-65.0 | A-roll panel left + timeline | "the next frontier": the cursor drags a marker past the frontier into "beyond: the mind" |
  | 10 | 65.0-69.4 | split screen | BTL stress \| calm, each half at native scale; a slider dragged across |
  | 11 | 69.4-82.7 | mechanism illustration (13.3 s) | coil -> pulsed magnetic field -> prefrontal cortex -> new connections (counter) -> neurotransmitters (synapse + a balance that levels) -> focused, in flow (a busy line settles); a progress rail on top |
  | 12 | 82.7-87.2 | testimonial | the patient's own frame (Nov 05, muted) with her words "It quiets my brain." revealed word by word; feel better -> better skin |
  | 13 | 87.2-90.2 | end | BTL smile, matte-white CTA card, "Book now" pressed |

  He is on screen for 4 of the 13 sections (about 38 s of 90). The rest is Exomind footage and drawn graphics.
- **The head edge:** keying is used once only. The other A-roll is his original shot, unkeyed, at 0.8x (4:5 panel) or 0.5x (rounded window), never enlarged. For the keyed shot, `video_matte.py --pack --refine` pulls the matte in 1 px, feathers it 0.8 px, and recolours edge pixels from the solid body inside. He sits over a plate lit like his own wall (the white canvas), so grey hair never rims against a dark ground (v1 put him over dark blue). Zoom crops of the head at 6 points across the shot show no rim.
- **Footage:** the BTL "What is EXOMIND?" film (720p) with BTL/EXOMIND corner logos removed by delogo, scaled 1.5x (lanczos + light unsharp) for full frame, one light grade. The split screen uses each half at 1:1. Practice footage: Oct 30 (the session, crop below his face, 1080 wide -> 1.78x) and Nov 05 (the patient's half, native 440x780).
- **System (components/YT.tsx):** white / near-white canvas with a faint blue neural field drifting at two depths and live grain. Navy line and type, brand blue for the active thing. One 3 px line, one icon set (brain, coil, pulse, network, wave, envelope, phone, chat, calendar, target, clipboard, check, question, skin, spark), one curve (quint out). Tags type on inside a growing highlight (Evident's label move). A cursor glides and taps; toggles, counters, sliders and progress respond to his words. The house matte-white glass appears only twice (question box, end card), with drifting light inside. SFX family: pop / swish / card / yes. Board: brand/edits/exomind-skin/yt_system.jpg.
- **Type, per the bible** (fonts/SYSTEM.md, kit/tokens.css):
  - headline NHG Display 600 / 1.033 / +0.0082em
  - labels NHG Display 500 caps / 1.078 / +0.0102em
  - small text NHG Text 400-500
  - captions NHG Display 500 / 1.271 / -0.0158em

  Sizes come from the bible's 1080-high canvas (headline 68, label 30), with a hero at 2x for one focal statement per section. Captions are 42 px (the bible's 30-38 px is sized for phone viewing; this is a judgment call for YouTube distance). Margin 175 px (9.1 % of width), top 149 px, left aligned, one radius (30 px). No text shadows anywhere. OstadWide's -0.02em headline tracking was the crammed look.
- **Font check:** Fonts.tsx now waits for the kit stylesheet and requires `document.fonts.load()` to return a face for each weight. `document.fonts.check()` alone also returns true for a family with no faces at all. Debug frame (OstadYT `debugFonts`): the DOM width of a test string in the brand face against Arial differs (Display 500: 502.2 vs 544.8 px; Display 600: 531.2 vs 584.6). The glyph sample shows NHG Display and NHG Text, not the fallback.
- **Captions:** no stroke, shadow or box. They are navy on the white canvases and white over footage. On the three bright footage sections only, a wide, soft navy wash sits far behind the line. Measured on 12 caption frames, the mean luminance 1-5 px outside the glyphs vs 14-26 px out differs by -2.1 to +2.2 levels, so there is no halo.
- **Medical content:** limited to his words and BTL's own film (coil, magnetic pulse, prefrontal cortex, neuroplasticity, neurotransmitters). The mechanism carries an "Illustration" label. The "new connections" count is illustrative. The patient's quote is her own words from the Nov 05 recording, shown over her own frame. No new outcome claims.
- **Not available:** BTL support files (still behind the login; nothing typed). No before/after or results footage exists on disk, so "results" is carried by the patient's words and the calm/flow graphics.
- **Measured on the final v2** (90.22 s, 1920x1080, 24 fps, -14.1 LUFS, true peak -4.3 dBFS; same audio as A and B):
  - **Movement:** the 1 s-lag frame difference above the caption band moves in every section (1.1-61 levels mean), with no still stretch. The question card's empty corner first held still for 1.1 s, then 2.5 s, with blobs alone. A slowly turning tint was added to the glass, and it now moves at 4.2 levels with no still stretch; the end card moves at 6.2.
  - **Footage:** the client's "Oct 30 ... (1).mov" is byte-identical to the Oct 30 recording already used for section 3 (md5 match).

## 14c. YouTube v3: the mechanism on real pictures, light in a room, calm type, captions on the word (2026-11-13)

Client notes on v2: the drawn head and brain in the mechanism section "look horrible, it doesn't look like a skull at all" (no freehand anatomy again; trace from a real source frame by frame if anything is illustrated). Labels must never truncate ("PREFRO", "Total"). The step labels should be bigger. Frames that look empty mid-animation (the s5 phone outline, the s6 thank-you card) must start with content in place. White should feel like their reference (Are.na 52762267, a defocused bright interior), not a blank page. The progress control should follow Bencho's "Step player" (Are.na 50822604). Type: "a Helvetica would look better", the bible's Helvetica Neue LT Pro, "a semi bold one", calm and small like the Homevolt posters and the 963 journal. "The captions are laggy."

- **s11 (13.32 s), rebuilt on real pictures:**
  - 0-2.6 s: the Oct 30 session (session.mp4 from 7 s; s3 uses 0-6.25 s), in a 1570x740 window at 0.82-0.86x. A leader is tracked to the coil (source px (640, 290)), and pulse rings run from the coil pad into the head, clipped to the head ellipse. The head did not move over 7-12.5 s (1 fps strip).
  - 2.6-6.4 s: the mechanism slot. Two Flora clips are being re-rendered: a fixed head-and-coil shot zooming into the prefrontal cortex, then new connections forming. They will be played full frame at 1.3x (5 s becomes 3.85 s), nearest-frame, with no blending and no added blur (`MECH` in OstadYT.tsx). Until they land, the slot holds BTL's own lit-brain render at native 1066x600 in a white window. A white outline over it is traced frame by frame from that render (scripts/trace_outline.py: top-hat rim, contour, only points on a real bright rim, Douglas-Peucker; 66 frames), with "Prefrontal cortex" and "Neuroplasticity" beside it.
  - 6.4-10.2 s: second slot, interim. BTL's dendrite render at native 968x726, the new-connections counter, and the neurotransmitters chip at the word.
  - 10.2 s on: her, calm under the coil (session from 12.5 s, at 0.83x) beside "Focused, in flow" and the busy line settling into one wave.
  - The client-picked first head clip (head_coil_anim) was cut in and then held when the client said the head looks wrong. It was toned in comp with saturate(0.55) and no glow or bloom. It is not in this render, so its glow saturation was not measured.
- **s8 opener:** Flora's coil clip, full frame. It is slowed to 0.875x with frame blending to cover the 5.7 s section, never looped (yt_assets.sh). The type sits in the left third, with skin care / the mind / technology listed quietly. The ring graphic is gone.
- **AI renders:** both Flora clips are AI renders (Nano Banana Pro stills made from a real BTL coil frame, animated with Kling v4), supplied in public/exomind-skin/flora/ and gitignored. The mechanism span is labelled "Illustration" on screen once the Flora clips are in.
- **Canvas, "light in a room":**
  - Measured on the reference with k-means, k = 6, by share: #f6f8f5 21 %, #eaede7 20 %, #a9ab95 17 %, #c7cbbb 15 %, #d9ded4 14 %, #babca7 12 %. L* runs 66-99 (p1-p99), median 87. Bands from top to bottom: #d9ddd7 #e4e8e3 #edefe9 #e5e7da #bebfa9 #abaf9c.
  - The canvas is that vertical gradient, two soft window glows, a warm cream pool and sage shade, all radial with no hard edge and slowly drifting. The neural field stays at a quarter of its strength, in white.
  - Homevolt's thin four-colour strip runs along the bottom edge (#abaf9c #e5e7da #37a9e8 #373737).
- **Step player:**
  - Reimplemented from the measured behaviour of Bencho's Step player (bencho.dev/blocks/step-player), not copied. Credit: Bencho.
  - Geometry at 2x (the block is CSS px at UI distance): dot 16, bar 72, gap 16, slab inset 28, so the slab and the play pill are both 72 high, with a pill radius of half the height.
  - Every dot is a pill with two edges. On a step change, every edge moves from its old slot to its new one in 520 ms on a cubic ease-out, with no travelling bar.
  - The current pill fills with ink at a steady speed over its step. It is never narrower than a dot, and that dot fades in over the first 1/14 of the fill.
  - Wake (at 100): crossed dots stand up in order after a 60 ms lead, 300 ms each on a half sine, with a 55 ms stagger and amplitude 0.34. The landing pill answers last at 0.3.
  - The play mark morphs between two quads over 300 ms (in-out cubic), with the block's squash, tip and lean.
  - It replaces v2's rail of six 20 px labels: one current label at 24 px, with "03 / 06". It is also used for s5's three visit steps.
- **Type:**
  - One weight, 500, for headline, label and caption. In the kit, 500 is Helvetica Neue LT Pro 65 Medium, the face the client asked for ("semi bold"). Until the kit has it, the weight is NHG Display 500.
  - Text is #373737. Greys are #8E8E8E and #BCBCBC.
  - Display sizes are 0.65x of v2 (headline 44, hero 88). Labels and small text are at least 22 px, and labels are tracked +0.04em.
  - Cards are the 963 frosted grey (rgba(219,219,219,.7), 24 px radius, 22 px blur, a hairline, no long shadow).
  - Entrances use the 963 fadeUp: 2 s, CSS ease, 20 px rise.
  - Tags became quiet chips: a pale fill, a 0.65 px #8E8E8E hairline and a blue dot. The whole label is there from its first frame, so nothing reads truncated. Kinetic words are never clipped by their slot.
  - **Helvetica Neue LT Pro is not in kit vzz0hgt.** It was not added, because editing the user's Adobe web project needs the user's own go-ahead. The code is ready: flip `TYPEFACE` to "helvetica" in components/YT.tsx, and the font loader then requires 55/65 via document.fonts.load (no system Helvetica or Arial stand-in).
- **Captions:**
  - Measured on the first v3 render: phrase starts vs word onsets from a fresh transcript of the delivered audio (faster-whisper on audio.m4a). All 82/82 matched. Median -0.014 s, mean -0.009, p10 -0.052, p90 +0.018, slope 0.0007 s/s. So there was no double speed scaling and no offset.
  - The lag was the presentation: a 3-5 word phrase appeared whole at its first word, behind a 0.14 s fade and rise.
  - Now each word cuts on at its own measured onset frame (scripts/caption_words.py, 267/268 words matched, then edits/exomind-skin/yt_words.json, prepare.cjs, props), with no fade, no rise and no shadow. The rest of the line holds its place invisibly, so nothing reflows.
  - Read back from exact decoded frames (0-6 s): every word appears on its onset frame (offset 0 frames). A seek-based sampler said -1 frame on 26/27 words, which turned out to be ffmpeg seek bias.
- **Fixes:** the s5 phone is in place from the first frame, with the first bubble already there. The s6 thank-you content swaps in at 60 % opacity rather than from empty.
- **s2 without a drawn head:** v2's line-drawn head profile is gone, since drawn heads have been rejected twice. Her head under the coil now sits in a white window: a native-pixel 560 px crop from the Oct 30 session at 13 s, a different moment and framing from s3. It is desaturated until the toggle switches the mind on. The dotted link runs from it to the skin diagram. `S2_HEAD` takes the Flora glass-head clip (head_final_anim.mp4) when it is approved.
- **BTL windows graded toward the room:** brightness 1.3, contrast 0.8 and saturation 0.55, with a sage-cream screen over them (rgba(237,239,233,.30) to rgba(199,203,187,.24)) and a #c9cdbf window ground. This replaces navy against the light canvas. Her footage windows are not graded. The Flora neuroplasticity clip (neuro_anim.mp4) goes into `MECH.clip2` at 1.3x when it lands.

## 14d. Client rules (2026-11-13, after YouTube v3). Every future Ostad edit follows these

1. **No play/pause/press UI effects.** No play or pause buttons, morphing play marks or press taps on progress controls. A quiet progress indicator is fine. The step player now has no play pill.
2. **Real video over stills and over generic stock.** No sunset-field-style stock. If a real clip of the subject exists, it runs as video.
3. **Never leave the subject against empty sky or dead space.** Reframe or crop toward the room, or give the empty area a purpose (the type block).
4. **The palette stays in the brand-bible blues, never green.** The light-room canvas was moved from a green-grey cast to cool blue-grey (measured hues in the v4 notes below). No new green tints.
5. **Icons must literally match their word.** A face for skin care, a synapse for neurotransmitters, a brain for the mind, the coil for Exomind/technology. Each icon is checked against its word.
6. **No hand-drawn heads or anatomy.** Use real footage, or real renders traced frame by frame.
7. **Long-form/YouTube type: Helvetica Neue LT Pro 65 Medium** (current choice, can change). Vertical reels keep the bible NHG system. The `TYPEFACE` switch in components/YT.tsx keeps a font swap to one line.
8. **Captions go word by word, each word on its measured onset.** No fade, no rise, no shadow.

### v4 changes under these rules
- The step player has no play/pause control.
- s7 no longer opens on the field-at-sunset frames at the head of couch.mp4. It opens on the client's pick: the woman on the couch, hand on her forehead (real BTL video, stressed.mp4 from 0.45 s, 1.1 s), then the patient relaxing under the coil.
- s10's stress side is now a different real shot: the sleepless woman in bed (BTL 22.0-26.2 s, stressed2.mp4), so the couch shot is not used twice.
- s8: the Flora coil shot is tightened 1.12x toward the coil and the room. The headline and the three parts fill the bright window side from the first frames.
- Canvas: every room colour was moved 55 % toward a luminance-matched cool blue-grey, and the floor tones further. HSV hue of each palette colour, before and after: top 100 -> 212, mid 80 -> 214, warm 69 -> 205, sage 75 -> 200, floor 73 -> 210. The BTL window grade follows (screen rgba(232,239,248,.30) to rgba(196,202,210,.24), ground #c8ced6).
- Icons: a new `face` icon (front-on face with a small glint) for "Skin care", "Caring for the skin" and "Better skin". A new `synapse` icon (two membranes with messengers crossing) for "Neurotransmitters". The rest were checked and kept: coil (Exomind/technology), brain (mind/prefrontal cortex), pulse (magnetic pulse), network (new connections), wave (focus and flow), target (goals), clipboard (medical history), chat (texts), envelope/phone, calendar, check, question.
- Not changed: the Flora coil render itself has a sage-green curtain in its room, which is part of the AI render. It needs a Flora re-render, or a recolour if the client flags it.
- **The final Flora clips** are AI renders (Flora: Nano Banana Pro stills from a real BTL coil frame, animated with Kling), on a pale-blue room with no green.
  - **head_final_anim:** a glass head with the brain inside and the real coil on the forehead. It is used in s2, inside the white window, at 1.16x so it fills the 4.33 s section without a hold. It is also the s11 mechanism shot, full frame at 1.3x (2.6-6.4 s), nearest-frame with no blending. Over it: a hairline from the step player's "Prefrontal cortex" label down to the frontal lobe, and "Neuroplasticity" in the empty left third, with no boxes over the head.
  - **neuro_anim:** sparse to connected, reversed by the coordinator; blue synapse pixels measured at 144 at the start and 449 at the end. It plays full frame at 1.3x (6.4-10.2 s) in place of the navy BTL dendrite and synapse renders, with the new-connections counter and the neurotransmitters line in small type.
  - The step player is drawn above the full-frame clips. The span is labelled "Illustration". The BTL renders remain only as the code's fallback.
