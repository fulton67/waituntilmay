// FloraPlate: a Flora-rendered anatomy animation (Nano Banana Pro stills -> Kling v4 first/last-frame clip, RISD EDU workspace,
// project "Ostad – line-art anatomy renders") on the glass plate, in place of the traced SVG drawings (Naim 2026-11-19: "same
// line-art style, higher detail, so you can see where it goes in the skin"). The clip is a PNG sequence with the paper keyed to alpha in public/flora/<id>/
// (brand/scripts/flora_frames.py); `map` ties composition frames to clip frames, so each change lands on his word, holds, and moves
// on the next word (piecewise linear, clamped). The drawing's paper is transparent, so the ink sits on the glass. Labels are type on the plate
// at fractions of the drawing (no leaders, no boxes: Naim's reel rulings).
import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { card } from "../components/Ro";
import { caps, disp, INK, life, MUTED, vis } from "../jan08/look";

export type FLabel = { text: string; x: number; y: number; s: number; out?: number; anchor?: "start" | "end" | "middle"; size?: number };
export type Strike = { x: number; y: number; r: number; s: number };

/** comp frame -> clip frame through [comp, clip] keys */
export const clipAt = (f: number, map: [number, number][]) => {
  if (f <= map[0][0]) return map[0][1];
  for (let i = 1; i < map.length; i++) {
    const [a, ca] = map[i - 1], [b, cb] = map[i];
    if (f <= b) { const t = (f - a) / Math.max(1, b - a); const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; return ca + (cb - ca) * e; }
  }
  return map[map.length - 1][1];
};

export const FloraPlate: React.FC<{
  id: string; n: number; aspect: number; map: [number, number][]; s: number; out: number; x: number; y: number; w: number; h: number;
  eyebrow: string; title: string; labels?: FLabel[]; strike?: Strike; note?: string; head?: number; pad?: number; titlePx?: number; radius?: number;
  /** zoom into the drawing: [comp frame, scale] keys, about (ox, oy) as fractions of the drawing */
  zoom?: { keys: [number, number][]; ox: number; oy: number };
}> = ({ id, n, aspect, map, s, out, x, y, w, h, eyebrow, title, labels = [], strike, note = "Illustration", head = 128, pad = 32, titlePx = 44, radius = 28, zoom }) => {
  const f = useCurrentFrame();
  if (!vis(f, s, out)) return null;
  const k = Math.max(1, Math.min(n, Math.round(clipAt(f, map)) + 1));
  // the drawing area under the title, the clip fitted (contain) and centred
  const aw = w - 2 * pad, ah = h - head - 50;
  const dw = Math.min(aw, ah * aspect), dh = dw / aspect;
  const dx = pad + (aw - dw) / 2, dy = head + (ah - dh) / 2;
  let z = 1;
  if (zoom) for (const [kf, kz] of zoom.keys) { const t = Math.min(1, Math.max(0, (f - kf) / 18)); z = z + (kz - z) * (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2); }
  const P = (fx: number, fy: number) => {
    const ox = zoom?.ox ?? 0.5, oy = zoom?.oy ?? 0.5;
    return { left: dx + (ox + (fx - ox) * z) * dw, top: dy + (oy + (fy - oy) * z) * dh };
  };
  const sk = strike ? Math.min(1, Math.max(0, (f - strike.s) / 8)) : 0;
  return (
    <div style={{ ...card(radius), left: x, top: y, width: w, height: h, ...life(f, s + 1, out) }}>
      <div style={{ position: "absolute", left: dx, top: dy, width: dw, height: dh, overflow: "hidden" }}>
        <Img src={staticFile(`flora/${id}/${String(k).padStart(4, "0")}.png`)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
            transform: `scale(${z})`, transformOrigin: `${(zoom?.ox ?? 0.5) * 100}% ${(zoom?.oy ?? 0.5) * 100}%` }} />
      </div>
      <div style={{ position: "absolute", left: pad, top: 28, ...caps(24, MUTED) }}>{eyebrow}</div>
      <div style={{ position: "absolute", left: pad, top: 62, width: w - 2 * pad, ...disp(titlePx, INK) }}>{title}</div>
      {strike && sk > 0 && (() => { const c = P(strike.x, strike.y), r = strike.r * dw * z; return (
        <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <g stroke={INK} strokeWidth={7} strokeLinecap="round">
            <line x1={c.left - r} y1={c.top - r} x2={c.left - r + 2 * r * Math.min(1, sk * 2)} y2={c.top - r + 2 * r * Math.min(1, sk * 2)} />
            {sk > 0.5 && <line x1={c.left + r} y1={c.top - r} x2={c.left + r - 2 * r * (sk - 0.5) * 2} y2={c.top - r + 2 * r * (sk - 0.5) * 2} />}
          </g>
        </svg>
      ); })()}
      {labels.map((L, i) => {
        const q = P(L.x, L.y);
        // the anchor shift sits on an outer box, the enter/exit motion on the inner one (life() sets its own transform)
        return <div key={i} style={{ position: "absolute", ...q, transform: `translate(${L.anchor === "end" ? "-100%" : L.anchor === "middle" ? "-50%" : "0"}, -50%)` }}>
          <div style={{ whiteSpace: "nowrap", ...caps(L.size ?? 24, INK), fontWeight: 600, textShadow: "0 0 6px #fff, 0 0 12px #fff", ...life(f, L.s + 1, L.out ?? out, 8) }}>{L.text}</div></div>;
      })}
      <div style={{ position: "absolute", right: pad, bottom: 18, ...caps(15, MUTED), letterSpacing: "0.06em" }}>{note}</div>
    </div>
  );
};
