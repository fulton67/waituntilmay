// FAST LANE technical visuals (round 2, 2026-11-25): every argument beat explains its mechanism instead of restating it as a text card
// (Naim on round 1: "no animations, images ... it doesn't feel technical"). Same calm glass, same named springs, same palette tokens.
//   Loupe          a round glass window on a tissue render (still, or a clip that freezes on its last frame), with an SVG overlay
//   Mechanism      full-frame cutaway: the big loupe + stage rows lit on his words + a month counter that chases its target
//   FiberCompare   two drawn panels: organised (woven) collagen vs scar collagen (dense, parallel), fibres drawn on by springs
//   RiskRows       a loupe + rows lit on each named risk, with a nodule drawn into the tissue on its word
//   SessionStack   a drawn cross-section: particles laid per session, the fibrous layer thickens (measured bracket), scars, nodule, halo
//   ContourCompare two face outlines: diffuse rounding vs volume placed at three points (cheekbone, jaw angle, chin), ink arrows
// Generic tissue renders only (no face, no product, no result): brand/edits/flora-anatomy/sculptra (QA.md). Each is tagged "Illustration".
import React from "react";
import { Freeze, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { chase, drift, sp, type SpringName } from "./spring";
import { FONT, glass, INK, MUTED, W, WHITE } from "./kit";

export const SAND = "#bf8662", DEEP = "#89644f", SURF = "#c3bdbb", CREAM = "#f2efed";
const c01 = (v: number) => Math.max(0, Math.min(1, v));
// on at s (named spring), off at out (snap): 0..1
const on = (f: number, s: number, out: number, spring: SpringName) => c01(sp(f, s, spring)) * (1 - c01(sp(f, out, "snap")));
// deterministic hash in [0, 1) (integer mix; renders must repeat)
const hash = (i: number) => {
  let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
};
// a wave from smooth quadratic segments (no trig): half-period h, amplitude a
const wave = (x0: number, x1: number, y: number, h: number, a: number) => {
  let d = `M${x0},${y} Q${x0 + h / 2},${y - a} ${x0 + h},${y}`;
  for (let x = x0 + 2 * h; x <= x1 + h; x += h) d += ` T${x},${y}`;
  return d;
};

const Tag: React.FC<{ text: string; style?: React.CSSProperties }> = ({ text, style }) => (
  <div style={{ position: "absolute", font: `500 17px/1 ${FONT}`, letterSpacing: "0.13em", textTransform: "uppercase", color: MUTED, ...style }}>{text}</div>
);

// ------------------------------------------------------------------ Loupe
type Clip = { src: string; from: number; len: number };
const ClipIn: React.FC<{ c: Clip; size: number }> = ({ c, size }) => {
  const f = useCurrentFrame();
  const v = <OffthreadVideo src={staticFile(c.src)} muted toneMapped={false} style={{ width: size, height: size }} />;
  if (f < c.from) return null;
  if (f >= c.from + c.len - 1) return <Freeze frame={c.len - 1}>{v}</Freeze>;
  return <Sequence from={c.from} layout="none">{v}</Sequence>;
};

export const Loupe: React.FC<{
  s: number; out: number; spring: SpringName; cx: number; cy: number; d: number; src: string; src2?: { src: string; at: number };
  clip?: Clip; zoom?: number; fy?: number; seed?: number; label?: string; tag?: string; children?: (f: number) => React.ReactNode;
}> = ({ s, out, spring, cx, cy, d, src, src2, clip, zoom = 1.55, fy = 0.43, seed = 4, label, tag = "Illustration", children }) => {
  const f = useCurrentFrame();
  if (f < s || f > out + 16) return null;
  const a = sp(f, s, spring), v = on(f, s, out, spring);
  const sc = 0.86 + 0.14 * a + drift(f - s, 0.006, seed, 32);
  const push = 1 + 0.035 * c01(sp(f, s, "float")) + drift(f - s, 0.008, seed + 3, 32); // the tissue never sits still
  const iw = d * zoom * push;
  const imgPos: React.CSSProperties = { position: "absolute", width: iw, height: iw, left: (d - iw) / 2, top: d / 2 - fy * iw };
  const k2 = src2 ? c01(sp(f, src2.at, "float")) : 0;
  return (
    <div style={{ position: "absolute", left: cx - d / 2, top: cy - d / 2 + drift(f - s, 3, seed + 9, 32), width: d, height: d, opacity: v, transform: `scale(${sc})` }}>
      <div style={{ position: "absolute", inset: -14, borderRadius: "50%", ...glass(f, seed, d), boxShadow: "inset 0 1px 0 rgba(255,255,255,.95), 0 22px 60px rgba(8,12,22,.28), 0 2px 8px rgba(8,12,22,.12)" }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden", background: WHITE }}>
        <Img src={staticFile(src)} style={imgPos} />
        {src2 && <Img src={staticFile(src2.src)} style={{ ...imgPos, opacity: k2 }} />}
        {clip && <div style={imgPos}><ClipIn c={clip} size={iw} /></div>}
        {children && <svg width={d} height={d} viewBox={`0 0 ${d} ${d}`} style={{ position: "absolute", inset: 0 }}>{children(f)}</svg>}
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.9), inset 0 -18px 40px rgba(8,12,22,.10)" }} />
        {tag && <Tag text={tag} style={{ left: 0, right: 0, top: d * 0.86, textAlign: "center", fontSize: Math.max(12, d * 0.04) }} />}
      </div>
      {label && <div style={{ position: "absolute", left: -60, right: -60, top: d + 20, textAlign: "center" }}>
        <span style={{ ...glass(f, seed + 2, 999), position: "relative", display: "inline-block", padding: "10px 18px 9px", font: `600 26px/1 ${FONT}` }}>{label}</span>
      </div>}
    </div>
  );
};

// ------------------------------------------------------------------ rows lit on his words
export type Row = { text: string; at: number };
export const Rows: React.FC<{ f: number; rows: Row[]; size?: number; gap?: number; num?: boolean }> = ({ f, rows, size = 34, gap = 18, num = true }) => (
  <div>
    {rows.map((r, i) => {
      const lit = c01(sp(f, r.at, "settle")), pop = sp(f, r.at, "snap");
      return (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, marginTop: i ? gap : 0, opacity: 0.3 + 0.7 * lit, transform: `translateX(${(1 - c01(pop)) * 14}px)` }}>
          {num && <span style={{ flex: "0 0 auto", width: 40, height: 40, borderRadius: 999, border: `2px solid ${lit > 0.5 ? SAND : SURF}`,
            font: `600 20px/36px ${FONT}`, textAlign: "center", color: INK }}>{i + 1}</span>}
          <span style={{ font: `600 ${size}px/1.15 ${FONT}`, color: INK }}>{r.text}</span>
        </div>
      );
    })}
  </div>
);

