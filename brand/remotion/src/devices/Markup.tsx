import { useCurrentFrame, useVideoConfig } from "remotion";
import { clamp } from "../brand";

// Markup overlays after the client's two Conor Harris references (IG DdrkdrYv-yW, DYKh5yyPxxg; research/ostad/style/refs.yaml):
// drawn on a transparent layer (no background), so they sit over Ostad's footage or render alone as alpha video.
// Timings read frame by frame from the reference at 30 fps (style/read/ + measure/ig_*), expressed in seconds here:
//   Arrow   : grows from 20% at its tail while the tip travels to the target, 8 frames (0.27 s), ease-out, no overshoot; holds still;
//             leaves by shrinking back to the tail in 3 frames.
//   Badge   : red disc + white ring + white X (or a check), scale 0.2 -> 1 over 10 frames (0.33 s), ease-out, no overshoot.
//   Dot     : translucent disc with a white ring on a point of interest, pops 0.2 -> 1 in 8 frames, fades out in 3.
//   Leader  : a line drawn from one dot to the next (stroke draw-on), then the second dot pops.
//   Arc     : a curved arrow drawn along an arc (direction of a rotation / a movement), draw-on 10 frames.
//   Region  : a tinted, soft-edged region (the muscle / the area being talked about) fading to 45% opacity, gently pulsing.
// Colours default to the reference's markup colours; MarkupColours lets a palette token set override them.

export type MarkupColours = { arrow: string; bad: string; good: string; dot: string; ring: string; region: string; arc: string };
export const MARKUP_DEFAULT: MarkupColours = {
  arrow: "#ffe600", bad: "#e8113c", good: "#1fbf5f", dot: "rgba(126, 211, 33, 0.62)", ring: "#ffffff", region: "rgba(255, 230, 0, 0.45)", arc: "#e8113c",
};

const outCubic = (q: number) => 1 - (1 - q) ** 3;
const useT = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { t: f / fps, fps };
};

type Pt = { x: number; y: number };

// Arrow from `from` (tail) to `to` (tip), px in a 1080-wide frame. `dur` = how long it stays (s).
export const Arrow: React.FC<{ from: Pt; to: Pt; at?: number; dur: number; width?: number; colour?: string }> = ({ from, to, at = 0, dur, width = 34, colour = MARKUP_DEFAULT.arrow }) => {
  const { t } = useT();
  const local = t - at;
  if (local < 0 || local > dur) return null;
  const grow = outCubic(clamp(local / 0.27));
  const shrink = clamp((local - (dur - 0.1)) / 0.1);
  const s = (0.2 + 0.8 * grow) * (1 - shrink);
  if (s <= 0.01) return null;
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.hypot(dx, dy) * s;
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  const head = width * 1.9 * Math.min(1, s * 1.4);
  const shaft = Math.max(0, len - head * 0.9);
  return (
    <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width="100%" height="100%" viewBox="0 0 1080 1920">
      <g transform={`translate(${from.x} ${from.y}) rotate(${ang})`} filter="drop-shadow(0 3px 6px rgba(0,0,0,.35))">
        <rect x={0} y={(-width * s) / 2} width={shaft} height={width * s} fill={colour} />
        <polygon points={`${shaft - 1},${-head * 0.62} ${shaft + head},0 ${shaft - 1},${head * 0.62}`} fill={colour} />
      </g>
    </svg>
  );
};

