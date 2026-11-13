import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CHEST_T, FONT, SAFE_T, clamp } from "../brand";

// Calm explainer cards (style DECISIONS 11 and 12). Client on v2: the glass words, pill capsules and the depth diagram "look really
// cheap"; "if we look at Ro ... that's kind of what I imagine". v4 (DECISIONS 12): "something happen every 5 seconds or so ...
// representations of every subject he's talking about (even if he repeats himself) ... the same thing shown in different ways",
// and "not completely covering his face ... it can be below him ... in different places".
//   - one card material: our glass, calmed with the Ro set: translucent frost, hairline rim, navy type, soft long shadow;
//     fade + 18 px rise in 0.45 s, out 0.3 s.
//   - placement zones from the face track (brand.ts): `top` band over his hair (never his eyes), `chest` band below his chin and
//     above the captions, `*Left` / `*Right` variants, and `full` (an Evident-style cutaway over the blurred footage).
//   - real things where they exist (capsule photo, the practice's own Excel V / Laser Genesis footage), Ro's progress segments,
//     checklists and calendars, simple chains and comparisons where they don't.
export const NAVY = "#1d2230", MUTED = "#6b7183", RULE = "#e2e5eb", BLUE = "#2f9fe0";
const quint = (q: number) => 1 - (1 - q) ** 5;

export type Pos = "top" | "topLeft" | "topRight" | "chest" | "chestLeft" | "chestRight";
// "xy:<left>,<top>" places a card at measured coordinates (Exomind: the free column between two seated faces)
export const place = (pos: Pos | string = "top", w: number): { left: number; top: number } => {
  if (pos.startsWith("xy:")) { const [left, top] = pos.slice(3).split(",").map(Number); return { left, top }; }
  return {
    top: pos.startsWith("chest") ? CHEST_T : SAFE_T + 10,
    left: pos.endsWith("Left") ? 56 : pos.endsWith("Right") ? 1080 - 56 - w : (1080 - w) / 2,
  };
};

// "movement behind the glass ... clean and not stagnant" (client, style DECISIONS 14): behind his static back wall a card would sit
// over a frozen patch, so every card carries two very soft light blobs (brand blue, white) that drift slowly inside the frost. The
// clock is the composition time, set once per frame by the composition (setGlassClock) before its cards render.
let GLASS_T = 0;
export const setGlassClock = (t: number) => { GLASS_T = t; };
const glassLife = () => {
  const t = GLASS_T;
  const bx = 22 + 18 * Math.sin(t * 0.33), by = 18 + 14 * Math.cos(t * 0.27), wx = 78 - 16 * Math.sin(t * 0.21 + 1.3), wy = 82 - 12 * Math.cos(t * 0.29 + 0.7);
  return `radial-gradient(60% 70% at ${bx.toFixed(2)}% ${by.toFixed(2)}%, rgba(55,169,232,.10), rgba(55,169,232,0) 70%), radial-gradient(55% 65% at ${wx.toFixed(2)}% ${wy.toFixed(2)}%, rgba(255,255,255,.22), rgba(255,255,255,0) 70%), `;
};
export const card = (radius = 28): React.CSSProperties => ({
  position: "absolute", overflow: "hidden", borderRadius: radius, color: NAVY, fontFamily: FONT,
  // the signature glass, made calm (DECISIONS 12: "we want the glass features ... that's our signature ... something in between"):
  // translucent frost you can see the room through, a hairline light rim and top highlight; no tint, glint or gloss
  background: glassLife() + "linear-gradient(165deg, rgba(255,255,255,.86) 0%, rgba(255,255,255,.72) 55%, rgba(255,255,255,.78) 100%)",
  backdropFilter: "blur(26px) saturate(1.5)", border: "1px solid rgba(255,255,255,.75)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.95), inset 0 -1px 0 rgba(255,255,255,.35), 0 22px 60px rgba(8,12,22,.24), 0 2px 8px rgba(8,12,22,.10)",
});

// opacity / rise for something that enters at `at` and leaves at `out` (seconds, local)
export const enter = (t: number, at: number, out = 1e9) => {
  const i = quint(clamp((t - at) / 0.45)), o = clamp((t - out) / 0.3);
  return { opacity: i * (1 - o), transform: `translateY(${(1 - i) * 18 - o * 10}px)` };
};

