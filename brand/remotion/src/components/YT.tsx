import { useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, clamp } from "../brand";
import { Sfx } from "./Ro";

// The YouTube v2 visual system (style DECISIONS 14b). One theme for every graphic, built from Exomind's own world: the brain, the
// coil, the magnetic pulse, the neural network and calm waves.
//   palette: white / near-white canvases and the brand's matte-white frosted glass as the base (client: "a bit more white"); navy
//            #1d2230 only for type and line on light surfaces; brand blue #37a9e8 for whatever is active; footage keeps its own light.
//   line:    one weight (3 px at 1080p, round caps and joins); icons are 48-unit line drawings drawn on with pathLength.
//   motion:  one curve (quint out), 0.5 s in, 0.3 s out; things respond to his words: a cursor glides and taps, tags type on inside
//            a growing highlight (Evident's labels), toggles flip, counters tick, progress fills, canvas layers drift at two depths.
//   type:    the bible (brand/fonts/SYSTEM.md, kit/tokens.css): headline NHG Display 600 / 1.033 / +0.0082em; label NHG Display 500
//            caps / 1.078 / +0.0102em; caption NHG Display 500 / 1.271 / -0.0158em; small text (< 30 px) NHG Text 400/500. Sizes on
//            the 16:9 frame from the bible's 1080-high canvas (headline 68 px, label 30 px), a hero size of 2x headline for the one
//            focal statement of a section; margin 9.1 % of width (175 px), headline top 13.8 % of height (149 px). No text shadows.
//   sound:   pop = something appears or is tapped, swish = a new section, card = glass, yes = a tick.
export const BG0 = "#f4f7fa", BG1 = "#ffffff", INK = "#1d2230", MUTE = "#6b7183", RULE = "#dfe4ea", BLUE = "#37a9e8", SKY = "#7cc8f2", LINE = 3;
export const TEXT = '"neue-haas-grotesk-text", Inter, Arial, sans-serif';
export const M = 175, TOP = 149, H1 = 68, HERO = 136, LAB = 30, SMALL = 26, RADIUS = 30;
export const head = (px = H1, color = INK): React.CSSProperties => ({ font: `600 ${px}px/1.033 ${FONT}`, letterSpacing: "0.0082em", color });
export const label = (px = LAB, color = INK): React.CSSProperties => ({ font: `500 ${px}px/1.078 ${FONT}`, letterSpacing: "0.0102em", textTransform: "uppercase", color });
export const small = (px = SMALL, w = 400, color = MUTE): React.CSSProperties => ({ font: `${w} ${px}px/1.3 ${TEXT}`, color });
// the brand's matte-white glass (Ro's card material, made for 16:9): frost, a hairline rim, a soft long shadow, no hard border
export const glass = (r = RADIUS): React.CSSProperties => ({
  position: "absolute", borderRadius: r, overflow: "hidden", color: INK,
  background: "linear-gradient(180deg, rgba(255,255,255,.80), rgba(255,255,255,.62))", backdropFilter: "blur(30px) saturate(1.2)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.9), inset 0 0 0 1px rgba(255,255,255,.55), 0 24px 60px rgba(29,34,48,.14)",
});
export const quint = (q: number) => 1 - (1 - clamp(q)) ** 5;
export const prog = (t: number, at: number, d = 0.5) => quint((t - at) / d);
export const useT = () => useCurrentFrame() / useVideoConfig().fps;
export const life = (t: number, at: number, out = 1e9, rise = 14) => {
  const i = prog(t, at), o = clamp((t - out) / 0.3);
  return { opacity: i * (1 - o), transform: `translateY(${(1 - i) * rise}px)` };
};
// two slow light blobs inside any glass (client: "movement behind the glass ... clean and not stagnant")
export const GlassLife: React.FC = () => {
  const t = useT();
  // measured on v2: the question card's empty corner held still for 1.1-2.5 s with blobs alone, so a broad tint also turns slowly (every pixel moves)
  const bx = 35 + 30 * Math.sin(t * 0.8), by = 35 + 25 * Math.cos(t * 0.69);
  return <div style={{ position: "absolute", inset: 0, background: `radial-gradient(55% 60% at ${bx}% ${by}%, rgba(55,169,232,.20), transparent 70%), radial-gradient(50% 55% at ${100 - bx}% ${100 - by}%, rgba(255,255,255,.5), transparent 70%), linear-gradient(${115 + 50 * Math.sin(t * 0.55)}deg, rgba(55,169,232,.10), rgba(255,255,255,0) 55%, rgba(55,169,232,.08))` }} />;
};

