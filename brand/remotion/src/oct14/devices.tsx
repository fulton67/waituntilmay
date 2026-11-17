// Oct 14 injection reel: the reusable devices. NOT FOR POSTING until patient consent = yes.
// Each device is a DEVICE_LIBRARY.md id (named in its comment), built for a spoken line. Frames are composition frames at 24 fps;
// `s` is the onset frame of the trigger word and every reveal starts at s + 1 (MOTION §3, DECISIONS 14d rule 9).
// No dot-and-line anywhere (DEVICE_LIBRARY §A, tools/lint_compositions.py): every pointer is a devices/Arrow.tsx arrow with a head
// that lands on its last draw frame; rings and badges carry no leader.
import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Arrow } from "../devices/Arrow";
import { card } from "../components/Ro";
import { BLUE, CAP_T, D, FONT, H, HL, INK, M, MUTED, ON_FOOTAGE, SAFE_T, W, WHITE, at, breathe, caps, disp, lerp, life, p, vis, type Box, type Pt, type PtSrc } from "./look";

const isStill = (src: string) => /\.(jpe?g|png|webp)$/i.test(src);
const media = (src: string) => (/^(https?:|data:|\/)/.test(src) ? src : staticFile(src));

/** a still or a clip, absolutely placed; clips are muted (his voice runs on the main track) */
export const Media: React.FC<{ src: string; style: React.CSSProperties; trimBefore?: number; rate?: number; muted?: boolean }> = ({ src, style, trimBefore = 0, rate = 1, muted = true }) =>
  isStill(src) ? <Img src={media(src)} style={{ position: "absolute", maxWidth: "none", ...style }} />
    : <OffthreadVideo src={media(src)} trimBefore={trimBefore} playbackRate={rate} muted={muted} style={{ position: "absolute", maxWidth: "none", ...style }} />;

/** typed label (DDOS B09 typed callout): about 1 character per frame from s + 1; space reserved so nothing reflows */
export const Typed: React.FC<{ text: string; s: number; out?: number; style?: React.CSSProperties; align?: "left" | "center" | "right" }> = ({ text, s, out = Infinity, style, align = "left" }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const n = Math.max(0, Math.min(text.length, frame - s));
  const e = p(frame, out, D.exit, "exit");
  return (
    <div style={{ position: "relative", whiteSpace: "nowrap", textAlign: align, opacity: 1 - e, transform: `translateY(${7 * e}px)`, ...style }}>
      <span style={{ visibility: "hidden" }}>{text}</span>
      <span style={{ position: "absolute", left: 0, right: 0, top: 0, textAlign: align }}>{text.slice(0, n)}</span>
    </div>
  );
};

