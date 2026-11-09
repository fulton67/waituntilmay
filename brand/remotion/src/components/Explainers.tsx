import { Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { SAFE_T, clamp, easeIn, easeOutBack } from "../brand";
import { Chip, glass } from "../devices/Markup";

// Drawn explainers for beats that have no honest photo (style DECISIONS 10; client: "whenever he's describing something that we
// can find, add those visualizations ... oil glands ... inflamed ... the lasers or the vascular ... the depths of skin").
// All in the markup language: a glass panel in the upper half, white hairlines, small glass chips, an X / check, a sound per pop.
//   PillCard     oral antibiotics: glass capsules pop in, shake "no", an X, then swipe out to the left.
//   MicrobeCard  gut microbiome: a hairline gut loop with wobbling microbes; half of them fade (what antibiotics do to it).
//   SkinDiagram  a hairline skin cross-section (epidermis / dermis / fat, a follicle with its oil gland, two vessel plexuses) that
//                steps through phases at given times: gland ringed, gland inflamed, vessels lit, Excel V beams onto the vessels
//                (superficial and deep), Laser Genesis as a broad warm band in the upper dermis, a depth ruler.
// Medical shape of the diagram: Excel V (532 + 1064 nm) is drawn as focused beams that each stop on a vessel; Laser Genesis
// (1064 nm, microsecond) as diffuse warming of the upper/mid dermis. Not to scale, labelled "illustration".

const quint = (q: number) => 1 - (1 - q) ** 5;
const HAIR = "rgba(255,255,255,.95)";
const ROSE = "rgba(255,112,136,1)";
const BLUE = "#7cc6f0";

const Sfx: React.FC<{ at: number; name: string; gain?: number }> = ({ at, name, gain = 1 }) => {
  const { fps } = useVideoConfig();
  if (at < 0) return null;
  return (
    <Sequence from={Math.round(at * fps)} durationInFrames={fps} layout="none">
      <Audio src={staticFile(`sfx/${name}.wav`)} volume={0.32 * gain} />
    </Sequence>
  );
};

// shared panel: pops in (0.36 s, small overshoot), fades out over the last 0.3 s unless `swipe` (then the caller moves it)
const usePanel = (dur: number) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const q = clamp(t / 0.36), out = clamp((t - (dur - 0.3)) / 0.3);
  return { t, s: (0.9 + 0.1 * easeOutBack(q, 1.3)) * (1 - 0.04 * out), op: clamp(q * 2.5) * (1 - out), out };
};

const Panel: React.FC<{ w: number; h: number; s: number; op: number; dx?: number; children: React.ReactNode }> = ({ w, h, s, op, dx = 0, children }) => (
  <div style={{ ...glass(30), left: (1080 - w) / 2 + dx, top: SAFE_T + 10, width: w, height: h, transform: `scale(${s})`, transformOrigin: "50% 40%", opacity: op,
    background: "linear-gradient(160deg, rgba(255,255,255,.22), rgba(255,255,255,.06) 58%, rgba(255,255,255,.12)), rgba(32,37,50,.52)" }}>
    {children}
  </div>
);

const XMark: React.FC<{ x: number; y: number; t: number; at: number; d?: number }> = ({ x, y, t, at, d = 64 }) => {
  if (t < at) return null;
  const q = clamp((t - at) / 0.34), s = 0.6 + 0.4 * easeOutBack(q, 1.3), k = d * 0.16, ic = clamp((t - at - 0.1) / 0.25);
  return (
    <div style={{ ...glass(999, "rgba(255, 92, 118, .30)"), left: x - d / 2, top: y - d / 2, width: d, height: d, transform: `scale(${s})`, opacity: clamp(q * 2.5) }}>
      <svg width={d} height={d} viewBox={`0 0 ${d} ${d}`} style={{ position: "absolute", inset: 0 }}>
        <path d={`M ${d / 2 - k} ${d / 2 - k} L ${d / 2 + k} ${d / 2 + k} M ${d / 2 + k} ${d / 2 - k} L ${d / 2 - k} ${d / 2 + k}`} stroke="#fff" strokeWidth={3.4}
          strokeLinecap="round" pathLength={2} strokeDasharray={`${2 * ic} 2`} />
      </svg>
    </div>
  );
};

