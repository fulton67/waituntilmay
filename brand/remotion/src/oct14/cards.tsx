// Oct 14 reel v3 (CRITIQUE_v2.md fixes): the title card, the section card (one look for all four), the end card, the two-lane day
// axis, and the needle vs cannula section. Consent = yes (DECISIONS 16d).
//   TitleCard / ChapterCard: 9:16 derivatives of exo6/Cards.tsx SectionCard (`chapter-title-card`): number + rule + "Chapter", the
//     title typed on under a travelling light, type-in 12 f, HOLD 60 f fully lit, letters out 8 f (80 f); full frame over the real,
//     moving picture with a left darkening 0.72 -> 0.18 (RULES "Title and section cards"). Accents white, not blue (client 2026-11-17).
//   OctEnd: the end card on the sharp final frame (no blur: CRITIQUE row 1:30), the darkening ground, a glass plate.
//   DayLanes (`day-axis-lanes`, new): one designed object with a real time axis for "a day or two vs right away".
//   CannulaSection (`needle-cannula-section`, new): a skin section traced from skin_crosssection.glb; a sharp needle crosses a vessel,
//     the blunt cannula glides in the fat layer. ostad_check pending.
import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { card } from "../components/Ro";
import { FONT, INK, MUTED, W, caps, disp, life, p, vis } from "./look";
import type { AnatomyData } from "./anatomy";

const cl = (v: number) => Math.min(1, Math.max(0, v));
export const SEC = { typeIn: 12, hold: 60, out: 8 } as const;
export const SEC_LEN = SEC.typeIn + SEC.hold + SEC.out; // 80 f

/** the darkened ground every card sits on: left darkening 0.72 -> 0.18 (RULES) over the moving picture */
const Ground: React.FC<{ o: number }> = ({ o }) => (
  <div style={{ position: "absolute", inset: 0, opacity: o, background: "linear-gradient(90deg, rgba(10,12,18,.72) 0%, rgba(10,12,18,.18) 100%)" }} />
);

const Typed: React.FC<{ title: string; t: number; size: number }> = ({ title, t, size }) => {
  const n = title.length, rate = n / SEC.typeIn;
  const head = Math.min(n, t * rate), outT = t - (SEC.typeIn + SEC.hold);
  const gone = outT >= 0 ? Math.ceil(((outT + 1) / SEC.out) * n) : 0;
  const bloomO = cl(1 - Math.max(0, t - SEC.typeIn) / 6);
  return (
    <div style={{ position: "relative", font: `600 ${size}px/1.02 ${FONT}`, letterSpacing: "-0.015em", color: "#fff", textShadow: "0 2px 30px rgba(0,0,0,.35)" }}>
      <div style={{ position: "absolute", left: `${(head / n) * 100}%`, top: -40, width: 300, height: size + 80, marginLeft: -150, opacity: bloomO * 0.35,
        background: "radial-gradient(ellipse at 50% 55%, rgba(255,255,255,.95), rgba(255,255,255,0) 62%)", filter: "blur(6px)" }} />
      {title.split("").map((ch, i) => {
        const local = head - i + Math.max(0, t - SEC.typeIn) * rate;
        const a = cl(local / 1.5), blur = (1 - cl(local / 3)) * 6;
        return <span key={i} style={{ opacity: i < n - gone ? a : 0, filter: blur > 0.05 ? `blur(${blur}px)` : undefined, display: "inline-block", whiteSpace: "pre",
          textShadow: local < 3 && local > 0 ? `0 0 ${18 * (1 - local / 3)}px rgba(255,255,255,.9)` : undefined }}>{ch}</span>;
      })}
    </div>
  );
};

export const ChapterCard: React.FC<{ num: string; title: string; start: number; y?: number; size?: number; kicker?: string }> = ({ num, title, start, y = 700, size = 118, kicker = "Chapter" }) => {
  const f = useCurrentFrame(), t = f - start;
  if (t < 0 || t > SEC_LEN) return null;
  const rule = p(f, start, SEC.typeIn, "sweep") * (1 - p(f, start + SEC.typeIn + SEC.hold, SEC.out, "exit"));
  const ground = p(f, start, 8, "arrive") * (1 - p(f, start + SEC_LEN - 8, 8, "exit"));
  return (
    <>
      <Ground o={ground} />
      <div style={{ position: "absolute", left: 98, top: y, width: W - 196 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 22, opacity: rule }}>
          <span style={{ ...caps(30, "#fff"), letterSpacing: "0.2em" }}>{num}</span>
          <span style={{ width: 200, height: 3, borderRadius: 2, background: "#fff", transformOrigin: "0 50%", transform: `scaleX(${rule})` }} />
          <span style={{ ...caps(26, "rgba(255,255,255,.82)") }}>{kicker}</span>
        </div>
        <Typed title={title} t={t} size={size} />
      </div>
    </>
  );
};

