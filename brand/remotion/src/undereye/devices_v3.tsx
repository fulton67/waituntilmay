// Under-eye filler reel v3 (CRITIQUE_v2.md): the topic-only devices and the card system for this edit.
//   SectionDiagram : the tear trough in section, the model's own lines (face.glb cut through her right pupil line by
//                    brand/scripts/undereye_section_lines.py; nothing drawn from memory). Modes: "hollow" (the shadow in the dip over the
//                    orbital rim), "deep" (filler placed deep on the bone under the muscle vs just under the skin), "tyndall" (light into a
//                    shallow deposit scatters back blue; the deep deposit shows none). Marked ostad_check: pending in beats_v2.json.
//   GlideAnim      : a needle's straight path pierces a vessel; the blunt cannula's rounded tip slides around it (topic-only).
//   SyringeLido    : the syringe barrel with the HA gel, and the lidocaine dissolved in it (one object, not a word).
//   FanMap         : the read entry point and cannula paths, mapped onto her face in the footage every frame (head track).
//   ChapterCard    : RULES "Title and section cards": number + rule + "Chapter", title typed in 12 f, held 60 f fully lit, out 8 f,
//                    >= 120 px, full frame over the moving picture with a left darkening 0.72 -> 0.18.
//   EndCardClean   : the end card over the sharp last shot (no blur: Naim "no full blur").
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FONT } from "../brand";
import { card } from "../components/Ro";
import { INK, MUTED, WHITE, p, type Pt } from "./look";

export type SectionLines = { segments: Record<string, Record<string, number[][]>> };
const LAYER_STYLE: Record<string, { w: number; o: number }> = {
  epidermis: { w: 3.2, o: 1 }, muscle: { w: 1.6, o: 0.75 }, fat_superficial: { w: 1.1, o: 0.45 }, fat_deep: { w: 1.1, o: 0.45 },
  bone: { w: 4, o: 1 }, eye: { w: 1.4, o: 0.55 }, vessel_artery: { w: 1.6, o: 0.7 },
};

// view: u (mm forward) from u0..u1 maps right-to-left (the face looks left), v (mm up) from v1 (top) .. v0 (bottom)
const VIEW = { u0: -12, u1: 16, v0: -32, v1: -6 };
const TROUGH = { u: 7.0, v: -21 }; // the lid-cheek junction on the model's skin line (section_lines.json, v -20..-24 mm)
const RIM = { u: -2.0, v: -25 };   // the front of the infra-orbital rim on the bone line (v -24..-28 mm)

