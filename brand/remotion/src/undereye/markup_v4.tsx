// Under-eye reel v4: the parts made for the client's 2026-11-19 notes (DECISIONS 16e applied to this reel).
//   RoomTitle  : a section title on the wall behind the people (Jan 08 method): number + rule, the title typed on 12 f, held 60 f fully lit,
//                out 8 f, no darkening; the people's RVM key (KeyLayer in ReelV4) goes back over it, so they pass in front of the type.
//   PlateMedia : a Flora anatomy plate (public/flora/<id>/, FloraPlate's frame naming with its in-betweens) inside a STANDARD ClipCard
//                window, on a paper ground (the frames are ink keyed to alpha; on the card's black media ground they vanished, the v3
//                PillowProfile bug). `map` ties composition frames to clip frames (fractions of the clip), so each change lands on his word.
//   PlanMarks  : the surgeon's plan on her registered Sept 20 face, technical and measured (sketch.json / sketch_measure.json): the orbital
//                rim (bone, dashed), the tear-trough line, the deposit zone hatched (deep, on the bone), an x at each read entry point, the
//                read cannula axes and the fan from the entry to both ends of the trough. All in the photo's own pixels: locked to the face.
//   ChangeBars : on the AFTER, the measured lightening of the trough (L*, Sept 20 -> Oct 4, registered) as bars standing on the trough line
//                at each measured point, so the mark shows how the skin changed, where it changed.
//   Legend     : the key to the marks, off the face (no text on a face; no leaders).
import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CHEST_T, FONT, clamp } from "../brand";
import { card, enter as enterV4 } from "../components/Ro";
import { Chip, glass } from "../devices/Markup";
import { clipAt } from "../flora/FloraPlate";
import type { SketchData } from "./devices_v2";
import { INK, M, MUTED, W, WHITE, caps, disp, life, p } from "./look";
import type { Crop } from "./standard";

const PEN = "#f4f7fb";
const quint = (q: number) => 1 - (1 - q) ** 5;

/* ------------------------------------------------------------------ titles ------------------------------------------------------------ */
export const SEC = { T: 12, HOLD: 60, OUT: 8 };
export const SECTION_LEN = SEC.T + SEC.HOLD + SEC.OUT;
export const RoomTitle: React.FC<{ s: number; num: string; title: string; top?: number; px?: number; align?: "left" | "right"; x?: number }> = ({ s, num, title, top = 250, px = 108, align = "left", x }) => {
  const f = useCurrentFrame();
  const { T, HOLD, OUT } = SEC;
  if (f < s || f > s + T + HOLD + OUT) return null;
  const inK = p(f, s, 8, "arrive"), outK = p(f, s + T + HOLD, OUT, "exit");
  const typed = Math.round(title.length * Math.min(1, Math.max(0, (f - s - 2) / (T - 2))));
  const drift = (f - s) * 0.25 * (align === "left" ? 1 : -1);
  const pos: React.CSSProperties = align === "left" ? { left: (x ?? M) + drift } : { right: W - (x ?? W - M) - drift };
  return (
    <div style={{ position: "absolute", top, ...pos, opacity: 1 - outK, textAlign: align }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, opacity: inK, justifyContent: align === "left" ? "flex-start" : "flex-end" }}>
        <span style={{ ...disp(44, INK, 500) }}>{num}</span>
        <span style={{ display: "block", height: 3, width: 150 * inK, background: INK, borderRadius: 2 }} />
      </div>
      {(() => { let i0 = 0; return title.split("\n").map((ln, li) => { const a = i0; i0 += ln.length; const ty = Math.max(0, Math.min(ln.length, typed - a)); return (
        <div key={li} style={{ ...disp(px, INK), marginTop: li ? 0 : 8, whiteSpace: "nowrap", textShadow: "0 1px 0 rgba(255,255,255,.35)" }}>
          {ln.slice(0, ty)}<span style={{ opacity: 0 }}>{ln.slice(ty)}</span>
        </div>); }); })()}
    </div>
  );
};

