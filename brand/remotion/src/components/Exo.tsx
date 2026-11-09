import { OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, clamp } from "../brand";
import { BLUE, MUTED, NAVY, RULE, Sfx, card, enter, place } from "./Ro";

// Mechanism + sensation cards for the Exomind reel (style DECISIONS 13), same calm glass as components/Ro.tsx.
// Client: "show the neurotransmitters off balance and show how the neuroplasticity actually is improved"; "when he taps the top of
// his head, kind of show"; "the numbers are improving"; "a video of the Exomind treatment actually happening ... muted ... on the side
// of his head or at the bottom". Positions: Ro's zones plus "xy:<left>,<top>" (place() in Ro.tsx) for the column between the two faces.
const quint = (q: number) => 1 - (1 - q) ** 5;
const useT = () => useCurrentFrame() / useVideoConfig().fps;
const Caps: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ font: `500 18px/1 ${FONT}`, letterSpacing: "0.13em", textTransform: "uppercase", color: MUTED, ...style }}>{children}</div>
);
const Title: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({ children, size = 36, style }) => (
  <div style={{ font: `600 ${size}px/1.1 ${FONT}`, letterSpacing: "-0.01em", marginTop: 8, ...style }}>{children}</div>
);

// ---------- a muted clip in a glass card (the practice's own treatment footage, or the maker's mechanism animation) ----------
export const VideoCard: React.FC<{ dur: number; src: string; caps: string; title: string; pos?: string; w?: number; aspect?: number; credit?: string }> = ({
  dur, src, caps, title, pos = "top", w = 440, aspect = 0.75, credit,
}) => {
  const t = useT();
  return (
    <>
      <div style={{ ...card(26), ...place(pos, w), width: w, ...enter(t, 0, dur - 0.3) }}>
        <div style={{ margin: 10, height: (w - 20) * aspect, borderRadius: 18, overflow: "hidden", background: "#0c1220" }}>
          <Sequence layout="none" from={0}><OffthreadVideo src={staticFile(src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} /></Sequence>
        </div>
        <div style={{ padding: "4px 22px 18px" }}>
          <Caps>{caps}</Caps>
          <Title>{title}</Title>
          {credit && <div style={{ marginTop: 8, font: `500 14px/1.2 ${FONT}`, color: "#9aa0ae" }}>{credit}</div>}
        </div>
      </div>
      <Sfx at={0} name="card" />
    </>
  );
};

// ---------- neurotransmitters: a balance that sits tilted ("off balance"), then levels ----------
export const Balance: React.FC<{ dur: number; title?: string; levelAt?: number; pos?: string; w?: number; off?: string; on?: string }> = ({
  dur, title = "Neurotransmitters", levelAt = 99, pos = "chest", w = 620, off = "Off balance", on = "Rebalanced",
}) => {
  const t = useT();
  const lv = quint(clamp((t - levelAt) / 0.8));
  const sway = Math.sin(t * 2.2) * 1.5 * (1 - lv);
  const ang = -13 * quint(clamp((t - 0.4) / 0.9)) * (1 - lv) + sway;
  const dots = (n: number, x0: number) => Array.from({ length: n }, (_, i) => <circle key={i} cx={x0 + (i % 4) * 14 - 21} cy={-14 - Math.floor(i / 4) * 13} r={5.2} fill={BLUE} opacity={0.85} />);
  return (
    <>
      <div style={{ ...card(), ...place(pos, w), width: w, padding: "22px 28px 18px", boxSizing: "border-box", ...enter(t, 0, dur - 0.3) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Title size={38} style={{ marginTop: 0 }}>{title}</Title>
          <Caps style={{ color: lv > 0.5 ? BLUE : "#d0566b" }}>{lv > 0.5 ? on : off}</Caps>
        </div>
        <svg width={w - 56} height={170} viewBox={`${-(w - 56) / 2} -110 ${w - 56} 170`} style={{ display: "block", marginTop: 6 }}>
          <path d="M -22 52 L 0 6 L 22 52 Z" fill="none" stroke={MUTED} strokeWidth={2.2} strokeLinejoin="round" />
          <g transform={`rotate(${ang})`}>
            <line x1={-190} x2={190} y1={0} y2={0} stroke={NAVY} strokeWidth={3} strokeLinecap="round" />
            <g transform="translate(-170 0)"><line x1={0} x2={0} y1={0} y2={-4} stroke={NAVY} strokeWidth={2} />{dots(lv > 0.5 ? 8 : 11, 0)}</g>
            <g transform="translate(170 0)"><line x1={0} x2={0} y1={0} y2={-4} stroke={NAVY} strokeWidth={2} />{dots(lv > 0.5 ? 8 : 3, 0)}</g>
          </g>
        </svg>
      </div>
      <Sfx at={0} name="card" />
      {levelAt < dur && <Sfx at={levelAt} name="yes" gain={0.7} />}
    </>
  );
};

// ---------- neuroplasticity: nodes, and new connections drawing between them ----------
export const Network: React.FC<{ dur: number; title?: string; from?: number; pos?: string; w?: number }> = ({ dur, title = "Neuroplasticity", from = 0.4, pos = "chest", w = 620 }) => {
  const t = useT();
  const H = 190, GW = w - 56;
  const nodes = Array.from({ length: 13 }, (_, i) => ({ x: 20 + ((i * 61) % 97) / 97 * (GW - 40), y: 18 + ((i * 37) % 89) / 89 * (H - 36) }));
  const edges: [number, number][] = [[0, 3], [3, 7], [7, 1], [1, 9], [9, 4], [4, 11], [11, 6], [6, 2], [2, 10], [10, 5], [5, 12], [12, 8], [8, 0], [3, 9], [7, 11], [2, 5], [6, 10], [1, 4]];
  const old = 6;
  const shown = (i: number) => (i < old ? 1 : quint(clamp((t - from - (i - old) * 0.12) / 0.4)));
  const newCount = edges.slice(old).filter((_, i) => t >= from + i * 0.12 + 0.2).length;
  return (
    <>
      <div style={{ ...card(), ...place(pos, w), width: w, padding: "22px 28px 16px", boxSizing: "border-box", ...enter(t, 0, dur - 0.3) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Title size={38} style={{ marginTop: 0 }}>{title}</Title>
          <Caps style={{ color: BLUE }}>{newCount > 0 ? `+${newCount} new connections` : "New connections"}</Caps>
        </div>
        <svg width={GW} height={H} style={{ display: "block", marginTop: 8 }}>
          {edges.map(([a, b], i) => (
            <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[a].x + (nodes[b].x - nodes[a].x) * shown(i)} y2={nodes[a].y + (nodes[b].y - nodes[a].y) * shown(i)}
              stroke={i < old ? RULE : BLUE} strokeWidth={i < old ? 2 : 2.6} strokeLinecap="round" />
          ))}
          {nodes.map((n, i) => <circle key={i} cx={n.x} cy={n.y} r={7} fill="#fff" stroke={NAVY} strokeWidth={2} />)}
        </svg>
      </div>
      <Sfx at={0} name="card" />
      <Sfx at={from} name="swish" gain={0.7} />
    </>
  );
};

// ---------- "it quiets my brain": a busy wave that settles ----------
export const Wave: React.FC<{ dur: number; caps?: string; title?: string; calmAt?: number; pos?: string; w?: number }> = ({ dur, caps = "Her words", title = "“It quiets my brain.”", calmAt = 0.9, pos = "topRight", w = 440 }) => {
  const t = useT();
  const c = quint(clamp((t - calmAt) / 1.2));
  const GW = w - 48, H = 90;
  const pts = Array.from({ length: 160 }, (_, i) => {
    const x = i / 159, busy = Math.sin(x * 60 + t * 9) * 0.5 + Math.sin(x * 23 - t * 6) * 0.35 + Math.sin(x * 97 + t * 13) * 0.25;
    const calm = Math.sin(x * 9 - t * 2) * 0.35;
    return `${(x * GW).toFixed(1)},${(H / 2 - (busy * (1 - c) + calm * c) * H * 0.42).toFixed(1)}`;
  }).join(" ");
  return (
    <>
      <div style={{ ...card(26), ...place(pos, w), width: w, padding: "20px 24px 18px", boxSizing: "border-box", ...enter(t, 0, dur - 0.3) }}>
        <Caps>{caps}</Caps>
        <Title size={34}>{title}</Title>
        <svg width={GW} height={H} style={{ display: "block", marginTop: 10 }}><polyline points={pts} fill="none" stroke={c > 0.5 ? BLUE : "#d0566b"} strokeWidth={3} strokeLinejoin="round" /></svg>
      </div>
      <Sfx at={0} name="card" />
      <Sfx at={calmAt} name="swish" gain={0.6} />
    </>
  );
};

// ---------- bars: nights of sleep / before -> now (illustrative, labelled) ----------
export const Bars: React.FC<{ dur: number; caps: string; title: string; bars: { label: string; v: number }[]; from?: number; step?: number; pos?: string; w?: number; note?: string }> = ({
  dur, caps, title, bars, from = 0.4, step = 0.18, pos = "top", w = 440, note,
}) => {
  const t = useT();
  const H = 130;
  return (
    <>
      <div style={{ ...card(26), ...place(pos, w), width: w, padding: "20px 24px 16px", boxSizing: "border-box", ...enter(t, 0, dur - 0.3) }}>
        <Caps>{caps}</Caps>
        <Title size={34}>{title}</Title>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: H, marginTop: 14 }}>
          {bars.map((b, i) => {
            const q = quint(clamp((t - from - i * step) / 0.5));
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ width: "100%", height: (H - 26) * b.v * q, borderRadius: 8, background: i === bars.length - 1 ? BLUE : "rgba(47,159,224,.35)" }} />
                <div style={{ font: `500 15px/1 ${FONT}`, color: MUTED }}>{b.label}</div>
              </div>
            );
          })}
        </div>
        {note && <div style={{ marginTop: 8, font: `500 14px/1.2 ${FONT}`, color: "#9aa0ae" }}>{note}</div>}
      </div>
      <Sfx at={0} name="card" />
      <Sfx at={from + (bars.length - 1) * step} name="pop" gain={0.7} />
    </>
  );
};

