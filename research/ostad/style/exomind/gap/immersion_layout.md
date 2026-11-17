# Gap check: immersion and layout (YouTube v6)

EXOMIND_REDO §4.3, agent 4 of 5. This file only measures. Nothing in the composition was changed.

- **Render measured:** `Downloads/Ostad - Exomind and total skin health (YouTube v6).mp4`. It is 1920×1080, 24 fps, 2166 f (90.25 s).
- **Data:** `immersion_layout.json` holds the per-segment numbers, the reference medians and the method.
- **Tools:** `immersion_tools/`
  - `measure_v6.py`: per-frame fill and motion
  - `agg.py`: per-segment totals
  - `refstats.py`: reference medians from `graphic_elements.json`
- **Strip sheet:** `immersion_layout_strip.jpg` (gitignored, because it holds practice and patient frames). It shows the 25 segments, each with its layout class, fill and moving seconds.

## Method
1. **Separate the graphics from the room and the presenter.**
   - I rendered `OstadYT6` with `plain: true` at 0.25 scale, so it shows only the room and the presenter. It went to the scratchpad and was not committed.
   - The **graphic layer** is every pixel where the v6 render differs from that plain render by more than 20 grey levels.
2. **Find the imagery.** I split the graphic layer into 40 px blocks (measured at 1080p). A block counts as imagery when all three hold:
   - it is textured (luma std above 7) or dark (luma below 120)
   - less than 35 % of it is near-white card or type
   - its component passes the clean-up: I closed the components and filled each one's bounding box, because the bright clinic walls read as flat.

   I checked the mask by eye at f60, 300, 1200, 1795, 1830 and 2000:
   - it matches the windows
   - it reads about 2 % of the frame as imagery on B01, a false positive from the name super.
3. **Moving or still.** A frame counts as moving when the mean |Δluma| inside imagery present in both frames is above 0.5 grey per frame. The result depends on this threshold, so the range is reported too.
4. **Segments.** There are 25: beats B01–B20, the 4 section cards (carved out of the first 30 f of B04, B09, B13 and B17), and the end card.
5. **Hard cuts.** Found with ffmpeg `scdet=threshold=10`, the same detector and threshold as the reference `cuts.json`.
6. **References.**
   - Fill and takeover rates come from `measure/*/*/graphic_elements.json` (`image_card` boxes; a takeover is a box of at least 50 % of the frame held for at least 6 f).
   - Cut rates come from `cuts.json`.
   - Rosacea v5 (`Rosacea laser (v5, clean captions).mp4`, 9:16) was read from a 1 fps contact sheet of 119 frames.

## Totals

| Measure | v6 | References | Rosacea v5 |
|---|---|---|---|
| Mean image fill share (whole runtime) | **14.8 %** | image cards alone: Evident 13.2 %, evident_yt 11.4 %, drjc 9.8 %, grove 8.6 %, Ro 2.6 %. These cards sit **on top of full-frame moving footage**. | 100 % moving footage under every card |
| Fill while an image is on | 29.0 % | 18–26 % | cards about 15–30 % over the footage |
| Share of runtime with any imagery | **50.6 %** (45.7 s). 44.6 s have none. | 100 % (the base layer is video) | 100 % |
| Image time that moves (0.5 grey/f) | **82.2 %** (57.3 % at 1.0, 91.2 % at 0.25) | camera moving 85–92 % of shots | footage always moves |
| Full-frame takeovers per minute | **0.66** (B18 only, 1.62 s) | image cards ≥50 % of the frame: Evident 6.1, evident_yt 5.9, grove 5.2, drjc 3.3, colin 3.1 | 1 dimmed takeover (1:21–1:25, "Treat it directly") |
| All step-outs (pip, him out, full-bleed) | 3 (B12, B17, B18) = 2.0 /min, 6.54 s total | n/a | n/a |
| Frame splits | **0**. B15's split sits inside a card that covers 36 % of the frame. | split-labelled is used (G1 T11, G3 T6) | 0 |
| Hard cuts per minute | **1.3** (75.46 s, 77.08 s) | Ro (16:9) 9.2, median shot 4.85 s; Evident 13.4–16.5; grove 11.2 | footage continuous |
| Frames with imagery ≥50 % / ≥33 % | 5.5 s / 14.1 s | n/a | n/a |
| Blurred pillarbox or side-fill | **0 frames** | banned | 1 dimmed-blur background (1:21–1:25) |

