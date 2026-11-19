// Jan08ReelV3: the filler-fatigue reel, round 3 (client notes 2026-11-19, all three reels). Same cut, footage (bt709 tone map kept),
// titles-behind-him method, Flora plates and sound as Jan08ReelV2 (ReelV2.tsx: delivered, not edited), with:
//   1. no text, card, label, plate, caption or window over any face in any frame (measured: research/ostad/style/jan08/face_clear.py
//      on a footage-only render vs a graphics render of this composition, `mode` prop). Exceptions: titles behind him under his key,
//      the pen marks on the patient's face, faces inside the journal photos.
//   2. "His plan" and the result are full-bleed on her own photo (no window over his face), and the marks are a surgeon's: Hinderer's
//      lines, the cheekbone zone, the microcannula entry x, fanned cannula paths and the product beads per zone, with the amount in his
//      words in the legend under the photo (no circles, no brackets). Geometry from landmarks: planV3.ts (brand/scripts/jan08_plan.py).
//      The marks live inside the same transformed layer as the photo, so they cannot drift (measured: research/ostad/style/jan08/track_v3.py).
// mode: "full" (deliverable) | "footage" (footage, keyed him, b-roll, the photos, the cream room only) | "check" (full minus the exempt
// marks on her face). layoutV2: footage mode with V2's layout in the plan/result beats (talk under a window) and V2's assets (tone-mapped
// footage, webm keys), for the "before" numbers against the delivered v2 file.
import React, { createContext, useContext } from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { useElza } from "../Fonts";
import { EndCard } from "../components/EndCard";
import { NameCard } from "../components/NameCard";
import { card } from "../components/Ro";
import { Sfx } from "../components/Ro";
import { FloraPlate } from "../flora/FloraPlate";
import { Captions, Causes, Clip, ClipCard, enterF, Keyed, Room, type BA } from "./cards";
import { caps, disp, FONT, H, INK, M, MUTED, p, W, WHITE } from "./look";
import { PLAN, type Side } from "./planV3";
import type { Jan08V2Props, WebImg } from "./ReelV2";

export type Mode = "full" | "footage" | "check";
export type Jan08V3Props = Jan08V2Props & { mode?: Mode; layoutV2?: boolean };
const ModeCtx = createContext<Mode>("full");
const V2Ctx = createContext(false);
const TALK = (v2: boolean) => staticFile(v2 ? "jan08/tonemapped_v2/talk.mp4" : "jan08/talk.mp4");
const CLIP = (v2: boolean, f: string) => (v2 ? `jan08/tonemapped_v2/clinic/${f}` : `jan08/clinic/${f}`);
/** a graphic: hidden in the footage-only render */
const G: React.FC<{ children: React.ReactNode }> = ({ children }) => (useContext(ModeCtx) === "footage" ? null : <>{children}</>);
/** an exempt mark on the patient's face: only in the deliverable */
const Ex: React.FC<{ children: React.ReactNode }> = ({ children }) => (useContext(ModeCtx) === "full" ? <>{children}</> : null);

/** his key as alpha only: a second copy of the SAME raw talk.mp4 laid over, CSS-masked by the RVM alpha PNG for this frame
 *  (public/jan08/mask/<piece>/<j>.png, brand/scripts/jan08_masks.py). The pixels are the footage's own, so no colour seam. A hidden
 *  <Img> of the same mask holds the frame until the PNG is loaded. `place` scales/moves the whole layer (the keyed plates). */
type PieceT = { id: string; at: number; from: number };
type Place = { x: number; scale: number };
const box = (place?: Place): React.CSSProperties => {
  const sc = place?.scale ?? 1;
  return { position: "absolute", left: place?.x ?? 0, top: H - H * sc, width: W * sc, height: H * sc };
};
/** the raw talk.mp4 at this piece's frame, placed */
const TalkAt: React.FC<{ piece: PieceT; s: number; e: number; place?: Place }> = ({ piece, s, e, place }) => (
  <div style={box(place)}>
    <Sequence from={s} durationInFrames={e - s} layout="none">
      <OffthreadVideo src={TALK(false)} trimBefore={Math.round(piece.from * 24) + (s - piece.at)} muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </Sequence>
  </div>
);
/** his matte m (grey video, white = him; public/jan08/matte/<piece>.mp4, brand/scripts/jan08_mattes.py) on black, placed; on a placed
 *  (shrunk) key the right source edge is feathered over 140 source px (RULES: no straight source edge); `invert` gives 1 - m */
