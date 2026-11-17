import React from "react";
import { Img, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { C, MOA_LABEL, caps, cl, drift, ease, glass, p, sheen, text } from "./look";

// exo6/parts.tsx: small shared pieces. Topic-neutral; every one moves for its whole life (no static image layer).

export const src = (s: string) => (/^(https?:|data:|\/)/.test(s) ? s : staticFile(s));

/** a picture that never holds still: a push (scale s0 -> s1 over [from, to]) plus a slow drift. `focus` = transform origin. */
export const MovingImg: React.FC<{
  file: string; from: number; to: number; s0?: number; s1?: number; dx?: number; dy?: number; focus?: string; fit?: "cover" | "contain";
  pos?: string; style?: React.CSSProperties; video?: boolean; startFrom?: number; rate?: number;
}> = ({ file, from, to, s0 = 1, s1 = 1.04, dx = 6, dy = 4, focus = "50% 50%", fit = "cover", pos = "50% 50%", style, video, startFrom = 0, rate = 1 }) => {
  const f = useCurrentFrame();
  const u = ease.blank(cl((f - from) / Math.max(1, to - from)));
  const s = s0 + (s1 - s0) * u;
  const tx = drift(f, dx, 150), ty = drift(f, dy, 190, 0.7);
  const st: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fit, objectPosition: pos,
    transform: `translate(${tx}px, ${ty}px) scale(${s})`, transformOrigin: focus, ...style };
  return video ? <OffthreadVideo src={src(file)} muted startFrom={startFrom} playbackRate={rate} style={st} /> : <Img src={src(file)} style={st} />;
};

/** frosted glass surface with its moving sheen; children inside */
export const Glass: React.FC<{ r?: number; t?: number; style?: React.CSSProperties; strength?: number; children?: React.ReactNode }> = ({ r = 24, t = 0, style, strength = 1, children }) => (
  <div style={{ position: "absolute", overflow: "hidden", ...glass(r, strength), ...style }}>
    <div style={sheen(t, 150)} />
    {children}
  </div>
);

/** a small glass chip: icon slot + label; pops 0.95 -> 1 in 5 f (type-scale-pop) */
export const Chip: React.FC<{ at: number; label: React.ReactNode; out?: number; tone?: "glass" | "ink" | "blue"; size?: number; style?: React.CSSProperties; icon?: React.ReactNode }> = ({ at, label, out = Infinity, tone = "glass", size = 26, style, icon }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const i = p(f, at, 5, ease.arrive), o = p(f, out, 7, ease.exit);
  const bg = tone === "ink" ? { background: C.navy, color: "#fff" } : tone === "blue" ? { background: C.blue, color: "#fff" } : { ...glass(999), color: C.ink };
  return (
    <div style={{ position: "absolute", display: "flex", alignItems: "center", gap: 10, padding: `${size * 0.5}px ${size * 0.85}px`, borderRadius: 999, whiteSpace: "nowrap",
      ...text(size, 500), ...bg, opacity: i * (1 - o), transform: `scale(${0.95 + 0.05 * i}) translateY(${o * 7}px)`, transformOrigin: "0% 50%", ...style }}>
      {icon}{label}
    </div>
  );
};

/** the MOA compliance label, bottom-right, small, always on with its graphic */
export const MoaLabel: React.FC<{ at: number; out?: number; dark?: boolean; x?: number; y?: number }> = ({ at, out = Infinity, dark = false, x = 1880, y = 832 }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const o = p(f, at, 10) * (1 - p(f, out, 7, ease.exit));
  return <div style={{ position: "absolute", right: 1920 - x, top: y, ...text(23, 400, dark ? "rgba(255,255,255,.86)" : C.ink2), opacity: o, letterSpacing: "0.01em", textShadow: dark ? "0 1px 8px rgba(0,0,0,.45)" : undefined }}>{MOA_LABEL}</div>;
};

/** a one-line disclaimer that fades on (10 f) and holds */
export const Disclaimer: React.FC<{ at: number; text: string; out?: number; style?: React.CSSProperties }> = ({ at, text: t, out = Infinity, style }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const o = p(f, at, 10) * (1 - p(f, out, 7, ease.exit));
  return <div style={{ position: "absolute", ...text(24, 400, C.ink2), opacity: o, ...style }}>{t}</div>;
};

/** small caps label with a hairline, used as a panel header */
export const Eyebrow: React.FC<{ children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties }> = ({ children, color = C.ink2, size = 26, style }) => (
  <div style={{ ...caps(size, color), display: "flex", alignItems: "center", gap: 10, ...style }}>{children}</div>
);

/** a hand-drawn-feel tick (check) that draws in `d` frames */
export const Tick: React.FC<{ at: number; size?: number; color?: string; d?: number; w?: number }> = ({ at, size = 22, color = C.blue, d = 6, w = 2.6 }) => {
  const f = useCurrentFrame();
  const u = p(f, at, d, ease.sweep);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ overflow: "visible" }}>
      <path d="M4 12.5 L9.5 18 L20 6" fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - u} />
    </svg>
  );
};

/** a drawn circle (a slightly open, hand-feel loop) that draws round a box in `d` frames on `sweep` */
export const DrawnCircle: React.FC<{ at: number; w: number; h: number; d?: number; color?: string; sw?: number; out?: number }> = ({ at, w, h, d = 12, color = C.blue, sw = 3, out = Infinity }) => {
  const f = useCurrentFrame();
  const u = p(f, at, d, ease.sweep), o = p(f, out, 7, ease.exit);
  const rx = w / 2, ry = h / 2;
  // a loop that overshoots its start by 18 deg, slightly tilted: reads as drawn, not a CSS border
  const pts: string[] = [];
  for (let k = 0; k <= 64; k++) {
    const a = -Math.PI * 0.62 + (k / 64) * (2 * Math.PI + 0.32);
    const wob = 1 + 0.035 * Math.sin(a * 3 + 0.4);
    pts.push(`${(rx + rx * wob * Math.cos(a)).toFixed(1)},${(ry + ry * wob * Math.sin(a)).toFixed(1)}`);
  }
  return (
    <svg width={w} height={h} style={{ position: "absolute", overflow: "visible", opacity: 1 - o, transform: "rotate(-4deg)" }}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - u * (1 - o * 0.999)} />
    </svg>
  );
};

/** highlighter block that sweeps L->R behind a phrase in 16 f (type-highlight-sweep, DDOS f27-47) */
export const Sweep: React.FC<{ at: number; children: React.ReactNode; color?: string; d?: number }> = ({ at, children, color = "rgba(159,214,245,.55)", d = 16 }) => {
  const f = useCurrentFrame();
  const u = p(f, at, d, ease.sweep);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span style={{ position: "absolute", left: -6, right: -6, top: "12%", bottom: "6%", background: color, borderRadius: 6, transformOrigin: "0% 50%", transform: `scaleX(${u})` }} />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};

/** soft film grain so built scenes sit with footage */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.045 }) => {
  const f = useCurrentFrame();
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity, mixBlendMode: "multiply", pointerEvents: "none" }}>
      <filter id={`g${f % 4}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={f % 4} /><feColorMatrix values="0 0 0 0 0.2  0 0 0 0 0.18  0 0 0 0 0.16  0 0 0 0.9 0" /></filter>
      <rect width={1920} height={1080} filter={`url(#g${f % 4})`} />
    </svg>
  );
};
