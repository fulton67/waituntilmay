# Evident YouTube Shorts, group 1 (14 videos), read board by board

This file adds to `read/ig_Ddos1QZRGmV.md` (the baseline). It confirms, refines or extends that read and does not replace it.

**Sources.** I opened all 42 reading boards (`sheets/evident_yt_shots/<id>_N.jpg`, 1,823 tiles). That matches the files on disk: 2+3+2+4+3+2+3+2+3+4+3+4+3+4 boards, and the tile counts match each `.txt` header. I also read every `.txt` words-per-second file, and from `measure/evident_yt/<id>/` the cuts, loudness, transcript (with word timings), probe, and, where they exist, graphic_elements, camera and palette. I decoded single frames and pixel series with ffmpeg (scripts in the session scratchpad `evyt1/`: `summ.py`, `on2.py`, `on3.py`, `agg.py`, `dup.py`, `ideas.py`; all run with `python -I`).

**Frame rates are not all 30 fps.** Six videos are 23.976 fps (2_e5, 8vns, AutD, GS3, lMrm, qf), six are 30 fps (eqvE, G5GY, IkrW, MIQ, yA0, Zzgg), one is 29.97 fps (tqx) and one is 25 fps (Jq0). Frame numbers below are 0-based at each video's own rate. "f" means frames.

**Missing measurements:**
- `pacing.json`: missing in 14/14.
- `sfx.json`: missing in 14/14.
- `camera.json`: present in 6/14 (8vns, eqvE, Jq0, tqx, yA0, Zzgg).
- `palette.json`: present in the same 6.
- `graphic_elements.json`: present in 11 (missing for tqx, yA0, Zzgg).
- `text_elements.json`: present only for 2_e5.
- `tone_hue.json`: missing for lMrm and qf.

So this read has no SFX evidence and no pacing evidence. Words per second come from the transcripts.

**Tile classes** (one tile per hard cut plus one per second, so short shots are slightly over-weighted):
- **P**: presenter, host or seated interview, including windowed ones.
- **F**: footage or archive, including letterboxed and windowed clips, UGC, and on-location people.
- **G**: designed graphic, including maps, charts, cards, kinetic type, annotation and splits.
- **D**: document, screenshot, web page or re-typeset headline card.
- **E**: end card.

---

## 1. Per video

Hard cuts are given as union / agreed by both detectors. "s/idea" is body length (end card excluded) ÷ (agreed shots + in-place reveals counted on the boards). The reveal count is approximate and is given as "+N".

### 2_e5sGWXtOo: the corporate network behind ICE (icetracking.org)
81.0 s, 23.976 fps. Cuts 16/13. Shots: median 5.55 s, +10 in-place reveals, **3.50 s/idea**. Tiles (87): P 16 (18%), G 53 (61%, of which 25 are a split screen), F 13 (15%), D 0, E 5.
- **Bubble network, 44-133.** A force-graph of contractors (blue, purple, red and orange nodes) sits around a white "ICE" node, over "Dell, Deloitte and AT&T all have major contracts". From 162 to 504 the graph sits in the top half of a split screen above the presenter.
- **Focus pull and logo swap, 528-824.** The whole graph darkens and one enlarged blue node in the centre swaps its logo on each spoken name:
  - aws at 575 ("Amazon" 580, −5 f)
  - Azure at 618 ("Microsoft" 612, +6 f)
  - CACI around 663 ("CACI" 654)
  - Booz Allen around 709 ("Booz" 693)
  - The white title "SURVEILLANCE AND DATA SYSTEMS" lands at 782, +12 f after "surveillance" (770).
- **Category colour switch.** Transport companies become green logo discs over real aircraft footage: CSI at 842 (the cut at 840 lands −3 f before "Transportation" at 843), Global X at 926 ("Global" 926, 0 f), Avelo at 957 ("Avelo" 954). Prison companies become red nodes (1134-1315). The GEO logo swaps to CoreCivic around 1223. **Colour codes the category**, not emphasis.
- **Split screen 1490-1671 and a call-to-action, 1762-1831.** A scrolling icetracking.org screen recording sits above the presenter. Then a lime "DONATE" pill appears under him. This is the only button-like element in the group.

### 8vnsY7y_fKQ: FN 303 "less-lethal" launcher tested up close
135.3 s, 23.976 fps. Cuts 35/31. Shots: median 4.00 s, +4, **3.75 s/idea**. Tiles (147): P 0, F 129 (88%), G 5, D 8 (5%), E 5.
- **Hook, 0-69.** A three-line lime rag box reading "THIS 'LESS-LETHAL' WEAPON CAN KILL" sits over the shooter, then over the clay block with two holes.
- **Guideline documents, 439-597.** On black, two guideline pages slide in (459 → 482). Lime highlights mark the passages at 505-597 as "guidelines specify to never aim … at the head or neck within 4 meters" is spoken.
- **Own footage letterboxed, 857-1214.** A horizontal protest clip sits in a band over a blurred copy of itself, for "I filmed an LAPD officer accidentally shooting another officer".
- **Caption register.** On-camera speakers who are not the narrator are captioned in **lime italic** ("You're looking straight down" 1246, "Could we test it closer?" 1290, "Absolutely." 1323). Name supers: "Dexter Thomas / Correspondent, Evident" at 2719 and "Dr. Scott Reynhout / Crowd Control Weapons Researcher" at 2786.