// ---------- a level that drains ("dissipates quickly") or a ring that runs ("up to an hour") ----------
export const Meter: React.FC<{ dur: number; caps: string; title: string; drainAt?: number; drain?: number; pos?: string; w?: number; foot?: string }> = ({
  dur, caps, title, drainAt = 1.2, drain = 1.0, pos = "chest", w = 620, foot,
}) => {
  const t = useT();
  const fill = quint(clamp((t - 0.3) / 0.6)) * (1 - 0.92 * quint(clamp((t - drainAt) / drain)));
  return (
    <>
      <div style={{ ...card(), ...place(pos, w), width: w, padding: "22px 28px 22px", boxSizing: "border-box", ...enter(t, 0, dur - 0.3) }}>
        <Caps>{caps}</Caps>
        <Title size={38}>{title}</Title>
        <div style={{ marginTop: 18, height: 14, borderRadius: 7, background: RULE, overflow: "hidden" }}>
          <div style={{ width: `${fill * 100}%`, height: "100%", borderRadius: 7, background: `linear-gradient(90deg, ${BLUE}, #7cc8f2)` }} />
        </div>
        {foot && <div style={{ marginTop: 12, font: `500 24px/1.2 ${FONT}`, color: MUTED, ...enter(t, drainAt + 0.3) }}>{foot}</div>}
      </div>
      <Sfx at={0} name="card" />
      <Sfx at={drainAt} name="swish" gain={0.6} />
    </>
  );
};

