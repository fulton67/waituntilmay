# Gap: AUDIO (YouTube v6), EXOMIND_REDO §4.3

Measured 2026-11-17 on `Downloads/Ostad - Exomind and total skin health (YouTube v6).mp4` (90.25 s, AAC 48 kHz stereo).
Compared with the rosacea render `Ostad - Rosacea laser (v5, clean captions).mp4` (119.1 s) and the reference measurements
(`measure/<ref>/*/loudness.json`, `sfx.json`; M18/M19). Measure only: the composition is not touched.

Data: `gap/audio.json`. Scripts: `tools/gap_audio/analyze.py`, `post.py`, `mf.py` (style venv, `-I`). Voice/bed split is Demucs
htdemucs two-stems, as in M18. The SFX schedule is `exomind/beats.json` `sfx` / `sfx_hero`, played by `OstadYT6.tsx` at
volume 0.2 (hero) and 0.05 (rest).

## 1. Loudness

| | v6 | Rosacea v5 | Evident Shorts (67) | Evident YT (53) | ro ref (20) |
|---|---|---|---|---|---|
| Integrated (ebur128) | **−14.1 LUFS** | −13.9 | −14.4 (median) | −21.5 | −19.1 |
| True peak (ebur128 peak=true) | **−4.4 dBTP** | −2.1 dBTP | −0.6 | −4.3 | −2.0 |
| LRA | **1.3 LU** | 1.9 LU | 3.9 | 4.4 | 5.1 |
| Short-term (3 s) p10 / median / p95 / max | −14.7 / −14.1 / −13.5 / −12.9 | −14.9 / −14.1 / −13.0 / −11.4 | | | |
| Momentary max | −11.2 | −9.8 | | | |

