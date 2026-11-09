import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ELZA, MARGIN, SAFE_T, W, clamp, cqw, easeIn } from "../brand";
import { GlassFilter, GlassLayers } from "./Glass";

// Opening title on the liquid glass (client reference: the "Architecture Fringe" story, laid horizontal). White Elza Regular,
// one hairline under each line. Sequence: the glass opens left to right, the hairlines draw in, then each letter rises up from
// behind its line (masked at the line, 22 ms apart); out in reverse: letters lift away, hairlines retract, the glass closes.
// Sized so the longest line fills the card between the kit margins, capped at 7.4cqw; sits just under the top safe line.
const quint = (q: number) => 1 - (1 - q) ** 5;
const PAD_X = cqw(4.4), PAD_Y = cqw(3.2), MAX = cqw(7.4), TRACK = -0.01;

let ctx: CanvasRenderingContext2D | null = null;
const fitSize = (lines: string[]) => {
  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return MAX;
  ctx.font = `400 100px ${ELZA}`;
  const widest = Math.max(...lines.map((l) => ctx!.measureText(l).width + TRACK * 100 * l.length));
  return Math.min(MAX, Math.floor(((W - 2 * MARGIN - 2 * PAD_X) / widest) * 100));
};

export const splitTitle = (text: string) =>
  text.includes("\n") ? text.split("\n") : text.split(/(?<=[?.!:])\s+/).filter(Boolean);

export const Hook: React.FC<{ text: string; dur: number }> = ({ text, dur }) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const lines = splitTitle(text);
  const size = fitSize(lines), lh = size * 1.22;
  const open = quint(clamp(t / 0.5)), close = easeIn(clamp((t - (dur - 0.35)) / 0.35));
  let k = 0;
  return (
    <AbsoluteFill>
      <GlassFilter />
      <div
        style={{
          position: "absolute", left: MARGIN, top: SAFE_T - cqw(4), padding: `${PAD_Y}px ${PAD_X}px ${PAD_Y + cqw(0.6)}px`,
          borderRadius: cqw(4.4), overflow: "hidden", isolation: "isolate", color: "#fff",
          clipPath: `inset(0 ${(1 - open) * 100}% 0 ${close * 100}% round ${cqw(4.4)}px)`,
          textShadow: `0 ${cqw(0.2)}px ${cqw(1.2)}px rgba(0,0,0,.35)`, display: "grid", gap: cqw(1.4),
        }}
      >
        <GlassLayers />
        {lines.map((line, li) => {
          const rIn = quint(clamp((t - 0.15 - li * 0.1) / 0.55));
          const rOut = easeIn(clamp((t - (dur - 0.55) - li * 0.06) / 0.3));
          return (
            <div key={li} style={{ position: "relative" }}>
              <div style={{ height: lh, overflow: "hidden", font: `400 ${size}px/${lh}px ${ELZA}`, letterSpacing: `${TRACK}em`, whiteSpace: "pre" }}>
                {[...line].map((ch, ci) => {
                  const i = k++;
                  const up = quint(clamp((t - 0.35 - i * 0.022) / 0.42));
                  const away = easeIn(clamp((t - (dur - 0.8) - i * 0.01) / 0.3));
                  return <span key={ci} style={{ display: "inline-block", transform: `translateY(${(1 - up) * 105 - away * 105}%)` }}>{ch}</span>;
                })}
              </div>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: "rgba(255,255,255,.75)",
                transformOrigin: rOut > 0 ? "100% 50%" : "0 50%", transform: `scaleX(${rOut > 0 ? 1 - rOut : rIn})` }} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
