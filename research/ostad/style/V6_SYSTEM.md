# The v6 system: start here (it replaces v4 as the way to build an Ostad video)

v4 / v4.1 (`OstadYT.tsx`) is retired as a model. Its problems were:
- the same 2 s fade-up on 60 % of its text
- dot-and-line "arrows"
- words on screen instead of the things themselves
- no title cards
- no head tracking
- flipping between his keyed footage and the raw phone footage

v6 (`OstadYT6.tsx`, 2026-11-17) is the current system. An agent starting a new Ostad edit reads the files in this order.

## 1. The rules (what Naim asked for)
| File | What it holds |
|---|---|
| `exomind/specs/DESIGN_PER_BEAT.md` | Design every beat. Show the thing, not the text (kinetic text on at most 1 beat in 5). A beat sheet with 3 concepts per line. A device library, with at least 3 devices never built before per edit. Variety checks fail the render. Real arrows. Measured type entries. |
| `exomind/specs/EXOMIND_REDO.md` | Rebuild a topic with the rosacea method. A translation table. At least 3 animations that exist only for this topic. The dot-and-line ban. Title and section cards. Immersive images that always move. Head tracking. A usage audit. Gap checks. |
| `../../../brand/motion/RULES.md`, `MOTION.md` | Measured tokens: entries settle in 7.2 f at 24 fps; moves take 8 f; exits are animated, never cut. |

**Naim's review lessons from v6** (DECISIONS 14m, 14n). Every edit must follow these:
- **No empty signifiers.** Every image is the literal subject of the line:
  - his own skincare products for "skin care"
  - a non-ExoMind in-office treatment for "classic treatments"
  - the real patient and her own quote for the outcome

  No stock face with a zoom box. No ring pointing at nothing. Every arrow lands on a meaningful target.
- **Arrows:** all the same brand blue, one weight, a real head.
- **No full-frame blurred side-fill (no blur pillarbox).** Keep him keyed in front on the left, with footage beside him in a clean rounded window or properly filling the frame.
- **Circular portrait (PiP):** a true circular mask, the face centred from the head track, nothing of him outside the circle.
- **Dates on screen match the real event.** The ExoMind evening is Tuesday, December 8.
- **No graphic is reused across topics, and each edit must beat the last.** Hash check: `tools/reuse_check.py`.
- **Real material comes from the clinic library,** `C:\Users\naimj\clinic-library`. Read `HANDOFF.md` first. Read-only, local previews and frames only, never write to iCloud, no names, nothing flagged SENSITIVE or needs_review, every patient item goes on the client-approval list.

**Gap rounds 1–2 lessons** (DECISIONS 14o, 14p; `exomind/gap/ROUND1.md`, `ROUND2.md`). The numbers are in `brand/motion/RULES.md` (the hand-written block); the workflow is the `ostad-video` skill (`.claude/skills/ostad-video/SKILL.md`):
- **Immersion is measured, not felt.** Mean image fill ≥ 35 %, ≥ 3 takeovers/min, no layout family for more than 3 segments or 15 s (variety_check R13). Section cards sit full frame on a real picture.
- **One image subject on at most 2 beats** (R14). A diptych shows two different subjects, never two moments of one clip.
- **A section title is fully lit for 60 f** (hold-min 2.5 s); check a still at the hold midpoint. Every other text keeps the same hold: move an exit into the next beat rather than cut a hold.
- **No straight source edge on the keyed presenter.** His phone frame's right edge is feathered over 140 source px; the pip's left edge over 16 %. `tools/edge_check.py` must find 0 frames.
- **A licensed film's marks are fully in or fully out.** Crop the MOA film's top band (EXOMIND mark, BTL emblem) and its subtitle band together; never cut through a mark, never dissolve two marks over each other.
- **Footage an earlier edit used full frame** needs a new crop or role (reuse_check).
- **Arrows never cross text** (`tools/arrow_text_lint.py`); tracked tails anchor on `templeR + (40, −6)`.
- **One sound per event class** (`beats.json sfx_map`), on ≥ 72 % of entries.
- **Measure a sheet's complaint on the render itself** before fixing: a "clipped" title was a hold caught mid-type, a "clipped" mark was a sheet label.

