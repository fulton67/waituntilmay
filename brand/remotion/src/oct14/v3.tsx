// Oct 14 injection reel, v3: the designed label, the surgeon's markup, glossary examples and the "usually vs here" contrast.
// NOT FOR POSTING until patient consent = yes. Every piece is a DEVICE_LIBRARY id with a brief and citations in
// research/ostad/style/oct14/BEATS.md. No text sits on a flat filled box (client 2026-11-17, LESSONS L1; lint BOX1 / BOX2): type has
// presence on its own (weight, size, a deep soft shadow), or sits on glass built with depth (blur, rim, long shadow). Pen strokes and
// surgeon ticks are paths with no dot and no headless leader (DEVICE_LIBRARY §A; lint).
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Arrow } from "../devices/Arrow";
import { card } from "../components/Ro";
import { Chip, glass } from "../devices/Markup";
import { Typed } from "./devices";
import { BLUE, D, FONT, ICE, INK, M, MUTED, W, WHITE, at, breathe, caps, disp, lerp, life, p, vis, type Pt, type PtSrc } from "./look";

// the deep soft shadow that gives white type presence on footage (two layers: a wide ambient and a tight contact shadow)
export const PRESENCE = "0 6px 28px rgba(6,10,20,.55), 0 2px 6px rgba(6,10,20,.45), 0 0 1px rgba(6,10,20,.6)";

// ---------------------------------------------------------------------------------------------------------------------------
// The label: three options for the client sheet (LABEL_OPTIONS.md); C was picked.
//   A presence   `type-word-fade-rise` (DDOS f3-13): eyebrow caps, then the word in NHG 600 at 96 px, each word rising 6 % of its
//                size and fading in 5 f on its cue, with the deep soft shadow. No plate.
//   B glass      `topic-glass-panel` material (DECISIONS 11-12, calm glass; ro _MAYscxxhDE f746-812 spatial panels): a frosted plate
//                with a top rim, backdrop blur and a long soft shadow arrives on `arrive` 14 f; navy type inside.
//   C pen        `arrow-hand-drawn` family (Are.na 52386109: white hand-drawn strokes on a face): the word in NHG 600 with the deep
//                shadow, and a hand-drawn pen underline that strokes on in 10 f under it; the same pen as the surgeon's markup.
// ---------------------------------------------------------------------------------------------------------------------------
export type LabelProps = { eyebrow?: string; word: string; sub?: string; s: number; subS?: number; out: number; x: number; y: number; size?: number; style?: "A" | "B" | "C" };
const wobble = (len: number, seed: number) => {
  // a pen line that is not a ruler line: three gentle bends, fixed per label so it never shimmers
  const k = (i: number) => Math.sin(seed * 12.9898 + i * 78.233) * 3;
  return `M0,${6 + k(1)} C${len * 0.3},${2 + k(2)} ${len * 0.62},${9 + k(3)} ${len},${4 + k(4)}`;
};
export const Label: React.FC<LabelProps> = ({ eyebrow, word, sub, s, subS, out, x, y, size = 96, style = "C" }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const e = p(frame, out, D.exit, "exit");
  const words = word.split(" ");
  const wordEl = (color: string) => (
    <div style={{ ...disp(size, color), whiteSpace: "nowrap" }}>
      {words.map((w, i) => { const q = p(frame, s + 1 + i * 3, 5, "arrive"); return <span key={i} style={{ display: "inline-block", opacity: q, transform: `translateY(${(1 - q) * 0.06 * size}px)`, marginRight: "0.22em" }}>{w}</span>; })}
    </div>
  );
  if (style === "B") {
    return (
      <div style={{ ...card(24), left: x, top: y, padding: "22px 30px 26px", opacity: 1 - e, ...life(frame, s + 1, out) }}>
        {eyebrow && <div style={{ ...caps(24, MUTED), marginBottom: 8 }}>{eyebrow}</div>}
        {wordEl(INK)}
        {sub && <Typed text={sub} s={subS ?? s + 8} out={out} style={{ ...disp(38, INK, 500), marginTop: 8 }} />}
      </div>
    );
  }
  const len = size * 0.5 * word.length;
  const ul = p(frame, s + 4, 10, "sweep");
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: 1 - e, transform: `translateY(${7 * e}px)`, textShadow: PRESENCE }}>
      {eyebrow && <div style={{ ...caps(26, "rgba(255,255,255,.94)"), marginBottom: 6, ...life(frame, s + 1, out, 8) }}>{eyebrow}</div>}
      {wordEl(WHITE)}
      {style === "C" && (
        <svg width={len + 20} height={22} style={{ display: "block", marginTop: -4, overflow: "visible", filter: "drop-shadow(0 2px 4px rgba(6,10,20,.5))" }}>
          <path d={wobble(len, word.length)} fill="none" stroke={WHITE} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={`${ul} 1`} />
        </svg>
      )}
      {sub && <Typed text={sub} s={subS ?? s + 8} out={out} style={{ ...disp(42, WHITE, 500), marginTop: 6 }} />}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------
