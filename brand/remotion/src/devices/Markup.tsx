import { useCurrentFrame, useVideoConfig } from "remotion";
import { ELZA, clamp, easeOutBack } from "../brand";

// Markup overlays, v2 (style DECISIONS 8). The client on v1 (big yellow arrow, red disc badges, filled tint): "too big and not circling
// anything ... they would need to be glass icons like the rest of the UI ... a lot cuter and smaller, kind of like the Are.na board".
// The Are.na board's annotation language: white hairlines, tiny dots, small spaced-caps labels on soft glass, rings and corner
// brackets AROUND the feature instead of shapes ON it. So every device is now one of:
//   Ring     : a 3 px white hairline ellipse that draws itself around a feature (0.55 s), a bright dot riding the drawing tip,
//              then an optional glass label chip on a hairline leader.
//   Pin      : a small glass dot (26 px) on a point, one soft pulse, hairline leader to a glass label chip.
//   Flow     : a dotted hairline arc with a small open chevron (a movement / a spread), revealed along its length.
//   Mark     : a 68 px glass disc with a thin white X or check, faintly tinted (rose / brand blue), with an optional label chip.
//   Brackets : four hairline corner marks framing a region, closing in 14 px as they appear (viewfinder).
// Positions are px in the 1080x1920 frame and may be functions of the frame, so a device can follow a tracked face
// (public/<slug>/face_track.json, YuNet landmarks per frame). Motion stays quick (0.3-0.55 s); chips pop with a small overshoot.
// All transparent: render alone with alpha or over footage.

export type Pt = { x: number; y: number };
export type P = Pt | ((frame: number) => Pt);
const pos = (p: P, f: number) => (typeof p === "function" ? p(f) : p);

const inOut = (q: number) => (q < 0.5 ? 4 * q ** 3 : 1 - (-2 * q + 2) ** 3 / 2);
const out = (q: number) => 1 - (1 - q) ** 3;

const useLocal = (at: number, dur: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame / fps - at;
  const show = local >= 0 && local <= dur;
  const exit = clamp((local - (dur - 0.25)) / 0.25); // shared 0.25 s fade out
  return { frame, local, show, exit };
};

const HAIR = "rgba(255,255,255,.96)";
const GLOW = "drop-shadow(0 0 5px rgba(255,255,255,.35)) drop-shadow(0 1px 2px rgba(0,0,0,.25))";
const Svg: React.FC<{ children: React.ReactNode; opacity?: number }> = ({ children, opacity = 1 }) => (
  <svg style={{ position: "absolute", inset: 0, overflow: "visible", opacity }} width="100%" height="100%" viewBox="0 0 1080 1920">
    <g style={{ filter: GLOW }}>{children}</g>
  </svg>
);

// Small liquid-glass surface (the name card's material scaled down: no displacement at this size, just blur, lift and a bright rim).
const glass = (radius: number, tint = "rgba(255,255,255,0)"): React.CSSProperties => ({
  position: "absolute", borderRadius: radius, overflow: "hidden", isolation: "isolate",
  backdropFilter: "blur(9px) saturate(1.35) brightness(1.06)",
  // + a faint navy (#202532) floor so the white label still reads on a white wall
  background: `linear-gradient(${tint}, ${tint}), linear-gradient(160deg, rgba(255,255,255,.26), rgba(255,255,255,.06) 58%, rgba(255,255,255,.14)), rgba(32,37,50,.16)`,
  boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.6), inset 1.5px 2px 2px -1px rgba(255,255,255,.75), 0 6px 18px rgba(0,0,0,.16)",
});

const pop = (local: number, delay = 0, len = 0.32) => {
  const q = clamp((local - delay) / len);
  return { s: 0.72 + 0.28 * easeOutBack(q, 1.2), o: clamp(q * 2.2) };
};

// Glass label chip. `anchor` = where the leader ends; the chip sits to its `side`.
export const Chip: React.FC<{ at: Pt; side?: "left" | "right"; text: string; s?: number; o?: number }> = ({ at, side = "right", text, s = 1, o = 1 }) => (
  <div style={{ ...glass(999), left: at.x, top: at.y, padding: "9px 17px 8px", color: "#fff", opacity: o, whiteSpace: "nowrap",
    transform: `translate(${side === "right" ? "0" : "-100%"}, -50%) scale(${s})`, transformOrigin: side === "right" ? "left center" : "right center",
    font: `700 21px/1 ${ELZA}`, letterSpacing: "0.16em", textTransform: "uppercase", textShadow: "0 1px 3px rgba(0,0,0,.25)" }}>
    {text}
  </div>
);