const MatteLayer: React.FC<{ piece: PieceT; s: number; e: number; place?: Place; invert?: boolean }> = ({ piece, s, e, place, invert }) => (
  <div style={{ position: "absolute", inset: 0, background: "#000", isolation: "isolate", filter: invert ? "invert(1)" : undefined }}>
    <div style={box(place)}>
      <Sequence from={s} durationInFrames={e - s} layout="none">
        <OffthreadVideo src={staticFile(`jan08/matte/${piece.id}.mp4`)} trimBefore={s - piece.at} muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      </Sequence>
      {place && <div style={{ position: "absolute", inset: 0, mixBlendMode: "multiply", background: `linear-gradient(90deg, #fff 0%, #fff ${100 - (140 / 1080) * 100}%, #000 100%)` }} />}
    </div>
  </div>
);
/** his key as ALPHA ONLY over the raw footage: out = under x (1 - m) + talk x m (CSS multiply, then plus-lighter), every layer a
 *  video or element Remotion waits for. Where m = 1 the pixels ARE the raw talk.mp4 pixels: no colour seam, no grade. `under` is
 *  what he stands in front of (his own footage + a title, or the cream room + a plate). */
const KeyComposite: React.FC<{ piece: PieceT; s: number; e: number; place?: Place; children: React.ReactNode }> = ({ piece, s, e, place, children }) => {
  const f = useCurrentFrame();
  const v2 = useContext(V2Ctx);
  if (f < s || f >= e) return null;
  if (v2) return <>{children}{place
    ? <Keyed src={`jan08/key_${piece.id}.webm`} s={s} dur={e - s} from={(s - piece.at) / 24} scale={place.scale} x={place.x} />
    : <Sequence from={s} durationInFrames={e - s} layout="none"><OffthreadVideo src={staticFile(`jan08/key_${piece.id}.webm`)} transparent trimBefore={s - piece.at} muted style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} /></Sequence>}</>;
  return (
    <div style={{ position: "absolute", inset: 0, isolation: "isolate" }}>
      <div style={{ position: "absolute", inset: 0, isolation: "isolate", background: "#000" }}>
        {children}
        <div style={{ position: "absolute", inset: 0, mixBlendMode: "multiply" }}><MatteLayer piece={piece} s={s} e={e} place={place} invert /></div>
      </div>
      <div style={{ position: "absolute", inset: 0, isolation: "isolate", background: "#000", mixBlendMode: "plus-lighter" }}>
        <TalkAt piece={piece} s={s} e={e} place={place} />
        <div style={{ position: "absolute", inset: 0, mixBlendMode: "multiply" }}><MatteLayer piece={piece} s={s} e={e} place={place} /></div>
      </div>
    </div>
  );
};

const SEC = { T: 12, HOLD: 60, OUT: 8 };
const L = SEC.T + SEC.HOLD + SEC.OUT;

const RoomTitle: React.FC<{ s: number; num: string; title: string; top?: number; px?: number }> = ({ s, num, title, top = 352, px = 118 }) => {
  const f = useCurrentFrame();
  const { T, HOLD, OUT } = SEC;
  if (f < s || f > s + T + HOLD + OUT) return null;
  const inK = p(f, s, 8, "arrive"), outK = p(f, s + T + HOLD, OUT, "exit");
  const typed = Math.round(title.length * Math.min(1, Math.max(0, (f - s - 2) / (T - 2))));
  const drift = (f - s) * 0.25;
  return (
    <div style={{ position: "absolute", left: M - 10 + drift, top, width: W - 2 * M + 40, opacity: 1 - outK, textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, opacity: inK }}>
        <span style={{ ...disp(48, INK, 500) }}>{num}</span>
        <span style={{ display: "block", height: 3, width: 150 * inK, background: INK, borderRadius: 2 }} />
      </div>
      <div style={{ ...disp(px, INK), marginTop: 10, textShadow: "0 1px 0 rgba(255,255,255,.35)" }}>{title.slice(0, typed)}<span style={{ opacity: 0 }}>{title.slice(typed)}</span></div>
    </div>
  );
};

const HookRoom: React.FC<{ s: number; strike: number; out: number }> = ({ s, strike, out }) => {
  const f = useCurrentFrame();
  if (f < s || f > out + 8) return null;
  const i = p(f, s, 8, "arrive"), o = p(f, out, 8, "exit"), k = p(f, strike + 1, 9, "sweep");
  return (
    <div style={{ position: "absolute", left: M - 10, top: 318, opacity: i * (1 - o), transform: `translateY(${(1 - i) * 14}px)` }}>
      <div style={{ ...caps(28, MUTED), marginBottom: 12 }}>Dr. Ariel Ostad on</div>
      <div style={{ position: "relative", ...disp(132, INK), whiteSpace: "nowrap" }}>
        Filler <span style={{ position: "relative" }}>fatigue
          {k > 0 && <svg width={460} height={60} style={{ position: "absolute", left: -6, top: 48, overflow: "visible" }}>
            <path d="M0,34 C120,22 280,30 450,18" stroke={INK} strokeWidth={9} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={`${k} 1`} />
          </svg>}
        </span>
      </div>
    </div>
  );
};

