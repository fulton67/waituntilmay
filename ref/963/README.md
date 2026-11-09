# ref/963 — study of ninepointsixthree.co

Measurement notes only. Nothing from that site is shipped: no code, CSS, fonts,
images, icons or copy. Read `REPORT.md` first, then `SPEC.md`.

Committed:
  REPORT.md          the study, one table per visible effect
  SPEC.md            the measured spec (tokens, geometry, formulas)
  bundle.json        route and chunk inventory, sourcemap probes
  runtime.json       document.getAnimations() + style-mutation log, 4 routes x 2 widths
  measured.json      computed styles and geometry at 390 and 1440
  formula-check.json predicted vs measured tile scale
  rea-sources.json   the 19 app chunks given to REA

Not committed (see .gitignore) — regenerate with the scripts named in REPORT.md:
  extracted/         the downloaded third-party bundle (3.4 MB)
  js-analysis.json   REA Evidence (91.8 MB)
  session-*.har      network captures
