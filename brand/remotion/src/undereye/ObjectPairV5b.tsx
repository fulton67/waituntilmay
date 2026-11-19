// UndereyeReelV5b object beat (coordinator note on v5, after the Laser Genesis reference): the cannula and the needle come up BIG in the
// face-free lower part of the frame, laid diagonally, each ~900 px long (drawn larger than life), with a soft contact shadow, a 330 px
// circular tip loupe joined to its tip by a short hairline, one 36 px label each. The first object floats up and settles, holds >= 2 s
// alone, then the second arrives; the pair holds together and both leave together.
// Screen positions come from the timeline (beat.layout: tip [x,y], len, angle, loupe [cx,cy], d, label [x,y]); they were placed against the
// v5 face boxes (brand/edits/undereye-filler/v5/faces_v5.json: him x 0-306 y 300-800, her x >= 710 y 674-1136 over f1655-1842).
// An object with no real photo yet (src = "ghost:cannula") is drawn as a neutral ghosted outline labelled "Photo to come" (no red text).
import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";

const FONTX = '"neue-haas-grotesk-display", "Inter Tight", Arial, sans-serif';
const INK = "#1d2230";
const IN = 16, OUT = 10;
const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

export type PairObject = {
  src: string; // public/ path of a transparent cut-out (tip at tipAt), or "ghost:cannula"
  tipSrc: string; // public/ path of the loupe image, or "ghost:cannula-tip"
  tipAt: [number, number]; // tip point on the cut-out PNG, fractions
  aspect: number; // PNG w / h
  label: string; sub?: string; // one label (36 px); sub = a small second line ("Photo to come")
  s: number; loupeS: number; out: number;
  tip: [number, number]; len: number; angle: number; // tip screen point, drawn length px, angle deg (0 = shaft runs right)
  loupe: [number, number]; d: number; // loupe centre + diameter
  labelAt: [number, number]; labelAlign?: "left" | "center";
  light?: string;
};

const GhostCannula: React.FC<{ w: number; h: number }> = ({ w, h }) => {
  // a neutral outline of a blunt microcannula: rounded tip at the left, side port just behind it, shaft, hub at the right
  const cy = h / 2, r = h * 0.07, hubX = w * 0.8;
  const st = "rgba(255,255,255,.95)", fill = "rgba(236,238,242,.62)";
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <path d={`M ${hubX} ${cy - r} L ${r * 2} ${cy - r} A ${r} ${r} 0 0 0 ${r * 2} ${cy + r} L ${hubX} ${cy + r} Z`} fill={fill} stroke={st} strokeWidth={3} />
      <rect x={w * 0.07} y={cy - r * 0.55} width={w * 0.045} height={r * 1.1} rx={r * 0.5} fill="rgba(60,66,80,.55)" stroke={st} strokeWidth={2} />
      <path d={`M ${hubX} ${cy - r * 2.4} L ${w * 0.98} ${cy - r * 3.2} L ${w * 0.98} ${cy + r * 3.2} L ${hubX} ${cy + r * 2.4} Z`} fill={fill} stroke={st} strokeWidth={3} />
    </svg>
  );
};
const GhostTip: React.FC<{ d: number }> = ({ d }) => {
  const cy = d / 2, r = d * 0.13;
  const st = "rgba(70,78,96,.85)";
  return (
    <svg width={d} height={d} style={{ position: "absolute", left: 0, top: 0, background: "#ece9e3" }}>
      <path d={`M ${d * 1.1} ${cy - r} L ${d * 0.3} ${cy - r} A ${r} ${r} 0 0 0 ${d * 0.3} ${cy + r} L ${d * 1.1} ${cy + r}`} fill="rgba(205,208,214,.9)" stroke={st} strokeWidth={3} />
      <rect x={d * 0.42} y={cy - r * 0.5} width={d * 0.16} height={r} rx={r * 0.5} fill="rgba(60,66,80,.75)" stroke={st} strokeWidth={2} />
      <text x={d / 2} y={d * 0.8} textAnchor="middle" style={{ font: `500 ${Math.round(d * 0.07)}px ${FONTX}`, fill: "rgba(70,78,96,.8)" }}>photo to come</text>
    </svg>
  );
};

const pill = (o: number): React.CSSProperties => ({
  display: "inline-block", padding: "12px 22px 11px", borderRadius: 999, background: "rgba(255,255,255,.93)", color: INK, opacity: o,
  boxShadow: "0 8px 26px rgba(8,12,22,.25)", whiteSpace: "nowrap", textAlign: "left" });

