// Oct 14 injection reel: the one-off beat graphics, one per spoken line (research/ostad/style/oct14/BEATS.md). NOT FOR POSTING until
// patient consent = yes. Each is a DEVICE_LIBRARY id named in its comment; `s` = the onset frame of the cue word, a reveal starts at s + 1
// (MOTION §3). His figures only (DECISIONS 14d rule 10). Pointers are devices/Arrow arrows with heads; no dot-and-line anywhere.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Arrow } from "../devices/Arrow";
import { card } from "../components/Ro";
import { Typed } from "./devices";
import { Label } from "./v3";
import { BLUE, D, FONT, HL, ICE, INK, M, MUTED, ON_FOOTAGE, SAFE_T, W, WHITE, at, breathe, caps, disp, life, p, vis, type PtSrc } from "./look";

// section card (chapter-title-card, one look for every section, structural like the captions): glass pill, number + name
export const SectionPill: React.FC<{ num: string; title: string; s: number; out: number }> = ({ num, title, s, out }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s, out)) return null;
  return (
    <div style={{ ...card(999), left: M, top: SAFE_T, padding: "16px 30px 16px 22px", display: "flex", alignItems: "center", gap: 16, ...life(frame, s, out) }}>
      <span style={{ ...disp(26, INK, 600), fontVariantNumeric: "tabular-nums" }}>{num}</span>
      <span style={{ width: 1.5, height: 26, background: "rgba(29,34,48,.25)" }} />
      <span style={{ ...caps(26, INK) }}>{title}</span>
    </div>
  );
};

// B03 lift (arrow-marker-tick, WZ f940/944: small solid triangles pop in 1 f): on "lifted" two ticks point UP above her brow tails
// (tracked); his words set in the v3 label (type with presence + pen underline, LABEL_OPTIONS C), "less where it droops" types on its word.
export const LiftTicks: React.FC<{ s: number; droopS: number; out: number; brows: PtSrc[] }> = ({ s, droopS, out, brows }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  return (
    <AbsoluteFill>
      {brows.map((q, i) => { const a = (f: number) => at(q, f); return <Arrow key={i} variant="marker-tick" from={(f) => ({ x: a(f).x, y: a(f).y })} to={(f) => ({ x: a(f).x, y: a(f).y - 46 })} start={s + 1 + 2 * i} end={out + D.exit} />; })}
      <Label word="More where it lifts" sub="Less where it droops" s={s} subS={droopS} out={out} x={M} y={1150} size={80} />
    </AbsoluteFill>
  );
};

// B04 / B12 months rule (timeline-markers + arrow-marker-tick, Are.na 16463981; WZ f940/944): a rule draws on `sweep`, a tick pops on
// each spoken number and the span between fills ice. `max` months on the rule; labels are his words.
export const MonthsRule: React.FC<{ s: number; out: number; title: string; max: number; marks: { m: number; s: number; label: string }[]; y: number; fill?: [number, number] }> = ({ s, out, title, max, marks, y, fill }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const cw = W - 2 * M, x0 = 60, x1 = cw - 60, u = (m: number) => x0 + ((x1 - x0) * m) / max;
  const rule = p(frame, s + 1, D.rowWipe, "sweep");
  const last = marks[marks.length - 1];
  const band = fill ? p(frame, last.s + 1, D.dotFill, "sweep") : 0;
  const steps = max <= 6 ? 1 : max <= 18 ? 6 : 12;
  return (
    <div style={{ ...card(24), left: M, top: y, width: cw, height: 300, ...life(frame, s + 1, out) }}>
      <div style={{ position: "absolute", left: x0, top: 26, ...disp(38, INK) }}>{title}</div>
      {fill && <svg width={cw} height={300} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}><path d={`M${u(fill[0])},140 L${u(fill[0]) + (u(fill[1]) - u(fill[0])) * band},140`} stroke={INK} strokeWidth={14} strokeLinecap="round" opacity={0.85} /></svg>}
      <svg width={cw} height={300} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}><path d={`M${x0},153 L${x0 + (x1 - x0) * rule},153`} stroke={INK} strokeWidth={3} /></svg>
      {Array.from({ length: Math.floor(max / steps) + 1 }, (_, k) => k * steps).map((m) => (
        <div key={m} style={{ position: "absolute", left: u(m) - 40, width: 80, top: 166, textAlign: "center", ...caps(24, INK), opacity: rule >= m / max ? 1 : 0 }}>{m}</div>
      ))}
      <div style={{ position: "absolute", left: x1 + 8, top: 166, ...caps(20, MUTED), opacity: rule }}>mo</div>
      {marks.map((k, i) => (
        <React.Fragment key={i}>
          <Arrow variant="marker-tick" from={{ x: M + u(k.m), y: y + 60 }} to={{ x: M + u(k.m), y: y + 124 }} start={k.s + 1} end={out + D.exit} />
          <div style={{ position: "absolute", left: u(k.m) - 160, width: 320, top: 214, textAlign: "center", ...disp(36, INK), ...life(frame, k.s + 1, out, 8) }}>{k.label}</div>
        </React.Fragment>
      ))}
    </div>
  );
};

