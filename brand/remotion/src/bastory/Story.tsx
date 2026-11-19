import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, easeOut } from "../brand";
import { useElza } from "../Fonts";
import { glass } from "../devices/Markup";

// AviClear split-slider Story (P0010), from the v1_split still (research/ostad/style/beforeafter_v2/README.md): one aligned face in a
// glass window, a slider line with a glass handle sweeps from BEFORE to AFTER, scrubs back once, holds on AFTER, then an end card.
// Photos: public/ba-story (brand/scripts/ba_story_p0010.py): both cut to the same rectangle inside the clean area of both panels,
// so no sheet caption, margin, seam or rotated edge shows at any slider position. Crop, scale and align only.
// Marks are white (no blue). The ring is the measured right-cheek ellipse, locked to the cheek. Patient code only.
// Safe zones (Instagram Story): all text and key content between y 250 and y 1580.
export type BaGeo = {
  win: [number, number];
  ring: { cx: number; cy: number; rx: number; ry: number; rot: number };
  red_before: number; red_after: number;
};

export const FPS = 30;
export const DUR_S = 11.5;
// beats (s): hold BEFORE, sweep to AFTER, hold, scrub back past the ring, pause, return, hold, end card
export const BEATS = { sweep: [1.0, 3.5], hold1: [3.5, 4.5], back: [4.5, 5.7], pause: [5.7, 6.1], ret: [6.1, 7.3], hold2: [7.3, 9.0], end: [9.0, DUR_S] };
const SCRUB_TO = 0.62; // fraction of the window width the scrub returns to (past the ring, so the before cheek shows again)

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
// slider line x in window px: W = all BEFORE, 0 = all AFTER
const sliderX = (t: number, W: number) => {
  if (t < BEATS.back[0]) return W * (1 - seg(t, BEATS.sweep));
  if (t < BEATS.ret[0]) return W * SCRUB_TO * seg(t, BEATS.back);
  return W * SCRUB_TO * (1 - seg(t, BEATS.ret));
};

// layouts: story 1080x1920 (text inside y 250-1580), feed 1080x1350 (4:5, margins only). k scales the photo window and ring.
export const LAYOUTS = {
  story: { h: 1920, k: 1, Y0: 384, head: 258, nm: 50, proc: 1436, procPx: 52, cap: 1508, credit: 1554 },
  feed: { h: 1350, k: 0.92, Y0: 180, head: 46, nm: 44, proc: 1152, procPx: 48, cap: 1216, credit: 1296 },
};
export type Fmt = keyof typeof LAYOUTS;

type Box = { x0: number; y0: number; x1: number; y1: number; o: number; name: string };

