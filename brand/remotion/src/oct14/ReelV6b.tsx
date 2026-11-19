// Oct14ReelV6b (coordinator round 2026-11-19, "no placeholder in the master"): V6 plus real objects cut from his own footage, objects at
// Laser Genesis presence (~900 px, 300-360 px loupes, 34-40 px labels), and the freeze guard (no OffthreadVideo past its source end).
// Oct14ReelV6 (coordinator round 2026-11-19): V5 with big:true, plus
//  - colour: every OffthreadVideo toneMapped={false} (Remotion's HDR tone map warmed the iPhone HLG clips R +11 G -15 B -20)
//  - no strike-through: the "fill the lines vs cheekbones" pair is a contrast (left text dimmed, right card lit), no chip over her face
//  - REAL OBJECTS (memory ostad-real-objects): the Evolysse syringes and the cannula vs needle float in as cut-outs (src/devices/RealObject)
//  - the plates, the contrast pair and the objects read their timing, strings, maps and layout from timelines/oct14.json
// Everything else as V5 (below).
// Oct14ReelV5 (client notes 2026-11-19 on v4). The v4 cut, audio and Flora plates, with three fixes:
//  1. "The drawings on the face don't really show the injections, just circles": the before/after is a full-frame surgeon's plan,
//     technical, every line measured (brand/scripts/oct14_v5_markup.py -> public/oct14/markup_v5.json): the 8 entry points read off his
//     injection clips (x), the cheekbone line where Evolysse Form went (needle, on the bone), the cannula passes of Evolysse Smooth from
//     their entry into the fold they treat (dashed, end stop), the treated folds (dotted), the neuromodulator point (dot), and the
//     MEASURED change drawn where it changed: the cheek shadow line before (dashed) / after (solid) with a dimension mark (9 px lower = 4 %
//     of face width) and the left laugh-line shadow depth. Product, amount and the numbers sit in a legend under her face, never on it.
//  2. "The drawings move over [drift]": every mark on moving footage uses public/oct14/tracks_v5.json (oct14_track_v5.py: per-frame
//     landmarks, zero-phase smoothing, no hold), mapped with the same frame the video shows; a frame with no face hides the mark.
//  3. "Text shouldn't go directly over the face, ever": every card / plate / title is placed by brand/scripts/oct14_layout_v5.py
//     (public/oct14/layout_v5.json) where no face is on any frame of its life, or shown on the cream room (takeover) with no footage
//     under it. No darkening ground over the picture. Check: research/ostad/style/oct14/face_clear.py on the render.
// layer prop: "all" (the reel) | "allowed" (picture + takeover ground + the pen markup only: face_clear's reference) |
// "footage" (picture only) | "probe" (picture + one coloured dot per tracked anchor: the tracking measure on rendered pixels).
import React from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { useElza } from "../Fonts";
import { NameCard } from "../components/NameCard";
import { Sfx, card } from "../components/Ro";
import { Arrow } from "../devices/Arrow";
import { WordCaptions } from "./devices";
import { MonthsRule } from "./beats";
import { DayLanes, SEC, SEC_LEN } from "./cards";
import { FloraPlate } from "../flora/FloraPlate";
import { RealObject } from "../devices/RealObject";
import { beat as tlBeat, plateMap, resolve, span, type Anchor, type Timeline } from "../timeline/timeline";
import TL from "../../timelines/oct14.json";
import { ClipCard, CW, type ClipSpec } from "./std";
import { PRESENCE } from "./v3";
import type { Oct14Props } from "./Reel";
import { D, FONT, H, INK, M, MUTED, W, WHITE, caps, disp, life, p, vis, type Pt } from "./look";

type Lay = { x?: number; y?: number; scale?: number; mode: "overlay" | "takeover"; s: number; e: number; tone?: "ink" | "white" };
type Track5 = { n: number; pts: Record<string, ([number, number] | null)[]> };
type Markup = {
  entries: { id: string; xy: [number, number]; product: string; order: number }[]; bones: Record<string, [number, number][]>; folds: Record<string, [number, number][]>;
  passes: { id: string; from: string; pts: [number, number][] }[]; contour: { before: [number, number][]; after: [number, number][]; shift_px: number; shift_pct_face_width: number };
  fold_depth: Record<string, { before: number; after: number; change_pct_points: number; relative_change_pct: number; same_sign_share: number; reported: boolean }>;
};
export type Oct14V6bProps = Oct14V5Props & { tl?: Timeline };
export type Oct14V5Props = Oct14Props & { layer?: "all" | "allowed" | "footage" | "probe";
  /** v5c (coordinator 2026-11-19): the cream-room beats use the frame: plates ~1000 px wide, stacked pips full width, lone pip ~900 px */
  big?: boolean; tracks5: Record<string, Track5>; lay: Record<string, Lay>; markup: Markup;
  /** pieces shown as a still (oct14_still_v5.py): the mark on them uses the points detected on that very image */
  stills: Record<string, { piece: string; src_frame: number; pts: Record<string, [number, number]>; line?: [number, number][] }> };

const SRC = (role: string) => `oct14/${role}.mp4`;
const CREAM = "#f2efed";
let LAYER: NonNullable<Oct14V5Props["layer"]> = "all";
// pass (brand/scripts/reel.py --hdr, REELS.md "HDR master"): one layer of the reel on a transparent ground, without the footage:
// "over" = every graphic and still | "media" = only the clips shown inside cards. Unset = the normal reel, unchanged.
export type Pass = "over" | "media";
let PASS: Pass | undefined;
// at render an OffthreadVideo is an <img> served by Remotion's frame proxy: that is how a pass tells the card clips from the graphics
const PASS_CSS: Record<Pass, string> = { over: `img[src*="/proxy?src="]{visibility:hidden !important}`,
  media: `body *{visibility:hidden !important} body img[src*="/proxy?src="]{visibility:visible !important}` };
let ROOMS: [number, number][] = []; // takeover spans: no footage, so no mark on her face
const inRoom = (f: number) => ROOMS.some(([a, b]) => f >= a && f < b);
const gfx = () => LAYER === "all"; // cards, plates, titles, labels, captions
const marks = () => LAYER === "all" || LAYER === "allowed"; // the pen markup on her face (allowed over a face)
const PROBE = ["crowR", "marioR", "jawR", "chin", "malarR", "cheekR", "nasoL", "lipCL", "nasoR", "lipCR", "marioL", "glabella", "cheekL"];
export const probeColour = (k: string) => `hsl(${Math.round((PROBE.indexOf(k) * 360) / PROBE.length)}, 100%, 50%)`;

