# Oct 14 injections v2 (draft): critique for the building agent

Reviewed 2026-11-17: `Downloads/Ostad - Oct 14 injections v2 (draft).mp4` (1080×1920, 24 fps, 92 s). I looked at a frame every 2 s and full-size frames at 9, 22, 25, 52, 56, 76, 79 and 85 s.

**Naim's verdict:** it feels "extremely basic" and it is "circling random things". He is right. The footage is good (three treatments on one patient, with the real product named), but the graphics are hairline ovals, a numbered inset with a line to a circle, and glass text cards. Nothing explains what a neuromodulator or a filler does.

**Read first:** `research/ostad/style/V6_SYSTEM.md`, which replaces v4 as the model. Then `exomind/ROSACEA_METHOD.md`, `exomind/specs/DESIGN_PER_BEAT.md` and `brand/motion/RULES.md` (the Ostad video rules block). Follow the `ostad-video` skill.

## What's wrong, by timestamp

| t | What's on screen | Problem |
|---|---|---|
| 0:00–0:02 | Lower third, then "A typical patient" | No title card. "A typical patient" is plain text. |
| 0:04 | "UPPER FACE" pill, about 3 % of the frame wide | A section card in name only, unreadable on a phone. |
| 0:08–0:12 | A white-bordered inset of the injection, with a hairline line to a circle on her forehead and an "INJECTION 1 · NEUROMODULATOR / Frown lines" kicker | **This is the dot-and-line callout, which is banned.** The circle sits on the forehead in general, not on the corrugator or procerus points, and the kicker is about 18 px. |
| 0:14–0:20 | Nothing | A dead stretch while he explains. |
| 0:20–0:22 | "More where it lifts / Less wh…" highlighter text | The text is cut off. This is the line that most needed a diagram (the injection pattern on the brow), and it got words. |
| 0:22 | "NEUROMODULATOR LASTS" slider | The label is invisible. |
| 0:24–0:28 | A "WHEN YOU SEE IT" glass table: Neuromodulator, a day or two; Filler, right away | Fine as information, but it's a text table. This is the natural place for a designed timeline with two bars on a day axis. |
| 0:30–0:38 | Nothing designed for "cheeks and jawline" and jowling | Dead zone. |
| 0:40–0:44 | A "Deflation" highlighter label | "Deflation vs stretching" is the key idea in the video, and it gets one word. |
| 0:48 | The inset + line + circle device again, for the outer cheekbone | Second use. |
| 0:52 | Two hairline ovals beside the nose, plus a "2" ring on her **ear** | "Circling random things," exactly. The ovals frame nothing, and a ring on the ear means nothing. |
| 0:54–1:00 | The inset + line + circle device a third time (Evolysse Smooth, laugh lines) | Third use, which fails variety_check's limit of 2 per device. The line runs from the inset to a circle under the nose. |
| 1:02–1:14 | Raw footage, plus a "A cannula, to minimise bruising" highlighter | Text again. Show the cannula. |
| 1:16 | **Two empty white cards over a full blur** | A blank frame and a broken-looking layout. |
| 1:18–1:30 | Before/after over a full blur, with an identical oval on the same cheek spot in both, a ① pin, then "about 15 min / 1–1½ years" cards | **Full blur, which Naim banned.** The ovals sit on the same place in both photos, so they show that something is there but not what changed. The photos are small, about 35 % of the frame. |
| 1:30 | "Book a consultation" over a full blur | Full blur again. |

## The patterns behind it

1. **The circles are decoration, not information.** A mark has to land on a meaningful, measured target and follow her face (head track, `tools/face_track.py`). An oval with no change inside it proves nothing. On a before/after, measure the change (cheek-projection contour, a shadow line under the cheekbone, nasolabial fold depth) and draw that, not a ring.
2. **One device is used three times.** inset + line + circle appears at 0:08, 0:48 and 0:56; the glass text card appears four times.
3. **There's no animation built for this topic.** The video has three real ideas, and each needs its own designed visual: neuromodulator vs filler, deflation vs sagging, and injection points.
4. **Text is the default.** "A typical patient", "More where it lifts", "Deflation", "Laugh lines: better", "A cannula, to minimise bruising", "Fuller cheek" and the slider and table cards are all words.
5. **There are dead zones.** 0:14–0:20, 0:30–0:38 and 1:02–1:12 have nothing designed.
6. **The type is too small and too faint.** The kickers, slider labels and before/after timestamps can't be read on a phone.
7. **Full blur is used three times** (1:16 to the end).

## What it should be: show the thing

| Line | Show this instead |
|---|---|
| "frown lines… neuromodulator" | **A muscle map:** the corrugator and procerus drawn as fibres over her brow, tracked to her face. The fibres contract on the frown, then relax as each injection point lights on its real spot, timed to his needle in the footage. |
| "more where it lifts, less where it…" | **The brow balance diagram:** the frontalis lifting vs the depressors pulling, with arrows sized by dose. More units where it lifts is shown as a heavier dot on the brow-lift side. |
| "when you see it: a day or two vs right away" | **A two-lane day axis:** filler lands at day 0, neuromodulator ramps in over 2–14 days. One designed object with a real time axis. |
| "deflation vs skin stretching" | **The topic-only animation:** a side-view face silhouette in which the fat pads shrink (deflation), compared with the skin simply hanging (sagging). Then filler restores the pad, and the jowl shadow lifts. This is this video's gut-microbiome. |
| "outer cheekbone / laugh lines" | Placement on her real face, drawn as a vector line along the zygomatic arch and the fold, tracked. Use the product name (Evolysse Smooth) as a small credited plate, not as a callout. |
| "cannula to minimise bruising" | A needle vs cannula tip close-up, with the cannula gliding past a vessel. Build it once and share it as a component with the under-eye edit, but change the drawing so the reuse check passes. |
| result | **A full-frame before/after:** him keyed on the left with a clean rounded window, or full bleed, never a blur. Measured change lines (the cheek contour before vs after, overlaid in two colours). Real times (4:42 PM vs 4:55 PM) at a readable size. |

## Bar to pass before re-rendering

- `tools/variety_check.py` on beats.json: no device more than twice, at least 6 distinct devices, at least 3 never built before, at most 20 % text-only, and 0 dot-and-line.
- `tools/lint_compositions.py`: 0 dot-and-line callouts and 0 static images. The inset + line + circle device counts as dot-and-line.
- Face marks are driven by the head track, with tip error median under 6 px and p95 under 15 px.
- No blur fill anywhere, and no empty card frames (1:16).
- Every text item is fully lit for at least 60 f. Take a still at each hold midpoint and confirm no word is cut ("Less wh…").
- A stills sheet with one key frame per beat. If two tiles look like the same design, redesign one.
- The "NOT FOR POSTING · CONSENT PENDING" banner stays until consent is confirmed.