/* ------------------------------------------------------------------ plates ------------------------------------------------------------ */
export type FramesMeta = Record<string, { n: number; aspect: number }>;
export type PLabel = { text: string; x: number; y: number; s: number; anchor?: "start" | "end" | "middle"; size?: number };
const IX = 4; // FloraPlate: IX - 1 in-betweens per source frame (NNNN_1.png ...)
export const plateSrc = (id: string, n: number, c: number) => {
  c = Math.max(0, Math.min(n - 1, c));
  let base = Math.floor(c), sub = Math.round((c - base) * IX);
  if (sub >= IX) { base += 1; sub = 0; }
  if (base >= n - 1) { base = n - 1; sub = 0; }
  return `flora/${id}/${String(base + 1).padStart(4, "0")}${sub ? `_${sub}` : ""}.png`;
};
/** map keys as [comp frame, clip frame] (brand/edits/flora-anatomy/qa_omni.json: events and usable ranges); rotate: -90 turns a wide plate upright */
export const PlateMedia: React.FC<{ id: string; frames: FramesMeta; map: [number, number][]; w: number; h: number; labels?: PLabel[]; out?: number; ground?: string; rotate?: number;
  /** cover-crop on a region of the (portrait) plate: centre cx, cy and width cw as fractions of the plate; labels are then fractions of the box */
  crop?: { cx: number; cy: number; cw: number } }> = ({ id, frames, map, w, h, labels = [], out = Infinity, ground = "#fbfaf7", rotate = 0, crop }) => {
  const f = useCurrentFrame();
  const meta = frames[id];
  if (!meta) return <div style={{ width: w, height: h, background: ground, display: "flex", alignItems: "center", justifyContent: "center", ...caps(18, MUTED) }}>Plate {id} pending</div>;
  const c = clipAt(f, map);
  const asp = rotate ? 1 / meta.aspect : meta.aspect;
  let dw = Math.min(w, h * asp), dh = dw / asp, dx = (w - dw) / 2, dy = (h - dh) / 2;
  if (crop) { dw = w / crop.cw; dh = dw / asp; dx = w / 2 - crop.cx * dw; dy = h / 2 - crop.cy * dh; }
  const lx = (L: PLabel) => (crop ? L.x * w : dx + L.x * dw), ly = (L: PLabel) => (crop ? L.y * h : dy + L.y * dh);
  return (
    <div style={{ position: "relative", width: w, height: h, background: ground, overflow: "hidden" }}>
      {rotate ? <Img src={staticFile(plateSrc(id, meta.n, c))} style={{ position: "absolute", left: dx + dw / 2 - dh / 2, top: dy + dh / 2 - dw / 2, width: dh, height: dw, transform: `rotate(${rotate}deg)` }} />
        : <Img src={staticFile(plateSrc(id, meta.n, c))} style={{ position: "absolute", left: dx, top: dy, width: dw, height: dh }} />}
      {labels.map((L, i) => (
        <div key={i} style={{ position: "absolute", left: lx(L), top: ly(L), transform: `translate(${L.anchor === "end" ? "-100%" : L.anchor === "middle" ? "-50%" : "0"}, -50%)` }}>
          <div style={{ whiteSpace: "nowrap", ...caps(L.size ?? 19, INK), fontWeight: 600, textShadow: `0 0 5px ${ground}, 0 0 10px ${ground}`, ...life(f, L.s + 1, out, 8) }}>{L.text}</div>
        </div>
      ))}
    </div>
  );
};

