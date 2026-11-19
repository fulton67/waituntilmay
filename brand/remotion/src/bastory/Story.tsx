import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, easeOut } from "../brand";
import { useElza } from "../Fonts";
import { glass } from "../devices/Markup";

// AviClear split-slider Story (P0010), from the v1_split still (research/ostad/style/beforeafter_v2/README.md): one aligned face in a
// glass window, a slider line with a glass handle sweeps from BEFORE to AFTER, scrubs back once, holds on AFTER, then an end card.
// Photos: public/ba-story (brand/scripts/ba_story_p0010.py): both cut to the same rectangle inside the clean area of both panels,
// so no sheet caption, margin, seam or rotated edge shows at any slider position. Crop, scale and align only.
// Marks are white (no blue). Rings come from brand/scripts/ba_story_regions.py: one per measured acne region that clears the v2
// noise floor, below the lower eyelids, sized tight to what went away. They play in sequence, one at a time (user note: "one circle
// shouldn't be up for that long"): each draws on, holds, retracts; first on BEFORE, then the same spots briefly on AFTER.
// Safe zones (Instagram Story): all text and key content between y 250 and y 1580.
export type Ring = { id: string; label: string; cx: number; cy: number; rx: number; ry: number;
  spots_before: number; spots_after: number; red_before: number; red_after: number };
export type BaGeo = { win: [number, number]; rings: Ring[] };

export const FPS = 30;
// one ring: draw on (clockwise from the top, ease-out), hold, retract the same way round (ease-in), short gap
export const RING = { draw: 0.6, hold: 0.7, out: 0.5, gap: 0.05 };
// on AFTER the same rings come back briefly, just to show the spots are clear
export const RING_A = { draw: 0.45, hold: 0.45, out: 0.4, gap: 0.05 };
const len = (r: typeof RING) => r.draw + r.hold + r.out + r.gap;
const RING_LEN = len(RING), RING_A_LEN = len(RING_A);
// beats (s) for n rings: rings on BEFORE (line at the left edge), sweep left -> right to AFTER, the same rings on AFTER (line at the
// right edge), scrub back right -> left past the rings, pause, return, short hold, end card (line + handle fade, then the panel).
export const timeline = (n: number) => {
  const b0 = 0.2, sweep = [b0 + n * RING_LEN, b0 + n * RING_LEN + 2.5];
  const a0 = sweep[1] + 0.1, back = [a0 + n * RING_A_LEN, a0 + n * RING_A_LEN + 0.9];
  const ret = [back[1] + 0.2, back[1] + 1.1], end = ret[1] + 0.25;
  return { b0, sweep, a0, back, ret, end, panel: [end + 0.32, end + 0.82], dur: Math.round((end + 2.4) * FPS) / FPS };
};

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
  const T = timeline(geo.rings.length);
  const RS = geo.rings.map((r) => ({ ...r, cx: r.cx * k, cy: r.cy * k, rx: r.rx * k, ry: r.ry * k }));
  const x = sliderX(t, W, Math.max(0, Math.min(...RS.map((r) => r.cx - r.rx)) - 24 * k), T);
  const endFade = 1 - clamp((t - T.end) / 0.3);                     // line and handle leave before the end card comes in
  // each ring instance: drawn on from the top, clockwise (ease-out), held, retracted the same way round (ease-in)
  const inst = RS.flatMap((r, i) => ([[T.b0, RING], [T.a0, RING_A]] as const).map(([p0, G]) => {
    const s0 = p0 + i * len(G), q = easeOut(clamp((t - s0) / G.draw)), out = clamp((t - s0 - G.draw - G.hold) / G.out) ** 3;
    return { r, i, s0, vis: q - out, out };
  }));
  const panelQ = easeOut(clamp((t - T.panel[0]) / (T.panel[1] - T.panel[0]))); // starts once the rings and line are gone
  // the caption follows the ring showing now (or the last one shown); its number counts down as the line crosses that ring
  const cur = [...inst].filter((m) => t >= m.s0).sort((a, b) => b.s0 - a.s0)[0]?.r ?? RS[0];
  const f = clamp((cur.cx + cur.rx - x) / (2 * cur.rx));
  const spotsMode = cur.spots_before > 0;
  const capText = spotsMode
    ? `${cur.label} · ${cur.spots_before} spots → ${Math.round(cur.spots_after + (cur.spots_before - cur.spots_after) * f)}`
    : `${cur.label} · red area ${cur.red_before.toFixed(1)} % → ${(cur.red_after + (cur.red_before - cur.red_after) * f).toFixed(1)} %`;
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
  // rings: never under the slider line, a pill, the end card, the handle or the sticker zone while any part of them shows
  const handle = { x0: X0 + x - 28, x1: X0 + x + 28, y0: Y0 + H * 0.3 - 28, y1: Y0 + H * 0.3 + 28 };
  for (const m of inst) {
    if (m.vis <= 0.001) continue;
    const r = m.r, e = { x0: X0 + r.cx - r.rx - 3, x1: X0 + r.cx + r.rx + 3, y0: Y0 + r.cy - r.ry - 3, y1: Y0 + r.cy + r.ry + 3 };
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
        <defs><filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="-1" dy="1.5" stdDeviation="1.6" floodColor="#1d1a16" floodOpacity=".38" /></filter></defs>
        <g filter="url(#sh)" stroke="#fff" fill="none" strokeLinecap="round">
          {/* the ellipse as a path from its top, clockwise (two sweep-1 arcs), so the dash draws on from the top */}
          {inst.filter((m) => m.vis > 0.001).map(({ r, vis, out, s0 }) => (
            <path key={`${r.id}${s0}`} d={`M ${X0 + r.cx} ${Y0 + r.cy - r.ry} A ${r.rx} ${r.ry} 0 1 1 ${X0 + r.cx} ${Y0 + r.cy + r.ry} A ${r.rx} ${r.ry} 0 1 1 ${X0 + r.cx} ${Y0 + r.cy - r.ry}`}
              strokeWidth={2.5} pathLength={1000} strokeDasharray={`${vis * 1000} 2000`} strokeDashoffset={-out * 1000} />
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
