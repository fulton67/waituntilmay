import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, clamp } from "./brand";
import { useElza } from "./Fonts";
import { Captions } from "./components/Captions";
import { Sfx } from "./components/Ro";
import type { WideBg, WideMedia, WidePoint, WideProps } from "./types";

// OstadWide: the 16:9 YouTube cut (style DECISIONS 14). Layout after the client's console-home-screen reference ("the glass
// glossiness and the box on the right side and the curved boxes"), in our palette:
//   - full-bleed background: the current clean footage, heavily defocused and dimmed, so the glass reads (one look throughout);
//   - top left: the chapter as a large white NHG headline with an outlined pill under it;
//   - Dr. Ostad keyed out (scripts/video_matte.py, Robust Video Matting), large, on the left;
//   - a right-hand column of tall, heavily rounded frosted-glass cards: a point card (section label + brand-blue pill, a two-line
//     title, a muted line) and a media card (the clean footage at or below its native size, or a short list / comparison).
//   Cards change with his points and chapters, not every few seconds; everything fades/rises in 0.5 s.
export const WIDE_W = 1920, WIDE_H = 1080;
const quint = (q: number) => 1 - (1 - q) ** 5;
const BLUE = "#37a9e8";
const COL = { left: 1236, w: 624 };
const POINT = { top: 56, h: 268 };
const MEDIA = { top: 352, h: 560 };

