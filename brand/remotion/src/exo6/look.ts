import { Easing } from "remotion";
import { useElza } from "../Fonts";
import { curve, D24 } from "../library/motion";

// exo6/look.ts: the one look of the ExoMind YouTube v6 graphics (research/ostad/style/exomind/BEATS.md, beats.json).
// Colours: brand/kit/tokens.json (background #f2efed, text #211b15, accent-1 #bf8662) + the Instagram navy/blue pair the YT
// system already uses (#202532 / #37a9e8; brand.ts BLUES). Motion: library/motion.ts tokens (MOTION.md section 2), 24 fps.
//
// Type (research/ostad/style/DECISIONS.md 14j): Cormorant Garamond 500 for display lines (title, section cards, the few headline
// words) + Neue Haas Grotesk Text 500/400 for every label, chip, UI string and long line. Both are in Adobe kit vzz0hgt (checked
// against the kit stylesheet: cormorant-garamond 400/500, neue-haas-grotesk-text 400/500). Naim "is not in love with" the
// all-NHG-Display v4.1 look; Helvetica Neue 65 is not in the kit (DECISIONS 14b) and the kit must not be modified.

export const C = {
  cream: "#f2efed", // kit background
  paper: "#faf8f5", // lifted cream (cards)
  ink: "#211b15", // kit text
  ink2: "#5d544c", // ink at ~70 % on cream, for secondary lines
  mute: "#9a918a",
  rule: "rgba(33,27,21,.14)",
  navy: "#202532",
  blue: "#37a9e8",
  sky: "#9fd6f5",
  ice: "#e3f2fb",
  accent: "#bf8662", // kit accent-1 (warm, used sparingly: ticks, the one warm light)
  glassFill: "rgba(255,255,255,.58)",
};

export const SERIF = '"cormorant-garamond", "Cormorant Garamond", Georgia, serif';
export const SANS = '"neue-haas-grotesk-text", "Inter", Arial, sans-serif';
export const FONT_NEED = ["500 40px cormorant-garamond", "400 40px cormorant-garamond"];

/** hold the render until NHG (kit) + Cormorant are really loaded */
export const useExoFonts = () => useElza(FONT_NEED);

export const display = (px: number, color: string = C.ink): React.CSSProperties => ({
  fontFamily: SERIF, fontWeight: 500, fontSize: px, lineHeight: 1.02, letterSpacing: "-0.012em", color,
});
export const text = (px: number, w = 500, color: string = C.ink): React.CSSProperties => ({
  fontFamily: SANS, fontWeight: w, fontSize: px, lineHeight: 1.25, letterSpacing: "0.003em", color,
});
export const caps = (px: number, color: string = C.ink2): React.CSSProperties => ({
  fontFamily: SANS, fontWeight: 500, fontSize: px, lineHeight: 1, letterSpacing: "0.14em", textTransform: "uppercase", color,
});

// ------------------------------------------------------------------------------------------------ motion helpers (24 fps frames)
export const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const ease = curve;
export const D = D24;
/** eased 0..1 from `s` over `d` frames */
export const p = (frame: number, s: number, d: number, c: (x: number) => number = curve.arrive) =>
  d <= 0 ? (frame >= s ? 1 : 0) : c(cl((frame - s) / d));
/** in with `arrive` (or a given curve) and out with `exit` (7 f): returns [in, out] */
export const life = (frame: number, start: number, exitAt = Infinity, din = D24.arrive, cin = curve.arrive): [number, number] => [
  p(frame, start, din, cin), p(frame, exitAt, D24.exit, curve.exit),
];
/** slow sinus drift, px; period in frames */
export const drift = (frame: number, amp: number, period: number, phase = 0) => amp * Math.sin((2 * Math.PI * frame) / period + phase);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const outBack = Easing.bezier(0.34, 1.4, 0.64, 1); // a 3-4 % overshoot, used only where a reference overshoots (pip pop)

// ------------------------------------------------------------------------------------------------ the glass material, v6
// Layered light, not a flat white box: (1) a backdrop blur + saturate of whatever is behind, (2) a milky fill that is brighter at
// the top-left (the key light), (3) a 1 px inner rim, brighter on the top edge, (4) a soft specular sweep band, (5) two shadows: a
// tight contact shadow and a long, very soft ambient one (doctor.grove card shadow, MOTION.md section 5: radius 24).
export const glass = (r = 24, strength = 1): React.CSSProperties => ({
  borderRadius: r,
  background: `linear-gradient(155deg, rgba(255,255,255,${0.78 * strength}) 0%, rgba(255,255,255,${0.52 * strength}) 46%, rgba(246,243,240,${0.6 * strength}) 100%)`,
  backdropFilter: "blur(22px) saturate(1.25)",
  WebkitBackdropFilter: "blur(22px) saturate(1.25)",
  boxShadow: [
    "inset 0 1px 0 rgba(255,255,255,.95)",
    "inset 0 0 0 1px rgba(255,255,255,.55)",
    "inset 0 -1px 0 rgba(33,27,21,.06)",
    "0 1px 2px rgba(33,27,21,.08)",
    "0 18px 44px -12px rgba(32,37,50,.22)",
    "0 46px 90px -30px rgba(32,37,50,.18)",
  ].join(", "),
});

/** moving specular band across a glass surface; `t` frames since it arrived */
export const sheen = (t: number, period = 120): React.CSSProperties => {
  const u = ((t % period) + period) % period / period;
  return {
    position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none",
    background: `linear-gradient(115deg, transparent ${-30 + u * 160}%, rgba(255,255,255,.38) ${-18 + u * 160}%, transparent ${-6 + u * 160}%)`,
    mixBlendMode: "screen",
  };
};

/** the cream room canvas: a warm key light top-left, a cool fill bottom-right, a soft vignette (no flat colour) */
export const roomBg = (frame = 0): React.CSSProperties => {
  const dx = drift(frame, 2.5, 240), dy = drift(frame, 1.5, 300, 1);
  return {
    position: "absolute", inset: 0,
    background: [
      `radial-gradient(ellipse 70% 80% at ${22 + dx}% ${18 + dy}%, rgba(255,251,246,.95), rgba(255,251,246,0) 70%)`,
      `radial-gradient(ellipse 60% 70% at ${86 - dx}% ${88 - dy}%, rgba(214,226,236,.55), rgba(214,226,236,0) 70%)`,
      `radial-gradient(ellipse 120% 100% at 50% 50%, ${C.cream} 55%, #e6e1dc 100%)`,
    ].join(", "),
  };
};

// ------------------------------------------------------------------------------------------------ compliance
export const MOA_LABEL = "Conceptual depiction. Results may vary.";
export const SKIN_DISCLAIMER = "Exomind does not directly treat skin conditions.";