// ------------------------------------------------------------------ Mechanism (full-frame cutaway)
export const Mechanism: React.FC<{
  s: number; out: number; spring: SpringName; caps: string; title: string; rows: Row[]; still: string; clip: Clip;
  months?: [number, number][]; monthsNote?: string;
}> = ({ s, out, spring, caps, title, rows, still, clip, months, monthsNote }) => {
  const f = useCurrentFrame();
  if (f < s || f > out + 20) return null;
  const r = 1500 * c01(sp(f, s, spring)) * (1 - c01(sp(f, out, "heavy"))); // a round wipe opens from the loupe and closes back into it
  const CY = 880, D = 800;
  const m = months ? chase(f, months, "float") : 0;
  return (
    <div style={{ position: "absolute", inset: 0, clipPath: `circle(${r.toFixed(1)}px at 540px ${CY}px)` }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(70% 50% at ${50 + drift(f - s, 6, 31, 32)}% 40%, ${WHITE} 0%, ${CREAM} 70%)` }} />
      <div style={{ position: "absolute", left: 98, right: 98, top: 270 + drift(f - s, 3, 33, 32) }}>
        <div style={{ font: `500 24px/1 ${FONT}`, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED }}>{caps}</div>
        <div style={{ font: `600 62px/1.05 ${FONT}`, letterSpacing: "-0.015em", color: INK, marginTop: 14 }}>{title}</div>
      </div>
      <Loupe s={s} out={out + 30} spring="heavy" cx={540} cy={CY} d={D} src={still} clip={clip} seed={41} tag="" />
      {months && <div style={{ ...glass(f, 43, 999), left: 540 + D / 2 - 250, top: CY + D / 2 - 70, padding: "14px 22px 12px", opacity: c01(sp(f, s + 6, "settle")) }}>
        <div style={{ font: `500 16px/1 ${FONT}`, letterSpacing: "0.13em", textTransform: "uppercase", color: MUTED }}>{monthsNote ?? "Time"}</div>
        <div style={{ font: `600 40px/1.1 ${FONT}`, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>Month {Math.max(0, m).toFixed(1)}</div>
      </div>}
      <div style={{ position: "absolute", left: 98, right: 98, top: CY + D / 2 + 70 + drift(f - s, 2, 35, 32) }}><Rows f={f} rows={rows} /></div>
      <Tag text="Illustration" style={{ left: 98, top: CY - D / 2 - 10 }} />
    </div>
  );
};

// ------------------------------------------------------------------ chest-band panel (glass) that holds a drawing
const Panel: React.FC<{ f: number; s: number; out: number; spring: SpringName; x: number; y: number; w: number; h: number; seed: number; children: React.ReactNode }> = ({ f, s, out, spring, x, y, w, h, seed, children }) => {
  const a = sp(f, s, spring), v = on(f, s, out, spring);
  return (
    <div style={{ ...glass(f, seed, 28), left: x, top: y + (1 - a) * 26 + drift(f - s, 3, seed, 32), width: w, height: h, opacity: v }}>{children}</div>
  );
};

// ------------------------------------------------------------------ FiberCompare: woven vs scar collagen
const Woven: React.FC<{ f: number; s: number; w: number; h: number }> = ({ f, s, w, h }) => {
  const paths: React.ReactNode[] = [];
  for (let i = 0; i < 9; i++) {
    const y = 18 + (i * (h - 36)) / 8;
    const p = c01(sp(f, s + i * 2, "settle"));
    paths.push(<path key={`a${i}`} d={wave(-20, w + 20, y, 26 + (i % 3) * 6, 9 + (i % 2) * 5)} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p}
      fill="none" stroke={i % 2 ? SAND : DEEP} strokeWidth={4} strokeLinecap="round" transform={`rotate(${i % 2 ? 34 : -34} ${w / 2} ${h / 2})`} opacity={0.85} />);
  }
  return <>{paths}</>;
};
const Scar: React.FC<{ f: number; s: number; w: number; h: number }> = ({ f, s, w, h }) => {
  const paths: React.ReactNode[] = [];
  for (let i = 0; i < 16; i++) {
    const y = 16 + (i * (h - 32)) / 15;
    const p = c01(sp(f, s + i, "snap"));
    paths.push(<path key={i} d={wave(-10, w + 10, y, 60, 1.2)} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} fill="none" stroke={DEEP} strokeWidth={5} strokeLinecap="round" />);
  }
  return <>{paths}</>;
};
export const FiberCompare: React.FC<{ s: number; out: number; spring: SpringName; left: { caps: string; title: string; at: number }; right: { caps: string; title: string; at: number }; top?: number }> = ({ s, out, spring, left, right, top = 1172 }) => {
  const f = useCurrentFrame();
  if (f < s || f > out + 16) return null;
  const PW = 430, PH = 392, IW = PW - 40, IH = 210;
  const one = (side: typeof left, x: number, kind: "w" | "s", seed: number) => (
    <Panel f={f} s={side.at} out={out} spring={spring} x={x} y={top} w={PW} h={PH} seed={seed}>
      <div style={{ position: "absolute", left: 20, top: 20, width: IW, height: IH, borderRadius: 18, overflow: "hidden", background: "rgba(242,239,237,.85)", boxShadow: "inset 0 0 0 1px rgba(195,189,187,.7)" }}>
        <svg width={IW} height={IH} style={{ transform: `translate(${drift(f - s, 4, seed + 1, 32)}px, ${drift(f - s, 3, seed + 2, 32)}px) scale(1.06)` }}>
          {kind === "w" ? <Woven f={f} s={side.at + 4} w={IW} h={IH} /> : <Scar f={f} s={side.at + 4} w={IW} h={IH} />}
        </svg>
      </div>
      <div style={{ position: "absolute", left: 24, top: IH + 40 }}>
        <div style={{ font: `500 17px/1 ${FONT}`, letterSpacing: "0.13em", textTransform: "uppercase", color: MUTED }}>{side.caps}</div>
        <div style={{ font: `600 36px/1.1 ${FONT}`, marginTop: 10 }}>{side.title}</div>
      </div>
    </Panel>
  );
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {one(left, 98, "w", 51)}
      {one(right, W - 98 - PW, "s", 57)}
      <Tag text="Illustration" style={{ right: 98 + 22, top: top + PH - 30 + (1 - c01(sp(f, right.at, spring))) * 26 + drift(f - right.at, 3, 57, 32), opacity: on(f, right.at, out, spring) * 0.9 }} />
    </div>
  );
};

// ------------------------------------------------------------------ RiskRows: loupe + a nodule drawn on its word + rows lit per risk
export const RiskRows: React.FC<{ s: number; out: number; spring: SpringName; still: string; caps: string; rows: Row[]; nodule: number; top?: number }> = ({ s, out, spring, still, caps, rows, nodule, top = 1172 }) => {
  const f = useCurrentFrame();
  if (f < s || f > out + 16) return null;
  const D = 360;
  const n = c01(sp(f, nodule, "heavy"));
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Loupe s={s} out={out} spring={spring} cx={98 + D / 2} cy={top + D / 2 + 10} d={D} src={still} seed={61}>
        {(ff) => {
          const rx = 46 * n + drift(ff - nodule, 1.5, 62, 32) * n, ry = 30 * n;
          const cx = D * 0.56, cy = D * 0.6;
          return (
            <g opacity={n}>
              <ellipse cx={cx} cy={cy} rx={rx + 22 * n} ry={ry + 16 * n} fill="rgba(191,134,98,.22)" />
              {[0, 1, 2].map((k) => <ellipse key={k} cx={cx} cy={cy} rx={rx - k * 7} ry={ry - k * 5} fill="none" stroke={DEEP} strokeWidth={3 - k * 0.6} />)}
              {Array.from({ length: 14 }, (_, i) => {
                const g = c01(sp(ff, nodule + 6 + i, "snap"));
                return <circle key={i} cx={cx + (hash(i * 2 + 1) - 0.5) * rx * 1.3} cy={cy + (hash(i * 2 + 2) - 0.5) * ry * 1.2} r={3.4 * g} fill={WHITE} stroke={DEEP} strokeWidth={1} />; // lint-ok: PLLA grains inside the nodule, not a callout
              })}
            </g>
          );
        }}
      </Loupe>
      <Panel f={f} s={s + 4} out={out} spring={spring} x={98 + D + 40} y={top} w={W - 98 - (98 + D + 40)} h={380} seed={67}>
        <div style={{ position: "absolute", left: 26, top: 26, right: 22 }}>
          <div style={{ font: `500 17px/1.3 ${FONT}`, letterSpacing: "0.13em", textTransform: "uppercase", color: MUTED, marginBottom: 20 }}>{caps}</div>
          <Rows f={f} rows={rows} size={30} gap={16} />
        </div>
      </Panel>
    </div>
  );
};

// ------------------------------------------------------------------ SessionStack: a drawn cross-section over repeated sessions
export const SessionStack: React.FC<{
  s: number; out: number; spring: SpringName; caps: string; sessions: number[]; scar: number; nodule: number; halo: number; later: number; top?: number;
}> = ({ s, out, spring, caps, sessions, scar, nodule, halo, later, top = 1160 }) => {
  const f = useCurrentFrame();
  if (f < s || f > out + 16) return null;
  const PW = W - 196, PH = 404, SW = PW - 40, SH = 300;
  const EPI = 30, DERM = 58, BAND = 196, FAT = 236; // layer tops in the drawing
  const T = chase(f, [[0, 0], ...sessions.map((t, i): [number, number] => [t + 10, 16 + 12 * i])], "heavy"); // fibrous layer thickness, px
  const sc = c01(sp(f, scar, "heavy")); // woven -> dense
  const nd = c01(sp(f, nodule, "heavy")), hl = c01(sp(f, halo, "float")), lt = c01(sp(f, later, "settle"));
  const fib: React.ReactNode[] = [];
  const nF = 7 + Math.round(5 * sc);
  for (let i = 0; i < nF; i++) {
    const y = BAND - T * (i + 0.5) / nF;
    fib.push(<path key={i} d={wave(-10, SW + 10, y, 34 + 26 * sc, 5 * (1 - sc) + 0.8)} fill="none" stroke={sc > 0.5 ? DEEP : SAND} strokeWidth={1.8 + 0.6 * sc} opacity={0.6 + 0.3 * sc} />);
  }
  const grains: React.ReactNode[] = [];
  sessions.forEach((t, k) => {
    for (let i = 0; i < 26; i++) {
      const t0 = t + i % 9;
      const g = sp(f, t0, "snap");
      if (g <= 0) continue;
      const x = 18 + hash(k * 97 + i) * (SW - 36), y = BAND - 4 - hash(k * 97 + i + 50) * (T * 0.8 + 6);
      grains.push(<circle key={`${k}-${i}`} cx={x} cy={y - (1 - c01(g)) * 40} r={3.2} fill={WHITE} stroke={DEEP} strokeWidth={1} opacity={c01(g)} />); // lint-ok: PLLA grains, not a callout
    }
  });
  const NX = SW * 0.62, NY = BAND - T / 2;
  return (
    <Panel f={f} s={s} out={out} spring={spring} x={98} y={top} w={PW} h={PH} seed={71}>
      <div style={{ position: "absolute", left: 22, top: 18, display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ font: `500 17px/1 ${FONT}`, letterSpacing: "0.13em", textTransform: "uppercase", color: MUTED, whiteSpace: "nowrap" }}>{caps}</span>
        {sessions.map((t, i) => {
          const l = c01(sp(f, t, "snap"));
          return <span key={i} style={{ padding: "6px 12px 5px", borderRadius: 999, font: `600 19px/1 ${FONT}`, color: INK, whiteSpace: "nowrap", border: `1.5px solid ${l > 0.5 ? SAND : SURF}`, opacity: 0.35 + 0.65 * l }}>Session {i + 1}</span>;
        })}
        <span style={{ marginLeft: "auto", whiteSpace: "nowrap", font: `600 20px/1 ${FONT}`, color: DEEP, opacity: lt, transform: `translateY(${(1 - lt) * 8}px)` }}>Later</span>
      </div>
      <svg width={SW} height={SH} style={{ position: "absolute", left: 20, top: 62, borderRadius: 16, overflow: "hidden" }}>
        <rect x={0} y={0} width={SW} height={SH} fill={CREAM} />
        <path d={`${wave(-20, SW + 20, EPI, 70, 6)} L${SW + 20},${DERM} L-20,${DERM} Z`} fill="rgba(191,134,98,.30)" />
        <rect x={0} y={DERM} width={SW} height={FAT - DERM} fill="rgba(191,134,98,.12)" />
        {Array.from({ length: 22 }, (_, i) => <ellipse key={i} cx={20 + i * 38 + (i % 2) * 12} cy={FAT + 30 + (i % 2) * 26} rx={22} ry={18} fill="rgba(242,239,237,.9)" stroke={SURF} strokeWidth={2} />)}
        {fib}
        {grains}
        <g opacity={nd}>
          <ellipse cx={NX} cy={NY} rx={(70 + 14 * hl + drift(f - halo, 3, 72, 32) * hl) * nd} ry={(44 + 10 * hl) * nd} fill={`rgba(191,134,98,${0.28 * hl})`} />
          {[0, 1, 2].map((k) => <ellipse key={k} cx={NX} cy={NY} rx={(40 - k * 8) * nd} ry={(26 - k * 6) * nd} fill={k === 2 ? "rgba(137,100,79,.30)" : "none"} stroke={DEEP} strokeWidth={3 - k * 0.7} />)}
        </g>
        {/* measured bracket: the fibrous layer's thickness, live */}
        <g opacity={c01(sp(f, sessions[0] + 10, "settle"))}>
          <path d={`M${SW - 30},${BAND} L${SW - 18},${BAND} L${SW - 18},${BAND - T} L${SW - 30},${BAND - T}`} fill="none" stroke={INK} strokeWidth={2} />
        </g>
      </svg>
      <div style={{ position: "absolute", left: 22, bottom: 14, display: "flex", gap: 22, font: `500 16px/1 ${FONT}`, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED }}>
        <span>Illustration</span><span style={{ color: INK, opacity: c01(sp(f, sessions[0] + 10, "settle")) }}>Bracket: fibrous layer</span>
        <span style={{ color: DEEP, opacity: sc }}>Scarring</span><span style={{ color: DEEP, opacity: nd }}>Nodule</span><span style={{ color: DEEP, opacity: hl }}>Inflammation</span>
      </div>
    </Panel>
  );
};

// ------------------------------------------------------------------ ContourCompare: diffuse rounding vs placed volume
type Pt = [number, number];
// a generic front-view face outline (right half, mirrored): temple, cheekbone, cheek, jaw angle, chin. Cubic control points.
const HALF: Pt[] = [[100, 10], [150, 10], [178, 50], [180, 105], [182, 140], [176, 170], [165, 195], [150, 228], [125, 250], [100, 252]];
const outline = (p: Pt[]) => {
  const m = (q: Pt): Pt => [200 - q[0], q[1]];
  const L = [...p].reverse().map(m);
  const seg = (a: Pt[]) => `C${a[0]} ${a[1]} ${a[2]}`;
  return `M${p[0]} ${seg(p.slice(1, 4))} ${seg(p.slice(4, 7))} ${seg(p.slice(7, 10))} ${seg(L.slice(1, 4))} ${seg(L.slice(4, 7))} ${seg(L.slice(7, 10))} Z`;
};
const lerpPts = (a: Pt[], b: Pt[], t: number): Pt[] => a.map((q, i) => [q[0] + (b[i][0] - q[0]) * t, q[1] + (b[i][1] - q[1]) * t]);
const ROUND: Pt[] = HALF.map(([x, y], i) => (i >= 3 && i <= 8 ? [100 + (x - 100) * 1.1, y + (i >= 6 ? 4 : 0)] : [x, y])); // everything below the temple fills out
const SCULPT: Pt[] = HALF.map(([x, y], i) => (i === 3 ? [190, 100] : i === 4 ? [186, 132] : i === 6 ? [172, 204] : i === 7 ? [156, 232] : i === 9 ? [100, 258] : [x, y])); // cheekbone, jaw angle, chin

const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; p: number }> = ({ x1, y1, x2, y2, p }) => {
  if (p <= 0.01) return null;
  const ex = x1 + (x2 - x1) * p, ey = y1 + (y2 - y1) * p, L = Math.hypot(ex - x1, ey - y1) || 1;
  const ux = (ex - x1) / L, uy = (ey - y1) / L, nx = -uy, ny = ux, hb = Math.min(13, L * 0.5);
  const bx = ex - ux * hb, by = ey - uy * hb;
  const shaft = `M${x1 + nx * 0.6},${y1 + ny * 0.6} L${bx + nx * 2.4},${by + ny * 2.4} L${bx - nx * 2.4},${by - ny * 2.4} L${x1 - nx * 0.6},${y1 - ny * 0.6} Z`; // tapered
  return (
    <g>
      <path d={shaft} fill={INK} />
      <polygon data-arrowhead points={`${ex},${ey} ${bx + nx * 6.5},${by + ny * 6.5} ${bx - nx * 6.5},${by - ny * 6.5}`} fill={INK} />
    </g>
  );
};

export const ContourCompare: React.FC<{
  s: number; out: number; spring: SpringName; left: { caps: string; title: string; at: number }; right: { caps: string; title: string; at: number; points: number }; top?: number;
}> = ({ s, out, spring, left, right, top = 1160 }) => {
  const f = useCurrentFrame();
  if (f < s || f > out + 16) return null;
  const PW = 430, PH = 410;
  const face = (kind: "round" | "sculpt", side: { caps: string; title: string; at: number }, x: number, seed: number) => {
    const t = c01(sp(f, kind === "round" ? side.at + 6 : right.points, "heavy"));
    const pts = lerpPts(HALF, kind === "round" ? ROUND : SCULPT, t);
    const arrowsP = c01(sp(f, kind === "round" ? side.at + 6 : right.points, "snap"));
    const arrows: [number, number, number, number][] = kind === "round"
      ? [[184, 118, 212, 118], [172, 192, 196, 210], [138, 240, 152, 264], [16, 118, -12, 118], [28, 192, 4, 210], [62, 240, 48, 264], [100, 256, 100, 284]]
      : [[222, 76, 192, 98], [200, 236, 175, 208], [100, 290, 100, 262], [-22, 76, 8, 98], [0, 236, 25, 208]];
    return (
      <Panel f={f} s={side.at} out={out} spring={spring} x={x} y={top} w={PW} h={PH} seed={seed}>
        <svg width={PW} height={290} viewBox="-30 -6 260 296" style={{ position: "absolute", left: 0, top: 6 }}>
          <path d={outline(HALF)} fill="none" stroke={MUTED} strokeWidth={1.6} strokeDasharray="5 6" opacity={0.8} />
          <path d={outline(pts)} fill="rgba(191,134,98,.14)" stroke={DEEP} strokeWidth={3} />
          <path d="M62 112 Q76 104 90 112 M110 112 Q124 104 138 112 M100 120 L96 168 L106 170 M80 200 Q100 210 120 200" fill="none" stroke={DEEP} strokeWidth={2} strokeLinecap="round" opacity={0.55} />
          {arrows.map(([a, b, c, d], i) => {
            const t0 = (kind === "round" ? side.at + 6 : right.points) + i * 2;
            return <Arrow key={i} x1={a} y1={b} x2={c} y2={d} p={c01(sp(f, t0, "snap")) * arrowsP} />;
          })}
          {kind === "sculpt" && [[190, 100], [173, 206], [100, 262], [10, 100], [27, 206]].map(([cx, cy], i) => {
            const q = c01(sp(f, right.points + 10 + i * 2, "snap"));
            return <path key={i} d={`M${cx - 6 * q},${cy - 6 * q} L${cx + 6 * q},${cy + 6 * q} M${cx - 6 * q},${cy + 6 * q} L${cx + 6 * q},${cy - 6 * q}`} stroke={DEEP} strokeWidth={2.6} strokeLinecap="round" />; // entry x's
          })}
        </svg>
        <div style={{ position: "absolute", left: 24, top: 300 }}>
          <div style={{ font: `500 17px/1 ${FONT}`, letterSpacing: "0.13em", textTransform: "uppercase", color: MUTED }}>{side.caps}</div>
          <div style={{ font: `600 34px/1.1 ${FONT}`, marginTop: 10 }}>{side.title}</div>
        </div>
      </Panel>
    );
  };
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {face("round", left, 98, 81)}
      {face("sculpt", right, W - 98 - PW, 87)}
      <Tag text="Illustration" style={{ right: 98 + 22, top: top + PH - 30 + (1 - c01(sp(f, right.at, spring))) * 26 + drift(f - right.at, 3, 57, 32), opacity: on(f, right.at, out, spring) * 0.9 }} />
    </div>
  );
};

// ------------------------------------------------------------------ CompareLoupes: two tissue loupes side by side at one scale
export const CompareLoupes: React.FC<{
  s: number; out: number; spring: SpringName; a: { src: string; label: string; at: number }; b: { src: string; src2?: string; label: string; at: number }; top?: number;
}> = ({ s, out, spring, a, b, top = 1176 }) => {
  const f = useCurrentFrame();
  if (f < s || f > out + 16) return null;
  const D = 330;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Loupe s={a.at} out={out} spring={spring} cx={98 + 30 + D / 2} cy={top + D / 2} d={D} src={a.src} label={a.label} seed={91} />
      <Loupe s={b.at} out={out} spring={spring} cx={W - 98 - 30 - D / 2} cy={top + D / 2} d={D} src={b.src} src2={b.src2 ? { src: b.src2, at: b.at + 20 } : undefined} label={b.label} seed={97} tag="" />
      <div style={{ position: "absolute", left: 0, width: W, top: top + D / 2 - 26, textAlign: "center", font: `600 40px/1 ${FONT}`, color: WHITE, textShadow: "0 2px 10px rgba(0,0,0,.45)", opacity: on(f, b.at, out, "settle") }}>vs</div>
    </div>
  );
};