export const SectionDiagram: React.FC<{ lines: SectionLines; w: number; h: number; mode: "hollow" | "deep" | "tyndall"; s: number }> = ({ lines, w, h, mode, s }) => {
  const frame = useCurrentFrame();
  const S = Math.min(w / (VIEW.u1 - VIEW.u0), h / (VIEW.v1 - VIEW.v0));
  const X = (u: number) => w / 2 - (u - (VIEW.u0 + VIEW.u1) / 2) * S;
  const Y = (v: number) => h / 2 - (v - (VIEW.v0 + VIEW.v1) / 2) * S;
  const draw = p(frame, s + 1, 18, "sweep");
  const segs: React.ReactNode[] = [];
  for (const [lid, objs] of Object.entries(lines.segments)) {
    const st = LAYER_STYLE[lid] ?? { w: 1, o: 0.4 };
    for (const [name, list] of Object.entries(objs)) {
      const d = list.map(([a, b, c, e]) => `M${X(a).toFixed(1)},${Y(b).toFixed(1)}L${X(c).toFixed(1)},${Y(e).toFixed(1)}`).join("");
      segs.push(<path key={name} d={d} stroke={WHITE} strokeWidth={st.w} opacity={st.o * draw} fill="none" strokeLinecap="round" />);
    }
  }
  const tq = p(frame, s + 20, 14, "arrive");
  const lab = (x: number, y: number, t: string, anchor: "start" | "end" = "start") => (
    <text x={x} y={y} fill={WHITE} opacity={tq} fontFamily={FONT} fontSize={28} letterSpacing="0.1em" textAnchor={anchor} style={{ textTransform: "uppercase" }}>{t}</text>
  );
  const tr = { x: X(TROUGH.u), y: Y(TROUGH.v) }, rim = { x: X(RIM.u), y: Y(RIM.v) };
  // deposits: deep = on the bone at the rim, under the muscle; shallow = just under the skin at the trough
  const deep = { x: rim.x - 3 * S * 0.2, y: rim.y - 2.2 * S }, shallow = { x: tr.x + 1.4 * S, y: tr.y };
  const dq = p(frame, s + 26, 16, "sweep");
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "hidden" }}>
      <rect width={w} height={h} fill="rgba(29,34,48,1)" />
      {segs}
      {mode === "hollow" && (
        <>
          {/* overhead light: it lands on the rim and the cheek, and cannot reach into the dip, so the hollow reads as a tired shadow */}
          <polygon points={`${rim.x - 60},0 ${rim.x + 90},0 ${tr.x + 30},${tr.y - 30} ${rim.x - 10},${rim.y - 10}`} fill="rgba(255,255,255,.16)" opacity={tq} />
          <line x1={rim.x + 20} y1={0} x2={rim.x} y2={rim.y - 12} stroke={WHITE} strokeWidth={3} opacity={tq} strokeDasharray="10 8" />
          <ellipse cx={tr.x - 10} cy={tr.y} rx={40} ry={24} fill="rgba(0,0,0,.55)" opacity={tq} style={{ filter: "blur(8px)" }} />
          {lab(tr.x + 22, tr.y + 6, "HOLLOW")}
          {lab(rim.x - 14, rim.y + 30, "RIM", "end")}
        </>
      )}
      {mode === "deep" && (
        <>
          <ellipse cx={deep.x} cy={deep.y} rx={26 * dq} ry={16 * dq} fill="rgba(255,255,255,.85)" />
          {lab(deep.x - 34, deep.y - 22, "DEEP", "end")}
          <g opacity={0.45 * dq}>
            <ellipse cx={shallow.x} cy={shallow.y} rx={18} ry={9} fill="none" stroke={WHITE} strokeWidth={2} strokeDasharray="4 4" />
            {lab(shallow.x + 26, shallow.y + 6, "NOT SHALLOW")}
          </g>
        </>
      )}
      {mode === "tyndall" && (() => {
        // light enters from the front (left); a shallow deposit scatters short (blue) wavelengths back out: the bluish hue
        const ray = (y: number, hit: Pt, i: number) => {
          const x0 = 0, len = Math.hypot(hit.x - x0, hit.y - y);
          const q = Math.min(1, ((frame - s - 8 - i * 4) % 48) / 20);
          return <line key={i} x1={x0} y1={y} x2={x0 + (hit.x - x0) * q} y2={y + (hit.y - y) * q} stroke={WHITE} strokeWidth={2} opacity={0.7} strokeDasharray={`${len * 0.2} ${len * 0.05}`} />;
        };
        return (
          <>
            <ellipse cx={shallow.x} cy={shallow.y} rx={22} ry={11} fill="rgba(255,255,255,.75)" />
            <ellipse cx={deep.x} cy={deep.y} rx={26} ry={16} fill="rgba(255,255,255,.75)" />
            {[shallow.y - 14, shallow.y, shallow.y + 14].map((y, i) => ray(y, shallow, i))}
            {[0, 1, 2].map((i) => {
              const q = Math.max(0, Math.min(1, (((frame - s - 24 - i * 5) % 48) / 18)));
              const a = (-160 + i * 25) * Math.PI / 180;
              return <line key={`b${i}`} x1={shallow.x} y1={shallow.y} x2={shallow.x + Math.cos(a) * 90 * q} y2={shallow.y + Math.sin(a) * 90 * q}
                stroke="#6f8fc8" strokeWidth={3} opacity={0.9 * (1 - q * 0.3)} strokeLinecap="round" />; /* // lint-ok: example of the Tyndall effect (glossary), not markup */
            })}
            {lab(shallow.x + 30, shallow.y - 12, "BLUE")}
            {lab(deep.x - 34, deep.y + 34, "NO BLUE", "end")}
          </>
        );
      })()}
    </svg>
  );
};

