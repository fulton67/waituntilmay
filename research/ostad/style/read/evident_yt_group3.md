# Evident YouTube Shorts, group 3 (13 videos): frame-by-frame read, added to the Ddos1QZRGmV baseline

The baseline is `read/ig_Ddos1QZRGmV.md`. This read adds to it and does not replace it. Where a number differs, both values are given.

**Sources.** All 41 reading boards in `sheets/evident_yt_shots/` were opened (2+3+3+3+4+3+5+3+4+3+3+2+3 = 41, which matches the files on disk). We also used the per-second word files (`<id>.txt`) and `measure/evident_yt/<id>/` (cuts, loudness, transcript, probe; palette/camera for 6; graphic_elements for 8). We added close-up frame strips and per-frame lime-pixel probes decoded with OpenCV. Those scripts and images are in the session scratchpad (`g3_nums.py`, `g3_cats.py`, `g3_probe.py`, `g3_strip.py`, `g3_px.py`, `evyt_frames_3/`).

**Missing files.** **pacing.json is missing for all 13 videos**, so words/s comes from transcript.json. sfx.json is missing for all 13. text_elements.json exists only for 4LO3. graphic_elements.json is missing for iZ4, lWhymh, oomds, tpOi and ymd9. camera.json is missing for 7 videos (we did not use it).

**Frame numbers.** These are 0-based at each video's **native fps**, which is not always 30: 23.976 for 4LO3, 9NFht, KpxIZ, lWhymh, oomds, tpOi and ymd9; 25 for VBKS; 30 for D_bh, fpXw, GRMV, idX6 and iZ4. Board tiles marked CUT sit 3 frames after the cut.