### AutDmuMAeLM: Sudan weapons-trafficking investigation (trailer)
69.9 s, 23.976 fps. Cuts 42/28. Shots: median 1.77 s, +2, **2.13 s/idea**. Tiles (82): P 4, F 63 (77%), G 8 (10%), D 0, E 7.
- **OSINT pin, 718-738.** A frame from a social video is pinned onto a satellite image, on "Over a year of open source".
- **Regional map, 959-1029.** Sudan is filled in muted green. Route lines draw in from neighbouring states at 1006, on "Our investigation shows how a Middle East power…".
- **Source label on every UGC clip.** A small grey label sits top-left (e.g. 303 "Facebook/…", 1264 "Telegram/…"). This confirms baseline R13.
- **C-SPAN clip letterboxed, 1148-1214.** The original broadcast lower third is kept inside the band.

### eqvE7DzS_0w: rural polling-place closures (interview with Jon Tester)
166.3 s, 30 fps. Cuts 58/49. Shots: median 1.83 s, +8, **2.74 s/idea**. Tiles (171): P 71 (42%), F 65 (38%), G 19 (11%), D 6 (4%), E 10.
- **Typed question, 166-223.** "WHAT HAPPENS WHEN NEW LAWS MAKE IT TOUGHER TO VOTE" types letter by letter with a visible caret (193 "MAKE I|"). It starts on "What happens" (169).
- **Map dive and build, 624-1071** (16 tiles, one scene):
  - The Georgia silhouette appears at 651, and one county lights lime at 681, on "for every extra" (680).
  - The view steps into that county at 711.
  - Ballot-box icons populate from 741 to 831, under a typed title, "NUMBER OF POLLING PLACES IN 2020" (741).
  - Dashed travel lines appear at 891 on "drops one percentage point" (889).
  - The camera pulls out from 1011 to 1071 as "turnout could drop 10%" lands (1051).
- **Windowed interviews.** Both speakers sit in rounded windows on charcoal, with name supers ("Jon Tester / Former Senator for Montana" 30-150; "Marissa Georgiou / Journalist" 1135-1253).
- **Bill text, 3510-3574.** A black page pushes in on the "Freedom to Vote Act" line while he says "made it easier to vote". An old TV debate clip (3395-3482) sits in a CRT-style window.

### G5GYAIE-8Sg: border wall and wildlife ("Nature Divided")
114.4 s, 30 fps (720x1280). Cuts 18/17. Shots: median 3.93 s, +12, **3.63 s/idea**. Tiles (117): P 0, F 78 (67%), G 32 (27%), D 0, E 7.
- **Lime sticker headlines, 268-446.** "Border walls are reshaping wildlife habitats." and "With migration cut off, species are under threat." are rag-hugging lime boxes over walking footage.
- **Map build, 464-1181** (25 tiles, one scene):
  - A pale grey world map appears at 464 and pushes to North America at 551-611.
  - An orange "2070" tag types "207" → "2070" at 641 ("2070," 637).
  - An animal-icon grid appears at 671, blue for species that stay and orange for species that must cross, on "roughly a third of the world's mammals" (698-734).
  - The border line draws, and green habitat fills at 821 on "climate change shifts" (814).
  - The green spreads at 1031 on "Mexico border" (1028).
  - A yellow wipe reveals "122 species" at 1050, −13 f before "highest" (1063).
- **Location super, 1267-1387.** A large "SONORA / MEXICO" sits over an aerial of the wall.
- **Series title instead of the Evident card, 3265-3412.** "Nature Divided" types into a growing lime box, then "Watch at YouTube.com/@EvidentMedia". This is the only video without the standard end card. Its captions are also different: a grey translucent box and a lighter rounded face.

### GS3ngZPlBl4: Evident year-one impact report (promo)
90.9 s, 23.976 fps. Cuts 47/39. Shots: median 1.67 s, +6, **1.92 s/idea**. Tiles (99): P 28 (28%), G 26 (26%), F 29 (29%), D 11 (11%), E 5.
- **Report cover collage, 54-116.** The cover is revealed by a diagonal lime and blue wipe. It reprises at 1436-1456.
- **Pages fanned in 3D, 136-182.** The stat page "10,000,000+ VIEWS / $244,625 TOTAL EXPENSES" is the top card.
- **Phone mockups of their own posts, 546-681.** Three phones stack in with like and share counts ("34k likes / 7.5k shares").
- **URL typed into a pill over the presenter, 1490-1556.** "evidentmedia.org/impact" types in letter by letter. A Substack screen recording follows (1571-1738).

