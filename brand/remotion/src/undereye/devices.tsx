// Under-eye filler reel: the beat devices. Each one is a DEVICE_LIBRARY.md id (named in its comment) built for one spoken line
// (research/ostad/style/undereye/BEATS.md). Frames are composition frames at 24 fps; `s` = the onset frame of the trigger word, and
// every reveal starts at s + 1 (MOTION §3). No dot-and-line anywhere: pointers are headed arrows whose head lands on the last draw
// frame (DEVICE_LIBRARY §A); rings and boxes carry their label beside them, never on a leader.
import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { card } from "../components/Ro";
import { BLUE, D, H, HL, ICE, INK, M, MUTED, SAFE_T, W, WHITE, at, breathe, caps, disp, lerp, life, p, vis, type Pt, type PtSrc } from "./look";

const F = '"neue-haas-grotesk-display", "Inter Tight", Arial, sans-serif';

// ---------------------------------------------------------------------------------------------------------------------------
// Headed arrow (arrow-curved-callout / arrow-straight-pointer / arrow-route-trace / arrow-marker-tick). Draw-on on `sweep`
// (curved and straight 7 f, route 27 f: DEVICE_LIBRARY §A GMu3 f395-401, WZ f926-933, DDOS f216-250); the head grows over the
// last 22 % of the draw and lands on the last draw frame; held, the interior breathes <= 1.5 px (72 f period); out, the tail
// erases toward the tip on `exit` (7 f). The local devices/Arrow.tsx was uncommitted work of another agent when this was built.
// ---------------------------------------------------------------------------------------------------------------------------
type Variant = "curved" | "straight" | "route";
const DRAW: Record<Variant, number> = { curved: 7, straight: 7, route: 27 };
export const HeadedArrow: React.FC<{ variant: Variant; from: PtSrc; to: PtSrc; via?: PtSrc[]; bend?: number; s: number; out?: number; color?: string; width?: number }> = ({
  variant, from, to, via = [], bend = 0.3, s, out = Infinity, color = WHITE, width = 5,
}) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const a = at(from, frame), b = at(to, frame);
  const pts = [a, ...via.map((v) => at(v, frame)), b];
  const draw = p(frame, s + 1, DRAW[variant], "sweep");
  const e = p(frame, out, D.exit, "exit");
  const wob = breathe(frame);
  let d: string, tan: Pt;
  if (variant === "curved") {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y;
    const c = { x: mx - dy * bend + wob, y: my + dx * bend + wob };
    d = `M${a.x},${a.y} Q${c.x},${c.y} ${b.x},${b.y}`;
    tan = { x: b.x - c.x, y: b.y - c.y };
  } else {
    d = "M" + pts.map((q, i) => `${q.x + (i > 0 && i < pts.length - 1 ? wob : 0)},${q.y}`).join(" L");
    const q0 = pts[pts.length - 2];
    tan = { x: b.x - q0.x, y: b.y - q0.y };
  }
  const n = Math.hypot(tan.x, tan.y) || 1, ux = tan.x / n, uy = tan.y / n;
  const hg = Math.max(0, Math.min(1, (draw - 0.78) / 0.22)) * (1 - e); // head grows over the last 22 % of the draw
  const L = 26 * hg, Wd = 13 * hg;
  const head = `${b.x},${b.y} ${b.x - ux * L - uy * Wd},${b.y - uy * L + ux * Wd} ${b.x - ux * L + uy * Wd},${b.y - uy * L - ux * Wd}`;
  // the shaft stops at the head's base so the tip stays sharp
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", filter: "drop-shadow(0 1px 3px rgba(8,12,22,.35))" }}>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1}
        strokeDasharray={`0 ${e} ${Math.max(0, draw * 0.97 - e)} 2`} />
      {hg > 0 && <polygon data-arrowhead points={head} fill={color} stroke={color} strokeWidth={2} strokeLinejoin="round" />}
    </svg>
  );
};

