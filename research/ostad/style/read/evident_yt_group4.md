# Evident YouTube Shorts, group 4: 13 videos read board by board

Additive to the baseline `read/ig_Ddos1QZRGmV.md` (33 beats, median 2.13 s per idea, reveals +1 f after the word, 0 UI widgets, lime #D9ED55 accent, blue #4D63CA data, voice 8.42 LU over bed). This file confirms, refines or extends it. It does not reset it.

**Sources.** All 40 reading boards opened (`sheets/evident_yt_shots/<id>_N.jpg`; the counts per video match the files on disk: 4+2+4+3+3+4+2+4+3+3+2+3+3 = 40), plus the 13 `.txt` word-per-second files and every JSON present in `measure/evident_yt/<id>/`. Frame-level checks were decoded with ffmpeg (scripts in the session scratchpad: `evyt4_summary.py`, `evyt4_beats.py`, `evyt4_roi.py`, `evyt4_onset.py`, `evyt4_strip.py`, `evyt4_px.py`; strips in `scratchpad/evyt_frames_4/`). Frame numbers are 0-based, in **each video's native frame rate** (30 fps unless noted: FWfMMmC6mzE, grr50zoJ3C4, pfvH4l64bi0, tQkjtXJEtxY, WZjqgyXpk0A 23.976; Ik5Zt8oGko4 23.963; meKVDHOFRBY 25). Board frame numbers are tile frames (one tile per second inside a shot, CUT tiles = cut + 3 f), so board-only references are ±1 s; ffmpeg-measured moments are ±1 f.

**What was missing.** `pacing.json` exists for none of the 13. `graphic_elements.json` exists for 6 (5J8M96aZYYg, af-AaYDZLOE, eMX2jPQE090, FWfMMmC6mzE, grr50zoJ3C4, Ik5Zt8oGko4) but proved too noisy to time reveals (e.g. it reports a 1000x1344 "image_card" entering at f621 for a map dim), so reveals were timed with ffmpeg instead. `camera.json` and `palette.json` exist only for meKVDHOFRBY, tQkjtXJEtxY, zigiwXNHo7c. No `text_elements.json` or `sfx.json` for any of them, so SFX could not be re-tested. `pfvH4l64bi0/transcript.json` is Arabic text (Whisper ran on the Arabic speech; the on-screen captions are English), so its words/s (1.59) undercounts.

**Method checks.** zigiwXNHo7c is Evident's YouTube upload of the baseline piece (frame offset 0, per the baseline). Re-reading it with this group's method gives a beat median of **2.13 s** (baseline 2.13 s) and tile shares P 20.6 / archive 26.2 / G 38.3 / D 10.3 / E 4.7 % (baseline frame shares 20.6 / 26.8 / 38.7 / 9.5 / 4.4 %). So tile counts are a fair proxy for frame share (within 0.6 points) and the beat split is consistent with the baseline.

Category key for tiles: **P** presenter or on-camera interviewee speaking to camera, **F** footage/archive (UGC, B-roll, archive photo or video, including footage with annotation on top), **G** designed graphic (chart, map, satellite with overlays, kinetic type, diagram, waveform), **D** document crop (article, report, headline card, court paper), **E** end card.

---

## 1. Per video

Columns used throughout: duration, hard cuts (cuts.json), beats (visual ideas counted from the boards), median s per beat (p90), tile share P/F/G/D/E.

### 5J8M96aZYYg: US-made weapons in Gaza strikes (Bellingcat partnership)
156.0 s, 30 fps, 29 hard cuts, 43 beats, median **3.13 s** (p90 6.13). Tiles (159): P 30.2 / F 11.9 / G 38.4 / D 16.4 / E 3.1 %. Presenter Hind Hassan in a home studio.

- **Map dot plot, then recolour by category (f275-634).** "tracked U.S. munitions to at least 79 strike locations" ("79" f338): yellow ring markers accumulate on a dark Gaza map with a blue outline (tiles 275 → 455 show the cluster growing). On "including schools" (f454) the legend switches to three categories and the dots recolour red / blue / orange; each legend row lights as it is spoken ("homes" f479, "hospitals" f503; tiles 485, 515). Later the same map returns (f1458) and is **filtered**: only the red school dots stay on "28 hit schools" ("28" f1552; tile 1545), then the camera zooms on one dot (1635-1665) and cuts to the satellite of that school (1695). One dataset, three readings.
- **Stat over a dimmed map, typed then highlighted (f620-760).** Map darkens from f620 (10 f before "744" at f630; luma 29.1 → 17.0 by f644). "744 people killed" appears as grey ghost type with a caret at f636-644, lime block sweeps "744 people" from f646 to ~f660 (lime px 149 → 1,856; +16 f after "744"). Line 2 "including at least 175 children" fades in grey, brightens word by word (f720), lime on "175 children" from ~f735 ("175" f731, +4 f). Strip: `v1_744.png`.
- **Line-art object list built in place (f956-1167).** Three green wireframe munitions stack one per name: Hellfire (tile 956; word f961), GBU-39 (1013; word f1012), MK-80 + JDAM kit (1073; "GPS" f1070). Each label has the name lit in lime. The list stays; nothing is removed.
- **Annotation on footage (f2176-2412).** Strike video; on "at least six people" ("six" f2302) numbered yellow boxes 1-6 appear around each person (tiles 2293-2353; ROI change 10 % at f2294, 90 % at f2311). Earlier, a lime **loupe circle** isolates the bomb in a frame (1168) and a tilted lime rectangle frames the unexploded GBU-39 with its wireframe beside it (1986-2046).
- Also: satellite (Planet) with building outline and photo insets on leader lines (1208, 1815-1905); rectangle zoom-box on satellite opening onto an inset photo (1295-1322, 2959-3079); Airwars web page with three successive lime highlights (2550 "between 30 and 53 civilians", 2607 "15 children and eight women", 2667 "at least 100 others were injured"); NYT crop over a blurred copy of itself (3217); Amnesty title rebuilt as a headline card, lines typed then lime on "in Violation of International Law" (4046-4223), with Evident's blue diagonal strokes.

### af-AaYDZLOE: 28 violations in 19 days in Chicago (TV interview with Evident's director)
76.3 s, 30 fps, 35 hard cuts, 22 beats, median **3.13 s** (p90 5.47). Tiles (86): P 47.7 / F 29.1 / G 10.5 / D 7.0 / E 5.8 %. A repackaged cable interview, so presenter share is high.

- **Stacked split-screen interview (f3-371, 896-983, 1247-1334, 1841-1928).** Host and guest in two rounded windows with lime-green borders on black, cream and lime arcs drifting behind. The same frame returns 4 times as the "interview" register.
- **Map dot plot with category legend (f103-160, 1004-1151).** Chicago satellite; yellow dots pop on "28 violations"; the second time the legend has three categories (riot-control weapons / use of force / public dispersal) and dots recolour (tiles 1061-1151) on "open-source... satellite imagery".
- **Headline card typed by line (f394-541).** ABC7 headline set in Evident type, last line in lime, date and byline in lime small caps, blue diagonal stroke shapes enter bottom-right.
- **Weapon ID box on UGC (f818-848).** Lime square on the launcher with a two-line label "B&T GL06 40mm less lethal launcher".
- **Rapid UGC montage (f1379-1664).** 14 cuts in 9.5 s (0.27-1.3 s shots), each clip with a top-right source label (TikTok, FB, YT handles).
- Captions here are plain light text with **no box**, different from the baseline caption.

### eMX2jPQE090: Why do ICE agents carry guns? (history explainer)
180.1 s, 30 fps, 90 hard cuts (the most in the group, 30.0 per minute), 61 beats, median **2.17 s** (p90 4.33). Tiles (191): P 31.9 / F (footage 26.2 + archive 24.6) 50.8 / G 3.1 / D 11.0 / E 3.1 %. Presenter Lila Hassan.

- **Court-ruling crop, then the phrase lifts out (f325-479).** Extreme close-up of a legal opinion; a **blue** underline-highlight (#5458BE) sweeps "civil action" (tiles 382-412), then the page darkens and "civil action" stands alone as glowing type (442) on "negotiating a divorce". Highlighter colour is blue here, not lime.
- **Chapter title card (f1160-1207).** "HERE'S HOW ICE GOT GUNS" types on letter by letter in glowing cream on black (tile 1160 shows only "H"). The only chapter card in the group.
- **Archive in small windows on black, scaled up (f1273-1330, 2215-2242, 2404-2899).** Paintings and photos sit in small un-bordered windows on near-black; one grows (1303 → 1330); a run of 7 archive photos (2404-2899) each held 2-3 s with a source label ("Marfa Public Library").
- **Stylised map with border trace (f1995-2070).** Pink US / dark Mexico; a yellow line traces the 1840s border on "Mexican-American War of 1840... redrew the country's borders", camera pulls back (2043).
- **Document stack and paper collage (f3575-3664, 4139-4255).** "SUBJECT: UNIFORMS - BORDER PATROL" highlighted blue (3602), then layered photos and orders as a paper collage (3637-3664); Public Law page pushes to an extreme close-up with depth blur and a blue highlight on "AUTHORITY TO CARRY FIREARMS" (4225-4255) on "the right to carry firearms".
- **Cut-out breaking the frame (f883-927).** A pepper-spray canister is cut out of the footage and tilted with a lime frame on "it wasn't always the case"; lime brackets mark muzzle flashes at 849 and 955.

### FWfMMmC6mzE: Five Border Patrol agents who followed Bovino (no presenter)
100.6 s, 23.976 fps, 21 hard cuts, 27 beats, median **3.09 s** (p90 5.63). Tiles (105): P 0 / F 41.9 / G 46.7 / D 5.7 / E 5.7 %. 16:9 material letterboxed in 9:16 with a blurred copy filling top and bottom.

- **People as a network (f0-138).** Five agent portraits in coloured rings joined into a pentagon on "five agents... whose identities we've been able to confirm".
- **Route trace with avatars (f161-299).** US map; the ring cluster hops Bakersfield → LA → Chicago → Minneapolis along a thin line, one stop per city name ("Bakersfield" 6 s, "Los Angeles" 7 s, "Chicago" 8 s, "Minneapolis" 9 s in the .txt).
- **Stat over footage (f563-640).** "3 days / 78 arrests" in large type; lime block behind "78 arrests" (lime 10 % f578, 90 % f592) while the narration says "Return to Sender" (f574). The numbers are **not spoken**: the graphic adds facts the voice skips.
- **Name decode (f917-1120).** Footage window with a label that resolves from asterisks to "Agent Timothy Donahue" (tiles 960 "Agent \*\*\*\*\*\*\*" → 1006 "Agent Timothy Donahu\*" → 1029 full), timed to "appears to show Agent Donahue"; second agent the same way with a lime face box (1097-1143).
- **Ellipse tracking an agent (f1739-1851).** Purple ring (#B699F9) around the agent in a crowd, growing as he runs, on "can be spotted running at a U.S. citizen".
- **Geolocated clip pins on a map (f641-883, 1597-1663, 2164-2253).** Footage thumbnails pinned to locations on a dark Bakersfield/LA map, zoom to a Home Depot (771-814).
- Quoted speech from the clip captioned in **yellow** ("I'm gonna have to break your window", 1352-1421); CalMatters headline card with lime highlights (2021-2133).

### grr50zoJ3C4: "The Cut", a Medi-Cal patient (observational doc)
117.5 s, 23.976 fps, 26 hard cuts, 29 beats (shots + 2 text cards), median **3.80 s** (p90 7.42). Tiles (124): interview P 21.0 / F 63.7 / G 11.3 / D 0 / E 4.0 %. Series bug (California outline) beside the E roundel.

- **Caption colour by speaker.** Subject in white; the off-camera interviewer's questions in yellow ("Ramonte Means." 823, "On average how many hours of sleep" 1011, "Have you ever had periods" 1840).
- **Typed context cards over footage (f2395-2681).** "RAMONTE WORKS SEVEN DAYS A WEEK AS A JANITOR..." types on over a car-window shot (2415 partial, 2438 full); "IF HE EARNS MORE THAN $36,777 HE AND HIS CHILDREN WILL LOSE MEDI-CAL" with "MORE THAN $36,777" in yellow over an aerial (2576-2681). No voice under them.
- No charts, maps or documents. Teaches restraint: in a character piece the only graphics are the name super (528) and the two end facts.

### Ik5Zt8oGko4: Camp 17, Colombian mercenaries in Libya (investigation)
156.9 s, 23.963 fps, 18 hard cuts (fewest per minute, 6.9), 28 beats, median **4.19 s** (p90 9.01). Tiles (166): P 0 (reporter on location 8 tiles inside F) / F 45.2 / G 46.4 / D 4.8 / E 3.6 %. Letterboxed with blur fill.

- **Drone and satellite matched with the same boxes (f1018-1399).** Drone shot gets a yellow box "RSF dorm" (1038-1107) and a blue box for the asphalt area on "asphalt area used for training" (1130); the satellite image slides in at the right edge on "It matches satellite images" (1245), then fills the frame with the same coloured boxes (1333-1399). Same colour = same place across two sources.
- **Reference photo pinned on satellite (f1468-1606).** Rows of vehicles outlined in white; a Toyota pickup photo card with model label appears on "the model of truck the United Nations say the UAE regularly sends".
- **Audio waveform with live transcript (f1790-2710, 38 s, 51 tiles).** Lime waveform on dark, transcript lines with lime speaker tags ("Ahmed", "Producer") added as each line is spoken. This is the longest single device in the group and stands in for an off-camera recording.
- **Phone pings on satellite (f3096-3441).** Pulsing yellow ring (3165-3188) on "we analysed telephones located at Camp 17", then yellow dots appear (3234+) on "found evidence of one suspected Colombian contractor", zoom in (3303-3441).
- Company form with black redaction bars and a lime highlight on "Colombia" (2958).

### jkz_oxibzl4: "Is it a scam?" mail-in voting (creator collab)
90.6 s, 30 fps, 16 hard cuts, 16 beats, median **3.85 s** (p90 16.57). Tiles (91): P 71.4 / F 6.6 / G 0 / D 20.9 / E 1.1 %. No E roundel, no bed (−68.4 LUFS), grey rounded translucent caption box. A different house style.

- **Article screenshots over the presenter's lower 60 % (f688-847, 972-1089, 1318-1405, 1828-1915).** Static web pages; no highlighter, no motion; the presenter's face stays visible above the screenshot.
- **Joke cutaways (f1552-1691).** Mickey Mouse images on "he'd be a terrible president".
- Useful only as a contrast case: no animated explanation at all, so it is excluded from technique counts except D crops.

### liXI5YR96w4: Deadliest year for deaths in ICE detention (data explainer)
178.5 s, 30 fps, 40 hard cuts, 48 beats, median **3.15 s** (p90 5.90). Tiles (185): P 34.6 / F 25.9 / G 20.5 / D 17.8 / E 1.1 %. Presenter Ivette Galvez plus two sit-down interviews.

- **Single bar, then pull back to history, then filter to a comparison (f147-567).** Lime bar 2025 grows f156 → f184 (28 f) under "As of December, ICE" and its "31" label fades grey → white f162-176, **landing 13 f before the spoken "31" (f197)**. On "more than the number that died" the axis extends left and blue bars 2020-2024 (18, 5, 3, 7, 11) rise (tiles 354-414). On "The last year with more reported deaths was 2004" (f519) the chart re-scopes to two bars, 2004 (32, blue) vs 2025 (31, lime) (tile 504). One chart, three scopes. Strip: `lix_31.png`.
- **Line chart drawn point by point, endpoint becomes a donut (f2350-2850).** Thousands detained, dots join left to right (2377-2467), endpoint labelled "65,135" in lime with a ring on "65,000" (f2408). Everything else fades, the lime endpoint dot travels and grows (f2612-2634), a hole punches through (f2630) and blue/green segments wipe clockwise (f2634-2650) on "Nearly half of those detainees" ("half" f2621; segment wipe 10 % at f2631, 90 % at f2642, +10 to +21 f). Labels light per spoken category: "criminal convictions" (2677), "or even charges" (2707), "solely... immigration violations" (2767-2827, "solely" f2759). Strip: `lix_donut.png`.
- **Report cover, dimmed, with stats stacked over it (f3601-3928).** Ossoff report slides up from the bottom (3601-3628), dims, "85 credible reports of medical neglect" appears in lime (+16 to +22 f after "85", f3723), then "82 credible reports of denial of adequate food or water" under it ("82" f3821, tile 3838).
- **Quote cards as a carousel (f3958-4288).** White paper card with a detainee quote; lime highlights sweep phrase by phrase as they are spoken ("severe chest pain" 3988, "massive heart attack" 4078-4108); the next card slides in from the right and pushes the first off (4138), then its own highlights ("bottled water", "requested but denied", 4198-4288).
- **Windowed UGC with a lime glow edge (f783-955, 3263-3448, 4791-5020).** Rounded window, soft lime-green glow border (the baseline window had none), source label top-left.
- Headline cards (Sky News 1665, El País 2123) typed with lime highlight on "dies after being detained" / "died in ICE custody". Captions plain, thin type, translucent dark box.

### meKVDHOFRBY: West Bank checkpoints (data investigation, no presenter)
104.8 s, 25 fps, 33 hard cuts, 30 beats, median **2.84 s** (p90 5.88). Tiles (113): P 0 / F 65.5 / G 25.7 / D 3.5 / E 5.3 %. Bed nearly as loud as voice (gap 2.2 LU).

- **Accent switches to red for this story.** Line chart of checkpoint numbers in red (#D75963, 1069-1191); a dotted box brackets the last three years on "almost a third added in just the last three years" (ROI change 10 % at f1198 vs "third" f1199; tile 1216 shows the box); West Bank map with red checkpoint network (1316-1541); 62 % ring in red (#FE5D66, 2005-2055).
- **Quoted voices in yellow italic captions.** The grieving mother (25-150, "My dearest died") and the TV anchor (466-538) are captioned in yellow italic; the narrator in white. Extends the baseline's italic-for-another-voice rule with colour.
- **Partner logos build one by one (f1858-1980).** Lighthouse Reports, ARIJ, WIRED, Palestine Reporting Lab added on "our team of reporters analysed unprecedented data".
- **Source artefacts as evidence (f2070-2133).** GPS-ping map screenshot on "driver GPS pings", Telegram message list on "Telegram messages": each data source shown as itself.

### pfvH4l64bi0: How smuggling routes fuel war in Sudan (field report)
97.8 s, 23.976 fps, 21 hard cuts, 23 beats, median **3.59 s** (p90 6.59). Tiles (104): P 0 (reporter on location 15 tiles inside F) / F 67.3 / G 26.9 / D 0 / E 5.8 %.

- **Title over the opening aerial (f0-81).** "HOW SMUGGLING ROUTES FUEL WAR IN SUDAN", right-aligned, cream, 5 lines, over a desert convoy.
- **Satellite with photo insets, then stepped zoom out to country scale (f1659-2185).** Camp on satellite with blue marks (1659-1771), ground photos pinned left and right on "linked to critical RSF battles" (1817-1932), then the view zooms out in steps through desert to a labelled map of Libya with four camp markers on "We found four previously unidentified training camps across Libya" (2093-2185).

### tQkjtXJEtxY: Who shot Tucker Collins? (visual forensics)
83.6 s, 23.976 fps, 19 hard cuts, 28 beats, median **2.54 s** (p90 5.80). Tiles (92): P 0 / F 60.9 (46 of 56 F tiles carry annotation) / G 33.7 / D 0 / E 5.4 %.

- **Kinetic title over a face (f0-58).** "WHO SHOT TUCKER COLLINS?" in black on lime blocks, one block per line, over his portrait. Same device as baseline B01, used as a cover.
- **Outline on the obstacle (f277-481).** Lime outline traces the 10-foot mesh fence in footage on "There's a ten-foot mesh fence".
- **Footage wall assembles (f505-581).** Clip thumbnails tile into a grid on "So we started looking through any footage we could find", then one clip pushes forward.
- **Frame-by-frame tracking ring (f831-1103).** Single frames held and cut together; a lime ring sits on the projectile in each (tiles 851, 871, 887, 977-1091) on "a projectile entering from an arced position... tracking up toward his right eye". Ring visible from f836 vs "projectile" f852 (−16 f: ring leads the word slightly).
- **Distance on satellite (f1355-1858).** Triangulation lines, labels "Tucker location", agent position, and "~38 METERS" on "this federal agent was roughly 38 metres away" ("38" f1510; label in tiles from 1490). Holds 21 s to the end.

### WZjqgyXpk0A: Vulture funds and Puerto Rico's power debt (explainer)
98.3 s, 23.976 fps, 35 hard cuts, 41 beats, median **1.92 s** (p90 3.55, the fastest). Tiles (109): P 34.9 / F 25.7 / G 23.9 / D 11.9 / E 3.7 %. Presenter Bianca Graulau, orange studio.

- **Keyword label pops beside the presenter (f742).** "Vulture Funds" in a lime box on "so-called vulture funds" (ROI change 10 % at f717, 90 % at f732; word f728).
- **Inverted palette: the whole frame becomes lime (f900-1324).** Black Puerto Rico silhouette; "POWER UTILITY DEBT: $9BN" label; dashed arrow up to "INVESTOR" with "↓ VALUE" ticks on "debt had gone down in value"; speech bubbles "Who wants this?" / "We do."; a vulture cut-out with a GoldenTree tag flies in (word "Golden" f1114; canvas change 10 % at f1103, 90 % at f1117); more vultures tagged BlackRock and Goldman Sachs join on their names (1266-1312). A flow diagram with cut-out characters, 17.6 s.
- **Proportional box fill (f1325-1490).** Hatched rectangle "Total Debt: $9 billion"; a dark fill rises to "$1.1 billion", then "$5.2 billion owned by vulture funds" (1368), then "($2.6 billion)\* what they paid" (1437) on "bought the debt for pennies on the dollar" ("pennies" f1413). Area = money.
- **Kinetic line over presenter (f242-298).** "They profit because of it." lights word by word from grey to white on the presenter's chest area.
- NYT and PREPA headline cards with lime highlights (319-365, 1576-1645); report crop with highlight "Puerto Rico is 75% higher than the U.S. average" (1949); hurricane satellite with a lime label typed "HURRICANE MARIA" (464-484); two clips stacked as a split screen (35-83).

### zigiwXNHo7c: baseline piece, YouTube copy
98.5 s, 30 fps, 26 hard cuts, 32 beats, median **2.13 s** (p90 5.27). Tiles (107): P 20.6 / A 26.2 / G 38.3 / D 10.3 / E 4.7 %. All 3 boards match the baseline beat table frame for frame (e.g. lime sweep at tile 30-60, bars 456-666, waffle 898-1116, highlighter 1252-1312, karaoke quote 2625-2805). Used only as a calibration check; excluded from the group medians below.

---

## 2. Technique catalogue

Counts are occurrences (one per distinct beat or build) across the 12 group videos, zigiwXNHo7c excluded. "Timing" uses the ffmpeg-measured moments where available; otherwise the board tile. NEW = not in the baseline read-out.

| # | Technique | Count | Example frames (id f) | Spoken trigger | Enter / exit | Timing vs word | NEW? |
|---|---|---|---|---|---|---|---|
| T1 | **Highlighter block on a document or headline phrase** (lime, text flips dark) | 27 (5J8M 7, af 1, eMX 3 blue, FW 2, Ik5 1, liXI 8, WZ 5) | 5J8M 2550-2727; liXI 1692, 2150, 3988-4288; WZ 342, 1599, 1949; eMX 412, 3602, 4225 | the exact figure or charge being read out | sweep left to right, stays lit while later phrases light; exit by hard cut | on the phrase (board-level); successive highlights 30-90 f apart | Confirm. Refine: **highlighter colour follows the video's accent** (blue #5458BE in eMX) |
| T2 | **Annotation on footage** (box, numbered boxes, loupe, ellipse, outline, bracket) | 19 (5J8M 5, af 1, eMX 3, FW 3, Ik5 2, tQk 5) | 5J8M 2293 (boxes 1-6), 1168 (loupe); FW 1739 (ellipse); tQk 277 (fence outline); Ik5 1038 (labelled boxes) | a count ("six people"), an object name, "can be spotted" | shape draws or pops, label types beside it; holds to the cut | 5J8M boxes 10 % f2294 / 90 % f2311 vs "six" f2302 (−8 to +9 f) | Partly new: baseline had none on footage. **Numbered boxes, loupe circle, tracking ellipse are NEW** |
| T3 | **Headline card rebuilt in house type** (outlet logo, lines typed, lime highlight, blue diagonal strokes) | 9 (5J8M 1, af 1, FW 1, liXI 3, WZ 2, meK 0, + Amnesty title) | af 394-541; liXI 1665, 2123; WZ 1576; 5J8M 4046 | "a report", "according to", outlet named | lines type in top to bottom, highlight last; strokes slide in bottom-right | typed across the sentence; highlight on the key clause | **NEW** (baseline used crops of the real page only) |
| T4 | **Map / satellite dot plot, recoloured or filtered by spoken category** | 6 (5J8M 3, af 2, Ik5 1) | 5J8M 275-634, 1458-1665; af 1004-1151; Ik5 3234 | "79 strike locations", "schools / homes / hospitals", "28 hit schools" | dots pop in clusters; legend rows light one by one; filter removes the rest | "79" f338: dots already accumulating from tile 275 (lead); categories on their words | **NEW** |
| T5 | **Satellite with outline + inset photos on leader lines / zoom box** | 9 (5J8M 4, Ik5 2, pfv 1, FW 1, tQk 1) | 5J8M 1208, 1295, 2959; Ik5 1245-1399, 1468; pfv 1817 | place names, "it matches satellite images" | inset slides or scales out from its pin; zoom box opens onto inset | on the place name (board) | **NEW** |
| T6 | **Stat number over a dimmed background** (map, report, footage), typed then highlighted | 6 (5J8M 2, FW 1, liXI 2, WZ label 1) | 5J8M 636-760; liXI 3748, 3838; FW 563 | a count or total | background dims ~10-24 f first, number types/fades, lime sweep on number+noun | 5J8M lime +16 f after "744", +4 f after "175"; liXI "85" +16 to +22 f; FW numbers not spoken | **NEW** as a form; lead-dim is new |
| T7 | **Bar chart build** | 3 builds (liXI 1 with 3 scopes; meK uses line) | liXI 147-567 | a count and its history | bar grows ~28 f; label grey → white | bar **lands 13 f before** "31" | Confirm baseline bar; **NEW: pull back to reveal history bars, then re-scope to a 2-bar comparison** |
| T8 | **Line chart drawn point to point** + bracket on a segment | 2 (liXI, meK) | liXI 2350-2467; meK 1069-1291 | "growing", "doubled", "a third in the last three years" | dots join left to right; endpoint ring + label; dotted box on the segment | meK box 10 % f1198 vs "third" f1199 (−1 f) | **NEW** |
| T9 | **Share chart: donut / ring** | 2 (liXI donut, meK 62 % ring) | liXI 2617-2827; meK 2005-2055 | "nearly half of those detainees", "62 %" | **morph from the previous chart's endpoint dot** (liXI), clockwise segment wipe; labels light per category | segment wipe +10 to +21 f after "half" | **NEW** (baseline share = waffle) |
| T10 | **Route / path trace on a map** | 3 (FW, eMX border, pfv zoom path) | FW 161-299; eMX 1995-2070 | city names in order, "redrew the borders" | line extends one leg per spoken city; avatars hop | one leg per city word (1 s spacing in .txt) | Confirm baseline coast trace; **avatar hop is NEW** |
| T11 | **Windowed archive / UGC** (rounded window on dark, source label) | 14 runs (eMX 6, liXI 4, FW 2, af 1, Ik5 1) | liXI 783-955 (lime glow edge); eMX 2404-2899 (no edge); FW 917 | testimony, "videos of...", history | hard cut in; in-window cuts; one scales up (eMX 1303→1330) | n/a | Confirm. Refine: **window edge varies by video** (none / lime glow / lime 2 px border) |
| T12 | **Typewriter / ghost-type kinetic text** (grey → white word by word) | 7 (5J8M 744/175, WZ 242, grr 2 cards, eMX title, tQk title, pfv title) | WZ 242-265; grr 2395-2484; eMX 1160 | the punchline sentence | ghost type, caret, word brightens on its onset | 5J8M line 2 lit word by word from f720 | Confirm baseline karaoke; **NEW: used on stat lines, chapter card and silent context cards** |
| T13 | **Object illustration list built in place** (line-art) | 1 (3 objects) | 5J8M 956-1167 | each item named | one wireframe per name, previous ones stay, name lit in lime | Hellfire f961 / GBU f1012 / GPS f1070, each object within ±10 f (board) | **NEW** |
| T14 | **Report cover slide-in → dim → stats on top** | 1 | liXI 3601-3928 | "An October report from Senator..." | slides up from the bottom ~27 f, dims to ~30 %, numbers stack | +16 to +22 f | **NEW** |
| T15 | **Quote card carousel with phrase highlights** | 2 cards | liXI 3958-4288 | "These include a man's reports of..." | card fades in, highlights sweep phrase by phrase, next card pushes in from the right | highlights on the phrases | **NEW** |
| T16 | **Flow diagram with cut-out characters on an inverted (accent) canvas** | 1 (17.6 s) | WZ 900-1324 | the mechanism ("buy debt... sue them") | labels pop, dashed arrows draw, speech bubbles, cut-outs fly in on their names | GoldenTree 90 % at f1117 vs "Golden" f1114 (+3 f) | **NEW** |
| T17 | **Proportional box / area fill** | 1 | WZ 1325-1490 | "$9 billion... majority... pennies on the dollar" | fill rises in the hatched box in 3 steps | on each figure | **NEW** |
| T18 | **Drone ↔ satellite match with colour-coded boxes** | 1 | Ik5 1018-1399 | "It matches satellite images" | satellite slides in from the right edge, then takes the frame | on "matches" (tile 1245) | **NEW** |
| T19 | **Audio waveform + live transcript** | 1 (38 s) | Ik5 1790-2710 | an off-camera recording | waveform scrolls, lines add with speaker tags | each line on its utterance | **NEW** (content, not a player: no play/pause) |
| T20 | **Frame-by-frame tracking ring on single frames** | 1 (7 frames) | tQk 851-1091 | "a projectile entering... tracking up" | held frames cut hard, ring re-placed per frame | ring from f836 vs "projectile" f852 | **NEW** |
| T21 | **Measurement on satellite** (distance label) | 1 | tQk 1490-1858 | "roughly 38 metres away" | lines draw, "~38 METERS" label | label by tile 1490 vs "38" f1510 (≤ +20 f lead) | **NEW** |
| T22 | **Name decode** (asterisks resolve to name) | 2 | FW 960-1029, 1097-1143 | "appears to show Agent Donahue" | characters resolve over ~70 f | resolves across the clause | **NEW** |
| T23 | **People network diagram** (portrait rings + lines) | 1 | FW 0-138 | "five agents... identities confirmed" | rings appear, lines join | opening line | **NEW** |
| T24 | **Partner / source logos build** | 1 | meK 1858-1980 | "our team of reporters" | logos added one by one | per name | **NEW** |
| T25 | **Footage wall assembling** | 1 | tQk 505-581 | "looking through any footage we could find" | thumbnails tile in, one pushes forward | on the clause | **NEW** |
| T26 | **Cut-out breaking the frame** | 1 | eMX 883-927 | the object named | object cut out, tilted, lime frame | board-level | **NEW** |
| T27 | **Keyword label pop beside presenter** | 1 | WZ 742 | the new term ("vulture funds") | lime box pops (~15 f) | 90 % at f732 vs word f728 (+4 f) | **NEW** (baseline B01 is a quote, not a term) |
| T28 | **Split-screen stack** (two clips or two speakers) | 5 (af 4 interview, WZ 1) | af 3-371; WZ 35-83 | two speakers / two consequences | hard cut | n/a | **NEW** |
| T29 | **Stepped zoom across scales** (site → region → country) | 2 | pfv 1955-2185; 5J8M 1635-1695 (map dot → satellite) | "across Libya", "one example is the Khadija school" | zoom with a cut at the scale change | on the place clause | Refines baseline stepped punch-in (B09) into a zoom-out / zoom-through |
| T30 | **Chapter title card** | 1 | eMX 1160-1207 | "So here's how ICE got guns" | letter-by-letter glow type on black | on the line | **NEW** |

Top 5 by count: T1 highlighter on documents/headlines (27), T2 annotation on footage (19), T11 windowed archive/UGC (14 runs), T3 headline card rebuilt in house type (9) tied with T5 satellite + inset photos (9).

---

## 3. Numbers vs the baseline

| Measure | Baseline (Ddos1QZRGmV) | Group 4 (12 videos, zig excluded) | Verdict |
|---|---|---|---|
| Seconds per visual idea | median 2.13 s, p90 5.19 | per-video medians **1.92-4.19 s**, median of medians **3.13 s**; pooled 428 beats incl. zig median 2.89 s. Fastest: WZ 1.92, eMX 2.17, tQk 2.54 (explainers). Slowest: Ik5 4.19, jkz 3.85, grr 3.80 (field/character pieces) | **Refine:** 2.1 s is the fast end (studio explainer). Investigations run 3-4 s per idea. |
| Hard cuts per minute | 15.8 (26 in 98.5 s) | median **13.4**, range 6.9 (Ik5) to 30.0 (eMX) | Confirm range; cut rate tracks footage share |
| Reveal timing vs word | median +1 f, 65 % within ±3 f | 14 measured: "744" lime +16 f; "175" +4 f; "Vulture Funds" +4 f; GoldenTree +3 f; meK box −1 f; boxes 1-6 −8 to +9 f; donut +10 to +21 f; "85" +16 to +22 f; projectile ring −16 f; "31" bar lands −13 f; "38 m" ≤ −20 f; 78 arrests not spoken. **Median about +4 f, abs spread 1-22 f; 4 of 12 timed reveals lead the word** | **Refine:** short pops (labels, highlights) stay within ±4 f. **Growing marks (bars, rings, dims) start before the word and land on or just before it.** Text plus highlight builds land +16-22 f after the number. |
| Presenter share | 20.6 % | median 25.6 %, range 0 (5 of 12 videos have no presenter) to 71.4 % (jkz) | Confirm presenter as minority; voice-over-only is common |
| Designed graphic share | 38.7 % | median **24.8 %**, range 0-46.7 % (FW 46.7, Ik5 46.4 highest) | **Refine downward:** the baseline is a graphics-heavy outlier; typical is about a quarter |
| Footage / archive share | 26.8 % | median **43.6 %**, range 6.6-67.3 % | Real footage leads (supports "real video over stock") |
| Document share | 9.5 % | median 6.4 %, range 0-20.9 % | Confirm |
| Cut vs dissolve | 21 hard, 0 crossfades; detector "dissolves" are animation steps | cuts.json dissolves 0-247 per video (liXI 247, median 3 f: chart steps); no editorial crossfade seen on any board. Defocus-in seen once more (eMX customs seal 1619-1696) | Confirm: hard cuts only |
| Accent colour | lime #D9ED55, data blue #4D63CA | lime measured #D7ED5D (liXI 250, 5J8M 700), WZ canvas #DDE963, FW #D2EA1F (more saturated); blue #4159D7 (liXI 450). **Exceptions:** eMX highlighter blue #5458BE; meK data red #D75963 / #FE5D66; FW tracking ring purple #B699F9 | **Refine:** one accent per video. Lime is the default, but the accent can change to suit the story (red in the checkpoints piece). Never two accents on one chart. |
| Canvas | charcoal #313032 | liXI chart canvas #18151B (darker, near black); WZ inverts to a full lime canvas | Refine: the dark canvas varies 0x15-0x31; the inverted lime canvas is used once, for the mechanism diagram |
| Caption | black box, square, phrase chunks | black box in 9 of 12 (5J8M, eMX, FW, grr, Ik5, meK, pfv, tQk, WZ use it); no box in af; thin type in a translucent box in liXI; grey rounded box in jkz. **Other voices:** yellow italic (meK 25, 466), yellow (FW 1352, grr interviewer 823/1011) | Confirm box as default. **NEW: a second voice gets a colour as well as italics** |
| Voice LUFS / gap over bed | voice −15.23, bed −23.65, gap 8.42 LU | voice median **−21.9** (−29.0 to −18.5); gap where a bed exists median **11.3 LU** (2.2 meK to 20.4 tQk, n=10); af and jkz have no bed (−60.8, −68.4 LUFS). zig YT copy: voice −19.84, gap 8.26 | **Refine:** YouTube uploads run about 5 LU quieter than the IG copy. A gap of 8-12 LU is the norm; the bed is sometimes absent. |
| Speech rate | 2.92 words/s | median 2.56 (1.79-3.78; pfv excluded as an Arabic transcript) | Confirm |
| Brand bug | E roundel top-right | 11 of 12 (jkz has none); grr adds a series icon | Confirm |
| End card | strokes + wordmark + "SEE FOR YOURSELF" | identical on 10 of 12; variant line "WATCH THE FULL VIDEO AT THE LINK IN OUR BIO" (FW, Ik5, pfv, tQk); grr "THE CUT" card; jkz black | Confirm |
| Letterbox | n/a (native 9:16) | 16:9 material sits in a band with a **blurred copy filling top and bottom** in FW, Ik5, tQk, meK (map), pfv (satellite) | **NEW** |

---

## 4. Variation: how Evident avoids repeating itself

**Inside one video: same data, new reading.**
- 5J8M shows its one dataset (79 strikes) three ways: count (dots accumulate, 275-454), composition (recolour by category, 455-634), subset (filter to 28 schools, 1545), then zooms into one dot to reach a case (1635-1695). The map returns 4 times (188, 1458, 2902, plus satellite) but never in the same state.
- liXI's main chart changes scope three times in 14 s (one bar → six years → 2004 vs 2025, 147-567). Its later line chart doesn't cut to the donut: the line's endpoint dot **becomes** the donut (2612-2650).
- Highlighters repeat 8 times in liXI, each on a different surface: headline card (1692, 2150), white quote card (3988, 4078), second card (4198, 4288), stat over a report (3748-3928). The same pattern as the baseline's 7 highlighters on 7 objects.
- Annotation on footage changes shape with the claim. Counting people gets numbered boxes (5J8M 2293), naming an object gets a loupe (1168), following a person gets an ellipse (FW 1739), an obstacle gets an outline (tQk 277) and a trajectory gets a per-frame ring (tQk 851).
- Long devices are broken into sub-beats: the 38 s waveform in Ik5 adds a transcript line every 3-5 s, and the 17.6 s lime diagram in WZ adds an element every 2-3 s (944, 1013, 1082, 1128, 1197, 1266).

**Across videos: same grammar, different form.**
- Share: waffle (baseline B08), donut morphing from a dot (liXI 2647), red ring (meK 2005), proportional box fill (WZ 1325). Four forms, one idea.
- Trend: bar build (baseline B05, liXI 147), bar pull-back to history (liXI 324), line drawn point to point (liXI 2350, meK 1069), line plus segment bracket (meK 1216).
- Place: coast trace (baseline B03), border trace (eMX 2043), route hop with avatars (FW 161), dot plot (5J8M 275), drone ↔ satellite match (Ik5 1245), stepped zoom out (pfv 1955), distance label (tQk 1490).
- Document: crop + highlighter (baseline B11-B18, 5J8M 2550, WZ 1949), crop + blue underline at extreme close-up with depth blur (eMX 412, 4225), headline rebuilt in house type (af 394, liXI 1665), report cover with stats on top (liXI 3748), quote card carousel (liXI 3958), redacted form (Ik5 2958).
- Accent: lime is the default (9 of 12 use it as data or highlight colour), but eMX highlights in blue, meK draws data in red, and WZ flips the whole canvas to lime once. The constant is **one** accent per piece.
- Register changes by format, and the graphics follow. The studio explainers (WZ, liXI, 5J8M) have the most designed graphics and the shortest ideas (1.92-3.15 s). The forensic pieces (tQk, FW, Ik5) annotate footage and satellite rather than drawing charts. The character piece (grr) uses only two typed fact cards. The creator collab (jkz) has no animation at all.

**Rules this adds for the Ostad brand bible (additive to R1-R21):**
- A1. Let growing marks (bars, rings, background dims) **start before** the key word and land on it; keep pops and highlights within ±4 f (liXI 156-184 vs f197; WZ f732 vs f728).
- A2. Re-read one dataset instead of adding a new chart: count, then composition, then subset (5J8M 275 / 455 / 1545; liXI 147 / 324 / 504).
- A3. Morph between charts through a shared element (liXI endpoint dot → donut, 2612-2650) rather than cutting to a new card.
- A4. Annotate real footage with a shape chosen by the claim: numbered boxes for counts, a loupe for an object, an ellipse for a person, a ring per frame for motion (5J8M 2293, 1168; FW 1739; tQk 851).
- A5. Rebuild cited headlines and reports in house type with one accent highlight; dim a report and set its key numbers on top (af 394; liXI 1665, 3748).
- A6. One accent per video; it may change for the story, but never two accents on one chart (eMX blue, meK red).
- A7. A second voice (patient, interviewer) gets its own caption colour as well as italics (meK 25; grr 823).
- A8. Show each data source as itself (a GPS map, a message list, a waveform with transcript) instead of an icon (meK 2070-2133; Ik5 1790).
- A9. Letterbox 16:9 sources over a blurred copy of themselves, not black bars (FW, Ik5, tQk, pfv).
- A10. Pace by register: about 2 s per idea for a studio explainer, 3-4 s for a field or case segment (WZ 1.92 vs Ik5 4.19).

---

## Caveats

- Beat starts for board-only beats are ±1 s (tile sampling). The beat split was validated on zigiwXNHo7c (2.13 s, same as the baseline).
- Of the 14 ffmpeg-timed reveals, ROI difference also picks up caption swaps and camera moves; the timing claims above were taken only where the lime count or a strip confirmed the element (strips `v1_744.png`, `lix_31.png`, `lix_donut.png`). The Hellfire/GBU/GPS ROI numbers were too noisy (lime max 28-99 px) and are given at board level only.
- No `sfx.json` in this group, so per-graphic SFX remains unevidenced (baseline: 62.6 % hits vs 58.7 % chance).
- `camera.json` exists for only 3 videos and was not used; the camera notes above (pushes, pull-backs, zooms) come from the boards.
- pfvH4l64bi0's transcript is Arabic, so its words/s and word timing were not used.
- jkz_oxibzl4 (no E bug, no bed, a different caption box) looks like a creator collaboration. It is kept in the shares but contributes no animation techniques.
