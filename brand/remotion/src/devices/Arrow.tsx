import React from "react";
import { Easing, useCurrentFrame, useVideoConfig } from "remotion";
import tokens from "../../../kit/tokens.json";

// devices/Arrow.tsx: the designed arrow system (EXOMIND_REDO §3 "Arrows", DESIGN_PER_BEAT §4; research/ostad/style/DEVICE_LIBRARY.md §A).
// Replaces the banned dot-and-line callout. Every arrow here:
//   - is a TAPERED stroke: a filled SVG outline whose width grows from the kit `rule` (1.5 px) at the tail to 2 x `hairline`
//     (4.62 px = 0.43 % of a 1080 frame; the references' strokes are 0.3-0.5 % H) — never a constant-width line, never a dot;
//   - ends in a head from the brand shape vocabulary (kit/shapes): an open V of two tapered rules (`rule_h` hairlines), or a solid
//     triangle whose corners are rounded at the kit's rounded_rect ratio (27.9 % of the short side; shapes/CATALOGUE.md);
//   - draws on tail -> tip on the `sweep` curve (MOTION.md: line traces, peak 43 %) in the measured reference frame count, with the
//     head growing in over the last 22 % of the draw so it LANDS ON THE LAST DRAW FRAME. No overshoot: none of the 13 reference arrows
//     overshoots (DEVICE_LIBRARY §A), so the head settles in 0 frames after landing (measured: research/ostad/style/exomind/ARROW_TYPE_PROOF.md);
//   - stays alive while held: interior points breathe <= 1.5 px along the normal on a 3 s period (tail and tip stay pinned, so a tip on a
//     tracked landmark keeps 0 px error); every point is a PtSrc, so `to: follow(track, "templeL", LAYERS.keyed)` keeps the tip on him;
//   - exits along its path over the `exit` token (7 f, .4,0,1,1): the tail erases toward the tip (or the tip retracts for straight
//     pointers, the ribbon rides on and thins, the tick fades and falls 7 px). Never a cut.
// Weights and colours come from brand/kit/tokens.json. v6: default colour brand blue, ink on light imagery. Lint: the head element carries data-arrowhead (tools/lint_compositions.py).

export type Pt = { x: number; y: number };
export type PtSrc = Pt | ((frame: number) => Pt);
export type ArrowVariant =
  | "curved-callout" | "straight-pointer" | "bracket-pointer" | "route-trace" | "arc-connector" | "dashed-flow" | "light-ribbon"
  | "orbit-arc" | "marker-tick";

const px = (s: string) => parseFloat(s);
const T = tokens as any;
export const ARROW_TOKENS = {
  ink: T.color.text.$value as string, // #211b15
  accent: T.color["accent-1"].$value as string,
  blue: "#37a9e8", // brand.ts BLUES[0] / exo6 look C.blue: the Instagram blue the YT system uses (not in kit tokens.json)
  // v6 (Naim: "it's just the circle and the line. It feels very cheap"; the 1.5 -> 4.6 px stroke read as a hairline on cream):
  // a visible taper, 2 px at the tail to 8 px near the head at 1080p (= 0.74 % H), a filled barbed head sized to the stroke,
  // and a soft contact shadow + glow so the arrow sits in depth on the cream room.
  tail: 2,
  weight: 8,
  dashRatio: px(T.dimension["dotted-dash"].$value) / px(T.dimension["dotted-dot"].$value), // 2.16 x weight
  gapRatio: px(T.dimension["dotted-gap"].$value) / px(T.dimension["dotted-dot"].$value), // 2.01 x weight
  cornerRatio: 0.279, // brand/shapes/CATALOGUE.md rounded_radius_pct_short (kit/shapes/rounded_rect.svg)
};

