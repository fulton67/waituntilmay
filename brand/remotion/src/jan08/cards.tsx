// Jan 08 reel: cards, the two STANDARD devices (DEVICE_LIBRARY std-clip-card, std-skin-window), the keyed presenter and captions.
//   ClipCard    exact derivative of components/Ro.tsx ClipCard (via the Oct 14 derivative's spec): card(26), 440 wide, clip/photo on top in
//               an 18-radius window 315 high (10 px inset), 17 px caps, 38 px title, the depth line in ink; Ro `enter` motion.
//   SkinWindow  derivative of components/SkinCard.tsx: Markup glass(30), 10 px frame, photo in a 22-radius window, glass BEFORE pill that
//               becomes AFTER on a line wipe, a thin white ellipse ring on a landmark (no riding dot, no leader), the credit line.
//   FaceMap     the same window on the patient's own photo with white pen strokes on her landmarks (MediaPipe), one per place he names.
//   Keyed       Dr. Ostad cut out (RVM, brand/scripts/video_matte.py) in front on the left, on the cream room; the source frame's right
//               edge feathered over 140 source px (RULES: no straight source edge).
import React from "react";
import { Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { card, NAVY, RULE } from "../components/Ro";
import { Chip, glass } from "../devices/Markup";
import { CAP_T, CREAM, D, FONT, H, INK, M, MUTED, ON_FOOTAGE, SAFE_T, W, WHITE, caps, disp, life, p, vis, type Pt } from "./look";

const quint = (q: number) => 1 - (1 - q) ** 5;
const cl = (v: number) => Math.min(1, Math.max(0, v));
export const enterF = (frame: number, s: number, out = 1e9) => {
  const i = quint(cl((frame - s) / (0.45 * 24))), o = cl((frame - out) / (0.3 * 24));
  return { opacity: i * (1 - o), transform: `translateY(${(1 - i) * 18 - o * 10}px)` };
};

/* ---------------------------------------------------------------- hook title ------------------------------------------------------- */
/** "Filler fatigue" over his opening line; a white pen strike draws through it on the word "fatigue" (he does not believe in it) */
export const HookTitle: React.FC<{ s: number; strike: number; out: number }> = ({ s, strike, out }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s, out)) return null;
  const k = p(frame, strike + 1, 9, "sweep");
  return (
    <div style={{ position: "absolute", left: M, top: SAFE_T + 30, ...life(frame, s, out) }}>
      <div style={{ ...caps(30, WHITE), textShadow: ON_FOOTAGE, marginBottom: 18 }}>Dr. Ariel Ostad on</div>
      <div style={{ position: "relative", ...disp(150, WHITE), textShadow: ON_FOOTAGE, whiteSpace: "nowrap" }}>
        Filler<br />fatigue
        <svg width={640} height={60} style={{ position: "absolute", left: -10, top: 150 + 52, overflow: "visible" }}>
          <path d="M0,34 C160,22 380,30 610,18" stroke={WHITE} strokeWidth={10} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={`${k} 1`} style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,.4))" }} />
        </svg>
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------- section card ----------------------------------------------------- */
/** full frame over his moving footage, left darkening 0.72 -> 0.18; number + rule; title typed on in 12 f, held 60 f fully lit, letters out 8 f */
export const SectionCard: React.FC<{ s: number; num: string; title: string }> = ({ s, num, title }) => {
  const frame = useCurrentFrame();
  const T = 12, HOLD = 60, OUT = 8;
  if (frame < s || frame > s + T + HOLD + OUT) return null;
  const inK = p(frame, s, 8, "arrive"), outK = p(frame, s + T + HOLD, OUT, "exit");
  const typed = Math.round(title.length * cl((frame - s - 2) / (T - 2)));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - outK }}>
      <div style={{ position: "absolute", inset: 0, opacity: inK, background: "linear-gradient(90deg, rgba(17,21,29,.72) 0%, rgba(17,21,29,.5) 50%, rgba(17,21,29,.18) 100%)" }} />
      <div style={{ position: "absolute", left: M, top: 700, width: W - 2 * M, ...life(frame, s, Infinity) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <span style={{ ...disp(64, WHITE, 500) }}>{num}</span>
          <span style={{ display: "block", height: 3, width: 160 * inK, background: WHITE, borderRadius: 2, boxShadow: "0 1px 4px rgba(0,0,0,.3)" }} />
        </div>
        <div style={{ ...disp(124, WHITE), marginTop: 26, textShadow: ON_FOOTAGE }}>{title.slice(0, typed)}<span style={{ opacity: 0 }}>{title.slice(typed)}</span></div>
      </div>
    </div>
  );
};
export const SECTION_LEN = 12 + 60 + 8;