export const PairItem: React.FC<{ o: PairObject; end: number }> = ({ o, end }) => {
  const f = useCurrentFrame();
  if (f < o.s || f > end + OUT) return null;
  const a = ease((f - o.s) / IN), z = ease((f - end) / OUT), op = a * (1 - z);
  const t = (f - o.s) / 24;
  const dy = 80 * (1 - a) + 14 * z + 5 * Math.sin(t * 0.8), dx = 4 * Math.sin(t * 0.6 + 1);
  const light = o.light ?? "sepia(.1) saturate(.92) brightness(1.02) contrast(1.03)";
  // the cut-out box: width W so that the drawn length from the tip to the far edge is o.len
  const W = o.len / (1 - o.tipAt[0]), Hh = W / o.aspect;
  const left = o.tip[0] - o.tipAt[0] * W, top = o.tip[1] - o.tipAt[1] * Hh;
  const ghost = o.src.startsWith("ghost:");
  const la = ease((f - o.loupeS) / 12) * (1 - z);
  const [lx, ly] = o.loupe, R = o.d / 2;
  const ang = Math.atan2(o.tip[1] - ly, o.tip[0] - lx);
  const ex = lx + Math.cos(ang) * (R + 4), ey = ly + Math.sin(ang) * (R + 4);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translate(${dx}px, ${dy}px)` }}>
      {/* contact shadow: a soft blurred band under the shaft, offset down-right, rotating with it */}
      <div style={{ position: "absolute", left, top, width: W, height: Hh, transformOrigin: `${o.tipAt[0] * W}px ${o.tipAt[1] * Hh}px`, transform: `rotate(${o.angle}deg)`, opacity: op }}>
        <div style={{ position: "absolute", left: o.tipAt[0] * W + 20, width: W * (1 - o.tipAt[0]) - 30, top: Hh * 0.5 + 26, height: Math.max(26, Hh * 0.22), borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(12,9,6,.38) 0%, rgba(12,9,6,.16) 50%, rgba(12,9,6,0) 75%)", filter: "blur(9px)" }} />
        {ghost ? <GhostCannula w={W} h={Hh} /> :
          <Img src={staticFile(o.src)} style={{ position: "absolute", left: 0, top: 0, width: W, height: Hh, filter: `${light} drop-shadow(0 3px 4px rgba(0,0,0,.3))` }} />}
      </div>
      {f >= o.loupeS && <>
        <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: la }}>
          <line x1={ex} y1={ey} x2={o.tip[0]} y2={o.tip[1]} stroke="rgba(255,255,255,.95)" strokeWidth={2} />
          <circle cx={o.tip[0]} cy={o.tip[1]} r={9} fill="none" stroke="rgba(255,255,255,.95)" strokeWidth={2.5} />
        </svg>
        <div style={{ position: "absolute", left: lx - R, top: ly - R, width: o.d, height: o.d, borderRadius: "50%", overflow: "hidden", background: "#efece6",
          border: "5px solid rgba(255,255,255,.96)", boxShadow: "0 18px 40px rgba(8,12,22,.34)", opacity: la, transform: `scale(${0.8 + 0.2 * la})` }}>
          {o.tipSrc.startsWith("ghost:") ? <GhostTip d={o.d} /> : <Img src={staticFile(o.tipSrc)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: light }} />}
        </div>
      </>}
      <div style={{ position: "absolute", left: o.labelAt[0], top: o.labelAt[1], opacity: op, transform: o.labelAlign === "center" ? "translateX(-50%)" : undefined }}>
        <span style={pill(1)}>
          <span style={{ font: `600 36px/1.05 ${FONTX}`, letterSpacing: "0.005em" }}>{o.label}</span>
          {o.sub && <span style={{ display: "block", font: `500 22px/1.2 ${FONTX}`, color: "rgba(29,34,48,.62)", marginTop: 5 }}>{o.sub}</span>}
        </span>
      </div>
    </div>
  );
};

export const ObjectPairV5b: React.FC<{ a: PairObject; b: PairObject; end: number; credit?: string; creditAt?: [number, number] }> = ({ a, b, end, credit, creditAt }) => {
  const f = useCurrentFrame();
  const co = Math.min(1, Math.max(0, (f - b.s) / 14)) * (f > end ? Math.max(0, 1 - (f - end) / 10) : 1);
  return <>
    <PairItem o={a} end={end} />
    <PairItem o={b} end={end} />
    {credit && f >= b.s && f <= end + 10 && <div style={{ position: "absolute", left: creditAt?.[0] ?? 380, top: creditAt?.[1] ?? 1548, opacity: co,
      font: `500 17px/1.2 ${FONTX}`, color: "rgba(255,255,255,.85)", textShadow: "0 1px 6px rgba(0,0,0,.55)" }}>{credit}</div>}
  </>;
};
