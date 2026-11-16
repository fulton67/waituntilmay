# Evident YouTube Shorts, group 2 (13 videos), read board by board

This read adds to the baseline `read/ig_Ddos1QZRGmV.md` and does not replace it. Each section says whether a finding **confirms**, **refines** or is **NEW** compared with that baseline.

**Sources.** All 44 reading boards in `sheets/evident_yt_shots/<id>_N.jpg` were opened: 47nF 2, 9LOa 1, CfyG 3, ETSQ 4, GMu3 4, H2fP 4, IRlm 3, k--at 3, LSuT 3, NxPg 3, tKaD 4, uxfg 4, yh4l 4. That is 1,739 tiles. Every board's tile count matches its `.txt` header except k--at20pXkY: the header says 110 tiles and the boards show 109.

**Measurement files used:** cuts, loudness and transcript (with word timings) for all 13 videos, plus probe.json. Pixel timings come from ffmpeg decodes made with the scratchpad scripts `evyt2/moment.py` and `evyt2/strip.sh`, with output in `evyt_frames_2/`.

**Missing files:**
- `pacing.json` and `sfx.json`: missing for all 13.
- `palette.json` and `camera.json`: present only for 9LOa, CfyG, k--at and LSuT.
- `text_elements.json`: present only for 47nF.
- `graphic_elements.json`: missing for tKaD, uxfg and yh4l.
- `tone_hue.json`: missing for tKaD, uxfg and yh4l.

**Frame rates vary.** The videos are not all 30 fps. They run at 23.976 fps (9LOa, CfyG, ETSQ, GMu3, IRlm, LSuT), 25 fps (H2fP, k--at, tKaD, uxfg) or 30 fps (47nF, NxPg, yh4l). All frame numbers below are in each video's own frames, 0-based, and seconds are computed with the real fps.