// ---------- icons ----------
export const ICON: Record<string, string> = {
  brain: "M24 9c-3-4-11-3-11 4-5 1-6 8-2 11-3 4 0 10 5 10 1 4 7 5 8 1 1 4 7 3 8-1 5 0 8-6 5-10 4-3 3-10-2-11 0-7-8-8-11-4z M24 9v29 M17 18c2 1 4 3 4 6 M31 18c-2 1-4 3-4 6",
  coil: "M7 25c0-9 8-15 17-15s17 6 17 15 M7 25h34 M13 25v3c0 2 2 3 4 3h14c2 0 4-1 4-3v-3",
  pulse: "M24 34a2 2 0 1 0 0-.1 M17 27a10 10 0 0 1 14 0 M12 22a17 17 0 0 1 24 0 M7 17a24 24 0 0 1 34 0",
  network: "M10 12l14 8 14-6 M24 20l-7 15 M24 20l11 13 M10 12a2.5 2.5 0 1 0 .1 0 M38 14a2.5 2.5 0 1 0 .1 0 M24 20a3 3 0 1 0 .1 0 M17 35a2.5 2.5 0 1 0 .1 0 M35 33a2.5 2.5 0 1 0 .1 0",
  wave: "M4 24c5-9 9-9 13 0s9 9 13 0 9-9 14 0",
  envelope: "M6 12h36v24H6z M6 13l18 13 18-13",
  phone: "M16 4h16a3 3 0 0 1 3 3v34a3 3 0 0 1-3 3H16a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z M21 39h6",
  chat: "M8 10h32v20H22l-8 7v-7H8z M15 18h18 M15 23h11",
  calendar: "M8 12h32v28H8z M8 20h32 M16 8v8 M32 8v8 M15 27h4 M22 27h4 M29 27h4 M15 33h4",
  target: "M24 6a18 18 0 1 1-.1 0 M24 15a9 9 0 1 1-.1 0 M24 23a1.5 1.5 0 1 1-.1 0",
  clipboard: "M14 8h20v34H14z M19 5h10v6H19z M18 20h12 M18 27h12 M18 34h8",
  check: "M12 25l8 8 16-17",
  question: "M18 18a6 6 0 1 1 9 5c-2 1-3 2-3 5 M24 34v1",
  skin: "M6 15c6-4 12 4 18 0s12-4 18 0 M6 25h36 M6 35h36 M15 15v20 M33 15v20",
  spark: "M24 6v8 M24 34v8 M6 24h8 M34 24h8 M11 11l6 6 M31 31l6 6 M37 11l-6 6 M17 31l-6 6",
};
export const Icon: React.FC<{ name: string; size?: number; draw?: number; color?: string; style?: React.CSSProperties }> = ({ name, size = 64, draw = 1, color = INK, style }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={{ overflow: "visible", flex: "none", ...style }}>
    {ICON[name].split(" M").map((d, i) => (
      <path key={i} d={(i ? "M" : "") + d} fill="none" stroke={color} strokeWidth={(LINE * 48) / size} strokeLinecap="round" strokeLinejoin="round"
        pathLength={1} strokeDasharray={`${clamp(draw * 1.15 - i * 0.05)} 1`} />
    ))}
  </svg>
);