const popChip = (t: number, at: number) => { const q = clamp((t - at) / 0.32); return { s: 0.72 + 0.28 * easeOutBack(q, 1.2), o: clamp(q * 2.2) }; };

// ---------- pills ----------
const Capsule: React.FC<{ id: string; w?: number; h?: number }> = ({ id, w = 170, h = 64 }) => {
  const r = h / 2;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible", filter: "drop-shadow(0 6px 10px rgba(0,0,0,.25))" }}>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".95" /><stop offset=".45" stopColor="#eef6fb" stopOpacity=".85" /><stop offset="1" stopColor="#c9dbe6" stopOpacity=".9" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d6efff" stopOpacity=".95" /><stop offset=".45" stopColor="#5ab8ec" stopOpacity=".8" /><stop offset="1" stopColor="#2c8fca" stopOpacity=".9" />
        </linearGradient>
        <clipPath id={`${id}c`}><rect x={0} y={0} width={w} height={h} rx={r} /></clipPath>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        <rect x={0} y={0} width={w / 2} height={h} fill={`url(#${id}a)`} />
        <rect x={w / 2} y={0} width={w / 2} height={h} fill={`url(#${id}b)`} />
        <rect x={r * 0.6} y={h * 0.14} width={w - r * 1.2} height={h * 0.16} rx={h * 0.08} fill="#fff" opacity={0.75} />
      </g>
      <rect x={0.75} y={0.75} width={w - 1.5} height={h - 1.5} rx={r} fill="none" stroke="rgba(255,255,255,.9)" strokeWidth={1.5} />
      <line x1={w / 2} y1={2} x2={w / 2} y2={h - 2} stroke="rgba(255,255,255,.7)" strokeWidth={1.5} />
    </svg>
  );
};

export const PillCard: React.FC<{ dur: number; label?: string }> = ({ dur, label = "Oral antibiotics" }) => {
  const { t, s, op } = usePanel(dur + 10); // fade handled by the swipe
  const W = 640, H = 330;
  const sw = easeIn(clamp((t - (dur - 0.55)) / 0.5)); // swipe out
  const shake = t > 0.55 && t < 1.75 ? Math.sin((t - 0.55) * 2 * Math.PI * 5.5) * (1 - (t - 0.55) / 1.2) : 0;
  const pills = [{ x: 70, y: 150, r: -18 }, { x: 240, y: 110, r: 12 }, { x: 405, y: 165, r: -6 }];
  return (
    <>
      <Panel w={W} h={H} s={s} op={op * (1 - sw)} dx={-sw * 760}>
        {pills.map((p, i) => {
          const q = clamp((t - 0.15 - i * 0.1) / 0.34), ps = 0.4 + 0.6 * easeOutBack(q, 1.6);
          const lag = easeIn(clamp((t - (dur - 0.6) - i * 0.04) / 0.45));
          return (
            <div key={i} style={{ position: "absolute", left: p.x, top: p.y, opacity: clamp(q * 3),
              transform: `translateX(${shake * 10 - lag * 260}px) rotate(${p.r + shake * 9}deg) scale(${ps})`, filter: lag > 0.05 ? `blur(${lag * 5}px)` : undefined }}>
              <Capsule id={`cap${i}`} />
            </div>
          );
        })}
        {t >= 0.3 && (() => { const c = popChip(t, 0.3); return <Chip at={{ x: 18, y: 34 }} text={label} s={c.s} o={c.o} />; })()}
        <XMark x={W - 52} y={52} t={t} at={1.5} />
        <div style={{ position: "absolute", right: 18, bottom: 12, color: "rgba(255,255,255,.6)", font: '500 14px/1 "neue-haas-grotesk-display", sans-serif', letterSpacing: "0.1em", textTransform: "uppercase" }}>illustration</div>
      </Panel>
      {[0, 1, 2].map((i) => <Sfx key={i} at={0.15 + i * 0.1} name="pop" gain={0.6} />)}
      <Sfx at={0.55} name="swish" gain={0.5} />
      <Sfx at={1.5} name="no" />
      <Sfx at={dur - 0.55} name="swish" gain={0.9} />
    </>
  );
};