export const Timer: React.FC<{ dur: number; caps?: string; title?: string; pos?: string; w?: number }> = ({ dur, caps = "Afterwards", title = "Up to an hour", pos = "chest", w = 520 }) => {
  const t = useT();
  const q = quint(clamp((t - 0.3) / 1.4));
  const R = 34, C = 2 * Math.PI * R;
  return (
    <>
      <div style={{ ...card(26), ...place(pos, w), width: w, padding: "20px 26px", boxSizing: "border-box", display: "flex", gap: 22, alignItems: "center", ...enter(t, 0, dur - 0.3) }}>
        <svg width={84} height={84} viewBox="0 0 84 84" style={{ flex: "none" }}>
          <circle cx={42} cy={42} r={R} fill="none" stroke={RULE} strokeWidth={7} />
          <circle cx={42} cy={42} r={R} fill="none" stroke={BLUE} strokeWidth={7} strokeLinecap="round" strokeDasharray={`${C * q} ${C}`} transform="rotate(-90 42 42)" />
          <text x={42} y={48} textAnchor="middle" style={{ font: `600 18px ${FONT}`, fill: NAVY }}>1 hr</text>
        </svg>
        <div><Caps>{caps}</Caps><Title size={38}>{title}</Title></div>
      </div>
      <Sfx at={0} name="card" />
    </>
  );
};

