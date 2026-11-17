// Oct 14 injection reel: the reusable devices. NOT FOR POSTING until patient consent = yes.
// Each device is a DEVICE_LIBRARY.md id (named in its comment), built for a spoken line. Frames are composition frames at 24 fps;
// `s` is the onset frame of the trigger word and every reveal starts at s + 1 (MOTION §3, DECISIONS 14d rule 9).
// No dot-and-line anywhere (DEVICE_LIBRARY §A, tools/lint_compositions.py): every pointer is a devices/Arrow.tsx arrow with a head
// that lands on its last draw frame; rings and badges carry no leader.
import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Arrow } from "../devices/Arrow";
import { card } from "../components/Ro";
import { BLUE, CAP_T, D, FONT, H, HL, INK, M, MUTED, ON_FOOTAGE, SAFE_T, W, WHITE, at, breathe, caps, disp, lerp, life, p, vis, type Box, type Pt, type PtSrc } from "./look";

const isStill = (src: string) => /\.(jpe?g|png|webp)$/i.test(src);
const media = (src: string) => (/^(https?:|data:|\/)/.test(src) ? src : staticFile(src));

/** a still or a clip, absolutely placed; clips are muted (his voice runs on the main track) */
export const Media: React.FC<{ src: string; style: React.CSSProperties; trimBefore?: number; rate?: number; muted?: boolean }> = ({ src, style, trimBefore = 0, rate = 1, muted = true }) =>
  isStill(src) ? <Img src={media(src)} style={{ position: "absolute", maxWidth: "none", ...style }} />
    : <OffthreadVideo src={media(src)} trimBefore={trimBefore} playbackRate={rate} muted={muted} style={{ position: "absolute", maxWidth: "none", ...style }} />;

/** typed label (DDOS B09 typed callout): about 1 character per frame from s + 1; space reserved so nothing reflows */
export const Typed: React.FC<{ text: string; s: number; out?: number; style?: React.CSSProperties; align?: "left" | "center" | "right" }> = ({ text, s, out = Infinity, style, align = "left" }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const n = Math.max(0, Math.min(text.length, frame - s));
  const e = p(frame, out, D.exit, "exit");
  return (
    <div style={{ position: "relative", whiteSpace: "nowrap", textAlign: align, opacity: 1 - e, transform: `translateY(${7 * e}px)`, ...style }}>
      <span style={{ visibility: "hidden" }}>{text}</span>
      <span style={{ position: "absolute", left: 0, right: 0, top: 0, textAlign: align }}>{text.slice(0, n)}</span>
    </div>
  );
};

