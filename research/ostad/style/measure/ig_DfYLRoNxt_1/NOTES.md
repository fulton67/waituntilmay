# Reference reel DfYLRoNxt_1 (measured 2026-11-19)

Source: https://www.instagram.com/reel/DfYLRoNxt_1/ (a PMU studio's nano-brows before/after). It was fetched with yt-dlp, with no login
and no cookies, for analysis only. The video is not kept in the repo.

## Format

| Property | Value |
|---|---|
| Size | 1440×2560 (9:16) |
| Frame rate | 30 fps |
| Length | 7.50 s |
| Audio | AAC, its own reel sound |

## Structure (ffmpeg scdet threshold 6; hard cuts with score > 17)

| # | Time (s) | Label (top centre) | Shot |
|---|---|---|---|
| 1 | 0.00–1.23 | "With me" | AFTER: handheld, reclined, frontal 3/4, brows done |
| 2 | 1.23–2.83 | "Without me" | BEFORE: closer, frontal |
| 3 | 2.83–5.47 | "With me" | AFTER: brow close-up (camera rotated 90°), a gloved hand lifts the brow (a motion event at ~3.8 s, scdet 3.1) |
| 4 | 5.47–7.50 | "Without me" | BEFORE: frontal, held to the end |

- **Method:** sequential full-frame shots, alternating AFTER and BEFORE. There is no split, no wipe and no side by side.
- **Labels:** one small white serif line at the top centre (about 4 % of the frame height), sitting on the hair or forehead. There is no
  pill or box.
- **Pacing:** shots last 1.2, 1.6, 2.6 and 2.0 s. There are no transitions, only hard cuts. The footage is raw phone video with a little
  hand motion.

## Audio and beat (librosa 0.10, on the reel's own sound)

- **Tempo:** librosa reports 184.6 BPM, which is double time; the felt pulse is about 92 BPM (beat 0.325 s).
- **Beats (s):** 0.07, 0.42, 0.74, 1.05, 1.35, 1.63, 1.95, 2.30, 2.62, 2.97, 3.32, 3.67, 4.02, 4.34, 4.67, 4.99, 5.32, 5.62, 5.94.
- **Onsets near the cuts:** 1.254 (cut 1.233), 2.833 (cut 2.833, exact), 5.596 (cut 5.467, 4 frames early). The cuts land on, or
  within a few frames of, an onset, at irregular beat counts (about 4, 5 and 8 beats).

## The requested track (audio 25724156027284371)

- **What the page says:** "afrodite_dea_dell_amor · Original audio". It is a user's original sound, not a catalogue song.
- **What could not be read:** without a login the page gives no duration, no file and no BPM. yt-dlp has no extractor for audio pages
  ("Unsupported URL"). A second Apify run (instagram-scraper) was blocked in this session by the permission policy.
- **What was not checked:** the reference reel's own sound is "Original audio" too, but its audio id could not be read without a login,
  so whether it is the same track is unknown.

## What the Ostad BA video reel took from this

- Sequential, full-window shots with one short label each.
- Hard cuts only, on the beat.
- Raw footage.
- **Order changed** to BEFORE then AFTER, as the user asked, followed by a direct comparison (the bastory glass slider) that the
  reference does not have.
- **Cuts on a 120 BPM grid** (the stated fallback) at 4.0 s and 8.0 s, the sweep from 8.5 to 10.5 s, the settle from 11.0 to 12.0 s,
  and the end at 13.5 s (27 beats). These times are multiples of 0.5 s and are not fitted to the requested track, whose tempo is
  unknown, so check the timing against the real track when posting (pick the song's start point in Instagram so a strong beat
  lands at 4.0 s).
