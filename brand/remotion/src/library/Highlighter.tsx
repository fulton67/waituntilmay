import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY, INK, MUTE2 } from "../components/YT";
import { D24, f, onset, prog } from "./motion";

// L01 headline highlighter / L02 thesis karaoke (research/ostad/style/ANIMATION_LIBRARY.md).
// sweep:   every word is on; the ice block sweeps behind words punch[0]..punch[1], starting 1 f after the onset of the first, over 16 f
//          (24 fps) on `sweep` (Evident Moment A: 20 f at 30 fps, peak at 44 %). The text stays ink. Square corners, no shadow.
// karaoke: the line is laid out dim; each word cuts to ink on its own onset + 1 f (Evident B26, +/-1 f); the block grows under the
//          punch words from the first punch onset to the last (BOARD idea 4: 17 f across "total skin health.").
export type HLWord = { text: string; at: number }; // `at` = onset in seconds, on the composition's timeline
export const ICE_HL = "#c4e4f8";

export const Highlighter: React.FC<{
  words: HLWord[]; punch: [number, number]; mode?: "sweep" | "karaoke"; size?: number; ink?: string; dim?: string; fill?: string;
  maxWidth?: number; lineHeight?: number; style?: React.CSSProperties; other?: string; italic?: boolean;
}> = ({ words, punch, mode = "sweep", size = 88, ink = INK, dim = MUTE2, fill = ICE_HL, maxWidth = 1400, lineHeight = 1.12, style, other, italic }) => {
  // v5: `other` inks the words outside the punch (white over footage; the punch stays ink on the ice block)
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [a, b] = punch;
  const start = onset(words[a].at, fps);
  // sweep: one 16 f block spread over the punch words by character count; karaoke: the block ends on the last punch onset
  const end = mode === "karaoke" ? Math.max(start + 1, onset(words[b].at, fps)) : start + f(D24.highlighter, fps);
  const p = prog(frame, start, end - start, "sweep");
  const chars = words.slice(a, b + 1).map((w) => w.text.length + 1);
  const total = chars.reduce((s, c) => s + c, 0);
  let acc = 0;
  return (
    <p style={{ margin: 0, maxWidth, font: `500 ${size}px/${lineHeight} ${DISPLAY}`, letterSpacing: "0.0082em", ...style }}>
      {words.map((w, i) => {
        const lit = mode === "sweep" || frame >= onset(w.at, fps);
        let bg: string | undefined;
        if (i >= a && i <= b) {
          const share = chars[i - a] / total, from = acc / total;
          acc += chars[i - a];
          const q = Math.max(0, Math.min(1, (p - from) / share)); // this word's part of the sweep
          bg = q > 0 ? `linear-gradient(90deg, ${fill} ${q * 100}%, transparent ${q * 100}%)` : undefined;
        }
        return (
          <React.Fragment key={i}>
            <span style={{ color: lit ? (other && (i < a || i > b) ? other : ink) : dim, fontStyle: italic ? "italic" : undefined, background: bg, padding: "0 0.1em", margin: "0 -0.1em", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>{w.text}</span>
            {i < words.length - 1 ? " " : ""}
          </React.Fragment>
        );
      })}
    </p>
  );
};