**Tile categories:**
- P: presenter (Evident's own reporter)
- I: interviewee
- F: footage or archive
- A: footage with annotations drawn on it
- G: designed graphic (charts, maps, diagrams, cards, screen captures of Evident's own database)
- D: document or headline crop, real or recreated
- E: end card

---

## 1. Per video

"Ideas" is an estimate: hard-cut shots plus the in-place reveals counted on the boards, about ±20%.

### 47nFp7meG6A: "Arming the Pacific" trailer (US vs China military)
- **Basics:** 55.0 s, 30 fps, 27 hard cuts, median shot 1.87 s, about 1.8 s per idea, 1.64 words/s.
- **Tiles (60):** P 3, I 7, F 45 (75%), G 0, D 0, E 5.
- **What it is:** a footage montage. The only graphic is the opening title, "Are the U.S. and China on a collision course in the Pacific?", set in stacked lime boxes over helicopter footage (frames 0-56), plus an end CTA in the same lime boxes (1492-1650).
- **Captions:** this is the only video using a small grey-box caption with mono-style lowercase type (for example frame 383).
- **Instructive moment:** none beyond the title card. This is a trailer and has no explanation.

### 9LOajbWUksI: "Tracking dangerous truck drivers" trailer (CalMatters partner)
- **Basics:** 41.2 s, 17 cuts, median shot 1.96 s, about 2.1 s per idea.
- **Tiles (44):** I 12, F 20, D 3, E 9.
- **Moment, frames 89→132, "he killed somebody":** a DMV record crop on black is pushed in three times in steps (89, 109, 132). On the third step a lime block lights "VEHICULAR MANSLAUGHTER" in monospace type.
- **Bug:** a co-brand bug, the CalMatters pen icon, sits beside the Evident "E" roundel on every frame.

### CfyG_kPbouA: the commercial-driver database walkthrough
- **Basics:** 98.2 s, 13 cuts, median shot 5.32 s, about 3.3 s per idea.
- **Tiles (102):** I 47, G 10, D 33, F 3, E 9.
- **Moment 1, frames 187-299, "135 commercial drivers … 61 of these drivers":** a grid of 135 blue person icons builds on a blurred dark canvas (187-233). On "61" (word onset f287) the bottom 61 icons **flicker on** in lime: dim green at 290-291, lime at 292, dim at 293-295, lime at 296, dim at 297-298, lime from 299. That is a 10-frame strobe entry, starting +5 f after the word. **NEW:** the baseline only has smooth fills.
- **Moment 2, frames 340-377, "more than 40%":** "45%" types on in white (first digit at 340, +7 f after "40%" at f333). A lime block then wipes in behind it from left to right over 352-377 (25 f), and the text flips dark. A defocused giant "45" sits at the bottom of the frame as a depth echo.
- **Moment 3, frames 492-1400, his ticket history:** the DMV record sits on a dark, blurred copy of itself. One lime row lights per date he reads: "December of 2022" lights over 592-606, +14 f after "December" (f578). The record is pushed in in steps at 880 and again at 1173. The rows stay lit, so the highlights add up: 4 rows by 1400.

### ETSQdtiNJjg: Bellingcat × Evident, "Agent EZ-17 fired 5 times"
- **Basics:** 177.1 s, 60 cuts, median shot 1.84 s, about 1.95 s per idea.
- **Tiles (197):** P 22, F 61, A 19, G 67 (34%), D 24, E 4. This is the most graphic-heavy video of the group.
- **Moment 1, frames 63-148, "fired a less-lethal launcher … five times":** a lime hairline box draws around the launcher (63-86, starting −6 f before "launcher" at f69) with the label "B&T GL06 40mm less-lethal launcher". The rest of the frame dims. Five lime leader lines then fan out from the box to five thumbnails of the five shots (102-148). The number "five" is shown as five pictures.
- **Moment 2, frames 642-708, "analyzed each of these five shots":** a 2+2+1 grid of thumbnails, each with a green numbered badge (1-5). It is rebuilt at 1542-1776 with the munition render and only shots 2-3 lit. It is the video's index, and it returns as the story moves forward.
- **Moment 3, frames 1034-2735, the map:** a Google Earth satellite map with a white pin and the typed label "Renee Good shot and killed by ICE agent" (1054). Each shot's clip drops onto the map as a rounded window next to its numbered pin: shot 1 at 1100, 2 at 1830, 3 and 4 at 2328-2352, 5 at 2554-2643. The window grows to near full frame, and inside it a lime outline is drawn around the agent ("EZ-17" at 1238 and 1873). **NEW:** footage anchored to a map position.
- **Moment 4, frames 3106-3540, "agents may only use … objectively reasonable":** the DHS policy page is dimmed, except for one sentence lifted out on a white strip. Lime highlights then add up phrase by phrase as she reads: "safe, and feasible alternative" at 3241, then "objectively reasonable" at 3379. The CBP page follows the same way with "intentionally target" and "the head, neck" (3448-3540).
- **Also in this video:** a face box with the name label "CBP Commander Gregory Bovino" (974-1020); munition cutouts ("MUZZLE BLAST" 1542, "SKAT SHELL" 2913) with leader-line labels; projectiles circled on footage with the label "Three projectiles" (2815-2884); an LA Times headline rebuilt as type with "blinded" highlighted in **blue**, not lime (3632).

### GMu3uTEDzn0: "Vulture funds" (Argentina)
- **Basics:** 148.3 s, 43 cuts, median shot 2.61 s, about 1.95 s per idea, 3.30 words/s (the fastest speaker in the group).
- **Tiles (161):** P 60, G 53 (33%), F 24, D 20, E 4.
- **Moment 1, frames 383-1042 (27 s), "This is how it happens":** a **full-bleed lime canvas** (#DBE762). **NEW:** the baseline canvas was charcoal. On it sit an Argentina silhouette, an "INVESTOR" label, dashed arrows, $ coins, and a "Bond" with "+$" coins. The camera pans and pushes between the actors (587 into Argentina, 608-674 over to INVESTOR). Speech bubbles appear on cue: "Sorry, we can't pay" (697), then "Fine… who wants this for half off?" (766). A cut-out vulture photo flies in with "We'll take it." (904), and a blue "HEDGE FUND" tag lands on "pennies on the dollar" (973). It is an explainer diagram that builds in place across 27 s.
- **Moment 2, frames 1290-1402 and 2384-2460:** a "court screen" device, a blue rounded CRT-style window (#243FCB) that types the case caption. A box lights "NML CAPITAL LTD / Plaintiff" and "THE REPUBLIC OF ARGENTINA / Defendant". It is reused for Panama (2425) and Brazil (2440), where only the highlighted party changes.
- **Moment 3, frames 1613-1748, "spent $177 million and made $2.4 billion":** a small hatched box "-$177 mil" grows on "spent", then a giant dark block "+$2.4 bil" towers over it. The comparison is by area.
- **Moment 4, kinetic words over the presenter:**
  - "Bonds" (box sweeping in about 347; the box's pixel onset could not be separated in the decode, so this is from the board)
  - "$4.6 billion" (pops 1517-1519, +2 f after "4" at f1515)
  - "Champerty" (pops 2618-2620, −4 f before the word at f2622)
  - then the definition, "You can't buy someone's debt just to sue them for it.", lit word by word over her (2651-2697)
- **Bookend:** none. Tiles 0 and 23 show a vulture photo cutout landing on her head on "vulture funds".

### H2fPpDGMkHo: "Aristide and the US" (Haiti)
- **Basics:** 165.5 s, 25 fps, 54 cuts, median shot 2.36 s, about 2.4 s per idea.
- **Tiles (170):** P 55, F 72 (42%), A 8, G 7, D 23, E 5.
- **Moment 1, frames 52-156, "the US accuses a president …":** archive photos turned to blue duotone. The subject is cut out with a lime outline and his face is replaced by a black "?" disc. The man is kept anonymous until his name is said, and the device works as a teaser. **NEW.** It returns as a **bookend** at 3927-3949 on "U.S. business interests".
- **Moment 2, frames 303-372, "This is the story of Jean-Bertrand Aristide":** his archive photo with the background defocused and a soft lime glow outline around him, so the subject is isolated from his surroundings.
- **Moment 3, frames 580-660, "baseballs … Sesame Street stuffed animals":** product photos (a Rawlings ball, a Knickerbocker tag) with a lime box around the printed word "HAITI". The proof is circled on the object itself.
- **Moment 4, frames 807-974 and 2878-2950:** NYT and WaPo crops with lime highlights, and a CRS quote set over a blue-duotone photo with "will not provide aid" lit (2895-2903, +1 f after "Haiti" at f2894, +12 f after "aid").
- **Quoted speech:** archive speech (Aristide at 1044-1363 and 3326-3498) is captioned in **pale-yellow text** in the normal black box. The text measures RGB 238,245,160 at f1100. This refines the baseline, where quoted speech was set in italics.

### IRlmBwkxcRI: "ICE detention tracking" (Evident's own database)
- **Basics:** 109.9 s, 31 cuts, median shot 2.96 s, about 2.2 s per idea.
- **Tiles (120):** P 35, G 37 (32 of them screen captures of Evident's own database), F 33, D 6, A 5, E 4.
- **Moment 1, frames 91-295, "This map from our new investigative database":** a screen capture of Evident's own interactive map (red bubbles, filter chips), pushed in slowly. A mouse **cursor** is visible at 718. This is the only "UI" in group 2, and it is Evident's own real product.
- **Moment 2, frames 698-884, "Romulus … 500 immigrants":** the map zooms in and a tooltip opens ("Romulus Warehouse, 500 beds, Planned"). It hard-cuts to a satellite view with a red pin (795), on "flood plain".
- **Moment 3, frames 970-1059, "DHS could not have picked a worse location":** a typed quote card (rebuilt as type). The lime highlight on "worse location" runs over 1027-1042, which is **ahead** of the spoken "worse" (f1059) by 17-32 f. This is the main exception to word-sync in the group.
- **Moment 4, frames 1103-1884:** local TV news clips (WDIV, WJZ, KCTV, WANF) kept with their chyrons and station bugs. The pushback evidence stays in its original packaging.

### k--at20pXkY: "Mail-in ballots" (Pennsylvania Capital-Star partner)
- **Basics:** 101.6 s, 25 fps, 30 cuts, median shot 2.76 s, about 1.9 s per idea.
- **Tiles (109):** P 29, F 27, G 7, D 41 (38%), E 5.
- **Moment 1, frames 188-335, "vote totals … can dramatically change":** a 100% split bar (blue vs red) labelled "*ILLUSTRATIVE EXAMPLE". The hours counter steps through 16, 34, 53, 71, 88 and 108 h, the split moves at each step, and the **canvas tints toward whichever colour leads**: red tint at 235, blue at 310. **NEW:** a time series shown in a single bar.
- **Moment 2, frames 403-575, 849-1021, 1288-1460:** four outlet headlines rebuilt as type on dark. Each one types on (403→425), then lime phrases light in order. For example, "millions of uncounted mail ballots" over 430-444 (14 f), starting +4 f after "results" (f426).
- **Moment 3, frames 1884-2060, "received by your county, not just postmarked … 8 p.m. to be exact":** a real web article. A **progressive highlight** follows the narration line by line ("Ballots must be received by the county board of elections by 8 p.m."), one highlighted fragment per caption chunk, over 9 tiles. **NEW** in this form: the baseline lit one phrase at a time.
- **Captions:** the president's quote on rally footage is captioned in **italics** (641-713), which confirms the baseline's italic switch.

### LSuT_8L5Pb0: "Puerto Rico is a colony" (Oversight Board)
- **Basics:** 140.8 s, 34 cuts, median shot 2.88 s, about 2.0 s per idea.
- **Tiles (150):** P 53, G 54 (36%), F 17, A 9, D 11, E 6.
- **Moment 1, frames 23-115, "a territory … commonwealth … I call it a colony":** a hand-drawn outline of Puerto Rico floats above her head. Its label swaps on each word: "TERRITORY?" (46), "COMMONWEALTH?" (69), "IS" (92), then "COLONY" with the outline flooding lime (115). **NEW:** a doodle label that changes in place.
- **Moment 2, frames 141-400, "the people who have the last say … can't vote for either":** a lime-canvas pictogram. An island silhouette, $ coins rising from it, taxpayer icons, a vote-box roundel, and a dotted chain up to "US PRESIDENT", with a second vote box crossed out (377). The same canvas family as GMu3.
- **Moment 3, frames 1148-1320, "closed schools / halved university budget / privatization of electricity":** **a split screen of two stacked clips**, with a lime-highlighted label typed across the seam for each list item. Three items get three split screens. **NEW.**
- **Moment 4, frames 2341-2660, "negotiate … from $17 billion to almost $12 billion … $32 billion over 40 years":**
  - a dark bar "$17.5 bil*" grows
  - the cut part turns **hatched** and drops away, leaving "$11.9 bil"
  - a new bar rises on "when you add interest" to "$32 bil 2056"
  - the added part has a noise texture
  This is one bar used for the whole argument. Bar fill #343620 on lime #D2E34F.
- **Other charts:** a line chart (ranking 15th→191st, 1544-1633), a number line (median income vs poverty line, 2932-3021), and $370m vs $2bn hatched bars (1918-2076).
- **Kinetic over presenter:** "$72 billion" pops at 537 (−3 f before "$70" at f540) and "$307 million" at 2228 (0 f, on "$300" at f2228). Both pop in 2 f.
- **Closing quote, frames 3169-3235:** set large over a dimmed text page, and "Puerto Rico will continue to be bled" is lit.

### NxPgjEsvE6s: "States' vaccine alliances" (on location in DC)
- **Basics:** 103.4 s, 30 fps, 18 cuts, median shot 3.33 s, about 2.7 s per idea.
- **Tiles (104):** P 13, I 21, F 23, G 41 (39%), E 6.
- **Moment 1, frames 636-1533, "two groups of states … Washington, Oregon, California, and Hawaii … all New England states minus New Hampshire":** a dark CARTO basemap with state borders. The West Coast fills **blue** (#2A3C91) over 994-1007 (13 f) on "September … the West" (f992-1016). The camera then travels south, and each state's label is typed as it is named: WASHINGTON at 1053 (word f1064), OREGON at 1083 (f1091), CALIFORNIA at 1113 (f1119). Hawaii gets a **circle callout** inset on "Hawaii" (1143, word f1145). The Northeast fills **green** (#45684D) and its labels are added as she names them.
- **Moment 2, frames 1577-1844, "one in three Americans":** both regions shrink to the top. Three person icons rise, and one turns lime over 1659-1674 (+3 f after "live" at f1656, +41 f after "one" at f1618). "1 in 3" sits underneath.
- **Captions:** the interviewee (a Zoom-style capture) is captioned in yellow italics (1884+).

### tKaDa5L4OLw: "Unpublished UN report, Mozambique" (Forbidden Stories partner)
- **Basics:** 160.3 s, 25 fps, 44 cuts, median shot 2.64 s, about 2.8 s per idea, 2.14 words/s (slow).
- **Tiles (164):** P 30, I 30, F 49, G 29, A 3, D 18, E 5.
- **Moment 1, frames 99-121 and 1699-2021, "this region in northern Mozambique … Mozambique LNG … TotalEnergies":**
  - a green outline map of Mozambique
  - zoom to "CABO DELGADO" (691), with the region lifted in a pale outline
  - dissolve to satellite
  - a yellow ring marker with the label "Mozambique LNG facility" (1796)
  - the TotalEnergies logo lands above it (1946) on "TotalEnergies"
  It is one continuous zoom from country to compound across 13 s.
- **Moment 2, frames 279-326:** the partner's wordmark ("forbidden stories") gets a red box on "Forbidden Stories".
- **Moment 3, frames 2168-2315:** a Politico headline rebuilt as type, with "atrocities" lit over 2210-2229 (+1 f after "revealed" at f2209; "atrocities" itself is not spoken).
- **Anonymisation:** faces are covered with **grey discs** on soldiers (2338-2451) and blurred on survivors (1277-1324). **NEW.**
- **Bug:** a co-brand bug, Forbidden Stories' red "I", sits beside the "E".

### uxfgQPhLXTI: "Is AI really replacing workers?"
- **Basics:** 167.5 s, 25 fps, 22 cuts, median shot 5.56 s, about 4.2 s per idea. This is the slowest video in the group.
- **Tiles (169):** P 56, I 46, G 29, D 32, E 6.
- **Moment 1, frames 142-239:** a question card typed on dark, with "replacing" and "excuse" recoloured lime as **text colour, not a block** (173-194, −1 f before "replacing" at f174). **NEW** variant.
- **Moment 2, frames 267-390, "a recent survey of executives":** company logos (Amazon, UPS, Microsoft) appear one at a time in blue roundels over blurred footage.
- **Moment 3, frames 540-815, "most companies polled … almost a third … only 2%":** a pie chart (60% lime, 29% green, 2% sliver). As each share is spoken, the **other slices dim**: the 60% slice drops out at 752, +4 f after "third" at f748. **NEW:** a pie with a spotlight.
- **Moment 4, frames 1665-3242:** the interviewee's Zoom capture sits in a window on dark, while brand strokes (a lime arc, cream bars, a blue slash) drift in and out at the corners (for example 1812-2137). This is decorative motion taken from the end-card system.
- **Moment 5, frames 3746-3943:** a real Pew chart crop. The caption chunks themselves sit over the chart and are the only things that move.

### yh4lQqZtcHc: "Deaths in ICE detention"
- **Basics:** 173.1 s, 30 fps, 55 detector cuts.
- **Strobe artefacts:** 17 shots are under 0.5 s, and most are false cuts from police strobes and flashlights at 4433-4804 (the tiles show one continuous shot with "CUT" labels at 4446, 4455, 4478 …).
- **Pacing:** median shot 2.28 s, about 2.7 s per idea.
- **Tiles (189):** P 36, I 20, F 59, G 20, D 49 (26%), E 5.
- **Moment 1, frames 97-338, "95 percent of deaths … preventable":** the ACLU quote sits on a rounded white card. Lime highlights add up phrase by phrase: "95 percent were preventable", then "if appropriate medical care had been provided".
- **Moment 2, frames 383-650, "nearly half … within a month … six … within one week":** a grid of person icons ("DEATHS IN ICE CUSTODY 2025 YTD"). A box frames the "within one month" group and fills green (440). It then narrows to "within one week" in lime (620). The same grid returns plain at 1906 for "31 deaths".
- **Moment 3, frames 3308-4085, the DHS statement:** a phone screenshot of the email. A **karaoke highlight** follows the reading across about 26 caption chunks ("ICE takes its commitment to …" → "constant watch"). This is the longest highlight sequence in the group, at about 26 s.
- **Windows:** social videos sit in rounded windows with a **lime hairline border** (1094, 4289, 4608), each credited "X / @handle" or "TikTok / @MiamiHerald".
- **Captions:** the second caption style (grey translucent box, mono-style lowercase), shared with 47nF.

---

## 2. Technique catalogue (group 2)

Counts are instances seen on the boards. "Baseline" refers to `ig_Ddos1QZRGmV.md`.

| # | Technique | Count (videos) | Example frames | Spoken trigger | Enter / exit | Timing vs word | vs baseline |
|---|---|---|---|---|---|---|---|
| T1 | Lime highlighter block on a document or headline phrase; text flips dark | ≈48 (12 of 13; not 47nF) | 9LOa 132; CfyG 592; ETSQ 3241; H2fP 2895; k--at 430; tKaD 2210 | the phrase, or the claim it proves | left-to-right wipe 14-25 f; stays lit and adds up | +1 to +14 f after the cue word (2895: +1; 592: +2/+14; 430: +4) | **Confirms** the R9 highlighter. **Refines:** it adds up over several phrases (CfyG 4 rows, ETSQ 3 phrases) |
| T2 | Progressive "karaoke" highlight that follows the narration through a long statement | 3 runs (ETSQ 3195-3402, k--at 1884-2060, yh4l 3308-4085) | yh4l 3365 → 4085 | the reporter reading a statement word for word | one fragment per caption chunk, cumulative, 7-26 s | in step with each caption chunk | **NEW** form. The baseline karaoke brightened words of a quote; this marks the line being read |
| T3 | Outlet headline rebuilt as type on dark: wordmark, typed headline, lime phrases; a blue slash and cream bar accent from the logo system | ≈19 (9 videos) | IRlm 568; k--at 403; uxfg 418; yh4l 2385; H2fP 3616 | "X reported…" | headline types on in about 20 f (403→425), then the highlight | highlight lands about 4-20 f after the headline settles | **NEW.** The baseline used real crops only. Real crops still appear (k--at 1045, uxfg 3746) |
| T4 | Kinetic number or keyword box over the presenter (lime block, dark text, in a free zone) | 6 (GMu3 3, LSuT 3) | GMu3 1517 "$4.6 billion", 2618 "Champerty"; LSuT 537 "$72 billion", 2228 "$307 million" | the number or the term | **2 f pop** (no wipe); off on the next phrase | −4, −3, 0, +2 f (median −1.5 f) | **NEW** (the baseline had only the opening pull quote) |
| T5 | Annotation on footage: hairline box, circle, outline or face box plus a label; the rest of the frame dimmed | ≈14 (ETSQ 10, H2fP 2, IRlm 1, tKaD 1) | ETSQ 63-86 box + fan-out to 5 thumbnails, 974 face box, 1238 body outline, 2815 circles; H2fP 638 "HAITI" box | naming the object or person | box draws over about 23 f (63→86); surroundings dim | −6 f (63 vs "launcher" at f69) | **NEW** (the baseline had no markup on footage) |
| T6 | Map: satellite pin, choropleth state fill, outline-region zoom, own-data map | 11 map scenes (ETSQ 1 with 5 pins, NxPg 1, tKaD 3, IRlm 4, GMu3/LSuT silhouettes) | NxPg 994-1145; ETSQ 1054; tKaD 691 → 1796 | place names | fill over 13 f; labels typed on the name; one continuous push across the map | WASHINGTON label −11 f, OREGON −8 f, CALIFORNIA −6 f, Hawaii callout −2 f before the word | **Extends** the baseline's map trace (1 instance) |
| T7 | Footage windows anchored on a map with numbered badges | 5 drops (ETSQ) | 1100, 1830, 2328, 2554 | "the first/next shot…" | window scales up from its pin to near full frame | on "first", "next", "another" | **NEW** |
| T8 | Unit or pictogram chart | 5 (CfyG, NxPg, yh4l ×2, LSuT) | CfyG 187-377; NxPg 1659; yh4l 440 → 620 | counts and shares | build, then a recolour: **flicker-on** (CfyG 290-299) or a boxed group that narrows (yh4l) | +5 f (CfyG); +3 f after "live" (NxPg) | **Confirms** the waffle (B08). **NEW** flicker and group-box variants |
| T9 | Explainer diagram on a full lime canvas (silhouettes, dashed flow arrows, coins, speech bubbles, photo cutouts) | 2 long runs (GMu3 27 s, LSuT 11 s) | GMu3 383-1042; LSuT 141-400 | mechanism explanations ("This is how it happens") | built in place; the camera pans between actors | bubbles appear on the line they paraphrase (697, 766) | **NEW** canvas colour and form |
| T10 | Hatched bar or area comparison (hatched = projected or removed part) | 4 (GMu3 1, LSuT 3) | GMu3 1613-1748; LSuT 1918, 2341-2660 | "projected vs spent", "negotiated down", "plus interest" | the bar grows; the removed part turns hatched and drops; a new bar rises | on the second number | **Refines** the baseline bars (hatching is new) |
| T11 | Other chart forms: time-stepped split bar with canvas tint, pie with spotlight dimming, line chart, number line | 4 (1 each) | k--at 188-335; uxfg 752; LSuT 1544; LSuT 2932 | change over time; shares | step changes; the non-focus slice dims | pie dim +4 f after "third" | **NEW** forms (the baseline had bars and waffles only) |
| T12 | Court-screen device (blue rounded CRT window, typed case caption, highlighted party) | 3 (GMu3) | 1290, 2384, 2425 | "sued Argentina / Panama / Brazil" | types on; the party box swaps | on the country name | **NEW**, and reused inside one video with only the variable changed |
| T13 | Windowed footage: social clips with a lime hairline border; Zoom interviews in a window with drifting brand strokes; archive films with their own title card | ≈9 (yh4l 3, uxfg 2, NxPg 1, H2fP 1, IRlm 2) | yh4l 1094, 4608; uxfg 1665-3242 | quoting a clip or a source | hard cut in; strokes drift at the edges | n/a | **Extends** the archive window (R12). The lime border and the strokes are new |
| T14 | Anonymisation as a visual: "?" face disc on a duotone cutout; grey face discs; blur | 3 videos (H2fP, tKaD, ETSQ end) | H2fP 52, 3927; tKaD 2338, 1277 | an unnamed person; protecting identities | holds through the shot | the face is revealed on the name (H2fP 289) | **NEW** |
| T15 | Split screen of two stacked clips with a typed lime label per list item | 3 (LSuT) | 1148, 1197, 1260 | list items | the label types across the seam | on each item's first word | **NEW** |
| T16 | Doodle label that swaps in place over the presenter (outline map whose word changes) | 1 (LSuT) | 23-115 | "territory / commonwealth / colony" | the word swaps per term; the last one floods lime | on each word | **NEW** |
| T17 | Object cutout render with a leader-line label | 2 (ETSQ) | 1542 "MUZZLE BLAST", 2913 "SKAT SHELL" | naming the munition | the render slides in diagonally | on the name | **NEW** |
| T18 | Logo or portrait roundels in blue circles over blurred footage | ≈10 (uxfg, tKaD, yh4l) | uxfg 267-390, 1526; yh4l 893 (agency seals stacking) | naming an organisation or expert | pop in, one per name | on the name | **NEW** |
| T19 | Stepped push-in on a document crop | ≥4 (9LOa 89/109/132, CfyG 880/1173) | 9LOa 132 | the damning line | 2-3 hard steps, then the highlight | highlight on the last step | **Confirms** B09/B16 |
| T20 | Quote lit word by word over the presenter or a page | 3 (GMu3 2651, LSuT 3169, IRlm 970) | GMu3 2651-2697 | a definition or a quote | dim layout, then brighten | per word | **Confirms** R19 |
| T21 | Title card in stacked lime boxes over footage (trailer openers) | 3 (47nF, CfyG; 47nF end CTA) | 47nF 0-56; CfyG 0-46 | the title | on from frame 0 | n/a | **NEW** (trailer format) |
| T22 | Brand end card (stroke assembly → EVIDENT → "SEE FOR YOURSELF" or "WATCH THE FULL VIDEO") | 11 of 13 | GMu3 3462-3556 (3.9 s) | none | strokes collapse into the wordmark | n/a | **Confirms** B27. 47nF and ETSQ use a partner or CTA card instead |

**Top 5 by count:** T1 highlighter on a phrase (≈48), T3 headline rebuilt as type (≈19), T5 annotation on footage (≈14), T6 maps (11 scenes), T18 roundels and T13 windows (≈10 and ≈9).

---

## 3. Numbers vs the baseline

**Reveal timing** was measured on 12 graphic onsets with lime-pixel thresholding. Values are signed frames against the spoken cue word: −32, −6, −4, −3, −1, 0, +2, +5, +7, +12, +14, +41.
- Median **+1 f**, which **confirms** the baseline's +1 f.
- Absolute median 5.5 f, compared with the baseline's 2 f.
- 4 of 12 (33%) land within ±3 f, compared with the baseline's 65%.

The **number pops** (T4: −4, −3, 0, +2) are as tight as the baseline. Highlights on **headline text that is not spoken word for word** drift late (+12, +14, +41). The one large early outlier is IRlm 1027, where the highlight lands 32 f before the word.

| Measure | Baseline (IG Ddos1QZRGmV) | Group 2 (13 videos) | Verdict |
|---|---|---|---|
| Seconds per visual idea | median 2.13 s | estimated median **2.2 s**, range 1.8 (47nF) to 4.2 (uxfg) | Confirms |
| Shot length (hard cuts) | scene median 2.57 s | median of video medians **2.64 s** (1.84-5.56); pooled 461 shots 2.56 s | Confirms |
| Cuts per minute | about 21 hard over 98 s ≈ 13/min | 7.9-29.5/min, median 17.4 | Similar or faster |
| Dissolves | 0 editorial | the detector's "dissolves" (median 3-12 f) are animation steps. Editorial dissolves seen only at tKaD 1721 → 1746 (map → satellite) and NxPg map pushes | Confirms (≈0) |
| Frame share | G 38.7%, D 9.5%, archive 26.8%, P 20.6% | over 1,739 tiles: G 20.4% (+A 2.5%), D 15.0%, F 24.9%, P 22.5%, **I 10.5%**, E 4.2% | Graphic share falls; documents and interviews rise |
| Graphic share by video | n/a | ETSQ 44%, LSuT 42%, NxPg 39%, IRlm 35%, GMu3 33%; trailers 0% (47nF, 9LOa) | It depends on the format |
| Accent colour | lime #D9ED55 | lime **#DBE762 / #D2E34F** (canvas), same family. Blue fills **#2A3C91**, court screen **#243FCB**; a second fill colour is **green #45684D** (NxPg NE) | Confirms. Lime is now also a full canvas |
| Dark canvas | #313032 | #2D2A2B (IRlm), #0F1111 (uxfg) | Confirms the near-black, grain-textured canvas |
| Caption box | black, square, hard swap | two styles: (a) black box, bold sans (11 videos); (b) grey translucent box, mono-style lowercase (47nF, yh4l). Hard swap in both | Refines |
| Quoted speech | italics | italics (k--at 641) **or pale-yellow text** (H2fP 1100: RGB 238,245,160; NxPg and tKaD interviewees, yellow and sometimes italic) | Refines |
| Voice over bed | +8.42 LU | median **+10.5 LU** (3.7 to 25.0; 47nF trailer 3.7, NxPg 25.0 with almost no bed) | Confirms the gap; it is often wider |
| Mix loudness | −14.7 LUFS (IG copy) | median **−20.2 LUFS** (−27.0 to −17.5); true peak −7.0 to +0.1 dBFS | The YouTube files are quieter; do not copy this number |
| Speech rate | 2.92 w/s | 1.64-3.30, median 2.65 w/s | Confirms |
| Element entry | settles in a median 5.5 f | graphic_elements settle median 2-4 f (10 videos; this includes captions) | Refines (faster pops) |
| Cards: shadow | none | none seen; windows use a hairline border (lime in yh4l) or nothing | Confirms |
| Bug | "E" roundel top-right | E in 11 of 13. Co-brand bug beside it on partner pieces (CalMatters 9LOa/CfyG, Forbidden Stories tKaD) | Refines |

The fps differs between files (23.976, 25 or 30), so frame offsets are about ±1 f per frame-rate step.

---

## 4. Variation: how Evident avoids repeating itself

**Inside one video, the device stays and one variable changes:**
- GMu3's court screen appears three times with only the defendant swapped: Argentina (1290), Panama (2425), Brazil (2440).
- yh4l's icon grid appears three times: the month group in green (440), the week group in lime (620), and the plain grid for "31 deaths" (1906).
- LSuT has five charts that are all different forms: pictogram (141), line (1544), hatched pair (1918), cut-and-regrow bar (2341), number line (2932).
- ETSQ's numbered 5-shot grid returns twice (642 and 1710), once with the munition added and only shots 2-3 lit.

**The highlight colour changes with its role.** Lime marks evidence phrases; **blue** marks a headline word (ETSQ 3632 "blinded"). Kinetic numbers over the presenter use a 2 f pop, while document highlights use a 14-25 f wipe.

**Bookends instead of repeats.** H2fP's "?" mask opens the video (52-156) and closes the argument (3927). LSuT's colony outline opens over the presenter (115) and returns as the lime-canvas island (141).

**Across videos, the same family takes different forms:**
- Maps: satellite and pins (ETSQ), choropleth (NxPg), outline-region zoom (tKaD), Evident's own data product (IRlm), silhouette in a diagram (GMu3, LSuT).
- Unit charts: flicker-on (CfyG), boxed groups (yh4l), three-person "1 in 3" (NxPg).
- Highlights: block (most), text colour (uxfg 173), progressive karaoke (k--at, yh4l, ETSQ).
- Over-presenter graphics: number box (LSuT, GMu3), doodle swap (LSuT), photo cutout (GMu3 23).

**The format sets the mix:**
- Trailers (47nF, 9LOa) are 0% designed graphics.
- Database walkthroughs (CfyG, IRlm) lean on documents and screen captures.
- Investigations (ETSQ, tKaD) lean on annotation and maps.
- Explainers (GMu3, LSuT) lean on lime-canvas diagrams and bars.

**The constants never change:** the dark grain canvas or lime canvas, one blue, the lime accent, the caption box, the E bug, a credit label on every borrowed clip ("DHS.gov", "FB / Randall Gamboa", "X / @RepRaulRuizMD", "Google Earth"), and the stroke end card (11 of 13).

## 5. Caveats

- "Seconds per idea" is a hand estimate: shots plus in-place reveals counted on the boards.
- yh4l's cut count is inflated by police strobes (4433-4804), and k--at's final cut sits at frame 2540, the last frame.
- Caption RGB is reliable only at H2fP 1100. The other caption samples were contaminated by faces.
- No sfx.json exists for this group, so nothing is claimed about sound effects.
- camera.json exists for only 4 videos and was not used.
