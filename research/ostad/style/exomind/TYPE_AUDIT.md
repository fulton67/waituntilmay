# Type motion audit: YouTube v4.1 (Exomind and total skin health)

Study only (2026-11-17). The source is `Downloads/Ostad - Exomind and total skin health (YouTube v4.1).mp4` (1920×1080, 24 fps, 2165
frames). **f = output frame at 24 fps.** The code is `brand/remotion/src/OstadYT.tsx` + `components/YT.tsx`, with timings from
`public/exomind-skin/props_yt.json`. This doc does not repeat DEVICE_LIBRARY.md or the reference type sheets; it audits our own entries.

The frame strip is `type_f04_strip.jpg`: f548–f600, every 4 f, cropped to x 760–1500 / y 500–680. The crop is the right-hand canvas only,
with no face, footage or BTL imagery, so it is committed. The red line marks the resting top of the cap height, y = 576.

## 1. F04 S4 (~24 s): "Check your texts"

**What it is in code (S4, section start 17.2 s = f413):**

```tsx
<div style={{ position: "absolute", left: X, top: 560, ..., ...life(t, 5.5) }}>      // group: icon + text, 2 s CSS ease, 20 px rise
  <Icon name="chat" size={110} draw={prog(t, 5.5, 0.7)} color={read ? BLUE : INK} />  // badge "1" at 7.0 (quint 0.3), turns blue at 7.6
  <Kinetic text="Check your texts" at={5.6} size={H1} />                             // each word: 2 s CSS ease, 20 px rise, 0.063 s stagger
  <div style={{ ...small(28), ...life(t, 7.9) }}>After the event, reply to schedule a consultation.</div>
```

So the headline carries **two stacked 2 s entries**. The group's `life()` (from f545) wraps Kinetic's per-word `ease()` (from f547).
The opacities multiply and the two 20 px rises add.

**Measured (pixel tracking per word on luminance difference from f540; script in scratchpad `track2.py` / `fit_f04.py`):**

| | Check | your | texts |
|---|---|---|---|
| first ink (opacity ≥ 0.01) | f553 | f553 | f555 |
| opacity velocity peak | f564 | f564 | f564 |
| opacity 0.95 | f585 | f585 | f587 |
| fully at rest | f590 | f590 | f593 |
| fitted start / duration, CSS ease `.25,.1,.25,1` | f551.9 / **47.8 f** (RMSE 0.013) | f552.8 / 47.8 f | f553.8 / 47.6 f |
| same data fitted with `arrive` `.22,1,.36,1` | RMSE 0.032 (needs 72.6 f) | 0.032 | 0.033 |
| top edge, first legible frame → rest | 606 (f556) → 576 | 602 (f559) → 585 | 606 (f558) → 578 |

- **Direction:** straight up, vertical only. The icon rides up with the group, so everything moves as one block.
- **Distance:** 40 px nominal (20 group + 20 word). 30 px of it is visible travel after the first legible frame (606 → 576). Our own
  `arrive` token is 16 px (MOTION.md), so this is ~1.9× the visible distance and 2.5× the nominal.
- **Duration:** 47.8 f fitted (2 s). 0.01 → 1.0 takes f553 → f590 = 37 f (1.54 s), and the last 5 % alone takes f585 → f590.
  - Evident's measured median is **7.2 f** for graphic entries and **6.4 f** for caption text (53 Shorts, 26,857 fits; MOTION.md).
  - Our `arrive` token is 14 f.
  - So the measured duration is **6.6× Evident** and **3.4× our own token**.
- **Easing:** the CSS-ease shape fits best (RMSE 0.013 vs 0.032 for `arrive`, 0.030 for linear).
  - The start is slow: f552–556 is under 9 % opacity, a fog.
  - The tail is long: 87 % at f580, 95 % at f585, 100 % at f590.
  - The peak velocity comes at f564, ~25 % in.
- **Overshoot:** none. Opacity peaks at 1.003 (noise), and the top edge is monotonic.
- **Stagger:** fitted word starts are 1.0 f apart (code: 0.09 × 0.7 = 0.063 s = 1.5 f). That is 2–3 % of a 48 f move, so the three
  words arrive as one block, and the "kinetic" stagger is invisible.
- **Sync to speech** (word onsets in `props_yt.json`):
  - The entry starts at f547 (22.8 s), during "our team." (22.28–22.77 s).
  - "Please" comes at 23.38 s (f561) and "**check**" at **24.16 s (f580)**.
  - At f580 the headline is at 0.87 opacity and still ~3 px below rest. It settles 5 f later, and the last pixel arrives at f590.
  - So the type is **33 f early and still moving when he says the word**. It neither lands on the word nor sits settled before it.
  - The badge "1" pops at f581, the only thing in the block that does land on "check".

