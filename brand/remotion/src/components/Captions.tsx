import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { CAP_TOP, FONT, H, MARGIN, W, clamp, cqw, easeOutBack, fitPx } from "../brand";
import type { Caption } from "../types";

// Caption standard: Neue Haas Grotesk Display 600 (the bible's headline weight; style DECISIONS 10 replaces Elza Bold), white,
// the client's 4 px black stroke outside the letters, no panel, centred, box top at 83%. Sized 6.98cqw like before, shrunk per
// line when Neue Haas (wider than Elza) would pass the kit margins. One phrase at a time; it pops on (0.86 -> 1, 160 ms).
// Keywords are GLASS letters (client: "when the text comes up blue make sure that's the actual glass"): a glossy blue glass fill
// (bright top edge, deeper blue body, light bottom reflection), a thin white inner rim, a soft blue glow, and one specular
// glint that crosses the word as it is said. The black stroke stays underneath on its own layer.
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
const GLASS_FILL = "linear-gradient(180deg, #ffffff 0%, #e9f6fd 24%, #a8dbf7 40%, #4fb3ea 55%, #37a9e8 64%, #8ccff3 82%, #e4f4fd 100%)";
const SIZE = cqw(6.98), TRACK = 0.01;

export const Captions: React.FC<{ captions: Caption[]; keywords?: string[] }> = ({ captions, keywords = [] }) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const line = captions.find((c) => t >= c.from && t < c.to);
  if (!line) return null;
  const q = clamp((t - line.from) / 0.16);
  const keys = new Set(keywords.flatMap((k) => k.split(" ").map(norm)));
  const px = fitPx(line.text, 600, SIZE, W - 2 * MARGIN - 16, TRACK);
  const glint = clamp((t - line.from - 0.1) / 0.55); // 0 -> 1 across the word once
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: MARGIN, right: MARGIN, top: CAP_TOP * H, textAlign: "center" }}>
        <p
          style={{
            margin: 0, font: `600 ${px}px/1.2 ${FONT}`, letterSpacing: `${TRACK}em`, color: "#fff", WebkitTextStroke: "8px #000",
            paintOrder: "stroke fill", whiteSpace: "nowrap", transform: `scale(${0.86 + 0.14 * easeOutBack(q)})`, opacity: Math.min(1, q * 2.5),
          }}
        >
          {line.text.split(" ").map((w, i) => {
            const word = (i ? " " : "") + w;
            if (!keys.has(norm(w))) return <span key={i}>{word}</span>;
            return (
              <span key={i} style={{ position: "relative", display: "inline-block", whiteSpace: "pre" }}>
                {word}
                {/* glass body */}
                <span aria-hidden style={{ position: "absolute", inset: 0, WebkitTextStroke: "1.6px rgba(255,255,255,.85)", paintOrder: "fill stroke",
                  color: "transparent", WebkitTextFillColor: "transparent",
                  backgroundImage: `linear-gradient(100deg, transparent ${glint * 140 - 30}%, rgba(255,255,255,.95) ${glint * 140 - 18}%, transparent ${glint * 140 - 6}%), ${GLASS_FILL}`,
                  WebkitBackgroundClip: "text", backgroundClip: "text", filter: "drop-shadow(0 0 0.12em rgba(55,169,232,.55))" }}>{word}</span>
              </span>
            );
          })}
        </p>
      </div>
    </AbsoluteFill>
  );
};