const Picture: React.FC<{ role: string; from: number; speed: number; punch?: number; o?: [number, number] }> = ({ role, from, speed, punch = 1, o }) => PASS ? null : (
  <OffthreadVideo src={staticFile(SRC(role))} trimBefore={Math.round(from * 24)} playbackRate={speed} muted toneMapped={false}
    style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover",
      transformOrigin: `${(o ? o[0] : 0.4) * 100}% ${(o ? o[1] : 0.42) * 100}%`, transform: `scale(${punch})` }} />
);

/** the cream room: a takeover ground (no footage under it) */
const Room: React.FC<{ s: number; e: number }> = ({ s, e }) => {
  const f = useCurrentFrame();
  if (f < s || f >= e) return null;
  const t = (f - s) / 24;
  return <div style={{ position: "absolute", inset: 0, background: `radial-gradient(120% 80% at ${70 + 6 * Math.sin(t / 3)}% ${18 + 4 * Math.cos(t / 4)}%, #faf8f5 0%, ${CREAM} 55%, #c3bdbb 140%)` }} />;
};

// ---------------------------------------------------------------------------------------------------------------------------------------
// Tracked pen marks (allowed over her face). Every point is a tracked landmark (+ a fixed px offset); any missing point hides the mark.
// A mark ends (exit included) before its shot cuts: it never rides into the next picture.
// ---------------------------------------------------------------------------------------------------------------------------------------
type TP = { role: string; key: string; dx?: number; dy?: number };
type Mapper = (role: string, key: string, f: number) => Pt | null;
const smoothPath = (P: Pt[]) => (P.length < 3 ? `M${P.map((q) => `${q.x},${q.y}`).join(" L")}` :
  "M" + P[0].x + "," + P[0].y + P.slice(1).map((q, i) => { const a = P[i]; return ` Q${a.x},${a.y} ${(a.x + q.x) / 2},${(a.y + q.y) / 2}`; }).join("") + ` L${P[P.length - 1].x},${P[P.length - 1].y}`);