// needle vs cannula at a vessel: the needle's straight line runs through the vessel; the cannula's path bends round it
export const GlideAnim: React.FC<{ w: number; h: number; s: number }> = ({ w, h, s }) => {
  const frame = useCurrentFrame();
  const n = p(frame, s + 1, 30, "sweep"), c = p(frame, s + 26, 36, "sweep");
  const vy = h * 0.5, vx = w * 0.62;
  const needleEnd = { x: 30 + (w - 60) * n, y: vy - 6 };
  const path = `M30,${vy + 46} C${w * 0.45},${vy + 46} ${vx - 40},${vy + 52} ${vx},${vy + 50} S${w * 0.85},${vy + 40} ${w - 30},${vy + 40}`;
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <rect width={w} height={h} fill="rgba(29,34,48,1)" />
      <line x1={0} y1={h * 0.2} x2={w} y2={h * 0.2} stroke={WHITE} strokeWidth={3} opacity={0.9} />
      <text x={12} y={h * 0.2 - 10} fill={WHITE} fontFamily={FONT} fontSize={28} letterSpacing="0.1em">SKIN</text>
      <ellipse cx={vx} cy={vy} rx={24} ry={20} fill="none" stroke={WHITE} strokeWidth={2.5} opacity={0.85} />
      <text x={vx + 30} y={vy - 22} fill={WHITE} fontFamily={FONT} fontSize={28} letterSpacing="0.1em">VESSEL</text>
      {/* needle: straight through */}
      <line x1={30} y1={vy - 6} x2={needleEnd.x} y2={needleEnd.y} stroke={MUTED} strokeWidth={4} strokeLinecap="butt" />
      <polygon points={`${needleEnd.x},${needleEnd.y} ${needleEnd.x - 18},${needleEnd.y - 5} ${needleEnd.x - 18},${needleEnd.y + 5}`} fill={MUTED} opacity={n > 0 ? 1 : 0} />
      {n > (vx - 30) / (w - 60) && <path d={`M${vx - 10},${vy - 16} L${vx + 10},${vy + 4} M${vx + 10},${vy - 16} L${vx - 10},${vy + 4}`} stroke={MUTED} strokeWidth={4} strokeLinecap="round" />}
      <text x={30} y={vy - 22} fill={MUTED} fontFamily={FONT} fontSize={28} letterSpacing="0.1em" opacity={n}>NEEDLE: THROUGH</text>
      {/* cannula: round tip slides around */}
      <path d={path} stroke={WHITE} strokeWidth={6} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={`${c} 1`} />
      <text x={30} y={vy + 80} fill={WHITE} fontFamily={FONT} fontSize={28} letterSpacing="0.1em" opacity={c}>CANNULA: AROUND</text>
    </svg>
  );
};

// the syringe: barrel, plunger, the HA gel inside, and the lidocaine dissolving into it
export const SyringeLido: React.FC<{ w: number; h: number; s: number }> = ({ w, h, s }) => {
  const frame = useCurrentFrame();
  const q = p(frame, s + 1, 20, "arrive"), d = p(frame, s + 14, 40, "settle");
  const bx = w * 0.12, by = h * 0.36, bw = w * 0.66, bh = h * 0.28;
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <rect width={w} height={h} fill="rgba(29,34,48,1)" />
      <g opacity={q}>
        <rect x={bx} y={by} width={bw} height={bh} rx={10} fill="rgba(255,255,255,.08)" stroke={WHITE} strokeWidth={2.5} />
        <rect x={bx + 6} y={by + 6} width={bw * 0.8} height={bh - 12} rx={6} fill="rgba(255,255,255,.55)" />
        <line x1={bx + bw} y1={by + bh / 2} x2={w - 20} y2={by + bh / 2} stroke={WHITE} strokeWidth={3} />
        <rect x={bx - 40} y={by + bh / 2 - 6} width={46} height={12} fill={WHITE} />
        <rect x={bx - 56} y={by - 6} width={16} height={bh + 12} rx={4} fill={WHITE} />
        {Array.from({ length: 14 }).map((_, i) => {
          const x = bx + 20 + ((i * 37) % (bw * 0.75)), y = by + 12 + ((i * 23) % (bh - 24));
          return <circle key={i} cx={x} cy={y} r={5 * (1 - d) + 1.2} fill={INK} opacity={0.8 * (1 - d * 0.7)} />;
        })}
      </g>
      <text x={bx} y={by - 18} fill={WHITE} fontFamily={FONT} fontSize={28} letterSpacing="0.1em" opacity={q}>HA GEL</text>
      <text x={bx} y={by + bh + 34} fill={WHITE} fontFamily={FONT} fontSize={28} letterSpacing="0.1em" opacity={d}>+ LIDOCAINE</text>
    </svg>
  );
};