/* ---------------------------------------------------------------- footage + keyed presenter ---------------------------------------- */
/** toneMapped: undefined keeps Remotion's default (V1-V3 as delivered); Jan08ReelV4 passes false (raw colour, Naim round 3) */
export const Clip: React.FC<{ src: string; from: number; s: number; dur: number; style?: React.CSSProperties; z?: (f: number) => number; toneMapped?: boolean }> = ({ src, from, s, dur, style, z, toneMapped }) => {
  const frame = useCurrentFrame();
  return (
    <Sequence from={s} durationInFrames={dur} layout="none">
      <OffthreadVideo src={staticFile(src)} trimBefore={Math.round(from * 24)} muted {...(toneMapped === undefined ? {} : { toneMapped })}
        style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover", transform: z ? `scale(${z(frame - s)})` : undefined, ...style }} />
    </Sequence>
  );
};

/** the cream room (side-fill is the room, never a blurred copy) with a slow light drift so the ground is never static */
export const Room: React.FC<{ s: number; dur: number }> = ({ s, dur }) => {
  const frame = useCurrentFrame();
  if (frame < s || frame >= s + dur) return null;
  const t = (frame - s) / 24;
  return <div style={{ position: "absolute", inset: 0, background: `radial-gradient(120% 80% at ${70 + 6 * Math.sin(t / 3)}% ${18 + 4 * Math.cos(t / 4)}%, #faf8f5 0%, ${CREAM} 55%, #c3bdbb 140%)` }} />;
};

/** Dr. Ostad keyed in front on the left: the RVM webm (cut to the same piece), scaled from his feet, right edge feathered */
export const Keyed: React.FC<{ src: string; s: number; dur: number; from?: number; scale?: number; x?: number }> = ({ src, s, dur, from = 0, scale = 0.9, x = -200 }) => (
  <Sequence from={s} durationInFrames={dur} layout="none">
    <OffthreadVideo src={staticFile(src)} transparent trimBefore={Math.round(from * 24)} muted
      style={{ position: "absolute", left: x, top: H - H * scale, width: W * scale, height: H * scale,
        WebkitMaskImage: `linear-gradient(90deg, #000 0%, #000 ${100 - (140 / 1080) * 100}%, transparent 100%)`, maskImage: `linear-gradient(90deg, #000 0%, #000 ${100 - (140 / 1080) * 100}%, transparent 100%)`,
        filter: "drop-shadow(0 18px 40px rgba(17,21,29,.22))" }} />
  </Sequence>
);

/* ---------------------------------------------------------------- STANDARD ClipCard -------------------------------------------------- */
const Caps17: React.FC<{ children: React.ReactNode }> = ({ children }) => <div style={{ font: `500 17px/1 ${FONT}`, letterSpacing: "0.13em", textTransform: "uppercase", color: MUTED }}>{children}</div>;
const Depth: React.FC<{ layer: number; label: string; q: number }> = ({ layer, label, q }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
    <svg width={56} height={34} viewBox="0 0 56 34">
      {[4, 17, 30].map((y, i) => <line key={i} x1={2} x2={54} y1={y} y2={y} stroke={i === layer ? NAVY : RULE} strokeWidth={i === layer ? 2.5 : 2} strokeLinecap="round" />)}
      <circle cx={28} cy={[4, 17, 30][layer]} r={5.5 * q} fill={NAVY} />
    </svg>
    <span style={{ font: `500 24px/1.2 ${FONT}`, color: MUTED }}>{label}</span>
  </div>
);
export type ClipSpec = { src: string; from?: number; img?: boolean; caps: string; title: string; depth?: [number, string]; credit?: string; pos?: string };
export const ClipCard: React.FC<{ c: ClipSpec; s: number; out: number; left: number; top: number; w?: number }> = ({ c, s, out, left, top, w = 440 }) => {
  const frame = useCurrentFrame();
  if (frame < s || frame > out + 8) return null;
  const t = (frame - s) / 24;
  return (
    <>
      <div style={{ ...card(26), left, top, width: w, ...enterF(frame, s, out) }}>
        <div style={{ margin: 10, height: 315, borderRadius: 18, overflow: "hidden", background: "#000" }}>
          {c.img ? <Img src={staticFile(c.src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: c.pos ?? "50% 50%", transform: `scale(${1.04 + 0.012 * t})` }} />
            : <Sequence from={s} layout="none"><OffthreadVideo src={staticFile(c.src)} trimBefore={Math.round((c.from ?? 0) * 24)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} /></Sequence>}
        </div>
        <div style={{ padding: "6px 22px 20px" }}>
          <Caps17>{c.caps}</Caps17>
          <div style={{ font: `600 38px/1.1 ${FONT}`, letterSpacing: "-0.01em", marginTop: 8 }}>{c.title}</div>
          {c.depth && <Depth layer={c.depth[0]} label={c.depth[1]} q={quint(cl((frame - s - 0.6 * 24) / (0.4 * 24)))} />}
        </div>
      </div>
      {c.credit && <div style={{ position: "absolute", left: left + 6, top: top + 315 + 20 + 150, width: w, ...caps(15, WHITE), letterSpacing: "0.04em", textTransform: "none", textShadow: ON_FOOTAGE, ...enterF(frame, s + 6, out) }}>{c.credit}</div>}
    </>
  );
};

