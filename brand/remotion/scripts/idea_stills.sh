#!/usr/bin/env bash
# Render the 18 IdeaStills PNGs (6 ideas x looks A/B/C) into brand/edits/exomind-skin/stills/ (gitignored: BTL, Flora and practice imagery).
# Usage (from brand/remotion): bash scripts/idea_stills.sh [idea...]   e.g. bash scripts/idea_stills.sh 2 5
# Source frames must exist in public/exomind-skin/ideas/ (extracted with ffmpeg from the BTL, Flora and practice clips; see BOARD.md).
set -e
OUT=../edits/exomind-skin/stills
mkdir -p "$OUT"
IDEAS=${*:-1 2 3 4 5 6}
npx remotion bundle src/index.ts --out-dir=out/bundle_ideas >/dev/null
for i in $IDEAS; do for l in A B C; do
  npx remotion still out/bundle_ideas IdeaStills "$OUT/idea${i}_look${l}.png" --props="{\"idea\":$i,\"look\":\"$l\"}" --log=error
done; done
