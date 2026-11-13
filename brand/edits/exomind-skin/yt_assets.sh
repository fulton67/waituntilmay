#!/usr/bin/env bash
# Footage for the YouTube v2 cut (OstadYT, style DECISIONS 14b) -> brand/remotion/public/exomind-skin/yt/ (gitignored).
# BTL "What is EXOMIND?" film (research/ostad/refs/motion/exomind/k4lEDTVCb0U.mp4, 1280x720): BTL / EXOMIND corner logos removed
# with delogo, full frame scaled 1.5x (lanczos + light unsharp) to 1920x1080, one light grade (contrast 1.03, saturation 0.92).
# Practice footage: Oct 30 (patient under the Exomind coil, his face cropped out), Nov 05 (the patient's own side of the frame).
set -euo pipefail
cd "$(dirname "$0")/../../.."
BTL=research/ostad/refs/motion/exomind/k4lEDTVCb0U.mp4
OUT=brand/remotion/public/exomind-skin/yt; mkdir -p "$OUT"
OCT="C:/Users/naimj/Downloads/Video Oct 30 2026, 4 18 49 PM.mov"
NOV="C:/Users/naimj/Downloads/Video Nov 05 2026, 10 50 41 AM.mov"
G="eq=contrast=1.03:saturation=0.92"
btl() { # name from to [extra filter]
  ffmpeg -v error -y -ss "$2" -to "$3" -i "$BTL" -an -vf "delogo=x=56:y=66:w=112:h=62,delogo=x=990:y=76:w=240:h=54,${4:+$4,}scale=1920:1080:flags=lanczos,unsharp=5:5:0.35,$G,fps=24" \
    -c:v libx264 -crf 15 -preset slow -pix_fmt yuv420p "$OUT/$1.mp4"
}
btl couch 113.7 116.9
btl trio 117.6 123.4
btl outdoor 107.4 109.6
btl smile 110.0 113.3
btl stressed 16.0 19.6
btl smile_close 124.4 127.4
btl studio 32.0 37.0
btl hiker 10.0 13.5
# Oct 30: the patient under the coil and the device screen (y 880-1488 of the 1080x1920 frame; his face is above the crop)
ffmpeg -v error -y -ss 14 -to 30 -i "$OCT" -an -vf "crop=1080:608:0:880,scale=1920:1080:flags=lanczos,unsharp=5:5:0.3,eq=contrast=1.02:saturation=0.95,fps=24" \
  -c:v libx264 -crf 15 -preset slow -pix_fmt yuv420p "$OUT/session.mp4"
# Nov 05: the patient's half of the frame, native pixels (440x780), around "It quiets my brain" (raw 30.28)
ffmpeg -v error -y -ss 29.4 -to 35.0 -i "$NOV" -an -vf "crop=440:780:640:420,eq=contrast=1.02:saturation=0.95,fps=24" \
  -c:v libx264 -crf 14 -preset slow -pix_fmt yuv420p "$OUT/patient.mp4"
ls -la "$OUT"