// Leader + chip from point a, `len` px out to the side, rising `rise` px. Leader draws (0.25 s) after `delay`, then the chip pops.
const Callout: React.FC<{ a: Pt; side: "left" | "right"; len?: number; rise?: number; text: string; local: number; delay: number; exit: number }> = ({ a, side, len = 120, rise = -40, text, local, delay, exit }) => {
  const d = side === "right" ? 1 : -1;
  const b = { x: a.x + d * len, y: a.y + rise };
  const q = out(clamp((local - delay) / 0.25));
  const { s, o } = pop(local, delay + 0.18);
  return (
    <>
      <Svg opacity={1 - exit}>
        {q > 0 && <polyline points={`${a.x},${a.y} ${a.x + (b.x - a.x) * q},${a.y + (b.y - a.y) * q}`} stroke={HAIR} strokeWidth={2} fill="none" strokeLinecap="round" />}
      </Svg>
      {local >= delay + 0.18 && <Chip at={{ x: b.x + d * 8, y: b.y }} side={side} text={text} s={s} o={o * (1 - exit)} />}
    </>
  );
};

export const Ring: React.FC<{ c: P; rx: number; ry: number; rot?: number; at?: number; dur: number; label?: string; side?: "left" | "right" }> = ({ c, rx, ry, rot = -10, at = 0, dur, label, side = "left" }) => {
  const { frame, local, show, exit } = useLocal(at, dur);
  if (!show) return null;
  const p = pos(c, frame);
  const draw = inOut(clamp(local / 0.55));
  // start at the upper-left (about 200 deg) and draw clockwise
  const a0 = 200, r = (rot * Math.PI) / 180;
  const E = (deg: number) => {
    const a = (deg * Math.PI) / 180, ex = rx * Math.cos(a), ey = ry * Math.sin(a);
    return { x: p.x + ex * Math.cos(r) - ey * Math.sin(r), y: p.y + ex * Math.sin(r) + ey * Math.cos(r) };
  };
  const n = Math.max(2, Math.ceil(96 * draw));
  const pts = Array.from({ length: n + 1 }, (_, i) => E(a0 + (360 * draw * i) / n));
  const tip = pts[pts.length - 1];
  const edge = E(side === "left" ? 180 : 0);
  return (
    <>
      <Svg opacity={1 - exit}>
        {draw > 0.01 && <polyline points={pts.map((q) => `${q.x},${q.y}`).join(" ")} stroke={HAIR} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        {draw < 1 && <circle cx={tip.x} cy={tip.y} r={5} fill="#fff" />}
      </Svg>
      {label && <Callout a={edge} side={side} text={label} local={local} delay={0.5} exit={exit} />}
    </>
  );
};

export const Pin: React.FC<{ p: P; at?: number; dur: number; label?: string; side?: "left" | "right"; len?: number; rise?: number }> = ({ p, at = 0, dur, label, side = "right", len, rise }) => {
  const { frame, local, show, exit } = useLocal(at, dur);
  if (!show) return null;
  const q = pos(p, frame);
  const { s, o } = pop(local, 0, 0.3);
  const pulse = clamp((local - 0.15) / 0.7);
  const D = 26;
  return (
    <>
      <Svg opacity={(1 - pulse) * 0.9 * (1 - exit)}>
        {local > 0.15 && <circle cx={q.x} cy={q.y} r={D / 2 + 26 * out(pulse)} stroke={HAIR} strokeWidth={2} fill="none" />}
      </Svg>
      <div style={{ ...glass(999), left: q.x - D / 2, top: q.y - D / 2, width: D, height: D, transform: `scale(${s})`, opacity: o * (1 - exit) }}>
        <div style={{ position: "absolute", left: D / 2 - 4, top: D / 2 - 4, width: 8, height: 8, borderRadius: 8, background: "#fff", boxShadow: "0 0 6px rgba(255,255,255,.9)" }} />
      </div>
      {label && <Callout a={{ x: q.x + (side === "right" ? D / 2 : -D / 2), y: q.y }} side={side} len={len} rise={rise} text={label} local={local} delay={0.3} exit={exit} />}
    </>
  );
};

// Dotted arc around c from a0 to a1 (deg, 0 = right, clockwise positive) with a small open chevron at the end.
export const Flow: React.FC<{ c: P; rad: number; a0: number; a1: number; at?: number; dur: number }> = ({ c, rad, a0, a1, at = 0, dur }) => {
  const { frame, local, show, exit } = useLocal(at, dur);
  if (!show) return null;
  const p = pos(c, frame);
  const draw = inOut(clamp(local / 0.5));
  const aEnd = a0 + (a1 - a0) * draw;
  const P_ = (a: number) => ({ x: p.x + rad * Math.cos((a * Math.PI) / 180), y: p.y + rad * Math.sin((a * Math.PI) / 180) });
  const s = P_(a0), e = P_(aEnd);
  const dir = a1 > a0 ? 1 : -1;
  const tan = ((aEnd + 90 * dir) * Math.PI) / 180; // travel direction at the tip
  const h = 13, wing = (k: number) => ({ x: e.x - h * Math.cos(tan + k), y: e.y - h * Math.sin(tan + k) });
  const w1 = wing(0.6), w2 = wing(-0.6);
  return (
    <Svg opacity={1 - exit}>
      <path d={`M ${s.x} ${s.y} A ${rad} ${rad} 0 ${Math.abs(aEnd - a0) > 180 ? 1 : 0} ${dir > 0 ? 1 : 0} ${e.x} ${e.y}`} stroke={HAIR} strokeWidth={3.2}
        strokeDasharray="0.1 10" strokeLinecap="round" fill="none" />
      {draw > 0.08 && <polyline points={`${w1.x},${w1.y} ${e.x},${e.y} ${w2.x},${w2.y}`} stroke={HAIR} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
    </Svg>
  );
};

export const Mark: React.FC<{ p: P; kind: "no" | "yes"; at?: number; dur: number; label?: string; side?: "left" | "right" }> = ({ p, kind, at = 0, dur, label, side = "right" }) => {
  const { frame, local, show, exit } = useLocal(at, dur);
  if (!show) return null;
  const q = pos(p, frame);
  const { s, o } = pop(local, 0, 0.34);
  const D = 68, k = 11;
  const tint = kind === "no" ? "rgba(255, 92, 118, .26)" : "rgba(55, 169, 232, .30)";
  const icon = clamp((local - 0.12) / 0.3);
  const lenX = 2 * k * Math.SQRT2;
  return (
    <>
      <div style={{ ...glass(999, tint), left: q.x - D / 2, top: q.y - D / 2, width: D, height: D, transform: `scale(${s})`, opacity: o * (1 - exit) }}>
        <svg width={D} height={D} viewBox={`0 0 ${D} ${D}`} style={{ position: "absolute", inset: 0 }}>
          {kind === "no" ? (
            <path d={`M ${D / 2 - k} ${D / 2 - k} L ${D / 2 + k} ${D / 2 + k} M ${D / 2 + k} ${D / 2 - k} L ${D / 2 - k} ${D / 2 + k}`} stroke="#fff" strokeWidth={3.4}
              strokeLinecap="round" strokeDasharray={`${lenX * icon} ${lenX}`} />
          ) : (
            <path d={`M ${D / 2 - k} ${D / 2 + 1} L ${D / 2 - 3} ${D / 2 + k - 2} L ${D / 2 + k + 1} ${D / 2 - k + 2}`} stroke="#fff" strokeWidth={3.4} fill="none"
              strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${icon} 1`} />
          )}
        </svg>
      </div>
      {label && local >= 0.2 && (() => { const c = pop(local, 0.2); return <Chip at={{ x: q.x + (side === "right" ? D / 2 + 10 : -D / 2 - 10), y: q.y }} side={side} text={label} s={c.s} o={c.o * (1 - exit)} />; })()}
    </>
  );
};

// Corner brackets around a box (x, y = top-left; w, h), closing in from 14 px outside.
export const Brackets: React.FC<{ box: { x: number; y: number; w: number; h: number } | ((f: number) => { x: number; y: number; w: number; h: number }); at?: number; dur: number; len?: number }> = ({ box, at = 0, dur, len = 30 }) => {
  const { frame, local, show, exit } = useLocal(at, dur);
  if (!show) return null;
  const b = typeof box === "function" ? box(frame) : box;
  const q = out(clamp(local / 0.4)), g = 14 * (1 - q);
  const corners: [number, number, number, number][] = [[b.x - g, b.y - g, 1, 1], [b.x + b.w + g, b.y - g, -1, 1], [b.x - g, b.y + b.h + g, 1, -1], [b.x + b.w + g, b.y + b.h + g, -1, -1]];
  return (
    <Svg opacity={q * (1 - exit)}>
      {corners.map(([x, y, dx, dy], i) => (
        <polyline key={i} points={`${x},${y + dy * len} ${x},${y} ${x + dx * len},${y}`} stroke={HAIR} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
};
