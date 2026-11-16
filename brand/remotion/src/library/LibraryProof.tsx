import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { HN_NEED, useElza } from "../Fonts";
import { Canvas, DISPLAY, INK, M, MUTE, TEXT, TOP, TYPEFACE } from "../components/YT";
import { Highlighter } from "./Highlighter";
import { RollingLabel } from "./RollingLabel";
import { TraceOnFootage } from "./TraceOnFootage";
import { arriveStyle, onset } from "./motion";

// LibraryProof: one composition per built library entry (research/ostad/style/ANIMATION_LIBRARY.md "Built so far"), 1920x1080 at 24 fps,
// for still checks with `npx remotion still ... --frame=N`. Onsets are local seconds. Stills go to brand/edits/exomind-skin/stills/
// (gitignored: the trace uses a Flora render).
export type ProofProps = { piece: "headline" | "karaoke" | "rolling" | "trace" };

// the room canvas without its neural field and with the bottom strip pushed off-frame (as IdeaStills)
const Room: React.FC = () => <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1086, overflow: "hidden" }}><Canvas field={0} /></div>;

// L01: Chen & Lyga's review title rebuilt as a flat paper card (BOARD: cited for the brain-skin link, no number taken); the highlight
// sweeps "Brain-skin connection" on "emotions" (onset at 1.0 s local here).
const Headline: React.FC = () => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const words = "Brain-skin connection: stress, inflammation and skin aging".split(" ").map((text) => ({ text, at: 1.0 }));
  return (
    <>
      <Room />
      <div style={{ position: "absolute", left: M, top: 300, width: 980, padding: "40px 48px", background: "#f4f6f8", ...arriveStyle(frame, onset(0.4, fps), fps) }}>
        <p style={{ margin: "0 0 24px", font: `500 22px/1.1 ${DISPLAY}`, letterSpacing: "0.06em", textTransform: "uppercase", color: MUTE }}>Inflammation &amp; Allergy · Drug Targets</p>
        <Highlighter words={words} punch={[0, 1]} size={56} maxWidth={880} />
        <p style={{ margin: "24px 0 0", font: `400 22px/1.3 ${TEXT}`, color: MUTE }}>Chen Y, Lyga J. 2014;13(3):177-90 · PMID 24853682</p>
      </div>
    </>
  );
};

// L02: his thesis, 51.58-56.34 s on the OstadYT timeline, shifted to local time (this 53.80 -> 0.80 s)
const Karaoke: React.FC = () => {
  const on = [["this", 53.8], ["comprehensive", 54.12], ["approach", 54.86], ["to", 55.32], ["total", 55.64], ["skin", 56.0], ["health.", 56.34]] as const;
  const words = on.map(([text, t]) => ({ text, at: t - 53.0 }));
  return (
    <>
      <Room />
      <p style={{ position: "absolute", left: M, top: TOP, margin: 0, font: `500 24px/1.1 ${DISPLAY}`, letterSpacing: "0.04em", textTransform: "uppercase", color: MUTE }}>Dr. Ariel Ostad · Dermatologist</p>
      <div style={{ position: "absolute", left: M, top: 380 }}>
        <Highlighter words={words} punch={[4, 6]} mode="karaoke" size={96} maxWidth={1300} />
      </div>
    </>
  );
};

// L05: the pattern for a treatment course (not spoken in this recording; values are placeholders for his words)
const Rolling: React.FC = () => (
  <>
    <Room />
    <div style={{ position: "absolute", left: M, top: 360 }}>
      <RollingLabel label="Session" values={[{ text: "1", at: 0.2 }, { text: "2", at: 1.0 }, { text: "3", at: 1.8 }, { text: "4", at: 2.6 }]} total="of 6" size={136} />
    </div>
    <p style={{ position: "absolute", left: M, top: 640, margin: 0, font: `400 24px/1.3 ${TEXT}`, color: INK }}>Values roll on his spoken numbers; the box takes the widest value.</p>
  </>
);

// L03: the coil to the front of the brain on the Flora glass head (AI render, labelled Illustration); onset of "technology" at 1.0 s
const Trace: React.FC = () => (
  <TraceOnFootage
    src="exomind-skin/ideas/head_final_4.9.png" at={1.0}
    path="M1150 236 C1150 290, 1130 340, 1112 378"
    ring={{ x: 1104, y: 404, r: 28 }} label="Prefrontal cortex" labelAt={{ x: 640, y: 330 }}
    credit="Illustration"
  />
);

export const LibraryProof: React.FC<ProofProps> = ({ piece }) => {
  useElza(TYPEFACE === "helvetica" ? HN_NEED : []);
  const P = { headline: Headline, karaoke: Karaoke, rolling: Rolling, trace: Trace }[piece];
  return <AbsoluteFill style={{ background: "#e8eef5", overflow: "hidden" }}><P /></AbsoluteFill>;
};