const WebCard: React.FC<{ img: WebImg; s: number; out: number; left: number; top: number; title: string; eyebrow: string; w?: number }> = ({ img, s, out, left, top, title, eyebrow, w = 440 }) => (
  <ClipCard s={s} out={out} left={left} top={top} w={w}
    c={{ src: `jan08/clinic/web/${img.file}`, img: true, caps: eyebrow, title, credit: `${img.authors_short}, ${img.journal_year}, ${img.license}`, pos: img.pos }} />
);

// the face-clear band: his face box (YuNet, +10 %) reaches y ~1305 in the talking shots (face_clear_v2.json), the captions start at
// 1594, so a card beside his talk lives in 1300..1580 as one low row (v2's cards at top 980-1010 sat on his chin)
const BAND = 1322;
const Caps17: React.FC<{ children: React.ReactNode }> = ({ children }) => <div style={{ font: `500 17px/1 ${FONT}`, letterSpacing: "0.13em", textTransform: "uppercase", color: MUTED }}>{children}</div>;

/** the three causes in one low card; the real overfilled case sits inside it on "too much" (v2 put it over his face) */
const CausesV3: React.FC<{ s: number; out: number; rows: { text: string; s: number }[]; img?: WebImg; imgS: number }> = ({ s, out, rows, img, imgS }) => {
  const f = useCurrentFrame();
  if (f < s || f > out + 8) return null;
  const showImg = img && f >= imgS;
  return (
    <div style={{ ...card(26), left: M - 30, top: BAND, width: W - 2 * M + 60, height: 262, padding: "20px 32px", ...enterF(f, s, out) }}>
      <Caps17>Where the bad results come from</Caps17>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 14, ...enterF(f, r.s + 1, 1e9) }}>
          <span style={{ ...disp(30, MUTED, 500) }}>{i + 1}</span>
          <span style={{ ...disp(48, INK) }}>{r.text}</span>
        </div>
      ))}
      {showImg && (
        <div style={{ position: "absolute", right: 14, top: 14, width: 200, ...enterF(f, imgS, 1e9) }}>
          <div style={{ width: 200, height: 206, borderRadius: 16, overflow: "hidden" }}>
            <Img src={staticFile(`jan08/clinic/web/${img!.file}`)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: img!.pos ?? "50% 50%" }} />
          </div>
          <div style={{ font: `500 13px/1.25 ${FONT}`, color: MUTED, marginTop: 6, textAlign: "right" }}>A real case · {img!.authors_short}, {img!.journal_year}, {img!.license}</div>
        </div>
      )}
    </div>
  );
};

/** a real photo or his clip in one low row card: media left, caps + title (+ depth or credit) right */
const RowCard: React.FC<{ s: number; out: number; src: string; img?: boolean; from?: number; pos?: string; caps: string; title: string; note?: string; credit?: string }> = (c) => {
  const f = useCurrentFrame();
  if (f < c.s || f > c.out + 8) return null;
  const t = (f - c.s) / 24;
  return (
    <div style={{ ...card(26), left: M - 30, top: BAND, width: W - 2 * M + 60, height: 252, display: "flex", gap: 26, padding: 12, ...enterF(f, c.s, c.out) }}>
      <div style={{ width: 300, height: 228, borderRadius: 18, overflow: "hidden", background: "#000", flex: "none" }}>
        {c.img ? <Img src={staticFile(c.src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: c.pos ?? "50% 50%", transform: `scale(${1.04 + 0.012 * t})` }} />
          : <Sequence from={c.s} layout="none"><OffthreadVideo src={staticFile(c.src)} trimBefore={Math.round((c.from ?? 0) * 24)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} /></Sequence>}
      </div>
      <div style={{ paddingTop: 22, flex: 1 }}>
        <Caps17>{c.caps}</Caps17>
        <div style={{ font: `600 46px/1.08 ${FONT}`, letterSpacing: "-0.01em", color: INK, marginTop: 12 }}>{c.title}</div>
        {c.note && <div style={{ font: `500 26px/1.2 ${FONT}`, color: MUTED, marginTop: 12 }}>{c.note}</div>}
        {c.credit && <div style={{ font: `500 15px/1.25 ${FONT}`, color: MUTED, marginTop: 16 }}>{c.credit}</div>}
      </div>
    </div>
  );
};