/** the opening title card: the reel's argument in his words ("the source of the problem"), over the hook shot */
export const TitleCard: React.FC<{ start: number; title: string; sub: string }> = ({ start, title, sub }) => {
  const f = useCurrentFrame(), t = f - start;
  if (t < 0 || t > SEC_LEN) return null;
  const ground = p(f, start, 6, "arrive") * (1 - p(f, start + SEC_LEN - 8, 8, "exit"));
  const subO = p(f, start + 8, 10, "arrive") * (1 - p(f, start + SEC.typeIn + SEC.hold, SEC.out, "exit"));
  return (
    <>
      <Ground o={ground} />
      <div style={{ position: "absolute", left: 98, top: 560, width: W - 196 }}>
        <div style={{ ...caps(26, "rgba(255,255,255,.86)"), letterSpacing: "0.18em", marginBottom: 24, opacity: subO }}>{sub}</div>
        <Typed title={title} t={t} size={124} />
      </div>
    </>
  );
};

export const OctEnd: React.FC<{ start: number }> = ({ start }) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  const g = p(f, start, 12, "arrive");
  const L = (i: number) => life(f, start + 10 + 4 * i);
  return (
    <>
      <Ground o={g} />
      <div style={{ ...card(32), left: 98, top: 700, width: W - 196, padding: "64px 64px 52px", boxSizing: "border-box", ...life(f, start + 4) }}>
        <div style={{ ...disp(84, INK), ...L(0) }}>Book a consultation.</div>
        <div style={{ font: `500 44px/1.2 ${FONT}`, color: MUTED, marginTop: 18, ...L(1) }}>Link in bio.</div>
        <div style={{ font: `500 30px/1 ${FONT}`, letterSpacing: "0.06em", color: INK, marginTop: 40, ...L(2) }}>@drarielostad</div>
      </div>
    </>
  );
};

/**
 * DayLanes: a real day axis (0-7 days). Filler: a full bar from day 0 on "right away". Neuromodulator: starts at day 1-2 on "a day
 * or two" and ramps; beyond that his words give no figure, so the ramp ends in a dotted fade (no invented peak day).
 */