// ---------- canvas: near-white, a faint blue neural field drifting at two depths (parallax), live paper grain ----------
const NODES = Array.from({ length: 46 }, (_, i) => {
  const r = (k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  return { x: r(1) * 1920, y: r(2) * 1080, z: 0.4 + r(3) * 0.6, p: r(4) * 6.28 };
});
const EDGES: [number, number][] = [];
NODES.forEach((a, i) => NODES.forEach((b, j) => { if (j > i && Math.hypot(a.x - b.x, a.y - b.y) < 250) EDGES.push([i, j]); }));
export const Canvas: React.FC<{ glow?: [number, number]; field?: number; px?: number }> = ({ glow = [0.4, 0.4], field = 1, px = 0 }) => {
  const t = useCurrentFrame() / 24;
  const pos = NODES.map((n) => ({ x: n.x + Math.sin(t * 0.13 + n.p) * 26 * n.z - px * n.z * 40, y: n.y + Math.cos(t * 0.11 + n.p) * 18 * n.z, z: n.z }));
  const gx = glow[0] * 100 + 6 * Math.sin(t * 0.17), gy = glow[1] * 100 + 5 * Math.cos(t * 0.13);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: `radial-gradient(70% 80% at ${gx}% ${gy}%, ${BG1} 0%, ${BG0} 75%)` }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 0.5 * field }}>
        {EDGES.map(([i, j], k) => { const a = pos[i], b = pos[j]; return <line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={SKY} strokeWidth={1} opacity={0.35 * Math.min(a.z, b.z)} />; })}
        {pos.map((p, k) => <circle key={k} cx={p.x} cy={p.y} r={1.6 + 2 * p.z} fill={SKY} opacity={0.35 + 0.3 * Math.sin(t * 0.8 + k)} />)}
      </svg>
      <Grain />
    </div>
  );
};
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.05 }) => {
  const f = useCurrentFrame();
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity, mixBlendMode: "multiply", pointerEvents: "none" }}>
      <filter id={`g${f % 6}`}><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={f % 6} /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width="100%" height="100%" filter={`url(#g${f % 6})`} />
    </svg>
  );
};