type Head = "chevron" | "triangle" | "none";
type Exit = "tail" | "tip" | "ride" | "fade";
type Spec = { draw: number; head: Head; bend: number; dashed: boolean; exit: Exit; label: "tail" | "tip"; ref: string };
// draw = frames at 24 fps from the reference (M = frame-counted in DEVICE_LIBRARY §A)
export const ARROW_SPEC: Record<ArrowVariant, Spec> = {
  "curved-callout": { draw: 7, head: "chevron", bend: 0.32, dashed: false, exit: "tail", label: "tail", ref: "GMu3 f395-401, 7 f, open V lands last" },
  "straight-pointer": { draw: 7, head: "triangle", bend: 0, dashed: false, exit: "tip", label: "tail", ref: "WZ f926-933, 7 f, solid head pops at the end" },
  "bracket-pointer": { draw: 7, head: "chevron", bend: 0, dashed: false, exit: "tail", label: "tail", ref: "built as curved-callout timing (no corpus bracket; EXOMIND_REDO variant list)" },
  "route-trace": { draw: 27, head: "chevron", bend: 0, dashed: false, exit: "tail", label: "tip", ref: "DDOS f216-250, 27 f sweep, tail erases" },
  "arc-connector": { draw: 26, head: "triangle", bend: 0.5, dashed: true, exit: "tail", label: "tip", ref: "D_bh f1108-1140, 26 f, icon rides the end" },
  "dashed-flow": { draw: 8, head: "triangle", bend: 0.3, dashed: true, exit: "tail", label: "tail", ref: "GMu3 f460-468, 8 f, dashes reveal, head at end" },
  "light-ribbon": { draw: 28, head: "chevron", bend: 0, dashed: false, exit: "ride", label: "tip", ref: "glp1 f1100-1170, 28 f per pass, keeps travelling" },
  "orbit-arc": { draw: 9, head: "chevron", bend: 0.3, dashed: false, exit: "tail", label: "tip", ref: "DYKh5yyPxxg f1200-1264, 8-10 f, drifts with the model" },
  "marker-tick": { draw: 1, head: "triangle", bend: 0, dashed: false, exit: "fade", label: "tip", ref: "WZ f940/944, pops in 1 f" },
};
export const EXIT_F = 7; // MOTION.md `exit`
export const HEAD_K = 4.6; // head length = 4.6 x weight (37 px at 8 px)
export const BREATHE_PX = 1.5, BREATHE_PERIOD_F = 72;

const sweep = Easing.bezier(0.6, 0, 0.25, 1);
const exitC = Easing.bezier(0.4, 0, 1, 1);
const arrive = Easing.bezier(0.22, 1, 0.36, 1);
const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const at = (p: PtSrc, f: number): Pt => (typeof p === "function" ? p(f) : p);
const add = (a: Pt, b: Pt, k = 1): Pt => ({ x: a.x + b.x * k, y: a.y + b.y * k });
const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const len = (a: Pt) => Math.hypot(a.x, a.y);
const unit = (a: Pt): Pt => { const l = len(a) || 1; return { x: a.x / l, y: a.y / l }; };
const perp = (a: Pt): Pt => ({ x: -a.y, y: a.x }); // +90 deg in screen space
const lerp = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