// X (bad) or check (good) badge centred at `at`.
export const Badge: React.FC<{ x: number; y: number; at?: number; dur: number; kind?: "bad" | "good"; size?: number; colours?: Partial<MarkupColours> }> = ({ x, y, at = 0, dur, kind = "bad", size = 150, colours = {} }) => {
  const { t } = useT();
  const local = t - at;
  if (local < 0 || local > dur) return null;
  const c = { ...MARKUP_DEFAULT, ...colours };
  const s = (0.2 + 0.8 * outCubic(clamp(local / 0.33))) * (1 - clamp((local - (dur - 0.1)) / 0.1));
  const r = (size / 2) * s;
  const fill = kind === "bad" ? c.bad : c.good;
  const k = r * 0.42;
  return (
    <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width="100%" height="100%" viewBox="0 0 1080 1920">
      <defs>
        <radialGradient id={`bg-${kind}`} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor={fill} stopOpacity={1} />
          <stop offset="100%" stopColor={fill} stopOpacity={0.88} />
        </radialGradient>
      </defs>
      <g filter="drop-shadow(0 4px 10px rgba(0,0,0,.3))">
        <circle cx={x} cy={y} r={r} fill={`url(#bg-${kind})`} stroke={c.ring} strokeWidth={Math.max(2, r * 0.09)} />
        {kind === "bad" ? (
          <path d={`M ${x - k} ${y - k} L ${x + k} ${y + k} M ${x + k} ${y - k} L ${x - k} ${y + k}`} stroke="#fff" strokeWidth={r * 0.2} strokeLinecap="round" />
        ) : (
          <path d={`M ${x - k} ${y + k * 0.05} L ${x - k * 0.25} ${y + k * 0.75} L ${x + k} ${y - k * 0.6}`} stroke="#fff" strokeWidth={r * 0.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        )}
      </g>
    </svg>
  );
};

// Target dot(s) on points of interest, optionally joined by a drawn leader line: dot A pops, the line draws to B, B pops.
export const Dots: React.FC<{ a: Pt; b?: Pt; at?: number; dur: number; r?: number; colours?: Partial<MarkupColours> }> = ({ a, b, at = 0, dur, r = 52, colours = {} }) => {
  const { t } = useT();
  const local = t - at;
  if (local < 0 || local > dur) return null;
  const c = { ...MARKUP_DEFAULT, ...colours };
  const out = 1 - clamp((local - (dur - 0.1)) / 0.1);
  const popA = 0.2 + 0.8 * outCubic(clamp(local / 0.27));
  const line = b ? outCubic(clamp((local - 0.3) / 0.35)) : 0;
  const popB = b ? 0.2 + 0.8 * outCubic(clamp((local - 0.65) / 0.27)) : 0;
  const showB = b && local >= 0.65;
  const lx = b ? a.x + (b.x - a.x) * line : 0, ly = b ? a.y + (b.y - a.y) * line : 0;
  return (
    <svg style={{ position: "absolute", inset: 0, overflow: "visible", opacity: out }} width="100%" height="100%" viewBox="0 0 1080 1920">
      {b && line > 0 && <line x1={a.x} y1={a.y} x2={lx} y2={ly} stroke={c.ring} strokeWidth={6} strokeLinecap="round" opacity={0.95} />}
      <circle cx={a.x} cy={a.y} r={r * popA} fill={c.dot} stroke={c.ring} strokeWidth={6} />
      {showB && b && <circle cx={b.x} cy={b.y} r={r * popB} fill={c.dot} stroke={c.ring} strokeWidth={6} />}
    </svg>
  );
};

// Curved arrow along a circular arc centred at c, radius rad, from angle a0 to a1 (deg, 0 = right, clockwise positive).
export const Arc: React.FC<{ c: Pt; rad: number; a0: number; a1: number; at?: number; dur: number; width?: number; colour?: string }> = ({ c, rad, a0, a1, at = 0, dur, width = 14, colour = MARKUP_DEFAULT.arc }) => {
  const { t } = useT();
  const local = t - at;
  if (local < 0 || local > dur) return null;
  const draw = outCubic(clamp(local / 0.33));
  const out = 1 - clamp((local - (dur - 0.1)) / 0.1);
  const aEnd = a0 + (a1 - a0) * draw;
  const P = (a: number) => ({ x: c.x + rad * Math.cos((a * Math.PI) / 180), y: c.y + rad * Math.sin((a * Math.PI) / 180) });
  const p0 = P(a0), p1 = P(aEnd);
  const large = Math.abs(aEnd - a0) > 180 ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  const dir = a1 > a0 ? 1 : -1;
  const tang = ((aEnd + 90 * dir) * Math.PI) / 180;
  const h = width * 2.4;
  const tip = { x: p1.x + Math.cos(tang) * h * 0.6, y: p1.y + Math.sin(tang) * h * 0.6 };
  const nx = Math.cos((aEnd * Math.PI) / 180), ny = Math.sin((aEnd * Math.PI) / 180);
  return (
    <svg style={{ position: "absolute", inset: 0, overflow: "visible", opacity: out }} width="100%" height="100%" viewBox="0 0 1080 1920">
      <g filter="drop-shadow(0 3px 6px rgba(0,0,0,.3))">
        <path d={`M ${p0.x} ${p0.y} A ${rad} ${rad} 0 ${large} ${sweep} ${p1.x} ${p1.y}`} stroke={colour} strokeWidth={width} fill="none" strokeLinecap="round" />
        {draw > 0.05 && <polygon points={`${tip.x},${tip.y} ${p1.x + nx * h * 0.5},${p1.y + ny * h * 0.5} ${p1.x - nx * h * 0.5},${p1.y - ny * h * 0.5}`} fill={colour} />}
      </g>
    </svg>
  );
};

// Soft tinted region (ellipse or SVG path) over the area being discussed; fades to 45%, breathes +-8% while held.
export const Region: React.FC<{ d?: string; ellipse?: { cx: number; cy: number; rx: number; ry: number; rot?: number }; at?: number; dur: number; colour?: string }> = ({ d, ellipse, at = 0, dur, colour = MARKUP_DEFAULT.region }) => {
  const { t } = useT();
  const local = t - at;
  if (local < 0 || local > dur) return null;
  const op = outCubic(clamp(local / 0.3)) * (1 - clamp((local - (dur - 0.2)) / 0.2)) * (0.92 + 0.08 * Math.sin(local * Math.PI * 2 / 1.6));
  return (
    <svg style={{ position: "absolute", inset: 0, overflow: "visible", opacity: op }} width="100%" height="100%" viewBox="0 0 1080 1920">
      <defs>
        <filter id="soft"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      {d && <path d={d} fill={colour} filter="url(#soft)" />}
      {ellipse && <ellipse cx={ellipse.cx} cy={ellipse.cy} rx={ellipse.rx} ry={ellipse.ry} transform={`rotate(${ellipse.rot ?? 0} ${ellipse.cx} ${ellipse.cy})`} fill={colour} filter="url(#soft)" />}
    </svg>
  );
};