**The v6 cards are not too small.** At 29 %, the fill while an image is on is above the references' 18–26 %. The gap is in the **base**:
- In the references, and in rosacea, the card sits on full-frame moving footage.
- In v6, about 85 % of every frame is the flat cream room. Beside him, the room is the only thing on screen for half the runtime.

## Per segment (layout classes: LC him left + card right · LT him left + type right · LW him left + window right · PIP · CO centred object, him out · FB full-bleed)

| Seg | Time (s) | Layout | Fill mean / max % | Image moving / on (s) | Notes |
|---|---|---|---|---|---|
| B01 | 0.0–4.4 | LT | 2.1 / 3.4 | 2.12 / 2.25 | wordmark behind him; the "image" is the name super |
| B02 | 4.4–6.7 | LC | 10.6 / 21.0 | 1.00 / 1.21 | product plate |
| B03 | 6.7–11.0 | LC | 14.1 / 16.7 | 3.38 / 4.12 | flow diagram, 3 round photos |
| S1 | 11.0–12.2 | LT | 0 | n/a | |
| B04 | 12.2–17.2 | LW | 44.0 / **57.4** | 4.88 / 4.92 | the consult window grows to 57 %; the biggest image while he is on screen |
| B05 | 17.2–22.8 | LC | **0** | n/a | glass notifications only |
| B06 | 22.8–27.8 | LC | 23.5 / 27.8 | 3.21 / 4.96 | phone; **1.71 s still** |
| B07 | 27.8–31.3 | LC | 18.0 / 30.1 | 2.79 / 3.38 | phone + calendar |
| B08 | 31.3–37.2 | LC | **0** | n/a | intake form |
| S2 | 37.2–38.5 | LT | 0 | n/a | |
| B09 | 38.5–41.5 | LC | **0** | n/a | question cards |
| B10 | 41.5–45.0 | LC | **0** | n/a | checklist |
| B11 | 45.0–49.2 | LW | 31.1 / 33.3 | 3.96 / 4.00 | session photo in a window |
| B12 | 49.2–51.8 | PIP | 26.7 / 29.9 | 1.62 / 2.50 | he is in the pip, but the footage is still a 30 % window, **not a takeover** (beats.json says full-bleed [0,0,1920,860]) |
| S3 | 51.8–53.0 | LT | 0 | n/a | |
| B13 | 53.0–57.5 | LC | 7.4 / 13.0 | 3.38 / 3.38 | donut, 3 round photos |
| B14 | 57.5–60.4 | LT | 0 | n/a | "The next frontier" |
| B15 | 60.4–66.7 | LC | 36.1 / 38.0 | 3.71 / 6.12 | split inside a card; **2.38 s still** |
| B16 | 66.7–71.2 | LC | **0.9** | n/a | bar card |
| S4 | 71.2–72.5 | LT | 0 | n/a | |
| B17 | 72.5–75.5 | CO | 43.3 / 54.0 | 1.38 / 2.92 | skull; he is out from f1754; **1.50 s still** (median Δ 0.44) |
| B18 | 75.5–77.1 | **FB** | **100** | 1.62 / 1.62 | MOA film: the only full-bleed |
| B19 | 77.1–82.8 | LC | **0.6** | n/a | synapse panel, drawn |
| B20 | 82.8–87.2 | LW | 18.5 / 19.4 | 4.21 / 4.25 | patient window + quote card |
| END | 87.2–90.2 | LC | 0 | n/a | |

## Layout repetition
- **Him keyed left with something on the right: 22 of 25 segments (88 %), and 83.7 s of 90.25 s (92.8 %).** All graphics sit in one zone, x 700–1870.
- **By class:**

  | Class | Segments | Which |
  |---|---|---|
  | LC | 13 | B02, B03, B05–B10, B13, B15, B16, B19, END |
  | LT | 6 | B01, S1–S4, B14 |
  | LW | 3 | B04, B11, B20 |
  | PIP, CO, FB | 1 each | B12, B17, B18 |

  The orchestrator's "about 15 of 25" counted only LC + LW. That comes to 16.