/** a wide plate card for a face-free band (the syringe over the injection close-up): eyebrow + title left, the drawing right */
export const WidePlateCard: React.FC<{ s: number; out: number; x: number; y: number; w: number; h: number; eyebrow: string; title: string; media: React.ReactNode; tw?: number }> = ({ s, out, x, y, w, h, eyebrow, title, media, tw = 300 }) => {
  const f = useCurrentFrame();
  if (f < s || f > out + 10) return null;
  return (
    <div style={{ ...card(26), left: x, top: y, width: w, height: h, ...life(f, s + 1, out) }}>
      <div style={{ position: "absolute", left: 26, top: 28, width: tw - 40 }}>
        <div style={{ font: `500 17px/1 ${FONT}`, letterSpacing: "0.13em", textTransform: "uppercase", color: MUTED }}>{eyebrow}</div>
        <div style={{ font: `600 38px/1.1 ${FONT}`, letterSpacing: "-0.01em", marginTop: 10, color: INK }}>{title}</div>
        <div style={{ ...caps(14, MUTED), marginTop: 14, letterSpacing: "0.06em" }}>Illustration</div>
      </div>
      <div style={{ position: "absolute", left: tw, top: 10, width: w - tw - 10, height: h - 20, borderRadius: 18, overflow: "hidden" }}>{media}</div>
    </div>
  );
};

/** the STANDARD ClipCard (standard.tsx ClipCardStd) with a shorter media window, for the band between a face and the captions */
export const CardV4: React.FC<{ media: React.ReactNode; caps: string; title: string; s: number; out: number; left: number; top: number; mediaH?: number; mark?: React.ReactNode; dim?: boolean; note?: string; cutOut?: boolean }> = ({ media, caps: eyebrow, title, s, out, left, top, mediaH = 210, mark, dim, note, cutOut }) => {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  if (frame < s || frame > out + (cutOut ? 0 : 10)) return null; // cutOut: leaves on the picture cut, no exit over the next shot
  const t = frame / fps;
  return (
    <div style={{ ...card(26), left, top, width: 440, ...enterV4(t, s / fps, cutOut ? Infinity : out / fps) }}>
      <div style={{ margin: 10, height: mediaH, borderRadius: 18, overflow: "hidden", opacity: dim ? 0.55 : 1, filter: dim ? "saturate(.5)" : undefined }}>{media}</div>
      <div style={{ padding: "4px 22px 16px" }}>
        <div style={{ font: `500 17px/1 ${FONT}`, letterSpacing: "0.13em", textTransform: "uppercase", color: MUTED }}>{eyebrow}{note ? ` · ${note}` : ""}</div>
        <div style={{ font: `600 36px/1.1 ${FONT}`, letterSpacing: "-0.01em", marginTop: 6, color: INK }}>{title}</div>
        {mark}
      </div>
    </div>
  );
};