/* ---------------------------------------------------------------- the three causes (glass list) ------------------------------------- */
export const Causes: React.FC<{ s: number; out: number; rows: { text: string; s: number }[]; top: number }> = ({ s, out, rows, top }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s, out)) return null;
  return (
    <div style={{ ...card(28), left: M, top, width: W - 2 * M, padding: "30px 40px 34px", ...life(frame, s, out) }}>
      <div style={{ ...caps(24, MUTED) }}>Where the bad results come from</div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 22, marginTop: 20, ...life(frame, r.s + 1, Infinity, 10) }}>
          <span style={{ ...disp(34, MUTED, 500) }}>{i + 1}</span>
          <span style={{ ...disp(56, INK) }}>{r.text}</span>
        </div>
      ))}
    </div>
  );
};

/* ---------------------------------------------------------------- photo window (std-skin-window derivative) ------------------------ */
type Crop = { x: number; y: number; w: number; h: number };
const Window: React.FC<{ s: number; out: number; box: Crop; children: React.ReactNode; credit?: string }> = ({ s, out, box, children, credit = "Patient of Dr. Ostad. Individual results vary." }) => {
  const frame = useCurrentFrame();
  const t = (frame - s) / 24;
  const q = cl(t / 0.36), o = cl((frame - out) / 7);
  const sc = (0.9 + 0.1 * (1 + 2.3 * (q - 1) ** 3 + 1.3 * (q - 1) ** 2)) * (1 - 0.04 * o);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: cl(q * 2.5) * (1 - o) }}>
      <div style={{ ...glass(30), left: box.x - 10, top: box.y - 10, width: box.w + 20, height: box.h + 20, transform: `scale(${sc})`, transformOrigin: "50% 40%" }}>
        <div style={{ position: "absolute", left: 10, top: 10, width: box.w, height: box.h, borderRadius: 22, overflow: "hidden" }}>{children}</div>
      </div>
      <div style={{ position: "absolute", left: box.x + 22, top: box.y + box.h - 44, width: box.w - 44, textAlign: "right", color: "rgba(255,255,255,.92)", font: `500 22px/1.25 ${FONT}`, textShadow: "0 1px 4px rgba(0,0,0,.6)" }}>{credit}</div>
    </div>
  );
};

/** a photo of iw x ih shown through the window with crop `cr` (photo px); returns a mapper photo px -> frame px */
const mapper = (box: Crop, cr: Crop) => (q: [number, number]): Pt => ({ x: box.x + ((q[0] - cr.x) / cr.w) * box.w, y: box.y + ((q[1] - cr.y) / cr.h) * box.h });