// ------------------------------------------------------------------------------------------------ centre lines
type Line = { pts: Pt[]; cum: number[]; L: number };
const mkLine = (pts: Pt[]): Line => {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + len(sub(pts[i], pts[i - 1])));
  return { pts, cum, L: cum[cum.length - 1] || 1e-6 };
};
const pointAt = (ln: Line, d: number): { p: Pt; t: Pt } => {
  const D = cl(d, 0, ln.L);
  let i = 1;
  while (i < ln.cum.length - 1 && ln.cum[i] < D) i++;
  const a = ln.pts[i - 1], b = ln.pts[i], seg = ln.cum[i] - ln.cum[i - 1] || 1e-6;
  return { p: lerp(a, b, (D - ln.cum[i - 1]) / seg), t: unit(sub(b, a)) };
};
// the part of a line between arc lengths a..b, as points with their arc length
const slice = (ln: Line, a: number, b: number): { p: Pt; d: number }[] => {
  if (b - a < 0.01) return [];
  const out = [{ p: pointAt(ln, a).p, d: a }];
  for (let i = 0; i < ln.pts.length; i++) if (ln.cum[i] > a && ln.cum[i] < b) out.push({ p: ln.pts[i], d: ln.cum[i] });
  out.push({ p: pointAt(ln, b).p, d: b });
  return out;
};
const quad = (a: Pt, b: Pt, bend: number, n = 72): Pt[] => {
  const c = add(lerp(a, b, 0.5), perp(unit(sub(b, a))), -bend * len(sub(b, a)));
  return Array.from({ length: n + 1 }, (_, i) => { const u = i / n; return add(add({ x: a.x * (1 - u) ** 2, y: a.y * (1 - u) ** 2 }, c, 2 * u * (1 - u)), b, u * u); });
};
const catmull = (P: Pt[], closed = false, n = 24): Pt[] => {
  const k = P.length, out: Pt[] = [];
  const g = (i: number) => (closed ? P[(i + k) % k] : P[cl(i, 0, k - 1)]);
  const segs = closed ? k : k - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(closed ? P[0] : P[k - 1]);
  return out;
};
// straight legs with rounded joins (route-trace: one leg per named stop)
const legs = (P: Pt[], r = 22): Pt[] => {
  const out: Pt[] = [P[0]];
  for (let i = 1; i < P.length - 1; i++) {
    const a = P[i - 1], b = P[i], c = P[i + 1];
    const rr = Math.min(r, len(sub(b, a)) / 2, len(sub(c, b)) / 2);
    const p = add(b, unit(sub(a, b)), rr), q = add(b, unit(sub(c, b)), rr);
    for (let j = 0; j <= 8; j++) { const u = j / 8; out.push(add(add({ x: p.x * (1 - u) ** 2, y: p.y * (1 - u) ** 2 }, b, 2 * u * (1 - u)), q, u * u)); }
  }
  out.push(P[P.length - 1]);
  return out;
};
// ellipse arc around c ending at `to`, sweeping `turn` of a circle; ratio = ry / rx (a ring seen at a tilt)
const orbit = (c: Pt, to: Pt, turn: number, ratio = 0.42, rot = 0, n = 72): Pt[] => {
  const dx = to.x - c.x, dy = (to.y - c.y) / ratio, rx = Math.hypot(dx, dy), end = Math.atan2(dy, dx) + rot;
  return Array.from({ length: n + 1 }, (_, i) => { const a = end - turn * 2 * Math.PI * (1 - i / n); return { x: c.x + rx * Math.cos(a), y: c.y + rx * ratio * Math.sin(a) }; });
};