/** numbered badge (the numbered index of ETSQ f642-708 / G4 T2 numbered boxes): a navy disc, scale pop 0.95 -> 1 in 5 f, no overshoot */
export const Badge: React.FC<{ n: number; s: number; out?: number; x: number; y: number; d?: number; tone?: "navy" | "glass" }> = ({ n, s, out = Infinity, x, y, d = 52, tone = "navy" }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const q = p(frame, s + 1, 5, "arrive"), e = p(frame, out, D.exit, "exit");
  return (
    <div style={{ position: "absolute", left: x - d / 2, top: y - d / 2, width: d, height: d, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
      background: tone === "navy" ? INK : "rgba(255,255,255,.88)", color: tone === "navy" ? WHITE : INK, boxShadow: "0 0 0 2px rgba(255,255,255,.95), 0 6px 16px rgba(8,12,22,.3)",
      font: `600 ${Math.round(d * 0.5)}px/1 ${FONT}`, fontVariantNumeric: "tabular-nums", opacity: Math.min(1, q * 1.4) * (1 - e), transform: `scale(${(0.95 + 0.05 * q) * (1 - 0.1 * e)})` }}>{n}</div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------
// InjectionPip: the injection clip pops up at the exact facial point he names, while he keeps talking.
// Devices: `zoom-box-inset` (G4 T5 Ik5Zt8oGko4 f1245-1399: the inset scales out of its pin, on the place name) +
// `windowed-footage` (DDOS f2007-2214: footage in a rounded window, radius 2 % of its width) + `arrow-curved-callout` (GMu3
// f395-401, 7 f, head lands last) + `tracking-ring` on the point (G4 T20 tQkjtXJEtxY f851-1091) + a numbered `Badge` (ETSQ T7:
// footage windows anchored on a map with numbered badges, one per "first / next" shot).
// Timeline (frames from r0 = s + 1):
//   r0       the ring draws round the point (`sweep` 10 f) and the window grows OUT OF THE POINT to its box (`arrive` 14 f)
//   r0 + 4   the label types (1 char / f) under the window; r0 + 6 the badge pops
//   r0 + 10  the curved callout draws from the window edge to the ring (7 f; head lands r0 + 17)
//   held     the clip plays; the window drifts <= 3 px; the arrow breathes <= 1.5 px
//   out      the window collapses back INTO the point on `exit` (7 f), the arrow's tail erases, and the point keeps a
//            numbered marker (PointMarker) until `park` so the face builds an index of what was treated (build in place, MOTION §1.3)
// Placement: the window takes the side of the frame away from the point (never covers it), vertically centred on the point and
// clamped between the top safe line and the caption band (MOTION §5.3).
// ---------------------------------------------------------------------------------------------------------------------------
export type PipSpec = {
  n: number; label: string; s: number; out: number; park?: number; anchor: PtSrc;
  clip: string; clipFrom?: number; rate?: number; srcW?: number; srcH?: number; focus?: { fx: number; fy: number; z: number }; box?: Box; eyebrow?: string;
};
export const PIP = { w: 380, ring: 28, labelH: 120, gap: 26 };

export const pipBox = (a: Pt, w = PIP.w, aspect = 16 / 9): Box => {
  const h = Math.round(w * aspect);
  const x = a.x < W / 2 ? W - M - w : M;
  const y = Math.max(SAFE_T + 20, Math.min(CAP_T - 40 - PIP.labelH - h, a.y - h / 2));
  return { x, y, w, h };
};

export const InjectionPip: React.FC<PipSpec> = ({ n, label, s, out, park = out, anchor, clip, clipFrom = 0, rate = 1, srcW = 1080, srcH = 1920, focus = { fx: 0.5, fy: 0.5, z: 1 }, box, eyebrow }) => {
  const frame = useCurrentFrame();
  if (frame <= s) return null;
  const r0 = s + 1;
  const A = at(anchor, frame);
  const B = box ?? pipBox(at(anchor, r0), PIP.w, srcH / srcW);
  const grow = p(frame, r0, D.arrive, "arrive"), shut = p(frame, out, D.exit, "exit");
  const k = grow * (1 - shut);
  const showWin = frame < out + D.exit;
  // the window rect grows out of a small rect centred on the point and goes back into it
  const s0 = { w: 54, h: 54 * (B.h / B.w) };
  const dx = breathe(frame, 3, 140), dy = breathe(frame, 2, 170, 1);
  const R = { x: lerp(A.x - s0.w / 2, B.x + dx, k), y: lerp(A.y - s0.h / 2, B.y + dy, k), w: lerp(s0.w, B.w, k), h: lerp(s0.h, B.h, k) };
  // the clip, covering the window around its focus point
  const sc = (R.w * focus.z) / srcW, cw = srcW * sc, ch = srcH * sc;
  const left = Math.min(0, Math.max(R.w - cw, R.w / 2 - focus.fx * cw)), top = Math.min(0, Math.max(R.h - ch, R.h / 2 - focus.fy * ch));
  // arrow: from the window edge facing the point to just outside the ring
  const towardPip = B.x > A.x ? 1 : -1;
  const from = (f: number): Pt => { const a = at(anchor, f); return { x: towardPip > 0 ? B.x + dx - 14 : B.x + B.w + dx + 14, y: Math.max(B.y + 60, Math.min(B.y + B.h - 60, a.y - 40)) }; };
  const to = (f: number): Pt => { const a = at(anchor, f), fr = from(f), ux = fr.x - a.x, uy = fr.y - a.y, l = Math.hypot(ux, uy) || 1; return { x: a.x + (ux / l) * (PIP.ring + 12), y: a.y + (uy / l) * (PIP.ring + 12) }; };
  const ring = p(frame, r0, 10, "sweep") * (1 - p(frame, park, D.exit, "exit"));
  return (
    <AbsoluteFill>
      {/* the ring on the exact point (the PointMarker takes over after the window closes) */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", filter: "drop-shadow(0 1px 3px rgba(8,12,22,.45))" }}>
        <circle cx={A.x} cy={A.y} r={PIP.ring} fill="none" stroke={WHITE} strokeWidth={3.5} pathLength={1} strokeDasharray={`${ring} 1`} transform={`rotate(-90 ${A.x} ${A.y})`} />
      </svg>
      {showWin && (
        <div style={{ position: "absolute", left: R.x, top: R.y, width: R.w, height: R.h, borderRadius: Math.max(8, 0.02 * R.w * 2), overflow: "hidden", opacity: Math.min(1, grow * 2.2) * (1 - shut * 0.6),
          background: "#11151d", boxShadow: "0 0 0 3px rgba(255,255,255,.95), 0 24px 60px -18px rgba(8,12,22,.6), 0 4px 12px rgba(8,12,22,.25)" }}>
          <Sequence from={r0} layout="none">
            <Media src={clip} trimBefore={Math.round(clipFrom * 24)} rate={rate} style={{ left, top, width: cw, height: ch }} />
          </Sequence>
        </div>
      )}
      {showWin && <Badge n={n} s={s + 6} out={out} x={R.x + 40 * (R.w / B.w)} y={R.y + 40 * (R.w / B.w)} />}
      <Arrow variant="curved-callout" from={from} to={to} start={r0 + 10} end={out + D.exit} color={WHITE} weight={6} bend={towardPip * 0.22} />
      <div style={{ position: "absolute", left: B.x, width: B.w, top: B.y + B.h + PIP.gap, textShadow: ON_FOOTAGE }}>
        {eyebrow && <div style={{ ...caps(24, "rgba(255,255,255,.92)"), marginBottom: 8, ...life(frame, r0 + 4, out, 8) }}>{eyebrow}</div>}
        <Typed text={label} s={r0 + 4} out={out} style={{ ...disp(44, WHITE) }} />
      </div>
      {frame >= out && <PointMarker n={n} s={out} out={park} anchor={anchor} away={towardPip} />}
    </AbsoluteFill>
  );
};

/** the treated point keeps a ring and its number after the window closes (no leader: the badge sits beside the ring) */
export const PointMarker: React.FC<{ n: number; s: number; out: number; anchor: PtSrc; away?: number }> = ({ n, s, out, anchor, away = 1 }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s, out)) return null;
  const A = at(anchor, frame);
  const e = p(frame, out, D.exit, "exit");
  return (
    <AbsoluteFill style={{ opacity: 1 - e }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", filter: "drop-shadow(0 1px 3px rgba(8,12,22,.45))" }}>
        <circle cx={A.x} cy={A.y} r={PIP.ring - 6} fill="none" stroke={WHITE} strokeWidth={3} />
      </svg>
      <Badge n={n} s={s - 1} out={out} x={A.x + away * (PIP.ring + 20)} y={A.y - PIP.ring - 8} d={38} tone="glass" />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------------------
// BeforeAfter: two labelled cards side by side, never a slider (G1 R27 yA0gele-Nmo f494-583, `split-labelled` / L23; DECISIONS 14d
// rule 1), entering plate-then-picture (MOTION §3 `plate` 18 + 18 f, M04 M1-M2). Then, for each region where a change is VISIBLE
// (chosen by brand/scripts/oct14_pairs.py and logged in research/ostad/style/oct14/ARROWS.md, never invented):
//   s - 25   both cards push toward the region together (`stepped-punch-in`, DDOS f1016-1026, smooth on `sweep` 26 f; a long build
//            starts early and lands on the word, s + 1: MOTION §3), so the same place is the same size on both sides
//   s + 1    the region is outlined on BOTH cards (same mark = same place, G4 T18 Ik5 f1018-1399) on `sweep` 14 f, and the rest of
//            both pictures dims to 0.45 (MOTION §3 "dim the rest", G4 T6), so the highlight never recolours her skin
//   s + 11   on the "after" card a straight pointer rises from the label to the outline (`arrow-straight-pointer`, WZ f926-933, 7 f,
//            head lands s + 18); the label types under the card (1 char / f)
//   next     when the camera leaves for the next region, this one's marks exit 7 f. At `pullS` both cards pull back to the full face and every
//            outline returns with its number (the summary), listed under the cards (`type-line-accumulate`, DDOS f2595-2821).
// Coordinates: regions are in the ALIGNED image (0..1 of iw x ih); before and after share one geometry (oct14_pairs.py aligns the
// after to the before with a similarity transform on the face landmarks), so one ellipse fits both.
// ---------------------------------------------------------------------------------------------------------------------------
export type Region = { id: string; label: string; c: Pt; r: Pt; s: number; zoom?: number };
export type BAProps = {
  s: number; out: number; before: string; after: string; iw: number; ih: number; crop: { x: number; y: number; w: number };
  regions: Region[]; pullS?: number; labels?: [string, string]; subs?: [string, string]; note?: string; y?: number; cardH?: number;
  marks?: boolean; // false = the camera only (measuring pass for the push timing)
};
export const BA = { gap: 24, y: 430, h: 700 };

type View = { x: number; y: number; w: number; h: number };
const viewAt = (cx: number, cy: number, z: number, base: View): View => {
  const w = base.w / z, h = base.h / z;
  return { x: Math.max(0, Math.min(1 - w, cx - w / 2)), y: Math.max(0, Math.min(1 - h, cy - h / 2)), w, h };
};

export const BeforeAfter: React.FC<BAProps> = ({ s, out, before, after, iw, ih, crop, regions, pullS, labels = ["Before", "Right after"], subs, note, y = BA.y, cardH = BA.h, marks = true }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s + 1, out)) return null;
  const cw = (W - 2 * M - BA.gap) / 2;
  const base: View = { x: crop.x, y: crop.y, w: crop.w, h: crop.w * (iw / ih) * (cardH / cw) };
  const full = { cx: base.x + base.w / 2, cy: base.y + base.h / 2, z: 1 };
  // the camera: a chain of targets, each reached on `sweep` 26 f that LANDS on its word + 1 (a long build starts early and lands on
  // the word: MOTION §3, G3 §5 R2), so the outline then draws on a still picture
  const stops = [{ f: -1e9, ...full }, ...regions.map((r) => ({ f: r.s + 1 - D.bar, cx: r.c.x, cy: r.c.y, z: r.zoom ?? 1.7 })), ...(pullS != null ? [{ f: pullS + 1 - D.bar, ...full }] : [])];
  // each move starts from wherever the previous move had got to when this one began (a move cut short is picked up, not jumped)
  let from = { ...full };
  let cam = { ...full };
  for (let i = 1; i < stops.length; i++) {
    if (frame < stops[i].f) break;
    const q = p(frame, stops[i].f, D.bar, "sweep");
    cam = { cx: lerp(from.cx, stops[i].cx, q), cy: lerp(from.cy, stops[i].cy, q), z: lerp(from.z, stops[i].z, q) };
    const nf = stops[i + 1]?.f;
    if (nf != null && frame >= nf) {
      const qn = p(nf, stops[i].f, D.bar, "sweep");
      from = { cx: lerp(from.cx, stops[i].cx, qn), cy: lerp(from.cy, stops[i].cy, qn), z: lerp(from.z, stops[i].z, qn) };
    }
  }
  const drift = 1 + 0.025 * Math.min(1, Math.max(0, (frame - s) / Math.max(1, out - s))); // never a static picture (lint --static-image)
  const V = viewAt(cam.cx, cam.cy, cam.z * drift, base);
  const k = cw / (V.w * iw); // card px per image px
  const toCard = (q: Pt): Pt => ({ x: (q.x - V.x) * iw * k, y: (q.y - V.y) * ih * k });
  const e = p(frame, out, D.exit, "exit");
  // each region's marks live from its word until the camera leaves for the next region (or the pull-back), then exit 7 f, so the
  // camera never drags an old outline or pointer across the picture
  const endS = (j: number) => { const nx = regions[j + 1]?.s ?? pullS; return nx != null ? nx + 1 - D.bar : out; };
  const live = (j: number) => marks && frame > regions[j].s && frame < endS(j) + D.exit;
  const fade = (j: number) => 1 - p(frame, endS(j), D.exit, "exit");
  const summary = marks && pullS != null && frame > pullS;
  const xs = [M, M + cw + BA.gap];

  const cardEl = (i: 0 | 1) => {
    const start = s + 1 + i * 2; // index stagger 2 f (MOTION `arrive` cascade)
    const plate = p(frame, start, D.plate, "plate"), pic = p(frame, start + D.plate, D.plate, "plate");
    const ell = regions.map((r, j) => {
      const on = Math.max(summary ? p(frame, pullS! + 1 + j * 3, D.rowWipe, "sweep") : 0, live(j) ? p(frame, r.s + 1, D.rowWipe, "sweep") * fade(j) : 0);
      const c = toCard(r.c);
      return { j, on, c, rx: r.r.x * iw * k, ry: r.r.y * ih * k };
    });
    const dim = Math.max(0, ...regions.map((r, j) => (live(j) ? 0.45 * p(frame, r.s + 1, 12, "sweep") * fade(j) : 0)));
    const maskId = `ba-hole-${i}`;
    return (
      <div key={i} style={{ ...card(24), left: xs[i], top: y, width: cw, height: cardH, opacity: plate }}>
        <div style={{ position: "absolute", inset: 0, opacity: pic }}>
          <Media src={i === 0 ? before : after} style={{ left: -V.x * iw * k, top: -V.y * ih * k, width: iw * k, height: ih * k }} />
        </div>
        <svg width={cw} height={cardH} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <defs>
            <mask id={maskId}>
              <rect width={cw} height={cardH} fill="white" />
              {ell.filter((q) => live(q.j)).map((q) => <ellipse key={q.j} cx={q.c.x} cy={q.c.y} rx={q.rx} ry={q.ry} fill="black" />)}
            </mask>
          </defs>
          <rect width={cw} height={cardH} fill="rgb(10,14,24)" opacity={dim} mask={`url(#${maskId})`} />
          {ell.map((q) => q.on > 0 && (
            <ellipse key={q.j} cx={q.c.x} cy={q.c.y} rx={q.rx + breathe(frame, 1)} ry={q.ry + breathe(frame, 1, 72, 1)} fill="none" stroke={WHITE} strokeWidth={3.5}
              pathLength={1} strokeDasharray={`${q.on} 1`} style={{ filter: "drop-shadow(0 1px 3px rgba(8,12,22,.5))" }} />
          ))}
        </svg>
        {summary && ell.map((q) => <Badge key={q.j} n={q.j + 1} s={pullS! + 4 + q.j * 3} out={out} x={q.c.x + q.rx * 0.75 + 16} y={q.c.y - q.ry * 0.75 - 16} d={34} tone="glass" />)}
      </div>
    );
  };

  // each region's label and its pointer (after card only): the pointer rises from the label to just under the outline
  const ax = xs[1] + cw / 2, ly = y + cardH + 36;
  const tip = (r: Region) => (): Pt => { const c = toCard(r.c); return { x: xs[1] + c.x, y: y + c.y + r.r.y * ih * k + 12 }; };
  return (
    <AbsoluteFill style={{ opacity: 1 - e }}>
      {[0, 1].map((i) => (
        <div key={i} style={{ position: "absolute", left: xs[i], top: y - 92, width: cw, textShadow: ON_FOOTAGE, ...life(frame, s + 1 + D.plate + i * 2) }}>
          <div style={{ ...disp(48, WHITE) }}>{labels[i]}</div>
          {subs && <div style={{ ...caps(22, "rgba(255,255,255,.9)"), marginTop: 6 }}>{subs[i]}</div>}
        </div>
      ))}
      {cardEl(0)}
      {cardEl(1)}
      {marks && regions.map((r, j) => <Arrow key={r.id} variant="straight-pointer" from={{ x: ax, y: ly - 4 }} to={tip(r)} start={r.s + 11} end={endS(j) + D.exit} color={WHITE} weight={6} />)}
      {marks && regions.map((r, j) => (
        <div key={r.id} style={{ position: "absolute", left: xs[1] - 200, width: cw + 200, top: ly, textAlign: "center", textShadow: ON_FOOTAGE }}>
          <Typed text={r.label} s={r.s + 1} out={endS(j)} align="center" style={{ ...disp(44, WHITE) }} />
        </div>
      ))}
      {summary && (
        <div style={{ position: "absolute", left: M, right: M, top: y + cardH + 34 }}>
          {regions.map((r, j) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 18, height: 60, ...life(frame, pullS! + 4 + j * 3, out, 8) }}>
              <span style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,.9)", color: INK, display: "inline-flex", alignItems: "center", justifyContent: "center", font: `600 19px/1 ${FONT}` }}>{j + 1}</span>
              <span style={{ ...disp(38, WHITE, 500), textShadow: ON_FOOTAGE }}>{r.label}</span>
            </div>
          ))}
        </div>
      )}
      {note && <Note text={note} s={s + 1 + 2 * D.plate} out={out} />}
    </AbsoluteFill>
  );
};