/** white pen path (the reel's markup), drawn on over 12 f, held, out with the window */
const Pen: React.FC<{ pts: Pt[]; s: number; out: number; w?: number; dash?: boolean }> = ({ pts, s, out, w = 6, dash }) => {
  const frame = useCurrentFrame();
  const k = p(frame, s, 12, "sweep"), o = 1 - cl((frame - out) / 7);
  if (k <= 0 || o <= 0) return null;
  const d = pts.length === 2 ? `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`
    : "M" + pts[0].x + "," + pts[0].y + pts.slice(1).map((q, i) => { const a = pts[i]; return ` Q${a.x},${a.y} ${(a.x + q.x) / 2},${(a.y + q.y) / 2}`; }).join("") + ` L${pts[pts.length - 1].x},${pts[pts.length - 1].y}`;
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: o }}>
      <path d={d} stroke={WHITE} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={dash ? undefined : `${k} 1`}
        strokeOpacity={dash ? k : 1} style={{ filter: "drop-shadow(0 0 5px rgba(255,255,255,.35)) drop-shadow(0 1px 2px rgba(0,0,0,.35))" }} />
    </svg>
  );
};

const RingW: React.FC<{ c: Pt; rx: number; ry: number; s: number; out: number }> = ({ c, rx, ry, s, out }) => {
  const frame = useCurrentFrame();
  const k = p(frame, s, 13, "sweep"), o = 1 - cl((frame - out) / 7);
  if (k <= 0 || o <= 0) return null;
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: o }}>
      <ellipse cx={c.x} cy={c.y} rx={rx} ry={ry} transform={`rotate(-12 ${c.x} ${c.y})`} stroke={WHITE} strokeWidth={3.5} fill="none" pathLength={1} strokeDasharray={`${k} 1`}
        style={{ filter: "drop-shadow(0 0 5px rgba(255,255,255,.35)) drop-shadow(0 1px 2px rgba(0,0,0,.3))" }} />
    </svg>
  );
};

export type BA = { size: [number, number]; lm_before: [number, number][]; lm_after: [number, number][] };

/** his placement map on her own photo: cheekbones, laugh line, marionette, lower lids, then the mid cheek (white pen on landmarks) */
export const FaceMap: React.FC<{ ba: BA; s: number; out: number; box: Crop; cues: { cheek: number; laugh: number; marionette: number; lids: number; mid: number } }> = ({ ba, s, out, box, cues }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s, out)) return null;
  const cr: Crop = { x: 760, y: 1250, w: 1520, h: 1520 * (box.h / box.w) };
  const m = mapper(box, cr), L = (i: number) => m(ba.lm_before[i]);
  const off = (q: Pt, dy: number): Pt => ({ x: q.x, y: q.y + dy });
  const t = (frame - s) / 24;
  const chip = (at: Pt, text: string, cs: number, side: "left" | "right") => frame > cs && <Chip at={at} side={side} text={text} s={0.72 + 0.28 * quint(cl((frame - cs) / 8))} o={cl((frame - cs) / 4) * (1 - cl((frame - out) / 7))} />;
  return (
    <>
      <Window s={s} out={out} box={box}>
        <Img src={staticFile("jan08/clinic/front_before.jpg")} style={{ position: "absolute", left: (-cr.x / cr.w) * box.w, top: (-cr.y / cr.h) * box.h, width: (ba.size[0] / cr.w) * box.w,
          transform: `scale(${1 + 0.006 * t})`, transformOrigin: "50% 45%" }} />
      </Window>
      {frame > s + 9 && <Chip at={{ x: box.x + 18, y: box.y + 34 }} side="right" text="His plan" s={0.72 + 0.28 * quint(cl((frame - s - 9) / 8))} o={cl((frame - s - 9) / 4) * (1 - cl((frame - out) / 7))} />}
      {/* cheekbones (both sides): the arc across the malar prominence; the most product goes here */}
      <Pen pts={[118, 117, 116, 123].map(L)} s={cues.cheek} out={out} w={9} />
      <Pen pts={[347, 346, 345, 352].map(L)} s={cues.cheek + 4} out={out} w={9} />
      {chip({ x: box.x + 24, y: box.y + box.h - 196 }, "Cheekbones", cues.cheek + 10, "right")}
      {/* minimal: laugh lines, marionette lines; a little: lower lids (thin strokes = less product) */}
      <Pen pts={[129, 203, 206, 216].map(L)} s={cues.laugh} out={out} w={4} />
      <Pen pts={[358, 423, 426, 436].map(L)} s={cues.laugh + 3} out={out} w={4} />
      {chip({ x: box.x + 24, y: box.y + box.h - 142 }, "Laugh lines · minimal", cues.laugh + 6, "right")}
      <Pen pts={[61, 202, 210].map(L)} s={cues.marionette} out={out} w={4} />
      <Pen pts={[291, 422, 430].map(L)} s={cues.marionette + 3} out={out} w={4} />
      {chip({ x: box.x + 24, y: box.y + box.h - 88 }, "Marionette lines · minimal", cues.marionette + 6, "right")}
      <Pen pts={[23, 24, 110].map((i) => off(L(i), 22))} s={cues.lids} out={out} w={4} />
      <Pen pts={[253, 254, 339].map((i) => off(L(i), 22))} s={cues.lids + 3} out={out} w={4} />
      {chip({ x: box.x + 24, y: box.y + box.h - 34 }, "Lower lids · a little", cues.lids + 6, "right")}
    </>
  );
};

