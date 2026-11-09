#!/usr/bin/env bash
# Pass 2: GPU tools in sequence (M10 OCR, M15 language, M16 transcript, M18 loudness/Demucs) alongside the CPU graphics trackers
# (M11, M14; they need M3 cuts, so they wait for pass 1), then the dependent tools (M12, M13, M17, M19, M20) and M21 stills.
# Usage: bash tools/run_pass2.sh (from research/ostad/style). Idempotent. Logs: logs/pass2_*.log
cd "$(dirname "$0")/.." || exit 1
PY="C:/Users/naimj/tools/style-venv/Scripts/python.exe"
T() { $PY -I tools/run.py "$@" 2>&1 | grep -v "Broken pipe\|rawvideo @\|Last message\|out#0\|vost#"; }
mkdir -p logs
( T ocr_track; T audio_track; T transcribe; T loudness ) > logs/pass2_gpu.log 2>&1 &
G=$!
( until grep -q PASS1_DONE logs/pass1_runner.log 2>/dev/null; do sleep 20; done; T graphic_track ) > logs/pass2_graphic.log 2>&1 &
( until grep -q PASS1_DONE logs/pass1_runner.log 2>/dev/null; do sleep 20; done; T mockup_detect ) > logs/pass2_mockup.log 2>&1 &
wait
( T easing_fit; T card_geometry; T pacing; T sfx_align; T script_structure; T still_image ) > logs/pass2_dep.log 2>&1
$PY -I tools/run.py verify_measure > logs/verify.log 2>&1
echo PASS2_DONE
grep -h FAIL logs/pass2_*.log | head -30
tail -2 logs/verify.log
