#!/usr/bin/env bash
# Pass 1 over the whole video corpus: the per-frame tools that need no OCR / audio, in 4 parallel groups.
# Usage: bash tools/run_pass1.sh   (from research/ostad/style). Logs: logs/pass1_<group>.log. Idempotent (skips finished outputs).
cd "$(dirname "$0")/.." || exit 1
PY="C:/Users/naimj/tools/style-venv/Scripts/python.exe"
mkdir -p logs
( $PY -I tools/run.py frames; $PY -I tools/run.py cuts; $PY -I tools/run.py camera_ecc ) > logs/pass1_a.log 2>&1 &
( $PY -I tools/run.py camera_phasecorr ) > logs/pass1_b.log 2>&1 &
( $PY -I tools/run.py contact_sheets ) > logs/pass1_c.log 2>&1 &
( $PY -I tools/run.py luma_contrast_sat; $PY -I tools/run.py shadow_highlight_hue; $PY -I tools/run.py palette ) > logs/pass1_d.log 2>&1 &
wait
$PY -I tools/run.py camera_classify > logs/pass1_e.log 2>&1
echo PASS1_DONE
grep -h FAIL logs/pass1_*.log | head -20