// marker tick (arrow-marker-tick): a small solid triangle that pops in 1 f at its point and falls 7 px on exit (WZ f940/944)
export const Tick: React.FC<{ x: number; y: number; s: number; out?: number; color?: string }> = ({ x, y, s, out = Infinity, color = BLUE }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const e = p(frame, out, D.exit, "exit");
  return (
    <svg width={30} height={26} style={{ position: "absolute", left: x - 15, top: y - 26 + 7 * e, opacity: 1 - e, overflow: "visible" }}>
      <polygon data-arrowhead points="3,3 27,3 15,23" fill={color} stroke={color} strokeWidth={4} strokeLinejoin="round" />
    </svg>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------
// Typed label beside a mark: types on at about 1 character per frame from `s` + 1 (DDOS B09 typed callout), white on footage
// with a soft shadow for legibility (the reel caption treatment, components/Captions "clean").
// ---------------------------------------------------------------------------------------------------------------------------
export const TypedLabel: React.FC<{ text: string; s: number; out?: number; x: number; y: number; align?: "left" | "right" | "center"; size?: number; color?: string; sub?: string }> = ({
  text, s, out = Infinity, x, y, align = "left", size = 40, color = WHITE, sub,
}) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const n = Math.max(0, Math.min(text.length, frame - s));
  const e = p(frame, out, D.exit, "exit");
  const tx = align === "right" ? "-100%" : align === "center" ? "-50%" : "0";
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(${tx}, ${e * 7}px)`, opacity: 1 - e, textAlign: align, textShadow: "0 2px 10px rgba(0,0,0,.45), 0 0 2px rgba(0,0,0,.3)" }}>
      <div style={{ ...disp(size, color), whiteSpace: "nowrap", position: "relative" }}>
        <span style={{ visibility: "hidden" }}>{text}</span>
        <span style={{ position: "absolute", left: 0, top: 0, right: 0, textAlign: align }}>{text.slice(0, n)}</span>
      </div>
      {sub && <div style={{ ...caps(24, "rgba(255,255,255,.9)"), marginTop: 10, opacity: p(frame, s + 1 + text.length, D.arrive, "arrive") }}>{sub}</div>}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------
// Title (chapter-title-card as the reel's title, type-word-fade-rise): eyebrow, then each headline word rises 6 % of its size and
// fades in 5 f on its own cue (DDOS f3-13: 5 f, ease-out, 0 overshoot). A soft top scrim keeps the white type legible over the room.
// ---------------------------------------------------------------------------------------------------------------------------
export const Title: React.FC<{ eyebrow: string; words: { text: string; f: number }[]; out: number }> = ({ eyebrow, words, out }) => {
  const frame = useCurrentFrame();
  const e = p(frame, out, D.exit, "exit");
  return (
    <AbsoluteFill style={{ opacity: 1 - e }}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,14,24,.55) 0%, rgba(10,14,24,.25) 30%, rgba(10,14,24,0) 45%)" }} />
      <div style={{ position: "absolute", left: M, top: SAFE_T + 20, right: M }}>
        <div style={{ ...caps(28, "rgba(255,255,255,.85)"), ...life(frame, 0) }}>{eyebrow}</div>
        <div style={{ ...disp(104, WHITE), marginTop: 18, textShadow: "0 2px 18px rgba(0,0,0,.35)" }}>
          {words.map((w, i) => {
            const q = p(frame, w.f + 1, 5, "arrive");
            return <span key={i} style={{ display: "inline-block", opacity: q, transform: `translateY(${(1 - q) * 0.06 * 104 * 4}px)`, marginRight: "0.24em" }}>{w.text}</span>;
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// section card (chapter-title-card, one look for every section; structural like the captions): a glass pill top-left with the
// number and the section name; arrive 14 f, hold, exit 7 f
export const SectionPill: React.FC<{ num: string; title: string; s: number; out: number }> = ({ num, title, s, out }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s, out)) return null;
  return (
    <div style={{ ...card(999), left: M, top: SAFE_T, padding: "16px 30px 16px 22px", display: "flex", alignItems: "center", gap: 16, ...life(frame, s, out) }}>
      <span style={{ ...disp(26, BLUE, 600), fontVariantNumeric: "tabular-nums" }}>{num}</span>
      <span style={{ width: 1.5, height: 26, background: "rgba(29,34,48,.25)" }} />
      <span style={{ ...caps(26, INK) }}>{title}</span>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------
// Loupe (loupe-zoom, G4 T2 5J8M f1168): a circular window opens (10 f, `arrive`) in the empty band and shows the footage under it
// magnified around a tracked point; a curved headed arrow leaves the loupe for that point. `video` renders the same shot again.
// ---------------------------------------------------------------------------------------------------------------------------
export const Loupe: React.FC<{ s: number; out: number; c: Pt; r: number; target: PtSrc; zoom: number; video: (style: React.CSSProperties) => React.ReactNode; label: string; labelS: number }> = ({
  s, out, c, r, target, zoom, video, label, labelS,
}) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const o = p(frame, s + 1, 10, "arrive"), e = p(frame, out, D.exit, "exit");
  const t = at(target, frame);
  const rr = r * o * (1 - 0.15 * e);
  // the magnified layer: scale the full frame by `zoom` about the target, then move the target to the loupe centre
  const tx = c.x - t.x * zoom, ty = c.y - t.y * zoom;
  const rim = { x: c.x + (t.x - c.x) * (r + 10) / Math.hypot(t.x - c.x, t.y - c.y), y: c.y + (t.y - c.y) * (r + 10) / Math.hypot(t.x - c.x, t.y - c.y) };
  return (
    <AbsoluteFill style={{ opacity: 1 - e }}>
      <div style={{ position: "absolute", left: c.x - rr, top: c.y - rr, width: 2 * rr, height: 2 * rr, borderRadius: "50%", overflow: "hidden",
        boxShadow: "0 0 0 3px rgba(255,255,255,.95), 0 18px 50px rgba(8,12,22,.35)" }}>
        <div style={{ position: "absolute", left: -(c.x - rr), top: -(c.y - rr), width: W, height: H }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${zoom})` }}>
            {video({ position: "absolute", left: 0, top: 0, width: W, height: H })}
          </div>
        </div>
      </div>
      <HeadedArrow variant="curved" from={rim} to={{ x: t.x, y: t.y - 18 }} bend={-0.22} s={s + 8} out={out} />
      <TypedLabel text={label} s={labelS} out={out} x={c.x} y={c.y + r + 26} align="center" size={44} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------