// the frosted, slightly glossy card: translucent white over the blurred footage, a top sheen, a soft inner highlight, no hard border
const glass = (r = 38): React.CSSProperties => ({
  position: "absolute", borderRadius: r, overflow: "hidden", color: "#fff", fontFamily: FONT,
  background: "linear-gradient(180deg, rgba(255,255,255,.20) 0%, rgba(255,255,255,.10) 38%, rgba(255,255,255,.08) 100%)",
  backdropFilter: "blur(34px) saturate(1.35)",
  boxShadow: "inset 0 1.5px 0 rgba(255,255,255,.45), inset 0 0 0 1px rgba(255,255,255,.10), inset 0 -24px 48px rgba(255,255,255,.04), 0 24px 70px rgba(0,0,0,.30)",
});
// the glass's life: a fixed top sheen, a soft highlight that travels across once on entry (0.2-1.4 s), and two faint light blobs
// drifting slowly inside the frost (client: "movement behind the glass ... clean and not stagnant")
const Sheen: React.FC = () => {
  const { fps } = useVideoConfig();
  const f = useCurrentFrame(), t = f / fps;
  const sw = clamp((t - 0.2) / 1.2), x = -40 + sw * 180;
  const bx = 25 + 20 * Math.sin(t * 0.31), by = 20 + 15 * Math.cos(t * 0.23), wx = 75 - 18 * Math.sin(t * 0.19 + 1), wy = 80 - 14 * Math.cos(t * 0.27);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(60% 60% at ${bx}% ${by}%, rgba(55,169,232,.16), rgba(55,169,232,0) 70%), radial-gradient(55% 55% at ${wx}% ${wy}%, rgba(255,255,255,.10), rgba(255,255,255,0) 70%)` }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,0) 32%)", pointerEvents: "none" }} />
      {sw > 0 && sw < 1 && <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        background: `linear-gradient(105deg, transparent ${x - 18}%, rgba(255,255,255,.16) ${x}%, transparent ${x + 18}%)` }} />}
    </>
  );
};
const fade = (t: number, dur: number, rise = 16) => {
  const i = quint(clamp(t / 0.5)), o = clamp((t - (dur - 0.4)) / 0.4);
  return { opacity: i * (1 - o), transform: `translateY(${(1 - i) * rise - o * 8}px)` };
};

export const OstadWide: React.FC<WideProps> = ({ spec }) => {
  useElza(); // loads the Adobe kits, NHG included (Fonts.tsx)
  const { fps } = useVideoConfig();
  if (!spec) return <AbsoluteFill style={{ background: "#0d1726" }} />;
  const f = (s: number) => Math.round(s * fps);
  const w = spec.wide;
  return (
    <AbsoluteFill style={{ background: "#0d1726" }}>
      {w.bg.map((b, i) => (
        <Sequence key={`bg${i}`} from={f(b.at)} durationInFrames={f(b.dur)} name={`Background: ${b.src.split("/").pop()}`}>
          <Background bg={b} />
        </Sequence>
      ))}
      <Blobs />
      {/* a soft shade on the left so the presenter and the headline separate from the footage */}
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(8,12,20,.42) 0%, rgba(8,12,20,.18) 40%, rgba(8,12,20,0) 62%)" }} />
      <Presenter src={w.presenter} speed={spec.speed} place={w.place} />
      {w.chapters.map((c, i) => (
        <Sequence key={`ch${i}`} from={f(c.at)} durationInFrames={f(c.dur)} name={`Chapter: ${c.title}`}>
          <Headline title={c.title} pill={c.pill} dur={c.dur} />
        </Sequence>
      ))}
      {w.points.map((p, i) => (
        <Sequence key={`pt${i}`} from={f(p.at)} durationInFrames={f(p.dur)} name={`Point: ${p.title}`}>
          <PointCard p={p} />
        </Sequence>
      ))}
      {w.media.map((m, i) => (
        <Sequence key={`md${i}`} from={f(m.at)} durationInFrames={f(m.dur)} name={`Media: ${m.src ?? m.kind}`}>
          <MediaCard m={m} />
        </Sequence>
      ))}
      <Audio src={staticFile(spec.audio)} />
      <Captions captions={spec.captions} keywords={spec.keywords} look="clean" frame={{ left: 60, width: 1120, top: 948, size: 54 }} />
    </AbsoluteFill>
  );
};

// full-bleed footage, defocused (it only carries colour and motion behind the glass, so its resolution never shows), cross-faded
const Background: React.FC<{ bg: WideBg }> = ({ bg }) => {
  const { fps } = useVideoConfig();
  const t = useCurrentFrame() / fps;
  const q = clamp(t / 0.8) * (1 - clamp((t - (bg.dur - 0.01)) / 0.01));
  const drift = 1.12 + 0.03 * (t / bg.dur); // a slow push-in (3 % over the shot) so the defocused plate never sits still
  return (
    <AbsoluteFill style={{ opacity: q }}>
      <OffthreadVideo src={staticFile(bg.src)} muted startFrom={Math.round((bg.from ?? 0) * fps)} playbackRate={bg.rate ?? 1}
        style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(38px) saturate(0.9) brightness(0.78)", transform: `scale(${drift})` }} />
      <AbsoluteFill style={{ background: "rgba(12,20,34,.22)" }} />
    </AbsoluteFill>
  );
};

const Presenter: React.FC<{ src: string; speed: number; place: { scale: number; left: number; top: number } }> = ({ src, speed, place }) => (
  <div style={{ position: "absolute", left: place.left, top: place.top, width: 1080 * place.scale, height: 1920 * place.scale,
    filter: "drop-shadow(0 18px 44px rgba(0,0,0,.38))" }}>
    <OffthreadVideo src={staticFile(src)} muted transparent playbackRate={speed} style={{ width: "100%", height: "100%" }} />
  </div>
);

const Headline: React.FC<{ title: string; pill: string; dur: number }> = ({ title, pill, dur }) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const s = fade(t, dur, 22), p = fade(t - 0.15, dur - 0.15, 12);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 76, top: 52, ...s }}>
        <div style={{ font: `600 76px/1.02 ${FONT}`, letterSpacing: "-0.02em", color: "#fff", textShadow: "0 4px 24px rgba(0,0,0,.30)" }}>{title}</div>
      </div>
      <div style={{ position: "absolute", left: 76, top: 150, ...p }}>
        <span style={{ display: "inline-block", border: "2px solid rgba(255,255,255,.75)", borderRadius: 999, padding: "7px 20px 9px",
          font: `500 24px/1 ${FONT}`, color: "#fff", letterSpacing: "0.01em", textShadow: "0 2px 10px rgba(0,0,0,.25)" }}>{pill}</span>
      </div>
      <Sfx at={0.05} name="swish" gain={0.6} />
    </AbsoluteFill>
  );
};

// the point card: section label + brand-blue pill, a two-line title (swapped mid-card when he moves to the next word of the point), a muted line
const PointCard: React.FC<{ p: WidePoint }> = ({ p }) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const cur = [...(p.titles ?? [])].reverse().find((x) => t >= x.at);
  const title = cur?.title ?? p.title, sub = cur?.sub ?? p.sub;
  const swap = (p.titles ?? []).reduce((q, x) => Math.max(q, 1 - clamp(Math.abs(t - x.at) / 0.2)), 0);
  return (
    <>
      <div style={{ ...glass(), left: COL.left, top: POINT.top, width: COL.w, height: POINT.h, padding: "30px 34px", boxSizing: "border-box", ...fade(t, p.dur) }}>
        <Sheen />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ font: `500 24px/1 ${FONT}`, color: "rgba(255,255,255,.78)" }}>{p.label}</span>
          <span style={{ background: BLUE, color: "#fff", borderRadius: 999, padding: "8px 18px 10px", font: `600 22px/1 ${FONT}` }}>{p.pill}</span>
        </div>
        <div style={{ opacity: 1 - swap }}>
          <div style={{ font: `600 46px/1.08 ${FONT}`, letterSpacing: "-0.015em", marginTop: 30, maxHeight: 2 * 46 * 1.08, overflow: "hidden" }}>{title}</div>
          {sub && <div style={{ font: `500 25px/1.25 ${FONT}`, color: "rgba(255,255,255,.66)", marginTop: 12 }}>{sub}</div>}
        </div>
      </div>
      <Sfx at={0} name="card" gain={0.55} />
    </>
  );
};

// the media card: tall, very rounded; footage (object-fit cover at <= 1:1 of the clip's pixels), or a short ticked list, or a two-up
// comparison; `cutout` lets a device image break out of the card's top edge (the reference's character over the card)
const MediaCard: React.FC<{ m: WideMedia }> = ({ m }) => {
  const { fps } = useVideoConfig();
  const t = useCurrentFrame() / fps;
  const box: React.CSSProperties = { ...glass(40), left: COL.left, top: MEDIA.top, width: COL.w, height: MEDIA.h, ...fade(t, m.dur) };
  const push = 1 + 0.03 * (t / m.dur);
  return (
    <>
      <div style={box}>
        {m.kind === "clip" && m.src && (
          <OffthreadVideo src={staticFile(m.src)} muted startFrom={Math.round((m.from ?? 0) * fps)} playbackRate={m.rate ?? 1}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: m.focus ?? "50% 50%", transform: `scale(${push})` }} />
        )}
        {m.kind === "clip" && m.credit && (
          <div style={{ position: "absolute", right: 22, bottom: 16, font: `500 16px/1 ${FONT}`, color: "rgba(255,255,255,.7)", textShadow: "0 1px 6px rgba(0,0,0,.5)" }}>{m.credit}</div>
        )}
        {m.kind === "list" && (
          <div style={{ padding: "40px 38px" }}>
            {m.head && <div style={{ font: `500 24px/1 ${FONT}`, color: "rgba(255,255,255,.75)", marginBottom: 18 }}>{m.head}</div>}
            {(m.rows ?? []).map((r, i) => {
              const q = quint(clamp((t - r.at) / 0.45));
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, padding: "22px 0", borderTop: i ? "1px solid rgba(255,255,255,.16)" : "none",
                  opacity: 0.2 + 0.8 * q, transform: `translateY(${(1 - q) * 10}px)` }}>
                  <svg width={40} height={40} viewBox="0 0 34 34" style={{ flex: "none" }}>
                    <circle cx={17} cy={17} r={16} fill={BLUE} opacity={q} />
                    <circle cx={17} cy={17} r={16} fill="none" stroke="rgba(255,255,255,.5)" strokeWidth={1.5} opacity={1 - q} />
                    <path d="M10 17.5 l4.6 4.6 L24 12.6" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${q} 1`} />
                  </svg>
                  <div style={{ font: `600 36px/1.15 ${FONT}`, letterSpacing: "-0.01em" }}>{r.text}</div>
                </div>
              );
            })}
          </div>
        )}
        {m.kind === "pair" && m.pair && (
          <div style={{ padding: "40px 38px", display: "grid", gap: 22 }}>
            {m.pair.map((c, i) => {
              const q = quint(clamp((t - (i ? m.pairAt ?? 1.5 : 0.1)) / 0.45));
              return (
                <div key={i} style={{ borderRadius: 28, padding: "30px 30px", background: i && q > 0.5 ? "rgba(55,169,232,.30)" : "rgba(255,255,255,.08)",
                  boxShadow: i && q > 0.5 ? "inset 0 0 0 1.5px rgba(124,200,242,.7)" : "inset 0 0 0 1px rgba(255,255,255,.14)", opacity: q, transform: `translateY(${(1 - q) * 12}px)` }}>
                  <div style={{ font: `600 42px/1.1 ${FONT}`, letterSpacing: "-0.01em" }}>{c[0]}</div>
                  <div style={{ font: `500 26px/1.25 ${FONT}`, color: "rgba(255,255,255,.7)", marginTop: 8 }}>{c[1]}</div>
                </div>
              );
            })}
          </div>
        )}
        <Sheen />
      </div>
      {m.cutout && (
        <Img src={staticFile(m.cutout)} style={{ position: "absolute", left: COL.left + COL.w - 300, top: MEDIA.top - 26, height: 560,
          filter: "drop-shadow(0 22px 40px rgba(0,0,0,.4))", ...fade(t - 0.2, m.dur - 0.2, 24) }} />
      )}
      <Sfx at={0} name="card" gain={0.5} />
      {(m.rows ?? []).slice(1).map((r, i) => <Sfx key={i} at={r.at} name="pop" gain={0.6} />)}
      {m.kind === "pair" && <Sfx at={m.pairAt ?? 1.5} name="pop" gain={0.6} />}
    </>
  );
};

// soft light behind the frost: two large brand-blue / white glows drifting very slowly (periods of 20-35 s), low amplitude
const Blobs: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const a = { x: 1420 + 120 * Math.sin(t * 0.21), y: 360 + 90 * Math.cos(t * 0.17) }, b = { x: 1600 - 140 * Math.sin(t * 0.18 + 1.1), y: 820 - 80 * Math.cos(t * 0.25) };
  return (
    <AbsoluteFill style={{ background: `radial-gradient(520px 420px at ${a.x}px ${a.y}px, rgba(55,169,232,.20), rgba(55,169,232,0) 70%), radial-gradient(460px 380px at ${b.x}px ${b.y}px, rgba(255,255,255,.10), rgba(255,255,255,0) 70%)` }} />
  );
};