export const DayLanes: React.FC<{ s: number; neuroS: number; fillerS: number; out: number; y: number;
  /** v5c cream beat: left edge, card width / height and a type scale (defaults = the v3/v4 card, unchanged) */
  x?: number; cw?: number; ch?: number; k?: number }> = ({ s, neuroS, fillerS, out, y, x = 98, cw = W - 196, ch = 360, k = 1 }) => {
  const f = useCurrentFrame();
  if (!vis(f, s + 1, out)) return null;
  const v = ch / 360; // vertical stretch of the lane rows
  const x0 = 40 + 250 * k, x1 = cw - 50, days = 7, u = (d: number) => x0 + ((x1 - x0) * d) / days;
  const axis = p(f, s + 1, 18, "sweep");
  const fb = p(f, fillerS + 1, 16, "sweep"), nb = p(f, neuroS + 1, 24, "sweep");
  const laneY = [118 * v, 222 * v], ay = ch - 60 * k, sw = 10 * k;
  return (
    <div style={{ ...card(24), left: x, top: y, width: cw, height: ch, ...life(f, s + 1, out) }}>
      <div style={{ position: "absolute", left: 40, top: 28 * v, ...disp(38 * k, INK) }}>When you see it</div>
      {["Neuromodulator", "Filler"].map((key, i) => (
        <div key={key} style={{ position: "absolute", left: 40, top: laneY[i] + 14 * k, ...disp(30 * k, INK, 500) }}>{key}</div>
      ))}
      <svg width={cw} height={ch} style={{ position: "absolute", left: 0, top: 0 }}>
        {/* axis + day ticks */}
        <path d={`M${x0},${ay} L${x0 + (x1 - x0) * axis},${ay}`} stroke={INK} strokeWidth={2.5 * k} />
        {Array.from({ length: days + 1 }, (_, d) => d).map((d) => (
          <g key={d} opacity={axis >= d / days ? 1 : 0}>
            <path d={`M${u(d)},${ay - 8 * k} L${u(d)},${ay + 8 * k}`} stroke={INK} strokeWidth={2 * k} />
            <text x={u(d)} y={ay + 38 * k} textAnchor="middle" style={{ font: `500 ${22 * k}px ${FONT}`, fill: MUTED }}>{d === 0 ? "day 0" : d}</text>
          </g>
        ))}
        {/* neuromodulator: nothing until day 1-2, then it ramps; dotted past what he said */}
        <path d={`M${u(0)},${laneY[0] + 30 * k} L${u(1)},${laneY[0] + 30 * k}`} stroke={INK} strokeOpacity={0.25} strokeWidth={3 * k} strokeDasharray={`${2 * k} ${8 * k}`} strokeLinecap="round" opacity={nb > 0 ? 1 : 0} />
        <path d={`M${u(1)},${laneY[0] + 44 * k} C${u(1.6)},${laneY[0] + 44 * k} ${u(2)},${laneY[0] + 22 * k} ${u(2.6)},${laneY[0] + 16 * k} L${u(4)},${laneY[0] + 14 * k}`} fill="none" stroke={INK}
          strokeWidth={sw} strokeLinecap="round" pathLength={1} strokeDasharray={`${nb} 1`} />
        <path d={`M${u(4)},${laneY[0] + 14 * k} L${u(7)},${laneY[0] + 14 * k}`} stroke={INK} strokeOpacity={0.35} strokeWidth={4 * k} strokeDasharray={`${2 * k} ${10 * k}`} strokeLinecap="round" opacity={nb >= 1 ? 1 : 0} />
        {/* filler: right away, from day 0 */}
        <path d={`M${u(0)},${laneY[1] + 30 * k} L${u(0) + (u(7) - u(0)) * fb},${laneY[1] + 30 * k}`} stroke={INK} strokeWidth={sw} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", left: u(1.15), top: laneY[0] - 22 * k, ...caps(20 * k, INK), ...life(f, neuroS + 6, out, 8) }}>a day or two</div>
      <div style={{ position: "absolute", left: u(0.1), top: laneY[1] - 22 * k, ...caps(20 * k, INK), ...life(f, fillerS + 4, out, 8) }}>right away</div>
    </div>
  );
};

/**
 * CannulaSection: the skin section traced from skin_crosssection.glb (layers, a row of fat lobules, two vessels in cross-section).
 * Lane 1 (on `s`): a sharp needle comes in at an angle through the dermis and crosses a vessel, which is marked. Lane 2 (on `hiS`,
 * "minimise bruising"): the blunt cannula glides along the fat layer, under the vessels. Illustration; ostad_check pending.
 */
