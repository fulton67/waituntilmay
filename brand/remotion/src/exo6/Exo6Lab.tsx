import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { useExoFonts, roomBg } from "./look";
import { LAB } from "./labItems";

// Exo6Lab: one exo6 component alone on the v6 room canvas, for proof stills and clips
// (research/ostad/style/exomind/lab/, gitignored). --props='{"item":"section-card"}'; see labItems.tsx for ids, lengths and still frames.
export type Exo6LabProps = { item: string };

export const Exo6Lab: React.FC<Exo6LabProps> = ({ item }) => {
  useExoFonts();
  const f = useCurrentFrame();
  const it = LAB[item];
  if (!it) throw new Error(`Exo6Lab: unknown item ${item}`);
  return (
    <AbsoluteFill style={{ background: "#f2efed", overflow: "hidden" }}>
      {!it.bare && <div style={roomBg(f)} />}
      {it.render()}
    </AbsoluteFill>
  );
};

/** keyed Ostad, left third (beats.json presentation: x 80-750), from the alpha webm; lab stand-in for the matte_*_cut pair */
export const LabPresenter: React.FC<{ from?: number; style?: React.CSSProperties }> = ({ from = 0, style }) => (
  <div style={{ position: "absolute", left: -30, top: -150, width: 1080 * 0.7, height: 1920 * 0.7, ...style }}>
    <OffthreadVideo src={staticFile("exomind-skin/yt/presenter_k.webm")} muted transparent startFrom={from} style={{ width: "100%", height: "100%" }} />
  </div>
);