### IkrWPG3HGD8: AI facial recognition on US campuses
122.9 s, 30 fps. Cuts 39/36. Shots: median 2.53 s, +14, **2.37 s/idea**. Tiles (127): P 35 (28%), F 24 (19%), G 29 (23%), D 34 (27%), E 5.
- **Faceprint on the presenter's own face, 610-880.** The mechanism is shown on her, not on stock:
  - Her face appears in black and white inside a corner-bracket box.
  - X landmarks start at 602, −9 f before "distance" (611), and are added on "eyes" (642) and "nose" (655).
  - "FACEPRINT COMPLETE" appears at 730.
  - The card shrinks upward, and a strip of database faces scrolls under "SEARCHING DATABASES…" (760-880), on "searched against databases" (760).
- **Re-typeset Times of Israel card, 998-1205.** The masthead is in blue condensed type. The white headline builds from 1025. A lime highlight sweeps "deportation" over 1111-1159 (48 f). Blue diagonal bars rise bottom-right, and a lime arc wipes it out at 1175.
- **Face-search simulation, 3357-3406.** A crop box, then a "Searching Faces…" spinner, then a grid of blurred matches with percentages (96.9%), all on "worry it could have a chilling effect".
- **Dallas Morning News card, 3107-3197.** A white US map with green dots and "used by at least 37 colleges", on "37" (3118). Other cards: Forbes 1916 (lime "Facial ID"), Sophos 2122, The Intercept 2462 (lime "Dataminr"), 404 Media 2641.

### Jq0KrFenFIA: West Bank checkpoints and lost commuting time
66.5 s, 25 fps. Cuts 8/6. Shots: median 6.14 s, +8, **4.34 s/idea**. Tiles (69): P 0, F 17 (25%), G 37 (54%), D 9 (13%), E 6.
- **Checkpoint map, 412-709.** The map sits in a centred panel over a blurred copy. Red dots populate, then a red "849 / verified checkpoints" label appears at 605, +11 f after "849" (594).
- **Methodology on screen, 728-925.** A Telegram message log scrolls, then cuts to a code view of the parser, on "tens of thousands of messages … that report checkpoint delays".
- **GPS pings, 939-1172.** Blue route lines on a pale map accumulate from one route into a network, on "2.6 billion GPS pings" (960-993).
- **Clock as a unit chart, 1197-1497.** A clock hand sweeps a red 1.5-hour sector beside "1.5 hours per week" (1222). On "77" (1393) it multiplies into 7 red clocks, the last one partial. Red pixels start at 1390 and reach 90% at 1411: −3 f, 21 f, 12 updates. The accent here is **red, not lime**.

### lMrmgl5Vp7Q: Border Patrol slurs in texts and body cam (court filing)
138.8 s, 23.976 fps. Cuts 35/33. Shots: median 3.42 s, +14, **2.88 s/idea**. Tiles (147): P 38 (26%), F 55 (37%), D 40 (27%), G 10 (7%), E 4.
- **Evidence highlighted when it is heard, 116-136 and 648.** A text-message screenshot with redaction bars gets lime on "wet" and "tonks" as the body-cam audio says them. Body-cam clips sit in a letterbox band. **Large Evident-logo arcs (lime and cream) sit in the black margins** (151-194, 2031-2189).
- **WOLA card, 977-1092.** Dim body text. The highlight advances phrase by phrase: "the term" at 977, then "tonk is not appropriate" at 1000 ("appropriate" 1011).
- **Court filing enters with a page turn, 1677.** The plaintiff and defendant names are then lit at 1720.
- **Quote card on a charcoal canvas with a faint text texture, 2801-2890.** "turn the creativity knob up to 11" goes grey → white word by word (lit onset 2824, "knob" 2820, +4 f). Then "collaterals" turns lime at 2866 ("collaterals" 2867, −1 f). The same card form appears earlier at 1858 for "campaign of suspicionless and discriminatory detentive stops".

### MIQ6T7Uy7Lw: naval drone swarms vs the US Navy
161.0 s, 30 fps. Cuts 72/57. Shots: median 1.80 s, +12, **2.28 s/idea**. Tiles (170): P 47 (28%), F 86 (51%), G 30 (18%), D 0, E 7.
- **Kinetic title on a navy blueprint grid, 160-187.** "NAVAL" then "DRONES" (white onset 158, −7 f before "Naval" 165). The same form recurs over the presenter: "BIGGER" at 370 (−2 f before "Bigger" 372) and "DRONE / SWARM" at 1359-1388 (−9 f before "drone" 1368).
- **Swarm mechanism, 1531-1858** (12 tiles, one scene):
  - A top-down carrier render sits on navy.
  - Yellow dots spawn at 1588 ("dozens or hundreds" 1566).
  - A callout, "enemy drone boat", appears with a leader line at 1618.
  - The dots connect into a mesh from 1619 to 1654 ("linked" 1654).
  - The mesh wraps the carrier at 1738, and the carrier scales up at 1828-1858 on "massive liability".