/** the result: before -> after through the window (a white line wipe on `sweep`), the white ring on her cheekbone landmark */
export const BAWindow: React.FC<{ ba: BA; s: number; out: number; sweep: number; box: Crop }> = ({ ba, s, out, sweep, box }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s, out)) return null;
  const cr: Crop = { x: 700, y: 1150, w: 1640, h: 1640 * (box.h / box.w) };
  const m = mapper(box, cr);
  const k = p(frame, sweep, 16, "sweep");
  const img = (src: string, clip?: string) => (
    <Img src={staticFile(src)} style={{ position: "absolute", left: (-cr.x / cr.w) * box.w, top: (-cr.y / cr.h) * box.h, width: (ba.size[0] / cr.w) * box.w, clipPath: clip }} />
  );
  const zyg = m(ba.lm_before[345]);
  const after = k > 0.5;
  return (
    <>
      <Window s={s} out={out} box={box}>
        {img("jan08/clinic/front_before.jpg")}
        {k > 0 && img("jan08/clinic/front_after_aligned.jpg", `inset(0 ${(1 - k) * 100}% 0 0)`)}
        {k > 0 && k < 1 && <div style={{ position: "absolute", top: 0, bottom: 0, left: `${k * 100}%`, width: 3, background: WHITE, boxShadow: "0 0 10px rgba(255,255,255,.7)" }} />}
      </Window>
      {frame > s + 7 && <Chip at={{ x: box.x + 18, y: box.y + 34 }} side="right" text={after ? "After" : "Before"}
        s={0.72 + 0.28 * quint(cl((frame - (after ? sweep + 8 : s + 7)) / 8))} o={cl((frame - s - 7) / 4) * (1 - cl((frame - out) / 7))} />}
      <RingW c={zyg} rx={92} ry={58} s={s + 14} out={out} />
      {frame > s + 22 && <Chip at={{ x: zyg.x + 100, y: zyg.y - 64 }} side="left" text="Cheekbone" s={0.72 + 0.28 * quint(cl((frame - s - 22) / 8))} o={cl((frame - s - 22) / 4) * (1 - cl((frame - out) / 7))} />}
    </>
  );
};

/* ---------------------------------------------------------------- captions ---------------------------------------------------------- */
export type Word = { w: string; f: number; f1: number; piece: string };
/** his words on the word: chunks of up to 4 words (split at punctuation or a pause), the spoken word full white, the rest 62 % */
export const Captions: React.FC<{ words: Word[]; end: number; ink?: [number, number][] }> = ({ words, end, ink = [] }) => {
  const frame = useCurrentFrame();
  if (frame >= end) return null;
  const chunks: Word[][] = [];
  let cur: Word[] = [];
  words.forEach((w, i) => {
    cur.push(w);
    const nx = words[i + 1];
    if (cur.length >= 4 || /[.,?!]$/.test(w.w) || !nx || nx.f - w.f1 > 8 || nx.piece !== w.piece) { chunks.push(cur); cur = []; }
  });
  const ch = chunks.find((c, i) => frame >= c[0].f && frame < (chunks[i + 1]?.[0].f ?? c[c.length - 1].f1 + 12));
  if (!ch || frame > ch[ch.length - 1].f1 + 18) return null;
  return (
    <div style={{ position: "absolute", left: M, right: M, top: CAP_T, textAlign: "center", font: `600 54px/1.15 ${FONT}`,
      ...(ink.some(([a, b]) => frame >= a && frame < b) ? { color: INK, textShadow: "none" } : { color: WHITE, textShadow: ON_FOOTAGE }) }}>
      {ch.map((w, i) => <span key={i} style={{ opacity: frame >= w.f ? 1 : 0.62, marginRight: "0.26em" }}>{w.w.replace(/[,]$/, "")}</span>)}
    </div>
  );
};

export { D, SAFE_T, INK };
