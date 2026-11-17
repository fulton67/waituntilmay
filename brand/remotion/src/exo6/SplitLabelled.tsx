import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, useCurrentFrame } from "remotion";
import { C, SERIF, cl, ease, p } from "./look";
import { src } from "./parts";

// split-labelled (B15 f1449-1599). Ref: ro split f1180 (two panels side by side, each labelled, divided by one line). Left panel
// (practice treatment footage) arrives `arrive` 14 f; a vertical line wipes down 14 f on `sweep` and opens the right panel (glass
// head, a slow 3 deg 2.5D turn), 'Beyond' rises 4.2 % H in 11 f; later 'Classic treatments' rises the same way on the left. Held,
// the panels drift 4 px/s in opposite directions; the split closes 7 f.
export const SplitLabelled: React.FC<{
  start?: number; wipeAt?: number; leftLabelAt?: number; exitAt?: number; left?: string; right?: string; leftLabel?: string; rightLabel?: string; divX?: number;
}> = ({ start = 1, wipeAt = 41, leftLabelAt = 91, exitAt = 143, left = "exomind-skin/clips/office_treat.mp4", right = "exomind-skin/flora/head_A_glass_brain.png",
  leftLabel = "Classic treatments", rightLabel = "Beyond", divX = 960 }) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  const lq = p(f, start, 14, ease.arrive);
  const w = p(f, wipeAt, 14, ease.sweep);
  const close = p(f, exitAt, 7, ease.exit);
  const t = (f - start) / 24;
  const lab = (at: number, s: string) => {
    if (f < at) return null;
    const q = p(f, at, 11, ease.arrive);
    return <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 78, lineHeight: 1, color: "#fff", opacity: q, transform: `translateY(${(1 - q) * 0.042 * 1080}px)`, textShadow: "0 2px 22px rgba(0,0,0,.35)", whiteSpace: "nowrap" }}>{s}</div>;
  };
  const turn = 3 * ease.blank(cl((f - wipeAt) / Math.max(1, exitAt - wipeAt)));
  const rightW = (1920 - divX) * w * (1 - close);
  return (
    <AbsoluteFill style={{ background: C.cream }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: divX * (1 - close), height: 1080, overflow: "hidden", opacity: lq }}>
        <OffthreadVideo src={src(left)} muted playbackRate={0.85} style={{ position: "absolute", left: -24 + 4 * Math.min(t, 6), top: -90, width: 1008, height: 1260, objectFit: "cover", transform: `scale(${1 + 0.02 * cl(t / 6)})` }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(14,18,26,0) 55%, rgba(14,18,26,.5))" }} />
        <div style={{ position: "absolute", left: 80, bottom: 96 }}>{lab(leftLabelAt, leftLabel)}</div>
      </div>
      {w > 0 && (
        <div style={{ position: "absolute", left: 1920 - rightW, top: 0, width: rightW, height: 1080, overflow: "hidden", perspective: 2000 }}>
          <div style={{ position: "absolute", left: -(1920 - divX) * 0.55 - 4 * t, top: -60, width: 2120, height: 1200, transform: `rotateY(${-turn}deg)`, transformOrigin: "50% 50%" }}>
            <Img src={src(right)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "45% 40%" }} />
          </div>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(14,18,26,0) 55%, rgba(14,18,26,.42))" }} />
          <div style={{ position: "absolute", left: 80, bottom: 96 }}>{lab(wipeAt + 4, rightLabel)}</div>
        </div>
      )}
      {f >= wipeAt && (
        <div style={{ position: "absolute", left: 1920 - rightW - 1.5, top: 0, width: 3, height: 1080 * Math.min(1, w * 1.4), background: "#fff", boxShadow: "0 0 18px rgba(159,214,245,.9)", opacity: 1 - close }} />
      )}
    </AbsoluteFill>
  );
};