/** numbered badge (the numbered index of ETSQ f642-708 / G4 T2 numbered boxes): a navy disc, scale pop 0.95 -> 1 in 5 f, no overshoot */
export const Badge: React.FC<{ n: number; s: number; out?: number; x: number; y: number; d?: number; tone?: "navy" | "glass" }> = ({ n, s, out = Infinity, x, y, d = 52, tone = "navy" }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const q = p(frame, s + 1, 5, "arrive"), e = p(frame, out, D.exit, "exit");
  return (
    <div style={{ position: "absolute", left: x - d / 2, top: y - d / 2, width: d, height: d, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
      background: tone === "navy" ? INK : "rgba(255,255,255,.88)", color: tone === "navy" ? WHITE : INK, boxShadow: "0 0 0 2px rgba(255,255,255,.95), 0 6px 16px rgba(8,12,22,.3)",
      font: `600 ${Math.round(d * 0.5)}px/1 ${FONT}`, fontVariantNumeric: "tabular-nums", opacity: Math.min(1, q * 1.4) * (1 - e), transform: `scale(${(0.95 + 0.05 * q) * (1 - 0.1 * e)})` }}>{n}</div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------
// InjectionPip: the injection clip pops up at the exact facial point he names, while he keeps talking.
// Devices: `zoom-box-inset` (G4 T5 Ik5Zt8oGko4 f1245-1399: the inset scales out of its pin, on the place name) +
// `windowed-footage` (DDOS f2007-2214: footage in a rounded window, radius 2 % of its width) + `arrow-curved-callout` (GMu3
// f395-401, 7 f, head lands last) + `tracking-ring` on the point (G4 T20 tQkjtXJEtxY f851-1091) + a numbered `Badge` (ETSQ T7:
// footage windows anchored on a map with numbered badges, one per "first / next" shot).
// Timeline (frames from r0 = s + 1):
//   r0       the ring draws round the point (`sweep` 10 f) and the window grows OUT OF THE POINT to its box (`arrive` 14 f)
//   r0 + 4   the label types (1 char / f) under the window; r0 + 6 the badge pops
//   r0 + 10  the curved callout draws from the window edge to the ring (7 f; head lands r0 + 17)
//   held     the clip plays; the window drifts <= 3 px; the arrow breathes <= 1.5 px
//   out      the window collapses back INTO the point on `exit` (7 f), the arrow's tail erases, and the point keeps a
//            numbered marker (PointMarker) until `park` so the face builds an index of what was treated (build in place, MOTION §1.3)
// Placement: the window takes the side of the frame away from the point (never covers it), vertically centred on the point and
// clamped between the top safe line and the caption band (MOTION §5.3).
// ---------------------------------------------------------------------------------------------------------------------------
export type PipSpec = {
  n: number; label: string; s: number; out: number; park?: number; anchor: PtSrc;
  clip: string; clipFrom?: number; rate?: number; srcW?: number; srcH?: number; focus?: { fx: number; fy: number; z: number }; box?: Box; eyebrow?: string;
  // morph: instead of collapsing back into its point, the window grows to the full frame over the last `morph` 26 f before `out`
  // (card-full-morph, MOTION §4.2), handing over to the same shot full frame in the next piece; arrow: the pointer variant
  morph?: boolean; arrow?: "curved-callout" | "straight-pointer";
};
export const PIP = { w: 380, ring: 28, labelH: 120, gap: 26 };

export const pipBox = (a: Pt, w = PIP.w, aspect = 16 / 9): Box => {
  const h = Math.round(w * aspect);
  const x = a.x < W / 2 ? W - M - w : M;
  const y = Math.max(SAFE_T + 20, Math.min(CAP_T - 40 - PIP.labelH - h, a.y - h / 2));
  return { x, y, w, h };
};

export const InjectionPip: React.FC<PipSpec> = ({ n, label, s, out, park = out, anchor, clip, clipFrom = 0, rate = 1, srcW = 1080, srcH = 1920, focus = { fx: 0.5, fy: 0.5, z: 1 }, box, eyebrow, morph = false, arrow = "curved-callout" }) => {
  const frame = useCurrentFrame();
  if (frame <= s) return null;
  const r0 = s + 1;
  const A = at(anchor, frame);
  const B = box ?? pipBox(at(anchor, r0), PIP.w, srcH / srcW);
  const mS = out - D.morph; // morph start
  const grow = p(frame, r0, D.arrive, "arrive"), shut = morph ? 0 : p(frame, out, D.exit, "exit");
  const k = grow * (1 - shut);
  const showWin = morph ? frame < out : frame < out + D.exit;
  const mq = morph ? p(frame, mS, D.morph, "morph") : 0;
  const lout = morph ? mS : out; // when the label, badge and arrow leave
  // the window rect grows out of a small rect centred on the point and goes back into it
  const s0 = { w: 54, h: 54 * (B.h / B.w) };
  const dx = breathe(frame, 3, 140), dy = breathe(frame, 2, 170, 1);
  const R0 = { x: lerp(A.x - s0.w / 2, B.x + dx, k), y: lerp(A.y - s0.h / 2, B.y + dy, k), w: lerp(s0.w, B.w, k), h: lerp(s0.h, B.h, k) };
  const R = { x: lerp(R0.x, 0, mq), y: lerp(R0.y, 0, mq), w: lerp(R0.w, W, mq), h: lerp(R0.h, H, mq) };
  // the clip, covering the window around its focus point
  // the focus zoom eases back to the whole frame during a morph, so the window lands exactly on the full-frame shot that follows
  const fz = lerp(focus.z, 1, mq), ffx = lerp(focus.fx, 0.5, mq), ffy = lerp(focus.fy, 0.5, mq);
  const sc = (R.w * fz) / srcW, cw = srcW * sc, ch = srcH * sc;
  const left = Math.min(0, Math.max(R.w - cw, R.w / 2 - ffx * cw)), top = Math.min(0, Math.max(R.h - ch, R.h / 2 - ffy * ch));
  // arrow: from the window edge facing the point to just outside the ring
  const towardPip = B.x > A.x ? 1 : -1;
  const from = (f: number): Pt => { const a = at(anchor, f); return { x: towardPip > 0 ? B.x + dx - 14 : B.x + B.w + dx + 14, y: Math.max(B.y + 60, Math.min(B.y + B.h - 60, a.y - 40)) }; };
  const to = (f: number): Pt => { const a = at(anchor, f), fr = from(f), ux = fr.x - a.x, uy = fr.y - a.y, l = Math.hypot(ux, uy) || 1; return { x: a.x + (ux / l) * (PIP.ring + 12), y: a.y + (uy / l) * (PIP.ring + 12) }; };
  const ring = p(frame, r0, 10, "sweep") * (1 - p(frame, morph ? mS : park, D.exit, "exit"));
  return (
    <AbsoluteFill>
      {/* the ring on the exact point (the PointMarker takes over after the window closes) */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", filter: "drop-shadow(0 1px 3px rgba(8,12,22,.45))" }}>
        <circle cx={A.x} cy={A.y} r={PIP.ring} fill="none" stroke={WHITE} strokeWidth={3.5} pathLength={1} strokeDasharray={`${ring} 1`} transform={`rotate(-90 ${A.x} ${A.y})`} />
      </svg>
      {showWin && (
        <div style={{ position: "absolute", left: R.x, top: R.y, width: R.w, height: R.h, borderRadius: Math.max(8, 0.02 * R0.w * 2) * (1 - mq), overflow: "hidden", opacity: Math.min(1, grow * 2.2) * (1 - shut * 0.6),
          background: "#11151d", boxShadow: `0 0 0 ${3 * (1 - mq)}px rgba(255,255,255,.95), 0 24px 60px -18px rgba(8,12,22,${0.6 * (1 - mq)}), 0 4px 12px rgba(8,12,22,${0.25 * (1 - mq)})` }}>
          <Sequence from={r0} layout="none">
            <Media src={clip} trimBefore={Math.round(clipFrom * 24)} rate={rate} style={{ left, top, width: cw, height: ch }} />
          </Sequence>
        </div>
      )}
      {showWin && <Badge n={n} s={s + 6} out={lout} x={R0.x + 40 * (R0.w / B.w)} y={R0.y + 40 * (R0.w / B.w)} />}
      <Arrow variant={arrow} from={from} to={to} start={r0 + 10} end={lout + D.exit} color={WHITE} weight={6} bend={arrow === "curved-callout" ? towardPip * 0.22 : 0} />
      <div style={{ position: "absolute", left: B.x, width: B.w, top: B.y + B.h + PIP.gap, textShadow: ON_FOOTAGE }}>
        {eyebrow && <div style={{ ...caps(24, "rgba(255,255,255,.92)"), marginBottom: 8, ...life(frame, r0 + 4, lout, 8) }}>{eyebrow}</div>}
        <Typed text={label} s={r0 + 4} out={lout} style={{ ...disp(44, WHITE) }} />
      </div>
      {!morph && frame >= out && <PointMarker n={n} s={out} out={park} anchor={anchor} away={towardPip} />}
    </AbsoluteFill>
  );
};

/** the treated point keeps a ring and its number after the window closes (no leader: the badge sits beside the ring) */
export const PointMarker: React.FC<{ n: number; s: number; out: number; anchor: PtSrc; away?: number }> = ({ n, s, out, anchor, away = 1 }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s, out)) return null;
  const A = at(anchor, frame);
  const e = p(frame, out, D.exit, "exit");
  return (
    <AbsoluteFill style={{ opacity: 1 - e }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", filter: "drop-shadow(0 1px 3px rgba(8,12,22,.45))" }}>
        <circle cx={A.x} cy={A.y} r={PIP.ring - 6} fill="none" stroke={WHITE} strokeWidth={3} />
      </svg>
      <Badge n={n} s={s - 1} out={out} x={A.x + away * (PIP.ring + 20)} y={A.y - PIP.ring - 8} d={38} tone="glass" />
    </AbsoluteFill>
  );
};

// (v2 BeforeAfter, the two-card split, was replaced in v3 by SurgeonBA in v3.tsx: surgeon markup + a line wipe on one aligned frame;
// client 2026-11-17)

/** a small note (compliance line): muted caps above the caption band */
export const Note: React.FC<{ text: string; s: number; out: number; y?: number }> = ({ text, s, out, y = 1520 }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s, out)) return null;
  return <div style={{ position: "absolute", left: M, right: M, top: y, textAlign: "center", ...caps(22, "rgba(255,255,255,.9)"), textShadow: "0 1px 6px rgba(0,0,0,.55)", ...life(frame, s, out, 6) }}>{text}</div>;
};

