// Oct 14 reel: anatomy line drawings on glass. Every outline is traced from a silhouette render of
// research/ostad/3d/base/face.glb at the same view (brand/scripts/oct14_anatomy_blender.py -> oct14_anatomy.py) and measured
// against that render (research/ostad/style/oct14/anatomy_measure.json: bone / muscle outline mean <= 1 px, max <= 3 px).
// Nothing is drawn from memory (LESSONS P5). Ink pen on the glass plate, the token palette only (LESSONS L5). Clinical drawings
// carry ostad_check: pending until Dr. Ostad confirms them.
import React from "react";
import { useCurrentFrame } from "remotion";
import { Arrow } from "../devices/Arrow";
import { card } from "../components/Ro";
import { D, INK, MUTED, caps, disp, life, p, vis } from "./look";

export type AnatomyPath = { id: string; kind: string; label: string; d: string; c: [number, number]; bbox: [number, number, number, number]; ostad_check: string | null };
export type AnatomyView = { yaw_deg: number; paths: AnatomyPath[] };
export type AnatomyData = { size: number; views: Record<string, AnatomyView> };

type Callout = { id: string; text: string; s: number; dx?: number; dy?: number; anchor?: "start" | "end" };

/** one structure: strokes on over 10 f (MOTION pen draw), a faint ink fill once drawn; `focus` reads full ink, context at 35 % */
const Struct: React.FC<{ q: AnatomyPath; s: number; focus: boolean; shift?: number; ghost?: boolean; strong?: number; scale?: number }> = ({ q, s, focus, shift = 0, ghost, strong = 0, scale = 1 }) => {
  const frame = useCurrentFrame();
  const k = p(frame, s, 10, "sweep");
  if (k <= 0) return null;
  const a = focus ? 1 : 0.35 + 0.65 * strong;
  return (
    <g transform={`translate(0 ${shift}) translate(${q.c[0]} ${q.bbox[1]}) scale(${scale}) translate(${-q.c[0]} ${-q.bbox[1]})`} opacity={ghost ? 0.3 : 1}>
      <path d={q.d} fill={INK} fillOpacity={(focus ? 0.1 : 0.04 + 0.08 * strong) * k} stroke={INK} strokeOpacity={a} strokeWidth={ghost ? 2 : focus ? 3.2 : 2.2}
        strokeDasharray={ghost ? "6 8" : `${k} 1`} pathLength={ghost ? undefined : 1} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </g>
  );
};

/**
 * AnatomyCard (`topic-glass-panel` + `arrow-hand-drawn` callouts as type on the plate): the model drawing in a glass plate.
 * `focus` ids draw first in full ink; context ids follow faint. `drop` slides the listed ids down by `dropPx` (render px) from
 * `dropS`, leaving a dashed ghost where they were ("soft tissue moving down"; Illustration).
 */