**Categories** (tiles counted with the boards' own rule: one per cut +3 f, then one per second):
- P: host or presenter, including the presenter with a type overlay
- I: interviewee or news-clip speaker
- F: footage, archive, b-roll
- G: designed graphic
- D: document, web or screen crop
- E: end card

"Ideas" are hard cuts plus in-place reveals we logged from the boards.

---

## 1. Per video

### 4LO3_wjzXak: "This 'less-lethal' weapon can blind and kill" (FN-303 launcher; correspondent Dexter Thomas)
75.5 s, 23.976 fps, 1808 f, **52 hard cuts**, shot median 1.17 s, ideas 70 at median **0.75 s**. Tiles (88): F 60, P 10, I 5, G 6, D 2, E 5. Seconds: F 67%, P 10%, I 6%, G 7%, D 3%. 2.65 words/s.
- **1442-1521, "we've uncovered data that shows how dangerous this weapon can be."** A grey wireframe-like product shot of the launcher on near-black. At about 1508 a lime leader line and a ring target pop out of the muzzle carrying the velocity figure (green "280 FEET PER SECOND"-style label). The number is attached to the object, not set on a chart.
- **1522-1577, "Even when you follow the instruction manual."** Hard cut to the real manual page. A lime band lights the spec row "280 - 300 ft/s" (visible at 1548), so the same number now has a document behind it. The pair is graphic claim → document proof.
- **1339-1381, "we've worked with the Human Rights Center."** Huge outline-free white caps "HUMAN RIGHTS CENTER / UC Berkeley School of Law" sit over real range footage: a partner credit set as a title.
- **696-823.** WCVB archive. The first 3 tiles (696-739) are threshold-posterised to black and white silhouettes over "A so-called less-lethal weapon killed…", then the clip returns to normal colour at 754. The treatment marks the archive as the death report. All on-scene and archive speech is captioned in **lime italics** ("Range is hot!" 164, "weapon killed sophomore" 754), while narration is white roman.

### 9NFht6oucPU: "ICE detention of children is surging" (Zach Toombs, studio)
132.4 s, 23.976 fps, **31 cuts**, shot median 3.21 s, ideas 54 at median **1.84 s**. Tiles (142): P 52, F 43, G 27, D 8, I 7, E 5. Seconds: P 37%, F 29%, G 19%, D 6%. 2.62 w/s.
- **253-358, "This is all according to an analysis from the Marshall Project."** The headline is *rebuilt*, not cropped. The outlet wordmark is in its own blue; the headline is in Evident's sans on a near-black canvas (#141215), with date and bylines in lime micro-type, a cream bar entering top-left and a blue diagonal bar bottom-right. The lines appear by 273. The lime highlight then runs **across 3 lines from 290 to ≈320 (30 f, 1.25 s)**, starting 3 f after "This" (287). It lands on the attribution sentence, not on a headline word.
- **547-813, the "easiest catch" quote card.** An archive photo of a child is tinted deep blue-violet (#35279E), with a white quote "They're probably the easiest catch…", said Veronica Franco Salazar, and a source tag top-right. A lime highlight on "easiest catch" grows **628→655 (22 f to 90%)**, which is **14 f before** the narrator says "easiest" (642). It stays lit for 158 f while the narrator paraphrases.
- **1497-1659, "one advocate says it's only a matter of time."** A full article page sits small on black (1497). A white box isolates the quote line (1540). Then a hard cut to a 3x punch-in on that paragraph (1570), where the lime highlight sweeps "It's only a matter of time" (1613-1636). This is a two-step zoom by cut instead of a camera move.
- **2576-2809.** TIME headline card (typed in at 2596, then a progressive highlight 2619→2665 across 3 lines), then a CNN card with **two separate highlighted phrases**, "back in" and "Minneapolis" (2734-2780). There are 3 headline cards in one video, each in its outlet's own wordmark colour.

### D_bh30x6w9c: "What is FISA?" (Ben C. Solomon)
127.0 s, 30 fps, **27 cuts**, shot median 4.50 s, ideas 61 at median **1.10 s**. Tiles (127): P 49, G 38, F 23, D 11, E 6. Seconds: P 38%, **G 31%**, F 18%, D 9%. 2.70 w/s.
- **994-1272, the Section 702 explainer (build in place, 9.3 s).** The cut on "Government can spy" (1015) reveals a blue/white eye icon, a blue US map and lime person figures. A **dashed white target box** snaps around the person *outside* the map on "abroad" (1078). Phone icons appear by 1111. A **dashed arc** links the foreign person to the American on "speaks about anyone in the US" (1138-1180). The target box then **moves onto the American** on "that American can also get" (1201-1231). The selection box *is* the surveillance.
- **1350-1469, "phone records, emails, text messages."** Three icon cards (CALLS phone, EMAILS envelope, TEXTS speech bubble), each a lime pictogram under a cream caps label. Each hard swap lands within ±2 f of its noun (cut 1347 vs "phone" 1348).
- **1619-2149, "3.4 million warrantless searches… more than the population of Chicago, or 1 in 100 Americans."** The FBI HQ photo darkens, the seal appears, and a lime "2021" tag pops (1646). "3.4 million" **fades in left to right letter by letter, 1706-1724 (18 f)**, 6 f after "3" (1700). The card then compresses upward, and a lower panel holds Chicago with "2.7 million population of Chicago, 2020 census" (1925). That swaps in place for "1 in 100 Americans" over a blue US map with one lime figure (2015). This is a **scale analogy stack**: the abstract number sits above a familiar one.
- **3289-3422, "Congress had until April 20th… they punted it to April 30th."** A white "April 20" sits over the photo. A **lime strike-through draws 3350→3358 (8 f)**, 3 f before "decision" (3353). The old date dims and slides up, and "April 30" fades in **3374-3378 (4 f)**, 2 f after "punted" (3372) and **16 f before** "April 30th" is spoken (3390). Also seen: a "FISA" word slam over the presenter (120) and "WARRANT" over the split portraits (2989).

### fpXw0rLD5gE: "Transgender soldiers are challenging Trump's ban in court" (Dexter Thomas interviews Dan Ming)
137.6 s, 30 fps, **41 cuts**, shot median 3.15 s, ideas 61 at median **2.30 s**. Tiles (141): P 82, F 28, G 19, I 6, E 6. Seconds: **P 59%**, F 20%, G 14%. 2.83 w/s. Detector dissolves: 131 at median 3 f (the animated glow of the call frames, not editorial).
- **0-238, hook title.** Black text on **lime blocks, one block per line**, left-aligned over real footage of the soldier. The block sits where the caption usually would.
- **570-…, two-up conversation layout, used 6 times.** Host and guest sit in two stacked rounded windows with a lime glow edge on a black canvas, while cream and lime arc shapes drift behind. The layout returns at 875, 1034 and later, alternating with full-frame singles of whichever person is speaking.
- **730-874, "two federal judges agreed…"** A kinetic headline "Federal judges block Trump ban" slides horizontally with echo copies (737-854). Below it is a **horizontal timeline carousel of circular blue-duotone portraits with lime rings**: "MARCH 18 / U.S. District Judge Ana C. Reyes" (737), then the strip slides to "MARCH 27 / Benjamin Settle" (794).
- **1248-1424, "the Supreme Court allowed them to implement the ban."** An NBC headline rebuilt in Evident type with a lime highlight, also sliding horizontally, over a blue-duotone photo of the justices, with an Evident watermark bottom-right.

### GRMVbXpO1jQ: "The Iran War is burning through US weapons stockpiles" (Ben C. Solomon)
155.2 s, 30 fps, **52 cuts**, shot median 1.90 s, ideas 83 at median **1.20 s**. Tiles (161): P 75, G 40, F 40, E 6. Seconds: P 47%, G 26%, F 24%. 2.83 w/s.
- **202-888, three spec cards in a carousel.** Each card is a green wireframe missile on pure black (#000000) with a type label. The count rolls 950+ (202) → 979+ (229) → 1,000+ (259), reaching 1,000 about 50 f before "thousand" is spoken. A lime "$2.6M cost per unit" pops at 285, 1 f after "used" (284), **although the narrator never says that figure**: the card carries an extra data layer. On "Patriot" the whole card slides left and the Patriot card enters (469-499), counting 1,123+→1,200+. THAAD follows the same way at 619.
- **889-1108, "Overall, stockpiles have been significantly depleted."** Three **donut gauges**. Each ring fills clockwise from 12 o'clock in about 28 f (Patriot 889→917), its % label fades in at about 60% of the fill (905-909), and the next ring starts **12 f** later (THAAD 901). All three are full by 929, 27 f before "depleted" (956).
- **1548-1845, "a handful of defense contractors… $771 billion."** Five logos fade in top to bottom with about 3 f stagger and about 12 f fades, starting 1 f after "handful" (1550). From 1641 the stack shrinks upward while a **lime dome rises from the bottom edge (1647-1683, 36 f)** carrying "$771 BILLION" in black. It settles **38 f before "$771" is spoken (1721)**, on "Between 2020 and 2024".
- **2950-3550, numbers over the presenter.** Lime "$25 BILLION" (2980) swaps in place to "$35 BILLION" (3070). Then come "$80" → "$80-100 BILLION" (3209-3239), "42%" plus a lime rising-arrow glyph and "MILITARY BUDGET INCREASE" (3346-3376), and "$1.5" → "TRILLION" stacked (3436-3466). Six numbers sit beside his face with no canvas. Also seen: "LOGISTICS" (1390), and the "EXPENSIVE, / SLOW, / AND PRIVATIZED" list building word by word (2216-2246).

### idX6wSvZqyw: "How you can protect voting rights at a local level" (Caitlin Sievers, Arizona Mirror)
124.1 s, 30 fps, **36 cuts**, shot median 3.13 s, ideas 66 at median **1.00 s**. Tiles (130): P 48, F 32, G 29, D 17, E 4. Seconds: P 37%, F 26%, G 23%, D 10%. 2.87 w/s.
- **619-976, "become a source of trustworthy… information… for your friends, family, and community members."** A single lime square grows to full size **619→639 (20 f)**, 2 f before "Maybe" (621), and gets the label "YOU". It holds, then **shrinks by 59% (722→769)**, an anticipation squash. Then a **node network bursts out along right-angle lines, 784→834 (50 f)**, 1 f before "nonpartisan" (785). FRIENDS, FAMILY and COMMUNITY labels attach to nodes on their words (891, 910, 938).
- **1335-1499, "checking your voter registration at my.arizona.vote."** A real screen recording of the state portal sits in a phone-like frame and scrolls. A hard cut punches in on the header, and a **lime box lights "my.arizona.vote"** (1433) as the URL is spoken (".arizona" 1420, ".vote" 1453).
- **2223-2401, "a valid Arizona driver's license, tribal ID, or federal ID."** On a dark dot-grain canvas, a lime title "Arizona's acceptable forms of voter ID" appears. Each list item is **typed letter by letter** as it is said ("Feder" half-typed at 2340).
- **3077-3306, "no one, not even a federal agent, is allowed to intimidate…"** The rights sentence is typed letter by letter in white over defocused footage of a ballot ("No|" at 3077), finishing at 3254. Also seen: an "Oct 23, 2026" lime tag over the presenter, built in 2-3 f steps **1682→1687**, which is 5 f before "October". The azsos.gov scroll at 2568-2787 shows a **real mouse cursor** (2595-2625) and gold row highlights.

### iZ4ljC_4Rb4: "Will ICE body cameras lead to accountability?" (Lila Hassan)
173.3 s, 30 fps, 720x1280, **100 cuts**, shot median **0.80 s**, ideas 126 at median **0.53 s**. Tiles (205): F 112, P 61, D 21, E 11. Seconds: F 47%, P 36%, D 12%, **G 0%**. 3.06 w/s (fastest).
- **510-583, "when I made a Freedom of Information Act request… ICE denied it."** The FOIA reply letter sits on black in a mono font. A lime highlight on "unable to accept this request" fills **535→548 (13 f)**, **18 f before** "ICE" (553). At 567 the **rest of the page dims and blurs** so only the lit line remains. Cut at 581.
- **1528-1747.** A Policing Project article is rebuilt dark, with a highlight on "Body cameras don't alter police behavior…" (1593). Then a **torn-paper newspaper clipping** "BODYCAM VIDEO CONTRADICTS ICE CLAIMS…" arrives with a lime date tag "MARCH 7, 2026" (1673).
- **3375-3514, "the lawsuits… were dismissed."** A Bloomberg Law article card sits on black. The page dims to grey and a **white box isolates "Cleared in Shooting"** (3463), with the box scaling up as the background darkens.
- **1289-1388.** Two bodycam clips are stacked top and bottom. Elsewhere 50+ bodycam shots are cut at 0.2-1 s. On-scene speech gets lime italics ("I've got one guy" 2643). Designed graphics are absent: every visual is real footage or a real document.

### KpxIZIXXFyQ: "Verifying threats and debunking disinformation in the U.S. midterms" (Evident team announcement)
107.3 s, 23.976 fps, **26 cuts**, shot median 3.96 s, ideas 46 at median **1.42 s**. Tiles (115): P 59, G 20, I 20, F 12, E 4. Seconds: P 51%, G 18%, I 18%. 2.74 w/s.
- **1238-1265, "of election chaos."** A lime box with black type writes on over the presenter's chest: "ELEC" box **1241-1248**, starting 4 f before "election" (1245). Line 2 "CHAOS" follows **1250-1257**, 5 f before "chaos" (1262). It holds to 1265, then a hard cut. (It is first teased as a cropped "ELECTIO" at 218.)
- **801-930 and 1281-1375, "AI-generated content… to debunk AI disinformation."** Three real AI images are stacked as cards with lime frames, each tagged with a red "AI-generated" label and crossed by a **red diagonal strike line**. The stack scrolls up and a new card enters at the bottom on each phrase.
- **294-392 and 502-639.** AP and Guardian headline cards. The Guardian card lights **two separate phrases**, "reporting" (545) and "voter fraud" (568), one per spoken clause.
- **1441-1672.** A KTXS clip of Trump with **speaker-labelled lime italic captions**: "REPORTER: Would you send the…" / "TRUMP: Well, you know what?" A row of real platform logos (Instagram, Facebook, YouTube, TikTok, Bluesky) pops under the lime tag "TAG OR MESSAGE EVIDENT" (2097-2203), on "tag us or message us on any of these platforms".

### lWhymh_G-WI: "How does offshore wind factor into Trump's lust for Greenland?" (Atmos co-production, Miranda Green)
139.8 s, 23.976 fps, **38 cuts**, shot median 2.46 s, ideas 69 at median **1.38 s**. Tiles (151): F 58, G 48, P 40, E 5. Seconds: F 36%, **G 34%**, P 27%. 2.64 w/s. This video uses a partner style: serif location labels, centred two-line captions without a box, and an Atmos end card instead of Evident's.
- **140-539, "five major offshore wind projects… off Rhode Island and Massachusetts."** A muted real basemap (Mapbox credit). Ring pins drop with labels (Empire Wind 1, Revolution Wind…, 160-206). The map pans north as the coast is named (229-298). A government document card fades over the map, which dims (344-436, "stop work orders"). On "Danish company Ørsted" a **leader line drops from the pin to a Danish flag and Ørsted wordmark** (505).
- **932-1184, "Greenland is a Danish territory… would put Greenland on the table."** The island is cream with a "GREENLAND" label (932). The **Danish flag fills the island's shape** from 952, reaching full by 975, starting before "Danish" (961). The map pans south (1067), and two **circular portrait badges**, Trump with the US flag and Frederiksen with the Danish flag, pop beside the wind-farm pin (1090-1159).
- **2335-2453, "a poll found that the majority wanted… its own nation."** A white donut on a darkened glacier photo, with a serif title and source line. The ring fills to 56% (2335→2355), the number settles, and the ring holds 4 s.
- **2781-2834, "He told reporters… 'we need Greenland.'"** A B&W photo of Trump. The quote **builds word by word**: "WE" (2781), "WE NEED" (2801). The map then returns at 2835 to close on Ørsted, which bookends the video. The rare-earth beat (2032-2176) uses 4 real specimen photos with one serif element name each, swapped on a ~1 s beat.

### oomds0rZz_o: "ICE's for-profit prisons" (Zach Toombs)
120.3 s, 23.976 fps, **34 cuts**, shot median 1.67 s, ideas 54 at median **0.79 s**. Tiles (134): P 56, G 48, F 16, D 9, E 5. Seconds: P 44%, G 33%, F 13%, D 7%. 2.58 w/s.
- **75-378, "CoreCivic and GeoGroup… reaping record high revenue."** A satellite photo of a detention centre carries the CoreCivic logo. A **horizontal line wipes the frame into a top/bottom split** (118) and the GEO logo takes the lower half. Lime "EST 1983/1984" tags type in (187). From about 256, about 6 f before "revenue" (262), two **counters roll in sync**: $2,070,175,438 → $2,200,000,000 (top) and $2,568,245,614 → $2,630,000,000 (bottom). They settle by 302, on "role" (293).
- **1958-2197, "The more people these companies detain, the more taxpayer dollars go… to their highly paid executives."** A cause → effect chain built in place:
  - A blue-duotone circular vignette of handcuffed hands shrinks and climbs in **8-frame steps** (cuts at 1958, 1966, 1974, 1982, 1990, 1999, 2006, 2014…, about 3 updates/s, so the detector counts 12 "cuts").
  - Company logos appear under it (1999).
  - "TAXPAYER $$$" in lime with an up-arrow into the circle arrives at 2046, 9 f after "taxpayer" (2037).
  - Arrows run down from the logos to two blue-duotone executive portraits with lime "$7.4M" / "$5.6M TOTAL COMPENSATION FY 2024" (2120-2166), on "executives" (2129).
- **604-707, 1130-1250, 1392-1579.** Three headline cards in a row of the video: Guardian ("Amazon Prime for human beings"), Vox ("stop using private prisons") and POGO (the highlight walks 4 lines 1435→1527). The POGO card adds a lime arc top-left (1527) that the other two lack.
- **2581-2784.** A Marshall Project page on white, with a 4-line highlight following the analyst quote as it is read (2601→2762).

### tpOiUZyjnvM: "Who is fueling Sudan's civil war?" (field investigation, Libya)
120.8 s, 23.976 fps, **29 cuts**, shot median 3.32 s, ideas 44 at median **2.73 s**. Tiles (129): F 74, I 21, D 16, P 14, G 4. Seconds: F 56%, I 17%, D 13%, P 11%, G 3%. 1.57 w/s (long sync-free stretches).
- **0-81.** The title "WHO'S BEHIND THE NETWORK SMUGGLING ARMS INTO SUDAN?" in right-aligned white caps over a parade shot, as a hook with no presenter.
- **2524-2893, "The UAE's foreign ministry told us, quote, …"** The real ministry letter appears on white, then **dims to grey (2567→2590)** while lime highlights pick out the quoted lines as they are read. A **second highlight block is added under the first** for "Our role is to support a ceasefire…" (2682-2705), and both stay lit until 2866. With 15 s on one document, this is the longest hold in our group.
- **1564-1920 and 2110-2236.** An interview with Khalid Haftar (name super "Commander, Libyan National Army" 1584-1676). His Arabic answers are subtitled in white. On-scene English ("There is no doubt that the security of any nation", 880) is in lime italics. No end card.

### VBKS7NdZAoU: "'We live in prisons.' Checkpoints strangle life in the West Bank"
94.6 s, 25 fps, **25 cuts**, shot median 3.02 s, ideas 40 at median **1.68 s**. Tiles (98): I 48, F 41, P 3, E 6. Seconds: I 49%, F 41%, P 3%, **G 0%**. 1.80 w/s (Arabic).
- The video is pure verité: 2-line translation captions, a name super "Walid Fuqaha / Resident, Sinjil" (1514-1689), and a speaker label "FIRAS:" for the off-camera interviewer (1427-1474). The visual metaphor comes from the shooting itself. The fence is shot through the wire (1233-1330) as he says "like a bird in a cage" (1385), and he is framed against razor wire throughout. This shows that Evident runs zero designed graphics when the footage carries the argument.

### ymd9fq6M8t8: "How the 'billionaire loophole' is allowing even more money in politics" (Baylor Spears)
128.4 s, 23.976 fps, **29 cuts**, shot median 3.17 s, ideas 57 at median **1.21 s**. Tiles (133): F 45, P 42, G 42, E 4. Seconds: F 34%, P 32%, **G 31%**. 2.98 w/s.
- **571-682, "Spending on Wisconsin elections has exploded since 2015."** A line chart on black. The line draws segment by segment **573→628 (55 f)**, starting exactly on "Spending" (573). The head dot **carries a rolling value label** ($20.49M → $37.42M at 593, $51.96M…), and each finished vertex keeps a static lime label. An olive area fill follows under the line, and the frame rescales as the line climbs to $164M (628, on "since"). It then holds 54 f.
- **891-1300, "individuals are limited… but not in how much they can give to political parties."** An **isometric wireframe flow diagram** in lime. The donor (lime square) points to three "Campaigns" boxes through a white "LIMITED" tag (980). A large "Political Parties" box drops in above (1049). A blue "UNLIMITED" tag and a dashed blue path bypass the limit (1072-1141). The camera rises to follow the money and then re-centres (1164-1279).
- **683-890 and 1413-1547.** A Scott Walker cut-out sits over a B&W halftone Capitol with a typed lime name tag, and "Unlimited amounts" is slammed on "unlimited" (864). Over the presenter: "3 billionaires" (1413), then "90%" (1459), each in a lime block.
- **2414-2578, "Justice Elena Kagan wrote in her dissent…"** The full quote is laid out dim over her portrait and each word brightens as read ("With no limits on spending" lit at 2480, finished at 2549). This **confirms the baseline karaoke device (B26)** on a second video. Also seen: The Hill headline typed letter by letter (2257) with a highlight that progresses with it.

---

## 2. Technique catalogue (13 videos)

Counts are instances seen on the boards. "Δ word" is the reveal start minus the key word's onset, in frames (negative means before the word).

| # | Technique | n | Examples (id frame) | Trigger in speech | Enter / exit | Δ word | vs baseline |
|---|---|---|---|---|---|---|---|
| T1 | **Lime highlighter on a document or headline** (single line, multi-line, or 2 separate phrases) | **25** in 10 videos | 9NF 290, 9NF 628, 9NF 1613, 9NF 2734; iZ4 535; tpO 2567/2682; KpX 545/568; oom 1435; ymd 2257; 4LO 1548; D_b 726 | the quoted or attributed phrase | sweep L→R, multi-line runs line by line; 13-30 f; stays lit to the cut | +3, −14, −18 | baseline (R9); **refined**: multi-line sweeps last 30 f, 2 phrases per card, and it often runs *before* the word |
| T2 | **Keyword or number slam over the presenter** (lime block with black type, or lime type alone) | **17** in 6 videos | GRM 1390, 2216-2246, 2980-3466 (6); KpX 218, 1241; ymd 130, 864, 1413, 1459; D_b 120, 2989; idX 1682 | the noun or number in the sentence | 3-8 f pop or write-on box, held to the end of the clause, hard cut out | −4, −3, −5 | **NEW**: baseline numbers lived on a canvas; here they sit on the presenter's chest or beside the face |
| T3 | **Headline rebuilt as a brand type card** (outlet wordmark in its own colour, Evident sans headline on #141215, date and byline in lime, cream bar plus blue diagonal bar) | **10** in 5 videos | 9NF 253, 2576, 2688; KpX 294, 502; oom 604, 1130, 1392; fpX 1248; ymd 2237 | "according to X", "X reported" | lines appear or type in, then T1 highlight; hard cut | +3 | **NEW** (baseline cropped real pages) |
| T4 | **Archive in a band or window** (16:9 clip in a band over a blurred copy, or TV clip in a window on black) | **6** | GRM 2501, 3589, 3955, 4314; KpX 1376; iZ4 3699 | any archive | hard cut | n/a | variant of baseline's rounded window (B19) |
| T5 | **Typewriter text** (list, law quote, name tag, headline) | **6** | idX 2223, 3077; ymd 683, 2257; KpX 1241; lWh 2781 (word build) | the item being listed or quoted | letter by letter, following speech | 0 to −5 | baseline (B09, B14); **new use**: lists and the law quote over footage |
| T6 | **Split screen**: stacked two-up | **5** + 6 returns | fpX 570 (×6), D_b 2899, ymd 1745, iZ4 1289, oom 118 | two people or two sides | line wipe (oom 118) or cut | n/a | **NEW** |
| T7 | **Blue duotone photo** (portrait circles, quote backgrounds, vignettes) | **5** | 9NF 547; fpX 737, 1248; oom 1958, 2120 | person named or quoted | pop, sometimes in a lime ring | n/a | **NEW** |
| T8 | **Map device** (pin drop, pan, flag fill, portrait badges, target box) | **5** | lWh 160, 505, 952, 1090; D_b 994, 2015 | a place named | pins pop, pans eased, flag fills the shape | ≈ −10 (flag) | baseline had 1 coast trace; **new forms** |
| T9 | **Counter** (rolling digits) | **5** | GRM 202, 469; oom 256 (×2 in sync); ymd 573 (rides the line head) | a number | linear roll that settles on the clause | −6 to −50 | baseline (B07); **new**: label rides a moving point (ymd 573) |
| T10 | **Flow diagram / network built in place** | **4** | idX 619-946; D_b 994-1272; oom 1958-2197; ymd 891-1300 | a mechanism ("who can see whom", "where money goes") | nodes pop, lines draw, camera follows; 9-17 s holds | −1, −2 | **NEW**, and the most useful device for explaining *how* something works |
| T11 | **Literal icon set** | **4** | D_b 145 (phones and envelopes on a web), 1350-1469 (CALLS/EMAILS/TEXTS); KpX 2117 (platform logos); GRM 3376 (up-arrow) | a concrete noun list | hard swap per noun | −1 | **contradicts baseline R1 ("no icons")**: icons appear, but only as the literal noun spoken |
| T12 | **Document isolate** (dim or blur the rest, box one line) | **4** | iZ4 567, 3463; tpO 2567; 9NF 1540 | the exact quoted line | dim 15-25 f after the highlight | after T1 | **NEW** extension of T1 |
| T13 | **Strike-through** (date or claim) | **3** | D_b 3350 (lime, date); KpX 801, 1281 (red diagonal over AI images) | a correction or a fake | 8 f draw, old item dims and moves | −3 | **NEW** |
| T14 | **Logo stack** | **3** | GRM 1551; oom 75, 1999 | "a handful of companies" | 3 f stagger fade top to bottom | +1 | **NEW** |
| T15 | **Donut / ring gauge** | **2** (4 rings) | GRM 889 (3 rings, 12 f stagger); lWh 2335 | share or % | clockwise fill ≈28 f, label at ≈60% | −6 | **NEW** (baseline: waffle for share) |
| T16 | **Scale analogy stack** | 1 | D_b 1898-2149 | "for context, that is more than…" | the card compresses upward, a comparison panel swaps below | n/a | **NEW** |
| T17 | **Dome or panel rising with a hero number** | 1 | GRM 1647 | the total | rises 36 f from the bottom edge, pushing the logos up | **−74** (on the clause before) | **NEW** |
| T18 | Line chart, segment by segment, with area fill | 1 | ymd 573 | "has exploded since 2015" | 55 f draw, frame rescales | 0 | **NEW** (baseline: bars only) |
| T19 | Carousel of cards (spec cards, timeline portraits) | 2 | GRM 469/619; fpX 737-874 | the next item in a series | horizontal slide | ≈0 | **NEW** |
| T20 | Karaoke quote (dim, then lit word by word) | 1 | ymd 2480-2549 | a judge's dissent | per word | ±1-2 | baseline (B26), **confirmed** |
| T21 | Screen recording of a real website (device frame, punch-in, highlight; a cursor is visible) | 2 | idX 1335-1499, 2568-2787 | "go to X.gov" | cut-zoom, then a lime box | ≈0 | **NEW**; a real cursor appears (2595), the only "UI" seen |
| T22 | Torn-paper clipping with a date tag | 1 | iZ4 1673 | "contradicted ICE's narratives" | pop | n/a | **NEW** |
| T23 | Stepped motion at 8 f (≈3 fps) | 1 | oom 1958-2054 | the build-up of a chain | stop-motion steps | n/a | **NEW** (baseline stepped on 2s/3s) |
| T24 | Document double exposure over archive | 1 | D_b 534-638 | "created in 1978 after Watergate" | the law text overlays Nixon footage, with a lime highlight on the act's name | n/a | **NEW** |
| T25 | Social-post card over a photo | 1 | D_b 2276-2403 | "Trump once said…" | pop on the photo | n/a | **NEW** |
| T26 | Hook title over opening footage (lime line blocks or white caps) | 2 | fpX 0; tpO 0 | the video's question | on from f0, held 2-8 s | n/a | **NEW** (baseline opened on the presenter) |
| T27 | Archive treatment change (posterise/threshold) | 1 | 4LO 696-739 | a death report | 3 tiles, then normal colour | n/a | cousin of the baseline tape glitch (B23) |
| T28 | Specimen sequence (photo + single serif label) | 1 | lWh 2032-2176 | a list of named things | cut on each name | ≈0 | **NEW** (partner style) |
| — | Name super (white bold name, lime role, no box, lower left, 3-5 s, fade out) | 13/13 | 4LO 255, 9NF 379, D_b 420, … | first appearance | fade | n/a | baseline (B01), **confirmed** in all videos |
| — | Caption speaker coding (narrator white roman; other voices **lime italic**; speaker labels "REPORTER:", "TRUMP:", "FIRAS:") | 7 videos | 4LO 164, 9NF 2368, iZ4 2643, KpX 1441, tpO 880, VBK 1427 | change of speaker | hard swap | n/a | **refines** baseline (italic only for a quote) |
| — | Brand end card (EVIDENT glitch strokes + "SEE FOR YOURSELF") | 10/13 | GRM 4512 etc.; fpX promo card; lWh Atmos card; tpO none | — | — | — | baseline (B27), **confirmed** |

**Top 5 by count:** T1 highlighter 25 · T2 slam over presenter 17 · T3 headline type card 10 · T4 archive band/window 6 · T5 typewriter 6. Close behind: split screen, duotone, map and counter, each at 5.

---

## 3. Numbers vs the baseline

| Measure | Baseline (Ddos1QZRGmV) | Group 3, 13 videos (median, range) | Verdict |
|---|---|---|---|
| Seconds per visual idea | 2.13 s (p90 5.19) | **1.13 s** pooled (p90 4.87, n = 831); per video 0.53 (iZ4) to 2.73 (tpOi), median 1.21 | **Faster.** Inflated by bodycam bursts (iZ4) and the 8 f steps (oom 1958); excluding those, design-led videos sit at 1.0-1.4 s |
| Shot length | scene median 2.57 s | **3.13 s** (0.80-4.50) | Similar: Evident builds inside shots, so ideas outnumber cuts by 1.6-2.3x |
| Hard cuts / min | 21 per 98.5 s ≈ 12.8 | median **16.3/min** (12.8 D_b to 41.3 4LO; iZ4 34.6) | Same order; field and bodycam videos run 2-3x faster |
| Reveal timing | median **+1 f**, abs median 2 f, 65% ≤3 f | **median −2.5 f**, abs median 3 f, **56% ≤3 f** (n = 18 measured: −74, −18, −14, −6, −6, −5, −4, −3, −3, −2, −1, −1, 0, +1, +1, +2, +3, +6) | **Refine:** pops land on the word ±3 f; data cards and highlights often *lead* the word (−14 to −74 f) and build on the clause before |
| Share by time | G 38.7%, D 9.5%, archive 26.8%, presenter 20.6% | pooled **P 34.8%, F 31.5%, G 18.8%, I 6.4%, D 4.8%, E 3.7%**; G per video 0% (iZ4, VBK) to 34% (lWh) | **Lower G, higher presenter.** Explainer-led videos (D_b, lWh, oom, ymd, GRM) run 26-34% G; field reports run 0-7% |
| Element entry | settle 5.5 f median, p90 19 | graphic_elements settle median **2-5 f** (p90 9-16) across 8 videos; 88-98% enter mid-shot | Confirmed, slightly snappier |
| Cut vs dissolve | 0 crossfades | no editorial crossfade seen on 41 boards; detector "dissolves" 2-131 per video, median 3-9 f, all inside animations (fpX 131 = glow frames) | Confirmed |
| Duplicate-frame share (whole video) | G 44%, presenter 0% | 0-11.1%, median 1.7% (highest: fpX 11.1%, oom 7.7%) | Less 12 fps stepping overall; oom uses deliberate 8 f steps |
| Accent lime | #D9ED55 | #D8FA61, #D9FB5B, #DBFF5B, #DEF268 (4 samples) | Same role, renders slightly greener and brighter on YT |
| Data blue | #4D63CA | #4657D5, #3655DA; quote duotone #35279E | Same family, more saturated |
| Canvas | charcoal #313032 | **near-black #141215 / #151216 / #1B1522**; spec cards pure #000000 | **Darker** canvas on YT Shorts |
| Caption | black box, white sans, 77% H, hard swap | same box style; centre ≈69-79% H (GRM ≈69-72%, others ≈75-78%, pixel read); partner video lWh has no box, 2-line centred | Confirmed. The pixel height read was inconclusive (dark clothing trips the detector), so take box height from the baseline |
| Loudness, mix | −14.7 LUFS (IG) | **−21.7** median (−29.8 to −19.5) | YT files sit lower; no fixed target |
| Voice over bed | 8.42 LU | **10.24 LU** median (6.51 VBK to 19.01 idX) | Confirmed and wider: always ≥6.5 LU |
| Words/s | 2.92 | 2.70 median (1.57 tpO to 3.06 iZ4) | Similar |

---

## 4. Variation: how Evident avoids repeating itself

**Within a video.**
- **One grammar, a different variable each time.** 9NF uses 3 headline cards (Marshall 253, TIME 2576, CNN 2688). Each is in its outlet's own wordmark colour. The highlight lands on 1 phrase (Marshall), on a progressive 3-line run (TIME), and on 2 separate phrases (CNN). oom repeats the pattern with Guardian, Vox and POGO, and only POGO gets the lime arc (1527).
- **Numbers change form as they repeat.** GRM uses 15 number displays: counters on spec cards (202-888), donuts (889), a dome (1647), then 6 lime numbers over the presenter (2980-3466). The over-presenter numbers themselves vary: a swap ($25B→$35B), a range build ($80→$80-100B), an icon added (42% plus arrow), and a stacked unit ($1.5 → TRILLION).
- **Builds instead of new cards.** The long in-place builds run 9.3 s (D_b 994-1272), 11.8 s (idX 619-976), 17.1 s (ymd 891-1300) and 10.0 s (oom 1958-2197). Each adds one element per clause. That is the baseline R5 logic, with diagrams in place of bars.
- **Bookends.** lWh opens and closes on the same wind-farm map (140 / 2835-3108). D_b opens with the FBI seal (145) and reuses it for the data card (1646). Repetition is used as structure.
- **Medium matches the claim.** iZ4, a video about footage access, has 0% designed graphics: only bodycam footage and documents. VBK (about confinement) shoots through the fence instead of animating it. KpX (about debunking) crosses out the fakes in red.

**Across videos.**
- The constants are the lime highlight, the black caption box, the name-super format (13/13), the EVIDENT end card (10/13), lime italics for other voices (7), and the near-black type-card canvas.
- The same device returns in a different form:
  - **share**: waffle (baseline) → donut (GRM, lWh)
  - **number**: bar + tag (baseline) → counter on a spec card (GRM) → line head (ymd) → dome (GRM) → slam over presenter (GRM, KpX, ymd)
  - **place**: coast trace (baseline) → pin drop + flag fill + badges (lWh) → target box on a map (D_b)
  - **quote**: karaoke (baseline, ymd) → typed over footage (idX 3077) → word build (lWh 2781) → duotone quote card (9NF 547)
- Different presenters bring different sets. Ben C. Solomon's two videos (D_b, GRM) are the most graphic-dense: 31% and 26% G, 38 and 40 G tiles. Zach Toombs (9NF, oom) relies on headline cards: 3 each. Field correspondents (4LO, tpO, VBK, iZ4) run 0-7% G.

---

## 5. What this adds to the rules (for the brand bible)

- **R2 (reveal on the word) refined.** Pops (box, tag, icon swap) go within ±3 f of the word (D_b 1347, KpX 1241, ymd 130). Builds that need time (a highlight over 3 lines, a dome, a ring set) should **start up to 0.5-2.5 s early, on the clause before**, and be finished when the number is spoken (GRM 1683 vs 1721; GRM 929 vs 956; iZ4 548 vs 553).
- **R1 (no widgets) refined.** Icons are allowed only as the literal noun he says (D_b CALLS/EMAILS/TEXTS; KpX platform logos). Selection boxes, arrows and dashed paths are allowed when they *are* the mechanism (D_b 1078-1231; oom 2046; ymd 1072). Still no play/pause, no step player and no decorative icons. The one cursor seen is inside a real screen recording (idX 2595).
- **New candidates for Exomind** (blues in place of lime, per client):
  - mechanism diagram built in place (T10: e.g. stress → cortisol → skin, one node per clause)
  - journal headline rebuilt as a type card (T3) with the isolate step (T12)
  - keyword or number slam beside him, never over his face (T2)
  - donut for a study share (T15)
  - scale analogy stack for a big number (T16)
  - strike-through for a myth (T13)
  - typewriter list for "what you need" (T5)
  - blue duotone for quoted people or patients (T7), which already fits the client's blue palette
- **Mix:** keep voice ≥8 LU over the bed (median 10.24 here). No per-graphic SFX can be confirmed, because sfx.json is missing for this group.

## 6. Caveats
- Tile categories and in-place reveal points were assigned by viewing the boards, at ±1 tile accuracy. Idea medians are sensitive to the stepped-animation "cuts" (oom 1958-2054) and to bodycam bursts (iZ4).
- The lime-pixel probe (HSV 25-40°) measures highlight and box onsets. Counter and line values were read from close-up strips, and words are from transcript.json at native fps.
- Some videos are co-productions (lWh is Atmos: serif labels, no caption box) or field verité (tpO, VBK). Weigh their style lower for Evident's house explainer look.
- pacing.json, sfx.json, most text_elements.json, and camera.json for 7 videos were missing. Camera moves noted here (ymd 1164-1279, ymd 573-628 rescale) come from the frames, not from camera.json.
