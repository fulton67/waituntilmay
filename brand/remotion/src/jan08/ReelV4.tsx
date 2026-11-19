// Jan08ReelV4: the filler-fatigue reel, round 4 (Naim's notes on v3). Copied from ReelV3.tsx (delivered, not edited); every start, end,
// string, plate map, label, layout and SFX now comes from the reel timeline brand/remotion/timelines/jan08.json (schema:
// src/timeline/timeline.ts), the transcript from public/jan08/props_v4.json (research/ostad/style/jan08/cut_v4.json, brand/scripts/jan08_v4.py).
// Changes from v3:
//   - colour: every OffthreadVideo toneMapped={false} (Remotion's default HDR tone map was the "weird filter"; the render now matches a
//     plain decode of the raw clip)
//   - the ending: the reel ends on his completed sentence "I really think fillers are here to stay." inside its measured pause (v3's
//     'close' piece ran on into "I have my approach" with no pause)
//   - no strike anywhere: the hook dims "Filler fatigue" and lights the contrast line under it; J5 has no X ("Not this", paired with
//     the result's "This · an example of his approach")
//   - every pop-up holds >= 2 s (the lip case, "Migrates?" via the J1 cutaway, "Overfilling", "Looks awkward", "Without support it falls")
//   - the result is labelled as an example of his approach, not her "filler fatigue"
//   - the landmark face plan (surgeon's marks) is unchanged
// mode: "full" (deliverable) | "footage" (footage, keyed him, b-roll, the photos, the cream room only) | "check" (full minus the exempt
// marks on her face), for research/ostad/style/jan08/face_clear.py and track_v3.py.
import React, { createContext, useContext } from "react";
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { useElza } from "../Fonts";
import { EndCard } from "../components/EndCard";
import { NameCard } from "../components/NameCard";
import { card } from "../components/Ro";
import { Sfx } from "../components/Ro";
import { FloraPlate } from "../flora/FloraPlate";
import { beat, event, labels, plateMap, resolve, sfxHits, span, type Anchor, type Beat, type Timeline } from "../timeline/timeline";
import TL0 from "../../timelines/jan08.json";
import { Captions, Clip, ClipCard, enterF, Room } from "./cards";
import { caps, disp, FONT, H, INK, M, MUTED, p, W, WHITE } from "./look";
import { PLAN, type Side } from "./planV3";
import type { Jan08V2Props, WebImg } from "./ReelV2";

export type Mode = "full" | "footage" | "check";
// pass (brand/scripts/reel.py --hdr, REELS.md "HDR master"): one layer of the reel on a transparent ground, without the footage:
// "under" = what sits behind him inside a key (wall titles, the cream room and plate he stands in front of) | "matte" = his matte, white
// on black, placed and feathered as the key places it | "over" = every other graphic | "media" = the clips inside cards.
// Unset = the normal reel, unchanged.
export type Pass = "under" | "matte" | "over" | "media" | "frost"; // frost = white where a card has a backdrop blur (the frosted glass)
let PASS: Pass | undefined;
// at render an OffthreadVideo is an <img> served by Remotion's frame proxy: that is how a pass tells the card clips from the graphics
const HIDE_CLIPS = `img[src*="/proxy?src="]{visibility:hidden !important}`;
const PASS_CSS: Record<Pass, string> = { under: HIDE_CLIPS, over: HIDE_CLIPS, matte: "",
  media: `body *{visibility:hidden !important} body img[src*="/proxy?src="]{visibility:visible !important}`,
  frost: `body *{visibility:hidden !important} body [style*="backdrop-filter"]{visibility:visible !important;background:#fff !important;box-shadow:none !important;border-color:#fff !important}` };
