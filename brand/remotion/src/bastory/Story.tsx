import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, easeOut } from "../brand";
import { useElza } from "../Fonts";
import { glass } from "../devices/Markup";

// AviClear split-slider Story (P0010), from the v1_split still (research/ostad/style/beforeafter_v2/README.md): one aligned face in a
// glass window, a slider line with a glass handle sweeps from BEFORE to AFTER, scrubs back once, holds on AFTER, then an end card.
// Photos: public/ba-story (brand/scripts/ba_story_p0010.py): both cut to the same rectangle inside the clean area of both panels,
// so no sheet caption, margin, seam or rotated edge shows at any slider position. Crop, scale and align only.
// Marks are white (no blue): thin smooth outlines that trace each lesion area, from brand/scripts/ba_story_outlines.py (the user's
// own markup of 8 regions, 2026-11-19, registered to this frame; inside each region the before's red map gives the lesion blob,
// dilated and smoothed; a large drawn area with no compact blob keeps the smoothed user outline). Groups play in sequence on BEFORE
// (forehead, then nose + both cheeks, then chin): each outline draws on along its path, holds, retracts. On AFTER all replay quickly.
// Safe zones (Instagram Story): all text and key content between y 250 and y 1580.
export type Outline = { pts: [number, number][]; cx: number; cy: number; region: string; group: number; bbox: [number, number, number, number] };
export type BaGeo = { win: [number, number]; outlines: Outline[] };

export const FPS = 30;
// BEFORE: per group, outlines staggered 0.15 s; each draws on 0.5 s (ease-out), holds 0.6 s, retracts 0.4 s (ease-in)
export const MARK = { draw: 0.5, hold: 0.6, out: 0.4, stagger: 0.15, gap: 0.1 };
// AFTER: every outline replays quickly, staggered 0.1 s
export const MARK_A = { draw: 0.35, hold: 0.35, out: 0.3, stagger: 0.1, gap: 0.05 };
// captions per group: measured numbers only where the measurement shows a clean drop (ba_story_regions.py / measure.json):
// forehead 4 -> 0 spots; right cheek red area 2.88 -> 0.00 %. The nose and the chin get the area name only.
export const GROUPS = [
  { name: "Forehead", num: { kind: "spots" as const, before: 4, after: 0, at: "forehead" } },
  { name: "Nose and cheeks", num: { kind: "red" as const, before: 2.9, after: 0.0, at: "right cheek", lead: "right cheek red area" } },
  { name: "Chin", num: null },
];
const groupLen = (n: number, G: typeof MARK) => (n - 1) * G.stagger + G.draw + G.hold + G.out + G.gap;
// beats (s): groups on BEFORE (line at the left edge), sweep left -> right to AFTER, all outlines on AFTER (line at the right edge),
// scrub back right -> left past the marks, pause, return, short hold, end card (line + handle fade, then the panel)
export const timeline = (counts: number[]) => {
  const starts: number[] = [];
  let t = 0.2;
  for (const n of counts) { starts.push(t); t += groupLen(n, MARK); }
  const sweep = [t, t + 2.2], a0 = sweep[1] + 0.1, total = counts.reduce((x, y) => x + y, 0);
  const back = [a0 + groupLen(total, MARK_A), a0 + groupLen(total, MARK_A) + 0.8];
  const ret = [back[1] + 0.15, back[1] + 0.95], end = ret[1] + 0.25;
  return { starts, sweep, a0, back, ret, end, panel: [end + 0.32, end + 0.82], dur: Math.round((end + 2.3) * FPS) / FPS };
};
export const groupCounts = (geo: BaGeo) => GROUPS.map((_, g) => geo.outlines.filter((o) => o.group === g).length);

