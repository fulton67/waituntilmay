import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { CAP_TOP, FONT, H, MARGIN, W, clamp, cqw, fitPx } from "../brand";
import type { Caption } from "../types";

// Caption standard: Neue Haas Grotesk Display 600 (the bible's headline weight), white, the client's black stroke outside the
// letters, no panel, centred, box top at 83%. Sized 6.98cqw, shrunk per line to stay inside the kit margins. One phrase at a time.
// v3 (style DECISIONS 11; client: the glass words "look really cheap ... it shouldn't be distracting"): keywords are just the
// brand's light blue, solid, no gradient, rim, glow or glint; the phrase settles in (0.95 -> 1, 140 ms ease-out, no overshoot).
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
const KEY = "#7cc8f2"; // brand blue #37a9e8, lifted for legibility on the black stroke
const SIZE = cqw(6.98), TRACK = 0.01;

export const Captions: React.FC<{ captions: Caption[]; keywords?: string[] }> = ({ captions, keywords = [] }) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const line = captions.find((c) => t >= c.from && t < c.to);
  if (!line) return null;
  const q = 1 - (1 - clamp((t - line.from) / 0.14)) ** 3;
  const keys = new Set(keywords.flatMap((k) => k.split(" ").map(norm)));
  const px = fitPx(line.text, 600, SIZE, W - 2 * MARGIN - 16, TRACK);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: MARGIN, right: MARGIN, top: CAP_TOP * H, textAlign: "center" }}>
        <p style={{ margin: 0, font: `600 ${px}px/1.2 ${FONT}`, letterSpacing: `${TRACK}em`, color: "#fff", WebkitTextStroke: "8px #000",
          paintOrder: "stroke fill", whiteSpace: "nowrap", transform: `scale(${0.95 + 0.05 * q})`, opacity: Math.min(1, q * 2) }}>
          {line.text.split(" ").map((w, i) => (
            <span key={i} style={keys.has(norm(w)) ? { color: KEY } : undefined}>{(i ? " " : "") + w}</span>
          ))}
        </p>
      </div>
    </AbsoluteFill>
  );
};