// ---------- the sleep app: a glass phone with a trend that climbs (illustration) ----------
export const Phone: React.FC<{ dur: number; pos?: string; label?: string; from?: number }> = ({ dur, pos = "top", label = "Sleep trend", from = 0.5 }) => {
  const t = useT();
  const W = 300, Hh = 560, p = place(pos, W);
  const q = quint(clamp((t - from) / 1.6));
  const pts = [0.28, 0.33, 0.3, 0.42, 0.47, 0.45, 0.58, 0.64, 0.7, 0.78];
  const GW = W - 64, GH = 170;
  const d = pts.map((v, i) => `${(i / (pts.length - 1)) * GW},${GH - v * GH}`).join(" ");
  return (
    <>
      <div style={{ ...card(46), left: p.left, top: p.top, width: W, height: Hh, padding: "34px 32px", boxSizing: "border-box", ...enter(t, 0, dur - 0.3) }}>
        <div style={{ width: 90, height: 8, borderRadius: 4, background: "rgba(29,34,48,.18)", margin: "-14px auto 26px" }} />
        <Caps>{label}</Caps>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 10 }}>
          <div style={{ font: `600 56px/1 ${FONT}`, color: NAVY }}>↑</div>
          <div style={{ font: `600 34px/1.1 ${FONT}`, color: NAVY }}>Improving</div>
        </div>
        <svg width={GW} height={GH} style={{ display: "block", marginTop: 26, overflow: "visible" }}>
          {[0.25, 0.5, 0.75].map((y) => <line key={y} x1={0} x2={GW} y1={GH * y} y2={GH * y} stroke={RULE} strokeWidth={1.5} />)}
          <polyline points={d} fill="none" stroke={BLUE} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={`${q} 1`} />
          <circle cx={GW * Math.min(1, q)} cy={GH - pts[Math.min(pts.length - 1, Math.round(q * (pts.length - 1)))] * GH} r={7} fill={BLUE} opacity={q} />
        </svg>
        <div style={{ position: "absolute", left: 32, bottom: 30, font: `500 14px/1.2 ${FONT}`, color: "#9aa0ae" }}>Illustration</div>
      </div>
      <Sfx at={0} name="card" />
      <Sfx at={from} name="swish" gain={0.6} />
    </>
  );
};

// (timeline keys kind/at/dur/pos come in with every entry, so component-specific timings are named mode/swapAt)
// ---------- taps / pressure on the head, anchored to the footage (rendered inside the reframed video layer) ----------
export const Ripple: React.FC<{ dur: number; x: number; y: number; taps?: number[]; mode?: "tap" | "press"; label?: string; labelSide?: "left" | "right" }> = ({
  dur, x, y, taps = [0, 0.45, 0.9], mode = "tap", label, labelSide = "right",
}) => {
  const t = useT();
  const out = 1 - clamp((t - (dur - 0.3)) / 0.3);
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: out }}>
        {taps.map((a, i) => {
          const q = clamp((t - a) / (mode === "tap" ? 0.6 : 1.1));
          if (q <= 0 || q >= 1) return null;
          const r = mode === "tap" ? 14 + 70 * quint(q) : 110 - 90 * quint(q);
          return <circle key={i} cx={x} cy={y} r={r} fill="none" stroke="#fff" strokeWidth={3 * (1 - q) + 1} opacity={(1 - q) * 0.95} />;
        })}
        <circle cx={x} cy={y} r={7} fill="#fff" opacity={clamp(t / 0.2)} />
      </svg>
      {label && (
        <div style={{ ...card(999), padding: "12px 20px", font: `600 28px/1 ${FONT}`, top: y - 26, ...(labelSide === "right" ? { left: x + 60 } : { right: 1080 - x + 60 }), ...enter(t, taps[0] + 0.2, dur - 0.3) }}>{label}</div>
      )}
      {taps.map((a, i) => <Sfx key={i} at={a} name="pop" gain={mode === "tap" ? 0.5 : 0.35} />)}
    </>
  );
};