// ------------------------------------------------------------------------------------------------ outlines (filled, tapered)
const f2 = (v: number) => v.toFixed(2);
// one tapered stroke as a closed outline with round caps; w(d) gives the full width at arc length d
const outline = (S: { p: Pt; d: number }[], w: (d: number) => number): string => {
  if (S.length < 2) return "";
  const n = S.length, Lf: Pt[] = [], Rt: Pt[] = [];
  const tan = (i: number) => unit(sub(S[Math.min(i + 1, n - 1)].p, S[Math.max(i - 1, 0)].p));
  for (let i = 0; i < n; i++) { const no = perp(tan(i)), h = w(S[i].d) / 2; Lf.push(add(S[i].p, no, h)); Rt.push(add(S[i].p, no, -h)); }
  const cap = (c: Pt, t: Pt, h: number, fwd: boolean): Pt[] => {
    const out: Pt[] = [], no = perp(t);
    for (let k = 1; k < 6; k++) { const a = (k / 6) * Math.PI; const along = Math.sin(a) * h * (fwd ? 1 : -1); const side = Math.cos(a) * h * (fwd ? 1 : -1); out.push(add(add(c, t, along), no, side)); }
    return out;
  };
  const endCap = cap(S[n - 1].p, tan(n - 1), w(S[n - 1].d) / 2, true);
  const startCap = cap(S[0].p, tan(0), w(S[0].d) / 2, false);
  const pts = [...Lf, ...endCap, ...Rt.reverse(), ...startCap];
  return "M" + pts.map((p) => `${f2(p.x)} ${f2(p.y)}`).join("L") + "Z";
};
// open V: two tapered rules meeting at the tip
const chevronD = (tip: Pt, t: Pt, size: number, W: number, tail: number): string => {
  const arm = (sgn: number) => {
    const a = (sgn * 28 * Math.PI) / 180, dir = { x: -t.x * Math.cos(a) + t.y * Math.sin(a), y: -t.x * Math.sin(a) - t.y * Math.cos(a) };
    const S = Array.from({ length: 6 }, (_, i) => ({ p: add(tip, unit(dir), (size * i) / 5), d: (size * i) / 5 }));
    return outline(S, (d) => W * 0.95 + (tail - W * 0.95) * (d / size));
  };
  return arm(1) + arm(-1);
};
// filled barbed head (v6): tip, two swept wings, a concave notch on the shaft line; reads as a designed arrowhead at any weight
const barbD = (tip: Pt, t: Pt, size: number): string => {
  const no = perp(t), back = add(tip, t, -size), notch = add(tip, t, -size * 0.66), hw = size * 0.52;
  const w1 = add(back, no, hw), w2 = add(back, no, -hw);
  const c1 = add(add(tip, t, -size * 0.42), no, hw * 0.34), c2 = add(add(tip, t, -size * 0.42), no, -hw * 0.34);
  const k1 = add(lerp(w1, notch, 0.5), t, size * 0.08), k2 = add(lerp(w2, notch, 0.5), t, size * 0.08);
  return `M${f2(tip.x)} ${f2(tip.y)}Q${f2(c1.x)} ${f2(c1.y)} ${f2(w1.x)} ${f2(w1.y)}Q${f2(k1.x)} ${f2(k1.y)} ${f2(notch.x)} ${f2(notch.y)}` +
    `Q${f2(k2.x)} ${f2(k2.y)} ${f2(w2.x)} ${f2(w2.y)}Q${f2(c2.x)} ${f2(c2.y)} ${f2(tip.x)} ${f2(tip.y)}Z`;
};
// solid triangle, corners rounded at the kit's rounded_rect ratio
const triangleD = (tip: Pt, t: Pt, size: number): string => {
  const no = perp(t), base = add(tip, t, -size), hw = size * 0.46;
  const P = [tip, add(base, no, hw), add(base, no, -hw)];
  const r = ARROW_TOKENS.cornerRatio * Math.min(size, 2 * hw) * 0.5;
  let d = "";
  for (let i = 0; i < 3; i++) {
    const a = P[(i + 2) % 3], b = P[i], c = P[(i + 1) % 3];
    const p = add(b, unit(sub(a, b)), r), q = add(b, unit(sub(c, b)), r);
    d += `${i === 0 ? "M" : "L"}${f2(p.x)} ${f2(p.y)}Q${f2(b.x)} ${f2(b.y)} ${f2(q.x)} ${f2(q.y)}`;
  }
  return d + "Z";
};
// dashes of a tapered line between arc lengths a..b, anchored at arc length 0 so they stay put while the line draws or erases
const dashes = (ln: Line, a: number, b: number, w: (d: number) => number, dash: number, gap: number): string => {
  let d = "";
  for (let s = 0; s < b; s += dash + gap) {
    const lo = Math.max(s, a), hi = Math.min(s + dash, b);
    if (hi - lo > 0.6) d += outline(slice(ln, lo, hi), w);
  }
  return d;
};

