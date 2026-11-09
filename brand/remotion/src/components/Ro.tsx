import { Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, SAFE_T, clamp } from "../brand";

// Calm explainer cards, v3 (style DECISIONS 11). Client on v2: the glass words, pill capsules and the depth diagram "look really
// cheap ... the way it pops up, the way the glass looks"; "if we look at Ro ... that's kind of what I imagine the oral
// antibiotics would be like"; the diagram is "kind of confusing ... being able to show it in the way that it's actually done is
// important". So, from the Ro reference set (research/ostad/style/media/yt/ro):
//   - one card material: a light frosted white card, navy type, soft long shadow, no rims, no glints, no tint;
//   - real things in the card: a photo of the capsules, the practice's own treatment footage (Excel V, Laser Genesis);
//   - Ro's progress segments and checklist rows instead of drawn cartoons;
//   - motion: fade + 18 px rise in 0.45 s (quint), out in 0.3 s; no scale overshoot, no shake.
//   RxCard        "repeated, prolonged courses of oral antibiotics": the capsules, a 4-segment course bar filling.
//   RoutineCard   "depend on repeated antibiotics, topical daily medications": two checklist rows, then each is struck through.
//   TreatmentCard the oil glands -> inflammation -> vessels chain as three rows, then the real Excel V treatment, then Laser
//                 Genesis beside it, each with a three-line depth glyph (where in the skin it works).
export const NAVY = "#1d2230", MUTED = "#6b7183", RULE = "#e2e5eb", BLUE = "#2f9fe0";
const quint = (q: number) => 1 - (1 - q) ** 5;

export const card = (radius = 28): React.CSSProperties => ({
  position: "absolute", overflow: "hidden", borderRadius: radius, color: NAVY, fontFamily: FONT,
  background: "rgba(255,255,255,.92)", backdropFilter: "blur(20px) saturate(1.15)",
  boxShadow: "0 22px 60px rgba(8,12,22,.24), 0 2px 8px rgba(8,12,22,.10)",
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

const Caps: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ font: `500 19px/1 ${FONT}`, letterSpacing: "0.13em", textTransform: "uppercase", color: MUTED, ...style }}>{children}</div>
);

// ---------- oral antibiotics ----------
export const RxCard: React.FC<{ dur: number; label?: string; img?: string; credit?: string; courses?: number }> = ({
  dur, label = "Oral antibiotics", img = "rosacea-laser/images/doxy.jpg", credit = "Photo: Shorelander, CC BY 2.5 (cropped)", courses = 4,
}) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const W = 560, X = (1080 - W) / 2, seg0 = 0.5, step = 0.38;
  const filled = (i: number) => quint(clamp((t - seg0 - i * step) / 0.3));
  const n = Array.from({ length: courses }, (_, i) => i).filter((i) => t >= seg0 + i * step + 0.15).length;
  return (
    <>
      <div style={{ ...card(), left: X, top: SAFE_T + 10, width: W, ...enter(t, 0, dur - 0.3) }}>
        <div style={{ margin: 12, height: 270, borderRadius: 18, overflow: "hidden", background: "#fff" }}>
          <Img src={staticFile(img)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 45%" }} />
        </div>
        <div style={{ padding: "10px 28px 22px" }}>
          <Caps>Prescription · by mouth</Caps>
          <div style={{ font: `600 46px/1.1 ${FONT}`, letterSpacing: "-0.01em", marginTop: 10 }}>{label}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            {Array.from({ length: courses }, (_, i) => (
              <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: RULE, overflow: "hidden" }}>
                <div style={{ width: `${filled(i) * 100}%`, height: "100%", background: BLUE, borderRadius: 3 }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, font: `500 24px/1.2 ${FONT}`, color: MUTED }}>
            <span>Repeated courses</span><span style={{ color: NAVY, fontVariantNumeric: "tabular-nums" }}>{n > 0 ? `Course ${n}` : ""}</span>
          </div>
          <div style={{ marginTop: 10, font: `500 15px/1 ${FONT}`, color: "#9aa0ae" }}>{credit}</div>
        </div>
      </div>
      <Sfx at={0} name="card" />
      <Sfx at={seg0 + (courses - 1) * step} name="pop" gain={0.8} />
    </>
  );
};

// ---------- repeated antibiotics, topical daily medications ----------
const Tube: React.FC = () => (
  <svg width={44} height={44} viewBox="0 0 44 44" fill="none" stroke={NAVY} strokeWidth={2} strokeLinejoin="round">
    <path d="M12 8 h20 l-2 24 h-16 z" /><path d="M17 32 v4 h10 v-4" /><path d="M15 14 h14" />
  </svg>
);