/** a narrow plate card for a face-free column: eyebrow + title on top, the drawing under it */
export const TallPlateCard: React.FC<{ s: number; out: number; x: number; y: number; w: number; eyebrow: string; title: string; media: React.ReactNode }> = ({ s, out, x, y, w, eyebrow, title, media }) => {
  const f = useCurrentFrame();
  if (f < s || f > out + 10) return null;
  return (
    <div style={{ ...card(26), left: x, top: y, width: w, ...life(f, s + 1, out) }}>
      <div style={{ margin: 10, borderRadius: 18, overflow: "hidden" }}>{media}</div>
      <div style={{ padding: "4px 20px 18px" }}>
        <div style={{ font: `500 17px/1 ${FONT}`, letterSpacing: "0.13em", textTransform: "uppercase", color: MUTED }}>{eyebrow}</div>
        <div style={{ font: `600 36px/1.1 ${FONT}`, letterSpacing: "-0.01em", marginTop: 8, color: INK }}>{title}</div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ the surgeon's marks --------------------------------------------- */
// drawn in the registered reference face's pixels (1080 x 1920); `sw` divides stroke widths so they read the same at any zoom
type Ev = { rim: number; trough: number; entry: number; paths: number; fan: number; deposit: number; side?: [number, number] };
const d2 = (pts: number[][]) => "M" + pts.map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" L");
export const PlanMarks: React.FC<{ data: SketchData; f: number; ev: Ev; sw?: number; pulse?: number; faint?: number }> = ({ data, f, ev, sw = 1, pulse, faint = 1 }) => {
  const parts: React.ReactNode[] = [];
  data.order.forEach((key, si) => {
    const d = data.sides[key] as SketchData["sides"][string] & { trough?: number[][] };
    if (!d) return;
    const lag = si * 4;
    const rim = data.rim?.[key];
    const q = (s: number, dur: number) => p(f, s + 1 + lag, dur, "sweep");
    if (rim) parts.push(<path key={`r${si}`} d={d2(rim)} fill="none" stroke={PEN} strokeWidth={2.4 / sw} strokeDasharray={`${8 / sw} ${6 / sw}`} strokeLinecap="round" opacity={0.85 * q(ev.rim, 12)} />);
    // the fan: from the entry to both ends of the trough, a light wedge (the cannula sweeps under the muscle across the trough)
    const tr = d.trough ?? d.hollow.slice(Math.floor(d.hollow.length / 2));
    const e = d.entry, a = tr[0], b = tr[tr.length - 1];
    const fq = q(ev.fan, 14);
    if (fq > 0) parts.push(<path key={`f${si}`} d={`M${e[0]},${e[1]} L${e[0] + (a[0] - e[0]) * fq},${e[1] + (a[1] - e[1]) * fq} L${e[0] + (b[0] - e[0]) * fq},${e[1] + (b[1] - e[1]) * fq} Z`}
      fill="rgba(244,247,251,.16)" stroke={PEN} strokeWidth={1.2 / sw} strokeDasharray={`${3 / sw} ${4 / sw}`} opacity={0.9} />);
    // the deposit zone: the hollow, hatched (filler deep, on the bone)
    const hid = `hatch4${si}`, hq = q(ev.deposit, 12);
    const strong = ev.side && f > ev.side[si] ? 1 : 0.85;
    if (hq > 0) parts.push(
      <g key={`h${si}`} opacity={hq * strong}>
        <defs><pattern id={hid} width={9 / sw} height={9 / sw} patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1={0} y1={0} x2={0} y2={9 / sw} stroke={PEN} strokeWidth={1.5 / sw} /></pattern></defs>
        <polygon points={d.hollow.map((v) => v.join(",")).join(" ")} fill={`url(#${hid})`} stroke="none" />
      </g>);
    // the trough line itself, heavier on the side he calls deeper
    parts.push(<path key={`t${si}`} d={d2(tr)} fill="none" stroke={PEN} strokeWidth={(ev.side && f > ev.side[si] ? 4.2 : 2.8) / sw} strokeLinecap="round" pathLength={1} strokeDasharray={`${q(ev.trough, 12)} 1`} />);
    // the read cannula axes, entry -> trough
    d.strokes.forEach((st, k) => {
      const [s0, s1] = st, sq = q(ev.paths + k * 5, 10);
      parts.push(<path key={`s${si}${k}`} d={`M${s0[0]},${s0[1]} L${s1[0]},${s1[1]}`} stroke={PEN} strokeWidth={3.4 / sw} strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={`${sq} 1`} />);
    });
    // x at the entry; on `pulse` it rings once (the one pinprick)
    const xq = q(ev.entry, 6), r = 13 / sw;
    const pz = pulse !== undefined ? 1 + 0.45 * Math.sin(Math.PI * clamp((f - pulse - lag) / 14)) : 1;
    parts.push(<path key={`x${si}`} d={`M${e[0] - r * pz},${e[1] - r * pz} L${e[0] + r * pz},${e[1] + r * pz} M${e[0] + r * pz},${e[1] - r * pz} L${e[0] - r * pz},${e[1] + r * pz}`}
      stroke={PEN} strokeWidth={4.6 / sw} strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={`${xq} 1`} />);
  });
  return <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: faint, filter: "drop-shadow(0 1px 2px rgba(0,0,0,.6))" }}>{parts}</svg>;
};

