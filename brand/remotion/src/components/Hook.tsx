import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ELZA, MARGIN, SAFE_T, clamp, cqw, easeIn, easeOutBack } from "../brand";

// Opening hook: a short line above his head, words popping on one after another (70 ms apart), out with a quick fade-up.
export const Hook: React.FC<{ text: string; dur: number }> = ({ text, dur }) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const out = easeIn(clamp((t - (dur - 0.35)) / 0.35));
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: MARGIN, right: MARGIN, top: SAFE_T - cqw(5), textAlign: "center", opacity: 1 - out, transform: `translateY(${-out * cqw(2)}px)` }}>
        <p style={{ margin: 0, font: `700 ${cqw(6.6)}px/1.1 ${ELZA}`, letterSpacing: "-0.01em", color: "#fff", WebkitTextStroke: "10px #000", paintOrder: "stroke fill" }}>
          {text.split(" ").map((w, i) => {
            const q = clamp((t - 0.1 - i * 0.07) / 0.22);
            return (
              <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: Math.min(1, q * 2),
                transform: `translateY(${(1 - easeOutBack(q)) * cqw(3)}px) scale(${0.8 + 0.2 * easeOutBack(q)})` }}>{w + " "}</span>
            );
          })}
        </p>
      </div>
    </AbsoluteFill>
  );
};