// ---------- a word that gets struck and replaced ("headache" -> "gentle pressure") ----------
export const Swap: React.FC<{ dur: number; from: string; to: string; swapAt?: number; pos?: string; w?: number; caps?: string }> = ({ dur, from, to, swapAt = 0.9, pos = "topRight", w = 440, caps = "Her words" }) => {
  const t = useT();
  const s = quint(clamp((t - 0.35) / 0.35));
  return (
    <>
      <div style={{ ...card(26), ...place(pos, w), width: w, padding: "20px 24px", boxSizing: "border-box", ...enter(t, 0, dur - 0.3) }}>
        <Caps>{caps}</Caps>
        <div style={{ position: "relative", display: "inline-block", font: `600 34px/1.15 ${FONT}`, color: s > 0.5 ? MUTED : NAVY, marginTop: 10 }}>
          {from}<div style={{ position: "absolute", left: -3, top: "55%", height: 2.5, background: NAVY, width: `calc((100% + 6px) * ${s})` }} />
        </div>
        <div style={{ font: `600 40px/1.1 ${FONT}`, color: NAVY, marginTop: 8, ...enter(t, swapAt) }}>{to}</div>
      </div>
      <Sfx at={0} name="card" />
      <Sfx at={0.35} name="no" gain={0.7} />
      <Sfx at={swapAt} name="pop" gain={0.7} />
    </>
  );
};

// ---------- a reaction coming out of the head: an outburst of jagged squiggles that settles into slow, calm waves ----------
// v2 client note: "when they tap their head ... some type of outburst and then it goes to a quieting"; "it quiets my brain: it
// actually comes out from her brain ... that kind of squiggly line that comes out from their brain". Drawn in the reframed footage
// layer at a measured head point, so it stays on the head through punch-ins. burstAt: the outburst (s); calmAt: the settle (s).
export const Burst: React.FC<{ dur: number; x: number; y: number; burstAt?: number; calmAt?: number; spread?: [number, number]; len?: number; rays?: number; label?: string; labelSide?: "left" | "right" }> = ({
  dur, x, y, burstAt = 0, calmAt = 1, spread = [-160, -20], len = 190, rays = 7, label, labelSide = "right",
}) => {
  const t = useT();
  const grow = quint(clamp((t - burstAt) / 0.35));
  const c = quint(clamp((t - calmAt) / 1.1));
  const kick = Math.exp(-Math.max(0, t - burstAt) * 3.2); // the jolt at the burst, decaying
  const out = 1 - clamp((t - (dur - 0.45)) / 0.45);
  const col = (a: number) => `rgba(255,255,255,${a})`; // white throughout (v2 client: "stay white instead of being red ... more brand"); the motion carries busy -> calm
  const paths = Array.from({ length: rays }, (_, i) => {
    const ang = ((spread[0] + ((spread[1] - spread[0]) * (i + 0.5)) / rays + Math.sin(i * 7.3) * 6) * Math.PI) / 180;
    const L = len * (0.75 + 0.35 * ((i * 37) % 10) / 10) * grow * (1 + 0.25 * c);
    const r0 = 12 + 18 * c;
    const ux = Math.cos(ang), uy = Math.sin(ang), px = -uy, py = ux;
    const ph = i * 1.9;
    const pts = Array.from({ length: 40 }, (_, k) => {
      const s = k / 39;
      const busy = (11 + 15 * kick) * Math.sin(s * 8 * Math.PI + ph - t * 14) + 4 * Math.sin(s * 23 * Math.PI + ph * 2 - t * 22);
      const calm = 9 * Math.sin(s * 2.6 * Math.PI + ph - t * 3);
      const off = (busy * (1 - c) + calm * c) * Math.min(1, s * 2.2);
      const r = r0 + L * s;
      return `${(x + ux * r + px * off).toFixed(1)},${(y + uy * r + py * off).toFixed(1)}`;
    }).join(" ");
    return <polyline key={i} points={pts} fill="none" stroke={col(0.95 - 0.1 * c)} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />;
  });
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: out, filter: "drop-shadow(0 0 1.5px rgba(10,14,24,.55)) drop-shadow(0 2px 10px rgba(10,14,24,.35))"  /* a dark edge so white reads on the white wall */ }}>
        {paths}
      </svg>
      {label && (
        <div style={{ ...card(999), padding: "12px 20px", font: `600 28px/1 ${FONT}`, top: y - len * 0.9, ...(labelSide === "right" ? { left: x + 70 } : { right: 1080 - x + 70 }), ...enter(t, calmAt + 0.2, dur - 0.4) }}>{label}</div>
      )}
      <Sfx at={burstAt} name="swish" gain={0.8} />
      <Sfx at={calmAt} name="yes" gain={0.5} />
    </>
  );
};