const IVORY = "#f5f2eb", NAVY = "#152235";
const SERIF = '"cormorant-garamond", "Cormorant Garamond", Georgia, serif';
const TEXT = '"neue-haas-grotesk-text", "neue-haas-grotesk-display", Helvetica, Arial, sans-serif';
// stills.css .glass (the still's frame material): white veil, lit edge from the upper right, contact shadow down-left
const paperGlass = (r: number, veil = 0.3): React.CSSProperties => ({
  position: "absolute", borderRadius: r, isolation: "isolate",
  backdropFilter: "blur(28px) saturate(1.12) brightness(1.04)",
  background: `linear-gradient(222deg,rgba(255,255,255,.26) 0%,rgba(255,255,255,0) 26%),rgba(255,255,255,${veil})`,
  boxShadow: "inset 0 1.5px 0 rgba(255,255,255,.92),inset -1.5px 0 0 rgba(255,255,255,.70),inset 0 0 0 1px rgba(255,255,255,.34)," +
    "inset 0 -1px 0 rgba(0,0,0,.05),inset 1px 0 0 rgba(0,0,0,.04),-10px 16px 30px -14px rgba(25,22,18,.34),-2px 3px 6px -2px rgba(25,22,18,.14)",
});

const inOut = (q: number) => (q < 0.5 ? 4 * q ** 3 : 1 - (-2 * q + 2) ** 3 / 2);
const seg = (t: number, [a, b]: number[]) => inOut(clamp((t - a) / (b - a)));
// slider line x in window px: 0 = all BEFORE, W = all AFTER. The scrub goes back to `back` (just left of the rings, so the before
// spots show again) and returns.
const sliderX = (t: number, W: number, back: number, T: ReturnType<typeof timeline>) => {
  if (t < T.back[0]) return W * seg(t, T.sweep);
  if (t < T.ret[0]) return W - (W - back) * seg(t, T.back);
  return back + (W - back) * seg(t, T.ret);
};

// layouts: story 1080x1920 (text inside y 250-1580, plus an empty 600x160 zone at y 1380-1540 for the Instagram link sticker, the
// real booking button), feed 1080x1350 (4:5, margins only, keeps the BOOK NOW pill). k scales the photo window and ring.
type Layout = { h: number; k: number; Y0: number; head: number; nm: number; rule: string; proc: number; procPx: number; cap: number; credit: number;
  sticker?: { x0: number; y0: number; x1: number; y1: number } };
export const LAYOUTS: Record<"story" | "feed", Layout> = {
  story: { h: 1920, k: 0.85, Y0: 376, head: 254, nm: 48, rule: "14px auto 12px", proc: 1276, procPx: 48, cap: 1338, credit: 1554,
    sticker: { x0: 240, y0: 1380, x1: 840, y1: 1540 } },
  feed: { h: 1350, k: 0.92, Y0: 180, head: 46, nm: 44, rule: "18px auto 16px", proc: 1152, procPx: 48, cap: 1216, credit: 1296 },
};
export type Fmt = keyof typeof LAYOUTS;

type Box = { x0: number; y0: number; x1: number; y1: number; o: number; name: string };