/* ------------------------------------------------- the photo, full-bleed, with the surgeon's marks locked to it ----------------- */
// her frontal photo (3024 x 4032) at 0.56 from (560, 836): her YuNet face box +10 % (photo y 836..3114) fills 0..1276, so the
// legend under the photo panel (0..PH) starts below it (at 0.6 the box reached 1395 and sat under the legend: face_clear)
const K = 0.56, X0 = 560, Y0 = 836, PH = 1290;
type P2 = readonly [number, number];
const S = (q: P2) => ({ x: (q[0] - X0) * K, y: (q[1] - Y0) * K });
const seg = (a: P2, b: P2) => { const A = S(a), B = S(b); return `M${A.x.toFixed(1)},${A.y.toFixed(1)} L${B.x.toFixed(1)},${B.y.toFixed(1)}`; };
const SH = "drop-shadow(0 0 2px rgba(0,0,0,.55)) drop-shadow(0 1px 3px rgba(0,0,0,.35))";

const Draw: React.FC<{ d: string; s: number; len?: number; w: number; dash?: string; op?: number }> = ({ d, s, len = 10, w, dash, op = 1 }) => {
  const f = useCurrentFrame();
  const k = p(f, s, len, "sweep");
  if (k <= 0) return null;
  return dash
    ? <path d={d} stroke={WHITE} strokeWidth={w} fill="none" strokeDasharray={dash} strokeLinecap="round" opacity={op * k} />
    : <path d={d} stroke={WHITE} strokeWidth={w} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={`${k} 1`} opacity={op} />;
};
const XMark: React.FC<{ c: P2; s: number; r: number; w: number }> = ({ c, s, r, w }) => {
  const f = useCurrentFrame();
  const k = p(f, s, 6, "sweep");
  if (k <= 0) return null;
  const { x, y } = S(c);
  return <path d={`M${x - r},${y - r} L${x + r},${y + r} M${x + r},${y - r} L${x - r},${y + r}`} stroke={WHITE} strokeWidth={w} strokeLinecap="round" opacity={k} />;
};
const Bead: React.FC<{ c: P2; s: number; r: number }> = ({ c, s, r }) => {
  const f = useCurrentFrame();
  const k = p(f, s, 6, "arrive");
  if (k <= 0) return null;
  const { x, y } = S(c);
  return <circle cx={x} cy={y} r={r * (0.5 + 0.5 * k)} fill={WHITE} opacity={k} />;
};

/** the cheekbone: Hinderer's crossing, the zone (outline + hatch), the entry x, three fanned cannula paths, the product beads */
const CheekMarks: React.FC<{ sd: Side; s: number; id: string; fill?: number }> = ({ sd, s, id, fill }) => {
  const f = useCurrentFrame();
  const zone = sd.zone.map((q) => S(q as P2));
  const zd = "M" + zone.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" L") + " Z";
  const hk = fill === undefined ? 0 : p(f, fill, 12, "arrive");
  const bx = { x0: Math.min(...zone.map((q) => q.x)), x1: Math.max(...zone.map((q) => q.x)), y0: Math.min(...zone.map((q) => q.y)), y1: Math.max(...zone.map((q) => q.y)) };
  const hatch: string[] = [];
  for (let t = bx.x0 - (bx.y1 - bx.y0); t < bx.x1; t += 9) hatch.push(`M${t},${bx.y1} L${t + (bx.y1 - bx.y0)},${bx.y0}`);
  return (
    <g>
      <clipPath id={`z${id}`}><path d={zd} /></clipPath>
      {sd.hinderer.map(([a, b], i) => <Draw key={i} d={seg(a as P2, b as P2)} s={s - 10 + 3 * i} w={2} dash="7 7" op={0.8} />)}
      <Draw d={zd} s={s + 2} len={12} w={3} />
      {hk > 0 && <path d={hatch.join(" ")} stroke={WHITE} strokeWidth={1.6} opacity={0.55 * hk} clipPath={`url(#z${id})`} />}
      <XMark c={sd.entry as P2} s={s + 12} r={10} w={4} />
      {sd.paths.map(([a, b], i) => <Draw key={i} d={seg(a as P2, b as P2)} s={s + 15 + 3 * i} len={9} w={3} />)}
      {sd.beads.map((q, i) => <Bead key={i} c={q as P2} s={s + 22 + 2 * (i % 3) + Math.floor(i / 3)} r={5.5} />)}
    </g>
  );
};
/** a minor zone: entry x, one short cannula path, 1-2 small beads */
const MinorMarks: React.FC<{ z: Side["laugh"]; s: number }> = ({ z, s }) => (
  <g>
    <XMark c={z.entry as P2} s={s} r={7} w={3} />
    <Draw d={seg(z.path[0] as P2, z.path[1] as P2)} s={s + 3} len={9} w={2.4} />
    {z.beads.map((q, i) => <Bead key={i} c={q as P2} s={s + 10 + 2 * i} r={4} />)}
  </g>
);

