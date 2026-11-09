import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { BLUES, CAP_TOP, ELZA, H, MARGIN, clamp, cqw, easeOutBack } from "../brand";
import type { Caption } from "../types";

// Caption standard (DECISIONS 65-66): Elza Bold white, 4 px black stroke outside the letters, no panel, centred, box top at 83%.
// One phrase at a time; each line pops on (scale 0.86 -> 1, overshoot, 160 ms). Words in `keywords` take the brand-blue gradient
// (DECISIONS 68; it replaces the flat copper), drifting slowly across the word; the black stroke sits behind it on its own layer
// so the gradient fill keeps the full letter width.
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");

export const Captions: React.FC<{ captions: Caption[]; keywords?: string[] }> = ({ captions, keywords = [] }) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const line = captions.find((c) => t >= c.from && t < c.to);
  if (!line) return null;
  const q = clamp((t - line.from) / 0.16);
  const keys = new Set(keywords.flatMap((k) => k.split(" ").map(norm)));
  const drift = (t * 40) % 200;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: MARGIN, right: MARGIN, top: CAP_TOP * H, textAlign: "center" }}>
        <p
          style={{
            margin: 0, font: `700 ${cqw(6.98)}px/1.2 ${ELZA}`, letterSpacing: "0.02em", color: "#fff", WebkitTextStroke: "8px #000",
            paintOrder: "stroke fill", whiteSpace: "nowrap", transform: `scale(${0.86 + 0.14 * easeOutBack(q)})`, opacity: Math.min(1, q * 2.5),
          }}
        >
          {line.text.split(" ").map((w, i) => {
            const word = (i ? " " : "") + w;
            if (!keys.has(norm(w))) return <span key={i}>{word}</span>;
            return (
              <span key={i} style={{ position: "relative", display: "inline-block", whiteSpace: "pre" }}>
                {word}
                <span aria-hidden style={{ position: "absolute", inset: 0, WebkitTextStroke: 0, color: "transparent", WebkitTextFillColor: "transparent",
                  backgroundImage: `linear-gradient(100deg, ${BLUES.join(", ")})`, backgroundSize: "200% 100%", backgroundPosition: `${drift}% 0`,
                  WebkitBackgroundClip: "text", backgroundClip: "text" }}>{word}</span>
              </span>
            );
          })}
        </p>
      </div>
    </AbsoluteFill>
  );
};