export const CannulaSection: React.FC<{ data: AnatomyData; s: number; hiS: number; out: number; x: number; y: number; w: number; h: number }> = ({ data, s, hiS, out, x, y, w, h }) => {
  const f = useCurrentFrame();
  if (!vis(f, s + 1, out)) return null;
  const V = data.views.section;
  const by = (id: string) => V.paths.find((q) => q.id === id);
  const head = 96, pad = 24;
  const ids = ["epidermis", "dermis", "hypodermis", "artery", "vein", "fat_lobules"].filter((i) => by(i));
  const bb = ids.map((i) => by(i)!.bbox);
  const X0 = Math.min(...bb.map((b) => b[0])), Y0 = Math.min(...bb.map((b) => b[1]));
  const X1 = Math.max(...bb.map((b) => b[0] + b[2])), Y1 = Math.max(...bb.map((b) => b[1] + b[3]));
  const sc = Math.min((w - 2 * pad) / (X1 - X0), (h - head - 64) / (Y1 - Y0));
  const ox = pad - X0 * sc + ((w - 2 * pad) - (X1 - X0) * sc) / 2, oy = head - Y0 * sc;
  const T = (q: [number, number]) => [ox + q[0] * sc, oy + q[1] * sc];
  const draw = p(f, s + 1 + 14, 12, "sweep");
  const art = by("artery")!;
  // the needle: from upper left to the artery's centre and a little past it
  const a = T(art.c as [number, number]);
  const n0 = [a[0] - 220, a[1] - 150], nk = p(f, s + 1 + 26, 22, "sweep");
  const nTip = [n0[0] + (a[0] + 30 - n0[0]) * nk, n0[1] + (a[1] + 20 - n0[1]) * nk];
  const hit = nk > 0.85;
  // the cannula: along the fat layer (below the vessels), entering from the left
  const fatTop = oy + (by("hypodermis")!.bbox[1] + 40) * sc;
  const ck = p(f, hiS + 1, 30, "sweep");
  const c0 = pad - 40, cTipX = c0 + (w - pad - 60 - c0) * ck;
  return (
    <div style={{ ...card(24), left: x, top: y, width: w, height: h, ...life(f, s + 1, out) }}>
      <div style={{ position: "absolute", left: 30, top: 22, ...caps(20, MUTED) }}>Why a cannula</div>
      <div style={{ position: "absolute", left: 30, top: 50, ...disp(36, INK) }}>Less chance of a bruise</div>
      <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "hidden" }}>
        <g transform={`translate(${ox} ${oy}) scale(${sc})`}>
          {ids.map((i) => (
            <path key={i} d={by(i)!.d} fill={INK} fillOpacity={(i === "artery" || i === "vein" ? 0.18 : i === "fat_lobules" ? 0.07 : 0.03) * draw} stroke={INK}
              strokeOpacity={i === "artery" || i === "vein" ? 0.9 : 0.4} strokeWidth={i === "artery" || i === "vein" ? 2.6 : 1.6} vectorEffect="non-scaling-stroke"
              pathLength={1} strokeDasharray={`${draw} 1`} />
          ))}
        </g>
        {/* sharp needle: a bevelled line; its tip crosses the vessel, which is then marked */}
        {nk > 0 && <path d={`M${n0[0]},${n0[1]} L${nTip[0]},${nTip[1]}`} stroke={INK} strokeWidth={5} strokeLinecap="butt" />}
        {nk > 0 && <path d={`M${nTip[0]},${nTip[1]} l-16,-4 l4,12 z`} fill={INK} />}
        {hit && <circle cx={a[0]} cy={a[1]} r={22 + 6 * p(f, s + 1 + 46, 8, "arrive")} fill="none" stroke={INK} strokeWidth={3} strokeDasharray="5 5" />}
        {/* blunt cannula: a rounded tube gliding along the fat layer */}
        {ck > 0 && <path d={`M${c0},${fatTop} L${cTipX},${fatTop}`} stroke={INK} strokeWidth={9} strokeLinecap="round" />}
      </svg>
      <div style={{ position: "absolute", left: Math.min(w - 300, a[0] + 34), top: a[1] - 64, ...caps(19, INK), ...life(f, s + 1 + 48, out, 8) }}>Sharp needle: can nick a vessel</div>
      <div style={{ position: "absolute", left: 30, top: fatTop + 18, ...caps(19, INK), ...life(f, hiS + 12, out, 8) }}>Blunt cannula: glides in the fat layer</div>
      <div style={{ position: "absolute", left: 30, bottom: 16, ...caps(15, MUTED), letterSpacing: "0.06em" }}>Illustration · skin layers traced from a 3D model</div>
    </div>
  );
};


/**
 * HookBA (REELS_HOW_I_WOULD_BUILD row 0-1.5 s): open on the result, full frame. Her registered 4:42 PM frame, a line wipe to
 * 4:55 PM by 30 f, and the measured cheek shadow line drawing on (oct14_contour.py). Same crop and pair as the SkinCard window.
 */