// ---------- microbiome ----------
export const MicrobeCard: React.FC<{ dur: number; label?: string }> = ({ dur, label = "Gut microbiome" }) => {
  const { t, s, op } = usePanel(dur);
  const W = 640, H = 360;
  const draw = quint(clamp((t - 0.2) / 0.7));
  const hit = clamp((t - 1.2) / 0.6);
  // a gut loop and microbes placed along it (deterministic)
  const gut = "M 70 250 C 70 120, 220 110, 230 200 S 360 300, 380 190 S 520 90, 560 200";
  const bugs = Array.from({ length: 16 }, (_, i) => {
    const u = i / 15, x = 80 + u * 480, y = 200 + Math.sin(u * 9 + 1) * 55 + ((i * 37) % 30) - 15;
    return { x, y, rod: i % 3 !== 0, rot: (i * 47) % 180, die: i % 2 === 0, ph: i * 0.7 };
  });
  return (
    <>
      <Panel w={W} h={H} s={s} op={op}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
          <path d={gut} stroke="rgba(255,255,255,.35)" strokeWidth={70} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={`${draw} 1`} />
          <path d={gut} stroke={HAIR} strokeWidth={2} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={`${draw} 1`} />
          {bugs.map((b, i) => {
            const q = clamp((t - 0.45 - i * 0.03) / 0.3);
            const gone = b.die ? hit : 0;
            const wob = Math.sin(t * 6 + b.ph) * 6;
            const sc = (0.4 + 0.6 * easeOutBack(q, 1.6)) * (1 - 0.6 * gone);
            return (
              <g key={i} transform={`translate(${b.x} ${b.y}) rotate(${b.rot + wob}) scale(${sc})`} opacity={clamp(q * 3) * (1 - 0.85 * gone)}>
                {b.rod ? <rect x={-14} y={-6} width={28} height={12} rx={6} fill="rgba(124,198,240,.45)" stroke={HAIR} strokeWidth={1.6} />
                  : <circle r={8} fill="rgba(124,198,240,.45)" stroke={HAIR} strokeWidth={1.6} />}
              </g>
            );
          })}
        </svg>
        {t >= 0.3 && (() => { const c = popChip(t, 0.3); return <Chip at={{ x: 18, y: 34 }} text={label} s={c.s} o={c.o} />; })()}
        <XMark x={W - 52} y={52} t={t} at={1.3} />
      </Panel>
      <Sfx at={0} name="card" />
      <Sfx at={1.3} name="no" />
    </>
  );
};

// ---------- skin cross-section ----------
export type DiagramPhases = { gland?: number; inflamed?: number; vessels?: number; excelv?: number; genesis?: number; depth?: number };