- **Runs:**
  - The longest unbroken him-left run is **13 segments, 0–49.2 s**, before the first step-out (B12).
  - Then 6 segments (51.8–72.5 s), then 3 (77.1–90.2 s).
  - The longest run of the exact same class is LC from B05 to B08 (B06 and B07 share one phone): 4 segments, **20 s**.
  - For scale, the Ro 16:9 references change the whole frame about every **4.85 s**.
- **Rosacea v5 for comparison.** It had one presentation too (his raw footage, full frame), but its cards moved between about 4 zones:
  - top band (12–14 s, 22–27, 33–35, 52–60, 74–80, 86–89, 97–101)
  - mid-chest (5–11, 15–21, 61–63, 71–73)
  - lower third (29–32, 36–51, 90–95, 102–115)
  - right edge (56–70)

  It also had one dimmed takeover. v6 uses 1 zone.

## Presentation consistency
**It holds.** He is keyed at one transform (scale 0.7, x −30, y −150) with 0 px variance whenever he is on screen. He steps out 3 times, all on purpose:
- B12: pip, 2.54 s
- B17 from f1754, and B18: 3.96 s

There is no flipping to the raw phone footage, and there are no blurred side-fills: 0 frames on the 1 fps scan, and the code grep finds no full-frame `blur()` in OstadYT6 (the only one is in `exo6/labItems.tsx`, which is not mounted). The catch is that this consistency, with every graphic placed beside him, is the cause of the repetition. The brief allows stepping out "only on purpose", and v6 does it only 3 times.

## Top 5 gaps and the fixes
1. **One layout for 88 % of segments, with a 49 s unbroken run.** Make the step-out the planned rhythm: at least 1 frame-level change every 15 s, no class run longer than 3 segments or 15 s, and at least 3 graphic zones (right, top band, full frame).
2. **Takeovers: 0.66 /min, against 3–6 /min in the references. 0 frame splits.** Convert these, with him to the circular pip (the existing `portrait-pip-circle`) or out:
   - **B11** session photo (IMG_3712–3714, coil, console, 24:30 timer): full-bleed depth push, with ring markup on the coil and the timer.
   - **B04** consult: let `CardFullMorph` finish at full frame (it already reaches 57 %) for about 2.5 s, then return.
   - **B12**: make it the full-bleed it is specified as ([0,0,1920,860]), not a 30 % window beside the pip.
   - **B15** classic vs beyond: a **true frame split**, two full-height halves (laser | ExoMind session) with labels on the spoken words.
   - **B20** "It quiets my brain": a **split** with him keyed in the left half and the patient's footage full height on the right, quote set over the footage.

   That gives 6 step-outs plus B17–B18, about 5 /min.
3. **Fill is 14.8 % mean, and 44.6 s have no imagery at all.** Six beats with no image add up to 28.3 s: B05, B08, B09, B10, B16, B19. Fixes:
   - **B19** synapse: show the BTL MOA synapse footage full-bleed instead of the drawn panel.
   - **B09** questions: a window on the P0001 consult still ("felt like tapping").
   - **B08** intake: the real console or intake moment from the clinic bank behind the form.

   Target: a mean fill of at least 30 % and imagery on at least 75 % of the runtime.
4. **Frame-level change rate is 1.3 cuts /min**, against 9.2 for Ro 16:9 and 13–16 for Evident. The 4 section cards are type beside him (LT). Make S1–S4 **full-frame cards** (him out, or scaled back), so the 4 turns become 4 frame changes. Use B06/B07's phone as a camera move into a full-frame phone to break the 0–49 s run near 25 s.
5. **18 % of image time is still**, which breaks "every image moves":
   - B15: 2.38 s still
   - B06: 1.71 s
   - B17: 1.50 s (median Δ 0.44)
   - B12: 0.83 s
   - B03: 0.75 s
   - B07: 0.58 s

   Add the measured drift or push (RULES.md) to each image layer for its whole life. Gate the render on no still stretch longer than 0.5 s at 0.5 grey/f.

Side note for the graphics agent: the B16 card is headed "ROSACEA FLARE TRIGGERS" inside the ExoMind edit. Check it against ADDED RULE 2.
