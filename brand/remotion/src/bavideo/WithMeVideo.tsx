import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useElza } from "../Fonts";
import { WM_CUTS } from "./WithMe";

// "With me / Without me" with real VIDEO (user 2026-11-19: "a video where it goes before and after, with me and without me").
// Same cuts, label and credit as WithMe.tsx; the footage is one face-locked clip per format from brand/scripts/ba_withme_video.py
// (<tag>_story.mp4 / <tag>_feed.mp4), already cut on the spoken word onsets: AFTER, BEFORE, AFTER, BEFORE.
const SERIF = '"cormorant-garamond", "Cormorant Garamond", Georgia, serif';
const TEXT = '"neue-haas-grotesk-text", "neue-haas-grotesk-display", Helvetica, Arial, sans-serif';
const L = { story: { label: 292, credit: 1540, px: 50 }, feed: { label: 64, credit: 1296, px: 44 } };

export const WithMeVideo: React.FC<{ fmt: "story" | "feed"; tag: string }> = ({ fmt, tag }) => {
  useElza(["500 40px cormorant-garamond", "400 40px cormorant-garamond"]);
  const f = useCurrentFrame(), { height } = useVideoConfig();
  const after = (WM_CUTS.filter((c) => f >= c).length - 1) % 2 === 0;
  const lay = L[fmt];
  return (
    <AbsoluteFill style={{ background: "#0c0c0d" }}>
      <OffthreadVideo src={staticFile(`${tag}_${fmt}.mp4`)} toneMapped={false} muted style={{ width: 1080, height }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: lay.label, textAlign: "center", color: "#fff", font: `400 ${lay.px}px/1 ${SERIF}`,
        letterSpacing: "0.01em", textShadow: "0 1px 6px rgba(0,0,0,.35)" }}>{after ? "With me" : "Without me"}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: lay.credit, textAlign: "center", color: "rgba(255,255,255,.55)", font: `400 16px/1.2 ${TEXT}`,
        letterSpacing: "0.02em", textShadow: "0 1px 3px rgba(0,0,0,.4)" }}>Patient of Dr. Ostad. Individual results vary.</div>
    </AbsoluteFill>
  );
};
