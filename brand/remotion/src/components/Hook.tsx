import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, MARGIN, SAFE_T, W, clamp, cqw, fitPx } from "../brand";
import { NAVY, Sfx } from "./Ro";

// Opening title v3 (style DECISIONS 11; client on v2: "the intro still looks cheap"). The glass panel, glass letters and the
// glass X are gone. Ro-like and quiet:
//   - a soft dark scrim fades in over the top of the frame so white type reads on any background;
//   - the first line (the subject) is big white Neue Haas Grotesk Display 600 with a soft shadow, nothing else on it;
//   - the rest sits in Ro's small white caption box, navy type; `strike` draws a thin navy line through one word (one soft thud);
//   - each line rises 0.3 em from behind its own mask in 0.6 s (quint), staggered; out: the whole block fades and lifts.
const quint = (q: number) => 1 - (1 - q) ** 5;

export const splitTitle = (text: string) =>
  text.includes("\n") ? text.split("\n") : text.split(/(?<=[?.!:])\s+/).filter(Boolean);

export const Hook: React.FC<{ text: string; dur: number; strike?: string }> = ({ text, dur, strike }) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const [head, ...rest] = splitTitle(text);
  const avail = W - 2 * MARGIN;
  const big = fitPx(head, 600, cqw(15), avail, -0.02);
  const small = Math.min(...rest.map((l) => fitPx(l, 600, cqw(6), avail - 56, -0.01)));
  const out = clamp((t - (dur - 0.35)) / 0.35);
  const scrim = quint(clamp(t / 0.5)) * (1 - out);
  const T_STRIKE = 1.35;
  const rise = (i: number) => quint(clamp((t - 0.1 - i * 0.14) / 0.6));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(8,10,16,${0.5 * scrim}) 0%, rgba(8,10,16,${0.22 * scrim}) 32%, rgba(8,10,16,0) 52%)` }} />
      <div style={{ position: "absolute", left: MARGIN, right: MARGIN, top: SAFE_T - cqw(2), opacity: 1 - out, transform: `translateY(${-out * 14}px)` }}>
        <div style={{ overflow: "hidden", paddingBottom: big * 0.08 }}>
          <div style={{ font: `600 ${big}px/1.02 ${FONT}`, letterSpacing: "-0.02em", color: "#fff", textShadow: "0 6px 30px rgba(0,0,0,.35)",
            transform: `translateY(${(1 - rise(0)) * 105}%)` }}>{head}</div>
        </div>
        {rest.map((line, li) => {
          const q = rise(li + 1);
          const s = strike ? line.indexOf(strike) : -1;
          const sq = quint(clamp((t - T_STRIKE) / 0.4));
          return (
            <div key={li} style={{ marginTop: cqw(1.6), opacity: q, transform: `translateY(${(1 - q) * 20}px)` }}>
              <span style={{ display: "inline-block", background: "rgba(255,255,255,.95)", color: NAVY, borderRadius: 14, padding: `${small * 0.22}px ${small * 0.42}px ${small * 0.26}px`,
                font: `600 ${small}px/1.1 ${FONT}`, letterSpacing: "-0.01em", boxShadow: "0 12px 34px rgba(0,0,0,.22)" }}>
                {s < 0 ? line : (
                  <>
                    {line.slice(0, s)}
                    <span style={{ position: "relative", display: "inline-block", color: sq > 0.6 ? "#7a8091" : NAVY }}>
                      {strike}
                      <span style={{ position: "absolute", left: -3, top: "55%", height: 3, borderRadius: 2, background: NAVY, width: `calc((100% + 6px) * ${sq})` }} />
                    </span>
                    {line.slice(s + strike!.length)}
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
      <Sfx at={0.1} name="swish" gain={0.9} />
      {strike && <Sfx at={T_STRIKE} name="no" gain={0.8} />}
    </AbsoluteFill>
  );
};