// B05 two-row ledger (checklist-ledger, DDOS f1686-1745 Moment C: a row is marked in 14 f on `sweep`, +1 f after its word, here as a
// pen underline under the value, v3: no filled block behind text): the two treatments and when each shows.
export const Ledger: React.FC<{ s: number; out: number; rows: { k: string; v: string; s: number }[]; y: number; title: string }> = ({ s, out, rows, y, title }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  return (
    <div style={{ ...card(24), left: M, top: y, width: W - 2 * M, padding: "30px 34px 22px", ...life(frame, s + 1, out) }}>
      <div style={{ ...caps(24, MUTED), marginBottom: 14 }}>{title}</div>
      {rows.map((r, i) => {
        const w = p(frame, r.s + 1, D.rowWipe, "sweep");
        return (
          <div key={i} style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "16px 14px", borderTop: i ? "1.5px solid rgba(29,34,48,.12)" : "none", opacity: frame > r.s ? 1 : 0.35 }}>
            <span style={{ position: "relative", ...disp(40, INK, 500) }}>{r.k}</span>
            <span style={{ position: "relative", ...disp(40, INK) }}>{r.v}
              <svg width={260} height={14} style={{ position: "absolute", right: 0, bottom: -12, overflow: "visible" }}><path d="M0,8 C80,3 170,12 260,5" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray={`${w} 1`} /></svg>
            </span>
          </div>
        );
      })}
    </div>
  );
};

// B06 soft tissue moving down (arrow-route-trace on the real face, DDOS f216-250, 27 f `sweep`; mechanism-on-real-image G1 T8):
// "Deflation" in the v3 label (type with presence + pen underline) on its word; on "moving down" a headed route draws on her face from the cheekbone to the jaw (tracked). The
// arrow is a path of his words, not anatomy (DECISIONS 14d rule 6).
export const DownTrace: React.FC<{ s: number; defS: number; out: number; from: PtSrc; via: PtSrc; to: PtSrc; labelX: number; labelY: number; label?: boolean }> = ({ s, defS, out, from, via, to, labelX, labelY, label = true }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, defS + 1, out)) return null;
  return (
    <AbsoluteFill>
      {label && <Label eyebrow="The source" word="Deflation" sub="Soft tissue moving down" s={defS} subS={s - 23} out={out} x={labelX} y={labelY} size={88} />}
      <Arrow variant="route-trace" from={from} via={[via]} to={to} start={s + 1 - 27} end={out + D.exit} />
    </AbsoluteFill>
  );
};

// B08 rings on the laugh lines (tracking-ring, G4 T20 tQkjtXJEtxY f851-1091: re-placed every frame, 5 f `arrive`) + his line in the
// v3 label (type with presence + pen underline), "so less filler goes in them" typing on "better".
export const LaughRings: React.FC<{ s: number; betterS: number; out: number; pts: PtSrc[]; r: number; y: number }> = ({ s, betterS, out, pts, r, y }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const q = p(frame, s + 1, D.ring, "arrive"), e = p(frame, out, D.exit, "exit");
  return (
    <AbsoluteFill>
      <svg width={W} height={1920} style={{ position: "absolute", inset: 0, filter: "drop-shadow(0 1px 3px rgba(8,12,22,.45))" }}>
        {pts.map((pt, i) => { const o = at(pt, frame); return <ellipse key={i} cx={o.x} cy={o.y} rx={(r + 6 * (1 - q)) * 0.7 + breathe(frame, 1)} ry={r + 6 * (1 - q)} fill="none" stroke={WHITE} strokeWidth={4} opacity={q * (1 - e)} />; })}
      </svg>
      <Label word="Laugh lines: better" sub="so less filler goes in them" s={s} subS={betterS} out={out} x={M} y={y} size={72} />
    </AbsoluteFill>
  );
};

// B10 the technique line on the injection footage (the v3 label; his phrase types on its word; the footage is the picture)
export const TechLine: React.FC<{ s: number; hiS: number; out: number; eyebrow: string; text: string; hi: string; y: number }> = ({ s, hiS, out, eyebrow, text, hi, y }) => (
  <Label eyebrow={eyebrow} word={text} sub={hi} s={s} subS={hiS} out={out} x={M} y={y} size={80} />
);

// B12 the time and the duration (rx-card: white card, caps eyebrow, bold value; the value rolls on its word, type-rolling-swap SU S2)
export const FactCard: React.FC<{ s: number; out: number; rows: { k: string; v: string; s: number }[]; y: number }> = ({ s, out, rows, y }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  return (
    <div style={{ ...card(24), left: M, top: y, width: W - 2 * M, padding: "24px 32px", display: "flex", gap: 40, ...life(frame, s + 1, out) }}>
      {rows.map((r, i) => {
        const q = p(frame, r.s + 1, D.swap, "swap");
        return (
          <div key={i} style={{ flex: 1, opacity: frame > r.s ? 1 : 0.3 }}>
            <div style={{ ...caps(22, MUTED) }}>{r.k}</div>
            <div style={{ height: 52, overflow: "hidden", position: "relative", marginTop: 8 }}>
              <div style={{ position: "absolute", top: `${(1 - q) * 100}%`, ...disp(44, INK), whiteSpace: "nowrap" }}>{r.v}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
export { FONT };