export const HookBA: React.FC<{ before: string; after: string; crop: { x: number; y: number; w: number }; out: number;
  contour?: { before: [number, number][]; after: [number, number][] } }> = ({ before, after, crop, out, contour }) => {
  const f = useCurrentFrame();
  if (f > out + 8) return null;
  const iw = 1080, ih = 1920, k = 1080 / (crop.w * iw);
  const fy = crop.y * ih + 170; // her face centre (pair.json face_box), kept in the frame's middle
  const ox = -crop.x * iw * k, oy = -(fy - 1920 / k / 2) * k;
  const wipe = p(f, 4, 22, "sweep"), lineK = p(f, 22, 10, "sweep"), o = 1 - p(f, out, 8, "exit");
  const img = (src: string) => <Img src={staticFile(src)} style={{ position: "absolute", left: ox, top: oy, width: iw * k, height: ih * k, maxWidth: "none" }} />;
  const T = (q: [number, number]) => `${ox + q[0] * k},${oy + q[1] * k}`;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, overflow: "hidden" }}>
      {img(before)}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${wipe * 100}%`, overflow: "hidden" }}>{img(after)}</div>
      {wipe > 0 && wipe < 1 && <div style={{ position: "absolute", left: `${wipe * 100}%`, top: 0, bottom: 0, width: 3, marginLeft: -1.5, background: "#fff" }} />}
      {contour && lineK > 0 && <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <path d={"M" + contour.before.map(T).join(" L")} fill="none" stroke="#fff" strokeWidth={4} strokeDasharray="10 9" opacity={0.9 * lineK} />
        <path d={"M" + contour.after.map(T).join(" L")} fill="none" stroke="#fff" strokeWidth={5} pathLength={1} strokeDasharray={`${lineK} 1`} />
      </svg>}
      <div style={{ position: "absolute", left: 98, top: 1360, ...caps(24, "#fff"), textShadow: "0 1px 6px rgba(0,0,0,.5)", opacity: p(f, 6, 8, "arrive") }}>
        {wipe < 0.5 ? "4:42 PM · before" : "4:55 PM · right after"}
      </div>
    </div>
  );
};

/** FormVsSmooth (new, topic-only): two gel drops on a glass slide; Form holds a tall dome, Smooth spreads thin ("not as thick"). Illustration. */
export const FormVsSmooth: React.FC<{ s: number; spreadS: number; out: number; x: number; y: number; w: number }> = ({ s, spreadS, out, x, y, w }) => {
  const f = useCurrentFrame();
  if (!vis(f, s + 1, out)) return null;
  const drop = p(f, s + 1 + 10, 14, "arrive"), sp = p(f, spreadS + 1, 24, "sweep");
  const h = 330, base = 236, cx = [w * 0.28, w * 0.72];
  const dome = (c: number, rx: number, ry: number) => `M${c - rx},${base} C${c - rx},${base - ry * 1.3} ${c + rx},${base - ry * 1.3} ${c + rx},${base} Z`;
  const formRx = 70, formRy = 92 * drop;
  const smRx = 70 + 80 * sp, smRy = (92 - 66 * sp) * drop;
  return (
    <div style={{ ...card(24), left: x, top: y, width: w, height: h, ...life(f, s + 1, out) }}>
      <div style={{ position: "absolute", left: 30, top: 22, ...caps(20, MUTED) }}>Two gels, two jobs</div>
      <div style={{ position: "absolute", left: 30, top: 50, ...disp(34, INK) }}>Smooth is not as thick</div>
      <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }}>
        <path d={`M30,${base} L${w - 30},${base}`} stroke={INK} strokeWidth={2.5} />
        <path d={dome(cx[0], formRx, formRy)} fill={INK} fillOpacity={0.16} stroke={INK} strokeWidth={3} />
        <path d={dome(cx[1], smRx, smRy)} fill={INK} fillOpacity={0.16} stroke={INK} strokeWidth={3} />
      </svg>
      <div style={{ position: "absolute", left: cx[0], top: base + 16, transform: "translateX(-50%)", textAlign: "center", ...caps(20, INK) }}>Evolysse Form<div style={{ ...caps(17, MUTED), marginTop: 6 }}>holds its shape · cheekbone</div></div>
      <div style={{ position: "absolute", left: cx[1], top: base + 16, transform: "translateX(-50%)", textAlign: "center", ...caps(20, INK) }}>Evolysse Smooth<div style={{ ...caps(17, MUTED), marginTop: 6 }}>spreads thin · lines</div></div>
      <div style={{ position: "absolute", right: 24, top: 24, ...caps(15, MUTED), letterSpacing: "0.06em" }}>Illustration</div>
    </div>
  );
};