- On target: −14 LUFS for YouTube, true peak well under −1 dBTP (the builder's sample-peak number was not a true-peak reading; true peak is −4.4).
- LRA 1.3 LU means a very flat, compressed voice. It is in line with the rosacea edit (1.9) and below the Evident refs (3.9–5.1). For a
  talking-head video this is not a defect; nothing to fix.

## 2. Voice intelligibility under the bed

| | v6 | Rosacea v5 | refs (median voice − bed) |
|---|---|---|---|
| Voice LUFS / bed LUFS | −14.2 / −51.3 | −14.0 / −49.2 | |
| Voice − bed | **37.1 LU** | 35.2 LU | Evident 9.6, Evident YT 11.3, ro 12.2; rule ≥ 8 LU |
| Voice-band (300–3400 Hz) SNR per 400 ms speech window: median / p5 / min | 43.0 / 34.4 / 25.0 dB | 44.9 / 40.2 / 11.9 dB | |
| Speech windows with SNR < 10 dB | 0 / 220 | 0 / 292 | |

There is no music bed. The "bed" is only the SFX plus Demucs residue. Intelligibility is not at risk anywhere. The real gap runs the
other way: the SFX are buried (see §3).

## 3. SFX vs graphic entries (M19 method, ±2 f)

**Schedule:** 56 SFX (20 hero at 0.2 = −14 dB, 36 others at 0.05 = −26 dB). By type: card 15, swish 17, pop 20, yes 4, **no 0**.

**Alignment by construction:** every scheduled SFX sits on its beat event frame, so timing is exact (0 f) wherever a sound exists.
- 110 graphic events in `beats.json` (91 entries, 19 exits/holds). **57 / 91 entries (62.6 %)** have an SFX within ±2 f. Including exits: 51.8 %.
- **34 entries have no SFX**, among them:
  - the 4 section cards (f263, 893, 1242, 1710) and the end card (f2092)
  - the B02 FDA chip (f150)
  - the B07 arc head landing on the slot (f723)
  - the B08 form fields and ticks (f784, 813, 844); only 2 of the ticks get a `yes`
  - the B16 bar build (f1614)
  - the B20 dashed flow to her quote (f2037)
  - 3 disclaimer fades (fine to keep silent)

**Detection in the render (M19 onsets on the Demucs bed):** this test cannot tell the SFX from noise here.
- 75 % of the scheduled SFX meet an onset within ±2 f.
- But the chance rate at random frames with the same onset density is **73 %**: the bed has 316 onsets/min of residue (rosacea 364/min).
- The Evident refs show the same ceiling: 60 % against 59 % chance (MOTION.md).

**Level, the real gap.** Each SFX is rebuilt from its wav at its gain:

| | v6 hero | v6 others | Rosacea (gain 0.32 × 0.7–1) |
|---|---|---|---|
| Peak dBFS: swish/card · pop · yes | −26 · −22 · −24 | −38 · −34 · −36 | ≈ −22 · −18 · −20 |
| SFX RMS − voice RMS over the same span (median) | **−23.8 dB** | **−32.9 dB** | ≈ −20 dB (estimated: v6 hero + 4 dB gain) |
| Bed rise at the SFX vs the 200 ms before (median) | ≈ +0.6 dB | −1.5 dB | |
| Matched filter: corr above the random-time control | 15 % | 19 % | |

The hero SFX play about 4 dB under the rosacea level. The other 36 play about 16 dB under it and 33 dB under the voice, which is
inaudible, masked by the speech. In the mix the SFX cannot be told apart from residue or from random times. The edit plays as if it
had about 20 faint sounds rather than 56. That breaks the rosacea rule that "the sound tells you what kind of event it is".

**One sound per event type?** Partly. The 5 wavs differ:

| wav | length | centroid |
|---|---|---|
| card | 0.40 s | 1140 Hz |
| swish | 0.42 s | 1096 Hz |
| pop | 0.09 s | 1308 Hz |
| yes | 0.50 s | 1948 Hz |
| no | 0.16 s | 657 Hz |

Two problems with the mapping:
- **card and swish are near-twins** (same length, centroid 44 Hz apart).
- **swish covers 6 different event kinds:**
  - arrows (B02, B03 ×3, B07)
  - highlighters (B08 f806, B16 f1655)
  - a hard cut to a photo (B12 f1181, B18 f1812)
  - a line wipe (B15 f1490)
  - a ring fill (B13 f1300)
  - a decode (B14 f1380)
  - a quote card (B20 f2045)

  So the arrow, our signature device, has no sound of its own, and 3 of its 5 swishes are at −38 dBFS.
- `no` is never used. ExoMind has no "wrong" beat, so that is acceptable.
- In rosacea the mapping was strict: swish = ring, pop = chip, card = card.

## 4. Clicks and pops at joins

- **The voice is one continuous track** (`exomind-skin/audio.m4a`, 90.20 s). The only audio edit is the source join at raw 43.98 → 44.4 s =
  comp f882.4. There, the sample step is 0.026 (the file's p99.9 step is 0.349), M moves −16.0 → −16.9, and there is no HF transient: **clean**.
- **HF transient scan** (> 6 kHz, 1 ms peak > 12× the local median): 53 candidates.
  - All sit in the vocals stem. For example f751.6: −16 dB HF in the vocals stem vs −53 dB in the bed.
  - They are consonants, not clicks.
  - None comes from an SFX edge or a join.
- No pops at any beat boundary: the sample step at the cut is ≤ 0.075 everywhere (p99.9 is 0.349).

## 5. The cuts f1181, 1242, 1811, 1850

| cut | M 50 ms before → 450 ms after (LUFS) | ΔM | min 20 ms RMS in ±100 ms | dropout | click |
|---|---|---|---|---|---|
| 1181 (B12 hard cut to IMG_3714) | −13.2 → −13.5 | −0.2 | −22.8 dBFS | no | no |
| 1242 (section 03) | −14.9 → −12.9 | +2.1 | −23.2 | no | no |
| 1811 (hard cut to MOA neuron) | −13.6 → −14.8 | −1.2 | −18.9 | no | no |
| 1850 (B19) | −16.1 → −12.4 | +3.7 | −22.2 | no | no |

The cuts are picture-only. The voice runs straight through, so nothing drops out. The +2 to +4 LU moves are syllable onsets, not gain
steps: the other beat starts move the same way (f893 +5.9, f997 +7.7, f546 −6.6 are pause/onset edges).

## 6. Gaps, ranked, and fixes

1. **The SFX are inaudible.** Non-hero SFX play 33 dB under the voice; hero SFX play 24 dB under it.
   - Fix: raise to the rosacea level, `volume` 0.32 for hero and 0.16 for the rest (−10 / −16 dB). Rebuild and check that the hero SFX RMS sits
     about 20 dB under the voice RMS (rosacea) and the others no more than 24 dB under it (now 33).
   - Keep true peak ≤ −1 dBTP (headroom now 3.4 dB) and integrated −14 ±0.5 LUFS. Re-measure with `tools/gap_audio/post.py`.
2. **One sound covers 6 event types; card ≈ swish.**
   - Fix:
     - give the arrow draw its own short sound (a pen/draw tick, ~0.2 s)
     - keep `swish` for reveals and wipes only
     - make `card` lower or longer than `swish` (centroid at least 300 Hz apart)
     - use `pop` for chips/labels only
     - use `yes` for ticks and the slot circle
   - Map it in `beats.json` by device class, not by hand per beat.
3. **The structural entries have no sound.** That means the 4 section cards, the end card, the arc landing (f723), the B08 ticks and the B20 dashed flow.
   - Fix: add one sound per section card (the "chapter" event, which gets its own sound) and one on the end card, and a `yes` on each B08 tick (f813, 817, 821).
   - That raises entry coverage from 62.6 % to about 72 %. Leave the disclaimers and the exits silent. That is still well above Evident's 60 %, and
     MOTION.md says "one sound per hero reveal", so do not chase 100 %.
4. Fine as is: loudness (−14.1 LUFS, −4.4 dBTP), voice intelligibility (37 LU over the bed, no window under 25 dB voice-band SNR), the
   joins and the 4 cuts (no dropouts, jumps or clicks).