## 2. What the references taught (read before designing)
| File | What it holds |
|---|---|
| `DEVICE_LIBRARY.md` | 79 devices with stable ids: §A 13 arrows, §T 19 text entries, §D the rest. Reference frames, measured entry/hold/exit, built status. Stats are in `measure/_devices/entry_stats.json`. |
| `exomind/ROSACEA_METHOD.md` | Why the rosacea edit worked: real credited photos, the exact spot ringed on the spoken word, the topic-only animation, glass cards, fixed places around the head, one sound per event type. |
| `exomind/TYPE_AUDIT.md` | What was wrong with v4.1's type, in numbers. |
| `web/newapology/pages/site.md` §9 | UI motion numbers (arrive 600 ms / 12 px, shared-cover morph 1100 ms with radius 19 → 5, pill morph 380 ms). Polish only: v5 leaned on these sites and was rejected. |

## 3. The ExoMind edit as the worked example
| File | What it holds |
|---|---|
| `exomind/BEATS.md` + `exomind/beats.json` | 20 beats plus the title card, 4 section cards and the end card. Each beat has its noun, 3 concepts, the pick, what it does better than our closest earlier graphic, the device, entry, immersion mode and assets. |
| `exomind/TRANSLATION.md` | Each rosacea technique mapped to its ExoMind version, and the 4 ExoMind-only animations frame by frame. |
| `exomind/USAGE_AUDIT.md` | Each established device and tool, and where it appears. |
| `exomind/ARROW_TYPE_PROOF.md` | Our arrows and type entries measured against the references. |
| `DECISIONS.md` 14g–14n | Every decision with its numbers: track, library, design, components, arrows/type, build, Naim's fixes. |

## 4. The code (Remotion, `brand/remotion/src/`)
| Path | What it is |
|---|---|
| `devices/Arrow.tsx` | 9 variants: curved-callout, straight-pointer, bracket-pointer, route-trace, arc-connector, dashed-flow, light-ribbon, orbit-arc, marker-tick. Draw-on tail → tip, alive while held, retract on exit, `to` can follow a moving point. |
| `devices/TypeEntry.tsx` | 14 measured text entries; `wordFrames()` lands text on spoken words. |
| `devices/track.ts` | The head track: `follow()`, `landmark()`, `faceSafeRect()`. Data comes from `exomind/track.json`, made by `tools/face_track.py` (MediaPipe + One Euro). |
| `devices/README.md` | Usage. |
| `exo6/*` | Components: cards (wordmark, chapter, end), phone message, calendar, intake form, quote carousel, checklist, glass UI, product plate, flow diagram, card morph, donut, split, zoom inset, windowed footage, circular PiP, timeline, and the ExoMind-only FieldThroughSkull / RewireTrace / PulseTrainSynapse / SessionTimeline. |
| `OstadYT6.tsx` | The assembled edit. Composition `OstadYT6`. |

## 5. The checks (every render must pass; run with the style venv, `-I`)
| Tool | What it checks |
|---|---|
| `tools/variety_check.py <beats.json>` | Device repeats, consecutive entries, text-only share, distinct devices, never-built devices, dot-and-line. |
| `tools/reuse_check.py` | pHash/dHash of each graphic key frame against every earlier edit (threshold 0.107). |
| `tools/lint_compositions.py` | Dot-and-line callouts in the code. The no-static-image frame diff on the render. |
| Flash scan | ffmpeg `scdet=threshold=8`. Every cut must be an intended one. |
| `exomind/track_verify.json`, `pip_verify.json` | Tip-to-landmark error (median under 6 px, p95 under 15 px); PiP centring. |
| `tools/arrow_text_lint.py` | Arrow centrelines crossing text boxes (TextAudit `ARROWTEXT` lines from an `audit` render): 0. |
| `tools/edge_check.py` | A straight source-frame edge on the keyed presenter (column-edge detector on the effective alpha): 0 frames. |
| ffmpeg `ebur128=peak=true` | −14 LUFS integrated, true peak ≤ −1 dBTP. |

The current render is `C:\Users\naimj\Downloads\Ostad - Exomind and total skin health (YouTube v6).mp4`.