- **Reticle unit count, 2317-2527.** Eight green target brackets appear over Phalanx footage on "eight drones" (2374). They turn red except 2-3 on "two or three will still get through" (2428).
- **Blue duotone cutout plus a typed price, 2705-2762.** A SeaRAM cutout with a missile icon in a circle; "$1 MILLION" types over 2706-2737 (+14 f after "million" 2692). It closes on a re-typeset quote card at 4175-4292, with lime on "we would not be prepared".

### qf_jdmTkPgg: identifying a Border Patrol agent from body cam
126.8 s, 23.976 fps. Cuts 50/19. The union count is inflated by a stutter sequence. Shots: median 4.71 s, +11, **4.03 s/idea**. Tiles (147): P 18 (12%), F 69 (47%), G 36 (24%), D 18 (12%), E 6.
- **ID card, 131-223.** The masked agent is cut out over an orange disc, which builds from 111 to 156. His name types in ("Agent Kristop***" at 131 → "Agent Kristopher Hewson / C-29").
- **Map pin-up, 471-652.** On a dark satellite map, stills from the footage pop onto the Chicago location one by one, on "October 23rd in Chicago" (518). The same device closes the video at 2811-2877, on "moved on to another city".
- **Annotation on footage, 981-1075.** A circle with a leader line, "pepper spray", at 981. Then a spotlight circle labelled "Agent Hewson" tracks him through 1037-1075.
- **Split screen, 1665-1946.** Deposition video sits on the left and the incident footage on the right while Bovino's answer plays. Earlier, a **stutter edit** (1201-1316) puts 9 hard cuts into 4.6 s on the tear-gas throw.

### tqxCIKD2Bb0: Mississippi voters marked inactive with Experian data (with Mississippi Today)
146.7 s, 29.97 fps. Cuts 41/40. Shots: median 2.89 s, +20, **2.38 s/idea**. Tiles (152): P 42 (28%), F 31 (20%), G 20 (13%), D 55 (36%), E 4.
- **Re-typeset Mississippi Today headline, 129-300.** The headline text builds from 137 to 145 (8 f). The lime highlight starts at 154, +4 f after "inactive" (150), and runs to 190 across two lines (36 f, about 20 updates). A second headline dims in at 242, and "problems" is lit at 271.
- **Watson build-in-place stack, 1010-1326** (12 tiles):
  - A dot grows into a blue disc at 1017, +1 f after "Watson" (1016).
  - A B&W cutout photo with a lime name tag sits on the disc.
  - "$50,000" appears at 1081 on "contract".
  - The Experian logo stacks on top at 1152 ("Experian" 1130).
  - Lime quote boxes "STRENGTHEN THE INTEGRITY OF ELECTIONS" build word by word over 1279-1305 ("strengthen" 1280, −1 f).
- **"A" → "AFFIDAVIT BALLOT" lime box beside the presenter, 398-424** (−6 f before "affidavit" 405). The same stamp is reused over polling-booth footage at 3235-3251 (−12 f before 3247).
- **Article crop, 657-828.** "230,000 voters statewide" is lit at 659 (+1 f after "230" 658). "about 1 in 9" follows at 741, then a horizontal pan (770-828). A **diagonal two-photo split** (556-640) is reused at 3646-3730 to bookend the Senate race.

### yA0gele-Nmo: election-week misinformation (old footage as new)
117.0 s, 30 fps. Cuts 47/33. Shots: median 3.07 s, +11, **2.57 s/idea**. Tiles (125): P 46 (37%), F 12 (10%), D 59 (47%), G 4 (3%), E 4.
- **Viral post, 49-136.** A push-in, then a lime highlight on "trying to stop her to vote" (136).
- **Date-labelled comparison cards, 494-583.** A lime-outlined "2024 POST" card slides out for a "2026 POST" card (556).
- **Whip blur into the reverse-image-search results, 950-986.** The upload date "Oct 29, 2024" is lit at 1055 (+9 f after "2024" 1046).
- **"MISSING CONTEXT" lime stamp over the post, 2539-2629.** Onset 2532, which is −17 f before "missing" (2549) and +14 f after "context" (2518). A Google Lens screen recording follows (3162-3270), then an X community note (3295-3360).

