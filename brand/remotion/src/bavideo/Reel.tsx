import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { clamp } from "../brand";
import { useElza } from "../Fonts";
import { glass } from "../devices/Markup";

// Before/after VIDEO reel, P0005 lip filler (catalog slug filler-lips; no product named). Header, paper glass frame, glass pills,
// slider line + handle and credit are copied from src/bastory/Story.tsx (the AviClear slider), not imported, so that delivered
// composition stays untouched. Structure follows the measured reference (research/ostad/style/measure/ig_DfYLRoNxt_1/NOTES.md):
// full-window sequential shots with a small label, here BEFORE (2 bars) -> AFTER (2 bars) -> the direct comparison (slider).
// Cuts sit on a 120 BPM grid (the Instagram track could not be fetched): beat = 15 frames at 30 fps, bar = 2 s.
// Footage: aligned crops from brand/scripts/ba_video_p0005.py (crop/scale/rotate/translate only, plain decode, no grade).
export const FPS = 30;
const BEAT = 15;
export const CUT = { after: 8 * BEAT, compare: 16 * BEAT, sweep: [17 * BEAT, 21 * BEAT], back: [22 * BEAT, 24 * BEAT], end: 27 * BEAT };
export const DUR = CUT.end; // 13.5 s = 27 beats

const IVORY = "#f5f2eb", NAVY = "#152235";
const SERIF = '"cormorant-garamond", "Cormorant Garamond", Georgia, serif';
const TEXT = '"neue-haas-grotesk-text", "neue-haas-grotesk-display", Helvetica, Arial, sans-serif';
const paperGlass = (r: number, veil = 0.3): React.CSSProperties => ({
  position: "absolute", borderRadius: r, isolation: "isolate",
  backdropFilter: "blur(28px) saturate(1.12) brightness(1.04)",
  background: `linear-gradient(222deg,rgba(255,255,255,.26) 0%,rgba(255,255,255,0) 26%),rgba(255,255,255,${veil})`,
  boxShadow: "inset 0 1.5px 0 rgba(255,255,255,.92),inset -1.5px 0 0 rgba(255,255,255,.70),inset 0 0 0 1px rgba(255,255,255,.34)," +
    "inset 0 -1px 0 rgba(0,0,0,.05),inset 1px 0 0 rgba(0,0,0,.04),-10px 16px 30px -14px rgba(25,22,18,.34),-2px 3px 6px -2px rgba(25,22,18,.14)",
});
const inOut = (q: number) => (q < 0.5 ? 4 * q ** 3 : 1 - (-2 * q + 2) ** 3 / 2);
const seg = (f: number, [a, b]: number[]) => inOut(clamp((f - a) / (b - a)));

// Story: all text inside y 250-1580 (Instagram Story safe zone). Feed 4:5: margins only. Window = 1000x1250 source * k.
type Layout = { h: number; k: number; Y0: number; head: number; nm: number; rule: string; proc: number; cap: number; credit: number };
const LAYOUTS: Record<"story" | "feed", Layout> = {
  story: { h: 1920, k: 0.84, Y0: 392, head: 258, nm: 48, rule: "14px auto 12px", proc: 1468, cap: 1528, credit: 1556 },
  feed: { h: 1350, k: 0.8, Y0: 168, head: 40, nm: 42, rule: "14px auto 12px", proc: 1190, cap: 1248, credit: 1286 },
};
export type Fmt = keyof typeof LAYOUTS;

