import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, H, W, clamp, cqw, easeOutBack } from "../brand";
import { Brackets, Chip } from "../devices/Markup";
import { GlassFilter, GlassLayers } from "./Glass";

// End card v2 (style DECISIONS 10; client: "the outro doesn't fit the brand identity anymore"). The kit's flat dark card is replaced
// by the reel's own language: the footage keeps running behind, blurred (2.4cqw) and darkened; a liquid-glass card in the middle
// carries the call to action in Neue Haas Grotesk Display 600 ("Book a consultation." / "Link in bio."), letters rising from
// behind a hairline like the title; hairline corner brackets close in round the card; the handle pops in as a glass chip.
// Sound: card on open, pop on the chip.
const quint = (q: number) => 1 - (1 - q) ** 5;

export const EndCard: React.FC<{ lines?: string[]; handle?: string }> = ({ lines = ["Book a consultation.", "Link in bio."], handle = "@drarielostad" }) => {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  const t = frame / fps;
  const bg = quint(clamp(t / 0.5));
  const open = quint(clamp((t - 0.15) / 0.5));
  const px = cqw(7.6), lh = px * 1.16;
  const CW = cqw(80), CH = lines.length * lh + cqw(7.2), X = (W - CW) / 2, Y = H * 0.36;
  let k = 0;
  return (
    <AbsoluteFill>
      <GlassFilter />
      <AbsoluteFill style={{ backdropFilter: `blur(${cqw(2.4) * bg}px) saturate(${1 - 0.25 * bg})`, background: `rgba(16,18,24,${0.42 * bg})` }} />
      <div style={{ position: "absolute", left: X, top: Y, width: CW, height: CH, borderRadius: cqw(4.4), overflow: "hidden", isolation: "isolate",
        clipPath: `inset(0 ${(1 - open) * 50}% 0 ${(1 - open) * 50}% round ${cqw(4.4)}px)`, color: "#fff", display: "grid", alignContent: "center",
        justifyItems: "center", textShadow: `0 ${cqw(0.2)}px ${cqw(1)}px rgba(0,0,0,.3)` }}>
        <GlassLayers />
        {lines.map((line, li) => {
          const rIn = quint(clamp((t - 0.35 - li * 0.1) / 0.5));
          return (
            <div key={li} style={{ position: "relative" }}>
              <div style={{ height: lh, overflow: "hidden", font: `600 ${px}px/${lh}px ${FONT}`, letterSpacing: "-0.012em", whiteSpace: "pre" }}>
                {[...line].map((ch, ci) => {
                  const up = quint(clamp((t - 0.5 - k++ * 0.018) / 0.42));
                  return <span key={ci} style={{ display: "inline-block", transform: `translateY(${(1 - up) * 105}%)` }}>{ch}</span>;
                })}
              </div>
              {li === lines.length - 1 && (
                <div style={{ position: "absolute", left: 0, right: 0, bottom: -cqw(0.6), height: 2, background: "rgba(255,255,255,.75)", transformOrigin: "50% 50%", transform: `scaleX(${rIn})` }} />
              )}
            </div>
          );
        })}
      </div>
      <Brackets box={{ x: X - 22, y: Y - 22, w: CW + 44, h: CH + 44 }} at={0.55} dur={99} len={34} />
      {t >= 1.0 && (() => { const q = clamp((t - 1.0) / 0.32); return <Chip at={{ x: W / 2, y: Y + CH + cqw(9) }} side="center" text={handle} s={0.72 + 0.28 * easeOutBack(q, 1.2)} o={clamp(q * 2.2)} />; })()}
      <Sequence from={Math.round(0.15 * fps)} durationInFrames={fps} layout="none"><Audio src={staticFile("sfx/card.wav")} volume={0.32} /></Sequence>
      <Sequence from={Math.round(1.0 * fps)} durationInFrames={fps} layout="none"><Audio src={staticFile("sfx/pop.wav")} volume={0.26} /></Sequence>
    </AbsoluteFill>
  );
};
