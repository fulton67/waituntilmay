#!/usr/bin/env bash
# Render the storyboard stills (gitignored PNGs, they hold BTL / practice / patient pictures) next to STORYBOARD.md.
# usage: bash brand/edits/exomind-skin/storyboard/render.sh [ID ...]   (default: every frame + the font sheet stills)
set -euo pipefail
cd "$(dirname "$0")/../../../remotion"
OUT=../edits/exomind-skin/storyboard
IDS=${*:-"F01A F01B F01C F02A F02B F02C F03 F04 F05 F06 F07 F08 F09 F10A F10B F10C F11A1 F11A2 F11A3 F11A4 F11B F11C F11D F12A F12B F13"}
for id in $IDS; do
  npx remotion still Storyboard "$OUT/$id.png" --props="{\"id\":\"$id\",\"font\":\"proposal\"}" --log=error --timeout=120000
done
if [ $# -eq 0 ]; then
  for f in serif text poppins nhg; do
    npx remotion still Storyboard "$OUT/font_$f.png" --props="{\"id\":\"F10A\",\"font\":\"$f\"}" --log=error --timeout=120000
  done
fi