// the fan map on her face: x at the read entry, the cannula paths drawn out from it in pen strokes (white, glass edge)
export const FanMap: React.FC<{ s: number; out: number; entry: (f: number) => Pt; ends: ((f: number) => Pt)[] }> = ({ s, out, entry, ends }) => {
  const frame = useCurrentFrame();
  if (frame < s || frame > out) return null;
  const e = entry(frame), xq = p(frame, s + 1, 6, "sweep");
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, filter: "drop-shadow(0 1px 3px rgba(0,0,0,.55))" }}>
      <path d={`M${e.x - 13},${e.y - 13}L${e.x + 13},${e.y + 13}M${e.x + 13},${e.y - 13}L${e.x - 13},${e.y + 13}`} stroke={WHITE} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={`${xq} 1`} />
      {ends.map((g, i) => {
        const b = g(frame), q = p(frame, s + 8 + i * 8, 12, "sweep");
        return <line key={i} x1={e.x} y1={e.y} x2={e.x + (b.x - e.x) * q} y2={e.y + (b.y - e.y) * q} stroke={WHITE} strokeWidth={i === 1 ? 4.5 : 3} strokeLinecap="round" opacity={0.95} />;
      })}
    </svg>
  );
};

// chapter card: number + rule + "Chapter", the title typed on (12 f), fully lit 60 f, out 8 f; full frame over the moving picture
export const ChapterCard: React.FC<{ num: string; title: string; s: number; size?: number; lines?: string[] }> = ({ num, title, s, size = 124, lines }) => {
  const frame = useCurrentFrame();
  const t = frame - s;
  if (t < 0 || t > 80) return null;
  const rows = lines ?? [title];
  const n = rows.join("").length;
  const head = Math.min(n, (t / 12) * n);
  const out = p(frame, s + 72, 8, "exit");
  const rule = p(frame, s, 12, "sweep") * (1 - out);
  let idx = 0;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(90deg, rgba(10,14,24,${0.72 * (1 - out)}) 0%, rgba(10,14,24,${0.18 * (1 - out)}) 100%)` }}>
      <div style={{ position: "absolute", left: 80, top: 640 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, opacity: 1 - out, marginBottom: 22 }}>
          <span style={{ font: `600 32px/1 ${FONT}`, letterSpacing: "0.2em", color: WHITE }}>{num}</span>
          <span style={{ width: 220, height: 3, background: WHITE, transformOrigin: "0 50%", transform: `scaleX(${rule})` }} />
          <span style={{ font: `500 28px/1 ${FONT}`, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,.85)" }}>Chapter</span>
        </div>
        {rows.map((r, ri) => (
          <div key={ri} style={{ font: `600 ${size}px/1.02 ${FONT}`, letterSpacing: "-0.01em", color: WHITE, textShadow: "0 2px 30px rgba(0,0,0,.4)", whiteSpace: "nowrap" }}>
            {r.split("").map((ch, i) => { const k = idx++; return <span key={i} style={{ opacity: (k < head ? 1 : 0) * (1 - out) }}>{ch}</span>; })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// end card over the sharp last shot: one glass card, no blur behind it
export const EndCardClean: React.FC<{ s: number }> = ({ s }) => {
  const frame = useCurrentFrame();
  const q = p(frame, s + 2, 14, "arrive");
  return (
    <div style={{ ...card(32), left: 120, top: 700, width: 840, padding: "56px 56px 48px", textAlign: "center", opacity: q, transform: `translateY(${(1 - q) * 16}px)` }}>
      <div style={{ font: `600 76px/1.1 ${FONT}`, letterSpacing: "-0.015em", color: INK }}>Book a consultation.</div>
      <div style={{ font: `500 54px/1.2 ${FONT}`, color: MUTED, marginTop: 14 }}>Link in bio.</div>
      <div style={{ height: 2, background: "rgba(29,34,48,.15)", margin: "40px auto 30px", width: "100%" }} />
      <div style={{ font: `500 36px/1 ${FONT}`, letterSpacing: "0.06em", color: INK }}>@drarielostad</div>
    </div>
  );
};