/** a small note (compliance line): muted caps above the caption band */
export const Note: React.FC<{ text: string; s: number; out: number; y?: number }> = ({ text, s, out, y = 1520 }) => {
  const frame = useCurrentFrame();
  if (!vis(frame, s, out)) return null;
  return <div style={{ position: "absolute", left: M, right: M, top: y, textAlign: "center", ...caps(22, "rgba(255,255,255,.9)"), textShadow: "0 1px 6px rgba(0,0,0,.55)", ...life(frame, s, out, 6) }}>{text}</div>;
};

// ---------------------------------------------------------------------------------------------------------------------------
// Word captions (DECISIONS 14d rule 8, `type-caption-word`): each word cuts on at its onset frame; no fade, rise, box or stroke;
// the line holds its place invisibly so nothing reflows. Lines break at a pause >= 8 f or at 3 words / 20 characters. White NHG
// 600, top at 83 % H, the reel "clean" shadow. A second voice (the patient) is italic (DDOS R14, G4 A7).
// ---------------------------------------------------------------------------------------------------------------------------
export type Word = { w: string; f: number; f1: number; voice?: "him" | "her" };
const lines = (words: Word[]) => {
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    const prev = cur[cur.length - 1];
    const len = cur.reduce((a, x) => a + x.w.length + 1, 0) + w.w.length;
    if (prev && (w.f - prev.f1 >= 8 || cur.length >= 3 || len > 20 || w.voice !== prev.voice)) { out.push(cur); cur = []; }
    cur.push(w);
  }
  if (cur.length) out.push(cur);
  return out;
};
export const WordCaptions: React.FC<{ words: Word[]; hide?: [number, number][] }> = ({ words, hide = [] }) => {
  const frame = useCurrentFrame();
  const ls = React.useMemo(() => lines(words), [words]);
  if (hide.some(([a, b]) => frame >= a && frame < b)) return null;
  const i = ls.findIndex((l, j) => frame >= l[0].f && frame < Math.min(ls[j + 1]?.[0].f ?? Infinity, l[l.length - 1].f1 + 10));
  if (i < 0) return null;
  return (
    <div style={{ position: "absolute", left: M, right: M, top: CAP_T, textAlign: "center", font: `600 62.6px/1.2 ${FONT}`, letterSpacing: "0.01em", color: WHITE,
      fontStyle: ls[i][0].voice === "her" ? "italic" : "normal", textShadow: "0 2px 10px rgba(0,0,0,.38), 0 0 2px rgba(0,0,0,.25)", whiteSpace: "nowrap" }}>
      {ls[i].map((w, j) => <span key={j} style={{ visibility: frame >= w.f ? "visible" : "hidden" }}>{(j ? " " : "") + w.w.replace(/[",]/g, "")}</span>)}
    </div>
  );
};

/** consent flag, top-right, on every frame of every render until consent = yes (clinic rule) */
export const ConsentFlag: React.FC = () => (
  <div style={{ position: "absolute", right: 24, top: 24, padding: "8px 14px", background: "rgba(29,34,48,.78)", color: WHITE, ...caps(20, WHITE), letterSpacing: "0.06em" }}>
    Not for posting · consent pending
  </div>
);
export { BLUE, HL, MUTED, SAFE_T };
