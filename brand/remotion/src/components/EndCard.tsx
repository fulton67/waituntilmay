import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, H, W, clamp, cqw } from "../brand";
import { MUTED, NAVY, RULE, Sfx, card, enter } from "./Ro";

// End card v3 (style DECISIONS 11; client on v2: "the outro brackets around it kind of look cheap"). No brackets, no glass chip.
// The footage keeps running behind, blurred and darkened; one light frosted card (the explainer cards' material) carries the call
// to action in Neue Haas Grotesk Display: "Book a consultation." (600, navy), "Link in bio." (500, muted), a hairline, the handle.
// Fade + rise like every other card; one soft whoosh.
const quint = (q: number) => 1 - (1 - q) ** 5;

export const EndCard: React.FC<{ lines?: string[]; handle?: string }> = ({ lines = ["Book a consultation.", "Link in bio."], handle = "@drarielostad" }) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const bg = quint(clamp(t / 0.5));
  const CW = cqw(78), X = (W - CW) / 2;
  const [head, ...rest] = lines;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ backdropFilter: `blur(${cqw(2.4) * bg}px) saturate(${1 - 0.25 * bg})`, background: `rgba(14,16,22,${0.4 * bg})` }} />
      <div style={{ ...card(32), left: X, top: H * 0.36, width: CW, padding: `${cqw(6)}px ${cqw(6)}px ${cqw(5)}px`, textAlign: "center", ...enter(t, 0.15) }}>
        <div style={{ font: `600 ${cqw(7)}px/1.1 ${FONT}`, letterSpacing: "-0.015em", color: NAVY }}>{head}</div>
        {rest.map((l, i) => (
          <div key={i} style={{ font: `500 ${cqw(5)}px/1.2 ${FONT}`, color: MUTED, marginTop: cqw(1.4), ...enter(t, 0.35 + i * 0.1) }}>{l}</div>
        ))}
        <div style={{ height: 1.5, background: RULE, margin: `${cqw(4)}px auto ${cqw(3)}px`, width: `${quint(clamp((t - 0.55) / 0.5)) * 100}%` }} />
        <div style={{ font: `500 ${cqw(3.4)}px/1 ${FONT}`, letterSpacing: "0.06em", color: NAVY, ...enter(t, 0.7) }}>{handle}</div>
      </div>
      <Sfx at={0.15} name="card" />
    </AbsoluteFill>
  );
};