export const RoutineCard: React.FC<{ dur: number; rows?: { text: string; at: number }[]; strikeAt?: number; title?: string }> = ({
  dur, rows = [{ text: "Repeated antibiotics", at: 0.3 }, { text: "Daily topical creams", at: 2.05 }], strikeAt = 2.6, title = "Instead of depending on",
}) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const W = 620, X = (1080 - W) / 2;
  return (
    <>
      <div style={{ ...card(), left: X, top: SAFE_T + 10, width: W, padding: "26px 28px 14px", ...enter(t, 0, dur - 0.3) }}>
        <Caps>{title}</Caps>
        {rows.map((r, i) => {
          const s = quint(clamp((t - strikeAt - i * 0.3) / 0.35));
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, padding: "16px 0", borderTop: i ? `1px solid ${RULE}` : "none", marginTop: i ? 0 : 12, ...enter(t, r.at) }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, overflow: "hidden", background: "#f2f4f7", display: "grid", placeItems: "center", flex: "none" }}>
                {i === 0 ? <Img src={staticFile("rosacea-laser/images/doxy.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Tube />}
              </div>
              <div style={{ position: "relative", font: `600 38px/1.1 ${FONT}`, letterSpacing: "-0.01em", color: s > 0.5 ? MUTED : NAVY }}>
                {r.text}
                <div style={{ position: "absolute", left: -4, top: "54%", height: 2.5, borderRadius: 2, background: NAVY, width: `calc((100% + 8px) * ${s})` }} />
              </div>
            </div>
          );
        })}
      </div>
      <Sfx at={0} name="card" />
      {rows.slice(1).map((r, i) => <Sfx key={i} at={r.at} name="pop" gain={0.7} />)}
      <Sfx at={strikeAt} name="no" gain={0.8} />
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

const ClipCard: React.FC<{ src: string; caps: string; title: string; depth: [number, string]; t: number; from: number; out: number; left: number }> = ({ src, caps, title, depth, t, from, out, left }) => {
  const { fps } = useVideoConfig();
  return (
    <div style={{ ...card(26), left, top: SAFE_T + 10, width: 440, ...enter(t, from, out) }}>
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

export const TreatmentCard: React.FC<{ dur: number; at: TreatPhases }> = ({ dur, at }) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const drivers = at.drivers ?? [0.2, 2.5, 3.5], dOut = at.driversOut ?? 5.3, ev = at.excelv ?? 5.7, split = at.split ?? 10.1, lg = at.genesis ?? 10.9;
  const texts = ["Oil glands", "Inflammation", "Excess blood vessels"];
  const W = 600, X = (1080 - W) / 2;
  const sq = quint(clamp((t - split) / 0.55));
  const evLeft = 320 + (88 - 320) * sq;
  return (
    <>
      {t < dOut + 0.4 && (
        <div style={{ ...card(), left: X, top: SAFE_T + 10, width: W, padding: "26px 30px 18px", ...enter(t, 0, dOut) }}>
          <Caps>What drives the redness</Caps>
          <div style={{ position: "relative", marginTop: 14 }}>
            <div style={{ position: "absolute", left: 9, top: 37, width: 2, height: `${Math.max(0, drivers.filter((d) => t >= d).length - 1) * 74}px`, background: RULE }} />
            {texts.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, height: 74, ...enter(t, drivers[i]) }}>
                <div style={{ width: 20, height: 20, borderRadius: 10, border: `2.5px solid ${BLUE}`, background: i === texts.length - 1 ? BLUE : "#fff", flex: "none", boxSizing: "border-box", position: "relative" }} />
                <div style={{ font: `600 40px/1 ${FONT}`, letterSpacing: "-0.01em" }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {t >= ev - 0.1 && <ClipCard src="rosacea-laser/clips/excelv.mp4" caps="Vascular laser" title="Excel V" depth={[0, "Vessels near the surface"]} t={t} from={ev} out={dur - 0.3} left={evLeft} />}
      {t >= lg - 0.1 && <ClipCard src="rosacea-laser/clips/genesis.mp4" caps="Gentle heat" title="Laser Genesis" depth={[1, "Deeper in the skin"]} t={t} from={lg} out={dur - 0.3} left={552} />}
      <Sfx at={0} name="card" />
      {drivers.slice(1).map((d, i) => <Sfx key={i} at={d} name="pop" gain={0.7} />)}
      <Sfx at={ev} name="card" />
      <Sfx at={split} name="swish" />
      <Sfx at={lg} name="pop" gain={0.8} />
    </>
  );
};
