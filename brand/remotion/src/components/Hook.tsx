import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, MARGIN, SAFE_T, W, clamp, cqw, easeIn, easeOutBack } from "../brand";
import { glass } from "../devices/Markup";
import { GlassFilter, GlassLayers } from "./Glass";

// Opening title on the liquid glass, v2 (style DECISIONS 10; client: the Elza title "not as smooth or creative as it could be").
// Same card and entrance as before (glass opens left to right, hairlines draw in, letters rise from behind their line), now in
// the reel's own language:
//   - Neue Haas Grotesk Display 600 (the bible's headline weight);
//   - the first line in the caption keywords' glass letters (glossy brand-blue glass, white rim, one glint);
//   - `strike`: a word in the last line is crossed out by a white hairline that draws across it, and a small glass X pops at
//     the line's end (the markup's Mark), each with its sound (swish, tock). For rosacea-laser: "Rosacea?" / "Not another
//     prescription." with "prescription" struck.
// Out: letters lift away, hairlines retract, the glass closes. Sized so the longest line (plus room for the X) fills the card.
const quint = (q: number) => 1 - (1 - q) ** 5;
const PAD_X = cqw(4.4), PAD_Y = cqw(3.2), TRACK = -0.012, XD = 58;
// deeper than the captions' glass: the title sits on light glass, not on footage
const GLASS_FILL = "linear-gradient(180deg, #ffffff 0%, #d4eefc 18%, #6cc0ee 40%, #2f9fe0 56%, #1f86c6 68%, #5cb8ec 86%, #cfeafb 100%)";

let ctx: CanvasRenderingContext2D | null = null;
const measure = (s: string, px: number) => {
  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return s.length * px * 0.55;
  ctx.font = `600 ${px}px ${FONT}`;
  return ctx.measureText(s).width + TRACK * px * s.length;
};

export const splitTitle = (text: string) =>
  text.includes("\n") ? text.split("\n") : text.split(/(?<=[?.!:])\s+/).filter(Boolean);

const Sfx: React.FC<{ at: number; name: string; gain?: number }> = ({ at, name, gain = 0.32 }) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence from={Math.round(at * fps)} durationInFrames={fps} layout="none">
      <Audio src={staticFile(`sfx/${name}.wav`)} volume={gain} />
    </Sequence>
  );
};

