import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useElza } from "./Fonts";
import { Captions } from "./components/Captions";
import { DEVICE_DUR, Device } from "./components/Device";
import { Hook } from "./components/Hook";
import { EndCard as GlassEnd } from "./components/EndCard";
import { NAME_CARD_DUR, NameCard } from "./components/NameCard";
import { SkinCard } from "./components/SkinCard";
import { MicrobeCard, PillCard, SkinDiagram } from "./components/Explainers";
import type { ReelProps } from "./types";

// A talking-head reel: the source clip at the edit's speed (muted), the edit's finished audio, and the kit's graphics on top.
// Everything is driven by public/<slug>/props.json from scripts/prepare.cjs, so the timings match brand/scripts/video_edit.cjs.
export const OstadReel: React.FC<ReelProps> = ({ spec }) => {
  useElza();
  const { fps } = useVideoConfig();
  if (!spec) return <AbsoluteFill style={{ background: "#000" }} />;
  const f = (s: number) => Math.round(s * fps);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <OffthreadVideo src={staticFile(spec.footage)} muted playbackRate={spec.speed} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <Audio src={staticFile(spec.audio)} />
      {spec.overlays.map((o, i) =>
        o.name === "lower-third" ? (
          <Sequence key={i} from={f(o.at)} durationInFrames={f(NAME_CARD_DUR)} name="Name card">
            <NameCard name={(o as { nameText?: string }).nameText} role={(o as { role?: string }).role} />
          </Sequence>
        ) : o.name === "device" ? (
          <Sequence key={i} from={f(o.at)} durationInFrames={f(DEVICE_DUR)} name={`Machine: ${(o as { fill: { label: string } }).fill.label}`}>
            <Device img={(o as { fill: { img: string } }).fill.img} label={(o as { fill: { label: string } }).fill.label} />
          </Sequence>
        ) : null,
      )}
      {spec.cards?.map((c, i) => (
        <Sequence key={`card${i}`} from={f(c.at)} durationInFrames={f(c.dur)} name={`Image: ${c.before.split("/").pop()}`}>
          <SkinCard card={c} />
        </Sequence>
      ))}
      {spec.graphics?.map((g, i) => (
        <Sequence key={`gfx${i}`} from={f(g.at)} durationInFrames={f(g.dur)} name={`Explainer: ${g.kind}`}>
          {g.kind === "pills" ? <PillCard dur={g.dur} label={g.label} /> : g.kind === "microbes" ? <MicrobeCard dur={g.dur} label={g.label} /> : <SkinDiagram dur={g.dur} at={g.phases ?? {}} />}
        </Sequence>
      ))}
      {spec.hook && (
        <Sequence from={f(spec.hook.at ?? 0)} durationInFrames={f(spec.hook.dur ?? 3.4)} name="Title">
          <Hook text={spec.hook.text} dur={spec.hook.dur ?? 3.4} strike={spec.hook.strike} />
        </Sequence>
      )}
      <Captions captions={spec.captions} keywords={spec.keywords} />
      {spec.end && (
        <Sequence from={f(spec.end.at)} name="End card">
          {spec.end.glass ? <GlassEnd lines={spec.end.lines} handle={spec.end.handle} /> : <EndCard src={spec.end.src} dissolve={spec.end.dissolve} />}
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

// the kit's animated end card (brand/kit/video/elements), dissolved in over the footage
const EndCard: React.FC<{ src: string; dissolve: number }> = ({ src, dissolve }) => {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ opacity: interpolate(frame, [0, Math.round(dissolve * fps)], [0, 1], { extrapolateRight: "clamp" }) }}>
      <OffthreadVideo src={staticFile(src)} muted style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
