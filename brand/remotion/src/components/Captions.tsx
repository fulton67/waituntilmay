import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ACCENT, CAP_TOP, ELZA, H, MARGIN, clamp, cqw, easeOutBack } from "../brand";
import type { Caption } from "../types";

// Caption standard (DECISIONS 65-66): Elza Bold white, 4 px black stroke outside the letters, no panel, centred, box top at 83%.
// One phrase at a time; each line pops on (scale 0.86 -> 1, overshoot, 160 ms). Words in `keywords` are drawn in the accent colour.
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");

export const Captions: React.FC<{ captions: Caption[]; keywords?: string[] }> = ({ captions, keywords = [] }) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const line = captions.find((c) => t >= c.from && t < c.to);
  if (!line) return null;
  const q = clamp((t - line.from) / 0.16);
  const keys = new Set(keywords.flatMap((k) => k.split(" ").map(norm)));
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: MARGIN, right: MARGIN, top: CAP_TOP * H, textAlign: "center" }}>
        <p
          style={{
            margin: 0, font: `700 ${cqw(6.98)}px/1.2 ${ELZA}`, letterSpacing: "0.02em", color: "#fff", WebkitTextStroke: "8px #000",
            paintOrder: "stroke fill", whiteSpace: "nowrap", transform: `scale(${0.86 + 0.14 * easeOutBack(q)})`, opacity: Math.min(1, q * 2.5),
          }}
        >
          {line.text.split(" ").map((w, i) => (
            <span key={i} style={{ color: keys.has(norm(w)) ? ACCENT : undefined }}>{(i ? " " : "") + w}</span>
          ))}
        </p>
      </div>
    </AbsoluteFill>
  );
};