### ZzggvB2LkFk: what federal election monitors can and can't do
178.9 s, 30 fps. Cuts 40/32. Shots: median 4.63 s, +13, **3.96 s/idea**. Tiles (183): P 74 (40%), F 46 (25%), D 33 (18%), G 24 (13%), E 6.
- **Brennan Center card, 945-1152.** "The" types in at 945, then the full title. The highlight on "The Myth of Voter Fraud" runs 1002-1062. A second card, "Voting by Noncitizens is a Non-Issue", types in at 1092-1152. The highlight colour here is **yellow #F9FA5B, not lime**.
- **Bar chart, punchline first then context, 1524-1824.** A single 2026 bar grows over 1557-1576 while its counter runs 696 → 974 → 1,000 (1581-1641), for "plans to deploy more than 1,000" ("1" at 1597). On "record high" (1724) the chart pulls back to reveal the bars for 2006-2024 (1721-1750, stepping every 2-3 f).
- **"find voter fraud" lime box over the presenter, 786-788** ("find" 785, +1 f).
- **Numbered rules typed with a caret over dimmed footage.** "1. Federal monitors cannot stop anyone from voting" at 3146-3233, on "monitors cannot" (3175-3189). "2. … cannot take control of a polling site…" at 3604-3811. Then a blurred presenter with "866-OUR-VOTE" typed over him (4532-4592).

---

## 2. Technique catalogue (group 1)

The counts are distinct uses seen on the boards. NEW means the technique, or this form of it, is absent from the baseline read-out.