export const AnatomyCard: React.FC<{
  data: AnatomyData; view: string; s: number; out: number; x: number; y: number; w: number; h: number;
  eyebrow: string; title: string; focus: string[]; context: string[]; callouts: Callout[]; note?: string;
  drop?: { ids: string[]; s: number; px: number }; strong?: { ids: string[]; s: number };
  /** deflation: the listed ids shrink to `k` about their top centre from `s` (soft tissue losing volume) */
  shrink?: { ids: string[]; s: number; k: number };
  /** filler restores: an ink-filled lens grows on structure `on` (offset in render px) from `s`; shrink and drop give back `back` of their change */
  filler?: { on: string; s: number; dx: number; dy: number; rx: number; ry: number; back: number; label: string };
  /** force arrows on structures (the brow balance): up = lifts, down = pulls down; `len` render px */
  forces?: { id: string; dir: "up" | "down"; s: number; len: number; dx?: number }[];
  /** contraction: the listed muscles pull in (a 12 f pulse, 8 %) from `s` until `e`, then rest ("dynamic" lines; neuromodulator relaxes) */
  pulse?: { ids: string[]; s: number; e: number };
}> = ({ data, view, s, out, x, y, w, h, eyebrow, title, focus, context, callouts, note = "Illustration · traced from a 3D anatomy model", drop, strong, shrink, filler, forces = [], pulse }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s, out)) return null;
  const V = data.views[view];
  const by = (id: string) => V.paths.find((q) => q.id === id);
  // fit the union of drawn bboxes into the plate's drawing area
  const ids = [...focus, ...context].filter((i) => by(i));
  const bb = ids.map((i) => by(i)!.bbox);
  const x0 = Math.min(...bb.map((b) => b[0])), y0 = Math.min(...bb.map((b) => b[1]));
  const x1 = Math.max(...bb.map((b) => b[0] + b[2])), y1 = Math.max(...bb.map((b) => b[1] + b[3]));
  const head = 118, padX = 34, padB = 64;
  const aw = w - 2 * padX, ah = h - head - padB;
  const sc = Math.min(aw / (x1 - x0), ah / (y1 - y0));
  const ox = padX + (aw - (x1 - x0) * sc) / 2 - x0 * sc, oy = head + (ah - (y1 - y0) * sc) / 2 - y0 * sc;
  const plateS = s + 1, drawS = s + 1 + D.plate;
  const fk = filler ? p(frame, filler.s + 1, 20, "sweep") : 0;
  const dk = (drop ? p(frame, drop.s + 1, 18, "sweep") : 0) * (1 - (filler?.back ?? 0) * fk);
  const pk = pulse && frame >= pulse.s && frame < pulse.e ? 1 - 0.08 * Math.abs(Math.sin((Math.PI * (frame - pulse.s)) / 12)) : 1;
  const sk = shrink ? 1 - (1 - shrink.k) * p(frame, shrink.s + 1, 16, "sweep") * (1 - (filler?.back ?? 0) * fk) : 1;
  const stg = strong ? p(frame, strong.s + 1, 10, "sweep") : 0;
  const forceEls = forces.map((F, i) => {
    const q = by(F.id);
    if (!q) return null;
    const px = x + ox + (q.c[0] + (F.dx ?? 0)) * sc, py = y + oy + q.c[1] * sc, L = F.len * sc;
    const from = { x: px, y: F.dir === "up" ? py + L / 2 : py - L / 2 }, to = { x: px, y: F.dir === "up" ? py - L / 2 : py + L / 2 };
    return <Arrow key={i} variant="straight-pointer" from={from} to={to} start={F.s + 1} end={out + 4} />;
  });
  return (
    <>
    <div style={{ ...card(28), left: x, top: y, width: w, height: h, overflow: "hidden", ...life(frame, plateS, out) }}>
      <div style={{ position: "absolute", left: padX, top: 26, ...caps(22, MUTED) }}>{eyebrow}</div>
      <div style={{ position: "absolute", left: padX, top: 56, ...disp(40, INK) }}>{title}</div>
      <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <g transform={`translate(${ox} ${oy}) scale(${sc})`}>
          {context.map((i, n) => by(i) && <Struct key={i} q={by(i)!} s={drawS + focus.length * 4 + n * 3} focus={false} strong={strong?.ids.includes(i) ? stg : 0} />)}
          {drop && focus.filter((i) => drop.ids.includes(i)).map((i) => by(i) && dk > 0 && <Struct key={"g" + i} q={by(i)!} s={drawS} focus={false} ghost />)}
          {focus.map((i, n) => by(i) && <Struct key={i} q={by(i)!} s={drawS + n * 4} focus shift={drop?.ids.includes(i) ? (drop.px * dk) : 0} scale={shrink?.ids.includes(i) ? sk : pulse?.ids.includes(i) ? pk : 1} />)}
          {filler && fk > 0 && by(filler.on) && (() => { const q = by(filler.on)!; return (
            <ellipse cx={q.c[0] + filler.dx} cy={q.c[1] + filler.dy} rx={filler.rx * fk} ry={filler.ry * fk} fill={INK} fillOpacity={0.32} stroke={INK} strokeWidth={2.4} vectorEffect="non-scaling-stroke" />
          ); })()}
        </g>
      </svg>
      {callouts.map((c) => {
        const q = by(c.id);
        if (!q) return null;
        const shift = drop?.ids.includes(c.id) ? drop.px * dk : 0;
        const cx = ox + q.c[0] * sc + (c.dx ?? 0), cy = oy + (q.c[1] + shift) * sc + (c.dy ?? 0);
        return (
          <div key={c.id + c.text} style={{ position: "absolute", left: cx, top: cy, transform: `translate(${c.anchor === "end" ? "-100%" : c.anchor === "start" ? "0" : "-50%"}, -50%)`,
            whiteSpace: "nowrap", ...caps(20, INK), ...life(frame, c.s + 1, out, 8) }}>{c.text}</div>
        );
      })}
      {filler && fk > 0 && by(filler.on) && (() => { const q = by(filler.on)!; return (
        <div style={{ position: "absolute", left: ox + (q.c[0] + filler.dx + filler.rx + 10) * sc, top: oy + (q.c[1] + filler.dy) * sc, transform: "translateY(-50%)", whiteSpace: "nowrap",
          ...caps(20, INK), ...life(frame, filler.s + 8, out, 8) }}>{filler.label}</div>
      ); })()}
      <div style={{ position: "absolute", left: padX, bottom: 22, ...caps(16, MUTED), letterSpacing: "0.06em" }}>{note}</div>
    </div>
    {forceEls}
    </>
  );
};
