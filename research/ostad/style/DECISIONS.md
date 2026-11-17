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

1. **No play/pause/press UI effects.** No play or pause buttons, morphing play marks or press taps on progress controls. A quiet progress indicator is fine. The step player now has no play pill. *Sharpened 2026-11-16 (14e):* no sliders either. A before/after is two labelled cards or a labelled split (Evident Shorts R27, `read/evident_yt_group1.md` §5), and UI appears only when the UI itself is the evidence (G1 §5, R1).
2. **Real video over stills and over generic stock.** No sunset-field-style stock. If a real clip of the subject exists, it runs as video.
3. **Never leave the subject against empty sky or dead space.** Reframe or crop toward the room, or give the empty area a purpose (the type block).
4. **The palette stays in the brand-bible blues, never green.** The light-room canvas was moved from a green-grey cast to cool blue-grey (measured hues in the v4 notes below). No new green tints.
5. **Icons must literally match their word.** A face for skin care, a synapse for neurotransmitters, a brain for the mind, the coil for Exomind/technology. Each icon is checked against its word.
6. **No hand-drawn heads or anatomy.** Use real footage, or real renders traced frame by frame. *Sharpened 2026-11-16 (14e):* a mechanism is shown step by step on the real image (the Flora glass head, the neurons, or practice footage), with only paths, rings and hairline leaders drawn on top (G1 R22). Markup never goes on his face (G1 R23).
7. **Long-form/YouTube type: Helvetica Neue LT Pro 65 Medium** (current choice, can change). Vertical reels keep the bible NHG system. The `TYPEFACE` switch in components/YT.tsx keeps a font swap to one line.
8. **Captions go word by word, each word on its measured onset.** No fade, no rise, no shadow.
9. **Every graphic lands on the word he says** (added 2026-11-16, 14e). A pop, highlight or label starts 1 frame after the word's onset (Evident median, `read/ig_Ddos1QZRGmV.md` §1.2). A long build may start on the clause before, but it ends on the word (`read/evident_yt_group3.md` §5). The animation library (`ANIMATION_LIBRARY.md`) starts from his line, never from a template.
10. **Numbers are cited or absent** (added 2026-11-16, 14e). A chart, counter or share shows only a figure with a source line on the frame; otherwise it's a `[cited figure]` slot. A counter of things on screen says that's what it is.

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

## 14e. Motion system from the Evident and newapology studies (2026-11-16)

Inputs:
- Evident's model post read sheet by sheet (`read/ig_Ddos1QZRGmV.md`).
- 53 Evident YouTube Shorts read board by board (`read/evident_yt_group1..4.md`).
- The newapology.com study: its site, 12 case studies and 14 linked live sites (`web/newapology/`).

Outputs:
- `MOTION.md`: the brand bible's motion chapter, with tokens, reveal grammar, transitions, spacing and the don'ts.
- `ANIMATION_LIBRARY.md`: 23 parameterised animations, with the 6 BOARD ideas mapped onto them.
- `brand/remotion/src/library/`: the proof components.

This is **additive**. The calm glass (11–12), the YouTube system (14b–14c), the room canvas and blues (14d v4) and every 14d rule stay. Two of those rules are sharpened, and two are added (9 and 10, above).

**Adopted**
- **Reveal on the word, +1 frame.** The DDOS median over 23 reveals is +1 f (abs median 2 f, 65 % within ±3 f; §1.2). Highlights in the Shorts are also +1 f (n = 7; G1 §2 T1). Long builds land on the word rather than start on it (G3 §5 R2). Token `cut`.
- **Build in place.** DDOS B05 makes 4 reveals in 10.9 s (§1.3), and graphic-led Shorts hold one scene for 10–24 s (G1 §3). For us: a visual every ≤ 5 s (DEC 12), and a step every 2–4 s inside a held scene.
- **The highlighter as `sweep`, `.6,0,.25,1`.** Evident's sweeps peak at 44–45 % of their duration (DDOS Moments A–C). newapology's `--nap-control-ease` has the same shape (peak 0.43; `web/newapology/pages/site.md` §6). Durations at 24 fps: highlighter 16 f, row wipe 14 f, bar 26 f, trace 27 f, dot fill 18 f.
- **Counters run linear and end 2 f after their bar** (DDOS Moment B). Token `count`. Cited figures only.
- **`arrive`: `.22,1,.36,1`, 14 f (600 ms), 16 px rise, 2 f stagger capped at 10 f.** From newapology's `nap-page-enter`: 600 ms, 12 px, `min(85·i, 425)` (site.md §5A). It's practically our existing quint-out entrance: 99 % at 65 % vs 60 % of the duration, both fastest at t = 0. So nothing already approved changes visibly.
- **`morph`: `.66,0,.25,1`, 26 f, radius 24 → 0,** for card ↔ full frame. From newapology's View Transition: 1100 ms, radius 19 → 5 px, old page out in 200 ms (site.md §3B).
- **`swap`: outExpo, 16 f,** for the masked rolling label, with the box sized to the longest value. From softunion S2: 650 ms, fit RMS 0.0017–0.0029 (`sites/softunion.online.md`).
- **`blank`: inOutQuart 11 f out, 7 f blank, 11 f in,** at chapter changes only. From softunion S5: 450 / ~290 / 450 ms. It matches the old `brand/motion/RULES.md` dissolve (500 ms, 12 f).
- **`plate`: march2004's `.15,0,.25,1`, plate 18 f, then the picture through it 18 f** (`sites/march2004.com.md` M1–M2, 750 + 750 ms). Index stagger 1 f, capped at 12 steps (`350 + 50·min(i,12)` ms).
- **`exit`: `.4,0,1,1`, 7 f, 7 px.** newapology's `index-out` curve (site.md §3C), using the duration we already had: Ro `enter()` 0.3 s and RULES.md `duration.exit` 300 ms.
- **Dim the rest instead of scaling the focus,** to 0.33–0.5 (roko-g, georgedavies), never 0.2 (colelferguson flags that as too strong). Shorts: dim over 10–24 f, then isolate 15–25 f after the highlight (G4 T6, G3 T12).
- **Spacing:** base unit 8 px at 1080 high on a doubling scale. It's march2004's 6 px doubling scaled 1440 → 1920 (6 × 1.333 = 8). The gutter is 24 px (3u): newapology's and softunion's 20 px gutter is 26.7 px at 1920, rounded onto the scale. The 16:9 grid is 12 columns (column 108.8 px) inside our existing 175 px margins; 9:16 is 6 columns (127.3 px) inside 98 px. Radii are 24 (glass), 2 % of width (footage windows) and 0 (highlighters, full frames).
- **New Shorts rules, taken as library entries:**
  - R22 mechanism on real imagery → L03, L04.
  - R23 annotation on footage → L07.
  - R24 re-typeset headline → L01.
  - R26 ID card → L20.
  - R27 labelled before/after, no slider → L06, L23.