| # | Technique | Uses (videos) | Example frames | Spoken trigger | Entry / exit | Timing vs word | vs baseline |
|---|---|---|---|---|---|---|---|
| T1 | **Highlighter on the spoken phrase** (headline, article, tweet, court text) | **~42 (8)**: tqx 10, lMrm 9, yA0 7, Zzgg 5, qf 5, IkrW 4, MIQ 1, 8vns 1 | tqx 154-190, 659; lMrm 977-1000; qf 2730-2753; Zzgg 1002 | the exact phrase being read or quoted | left-to-right solid block, square corners, text stays dark; out by hard cut, or dims when the next headline arrives (tqx 242) | **+1 f** median on 7 measured (+1, +1, +1, −1, −1, +4, +9) | Confirmed. **NEW form**: the highlight *advances phrase by phrase with the voice* (tqx 154→184→213, lMrm 977→1000, qf 2730→2753) |
| T2 | Document, web or screenshot crop with depth-of-field blur and a slow push or pan | ~25 (9) | 8vns 459-597; eqvE 3510; lMrm 661-727; qf 1466, 2387; tqx 657-828, 2247; Zzgg 1264; yA0 49; IkrW 2740 | "according to…", "records show", "the filing says" | hard cut in; a few slide in (8vns 459→482) or page-turn in (lMrm 1677); pan across lines | cut lands on the clause | Confirmed (baseline 5 crops); depth-of-field blur and page turn are NEW |
| T3 | **Re-typeset headline card** (outlet masthead, white headline on charcoal, date/byline, blue diagonal bars, lime arc or cream bar wipe) | **14 (6)**: IkrW 5, Zzgg 4, tqx 3, qf 1, lMrm 1 (+ MIQ quote card) | IkrW 998-1205; tqx 129-300, 1495; Zzgg 945, 2298; qf 2710 | naming an outlet's finding | headline builds in about 8 f (tqx 137-145); bars rise; exit by lime arc wipe (IkrW 1175, tqx 300) | highlight +4 f (tqx) | **NEW**: the baseline only used real crops |
| T4 | Map build (dots, routes, county lights up, dive, pull-out) | **13 (8)** | eqvE 624-1071; G5GY 464-1181; Jq0 412-709, 939-1172; AutD 959; qf 471, 2811; IkrW 3107; GS3 700 | a place plus a count or flow | dive by stepped zoom (eqvE 711); elements populate across a sentence; pull-out on the result (eqvE 1011) | county lit on "every extra" (eqvE 680→681); "849" +11 f | Extends the baseline (1 coast trace); **each map has its own style** (see §4) |
| T5 | **Kinetic word or phrase stamp** (white bold, or a lime box with black text) over presenter or footage | **12 (7)** | MIQ 160, 370, 1359; tqx 398, 3235; Zzgg 786; yA0 2532; G5GY 268, 359, 3265; 8vns 0; eqvE 166 | the key noun of the sentence ("Bigger", "affidavit ballot", "missing context") | typed letter by letter (tqx "A"→, G5GY "N"→) or a hard pop; holds 1-4 s | **leads the word**: median −8 f over 6 (−2, −6, −7, −9, −12, −17) | Mostly NEW (the baseline had only the opening pull-quote) |
| T6 | Name super (dark lower-left box, white name, small role line) | 11 videos | eqvE 30; IkrW 291; lMrm 435; MIQ 783; qf 1987; tqx 949; yA0 160; Zzgg 656; G5GY 1981; 8vns 2719, 2786 | first appearance of a speaker | name types in (yA0 160 "Zach Toom…") | ~1 s after the speaker first appears | Changes the baseline form (it typed a tag over an archive photo) |
| T7 | **Annotation on footage** (face box, circle with a leader label, HUD reticle, target brackets) | **8 (3)** | IkrW 131, 437-497, 1780; qf 981, 1037-1075; MIQ 1043, 2317-2527 | "identify", "deployed pepper spray", "locks onto them" | brackets or circles pop; the label sits on a thin leader line; it tracks the subject (qf 1037-1075) | brackets on "eight drones" (2374); red on "two or three" (2428) | **NEW** |
| T8 | **Simulated mechanism on a real image** (the process played out step by step) | **4 (3)** | IkrW faceprint 610-880, search 3357-3406; MIQ swarm 1531-1858; Jq0 log → code 728-925 | "records the distance between the eyes", "linked together", "we examined messages" | builds in place over 5-11 s; each sub-step on its clause | landmarks −9 f before "distance"; mesh complete on "linked" | **NEW**, and the most transferable device for explaining how a treatment works |
| T9 | Counter or hero number | 7 (6) | Zzgg 1581-1641; Jq0 605, 1390; tqx 1081; MIQ 2706; IkrW 3118; GS3 546 | a spoken figure | count (Zzgg 696→1,000) or type ($1 MILLION) | spread −40 to +30 f, median −3 f over 7 | Confirmed |
| T10 | **Person ID card** (cutout on a colour disc, typed name and title, facts stacked above) | 2 (2) | tqx 1010-1326; qf 111-223 | introducing an official or agent | dot → disc (tqx 1017), photo, then each new fact stacks above on its word | disc +1 f; quote −1 f | **NEW** |
| T11 | Split comparison (side by side, diagonal, or labelled before/after cards) | 5 (4) | qf 1665-1946; tqx 556, 3646; yA0 494-583; 2_e5 162-504, 1490-1671 | "said in deposition" vs what the footage shows; "2024 post" vs "2026" | hard cut; cards slide (yA0 556) | n/a | **NEW** |
| T12 | Unit chart with real icons (clocks, reticles, animal silhouettes) | 3 (3) | Jq0 1397-1497; MIQ 2317-2527; G5GY 671-1181 | "77 hours a year", "eight drones … two or three", "a third of mammals" | one unit multiplies; partial last unit | 77 clocks −3 f | Extends the baseline waffle (dots) to meaningful icons |
| T13 | Letterboxed or windowed footage over a blurred fill, sometimes with brand arcs in the margins | 8 videos | 8vns 857; MIQ 234-735; lMrm 151, 2031; qf 671-1019; Jq0 412; Zzgg 203-587 | archive, body cam, broadcast | hard cut; in-window cuts | n/a | Baseline window (on black); blurred fill and logo arcs are NEW |
| T14 | Typewriter with a visible caret | 8 (6) | eqvE 193; Zzgg 945, 3173, 3604, 4532; tqx 398; G5GY 641, 3265; qf 131; GS3 1490 | titles, URLs, rules, names | letter by letter; caret seen on eqvE 193 and Zzgg 3173 | starts on the first word (eqvE 169→166) | Confirmed (baseline B02, B14); the caret is no longer limited to 2 frames |
| T15 | Quote lit word by word (karaoke) on charcoal with a faint text texture | 3 (2) | lMrm 1858, 2801-2890; MIQ 4175 | a direct quotation | dim → white per word; key word lime | +4 f, −1 f | Confirmed (baseline B26) |
| T16 | Logo-node network graph with focus pull | 1 | 2_e5 44-824 | listing companies | dims the graph, enlarges one node, swaps logos | −5 / +6 f | **NEW** |
| T17 | Screen recording of a real site or product (cursor visible) | 5 (5) | GS3 1571; Zzgg 4306; yA0 3162; 2_e5 1490; IkrW 523 (recreated login) | "you can check…", "go to…" | hard cut, scroll | n/a | NEW. It is evidence, not decoration, but it is UI on screen (see §3) |
| T18 | Location super or pin label | 2 | G5GY 1267 "SONORA / MEXICO"; IkrW 2006 "Columbia University" pin | placing a clip | holds the shot | n/a | NEW |
| T19 | Duotone or tinted archive | 3 (3) | IkrW 187; lMrm 2993; MIQ 2290, 2705 | institution or weapon named | hard cut; blue shatter wipe (MIQ 2290) | n/a | Extends the baseline per-clip grade |
| T20 | Stutter edit on an action | 1 | qf 1201-1316 (9 cuts in 4.6 s) | "tosses a tear gas canister" | repeated hard cuts | n/a | NEW |
| T21 | Numbered rule typed over dimmed footage | 2 (1) | Zzgg 3146, 3604 | "monitors cannot…" | caret type, holds | on "monitors cannot" | NEW |
| T22 | CTA pill or URL label | 2 | 2_e5 1762 "DONATE"; tqx 4155 "YALLVOTE.MS"; GS3 1490 URL pill | the call to action | pop | n/a | NEW, and the only button-like elements in the group |