export type Jan08V4Props = Jan08V2Props & { mode?: Mode; timeline?: Timeline; pass?: Pass };
const ModeCtx = createContext<Mode>("full");
const TALK = staticFile("jan08/talk.mp4");
/** a graphic: hidden in the footage-only render */
const G: React.FC<{ children: React.ReactNode }> = ({ children }) => (useContext(ModeCtx) === "footage" || PASS === "matte" ? null : <>{children}</>);
/** an exempt mark on the patient's face: only in the deliverable */
const Ex: React.FC<{ children: React.ReactNode }> = ({ children }) => (useContext(ModeCtx) === "full" ? <>{children}</> : null);
/** shown only before frame e (a hard cut, no exit fade) */
const Until: React.FC<{ e: number; children: React.ReactNode }> = ({ e, children }) => (useCurrentFrame() < e ? <>{children}</> : null);

type PieceT = { id: string; at: number; from: number; dur: number };
type Place = { x: number; scale: number };
const box = (place?: Place): React.CSSProperties => {
  const sc = place?.scale ?? 1;
  return { position: "absolute", left: place?.x ?? 0, top: H - H * sc, width: W * sc, height: H * sc };
};
/** the raw talk.mp4 at this piece's frame, placed */
const TalkAt: React.FC<{ piece: PieceT; s: number; e: number; place?: Place }> = ({ piece, s, e, place }) => PASS ? null : (
  <div style={box(place)}>
    <Sequence from={s} durationInFrames={e - s} layout="none">
      <OffthreadVideo src={TALK} toneMapped={false} trimBefore={Math.round(piece.from * 24) + (s - piece.at)} muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </Sequence>
  </div>
);
/** his matte m (grey video, white = him; public/jan08/matte/<piece>.mp4) on black, placed; a placed key's right edge feathered */
const MatteLayer: React.FC<{ piece: PieceT; s: number; e: number; place?: Place; invert?: boolean }> = ({ piece, s, e, place, invert }) => (
  <div style={{ position: "absolute", inset: 0, background: "#000", isolation: "isolate", filter: invert ? "invert(1)" : undefined }}>
    <div style={box(place)}>
      <Sequence from={s} durationInFrames={e - s} layout="none">
        <OffthreadVideo src={staticFile(`jan08/matte/${piece.id}.mp4`)} toneMapped={false} trimBefore={s - piece.at} muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      </Sequence>
      {place && <div style={{ position: "absolute", inset: 0, mixBlendMode: "multiply", background: `linear-gradient(90deg, #fff 0%, #fff ${100 - (140 / 1080) * 100}%, #000 100%)` }} />}
    </div>
  </div>
);
/** his key as ALPHA ONLY over the raw footage: out = under x (1 - m) + talk x m (multiply, then plus-lighter) */
const KeyComposite: React.FC<{ piece: PieceT; s: number; e: number; place?: Place; children: React.ReactNode }> = ({ piece, s, e: e0, place, children }) => {
  const f = useCurrentFrame();
  // unmount guard: the matte (public/jan08/matte/<piece>.mp4) is exactly the piece long, so the layer never outlives it (an
  // OffthreadVideo past its last frame holds that frame: a frozen key over moving footage, the under-eye v5 glitch)
  const e = Math.min(e0, piece.at + piece.dur);
  if (f < s || f >= e) return null;
  if (PASS === "under") return <div style={{ position: "absolute", inset: 0, visibility: "visible" }}>{children}</div>;
  if (PASS === "matte") return <div style={{ position: "absolute", inset: 0, visibility: "visible" }}><MatteLayer piece={piece} s={s} e={e} place={place} /></div>;
  if (PASS) return null;
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

/** the hook, no strike (Naim round 3): "Filler fatigue" in ink; on his word "fatigue" ("I don't really believe in filler fatigue") the
 *  term dims to the muted grey and the contrast line lights under it: the belief, dimmed, against what he finds instead */
const lerp = (a: string, b: string, k: number) => {
  const h = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const A = h(a), B = h(b);
  return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * k)).join(",")})`;
};
const HookRoom: React.FC<{ s: number; dim: number; out: number; top: number; t: Record<string, unknown> }> = ({ s, dim, out, top, t }) => {
  const f = useCurrentFrame();
  if (f < s || f > out + 8) return null;
  const i = p(f, s, 8, "arrive"), o = p(f, out, 8, "exit"), k = p(f, dim + 1, 10, "arrive"), k2 = p(f, dim + 3, 10, "arrive");
  return (
    <div style={{ position: "absolute", left: M - 10, top, opacity: i * (1 - o), transform: `translateY(${(1 - i) * 14}px)` }}>
      <div style={{ ...caps(28, MUTED), marginBottom: 12 }}>{String(t.eyebrow)}</div>
      <div style={{ ...disp(132, lerp(INK, MUTED, 0.62 * k)), whiteSpace: "nowrap" }}>{String(t.title)}</div>
      <div style={{ marginTop: 26, opacity: k2, transform: `translateY(${(1 - k2) * 12}px)` }}>
        <div style={{ ...caps(24, MUTED) }}>{String(t.pairCaps)}</div>
        <div style={{ ...disp(70, INK), marginTop: 10, whiteSpace: "nowrap" }}>{String(t.pair)}</div>
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
          : <Sequence from={c.s} layout="none"><OffthreadVideo src={staticFile(c.src)} toneMapped={false} trimBefore={Math.round((c.from ?? 0) * 24)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} /></Sequence>}
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
const Legend: React.FC<{ s: number; out: number; caption: string; keyText: string; rows: { text: string; amt: string; s: number; big?: boolean }[] }> = ({ s, out, caption, keyText, rows }) => {
  const f = useCurrentFrame();
  if (f < s || f > out + 8) return null;
  return (
    <div style={{ position: "absolute", left: M - 20, top: PH + 22, width: W - 2 * M + 40, ...enterF(f, s, out) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ ...caps(22, MUTED) }}>{caption}</span>
        <span style={{ font: `500 19px/1 ${FONT}`, color: MUTED }}>{keyText}</span>
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

export const Jan08ReelV4: React.FC<Jan08V4Props> = (P) => {
  useElza();
  const mode: Mode = P.mode ?? "full";
  PASS = P.pass;
  const tl = (P.timeline ?? (TL0 as unknown as Timeline));
  const R = (a: Anchor) => resolve(a, tl, P);
  const sp = (id: string) => span(tl, id, P);
  const b = (id: string) => beat(tl, id);
  const tx = (id: string) => (b(id).text ?? {}) as Record<string, any>;
  const lay = (id: string) => (b(id).layout ?? {}) as Record<string, any>;
  const pc = (id: string) => P.pieces.find((x) => x.id === id)!;
  const end = P.durationInFrames;
  const FR = (id: string) => ({ id, n: P.frames[id].n, aspect: P.frames[id].aspect });
  const web = (f: string, pos?: string) => { const x = (P.web ?? []).find((q) => q.file === f); return x ? { ...x, pos } : undefined; };

  /** a Flora plate beat; layout.keyed: he stands in front (alpha key, placed) over the cream room; out = end - 7 unless `cut` */
  const Plate = (id: string, cut = false) => {
    const B = b(id), [s, e] = sp(id), L = lay(id), T = tx(id);
    const zoom = B.plate?.zoom as { keys: [Anchor, number][]; ox: number; oy: number } | undefined;
    const plate = <G><FloraPlate {...FR(B.plate!.id)} s={s} out={cut ? e + 8 : e - 7} x={L.x} y={L.y} w={L.w} h={L.h} eyebrow={T.eyebrow} title={T.title} titlePx={T.titlePx}
      map={plateMap(B, tl, P)} labels={labels(B, tl, P) as any} zoom={zoom && { keys: zoom.keys.map(([a, z]) => [R(a), z] as [number, number]), ox: zoom.ox, oy: zoom.oy }} /></G>;
    const under = <><Room s={s} dur={e - s} />{cut ? <Until e={e}>{plate}</Until> : plate}</>;
    return L.keyed ? <KeyComposite key={id} piece={pc(L.keyed)} s={s} e={e} place={L.place}>{under}</KeyComposite> : <React.Fragment key={id}>{under}</React.Fragment>;
  };
  /** a section title behind him (his own footage + the title, his key over it) */
  const Sec = (id: string) => {
    const [s] = sp(id), e = s + SEC.T + SEC.HOLD + SEC.OUT, L = lay(id), T = tx(id);
    return <KeyComposite key={id} piece={pc(L.keyed)} s={s} e={e + 1}><TalkAt piece={pc(L.keyed)} s={s} e={e + 1} /><G><RoomTitle s={s} num={T.num} title={T.title} px={L.px} /></G></KeyComposite>;
  };
  const clip = (id: string) => { if (PASS) return null; const [s, e] = sp(id), S = b(id).source!; return <Clip key={id} src={S.clip!} from={S.in ?? 0} s={s} dur={e - s} toneMapped={false} />; };
  const webCard = (id: string) => {
    const [s, e] = sp(id), T = tx(id), L = lay(id), S = b(id).source!, img = web(S.still!, S.pos as string);
    return img ? <WebCard key={id} img={img} s={s} out={e} left={L.right ? W - M - L.w : L.left} top={L.top} w={L.w} eyebrow={T.eyebrow} title={T.title} /> : null;
  };

  const hook = b("hook"), [h0, h1] = sp("hook"), dim = event(tl, "hook", "dim", P);
  const hookTitle = <G><HookRoom s={h0} dim={dim} out={h1} top={lay("hook").top} t={tx("hook")} /></G>;
  const [sec1] = sp("sec01");
  const causes = b("causes"), cz = sp("causes"), czT = tx("causes");
  const bank = sp("bank"), bankT = tx("bank"), bankS = b("bank").source!;
  const cl = sp("clip"), clT = tx("clip"), clS = b("clip").source!;
  const nm = sp("name");
  const map = sp("map"), mapT = tx("map"), fill = event(tl, "map", "fill", P);
  const rowS = mapT.rows.map((r: { at: Anchor }) => R(r.at));
  const ba = sp("ba"), baT = tx("ba"), sweep = event(tl, "ba", "sweep", P);
  const capsInk = (lay("captions").ink as string[]).map((id) => sp(id));

  return (
    <ModeCtx.Provider value={mode}>
      <AbsoluteFill style={{ background: PASS ? undefined : "#000", visibility: PASS === "under" || PASS === "matte" ? "hidden" : "visible" }}>
        {PASS && <style>{PASS_CSS[PASS]}</style>}
        {!PASS && P.pieces.map((x) => (
          <Sequence key={x.id} from={x.at} durationInFrames={x.dur} layout="none">
            <OffthreadVideo src={TALK} toneMapped={false} trimBefore={Math.round(x.from * 24)} muted style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover" }} />
          </Sequence>
        ))}
        {mode === "full" && <Audio src={staticFile(String((tl as any).voice ?? "public/jan08/voice_v4.wav").replace(/^public\//, ""))} />}

        {/* the hook title runs on into the belief piece (his key over it in both) until the 01 title */}
        <KeyComposite piece={pc("hook")} s={0} e={pc("hook").dur}><TalkAt piece={pc("hook")} s={0} e={pc("hook").dur} />{hookTitle}</KeyComposite>
        <KeyComposite piece={pc("belief")} s={pc("belief").at} e={sec1}><TalkAt piece={pc("belief")} s={pc("belief").at} e={sec1} />{hookTitle}</KeyComposite>
        {void hook}
        {Sec("sec01")}
        {Plate("J1", true)}
        {Plate("J1x")}

        <G><CausesV3 s={cz[0]} out={cz[1]} img={web(causes.source!.still!, causes.source!.pos as string)} imgS={event(tl, "causes", "img", P)}
          rows={czT.rows.map((r: { text: string; at: Anchor }) => ({ text: r.text, s: R(r.at) }))} /></G>

        {Sec("sec02")}
        {Plate("J2")}
        <G><RowCard s={bank[0]} out={bank[1]} src={bankS.still!} img pos={bankS.pos as string} caps={bankT.caps} title={bankT.title} credit={bankT.credit} /></G>

        {Sec("sec03")}
        {clip("broll1")}
        {clip("broll2")}
        <G><Sequence from={nm[0]} durationInFrames={nm[1] - nm[0]} layout="none"><NameCard /></Sequence></G>
        <G><RowCard s={cl[0]} out={cl[1]} src={clS.clip!} from={clS.in} caps={clT.caps} title={clT.title} note={clT.note} /></G>
        {Plate("J3")}
        {clip("broll3")}

        {Sec("sec04")}
        {Plate("J4")}
        <G>{webCard("lipcase")}</G>

        {/* his plan, full-bleed on her own photo: the landmark face plan (unchanged from v3), the legend under it */}
        <Room s={map[0]} dur={map[1] - map[0]} />
        <PhotoPanel s={map[0]} out={map[1] - 4} marks={<Ex>
          {(["L", "R"] as const).map((k, i) => <CheekMarks key={k} id={"m" + k} sd={PLAN[k]} s={rowS[0] + 4 * i} fill={fill} />)}
          {(["L", "R"] as const).map((k, i) => <MinorMarks key={"l" + k} z={PLAN[k].laugh} s={rowS[1] + 3 * i} />)}
          {(["L", "R"] as const).map((k, i) => <MinorMarks key={"m" + k} z={PLAN[k].mar} s={rowS[2] + 3 * i} />)}
          {(["L", "R"] as const).map((k, i) => <MinorMarks key={"d" + k} z={PLAN[k].lid} s={rowS[3] + 3 * i} />)}
        </Ex>}>{photo(b("map").source!.still!)}</PhotoPanel>
        <G><Legend s={map[0] + 6} out={map[1] - 4} caption={mapT.caps} keyText={mapT.key}
          rows={mapT.rows.map((r: { text: string; amt: string; big?: boolean }, i: number) => ({ text: r.text, amt: r.amt, big: r.big, s: rowS[i] }))} /></G>

        {Plate("J5")}
        <G>{webCard("overfilled")}</G>

        {/* the result, full-bleed: before -> right after, labelled as an example of his approach */}
        <Room s={ba[0]} dur={ba[1] - ba[0] + 8} />
        <BAPanel s={ba[0]} out={ba[1]} sweep={sweep} t={baT} />

        <G><Room s={end} dur={P.tail} />
          <Sequence from={end} durationInFrames={P.tail} layout="none"><EndCard /></Sequence>
          <Captions words={P.words} end={end} ink={capsInk} /></G>

        {mode === "full" && sfxHits(tl, P).map((h, i) => <Sfx key={"s" + i} at={h.at} name={h.name as any} gain={h.gain} />)}
      </AbsoluteFill>
    </ModeCtx.Provider>
  );
};

const BAPanel: React.FC<{ s: number; out: number; sweep: number; t: Record<string, any> }> = ({ s, out, sweep, t }) => {
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
          <div style={{ ...caps(22, MUTED) }}>{t.caps}</div>
          <div style={{ display: "flex", gap: 26, alignItems: "baseline", marginTop: 14 }}>
            <span style={{ ...disp(56, after ? MUTED : INK, 600) }}>{t.before}</span>
            <span style={{ ...disp(40, MUTED, 500) }}>→</span>
            <span style={{ ...disp(56, after ? INK : MUTED, 600) }}>{t.after}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 18 }}>
            <KeyIcon big /><span style={{ ...disp(30, INK, 500) }}>{t.line}</span>
          </div>
          <div style={{ font: `500 19px/1.3 ${FONT}`, color: MUTED, marginTop: 14 }}>{t.credit}</div>
        </div>
      )}</G>
    </>
  );
};

export { card, Img };
