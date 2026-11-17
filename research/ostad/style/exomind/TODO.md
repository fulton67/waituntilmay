# ExoMind YouTube v6: TODO and finish list

Status, 2026-11-17: both gap rounds are done, and the render below is final pending the client's approvals.
- The full method is in `../V6_SYSTEM.md`.
- The rules and their numbers are in `brand/motion/RULES.md` (the hand-written block).
- The workflow is the `ostad-video` skill at `.claude/skills/ostad-video/SKILL.md`.
- Decisions: DECISIONS 14l–14p.

## Open

- [ ] **Client approvals.** See the list in the Finish section below. Nothing deploys publicly until every item is signed off.
- [ ] **⚠ claims.** A physician must check the wording (list below).
- [ ] **Re-pull the full-size originals once iCloud recovers** (clinic-library HANDOFF: local previews only for now). These are upscaled previews:
  - row 222: B11, at 1.25×
  - row 1705: B15, at 1.4×
  - IMG_3714: the B12 card
- [ ] **Lint conflict.** Another session has uncommitted PAL / BOX1 rules in `tools/lint_compositions.py` (Oct 14 lesson L5, "no blue"). They flag v6's brand-blue arrows and chips: 109 hits in 31 files. Under the committed rules v6 passes with 0. Naim decides whether L5 applies to YouTube edits.
- [ ] **Velocity-peak re-fit** (`render_entry_stats`). It has not been run since the gap rounds.
- [ ] **Stale tools.** `track_verify.py` and `pip_verify.py` assume the pre-gap layout (B03 on headTop, presenter on in takeovers). Update them, or retire them for `gap/tracking_tools/`.

## Finish list

| Item | Value |
|---|---|
| Translation table | **29 rows** (`TRANSLATION.md`) |
| ExoMind-only animations | 4 designed (TRANSLATION §2), **3 in use**: rewire-trace (B18), pulse-train-synapse (B19), session-timeline (B12). field-through-skull was retired in round 1 for BTL's own MOA film (B17) |
| Arrow variants | **9**, all one system (`devices/Arrow.tsx`): curved-callout, straight-pointer, bracket-pointer, route-trace, arc-connector, dashed-flow, light-ribbon, orbit-arc, marker-tick. Brand blue, tapered 2 → 8 px, one barb head, 0 text crossings over 4332 audited frames |
| Tracking error (rendered pixels, held frames) | B03 tail median 3.0 / p95 5.6 / max 7.5 px. B16 tail 2.2 / 4.9 / 9.7 px. Pip centring on B12: median 2.1, max 4.8 px (1.9 % of the diameter; spec < 4 %) |
| Face-overlap frames | **0** while he is keyed on the canvas. The only hits are takeovers where he is not on the canvas (B04, B09, B11): the detector finds him inside the clinic footage |
| Usage audit | `USAGE_AUDIT.md`: **32 rows**, each with a planned and a confirmed location, or a reason it is not used. Not used, with reasons: the LUT (client rule `grade: false`) |
| Gap round 1 (`gap/ROUND1.md`) | fill 14.8 → 40.2 %; takeovers 0.66 → 5.32 /min; longest layout run 13 → 3 segments; arrow–text crossings 2 → 0; B03 tail max 16.1 → 7.1 px; pip max 8.3 → 3.9 px; SFX coverage 62.6 → 80.8 % |
| Gap round 2 (`gap/ROUND2.md`) | section titles fully lit 0.42 → 2.5 s; straight keyed edges 61 → 0 frames (render max run 239 → 9 px); B11 two subjects; film marks cut 3 places → 0; B12 reuse 0.023 → 0.289 (exception closed); fill 42.5 %; takeovers 4.65 /min; SFX 78.0 %; −14.1 LUFS / −3.8 dBTP |
| Render | `C:\Users\naimj\Downloads\Ostad - Exomind and total skin health (YouTube v6).mp4` (2166 f, 90.261 s, 1920 × 1080, 24 fps). Backups: `(YouTube v6 round1).mp4` and the earlier v6 copies in Downloads. Local page: `/brand/ostad#edits` (gitignored `public/brand/ostad/edits/exomind-v6.mp4`) |

### ⚠ claims (physician check; from BEATS.md)

1. B02: the FDA chip wording.
2. B03: the mind–skin framing.
3. B08: the TMS caveat.
4. B12: session length "about 20–30 min".
5. B16: "emotions improve our skin" and the Kabat-Zinn et al. citation (Psychosomatic Medicine 1998, 37 psoriasis patients).
6. B17: the brain region name.
7. B18: "rewire / neural connectivity".
8. B19: "neurotransmitter production / focused, in flow".
9. B20: "translate into better skin".

### Client-approval list

- **Patients (consented under the clinic contracts; codes only):**
  - P0001: the Nov 5 consult, `p0001_quiet` (B04, B20).
  - P0006: the ExoMind session, IMG_3712 / IMG_3714 (B11, B12).
- **Staff:**
  - the staff member in clinic row 222 (B11, new in round 2);
  - the staff in the session clips;
  - the name tag visible in the session footage.
- **BTL material:**
  - the ExoMind unit and console;
  - Applicator_0108 (B15);
  - the MOA film at 49 / 59 / 74.6 / 98 s (B17–B19), with its EXOMIND mark and BTL emblem shown whole at 1× on B18;
  - the logo.
- **Clinic-library rows** (practice imagery): 741 (B03), 3601 (B08), 3612 (S3), 3614 (S2), 374, 451, 1705 (B15), 222 (B11).
- **The ⚠ claims above**, including the Kabat-Zinn citation.
- **B12 reuse exception:** closed in round 2 (0.289 against every earlier edit), so no approval is needed.
- **Low-res catalog frames to re-pull:** 222, 1705, IMG_3714 (see Open).

### Decided alone (logged in DECISIONS 14o, 14p)

- **Section titles:** the hold is 60 f, so the card runs 80 f.
  - S2 holds across the cut onto the consult half.
  - S3's card pushes the ring arrival to the f1322 cut, and the ring's exit overlaps B14's first 16 f.
- **Keyed plate:** the right edge is feathered over 140 source px.
- **B11:** the second subject is the team photo (row 222) rather than a single takeover.
- **B17 / B19:** the film's marks are cropped fully out (and shown whole on B18) rather than fully in.
- **B12:** recropped to 1.30 → 1.36 with the push origin at 60 % 30 %, which clears the reuse exception and hides the console's cut emblem.
- **B14:** the reuse key-frame crop is now the graphic's own box.
- **Publishing:** the page entry sits under Demo wall at `#edits`, and the file is gitignored. The dev server check used another session's running server on port 3107, which was left running.
- **Round 1 (14o):** BTL film for the skull animation; the Kabat-Zinn chart for B16. The lint L5 conflict is open (see Open).