export const SkinDiagram: React.FC<{ dur: number; at: DiagramPhases }> = ({ dur, at }) => {
  const { t, s, op } = usePanel(dur);
  const W = 700, H = 560;
  const on = (k: keyof DiagramPhases) => (at[k] == null ? 0 : clamp((t - at[k]!) / 0.4));
  const draw = quint(clamp((t - 0.25) / 0.9));
  const gland = on("gland"), infl = on("inflamed"), ves = on("vessels"), xv = on("excelv"), lg = on("genesis"), dep = on("depth");
  const pulse = 0.85 + 0.15 * Math.sin(t * 5);
  // layer lines
  const surf = "M 0 120 C 80 110, 140 132, 220 120 S 380 108, 460 122 S 620 132, 700 118";
  const dej = "M 0 175 C 40 150, 70 200, 110 175 S 180 150, 220 178 S 290 200, 330 172 S 400 150, 440 178 S 520 200, 560 172 S 640 150, 700 176";
  const fat = "M 0 440 C 120 432, 240 452, 360 440 S 560 430, 700 444";
  const sup = "M 20 225 C 120 205, 200 250, 300 222 S 480 205, 560 230 S 660 240, 690 222";
  const deep = "M 20 400 C 140 385, 260 420, 380 398 S 560 385, 690 402";
  const loops = [80, 190, 300, 420, 540, 640].map((x) => `M ${x - 14} 226 C ${x - 14} 180, ${x + 14} 180, ${x + 14} 226`);
  const vesselStroke = ves > 0 ? `rgba(255,${Math.round(200 - 90 * ves)},${Math.round(210 - 70 * ves)},1)` : "rgba(255,190,200,.75)";
  const vesselW = 2 + 2.2 * ves;
  // beams: Excel V onto a superficial and a deep vessel (each stops on its vessel, a spark where it lands)
  const beams = [{ x: 470, y1: 222, d: 0 }, { x: 560, y1: 398, d: 0.25 }];
  const chipsLeft = 18;
  return (
    <>
      <Panel w={W} h={H} s={s} op={op}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <radialGradient id="glandHot"><stop offset="0" stopColor={ROSE} stopOpacity=".9" /><stop offset="1" stopColor={ROSE} stopOpacity="0" /></radialGradient>
            <linearGradient id="genesis" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffd9a8" stopOpacity="0" /><stop offset=".35" stopColor="#ffd9a8" stopOpacity=".75" /><stop offset=".7" stopColor="#ffb98a" stopOpacity=".55" /><stop offset="1" stopColor="#ffb98a" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={BLUE} stopOpacity=".1" /><stop offset="1" stopColor="#ffffff" stopOpacity="1" /></linearGradient>
          </defs>
          {/* layers */}
          <rect x={0} y={120} width={W} height={H - 120} fill="rgba(255,255,255,.04)" />
          <path d={surf} stroke={HAIR} strokeWidth={2.4} fill="none" pathLength={1} strokeDasharray={`${draw} 1`} />
          <path d={dej} stroke="rgba(255,255,255,.75)" strokeWidth={1.6} fill="none" pathLength={1} strokeDasharray={`${draw} 1`} />
          <path d={fat} stroke="rgba(255,255,255,.6)" strokeWidth={1.6} fill="none" pathLength={1} strokeDasharray={`${draw} 1`} />
          {Array.from({ length: 9 }, (_, i) => <ellipse key={i} cx={40 + i * 80} cy={490 + (i % 2) * 22} rx={34} ry={22} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth={1.4} opacity={draw} />)}
          {/* Laser Genesis: broad warm band across the upper dermis */}
          {lg > 0 && <rect x={0} y={150} width={W} height={150} fill="url(#genesis)" opacity={lg * pulse} />}
          {/* follicle + hair + oil gland */}
          <path d="M 250 120 L 250 380 Q 275 400 300 380 L 300 120" stroke={HAIR} strokeWidth={1.8} fill="rgba(255,255,255,.05)" opacity={draw} />
          <line x1={275} y1={60} x2={275} y2={385} stroke="rgba(255,255,255,.85)" strokeWidth={2.4} opacity={draw} />
          {infl > 0 && <circle cx={335} cy={262} r={78} fill="url(#glandHot)" opacity={infl * pulse} />}
          <path d="M 300 230 C 330 205, 372 215, 372 245 C 392 255, 388 292, 360 296 C 345 316, 308 306, 300 288" stroke={infl > 0 ? `rgba(255,${Math.round(255 - 140 * infl)},${Math.round(255 - 120 * infl)},1)` : HAIR}
            strokeWidth={1.8 + infl} fill={infl > 0 ? `rgba(255,112,136,${0.35 * infl})` : "rgba(255,235,170,.18)"} opacity={draw} />
          {/* vessels */}
          <path d={sup} stroke={vesselStroke} strokeWidth={vesselW} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={`${draw} 1`} />
          <path d={deep} stroke={vesselStroke} strokeWidth={vesselW + 1} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={`${draw} 1`} />
          {loops.map((d, i) => <path key={i} d={d} stroke={vesselStroke} strokeWidth={vesselW * 0.8} fill="none" strokeLinecap="round" opacity={draw * (0.6 + 0.4 * ves)} />)}
          {/* ring round the gland */}
          {gland > 0 && (() => {
            const n = Math.ceil(64 * quint(gland)), pts = Array.from({ length: n + 1 }, (_, i) => { const a = ((200 + (360 * quint(gland) * i) / Math.max(1, n)) * Math.PI) / 180; return `${338 + 66 * Math.cos(a)},${262 + 56 * Math.sin(a)}`; });
            return <polyline points={pts.join(" ")} stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 5px rgba(255,255,255,.5))" }} />;
          })()}
          {/* Excel V beams */}
          {xv > 0 && beams.map((b, i) => {
            const q = quint(clamp((t - at.excelv! - b.d) / 0.35));
            const yEnd = 40 + (b.y1 - 40) * q, spark = clamp((t - at.excelv! - b.d - 0.3) / 0.3);
            return (
              <g key={i}>
                <rect x={b.x - 5} y={40} width={10} height={yEnd - 40} rx={5} fill="url(#beam)" opacity={0.9} style={{ filter: "drop-shadow(0 0 8px rgba(124,198,240,.9))" }} />
                {spark > 0 && <circle cx={b.x} cy={b.y1} r={8 + 16 * spark} fill="none" stroke="#fff" strokeWidth={2} opacity={1 - spark} />}
                {spark > 0 && <circle cx={b.x} cy={b.y1} r={6} fill="#fff" opacity={0.9 * pulse} />}
              </g>
            );
          })}
          {/* depth ruler */}
          {dep > 0 && (
            <g opacity={dep}>
              <line x1={W - 34} y1={120} x2={W - 34} y2={120 + 320 * quint(dep)} stroke="#fff" strokeWidth={2} />
              {[0, 1, 2, 3, 4].map((i) => 120 + i * 80 <= 120 + 320 * quint(dep) && <line key={i} x1={W - 46} y1={120 + i * 80} x2={W - 22} y2={120 + i * 80} stroke="#fff" strokeWidth={2} />)}
            </g>
          )}
        </svg>
        {/* layer chips */}
        {(() => { const c = popChip(t, 0.6); return <Chip at={{ x: chipsLeft, y: 148 }} text="Epidermis" s={c.s * 0.85} o={c.o * 0.9} />; })()}
        {(() => { const c = popChip(t, 0.75); return <Chip at={{ x: chipsLeft, y: 330 }} text="Dermis" s={c.s * 0.85} o={c.o * 0.9} />; })()}
        {at.gland != null && t >= at.gland + 0.45 && (() => { const c = popChip(t, at.gland! + 0.45); return <Chip at={{ x: 412, y: 215 }} text={infl > 0.5 ? "Inflamed" : "Oil gland"} s={c.s} o={c.o} />; })()}
        {at.vessels != null && t >= at.vessels + 0.2 && (at.excelv == null || t < at.excelv) && (() => { const c = popChip(t, at.vessels! + 0.2); return <Chip at={{ x: 330, y: 365 }} text="Blood vessels" s={c.s} o={c.o} />; })()}
        {at.excelv != null && t >= at.excelv + 0.3 && (() => { const c = popChip(t, at.excelv! + 0.3); return <Chip at={{ x: 470, y: 40 }} side="center" text="Excel V" s={c.s} o={c.o} />; })()}
        {at.genesis != null && t >= at.genesis + 0.2 && (() => { const c = popChip(t, at.genesis! + 0.2); return <Chip at={{ x: 160, y: 40 }} side="center" text="Laser Genesis" s={c.s} o={c.o} />; })()}
        {at.depth != null && t >= at.depth + 0.4 && (() => { const c = popChip(t, at.depth! + 0.4); return <Chip at={{ x: W - 56, y: 470 }} side="left" text="Depth" s={c.s} o={c.o} />; })()}
        <div style={{ position: "absolute", right: 18, bottom: 12, color: "rgba(255,255,255,.6)", font: '500 14px/1 "neue-haas-grotesk-display", sans-serif', letterSpacing: "0.1em", textTransform: "uppercase" }}>illustration</div>
      </Panel>
      <Sfx at={0} name="card" />
      <Sfx at={at.gland ?? -1} name="swish" gain={0.8} />
      <Sfx at={at.gland != null ? at.gland + 0.45 : -1} name="pop" gain={0.7} />
      <Sfx at={at.inflamed ?? -1} name="pop" gain={0.7} />
      <Sfx at={at.vessels ?? -1} name="pop" gain={0.7} />
      <Sfx at={at.excelv ?? -1} name="swish" gain={0.9} />
      <Sfx at={at.excelv != null ? at.excelv + 0.3 : -1} name="yes" gain={0.8} />
      <Sfx at={at.genesis ?? -1} name="pop" gain={0.8} />
      <Sfx at={at.depth ?? -1} name="swish" gain={0.6} />
    </>
  );
};