**What's wrong, concretely**

1. **Too slow:** a 48 f fade for a word-tied headline, where Evident uses 7 f and our token 14 f. MOTION.md already says that "a word-tied reveal
   must use `cut` or `arrive`, because a 2 s fade can't land on a word". S4 breaks that rule.
2. **Double entry:** the group `life()` wraps `Kinetic`, so the opacity multiplies and the rise doubles to 40 px. The result is a long, floaty
   drift, and the icon drifts with it.
3. **A grey ghost:** for ~20 f (f556–f572) the headline is mid-grey `#373737` at 0.3–0.7 over the `#eef0f3` canvas. It reads as
   low-contrast, half-there type (strip rows f556–f568), not as type arriving.
4. **No real stagger:** 1 f between words in a 48 f move. It reads as one slab sliding.
5. **Off the word:** it starts 1.4 s before "check" and is still settling on it. Only the badge is on time.
6. **Same entry as everything else:** see §2. 44 of the 73 text entries in v4.1 use this same 2 s CSS-ease fade-up. That is why the brief says
   "the way the type moves in is wrong" and asks for at least 5 distinct entries.

For the redo (not built here), on the evidence above:
- Start on the onset frame (f580 for "check").
- Use `arrive` 14 f / 16 px, or a per-word mask reveal like the rosacea Hook (105 % rise from its own mask, 0.6 s quint).
- Give the words a 2–3 f stagger.
- Drop the wrapping `life()`.
- Keep the badge pop on "check".

## 2. Every text entry in v4.1

Global time = section start + local. Families:
- **L** = `life()`: CSS ease, 2 s / 48 f, opacity 0→1, rise 20 px (24 where noted), out 0.3 s.
- **K** = `Kinetic`: per word, CSS ease 2 s, rise 20 px, stagger 0.7 × step (default 0.063 s), no mask.
- **T** = `Tag`: CSS ease 2 s, 12 px rise, `pop` SFX unless `sfx={false}`.
- **Q** = `prog()`: quint-out over the given seconds.
- **C** = cut / swap (no motion).

`head()` = NHG Display 500 at 0.65 × px. `label()` = caps 500 at 0.8 × px, +0.04 em. `small()` = NHG Text.