**Kept (reconciled, not replaced)**
- YT `life()`, the 963 fadeUp (2 s, CSS ease, 20 px; DEC 14c), becomes the `settle` token. It's for type that isn't tied to a word. A word-tied reveal can't use a 2 s fade.
- The step player's 520 ms cubic ease-out (14c) stays as the allowed quiet progress indicator.
- RULES.md's in-out `.65,0,.35,1` (peak 0.50) stays for board-reel zooms. Explainer progress uses `sweep`.

**Adapted**
- **Stepped animation on 2s/3s** (DDOS R11, 44 % duplicate frames in graphics) is weaker in the wider corpus: Shorts graphic segments step a median 7.8 % (G1 §3), whole videos 0–11.1 % (G3 §3). The default is now smooth at 24 fps. Stepping stays only as an A/B option on data graphics.
- **Seconds per idea.** The Shorts' per-video medians are 2.81 s (G1), about 2.2 s (G2), 1.21 s (G3, design-led) and 3.13 s (G4). For calm long-form we keep a new *visual* every ≤ 5 s with an in-scene step every 2–4 s (G1 §5, R4 refined). G3's 1.0–1.4 s design-led pace is too fast for him (DEC 14).
- **Kinetic word stamps** at most once a minute, each on a different background (G1 R25). Typing is used only while the words are being spoken, with no caret.
- **Scroll-scrubbed motion** (cellar's rotation, `180 × (1 − (1 − s)^2)`) is taken only as "progress mapped to speech" (the progressive highlight). Nothing spins freely.

**Rejected**
- **Lime, or any second accent hue.** One accent per video, never two on one chart (G4 A6), ice blue only (14d rule 4).
- **Charcoal data canvases** (DDOS R8). We use the room canvas or navy #202532.
- **Overshoot.** No spring anywhere on newapology (site.md §6). Its one "pop" keyframe (scale 1.045) isn't taken.
- **Blur-heavy entrances** (softunion 8 px, roko-g 16 px). They hide clinical detail. At most a 6 f defocus-in into a still (DDOS B21).
- **Cursor pills, hover inflates, marquees, preloaders, random placement.** These are web interaction devices, and the client bans cursor and press UI (14d rule 1).
- **The Shorts' stutter edits** (9 cuts in 4.6 s, G1 qf_jdmTkPgg) and their −20 LUFS mixes (G2 §3, "do not copy").

**Still pending:** M12/M17/M19 (`easing.json`, `pacing.json`, `sfx.json`) for the 53 Shorts: 0 of 53 on disk. Re-check the `sweep` and `arrive` peaks, and the SFX rule, when they land. Until then the Shorts numbers are board reads at about ±2 f (G1 §6).

## 14f. YouTube v5: the v4 base, with graphics on his words (2026-11-16)

Client notes on v4:
- The pause/play and step-player animations had nothing to do with what he says. Remove them everywhere, along with cursor taps and press UI.
- The lines weren't true to the brand bible and looked random. Remove decorative hairlines: every line must do a job.
- Animations must be new, bespoke to what he's saying, non-repetitive, and help his identity and his point.

**Kept from v4, unchanged:** the cut and his pauses, 1.15x, the audio chain, word-onset captions, the room canvas in brand blues, the calm glass, the Exomind/BTL footage, the Flora glass head and neurons, the 13 sections in his order with their v4 timings (`edit.json` `yt`; one change, s10, below), the A-roll panels and the one keyed shot. v5 is a new composition, `OstadYT5` (`brand/remotion/src/OstadYT5.tsx`). It reuses the v4 pieces (`ARoll`, `Full`, `Keyed`, `YTCaptions`) and the library (`library/`), so v4 still renders as it was. Additive hooks:
- `YTCaptions` takes `hide` (the thesis karaoke is the caption there) and `override` (a canvas phase inside a footage section takes navy captions).
- `Canvas` takes `strip={false}`, which drops the bottom four-colour strip. That was a decorative line.
- `Highlighter` takes `other`, which sets the ink of the words outside the punch: white over footage, while the punch stays ink on ice.

**Removed everywhere:**
- the step player
- every `Cursor`, tap ring and press scale
- the toggle (s2), the unread badge (s4) and the calendar slot tap (s5)
- the "Live" pill and the send button (s6)
- the "Book now" press and "Booked" (s13)
- the s1 coil pulse rings, the s2 drawn skin lines and dotted link, the s9 dashed frontier line, the s12 drawn arrow, the s5 phone outline and the bottom colour strip
- the per-section swish and the per-tick and per-tag pops

Words he doesn't say in this recording are gone from the screen: "Stress" (s10), "Magnetic pulses" (s11), "Prefrontal cortex" (s11) and v4's example question (s6). The v4 "+24 new connections" counter was an uncited number (rule 10). It's replaced by a literal count of the junctions ringed in the clip, labelled as such. BOARD ideas 1, 2 and 5 (stress chain, prefrontal label, sessions) are held back pending the client. Nothing from the reference sites ships literally: each device takes a measured technique only, under the MOTION tokens, with no cursor, hover, marquee, preloader, overshoot or blur entrance.

**One timing change.** s10 runs to 69.9 s instead of 69.4 s, so the "emotions" highlighter (onset 68.94 s, then +1 f, then 16 f) lands and holds before the cut. s11 starts 0.5 s later, still inside "improve" (69.48–70.3 s), and its opening session beat is 0.5 s shorter. The s10 halves are slowed with frame blending to fill the time, and never loop: `stressed2_v5` is one shot (0.09–3.70 s) at 1.401x, and `smile_v5` is the first calm shot (0.05–2.0 s) at 1.261x (`yt_assets.sh`). Scene detection at 0.15 finds no shot change in either.

### Sections, v4 → v5

Offsets are measured on decoded frames of the final render (`edits/exomind-skin/v5/verify_v5.py` → `verify_v5.json`).
- **start** is the frame where the graphic passes 10 % of its change, compared with the token curve started at onset + 1 f.
- **span** is the 10→90 % time, compared with the same crossings of the token.
- 0 means the graphic lands exactly on the word + 1 f and runs on its token.

No two neighbouring sections share a device.

| § | Spoken trigger | v4 device | v5 device (library) | Measured start / span vs token | References |
|---|---|---|---|---|---|
| s1 | "understand" → "Exomind" | name + coil pulse rings | name settles (not tied to a word); "Exomind" arrives on *understand*; **L01** highlighter sweeps on *Exomind*. Hero pop | highlighter 0 / 0 f (`sweep` 16) | Evident Moment A highlighter; newapology `--nap-control-ease` |
| s2 | "mind" → "total skin health" | toggle, skin lines, dotted link, cursor tap | **L06** plate, then the Flora head through it on *mind*; **L05** rolling label "the mind" → "total skin health" on *total*. "Illustration" | plate 0 / +4 f, label 0 / −3 f (probe notes) | march2004 plate-then-picture; newapology §5J media tint; softunion S2 rolling label |
| s3 | (names nothing in the picture) | session, clean | the session, full frame and clean, with a credit only | hard cut | bentleyrawle / lilyballif: let footage be the motion |
| s4 | "giveaway", "email", "phone", "text", "check", "event" | email / phone light-up, unread badge, cursor tap | **L14** "Giveaway winners" typed from *giveaway* (1 char/frame, no caret); literal envelope / phone arrive on *email* / *phone*; chat icon draws on *text*; "Check your text messages" typed on *check*; "After the event" on *event* | typed −1 / +1 f (1 char/f), email 0 / +2 f (`arrive` 14) | Evident B09 typed callout |
| s5 | "appointment", "during", "goals", "history", "appropriate" | phone outline, cursor tap, step player | thread bubbles on the canvas (2nd on *appointment*); **L08** ledger: three rows arrive dim on *during* (2 f stagger), and each gets an ice row wipe and ink on its own word | rows 0 / 0, 0 / 0, 0 / 0 f (`sweep` 14) | newapology §5A cascade; roko-g R8/R9 dim the rest; Evident B15 / Moment C row wipe |
| s6 | "question", "sending", "covered", "love", "hear", "thank", "and" | card + "Live" pill, send, example question, cursor | keyed shot; the glass card holds his phrases, one per spoken phrase, swapped in place; **L01** on "hear about it" at *hear*; the thank-you lines arrive on *thank* / *and* | highlighter 0 / 0 f | newapology §5E copy swap; Evident Moment A |
| s7 | "look", "seeing" | couch shot, card, cursor tap | stressed shot (one shot), then **L09**: the BTL trio film in a card on the room canvas morphs to full frame on *seeing* (`morph` 26 f, radius 24→0); blank-out into s8 | morph 0 / +1 f | newapology §3B View Transition morph; pavlolotnik M6 zoom-to-stage |
| s8 | section start; "this … health" | coil clip + headline and three parts | **L13** blank crossfade (canvas holds 7 f, coil comes in under it over 11 f); **L02** karaoke of "this comprehensive approach to total skin health" on calm glass, word by word on onsets, with the punch ice. The karaoke replaces the captions there | blank 0 / +1 f; each word 0 / 0 f (cut); punch −1 / −3 f | softunion S5 blank crossfade; darkroom one in-out curve; Evident B26 karaoke |
| s9 | "frontier", "care", "beyond", "classic" | dashed frontier line, cursor tap | **L17** ledger built in place: "The next frontier"; face icon + "Caring for the skin" on *care*; on *beyond* the left column dims to 0.6, the divider draws and the brain icon + "Beyond" highlight; "Classic treatments" on *classic* | divider 0 / −1 f (`sweep` 12), Beyond +1 / +2 f | roko-g R8 focus dim + 4 px nudge; georgedavies dimming; Evident R27 split |
| s10 | section cut; "how", "emotions" | split + "Stress" tag, cursor tap | **L23** labelled split, native scale per half (restless night / calm, then the hiker), hard cuts; a centre hairline that divides the halves; "How our emotions" over a soft navy wash, **L01** on *emotions* | hairline +1 / 0 f (from cut + 2 f), highlighter 0 / −1 f | Evident R27 split; lilyballif cut, don't animate |
| s11A | "technology" | leader + pulse rings, "Magnetic pulses", step player | **L07** dim the rest: scrim to 0.45 outside the coil, then the box, the leader and "Exomind coil" | dim 0 / 0 f (`sweep` 12) | kirillkozyrev sheet over dimmed backdrop; georgedavies 0.5 s dimming; Evident G4 T2 annotation |
| s11B | "neuroplasticity" | "Prefrontal cortex" + hairline | **L03** trace on the Flora head: the path sweeps to the ring, which lands on *neuroplasticity*; the leader, then "Neuroplasticity" typed. Hero pop | ring +1 / 0 f (`arrive` 5) | Evident B03 trace |
| s11C | "rewire", "neurotransmitter" | "+24 new connections" (uncited) | **L04** literal count: 7 junctions ringed on the neuro clip at their detected onsets (`junctions.py`), "N junctions ringed in this clip"; "Neurotransmitter production" typed on a frosted plate | typed −1 / −3 f (1 char/f) | rule 10 (cited or absent); Evident B09 |
| s11E | "focused", "flow" | "Focused, in flow" + wave | **L19** words on their onsets; the busy line settles to one wave, ending on *focused* | Focused 0 / 0 f (`arrive` 14) | library L19 (Evident Moment C settle) |
| s12 | "feel", "translate", "better" | drawn arrow | **L21** another voice: her window plate-then-picture (9 px radius), her quote in italic; "Feel better" on *feel*; "translates into better skin" with **L01** on *better*. Hero "yes" | Feel 0 / 0 f; highlighter 0 / +1 f | march2004; @doctor.grove rounded image cards; Evident R14 italic |
| s13 | section start | "Book now" press, cursor, "Booked" | glass card, line-mask rise with a 2 f cascade capped at 10 f: name, "Book a consultation.", "Link in the description.", handle. One card sound | not word-tied | et-al line-mask reveal; newapology case-arrive order |

Probe notes:
- The s2 plate probe measures pixel change, so it counts the picture coming through in the second half too: the 18+18 f plate reads as +4 f.
- The rolling-label probe sees the old word's masked exit, which is fast on outExpo, so it reads short.
- The typed lines are linear at 1 char per frame, so they finish on their own character count rather than at 16 f.
- The s8 punch block measures the karaoke's ice reaching each word in turn, so it is short of a single 17 f sweep.
- Every other probe is within ±1 f on start and ±2 f on span.

### Verify (PROCESS §5), final render

- 90.208 s, 2165 frames, 1920x1080, 24 fps.
- **Loudness:** −14.1 LUFS integrated, true peak −4.4 dBFS, LRA 1.3 LU. No denoise.
- **SFX:** 5 in total, one per hero reveal (s1 pop, s8 swish, s11B pop, s12 yes, s13 card). Each peaks at −38.5 to −48.7 LUFS momentary, against a mix momentary median of −14.1, so the voice is ≥ 24 LU over every sound (rule ≥ 8).
- **Words:** a fresh faster-whisper medium transcript of the render matches 267/268 caption words. The one difference is "in" heard as "and". Onsets differ from the caption onsets by a median of 0.000 s (p10 0.000, p90 0.000).
- **Speed:** 1.1499x (0–36 s, 120 words) and 1.1507x (40–91 s, 133 words) against the cut source.
- **Captions from decoded frames:** 208 of 258 words land at 0–1 f (201 at 0 f), median 0 f. The other 50 land at ±2–3 f. We read those as probe noise from footage motion and a neighbouring word inside the glyph mask, because the transcript check above shows no offset. The captions are hidden 53.80–56.66 s, where the karaoke replaces them, and are navy over the s7 card and s8 canvas phases.
- **Canvas:** hue 215.2° / sat 0.059 (8 s), 215.2 / 0.047 (30 s), 212.3 / 0.047 (35 s), 215.2 / 0.047 (62 s), 215.2 / 0.055 (84 s).
- **Flash scan:** 0 one-frame flashes.
- **Faces:** no v5 graphic rect meets the face box (`faces_raw.json`) in s1, s4, s6 or s9.
- **Stills:** checked for every new graphic. The contact sheet is `edits/exomind-skin/yt_v5_contact.jpg`.

### Open

- **Patient consent:** her window and quote (s12).
- **BTL:** the manufacturer clips need sign-off.
- **AI renders:** labelled "Illustration" on screen (s2, s8, s11B–C).
- **Held back:** BOARD ideas 1, 2 and 5.
- **Couch shot:** the patient-relaxing shot (couch.mp4) was dropped from s7, so the morph stays on one shot.
- **Green curtain:** the Flora coil clip (s8) still has it. A blue Flora re-render is allowed, and was not done here.
- **Type:** still NHG Display 500. Helvetica Neue LT Pro isn't in the kit (14c).

## 14g. ExoMind head track: MediaPipe Face Landmarker + One Euro, for face-anchored arrows and a dynamic face-safe area (2026-11-17)

- **Footage:** `brand/edits/exomind-skin/exomind-skin_cut.mp4` (= `remotion/public/exomind-skin/footage.mp4`, same bytes), 1080×1920, 30 fps, 3027 frames. The older `faces_raw.json` (YuNet box every 0.5 s, no script in the repo) is superseded for tracking.
- **Composition → source:** every use of his footage in OstadYT plays the cut at the edit speed on the global clock (ARoll: Sequence at `at`, `startFrom = round(at·speed·24)`; Keyed: Sequence at `keyed.at / speed`, matte packed from cut time `keyed.at`). So `srcFrame = compFrame / 24 · 1.15 · 30`, interpolated. Rounding of `startFrom` shifts it by ≤ 0.5 comp frame. Layer transforms at rest: keyed scale 0.86 at (0, −150); window 0.5 at (115, 60); panelR 0.8 at (1056, −264); panelL 0.8 at (0, −264).
- **Detector:** MediaPipe Face Landmarker 1.2.3 (`face_landmarker.task` float16, VIDEO mode, 1 face, 478 landmarks + facial transformation matrix) on every frame. Tool: `research/ostad/style/tools/face_track.py` (style venv, `-I`). Coverage **3027 / 3027 frames (100 %)**. No face jump at the cut's cross-dissolve, so no filter reset.
- **Pose signs:** fixed against image geometry (corr yaw +0.99, pitch 0.92, roll 0.99 after the flip). Yaw + = face turned to image right, pitch + = chin up, roll + = clockwise on screen.
- **Top of head:** `headTop = foreheadTop + k·(foreheadTop − chin)`, with k = 0.333 calibrated on the alpha matte (`matte_pha_cut.mp4`, 122 frames, p10 0.312, p90 0.377).
- **One Euro:** min_cutoff **0.1 Hz**, beta **0.03**, d_cutoff 1.0 (px, s; pose in deg). Picked from a 9×10 grid: the lowest high-frequency jitter (second difference on the stillest 1 s, 6.40–7.37 s) whose error against a zero-lag reference (centred gaussian, σ 1.5 f) has median < 3 px, p95 < 7.5 px, and p95 < 10 px on fast moves. That is half the overlay budget (tip-to-landmark median < 6, p95 < 15 px), leaving the rest for the layer transform. Values 0.1–0.3 for min_cutoff are within 0.002 px of each other.
- **Measured (24 named landmarks, source px = 1080 short side):**
  - static jitter frame to frame: median 0.26 px (raw 0.31). The raw is already steady, since VIDEO mode tracks.
  - second-difference jitter: 0.063 px/f² (raw 0.163, −62 %).
  - lag on fast moves (top 3 % nose speed, ≥ 5.6 px/f): 1.0 frame (33 ms).
  - smoothed vs raw: median 2.50 px, p95 6.33 px. On fast moves: median 5.86, p95 10.08.
  - smoothed vs zero-lag reference: median 2.37, p95 5.97.
- **Exports:**
  - `research/ostad/style/exomind/track.json` (committed, 1.1 MB): per frame pose, face box, head box, and 25 named points at 0.1 px.
  - `track_stats.json` (committed): the grid and the numbers above.
  - `track_full.json.gz` (gitignored, 21 MB): all 478 landmarks, raw and smoothed.
  - `track_check.jpg` (gitignored, his face): 12 frames with the mesh, named points and boxes. Checked: points sit on the features, and the head-top dot sits on the hair crown.
- **Helper:** `brand/remotion/src/devices/track.ts`: `useTrack`, `srcFrameAt`, `landmark`, `follow` (gives Markup's `P`), `pose`, `faceBox`, `faceSafeRect`, `intersects`, `LAYERS`. It reads `public/exomind-skin/track.json`, a gitignored copy of the committed file.

## 14h. Device library from the reference study: 79 ids, arrows and text entries measured frame by frame (2026-11-17)

`DEVICE_LIBRARY.md` (DESIGN_PER_BEAT §2) lists every distinct device in the reference study, each with a stable kebab-case id that beat sheets, the builder and `tools/variety_check.py` key on. It has §A arrows (13), §T text entries (19) and §D other devices (47). Built status, from a grep of `brand/remotion/src`: 13 built, 33 partial, 33 never.

- **Timings are 24 fps.**
  - Measured values come from `easing.json` / `text_elements.json` / `graphic_elements.json`, via the new `tools/device_stats.py` → `measure/_devices/entry_stats.json` (committed: JSON only).
  - Others are frame counts off the reference sheets (G1–G4, DDOS read files), or new frame-by-frame crops.
  - Anything only seen on a sheet is marked E (estimated).
- **Corpus norm (text):**
  - rise: 11.2 f, 4.2 % H (n 2,187)
  - side slide: 9 f
  - scale pop: 5 f
  - type-on: 5.6 f
  - Overshoot shares are upper bounds (OCR jitter). No frame-counted entry overshoots.
  - Our `arrive` (14 f, 1.5 % H) travels a third as far. `settle` (48 f) is slower than any reference text entry, so word-tied lines should never use it.
- **Arrows:**
  - No reference uses a dot-plus-line as an arrow. The headed arrows found are a curved callout, dashed flow, straight pointer, zigzag trend, arc connector, glyph delta, light ribbon, orbit arcs, hand-drawn, marker ticks, route trace and elbow connectors.
  - The head always lands on the last draw frame, with no overshoot (GMu3 7 f, WZ 7 f, GRM 10 f, D_bh 26 f).
  - Only the ribbon and orbit arcs keep moving while held. That is the model for our "alive" hold.
- **Sheets:**
  - `exomind/ref_arrows.jpg` and `exomind/ref_type_entries.jpg`, made with the new `tools/ref_device_sheet.py` from `tools/sheet_specs/*.json`.
  - They are crops of other creators' footage, so they stay gitignored: `research/ostad/style/exomind/ref_*.jpg`. That rule landed in 9419ccf together with the head-track lines, because both agents edited `.gitignore` at the same time.
- **ExoMind shortlist** (10, in the file):
  - phone-message-arrives
  - intake-form-fill
  - timeline-markers
  - region-light-on-model
  - arrow-orbit-arc / arrow-light-ribbon
  - flow-diagram-build with real arrows
  - mechanism-on-real-image
  - portrait-pip-circle
  - chapter-title-card + wordmark-depth-sandwich
  - radial-leader-callouts
- **Not done:** the Are.na connected channels stay context, not corpus (DEC 6). Not every one of the ~2,900 sheets was opened. Devices come from the read files' catalogues (which were read sheet by sheet), plus new looks at the GLP-1 ad, Ro, the three single posts, grove, drjc, colin and all 56 Are.na blocks.

## 14i. ExoMind YouTube v6 design: beat sheet, translation table, usage audit, and the three check tools (2026-11-17)

Design and tooling only; nothing is built or rendered here. Files: `exomind/BEATS.md`, `exomind/beats.json` (generator `tools/gen_beats_exomind.py`), `exomind/TRANSLATION.md`, `exomind/USAGE_AUDIT.md`, `tools/variety_check.py`, `tools/reuse_check.py`, `tools/lint_compositions.py` (+ `tools/lint_fixtures/`).

- **Format:** 16:9 at 1920×1080, the reviewed edit, not EXOMIND_REDO's 9:16 (RUN_BRIEF). Pixel thresholds written for 1080×1920 keep their values on the 1080 short side, so they are stricter.
- **Time base:** composition frames at 24 fps on the 1.15× edit (comp s = cut s ÷ 1.15, as `OstadYT.tsx` plays the cut; 2166 f). Every reveal sits on word onset + 1 f.
- **Beats:** 20, plus a title card (B01), 4 section cards (01 Your questions f263, 02 Before you go f893, 03 Total skin health f1242, 04 The technology f1710) and an end card. The section turns follow the script: thanks/thesis, next steps, sign-off, the vision, the mechanism.
- **Section cards are structural** (like captions): one look (`chapter-title-card`, 30 f beside keyed Ostad, who keeps talking). They are excluded from the device-repeat count, because "a card at every turn" and "no device more than twice" can't both hold otherwise. `variety_check` R8 checks they exist and share one look.
- **Variety:** 30 distinct devices, each used once. 12 never built. 13 entries, none consecutive. Text-only 2/20 (B01 title, B14 "the next frontier"). The "1 in 5" rule is checked as both the share (≤ 20 %) and a rolling window (≤ 1 in any 5 consecutive beats). B10 was moved off text-only (ledger rows carry thumbnails) so B10 and B14 don't fall in one window.
- **Redesigns made while writing:**
  - B20 was first a second flow diagram (same tile as B03), then a ribbon on a model portrait (same as the first B16). Now B16 is a ribbon round *his* head (head-tracked, behind him via the matte) and B20 a zoom-box inset on a portrait.
  - B14 was going to be a giant word behind him (same tile as the B01 title). It is now a decode.
- **ExoMind-only animations (4):** field-through-skull (B17, after GOLD 53–59 s), rewire-trace (B18, MOA 59.0–60.6 s), pulse-train-synapse (B19, the gut-panel method by addition), session-timeline (B12, over IMG_3714).
- **Gold pick:** k4lEDTVCb0U *does* exist locally (`refs/motion/exomind/`, topic file `refs/shots/exomind.md`). Read at 50–62 s (2 fps sheet, scratchpad): neurons with travelling orange signals 50–52.5 s, the glass-head silhouette 52.5 s, the applicator descends 53–56 s, the cyan field under the coil 56.5–59 s, motion-blur push 61.5 s. B17 rebuilds that sequence in our palette. The MOA film (151 s, 25 fps) was read on a 1 fps sheet: neurons 35–46 s, coil on head 47–55 s, pulses reactivating a neuron 56–63 s. Its burned-in subtitle band (mentions OCD) is hidden under our caption band.
- **Compliance placement:**
  - The disclaimer is on B03, B13 and B20, where the mind–skin link is drawn.
  - The MOA label is on B17–B19.
  - B02's chip says "FDA-cleared: major depressive disorder" ⚠.
  - The brochure FAQ headings (not answers) fill B09's question box.
  - Session length shows as "about 20–30 min" ⚠ until the client settles brochure "< 30" vs practice "≈ 20".
  - v4.1's "+24 new connections" (no source) is dropped.
- **SFX:** one typed sound per beat on its hero reveal (`sfx_hero`), per MOTION M19 (per-graphic SFX measured at chance: 60 % vs 59 %). The other listed events are optional at −12 dB.
- **Presentation:** Ostad keyed on the cream canvas, left third, on 16 beats. He steps out only for full-bleed: B04 (he is in the consult footage), B12 (pip circle), B17 and B18 (out). The keyed source must cover the whole cut (`matte_*_cut.mp4`); v4.1's `presenter_k.webm` starts at cut 42.4 s.
- **variety_check.py:** 12 rules (DESIGN_PER_BEAT §3 plus cards, presentation, overlap, compliance labels, arrow backing). It reads ids and built status from DEVICE_LIBRARY.md (79 ids), not from the sheet. `--selftest` breaks each rule once: 12/12 fire. On beats.json: PASS.
- **lint_compositions.py, dot-and-line:**
  - Built from the patterns we shipped: YT `Callout` (5 px dot + pulse ring + straight stroke), OstadYT `Lead` / `HeadNotes`, the v4.1 S2 bead on a bezier, kit `Thread` (bead) and `Lead` (dot), Markup `Ring` (riding tip dot + headless leader), `Pin` (div dot + leader) and `Callout` (headless leader), and v5 S11B (open ring + headless line).
  - Imports are resolved, so a banned component fails where it's used.
  - Arrowheads count only structurally (marker, polygon, `data-arrowhead`, 3-point chevron). A first version accepted the word "head" and let v5 pass on `head_final_anim.mp4`; fixed.
  - **OstadYT.tsx (v4.1): FAIL, 10 violations** (DOT1 ×2, DOT2, DOT3, LEAD, USE ×5).
  - Also failing: kit.tsx (4), Storyboard.tsx (36), Markup.tsx (5), OstadYT5.tsx (2), OstadReel.tsx (1, via SkinCard → Ring), TraceOnFootage.tsx (1). These are older files and are left as they are. The rule binds new compositions.
  - Clean fixture: PASS. `// lint-ok: <reason>` waives non-callouts (e.g. vesicles) and prints the reason.
- **No static image: frame diff on the render, chosen over a render-time helper.**
  - A helper only proves the code *asked* for a transform. A frame diff proves the pixels moved, and it also catches a transform that is non-zero but invisible.
  - Mode `--static-image RENDER --beats beats.json`:
    - (a) every image asset in beats.json needs an `image_layers` box and span;
    - (b) each layer's crop is sampled every 4 f between the end of its `arrive` and the start of its `exit`, and fails if the max mean-absolute grey change against the first sample is below the threshold.
  - Calibrated at render settings (crf 16): a still re-encoded = 0.02 grey levels; a 1 % zoom over 48 f (the gentlest drift on the sheet) = 1.56; threshold = their geometric mean, **0.16**.
  - Synthetic test: static half FAIL (0.00), 2 % zoom half PASS (5.61), image without a layer FAIL.
  - Known limit: a moving overlay inside a static photo's box would mask it. Boxes in beats.json are the photo's own rect, so the builder keeps captions and chips out of them, or narrows the box.
- **reuse_check.py:** pHash + dHash on each beat's graphic crop (never a face-dominated frame) against 106,225 window hashes of every earlier edit (rosacea v5, YouTube v2 / v3 / v4 / v4.1 / v5, the ExoMind reel, the storyboard stills), sampled every 0.25 s.
  - Each sampled frame gives the full frame, three window grids, the v6 crops (`--build-bank --beats`), and same-geometry window matching.
  - **Threshold 0.107 (distance 0–1), calibrated on the decision itself.** A first pair-based calibration (identical p99 0.125 vs different p1 0.344, threshold 0.226) was too loose. The check takes a *minimum* over ~100k windows, so unrelated content gets far closer than one pair suggests: known-new Ro frames reach a nearest of 0.10–0.13. Calibrated instead: earlier-edit frames off the sample grid, re-encoded at JPEG q35, have a nearest-distance p99 of 0.083 (max 0.156); 96 known-new frames from 8 Ro videos have p1 0.131 (median 0.258). Threshold = the midpoint.
  - Known pairs:
    - v4.1 key frames at the v6 beat times: **20/20 FAIL**, all at 0.000. An early version without same-geometry windows missed 2 of them (B12 and B16 crops at 0.25–0.29), now fixed.
    - Gold-pick frames: 20/20 PASS. The nearest are 0.156–0.188, and these are true near-relatives: v2 / v3 / v5 used other frames of the same BTL films (checked side by side). A different frame of licensed footage isn't a reused graphic, so PASS is the intended call.
  - The bank (`measure/_reuse/bank.npz`) is gitignored and rebuilt from local renders. `calibration.json` is committed.
- **Not done here (builder's part):** Arrow.tsx, the type system, OstadYT6, stills and render; the confirmed column of USAGE_AUDIT; tracking error and face-overlap measures; evolution_sheet.jpg.

## 14k. Arrow system and type-entry system: devices/Arrow.tsx and devices/TypeEntry.tsx, measured against the references (2026-11-17)

These replace the dot-and-line callout and v4.1's single 48 f fade-up (EXOMIND_REDO §3 "Arrows", DESIGN_PER_BEAT §4–5). Usage is in `brand/remotion/src/devices/README.md`. The proof is in `exomind/ARROW_TYPE_PROOF.md`, with the raw numbers in `exomind/arrow_type_proof.json`. Both were measured by `tools/arrow_type_proof.py` with the reference method (graphic_track boxes and opacity, easing_fit.fit_track) on renders of the new `ArrowTypeLab`.

- **Variants.** 9 in all: the 8 that beats.json names (curved-callout, straight-pointer, route-trace, arc-connector, dashed-flow, light-ribbon, orbit-arc, marker-tick), plus bracket-pointer from the EXOMIND_REDO list. Bracket-pointer has no corpus reference, so it borrows the callout's 7 f.
- **Shape.**
  - Every arrow is a filled, tapered outline: it grows from the kit `rule` (1.5 px) at the tail to 2 × `hairline` (4.62 px, 0.43 % H, inside the references' 0.3–0.5 % H). The default colour is tokens `color.text`.
  - Heads come from the brand shape vocabulary:
    - an open V of two tapered rules (`rule_h`);
    - or a solid triangle with corners rounded at the `rounded_rect` ratio (27.9 % of the short side, shapes/CATALOGUE.md).
  - Head size is 6 × weight.
  - Dashes keep the kit dotted-path proportions scaled to the weight: dash 2.16 ×, gap 2.01 ×.
  - Straight-pointer is solid, although its reference is dashed. Dashes stay for flow and connector arrows, where they mean "a path". The taper is the brand's look on a single pointer.
  - No `<circle>` anywhere. Every head carries `data-arrowhead`.
- **Overshoot vs "small overshoot and settle": resolved by measurement as no overshoot.**
  - None of the 13 reference arrows overshoots (DEVICE_LIBRARY §A).
  - Ours draw tail→tip on `sweep` over the reference frame count. The head grows over the last 22 % of the draw and lands on the last draw frame: measured at f+7 / f+7 / f+8 for the 7 / 7 / 8 f variants.
  - Apex overshoot is 0.0 px. **Frames to settle after landing: 0** (1 for route-trace, which is ink settling at a join, not head motion).
  - The "settle" the brief asked for lives in the hold instead: the shaft interior breathes ≤ 1.5 px on a 72 f period, with tail and tip pinned.
- **Alive while held, and following.**
  - Ribbon: travels one loop per 96 f.
  - Orbit: drifts ±4°.
  - Tick: bobs 1 px.
  - Every point is a PtSrc. A curved callout with `to = follow(track, "templeL", LAYERS.keyed)` measured a tip error of median 2.97 px and p95 3.15 px (cap included), against the spec's median < 6 and p95 < 15.
- **Exit.** On the `exit` token (7 f): the tail erases, or the tip retracts for the straight pointer, the ribbon rides on, and the tick fades and falls. The largest one-frame ink drop is 20–34 %, so nothing is cut.
- **Arrows, measured against the references.**
  - Matched: curved-callout, straight-pointer, bracket-pointer and dashed-flow each draw in 7 / 7 / 7 / 8 f against 7 / 7 / n.a. / 8, and marker-tick pops in 1 f against 1.
  - Arc-connector: 24 f against 26.
  - Route-trace: 30 f by ink mass against 27. The overrun is the hold breathe inside the 1 % band; the head lands at f+26.
  - Orbit: 11 f against 8–10 (E).
- **Type entries: 14 ids, every §T id that beats.json uses.**
  - They cover at least 7 distinct mechanics: rise family, wipe/box, lighting, character-level, plate + lines, arc fan, letter exit.
  - Each is tuned until our render measures the reference: settle in frames, visible travel in % H, 0 overshoot (table in ARROW_TYPE_PROOF).
  - Two findings drove the tuning:
    1. An ease-out moves text most of its path before it is legible. So nominal travel is set to give the reference's *visible* travel (rise 5 % → 4.17 % measured against 4.2 %).
    2. Box-slam pops on whole, then moves, as the reference does ("pops white"). That gives 7.27 % against ≈ 7 %.
  - `wordTimes` are composition frames. A word reveals at onset + 1 f (MOTION §1.2), and `wordFrames()` converts `yt_words.json` seconds.
- **F04 "check your texts" rebuilt on the word onsets.**
  - Each word's first ink comes onset + 2 f and it settles at + 4–5 f.
  - v4.1 started 27 f before "check" and settled 10 f after it.
  - The B06 message card lands its plate on "check".
- **Font.** TypeEntry inherits the YT `DISPLAY` face (the type pairing is the builder's call, 14j) and takes any `style`.
- **Sheets.** `exomind/arrows_vs_refs.jpg` and `type_vs_refs.jpg` hold our frames next to reference crops, plus v4.1 frames. They are gitignored like `ref_*.jpg`, and `git check-ignore` was run before the commit.
- **Lint.** `tools/lint_compositions.py` passes on Arrow.tsx, TypeEntry.tsx and ArrowTypeLab.tsx (0 violations).