**Top 5 by uses:** T1 highlighter (~42), T2 document crop (~25), T3 re-typeset headline card (14), T4 map build (13), T5 kinetic word stamp (12). T6 name super is in 11 of 14 videos.

---

## 3. Numbers vs the baseline

| Measure | Baseline (IG Ddos1QZRGmV) | Group 1 (14 YT Shorts) | Verdict |
|---|---|---|---|
| Seconds per visual idea | median 2.13 s, p90 5.19 | **median 2.81 s** per video, range 1.92 (GS3) to 4.34 (Jq0); agreed-shot medians 1.67-6.14 s (median 3.24) | **Refine**: about 2-4 s per idea. Graphic-led pieces (Jq0, G5GY, Zzgg) hold one scene 10-24 s and build inside it |
| Reveal vs word | +1 f median, abs 2 f, 65% ≤3 f (manual) | 25 automatic pixel onsets: median **−2 f**, abs median 9 f, 7/25 ≤3 f, 19/25 ≤12 f, 15/25 *before* the word. By type: **highlights +1 f** (n=7); **kinetic type −8 f** (n=6); numbers −3 f with a spread of −40 to +30 (n=7) | **Refine**: highlights land on the word, kinetic type leads by about a quarter second, data builds span the clause. (Automatic thresholds are cruder than the baseline's manual tracking.) |
| Frame share | G 38.7%, D 9.5%, archive 26.8%, P 20.6%, E 4.4% | **P 23.0%, F 39.3%, G 18.3%, D 15.0%, E 4.4%** (1,823 tiles). Per video, G+D ranges 5% (8vns) to 67% (Jq0) | **Refine**: the baseline is graphic-heavy for Evident. The typical Short is 33% G+D, and documents grow with investigative pieces (yA0 47%, tqx 36%) |
| Cut vs dissolve | 21 hard, 0 crossfades | 0 editorial crossfades seen in 1,823 tiles. Detector "dissolves" 2-104 per video (median 3-16 f) are animation steps. Non-cut transitions seen: lime arc wipe (IkrW 1175, tqx 300), diagonal wipe (GS3 54), page turn (lMrm 1677), whip blur (yA0 950), blue shatter (MIQ 2290), stutter (qf 1201) | **Confirm** hard cuts. Wipes are allowed when they are made from brand shapes |
| Stepped animation (duplicate frames, content_val < 0.1) | 44% in graphics | inside graphic segments: MIQ swarm 32.3%, G5GY map 20.5%, eqvE map 10.5%, lMrm quote 9.7%, Jq0 7.8%, IkrW 3.0%, 2_e5 0.5%, Zzgg bars 0%, tqx Watson 0% (median **7.8%**) | **Refine R11**: most YT graphics animate on 1s. Stepping on 2s is a per-piece choice, so the R11 A/B test is optional |
| Element settle (graphic_elements, 11 videos) | median 5.5 f, p90 19 | median **2-4 f** per video, p90 7-16 f; 80-99% enter mid-shot | Confirm mid-shot entry; YT entries are snappier |
| Palette / accent | lime #D9ED55 plus blue #4D63CA | lime **#D3E863** (tqx, palette rows 29%; yA0 14%); **yellow #F9FA5B** (Zzgg 18%); **red** in Jq0 (palette rows 19%, lime 1%); orange disc (qf 111-156); orange, green and lime in G5GY. Blue: tqx Watson disc, IkrW mastheads, diagonal bars | **Refine R7**: the accent is *per story* (lime, yellow, red or orange), one per piece, plus a neutral blue. This supports our choice of an ice-blue accent |
| Caption box | black box, white, centre 77.1% H, hard swap | black box with white text in 13/14; centre 74.6-79.5% H on 8 well-lit frames (median ~76%). G5GY uses a grey translucent box and a rounded face. **Other voices in lime italic** (8vns 1246, 1290; AutD 239; qf 403 "Hey Hewson") | Confirm. NEW: italic plus the accent colour marks a second voice |
| Voice vs bed | voice −15.23, bed −23.65, gap 8.42 LU (IG copy) | voice median **−21.4 LUFS** (−29.1 to −17.2), mix median −21.2; **gap median 12.0 LU** (6.3-16.6; AutD 0.59 is a music-led trailer) | **Refine R20**: YT uploads are not normalised to −14. Keep voice 8-16 LU over the bed; 12 LU is typical |
| Camera (6 videos) | moving 92.6% | moving 73-97% (median ~86%); push 31-47%, pull 24-47% | Confirm (same estimator caveat as the baseline) |
| Speech | 2.92 words/s | 1.65-3.17 words/s, median 2.50 (whole-file, including music beds) | Confirm |
| Brand bug | "E" roundel top-right on every frame | 14/14; co-branded "M + E" in tqx | Confirm |
| UI widgets | 0 (caret for 2 f) | DONATE pill (2_e5), a spinner and a "Search Faces" button inside a recreated product (IkrW 3384), a cursor in screen recordings (Zzgg 4306, yA0 3162) | **Refine R1**: UI appears only when it *is* the evidence (the product being exposed, or the site to visit), never as decoration |

---

## 4. Variation: how they avoid repeating themselves

**Within one video, they reuse the device and change the surface:**
- **tqx** uses the highlighter on 3 dark headline cards (129, 1495, 1666), 5 white web articles with depth-of-field blur (657, 2659, 2847, 3831, 4155), a photographed letter (1985) and a contract page (2247). That is 10 highlights on 4 kinds of surface. The "AFFIDAVIT BALLOT" stamp appears twice, 95 s apart, first beside the presenter (398) and then over booth footage (3235). The diagonal split bookends the piece (556 and 3646).
- **MIQ** uses the kinetic word 3 times on 3 backgrounds: a blueprint grid (160), the presenter (370) and the presenter again with a two-line build (1359). It has 3 defence systems and 3 graphic forms: reticle count (Phalanx 2317), duotone cutout with a typed price (SeaRAM 2705), and a render with a large off-frame title (Helios 2965).
- **IkrW** shows 5 headline cards, each with its outlet's masthead colour (TOI blue condensed, Forbes blue serif, Sophos, The Intercept, 404) and a different highlight length. It shows the same face-recognition idea 3 ways: on the presenter (610), in MIT test footage (1780) and as a product simulation (3357).
- **Zzgg** types its numbered rules twice, "1." (3146) and "2." (3604), over different footage. Its bar chart breaks the build-up order: punchline first (1557), context second (1733).
- **lMrm** has 2 quote cards (1858, 2801): the first is a static lime phrase, the second is lit word by word.

**Across videos, the grammar stays and the form changes per piece:**
- **The map style is never the same twice**: charcoal panel with red dots (Jq0), pale grey with animal icons (G5GY), olive-green state with ballot icons (eqvE), navy blueprint (MIQ swarm), dark satellite with photo pins (qf), blue outline with yellow dots (GS3 700), muted-green region with route lines (AutD).
- The accent colour changes per piece: lime (tqx, yA0, lMrm), yellow (Zzgg), red (Jq0), orange (qf disc), green habitat (G5GY).
- The re-typeset headline card is one shared template (charcoal, masthead, date and byline line, blue diagonal bars bottom-right, lime arc or cream bar wipe) used in IkrW, tqx, Zzgg, qf and lMrm. The masthead and highlight change every time.
- The constants are the "E" bug, the end card (13/14) and the caption box (13/14). The two exceptions are both in the same piece, G5GY: a series-titled show gets its own end title and caption style.

---

## 5. What this adds to our rules (proposals for the brand bible; additive to R1-R21)

- **R4 (refine)**: aim for 2-4 s per idea. A graphic scene may run 10-24 s if it reveals something new every 2-4 s (eqvE 624-1071, G5GY 464-1181, Jq0 412-1497).
- **R7 (refine)**: one accent per video, chosen for the story. For us that is always a blue family (ice blue on a mid blue); do not rotate in non-brand hues.
- **R9 (extend)**: the highlighter may advance phrase by phrase with the voice (tqx 154→213). Target +1 f on the word.
- **R22 (new)**: simulate the mechanism on real imagery, step by step, one clause per step (IkrW 610-880, MIQ 1531-1858). For Ostad: real patient imaging, and the treatment step drawn as landmarks and labels.
- **R23 (new)**: annotate real footage with thin brackets or circles and leader labels that track the subject (qf 1037-1075, MIQ 2317-2527). Labels sit on condition images, never on his face.
- **R24 (new)**: re-typeset journal headlines as cards (journal masthead, headline, date, one highlighted phrase) when the real crop is illegible at 16:9 (IkrW 998-1205).
- **R25 (new)**: kinetic key-noun stamps may lead the word by about 8 f (MIQ 370, tqx 398). Use one per minute at most, and pick a different background each time.
- **R26 (new)**: introduce a person or study with an ID card: a cutout on a brand-blue disc, a typed name, then facts stacked above on their words (tqx 1010-1326).
- **R27 (new)**: labelled before/after cards or a split, never a slider widget (yA0 494-583, qf 1665-1946).
- **R1 (refine)**: UI may appear only when it is the evidence itself (a real product screen, or the site to visit).

## 6. Caveats

- There is no SFX or pacing data for any of the 14 videos, so no claim is made about sound design.
- The reveal offsets come from automatic pixel thresholds on 180 px-wide frames, with each graphic compared against the word it displays. They are cruder than the baseline's manual lime tracking. Several "onsets" coincide with a cut.
- The in-place reveal counts used for s/idea are board estimates (±2 per video).
- The caption-band detector failed on dark frames (AutD, eqvE, Jq0, lMrm, IkrW, 8vns). Only 8 well-lit frames were used.
- Tile shares over-weight short shots because every cut gets a tile.
