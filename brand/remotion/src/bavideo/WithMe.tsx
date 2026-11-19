import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useElza } from "../Fonts";

// "With me / Without me" full-screen before/after (user notes 2026-11-19, after the slider version): structure of the reference
// reel DfYLRoNxt_1 (research/ostad/style/measure/ig_DfYLRoNxt_1/NOTES.md): full-frame, hard cuts only, a small white serif label
// top centre saying the spoken words. "With me" = AFTER, "Without me" = BEFORE, alternating as spoken.
// Cuts sit on the spoken word onsets of the reference audio (faster-whisper word timestamps, snapped to the speech-energy onset):
// With 0.00 s, Without 1.20 s, With 2.80 s, Without 5.48 s; end 7.50 s. The audio itself is NOT in the deliverable.
// Pictures: P0053 rosacea (catalog slug rosacea), aligned by brand/scripts/ba_video_p0053.py (crop/scale/align only). Both are
// pushed in by the same very slow zoom about the same face point, so every cut lands face-on-face.
export const WM_FPS = 30;
export const WM_CUTS = [0, 36, 84, 164];           // frames: 0.00, 1.20, 2.80, 5.47 s
export const WM_DUR = 225;                           // 7.50 s
const SHOTS: ("after" | "before")[] = ["after", "before", "after", "before"];
const SERIF = '"cormorant-garamond", "Cormorant Garamond", Georgia, serif';
const TEXT = '"neue-haas-grotesk-text", "neue-haas-grotesk-display", Helvetica, Arial, sans-serif';

// Story: label and credit inside y 250-1580. Feed: margins only.
const L = { story: { label: 292, credit: 1540, px: 50 }, feed: { label: 64, credit: 1296, px: 44 } };

export const WithMe: React.FC<{ fmt: "story" | "feed" }> = ({ fmt }) => {
  useElza(["500 40px cormorant-garamond", "400 40px cormorant-garamond"]);
  const f = useCurrentFrame(), { height } = useVideoConfig();
  const i = WM_CUTS.filter((c) => f >= c).length - 1;
  const shot = SHOTS[i];
  const s = 1 + 0.05 * (f / WM_DUR);                 // very slow push-in, continuous across the cuts
  const lay = L[fmt];
  return (
    <AbsoluteFill style={{ background: "#0c0c0d" }}>
      <AbsoluteFill style={{ transform: `scale(${s})`, transformOrigin: `50% ${fmt === "story" ? 44 : 46}%` }}>
        <Img src={staticFile(`${fmt}_${shot}.png`)} style={{ width: 1080, height }} />
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: lay.label, textAlign: "center", color: "#fff", font: `400 ${lay.px}px/1 ${SERIF}`,
        letterSpacing: "0.01em", textShadow: "0 1px 6px rgba(0,0,0,.35)" }}>{shot === "after" ? "With me" : "Without me"}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: lay.credit, textAlign: "center", color: "rgba(255,255,255,.55)", font: `400 16px/1.2 ${TEXT}`,
        letterSpacing: "0.02em", textShadow: "0 1px 3px rgba(0,0,0,.4)" }}>Patient of Dr. Ostad. Individual results vary.</div>
    </AbsoluteFill>
  );
};