// ------------------------------------------------------------------------------------------------ the component
export const Arrow: React.FC<{
  variant: ArrowVariant; from: PtSrc; to: PtSrc; via?: PtSrc[]; start: number; end: number; color?: string; weight?: number;
  bend?: number; label?: React.ReactNode; shadow?: boolean;
}> = ({ variant, from, to, via = [], start, end, color = ARROW_TOKENS.blue, weight = ARROW_TOKENS.weight, bend, label, shadow = true }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (frame < start || frame > end) return null;
  const S = ARROW_SPEC[variant];
  const k24 = fps / 24;
  const D = Math.max(1, Math.round(S.draw * k24)), X = Math.round(EXIT_F * k24);
  const t = frame - start, land = start + D;
  const draw = variant === "marker-tick" ? (t >= D ? 1 : 0) : sweep(cl(t / D));
  const q = exitC(cl((frame - (end - X)) / X)); // exit progress 0..1 over the last 7 f
  const held = Math.max(0, frame - land);
  const breathe = BREATHE_PX * Math.sin((2 * Math.PI * held) / BREATHE_PERIOD_F) * cl(held / 6);
  const A = at(from, frame), B = at(to, frame), V = via.map((v) => at(v, frame));
  const bnd = bend ?? S.bend;
  const W = weight, tailW = Math.min(ARROW_TOKENS.tail, W);
  const hsize = W * HEAD_K;
  const fx = shadow ? `drop-shadow(0 ${f2(W * 0.4)}px ${f2(W * 0.7)}px rgba(32,37,50,.26)) drop-shadow(0 0 ${f2(W * 1.4)}px ${color}40)` : undefined;
  const parts: React.ReactNode[] = [];
  const id = `arw-${variant}-${start}-${Math.round(A.x)}-${Math.round(A.y)}`;

  // centre line for this frame, with the hold breathe on interior points (ends pinned)
  let pts: Pt[];
  if (variant === "route-trace") pts = legs([A, ...V, B]);
  else if (variant === "orbit-arc") pts = orbit(A, B, bnd, 0.42, (4 * Math.PI) / 180 * Math.sin((2 * Math.PI * held) / 120) * cl(held / 12));
  else if (variant === "light-ribbon") pts = catmull([A, ...V, B], true);
  else if (V.length) pts = catmull([A, ...V, B]);
  else pts = quad(A, B, bnd);
  if (variant !== "light-ribbon" && variant !== "orbit-arc" && variant !== "marker-tick" && breathe !== 0) {
    const n = pts.length - 1;
    pts = pts.map((p, i) => (i === 0 || i === n ? p : add(p, perp(unit(sub(pts[Math.min(i + 1, n)], pts[i - 1]))), breathe * Math.sin((Math.PI * i) / n))));
  }

  // ---- marker-tick: a small solid triangle that pops in 1 f, bobs 1 px, fades and falls on exit
  if (variant === "marker-tick") {
    const dir = unit(sub(B, A));
    const bob = Math.sin((2 * Math.PI * held) / BREATHE_PERIOD_F) * cl(held / 6);
    const tip = add(B, dir, bob + q * 7);
    parts.push(<path key="h" data-arrowhead d={triangleD(tip, dir, hsize * 0.7)} fill={color} opacity={draw * (1 - q)} />);
    return <Frame w={width} h={height} fx={fx}>{parts}{label ? <Label at={add(B, dir, -hsize * 0.7 - 10)} t={dir} side="back" o={draw * (1 - q)}>{label}</Label> : null}</Frame>;
  }

  // ---- bracket-pointer: a "]" that closes from both ends toward its middle (first 45 % of the draw), then the pointer shaft
  if (variant === "bracket-pointer") {
    const dir = unit(sub(B, A)), no = perp(dir);
    const e1 = V[0] ?? add(A, no, 64), e2 = V[1] ?? add(A, no, -64), depth = 26;
    const mid = add(lerp(e1, e2, 0.5), dir, depth);
    const pB = Math.min(1, draw / 0.45), pS = cl((draw - 0.45) / 0.55);
    const wArm = (Ln: number) => (d: number) => W * 0.45 + W * 0.4 * cl(d / Ln);
    const exitA = S.exit === "tail" ? q : 0;
    for (const e of [e1, e2]) {
      const ln = mkLine([e, add(e, dir, depth), mid]);
      const vis = ln.L * pB;
      const a = ln.L * Math.min(1, exitA * 2);
      if (vis - a > 0.5) parts.push(<path key={`b${e.x}${e.y}`} d={outline(slice(ln, a, vis), wArm(ln.L))} fill={color} />);
    }
    const shaft = mkLine(quad(mid, B, 0));
    const tipD = shaft.L * pS, a0 = shaft.L * cl(exitA * 2 - 1);
    const hk = arrive(cl((pS - 0.6) / 0.4)) * (1 - cl((q - 0.6) / 0.4));
    if (pS > 0 && tipD - a0 > 0.5) parts.push(<path key="s" d={outline(slice(shaft, a0, Math.max(a0, tipD - W * 0.6 * hk)), (d) => W * 0.8 + (W - W * 0.8) * (d / shaft.L))} fill={color} />);
    if (hk > 0) { const P = pointAt(shaft, tipD); parts.push(<path key="h" data-arrowhead d={barbD(P.p, P.t, hsize * hk)} fill={color} />); }
    return <Frame w={width} h={height} fx={fx}>{parts}{label ? <Label at={A} t={dir} side="back" o={arrive(cl(t / 14)) * (1 - q)}>{label}</Label> : null}</Frame>;
  }

  const ln = mkLine(pts);
  const L = ln.L;

  // ---- light-ribbon: a glowing tapered window that travels round a closed loop and never stops while held
  if (variant === "light-ribbon") {
    const win = 0.45 * L;
    const travel = held * (L / 96) * cl(held / 10); // one loop per 4 s once drawn, eased in over 10 f
    const head = 0.55 * L * draw + travel + q * 0.25 * L;
    const length = Math.min(win, head) * (1 - q);
    const tail = head - length;
    const wR = (d: number) => { const u = cl((d - tail) / Math.max(1, length)); return W * 0.25 + W * 2.8 * Math.sin(Math.PI * Math.pow(u, 1.4)) ** 1.2 * (u < 0.96 ? 1 : 0.6); };
    const segs: { a: number; b: number; off: number }[] = [];
    const a = ((tail % L) + L) % L, b = a + length;
    if (b <= L) segs.push({ a, b, off: tail - a }); else { segs.push({ a, b: L, off: tail - a }); segs.push({ a: 0, b: b - L, off: tail - a + L }); }
    let dpath = "";
    for (const s of segs) dpath += outline(slice(ln, s.a, s.b), (d) => wR(d + s.off));
    const P = pointAt(ln, ((head % L) + L) % L), Pt0 = pointAt(ln, a);
    parts.push(
      <defs key="d"><linearGradient id={id} gradientUnits="userSpaceOnUse" x1={Pt0.p.x} y1={Pt0.p.y} x2={P.p.x} y2={P.p.y}>
        <stop offset="0" stopColor={color} stopOpacity={0} /><stop offset="0.55" stopColor={color} stopOpacity={0.55} /><stop offset="1" stopColor={color} stopOpacity={1} />
      </linearGradient></defs>,
      <g key="g" style={{ filter: `drop-shadow(0 0 ${W * 2.5}px ${color}99)` }} opacity={1 - q}>
        <path d={dpath} fill={`url(#${id})`} />
        {length > hsize ? <path data-arrowhead d={barbD(P.p, P.t, hsize * 0.9)} fill={color} /> : null}
      </g>,
    );
    return <Frame w={width} h={height} fx={fx}>{parts}</Frame>;
  }

  // ---- every other variant: tapered shaft (solid or dashed) + head
  const tipD = L * draw;
  let a = 0, b = tipD;
  if (S.exit === "tail") a = L * q; // the tail erases toward the tip
  if (S.exit === "tip") b = tipD * (1 - q); // the tip retracts toward the tail
  const hk = arrive(cl((draw - 0.78) / 0.22)) * (1 - cl((S.exit === "tail" ? q - 0.7 : q - 0.85) / 0.3)); // head lands on the last draw frame
  const headLen = S.head === "triangle" ? hsize * 0.8 : hsize * 0.6; // the shaft ends inside the barb's notch
  const wS = (d: number) => tailW + (W - tailW) * (1 - (1 - cl(d / (0.7 * L))) ** 2);
  const shaftEnd = Math.max(a, b - headLen * hk);
  if (variant === "orbit-arc") {
    // the tilted ring the arc rides on: kit dotted-path proportions at rule weight
    const ring = mkLine(orbit(A, B, 1, 0.42, 0, 120));
    parts.push(<path key="r" d={dashes(ring, 0, ring.L * Math.min(1, draw), () => W * 0.42, W * 1.6, W * 1.5)} fill={color} opacity={0.5 * (1 - q)} />);
  }
  if (shaftEnd - a > 0.5) {
    parts.push(
      <path key="s" d={S.dashed ? dashes(ln, a, shaftEnd, (d) => Math.max(W * 0.72, wS(d)), W * ARROW_TOKENS.dashRatio * 1.15, W * ARROW_TOKENS.gapRatio * 0.95) : outline(slice(ln, a, shaftEnd), wS)} fill={color} />,
    );
  }
  if (hk > 0.001 && S.head !== "none") {
    const P = pointAt(ln, b), Tb = unit(sub(P.p, pointAt(ln, Math.max(0, b - hsize)).p));
    parts.push(
      <path key="h" data-arrowhead d={S.head === "triangle" ? triangleD(P.p, Tb, hsize * 0.8 * hk) : barbD(P.p, Tb, hsize * hk)} fill={color} />,
    );
  }
  let lab: React.ReactNode = null;
  if (label) {
    if (S.label === "tip") { const P = pointAt(ln, b); lab = <Label at={add(P.p, perp(P.t), -22)} t={P.t} side="side" o={cl(draw * 4) * (1 - q)}>{label}</Label>; }
    else { const P = pointAt(ln, 0); lab = <Label at={P.p} t={P.t} side="back" o={arrive(cl(t / 14)) * (1 - q)}>{label}</Label>; }
  }
  return <Frame w={width} h={height} fx={fx}>{parts}{lab}</Frame>;
};

const Frame: React.FC<{ w: number; h: number; fx?: string; children: React.ReactNode }> = ({ w, h, fx, children }) => {
  const svg: React.ReactNode[] = [], html: React.ReactNode[] = [];
  React.Children.forEach(children, (c) => { if (React.isValidElement(c) && c.type === Label) html.push(c); else if (c) svg.push(c); });
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", inset: 0, overflow: "visible", filter: fx }}>{svg}</svg>
      {html}
    </div>
  );
};

// a label anchored at the tail (placed behind it, against the direction of travel) or riding beside the tip
const Label: React.FC<{ at: Pt; t: Pt; side: "back" | "side"; o: number; children: React.ReactNode }> = ({ at: p, t, side, o, children }) => {
  const dir = side === "back" ? { x: -t.x, y: -t.y } : perp(t);
  const tx = dir.x > 0.35 ? "0%" : dir.x < -0.35 ? "-100%" : "-50%";
  const ty = dir.y > 0.35 ? "0%" : dir.y < -0.35 ? "-100%" : "-50%";
  const g = 14;
  return (
    <div style={{ position: "absolute", left: p.x + dir.x * g, top: p.y + dir.y * g, transform: `translate(${tx}, ${ty})`, opacity: o, whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
};