export const BaVideo: React.FC<{ fmt?: Fmt }> = ({ fmt = "story" }) => {
  useElza(["500 40px cormorant-garamond", "400 40px cormorant-garamond"]);
  const f = useCurrentFrame();
  const L = LAYOUTS[fmt], k = L.k;
  const W = 1000 * k, H = 1250 * k, X0 = (1080 - W) / 2, Y0 = L.Y0, PAD = 12;
  const inCmp = f >= CUT.compare;
  // slider (compare only): x = 0 all BEFORE, W all AFTER (AFTER shows left of the line, as in bastory); it settles on a half split
  const x = !inCmp ? 0 : f < CUT.back[0] ? W * seg(f, CUT.sweep) : W - (W / 2) * seg(f, CUT.back);
  const lineOp = inCmp ? clamp((f - CUT.compare) / 8) : 0;
  const PW = 150, PH = 44, PM = 24, pillY = Y0 + H - PM - PH, HY = Y0 + H * 0.2, HS = 56;
  // pills: each solo shot carries its own label; in the comparison each fades with its side so it never sits under the line
  const aOp = f < CUT.after ? 0 : f < CUT.compare ? 1 : clamp((x - (PM + PW + 16)) / 60);
  const bOp = f < CUT.after ? 1 : f < CUT.compare ? 0 : clamp((W - (PM + PW + 16) - x) / 60);
  // audit: a visible pill may never cross the slider line (throws -> the render fails)
  if (inCmp && lineOp > 0.01) {
    if (aOp > 0.01 && x > PM && x < PM + PW) throw new Error(`TEXTAUDIT AFTER pill crosses the line at ${f}`);
    if (bOp > 0.01 && x > W - PM - PW && x < W - PM) throw new Error(`TEXTAUDIT BEFORE pill crosses the line at ${f}`);
  }
  const vid: React.CSSProperties = { position: "absolute", inset: 0, width: W, height: H };
  const pill = (text: string, left: number, o: number) => (
    <div style={{ ...glass(999), left, top: pillY, width: PW, height: PH, opacity: o, color: "#fff", display: "flex", alignItems: "center",
      justifyContent: "center", font: `500 19px/1 ${TEXT}`, letterSpacing: "0.2em", paddingLeft: "0.2em", textTransform: "uppercase",
      textShadow: "0 1px 3px rgba(0,0,0,.25)", zIndex: 7 }}>{text}</div>
  );
  return (
    <AbsoluteFill style={{ background: IVORY, color: NAVY }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: L.head, textAlign: "center" }}>
        <div style={{ font: `500 ${L.nm}px/1 ${SERIF}`, letterSpacing: "0.06em", textTransform: "uppercase" }}>Dr. Ariel Ostad</div>
        <div style={{ width: 84, height: 1, background: NAVY, opacity: 0.35, margin: L.rule }} />
        <div style={{ font: `500 19px/1 ${TEXT}`, letterSpacing: "0.28em", paddingLeft: "0.28em", textTransform: "uppercase", opacity: 0.75 }}>Total skin health</div>
      </div>
      <div style={{ ...paperGlass(42), left: X0 - PAD, top: Y0 - PAD, width: W + 2 * PAD, height: H + 2 * PAD }} />
      <div style={{ position: "absolute", left: X0, top: Y0, width: W, height: H, borderRadius: 30, overflow: "hidden", background: "#2a2a2c" }}>
        <Sequence from={0} durationInFrames={CUT.after} layout="none">
          <OffthreadVideo src={staticFile("before_solo.mp4")} toneMapped={false} muted style={vid} />
        </Sequence>
        <Sequence from={CUT.after} durationInFrames={CUT.compare - CUT.after} layout="none">
          <OffthreadVideo src={staticFile("after_solo.mp4")} toneMapped={false} muted style={vid} />
        </Sequence>
        <Sequence from={CUT.compare} durationInFrames={CUT.end - CUT.compare} layout="none">
          <OffthreadVideo src={staticFile("compare_before.mp4")} toneMapped={false} muted style={vid} />
          <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${W - x}px 0 0)` }}>
            <OffthreadVideo src={staticFile("compare_after.mp4")} toneMapped={false} muted style={vid} />
          </div>
        </Sequence>
      </div>
      {inCmp && (
        <>
          <svg width={1080} height={L.h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <defs><filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="-1" dy="1.5" stdDeviation="1.6" floodColor="#1d1a16" floodOpacity=".38" /></filter></defs>
            <line x1={X0 + x} y1={Y0} x2={X0 + x} y2={Y0 + H} stroke="#fff" strokeWidth={2} opacity={lineOp} filter="url(#sh)" />
          </svg>
          <div style={{ ...glass(999), left: X0 + x - HS / 2, top: HY - HS / 2, width: HS, height: HS, opacity: lineOp, zIndex: 7 }}>
            <svg width={HS} height={HS} style={{ position: "absolute", inset: 0 }}>
              <path d="M23 20 L15 28 L23 36 M33 20 L41 28 L33 36" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </>
      )}
      {pill("After", X0 + PM, aOp)}
      {pill("Before", inCmp ? X0 + W - PM - PW : X0 + PM, bOp)}
      <div style={{ position: "absolute", left: 0, right: 0, top: L.proc, textAlign: "center", font: `500 46px/1 ${SERIF}`, letterSpacing: "0.32em", paddingLeft: "0.32em", textTransform: "uppercase" }}>Lip filler</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: L.cap, textAlign: "center", font: `500 17px/1.2 ${TEXT}`, letterSpacing: "0.2em", paddingLeft: "0.2em", textTransform: "uppercase", opacity: 0.68 }}>
        Same visit · minutes after treatment
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: L.credit, textAlign: "center", font: `400 19px/1.2 ${TEXT}`, letterSpacing: "0.02em", opacity: 0.6 }}>
        Patient of Dr. Ostad. Individual results vary.
      </div>
    </AbsoluteFill>
  );
};
