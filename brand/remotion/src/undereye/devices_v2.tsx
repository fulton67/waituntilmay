// Under-eye filler reel v2: the devices added for the user's notes (research/ostad/style/DECISIONS.md 15c). Same tokens as devices.tsx.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { card } from "../components/Ro";
import { D, INK, M, MUTED, W, WHITE, caps, disp, life, p, vis } from "./look";

// Labelled split / date labels on a before-after still (split-labelled, G1 T11; never a slider, DECISIONS 14d rule 1): one label per
// half, each typed from its frame. `y` is the label's top.
export const DateLabels: React.FC<{ s: number; out: number; labels: { text: string; sub: string; x: number; y: number; s: number; accent?: boolean }[] }> = ({ s, out, labels }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s, out)) return null;
  return (
    <AbsoluteFill>
      {labels.map((l, i) => (
        <div key={i} style={{ position: "absolute", left: l.x, top: l.y, transform: "translateX(-50%)", textAlign: "center", ...life(frame, l.s, out, 10) }}>
          <div style={{ ...caps(26, l.accent ? WHITE : "rgba(255,255,255,.75)"), textShadow: "0 1px 6px rgba(0,0,0,.55)" }}>{l.sub}</div>
          <div style={{ ...disp(54, WHITE), marginTop: 8 }}>{l.text}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

// Checklist ledger (checklist-ledger, DDOS Moment C; L08): the cannula card, a row per property he names, each row lit on its word
// with a drawn tick (v2b: the ice row wipe was a filled block behind text, now banned).
export const CannulaLedger: React.FC<{ s: number; out: number; rows: { text: string; s: number }[]; y: number }> = ({ s, out, rows, y }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const cw = W - 2 * M;
  return (
    <div style={{ ...card(24), left: M, top: y, width: cw, padding: "28px 34px 30px", ...life(frame, s + 1, out) }}>
      <div style={{ ...caps(24, MUTED) }}>Blunt cannula</div>
      <svg width={cw - 68} height={70} viewBox={`0 0 ${cw - 68} 70`} style={{ marginTop: 18 }}>
        <path d={`M0,25 H${cw - 120} A10,10 0 0 1 ${cw - 120},45 H0`} fill="#ffffff" stroke={INK} strokeWidth={2.5} />
        <rect x={cw - 160} y={31} width={22} height={8} rx={4} fill={INK} />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
        {rows.map((r, i) => {
          // no filled block (user rule): the row lights from muted to ink and a hand-drawn tick lands beside it
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "4px 0", opacity: frame > r.s ? 1 : 0.35 }}>
              <Mark kind="tick" s={r.s} size={38} />
              <div style={{ ...disp(44, frame > r.s ? INK : MUTED, frame > r.s ? 600 : 500) }}>{r.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Hairline labels on the face (hud-face-labels, Are.na 23958815): a hairline box round each measured under-eye band of the AFTER
// photo, drawn on `sweep` 14 f, with "Less shadow" under it. Only sides whose measured change passes the threshold get one
// (research/ostad/style/undereye/beforeafter.json). Condition images only, never his face.
export const HudBands: React.FC<{ s: number; out: number; bands: { poly: number[][]; s: number }[]; label: string }> = ({ s, out, bands, label }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const e = p(frame, out, D.exit, "exit");
  return (
    <AbsoluteFill style={{ opacity: 1 - e }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, filter: "drop-shadow(0 1px 3px rgba(0,0,0,.45))" }}>
        {bands.map((b, i) => {
          const xs = b.poly.map((q) => q[0]), ys = b.poly.map((q) => q[1]);
          const x = Math.min(...xs) - 14, y = Math.min(...ys) - 12, w = Math.max(...xs) - x + 14, h = Math.max(...ys) - y + 12;
          return <rect key={i} x={x} y={y} width={w} height={h} rx={14} fill="none" stroke={WHITE} strokeWidth={3} pathLength={1} strokeDasharray={`${p(frame, b.s + 1, D.rowWipe)} 1`} />;
        })}
      </svg>
      {bands.map((b, i) => {
        const xs = b.poly.map((q) => q[0]), ys = b.poly.map((q) => q[1]);
        const q = p(frame, b.s + 8, 5, "arrive");
        return (
          <div key={i} style={{ position: "absolute", left: (Math.min(...xs) + Math.max(...xs)) / 2, top: Math.max(...ys) + 14, transform: `translateX(-50%) scale(${0.95 + 0.05 * q})`,
            opacity: q, ...disp(36, WHITE, 600), textShadow: "0 2px 10px rgba(0,0,0,.5)", whiteSpace: "nowrap" }}>{label}</div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------
// v2b (user rule, all reels: no text inside a flat solid-colour rectangle). Type with presence instead: weight, size and a soft
// shadow on the footage, the emphasis drawn as a pen stroke under the word, never a filled block.
// ---------------------------------------------------------------------------------------------------------------------------
const SHADOW = "0 3px 18px rgba(0,0,0,.45), 0 1px 3px rgba(0,0,0,.35)";

// type-box-slam without the box: the word rises 7 % of its size with a scale 0.85 -> 1 in 4 f, then a hand-drawn ice stroke underlines
// it in 6 f (`sweep`); the sub line arrives on its own word.
export const SlamType: React.FC<{ text: string; s: number; out: number; sub?: string; subS?: number; x: number; y: number; size?: number }> = ({ text, s, out, sub, subS = s, x, y, size = 96 }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const t = p(frame, s + 1, 4, "arrive"), u = p(frame, s + 5, 6, "sweep"), e = p(frame, out, D.exit, "exit");
  const w = text.length * size * 0.52;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: 1 - e, transform: `translateY(${e * 7}px)` }}>
      <div style={{ ...disp(size, WHITE, 600), textShadow: SHADOW, opacity: t, transform: `translateY(${(1 - t) * 0.07 * size}px) scale(${0.85 + 0.15 * t})`, transformOrigin: "left bottom" }}>{text}</div>
      <svg width={w + 20} height={24} style={{ display: "block", marginTop: -4, overflow: "visible", filter: "drop-shadow(0 1px 3px rgba(0,0,0,.35))" }}>
        <path d={`M4,14 C${w * 0.3},8 ${w * 0.7},18 ${w},10`} fill="none" stroke={WHITE} strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray={`${u} 1`} />
      </svg>
      {sub && <div style={{ ...caps(30, WHITE), marginTop: 10, textShadow: SHADOW, ...life(frame, subS + 1, out, 8) }}>{sub}</div>}
    </div>
  );
};

// a hand-drawn tick or cross (x / tick marks are allowed): drawn in 6 f on `sweep`
export const Mark: React.FC<{ kind: "tick" | "x"; s: number; size?: number; color?: string }> = ({ kind, s, size = 40, color = INK }) => {
  const frame = useCurrentFrame();
  const q = p(frame, s + 1, 6, "sweep");
  const d = kind === "tick" ? "M6,22 L16,32 L36,8" : "M8,8 L34,34 M34,8 L8,34";
  return (
    <svg width={size} height={size} viewBox="0 0 42 42" style={{ flex: "none", overflow: "visible" }}>
      <path d={d} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${q} 1`} />
    </svg>
  );
};

// Bruising, as an example (glossary: named conditions get an example). A designed swatch, not a photo of anyone: a skin-tone disc with a
// soft purple-to-yellow bruise, labelled as an illustration.
export const BruiseSwatch: React.FC<{ size?: number }> = ({ size = 150 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <radialGradient id="bruise" cx="52%" cy="50%" r="45%">
        <stop offset="0%" stopColor="#5b3a6e" stopOpacity="0.85" /> {/* // lint-ok: example of a named condition (glossary), not markup */}
        <stop offset="45%" stopColor="#7a4f7f" stopOpacity="0.6" /> {/* // lint-ok: example of a named condition (glossary), not markup */}
        <stop offset="75%" stopColor="#b9a05a" stopOpacity="0.35" /> {/* // lint-ok: example of a named condition (glossary), not markup */}
        <stop offset="100%" stopColor="#c99c7e" stopOpacity="0" /> {/* // lint-ok: example of a named condition (glossary), not markup */}
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="#c99c7e" /> {/* // lint-ok: example of a named condition (glossary), not markup */}
    <ellipse cx="52" cy="48" rx="40" ry="30" fill="url(#bruise)" transform="rotate(-18 52 48)" />
  </svg>
);

// The pillowy look, as an example: the lower-lid profile drawn as a line (no anatomy, a contour): a smooth, filled trough against a
// puffy bulge. `grow` 0..1 swells the bulge (he: "this is going to expand").
export const PillowProfile: React.FC<{ grow: number; w?: number }> = ({ grow, w = 300 }) => {
  const b = 18 + 30 * grow;
  return (
    <svg width={w} height={110} viewBox="0 0 300 110">
      <path d="M10,40 Q80,30 150,38" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" opacity={0.5} />
      <path d={`M10,60 C70,${60 + b} 120,${60 + b} 160,60 S250,50 290,58`} fill="rgba(29,34,48,.08)" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
    </svg>
  );
};

// Two approaches side by side, the one he does not use marked "Not used" (user rule: show both when he contrasts two approaches).
export type Side = { title: string; sub: string; art: React.ReactNode; used: boolean; s: number; markS: number; note?: string };
export const Contrast: React.FC<{ s: number; out: number; y: number; left: Side; right: Side }> = ({ s, out, y, left, right }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const cw = (W - 2 * M - 24) / 2;
  const one = (x: number, d: Side) => (
    <div style={{ ...card(24), left: x, top: y, width: cw, padding: "24px 24px 26px", ...life(frame, d.s + 1, out),
      filter: !d.used && frame > d.markS ? "saturate(.55)" : undefined }}>
      <div style={{ ...caps(22, MUTED) }}>{d.sub}</div>
      <div style={{ ...disp(40, INK, 600), marginTop: 6 }}>{d.title}</div>
      <div style={{ marginTop: 14, height: 150, display: "flex", alignItems: "center", justifyContent: "center", opacity: !d.used && frame > d.markS ? 0.55 : 1 }}>{d.art}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, opacity: frame > d.markS ? 1 : 0 }}>
        <Mark kind={d.used ? "tick" : "x"} s={d.markS} color={d.used ? INK : MUTED} size={36} />
        <span style={{ ...disp(30, d.used ? INK : MUTED, 600) }}>{d.used ? "Used here" : "Not used"}</span>
      </div>
      {d.note && <div style={{ ...caps(18, MUTED), marginTop: 8, opacity: frame > d.markS ? 1 : 0 }}>{d.note}</div>}
    </div>
  );
  return <>{one(M, left)}{one(M + cw + 24, right)}</>;
};

// ---------------------------------------------------------------------------------------------------------------------------
// The surgeon's sketch (user note: "as if a surgeon were sketching the before and after on the client's face"). Every mark is
// measured from IMG_6817 and registered to the 9-20 reference face (brand/scripts/undereye_sketch.py): an "x" at each entry point,
// pen strokes along the cannula's fan to the tear trough, a light hatch over the hollow, side by side in the order he treated
// (her right first). Strokes draw like a pen: `sweep`, 10 f per stroke, x marks 6 f.
// ---------------------------------------------------------------------------------------------------------------------------
export type SketchSide = { entry: number[]; strokes: number[][][]; hollow: number[][] };
export type SketchData = { order: string[]; sides: Record<string, SketchSide>; arrows: { side: string; at: number[]; change: number }[]; rim?: Record<string, number[][]> };
const PEN = "#f4f7fb";

export const SketchMarks: React.FC<{ data: SketchData; s: number; faint?: boolean; step?: number }> = ({ data, s, faint = false, step = 14 }) => {
  const frame = useCurrentFrame();
  let t = s;
  const parts: React.ReactNode[] = [];
  data.order.forEach((key, si) => {
    const d = data.sides[key];
    if (!d) return;
    // the orbital rim (bone) under the hollow, traced from face.glb and placed from her landmarks (anatomy_check.json): a dashed pen line
    const rim = data.rim?.[key];
    if (rim) {
      const rq = faint ? 1 : p(frame, t + 1, 12, "sweep");
      parts.push(<path key={`r${si}`} d={"M" + rim.map((q) => q.join(",")).join(" L")} fill="none" stroke={PEN} strokeWidth={2.5} strokeDasharray="7 6"
        strokeLinecap="round" opacity={(faint ? 0.3 : 0.8) * rq} />);
      t += 6;
    }
    const hid = `hatch${si}`;
    const hq = faint ? 1 : p(frame, t + 1, 12, "sweep");
    parts.push(
      <g key={`h${si}`} opacity={(faint ? 0.35 : 0.85) * hq}>
        <defs>
          <pattern id={hid} width={10} height={10} patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1={0} y1={0} x2={0} y2={10} stroke={PEN} strokeWidth={1.6} />
          </pattern>
        </defs>
        <polygon points={d.hollow.map((q) => q.join(",")).join(" ")} fill={`url(#${hid})`} stroke={PEN} strokeWidth={1.8} strokeDasharray="6 5" />
      </g>,
    );
    t += 8;
    const x = d.entry, xq = faint ? 1 : p(frame, t + 1, 6, "sweep");
    parts.push(
      <path key={`x${si}`} d={`M${x[0] - 14},${x[1] - 14} L${x[0] + 14},${x[1] + 14} M${x[0] + 14},${x[1] - 14} L${x[0] - 14},${x[1] + 14}`}
        stroke={PEN} strokeWidth={5} strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={`${xq} 1`} opacity={faint ? 0.45 : 1} />,
    );
    t += 6;
    d.strokes.forEach((st, k) => {
      const q = faint ? 1 : p(frame, t + 1, 10, "sweep");
      const [a, b] = st;
      const mx = (a[0] + b[0]) / 2 + (b[1] - a[1]) * 0.04, my = (a[1] + b[1]) / 2 - (b[0] - a[0]) * 0.04; // a pen line bows a little
      parts.push(<path key={`s${si}${k}`} d={`M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}`} stroke={PEN} strokeWidth={k === 1 ? 4.5 : 3}
        strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={`${q} 1`} opacity={faint ? 0.4 : 0.95} />);
      t += step / 2;
    });
    t += step;
  });
  return <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, filter: "drop-shadow(0 1px 2px rgba(0,0,0,.55))" }}>{parts}</svg>;
};

// Before -> after wipe with the sketch locked in place (user note 3: a wipe, the markup fixed to the registered face). The wipe line
// travels left to right on `sweep` over 30 f; arrows (straight, headed) only at the measured points, each pointing up at the trough.
export const WipeBA: React.FC<{ before: React.ReactNode; after: React.ReactNode; s: number; wipeS: number; data: SketchData; arrowsS: number }> = ({ before, after, s, wipeS, data, arrowsS }) => {
  const frame = useCurrentFrame();
  const q = p(frame, wipeS + 1, 30, "sweep");
  return (
    <AbsoluteFill>
      {before}
      <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - q * 100}% 0 0)` }}>{after}</div>
      {q > 0 && q < 1 && <div style={{ position: "absolute", top: 0, bottom: 0, left: q * 1080 - 1.5, width: 3, background: "rgba(255,255,255,.9)", boxShadow: "0 0 12px rgba(0,0,0,.5)" }} />}
      <SketchMarks data={data} s={s} faint />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible", filter: "drop-shadow(0 1px 3px rgba(0,0,0,.6)) drop-shadow(0 0 6px rgba(0,0,0,.25))" }}>
        {data.arrows.map((a, i) => {
          const k = p(frame, arrowsS + 1 + i * 3, 7, "sweep");
          const tip = { x: a.at[0], y: a.at[1] + 8 }, tail = { x: a.at[0], y: a.at[1] + 70 };
          const y = tail.y + (tip.y - tail.y) * k;
          return k > 0 ? (
            <g key={i}>
              <line x1={tail.x} y1={tail.y} x2={tip.x} y2={y + 14} stroke={WHITE} strokeWidth={4.5} strokeLinecap="round" />
              {k > 0.78 && <polygon data-arrowhead points={`${tip.x},${tip.y} ${tip.x - 9},${tip.y + 16} ${tip.x + 9},${tip.y + 16}`} fill={WHITE} />}
            </g>
          ) : null;
        })}
      </svg>
    </AbsoluteFill>
  );
};

// The Tyndall effect, as an example (glossary): a designed swatch, skin with a lid line and a translucent blue streak just under it.
// Never drawn on the patient (user rule, AI_SLOTS.md); replaced by the `tyndall` AI slot when it exists.
export const TyndallSwatch: React.FC<{ w?: number }> = ({ w = 300 }) => (
  <svg width={w} height={w * 0.55} viewBox="0 0 300 165">
    <defs>
      <linearGradient id="tyskin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d2a587" /><stop offset="1" stopColor="#c4967a" /></linearGradient> {/* // lint-ok: example of a named condition (glossary), not markup */}
      <radialGradient id="tyblue" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#6f8fc8" stopOpacity=".75" /><stop offset="1" stopColor="#6f8fc8" stopOpacity="0" /></radialGradient> {/* // lint-ok: example of a named condition (glossary), not markup */}
    </defs>
    <rect x={0} y={0} width={300} height={165} rx={16} fill="url(#tyskin)" />
    <path d="M30,52 Q150,22 270,52" fill="none" stroke="#4a3328" strokeWidth={3} strokeLinecap="round" opacity={0.7} /> {/* // lint-ok: example of a named condition (glossary), not markup */}
    <ellipse cx={150} cy={78} rx={105} ry={22} fill="url(#tyblue)" />
  </svg>
);

// an example card: glass, the example art (AI slot image if present, else the designed fallback), its name, and "Illustration"
export const ExampleCard: React.FC<{ s: number; out: number; x: number; y: number; w: number; title: string; art: React.ReactNode }> = ({ s, out, x, y, w, title, art }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  return (
    <div style={{ ...card(24), left: x, top: y, width: w, padding: "20px 22px 18px", ...life(frame, s + 1, out) }}>
      <div style={{ borderRadius: 14, overflow: "hidden", display: "flex", justifyContent: "center" }}>{art}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 12 }}>
        <span style={{ ...disp(34, INK, 600) }}>{title}</span>
        <span style={{ ...caps(18, MUTED) }}>Illustration</span>
      </div>
    </div>
  );
};