export const Sfx: React.FC<{ at: number; name: string; gain?: number }> = ({ at, name, gain = 1 }) => {
  const { fps } = useVideoConfig();
  if (at < 0) return null;
  return (
    <Sequence from={Math.round(at * fps)} durationInFrames={fps} layout="none">
      <Audio src={staticFile(`sfx/${name}.wav`)} volume={0.32 * gain} />
    </Sequence>
  );
};

const useT = () => useCurrentFrame() / useVideoConfig().fps;

const Caps: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ font: `500 19px/1 ${FONT}`, letterSpacing: "0.13em", textTransform: "uppercase", color: MUTED, ...style }}>{children}</div>
);

const Check: React.FC<{ q: number; d?: number }> = ({ q, d = 34 }) => (
  <svg width={d} height={d} viewBox="0 0 34 34" style={{ flex: "none" }}>
    <circle cx={17} cy={17} r={16} fill={BLUE} opacity={q} />
    <path d="M10 17.5 l4.6 4.6 L24 12.6" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${q} 1`} />
  </svg>
);

const Pill: React.FC = () => (
  <svg width={26} height={26} viewBox="0 0 26 26"><g transform="rotate(-40 13 13)"><rect x={3} y={8.5} width={20} height={9} rx={4.5} fill={BLUE} /><rect x={13} y={8.5} width={10} height={9} rx={0} fill="#9fd3f3" /><rect x={3} y={8.5} width={20} height={9} rx={4.5} fill="none" stroke={BLUE} strokeWidth={1.5} /></g></svg>
);

// ---------- oral antibiotics: the capsules + a 4-course bar ----------
export const RxCard: React.FC<{ dur: number; label?: string; img?: string; credit?: string; courses?: number; pos?: Pos }> = ({
  dur, label = "Oral antibiotics", img = "rosacea-laser/images/doxy.jpg", credit = "Photo: Shorelander, CC BY 2.5 (cropped)", courses = 4, pos = "chest",
}) => {
  const t = useT();
  const W = 880, seg0 = 0.5, step = 0.38;
  const filled = (i: number) => quint(clamp((t - seg0 - i * step) / 0.3));
  const n = Array.from({ length: courses }, (_, i) => i).filter((i) => t >= seg0 + i * step + 0.15).length;
  return (
    <>
      <div style={{ ...card(), ...place(pos, W), width: W, display: "flex", alignItems: "stretch", ...enter(t, 0, dur - 0.3) }}>
        <div style={{ margin: 12, width: 290, height: 290, borderRadius: 18, overflow: "hidden", background: "#fff", flex: "none" }}>
          <Img src={staticFile(img)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 45%" }} />
        </div>
        <div style={{ padding: "34px 34px 20px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
          <Caps>Prescription · by mouth</Caps>
          <div style={{ font: `600 52px/1.05 ${FONT}`, letterSpacing: "-0.01em", marginTop: 12 }}>{label}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 26 }}>
            {Array.from({ length: courses }, (_, i) => (
              <div key={i} style={{ flex: 1, height: 7, borderRadius: 4, background: RULE, overflow: "hidden" }}>
                <div style={{ width: `${filled(i) * 100}%`, height: "100%", background: BLUE, borderRadius: 4 }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, font: `500 26px/1.2 ${FONT}`, color: MUTED }}>
            <span>Repeated courses</span><span style={{ color: NAVY, fontVariantNumeric: "tabular-nums" }}>{n > 0 ? `Course ${n}` : ""}</span>
          </div>
          <div style={{ marginTop: "auto", font: `500 15px/1 ${FONT}`, color: "#9aa0ae" }}>{credit}</div>
        </div>
      </div>
      <Sfx at={0} name="card" />
      <Sfx at={seg0 + (courses - 1) * step} name="pop" gain={0.8} />
    </>
  );
};

// ---------- checklist: rows that tick (yes), or get struck through (strikeAt) ----------
const Tube: React.FC = () => (
  <svg width={44} height={44} viewBox="0 0 44 44" fill="none" stroke={NAVY} strokeWidth={2} strokeLinejoin="round">
    <path d="M12 8 h20 l-2 24 h-16 z" /><path d="M17 32 v4 h10 v-4" /><path d="M15 14 h14" />
  </svg>
);
type Row = { text: string; at: number; icon?: "doxy" | "tube"; tick?: boolean };
export const Checklist: React.FC<{ dur: number; title: string; rows: Row[]; strikeAt?: number; pos?: Pos; w?: number }> = ({ dur, title, rows, strikeAt, pos = "top", w = 640 }) => {
  const t = useT();
  return (
    <>
      <div style={{ ...card(), ...place(pos, w), width: w, padding: "26px 30px 12px", ...enter(t, 0, dur - 0.3) }}>
        <Caps>{title}</Caps>
        {rows.map((r, i) => {
          const s = strikeAt != null ? quint(clamp((t - strikeAt - i * 0.3) / 0.35)) : 0;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, padding: r.icon ? "14px 0" : "16px 0", borderTop: i ? `1px solid ${RULE}` : "none", marginTop: i ? 0 : 10, ...enter(t, r.at) }}>
              {r.icon && (
                <div style={{ width: 60, height: 60, borderRadius: 16, overflow: "hidden", background: "rgba(255,255,255,.55)", display: "grid", placeItems: "center", flex: "none" }}>
                  {r.icon === "doxy" ? <Img src={staticFile("rosacea-laser/images/doxy.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Tube />}
                </div>
              )}
              {r.tick && <Check q={quint(clamp((t - r.at - 0.15) / 0.35))} />}
              <div style={{ position: "relative", font: `600 38px/1.1 ${FONT}`, letterSpacing: "-0.01em", color: s > 0.5 ? MUTED : NAVY }}>
                {r.text}
                {strikeAt != null && <div style={{ position: "absolute", left: -4, top: "54%", height: 2.5, borderRadius: 2, background: NAVY, width: `calc((100% + 8px) * ${s})` }} />}
              </div>
            </div>
          );
        })}
      </div>
      <Sfx at={0} name="card" />
      {rows.slice(1).map((r, i) => <Sfx key={i} at={r.at} name="pop" gain={0.7} />)}
      {strikeAt != null && <Sfx at={strikeAt} name="no" gain={0.8} />}
    </>
  );
};

export const RoutineCard: React.FC<{ dur: number; pos?: Pos }> = ({ dur, pos = "top" }) => (
  <Checklist dur={dur} pos={pos} title="Instead of depending on" strikeAt={2.6}
    rows={[{ text: "Repeated antibiotics", at: 0.3, icon: "doxy" }, { text: "Daily topical creams", at: 2.05, icon: "tube" }]} />
);

// ---------- a stack of prescription labels ("just another prescription") ----------
export const RxStack: React.FC<{ dur: number; items: { text: string; at: number }[]; title?: string; pos?: Pos }> = ({ dur, items, title = "Another prescription", pos = "chest" }) => {
  const t = useT();
  const W = 600, p = place(pos, W);
  return (
    <>
      <div style={{ position: "absolute", left: p.left, top: p.top, width: W, ...enter(t, 0, dur - 0.3) }}>
        {items.map((it, i) => (
          <div key={i} style={{ ...card(22), position: "absolute", left: i * 26, top: i * 104, width: W - 52, height: 92, display: "flex", alignItems: "center", gap: 18, padding: "0 26px", boxSizing: "border-box", ...enter(t, it.at) }}>
            <div style={{ font: `600 30px/1 ${FONT}`, color: BLUE, width: 44 }}>Rx</div>
            <div style={{ font: `600 34px/1.1 ${FONT}`, letterSpacing: "-0.01em", flex: 1 }}>{it.text}</div>
            <div style={{ font: `500 20px/1 ${FONT}`, color: MUTED }}>#{String(i + 1).padStart(2, "0")}</div>
          </div>
        ))}
        <Caps style={{ position: "absolute", left: items.length * 26, top: items.length * 104 + 6, color: "#fff", textShadow: "0 1px 6px rgba(0,0,0,.5)", ...enter(t, items[items.length - 1].at + 0.3) }}>{title}</Caps>
      </div>
      <Sfx at={0} name="card" />
      {items.slice(1).map((it, i) => <Sfx key={i} at={it.at} name="pop" gain={0.7} />)}
    </>
  );
};

// ---------- chronic: flares coming and going across a year ----------
export const Chronic: React.FC<{ dur: number; title?: string; note?: string; pos?: Pos }> = ({ dur, title = "A chronic condition", note = "Flares come and go", pos = "top" }) => {
  const t = useT();
  const W = 780, GW = W - 60, GH = 120;
  const draw = quint(clamp((t - 0.3) / 1.8));
  const pts = Array.from({ length: 121 }, (_, i) => {
    const x = i / 120, y = 0.18 + 0.62 * Math.max(0, Math.sin(x * Math.PI * 7 - 0.6)) ** 3 * (0.75 + 0.25 * Math.sin(x * 13));
    return `${(x * GW).toFixed(1)},${(GH - y * GH).toFixed(1)}`;
  }).join(" ");
  return (
    <>
      <div style={{ ...card(), ...place(pos, W), width: W, padding: "24px 30px 18px", boxSizing: "border-box", ...enter(t, 0, dur - 0.3) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ font: `600 40px/1.1 ${FONT}`, letterSpacing: "-0.01em" }}>{title}</div>
          <Caps style={{ ...enter(t, 1.6) }}>{note}</Caps>
        </div>
        <svg width={GW} height={GH + 30} style={{ marginTop: 14, overflow: "visible" }}>
          <line x1={0} x2={GW} y1={GH} y2={GH} stroke={RULE} strokeWidth={2} />
          <polyline points={pts} fill="none" stroke={BLUE} strokeWidth={3} strokeLinejoin="round" pathLength={1} strokeDasharray={`${draw} 1`} />
          {"JFMAMJJASOND".split("").map((m, i) => <text key={i} x={(i + 0.5) * (GW / 12)} y={GH + 26} textAnchor="middle" style={{ font: `500 17px ${FONT}`, fill: MUTED }}>{m}</text>)}
        </svg>
      </div>
      <Sfx at={0} name="card" />
      <Sfx at={0.3} name="swish" gain={0.8} />
    </>
  );
};

// ---------- calendar: cells that fill one by one (months on medication, days of applications) ----------
export const Calendar: React.FC<{ dur: number; title: string; cells: string[]; from?: number; step?: number; foot?: string; chip?: { text: string; at: number }; pos?: Pos }> = ({
  dur, title, cells, from = 0.4, step = 0.3, foot, chip, pos = "top",
}) => {
  const t = useT();
  const W = 880, cw = (W - 60 - (cells.length - 1) * 8) / cells.length;
  const chipQ = chip ? quint(clamp((t - chip.at) / 0.45)) : 0;
  return (
    <>
      <div style={{ ...card(), ...place(pos, W), width: W, padding: "24px 30px 22px", boxSizing: "border-box", ...enter(t, 0, dur - 0.3) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ font: `600 40px/1.1 ${FONT}`, letterSpacing: "-0.01em" }}>{title}</div>
          {foot && <Caps style={{ ...enter(t, from + cells.length * step) }}>{foot}</Caps>}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          {cells.map((c, i) => {
            const q = quint(clamp((t - from - i * step) / 0.3));
            return (
              <div key={i} style={{ width: cw, height: cw * 1.15, borderRadius: 12, border: `1.5px solid ${q > 0.5 ? BLUE : RULE}`, background: q > 0.5 ? "rgba(47,159,224,.10)" : "rgba(255,255,255,.5)",
                display: "grid", placeItems: "center", boxSizing: "border-box", position: "relative" }}>
                <div style={{ position: "absolute", top: 6, font: `500 15px/1 ${FONT}`, color: MUTED }}>{c}</div>
                <div style={{ transform: `scale(${q})`, opacity: q, marginTop: 12 }}><Pill /></div>
              </div>
            );
          })}
        </div>
        {chip && (
          <div style={{ marginTop: 18, display: "inline-flex", alignItems: "center", gap: 12, padding: "12px 20px", borderRadius: 999, background: NAVY, color: "#fff",
            font: `600 28px/1 ${FONT}`, opacity: chipQ, transform: `translateY(${(1 - chipQ) * 12}px)` }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}><circle cx={12} cy={12} r={10} /><circle cx={12} cy={12} r={5} /><circle cx={12} cy={12} r={1.5} fill="#fff" /></svg>
            {chip.text}
          </div>
        )}
      </div>
      <Sfx at={0} name="card" />
      {chip && <Sfx at={chip.at} name="pop" gain={0.8} />}
    </>
  );
};

// ---------- compare: oral medication (whole body) vs laser (one target) ----------
export const Compare: React.FC<{ dur: number; left: [string, string]; right: [string, string]; rightAt?: number; pos?: Pos }> = ({ dur, left, right, rightAt = 1.6, pos = "chest" }) => {
  const t = useT();
  const W = 900, rq = quint(clamp((t - rightAt) / 0.45));
  const dots = Array.from({ length: 28 }, (_, i) => ({ x: 14 + ((i * 37) % 100) * 1.62, y: 14 + ((i * 53) % 100) * 0.9 }));
  const Box: React.FC<{ hi: number; children: React.ReactNode; head: string; sub: string }> = ({ hi, children, head, sub }) => (
    <div style={{ flex: 1, padding: 20, borderRadius: 20, border: `1.5px solid ${hi > 0.5 ? BLUE : RULE}`, background: hi > 0.5 ? "rgba(47,159,224,.08)" : "rgba(255,255,255,.5)" }}>
      <svg width={190} height={110} viewBox="0 0 190 110">{children}</svg>
      <div style={{ font: `600 36px/1.1 ${FONT}`, letterSpacing: "-0.01em", marginTop: 12 }}>{head}</div>
      <div style={{ font: `500 24px/1.25 ${FONT}`, color: MUTED, marginTop: 6 }}>{sub}</div>
    </div>
  );
  return (
    <>
      <div style={{ ...card(), ...place(pos, W), width: W, padding: 22, display: "flex", gap: 18, boxSizing: "border-box", ...enter(t, 0, dur - 0.3) }}>
        <Box hi={0} head={left[0]} sub={left[1]}>
          <rect x={2} y={2} width={186} height={106} rx={18} fill="none" stroke={RULE} strokeWidth={2} />
          {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={5} fill={MUTED} opacity={0.55 * quint(clamp((t - 0.3 - i * 0.02) / 0.3))} />)}
        </Box>
        <div style={{ flex: 1, display: "flex", opacity: rq, transform: `translateY(${(1 - rq) * 14}px)` }}>
          <Box hi={rq} head={right[0]} sub={right[1]}>
            <rect x={2} y={2} width={186} height={106} rx={18} fill="none" stroke={RULE} strokeWidth={2} />
            <circle cx={120} cy={56} r={6} fill="#e8536b" />
            <circle cx={120} cy={56} r={22} fill="none" stroke={BLUE} strokeWidth={2.5} pathLength={1} strokeDasharray={`${quint(clamp((t - rightAt - 0.3) / 0.5))} 1`} />
          </Box>
        </div>
      </div>
      <Sfx at={0} name="card" />
      <Sfx at={rightAt} name="pop" gain={0.8} />
      <Sfx at={rightAt + 0.3} name="swish" gain={0.7} />
    </>
  );
};

// ---------- chain: a -> b -> c, each lighting up as he says it ----------
export const Chain: React.FC<{ dur: number; title?: string; steps: { text: string; at: number; img?: string }[]; pos?: Pos; w?: number }> = ({ dur, title, steps, pos = "top", w = 900 }) => {
  const t = useT();
  return (
    <>
      <div style={{ ...card(), ...place(pos, w), width: w, padding: "24px 26px", boxSizing: "border-box", ...enter(t, 0, dur - 0.3) }}>
        {title && <Caps style={{ marginBottom: 16 }}>{title}</Caps>}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {steps.map((s, i) => {
            const q = quint(clamp((t - s.at) / 0.45));
            return (
              <div key={i} style={{ display: "contents" }}>
                {i > 0 && (
                  <svg width={40} height={24} viewBox="0 0 40 24" style={{ flex: "none", opacity: q }}>
                    <path d="M2 12 H34 M26 5 L35 12 L26 19" fill="none" stroke={MUTED} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 14, padding: "16px 16px", borderRadius: 18, minHeight: 92, boxSizing: "border-box",
                  background: i === steps.length - 1 && q > 0.5 ? NAVY : "rgba(255,255,255,.55)", color: i === steps.length - 1 && q > 0.5 ? "#fff" : NAVY,
                  opacity: 0.25 + 0.75 * q, transform: `translateY(${(1 - q) * 10}px)` }}>
                  {s.img && <Img src={staticFile(s.img)} style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover", flex: "none" }} />}
                  <div style={{ font: `600 32px/1.1 ${FONT}`, letterSpacing: "-0.01em" }}>{s.text}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Sfx at={0} name="card" />
      {steps.slice(1).map((s, i) => <Sfx key={i} at={s.at} name="pop" gain={0.7} />)}
    </>
  );
};

// ---------- note: one plain statement ----------
export const Note: React.FC<{ dur: number; caps: string; text: string; pos?: Pos; w?: number }> = ({ dur, caps, text, pos = "topLeft", w = 520 }) => {
  const t = useT();
  return (
    <>
      <div style={{ ...card(26), ...place(pos, w), width: w, padding: "24px 28px", boxSizing: "border-box", display: "flex", gap: 18, alignItems: "flex-start", ...enter(t, 0, dur - 0.3) }}>
        <div style={{ marginTop: 26 }}><Check q={quint(clamp((t - 0.4) / 0.4))} d={38} /></div>
        <div>
          <Caps>{caps}</Caps>
          <div style={{ font: `600 38px/1.15 ${FONT}`, letterSpacing: "-0.01em", marginTop: 10 }}>{text}</div>
        </div>
      </div>
      <Sfx at={0} name="card" />
      <Sfx at={0.4} name="yes" gain={0.7} />
    </>
  );
};

// ---------- chips: short facts that stack in, beside the device or his head ----------
export const Chips: React.FC<{ dur: number; items: { text: string; at: number; strong?: boolean }[]; pos?: Pos }> = ({ dur, items, pos = "topLeft" }) => {
  const t = useT();
  const p = place(pos, 460);
  return (
    <>
      <div style={{ position: "absolute", left: p.left, top: p.top, width: 460, display: "grid", gap: 12, justifyItems: pos.endsWith("Right") ? "end" : "start" }}>
        {items.map((it, i) => (
          <div key={i} style={{ ...card(999), position: "relative", display: "inline-flex", alignItems: "center", gap: 12, padding: "14px 22px",
            background: it.strong ? "rgba(29,34,48,.82)" : undefined, color: it.strong ? "#fff" : NAVY, font: `600 30px/1.1 ${FONT}`, ...enter(t, it.at, dur - 0.3) }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: it.strong ? "#7cc8f2" : BLUE, flex: "none" }} />{it.text}
          </div>
        ))}
      </div>
      {items.map((it, i) => <Sfx key={i} at={it.at} name="pop" gain={0.7} />)}
    </>
  );
};

// ---------- full cutaway: the real treatment, big, over the blurred footage (Evident's full-screen inserts, made light) ----------
// titles: later captions for a clip that changes subject mid-cutaway (Exomind: synapse -> neuroplasticity in one shot)
export const ClipFull: React.FC<{ dur: number; src: string; caps: string; title: string; startFrom?: number; titles?: { at: number; caps: string; title: string }[] }> = ({
  dur, src, caps: caps0, title: title0, startFrom = 1.5, titles = [],
}) => {
  const t = useT();
  const cur = [...titles].reverse().find((x) => t >= x.at);
  const caps = cur?.caps ?? caps0, title = cur?.title ?? title0;
  const swap = titles.reduce((q, x) => Math.max(q, 1 - clamp(Math.abs(t - x.at) / 0.18)), 0); // brief dip as the title changes
  const { fps } = useVideoConfig();
  const bg = quint(clamp(t / 0.4)) * (1 - clamp((t - (dur - 0.3)) / 0.3));
  return (
    <>
      <AbsoluteFill style={{ backdropFilter: `blur(${26 * bg}px)`, background: `rgba(14,16,22,${0.45 * bg})` }} />
      <div style={{ position: "absolute", left: 56, right: 56, top: 330, ...enter(t, 0.05, dur - 0.3) }}>
        <div style={{ opacity: 1 - swap }}>
          <Caps style={{ color: "rgba(255,255,255,.8)" }}>{caps}</Caps>
          <div style={{ font: `600 64px/1.05 ${FONT}`, letterSpacing: "-0.015em", color: "#fff", marginTop: 12 }}>{title}</div>
        </div>
        <div style={{ marginTop: 30, height: (1080 - 112) * 0.75, borderRadius: 28, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,.35)" }}>
          <Sequence layout="none" from={0}>
            <OffthreadVideo src={staticFile(src)} muted startFrom={Math.round(startFrom * fps)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </Sequence>
        </div>
      </div>
      <Sfx at={0} name="card" />
    </>
  );
};

// ---------- what drives it -> how it's actually treated ----------
export type TreatPhases = { drivers?: number[]; driversOut?: number; excelv?: number; split?: number; genesis?: number };

// three thin lines = the skin's layers, a dot on the one the laser works in
const Depth: React.FC<{ layer: number; label: string; q: number }> = ({ layer, label, q }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
    <svg width={56} height={34} viewBox="0 0 56 34">
      {[4, 17, 30].map((y, i) => <line key={i} x1={2} x2={54} y1={y} y2={y} stroke={i === layer ? BLUE : RULE} strokeWidth={i === layer ? 2.5 : 2} strokeLinecap="round" />)}
      <circle cx={28} cy={[4, 17, 30][layer]} r={5.5 * q} fill={BLUE} />
    </svg>
    <span style={{ font: `500 24px/1.2 ${FONT}`, color: MUTED }}>{label}</span>
  </div>
);

const ClipCard: React.FC<{ src: string; caps: string; title: string; depth: [number, string]; t: number; from: number; out: number; left: number; top: number }> = ({ src, caps, title, depth, t, from, out, left, top }) => {
  const { fps } = useVideoConfig();
  return (
    <div style={{ ...card(26), left, top, width: 440, ...enter(t, from, out) }}>
      <div style={{ margin: 10, height: 315, borderRadius: 18, overflow: "hidden", background: "#000" }}>
        <Sequence from={Math.round(from * fps)} layout="none">
          <OffthreadVideo src={staticFile(src)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </Sequence>
      </div>
      <div style={{ padding: "6px 22px 20px" }}>
        <Caps style={{ fontSize: 17 }}>{caps}</Caps>
        <div style={{ font: `600 38px/1.1 ${FONT}`, letterSpacing: "-0.01em", marginTop: 8 }}>{title}</div>
        <Depth layer={depth[0]} label={depth[1]} q={quint(clamp((t - from - 0.6) / 0.4))} />
      </div>
    </div>
  );
};

export const TreatmentCard: React.FC<{ dur: number; at: TreatPhases; clipsPos?: Pos }> = ({ dur, at, clipsPos = "chest" }) => {
  const t = useT();
  const drivers = at.drivers ?? [0.2, 2.5, 3.5], dOut = at.driversOut ?? 5.3, ev = at.excelv ?? 5.7, split = at.split ?? 10.1, lg = at.genesis ?? 10.9;
  const texts = ["Oil glands", "Inflammation", "Excess blood vessels"];
  const W = 600;
  const sq = quint(clamp((t - split) / 0.55));
  const evLeft = 320 + (88 - 320) * sq, ctop = place(clipsPos, 440).top;
  return (
    <>
      {t < dOut + 0.4 && (
        <div style={{ ...card(), ...place("top", W), width: W, padding: "24px 30px 14px", ...enter(t, 0, dOut) }}>
          <Caps>What drives the redness</Caps>
          <div style={{ position: "relative", marginTop: 10 }}>
            <div style={{ position: "absolute", left: 9, top: 33, width: 2, height: `${Math.max(0, drivers.filter((d) => t >= d).length - 1) * 66}px`, background: RULE }} />
            {texts.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, height: 66, ...enter(t, drivers[i]) }}>
                <div style={{ width: 20, height: 20, borderRadius: 10, border: `2.5px solid ${BLUE}`, background: i === texts.length - 1 ? BLUE : "#fff", flex: "none", boxSizing: "border-box", position: "relative" }} />
                <div style={{ font: `600 40px/1 ${FONT}`, letterSpacing: "-0.01em" }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {t >= ev - 0.1 && <ClipCard src="rosacea-laser/clips/excelv.mp4" caps="Vascular laser" title="Excel V" depth={[0, "Vessels near the surface"]} t={t} from={ev} out={dur - 0.3} left={evLeft} top={ctop} />}
      {t >= lg - 0.1 && <ClipCard src="rosacea-laser/clips/genesis.mp4" caps="Gentle heat" title="Laser Genesis" depth={[1, "Deeper in the skin"]} t={t} from={lg} out={dur - 0.3} left={552} top={ctop} />}
      <Sfx at={0} name="card" />
      {drivers.slice(1).map((d, i) => <Sfx key={i} at={d} name="pop" gain={0.7} />)}
      <Sfx at={ev} name="card" />
      <Sfx at={split} name="swish" />
      <Sfx at={lg} name="pop" gain={0.8} />
    </>
  );
};