// ---------- tag: a label typed on inside a highlight that grows (Evident's label move): brand blue, white caps ----------
export const Tag: React.FC<{ text: string; at: number; size?: number; fill?: string; color?: string; out?: number; sfx?: boolean }> = ({ text, at, size = LAB, fill = BLUE, color = "#fff", out = 1e9, sfx = true }) => {
  const t = useT();
  const box = prog(t, at, 0.35), n = Math.round(text.length * clamp((t - at - 0.1) / 0.45)), o = 1 - clamp((t - out) / 0.3);
  const snd = sfx ? <Sfx at={at} name="pop" gain={0.45} /> : null;
  return (
    <>{snd}{t >= at && (
      <span style={{ position: "relative", display: "inline-block", opacity: o }}>
        <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${box * 100}%`, background: fill, borderRadius: 8 }} />
        <span style={{ position: "relative", display: "inline-block", padding: `${size * 0.26}px ${size * 0.42}px ${size * 0.22}px`, ...label(size, color), whiteSpace: "nowrap" }}>
          <span>{text.slice(0, n)}</span><span style={{ opacity: 0 }}>{text.slice(n)}</span>
        </span>
      </span>)}</>
  );
};

// ---------- kinetic headline: words rise in one after another; key words in brand blue ----------
export const Kinetic: React.FC<{ text: string; at: number; size?: number; key_?: string[]; step?: number; color?: string; out?: number }> = ({ text, at, size = H1, key_ = [], step = 0.09, color = INK, out = 1e9 }) => {
  const t = useT();
  const o = 1 - clamp((t - out) / 0.3);
  return (
    <div style={{ ...head(size, color), opacity: o }}>
      {text.split(" ").map((w, i) => {
        const q = prog(t, at + i * step, 0.45);
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: size * 0.14, marginRight: size * 0.26 }}>
            <span style={{ display: "inline-block", transform: `translateY(${(1 - q) * 105}%)`, color: key_.includes(w.replace(/[^\w]/g, "").toLowerCase()) ? BLUE : undefined }}>{w}</span>
          </span>
        );
      })}
    </div>
  );
};

// ---------- cursor: glides between waypoints and taps (a ring + pop); navy arrow with a white rim, reads on white and on footage ----------
export type Way = { at: number; x: number; y: number; tap?: boolean };
export const Cursor: React.FC<{ path: Way[]; show?: [number, number] }> = ({ path, show = [0, 1e9] }) => {
  const t = useT();
  const taps = path.filter((p) => p.tap);
  const sounds = taps.map((p, i) => <Sfx key={`s${i}`} at={p.at} name="pop" gain={0.35} />);
  const on = t >= show[0] && t <= show[1] && path.length > 0;
  let x = path[0]?.x ?? 0, y = path[0]?.y ?? 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    if (t >= a.at) { const q = quint((t - a.at) / Math.max(0.2, Math.min(0.7, b.at - a.at))); x = a.x + (b.x - a.x) * q; y = a.y + (b.y - a.y) * q; }
  }
  const press = taps.reduce((m, p) => Math.max(m, 1 - Math.abs(t - p.at) / 0.12), 0);
  const fade = Math.min(prog(t, show[0], 0.3), 1 - clamp((t - show[1] + 0.3) / 0.3));
  return (
    <>
      {sounds}
      {on && taps.map((p, i) => {
        const q = clamp((t - p.at) / 0.55);
        return q > 0 && q < 1 ? <div key={i} style={{ position: "absolute", left: p.x - 40, top: p.y - 40, width: 80, height: 80, borderRadius: 99, border: `3px solid ${BLUE}`, opacity: 1 - q, transform: `scale(${0.3 + q})` }} /> : null;
      })}
      {on && (
        <svg width={44} height={44} viewBox="0 0 24 24" style={{ position: "absolute", left: x - 6, top: y - 3, opacity: fade, transform: `scale(${1 - 0.14 * Math.max(0, press)})`, transformOrigin: "6px 3px" }}>
          <path d="M5 2.5l13.5 11.2-6.4.6 3.6 6.9-2.6 1.3-3.6-6.9-4.5 4.5z" fill={INK} stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
        </svg>
      )}
    </>
  );
};

// ---------- small live controls ----------
export const Toggle: React.FC<{ on: number; at?: number; w?: number }> = ({ on, at = 0, w = 84 }) => {
  const t = useT();
  const q = prog(t, on, 0.3), h = w * 0.56;
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: h, background: q > 0.5 ? BLUE : RULE, opacity: prog(t, at, 0.4), flex: "none" }}>
      <div style={{ position: "absolute", top: 4, left: 4 + q * (w - h), width: h - 8, height: h - 8, borderRadius: h, background: "#fff" }} />
    </div>
  );
};
export const Counter: React.FC<{ from: number; to: number; at: number; d?: number; size?: number; color?: string }> = ({ from, to, at, d = 1.2, size = H1, color = INK }) => {
  const t = useT();
  const v = Math.round(from + (to - from) * quint((t - at) / d));
  return <span style={{ ...head(size, color), fontVariantNumeric: "tabular-nums" }}>{v}</span>;
};
export const Bar: React.FC<{ at: number; d?: number; w?: number }> = ({ at, d = 1.4, w = 420 }) => {
  const t = useT();
  return (
    <div style={{ width: w, height: 6, borderRadius: 6, background: RULE, overflow: "hidden" }}>
      <div style={{ width: `${quint((t - at) / d) * 100}%`, height: "100%", background: BLUE, borderRadius: 6 }} />
    </div>
  );
};
// a hairline leader from a point on the footage to a tag (dot pulses, line draws, tag types on); white line on footage
export const Callout: React.FC<{ x: number; y: number; lx: number; ly: number; text: string; at: number; out?: number; color?: string }> = ({ x, y, lx, ly, text, at, out = 1e9, color = "#fff" }) => {
  const t = useT();
  const q = prog(t, at, 0.45), o = 1 - clamp((t - out) / 0.3), pulse = 1 + 0.25 * Math.sin(t * 5);
  const left = lx < x;
  return (
    <>
      <Sfx at={at + 0.3} name="pop" gain={0.45} />
      {t >= at && (
        <div style={{ position: "absolute", inset: 0, opacity: o }}>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            <circle cx={x} cy={y} r={10 * pulse} fill="none" stroke={color} strokeWidth={2} opacity={0.7} />
            <circle cx={x} cy={y} r={5} fill={color} />
            <path d={`M${x} ${y} L${lx} ${ly}`} stroke={color} strokeWidth={LINE} strokeLinecap="round" pathLength={1} strokeDasharray={`${q} 1`} />
          </svg>
          <div style={{ position: "absolute", top: ly - 22, ...(left ? { right: 1920 - lx + 8 } : { left: lx + 8 }) }}><Tag text={text} at={at + 0.3} sfx={false} /></div>
        </div>
      )}
    </>
  );
};