// Strike and replace (type-strike-replace, G3 T13 D_bh f3350): "Tired" types on its word; on the correction a strike draws in 6 f,
// the old word dims and moves up 2 % H, and the replacement (his word) arrives.
// ---------------------------------------------------------------------------------------------------------------------------
export const StrikeReplace: React.FC<{ oldText: string; newText: string; s: number; strikeS: number; newS: number; out: number; y: number }> = ({ oldText, newText, s, strikeS, newS, out, y }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const k = p(frame, strikeS + 1, 6, "sweep"), mv = p(frame, strikeS + 7, 10, "arrive");
  const e = p(frame, out, D.exit, "exit");
  return (
    <div style={{ position: "absolute", left: M, right: M, top: y, opacity: 1 - e, textShadow: "0 2px 14px rgba(0,0,0,.4)" }}>
      <div style={{ display: "inline-block", position: "relative", transform: `translateY(${-0.02 * H * mv}px)`, opacity: lerp(1, 0.55, mv), ...disp(96, WHITE), ...life(frame, s + 1) }}>
        {oldText}
        <span style={{ position: "absolute", left: -6, top: "54%", height: 7, width: `calc(${k * 100}% + ${12 * k}px)`, background: BLUE, borderRadius: 4 }} />
      </div>
      <div style={{ ...disp(96, WHITE), marginTop: 6, ...life(frame, newS + 1) }}>{newText}</div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------
// Plate, then the product (product-plate-reveal, ro yaFInenV3Eg f618-674; MOTION `plate` 18 + 18 f): a glass plate, then the real
// syringe (a still from his footage) fades through it and drifts; the chip lands last on its word.
// ---------------------------------------------------------------------------------------------------------------------------
export const ProductPlate: React.FC<{ s: number; out: number; img: string; crop: { x: number; y: number; w: number; h: number }; srcW: number; srcH: number; box: { x: number; y: number; w: number; h: number };
  chip: string; chipS: number; sub?: string }> = ({ s, out, img, crop, srcW, srcH, box, chip, chipS, sub }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const plate = p(frame, s + 1, D.plate, "plate"), pic = p(frame, s + 1 + D.plate, D.plate, "plate");
  const e = p(frame, out, D.exit, "exit");
  const k = box.w / crop.w, drift = 1 + 0.03 * Math.min(1, (frame - s) / 120); // slow push so the still is never static
  return (
    <div style={{ ...card(24), left: box.x, top: box.y, width: box.w, height: box.h, opacity: plate * (1 - e), transform: `translateY(${e * 7}px)` }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 24, opacity: pic }}>
        <Img src={staticFile(img)} style={{ position: "absolute", width: srcW * k, height: srcH * k, left: -crop.x * k, top: -crop.y * k, transformOrigin: `${(crop.x + crop.w / 2) * k}px ${(crop.y + crop.h / 2) * k}px`, transform: `scale(${drift})` }} />
      </div>
      <div style={{ position: "absolute", left: 22, bottom: 22, ...card(999), padding: "12px 22px", ...life(frame, chipS + 1) }}>
        <div style={{ ...caps(24, INK) }}>{chip}</div>
        {sub && <div style={{ ...caps(18, MUTED), marginTop: 6 }}>{sub}</div>}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------
// Needle vs cannula (split-labelled, G1 T11 / G3 T6; L23): two labelled glass cards, never a slider. Each card holds the
// instrument's tip drawn as a plain profile (instruments are not anatomy, DECISIONS 14d rule 6), labels on his words.
// ---------------------------------------------------------------------------------------------------------------------------
const TipNeedle: React.FC<{ q: number }> = ({ q }) => (
  <svg width={360} height={120} viewBox="0 0 360 120">
    <g opacity={q}>
      <rect x={0} y={50} width={250} height={20} fill="#c9d1db" />
      <polygon points="250,50 340,66 250,70" fill="#c9d1db" stroke={INK} strokeWidth={2.5} strokeLinejoin="miter" />
      <line x1={0} y1={50} x2={250} y2={50} stroke={INK} strokeWidth={2.5} /><line x1={0} y1={70} x2={250} y2={70} stroke={INK} strokeWidth={2.5} />
    </g>
  </svg>
);
const TipCannula: React.FC<{ q: number }> = ({ q }) => (
  <svg width={360} height={120} viewBox="0 0 360 120">
    <g opacity={q}>
      <path d="M0,50 H300 A10,10 0 0 1 300,70 H0" fill="#c9d1db" stroke={INK} strokeWidth={2.5} />
      <rect x={262} y={56} width={20} height={8} rx={4} fill={INK} />
    </g>
  </svg>
);
export const TipCompare: React.FC<{ s: number; out: number; needleS: number; bluntS: number; sharpS: number; chips: { text: string; s: number }[]; y: number }> = ({
  s, out, needleS, bluntS, sharpS, chips, y,
}) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const cw = (W - 2 * M - 24) / 2, ch = 400;
  const panel = (x: number, start: number, name: string, tip: React.ReactNode, tag: string, tagS: number, extra?: React.ReactNode) => (
    <div style={{ ...card(24), left: x, top: y, width: cw, height: ch, padding: "26px 26px", ...life(frame, start + 1, out) }}>
      <div style={{ ...caps(24, MUTED) }}>{name}</div>
      <div style={{ marginTop: 34, marginLeft: -10, transform: `translateX(${breathe(frame, 1.5, 96)}px)` }}>{tip}</div>
      <div style={{ marginTop: 22, display: "inline-block", ...disp(44, INK), background: `linear-gradient(90deg, ${HL} ${p(frame, tagS + 1, D.highlighter) * 100}%, transparent 0)`, padding: "2px 8px", marginLeft: -8, opacity: frame > tagS ? 1 : 0 }}>{tag}</div>
      {extra}
    </div>
  );
  const nq = p(frame, needleS + 1, D.plate, "plate"), cq = p(frame, s + 1, D.plate, "plate");
  return (
    <>
      {panel(M, needleS, "Needle", <TipNeedle q={nq} />, "Sharp", sharpS,
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          {chips.map((c, i) => <span key={i} style={{ ...caps(22, INK), padding: "10px 16px", borderRadius: 999, background: "rgba(29,34,48,.08)", ...life(frame, c.s + 1, out, 8) }}>{c.text}</span>)}
        </div>)}
      {panel(M + cw + 24, s, "Cannula", <TipCannula q={cq} />, "Blunt", bluntS)}
    </>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------
// How long it lasts (timeline-markers + arrow-marker-tick, Are.na 16463981; WZ f940/944): a months rule draws on `sweep`, a tick
// pops on "a year" and on "a year and a half", and the span between them fills ice on `sweep` 18 f. His figures only (rule 10).
// ---------------------------------------------------------------------------------------------------------------------------
export const Lasts: React.FC<{ s: number; out: number; yearS: number; halfS: number; y: number }> = ({ s, out, yearS, halfS, y }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const x0 = M + 60, x1 = W - M - 60, u = (m: number) => x0 + ((x1 - x0) * m) / 18;
  const rule = p(frame, s + 1, D.rowWipe, "sweep"), band = p(frame, halfS + 1, D.dotFill, "sweep");
  return (
    <div style={{ ...card(24), left: M, top: y, width: W - 2 * M, height: 330, ...life(frame, s + 1, out) }}>
      <div style={{ position: "absolute", left: 60, top: 34, ...caps(24, MUTED) }}>How long it lasts</div>
      <div style={{ position: "absolute", left: u(12) - M, top: 150, width: (u(18) - u(12)) * band, height: 26, background: ICE }} />
      <div style={{ position: "absolute", left: x0 - M, top: 176, width: (x1 - x0) * rule, height: 3, background: INK }} />
      {[0, 6, 12, 18].map((m) => (
        <div key={m} style={{ position: "absolute", left: u(m) - M - 40, width: 80, top: 192, textAlign: "center", ...caps(22, MUTED), opacity: rule >= m / 18 ? 1 : 0 }}>{m} mo</div>
      ))}
      <div style={{ position: "absolute", left: 0, top: 0 }}>
        <Tick x={u(12) - M} y={146} s={yearS} out={out} />
        <Tick x={u(18) - M} y={146} s={halfS} out={out} />
      </div>
      <div style={{ position: "absolute", left: u(12) - M - 120, top: 244, width: 240, textAlign: "center", ...disp(36, INK), ...life(frame, yearS + 1, out, 8) }}>A year</div>
      <div style={{ position: "absolute", left: u(18) - M - 170, top: 244, width: 200, textAlign: "right", ...disp(36, BLUE), ...life(frame, halfS + 1, out, 8) }}>1½ years</div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------
// Tracking ring (tracking-ring, G4 T20 tQkjtXJEtxY f851-1091): a ring re-placed every frame on a tracked point of the footage,
// settling in 5 f on `arrive`; its label sits beside it (no leader).
// ---------------------------------------------------------------------------------------------------------------------------
export const TrackRing: React.FC<{ s: number; out: number; c: PtSrc; r: number; label: string; side?: "left" | "right" }> = ({ s, out, c, r, label, side = "right" }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const q = p(frame, s + 1, D.ring, "arrive"), e = p(frame, out, D.exit, "exit"), o = at(c, frame);
  const rr = r + 6 * (1 - q);
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, filter: "drop-shadow(0 1px 3px rgba(8,12,22,.4))" }}>
        <circle cx={o.x} cy={o.y} r={rr} fill="none" stroke={WHITE} strokeWidth={4} opacity={q * (1 - e)} />
      </svg>
      <TypedLabel text={label} s={s + D.ring} out={out} x={side === "right" ? o.x + r + 22 : o.x - r - 22} y={o.y - 26} align={side === "right" ? "left" : "right"} size={42} />
    </>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------
// Box slam (type-box-slam, GMu3 f1512-1522): the word rises 7 % of its size with a scale 0.85 -> 1 in 4 f, then an ice box wipes
// left to right behind it in 4 f; a muted line under it arrives on its own word.
// ---------------------------------------------------------------------------------------------------------------------------
export const BoxSlam: React.FC<{ text: string; s: number; out: number; sub?: string; subS?: number; x: number; y: number }> = ({ text, s, out, sub, subS = s, x, y }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const t = p(frame, s + 1, 4, "arrive"), b = p(frame, s + 5, 4, "sweep"), e = p(frame, out, D.exit, "exit");
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: 1 - e, transform: `translateY(${e * 7}px)` }}>
      <div style={{ position: "relative", display: "inline-block", padding: "6px 22px" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${b * 100}%`, background: ICE }} />
        <div style={{ position: "relative", ...disp(88, INK), opacity: t, transform: `translateY(${(1 - t) * 0.07 * 88}px) scale(${0.85 + 0.15 * t})`, transformOrigin: "left bottom",
          color: b > 0.5 ? INK : WHITE, textShadow: b > 0.5 ? "none" : "0 2px 12px rgba(0,0,0,.4)" }}>{text}</div>
      </div>
      {sub && <div style={{ ...caps(28, WHITE), marginTop: 14, textShadow: "0 2px 10px rgba(0,0,0,.5)", ...life(frame, subS + 1, out, 8) }}>{sub}</div>}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------
// Annotation boxes on footage (annotation-box-footage, G4 T2 5J8M f2293-2311): hairline rounded boxes draw round each under-eye
// (`sweep` 14 f) on its word, the rest of the frame dims to 0.4 (MOTION §3 "dim the rest"), the label sits under the box.
// ---------------------------------------------------------------------------------------------------------------------------
export type Box = { x: number; y: number; w: number; h: number };
export const SideBoxes: React.FC<{ s: number; out: number; boxes: { box: (f: number) => Box; label: string; s: number; accent?: boolean }[] }> = ({ s, out, boxes }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const dim = p(frame, s + 1, 12, "sweep") * (1 - p(frame, out, D.exit, "exit"));
  const e = p(frame, out, D.exit, "exit");
  return (
    <AbsoluteFill>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <mask id="sideholes">
            <rect width={W} height={H} fill="white" />
            {boxes.map((b, i) => { const r = b.box(frame); return frame > b.s ? <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={18} fill="black" /> : null; })}
          </mask>
        </defs>
        <rect width={W} height={H} fill="rgb(10,14,24)" opacity={0.4 * dim} mask="url(#sideholes)" />
        {boxes.map((b, i) => {
          const r = b.box(frame), q = p(frame, b.s + 1, D.rowWipe, "sweep");
          return <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={18} fill="none" stroke={b.accent ? HL : WHITE} strokeWidth={3.5} pathLength={1} strokeDasharray={`${q} 1`} opacity={1 - e} />;
        })}
      </svg>
      {boxes.map((b, i) => { const r = b.box(frame); return <TypedLabel key={i} text={b.label} s={b.s + 4} out={out} x={r.x + r.w / 2} y={r.y + r.h + 18} align="center" size={44} color={b.accent ? ICE : WHITE} />; })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------
// Water panel (topic-glass-panel, our rosacea MicrobeCard method): one glass panel that animates the one thing he says. Two gel
// beads take on water drops; the water-loving one swells round and "pillowy", the low-water one barely changes. Labelled
// "Illustration" (no numbers; the swelling is not to scale).
// ---------------------------------------------------------------------------------------------------------------------------
export const WaterPanel: React.FC<{ s: number; out: number; notS: number; pillowS: number; y: number }> = ({ s, out, notS, pillowS, y }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const pw = W - 2 * M, ph = 470;
  const drops = (cx: number, k: number) => [0, 1, 2, 3, 4].map((i) => {
    const t0 = s + 4 + i * 14, u = Math.max(0, Math.min(1, (frame - t0) / 16));
    if (u <= 0 || u >= 1) return null;
    return <path key={i} d={`M${cx + (i - 2) * 26},${120 + u * 120 * k} q-9,14 0,22 q9,-8 0,-22z`} fill={BLUE} opacity={0.75 * (1 - u * 0.6)} />;
  });
  const swellA = 1 + 0.32 * p(frame, s + 10, 70, "settle"), swellB = 1 + 0.06 * p(frame, s + 10, 70, "settle");
  const blob = (cx: number, sc: number, flat: boolean) => (
    <ellipse cx={cx} cy={300} rx={88 * sc * (flat ? 1.12 : 1)} ry={(flat ? 44 : 60) * sc * (flat ? 1 : 1.12)} fill="rgba(207,233,247,.9)" stroke={INK} strokeWidth={2.5} />
  );
  return (
    <div style={{ ...card(24), left: M, top: y, width: pw, height: ph, ...life(frame, s + 1, out) }}>
      <div style={{ position: "absolute", left: 30, top: 26, ...caps(24, MUTED) }}>These fillers absorb water</div>
      <svg width={pw} height={ph} style={{ position: "absolute", inset: 0 }}>
        {drops(pw * 0.27, 1)}{drops(pw * 0.73, 1)}
        {blob(pw * 0.27, swellA, false)}
        {blob(pw * 0.73, swellB, true)}
      </svg>
      <div style={{ position: "absolute", left: 0, width: pw / 2, top: 380, textAlign: "center", ...disp(34, INK), ...life(frame, pillowS + 1, out, 8) }}>Pillowy</div>
      <div style={{ position: "absolute", left: pw / 2, width: pw / 2, top: 380, textAlign: "center", ...disp(34, INK), ...life(frame, notS + 1, out, 8) }}>
        <span style={{ background: `linear-gradient(90deg, ${HL} ${p(frame, notS + 1, D.highlighter) * 100}%, transparent 0)`, padding: "0 6px" }}>Not hydrophilic</span>
      </div>
      <div style={{ position: "absolute", right: 26, top: 28, ...caps(18, MUTED) }}>Illustration</div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------
// Tint on the real face (region-light-on-model, ig_DdrkdrYv-yW f600-660): a soft blue tint fades on (6 f) over both tracked
// under-eye regions, holds while he names it, then clears on `sweep`. Labelled "Illustration": it shows what the Tyndall effect
// looks like, not this patient.
// ---------------------------------------------------------------------------------------------------------------------------
export const BlueTint: React.FC<{ s: number; clearS: number; out: number; spots: ((f: number) => Box)[] }> = ({ s, clearS, out, spots }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const q = p(frame, s + 1, 6, "arrive") * (1 - p(frame, clearS + 1, 20, "sweep"));
  return (
    <AbsoluteFill style={{ mixBlendMode: "multiply" }}>
      {spots.map((sp, i) => { const b = sp(frame); return (
        <div key={i} style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, borderRadius: "50%", opacity: 0.55 * q,
          background: "radial-gradient(closest-side, rgba(70,110,190,.95), rgba(70,110,190,.5) 60%, rgba(70,110,190,0))", filter: "blur(6px)" }} />
      ); })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------
// Card -> full frame (card-full-morph, MOTION §4.2 / L09): the shot plays in a rounded card on a frosted ground, then grows to
// the full frame on `morph` 26 f, radius 24 -> 0, while the surround fades out in 5 f. The shot keeps playing (no freeze).
// ---------------------------------------------------------------------------------------------------------------------------
export const MorphCard: React.FC<{ s: number; fullS: number; out: number; card: Box; children: React.ReactNode; label: string }> = ({ s, fullS, out, card: c, children, label }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const m = p(frame, fullS + 1, D.morph, "morph"), sur = 1 - p(frame, fullS + 1, D.morphSurround, "settle");
  const inn = p(frame, s + 1, D.arrive, "arrive");
  const x = lerp(c.x, 0, m), y = lerp(c.y, 0, m), w = lerp(c.w, W, m), h = lerp(c.h, H, m);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ backdropFilter: `blur(${22 * inn * sur}px)`, background: `rgba(238,242,247,${0.55 * inn * sur})` }} />
      <div style={{ position: "absolute", left: x, top: y + (1 - inn) * 16, width: w, height: h, borderRadius: 24 * (1 - m), overflow: "hidden", opacity: inn,
        boxShadow: `0 22px 60px rgba(8,12,22,${0.25 * (1 - m)})` }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0", transform: `scale(${w / W})` }}>{children}</div>
      </div>
      <div style={{ position: "absolute", left: M, top: c.y - 70, ...caps(28, INK), opacity: inn * sur }}>{label}</div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------
// Calendar circle (calendar-date-circle, Are.na 31223791; Ro Calendar): a three-week strip on glass; "Today" is marked; on "a week
// or two" a hand-drawn ring closes round weeks 1-2 on `sweep` 12 f and "Follow-up photo" arrives.
// ---------------------------------------------------------------------------------------------------------------------------
export const WeeksCircle: React.FC<{ s: number; circleS: number; out: number; y: number }> = ({ s, circleS, out, y }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const cw = W - 2 * M, cell = (cw - 60 - 3 * 16) / 4;
  const q = p(frame, circleS + 1, 12, "sweep");
  const cells = ["Today", "Week 1", "Week 2", "Week 3"];
  const rx = 16 + 30 + cell + 16 - 10, rw = 2 * cell + 16 + 20;
  return (
    <div style={{ ...card(24), left: M, top: y, width: cw, height: 300, ...life(frame, s + 1, out) }}>
      <div style={{ position: "absolute", left: 30, top: 28, ...caps(24, MUTED) }}>Follow-up</div>
      {cells.map((c, i) => (
        <div key={i} style={{ position: "absolute", left: 30 + i * (cell + 16), top: 96, width: cell, height: 120, borderRadius: 16, background: i === 0 ? INK : "rgba(29,34,48,.06)",
          display: "flex", alignItems: "center", justifyContent: "center", ...disp(30, i === 0 ? WHITE : INK, 500) }}>{c}</div>
      ))}
      <svg width={cw} height={300} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <rect x={rx} y={84} width={rw} height={144} rx={72} fill="none" stroke={BLUE} strokeWidth={5} pathLength={1} strokeDasharray={`${q} 1`} transform={`rotate(-1.5 ${rx + rw / 2} 156)`} />
      </svg>
      <div style={{ position: "absolute", left: rx, width: rw, top: 240, textAlign: "center", ...disp(32, BLUE), ...life(frame, circleS + 8, out, 8) }}>Follow-up photo</div>
    </div>
  );
};

// a small note line (compliance, credits): muted caps, bottom of the safe area, above the captions
export const Note: React.FC<{ text: string; s: number; out: number; y?: number; dark?: boolean }> = ({ text, s, out, y = 1520, dark }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s, out)) return null;
  return <div style={{ position: "absolute", left: M, right: M, top: y, textAlign: "center", ...caps(22, dark ? MUTED : "rgba(255,255,255,.88)"), textShadow: dark ? "none" : "0 1px 6px rgba(0,0,0,.5)", ...life(frame, s, out, 6) }}>{text}</div>;
};

// the full-bleed footage layer of a segment, also used inside the loupe and the morph card
export const Shot: React.FC<{ src: string; trimBefore: number; rate: number; style?: React.CSSProperties; muted?: boolean; volume?: number }> = ({ src, trimBefore, rate, style, muted = true, volume = 1 }) => (
  <OffthreadVideo src={staticFile(src)} trimBefore={trimBefore} playbackRate={rate} muted={muted} volume={volume} style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover", ...style }} />
);
