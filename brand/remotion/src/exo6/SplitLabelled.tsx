import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, useCurrentFrame } from "remotion";
import { C, SERIF, cl, ease, p, io } from "./look";
import { src } from "./parts";

// split-labelled (B15 f1449-1599). Ref: ro split f1180 (two panels side by side, each labelled, divided by one line). Left panel
// (a classic laser treatment, practice photo) arrives `arrive` 14 f; a vertical line wipes down 14 f on `sweep` and opens the right panel (glass
// head, a slow 3 deg 2.5D turn), 'Beyond' rises 4.2 % H in 11 f; later 'Classic treatments' rises the same way on the left. Held,
// the panels drift 4 px/s in opposite directions; the split closes 7 f.
export const SplitLabelled: React.FC<{
  start?: number; wipeAt?: number; leftLabelAt?: number; exitAt?: number; left?: string; right?: string; leftLabel?: string; rightLabel?: string; divX?: number; rightImg?: string;
}> = ({ start = 1, wipeAt = 41, leftLabelAt = 91, exitAt = 143, left = "exomind-skin/clinic/classic_fraxel_1705.jpg", right = "exomind-skin/clips/office_treat.mp4",
  leftLabel = "Classic treatments", rightLabel = "Beyond", divX = 960, rightImg }) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  const lq = p(f, start, 10, ease.arrive);
  const w = p(f, wipeAt, 14, ease.sweep);
  const close = p(f, exitAt, 7, ease.exit);
  const t = (f - start) / 24;
  const lab = (at: number, s: string) => {
    if (f < at) return null;
    const q = p(f, at, 11, ease.arrive);
    return <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 78, lineHeight: 1, color: "#fff", opacity: q, transform: `translateY(${(1 - io(q)) * 16}px)`, textShadow: "0 2px 22px rgba(0,0,0,.35)", whiteSpace: "nowrap" }}>{s}</div>;
  };
  const turn = 3 * ease.blank(cl((f - wipeAt) / Math.max(1, exitAt - wipeAt)));
  const rightW = (1920 - divX) * w * (1 - close);
  return (
    <AbsoluteFill style={{ background: C.cream }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: divX * (1 - close), height: 1080, overflow: "hidden", opacity: lq }}>
        {/* Classic (Naim's review, DECISIONS 14m: no ExoMind on this side): a Fraxel laser pass on a jaw, from the practice catalog
            (clinic-library row 1705, procedure-footage, Feb 26 2024, no patient code, needs_review 0; local frame f0005, 432 x 768:
            the full-size original is to be pulled once iCloud's index recovers). Drawn 2.33x in this 1920 space = 1.4x in the 0.6x
            split card; it drifts and pushes the whole span, so it is never still. */}
        <Img src={src(left)} style={{ position: "absolute", maxWidth: "none", left: -24 + 4 * Math.min(t, 6), top: -380, width: 1008, height: 1792, transform: `scale(${1 + 0.04 * cl(t / 6)})`, transformOrigin: "45% 50%" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(14,18,26,0) 55%, rgba(14,18,26,.5))" }} />
        <div style={{ position: "absolute", left: 80, bottom: 96 }}>{lab(leftLabelAt, leftLabel)}</div>
      </div>
      {w > 0 && (
        <div style={{ position: "absolute", left: 1920 - rightW, top: 0, width: rightW, height: 1080, overflow: "hidden", perspective: 2000 }}>
          {/* Beyond = ExoMind: his office session footage (office_treat.mp4, 4.03 s; 0.64x: mounted from the beat start, its 150 f = 4.0 s of source, so it never runs out and freezes) */}
          {/* gap round 1 (DECISIONS 14o): the coil-on-patient subject is capped at 2 beats (B11, B12), so 'Beyond' is the ExoMind
              applicator itself (BTL brochure photo 0108, 8192 px source, shown at 0.25x: sharp), pushing and turning */}
          {rightImg ? <Img src={src(rightImg)} style={{ position: "absolute", maxWidth: "none", left: -460 - 4 * Math.min(t, 6), top: 0, width: 2049, height: 1080, objectFit: "cover", transform: `rotateY(${-turn}deg) scale(${1.02 + 0.05 * cl(t / 6)})`, transformOrigin: "60% 50%" }} /> :
          <OffthreadVideo src={src(right)} muted playbackRate={0.64} style={{ position: "absolute", left: -40 - 4 * Math.min(t, 6), top: -120, width: 1040, height: 1300, objectFit: "cover", transform: `rotateY(${-turn}deg) scale(${1 + 0.02 * cl(t / 6)})`, transformOrigin: "50% 50%" }} />}
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