/** the photo layer: everything inside one transformed div (fade + a slow push about her face), so the marks cannot drift */
const PhotoPanel: React.FC<{ s: number; out: number; children: React.ReactNode; marks?: React.ReactNode }> = ({ s, out, children, marks }) => {
  const f = useCurrentFrame();
  if (f < s || f > out + 8) return null;
  const i = p(f, s, 8, "arrive"), o = p(f, out, 8, "exit");
  const z = 1 + 0.025 * Math.min(1, (f - s) / Math.max(1, out - s));
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: W, height: PH, overflow: "hidden", borderRadius: "0 0 34px 34px", opacity: i * (1 - o) }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${z})`, transformOrigin: `${540}px ${663}px` }}>
        {children}
        {marks && <svg width={W} height={PH} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", filter: SH }}>{marks}</svg>}
      </div>
    </div>
  );
};
const photo = (src: string, clip?: string) => (
  <Img src={staticFile(src)} style={{ position: "absolute", left: -X0 * K, top: -Y0 * K, width: 3024 * K, height: 4032 * K, clipPath: clip }} />
);

/** the legend under the photo: the symbols once, then one row per zone he names (amount in his words), lit on the word */
const KeyIcon: React.FC<{ big?: boolean }> = ({ big }) => (
  <svg width={92} height={30} viewBox="0 0 92 30" style={{ flex: "none" }}>
    <path d="M4,7 L16,19 M16,7 L4,19" stroke={INK} strokeWidth={big ? 3.5 : 2.6} strokeLinecap="round" />
    <path d="M14,13 L88,13" stroke={INK} strokeWidth={big ? 3 : 2.2} strokeLinecap="round" />
    {(big ? [54, 68, 82] : [70, 84]).map((x) => <circle key={x} cx={x} cy={13} r={big ? 5.5 : 4} fill={INK} />)}
  </svg>
);
const Legend: React.FC<{ s: number; out: number; rows: { text: string; amt: string; s: number; big?: boolean }[] }> = ({ s, out, rows }) => {
  const f = useCurrentFrame();
  if (f < s || f > out + 8) return null;
  return (
    <div style={{ position: "absolute", left: M - 20, top: PH + 22, width: W - 2 * M + 40, ...enterF(f, s, out) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ ...caps(22, MUTED) }}>His plan · microcannula</span>
        <span style={{ font: `500 19px/1 ${FONT}`, color: MUTED }}>✕ entry · line: cannula path · dot: filler</span>
      </div>
      {rows.map((r, i) => {
        const k = p(f, r.s, 8, "arrive");
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 9, opacity: 0.28 + 0.72 * k }}>
            <KeyIcon big={r.big} />
            <span style={{ ...disp(37, INK, 600) }}>{r.text}</span>
            <span style={{ ...disp(30, MUTED, 500), marginLeft: "auto" }}>{r.amt}</span>
          </div>
        );
      })}
    </div>
  );
};

export const Jan08ReelV3: React.FC<Jan08V3Props> = (P) => {
  useElza();
  const mode: Mode = P.mode ?? "full";
  const c = (k: string) => { if (!(k in P.cues)) throw new Error(`cue ${k} missing`); return P.cues[k]; };
  const pc = (id: string) => P.pieces.find((x) => x.id === id)!;
  const end = P.durationInFrames;
  void (P.ba!.front as BA);
  const FR = (id: string) => ({ id, n: P.frames[id].n, aspect: P.frames[id].aspect });
  const Kd = (id: string, s: number, e: number, under: React.ReactNode) => <KeyComposite piece={pc(id)} s={s} e={e} place={{ x: -250, scale: 0.8 }}>{under}</KeyComposite>;
  const pick = (f: string, pos: string) => { const x = (P.web ?? []).find((q) => q.file === f); return x ? { ...x, pos } : undefined; };
  const web1 = [pick("s1_castelanich2025_fig1_patient1_pre_crop.jpg", "50% 68%"), pick("s1_castelanich2025_fig1_patient2_pre_crop.jpg", "50% 62%")].filter(Boolean) as WebImg[];
  const web2 = [pick("s2_jmir2024_fig2_panelA_crop.jpg", "60% 50%")].filter(Boolean) as WebImg[];

  const S1 = 78, S2 = c("start:aging"), S3 = c("start:method"), S4 = c("great") + 9;
  const T = {
    belief: [S1 + L, c("start:cause")], aging: [S2 + L, c("aging2")], bank: [c("aging2"), c("end:sags")],
    broll1: [S3 + L, S3 + L + 57], broll2: [S3 + L + 57, c("micro")], clip: [c("micro"), c("start:cheekbones") + 10],
    cheek: [c("start:cheekbones") + 10, c("falls")], broll3: [c("falls"), S4], lip: [S4 + L, c("start:approach")],
    map: [c("start:approach"), c("golf") - 12], pillow: [c("golf") - 12, c("awkward") + 11], ba: [c("awkward") + 11, c("start:close") - 2],
  } as const;
  const Sec = (s: number, num: string, title: string, piece: string, px?: number) => <>
    <KeyComposite piece={pc(piece)} s={s} e={s + L + 1}>
      <TalkAt piece={pc(piece)} s={s} e={s + L + 1} />
      <G><RoomTitle s={s} num={num} title={title} px={px} /></G>
    </KeyComposite>
  </>;
  const cheek = c("cheekbones2"), sweep = c("address") + 6;
  const v2 = !!P.layoutV2 && mode === "footage";
  const C = (f: string) => CLIP(v2, f);
  const capsInk = [T.cheek, T.lip, T.pillow, T.map, T.ba].map(([a, b]) => [a, b] as [number, number]);

  return (
    <ModeCtx.Provider value={mode}><V2Ctx.Provider value={v2}>
      <AbsoluteFill style={{ background: "#000" }}>
        {P.pieces.map((x) => (
          <Sequence key={x.id} from={x.at} durationInFrames={x.dur} layout="none">
            <OffthreadVideo src={TALK(v2)} trimBefore={Math.round(x.from * 24)} muted style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover" }} />
          </Sequence>
        ))}
        {mode === "full" && <Audio src={staticFile("jan08/voice.wav")} />}

        <KeyComposite piece={pc("hook")} s={0} e={pc("hook").dur}>
          <TalkAt piece={pc("hook")} s={0} e={pc("hook").dur} />
          <G><HookRoom s={2} strike={c("fatigue0")} out={pc("hook").dur - 4} /></G>
        </KeyComposite>
        {Sec(S1, "01", "The belief", "belief")}

        {Kd("belief", T.belief[0], T.belief[1], <>
        <Room s={T.belief[0]} dur={T.belief[1] - T.belief[0]} />
        <G><FloraPlate {...FR("J1")} s={T.belief[0]} out={T.belief[1] - 7} x={450} y={250} w={590} h={1000} eyebrow="The belief" title="Filler stretches skin?"
          map={[[T.belief[0], 0], [c("stretch") - 30, 30], [c("stretch"), 60], [c("stretch") + 30, 78], [c("overfilled"), 84], [c("overfilled") + 30, 96], [c("migrate0"), 102], [T.belief[1] - 7, 128]]}
          labels={[{ text: "Stretch?", x: 0.06, y: 0.2, s: c("stretch") }, { text: "Overfilled?", x: 0.46, y: 0.67, s: c("overfilled"), anchor: "middle" },
            { text: "Migrates?", x: 0.97, y: 0.88, s: c("migrate0"), anchor: "end" }]} /></G>
        </>)}

        <G><CausesV3 s={c("improper") - 12} out={c("end:cause") - 4} img={web1[0]} imgS={c("toomuch") + 2}
          rows={[{ text: "Improper injections", s: c("improper") }, { text: "Untrained injectors", s: c("trained") }, { text: "Overfilling", s: c("toomuch") }]} /></G>

        {Sec(S2, "02", "What aging does", "aging", 108)}
        {Kd("aging", T.aging[0], T.aging[1], <>
        <Room s={T.aging[0]} dur={T.aging[1] - T.aging[0]} />
        <G><FloraPlate {...FR("J2")} s={T.aging[0]} out={T.aging[1] - 7} x={450} y={250} w={590} h={1040} titlePx={38} eyebrow="What aging does" title="Volume and support are lost"
          map={[[T.aging[0], 0], [c("volume"), 24], [c("volume") + 36, 54], [c("fatty"), 60], [c("fatty") + 40, 84]]}
          labels={[{ text: "Volume", x: 0.64, y: 0.6, s: c("volume"), anchor: "middle" }, { text: "Fat", x: 0.72, y: 0.79, s: c("fatty"), anchor: "middle" },
            { text: "Support", x: 0.33, y: 0.46, s: c("support"), anchor: "middle" }]} /></G>
        </>)}

        <G><RowCard s={T.bank[0]} out={T.bank[1] - 8} src="jan08/clinic/bank_midcheek.jpg" img pos="50% 60%" caps="Volume loss · a real example" title="We lose volume"
          credit="Hong GW et al., JPRAS Open 2026, CC BY 4.0" /></G>

        {Sec(S3, "03", "On the cheekbones", "method", 108)}
        <Clip src={C("IMG_3453.mp4")} from={14} s={T.broll1[0]} dur={T.broll1[1] - T.broll1[0]} />
        <Clip src={C("IMG_3453.mp4")} from={27} s={T.broll2[0]} dur={T.broll2[1] - T.broll2[0]} />
        <G><Sequence from={T.broll1[0] + 4} durationInFrames={100} layout="none"><NameCard /></Sequence></G>
        <G><RowCard s={T.clip[0]} out={T.clip[1] - 8} src={C("IMG_3470.mp4")} from={13} caps="His method" title="Microcannula" note="Filler placed on the cheekbone" /></G>
        <Room s={T.cheek[0]} dur={T.cheek[1] - T.cheek[0]} />
        <G><FloraPlate {...FR("J3")} s={T.cheek[0]} out={T.cheek[1] - 7} x={60} y={250} w={960} h={1250} eyebrow="His method" title="On the cheekbone, by microcannula"
          map={[[T.cheek[0], 0], [c("cheekbones"), 14], [c("cheekbones") + 36, 63], [c("cheekbones") + 60, 92], [c("lifting"), 100], [T.cheek[1] - 7, 143]]}
          zoom={{ keys: [[c("cheekbones"), 1.25], [c("diminish"), 1]], ox: 0.42, oy: 0.5 }}
          labels={[{ text: "Cheekbone", x: 0.34, y: 0.47, s: c("cheekbones") + 36, out: c("diminish") - 2, anchor: "end" }, { text: "Microcannula", x: 0.66, y: 0.84, s: c("cheekbones") + 10 },
            { text: "Lift", x: 0.56, y: 0.5, s: c("lifting"), out: c("diminish") - 2 }, { text: "Without support it falls", x: 0.5, y: 0.93, s: c("diminish"), anchor: "middle" }]} /></G>
        <Clip src={C("IMG_3470.mp4")} from={18} s={T.broll3[0]} dur={T.broll3[1] - T.broll3[0]} />

        {Sec(S4, "04", "Migration", "cheekbones", 124)}
        <Room s={T.lip[0]} dur={T.lip[1] - T.lip[0]} />
        <G>{P.frames.J4 && <FloraPlate {...FR("J4")} s={T.lip[0]} out={T.lip[1] - 7} x={60} y={250} w={960} h={1250} eyebrow="Migration" title="Wrong filler, or too much in a lip"
          map={[[T.lip[0], 0], [T.lip[0] + 15, 6], [c("lip"), 30], [c("lip") + 24, 60], [T.lip[1] - 7, 72]]}
          labels={[{ text: "Stays on the bone", x: 0.76, y: 0.32, s: T.lip[0] + 10, anchor: "middle" }, { text: "Too much: spreads", x: 0.03, y: 0.78, s: c("lip") + 8 }]} />}
        {web2[0] && <WebCard img={web2[0]} s={c("lip") + 30} out={T.lip[1] - 6} left={W - M - 400} top={1080} w={400} eyebrow="Migration · a real case" title="Lip filler spread" />}</G>

        {/* B14 his plan, full-bleed on her own photo: surgeon's marks locked to it, the legend under it */}
        {!v2 && <>
          <Room s={T.map[0]} dur={T.map[1] - T.map[0]} />
          <PhotoPanel s={T.map[0]} out={T.map[1] - 4} marks={<Ex>
            {(["L", "R"] as const).map((k, i) => <CheekMarks key={k} id={"m" + k} sd={PLAN[k]} s={cheek + 4 * i} fill={c("midcheek")} />)}
            {(["L", "R"] as const).map((k, i) => <MinorMarks key={"l" + k} z={PLAN[k].laugh} s={c("laugh") + 3 * i} />)}
            {(["L", "R"] as const).map((k, i) => <MinorMarks key={"m" + k} z={PLAN[k].mar} s={c("marionette") + 3 * i} />)}
            {(["L", "R"] as const).map((k, i) => <MinorMarks key={"d" + k} z={PLAN[k].lid} s={c("lids") + 3 * i} />)}
          </Ex>}>{photo("jan08/clinic/front_before.jpg")}</PhotoPanel>
          <G><Legend s={T.map[0] + 6} out={T.map[1] - 4} rows={[
            { text: "Cheekbones", amt: "the most", s: cheek, big: true }, { text: "Laugh lines", amt: "minimal", s: c("laugh") },
            { text: "Marionette lines", amt: "minimal", s: c("marionette") }, { text: "Lower lids", amt: "a little", s: c("lids") }]} /></G>
        </>}

        <Room s={T.pillow[0]} dur={T.pillow[1] - T.pillow[0]} />
        <G><FloraPlate {...FR("J5")} s={T.pillow[0]} out={T.pillow[1] - 7} x={60} y={250} w={960} h={1250} eyebrow="Not this" title="Golf-size filling, mid cheek"
          map={[[T.pillow[0], 0], [c("golf"), 30], [c("golf") + 50, 70], [c("awkward"), 86]]} strike={{ x: 0.58, y: 0.527, r: 0.12, s: c("awkward") }}
          labels={[{ text: "Looks awkward", x: 0.3, y: 0.9, s: c("awkward"), anchor: "middle" }]} />
        {web1[1] && <WebCard img={web1[1]} s={c("awkward") - 30} out={T.pillow[1] - 6} left={W - M - 360} top={1060} w={360} eyebrow="A real case" title="Overfilled cheeks" />}</G>

        {/* B16 the result, full-bleed: before -> right after (a clean wipe, no line over her face), his cheekbone marks locked to both */}
        {!v2 && <>
          <Room s={T.ba[0]} dur={T.ba[1] - T.ba[0] + 8} />
          <BAPanel s={T.ba[0]} out={T.ba[1]} sweep={sweep} />
        </>}

        <G><Room s={end} dur={P.tail} />
          <Sequence from={end} durationInFrames={P.tail} layout="none"><EndCard /></Sequence>
          <Captions words={P.words} end={end} ink={capsInk} /></G>

        {mode === "full" && <>
          {[S1, S2, S3, S4].map((f) => <Sfx key={"c" + f} at={(f + 1) / 24} name="exo_chapter" gain={0.3} />)}
          {[T.belief[0], T.aging[0], T.cheek[0], T.lip[0], T.pillow[0], T.ba[0]].map((f, i) => <Sfx key={"k" + i} at={(f + 1) / 24} name="exo_card" gain={0.22} />)}
        </>}
      </AbsoluteFill>
    </V2Ctx.Provider></ModeCtx.Provider>
  );
};

const BAPanel: React.FC<{ s: number; out: number; sweep: number }> = ({ s, out, sweep }) => {
  const f = useCurrentFrame();
  const k = p(f, sweep, 16, "sweep");
  const after = k >= 1;
  return (
    <>
      <PhotoPanel s={s} out={out} marks={<Ex>{(["L", "R"] as const).map((q, i) => <CheekMarks key={q} id={"b" + q} sd={PLAN[q]} s={s + 12 + 4 * i} />)}</Ex>}>
        {photo("jan08/clinic/front_before.jpg")}
        {k > 0 && photo("jan08/clinic/front_after_aligned.jpg", `inset(0 ${(1 - k) * 100}% 0 0)`)}
      </PhotoPanel>
      <G>{f >= s && f <= out + 8 && (
        <div style={{ position: "absolute", left: M - 20, top: PH + 24, width: W - 2 * M + 40, ...enterF(f, s + 4, out) }}>
          <div style={{ ...caps(22, MUTED) }}>The same patient, the same day</div>
          <div style={{ display: "flex", gap: 26, alignItems: "baseline", marginTop: 14 }}>
            <span style={{ ...disp(56, after ? MUTED : INK, 600) }}>Before</span>
            <span style={{ ...disp(40, MUTED, 500) }}>→</span>
            <span style={{ ...disp(56, after ? INK : MUTED, 600) }}>Right after</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 18 }}>
            <KeyIcon big /><span style={{ ...disp(30, INK, 500) }}>Filler on the cheekbones, by microcannula</span>
          </div>
          <div style={{ font: `500 19px/1.3 ${FONT}`, color: MUTED, marginTop: 14 }}>Patient of Dr. Ostad. Individual results vary.</div>
        </div>
      )}</G>
    </>
  );
};

export { card, Img };