// ---------------------------------------------------------------------------------------------------------------------------
// Word captions (DECISIONS 14d rule 8, `type-caption-word`): each word cuts on at its onset frame; no fade, rise, box or stroke;
// the line holds its place invisibly so nothing reflows. Lines break at a pause >= 8 f or at 3 words / 20 characters. White NHG
// 600, top at 83 % H, the reel "clean" shadow. A second voice (the patient) is italic (DDOS R14, G4 A7).
// ---------------------------------------------------------------------------------------------------------------------------
export type Word = { w: string; f: number; f1: number; voice?: "him" | "her" };
const lines = (words: Word[]) => {
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    const prev = cur[cur.length - 1];
    const len = cur.reduce((a, x) => a + x.w.length + 1, 0) + w.w.length;
    if (prev && (w.f - prev.f1 >= 8 || cur.length >= 3 || len > 20 || w.voice !== prev.voice)) { out.push(cur); cur = []; }
    cur.push(w);
  }
  if (cur.length) out.push(cur);
  return out;
};
export const WordCaptions: React.FC<{ words: Word[]; hide?: [number, number][] }> = ({ words, hide = [] }) => {
  const frame = useCurrentFrame();
  const ls = React.useMemo(() => lines(words), [words]);
  if (hide.some(([a, b]) => frame >= a && frame < b)) return null;
  const i = ls.findIndex((l, j) => frame >= l[0].f && frame < Math.min(ls[j + 1]?.[0].f ?? Infinity, l[l.length - 1].f1 + 10));
  if (i < 0) return null;
  return (
    <div style={{ position: "absolute", left: M, right: M, top: CAP_T, textAlign: "center", font: `600 62.6px/1.2 ${FONT}`, letterSpacing: "0.01em", color: WHITE,
      fontStyle: ls[i][0].voice === "her" ? "italic" : "normal", textShadow: "0 2px 10px rgba(0,0,0,.38), 0 0 2px rgba(0,0,0,.25)", whiteSpace: "nowrap" }}>
      {ls[i].map((w, j) => <span key={j} style={{ visibility: frame >= w.f ? "visible" : "hidden" }}>{(j ? " " : "") + w.w.replace(/[",]/g, "")}</span>)}
    </div>
  );
};

export { MUTED, SAFE_T };