| # | sec | global s | text | component | entry |
|---|---|---|---|---|---|
| 1 | s1 | 0.20 | "Total skin health evening" (label + icon) | L | life 0.2 |
| 2 | s1 | 0.35 | "Dr. Ariel Ostad" | K | H1, out 4.3 |
| 3 | s1 | 0.80 | "Triple Board-Certified Dermatologist" | L | small 28 / 500, out 4.3 |
| 4 | s1 | 4.70 | "Exomind" | K | HERO 136 (icon box life 4.5) |
| 5 | s2 | 6.92 | "Include the mind" (+ Toggle at 7.82) | L | head 48 |
| 6 | s2 | 7.77 | "The mind" | T | |
| 7 | s2 | 8.42 | "Your skin" | T | |
| 8 | s2 | 9.27 | "Total skin health" (key words blue) | K | H1 |
| 9 | s3 | 11.55 | "The Exomind coil" | Callout | Q 0.45 leader + label |
| 10 | s3 | 12.35 | "Session in progress" + 00:ss timer | L | glass pill; timer counts per second |
| 11 | s4 | 17.20 | "After tonight" | C | static on the section cut |
| 12 | s4 | 18.10 | "Giveaway winners" | **K inside L** | life 0.9 + Kinetic 0.9 (double, like F04) |
| 13 | s4 | 19.10 | "Email" chip | Q | inside life 1.0; flips blue at Q 0.35 > 0.5, 5 % scale bump |
| 14 | s4 | 19.65 | "Phone" chip | Q | same |
| 15 | s4 | **22.80** | **"Check your texts"** | **K inside L** | §1 |
| 16 | s4 | 24.20 | badge "1" | Q | scale 0→1, 0.3 s, `pop` |
| 17 | s4 | 25.10 | "After the event, reply to schedule a consultation." | L | small 28 |
| 18 | s5 | 27.48 | bubble "Reply to book your consultation" | Q | 0.35 s, 14 px rise, scale 0.94 (starts at 0.6 opacity) |
| 19 | s5 | 28.48 | bubble "Yes, please" | Q | same |
| 20 | s5 | 29.58 | bubble "We'll help you find an appointment" | Q | same |
| 21 | s5 | 30.63 | "Booked" | T | size 26 |
| 22 | s5 | 31.28 | "During your visit" | K | H1 |
| 23 | s5 | 31.58→32.58 | "Your goals" row | Q | dim 0.35 → lit at 32.58 (Q 0.4), check draws, `yes` |
| 24 | s5 | 31.73→33.28 | "Your medical history" row | Q | same |
| 25 | s5 | 31.88→35.08 | "Is Exomind right for you?" row | Q | same |
| 26 | s6 | 37.50 | card: "Your questions" / "Live" / "Ask us anything" | L | rise 24, glass card |
| 27 | s6 | 39.10 | "What does a session feel like?" | typewriter | 1.3 s, blinking caret |
| 28 | s6 | 40.95 | sent question + check | L | |
| 29 | s6 | 41.80 | "Something we haven't covered?" | L | |
| 30 | s6 | 45.00 | "Thank you" label swap + "Thank you for joining us" / sub | C + Q | opacity 0.6→1 (Q 0.3), 8 px (Q 0.4) |
| 31 | s7 | 48.40 | "An Exomind session" | Callout | Q 0.45, out at 49.35 |
| 32 | s7 | 49.75 | "See you in the office" | L | glass pill |
| 33 | s8 | 51.70 | "Total skin health" label | L | |
| 34 | s8 | 51.80 | "A comprehensive approach to" | K | step 0.07 |
| 35 | s8 | 52.20 | "total skin health" | K | HERO, blue |
| 36–38 | s8 | 52.30 / 53.10 / 53.90 | "Skin care" / "The mind" / "Technology" | L | label 24 + icon, `pop` each |
| 39 | s9 | 58.75 | "The next frontier" | K | H1 |
| 40 | s9 | 60.40 | "Caring for the skin" | L | label 26 |
| 41 | s9 | 64.00 | → "Classic treatments" | C | text swap |
| 42 | s9 | 62.40 | "Beyond: the mind" | L | label 28 blue |
| 43 | s10 | 65.30 | "Stress" | T | |
| 44 | s10 | 67.35 | "Calm" | T | |
| 45 | s10 | 68.70 | "Our emotions show in our skin" | T | |
| 46–51 | s11 | 69.4 / 70.5 / 72.0 / 75.4 / 78.0 / 79.6 | step labels Coil … Focus and flow | StepPlayer | slot slide 520 ms cubic-out; label swaps |
| 52–54 | s11 | 69.4 / 72.0 / 79.6 | source line ("session in our office" / "Illustration") | C | |
| 55 | s11 | 69.60 | "Exomind coil" | T | sfx off, leader Q 0.5 |
| 56 | s11 | 70.50 | "Magnetic pulses" | T | |
| 57 | s11 | 73.20 | "Creates" | L | label 24 |
| 58 | s11 | 73.30 | "Neuroplasticity" | L | head 68 |
| 59 | s11 | 75.90 | "+24" counter | L + Counter | 0→24 over 2.6 s |
| 60 | s11 | 75.80 | "New connections" | L | with #59 |
| 61 | s11 | 77.90 | "Neurotransmitters in balance" | L | |
| 62 | s11 | 79.90 | "Focused," | K | 96 px |
| 63 | s11 | 80.05 | "in flow" | K | 96 px, "flow" blue |
| 64 | s12 | 82.72 | "Her words" | C | static |
| 65–68 | s12 | 82.92 / 83.20 / 83.48 / 83.76 | "It" "quiets" "my" "brain." | colour flip | RULE → INK at Q(0.3) > 0.5, no motion |
| 69 | s12 | 84.12 | "An Exomind patient, in our office" | L | small 28 |
| 70 | s12 | 83.77 | "Feel better" node | Q in L | lit Q 0.4, `yes` |
| 71 | s12 | 85.77 | "Better skin" node | Q in L | same |
| 72 | s13 | 87.25 | card: "Exomind · Dr. Ariel Ostad" / "Book a consultation." / "Link in the description." / "Book now" / @drarielostad | L | rise 24, glass |
| 73 | s13 | 88.60 | "Book now" → "Booked" | C | press scale 0.92 at 88.50 |

Plus **82 caption lines** (`YTCaptions`). Each word cuts on at its measured onset frame, with no fade or rise (DEC 14d rule 8), so captions
are already on the word. The headline type is the part that isn't.

**Count:** 73 text entries, not counting captions. Some rows combine two families, so the tallies below overlap.
- **44** ride the 2 s / 48 f CSS-ease fade-up (L, K or T): 60 %.
- About 14 use quint `prog` (chips, bubbles, rows, nodes, badge, Callouts, thanks block).
- The rest are cuts or swaps, 4 colour flips, 1 typewriter and 1 counter.
- Three entries are doubled (K or Q inside L): #12, #15, and the s12 nodes.
- None uses a mask reveal. Apart from the captions and the S4 badge, no headline entry is placed on a measured word onset.