// Pen marks on her face (`hud-face-labels` / `arrow-hand-drawn`): every point is a PtSrc on her tracked landmarks, so the mark moves
// with her. A stroke draws on in `d` frames (6-12 f, the brief) on `sweep`; a surgeon's x is two short strokes; a zone is a closed
// pen outline plus light hatching clipped to it.
// ---------------------------------------------------------------------------------------------------------------------------
const path = (pts: Pt[]) => (pts.length < 3 ? `M${pts.map((q) => `${q.x},${q.y}`).join(" L")}` :
  "M" + pts[0].x + "," + pts[0].y + pts.slice(1).map((q, i) => { const a = pts[i]; return ` Q${a.x},${a.y} ${(a.x + q.x) / 2},${(a.y + q.y) / 2}`; }).join("") + ` L${pts[pts.length - 1].x},${pts[pts.length - 1].y}`);
export const PenStroke: React.FC<{ pts: PtSrc[]; s: number; out: number; d?: number; w?: number; color?: string; opacity?: number }> = ({ pts, s, out, d = 10, w = 4.5, color = WHITE, opacity = 1 }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const q = p(frame, s + 1, d, "sweep"), e = p(frame, out, D.exit, "exit");
  const P = pts.map((x) => at(x, frame));
  return (
    <svg width={W} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible", filter: "drop-shadow(0 1px 3px rgba(6,10,20,.55))", opacity: opacity * (1 - e) }}>
      <path d={path(P)} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${q} 1`} />
    </svg>
  );
};
export const SurgeonX: React.FC<{ c: PtSrc; s: number; out: number; r?: number; color?: string; opacity?: number }> = ({ c, s, out, r = 9, color = WHITE, opacity = 1 }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const o = at(c, frame), a = p(frame, s + 1, 6, "sweep"), b = p(frame, s + 5, 6, "sweep"), e = p(frame, out, D.exit, "exit");
  return (
    <svg width={W} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible", filter: "drop-shadow(0 1px 2px rgba(6,10,20,.6))", opacity: opacity * (1 - e) }}>
      <path d={`M${o.x - r},${o.y - r} L${o.x + r},${o.y + r}`} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray={`${a} 1`} />
      <path d={`M${o.x + r},${o.y - r} L${o.x - r},${o.y + r}`} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray={`${b} 1`} />
    </svg>
  );
};
export const HatchZone: React.FC<{ c: PtSrc; rx: number; ry: number; rot?: number; s: number; out: number; color?: string; opacity?: number; id: string }> = ({ c, rx, ry, rot = 0, s, out, color = WHITE, opacity = 1, id }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const o = at(c, frame), q = p(frame, s + 1, 12, "sweep"), h = p(frame, s + 9, 10, "sweep"), e = p(frame, out, D.exit, "exit");
  const lines = Array.from({ length: Math.ceil((rx * 2) / 9) + 6 }, (_, i) => -rx - ry + i * 9);
  return (
    <svg width={W} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible", filter: "drop-shadow(0 1px 3px rgba(6,10,20,.5))", opacity: opacity * (1 - e) }}>
      <defs><clipPath id={`hz-${id}`}><ellipse cx={o.x} cy={o.y} rx={rx} ry={ry} transform={`rotate(${rot} ${o.x} ${o.y})`} /></clipPath></defs>
      <ellipse cx={o.x} cy={o.y} rx={rx + breathe(frame, 0.8)} ry={ry} transform={`rotate(${rot} ${o.x} ${o.y})`} fill="none" stroke={color} strokeWidth={3.5} strokeDasharray={`${q * 9} ${q < 1 ? 1 : 0}`} pathLength={9} />
      <g clipPath={`url(#hz-${id})`} opacity={0.55 * h}>
        {lines.map((k, i) => <line key={i} x1={o.x + k} y1={o.y + ry + 4} x2={o.x + k + ry * 1.2} y2={o.y - ry - 4} stroke={color} strokeWidth={1.6} />)}
      </g>
    </svg>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------
// Example card (`held-photo-card`, grove DfUl-B7p09L f285-593: "this is what it looks like"): a real, on-air example of the condition
// he names (research/ostad/style/GLOSSARY.md), on calm glass with depth, plate-then-picture (M04 M1-M2), the source line on the frame
// (DDOS R13). It slowly drifts so the still never holds dead.
// ---------------------------------------------------------------------------------------------------------------------------
export const ExampleCard: React.FC<{ src: string; crop: { x: number; y: number; w: number; h: number }; iw: number; ih: number; s: number; out: number;
  x: number; y: number; w: number; h: number; title: string; credit: string }> = ({ src, crop, iw, ih, s, out, x, y, w, h, title, credit }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const plate = p(frame, s + 1, 10, "plate"), pic = p(frame, s + 6, 12, "plate"), e = p(frame, out, D.exit, "exit");
  const k = w / crop.w, z = 1 + 0.03 * Math.min(1, (frame - s) / 72);
  return (
    <div style={{ ...card(24), left: x, top: y + 7 * e, width: w, height: h + 96, opacity: plate * (1 - e) }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, overflow: "hidden", borderTopLeftRadius: 24, borderTopRightRadius: 24, opacity: pic }}>
        <Img src={staticFile(src)} style={{ position: "absolute", maxWidth: "none", width: iw * k, height: ih * k, left: -crop.x * k, top: -crop.y * k, transformOrigin: `${(crop.x + crop.w / 2) * k}px ${(crop.y + crop.h / 2) * k}px`, transform: `scale(${z})` }} />
      </div>
      <div style={{ position: "absolute", left: 22, top: h + 14, right: 22 }}>
        <div style={{ ...disp(32, INK, 600) }}>{title}</div>
        <div style={{ ...caps(16, MUTED), marginTop: 6, letterSpacing: "0.04em", textTransform: "none" }}>{credit}</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------
// Usually vs here (`split-labelled` as two labelled glass columns, G1 R27, never a slider; `type-strike-replace` G3 T13 D_bh f3350:
// the strike draws in 6 f and the old line dims): the approach he is NOT using is struck and marked "not used here"; his approach
// arrives on his word. Carries his "usually X, but Y" so the cut can never read as the opposite (client 2026-11-17, LESSONS L2).
// ---------------------------------------------------------------------------------------------------------------------------
export const UsuallyHere: React.FC<{ s: number; strikeS: number; hereS: number; out: number; usual: string; here: string; notHere?: string; eyebrow?: string; y: number }> = ({ s, strikeS, hereS, out, usual, here, notHere = "Not used here", eyebrow = "Usually", y }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const cw = (W - 2 * M - 24) / 2;
  const k = p(frame, strikeS + 1, 6, "sweep"), dim = p(frame, strikeS + 7, 10, "arrive");
  const col = (x: number, start: number, head: string, body: React.ReactNode) => (
    <div style={{ ...card(24), left: x, top: y, width: cw, height: 250, padding: "24px 26px", ...life(frame, start + 1, out) }}>
      <div style={{ ...caps(24, MUTED) }}>{head}</div>
      {body}
    </div>
  );
  return (
    <>
      {col(M, s, eyebrow, (
        <div style={{ marginTop: 18, position: "relative", opacity: lerp(1, 0.55, dim) }}>
          <div style={{ ...disp(46, INK) }}>{usual}</div>
          <svg width={cw - 52} height={130} style={{ position: "absolute", left: -4, top: -6, overflow: "visible" }}>
            <path d={`M0,${70} C${(cw - 52) * 0.4},${58} ${(cw - 52) * 0.7},${80} ${cw - 56},${48}`} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={`${k} 1`} />
          </svg>
          <div style={{ ...caps(22, INK), marginTop: 18, opacity: dim }}>{notHere}</div>
        </div>
      ))}
      {frame > hereS && col(M + cw + 24, hereS, "Here", (
        <div style={{ marginTop: 18 }}>
          <div style={{ ...disp(46, INK) }}>{here}</div>
          <svg width={60} height={40} style={{ marginTop: 14, overflow: "visible" }}>
            <path d="M4,20 L22,34 L56,4" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${p(frame, hereS + 5, 8, "sweep")} 1`} />
          </svg>
        </div>
      ))}
    </>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------
// The surgeon's before/after (`hud-face-labels` + `arrow-hand-drawn` + `split-labelled` as a line wipe, G3 oomds0rZz_o f118; never a
// slider handle: DECISIONS 14d rule 1). One aligned frame of her face (before = IMG_3637 4:42 PM; after = IMG_3656 4:55 PM, registered
// on the eyes, nose and mouth). 1) The markup draws on the BEFORE in the order he treated: Evolysse Form cheeks (ticks at the measured
// entry points + a hatched zone), Evolysse Smooth lower face (entry tick + the cannula paths + zone), the neuromodulator (ticks + zones).
// Every mark is measured (research/ostad/style/oct14/marks.json, ARROWS.md). 2) A line wipe carries the AFTER across under the locked
// markup. 3) The markup drops to 35 %; a headed arrow shows the one measured change (volume up on the cheek); treated areas with no
// visible change yet get an honest note; the neuromodulator note is his own words.
// ---------------------------------------------------------------------------------------------------------------------------
export type Mark = { id: string; xy: [number, number]; product: string; order: number };
export type Zone = { id: string; c: [number, number]; rx: number; ry: number; rot?: number; product: string; order: number; label?: string; labelXY?: [number, number] };
export type PathM = { pts: [number, number][]; order: number };
export type Gain = { from: [number, number]; to: [number, number]; label: string; labelXY: [number, number] };
export type SurgeonProps = {
  s: number; wipeS: number; gainS: number; noteS: number; out: number; before: string; after: string; iw: number; ih: number;
  crop: { x: number; y: number; w: number }; box: { x: number; y: number; w: number; h: number };
  marks: Mark[]; zones: Zone[]; paths: PathM[]; gains: Gain[]; notes: { text: string; s: number }[]; labels: { text: string; xy: [number, number]; order: number }[];
  subs: [string, string];
  contour?: { before: [number, number][]; after: [number, number][]; shift_px: number };
};
export const SurgeonBA: React.FC<SurgeonProps> = (P) => {
  const frame = useCurrentFrame();
  if (!vis(frame, P.s + 1, P.out)) return null;
  const { box: B, crop, iw, ih } = P;
  const k = B.w / (crop.w * iw); // card px per source px
  const drift = 1 + 0.02 * Math.min(1, Math.max(0, (frame - P.s) / Math.max(1, P.out - P.s)));
  const toCard = (q: [number, number]): Pt => ({ x: B.x + B.w / 2 + ((q[0] - crop.x * iw) * k - B.w / 2) * drift, y: B.y + B.h / 2 + ((q[1] - crop.y * ih) * k - B.h / 2) * drift });
  const plate = p(frame, P.s + 1, D.plate, "plate"), pic = plate; // the photo arrives with its window: never an empty frame (CRITIQUE 1:16)
  const wipe = p(frame, P.wipeS + 1, D.bar, "sweep");
  const e = p(frame, P.out, D.exit, "exit");
  const t0 = P.s + 1 + D.plate * 2 - 6; // the markup starts as the picture settles
  const step = 7; // one stroke group every 7 f, in treatment order (each stroke 6-12 f)
  const startOf = (order: number) => t0 + order * step;
  const after = frame > P.wipeS + D.bar;
  const op = after ? lerp(1, 0.35, p(frame, P.wipeS + D.bar, 12, "arrive")) : 1;
  const img = (src: string, style: React.CSSProperties) => (
    <Img src={staticFile(src)} style={{ position: "absolute", maxWidth: "none", width: iw * k * drift, height: ih * k * drift,
      left: B.w / 2 - (crop.x * iw * k + B.w / 2) * drift, top: B.h / 2 - (crop.y * ih * k + B.h / 2) * drift, ...style }} />
  );
  return (
    <AbsoluteFill style={{ opacity: 1 - e }}>
      {/* STANDARD SkinCard window (components/SkinCard.tsx, 965984d): Markup glass(30), a 10 px frame, the photo in a 22-radius window */}
      <div style={{ ...glass(30), left: B.x - 10, top: B.y - 10, width: B.w + 20, height: B.h + 20, opacity: plate }} />
      <div style={{ position: "absolute", left: B.x, top: B.y, width: B.w, height: B.h, borderRadius: 22, overflow: "hidden", opacity: plate }}>
        <div style={{ position: "absolute", inset: 0, opacity: pic }}>
          {img(P.before, {})}
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: B.w * wipe, overflow: "hidden" }}>{img(P.after, {})}</div>
        </div>
      </div>
      {/* the wipe's edge is a pen line, not a handle */}
      {wipe > 0 && wipe < 1 && <svg width={W} height={1920} style={{ position: "absolute", inset: 0 }}><path d={`M${B.x + B.w * wipe},${B.y} L${B.x + B.w * wipe},${B.y + B.h}`} stroke={WHITE} strokeWidth={3} /></svg>}
      {/* the glass pill top-left inside the window: BEFORE, then AFTER once the wipe passes the middle (SkinCard Chip) */}
      {frame > P.s + 8 && <Chip at={{ x: B.x + 18, y: B.y + 34 }} text={wipe < 0.5 ? P.subs[0] : P.subs[1]} s={0.72 + 0.28 * Math.min(1, (frame - P.s - 8) / 7)} o={Math.min(1, (frame - P.s - 8) / 4)} />}
      <div style={{ position: "absolute", left: B.x - 4, top: B.y + B.h + 20, width: B.w, color: "rgba(255,255,255,.78)", font: `500 15px/1.25 ${FONT}`, textShadow: "0 1px 3px rgba(0,0,0,.45)",
        ...life(frame, P.s + 1 + D.plate) }}>Patient of Dr. Ostad. Individual results vary. Marks: where he injected (4:42 PM before, 4:55 PM right after).</div>
      {P.zones.map((z) => <HatchZone key={z.id} id={z.id} c={toCard(z.c)} rx={z.rx * k} ry={z.ry * k} rot={z.rot} s={startOf(z.order)} out={P.out} opacity={op} />)}
      {P.paths.map((q, i) => <PenStroke key={i} pts={q.pts.map(toCard)} s={startOf(q.order) + 3} out={P.out} d={10} opacity={op} />)}
      {P.marks.map((m) => <SurgeonX key={m.id} c={toCard(m.xy)} s={startOf(m.order)} out={P.out} r={8} opacity={op} />)}
      {P.labels.map((l, i) => {
        const q = toCard(l.xy);
        return <div key={i} style={{ position: "absolute", left: q.x, top: q.y, transform: "translate(-50%, -50%)", whiteSpace: "nowrap", textShadow: PRESENCE, ...disp(30, WHITE, 600),
          opacity: op === 1 ? 1 : 0.6, ...life(frame, startOf(l.order) + 4, P.out, 8) }}>{l.text}</div>;
      })}
      {/* the measured change (CRITIQUE 1:18): the shadow line under her cheekbone, before (dashed) and after (solid), both white */}
      {P.contour && frame > P.wipeS + 2 && (() => {
        const k2 = p(frame, P.wipeS + 2, 12, "sweep");
        const d = (pts: [number, number][]) => pts.map((q, i) => { const c = toCard(q); return `${i ? "L" : "M"}${c.x},${c.y}`; }).join(" ");
        return <svg width={W} height={1920} style={{ position: "absolute", inset: 0 }}>
          <path d={d(P.contour.before)} fill="none" stroke={WHITE} strokeWidth={3} strokeDasharray="8 7" opacity={0.9 * k2} />
          <path d={d(P.contour.after)} fill="none" stroke={WHITE} strokeWidth={4} pathLength={1} strokeDasharray={`${k2} 1`} />
        </svg>;
      })()}
      {P.gains.map((g, i) => (
        <React.Fragment key={i}>
          <Arrow variant="straight-pointer" from={toCard(g.from)} to={toCard(g.to)} start={P.gainS + 1} end={P.out + D.exit} bend={-0.25} />
          <div style={{ position: "absolute", left: toCard(g.labelXY).x, top: toCard(g.labelXY).y, transform: "translate(-50%, -50%)", textShadow: PRESENCE, ...disp(40, WHITE), whiteSpace: "nowrap", ...life(frame, P.gainS + 6, P.out, 8) }}>{g.label}</div>
        </React.Fragment>
      ))}
      <div style={{ position: "absolute", left: B.x, width: B.w, bottom: 1920 - B.y + 26 }}>
        {P.notes.map((n, i) => (
          <div key={i} style={{ ...card(18), position: "relative", marginTop: i ? 10 : 0, padding: "12px 18px", ...caps(21, INK), textTransform: "none", letterSpacing: "0.01em", font: `500 24px/1.25 ${FONT}`, ...life(frame, n.s + 1, P.out, 8) }}>{n.text}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