export const Hook: React.FC<{ text: string; dur: number; strike?: string }> = ({ text, dur, strike }) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const lines = splitTitle(text);
  const last = lines.length - 1;
  const sIdx = strike ? lines[last].indexOf(strike) : -1;
  // each line fitted on its own: the first (the subject) big, up to 14cqw; the rest up to 6.6cqw; room kept for the X
  const avail = W - 2 * MARGIN - 2 * PAD_X;
  const lineSizes = lines.map((l, i) => Math.min(i === 0 && lines.length > 1 ? cqw(14) : cqw(6.6),
    Math.floor(((avail - (i === last && sIdx >= 0 ? XD + 18 : 0)) / measure(l, 100)) * 100)));
  const open = quint(clamp(t / 0.5)), close = easeIn(clamp((t - (dur - 0.35)) / 0.35));
  // strike timing: after the last line has risen
  const T_STRIKE = 1.45, T_X = 1.8;
  const strikeQ = quint(clamp((t - T_STRIKE) / 0.32)) * (1 - easeIn(clamp((t - (dur - 0.6)) / 0.25)));
  const xq = clamp((t - T_X) / 0.32), xs = 0.6 + 0.4 * easeOutBack(xq, 1.3), xOut = easeIn(clamp((t - (dur - 0.6)) / 0.25));
  const glint = clamp((t - 0.9) / 0.7);
  let k = 0;
  return (
    <AbsoluteFill>
      <GlassFilter />
      <div
        style={{
          position: "absolute", left: MARGIN, top: SAFE_T - cqw(4), padding: `${PAD_Y}px ${PAD_X}px ${PAD_Y + cqw(0.6)}px`,
          borderRadius: cqw(4.4), overflow: "hidden", isolation: "isolate", color: "#fff",
          clipPath: `inset(0 ${(1 - open) * 100}% 0 ${close * 100}% round ${cqw(4.4)}px)`,
          textShadow: `0 ${cqw(0.2)}px ${cqw(1.2)}px rgba(0,0,0,.30)`, display: "grid", gap: cqw(1.4),
        }}
      >
        <GlassLayers />
        {lines.map((line, li) => {
          const px = lineSizes[li], lh = px * 1.18;
          const rIn = quint(clamp((t - 0.15 - li * 0.1) / 0.55));
          const rOut = easeIn(clamp((t - (dur - 0.55) - li * 0.06) / 0.3));
          const isGlass = li === 0 && lines.length > 1;
          const lineW = measure(line, px);
          return (
            <div key={li} style={{ position: "relative", paddingRight: li === last && sIdx >= 0 ? XD + 18 : 0 }}>
              <div style={{ height: lh, overflow: "hidden", font: `600 ${px}px/${lh}px ${FONT}`, letterSpacing: `${TRACK}em`, whiteSpace: "pre" }}>
                {(() => {
                  const renderChar = (ch: string, ci: number) => {
                    const i = k++;
                    const up = quint(clamp((t - 0.35 - i * 0.02) / 0.42));
                    const away = easeIn(clamp((t - (dur - 0.8) - i * 0.01) / 0.3));
                    const style: React.CSSProperties = { display: "inline-block", transform: `translateY(${(1 - up) * 105 - away * 105}%)` };
                    if (!isGlass) return <span key={ci} style={style}>{ch}</span>;
                    return (
                      <span key={ci} style={{ ...style, position: "relative", textShadow: "none" }}>
                        <span style={{ color: "transparent", WebkitTextFillColor: "transparent", WebkitTextStroke: "2px rgba(255,255,255,.9)", paintOrder: "fill stroke",
                          backgroundImage: `linear-gradient(100deg, transparent ${glint * 140 - 30}%, rgba(255,255,255,.95) ${glint * 140 - 18}%, transparent ${glint * 140 - 6}%), ${GLASS_FILL}`,
                          backgroundSize: `${lineW}px 100%`, backgroundPosition: `${-measure(line.slice(0, ci), px)}px 0`,
                          WebkitBackgroundClip: "text", backgroundClip: "text", filter: "drop-shadow(0 0.04em 0.12em rgba(20,60,90,.35))" }}>{ch}</span>
                      </span>
                    );
                  };
                  const chars = [...line];
                  if (!(li === last && sIdx >= 0)) return chars.map(renderChar);
                  const e = sIdx + strike!.length;
                  // the struck word is its own box, so the hairline spans exactly the rendered word
                  return [
                    ...chars.slice(0, sIdx).map((ch, j) => renderChar(ch, j)),
                    <span key="strike" style={{ position: "relative", display: "inline-block" }}>
                      {chars.slice(sIdx, e).map((ch, j) => renderChar(ch, sIdx + j))}
                      <span style={{ position: "absolute", left: -4, top: "54%", height: 3.5, borderRadius: 2, width: `calc((100% + 8px) * ${strikeQ})`,
                        background: "#fff", boxShadow: "0 0 6px rgba(255,255,255,.6)" }} />
                    </span>,
                    ...chars.slice(e).map((ch, j) => renderChar(ch, e + j)),
                  ];
                })()}
              </div>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: "rgba(255,255,255,.75)",
                transformOrigin: rOut > 0 ? "100% 50%" : "0 50%", transform: `scaleX(${rOut > 0 ? 1 - rOut : rIn})` }} />
              {li === last && sIdx >= 0 && (
                <>
                  {xq > 0 && (
                    <div style={{ ...glass(999, "rgba(255, 92, 118, .30)"), right: 0, top: lh / 2 - XD / 2, width: XD, height: XD,
                      transform: `scale(${xs * (1 - xOut)})`, opacity: clamp(xq * 2.5) * (1 - xOut) }}>
                      <svg width={XD} height={XD} viewBox={`0 0 ${XD} ${XD}`} style={{ position: "absolute", inset: 0 }}>
                        <path d={`M ${XD / 2 - 9} ${XD / 2 - 9} L ${XD / 2 + 9} ${XD / 2 + 9} M ${XD / 2 + 9} ${XD / 2 - 9} L ${XD / 2 - 9} ${XD / 2 + 9}`}
                          stroke="#fff" strokeWidth={3.4} strokeLinecap="round" pathLength={2} strokeDasharray={`${2 * clamp((t - T_X - 0.1) / 0.25)} 2`} />
                      </svg>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <Sfx at={0.05} name="card" />
      {sIdx >= 0 && <Sfx at={T_STRIKE} name="swish" gain={0.26} />}
      {sIdx >= 0 && <Sfx at={T_X} name="no" />}
    </AbsoluteFill>
  );
};