/** measured lightening on the trough (sketch.arrows: L* change, registered Sept 20 -> Oct 4): a bar per point, k px per L* */
export const ChangeBars: React.FC<{ data: SketchData; f: number; s: number; sw?: number; k?: number }> = ({ data, f, s, sw = 1, k = 2.4 }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.65))" }}>
    {data.arrows.map((a, i) => {
      const q = p(f, s + 1 + i * 2, 10, "sweep");
      if (q <= 0) return null;
      const x = a.at[0], y0 = a.at[1] + 4, len = a.change * k * q;
      return <g key={i}>
        <line x1={x} y1={y0} x2={x} y2={y0 + len} stroke={WHITE} strokeWidth={6 / sw} strokeLinecap="butt" />
        <line x1={x - 6 / sw} y1={y0 + len} x2={x + 6 / sw} y2={y0 + len} stroke={WHITE} strokeWidth={2 / sw} />
      </g>;
    })}
  </svg>
);

/* ------------------------------------------------------------------ legend ------------------------------------------------------------ */
export type LegendRow = { glyph: "x" | "path" | "fan" | "hatch" | "rim" | "bar" | "trough"; text: string; s: number };
const Glyph: React.FC<{ g: LegendRow["glyph"]; color: string }> = ({ g, color }) => (
  <svg width={46} height={30} viewBox="0 0 46 30" style={{ flex: "none", overflow: "visible" }}>
    {g === "x" && <path d="M14,6 L32,24 M32,6 L14,24" stroke={color} strokeWidth={4.5} strokeLinecap="round" />}
    {g === "path" && <line x1={4} y1={24} x2={42} y2={6} stroke={color} strokeWidth={3.5} strokeLinecap="round" />}
    {g === "fan" && <path d="M4,26 L42,4 L42,22 Z" fill="rgba(244,247,251,.25)" stroke={color} strokeWidth={1.5} strokeDasharray="3 3" />}
    {g === "hatch" && <g stroke={color} strokeWidth={2}><path d="M6,26 L18,4 M16,26 L28,4 M26,26 L38,4 M36,26 L44,12" /></g>}
    {g === "rim" && <line x1={2} y1={15} x2={44} y2={15} stroke={color} strokeWidth={3} strokeDasharray="7 5" />}
    {g === "trough" && <path d="M2,10 Q23,26 44,10" fill="none" stroke={color} strokeWidth={3.5} />}
    {g === "bar" && <g stroke={color}><line x1={12} y1={4} x2={12} y2={26} strokeWidth={6} /><line x1={24} y1={10} x2={24} y2={26} strokeWidth={6} /><line x1={36} y1={2} x2={36} y2={26} strokeWidth={6} /></g>}
  </svg>
);
export const Legend: React.FC<{ rows: LegendRow[]; x: number; y: number; w: number; out: number; head?: string; headS?: number; size?: number }> = ({ rows, x, y, w, out, head, headS = 0, size = 22 }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w }}>
      {head && <div style={{ ...caps(20, "rgba(255,255,255,.8)"), marginBottom: 12, ...life(f, headS + 1, out, 8) }}>{head}</div>}
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10, ...life(f, r.s + 1, out, 8) }}>
          <Glyph g={r.glyph} color={WHITE} />
          <span style={{ ...caps(size, WHITE), fontWeight: 600, textShadow: "0 1px 6px rgba(0,0,0,.55)" }}>{r.text}</span>
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ before / after window ------------------------------------------- */
// the STANDARD SkinWindow (standard.tsx) with three v4 changes: the pill and every word sit OUTSIDE the photo (no text on her face); the
// marks are the technical plan + the measured change bars; the window is smaller (maxw) so it fits between her chin and the captions.
export const BAWindowV4: React.FC<{
  s: number; out: number; crop: Crop; top?: number; before: string; after?: string; swapS?: number; data?: SketchData; marksS?: number; pulse?: number;
  barsS?: number; labels?: { before: string; after: string }; note?: (f: number) => string; credit?: string; bare?: boolean; maxw?: number;
}> = ({ maxw = 520, s, out, crop, top = CHEST_T, before, after, swapS = Infinity, data, marksS = Infinity, pulse, barsS = Infinity, labels = { before: "Before", after: "After" }, note, credit, bare }) => {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  if (frame < s || frame > out + 8) return null;
  const t = (frame - s) / fps;
  const PAD = 10;
  const IW = maxw - 2 * PAD, IH = (IW * crop.h) / crop.w;
  const CW = IW + 2 * PAD, CH = IH + 2 * PAD, X = (1080 - CW) / 2, Y = top;
  const q = clamp(t / 0.36), o = clamp((frame - out) / 8);
  const sc = (0.9 + 0.1 * quint(q)) * (1 - 0.04 * o);
  const op = clamp(q * 2.5) * (1 - o);
  const k = IW / crop.w;
  const wipe = p(frame, swapS + 1, 24, "sweep");
  const isAfter = wipe > 0.5;
  const drift = 1 + 0.02 * clamp((frame - s) / 150);
  const face = (src: string) => <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920 }} />;
  const sw = k * drift;
  const ev = { rim: marksS, trough: marksS + 4, entry: marksS + 10, paths: marksS + 16, fan: marksS + 24, deposit: marksS + 30 };
  const txt = note?.(frame);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: op }}>
      <div style={{ ...glass(30), left: X, top: Y, width: CW, height: CH, transform: `scale(${sc})`, transformOrigin: "50% 40%" }}>
        <div style={{ position: "absolute", left: PAD, top: PAD, width: IW, height: IH, borderRadius: 22, overflow: "hidden" }}>
          {!bare && <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "0 0",
            transform: `translate(${-crop.x * k}px, ${-crop.y * k}px) scale(${k}) translate(${crop.x + crop.w / 2}px, ${crop.y + crop.h / 2}px) scale(${drift}) translate(${-(crop.x + crop.w / 2)}px, ${-(crop.y + crop.h / 2)}px)` }}>
            {face(before)}
            {after && <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - wipe * 100}% 0 0)` }}>{face(after)}</div>}
            {data && <PlanMarks data={data} f={frame} ev={ev} sw={sw} pulse={pulse} faint={isAfter ? 0.55 : 1} />}
            {data && <ChangeBars data={data} f={frame} s={barsS} sw={sw} />}
          </div>}
          {wipe > 0 && wipe < 1 && <div style={{ position: "absolute", top: 0, bottom: 0, left: `${wipe * 100}%`, width: 3, background: "rgba(255,255,255,.9)" }} />}
        </div>
      </div>
      {/* every word beside or under the photo, none on it: the pill left of the window, the credit under the pill, the key to the marks under the window */}
      {t >= 0.3 && <Chip at={{ x: X - 14, y: Y + 40 }} side="left" text={isAfter ? labels.after : labels.before} s={1} o={clamp((t - 0.3) / 0.15) * (1 - o)} />}
      {credit && <div style={{ position: "absolute", right: W - X + 14, top: Y + 74, width: X - M + 10, textAlign: "right", color: "rgba(255,255,255,.85)", font: `500 16px/1.3 ${FONT}`, textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>{credit}</div>}
      {txt && <div style={{ position: "absolute", left: X + 6, top: Y + CH + 8, width: CW + 200, ...caps(19, WHITE), fontWeight: 600, textShadow: "0 1px 5px rgba(0,0,0,.6)" }}>{txt}</div>}
    </div>
  );
};

/* ------------------------------------------------------------------ end card ---------------------------------------------------------- */
export const EndCardLow: React.FC<{ s: number; top: number }> = ({ s, top }) => {
  const frame = useCurrentFrame();
  const q = p(frame, s + 2, 14, "arrive");
  return (
    <div style={{ ...card(32), left: 150, top, width: 780, padding: "44px 50px 40px", textAlign: "center", opacity: q, transform: `translateY(${(1 - q) * 16}px)` }}>
      <div style={{ font: `600 68px/1.1 ${FONT}`, letterSpacing: "-0.015em", color: INK }}>Book a consultation.</div>
      <div style={{ font: `500 48px/1.2 ${FONT}`, color: MUTED, marginTop: 12 }}>Link in bio.</div>
      <div style={{ height: 2, background: "rgba(29,34,48,.15)", margin: "32px auto 24px", width: "100%" }} />
      <div style={{ font: `500 34px/1 ${FONT}`, letterSpacing: "0.06em", color: INK }}>@drarielostad</div>
    </div>
  );
};
