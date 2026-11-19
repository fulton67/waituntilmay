// colour check: does OffthreadVideo's default HDR tone map (toneMapped) shift the iPhone HLG clips? (Naim 2026-11-19 "weird filter")
import React from "react";
import { Composition, OffthreadVideo, staticFile } from "remotion";
const T: React.FC<{ tm: boolean }> = ({ tm }) => (
  <OffthreadVideo src={staticFile("undereye-filler/6821.mp4")} trimBefore={Math.round(4.4 * 30)} toneMapped={tm} muted style={{ width: 1080, height: 1920 }} />
);
export const Root: React.FC = () => <>
  <Composition id="TM" component={T} defaultProps={{ tm: true }} width={1080} height={1920} fps={30} durationInFrames={10} />
  <Composition id="NoTM" component={T} defaultProps={{ tm: false }} width={1080} height={1920} fps={30} durationInFrames={10} />
</>;
