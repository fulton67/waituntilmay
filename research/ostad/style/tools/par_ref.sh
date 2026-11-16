#!/usr/bin/env bash
# Parallel workers for one tool over one ref: bash tools/par_ref.sh <tool> <ref> <out_name.json> <workers>
# Each worker takes every Nth video still lacking the output and runs the tool with --vid. Idempotent.
cd "$(dirname "$0")/.." || exit 1
TOOL=$1; R=$2; OUT=$3; N=$4; PY="C:/Users/naimj/tools/style-venv/Scripts/python.exe"
mapfile -t V < <(for f in media/yt/evident/*.mp4; do v=$(basename "$f" .mp4); [ -f "measure/$R/$v/$OUT" ] || echo "$v"; done)
for w in $(seq 0 $((N-1))); do
  ( for i in "${!V[@]}"; do [ $((i % N)) -eq $w ] || continue; [ -f "measure/$R/${V[$i]}/$OUT" ] && continue
      $PY -I tools/run.py $TOOL --ref $R --vid "${V[$i]}" 2>&1 | grep --line-buffered -E "ok|FAIL"; done ) > logs/par_${TOOL}_$w.log &
done
wait; echo "PAR_DONE $TOOL $(ls measure/$R/*/$OUT 2>/dev/null | wc -l)"
