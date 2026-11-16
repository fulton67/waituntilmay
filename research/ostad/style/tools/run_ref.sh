#!/usr/bin/env bash
# Run M1-M20 for ONE reference only (2026-11-16: the corpus-wide pass 2 was also clearing a 126-video OCR backlog on other refs).
# Usage: bash tools/run_ref.sh <ref>   (from research/ostad/style). Idempotent. Logs: logs/ref_<ref>_*.log
cd "$(dirname "$0")/.." || exit 1
R="$1"; PY="C:/Users/naimj/tools/style-venv/Scripts/python.exe"; L="logs/ref_$R"
T() { $PY -I tools/run.py "$@" --ref "$R" 2>&1 | grep --line-buffered -v "Broken pipe\|rawvideo @\|Last message\|out#0\|vost#\|monotonically"; }
mkdir -p logs
( T frames; T cuts; T camera_ecc ) > ${L}_a.log &
( T camera_phasecorr ) > ${L}_b.log &
( T contact_sheets ) > ${L}_c.log &
( T luma_contrast_sat; T shadow_highlight_hue; T palette ) > ${L}_d.log &
( T audio_track; T transcribe; T loudness; T ocr_track ) > ${L}_gpu.log &
G=$!
wait %1 %2 %3 %4
T camera_classify > ${L}_e.log
( T graphic_track ) > ${L}_graphic.log &
( T mockup_detect ) > ${L}_mockup.log &
wait
( T easing_fit; T card_geometry; T pacing; T sfx_align; T script_structure ) > ${L}_dep.log
echo "REF_DONE $R"
grep -h FAIL ${L}_*.log | head -30
