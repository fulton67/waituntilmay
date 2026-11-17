import React from "react";
import { AbsoluteFill } from "remotion";
import tokens from "../../../kit/tokens.json";
import { useElza } from "../Fonts";
import { BLUE, DISPLAY } from "../components/YT";
import { Arrow, type ArrowVariant, type Pt } from "./Arrow";
import { TypeEntry, wordFrames, type EntryId } from "./TypeEntry";
import { follow, LAYERS, useTrack } from "./track";

// ArrowTypeLab: one device alone on the kit background, for the proof sheets and the measurement in
// research/ostad/style/tools/arrow_type_proof.py (render, then easing_fit.fit_track on the pixels). 1920x1080, 24 fps.
//   --props='{"item":"curved-callout"}'   any ArrowVariant or EntryId; "follow" (curved callout whose tip rides Ostad's left temple
//   from the head track, comp frames FOLLOW_AT.. ), "f04" (the "check your texts" moment rebuilt on its word onsets, comp f540-640).
// Timing: every arrow starts at f6 and ends at f66; every entry starts at f6 and exits at f54 (letter-stagger-out at f40).
export type LabProps = { item: ArrowVariant | EntryId | "follow" | "f04" };
export const LAB_ARROW = { start: 6, end: 66 };
export const LAB_TYPE = { start: 6, exitAt: 54 };
export const FOLLOW_AT = 1000; // comp frame of the v6 timeline the follow test borrows the head motion from

const BG = (tokens as any).color.background.$value as string;

const ARROWS: Record<ArrowVariant, { from: Pt; to: Pt; via?: Pt[]; bend?: number; label?: string }> = {
  "curved-callout": { from: { x: 620, y: 760 }, to: { x: 1240, y: 360 }, label: "Mind" },
  "straight-pointer": { from: { x: 960, y: 820 }, to: { x: 960, y: 300 } },
  "bracket-pointer": { from: { x: 700, y: 540 }, to: { x: 1260, y: 540 }, via: [{ x: 700, y: 400 }, { x: 700, y: 680 }] },
  "route-trace": { from: { x: 520, y: 760 }, to: { x: 1420, y: 330 }, via: [{ x: 820, y: 560 }, { x: 1120, y: 640 }] },
  "arc-connector": { from: { x: 560, y: 700 }, to: { x: 1360, y: 700 } },
  "dashed-flow": { from: { x: 640, y: 720 }, to: { x: 1280, y: 420 } },
  "light-ribbon": { from: { x: 960, y: 260 }, to: { x: 700, y: 560 }, via: [{ x: 1240, y: 420 }, { x: 1160, y: 820 }, { x: 760, y: 820 }] },
  "orbit-arc": { from: { x: 960, y: 560 }, to: { x: 1250, y: 610 }, bend: 0.32 },
  "marker-tick": { from: { x: 960, y: 420 }, to: { x: 960, y: 500 }, label: "Session 1" },
};

const TEXTS: Record<EntryId, string> = {
  "type-word-fade-rise": "Total skin health",
  "type-highlight-sweep": "activating neural pathways",
  "type-box-slam": "ExoTMS",
  "type-ghost-to-lit": "the mind shows\nin your skin",
  "type-line-accumulate": "“Felt like some\ntapping on\nmy head.”",
  "type-typewriter": "Non-invasive · drug-free",
  "type-message-lines": "Dr. Ostad’s office · now\nThanks for joining us tonight.\nReply to schedule a consultation.",
  "type-orbit-labels": "Emotional regulation\nCognitive function\nSelf-control",
  "type-letter-stagger-out": "Your questions",
  "type-card-rise": "FDA-cleared for major depressive disorder",
  "type-rise": "Under 30 minutes",
  "type-slide-side": "Walk in, walk out",
  "type-scale-pop": "Drug-free",
  "type-name-decode": "ExoTMS",
};

const FollowDemo: React.FC = () => {
  const track = useTrack();
  if (!track) return null;
  const tgt = follow(track, "templeL", LAYERS.keyed);
  return <Arrow variant="curved-callout" from={{ x: 1500, y: 860 }} to={(f) => tgt(f + FOLLOW_AT)} start={LAB_ARROW.start} end={LAB_ARROW.end + 40} color={(tokens as any).color.text.$value} />;
};

const F04: React.FC = () => {
  // yt_words.json line 22/23: "Please also check your | text messages after" (seconds on the 1.15x timeline)
  const [, , check, your] = wordFrames([23.38, 23.78, 24.16, 24.46]);
  const [text, messages] = wordFrames([24.68, 24.88]);
  return (
    <>
      <TypeEntry entry="type-word-fade-rise" start={check} text="Check your texts" wordTimes={[check, your, text]} style={{ position: "absolute", left: 760, top: 500, fontSize: 72 }} />
      <TypeEntry entry="type-message-lines" start={check} text={TEXTS["type-message-lines"]} wordTimes={[check, your, text, messages]}
        style={{ position: "absolute", left: 760, top: 640, fontSize: 34 }} />
    </>
  );
};

export const ArrowTypeLab: React.FC<LabProps> = ({ item }) => {
  useElza();
  let body: React.ReactNode;
  if (item === "follow") body = <FollowDemo />;
  else if (item === "f04") body = <F04 />;
  else if (item in ARROWS) {
    const a = ARROWS[item as ArrowVariant];
    body = <Arrow variant={item as ArrowVariant} from={a.from} to={a.to} via={a.via} bend={a.bend} start={LAB_ARROW.start} end={LAB_ARROW.end} color={item === "light-ribbon" ? BLUE : undefined}
      label={a.label ? <span style={{ font: `500 34px/1 ${DISPLAY}`, color: (tokens as any).color.text.$value }}>{a.label}</span> : undefined} />;
  } else {
    const id = item as EntryId;
    const exitAt = id === "type-letter-stagger-out" ? 40 : id === "type-name-decode" ? 84 : LAB_TYPE.exitAt;
    body = <TypeEntry entry={id} start={LAB_TYPE.start} text={TEXTS[id]} exitAt={exitAt} style={{ position: "absolute", left: id === "type-orbit-labels" ? 580 : 560, top: id === "type-orbit-labels" ? 240 : 420, fontSize: id === "type-orbit-labels" ? 44 : 72 }} />;
  }
  return <AbsoluteFill style={{ background: BG }}>{body}</AbsoluteFill>;
};