export const BaStory: React.FC<{ geo: BaGeo; fmt?: Fmt }> = ({ geo, fmt = "story" }) => {
  useElza(["500 40px cormorant-garamond", "400 40px cormorant-garamond"]);
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  const t = frame / fps;
  const L = LAYOUTS[fmt], k = L.k;
  const W = geo.win[0] * k, H = geo.win[1] * k, X0 = (1080 - W) / 2, Y0 = L.Y0, PAD = 12;
  const T = timeline(groupCounts(geo));
  // outlines in frame px: window px at k = 1, scaled
  const OS = geo.outlines.map((o) => ({ ...o, pts: o.pts.map(([a, b]) => [X0 + a * k, Y0 + b * k]), box: { x0: X0 + o.bbox[0] * k, y0: Y0 + o.bbox[1] * k, x1: X0 + o.bbox[2] * k, y1: Y0 + o.bbox[3] * k } }));
  const x = sliderX(t, W, Math.max(0, Math.min(...geo.outlines.map((o) => o.bbox[0])) * k - 24 * k), T);
  const endFade = 1 - clamp((t - T.end) / 0.3);                     // line and handle leave before the end card comes in
  // each outline instance: drawn on along its path from the top, clockwise (ease-out), held, retracted the same way round (ease-in)
  let ai = 0;
  const inst = OS.flatMap((o) => {
    const gi = OS.filter((q) => q.group === o.group).indexOf(o);
    const sB = T.starts[o.group] + gi * MARK.stagger, sA = T.a0 + ai++ * MARK_A.stagger;
    return ([[sB, MARK, o.group], [sA, MARK_A, 1]] as const).map(([s0, G, cap]) => {
      const q = easeOut(clamp((t - s0) / G.draw)), out = clamp((t - s0 - G.draw - G.hold) / G.out) ** 3;
      return { o, s0, cap, vis: q - out, out };
    });
  });
  const panelQ = easeOut(clamp((t - T.panel[0]) / (T.panel[1] - T.panel[0]))); // starts once the marks and line are gone
  // the caption follows the group showing on BEFORE; from the sweep on it reads the cheek line. A number counts as the line crosses
  // the outline it was measured on.
  const g = t < T.sweep[0] ? Math.max(0, T.starts.filter((s0) => t >= s0).length - 1) : 1;
  const G = GROUPS[g];
  let capText = G.name;
  if (G.num) {
    const ref = OS.filter((o) => o.region === G.num.at), rx0 = Math.min(...ref.map((o) => o.box.x0)), rx1 = Math.max(...ref.map((o) => o.box.x1));
    const f = clamp((rx1 - (X0 + x)) / Math.max(1, rx1 - rx0));
    const v = G.num.after + (G.num.before - G.num.after) * f;
    capText = G.num.kind === "spots" ? `${G.name} · ${G.num.before} spots → ${Math.round(v)}`
      : `${G.name} · ${G.num.lead} ${G.num.before.toFixed(1)} % → ${v.toFixed(1)} %`;
  }
  // pills fade with the side that is showing, so neither ever sits under the line: AFTER on the left, BEFORE on the right
  const PW = 150, PH = 44, PM = 24;
  const aOp = clamp((x - (PM + PW + 16)) / 60), bOp = clamp((W - (PM + PW + 16) - x) / 60);
  const pillY = Y0 + H - PM - PH;
  const HY = Y0 + H * 0.3, HS = 56; // handle (above the ring, which starts at ~0.38 H)

  // audit: no visible text box may cross the slider line or the ring while they are visible (throws -> the render fails)
  const story = !!L.sticker;
  const panel = { x0: X0 + 50 * k, y0: Y0 + (story ? 600 : 560) * k - 30 * (1 - panelQ), w: W - 100 * k, h: (story ? 290 : 330) * k };
  const boxes: Box[] = [
    { x0: X0 + PM, y0: pillY, x1: X0 + PM + PW, y1: pillY + PH, o: aOp, name: "AFTER pill" },
    { x0: X0 + W - PM - PW, y0: pillY, x1: X0 + W - PM, y1: pillY + PH, o: bOp, name: "BEFORE pill" },
    { x0: panel.x0, y0: panel.y0, x1: panel.x0 + panel.w, y1: panel.y0 + panel.h, o: panelQ, name: "end card" },
  ];
  for (const b of boxes) {
    if (b.o <= 0.01) continue;
    if (endFade > 0.01 && X0 + x > b.x0 && X0 + x < b.x1) throw new Error(`TEXTAUDIT ${b.name} crosses the slider line at frame ${frame}`);
  }
  // marks: never under the slider line, a pill, the end card, the handle or the sticker zone while any part of them shows
  const handle = { x0: X0 + x - 28, x1: X0 + x + 28, y0: Y0 + H * 0.3 - 28, y1: Y0 + H * 0.3 + 28 };
  for (const m of inst) {
    if (m.vis <= 0.001) continue;
    const r = { id: m.o.region }, e = { x0: m.o.box.x0 - 3, x1: m.o.box.x1 + 3, y0: m.o.box.y0 - 3, y1: m.o.box.y1 + 3 };
    if (endFade > 0.01 && X0 + x > e.x0 && X0 + x < e.x1) throw new Error(`RINGAUDIT ${r.id} crosses the slider line at frame ${frame}`);
    // inside the photo window (so clear of the header), and in the Story below the top safe zone (y 250)
    if (e.x0 < X0 || e.x1 > X0 + W || e.y0 < Y0 || e.y1 > Y0 + H) throw new Error(`RINGAUDIT ${r.id} leaves the photo window at frame ${frame}`);
    if (L.sticker && e.y0 < 250) throw new Error(`RINGAUDIT ${r.id} enters the Story top safe zone at frame ${frame}`);
    const hits = [...boxes.filter((b) => b.o > 0.01), ...(endFade > 0.01 ? [{ ...handle, name: "handle" }] : []), ...(L.sticker ? [{ ...L.sticker, name: "sticker zone" }] : [])];
    for (const b of hits) if (b.x0 < e.x1 && b.x1 > e.x0 && b.y0 < e.y1 && b.y1 > e.y0) throw new Error(`RINGAUDIT ${r.id} crosses ${b.name} at frame ${frame}`);
  }
  // the link-sticker zone (story) stays empty: the window, every text line and the end card must sit outside it
  if (L.sticker) {
    const z = L.sticker, rows = [{ y0: Y0 - PAD, y1: Y0 + H + PAD, name: "window" }, { y0: L.proc, y1: L.proc + L.procPx, name: "AVICLEAR" },
      { y0: L.cap, y1: L.cap + 24, name: "caption" }, { y0: L.credit, y1: L.credit + 23, name: "credit" }, { y0: panel.y0, y1: panel.y0 + panel.h, name: "end card" }];
    for (const r of rows) if (r.y0 < z.y1 && r.y1 > z.y0) throw new Error(`STICKERZONE ${r.name} enters the sticker zone at frame ${frame}`);
  }

  const pill = (text: string, left: number, o: number) => (
    <div style={{ ...glass(999), left, top: pillY, width: PW, height: PH, opacity: o, color: "#fff", display: "flex", alignItems: "center",
      justifyContent: "center", font: `500 19px/1 ${TEXT}`, letterSpacing: "0.2em", paddingLeft: "0.2em", textTransform: "uppercase",
      textShadow: "0 1px 3px rgba(0,0,0,.25)", zIndex: 7 }}>{text}</div>
  );
  return (
    <AbsoluteFill style={{ background: IVORY, color: NAVY }}>
      {/* header (y 258-345) */}
      <div style={{ position: "absolute", left: 0, right: 0, top: L.head, textAlign: "center" }}>
        <div style={{ font: `500 ${L.nm}px/1 ${SERIF}`, letterSpacing: "0.06em", textTransform: "uppercase" }}>Dr. Ariel Ostad</div>
        <div style={{ width: 84, height: 1, background: NAVY, opacity: 0.35, margin: L.rule }} />
        <div style={{ font: `500 19px/1 ${TEXT}`, letterSpacing: "0.28em", paddingLeft: "0.28em", textTransform: "uppercase", opacity: 0.75 }}>Total skin health</div>
      </div>
      {/* glass frame under the photo window: the glass shows only as the rim */}
      <div style={{ ...paperGlass(42), left: X0 - PAD, top: Y0 - PAD, width: W + 2 * PAD, height: H + 2 * PAD }} />
      <div style={{ position: "absolute", left: X0, top: Y0, width: W, height: H, borderRadius: 30, overflow: "hidden", background: "#cfc9be" }}>
        <Img src={staticFile("ba-story/p0010_before.png")} style={{ position: "absolute", inset: 0, width: W, height: H }} />
        <Img src={staticFile("ba-story/p0010_after.png")} style={{ position: "absolute", inset: 0, width: W, height: H, clipPath: `inset(0 ${W - x}px 0 0)` }} />
      </div>
      {/* marks: white hairlines with a soft down-left shadow */}
      <svg width={1080} height={L.h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs><filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="-1" dy="1.5" stdDeviation="1.6" floodColor="#1d1a16" floodOpacity=".26" /></filter></defs>
        <g filter="url(#sh)" stroke="#fff" fill="none" strokeLinecap="round">
          {/* each outline: a closed path from its top, clockwise, drawn on and retracted with the dash */}
          {inst.filter((m) => m.vis > 0.001).map(({ o, vis, out, s0 }) => (
            <path key={`${o.region}${o.cx}${s0}`} d={`M ${o.pts.map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`).join(" L ")} Z`}
              strokeWidth={2.2} strokeLinejoin="round" pathLength={1000} strokeDasharray={`${vis * 1000} 2000`} strokeDashoffset={-out * 1000} />
          ))}
          <line x1={X0 + x} y1={Y0} x2={X0 + x} y2={Y0 + H} strokeWidth={2} opacity={endFade} />
        </g>
      </svg>
      <div style={{ ...glass(999), left: X0 + x - HS / 2, top: HY - HS / 2, width: HS, height: HS, opacity: endFade, zIndex: 7 }}>
        <svg width={HS} height={HS} style={{ position: "absolute", inset: 0 }}>
          <path d="M23 20 L15 28 L23 36 M33 20 L41 28 L33 36" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {pill("After", X0 + PM, aOp)}
      {pill("Before", X0 + W - PM - PW, bOp)}
      {/* end card: glass panel over the lower face, after the ring and line have gone */}
      {panelQ > 0 && (
        <div style={{ ...paperGlass(34, 0.62), left: panel.x0, top: panel.y0, width: panel.w, height: panel.h, opacity: panelQ, zIndex: 8,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ font: `500 ${Math.round(66 * k)}px/1.08 ${SERIF}`, textAlign: "center", letterSpacing: "0.005em" }}>Book your AviClear<br />treatment today</div>
          {story ? (
            // the Instagram link sticker below the card is the button; a quiet hint only
            <div style={{ marginTop: 26 * k, font: `500 18px/1 ${TEXT}`, letterSpacing: "0.2em", paddingLeft: "0.2em", textTransform: "uppercase", opacity: 0.72 }}>Tap the link below</div>
          ) : (
            <div style={{ ...glass(999), position: "relative", marginTop: 30 * k, padding: "15px 34px 14px", color: "#fff", font: `500 20px/1 ${TEXT}`,
              letterSpacing: "0.22em", paddingRight: "calc(34px - 0.22em)", textTransform: "uppercase", background: "rgba(21,34,53,.82)" }}>Book now</div>
          )}
        </div>
      )}
      {/* procedure + measured line (y 1436-1530) and credit (y 1552-1575) */}
      <div style={{ position: "absolute", left: 0, right: 0, top: L.proc, textAlign: "center", font: `500 ${L.procPx}px/1 ${SERIF}`, letterSpacing: "0.32em", paddingLeft: "0.32em", textTransform: "uppercase" }}>AviClear</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: L.cap, textAlign: "center", font: `500 20px/1.2 ${TEXT}`, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.72, fontVariantNumeric: "tabular-nums" }}>
        {capText}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: L.credit, textAlign: "center", font: `400 19px/1.2 ${TEXT}`, letterSpacing: "0.02em", opacity: 0.6 }}>
        Patient of Dr. Ostad. Individual results vary.
      </div>
    </AbsoluteFill>
  );
};