export const BaStory: React.FC<{ geo: BaGeo; fmt?: Fmt }> = ({ geo, fmt = "story" }) => {
  useElza(["500 40px cormorant-garamond", "400 40px cormorant-garamond"]);
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  const t = frame / fps;
  const L = LAYOUTS[fmt], k = L.k;
  const W = geo.win[0] * k, H = geo.win[1] * k, X0 = (1080 - W) / 2, Y0 = L.Y0, PAD = 12;
  const x = sliderX(t, W);
  const endFade = 1 - clamp((t - BEATS.end[0]) / 0.3);          // ring, line and handle leave before the end card comes in
  const panelQ = easeOut(clamp((t - BEATS.end[0] - 0.32) / 0.5)); // starts once the ring and line are gone
  const R = { cx: geo.ring.cx * k, cy: geo.ring.cy * k, rx: geo.ring.rx * k, ry: geo.ring.ry * k, rot: geo.ring.rot }, th = (R.rot * Math.PI) / 180;
  const hw = Math.sqrt((R.rx * Math.cos(th)) ** 2 + (R.ry * Math.sin(th)) ** 2); // half-width of the rotated ellipse
  const hh = Math.sqrt((R.rx * Math.sin(th)) ** 2 + (R.ry * Math.cos(th)) ** 2);
  // the number counts down as the line passes the ring (right edge of the ring -> left edge)
  const v = geo.red_after + (geo.red_before - geo.red_after) * clamp((x - (R.cx - hw)) / (2 * hw));
  // pills fade with the side that is showing, so neither ever sits under the line
  const PW = 150, PH = 44, PM = 24;
  const bOp = clamp((x - (PM + PW + 16)) / 60), aOp = clamp((W - (PM + PW + 16) - x) / 60);
  const pillY = Y0 + H - PM - PH;
  const HY = Y0 + H * 0.3, HS = 56; // handle (above the ring, which starts at ~0.38 H)

  // audit: no visible text box may cross the slider line or the ring while they are visible (throws -> the render fails)
  const panel = { x0: X0 + 50 * k, y0: Y0 + 560 * k - 30 * (1 - panelQ), w: W - 100 * k, h: 330 * k };
  const boxes: Box[] = [
    { x0: X0 + PM, y0: pillY, x1: X0 + PM + PW, y1: pillY + PH, o: bOp, name: "BEFORE pill" },
    { x0: X0 + W - PM - PW, y0: pillY, x1: X0 + W - PM, y1: pillY + PH, o: aOp, name: "AFTER pill" },
    { x0: panel.x0, y0: panel.y0, x1: panel.x0 + panel.w, y1: panel.y0 + panel.h, o: panelQ, name: "end card" },
  ];
  for (const b of boxes) {
    if (b.o <= 0.01 || endFade <= 0.01) continue;
    if (X0 + x > b.x0 && X0 + x < b.x1) throw new Error(`TEXTAUDIT ${b.name} crosses the slider line at frame ${frame}`);
    const rx0 = X0 + R.cx - hw, rx1 = X0 + R.cx + hw, ry0 = Y0 + R.cy - hh, ry1 = Y0 + R.cy + hh;
    if (b.x0 < rx1 && b.x1 > rx0 && b.y0 < ry1 && b.y1 > ry0) throw new Error(`TEXTAUDIT ${b.name} crosses the ring at frame ${frame}`);
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
        <div style={{ width: 84, height: 1, background: NAVY, opacity: 0.35, margin: "18px auto 16px" }} />
        <div style={{ font: `500 19px/1 ${TEXT}`, letterSpacing: "0.28em", paddingLeft: "0.28em", textTransform: "uppercase", opacity: 0.75 }}>Total skin health</div>
      </div>
      {/* glass frame under the photo window: the glass shows only as the rim */}
      <div style={{ ...paperGlass(42), left: X0 - PAD, top: Y0 - PAD, width: W + 2 * PAD, height: H + 2 * PAD }} />
      <div style={{ position: "absolute", left: X0, top: Y0, width: W, height: H, borderRadius: 30, overflow: "hidden", background: "#cfc9be" }}>
        <Img src={staticFile("ba-story/p0010_before.png")} style={{ position: "absolute", inset: 0, width: W, height: H }} />
        <Img src={staticFile("ba-story/p0010_after.png")} style={{ position: "absolute", inset: 0, width: W, height: H, clipPath: `inset(0 0 0 ${x}px)` }} />
      </div>
      {/* marks: white hairlines with a soft down-left shadow */}
      <svg width={1080} height={L.h} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: endFade }}>
        <defs><filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="-1" dy="1.5" stdDeviation="1.6" floodColor="#1d1a16" floodOpacity=".38" /></filter></defs>
        <g filter="url(#sh)" stroke="#fff" fill="none" strokeLinecap="round">
          <ellipse cx={X0 + R.cx} cy={Y0 + R.cy} rx={R.rx} ry={R.ry} transform={`rotate(${R.rot} ${X0 + R.cx} ${Y0 + R.cy})`} strokeWidth={2.5} />
          <line x1={X0 + x} y1={Y0} x2={X0 + x} y2={Y0 + H} strokeWidth={2} />
        </g>
      </svg>
      <div style={{ ...glass(999), left: X0 + x - HS / 2, top: HY - HS / 2, width: HS, height: HS, opacity: endFade, zIndex: 7 }}>
        <svg width={HS} height={HS} style={{ position: "absolute", inset: 0 }}>
          <path d="M23 20 L15 28 L23 36 M33 20 L41 28 L33 36" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {pill("Before", X0 + PM, bOp)}
      {pill("After", X0 + W - PM - PW, aOp)}
      {/* end card: glass panel over the lower face, after the ring and line have gone */}
      {panelQ > 0 && (
        <div style={{ ...paperGlass(34, 0.62), left: panel.x0, top: panel.y0, width: panel.w, height: panel.h, opacity: panelQ, zIndex: 8,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ font: `500 ${Math.round(66 * k)}px/1.08 ${SERIF}`, textAlign: "center", letterSpacing: "0.005em" }}>Book your AviClear<br />treatment today</div>
          <div style={{ ...glass(999), position: "relative", marginTop: 30 * k, padding: "15px 34px 14px", color: "#fff", font: `500 20px/1 ${TEXT}`,
            letterSpacing: "0.22em", paddingRight: "calc(34px - 0.22em)", textTransform: "uppercase", background: "rgba(21,34,53,.82)" }}>Book now</div>
        </div>
      )}
      {/* procedure + measured line (y 1436-1530) and credit (y 1552-1575) */}
      <div style={{ position: "absolute", left: 0, right: 0, top: L.proc, textAlign: "center", font: `500 ${L.procPx}px/1 ${SERIF}`, letterSpacing: "0.32em", paddingLeft: "0.32em", textTransform: "uppercase" }}>AviClear</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: L.cap, textAlign: "center", font: `500 20px/1.2 ${TEXT}`, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.72, fontVariantNumeric: "tabular-nums" }}>
        Right cheek · red area {geo.red_before.toFixed(1)} % → {v.toFixed(1)} %
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: L.credit, textAlign: "center", font: `400 19px/1.2 ${TEXT}`, letterSpacing: "0.02em", opacity: 0.6 }}>
        Patient of Dr. Ostad. Individual results vary.
      </div>
    </AbsoluteFill>
  );
};
