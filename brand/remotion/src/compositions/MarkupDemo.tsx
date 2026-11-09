import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { Arc, Arrow, Badge, Dots, Region } from "../devices/Markup";

// The markup devices on a timeline. `footage` false = transparent (alpha) render for compositing elsewhere; true = over the
// rosacea-laser clip (public/rosacea-laser/footage.mp4, from 18 s in, where he faces camera) to check placement on a real face.
export const MARKUP_DEMO_SECONDS = 9;

export const MarkupDemo: React.FC<{ footage?: boolean }> = ({ footage = false }) => (
  <AbsoluteFill style={{ background: footage ? "#000" : "transparent" }}>
    {footage && <OffthreadVideo src={staticFile("rosacea-laser/footage.mp4")} startFrom={18 * 30} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
    {/* 0.0-2.4 s: the area (cheek redness), an arrow onto it */}
    <Region ellipse={{ cx: 420, cy: 880, rx: 95, ry: 70, rot: -12 }} at={0.2} dur={2.4} colour="rgba(232, 17, 60, 0.32)" />
    <Arrow from={{ x: 120, y: 700 }} to={{ x: 340, y: 845 }} at={0.5} dur={2.1} />
    {/* 2.6-4.6 s: two points joined (where it starts, where it spreads) */}
    <Dots a={{ x: 540, y: 820 }} b={{ x: 700, y: 880 }} at={2.6} dur={2.0} />
    {/* 4.8-6.6 s: wrong way (badge), 6.8-8.8 s: right way */}
    <Badge x={170} y={330} at={4.8} dur={1.8} kind="bad" />
    <Badge x={170} y={330} at={6.8} dur={2.0} kind="good" />
    {/* 5.0-6.6 s: a movement / rotation */}
    <Arc c={{ x: 540, y: 760 }} rad={300} a0={200} a1={270} at={5.0} dur={1.6} />
  </AbsoluteFill>
);