const PenT: React.FC<{ pts: (TP | ((f: number) => Pt | null))[]; map: Mapper; s: number; out: number; d?: number; w?: number; dash?: string }> = ({ pts, map, s, out, d = 10, w = 4.5, dash }) => {
  const f = useCurrentFrame();
  if (!vis(f, s + 1, out) || inRoom(f)) return null;
  const P = pts.map((q) => (typeof q === "function" ? q(f) : (() => { const a = map(q.role, q.key, f); return a ? { x: a.x + (q.dx ?? 0), y: a.y + (q.dy ?? 0) } : null; })()));
  if (P.some((q) => !q)) return null;
  if (LAYER === "probe") {
    return <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      {pts.filter((q): q is TP => typeof q !== "function").map((q, i) => { const a = map(q.role, q.key, f)!; return <circle key={i} cx={a.x} cy={a.y} r={6} fill={probeColour(q.key)} />; })}
    </svg>;
  }
  if (!marks()) return null;
  const k = p(f, s + 1, d, "sweep"), e = p(f, out, D.exit, "exit");
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", filter: "drop-shadow(0 1px 3px rgba(6,10,20,.55))", opacity: 1 - e }}>
      <path d={smoothPath(P as Pt[])} fill="none" stroke={WHITE} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" pathLength={1}
        strokeDasharray={dash ? undefined : `${k} 1`} style={dash ? { strokeDasharray: dash, opacity: k } : undefined} />
    </svg>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------------------
// Titles with no darkening (one look for all: number + rule + "Chapter", the title typed under a travelling light, 60 f fully lit)
// ---------------------------------------------------------------------------------------------------------------------------------------
const cl = (v: number) => Math.min(1, Math.max(0, v));
const TypedTitle: React.FC<{ title: string; t: number; size: number; color: string; shadow: string }> = ({ title, t, size, color, shadow }) => {
  const n = title.length, rate = n / SEC.typeIn;
  const head = Math.min(n, t * rate), outT = t - (SEC.typeIn + SEC.hold);
  const gone = outT >= 0 ? Math.ceil(((outT + 1) / SEC.out) * n) : 0;
  return (
    <div style={{ position: "relative", font: `600 ${size}px/1.02 ${FONT}`, letterSpacing: "-0.015em", color, textShadow: shadow, whiteSpace: "nowrap" }}>
      {title.split("").map((ch, i) => {
        if (ch === "|") return <br key={i} />;
        const local = head - i + Math.max(0, t - SEC.typeIn) * rate;
        const a = cl(local / 1.5), blur = (1 - cl(local / 3)) * 6;
        return <span key={i} style={{ opacity: i < n - gone ? a : 0, filter: blur > 0.05 ? `blur(${blur}px)` : undefined, display: "inline-block", whiteSpace: "pre" }}>{ch}</span>;
      })}
    </div>
  );
};
const Chapter: React.FC<{ num: string; title: string; start: number; L: Lay; kicker?: string; size?: number; sub?: string }> = ({ num, title, start, L, kicker = "Chapter", size = 118, sub }) => {
  const f = useCurrentFrame(), t = f - start;
  if (t < 0 || t > SEC_LEN) return null;
  const ink = L.tone === "ink";
  const col = ink ? INK : WHITE, shadow = ink ? "0 1px 0 rgba(255,255,255,.35)" : PRESENCE;
  const rule = p(f, start, SEC.typeIn, "sweep") * (1 - p(f, start + SEC.typeIn + SEC.hold, SEC.out, "exit"));
  const take = L.mode === "takeover";
  const y = take ? 760 : L.y!, sc = take ? 1 : L.scale ?? 1;
  return (
    <div style={{ position: "absolute", left: take ? M : L.x!, top: y, width: W - 2 * M, transform: `scale(${sc})`, transformOrigin: "0 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 22, opacity: rule, textShadow: shadow }}>
        {sub ? <span style={{ ...caps(26, col), letterSpacing: "0.18em" }}>{sub}</span> : <>
          <span style={{ ...caps(30, col), letterSpacing: "0.2em" }}>{num}</span>
          <span style={{ width: 200, height: 3, borderRadius: 2, background: col, transformOrigin: "0 50%", transform: `scaleX(${rule})` }} />
          <span style={{ ...caps(26, col) }}>{kicker}</span></>}
      </div>
      <TypedTitle title={title} t={t} size={size} color={take ? INK : col} shadow={take ? "none" : shadow} />
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------------------
// The opening: the result full frame (the same aligned pair), the measured cheek line; the time label under her chin (off the face)
// ---------------------------------------------------------------------------------------------------------------------------------------
const Hook: React.FC<{ crop: { x: number; y: number; w: number }; out: number; contour: { before: [number, number][]; after: [number, number][] } }> = ({ crop, out, contour }) => {
  const f = useCurrentFrame();
  if (f > out + 8) return null;
  const iw = 1080, ih = 1920, k = 1080 / (crop.w * iw);
  const fy = crop.y * ih + 170;
  const ox = -crop.x * iw * k, oy = -(fy - 1920 / k / 2) * k;
  const wipe = p(f, 4, 22, "sweep"), lineK = p(f, 22, 10, "sweep"), o = 1 - p(f, out, 8, "exit");
  const img = (src: string) => <Img src={staticFile(src)} style={{ position: "absolute", left: ox, top: oy, width: iw * k, height: ih * k, maxWidth: "none" }} />;
  const T = (q: [number, number]) => `${ox + q[0] * k},${oy + q[1] * k}`;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, overflow: "hidden" }}>
      {img("oct14/before.jpg")}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${wipe * 100}%`, overflow: "hidden" }}>{img("oct14/after_aligned.jpg")}</div>
      {wipe > 0 && wipe < 1 && <div style={{ position: "absolute", left: `${wipe * 100}%`, top: 0, bottom: 0, width: 3, marginLeft: -1.5, background: "#fff" }} />}
      {marks() && lineK > 0 && <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <path d={"M" + contour.before.map(T).join(" L")} fill="none" stroke="#fff" strokeWidth={4} strokeDasharray="10 9" opacity={0.9 * lineK} />
        <path d={"M" + contour.after.map(T).join(" L")} fill="none" stroke="#fff" strokeWidth={5} pathLength={1} strokeDasharray={`${lineK} 1`} />
      </svg>}
      {gfx() && <div style={{ position: "absolute", left: M, top: 1500, ...caps(24, "#fff"), textShadow: "0 1px 6px rgba(0,0,0,.5)", opacity: p(f, 6, 8, "arrive") }}>
        {wipe < 0.5 ? "4:42 PM · before" : "4:55 PM · right after"}
      </div>}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------------------
// The surgeon's plan (full frame): her registered 4:42 PM frame, the technical markup in treatment order, a line wipe to 4:55 PM under
// the markup, then the measured change. Legend (product, amount, numbers) on glass under her face.
// ---------------------------------------------------------------------------------------------------------------------------------------
export const PLAN = { k: 2.6, cx: 205, cy: 880, X: 540, Y: 720 }; // source face centre -> comp
const SurgeonPlan: React.FC<{ m: Markup; s: number; wipeS: number; out: number; facts: { k: string; v: string; s: number }[] }> = ({ m, s, wipeS, out, facts }) => {
  const f = useCurrentFrame();
  if (!vis(f, s + 1, out)) return null;
  const drift = 1 + 0.015 * cl((f - s) / Math.max(1, out - s));
  const k = PLAN.k * drift;
  const T = (q: [number, number]): Pt => ({ x: PLAN.X + (q[0] - PLAN.cx) * k, y: PLAN.Y + (q[1] - PLAN.cy) * k });
  const img = (src: string) => <Img src={staticFile(src)} style={{ position: "absolute", maxWidth: "none", width: 1080 * k, height: 1920 * k, left: PLAN.X - PLAN.cx * k, top: PLAN.Y - PLAN.cy * k }} />;
  const plate = p(f, s + 1, 10, "arrive"), e = p(f, out, D.exit, "exit");
  const wipe = p(f, wipeS + 1, D.bar, "sweep");
  const after = wipe >= 0.5;
  const dim = 1 - 0.5 * p(f, wipeS + D.bar, 12, "arrive"); // the plan steps back once the result is in
  const t0 = s + 12, step = 9;
  const at = (i: number) => t0 + i * step;
  const sw = (i: number, d = 10) => p(f, at(i), d, "sweep");
  const d = (pts: Pt[]) => pts.map((q, i) => `${i ? "L" : "M"}${q.x},${q.y}`).join(" ");
  const X = (c: Pt, r: number, q: number) => `M${c.x - r},${c.y - r} L${c.x - r + 2 * r * Math.min(1, q * 2)},${c.y - r + 2 * r * Math.min(1, q * 2)}` +
    (q > 0.5 ? ` M${c.x + r},${c.y - r} L${c.x + r - 2 * r * (q - 0.5) * 2},${c.y - r + 2 * r * (q - 0.5) * 2}` : "");
  const order = { "Evolysse Form": 0, "Evolysse Smooth": 3, Neuromodulator: 6 } as Record<string, number>;
  // measured change: the cheek shadow line, dimension mark at its middle column
  const cb = m.contour.before.map(T), ca = m.contour.after.map(T);
  const mid = Math.floor(cb.length * 0.55);
  const chg = p(f, wipeS + D.bar + 4, 14, "sweep");
  const fd = m.fold_depth.naso_L;
  const leg = (i: number) => life(f, at(i) + 4, out, 8);
  const row = (glyph: React.ReactNode, text: React.ReactNode, i: number, st?: React.CSSProperties) => (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 10, ...st }}>
      <svg width={54} height={24} style={{ flex: "none", overflow: "visible" }}>{glyph}</svg>
      <div style={{ font: `500 25px/1.18 ${FONT}`, color: INK }}>{text}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{ opacity: 1 - e }}>
      <AbsoluteFill style={{ opacity: plate, overflow: "hidden" }}>
        {img("oct14/before.jpg")}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: W * wipe, overflow: "hidden" }}>{img("oct14/after_aligned.jpg")}</div>
        {wipe > 0 && wipe < 1 && <div style={{ position: "absolute", left: W * wipe - 1.5, top: 0, bottom: 0, width: 3, background: WHITE }} />}
      </AbsoluteFill>
      {marks() && <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", filter: "drop-shadow(0 1px 3px rgba(6,10,20,.55))" }}>
        <g opacity={dim}>
          {/* Evolysse Form: the cheekbone line (needle, deep on the bone) */}
          {[m.bones.R].map((b, i) => <path key={i} d={smoothPath(b.map(T))} fill="none" stroke={WHITE} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={`${sw(order["Evolysse Form"] + i)} 1`} />)}
          {/* the treated folds (dotted) */}
          {Object.entries(m.folds).map(([id, q], i) => <path key={id} d={smoothPath(q.map(T))} fill="none" stroke={WHITE} strokeWidth={3} strokeLinecap="round" strokeDasharray="0.1 9" opacity={sw(order["Evolysse Smooth"] + (i % 2))} />)}
          {/* Evolysse Smooth: the cannula passes, entry -> fold, with an end stop */}
          {m.passes.map((q, i) => {
            const a = T(q.pts[0]), b = T(q.pts[1]), kk = sw(order["Evolysse Smooth"] + 1 + (i % 2), 12);
            const L = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
            const tip = { x: a.x + (b.x - a.x) * kk, y: a.y + (b.y - a.y) * kk };
            return <g key={q.id}>
              <path d={d([a, tip])} stroke={WHITE} strokeWidth={4} strokeDasharray="14 8" fill="none" strokeLinecap="round" />
              {kk >= 1 && <path d={`M${b.x - uy * 10},${b.y + ux * 10} L${b.x + uy * 10},${b.y - ux * 10}`} stroke={WHITE} strokeWidth={4} strokeLinecap="round" />}
            </g>;
          })}
          {/* entry points (x) and the neuromodulator point (dot) */}
          {m.entries.map((q) => {
            const c = T(q.xy), i = order[q.product] + (q.product === "Neuromodulator" ? 0 : 0.5);
            if (q.product === "Neuromodulator") return <circle key={q.id} cx={c.x} cy={c.y} r={7 * p(f, at(i), 6, "arrive")} fill={WHITE} />;
            return <path key={q.id} d={X(c, 11, p(f, at(i), 8, "sweep"))} stroke={WHITE} strokeWidth={4.5} strokeLinecap="round" fill="none" />;
          })}
        </g>
        {/* the measured change, drawn where it changed: before dashed, after solid, a dimension mark between them */}
        {/* the second measured change: her left laugh line, where its shadow depth was read (9 stations), drawn solid once the row is in */}
        {fd.reported && f > wipeS + D.bar + 14 && <path d={smoothPath(m.folds.naso_L.map(T))} fill="none" stroke={WHITE} strokeWidth={4} strokeLinecap="round"
          pathLength={1} strokeDasharray={`${p(f, wipeS + D.bar + 15, 12, "sweep")} 1`} />}
        {chg > 0 && <g>
          <path d={d(cb)} fill="none" stroke={WHITE} strokeWidth={3.5} strokeDasharray="9 8" opacity={chg} />
          <path d={d(ca)} fill="none" stroke={WHITE} strokeWidth={5} pathLength={1} strokeDasharray={`${chg} 1`} />
          {chg >= 1 && <g stroke={WHITE} strokeWidth={3} strokeLinecap="round">
            <path d={`M${cb[mid].x},${cb[mid].y - 14} L${cb[mid].x},${ca[mid].y + 14}`} />
            <path d={`M${cb[mid].x - 9},${cb[mid].y} L${cb[mid].x + 9},${cb[mid].y}`} />
            <path d={`M${ca[mid].x - 9},${ca[mid].y} L${ca[mid].x + 9},${ca[mid].y}`} />
          </g>}
        </g>}
      </svg>}
      {gfx() && <div style={{ ...card(24), left: M, top: 1150, width: W - 2 * M, height: 424, padding: "20px 28px", boxSizing: "border-box", ...life(f, s + 8, out) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ ...caps(21, MUTED) }}>{after ? "After · 4:55 PM" : "Before · 4:42 PM"} · his plan, measured</div>
          <div style={{ font: `500 15px/1 ${FONT}`, color: MUTED }}>Patient of Dr. Ostad. Results vary.</div>
        </div>
        {!after ? <>
          {row(<path d="M4,4 L20,20 M20,4 L4,20" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />, <>Entry point · 8 read off his injection clips</>, 0, leg(0))}
          {row(<path d="M2,16 Q20,6 50,12" stroke={INK} strokeWidth={4.5} fill="none" strokeLinecap="round" />, <><b>Evolysse Form</b> · 1 syringe, both cheeks · needle, deep on the cheekbone</>, 1, leg(0))}
          {row(<g><path d="M2,12 L38,12" stroke={INK} strokeWidth={3.5} strokeDasharray="10 6" /><path d="M44,3 L44,21" stroke={INK} strokeWidth={3.5} strokeLinecap="round" /></g>,
            <><b>Evolysse Smooth</b> · cannula passes from 3 entries into the laugh and marionette lines</>, 2, leg(3))}
          {row(<path d="M2,12 L50,12" stroke={INK} strokeWidth={3} strokeDasharray="0.1 8" strokeLinecap="round" />, <>Treated fold</>, 3, leg(4))}
          {row(<circle cx={12} cy={12} r={7} fill={INK} />, <><b>Neuromodulator</b> · crow's feet point (plus forehead and frown lines)</>, 4, leg(6))}
        </> : <>
          {row(<g><path d="M2,6 L50,6" stroke={INK} strokeWidth={3} strokeDasharray="8 6" /><path d="M2,19 L50,19" stroke={INK} strokeWidth={4.5} /></g>,
            <><b>Cheek shadow line {m.contour.shift_px} px lower</b> after = {m.contour.shift_pct_face_width} % of her face width: more projection on the bone</>, 0, life(f, wipeS + D.bar + 6, out, 8))}
          {fd.reported && row(<path d="M4,4 Q26,22 48,4" stroke={INK} strokeWidth={3} fill="none" strokeDasharray="0.1 7" strokeLinecap="round" />,
            <><b>Her left laugh line: shadow {Math.abs(fd.relative_change_pct)} % shallower</b> ({Math.round(fd.same_sign_share * 9)} of 9 points measured along it)</>, 1, life(f, wipeS + D.bar + 14, out, 8))}
          <div style={{ display: "flex", gap: 36, marginTop: 22 }}>
            {facts.map((r, i) => (
              <div key={i} style={{ flex: 1, opacity: f > r.s ? 1 : 0.3 }}>
                <div style={{ ...caps(20, MUTED) }}>{r.k}</div>
                <div style={{ ...disp(40, INK), marginTop: 6, ...life(f, r.s + 1, out, 8) }}>{r.v}</div>
              </div>
            ))}
          </div>
          <div style={{ font: `500 16px/1.25 ${FONT}`, color: MUTED, marginTop: 14 }}>Same frame before and after, registered on her landmarks ({`<`} 4 px). Lines are measured on the photos; marks dim to show the change.</div>
        </>}
      </div>}
    </AbsoluteFill>
  );
};

/** an injection pop-up in the ClipCard look at its measured face-free place, a headed arrow to the tracked point */
const InjCard: React.FC<{ c: React.ComponentProps<typeof ClipCard>["c"]; s: number; out: number; arrowOut: number; anchor: (f: number) => Pt | null; probeKey: string; L: Lay; variant: "curved-callout" | "straight-pointer" }> = ({ c, s, out, arrowOut, anchor, probeKey, L, variant }) => {
  const f = useCurrentFrame();
  const a = anchor(f) ?? anchor(s + 1);
  const sc = L.scale ?? 1, left = L.x!, top = L.y!;
  const h = 485 * sc;
  const below = a ? a.y > top + h / 2 : false;
  const from = (fr: number): Pt => { const q = anchor(fr) ?? a ?? { x: 540, y: 960 }; const cx = Math.max(left + 40, Math.min(left + CW * sc - 40, q.x)); return { x: cx, y: below ? top + h - 6 : top + 6 }; };
  return (
    <>
      {gfx() && <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: `scale(${sc})`, transformOrigin: `${left}px ${top}px` }}>
        <ClipCard c={c} s={s} out={out} left={left} top={top} />
      </div>}
      {LAYER === "probe" && f >= s + 8 && f < arrowOut && !inRoom(f) && anchor(f) && <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}><circle cx={anchor(f)!.x} cy={anchor(f)!.y} r={6} fill={probeColour(probeKey)} /></svg>}
      {marks() && a && !inRoom(f) && <Arrow variant={variant} from={from} to={(fr) => anchor(fr) ?? a} start={s + 8} end={arrowOut + 4} color={WHITE} />}
    </>
  );
};

// v6b freeze guard: an OffthreadVideo mounted past its source's last frame holds that frame (a frozen picture). SRC_FRAMES = the
// source clips' frame counts (ffprobe nb_read_packets, 2026-11-19); live() = frames a piece can play before its source runs out.
export const SRC_FRAMES: Record<string, number> = { after: 1700, inj1: 905, inj2: 1238, inj3: 1123, inj4: 275, inj5: 1491, inj6: 2447, inj7: 2669,
  intro: 3572, neuro: 2891, pre1: 770, pre2: 195 };
export const live = (role: string, from: number, speed: number) =>
  Math.max(0, Math.floor((SRC_FRAMES[role] - 1 - Math.round(from * 24)) / speed));
// v6b: intro-deflation/b/b asked pre2 from 7.42 s for 84 f, but pre2 ends 0.7 s in (frozen 69 f in v5c/v6, f887-955).
// Same moment, pre1 (his assessment, 16:42), timed to run straight into the next piece (pre1 @ 10.0 s): 10.0 - 84 * 1.15 / 24.
export const PIECE_FIX: Record<string, { pictureRole: string; pictureFrom: number }> = {
  "intro-deflation/b/b": { pictureRole: "pre1", pictureFrom: 5.975 } };
const SHORT_MARKS = false; // v6: marks whose shot is under 2 s are not drawn
const cl01 = (v: number) => Math.max(0, Math.min(1, v));
export const Oct14ReelV6b: React.FC<Oct14V5Props & { tl?: Timeline }> = (P) => {
  useElza();
  LAYER = P.layer ?? "all";
  PASS = (P as { pass?: Pass }).pass;
  const frame = useCurrentFrame();
  const { cues: c, speed } = P;
  const pieces = P.pieces.map((x) => (PIECE_FIX[x.id] ? { ...x, ...PIECE_FIX[x.id] } : x));
  const cue = (k: string) => { if (!(k in c)) throw new Error(`cue ${k} missing`); return c[k]; };
  const end = P.durationInFrames;
  const S = (line: string) => cue("start:" + line), E = (line: string) => cue("end:" + line);
  const piece = (id: string) => pieces.find((x) => x.id === id) ?? pieces.find((x) => x.line === id)!;
  const FL = P.flora!, FR = (id: string) => ({ id, n: FL[id].n, aspect: FL[id].aspect });
  const Lo = (id: string) => P.lay[id];
  const stillOf = (pieceId: string) => Object.keys(P.stills ?? {}).find((k) => P.stills[k].piece === pieceId);
  const BIG = true; // V6 = V5 big:true
  // v5c cream beats: content 1000 px wide (40 px side margins), centred in y 100-1580 (above the caption band)
  const CX = 40, CWB = 1000;
  const tl = (P.tl ?? (TL as unknown as Timeline));
  const T = P as unknown as Parameters<typeof resolve>[2];
  const at = (a: Anchor) => resolve(a, tl, T);
  const B = (id: string) => tlBeat(tl, id);
  const SP = (id: string) => span(tl, id, T);
  const L6 = (id: string) => B(id).layout as Record<string, number & string>;
  const tplate = (id: string) => {
    const b = B(id), [s0, e0] = SP(id), l = L6(id), t = b.text as { eyebrow: string; title: string; note: string; labels: { text: string; at: Anchor; x: number; y: number; anchor?: "start" | "middle" | "end"; size?: number }[] };
    return gfx() ? <FloraPlate {...FR(b.plate!.id)} s={s0} out={e0} x={l.x} y={l.y} w={l.w} h={l.h} head={l.head} pad={l.pad} titlePx={l.titlePx} radius={24}
      eyebrow={t.eyebrow} title={t.title} note={t.note} map={plateMap(b, tl, T)}
      labels={t.labels.map((q) => ({ text: q.text, x: q.x, y: q.y, s: at(q.at), anchor: q.anchor, size: q.size }))} /> : null;
  };
  const o1s = P.lay.O1.s; // O1 waits for section 01 and the name card to clear (layout_v5)
  // plate maps: Omni clips (brand/edits/flora-anatomy/qa_omni.json events; every key inside usable_range)
  // a tracked point of the patient on the picture `role` at composition frame f: the SAME source frame the video shows
  // (trimBefore = round(pictureFrom * 24); frame = trimBefore + (f - at) * speed), through the piece's punch-in; null = no face there
  const map: Mapper = (role, key, f) => {
    const t = P.tracks5[role]?.pts[key];
    const pc = pieces.find((x) => x.pictureRole === role && f >= x.at && f < x.at + x.dur);
    if (!t || !pc) return null;
    const st = stillOf(pc.id);
    if (st) { const q = P.stills[st].pts[key]; return q ? { x: q[0], y: q[1] } : null; }
    // Remotion shows the source frame FLOOR(trimBefore + t * rate) (measured on the probe render: round() was 1 f late on every
    // frame with a fractional part >= .5, 22-43 px on the marionette marks)
    const cf = Math.floor(Math.round(pc.pictureFrom * 24) + (f - pc.at) * speed + 1e-6);
    const q = t[cf];
    if (!q) return null;
    const s = pc.punch ?? 1, ox = (pc.punchO ? pc.punchO[0] : 0.4) * W, oy = (pc.punchO ? pc.punchO[1] : 0.42) * H;
    return { x: ox + (q[0] - ox) * s, y: oy + (q[1] - oy) * s };
  };
  const tp = (role: string, key: string) => (f: number) => map(role, key, f);
  const sg = P.surgeon!;
  const baS = cue(sg.cue);
  const takeovers = Object.values(P.lay).filter((l) => l.mode === "takeover");
  ROOMS = takeovers.map((l) => [l.s, l.e]);
  const plate = (id: string, el: (x: number, y: number, sc: number) => React.ReactNode) => {
    const L = Lo(id);
    if (!gfx()) return null;
    // a takeover with no rect (solver found no face-free spot): centred on the cream room, a little above middle
    return el(L.x ?? 98, L.y ?? 760, L.scale ?? 1);
  };

  return (
    <AbsoluteFill style={{ background: PASS ? undefined : "#000" }}>
      {PASS && <style>{PASS_CSS[PASS]}</style>}
      {pieces.map((x) => (
        <Sequence key={x.id} from={x.at} durationInFrames={Math.max(1, Math.min(x.dur, live(x.pictureRole, x.pictureFrom, speed)))} layout="none">
          {stillOf(x.id) ? PASS ? null /* a held footage frame: the HDR build takes it from the original */ : <Img src={staticFile(`oct14/still_${stillOf(x.id)}.jpg`)} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />
            : <Picture role={x.pictureRole} from={x.pictureFrom} speed={speed} punch={x.punch} o={x.punchO} />}
        </Sequence>
      ))}
      {LAYER !== "footage" && LAYER !== "probe" && <Audio src={staticFile("oct14/mix_v6.wav")} />}
      <Sequence from={end} durationInFrames={Math.max(1, Math.min(P.tail, live(pieces[pieces.length - 1].pictureRole, pieces[pieces.length - 1].to, speed)))} layout="none">
        <Picture role={pieces[pieces.length - 1].pictureRole} from={pieces[pieces.length - 1].to} speed={speed} />
      </Sequence>
      {/* takeovers: the cream room replaces the footage (picture layer), so the element covers no face */}
      {marks() && takeovers.map((l, i) => <Room key={i} s={l.s} e={l.e} />)}
      {marks() && <Room s={end + 46} e={end + P.tail} />}
      <Hook crop={sg.crop} out={38} contour={(sg as unknown as { contour: { before: [number, number][]; after: [number, number][] } }).contour} />

      {/* ---------- opening: title + name ---------- */}
      {gfx() && <Chapter num="" title="Treat the source,|not the line" sub="Dr. Ariel Ostad · injectables" start={46} L={Lo("title")} size={110} />}
      {/* the name card after the title and section 01, bottom left (v4 had it under the title) */}
      {gfx() && <Sequence from={(Lo("name") as Lay & { at: number }).at} durationInFrames={Math.round(4.2 * 24)} layout="none"><NameCard /></Sequence>}

      {/* ---------- S1 upper face ---------- */}
      {gfx() && <Chapter num="01" title="Upper face" start={46 + SEC_LEN + 1} L={Lo("ch01")} />}
      {/* crow's feet on her own smile: three pen strokes along the fan, on the tracked lateral canthus */}
      {/* v6: dropped: its shot (the 2x eye close-up) is 20 frames, so the mark flashed for 0.5 s (rule: every pop-up holds >= 2 s) */}
      {SHORT_MARKS && [[14, -18, 52, -40], [16, 0, 58, 2], [14, 18, 52, 42]].map(([a, b, c2, d], i) => (
        <PenT key={i} map={map} pts={[{ role: "intro", key: "crowR", dx: a, dy: b }, { role: "intro", key: "crowR", dx: c2, dy: d }]} s={cue("crows") + i * 3} out={cue("these") - 1 - D.exit} d={8} />
      ))}
      {P.pips.map((q) => {
        const tgt = q.morphTo ? piece(q.morphTo) : null;
        const s = cue(q.cue), out = cue(q.out);
        const clipFrom = tgt ? tgt.pictureFrom - ((out - (s + 1)) / 24) * speed : q.clipFrom ?? 0;
        const host = pieces.find((x) => s >= x.at && s < x.at + x.dur);
        const arrowOut = host ? Math.min(out, host.at + host.dur - 2) : out;
        const L = Lo(`pip${q.n}`);
        if (L.mode === "takeover" && BIG) {
          // v5c: a lone pip (2) is a ~900 px clip window centred above the captions; pip 3 stacks under O3 at full width
          const cc = { src: SRC(q.clip), from: clipFrom, rate: tgt ? speed : 1, caps: q.eyebrow ?? "", title: q.label ?? "", depth: (q.depth ?? [2, ""]) as [number, string], raw: true };
          const g = q.n === 3 ? { k: 1.4, w: 714, left: CX, top: 800 } : { k: 900 / CW, w: CW, left: 90, top: 330 };
          return gfx() ? <div key={q.n} style={{ position: "absolute", inset: 0, transform: `scale(${g.k})`, transformOrigin: `${g.left}px ${g.top}px` }}><ClipCard c={cc} s={s} out={out} left={g.left} top={g.top} w={g.w} /></div> : null;
        }
        if (L.mode === "takeover") return gfx() ? <div key={q.n} style={{ position: "absolute", inset: 0, transform: `scale(${q.n === 3 ? 1.15 : 1.6})`, transformOrigin: `${L.x! + CW / 2}px ${L.y!}px` }}><ClipCard c={{ src: SRC(q.clip), from: clipFrom, rate: tgt ? speed : 1, caps: q.eyebrow ?? "", title: q.label ?? "", depth: (q.depth ?? [2, ""]) as [number, string], raw: true }} s={s} out={out} left={L.x!} top={L.y!} /></div> : null;
        return <InjCard key={q.n} s={s} out={out} arrowOut={arrowOut} anchor={tp(q.anchorRole, q.key)} probeKey={q.key} L={L} variant={q.arrow === "straight-pointer" ? "straight-pointer" : "curved-callout"}
          c={{ src: SRC(q.clip), from: clipFrom, rate: tgt ? speed : 1, caps: q.eyebrow ?? "", title: q.label ?? "", depth: (q.depth ?? [2, ""]) as [number, string], raw: true }} />;
      })}
      {plate("O1", (x, y, sc) => <FloraPlate {...FR("O1")} s={o1s} out={E("neuro-more-less") - 2} x={x} y={y} w={480 * sc} h={540 * sc} radius={24} head={104 * sc} pad={24 * sc} titlePx={36 * sc}
        eyebrow="Dynamic lines" title="Frown muscles" note="Illustration"
        map={[[o1s, 0], [o1s + 30, 66], [o1s + 60, 108], [Math.max(cue("neuromod"), o1s + 70), 126], [Math.max(cue("neuromod"), o1s + 70) + 30, 143]]}
        labels={[{ text: "Frontalis", x: 0.5, y: 0.05, s: cue("neuromod") + 14, anchor: "middle", size: 18 }, { text: "Corrugator", x: 0.02, y: 0.42, s: cue("neuromod") + 22, size: 18 },
          { text: "Procerus", x: 0.5, y: 0.66, s: cue("neuromod") + 26, anchor: "middle", size: 18 }, { text: "Orbicularis oculi", x: 0.98, y: 0.86, s: cue("neuromod") + 30, anchor: "end", size: 18 }]} />)}
      {plate("months", (_x, y) => <MonthsRule s={S("intro-lasts")} out={S("intro-lasts") + 62} title="Neuromodulator lasts" max={6} y={y} fill={[4, 5]}
        marks={[{ m: 4, s: cue("four"), label: "" }, { m: 5, s: cue("five"), label: "4–5 months" }]} />)}
      {plate("days", (_x, y) => BIG && Lo("days").mode === "takeover"
        ? <DayLanes s={S("intro-lasts") + 68} neuroS={cue("day")} fillerS={cue("away")} out={E("intro-onset-vs-filler") - 2} x={CX} cw={CWB} ch={860} k={1.45} y={410} />
        : <DayLanes s={S("intro-lasts") + 68} neuroS={cue("day")} fillerS={cue("away")} out={E("intro-onset-vs-filler") - 2} y={y} />)}

      {/* ---------- S2 mid face ---------- */}
      {gfx() && <Chapter num="02" title="Mid face" start={S("intro-midface")} L={Lo("ch02")} />}
      {/* jowling on her own jaw: a pen contour along the jowl */}
      {/* on a still (oct14_still_v5.py): the jaw-line contour detected on that very picture, chin -> jaw angle, 7 px under the edge */}
      {/* v6: jowl mark dropped (its still is 30 frames: 0.9 s); the O2 plate labels the jowl */}
      {SHORT_MARKS && LAYER !== "probe" && <PenT map={map} pts={(P.stills.jowl.line ?? []).map((q) => () => ({ x: q[0], y: q[1] + 7 }))} s={cue("jowling")} out={E("intro-midface") - 8} d={12} />}
      {SHORT_MARKS && LAYER === "probe" && <PenT map={map} pts={[{ role: "intro", key: "marioR" }, { role: "intro", key: "jawR" }, { role: "intro", key: "chin" }]} s={cue("jowling")} out={E("intro-midface") - 1} />}
      {plate("compare", (x, y, sc) => {
        // v6: a contrast, not a strike: "Patients ask: fill the lines" (text dims) vs "He starts: cheekbones" (lit ring). No chip on her face.
        const b = B("contrast"), [s0, e0] = SP("contrast"), ev = b.events!, tx = b.text as Record<string, { caps: string; title: string; depth: [number, string] }>;
        const src = b.source as Record<string, { clip: string; in: number }>;
        const g = p(frame, Lo("O2").s + 2, 14, "arrive");
        const k2 = sc + (CWB / (W - 196) - sc) * g, X = x + (CX - x) * g, Y = y + (130 - y) * g;
        const rs = at(ev.right), dm = cl01((frame - at(ev.dim) - 1) / 8);
        const spec = (k: string): ClipSpec => ({ src: SRC(src[k].clip), from: src[k].in, caps: tx[k].caps, title: tx[k].title, depth: tx[k].depth, raw: true });
        const w2 = 420, gap = W - 2 * 98 - 2 * w2;
        return gfx() ? <div style={{ position: "absolute", inset: 0, transform: `translate(${X - x * k2}px, ${Y - y * k2}px) scale(${k2})`, transformOrigin: "0 0" }}>
          <ClipCard c={spec("left")} s={s0} out={e0} left={98} top={y} w={w2} textDim={dm} />
          <ClipCard c={spec("right")} s={rs} out={e0} left={98 + w2 + gap} top={y} w={w2} ring={dm} />
        </div> : null;
      })}
      {/* the soft tissue moving down: a white route on her face, cheekbone -> cheek -> below the jaw (tracked) */}
      {marks() && LAYER !== "probe" && (() => {
        const via = tp("intro", "cheekR"), a0 = tp("intro", "malarR"), j = tp("intro", "jawR");
        const to = (f: number) => { const a = a0(f), jj = j(f); return a && jj ? { x: jj.x + (jj.x - a.x) * 0.6, y: jj.y + (jj.y - a.y) * 0.6 } : null; };
        return <TrackedArrow s={cue("moving") + 1 - 27} out={E("intro-deflation") - 2} pts={[a0, via, to]} />;
      })()}
      {LAYER === "probe" && <PenT map={map} pts={[{ role: "intro", key: "malarR" }, { role: "intro", key: "cheekR" }, { role: "intro", key: "jawR" }]} s={cue("moving") + 1 - 27} out={E("intro-deflation") - 2} />}
      {tplate("O2")}

      {/* laugh lines: a pen line along each fold, tracked on her close-up */}
      {[["nasoL", "lipCL"], ["nasoR", "lipCR"]].map(([a, b], i) => (
        <PenT key={i} map={map} pts={[{ role: "inj5", key: a }, (f: number) => { const q = map("inj5", a, f), r0 = map("inj5", b, f); return q && r0 ? { x: (q.x + r0.x) / 2 + (i ? 6 : -6), y: (q.y + r0.y) / 2 } : null; }, { role: "inj5", key: b }]}
          s={cue("laugh3") + i * 4} out={E("inj5-less-needed") - 1 - D.exit} d={12} />
      ))}
      {tplate("O3")}
      {tplate("O4")}

      {/* ---------- REAL OBJECTS (timelines/oct14.json lane "objects") ---------- */}
      {/* v6b: each object beat lists its items (timeline "items": src, aspect, label, x, y, w, enter, labelPx, delay, tip); real cut-outs from
          his footage where a frame resolves the instrument, else a neutral ghost outline labelled "Photo to come" (never PLACEHOLDER) */}
      {gfx() && (["obj-form", "obj-pair", "obj-cannula-needle"] as const).map((id) => { const b = B(id) as unknown as { items: { src: string; aspect: number; label: string; x: number; y: number; w: number; enter?: string; labelPx?: number; delay?: number; outOffset?: number; tip?: { src: string; label: string; d?: number; x?: number; y?: number; at?: [number, number] } }[]; text?: { credit?: string }; creditY?: number }, [s0, e0] = SP(id);
        return <React.Fragment key={id}>
          {b.items.map((o, k) => <RealObject key={k} src={o.src} label={o.label} s={s0 + (o.delay ?? 0)} out={e0 + (o.outOffset ?? 0)} x={o.x} y={o.y} w={o.w} aspect={o.aspect} enter={(o.enter ?? "up") as never} drift={4} shadow labelPx={o.labelPx ?? 36} tip={o.tip} />)}
          {b.text?.credit && <div style={{ position: "absolute", left: 90, top: b.creditY ?? 1536, width: 900, textAlign: "center", ...caps(18, MUTED), ...life(frame, s0 + 6, e0) }}>{b.text.credit}</div>}
        </React.Fragment>; })}

      {/* ---------- S4 the result ---------- */}
      {gfx() && <Chapter num="03" title="The result" start={E("inj6-bruising") + 42} L={Lo("ch03")} />}
      {/* v6: marionette marks dropped (0.9 s before the cut to the plan, which draws the marionette passes itself) */}
      {SHORT_MARKS && [["lipCL", "marioL"], ["lipCR", "marioR"]].map(([a, b], i) => (
        <PenT key={i} map={map} pts={[{ role: "after", key: a }, { role: "after", key: b }, (f: number) => { const q = map("after", b, f), r0 = map("after", a, f); return q && r0 ? { x: q.x + (q.x - r0.x) * 0.5, y: q.y + (q.y - r0.y) * 0.5 } : null; }]}
          s={cue("marionette") + 5 + i * 4} out={baS - 1 - D.exit} d={10} />
      ))}
      {LAYER !== "probe" && LAYER !== "footage" && <SurgeonPlan m={P.markup} s={baS} wipeS={cue(sg.wipe)} out={end + 45} facts={[{ k: "Treatment", v: "about 15 min", s: cue("fifteen") }, { k: "Filler lasts", v: "1–1½ years", s: cue("year") }]} />}
      {gfx() && <EndCard start={end + 46} />}

      {gfx() && <WordCaptions words={P.words} hide={(P.hideCaps ?? []).map(([a, b]) => [cue(a), cue(b)])} />}
      {LAYER === "all" && (P.sfx ?? []).map((s, i) => <Sfx key={i} at={(cue(s.cue) + 1) / 24} name={s.name} />)}
    </AbsoluteFill>
  );
};

/** a white route on her face (pen markup, not the blue pointer system): draws on in 24 f, tracked every frame, hidden without a face */
const TrackedArrow: React.FC<{ s: number; out: number; pts: ((f: number) => Pt | null)[] }> = ({ s, out, pts }) => {
  const f = useCurrentFrame();
  if (!vis(f, s, out) || inRoom(f)) return null;
  const P = pts.map((q) => q(f));
  if (P.some((q) => !q)) return null;
  const [a, b, c] = P as Pt[];
  return <Arrow variant="route-trace" from={a} via={[b]} to={c} start={s} end={out + D.exit} color={WHITE} />;
};

const EndCard: React.FC<{ start: number }> = ({ start }) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  const L = (i: number) => life(f, start + 10 + 4 * i);
  return (
    <div style={{ ...card(32), left: M, top: 700, width: W - 2 * M, padding: "64px 64px 52px", boxSizing: "border-box", ...life(f, start + 4) }}>
      <div style={{ ...disp(84, INK), ...L(0) }}>Book a consultation.</div>
      <div style={{ font: `500 44px/1.2 ${FONT}`, color: MUTED, marginTop: 18, ...L(1) }}>Link in bio.</div>
      <div style={{ font: `500 30px/1 ${FONT}`, letterSpacing: "0.06em", color: INK, marginTop: 40, ...L(2) }}>@drarielostad</div>
    </div>
  );
};
